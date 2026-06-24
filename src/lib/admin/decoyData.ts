import type { AppLocale } from "@/i18n/routing";
import { brandLogoPath } from "@/lib/site";
import type {
  AdminCategoryRecord,
  AdminOptionGroupRecord,
  AdminOptionRecord,
  AdminProductRecord,
  LocalizedText,
} from "@/lib/db/adminCatalog";
import type { ManagedAdminUserRecord } from "@/lib/db/adminUsers";
import type { EmployeeRecord } from "@/lib/db/employees";
import type { CustomerInquiryRecord } from "@/lib/db/inquiries";
import type { AdminNotificationRecord } from "@/lib/db/notifications";
import type {
  EmailLogRecord,
  OrderDetailRecord,
  OrderListRecord,
  OrderTrackingEventRecord,
  SupportTicketRecord,
} from "@/lib/db/orders";
import type {
  AdminSettingsSnapshot,
  SiteSettingsDiagnostics,
  SmtpStatus,
} from "@/lib/db/siteSettings";
import type { WorkshopRecord } from "@/lib/db/workshops";
import type { ProductSpecifications } from "@/lib/orders/productSpecifications";
import type { AdminRole } from "@/types/admin";

function createLocalizedText(
  de: string,
  ar: string,
  en = de,
  fr = de,
  tr = de
) {
  return {
    ar,
    de,
    en,
    fr,
    tr,
  } satisfies LocalizedText;
}

function resolveLocalizedText(value: LocalizedText, locale: AppLocale) {
  return value[locale].trim() || value.de;
}

function createDecoyDiagnostics(): SiteSettingsDiagnostics {
  return {
    available: true,
    environmentLabel: "System",
    issueCode: null,
    message: null,
    missingColumns: [],
    missingEnvVars: [],
    siteBaseUrl: "",
    suggestedMigration: null,
    tableName: "site_settings",
  };
}

function createDecoySmtpStatus(): SmtpStatus {
  return {
    configured: true,
    fromAddress: "sync@example.invalid",
    fromName: "GoldHelwah GmbH",
    missing: [],
  };
}

const decoyGroupNames = {
  core: createLocalizedText(
    "Kerndetails",
    "التفاصيل الأساسية",
    "Core details",
    "Details essentiels",
    "Temel detaylar"
  ),
  finish: createLocalizedText(
    "Finish",
    "اللمسة النهائية",
    "Finish",
    "Finition",
    "Yuzey"
  ),
} as const;

