import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { DataTable } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { UsersResponse } from "@/utils/types/users";

import { AdminRoute } from "@/components/AdminRoute";
import Card from "@/components/Card";

export default function UserManagement() {
  const { userData } = useAuth();
  const [page, setPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const { width } = useWindowDimensions();
  // Ensure the table can expand beyond the screen width and be scrolled horizontally.
  // Adjust `minWidth` as needed for column sizes — 760 is a reasonable default for 5 columns.
  const tableMinWidth = Math.max(width, 760);

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
                    <DataTable.Row
                      key={user.id}
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
                        <Text style={styles.dataTableValue}>{user.email}</Text>
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
    padding: 8,
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
});
