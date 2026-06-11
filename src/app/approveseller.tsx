import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  useWindowDimensions,
  Alert,
  Modal,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import AdminLayout from "@/components/admin-layout";
import { router, useLocalSearchParams } from "expo-router";
import { useAsyncLoad } from "@/hooks/useAsyncLoad";
import { fetchSellers, blockSeller, unblockSeller } from "@/services/sellerApi";
import { mapSellerToApprovedRow } from "@/lib/mappers";
import { getApiErrorMessage } from "@/lib/api/client";

// --- MOCK DATA TYPE ---
type Seller = {
  id: number;
  name: string;
  email: string;
  avatar: string;
  businessName: string;
  businessType: string;
  products: number;
  walletBalance: number;
  joinDate: string;
  revenue: number;
  state: string;
  city: string;
  status: "Active" | "Blocked";
};

type PendingSeller = {
  id: number;
  name: string;
  email: string;
  mobile?: string;
  businessName?: string;
  businessType?: string;
  submittedOn?: string;
  state?: string;
  city?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  holderName?: string;
};

const INITIAL_PENDING_SELLERS: PendingSeller[] = [];

// --- THE 10 EXACT SELLERS FROM SCREENSHOTS ---
const EXACT_SELLERS: Seller[] = [
  {
    id: 1,
    name: "Khaiser Mohammed",
    email: "mkhaiser0786@gmail.com",
    avatar: "https://randomuser.me/api/portraits/men/1.jpg",
    businessName: "ZOYA ALL BAGS CENTER",
    businessType: "Sole Proprietorship",
    products: 2,
    walletBalance: 0,
    joinDate: "May 29, 2026",
    revenue: 0,
    state: "Telangana",
    city: "Sangareddy",
    status: "Active",
  },
  {
    id: 2,
    name: "Gone Mahender",
    email: "saineeshopingmall@gmail.com",
    avatar: "https://randomuser.me/api/portraits/men/2.jpg",
    businessName: "SAINEE SHOPPING MALL",
    businessType: "Sole Proprietorship",
    products: 1,
    walletBalance: 0,
    joinDate: "May 14, 2026",
    revenue: 0,
    state: "Telangana",
    city: "Hyderabad",
    status: "Active",
  },
  {
    id: 3,
    name: "Malathi Devulapalli",
    email: "9032893883malathi@gmail.com",
    avatar: "https://randomuser.me/api/portraits/women/3.jpg",
    businessName: "PRAHARSHI CREATIONS",
    businessType: "Sole Proprietorship",
    products: 0,
    walletBalance: 0,
    joinDate: "May 11, 2026",
    revenue: 0,
    state: "Andhra Pradesh",
    city: "Vijayawada",
    status: "Active",
  },
  {
    id: 4,
    name: "Panwar Chair Compay",
    email: "myidea702@gmail.com",
    avatar: "https://randomuser.me/api/portraits/men/4.jpg",
    businessName: "ANIL RETAILS",
    businessType: "Sole Proprietorship",
    products: 1,
    walletBalance: 0,
    joinDate: "Apr 28, 2026",
    revenue: 0,
    state: "Karnataka",
    city: "Bangalore",
    status: "Active",
  },
  {
    id: 5,
    name: "Smart Fashions",
    email: "syedlucky129@gmail.com",
    avatar: "https://randomuser.me/api/portraits/women/5.jpg",
    businessName: "SMART FASHIONS",
    businessType: "Sole Proprietorship",
    products: 8,
    walletBalance: 0,
    joinDate: "Apr 22, 2026",
    revenue: 689,
    state: "Maharashtra",
    city: "Mumbai",
    status: "Active",
  },
  {
    id: 6,
    name: "Arhaan Collection",
    email: "arhaancollection1355@gmail.com",
    avatar: "https://randomuser.me/api/portraits/men/6.jpg",
    businessName: "ARHAAN COLLECTIONS",
    businessType: "Sole Proprietorship",
    products: 0,
    walletBalance: 0,
    joinDate: "Apr 22, 2026",
    revenue: 0,
    state: "Gujarat",
    city: "Surat",
    status: "Active",
  },
  {
    id: 7,
    name: "Ahmad Expoters",
    email: "ahmadexpoters900@gmail.com",
    avatar: "https://randomuser.me/api/portraits/men/7.jpg",
    businessName: "AHMAD EXPORTERS",
    businessType: "Sole Proprietorship",
    products: 0,
    walletBalance: 0,
    joinDate: "Apr 21, 2026",
    revenue: 0,
    state: "West Bengal",
    city: "Kolkata",
    status: "Active",
  },
  {
    id: 8,
    name: "Lakshmi Sumana",
    email: "ubstore2025@gmail.com",
    avatar: "https://randomuser.me/api/portraits/women/8.jpg",
    businessName: "UNIVERSAL BAGS",
    businessType: "Partnership",
    products: 12,
    walletBalance: 0,
    joinDate: "Apr 19, 2026",
    revenue: 0,
    state: "Tamil Nadu",
    city: "Chennai",
    status: "Active",
  },
  {
    id: 9,
    name: "Finn Brooks",
    email: "brandshoppe789@gmail.com",
    avatar: "https://randomuser.me/api/portraits/men/9.jpg",
    businessName: "BRAND SHOPPE",
    businessType: "Sole Proprietorship",
    products: 5,
    walletBalance: 0,
    joinDate: "Apr 17, 2026",
    revenue: 3068,
    state: "Telangana",
    city: "Rangareddy",
    status: "Active",
  },
  {
    id: 10,
    name: "Satya Retailer",
    email: "satyaretailer@gmail.com",
    avatar: "https://randomuser.me/api/portraits/men/10.jpg",
    businessName: "Satya Retail Corporation",
    businessType: "Sole Proprietorship",
    products: 9,
    walletBalance: 0,
    joinDate: "Apr 13, 2026",
    revenue: 3927,
    state: "Andhra Pradesh",
    city: "Sri Sathya Sai",
    status: "Active",
  },
];