const decoyOptionCatalog = [
  {
    categoryCount: 2,
    displayLabel: "Profile",
    groupId: "decoy-group-core",
    groupKey: "decoy-core",
    groupName: "Kerndetails",
    helpText: createLocalizedText(
      "Grundlegende Auswahl fuer die Werkbank.",
      "اختيار أساسي للورشة.",
      "Core workshop selection.",
      "Selection essentielle pour l'atelier.",
      "Atolye icin temel secim."
    ),
    id: "decoy-option-size",
    isActive: true,
    isRequired: true,
    key: "size_profile",
    label: createLocalizedText(
      "Profil",
      "النمط",
      "Profile",
      "Profil",
      "Profil"
    ),
    placeholder: createLocalizedText(
      "Profil waehlen",
      "اختر النمط",
      "Select profile",
      "Choisir le profil",
      "Profil sec"
    ),
    productCount: 2,
    sortOrder: 1,
    type: "select" as const,
    values: [
      { label: "Classic", value: "classic" },
      { label: "Slim", value: "slim" },
      { label: "Wide", value: "wide" },
    ],
  },
  {
    categoryCount: 1,
    displayLabel: "Finish",
    groupId: "decoy-group-finish",
    groupKey: "decoy-finish",
    groupName: "Finish",
    helpText: createLocalizedText(
      "Oberflaeche fuer die aktuelle Charge.",
      "سطح للدفعة الحالية.",
      "Surface for the current batch.",
      "Surface pour le lot actuel.",
      "Mevcut parti icin yuzey."
    ),
    id: "decoy-option-finish",
    isActive: true,
    isRequired: true,
    key: "finish_type",
    label: createLocalizedText(
      "Finish",
      "التشطيب",
      "Finish",
      "Finition",
      "Yuzey"
    ),
    placeholder: createLocalizedText(
      "Finish waehlen",
      "اختر التشطيب",
      "Select finish",
      "Choisir la finition",
      "Yuzey sec"
    ),
    productCount: 2,
    sortOrder: 2,
    type: "select" as const,
    values: [
      { label: "Polished", value: "polished" },
      { label: "Matte", value: "matte" },
    ],
  },
  {
    categoryCount: 2,
    displayLabel: "Note",
    groupId: "decoy-group-core",
    groupKey: "decoy-core",
    groupName: "Kerndetails",
    helpText: createLocalizedText(
      "Kurzer interner Hinweis fuer die Vorbereitung.",
      "ملاحظة قصيرة للتحضير.",
      "Short preparation note.",
      "Courte note de preparation.",
      "Hazirlik icin kisa not."
    ),
    id: "decoy-option-note",
    isActive: true,
    isRequired: false,
    key: "batch_note",
    label: createLocalizedText(
      "Hinweis",
      "ملاحظة",
      "Note",
      "Note",
      "Not"
    ),
    placeholder: createLocalizedText(
      "Optionaler Hinweis",
      "ملاحظة اختيارية",
      "Optional note",
      "Note facultative",
      "Istege bagli not"
    ),
    productCount: 1,
    sortOrder: 3,
    type: "textarea" as const,
    values: [],
  },
] satisfies AdminOptionRecord[];

const decoyGroupCatalog = [
  {
    id: "decoy-group-core",
    isActive: true,
    key: "decoy-core",
    name: decoyGroupNames.core,
    optionCount: 2,
    sortOrder: 1,
  },
  {
    id: "decoy-group-finish",
    isActive: true,
    key: "decoy-finish",
    name: decoyGroupNames.finish,
    optionCount: 1,
    sortOrder: 2,
  },
];

const decoyCategoryCatalog = [
  {
    accent: "#c49a52",
    description: createLocalizedText(
      "Klare Kernmodelle fuer die interne Ansicht.",
      "نماذج أساسية واضحة للعرض الداخلي.",
      "Clear core models for the internal view.",
      "Modeles essentiels pour la vue interne.",
      "Ic gorunum icin temel modeller."
    ),
    id: "decoy-category-rings",
    imageUrl: brandLogoPath,
    isActive: true,
    name: createLocalizedText(
      "Kernringe",
      "خواتم أساسية",
      "Core rings",
      "Bagues essentielles",
      "Temel yuzukler"
    ),
    optionIds: ["decoy-option-size", "decoy-option-finish"],
    productCount: 2,
    slug: "core-rings",
    sortOrder: 1,
    supportsNameCustomization: false,
  },
  {
    accent: "#e8c987",
    description: createLocalizedText(
      "Schlichte Anhangerlinie fuer die Werkbankansicht.",
      "مجموعة تعليقات بسيطة لعرض الورشة.",
      "Minimal pendant line for the workshop view.",
      "Ligne de pendentifs minimaliste pour l'atelier.",
      "Atolye gorunumu icin sade kolye ucu serisi."
    ),
    id: "decoy-category-pendants",
    imageUrl: brandLogoPath,
    isActive: true,
    name: createLocalizedText(
      "Anhängerlinie",
      "خط المعلقات",
      "Pendant line",
      "Ligne pendentifs",
      "Kolye ucu serisi"
    ),
    optionIds: ["decoy-option-finish", "decoy-option-note"],
    productCount: 1,
    slug: "pendant-line",
    sortOrder: 2,
    supportsNameCustomization: false,
  },
];

