import { AdminRoute } from "@/components/AdminRoute";
import { SafeAreaView } from "react-native-safe-area-context";

export default function UserManagement() {
  return (
    <AdminRoute>
      <SafeAreaView
        edges={["bottom", "left", "right"]}
        style={{
          flex: 1,
          backgroundColor: "#F2F4F7",
          paddingHorizontal: 16,
        }}
      ></SafeAreaView>
    </AdminRoute>
  );
}
