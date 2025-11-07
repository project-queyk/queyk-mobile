import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import { Image } from "expo-image";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import useBarometricAltitude from "@/hooks/use-barometric-altitude";
import { useFloorFusion } from "@/hooks/use-floor-fusion";
import { useFloorTransition } from "@/hooks/use-floor-transition";
import { useNetworkStatus } from "@/hooks/use-network-status";
import useRealTimeAltitude from "@/hooks/use-realtime-altitude";
import { useWifiFingerprint } from "@/hooks/use-wifi-fingerprint";
import type { Floor } from "@/utils/floors";
import { floors } from "@/utils/floors";
import { safetyGuidelines } from "@/utils/safety-guidelines";
import { loadWifiFingerprints } from "@/utils/wifi-storage";

import Card from "@/components/Card";

export default function EvacuationPlan() {
  const { isOffline } = useNetworkStatus();
  const { userData } = useAuth();
  const [selectedFloor, setSelectedFloor] = useState<string>(
    floors[0]?.value ?? ""
  );
  const [isFocus, setIsFocus] = useState(false);
  const [isDynamic, setIsDynamic] = useState(false);

  // IMU and Wi-Fi hooks
  const { lastAccelAvg, lastGyroAvg } = useFloorTransition();
  const {
    fingerprint,
    scanWifi,
    loading: wifiLoading,
    error: wifiError,
  } = useWifiFingerprint();
  const {
    currentFloor: fusedFloor,
    imuConfidence,
    wifiMatch,
  } = useFloorFusion(floors);
  const [adminMode, setAdminMode] = useState(false);
  const [storedFloors, setStoredFloors] = useState<Floor[]>([]);

  const currentFloor: Floor =
    floors.find((floor) => floor.value === selectedFloor) ?? floors[0];

  useEffect(() => {
    const loadStored = async () => {
      const stored = await loadWifiFingerprints();
      setStoredFloors(stored);
    };
    loadStored();
  }, []);

  // Update selectedFloor from fusion when in dynamic mode
  useEffect(() => {
    if (isDynamic && fusedFloor) {
      setSelectedFloor(fusedFloor.value);
    }
  }, [fusedFloor, isDynamic]);

  async function downloadEvacuationPlan() {
    try {
      const pdfUrl = process.env.EXPO_PUBLIC_EVAC_PLAN_URL || "";
      const fileName = "evacuation-plan.pdf";
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      const downloadResult = await FileSystem.downloadAsync(pdfUrl, fileUri);

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: "application/pdf",
          dialogTitle: "Save Evacuation Plan",
        });
      }
    } catch {}
  }

  const {
    altitude,
    altitudeAccuracy,
    latitude,
    longitude,
    requestPermission,
    stopPermission,
    ensureWatcherStarted,
  } = useRealTimeAltitude({
    timeInterval: 1000,
    enabled: isDynamic,
  });

  const {
    altitude: barometricAltitude,
    pressure,
    isAvailable: barometerAvailable,
    calibrate: calibrateBarometer,
  } = useBarometricAltitude({
    enabled: isDynamic, // Always use when in dynamic mode for better accuracy
  });

  const [awaitingAltitude, setAwaitingAltitude] = useState(false);
  const [altitudeError, setAltitudeError] = useState<
    null | "permissionDenied" | "unavailable"
  >(null);
  const [isInsideBuilding, setIsInsideBuilding] = useState<boolean | null>(
    null
  );
  const [calibrationMode, setCalibrationMode] = useState(false);
  const [altitudeReadings, setAltitudeReadings] = useState<number[]>([]);
  const altitudeTimeoutRef = useRef<number | null>(null);
  const altitudeStateRef = useRef<number | null>(altitude);
  const startAttemptRef = useRef(0);
  const lastCalibrationTimeRef = useRef<number>(0);
  const lastCalibrationAltitudeRef = useRef<number | null>(null);

  // Use barometric altitude as primary, GPS for calibration and fallback
  const effectiveAltitude =
    barometricAltitude !== null ? barometricAltitude : altitude;

  const clearAwaitingTimeout = useCallback(() => {
    if (altitudeTimeoutRef.current != null) {
      try {
        clearTimeout(altitudeTimeoutRef.current as unknown as number);
        altitudeTimeoutRef.current = null;
      } catch {}
    }
  }, []);

  const startAwaitingAltitude = useCallback(
    (
      durationMs: number = 10000,
      revertOnTimeout: boolean = false,
      setErrorOnTimeout: boolean = true
    ) => {
      clearAwaitingTimeout();
      setAwaitingAltitude(true);

      startAttemptRef.current += 1;
      const myAttemptId = startAttemptRef.current;
      altitudeTimeoutRef.current = setTimeout(() => {
        altitudeTimeoutRef.current = null;

        if (altitudeStateRef.current == null) {
          if (setErrorOnTimeout) setAltitudeError("unavailable");
          setAwaitingAltitude(false);
          if (revertOnTimeout && myAttemptId === startAttemptRef.current) {
            setIsDynamic(false);
          }
        }
      }, durationMs) as unknown as number;
      return myAttemptId;
    },
    [clearAwaitingTimeout]
  );

  const cancelAwaiting = useCallback(() => {
    startAttemptRef.current += 1;
    try {
      clearAwaitingTimeout();
    } catch {}
    try {
      stopPermission?.();
    } catch {}
    setAwaitingAltitude(false);
    setAltitudeError(null);
    setIsDynamic(false);
  }, [clearAwaitingTimeout, stopPermission]);
  useEffect(() => {
    altitudeStateRef.current = altitude;
    if (altitude != null) {
      setAwaitingAltitude(false);
      setAltitudeError(null);
      if (altitudeTimeoutRef.current != null) {
        clearTimeout(altitudeTimeoutRef.current as unknown as number);
        altitudeTimeoutRef.current = null;
      }
    }
  }, [altitude]);

  function handleRetry() {
    (async () => {
      setAltitudeError(null);
      startAwaitingAltitude(4000, false);
      try {
        const res = await ensureWatcherStarted?.({
          promptIfNeeded: false,
          attempts: isOffline ? 4 : 2,
          waitForAltitudeMs: isOffline ? 14000 : 4000,
        });
        clearAwaitingTimeout();
        if (!res?.success) {
          if (res?.permission && res.permission.status !== "granted") {
            setAltitudeError("permissionDenied");
            setAwaitingAltitude(false);
            return;
          }
          setAltitudeError("unavailable");
          setAwaitingAltitude(false);
          return;
        }
      } catch {
        try {
          await requestPermission?.();
        } catch {}
        try {
          clearAwaitingTimeout();
        } catch {}
        setAwaitingAltitude(false);
      }
    })();
  }

  const buildingPolygon = useMemo(
    () => [
      { lat: 14.767674, lon: 121.079934 },
      { lat: 14.767804, lon: 121.079932 },
      { lat: 14.768133, lon: 121.07979 },
      { lat: 14.767948, lon: 121.079833 },
    ],
    []
  );

  function pointInPolygon(
    point: { lat: number; lon: number },
    polygon: { lat: number; lon: number }[]
  ) {
    const x = point.lon;
    const y = point.lat;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lon;
      const yi = polygon[i].lat;
      const xj = polygon[j].lon;
      const yj = polygon[j].lat;
      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  useEffect(() => {
    if (!isDynamic) {
      setIsInsideBuilding(null);
      return;
    }
    if (latitude == null || longitude == null) {
      setIsInsideBuilding(null);
      return;
    }
    try {
      const inside = pointInPolygon(
        { lat: latitude, lon: longitude },
        buildingPolygon
      );
      setIsInsideBuilding(inside);
    } catch {
      setIsInsideBuilding(null);
    }
  }, [isDynamic, latitude, longitude, buildingPolygon]);

  useEffect(() => {
    if (!isDynamic) return;
    if (isInsideBuilding === false) return;
    if (effectiveAltitude == null) return;

    const floorsWithAlt = floors
      .filter(
        (f): f is Floor & { altitude: number } => typeof f.altitude === "number"
      )
      .slice()
      .sort((a, b) => a.altitude - b.altitude);
    if (!floorsWithAlt.length) return;

    if (effectiveAltitude < floorsWithAlt[0].altitude) {
      const candidate = floorsWithAlt[0].value;
      if (candidate !== selectedFloor) setSelectedFloor(candidate);
      return;
    }

    const found = floorsWithAlt.slice(0, -1).find((cur, i) => {
      const next = floorsWithAlt[i + 1];
      return (
        effectiveAltitude >= cur.altitude && effectiveAltitude < next.altitude
      );
    });
    const chosen = found
      ? found.value
      : floorsWithAlt[floorsWithAlt.length - 1].value;

    if (chosen !== selectedFloor) {
      setSelectedFloor(chosen);
    }
  }, [
    isDynamic,
    effectiveAltitude,
    altitudeAccuracy,
    selectedFloor,
    isInsideBuilding,
  ]);

  async function toggleDynamicFloorPlan() {
    const enabling = !isDynamic;

    if (!enabling) {
      try {
        stopPermission?.();
      } catch {}

      try {
        clearAwaitingTimeout();
      } catch {}
      setAwaitingAltitude(false);
      setAltitudeError(null);
      setIsDynamic(false);
      try {
        await SecureStore.setItemAsync("DYNAMIC_FLOOR_PLAN_ENABLED", "false");
      } catch {}
      return;
    }

    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setAltitudeError("unavailable");
        setAwaitingAltitude(false);
        return;
      }

      const current = await Location.getForegroundPermissionsAsync();

      setAltitudeError(null);
      startAwaitingAltitude(4000, true);
      setIsDynamic(true);

      if (current.status === "granted") {
        try {
          const result = await ensureWatcherStarted?.({
            promptIfNeeded: false,
            attempts: isOffline ? 4 : 2,
            waitForAltitudeMs: isOffline ? 14000 : 4000,
          });
          clearAwaitingTimeout();
          if (result?.success) {
            try {
              await SecureStore.setItemAsync(
                "DYNAMIC_FLOOR_PLAN_ENABLED",
                "true"
              );
            } catch {}
            return;
          }

          if (result?.permission && result.permission.status !== "granted") {
            setAltitudeError("permissionDenied");
          } else {
            setAltitudeError("unavailable");
          }
          setAwaitingAltitude(false);
          setIsDynamic(false);
          return;
        } catch {
          clearAwaitingTimeout();
          setAwaitingAltitude(false);
          setIsDynamic(false);
        }
      }
    } catch {}
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(
          "DYNAMIC_FLOOR_PLAN_ENABLED"
        );
        if (!mounted) return;
        if (stored === "true") {
          try {
            const current = await Location.getForegroundPermissionsAsync();
            if (current.status === "granted") {
              setAltitudeError(null);

              startAwaitingAltitude(8000, false);
              try {
                const res = await ensureWatcherStarted?.({
                  promptIfNeeded: false,
                  attempts: isOffline ? 4 : 2,
                  waitForAltitudeMs: isOffline ? 14000 : 4000,
                });
                clearAwaitingTimeout();
                if (!res?.success) {
                  if (res?.permission && res.permission.status !== "granted") {
                    setAltitudeError("permissionDenied");
                  } else {
                    setAltitudeError("unavailable");
                  }
                  setAwaitingAltitude(false);
                }
              } catch {
                clearAwaitingTimeout();
                setAwaitingAltitude(false);
              }
              setIsDynamic(true);
            } else {
              setIsDynamic(true);
            }
          } catch {
            setIsDynamic(true);
          }
        }
      } catch {}
    })();

    return () => {
      mounted = false;
    };
  }, [
    requestPermission,
    ensureWatcherStarted,
    startAwaitingAltitude,
    clearAwaitingTimeout,
    isOffline,
  ]);

  useEffect(() => {
    return () => {
      try {
        clearAwaitingTimeout();
      } catch {}
    };
  }, [clearAwaitingTimeout]);

  useEffect(() => {
    if (!calibrationMode || !altitude || altitudeReadings.length >= 10) return;

    // Add reading if it's stable (not changing too much from previous readings)
    const recentReadings = altitudeReadings.slice(-3);
    const avgRecent =
      recentReadings.length > 0
        ? recentReadings.reduce((a, b) => a + b, 0) / recentReadings.length
        : altitude;
    const diff = Math.abs(altitude - avgRecent);

    if (altitudeReadings.length === 0 || diff < 0.5) {
      // Only add if stable within 0.5m
      setAltitudeReadings((prev) => [...prev, altitude]);
    }
  }, [altitude, calibrationMode, altitudeReadings]);

  useEffect(() => {
    if (calibrationMode && altitudeReadings.length >= 10) {
      // Here you could save to a config file or display the result
      setCalibrationMode(false);
      setAltitudeReadings([]);
    }
  }, [altitudeReadings, calibrationMode]);

  // Automatic calibration of barometric sensor
  useEffect(() => {
    if (
      !isDynamic ||
      !barometerAvailable ||
      altitude == null ||
      barometricAltitude == null
    )
      return;

    const now = Date.now();
    const timeSinceLastCalibration = now - lastCalibrationTimeRef.current;

    // Don't recalibrate too frequently (minimum 30 seconds between calibrations)
    if (timeSinceLastCalibration < 30000) return;

    // Strategy 1: Recalibrate when outside building (GPS is more accurate outdoors)
    if (isInsideBuilding === false) {
      const gpsAltitude = altitude;
      const barometricOffset = gpsAltitude - barometricAltitude;

      // Only recalibrate if offset is significant (> 3m difference) and reasonable (< 20m)
      if (Math.abs(barometricOffset) > 3 && Math.abs(barometricOffset) < 20) {
        calibrateBarometer(gpsAltitude, pressure || undefined);
        lastCalibrationTimeRef.current = now;
        lastCalibrationAltitudeRef.current = gpsAltitude;
        console.log(
          `Auto-calibrated outdoors: offset ${barometricOffset.toFixed(2)}m`
        );
      }
      return;
    }

    // Strategy 2: Recalibrate when on ground floor (known reference point)
    if (selectedFloor === "ground" && isInsideBuilding === true) {
      const groundFloorAltitude = floors.find(
        (f) => f.value === "ground"
      )?.altitude;
      if (groundFloorAltitude != null) {
        const barometricOffset = groundFloorAltitude - barometricAltitude;

        // Only recalibrate if barometric reading is significantly off (> 5m difference)
        if (Math.abs(barometricOffset) > 5) {
          // Use GPS to validate the calibration
          const gpsAltitude = altitude;

          // If GPS is reasonably close to expected ground floor altitude, proceed
          if (Math.abs(gpsAltitude - groundFloorAltitude) < 15) {
            calibrateBarometer(groundFloorAltitude, pressure || undefined);
            lastCalibrationTimeRef.current = now;
            lastCalibrationAltitudeRef.current = groundFloorAltitude;
            console.log(
              `Auto-calibrated on ground floor: offset ${barometricOffset.toFixed(
                2
              )}m`
            );
          }
        }
      }
    }
  }, [
    altitude,
    barometricAltitude,
    pressure,
    isInsideBuilding,
    selectedFloor,
    isDynamic,
    barometerAvailable,
    calibrateBarometer,
  ]);

  const [copySuccess, setCopySuccess] = useState(false);

  return (
    <SafeAreaView
      edges={["left", "right"]}
      style={{
        flex: 1,
        backgroundColor: "#F2F4F7",
        paddingHorizontal: 16,
      }}
    >
      <ScrollView
        contentContainerStyle={{ gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <Card>
          <View
            style={{
              gap: 4,
              borderBottomColor: "#e5e5e5",
              borderBottomWidth: 1,
              paddingBottom: 16,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={styles.headerText}>Evacuation Floor Plans</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={[
                    styles.secondaryButton,
                    { opacity: isOffline ? 0.7 : 1 },
                  ]}
                  onPress={downloadEvacuationPlan}
                  aria-disabled={isOffline}
                  disabled={isOffline}
                >
                  <MaterialIcons name="get-app" size={16} color="#212529" />
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.secondaryButton}
                  onPress={() => setAdminMode(!adminMode)}
                >
                  <MaterialIcons
                    name="admin-panel-settings"
                    size={16}
                    color="#212529"
                  />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.headerDescription}>
              Select a floor to view evacuation routes
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.button, { opacity: isOffline ? 0.9 : 1 }]}
            onPress={awaitingAltitude ? cancelAwaiting : toggleDynamicFloorPlan}
          >
            {awaitingAltitude ? (
              <>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={styles.buttonText}>Cancel</Text>
              </>
            ) : (
              <Text style={styles.buttonText}>
                Switch to {isDynamic ? "static" : "dynamic"} floor plan
              </Text>
            )}
          </TouchableOpacity>
          {isOffline ? (
            <Text
              style={{
                marginTop: 8,
                fontSize: 12,
                color: "#565b60",
                fontFamily: Platform.select({
                  android: "PlusJakartaSans_400Regular",
                  ios: "PlusJakartaSans-Regular",
                }),
              }}
            >
              Offline: Using barometric sensor for floor detection. GPS
              unavailable.
            </Text>
          ) : (
            <Text
              style={{
                marginTop: 8,
                fontSize: 12,
                color: "#565b60",
                fontFamily: Platform.select({
                  android: "PlusJakartaSans_400Regular",
                  ios: "PlusJakartaSans-Regular",
                }),
              }}
            >
              Using barometric sensor for accurate indoor altitude. GPS used for
              calibration.
            </Text>
          )}
          {isDynamic ? (
            <>
              <View style={styles.floorPlanImage}>
                {awaitingAltitude && altitude == null && !altitudeError ? (
                  <View style={styles.imageSkeleton} />
                ) : altitudeError ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>
                      {altitudeError === "permissionDenied"
                        ? "Location permission denied. Please enable Location for this app."
                        : "Unable to determine altitude. Please try again."}
                    </Text>
                    <View style={{ flexDirection: "row", marginTop: 8 }}>
                      {altitudeError === "permissionDenied" ? (
                        <TouchableOpacity
                          activeOpacity={0.9}
                          onPress={() => {
                            try {
                              Linking.openSettings();
                            } catch {}
                          }}
                          style={[
                            styles.secondaryButton,
                            { paddingHorizontal: 12 },
                          ]}
                        >
                          <Text style={styles.buttonTextSmall}>
                            Open Settings
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={handleRetry}
                        style={[
                          styles.secondaryButton,
                          { paddingHorizontal: 12, marginLeft: 8 },
                        ]}
                      >
                        <Text style={styles.buttonTextSmall}>Retry</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <Image
                    source={currentFloor.imageSrc}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="contain"
                    alt={currentFloor.label}
                  />
                )}
              </View>
              {isDynamic && userData?.role === "admin" && (
                <View style={{ marginTop: 8 }}>
                  <Text
                    style={{
                      fontSize: 10,
                      color: "#565b60",
                      fontFamily: Platform.select({
                        android: "PlusJakartaSans_400Regular",
                        ios: "PlusJakartaSans-Regular",
                      }),
                    }}
                  >
                    Debug: Lat: {latitude?.toFixed(6)}, Lon:{" "}
                    {longitude?.toFixed(6)}, Alt: {altitude?.toFixed(2)},
                    Inside: {isInsideBuilding ? "Yes" : "No"}
                    {"\n"}Using:{" "}
                    {barometricAltitude !== null ? "Barometric" : "GPS"} (
                    {effectiveAltitude?.toFixed(2)}m)
                    {"\n"}Barometric: {barometricAltitude?.toFixed(2)}m (
                    {pressure?.toFixed(1)} hPa)
                    {"\n"}Pressure: {pressure?.toFixed(1)} hPa ← COLLECT THIS
                    PER FLOOR
                    {"\n"}Target Floor: {selectedFloor} (
                    {floors
                      .find((f) => f.value === selectedFloor)
                      ?.altitude?.toFixed(1)}
                    m)
                    {"\n"}Polygon:{" "}
                    {buildingPolygon
                      .map((p) => `(${p.lat.toFixed(6)},${p.lon.toFixed(6)})`)
                      .join(" | ")}
                    {isOffline &&
                      barometricAltitude !== null &&
                      `\nBarometric: ${barometricAltitude?.toFixed(
                        2
                      )}m (${pressure?.toFixed(1)} hPa)`}
                    {"\n"}Last Cal:{" "}
                    {lastCalibrationTimeRef.current > 0
                      ? new Date(
                          lastCalibrationTimeRef.current
                        ).toLocaleTimeString()
                      : "Never"}
                  </Text>
                  {calibrationMode && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={{ fontSize: 10, color: "#565b60" }}>
                        Current: {altitude?.toFixed(2)} | Avg:{" "}
                        {altitudeReadings.length > 0
                          ? (
                              altitudeReadings.reduce((a, b) => a + b, 0) /
                              altitudeReadings.length
                            ).toFixed(2)
                          : "N/A"}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </>
          ) : (
            <>
              <View
                style={{
                  borderColor: "#e5e5e5",
                  height: 40,
                  borderWidth: 1,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  marginTop: 14,
                }}
              >
                <Dropdown
                  data={floors}
                  maxHeight={300}
                  labelField="label"
                  valueField="value"
                  placeholder={!isFocus ? "Select floor" : "..."}
                  value={selectedFloor}
                  onFocus={() => setIsFocus(true)}
                  onBlur={() => setIsFocus(false)}
                  onChange={(item) => {
                    setSelectedFloor(item.value);
                    setIsFocus(false);
                  }}
                  placeholderStyle={{
                    fontSize: 14,
                    fontFamily: Platform.select({
                      android: "PlusJakartaSans_500Medium",
                      ios: "PlusJakartaSans-Medium",
                    }),
                  }}
                  selectedTextStyle={{
                    fontSize: 14,
                    fontFamily: Platform.select({
                      android: "PlusJakartaSans_500Medium",
                      ios: "PlusJakartaSans-Medium",
                    }),
                  }}
                  itemTextStyle={{
                    fontFamily: Platform.select({
                      android: "PlusJakartaSans_400Regular",
                      ios: "PlusJakartaSans-Regular",
                    }),
                  }}
                />
              </View>
              <View style={styles.floorPlanImage}>
                <Image
                  source={currentFloor.imageSrc}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="contain"
                  alt={currentFloor.label}
                />
              </View>
            </>
          )}
        </Card>
        {adminMode && (
          <Card>
            <View style={styles.debugContainer}>
              <Text style={styles.debugTitle}>
                Wi-Fi Fingerprint Collection
              </Text>
              <Text style={styles.debugText}>
                Current Floor: {currentFloor.label}
              </Text>
              <Text style={styles.debugText}>
                Fingerprint: {Object.keys(fingerprint).length} APs
              </Text>
              {wifiError && (
                <Text style={styles.debugText}>Error: {wifiError}</Text>
              )}
              <View style={{ marginTop: 12 }}>
                <Text style={styles.debugTitle}>
                  Data to Store for {currentFloor.label}:
                </Text>
                <Text style={styles.debugText}>
                  wifiFingerprint: {JSON.stringify(fingerprint, null, 2)}
                </Text>
                <Text style={styles.debugText}>
                  altitude: {currentFloor.altitude ?? "Not set"}
                </Text>
              </View>
              <View style={{ marginTop: 12 }}>
                <Text style={styles.debugTitle}>
                  Already Stored for {currentFloor.label}:
                </Text>
                {(() => {
                  const storedFloor = storedFloors.find(
                    (f) => f.value === selectedFloor
                  );
                  return storedFloor ? (
                    <>
                      <Text style={styles.debugText}>
                        wifiFingerprint:{" "}
                        {storedFloor.wifiFingerprint
                          ? Object.keys(storedFloor.wifiFingerprint).length +
                            " APs"
                          : "None"}
                      </Text>
                      <Text style={styles.debugText}>
                        altitude: {storedFloor.altitude ?? "Not set"}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.debugText}>No data stored yet</Text>
                  );
                })()}
              </View>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.collectButton}
                  onPress={() => scanWifi()}
                  disabled={wifiLoading}
                >
                  <Text style={{ color: "#000", fontWeight: "bold" }}>
                    {wifiLoading ? "Scanning..." : "Scan Wi-Fi"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.collectButton, { backgroundColor: "#fff3e0" }]}
                  onPress={async () => {
                    const fingerprintText = JSON.stringify(
                      fingerprint,
                      null,
                      2
                    );
                    await Clipboard.setStringAsync(fingerprintText);
                    setCopySuccess(true);
                    setTimeout(() => setCopySuccess(false), 2000);
                  }}
                  disabled={Object.keys(fingerprint).length === 0}
                >
                  <Text style={{ color: "#000", fontWeight: "bold" }}>
                    {copySuccess ? "Copied!" : "Copy Data"}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.debugText}>
                Stored Floors: {storedFloors.length}
              </Text>
              <Text style={styles.debugText}>
                IMU: Accel {lastAccelAvg.toFixed(2)}, Gyro{" "}
                {lastGyroAvg.toFixed(2)}, Conf {imuConfidence.toFixed(2)}
              </Text>
              <Text style={styles.debugText}>
                Wi-Fi APs: {Object.keys(fingerprint).length}
              </Text>
              <Text style={styles.debugText}>
                Wi-Fi Match: {wifiMatch?.label || "None"}
              </Text>
              <Text style={styles.debugText}>
                Fused Floor: {fusedFloor?.label || "None"}
              </Text>
              <Text style={styles.debugText}>Using the Floor Plan:</Text>
              <Text style={styles.debugText}>
                • Wi-Fi must be ENABLED for scanning
              </Text>
              <Text style={styles.debugText}>
                • No Wi-Fi connection required
              </Text>
              <Text style={styles.debugText}>
                • App scans signals to determine floor
              </Text>
              <Text style={styles.debugText}>• Works completely offline</Text>
              <Text style={styles.debugText}>Wi-Fi Collection Tips:</Text>
              <Text style={styles.debugText}>
                • Collect from multiple spots per floor for best accuracy
              </Text>
              <Text style={styles.debugText}>
                • Current location may affect RSSI values
              </Text>
              <Text style={styles.debugText}>
                • More APs = better floor identification
              </Text>
              <Text style={styles.debugText}>Collection Spots per Floor:</Text>
              <Text style={styles.debugText}>
                • Minimum: 3-5 spots per floor
              </Text>
              <Text style={styles.debugText}>
                • Cover: corners, center, near stairs/elevators
              </Text>
              <Text style={styles.debugText}>• Large floors: 6-8 spots</Text>
              <Text style={styles.debugText}>
                • More spots = better accuracy
              </Text>
              <Text style={styles.debugText}>
                How to Combine Multiple Spots:
              </Text>
              <Text style={styles.debugText}>
                • Collect from 3-5 spots per floor
              </Text>
              <Text style={styles.debugText}>
                • Average RSSI values for same APs
              </Text>
              <Text style={styles.debugText}>
                • Screenshot each spot&apos;s data
              </Text>
              <Text style={styles.debugText}>
                • Or use &quot;Copy Data&quot; button
              </Text>
            </View>
          </Card>
        )}
        <View>
          <Card>
            <View
              style={{
                gap: 4,
                borderBottomColor: "#e5e5e5",
                borderBottomWidth: 1,
                paddingBottom: 16,
              }}
            >
              <Text style={styles.headerText}>{safetyGuidelines.header}</Text>
              <Text style={styles.headerDescription}>
                {safetyGuidelines.description}
              </Text>
            </View>
            <View style={styles.cardContent}>
              {safetyGuidelines.bulletItems.map((item, index) => (
                <View
                  key={item.title}
                  style={{ gap: 8, marginTop: index > 0 ? 24 : 0 }}
                >
                  <Text style={styles.bulletItemTitle}>{item.title}</Text>
                  <Text style={styles.bulletItemDescription}>
                    {item.description}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        </View>
        <Text style={styles.footerText}>
          Based on guidelines from NDRRMC, PHIVOLCS, and the Philippine Disaster
          Risk Reduction and Management Act (RA 10121)
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerText: {
    fontSize: 16,
    color: "#212529",
    fontFamily: Platform.select({
      android: "PlusJakartaSans_600SemiBold",
      ios: "PlusJakartaSans-SemiBold",
    }),
  },
  headerDescription: {
    fontSize: 14,
    color: "#565b60ff",
    fontFamily: Platform.select({
      android: "PlusJakartaSans_400Regular",
      ios: "PlusJakartaSans-Regular",
    }),
  },
  cardContent: { marginTop: 14 },
  secondaryButton: {
    borderColor: "#e5e5e5",
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: "#f1f3f5",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  floorPlanImage: { width: "100%", aspectRatio: 1280 / 720, marginTop: 12 },
  bulletItemTitle: {
    fontSize: 15,
    color: "#193867",
    fontFamily: Platform.select({
      android: "PlusJakartaSans_600SemiBold",
      ios: "PlusJakartaSans-SemiBold",
    }),
  },
  bulletItemDescription: {
    fontSize: 14,
    color: "#565b60ff",
    fontFamily: Platform.select({
      android: "PlusJakartaSans_400Regular",
      ios: "PlusJakartaSans-Regular",
    }),
  },
  footerText: {
    color: "#565b60ff",
    marginBottom: 16,
    textAlign: "center",
    fontSize: 12,
    fontFamily: Platform.select({
      android: "PlusJakartaSans_400Regular",
      ios: "PlusJakartaSans-Regular",
    }),
  },
  button: {
    backgroundColor: "#193867",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  buttonText: {
    color: "#ffffff",
    marginBottom: 4,
    fontSize: 12,
    fontFamily: Platform.select({
      android: "PlusJakartaSans_600SemiBold",
      ios: "PlusJakartaSans-SemiBold",
    }),
  },
  buttonTextSmall: {
    color: "#193867",
    fontSize: 12,
    fontFamily: Platform.select({
      android: "PlusJakartaSans_500Medium",
      ios: "PlusJakartaSans-Medium",
    }),
  },
  imageSkeleton: {
    flex: 1,
    backgroundColor: "#e6e9ee",
    borderRadius: 8,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  errorText: {
    color: "#fb2c36",
    textAlign: "center",
    fontFamily: Platform.select({
      android: "PlusJakartaSans_500Medium",
      ios: "PlusJakartaSans-Medium",
    }),
  },
  dialog: {
    borderRadius: 8,
  },
  settingsText: {
    fontSize: 14,
    color: "#565b60ff",
    fontFamily: Platform.select({
      android: "PlusJakartaSans_400Regular",
      ios: "PlusJakartaSans-Regular",
    }),
  },
  outlineButton: {
    borderColor: "#e5e5e5",
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  debugContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
    borderColor: "#e5e5e5",
    borderWidth: 1,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#193867",
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: "#565b60",
    marginBottom: 4,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    gap: 8,
  },
  collectButton: {
    backgroundColor: "#e1f5fe",
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveButton: {
    backgroundColor: "#c8e6c9",
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 12,
    alignItems: "center",
  },
});
