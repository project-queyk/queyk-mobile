import { GoogleSignin, User } from "@react-native-google-signin/google-signin";
import * as SecureStore from "expo-secure-store";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  AuthContextType,
  getDomainRestrictionMessage,
  isValidEmailDomain,
  UserData,
} from "@/config/auth.config";
import { signInToBackend } from "@/utils/auth";
import {
  registerForPushNotifications,
  updatePushTokenInBackend,
} from "@/utils/pushNotifications";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_KEY = "user_data";
const USERDATA_KEY = "user_profile_data";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserFromStorage();
  }, []);

  async function loadUserFromStorage() {
    try {
      setIsLoading(true);
      const storedUser = await SecureStore.getItemAsync(USER_KEY);
      const storedUserData = await SecureStore.getItemAsync(USERDATA_KEY);

      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);

        if (!isValidEmailDomain(parsedUser.user.email)) {
          await SecureStore.deleteItemAsync(USER_KEY);
          await SecureStore.deleteItemAsync(USERDATA_KEY);
          setUser(null);
          setUserData(null);
          return;
        }

        setUser(parsedUser);

        if (storedUserData) {
          const parsedUserData = JSON.parse(storedUserData);
          setUserData(parsedUserData);

          try {
            const pushToken = await registerForPushNotifications();

            if (
              pushToken &&
              pushToken !== parsedUserData.expoPushToken &&
              parsedUserData.id
            ) {
              await updatePushTokenInBackend(
                parsedUserData.id,
                pushToken,
                process.env.EXPO_PUBLIC_AUTH_TOKEN || ""
              );

              const updatedUserData = {
                ...parsedUserData,
                expoPushToken: pushToken,
              };
              setUserData(updatedUserData);
              await SecureStore.setItemAsync(
                USERDATA_KEY,
                JSON.stringify(updatedUserData)
              );
            }
          } catch (pushNotificationError) {
            console.error(
              "Push notification setup failed on app load:",
              pushNotificationError
            );
          }
        }

        try {
          await GoogleSignin.signInSilently();
        } catch {
          await SecureStore.deleteItemAsync(USER_KEY);
          await SecureStore.deleteItemAsync(USERDATA_KEY);
          setUser(null);
          setUserData(null);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn() {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();

    if (userInfo.data) {
      const userEmail = userInfo.data.user.email;

      if (!isValidEmailDomain(userEmail)) {
        await GoogleSignin.signOut();

        throw new Error(getDomainRestrictionMessage(userEmail));
      }

      setUser(userInfo.data);
      const backendResponse = await signInToBackend(userInfo.data);

      setUserData(backendResponse.data);

      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userInfo.data));
      await SecureStore.setItemAsync(
        USERDATA_KEY,
        JSON.stringify(backendResponse.data)
      );

      try {
        const pushToken = await registerForPushNotifications();

        if (pushToken && backendResponse.data.id) {
          await updatePushTokenInBackend(
            backendResponse.data.id,
            pushToken,
            process.env.EXPO_PUBLIC_AUTH_TOKEN || ""
          );

          const updatedUserData = {
            ...backendResponse.data,
            expoPushToken: pushToken,
          };
          setUserData(updatedUserData);
          await SecureStore.setItemAsync(
            USERDATA_KEY,
            JSON.stringify(updatedUserData)
          );
        }
      } catch (pushNotificationError) {
        console.error("Push notification setup failed:", pushNotificationError);
      }
    }
  }

  async function signOut() {
    try {
      await GoogleSignin.signOut();
      setUser(null);
      await SecureStore.deleteItemAsync(USER_KEY);
      await SecureStore.deleteItemAsync(USERDATA_KEY);
    } catch (error) {
      throw error;
    }
  }

  async function refreshUser() {
    try {
      const userInfo = await GoogleSignin.signInSilently();
      if (userInfo.data) {
        setUser(userInfo.data);
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userInfo.data));
      }
    } catch (error) {
      await SecureStore.deleteItemAsync(USER_KEY);
      setUser(null);
      throw error;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        isLoading,
        signIn,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
