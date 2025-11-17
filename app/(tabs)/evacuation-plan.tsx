import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system/legacy";
import { Image } from "expo-image";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
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
import { floors, getFloorImage } from "@/utils/floors";
import { safetyGuidelines } from "@/utils/safety-guidelines";

import Card from "@/components/Card";

function CameraModal({
  visible,
  onClose,
  onFloorSelect,
  onSetIsGif,
}: {
  visible: boolean;
  onClose: () => void;
  onFloorSelect: (floorValue: string) => void;
  onSetIsGif: (value: React.SetStateAction<boolean>) => void;
}) {
  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 15,
            borderBottomWidth: 1,
            borderBottomColor: "#e5e5e5",
          }}
        >
          <Pressable onPress={onClose}>
            <Text style={styles.confirmButton}>Close</Text>
          </Pressable>
        </View>

        <View
          style={{
            flex: 1,
            paddingHorizontal: 20,
            paddingTop: 20,
          }}
        >
          <Text style={styles.headerText}>Scan QR Code</Text>
          <View
            style={{
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View style={styles.cameraContainer}>
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{
                  barcodeTypes: ["qr"],
                }}
                onBarcodeScanned={({ data }) => {
                  try {
                    const floorWithUuid = floors.find(
                      (floor) => floor.id === data
                    );
                    if (floorWithUuid) {
                      onFloorSelect(floorWithUuid.value);
                      onClose();
                      onSetIsGif(true);
                    }
                  } catch {}
                }}
              />
              <View style={styles.scanOverlay}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export default function EvacuationPlan() {
  const { isOffline } = useNetworkStatus();
  const [selectedFloor, setSelectedFloor] = useState<string>(
    floors[0]?.value ?? ""
  );
  const [isFocus, setIsFocus] = useState(false);
  const [isDynamic, setIsDynamic] = useState(false);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogType, setDialogType] = useState<string | null>(null);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [isCameraVisible, setIsCameraVisible] = useState(false);
  const [isGif, setIsGif] = useState(false);

  const isCameraPermissionGranted = Boolean(cameraPermission?.granted);

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
      startAwaitingAltitude(2000, false);
      try {
        const res = await ensureWatcherStarted?.({
          promptIfNeeded: false,
          attempts: isOffline ? 3 : 1,
          waitForAltitudeMs: isOffline ? 8000 : 2000,
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

  const buildingBounds = useMemo(
    () => ({
      minLat: 14.767674,
      maxLat: 14.768133,
      minLon: 121.07969,
      maxLon: 121.079834,
    }),
    []
  );

  const isPointInBuilding = useCallback(
    (point: { lat: number; lon: number }) => {
      return (
        point.lat >= buildingBounds.minLat &&
        point.lat <= buildingBounds.maxLat &&
        point.lon >= buildingBounds.minLon &&
        point.lon <= buildingBounds.maxLon
      );
    },
    [
      buildingBounds.maxLat,
      buildingBounds.maxLon,
      buildingBounds.minLat,
      buildingBounds.minLon,
    ]
  );

  const calculateUserPosition = useCallback(
    (userLat: number, userLon: number) => {
      const latPercent =
        (userLat - buildingBounds.minLat) /
        (buildingBounds.maxLat - buildingBounds.minLat);
      const lonPercent =
        (userLon - buildingBounds.minLon) /
        (buildingBounds.maxLon - buildingBounds.minLon);

      const x = lonPercent * 100;
      const y = (1 - latPercent) * 100;

      return {
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
      };
    },
    [buildingBounds]
  );

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
      const inside = isPointInBuilding({ lat: latitude, lon: longitude });
      setIsInsideBuilding(inside);
    } catch {
      setIsInsideBuilding(null);
    }
  }, [isDynamic, latitude, longitude, isPointInBuilding]);

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

    let selectedFloorValue = floorsWithAlt[0].value;

    if (altitude <= floorsWithAlt[0].altitude + 1.5) {
      selectedFloorValue = floorsWithAlt[0].value;
    } else if (
      altitude >=
      floorsWithAlt[floorsWithAlt.length - 1].altitude - 1.0
    ) {
      selectedFloorValue = floorsWithAlt[floorsWithAlt.length - 1].value;
    } else {
      for (let i = 0; i < floorsWithAlt.length - 1; i++) {
        const currentFloor = floorsWithAlt[i];
        const nextFloor = floorsWithAlt[i + 1];
        const midpoint = (currentFloor.altitude + nextFloor.altitude) / 2;

        if (altitude > currentFloor.altitude - 1.0 && altitude <= midpoint) {
          selectedFloorValue = currentFloor.value;
          break;
        } else if (altitude > midpoint && altitude < nextFloor.altitude - 1.0) {
          selectedFloorValue = nextFloor.value;
          break;
        }
      }
    }

    if (selectedFloorValue !== selectedFloor) {
      setSelectedFloor(selectedFloorValue);
    }
  }, [isDynamic, altitude, isInsideBuilding, selectedFloor]);

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
      startAwaitingAltitude(2000, true);
      setIsDynamic(true);
      setIsGif(true);

      if (current.status === "granted") {
        try {
          const result = await ensureWatcherStarted?.({
            promptIfNeeded: false,
            attempts: isOffline ? 3 : 1,
            waitForAltitudeMs: isOffline ? 8000 : 2000,
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

              startAwaitingAltitude(6000, false);
              try {
                const res = await ensureWatcherStarted?.({
                  promptIfNeeded: false,
                  attempts: isOffline ? 3 : 1,
                  waitForAltitudeMs: isOffline ? 10000 : 3000,
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
              setIsGif(true);
            } else {
              setIsDynamic(true);
              setIsGif(true);
            }
          } catch {
            setIsDynamic(true);
            setIsGif(true);
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
          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.secondaryButton,
              {
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginTop: 12,
              },
            ]}
            onPress={() => {
              requestCameraPermission();
              if (isCameraPermissionGranted) {
                setIsCameraVisible((prev) => !prev);
              }
            }}
          >
            <MaterialIcons name="qr-code-scanner" size={16} color="#212529" />
            <Text style={[styles.buttonText, { color: "#212529" }]}>
              Scan a QR Code
            </Text>
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
                {(awaitingAltitude && altitude == null && !altitudeError) ||
                (isDynamic &&
                  latitude === null &&
                  longitude === null &&
                  !altitudeError) ? (
                  <View style={styles.imageSkeleton} />
                ) : altitudeError ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>
                      {altitudeError === "permissionDenied"
                        ? "Location permission denied. Please enable Location for this app."
                        : "Unable to determine altitude. Please try again."}
                    </Text>
                    <Text
                      style={{
                        marginTop: 8,
                        fontSize: 10,
                        textAlign: "center",
                        color: "#565b60",
                        fontFamily: Platform.select({
                          android: "PlusJakartaSans_400Regular",
                          ios: "PlusJakartaSans-Regular",
                        }),
                      }}
                    >
                      Tap the image to {isGif ? "hide" : "show"} evacuation
                      arrows
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
                ) : isInsideBuilding === false ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>
                      You appear to be outside the building area. Please move
                      inside the building to use the dynamic floor plan.
                    </Text>
                    <View style={{ flexDirection: "row", marginTop: 8 }}>
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={handleRetry}
                        style={[
                          styles.secondaryButton,
                          { paddingHorizontal: 12 },
                        ]}
                      >
                        <Text style={styles.buttonTextSmall}>Retry</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View
                    style={{
                      position: "relative",
                      width: "100%",
                      height: "100%",
                    }}
                  >
                    <Image
                      source={getFloorImage(currentFloor.value, true)}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="contain"
                      alt={currentFloor.label}
                    />
                    {latitude !== null &&
                      longitude !== null &&
                      isInsideBuilding && (
                        <View
                          style={[
                            styles.userLocationPin,
                            {
                              left: `${
                                calculateUserPosition(latitude, longitude).x
                              }%`,
                              top: `${
                                calculateUserPosition(latitude, longitude).y
                              }%`,
                            },
                          ]}
                        >
                          <Ionicons
                            name="location"
                            size={24}
                            color="#FF0000"
                            style={{
                              shadowColor: "#000",
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.3,
                              shadowRadius: 3,
                            }}
                          />
                        </View>
                      )}
                  </View>
                )}
              </View>
              {isGif && isInsideBuilding && (
                <>
                  <Text
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      textAlign: "center",
                      color: "#e7000b",
                      fontFamily: Platform.select({
                        android: "PlusJakartaSans_600SemiBold",
                        ios: "PlusJakartaSans-SemiBold",
                      }),
                    }}
                  >
                    Emergency Exit
                  </Text>
                  <Text
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      textAlign: "center",
                      color: "#f2b321",
                      fontFamily: Platform.select({
                        android: "PlusJakartaSans_600SemiBold",
                        ios: "PlusJakartaSans-SemiBold",
                      }),
                    }}
                  >
                    Normal Lane
                  </Text>
                </>
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
              <Text
                style={{
                  marginTop: 10,
                  fontSize: 10,
                  textAlign: "center",
                  color: "#565b60",
                  fontFamily: Platform.select({
                    android: "PlusJakartaSans_400Regular",
                    ios: "PlusJakartaSans-Regular",
                  }),
                }}
              >
                Tap the image to {isGif ? "hide" : "show"} evacuation arrows
              </Text>
              <Pressable
                style={styles.floorPlanImage}
                onPress={() => setIsGif((prev) => !prev)}
              >
                <Image
                  source={getFloorImage(currentFloor.value, isGif)}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="contain"
                  alt={currentFloor.label}
                />
              </Pressable>
              {isGif && (
                <>
                  <Text
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      textAlign: "center",
                      color: "#e7000b",
                      fontFamily: Platform.select({
                        android: "PlusJakartaSans_600SemiBold",
                        ios: "PlusJakartaSans-SemiBold",
                      }),
                    }}
                  >
                    Emergency Exit
                  </Text>
                  <Text
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      textAlign: "center",
                      color: "#f2b321",
                      fontFamily: Platform.select({
                        android: "PlusJakartaSans_600SemiBold",
                        ios: "PlusJakartaSans-SemiBold",
                      }),
                    }}
                  >
                    Normal Lane
                  </Text>
                </>
              )}
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
      <CameraModal
        visible={isCameraVisible && isCameraPermissionGranted}
        onClose={() => {
          setIsCameraVisible(false);
        }}
        onFloorSelect={(floorValue) => {
          setSelectedFloor(floorValue);
          setIsDynamic(false);
        }}
        onSetIsGif={setIsGif}
      />
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
                  try {
                    setAltitudeError(null);
                    startAwaitingAltitude(2000, true);
                    setIsDynamic(true);
                    setIsGif(true);
                    const result = await ensureWatcherStarted?.({
                      promptIfNeeded: true,
                      attempts: isOffline ? 3 : 1,
                      waitForAltitudeMs: isOffline ? 8000 : 2000,
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
                    } else {
                      setAltitudeError("permissionDenied");
                      setDialogType("permissionDenied");
                    }
                  } catch {}
                } else if (dialogType === "locationPermissionNeeded") {
                  try {
                    Linking.openSettings();
                  } catch {}
                  setDialogVisible(false);
                } else if (dialogType === "permissionDenied") {
                  try {
                    startAwaitingAltitude(2000, false);
                    const permRetry = await ensureWatcherStarted?.({
                      promptIfNeeded: true,
                      attempts: isOffline ? 3 : 1,
                      waitForAltitudeMs: isOffline ? 8000 : 2000,
                    });
                    clearAwaitingTimeout();
                    if (permRetry?.success) {
                      setIsDynamic(true);
                      setIsGif(true);
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
  modalLabel: {
    color: "#565b60ff",
    marginVertical: 8,
    fontFamily: Platform.select({
      android: "PlusJakartaSans_500Medium",
      ios: "PlusJakartaSans-Medium",
    }),
  },
  confirmButton: {
    color: "#193867",
    fontFamily: Platform.select({
      android: "PlusJakartaSans_600SemiBold",
      ios: "PlusJakartaSans-SemiBold",
    }),
  },
  cancelButton: {
    color: "#193867",
    fontFamily: Platform.select({
      android: "PlusJakartaSans_500Medium",
      ios: "PlusJakartaSans-Medium",
    }),
  },
  camera: {
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "95%",
    zIndex: 1000,
    borderRadius: 16,
  },
  cameraContainer: {
    position: "relative",
    width: "100%",
    height: "95%",
    borderRadius: 16,
    overflow: "hidden",
  },
  scanBox: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -125 }, { translateY: -125 }],
    borderWidth: 3,
    borderColor: "white",
    borderRadius: 12,
  },
  scanOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 250,
    height: 250,
    transform: [{ translateX: "-50%" }, { translateY: "-55%" }],
    zIndex: 1001,
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: "#e5e5e5",
    borderWidth: 4,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: -2,
    right: -2,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 8,
  },
  userLocationPin: {
    position: "absolute",
    transform: [{ translateX: -12 }, { translateY: -24 }],
    zIndex: 1000,
    elevation: 5,
  },
});
