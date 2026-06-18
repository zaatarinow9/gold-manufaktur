export type CatalogCategory = {
  accent: string;
  id: string;
  imageUrl: string;
  name: string;
  shortDescription: string;
  slug: string;
};

export type CatalogProduct = {
  categoryId: string | null;
  categoryName: string;
  categorySlug: CatalogCategory["slug"];
  createdAt: string;
  gallery: string[];
  id: string;
  imageUrl: string;
  isFeatured: boolean;
  name: string;
  shortDescription: string;
  slug: string;
  supportsNameCustomization?: boolean;
  tags: string[];
};
