import type { ScoreContribution } from "@/lib/snapshot/types";

export type InspectorTabKey = "overview" | "drivers" | "energy" | "facilities";

export type InspectorTabInput = {
  hasDrivers: boolean;
  hasEnergy: boolean;
  hasFacilities: boolean;
};

const TAB_LABELS: Record<InspectorTabKey, string> = {
  overview: "Overview",
  drivers: "Drivers",
  energy: "Energy",
  facilities: "Facilities",
};

export function inspectorTabLabel(key: InspectorTabKey): string {
  return TAB_LABELS[key];
}

/**
 * The Overview tab is always present. Data-dependent tabs only appear when there
 * is something to show, so the panel never offers an empty section to click into.
 */
export function inspectorTabs(input: InspectorTabInput): InspectorTabKey[] {
  const tabs: InspectorTabKey[] = ["overview"];
  if (input.hasDrivers) tabs.push("drivers");
  if (input.hasEnergy) tabs.push("energy");
  if (input.hasFacilities) tabs.push("facilities");
  return tabs;
}

export type DriverBarGeometry = {
  /** Width of the weight track as a % of the panel, proportional to maxPoints. */
  track: number;
  /** Width of the earned fill as a % of the panel. */
  fill: number;
};

/**
 * A driver worth 60 max points should render a longer track than one worth 15,
 * so the score arithmetic is visible at a glance. Track length is proportional
 * to the driver's weight relative to the heaviest driver in the set; the fill is
 * the share of that weight actually earned.
 */
export function driverBarGeometry(points: number | null, maxPoints: number, peakMaxPoints: number): DriverBarGeometry {
  if (maxPoints <= 0 || peakMaxPoints <= 0) return { track: 0, fill: 0 };
  const track = Math.min(100, (maxPoints / peakMaxPoints) * 100);
  const earned = points == null ? 0 : Math.max(0, Math.min(points, maxPoints));
  const fill = (earned / maxPoints) * track;
  return { track, fill };
}

export function peakMaxPoints(contributions: ScoreContribution[]): number {
  return contributions.reduce((peak, item) => Math.max(peak, item.maxPoints), 0);
}

export type FacilityFact = { label: string; value: string; available: boolean };

const UNAVAILABLE_PATTERN = /(unavailable|not publicly available|^—$)/i;

export function isUnavailableValue(value: string): boolean {
  return UNAVAILABLE_PATTERN.test(value.trim());
}

export function fact(label: string, value: string): FacilityFact {
  return { label, value, available: !isUnavailableValue(value) };
}

/**
 * Collapses a group of facts down to only those with real values. When every
 * field is empty the caller can show a single summary line instead of a wall of
 * "unavailable" rows.
 */
export function availableFacts(facts: FacilityFact[]): FacilityFact[] {
  return facts.filter((item) => item.available);
}

export function unavailableCount(facts: FacilityFact[]): number {
  return facts.filter((item) => !item.available).length;
}
