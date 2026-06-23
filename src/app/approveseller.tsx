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
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import AdminLayout from "@/components/admin-layout";
import { router, useLocalSearchParams } from "expo-router";
import Pagination from "@/components/Pagination";
import { useAuth } from "@/context/auth-context";
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
export default function ApprovedSellersScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const isLargeScreen = windowWidth >= 1024;
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const showPending = tab === "pending";
  const { token, isLoading: authLoading } = useAuth();

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

  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [sortBy, setSortBy] = useState("Name");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [pendingCurrentPage, setPendingCurrentPage] = useState(1);

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

  return (
    <AdminLayout>
      <ScrollView
        style={styles.scrollBody}
        contentContainerStyle={styles.scrollBodyContent}
        showsVerticalScrollIndicator={false}
      >       {selectedSellerId !== null ? (
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
            {/* --- PENDING HEADER BANNER CARD --- */}
            <View style={styles.pageHeaderCard}>
              <View style={styles.bannerTop}>
                <TouchableOpacity
                    style={styles.bannerBackBtn}
                    onPress={() => router.push("/approveseller")}
                  >
                  <Feather name="arrow-left" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.bannerBackBtnText}>Back</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.bannerBottom, isLargeScreen ? styles.rowLayout : styles.columnLayout]}>
                <View style={styles.bannerBottomLeft}>
                  <View style={styles.overlapBadgeContainer}>
                    <View style={styles.overlapBadgeCircle}>
                      <Feather name="map-pin" size={20} color="#FFFFFF" />
                    </View>
                  </View>
                  
                  <View style={styles.bannerTitleContainer}>
                    <Text style={styles.bannerTitle}>Pending Sellers</Text>
                    <View style={styles.breadcrumbs}>
                      <Feather name="home" size={12} color="#EA580C" style={styles.breadcrumbHomeIcon} />
                      <TouchableOpacity onPress={() => router.push("/approveseller")}>
                        <Text style={styles.breadcrumbActive}>Dashboard</Text>
                      </TouchableOpacity>
                      <Feather name="chevron-right" size={10} color="#9CA3AF" style={styles.breadcrumbSeparator} />
                      <Text style={styles.breadcrumbText}>Pending Sellers</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.bannerPendingBadge}
                  onPress={() => router.push("/approveseller")}
                >
                  <Feather name="clock" size={14} color="#1F2937" />
                  <Text style={styles.bannerPendingBadgeText}>{pendingSellers.length} Pending</Text>
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

                <TouchableOpacity
                  style={styles.bannerActionBtn}
                  onPress={() => router.push("/approveseller?tab=pending")}
                >
                  <Feather name="clock" size={14} color="#FFFFFF" style={styles.bannerActionIcon} />
                  <Text style={styles.bannerActionBtnText}>Pending Sellers</Text>
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
                          name="ban"
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
                          name="ban"
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
                  <Ionicons name="ban" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
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
            <View style={[styles.modalContent, { width: '80%', maxWidth: 800, padding: 0 }]}>
              <View style={[styles.modalHeader, { padding: 20 }]}>
                <Text style={styles.modalTitle}>{previewDoc.name} Preview</Text>
                <TouchableOpacity onPress={() => setPreviewDoc(null)}>
                  <Feather name="x" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <View style={{ width: '100%', height: 500, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, overflow: 'hidden' }}>
                <Image 
                  source={{ uri: previewDoc.url }} 
                  style={{ width: '100%', height: '100%', resizeMode: 'contain' }} 
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
