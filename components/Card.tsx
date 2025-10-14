import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, View } from "react-native";

export default function Card({
  variant = "default",
  children,
}: {
  variant?: "ai" | "default";
  children: React.ReactNode;
}) {
  if (variant === "ai") {
    return (
      <LinearGradient
        colors={["#f5f3ff", "#eff6ff", "#ecfeff"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.aiCard}
      >
        {children}
      </LinearGradient>
    );
  }

  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: "#ffffff",
    padding: 24,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 16,
  },
  aiCard: {
    width: "100%",
    padding: 24,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 16,
  },
});
