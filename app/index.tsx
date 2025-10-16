import { Redirect } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

import { useAuth } from "@/contexts/AuthContext";

SplashScreen.preventAutoHideAsync();

export default function Index() {
  const { user, userData, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Redirect href="/sign-in" />;
  }

  if (userData?.role === "admin") {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  return <Redirect href="/(tabs)/evacuation-plan" />;
}
