module.exports = {
  expo: {
    name: "Queyk",
    slug: "Queyk",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icons/adaptive-icon.png",
    scheme: "queyk",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.luiscabantac.Queyk",
      icon: {
        dark: "./assets/images/icons/ios-dark.png",
        light: "./assets/images/icons/ios-light.png",
        tinted: "./assets/images/icons/ios-tinted.png",
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/icons/adaptive-icon.png",
        monochromeImage: "./assets/images/icons/adaptive-icon.png",
        backgroundColor: "#f1f3f5",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: true,
      package: "com.luiscabantac.Queyk",
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON || "./google-services.json",
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: "www.queyk.com",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    web: {
      output: "static",
      favicon: "./assets/images/icons/adaptive-icon.png",
    },
    plugins: [
      [
        "@react-native-google-signin/google-signin",
        {
          iosUrlScheme:
            "com.googleusercontent.apps.788704027669-fj9v4t5ivkqd3uuctfmqbi45ak3b1oii",
        },
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/images/icons/notification-icon.png",
          color: "#ffffff",
        },
      ],
      [
        "expo-font",
        {
          fonts: [
            "node_modules/@expo-google-fonts/plus-jakarta-sans/400Regular/PlusJakartaSans_400Regular.ttf",
            "node_modules/@expo-google-fonts/plus-jakarta-sans/500Medium/PlusJakartaSans_500Medium.ttf",
            "node_modules/@expo-google-fonts/plus-jakarta-sans/600SemiBold/PlusJakartaSans_600SemiBold.ttf",
            "node_modules/@expo-google-fonts/plus-jakarta-sans/700Bold/PlusJakartaSans_700Bold.ttf",
          ],
        },
      ],
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/icons/splash-icon-light.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#f1f3f5",
          dark: {
            backgroundColor: "#f1f3f5",
          },
        },
      ],
      "expo-secure-store",
      "expo-font",
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "Allow Queyk to use your location.",
        },
      ],
      "expo-web-browser",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "e42002f5-7ac1-4f27-9eae-59e77782442e",
      },
    },
    owner: "luiscabantac",
  },
};
