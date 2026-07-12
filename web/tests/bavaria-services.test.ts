import { describe, expect, it } from "vitest";
import { BAVARIA_BOUNDS, BAVARIA_SERVICES } from "@/lib/map/bavaria-services";

describe("Bavaria official map services", () => {
  it("uses bounded HTTPS raster services with attribution", () => {
    expect(BAVARIA_BOUNDS).toEqual([8.9451, 47.2484, 13.9089, 50.5799]);
    for (const service of Object.values(BAVARIA_SERVICES)) {
      expect(service.tiles[0]).toMatch(/^https:\/\//);
      expect(service.attribution.length).toBeGreaterThan(5);
      expect(service.minzoom).toBeGreaterThanOrEqual(5);
    }
  });
});
