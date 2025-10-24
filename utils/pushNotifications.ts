import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

/**
 * Configure how notifications should be handled when app is in foreground
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register device for push notifications and get Expo Push Token
 * @returns Expo Push Token string or undefined if registration fails
 */
export async function registerForPushNotifications(): Promise<
  string | undefined
> {
  let token: string | undefined;

  if (!Device.isDevice) {
    return undefined;
  }

  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return undefined;
    }

    const pushTokenData = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });

    token = pushTokenData.data;
  } catch {
    return undefined;
  }

  if (Device.osName === "Android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  return token;
}

/**
 * Update user's push token in the backend
 * @param userId - The user's ID
 * @param expoPushToken - The Expo Push Token to update
 * @param authToken - The authentication token
 */
export async function updatePushTokenInBackend(
  userId: string,
  expoPushToken: string,
  authToken: string
): Promise<void> {
  try {
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_BACKEND_URL}/v1/api/users/${userId}/push-token`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
          "Token-Type": "auth",
        },
        body: JSON.stringify({ expoPushToken }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to update push token: ${response.status} - ${errorText}`
      );
    }
  } catch (error) {
    throw error;
  }
}

export async function updatePushPreferenceInBackend(
  userId: string,
  value: boolean,
  userToken: string
) {
  try {
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_BACKEND_URL}/v1/api/users/${userId}/push-notifications`,
      {
        method: "PATCH",
        body: JSON.stringify({
          pushNotification: value,
        }),
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Token-Type": "user",
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to update push notification preference: ${response.status} - ${errorText}`
      );
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Request push notification permissions and get token if granted
 * @returns Object containing permission status and token (if granted)
 */
export async function requestPushNotificationPermissions(): Promise<{
  granted: boolean;
  token?: string;
}> {
  if (!Device.isDevice) {
    return { granted: false };
  }

  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return { granted: false };
    }

    const pushTokenData = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });

    if (Device.osName === "Android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    return { granted: true, token: pushTokenData.data };
  } catch {
    return { granted: false };
  }
}
