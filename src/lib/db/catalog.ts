import "server-only";

import type { AppLocale } from "@/i18n/routing";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveSupportsNameCustomization } from "@/lib/catalog/nameCustomization";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TableRow } from "@/lib/supabase/types";
import type {
  CatalogCategory,
  CatalogProduct,
  CatalogProductOptionGroup,
} from "@/types/catalog";

type PublicProductFilters = {
  categorySlug?: string;
  excludeIds?: string[];
  featuredOnly?: boolean;
  limit?: number;
  orderBy?: "latest" | "sort_order";
};

type HomepageCatalog = {
  categories: CatalogCategory[];
  featuredProducts: CatalogProduct[];
  latestProducts: CatalogProduct[];
};

type PublicCatalogSchemaCapabilities = {
  categoriesDeletedAt: boolean;
  optionGroupsDeletedAt: boolean;
  optionsDeletedAt: boolean;
  productsDeletedAt: boolean;
  productsOptionGroupId: boolean;
};

type SchemaColumnRow = {
  column_name: string;
  table_name: string;
};

type SchemaColumnQueryResult = Promise<{
  data: SchemaColumnRow[] | null;
  error: { message: string } | null;
}>;

type SchemaColumnQueryAfterEq = {
  in: (column: string, values: string[]) => {
    in: (column: string, values: string[]) => SchemaColumnQueryResult;
  };
};

let publicCatalogSchemaCapabilitiesPromise:
  | Promise<PublicCatalogSchemaCapabilities>
  | null = null;

function logDbReadError(scope: string, message: string) {
  console.error(`[catalog] ${scope}: ${message}`);
}

