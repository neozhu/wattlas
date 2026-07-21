export type GeneratorCapacityRange = {
  minMw: number;
  maxMw: number | null;
};

export const ALL_GENERATOR_CAPACITIES: GeneratorCapacityRange = Object.freeze({ minMw: 0, maxMw: null });
export const GENERATOR_CAPACITY_PRESETS_MW = [0, 10, 25, 50, 100, 250, 500, 1000] as const;
export const GENERATOR_CAPACITY_SLIDER_STEPS = 1000;

const finiteNonNegative = (value: number): number | null => Number.isFinite(value) ? Math.max(0, value) : null;

export function normalizeCapacityRange(range: GeneratorCapacityRange): GeneratorCapacityRange {
  const minMw = finiteNonNegative(range.minMw) ?? 0;
  const candidateMaximum = range.maxMw == null ? null : finiteNonNegative(range.maxMw);
  const maxMw = candidateMaximum == null ? null : Math.max(minMw, candidateMaximum);
  return { minMw, maxMw };
}

export function isAllGeneratorCapacities(range: GeneratorCapacityRange): boolean {
  return range.minMw === 0 && range.maxMw == null;
}

export function generatorMatchesCapacity(capacityMw: number, range: GeneratorCapacityRange): boolean {
  if (!Number.isFinite(capacityMw) || capacityMw < range.minMw) return false;
  return range.maxMw == null || capacityMw <= range.maxMw;
}

export function formatGeneratorCapacity(capacityMw: number): string {
  if (capacityMw >= 1000) {
    const gigawatts = capacityMw / 1000;
    return `${new Intl.NumberFormat("en", { maximumFractionDigits: gigawatts < 10 ? 2 : 1 }).format(gigawatts)} GW`;
  }
  return `${new Intl.NumberFormat("en", { maximumFractionDigits: capacityMw < 10 ? 1 : 0 }).format(capacityMw)} MW`;
}

export function capacityRangeLabel(range: GeneratorCapacityRange): string {
  if (isAllGeneratorCapacities(range)) return "All capacities";
  if (range.maxMw == null) return `${formatGeneratorCapacity(range.minMw)}+`;
  if (range.minMw === 0) return `Up to ${formatGeneratorCapacity(range.maxMw)}`;
  return `${formatGeneratorCapacity(range.minMw).replace(/ MW$| GW$/, "")}–${formatGeneratorCapacity(range.maxMw)}`;
}

export function capacityToSliderPosition(capacityMw: number, scaleMaximumMw: number): number {
  const maximum = Math.max(1, scaleMaximumMw);
  const value = Math.min(maximum, Math.max(0, capacityMw));
  return Math.log1p(value) / Math.log1p(maximum) * GENERATOR_CAPACITY_SLIDER_STEPS;
}

export function sliderPositionToCapacity(position: number, scaleMaximumMw: number): number {
  const maximum = Math.max(1, scaleMaximumMw);
  const normalized = Math.min(GENERATOR_CAPACITY_SLIDER_STEPS, Math.max(0, position)) / GENERATOR_CAPACITY_SLIDER_STEPS;
  return Math.round(Math.expm1(normalized * Math.log1p(maximum)) * 10) / 10;
}
