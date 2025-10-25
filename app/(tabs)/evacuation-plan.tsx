import MaterialIcons from "@expo/vector-icons/MaterialIcons";
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
import { Dialog } from "react-native-simple-dialogs";

import { useNetworkStatus } from "@/hooks/use-network-status";
import useRealTimeAltitude from "@/hooks/use-realtime-altitude";
import type { Floor } from "@/utils/floors";
import { floors } from "@/utils/floors";
import { safetyGuidelines } from "@/utils/safety-guidelines";

import Card from "@/components/Card";

export default function EvacuationPlan() {
  const { isOffline } = useNetworkStatus();
  const [selectedFloor, setSelectedFloor] = useState<string>(
    floors[0]?.value ?? ""
  );
  const [isFocus, setIsFocus] = useState(false);
  const [isDynamic, setIsDynamic] = useState(false);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogType, setDialogType] = useState<string | null>(null);

  const currentFloor: Floor =
    floors.find((floor) => floor.value === selectedFloor) ?? floors[0];

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

  const [awaitingAltitude, setAwaitingAltitude] = useState(false);
  const [altitudeError, setAltitudeError] = useState<
    null | "permissionDenied" | "unavailable"
  >(null);
  const [isInsideBuilding, setIsInsideBuilding] = useState<boolean | null>(
    null
  );
  const altitudeTimeoutRef = useRef<number | null>(null);
  const altitudeStateRef = useRef<number | null>(altitude);
  const startAttemptRef = useRef(0);

  const clearAwaitingTimeout = useCallback(() => {
    if (altitudeTimeoutRef.current != null) {
      try {
        clearTimeout(altitudeTimeoutRef.current as unknown as number);
      } catch {}
      altitudeTimeoutRef.current = null;
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
      { lat: 14.7675598, lon: 121.0797802 },
      { lat: 14.7678183, lon: 121.0797498 },
      { lat: 14.7679425, lon: 121.079625 },
      { lat: 14.7680478, lon: 121.0796791 },
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
    if (altitude == null) return;

    const floorsWithAlt = floors
      .filter(
        (f): f is Floor & { altitude: number } => typeof f.altitude === "number"
      )
      .slice()
      .sort((a, b) => a.altitude - b.altitude);
    if (!floorsWithAlt.length) return;

    if (altitude < floorsWithAlt[0].altitude) {
      const candidate = floorsWithAlt[0].value;
      if (candidate !== selectedFloor) setSelectedFloor(candidate);
      return;
    }

    const found = floorsWithAlt.slice(0, -1).find((cur, i) => {
      const next = floorsWithAlt[i + 1];
      return altitude >= cur.altitude && altitude < next.altitude;
    });
    const chosen = found
      ? found.value
      : floorsWithAlt[floorsWithAlt.length - 1].value;

    if (chosen !== selectedFloor) {
      setSelectedFloor(chosen);
    }
  }, [isDynamic, altitude, altitudeAccuracy, selectedFloor, isInsideBuilding]);

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
        setDialogType("locationServicesDisabled");
        setDialogVisible(true);
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

      setDialogType("enableLocation");
      setDialogVisible(true);
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
            </View>
            <Text style={styles.headerDescription}>
              Select a floor to view evacuation routes
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.button,
              { opacity: awaitingAltitude ? 0.7 : isOffline ? 0.9 : 1 },
            ]}
            onPress={awaitingAltitude ? cancelAwaiting : toggleDynamicFloorPlan}
            disabled={awaitingAltitude}
            aria-disabled={awaitingAltitude}
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
              Offline: GPS works without internet but it may take longer to get
              an initial location.
            </Text>
          ) : null}
          {isDynamic ? (
            <>
              <View style={styles.floorPlanImage}>
                {isInsideBuilding === false ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>
                      You are outside the building area. Dynamic floor plan is
                      only available while inside the building.
                    </Text>
                  </View>
                ) : awaitingAltitude && altitude == null && !altitudeError ? (
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
      <Dialog
        visible={dialogVisible}
        title={
          dialogType === "locationServicesDisabled"
            ? "Location services disabled"
            : dialogType === "enableLocation"
            ? "Enable Location"
            : dialogType === "locationPermissionNeeded"
            ? "Location permission needed"
            : dialogType === "permissionDenied"
            ? "Permission denied"
            : ""
        }
        titleStyle={[styles.headerText, { textAlign: "center" }]}
        dialogStyle={styles.dialog}
        contentStyle={{ paddingTop: 8 }}
        onTouchOutside={() => setDialogVisible(false)}
        onRequestClose={() => setDialogVisible(false)}
        contentInsetAdjustmentBehavior="never"
        animationType="fade"
      >
        <View>
          <Text style={[styles.settingsText, { textAlign: "center" }]}>
            {dialogType === "locationServicesDisabled"
              ? "Your device's location services are turned off. Please enable them to use the dynamic floor plan."
              : dialogType === "enableLocation"
              ? "Allow this app to access your device location so we can show a dynamic floor plan based on your altitude."
              : dialogType === "locationPermissionNeeded"
              ? "To show a live dynamic floor plan the app needs Location access. Please enable it in your device settings."
              : dialogType === "permissionDenied"
              ? "Location permission was denied. You can retry to grant it."
              : ""}
          </Text>
          <View
            style={{
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              marginTop: 14,
            }}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.button,
                {
                  backgroundColor:
                    dialogType === "locationServicesDisabled" ||
                    dialogType === "locationPermissionNeeded"
                      ? "#193867"
                      : dialogType === "permissionDenied"
                      ? "#193867"
                      : "#193867",
                  marginBottom: 0,
                },
              ]}
              onPress={async () => {
                if (dialogType === "locationServicesDisabled") {
                  try {
                    Linking.openSettings();
                  } catch {}
                  setDialogVisible(false);
                } else if (dialogType === "enableLocation") {
                  // Continue logic
                  try {
                    setAltitudeError(null);
                    startAwaitingAltitude(4000, true);
                    setIsDynamic(true);
                    const result = await ensureWatcherStarted?.({
                      promptIfNeeded: true,
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
                      setDialogVisible(false);
                      return;
                    }

                    setAwaitingAltitude(false);
                    setIsDynamic(false);

                    const currentAfter =
                      await Location.getForegroundPermissionsAsync();
                    if (currentAfter.canAskAgain === false) {
                      setAltitudeError("permissionDenied");
                      setDialogType("locationPermissionNeeded");
                      // setDialogVisible(true); already visible
                    } else {
                      setAltitudeError("permissionDenied");
                      setDialogType("permissionDenied");
                      // setDialogVisible(true);
                    }
                  } catch {}
                } else if (dialogType === "locationPermissionNeeded") {
                  try {
                    Linking.openSettings();
                  } catch {}
                  setDialogVisible(false);
                } else if (dialogType === "permissionDenied") {
                  // Retry logic
                  try {
                    startAwaitingAltitude(4000, false);
                    const permRetry = await ensureWatcherStarted?.({
                      promptIfNeeded: true,
                      attempts: isOffline ? 4 : 2,
                      waitForAltitudeMs: isOffline ? 14000 : 4000,
                    });
                    clearAwaitingTimeout();
                    if (permRetry?.success) {
                      setIsDynamic(true);
                      try {
                        await SecureStore.setItemAsync(
                          "DYNAMIC_FLOOR_PLAN_ENABLED",
                          "true"
                        );
                      } catch {}
                      setDialogVisible(false);
                      return;
                    }
                    setAwaitingAltitude(false);
                    setAltitudeError("permissionDenied");
                    setDialogVisible(false);
                  } catch {
                    clearAwaitingTimeout();
                    setAwaitingAltitude(false);
                    setDialogVisible(false);
                  }
                }
              }}
            >
              <Text style={styles.buttonText}>
                {dialogType === "locationServicesDisabled" ||
                dialogType === "locationPermissionNeeded"
                  ? "Open Settings"
                  : dialogType === "enableLocation"
                  ? "Continue"
                  : dialogType === "permissionDenied"
                  ? "Retry"
                  : "Continue"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.outlineButton,
                { width: "100%", alignItems: "center" },
              ]}
              onPress={() => setDialogVisible(false)}
            >
              <Text style={[styles.buttonText, { color: "#000" }]}>
                {dialogType === "permissionDenied" ? "OK" : "Cancel"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Dialog>
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
});
