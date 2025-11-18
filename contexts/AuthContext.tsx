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
import { AppState } from "react-native";

import {
  AuthContextType,
  getDomainRestrictionMessage,
  isValidEmailDomain,
  UserData,
} from "@/config/auth.config";

import { fetchLatestUserData, signInToBackend } from "@/utils/auth";
import {
  setLocationUpdateThrottle,
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
} from "@/utils/backgroundLocationTask";
import { isConnected, subscribeToNetworkChanges } from "@/utils/network";
import {
  requestPushNotificationPermissions,
  updatePushPreferenceInBackend,
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

  const signOut = useCallback(async () => {
    try {
      await GoogleSignin.signOut();
    } catch {}

    try {
      await SecureStore.deleteItemAsync(USER_KEY);
      await SecureStore.deleteItemAsync(USERDATA_KEY);
    } catch {}

    try {
      await stopBackgroundLocationTracking();
    } catch {}

    setUser(null);
    setUserData(null);
  }, []);

  async function checkInitialNetworkState() {
    const connected = await isConnected();
    setIsOnline(connected);
  }

  const lastRefreshRef = React.useRef<number>(0);
  const REFRESH_INTERVAL = __DEV__ ? 10 * 1000 : 60 * 1000;
  const refreshUserDataSilently = useCallback(async () => {
    if (!userData) return;
    const now = Date.now();
    if (now - lastRefreshRef.current < REFRESH_INTERVAL) {
      return;
    }
    lastRefreshRef.current = now;
    try {
      const latestUserData = await fetchLatestUserData(userData);

      if (latestUserData === null) {
        try {
          await signOut();
        } catch {}
        return;
      }

      if (
        latestUserData &&
        JSON.stringify(latestUserData) !== JSON.stringify(userData)
      ) {
        setUserData(latestUserData);
        await SecureStore.setItemAsync(
          USERDATA_KEY,
          JSON.stringify(latestUserData)
        );
      }
    } catch {}
  }, [userData, REFRESH_INTERVAL, signOut]);

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

  useEffect(() => {
    if (!userData) return;
    let mounted = true;

    const interval = setInterval(() => {
      if (!mounted) return;
      if (isOnline && !isLoading) {
        refreshUserDataSilently();
      }
    }, REFRESH_INTERVAL);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [
    userData,
    isOnline,
    isLoading,
    refreshUserDataSilently,
    REFRESH_INTERVAL,
  ]);

  useEffect(() => {
    const handler = (nextAppState: string) => {
      if (nextAppState === "active" && userData && isOnline && !isLoading) {
        refreshUserDataSilently();
      }
    };

    const subscription = AppState.addEventListener("change", handler);

    return () => {
      try {
        subscription.remove();
      } catch {}
    };
  }, [userData, isOnline, isLoading, refreshUserDataSilently]);

  useEffect(() => {
    if (!userData) {
      stopBackgroundLocationTracking().catch(() => {});
      return;
    }

    setLocationUpdateThrottle(__DEV__ ? 0 : 0);

    startBackgroundLocationTracking({
      timeInterval: __DEV__ ? 5000 : 10000,
      distanceInterval: 10,
    }).catch((error) => {});
  }, [userData]);

  useEffect(() => {
    const originalFetch = (global as any).fetch;

    (global as any).fetch = async (input: RequestInfo, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input?.toString() || "";
      const method = (init && init.method) || "GET";

      const response = await originalFetch(input, init);

      try {
        if (
          userData &&
          method.toUpperCase() === "GET" &&
          url.includes(`/v1/api/users/${userData.id}`)
        ) {
          if (response.status === 404 || response.status === 410) {
            await signOut();
          } else if (response.ok && response.status !== 204) {
            const contentType = response.headers.get("content-type") || "";
            if (contentType.includes("application/json")) {
              const json = await response
                .clone()
                .json()
                .catch(() => null);
              const body = json?.data ?? json;
              if (body == null) {
                return response;
              }
            }
          }
        }
      } catch {}

      return response;
    };

    return () => {
      (global as any).fetch = originalFetch;
    };
  }, [userData, signOut]);

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
        await signOut();
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
            await updatePushPreferenceInBackend(
              backendResponse.data.id,
              true,
              process.env.EXPO_PUBLIC_USER_TOKEN as string
            );
          }
        } catch {}
      } catch (error) {
        try {
          await signOut();
        } catch {}
        throw error;
      }
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
