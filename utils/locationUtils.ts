import { LocationCoordinates, SchoolBoundary } from "./types/location";

export const SCHOOL_BOUNDARY: SchoolBoundary = {
  name: "School Building",
  corners: [
    { latitude: 40.7128, longitude: -74.006 },
    { latitude: 40.7128, longitude: -74.0059 },
    { latitude: 40.7127, longitude: -74.0059 },
    { latitude: 40.7127, longitude: -74.006 },
  ],
};

export function isPointInPolygon(
  point: LocationCoordinates,
  polygon: LocationCoordinates[]
): boolean {
  if (polygon.length < 3) return false;

  const { latitude: x, longitude: y } = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].latitude;
    const yi = polygon[i].longitude;
    const xj = polygon[j].latitude;
    const yj = polygon[j].longitude;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

export function getDistanceBetweenPoints(
  point1: LocationCoordinates,
  point2: LocationCoordinates
): number {
  const R = 6371e3;
  const φ1 = (point1.latitude * Math.PI) / 180;
  const φ2 = (point2.latitude * Math.PI) / 180;
  const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function isUserInSchool(latitude: number, longitude: number): boolean {
  return isPointInPolygon({ latitude, longitude }, SCHOOL_BOUNDARY.corners);
}

export function getPolygonCentroid(
  polygon: LocationCoordinates[]
): LocationCoordinates {
  let lat = 0;
  let lng = 0;

  polygon.forEach((corner) => {
    lat += corner.latitude;
    lng += corner.longitude;
  });

  return {
    latitude: lat / polygon.length,
    longitude: lng / polygon.length,
  };
}

export function getPolygonBounds(polygon: LocationCoordinates[]): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
  const latitudes = polygon.map((p) => p.latitude);
  const longitudes = polygon.map((p) => p.longitude);

  return {
    minLat: Math.min(...latitudes),
    maxLat: Math.max(...latitudes),
    minLng: Math.min(...longitudes),
    maxLng: Math.max(...longitudes),
  };
}

export function isWithinBoundingBox(
  latitude: number,
  longitude: number,
  polygon: LocationCoordinates[]
): boolean {
  const bounds = getPolygonBounds(polygon);
  return (
    latitude >= bounds.minLat &&
    latitude <= bounds.maxLat &&
    longitude >= bounds.minLng &&
    longitude <= bounds.maxLng
  );
}
