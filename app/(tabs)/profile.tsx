import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Dialog } from "react-native-simple-dialogs";

import { useAuth } from "@/contexts/AuthContext";
import { useNetworkStatus } from "@/hooks/use-network-status";
import {
  requestPushNotificationPermissions,
  updatePushTokenInBackend,
} from "@/utils/pushNotifications";

import Card from "@/components/Card";

export default function Profile() {
  const { userData: accountData, signOut } = useAuth();
  const { isOffline } = useNetworkStatus();
  const queryClient = useQueryClient();
  const [emailNotificationIsEnabled, setEmailNotificationIsEnabled] = useState(
    accountData?.alertNotification || false
  );
  const [pushNotificationIsEnabled, setPushNotificationIsEnabled] = useState(
    Boolean(accountData?.pushNotification && accountData?.expoPushToken)
  );
  const [smsNotificationIsEnabled, setSmsNotificationIsEnabled] = useState(
    accountData?.smsNotification || false
  );
  const [alertDialogIsVisible, setAlertDialogIsVisible] = useState(false);
  const [alertDialogType, setAlertDialogType] = useState<
    "email" | "push" | "sms" | "remove" | "set" | "signout" | null
  >(null);
  const [phoneNumber, setPhoneNumber] = useState("");

  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      Alert.alert("Error", "Failed to sign out.");
    }
  }

  const {
    data: userData,
    refetch: refetchUserData,
    isRefetching: isRefetchingUserData,
  } = useQuery({
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

  useEffect(() => {
    if (userData?.data) {
      const backendEnabled = userData.data.pushNotification || false;
      const hasToken = Boolean(userData.data.expoPushToken);
      setPushNotificationIsEnabled(backendEnabled && hasToken);
    }
  }, [userData?.data]);

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
      let expoPushToken = "";

      if (newValue) {
        const permissionResult = await requestPushNotificationPermissions();

        if (!permissionResult.granted) {
          throw new Error("Push notification permissions were denied");
        }

        expoPushToken = permissionResult.token || "";

        if (expoPushToken && userData?.data.id) {
          await updatePushTokenInBackend(
            userData.data.id,
            expoPushToken,
            process.env.EXPO_PUBLIC_AUTH_TOKEN || ""
          );
        }

        if (!expoPushToken) {
          throw new Error("Failed to get push notification token");
        }
      }

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
      const shouldEnable = newValue
        ? Boolean(data.data.pushNotification && expoPushToken)
        : false;
      setPushNotificationIsEnabled(shouldEnable);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", accountData?.id] });
    },
    onError: (error) => {
      const currentBackendValue = userData?.data?.pushNotification || false;
      const hasValidToken = Boolean(userData?.data?.expoPushToken);
      setPushNotificationIsEnabled(currentBackendValue && hasValidToken);
      Alert.alert("Error", error.message);
    },
  });

  const { mutate: removePhoneNumber, isPending: removePhoneNumberIsLoading } =
    useMutation({
      mutationFn: async () => {
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_BACKEND_URL}/v1/api/users/${userData?.data.id}/phone-number`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${process.env.EXPO_PUBLIC_USER_TOKEN}`,
              "Token-Type": "user",
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to delete phone number");
        }

        setSmsNotificationIsEnabled(() => false);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["user", accountData?.id] });
      },
    });

  const {
    mutate: updateSmsNotification,
    isPending: smsNotificationUpdateIsLoading,
  } = useMutation({
    mutationFn: async (newValue: boolean) => {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/v1/api/users/${userData?.data.id}/sms-notifications`,
        {
          method: "PATCH",
          body: JSON.stringify({
            smsNotification: newValue,
          }),
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_USER_TOKEN}`,
            "Token-Type": "user",
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update sms notification preference");
      }

      const data = await response.json();
      setSmsNotificationIsEnabled(() => data.data.smsNotification);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", accountData?.id] });
    },
  });

  const { mutate: updatePhoneNumber, isPending: updatePhoneNumberIsLoading } =
    useMutation({
      mutationFn: async (phoneNumber: string) => {
        const validPhone =
          phoneNumber.length === 10 && phoneNumber[0] === "9"
            ? `+63${phoneNumber}`
            : "";

        const response = await fetch(
          `${process.env.EXPO_PUBLIC_BACKEND_URL}/v1/api/users/${userData?.data.id}/phone-number`,
          {
            method: "PATCH",
            body: JSON.stringify({
              phoneNumber: validPhone,
            }),
            headers: {
              Authorization: `Bearer ${process.env.EXPO_PUBLIC_USER_TOKEN}`,
              "Token-Type": "user",
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to update phone number");
        }

        setPhoneNumber(() => "");

        const data = await response.json();
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["user", accountData?.id] });
      },
    });

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
            refreshing={isRefetchingUserData}
            onRefresh={async () => {
              await refetchUserData();
            }}
            colors={["#1a314c"]}
            tintColor="#1a314c"
          />
        }
      >
        <Dialog
          visible={alertDialogIsVisible}
          title={
            alertDialogType === "email"
              ? `${
                  emailNotificationIsEnabled ? "Disable" : "Enable"
                } Email Notifications?`
              : alertDialogType === "push"
              ? (() => {
                  const backendEnabled =
                    userData?.data?.pushNotification || false;
                  const hasToken = Boolean(userData?.data?.expoPushToken);
                  const needsTokenRefresh = backendEnabled && !hasToken;
                  if (pushNotificationIsEnabled) {
                    return "Disable Push Notifications?";
                  } else if (needsTokenRefresh) {
                    return "Refresh Push Notifications?";
                  } else {
                    return "Enable Push Notifications?";
                  }
                })()
              : alertDialogType === "sms"
              ? `${
                  smsNotificationIsEnabled ? "Disable" : "Enable"
                } SMS Notifications?`
              : alertDialogType === "remove"
              ? "Remove Phone Number?"
              : alertDialogType === "signout"
              ? "Log out"
              : alertDialogType === "set"
              ? "Set New Phone Number"
              : ""
          }
          titleStyle={[styles.headerText, { textAlign: "center" }]}
          dialogStyle={styles.dialog}
          contentStyle={{ paddingTop: 8 }}
          onTouchOutside={() => setAlertDialogIsVisible(() => false)}
          onRequestClose={() => setAlertDialogIsVisible(() => false)}
          contentInsetAdjustmentBehavior="never"
          animationType="fade"
        >
          <View>
            <Text style={[styles.settingsText, { textAlign: "center" }]}>
              {alertDialogType === "email"
                ? emailNotificationIsEnabled
                  ? "You will no longer receive email alerts when earthquake activity is detected."
                  : "You will receive email alerts when earthquake activity is detected."
                : alertDialogType === "push"
                ? (() => {
                    const backendEnabled =
                      userData?.data?.pushNotification || false;
                    const hasToken = Boolean(userData?.data?.expoPushToken);
                    const needsTokenRefresh = backendEnabled && !hasToken;
                    if (pushNotificationIsEnabled) {
                      return "You will no longer receive push alerts when earthquake activity is detected.";
                    } else if (needsTokenRefresh) {
                      return "Push notifications are enabled but need to be reauthorized. We'll ask for notification permissions to refresh your token.";
                    } else {
                      return "You will receive push alerts when earthquake activity is detected. We'll ask for notification permissions if needed.";
                    }
                  })()
                : alertDialogType === "sms"
                ? smsNotificationIsEnabled
                  ? "You will no longer receive SMS alerts when earthquake activity is detected."
                  : "You will receive SMS alerts when earthquake activity is detected."
                : alertDialogType === "remove"
                ? "Are you sure you want to remove your phone number? You will no longer receive SMS notifications."
                : alertDialogType === "set"
                ? "Enter your phone number below and click save to update your profile."
                : alertDialogType === "signout"
                ? "Are you sure you want to log out? You will need to sign in again to access your account."
                : ""}
            </Text>
            {alertDialogType === "set" && (
              <TextInput
                id="phone-number"
                style={[
                  styles.outlineButton,
                  {
                    marginTop: 8,
                    fontFamily: Platform.select({
                      android: "PlusJakartaSans_400Regular",
                      ios: "PlusJakartaSans-Regular",
                    }),
                    color: "#212529",
                  },
                ]}
                placeholder="9XXXXXXXXX"
                placeholderTextColor="#565b60ff"
                keyboardType="numeric"
                maxLength={10}
                value={phoneNumber}
                onChangeText={(text) => {
                  let value = text.replace(/\D/g, "");
                  if (value.length === 0) {
                    setPhoneNumber("");
                  } else {
                    if (value[0] !== "9") {
                      value = "9" + value.replace(/^9*/, "");
                    }
                    setPhoneNumber(value.slice(0, 10));
                  }
                }}
              />
            )}
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
                      alertDialogType !== "signout" ? "#193867" : "#e7000b",
                    marginBottom: 0,
                    opacity:
                      alertDialogType === "set" &&
                      (!phoneNumber ||
                        phoneNumber.length !== 10 ||
                        !phoneNumber.startsWith("9"))
                        ? 0.7
                        : 1,
                  },
                ]}
                disabled={
                  alertDialogType === "set" &&
                  (!phoneNumber ||
                    phoneNumber.length !== 10 ||
                    !phoneNumber.startsWith("9"))
                    ? true
                    : false
                }
                onPress={() => {
                  if (alertDialogIsVisible) {
                    switch (alertDialogType) {
                      case "email":
                        const emailCurrentValue =
                          userData?.data?.alertNotification || false;
                        updateEmailNotification(!emailCurrentValue);
                        setAlertDialogIsVisible(() => false);
                        break;
                      case "sms":
                        const smsCurrentValue =
                          userData?.data?.smsNotification || false;
                        updateSmsNotification(!smsCurrentValue);
                        setAlertDialogIsVisible(() => false);
                        break;
                      case "push":
                        {
                          const backendEnabled =
                            userData?.data?.pushNotification || false;
                          const hasToken = Boolean(
                            userData?.data?.expoPushToken
                          );
                          const needsTokenRefresh = backendEnabled && !hasToken;
                          const newValue = needsTokenRefresh
                            ? true
                            : !pushNotificationIsEnabled;
                          updatePushNotification(newValue);
                          setAlertDialogIsVisible(() => false);
                        }
                        break;
                      case "remove":
                        removePhoneNumber();
                        setAlertDialogIsVisible(() => false);
                        break;
                      case "signout":
                        handleSignOut();
                        setAlertDialogIsVisible(() => false);
                        break;
                      case "set":
                        updatePhoneNumber(phoneNumber);
                        setAlertDialogIsVisible(() => false);
                      default:
                        break;
                    }
                  }
                }}
              >
                <Text style={styles.buttonText}>
                  {alertDialogType === "remove"
                    ? "Confirm"
                    : alertDialogType === "signout"
                    ? "Yes"
                    : alertDialogType === "set"
                    ? "Save changes"
                    : "Continue"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.9}
                style={[
                  styles.outlineButton,
                  { width: "100%", alignItems: "center" },
                ]}
                onPress={() => setAlertDialogIsVisible(() => false)}
              >
                <Text style={[styles.buttonText, { color: "#000" }]}>
                  {alertDialogType === "signout" ? "No" : "Cancel"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Dialog>
        {accountData && (
          <Card>
            <View style={styles.cardTitle}>
              <Image
                source={{ uri: accountData.profileImage }}
                style={styles.profileImage}
                contentFit="contain"
              />
              <View>
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
              <Text style={styles.headerText}>Personal Information</Text>
              <View
                style={[
                  styles.settingsItem,
                  { width: "100%", alignItems: "center" },
                ]}
              >
                <View>
                  <Text style={styles.settingsText}>Phone Number:</Text>
                  <Text style={styles.settingsValue}>
                    {userData?.data?.phoneNumber
                      ? `0${userData.data.phoneNumber.slice(3)}`
                      : "Not set"}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={[
                    styles.secondaryButton,
                    {
                      opacity:
                        removePhoneNumberIsLoading ||
                        updatePhoneNumberIsLoading ||
                        isOffline
                          ? 0.7
                          : 1,
                    },
                  ]}
                  onPress={
                    userData?.data?.phoneNumber
                      ? () => {
                          setAlertDialogIsVisible(() => true);
                          setAlertDialogType(() => "remove");
                        }
                      : () => {
                          setAlertDialogIsVisible(() => true);
                          setAlertDialogType(() => "set");
                        }
                  }
                  disabled={
                    removePhoneNumberIsLoading ||
                    updatePhoneNumberIsLoading ||
                    isOffline
                  }
                >
                  <Text style={[styles.buttonText, { color: "#000" }]}>
                    {userData?.data?.phoneNumber ? "Remove" : "Set now"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        </View>
        <View>
          <Card>
            <View style={styles.cardContent}>
              <Text style={styles.headerText}>Settings</Text>
              <View style={styles.settingsItem}>
                <Text
                  style={[
                    styles.settingsText,
                    isOffline && styles.disabledText,
                  ]}
                >
                  Email alerts for earthquake activity
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setAlertDialogIsVisible(() => true);
                    setAlertDialogType(() => "email");
                  }}
                  activeOpacity={0.9}
                  disabled={emailNotificationUpdateIsLoading || isOffline}
                  style={{ marginTop: 4 }}
                >
                  <Switch
                    trackColor={
                      isOffline
                        ? { false: "#f5f5f5ff", true: "#325b98ff" }
                        : { false: "#e5e5e5", true: "#193867" }
                    }
                    thumbColor={
                      isOffline
                        ? "#f0f0f0"
                        : pushNotificationIsEnabled
                        ? "#ffffff"
                        : "#f4f3f4"
                    }
                    ios_backgroundColor="#3e3e3e"
                    value={emailNotificationIsEnabled}
                    disabled
                    pointerEvents="none"
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.settingsItem}>
                <Text
                  style={[
                    styles.settingsText,
                    isOffline && styles.disabledText,
                  ]}
                >
                  Push notifications for earthquake activity
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setAlertDialogIsVisible(() => true);
                    setAlertDialogType(() => "push");
                  }}
                  activeOpacity={0.9}
                  disabled={pushNotificationUpdateIsLoading || isOffline}
                  style={{ marginTop: 4 }}
                >
                  <Switch
                    trackColor={
                      isOffline
                        ? { false: "#f5f5f5ff", true: "#325b98ff" }
                        : { false: "#e5e5e5", true: "#193867" }
                    }
                    thumbColor={
                      isOffline
                        ? "#f0f0f0"
                        : pushNotificationIsEnabled
                        ? "#ffffff"
                        : "#f4f3f4"
                    }
                    ios_backgroundColor="#3e3e3e"
                    value={pushNotificationIsEnabled}
                    disabled
                    pointerEvents="none"
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.settingsItem}>
                <Text
                  style={[
                    styles.settingsText,
                    isOffline && styles.disabledText,
                  ]}
                >
                  SMS notifications for earthquake activity
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setAlertDialogIsVisible(() => true);
                    setAlertDialogType(() => "sms");
                  }}
                  activeOpacity={0.9}
                  disabled={
                    smsNotificationUpdateIsLoading ||
                    isOffline ||
                    !userData?.data?.phoneNumber
                  }
                  style={{ marginTop: 4 }}
                >
                  <Switch
                    trackColor={
                      isOffline
                        ? { false: "#f5f5f5ff", true: "#325b98ff" }
                        : { false: "#e5e5e5", true: "#193867" }
                    }
                    thumbColor={
                      isOffline
                        ? "#f0f0f0"
                        : smsNotificationIsEnabled
                        ? "#ffffff"
                        : "#f4f3f4"
                    }
                    ios_backgroundColor="#3e3e3e"
                    value={smsNotificationIsEnabled}
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
          onPress={() => {
            setAlertDialogIsVisible(() => true);
            setAlertDialogType(() => "signout");
          }}
        >
          <Text style={styles.buttonText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cardTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
    color: "#565b60ff",
    fontFamily: Platform.select({
      android: "PlusJakartaSans_400Regular",
      ios: "PlusJakartaSans-Regular",
    }),
  },
  settingsValue: {
    fontSize: 16,
    color: "#41464aff",
    fontFamily: Platform.select({
      android: "PlusJakartaSans_500Medium",
      ios: "PlusJakartaSans-Medium",
    }),
  },
  secondaryButton: {
    borderColor: "#e5e5e5",
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: "#f1f3f5",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  outlineButton: {
    borderColor: "#e5e5e5",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  disabledText: {
    opacity: 0.5,
    color: "#999",
  },
  button: {
    backgroundColor: "#e7000b",
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  dialog: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 16,
  },
});
