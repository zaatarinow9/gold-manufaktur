import type { OrderAssignmentStatus } from "@/types/admin";

export function getAssignmentStatusMessageKey(status: OrderAssignmentStatus) {
  return `assignmentStatus.${status}` as const;
}

export function getAssignmentStatusVariant(status: OrderAssignmentStatus) {
  switch (status) {
    case "completed":
      return "success" as const;
    case "returned":
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
