import React, { useState, useMemo, useEffect, useCallback } from "react";
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
  ActivityIndicator,
  Platform,
  SafeAreaView,
  Linking,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import AdminLayout from "@/components/admin-layout";
import { router, useLocalSearchParams } from "expo-router";
import Pagination from "@/components/Pagination";
import { useAuth } from "@/context/auth-context";
import { useThemeContext } from "@/context/theme-context";
import {
  fetchApprovedSellers,
  fetchApprovedSellerLocationStats,
  blockSeller,
  unblockSeller,
  fetchPendingProfileSellers,
  fetchPendingProfileDetail,
  approveSellerProfile,
  rejectSellerProfile,
} from "@/services/sellerApi";
import { mapPendingProfileRow, mapSellerToApprovedRow } from "@/lib/mappers";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatRupee } from "@/lib/format";
import { resolveMediaUrl } from "@/lib/api/media";

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
  mobile?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  accountHolder?: string;
  branchName?: string;
  sellerUniqueId?: string;
  referralCode?: string;
  gstNumber?: string;
  panNumber?: string;
  country?: string;
  totalOrders?: number;
  profilePicPath?: string;
  liveSelfiePath?: string;
  profilePicUrl?: string;
};


// --- PENDING SELLER TYPES ---
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

const bgColors = ["#F5F3FF", "#ECFDF5", "#EFF6FF", "#FFF7ED", "#FDF2F8"];
const iconColors = ["#8B5CF6", "#10B981", "#3B82F6", "#F97316", "#EC4899"];

