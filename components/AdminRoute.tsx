import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/contexts/AuthContext";

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { userData, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!userData || userData.role !== "admin") {
      router.replace("/(tabs)/evacuation-plan");
    }
  }, [userData, isLoading, router]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#193867" />
      </View>
    );
  }

  if (!userData || userData.role !== "admin") {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Access Denied</Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f1f3f5",
  },
  text: {
    fontSize: 18,
    color: "#666",
  },
});
