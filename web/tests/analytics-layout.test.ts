import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Google Analytics layout integration", () => {
  const layout = readFileSync("app/layout.tsx", "utf8");

  it("loads the optimized GA4 component from a configurable measurement ID", () => {
    expect(layout).toContain('import { GoogleAnalytics } from "@next/third-parties/google"');
    expect(layout).toContain("process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID");
    expect(layout).toMatch(/measurementId\s*&&\s*<GoogleAnalytics\s+gaId=\{measurementId\}/);
  });

  it("describes the approved monthly refresh cadence", () => {
    expect(layout).toContain("monthly-refreshed");
    expect(layout).not.toContain("daily-refreshed");
  });
});
