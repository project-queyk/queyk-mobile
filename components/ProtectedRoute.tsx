import { useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { BackHandler, Platform } from "react-native";

import { useAuth } from "@/contexts/AuthContext";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, userData, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(tabs)";
    const isDashboard = segments[1] === "dashboard";

    let backHandler: any;
    if (
      Platform.OS === "android" &&
      userData?.role === "user" &&
      segments[1] === "evacuation-plan"
    ) {
      backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
        BackHandler.exitApp();
        return true;
      });
    }

    if (!user) {
      if (inAuthGroup || segments[0] !== "sign-in") {
        router.replace("/sign-in");
      }
    } else if (user) {
      if (!inAuthGroup) {
        if (userData?.role === "admin") {
          router.replace("/(tabs)/dashboard");
        } else {
          router.replace("/(tabs)/evacuation-plan");
        }
      } else if (userData?.role === "user" && isDashboard) {
        router.replace("/(tabs)/evacuation-plan");
      }
    }
    return () => {
      if (backHandler) backHandler.remove();
    };
  }, [user, userData, segments, isLoading, router]);

  useEffect(() => {
    let mounted = true;

    async function showOrHide() {
      try {
        if (isLoading) {
          await SplashScreen.preventAutoHideAsync();
        } else if (mounted) {
          await SplashScreen.hideAsync();
        }
      } catch {}
    }

    showOrHide();

    return () => {
      mounted = false;
    };
  }, [isLoading]);

  if (isLoading) return null;

  return <>{children}</>;
}
