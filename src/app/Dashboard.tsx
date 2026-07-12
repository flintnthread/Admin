/**
 * Dashboard.tsx
 * Enhanced Enterprise SaaS Admin Dashboard.
 * Syncs analytics across Web and Mobile with shared API logic and visual layouts.
 * Includes tabs for Overview, Sales & Orders, Catalog & Inventory, and Users & Partners.
 */

// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
  TextInput,
  Image,
  Pressable,
  Modal
} from "react-native";
import { Ionicons, Feather, FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Path,
  Circle,
  G,
  Line,
  Rect,
  Text as SvgText,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  TSpan
} from "react-native-svg";
import AdminLayout from "@/components/admin-layout";
import { useThemeContext } from "@/context/theme-context";
import { useAuth } from "@/context/auth-context";

// API Services
import {
  fetchDashboardStats,
  fetchDashboardRevenueChart,
  fetchDashboardTopProducts,
  fetchDashboardTopSellers,
  fetchDashboardInventoryAlerts,
  fetchDashboardActivity,
  fetchDashboardTraffic,
  fetchDashboardCatalogQuality,
  type DashboardTopProduct,
} from "@/services/dashboardApi";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatDate } from "@/lib/format";
import { fetchOrders } from "@/services/orderApi";
import { fetchSellers, fetchSellerAnalyticsSummary } from "@/services/sellerApi";
import { fetchProductStats } from "@/services/productApi";
import { fetchCustomers, fetchCustomerStats } from "@/services/customerApi";
import { getApiErrorMessage } from "@/lib/api/client";

// Palette
const getPalette = (isDark: boolean) => ({
  bg: isDark ? "#0f172a" : "#F8FAFC",
  surface: isDark ? "#1e293b" : "#FFFFFF",
  primary: "#e8731a", // Orange
  primaryLight: isDark ? "#432a18" : "#fff0e6",
  primaryDark: "#c2410c",
  navy: isDark ? "#f1f5f9" : "#1e293b",
  text: isDark ? "#f1f5f9" : "#0f172a",
  sub: isDark ? "#94a3b8" : "#64748b",
  border: isDark ? "#334155" : "#e2e8f0",
  active: "#10b981", // Green
  activeBg: isDark ? "#064e3b" : "#dcfce7",
  inactive: "#ef4444", // Red
  inactiveBg: isDark ? "#7f1d1d" : "#fee2e2",
  processing: "#0ea5e9", // Blue
  processingBg: isDark ? "#0c4a6e" : "#e0f2fe",
  warning: "#f59e0b", // Yellow
  warningBg: isDark ? "#78350f" : "#fef3c7",
  purple: "#8b5cf6", // Purple
  purpleBg: isDark ? "#4c1d95" : "#f3e8ff",
  violet: "#6366f1", // Violet
  violetBg: isDark ? "#2e1065" : "#e0e7ff",
  grey: "#64748b",
  greyBg: isDark ? "#374151" : "#f1f5f9",
});