const decoyProductCatalog = [
  {
    categoryId: "decoy-category-rings",
    categoryName: decoyCategoryCatalog[0].name,
    categorySlug: decoyCategoryCatalog[0].slug,
    description: createLocalizedText(
      "Standardmodell fuer die laufende Vorbereitung.",
      "نموذج قياسي للتحضير الحالي.",
      "Standard model for the current preparation.",
      "Modele standard pour la preparation actuelle.",
      "Mevcut hazirlik icin standart model."
    ),
    displayImage: brandLogoPath,
    id: "decoy-product-ring-a",
    isActive: true,
    isFeatured: true,
    name: createLocalizedText(
      "Ring Modell A",
      "خاتم نموذج أ",
      "Ring model A",
      "Bague modele A",
      "Yuzuk model A"
    ),
    optionGroupId: "decoy-group-core",
    sku: "GH-DEMO-1001",
    slug: "ring-model-a",
    sortOrder: 1,
  },
  {
    categoryId: "decoy-category-rings",
    categoryName: decoyCategoryCatalog[0].name,
    categorySlug: decoyCategoryCatalog[0].slug,
    description: createLocalizedText(
      "Breitere Ausfuehrung fuer die interne Uebersicht.",
      "تنفيذ أعرض للعرض الداخلي.",
      "Wider version for the internal overview.",
      "Version plus large pour la vue interne.",
      "Ic gorunum icin daha genis surum."
    ),
    displayImage: brandLogoPath,
    id: "decoy-product-ring-b",
    isActive: true,
    isFeatured: false,
    name: createLocalizedText(
      "Ring Modell B",
      "خاتم نموذج ب",
      "Ring model B",
      "Bague modele B",
      "Yuzuk model B"
    ),
    optionGroupId: "decoy-group-finish",
    sku: "GH-DEMO-1002",
    slug: "ring-model-b",
    sortOrder: 2,
  },
  {
    categoryId: "decoy-category-pendants",
    categoryName: decoyCategoryCatalog[1].name,
    categorySlug: decoyCategoryCatalog[1].slug,
    description: createLocalizedText(
      "Kompakter Anhaenger fuer die aktuelle Anzeige.",
      "معلقة مدمجة للعرض الحالي.",
      "Compact pendant for the current display.",
      "Pendentif compact pour l'affichage actuel.",
      "Mevcut gorunum icin kompakt kolye ucu."
    ),
    displayImage: brandLogoPath,
    id: "decoy-product-pendant-a",
    isActive: true,
    isFeatured: false,
    name: createLocalizedText(
      "Anhänger Modell A",
      "معلقة نموذج أ",
      "Pendant model A",
      "Pendentif modele A",
      "Kolye ucu model A"
    ),
    optionGroupId: "decoy-group-core",
    sku: "GH-DEMO-1003",
    slug: "pendant-model-a",
    sortOrder: 3,
  },
];

const decoyEmployees = [
  {
    attendanceStatus: "present" as const,
    assignedOrderCount: 1,
    email: "atelier.alpha@example.invalid",
    fullName: "Bench A",
    id: "decoy-employee-a",
    isActive: true,
    notes: "",
    phone: "",
    profileId: null,
    role: "employee" as const,
    shiftLabel: "08:00 - 16:00",
    workshopId: "decoy-workshop-a",
    workshopName: "Atelier A",
  },
  {
    attendanceStatus: "present" as const,
    assignedOrderCount: 1,
    email: "atelier.beta@example.invalid",
    fullName: "Bench B",
    id: "decoy-employee-b",
    isActive: true,
    notes: "",
    phone: "",
    profileId: null,
    role: "employee" as const,
    shiftLabel: "09:00 - 17:00",
    workshopId: "decoy-workshop-b",
    workshopName: "Atelier B",
  },
] satisfies EmployeeRecord[];

