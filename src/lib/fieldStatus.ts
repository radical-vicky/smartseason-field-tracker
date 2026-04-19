// Time-based field status logic.
// Status is computed from the current stage and how long the field has been in it.
//
// - Completed: stage = harvested
// - At Risk:   field has stayed in its stage longer than the threshold
// - Active:    everything else
//
// Thresholds (in days) per stage. Tweak as needed for the season profile.
export const STAGE_THRESHOLD_DAYS: Record<string, number> = {
  planted: 14,
  growing: 60,
  ready: 7,
  harvested: Infinity,
};

export type FieldStage = "planted" | "growing" | "ready" | "harvested";
export type FieldStatus = "active" | "at_risk" | "completed";

export function daysBetween(from: string | Date, to: Date = new Date()): number {
  const a = typeof from === "string" ? new Date(from) : from;
  const ms = to.getTime() - a.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function computeFieldStatus(stage: FieldStage, stageChangedAt: string | Date): FieldStatus {
  if (stage === "harvested") return "completed";
  const days = daysBetween(stageChangedAt);
  const threshold = STAGE_THRESHOLD_DAYS[stage] ?? Infinity;
  if (days > threshold) return "at_risk";
  return "active";
}

export const STAGE_LABEL: Record<FieldStage, string> = {
  planted: "Planted",
  growing: "Growing",
  ready: "Ready",
  harvested: "Harvested",
};

export const STATUS_LABEL: Record<FieldStatus, string> = {
  active: "Active",
  at_risk: "At Risk",
  completed: "Completed",
};
