import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import AdminHeader from "./admin-header";
import AdminSidebar from "./admin-sidebar";

type Props = {
  children: React.ReactNode;
};

export default function AdminLayout({ children }: Props) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>

        {/* ── Desktop fixed sidebar ── */}
        {isLargeScreen && (
          <AdminSidebar
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
            isLargeScreen={isLargeScreen}
          />
        )}

        {/* ── Mobile slide-out drawer overlay ── */}
        {!isLargeScreen && mobileMenuOpen && (
          <TouchableOpacity
            style={styles.drawerOverlay}
            activeOpacity={1}
            onPress={() => setMobileMenuOpen(false)}
          >
            <TouchableOpacity
              style={styles.drawerPanel}
              activeOpacity={1}
            >
              {/* Close button at top of drawer */}
              <View style={styles.drawerCloseBar}>
                <TouchableOpacity onPress={() => setMobileMenuOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Feather name="x" size={24} color="#1F2937" />
                </TouchableOpacity>
              </View>

              <AdminSidebar
                collapsed={false}
                onToggleCollapse={() => {}}
                isLargeScreen={false}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* ── Main content area (header + page body) ── */}
        <View style={styles.main}>
          <AdminHeader
            showMenuButton={!isLargeScreen}
            onMenuPress={() => setMobileMenuOpen(true)}
          />
          <View style={styles.pageBody}>{children}</View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  container: {
    flex: 1,
    flexDirection: "row",
    width: "100%",
    height: "100%",
  },
  main: {
    flex: 1,
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#F3F4F6",
  },
  pageBody: {
    flex: 1,
    overflow: "visible",
  },
  drawerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 999,
  },
  drawerPanel: {
    width: 260,
    height: "100%",
    backgroundColor: "#FFFFFF",
    elevation: 16,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  drawerCloseBar: {
    height: 52,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
});