function normalizeText(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeImageUrl(value: string | null | undefined) {
  return normalizeText(value);
}

function getLocalizedValue<
  Prefix extends
    | "description"
    | "help_text"
    | "label"
    | "name"
    | "placeholder",
  Row extends Record<`${Prefix}_${AppLocale}`, string | null>,
>(row: Row, prefix: Prefix, locale: AppLocale) {
  const candidates = [
    row[`${prefix}_${locale}`],
    row[`${prefix}_de`],
    row[`${prefix}_en`],
    row[`${prefix}_fr`],
    row[`${prefix}_tr`],
    row[`${prefix}_ar`],
  ];

  return candidates.find((value) => normalizeText(value).length > 0)?.trim() ?? "";
}

function getCategoryAccent(name: string, slug: string) {
  const normalizedName = normalizeText(name);
  const firstNameToken = normalizedName.split(/[\s/-]+/u).find(Boolean);

  if (firstNameToken) {
    return firstNameToken;
  }

  const firstSlugToken = slug.split("-").find(Boolean);

  if (!firstSlugToken) {
    return "Collection";
  }

  return firstSlugToken.charAt(0).toUpperCase() + firstSlugToken.slice(1);
}

function getCatalogImage(product: TableRow<"products">, gallery: string[]) {
  return gallery[0] ?? normalizeImageUrl(product.cover_image_url);
}

function getProductOptionGroupId(product: TableRow<"products">) {
  return ((product as TableRow<"products"> & { option_group_id?: string | null })
    .option_group_id ?? null);
}

function getProductGallery(product: TableRow<"products">, gallery: string[]) {
  const normalizedGallery = gallery
    .map((image) => normalizeImageUrl(image))
    .filter(Boolean);
  const coverImage = normalizeImageUrl(product.cover_image_url);

  if (coverImage && !normalizedGallery.includes(coverImage)) {
    normalizedGallery.push(coverImage);
  }

  return normalizedGallery;
}

async function getPublicCatalogSchemaCapabilities() {
  if (!publicCatalogSchemaCapabilitiesPromise) {
    const supabase = createSupabaseAdminClient() as unknown as {
      schema: (schema: string) => {
        from: (table: string) => {
          select: (columns: string) => {
            eq: (column: string, value: string) => SchemaColumnQueryAfterEq;
          };
        };
      };
    };

    publicCatalogSchemaCapabilitiesPromise = (async () => {
      const { data, error } = await supabase
        .schema("information_schema")
        .from("columns")
        .select("table_name,column_name")
        .eq("table_schema", "public")
        .in("table_name", ["categories", "option_groups", "options", "products"])
        .in("column_name", ["deleted_at", "option_group_id"]);

        if (error || !data) {
          return {
            categoriesDeletedAt: false,
            optionGroupsDeletedAt: false,
            optionsDeletedAt: false,
            productsDeletedAt: false,
            productsOptionGroupId: false,
          } satisfies PublicCatalogSchemaCapabilities;
        }

        const hasColumn = (tableName: string, columnName: string) =>
          data.some(
            (column: SchemaColumnRow) =>
              column.table_name === tableName &&
              column.column_name === columnName
          );

        return {
          categoriesDeletedAt: hasColumn("categories", "deleted_at"),
          optionGroupsDeletedAt: hasColumn("option_groups", "deleted_at"),
          optionsDeletedAt: hasColumn("options", "deleted_at"),
          productsDeletedAt: hasColumn("products", "deleted_at"),
          productsOptionGroupId: hasColumn("products", "option_group_id"),
        } satisfies PublicCatalogSchemaCapabilities;
      })();
  }

  return publicCatalogSchemaCapabilitiesPromise as Promise<PublicCatalogSchemaCapabilities>;
}

async function fetchActiveCategories(
  locale: AppLocale,
  slug?: string
): Promise<CatalogCategory[]> {
  const supabase = await createSupabaseServerClient();
  const capabilities = await getPublicCatalogSchemaCapabilities();
  let query = supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (capabilities.categoriesDeletedAt) {
    query = query.is("deleted_at", null);
  }

  if (slug) {
    query = query.eq("slug", slug);
  }

  const { data, error } = await query;

  if (error) {
    logDbReadError("categories", error.message);
    return [];
  }

  return data.map((category) => {
    const name = getLocalizedValue(category, "name", locale);

    return {
      accent: getCategoryAccent(name, category.slug),
      id: category.id,
      imageUrl: normalizeImageUrl(category.image_url),
      name,
      shortDescription:
        getLocalizedValue(category, "description", locale) || name,
      slug: category.slug,
    } satisfies CatalogCategory;
  });
}

async function loadPublicOptionGroups(
  locale: AppLocale,
  groupIds: string[]
): Promise<Map<string, CatalogProductOptionGroup>> {
  if (groupIds.length === 0) {
    return new Map();
  }

  const supabase = await createSupabaseServerClient();
  const capabilities = await getPublicCatalogSchemaCapabilities();
  let groupQuery = supabase
    .from("option_groups")
    .select("*")
    .in("id", groupIds)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (capabilities.optionGroupsDeletedAt) {
    groupQuery = groupQuery.is("deleted_at", null);
  }

  let optionQuery = supabase
    .from("options")
    .select("*")
    .in("group_id", groupIds)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (capabilities.optionsDeletedAt) {
    optionQuery = optionQuery.is("deleted_at", null);
  }

  const [{ data: groups, error: groupsError }, { data: options, error: optionsError }] =
    await Promise.all([groupQuery, optionQuery]);

  if (groupsError) {
    logDbReadError("option groups", groupsError.message);
    return new Map();
  }

  if (optionsError) {
    logDbReadError("option fields", optionsError.message);
    return new Map();
  }

  const optionsByGroupId = new Map<string, CatalogProductOptionGroup["options"]>();

  (options ?? []).forEach((option) => {
    const current = optionsByGroupId.get(option.group_id) ?? [];
    current.push({
      helpText: getLocalizedValue(
        option as TableRow<"options"> &
          Record<`help_text_${AppLocale}`, string | null>,
        "help_text",
        locale
      ),
      id: option.id,
      isRequired: option.is_required,
      key: option.key,
      label: getLocalizedValue(option, "label", locale),
      placeholder: getLocalizedValue(
        option as TableRow<"options"> &
          Record<`placeholder_${AppLocale}`, string | null>,
        "placeholder",
        locale
      ),
      type: option.type,
      values: Array.isArray(option.values_json)
        ? option.values_json
            .filter(
              (
                value
              ): value is { label: string; value: string } =>
                typeof value === "object" &&
                value !== null &&
                "label" in value &&
                "value" in value &&
                typeof value.label === "string" &&
                typeof value.value === "string"
            )
            .map((value) => ({
              label: value.label,
              value: value.value,
            }))
        : [],
    });
    optionsByGroupId.set(option.group_id, current);
  });

  return new Map(
    (groups ?? []).map((group) => [
      group.id,
      {
        id: group.id,
        key: group.key,
        name: getLocalizedValue(group, "name", locale),
        options: optionsByGroupId.get(group.id) ?? [],
      } satisfies CatalogProductOptionGroup,
    ])
  );
}

async function hydratePublicProducts(
  locale: AppLocale,
  products: TableRow<"products">[]
): Promise<CatalogProduct[]> {
  if (products.length === 0) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const capabilities = await getPublicCatalogSchemaCapabilities();
  const categoryIds = [
    ...new Set(products.map((product) => product.category_id).filter(Boolean)),
  ] as string[];
  const optionGroupIds = capabilities.productsOptionGroupId
    ? [
        ...new Set(
          products
            .map((product) => getProductOptionGroupId(product))
            .filter(Boolean)
        ),
      ] as string[]
    : [];
  let categoryQuery = categoryIds.length > 0
    ? supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .in("id", categoryIds)
    : null;

  if (categoryQuery && capabilities.categoriesDeletedAt) {
    categoryQuery = categoryQuery.is("deleted_at", null);
  }

  const [categoryResult, imageMap, optionGroupMap] = await Promise.all([
    categoryQuery
      ? categoryQuery
      : Promise.resolve({ data: [], error: null }),
    getProductImages(products.map((product) => product.id)),
    loadPublicOptionGroups(locale, optionGroupIds),
  ]);

  if (categoryResult.error) {
    logDbReadError("product categories", categoryResult.error.message);
    return [];
  }

  const categoryById = new Map(
    categoryResult.data.map((category) => [category.id, category])
  );

  return products.flatMap((product) => {
    if (product.category_id && !categoryById.has(product.category_id)) {
      return [];
    }

    const category = product.category_id
      ? categoryById.get(product.category_id) ?? null
      : null;
    const gallery = getProductGallery(product, imageMap[product.id] ?? []);
    const categoryName = category
      ? getLocalizedValue(category, "name", locale)
      : "";
    const optionGroup = capabilities.productsOptionGroupId
      ? optionGroupMap.get(getProductOptionGroupId(product) ?? "") ?? null
      : null;

    return [{
      categoryId: product.category_id,
      categoryName,
      categorySlug: category?.slug ?? "all",
      createdAt: product.created_at,
      gallery,
      id: product.id,
      imageUrl: getCatalogImage(product, gallery),
      isFeatured: product.is_featured,
      name: getLocalizedValue(product, "name", locale),
      optionGroup,
      shortDescription:
        getLocalizedValue(product, "description", locale) ||
        getLocalizedValue(product, "name", locale),
      sku: product.sku,
      slug: product.slug,
      supportsNameCustomization: resolveSupportsNameCustomization(
        category?.supports_name_customization ?? false,
        product.supports_name_customization ?? null
      ),
      tags: product.tags ?? [],
    } satisfies CatalogProduct];
  });
}

export async function getProductImages(productIds: string[]) {
  if (productIds.length === 0) {
    return {} as Record<string, string[]>;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("product_images")
    .select("product_id, image_url, sort_order")
    .in("product_id", productIds)
    .order("sort_order", { ascending: true });

  if (error) {
    logDbReadError("product images", error.message);
    return {} as Record<string, string[]>;
  }

  return data.reduce<Record<string, string[]>>((imageMap, image) => {
    const normalizedImage = normalizeImageUrl(image.image_url);

    if (!normalizedImage) {
      return imageMap;
    }

    const current = imageMap[image.product_id] ?? [];

    if (!current.includes(normalizedImage)) {
      current.push(normalizedImage);
      imageMap[image.product_id] = current;
    }

    return imageMap;
  }, {});
}

export async function getPublicCategories(
  locale: AppLocale
): Promise<CatalogCategory[]> {
  return fetchActiveCategories(locale);
}

export async function getPublicProducts(
  locale: AppLocale,
  filters: PublicProductFilters = {}
): Promise<CatalogProduct[]> {
  const supabase = await createSupabaseServerClient();
  const capabilities = await getPublicCatalogSchemaCapabilities();
  const categoryIds = filters.categorySlug
    ? (await fetchActiveCategories(locale, filters.categorySlug)).map(
        (category) => category.id
      )
    : [];

  if (filters.categorySlug && categoryIds.length === 0) {
    return [];
  }

  let query = supabase
    .from("products")
    .select("*")
    .eq("is_active", true);

  if (capabilities.productsDeletedAt) {
    query = query.is("deleted_at", null);
  }

  if (filters.featuredOnly) {
    query = query.eq("is_featured", true);
  }

  if (categoryIds.length > 0) {
    query = query.in("category_id", categoryIds);
  }

  if (filters.excludeIds && filters.excludeIds.length > 0) {
    query = query.not(
      "id",
      "in",
      `(${filters.excludeIds.map((id) => `"${id}"`).join(",")})`
    );
  }

  if (filters.orderBy === "latest") {
    query = query
      .order("created_at", { ascending: false })
      .order("sort_order", { ascending: true });
  } else {
    query = query
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    logDbReadError("products", error.message);
    return [];
  }

  return hydratePublicProducts(locale, data);
}

export async function getFeaturedProducts(
  locale: AppLocale,
  limit = 4
): Promise<CatalogProduct[]> {
  return getPublicProducts(locale, {
    featuredOnly: true,
    limit,
    orderBy: "sort_order",
  });
}

export async function getLatestProducts(
  locale: AppLocale,
  limit = 4
): Promise<CatalogProduct[]> {
  return getPublicProducts(locale, {
    limit,
    orderBy: "latest",
  });
}

export async function getHomepageCatalog(
  locale: AppLocale
): Promise<HomepageCatalog> {
  const [categories, products] = await Promise.all([
    getPublicCategories(locale),
    getPublicProducts(locale),
  ]);
  const featuredProducts = products.filter((product) => product.isFeatured).slice(0, 4);
  const featuredIds = new Set(featuredProducts.map((product) => product.id));
  const latestProducts = [...products]
    .sort((left, right) => {
      const leftTime = Date.parse(left.createdAt);
      const rightTime = Date.parse(right.createdAt);

      if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
        return 0;
      }

      return rightTime - leftTime;
    })
    .filter((product) => !featuredIds.has(product.id))
    .slice(0, 4);

  return {
    categories: categories.slice(0, 6),
    featuredProducts,
    latestProducts:
      latestProducts.length > 0
        ? latestProducts
        : [...products]
            .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
            .slice(0, 4),
  };
}

export async function getPublicProductByIdOrSlug(
  locale: AppLocale,
  identifier: string
): Promise<CatalogProduct | null> {
  const normalized = identifier.trim();

  if (!normalized) {
    return null;
  }

  const products = await getPublicProducts(locale);
  return (
    products.find(
      (product) => product.id === normalized || product.slug === normalized
    ) ?? null
  );
}
