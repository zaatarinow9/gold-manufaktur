import type { AppLocale } from "@/i18n/routing";
import type { TrackingStatus } from "@/types/admin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TECHNICAL_ERROR_PATTERN =
  /origin|invalid_format|invalid uuid|zoderror|expected|received|path|code|json|supabase|null|undefined/i;

const importantCustomerStatuses = new Set<TrackingStatus>([
  "created",
  "accepted_by_workshop",
  "in_production",
  "ready_for_pickup",
  "on_the_way",
  "delivered_to_store",
  "completed",
  "cancelled",
]);

type OrderWorkflowCopy = {
  assignmentDescription: string;
  assignmentSaved: string;
  assignmentTitle: string;
  attachmentsLabel: string;
  createdEmailFallback: string;
  createdEmailFailed: string;
  customerEmailInvalid: string;
  customerLanguage: string;
  customerNoteLabel: string;
  customerNotePlaceholder: string;
  emailLogTitle: string;
  employeeLabel: string;
  employeeRequiresWorkshop: string;
  formErrorFallback: string;
  internalNoteLabel: string;
  internalNotePlaceholder: string;
  invalidSelection: string;
  itemsTitle: string;
  noChanges: string;
  noEmailLogs: string;
  noSupportTickets: string;
  noWorkshopAssigned: string;
  optionVisibilityEmpty: string;
  optionVisibilityHelp: string;
  optionsLabel: (count: number) => string;
  orderCreatedFallback: string;
  orderCreatedSuccess: string;
  productRequired: string;
  quantityInvalid: string;
  requiredLabel: string;
  saveUpdate: string;
  selectLanguage: string;
  selectProduct: string;
  selectStatus: string;
  selectWorkshop: string;
  statusEmailFallback: string;
  statusEmailFailed: string;
  supportTicketsTitle: string;
  technicalCreateFallback: string;
  technicalUpdateFallback: string;
  workshopAssignmentHint: string;
  workshopLabel: string;
  workshopRequired: string;
};

function getCountFormatter(locale: AppLocale) {
  return new Intl.NumberFormat(locale);
}

