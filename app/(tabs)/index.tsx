import { Image } from "expo-image";
import { Alert, Button, Platform, StyleSheet, View } from "react-native";

import { HelloWave } from "@/components/hello-wave";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAuth } from "@/contexts/AuthContext";

export default function HomeScreen() {
  const { user, signOut } = useAuth();

  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      Alert.alert("Error", "Failed to sign out.");
    }
  }

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
      headerImage={
        <Image
          source={require("@/assets/images/partial-react-logo.png")}
          style={styles.reactLogo}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>

      {user && (
        <ThemedView style={styles.userContainer}>
          <ThemedText type="subtitle">
            Hello, {user.user.name || user.user.email}! 👋
          </ThemedText>
          <ThemedText style={styles.emailText}>{user.user.email}</ThemedText>
          <View style={styles.buttonContainer}>
            <Button title="Sign Out" onPress={handleSignOut} color="#FF3B30" />
          </View>
        </ThemedView>
      )}

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 1: Try it</ThemedText>
        <ThemedText>
          Edit{" "}
          <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText>{" "}
          to see changes. Press{" "}
          <ThemedText type="defaultSemiBold">
            {Platform.select({
              ios: "cmd + d",
              android: "cmd + m",
              web: "F12",
            })}
          </ThemedText>{" "}
          to open developer tools.
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userContainer: {
    gap: 8,
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "rgba(66, 133, 244, 0.1)",
  },
  emailText: {
    opacity: 0.8,
    marginTop: 4,
  },
  buttonContainer: {
    marginTop: 12,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
});
