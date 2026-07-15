import AdminLayout from "@/components/admin-layout";
import Pagination from "@/components/Pagination";
import { useAuth } from "@/context/auth-context";
import { getApiErrorMessage } from "@/lib/api/client";
import { sweetCrud, sweetError, sweetWarning } from "@/lib/sweetAlert";
import { mapDeliverySlabRow } from "@/lib/mappers";
import {
  createDeliverySlab,
  deleteDeliverySlab,
  fetchDeliverySlabs,
  updateDeliverySlab,
} from "@/services/deliveryApi";
import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from "react-native";

// ─── THEME ────────────────────────────────────────────────────────────────────
const T = {
  orange: "#E8631A",
  orangeLight: "#FEF0E6",
  orangeMid: "#FDDBB9",
  navy: "#1F2937",
  navyLight: "#E8EBF7",
  bg: "#F7F5F2",
  card: "#FFFFFF",
  border: "#EAE5DC",
  textH: "#1A1208",
  textB: "#5A4433",
  textM: "#7A6858",
  textHint: "#B5A898",
  red: "#DC2626",
  redBg: "#FEF2F2",
  green: "#15803D",
  greenBg: "#F0FDF4",
  white: "#FFFFFF",
};

// ─── TYPES ────────────────────────────────────────────────────────────────────
type SlabStatus = "Active" | "Inactive";

interface WeightSlab {
  id: number;
  label: string;
  range: string;
  minKg: number;
  maxKg: number;
  isCustom: boolean;
  iconColor: string;
  iconBg: string;
  intracity: string;
  metroMetro: string;
  status: SlabStatus;
}

function formatWeightRange(minKg: number, maxKg: number, label: string): string {
  if (label.trim()) return label;
  if (maxKg >= 999) return `Above ${minKg}kg`;
  if (maxKg < 1) {
    const minG = Math.round(minKg * 1000);
    const maxG = Math.round(maxKg * 1000);
    return `${minG} – ${maxG}g`;
  }
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(n));
  return `${fmt(minKg)} – ${fmt(maxKg)}kg`;
}

const SLAB_ICON_STYLES = [
  { iconColor: "#7C3AED", iconBg: "#EDE9FE" },
  { iconColor: "#059669", iconBg: "#D1FAE5" },
  { iconColor: "#D97706", iconBg: "#FEF3C7" },
  { iconColor: "#2563EB", iconBg: "#DBEAFE" },
];