const decoyWorkshops = [
  {
    activeOrders: 1,
    address: "",
    code: "AT-A",
    completedThisMonth: 3,
    contactName: "",
    email: "",
    employeeCount: 2,
    id: "decoy-workshop-a",
    isActive: true,
    location: "Zone A",
    name: "Atelier A",
    notes: "",
    onTimeRate: 96,
    phone: "",
  },
  {
    activeOrders: 1,
    address: "",
    code: "AT-B",
    completedThisMonth: 2,
    contactName: "",
    email: "",
    employeeCount: 1,
    id: "decoy-workshop-b",
    isActive: true,
    location: "Zone B",
    name: "Atelier B",
    notes: "",
    onTimeRate: 93,
    phone: "",
  },
] satisfies WorkshopRecord[];

const decoySupportTickets: SupportTicketRecord[] = [];

const decoyEmailLogs: EmailLogRecord[] = [
  {
    createdAt: "2026-06-20T08:10:00.000Z",
    errorMessage: "",
    id: "decoy-email-1",
    provider: "smtp",
    publicStage: "order_in_workshop",
    recipientEmail: "updates@example.invalid",
    sentAt: "2026-06-20T08:12:00.000Z",
    status: "sent",
    subject: "Status update",
    templateType: "public_stage_update",
  },
];

const decoyTrackingEvents = {
  orderA: [
    {
      createdAt: "2026-06-18T08:00:00.000Z",
      createdBy: "System",
      description: "Order prepared for workshop intake.",
      id: "decoy-track-a-1",
      isPublic: true,
      notifyCustomer: false,
      publicStage: "order_in_workshop",
      status: "created" as const,
      title: "Created",
    },
    {
      createdAt: "2026-06-19T09:15:00.000Z",
      createdBy: "System",
      description: "Production steps were scheduled.",
      id: "decoy-track-a-2",
      isPublic: true,
      notifyCustomer: false,
      publicStage: "order_in_workshop",
      status: "in_production" as const,
      title: "In production",
    },
  ],
  orderB: [
    {
      createdAt: "2026-06-17T07:40:00.000Z",
      createdBy: "System",
      description: "Order moved into the ready queue.",
      id: "decoy-track-b-1",
      isPublic: true,
      notifyCustomer: false,
      publicStage: "ready_for_pickup",
      status: "ready_for_pickup" as const,
      title: "Ready for pickup",
    },
  ],
} satisfies Record<string, OrderTrackingEventRecord[]>;

function createProductSpecifications(): ProductSpecifications {
  return {
    karat: "18",
    nameCustomization: {
      enabled: false,
      language: null,
      text: null,
    },
    weightGrams: 8,
  };
}

function createDecoyOrderList(): OrderListRecord[] {
  return [
    {
      archivedAt: "",
      assignedAt: "2026-06-18T08:10:00.000Z",
      assignedWorkerEmail: "atelier.alpha@example.invalid",
      assignmentNote: "Politur und Form vor Beginn pruefen.",
      assignmentStatus: "in_progress",
      cancelledAt: "",
      completedAt: "",
      createdAt: "2026-06-18T08:00:00.000Z",
      currency: "EUR",
      customerEmail: "",
      customerName: "",
      deletedAt: "",
      dueDate: "2026-06-24",
      emailUpdatesEnabled: false,
      employeeId: "decoy-employee-a",
      employeeNote: "Form vorbereitet, Gewicht wird abgestimmt.",
      employeeName: "Bench A",
      id: "decoy-order-1001",
      internalOrderNumber: "GH-1001",
      itemCount: 1,
      previewProductName: "Ring model A",
      priority: "urgent",
      publicTrackingStage: "order_in_workshop",
      status: "in_production",
      supportTicketCount: 0,
      totalAmount: null,
      trackingNumber: "SYNC-1001",
      trackingStatus: "in_production",
      updatedAt: "2026-06-19T09:15:00.000Z",
      withdrawnAt: "",
      workshopId: "decoy-workshop-a",
      workshopName: "Atelier A",
    },
    {
      archivedAt: "",
      assignedAt: "2026-06-17T07:35:00.000Z",
      assignedWorkerEmail: "atelier.beta@example.invalid",
      assignmentNote: "Fassung vor Versand final pruefen.",
      assignmentStatus: "waiting",
      cancelledAt: "",
      completedAt: "",
      createdAt: "2026-06-17T07:20:00.000Z",
      currency: "EUR",
      customerEmail: "",
      customerName: "",
      deletedAt: "",
      dueDate: "2026-06-22",
      emailUpdatesEnabled: false,
      employeeId: "decoy-employee-b",
      employeeNote: "Wartet auf finale Freigabe.",
      employeeName: "Bench B",
      id: "decoy-order-1002",
      internalOrderNumber: "GH-1002",
      itemCount: 1,
      previewProductName: "Pendant model A",
      priority: "normal",
      publicTrackingStage: "ready_for_pickup",
      status: "ready",
      supportTicketCount: 0,
      totalAmount: null,
      trackingNumber: "SYNC-1002",
      trackingStatus: "ready_for_pickup",
      updatedAt: "2026-06-20T10:05:00.000Z",
      withdrawnAt: "",
      workshopId: "decoy-workshop-b",
      workshopName: "Atelier B",
    },
  ];
}

