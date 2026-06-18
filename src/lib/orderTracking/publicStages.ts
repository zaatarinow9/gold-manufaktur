import type { PublicTrackingStage, TrackingStatus } from "@/types/admin";
import { publicTrackingStageValues } from "@/types/admin";

const publicTrackingStageSet = new Set<PublicTrackingStage>(publicTrackingStageValues);

const statusToPublicStageMap: Partial<Record<TrackingStatus, PublicTrackingStage>> = {
  sent_to_workshop: "order_in_workshop",
  accepted_by_workshop: "order_in_workshop",
  in_production: "order_in_workshop",
  quality_check: "order_in_workshop",
  on_the_way: "shipping",
  delivered_to_store: "shipping",
  ready_for_pickup: "ready_for_pickup",
  picked_up: "ready_for_pickup",
  completed: "ready_for_pickup",
};

const publicStageToStatusMap: Record<PublicTrackingStage, TrackingStatus> = {
  order_in_workshop: "in_production",
  shipping: "on_the_way",
  ready_for_pickup: "ready_for_pickup",
};

export function normalizePublicTrackingStage(
  value?: string | null
): PublicTrackingStage | null {
  if (!value) {
    return null;
  }

  return publicTrackingStageSet.has(value as PublicTrackingStage)
    ? (value as PublicTrackingStage)
    : null;
}

export function getPublicTrackingStageFromStatus(
  status: TrackingStatus
): PublicTrackingStage | null {
  return statusToPublicStageMap[status] ?? null;
}

export function getCanonicalTrackingStatusForPublicStage(
  stage: PublicTrackingStage
): TrackingStatus {
  return publicStageToStatusMap[stage];
}

export function resolvePublicTrackingStage(input: {
  publicTrackingStage?: string | null;
  trackingStatus: TrackingStatus;
}) {
  return (
    normalizePublicTrackingStage(input.publicTrackingStage) ??
    getPublicTrackingStageFromStatus(input.trackingStatus)
  );
}

export function getPublicTrackingStageIndex(stage: PublicTrackingStage | null) {
  if (!stage) {
    return -1;
  }

  return publicTrackingStageValues.indexOf(stage);
}