function mapSlabToUi(row: ReturnType<typeof mapDeliverySlabRow>, index: number): WeightSlab {
  const icons = SLAB_ICON_STYLES[index % SLAB_ICON_STYLES.length];
  const range = formatWeightRange(row.minKg, row.maxKg, "");
  return {
    id: row.id,
    label: row.label,
    range,
    minKg: row.minKg,
    maxKg: row.maxKg,
    isCustom: row.custom,
    ...icons,
    intracity: row.custom ? "Custom" : `₹${row.intraCity.toFixed(2)}`,
    metroMetro: row.custom ? "Custom" : `₹${row.metroMetro.toFixed(2)}`,
    status: row.active ? "Active" : "Inactive",
  };
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

const BagIcon: React.FC<{ color: string; bg: string }> = ({ color, bg }) => (
  <View style={[styles.iconWrapper, { backgroundColor: bg }]}>
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

const FixedRateBadge: React.FC<{ custom?: boolean }> = ({ custom }) => (
  <View style={styles.fixedRateRow}>
    <View style={styles.checkCircle}>
      <Text style={styles.checkMark}>{custom ? "★" : "✓"}</Text>
    </View>
    <Text style={styles.fixedRateText}>{custom ? "Custom Pricing" : "Fixed Rate"}</Text>
  </View>
);

// ─── SLAB CARD (WEB GRID) ─────────────────────────────────────────────────────
const dc = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: T.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    overflow: "hidden",
  },
  stripe: {
    height: 4,
    width: "100%",
  },
  body: {
    padding: 16,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 6,
  },
  actBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: T.textH,
    marginBottom: 4,
  },
  desc: {
    fontSize: 12,
    color: T.textM,
    lineHeight: 18,
    marginBottom: 14,
  },
  priceRow: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    alignItems: "center",
  },
  priceBlock: {
    flex: 1,
  },
  priceDivider: {
    width: 1,
    height: "80%",
    backgroundColor: "#E5E7EB",
    marginHorizontal: 10,
  },
  priceLabel: {
    fontSize: 10,
    color: T.textHint,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  priceValue: {
    fontSize: 13,
    fontWeight: "700",
    color: T.textB,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaTxt: {
    fontSize: 11,
    color: T.textM,
    fontWeight: "500",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTxt: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});

const SlabCard: React.FC<{
  slab: WeightSlab;
  onActivate: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}> = ({ slab, onActivate, onEdit, onDelete }) => {
  return (
    <View style={dc.card}>
      {/* Top color stripe */}
      <View style={[dc.stripe, { backgroundColor: slab.iconColor }]} />

      <View style={dc.body}>
        {/* Icon + actions row */}
        <View style={dc.topRow}>
          <View style={[dc.iconWrap, { backgroundColor: slab.iconBg }]}>
            <Feather name="truck" size={20} color={slab.iconColor} />
          </View>
          <View style={dc.actions}>
            <TouchableOpacity style={dc.actBtn} onPress={() => onEdit(slab.id)} activeOpacity={0.8}>
              <Feather name="edit-2" size={13} color={T.textM} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[dc.actBtn, { borderColor: "#FCA5A5" }]}
              onPress={() => onDelete(slab.id)}
              activeOpacity={0.8}
            >
              <Feather name="trash-2" size={13} color={T.red} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Name & description */}
        <Text style={dc.name}>{slab.label}</Text>
        <Text style={dc.desc} numberOfLines={2}>{slab.range}</Text>

        {/* Price Row */}
        <View style={dc.priceRow}>
          <View style={dc.priceBlock}>
            <Text style={dc.priceLabel}>Intra-City</Text>
            <Text style={dc.priceValue}>{slab.intracity}</Text>
          </View>
          <View style={dc.priceDivider} />
          <View style={dc.priceBlock}>
            <Text style={dc.priceLabel}>Metro-Metro</Text>
            <Text style={dc.priceValue}>{slab.metroMetro}</Text>
          </View>
        </View>

        {/* Footer meta */}
        <View style={dc.footer}>
          <View style={dc.metaItem}>
            <Feather name={slab.isCustom ? "settings" : "check-circle"} size={11} color={T.textHint} />
            <Text style={dc.metaTxt}>{slab.isCustom ? "Custom Pricing" : "Fixed Rate"}</Text>
          </View>
          <View style={[
            dc.statusBadge,
            { backgroundColor: slab.status === "Active" ? T.greenBg : T.redBg }
          ]}>
            <View style={[
              dc.statusDot,
              { backgroundColor: slab.status === "Active" ? T.green : T.red }
            ]} />
            <Text style={[
              dc.statusTxt,
              { color: slab.status === "Active" ? T.green : T.red }
            ]}>{slab.status}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

// ─── MOBILE SLAB CARD ─────────────────────────────────────────────────────────
const MobileSlabCard: React.FC<{
  slab: WeightSlab;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}> = ({ slab, onEdit, onDelete }) => {
  return (
    <View style={msc.card}>
      {/* Left color stripe */}
      <View style={[msc.leftStripe, { backgroundColor: slab.iconColor }]} />

      <View style={msc.body}>
        {/* Top row: icon + title + actions */}
        <View style={msc.topRow}>
          <View style={[msc.iconWrap, { backgroundColor: slab.iconBg }]}>
            <Feather name="truck" size={18} color={slab.iconColor} />
          </View>
          <View style={msc.titleBlock}>
            <Text style={msc.title}>{slab.label}</Text>
            <Text style={msc.subtitle}>{slab.range}</Text>
          </View>
          <View style={msc.actions}>
            <TouchableOpacity
              style={msc.actBtn}
              onPress={() => onEdit(slab.id)}
              activeOpacity={0.8}
            >
              <Feather name="edit-2" size={13} color={T.textM} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[msc.actBtn, { borderColor: "#FCA5A5" }]}
              onPress={() => onDelete(slab.id)}
              activeOpacity={0.8}
            >
              <Feather name="trash-2" size={13} color={T.red} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Price row */}
        <View style={msc.priceRow}>
          <View style={msc.priceBlock}>
            <Text style={msc.priceLabel}>INTRA-CITY</Text>
            <Text style={msc.priceValue}>{slab.intracity}</Text>
          </View>
          <View style={msc.priceDivider} />
          <View style={msc.priceBlock}>
            <Text style={msc.priceLabel}>METRO-METRO</Text>
            <Text style={msc.priceValue}>{slab.metroMetro}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={msc.footer}>
          <View style={msc.metaItem}>
            <Feather
              name={slab.isCustom ? "settings" : "check-circle"}
              size={11}
              color={T.textHint}
            />
            <Text style={msc.metaTxt}>
              {slab.isCustom ? "Custom Pricing" : "Fixed Rate"}
            </Text>
          </View>
          <View style={[
            msc.statusBadge,
            { backgroundColor: slab.status === "Active" ? T.greenBg : T.redBg }
          ]}>
            <View style={[
              msc.statusDot,
              { backgroundColor: slab.status === "Active" ? T.green : T.red }
            ]} />
            <Text style={[
              msc.statusTxt,
              { color: slab.status === "Active" ? T.green : T.red }
            ]}>
              {slab.status}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const msc = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: T.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  leftStripe: {
    width: 4,
    alignSelf: "stretch",
  },
  body: {
    flex: 1,
    padding: 14,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: T.textH,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: T.textM,
  },
  actions: {
    flexDirection: "row",
    gap: 6,
    flexShrink: 0,
  },
  actBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  priceRow: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    alignItems: "center",
  },
  priceBlock: {
    flex: 1,
  },
  priceDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 12,
  },
  priceLabel: {
    fontSize: 9,
    color: T.textHint,
    marginBottom: 3,
    letterSpacing: 0.4,
    fontWeight: "600",
  },
  priceValue: {
    fontSize: 14,
    fontWeight: "700",
    color: T.textB,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaTxt: {
    fontSize: 11,
    color: T.textM,
    fontWeight: "500",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTxt: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});

// ─── STATS FOOTER ─────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: any;
  colorKey: "orange" | "navy" | "green" | "red";
}> = ({ label, value, icon, colorKey }) => {
  let tint, txtColor;
  if (colorKey === "orange") { tint = T.orangeLight; txtColor = T.orange; }
  else if (colorKey === "green") { tint = T.greenBg; txtColor = T.green; }
  else if (colorKey === "red") { tint = T.redBg; txtColor = T.red; }
  else { tint = T.navyLight; txtColor = T.navy; }

  return (
    <View style={sc.card}>
      <View style={[sc.iconWrap, { backgroundColor: tint }]}>
        <Feather name={icon} size={16} color={txtColor} />
      </View>
      <View style={{ flexDirection: "column" }}>
        <Text style={sc.value}>{value}</Text>
        <Text style={sc.label}>{label}</Text>
      </View>
    </View>
  );
};

