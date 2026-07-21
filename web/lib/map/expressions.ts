import type { ExpressionSpecification } from "maplibre-gl";

import type { AssetCategory, LensKey } from "@/lib/snapshot/types";

const ramps: Record<LensKey, Array<[number, string]>> = {
  infrastructureDemand: [
    [0, "#D8E9E4"],
    [45, "#9DCCBE"],
    [65, "#F3D69A"],
    [80, "#E7A84A"],
  ],
  siteAttractiveness: [
    [0, "#E1EEE9"],
    [45, "#A7D5C9"],
    [65, "#6FC2AD"],
    [80, "#2FAF8D"],
  ],
  systemRisk: [
    [0, "#E7EBEA"],
    [45, "#EDC4B9"],
    [65, "#E78E7B"],
    [80, "#D65345"],
  ],
  powerBalance: [
    [0, "#8ECDBB"],
    [35, "#CFD8D5"],
    [55, "#F1CE88"],
    [75, "#D95C4F"],
  ],
};

export function scoreColor(score: number | null, lens: LensKey): string {
  if (score === null) return "#DDE5E2";
  const ramp = ramps[lens];
  return [...ramp].reverse().find(([threshold]) => score >= threshold)?.[1] ?? ramp[0][1];
}

export function mapColorExpression(lens: LensKey): ExpressionSpecification {
  const ramp = ramps[lens];
  return [
    "case",
    ["==", ["get", "activeScore"], null],
    "#DDE5E2",
    [
      "interpolate",
      ["linear"],
      ["to-number", ["get", "activeScore"]],
      ...ramp.flat(),
    ],
  ] as ExpressionSpecification;
}

export function countryBorderWidthExpression(selectedId: string | null): ExpressionSpecification {
  return [
    "case",
    ["==", ["get", "id"], selectedId ?? ""],
    3.2,
    1.6,
  ] as ExpressionSpecification;
}

export function admin1LineWidthExpression(): ExpressionSpecification {
  return ["interpolate", ["linear"], ["zoom"], 1, 0.35, 3, 0.8, 6, 1.25] as ExpressionSpecification;
}

export function admin1LineOpacityExpression(): ExpressionSpecification {
  return ["interpolate", ["linear"], ["zoom"], 1, 0.28, 3, 0.65, 6, 0.9] as ExpressionSpecification;
}

export function assetColor(category: AssetCategory): string {
  if (category === "data_centre") return "#2F80ED";
  if (category === "water_infrastructure") return "#23A6D5";
  if (category === "industrial_load") return "#E58A2B";
  if (category === "hydrogen_infrastructure") return "#8B5CF6";
  return "#6B7280";
}

export function assetStrokeColorExpression(): ExpressionSpecification {
  return [
    "case",
    ["==", ["get", "sourceType"], "official_verified"],
    "#F1F6F4",
    "#07100F",
  ] as ExpressionSpecification;
}
