import {
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Dialog } from "react-native-simple-dialogs";

import { useAuth } from "@/contexts/AuthContext";

import Card from "@/components/Card";

export default function SignInScreen() {
  const { user, userData, isLoading, signIn } = useAuth();
  const router = useRouter();
  const [dialogVisible, setDialogVisible] = React.useState(false);
  const [dialogTitle, setDialogTitle] = React.useState("");
  const [dialogMessage, setDialogMessage] = React.useState("");

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
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            setDialogTitle("Cancelled");
            setDialogMessage("User cancelled the login.");
            setDialogVisible(true);
            break;
          case statusCodes.IN_PROGRESS:
            setDialogTitle("In Progress");
            setDialogMessage("Sign in is already in progress.");
            setDialogVisible(true);
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            setDialogTitle("Error");
            setDialogMessage("Play Services not available or outdated.");
            setDialogVisible(true);
            break;
          default:
            setDialogTitle("Google Sign-In Error");
            setDialogMessage(
              `Error Code: ${error.code}\nMessage: ${
                error.message || "Unknown Google Sign-In error"
              }`
            );
            setDialogVisible(true);
        }
      } else if (error instanceof Error) {
        if (error.message.includes("email addresses are allowed")) {
          setDialogTitle("Access Denied");
          setDialogMessage(error.message);
          setDialogVisible(true);
        } else {
          setDialogTitle("Sign-In Error");
          setDialogMessage(
            error.message || "An error occurred during sign in."
          );
          setDialogVisible(true);
        }
      } else {
        setDialogTitle("Unexpected Error");
        setDialogMessage(`Something went wrong: ${JSON.stringify(error)}`);
        setDialogVisible(true);
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
      <Text
        style={[
          styles.subText,
          {
            position: "absolute",
            bottom: "10%",
            fontSize: 14,
          },
        ]}
      >
        By signing in, you agree to our{" "}
        <Text
          style={{ textDecorationLine: "underline" }}
          onPress={() => Linking.openURL("https://www.queyk.com/privacy")}
        >
          Privacy Policy
        </Text>
        .
      </Text>
      <Dialog
        visible={dialogVisible}
        title={dialogTitle}
        titleStyle={[styles.title, { textAlign: "center", marginBottom: 0 }]}
        dialogStyle={styles.dialog}
        contentStyle={{ paddingTop: 8 }}
        onTouchOutside={() => setDialogVisible(false)}
        onRequestClose={() => setDialogVisible(false)}
        contentInsetAdjustmentBehavior="never"
        animationType="fade"
      >
        <View>
          <Text
            style={[
              styles.subText,
              { textAlign: "center", marginBottom: 14, fontSize: 14 },
            ]}
          >
            {dialogMessage}
          </Text>
          <View
            style={{
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.button,
                {
                  backgroundColor: "#193867",
                  marginBottom: 0,
                },
              ]}
              onPress={() => setDialogVisible(false)}
            >
              <Text style={styles.buttonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Dialog>
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
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  dialog: {
    borderRadius: 8,
  },
});
