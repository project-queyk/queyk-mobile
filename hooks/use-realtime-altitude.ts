import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

export default function useRealTimeAltitude(opts?: {
  timeInterval?: number; // ms
  distanceInterval?: number; // meters
  enabled?: boolean;
  autoStart?: boolean;
}) {
  const [altitude, setAltitude] = useState<number | null>(null);
  const [altitudeAccuracy, setAltitudeAccuracy] = useState<number | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [granted, setGranted] = useState<boolean | null>(null);

  const mountedRef = useRef(true);
  const subRef = useRef<Location.LocationSubscription | null>(null);
  const manualStartRef = useRef(false);
  const warmupIntervalRef = useRef<number | null>(null);

  const altitudeRef = useRef<number | null>(null);
  const altitudeAccuracyRef = useRef<number | null>(null);
  const latitudeRef = useRef<number | null>(null);
  const longitudeRef = useRef<number | null>(null);
  const lastWatchCallbackTimeRef = useRef<number | null>(null);

  type PermissionResponse = {
    status: "granted" | "denied" | "undetermined";
    canAskAgain?: boolean;
  };

  const startWatching = useCallback(
    async (forceRequest = true): Promise<PermissionResponse | undefined> => {
      try {
        let perm: any;
        if (!forceRequest) {
          perm = await Location.getForegroundPermissionsAsync();
        } else {
          const current = await Location.getForegroundPermissionsAsync();
          if (current.status === "granted") {
            perm = current;
          } else {
            perm = await Location.requestForegroundPermissionsAsync();
          }
        }
        if (!mountedRef.current) return perm as unknown as PermissionResponse;
        const status = (perm as any).status as PermissionResponse["status"];
        setGranted(status === "granted");
        if (status !== "granted") return perm as unknown as PermissionResponse;

        try {
          const quick = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.BestForNavigation,
          });
          if (mountedRef.current) {
            const a = quick.coords.altitude ?? null;
            const aa = (quick.coords as any).altitudeAccuracy ?? null;
            const lat = quick.coords.latitude ?? null;
            const lon = quick.coords.longitude ?? null;
            setAltitude(a);
            setAltitudeAccuracy(aa);
            setLatitude(lat);
            setLongitude(lon);
            altitudeRef.current = a;
            altitudeAccuracyRef.current = aa;
            latitudeRef.current = lat;
            longitudeRef.current = lon;
          }
        } catch {}

        if (subRef.current) return perm as unknown as PermissionResponse;

        subRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: opts?.timeInterval ?? 1000,
            distanceInterval: opts?.distanceInterval ?? 0,
          },
          (loc) => {
            if (!mountedRef.current) return;
            const a = loc.coords.altitude ?? null;
            const aa = (loc.coords as any).altitudeAccuracy ?? null;
            const lat = loc.coords.latitude ?? null;
            const lon = loc.coords.longitude ?? null;
            setAltitude(a);
            setAltitudeAccuracy(aa);
            setLatitude(lat);
            setLongitude(lon);
            altitudeRef.current = a;
            altitudeAccuracyRef.current = aa;
            latitudeRef.current = lat;
            longitudeRef.current = lon;
            lastWatchCallbackTimeRef.current = Date.now();
          }
        );

        manualStartRef.current = true;

        const MAX_WARMUP_ATTEMPTS = 6;
        const WARMUP_INTERVAL_MS = 2000;
        let warmupAttempts = 0;
        if (warmupIntervalRef.current == null) {
          warmupIntervalRef.current = globalThis.setInterval(async () => {
            if (!mountedRef.current) return;
            warmupAttempts++;
            try {
              const pos = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.BestForNavigation,
              });
              if (!mountedRef.current) return;
              if (pos?.coords != null) {
                const a = pos.coords.altitude ?? null;
                const aa = (pos.coords as any).altitudeAccuracy ?? null;
                const lat = pos.coords.latitude ?? null;
                const lon = pos.coords.longitude ?? null;
                setAltitude(a);
                setAltitudeAccuracy(aa);
                setLatitude(lat);
                setLongitude(lon);
                altitudeRef.current = a;
                altitudeAccuracyRef.current = aa;
                latitudeRef.current = lat;
                longitudeRef.current = lon;

                if (warmupIntervalRef.current != null) {
                  try {
                    clearInterval(
                      warmupIntervalRef.current as unknown as number
                    );
                  } catch {}
                  warmupIntervalRef.current = null;
                }
                return;
              }
            } catch {}
            if (warmupAttempts >= MAX_WARMUP_ATTEMPTS) {
              if (warmupIntervalRef.current != null) {
                try {
                  clearInterval(warmupIntervalRef.current as unknown as number);
                } catch {}
                warmupIntervalRef.current = null;
              }
            }
          }, WARMUP_INTERVAL_MS) as unknown as number;
        }

        return perm as unknown as PermissionResponse;
      } catch {
        return undefined;
      }
    },
    [opts?.timeInterval, opts?.distanceInterval]
  );

  const stopWatching = useCallback(() => {
    try {
      subRef.current?.remove();
    } catch {}
    subRef.current = null;
    try {
      manualStartRef.current = false;
    } catch {}
    if (warmupIntervalRef.current != null) {
      try {
        clearInterval(warmupIntervalRef.current as unknown as number);
      } catch {}
      warmupIntervalRef.current = null;
    }
  }, []);

  const ensureWatcherStarted = useCallback(
    async (params?: {
      attempts?: number;
      waitForAltitudeMs?: number;
      delayBetweenAttemptsMs?: number;
      promptIfNeeded?: boolean;
    }): Promise<
      | { success: true; permission?: PermissionResponse }
      | { success: false; permission?: PermissionResponse; reason?: string }
    > => {
      const attempts = params?.attempts ?? 3;
      const waitForAltitudeMs = params?.waitForAltitudeMs ?? 7000;
      const delayBetweenAttemptsMs = params?.delayBetweenAttemptsMs ?? 300;
      const promptIfNeeded = params?.promptIfNeeded ?? false;

      try {
        const services = await Location.hasServicesEnabledAsync();
        if (!services) {
          return { success: false, reason: "servicesDisabled" };
        }

        for (let i = 0; i < attempts; i++) {
          if (!promptIfNeeded) {
            const currentPerm = await Location.getForegroundPermissionsAsync();
            if (currentPerm.status !== "granted") {
              return {
                success: false,
                permission: currentPerm,
                reason: "permissionDenied",
              };
            }
          }

          if (subRef.current && altitudeRef.current != null) {
            return { success: true };
          }

          try {
            stopWatching();
          } catch {}
          await new Promise((r) => setTimeout(r, 200));

          const perm = await startWatching(promptIfNeeded);

          if ((perm as any)?.status && (perm as any).status !== "granted") {
            return {
              success: false,
              permission: perm,
              reason: "permissionDenied",
            };
          }

          const got = await new Promise<boolean>((resolve) => {
            const start = Date.now();
            const iv = setInterval(() => {
              if (altitudeRef.current != null) {
                clearInterval(iv);
                resolve(true);
                return;
              }
              if (Date.now() - start > waitForAltitudeMs) {
                clearInterval(iv);
                resolve(false);
                return;
              }
            }, 250);
          });

          if (got) {
            return { success: true, permission: perm };
          }

          try {
            stopWatching();
          } catch {}
          await new Promise((r) => setTimeout(r, delayBetweenAttemptsMs));
        }

        return { success: false, reason: "unavailable" };
      } catch {
        return { success: false, reason: "error" };
      }
    },
    [startWatching, stopWatching]
  );

  useEffect(() => {
    mountedRef.current = true;

    const enabled = opts?.enabled ?? false;
    const autoStart = opts?.autoStart ?? false;

    const handleAppStateChange = (next: string) => {
      if (
        next === "active" &&
        enabled &&
        (autoStart || manualStartRef.current)
      ) {
        (async () => {
          try {
            await ensureWatcherStarted?.({ promptIfNeeded: false });
          } catch {}
        })();
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        })
          .then((pos) => {
            if (!mountedRef.current) return;
            const a = pos.coords.altitude ?? null;
            const aa = (pos.coords as any).altitudeAccuracy ?? null;
            setAltitude(a);
            setAltitudeAccuracy(aa);
            altitudeRef.current = a;
            altitudeAccuracyRef.current = aa;
          })
          .catch(() => {});
      }
    };

    const sub = AppState.addEventListener("change", handleAppStateChange);

    if (enabled && autoStart) {
      startWatching(false);
    } else if (!enabled) {
      stopWatching();
    }

    return () => {
      mountedRef.current = false;
      try {
        sub.remove();
      } catch {}
      stopWatching();
    };
  }, [
    startWatching,
    stopWatching,
    ensureWatcherStarted,
    opts?.enabled,
    opts?.autoStart,
  ]);

  return {
    altitude,
    altitudeAccuracy,
    granted,
    /**
     * Expose a manual permission/request starter so callers can trigger the
     * native permission prompt on demand (useful for asking when the user
     * explicitly requests dynamic behaviour).
     */
    requestPermission: startWatching,
    stopPermission: stopWatching,
    ensureWatcherStarted,
    latitude,
    longitude,
  };
}
