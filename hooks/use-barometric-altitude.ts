import { Barometer } from "expo-sensors";
import { useCallback, useEffect, useRef, useState } from "react";

interface BarometricAltitudeOptions {
  enabled?: boolean;
  referencePressure?: number; // hPa - set this to calibrate against known altitude
  updateInterval?: number; // ms
}

export default function useBarometricAltitude(
  opts: BarometricAltitudeOptions = {}
) {
  const { enabled = true, referencePressure, updateInterval = 1000 } = opts;

  const [relativeAltitude, setRelativeAltitude] = useState<number | null>(null);
  const [pressure, setPressure] = useState<number | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const referencePressureRef = useRef<number | null>(referencePressure || null);
  const groundFloorPressureRef = useRef<number | null>(null); // Pressure at ground floor
  const subscriptionRef = useRef<{ remove: () => void } | null>(null);

  // Convert pressure difference to relative altitude (meters above ground floor)
  const pressureToRelativeAltitude = useCallback(
    (currentPressure: number, groundPressure: number) => {
      const pressureDiff = groundPressure - currentPressure;
      return pressureDiff * 8.5; // meters above ground
    },
    []
  );

  const startListening = useCallback(async () => {
    try {
      setError(null);

      // Check if barometer is available
      const available = await Barometer.isAvailableAsync();
      setIsAvailable(available);

      if (!available) {
        setError("Barometer not available on this device");
        return;
      }

      // Get initial pressure reading for reference if not provided
      if (!referencePressureRef.current) {
        try {
          // Start a temporary listener to get initial pressure
          let initialPressure: number | null = null;
          const tempSubscription = Barometer.addListener((measurement) => {
            initialPressure = measurement.pressure;
            tempSubscription?.remove();
          });

          // Wait a bit for reading
          await new Promise((resolve) => setTimeout(resolve, 500));
          if (initialPressure) {
            referencePressureRef.current = initialPressure;
          }
        } catch (err) {
          console.warn("Could not get initial pressure reading:", err);
        }
      }

      // Start listening
      subscriptionRef.current = Barometer.addListener((measurement) => {
        setPressure(measurement.pressure);

        if (groundFloorPressureRef.current) {
          const alt = pressureToRelativeAltitude(
            measurement.pressure,
            groundFloorPressureRef.current
          );
          setRelativeAltitude(alt);
        }
      });

      await Barometer.setUpdateInterval(updateInterval);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start barometer"
      );
    }
  }, [updateInterval, pressureToRelativeAltitude]);

  const stopListening = useCallback(async () => {
    try {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
    } catch (err) {
      console.warn("Error stopping barometer:", err);
    }
  }, []);

  const calibrate = useCallback(
    (knownAltitude: number, currentPressure?: number) => {
      const pressureToUse = currentPressure || pressure;
      if (pressureToUse) {
        // For relative system, we calibrate by setting the ground floor reference
        // knownAltitude should be 0 for ground floor
        if (knownAltitude === 0) {
          groundFloorPressureRef.current = pressureToUse;
          setRelativeAltitude(0);
        }
      }
    },
    [pressure]
  );

  useEffect(() => {
    if (enabled) {
      startListening();
    } else {
      stopListening();
    }

    return () => {
      stopListening();
    };
  }, [enabled, startListening, stopListening]);

  return {
    altitude: relativeAltitude, // Now returns relative altitude (ground = 0)
    pressure,
    isAvailable,
    error,
    calibrate,
    startListening,
    stopListening,
  };
}
