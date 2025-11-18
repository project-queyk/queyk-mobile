import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import * as TaskManager from "expo-task-manager";
import { isUserInSchool } from "./locationUtils";
import { isConnected } from "./network";

export const BACKGROUND_LOCATION_TASK_NAME = "background-location-task";

let UPDATE_THROTTLE_INTERVAL = 60000;
let lastUpdateTimestamp = 0;

export function setLocationUpdateThrottle(intervalMs: number): void {
  UPDATE_THROTTLE_INTERVAL = Math.max(0, intervalMs);
}

TaskManager.defineTask(
  BACKGROUND_LOCATION_TASK_NAME,
  async ({ data, error }: { data?: any; error?: any }) => {
    if (error) {
      return;
    }

    if (!data) {
      return;
    }

    try {
      const { locations } = data as { locations: Location.LocationObject[] };

      if (!Array.isArray(locations) || locations.length === 0) {
        return;
      }

      for (const location of locations) {
        await processLocationUpdate(location);
      }
    } catch {}
  }
);

async function processLocationUpdate(location: Location.LocationObject) {
  try {
    const now = Date.now();

    if (
      UPDATE_THROTTLE_INTERVAL > 0 &&
      now - lastUpdateTimestamp < UPDATE_THROTTLE_INTERVAL
    ) {
      return;
    }

    const { latitude, longitude } = location.coords;
    const altitude = location.coords.altitude ?? 0;
    const accuracy = location.coords.accuracy ?? 0;

    const isInSchool = isUserInSchool(latitude, longitude);

    const userDataJson = await SecureStore.getItemAsync("user_profile_data");
    if (!userDataJson) {
      return;
    }

    const userData = JSON.parse(userDataJson);
    const userId = userData.id;

    const connected = await isConnected();
    if (!connected) {
      return;
    }

    await updateLocationStatusInBackend(
      userId,
      isInSchool,
      latitude,
      longitude,
      altitude,
      accuracy
    );

    lastUpdateTimestamp = now;
  } catch {}
}

export async function updateLocationStatusInBackend(
  userId: string,
  isInSchool: boolean,
  latitude: number,
  longitude: number,
  altitude: number,
  accuracy: number
): Promise<void> {
  try {
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_BACKEND_URL}/v1/api/users/${userId}/location-status`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${process.env.EXPO_PUBLIC_AUTH_TOKEN}`,
          "Content-Type": "application/json",
          "Token-Type": "auth",
        },
        body: JSON.stringify({
          isInSchool,
        }),
      }
    );

    if (!response.ok) {
      return;
    }
  } catch (error) {
    throw error;
  }
}

export async function startBackgroundLocationTracking(options?: {
  timeInterval?: number;
  distanceInterval?: number;
}): Promise<boolean> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_LOCATION_TASK_NAME
    );

    if (isRegistered) {
      return true;
    }

    const foregroundPermission =
      await Location.requestForegroundPermissionsAsync();
    if (foregroundPermission.status !== "granted") {
      return false;
    }

    const backgroundPermission =
      await Location.requestBackgroundPermissionsAsync();
    if (backgroundPermission.status !== "granted") {
      return false;
    }

    const { Platform } = await import("react-native");

    const config: any = {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: options?.timeInterval ?? 10000,
      distanceInterval: options?.distanceInterval ?? 10,
      showsBackgroundLocationIndicator: true,
      pausesUpdatesAutomatically: false,
    };

    if (Platform.OS === "android") {
      config.foregroundService = {
        notificationTitle: "Queyk Location Tracking",
        notificationBody: "Your location is being tracked for safety purposes",
        notificationColor: "#193867",
      };
    }

    await Location.startLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK_NAME,
      config
    );

    return true;
  } catch {
    return false;
  }
}

export async function stopBackgroundLocationTracking(): Promise<boolean> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_LOCATION_TASK_NAME
    );

    if (!isRegistered) {
      return true;
    }

    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME);
    return true;
  } catch {
    return false;
  }
}

export async function isBackgroundLocationTrackingActive(): Promise<boolean> {
  try {
    return await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_LOCATION_TASK_NAME
    );
  } catch {
    return false;
  }
}
