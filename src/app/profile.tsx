import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  useWindowDimensions,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AdminLayout from "@/components/admin-layout";
import { useAuth } from "@/context/auth-context";
import { useTheme } from "@/hooks/use-theme";

export default function ProfileScreen() {
  const { user } = useAuth();
  const colors = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdatePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New password and confirmation do not match.");
      return;
    }

    setIsUpdating(true);
    setTimeout(() => {
      setIsUpdating(false);
      Alert.alert("Success", "Password updated successfully (mock).");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }, 1200);
  };

  const initials = user?.fullName ? user.fullName.slice(0, 2).toUpperCase() : "AD";

  return (
    <AdminLayout>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: isMobile ? 0 : 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.pageHeaderWrapper, isMobile && { marginHorizontal: 12, marginTop: 12, borderRadius: 16, padding: 16 }]}>
          {/* Header Breadcrumb */}
          <View style={styles.breadcrumb}>
            <TouchableOpacity onPress={() => router.replace("/Dashboard")}>
              <Text style={{ color: "#cbd5e1", fontSize: 13, fontWeight: "600" }}>🏠 Dashboard</Text>
            </TouchableOpacity>
            <Text style={{ color: "#94a3b8", fontSize: 13 }}> › </Text>
            <Text style={{ color: "#f1f5f9", fontSize: 13 }}>My Profile</Text>
          </View>

          <Text style={[styles.title, { color: "#ffffff", marginBottom: 0 }]}>Admin Profile</Text>
        </View>

        <View style={[styles.contentContainer, isMobile && { flexDirection: "column", paddingHorizontal: 12, marginTop: 0 }]}>
          {/* Left Column: Avatar & Role */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, !isMobile && { flex: 1 }, isMobile && { width: "100%" }]}>
            <View style={styles.avatarSection}>
              <View style={[styles.avatar, { backgroundColor: "#e8731a" }]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <Text style={[styles.userName, { color: colors.text }]}>
                {user?.fullName || "Flint Administrator"}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>
                {user?.email || "admin@flintandthread.com"}
              </Text>
              <View style={[styles.roleBadge, { backgroundColor: "#fff0e6" }]}>
                <Text style={{ color: "#e8731a", fontWeight: "700", fontSize: 11 }}>
                  SYSTEM ADMINISTRATOR
                </Text>
              </View>
            </View>
          </View>

          {/* Right Column: Account Details & Password Update */}
          <View style={[{ gap: 20 }, !isMobile ? { flex: 2 } : { width: "100%" }]}>
            {/* Account Details Card */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Account Details</Text>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Full Name</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {user?.fullName || "Flint Administrator"}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Email Address</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {user?.email || "admin@flintandthread.com"}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Security Role</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>Super Administrator</Text>
              </View>
              <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Status</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#10b981" }} />
                  <Text style={{ color: "#10b981", fontWeight: "700", fontSize: 13 }}>Active</Text>
                </View>
              </View>
            </View>

            {/* Password Update Card */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Change Password</Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Current Password</Text>
                <TextInput
                  secureTextEntry
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>New Password</Text>
                <TextInput
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Confirm New Password</Text>
                <TextInput
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                />
              </View>

              <TouchableOpacity
                onPress={handleUpdatePassword}
                disabled={isUpdating}
                style={[styles.btn, { backgroundColor: "#e8731a" }]}
              >
                <Text style={styles.btnText}>
                  {isUpdating ? "Updating..." : "Update Password"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
  },
  contentContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 20,
    minWidth: 280,
  },
  avatarSection: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "700",
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  roleBadge: {
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  btn: {
    height: 48,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  btnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  pageHeaderWrapper: {
    backgroundColor: '#151D4F',
    padding: 24,
    borderRadius: 22,
    marginBottom: 24,
  },
});