function formatOrderStatus(status?: string) {
  if (!status) return "Processing";
  const normalized = status.toLowerCase();
  if (normalized.includes("complete") || normalized.includes("deliver")) return "Completed";
  if (normalized.includes("cancel")) return "Cancelled";
  if (normalized.includes("return") || normalized.includes("refund")) return "Returned";
  if (normalized.includes("ship")) return "Shipped";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatPaymentMethod(method?: string) {
  if (!method) return "Online";
  const normalized = method.toLowerCase();
  if (normalized.includes("cod") || normalized.includes("cash")) return "COD";
  return "Online";
}

function chartYLabels(maxVal: number) {
  const step = maxVal / 5;
  return Array.from({ length: 6 }, (_, i) => `₹${Math.round(maxVal - step * i)}`);
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type TopProductRow = {
  id: string;
  name: string;
  sales: number;
  revenue: number;
  stock: string;
  stockCount: number;
  imageUrl: string;
};

function TopProductThumb({ uri, size = 40 }: { uri: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(uri) && !failed;
  const thumbStyle = {
    width: size,
    height: size,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    overflow: "hidden" as const,
  };

  if (!showImage) {
    return (
      <View style={thumbStyle}>
        <Ionicons name="cube-outline" size={size * 0.45} color="#94a3b8" />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={thumbStyle}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { width: rnWidth } = useWindowDimensions();
  const [screenW, setScreenW] = useState<number>(rnWidth);

  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      setScreenW(window.innerWidth);
      const handleResize = () => {
        setScreenW(window.innerWidth);
      };
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") {
      setScreenW(rnWidth);
    }
  }, [rnWidth]);

  const isLargeScreen = screenW >= 1024;
  const isTablet = screenW >= 768 && screenW < 1024;
  const isMobile = screenW < 768;

  const { theme } = useThemeContext();
  const isDark = theme === "dark";
  const C = useMemo(() => getPalette(isDark), [isDark]);
  const styles = useMemo(() => getStyles(isDark, screenW), [isDark, screenW]);

  const { token, isLoading: authLoading } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState<"overview" | "sales" | "inventory" | "users">("overview");

  // State for chart hover / tooltip interaction
  const [hoveredPoint, setHoveredPoint] = useState<{
    index: number;
    x: number;
    revenueY: number;
    ordersY: number;
    revenue: number;
    orders: number;
    label: string;
  } | null>(null);

  // State for bar chart hover / tooltip interaction
  const [hoveredBar, setHoveredBar] = useState<{
    index: number;
    value: number;
    x: number;
    y: number;
    label: string;
  } | null>(null);

  // Dynamic header height measurement
  const [headerHeight, setHeaderHeight] = useState(130);

  // ScrollView ref and layout position tracking
  const scrollViewRef = React.useRef<ScrollView>(null);
  const [sectionOffsets, setSectionOffsets] = useState<Record<string, number>>({
    overview: 0,
    sales: 0,
    inventory: 0,
    users: 0,
  });

  // Programmatical scrolling lock to avoid layout fights
  const [isManualScrolling, setIsManualScrolling] = useState(false);
  const manualScrollTimeoutRef = React.useRef<any>(null);

  const handleTabPress = useCallback((key: "overview" | "sales" | "inventory" | "users") => {
    setIsManualScrolling(true);
    setActiveTab(key);

    const paddingTopVal = headerHeight + 10;
    const absolutePosition = (sectionOffsets[key] || 0) + paddingTopVal;

    // Position the section heading directly below the fixed header (scroll offset equal to header height)
    const targetY = Math.max(0, absolutePosition - headerHeight);

    scrollViewRef.current?.scrollTo({ y: targetY, animated: true });

    if (manualScrollTimeoutRef.current) {
      clearTimeout(manualScrollTimeoutRef.current);
    }
    manualScrollTimeoutRef.current = setTimeout(() => {
      setIsManualScrolling(false);
    }, 1000);
  }, [sectionOffsets, headerHeight]);

  const handleScroll = useCallback((event: any) => {
    if (isManualScrolling) return;
    const y = event.nativeEvent.contentOffset.y;

    const paddingTopVal = headerHeight + 10;
    const getAbsoluteY = (k: string) => {
      return (sectionOffsets[k] || 0) + paddingTopVal;
    };

    // A section is active when its heading reaches the bottom of the fixed header (with a 20px tolerance)
    const threshold = headerHeight + 20;

    const sorted = [
      { key: "overview", y: getAbsoluteY("overview") },
      { key: "sales", y: getAbsoluteY("sales") },
      { key: "inventory", y: getAbsoluteY("inventory") },
      { key: "users", y: getAbsoluteY("users") },
    ].sort((a, b) => b.y - a.y);

    for (const section of sorted) {
      if (y >= section.y - threshold) {
        setActiveTab(section.key as any);
        break;
      }
    }
  }, [sectionOffsets, isManualScrolling, headerHeight]);

  useEffect(() => {
    return () => {
      if (manualScrollTimeoutRef.current) {
        clearTimeout(manualScrollTimeoutRef.current);
      }
    };
  }, []);

  // Collapsible sections state for Overview removed (sections are permanently expanded)



  // API Data States
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [sellerStats, setSellerStats] = useState<any>(null);
  const [productStats, setProductStats] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerStats, setCustomerStats] = useState<any>(null);
  const [sellers, setSellers] = useState<any[]>([]);
  const [revenueChart, setRevenueChart] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<DashboardTopProduct[]>([]);
  const [topSellers, setTopSellers] = useState<any[]>([]);
  const [inventoryAlerts, setInventoryAlerts] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [traffic, setTraffic] = useState<any>(null);
  const [catalogQuality, setCatalogQuality] = useState<any>(null);

  // UX Controls
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpiErrors, setKpiErrors] = useState<Record<string, boolean>>({});
  const [kpiLoading, setKpiLoading] = useState<Record<string, boolean>>({});

  // Tab 2 Controls: Date Filters
  const [startDate, setStartDate] = useState("01/01/2026");
  const [endDate, setEndDate] = useState("31/12/2026");
  const [revenueTimeframe, setRevenueTimeframe] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [activeRevenueLegends, setActiveRevenueLegends] = useState({ revenue: true, orders: true });
  // Local loading state for revenue chart only
  const [chartLoading, setChartLoading] = useState(false);
  const [chartWidth, setChartWidth] = useState(520);

  // Custom Date Picker States
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<"start" | "end">("start");
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());
  const [pickerYear, setPickerYear] = useState(2026);
  const [pickerMode, setPickerMode] = useState<"days" | "months" | "years">("days");

  // Refs for the date inputs and the active dropdown card
  const startButtonRef = React.useRef<any>(null);
  const endButtonRef = React.useRef<any>(null);
  const datePickerRef = React.useRef<any>(null);

  const parseDateStr = useCallback((str: string): Date => {
    const parts = str.split("/");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return new Date();
  }, []);

  const formatDateStr = useCallback((date: Date): string => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }, []);

  const openDatePicker = useCallback((target: "start" | "end") => {
    if (datePickerVisible && datePickerTarget === target) {
      setDatePickerVisible(false);
    } else {
      setDatePickerTarget(target);
      const currentDate = parseDateStr(target === "start" ? startDate : endDate);
      setPickerMonth(currentDate.getMonth());
      setPickerYear(currentDate.getFullYear());
      setPickerMode("days");
      setDatePickerVisible(true);
    }
  }, [datePickerVisible, datePickerTarget, startDate, endDate, parseDateStr]);

  // Listen for clicks outside the date picker dropdown and Escape keypresses (Web support)
  useEffect(() => {
    if (Platform.OS !== "web" || !datePickerVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDatePickerVisible(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (datePickerRef.current) {
        const target = e.target as HTMLElement;
        const isInsideCalendar = datePickerRef.current.contains(target);
        const isInsideStartBtn = startButtonRef.current && startButtonRef.current.contains(target);
        const isInsideEndBtn = endButtonRef.current && endButtonRef.current.contains(target);

        if (!isInsideCalendar && !isInsideStartBtn && !isInsideEndBtn) {
          setDatePickerVisible(false);
        }
      }
    };

    // Minor delay to prevent handling the click event that triggers the open
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [datePickerVisible]);

  const handlePrevMonth = useCallback(() => {
    setPickerMonth(prev => {
      if (prev === 0) {
        setPickerYear(y => y - 1);
        return 11;
      }
      return prev - 1;
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setPickerMonth(prev => {
      if (prev === 11) {
        setPickerYear(y => y + 1);
        return 0;
      }
      return prev + 1;
    });
  }, []);

  const getDaysInMonth = useCallback((month: number, year: number) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        month: month === 0 ? 11 : month - 1,
        year: month === 0 ? year - 1 : year,
        isCurrentMonth: false
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        month,
        year,
        isCurrentMonth: true
      });
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        month: month === 11 ? 0 : month + 1,
        year: month === 11 ? year + 1 : year,
        isCurrentMonth: false
      });
    }

    return days;
  }, []);

  const renderPickerHeader = () => {
    if (pickerMode === "days") {
      return (
        <View style={styles.calHeader}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.calHeaderBtn}>
            <Ionicons name="chevron-back-outline" size={18} color={C.text} />
          </TouchableOpacity>
          <View style={styles.calHeaderTitleRow}>
            <TouchableOpacity onPress={() => setPickerMode("months")} style={styles.calHeaderTextBtn}>
              <Text style={styles.calHeaderTitleText}>{MONTHS[pickerMonth]}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPickerMode("years")} style={styles.calHeaderTextBtn}>
              <Text style={styles.calHeaderTitleText}>{pickerYear}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={handleNextMonth} style={styles.calHeaderBtn}>
            <Ionicons name="chevron-forward-outline" size={18} color={C.text} />
          </TouchableOpacity>
        </View>
      );
    } else if (pickerMode === "months") {
      return (
        <View style={styles.calHeader}>
          <Text style={styles.calHeaderTitleTextSingle}>Select Month</Text>
        </View>
      );
    } else {
      return (
        <View style={styles.calHeader}>
          <Text style={styles.calHeaderTitleTextSingle}>Select Year</Text>
        </View>
      );
    }
  };

  const renderCalendarContent = () => {
    if (pickerMode === "days") {
      const days = getDaysInMonth(pickerMonth, pickerYear);
      const selectedDate = parseDateStr(datePickerTarget === "start" ? startDate : endDate);

      return (
        <View style={styles.calDaysContainer}>
          <View style={styles.calWeekdaysRow}>
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
              <Text key={d} style={styles.calWeekdayText}>{d}</Text>
            ))}
          </View>
          <ScrollView style={styles.calGridScroll} nestedScrollEnabled={true} showsVerticalScrollIndicator={false}>
            <View style={styles.calGrid}>
              {days.map((item, idx) => {
                const isSelected = selectedDate.getDate() === item.day &&
                  selectedDate.getMonth() === item.month &&
                  selectedDate.getFullYear() === item.year;

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.calDayCell,
                      !item.isCurrentMonth && styles.calDayCellMuted,
                      isSelected && styles.calDayCellSelected
                    ]}
                    onPress={() => {
                      const newDate = new Date(item.year, item.month, item.day);
                      if (datePickerTarget === "start") {
                        setStartDate(formatDateStr(newDate));
                      } else {
                        setEndDate(formatDateStr(newDate));
                      }
                      setDatePickerVisible(false);
                    }}
                  >
                    <Text style={[
                      styles.calDayText,
                      !item.isCurrentMonth && styles.calDayTextMuted,
                      isSelected && styles.calDayTextSelected
                    ]}>
                      {item.day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      );
    } else if (pickerMode === "months") {
      return (
        <ScrollView style={styles.calGridScroll} nestedScrollEnabled={true} showsVerticalScrollIndicator={false}>
          <View style={styles.calMonthsGrid}>
            {MONTHS.map((m, idx) => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.calMonthCell,
                  pickerMonth === idx && styles.calMonthCellSelected
                ]}
                onPress={() => {
                  setPickerMonth(idx);
                  setPickerMode("days");
                }}
              >
                <Text style={[
                  styles.calMonthText,
                  pickerMonth === idx && styles.calMonthTextSelected
                ]}>
                  {m.slice(0, 3)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      );
    } else {
      const years = Array.from({ length: 15 }, (_, i) => 2020 + i);
      return (
        <View style={styles.calYearsContainer}>
          <ScrollView style={styles.calYearsScroll} nestedScrollEnabled contentContainerStyle={styles.calYearsGrid}>
            {years.map(y => (
              <TouchableOpacity
                key={y}
                style={[
                  styles.calYearCell,
                  pickerYear === y && styles.calYearCellSelected
                ]}
                onPress={() => {
                  setPickerYear(y);
                  setPickerMode("days");
                }}
              >
                <Text style={[
                  styles.calYearText,
                  pickerYear === y && styles.calYearTextSelected
                ]}>
                  {y}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      );
    }
  };

  // Tab 3 Controls: Top Selling Products
  const [prodSearch, setProdSearch] = useState("");
  const [prodSortField, setProdSortField] = useState<"sales" | "revenue" | "name">("sales");
  const [prodSortAsc, setProdSortAsc] = useState(false);
  const [prodPage, setProdPage] = useState(0);
  const [mobileProdCount, setMobileProdCount] = useState(5);

  // Tab 4 Controls: Top Sellers
  const [sellerSearch, setSellerSearch] = useState("");
  const [sellerSortField, setSellerSortField] = useState<"orders" | "revenue" | "rating">("revenue");
  const [sellerSortAsc, setSellerSortAsc] = useState(false);

  // Section 14: Notifications State
  const [notifications, setNotifications] = useState<any[]>([]);

  // Section 15: Coupon Creator Modal
  const [couponModalVisible, setCouponModalVisible] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState("");

  // Load Data from APIs (initial load, excludes revenue chart)
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        statsRes,
        ordersRes,
        sellerRes,
        productRes,
        custRes,
        custStatsRes,
        sellersListRes,
        topProductsRes,
        topSellersRes,
        alertsRes,
        activityRes,
        trafficRes,
        catalogQualityRes,
      ] = await Promise.allSettled([
        fetchDashboardStats(),
        fetchOrders({ page: 0, size: 20 }),
        fetchSellerAnalyticsSummary(),
        fetchProductStats(),
        fetchCustomers("", 0, 20),
        fetchCustomerStats(),
        fetchSellers({ page: 0, size: 20 }),
        fetchDashboardTopProducts(10),
        fetchDashboardTopSellers(10),
        fetchDashboardInventoryAlerts(10),
        fetchDashboardActivity(10),
        fetchDashboardTraffic(),
        fetchDashboardCatalogQuality(),
      ]);

      if (statsRes.status === "fulfilled") setStats(statsRes.value);
      if (ordersRes.status === "fulfilled") {
        const items = ordersRes.value.items || [];
        setOrders(items);
        setRecentOrders(
          items.slice(0, 10).map((o) => ({
            id: o.orderNumber || `ORD-${o.id}`,
            customer: o.shippingName || "Customer",
            amount: Number(o.totalAmount ?? 0),
            status: formatOrderStatus(o.orderStatus),
            payment: formatPaymentMethod(o.paymentMethod),
            date: formatDate(o.createdAt),
          }))
        );
      }
      if (sellerRes.status === "fulfilled") setSellerStats(sellerRes.value);
      if (productRes.status === "fulfilled") setProductStats(productRes.value);
      if (custRes.status === "fulfilled") setCustomers(custRes.value.items || []);
      if (custStatsRes.status === "fulfilled") setCustomerStats(custStatsRes.value);
      if (sellersListRes.status === "fulfilled") setSellers(sellersListRes.value.items || []);
      if (topProductsRes.status === "fulfilled") setTopProducts(topProductsRes.value || []);
      if (topSellersRes.status === "fulfilled") setTopSellers(topSellersRes.value || []);
      if (alertsRes.status === "fulfilled") setInventoryAlerts(alertsRes.value || []);
      if (activityRes.status === "fulfilled") setNotifications(activityRes.value || []);
      if (trafficRes.status === "fulfilled") setTraffic(trafficRes.value);
      if (catalogQualityRes.status === "fulfilled") setCatalogQuality(catalogQualityRes.value);
    } catch (err) {
      console.error("Dashboard enhancement fetch error:", err);
      setError(getApiErrorMessage(err, "Failed to load dashboard data."));
    } finally {
      setLoading(false);
    }
  }, []);

  // Separate chart data loader
  const loadChartData = useCallback(async (tf) => {
    setChartLoading(true);
    try {
      const res = await fetchDashboardRevenueChart(tf);
      setRevenueChart(res);
    } catch (e) {
      console.error("Revenue chart fetch error:", e);
    } finally {
      setChartLoading(false);
    }
  }, []);

  // Initial load of chart with default timeframe
  useEffect(() => {
    if (!authLoading && token) {
      loadChartData(revenueTimeframe);
    }
  }, [authLoading, token, loadChartData]);

  // Load chart whenever timeframe changes
  useEffect(() => {
    if (!authLoading && token) {
      loadChartData(revenueTimeframe);
    }
  }, [revenueTimeframe, authLoading, token, loadChartData]);

  // Run initial data load once on mount
  useEffect(() => {
    if (!authLoading && token) {
      loadData();
    }
  }, [authLoading, token, loadData]);

  // Format helper
  const rupee = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const count = (n: number) => n.toLocaleString("en-IN");

  // SECTION 1: Top Statistics KPI dataset with growth metrics
  const kpiStats = useMemo(() => {
    return {
      totalRevenue: { value: rupee(Number(stats?.totalRevenue ?? stats?.allTimeRevenue ?? 0)), growth: "—", trend: "flat", label: "Total Revenue", icon: "cash-outline", color: C.active, action: () => router.push("/orders" as any) },
      todayRevenue: { value: rupee(Number(stats?.todayRevenue ?? 0)), growth: "—", trend: "flat", label: "Today's Revenue", icon: "wallet-outline", color: C.primary, action: () => router.push("/orders" as any) },
      totalOrders: { value: count(Number(stats?.totalOrders ?? stats?.allTimeOrders ?? 0)), growth: "—", trend: "flat", label: "Total Orders", icon: "cart-outline", color: C.processing, action: () => router.push("/orders" as any) },
      pendingOrders: { value: count(Number(stats?.pendingOrders ?? 0)), growth: "—", trend: "flat", label: "Pending Orders", icon: "hourglass-outline", color: C.warning, action: () => router.push({ pathname: "/orders" as any, params: { status: "Pending" } }) },
      completedOrders: { value: count(Number(stats?.completedOrders ?? 0)), growth: "—", trend: "flat", label: "Completed Orders", icon: "checkmark-done-circle-outline", color: C.active, action: () => router.push({ pathname: "/orders" as any, params: { status: "Completed" } }) },
      cancelledOrders: { value: count(Number(stats?.cancelledOrders ?? 0)), growth: "—", trend: "flat", label: "Cancelled Orders", icon: "close-circle-outline", color: C.inactive, action: () => router.push({ pathname: "/orders" as any, params: { status: "Cancelled" } }) },
      totalCustomers: { value: count(Number(customerStats?.total ?? 0)), growth: "—", trend: "flat", label: "Total Customers", icon: "people-outline", color: "#0ea5e9", action: () => router.push("/customerManagement" as any) },
      totalSellers: { value: count(Number(sellerStats?.total ?? sellerStats?.registered ?? 0)), growth: "—", trend: "flat", label: "Total Sellers", icon: "storefront-outline", color: C.purple, action: () => router.push("/sellers" as any) },
      totalProducts: { value: count(Number(productStats?.total ?? 0)), growth: "—", trend: "flat", label: "Total Products", icon: "cube-outline", color: C.violet, action: () => router.push("/Products" as any) },
      outOfStock: { value: count(Number(productStats?.outOfStock ?? 0)), growth: "—", trend: "flat", label: "Out Of Stock", icon: "alert-circle-outline", color: C.inactive, action: () => router.push({ pathname: "/Products" as any, params: { tab: "Out of Stock" } }) },
      lowStock: { value: count(Number(productStats?.lowStock ?? 0)), growth: "—", trend: "flat", label: "Low Stock Products", icon: "warning-outline", color: C.warning, action: () => router.push({ pathname: "/Products" as any, params: { tab: "Low Stock" } }) },
      totalCategories: { value: count(Number(stats?.totalCategories ?? 0)), growth: "—", trend: "flat", label: "Total Categories", icon: "grid-outline", color: "#ec4899", action: () => router.push("/mainCategories" as any) }
    };
  }, [stats, customerStats, sellerStats, productStats]);

  // Unified Dashboard metrics data object
  const d = useMemo(() => {
    return {
      todayRevenue: Number(stats?.todayRevenue ?? 0),
      todayOrders: Number(stats?.todayOrders ?? 0),
      weekRevenue: Number(stats?.weekRevenue ?? 0),
      weekOrders: Number(stats?.weekOrders ?? 0),
      monthRevenue: Number(stats?.monthRevenue ?? 0),
      monthOrders: Number(stats?.monthOrders ?? 0),
      allTimeRevenue: Number(stats?.totalRevenue ?? stats?.allTimeRevenue ?? 0),
      allTimeOrders: Number(stats?.totalOrders ?? stats?.allTimeOrders ?? 0),
      pendingOrders: Number(stats?.pendingOrders ?? 0),
      processingCount: Number(stats?.processingCount ?? stats?.processingOrders ?? 0),
      returnedCount: Number(stats?.returnedCount ?? stats?.returnedOrders ?? 0),
      returnedBg: "#fef3c7",
      returned: "#d97706",
      productsCount: Number(productStats?.total ?? 0),
      outOfStock: Number(productStats?.outOfStock ?? 0),
      lowStock: Number(productStats?.lowStock ?? 0),
      categoriesCount: Number(stats?.totalCategories ?? 12),
    };
  }, [stats, productStats]);

  // SECTION 2: Chart Timeframe calculations
  const revenueChartData = useMemo(() => {
    const maxVal = Number(revenueChart?.maxVal ?? 1000);
    return {
      labels: revenueChart?.labels ?? [],
      revenue: (revenueChart?.revenue ?? []).map((v) => Number(v)),
      orders: (revenueChart?.orders ?? []).map((v) => Number(v)),
      yLabels: chartYLabels(maxVal),
      maxVal,
    };
  }, [revenueChart]);

  // SECTION 7: Top Selling Products dataset (from GET /api/admin/dashboard/top-products)
  const topProductsRaw = useMemo<TopProductRow[]>(() => {
    return topProducts.map((p) => ({
      id: String(p.id ?? p.productId ?? ""),
      name: String(p.name ?? "Product").trim() || "Product",
      sales: Number(p.sales ?? 0),
      revenue: Number(p.revenue ?? 0),
      stock: p.stock ?? "In Stock",
      stockCount: Number(p.stockCount ?? 0),
      imageUrl: resolveMediaUrl(p.image),
    }));
  }, [topProducts]);

  // Filtered & Sorted Top Products
  const filteredProducts = useMemo(() => {
    let result = topProductsRaw.filter(p => p.name.toLowerCase().includes(prodSearch.toLowerCase()));
    result.sort((a, b) => {
      const field = prodSortField;
      let valA = a[field];
      let valB = b[field];
      if (typeof valA === "string") {
        return prodSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return prodSortAsc ? valA - valB : valB - valA;
    });
    return result;
  }, [topProductsRaw, prodSearch, prodSortField, prodSortAsc]);

  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice(prodPage * 5, (prodPage + 1) * 5);
  }, [filteredProducts, prodPage]);

  // SECTION 8: Top Sellers Dataset
  const topSellersRaw = useMemo(() => {
    return topSellers.map((s) => ({
      id: s.id,
      name: s.name || "Seller",
      business: s.business || "—",
      orders: Number(s.orders ?? 0),
      revenue: Number(s.revenue ?? 0),
      rating: s.rating || "4.5",
      status: s.status || "Active",
    }));
  }, [topSellers]);

  const filteredSellers = useMemo(() => {
    let result = topSellersRaw.filter(s => s.name.toLowerCase().includes(sellerSearch.toLowerCase()));
    result.sort((a, b) => {
      const field = sellerSortField;
      let valA = a[field];
      let valB = b[field];
      if (field === "rating") {
        return sellerSortAsc ? parseFloat(valA) - parseFloat(valB) : parseFloat(valB) - parseFloat(valA);
      }
      return sellerSortAsc ? valA - valB : valB - valA;
    });
    return result.slice(0, 10);
  }, [topSellersRaw, sellerSearch, sellerSortField, sellerSortAsc]);

  const updateOrderStatus = (orderId: string, newStatus: string) => {
    setRecentOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  // SECTION 10: Recent 10 Customers
  const recentCustomersList = useMemo(() => {
    return customers.slice(0, 10).map((c) => ({
      id: c.id,
      name: c.name || "Customer",
      email: c.email || "—",
      date: formatDate(c.lastOrderAt || c.createdAt),
      status: "Active",
    }));
  }, [customers]);

  const inventoryAlertsView = useMemo(() => {
    return inventoryAlerts.map((item) => {
      const isOut = item.type === "Out Of Stock" || Number(item.qty) <= 0;
      return {
        ...item,
        badgeColor: isOut ? C.inactive : C.warning,
        bg: isOut ? C.inactiveBg : C.warningBg,
      };
    });
  }, [inventoryAlerts]);

  const restockProduct = (id: number) => {
    setInventoryAlerts((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, qty: Number(item.qty ?? 0) + 50, type: "Restock Scheduled", severity: "Low" }
          : item
      )
    );
  };

  // Coupon Creation trigger
  const handleCreateCoupon = () => {
    if (!couponCode || !couponDiscount) return;
    setCouponModalVisible(false);
    setNotifications(prev => [
      { id: Date.now(), type: "customer", message: `Coupon '${couponCode}' with ${couponDiscount}% discount created!`, read: false, time: "Just now" },
      ...prev
    ]);
    setCouponCode("");
    setCouponDiscount("");
  };

  // Pie chart calculation using segment rotation and hover details
  const PieChart = ({ values, colors, labels }: { values: number[]; colors: string[]; labels: string[] }) => {
    const total = values.reduce((a, b) => a + b, 0) || 1;
    const R = 45;
    const C_Circum = 2 * Math.PI * R;
    let accumulated = 0;

    const [hoveredSlice, setHoveredSlice] = useState<{
      index: number;
      label: string;
      count: number;
      color: string;
    } | null>(null);

    return (
      <Svg width={140} height={140} viewBox="0 0 100 100">
        {values.map((v, idx) => {
          const length = (v / total) * C_Circum;
          const startAngle = (accumulated / total) * 360;
          accumulated += v;
          const isHovered = hoveredSlice?.index === idx;
          return (
            <Circle
              key={idx}
              cx={50}
              cy={50}
              r={R}
              fill="none"
              stroke={colors[idx % colors.length]}
              strokeWidth={10}
              strokeDasharray={`${length} ${C_Circum}`}
              strokeDashoffset={0}
              transform={`rotate(${startAngle - 90} 50 50)`}
              onPress={() => {
                setHoveredSlice({
                  index: idx,
                  label: labels[idx] ?? "Slice",
                  count: v,
                  color: colors[idx % colors.length]
                });
              }}
              // @ts-ignore
              onMouseEnter={() => {
                setHoveredSlice({
                  index: idx,
                  label: labels[idx] ?? "Slice",
                  count: v,
                  color: colors[idx % colors.length]
                });
              }}
              // @ts-ignore
              onMouseLeave={() => {
                setHoveredSlice(null);
              }}
            />
          );
        })}
        {hoveredSlice && (
          <G>
            <Rect
              x={15}
              y={76}
              width={70}
              height={20}
              rx={4}
              ry={4}
              fill="#1E293B"
              stroke="#475569"
              strokeWidth={0.5}
              opacity={0.95}
            />
            <SvgText
              x={50}
              y={83}
              textAnchor="middle"
              fontSize={5}
              fontWeight="bold"
              fill="#FFF"
            >
              {hoveredSlice.label}: {hoveredSlice.count}
            </SvgText>
            <SvgText
              x={50}
              y={91}
              textAnchor="middle"
              fontSize={4.5}
              fill="#94A3B8"
            >
              ({Math.round((hoveredSlice.count / total) * 100)}%)
            </SvgText>
          </G>
        )}
      </Svg>
    );
  };

  // Donut chart calculation using segment rotation and hover details
  const DonutChart = ({ data, total, colors, labels }: { data: number[]; total: number; colors: string[]; labels: string[] }) => {
    const sum = total || data.reduce((a, b) => a + b, 0) || 1;
    const R = 40;
    const C_Circum = 2 * Math.PI * R;
    let accumulated = 0;

    const [hoveredSlice, setHoveredSlice] = useState<{
      index: number;
      label: string;
      count: number;
      color: string;
    } | null>(null);

    return (
      <Svg width={140} height={140} viewBox="0 0 100 100">
        {data.map((v, idx) => {
          const length = (v / sum) * C_Circum;
          const startAngle = (accumulated / sum) * 360;
          accumulated += v;
          return (
            <Circle
              key={idx}
              cx={50}
              cy={50}
              r={R}
              fill="none"
              stroke={colors[idx % colors.length]}
              strokeWidth={10}
              strokeDasharray={`${length} ${C_Circum}`}
              strokeDashoffset={0}
              transform={`rotate(${startAngle - 90} 50 50)`}
              onPress={() => {
                setHoveredSlice({
                  index: idx,
                  label: labels[idx] ?? "Slice",
                  count: v,
                  color: colors[idx % colors.length]
                });
              }}
              // @ts-ignore
              onMouseEnter={() => {
                setHoveredSlice({
                  index: idx,
                  label: labels[idx] ?? "Slice",
                  count: v,
                  color: colors[idx % colors.length]
                });
              }}
              // @ts-ignore
              onMouseLeave={() => {
                setHoveredSlice(null);
              }}
            />
          );
        })}
        <SvgText
          x={50}
          y={46}
          textAnchor="middle"
          fontSize={10}
          fontWeight="bold"
          fill={hoveredSlice ? hoveredSlice.color : C.text}
        >
          {hoveredSlice ? hoveredSlice.count : sum}
        </SvgText>
        <SvgText
          x={50}
          y={56}
          textAnchor="middle"
          fontSize={hoveredSlice ? 5 : 6}
          fontWeight="700"
          fill={hoveredSlice ? hoveredSlice.color : C.sub}
        >
          {hoveredSlice ? hoveredSlice.label : "Orders"}
        </SvgText>
      </Svg>
    );
  };

  if (authLoading) {
    return (
      <AdminLayout>
        <View style={[styles.screenWrapper, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={[styles.headerSubtext, { marginTop: 16 }]}>Loading authentication...</Text>
        </View>
      </AdminLayout>
    );
  }

  if (!token) {
    return (
      <AdminLayout>
        <View style={[styles.screenWrapper, { justifyContent: 'center', alignItems: 'center' }]}>
          <Ionicons name="lock-closed-outline" size={48} color={C.sub} />
          <Text style={[styles.headerTitle, { marginTop: 16 }]}>Authentication Required</Text>
          <Text style={styles.headerSubtext}>Please sign in to access the dashboard</Text>
        </View>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <View style={styles.screenWrapper}>
        {/* Desktop: absolute sticky header */}
        {isLargeScreen && (
          <View
            style={styles.headerContainer}
            onLayout={(e) => {
              const h = e.nativeEvent.layout.height;
              setHeaderHeight(h);
            }}
          >
            {/* HEADER ROW */}
            <View style={styles.headerCard}>
              <View>
                <Text style={styles.headerTitle}>Flint & Thread Dashboard</Text>
                {/* <Text style={styles.headerSubtext}>SaaS Enterprise Administrative Overview</Text> */}
              </View>
              <View style={styles.tabButtons}>
                {[
                  { key: "overview", label: "Overview", icon: "grid-outline", color: C.active, bg: C.activeBg },
                  { key: "sales", label: "Sales & Payments", icon: "bar-chart-outline", color: C.primary, bg: C.primaryLight },
                  { key: "inventory", label: "Catalog & Stock", icon: "cube-outline", color: C.violet, bg: C.violetBg },
                  { key: "users", label: "Users & Sellers", icon: "people-outline", color: C.purple, bg: C.purpleBg }
                ].map(tab => {
                  const isActive = activeTab === tab.key;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      onPress={() => handleTabPress(tab.key as any)}
                      style={[
                        styles.tabButton,
                        isActive && { backgroundColor: tab.bg }
                      ]}
                    >
                      <Ionicons name={tab.icon as any} size={14} color={tab.color} />
                      <Text
                        style={[
                          styles.tabButtonText,
                          isActive && { color: tab.color, fontWeight: "700" }
                        ]}
                      >
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        <ScrollView
          ref={scrollViewRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {/* Mobile: header scrolls with content (no absolute positioning) */}
          {!isLargeScreen && (
            <View style={{ paddingHorizontal: 4, paddingTop: 12, paddingBottom: 12 }}>
              <View style={styles.headerCard}>
                <View>
                  <Text style={styles.headerTitle}>Flint & Thread Dashboard</Text>
                  {/* <Text style={styles.headerSubtext}>SaaS Enterprise Administrative Overview</Text> */}
                </View>
                <View style={styles.tabButtonsMobileGrid}>
                  {[
                    { key: "overview", label: "Overview", icon: "th-large", color: C.active, bg: C.activeBg },
                    { key: "sales", label: "Sales & Payments", icon: "bar-chart", color: C.primary, bg: C.primaryLight },
                    { key: "inventory", label: "Catalog & Stock", icon: "cubes", color: C.violet, bg: C.violetBg },
                    { key: "users", label: "Users & Sellers", icon: "users", color: C.purple, bg: C.purpleBg }
                  ].map(tab => {
                    const isActive = activeTab === tab.key;
                    return (
                      <TouchableOpacity
                        key={tab.key}
                        onPress={() => handleTabPress(tab.key as any)}
                        style={[
                          styles.tabButtonMobileGridItem,
                          isActive && { backgroundColor: tab.bg }
                        ]}
                      >
                        <FontAwesome name={tab.icon as any} size={14} color={tab.color} />
                        <Text
                          style={[
                            styles.tabButtonText,
                            isActive && { color: tab.color, fontWeight: "700" }
                          ]}
                          numberOfLines={1}
                        >
                          {tab.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          )}
          {/* Desktop: spacer to push content below the fixed header */}
          {isLargeScreen && <View style={{ height: headerHeight + 10 }} />}
          <View style={styles.container}>

            {/* SECTION 1: OVERVIEW */}
            <View
              key={`overview-${loading}`}
              onLayout={(e) => {
                const y = e.nativeEvent.layout.y;
                setSectionOffsets(prev => ({ ...prev, overview: y }));
              }}
              style={styles.tabSection}
            >


              {/* SECTION 1: 12 TOP STATISTICS CARDS */}
              <View style={[styles.statsCardGrid, isMobile && { gap: 10 }]}>
                {Object.keys(kpiStats).map((key) => {
                  const card = kpiStats[key as keyof typeof kpiStats];
                  const hasKpiError = kpiErrors[key];
                  const hasKpiLoading = kpiLoading[key];

                  return (
                    <Pressable
                      key={key}
                      onPress={card.action}
                      style={({ hovered }) => [
                        styles.kpiCard,
                        screenW < 480
                          ? { minWidth: "100%", flex: 0, width: "100%" }
                          : (isMobile ? { minWidth: "47%", flex: 0, width: "47%" } : null),
                        {
                          borderLeftWidth: 4,
                          borderLeftColor: card.color,
                        },
                        Platform.OS === "web" && {
                          transform: hovered ? [{ translateY: -4 }] : [{ translateY: 0 }],
                          shadowOpacity: hovered ? 0.05 : 0.01,
                          shadowRadius: hovered ? 12 : 6,
                          borderColor: hovered ? card.color + "40" : C.border,
                          // @ts-ignore – web hover animation
                          transitionProperty: "all",
                          transitionDuration: "0.2s",
                        }
                      ]}
                    >
                      {hasKpiLoading ? (
                        <View style={styles.kpiInnerContent}>
                          <ActivityIndicator size="small" color={C.primary} />
                          <Text style={styles.kpiLoadingText}>Syncing card...</Text>
                        </View>
                      ) : hasKpiError ? (
                        <View style={styles.kpiInnerContent}>
                          <Ionicons name="alert-circle-outline" size={20} color={C.inactive} />
                          <Text style={styles.kpiErrorText}>Failed loading stats</Text>
                          <TouchableOpacity onPress={() => setKpiErrors(prev => ({ ...prev, [key]: false }))}>
                            <Text style={styles.kpiRetryText}>Retry</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <>
                          <View style={styles.kpiCardInner}>
                            {isMobile ? (
                              <>
                                {/* Mobile: icon on top, then label below */}
                                <View style={[styles.kpiIconCircle, { backgroundColor: card.color + "15", marginBottom: 6 }]}>
                                  <Ionicons name={card.icon} size={18} color={card.color} />
                                </View>
                                <Text style={styles.kpiCardLabel}>{card.label}</Text>
                              </>
                            ) : (
                              <View style={styles.kpiCardHeader}>
                                <Text style={styles.kpiCardLabel}>{card.label}</Text>
                                <TouchableOpacity
                                  onPress={() => {
                                    // Simulate loading then error
                                    setKpiLoading(prev => ({ ...prev, [key]: true }));
                                    setTimeout(() => {
                                      setKpiLoading(prev => ({ ...prev, [key]: false }));
                                      setKpiErrors(prev => ({ ...prev, [key]: true }));
                                    }, 1000);
                                  }}
                                  style={styles.kpiTrigger}
                                >
                                  <View style={[styles.kpiIconCircle, { backgroundColor: card.color + "15" }]}>
                                    <Ionicons name={card.icon} size={16} color={card.color} />
                                  </View>
                                </TouchableOpacity>
                              </View>
                            )}
                            <Text style={styles.kpiCardValue}>{card.value}</Text>
                            <View style={styles.kpiFooter}>
                              <View style={[
                                styles.trendPill,
                                {
                                  backgroundColor: card.trend === "up" ? C.activeBg : card.trend === "down" ? C.inactiveBg : C.greyBg,
                                }
                              ]}>
                                <Text style={[
                                  styles.trendPillText,
                                  {
                                    color: card.trend === "up" ? C.active : card.trend === "down" ? C.inactive : C.sub,
                                  }
                                ]}>
                                  {card.trend === "up" ? "▲ " : card.trend === "down" ? "▼ " : "● "}
                                  {card.growth === "—" ? "Stable" : card.growth}
                                </Text>
                              </View>
                              <Text style={styles.kpiFooterSub}>vs last month</Text>
                            </View>
                          </View>
                        </>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* QUICK ACTIONS & NOTIFICATIONS PANEL */}
              <View style={styles.rowLayout}>

                {/* SECTION 15: QUICK ACTIONS */}
                <View style={[styles.cardCol, { flex: 1.2 }]}>
                  <Text style={styles.cardColTitle}><FontAwesome name="bolt" size={16} color="#eab308" /> Quick Actions Menu</Text>
                  <View style={styles.quickActionsGrid}>
                    {[
                      { label: "Add Product", icon: "cube-outline", color: C.violet, action: () => router.push("/productApproval" as any) },
                      { label: "Add Category", icon: "grid-outline", color: C.primary, action: () => router.push("/categoryRequests" as any) },
                      { label: "Sellers", icon: "storefront-outline", color: C.active, action: () => router.push("/sellers" as any) },
                      { label: "Customers", icon: "people-outline", color: C.processing, action: () => router.push("/customerManagement" as any) },
                      { label: "Orders", icon: "receipt-outline", color: C.purple, action: () => router.push("/orders" as any) },
                      { label: "Processing", icon: "sync-outline", color: C.processing, action: () => router.push({ pathname: "/orders" as any, params: { status: "Processing" } }) },
                      { label: "Cancelled", icon: "close-circle-outline", color: C.inactive, action: () => router.push({ pathname: "/orders" as any, params: { status: "Cancelled" } }) },
                      { label: "Returned", icon: "swap-horizontal-outline", color: C.primary, action: () => router.push({ pathname: "/orders" as any, params: { status: "Returned" } }) },
                      { label: "Replacement", icon: "repeat-outline", color: C.warning, action: () => router.push({ pathname: "/orders" as any, params: { status: "Replacement" } }) }
                    ].map((act, idx) => (
                      <Pressable
                        key={idx}
                        onPress={act.action}
                        style={({ hovered }) => [
                          styles.quickActionItem,
                          Platform.OS === "web" && {
                            transform: hovered ? [{ translateY: -3 }] : [{ translateY: 0 }],
                            shadowOpacity: hovered ? 0.05 : 0.01,
                            shadowRadius: hovered ? 8 : 4,
                            borderColor: hovered ? (isDark ? "#3A3F55" : "#CBD5E1") : C.border,
                            // @ts-ignore – web hover animation
                            transitionProperty: "all",
                            transitionDuration: "0.2s",
                          }
                        ]}
                      >
                        <View style={[styles.quickActionIconCircle, { backgroundColor: act.color + "12" }]}>
                          <Ionicons name={act.icon as any} size={18} color={act.color} />
                        </View>
                        <Text style={styles.quickActionTextLabel}>{act.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* SECTION 14: LIVE NOTIFICATIONS PANEL */}
                <View style={[styles.cardCol, { flex: 1.5 }]}>
                  <View style={styles.cardTitleBar}>
                    <Text style={styles.cardColTitle}><FontAwesome name="bell" size={16} color={C.primary} /> Activity Notifications</Text>
                    {notifications.filter(n => !n.read).length > 0 && (
                      <View style={styles.notifBadgeCircle}>
                        <Text style={styles.notifBadgeCircleText}>
                          {notifications.filter(n => !n.read).length}
                        </Text>
                      </View>
                    )}
                  </View>
                  <ScrollView style={styles.notifScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                    {notifications.map(n => (
                      <View key={n.id} style={[styles.notifItemRow, n.read && styles.notifItemRead]}>
                        <View style={styles.notifIconWrap}>
                          <Ionicons
                            name={
                              n.type === "order" ? "cart" :
                                n.type === "seller" ? "storefront" :
                                  n.type === "stock" ? "alert-circle" :
                                    n.type === "payment" ? "card" : "people"
                            }
                            size={16}
                            color={n.read ? C.sub : C.primary}
                          />
                        </View>
                        <View style={styles.notifTextWrap}>
                          <Text style={[styles.notifMsg, n.read && styles.notifMsgRead]} numberOfLines={2}>
                            {n.message}
                          </Text>
                          <Text style={styles.notifTime}>{n.time}</Text>
                        </View>
                        <View style={styles.notifActionButtons}>
                          {!n.read && (
                            <TouchableOpacity
                              onPress={() => setNotifications(prev => prev.map(not => not.id === n.id ? { ...not, read: true } : not))}
                              style={styles.notifActionBtn}
                            >
                              <Text style={styles.notifActionBtnText}>Read</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            onPress={() => setNotifications(prev => prev.filter(not => not.id !== n.id))}
                            style={[styles.notifActionBtn, { borderColor: C.inactive }]}
                          >
                            <Text style={[styles.notifActionBtnText, { color: C.inactive }]}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {/* LIVE ACTIVITY, PERFORMANCE SUMMARY, & COUPONS */}
              <View style={styles.rowLayout}>

                {/* SECTION 13: Live Website Activity */}
                <View style={[styles.cardCol, { flex: 1 }]}>
                  <Text style={styles.cardColTitle}><FontAwesome name="line-chart" size={16} color={C.active} /> Live Website Traffic</Text>
                  <View style={styles.liveActivityList}>
                    {[
                      { label: "Currently Online", val: traffic?.currentlyOnline ? count(Number(traffic.currentlyOnline)) : "—", isOnline: true },
                      { label: "Visitors Today", val: traffic?.visitorsToday ? count(Number(traffic.visitorsToday)) : "—", isOnline: false },
                      { label: "Visitors This Week", val: traffic?.visitorsWeek ? count(Number(traffic.visitorsWeek)) : "—", isOnline: false },
                      { label: "Visitors This Month", val: traffic?.visitorsMonth ? count(Number(traffic.visitorsMonth)) : "—", isOnline: false }
                    ].map((item, idx) => (
                      <View key={idx} style={styles.liveActivityRow}>
                        <View style={styles.liveActivityLeft}>
                          {item.isOnline && <View style={styles.greenPulseDot} />}
                          <Text style={styles.liveActivityLabel}>{item.label}</Text>
                        </View>
                        <Text style={styles.liveActivityValue}>{item.val}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* SECTION 18: Performance Summary */}
                <View style={[styles.cardCol, { flex: 1.5 }]}>
                  <Text style={styles.cardColTitle}><FontAwesome name="bar-chart" size={16} color={C.violet} /> Store Performance Summary</Text>
                  <View style={styles.perfTable}>
                    <View style={[styles.tableHdrRow, { backgroundColor: C.greyBg }]}>
                      <Text style={[styles.tableHdrCell, { flex: 1.5 }]}>Timeframe</Text>
                      <Text style={[styles.tableHdrCell, { flex: 2, textAlign: "right" }]}>Sales (Revenue)</Text>
                      <Text style={[styles.tableHdrCell, { flex: 1.5, textAlign: "right" }]}>Total Orders</Text>
                    </View>
                    {[
                      { label: "Today", sales: rupee(d.todayRevenue), ords: d.todayOrders },
                      { label: "This Week", sales: rupee(d.weekRevenue), ords: d.weekOrders },
                      { label: "This Month", sales: rupee(d.monthRevenue), ords: d.monthOrders },
                      { label: "This Year (2026)", sales: rupee(d.allTimeRevenue), ords: d.allTimeOrders }
                    ].map((row, idx) => (
                      <View key={idx} style={styles.tableRowData}>
                        <Text style={[styles.tableCellText, { flex: 1.5, fontWeight: "600" }]}>{row.label}</Text>
                        <Text style={[styles.tableCellText, { flex: 2, textAlign: "right", color: C.active, fontWeight: "600" }]}>{row.sales}</Text>
                        <Text style={[styles.tableCellText, { flex: 1.5, textAlign: "right", fontWeight: "600" }]}>{row.ords} orders</Text>
                      </View>
                    ))}
                  </View>
                </View>


              </View>
            </View>

            {/* SECTION 2: SALES & PAYMENTS */}
            <View
              key={`sales-${loading}`}
              onLayout={(e) => {
                const y = e.nativeEvent.layout.y;
                setSectionOffsets(prev => ({ ...prev, sales: y }));
              }}
              style={[styles.tabSection, styles.sectionSpacing, { zIndex: datePickerVisible ? 500 : 1 }]}
            >
              {/* --- SALES & PAYMENTS SECTION --- */}
              <View style={[styles.sectionHeaderCard, { borderColor: C.primary }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="bar-chart-outline" size={18} color={C.primary} />
                  <Text style={styles.sectionHeaderTitle}>Sales & Payments Analytics</Text>
                </View>
              </View>
              <View style={[styles.tabSection, { zIndex: datePickerVisible ? 501 : 1 }]}>

                {/* SECTION 2: REVENUE ANALYTICS */}
                <View style={[styles.cardCol, { zIndex: datePickerVisible ? 502 : 1 }]}>
                  <View style={[styles.revenueHeaderRow, { zIndex: datePickerVisible ? 503 : 1 }]}>
                    <View>
                      <Text style={styles.cardColTitle}>Revenue & Orders Trend Analysis</Text>
                      <Text style={styles.revenueSub}>Date range: {startDate} to {endDate}</Text>
                    </View>

                    <View style={styles.revenueHeaderActions}>
                      {/* Date Filters Inputs */}
                      <View style={[styles.dateFilterContainer, { zIndex: 100 }]}>
                        <View style={{ position: "relative", zIndex: datePickerVisible && datePickerTarget === "start" ? 101 : 1 }}>
                          <TouchableOpacity
                            ref={startButtonRef}
                            onPress={() => openDatePicker("start")}
                            style={styles.dateInputClickable}
                          >
                            <Ionicons name="calendar-outline" size={12} color={C.sub} />
                            <Text style={styles.dateInputClickableText}>{startDate}</Text>
                          </TouchableOpacity>
                          {datePickerVisible && datePickerTarget === "start" && (
                            <View ref={datePickerRef} style={[styles.calCardDropdown, { left: 0 }]}>
                              {renderPickerHeader()}
                              {renderCalendarContent()}
                            </View>
                          )}
                        </View>
                        <Text style={styles.dateDivider}>to</Text>
                        <View style={{ position: "relative", zIndex: datePickerVisible && datePickerTarget === "end" ? 101 : 1 }}>
                          <TouchableOpacity
                            ref={endButtonRef}
                            onPress={() => openDatePicker("end")}
                            style={styles.dateInputClickable}
                          >
                            <Ionicons name="calendar-outline" size={12} color={C.sub} />
                            <Text style={styles.dateInputClickableText}>{endDate}</Text>
                          </TouchableOpacity>
                          {datePickerVisible && datePickerTarget === "end" && (
                            <View ref={datePickerRef} style={[styles.calCardDropdown, { right: 0 }]}>
                              {renderPickerHeader()}
                              {renderCalendarContent()}
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Timeframe selector */}
                      <View style={styles.tabToggles}>
                        {(["daily", "weekly", "monthly", "yearly"] as const).map(mode => (
                          <TouchableOpacity
                            key={mode}
                            onPress={() => setRevenueTimeframe(mode)}
                            style={[styles.tabToggleBtn, revenueTimeframe === mode && styles.tabToggleBtnActive]}
                          >
                            <Text style={[styles.tabToggleText, revenueTimeframe === mode && styles.tabToggleTextActive]}>
                              {mode.charAt(0).toUpperCase() + mode.slice(1)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>

                  {/* Legends Selector */}
                  <View style={styles.legendsRowWrap}>
                    <TouchableOpacity
                      onPress={() => setActiveRevenueLegends(p => ({ ...p, revenue: !p.revenue }))}
                      style={[styles.legendSelectorBtn, !activeRevenueLegends.revenue && styles.legendSelectorDisabled]}
                    >
                      <View style={[styles.legendMarkerDot, { backgroundColor: C.primary }]} />
                      <Text style={styles.legendSelectorLabel}>Revenue (₹)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setActiveRevenueLegends(p => ({ ...p, orders: !p.orders }))}
                      style={[styles.legendSelectorBtn, !activeRevenueLegends.orders && styles.legendSelectorDisabled]}
                    >
                      <View style={[styles.legendMarkerDot, { backgroundColor: C.processing }]} />
                      <Text style={styles.legendSelectorLabel}>Orders Count</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Responsive SVG Chart */}
                  <View
                    style={styles.chartContainer}
                    onLayout={(e) => {
                      const w = e.nativeEvent.layout.width;
                      if (w > 0) {
                        setChartWidth(w);
                      }
                    }}
                  >
                    <Svg viewBox={`0 0 ${chartWidth} 200`} width="100%" height={200}>
                      <Defs>
                        <SvgGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0%" stopColor={C.primary} stopOpacity="0.3" />
                          <Stop offset="100%" stopColor={C.primary} stopOpacity="0.0" />
                        </SvgGradient>
                        <SvgGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0%" stopColor={C.processing} stopOpacity="0.3" />
                          <Stop offset="100%" stopColor={C.processing} stopOpacity="0.0" />
                        </SvgGradient>
                      </Defs>

                      {/* Y Grid Lines */}
                      {revenueChartData.yLabels.map((lbl, idx) => {
                        const y = 20 + idx * 26;
                        return (
                          <G key={idx}>
                            <Line x1={55} y1={y} x2={chartWidth - 20} y2={y} stroke="#E2E8F0" strokeWidth={0.8} strokeDasharray="3 3" />
                            <SvgText x={45} y={y + 3} textAnchor="end" fontSize={9} fill={C.sub}>
                              {lbl}
                            </SvgText>
                          </G>
                        );
                      })}

                      {/* Paths rendering */}
                      {(() => {
                        const stepX = (chartWidth - 85) / (revenueChartData.labels.length - 1 || 1);

                        // Revenue Points
                        const revPoints = revenueChartData.revenue.map((v, i) => ({
                          x: 55 + i * stepX,
                          y: 150 - (v / revenueChartData.maxVal) * 120
                        }));

                        // Orders Points (Scaled to fit)
                        const ordPoints = revenueChartData.orders.map((v, i) => ({
                          x: 55 + i * stepX,
                          y: 150 - (v / (revenueTimeframe === "daily" ? 12 : 60)) * 120
                        }));

                        // Safe guard: return empty graphics if data has not loaded or is empty
                        if (revPoints.length === 0 || ordPoints.length === 0) {
                          return null;
                        }

                        const dRevLine = revPoints.map((p, idx) => `${idx === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
                        const dRevArea = `${dRevLine} L${revPoints[revPoints.length - 1].x},150 L55,150 Z`;

                        const dOrdLine = ordPoints.map((p, idx) => `${idx === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
                        const dOrdArea = `${dOrdLine} L${ordPoints[ordPoints.length - 1].x},150 L55,150 Z`;

                        return (
                          <G>
                            {/* Revenue Graph */}
                            {activeRevenueLegends.revenue && (
                              <G>
                                <Path d={dRevArea} fill="url(#revGrad)" />
                                <Path d={dRevLine} fill="none" stroke={C.primary} strokeWidth={2.5} />
                                {revPoints.map((p, i) => (
                                  <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill={C.primary} stroke="#FFF" strokeWidth={1} />
                                ))}
                              </G>
                            )}

                            {/* Orders Graph */}
                            {activeRevenueLegends.orders && (
                              <G>
                                <Path d={dOrdArea} fill="url(#ordGrad)" />
                                <Path d={dOrdLine} fill="none" stroke={C.processing} strokeWidth={2} strokeDasharray="3 3" />
                                {ordPoints.map((p, i) => (
                                  <Circle key={i} cx={p.x} cy={p.y} r={3} fill={C.processing} stroke="#FFF" strokeWidth={1} />
                                ))}
                              </G>
                            )}

                            {/* Hover Guide & Active Highlight circle */}
                            {hoveredPoint && (
                              <G>
                                <Line
                                  x1={hoveredPoint.x}
                                  y1={20}
                                  x2={hoveredPoint.x}
                                  y2={150}
                                  stroke="#CBD5E1"
                                  strokeWidth={1}
                                  strokeDasharray="3 3"
                                />
                                {activeRevenueLegends.revenue && (
                                  <Circle
                                    cx={hoveredPoint.x}
                                    cy={hoveredPoint.revenueY}
                                    r={6}
                                    fill={C.primary}
                                    stroke="#FFF"
                                    strokeWidth={1.5}
                                  />
                                )}
                                {activeRevenueLegends.orders && (
                                  <Circle
                                    cx={hoveredPoint.x}
                                    cy={hoveredPoint.ordersY}
                                    r={5.5}
                                    fill={C.processing}
                                    stroke="#FFF"
                                    strokeWidth={1.5}
                                  />
                                )}
                              </G>
                            )}

                            {/* Transparent overlay bars for hover / touch response */}
                            {revPoints.map((p, i) => {
                              const hitSlopW = Math.max(stepX, 22);
                              return (
                                <Rect
                                  key={`rect-${i}`}
                                  x={p.x - hitSlopW / 2}
                                  y={15}
                                  width={hitSlopW}
                                  height={140}
                                  fill="transparent"
                                  onPress={() => {
                                    setHoveredPoint({
                                      index: i,
                                      x: p.x,
                                      revenueY: p.y,
                                      ordersY: ordPoints[i].y,
                                      revenue: revenueChartData.revenue[i],
                                      orders: revenueChartData.orders[i],
                                      label: revenueChartData.labels[i]
                                    });
                                  }}
                                  // @ts-ignore – web hover events
                                  onMouseEnter={() => {
                                    setHoveredPoint({
                                      index: i,
                                      x: p.x,
                                      revenueY: p.y,
                                      ordersY: ordPoints[i].y,
                                      revenue: revenueChartData.revenue[i],
                                      orders: revenueChartData.orders[i],
                                      label: revenueChartData.labels[i]
                                    });
                                  }}
                                  // @ts-ignore – web hover events
                                  onMouseLeave={() => {
                                    setHoveredPoint(null);
                                  }}
                                />
                              );
                            })}

                            {/* Tooltip Box rendering */}
                            {hoveredPoint && (() => {
                              const tooltipWidth = 145;
                              const tooltipHeight = 56;
                              // Clamp tooltip X inside chart boundary
                              let tooltipX = hoveredPoint.x - tooltipWidth / 2;
                              if (tooltipX < 55) tooltipX = 55;
                              if (tooltipX + tooltipWidth > chartWidth - 20) {
                                tooltipX = chartWidth - 20 - tooltipWidth;
                              }
                              // Calculate tooltip Y above elements
                              let tooltipY = Math.min(hoveredPoint.revenueY, hoveredPoint.ordersY) - 68;
                              if (tooltipY < 10) {
                                // Too high, flip below points
                                tooltipY = Math.max(hoveredPoint.revenueY, hoveredPoint.ordersY) + 15;
                              }

                              return (
                                <G>
                                  <Rect
                                    x={tooltipX}
                                    y={tooltipY}
                                    width={tooltipWidth}
                                    height={tooltipHeight}
                                    rx={8}
                                    ry={8}
                                    fill="#1E293B" // Slate 800
                                    stroke="#475569" // Slate 600
                                    strokeWidth={1}
                                    opacity={0.96}
                                  />
                                  <SvgText
                                    x={tooltipX + 10}
                                    y={tooltipY + 16}
                                    fontSize={10}
                                    fontWeight="bold"
                                    fill="#FFF"
                                  >
                                    {hoveredPoint.label}
                                  </SvgText>
                                  {activeRevenueLegends.revenue && (
                                    <SvgText
                                      x={tooltipX + 10}
                                      y={tooltipY + 31}
                                      fontSize={9.5}
                                      fill="#94A3B8"
                                    >
                                      Revenue: <TSpan fill="#60A5FA" fontWeight="bold">₹{hoveredPoint.revenue.toLocaleString("en-IN")}</TSpan>
                                    </SvgText>
                                  )}
                                  {activeRevenueLegends.orders && (
                                    <SvgText
                                      x={tooltipX + 10}
                                      y={tooltipY + (activeRevenueLegends.revenue ? 46 : 31)}
                                      fontSize={9.5}
                                      fill="#94A3B8"
                                    >
                                      Orders: <TSpan fill="#34D399" fontWeight="bold">{hoveredPoint.orders.toLocaleString("en-IN")}</TSpan>
                                    </SvgText>
                                  )}
                                </G>
                              );
                            })()}
                          </G>
                        );
                      })()}

                      {/* X Axis Labels */}
                      {revenueChartData.labels.map((lbl, idx) => {
                        const stepX = (chartWidth - 85) / (revenueChartData.labels.length - 1 || 1);
                        const x = 55 + idx * stepX;
                        return (
                          <SvgText key={idx} x={x} y={168} textAnchor="middle" fontSize={8} fill={C.sub}>
                            {lbl}
                          </SvgText>
                        );
                      })}
                    </Svg>
                  </View>
                </View>

                {/* ORDERS OVERVIEW & REFUNDS */}
                <View style={styles.rowLayout}>

                  {/* SECTION 3: Orders Overview & charts */}
                  <View style={[styles.cardCol, { flex: 1.5 }]}>
                    <Text style={styles.cardColTitle}><FontAwesome name="archive" size={16} color={C.active} /> Orders Distribution & Statuses</Text>

                    {/* Status checklist grid */}
                    <View style={styles.ordersChecklistGrid}>
                      {[
                        { label: "Pending", count: d.pendingOrders, bg: C.warningBg, border: C.warning },
                        { label: "Processing", count: d.processingCount, bg: C.processingBg, border: C.processing },
                        { label: "Shipped", count: 2, bg: C.violetBg, border: C.violet },
                        { label: "Delivered", count: 18, bg: C.activeBg, border: C.active },
                        { label: "Cancelled", count: 35, bg: C.inactiveBg, border: C.inactive },
                        { label: "Returned", count: d.returnedCount, bg: C.returnedBg, border: C.returned }
                      ].map((item, idx) => (
                        <View key={idx} style={[styles.orderCheckCard, { borderColor: item.border, backgroundColor: item.bg }]}>
                          <Text style={styles.orderCheckLabel}>{item.label}</Text>
                          <Text style={[styles.orderCheckCount, { color: item.border }]}>{item.count} orders</Text>
                        </View>
                      ))}
                    </View>

                    {/* Donut and Bar SVG Charts side by side */}
                    <View style={styles.doubleChartWrap}>
                      <View style={styles.doubleChartBox}>
                        <DonutChart
                          data={[35, 18, 3, 2, 1]}
                          labels={["Cancelled", "Delivered", "Processing", "Shipped", "Pending"]}
                          colors={[C.inactive, C.active, C.primary, C.purple, C.processing]}
                          total={59}
                        />
                        <Text style={styles.chartSubtitleLabel}>Order Ratios</Text>
                      </View>
                      <View style={styles.doubleChartBox}>
                        {/* Responsive Vertical Bar Chart */}
                        <Svg width={140} height={110} viewBox="0 0 100 80">
                          {(() => {
                            const barLabels = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                            const barValues = [15, 30, 45, 60, 50, 75];
                            return (
                              <G>
                                {barValues.map((val, idx) => {
                                  const barH = (val / 80) * 60;
                                  const isHovered = hoveredBar?.index === idx;
                                  const barW = isHovered ? 10 : 8;
                                  const barX = 10 + idx * 14 - (isHovered ? 1 : 0);
                                  const barY = 70 - barH;
                                  return (
                                    <Rect
                                      key={idx}
                                      x={barX}
                                      y={barY}
                                      width={barW}
                                      height={barH}
                                      fill={isHovered ? C.active : (idx % 2 === 0 ? C.primary : C.processing)}
                                      rx={2}
                                      onPress={() => {
                                        setHoveredBar({
                                          index: idx,
                                          value: val,
                                          x: barX + barW / 2,
                                          y: barY,
                                          label: barLabels[idx]
                                        });
                                      }}
                                      // @ts-ignore
                                      onMouseEnter={() => {
                                        setHoveredBar({
                                          index: idx,
                                          value: val,
                                          x: barX + barW / 2,
                                          y: barY,
                                          label: barLabels[idx]
                                        });
                                      }}
                                      // @ts-ignore
                                      onMouseLeave={() => {
                                        setHoveredBar(null);
                                      }}
                                    />
                                  );
                                })}
                                {hoveredBar && (
                                  <G>
                                    <Rect
                                      x={Math.min(Math.max(2, hoveredBar.x - 24), 50)}
                                      y={hoveredBar.y - 20}
                                      width={48}
                                      height={14}
                                      rx={3}
                                      ry={3}
                                      fill="#1E293B"
                                      stroke="#475569"
                                      strokeWidth={0.5}
                                      opacity={0.95}
                                    />
                                    <SvgText
                                      x={Math.min(Math.max(2, hoveredBar.x - 24), 50) + 24}
                                      y={hoveredBar.y - 11}
                                      textAnchor="middle"
                                      fontSize={5.5}
                                      fontWeight="bold"
                                      fill="#FFF"
                                    >
                                      {hoveredBar.label}: {hoveredBar.value}
                                    </SvgText>
                                  </G>
                                )}
                              </G>
                            );
                          })()}
                        </Svg>
                        <Text style={styles.chartSubtitleLabel}>Orders Volume</Text>
                      </View>
                    </View>
                  </View>

                  {/* SECTION 12: PAYMENT OVERVIEW */}
                  <View style={[styles.cardCol, { flex: 1.2 }]}>
                    <Text style={styles.cardColTitle}><FontAwesome name="credit-card" size={16} color={C.primary} /> Payments & Channels</Text>

                    {/* Payment stats checklist */}
                    <View style={styles.paymentOverviewList}>
                      {[
                        { label: "COD Orders", val: "18 orders", sum: rupee(3204) },
                        { label: "Online Payments", val: "39 payments", sum: rupee(13492) },
                        { label: "Pending Payments", val: "0 pending", sum: rupee(0) },
                        { label: "Refunded Payments", val: "5 refunds", sum: rupee(1490) },
                        { label: "Total Collections", val: "All receipts", sum: rupee(d.allTimeRevenue) }
                      ].map((item, idx) => (
                        <View key={idx} style={styles.paymentMetricRow}>
                          <View>
                            <Text style={styles.paymentMetricLabel}>{item.label}</Text>
                            <Text style={styles.paymentMetricSub}>{item.val}</Text>
                          </View>
                          <Text style={styles.paymentMetricVal}>{item.sum}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Payment Chart */}
                    <View style={styles.pieContainer}>
                      <PieChart
                        values={[39, 18]}
                        labels={["Online", "COD"]}
                        colors={[C.active, C.primary]}
                      />
                      <View style={styles.pieLegends}>
                        <View style={styles.legendRow}>
                          <View style={[styles.legendDot, { backgroundColor: C.active }]} />
                          <Text style={styles.legendText}>Online (68%)</Text>
                        </View>
                        <View style={styles.legendRow}>
                          <View style={[styles.legendDot, { backgroundColor: C.primary }]} />
                          <Text style={styles.legendText}>COD (32%)</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* SECTION 17: Refund & Returns cards */}
                  <View style={[styles.cardCol, { flex: 1 }]}>
                    <Text style={styles.cardColTitle}><FontAwesome name="refresh" size={16} color={C.warning} /> Refunds & Returns Logs</Text>
                    <View style={styles.liveActivityList}>
                      {[
                        { label: "Pending Refunds", val: "3 request", color: C.warning },
                        { label: "Approved Refunds", val: "22 refunds", color: C.active },
                        { label: "Rejected Refunds", val: "2 cases", color: C.inactive },
                        { label: "Returned Order Rate", val: "5.4% rate", color: C.primary }
                      ].map((item, idx) => (
                        <View key={idx} style={styles.liveActivityRow}>
                          <Text style={styles.liveActivityLabel}>{item.label}</Text>
                          <Text style={[styles.liveActivityValue, { color: item.color }]}>{item.val}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={styles.refundGraphicWrapper}>
                      <Ionicons name="swap-horizontal-outline" size={28} color={C.primary} />
                      <Text style={styles.refundGraphicText}>Automated Return Tracking Active</Text>
                    </View>
                  </View>

                </View>
              </View>
            </View>

            {/* SECTION 3: CATALOG & STOCK */}
            <View
              key={`inventory-${loading}`}
              onLayout={(e) => {
                const y = e.nativeEvent.layout.y;
                setSectionOffsets(prev => ({ ...prev, inventory: y }));
              }}
              style={[styles.tabSection, styles.sectionSpacing]}
            >
              {/* --- CATALOG & STOCK SECTION --- */}
              <View
                style={[styles.sectionHeaderCard, { borderColor: C.violet }]}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="cube-outline" size={18} color={C.violet} />
                  <Text style={styles.sectionHeaderTitle}>Catalog & Stock Control</Text>
                </View>
              </View>
              <View style={styles.tabSection}>

                {/* SECTION 6: PRODUCT OVERVIEW & INVENTORY ALERTS */}
                <View style={styles.rowLayout}>

                  {/* SECTION 6: Product Overview Counts */}
                  <View style={[styles.cardCol, { flex: 1.5 }]}>
                    <Text style={styles.cardColTitle}><FontAwesome name="archive" size={16} color={C.violet} /> Catalog & Products Metrics</Text>
                    <View style={styles.ordersChecklistGrid}>
                      {[
                        { label: "Total Products", count: d.productsCount, bg: C.violetBg, color: C.violet },
                        { label: "Published Items", count: 685, bg: C.activeBg, color: C.active },
                        { label: "Draft Products", count: 23, bg: C.greyBg, color: C.grey },
                        { label: "Out of Stock", count: d.outOfStock, bg: C.inactiveBg, color: C.inactive },
                        { label: "Low Stock Items", count: d.lowStock, bg: C.warningBg, color: C.warning },
                        { label: "Hidden Catalog", count: 0, bg: C.primaryLight, color: C.primary },
                        { label: "Total Categories", count: d.categoriesCount, bg: C.purpleBg, color: C.purple },
                        { label: "Active Brands", count: 8, bg: C.processingBg, color: C.processing }
                      ].map((item, idx) => (
                        <View key={idx} style={[styles.orderCheckCard, { borderColor: item.color, backgroundColor: item.bg }]}>
                          <Text style={styles.orderCheckLabel}>{item.label}</Text>
                          <Text style={[styles.orderCheckCount, { color: item.color }]}>{item.count} items</Text>
                        </View>
                      ))}
                    </View>

                    {/* Catalog Health Audit Section */}
                    <View style={styles.healthAuditContainer}>
                      <View style={styles.healthHeaderRow}>
                        <Text style={styles.healthAuditTitle}><FontAwesome name="clipboard" size={16} color={C.active} /> Catalog Quality & Health Audit</Text>
                        <View style={[styles.statusBadgeCell, { backgroundColor: C.activeBg, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 6 }]}>
                          <Text style={[styles.statusBadgeText, { color: C.active, fontWeight: "800", fontSize: 10 }]}>
                            {catalogQuality?.overallScore ? `${catalogQuality.overallScore}% Score` : "—% Score"}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.healthSubtitle}>A high score improves SEO ranking and increases customer conversion rate.</Text>

                      <View style={styles.healthList}>
                        {[
                          { label: "Product Images Attached", val: catalogQuality?.productImagesAttached ? `${catalogQuality.productImagesAttached}%` : "—%", score: catalogQuality?.productImagesAttached ? catalogQuality.productImagesAttached / 100 : 0, color: C.active },
                          { label: "Rich Descriptions Filled", val: catalogQuality?.richDescriptionsFilled ? `${catalogQuality.richDescriptionsFilled}%` : "—%", score: catalogQuality?.richDescriptionsFilled ? catalogQuality.richDescriptionsFilled / 100 : 0, color: C.purple },
                          { label: "SEO Metadata & Tags", val: catalogQuality?.seoMetadataTags ? `${catalogQuality.seoMetadataTags}%` : "—%", score: catalogQuality?.seoMetadataTags ? catalogQuality.seoMetadataTags / 100 : 0, color: C.processing },
                          { label: "Category & Brand Mappings", val: catalogQuality?.categoryBrandMappings ? `${catalogQuality.categoryBrandMappings}%` : "—%", score: catalogQuality?.categoryBrandMappings ? catalogQuality.categoryBrandMappings / 100 : 0, color: C.active }
                        ].map((item, idx) => (
                          <View key={idx} style={styles.healthItemRow}>
                            <View style={styles.healthItemMeta}>
                              <Text style={styles.healthItemLabel}>{item.label}</Text>
                              <Text style={styles.healthItemValue}>{item.val}</Text>
                            </View>
                            {/* Progress bar */}
                            <View style={styles.progressBarBg}>
                              <View style={[styles.progressBarFill, { width: `${item.score * 100}%`, backgroundColor: item.color }]} />
                            </View>
                          </View>
                        ))}
                      </View>

                      {/* Quality Alerts */}
                      <View style={styles.qualityAlertsBanner}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Ionicons name="alert-circle-outline" size={14} color={C.warning} />
                          <Text style={styles.qualityAlertsText}>
                            <Text style={{ fontWeight: "700" }}>Optimization Tips: </Text>
                            {catalogQuality?.optimizationTips || "Loading..."}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* SECTION 11: CRITICAL INVENTORY ALERTS */}
                  <View style={[styles.cardCol, { flex: 2 }]}>
                    <Text style={styles.cardColTitle}><FontAwesome name="warning" size={16} color="#ef4444" /> Critical Stock alerts & Restock Triggers</Text>
                    <View style={styles.tableWrapper}>
                      <View style={[styles.tableHdrRow, { backgroundColor: C.greyBg }]}>
                        <Text style={[styles.tableHdrCell, { flex: 2 }]}>Product</Text>
                        <Text style={[styles.tableHdrCell, { flex: 1.2, textAlign: "center" }]}>Status</Text>
                        <Text style={[styles.tableHdrCell, { flex: 1, textAlign: "center" }]}>Quantity</Text>
                        <Text style={[styles.tableHdrCell, { flex: 1.2, textAlign: "center" }]}>Severity</Text>
                        <Text style={[styles.tableHdrCell, { flex: 1.2, textAlign: "center" }]}>Action</Text>
                      </View>

                      {inventoryAlertsView.map(item => (
                        <View key={item.id} style={styles.tableRowData}>
                          <Text style={[styles.tableCellText, { flex: 2, fontWeight: "600" }]} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <View style={[styles.tableCellText, { flex: 1.2, alignItems: "center" }]}>
                            <View style={[styles.statusBadgeCell, { backgroundColor: item.bg }]}>
                              <Text style={[styles.statusBadgeText, { color: item.badgeColor }]}>{item.type}</Text>
                            </View>
                          </View>
                          <Text style={[styles.tableCellText, { flex: 1, textAlign: "center", fontWeight: "700" }]}>
                            {item.qty}
                          </Text>
                          <View style={[styles.tableCellText, { flex: 1.2, alignItems: "center" }]}>
                            <Text style={{
                              fontSize: 10,
                              fontWeight: "700",
                              color: item.severity === "High" ? C.inactive : item.severity === "Medium" ? C.warning : C.active
                            }}>
                              {item.severity}
                            </Text>
                          </View>
                          <View style={[styles.tableCellText, { flex: 1.2, alignItems: "center" }]}>
                            {item.qty < 50 ? (
                              <TouchableOpacity onPress={() => restockProduct(item.id)} style={styles.restockActionBtn}>
                                <Text style={styles.restockActionBtnText}>Restock</Text>
                              </TouchableOpacity>
                            ) : (
                              <Ionicons name="checkmark-circle" size={16} color={C.active} />
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>

                </View>

                {/* SECTION 7: TOP SELLING PRODUCTS (Top 10; Web: table with search/sort/page; Mobile: list) */}
                <View style={styles.sectionCard}>
                  <View style={styles.tableFilterHeader}>
                    <Text style={styles.sectionTitle}><FontAwesome name="trophy" size={16} color="#eab308" /> Top 10 Selling Products List</Text>

                    <View style={styles.tableHeaderControls}>
                      {/* Search field */}
                      <View style={styles.searchContainer}>
                        <Ionicons name="search-outline" size={14} color={C.sub} />
                        <TextInput
                          style={styles.searchBarInput}
                          value={prodSearch}
                          onChangeText={(text) => { setProdSearch(text); setProdPage(0); }}
                          placeholder="Search products..."
                        />
                      </View>

                      {/* Sort buttons (Web only) */}
                      {isLargeScreen && (
                        <View style={styles.sortToggleRow}>
                          <Text style={styles.sortLabel}>Sort:</Text>
                          {[
                            { key: "name", label: "Name" },
                            { key: "sales", label: "Sales" },
                            { key: "revenue", label: "Revenue" }
                          ].map(sField => (
                            <TouchableOpacity
                              key={sField.key}
                              onPress={() => {
                                if (prodSortField === sField.key) {
                                  setProdSortAsc(!prodSortAsc);
                                } else {
                                  setProdSortField(sField.key as any);
                                  setProdSortAsc(false);
                                }
                              }}
                              style={[styles.sortFieldBtn, prodSortField === sField.key && styles.sortFieldBtnActive]}
                            >
                              <Text style={[styles.sortFieldBtnText, prodSortField === sField.key && styles.sortFieldBtnTextActive]}>
                                {sField.label} {prodSortField === sField.key && (prodSortAsc ? "▲" : "▼")}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Web View Table */}
                  {!isMobile ? (
                    <View style={styles.tableWrapper}>
                      <View style={[styles.tableHdrRow, { backgroundColor: C.greyBg }]}>
                        <Text style={[styles.tableHdrCell, { width: 50, textAlign: "center" }]}>Img</Text>
                        <Text style={[styles.tableHdrCell, { flex: 2 }]}>Product Name</Text>
                        <Text style={[styles.tableHdrCell, { width: 100, textAlign: "center" }]}>Units Sold</Text>
                        <Text style={[styles.tableHdrCell, { width: 120, textAlign: "right" }]}>Revenue</Text>
                        <Text style={[styles.tableHdrCell, { width: 120, textAlign: "center" }]}>Stock Status</Text>
                      </View>

                      {paginatedProducts.length === 0 ? (
                        <View style={styles.tableEmptyRow}>
                          <Text style={styles.tableEmptyText}>
                            {topProductsRaw.length === 0
                              ? "No sales data yet. Top products appear after orders are placed."
                              : "No products match your search."}
                          </Text>
                        </View>
                      ) : paginatedProducts.map((p) => (
                        <View key={p.id} style={styles.tableRowData}>
                          <View style={{ width: 50, alignItems: "center" }}>
                            <TopProductThumb uri={p.imageUrl} size={40} />
                          </View>
                          <Text style={[styles.tableCellText, { flex: 2, fontWeight: "600" }]} numberOfLines={1}>
                            {p.name}
                          </Text>
                          <Text style={[styles.tableCellText, { width: 100, textAlign: "center", fontWeight: "700" }]}>
                            {p.sales} units
                          </Text>
                          <Text style={[styles.tableCellText, { width: 120, textAlign: "right", color: C.active, fontWeight: "700" }]}>
                            {rupee(p.revenue)}
                          </Text>
                          <View style={{ width: 120, alignItems: "center" }}>
                            <View style={[
                              styles.statusBadgeCell,
                              { backgroundColor: p.stock === "In Stock" ? C.activeBg : p.stock === "Low Stock" ? C.warningBg : C.inactiveBg }
                            ]}>
                              <Text style={[
                                styles.statusBadgeText,
                                { color: p.stock === "In Stock" ? C.active : p.stock === "Low Stock" ? C.warning : C.inactive }
                              ]}>
                                {p.stock} ({p.stockCount})
                              </Text>
                            </View>
                          </View>
                        </View>
                      ))}

                      {/* Pagination */}
                      <View style={styles.paginationRow}>
                        <Text style={styles.paginationSummary}>
                          Showing {prodPage * 5 + 1} - {Math.min((prodPage + 1) * 5, filteredProducts.length)} of {filteredProducts.length} items
                        </Text>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <TouchableOpacity
                            disabled={prodPage === 0}
                            onPress={() => setProdPage(p => p - 1)}
                            style={[styles.pageBtnLink, prodPage === 0 && styles.pageBtnLinkDisabled]}
                          >
                            <Text style={styles.pageBtnLinkText}>Prev</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            disabled={(prodPage + 1) * 5 >= filteredProducts.length}
                            onPress={() => setProdPage(p => p + 1)}
                            style={[styles.pageBtnLink, (prodPage + 1) * 5 >= filteredProducts.length && styles.pageBtnLinkDisabled]}
                          >
                            <Text style={styles.pageBtnLinkText}>Next</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                    </View>
                  ) : (
                    // Mobile View Card List with simulated infinite scroll load-more button
                    <View style={styles.mobileCardListWrap}>
                      {filteredProducts.length === 0 ? (
                        <View style={styles.tableEmptyRow}>
                          <Text style={styles.tableEmptyText}>
                            {topProductsRaw.length === 0
                              ? "No sales data yet."
                              : "No products match your search."}
                          </Text>
                        </View>
                      ) : filteredProducts.slice(0, mobileProdCount).map(p => (
                        <View key={p.id} style={styles.mobileProductCard}>
                          <View style={styles.mobileProductCardHeader}>
                            <TopProductThumb uri={p.imageUrl} size={48} />
                            <View style={{ flex: 1, gap: 2 }}>
                              <Text style={styles.mobileCardProdName} numberOfLines={1}>{p.name}</Text>
                              <Text style={styles.mobileCardProdId}>ID: {p.id}</Text>
                            </View>
                          </View>
                          <View style={styles.mobileProductCardBody}>
                            <View>
                              <Text style={styles.mobileCardSubVal}>Sales: <Text style={{ fontWeight: "700" }}>{p.sales}</Text></Text>
                              <Text style={styles.mobileCardSubVal}>Revenue: <Text style={{ fontWeight: "700", color: C.active }}>{rupee(p.revenue)}</Text></Text>
                            </View>
                            <View style={[
                              styles.statusBadgeCell,
                              { backgroundColor: p.stock === "In Stock" ? C.activeBg : p.stock === "Low Stock" ? C.warningBg : C.inactiveBg }
                            ]}>
                              <Text style={[
                                styles.statusBadgeText,
                                { color: p.stock === "In Stock" ? C.active : p.stock === "Low Stock" ? C.warning : C.inactive }
                              ]}>
                                {p.stock} ({p.stockCount})
                              </Text>
                            </View>
                          </View>
                        </View>
                      ))}

                      {/* Load More Trigger representing Infinite Scroll */}
                      {mobileProdCount < filteredProducts.length ? (
                        <TouchableOpacity
                          onPress={() => setMobileProdCount(c => c + 3)}
                          style={styles.loadMoreInfiniteBtn}
                        >
                          <Text style={styles.loadMoreInfiniteBtnText}>Load More (Infinite Scroll)...</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={styles.noMoreItemsText}>All products loaded.</Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* SECTION 4: USERS & SELLERS */}
            <View
              key={`users-${loading}`}
              onLayout={(e) => {
                const y = e.nativeEvent.layout.y;
                setSectionOffsets(prev => ({ ...prev, users: y }));
              }}
              style={[styles.tabSection, styles.sectionSpacing]}
            >
              {/* --- USERS & SELLERS SECTION --- */}
              <View
                style={[styles.sectionHeaderCard, { borderColor: C.purple }]}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="people-outline" size={18} color={C.purple} />
                  <Text style={styles.sectionHeaderTitle}>Users & Seller Network</Text>
                </View>
              </View>
              <View style={styles.tabSection}>

                {/* SECTION 4 & SECTION 5: CUSTOMER & SELLER OVERVIEWS */}
                <View style={styles.rowLayout}>

                  {/* SECTION 4: Customer Analytics Card */}
                  <View style={[styles.cardCol, { flex: 1.2 }]}>
                    <Text style={styles.cardColTitle}><FontAwesome name="users" size={16} color={C.primary} /> Customer Base Analytics</Text>
                    <View style={styles.paymentOverviewList}>
                      {[
                        { label: "Total Registered Customers", count: customerStats?.total ?? 0 },
                        { label: "New Customers Registered Today", count: 4 },
                        { label: "New Customers This Week", count: 18 },
                        { label: "New Customers This Month", count: 42 },
                        { label: "Active Customers (Placed Order)", count: 112 },
                        { label: "Inactive Customers (No Order)", count: 92 }
                      ].map((item, idx) => (
                        <View key={idx} style={styles.paymentMetricRow}>
                          <Text style={styles.paymentMetricLabel}>{item.label}</Text>
                          <Text style={[styles.paymentMetricVal, { color: C.primary }]}>{count(item.count)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* SECTION 5: Seller Analytics Card */}
                  <View style={[styles.cardCol, { flex: 1.2 }]}>
                    <Text style={styles.cardColTitle}><FontAwesome name="building" size={16} color={C.purple} /> Seller Network Summary</Text>
                    <View style={styles.paymentOverviewList}>
                      {[
                        { label: "Total Sellers Enrolled", count: sellerStats?.total ?? sellerStats?.registered ?? 0 },
                        { label: "Active Sellers (With Products)", count: sellerStats?.active ?? sellerStats?.approved ?? 0 },
                        { label: "Inactive Sellers (No Products)", count: 70 },
                        { label: "Pending Verification Sellers", count: sellerStats?.pending ?? 0 },
                        { label: "Top Performing Sellers (Verified)", count: 10 }
                      ].map((item, idx) => (
                        <View key={idx} style={styles.paymentMetricRow}>
                          <Text style={styles.paymentMetricLabel}>{item.label}</Text>
                          <Text style={[styles.paymentMetricVal, { color: C.purple }]}>{count(item.count)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* SECTION 10: RECENT CUSTOMERS (Last 10) */}
                  <View style={[styles.cardCol, { flex: 1.5 }]}>
                    <Text style={styles.cardColTitle}><FontAwesome name="user-plus" size={16} color={C.active} /> Newly Registered Customers (Last 10)</Text>
                    <ScrollView
                      style={{ maxHeight: 220 }}
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={false}
                    >
                      {recentCustomersList.map(c => (
                        <View key={c.id} style={styles.customerListRow}>
                          <View style={styles.avatarCircleSmall}>
                            <Text style={styles.avatarCircleText}>
                              {c.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                            </Text>
                          </View>
                          <View style={{ flex: 1, gap: 2 }}>
                            <Text style={styles.customerRowName}>{c.name}</Text>
                            <Text style={styles.customerRowEmail}>{c.email}</Text>
                          </View>
                          <View style={{ alignItems: "flex-end", gap: 2 }}>
                            <Text style={styles.customerRowDate}>{c.date}</Text>
                            <View style={styles.customerRowStatusBadge}>
                              <Text style={styles.customerRowStatusBadgeText}>{c.status}</Text>
                            </View>
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  </View>

                </View>

                {/* SECTION 8: TOP SELLERS (Top 10; Web: Advanced Table; Mobile: cards) */}
                <View style={styles.sectionCard}>
                  <View style={styles.tableFilterHeader}>
                    <Text style={styles.sectionTitle}><FontAwesome name="star" size={16} color="#eab308" /> Top Sellers (by Revenue)</Text>

                    <View style={styles.tableHeaderControls}>
                      <View style={styles.searchContainer}>
                        <Ionicons name="search-outline" size={14} color={C.sub} />
                        <TextInput
                          style={styles.searchBarInput}
                          value={sellerSearch}
                          onChangeText={setSellerSearch}
                          placeholder="Search sellers..."
                        />
                      </View>
                    </View>
                  </View>

                  {!isMobile ? (
                    <View style={styles.tableWrapper}>
                      <View style={[styles.tableHdrRow, { backgroundColor: C.greyBg }]}>
                        <Text style={[styles.tableHdrCell, { flex: 1.5 }]}>Seller Name</Text>
                        <Text style={[styles.tableHdrCell, { flex: 1.5 }]}>Business</Text>
                        <Text style={[styles.tableHdrCell, { flex: 1, textAlign: "center" }]}>Orders</Text>
                        <Text style={[styles.tableHdrCell, { flex: 1.2, textAlign: "right" }]}>Revenue</Text>
                        <Text style={[styles.tableHdrCell, { flex: 1, textAlign: "center" }]}>Rating</Text>
                        <Text style={[styles.tableHdrCell, { flex: 1, textAlign: "center" }]}>Status</Text>
                      </View>

                      {filteredSellers.map((s, idx) => (
                        <View key={idx} style={styles.tableRowData}>
                          <Text style={[styles.tableCellText, { flex: 1.5, fontWeight: "600" }]} numberOfLines={1}>
                            {s.name}
                          </Text>
                          <Text style={[styles.tableCellText, { flex: 1.5, color: C.sub }]} numberOfLines={1}>
                            {s.business}
                          </Text>
                          <Text style={[styles.tableCellText, { flex: 1, textAlign: "center", fontWeight: "700" }]}>
                            {s.orders}
                          </Text>
                          <Text style={[styles.tableCellText, { flex: 1.2, textAlign: "right", color: C.active, fontWeight: "700" }]}>
                            {rupee(s.revenue)}
                          </Text>
                          <Text style={[styles.tableCellText, { flex: 1, textAlign: "center", fontWeight: "700", color: "#eab308" }]}>
                            ★ {s.rating}
                          </Text>
                          <View style={[styles.tableCellText, { flex: 1, alignItems: "center" }]}>
                            <View style={styles.activeSellerBadge}>
                              <Text style={styles.activeSellerBadgeText}>{s.status}</Text>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.mobileCardListWrap}>
                      {filteredSellers.map(s => (
                        <View key={s.id} style={styles.mobileProductCard}>
                          <View style={styles.mobileProductCardHeader}>
                            <View style={styles.avatarCircleSmall}>
                              <Text style={styles.avatarCircleText}>S</Text>
                            </View>
                            <View style={{ flex: 1, gap: 2 }}>
                              <Text style={styles.mobileCardProdName}>{s.name}</Text>
                              <Text style={styles.mobileCardProdId}>{s.business}</Text>
                            </View>
                          </View>
                          <View style={styles.mobileProductCardBody}>
                            <View>
                              <Text style={styles.mobileCardSubVal}>Orders: {s.orders}</Text>
                              <Text style={styles.mobileCardSubVal}>Revenue: <Text style={{ color: C.active, fontWeight: "600" }}>{rupee(s.revenue)}</Text></Text>
                            </View>
                            <View style={{ alignItems: "flex-end", gap: 4 }}>
                              <Text style={{ color: "#eab308", fontWeight: "700", fontSize: 12 }}>★ {s.rating}</Text>
                              <View style={styles.activeSellerBadge}>
                                <Text style={styles.activeSellerBadgeText}>{s.status}</Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* SECTION 9: RECENT ORDERS (Last 10 with actions) */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}><FontAwesome name="file-text" size={16} color={C.primary} /> Recent Orders Logs (Last 10)</Text>

                  {!isMobile ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ minWidth: "100%" }}>
                      <View style={[styles.tableWrapper, { minWidth: 800, width: "100%" }]}>
                        <View style={[styles.tableHdrRow, { backgroundColor: C.greyBg }]}>
                          <Text style={[styles.tableHdrCell, { flex: 1.5 }]}>Order ID</Text>
                          <Text style={[styles.tableHdrCell, { flex: 1.8 }]}>Customer</Text>
                          <Text style={[styles.tableHdrCell, { flex: 1.2, textAlign: "right" }]}>Amount</Text>
                          <Text style={[styles.tableHdrCell, { flex: 1.2, textAlign: "center" }]}>Status</Text>
                          <Text style={[styles.tableHdrCell, { flex: 1.2, textAlign: "center" }]}>Payment</Text>
                          <Text style={[styles.tableHdrCell, { flex: 1.5, textAlign: "center" }]}>Date</Text>
                          <Text style={[styles.tableHdrCell, { flex: 2, textAlign: "center" }]}>Update Status Action</Text>
                        </View>
                        {recentOrders.map(o => {
                          let badgeBg = C.processingBg;
                          let badgeColor = C.processing;
                          if (o.status === "Completed" || o.status === "Delivered") {
                            badgeBg = C.activeBg;
                            badgeColor = C.active;
                          } else if (o.status === "Cancelled") {
                            badgeBg = C.inactiveBg;
                            badgeColor = C.inactive;
                          } else if (o.status === "Returned") {
                            badgeBg = C.returnedBg;
                            badgeColor = C.returned;
                          } else if (o.status === "Shipped") {
                            badgeBg = C.purpleBg;
                            badgeColor = C.purple;
                          }


                          return (
                            <View key={o.id} style={styles.tableRowData}>
                              <TouchableOpacity
                                style={{ flex: 1.5 }}
                                onPress={() => router.push({ pathname: "/orderDetails" as any, params: { orderId: String(o.rawId) } })}
                              >
                                <Text style={[styles.tableCellText, { fontWeight: "700", color: C.primary }]} numberOfLines={1}>
                                  {o.id}
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={{ flex: 1.8 }}
                                onPress={() => {
                                  const match = customers.find(c => c.name === o.customer || c.email === o.customerEmail);
                                  if (match) {
                                    router.push({ pathname: "/customerDetails" as any, params: { id: String(match.id) } });
                                  } else {
                                    router.push({ pathname: "/customerManagement" as any, params: { search: o.customer } });
                                  }
                                }}
                              >
                                <Text style={[styles.tableCellText, { fontWeight: "500", color: C.processing }]} numberOfLines={1}>
                                  {o.customer}
                                </Text>
                              </TouchableOpacity>
                              <Text style={[styles.tableCellText, { flex: 1.2, textAlign: "right", fontWeight: "700" }]}>
                                {rupee(o.amount)}
                              </Text>
                              <View style={[styles.tableCellText, { flex: 1.2, alignItems: "center" }]}>
                                <View style={[styles.statusBadgeCell, { backgroundColor: badgeBg }]}>
                                  <Text style={[styles.statusBadgeText, { color: badgeColor }]}>{o.status}</Text>
                                </View>
                              </View>
                              <Text style={[styles.tableCellText, { flex: 1.2, textAlign: "center" }]}>
                                {o.payment}
                              </Text>
                              <Text style={[styles.tableCellText, { flex: 1.5, textAlign: "center", color: C.sub }]}>
                                {o.date}
                              </Text>

                              {/* Inline Actions dropdown simulation */}
                              <View style={[styles.tableCellText, { flex: 2, flexDirection: "row", justifyContent: "center", gap: 6 }]}>
                                {[
                                  { code: "Completed", label: "Complete", color: C.active },
                                  { code: "Shipped", label: "Ship", color: C.purple },
                                  { code: "Cancelled", label: "Cancel", color: C.inactive }
                                ].map(act => (
                                  <TouchableOpacity
                                    key={act.code}
                                    onPress={() => updateOrderStatus(o.id, act.code)}
                                    style={[styles.smallInlineActionBtn, { borderColor: act.color }]}
                                  >
                                    <Text style={[styles.smallInlineActionBtnText, { color: act.color }]}>{act.label}</Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </ScrollView>
                  ) : (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
                      {recentOrders.map(o => {
                        let badgeBg = C.processingBg;
                        let badgeColor = C.processing;
                        if (o.status === "Completed" || o.status === "Delivered") {
                          badgeBg = C.activeBg;
                          badgeColor = C.active;
                        } else if (o.status === "Cancelled") {
                          badgeBg = C.inactiveBg;
                          badgeColor = C.inactive;
                        } else if (o.status === "Returned") {
                          badgeBg = C.returnedBg;
                          badgeColor = C.returned;
                        } else if (o.status === "Shipped") {
                          badgeBg = C.purpleBg;
                          badgeColor = C.purple;
                        }

                        return (
                          <View key={o.id} style={{ flexGrow: 1, width: "100%", backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 12, gap: 8 }}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 4 }}>
                              <TouchableOpacity
                                style={{ flex: 1 }}
                                onPress={() => router.push({ pathname: "/orderDetails" as any, params: { orderId: String(o.rawId) } })}
                              >
                                <Text style={{ fontWeight: "700", color: C.primary, fontSize: 12 }} numberOfLines={1}>{o.id}</Text>
                              </TouchableOpacity>
                              <View style={[styles.statusBadgeCell, { backgroundColor: badgeBg }]}>
                                <Text style={[styles.statusBadgeText, { color: badgeColor, fontSize: 8 }]}>{o.status}</Text>
                              </View>
                            </View>

                            <TouchableOpacity
                              onPress={() => {
                                const match = customers.find(c => c.name === o.customer || c.email === o.customerEmail);
                                if (match) {
                                  router.push({ pathname: "/customerDetails" as any, params: { id: String(match.id) } });
                                } else {
                                  router.push({ pathname: "/customerManagement" as any, params: { search: o.customer } });
                                }
                              }}
                            >
                              <Text style={{ fontWeight: "500", color: C.processing, fontSize: 11 }} numberOfLines={1}>{o.customer}</Text>
                            </TouchableOpacity>

                            <Text style={{ fontWeight: "700", fontSize: 13, color: C.text }}>{rupee(o.amount)}</Text>

                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                              <Text style={{ color: C.sub, fontSize: 10 }}>{o.date}</Text>
                              <Text style={{ color: C.sub, fontSize: 10 }}>{o.payment}</Text>
                            </View>

                            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                              {[
                                { code: "Completed", label: "Complete", color: C.active },
                                { code: "Shipped", label: "Ship", color: C.purple },
                                { code: "Cancelled", label: "Cancel", color: C.inactive }
                              ].map(act => (
                                <TouchableOpacity
                                  key={act.code}
                                  onPress={() => updateOrderStatus(o.id, act.code)}
                                  style={[styles.smallInlineActionBtn, { borderColor: act.color, flex: 1, alignItems: "center" }]}
                                >
                                  <Text style={[styles.smallInlineActionBtnText, { color: act.color }]}>{act.label}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>

                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
            </View>


          </View>
        </ScrollView>

        {/* SECTION 15: Create Coupon Modal Popup */}
        <Modal visible={couponModalVisible} transparent animationType="fade" onRequestClose={() => setCouponModalVisible(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setCouponModalVisible(false)}>
            <Pressable style={styles.modalCard}>
              <Text style={styles.modalTitle}>Create New Discount Coupon</Text>
              <View style={{ gap: 12, marginTop: 12 }}>
                <View>
                  <Text style={styles.modalInputLabel}>Coupon Code</Text>
                  <TextInput style={styles.modalInput} value={couponCode} onChangeText={setCouponCode} placeholder="e.g. FLINT20" placeholderTextColor={C.sub} />
                </View>
                <View>
                  <Text style={styles.modalInputLabel}>Discount Percentage (%)</Text>
                  <TextInput style={styles.modalInput} keyboardType="numeric" value={couponDiscount} onChangeText={setCouponDiscount} placeholder="e.g. 20" placeholderTextColor={C.sub} />
                </View>
              </View>
              <View style={styles.modalFooterActions}>
                <TouchableOpacity onPress={() => setCouponModalVisible(false)} style={[styles.modalBtn, { borderColor: C.sub, borderWidth: 1 }]}>
                  <Text style={{ color: C.sub }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCreateCoupon} style={[styles.modalBtn, { backgroundColor: C.primary }]}>
                  <Text style={{ color: "#FFF", fontWeight: "600" }}>Create Coupon</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>


      </View>
    </AdminLayout>
  );
}

const getStyles = (isDark: boolean, screenW: number) => {
  const C = getPalette(isDark);
  return StyleSheet.create({
    sectionHeaderCard: {
      backgroundColor: C.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: C.border,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      shadowColor: "#000",
      shadowOpacity: 0.01,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      elevation: 1,
      marginTop: 10,
    },
    sectionHeaderTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: C.text,
    },

    screenWrapper: {
      flex: 1,
      position: "relative",
    },
    headerContainer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      backgroundColor: C.bg,
      paddingHorizontal: 18,
      paddingTop: 22,
      paddingBottom: 12,
    },
    sectionSpacing: {
      marginTop: 30,
    },
    scroll: {
      flex: 1,
      backgroundColor: C.bg,
    },
    scrollContent: {
      paddingBottom: 40,
      paddingHorizontal: screenW < 480 ? 10 : (screenW < 768 ? 16 : 24),
    },
    container: {
      alignSelf: "stretch",
      width: "100%",
      gap: 20,
    },

    // Header styles
    headerCard: {
      backgroundColor: "#151D4F",
      borderRadius: 16,
      padding: screenW < 480 ? 12 : 20,
      borderWidth: 1,
      borderColor: "#2a4365",
      flexDirection: screenW < 1024 ? "column" : "row",
      alignItems: screenW < 1024 ? "stretch" : "center",
      justifyContent: "space-between",
      gap: 12,
      shadowColor: "#000",
      shadowOpacity: 0.02,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 8,
      elevation: 2,
      alignSelf: "stretch",
      width: "100%",
    },
    headerCardMobile: {
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: "#2a4365",
      paddingTop: 48,
      paddingBottom: 40,
      paddingHorizontal: 20,
    },
    mobileNavCard: {
      backgroundColor: C.surface,
      marginHorizontal: 16,
      marginTop: -20,
      borderRadius: 12,
      padding: 10,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
      borderWidth: 1,
      borderColor: C.border,
    },
    headerTitle: {
      fontSize: screenW < 375 ? 18 : (screenW < 480 ? 20 : 22),
      fontWeight: "800",
      color: "#FFFFFF",
    },
    headerSubtext: {
      fontSize: 12,
      color: "#94a3b8",
      marginTop: 2,
    },
    tabButtons: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      backgroundColor: C.greyBg,
      padding: 4,
      borderRadius: 10,
    },
    tabButtonsMobileGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      backgroundColor: C.greyBg,
      padding: 4,
      borderRadius: 10,
      width: "100%",
      marginTop: 8,
    },
    tabButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    tabButtonMobileGridItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingHorizontal: 8,
      paddingVertical: 8,
      borderRadius: 8,
      flexBasis: "48%",
      flexGrow: 1,
    },
    tabButtonActive: {
      backgroundColor: C.primary,
    },
    tabButtonText: {
      fontSize: screenW < 360 ? 10 : 12,
      fontWeight: "600",
      color: C.sub,
    },
    tabButtonTextActive: {
      color: "#FFF",
    },

    // Tab Section Wrapper
    tabSection: {
      gap: 20,
      scrollMarginTop: Platform.OS === "web" ? 146 : undefined,
    },

    // KPI Statistics Cards
    statsCardGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 16,
    },
    kpiCard: {
      flex: 1,
      minWidth: screenW < 480 ? "100%" : 220,
      backgroundColor: C.surface,
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor: C.border,
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.02,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 10,
      elevation: 2,
      position: "relative",
      overflow: "hidden",
    },
    kpiCardInner: {
      gap: 4,
      zIndex: 1,
    },
    kpiCardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    kpiCardLabel: {
      fontSize: 11,
      color: C.sub,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    kpiTrigger: {
      padding: 2,
    },
    kpiIconCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    kpiCardValue: {
      fontSize: screenW < 375 ? 18 : (screenW < 480 ? 20 : 22),
      fontWeight: "800",
      color: C.text,
    },
    kpiFooter: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 2,
    },
    trendPill: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    trendPillText: {
      fontSize: 9,
      fontWeight: "800",
    },
    kpiFooterSub: {
      fontSize: 10,
      color: C.sub,
    },
    kpiBgIconDecor: {
      position: "absolute",
      right: -12,
      bottom: -16,
      zIndex: 0,
    },
    kpiInnerContent: {
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      paddingVertical: 10,
    },
    kpiLoadingText: {
      fontSize: 10,
      color: C.sub,
    },
    kpiErrorText: {
      fontSize: 10,
      color: C.inactive,
      fontWeight: "600",
    },
    kpiRetryText: {
      fontSize: 9,
      fontWeight: "700",
      color: C.primary,
      textDecorationLine: "underline",
      marginTop: 2,
    },

    // Row Layout Grid
    rowLayout: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 20,
    },
    cardCol: {
      backgroundColor: C.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: C.border,
      minWidth: 280,
      gap: 16,
      shadowColor: "#000",
      shadowOpacity: 0.02,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 8,
      elevation: 2,
    },
    cardColTitle: {
      fontSize: 15,
      fontWeight: "800",
      color: C.text,
    },
    cardTitleBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },

    // Quick Actions Grid
    quickActionsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    quickActionItem: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: "30%",
      minWidth: 80,
      backgroundColor: C.surface,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      paddingHorizontal: 8,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 12,
      position: "relative",
      overflow: "hidden",
      shadowColor: "#000",
      shadowOpacity: 0.01,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      elevation: 1,
      cursor: "pointer",
    },
    quickActionIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1,
    },
    quickActionTextLabel: {
      fontSize: 10.5,
      fontWeight: "700",
      color: C.text,
      textAlign: "center",
      zIndex: 1,
    },
    quickActionBgIconDecor: {
      position: "absolute",
      right: -10,
      bottom: -12,
      zIndex: 0,
    },

    // Live website activity & Promotion Tracker lists
    liveActivityList: {
      gap: 12,
    },
    liveActivityRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    liveActivityLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    liveActivityLabel: {
      fontSize: 11,
      color: C.sub,
      fontWeight: "600",
    },
    liveActivityValue: {
      fontSize: 14,
      fontWeight: "700",
      color: C.text,
    },
    greenPulseDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: C.active,
    },

    // Activity Notifications List Panel
    notifBadgeCircle: {
      backgroundColor: C.inactive,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    notifBadgeCircleText: {
      color: "#FFF",
      fontSize: 10,
      fontWeight: "700",
    },
    notifScroll: {
      maxHeight: 300,
      // @ts-ignore – web-only scrollbar hiding
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
    },
    notifItemRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      gap: 10,
    },
    notifItemRead: {
      opacity: 0.55,
    },
    notifIconWrap: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: C.greyBg,
      alignItems: "center",
      justifyContent: "center",
    },
    notifTextWrap: {
      flex: 1,
      gap: 2,
    },
    notifMsg: {
      fontSize: 11,
      fontWeight: "600",
      color: C.text,
    },
    notifMsgRead: {
      fontWeight: "500",
    },
    notifTime: {
      fontSize: 9,
      color: C.sub,
    },
    notifActionButtons: {
      flexDirection: "row",
      gap: 6,
    },
    notifActionBtn: {
      borderWidth: 1,
      borderColor: C.primary,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    notifActionBtnText: {
      fontSize: 9,
      fontWeight: "700",
      color: C.primary,
    },

    // Store Performance Summary Table
    perfTable: {
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 12,
      overflow: "hidden",
    },

    // Section card wrapper
    sectionCard: {
      backgroundColor: C.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: C.border,
      gap: 16,
      shadowColor: "#000",
      shadowOpacity: 0.02,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 8,
      elevation: 2,
    },

    // Revenue Analytics SVG Chart header
    revenueHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 12,
    },
    revenueSub: {
      fontSize: 11,
      color: C.sub,
      marginTop: 2,
    },
    revenueHeaderActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 12,
    },
    dateFilterContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: C.greyBg,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: C.border,
    },
    dateInputText: {
      fontSize: 11,
      color: C.text,
      width: 75,
      textAlign: "center",
      padding: 0,
    },
    dateDivider: {
      fontSize: 11,
      color: C.sub,
      paddingHorizontal: 4,
    },
    // Custom Date Picker styles
    calCard: {
      backgroundColor: C.surface,
      borderRadius: 16,
      padding: 20,
      width: 320,
      borderWidth: 1,
      borderColor: C.border,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 12,
      elevation: 5,
      gap: 12,
    },
    calCardDropdown: {
      position: "absolute",
      top: 32,
      backgroundColor: C.surface,
      borderRadius: 16,
      padding: 12,
      width: 304,
      borderWidth: 1,
      borderColor: C.border,
      shadowColor: "#000",
      shadowOpacity: 0.15,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 16,
      elevation: 10,
      zIndex: 10000,
      gap: 8,
    },
    calGridScroll: {
      height: 158,
      // @ts-ignore – web-only scrollbar hiding
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
    },
    calTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: C.text,
      textAlign: "center",
    },
    calHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: C.greyBg,
      borderRadius: 8,
      padding: 6,
    },
    calHeaderBtn: {
      padding: 4,
      borderRadius: 4,
    },
    calHeaderTitleRow: {
      flexDirection: "row",
      gap: 12,
    },
    calHeaderTextBtn: {
      paddingHorizontal: 4,
    },
    calHeaderTitleText: {
      fontSize: 13,
      fontWeight: "700",
      color: C.text,
    },
    calHeaderTitleTextSingle: {
      fontSize: 13,
      fontWeight: "700",
      color: C.text,
      width: "100%",
      textAlign: "center",
    },
    calDaysContainer: {
      gap: 8,
    },
    calWeekdaysRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    calWeekdayText: {
      width: 38,
      textAlign: "center",
      fontSize: 11,
      fontWeight: "600",
      color: C.sub,
    },
    calGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      rowGap: 4,
    },
    calDayCell: {
      width: 40,
      height: 36,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 6,
    },
    calDayCellMuted: {
      opacity: 0.35,
    },
    calDayCellSelected: {
      backgroundColor: C.primary,
    },
    calDayText: {
      fontSize: 12,
      color: C.text,
      fontWeight: "500",
    },
    calDayTextMuted: {
      color: C.sub,
    },
    calDayTextSelected: {
      color: "#FFF",
      fontWeight: "700",
    },
    calMonthsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      justifyContent: "center",
      paddingVertical: 10,
    },
    calMonthCell: {
      width: 64,
      height: 36,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 6,
      backgroundColor: C.greyBg,
    },
    calMonthCellSelected: {
      backgroundColor: C.primary,
    },
    calMonthText: {
      fontSize: 12,
      color: C.text,
      fontWeight: "600",
    },
    calMonthTextSelected: {
      color: "#FFF",
    },
    calYearsContainer: {
      height: 132,
    },
    calYearsScroll: {
      flex: 1,
    },
    calYearsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      justifyContent: "center",
      paddingVertical: 10,
    },
    calYearCell: {
      width: 64,
      height: 36,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 6,
      backgroundColor: C.greyBg,
    },
    calYearCellSelected: {
      backgroundColor: C.primary,
    },
    calYearText: {
      fontSize: 12,
      color: C.text,
      fontWeight: "600",
    },
    calYearTextSelected: {
      color: "#FFF",
    },
    calFooterActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: 8,
    },
    calFooterBtnCancel: {
      paddingVertical: 6,
      paddingHorizontal: 16,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: C.border,
    },
    dateInputClickable: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      minWidth: 85,
      justifyContent: "center",
    },
    dateInputClickableText: {
      fontSize: 11,
      color: C.text,
      fontWeight: "500",
    },
    tabToggles: {
      flexDirection: "row",
      backgroundColor: C.greyBg,
      borderRadius: 8,
      padding: 3,
    },
    tabToggleBtn: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 6,
    },
    tabToggleBtnActive: {
      backgroundColor: C.primary,
    },
    tabToggleText: {
      fontSize: 11,
      fontWeight: "600",
      color: C.sub,
    },
    tabToggleTextActive: {
      color: "#FFF",
    },
    legendsRowWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 14,
      marginTop: 4,
    },
    legendSelectorBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: C.border,
    },
    legendSelectorDisabled: {
      opacity: 0.35,
    },
    legendMarkerDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendSelectorLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: C.text,
    },
    chartContainer: {
      width: "100%",
      alignItems: "stretch",
      marginTop: 6,
    },

    // Orders distribution checklist
    ordersChecklistGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    orderCheckCard: {
      flexGrow: 1,
      flexShrink: 0,
      flexBasis: "22%",
      minWidth: 120,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1.5,
      gap: 4,
    },
    orderCheckLabel: {
      fontSize: 10,
      color: C.sub,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    orderCheckCount: {
      fontSize: 14,
      fontWeight: "800",
    },

    // Donut and Bar Double visual chart wrap
    doubleChartWrap: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 20,
      marginTop: 10,
    },
    doubleChartBox: {
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    chartSubtitleLabel: {
      fontSize: 10,
      color: C.sub,
      fontWeight: "600",
      textTransform: "uppercase",
    },
    donutWrapper: {
      position: "relative",
      width: 100,
      height: 100,
      alignItems: "center",
      justifyContent: "center",
    },
    donutSvg: {
      position: "absolute",
      top: -40,
      left: -40,
    },
    donutCenterLabel: {
      position: "absolute",
      alignItems: "center",
      justifyContent: "center",
    },
    donutCenterSub: {
      fontSize: 8,
      color: C.sub,
      fontWeight: "500",
    },
    donutCenterValue: {
      fontSize: 16,
      fontWeight: "800",
      color: C.text,
    },

    // Payments Overviews list
    paymentOverviewList: {
      gap: 10,
    },
    paymentMetricRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    paymentMetricLabel: {
      fontSize: 11,
      color: C.text,
      fontWeight: "600",
    },
    paymentMetricSub: {
      fontSize: 9,
      color: C.sub,
      marginTop: 1,
    },
    paymentMetricVal: {
      fontSize: 13,
      fontWeight: "700",
      color: C.text,
    },
    pieContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      marginTop: 12,
    },
    pieLegends: {
      gap: 6,
    },
    legendRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendText: {
      fontSize: 11,
      color: C.sub,
      fontWeight: "600",
    },
    refundGraphicWrapper: {
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      paddingVertical: 10,
      backgroundColor: C.greyBg,
      borderRadius: 12,
      marginTop: 8,
    },
    refundGraphicText: {
      fontSize: 10,
      color: C.sub,
      fontWeight: "600",
    },

    // Inventory Restock alerts table actions
    restockActionBtn: {
      backgroundColor: C.primary,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    restockActionBtnText: {
      color: "#FFF",
      fontSize: 9,
      fontWeight: "700",
    },

    // Top Products search, sort filters
    tableFilterHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      paddingBottom: 12,
    },
    tableHeaderControls: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 12,
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: C.greyBg,
      borderRadius: 8,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: C.border,
      height: 34,
      width: 200,
    },
    searchBarInput: {
      fontSize: 11,
      color: C.text,
      marginLeft: 6,
      flex: 1,
      padding: 0,
      // @ts-ignore – web-only: suppress default browser focus outline
      outlineStyle: "none",
      outlineWidth: 0,
      borderWidth: 0,
    },
    sortToggleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    sortLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: C.sub,
    },
    sortFieldBtn: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: C.border,
    },
    sortFieldBtnActive: {
      backgroundColor: C.primary,
      borderColor: C.primary,
    },
    sortFieldBtnText: {
      fontSize: 10,
      color: C.sub,
      fontWeight: "600",
    },
    sortFieldBtnTextActive: {
      color: "#FFF",
    },

    // Tables structure
    tableWrapper: {
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 12,
      overflow: "hidden",
    },
    tableHdrRow: {
      flexDirection: "row",
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    tableHdrCell: {
      fontSize: 10,
      fontWeight: "700",
      color: C.sub,
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    tableRowData: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderTopWidth: 1,
      borderTopColor: C.border,
      backgroundColor: C.surface,
    },
    tableEmptyRow: {
      paddingVertical: 24,
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center",
      borderTopWidth: 1,
      borderTopColor: C.border,
    },
    tableEmptyText: {
      fontSize: 13,
      color: C.sub,
      textAlign: "center",
    },
    tableCellText: {
      fontSize: 12,
      color: C.text,
    },
    statusBadgeCell: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: "700",
    },
    paginationRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 12,
      backgroundColor: C.greyBg,
      borderTopWidth: 1,
      borderTopColor: C.border,
    },
    paginationSummary: {
      fontSize: 11,
      color: C.sub,
      fontWeight: "500",
    },
    pageBtnLink: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
    },
    pageBtnLinkDisabled: {
      opacity: 0.45,
    },
    pageBtnLinkText: {
      fontSize: 10,
      color: C.text,
      fontWeight: "600",
    },

    // Mobile list styling for products/sellers
    mobileCardListWrap: {
      gap: 12,
    },
    mobileProductCard: {
      backgroundColor: C.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: C.border,
      gap: 10,
      shadowColor: "#000",
      shadowOpacity: 0.01,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      elevation: 1,
    },
    mobileProductCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    mobileCardProdName: {
      fontSize: 12,
      fontWeight: "700",
      color: C.text,
    },
    mobileCardProdId: {
      fontSize: 9,
      color: C.sub,
    },
    mobileProductCardBody: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor: C.border,
      paddingTop: 8,
    },
    mobileCardSubVal: {
      fontSize: 11,
      color: C.sub,
    },
    loadMoreInfiniteBtn: {
      backgroundColor: C.greyBg,
      borderWidth: 1,
      borderColor: C.border,
      paddingVertical: 10,
      alignItems: "center",
      borderRadius: 10,
      marginTop: 6,
    },
    loadMoreInfiniteBtnText: {
      fontSize: 11,
      color: C.primary,
      fontWeight: "700",
    },
    noMoreItemsText: {
      textAlign: "center",
      fontSize: 10,
      color: C.sub,
      marginTop: 6,
    },

    // Tab 4: Customer list row
    customerListRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      gap: 10,
    },
    avatarCircleSmall: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: C.primaryLight,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarCircleText: {
      color: C.primary,
      fontWeight: "700",
      fontSize: 10,
    },
    customerRowName: {
      fontSize: 11,
      fontWeight: "700",
      color: C.text,
    },
    customerRowEmail: {
      fontSize: 9,
      color: C.sub,
    },
    customerRowDate: {
      fontSize: 9,
      color: C.sub,
    },
    customerRowStatusBadge: {
      backgroundColor: C.activeBg,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
    },
    customerRowStatusBadgeText: {
      color: C.active,
      fontSize: 8,
      fontWeight: "700",
    },

    // Recent orders list action buttons
    smallInlineActionBtn: {
      borderWidth: 1,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    smallInlineActionBtnText: {
      fontSize: 9,
      fontWeight: "700",
    },

    // Coupon creator modal elements
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    modalCard: {
      backgroundColor: C.surface,
      borderRadius: 16,
      padding: 20,
      width: "100%",
      maxWidth: 340,
      gap: 14,
      shadowColor: "#000",
      shadowOpacity: 0.15,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 12,
      elevation: 8,
    },
    modalTitle: {
      fontSize: 15,
      fontWeight: "800",
      color: C.text,
    },
    modalInputLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: C.sub,
      textTransform: "uppercase",
      marginBottom: 4,
    },
    modalInput: {
      borderWidth: 1.5,
      borderColor: C.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      fontSize: 12,
      color: C.text,
    },
    modalFooterActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 8,
      marginTop: 6,
    },
    modalBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },

    // Top Sellers list widgets
    horizontalScrollWrapper: {
      width: "100%",
    },
    sellersTableMinWidth: {
      minWidth: 980,
    },
    colRank: {
      width: 40,
      paddingRight: 6,
    },
    colSeller: {
      width: 220,
      paddingRight: 6,
    },
    colBusiness: {
      width: 200,
      paddingRight: 6,
    },
    colStatus: {
      width: 80,
      paddingRight: 6,
    },
    colProducts: {
      width: 110,
      paddingRight: 6,
    },
    colStock: {
      width: 100,
      paddingRight: 6,
    },
    colVerify: {
      width: 110,
      paddingRight: 6,
    },
    colWallet: {
      width: 90,
      paddingRight: 6,
    },
    colAction: {
      width: 50,
      paddingRight: 6,
    },
    rankBadgeCell: {
      width: 24,
      height: 24,
      borderRadius: 6,
      backgroundColor: "#f1f5f9",
      alignItems: "center",
      justifyContent: "center",
    },
    rankBadgeCellText: {
      fontSize: 11,
      fontWeight: "600",
      color: C.sub,
    },
    activeSellerBadge: {
      backgroundColor: C.active,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
      alignSelf: "flex-start",
    },
    activeSellerBadgeText: {
      color: "#FFF",
      fontSize: 10,
      fontWeight: "700",
    },
    verifyPillProfile: {
      backgroundColor: C.active,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      alignSelf: "flex-start",
      width: 75,
      alignItems: "center",
    },
    verifyPillEmail: {
      backgroundColor: "#2563eb",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      alignSelf: "flex-start",
      width: 75,
      alignItems: "center",
    },
    verifyPillText: {
      color: "#FFF",
      fontSize: 9,
      fontWeight: "600",
    },
    scrollAccentBar: {
      height: 4,
      backgroundColor: C.primary,
      borderRadius: 2,
      marginTop: 8,
    },
    eyeActionBtn: {
      padding: 6,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: "#bfdbfe",
      backgroundColor: "#eff6ff",
      alignItems: "center",
      justifyContent: "center",
    },
    // Catalog Health Audit Styles
    healthAuditContainer: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: C.border,
      gap: 12,
    },
    healthHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    healthAuditTitle: {
      fontSize: 13,
      fontWeight: "800",
      color: C.text,
    },
    healthSubtitle: {
      fontSize: 11,
      color: C.sub,
      lineHeight: 15,
    },
    healthList: {
      gap: 10,
      marginTop: 4,
    },
    healthItemRow: {
      gap: 4,
    },
    healthItemMeta: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    healthItemLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: C.text,
    },
    healthItemValue: {
      fontSize: 11,
      fontWeight: "700",
      color: C.text,
    },
    progressBarBg: {
      height: 6,
      backgroundColor: C.greyBg,
      borderRadius: 3,
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
      borderRadius: 3,
    },
    qualityAlertsBanner: {
      backgroundColor: C.warningBg,
      borderRadius: 8,
      padding: 10,
      marginTop: 4,
    },
    qualityAlertsText: {
      fontSize: 10,
      color: C.text,
      flexShrink: 1,
      lineHeight: 14,
    },

    // Footer
    footer: {
      marginTop: 20,
      paddingVertical: 16,
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor: C.border,
    },
    footerText: {
      fontSize: 11,
      color: C.sub,
      textAlign: "center",
    },
    footerBoldText: {
      color: C.primary,
      fontWeight: "700",
    },
  });
};
