export type CatalogCategory = {
  accent: string;
  id: string;
  imageUrl: string;
  name: string;
  shortDescription: string;
  slug: string;
};

export type CatalogProduct = {
  categorySlug: CatalogCategory["slug"];
  gallery: string[];
  id: string;
  imageUrl: string;
  isFeatured: boolean;
  name: string;
  shortDescription: string;
  slug: string;
  tags: string[];
};

export type ProductImageAsset = {
  alt: string;
  id: string;
  src: string;
};

export const realProductImages: ProductImageAsset[] = [
  {
    id: "real-01",
    src: "/images/products/real/goldhelwah-product-01.jpg",
    alt: "Goldschmuckset mit zwei Colliers, Armband und Ohrringen",
  },
  {
    id: "real-02",
    src: "/images/products/real/goldhelwah-product-02.jpg",
    alt: "Goldschmuckset mit strukturierten Ornamenten und warmem Goldton",
  },
  {
    id: "real-03",
    src: "/images/products/real/goldhelwah-product-03.jpg",
    alt: "Goldschmuckset mit breiten Elementen und hellem Hintergrund",
  },
  {
    id: "real-04",
    src: "/images/products/real/goldhelwah-product-04.jpg",
    alt: "Goldmedaillon-Kollier mit ausgearbeiteter Rahmenstruktur",
  },
  {
    id: "real-05",
    src: "/images/products/real/goldhelwah-product-05.jpg",
    alt: "Goldschmuckset mit hängendem Mittelmotiv und feinen Details",
  },
  {
    id: "real-06",
    src: "/images/products/real/goldhelwah-product-06.jpg",
    alt: "Goldschmuckset mit dunklem Hintergrund und breitem Medaillon",
  },
  {
    id: "real-07",
    src: "/images/products/real/goldhelwah-product-07.jpg",
    alt: "Goldcollier mit rechteckigen Motiven und filigraner Struktur",
  },
];

const imageSet = {
  bracelet: realProductImages[0].src,
  classic: realProductImages[2].src,
  medallion: realProductImages[3].src,
  noir: realProductImages[5].src,
  pendant: realProductImages[4].src,
  royal: realProductImages[6].src,
  signature: realProductImages[1].src,
} as const;