function createDecoyOrderDetail(orderId: string): OrderDetailRecord {
  const baseOrder =
    createDecoyOrderList().find((order) => order.id === orderId) ??
    createDecoyOrderList()[0];
  const isSecondOrder = baseOrder.id === "decoy-order-1002";
  const productId = isSecondOrder ? "decoy-product-pendant-a" : "decoy-product-ring-a";
  const product = decoyProductCatalog.find((entry) => entry.id === productId) ?? decoyProductCatalog[0];
  const trackingEvents = isSecondOrder
    ? decoyTrackingEvents.orderB
    : decoyTrackingEvents.orderA;

  return {
    ...baseOrder,
    attachments: [brandLogoPath],
    customerLanguage: "de",
    customerPhone: "",
    customerReference: "",
    emailLogs: decoyEmailLogs,
    goldDetails: {
      finishType: isSecondOrder ? "Matte" : "Polished",
      goldColor: "yellow_gold",
      goldKarat: "18K",
      targetWeight: "8 g",
    },
    items: [
      {
        categoryName: resolveLocalizedText(product.categoryName, "en"),
        categorySlug: product.categorySlug,
        id: `${baseOrder.id}-item-1`,
        notes: "",
        productId: product.id,
        productImage: product.displayImage,
        productName: resolveLocalizedText(product.name, "en"),
        productSku: product.sku,
        productSlug: product.slug,
        quantity: 1,
        referenceImages: [brandLogoPath],
        selectedOptions: [
          {
            groupKey: "decoy-core",
            key: "size_profile",
            label: "Profile",
            optionId: "decoy-option-size",
            type: "select",
            value: isSecondOrder ? "slim" : "classic",
          },
          {
            groupKey: "decoy-finish",
            key: "finish_type",
            label: "Finish",
            optionId: "decoy-option-finish",
            type: "select",
            value: isSecondOrder ? "matte" : "polished",
          },
        ],
      },
    ],
    measurements: {
      ringSize: isSecondOrder ? "" : "54",
    },
    notes: {
      adminNotes: "",
      customerNotes: "",
      qualityRequirements: "Standard check",
      workshopNotes: "Prepared",
    },
    personalization: {},
    productSpecifications: createProductSpecifications(),
    stones: {},
    supportTickets: decoySupportTickets,
    trackingEvents,
  };
}

export function getDecoyAdminCategories(locale: AppLocale): AdminCategoryRecord[] {
  return decoyCategoryCatalog.map((category) => ({
    accent: category.accent,
    description: category.description,
    displayDescription: resolveLocalizedText(category.description, locale),
    displayName: resolveLocalizedText(category.name, locale),
    id: category.id,
    imageUrl: category.imageUrl,
    isActive: category.isActive,
    name: category.name,
    optionCount: category.optionIds.length,
    optionIds: category.optionIds,
    productCount: category.productCount,
    slug: category.slug,
    sortOrder: category.sortOrder,
    supportsNameCustomization: category.supportsNameCustomization,
  }));
}