// --- PROGRAMMATIC MOCK SELLER LIST GENERATOR (TOTAL 71) ---
const generateAllSellers = (): Seller[] => {
  const sellers = [...EXACT_SELLERS];

  const statePool = [
    ...Array(14).fill({ state: "Telangana", city: "Sangareddy" }),
    ...Array(12).fill({ state: "Telangana", city: "Hyderabad" }),
    ...Array(1).fill({ state: "Telangana", city: "Rangareddy" }),
    ...Array(6).fill({ state: "Telangana", city: "Warangal" }),
    ...Array(3).fill({ state: "Maharashtra", city: "Mumbai" }),
    ...Array(3).fill({ state: "Maharashtra", city: "Pune" }),
    ...Array(1).fill({ state: "Andhra Pradesh", city: "Sri Sathya Sai" }),
    ...Array(4).fill({ state: "Andhra Pradesh", city: "Vijayawada" }),
    ...Array(2).fill({ state: "Karnataka", city: "Bangalore" }),
    ...Array(1).fill({ state: "Karnataka", city: "Mysore" }),
    ...Array(2).fill({ state: "Gujarat", city: "Surat" }),
    ...Array(1).fill({ state: "Gujarat", city: "Ahmedabad" }),
    ...Array(2).fill({ state: "West Bengal", city: "Kolkata" }),
    ...Array(2).fill({ state: "Uttar Pradesh", city: "Agra" }),
    ...Array(1).fill({ state: "Uttar Pradesh", city: "Lucknow" }),
    ...Array(2).fill({ state: "Tamil Nadu", city: "Chennai" }),
    ...Array(2).fill({ state: "Rajasthan", city: "Jaipur" }),
    ...Array(1).fill({ state: "Unknown", city: "Unknown" }),
    ...Array(1).fill({ state: "Kerala", city: "Kochi" }),
  ];

  const firstNames = [
    "Rahul", "Amit", "Priya", "Sneha", "Karan", "Anjali", "Vikram", "Deepa",
    "Sanjay", "Neha", "Arjun", "Ritu", "Manish", "Kiran", "Vijay", "Aisha",
    "Rohan", "Pooja", "Rajesh", "Divya", "Suresh", "Swati", "Anil", "Meera",
  ];
  const lastNames = [
    "Sharma", "Verma", "Gupta", "Patel", "Reddy", "Rao", "Nair", "Joshi",
    "Singh", "Kumar", "Mehta", "Sen", "Das", "Roy", "Chawla", "Bose",
    "Pillai", "Naidu", "Deshmukh", "Kulkarni", "Shenoy", "Shetty", "Gowda",
  ];
  const businessWords = [
    "Retails", "Enterprises", "Stores", "Bazaar", "Fashions", "Creations",
    "Bags", "Footwear", "Apparels", "Textiles", "Electronics", "Mart",
  ];
  const businessTypes = ["Sole Proprietorship", "Partnership", "Private Limited"];

  for (let i = 0; i < 61; i++) {
    const id = 11 + i;
    const fName = firstNames[(i + 3) % firstNames.length];
    const lName = lastNames[(i + 7) % lastNames.length];
    const name = `${fName} ${lName}`;
    const email = `${fName.toLowerCase()}.${lName.toLowerCase()}${id}@gmail.com`;
    const busWord = businessWords[i % businessWords.length];
    const businessName = `${fName.toUpperCase()} ${busWord.toUpperCase()}`;
    const businessType = businessTypes[i % businessTypes.length];
    const products = (i * 3 + 1) % 15;
    const walletBalance = i % 5 === 0 ? parseFloat((i * 120.5).toFixed(2)) : 0;
    const revenue = i % 3 === 0 ? parseFloat((i * 850.75).toFixed(2)) : 0;

    const month = ["Jan", "Feb", "Mar", "Apr", "May"][i % 5];
    const day = ((i * 7 + 1) % 28) + 1;
    const joinDate = `${month} ${day}, 2026`;

    const { state, city } = statePool[i];

    sellers.push({
      id,
      name,
      email,
      avatar: `https://randomuser.me/api/portraits/${i % 2 === 0 ? "men" : "women"}/${id}.jpg`,
      businessName,
      businessType,
      products,
      walletBalance,
      joinDate,
      revenue,
      state,
      city,
      status: "Active",
    });
  }

  return sellers;
};

const ALL_MOCK_SELLERS = generateAllSellers();

