import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";

type Props = {
  /** Called when the hamburger icon is tapped (mobile only) */
  onMenuPress: () => void;
  /** Hide the hamburger when the desktop sidebar is always visible */
  showMenuButton: boolean;
};

export default function AdminHeader({ onMenuPress, showMenuButton }: Props) {
  return (
    <View style={styles.header}>
      {/* Hamburger – shown on mobile only */}
      {showMenuButton && (
        <TouchableOpacity onPress={onMenuPress} style={styles.hamburgerBtn}>
          <Feather name="menu" size={20} color="#1F2937" />
        </TouchableOpacity>
      )}

      {/* Search box */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={16} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* Right-hand actions */}
      <View style={styles.actions}>
        {/* Dark mode */}
        <TouchableOpacity style={styles.actionBtn}>
          <Feather name="moon" size={18} color="#374151" />
        </TouchableOpacity>

        {/* Notifications */}
        <TouchableOpacity style={styles.actionBtn}>
          <Feather name="bell" size={18} color="#374151" />
          <View style={styles.notifBadge}>
            <Text style={styles.notifBadgeText}>1</Text>
          </View>
        </TouchableOpacity>

        {/* Settings */}
        <TouchableOpacity style={styles.actionBtn}>
          <Feather name="settings" size={18} color="#374151" />
        </TouchableOpacity>

        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>FL</Text>
        </View>
      </View>
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
});