export function getDecoyAdminOptions(locale: AppLocale): AdminOptionRecord[] {
  return decoyOptionCatalog.map((option) => ({
    ...option,
    displayLabel: resolveLocalizedText(option.label, locale),
    groupKey:
      option.groupId === "decoy-group-core" ? "decoy-core" : "decoy-finish",
    groupName: resolveLocalizedText(
      option.groupId === "decoy-group-core"
        ? decoyGroupNames.core
        : decoyGroupNames.finish,
      locale
    ),
    helpText: option.helpText,
    label: option.label,
    placeholder: option.placeholder,
    categoryCount: option.groupId === "decoy-group-core" ? 2 : 1,
  }));
}

export function getDecoyOptionGroups(locale: AppLocale): AdminOptionGroupRecord[] {
  const options = getDecoyAdminOptions(locale);

  return decoyGroupCatalog.map((group) => ({
    displayName: resolveLocalizedText(group.name, locale),
    id: group.id,
    isActive: group.isActive,
    key: group.key,
    name: group.name,
    optionCount: options.filter((option) => option.groupId === group.id).length,
    options: options.filter((option) => option.groupId === group.id),
    sortOrder: group.sortOrder,
  }));
}

export function getDecoyAdminProducts(locale: AppLocale): AdminProductRecord[] {
  const options = getDecoyAdminOptions(locale);

  return decoyProductCatalog.map((product) => {
    const optionSettings = options
      .filter((option) => option.groupId === product.optionGroupId)
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((option) => ({
        displayLabel: option.displayLabel,
        groupKey: option.groupKey,
        groupName: option.groupName,
        id: option.id,
        isRequired: option.isRequired,
        key: option.key,
        type: option.type,
        values: option.values,
      }));

    return {
      categoryId: product.categoryId,
      categoryName: resolveLocalizedText(product.categoryName, locale),
      categorySlug: product.categorySlug,
      categorySupportsNameCustomization: false,
      description: product.description,
      displayDescription: resolveLocalizedText(product.description, locale),
      displayName: resolveLocalizedText(product.name, locale),
      effectiveSupportsNameCustomization: false,
      gallery: [product.displayImage],
      id: product.id,
      imageUrl: product.displayImage,
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      name: product.name,
      nameCustomizationMode: "disabled",
      optionCount: optionSettings.length,
      optionGroupId: product.optionGroupId,
      optionGroupKey:
        product.optionGroupId === "decoy-group-core" ? "decoy-core" : "decoy-finish",
      optionGroupName:
        product.optionGroupId === "decoy-group-core"
          ? resolveLocalizedText(decoyGroupNames.core, locale)
          : resolveLocalizedText(decoyGroupNames.finish, locale),
      optionIds: optionSettings.map((option) => option.id),
      optionSettings,
      sku: product.sku,
      slug: product.slug,
      sortOrder: product.sortOrder,
      supportsNameCustomization: false,
      tags: ["core"],
    };
  });
}

export function getDecoyOrders(viewerRole?: AdminRole): OrderListRecord[] {
  const orders = createDecoyOrderList();

  if (viewerRole === "employee") {
    return orders.slice(0, 1);
  }

  return orders;
}

export function getDecoyOrderDetail(orderId: string) {
  const safeOrderId = orderId.trim() || "decoy-order-1001";
  return createDecoyOrderDetail(safeOrderId);
}

export function getDecoyEmployees(viewerRole?: AdminRole): EmployeeRecord[] {
  if (viewerRole === "employee") {
    return decoyEmployees.slice(0, 1);
  }

  return decoyEmployees;
}

export function getDecoyWorkshops(viewerRole?: AdminRole): WorkshopRecord[] {
  if (viewerRole === "employee") {
    return decoyWorkshops.slice(0, 1);
  }

  return decoyWorkshops;
}

