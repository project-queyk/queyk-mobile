import { WifiFingerprint } from "../hooks/use-wifi-fingerprint";
import { Floor } from "./floors";

export const matchWifiFingerprint = (
  currentFingerprint: WifiFingerprint,
  floors: Floor[],
  k: number = 3
): Floor | null => {
  if (!floors.length) return null;

  // Filter floors with wifiFingerprint
  const floorsWithFingerprint = floors.filter(
    (f) => Object.keys(f.wifiFingerprint).length > 0
  );

  if (!floorsWithFingerprint.length) return null;

  // Calculate distances
  const distances = floorsWithFingerprint.map((floor) => {
    const stored = floor.wifiFingerprint;
    if (!stored) return { floor, distance: Infinity }; // Should not happen
    let distance = 0;
    const allBSSIDs = new Set([
      ...Object.keys(currentFingerprint),
      ...Object.keys(stored),
    ]);

    allBSSIDs.forEach((bssid) => {
      const currentRSSI = currentFingerprint[bssid] || -100; // Default to very low if not present
      const storedRSSI = stored[bssid] || -100;
      distance += Math.pow(currentRSSI - storedRSSI, 2);
    });

    return { floor, distance: Math.sqrt(distance) };
  });

  // Sort by distance
  distances.sort((a, b) => a.distance - b.distance);

  // KNN: take top k, but since we want the best match, return the closest
  if (distances[0].distance < 20) {
    // Threshold for match, adjust as needed
    return distances[0].floor;
  }

  return null; // No good match
};
