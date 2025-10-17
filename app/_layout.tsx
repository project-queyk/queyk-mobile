import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View } from "react-native";
import { PaperProvider } from "react-native-paper";
const queryClient = new QueryClient();
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const backgroundColor = useThemeColor({}, "background");

  const customLightTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: backgroundColor,
    },
  };

  const paperTheme = {
    colors: {
      ...DefaultTheme.colors,
      background: backgroundColor,
    },
  };

  const customDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: backgroundColor,
    },
  };

  function DeepLinkHandler() {
    const router = useRouter();
    const { userData, isLoading } = useAuth();

    useEffect(() => {
      GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_WEB_CLIENT_ID,
        iosClientId: process.env.EXPO_PUBLIC_IOS_CLIENT_ID,
        offlineAccess: true,
        hostedDomain: "",
        forceCodeForRefreshToken: true,
      });

      function handleDeepLink(url: string) {
        if (isLoading) return; // Wait for auth state to load
        const { path } = Linking.parse(url);
        // If not authenticated, always redirect to sign-in
        if (!userData) {
          router.push("/sign-in");
          return;
        }
        if (!path || path === "") {
          if (userData.role === "admin") {
            router.push("/(tabs)/dashboard");
          } else {
            router.push("/(tabs)/evacuation-plan");
          }
          return;
        }
        const tabScreens = [
          "dashboard",
          "evacuation-plan",
          "protocols",
          "user-management",
          "profile",
        ];
        if (tabScreens.includes(path)) {
          switch (path) {
            case "dashboard":
              if (userData.role === "admin") {
                router.push("/(tabs)/dashboard");
              }
              break;
            case "user-management":
              if (userData.role === "admin") {
                router.push("/(tabs)/user-management");
              }
              break;
            case "evacuation-plan":
              router.push("/(tabs)/evacuation-plan");
              break;
            case "protocols":
              router.push("/(tabs)/protocols");
              break;
            case "profile":
              router.push("/(tabs)/profile");
              break;
            default:
              break;
          }
        }
      }

      Linking.getInitialURL().then((url: string | null) => {
        if (url) handleDeepLink(url);
      });

      const subscription = Linking.addEventListener(
        "url",
        (event: { url: string }) => {
          handleDeepLink(event.url);
        }
      );
      return () => {
        subscription.remove();
      };
    }, [router, userData, isLoading]);
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={paperTheme}>
        <AuthProvider>
          <DeepLinkHandler />
          <View style={{ flex: 1, backgroundColor }}>
            <ProtectedRoute>
              <ThemeProvider
                value={
                  colorScheme === "dark" ? customDarkTheme : customLightTheme
                }
              >
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="sign-in" />
                  <Stack.Screen name="(tabs)" />
                </Stack>
                <StatusBar style="dark" />
              </ThemeProvider>
            </ProtectedRoute>
          </View>
        </AuthProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}
