import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  Platform,
  useWindowDimensions,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type SlabStatus = "Active" | "Inactive";

interface WeightSlab {
  id: number;
  label: string;
  range: string;
  iconColor: string;
  iconBg: string;
  intracity: string;
  metroMetro: string;
  status: SlabStatus;
}

// ─── DATA ─────────────────────────────────────────────────────────────────────
const initialSlabs: WeightSlab[] = [
  {
    id: 1,
    label: "0 – 500 gms",
    range: "0 – 500g",
    iconColor: "#7C3AED",
    iconBg: "#EDE9FE",
    intracity: "₹0.00",
    metroMetro: "₹25.00",
    status: "Inactive",
  },
  {
    id: 2,
    label: "500 gms – 1 kg",
    range: "0.500kg – 1.000kg",
    iconColor: "#059669",
    iconBg: "#D1FAE5",
    intracity: "₹20.00",
    metroMetro: "₹25.00",
    status: "Active",
  },
  {
    id: 3,
    label: "1 – 2 kg",
    range: "1.000kg – 2.000kg",
    iconColor: "#D97706",
    iconBg: "#FEF3C7",
    intracity: "₹80.00",
    metroMetro: "₹95.00",
    status: "Active",
  },
  {
    id: 4,
    label: "2 – 5 kg",
    range: "2.000kg – 5.000kg",
    iconColor: "#2563EB",
    iconBg: "#DBEAFE",
    intracity: "₹175.00",
    metroMetro: "₹205.00",
    status: "Active",
  },
  {
    id: 5,
    label: "Above 5 kg",
    range: "Above 5.000kg",
    iconColor: "#7C3AED",
    iconBg: "#EDE9FE",
    intracity: "₹400.00",
    metroMetro: "₹499.99",
    status: "Active",
  },
];

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

const BagIcon: React.FC<{ color: string; bg: string }> = ({ color, bg }) => (
  <View style={[styles.iconWrapper, { backgroundColor: bg }]}>
    {/* Simplified bag shape using nested Views */}
    <View style={[styles.bagBottom, { borderColor: color }]}>
      <View style={[styles.bagHandle, { borderColor: color }]} />
    </View>
  </View>
);

const StatusBadge: React.FC<{ status: SlabStatus }> = ({ status }) => (
  <View
    style={[
      styles.statusBadge,
      {
        backgroundColor: status === "Active" ? "#D1FAE5" : "#FEE2E2",
      },
    ]}
  >
    <Text
      style={[
        styles.statusText,
        { color: status === "Active" ? "#059669" : "#DC2626" },
      ]}
    >
      {status}
    </Text>
  </View>
);

const FixedRateBadge: React.FC = () => (
  <View style={styles.fixedRateRow}>
    <View style={styles.checkCircle}>
      <Text style={styles.checkMark}>✓</Text>
    </View>
    <Text style={styles.fixedRateText}>Fixed Rate</Text>
  </View>
);

// ─── SLAB CARD ────────────────────────────────────────────────────────────────
const SlabCard: React.FC<{
  slab: WeightSlab;
  onActivate: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}> = ({ slab, onActivate, onEdit, onDelete }) => (
  <View style={styles.card}>
    {/* Card Header */}
    <View style={styles.cardHeader}>
      <View style={styles.cardHeaderLeft}>
        <BagIcon color={slab.iconColor} bg={slab.iconBg} />
        <View style={styles.cardTitleBlock}>
          <Text style={styles.cardTitle}>{slab.label}</Text>
          <Text style={styles.cardRange}>{slab.range}</Text>
        </View>
      </View>
      <StatusBadge status={slab.status} />
    </View>

    {/* Price Row */}
    <View style={styles.priceRow}>
      <View style={styles.priceBlock}>
        <Text style={styles.priceLabel}>Intra-City</Text>
        <Text style={styles.priceValue}>{slab.intracity}</Text>
      </View>
      <View style={styles.priceDivider} />
      <View style={styles.priceBlock}>
        <Text style={styles.priceLabel}>Metro-Metro</Text>
        <Text style={styles.priceValue}>{slab.metroMetro}</Text>
      </View>
    </View>

    <FixedRateBadge />

    {/* Divider */}
    <View style={styles.cardDivider} />

    {/* Action Buttons */}
    <View style={styles.actionRow}>
      <TouchableOpacity
        style={styles.btnOutline}
        onPress={() => onDelete(slab.id)}
        activeOpacity={0.75}
      >
        <Feather name="trash-2" size={13} color="#ef7b1a" />
        <Text style={styles.btnOutlineText}>Delete</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.btnEdit}
        onPress={() => onEdit(slab.id)}
        activeOpacity={0.75}
      >
        <Feather name="edit-2" size={13} color="#ef7b1a" />
        <Text style={styles.btnEditText}>Edit</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// ─── STATS FOOTER ─────────────────────────────────────────────────────────────