export function getDecoyNotifications(): AdminNotificationRecord[] {
  return [
    {
      createdAt: "2026-06-20T08:30:00.000Z",
      id: "decoy-notification-1",
      isRead: false,
      linkPath: "/admin/orders/decoy-order-1001",
      message: "Production queue updated for the current batch.",
      title: "Batch review",
      type: "order_updated",
    },
    {
      createdAt: "2026-06-19T14:05:00.000Z",
      id: "decoy-notification-2",
      isRead: true,
      linkPath: "/admin/orders/decoy-order-1002",
      message: "Ready queue refreshed for pickup planning.",
      title: "Pickup queue",
      type: "system",
    },
  ];
}

export function getDecoyInquiries(): CustomerInquiryRecord[] {
  return [
    {
      archivedAt: "",
      createdAt: "2026-06-20T07:50:00.000Z",
      customerEmail: "",
      customerName: "Request A",
      customerPhone: "",
      deletedAt: "",
      id: "decoy-inquiry-1",
      locale: "de",
      message: "Requested a sizing update for the current workshop batch.",
      optionValues: [],
      productId: "decoy-product-ring-a",
      productSnapshot: {
        categoryName: "Core rings",
        id: "decoy-product-ring-a",
        imageUrl: brandLogoPath,
        name: "Ring model A",
        price: "",
        sku: "GH-DEMO-1001",
        slug: "ring-model-a",
      },
      source: "order_entry",
      status: "new",
      updatedAt: "2026-06-20T07:50:00.000Z",
    },
    {
      archivedAt: "",
      createdAt: "2026-06-19T10:15:00.000Z",
      customerEmail: "",
      customerName: "Request B",
      customerPhone: "",
      deletedAt: "",
      id: "decoy-inquiry-2",
      locale: "de",
      message: "Requested confirmation for the polished finish.",
      optionValues: [],
      productId: "decoy-product-pendant-a",
      productSnapshot: {
        categoryName: "Pendant line",
        id: "decoy-product-pendant-a",
        imageUrl: brandLogoPath,
        name: "Pendant model A",
        price: "",
        sku: "GH-DEMO-1003",
        slug: "pendant-model-a",
      },
      source: "product",
      status: "in_progress",
      updatedAt: "2026-06-19T12:10:00.000Z",
    },
  ];
}

export function getDecoyManagedUsers(): ManagedAdminUserRecord[] {
  return [
    {
      createdAt: "2026-06-01T08:00:00.000Z",
      deletedAt: "",
      displayName: "Owner Account",
      email: "owner@example.invalid",
      id: "decoy-user-owner",
      invitedAt: "2026-06-01T08:10:00.000Z",
      isActive: true,
      lastLoginAt: "2026-06-20T06:30:00.000Z",
      role: "super_admin",
    },
    {
      createdAt: "2026-06-02T09:00:00.000Z",
      deletedAt: "",
      displayName: "Studio Account",
      email: "studio@example.invalid",
      id: "decoy-user-studio",
      invitedAt: "2026-06-02T09:05:00.000Z",
      isActive: true,
      lastLoginAt: "2026-06-19T10:00:00.000Z",
      role: "admin",
    },
  ];
}

export function getDecoySettingsSnapshot(): AdminSettingsSnapshot {
  return {
    adminNotificationEmail: "atelier@example.invalid",
    diagnostics: createDecoyDiagnostics(),
    orderEntryEnabled: false,
    orderEntryExpiresAt: "",
    orderEntryRotatedAt: "",
    orderEntryToken: "",
    orderEntryTokenHint: "",
    ownerEmail: "owner@example.invalid",
    privacyModeEnabled: false,
    privacyModeReason: "",
    privacyModeUpdatedAt: "",
    smtpStatus: createDecoySmtpStatus(),
    supportNotificationEmail: "support@example.invalid",
  };
}

export function getDecoyAdminNavCounts(role: AdminRole) {
  const orders = getDecoyOrders(role);

  if (role === "employee") {
    return {
      orders: orders.length,
    };
  }

  return {
    inquiries: getDecoyInquiries().filter((inquiry) => inquiry.status === "new").length,
    orders: orders.length,
    overview: 1,
    settings: 0,
  };
}
