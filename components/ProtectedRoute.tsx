import { useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

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

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4285F4" />
      </View>
    );
  }

  return <>{children}</>;
}
