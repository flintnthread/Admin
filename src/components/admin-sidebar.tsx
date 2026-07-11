import { useThemeContext } from "@/context/theme-context";
import { useTheme } from "@/hooks/use-theme";
import { Feather } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import React from "react";
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Platform,
} from "react-native";

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


    { label: "Dashboard", icon: "home", path: "/Dashboard", color: "#3B82F6" },
    { label: "SEO Engine", icon: "globe", path: null, color: "#10B981" },

  ],
  "EMPLOYEE MANAGEMENT": [
    {
      label: "Employee Management",
      icon: "user-plus",
      path: null,
      color: "#8B5CF6",
    },
    { label: "Role Management", icon: "shield", path: null, color: "#F59E0B" },
    {
      label: "Activity Dashboard",
      icon: "clock",
      path: null,
      color: "#EC4899",
    },
  ],
  APPS: {
    label: "Ecommerce",
    icon: "shopping-bag",
    color: "#6366F1",
    children: [
      {
        label: "Products",
        icon: "package",
        path: "/Products",
        color: "#0984e3",
      },
      {
        label: "Customers",
        icon: "users",
        path: "/customerManagement",
        color: "#00b894",
      },
      {
        label: "Sellers",
        icon: "user-check",
        path: "/sellers",
        color: "#6c5ce7",
      },
      {
        label: "Sellers Graph",
        icon: "trending-up",
        path: "/sellergraphs",
        color: "#e17055",
      },
      {
        label: "Seller Bank Approval",
        icon: "credit-card",
        path: "/sellerbankapproval",
        color: "#e84393",
      },
      {
        label: "Orders",
        icon: "shopping-cart",
        path: "/orders",
        color: "#d63031",
      },
      {
        label: "Delivery Charges",
        icon: "truck",
        path: "/Deliverycharges",
        color: "#00b359",
      },
    ],
    standalone: [
      {
        label: "Seller Management",
        icon: "user-plus",
        path: "/sellermanagement",
        color: "#3B82F6",
      },
      {
        label: "Pending Sellers",
        icon: "user-plus",
        path: "/pendingsellers",
        color: "#14B8A6",
      },
      {
        label: "Approved Sellers",
        icon: "user-check",
        path: "/approveseller",
        color: "#06B6D4",
      },
      {
        label: "Customer Support",
        icon: "headphones",
        path: "/Customersupport",
        color: "#0EA5E9",
      },
      {
        label: "Category Requests",
        icon: "grid",
        path: "/categoryRequests",
        color: "#8B5CF6",
      },
      {
        label: "Seller Support",
        icon: "message-square",
        path: "/Sellerticket",
        color: "#D946EF",
      },
    ],
  },
  "EMAIL MANAGEMENT": [
    { label: "Customer Emails", icon: "mail", path: null, color: "#F43F5E" },
    { label: "Seller Emails", icon: "mail", path: null, color: "#F97316" },
  ],
  "PAYMENTS & PRODUCTS": [
    {
      label: "Commission rates (B2B/B2C)",
      icon: "percent",
      path: "/commissionrates",
      color: "#EAB308",
    },
    {
      label: "Seller Payments",
      icon: "dollar-sign",
      path: "/Sellerpayments",
      color: "#84CC16",
    },
    {
      label: "Product Approvals",
      icon: "check-square",
      path: "/productApproval",
      color: "#22C55E",
    },
    { label: "Add Sellers", icon: "user-plus", path: null, color: "#10B981" },
    { label: "Ads Admin Users", icon: "user", path: null, color: "#14B8A6" },
    {
      label: "Admin Panel Users",
      icon: "shield",
      path: "/adminpanel",
      color: "#06B6D4",
    },
  ],
  ADVERTISING: [
    {
      label: "Ads Management",
      icon: "crosshair",
      color: "#3B82F6",
      path: null,
      children: [
        { label: "Ads Dashboard", icon: "pie-chart", path: null, color: "#3B82F6" },
        { label: "Ad Placements", icon: "layout", path: null, color: "#10B981" },
        { label: "Performance Ads", icon: "activity", path: null, color: "#F59E0B" },
        { label: "Campaigns & Packages", icon: "package", path: null, color: "#8B5CF6" },
        { label: "Ads Types & Details", icon: "layers", path: null, color: "#EC4899" },
        { label: "Orders Management", icon: "shopping-cart", path: null, color: "#14B8A6" },
        { label: "Payments Management", icon: "credit-card", path: null, color: "#F97316" },
        { label: "Customers Management", icon: "users", path: null, color: "#06B6D4" },
        { label: "Notifications", icon: "bell", path: null, color: "#EAB308" },
      ],
    },
  ],
  CUSTOM: [
    {
      label: "Categories",
      icon: "grid",
      color: "#8B5CF6",
      path: null,
      children: [
        {
          label: "Main Categories",
          icon: "layers",
          path: "/mainCategories",
          color: "#A855F7",
        },
        {
          label: "Subcategories",
          icon: "git-branch",
          path: "/subCategories",
          color: "#D946EF",
        },
        { label: "Colors", icon: "droplet", path: "/colors", color: "#EC4899" },
        { label: "Sizes", icon: "maximize", path: "/sizes", color: "#F43F5E" },
      ],
    },
    {
      label: "FAQs",
      icon: "help-circle",
      color: "#F59E0B",
      path: null,
      children: [
        {
          label: "FAQ Categories",
          icon: "layers",
          path: "/faq-categories",
          color: "#F97316",
        },
        {
          label: "FAQ Questions",
          icon: "help-circle",
          path: "/Faqs",
          color: "#EF4444",
        },
      ],
    },  
    {
      label: "Message Center",
      icon: "mail",
      path: "/message-center",
      color: "#3B82F6",
    },
    { label: "Logos", icon: "image", path: null, color: "#0EA5E9" },
    {
      label: "Banners",
      icon: "image",
      color: "#06B6D4",
      path: null,
      children: [
        { label: "Banner List", icon: "list", path: null, color: "#14B8A6" },
      ],
    },
    {
      label: "Locations",
      icon: "map-pin",
      color: "#10B981",
      path: "/locations",
    },
    {
      label: "Careers Management",
      icon: "briefcase",
      color: "#8B5CF6",
      path: null,
      children: [
        {
          label: "Departments",
          icon: "layers",
          path: "/Departments",
          color: "#6366F1",
        },
        {
          label: "Job Openings",
          icon: "briefcase",
          path: "/jobopenings",
          color: "#3B82F6",
        },
        {
          label: "Applications",
          icon: "file-text",
          path: "/jobApplications",
          color: "#0EA5E9",
        },
      ],
    },
  ],
} as const;

