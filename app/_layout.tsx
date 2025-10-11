import { GoogleSignin } from "@react-native-google-signin/google-signin";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";

import { AuthProvider } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";

import { ProtectedRoute } from "@/components/ProtectedRoute";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_IOS_CLIENT_ID,
    });
  }, []);

  return (
    <AuthProvider>
      <ProtectedRoute>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <Stack>
            <Stack.Screen name="sign-in" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="dark" />
        </ThemeProvider>
      </ProtectedRoute>
    </AuthProvider>
  );
}
