import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/contexts/AuthContext";

export default function TabLayout() {
  const { userData } = useAuth();
  const isAdmin = userData?.role === "admin";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#193967",
        tabBarInactiveTintColor: "#b2b2b2ff",
        headerStyle: { backgroundColor: "#F2F4F7" },
        headerTitleStyle: {
          fontFamily: Platform.select({
            android: "PlusJakartaSans_600SemiBold",
            ios: "PlusJakartaSans-SemiBold",
          }),
          color: "#212529",
        },
        headerShadowVisible: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: "#F2F4F7",
          paddingTop: 6,
          paddingBottom: 6,
          height: 84,
          borderTopColor: "#e2e3e4ff",
        },
        tabBarLabelStyle: {
          fontFamily: Platform.select({
            android: "PlusJakartaSans_500Medium",
            ios: "PlusJakartaSans-Medium",
          }),
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="square.grid.2x2.fill" color={color} />
          ),
          href: isAdmin ? "/(tabs)/dashboard" : null,
        }}
      />
      <Tabs.Screen
        name="evacuation-plan"
        options={{
          title: "Evacuation Plan",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="mappin.and.ellipse" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="protocols"
        options={{
          title: "Protocols",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="doc.text.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="user-management"
        options={{
          title: "User Management",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person.2.fill" color={color} />
          ),
          href: isAdmin ? "/(tabs)/user-management" : null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={28}
              name="person.crop.circle.fill"
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