export default function AdminSidebar({
  collapsed,
  onToggleCollapse,
  isLargeScreen,
}: Props) {
  const pathname = usePathname();

  const isActive = (path: string | null) =>
    !!path && (pathname === path || pathname.startsWith(path + "/"));

  const [ecommerceExpanded, setEcommerceExpanded] = React.useState(() => {
    return NAV_ITEMS.APPS.children.some((child) => isActive(child.path));
  });

  const [expandedItems, setExpandedItems] = React.useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    NAV_ITEMS.ADVERTISING.forEach((item) => {
      if ("children" in item && item.children.some((c) => isActive(c.path))) {
        initialState[item.label] = true;
      }
    });
    NAV_ITEMS.CUSTOM.forEach((item) => {
      if ("children" in item && item.children.some((c) => isActive(c.path))) {
        initialState[item.label] = true;
      }
    });
    return initialState;
  });

  const toggleExpanded = (label: string) => {
    setExpandedItems((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const navigate = (path: string | null) => {
    if (path) router.push(path as never);
  };

  const colors = useTheme();
  const { theme } = useThemeContext();
  const isDark = theme === "dark";

  return (
    <View
      style={[
        styles.sidebar,
        collapsed && styles.sidebarCollapsed,
        !isLargeScreen && { flex: 1, height: undefined }, // Fix mobile drawer overflow
        { backgroundColor: colors.surface, borderRightColor: colors.border },
      ]}
    >
      {/* Header row: logo + collapse toggle */}
      <View
        style={[styles.sidebarHeader, { borderBottomColor: colors.border }]}
      >
        {!collapsed && (
          <Image
            source={require("../../assets/images/logo.jpg")}
            style={styles.logo}
            resizeMode="contain"
          />
        )}
        {isLargeScreen && (
          <TouchableOpacity
            onPress={onToggleCollapse}
            style={[
              styles.collapseBtn,
              {
                backgroundColor: isDark ? "#374151" : "#F9FAFB",
                borderColor: colors.border,
              },
            ]}
          >
            <Feather
              name={collapsed ? "chevron-right" : "chevron-left"}
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Scrollable nav items */}
      <ScrollView
        style={styles.navScroll}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 20 : 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* GENERAL */}
        <View style={styles.section}>
          {!collapsed && <Text style={styles.sectionTitle}>GENERAL</Text>}
          {NAV_ITEMS.GENERAL.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.menuItem,
                isActive(item.path) && styles.menuItemActive,
              ]}
              onPress={() => navigate(item.path)}
            >
              <Feather
                name={item.icon as any}
                size={18}
                color={
                  isActive(item.path)
                    ? "#EA580C"
                    : (item as any).color || "#6B7280"
                }
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
              style={[
                styles.menuItem,
                isActive(item.path) && styles.menuItemActive,
              ]}
              onPress={() => navigate(item.path)}
            >
              <Feather
                name={item.icon as any}
                size={18}
                color={
                  isActive(item.path)
                    ? "#EA580C"
                    : (item as any).color || "#6B7280"
                }
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
            <Feather
              name="shopping-bag"
              size={18}
              color={NAV_ITEMS.APPS.color || "#6B7280"}
            />
            {!collapsed && (
              <>
                <Text style={styles.menuItemText}>Ecommerce</Text>
                <Feather
                  name={ecommerceExpanded ? "chevron-down" : "chevron-right"}
                  size={14}
                  color={colors.textSecondary}
                  style={styles.chevron}
                />
              </>
            )}
          </TouchableOpacity>

          {ecommerceExpanded && (
            <View
              style={[styles.subMenu, collapsed && styles.subMenuCollapsed]}
            >
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
                    color={
                      isActive(child.path)
                        ? "#EA580C"
                        : (child as any).color || "#6B7280"
                    }
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
              style={[
                styles.menuItem,
                isActive(item.path) && styles.menuItemActive,
              ]}
              onPress={() => navigate(item.path)}
            >
              <Feather
                name={item.icon as any}
                size={18}
                color={
                  isActive(item.path)
                    ? "#EA580C"
                    : (item as any).color || "#6B7280"
                }
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
              style={[
                styles.menuItem,
                isActive(item.path) && styles.menuItemActive,
              ]}
              onPress={() => navigate(item.path)}
            >
              <Feather
                name={item.icon as any}
                size={18}
                color={
                  isActive(item.path)
                    ? "#EA580C"
                    : (item as any).color || "#6B7280"
                }
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
              style={[
                styles.menuItem,
                isActive(item.path) && styles.menuItemActive,
              ]}
              onPress={() => navigate(item.path)}
            >
              <Feather
                name={item.icon as any}
                size={18}
                color={
                  isActive(item.path)
                    ? "#EA580C"
                    : (item as any).color || "#6B7280"
                }
              />
              {!collapsed && (
                <Text
                  style={[
                    styles.menuItemText,
                    isActive((item as any).path) && styles.menuItemTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ADVERTISING */}
        <View style={styles.section}>
          {!collapsed && <Text style={styles.sectionTitle}>ADVERTISING</Text>}
          {NAV_ITEMS.ADVERTISING.map((item) => {
            const hasChildren = "children" in item;
            const isExpanded = hasChildren
              ? !!expandedItems[item.label]
              : false;

            return (
              <View key={item.label}>
                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    !hasChildren &&
                      isActive((item as any).path) &&
                      styles.menuItemActive,
                    isExpanded && { backgroundColor: "#F5F3FF" },
                  ]}
                  onPress={() => {
                    if (hasChildren) {
                      toggleExpanded(item.label);
                    } else {
                      navigate((item as any).path);
                    }
                  }}
                >
                  <Feather
                    name={item.icon as any}
                    size={18}
                    color={
                      !hasChildren && isActive((item as any).path)
                        ? "#EA580C"
                        : (item as any).color || "#6B7280"
                    }
                  />
                  {!collapsed && (
                    <>
                      <Text
                        style={[
                          styles.menuItemText,
                          !hasChildren &&
                            isActive((item as any).path) &&
                            styles.menuItemTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                      {hasChildren && (
                        <Feather
                          name={isExpanded ? "chevron-down" : "chevron-right"}
                          size={14}
                          color={colors.textSecondary}
                          style={styles.chevron}
                        />
                      )}
                    </>
                  )}
                </TouchableOpacity>

                {hasChildren && isExpanded && (
                  <View
                    style={[
                      styles.subMenu,
                      collapsed && styles.subMenuCollapsed,
                    ]}
                  >
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
                          color={
                            isActive(child.path)
                              ? "#EA580C"
                              : (child as any).color || "#6B7280"
                          }
                        />
                        {!collapsed && (
                          <Text
                            style={[
                              styles.subMenuItemText,
                              isActive(child.path) &&
                                styles.subMenuItemTextActive,
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

        {/* CUSTOM */}
        <View style={[styles.section, { marginBottom: 0 }]}>
          {!collapsed && <Text style={styles.sectionTitle}>CUSTOM</Text>}
          {NAV_ITEMS.CUSTOM.map((item) => {
            const hasChildren = "children" in item;
            const isExpanded = hasChildren
              ? !!expandedItems[item.label]
              : false;

            return (
              <View key={item.label}>
                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    !hasChildren &&
                      isActive((item as any).path) &&
                      styles.menuItemActive,
                  ]}
                  onPress={() => {
                    if (hasChildren) {
                      toggleExpanded(item.label);
                    } else {
                      navigate((item as any).path);
                    }
                  }}
                >
                  <Feather
                    name={item.icon as any}
                    size={18}
                    color={
                      !hasChildren && isActive((item as any).path)
                        ? "#EA580C"
                        : (item as any).color || colors.textSecondary
                    }
                  />
                  {!collapsed && (
                    <>
                      <Text
                        style={[
                          styles.menuItemText,
                          !hasChildren &&
                            isActive((item as any).path) &&
                            styles.menuItemTextActive,
                          !isActive((item as any).path) && {
                            color: isDark ? "#D1D5DB" : "#4B5563",
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                      {hasChildren && (
                        <Feather
                          name={isExpanded ? "chevron-down" : "chevron-right"}
                          size={14}
                          color={colors.textSecondary}
                          style={styles.chevron}
                        />
                      )}
                    </>
                  )}
                </TouchableOpacity>

                {hasChildren && isExpanded && (
                  <View
                    style={[
                      styles.subMenu,
                      collapsed && styles.subMenuCollapsed,
                    ]}
                  >
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
                          color={
                            isActive(child.path)
                              ? "#EA580C"
                              : (child as any).color || colors.textSecondary
                          }
                        />
                        {!collapsed && (
                          <Text
                            style={[
                              styles.subMenuItemText,
                              isActive(child.path) &&
                                styles.subMenuItemTextActive,
                              !isActive(child.path) && {
                                color: isDark ? "#9CA3AF" : "#4B5563",
                              },
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
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    overflow: "hidden",
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
