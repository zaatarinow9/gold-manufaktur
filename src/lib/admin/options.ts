import {
  globalOptions,
  optionGroups,
  productOptionAssignments,
  workshopOptionOverrides,
} from "@/data/adminMock";
import type {
  AdminRole,
  OptionGroup,
  ProductOption,
  WorkshopOptionOverride,
} from "@/types/admin";

const optionLabelTranslationKeys: Record<string, string> = {
  gold_karat: "newOrder.fields.goldKarat",
  gold_color: "newOrder.fields.goldColor",
  ring_size: "newOrder.fields.ringSize",
  bracelet_size: "newOrder.fields.braceletSize",
  chain_length: "newOrder.fields.chainLength",
  name_text: "newOrder.fields.nameText",
  engraving_text: "newOrder.fields.engravingText",
  stone_type: "newOrder.fields.stoneType",
  stone_color: "newOrder.fields.stoneColor",
  finish_type: "newOrder.fields.surface",
  estimated_weight: "newOrder.fields.estimatedWeight",
  priority: "newOrder.fields.priority",
  due_date: "newOrder.fields.dueDate",
  workshop_notes: "newOrder.fields.workshopNotes",
};

const optionGroupTranslationKeys: Record<OptionGroup["key"], string> = {
  gold_details: "newOrder.sections.gold",
  measurements: "newOrder.sections.measurements",
  name_personalization: "newOrder.sections.personalization",
  stones: "newOrder.sections.stones",
  workshop_notes: "newOrder.sections.workshop",
};

const optionValueTranslationKeys: Record<string, Record<string, string>> = {
  finish_type: {
    brushed: "newOrder.values.brushed",
    matte: "newOrder.values.matte",
    polished: "newOrder.values.polished",
  },
  gold_color: {
    rose_gold: "newOrder.values.roseGold",
    white_gold: "newOrder.values.whiteGold",
    yellow_gold: "newOrder.values.yellowGold",
  },
  priority: {
    express: "priority.express",
    normal: "priority.normal",
    urgent: "priority.urgent",
  },
};

function getAssignmentMeta(optionId: string, productId: string) {
  const assignment = productOptionAssignments.find((item) => item.optionId === optionId);

  if (!assignment) {
    return {
      isDisabled: false,
      isRequired: false,
      isDirectlyAssigned: false,
    };
  }

  return {
    isDisabled: assignment.disabledForProductIds.includes(productId),
    isRequired: assignment.requiredForProductIds.includes(productId),
    isDirectlyAssigned: assignment.productIds.includes(productId),
  };
}

export function getWorkshopOptionOverrides(workshopId?: string) {
  if (!workshopId) {
    return [];
  }

  return workshopOptionOverrides.filter((override) => override.workshopId === workshopId);
}

export function getApplicableOptions(
  productId: string,
  categorySlug: string,
  workshopId?: string,
  role?: AdminRole
) {
  const overrides = getWorkshopOptionOverrides(workshopId);

  return globalOptions
    .filter((option) => {
      const appliesByCategory =
        option.appliesToCategories.length === 0 ||
        option.appliesToCategories.includes(categorySlug);
      const appliesByProduct =
        option.appliesToProducts.length === 0 ||
        option.appliesToProducts.includes(productId);
      const assignment = productOptionAssignments.some(
        (item) =>
          item.optionId === option.id &&
          (item.productIds.includes(productId) || item.categorySlugs.includes(categorySlug))
      );

      if (!option.isActive) {
        return false;
      }

      if (!(appliesByCategory || appliesByProduct || assignment)) {
        return false;
      }

      const override = overrides.find((item) => item.optionId === option.id);

      if (override && !override.isEnabled) {
        return false;
      }

      if (
        override &&
        role &&
        !override.allowedRoles.includes(role as "admin" | "employee")
      ) {
        return false;
      }

      return true;
    })
    .map((option) => {
      const assignmentMeta = getAssignmentMeta(option.id, productId);
      const override = overrides.find((item) => item.optionId === option.id);

      return {
        ...option,
        isRequired:
          assignmentMeta.isRequired || override?.isRequired || option.isRequired,
      };
    })
    .filter((option) => !getAssignmentMeta(option.id, productId).isDisabled)
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

export function getGroupedApplicableOptions(
  productId: string,
  categorySlug: string,
  workshopId?: string,
  role?: AdminRole
) {
  const options = getApplicableOptions(productId, categorySlug, workshopId, role);

  return optionGroups
    .map((group) => ({
      ...group,
      options: options.filter((option) => option.groupKey === group.key),
    }))
    .filter((group) => group.options.length > 0)
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

export function getOptionGroupByKey(key: OptionGroup["key"]) {
  return optionGroups.find((group) => group.key === key);
}

export function getProductAssignments(optionId: string) {
  return productOptionAssignments.find((assignment) => assignment.optionId === optionId);
}

export function getEnabledWorkshopOverrides(optionId: string) {
  return workshopOptionOverrides.filter(
    (override) => override.optionId === optionId && override.isEnabled
  );
}

export function getOptionLabelTranslationKey(optionKey: string) {
  return optionLabelTranslationKeys[optionKey];
}

export function getOptionGroupTranslationKey(groupKey: OptionGroup["key"]) {
  return optionGroupTranslationKeys[groupKey];
}

export function getOptionValueTranslationKey(optionKey: string, value: string) {
  return optionValueTranslationKeys[optionKey]?.[value];
}

export function getOptionValueLabel(
  option: ProductOption,
  value: string | number | boolean | string[] | null
) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  const found = option.values.find((entry) => entry.value === String(value));
  return found?.label ?? String(value ?? "");
}

export function countOverridesForOption(
  optionId: string,
  overrides: WorkshopOptionOverride[] = workshopOptionOverrides
) {
  return overrides.filter((override) => override.optionId === optionId).length;
}
