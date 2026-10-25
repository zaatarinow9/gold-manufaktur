import type { OrderAssignmentStatus } from "@/types/admin";

/** States an employee can set on their own task, in workflow order. */
export const employeeTaskStatusValues = [
  "accepted",
  "in_progress",
  "problem",
  "completed",
  "shipped",
  "declined",
] as const satisfies readonly OrderAssignmentStatus[];

export type EmployeeTaskStatus = (typeof employeeTaskStatusValues)[number];

/** These need a short explanation from the employee. */
export const statusesNeedingNote: readonly OrderAssignmentStatus[] = ["declined", "problem"];

export function getAssignmentStatusMessageKey(status: OrderAssignmentStatus) {
  return `assignmentStatus.${status}` as const;
}

export function getAssignmentStatusVariant(status: OrderAssignmentStatus) {
  switch (status) {
    case "completed":
    case "shipped":
      return "success" as const;
    case "returned":
    case "declined":
    case "problem":
      return "danger" as const;
    case "waiting":
      return "warning" as const;
    case "accepted":
    case "in_progress":
      return "info" as const;
    default:
      return "gold" as const;
  }
}
