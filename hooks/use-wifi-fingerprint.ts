import { useCallback, useState } from "react";
import WifiManager from "react-native-wifi-reborn";

interface WifiEntry {
  BSSID: string;
  SSID: string;
  level: number;
  // other fields if needed
}

export interface WifiFingerprint {
  [bssid: string]: number; // BSSID to average RSSI
}

export const useWifiFingerprint = () => {
  const [fingerprint, setFingerprint] = useState<WifiFingerprint>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scanWifi = useCallback(async (samples: number = 5) => {
    setLoading(true);
    setError(null);
    try {
      const allScans: WifiEntry[][] = [];
      for (let i = 0; i < samples; i++) {
        const scanResult = await WifiManager.loadWifiList();
        allScans.push(scanResult);
        if (i < samples - 1)
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1s between scans
      }

      // Aggregate RSSI per BSSID
      const rssiMap: { [bssid: string]: number[] } = {};
      allScans.forEach((scan) => {
        scan.forEach((entry) => {
          if (!rssiMap[entry.BSSID]) rssiMap[entry.BSSID] = [];
          rssiMap[entry.BSSID].push(entry.level);
        });
      });

      // Average RSSI
      const avgFingerprint: WifiFingerprint = {};
      Object.keys(rssiMap).forEach((bssid) => {
        const rssis = rssiMap[bssid];
        avgFingerprint[bssid] =
          rssis.reduce((sum, rssi) => sum + rssi, 0) / rssis.length;
      });

      setFingerprint(avgFingerprint);
      return avgFingerprint;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scan Wi-Fi");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { fingerprint, scanWifi, loading, error };
};
