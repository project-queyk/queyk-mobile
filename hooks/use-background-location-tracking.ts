import {
  isBackgroundLocationTrackingActive,
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
} from "@/utils/backgroundLocationTask";
import { useCallback } from "react";

export function useBackgroundLocationTracking() {
  const start = useCallback(
    async (options?: { timeInterval?: number; distanceInterval?: number }) => {
      try {
        const success = await startBackgroundLocationTracking(options);

        return success;
      } catch {
        return false;
      }
    },
    []
  );

  const stop = useCallback(async () => {
    try {
      const success = await stopBackgroundLocationTracking();

      return success;
    } catch {
      return false;
    }
  }, []);

  const isActive = useCallback(async () => {
    try {
      return await isBackgroundLocationTrackingActive();
    } catch {
      return false;
    }
  }, []);

  return {
    start,
    stop,
    isActive,
  };
}