const StatsFooter: React.FC<{ slabs: WeightSlab[] }> = ({ slabs }) => {
  const total = slabs.length;
  const active = slabs.filter((s) => s.status === "Active").length;
  const inactive = slabs.filter((s) => s.status === "Inactive").length;

  const highestIntra = slabs.reduce((max, s) => {
    const val = parseFloat(s.intracity.replace("₹", ""));
    return val > max.val ? { val, display: s.intracity } : max;
  }, { val: 0, display: "₹0.00" });

  const highestMetro = slabs.reduce((max, s) => {
    const val = parseFloat(s.metroMetro.replace("₹", ""));
    return val > max.val ? { val, display: s.metroMetro } : max;
  }, { val: 0, display: "₹0.00" });

  const statsData = [
    { icon: "layers" as any, value: String(total), label: "Total Slabs", sub: "Configured", tint: "#EDE9FE", textColor: "#7C3AED" },
    { icon: "check" as any, value: String(active), label: "Active Slabs", sub: "Currently active", tint: "#D1FAE5", textColor: "#059669" },
    { icon: "x" as any, value: String(inactive), label: "Inactive Slabs", sub: "Not active", tint: "#FEE2E2", textColor: "#DC2626" },
    { icon: "dollar-sign" as any, value: highestIntra.display, label: "Highest Intra-City", sub: "Above 5 kg", tint: "#EDE9FE", textColor: "#7C3AED" },
    { icon: "dollar-sign" as any, value: highestMetro.display, label: "Highest Metro-Metro", sub: "Above 5 kg", tint: "#EDE9FE", textColor: "#7C3AED" },
  ];

  return (
    <View style={styles.statsContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
        {statsData.map((stat, index) => (
          <View key={index} style={styles.statItem}>
            <View style={[styles.statIconCircle, { backgroundColor: stat.tint }]}>
              <Feather name={stat.icon} size={14} color={stat.textColor} />
            </View>
            <Text style={[styles.statValue, { color: stat.textColor }]}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
            <Text style={styles.statSub}>{stat.sub}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

// ─── MODALS ───────────────────────────────────────────────────────────────────

const DeliveryChargeModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  slab: WeightSlab | null; // null means it's "Add New", otherwise "Edit"
  isWeb: boolean;
}> = ({ visible, onClose, slab, isWeb }) => {
  const isEditing = !!slab;
  const [isCustomPricing, setIsCustomPricing] = React.useState(false);
  const [isActiveStatus, setIsActiveStatus] = React.useState(false);

  React.useEffect(() => {
    if (visible) {
      if (slab) {
        setIsActiveStatus(slab.status === "Active");
        setIsCustomPricing(false);
      } else {
        setIsActiveStatus(true);
        setIsCustomPricing(false);
      }
    }
  }, [slab, visible]);

  if (!visible) return null;

  const handleSave = () => {
    const msg = isEditing ? 'Delivery charge updated successfully!' : 'Delivery charge added successfully!';
    if (Platform.OS === 'web') {
      window.alert(msg);
    } else {
      Alert.alert('Success', msg);
    }
    onClose();
  };

  const content = (
    <View style={[styles.modalContainer, isWeb && styles.modalContainerWeb]}>
      <View style={styles.modalHeader}>
        <View style={styles.modalHeaderLeft}>
          <Feather name={isEditing ? "edit" : "plus-circle"} size={16} color="#FFFFFF" />
          <Text style={styles.modalTitle}>{isEditing ? "Edit Delivery Charge" : "Add New Delivery Charge"}</Text>
        </View>
        <TouchableOpacity onPress={onClose}>
          <Feather name="x" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.modalBody}>
        <Text style={styles.inputLabel}>Weight Slab Description <Text style={styles.textAsterisk}>*</Text></Text>
        <TextInput style={styles.textInput} defaultValue={slab?.label || ""} placeholder="e.g., 0-500 gms, 1-2 kg" />

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.inputLabel}>Minimum Weight (kg) <Text style={styles.textAsterisk}>*</Text></Text>
            <TextInput style={styles.textInput} defaultValue={slab ? "0.000" : ""} keyboardType="numeric" />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Maximum Weight (kg) <Text style={styles.textAsterisk}>*</Text></Text>
            <TextInput style={styles.textInput} defaultValue={slab ? "0.500" : ""} keyboardType="numeric" />
          </View>
        </View>

        <View style={styles.checkboxGroup}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            activeOpacity={0.8}
            onPress={() => setIsCustomPricing(!isCustomPricing)}
          >
            <View style={[styles.checkboxOutline, isCustomPricing && styles.checkboxOutlineActive]}>
              {isCustomPricing && <Feather name="check" size={12} color="#FFFFFF" />}
            </View>
            <Feather name="settings" size={14} color={TEXT_PRIMARY} style={{ marginRight: 6 }} />
            <Text style={styles.checkboxLabel}>Custom Pricing (Contact for Quote)</Text>
          </TouchableOpacity>
          <Text style={styles.checkboxHint}>Check this for weight ranges that require custom pricing (e.g., Above 5kg)</Text>
        </View>

        {!isCustomPricing && (
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.inputLabel}>Intra-City Charge (₹) <Text style={styles.textAsterisk}>*</Text></Text>
              <View style={styles.inputWithPrefix}>
                <View style={styles.inputPrefix}><Text style={styles.inputPrefixText}>₹</Text></View>
                <TextInput style={styles.textInputNoLeftBorder} defaultValue={slab ? slab.intracity.replace("₹", "") : ""} keyboardType="numeric" />
              </View>
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Metro-Metro Charge (₹) <Text style={styles.textAsterisk}>*</Text></Text>
              <View style={styles.inputWithPrefix}>
                <View style={styles.inputPrefix}><Text style={styles.inputPrefixText}>₹</Text></View>
                <TextInput style={styles.textInputNoLeftBorder} defaultValue={slab ? slab.metroMetro.replace("₹", "") : ""} keyboardType="numeric" />
              </View>
            </View>
          </View>
        )}

        <View style={styles.checkboxGroup}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            activeOpacity={0.8}
            onPress={() => setIsActiveStatus(!isActiveStatus)}
          >
            <View style={[styles.checkboxOutline, isActiveStatus && styles.checkboxOutlineActive]}>
              {isActiveStatus && <Feather name="check" size={12} color="#FFFFFF" />}
            </View>
            <Feather name="check-circle" size={14} color={isActiveStatus ? "#059669" : TEXT_PRIMARY} style={{ marginRight: 6 }} />
            <Text style={[styles.checkboxLabel, isActiveStatus && styles.checkboxLabelActive]}>Active Status</Text>
          </TouchableOpacity>
          <Text style={styles.checkboxHint}>Uncheck to disable this delivery charge</Text>
        </View>
      </ScrollView>

      <View style={styles.modalFooter}>
        <TouchableOpacity style={styles.btnCancel} onPress={onClose}>
          <Feather name="x" size={14} color="#6B7280" />
          <Text style={styles.btnCancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnUpdate} onPress={handleSave}>
          <Feather name="save" size={14} color="#FFFFFF" />
          <Text style={styles.btnUpdateText}>{isEditing ? "Update Delivery Charge" : "Add Delivery Charge"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isWeb ? "fade" : "slide"}
      onRequestClose={onClose}
    >
      <View style={isWeb ? styles.modalOverlayWeb : styles.modalOverlayMobile}>
        {content}
      </View>
    </Modal>
  );
};

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
const DeliveryChargesScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [slabs, setSlabs] = useState<WeightSlab[]>(initialSlabs);
  const [editingSlabId, setEditingSlabId] = useState<number | null>(null);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  const handleActivate = (id: number) => {
    setSlabs((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "Active" as SlabStatus } : s))
    );
  };

  const handleEdit = (id: number) => {
    setEditingSlabId(id);
  };

  const handleDelete = (id: number) => {
    const confirmDelete = () => {
      setSlabs((prev) => prev.filter((s) => s.id !== id));
      if (Platform.OS === "web") {
        window.alert("Delivery charge deleted successfully!");
      } else {
        Alert.alert("Deleted", "Delivery charge deleted successfully!");
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to delete this delivery charge?")) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        "Confirm Delete",
        "Are you sure you want to delete this delivery charge?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: confirmDelete }
        ]
      );
    }
  };

  const MainContent = (
    <View style={[styles.mainContentContainer, isWeb && styles.webMainContentContainer]}>
      {/* ── Header ── */}
      <View style={[styles.header, isWeb && styles.webHeader]}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Delivery Charges</Text>
          <Text style={styles.headerSubtitle}>Manage delivery charges based on weight slabs and location.</Text>
        </View>
        <View style={styles.headerActions}>
          {isWeb && (
            <View style={styles.viewSwitcher}>
              <Text style={styles.viewLabel}>View:</Text>
              <TouchableOpacity
                style={[
                  styles.viewButton,
                  viewMode === "grid" && styles.viewButtonActive,
                ]}
                onPress={() => setViewMode("grid")}
                activeOpacity={0.8}
              >
                <Feather name="grid" size={16} color={viewMode === "grid" ? "#FFFFFF" : TEXT_MUTED} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.viewButton,
                  viewMode === "list" && styles.viewButtonActive,
                ]}
                onPress={() => setViewMode("list")}
                activeOpacity={0.8}
              >
                <Feather name="list" size={16} color={viewMode === "list" ? "#FFFFFF" : TEXT_MUTED} />
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={styles.addButton} activeOpacity={0.85} onPress={() => setIsAddModalVisible(true)}>
            <Feather name="plus" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.addButtonText}>Add New Charge</Text>
          </TouchableOpacity>
        </View>
      </View>

      {!isWeb && (
        <View style={styles.mobileControlsContainer}>
          <View style={styles.searchContainerMobile}>
            <Feather name="search" size={16} color={TEXT_MUTED} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search delivery charges..."
              placeholderTextColor={TEXT_MUTED}
            />
          </View>
          <View style={styles.viewSwitcherMobile}>
            <Text style={styles.viewLabelMobile}>View Format:</Text>
            <View style={{ flexDirection: "row", gap: 4 }}>
              <TouchableOpacity
                style={[
                  styles.viewButton,
                  viewMode === "grid" && styles.viewButtonActive,
                ]}
                onPress={() => setViewMode("grid")}
                activeOpacity={0.8}
              >
                <Feather name="grid" size={16} color={viewMode === "grid" ? "#FFFFFF" : TEXT_MUTED} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.viewButton,
                  viewMode === "list" && styles.viewButtonActive,
                ]}
                onPress={() => setViewMode("list")}
                activeOpacity={0.8}
              >
                <Feather name="list" size={16} color={viewMode === "list" ? "#FFFFFF" : TEXT_MUTED} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ── Slab Cards ── */}
      <ScrollView
        style={styles.listContent}
        contentContainerStyle={isWeb ? styles.webListContent : { paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        <StatsFooter slabs={slabs} />
        
        {viewMode === "grid" ? (
          <View style={[
            styles.cardGrid,
            styles.cardGridGrid,
            !isWeb && { marginHorizontal: 0 }
          ]}>
            {slabs.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.cardGridItem,
                  !isWeb && { flexBasis: "100%", maxWidth: "100%", marginHorizontal: 0 }
                ]}
              >
                <SlabCard
                  slab={item}
                  onActivate={handleActivate}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </View>
            ))}
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={[styles.tableContainer, { width: 880 }]}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { width: 140 }]}>Weight Slab</Text>
                <Text style={[styles.tableHeaderCell, { width: 160 }]}>Weight Range</Text>
                <Text style={[styles.tableHeaderCell, { width: 120 }]}>Intra-City (₹)</Text>
                <Text style={[styles.tableHeaderCell, { width: 120 }]}>Metro-Metro (₹)</Text>
                <Text style={[styles.tableHeaderCell, { width: 130 }]}>Type</Text>
                <Text style={[styles.tableHeaderCell, { width: 90 }]}>Status</Text>
                <Text style={[styles.tableHeaderCell, { width: 120, textAlign: 'center' }]}>Action</Text>
              </View>
              {slabs.map((slab) => (
                <View key={slab.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: 140, fontWeight: '700' }]}>{slab.label}</Text>
                  <Text style={[styles.tableCell, { width: 160, color: TEXT_MUTED }]}>{slab.range}</Text>
                  <Text style={[styles.tableCell, { width: 120, color: PURPLE, fontWeight: '700' }]}>{slab.intracity}</Text>
                  <Text style={[styles.tableCell, { width: 120, color: "#79411c", fontWeight: '700' }]}>{slab.metroMetro}</Text>
                  <View style={[{ width: 130 }]}>
                    <FixedRateBadge />
                  </View>
                  <View style={[{ width: 90 }]}>
                    <StatusBadge status={slab.status} />
                  </View>
                  <View style={[{ width: 120, flexDirection: 'row', justifyContent: 'center', gap: 6 }]}>
                    <TouchableOpacity style={styles.tableBtnEdit} onPress={() => handleEdit(slab.id)}>
                      <Feather name="edit-2" size={13} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tableBtnDelete} onPress={() => handleDelete(slab.id)}>
                      <Feather name="trash-2" size={13} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </ScrollView>
    </View>
  );

  if (isWeb) {
    return (
      <View style={styles.webLayout}>
        <View style={styles.webMainColumn}>
          {MainContent}
        </View>
        <DeliveryChargeModal
          visible={editingSlabId !== null}
          onClose={() => setEditingSlabId(null)}
          slab={slabs.find((s) => s.id === editingSlabId) || null}
          isWeb={isWeb}
        />
        <DeliveryChargeModal
          visible={isAddModalVisible}
          onClose={() => setIsAddModalVisible(false)}
          slab={null}
          isWeb={isWeb}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {MainContent}
      <DeliveryChargeModal
        visible={editingSlabId !== null}
        onClose={() => setEditingSlabId(null)}
        slab={slabs.find((s) => s.id === editingSlabId) || null}
        isWeb={isWeb}
      />
      <DeliveryChargeModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        slab={null}
        isWeb={isWeb}
      />
    </SafeAreaView>
  );
};

