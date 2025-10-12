import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";

import Card from "@/components/Card";

export default function Profile() {
  const { userData: accountData, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [emailNotificationIsEnabled, setEmailNotificationIsEnabled] = useState(
    accountData?.alertNotification || false
  );
  const [pushNotificationIsEnabled, setPushNotificationIsEnabled] =
    useState(false);

  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      Alert.alert("Error", "Failed to sign out.");
    }
  }

  const { data: userData } = useQuery({
    queryKey: ["user", accountData?.id],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/v1/api/users/${accountData?.id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_USER_TOKEN}`,
            "Token-Type": "user",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch user data");
      }

      const data = await response.json();
      return data;
    },
  });

  const { mutate, isPending: emailNotificationUpdateIsLoading } = useMutation({
    mutationFn: async (newValue: boolean) => {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/v1/api/users/${userData?.data.id}/notifications`,
        {
          method: "PATCH",
          body: JSON.stringify({
            alertNotification: newValue,
          }),
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_USER_TOKEN}`,
            "Token-Type": "user",
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update notification preference");
      }

      const data = await response.json();
      setEmailNotificationIsEnabled(() => data.data.alertNotification);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", accountData?.id] });
    },
  });

  function toggleEmailNotificationAlert() {
    Alert.alert(
      emailNotificationIsEnabled
        ? "Disable Email Notifications?"
        : "Enable Email Notifications?",
      emailNotificationIsEnabled
        ? "You will no longer receive email alerts when earthquake activity is detected."
        : "You will receive email alerts when earthquake activity is detected.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Continue",
          onPress: () => {
            const currentValue = userData?.data?.alertNotification || false;
            mutate(!currentValue);
          },
        },
      ]
    );
  }

  function togglePushNotificationAlert() {
    Alert.alert(
      pushNotificationIsEnabled
        ? "Disable Push Notifications?"
        : "Enable Push Notifications?",
      pushNotificationIsEnabled
        ? "You will no longer receive push alerts when earthquake activity is detected."
        : "You will receive push alerts when earthquake activity is detected.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Continue",
          onPress: () => {
            setPushNotificationIsEnabled((prev) => !prev);
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      style={{
        flex: 1,
        backgroundColor: "#F2F4F7",
        paddingHorizontal: 16,
        gap: 12,
      }}
    >
      {accountData && (
        <Card>
          <View style={styles.cardTitle}>
            <Image
              source={{ uri: accountData.profileImage }}
              style={styles.profileImage}
              contentFit="contain"
            />
            <View style={{ flex: 1 }}>
              <Text
                style={styles.profileName}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {accountData.name}
              </Text>
              <Text
                style={styles.profileEmail}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {accountData.email}
              </Text>
            </View>
          </View>
        </Card>
      )}
      <View>
        <Card>
          <View style={styles.cardContent}>
            <Text style={styles.headerText}>Settings</Text>
            <TouchableOpacity
              style={styles.settingsItem}
              onPress={toggleEmailNotificationAlert}
              activeOpacity={0.9}
              disabled={emailNotificationUpdateIsLoading}
            >
              <Text style={styles.settingsText}>
                Email alerts for earthquake activity
              </Text>
              <Switch
                trackColor={{ false: "#e5e5e5", true: "#193867" }}
                thumbColor={emailNotificationIsEnabled ? "#ffffff" : "#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
                value={emailNotificationIsEnabled}
                disabled
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingsItem}
              onPress={togglePushNotificationAlert}
              activeOpacity={0.9}
              disabled={emailNotificationUpdateIsLoading}
            >
              <Text style={styles.settingsText}>
                Push notifications for earthquake activity
              </Text>
              <Switch
                trackColor={{ false: "#e5e5e5", true: "#193867" }}
                thumbColor={pushNotificationIsEnabled ? "#ffffff" : "#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
                value={pushNotificationIsEnabled}
                disabled
              />
            </TouchableOpacity>
          </View>
        </Card>
      </View>
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.button}
        onPress={handleSignOut}
      >
        <Text style={styles.buttonText}>Log out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cardTitle: {
    flexDirection: "row",
    gap: 4,
  },
  cardContent: {
    gap: 8,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 9999,
  },
  profileName: {
    fontSize: 16,
    color: "#212529",
    fontFamily: Platform.select({
      android: "PlusJakartaSans_600SemiBold",
      ios: "PlusJakartaSans-SemiBold",
    }),
  },
  profileEmail: {
    fontSize: 12,
    color: "#565b60ff",
    fontFamily: Platform.select({
      android: "PlusJakartaSans_600SemiBold",
      ios: "PlusJakartaSans-SemiBold",
    }),
  },
  headerText: {
    fontSize: 18,
    color: "#212529",
    fontFamily: Platform.select({
      android: "PlusJakartaSans_600SemiBold",
      ios: "PlusJakartaSans-SemiBold",
    }),
  },
  settingsItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingsText: {
    fontSize: 14,
    color: "#212529",
    fontFamily: Platform.select({
      android: "PlusJakartaSans_500Medium",
      ios: "PlusJakartaSans-Medium",
    }),
  },
  button: {
    backgroundColor: "#e7000b",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 16,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
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
});