export default function ApprovedSellersScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const isLargeScreen = windowWidth >= 1024;
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const showPending = tab === "pending";
  const { token, isLoading: authLoading } = useAuth();
  const { theme, toggleTheme, isDark } = useThemeContext();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [sellers, setSellers] = useState<Seller[]>([]);
  const [locationStats, setLocationStats] = useState<{
    stateCounts: { name: string; count: number }[];
    cityCounts: { name: string; count: number }[];
  }>({ stateCounts: [], cityCounts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingSellers, setPendingSellers] = useState<PendingSeller[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [pendingSearchQuery, setPendingSearchQuery] = useState("");
  const [selectedPendingSeller, setSelectedPendingSeller] = useState<PendingSeller | null>(null);
  const [showPendingModal, setShowPendingModal] = useState(false);

  const [selectedSellerId, setSelectedSellerId] = useState<number | null>(null);
  const [adminStatus, setAdminStatus] = useState<"Active" | "Blocked">("Active");
  const [adminKycStatus, setAdminKycStatus] = useState<string>("Pending Verification");
  const [kycRemarks, setKycRemarks] = useState("");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showKycDropdown, setShowKycDropdown] = useState(false);

  // --- SEND MESSAGE MODAL STATES ---
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [messageSeller, setMessageSeller] = useState<Seller | null>(null);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");

  // --- DEACTIVATE SELLER MODAL STATES ---
  const [deactivateModalVisible, setDeactivateModalVisible] = useState(false);
  const [deactivateSeller, setDeactivateSeller] = useState<Seller | null>(null);
  const [deactivateReason, setDeactivateReason] = useState("");

  // --- DELETE SELLER MODAL STATES ---
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteSeller, setDeleteSeller] = useState<Seller | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  // --- DOCUMENT PREVIEW STATE ---
  const [previewDoc, setPreviewDoc] = useState<{name: string, url: string} | null>(null);

  // --- TOAST SYSTEM STATE & HELPERS ---
  const [toasts, setToasts] = useState<{ id: number; message: string; type: "success" | "error" }[]>([]);
  const showToast = (message: string, type: "success" | "error" = "success") => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => {
      setToasts(p => p.filter(t => t.id !== id));
    }, 3000);
  };

  // --- QUERY, FILTER, SORT & PAGINATION STATES ---
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [sortBy, setSortBy] = useState("Name");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [pendingCurrentPage, setPendingCurrentPage] = useState(1);

  // --- MOBILE SPECIFIC STATES & HOOKS ---
  const [mobileFilterVisible, setMobileFilterVisible] = useState(false);
  const [mBusinessType, setMBusinessType] = useState("All");
  const [mState, setMState] = useState("All");
  const [mCity, setMCity] = useState("All");
  const [mJoinDateRange, setMJoinDateRange] = useState("All");
  const [mMinRevenue, setMMinRevenue] = useState("");
  const [mMaxRevenue, setMMaxRevenue] = useState("");
  const [mMinWallet, setMMinWallet] = useState("");
  const [mMaxWallet, setMMaxWallet] = useState("");

  const [appliedMBusinessType, setAppliedMBusinessType] = useState("All");
  const [appliedMState, setAppliedMState] = useState("All");
  const [appliedMCity, setAppliedMCity] = useState("All");
  const [appliedMMinRevenue, setAppliedMMinRevenue] = useState("");
  const [appliedMMaxRevenue, setAppliedMMaxRevenue] = useState("");
  const [appliedMMinWallet, setAppliedMMinWallet] = useState("");
  const [appliedMMaxWallet, setAppliedMMaxWallet] = useState("");
  const [appliedMJoinDateRange, setAppliedMJoinDateRange] = useState("All");

  const [mShowBusinessTypeDropdown, setMShowBusinessTypeDropdown] = useState(false);
  const [mShowStateDropdown, setMShowStateDropdown] = useState(false);
  const [mShowCityDropdown, setMShowCityDropdown] = useState(false);
  const [mShowDateDropdown, setMShowDateDropdown] = useState(false);

  const [showAllStatesModal, setShowAllStatesModal] = useState(false);
  const [showAllCitiesModal, setShowAllCitiesModal] = useState(false);

  const [mobileEditModalVisible, setMobileEditModalVisible] = useState(false);
  const [mEditStatus, setMEditStatus] = useState<"Active" | "Blocked">("Active");
  const [mEditKycStatus, setMEditKycStatus] = useState("Pending Verification");
  const [mEditKycRemarks, setMEditKycRemarks] = useState("");
  const [mobileShowAdminActions, setMobileShowAdminActions] = useState(false);
  const [mEditAdminNotes, setMEditAdminNotes] = useState("");

  const uniqueBusinessTypes = useMemo(() => {
    const types = new Set(sellers.map(s => s.businessType).filter(Boolean));
    return ["All", ...Array.from(types)];
  }, [sellers]);

  const uniqueStates = useMemo(() => {
    const states = new Set(sellers.map(s => s.state).filter(Boolean));
    return ["All", ...Array.from(states)];
  }, [sellers]);

  const uniqueCities = useMemo(() => {
    const cities = new Set(sellers.map(s => s.city).filter(Boolean));
    return ["All", ...Array.from(cities)];
  }, [sellers]);

  const mobileFilteredSellers = useMemo(() => {
    let result = sellers;

    // Search query (case-insensitive search on name, email, businessName)
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.email.toLowerCase().includes(query) ||
          s.businessName.toLowerCase().includes(query)
      );
    }

    // Business Type Filter
    if (appliedMBusinessType !== "All") {
      result = result.filter(s => s.businessType === appliedMBusinessType);
    }

    // State Filter
    if (appliedMState !== "All") {
      result = result.filter(s => s.state === appliedMState);
    }

    // City Filter
    if (appliedMCity !== "All") {
      result = result.filter(s => s.city === appliedMCity);
    }

    // Revenue Range Min
    if (appliedMMinRevenue !== "") {
      const min = parseFloat(appliedMMinRevenue);
      if (!isNaN(min)) {
        result = result.filter(s => s.revenue >= min);
      }
    }

    // Revenue Range Max
    if (appliedMMaxRevenue !== "") {
      const max = parseFloat(appliedMMaxRevenue);
      if (!isNaN(max)) {
        result = result.filter(s => s.revenue <= max);
      }
    }

    // Wallet Range Min
    if (appliedMMinWallet !== "") {
      const min = parseFloat(appliedMMinWallet);
      if (!isNaN(min)) {
        result = result.filter(s => s.walletBalance >= min);
      }
    }

    // Wallet Range Max
    if (appliedMMaxWallet !== "") {
      const max = parseFloat(appliedMMaxWallet);
      if (!isNaN(max)) {
        result = result.filter(s => s.walletBalance <= max);
      }
    }

    // Join Date Range Filter
    if (appliedMJoinDateRange !== "All") {
      const now = new Date();
      let cutoffDate = new Date();
      if (appliedMJoinDateRange === "Last 30 Days") {
        cutoffDate.setDate(now.getDate() - 30);
      } else if (appliedMJoinDateRange === "Last 6 Months") {
        cutoffDate.setMonth(now.getMonth() - 6);
      } else if (appliedMJoinDateRange === "This Year") {
        cutoffDate = new Date(now.getFullYear(), 0, 1);
      }

      result = result.filter(s => {
        const joinDate = new Date(s.joinDate);
        return joinDate >= cutoffDate;
      });
    }

    // Sorting
    if (sortBy === "Name") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "Revenue") {
      result = [...result].sort((a, b) => b.revenue - a.revenue);
    } else if (sortBy === "Join Date") {
      result = [...result].sort((a, b) => new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime());
    } else if (sortBy === "Products") {
      result = [...result].sort((a, b) => b.products - a.products);
    }

    return result;
  }, [
    sellers,
    searchQuery,
    sortBy,
    appliedMBusinessType,
    appliedMState,
    appliedMCity,
    appliedMMinRevenue,
    appliedMMaxRevenue,
    appliedMMinWallet,
    appliedMMaxWallet,
    appliedMJoinDateRange,
  ]);

  const totalPagesMobile = Math.ceil(mobileFilteredSellers.length / itemsPerPage);
  const mobilePaginatedSellers = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return mobileFilteredSellers.slice(startIdx, startIdx + itemsPerPage);
  }, [mobileFilteredSellers, currentPage]);

  const mobileStats = useMemo(() => {
    const totalSellers = sellers.length;
    const totalRevenue = sellers.reduce((sum, s) => sum + s.revenue, 0);
    const totalProducts = sellers.reduce((sum, s) => sum + s.products, 0);
    const totalWallet = sellers.reduce((sum, s) => sum + s.walletBalance, 0);

    return {
      totalSellers,
      totalRevenue,
      totalProducts,
      totalWallet,
    };
  }, [sellers]);

  const formatCompactRupee = (value: number) => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(2)}Cr`;
    }
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(2)}L`;
    }
    return formatRupee(value);
  };

  const handleApplyMobileFilters = () => {
    setAppliedMBusinessType(mBusinessType);
    setAppliedMState(mState);
    setAppliedMCity(mCity);
    setAppliedMMinRevenue(mMinRevenue);
    setAppliedMMaxRevenue(mMaxRevenue);
    setAppliedMMinWallet(mMinWallet);
    setAppliedMMaxWallet(mMaxWallet);
    setAppliedMJoinDateRange(mJoinDateRange);
    setMobileFilterVisible(false);
    setCurrentPage(1);
  };

  const handleResetMobileFilters = () => {
    setMBusinessType("All");
    setMState("All");
    setMCity("All");
    setMMinRevenue("");
    setMMaxRevenue("");
    setMMinWallet("");
    setMMaxWallet("");
    setMJoinDateRange("All");

    setAppliedMBusinessType("All");
    setAppliedMState("All");
    setAppliedMCity("All");
    setAppliedMMinRevenue("");
    setAppliedMMaxRevenue("");
    setAppliedMMinWallet("");
    setAppliedMMaxWallet("");
    setAppliedMJoinDateRange("All");
    
    setMobileFilterVisible(false);
    setCurrentPage(1);
    showToast("Filters reset successfully!", "success");
  };

  const handleSaveMobileEdit = async () => {
    const seller = sellers.find(s => s.id === selectedSellerId);
    if (!seller) return;
    try {
      if (mEditStatus !== seller.status) {
        if (mEditStatus === "Blocked") {
          await blockSeller(seller.id);
        } else {
          await unblockSeller(seller.id);
        }
      }
      setSellers((prev) => prev.map((s) => s.id === seller.id ? { 
        ...s, 
        status: mEditStatus,
      } : s));
      showToast("Seller details updated successfully!", "success");
      setMobileEditModalVisible(false);
    } catch (e) {
      showToast(getApiErrorMessage(e, "Failed to update seller."), "error");
    }
  };

  const renderMobileSellerDetails = () => {
    const seller = sellers.find(s => s.id === selectedSellerId);
    if (!seller) return null;

    // Helper to render label-value row
    const renderLabelValueRow = (label: string, value: any, isLast = false) => (
      <View style={[stylesMobile.labelValueRow, isLast && { borderBottomWidth: 0 }]}>
        <Text style={stylesMobile.rowLabelText}>{label}</Text>
        <Text style={stylesMobile.rowValueText}>{value || "—"}</Text>
      </View>
    );

    if (mobileShowAdminActions) {
      return (
        <View style={stylesMobile.container}>
          {/* Header */}
          <View style={[stylesMobile.detailsHeader, { backgroundColor: "#1D324E" }]}>
            <TouchableOpacity 
              style={stylesMobile.detailsHeaderBack}
              onPress={() => setMobileShowAdminActions(false)}
            >
              <Feather name="arrow-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={[stylesMobile.detailsHeaderTitle, { color: "#FFFFFF" }]}>Admin Actions</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 120, paddingTop: 16 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={stylesMobile.detailsListCard}>
              {/* Update Status */}
              <Text style={stylesMobile.filterLabel}>Update Status</Text>
              <View style={stylesMobile.statusSelectRow}>
                {["Active", "Blocked"].map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      stylesMobile.statusChip,
                      mEditStatus === opt && stylesMobile.statusChipActive,
                      mEditStatus === opt && opt === "Blocked" && { backgroundColor: "#FEF2F2", borderColor: "#EF4444" }
                    ]}
                    onPress={() => setMEditStatus(opt as any)}
                  >
                    <Text style={[
                      stylesMobile.statusChipText,
                      mEditStatus === opt && stylesMobile.statusChipTextActive,
                      mEditStatus === opt && opt === "Blocked" && { color: "#EF4444" }
                    ]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* KYC Verification Status */}
              <Text style={stylesMobile.filterLabel}>KYC Verification Status</Text>
              <View style={stylesMobile.kycChipsGrid}>
                {["Pending Verification", "Active", "Rejected", "Inactive"].map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      stylesMobile.kycChip,
                      mEditKycStatus === opt && stylesMobile.kycChipActive
                    ]}
                    onPress={() => setMEditKycStatus(opt)}
                  >
                    <Text style={[
                      stylesMobile.kycChipText,
                      mEditKycStatus === opt && stylesMobile.kycChipTextActive
                    ]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Update Seller ID */}
              <Text style={stylesMobile.filterLabel}>Update Seller ID (Auto-generated)</Text>
              <TextInput
                style={[stylesMobile.editRemarksInput, { backgroundColor: "#F1F5F9", minHeight: 48, textAlignVertical: "center", color: "#64748B" }]}
                value={seller.sellerUniqueId || `FNT-SELLER-0000${seller.id}`}
                editable={false}
              />

              {/* Update On */}
              <Text style={stylesMobile.filterLabel}>Update On (DD-MM-YYYY)</Text>
              <View style={stylesMobile.dateInputWrapperMobile}>
                <TextInput
                  style={[stylesMobile.editRemarksInput, { backgroundColor: "#F1F5F9", minHeight: 48, textAlignVertical: "center", color: "#64748B", flex: 1 }]}
                  value={new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  editable={false}
                />
                <Feather name="calendar" size={18} color="#64748B" style={stylesMobile.dateIconMobile} />
              </View>

              {/* KYC Remarks */}
              <Text style={stylesMobile.filterLabel}>KYC Verification Remarks</Text>
              <TextInput
                style={stylesMobile.editRemarksInput}
                placeholder="Provide any remarks or notes about the KYC verification process..."
                placeholderTextColor="#94A3B8"
                value={mEditKycRemarks}
                onChangeText={setMEditKycRemarks}
                multiline
                numberOfLines={4}
              />

              {/* Optional Notes */}
              <Text style={stylesMobile.filterLabel}>Optional Notes About the Seller</Text>
              <TextInput
                style={stylesMobile.editRemarksInput}
                placeholder="All documents are valid, Seller can onboard products."
                placeholderTextColor="#94A3B8"
                value={mEditAdminNotes}
                onChangeText={setMEditAdminNotes}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          {/* Sticky Bottom Actions */}
          <View style={stylesMobile.stickyBottomBarTwo}>
            <TouchableOpacity 
              style={[stylesMobile.stickyBottomBtnBig, { backgroundColor: "#78350F" }]}
              onPress={async () => {
                await handleSaveMobileEdit();
                setMobileShowAdminActions(false);
              }}
            >
              <Feather name="check" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={stylesMobile.stickyBottomBtnBigText}>Update Status</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[stylesMobile.stickyBottomBtnBig, { backgroundColor: "#1E293B" }]}
              onPress={() => setMobileShowAdminActions(false)}
            >
              <Feather name="arrow-left" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={stylesMobile.stickyBottomBtnBigText}>Back to Sellers</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={stylesMobile.container}>
        {/* --- REDESIGNED TOP BAR HEADER --- */}
        <View style={stylesMobile.newTopBar}>
          <TouchableOpacity onPress={() => setMobileMenuOpen(true)}>
            <Feather name="menu" size={22} color="#1E293B" />
          </TouchableOpacity>
          
          <View style={stylesMobile.topBarSearchContainer}>
            <Feather name="search" size={16} color="#64748B" style={{ marginRight: 6 }} />
            <TextInput
              style={stylesMobile.topBarSearchInput}
              placeholder="Search..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setCurrentPage(1);
              }}
            />
          </View>

          <TouchableOpacity style={stylesMobile.topBarIconBtn} onPress={toggleTheme}>
            <Feather name={isDark ? "sun" : "moon"} size={18} color="#1E293B" />
          </TouchableOpacity>

          <TouchableOpacity style={stylesMobile.topBarIconBtn} onPress={() => Alert.alert("Notifications", "You have 3 new verification requests.")}>
            <Feather name="bell" size={18} color="#1E293B" />
            <View style={stylesMobile.topBarBadge}>
              <Text style={stylesMobile.topBarBadgeText}>3</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={stylesMobile.topBarIconBtn} onPress={() => router.push("/adminpanel")}>
            <Feather name="settings" size={18} color="#1E293B" />
          </TouchableOpacity>

          <TouchableOpacity style={stylesMobile.topBarAvatar} onPress={() => router.push("/profile")}>
            <Text style={stylesMobile.topBarAvatarText}>FL</Text>
          </TouchableOpacity>
        </View>

        {/* Header */}
        <View style={[stylesMobile.detailsHeader, { backgroundColor: "#1D324E" }]}>
          <TouchableOpacity 
            style={stylesMobile.detailsHeaderBack}
            onPress={() => setSelectedSellerId(null)}
          >
            <Feather name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={stylesMobile.headerCenterContainerMobile}>
            <Text style={stylesMobile.headerSellerNameMobile} numberOfLines={1}>{seller.name}</Text>
            <Text style={stylesMobile.headerSellerIdMobile}>ID: FNT-SELLER-0000{seller.id}</Text>
          </View>
          <View style={stylesMobile.headerRightContainerMobile}>
            <View style={[stylesMobile.headerStatusBadgeMobile, seller.status === "Active" ? stylesMobile.headerStatusActiveMobile : stylesMobile.headerStatusBlockedMobile]}>
              <Text style={[stylesMobile.headerStatusBadgeTextMobile, { color: seller.status === "Active" ? "#10B981" : "#EF4444" }]}>
                {seller.status}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40, paddingTop: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Seller Profile Header Card */}
          <View style={stylesMobile.detailsProfileCard}>
            {(seller.avatar && typeof seller.avatar === 'string' && seller.avatar.trim() !== '' && seller.avatar !== 'null' && seller.avatar !== 'N/A' && seller.avatar !== 'undefined') ? (
              <Image source={{ uri: seller.avatar }} style={stylesMobile.detailsLargeAvatar} />
            ) : (
              <View style={[stylesMobile.detailsLargeAvatar, { backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }]}>
                <Feather name="user" size={40} color="#94A3B8" />
              </View>
            )}
            <Text style={stylesMobile.detailsProfileName}>{seller.name}</Text>
            <Text style={stylesMobile.detailsProfileBusiness}>{seller.businessName}</Text>
            
            <View style={[stylesMobile.typeBadgeDetail, seller.businessType === "Partnership" ? stylesMobile.badgePurple : stylesMobile.badgeBlue]}>
              <Text style={[stylesMobile.typeBadgeText, seller.businessType === "Partnership" ? stylesMobile.badgeTextPurple : stylesMobile.badgeTextBlue]}>
                {seller.businessType || "Unknown"}
              </Text>
            </View>
          </View>

          {/* 2. Quick Actions (Placed directly below Seller Profile) */}
          <View style={stylesMobile.quickActionsCardMobile}>
            <TouchableOpacity 
              style={[stylesMobile.quickActionBtnMobile, { backgroundColor: "#FFF7ED", borderColor: "#FFEDD5", borderWidth: 1 }]}
              onPress={() => {
                setMEditStatus(seller.status);
                setMEditKycStatus(adminKycStatus);
                setMEditKycRemarks(kycRemarks);
                setMobileShowAdminActions(true);
              }}
            >
              <View style={[stylesMobile.quickActionIconCircleMobile, { backgroundColor: "#FFEFD6" }]}>
                <Feather name="edit-2" size={16} color="#EA580C" />
              </View>
              <Text style={[stylesMobile.quickActionBtnTextMobile, { color: "#EA580C" }]}>Update Status</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[stylesMobile.quickActionBtnMobile, { backgroundColor: "#EFF6FF", borderColor: "#DBEAFE", borderWidth: 1 }]}
              onPress={() => {
                setMessageSeller(seller);
                setMessageModalVisible(true);
              }}
            >
              <View style={[stylesMobile.quickActionIconCircleMobile, { backgroundColor: "#DBEAFE" }]}>
                <Feather name="message-square" size={16} color="#3B82F6" />
              </View>
              <Text style={[stylesMobile.quickActionBtnTextMobile, { color: "#3B82F6" }]}>Message</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[stylesMobile.quickActionBtnMobile, { backgroundColor: "#ECFDF5", borderColor: "#D1FAE5", borderWidth: 1 }]}
              onPress={() => Linking.openURL('tel:+918466066939')}
            >
              <View style={[stylesMobile.quickActionIconCircleMobile, { backgroundColor: "#D1FAE5" }]}>
                <Feather name="phone" size={16} color="#10B981" />
              </View>
              <Text style={[stylesMobile.quickActionBtnTextMobile, { color: "#10B981" }]}>Call</Text>
            </TouchableOpacity>
          </View>

          {/* 3. Basic Information */}
          <View style={stylesMobile.redesignedDetailCard}>
            <View style={stylesMobile.cardTitleRowMobile}>
              <Feather name="user" size={16} color="#1E293B" style={{ marginRight: 8 }} />
              <Text style={stylesMobile.cardHeaderTitleMobile}>Personal Details</Text>
            </View>
            <View style={stylesMobile.cardBodyMobile}>
              {renderLabelValueRow("Full Name", seller.name)}
              {renderLabelValueRow("Email Address", seller.email)}
              {renderLabelValueRow("Mobile Number", seller.mobile || "+91 98765 43210")}
              {renderLabelValueRow("Gender", "Male")}
              {renderLabelValueRow("Date of Birth", "15 Oct 1992", true)}
            </View>
          </View>

          {/* 4. Business Information */}
          <View style={stylesMobile.redesignedDetailCard}>
            <View style={stylesMobile.cardTitleRowMobile}>
              <Feather name="briefcase" size={16} color="#1E293B" style={{ marginRight: 8 }} />
              <Text style={stylesMobile.cardHeaderTitleMobile}>Business Information</Text>
            </View>
            <View style={stylesMobile.cardBodyMobile}>
              {renderLabelValueRow("Business Name", seller.businessName)}
              {renderLabelValueRow("Business Type", seller.businessType)}
              {renderLabelValueRow("GST Number", seller.gstNumber || "No")}
              {renderLabelValueRow("PAN Number", seller.panNumber || "AJEP12353R")}
              {renderLabelValueRow("Business Registration", seller.sellerUniqueId || `FNT-SELLER-0000${seller.id}`)}
              {renderLabelValueRow("Years of Experience", "5 Years", true)}
            </View>
          </View>

          {/* 5. Address Information */}
          <View style={stylesMobile.redesignedDetailCard}>
            <View style={stylesMobile.cardTitleRowMobile}>
              <Feather name="map-pin" size={16} color="#1E293B" style={{ marginRight: 8 }} />
              <Text style={stylesMobile.cardHeaderTitleMobile}>Address Information</Text>
            </View>
            <View style={stylesMobile.cardBodyMobile}>
              {renderLabelValueRow("Address Line", "Shop no. 1, Dharmavaram Road, Kothacheruvu")}
              {renderLabelValueRow("City", seller.city || "Sri Sathya Sai")}
              {renderLabelValueRow("State", seller.state || "Andhra Pradesh")}
              {renderLabelValueRow("Country", seller.country || "India")}
              {renderLabelValueRow("Postal Code", "515133", true)}
            </View>
          </View>

          {/* 6. Bank Details */}
          <View style={stylesMobile.redesignedDetailCard}>
            <View style={stylesMobile.cardTitleRowMobile}>
              <Feather name="credit-card" size={16} color="#1E293B" style={{ marginRight: 8 }} />
              <Text style={stylesMobile.cardHeaderTitleMobile}>Bank Details</Text>
            </View>
            <View style={stylesMobile.cardBodyMobile}>
              {renderLabelValueRow("Account Holder Name", seller.accountHolder || "IRTANUM")}
              {renderLabelValueRow("Bank Name", seller.bankName || "Canara Bank")}
              {renderLabelValueRow("Account Number", seller.accountNumber || "******4165")}
              {renderLabelValueRow("IFSC Code", seller.ifscCode || "CNRB0013234", true)}
            </View>
          </View>

          {/* 7. Uploaded Documents Section */}
          <View style={stylesMobile.redesignedDetailCard}>
            <View style={stylesMobile.cardTitleRowMobile}>
              <Feather name="file-text" size={16} color="#1E293B" style={{ marginRight: 8 }} />
              <Text style={stylesMobile.cardHeaderTitleMobile}>Uploaded Documents</Text>
            </View>
            <View style={stylesMobile.cardBodyMobile}>
              {[
                "Aadhaar Front",
                "Aadhaar Back",
                "PAN Card",
                "Cancelled Cheque",
                "Business Proof",
                "Bank Proof",
              ].map((docName, idx) => (
                <View key={docName} style={stylesMobile.documentRowRedesigned}>
                  <View style={stylesMobile.documentLeftInfoMobile}>
                    <View style={[stylesMobile.documentThumbBoxMobile, { backgroundColor: bgColors[idx % bgColors.length] }]}>
                      {(seller.avatar && typeof seller.avatar === 'string' && seller.avatar.trim() !== '' && seller.avatar !== 'null' && seller.avatar !== 'N/A' && seller.avatar !== 'undefined') ? (
                        <Image source={{ uri: seller.avatar }} style={stylesMobile.documentMiniThumbMobile} />
                      ) : (
                        <Feather name="file-text" size={16} color={iconColors[idx % iconColors.length]} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={stylesMobile.docNameTitleMobile}>{docName}</Text>
                      <View style={stylesMobile.docStatusBadgeMobile}>
                        <Feather name="check" size={10} color="#10B981" style={{ marginRight: 4 }} />
                        <Text style={stylesMobile.docStatusTextMobile}>Uploaded</Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={stylesMobile.docRedesignedViewBtn}
                    onPress={() => setPreviewDoc({ name: docName, url: 'https://via.placeholder.com/800x600.png?text=' + encodeURIComponent(docName) })}
                  >
                    <Feather name="eye" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={stylesMobile.docRedesignedViewBtnText}>View</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {/* Business Proof Documents (Multiple) */}
              <Text style={stylesMobile.docSectionSubTitleMobile}>Business Proof Documents (Multiple)</Text>
              <View style={stylesMobile.businessProofContainerMobile}>
                {(seller.avatar && typeof seller.avatar === 'string' && seller.avatar.trim() !== '' && seller.avatar !== 'null' && seller.avatar !== 'N/A' && seller.avatar !== 'undefined') ? (
                  <Image source={{ uri: seller.avatar }} style={stylesMobile.businessProofImgMobile} />
                ) : (
                  <View style={[stylesMobile.businessProofImgMobile, { backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }]}>
                    <Feather name="image" size={32} color="#94A3B8" />
                  </View>
                )}
                <TouchableOpacity
                  style={stylesMobile.businessProofViewBtnMobile}
                  onPress={() => setPreviewDoc({ name: "Business Proof Documents", url: seller.avatar || 'https://via.placeholder.com/800x600.png?text=Business%20Proof' })}
                >
                  <Feather name="eye" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={stylesMobile.businessProofViewBtnTextMobile}>View Doc</Text>
                </TouchableOpacity>
              </View>

              {/* Live Selfie Documents */}
              <Text style={stylesMobile.docSectionSubTitleMobile}>Live Selfie Documents</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={stylesMobile.selfieScrollMobile}>
                {[1, 2, 3, 4, 5].map((idx) => {
                  const resolvedSelfieUrl = seller.liveSelfiePath ? resolveMediaUrl(seller.liveSelfiePath) : (seller.avatar && typeof seller.avatar === 'string' && seller.avatar.trim() !== '' && seller.avatar !== 'null' && seller.avatar !== 'N/A' && seller.avatar !== 'undefined' ? seller.avatar : '');
                  return (
                    <TouchableOpacity 
                      key={idx} 
                      style={stylesMobile.selfieThumbWrapperMobile}
                      onPress={() => setPreviewDoc({ name: `Live Selfie ${idx}`, url: resolvedSelfieUrl || 'https://via.placeholder.com/800x600.png?text=Live%20Selfie%20' + idx })}
                    >
                      {resolvedSelfieUrl ? (
                        <Image source={{ uri: resolvedSelfieUrl }} style={stylesMobile.selfieMiniThumbMobile} />
                      ) : (
                        <View style={[stylesMobile.selfieMiniThumbMobile, { backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }]}>
                          <Feather name="camera" size={14} color="#94A3B8" />
                        </View>
                      )}
                      <View style={stylesMobile.selfieBadgeMobile}>
                        <Text style={stylesMobile.selfieBadgeTextMobile}>{idx}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </ScrollView>

        {/* --- DYNAMIC MODALS FOR MOBILE DETAILS VIEW --- */}
        {previewDoc && (
          <Modal
            visible={!!previewDoc}
            onRequestClose={() => setPreviewDoc(null)}
            transparent
            animationType="fade"
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { width: isLargeScreen ? '80%' : '92%', maxWidth: 800, padding: 0 }]}>
                <View style={[styles.modalHeader, { padding: isLargeScreen ? 20 : 16 }]}>
                  <Text style={styles.modalTitle}>{previewDoc.name} Preview</Text>
                  <TouchableOpacity onPress={() => setPreviewDoc(null)}>
                    <Feather name="x" size={isLargeScreen ? 24 : 20} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <View style={{ width: '100%', height: isLargeScreen ? 500 : 360, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, overflow: 'hidden' }}>
                  <Image 
                    source={{ uri: previewDoc.url }} 
                    resizeMode="contain"
                    style={{ width: '100%', height: '100%' }} 
                  />
                </View>
              </View>
            </View>
          </Modal>
        )}

        {messageModalVisible && messageSeller && (
          <Modal
            visible={messageModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setMessageModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.messageModalContent}>
                {/* Header */}
                <View style={styles.messageModalHeader}>
                  <View style={styles.messageHeaderLeft}>
                    <View style={styles.messageIconContainer}>
                      <Feather name="mail" size={20} color="#EA580C" />
                    </View>
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.messageTitle}>Send Message</Text>
                      <Text style={styles.messageSubtitle}>to {messageSeller.name}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setMessageModalVisible(false)}>
                    <Feather name="x" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Body */}
                <View style={styles.messageModalBody}>
                  <Text style={styles.messageFormLabel}>Subject</Text>
                  <TextInput
                    style={styles.messageFormInput}
                    placeholder="Enter message subject..."
                    placeholderTextColor="#9CA3AF"
                    value={messageSubject}
                    onChangeText={setMessageSubject}
                  />

                  <Text style={[styles.messageFormLabel, { marginTop: 16 }]}>Message</Text>
                  <TextInput
                    style={styles.messageFormTextArea}
                    placeholder="Type your message here..."
                    placeholderTextColor="#9CA3AF"
                    value={messageBody}
                    onChangeText={setMessageBody}
                    multiline
                    numberOfLines={5}
                  />
                </View>

                {/* Footer */}
                <View style={styles.messageModalFooter}>
                  <TouchableOpacity
                    style={styles.messageCancelBtn}
                    onPress={() => setMessageModalVisible(false)}
                  >
                    <Feather name="x" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.messageCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.messageSendBtn}
                    onPress={() => {
                      if (!messageSubject.trim() || !messageBody.trim()) {
                        showToast("Subject and message are required", "error");
                        return;
                      }
                      setMessageModalVisible(false);
                      setMessageSubject("");
                      setMessageBody("");
                      showToast("Message sent successfully!", "success");
                    }}
                  >
                    <Feather name="send" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.messageSendBtnText}>Send Message</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* --- DEACTIVATE SELLER MODAL FOR MOBILE --- */}
        {deactivateModalVisible && deactivateSeller && (
          <Modal
            visible={deactivateModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setDeactivateModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.messageModalContent}>
                {/* Header */}
                <View style={[styles.messageModalHeader, { backgroundColor: "#DC2626" }]}>
                  <View style={styles.messageHeaderLeft}>
                    <View style={styles.messageIconContainer}>
                      <Feather name="user-x" size={20} color="#DC2626" />
                    </View>
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.messageTitle}>Deactivate Seller</Text>
                      <Text style={styles.messageSubtitle}>This action will deactivate the seller account</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setDeactivateModalVisible(false)}>
                    <Feather name="x" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Body */}
                <View style={styles.messageModalBody}>
                  {/* Warning Banner */}
                  <View style={styles.warningBanner}>
                    <Feather name="alert-triangle" size={24} color="#D97706" style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.warningBannerTitle}>Warning</Text>
                      <Text style={styles.warningBannerText}>
                        Are you sure you want to deactivate <Text style={{ fontWeight: '700' }}>{deactivateSeller.name}</Text>?
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.messageFormLabel, { marginTop: 16 }]}>Reason for Deactivation</Text>
                  <TextInput
                    style={styles.messageFormTextArea}
                    placeholder="Please provide a reason for deactivating this seller..."
                    placeholderTextColor="#9CA3AF"
                    value={deactivateReason}
                    onChangeText={setDeactivateReason}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                {/* Footer */}
                <View style={styles.messageModalFooter}>
                  <TouchableOpacity
                    style={styles.messageCancelBtn}
                    onPress={() => setDeactivateModalVisible(false)}
                  >
                    <Feather name="x" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.messageCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.messageSendBtn, { backgroundColor: "#DC2626" }]}
                    onPress={handleConfirmDeactivate}
                  >
                    <Ionicons name="close-circle" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.messageSendBtnText}>Deactivate</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* --- DELETE SELLER MODAL FOR MOBILE --- */}
        {deleteModalVisible && deleteSeller && (
          <Modal
            visible={deleteModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setDeleteModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.messageModalContent}>
                {/* Header */}
                <View style={[styles.messageModalHeader, { backgroundColor: "#991B1B" }]}>
                  <View style={styles.messageHeaderLeft}>
                    <View style={styles.messageIconContainer}>
                      <Feather name="trash-2" size={20} color="#991B1B" />
                    </View>
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.messageTitle}>Delete Seller</Text>
                      <Text style={styles.messageSubtitle}>This action cannot be undone</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setDeleteModalVisible(false)}>
                    <Feather name="x" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Body */}
                <View style={styles.messageModalBody}>
                  {/* Danger Zone Banner */}
                  <View style={styles.dangerBanner}>
                    <Feather name="alert-circle" size={24} color="#DC2626" style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dangerBannerTitle}>Danger Zone</Text>
                      <Text style={styles.dangerBannerText}>
                        Are you sure you want to permanently delete <Text style={{ fontWeight: '700' }}>{deleteSeller.name}</Text>? This action cannot be undone and will remove all seller data.
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.messageFormLabel, { marginTop: 16 }]}>Reason for Deletion</Text>
                  <TextInput
                    style={styles.messageFormTextArea}
                    placeholder="Please provide a reason for deleting this seller..."
                    placeholderTextColor="#9CA3AF"
                    value={deleteReason}
                    onChangeText={setDeleteReason}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                {/* Footer */}
                <View style={styles.messageModalFooter}>
                  <TouchableOpacity
                    style={styles.messageCancelBtn}
                    onPress={() => setDeleteModalVisible(false)}
                  >
                    <Feather name="x" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.messageCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.messageSendBtn, { backgroundColor: "#DC2626" }]}
                    onPress={handleConfirmDelete}
                  >
                    <Feather name="trash-2" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.messageSendBtnText}>Delete Permanently</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* --- MOBILE DRAWER SLIDE-OUT MENU --- */}
        {mobileMenuOpen && (
          <Modal
            visible={mobileMenuOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setMobileMenuOpen(false)}
          >
            <TouchableOpacity 
              style={stylesMobile.drawerOverlay} 
              activeOpacity={1} 
              onPress={() => setMobileMenuOpen(false)}
            >
              <View style={stylesMobile.drawerPanel}>
                <View style={stylesMobile.drawerHeader}>
                  <Text style={stylesMobile.drawerHeaderText}>Navigation</Text>
                  <TouchableOpacity onPress={() => setMobileMenuOpen(false)}>
                    <Feather name="x" size={20} color="#1E293B" />
                  </TouchableOpacity>
                </View>
                <View style={stylesMobile.drawerContent}>
                  <TouchableOpacity 
                    style={stylesMobile.drawerItem}
                    onPress={() => { setMobileMenuOpen(false); router.push("/Dashboard"); }}
                  >
                    <Feather name="home" size={18} color="#64748B" style={{ marginRight: 12 }} />
                    <Text style={stylesMobile.drawerItemText}>Dashboard</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={stylesMobile.drawerItem}
                    onPress={() => { setMobileMenuOpen(false); router.push("/Products"); }}
                  >
                    <Feather name="box" size={18} color="#64748B" style={{ marginRight: 12 }} />
                    <Text style={stylesMobile.drawerItemText}>Catalog</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[stylesMobile.drawerItem, { backgroundColor: "#FFF7ED" }]}
                    onPress={() => { setMobileMenuOpen(false); router.push("/approveseller"); }}
                  >
                    <Feather name="users" size={18} color="#EA580C" style={{ marginRight: 12 }} />
                    <Text style={[stylesMobile.drawerItemText, { color: "#EA580C", fontWeight: "600" }]}>Sellers</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={stylesMobile.drawerItem}
                    onPress={() => { setMobileMenuOpen(false); router.push("/sellergraphs"); }}
                  >
                    <Feather name="bar-chart-2" size={18} color="#64748B" style={{ marginRight: 12 }} />
                    <Text style={stylesMobile.drawerItemText}>Analytics</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={stylesMobile.drawerItem}
                    onPress={() => { setMobileMenuOpen(false); router.push("/adminpanel"); }}
                  >
                    <Feather name="settings" size={18} color="#64748B" style={{ marginRight: 12 }} />
                    <Text style={stylesMobile.drawerItemText}>Settings</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={stylesMobile.drawerItem}
                    onPress={() => { setMobileMenuOpen(false); router.push("/profile"); }}
                  >
                    <Feather name="user" size={18} color="#64748B" style={{ marginRight: 12 }} />
                    <Text style={stylesMobile.drawerItemText}>Profile</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Modal>
        )}
      </View>
    );
  };

  const renderMobileFilterModal = () => {
    return (
      <Modal
        visible={mobileFilterVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMobileFilterVisible(false)}
      >
        <View style={stylesMobile.filterOverlay}>
          <TouchableOpacity 
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setMobileFilterVisible(false)}
          />
          <View style={stylesMobile.filterSheet}>
            {/* Drag Handle */}
            <View style={stylesMobile.filterDragHandle} />

            {/* Header */}
            <View style={stylesMobile.filterHeader}>
              <Text style={stylesMobile.filterTitle}>Filters</Text>
              <TouchableOpacity onPress={handleResetMobileFilters}>
                <Text style={stylesMobile.filterResetText}>Reset</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={stylesMobile.filterBody}
              showsVerticalScrollIndicator={false}
            >
              {/* Business Type */}
              <Text style={stylesMobile.filterLabel}>Business Type</Text>
              <TouchableOpacity 
                style={stylesMobile.filterSelectBox}
                onPress={() => {
                  setMShowBusinessTypeDropdown(!mShowBusinessTypeDropdown);
                  setMShowStateDropdown(false);
                  setMShowCityDropdown(false);
                  setMShowDateDropdown(false);
                }}
              >
                <Text style={stylesMobile.filterSelectText}>{mBusinessType}</Text>
                <Feather name="chevron-down" size={16} color="#64748B" />
              </TouchableOpacity>
              {mShowBusinessTypeDropdown && (
                <View style={stylesMobile.filterSelectDropdown}>
                  {uniqueBusinessTypes.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={stylesMobile.filterSelectOption}
                      onPress={() => {
                        setMBusinessType(type);
                        setMShowBusinessTypeDropdown(false);
                      }}
                    >
                      <Text style={stylesMobile.filterSelectOptionText}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* State */}
              <Text style={stylesMobile.filterLabel}>State</Text>
              <TouchableOpacity 
                style={stylesMobile.filterSelectBox}
                onPress={() => {
                  setMShowStateDropdown(!mShowStateDropdown);
                  setMShowBusinessTypeDropdown(false);
                  setMShowCityDropdown(false);
                  setMShowDateDropdown(false);
                }}
              >
                <Text style={stylesMobile.filterSelectText}>{mState}</Text>
                <Feather name="chevron-down" size={16} color="#64748B" />
              </TouchableOpacity>
              {mShowStateDropdown && (
                <View style={stylesMobile.filterSelectDropdown}>
                  {uniqueStates.map((st) => (
                    <TouchableOpacity
                      key={st}
                      style={stylesMobile.filterSelectOption}
                      onPress={() => {
                        setMState(st);
                        setMShowStateDropdown(false);
                      }}
                    >
                      <Text style={stylesMobile.filterSelectOptionText}>{st}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* City */}
              <Text style={stylesMobile.filterLabel}>City</Text>
              <TouchableOpacity 
                style={stylesMobile.filterSelectBox}
                onPress={() => {
                  setMShowCityDropdown(!mShowCityDropdown);
                  setMShowBusinessTypeDropdown(false);
                  setMShowStateDropdown(false);
                  setMShowDateDropdown(false);
                }}
              >
                <Text style={stylesMobile.filterSelectText}>{mCity}</Text>
                <Feather name="chevron-down" size={16} color="#64748B" />
              </TouchableOpacity>
              {mShowCityDropdown && (
                <View style={stylesMobile.filterSelectDropdown}>
                  {uniqueCities.map((ct) => (
                    <TouchableOpacity
                      key={ct}
                      style={stylesMobile.filterSelectOption}
                      onPress={() => {
                        setMCity(ct);
                        setMShowCityDropdown(false);
                      }}
                    >
                      <Text style={stylesMobile.filterSelectOptionText}>{ct}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Join Date */}
              <Text style={stylesMobile.filterLabel}>Join Date</Text>
              <TouchableOpacity 
                style={stylesMobile.filterSelectBox}
                onPress={() => {
                  setMShowDateDropdown(!mShowDateDropdown);
                  setMShowBusinessTypeDropdown(false);
                  setMShowStateDropdown(false);
                  setMShowCityDropdown(false);
                }}
              >
                <Text style={stylesMobile.filterSelectText}>
                  {mJoinDateRange === "All" ? "Select Date Range" : mJoinDateRange}
                </Text>
                <Feather name="calendar" size={16} color="#64748B" />
              </TouchableOpacity>
              {mShowDateDropdown && (
                <View style={stylesMobile.filterSelectDropdown}>
                  {["All", "Last 30 Days", "Last 6 Months", "This Year"].map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={stylesMobile.filterSelectOption}
                      onPress={() => {
                        setMJoinDateRange(opt);
                        setMShowDateDropdown(false);
                      }}
                    >
                      <Text style={stylesMobile.filterSelectOptionText}>{opt === "All" ? "All Time" : opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Revenue Range */}
              <Text style={stylesMobile.filterLabel}>Revenue Range</Text>
              <View style={stylesMobile.rangeInputRow}>
                <TextInput
                  style={stylesMobile.rangeInput}
                  placeholder="Min"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={mMinRevenue}
                  onChangeText={setMMinRevenue}
                />
                <Text style={stylesMobile.rangeDivider}>to</Text>
                <TextInput
                  style={stylesMobile.rangeInput}
                  placeholder="Max"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={mMaxRevenue}
                  onChangeText={setMMaxRevenue}
                />
              </View>

              {/* Wallet Balance Range */}
              <Text style={stylesMobile.filterLabel}>Wallet Balance Range</Text>
              <View style={stylesMobile.rangeInputRow}>
                <TextInput
                  style={stylesMobile.rangeInput}
                  placeholder="Min"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={mMinWallet}
                  onChangeText={setMMinWallet}
                />
                <Text style={stylesMobile.rangeDivider}>to</Text>
                <TextInput
                  style={stylesMobile.rangeInput}
                  placeholder="Max"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={mMaxWallet}
                  onChangeText={setMMaxWallet}
                />
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>

            {/* Bottom Button */}
            <TouchableOpacity 
              style={stylesMobile.filterApplyBtn}
              onPress={handleApplyMobileFilters}
            >
              <Text style={stylesMobile.filterApplyBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderMobileEditModal = () => {
    const seller = sellers.find(s => s.id === selectedSellerId);
    if (!seller) return null;

    return (
      <Modal
        visible={mobileEditModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMobileEditModalVisible(false)}
      >
        <View style={stylesMobile.filterOverlay}>
          <TouchableOpacity 
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setMobileEditModalVisible(false)}
          />
          <View style={stylesMobile.filterSheet}>
            {/* Drag Handle */}
            <View style={stylesMobile.filterDragHandle} />

            {/* Header */}
            <View style={stylesMobile.filterHeader}>
              <Text style={stylesMobile.filterTitle}>Edit Seller Status</Text>
              <TouchableOpacity onPress={() => setMobileEditModalVisible(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={stylesMobile.filterBody}
              showsVerticalScrollIndicator={false}
            >
              {/* Update Status */}
              <Text style={stylesMobile.filterLabel}>Update Status</Text>
              <View style={stylesMobile.statusSelectRow}>
                {["Active", "Blocked"].map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      stylesMobile.statusChip,
                      mEditStatus === opt && stylesMobile.statusChipActive,
                      mEditStatus === opt && opt === "Blocked" && { backgroundColor: "#FEF2F2", borderColor: "#EF4444" }
                    ]}
                    onPress={() => setMEditStatus(opt as any)}
                  >
                    <Text style={[
                      stylesMobile.statusChipText,
                      mEditStatus === opt && stylesMobile.statusChipTextActive,
                      mEditStatus === opt && opt === "Blocked" && { color: "#EF4444" }
                    ]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* KYC Verification Status */}
              <Text style={stylesMobile.filterLabel}>KYC Verification Status</Text>
              <View style={stylesMobile.kycChipsGrid}>
                {["Pending Verification", "Active", "Rejected", "Inactive"].map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      stylesMobile.kycChip,
                      mEditKycStatus === opt && stylesMobile.kycChipActive
                    ]}
                    onPress={() => setMEditKycStatus(opt)}
                  >
                    <Text style={[
                      stylesMobile.kycChipText,
                      mEditKycStatus === opt && stylesMobile.kycChipTextActive
                    ]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* KYC Remarks */}
              <Text style={stylesMobile.filterLabel}>KYC Verification Remarks</Text>
              <TextInput
                style={stylesMobile.editRemarksInput}
                placeholder="Provide remarks about KYC verification..."
                placeholderTextColor="#94A3B8"
                value={mEditKycRemarks}
                onChangeText={setMEditKycRemarks}
                multiline
                numberOfLines={3}
              />

              <View style={{ height: 40 }} />
            </ScrollView>

            {/* Save Button */}
            <TouchableOpacity 
              style={stylesMobile.filterApplyBtn}
              onPress={handleSaveMobileEdit}
            >
              <Text style={stylesMobile.filterApplyBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderAllStatesModal = () => {
    return (
      <Modal
        visible={showAllStatesModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAllStatesModal(false)}
      >
        <View style={stylesMobile.filterOverlay}>
          <TouchableOpacity 
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setShowAllStatesModal(false)}
          />
          <View style={stylesMobile.filterSheet}>
            <View style={stylesMobile.filterDragHandle} />
            <View style={stylesMobile.filterHeader}>
              <Text style={stylesMobile.filterTitle}>State-wise Sellers</Text>
              <TouchableOpacity onPress={() => setShowAllStatesModal(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 350 }} showsVerticalScrollIndicator={false}>
              {locationStats.stateCounts.map((item, idx) => (
                <View key={item.name} style={stylesMobile.insightRowItem}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={[stylesMobile.insightIconBoxMini, { backgroundColor: bgColors[idx % bgColors.length] }]}>
                      <Feather name="map-pin" size={14} color={iconColors[idx % iconColors.length]} />
                    </View>
                    <Text style={stylesMobile.insightRowName}>{item.name}</Text>
                  </View>
                  <Text style={stylesMobile.insightRowCount}>{item.count} Sellers</Text>
                </View>
              ))}
              {locationStats.stateCounts.length === 0 && (
                <Text style={stylesMobile.emptyInsightsText}>No state data available</Text>
              )}
            </ScrollView>
            <TouchableOpacity 
              style={[stylesMobile.filterApplyBtn, { marginTop: 16 }]}
              onPress={() => setShowAllStatesModal(false)}
            >
              <Text style={stylesMobile.filterApplyBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderAllCitiesModal = () => {
    return (
      <Modal
        visible={showAllCitiesModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAllCitiesModal(false)}
      >
        <View style={stylesMobile.filterOverlay}>
          <TouchableOpacity 
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setShowAllCitiesModal(false)}
          />
          <View style={stylesMobile.filterSheet}>
            <View style={stylesMobile.filterDragHandle} />
            <View style={stylesMobile.filterHeader}>
              <Text style={stylesMobile.filterTitle}>City-wise Sellers</Text>
              <TouchableOpacity onPress={() => setShowAllCitiesModal(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 350 }} showsVerticalScrollIndicator={false}>
              {locationStats.cityCounts.map((item, idx) => (
                <View key={item.name} style={stylesMobile.insightRowItem}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={[stylesMobile.insightIconBoxMini, { backgroundColor: bgColors[(idx + 2) % bgColors.length] }]}>
                      <Feather name="navigation" size={14} color={iconColors[(idx + 2) % iconColors.length]} />
                    </View>
                    <Text style={stylesMobile.insightRowName}>{item.name}</Text>
                  </View>
                  <Text style={stylesMobile.insightRowCount}>{item.count} Sellers</Text>
                </View>
              ))}
              {locationStats.cityCounts.length === 0 && (
                <Text style={stylesMobile.emptyInsightsText}>No city data available</Text>
              )}
            </ScrollView>
            <TouchableOpacity 
              style={[stylesMobile.filterApplyBtn, { marginTop: 16 }]}
              onPress={() => setShowAllCitiesModal(false)}
            >
              <Text style={stylesMobile.filterApplyBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderMobileVersion = () => {
    if (selectedSellerId !== null) {
      return renderMobileSellerDetails();
    }

    return (
      <AdminLayout>
        <View style={stylesMobile.container}>
          {/* Search bar inside content */}
          <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12, height: 42, borderRadius: 10, flexDirection: 'row', alignItems: 'center' }}>
            <Feather name="search" size={16} color="#64748B" style={{ marginRight: 6 }} />
            <TextInput
              style={{ flex: 1, fontSize: 14, color: '#1E293B' }}
              placeholder="Search by name, email, business..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setCurrentPage(1);
              }}
            />
          </View>

          {/* --- SCROLLABLE BODY --- */}
          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          >
          {/* --- BREADCRUMB BANNER --- */}
          <View style={stylesMobile.pageBannerCard}>
            <Text style={stylesMobile.pageBannerTitle}>Approved Sellers</Text>
            <Text style={stylesMobile.pageBannerSubtitle}>Manage and monitor verified merchant accounts</Text>

          </View>

          <View style={stylesMobile.actionButtonsRow}>
            <TouchableOpacity 
              style={stylesMobile.actionOutlineBtn}
              onPress={() => setMobileFilterVisible(true)}
            >
              <Feather name="filter" size={16} color="#EA580C" />
              <Text style={stylesMobile.actionOutlineBtnText}>Filter</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={stylesMobile.actionOutlineBtn}
              onPress={handleExportCSV}
            >
              <Feather name="download" size={16} color="#EA580C" />
              <Text style={stylesMobile.actionOutlineBtnText}>Export CSV</Text>
            </TouchableOpacity>
          </View>

          {/* --- QUICK STATS --- */}
          <View style={stylesMobile.sectionTitleRow}>
            <Text style={stylesMobile.sectionTitle}>Quick Stats</Text>
          </View>
          <View style={stylesMobile.statsGrid}>
            <View style={stylesMobile.statCard}>
              <View style={[stylesMobile.statIconContainer, { backgroundColor: "#F5F3FF" }]}>
                <Feather name="users" size={18} color="#8B5CF6" />
              </View>
              <View style={stylesMobile.statInfo}>
                <Text style={stylesMobile.statValue}>{mobileStats.totalSellers}</Text>
                <Text style={stylesMobile.statLabel}>Total Sellers</Text>
              </View>
            </View>
            <View style={stylesMobile.statCard}>
              <View style={[stylesMobile.statIconContainer, { backgroundColor: "#ECFDF5" }]}>
                <Feather name="trending-up" size={18} color="#10B981" />
              </View>
              <View style={stylesMobile.statInfo}>
                <Text style={stylesMobile.statValue}>{formatCompactRupee(mobileStats.totalRevenue)}</Text>
                <Text style={stylesMobile.statLabel}>Total Revenue</Text>
              </View>
            </View>
            <View style={stylesMobile.statCard}>
              <View style={[stylesMobile.statIconContainer, { backgroundColor: "#EFF6FF" }]}>
                <Feather name="package" size={18} color="#3B82F6" />
              </View>
              <View style={stylesMobile.statInfo}>
                <Text style={stylesMobile.statValue}>{mobileStats.totalProducts}</Text>
                <Text style={stylesMobile.statLabel}>Total Products</Text>
              </View>
            </View>
            <View style={stylesMobile.statCard}>
              <View style={[stylesMobile.statIconContainer, { backgroundColor: "#FFF7ED" }]}>
                <Feather name="credit-card" size={18} color="#F97316" />
              </View>
              <View style={stylesMobile.statInfo}>
                <Text style={stylesMobile.statValue}>{formatRupee(mobileStats.totalWallet)}</Text>
                <Text style={stylesMobile.statLabel}>Total Balance</Text>
              </View>
            </View>
          </View>

          {/* --- INSIGHTS --- */}
          <View style={stylesMobile.sectionTitleRow}>
            <Text style={stylesMobile.sectionTitle}>Insights</Text>
          </View>

          <View style={stylesMobile.insightsContainer}>
            <View style={stylesMobile.insightsSubHeaderRow}>
              <Text style={stylesMobile.insightsSubTitle}>State-wise Sellers</Text>
              <TouchableOpacity 
                onPress={() => setShowAllStatesModal(true)}
                style={{ paddingVertical: 6, paddingHorizontal: 12, marginRight: -12 }}
              >
                <Text style={stylesMobile.insightsViewAll}>View All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={stylesMobile.insightsScroll}
            >
              {stateCounts.map((item, idx) => {
                const colorIdx = idx % bgColors.length;
                return (
                  <View key={item.name} style={stylesMobile.insightCard}>
                    <View style={[stylesMobile.insightIconBox, { backgroundColor: bgColors[colorIdx] }]}>
                      <Feather name="map-pin" size={16} color={iconColors[colorIdx]} />
                    </View>
                    <Text style={stylesMobile.insightCardName} numberOfLines={1}>{item.name}</Text>
                    <Text style={stylesMobile.insightCardCount}>{item.count} Sellers</Text>
                  </View>
                );
              })}
              {stateCounts.length === 0 && (
                <Text style={stylesMobile.emptyInsightsText}>No state data available</Text>
              )}
            </ScrollView>

            <View style={[stylesMobile.insightsSubHeaderRow, { marginTop: 16 }]}>
              <Text style={stylesMobile.insightsSubTitle}>City-wise Sellers</Text>
              <TouchableOpacity 
                onPress={() => setShowAllCitiesModal(true)}
                style={{ paddingVertical: 6, paddingHorizontal: 12, marginRight: -12 }}
              >
                <Text style={stylesMobile.insightsViewAll}>View All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={stylesMobile.insightsScroll}
            >
              {cityCounts.map((item, idx) => {
                const colorIdx = (idx + 2) % bgColors.length;
                return (
                  <View key={item.name} style={stylesMobile.insightCard}>
                    <View style={[stylesMobile.insightIconBox, { backgroundColor: bgColors[colorIdx] }]}>
                      <Feather name="navigation" size={16} color={iconColors[colorIdx]} />
                    </View>
                    <Text style={stylesMobile.insightCardName} numberOfLines={1}>{item.name}</Text>
                    <Text style={stylesMobile.insightCardCount}>{item.count} Sellers</Text>
                  </View>
                );
              })}
              {cityCounts.length === 0 && (
                <Text style={stylesMobile.emptyInsightsText}>No city data available</Text>
              )}
            </ScrollView>
          </View>

          {/* --- SELLER LIST --- */}
          <View style={stylesMobile.sectionTitleRow}>
            <Text style={stylesMobile.sectionTitle}>Seller List</Text>
            <TouchableOpacity 
              style={stylesMobile.sortButtonRow}
              onPress={() => setShowSortDropdown(!showSortDropdown)}
            >
              <Feather name="menu" size={14} color="#EA580C" />
              <Text style={stylesMobile.sortButtonRowText}>Sort: {sortBy}</Text>
            </TouchableOpacity>
          </View>

          {/* Sort Dropdown overlay for mobile */}
          {showSortDropdown && (
            <View style={stylesMobile.mobileSortMenu}>
              {["Name", "Revenue", "Join Date", "Products"].map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={stylesMobile.mobileSortMenuItem}
                  onPress={() => {
                    setSortBy(opt);
                    setShowSortDropdown(false);
                  }}
                >
                  <Text style={[stylesMobile.mobileSortMenuText, sortBy === opt && stylesMobile.mobileSortMenuTextActive]}>
                    {opt}
                  </Text>
                  {sortBy === opt && <Feather name="check" size={14} color="#EA580C" />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={stylesMobile.sellerListContainer}>
            {mobilePaginatedSellers.map((seller) => (
              <View 
                key={seller.id} 
                style={[stylesMobile.sellerCard, seller.status === "Blocked" && stylesMobile.sellerCardBlocked]}
              >
                <View style={stylesMobile.sellerCardHeader}>
                  <TouchableOpacity
                    style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
                    onPress={() => {
                      setSelectedSellerId(seller.id);
                      setAdminStatus(seller.status);
                    }}
                  >
                    {(seller.avatar && typeof seller.avatar === 'string' && seller.avatar.trim() !== '' && seller.avatar !== 'null' && seller.avatar !== 'N/A' && seller.avatar !== 'undefined') ? (
                      <Image source={{ uri: seller.avatar }} style={stylesMobile.sellerCardAvatar} />
                    ) : (
                      <View style={[stylesMobile.sellerCardAvatar, { backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }]}>
                        <Feather name="user" size={18} color="#94A3B8" />
                      </View>
                    )}
                    <View style={stylesMobile.sellerCardMeta}>
                      <Text style={stylesMobile.sellerCardName} numberOfLines={1}>{seller.name}</Text>
                      <Text style={stylesMobile.sellerCardBusiness} numberOfLines={1}>{seller.businessName}</Text>
                    </View>
                  </TouchableOpacity>

                  <View style={[
                    stylesMobile.typeBadge,
                    seller.businessType === "Partnership" ? stylesMobile.badgePurple : stylesMobile.badgeBlue
                  ]}>
                    <Text style={[
                      stylesMobile.typeBadgeText,
                      seller.businessType === "Partnership" ? stylesMobile.badgeTextPurple : stylesMobile.badgeTextBlue
                    ]}>
                      {seller.businessType || "Unknown"}
                    </Text>
                  </View>
                </View>

                {/* Stats */}
                <View style={stylesMobile.sellerCardStatsRow}>
                  <View style={stylesMobile.sellerCardStatItem}>
                    <Text style={stylesMobile.sellerCardStatVal}>{seller.products}</Text>
                    <Text style={stylesMobile.sellerCardStatLabel}>Products</Text>
                  </View>
                  <View style={stylesMobile.sellerCardStatItem}>
                    <Text style={stylesMobile.sellerCardStatVal}>{formatRupee(seller.revenue)}</Text>
                    <Text style={stylesMobile.sellerCardStatLabel}>Revenue</Text>
                  </View>
                  <View style={stylesMobile.sellerCardStatItem}>
                    <Text style={stylesMobile.sellerCardStatVal}>{formatRupee(seller.walletBalance)}</Text>
                    <Text style={stylesMobile.sellerCardStatLabel}>Wallet</Text>
                  </View>
                  <View style={stylesMobile.sellerCardStatItem}>
                    <Text style={stylesMobile.sellerCardStatVal} numberOfLines={1}>{seller.joinDate}</Text>
                    <Text style={stylesMobile.sellerCardStatLabel}>Joined</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={stylesMobile.sellerCardActions}>
                  <TouchableOpacity
                    style={[stylesMobile.circleActionBtn, { backgroundColor: "#EFF6FF" }]}
                    onPress={() => {
                      setSelectedSellerId(seller.id);
                      setAdminStatus(seller.status);
                    }}
                  >
                    <Feather name="eye" size={15} color="#3B82F6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[stylesMobile.circleActionBtn, { backgroundColor: "#FFF7ED" }]}
                    onPress={() => {
                      setMessageSeller(seller);
                      setMessageModalVisible(true);
                    }}
                  >
                    <Feather name="message-square" size={15} color="#EA580C" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[stylesMobile.circleActionBtn, { backgroundColor: "#ECFDF5" }]}
                    onPress={() => {
                      Linking.openURL('tel:+918466066939');
                    }}
                  >
                    <Feather name="phone" size={15} color="#10B981" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[stylesMobile.circleActionBtn, { backgroundColor: "#FEF2F2" }]}
                    onPress={() => {
                      setDeleteSeller(seller);
                      setDeleteReason("");
                      setDeleteModalVisible(true);
                    }}
                  >
                    <Feather name="trash-2" size={15} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {mobileFilteredSellers.length === 0 && (
              <View style={stylesMobile.emptyListContainer}>
                <Feather name="alert-circle" size={40} color="#94A3B8" />
                <Text style={stylesMobile.emptyListText}>No approved sellers found</Text>
              </View>
            )}
          </View>

          {/* Pagination for mobile */}
          {mobileFilteredSellers.length > 0 && (
            <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPagesMobile}
                totalItems={mobileFilteredSellers.length}
                itemsPerPage={itemsPerPage}
                itemName="approved sellers"
                onPageChange={setCurrentPage}
              />
            </View>
          )}
        </ScrollView>

        {/* FAB REMOVED */}



        {/* --- FILTER BOTTOM SHEET MODAL --- */}
        {renderMobileFilterModal()}

        {/* --- MOBILE EDIT STATUS/KYC MODAL --- */}
        {renderMobileEditModal()}

        {/* --- ALL STATES INSIGHTS MODAL --- */}
        {renderAllStatesModal()}

        {/* --- ALL CITIES INSIGHTS MODAL --- */}
        {renderAllCitiesModal()}



        {/* --- DYNAMIC MODALS FOR MOBILE LIST VIEW --- */}
        {previewDoc && (
          <Modal
            visible={!!previewDoc}
            onRequestClose={() => setPreviewDoc(null)}
            transparent
            animationType="fade"
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { width: isLargeScreen ? '80%' : '92%', maxWidth: 800, padding: 0 }]}>
                <View style={[styles.modalHeader, { padding: isLargeScreen ? 20 : 16 }]}>
                  <Text style={styles.modalTitle}>{previewDoc.name} Preview</Text>
                  <TouchableOpacity onPress={() => setPreviewDoc(null)}>
                    <Feather name="x" size={isLargeScreen ? 24 : 20} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <View style={{ width: '100%', height: isLargeScreen ? 500 : 360, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, overflow: 'hidden' }}>
                  <Image 
                    source={{ uri: previewDoc.url }} 
                    resizeMode="contain"
                    style={{ width: '100%', height: '100%' }} 
                  />
                </View>
              </View>
            </View>
          </Modal>
        )}

        {messageModalVisible && messageSeller && (
          <Modal
            visible={messageModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setMessageModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.messageModalContent}>
                {/* Header */}
                <View style={styles.messageModalHeader}>
                  <View style={styles.messageHeaderLeft}>
                    <View style={styles.messageIconContainer}>
                      <Feather name="mail" size={20} color="#EA580C" />
                    </View>
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.messageTitle}>Send Message</Text>
                      <Text style={styles.messageSubtitle}>to {messageSeller.name}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setMessageModalVisible(false)}>
                    <Feather name="x" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Body */}
                <View style={styles.messageModalBody}>
                  <Text style={styles.messageFormLabel}>Subject</Text>
                  <TextInput
                    style={styles.messageFormInput}
                    placeholder="Enter message subject..."
                    placeholderTextColor="#9CA3AF"
                    value={messageSubject}
                    onChangeText={setMessageSubject}
                  />

                  <Text style={[styles.messageFormLabel, { marginTop: 16 }]}>Message</Text>
                  <TextInput
                    style={styles.messageFormTextArea}
                    placeholder="Type your message here..."
                    placeholderTextColor="#9CA3AF"
                    value={messageBody}
                    onChangeText={setMessageBody}
                    multiline
                    numberOfLines={5}
                  />
                </View>

                {/* Footer */}
                <View style={styles.messageModalFooter}>
                  <TouchableOpacity
                    style={styles.messageCancelBtn}
                    onPress={() => setMessageModalVisible(false)}
                  >
                    <Feather name="x" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.messageCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.messageSendBtn}
                    onPress={() => {
                      if (!messageSubject.trim() || !messageBody.trim()) {
                        showToast("Subject and message are required", "error");
                        return;
                      }
                      setMessageModalVisible(false);
                      setMessageSubject("");
                      setMessageBody("");
                      showToast("Message sent successfully!", "success");
                    }}
                  >
                    <Feather name="send" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.messageSendBtnText}>Send Message</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* --- DEACTIVATE SELLER MODAL FOR MOBILE LIST --- */}
        {deactivateModalVisible && deactivateSeller && (
          <Modal
            visible={deactivateModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setDeactivateModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.messageModalContent}>
                {/* Header */}
                <View style={[styles.messageModalHeader, { backgroundColor: "#DC2626" }]}>
                  <View style={styles.messageHeaderLeft}>
                    <View style={styles.messageIconContainer}>
                      <Feather name="user-x" size={20} color="#DC2626" />
                    </View>
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.messageTitle}>Deactivate Seller</Text>
                      <Text style={styles.messageSubtitle}>This action will deactivate the seller account</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setDeactivateModalVisible(false)}>
                    <Feather name="x" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Body */}
                <View style={styles.messageModalBody}>
                  {/* Warning Banner */}
                  <View style={styles.warningBanner}>
                    <Feather name="alert-triangle" size={24} color="#D97706" style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.warningBannerTitle}>Warning</Text>
                      <Text style={styles.warningBannerText}>
                        Are you sure you want to deactivate <Text style={{ fontWeight: '700' }}>{deactivateSeller.name}</Text>?
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.messageFormLabel, { marginTop: 16 }]}>Reason for Deactivation</Text>
                  <TextInput
                    style={styles.messageFormTextArea}
                    placeholder="Please provide a reason for deactivating this seller..."
                    placeholderTextColor="#9CA3AF"
                    value={deactivateReason}
                    onChangeText={setDeactivateReason}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                {/* Footer */}
                <View style={styles.messageModalFooter}>
                  <TouchableOpacity
                    style={styles.messageCancelBtn}
                    onPress={() => setDeactivateModalVisible(false)}
                  >
                    <Feather name="x" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.messageCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.messageSendBtn, { backgroundColor: "#DC2626" }]}
                    onPress={handleConfirmDeactivate}
                  >
                    <Ionicons name="close-circle" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.messageSendBtnText}>Deactivate</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* --- DELETE SELLER MODAL FOR MOBILE LIST --- */}
        {deleteModalVisible && deleteSeller && (
          <Modal
            visible={deleteModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setDeleteModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.messageModalContent}>
                {/* Header */}
                <View style={[styles.messageModalHeader, { backgroundColor: "#991B1B" }]}>
                  <View style={styles.messageHeaderLeft}>
                    <View style={styles.messageIconContainer}>
                      <Feather name="trash-2" size={20} color="#991B1B" />
                    </View>
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.messageTitle}>Delete Seller</Text>
                      <Text style={styles.messageSubtitle}>This action cannot be undone</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setDeleteModalVisible(false)}>
                    <Feather name="x" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Body */}
                <View style={styles.messageModalBody}>
                  {/* Danger Zone Banner */}
                  <View style={styles.dangerBanner}>
                    <Feather name="alert-circle" size={24} color="#DC2626" style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dangerBannerTitle}>Danger Zone</Text>
                      <Text style={styles.dangerBannerText}>
                        Are you sure you want to permanently delete <Text style={{ fontWeight: '700' }}>{deleteSeller.name}</Text>? This action cannot be undone and will remove all seller data.
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.messageFormLabel, { marginTop: 16 }]}>Reason for Deletion</Text>
                  <TextInput
                    style={styles.messageFormTextArea}
                    placeholder="Please provide a reason for deleting this seller..."
                    placeholderTextColor="#9CA3AF"
                    value={deleteReason}
                    onChangeText={setDeleteReason}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                {/* Footer */}
                <View style={styles.messageModalFooter}>
                  <TouchableOpacity
                    style={styles.messageCancelBtn}
                    onPress={() => setDeleteModalVisible(false)}
                  >
                    <Feather name="x" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.messageCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.messageSendBtn, { backgroundColor: "#DC2626" }]}
                    onPress={handleConfirmDelete}
                  >
                    <Feather name="trash-2" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.messageSendBtnText}>Delete Permanently</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
        </View>
      </AdminLayout>
    );
  };

  const filteredPendingSellers = useMemo(() => {
    const query = pendingSearchQuery.trim().toLowerCase();
    if (!query) return pendingSellers;
    return pendingSellers.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        (s.businessName ?? "").toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        (s.mobile ?? "").toLowerCase().includes(query)
    );
  }, [pendingSellers, pendingSearchQuery]);

  const loadApprovedSellers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [items, stats] = await Promise.all([
        fetchApprovedSellers(500),
        fetchApprovedSellerLocationStats(),
      ]);
      setSellers(items.map(mapSellerToApprovedRow));
      setLocationStats(stats);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load approved sellers."));
      setSellers([]);
      setLocationStats({ stateCounts: [], cityCounts: [] });
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadPendingSellers = useCallback(async () => {
    if (!token) return;
    setPendingLoading(true);
    setPendingError(null);
    try {
      const rows = await fetchPendingProfileSellers();
      setPendingSellers(rows.map(mapPendingProfileRow));
    } catch (e) {
      setPendingError(getApiErrorMessage(e, "Failed to load pending sellers."));
      setPendingSellers([]);
    } finally {
      setPendingLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (authLoading || !token) return;
    void loadPendingSellers();
  }, [authLoading, token, loadPendingSellers]);

  useEffect(() => {
    if (authLoading || !token || showPending) return;
    void loadApprovedSellers();
  }, [authLoading, token, showPending, loadApprovedSellers]);

  const reload = loadApprovedSellers;
  const setData = setSellers;

  const openPendingDetail = async (pending: PendingSeller) => {
    try {
      const detail = await fetchPendingProfileDetail(pending.id);
      setSelectedPendingSeller({
        ...pending,
        businessType: String(detail.businessType ?? pending.businessType ?? "—"),
        state: String(detail.state ?? pending.state ?? "—"),
        city: String(detail.city ?? pending.city ?? "—"),
        bankName: String(detail.bankName ?? pending.bankName ?? "—"),
        accountNumber: String(detail.accountNumber ?? pending.accountNumber ?? "—"),
        ifscCode: String(detail.ifscCode ?? pending.ifscCode ?? "—"),
        holderName: String(detail.accountHolder ?? pending.holderName ?? "—"),
      });
      setShowPendingModal(true);
    } catch (e) {
      Alert.alert("Error", getApiErrorMessage(e));
    }
  };

  const handleApprovePending = async (pending: PendingSeller) => {
    try {
      await approveSellerProfile(pending.id);
      setPendingSellers((prev) => prev.filter((s) => s.id !== pending.id));
      setShowPendingModal(false);
      void loadApprovedSellers();
      showToast("Seller approved successfully!", "success");
    } catch (e) {
      showToast(getApiErrorMessage(e, "Failed to approve seller."), "error");
    }
  };

  const handleRejectPending = async (pending: PendingSeller) => {
    try {
      await rejectSellerProfile(pending.id, "Rejected by admin");
      setPendingSellers((prev) => prev.filter((s) => s.id !== pending.id));
      setShowPendingModal(false);
      showToast("Seller request has been rejected.", "success");
    } catch (e) {
      showToast(getApiErrorMessage(e, "Failed to reject seller."), "error");
    }
  };

  // Query, filter, sort and pagination states moved to the top of the component to resolve scope errors.

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

  // Location insights from backend (excludes null/empty state & city)
  const stateCounts = locationStats.stateCounts;
  const cityCounts = locationStats.cityCounts;

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

  const handleConfirmDeactivate = async () => {
    if (!deactivateSeller) return;
    try {
      await blockSeller(deactivateSeller.id);
      setData((prev) =>
        prev.map((s) => (s.id === deactivateSeller.id ? { ...s, status: "Blocked" } : s))
      );
      setDeactivateModalVisible(false);
      setDeactivateSeller(null);
      setDeactivateReason("");
      showToast("Seller successfully blocked!", "success");
    } catch (e) {
      showToast(getApiErrorMessage(e, "Failed to block seller."), "error");
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteSeller) return;
    setData((prev) => prev.filter((s) => s.id !== deleteSeller.id));
    setDeleteModalVisible(false);
    setDeleteSeller(null);
    setDeleteReason("");
    showToast("Seller successfully deleted!", "success");
  };

  const handleExportCSV = () => {
    if (sellers.length === 0) {
      Alert.alert("No Data", "There are no approved sellers to export.");
      return;
    }

    const headers = ["ID", "Name", "Business Name", "Email", "State", "City", "Status", "Products", "Wallet Balance", "Revenue", "Join Date"];
    const rows = sellers.map(s => [
      s.id,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.businessName.replace(/"/g, '""')}"`,
      `"${s.email.replace(/"/g, '""')}"`,
      `"${s.state.replace(/"/g, '""')}"`,
      `"${s.city.replace(/"/g, '""')}"`,
      s.status,
      s.products,
      s.walletBalance,
      s.revenue,
      s.joinDate
    ].join(","));

    const csv = [headers.join(","), ...rows].join("\n");

    if (Platform.OS === "web") {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "approved_sellers.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast("Sellers exported to CSV successfully!", "success");
    } else {
      Alert.alert("Export Successful", "CSV export is primarily supported on the web platform.");
    }
  };

  // --- SUB-COMPONENTS ---

  // --- MOBILE VERSION RENDER LOGIC ---
  if (!isLargeScreen) {
    return renderMobileVersion();
  }

  return (
    <AdminLayout>
      <ScrollView
        style={styles.scrollBody}
        contentContainerStyle={styles.scrollBodyContent}
        showsVerticalScrollIndicator={false}
      >
        {selectedSellerId !== null ? (
          (() => {
            const seller = sellers.find(s => s.id === selectedSellerId);
            if (!seller) return null;

            const handleUpdateSellerStatus = () => {
              setData((prev) => prev.map((s) => s.id === seller.id ? { ...s, status: adminStatus } : s));
              showToast(`Seller status updated to ${adminStatus}!`, "success");
            };

            return (
              <View style={styles.detailsContainer}>
                {/* --- HEADER BANNER --- */}
                <View style={styles.detailsHeaderBanner}>
                  <View style={styles.detailsHeaderLeft}>
                    <TouchableOpacity
                      style={styles.headerBackBtn}
                      onPress={() => setSelectedSellerId(null)}
                    >
                      <Feather name="arrow-left" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.headerBackBtnText}>Back</Text>
                    </TouchableOpacity>
                    <View style={styles.avatarWrapper}>
                      {(seller.avatar && typeof seller.avatar === 'string' && seller.avatar.trim() !== '' && seller.avatar !== 'null' && seller.avatar !== 'N/A' && seller.avatar !== 'undefined') ? (<Image source={{ uri: seller.avatar }} style={styles.detailsAvatar} />) : (<View style={[styles.detailsAvatar, { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }]}><Feather name="user" size={32} color="#9CA3AF" /></View>)}
                      <View style={styles.statusDotActive} />
                    </View>
                    <View style={styles.detailsMeta}>
                      <Text style={styles.detailsTitle}>{seller.name}</Text>
                      <View style={styles.detailsMetaRow}>
                        <Feather name="mail" size={14} color="#F3F4F6" style={{ marginRight: 6 }} />
                        <Text style={styles.detailsSubtext}>{seller.email}</Text>
                      </View>
                      <View style={styles.detailsMetaRow}>
                        <Feather name="calendar" size={14} color="#F3F4F6" style={{ marginRight: 6 }} />
                        <Text style={styles.detailsSubtext}>Joined {seller.joinDate}</Text>
                        <Feather name="briefcase" size={14} color="#F3F4F6" style={{ marginLeft: 12, marginRight: 6 }} />
                        <Text style={styles.detailsSubtext}>{seller.businessName}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailsHeaderRight}>
                    <View style={styles.currentStatusCard}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Feather name="check-circle" size={16} color="#10B981" style={{ marginRight: 6 }} />
                        <Text style={styles.currentStatusVal}>{seller.status}</Text>
                      </View>
                      <Text style={styles.currentStatusLabel}>Current Status</Text>
                    </View>
                  </View>
                </View>

                {/* --- KYC VERIFICATION STATUS BAR --- */}
                <View style={styles.kycBar}>
                  <Text style={styles.kycBarTitle}>KYC Verification Status</Text>
                  <View style={styles.kycNotCompletedBadge}>
                    <Text style={styles.kycNotCompletedText}>Not Completed</Text>
                  </View>
                </View>

                {/* --- 3x2 GRID OF KYC DETAILS --- */}
                <View style={styles.kycGrid}>
                  <View style={styles.kycGridCard}>
                    <View style={styles.kycIconCircle}>
                      <Feather name="check" size={16} color="#EA580C" />
                    </View>
                    <View style={styles.kycGridCardContent}>
                      <Text style={styles.kycGridCardLabel}>KYC STATUS</Text>
                      <View style={[styles.kycBadge, { backgroundColor: "#EF4444" }]}>
                        <Text style={styles.kycBadgeText}>Not Completed</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.kycGridCard}>
                    <View style={styles.kycIconCircle}>
                      <Feather name="calendar" size={16} color="#EA580C" />
                    </View>
                    <View style={styles.kycGridCardContent}>
                      <Text style={styles.kycGridCardLabel}>SUBMITTED ON</Text>
                      <Text style={styles.kycGridCardValue}>N/A</Text>
                    </View>
                  </View>

                  <View style={styles.kycGridCard}>
                    <View style={styles.kycIconCircle}>
                      <Feather name="image" size={16} color="#EA580C" />
                    </View>
                    <View style={styles.kycGridCardContent}>
                      <Text style={styles.kycGridCardLabel}>IMAGES CAPTURED</Text>
                      <View style={styles.kycGridCircleCount}>
                        <Text style={styles.kycGridCircleCountText}>0</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.kycGridCard}>
                    <View style={styles.kycIconCircle}>
                      <Feather name="check" size={16} color="#EA580C" />
                    </View>
                    <View style={styles.kycGridCardContent}>
                      <Text style={styles.kycGridCardLabel}>VERIFICATION STATUS</Text>
                      <View style={[styles.kycBadge, { backgroundColor: "#FBBF24" }]}>
                        <Text style={[styles.kycBadgeText, { color: "#1F2937" }]}>Pending</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.kycGridCard}>
                    <View style={styles.kycIconCircle}>
                      <Feather name="user" size={16} color="#EA580C" />
                    </View>
                    <View style={styles.kycGridCardContent}>
                      <Text style={styles.kycGridCardLabel}>VERIFIED BY</Text>
                      <Text style={styles.kycGridCardValue}>N/A</Text>
                    </View>
                  </View>

                  <View style={styles.kycGridCard}>
                    <View style={styles.kycIconCircle}>
                      <Feather name="clock" size={16} color="#EA580C" />
                    </View>
                    <View style={styles.kycGridCardContent}>
                      <Text style={styles.kycGridCardLabel}>VERIFIED ON</Text>
                      <Text style={styles.kycGridCardValue}>N/A</Text>
                    </View>
                  </View>
                </View>

                {/* --- 2 COLUMN DETAILS INFO & DOCUMENT SECTION --- */}
                <View style={[styles.detailsColumns, isLargeScreen ? styles.rowLayout : styles.columnLayout]}>
                  {/* Left Column (2/3 width) - Info Tables */}
                  <View style={[styles.detailsColumnLeft, { flex: isLargeScreen ? 2.3 : 1 }]}>
                    <View style={styles.infoCard}>
                      <View style={styles.infoCardHeader}>
                        <Feather name="user" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.infoCardTitle}>Seller Information</Text>
                      </View>

                      <View style={styles.infoCardBody}>
                        {/* Personal Details */}
                        <Text style={styles.infoSectionTitle}>Personal Details</Text>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>First Name</Text>
                          <Text style={styles.infoValue}>{seller.name.split(" ")[0]}</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Last Name</Text>
                          <Text style={styles.infoValue}>{seller.name.split(" ").slice(1).join(" ") || "Collection"}</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Email</Text>
                          <Text style={styles.infoValue}>{seller.email}</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Mobile</Text>
                          <Text style={styles.infoValue}>+918466066939</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Registered On</Text>
                          <Text style={styles.infoValue}>{seller.joinDate}</Text>
                        </View>

                        {/* Business Details */}
                        <Text style={styles.infoSectionTitle}>Business Details</Text>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Business Name</Text>
                          <Text style={styles.infoValue}>{seller.businessName}</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Seller Category</Text>
                          <View style={styles.b2cBadge}>
                            <Text style={styles.b2cBadgeText}>B2C</Text>
                          </View>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Business Type</Text>
                          <Text style={styles.infoValue}>{seller.businessType}</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Address</Text>
                          <Text style={styles.infoValue}>Shop no. 1, Dharmavaram Road, Kothacheruvu, Sri Sathya Sai Dist, Andhra Pradesh, 515133.</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>GST</Text>
                          <Text style={styles.infoValue}>No</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>PAN Number</Text>
                          <Text style={styles.infoValue}>AJEP12353R</Text>
                        </View>

                        {/* Bank Details */}
                        <Text style={styles.infoSectionTitle}>Bank Details</Text>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Bank Name</Text>
                          <Text style={styles.infoValue}>Canara Bank</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Branch Name</Text>
                          <Text style={styles.infoValue}>HINDUPUR TEACHERS COLONY</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Account Number</Text>
                          <Text style={styles.infoValue}>******4165</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>IFSC Code</Text>
                          <Text style={styles.infoValue}>CNRB0013234</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Account Holder</Text>
                          <Text style={styles.infoValue}>IRTANUM</Text>
                        </View>

                        {/* Location Details */}
                        <Text style={styles.infoSectionTitle}>Location Details</Text>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Country</Text>
                          <Text style={styles.infoValue}>India</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>State</Text>
                          <Text style={styles.infoValue}>Andhra Pradesh</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>City</Text>
                          <Text style={styles.infoValue}>Sri Sathya Sai</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Area</Text>
                          <Text style={styles.infoValue}>Kothacheruvu</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Pincode</Text>
                          <Text style={styles.infoValue}>515133</Text>
                        </View>

                        {/* Warehouse Details */}
                        <Text style={styles.infoSectionTitle}>Warehouse Details</Text>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Warehouse Address</Text>
                          <Text style={styles.infoValue}>Shop no. 1, Dharmavaram Road, Kothacheruvu, Near Indian oil petrol pump, Sri Sathya Sai Dist, Andhra Pradesh, 515133</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Country</Text>
                          <Text style={styles.infoValue}>India</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>State</Text>
                          <Text style={styles.infoValue}>Andhra Pradesh</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>City</Text>
                          <Text style={styles.infoValue}>Sri Sathya Sai</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Area</Text>
                          <Text style={styles.infoValue}>Kothacheruvu</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Right Column (1/3 width) - Images & Documents */}
                  <View style={[styles.detailsColumnRight, { flex: isLargeScreen ? 1.2 : 1, marginLeft: isLargeScreen ? 20 : 0, marginTop: isLargeScreen ? 0 : 20 }]}>
                    {/* Profile Picture */}
                    <View style={styles.sidebarCard}>
                      <View style={styles.sidebarCardHeader}>
                        <Text style={styles.sidebarCardTitle}>Profile Picture</Text>
                      </View>
                      <View style={styles.sidebarCardBody}>
                        {(seller.avatar && typeof seller.avatar === 'string' && seller.avatar.trim() !== '' && seller.avatar !== 'null' && seller.avatar !== 'N/A' && seller.avatar !== 'undefined') ? (<Image source={{ uri: seller.avatar }} style={styles.sidebarProfileImg} />) : (<View style={[styles.sidebarProfileImg, { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }]}><Feather name="user" size={80} color="#9CA3AF" /></View>)}
                      </View>
                    </View>

                    {/* Verification Documents */}
                    <View style={[styles.sidebarCard, { marginTop: 20 }]}>
                      <View style={styles.sidebarCardHeader}>
                        <Text style={styles.sidebarCardTitle}>Verification Documents</Text>
                      </View>
                      <View style={styles.sidebarCardBodyDocs}>
                        {[
                          "Aadhaar Front",
                          "Aadhaar Back",
                          "PAN Card",
                          "Cancelled Cheque",
                          "Business Proof",
                          "Bank Proof",
                        ].map((docName) => (
                          <View key={docName} style={styles.docRow}>
                            <Text style={styles.docLabel}>{docName}</Text>
                            <TouchableOpacity
                              style={styles.docViewBtn}
                              onPress={() => setPreviewDoc({ name: docName, url: 'https://via.placeholder.com/800x600.png?text=' + encodeURIComponent(docName) })}
                            >
                              <Feather name="eye" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                              <Text style={styles.docViewBtnText}>View</Text>
                            </TouchableOpacity>
                          </View>
                        ))}

                        <Text style={styles.docSectionSubTitle}>Business Proof Documents (Multiple)</Text>
                        <View style={styles.docThumbnailRow}>
                          {(seller.avatar && typeof seller.avatar === 'string' && seller.avatar.trim() !== '' && seller.avatar !== 'null' && seller.avatar !== 'N/A' && seller.avatar !== 'undefined') ? (<Image source={{ uri: seller.avatar }} style={styles.docThumbnail} />) : (<View style={[styles.docThumbnail, { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }]}><Feather name="image" size={40} color="#9CA3AF" /></View>)}
                        </View>

                        <Text style={styles.docSectionSubTitle}>Live Selfie Documents</Text>
                        <View style={styles.selfieThumbnailRow}>
                          {[1, 2, 3, 4, 5].map((idx) => (
                            (seller.avatar && typeof seller.avatar === 'string' && seller.avatar.trim() !== '' && seller.avatar !== 'null' && seller.avatar !== 'N/A' && seller.avatar !== 'undefined') ? (<Image key={idx} source={{ uri: seller.avatar }} style={styles.selfieThumbnail} />) : (<View key={idx} style={[styles.selfieThumbnail, { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }]}><Feather name="camera" size={20} color="#9CA3AF" /></View>)
                          ))}
                        </View>
                      </View>
                    </View>
                  </View>
                </View>

                {/* --- ADMIN ACTIONS SECTION --- */}
                <View style={styles.adminActionsCard}>
                  <View style={styles.adminActionsHeader}>
                    <Feather name="settings" size={16} color="#1F2937" style={{ marginRight: 8 }} />
                    <Text style={styles.adminActionsTitle}>Admin Actions</Text>
                  </View>

                  <View style={[styles.adminActionsBody, isLargeScreen ? styles.rowLayout : styles.columnLayout]}>
                    {/* Left Form (2/3 width) */}
                    <View style={{ flex: isLargeScreen ? 2 : 1 }}>
                      <View style={[styles.rowLayout, { gap: 16, flexWrap: "wrap", marginBottom: 16, zIndex: 100, position: "relative" }]}>
                        {/* Update Status Dropdown */}
                        <View style={{ flex: 1, minWidth: 200, position: "relative" }}>
                          <Text style={styles.formLabel}>Update Status</Text>
                          <TouchableOpacity
                            style={styles.selectDropdown}
                            onPress={() => {
                              setShowStatusDropdown(!showStatusDropdown);
                              setShowKycDropdown(false);
                            }}
                          >
                            <Text style={styles.selectDropdownText}>{adminStatus}</Text>
                            <Feather name="chevron-down" size={14} color="#6B7280" />
                          </TouchableOpacity>
                          {showStatusDropdown && (
                            <View style={styles.selectMenu}>
                              {["Active", "Blocked"].map((opt) => (
                                <TouchableOpacity
                                  key={opt}
                                  style={styles.selectMenuItem}
                                  onPress={() => {
                                    setAdminStatus(opt as any);
                                    setShowStatusDropdown(false);
                                  }}
                                >
                                  <Text style={styles.selectMenuText}>{opt}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}
                        </View>

                        {/* KYC Status Dropdown */}
                        <View style={{ flex: 1, minWidth: 200, position: "relative" }}>
                          <Text style={styles.formLabel}>KYC Verification Status</Text>
                          <TouchableOpacity
                            style={styles.selectDropdown}
                            onPress={() => {
                              setShowKycDropdown(!showKycDropdown);
                              setShowStatusDropdown(false);
                            }}
                          >
                            <Text style={styles.selectDropdownText}>{adminKycStatus}</Text>
                            <Feather name="chevron-down" size={14} color="#6B7280" />
                          </TouchableOpacity>
                          {showKycDropdown && (
                            <View style={styles.selectMenu}>
                              {["Pending Verification", "Active", "Rejected", "Inactive"].map((opt) => (
                                <TouchableOpacity
                                  key={opt}
                                  style={styles.selectMenuItem}
                                  onPress={() => {
                                    setAdminKycStatus(opt);
                                    setShowKycDropdown(false);
                                  }}
                                >
                                  <Text style={styles.selectMenuText}>{opt}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Unique Seller ID */}
                      <View style={{ marginBottom: 16 }}>
                        <Text style={styles.formLabel}>Unique Seller ID (Auto-generated)</Text>
                        <TextInput
                          style={styles.formTextInputDisabled}
                          value={`FNT-SELLER-0000${seller.id}`}
                          editable={false}
                        />
                        <Text style={styles.formCaption}>Unique ID: FNT-SELLER-0000{seller.id}</Text>
                      </View>

                      {/* KYC Remarks */}
                      <View style={{ marginBottom: 20 }}>
                        <Text style={styles.formLabel}>KYC Verification Remarks</Text>
                        <TextInput
                          style={styles.formTextArea}
                          placeholder="Provide any remarks or notes about the KYC verification process..."
                          placeholderTextColor="#9CA3AF"
                          value={kycRemarks}
                          onChangeText={setKycRemarks}
                          multiline={true}
                          numberOfLines={4}
                        />
                        <Text style={styles.formCaption}>Optional notes about the verification process.</Text>
                      </View>

                      {/* Footer actions */}
                      <View style={[styles.rowLayout, { gap: 12 }]}>
                        <TouchableOpacity
                          style={styles.updateStatusBtn}
                          onPress={handleUpdateSellerStatus}
                        >
                          <Feather name="check" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text style={styles.updateStatusBtnText}>Update Status</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.backBtnGrey}
                          onPress={() => setSelectedSellerId(null)}
                        >
                          <Feather name="arrow-left" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text style={styles.backBtnGreyText}>Back to Sellers</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Right Info (1/3 width) */}
                    <View style={[styles.adminInfoPanel, { marginLeft: isLargeScreen ? 24 : 0, marginTop: isLargeScreen ? 0 : 24 }]}>
                      <View style={styles.adminInfoPanelHeader}>
                        <Feather name="info" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.adminInfoPanelTitle}>Status Information</Text>
                      </View>

                      <View style={styles.adminInfoPanelBody}>
                        <View style={styles.statusInfoRow}>
                          <View style={[styles.statusIconCircle, { backgroundColor: "#FFFBEB" }]}>
                            <Feather name="clock" size={14} color="#D97706" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.statusInfoTitle}>Pending</Text>
                            <Text style={styles.statusInfoDesc}>Seller has submitted profile but not yet reviewed</Text>
                          </View>
                        </View>

                        <View style={styles.statusInfoRow}>
                          <View style={[styles.statusIconCircle, { backgroundColor: "#ECFDF5" }]}>
                            <Feather name="check-circle" size={14} color="#10B981" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.statusInfoTitle}>Active</Text>
                            <Text style={styles.statusInfoDesc}>Seller is approved and can sell products</Text>
                          </View>
                        </View>

                        <View style={styles.statusInfoRow}>
                          <View style={[styles.statusIconCircle, { backgroundColor: "#FEF2F2" }]}>
                            <Feather name="x-circle" size={14} color="#EF4444" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.statusInfoTitle}>Rejected</Text>
                            <Text style={styles.statusInfoDesc}>Seller application has been rejected</Text>
                          </View>
                        </View>

                        <View style={styles.statusInfoRow}>
                          <View style={[styles.statusIconCircle, { backgroundColor: "#F3F4F6" }]}>
                            <Feather name="pause-circle" size={14} color="#6B7280" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.statusInfoTitle}>Inactive</Text>
                            <Text style={styles.statusInfoDesc}>Seller account has been temporarily suspended</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            );
          })()
        ) : showPending ? (
          <>
            {/* --- PENDING HEADER (Dark-blue, matching other screens) --- */}
            <View style={styles.webHeaderContainer}>
              <View style={styles.webHeaderRow}>
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <TouchableOpacity
                    onPress={() => router.push("/approveseller")}
                    style={{ marginRight: 10 }}
                  >
                    <Feather name="arrow-left" size={24} color="#fff" />
                  </TouchableOpacity>
                  <View style={styles.webHeaderIconBox}>
                    <Feather name="users" size={20} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.webHeaderTitle}>Pending Sellers</Text>
                    <Text style={styles.webHeaderSubtitle}>
                      Sellers who completed KYC and are waiting for admin approval
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.webHeaderActionBtn}
                  onPress={() => router.push("/approveseller")}
                >
                  <Feather name="clock" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.webHeaderActionBtnText}>{pendingSellers.length} Pending</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* --- SEARCH TOOLBAR --- */}
            <View style={[styles.toolbar, isLargeScreen ? styles.rowLayout : styles.columnLayout]}>
              <View style={[styles.searchContainer, { flex: 1, marginRight: 0 }]}>
                <Ionicons name="search" size={20} color="#EA580C" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput as any}
                  placeholder="Search pending sellers..."
                  placeholderTextColor="#9CA3AF"
                  value={pendingSearchQuery}
                  onChangeText={(text) => { setPendingSearchQuery(text); setPendingCurrentPage(1); }}
                />
                {pendingSearchQuery ? (
                  <TouchableOpacity onPress={() => { setPendingSearchQuery(""); setPendingCurrentPage(1); }} style={styles.clearSearchBtn}>
                    <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* --- PENDING TABLE --- */}
            {pendingError ? (
              <TouchableOpacity onPress={() => void loadPendingSellers()}>
                <Text style={styles.loadErrorText}>{pendingError} — Tap to retry</Text>
              </TouchableOpacity>
            ) : null}
            {pendingLoading ? (
              <View style={{ padding: 24, alignItems: "center" }}>
                <ActivityIndicator size="small" color="#EA580C" />
                <Text style={styles.emptyText}>Loading pending sellers...</Text>
              </View>
            ) : (
            <View style={styles.tableCard}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableTh, { flex: 0.8 }]}>ID</Text>
                <Text style={[styles.tableTh, { flex: 1.8 }]}>Name</Text>
                <Text style={[styles.tableTh, { flex: 2 }]}>Business Name</Text>
                <Text style={[styles.tableTh, { flex: 2.2 }]}>Email</Text>
                <Text style={[styles.tableTh, { flex: 1.6 }]}>Mobile</Text>
                <Text style={[styles.tableTh, { flex: 1.4 }]}>Submitted On</Text>
                <Text style={[styles.tableTh, { flex: 1.2, textAlign: "center" }]}>Actions</Text>
              </View>

              {filteredPendingSellers.slice((pendingCurrentPage - 1) * itemsPerPage, pendingCurrentPage * itemsPerPage).map((seller) => (
                <View key={seller.id} style={styles.tableRow}>
                  <View style={[styles.tableCell, { flex: 0.8 }]}>
                    <View style={styles.idBadge}>
                      <Text style={styles.idBadgeText}>{seller.id}</Text>
                    </View>
                  </View>
                  <Text style={[styles.tableCellTextBold, { flex: 1.8 }]}>{seller.name}</Text>
                  <Text style={[styles.tableCellText, { flex: 2 }]}>{seller.businessName}</Text>
                  <Text style={[styles.tableCellText, { flex: 2.2 }]} numberOfLines={1}>{seller.email}</Text>
                  <Text style={[styles.tableCellText, { flex: 1.6 }]}>{seller.mobile}</Text>
                  <Text style={[styles.tableCellText, { flex: 1.4 }]}>{seller.submittedOn}</Text>
                  <View style={[styles.tableCellActions, { flex: 1.2, justifyContent: "center" }]}>
                    <TouchableOpacity
                      style={styles.pendingViewBtn}
                      onPress={() => void openPendingDetail(seller)}
                    >
                      <Text style={styles.pendingViewBtnText}>View</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {filteredPendingSellers.length === 0 && !pendingLoading && (
                <View style={styles.emptyTable}>
                  <Text style={styles.emptyText}>No pending sellers found.</Text>
                </View>
              )}
            </View>
            )}

            {/* --- FOOTER PAGINATION --- */}
            {filteredPendingSellers.length > 0 && (
              <Pagination
                currentPage={pendingCurrentPage}
                totalPages={Math.ceil(filteredPendingSellers.length / itemsPerPage)}
                totalItems={filteredPendingSellers.length}
                itemsPerPage={itemsPerPage}
                itemName="pending sellers"
                onPageChange={setPendingCurrentPage}
              />
            )}
          </>
        ) : (
          <>

            {/* --- PAGE HEADER (Dark-blue, matching other screens) --- */}
            <View style={styles.webHeaderContainer}>
              <View style={styles.webHeaderRow}>
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <View style={styles.webHeaderIconBox}>
                    <Feather name="check-circle" size={20} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.webHeaderTitle}>Approved Sellers</Text>
                    <Text style={styles.webHeaderSubtitle}>
                      Manage and monitor verified merchant accounts
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.webHeaderActionBtn}
                  onPress={() => router.push("/approveseller?tab=pending")}
                >
                  <Feather name="clock" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.webHeaderActionBtnText}>Pending Sellers</Text>
                </TouchableOpacity>
              </View>
            </View>

            {error ? (
              <TouchableOpacity onPress={() => void reload()}>
                <Text style={styles.loadErrorText}>{error} — Tap to retry</Text>
              </TouchableOpacity>
            ) : null}
            {loading ? (
              <View style={{ padding: 24, alignItems: "center" }}>
                <ActivityIndicator size="small" color="#EA580C" />
                <Text style={styles.emptyText}>Loading approved sellers...</Text>
              </View>
            ) : null}

            {!loading && !error ? (
              <>
            <View style={[styles.toolbar, isLargeScreen ? styles.rowLayout : styles.columnLayout]}>
              {/* Search Box */}
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#EA580C" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput as any}
                  placeholder="Search approved sellers..."
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    setActiveSearch(text);
                    setCurrentPage(1);
                  }}
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
                    <View key={item.name} style={[styles.insightsTableRow, idx % 2 === 1 && styles.rowAltBg]}>
                      <Text style={styles.insightsTdText}>{item.name}</Text>
                      <Text style={[styles.insightsTdCount, styles.alignRight]}>{item.count}</Text>
                    </View>
                  ))}
                  {stateCounts.length === 0 && (
                    <Text style={styles.emptyInsights}>No state data available</Text>
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
                    <View key={item.name} style={[styles.insightsTableRow, idx % 2 === 1 && styles.rowAltBg]}>
                      <Text style={styles.insightsTdText}>{item.name}</Text>
                      <Text style={[styles.insightsTdCount, styles.alignRight]}>{item.count}</Text>
                    </View>
                  ))}
                  {cityCounts.length === 0 && (
                    <Text style={styles.emptyInsights}>No city data available</Text>
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
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={[styles.tableCell, { flex: 2.2, flexDirection: "row", alignItems: "center" }]}
                      onPress={() => {
                        setSelectedSellerId(seller.id);
                        setAdminStatus(seller.status);
                      }}
                    >
                      {(seller.avatar && typeof seller.avatar === 'string' && seller.avatar.trim() !== '' && seller.avatar !== 'null' && seller.avatar !== 'N/A' && seller.avatar !== 'undefined') ? (<Image source={{ uri: seller.avatar }} style={styles.sellerAvatar} />) : (<View style={[styles.sellerAvatar, { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }]}><Feather name="user" size={16} color="#9CA3AF" /></View>)}
                      <View style={styles.sellerMeta}>
                        <Text style={styles.sellerName}>{seller.name}</Text>
                        <Text style={styles.sellerEmail} numberOfLines={1}>{seller.email}</Text>
                      </View>
                    </TouchableOpacity>
                    <Text style={[styles.tableCellTextBold, { flex: 2 }]}>{seller.businessName}</Text>
                    <Text style={[styles.tableCellText, { flex: 1.8 }]}>{seller.businessType}</Text>
                    <Text style={[styles.tableCellText, { flex: 0.8, textAlign: "center" }]}>{seller.products}</Text>
                    <Text style={[styles.tableCellCurrency, { flex: 1.2, textAlign: "right" }]}>
                      {formatRupee(seller.walletBalance)}
                    </Text>
                    <Text style={[styles.tableCellText, { flex: 1.2, textAlign: "center" }]}>{seller.joinDate}</Text>
                    <Text style={[styles.tableCellCurrency, { flex: 1.2, textAlign: "right" }]}>
                      {formatRupee(seller.revenue)}
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
                        onPress={() => {
                          setMessageSeller(seller);
                          setMessageModalVisible(true);
                        }}
                      >
                        <Ionicons name="chatbubble-ellipses" size={15} color="#FFFFFF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBlockBtn, seller.status === "Blocked" && styles.actionBlockBtnActive]}
                        onPress={() => {
                          if (seller.status === "Active") {
                            setDeactivateSeller(seller);
                            setDeactivateReason("");
                            setDeactivateModalVisible(true);
                          } else {
                            void (async () => {
                              try {
                                await unblockSeller(seller.id);
                                setData((prev) =>
                                  prev.map((s) => (s.id === seller.id ? { ...s, status: "Active" } : s))
                                );
                                showToast("Seller successfully unblocked!", "success");
                              } catch (e) {
                                showToast(getApiErrorMessage(e, "Failed to unblock seller."), "error");
                              }
                            })();
                          }
                        }}
                      >
                        <Ionicons
                          name="close-circle"
                          size={15}
                          color={seller.status === "Blocked" ? "#FFFFFF" : "#EF4444"}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionDeleteBtn}
                        onPress={() => {
                          setDeleteSeller(seller);
                          setDeleteReason("");
                          setDeleteModalVisible(true);
                        }}
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
                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
                        onPress={() => {
                          setSelectedSellerId(seller.id);
                          setAdminStatus(seller.status);
                        }}
                      >
                        {(seller.avatar && typeof seller.avatar === 'string' && seller.avatar.trim() !== '' && seller.avatar !== 'null' && seller.avatar !== 'N/A' && seller.avatar !== 'undefined') ? (<Image source={{ uri: seller.avatar }} style={styles.cardAvatar} />) : (<View style={[styles.cardAvatar, { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }]}><Feather name="user" size={20} color="#9CA3AF" /></View>)}
                        <View style={styles.cardTitleContainer}>
                          <Text style={styles.cardName}>{seller.name}</Text>
                          <Text style={styles.cardEmail} numberOfLines={1}>{seller.email}</Text>
                        </View>
                      </TouchableOpacity>
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
                        onPress={() => {
                          setMessageSeller(seller);
                          setMessageModalVisible(true);
                        }}
                      >
                        <Ionicons name="chatbubble-ellipses" size={15} color="#FFFFFF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.cardActionBtn,
                          styles.actionBlockBtn,
                          seller.status === "Blocked" && styles.actionBlockBtnActive,
                        ]}
                        onPress={() => {
                          if (seller.status === "Active") {
                            setDeactivateSeller(seller);
                            setDeactivateReason("");
                            setDeactivateModalVisible(true);
                          } else {
                            void (async () => {
                              try {
                                await unblockSeller(seller.id);
                                setData((prev) =>
                                  prev.map((s) => (s.id === seller.id ? { ...s, status: "Active" } : s))
                                );
                                showToast("Seller successfully unblocked!", "success");
                              } catch (e) {
                                showToast(getApiErrorMessage(e, "Failed to unblock seller."), "error");
                              }
                            })();
                          }
                        }}
                      >
                        <Ionicons
                          name="close-circle"
                          size={15}
                          color={seller.status === "Blocked" ? "#FFFFFF" : "#EF4444"}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.cardActionBtn, styles.actionDeleteBtn]}
                        onPress={() => {
                          setDeleteSeller(seller);
                          setDeleteReason("");
                          setDeleteModalVisible(true);
                        }}
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
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredSellers.length / itemsPerPage)}
                totalItems={filteredSellers.length}
                itemsPerPage={itemsPerPage}
                itemName="approved sellers"
                onPageChange={setCurrentPage}
              />
            )}
          </>
            ) : null}
          </>
        )}

        {/* --- COPYRIGHT FOOTER --- */}
        <View style={styles.footerCopyright}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
            <Text style={styles.footerCopyrightText}>2026 © Flintnthread India Pvt. Ltd. Crafted by </Text>
            <Feather name="heart" size={12} color="#EF4444" />
            <Text style={styles.footerCopyrightText}> Flintnthread India Pvt. Ltd.</Text>
          </View>
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

      {/* --- SEND MESSAGE MODAL --- */}
      {messageModalVisible && messageSeller && (
        <Modal
          visible={messageModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMessageModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.messageModalContent}>
              {/* Header */}
              <View style={styles.messageModalHeader}>
                <View style={styles.messageHeaderLeft}>
                  <View style={styles.messageIconContainer}>
                    <Feather name="mail" size={20} color="#EA580C" />
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.messageTitle}>Send Message</Text>
                    <Text style={styles.messageSubtitle}>to {messageSeller.name}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setMessageModalVisible(false)}>
                  <Feather name="x" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Body */}
              <View style={styles.messageModalBody}>
                <Text style={styles.messageFormLabel}>Subject</Text>
                <TextInput
                  style={styles.messageFormInput}
                  placeholder="Enter message subject..."
                  placeholderTextColor="#9CA3AF"
                  value={messageSubject}
                  onChangeText={setMessageSubject}
                />

                <Text style={[styles.messageFormLabel, { marginTop: 16 }]}>Message</Text>
                <TextInput
                  style={styles.messageFormTextArea}
                  placeholder="Type your message here..."
                  placeholderTextColor="#9CA3AF"
                  value={messageBody}
                  onChangeText={setMessageBody}
                  multiline
                  numberOfLines={5}
                />
              </View>

              {/* Footer */}
              <View style={styles.messageModalFooter}>
                <TouchableOpacity
                  style={styles.messageCancelBtn}
                  onPress={() => setMessageModalVisible(false)}
                >
                  <Feather name="x" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.messageCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.messageSendBtn}
                  onPress={() => {
                    if (!messageSubject.trim() || !messageBody.trim()) {
                      showToast("Subject and message are required", "error");
                      return;
                    }
                    setMessageModalVisible(false);
                    setMessageSubject("");
                    setMessageBody("");
                    showToast("Message sent successfully!", "success");
                  }}
                >
                  <Feather name="send" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.messageSendBtnText}>Send Message</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* --- DEACTIVATE SELLER MODAL --- */}
      {deactivateModalVisible && deactivateSeller && (
        <Modal
          visible={deactivateModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setDeactivateModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.messageModalContent}>
              {/* Header */}
              <View style={[styles.messageModalHeader, { backgroundColor: "#DC2626" }]}>
                <View style={styles.messageHeaderLeft}>
                  <View style={styles.messageIconContainer}>
                    <Feather name="user-x" size={20} color="#DC2626" />
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.messageTitle}>Deactivate Seller</Text>
                    <Text style={styles.messageSubtitle}>This action will deactivate the seller account</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setDeactivateModalVisible(false)}>
                  <Feather name="x" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Body */}
              <View style={styles.messageModalBody}>
                {/* Warning Banner */}
                <View style={styles.warningBanner}>
                  <Feather name="alert-triangle" size={24} color="#D97706" style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.warningBannerTitle}>Warning</Text>
                    <Text style={styles.warningBannerText}>
                      Are you sure you want to deactivate <Text style={{ fontWeight: '700' }}>{deactivateSeller.name}</Text>?
                    </Text>
                  </View>
                </View>

                <Text style={[styles.messageFormLabel, { marginTop: 16 }]}>Reason for Deactivation</Text>
                <TextInput
                  style={styles.messageFormTextArea}
                  placeholder="Please provide a reason for deactivating this seller..."
                  placeholderTextColor="#9CA3AF"
                  value={deactivateReason}
                  onChangeText={setDeactivateReason}
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* Footer */}
              <View style={styles.messageModalFooter}>
                <TouchableOpacity
                  style={styles.messageCancelBtn}
                  onPress={() => setDeactivateModalVisible(false)}
                >
                  <Feather name="x" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.messageCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.messageSendBtn, { backgroundColor: "#DC2626" }]}
                  onPress={handleConfirmDeactivate}
                >
                  <Ionicons name="close-circle" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.messageSendBtnText}>Deactivate</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* --- DELETE SELLER MODAL --- */}
      {deleteModalVisible && deleteSeller && (
        <Modal
          visible={deleteModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setDeleteModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.messageModalContent}>
              {/* Header */}
              <View style={[styles.messageModalHeader, { backgroundColor: "#991B1B" }]}>
                <View style={styles.messageHeaderLeft}>
                  <View style={styles.messageIconContainer}>
                    <Feather name="trash-2" size={20} color="#991B1B" />
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.messageTitle}>Delete Seller</Text>
                    <Text style={styles.messageSubtitle}>This action cannot be undone</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setDeleteModalVisible(false)}>
                  <Feather name="x" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Body */}
              <View style={styles.messageModalBody}>
                {/* Danger Zone Banner */}
                <View style={styles.dangerBanner}>
                  <Feather name="alert-circle" size={24} color="#DC2626" style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dangerBannerTitle}>Danger Zone</Text>
                    <Text style={styles.dangerBannerText}>
                      Are you sure you want to permanently delete <Text style={{ fontWeight: '700' }}>{deleteSeller.name}</Text>? This action cannot be undone and will remove all seller data.
                    </Text>
                  </View>
                </View>

                <Text style={[styles.messageFormLabel, { marginTop: 16 }]}>Reason for Deletion</Text>
                <TextInput
                  style={styles.messageFormTextArea}
                  placeholder="Please provide a reason for deleting this seller..."
                  placeholderTextColor="#9CA3AF"
                  value={deleteReason}
                  onChangeText={setDeleteReason}
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* Footer */}
              <View style={styles.messageModalFooter}>
                <TouchableOpacity
                  style={styles.messageCancelBtn}
                  onPress={() => setDeleteModalVisible(false)}
                >
                  <Feather name="x" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.messageCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.messageSendBtn, { backgroundColor: "#DC2626" }]}
                  onPress={handleConfirmDelete}
                >
                  <Feather name="trash-2" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.messageSendBtnText}>Delete Permanently</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

            {/* --- DOCUMENT PREVIEW MODAL --- */}
      {previewDoc && (
        <Modal
          visible={!!previewDoc}
          onRequestClose={() => setPreviewDoc(null)}
          transparent
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { width: isLargeScreen ? '80%' : '92%', maxWidth: 800, padding: 0 }]}>
              <View style={[styles.modalHeader, { padding: isLargeScreen ? 20 : 16 }]}>
                <Text style={styles.modalTitle}>{previewDoc.name} Preview</Text>
                <TouchableOpacity onPress={() => setPreviewDoc(null)}>
                  <Feather name="x" size={isLargeScreen ? 24 : 20} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <View style={{ width: '100%', height: isLargeScreen ? 500 : 360, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, overflow: 'hidden' }}>
                <Image 
                  source={{ uri: previewDoc.url }} 
                  resizeMode="contain"
                  style={{ width: '100%', height: '100%' }} 
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* --- TOAST CONTAINER --- */}
      <View style={styles.toastContainer} pointerEvents="box-none">
        {toasts.map((toast) => (
          <View
            key={toast.id}
            style={[
              styles.toast,
              toast.type === "success" ? styles.toastSuccess : styles.toastError,
            ]}
          >
            <Feather
              name={toast.type === "success" ? "check-circle" : "alert-circle"}
              size={18}
              color="#FFFFFF"
            />
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        ))}
      </View>
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
  rowLayout: {
    flexDirection: "row",
  },
  columnLayout: {
    flexDirection: "column",
  },

  // --- WEB HEADER (Dark-blue, matching other screens) ---
  webHeaderContainer: {
    backgroundColor: "#151D4F",
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 24,
  },
  webHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  webHeaderIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#ef7b1a",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  webHeaderTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  webHeaderSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    marginTop: 4,
  },
  webHeaderActionBtn: {
    flexDirection: "row",
    height: 38,
    paddingHorizontal: 16,
    backgroundColor: "#EA580C",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  webHeaderActionBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
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
    backgroundColor: "#1d324e",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  bannerBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  bannerBackBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
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
    position: "relative",
    zIndex: 10,
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
    ...(Platform.OS === "web" ? { outlineStyle: "none" } : {}),
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
    zIndex: 100,
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
  loadErrorText: {
    color: "#DC2626",
    fontSize: 14,
    marginVertical: 8,
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
    gap: 8,
  },
  pageBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  pageBtnDisabled: {
    backgroundColor: "#FFFFFF",
    borderColor: "#F3F4F6",
    opacity: 0.5,
  },
  pageNumber: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  pageNumberActive: {
    backgroundColor: "#1E293B",
    borderColor: "#1E293B",
  },
  pageNumberText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },
  pageNumberTextActive: {
    color: "#FFFFFF",
  },
  ellipses: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
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
    backgroundColor: "#1d324e",
    borderRadius: 12,
    padding: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 20,
  },
  headerBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  headerBackBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
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
    backgroundColor: "#1d324e",
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
  messageModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    width: "90%",
    maxWidth: 500,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    overflow: "hidden",
  },
  messageModalHeader: {
    backgroundColor: "#EA580C",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  messageHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  messageIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  messageTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  messageSubtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 13,
    marginTop: 2,
  },
  messageModalBody: {
    padding: 20,
  },
  messageFormLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  messageFormInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1F2937",
    height: 44,
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
  },
  messageFormTextArea: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1F2937",
    height: 120,
    backgroundColor: "#FFFFFF",
    textAlignVertical: "top",
  },
  messageModalFooter: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  messageCancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4B5563",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    height: 44,
  },
  messageCancelBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  messageSendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EA580C",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1.2,
    height: 44,
  },
  messageSendBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  toastContainer: {
    position: "absolute",
    top: 24,
    right: 24,
    zIndex: 9999,
    gap: 10,
    alignItems: "flex-end",
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 260,
    maxWidth: 360,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  toastSuccess: {
    backgroundColor: "#10B981",
  },
  toastError: {
    backgroundColor: "#EF4444",
  },
  toastText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 8,
    flex: 1,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderColor: "#F59E0B",
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  warningBannerTitle: {
    color: "#92400E",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  warningBannerText: {
    color: "#B45309",
    fontSize: 13,
    lineHeight: 18,
  },
  dangerBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderColor: "#EF4444",
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  dangerBannerTitle: {
    color: "#991B1B",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  dangerBannerText: {
    color: "#B91C1C",
    fontSize: 13,
    lineHeight: 18,
  },

});

const stylesMobile = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    flexDirection: "row",
  },
  drawerPanel: {
    width: 260,
    backgroundColor: "#FFFFFF",
    height: "100%",
    paddingTop: Platform.OS === "ios" ? 44 : 28,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  drawerHeaderText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1E293B",
  },
  drawerContent: {
    paddingTop: 12,
  },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 8,
    marginVertical: 2,
  },
  drawerItemText: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "500",
  },
  newTopBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingTop: Platform.OS === 'ios' ? 44 : 28,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    gap: 8,
  },
  topBarSearchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
  },
  topBarSearchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1E293B",
    padding: 0,
  },
  topBarIconBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  topBarBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#EF4444",
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "bold",
  },
  topBarAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0D9488",
    alignItems: "center",
    justifyContent: "center",
  },
  topBarAvatarText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  pageBannerCard: {
    backgroundColor: "#1D324E",
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  pageBannerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 2,
  },
  pageBannerSubtitle: {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 12,
    fontWeight: "500",
  },
  breadcrumbContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  breadcrumbLink: {
    color: "#EA580C",
    fontSize: 13,
    fontWeight: "600",
  },
  breadcrumbSeparator: {
    color: "#94A3B8",
    fontSize: 12,
  },
  breadcrumbCurrent: {
    color: "#94A3B8",
    fontSize: 13,
  },
  header: {
    backgroundColor: "#0a192f", // Deep navy blue
    // reduced size by ~30% for app-only header
    paddingTop: Platform.OS === 'ios' ? 42 : 31,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    height:90,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeftBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 2,
  },
  headerSubtitle: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 11,
    marginTop: 2,
  },
  headerRightBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: -1,
    right: 3,
    backgroundColor: "#EA580C",
    width: 12,
    height: 12,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 12, // spacing below the reduced mobile header
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInputMobile: {
    flex: 1,
    fontSize: 14,
    color: "#1E293B",
  },
  clearSearchBtn: {
    marginLeft: 8,
  },
  searchFilterBtn: {
    width: 48,
    height: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginLeft: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionButtonsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 12,
    gap: 12,
  },
  actionOutlineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#EA580C",
    borderRadius: 12,
    height: 44,
    backgroundColor: "#FFFFFF",
  },
  actionOutlineBtnText: {
    color: "#EA580C",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    width: "48%", // two columns
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
  },
  statLabel: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  insightsContainer: {
    paddingHorizontal: 20,
  },
  insightsSubHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  insightsSubTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  insightsViewAll: {
    fontSize: 12,
    fontWeight: "600",
    color: "#EA580C",
  },
  insightsScroll: {
    paddingBottom: 8,
  },
  insightCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    width: 105,
    height: 115,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  insightIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  insightCardName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
  },
  insightCardCount: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },
  emptyInsightsText: {
    fontSize: 12,
    color: "#94A3B8",
    paddingVertical: 12,
  },
  sortButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: "#FFFFFF",
  },
  sortButtonRowText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#EA580C",
    marginLeft: 6,
  },
  mobileSortMenu: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  mobileSortMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  mobileSortMenuText: {
    fontSize: 13,
    color: "#334155",
  },
  mobileSortMenuTextActive: {
    color: "#EA580C",
    fontWeight: "600",
  },
  sellerListContainer: {
    paddingHorizontal: 20,
  },
  sellerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  sellerCardBlocked: {
    opacity: 0.7,
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  sellerCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sellerCardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  sellerCardMeta: {
    marginLeft: 12,
    flex: 1,
  },
  sellerCardName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  sellerCardBusiness: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  typeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  typeBadgeDetail: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: "center",
  },
  badgePurple: {
    backgroundColor: "#F5F3FF",
  },
  badgeTextPurple: {
    color: "#8B5CF6",
  },
  badgeBlue: {
    backgroundColor: "#EFF6FF",
  },
  badgeTextBlue: {
    color: "#3B82F6",
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  sellerCardStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingVertical: 12,
    marginVertical: 12,
  },
  sellerCardStatItem: {
    alignItems: "flex-start",
    flex: 1,
  },
  sellerCardStatVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
  },
  sellerCardStatLabel: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },
  sellerCardActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
  },
  circleActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyListContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyListText: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 12,
  },
  fab: {
    position: "absolute",
    bottom: 84,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EA580C",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 99,
  },
  bottomTabNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingBottom: Platform.OS === "ios" ? 12 : 0,
    zIndex: 100,
  },
  bottomTabItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  bottomTabLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 4,
  },
  detailsHeader: {
    height: Platform.OS === 'ios' ? 96 : 80,
    paddingTop: Platform.OS === 'ios' ? 44 : 28,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  detailsHeaderBack: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  detailsHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
  },
  detailsHeaderMore: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  detailsProfileCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  detailsLargeAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  detailsProfileName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  detailsProfileBusiness: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },
  detailsListCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  detailRowMobile: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  detailIconBoxMobile: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  detailContentMobile: {
    flex: 1,
  },
  detailLabelMobile: {
    fontSize: 13,
    color: "#475569",
  },
  detailRowValMobile: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailValMobile: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  detailsBottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 10,
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
    zIndex: 100,
  },
  detailsBottomBtn: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  detailsBottomIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  detailsBottomBtnText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  filterOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  filterSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    paddingHorizontal: 20,
    maxHeight: "85%",
  },
  filterDragHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#CBD5E1",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  filterResetText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#EA580C",
  },
  filterBody: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginTop: 16,
    marginBottom: 8,
  },
  filterSelectBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    backgroundColor: "#F8FAFC",
  },
  filterSelectText: {
    fontSize: 14,
    color: "#334155",
  },
  filterSelectDropdown: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 4,
    padding: 4,
  },
  filterSelectOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  filterSelectOptionText: {
    fontSize: 13,
    color: "#334155",
  },
  rangeInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rangeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    backgroundColor: "#F8FAFC",
    fontSize: 14,
    color: "#334155",
  },
  rangeDivider: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  filterApplyBtn: {
    backgroundColor: "#EA580C",
    borderRadius: 12,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  filterApplyBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  statusSelectRow: {
    flexDirection: "row",
    gap: 12,
  },
  statusChip: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  statusChipActive: {
    borderColor: "#EA580C",
    backgroundColor: "#FFF7ED",
  },
  statusChipText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  statusChipTextActive: {
    color: "#EA580C",
    fontWeight: "600",
  },
  kycChipsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  kycChip: {
    width: "48%", // 2 columns
    height: 44,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  kycChipActive: {
    borderColor: "#EA580C",
    backgroundColor: "#FFF7ED",
  },
  kycChipText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  kycChipTextActive: {
    color: "#EA580C",
    fontWeight: "600",
  },
  editRemarksInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F8FAFC",
    fontSize: 14,
    color: "#334155",
    textAlignVertical: "top",
    minHeight: 80,
  },
  insightRowItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  insightIconBoxMini: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  insightRowName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },
  insightRowCount: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  // --- REDESIGNED SELLER DETAILS STYLES ---
  labelValueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  rowLabelText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  rowValueText: {
    fontSize: 13,
    color: "#1E293B",
    fontWeight: "600",
    textAlign: "right",
    flex: 0.7,
  },
  kycStatusCardMobile: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  kycCardHeaderMobile: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 8,
  },
  kycCardTitleMobile: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  kycNotCompletedBadgeMobile: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  kycNotCompletedTextMobile: {
    color: "#EF4444",
    fontSize: 10,
    fontWeight: "600",
  },
  kycStatusGridMobile: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  kycStatusCellMobile: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: "#FAFAFA",
  },
  kycStatusValMobile: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
    marginVertical: 4,
  },
  kycStatusLabelMobile: {
    fontSize: 8,
    color: "#64748B",
    fontWeight: "500",
    textAlign: "center",
  },
  redesignedDetailCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitleRowMobile: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  cardHeaderTitleMobile: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  cardBodyMobile: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  documentRowMobile: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  documentLeftMobile: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  documentIconBoxMobile: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  documentNameTextMobile: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },
  documentSizeTextMobile: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  documentViewBtnMobile: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EA580C",
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#FFF7ED",
  },
  documentViewBtnTextMobile: {
    fontSize: 12,
    fontWeight: "600",
    color: "#EA580C",
  },
  statsGridMobile: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 12,
    gap: 8,
  },
  statCellMobile: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  statIconContainerMobile: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValMobile: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  statLabelMobile: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
    textAlign: "center",
  },
  remarksTextValMobile: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
  },
  stickyBottomActionsRow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
    zIndex: 100,
  },
  stickyActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginHorizontal: 3,
    borderRadius: 8,
    gap: 4,
  },
  stickyActionBtnText: {
    fontSize: 11,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  stickyBottomBarTwo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
    zIndex: 100,
  },
  stickyBottomBtnBig: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
  },
  stickyBottomBtnBigText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  dateInputWrapperMobile: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  dateIconMobile: {
    position: "absolute",
    right: 14,
  },
  headerCenterContainerMobile: {
    flex: 1,
    marginLeft: 16,
  },
  headerSellerNameMobile: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  headerSellerIdMobile: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
    marginTop: 2,
  },
  headerRightContainerMobile: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  headerStatusBadgeMobile: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  headerStatusActiveMobile: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  headerStatusBlockedMobile: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
  },
  headerStatusBadgeTextMobile: {
    fontSize: 11,
    fontWeight: "600",
  },
  kycStatusCardMobileInner: {
    marginTop: 16,
    width: "100%",
  },
  quickActionsCardMobile: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginTop: 16,
    gap: 8,
  },
  quickActionBtnMobile: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  quickActionIconCircleMobile: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  quickActionBtnTextMobile: {
    fontSize: 11,
    fontWeight: "600",
  },
  documentRowRedesigned: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  documentLeftInfoMobile: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  documentThumbBoxMobile: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  documentMiniThumbMobile: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  docNameTitleMobile: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },
  docStatusBadgeMobile: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  docStatusTextMobile: {
    fontSize: 11,
    color: "#10B981",
    fontWeight: "500",
  },
  docRedesignedViewBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EA580C",
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  docRedesignedViewBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  docSectionSubTitleMobile: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 16,
    marginBottom: 8,
  },
  businessProofContainerMobile: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#FAFAFA",
  },
  businessProofImgMobile: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  businessProofViewBtnMobile: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EA580C",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  businessProofViewBtnTextMobile: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  selfieScrollMobile: {
    flexDirection: "row",
    marginTop: 4,
  },
  selfieThumbWrapperMobile: {
    width: 64,
    height: 64,
    borderRadius: 8,
    marginRight: 10,
    position: "relative",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  selfieMiniThumbMobile: {
    width: "100%",
    height: "100%",
    borderRadius: 7,
  },
  selfieBadgeMobile: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderRadius: 10,
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  selfieBadgeTextMobile: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
});
