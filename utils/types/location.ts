/**
 * Types for background location tracking and geofencing
 */

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface SchoolBoundary {
  corners: LocationCoordinates[];
  name: string;
}

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  altitude: number;
  accuracy: number;
  timestamp: number;
}

export interface LocationStatus {
  isInSchool: boolean;
  lastUpdated: number;
  latitude?: number;
  longitude?: number;
}

export interface BackgroundLocationTaskData {
  locations: LocationUpdate[];
}