export default DeliveryChargesScreen;

// ─── STYLES ───────────────────────────────────────────────────────────────────
const PURPLE = "#ef7b1a";
const PURPLE_LIGHT = "#f6c795";
const BORDER = "transparent";
const TEXT_PRIMARY = "#504f56";
const TEXT_MUTED = "#69798c";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 25,
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PURPLE,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewSwitcher: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F2FB",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginRight: 12,
  },
  viewLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginRight: 8,
    fontWeight: "600",
  },
  viewButton: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 2,
  },
  viewButtonActive: {
    backgroundColor: "#7C3AED",
  },
  viewButtonText: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: "700",
  },
  viewButtonTextActive: {
    color: "#FFFFFF",
  },

  // ── Mobile Controls ──
  mobileControlsContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: "#FFFFFF",
    gap: 12,
  },
  searchContainerMobile: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchIcon: {
    fontSize: 14,
    color: TEXT_MUTED,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    color: TEXT_PRIMARY,
  },
  viewSwitcherMobile: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  viewLabelMobile: {
    fontSize: 13,
    color: TEXT_PRIMARY,
    fontWeight: "600",
  },

  // ── List ──
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 80,
  },
  webListContent: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 24,
  },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginHorizontal: -8,
  },
  cardGridGrid: {
    gap: 16,
  },
  cardGridList: {
    gap: 0,
  },
  cardGridItem: {
    flexBasis: "32%",
    maxWidth: 360,
    marginHorizontal: 8,
    marginBottom: 16,
  },
  cardGridItemFull: {
    width: "100%",
    marginBottom: 16,
  },

  // ── Card ──
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  bagBottom: {
    width: 20,
    height: 16,
    borderWidth: 2,
    borderRadius: 4,
    position: "relative",
    alignItems: "center",
  },
  bagHandle: {
    width: 10,
    height: 6,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderRadius: 6,
    position: "absolute",
    top: -7,
  },
  cardTitleBlock: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_PRIMARY,
  },
  cardRange: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 2,
  },

  // ── Status Badge ──
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // ── Price ──
  priceRow: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  priceBlock: {
    flex: 1,
    alignItems: "flex-start",
  },
  priceDivider: {
    width: 1,
    backgroundColor: BORDER,
    marginHorizontal: 12,
  },
  priceLabel: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginBottom: 4,
    fontWeight: "500",
  },
  priceValue: {
    fontSize: 18,
    fontWeight: "800",
    color: PURPLE,
  },

  // ── Fixed Rate Badge ──
  fixedRateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 12,
  },
  checkCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: {
    fontSize: 9,
    color: "#059669",
    fontWeight: "700",
  },
  fixedRateText: {
    fontSize: 12,
    color: "#059669",
    fontWeight: "600",
  },

  // ── Card Divider ──
  cardDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginBottom: 12,
  },

  // ── Action Buttons ──
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  btnOutline: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: PURPLE_LIGHT,
    borderWidth: 1,
    borderColor: PURPLE_LIGHT,
  },
  btnOutlineIcon: {
    fontSize: 13,
  },
  btnOutlineText: {
    fontSize: 13,
    fontWeight: "600",
    color: PURPLE,
  },
  btnActivate: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: PURPLE,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  btnActivateText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  btnEdit: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  btnEditIcon: {
    fontSize: 13,
  },
  btnEditText: {
    fontSize: 13,
    fontWeight: "600",
    color: PURPLE,
  },

  // ── Stats Footer ──
  statsContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    marginTop: 4,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: BORDER,
  },
  statsScroll: {
    paddingHorizontal: 8,
    paddingVertical: 14,
  },
  statItem: {
    alignItems: "center",
    paddingHorizontal: 14,
    minWidth: 88,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  statIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  statIconText: {
    fontSize: 14,
    fontWeight: "700",
  },
  statValue: {
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  statLabel: {
    fontSize: 10,
    color: TEXT_PRIMARY,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 2,
  },
  statSub: {
    fontSize: 9,
    color: TEXT_MUTED,
    textAlign: "center",
  },

  // ── Bottom Nav ──
  bottomNav: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingVertical: 8,
    paddingBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 10,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  navIcon: {
    fontSize: 20,
  },
  navLabel: {
    fontSize: 10,
    color: TEXT_MUTED,
    fontWeight: "500",
  },
  navLabelActive: {
    color: PURPLE,
    fontWeight: "700",
  },
  navActiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: PURPLE,
    marginTop: 2,
  },

  // ── Web Layout Additions ──
  webLayout: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#F4F2FB",
    height: "100%",
  },
  sidebarGap: {
    width: 260,
    backgroundColor: "transparent",
  },
  headerGap: {
    height: 64,
    backgroundColor: "transparent",
  },
  webMainColumn: {
    flex: 1,
    flexDirection: "column",
  },
  mainContentContainer: {
    flex: 1,
    backgroundColor: "#F4F2FB",
  },
  webMainContentContainer: {
    backgroundColor: "#FFFFFF",
    margin: 16,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  webHeader: {
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    elevation: 0,
    shadowOpacity: 0,
    paddingTop: 24,
    paddingHorizontal: 24,
  },

  // ── Modal ──
  modalOverlayWeb: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlayMobile: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
    maxHeight: "90%",
  },
  modalContainerWeb: {
    width: "90%",
    maxWidth: 600,
    borderRadius: 16,
  },
  modalHeader: {
    backgroundColor: "#ef7b1a",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalHeaderIcon: {
    color: "#FFFFFF",
    fontSize: 18,
    marginRight: 8,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  modalCloseText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  modalBody: {
    padding: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: TEXT_PRIMARY,
    marginBottom: 6,
  },
  textAsterisk: {
    color: "#ef7b1a",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: TEXT_PRIMARY,
  },
  inputWithPrefix: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    overflow: "hidden",
  },
  inputPrefix: {
    backgroundColor: "#79411c",
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  inputPrefixText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  textInputNoLeftBorder: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: TEXT_PRIMARY,
  },
  checkboxGroup: {
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  checkboxOutline: {
    width: 16,
    height: 16,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 4,
    marginRight: 8,
  },
  checkboxLabel: {
    fontSize: 13,
    color: TEXT_PRIMARY,
    fontWeight: "600",
  },
  checkboxLabelActive: {
    fontSize: 13,
    color: "#059669",
    fontWeight: "600",
  },
  checkboxHint: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginLeft: 24,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    gap: 12,
  },
  btnCancel: {
    backgroundColor: "#69798c",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnCancelText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13,
  },
  btnUpdate: {
    backgroundColor: "#79411c",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnUpdateText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13,
  },
  checkboxOutlineActive: {
    backgroundColor: "#ef7b1a",
    borderColor: "#ef7b1a",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxCheck: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },

  // ── Web Table ──
  tableContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#FFF3E0",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: "700",
    color: TEXT_PRIMARY,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableCell: {
    fontSize: 13,
    color: TEXT_PRIMARY,
  },
  tableBtnEdit: {
    backgroundColor: "#1d324e",
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  tableBtnDelete: {
    backgroundColor: "#ef4444",
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  tableBtnIcon: {
    fontSize: 12,
    color: "#FFFFFF",
  },
});