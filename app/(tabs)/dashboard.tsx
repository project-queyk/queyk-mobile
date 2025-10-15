import { useDateRange } from "@marceloterreiro/flash-calendar";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DatePicker from "react-native-date-picker";
import { LineChart } from "react-native-gifted-charts";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { formatSeismicMonitorDateFromFlash } from "@/utils/date-adapter";

import Card from "@/components/Card";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export type ReadingData = {
  battery: number;
  createdAt: string;
  id: string;
  siAverage: number;
  siMaximum: number;
  siMinimum: number;
  signalStrength: string;
};

type DatePickerModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelectDates: (startId: string, endId: string) => void;
  minDateId?: string;
  maxDateId?: string;
  initialStartId: string;
  initialEndId: string;
};

function DatePickerModal({
  visible,
  onClose,
  onSelectDates,
  minDateId,
  maxDateId,
  initialStartId,
  initialEndId,
}: DatePickerModalProps) {
  const dateToString = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const [startDate, setStartDate] = useState(new Date(initialStartId));
  const [endDate, setEndDate] = useState(new Date(initialEndId));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setStartDate(new Date(initialStartId));
      setEndDate(new Date(initialEndId));
    }
  }, [visible, initialStartId, initialEndId]);

  function handleDone() {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 30) {
      alert("Please select a date range of 30 days or less.");
      return;
    }
    onSelectDates(dateToString(startDate), dateToString(endDate));
  }

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
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 15,
            borderBottomWidth: 1,
            borderBottomColor: "#e5e5e5",
          }}
        >
          <Pressable onPress={onClose}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </Pressable>
          <Pressable onPress={handleDone}>
            <Text style={styles.confirmButton}>Done</Text>
          </Pressable>
        </View>

        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }}>
          <Text style={styles.headerText}>Select Date Range</Text>
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.modalLabel}>Start Date:</Text>
            <TouchableOpacity
              style={styles.selectBox}
              activeOpacity={0.9}
              onPress={() => setShowStartPicker(true)}
            >
              <MaterialIcons
                name="calendar-today"
                size={16}
                color="#212529"
                style={{ marginTop: 1 }}
              />
              <Text style={styles.selectText}>
                {startDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "2-digit",
                  year: "numeric",
                })}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.modalLabel}>End Date:</Text>
            <TouchableOpacity
              style={styles.selectBox}
              onPress={() => setShowEndPicker(true)}
              activeOpacity={0.9}
            >
              <MaterialIcons
                name="calendar-today"
                size={16}
                color="#212529"
                style={{ marginTop: 1 }}
              />
              <Text style={styles.selectText}>
                {endDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "2-digit",
                  year: "numeric",
                })}
              </Text>
            </TouchableOpacity>
          </View>

          <DatePicker
            modal
            open={showStartPicker}
            date={startDate}
            mode="date"
            minimumDate={
              minDateId ? new Date(minDateId) : new Date("2025-08-29")
            }
            maximumDate={maxDateId ? new Date(maxDateId) : endDate}
            onConfirm={(date: Date) => {
              setStartDate(date);
              if (date > endDate) {
                setEndDate(date);
              }
              setShowStartPicker(false);
            }}
            onCancel={() => setShowStartPicker(false)}
          />
          <DatePicker
            modal
            open={showEndPicker}
            date={endDate}
            mode="date"
            minimumDate={startDate}
            maximumDate={maxDateId ? new Date(maxDateId) : undefined}
            onConfirm={(date: Date) => {
              const diffTime = Math.abs(date.getTime() - startDate.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
              if (date >= startDate && diffDays <= 5) {
                setEndDate(date);
              } else {
                alert("Please select a date range of 4 days or less.");
              }
              setShowEndPicker(false);
            }}
            onCancel={() => setShowEndPicker(false)}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export default function Dashboard() {
  const { userData } = useAuth();
  const params = useLocalSearchParams();
  const [persistedFirstDate, setPersistedFirstDate] = useState<
    Date | undefined
  >();
  const hasSetPersistedDate = useRef(false);
  const todayDateId = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const [customDateRange, setCustomDateRange] = useState<{
    startId?: string;
    endId?: string;
  } | null>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const todayLocal = `${year}-${month}-${day}`;
    return {
      startId: todayLocal,
      endId: todayLocal,
    };
  });
  const [isDatePickerModalVisible, setIsDatePickerModalVisible] =
    useState(false);

  const dateRangeConfig = useMemo(
    () => ({
      startId: customDateRange?.startId || todayDateId,
      endId: customDateRange?.endId || todayDateId,
    }),
    [customDateRange?.startId, customDateRange?.endId, todayDateId]
  );

  const { dateRange } = useDateRange(dateRangeConfig);

  useEffect(() => {
    if (params.selectedStartId && params.selectedEndId) {
      setCustomDateRange({
        startId: params.selectedStartId as string,
        endId: params.selectedEndId as string,
      });
    }
  }, [params.selectedStartId, params.selectedEndId]);

  const {
    data: readingsData,
    isLoading: readingsDataIsLoading,
    refetch: refetchReadingsData,
    isRefetching: isRefetchingReadingsData,
  } = useQuery({
    queryKey: ["readings", customDateRange?.startId, customDateRange?.endId],
    queryFn: async () => {
      if (!customDateRange?.startId && !customDateRange?.endId) return null;

      let queryParams = [];
      if (customDateRange?.startId) {
        queryParams.push(
          `startDate=${encodeURIComponent(customDateRange.startId)}`
        );
      }
      if (customDateRange?.endId) {
        queryParams.push(
          `endDate=${encodeURIComponent(customDateRange.endId)}`
        );
      }

      const queryString =
        queryParams.length > 0 ? `?${queryParams.join("&")}` : "";

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/v1/api/readings${queryString}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_ADMIN_TOKEN}`,
            "Content-Type": "application/json",
            "Token-Type": "admin",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch readings");
      }

      const data = await response.json();
      return data;
    },
    enabled:
      !!(dateRange?.startId || dateRange?.endId) && userData?.role === "admin",
  });

  const {
    data: earthquakesData,
    isLoading: earthquakeDataIsLoading,
    refetch: refetchEarthquakesData,
    isRefetching: isRefetchingEarthquakesData,
  } = useQuery({
    queryKey: ["earthquakes"],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/v1/api/earthquakes`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_ADMIN_TOKEN}`,
            "Content-Type": "application/json",
            "Token-Type": "admin",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch earthquake records");
      }

      return response.json();
    },
    enabled: userData?.role === "admin",
  });

  useEffect(() => {
    if (readingsData?.firstDate && !hasSetPersistedDate.current) {
      setPersistedFirstDate(new Date(readingsData.firstDate));
      hasSetPersistedDate.current = true;
    }
  }, [readingsData?.firstDate]);

  const calendarMinDateId = useMemo(() => {
    return persistedFirstDate?.toISOString().split("T")[0];
  }, [persistedFirstDate]);

  const calendarMaxDateId = todayDateId;

  function formatDate(dateId: string) {
    const date = new Date(dateId);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  }

  const readings = useMemo(() => {
    return (readingsData?.data as ReadingData[]) || [];
  }, [readingsData?.data]);

  const batteryLevel = readingsData?.batteryLevel || 0;
  const aiSummary = readingsData?.aiSummary || "";

  const getBatteryColor = (level: number) => {
    if (level >= 70) return "#00c950";
    if (level >= 30) return "#f0b100";
    return "#fb2c36";
  };

  const peakMagnitude = useMemo(() => {
    if (!readings.length) return { value: 0, time: "--", fullDateTime: null };
    const peak = readings.reduce(
      (max, reading) => (reading.siMaximum > max.siMaximum ? reading : max),
      readings[0]
    );
    return {
      value: peak.siMaximum,
      time: new Date(peak.createdAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      fullDateTime: peak.createdAt,
    };
  }, [readings]);

  const avgMagnitude = useMemo(() => {
    if (!readings.length) return "0.00";
    const sum = readings.reduce((acc, reading) => acc + reading.siAverage, 0);
    return (sum / readings.length).toFixed(2);
  }, [readings]);

  const significantReadings = useMemo(() => {
    const SIGNIFICANT_THRESHOLD = 1.0;
    return readings.filter(
      (reading) => reading.siMaximum > SIGNIFICANT_THRESHOLD
    ).length;
  }, [readings]);

  const peakActivity = useMemo(() => {
    if (!readings.length)
      return { value: "--", siAverage: 0, fullDateTime: null };
    const peak = readings.reduce(
      (max, reading) => (reading.siAverage > max.siAverage ? reading : max),
      readings[0]
    );
    return {
      value: new Date(peak.createdAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      siAverage: peak.siAverage,
      fullDateTime: peak.createdAt,
    };
  }, [readings]);

  const filteredReadings = readings.filter(
    (r) => typeof r.siAverage === "number"
  );

  const mockChartData = Array.from({ length: 14 }, (_, i) => ({
    value: Number((Math.random() * 0.4 + 0.05).toFixed(3)),
    label: `10/${i + 1}/2025`,
  }));

  const chartDataAverage = readingsDataIsLoading
    ? mockChartData
    : filteredReadings.map((reading) => ({
        value: reading.siAverage,
        label: new Date(reading.createdAt).toLocaleDateString("en-US", {
          month: "2-digit",
          day: "2-digit",
        }),
      }));

  const chartDataMaximum = readingsDataIsLoading
    ? mockChartData.map((d) => ({
        ...d,
        value: Number((d.value + Math.random() * 0.4 + 0.1).toFixed(3)),
      }))
    : filteredReadings.map((reading) => ({
        value: reading.siMaximum,
        label: new Date(reading.createdAt).toLocaleDateString("en-US", {
          month: "2-digit",
          day: "2-digit",
        }),
      }));

  const chartDataMinimum = readingsDataIsLoading
    ? mockChartData.map((d) => ({
        ...d,
        value: Number(
          Math.max(0, d.value - Math.random() * 0.1 - 0.01).toFixed(3)
        ),
      }))
    : filteredReadings.map((reading) => ({
        value: reading.siMinimum,
        label: new Date(reading.createdAt).toLocaleDateString("en-US", {
          month: "2-digit",
          day: "2-digit",
        }),
      }));

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
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingBottom: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingReadingsData || isRefetchingEarthquakesData}
            onRefresh={async () => {
              await Promise.all([
                refetchReadingsData(),
                refetchEarthquakesData(),
              ]);
            }}
            colors={["#1a314c"]}
            tintColor="#1a314c"
          />
        }
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <TouchableOpacity
            style={styles.selectBox}
            activeOpacity={0.9}
            onPress={() => {
              setIsDatePickerModalVisible(true);
            }}
            disabled={false}
          >
            <MaterialIcons
              name="calendar-today"
              size={16}
              color="#212529"
              style={{ marginTop: 1 }}
            />
            <Text style={styles.selectText}>
              {customDateRange?.startId
                ? `${formatDate(customDateRange.startId)} - ${
                    customDateRange.endId
                      ? formatDate(customDateRange.endId)
                      : "Select end date"
                  }`
                : "Select date range"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} activeOpacity={0.9}>
            <MaterialIcons
              name="description"
              size={16}
              color="#F2F4F7"
              style={{ marginTop: 1 }}
            />
          </TouchableOpacity>
        </View>
        <Card>
          <View>
            <Text style={styles.headerText}>Peak SI Maximum</Text>
            <View>
              {readingsDataIsLoading ? (
                <View style={{ height: 32, width: 64 }}>
                  <View style={styles.cardValueSkeleton} />
                </View>
              ) : (
                <View style={{ flexDirection: "column" }}>
                  <Text style={styles.cardValue}>
                    {formatSeismicMonitorDateFromFlash(dateRange) &&
                    readings.length
                      ? peakMagnitude.value.toFixed(3)
                      : "--"}
                  </Text>
                  <Text style={styles.cardSubText}>
                    {formatSeismicMonitorDateFromFlash(dateRange) &&
                    readings.length
                      ? `at ${peakMagnitude.time}`
                      : "No data"}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Card>
        <Card>
          <View>
            <Text style={styles.headerText}>Average SI Reading</Text>
            <View>
              {readingsDataIsLoading ? (
                <View style={{ height: 32, width: 64 }}>
                  <View style={styles.cardValueSkeleton} />
                </View>
              ) : (
                <View style={{ flexDirection: "column" }}>
                  <Text style={styles.cardValue}>
                    {formatSeismicMonitorDateFromFlash(dateRange) &&
                    readings.length
                      ? avgMagnitude
                      : "--"}
                  </Text>
                  <Text style={styles.cardSubText}>
                    {formatSeismicMonitorDateFromFlash(dateRange) &&
                    readings.length
                      ? `across ${readings.length} readings`
                      : "No data"}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Card>
        <Card>
          <View>
            <Text style={styles.headerText}>Significant Activity Readings</Text>
            <View>
              {readingsDataIsLoading ? (
                <View style={{ height: 32, width: 64 }}>
                  <View style={styles.cardValueSkeleton} />
                </View>
              ) : (
                <View style={{ flexDirection: "column" }}>
                  <Text style={styles.cardValue}>
                    {formatSeismicMonitorDateFromFlash(dateRange) &&
                    readings.length
                      ? significantReadings
                      : "--"}
                  </Text>
                  <Text style={styles.cardSubText}>
                    {formatSeismicMonitorDateFromFlash(dateRange) &&
                    readings.length
                      ? `readings above threshold`
                      : "No data"}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Card>
        <Card>
          <View>
            <Text style={styles.headerText}>Peak Activity Time</Text>
            <View>
              {readingsDataIsLoading ? (
                <View style={{ height: 32, width: 64 }}>
                  <View style={styles.cardValueSkeleton} />
                </View>
              ) : (
                <View style={{ flexDirection: "column" }}>
                  <Text style={styles.cardValue}>
                    {formatSeismicMonitorDateFromFlash(dateRange) &&
                    readings.length &&
                    peakActivity.fullDateTime
                      ? new Date(peakActivity.fullDateTime).toLocaleTimeString(
                          "en-US",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )
                      : "--"}
                  </Text>
                  <Text style={styles.cardSubText}>
                    {formatSeismicMonitorDateFromFlash(dateRange) &&
                    readings.length &&
                    peakActivity.fullDateTime
                      ? `${new Date(
                          peakActivity.fullDateTime
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })} (${peakActivity.siAverage?.toFixed(3)} SI)`
                      : "No data"}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Card>
        <Card>
          <View
            style={{
              gap: 4,
              borderBottomColor: "#e5e5e5",
              borderBottomWidth: 1,
              paddingBottom: 16,
            }}
          >
            <Text style={styles.headerText}>Seismic Activity Monitor</Text>
            <Text style={styles.headerDescription}>
              Seismic readings{" "}
              {customDateRange?.startId
                ? `for ${formatDate(customDateRange.startId)} - ${
                    customDateRange.endId
                      ? formatDate(customDateRange.endId)
                      : ""
                  }`
                : "Select date range"}
            </Text>
            <Text style={styles.headerDescription}>
              Data averaged every 5 minutes
            </Text>
          </View>

          <View style={{ marginTop: 14 }}>
            {readingsDataIsLoading || filteredReadings.length > 0 ? (
              <View style={{ paddingHorizontal: 0 }}>
                <LineChart
                  thickness={3}
                  maxValue={
                    Math.max(
                      ...chartDataAverage.map((d) => d.value),
                      ...chartDataMaximum.map((d) => d.value),
                      ...chartDataMinimum.map((d) => d.value),
                      1
                    ) || 1
                  }
                  noOfSections={3}
                  areaChart
                  hideDataPoints
                  data={chartDataAverage}
                  data2={chartDataMaximum}
                  data3={chartDataMinimum}
                  color={readingsDataIsLoading ? "#d1d5db" : "#1a314c"}
                  color2={readingsDataIsLoading ? "#d1d5db" : "#ffcf5e"}
                  color3={readingsDataIsLoading ? "#d1d5db" : "#286892"}
                  curved
                  startFillColor={"#ffffff"}
                  endFillColor={"#ffffff"}
                  startOpacity={0.4}
                  endOpacity={0.4}
                  spacing={46}
                  hideRules
                  initialSpacing={28}
                  yAxisColor="#ffffff"
                  xAxisColor="#ffffff"
                  dataPointsHeight={12}
                  dataPointsWidth={12}
                  xAxisLabelTexts={chartDataAverage.map((d) => d.label)}
                  xAxisLabelTextStyle={{
                    color: "#212529",
                    fontFamily: Platform.select({
                      android: "PlusJakartaSans_400Regular",
                      ios: "PlusJakartaSans-Regular",
                    }),
                  }}
                  yAxisTextStyle={{
                    color: "#565b60ff",
                    fontFamily: Platform.select({
                      android: "PlusJakartaSans_500Medium",
                      ios: "PlusJakartaSans-Medium",
                    }),
                  }}
                />
              </View>
            ) : (
              <View style={{ height: 40, marginTop: 35 }}>
                <Text
                  style={{
                    color: "#212529",
                    textAlign: "center",
                    fontFamily: Platform.select({
                      android: "PlusJakartaSans_500Medium",
                      ios: "PlusJakartaSans-Medium",
                    }),
                  }}
                >
                  No data for selected range
                </Text>
              </View>
            )}
          </View>
        </Card>
        <Card variant="ai">
          <Text style={styles.headerText}>AI Summary</Text>
          <View>
            {readingsDataIsLoading ? (
              <View style={{ gap: 8, marginTop: 2 }}>
                <View style={[styles.aiSkeleton, { width: "100%" }]} />
                <View style={[styles.aiSkeleton, { width: "75%" }]} />
                <View style={[styles.aiSkeleton, { width: "50%" }]} />
              </View>
            ) : (
              <Text style={styles.aiSummaryText}>
                {formatSeismicMonitorDateFromFlash(dateRange) && aiSummary
                  ? aiSummary
                  : "No AI summary available for the selected period"}
              </Text>
            )}
          </View>
        </Card>
        <Card>
          <View>
            <Text style={styles.headerText}>Battery Level</Text>
            <View>
              {readingsDataIsLoading ? (
                <View style={{ height: 32, width: 64 }}>
                  <View style={styles.cardValueSkeleton} />
                </View>
              ) : (
                <View style={{ flexDirection: "column" }}>
                  <Text
                    style={[
                      styles.cardValue,
                      { color: getBatteryColor(batteryLevel) },
                    ]}
                  >
                    {batteryLevel ? `${batteryLevel}%` : "--"}
                  </Text>
                </View>
              )}
              <Text style={styles.cardSubText}>
                Current IoT sensor battery level
              </Text>
            </View>
          </View>
        </Card>
        <Card>
          <View
            style={{
              gap: 4,
              borderBottomColor: "#e5e5e5",
              borderBottomWidth: 1,
              paddingBottom: 16,
            }}
          >
            <Text style={styles.headerText}>Earthquake History</Text>
            <Text style={styles.headerDescription}>
              Historical earthquake events and intensity records over time
            </Text>
          </View>
          <View style={{ marginTop: 14 }}>
            {earthquakeDataIsLoading ? (
              <View style={{ paddingHorizontal: 0 }}>
                <LineChart
                  thickness={3}
                  maxValue={
                    Math.max(...mockChartData.map((d) => d.value), 1) || 1
                  }
                  noOfSections={3}
                  areaChart
                  hideDataPoints
                  data={mockChartData}
                  color="#d1d5db"
                  curved
                  startFillColor={"#ffffff"}
                  endFillColor={"#ffffff"}
                  startOpacity={0.4}
                  endOpacity={0.4}
                  spacing={46}
                  hideRules
                  initialSpacing={28}
                  yAxisColor="#ffffff"
                  xAxisColor="#ffffff"
                  dataPointsHeight={12}
                  dataPointsWidth={12}
                  xAxisLabelTexts={mockChartData.map((d) => d.label)}
                  xAxisLabelTextStyle={{
                    color: "#212529",
                    fontFamily: Platform.select({
                      android: "PlusJakartaSans_400Regular",
                      ios: "PlusJakartaSans-Regular",
                    }),
                  }}
                  yAxisTextStyle={{
                    color: "#565b60ff",
                    fontFamily: Platform.select({
                      android: "PlusJakartaSans_500Medium",
                      ios: "PlusJakartaSans-Medium",
                    }),
                  }}
                />
              </View>
            ) : earthquakesData.data.length > 0 ? (
              <View style={{ paddingHorizontal: 0 }}>
                <LineChart
                  thickness={3}
                  maxValue={
                    Math.max(
                      ...((
                        earthquakesData?.data as
                          | { magnitude: number }[]
                          | undefined
                      )?.map((d: { magnitude: number }) => d.magnitude) || [1]),
                      1
                    ) || 1
                  }
                  noOfSections={3}
                  areaChart
                  hideDataPoints
                  data={(
                    (earthquakesData?.data as
                      | { magnitude: number; createdAt: string }[]
                      | undefined) || []
                  ).map((quake: { magnitude: number; createdAt: string }) => ({
                    value: quake.magnitude,
                    label: new Date(quake.createdAt).toLocaleDateString(
                      "en-US",
                      {
                        month: "2-digit",
                        day: "2-digit",
                      }
                    ),
                  }))}
                  color={"#1a314c"}
                  curved
                  startFillColor={"#ffffff"}
                  endFillColor={"#ffffff"}
                  startOpacity={0.4}
                  endOpacity={0.4}
                  spacing={46}
                  hideRules
                  initialSpacing={28}
                  yAxisColor="#ffffff"
                  xAxisColor="#ffffff"
                  dataPointsHeight={12}
                  dataPointsWidth={12}
                  xAxisLabelTexts={(
                    (earthquakesData?.data as
                      | { createdAt: string }[]
                      | undefined) || []
                  ).map((quake: { createdAt: string }) =>
                    new Date(quake.createdAt).toLocaleDateString("en-US", {
                      month: "2-digit",
                      day: "2-digit",
                    })
                  )}
                  xAxisLabelTextStyle={{
                    color: "#212529",
                    fontFamily: Platform.select({
                      android: "PlusJakartaSans_400Regular",
                      ios: "PlusJakartaSans-Regular",
                    }),
                  }}
                  yAxisTextStyle={{
                    color: "#565b60ff",
                    fontFamily: Platform.select({
                      android: "PlusJakartaSans_500Medium",
                      ios: "PlusJakartaSans-Medium",
                    }),
                  }}
                />
              </View>
            ) : (
              <View style={{ height: 40, marginTop: 35 }}>
                <Text
                  style={{
                    color: "#212529",
                    textAlign: "center",
                    fontFamily: Platform.select({
                      android: "PlusJakartaSans_500Medium",
                      ios: "PlusJakartaSans-Medium",
                    }),
                  }}
                >
                  No data for selected range
                </Text>
              </View>
            )}
          </View>
        </Card>
      </ScrollView>

      <DatePickerModal
        visible={isDatePickerModalVisible}
        onClose={() => setIsDatePickerModalVisible(false)}
        onSelectDates={(startId, endId) => {
          setCustomDateRange({ startId, endId });
          setIsDatePickerModalVisible(false);
        }}
        minDateId={calendarMinDateId}
        maxDateId={calendarMaxDateId}
        initialStartId={customDateRange?.startId || todayDateId}
        initialEndId={customDateRange?.endId || todayDateId}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerText: {
    fontSize: 18,
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
  button: {
    backgroundColor: "#193867",
    padding: 12,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  cardValue: {
    fontSize: 22,
    fontFamily: Platform.select({
      android: "PlusJakartaSans_600SemiBold",
      ios: "PlusJakartaSans-SemiBold",
    }),
  },
  cardSubText: {
    color: "#565b60ff",
    marginTop: 4,
    fontFamily: Platform.select({
      android: "PlusJakartaSans_400Regular",
      ios: "PlusJakartaSans-Regular",
    }),
  },
  cardValueSkeleton: {
    height: 32,
    width: 64,
    backgroundColor: "#d1d5db",
    borderRadius: 4,
    marginTop: 2,
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
  selectBox: {
    borderColor: "#e5e5e5",
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    height: 40,
    marginTop: 4,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  selectText: {
    fontFamily: Platform.select({
      android: "PlusJakartaSans_500Medium",
      ios: "PlusJakartaSans-Medium",
    }),
  },
  aiSummaryText: {
    marginTop: 2,
    color: "#212529",
    fontSize: 14,
    fontFamily: Platform.select({
      android: "PlusJakartaSans_400Regular",
      ios: "PlusJakartaSans-Regular",
    }),
  },
  aiSkeleton: {
    height: 16,
    backgroundColor: "#d1d5db",
    borderRadius: 4,
  },
});
