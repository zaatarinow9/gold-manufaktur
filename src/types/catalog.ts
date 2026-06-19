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
  optionGroup: CatalogProductOptionGroup | null;
  shortDescription: string;
  sku: string;
  slug: string;
  supportsNameCustomization?: boolean;
  tags: string[];
};

export type CatalogProductOptionValue = {
  label: string;
  value: string;
};

export type CatalogProductOptionField = {
  helpText: string;
  id: string;
  isRequired: boolean;
  key: string;
  label: string;
  placeholder: string;
  type: string;
  values: CatalogProductOptionValue[];
};

export type CatalogProductOptionGroup = {
  id: string;
  key: string;
  name: string;
  options: CatalogProductOptionField[];
};
