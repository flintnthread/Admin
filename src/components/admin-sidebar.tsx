import React from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";

type Props = {
  /** Whether the sidebar is in collapsed (icon-only) mode – desktop only */
  collapsed: boolean;
  /** Toggle collapsed state – desktop only */
  onToggleCollapse: () => void;
  /** Whether we are on a large (desktop) screen */
  isLargeScreen: boolean;
};

// Navigation items definition
const NAV_ITEMS = {
  GENERAL: [
    { label: "Dashboard", icon: "home", path: "/approveseller" },
    { label: "SEO Engine", icon: "globe", path: null },
  ],
  "EMPLOYEE MANAGEMENT": [
    { label: "Employee Management", icon: "user-plus", path: null },
    { label: "Role Management", icon: "shield", path: null },
    { label: "Activity Dashboard", icon: "clock", path: null },
  ],
  APPS: {
    label: "Ecommerce",
    icon: "shopping-bag",
    children: [
      { label: "Products", icon: "package", path: null },
      { label: "Customers", icon: "users", path: "/customerManagement" },
      { label: "Sellers", icon: "user-check", path: null },
      { label: "Sellers Graph", icon: "trending-up", path: null },
      { label: "Seller Bank Approval", icon: "credit-card", path: null },
      { label: "Orphaned Products", icon: "alert-circle", path: null },
      { label: "Orders", icon: "shopping-cart", path: "/orders" },
      { label: "Refund Management", icon: "rotate-ccw", path: null },
      { label: "Delivery Charges", icon: "truck", path: "/Deliverycharges" },
    ],
    standalone: [
      { label: "Pending Sellers", icon: "user-plus", path: null },
      { label: "Approved Sellers", icon: "user-check", path: "/approveseller" },
      { label: "Customer Support", icon: "headphones", path: null },
      { label: "Category Requests", icon: "grid", path: null },
      { label: "Seller Support", icon: "message-square", path: null },
    ],
  },
  "EMAIL MANAGEMENT": [
    { label: "Customer Emails", icon: "mail", path: null },
    { label: "Seller Emails", icon: "mail", path: null },
  ],
  "PAYMENTS & PRODUCTS": [
    { label: "Commission rates (B2B/B2C)", icon: "percent", path: "/commissionrates" },
    { label: "Seller Payments", icon: "dollar-sign", path: "/Sellerpayments" },
    { label: "Product Approvals", icon: "check-square", path: "/productApproval" },
    { label: "Add Sellers", icon: "user-plus", path: null },
    { label: "Ads Admin Users", icon: "user", path: null },
    { label: "Admin Panel Users", icon: "shield", path: null },
  ],
  CUSTOM: [
    {
      label: "Categories",
      icon: "grid",
      children: [
        { label: "Main Categories", icon: "layers", path: null },
        { label: "Subcategories", icon: "git-branch", path: null },
        { label: "Colors", icon: "droplet", path: null },
        { label: "Sizes", icon: "maximize", path: null },
      ]
    },
    {
      label: "FAQs",
      icon: "help-circle",
      children: [
        { label: "FAQ Categories", icon: "layers", path: "/faq-categories" },
        { label: "FAQ Questions", icon: "help-circle", path: null }
      ]
    },
    { label: "Contact Messages", icon: "mail", path: "/Contactmessages" },
    { label: "Logos", icon: "image", path: null },
    {
      label: "Banners",
      icon: "image",
      children: [
        { label: "Banner List", icon: "list", path: null }
      ]
    },
    {
      label: "Locations",
      icon: "map-pin",
      children: [
        { label: "Countries", icon: "globe", path: "/locations" },
        { label: "States", icon: "map", path: null },
        { label: "Cities", icon: "navigation", path: null },
        { label: "Areas", icon: "compass", path: null },
        { label: "Pincodes", icon: "hash", path: null }
      ]
    },
    {
      label: "Careers Management",
      icon: "briefcase",
      children: [
        { label: "Departments", icon: "layers", path: "/Departments" },
        { label: "Job Openings", icon: "briefcase", path: "/jobopenings" },
        { label: "Applications", icon: "file-text", path: "/jobApplications" }
      ]
    }
  ]
} as const;

