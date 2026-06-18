export type AdminRole = "super_admin" | "admin" | "employee";

export type OptionType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "multi_select"
  | "boolean"
  | "date"
  | "image"
  | "file";

export type OptionGroupKey =
  | "gold_details"
  | "measurements"
  | "name_personalization"
  | "stones"
  | "workshop_notes";

export type OrderPriority = "normal" | "urgent" | "express";

export const workshopOrderStatusValues = [
  "draft",
  "sent_to_workshop",
  "accepted",
  "assigned",
  "in_production",
  "quality_check",
  "ready",
  "delivered",
  "cancelled",
  "archived",
] as const;

export type WorkshopOrderStatus =
  (typeof workshopOrderStatusValues)[number];

export const trackingStatusValues = [
  "created",
  "sent_to_workshop",
  "accepted_by_workshop",
  "in_production",
  "quality_check",
  "ready_for_pickup",
  "on_the_way",
  "delivered_to_store",
  "picked_up",
  "completed",
  "cancelled",
] as const;

export type TrackingStatus = (typeof trackingStatusValues)[number];

export const publicTrackingStageValues = [
  "order_in_workshop",
  "shipping",
  "ready_for_pickup",
] as const;

export type PublicTrackingStage =
  (typeof publicTrackingStageValues)[number];

export type AttendanceStatus =
  | "present"
  | "absent"
  | "vacation"
  | "sick"
  | "late";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: AdminRole;
  workshopId?: string;
  linkedEmployeeId?: string;
  avatarLabel: string;
  isActive: boolean;
};

export type Workshop = {
  id: string;
  name: string;
  code: string;
  location: string;
  phone: string;
  email: string;
  isActive: boolean;
  assignedAdminIds: string[];
  assignedEmployeeIds: string[];
  orderLoad: number;
  activeOrders: number;
  completedThisMonth: number;
  onTimeRate: number;
};

export type Employee = {
  id: string;
  name: string;
  role: Exclude<AdminRole, "super_admin">;
  workshopId: string;
  phone: string;
  email: string;
  isActive: boolean;
  assignedOrderIds: string[];
  status: AttendanceStatus;
  shiftLabel: string;
};

export type AttendanceRecord = {
  id: string;
  employeeId: string;
  date: string;
  status: AttendanceStatus;
  shift: string;
  startTime?: string;
  endTime?: string;
  note?: string;
  approvedById?: string;
};

export type OptionValue = {
  label: string;
  value: string;
};

export type ProductOption = {
  id: string;
  key: string;
  label: string;
  description?: string;
  type: OptionType;
  groupKey: OptionGroupKey;
  values: OptionValue[];
  isRequired: boolean;
  isActive: boolean;
  appliesToCategories: string[];
  appliesToProducts: string[];
  createdByRole: AdminRole;
  sortOrder: number;
};

export type OptionGroup = {
  id: string;
  key: OptionGroupKey;
  label: string;
  description: string;
  sortOrder: number;
};

export type ProductOptionAssignment = {
  id: string;
  optionId: string;
  productIds: string[];
  categorySlugs: string[];
  requiredForProductIds: string[];
  disabledForProductIds: string[];
};

export type WorkshopOptionOverride = {
  id: string;
  workshopId: string;
  optionId: string;
  isEnabled: boolean;
  isRequired: boolean;
  allowedRoles: Exclude<AdminRole, "super_admin">[];
};

export type AdminProduct = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  categorySlug: string;
  categoryName: string;
  imageUrl: string;
  gallery: string[];
  shortDescription: string;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  assignedOptions: string[];
};

export type AdminCategory = {
  id: string;
  slug: string;
  name: string;
  accent: string;
  shortDescription: string;
  imageUrl: string;
  isActive: boolean;
  sortOrder: number;
  assignedOptions: string[];
  productCount: number;
};

export type SelectedOptionValue = string | number | boolean | string[] | null;

export type WorkshopOrderSelectedOption = {
  optionId: string;
  key: string;
  label: string;
  value: SelectedOptionValue;
  groupKey: OptionGroupKey;
};

export type WorkshopOrderItem = {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  categorySlug: string;
  categoryName: string;
  quantity: number;
  referenceImages: string[];
  selectedOptions: WorkshopOrderSelectedOption[];
};

export type GoldDetails = {
  goldKarat: string;
  goldColor: string;
  estimatedWeight: string;
  targetWeight: string;
  weightTolerance: string;
  finishType: string;
};

export type Measurements = {
  ringSize: string;
  braceletSize: string;
  chainLength: string;
  pendantSize: string;
  width: string;
  height: string;
  length: string;
  customMeasurements: string;
};

export type NamePersonalization = {
  hasNameCustomization: boolean;
  nameText: string;
  nameLanguage: string;
  fontStyle: string;
  namePlacement: string;
  engravingText: string;
  engravingPlacement: string;
  engravingNotes: string;
  previewRequired: boolean;
};

export type StoneDetails = {
  hasStones: boolean;
  stoneType: string;
  stoneColor: string;
  stoneShape: string;
  stoneSize: string;
  stoneQuantity: string;
  stoneSetting: string;
  stoneNotes: string;
};

export type OrderNotes = {
  workshopNotes: string;
  customerNotes: string;
  adminNotes: string;
  specialInstructions: string;
  qualityRequirements: string;
  packagingNotes: string;
  deliveryNotes: string;
  attachmentNotes: string;
};

export type OrderTrackingEvent = {
  id: string;
  status: TrackingStatus;
  title: string;
  description: string;
  createdAt: string;
  createdBy: string;
  notifyCustomer: boolean;
};

export type WorkshopOrder = {
  id: string;
  internalOrderNumber: string;
  trackingNumber: string;
  items: WorkshopOrderItem[];
  priority: OrderPriority;
  dueDate: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerReference?: string;
  emailUpdatesEnabled: boolean;
  workshopId: string;
  workshopName: string;
  assignedAdminId?: string;
  assignedEmployeeId?: string;
  status: WorkshopOrderStatus;
  trackingStatus: TrackingStatus;
  trackingEvents: OrderTrackingEvent[];
  createdAt: string;
  updatedAt: string;
  goldDetails: GoldDetails;
  measurements: Measurements;
  personalization: NamePersonalization;
  stones: StoneDetails;
  notes: OrderNotes;
  attachments: string[];
  isArchived: boolean;
};

export type ReportSummary = {
  ordersByStatus: Array<{
    status: WorkshopOrderStatus;
    total: number;
  }>;
  ordersByWorkshop: Array<{
    workshopId: string;
    workshopName: string;
    total: number;
  }>;
  ordersByEmployee: Array<{
    employeeId: string;
    employeeName: string;
    total: number;
  }>;
  productionTimeAverageDays: number;
  readyOrders: number;
  deliveredOrders: number;
  categoryPerformance: Array<{
    categorySlug: string;
    categoryName: string;
    total: number;
  }>;
  optionUsage: Array<{
    optionId: string;
    optionLabel: string;
    total: number;
  }>;
  workload: Array<{
    employeeId: string;
    employeeName: string;
    activeOrders: number;
    completionRate: number;
  }>;
};
