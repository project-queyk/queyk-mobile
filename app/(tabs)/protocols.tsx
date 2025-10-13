import { FlatList, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { protocols } from "@/utils/protocols";

import Card from "@/components/Card";

export default function Protocols() {
  return (
    <SafeAreaView
      edges={["left", "right"]}
      style={{
        flex: 1,
        backgroundColor: "#F2F4F7",
        paddingHorizontal: 16,
      }}
    >
      <FlatList
        data={protocols}
        keyExtractor={(item) => item.header}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 12 }}>
            <Card>
              <View
                style={{
                  gap: 4,
                  borderBottomColor: "#e5e5e5",
                  borderBottomWidth: 1,
                  paddingBottom: 16,
                }}
              >
                <Text style={styles.headerText}>{item.header}</Text>
                <Text style={styles.headerDescription}>{item.description}</Text>
              </View>
              <FlatList
                data={item.bulletItems}
                style={styles.cardContent}
                keyExtractor={(item) => item.title}
                renderItem={({ item }) => (
                  <View style={{ gap: 8 }}>
                    <Text style={styles.bulletItemTitle}>{item.title}</Text>
                    <Text style={styles.bulletItemDescription}>
                      {item.description}
                    </Text>
                  </View>
                )}
              />
            </Card>
          </View>
        )}
        ListFooterComponent={
          <Text style={styles.footerText}>
            Based on guidelines from NDRRMC, PHIVOLCS, and the Philippine
            Disaster Risk Reduction and Management Act (RA 10121)
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerText: {
    fontSize: 18,
    color: "#212529",
    fontFamily: Platform.select({
      android: "PlusJakartaSans_600SemiBold",
      ios: "PlusJakartaSans-SemiBold",
    }),
  },
  headerDescription: {
    fontSize: 14,
    color: "#565b60ff",
    fontFamily: Platform.select({
      android: "PlusJakartaSans_400Regular",
      ios: "PlusJakartaSans-Regular",
    }),
  },
  cardContent: { gap: 24, marginTop: 14 },
  bulletItemTitle: {
    fontSize: 16,
    color: "#193867",
    fontFamily: Platform.select({
      android: "PlusJakartaSans_600SemiBold",
      ios: "PlusJakartaSans-SemiBold",
    }),
  },
  bulletItemDescription: {
    fontSize: 14,
    color: "#565b60ff",
    fontFamily: Platform.select({
      android: "PlusJakartaSans_400Regular",
      ios: "PlusJakartaSans-Regular",
    }),
  },
  footerText: {
    color: "#565b60ff",
    marginBottom: 16,
    textAlign: "center",
    fontSize: 12,
    fontFamily: Platform.select({
      android: "PlusJakartaSans_400Regular",
      ios: "PlusJakartaSans-Regular",
    }),
  },
});
