import { describe, expect, it } from "vitest";

import {
  availableFacts,
  driverBarGeometry,
  fact,
  inspectorTabs,
  isUnavailableValue,
  peakMaxPoints,
  unavailableCount,
} from "@/lib/inspector/inspector-view";
import type { ScoreContribution } from "@/lib/snapshot/types";

const contribution = (overrides: Partial<ScoreContribution>): ScoreContribution => ({
  id: "c", label: "Driver", rawValue: 1, unit: "index", points: 10, maxPoints: 20,
  valueKind: "estimated", sourceIds: [], normalization: "linear", methodVersion: "v1", ...overrides,
});

describe("inspectorTabs", () => {
  it("always offers Overview", () => {
    expect(inspectorTabs({ hasDrivers: false, hasEnergy: false, hasFacilities: false })).toEqual(["overview"]);
  });

  it("adds data-backed tabs in a stable order", () => {
    expect(inspectorTabs({ hasDrivers: true, hasEnergy: true, hasFacilities: true })).toEqual([
      "overview", "drivers", "energy", "facilities",
    ]);
  });

  it("omits tabs that have no content", () => {
    expect(inspectorTabs({ hasDrivers: false, hasEnergy: true, hasFacilities: false })).toEqual(["overview", "energy"]);
  });
});

describe("driverBarGeometry", () => {
  it("makes a heavier driver's track longer than a lighter one", () => {
    const heavy = driverBarGeometry(30, 60, 60);
    const light = driverBarGeometry(15, 15, 60);
    expect(heavy.track).toBeGreaterThan(light.track);
    expect(heavy.track).toBe(100);
    expect(light.track).toBe(25);
  });

  it("fills proportional to points earned within the weighted track", () => {
    expect(driverBarGeometry(30, 60, 60).fill).toBe(50);
    expect(driverBarGeometry(60, 60, 60).fill).toBe(100);
  });

  it("treats a null (unscored) driver as an empty fill but keeps its track", () => {
    const geometry = driverBarGeometry(null, 25, 50);
    expect(geometry.track).toBe(50);
    expect(geometry.fill).toBe(0);
  });

  it("is safe for degenerate weights", () => {
    expect(driverBarGeometry(10, 0, 60)).toEqual({ track: 0, fill: 0 });
    expect(driverBarGeometry(10, 20, 0)).toEqual({ track: 0, fill: 0 });
  });
});

describe("peakMaxPoints", () => {
  it("returns the largest weight in the set", () => {
    expect(peakMaxPoints([contribution({ maxPoints: 15 }), contribution({ maxPoints: 60 }), contribution({ maxPoints: 25 })])).toBe(60);
  });
});

describe("unavailable facts", () => {
  it("recognises the project's unavailable phrasings", () => {
    expect(isUnavailableValue("Operator unavailable")).toBe(true);
    expect(isUnavailableValue("Not publicly available")).toBe(true);
    expect(isUnavailableValue("—")).toBe(true);
    expect(isUnavailableValue("Equinix")).toBe(false);
  });

  it("keeps only populated facts and counts the rest", () => {
    const facts = [fact("Operator", "Equinix"), fact("Owner", "Owner unavailable"), fact("Ref", "AB12")];
    expect(availableFacts(facts).map((item) => item.label)).toEqual(["Operator", "Ref"]);
    expect(unavailableCount(facts)).toBe(1);
  });
});