export const catalogCategories: CatalogCategory[] = [
  {
    id: "cat-sets",
    slug: "schmucksets",
    name: "Schmucksets",
    accent: "Royal",
    shortDescription: "Kuratierte Sets mit starkem Goldauftritt.",
    imageUrl: imageSet.signature,
  },
  {
    id: "cat-earrings",
    slug: "ohrringe",
    name: "Ohrringe",
    accent: "Licht",
    shortDescription: "Feine Goldakzente für Abend und Alltag.",
    imageUrl: imageSet.bracelet,
  },
  {
    id: "cat-bracelets",
    slug: "armbaender",
    name: "Armbänder",
    accent: "Balance",
    shortDescription: "Goldene Linien mit ruhiger Präsenz.",
    imageUrl: imageSet.classic,
  },
  {
    id: "cat-flex",
    slug: "flex-armbaender",
    name: "Flex-Armbänder",
    accent: "Soft",
    shortDescription: "Bewegliche Eleganz mit warmer Ausstrahlung.",
    imageUrl: imageSet.noir,
  },
  {
    id: "cat-pendants",
    slug: "anhaenger",
    name: "Anhänger",
    accent: "Statement",
    shortDescription: "Markante Motive für Collier und Geschenk.",
    imageUrl: imageSet.pendant,
  },
  {
    id: "cat-name",
    slug: "namensschmuck-nach-mass",
    name: "Namensschmuck nach Maß",
    accent: "Atelier",
    shortDescription: "Persönliche Stücke mit individueller Note.",
    imageUrl: imageSet.royal,
  },
  {
    id: "cat-rings",
    slug: "ringe",
    name: "Ringe",
    accent: "Signatur",
    shortDescription: "Goldringe mit klarer Formensprache.",
    imageUrl: imageSet.medallion,
  },
  {
    id: "cat-wedding",
    slug: "eheringe-trauringe",
    name: "Eheringe / Trauringe",
    accent: "Bindung",
    shortDescription: "Modelle für Verlobung und Zeremonie.",
    imageUrl: imageSet.signature,
  },
  {
    id: "cat-long-necklaces",
    slug: "lange-halsketten-hijab-ketten",
    name: "Lange Halsketten / Hijab-Ketten",
    accent: "Länge",
    shortDescription: "Lange Silhouetten für Layering und Hijab-Looks.",
    imageUrl: imageSet.royal,
  },
  {
    id: "cat-anklets",
    slug: "fusskettchen",
    name: "Fusskettchen",
    accent: "Leicht",
    shortDescription: "Zarte Goldmomente mit feinem Glanz.",
    imageUrl: imageSet.classic,
  },
  {
    id: "cat-handchains",
    slug: "handketten",
    name: "Handketten",
    accent: "Form",
    shortDescription: "Elegante Verbindungen zwischen Ring und Armband.",
    imageUrl: imageSet.pendant,
  },
  {
    id: "cat-piercings",
    slug: "piercings",
    name: "Piercings",
    accent: "Mini",
    shortDescription: "Zurückhaltende Akzente mit edlem Finish.",
    imageUrl: imageSet.noir,
  },
  {
    id: "cat-fine-necklaces",
    slug: "feine-halsketten",
    name: "Feine Halsketten",
    accent: "Daily Gold",
    shortDescription: "Zarte Ketten für feine Luxusmomente.",
    imageUrl: imageSet.medallion,
  },
  {
    id: "cat-kids-earrings",
    slug: "kinderohrringe",
    name: "Kinderohrringe",
    accent: "Sanft",
    shortDescription: "Kindgerechte Formen mit feinem Goldcharakter.",
    imageUrl: imageSet.bracelet,
  },
  {
    id: "cat-kids-bracelets",
    slug: "kinderarmbaender",
    name: "Kinderarmbänder",
    accent: "Herz",
    shortDescription: "Familiengeschenke mit leichter Silhouette.",
    imageUrl: imageSet.classic,
  },
  {
    id: "cat-kids-pendants",
    slug: "kinderanhaenger",
    name: "Kinderanhänger",
    accent: "Erinnerung",
    shortDescription: "Kleine Motive für besondere Momente.",
    imageUrl: imageSet.pendant,
  },
  {
    id: "cat-bullion",
    slug: "goldunzen-goldbarren",
    name: "Goldunzen & Goldbarren",
    accent: "Wert",
    shortDescription: "Goldobjekte mit ruhiger Präsentation.",
    imageUrl: imageSet.royal,
  },
];