export default function ApprovedSellersScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const isLargeScreen = windowWidth >= 1024;
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const showPending = tab === "pending";

  const [pendingSellers, setPendingSellers] = useState<PendingSeller[]>(INITIAL_PENDING_SELLERS);
  const [pendingSearchQuery, setPendingSearchQuery] = useState("");
  const [selectedPendingSeller, setSelectedPendingSeller] = useState<PendingSeller | null>(null);
  const [showPendingModal, setShowPendingModal] = useState(false);

  const [selectedSellerId, setSelectedSellerId] = useState<number | null>(null);
  const [adminStatus, setAdminStatus] = useState<"Active" | "Blocked">("Active");
  const [adminKycStatus, setAdminKycStatus] = useState<string>("Pending Verification");
  const [kycRemarks, setKycRemarks] = useState("");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showKycDropdown, setShowKycDropdown] = useState(false);

  const filteredPendingSellers = useMemo(() => {
    const query = pendingSearchQuery.trim().toLowerCase();
    if (!query) return pendingSellers;
    return pendingSellers.filter(
      (s) =>
        (s.name ?? "").toLowerCase().includes(query) ||
        (s.businessName ?? "").toLowerCase().includes(query) ||
        (s.email ?? "").toLowerCase().includes(query) ||
        (s.mobile ?? "").toLowerCase().includes(query)
    );
  }, [pendingSellers, pendingSearchQuery]);

  const handleApprovePending = (pending: PendingSeller) => {
    Alert.alert(
      "Approve Seller",
      `Are you sure you want to approve ${pending.name} (${pending.businessName})?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: () => {
            setPendingSellers(prev => prev.filter(s => s.id !== pending.id));
            const ApprovedSellerDetails: Seller = {
              id: pending.id,
              name: pending.name,
              email: pending.email,
              avatar: `https://randomuser.me/api/portraits/men/${pending.id % 100}.jpg`,
              businessName: pending.businessName ?? "—",
              businessType: pending.businessType ?? "—",
              products: 0,
              walletBalance: 0,
              joinDate: pending.submittedOn ?? "",
              revenue: 0,
              state: pending.state ?? "—",
              city: pending.city ?? "—",
              status: "Active",
            };
            setData((prev) => [ApprovedSellerDetails, ...(prev ?? [])]);
            setShowPendingModal(false);
            Alert.alert("Success", "Seller approved successfully!");
          }
        }
      ]
    );
  };

  const handleRejectPending = (pending: PendingSeller) => {
    Alert.alert(
      "Reject Seller",
      `Are you sure you want to reject ${pending.name} (${pending.businessName})?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: () => {
            setPendingSellers(prev => prev.filter(s => s.id !== pending.id));
            setShowPendingModal(false);
            Alert.alert("Rejected", "Seller request has been rejected.");
          }
        }
      ]
    );
  };


  const { data, loading, error, reload, setData } = useAsyncLoad(
    async () => {
      const page = await fetchSellers({ status: "active", size: 100 });
      return (page.items ?? []).map(mapSellerToApprovedRow);
    },
    []
  );
  const sellers: Seller[] = data ?? [];
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [sortBy, setSortBy] = useState("Name");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter sellers dynamically
  const filteredSellers = useMemo(() => {
    const query = activeSearch.trim().toLowerCase();
    let result = sellers;

    if (query) {
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.email.toLowerCase().includes(query) ||
          s.businessName.toLowerCase().includes(query)
      );
    }

    if (sortBy === "Name") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "Revenue") {
      result = [...result].sort((a, b) => b.revenue - a.revenue);
    } else if (sortBy === "Join Date") {
      result = [...result].sort(
        (a, b) => new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime()
      );
    } else if (sortBy === "Products") {
      result = [...result].sort((a, b) => b.products - a.products);
    }

    return result;
  }, [sellers, activeSearch, sortBy]);

  // Insights counts
  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredSellers.forEach((s) => {
      counts[s.state] = (counts[s.state] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredSellers]);

  const cityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredSellers.forEach((s) => {
      counts[s.city] = (counts[s.city] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredSellers]);

  const totalPages = Math.ceil(filteredSellers.length / itemsPerPage);
  const paginatedSellers = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredSellers.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredSellers, currentPage]);

  const handleApplyFilter = () => {
    setActiveSearch(searchQuery);
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setActiveSearch("");
    setCurrentPage(1);
  };

  const handleBlockSeller = (id: number) => {
    const seller = sellers.find((s) => s.id === id);
    if (!seller) return;
    const actionText = seller.status === "Active" ? "Block" : "Unblock";

    Alert.alert(
      `${actionText} Seller`,
      `Are you sure you want to ${actionText.toLowerCase()} ${seller.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: actionText,
          style: "destructive",
          onPress: async () => {
            try {
              if (seller.status === "Active") {
                await blockSeller(id);
              } else {
                await unblockSeller(id);
              }
              await reload();
            } catch (e) {
              Alert.alert("Error", getApiErrorMessage(e));
            }
          },
        },
      ]
    );
  };

  const handleDeleteSeller = (id: number) => {
    const seller = sellers.find((s) => s.id === id);
    if (!seller) return;

    Alert.alert(
      "Delete Seller",
      `Are you sure you want to delete ${seller.name}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setData((prev) => (prev ?? []).filter((s) => s.id !== id));
          },
        },
      ]
    );
  };

  const handleExportCSV = () => {
    Alert.alert("Export Successful", "All approved sellers have been exported to CSV.");
  };

  // --- SUB-COMPONENTS ---

  return (
    <AdminLayout>
      <ScrollView
        style={styles.scrollBody}
        contentContainerStyle={styles.scrollBodyContent}
        showsVerticalScrollIndicator={false}
      >
            {/* --- PAGE HEADER BANNER CARD --- */}
            <View style={styles.pageHeaderCard}>
              {/* Banner Top Portion (Orange Gradient) */}
              <View style={styles.bannerTop} />

              {/* Banner Details Portion */}
              <View style={[styles.bannerBottom, isLargeScreen ? styles.rowLayout : styles.columnLayout]}>
                <View style={styles.bannerBottomLeft}>
                  {/* Overlapping Badge */}
                  <View style={styles.overlapBadgeContainer}>
                    <View style={styles.overlapBadgeCircle}>
                      <Feather name="check" size={20} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  </View>
                  
                  {/* Title & Breadcrumbs */}
                  <View style={styles.bannerTitleContainer}>
                    <Text style={styles.bannerTitle}>Approved Sellers</Text>
                    <View style={styles.breadcrumbs}>
                      <Feather name="home" size={12} color="#EA580C" style={styles.breadcrumbHomeIcon} />
                      <Text style={styles.breadcrumbActive}>Dashboard</Text>
                      <Feather name="chevron-right" size={10} color="#9CA3AF" style={styles.breadcrumbSeparator} />
                      <Text style={styles.breadcrumbText}>Approved Sellers</Text>
                    </View>
                  </View>
                </View>

                {/* Right: Action button */}
                <TouchableOpacity
                  style={styles.bannerActionBtn}
                  onPress={() => router.push("/approveseller?tab=pending")}
                >
                  <Feather name="clock" size={14} color="#FFFFFF" style={styles.bannerActionIcon} />
                  <Text style={styles.bannerActionBtnText}>Pending Sellers</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* --- DATA VIEW CONTROLS TOOLBAR --- */}
            <View style={[styles.toolbar, isLargeScreen ? styles.rowLayout : styles.columnLayout]}>
              {/* Search Box */}
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#EA580C" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search approved sellers..."
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleApplyFilter}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={handleClearSearch} style={styles.clearSearchBtn}>
                    <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Action Buttons Row */}
              <View style={styles.toolbarActions}>
                <TouchableOpacity style={styles.applyBtn} onPress={handleApplyFilter}>
                  <Text style={styles.applyBtnText}>Apply</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.exportBtn} onPress={handleExportCSV}>
                  <Feather name="download" size={16} color="#FFFFFF" style={styles.btnIcon} />
                  <Text style={styles.exportBtnText}>Export CSV</Text>
                </TouchableOpacity>

                {/* Sort Dropdown */}
                <View style={styles.sortDropdownContainer}>
                  <Text style={styles.sortLabel}>Sort By:</Text>
                  <TouchableOpacity
                    style={styles.sortDropdownButton}
                    onPress={() => setShowSortDropdown(!showSortDropdown)}
                  >
                    <Text style={styles.sortButtonText}>{sortBy}</Text>
                    <Ionicons name="chevron-down" size={14} color="#6B7280" />
                  </TouchableOpacity>
                  {showSortDropdown && (
                    <View style={styles.sortMenu}>
                      {["Name", "Revenue", "Join Date", "Products"].map((opt) => (
                        <TouchableOpacity
                          key={opt}
                          style={styles.sortMenuItem}
                          onPress={() => {
                            setSortBy(opt);
                            setShowSortDropdown(false);
                          }}
                        >
                          <Text style={[styles.sortMenuText, sortBy === opt && styles.sortMenuTextActive]}>
                            {opt}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Grid/List Toggle */}
                <View style={styles.viewToggleGroup}>
                  <Text style={styles.viewLabel}>View:</Text>
                  <TouchableOpacity
                    style={[styles.toggleBtn, viewMode === "grid" && styles.toggleBtnActive]}
                    onPress={() => setViewMode("grid")}
                  >
                    <Ionicons
                      name="grid-outline"
                      size={16}
                      color={viewMode === "grid" ? "#1d324e" : "#6B7280"}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleBtn, viewMode === "list" && styles.toggleBtnActive]}
                    onPress={() => setViewMode("list")}
                  >
                    <Ionicons
                      name="list-outline"
                      size={16}
                      color={viewMode === "list" ? "#1d324e" : "#6B7280"}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* --- INSIGHTS SECTION --- */}
            <View style={styles.insightsCard}>
              <View style={styles.insightsHeader}>
                <Text style={styles.insightsTitle}>Insights</Text>
                <Text style={styles.insightsSubtitle}>Top 10 by count • Filter-aware</Text>
              </View>

              <View style={[styles.insightsContainer, isLargeScreen ? styles.rowLayout : styles.columnLayout]}>
                {/* State-wise table */}
                <View style={styles.insightsColumn}>
                  <Text style={styles.insightsColTitle}>State-wise Approved Sellers</Text>
                  <View style={styles.insightsTableHeader}>
                    <Text style={styles.insightsTh}>State</Text>
                    <Text style={[styles.insightsTh, styles.alignRight]}>Count</Text>
                  </View>
                  {stateCounts.map((item, idx) => (
                    <View key={item.state} style={[styles.insightsTableRow, idx % 2 === 1 && styles.rowAltBg]}>
                      <Text style={styles.insightsTdText}>{item.state}</Text>
                      <Text style={[styles.insightsTdCount, styles.alignRight]}>{item.count}</Text>
                    </View>
                  ))}
                  {stateCounts.length === 0 && (
                    <Text style={styles.emptyInsights}>No dynamic state data</Text>
                  )}
                </View>

                {/* Divider for large screen */}
                {isLargeScreen && <View style={styles.verticalDivider} />}

                {/* City-wise table */}
                <View style={styles.insightsColumn}>
                  <Text style={styles.insightsColTitle}>City-wise Approved Sellers</Text>
                  <View style={styles.insightsTableHeader}>
                    <Text style={styles.insightsTh}>City</Text>
                    <Text style={[styles.insightsTh, styles.alignRight]}>Count</Text>
                  </View>
                  {cityCounts.map((item, idx) => (
                    <View key={item.city} style={[styles.insightsTableRow, idx % 2 === 1 && styles.rowAltBg]}>
                      <Text style={styles.insightsTdText}>{item.city}</Text>
                      <Text style={[styles.insightsTdCount, styles.alignRight]}>{item.count}</Text>
                    </View>
                  ))}
                  {cityCounts.length === 0 && (
                    <Text style={styles.emptyInsights}>No dynamic city data</Text>
                  )}
                </View>
              </View>
            </View>

            {/* --- SELLERS TABLE / CARDS --- */}
            {viewMode === "list" && isLargeScreen ? (
              /* Desktop Table View */
              <View style={styles.tableCard}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableTh, { flex: 2.2 }]}>Seller</Text>
                  <Text style={[styles.tableTh, { flex: 2 }]}>Business Name</Text>
                  <Text style={[styles.tableTh, { flex: 1.8 }]}>Business Type</Text>
                  <Text style={[styles.tableTh, { flex: 0.8, textAlign: "center" }]}>Products</Text>
                  <Text style={[styles.tableTh, { flex: 1.2, textAlign: "right" }]}>Wallet Balance</Text>
                  <Text style={[styles.tableTh, { flex: 1.2, textAlign: "center" }]}>Join Date</Text>
                  <Text style={[styles.tableTh, { flex: 1.2, textAlign: "right" }]}>Revenue</Text>
                  <Text style={[styles.tableTh, { flex: 1.6, textAlign: "center" }]}>Action</Text>
                </View>

                {paginatedSellers.map((seller) => (
                  <View key={seller.id} style={[styles.tableRow, seller.status === "Blocked" && styles.rowBlocked]}>
                    <View style={[styles.tableCell, { flex: 2.2, flexDirection: "row", alignItems: "center" }]}>
                      <Image source={{ uri: seller.avatar }} style={styles.sellerAvatar} />
                      <View style={styles.sellerMeta}>
                        <Text style={styles.sellerName}>{seller.name}</Text>
                        <Text style={styles.sellerEmail} numberOfLines={1}>{seller.email}</Text>
                      </View>
                    </View>
                    <Text style={[styles.tableCellTextBold, { flex: 2 }]}>{seller.businessName}</Text>
                    <Text style={[styles.tableCellText, { flex: 1.8 }]}>{seller.businessType}</Text>
                    <Text style={[styles.tableCellText, { flex: 0.8, textAlign: "center" }]}>{seller.products}</Text>
                    <Text style={[styles.tableCellCurrency, { flex: 1.2, textAlign: "right" }]}>
                      ₹{seller.walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </Text>
                    <Text style={[styles.tableCellText, { flex: 1.2, textAlign: "center" }]}>{seller.joinDate}</Text>
                    <Text style={[styles.tableCellCurrency, { flex: 1.2, textAlign: "right" }]}>
                      ₹{seller.revenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </Text>
                    <View style={[styles.tableCellActions, { flex: 1.6 }]}>
                      <TouchableOpacity
                        style={styles.actionEyeBtn}
                        onPress={() => {
                          setSelectedSellerId(seller.id);
                          setAdminStatus(seller.status);
                        }}
                      >
                        <Ionicons name="eye" size={15} color="#FFFFFF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionMessageBtn}
                        onPress={() => Alert.alert("Message Seller", `Send a message to ${seller.name}`)}
                      >
                        <Ionicons name="chatbubble-ellipses" size={15} color="#FFFFFF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBlockBtn, seller.status === "Blocked" && styles.actionBlockBtnActive]}
                        onPress={() => handleBlockSeller(seller.id)}
                      >
                        <Ionicons
                          name="ban"
                          size={15}
                          color={seller.status === "Blocked" ? "#FFFFFF" : "#EF4444"}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionDeleteBtn}
                        onPress={() => handleDeleteSeller(seller.id)}
                      >
                        <Ionicons name="trash-outline" size={15} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                {paginatedSellers.length === 0 && (
                  <View style={styles.emptyTable}>
                    <Text style={styles.emptyText}>No sellers found matching the query.</Text>
                  </View>
                )}
              </View>
            ) : (
              /* Mobile List / Grid Card View */
              <View style={[styles.gridContainer, isLargeScreen && styles.gridRowContainer]}>
                {paginatedSellers.map((seller) => (
                  <View
                    key={seller.id}
                    style={[
                      styles.gridCard,
                      seller.status === "Blocked" && styles.rowBlocked,
                      isLargeScreen ? styles.gridCardLarge : styles.gridCardMobile,
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <Image source={{ uri: seller.avatar }} style={styles.cardAvatar} />
                      <View style={styles.cardTitleContainer}>
                        <Text style={styles.cardName}>{seller.name}</Text>
                        <Text style={styles.cardEmail} numberOfLines={1}>{seller.email}</Text>
                      </View>
                      <View style={[styles.statusBadge, seller.status === "Blocked" && styles.statusBadgeBlocked]}>
                        <Text style={styles.statusBadgeText}>
                          {seller.status === "Blocked" ? "Blocked" : "Active"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardBody}>
                      <View style={styles.cardRow}>
                        <Text style={styles.cardLabel}>Business Name:</Text>
                        <Text style={styles.cardValBold}>{seller.businessName}</Text>
                      </View>
                      <View style={styles.cardRow}>
                        <Text style={styles.cardLabel}>Business Type:</Text>
                        <Text style={styles.cardVal}>{seller.businessType}</Text>
                      </View>
                      <View style={styles.cardRow}>
                        <Text style={styles.cardLabel}>Products:</Text>
                        <Text style={styles.cardVal}>{seller.products} items</Text>
                      </View>
                      <View style={styles.cardRow}>
                        <Text style={styles.cardLabel}>Join Date:</Text>
                        <Text style={styles.cardVal}>{seller.joinDate}</Text>
                      </View>
                      <View style={styles.cardRow}>
                        <Text style={styles.cardLabel}>Wallet Balance:</Text>
                        <Text style={styles.cardCurrency}>
                          ₹{seller.walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </Text>
                      </View>
                      <View style={styles.cardRow}>
                        <Text style={styles.cardLabel}>Revenue:</Text>
                        <Text style={styles.cardCurrency}>
                          ₹{seller.revenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={[styles.cardActionBtn, styles.actionEyeBtn]}
                        onPress={() => {
                          setSelectedSellerId(seller.id);
                          setAdminStatus(seller.status);
                        }}
                      >
                        <Ionicons name="eye" size={15} color="#FFFFFF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.cardActionBtn, styles.actionMessageBtn]}
                        onPress={() => Alert.alert("Message Seller", `Send a message to ${seller.name}`)}
                      >
                        <Ionicons name="chatbubble-ellipses" size={15} color="#FFFFFF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.cardActionBtn,
                          styles.actionBlockBtn,
                          seller.status === "Blocked" && styles.actionBlockBtnActive,
                        ]}
                        onPress={() => handleBlockSeller(seller.id)}
                      >
                        <Ionicons
                          name="ban"
                          size={15}
                          color={seller.status === "Blocked" ? "#FFFFFF" : "#EF4444"}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.cardActionBtn, styles.actionDeleteBtn]}
                        onPress={() => handleDeleteSeller(seller.id)}
                      >
                        <Ionicons name="trash-outline" size={15} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                {paginatedSellers.length === 0 && (
                  <View style={styles.emptyTable}>
                    <Text style={styles.emptyText}>No sellers found matching the query.</Text>
                  </View>
                )}
              </View>
            )}

            {/* --- PAGINATION FOOTER --- */}
            {filteredSellers.length > 0 && (
              <View style={[styles.pagination, isLargeScreen ? styles.rowLayout : styles.columnLayout]}>
                <Text style={styles.paginationText}>
                  Showing {(currentPage - 1) * itemsPerPage + 1} -{" "}
                  {Math.min(currentPage * itemsPerPage, filteredSellers.length)} of{" "}
                  {filteredSellers.length} sellers
                </Text>

                <View style={styles.pageSelectors}>
                  <TouchableOpacity
                    style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                    disabled={currentPage === 1}
                    onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    <Ionicons name="chevron-back" size={16} color={currentPage === 1 ? "#D1D5DB" : "#374151"} />
                  </TouchableOpacity>

                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const pageNum = idx + 1;
                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      Math.abs(currentPage - pageNum) <= 1
                    ) {
                      return (
                        <TouchableOpacity
                          key={pageNum}
                          style={[styles.pageNumber, currentPage === pageNum && styles.pageNumberActive]}
                          onPress={() => setCurrentPage(pageNum)}
                        >
                          <Text
                            style={[
                              styles.pageNumberText,
                              currentPage === pageNum && styles.pageNumberTextActive,
                            ]}
                          >
                            {pageNum}
                          </Text>
                        </TouchableOpacity>
                      );
                    } else if (
                      (pageNum === 2 && currentPage > 3) ||
                      (pageNum === totalPages - 1 && currentPage < totalPages - 2)
                    ) {
                      return (
                        <Text key={pageNum} style={styles.ellipses}>
                          ...
                        </Text>
                      );
                    }
                    return null;
                  })}

                  <TouchableOpacity
                    style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                    disabled={currentPage === totalPages}
                    onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={currentPage === totalPages ? "#D1D5DB" : "#374151"}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}

        {/* --- COPYRIGHT FOOTER --- */}
        <View style={styles.footerCopyright}>
          <Text style={styles.footerCopyrightText}>
            2026 © Flintnthread India Pvt. Ltd. Crafted by{" "}
            <Feather name="heart" size={12} color="#EF4444" /> Flintnthread India Pvt. Ltd.
          </Text>
        </View>
      </ScrollView>

      {/* --- PENDING DETAILS MODAL --- */}
      {showPendingModal && selectedPendingSeller && (
        <Modal
          visible={showPendingModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPendingModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Pending Seller Verification</Text>
                <TouchableOpacity onPress={() => setShowPendingModal(false)}>
                  <Feather name="x" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {/* Personal Information */}
                <Text style={styles.modalSectionTitle}>Personal & Contact Details</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Full Name:</Text>
                  <Text style={styles.detailValue}>{selectedPendingSeller.name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email Address:</Text>
                  <Text style={styles.detailValue}>{selectedPendingSeller.email}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Mobile Number:</Text>
                  <Text style={styles.detailValue}>{selectedPendingSeller.mobile}</Text>
                </View>

                {/* Business Information */}
                <Text style={styles.modalSectionTitle}>Business Information</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Business Name:</Text>
                  <Text style={styles.detailValue}>{selectedPendingSeller.businessName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Business Type:</Text>
                  <Text style={styles.detailValue}>{selectedPendingSeller.businessType}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Location:</Text>
                  <Text style={styles.detailValue}>
                    {selectedPendingSeller.city}, {selectedPendingSeller.state}
                  </Text>
                </View>

                {/* Bank Information */}
                <Text style={styles.modalSectionTitle}>Bank Account Details</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Bank Name:</Text>
                  <Text style={styles.detailValue}>{selectedPendingSeller.bankName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Account Number:</Text>
                  <Text style={styles.detailValue}>{selectedPendingSeller.accountNumber}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>IFSC Code:</Text>
                  <Text style={styles.detailValue}>{selectedPendingSeller.ifscCode}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Holder Name:</Text>
                  <Text style={styles.detailValue}>{selectedPendingSeller.holderName}</Text>
                </View>
              </ScrollView>

              <View style={styles.modalFooterActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalRejectBtn]}
                  onPress={() => handleRejectPending(selectedPendingSeller)}
                >
                  <Feather name="x-circle" size={14} color="#FFFFFF" style={styles.modalBtnIcon} />
                  <Text style={styles.modalBtnText}>Reject</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalApproveBtn]}
                  onPress={() => handleApprovePending(selectedPendingSeller)}
                >
                  <Feather name="check-circle" size={14} color="#FFFFFF" style={styles.modalBtnIcon} />
                  <Text style={styles.modalBtnText}>Approve</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalCancelBtn]}
                  onPress={() => setShowPendingModal(false)}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </AdminLayout>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  scrollBody: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollBodyContent: {
    padding: 24,
    paddingBottom: 60,
  },
  loadErrorText: {
    fontSize: 14,
    color: "#DC2626",
    marginBottom: 16,
    textAlign: "center",
  },
  rowLayout: {
    flexDirection: "row",
  },
  columnLayout: {
    flexDirection: "column",
  },

  // --- PAGE HEADER BANNER CARD ---
  pageHeaderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    marginBottom: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 2,
  },
  bannerTop: {
    height: 100,
    backgroundColor: "#C2410C", // Bold orange/gold background matching screenshot banner
    // Alternatively, we can use background color / pattern styles here
  },
  bannerBottom: {
    padding: 20,
    paddingTop: 12,
    alignItems: "stretch",
    justifyContent: "space-between",
    position: "relative",
    gap: 16,
  },
  bannerBottomLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  overlapBadgeContainer: {
    width: 64,
    height: 64,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    position: "absolute",
    top: -42, // Overlaps the banner top boundary
    left: 0,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  overlapBadgeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EA580C", // Orange circle
    justifyContent: "center",
    alignItems: "center",
  },
  bannerTitleContainer: {
    marginLeft: 80, // Offset to push text right of the overlapping badge
    justifyContent: "center",
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
  },
  breadcrumbs: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  breadcrumbHomeIcon: {
    marginRight: 4,
  },
  breadcrumbActive: {
    fontSize: 12,
    color: "#EA580C",
    fontWeight: "600",
  },
  breadcrumbSeparator: {
    marginHorizontal: 6,
  },
  breadcrumbText: {
    fontSize: 12,
    color: "#6B7280",
  },
  bannerActionBtn: {
    flexDirection: "row",
    height: 38,
    paddingHorizontal: 16,
    backgroundColor: "#EA580C",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  bannerActionIcon: {
    marginRight: 6,
  },
  bannerActionBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },

  // --- DATA VIEW CONTROLS TOOLBAR ---
  toolbar: {
    width: "100%",
    justifyContent: "space-between",
    alignItems: "stretch",
    marginBottom: 24,
    gap: 16,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderWidth: 1,
    borderColor: "#FDBA74",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    minWidth: 280,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 14,
    color: "#1E293B",
  },
  clearSearchBtn: {
    padding: 4,
  },
  toolbarActions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  applyBtn: {
    height: 38,
    paddingHorizontal: 18,
    backgroundColor: "#1d324e",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  applyBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  exportBtn: {
    flexDirection: "row",
    height: 38,
    paddingHorizontal: 16,
    backgroundColor: "#EA580C",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  btnIcon: {
    marginRight: 6,
  },
  exportBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  
  // Sort Dropdown
  sortDropdownContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    zIndex: 10,
  },
  sortLabel: {
    fontSize: 14,
    color: "#4B5563",
    marginRight: 6,
  },
  sortDropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#FFFFFF",
    minWidth: 110,
    justifyContent: "space-between",
    height: 38,
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1E293B",
    marginRight: 6,
  },
  sortMenu: {
    position: "absolute",
    top: 42,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 6,
    paddingVertical: 4,
    minWidth: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  sortMenuItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  sortMenuText: {
    fontSize: 13,
    color: "#374151",
  },
  sortMenuTextActive: {
    color: "#EA580C",
    fontWeight: "600",
  },
  
  // View Toggle Group
  viewToggleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  viewLabel: {
    fontSize: 14,
    color: "#4B5563",
    marginRight: 2,
  },
  toggleBtn: {
    width: 38,
    height: 38,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  toggleBtnActive: {
    backgroundColor: "#F3F4F6",
    borderColor: "#9CA3AF",
  },

  // --- INSIGHTS CARD ---
  insightsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 2,
  },
  insightsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 12,
    marginBottom: 16,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  insightsSubtitle: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  insightsContainer: {
    gap: 24,
  },
  insightsColumn: {
    flex: 1,
  },
  insightsColTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#EA580C",
    marginBottom: 10,
  },
  insightsTableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 6,
    marginBottom: 6,
  },
  insightsTh: {
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
  },
  insightsTableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  rowAltBg: {
    backgroundColor: "#FAF5FF",
  },
  insightsTdText: {
    flex: 1,
    fontSize: 13,
    color: "#4B5563",
  },
  insightsTdCount: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },
  alignRight: {
    textAlign: "right",
  },
  emptyInsights: {
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 13,
    paddingVertical: 12,
  },
  verticalDivider: {
    width: 1,
    backgroundColor: "#E5E7EB",
    alignSelf: "stretch",
    marginHorizontal: 12,
  },

  // --- SELLERS TABLE ---
  tableCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    marginBottom: 24,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#FFF7ED",
    borderBottomWidth: 1,
    borderBottomColor: "#FED7AA",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tableTh: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  rowBlocked: {
    backgroundColor: "#FEF2F2",
    opacity: 0.9,
  },
  tableCell: {
    justifyContent: "center",
  },
  tableCellText: {
    fontSize: 13,
    color: "#374151",
  },
  tableCellTextBold: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },
  tableCellCurrency: {
    fontSize: 13,
    fontWeight: "600",
    color: "#D97706",
  },
  sellerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  sellerMeta: {
    flex: 1,
    justifyContent: "center",
  },
  sellerName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },
  sellerEmail: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
  },
  tableCellActions: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  actionEyeBtn: {
    width: 28,
    height: 28,
    backgroundColor: "#1d324e",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  actionMessageBtn: {
    width: 28,
    height: 28,
    backgroundColor: "#EA580C",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  actionBlockBtn: {
    width: 28,
    height: 28,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  actionBlockBtnActive: {
    backgroundColor: "#EF4444",
    borderColor: "#EF4444",
  },
  actionDeleteBtn: {
    width: 28,
    height: 28,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTable: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
  },

  // --- GRID / CARDS MODE ---
  gridContainer: {
    flexDirection: "column",
    gap: 16,
    marginBottom: 24,
  },
  gridRowContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  gridCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
  },
  gridCardLarge: {
    width: "48.5%",
  },
  gridCardMobile: {
    width: "100%",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 12,
    marginBottom: 12,
  },
  cardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  cardEmail: {
    fontSize: 11,
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "#DEF7EC",
    borderRadius: 4,
  },
  statusBadgeBlocked: {
    backgroundColor: "#FDE8E8",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#03543F",
  },
  cardBody: {
    gap: 8,
    marginBottom: 14,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  cardVal: {
    fontSize: 12,
    color: "#374151",
  },
  cardValBold: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E293B",
  },
  cardCurrency: {
    fontSize: 12,
    fontWeight: "700",
    color: "#D97706",
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
  },
  cardActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },

  // --- PAGINATION FOOTER ---
  pagination: {
    width: "100%",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  paginationText: {
    fontSize: 13,
    color: "#6B7280",
  },
  pageSelectors: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pageBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  pageBtnDisabled: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  pageNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },
  pageNumberActive: {
    backgroundColor: "#EA580C",
    borderColor: "#EA580C",
  },
  pageNumberText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },
  pageNumberTextActive: {
    color: "#FFFFFF",
  },
  ellipses: {
    fontSize: 14,
    color: "#9CA3AF",
    marginHorizontal: 4,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    width: "100%",
    maxWidth: 600,
    maxHeight: "85%",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    flexDirection: "column",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
  },
  modalBody: {
    padding: 16,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#EA580C",
    marginTop: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 4,
  },
  detailRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
  },
  detailLabel: {
    width: 150,
    fontWeight: "600",
    color: "#4B5563",
    fontSize: 13,
  },
  detailValue: {
    flex: 1,
    color: "#1F2937",
    fontSize: 13,
  },
  modalFooterActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 10,
  },
  modalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  modalApproveBtn: {
    backgroundColor: "#10B981",
  },
  modalRejectBtn: {
    backgroundColor: "#EF4444",
  },
  modalCancelBtn: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  modalBtnIcon: {
    marginRight: 6,
  },
  modalBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13,
  },
  modalCancelBtnText: {
    color: "#4B5563",
    fontWeight: "600",
    fontSize: 13,
  },
  idBadge: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  idBadgeText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 11,
  },
  pendingViewBtn: {
    backgroundColor: "#1F2937",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: "center",
  },
  pendingViewBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 12,
  },
  footerCopyright: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    marginTop: 20,
  },
  footerCopyrightText: {
    color: "#6B7280",
    fontSize: 12,
    textAlign: "center",
  },
  bannerPendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FBBF24",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bannerPendingBadgeText: {
    color: "#1F2937",
    fontWeight: "600",
    fontSize: 12,
    marginLeft: 6,
  },
  detailsContainer: {
    width: "100%",
  },
  detailsHeaderBanner: {
    backgroundColor: "#EA580C",
    borderRadius: 12,
    padding: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 20,
  },
  detailsHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarWrapper: {
    position: "relative",
  },
  detailsAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  statusDotActive: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  detailsMeta: {
    justifyContent: "center",
  },
  detailsTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  detailsMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  detailsSubtext: {
    fontSize: 13,
    color: "#F3F4F6",
  },
  detailsHeaderRight: {
    alignItems: "flex-end",
    gap: 12,
  },
  currentStatusCard: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "flex-end",
  },
  currentStatusVal: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  currentStatusLabel: {
    color: "#F3F4F6",
    fontSize: 10,
    marginTop: 2,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  backBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  kycBar: {
    backgroundColor: "#EA580C",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  kycBarTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  kycNotCompletedBadge: {
    backgroundColor: "#FEE2E2",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  kycNotCompletedText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "700",
  },
  kycGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 20,
  },
  kycGridCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  kycIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF7ED",
    justifyContent: "center",
    alignItems: "center",
  },
  kycGridCardContent: {
    flex: 1,
  },
  kycGridCardLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4B5563",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  kycGridCardValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  kycBadge: {
    alignSelf: "flex-start",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  kycBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  kycGridCircleCount: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
  },
  kycGridCircleCountText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  detailsColumns: {
    gap: 20,
    marginBottom: 20,
  },
  detailsColumnLeft: {
    flex: 2.3,
  },
  detailsColumnRight: {
    flex: 1.2,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  infoCardHeader: {
    backgroundColor: "#1E293B",
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  infoCardTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  infoCardBody: {
    padding: 16,
  },
  infoSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#EA580C",
    marginTop: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
    alignItems: "center",
  },
  infoLabel: {
    width: 140,
    fontWeight: "600",
    color: "#4B5563",
    fontSize: 13,
  },
  infoValue: {
    flex: 1,
    color: "#1F2937",
    fontSize: 13,
    lineHeight: 18,
  },
  b2cBadge: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  b2cBadgeText: {
    color: "#065F46",
    fontSize: 11,
    fontWeight: "700",
  },
  sidebarCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  sidebarCardHeader: {
    backgroundColor: "#FDBA74",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  sidebarCardTitle: {
    color: "#1F2937",
    fontSize: 13,
    fontWeight: "700",
  },
  sidebarCardBody: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  sidebarCardBodyDocs: {
    padding: 24,
    paddingBottom: 40,
  },
  sidebarProfileImg: {
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  docRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  docLabel: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
  },
  docViewBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#78350F",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  docViewBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  docSectionSubTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4B5563",
    marginTop: 32,
    marginBottom: 16,
  },
  docThumbnailRow: {
    flexDirection: "row",
    gap: 8,
  },
  docThumbnail: {
    width: 160,
    height: 160,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  selfieThumbnailRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  selfieThumbnail: {
    width: 62,
    height: 62,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  adminActionsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    marginBottom: 20,
  },
  adminActionsHeader: {
    backgroundColor: "#FDBA74",
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  adminActionsTitle: {
    color: "#1F2937",
    fontSize: 14,
    fontWeight: "700",
  },
  adminActionsBody: {
    padding: 24,
    gap: 20,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  selectDropdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    height: 40,
  },
  selectDropdownText: {
    fontSize: 13,
    color: "#1F2937",
  },
  selectMenu: {
    position: "absolute",
    top: 68,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    zIndex: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectMenuItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  selectMenuText: {
    fontSize: 13,
    color: "#374151",
  },
  formTextInputDisabled: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F9FAFB",
    color: "#9CA3AF",
    height: 40,
    fontSize: 13,
  },
  formCaption: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 4,
  },
  formTextArea: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    fontSize: 13,
    color: "#1F2937",
    textAlignVertical: "top",
    height: 100,
  },
  updateStatusBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#78350F",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  updateStatusBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  backBtnGrey: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4B5563",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  backBtnGreyText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  adminInfoPanel: {
    flex: 1.2,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  adminInfoPanelHeader: {
    backgroundColor: "#1E293B",
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  adminInfoPanelTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  adminInfoPanelBody: {
    padding: 16,
    gap: 14,
  },
  statusInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  statusIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  statusInfoTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 2,
  },
  statusInfoDesc: {
    fontSize: 11,
    color: "#6B7280",
    lineHeight: 15,
  },

});