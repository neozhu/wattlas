import type { StyleSpecification } from "maplibre-gl";

export const baseMapStyle: StyleSpecification = {
  version: 8,
  name: "Wattlas light physical geography",
  sources: {
    "physical-geography": {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
      maxzoom: 19,
    },
  },
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#EAF1F4" } },
    {
      id: "physical-geography",
      type: "raster",
      source: "physical-geography",
      paint: {
        "raster-opacity": 0.78,
        "raster-saturation": -0.2,
        "raster-contrast": -0.08,
        "raster-brightness-min": 0.12,
        "raster-brightness-max": 0.98,
      },
    },
  ],
};