// Mobile stat card — compact version that fits 3 in a row
const MobileStatCard: React.FC<{
  label: string;
  value: string | number;
  icon: any;
  colorKey: "orange" | "navy" | "green" | "red";
}> = ({ label, value, icon, colorKey }) => {
  let tint, txtColor;
  if (colorKey === "orange") { tint = T.orangeLight; txtColor = T.orange; }
  else if (colorKey === "green") { tint = T.greenBg; txtColor = T.green; }
  else if (colorKey === "red") { tint = T.redBg; txtColor = T.red; }
  else { tint = T.navyLight; txtColor = T.navy; }

  return (
    <View style={msc2.card}>
      <View style={[msc2.iconWrap, { backgroundColor: tint }]}>
        <Feather name={icon} size={14} color={txtColor} />
      </View>
      <Text style={msc2.value}>{value}</Text>
      <Text style={msc2.label}>{label}</Text>
    </View>
  );
};

const msc2 = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: T.card,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  value: {
    fontSize: 18,
    fontWeight: "800",
    color: T.textH,
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 8,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    textAlign: "center",
  },
});

const sc = StyleSheet.create({
  card: {
    flex: 1,
    maxWidth: 240,
    backgroundColor: T.card,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderColor: T.border,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: 20,
    fontWeight: "800",
    color: T.textH,
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 9,
    fontWeight: "600",
    color: "#000",
    marginTop: 1,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
});

const StatsFooter: React.FC<{ slabs: WeightSlab[]; isWeb: boolean }> = ({ slabs, isWeb }) => {
  const total = slabs.length;
  const active = slabs.filter((s) => s.status === "Active").length;
  const inactive = slabs.filter((s) => s.status === "Inactive").length;

  if (!isWeb) {
    return (
      <View style={styles.mobileStatsRow}>
        <MobileStatCard label="Total Slabs" value={total} icon="layers" colorKey="navy" />
        <MobileStatCard label="Active Slabs" value={active} icon="check-circle" colorKey="green" />
        <MobileStatCard label="Inactive" value={inactive} icon="x-circle" colorKey="red" />
      </View>
    );
  }

  return (
    <View style={styles.statsRow}>
      <StatCard label="Total Slabs" value={total} icon="layers" colorKey="navy" />
      <StatCard label="Active Slabs" value={active} icon="check-circle" colorKey="green" />
      <StatCard label="Inactive Slabs" value={inactive} icon="x-circle" colorKey="red" />
    </View>
  );
};

// ─── MODALS ───────────────────────────────────────────────────────────────────

const DeliveryChargeModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  slab: WeightSlab | null;
  isWeb: boolean;
  onSave: (data: {
    label: string;
    minKg: number;
    maxKg: number;
    intraCity: number;
    metroMetro: number;
    active: boolean;
    custom: boolean;
  }) => void;
}> = ({ visible, onClose, slab, isWeb, onSave }) => {
  const isEditing = !!slab;
  const [isCustomPricing, setIsCustomPricing] = React.useState(false);
  const [isActiveStatus, setIsActiveStatus] = React.useState(false);
  const [label, setLabel] = React.useState("");
  const [minKg, setMinKg] = React.useState("");
  const [maxKg, setMaxKg] = React.useState("");
  const [intraCity, setIntraCity] = React.useState("");
  const [metroMetro, setMetroMetro] = React.useState("");

  React.useEffect(() => {
    if (visible) {
      if (slab) {
        setIsActiveStatus(slab.status === "Active");
        setIsCustomPricing(slab.isCustom);
        setLabel(slab.label);
        setMinKg(String(slab.minKg));
        setMaxKg(String(slab.maxKg));
        setIntraCity(slab.isCustom ? "0" : slab.intracity.replace("₹", ""));
        setMetroMetro(slab.isCustom ? "0" : slab.metroMetro.replace("₹", ""));
      } else {
        setIsActiveStatus(true);
        setIsCustomPricing(false);
        setLabel("");
        setMinKg("");
        setMaxKg("");
        setIntraCity("");
        setMetroMetro("");
      }
    }
  }, [slab, visible]);

  if (!visible) return null;

  const handleSave = () => {
    if (!label.trim()) {
      void sweetWarning("Validation Error", "Please enter a weight slab description.");
      return;
    }
    if (minKg.trim() === "") {
      void sweetWarning("Validation Error", "Please enter a minimum weight.");
      return;
    }
    if (maxKg.trim() === "") {
      void sweetWarning("Validation Error", "Please enter a maximum weight.");
      return;
    }
    if (!isCustomPricing) {
      if (intraCity.trim() === "") {
        void sweetWarning("Validation Error", "Please enter an intra-city charge.");
        return;
      }
      if (metroMetro.trim() === "") {
        void sweetWarning("Validation Error", "Please enter a metro-metro charge.");
        return;
      }
    }

    onSave({
      label: label.trim(),
      minKg: Number(minKg) || 0,
      maxKg: Number(maxKg) || 0,
      intraCity: isCustomPricing ? 0 : Number(intraCity) || 0,
      metroMetro: isCustomPricing ? 0 : Number(metroMetro) || 0,
      active: isActiveStatus,
      custom: isCustomPricing,
    });
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
        <TextInput style={styles.textInput} value={label} onChangeText={setLabel} placeholder="e.g., 0-500 gms, 1-2 kg" />

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.inputLabel}>Minimum Weight (kg) <Text style={styles.textAsterisk}>*</Text></Text>
            <TextInput style={styles.textInput} value={minKg} onChangeText={setMinKg} keyboardType="numeric" />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Maximum Weight (kg) <Text style={styles.textAsterisk}>*</Text></Text>
            <TextInput style={styles.textInput} value={maxKg} onChangeText={setMaxKg} keyboardType="numeric" />
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
                <TextInput style={styles.textInputNoLeftBorder} value={intraCity} onChangeText={setIntraCity} keyboardType="numeric" />
              </View>
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Metro-Metro Charge (₹) <Text style={styles.textAsterisk}>*</Text></Text>
              <View style={styles.inputWithPrefix}>
                <View style={styles.inputPrefix}><Text style={styles.inputPrefixText}>₹</Text></View>
                <TextInput style={styles.textInputNoLeftBorder} value={metroMetro} onChangeText={setMetroMetro} keyboardType="numeric" />
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
  const { token, isLoading: authLoading } = useAuth();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isDesktopWeb = isWeb && width >= 1024;
  const isTabletMobile = width >= 600 && width < 1024;
  const isSmallPhone = width < 380;
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [slabs, setSlabs] = useState<WeightSlab[]>([]);
  const [editingSlabId, setEditingSlabId] = useState<number | null>(null);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"All" | "Active" | "Inactive">("All");
  const [searchQuery, setSearchQuery] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  const filteredSlabs = slabs.filter(s => {
    const matchesStatus = filterStatus === "All" || s.status === filterStatus;
    const matchesSearch = !searchQuery || s.label.toLowerCase().includes(searchQuery.toLowerCase()) || s.range.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const loadSlabs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchDeliverySlabs();
      setSlabs(rows.map((r, i) => mapSlabToUi(mapDeliverySlabRow(r), i)));
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load delivery charges."));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (authLoading || !token) return;
    void loadSlabs();
  }, [authLoading, token, loadSlabs]);

  const saveSlab = async (data: {
    label: string;
    minKg: number;
    maxKg: number;
    intraCity: number;
    metroMetro: number;
    active: boolean;
    custom: boolean;
  }) => {
    const isUpdate = editingSlabId != null;
    if (isUpdate) {
      if (!(await sweetCrud.confirmUpdate("Delivery charge", data.label))) return;
    } else {
      if (!(await sweetCrud.confirmAdd("Delivery charge", data.label))) return;
    }
    try {
      const payload = {
        label: data.label,
        minWeightKg: data.minKg,
        maxWeightKg: data.maxKg,
        intraCityCharge: data.intraCity,
        metroMetroCharge: data.metroMetro,
        active: data.active,
        custom: data.custom,
      };
      if (editingSlabId != null) {
        await updateDeliverySlab(editingSlabId, payload);
      } else {
        await createDeliverySlab(payload);
      }
      await loadSlabs();
      if (isUpdate) {
        void sweetCrud.updated("Delivery charge");
      } else {
        void sweetCrud.added("Delivery charge");
      }
    } catch (e) {
      void sweetError("Error", getApiErrorMessage(e));
    }
  };

  const handleActivate = async (id: number) => {
    const slab = slabs.find((s) => s.id === id);
    if (!slab) return;
    try {
      await updateDeliverySlab(id, { active: true });
      await loadSlabs();
    } catch (e) {
      console.warn(getApiErrorMessage(e));
    }
  };

  const handleEdit = (id: number) => {
    setEditingSlabId(id);
  };

  const handleDelete = async (id: number) => {
    const slab = slabs.find((s) => s.id === id);
    if (!(await sweetCrud.confirmDelete("Delivery charge", slab?.label))) return;
    try {
      await deleteDeliverySlab(id);
      await loadSlabs();
      void sweetCrud.deleted("Delivery charge");
    } catch (e) {
      void sweetError("Error", getApiErrorMessage(e, "Failed to delete delivery charge."));
    }
  };

  // ── MOBILE LAYOUT ──
  if (!isDesktopWeb) {
    return (
      <AdminLayout>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F9FB" }}>
          <StatusBar barStyle="light-content" backgroundColor="#151D4F" />

          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32 }}
          >
            {/* Mobile Header */}
            <View style={[styles.mobileHeader, isSmallPhone && { paddingHorizontal: 14, paddingTop: 12 }]}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.mobileHeaderTitle, isSmallPhone && { fontSize: 18 }]} numberOfLines={1}>Delivery Charges</Text>
                <Text style={styles.mobileHeaderSub} numberOfLines={1}>Manage weight slabs and charges</Text>
              </View>
              <TouchableOpacity
                style={[styles.mobileAddBtn, isSmallPhone && { paddingHorizontal: 10, paddingVertical: 8 }]}
                activeOpacity={0.85}
                onPress={() => { setEditingSlabId(null); setIsAddModalVisible(true); }}
              >
                <Feather name="plus" size={14} color="#1E2B6B" />
                <Text style={[styles.mobileAddBtnTxt, isSmallPhone && { fontSize: 12 }]}>Add New</Text>
              </TouchableOpacity>
            </View>

            {/* Stats cards — overlap header */}
            <StatsFooter slabs={slabs} isWeb={false} />
            {/* Search + Filter toolbar */}
            <View style={styles.mobileToolbar}>
              {/* Search */}
              <View style={styles.mobileSearchBox}>
                <Feather name="search" size={15} color="#94A3B8" />
                <TextInput
                  style={styles.mobileSearchInput}
                  placeholder="Search delivery charges..."
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    setCurrentPage(1);
                  }}
                />
              </View>

              {/* Filter pills + view toggle */}
              <View style={styles.mobileFilterRow}>
                <View style={styles.mobileFilterPills}>
                  {(["All", "Active", "Inactive"] as const).map(status => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.mobilePill,
                        filterStatus === status && styles.mobilePillActive,
                      ]}
                      onPress={() => { setFilterStatus(status); setCurrentPage(1); }}
                    >
                      <Text style={[
                        styles.mobilePillTxt,
                        filterStatus === status && styles.mobilePillTxtActive,
                      ]}>{status}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.mobileViewToggle}>
                  <TouchableOpacity
                    style={[styles.mobileViewBtn, viewMode === "grid" && styles.mobileViewBtnActive]}
                    onPress={() => setViewMode("grid")}
                  >
                    <Feather name="grid" size={16} color={viewMode === "grid" ? "#fff" : "#374151"} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.mobileViewBtn, viewMode === "list" && styles.mobileViewBtnActive]}
                    onPress={() => setViewMode("list")}
                  >
                    <Feather name="list" size={16} color={viewMode === "list" ? "#fff" : "#374151"} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Content */}
            <View style={{ paddingHorizontal: 16 }}>
              {loading || authLoading ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>Loading delivery charges…</Text>
                </View>
              ) : error ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>{error}</Text>
                  <TouchableOpacity style={styles.retryBtn} onPress={loadSlabs}>
                    <Text style={styles.retryBtnText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : viewMode === "grid" ? (
                <View style={isTabletMobile ? { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginHorizontal: -7 } : { gap: 14 }}>
                  {filteredSlabs
                    .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                    .map((item) => (
                      <View key={item.id} style={isTabletMobile ? { width: "48%", marginHorizontal: 7, marginBottom: 14 } : {}}>
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
                  <View style={[styles.tableCard, { width: "100%" }]}>
                    <View style={{ width: "100%", minWidth: 880 }}>
                      <View style={styles.tableHeader}>
                        <Text style={[styles.th, { flex: 1.5, minWidth: 140 }]}>Weight Slab</Text>
                        <Text style={[styles.th, { flex: 1.5, minWidth: 160 }]}>Weight Range</Text>
                        <Text style={[styles.th, { flex: 1, minWidth: 120 }]}>Intra-City (₹)</Text>
                        <Text style={[styles.th, { flex: 1, minWidth: 120 }]}>Metro-Metro (₹)</Text>
                        <Text style={[styles.th, { flex: 1.2, minWidth: 130 }]}>Type</Text>
                        <Text style={[styles.th, { flex: 1, minWidth: 90 }]}>Status</Text>
                        <Text style={[styles.th, { flex: 1, minWidth: 120, textAlign: "center" }]}>Action</Text>
                      </View>
                      {filteredSlabs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((slab, idx) => (
                        <View key={slab.id} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                          <Text style={[styles.td, { flex: 1.5, minWidth: 140, fontWeight: "700", color: T.textH }]}>{slab.label}</Text>
                          <Text style={[styles.td, { flex: 1.5, minWidth: 160 }]}>{slab.range}</Text>
                          <Text style={[styles.td, { flex: 1, minWidth: 120, color: T.orange, fontWeight: "700" }]}>{slab.intracity}</Text>
                          <Text style={[styles.td, { flex: 1, minWidth: 120, color: T.navy, fontWeight: "700" }]}>{slab.metroMetro}</Text>
                          <View style={{ flex: 1.2, minWidth: 130 }}>
                            <FixedRateBadge custom={slab.isCustom} />
                          </View>
                          <View style={{ flex: 1, minWidth: 90 }}>
                            <StatusBadge status={slab.status} />
                          </View>
                          <View style={{ flex: 1, minWidth: 120, flexDirection: "row", justifyContent: "center", gap: 6 }}>
                            <TouchableOpacity style={dc.actBtn} onPress={() => handleEdit(slab.id)}>
                              <Feather name="edit-2" size={13} color={T.textM} />
                            </TouchableOpacity>
                            <TouchableOpacity style={[dc.actBtn, { borderColor: "#FCA5A5" }]} onPress={() => handleDelete(slab.id)}>
                              <Feather name="trash-2" size={13} color={T.red} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                </ScrollView>
              )}

              {filteredSlabs.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(filteredSlabs.length / ITEMS_PER_PAGE)}
                  totalItems={filteredSlabs.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  itemName="delivery charges"
                  onPageChange={setCurrentPage}
                />
              )}
            </View>
          </ScrollView>

          <DeliveryChargeModal
            visible={editingSlabId !== null}
            onClose={() => setEditingSlabId(null)}
            slab={slabs.find((s) => s.id === editingSlabId) || null}
            isWeb={false}
            onSave={saveSlab}
          />
          <DeliveryChargeModal
            visible={isAddModalVisible}
            onClose={() => setIsAddModalVisible(false)}
            slab={null}
            isWeb={false}
            onSave={saveSlab}
          />
        </SafeAreaView>
      </AdminLayout>
    );
  }

  // ── WEB LAYOUT (UNCHANGED) ──
  const MainContent = (
    <View style={{ flex: 1 }}>

      {/* ── Page Header ── */}
      <View style={styles.pageHead}>
        <View style={styles.pageHeadLeft}>
          <Text style={styles.pageTitle}>Delivery Charges</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtnWhite}
          activeOpacity={0.85}
          onPress={() => { setEditingSlabId(null); setIsAddModalVisible(true); }}
        >
          <Feather name="plus" size={15} color="#1E2B6B" />
          <Text style={styles.addBtnWhiteTxt}>Add New </Text>
        </TouchableOpacity>
      </View>

      <StatsFooter slabs={slabs} isWeb={true} />

      <View style={[styles.listContent, styles.webListContent]}>

        {/* ── Toolbar (Search + Filter) ── */}
        <View style={styles.toolBar}>
          <View style={styles.searchBox}>
            <Feather name="search" size={16} color="#000" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search delivery charges..."
              placeholderTextColor="#000"
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setCurrentPage(1);
              }}
            />
          </View>

          <View style={{ flexDirection: "row", gap: 8, marginRight: 8 }}>
            {(["All", "Active", "Inactive"] as const).map(status => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusFilterBtn,
                  filterStatus === status && styles.statusFilterBtnActive,
                ]}
                onPress={() => { setFilterStatus(status); setCurrentPage(1); }}
              >
                <Text style={[
                  styles.statusFilterTxt,
                  filterStatus === status && styles.statusFilterTxtActive,
                ]}>{status}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.filterGroup}>
            <View style={{ flexDirection: "row", backgroundColor: "#E5E7EB", borderRadius: 10, padding: 3 }}>
              <TouchableOpacity
                style={[styles.viewBtn, viewMode === "grid" && styles.viewBtnActive]}
                onPress={() => setViewMode("grid")}
              >
                <Feather name="grid" size={16} color={viewMode === "grid" ? "#fff" : "#374151"} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewBtn, viewMode === "list" && styles.viewBtnActive]}
                onPress={() => setViewMode("list")}
              >
                <Feather name="list" size={16} color={viewMode === "list" ? "#fff" : "#374151"} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {loading || authLoading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Loading delivery charges…</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadSlabs}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : viewMode === "grid" ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
            {filteredSlabs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((item) => (
              <View key={item.id} style={{ width: "calc(33.33% - 10px)" as any }}>
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
          <View style={[styles.tableCard, { width: "100%" }]}>
            <View style={[{ width: "100%", overflowX: "auto" } as any]}>
              <View style={{ width: "100%", minWidth: 880 }}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { flex: 1.5, minWidth: 140 }]}>Weight Slab</Text>
                  <Text style={[styles.th, { flex: 1.5, minWidth: 160 }]}>Weight Range</Text>
                  <Text style={[styles.th, { flex: 1, minWidth: 120 }]}>Intra-City (₹)</Text>
                  <Text style={[styles.th, { flex: 1, minWidth: 120 }]}>Metro-Metro (₹)</Text>
                  <Text style={[styles.th, { flex: 1.2, minWidth: 130 }]}>Type</Text>
                  <Text style={[styles.th, { flex: 1, minWidth: 90 }]}>Status</Text>
                  <Text style={[styles.th, { flex: 1, minWidth: 120, textAlign: "center" }]}>Action</Text>
                </View>
                {filteredSlabs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((slab, idx) => (
                  <View key={slab.id} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                    <Text style={[styles.td, { flex: 1.5, minWidth: 140, fontWeight: "700", color: T.textH }]}>{slab.label}</Text>
                    <Text style={[styles.td, { flex: 1.5, minWidth: 160 }]}>{slab.range}</Text>
                    <Text style={[styles.td, { flex: 1, minWidth: 120, color: T.orange, fontWeight: "700" }]}>{slab.intracity}</Text>
                    <Text style={[styles.td, { flex: 1, minWidth: 120, color: T.navy, fontWeight: "700" }]}>{slab.metroMetro}</Text>
                    <View style={{ flex: 1.2, minWidth: 130 }}>
                      <FixedRateBadge custom={slab.isCustom} />
                    </View>
                    <View style={{ flex: 1, minWidth: 90 }}>
                      <StatusBadge status={slab.status} />
                    </View>
                    <View style={{ flex: 1, minWidth: 120, flexDirection: "row", justifyContent: "center", gap: 6 }}>
                      <TouchableOpacity style={dc.actBtn} onPress={() => handleEdit(slab.id)}>
                        <Feather name="edit-2" size={13} color={T.textM} />
                      </TouchableOpacity>
                      <TouchableOpacity style={[dc.actBtn, { borderColor: "#FCA5A5" }]} onPress={() => handleDelete(slab.id)}>
                        <Feather name="trash-2" size={13} color={T.red} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {filteredSlabs.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredSlabs.length / ITEMS_PER_PAGE)}
            totalItems={filteredSlabs.length}
            itemsPerPage={ITEMS_PER_PAGE}
            itemName="delivery charges"
            onPageChange={setCurrentPage}
          />
        )}
      </View>
    </View>
  );

  return (
    <AdminLayout>
      <View style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" backgroundColor="#000080" />
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {MainContent}
        </ScrollView>
        <DeliveryChargeModal
          visible={editingSlabId !== null}
          onClose={() => setEditingSlabId(null)}
          slab={slabs.find((s) => s.id === editingSlabId) || null}
          isWeb={isWeb}
          onSave={saveSlab}
        />
        <DeliveryChargeModal
          visible={isAddModalVisible}
          onClose={() => setIsAddModalVisible(false)}
          slab={null}
          isWeb={isWeb}
          onSave={saveSlab}
        />
      </View>
    </AdminLayout>
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

  // ── MOBILE HEADER ──────────────────────────────────────────────────────────
  mobileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#151D4F",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    marginBottom: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginHorizontal: 16,
    marginTop: 12,
  },
  mobileHeaderTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  mobileHeaderSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    marginTop: 3,
  },
  mobileAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  mobileAddBtnTxt: {
    color: "#1E2B6B",
    fontSize: 13,
    fontWeight: "700",
  },

  // ── MOBILE STATS ROW ───────────────────────────────────────────────────────
  mobileStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: -32,
    marginHorizontal: 16,
    marginBottom: 16,
    zIndex: 10,
  },

  // ── MOBILE TOOLBAR ─────────────────────────────────────────────────────────
  mobileToolbar: {
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 10,
  },
  mobileSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  mobileSearchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1A1208",
  },
  mobileFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mobileFilterPills: {
    flexDirection: "row",
    gap: 8,
  },
  mobilePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  mobilePillActive: {
    backgroundColor: "#151D4F",
    borderColor: "#151D4F",
  },
  mobilePillTxt: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  mobilePillTxtActive: {
    color: "#FFFFFF",
  },
  mobileViewToggle: {
    flexDirection: "row",
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
    padding: 3,
  },
  mobileViewBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  mobileViewBtnActive: {
    backgroundColor: "#1E2B6B",
  },

  // ── PAGE HEADER (WEB) ──────────────────────────────────────────────────────
  pageHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: "#151D4F",
    paddingHorizontal: 32,
    paddingVertical: 28,
    paddingBottom: 68,
    borderRadius: 22,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 0,
    zIndex: 1,
    shadowColor: "#151D4F",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  pageHeadLeft: {
    flex: 1,
  },
  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  breadcrumbDim: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.75)",
  },
  breadcrumbActive: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  pageSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    marginTop: 4,
    fontWeight: "400",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: T.orange,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 11,
    flexShrink: 0,
  },
  addBtnTxt: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  addBtnWhite: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    flexShrink: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  addBtnWhiteTxt: {
    color: "#1E2B6B",
    fontSize: 14,
    fontWeight: "700",
  },
  pageTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(239, 123, 26, 0.15)",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  pageTagTxt: {
    fontSize: 11,
    fontWeight: "700",
    color: T.orange,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
    marginTop: -52,
    marginHorizontal: 16,
    zIndex: 10,
    justifyContent: "center",
  },

  toolBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: T.card,
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderWidth: 1.5,
    borderColor: T.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#000",
    outlineStyle: "none" as any,
  },
  statusFilterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
  },
  statusFilterBtnActive: {
    backgroundColor: "#151D4F",
    borderColor: "#151D4F",
  },
  statusFilterTxt: {
    fontSize: 13,
    fontWeight: "600",
    color: T.textM,
  },
  statusFilterTxtActive: {
    color: "#FFFFFF",
  },
  filterGroup: {
    flexDirection: "row",
    gap: 8,
  },
  viewBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  viewBtnActive: {
    backgroundColor: "#1E2B6B",
  },
  tableCard: {
    backgroundColor: T.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: T.bg,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  th: {
    fontSize: 12,
    fontWeight: "700",
    color: T.textHint,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  tableRowAlt: {
    backgroundColor: "#fcfdfd",
  },
  td: {
    fontSize: 13,
    color: T.textM,
  },

  // ── Header (legacy) ──
  header: {
    marginHorizontal: 2,
    marginTop: 12,
    borderRadius: 22,
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
  headerTextContainer: { flex: 1, marginRight: 10 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: TEXT_PRIMARY, letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
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
  addButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  headerActions: { flexDirection: "row", alignItems: "center" },
  viewSwitcher: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e6e6f2",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginRight: 12,
  },
  viewLabel: { fontSize: 12, color: TEXT_MUTED, marginRight: 8, fontWeight: "600" },
  viewButton: { width: 28, height: 28, borderRadius: 999, alignItems: "center", justifyContent: "center", marginHorizontal: 2 },
  viewButtonActive: { backgroundColor: "#000080" },
  viewButtonText: { fontSize: 12, color: TEXT_MUTED, fontWeight: "700" },
  viewButtonTextActive: { color: "#FFFFFF" },

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
  searchIcon: { fontSize: 14, color: TEXT_MUTED, marginRight: 8 },
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
  viewLabelMobile: { fontSize: 13, color: TEXT_PRIMARY, fontWeight: "600" },

  listContent: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 80,
    zIndex: 20,
    elevation: 20,
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
  cardGridGrid: { gap: 16 },
  cardGridList: { gap: 0 },
  cardGridItem: { flexBasis: "32%", maxWidth: 360, marginHorizontal: 8, marginBottom: 16 },
  cardGridItemFull: { width: "100%", marginBottom: 16 },

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
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  iconWrapper: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 10 },
  bagBottom: { width: 20, height: 16, borderWidth: 2, borderRadius: 4, position: "relative", alignItems: "center" },
  bagHandle: { width: 10, height: 6, borderWidth: 2, borderBottomWidth: 0, borderRadius: 6, position: "absolute", top: -7 },
  cardTitleBlock: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: TEXT_PRIMARY },
  cardRange: { fontSize: 11, color: TEXT_MUTED, marginTop: 2 },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: "700" },

  priceRow: { flexDirection: "row", backgroundColor: "#F9FAFB", borderRadius: 12, padding: 12, marginBottom: 10 },
  priceBlock: { flex: 1, alignItems: "flex-start" },
  priceDivider: { width: 1, backgroundColor: BORDER, marginHorizontal: 12 },
  priceLabel: { fontSize: 11, color: TEXT_MUTED, marginBottom: 4, fontWeight: "500" },
  priceValue: { fontSize: 18, fontWeight: "800", color: PURPLE },

  fixedRateRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 12 },
  checkCircle: { width: 16, height: 16, borderRadius: 8, backgroundColor: "#D1FAE5", alignItems: "center", justifyContent: "center" },
  checkMark: { fontSize: 9, color: "#059669", fontWeight: "700" },
  fixedRateText: { fontSize: 12, color: "#059669", fontWeight: "600" },

  cardDivider: { height: 1, backgroundColor: BORDER, marginBottom: 12 },

  actionRow: { flexDirection: "row", gap: 10 },
  btnOutline: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 10, borderRadius: 10, backgroundColor: PURPLE_LIGHT, borderWidth: 1, borderColor: PURPLE_LIGHT,
  },
  btnOutlineIcon: { fontSize: 13 },
  btnOutlineText: { fontSize: 13, fontWeight: "600", color: PURPLE },
  btnActivate: {
    flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 10,
    backgroundColor: PURPLE, shadowColor: PURPLE, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
  },
  btnActivateText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  btnEdit: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 10, borderRadius: 10, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB",
  },
  btnEditIcon: { fontSize: 13 },
  btnEditText: { fontSize: 13, fontWeight: "600", color: PURPLE },

  statsContainer: {
    backgroundColor: "#FFFFFF", borderRadius: 18, marginTop: 4, marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    borderWidth: 1, borderColor: BORDER,
  },
  statsScroll: { paddingHorizontal: 8, paddingVertical: 14 },
  statItem: { alignItems: "center", paddingHorizontal: 14, minWidth: 88, borderRightWidth: 1, borderRightColor: BORDER },
  statIconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 5 },
  statIconText: { fontSize: 14, fontWeight: "700" },
  statValue: { fontSize: 13, fontWeight: "800", textAlign: "center" },
  statLabel: { fontSize: 10, color: TEXT_PRIMARY, fontWeight: "600", textAlign: "center", marginTop: 2 },
  statSub: { fontSize: 9, color: TEXT_MUTED, textAlign: "center" },

  bottomNav: {
    flexDirection: "row", backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: BORDER,
    paddingVertical: 8, paddingBottom: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 10,
  },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2 },
  navIcon: { fontSize: 20 },
  navLabel: { fontSize: 10, color: TEXT_MUTED, fontWeight: "500" },
  navLabelActive: { color: PURPLE, fontWeight: "700" },
  navActiveDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: PURPLE, marginTop: 2 },

  webLayout: { flex: 1, flexDirection: "row", backgroundColor: "#F4F2FB", height: "100%" },
  sidebarGap: { width: 260, backgroundColor: "transparent" },
  headerGap: { height: 64, backgroundColor: "transparent" },
  webMainColumn: { flex: 1, flexDirection: "column" },
  mainContentContainer: { flex: 1, backgroundColor: "#F4F2FB" },
  webMainContentContainer: {
    backgroundColor: "#FFFFFF", margin: 16, borderRadius: 16, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 4,
  },
  webHeader: {
    backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB",
    elevation: 0, shadowOpacity: 0, paddingTop: 24, paddingHorizontal: 24,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
  },

  // ── Modal ──
  modalOverlayWeb: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalOverlayMobile: { flex: 1, justifyContent: "flex-end" },
  modalContainer: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: "hidden", maxHeight: "90%" },
  modalContainerWeb: { width: "90%", maxWidth: 600, borderRadius: 16 },
  modalHeader: {
    backgroundColor: "#ef7b1a", flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16,
  },
  modalHeaderLeft: { flexDirection: "row", alignItems: "center" },
  modalHeaderIcon: { color: "#FFFFFF", fontSize: 18, marginRight: 8 },
  modalTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  modalCloseText: { color: "#FFFFFF", fontSize: 18, fontWeight: "600" },
  modalBody: { padding: 20 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: "600", color: TEXT_PRIMARY, marginBottom: 6 },
  textAsterisk: { color: "#ef7b1a" },
  textInput: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: TEXT_PRIMARY },
  inputWithPrefix: { flexDirection: "row", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, overflow: "hidden" },
  inputPrefix: { backgroundColor: "#79411c", paddingHorizontal: 12, justifyContent: "center", alignItems: "center" },
  inputPrefixText: { color: "#FFFFFF", fontWeight: "700" },
  textInputNoLeftBorder: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: TEXT_PRIMARY },
  checkboxGroup: { marginBottom: 16 },
  checkboxContainer: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  checkboxOutline: { width: 16, height: 16, borderWidth: 1.5, borderColor: "#E5E7EB", borderRadius: 4, marginRight: 8 },
  checkboxLabel: { fontSize: 13, color: TEXT_PRIMARY, fontWeight: "600" },
  checkboxLabelActive: { fontSize: 13, color: "#059669", fontWeight: "600" },
  checkboxHint: { fontSize: 11, color: TEXT_MUTED, marginLeft: 24 },
  modalFooter: {
    flexDirection: "row", justifyContent: "flex-end", padding: 16,
    borderTopWidth: 1, borderTopColor: "#E5E7EB", backgroundColor: "#F9FAFB", gap: 12,
  },
  btnCancel: { backgroundColor: "#69798c", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  btnCancelText: { color: "#FFFFFF", fontWeight: "600", fontSize: 13 },
  btnUpdate: { backgroundColor: "#79411c", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  btnUpdateText: { color: "#FFFFFF", fontWeight: "600", fontSize: 13 },
  checkboxOutlineActive: { backgroundColor: "#ef7b1a", borderColor: "#ef7b1a", justifyContent: "center", alignItems: "center" },
  checkboxCheck: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },

  // ── Web Table ──
  tableContainer: { backgroundColor: "#FFFFFF", borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: BORDER },
  tableHeaderRow: { flexDirection: "row", backgroundColor: "#FFF3E0", paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  tableHeaderCell: { fontSize: 12, fontWeight: "700", color: TEXT_PRIMARY },
  tableCell: { fontSize: 13, color: TEXT_PRIMARY },
  tableBtnEdit: { backgroundColor: "#1d324e", width: 28, height: 28, borderRadius: 6, justifyContent: "center", alignItems: "center" },
  tableBtnDelete: { backgroundColor: "#ef4444", width: 28, height: 28, borderRadius: 6, justifyContent: "center", alignItems: "center" },
  tableBtnIcon: { fontSize: 12, color: "#FFFFFF" },

  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 12 },
  emptyStateText: { fontSize: 14, color: T.textM, textAlign: "center" },
  retryBtn: { backgroundColor: T.orange, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
});