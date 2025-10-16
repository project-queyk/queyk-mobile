import { useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

import { useAuth } from "@/contexts/AuthContext";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, userData, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(tabs)";

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
      }
    }
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