export const catalogProducts: CatalogProduct[] = [
  {
    id: "prd-001",
    slug: "helwah-signature-set",
    categorySlug: "schmucksets",
    name: "Helwah Signature Set",
    shortDescription: "Collier, Armband und Ohrringe in klarer Goldlinie.",
    imageUrl: realProductImages[0].src,
    gallery: [
      realProductImages[0].src,
      realProductImages[1].src,
      realProductImages[2].src,
    ],
    tags: ["21K", "Set", "Showroom"],
    isFeatured: true,
  },
  {
    id: "prd-002",
    slug: "noor-drops",
    categorySlug: "ohrringe",
    name: "Noor Drops",
    shortDescription: "Filigrane Ohrringe als Teil eines warmen Goldensembles.",
    imageUrl: realProductImages[1].src,
    gallery: [
      realProductImages[1].src,
      realProductImages[0].src,
      realProductImages[5].src,
    ],
    tags: ["Ohrringe", "Gold", "Elegant"],
    isFeatured: true,
  },
  {
    id: "prd-003",
    slug: "safa-armband",
    categorySlug: "armbaender",
    name: "Safa Armband",
    shortDescription: "Markantes Goldarmband mit ruhiger Royal-Präsenz.",
    imageUrl: realProductImages[2].src,
    gallery: [
      realProductImages[2].src,
      realProductImages[0].src,
      realProductImages[3].src,
    ],
    tags: ["Armband", "Classic", "Gold"],
    isFeatured: true,
  },
  {
    id: "prd-004",
    slug: "layali-flex",
    categorySlug: "flex-armbaender",
    name: "Layali Flex",
    shortDescription: "Weiche Bewegung und goldene Balance für jeden Anlass.",
    imageUrl: realProductImages[3].src,
    gallery: [
      realProductImages[3].src,
      realProductImages[4].src,
      realProductImages[6].src,
    ],
    tags: ["Flex", "Atelier", "Light"],
    isFeatured: false,
  },
  {
    id: "prd-005",
    slug: "royal-medaillon",
    categorySlug: "anhaenger",
    name: "Royal Medaillon",
    shortDescription: "Großzügiger Anhänger mit bildstarker Silhouette.",
    imageUrl: realProductImages[4].src,
    gallery: [
      realProductImages[4].src,
      realProductImages[3].src,
      realProductImages[6].src,
    ],
    tags: ["Medaillon", "Statement", "Gift"],
    isFeatured: true,
  },
  {
    id: "prd-006",
    slug: "atelier-namenscollier",
    categorySlug: "namensschmuck-nach-mass",
    name: "Atelier Namenscollier",
    shortDescription: "Individuell gedacht und für persönliche Wünsche vorbereitet.",
    imageUrl: realProductImages[5].src,
    gallery: [
      realProductImages[5].src,
      realProductImages[3].src,
      realProductImages[1].src,
    ],
    tags: ["Custom", "Atelier", "Maß"],
    isFeatured: false,
  },
  {
    id: "prd-007",
    slug: "noura-signet",
    categorySlug: "ringe",
    name: "Noura Signet",
    shortDescription: "Ringlinie mit klarer Form und warmem Goldcharakter.",
    imageUrl: realProductImages[6].src,
    gallery: [
      realProductImages[6].src,
      realProductImages[5].src,
      realProductImages[2].src,
    ],
    tags: ["Ring", "Signatur", "Gold"],
    isFeatured: false,
  },
  {
    id: "prd-008",
    slug: "ewiges-paar",
    categorySlug: "eheringe-trauringe",
    name: "Ewiges Paar",
    shortDescription: "Trauringe mit stiller Präsenz und klarer Symbolik.",
    imageUrl: realProductImages[0].src,
    gallery: [
      realProductImages[0].src,
      realProductImages[1].src,
      realProductImages[6].src,
    ],
    tags: ["Trauringe", "Wedding", "Couple"],
    isFeatured: true,
  },
  {
    id: "prd-009",
    slug: "royal-long-line",
    categorySlug: "lange-halsketten-hijab-ketten",
    name: "Royal Long Line",
    shortDescription: "Langes Collier für Layering, Anlass und Hijab-Styling.",
    imageUrl: realProductImages[3].src,
    gallery: [
      realProductImages[3].src,
      realProductImages[6].src,
      realProductImages[4].src,
    ],
    tags: ["Long", "Layering", "Hijab"],
    isFeatured: false,
  },
  {
    id: "prd-010",
    slug: "sahara-fusskette",
    categorySlug: "fusskettchen",
    name: "Sahara Fusskette",
    shortDescription: "Leichtes Goldstatement für sommerliche Looks.",
    imageUrl: realProductImages[2].src,
    gallery: [
      realProductImages[2].src,
      realProductImages[4].src,
      realProductImages[0].src,
    ],
    tags: ["Fusskette", "Summer", "Light"],
    isFeatured: false,
  },
  {
    id: "prd-011",
    slug: "amira-handkette",
    categorySlug: "handketten",
    name: "Amira Handkette",
    shortDescription: "Elegante Verbindung mit feiner Goldbewegung.",
    imageUrl: realProductImages[4].src,
    gallery: [
      realProductImages[4].src,
      realProductImages[1].src,
      realProductImages[2].src,
    ],
    tags: ["Handkette", "Elegant", "Showroom"],
    isFeatured: false,
  },
  {
    id: "prd-012",
    slug: "micro-piercing-light",
    categorySlug: "piercings",
    name: "Micro Piercing Light",
    shortDescription: "Minimaler Goldakzent mit feinem Finish.",
    imageUrl: realProductImages[5].src,
    gallery: [
      realProductImages[5].src,
      realProductImages[1].src,
      realProductImages[3].src,
    ],
    tags: ["Piercing", "Mini", "Fine"],
    isFeatured: false,
  },
  {
    id: "prd-013",
    slug: "atelier-feinkette",
    categorySlug: "feine-halsketten",
    name: "Atelier Feinkette",
    shortDescription: "Zarte Kette für tägliche Eleganz und Layering.",
    imageUrl: realProductImages[3].src,
    gallery: [
      realProductImages[3].src,
      realProductImages[6].src,
      realProductImages[0].src,
    ],
    tags: ["Fein", "Daily Gold", "Layering"],
    isFeatured: true,
  },
  {
    id: "prd-014",
    slug: "mini-star-ears",
    categorySlug: "kinderohrringe",
    name: "Mini Star Ears",
    shortDescription: "Sanfte Formen für kleine besondere Geschenke.",
    imageUrl: realProductImages[1].src,
    gallery: [
      realProductImages[1].src,
      realProductImages[0].src,
      realProductImages[2].src,
    ],
    tags: ["Kids", "Ohrringe", "Gift"],
    isFeatured: false,
  },
  {
    id: "prd-015",
    slug: "soft-loop-mini",
    categorySlug: "kinderarmbaender",
    name: "Soft Loop Mini",
    shortDescription: "Leichtes Goldarmband für liebevolle Familienmomente.",
    imageUrl: realProductImages[2].src,
    gallery: [
      realProductImages[2].src,
      realProductImages[0].src,
      realProductImages[4].src,
    ],
    tags: ["Kids", "Armband", "Soft"],
    isFeatured: false,
  },
  {
    id: "prd-016",
    slug: "little-medaillon",
    categorySlug: "kinderanhaenger",
    name: "Little Medaillon",
    shortDescription: "Kleiner Anhänger mit warmer Erinnerungskraft.",
    imageUrl: realProductImages[4].src,
    gallery: [
      realProductImages[4].src,
      realProductImages[3].src,
      realProductImages[6].src,
    ],
    tags: ["Kids", "Anhänger", "Keepsake"],
    isFeatured: false,
  },
  {
    id: "prd-017",
    slug: "heritage-ounce",
    categorySlug: "goldunzen-goldbarren",
    name: "Heritage Ounce",
    shortDescription: "Wertobjekte mit klarer, ruhiger Präsentation.",
    imageUrl: realProductImages[6].src,
    gallery: [
      realProductImages[6].src,
      realProductImages[5].src,
      realProductImages[3].src,
    ],
    tags: ["Gold", "Heritage", "Value"],
    isFeatured: false,
  },
];

export const featuredCatalogProducts = catalogProducts.filter(
  (product) => product.isFeatured
);

export const homepageCategorySlugs: CatalogCategory["slug"][] = [
  "schmucksets",
  "ohrringe",
  "anhaenger",
  "handketten",
  "eheringe-trauringe",
  "feine-halsketten",
];

export const homepageEditorialProducts = [
  catalogProducts[0],
  catalogProducts[4],
  catalogProducts[7],
  catalogProducts[12],
  catalogProducts[1],
  catalogProducts[6],
];

export function getCategoryBySlug(slug: CatalogCategory["slug"]) {
  return catalogCategories.find((category) => category.slug === slug);
}
