import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useThemeContext } from "@/context/theme-context";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/context/auth-context";

type Props = {
  /** Called when the hamburger icon is tapped (mobile only) */
  onMenuPress: () => void;
  /** Hide the hamburger when the desktop sidebar is always visible */
  showMenuButton: boolean;
};

export default function AdminHeader({ onMenuPress, showMenuButton }: Props) {
  const { theme, toggleTheme } = useThemeContext();
  const colors = useTheme();
  const isDark = theme === "dark";
  const { user, signOut } = useAuth();

  // Dropdown states
  const [notifOpen, setNotifOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  // Settings states
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [compactMode, setCompactMode] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState([
    { id: "1", text: "New seller request pending approval", time: "5 mins ago" },
    { id: "2", text: "Low stock alert: Silk Saree (only 3 left)", time: "1 hour ago" },
    { id: "3", text: "New support ticket #1042 created", time: "2 hours ago" },
  ]);

  const toggleNotif = () => {
    setNotifOpen(!notifOpen);
    setSettingsOpen(false);
    setProfileOpen(false);
  };

  const toggleSettings = () => {
    setSettingsOpen(!settingsOpen);
    setNotifOpen(false);
    setProfileOpen(false);
  };

  const toggleProfile = () => {
    setProfileOpen(!profileOpen);
    setNotifOpen(false);
    setSettingsOpen(false);
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  const router = useRouter();

  const handleProfileClick = () => {
    setProfileOpen(false);
    router.replace("/profile");
  };

  const handleLogoutClick = () => {
    setProfileOpen(false);
    setLogoutModalOpen(true);
  };

  const confirmLogout = () => {
    setLogoutModalOpen(false);
    signOut();
    router.replace("/login");
  };

  return (
    <View style={[
      styles.header, 
      showMenuButton && { marginBottom: 16 },
      { backgroundColor: colors.surface, borderBottomColor: colors.border }
    ]}>
      {/* Hamburger – shown on mobile only */}
      {showMenuButton && (
        <TouchableOpacity onPress={onMenuPress} style={styles.hamburgerBtn}>
          <Feather name="menu" size={20} color={colors.text} />
        </TouchableOpacity>
      )}

      {/* Search box */}
      <View style={[styles.searchContainer, { backgroundColor: isDark ? "#2A2B2D" : "#F3F4F6" }]}>
        <Feather name="search" size={16} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search..."
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      {/* Right-hand actions */}
      <View style={styles.actions}>
        {/* Dark mode toggle */}
        <TouchableOpacity onPress={toggleTheme} style={styles.actionBtn}>
          <Feather name={isDark ? "sun" : "moon"} size={18} color={isDark ? "#F59E0B" : "#374151"} />
        </TouchableOpacity>

        {/* Notifications */}
        <TouchableOpacity onPress={toggleNotif} style={styles.actionBtn}>
          <Feather name="bell" size={18} color={isDark ? "#FFFFFF" : "#374151"} />
          {notifications.length > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>{notifications.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Settings */}
        <TouchableOpacity onPress={toggleSettings} style={styles.actionBtn}>
          <Feather name="settings" size={18} color={isDark ? "#FFFFFF" : "#374151"} />
        </TouchableOpacity>

        {/* Avatar */}
        <TouchableOpacity onPress={toggleProfile} style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.fullName ? user.fullName.slice(0, 2).toUpperCase() : "FL"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notifications Dropdown */}
      {notifOpen && (
        <View style={[styles.dropdownCard, { right: 108, width: 280, backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.dropdownHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.dropdownTitle, { color: colors.text }]}>Notifications</Text>
            <TouchableOpacity onPress={handleClearNotifications}>
              <Text style={{ fontSize: 11, color: "#e8731a", fontWeight: "600" }}>Clear All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
            {notifications.length === 0 ? (
              <View style={{ padding: 16, alignItems: "center" }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>No new notifications</Text>
              </View>
            ) : (
              notifications.map((item) => (
                <View key={item.id} style={[styles.notifItem, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.notifText, { color: colors.text }]}>{item.text}</Text>
                  <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 4 }}>{item.time}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      )}

      {/* Settings Dropdown */}
      {settingsOpen && (
        <View style={[styles.dropdownCard, { right: 64, width: 220, backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.dropdownHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.dropdownTitle, { color: colors.text }]}>Dashboard Settings</Text>
          </View>
          <View style={{ padding: 12, gap: 12 }}>
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Auto Refresh</Text>
              <TouchableOpacity onPress={() => setAutoRefresh(!autoRefresh)} style={[styles.toggleBtn, autoRefresh && styles.toggleBtnActive]}>
                <Text style={[styles.toggleBtnText, autoRefresh && styles.toggleBtnTextActive]}>
                  {autoRefresh ? "ON" : "OFF"}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Compact Mode</Text>
              <TouchableOpacity onPress={() => setCompactMode(!compactMode)} style={[styles.toggleBtn, compactMode && styles.toggleBtnActive]}>
                <Text style={[styles.toggleBtnText, compactMode && styles.toggleBtnTextActive]}>
                  {compactMode ? "ON" : "OFF"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Profile Dropdown */}
      {profileOpen && (
        <View style={[styles.dropdownCard, { right: 20, width: 200, backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.dropdownHeader, { borderBottomColor: colors.border, flexDirection: "column", alignItems: "flex-start", gap: 2 }]}>
            <Text style={[styles.profileName, { color: colors.text }]} numberOfLines={1}>
              {user?.fullName || "Flint Admin"}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textSecondary }} numberOfLines={1}>
              {user?.email || "admin@flintandthread.com"}
            </Text>
          </View>
          <View style={{ padding: 6 }}>
            <TouchableOpacity onPress={handleProfileClick} style={styles.dropdownOption}>
              <Feather name="user" size={14} color={colors.text} style={{ marginRight: 8 }} />
              <Text style={[styles.dropdownOptionText, { color: colors.text }]}>My Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogoutClick} style={[styles.dropdownOption, { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4, paddingTop: 8 }]}>
              <Feather name="log-out" size={14} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={[styles.dropdownOptionText, { color: "#EF4444" }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Logout Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={logoutModalOpen}
        onRequestClose={() => setLogoutModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeaderIcon}>
              <Feather name="log-out" size={24} color="#EF4444" />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Confirm Logout</Text>
            <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
              Are you sure you want to sign out of your account? You will need to log in again to access the dashboard.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setLogoutModalOpen(false)}
                style={[styles.modalBtn, styles.cancelBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmLogout}
                style={[styles.modalBtn, styles.logoutBtn]}
              >
                <Text style={styles.logoutBtnText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 64,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 5,
    position: "relative",
  },
  hamburgerBtn: {
    padding: 6,
    marginRight: 10,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 38,
    flex: 1,
    maxWidth: 280,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: "auto",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#1F2937",
    padding: 0,
    // @ts-ignore – web-only: suppress default browser focus outline
    outlineStyle: "none",
    outlineWidth: 0,
    borderWidth: 0,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  notifBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#EF4444",
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
  },
  notifBadgeText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "700",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0D9488",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  dropdownCard: {
    position: "absolute",
    top: 58,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 5,
    zIndex: 10,
    paddingVertical: 4,
  },
  dropdownHeader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  notifItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  notifText: {
    fontSize: 12,
    lineHeight: 16,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingLabel: {
    fontSize: 12,
  },
  toggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: "#E5E7EB",
  },
  toggleBtnActive: {
    backgroundColor: "#e8731a",
  },
  toggleBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#374151",
  },
  toggleBtnTextActive: {
    color: "#FFFFFF",
  },
  profileName: {
    fontSize: 13,
    fontWeight: "700",
  },
  dropdownOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 4,
  },
  dropdownOptionText: {
    fontSize: 12,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    zIndex: 9999,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 12,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeaderIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  modalDesc: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalBtn: {
    flex: 1,
    height: 38,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtn: {
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  cancelBtnText: {
    fontWeight: "600",
    fontSize: 12,
  },
  logoutBtn: {
    backgroundColor: "#EF4444",
  },
  logoutBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 12,
  },
});
