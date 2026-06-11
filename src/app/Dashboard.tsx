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
import { Ionicons, Feather } from "@expo/vector-icons";
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
  Stop
} from "react-native-svg";
import AdminLayout from "@/components/admin-layout";

// API Services
import { fetchDashboardStats } from "@/services/dashboardApi";
import { fetchOrders } from "@/services/orderApi";
import { fetchSellers, fetchSellerAnalyticsSummary } from "@/services/sellerApi";
import { fetchProductStats } from "@/services/productApi";
import { fetchCustomers, fetchCustomerStats } from "@/services/customerApi";
import { getApiErrorMessage } from "@/lib/api/client";

// Palette
const C = {
  bg:            "#F8FAFC",
  surface:       "#FFFFFF",
  primary:       "#e8731a", // Orange
  primaryLight:  "#fff0e6",
  primaryDark:   "#c2410c",
  navy:          "#1e293b",
  text:          "#0f172a",
  sub:           "#64748b",
  border:        "#e2e8f0",
  active:        "#10b981", // Green
  activeBg:      "#dcfce7",
  inactive:      "#ef4444", // Red
  inactiveBg:    "#fee2e2",
  processing:    "#0ea5e9", // Blue
  processingBg:  "#e0f2fe",
  warning:       "#f59e0b", // Yellow
  warningBg:     "#fef3c7",
  purple:        "#8b5cf6", // Purple
  purpleBg:      "#f3e8ff",
  violet:        "#6366f1", // Violet
  violetBg:      "#e0e7ff",
  grey:          "#64748b",
  greyBg:        "#f1f5f9",
};

