import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { Floor } from "../utils/floors";
import { matchWifiFingerprint } from "../utils/wifi-matcher";
import { loadWifiFingerprints } from "../utils/wifi-storage";
import { useFloorTransition } from "./use-floor-transition";
import { useWifiFingerprint } from "./use-wifi-fingerprint";

export const useFloorFusion = (floors: Floor[]) => {
  const {
    floorDelta,
    consumeDelta,
    confidence: imuConfidence,
  } = useFloorTransition();
  const { fingerprint, scanWifi } = useWifiFingerprint();
  const [currentFloorIndex, setCurrentFloorIndex] = useState(0);
  const [gpsAltitude, setGpsAltitude] = useState<number | null>(null);

  // Load stored fingerprints
  const [storedFloors, setStoredFloors] = useState<Floor[]>([]);

  useEffect(() => {
    const load = async () => {
      const stored = await loadWifiFingerprints();
      setStoredFloors(stored);
    };
    load();
  }, []);

  // GPS altitude watcher
  useEffect(() => {
    let watcher: Location.LocationSubscription | null = null;
    const startWatching = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        watcher = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 1 },
          (location) => {
            setGpsAltitude(location.coords.altitude);
          }
        );
      }
    };
    startWatching();
    return () => {
      if (watcher) watcher.remove();
    };
  }, []);

  // Periodic Wi-Fi scan for matching
  useEffect(() => {
    const interval = setInterval(async () => {
      await scanWifi(3); // Quick scan
    }, 10000); // Every 10s
    return () => clearInterval(interval);
  }, [scanWifi]);

  // Fusion logic
  useEffect(() => {
    let newIndex = currentFloorIndex;

    // IMU delta
    if (floorDelta !== 0) {
      newIndex += floorDelta;
      consumeDelta();
    }

    // Wi-Fi match
    const wifiMatch = matchWifiFingerprint(fingerprint, storedFloors);
    if (wifiMatch) {
      const matchIndex = floors.findIndex((f) => f.value === wifiMatch.value);
      if (matchIndex >= 0) {
        // Weight Wi-Fi higher if confidence > IMU
        newIndex = matchIndex;
      }
    }

    // GPS altitude (outdoor only, rough)
    if (gpsAltitude !== null && floors.some((f) => f.altitude !== undefined)) {
      const closest = floors
        .map((f, i) => ({
          index: i,
          diff: Math.abs((f.altitude || 0) - gpsAltitude),
        }))
        .sort((a, b) => a.diff - b.diff)[0];
      if (closest.diff < 5) {
        // Within 5m
        newIndex = closest.index;
      }
    }

    // Clamp to valid range
    newIndex = Math.max(0, Math.min(floors.length - 1, newIndex));
    setCurrentFloorIndex(newIndex);
  }, [
    floorDelta,
    fingerprint,
    gpsAltitude,
    floors,
    storedFloors,
    consumeDelta,
    currentFloorIndex,
  ]);

  const currentFloor = floors[currentFloorIndex];

  return {
    currentFloor,
    currentFloorIndex,
    imuConfidence,
    wifiMatch: matchWifiFingerprint(fingerprint, storedFloors),
  };
};
