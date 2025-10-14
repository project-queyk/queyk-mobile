import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as FileSystem from "expo-file-system/legacy";
import { Image } from "expo-image";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { SafeAreaView } from "react-native-safe-area-context";

import { floors } from "@/utils/floors";
import { safetyGuidelines } from "@/utils/safety-guidelines";

import Card from "@/components/Card";

export default function EvacuationPlan() {
  const [selectedFloor, setSelectedFloor] = useState("gymnasium");
  const [isFocus, setIsFocus] = useState(false);

  const currentFloor =
    floors.find((floor) => floor.value === selectedFloor) || floors[0];

  async function downloadEvacuationPlan() {
    try {
      Alert.alert(
        "Downloading",
        "Please wait while we prepare the evacuation plan..."
      );

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
      } else {
        Alert.alert(
          "Download Complete",
          `Evacuation plan downloaded successfully!`
        );
      }
    } catch (error) {
      console.error("Error downloading evacuation plan:", error);
      Alert.alert(
        "Download Error",
        "Failed to download the evacuation plan. Please check your internet connection and try again."
      );
    }
  }

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
                style={styles.secondaryButton}
                onPress={downloadEvacuationPlan}
              >
                <MaterialIcons name="get-app" size={16} color="#212529" />
              </TouchableOpacity>
            </View>
            <Text style={styles.headerDescription}>
              Select a floor to view evacuation routes
            </Text>
          </View>
          <View
            style={{
              borderColor: "#e5e5e5",
              height: 40,
              borderWidth: 1,
              borderRadius: 6,
              padding: 8,
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
        </Card>
        <View style={{ marginBottom: 12 }}>
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
  cardContent: { marginTop: 14 },
  secondaryButton: {
    borderColor: "#e5e5e5",
    borderWidth: 1,
    borderRadius: 6,
    backgroundColor: "#f1f3f5",
    padding: 8,
  },
  floorPlanImage: { width: "100%", aspectRatio: 1280 / 720, marginTop: 12 },
  bulletItemTitle: {
    fontSize: 16,
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
});
