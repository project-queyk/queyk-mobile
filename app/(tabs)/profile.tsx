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
  const [pushNotificationIsEnabled, setPushNotificationIsEnabled] = useState(
    accountData?.pushNotification || false
  );

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

  const {
    mutate: updateEmailNotification,
    isPending: emailNotificationUpdateIsLoading,
  } = useMutation({
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
        throw new Error("Failed to update email notification preference");
      }

      const data = await response.json();
      setEmailNotificationIsEnabled(() => data.data.alertNotification);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", accountData?.id] });
    },
  });

  const {
    mutate: updatePushNotification,
    isPending: pushNotificationUpdateIsLoading,
  } = useMutation({
    mutationFn: async (newValue: boolean) => {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/v1/api/users/${userData?.data.id}/push-notifications`,
        {
          method: "PATCH",
          body: JSON.stringify({
            pushNotification: newValue,
          }),
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_USER_TOKEN}`,
            "Token-Type": "user",
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update push notification preference");
      }

      const data = await response.json();
      console.log(data);
      setPushNotificationIsEnabled(() => data.data.pushNotification);
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
            updateEmailNotification(!currentValue);
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
            const currentValue = userData?.data?.pushNotification || false;
            updatePushNotification(!currentValue);
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
        </Card>
      )}
      <View>
        <Card>
          <View style={styles.cardContent}>
            <Text style={styles.headerText}>Settings</Text>
            <View style={styles.settingsItem}>
              <Text style={styles.settingsText}>
                Email alerts for earthquake activity
              </Text>
              <TouchableOpacity
                onPress={toggleEmailNotificationAlert}
                activeOpacity={0.9}
                disabled={emailNotificationUpdateIsLoading}
                style={{ marginTop: 4 }}
              >
                <Switch
                  trackColor={{ false: "#e5e5e5", true: "#193867" }}
                  thumbColor={
                    emailNotificationIsEnabled ? "#ffffff" : "#f4f3f4"
                  }
                  ios_backgroundColor="#3e3e3e"
                  value={emailNotificationIsEnabled}
                  disabled
                />
              </TouchableOpacity>
            </View>
            <View style={styles.settingsItem}>
              <Text style={styles.settingsText}>
                Push notifications for earthquake activity
              </Text>
              <TouchableOpacity
                onPress={togglePushNotificationAlert}
                activeOpacity={0.9}
                disabled={pushNotificationUpdateIsLoading}
                style={{ marginTop: 4 }}
              >
                <Switch
                  trackColor={{ false: "#e5e5e5", true: "#193867" }}
                  thumbColor={pushNotificationIsEnabled ? "#ffffff" : "#f4f3f4"}
                  ios_backgroundColor="#3e3e3e"
                  value={pushNotificationIsEnabled}
                  disabled
                  pointerEvents="none"
                />
              </TouchableOpacity>
            </View>
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
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
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
    width: "85%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingsText: {
    width: "100%",
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
