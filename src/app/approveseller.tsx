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
  ActivityIndicator,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import AdminLayout from "@/components/admin-layout";
import { useAsyncLoad } from "@/hooks/useAsyncLoad";
import { getApiErrorMessage } from "@/lib/api/client";
import { mapSellerToApprovedRow } from "@/lib/mappers";
import { blockSeller, fetchSellers, unblockSeller } from "@/services/sellerApi";

type Seller = ReturnType<typeof mapSellerToApprovedRow>;

export default function ApprovedSellersScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const isLargeScreen = windowWidth >= 1024;

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
            {loading && (
              <ActivityIndicator size="large" color="#EA580C" style={{ marginVertical: 24 }} />
            )}
            {error ? (
              <Text style={styles.loadErrorText}>{error}</Text>
            ) : null}

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
                  onPress={() => Alert.alert("Navigate", "Go to Pending Sellers")}
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
                        onPress={() => Alert.alert("View Details", `${seller.name}\n${seller.businessName}`)}
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
                        onPress={() => Alert.alert("View Details", `${seller.name}\n${seller.businessName}`)}
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
      </ScrollView>
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
});
