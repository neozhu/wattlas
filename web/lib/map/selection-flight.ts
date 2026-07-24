export type MapCoordinates = [number, number];
export type MapBounds = [number, number, number, number];

export type SelectionTarget =
  | { coordinates: MapCoordinates; zoom?: number }
  | { bbox: MapBounds; maxZoom?: number };

export type SelectionFlightStage =
  | { kind: "camera"; center: MapCoordinates; zoom: number; duration: number }
  | { kind: "bounds"; bbox: MapBounds; maxZoom: number; padding: number; duration: number }
  | { kind: "flight"; target: SelectionTarget; duration: number; minZoom: number };

type SelectionFlightInput = {
  currentCenter: MapCoordinates;
  currentZoom: number;
  target: SelectionTarget;
  reducedMotion: boolean;
};

export function geometryBounds(geometry: GeoJSON.Geometry): MapBounds | null {
  if (geometry.type === "GeometryCollection") {
    const childBounds = geometry.geometries.map(geometryBounds).filter((bounds): bounds is MapBounds => bounds !== null);
    if (!childBounds.length) return null;
    return childBounds.reduce<MapBounds>(
      (combined, bounds) => [
        Math.min(combined[0], bounds[0]),
        Math.min(combined[1], bounds[1]),
        Math.max(combined[2], bounds[2]),
        Math.max(combined[3], bounds[3]),
      ],
      [...childBounds[0]],
    );
  }

  const bounds: MapBounds = [Infinity, Infinity, -Infinity, -Infinity];
  const visit = (coordinates: unknown): void => {
    if (!Array.isArray(coordinates)) return;
    if (coordinates.length >= 2 && typeof coordinates[0] === "number" && typeof coordinates[1] === "number") {
      bounds[0] = Math.min(bounds[0], coordinates[0]);
      bounds[1] = Math.min(bounds[1], coordinates[1]);
      bounds[2] = Math.max(bounds[2], coordinates[0]);
      bounds[3] = Math.max(bounds[3], coordinates[1]);
      return;
    }
    for (const child of coordinates) visit(child);
  };
  visit(geometry.coordinates);
  return bounds.every(Number.isFinite) ? bounds : null;
}

const toRadians = (value: number) => value * Math.PI / 180;

function distanceKm(left: MapCoordinates, right: MapCoordinates): number {
  const latitudeDelta = toRadians(right[1] - left[1]);
  const longitudeDelta = toRadians(right[0] - left[0]);
  const leftLatitude = toRadians(left[1]);
  const rightLatitude = toRadians(right[1]);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(leftLatitude) * Math.cos(rightLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function targetCenter(target: SelectionTarget): MapCoordinates {
  if ("coordinates" in target) return target.coordinates;
  const [west, south, east, north] = target.bbox;
  return [(west + east) / 2, (south + north) / 2];
}

function arrivalStage(target: SelectionTarget, duration: number): SelectionFlightStage {
  if ("coordinates" in target) {
    return { kind: "camera", center: target.coordinates, zoom: target.zoom ?? 7, duration };
  }
  return { kind: "bounds", bbox: target.bbox, maxZoom: target.maxZoom ?? 7, padding: 72, duration };
}

export function planSelectionFlight({ currentCenter, target, reducedMotion }: SelectionFlightInput): SelectionFlightStage[] {
  if (reducedMotion) return [arrivalStage(target, 150)];
  const destination = targetCenter(target);
  const distant = distanceKm(currentCenter, destination) > 1800;
  if (!distant) return [arrivalStage(target, 1400)];
  return [{ kind: "flight", target, duration: 2800, minZoom: 2.4 }];
}