function baseCopy(locale: AppLocale): OrderWorkflowCopy {
  const formatCount = getCountFormatter(locale);

  const countLabel = (count: number) => {
    const formatted = formatCount.format(count);

    if (locale === "ar") {
      return `${formatted} خيارات`;
    }

    if (locale === "de") {
      return `${formatted} Optionen`;
    }

    return `${formatted} options`;
  };

  if (locale === "ar") {
    return {
      assignmentDescription:
        "حدّث الورشة، الموظف، الحالة، والملاحظات بدون كشف أي بيانات تقنية.",
      assignmentSaved: "تم حفظ تحديث الطلب.",
      assignmentTitle: "إدارة الطلب",
      attachmentsLabel: "المرفقات",
      createdEmailFallback:
        "تم إنشاء الطلب. تم تسجيل رسالة العميل دون إرسال لأن إعدادات البريد غير مكتملة.",
      createdEmailFailed:
        "تم إنشاء الطلب، لكن تعذّر إرسال رسالة العميل في الوقت الحالي.",
      customerEmailInvalid: "يرجى إدخال بريد إلكتروني صحيح.",
      customerLanguage: "لغة العميل",
      customerNoteLabel: "ملاحظة للعميل",
      customerNotePlaceholder: "اكتب رسالة يمكن للعميل رؤيتها إذا لزم الأمر.",
      emailLogTitle: "سجل البريد الإلكتروني",
      employeeLabel: "تعيين موظف",
      employeeRequiresWorkshop: "يرجى اختيار الورشة أولاً قبل تعيين موظف.",
      formErrorFallback: "تعذّر حفظ التغييرات. يرجى المحاولة مرة أخرى.",
      internalNoteLabel: "ملاحظة داخلية",
      internalNotePlaceholder: "ملاحظة داخلية للفريق أو الورشة.",
      invalidSelection: "القيمة المختارة غير صالحة. يرجى المحاولة مرة أخرى.",
      itemsTitle: "العناصر",
      noChanges: "لا توجد تغييرات للحفظ حتى الآن.",
      noEmailLogs: "لا توجد رسائل بريد مسجلة لهذا الطلب بعد.",
      noSupportTickets: "لا توجد تذاكر دعم مرتبطة بهذا الطلب حتى الآن.",
      noWorkshopAssigned: "غير معيّن بعد",
      optionVisibilityEmpty: "لا توجد خيارات منتجات متاحة حتى الآن.",
      optionVisibilityHelp:
        "حدّد الخيارات الظاهرة لهذا المنتج والخيارات المطلوبة عند إنشاء الطلب.",
      optionsLabel: countLabel,
      orderCreatedFallback: "تم إنشاء الطلب، ويمكن متابعة التخصيص لاحقًا.",
      orderCreatedSuccess: "تم إنشاء الطلب بنجاح.",
      productRequired: "يرجى اختيار منتج.",
      quantityInvalid: "يرجى إدخال كمية صحيحة.",
      requiredLabel: "مطلوب",
      saveUpdate: "حفظ التحديث",
      selectLanguage: "اختر اللغة",
      selectProduct: "اختر المنتج",
      selectStatus: "اختر الحالة",
      selectWorkshop: "اختر الورشة",
      statusEmailFallback:
        "تم حفظ الحالة. سيتم الاحتفاظ بإشعار العميل في السجل حتى يكتمل إعداد البريد.",
      statusEmailFailed:
        "تم حفظ الحالة، لكن تعذّر إرسال إشعار العميل في الوقت الحالي.",
      supportTicketsTitle: "طلبات الدعم",
      technicalCreateFallback:
        "تعذّر إنشاء الطلب. يرجى التحقق من البيانات والمحاولة مرة أخرى.",
      technicalUpdateFallback:
        "تعذّر حفظ التحديث. يرجى التحقق من البيانات والمحاولة مرة أخرى.",
      workshopAssignmentHint:
        "يمكنك إنشاء الطلب أولاً ثم تعيين الورشة والموظف لاحقًا.",
      workshopLabel: "تعيين ورشة",
      workshopRequired: "يرجى اختيار ورشة عند الإسناد.",
    };
  }

  if (locale === "de") {
    return {
      assignmentDescription:
        "Werkstatt, Mitarbeiter, Status und Notizen ohne technische Fehlermeldungen pflegen.",
      assignmentSaved: "Auftragsaktualisierung gespeichert.",
      assignmentTitle: "Auftrag steuern",
      attachmentsLabel: "Anhänge",
      createdEmailFallback:
        "Der Auftrag wurde erstellt. Die Kunden-E-Mail wurde nur protokolliert, weil die Mail-Konfiguration noch unvollständig ist.",
      createdEmailFailed:
        "Der Auftrag wurde erstellt, aber die Kunden-E-Mail konnte gerade nicht gesendet werden.",
      customerEmailInvalid: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
      customerLanguage: "Kundensprache",
      customerNoteLabel: "Hinweis für den Kunden",
      customerNotePlaceholder:
        "Kurze Nachricht, die der Kunde im Tracking sehen darf.",
      emailLogTitle: "E-Mail-Protokoll",
      employeeLabel: "Mitarbeiter zuweisen",
      employeeRequiresWorkshop:
        "Bitte wählen Sie zuerst eine Werkstatt aus, bevor Sie einen Mitarbeiter zuweisen.",
      formErrorFallback:
        "Die Änderung konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
      internalNoteLabel: "Interne Notiz",
      internalNotePlaceholder:
        "Interne Notiz für Store, Werkstatt oder Produktion.",
      invalidSelection:
        "Die Auswahl ist ungültig. Bitte wählen Sie einen gültigen Eintrag.",
      itemsTitle: "Positionen",
      noChanges: "Es gibt noch keine Änderungen zum Speichern.",
      noEmailLogs: "Für diesen Auftrag wurden noch keine E-Mails protokolliert.",
      noSupportTickets: "Für diesen Auftrag liegen noch keine Supportanfragen vor.",
      noWorkshopAssigned: "Noch nicht zugewiesen",
      optionVisibilityEmpty: "Es wurden noch keine Produktoptionen angelegt.",
      optionVisibilityHelp:
        "Legen Sie fest, welche Optionen für dieses Produkt sichtbar und verpflichtend sind.",
      optionsLabel: countLabel,
      orderCreatedFallback:
        "Der Auftrag wurde erstellt und kann später zugewiesen werden.",
      orderCreatedSuccess: "Der Auftrag wurde erfolgreich erstellt.",
      productRequired: "Bitte wählen Sie ein Produkt aus.",
      quantityInvalid: "Bitte geben Sie eine gültige Menge ein.",
      requiredLabel: "Pflichtfeld",
      saveUpdate: "Update speichern",
      selectLanguage: "Sprache wählen",
      selectProduct: "Produkt wählen",
      selectStatus: "Status wählen",
      selectWorkshop: "Werkstatt wählen",
      statusEmailFallback:
        "Der Status wurde gespeichert. Die Kunden-E-Mail wurde nur protokolliert, bis SMTP vollständig eingerichtet ist.",
      statusEmailFailed:
        "Der Status wurde gespeichert, aber die Kunden-E-Mail konnte gerade nicht gesendet werden.",
      supportTicketsTitle: "Supportanfragen",
      technicalCreateFallback:
        "Der Auftrag konnte nicht erstellt werden. Bitte prüfen Sie die Angaben und versuchen Sie es erneut.",
      technicalUpdateFallback:
        "Die Aktualisierung konnte nicht gespeichert werden. Bitte prüfen Sie die Angaben und versuchen Sie es erneut.",
      workshopAssignmentHint:
        "Der Auftrag kann zuerst intern erfasst und später einer Werkstatt zugewiesen werden.",
      workshopLabel: "Werkstatt zuweisen",
      workshopRequired: "Bitte wählen Sie eine Werkstatt aus.",
    };
  }

  return {
    assignmentDescription:
      "Update workshop, assignee, status, and notes without exposing technical errors.",
    assignmentSaved: "Order update saved.",
    assignmentTitle: "Manage order",
    attachmentsLabel: "Attachments",
    createdEmailFallback:
      "Order created. The customer email was logged only because mail delivery is not fully configured yet.",
    createdEmailFailed:
      "Order created, but the customer email could not be delivered right now.",
    customerEmailInvalid: "Please enter a valid email address.",
    customerLanguage: "Customer language",
    customerNoteLabel: "Customer-facing note",
    customerNotePlaceholder:
      "Short note the customer is allowed to see in tracking.",
    emailLogTitle: "Email log",
    employeeLabel: "Assign employee",
    employeeRequiresWorkshop:
      "Please choose a workshop before assigning an employee.",
    formErrorFallback: "The change could not be saved. Please try again.",
    internalNoteLabel: "Internal note",
    internalNotePlaceholder:
      "Private note for the store, workshop, or production team.",
    invalidSelection:
      "The selected value is not valid. Please choose a valid entry.",
    itemsTitle: "Items",
    noChanges: "There are no changes to save yet.",
    noEmailLogs: "No notification emails have been logged for this order yet.",
    noSupportTickets: "No support tickets have been created for this order yet.",
    noWorkshopAssigned: "Not assigned yet",
    optionVisibilityEmpty: "No product options have been created yet.",
    optionVisibilityHelp:
      "Choose which options are visible for this product and which are required during order creation.",
    optionsLabel: countLabel,
    orderCreatedFallback: "Order created and ready for later assignment.",
    orderCreatedSuccess: "Order created successfully.",
    productRequired: "Please choose a product.",
    quantityInvalid: "Please enter a valid quantity.",
    requiredLabel: "Required",
    saveUpdate: "Save update",
    selectLanguage: "Select language",
    selectProduct: "Select a product",
    selectStatus: "Select status",
    selectWorkshop: "Select workshop",
    statusEmailFallback:
      "Status saved. The customer email was logged only because SMTP is not fully configured yet.",
    statusEmailFailed:
      "Status saved, but the customer email could not be delivered right now.",
    supportTicketsTitle: "Support tickets",
    technicalCreateFallback:
      "The order could not be created. Please review the information and try again.",
    technicalUpdateFallback:
      "The update could not be saved. Please review the information and try again.",
    workshopAssignmentHint:
      "Create the order first and assign the workshop or employee later.",
    workshopLabel: "Assign workshop",
    workshopRequired: "Please choose a workshop before saving the assignment.",
  };
}

export function getOrderWorkflowCopy(locale: AppLocale) {
  return baseCopy(locale);
}

export function normalizeOptionalUuid(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (
    trimmed.length === 0 ||
    trimmed === "-" ||
    trimmed.toLowerCase() === "null" ||
    trimmed.toLowerCase() === "undefined"
  ) {
    return null;
  }

  return UUID_PATTERN.test(trimmed) ? trimmed : null;
}

export function normalizeOptionalText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeOptionalDate(value: unknown) {
  const normalized = normalizeOptionalText(value);

  if (!normalized) {
    return "";
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : "";
}

export function shouldNotifyCustomerForStatus(status: TrackingStatus) {
  return importantCustomerStatuses.has(status);
}

export function getSafeActionErrorMessage(
  error: unknown,
  fallbackMessage: string
) {
  if (!(error instanceof Error)) {
    return fallbackMessage;
  }

  const message = error.message.trim();

  if (!message || TECHNICAL_ERROR_PATTERN.test(message)) {
    return fallbackMessage;
  }

  if (message.startsWith("Unable to ")) {
    return fallbackMessage;
  }

  return message;
}
