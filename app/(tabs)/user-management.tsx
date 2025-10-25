import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { DataTable } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { Dialog } from "react-native-simple-dialogs";

import { useAuth } from "@/contexts/AuthContext";
import { User, UsersResponse } from "@/utils/types/users";

import { AdminRoute } from "@/components/AdminRoute";
import Card from "@/components/Card";

function EditUserModal({
  visible,
  user,
  onClose,
  onToggleEmailNotificationAlert,
  onToggleUserRole,
}: {
  visible: boolean;
  user: User | null;
  onClose: () => void;
  onToggleEmailNotificationAlert: (user: User) => void;
  onToggleUserRole: (user: User) => void;
}) {
  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible && !!user}
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 15,
            borderBottomWidth: 1,
            borderBottomColor: "#e5e5e5",
          }}
        >
          <Pressable onPress={onClose}>
            <Text style={styles.confirmButton}>Close</Text>
          </Pressable>
        </View>

        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }}>
          <Text style={styles.headerText}>
            Manage {user?.name}&apos;s account
          </Text>
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.modalLabel}>Notification Preference:</Text>
            <TouchableOpacity
              style={styles.selectBox}
              activeOpacity={0.9}
              onPress={() => user && onToggleEmailNotificationAlert(user)}
            >
              <View
                style={{ flexDirection: "row", gap: 6, alignItems: "center" }}
              >
                <MaterialIcons
                  name={
                    user?.alertNotification
                      ? "notifications-off"
                      : "notifications"
                  }
                  size={16}
                  color="#212529"
                  style={{ marginTop: 1 }}
                />
                <Text style={styles.selectText}>
                  {user?.alertNotification ? "Disable" : "Enable"} email alert
                  notifications
                </Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={16}
                color="#212529"
                style={{ marginTop: 1 }}
              />
            </TouchableOpacity>
          </View>
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.modalLabel}>Role Preference:</Text>
            <TouchableOpacity
              style={styles.selectBox}
              activeOpacity={0.9}
              onPress={() => user && onToggleUserRole(user)}
            >
              <View
                style={{ flexDirection: "row", gap: 6, alignItems: "center" }}
              >
                <MaterialIcons
                  name={user?.role === "admin" ? "person" : "verified-user"}
                  size={16}
                  color="#212529"
                  style={{ marginTop: 1 }}
                />
                <Text style={styles.selectText}>
                  Switch to {user?.role === "user" ? "Admin" : "User"}
                </Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={16}
                color="#212529"
                style={{ marginTop: 1 }}
              />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export default function UserManagement() {
  const { userData } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const { width } = useWindowDimensions();
  const tableMinWidth = Math.max(width, 760);
  const [isUserEditModalOpen, setIsUserEditModalOpen] = useState(false);
  const [accountData, setAccountData] = useState<User | null>(null);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogType, setDialogType] = useState<string | null>(null);
  const [dialogUser, setDialogUser] = useState<User | null>(null);

  const { data, error, isLoading, isError, refetch } = useQuery<UsersResponse>({
    queryKey: ["users", page, itemsPerPage, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        pageSize: itemsPerPage.toString(),
        ...(search ? { name: search } : {}),
      });
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/v1/api/users?${params}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_ADMIN_TOKEN}`,
            "Content-Type": "application/json",
            "Token-Type": "admin",
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
    enabled: userData?.role === "admin",
  });

  const { mutate: updateEmailNotification } = useMutation({
    mutationFn: async (newValue: {
      userId: string;
      alertNotification: boolean;
    }) => {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/v1/api/users/${newValue.userId}/notifications`,
        {
          method: "PATCH",
          body: JSON.stringify({
            alertNotification: newValue.alertNotification,
          }),
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_ADMIN_TOKEN}`,
            "Token-Type": "admin",
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to update this user's email notification preference"
        );
      }

      const data = await response.json();
      return data;
    },
    onSuccess: (data, variables) => {
      setAccountData((prev) =>
        prev && prev.id === variables.userId
          ? { ...prev, alertNotification: data.data.alertNotification }
          : prev
      );
      queryClient.invalidateQueries({
        queryKey: ["users", page, itemsPerPage, search],
      });
    },
  });

  const { mutate: updateUserRole } = useMutation({
    mutationFn: async (newValue: {
      userId: string;
      role: "admin" | "user";
    }) => {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/v1/api/users/${newValue.userId}/role`,
        {
          method: "PATCH",
          body: JSON.stringify({
            role: newValue.role,
          }),
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_ADMIN_TOKEN}`,
            "Token-Type": "admin",
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update this user's role");
      }

      const data = await response.json();
      return data;
    },
    onSuccess: (data, variables) => {
      setAccountData((prev) =>
        prev && prev.id === variables.userId
          ? { ...prev, role: data.data.role }
          : prev
      );
      queryClient.invalidateQueries({
        queryKey: ["users", page, itemsPerPage, search],
      });
    },
  });

  function toggleEmailNotificationAlert(user: User) {
    setDialogType("toggleEmail");
    setDialogUser(user);
    setDialogVisible(true);
  }

  function toggleUserRole(user: User) {
    setDialogType("toggleRole");
    setDialogUser(user);
    setDialogVisible(true);
  }

  useEffect(() => {
    setPage(0);
  }, [itemsPerPage, search]);

  const total = data?.pagination?.total ?? 0;
  const users = data?.data ?? [];
  const from = page * itemsPerPage;
  const to = Math.min((page + 1) * itemsPerPage, total);

  return (
    <AdminRoute>
      <SafeAreaView edges={["left", "right"]} style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          contentContainerStyle={{ gap: 12, paddingBottom: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              colors={["#1a314c"]}
              tintColor="#1a314c"
            />
          }
        >
          <TextInput
            style={styles.searchInput}
            placeholder="Search users by name..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#565b60ff"
          />
          {isLoading ? (
            <Card>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                nestedScrollEnabled={true}
                contentContainerStyle={{ minWidth: tableMinWidth }}
              >
                <DataTable
                  style={{
                    borderColor: "#e5e5e5",
                    overflow: "hidden",
                    minWidth: tableMinWidth,
                  }}
                >
                  <DataTable.Header
                    style={{
                      borderBottomWidth: 1,
                      borderBottomColor: "#e5e5e5",
                    }}
                  >
                    <DataTable.Title style={styles.colName}>
                      <Text style={styles.dataTableLabel}>Name</Text>
                    </DataTable.Title>
                    <DataTable.Title style={styles.colEmail}>
                      <Text style={styles.dataTableLabel}>Email</Text>
                    </DataTable.Title>
                    <DataTable.Title style={styles.colRole}>
                      <Text style={styles.dataTableLabel}>Role</Text>
                    </DataTable.Title>
                    <DataTable.Title style={styles.colAlert}>
                      <Text style={styles.dataTableLabel}>Email Alert</Text>
                    </DataTable.Title>
                    <DataTable.Title style={styles.colJoined}>
                      <Text style={styles.dataTableLabel}>Joined</Text>
                    </DataTable.Title>
                  </DataTable.Header>
                </DataTable>
              </ScrollView>
              <View style={{ width: tableMinWidth, paddingLeft: 16 }}>
                <DataTable.Pagination
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: "#e5e5e5",
                    alignSelf: "flex-start",
                  }}
                  page={page}
                  numberOfPages={Math.ceil(total / itemsPerPage)}
                  onPageChange={setPage}
                  label={
                    <Text style={styles.dataTableValue}>{`${
                      from + 1
                    }-${to} of ${total}`}</Text>
                  }
                  numberOfItemsPerPage={itemsPerPage}
                  onItemsPerPageChange={setItemsPerPage}
                  showFastPaginationControls
                  selectPageDropdownLabel={
                    <Text style={styles.dataTableValue}>Rows per page</Text>
                  }
                />
              </View>
            </Card>
          ) : isError ? (
            <View style={styles.centered}>
              <Text style={{ color: "red" }}>
                {error instanceof Error ? error.message : String(error)}
              </Text>
            </View>
          ) : (
            <Card>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                nestedScrollEnabled={true}
                contentContainerStyle={{ minWidth: tableMinWidth }}
              >
                <DataTable
                  style={{
                    borderColor: "#e5e5e5",
                    overflow: "hidden",
                    minWidth: tableMinWidth,
                  }}
                >
                  <DataTable.Header
                    style={{
                      borderBottomWidth: 1,
                      borderBottomColor: "#e5e5e5",
                    }}
                  >
                    <DataTable.Title style={styles.colName}>
                      <Text style={styles.dataTableLabel}>Name</Text>
                    </DataTable.Title>
                    <DataTable.Title style={styles.colEmail}>
                      <Text style={styles.dataTableLabel}>Email</Text>
                    </DataTable.Title>
                    <DataTable.Title style={styles.colRole}>
                      <Text style={styles.dataTableLabel}>Role</Text>
                    </DataTable.Title>
                    <DataTable.Title style={styles.colAlert}>
                      <Text style={styles.dataTableLabel}>Email Alert</Text>
                    </DataTable.Title>
                    <DataTable.Title style={styles.colJoined}>
                      <Text style={styles.dataTableLabel}>Joined</Text>
                    </DataTable.Title>
                  </DataTable.Header>
                  {users.map((user, idx) => (
                    <TouchableOpacity
                      key={user.id}
                      activeOpacity={userData?.id !== user.id ? 0.6 : 1}
                      onPress={() => {
                        if (userData?.id !== user.id) {
                          setAccountData(user);
                          setIsUserEditModalOpen(true);
                        }
                      }}
                    >
                      <DataTable.Row
                        style={{
                          borderBottomWidth: idx === users.length - 1 ? 0 : 1,
                          borderBottomColor: "#e5e5e5",
                        }}
                      >
                        <DataTable.Cell style={styles.colName}>
                          <View style={styles.nameRow}>
                            <Image
                              source={{ uri: user.profileImage }}
                              style={styles.profileImage}
                            />
                            <Text
                              style={styles.nameText}
                              numberOfLines={1}
                              ellipsizeMode="tail"
                            >
                              {user.name}
                            </Text>
                          </View>
                        </DataTable.Cell>
                        <DataTable.Cell style={styles.colEmail}>
                          <Text style={styles.dataTableValue}>
                            {user.email}
                          </Text>
                        </DataTable.Cell>
                        <DataTable.Cell style={styles.colRole}>
                          <Text
                            style={[
                              styles.badge,
                              user.role === "admin"
                                ? {
                                    backgroundColor: "#ffd43b",
                                    color: "#000000",
                                  }
                                : {
                                    backgroundColor: "#f3f4f6",
                                    color: "#1e2939",
                                  },
                            ]}
                          >
                            {user.role.charAt(0).toUpperCase() +
                              user.role.slice(1)}
                          </Text>
                        </DataTable.Cell>
                        <DataTable.Cell style={styles.colAlert}>
                          <Text
                            style={[
                              styles.badge,
                              user.alertNotification
                                ? {
                                    backgroundColor: "#dcfce7",
                                    color: "#016630",
                                  }
                                : {
                                    backgroundColor: "#ffe2e2",
                                    color: "#9f0712",
                                  },
                            ]}
                          >
                            {user.alertNotification ? "Enabled" : "Disabled"}
                          </Text>
                        </DataTable.Cell>
                        <DataTable.Cell style={styles.colJoined}>
                          <Text style={styles.dataTableValue}>
                            {new Date(user.createdAt).toLocaleDateString()}
                          </Text>
                        </DataTable.Cell>
                      </DataTable.Row>
                    </TouchableOpacity>
                  ))}
                </DataTable>
              </ScrollView>
              <View style={{ width: tableMinWidth, paddingLeft: 16 }}>
                <DataTable.Pagination
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: "#e5e5e5",
                    alignSelf: "flex-start",
                  }}
                  page={page}
                  numberOfPages={Math.ceil(total / itemsPerPage)}
                  onPageChange={setPage}
                  label={
                    <Text style={styles.dataTableValue}>{`${
                      from + 1
                    }-${to} of ${total}`}</Text>
                  }
                  numberOfItemsPerPage={itemsPerPage}
                  onItemsPerPageChange={setItemsPerPage}
                  showFastPaginationControls
                  selectPageDropdownLabel={
                    <Text style={styles.dataTableValue}>Rows per page</Text>
                  }
                />
              </View>
            </Card>
          )}
        </ScrollView>
        <EditUserModal
          visible={isUserEditModalOpen}
          user={accountData}
          onClose={() => {
            setIsUserEditModalOpen(false);
            setAccountData(null);
          }}
          onToggleEmailNotificationAlert={toggleEmailNotificationAlert}
          onToggleUserRole={toggleUserRole}
        />
        <Dialog
          visible={dialogVisible}
          title={
            dialogType === "toggleEmail"
              ? dialogUser?.alertNotification
                ? "Disable Email Notifications?"
                : "Enable Email Notifications?"
              : dialogType === "toggleRole"
              ? dialogUser?.role === "admin"
                ? "Change this user's role to User?"
                : "Change this user's role to Admin?"
              : ""
          }
          titleStyle={[styles.headerText, { textAlign: "center" }]}
          dialogStyle={styles.dialog}
          contentStyle={{ paddingTop: 8 }}
          onTouchOutside={() => setDialogVisible(false)}
          onRequestClose={() => setDialogVisible(false)}
          contentInsetAdjustmentBehavior="never"
          animationType="fade"
        >
          <View>
            <Text style={[styles.settingsText, { textAlign: "center" }]}>
              {dialogType === "toggleEmail"
                ? dialogUser?.alertNotification
                  ? "This user will no longer receive email alerts when earthquake activity is detected."
                  : "This user will receive email alerts when earthquake activity is detected."
                : dialogType === "toggleRole"
                ? dialogUser?.role === "admin"
                  ? "This user will lose administrative privileges and revert to a standard user."
                  : "This user will be granted administrative privileges and can manage other users."
                : ""}
            </Text>
            <View
              style={{
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                marginTop: 14,
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
                onPress={() => {
                  if (dialogType === "toggleEmail" && dialogUser) {
                    const currentValue = dialogUser.alertNotification || false;
                    updateEmailNotification({
                      userId: dialogUser.id,
                      alertNotification: !currentValue,
                    });
                  } else if (dialogType === "toggleRole" && dialogUser) {
                    const isAdmin = dialogUser.role === "admin";
                    updateUserRole({
                      userId: dialogUser.id,
                      role: isAdmin ? "user" : "admin",
                    });
                  }
                  setDialogVisible(false);
                }}
              >
                <Text style={styles.buttonText}>Continue</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.9}
                style={[
                  styles.outlineButton,
                  { width: "100%", alignItems: "center" },
                ]}
                onPress={() => setDialogVisible(false)}
              >
                <Text style={[styles.buttonText, { color: "#000" }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Dialog>
      </SafeAreaView>
    </AdminRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F4F7",
    paddingHorizontal: 16,
  },
  headerText: {
    fontSize: 16,
    color: "#212529",
    fontFamily: Platform.select({
      android: "PlusJakartaSans_600SemiBold",
      ios: "PlusJakartaSans-SemiBold",
    }),
  },
  profileImage: {
    width: 20,
    height: 20,
    borderRadius: 9999,
    marginLeft: 10,
  },
  dataTableLabel: {
    color: "#212529",
    fontFamily: Platform.select({
      android: "PlusJakartaSans_600SemiBold",
      ios: "PlusJakartaSans-SemiBold",
    }),
  },
  dataTableValue: {
    fontSize: 12,
    color: "#212529",
    fontFamily: Platform.select({
      android: "PlusJakartaSans_400Regular",
      ios: "PlusJakartaSans-Regular",
    }),
  },
  badge: {
    borderRadius: 9999,
    fontSize: 10,
    fontFamily: Platform.select({
      android: "PlusJakartaSans_500Medium",
      ios: "PlusJakartaSans-Medium",
    }),
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  searchInput: {
    borderColor: "#e5e5e5",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    height: 40,
    marginTop: 4,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    fontFamily: Platform.select({
      android: "PlusJakartaSans_500Medium",
      ios: "PlusJakartaSans-Medium",
    }),
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  colName: { width: 260 },
  colEmail: { width: 300, paddingHorizontal: 16 },
  colRole: { width: 110, paddingHorizontal: 16 },
  colAlert: { width: 120, paddingHorizontal: 16 },
  colJoined: { width: 120, paddingHorizontal: 16 },
  titleCell: { paddingHorizontal: 16 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  nameText: {
    flex: 1,
    fontSize: 12,
    color: "#212529",
    fontFamily: Platform.select({
      android: "PlusJakartaSans_500Medium",
      ios: "PlusJakartaSans-Medium",
    }),
  },
  paginationContainer: {
    justifyContent: "flex-start",
    alignItems: "flex-start",
    marginTop: 8,
    width: "100%",
  },
  modalLabel: {
    color: "#565b60ff",
    marginVertical: 8,
    fontFamily: Platform.select({
      android: "PlusJakartaSans_500Medium",
      ios: "PlusJakartaSans-Medium",
    }),
  },
  confirmButton: {
    color: "#193867",
    fontFamily: Platform.select({
      android: "PlusJakartaSans_600SemiBold",
      ios: "PlusJakartaSans-SemiBold",
    }),
  },
  cancelButton: {
    color: "#193867",
    fontFamily: Platform.select({
      android: "PlusJakartaSans_500Medium",
      ios: "PlusJakartaSans-Medium",
    }),
  },
  selectBox: {
    borderColor: "#e5e5e5",
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    height: 40,
    marginTop: 4,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectText: {
    fontFamily: Platform.select({
      android: "PlusJakartaSans_500Medium",
      ios: "PlusJakartaSans-Medium",
    }),
  },
  dialog: {
    borderRadius: 8,
  },
  settingsText: {
    fontSize: 14,
    color: "#565b60ff",
    fontFamily: Platform.select({
      android: "PlusJakartaSans_400Regular",
      ios: "PlusJakartaSans-Regular",
    }),
  },
  outlineButton: {
    borderColor: "#e5e5e5",
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  button: {
    backgroundColor: "#193867",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
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
  secondaryButton: {
    borderColor: "#e5e5e5",
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: "#f1f3f5",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
