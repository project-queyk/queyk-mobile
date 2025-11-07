import * as SecureStore from "expo-secure-store";
import { Floor } from "./floors";

const WIFI_STORAGE_KEY = "wifi_fingerprints";

export const saveWifiFingerprints = async (floors: Floor[]) => {
  try {
    const data = JSON.stringify(floors);
    await SecureStore.setItemAsync(WIFI_STORAGE_KEY, data);
  } catch (error) {
    console.error("Failed to save Wi-Fi fingerprints:", error);
  }
};

export const loadWifiFingerprints = async (): Promise<Floor[]> => {
  try {
    const data = await SecureStore.getItemAsync(WIFI_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error("Failed to load Wi-Fi fingerprints:", error);
    return [];
  }
};

export const updateFloorFingerprint = async (
  floorValue: string,
  fingerprint: { [bssid: string]: number }
) => {
  const floors = await loadWifiFingerprints();
  const floorIndex = floors.findIndex((f) => f.value === floorValue);
  if (floorIndex >= 0) {
    floors[floorIndex].wifiFingerprint = fingerprint;
    await saveWifiFingerprints(floors);
  }
};
