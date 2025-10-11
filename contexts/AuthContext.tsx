import { GoogleSignin, User } from "@react-native-google-signin/google-signin";
import * as SecureStore from "expo-secure-store";
import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  getDomainRestrictionMessage,
  isValidEmailDomain,
} from "@/config/auth.config";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_KEY = "user_data";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from secure store on app startup
  useEffect(() => {
    loadUserFromStorage();
  }, []);

  const loadUserFromStorage = async () => {
    try {
      setIsLoading(true);
      const storedUser = await SecureStore.getItemAsync(USER_KEY);

      if (storedUser) {
        const userData = JSON.parse(storedUser);

        if (!isValidEmailDomain(userData.user.email)) {
          await SecureStore.deleteItemAsync(USER_KEY);
          setUser(null);
          return;
        }

        setUser(userData);

        // Try to refresh the token silently
        try {
          await GoogleSignin.signInSilently();
        } catch {
          await SecureStore.deleteItemAsync(USER_KEY);
          setUser(null);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async () => {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();

    if (userInfo.data) {
      const userEmail = userInfo.data.user.email;

      if (!isValidEmailDomain(userEmail)) {
        await GoogleSignin.signOut();

        throw new Error(getDomainRestrictionMessage(userEmail));
      }

      setUser(userInfo.data);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userInfo.data));
    }
  };

  const signOut = async () => {
    try {
      await GoogleSignin.signOut();
      setUser(null);
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch (error) {
      throw error;
    }
  };

  const refreshUser = async () => {
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
  };

  return (
    <AuthContext.Provider
      value={{
        user,
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
