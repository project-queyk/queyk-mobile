import {
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "@/contexts/AuthContext";

import Card from "@/components/Card";

export default function SignInScreen() {
  const { user, userData, isLoading, signIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user && userData) {
      if (userData.role === "admin") {
        router.replace("/(tabs)/dashboard");
      }
      router.replace("/(tabs)/evacuation-plan");
    }
  }, [user, userData, isLoading, router]);

  async function handleGoogleSignIn() {
    try {
      await signIn();
    } catch (error) {
      console.error("Sign in error:", error);
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            Alert.alert("Cancelled", "User cancelled the login.");
            break;
          case statusCodes.IN_PROGRESS:
            Alert.alert("In Progress", "Sign in is already in progress.");
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            Alert.alert("Error", "Play Services not available or outdated.");
            break;
          default:
            Alert.alert(
              "Google Sign-In Error",
              `Error Code: ${error.code}\nMessage: ${
                error.message || "Unknown Google Sign-In error"
              }`
            );
        }
      } else if (error instanceof Error) {
        if (error.message.includes("email addresses are allowed")) {
          Alert.alert("Access Denied", error.message, [{ text: "OK" }]);
        } else {
          Alert.alert(
            "Sign-In Error",
            error.message || "An error occurred during sign in.",
            [{ text: "OK" }]
          );
        }
      } else {
        Alert.alert(
          "Unexpected Error",
          `Something went wrong: ${JSON.stringify(error)}`
        );
      }
    }
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#193867" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card>
        <View style={styles.logoContainer}>
          <Image
            source={require("../assets/images/icons/queyk-black.png")}
            style={styles.logoImage}
            contentFit="contain"
          />
          <Text style={styles.logoText}>Queyk</Text>
        </View>
        <Text style={styles.title}>Sign In to Queyk</Text>
        <Text style={styles.subText}>Welcome back! Sign in to continue</Text>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.button}
          onPress={handleGoogleSignIn}
        >
          <Image
            source={require("../assets/images/icons/google-white-icon.png")}
            style={styles.googleLogoImage}
            contentFit="contain"
          />
          <Text style={styles.buttonText}>Sign in with Google</Text>
        </TouchableOpacity>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#F2F4F7",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoImage: {
    width: 20,
    height: 20,
  },
  logoText: {
    fontSize: 18,
    fontFamily: Platform.select({
      android: "PlusJakartaSans_600SemiBold",
      ios: "PlusJakartaSans-SemiBold",
    }),
    marginLeft: 4,
    marginBottom: 4,
    color: "#212529",
  },
  title: {
    fontSize: 20,
    color: "#212529",
    fontFamily: Platform.select({
      android: "PlusJakartaSans_600SemiBold",
      ios: "PlusJakartaSans-SemiBold",
    }),
    marginTop: 12,
    marginBottom: 4,
  },
  subText: {
    fontSize: 16,
    color: "#212529",
    fontFamily: Platform.select({
      android: "PlusJakartaSans_400Regular",
      ios: "PlusJakartaSans-Regular",
    }),
    marginBottom: 30,
  },
  button: {
    backgroundColor: "#193867",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 16,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  googleLogoImage: {
    width: 14,
    height: 14,
    marginBottom: 1,
  },
  buttonText: {
    color: "#ffffff",
    marginBottom: 4,
    fontSize: 12,
    fontFamily: Platform.select({
      android: "PlusJakartaSans_600SemiBold",
      ios: "PlusJakartaSans-SemiBold",
    }),
  },
});