export default function DashboardScreen() {
  const router = useRouter();
  const { width: screenW } = useWindowDimensions();
  const isLargeScreen = screenW >= 1024;
  const isTablet = screenW >= 768 && screenW < 1024;
  const isMobile = screenW < 768;

  // Active Tab
  const [activeTab, setActiveTab] = useState<"overview" | "sales" | "inventory" | "users">("overview");

  // API Data States
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [sellerStats, setSellerStats] = useState<any>(null);
  const [productStats, setProductStats] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerStats, setCustomerStats] = useState<any>(null);
  const [sellers, setSellers] = useState<any[]>([]);
  
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
  const [notifications, setNotifications] = useState([
    { id: 1, type: "order", message: "New Order FNT2026053001 received (₹1,084.00)", read: false, time: "5 mins ago" },
    { id: 2, type: "seller", message: "Seller 'Suvadip Ghosh' updated business profile", read: false, time: "25 mins ago" },
    { id: 3, type: "stock", message: "Critical Alert: Loafers for Men is Out of Stock!", read: true, time: "1 hr ago" },
    { id: 4, type: "payment", message: "Stripe payment failed for Customer #204", read: false, time: "2 hrs ago" },
    { id: 5, type: "customer", message: "New Customer 'Aruna bharati' registered", read: false, time: "4 hrs ago" },
  ]);

  // Section 15: Coupon Creator Modal
  const [couponModalVisible, setCouponModalVisible] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState("");

  // Load Data from APIs
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, ordersRes, sellerRes, productRes, custRes, custStatsRes, sellersListRes] = await Promise.allSettled([
        fetchDashboardStats(),
        fetchOrders({ page: 0, size: 20 }),
        fetchSellerAnalyticsSummary(),
        fetchProductStats(),
        fetchCustomers("", 0, 20),
        fetchCustomerStats(),
        fetchSellers({ page: 0, size: 20 }),
      ]);

      if (statsRes.status === "fulfilled") setStats(statsRes.value);
      if (ordersRes.status === "fulfilled") setOrders(ordersRes.value.items || []);
      if (sellerRes.status === "fulfilled") setSellerStats(sellerRes.value);
      if (productRes.status === "fulfilled") setProductStats(productRes.value);
      if (custRes.status === "fulfilled") setCustomers(custRes.value.items || []);
      if (custStatsRes.status === "fulfilled") setCustomerStats(custStatsRes.value);
      if (sellersListRes.status === "fulfilled") setSellers(sellersListRes.value.items || []);
    } catch (err) {
      console.error("Dashboard enhancement fetch error:", err);
      setError(getApiErrorMessage(err, "Failed to load dashboard data. Running in simulated fallback mode."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Format helper
  const rupee = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const count = (n: number) => n.toLocaleString("en-IN");

  // SECTION 1: Top Statistics KPI dataset with growth metrics
  const kpiStats = useMemo(() => {
    return {
      totalRevenue: { value: rupee(stats?.totalRevenue ?? stats?.allTimeRevenue ?? 16696.00), growth: "+12.5%", trend: "up", label: "Total Revenue", icon: "cash-outline", color: C.active },
      todayRevenue: { value: rupee(stats?.todayRevenue ?? 417.00), growth: "+4.2%", trend: "up", label: "Today's Revenue", icon: "wallet-outline", color: C.primary },
      totalOrders: { value: count(stats?.totalOrders ?? stats?.allTimeOrders ?? 57), growth: "+8.3%", trend: "up", label: "Total Orders", icon: "cart-outline", color: C.processing },
      pendingOrders: { value: count(stats?.pendingOrders ?? 0), growth: "0.0%", trend: "flat", label: "Pending Orders", icon: "hourglass-outline", color: C.warning },
      completedOrders: { value: count(stats?.completedOrders ?? 18), growth: "+14.1%", trend: "up", label: "Completed Orders", icon: "checkmark-done-circle-outline", color: C.active },
      cancelledOrders: { value: count(stats?.cancelledOrders ?? 35), growth: "-2.1%", trend: "down", label: "Cancelled Orders", icon: "close-circle-outline", color: C.inactive },
      totalCustomers: { value: count(customerStats?.total ?? 204), growth: "+5.7%", trend: "up", label: "Total Customers", icon: "people-outline", color: "#0ea5e9" },
      totalSellers: { value: count(sellerStats?.total ?? 141), growth: "+3.2%", trend: "up", label: "Total Sellers", icon: "storefront-outline", color: C.purple },
      totalProducts: { value: count(productStats?.total ?? 708), growth: "+1.8%", trend: "up", label: "Total Products", icon: "cube-outline", color: C.violet },
      outOfStock: { value: count(productStats?.outOfStock ?? 0), growth: "0.0%", trend: "flat", label: "Out Of Stock", icon: "alert-circle-outline", color: C.inactive },
      lowStock: { value: count(productStats?.lowStock ?? 3), growth: "-5.0%", trend: "down", label: "Low Stock Products", icon: "warning-outline", color: C.warning },
      totalCategories: { value: count(stats?.totalCategories ?? 48), growth: "+2.0%", trend: "up", label: "Total Categories", icon: "grid-outline", color: "#ec4899" }
    };
  }, [stats, customerStats, sellerStats, productStats]);

  // Unified Dashboard metrics data object
  const d = useMemo(() => {
    return {
      todayRevenue: stats?.todayRevenue ?? 417.00,
      todayOrders: stats?.todayOrders ?? 2,
      weekRevenue: stats?.weekRevenue ?? 4200.00,
      weekOrders: stats?.weekOrders ?? 15,
      monthRevenue: stats?.monthRevenue ?? 16696.00,
      monthOrders: stats?.monthOrders ?? 57,
      allTimeRevenue: stats?.totalRevenue ?? stats?.allTimeRevenue ?? 16696.00,
      allTimeOrders: stats?.totalOrders ?? stats?.allTimeOrders ?? 57,
      pendingOrders: stats?.pendingOrders ?? 0,
      processingCount: stats?.processingCount ?? stats?.processingOrders ?? 2,
      returnedCount: stats?.returnedCount ?? stats?.returnedOrders ?? 1,
      returnedBg: "#fef3c7", // Amber/Yellow
      returned: "#d97706",
      productsCount: productStats?.total ?? 708,
      outOfStock: productStats?.outOfStock ?? 0,
      lowStock: productStats?.lowStock ?? 3,
    };
  }, [stats, productStats]);

  // SECTION 2: Chart Timeframe calculations
  const revenueChartData = useMemo(() => {
    switch (revenueTimeframe) {
      case "daily":
        return {
          labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          revenue: [400, 1200, 900, 1800, 2400, 3100, 2900],
          orders: [2, 5, 3, 6, 8, 11, 9],
          yLabels: ["₹4000", "₹3200", "₹2400", "₹1600", "₹800", "₹0"],
          maxVal: 4000,
        };
      case "weekly":
        return {
          labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
          revenue: [2400, 4800, 9200, 16696],
          orders: [8, 15, 30, 57],
          yLabels: ["₹20000", "₹16000", "₹12000", "₹8000", "₹4000", "₹0"],
          maxVal: 20000,
        };
      case "yearly":
        return {
          labels: ["2023", "2024", "2025", "2026"],
          revenue: [8200, 11500, 14200, 16696],
          orders: [28, 41, 49, 57],
          yLabels: ["₹20000", "₹16000", "₹12000", "₹8000", "₹4000", "₹0"],
          maxVal: 20000,
        };
      case "monthly":
      default:
        return {
          labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
          revenue: [800, 1400, 2600, 4200, 5800, 7100, 8900, 10400, 11500, 12900, 14800, 16696],
          orders: [3, 6, 8, 12, 18, 22, 29, 34, 38, 45, 50, 57],
          yLabels: ["₹20000", "₹16000", "₹12000", "₹8000", "₹4000", "₹0"],
          maxVal: 20000,
        };
    }
  }, [revenueTimeframe]);

  // SECTION 7: Top Selling Products dataset
  const topProductsRaw = useMemo(() => {
    return [
      { id: "P001", name: "Latest Modern Design Casual Loafers for Men & Boys | Slip-On Daily Wear Shoes | Flexible & Comfortable", sales: 84, revenue: 91056.00, stock: "In Stock", stockCount: 120, image: "👟" },
      { id: "P002", name: "Men's Mustard Yellow Quick-Dry Performance T-Shirt | Men's Quick Dry Sports T-Shirt", sales: 59, revenue: 49206.00, stock: "Low Stock", stockCount: 8, image: "👕" },
      { id: "P003", name: "Hand-Painted Saree with Lord Buddha Motif – Yellow, Black & White Color Block Design with Gold Border", sales: 51, revenue: 100980.00, stock: "In Stock", stockCount: 45, image: "👗" },
      { id: "P004", name: "Elegant Maroon Bandhani Printed Saree with Blouse Piece", sales: 49, revenue: 36652.00, stock: "In Stock", stockCount: 62, image: "👘" },
      { id: "P005", name: "Women's Pink Floral Printed Kurta with Palazzo Set", sales: 44, revenue: 40700.00, stock: "Out Of Stock", stockCount: 0, image: "👚" },
      { id: "P006", name: "Leather Formal Oxford Shoes for Office & Formal Events", sales: 38, revenue: 75240.00, stock: "In Stock", stockCount: 85, image: "👞" },
      { id: "P007", name: "Premium Soft Cotton Bedsheet with Pillow Covers (King Size)", sales: 30, revenue: 29970.00, stock: "Low Stock", stockCount: 5, image: "🛏" },
      { id: "P008", name: "Modern Nordic Design Table Lamp for Living Room & Bedroom", sales: 25, revenue: 49750.00, stock: "In Stock", stockCount: 38, image: "💡" },
      { id: "P009", name: "Waterproof Bluetooth Sports Wireless Earbuds with Mic", sales: 20, revenue: 39800.00, stock: "In Stock", stockCount: 150, image: "🎧" },
      { id: "P010", name: "Genuine Leather Slim Wallet with RFID Blocking Layer", sales: 15, revenue: 14925.00, stock: "In Stock", stockCount: 220, image: "👛" }
    ];
  }, []);

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
    if (sellers.length > 0) {
      return sellers.map((s, idx) => ({
        id: s.id,
        name: s.fullName || "Seller Name",
        business: s.businessName || "Business Name",
        orders: 57 - idx * 4,
        revenue: 16696.00 - idx * 1200,
        rating: (5.0 - idx * 0.1).toFixed(1),
        status: s.status || "Active",
      }));
    }
    return [
      { id: 1, name: "Pickcell Pickcell", business: "PICKCELL", orders: 84, revenue: 91056.00, rating: "4.9", status: "Active" },
      { id: 2, name: "Suvadip Ghosh", business: "Suvayushna Enterprise", orders: 59, revenue: 49206.00, rating: "4.8", status: "Active" },
      { id: 3, name: "Hitesh Jethani", business: "HITESH BANGALES", orders: 51, revenue: 100980.00, rating: "4.7", status: "Active" },
      { id: 4, name: "The Legacy Closet India", business: "MATHA THERESA ENTERPRISES", orders: 49, revenue: 36652.00, rating: "4.6", status: "Active" },
      { id: 5, name: "THE WUGO", business: "SATYA SALES CORPORATION", orders: 44, revenue: 40700.00, rating: "4.5", status: "Active" },
      { id: 6, name: "Manish Bagad", business: "Tajoo", orders: 38, revenue: 75240.00, rating: "4.4", status: "Active" },
      { id: 7, name: "Domnic Rathnam", business: "Dstudio", orders: 30, revenue: 29970.00, rating: "4.3", status: "Active" },
      { id: 8, name: "Krishnappa Mohan", business: "Padmashree Creations", orders: 25, revenue: 49750.00, rating: "4.2", status: "Active" },
      { id: 9, name: "Priyadarsini Mathiazhagan", business: "For She - Avalukaaga", orders: 20, revenue: 39800.00, rating: "4.1", status: "Active" },
      { id: 10, name: "Isha Fashion Nandhini Ram", business: "Isha Fashions", orders: 15, revenue: 14925.00, rating: "4.0", status: "Active" }
    ];
  }, [sellers]);

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

  // SECTION 9: Recent 10 Orders with status modification capabilities
  const [recentOrders, setRecentOrders] = useState([
    { id: "FNT20260529463", customer: "Sri Raj Dodda", amount: 417.00, status: "Processing", payment: "Online", date: "29 May 2026" },
    { id: "FNT20260527814", customer: "Rayapati Raveendra Nadh", amount: 634.00, status: "Completed", payment: "Online", date: "27 May 2026" },
    { id: "FNT20260526387", customer: "Aruna bharati kumari", amount: 364.00, status: "Completed", payment: "COD", date: "26 May 2026" },
    { id: "FNT20260518604", customer: "Sri Raj Dodda", amount: 1342.00, status: "Completed", payment: "Online", date: "18 May 2026" },
    { id: "FNT202605154408", customer: "Yaparu Sriman Srivathsa", amount: 689.00, status: "Cancelled", payment: "COD", date: "15 May 2026" },
    { id: "FNT20260512999", customer: "Rohan Sharma", amount: 980.00, status: "Shipped", payment: "Online", date: "12 May 2026" },
    { id: "FNT20260510888", customer: "Megha Gupta", amount: 1450.00, status: "Delivered", payment: "Online", date: "10 May 2026" },
    { id: "FNT20260508777", customer: "Anil Kapoor", amount: 2200.00, status: "Returned", payment: "COD", date: "08 May 2026" },
    { id: "FNT20260505666", customer: "Vikram Malhotra", amount: 310.00, status: "Completed", payment: "Online", date: "05 May 2026" },
    { id: "FNT20260503555", customer: "Sneha Nair", amount: 1180.00, status: "Processing", payment: "Online", date: "03 May 2026" }
  ]);

  const updateOrderStatus = (orderId: string, newStatus: string) => {
    setRecentOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  // SECTION 10: Recent 10 Customers
  const recentCustomersList = useMemo(() => {
    if (customers.length > 0) {
      return customers.slice(0, 10).map((c, idx) => ({
        id: c.id,
        name: c.name || "Customer Name",
        email: c.email || "customer@email.com",
        date: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "29 May 2026",
        status: "Active"
      }));
    }
    return [
      { id: 1, name: "Sri Raj Dodda", email: "sri.raj@gmail.com", date: "29 May 2026", status: "Active" },
      { id: 2, name: "Rayapati Raveendra Nadh", email: "raveendra.nadh@gmail.com", date: "27 May 2026", status: "Active" },
      { id: 3, name: "Aruna bharati kumari", email: "aruna.bharati@gmail.com", date: "26 May 2026", status: "Active" },
      { id: 4, name: "Yaparu Sriman Srivathsa", email: "y.sriman@gmail.com", date: "15 May 2026", status: "Active" },
      { id: 5, name: "Rohan Sharma", email: "rohan.sharma@gmail.com", date: "12 May 2026", status: "Active" },
      { id: 6, name: "Megha Gupta", email: "megha.gupta@gmail.com", date: "10 May 2026", status: "Active" },
      { id: 7, name: "Anil Kapoor", email: "anil.kapoor@gmail.com", date: "08 May 2026", status: "Active" },
      { id: 8, name: "Vikram Malhotra", email: "vikram.m@gmail.com", date: "05 May 2026", status: "Active" },
      { id: 9, name: "Sneha Nair", email: "sneha.nair@gmail.com", date: "03 May 2026", status: "Active" },
      { id: 10, name: "Kabir Dev", email: "kabir.dev@gmail.com", date: "01 May 2026", status: "Active" }
    ];
  }, [customers]);

  // SECTION 11: Inventory Alerts (Alert severity, local restock action triggers)
  const [inventoryAlerts, setInventoryAlerts] = useState([
    { id: 1, name: "Women's Pink Floral Printed Kurta", type: "Out Of Stock", qty: 0, severity: "High", badgeColor: C.inactive, bg: C.inactiveBg },
    { id: 2, name: "Men's Mustard Yellow Quick-Dry Performance T-Shirt", type: "Low Stock", qty: 8, severity: "Medium", badgeColor: C.warning, bg: C.warningBg },
    { id: 3, name: "Premium Soft Cotton Bedsheet (King Size)", type: "Low Stock", qty: 5, severity: "Medium", badgeColor: C.warning, bg: C.warningBg },
    { id: 4, name: "Hand-Painted Saree with Lord Buddha Motif", type: "Restock Required", qty: 45, severity: "Low", badgeColor: C.primary, bg: C.primaryLight }
  ]);

  const restockProduct = (id: number) => {
    setInventoryAlerts(prev => prev.map(item => item.id === id ? { ...item, qty: item.qty + 50, type: "Restock Scheduled", severity: "Low", badgeColor: C.active, bg: C.activeBg } : item));
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

  // Pie chart calculation
  const PieChart = ({ values, colors }: { values: number[]; colors: string[] }) => {
    const total = values.reduce((a, b) => a + b, 0);
    const R = 45;
    const C_Circum = 2 * Math.PI * R;
    let accumulated = 0;

    return (
      <Svg width={140} height={140} viewBox="0 0 100 100">
        <G transform="rotate(-90 50 50)">
          {values.map((v, idx) => {
            const length = (v / total) * C_Circum;
            const offset = C_Circum - length + accumulated;
            accumulated -= length;
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
                strokeDashoffset={offset}
              />
            );
          })}
        </G>
      </Svg>
    );
  };

  return (
    <AdminLayout>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>

          {/* HEADER ROW */}
          <View style={styles.headerCard}>
            <View>
              <Text style={styles.headerTitle}>Flint & Thread Dashboard</Text>
              <Text style={styles.headerSubtext}>SaaS Enterprise Administrative Overview</Text>
            </View>
            <View style={styles.tabButtons}>
              {[
                { key: "overview", label: "Overview", icon: "grid-outline" },
                { key: "sales", label: "Sales & Payments", icon: "bar-chart-outline" },
                { key: "inventory", label: "Catalog & Stock", icon: "cube-outline" },
                { key: "users", label: "Users & Sellers", icon: "people-outline" }
              ].map(tab => (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key as any)}
                  style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
                >
                  <Ionicons name={tab.icon as any} size={14} color={activeTab === tab.key ? "#FFF" : C.sub} />
                  <Text style={[styles.tabButtonText, activeTab === tab.key && styles.tabButtonTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <View style={styles.tabSection}>

              {/* SECTION 1: 12 TOP STATISTICS CARDS */}
              <View style={styles.statsCardGrid}>
                {Object.keys(kpiStats).map((key) => {
                  const card = kpiStats[key as keyof typeof kpiStats];
                  const hasKpiError = kpiErrors[key];
                  const hasKpiLoading = kpiLoading[key];

                  return (
                    <View key={key} style={styles.kpiCard}>
                      {hasKpiLoading || loading ? (
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
                        <View style={styles.kpiCardInner}>
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
                                <Ionicons name={card.icon} size={15} color={card.color} />
                              </View>
                            </TouchableOpacity>
                          </View>
                          <Text style={styles.kpiCardValue}>{card.value}</Text>
                          <View style={styles.kpiFooter}>
                            <Text style={[styles.kpiFooterTrend, { color: card.trend === "down" ? C.inactive : C.active }]}>
                              {card.trend === "up" ? "▲ " : card.trend === "down" ? "▼ " : "● "}
                              {card.growth}
                            </Text>
                            <Text style={styles.kpiFooterSub}>vs last month</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              {/* QUICK ACTIONS & NOTIFICATIONS PANEL */}
              <View style={styles.rowLayout}>
                
                {/* SECTION 15: QUICK ACTIONS */}
                <View style={[styles.cardCol, { flex: 1.2 }]}>
                  <Text style={styles.cardColTitle}>⚡ Quick Actions Menu</Text>
                  <View style={styles.quickActionsGrid}>
                    {[
                      { label: "Add Product", icon: "cube-outline", color: C.violet, action: () => router.push("/productApproval" as any) },
                      { label: "Add Category", icon: "grid-outline", color: C.primary, action: () => router.push("/categoryRequests" as any) },
                      { label: "Add Seller", icon: "storefront-outline", color: C.active, action: () => router.push("/approveseller" as any) },
                      { label: "Create Coupon", icon: "pricetag-outline", color: C.processing, action: () => setCouponModalVisible(true) },
                      { label: "View Orders", icon: "receipt-outline", color: C.purple, action: () => router.push("/orders" as any) },
                      { label: "Manage Inventory", icon: "stats-chart-outline", color: C.warning, action: () => setActiveTab("inventory") }
                    ].map((act, idx) => (
                      <TouchableOpacity key={idx} onPress={act.action} style={styles.quickActionItem} activeOpacity={0.8}>
                        <View style={[styles.quickActionIconCircle, { backgroundColor: act.color + "15" }]}>
                          <Ionicons name={act.icon as any} size={18} color={act.color} />
                        </View>
                        <Text style={styles.quickActionTextLabel}>{act.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* SECTION 14: LIVE NOTIFICATIONS PANEL */}
                <View style={[styles.cardCol, { flex: 1.5 }]}>
                  <View style={styles.cardTitleBar}>
                    <Text style={styles.cardColTitle}>🔔 Activity Notifications</Text>
                    {notifications.filter(n => !n.read).length > 0 && (
                      <View style={styles.notifBadgeCircle}>
                        <Text style={styles.notifBadgeCircleText}>
                          {notifications.filter(n => !n.read).length}
                        </Text>
                      </View>
                    )}
                  </View>
                  <ScrollView style={styles.notifScroll} nestedScrollEnabled>
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
                  <Text style={styles.cardColTitle}>📈 Live Website Traffic</Text>
                  <View style={styles.liveActivityList}>
                    {[
                      { label: "Currently Online", val: "14", isOnline: true },
                      { label: "Visitors Today", val: "1,204", isOnline: false },
                      { label: "Visitors This Week", val: "8,924", isOnline: false },
                      { label: "Visitors This Month", val: "32,940", isOnline: false }
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
                  <Text style={styles.cardColTitle}>📊 Store Performance Summary</Text>
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

                {/* SECTION 16: Coupon Overview */}
                <View style={[styles.cardCol, { flex: 1 }]}>
                  <Text style={styles.cardColTitle}>🏷️ Promotion & Coupon Tracker</Text>
                  <View style={styles.liveActivityList}>
                    {[
                      { label: "Active Coupon Codes", val: "6 codes", color: C.active },
                      { label: "Expired Coupons", val: "14 codes", color: C.sub },
                      { label: "Total Coupon Redemptions", val: "189 uses", color: C.primary },
                      { label: "Total Coupon Discount Given", val: rupee(3420), color: C.inactive }
                    ].map((item, idx) => (
                      <View key={idx} style={styles.liveActivityRow}>
                        <Text style={styles.liveActivityLabel}>{item.label}</Text>
                        <Text style={[styles.liveActivityValue, { color: item.color }]}>{item.val}</Text>
                      </View>
                    ))}
                  </View>
                </View>

              </View>

            </View>
          )}

          {/* TAB 2: SALES & ORDERS */}
          {activeTab === "sales" && (
            <View style={styles.tabSection}>

              {/* SECTION 2: REVENUE ANALYTICS */}
              <View style={styles.cardCol}>
                <View style={styles.revenueHeaderRow}>
                  <View>
                    <Text style={styles.cardColTitle}>Revenue & Orders Trend Analysis</Text>
                    <Text style={styles.revenueSub}>Date range: {startDate} to {endDate}</Text>
                  </View>

                  <View style={styles.revenueHeaderActions}>
                    {/* Date Filters Inputs */}
                    <View style={styles.dateFilterContainer}>
                      <TextInput style={styles.dateInputText} value={startDate} onChangeText={setStartDate} placeholder="Start Date" />
                      <Text style={styles.dateDivider}>to</Text>
                      <TextInput style={styles.dateInputText} value={endDate} onChangeText={setEndDate} placeholder="End Date" />
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
                <View style={styles.chartContainer}>
                  <Svg viewBox="0 0 520 200" width="100%" height={200}>
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
                          <Line x1={55} y1={y} x2={500} y2={y} stroke="#E2E8F0" strokeWidth={0.8} strokeDasharray="3 3" />
                          <SvgText x={45} y={y + 3} textAnchor="end" fontSize={9} fill={C.sub}>
                            {lbl}
                          </SvgText>
                        </G>
                      );
                    })}

                    {/* Paths rendering */}
                    {(() => {
                      const stepX = 435 / (revenueChartData.labels.length - 1 || 1);
                      
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
                        </G>
                      );
                    })()}

                    {/* X Axis Labels */}
                    {revenueChartData.labels.map((lbl, idx) => {
                      const stepX = 435 / (revenueChartData.labels.length - 1 || 1);
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
                  <Text style={styles.cardColTitle}>📦 Orders Distribution & Statuses</Text>
                  
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
                      <DonutChart data={[35, 18, 3, 2, 1]} total={59} colors={[C.inactive, C.active, C.primary, C.purple, C.processing]} />
                      <Text style={styles.chartSubtitleLabel}>Order Ratios</Text>
                    </View>
                    <View style={styles.doubleChartBox}>
                      {/* Responsive Vertical Bar Chart */}
                      <Svg width={140} height={110} viewBox="0 0 100 80">
                        {[15, 30, 45, 60, 50, 75].map((val, idx) => {
                          const barH = (val / 80) * 60;
                          return (
                            <Rect
                              key={idx}
                              x={10 + idx * 14}
                              y={70 - barH}
                              width={8}
                              height={barH}
                              fill={idx % 2 === 0 ? C.primary : C.processing}
                              rx={2}
                            />
                          );
                        })}
                      </Svg>
                      <Text style={styles.chartSubtitleLabel}>Orders Volume</Text>
                    </View>
                  </View>
                </View>

                {/* SECTION 12: PAYMENT OVERVIEW */}
                <View style={[styles.cardCol, { flex: 1.2 }]}>
                  <Text style={styles.cardColTitle}>💳 Payments & Channels</Text>
                  
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
                    <PieChart values={[39, 18]} colors={[C.active, C.primary]} />
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
                  <Text style={styles.cardColTitle}>🔄 Refunds & Returns Logs</Text>
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
          )}

          {/* TAB 3: CATALOG & INVENTORY */}
          {activeTab === "inventory" && (
            <View style={styles.tabSection}>

              {/* SECTION 6: PRODUCT OVERVIEW & INVENTORY ALERTS */}
              <View style={styles.rowLayout}>
                
                {/* SECTION 6: Product Overview Counts */}
                <View style={[styles.cardCol, { flex: 1.5 }]}>
                  <Text style={styles.cardColTitle}>📦 Catalog & Products Metrics</Text>
                  <View style={styles.ordersChecklistGrid}>
                    {[
                      { label: "Total Products", count: d.productsCount, bg: C.violetBg, color: C.violet },
                      { label: "Published Items", count: 685, bg: C.activeBg, color: C.active },
                      { label: "Draft Products", count: 23, bg: C.greyBg, color: C.grey },
                      { label: "Out of Stock", count: d.outOfStock, bg: C.inactiveBg, color: C.inactive },
                      { label: "Low Stock Items", count: d.lowStock, bg: C.warningBg, color: C.warning },
                      { label: "Hidden Catalog", count: 0, bg: C.primaryLight, color: C.primary }
                    ].map((item, idx) => (
                      <View key={idx} style={[styles.orderCheckCard, { borderColor: item.color, backgroundColor: item.bg }]}>
                        <Text style={styles.orderCheckLabel}>{item.label}</Text>
                        <Text style={[styles.orderCheckCount, { color: item.color }]}>{item.count} items</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* SECTION 11: CRITICAL INVENTORY ALERTS */}
                <View style={[styles.cardCol, { flex: 2 }]}>
                  <Text style={styles.cardColTitle}>⚠️ Critical Stock alerts & Restock Triggers</Text>
                  <View style={styles.tableWrapper}>
                    <View style={[styles.tableHdrRow, { backgroundColor: C.greyBg }]}>
                      <Text style={[styles.tableHdrCell, { flex: 2 }]}>Product</Text>
                      <Text style={[styles.tableHdrCell, { flex: 1.2, textAlign: "center" }]}>Status</Text>
                      <Text style={[styles.tableHdrCell, { flex: 1, textAlign: "center" }]}>Quantity</Text>
                      <Text style={[styles.tableHdrCell, { flex: 1.2, textAlign: "center" }]}>Severity</Text>
                      <Text style={[styles.tableHdrCell, { flex: 1.2, textAlign: "center" }]}>Action</Text>
                    </View>

                    {inventoryAlerts.map(item => (
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
                  <Text style={styles.sectionTitle}>🏆 Top 10 Selling Products List</Text>
                  
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

                    {paginatedProducts.map((p, idx) => (
                      <View key={p.id} style={styles.tableRowData}>
                        <View style={{ width: 50, alignItems: "center" }}>
                          <Text style={{ fontSize: 18 }}>{p.image}</Text>
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
                    {filteredProducts.slice(0, mobileProdCount).map(p => (
                      <View key={p.id} style={styles.mobileProductCard}>
                        <View style={styles.mobileProductCardHeader}>
                          <Text style={{ fontSize: 24 }}>{p.image}</Text>
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
          )}

          {/* TAB 4: USERS & PARTNERS */}
          {activeTab === "users" && (
            <View style={styles.tabSection}>

              {/* SECTION 4 & SECTION 5: CUSTOMER & SELLER OVERVIEWS */}
              <View style={styles.rowLayout}>

                {/* SECTION 4: Customer Analytics Card */}
                <View style={[styles.cardCol, { flex: 1.2 }]}>
                  <Text style={styles.cardColTitle}>👥 Customer Base Analytics</Text>
                  <View style={styles.paymentOverviewList}>
                    {[
                      { label: "Total Registered Customers", count: customerStats?.total ?? 204 },
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
                  <Text style={styles.cardColTitle}>🏪 Seller Network Summary</Text>
                  <View style={styles.paymentOverviewList}>
                    {[
                      { label: "Total Sellers Enrolled", count: sellerStats?.total ?? 141 },
                      { label: "Active Sellers (With Products)", count: sellerStats?.active ?? 71 },
                      { label: "Inactive Sellers (No Products)", count: 70 },
                      { label: "Pending Verification Sellers", count: sellerStats?.pending ?? 4 },
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
                  <Text style={styles.cardColTitle}>🆕 Newly Registered Customers (Last 10)</Text>
                  <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled>
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
                  <Text style={styles.sectionTitle}>⭐ Top Sellers (by Revenue)</Text>

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
                <Text style={styles.sectionTitle}>📦 Recent Orders Logs (Last 10)</Text>
                <View style={styles.tableWrapper}>
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
                        <Text style={[styles.tableCellText, { flex: 1.5, fontWeight: "700" }]} numberOfLines={1}>
                          {o.id}
                        </Text>
                        <Text style={[styles.tableCellText, { flex: 1.8 }]} numberOfLines={1}>
                          {o.customer}
                        </Text>
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
              </View>

            </View>
          )}

          {/* FOOTER */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              2026 © Flintnthread India Pvt. Ltd. Crafted with enterprise-grade synchronization by{" "}
              <Text style={styles.footerBoldText}>Flintnthread India Pvt. Ltd.</Text>
            </Text>
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

    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  container: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 1600,
    gap: 20,
  },

  // Header styles
  headerCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: C.text,
  },
  headerSubtext: {
    fontSize: 12,
    color: C.sub,
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
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: C.primary,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: C.sub,
  },
  tabButtonTextActive: {
    color: "#FFF",
  },

  // Tab Section Wrapper
  tabSection: {
    gap: 20,
  },

  // KPI Statistics Cards
  statsCardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  kpiCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.01,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  kpiCardInner: {
    gap: 4,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiCardValue: {
    fontSize: 22,
    fontWeight: "800",
    color: C.text,
  },
  kpiFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  kpiFooterTrend: {
    fontSize: 11,
    fontWeight: "700",
  },
  kpiFooterSub: {
    fontSize: 10,
    color: C.sub,
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
    flex: 1,
    minWidth: 100,
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    cursor: "pointer",
  },
  quickActionIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionTextLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: C.text,
    textAlign: "center",
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
    maxHeight: 220,
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
    alignItems: "center",
    marginTop: 6,
  },

  // Orders distribution checklist
  ordersChecklistGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  orderCheckCard: {
    flex: 1,
    minWidth: 110,
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
