import { describe, expect, it } from "vitest";

import {
  ALL_GENERATOR_CAPACITIES,
  capacityRangeLabel,
  capacityToSliderPosition,
  generatorMatchesCapacity,
  normalizeCapacityRange,
  sliderPositionToCapacity,
} from "@/lib/map/generator-capacity";

describe("generator capacity ranges", () => {
  it("keeps every published plant in the default range", () => {
    expect(generatorMatchesCapacity(0, ALL_GENERATOR_CAPACITIES)).toBe(true);
    expect(generatorMatchesCapacity(10, ALL_GENERATOR_CAPACITIES)).toBe(true);
    expect(generatorMatchesCapacity(22_500, ALL_GENERATOR_CAPACITIES)).toBe(true);
  });

  it("uses inclusive minimum and maximum boundaries", () => {
    const range = { minMw: 10, maxMw: 250 };
    expect(generatorMatchesCapacity(9.99, range)).toBe(false);
    expect(generatorMatchesCapacity(10, range)).toBe(true);
    expect(generatorMatchesCapacity(250, range)).toBe(true);
    expect(generatorMatchesCapacity(250.01, range)).toBe(false);
  });

  it("excludes zero-capacity records whenever the minimum is positive", () => {
    expect(generatorMatchesCapacity(0, { minMw: 10, maxMw: null })).toBe(false);
    expect(generatorMatchesCapacity(0, { minMw: 0, maxMw: 100 })).toBe(true);
  });

  it("normalizes unsafe external values into a valid committed range", () => {
    expect(normalizeCapacityRange({ minMw: -20, maxMw: 50 })).toEqual({ minMw: 0, maxMw: 50 });
    expect(normalizeCapacityRange({ minMw: 100, maxMw: 50 })).toEqual({ minMw: 100, maxMw: 100 });
    expect(normalizeCapacityRange({ minMw: Number.NaN, maxMw: Number.POSITIVE_INFINITY })).toEqual(ALL_GENERATOR_CAPACITIES);
  });

  it("formats all, lower-bound, upper-bound, and finite ranges", () => {
    expect(capacityRangeLabel({ minMw: 0, maxMw: null })).toBe("All capacities");
    expect(capacityRangeLabel({ minMw: 10, maxMw: null })).toBe("10 MW+");
    expect(capacityRangeLabel({ minMw: 0, maxMw: 250 })).toBe("Up to 250 MW");
    expect(capacityRangeLabel({ minMw: 10, maxMw: 250 })).toBe("10–250 MW");
    expect(capacityRangeLabel({ minMw: 1000, maxMw: null })).toBe("1 GW+");
  });

  it("maps the logarithmic slider across small and multi-gigawatt values", () => {
    const scaleMaximum = 25_000;
    expect(capacityToSliderPosition(0, scaleMaximum)).toBe(0);
    expect(capacityToSliderPosition(scaleMaximum, scaleMaximum)).toBe(1000);
    for (const value of [10, 25, 100, 500, 1000, 10_000]) {
      const position = capacityToSliderPosition(value, scaleMaximum);
      expect(sliderPositionToCapacity(position, scaleMaximum)).toBeCloseTo(value, -1);
    }
  });
});
