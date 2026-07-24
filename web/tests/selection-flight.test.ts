import { describe, expect, it } from "vitest";

import { geometryBounds, planSelectionFlight } from "@/lib/map/selection-flight";

describe("planSelectionFlight", () => {
  it("uses one continuous curved flight for a distant selection", () => {
    const stages = planSelectionFlight({
      currentCenter: [13.405, 52.52],
      currentZoom: 6,
      target: { coordinates: [77.209, 28.6139], zoom: 7 },
      reducedMotion: false,
    });

    expect(stages).toEqual([{
      kind: "flight",
      target: { coordinates: [77.209, 28.6139], zoom: 7 },
      duration: 2800,
      minZoom: 2.4,
    }]);
  });

  it("uses a shorter direct move for a nearby selection", () => {
    const stages = planSelectionFlight({
      currentCenter: [77.2, 28.6],
      currentZoom: 5,
      target: { coordinates: [78.1, 27.2], zoom: 7 },
      reducedMotion: false,
    });

    expect(stages).toEqual([{ kind: "camera", center: [78.1, 27.2], zoom: 7, duration: 1400 }]);
  });

  it("uses one brief direct stage when reduced motion is preferred", () => {
    const stages = planSelectionFlight({
      currentCenter: [77.2, 28.6],
      currentZoom: 6,
      target: { bbox: [-80, 25, -66, 47], maxZoom: 7 },
      reducedMotion: true,
    });

    expect(stages).toEqual([{ kind: "bounds", bbox: [-80, 25, -66, 47], maxZoom: 7, padding: 72, duration: 150 }]);
  });

  it("derives bounds from polygon and multipolygon geometry", () => {
    expect(geometryBounds({
      type: "MultiPolygon",
      coordinates: [
        [[[70, 10], [80, 10], [80, 20], [70, 10]]],
        [[[85, 15], [90, 15], [90, 25], [85, 15]]],
      ],
    })).toEqual([70, 10, 90, 25]);
    expect(geometryBounds({ type: "Polygon", coordinates: [] })).toBeNull();
  });
});