export default function AdminSidebar({
  collapsed,
  onToggleCollapse,
  isLargeScreen,
}: Props) {
  const pathname = usePathname();
  const [ecommerceExpanded, setEcommerceExpanded] = React.useState(true);
  const [expandedItems, setExpandedItems] = React.useState<Record<string, boolean>>({});

  const toggleExpanded = (label: string) => {
    setExpandedItems((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (path: string | null) =>
    !!path && (pathname === path || pathname.startsWith(path + "/"));

  const navigate = (path: string | null) => {
    if (path) router.push(path as never);
  };

  return (
    <View style={[styles.sidebar, collapsed && styles.sidebarCollapsed]}>
      {/* Header row: logo + collapse toggle */}
      <View style={styles.sidebarHeader}>
        {!collapsed && (
          <Image
            source={require("../../assets/images/logo.jpg")}
            style={styles.logo}
            resizeMode="contain"
          />
        )}
        {isLargeScreen && (
          <TouchableOpacity onPress={onToggleCollapse} style={styles.collapseBtn}>
            <Feather
              name={collapsed ? "chevron-right" : "chevron-left"}
              size={16}
              color="#6B7280"
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Scrollable nav items */}
      <ScrollView 
        style={styles.navScroll} 
        contentContainerStyle={{ paddingBottom: 80 }} 
        showsVerticalScrollIndicator={false}
      >

        {/* GENERAL */}
        <View style={styles.section}>
          {!collapsed && <Text style={styles.sectionTitle}>GENERAL</Text>}
          {NAV_ITEMS.GENERAL.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, isActive(item.path) && styles.menuItemActive]}
              onPress={() => navigate(item.path)}
            >
              <Feather
                name={item.icon as any}
                size={18}
                color={isActive(item.path) ? "#EA580C" : "#6B7280"}
              />
              {!collapsed && (
                <Text
                  style={[
                    styles.menuItemText,
                    isActive(item.path) && styles.menuItemTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* EMPLOYEE MANAGEMENT */}
        <View style={styles.section}>
          {!collapsed && (
            <Text style={styles.sectionTitle}>EMPLOYEE MANAGEMENT</Text>
          )}
          {NAV_ITEMS["EMPLOYEE MANAGEMENT"].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, isActive(item.path) && styles.menuItemActive]}
              onPress={() => navigate(item.path)}
            >
              <Feather
                name={item.icon as any}
                size={18}
                color={isActive(item.path) ? "#EA580C" : "#6B7280"}
              />
              {!collapsed && (
                <Text
                  style={[
                    styles.menuItemText,
                    isActive(item.path) && styles.menuItemTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* APPS / Ecommerce */}
        <View style={styles.section}>
          {!collapsed && <Text style={styles.sectionTitle}>APPS</Text>}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setEcommerceExpanded(!ecommerceExpanded)}
          >
            <Feather name="shopping-bag" size={18} color="#6B7280" />
            {!collapsed && (
              <>
                <Text style={styles.menuItemText}>Ecommerce</Text>
                <Feather
                  name={ecommerceExpanded ? "chevron-down" : "chevron-right"}
                  size={14}
                  color="#6B7280"
                  style={styles.chevron}
                />
              </>
            )}
          </TouchableOpacity>

          {ecommerceExpanded && (
            <View style={[styles.subMenu, collapsed && styles.subMenuCollapsed]}>
              {NAV_ITEMS.APPS.children.map((child) => (
                <TouchableOpacity
                  key={child.label}
                  style={[
                    styles.subMenuItem,
                    isActive(child.path) && styles.subMenuItemActive,
                  ]}
                  onPress={() => navigate(child.path)}
                >
                  <Feather
                    name={child.icon as any}
                    size={14}
                    color={isActive(child.path) ? "#EA580C" : "#6B7280"}
                  />
                  {!collapsed && (
                    <Text
                      style={[
                        styles.subMenuItemText,
                        isActive(child.path) && styles.subMenuItemTextActive,
                      ]}
                    >
                      {child.label}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Standalone menu items below Ecommerce dropdown */}
          {NAV_ITEMS.APPS.standalone.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, isActive(item.path) && styles.menuItemActive]}
              onPress={() => navigate(item.path)}
            >
              <Feather
                name={item.icon as any}
                size={18}
                color={isActive(item.path) ? "#EA580C" : "#6B7280"}
              />
              {!collapsed && (
                <Text
                  style={[
                    styles.menuItemText,
                    isActive(item.path) && styles.menuItemTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* EMAIL MANAGEMENT */}
        <View style={styles.section}>
          {!collapsed && (
            <Text style={styles.sectionTitle}>EMAIL MANAGEMENT</Text>
          )}
          {NAV_ITEMS["EMAIL MANAGEMENT"].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, isActive(item.path) && styles.menuItemActive]}
              onPress={() => navigate(item.path)}
            >
              <Feather
                name={item.icon as any}
                size={18}
                color={isActive(item.path) ? "#EA580C" : "#6B7280"}
              />
              {!collapsed && (
                <Text
                  style={[
                    styles.menuItemText,
                    isActive(item.path) && styles.menuItemTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* PAYMENTS & PRODUCTS */}
        <View style={styles.section}>
          {!collapsed && (
            <Text style={styles.sectionTitle}>PAYMENTS & PRODUCTS</Text>
          )}
          {NAV_ITEMS["PAYMENTS & PRODUCTS"].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, isActive(item.path) && styles.menuItemActive]}
              onPress={() => navigate(item.path)}
            >
              <Feather
                name={item.icon as any}
                size={18}
                color={isActive(item.path) ? "#EA580C" : "#6B7280"}
              />
              {!collapsed && (
                <Text
                  style={[
                    styles.menuItemText,
                    isActive(item.path) && styles.menuItemTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* CUSTOM */}
        <View style={[styles.section, { marginBottom: 30 }]}>
          {!collapsed && <Text style={styles.sectionTitle}>CUSTOM</Text>}
          {NAV_ITEMS.CUSTOM.map((item) => {
            const hasChildren = 'children' in item;
            const isExpanded = hasChildren ? !!expandedItems[item.label] : false;

            return (
              <View key={item.label}>
                <TouchableOpacity
                  style={[styles.menuItem, !hasChildren && isActive(item.path) && styles.menuItemActive]}
                  onPress={() => {
                    if (hasChildren) {
                      toggleExpanded(item.label);
                    } else {
                      navigate(item.path);
                    }
                  }}
                >
                  <Feather
                    name={item.icon as any}
                    size={18}
                    color={!hasChildren && isActive(item.path) ? "#EA580C" : "#6B7280"}
                  />
                  {!collapsed && (
                    <>
                      <Text
                        style={[
                          styles.menuItemText,
                          !hasChildren && isActive(item.path) && styles.menuItemTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                      {hasChildren && (
                        <Feather
                          name={isExpanded ? "chevron-down" : "chevron-right"}
                          size={14}
                          color="#6B7280"
                          style={styles.chevron}
                        />
                      )}
                    </>
                  )}
                </TouchableOpacity>

                {hasChildren && isExpanded && (
                  <View style={[styles.subMenu, collapsed && styles.subMenuCollapsed]}>
                    {item.children.map((child) => (
                      <TouchableOpacity
                        key={child.label}
                        style={[
                          styles.subMenuItem,
                          isActive(child.path) && styles.subMenuItemActive,
                        ]}
                        onPress={() => navigate(child.path)}
                      >
                        <Feather
                          name={child.icon as any}
                          size={14}
                          color={isActive(child.path) ? "#EA580C" : "#6B7280"}
                        />
                        {!collapsed && (
                          <Text
                            style={[
                              styles.subMenuItemText,
                              isActive(child.path) && styles.subMenuItemTextActive,
                            ]}
                          >
                            {child.label}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 250,
    backgroundColor: "#FFFFFF",
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
    height: "100%",
    flexDirection: "column",
  },
  sidebarCollapsed: {
    width: 64,
  },
  sidebarHeader: {
    height: 64,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  logo: {
    width: 140,
    height: 35,
  },
  collapseBtn: {
    padding: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  navScroll: {
    flex: 1,
    paddingTop: 16,
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 6,
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  menuItemActive: {
    backgroundColor: "#FFF7ED",
  },
  menuItemText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: "500",
    color: "#4B5563",
    flex: 1,
  },
  menuItemTextActive: {
    color: "#EA580C",
    fontWeight: "600",
  },
  chevron: {
    marginLeft: "auto",
  },
  subMenu: {
    paddingLeft: 18,
    marginTop: 2,
    gap: 2,
  },
  subMenuCollapsed: {
    paddingLeft: 0,
  },
  subMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  subMenuItemActive: {
    backgroundColor: "#FFF7ED",
  },
  subMenuItemText: {
    marginLeft: 10,
    fontSize: 13,
    fontWeight: "500",
    color: "#4B5563",
  },
  subMenuItemTextActive: {
    marginLeft: 10,
    fontSize: 13,
    fontWeight: "600",
    color: "#EA580C",
  },
});
