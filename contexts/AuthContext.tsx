import { GoogleSignin, User } from "@react-native-google-signin/google-signin";
import * as SecureStore from "expo-secure-store";
import React, {
  createContext,
  ReactNode,
  useCallback,
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

import { fetchLatestUserData, signInToBackend } from "@/utils/auth";
import { isConnected, subscribeToNetworkChanges } from "@/utils/network";
import {
  requestPushNotificationPermissions,
  updatePushTokenInBackend,
} from "@/utils/pushNotifications";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_KEY = "user_data";
const USERDATA_KEY = "user_profile_data";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  async function checkInitialNetworkState() {
    const connected = await isConnected();
    setIsOnline(connected);
  }

  const lastRefreshRef = React.useRef<number>(0);
  const REFRESH_INTERVAL = 60 * 1000;
  const refreshUserDataSilently = useCallback(async () => {
    if (!userData) return;
    const now = Date.now();
    if (now - lastRefreshRef.current < REFRESH_INTERVAL) {
      return;
    }
    lastRefreshRef.current = now;
    try {
      const latestUserData = await fetchLatestUserData(userData);
      if (latestUserData && latestUserData !== userData) {
        setUserData(latestUserData);
        await SecureStore.setItemAsync(
          USERDATA_KEY,
          JSON.stringify(latestUserData)
        );
      }
    } catch (error) {
      console.log("Silent refresh failed:", error);
    }
  }, [userData, REFRESH_INTERVAL]);

  useEffect(() => {
    loadUserFromStorage();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToNetworkChanges((connected) => {
      setIsOnline(connected);

      if (connected && userData && !isLoading) {
        refreshUserDataSilently();
      }
    });

    checkInitialNetworkState();

    return () => {
      unsubscribe();
    };
  }, [userData, isLoading, refreshUserDataSilently]);

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

          const connected = await isConnected();
          if (connected) {
            const latestUserData = await fetchLatestUserData(parsedUserData);

            if (!latestUserData) {
              await SecureStore.deleteItemAsync(USER_KEY);
              await SecureStore.deleteItemAsync(USERDATA_KEY);
              setUser(null);
              setUserData(null);
              return;
            }

            if (
              JSON.stringify(latestUserData) !== JSON.stringify(parsedUserData)
            ) {
              setUserData(latestUserData);
              await SecureStore.setItemAsync(
                USERDATA_KEY,
                JSON.stringify(latestUserData)
              );
            }
          }
        }

        const connected = await isConnected();
        if (connected) {
          try {
            await GoogleSignin.signInSilently();
          } catch {
            if (connected) {
              await SecureStore.deleteItemAsync(USER_KEY);
              await SecureStore.deleteItemAsync(USERDATA_KEY);
              setUser(null);
              setUserData(null);
            }
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn() {
    const connected = await isConnected();
    if (!connected) {
      throw new Error(
        "Internet connection required for sign in. Please check your connection and try again."
      );
    }

    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();

    if (userInfo.data) {
      const userEmail = userInfo.data.user.email;

      if (!isValidEmailDomain(userEmail)) {
        await GoogleSignin.signOut();
        throw new Error(getDomainRestrictionMessage(userEmail));
      }

      try {
        const backendResponse = await signInToBackend(userInfo.data);

        setUser(userInfo.data);
        setUserData(backendResponse.data);

        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userInfo.data));
        await SecureStore.setItemAsync(
          USERDATA_KEY,
          JSON.stringify(backendResponse.data)
        );

        try {
          const notifResult = await requestPushNotificationPermissions();
          if (notifResult.granted && notifResult.token) {
            await updatePushTokenInBackend(
              backendResponse.data.id,
              notifResult.token,
              process.env.EXPO_PUBLIC_AUTH_TOKEN as string
            );
          }
        } catch {}
      } catch (error) {
        await GoogleSignin.signOut();
        throw error;
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

  async function refreshUserData() {
    if (!userData) {
      throw new Error("No user data to refresh");
    }

    const connected = await isConnected();
    if (!connected) {
      throw new Error(
        "Internet connection required to refresh user data. Using cached data."
      );
    }

    try {
      const latestUserData = await fetchLatestUserData(userData);

      if (!latestUserData) {
        await signOut();
        throw new Error("User no longer exists in backend");
      }

      setUserData(latestUserData);
      await SecureStore.setItemAsync(
        USERDATA_KEY,
        JSON.stringify(latestUserData)
      );
    } catch (error) {
      throw error;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        isLoading,
        isOnline,
        signIn,
        signOut,
        refreshUser,
        refreshUserData,
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
