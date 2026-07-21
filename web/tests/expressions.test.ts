import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import {
  assetColor,
  assetStrokeColorExpression,
  countryBorderWidthExpression,
  mapColorExpression,
  admin1LineOpacityExpression,
  admin1LineWidthExpression,
  scoreColor,
} from "@/lib/map/expressions";

describe("scoreColor", () => {
  it("keeps unavailable regions neutral", () => {
    expect(scoreColor(null, "infrastructureDemand")).toBe("#DDE5E2");
  });

  it("uses one light-green to yellow to red intensity scale across score lenses", () => {
    for (const lens of ["infrastructureDemand", "siteAttractiveness", "systemRisk"] as const) {
      expect(scoreColor(0, lens)).toBe("#D7EBCB");
      expect(scoreColor(65, lens)).toBe("#F0D36F");
      expect(scoreColor(85, lens)).toBe("#D95C4F");
    }
  });
});

describe("global map expressions", () => {
  it("reveals ADM1 boundaries progressively from the initial world zoom", () => {
    expect(admin1LineWidthExpression()).toEqual(["interpolate", ["linear"], ["zoom"], 1, 0.35, 3, 0.8, 6, 1.25]);
    expect(admin1LineOpacityExpression()).toEqual(["interpolate", ["linear"], ["zoom"], 1, 0.28, 3, 0.65, 6, 0.9]);
  });

  it("uses an explicit unavailable branch and diverging Power Balance palette", () => {
    expect(mapColorExpression("powerBalance")).toEqual([
      "case",
      ["==", ["get", "activeScore"], null],
      "#DDE5E2",
      ["interpolate", ["linear"], ["to-number", ["get", "activeScore"]], 0, "#8ECDBB", 35, "#CFD8D5", 55, "#F1CE88", 75, "#D95C4F"],
    ]);
  });

  it("keeps the Power Balance legend gradient consistent with the map ramp", () => {
    const css = readFileSync(`${process.cwd()}/app/globals.css`, "utf8");
    expect(css).toContain("linear-gradient(90deg, #4d8879, #71817d, #a4864e, #d66f5f)");
  });

  it("uses the shared green-yellow-red score ramp in every generic score legend", () => {
    const css = readFileSync(`${process.cwd()}/app/globals.css`, "utf8");
    expect(css.match(/linear-gradient\(90deg, #d7ebcb, #a9d39d, #f0d36f, #d95c4f\)/g)).toHaveLength(3);
  });

  it("keeps national borders stronger than regional boundaries", () => {
    expect(countryBorderWidthExpression("AE")).toEqual([
      "case",
      ["==", ["get", "id"], "AE"],
      3.2,
      1.6,
    ]);
  });

  it("assigns distinct infrastructure colors", () => {
    expect(assetColor("data_centre")).toBe("#2F80ED");
    expect(assetColor("water_infrastructure")).toBe("#23A6D5");
    expect(assetColor("industrial_load")).toBe("#E58A2B");
    expect(assetColor("hydrogen_infrastructure")).toBe("#8B5CF6");
  });

  it("distinguishes officially verified facilities", () => {
    const expression = JSON.stringify(assetStrokeColorExpression());
    expect(expression).toContain("official_verified");
    expect(expression).toContain("#F1F6F4");
  });
});
