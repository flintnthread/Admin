/**
 * SellersDashboard.native.tsx
 * React Native (Expo) — full conversion of the Sellers Graph / Analysis web screen.
 *
 * Required packages:
 *   expo install react-native-svg
 *   npx expo install @expo/vector-icons
 *   expo install expo-router
 *
 * Place at: app/sellersdashboard.tsx  (Expo Router)
 */

import AdminLayout from "@/components/admin-layout";
import Pagination from "@/components/Pagination";
import { useAuth } from "@/context/auth-context";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatDate, initialsFromName } from "@/lib/format";
import {
  fetchSellerAnalyticsChart,
  fetchSellerAnalyticsInsights,
  fetchSellerAnalyticsSummary,
  fetchSellerAnalyticsYears,
  fetchSellerDetail,
  fetchSellerGraphNames,
  fetchSellers,
  fetchSellersForGraph,
  exportSellerProductsCsv,
  formatSellerDisplayName,
  formatSellerUniqueId,
  normalizeSellerGraphChart,
  normalizeSellerGraphSummary,
  pickSellerUniqueId,
  readSellerUniqueIdRaw,
  resolveSellerUniqueId,
  type SellerGraphChartData,
  type SellerGraphInsight,
  type SellerGraphNameOption,
  type SellerGraphRow,
} from "@/services/sellerApi";
import { fetchProducts, type ProductListRow } from "@/services/productApi";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import Svg, {
  Circle,
  G, Line, Path,
  Polygon,
  Rect,
  Text as SvgText
} from "react-native-svg";

/* ─── Theme ─────────────────────────────────────────────────────────── */
const ORANGE = "#F97316";
const DARK_NAV = "#1B2332";
const DETAIL_NAVY = "#151D4F";
const DETAIL_NAVY_LIGHT = "#1E3A5F";
const BORDER = "#E8EDF5";
const LIGHT_BG = "#F8FAFC";

/* ─── Data ─────────────────────────────────────────────────────────── */
type Seller = {
  id: number;
  sellerUniqueId: string;
  name: string;
  email: string;
  phone: string;
  business: string;
  onboard: string;
  onboardAt: string;
  status: string;
  profile: string;
  kyc: string;
  supplement: string;
  shiprocket: string;
  shipDate: string | null;
  products: number;
  initials: string;
  color: string;
};

const SELLER_COLORS = ["#F97316", "#10B981", "#8B5CF6", "#3B82F6", "#EC4899", "#06B6D4", "#F59E0B", "#EF4444", "#7C3AED", "#059669"];

function sortSellersByOnboardNewestFirst(items: Seller[]): Seller[] {
  return [...items].sort((a, b) => {
    const aTime = Date.parse(a.onboardAt);
    const bTime = Date.parse(b.onboardAt);
    const aValid = Number.isFinite(aTime);
    const bValid = Number.isFinite(bTime);
    if (aValid && bValid && aTime !== bTime) return bTime - aTime;
    if (aValid && !bValid) return -1;
    if (!aValid && bValid) return 1;
    return b.id - a.id;
  });
}

function sellerPublicId(source: { sellerUniqueId?: string | null; id: number }): string {
  return pickSellerUniqueId(source.id, source.sellerUniqueId);
}

function enrichSellerNameOptions(
  options: SellerGraphNameOption[],
  uniqueById: Map<number, string>
): SellerGraphNameOption[] {
  return options.map((opt) => {
    const knownUniqueId = uniqueById.get(opt.id);
    if (!knownUniqueId) return opt;
    return { ...opt, sellerUniqueId: knownUniqueId };
  });
}

function resolveSellerDropdownOption(
  value: number,
  displayOverride: SellerGraphNameOption | null | undefined,
  options: SellerGraphNameOption[]
): SellerGraphNameOption {
  if (displayOverride?.id === value) return displayOverride;
  const fromOptions = options.find((s) => s.id === value);
  if (fromOptions) return fromOptions;
  return {
    id: value,
    fullName: `Seller #${value}`,
    sellerUniqueId: null,
  };
}

function formatFilterTypeLabel(filterType: string, fromDate: string, toDate: string): string {
  if (fromDate || toDate) return "Date range";
  if (filterType === "Overall") return "Overall (all time)";
  return filterType;
}

function mapSellerGraphRow(s: SellerGraphRow, index: number): Seller {
  const statusRaw = (s.status ?? "").toLowerCase();
  const status =
    statusRaw === "active" ? "Active" :
      statusRaw === "pending" ? "Pending" : "Awaiting Approval";
  return {
    id: s.id,
    sellerUniqueId: sellerPublicId(s),
    name: s.fullName ?? "Seller",
    email: s.email ?? "",
    phone: s.mobile ?? "",
    business: s.businessName ?? "—",
    onboard: formatDate(s.createdAt),
    onboardAt: String(s.createdAt ?? ""),
    status,
    profile: s.profile ?? "Incomplete",
    kyc: s.kyc ?? "Not done",
    supplement: s.supplement ?? "Not Provided",
    shiprocket: s.shiprocket ?? "Not Uploaded",
    shipDate: s.shipDate ?? null,
    products: s.products ?? 0,
    initials: initialsFromName(s.fullName),
    color: SELLER_COLORS[index % SELLER_COLORS.length],
  };
}

const EMPTY_CHART_DATA: SellerGraphChartData = {
  labels: [],
  registered: [],
  profileCompleted: [],
  approved: [],
  productsAdded: [],
  shiprocketUploaded: [],
  maxY: 100,
};

const SERIES = [
  { key: "registered", label: "Registered", color: "#2563EB", dashArray: [], marker: "circle" },
  { key: "profileCompleted", label: "Profile Completed", color: "#16A34A", dashArray: [8, 4], marker: "square" },
  { key: "approved", label: "Approved", color: "#F97316", dashArray: [6, 3, 2, 3], marker: "triangle" },
  { key: "productsAdded", label: "Products Added", color: "#7C3AED", dashArray: [4, 4], marker: "diamond" },
  { key: "shiprocketUploaded", label: "Shiprocket Uploaded", color: "#0891B2", dashArray: [], marker: "star" },
];

const FILTER_OPTIONS = ["Overall", "Monthly", "Weekly", "Quarterly"];
const PERPAGE_OPTIONS = ["10", "25", "50", "100"];
const METRIC_OPTIONS = ["All Metrics", "Registered", "Profile Completed", "Approved", "Products Added", "Shiprocket Uploaded"];

/* ─── Status config ─────────────────────────────────────────────────── */
const STATUS_MAP: Record<string, { bg: string; color: string; border: string }> = {
  "Pending": { bg: "#FEF3C7", color: "#92400E", border: "#FCD34D" },
  "Active": { bg: "#D1FAE5", color: "#065F46", border: "#34D399" },
  "Awaiting Approval": { bg: "#EDE9FE", color: "#4C1D95", border: "#A78BFA" },
  "Complete": { bg: "#D1FAE5", color: "#065F46", border: "#34D399" },
  "Incomplete": { bg: "#FEE2E2", color: "#7F1D1D", border: "#FCA5A5" },
  "Not Uploaded": { bg: "#F3F4F6", color: "#374151", border: "#D1D5DB" },
  "Uploaded": { bg: "#D1FAE5", color: "#065F46", border: "#34D399" },
  "Provided": { bg: "#D1FAE5", color: "#065F46", border: "#34D399" },
  "Not Provided": { bg: "#F3F4F6", color: "#374151", border: "#D1D5DB" },
  "Not done": { bg: "#1F2937", color: "#F9FAFB", border: "#374151" },
  "Yes": { bg: "#D1FAE5", color: "#065F46", border: "#34D399" },
  "No": { bg: "#FEE2E2", color: "#7F1D1D", border: "#FCA5A5" },
  active: { bg: "#D1FAE5", color: "#065F46", border: "#34D399" },
  inactive: { bg: "#F3F4F6", color: "#374151", border: "#D1D5DB" },
};

/* ═══════════════════════════════════════════════════════════════════════
   HELPER COMPONENTS
═══════════════════════════════════════════════════════════════════════ */

/* ─── Avatar ────────────────────────────────────────────────────────── */
function Avatar({ initials, color, size = 36 }: { initials: string; color: string; size?: number }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color + "22",
      borderWidth: 2, borderColor: color + "55",
      alignItems: "center", justifyContent: "center",
    }}>
      <Text style={{ fontWeight: "700", fontSize: size * 0.33, color }}>{initials}</Text>
    </View>
  );
}

/* ─── StatusBadge ───────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || { bg: "#F3F4F6", color: "#374151", border: "#D1D5DB" };
  return (
    <View style={{
      backgroundColor: s.bg, borderWidth: 1, borderColor: s.border,
      borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
      alignSelf: "flex-start",
    }}>
      <Text style={{ fontSize: 11, fontWeight: "600", color: s.color }} numberOfLines={1}>{status}</Text>
    </View>
  );
}

/* ─── Seller label / filter dropdown ────────────────────────────────── */
function formatSellerLabel(
  s: Pick<SellerGraphNameOption, "id" | "fullName" | "businessName" | "sellerUniqueId">
) {
  return formatSellerDisplayName(s);
}

function SellerFilterDropdown({
  value,
  onChange,
  options,
  displayOverride,
  style,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
  options: SellerGraphNameOption[];
  displayOverride?: SellerGraphNameOption | null;
  style?: object;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<View>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const { width: screenW } = Dimensions.get("window");
  const isDesktop = screenW >= 1024;
  const [hovered, setHovered] = useState(false);

  const display = value == null
    ? "All Sellers"
    : formatSellerLabel(resolveSellerDropdownOption(value, displayOverride, options));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((s) => {
      const label = formatSellerLabel(s).toLowerCase();
      const fullName = (s.fullName ?? "").toLowerCase();
      const business = (s.businessName ?? "").toLowerCase();
      const uniqueId = sellerPublicId(s).toLowerCase();
      return (
        label.includes(q) ||
        fullName.includes(q) ||
        business.includes(q) ||
        uniqueId.includes(q) ||
        String(s.id).includes(q)
      );
    });
  }, [options, search]);

  const handlePress = () => {
    if (!open && triggerRef.current) {
      triggerRef.current.measureInWindow((x, y, width, height) => {
        const { width: screenWidth } = Dimensions.get("window");
        const menuWidth = Math.min(Math.max(width, 280), screenWidth - 32);
        const adjustedLeft = Math.min(x, screenWidth - menuWidth - 16);
        setMenuPosition({ top: y + height, left: adjustedLeft, width: menuWidth });
      });
    }
    setOpen((o) => !o);
  };

  const selectSeller = (id: number | null) => {
    onChange(id);
    setOpen(false);
    setSearch("");
  };

  return (
    <View style={[{ minWidth: 160 }, style]}>
      <TouchableOpacity
        ref={triggerRef as any}
        onPress={handlePress}
        activeOpacity={0.8}
        style={styles.dropdownTrigger}
      >
        <Text style={styles.dropdownText} numberOfLines={1}>{display}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={12} color="#94A3B8" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => { setOpen(false); setSearch(""); }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => { setOpen(false); setSearch(""); }} />
        {menuPosition && (
          <View style={[styles.dropdownOverlay, { top: menuPosition.top, left: menuPosition.left, width: menuPosition.width }]}>
            <View style={[styles.dropdownMenu, isDesktop && styles.dropdownMenuDesktop]}>
              <View style={styles.sellerSearchBox}>
                <Ionicons name="search" size={14} color="#94A3B8" />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search seller name, business, or ID..."
                  placeholderTextColor="#94A3B8"
                  style={styles.sellerSearchInput}
                  autoFocus={Platform.OS === "web"}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch("")}>
                    <Ionicons name="close-circle" size={14} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>
              <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator keyboardShouldPersistTaps="handled">
                <Pressable
                  onPress={() => selectSeller(null)}
                  style={({ hovered }: any) => [
                    styles.dropdownItem,
                    value == null ? { backgroundColor: ORANGE } : (hovered && { backgroundColor: "#FFF7ED" })
                  ]}
                >
                  <Text style={{ fontSize: 13, color: value == null ? "#fff" : "#374151", fontWeight: value == null ? "700" : "400" }}>
                    All Sellers
                  </Text>
                </Pressable>
                {filtered.map((s) => {
                  const label = formatSellerLabel(s);
                  const active = value === s.id;
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => selectSeller(s.id)}
                      style={({ hovered }: any) => [
                        styles.dropdownItem,
                        active ? { backgroundColor: ORANGE } : (hovered && { backgroundColor: "#FFF7ED" })
                      ]}
                    >
                      <Text style={{ fontSize: 13, color: active ? "#fff" : "#374151", fontWeight: active ? "700" : "400" }} numberOfLines={2}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
                {filtered.length === 0 && (
                  <View style={{ padding: 14, alignItems: "center" }}>
                    <Text style={{ fontSize: 12, color: "#94A3B8" }}>No sellers match your search</Text>
                  </View>
                )}
              </ScrollView>
              <Text style={styles.sellerDropdownCount}>{options.length} sellers in database</Text>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

/* ─── Dropdown ──────────────────────────────────────────────────────── */
function Dropdown({
  value, onChange, options, style, placeholder, displayValue,
}: {
  value: string; onChange: (v: string) => void;
  options: string[]; style?: object; placeholder?: string; displayValue?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<View>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const { width: screenW } = Dimensions.get("window");
  const isDesktop = screenW >= 1024;
  const [hovered, setHovered] = useState(false);

  const handlePress = () => {
    if (!open && triggerRef.current) {
      triggerRef.current.measureInWindow((x, y, width, height) => {
        const { width: screenWidth } = Dimensions.get("window");
        const menuWidth = Math.min(width, screenWidth - 32);
        const adjustedLeft = Math.min(x, screenWidth - menuWidth - 16);
        setMenuPosition({ top: y + height, left: adjustedLeft, width: menuWidth });
      });
    }
    setOpen(o => !o);
  };

  return (
    <View style={[{ minWidth: 120 }, style]}>
      <TouchableOpacity
        ref={triggerRef as any}
        onPress={handlePress}
        activeOpacity={0.8}
        style={styles.dropdownTrigger}
      >
        <Text style={styles.dropdownText} numberOfLines={1}>{displayValue || value || placeholder || ""}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={12} color="#94A3B8" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
        {menuPosition && (
          <View style={[styles.dropdownOverlay, { top: menuPosition.top, left: menuPosition.left, width: menuPosition.width }]}>
            <View style={[styles.dropdownMenu, isDesktop && styles.dropdownMenuDesktop]}>
              <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
                {options.map(opt => (
                  <Pressable
                    key={opt}
                    onPress={() => { onChange(opt); setOpen(false); }}
                    style={({ hovered }: any) => [
                      styles.dropdownItem,
                      value === opt ? { backgroundColor: ORANGE } : (hovered && { backgroundColor: "#FFF7ED" }),
                    ]}
                  >
                    <Text style={{ fontSize: 13, color: value === opt ? "#fff" : "#374151", fontWeight: value === opt ? "700" : "400" }}>
                      {opt}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}



/* ─── DatePicker Component ───────────────────────────────────────────── */
function DatePicker({ value, onChange, placeholder }: {
  value: string; onChange: (date: string) => void; placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<"calendar" | "month" | "year">("calendar");
  const [selectedDate, setSelectedDate] = useState(value);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const { width: screenW } = Dimensions.get("window");
  const isMobile = screenW < 768;

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) { days.push(null); }
  for (let i = 1; i <= daysInMonth; i++) { days.push(i); }

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const handleDateSelect = (day: number) => {
    const dateStr = `${String(day).padStart(2, '0')}/${String(currentMonth + 1).padStart(2, '0')}/${currentYear}`;
    setSelectedDate(dateStr);
    onChange(dateStr);
    setOpen(false);
  };

  const handleMonthSelect = (idx: number) => {
    setCurrentMonth(idx);
    const day = Number(selectedDate.split('/')[0]) || 1;
    const dateStr = `${String(day).padStart(2, '0')}/${String(idx + 1).padStart(2, '0')}/${currentYear}`;
    setSelectedDate(dateStr);
    onChange(dateStr);
    setOpen(false);
  };

  const handleYearSelect = (y: number) => {
    setCurrentYear(y);
    const day = Number(selectedDate.split('/')[0]) || 1;
    const dateStr = `${String(day).padStart(2, '0')}/${String(currentMonth + 1).padStart(2, '0')}/${y}`;
    setSelectedDate(dateStr);
    onChange(dateStr);
    setOpen(false);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else { setCurrentMonth(currentMonth - 1); }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else { setCurrentMonth(currentMonth + 1); }
  };

  const handleOpenPicker = () => {
    setPickerMode("calendar");
    setOpen(true);
  };

  return (
    <View>
      <Pressable
        onPress={handleOpenPicker}
        style={({ hovered }: any) => [
          styles.dateInputContainer,
          hovered && { backgroundColor: "#FFF7ED" },
          isMobile && { paddingHorizontal: 6, paddingVertical: 8 }
        ]}
      >
        <Ionicons name="calendar" size={isMobile ? 13 : 16} color="#64748B" />
        <TextInput
          value={value} editable={false} placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          style={[
            styles.dateInput,
            isMobile && { fontSize: 11 }
          ]}
          pointerEvents="none"
        />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.datePickerOverlay} onPress={() => setOpen(false)}>
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerHeader}>
              {pickerMode === "calendar" ? (
                <>
                  <TouchableOpacity onPress={handlePrevMonth}>
                    <Ionicons name="chevron-back" size={20} color="#374151" />
                  </TouchableOpacity>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <TouchableOpacity onPress={() => setPickerMode("month")}>
                      <Text style={[styles.datePickerTitle, { color: ORANGE }]}>
                        {monthNames[currentMonth]}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setPickerMode("year")}>
                      <Text style={[styles.datePickerTitle, { color: ORANGE }]}>
                        {currentYear}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={handleNextMonth}>
                    <Ionicons name="chevron-forward" size={20} color="#374151" />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity onPress={() => setPickerMode("calendar")} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="arrow-back" size={20} color="#374151" />
                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151" }}>Back</Text>
                  </TouchableOpacity>
                  <Text style={styles.datePickerTitle}>
                    {pickerMode === "month" ? "Select Month" : "Select Year"}
                  </Text>
                  <View style={{ width: 40 }} />
                </>
              )}
            </View>

            {pickerMode === "calendar" && (
              <View style={{ marginBottom: 0 }}>
                <View style={styles.datePickerWeekHeader}>
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                    <Text key={day} style={styles.datePickerWeekDay}>{day}</Text>
                  ))}
                </View>
                <View style={styles.datePickerDays}>
                  {days.map((day, index) => (
                    <TouchableOpacity
                      key={index} onPress={() => day && handleDateSelect(day)} disabled={!day}
                      style={[
                        styles.datePickerDay,
                        !day && styles.datePickerDayEmpty,
                        selectedDate === `${String(day).padStart(2, '0')}/${String(currentMonth + 1).padStart(2, '0')}/${currentYear}` && styles.datePickerDaySelected,
                      ]}
                    >
                      <Text style={[
                        styles.datePickerDayText,
                        !day && styles.datePickerDayTextEmpty,
                        selectedDate === `${String(day).padStart(2, '0')}/${String(currentMonth + 1).padStart(2, '0')}/${currentYear}` && styles.datePickerDayTextSelected,
                      ]}>{day || ""}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {pickerMode === "month" && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginVertical: 12 }}>
                {monthNames.map((m, idx) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => handleMonthSelect(idx)}
                    style={{
                      width: "30%",
                      paddingVertical: 10,
                      alignItems: "center",
                      borderRadius: 8,
                      backgroundColor: currentMonth === idx ? ORANGE : "#F1F5F9",
                      marginBottom: 10,
                    }}
                  >
                    <Text style={{ color: currentMonth === idx ? "#fff" : "#374151", fontWeight: currentMonth === idx ? "700" : "500", fontSize: 13 }}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {pickerMode === "year" && (
              <ScrollView style={{ maxHeight: 180, marginVertical: 12 }} showsVerticalScrollIndicator={false}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
                  {Array.from({ length: 15 }, (_, i) => 2018 + i).map((y) => (
                    <TouchableOpacity
                      key={y}
                      onPress={() => handleYearSelect(y)}
                      style={{
                        width: "30%",
                        paddingVertical: 10,
                        alignItems: "center",
                        borderRadius: 8,
                        backgroundColor: currentYear === y ? ORANGE : "#F1F5F9",
                        marginBottom: 10,
                      }}
                    >
                      <Text style={{ color: currentYear === y ? "#fff" : "#374151", fontWeight: currentYear === y ? "700" : "500", fontSize: 13 }}>
                        {y}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}

            <TouchableOpacity
              onPress={() => setOpen(false)}
              style={[styles.datePickerCloseBtn, { marginTop: 10 }]}
            >
              <Text style={styles.datePickerCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SVG CHART HELPERS
═══════════════════════════════════════════════════════════════════════ */
function ChartMarker({ type, cx, cy, color, size = 5 }: {
  type: string; cx: number; cy: number; color: string; size?: number;
}) {
  const s = size;
  if (type === "circle")
    return <Circle cx={cx} cy={cy} r={s * 0.7} fill={color} stroke="white" strokeWidth={1.5} />;
  if (type === "square")
    return <Rect x={cx - s * 0.65} y={cy - s * 0.65} width={s * 1.3} height={s * 1.3}
      fill={color} stroke="white" strokeWidth={1.5} />;
  if (type === "triangle") {
    const h = s * 1.3;
    return <Polygon
      points={`${cx},${cy - h} ${cx - h * 0.87},${cy + h * 0.5} ${cx + h * 0.87},${cy + h * 0.5}`}
      fill={color} stroke="white" strokeWidth={1.5} />;
  }
  if (type === "diamond")
    return <Polygon
      points={`${cx},${cy - s} ${cx + s * 0.75},${cy} ${cx},${cy + s} ${cx - s * 0.75},${cy}`}
      fill={color} stroke="white" strokeWidth={1.5} />;
  if (type === "star") {
    const pts: string[] = [];
    for (let i = 0; i < 5; i++) {
      const ao = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const ai = ao + Math.PI / 5;
      pts.push(`${cx + s * Math.cos(ao)},${cy + s * Math.sin(ao)}`);
      pts.push(`${cx + s * 0.4 * Math.cos(ai)},${cy + s * 0.4 * Math.sin(ai)}`);
    }
    return <Polygon points={pts.join(" ")} fill={color} stroke="white" strokeWidth={1} />;
  }
  return null;
}

/* ─── Line Chart ────────────────────────────────────────────────────── */
const CHART_SERIES_KEYS = ["registered", "profileCompleted", "approved", "productsAdded", "shiprocketUploaded"] as const;

function LineChart({
  width,
  activeSeries,
  chartData,
  chartYear,
}: {
  width: number;
  activeSeries: string;
  chartData: SellerGraphChartData;
  chartYear: string;
}) {
  const height = 240;
  const padL = 44, padR = 16, padT = 20, padB = 38;
  const W = width - padL - padR;
  const H = height - padT - padB;
  const maxY = chartData.maxY > 0 ? chartData.maxY : 100;
  const step = Math.max(1, Math.round(maxY / 6));
  const yTicks = Array.from({ length: 7 }, (_, i) => i * step);
  const labels = chartData.labels;
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const chartRef = useRef<View>(null);

  const getSeriesValue = useCallback((key: typeof CHART_SERIES_KEYS[number], idx: number): number => {
    const values = chartData[key];
    if (!Array.isArray(values) || idx < 0 || idx >= values.length) return 0;
    const value = values[idx];
    return typeof value === "number" ? value : Number(value) || 0;
  }, [chartData]);

  const xScale = (i: number) => {
    if (labels.length <= 1) return W / 2;
    return (i / (labels.length - 1)) * W;
  };
  const yScale = (v: number) => H - (v / maxY) * H;

  const visibleSeries = activeSeries === "All Metrics"
    ? SERIES : SERIES.filter(s => s.label === activeSeries);

  const getPath = (key: typeof CHART_SERIES_KEYS[number]) =>
    CHART_SERIES_KEYS.includes(key)
      ? Array.from({ length: labels.length }, (_, i) => getSeriesValue(key, i)).map((v, i) =>
        `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(v).toFixed(1)}`
      ).join(" ")
      : "";

  const updateHoverFromX = useCallback((localX: number) => {
    if (labels.length === 0) return;
    const clampedX = Math.max(0, Math.min(W, localX));
    const idx = labels.length <= 1
      ? 0
      : Math.round((clampedX / W) * (labels.length - 1));
    setHoveredIdx(Math.max(0, Math.min(labels.length - 1, idx)));
  }, [W, labels.length]);

  const handlePointerMove = useCallback((evt: any) => {
    const localX = typeof evt.nativeEvent?.locationX === "number"
      ? evt.nativeEvent.locationX - padL
      : 0;
    updateHoverFromX(localX);
  }, [padL, updateHoverFromX]);

  const handleWebMouseMove = useCallback((evt: any) => {
    if (!chartRef.current) return;
    chartRef.current.measure((_x, _y, _w, _h, pageX, _pageY) => {
      const clientX = evt.nativeEvent?.clientX ?? evt.clientX;
      if (typeof clientX !== "number") return;
      updateHoverFromX(clientX - pageX - padL);
    });
  }, [padL, updateHoverFromX]);

  const ttX = hoveredIdx !== null ? xScale(hoveredIdx) : 0;
  const ttRight = ttX > W * 0.55;
  const ttW = 168, ttLineH = 20, ttPad = 28;

  return (
    <View
      ref={chartRef}
      style={{ width, height }}
      {...(Platform.OS === "web" ? {
        onMouseMove: handleWebMouseMove,
        onMouseLeave: () => setHoveredIdx(null),
      } as object : {})}
    >
      <Svg
        width={width} height={height}
        onPress={handlePointerMove}
        onResponderMove={handlePointerMove}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderRelease={() => setHoveredIdx(null)}
      >
        <G x={padL} y={padT}>
          {yTicks.map(t => (
            <G key={t}>
              <Line x1={0} x2={W} y1={yScale(t)} y2={yScale(t)}
                stroke="#E5E7EB" strokeWidth={t === 0 ? 1 : 0.75} />
              <SvgText x={-6} y={yScale(t) + 4} textAnchor="end"
                fontSize={10} fill="#9CA3AF">{t}</SvgText>
            </G>
          ))}
          {labels.map((l, i) => (
            <SvgText key={`${l}-${i}`} x={xScale(i)} y={H + 16} textAnchor="middle"
              fontSize={9} fill="#6B7280">{l}</SvgText>
          ))}
          {visibleSeries.map(s => (
            <Path key={s.key} d={getPath(s.key as typeof CHART_SERIES_KEYS[number])} fill="none" stroke={s.color}
              strokeWidth={2} strokeDasharray={s.dashArray.join(" ") || undefined}
              strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {visibleSeries.map(s =>
            labels.map((_, i) => (
              <ChartMarker key={`${s.key}-${i}`}
                type={s.marker} cx={xScale(i)} cy={yScale(getSeriesValue(s.key as typeof CHART_SERIES_KEYS[number], i))} color={s.color} size={4} />
            ))
          )}
          {hoveredIdx !== null && (
            <>
              <Line x1={xScale(hoveredIdx)} x2={xScale(hoveredIdx)} y1={0} y2={H}
                stroke="#94A3B8" strokeWidth={1} strokeDasharray="4 3" />
              {visibleSeries.map(s => (
                <ChartMarker key={`h-${s.key}`} type={s.marker}
                  cx={xScale(hoveredIdx)}
                  cy={yScale(getSeriesValue(s.key as typeof CHART_SERIES_KEYS[number], hoveredIdx))}
                  color={s.color} size={7} />
              ))}
              <Rect
                x={ttRight ? xScale(hoveredIdx) - ttW - 8 : xScale(hoveredIdx) + 8}
                y={2} width={ttW} height={visibleSeries.length * ttLineH + ttPad}
                rx={8} fill="white" stroke="#E2E8F0" strokeWidth={1} />
              <SvgText
                x={(ttRight ? xScale(hoveredIdx) - ttW - 8 : xScale(hoveredIdx) + 8) + 10}
                y={17} fontSize={11} fontWeight="bold" fill="#1B2332">
                {labels[hoveredIdx]} {chartYear}
              </SvgText>
              {visibleSeries.map((s, i) => (
                <SvgText key={s.key}
                  x={(ttRight ? xScale(hoveredIdx) - ttW - 8 : xScale(hoveredIdx) + 8) + 10}
                  y={31 + i * ttLineH} fontSize={10} fill={s.color}>
                  {s.label}: {getSeriesValue(s.key as typeof CHART_SERIES_KEYS[number], hoveredIdx)}
                </SvgText>
              ))}
            </>
          )}
        </G>
      </Svg>
    </View>
  );
}

/* ─── Legend Swatch ─────────────────────────────────────────────────── */
function LegendSwatch({ series, active }: { series: typeof SERIES[0]; active: boolean }) {
  return (
    <Svg width={36} height={14} style={{ opacity: active ? 1 : 0.35 }}>
      <Line x1={0} y1={7} x2={36} y2={7}
        stroke={series.color} strokeWidth={2}
        strokeDasharray={series.dashArray.join(" ") || undefined} />
      <ChartMarker type={series.marker} cx={18} cy={7} color={series.color} size={5} />
    </Svg>
  );
}

type CategoryBreakdownRow = {
  category: string;
  subcategory: string;
  products: number;
};

function buildCategoryBreakdown(products: ProductListRow[]): CategoryBreakdownRow[] {
  const map = new Map<string, CategoryBreakdownRow>();
  for (const product of products) {
    const category = String(product.categoryName ?? product.mainCategoryName ?? "—").trim() || "—";
    const subcategory = String(product.subcategoryName ?? "—").trim() || "—";
    const key = `${category}\0${subcategory}`;
    const existing = map.get(key);
    if (existing) {
      existing.products += 1;
    } else {
      map.set(key, { category, subcategory, products: 1 });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.products - a.products);
}

function sellerFromNameOption(option: SellerGraphNameOption, index: number): Seller {
  return {
    id: option.id,
    sellerUniqueId: sellerPublicId(option),
    name: option.fullName ?? `Seller #${option.id}`,
    email: "",
    phone: "",
    business: option.businessName ?? "—",
    onboard: "—",
    onboardAt: "",
    status: "Active",
    profile: "Incomplete",
    kyc: "Not done",
    supplement: "Not Provided",
    shiprocket: "Not Uploaded",
    shipDate: null,
    products: 0,
    initials: initialsFromName(option.fullName),
    color: SELLER_COLORS[index % SELLER_COLORS.length],
  };
}

/* ─── Analytics filter caption + export ─────────────────────────────── */
function AnalyticsFilterCaption({
  filterType,
  filterYear,
  fromDate,
  toDate,
  selectedSellerId,
  sellerName,
  sellerBusiness,
  sellerUniqueId,
  sellerOnboard,
  exportingCsv,
  onExportCsv,
}: {
  filterType: string;
  filterYear: string;
  fromDate: string;
  toDate: string;
  selectedSellerId: number | null;
  sellerName: string;
  sellerBusiness: string;
  sellerUniqueId: string;
  sellerOnboard: string;
  exportingCsv: boolean;
  onExportCsv: () => void;
}) {
  const filterLabel = formatFilterTypeLabel(filterType, fromDate, toDate);
  const business = (sellerBusiness ?? "").trim();
  const name = (sellerName ?? "").trim();
  const uniqueId = (sellerUniqueId ?? "").trim();
  const sellerLabel = business && business !== "—"
    ? business
    : name || uniqueId || "Selected seller";

  return (
    <View style={styles.filterCaptionRow}>
      <Text style={styles.filterCaption}>
        Showing analytics for{" "}
        <Text style={styles.filterCaptionStrong}>{filterLabel}</Text>
        {selectedSellerId != null ? (
          <>
            {" · Seller: "}
            <Text style={styles.filterCaptionStrong}>{sellerLabel}</Text>
            {uniqueId ? ` (${uniqueId})` : ""}
            {sellerOnboard ? ` (Joined ${sellerOnboard})` : ""}
          </>
        ) : (
          <>
            {" · All Sellers"}
            {!fromDate && !toDate ? ` · ${filterYear}` : ""}
          </>
        )}
        {fromDate ? ` · From: ${fromDate}` : ""}
        {toDate ? ` · To: ${toDate}` : ""}
      </Text>
      {selectedSellerId != null ? (
        <TouchableOpacity
          onPress={onExportCsv}
          disabled={exportingCsv}
          style={styles.exportCsvBtn}
          activeOpacity={0.85}
        >
          <Ionicons name="download-outline" size={14} color={ORANGE} />
          <Text style={styles.exportCsvLink}>
            {exportingCsv ? "Exporting..." : "Export Seller CSV"}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SELLER GRAPH DETAIL (full-page analysis for one seller)
═══════════════════════════════════════════════════════════════════════ */
function SellerGraphDetailPanel({
  seller,
  emailVerified,
  products,
  loading,
  onBack,
  isDesktop,
}: {
  seller: Seller;
  emailVerified?: boolean;
  products: ProductListRow[];
  loading: boolean;
  onBack: () => void;
  isDesktop?: boolean;
}) {
  const breakdown = useMemo(() => buildCategoryBreakdown(products), [products]);
  const profileYes = seller.profile === "Complete";
  const emailYes = emailVerified === true;

  return (
    <View style={styles.detailRoot}>
      <LinearGradient
        colors={[DETAIL_NAVY, DETAIL_NAVY_LIGHT]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.detailHero}
      >
        <TouchableOpacity onPress={onBack} style={styles.detailHeroBack}>
          <Ionicons name="arrow-back" size={16} color="#fff" />
          <Text style={styles.detailHeroBackText}>Back to seller list</Text>
        </TouchableOpacity>

        <View style={styles.detailHeroMain}>
          <View style={styles.detailHeroIdentity}>
            <Avatar initials={seller.initials} color={seller.color} size={isDesktop ? 64 : 54} />
            <View style={styles.detailHeroTextCol}>
              <Text style={styles.detailHeroBusiness} numberOfLines={2}>{seller.business}</Text>
              <Text style={styles.detailHeroOwner} numberOfLines={1}>{seller.name}</Text>
              <View style={styles.detailHeroMetaRow}>
                <View style={styles.detailHeroIdPill}>
                  <Text style={styles.detailHeroIdText}>{seller.sellerUniqueId}</Text>
                </View>
                <View style={styles.detailHeroOnboardPill}>
                  <Ionicons name="calendar-outline" size={12} color="#FED7AA" />
                  <Text style={styles.detailHeroOnboardText}>{seller.onboard}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={[styles.detailQuickStats, isDesktop && styles.detailQuickStatsDesktop]}>
            <View style={styles.detailQuickStat}>
              <Text style={styles.detailQuickStatValue}>{seller.products}</Text>
              <Text style={styles.detailQuickStatLabel}>Products</Text>
            </View>
            <View style={styles.detailQuickStatDivider} />
            <View style={styles.detailQuickStat}>
              <StatusBadge status={seller.status} />
              <Text style={styles.detailQuickStatLabel}>Status</Text>
            </View>
            <View style={styles.detailQuickStatDivider} />
            <View style={styles.detailQuickStat}>
              <StatusBadge status={profileYes ? "Yes" : "No"} />
              <Text style={styles.detailQuickStatLabel}>Profile</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <View style={{ flexDirection: isDesktop ? "row" : "column", gap: 14 }}>
        <View style={[styles.detailPanelCard, styles.detailPanelOrange, { flex: 1 }]}>
          <View style={styles.detailPanelHeader}>
            <View style={[styles.detailPanelIcon, { backgroundColor: "#FFEDD5" }]}>
              <Ionicons name="storefront-outline" size={18} color={ORANGE} />
            </View>
            <Text style={styles.detailPanelTitle}>Seller Details</Text>
          </View>

          <View style={styles.detailInfoGrid}>
            <View style={styles.detailInfoTile}>
              <Text style={styles.detailInfoLabel}>Business Name</Text>
              <Text style={styles.detailInfoValue}>{seller.business}</Text>
            </View>
            <View style={styles.detailInfoTile}>
              <Text style={styles.detailInfoLabel}>Owner Name</Text>
              <Text style={styles.detailInfoValue}>{seller.name}</Text>
            </View>
            <View style={styles.detailInfoTile}>
              <Text style={styles.detailInfoLabel}>Onboard date</Text>
              <Text style={styles.detailInfoValue}>{seller.onboard}</Text>
            </View>
          </View>

          <View style={styles.detailBadgeGrid}>
            <View style={styles.detailBadgeItem}>
              <Text style={styles.badgeLabel}>Status</Text>
              <StatusBadge status={seller.status} />
            </View>
            <View style={styles.detailBadgeItem}>
              <Text style={styles.badgeLabel}>Profile completed</Text>
              <StatusBadge status={profileYes ? "Yes" : "No"} />
            </View>
            <View style={styles.detailBadgeItem}>
              <Text style={styles.badgeLabel}>Email verified</Text>
              <StatusBadge status={emailYes ? "Yes" : "No"} />
            </View>
            <View style={styles.detailBadgeItem}>
              <Text style={styles.badgeLabel}>KYC</Text>
              <StatusBadge status={seller.kyc === "Pending" ? "Not done" : seller.kyc} />
            </View>
            <View style={styles.detailBadgeItem}>
              <Text style={styles.badgeLabel}>Shiprocket</Text>
              {seller.shipDate ? (
                <View>
                  <StatusBadge status="Uploaded" />
                  <Text style={styles.detailShipDate}>{seller.shipDate}</Text>
                </View>
              ) : (
                <StatusBadge status={seller.shiprocket} />
              )}
            </View>
          </View>

          <View style={styles.detailContactRow}>
            <View style={styles.detailContactChip}>
              <Ionicons name="mail-outline" size={14} color={ORANGE} />
              <Text style={styles.detailContactText} numberOfLines={1}>{seller.email || "—"}</Text>
            </View>
            <View style={styles.detailContactChip}>
              <Ionicons name="call-outline" size={14} color="#0D9488" />
              <Text style={styles.detailContactText} numberOfLines={1}>{seller.phone || "—"}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.detailPanelCard, styles.detailPanelPurple, { flex: 1 }]}>
          <View style={styles.detailPanelHeader}>
            <View style={[styles.detailPanelIcon, { backgroundColor: "#EDE9FE" }]}>
              <Ionicons name="grid-outline" size={18} color="#7C3AED" />
            </View>
            <Text style={styles.detailPanelTitle}>Category / Subcategory</Text>
          </View>
          <View style={styles.detailTable}>
            <View style={styles.detailTableHeaderDark}>
              <Text style={[styles.detailTableHeadCellDark, { flex: 1.2 }]}>Category</Text>
              <Text style={[styles.detailTableHeadCellDark, { flex: 1.2 }]}>Subcategory</Text>
              <Text style={[styles.detailTableHeadCellDark, { flex: 0.5, textAlign: "right" }]}>Products</Text>
            </View>
            {loading ? (
              <Text style={styles.detailEmptyText}>Loading categories...</Text>
            ) : breakdown.length === 0 ? (
              <Text style={styles.detailEmptyText}>No products listed yet.</Text>
            ) : (
              breakdown.map((row, idx) => (
                <View
                  key={`${row.category}-${row.subcategory}`}
                  style={[styles.detailTableRow, idx % 2 === 1 && styles.detailTableRowAlt]}
                >
                  <Text style={[styles.detailTableCell, { flex: 1.2 }]} numberOfLines={2}>{row.category}</Text>
                  <Text style={[styles.detailTableCell, { flex: 1.2 }]} numberOfLines={2}>{row.subcategory}</Text>
                  <Text style={[styles.detailTableCellAccent, { flex: 0.5, textAlign: "right" }]}>
                    {row.products}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      </View>

      <View style={[styles.detailPanelCard, styles.detailPanelProducts]}>
        <View style={styles.detailProductsHeader}>
          <View style={styles.detailPanelHeader}>
            <View style={[styles.detailPanelIcon, { backgroundColor: "#DBEAFE" }]}>
              <Ionicons name="cube-outline" size={18} color="#2563EB" />
            </View>
            <View>
              <Text style={styles.detailPanelTitle}>Products</Text>
              <Text style={styles.detailProductsSub}>
                {loading ? "Loading products..." : `${products.length} product(s) for this seller`}
              </Text>
            </View>
          </View>
          <View style={styles.detailProductsCountPill}>
            <Text style={styles.detailProductsCountValue}>{seller.products}</Text>
            <Text style={styles.detailProductsCountLabel}>listed</Text>
          </View>
        </View>
        <View style={styles.detailTable}>
          <View style={styles.detailTableHeaderDark}>
            <Text style={[styles.detailTableHeadCellDark, { flex: 0.45 }]}>ID</Text>
            <Text style={[styles.detailTableHeadCellDark, { flex: 2 }]}>Product</Text>
            <Text style={[styles.detailTableHeadCellDark, { flex: 0.9 }]}>Category</Text>
            <Text style={[styles.detailTableHeadCellDark, { flex: 0.9 }]}>Subcategory</Text>
            <Text style={[styles.detailTableHeadCellDark, { flex: 0.8 }]}>Created</Text>
            <Text style={[styles.detailTableHeadCellDark, { flex: 0.6 }]}>Status</Text>
          </View>
          {loading ? (
            <Text style={styles.detailEmptyText}>Loading products...</Text>
          ) : products.length === 0 ? (
            <Text style={styles.detailEmptyText}>No products found for this seller.</Text>
          ) : (
            products.map((product, idx) => (
              <View
                key={String(product.id)}
                style={[styles.detailTableRow, idx % 2 === 1 && styles.detailTableRowAlt]}
              >
                <Text style={[styles.detailTableIdCell, { flex: 0.45 }]}>
                  {product.id}
                </Text>
                <Text style={[styles.detailTableCell, { flex: 2, fontWeight: "600" }]} numberOfLines={2}>
                  {product.name ?? "—"}
                </Text>
                <Text style={[styles.detailTableCell, { flex: 0.9 }]} numberOfLines={1}>
                  {product.categoryName ?? product.mainCategoryName ?? "—"}
                </Text>
                <Text style={[styles.detailTableCell, { flex: 0.9 }]} numberOfLines={1}>
                  {product.subcategoryName ?? "—"}
                </Text>
                <Text style={[styles.detailTableCell, { flex: 0.8 }]}>
                  {formatDate(product.createdAt)}
                </Text>
                <View style={{ flex: 0.6 }}>
                  <StatusBadge
                    status={String(product.status ?? product.displayStatus ?? "—").toLowerCase() === "active"
                      ? "active"
                      : String(product.status ?? product.displayStatus ?? "—")}
                  />
                </View>
              </View>
            ))
          )}
        </View>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SELLER CARD (mobile list item)
═══════════════════════════════════════════════════════════════════════ */
function SellerCard({ item, onView, isDesktop }: { item: Seller; onView: () => void; isDesktop?: boolean }) {
  const handleRedirect = () => {
    router.push({ pathname: "/Viewseller", params: { sellerId: String(item.id) } });
  };

  return (
    <View style={[styles.sellerCard, isDesktop && styles.sellerCardDesktop]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <TouchableOpacity onPress={handleRedirect} style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <Avatar initials={item.initials} color={item.color} size={46} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.sellerCardName}>{item.name}</Text>
            <Text style={styles.sellerCardSub} numberOfLines={1}>✉  {item.email}</Text>
            <Text style={styles.sellerCardSub}>📞 {item.phone}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleRedirect} style={styles.idBadge}>
          <Text style={[styles.idBadgeText, { color: ORANGE }]} numberOfLines={1}>
            {item.sellerUniqueId}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.sellerMetaGrid}>
        {[
          { label: "Business", val: item.business },
          { label: "Onboard", val: item.onboard },
          { label: "Products", val: String(item.products) },
        ].map(({ label, val }) => (
          <View key={label} style={{ flex: 1 }}>
            <Text style={styles.metaLabel}>{label}</Text>
            <Text style={styles.metaVal} numberOfLines={1}>{val}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
        {[
          { label: "Status", val: item.status },
          { label: "Profile", val: item.profile },
          { label: "Supplement", val: item.supplement },
        ].map(b => (
          <View key={b.label}>
            <Text style={styles.badgeLabel}>{b.label}</Text>
            <StatusBadge status={b.val} />
          </View>
        ))}
      </View>
      {item.shipDate && (
        <Text style={styles.shipDateText}>☁  Shiprocket uploaded: {item.shipDate}</Text>
      )}
      <TouchableOpacity onPress={onView} style={styles.viewBtn}>
        <Ionicons name="eye-outline" size={14} color="#fff" />
        <Text style={styles.viewBtnText}>View Details</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   DESKTOP SELLER TABLE ROW
═══════════════════════════════════════════════════════════════════════ */
function DesktopTableRow({ item, idx, onView }: { item: Seller; idx: number; onView: () => void }) {
  const handleRedirect = () => {
    router.push({ pathname: "/Viewseller", params: { sellerId: String(item.id) } });
  };

  return (
    <View style={[
      styles.tableRow,
      idx % 2 === 0 ? { backgroundColor: "#fff" } : { backgroundColor: "#F8FAFC" },
    ]}>
      <TouchableOpacity onPress={handleRedirect} style={{ flex: 0.85 }}>
        <Text style={[styles.tableCell, { fontWeight: "700", color: ORANGE }]} numberOfLines={2}>
          {item.sellerUniqueId}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleRedirect} style={{ flex: 1.6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Avatar initials={item.initials} color={item.color} size={32} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: DARK_NAV }} numberOfLines={1}>{item.name}</Text>
            <Text style={{ fontSize: 11, color: "#94A3B8" }} numberOfLines={1}>{item.email}</Text>
            <Text style={{ fontSize: 11, color: "#94A3B8" }}>{item.phone}</Text>
          </View>
        </View>
      </TouchableOpacity>
      <Text style={[styles.tableCell, { flex: 1.2 }]} numberOfLines={1}>{item.business}</Text>
      <Text style={[styles.tableCell, { flex: 0.9 }]}>{item.onboard}</Text>
      <View style={{ flex: 1.0, justifyContent: "center" }}>
        <StatusBadge status={item.status} />
      </View>
      <View style={{ flex: 0.7, justifyContent: "center" }}>
        <StatusBadge status={item.profile} />
      </View>
      <View style={{ flex: 0.95, justifyContent: "center" }}>
        {item.shipDate ? (
          <View>
            <StatusBadge status="Uploaded" />
            <Text style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>{item.shipDate}</Text>
          </View>
        ) : (
          <StatusBadge status="Not Uploaded" />
        )}
      </View>
      <Text style={[styles.tableCell, { flex: 0.5, textAlign: "center", fontWeight: "700" }]}>{item.products}</Text>
      <View style={{ flex: 0.6, alignItems: "flex-start" }}>
        <TouchableOpacity
          onPress={onView}
          accessibilityLabel="View seller details"
          style={{
            backgroundColor: DARK_NAV,
            borderRadius: 6,
            paddingVertical: 8,
            paddingHorizontal: 8,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="eye-outline" size={14} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN SCREEN
═══════════════════════════════════════════════════════════════════════ */
export default function SellersDashboard() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const { width: screenW } = Dimensions.get("window");
  const isTablet = screenW >= 768;
  const isDesktop = screenW >= 1024;

  const [selectedSellerId, setSelectedSellerId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState("Monthly");
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [yearOptions, setYearOptions] = useState<string[]>([String(new Date().getFullYear())]);
  const [activeSeries, setActiveSeries] = useState("All Metrics");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [chartWidth, setChartWidth] = useState(
    isDesktop ? screenW - 64 : isTablet ? screenW - 48 : screenW - 28
  );

  const [search, setSearch] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [detailEmailVerified, setDetailEmailVerified] = useState<boolean | undefined>(undefined);
  const [detailProducts, setDetailProducts] = useState<ProductListRow[]>([]);
  const [detailProductsLoading, setDetailProductsLoading] = useState(false);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [sellerNameOptions, setSellerNameOptions] = useState<SellerGraphNameOption[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [chartData, setChartData] = useState<SellerGraphChartData>(EMPTY_CHART_DATA);
  const [insights, setInsights] = useState<SellerGraphInsight[]>([]);
  const [totalSellers, setTotalSellers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  const selectedSellerMeta = useMemo(() => {
    if (selectedSellerId == null) return null;
    const fromList = sellers.find((s) => s.id === selectedSellerId);
    const fromSelected = selectedSeller?.id === selectedSellerId ? selectedSeller : null;
    const fromOptions = sellerNameOptions.find((s) => s.id === selectedSellerId);
    const seller = fromList ?? fromSelected;
    return {
      business: seller?.business ?? fromOptions?.businessName ?? "",
      name: seller?.name ?? fromOptions?.fullName ?? "",
      onboard: seller?.onboard ?? "",
      uniqueId: seller?.sellerUniqueId ?? sellerPublicId({
        sellerUniqueId: fromOptions?.sellerUniqueId,
        id: selectedSellerId,
      }),
    };
  }, [selectedSellerId, sellers, selectedSeller, sellerNameOptions]);

  const selectedSellerDisplayOption = useMemo((): SellerGraphNameOption | null => {
    if (selectedSellerId == null || !selectedSellerMeta) return null;
    return {
      id: selectedSellerId,
      fullName: selectedSellerMeta.name,
      businessName: selectedSellerMeta.business,
      sellerUniqueId: selectedSellerMeta.uniqueId,
    };
  }, [selectedSellerId, selectedSellerMeta]);

  const enrichedSellerNameOptions = useMemo(() => {
    const uniqueById = new Map<number, string>();
    for (const seller of sellers) {
      if (seller.sellerUniqueId) uniqueById.set(seller.id, seller.sellerUniqueId);
    }
    if (selectedSeller?.sellerUniqueId) {
      uniqueById.set(selectedSeller.id, selectedSeller.sellerUniqueId);
    }
    return enrichSellerNameOptions(sellerNameOptions, uniqueById);
  }, [sellerNameOptions, sellers, selectedSeller]);

  const graphFilters = useMemo(() => ({
    filterType,
    year: Number(filterYear) || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    sellerId: selectedSellerId ?? undefined,
  }), [filterType, filterYear, fromDate, toDate, selectedSellerId]);

  const loadSellerList = useCallback(async () => {
    if (!token || authLoading) return;
    try {
      let sellerRes;
      try {
        sellerRes = await fetchSellersForGraph({
          search: searchQ || undefined,
          sellerId: selectedSellerId ?? undefined,
          page: page - 1,
          size: perPage,
        });
      } catch {
        sellerRes = await fetchSellers({
          search: searchQ || undefined,
          page: page - 1,
          size: perPage,
        });
      }
      setSellers(
        sortSellersByOnboardNewestFirst(
          (sellerRes.items ?? []).map((row, index) =>
            mapSellerGraphRow(
              {
                ...row,
                sellerUniqueId: pickSellerUniqueId(
                  row.id,
                  row.sellerUniqueId,
                  (row as Record<string, unknown>).seller_unique_id as string | undefined
                ),
              },
              index
            )
          )
        )
      );
      setSellerNameOptions((prev) => {
        const patches = new Map(
          (sellerRes.items ?? []).map((row) => [
            row.id,
            pickSellerUniqueId(
              row.id,
              row.sellerUniqueId,
              (row as Record<string, unknown>).seller_unique_id as string | undefined
            ),
          ])
        );
        if (patches.size === 0) return prev;
        return prev.map((opt) =>
          patches.has(opt.id) ? { ...opt, sellerUniqueId: patches.get(opt.id)! } : opt
        );
      });
      setTotalSellers(sellerRes.totalElements ?? 0);
      setTotalPages(Math.max(1, sellerRes.totalPages ?? 1));
    } catch (e) {
      setLoadError(getApiErrorMessage(e));
    }
  }, [authLoading, searchQ, selectedSellerId, page, perPage, token]);

  const loadSellerNames = useCallback(async () => {
    if (!token || authLoading) return;
    try {
      const names = await fetchSellerGraphNames();
      setSellerNameOptions(names);
    } catch {
      try {
        const fallback = await fetchSellersForGraph({ page: 0, size: 1000 });
        setSellerNameOptions(
          (fallback.items ?? []).map((s) => ({
            id: s.id,
            fullName: s.fullName ?? `Seller #${s.id}`,
            businessName: s.businessName ?? null,
            sellerUniqueId: pickSellerUniqueId(
              s.id,
              s.sellerUniqueId,
              (s as Record<string, unknown>).seller_unique_id as string | undefined
            ),
          }))
        );
      } catch (e) {
        setLoadError(getApiErrorMessage(e));
      }
    }
  }, [authLoading, token]);

  const loadAnalytics = useCallback(async () => {
    if (!token || authLoading) return;
    setDataLoading(true);
    setLoadError(null);
    const errors: string[] = [];

    const [summaryRes, chartRes, insightsRes, yearsRes] = await Promise.allSettled([
      fetchSellerAnalyticsSummary(graphFilters),
      fetchSellerAnalyticsChart(graphFilters),
      fetchSellerAnalyticsInsights(graphFilters),
      fetchSellerAnalyticsYears(),
    ]);

    if (summaryRes.status === "fulfilled") {
      setSummary(normalizeSellerGraphSummary(summaryRes.value as Record<string, unknown>));
    } else {
      errors.push(getApiErrorMessage(summaryRes.reason));
    }

    if (chartRes.status === "fulfilled") {
      setChartData(normalizeSellerGraphChart(chartRes.value));
    } else {
      errors.push(getApiErrorMessage(chartRes.reason));
    }

    if (insightsRes.status === "fulfilled") {
      setInsights(insightsRes.value);
    } else {
      setInsights([]);
    }

    if (yearsRes.status === "fulfilled" && yearsRes.value.length > 0) {
      setYearOptions(yearsRes.value);
      if (!yearsRes.value.includes(filterYear)) {
        setFilterYear(yearsRes.value[0]);
      }
    }

    if (errors.length > 0) {
      setLoadError(errors[0]);
    }
    setDataLoading(false);
  }, [authLoading, graphFilters, filterYear, token]);

  useEffect(() => {
    if (!authLoading && token) {
      loadSellerNames();
    }
  }, [authLoading, loadSellerNames, token]);

  useEffect(() => {
    if (!authLoading && token) {
      loadAnalytics();
    }
  }, [authLoading, loadAnalytics, token]);

  useEffect(() => {
    if (!authLoading && token) {
      loadSellerList();
    }
  }, [authLoading, loadSellerList, token]);

  const doSearch = () => { setSearchQ(search); setPage(1); };
  const doReset = () => { setSearch(""); setSearchQ(""); setPage(1); setPerPage(10); };
  const resetAnalyticsFilters = () => {
    closeSellerDetail();
    setFilterType("Monthly");
    setFilterYear(String(new Date().getFullYear()));
    setFromDate("");
    setToDate("");
    setPage(1);
  };
  const applyFilters = () => {
    setPage(1);
    void loadAnalytics();
    void loadSellerList();
  };

  const downloadCsvFile = useCallback((csvContent: string, filename: string) => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = filename;
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }
    setLoadError("CSV export is available on web only.");
  }, []);

  const handleExportSellerCsv = useCallback(async () => {
    if (selectedSellerId == null) return;
    setExportingCsv(true);
    try {
      const csv = await exportSellerProductsCsv(selectedSellerId);
      const fileId = selectedSellerMeta?.uniqueId ?? `seller_${selectedSellerId}`;
      downloadCsvFile(csv, `products_${fileId}.csv`);
    } catch (e) {
      setLoadError(getApiErrorMessage(e));
    } finally {
      setExportingCsv(false);
    }
  }, [downloadCsvFile, selectedSellerId, selectedSellerMeta?.uniqueId]);

  const openSellerDetail = useCallback((seller: Seller) => {
    setSelectedSeller(seller);
    setSelectedSellerId(seller.id);
    setDetailEmailVerified(undefined);
    setPage(1);
    setSellerNameOptions((prev) =>
      prev.map((opt) =>
        opt.id === seller.id ? { ...opt, sellerUniqueId: seller.sellerUniqueId } : opt
      )
    );
    void fetchSellerDetail(seller.id)
      .then((detail) => {
        const uniqueId = pickSellerUniqueId(
          seller.id,
          seller.sellerUniqueId,
          readSellerUniqueIdRaw(detail as Record<string, unknown>)
        );
        setDetailEmailVerified(Boolean(detail.emailVerified));
        setSelectedSeller((prev) =>
          prev?.id === seller.id ? { ...prev, sellerUniqueId: uniqueId } : prev
        );
        setSellerNameOptions((prev) =>
          prev.map((opt) => (opt.id === seller.id ? { ...opt, sellerUniqueId: uniqueId } : opt))
        );
      })
      .catch(() => {
        setDetailEmailVerified(undefined);
      });
  }, []);

  const closeSellerDetail = useCallback(() => {
    setSelectedSeller(null);
    setSelectedSellerId(null);
    setDetailEmailVerified(undefined);
    setDetailProducts([]);
  }, []);

  const handleSellerFilterChange = useCallback((id: number | null) => {
    setPage(1);
    setSelectedSellerId(id);
    if (id == null) {
      closeSellerDetail();
      return;
    }

    const applySellerDetail = (detail: Awaited<ReturnType<typeof fetchSellerDetail>>) => {
      const uniqueId = pickSellerUniqueId(id, readSellerUniqueIdRaw(detail as Record<string, unknown>));
      setSelectedSeller((prev) => {
        const base = prev?.id === id
          ? prev
          : sellerFromNameOption(
            enrichedSellerNameOptions.find((s) => s.id === id) ?? {
              id,
              fullName: String(detail.fullName ?? `Seller #${id}`),
              businessName: detail.businessName ?? null,
              sellerUniqueId: uniqueId,
            },
            0
          );
        return {
          ...base,
          sellerUniqueId: uniqueId,
          name: String(detail.fullName ?? base.name),
          business: String(detail.businessName ?? base.business),
          email: String(detail.email ?? base.email),
          phone: String(detail.mobile ?? base.phone),
          onboard: detail.createdAt ? formatDate(String(detail.createdAt)) : base.onboard,
        };
      });
      setSellerNameOptions((prev) =>
        prev.map((opt) => (opt.id === id ? { ...opt, sellerUniqueId: uniqueId } : opt))
      );
      setDetailEmailVerified(Boolean(detail.emailVerified));
    };

    const match = sellers.find((s) => s.id === id);
    if (match) {
      setSelectedSeller(match);
    } else {
      const optIndex = sellerNameOptions.findIndex((s) => s.id === id);
      const opt = optIndex >= 0 ? sellerNameOptions[optIndex] : null;
      if (opt) {
        setSelectedSeller(sellerFromNameOption(opt, optIndex));
      }
    }

    void fetchSellerDetail(id)
      .then(applySellerDetail)
      .catch(() => setDetailEmailVerified(undefined));
  }, [closeSellerDetail, sellerNameOptions, sellers, enrichedSellerNameOptions]);

  useEffect(() => {
    if (!selectedSeller || !token || authLoading) {
      setDetailProducts([]);
      return;
    }
    let cancelled = false;
    setDetailProductsLoading(true);
    void (async () => {
      try {
        const response = await fetchProducts({ sellerId: selectedSeller.id, page: 0, size: 500 });
        if (!cancelled) {
          setDetailProducts(response.items ?? []);
        }
      } catch {
        if (!cancelled) {
          setDetailProducts([]);
        }
      } finally {
        if (!cancelled) {
          setDetailProductsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, selectedSeller, token]);

  const statCards = useMemo(
    () => [
      { iconName: "person-add", label: "Registered", value: String(summary.registered ?? summary.total ?? 0), sub: "All sellers", iconBg: "#FFF7ED", iconColor: ORANGE },
      { iconName: "person-done", label: "Profile Completed", value: String(summary.profileCompleted ?? 0), sub: "Completed profiles", iconBg: "#F0FDF4", iconColor: "#10B981" },
      { iconName: "shield-checkmark", label: "Approved", value: String(summary.approved ?? summary.active ?? 0), sub: "Admin approved", iconBg: "#EFF6FF", iconColor: "#3B82F6" },
      { iconName: "cube", label: "Products Added", value: String(summary.productsAdded ?? 0), sub: "Listed products", iconBg: "#F5F3FF", iconColor: "#8B5CF6" },
      { iconName: "cloud-upload", label: "Shiprocket Uploaded", value: String(summary.shiprocketUploaded ?? 0), sub: "Warehouse ready", iconBg: "#ECFDF5", iconColor: "#06B6D4" },
      { iconName: "sync", label: "Pending Bank", value: String(summary.pendingBank ?? 0), sub: "Bank review", iconBg: "#FFF7ED", iconColor: ORANGE },
    ],
    [summary]
  );

  const safePage = Math.min(page, totalPages);
  const paginated = sellers;

  const errorBanner = loadError ? (
    <View style={styles.errorBanner}>
      <Ionicons name="warning-outline" size={16} color="#B45309" />
      <Text style={styles.errorBannerText}>{loadError}</Text>
      <TouchableOpacity onPress={() => { void loadAnalytics(); void loadSellerList(); }}>
        <Text style={styles.errorRetryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  ) : null;



  /* ────────────────────────────────────────────────────────────────────
     DESKTOP LAYOUT
  ──────────────────────────────────────────────────────────────────── */
  if (isDesktop) {
    return (
      <AdminLayout>
        <View style={styles.root}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Header ── */}
            <View style={styles.headerContainer}>
              <View style={styles.pageHeader}>
                <View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="bar-chart" size={20} color={ORANGE} />
                    <Text style={styles.pageTitle}>Sellers Graph / Analysis</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => router.push("/sellers")} style={styles.backBtn}>
                  <Ionicons name="chevron-back" size={13} color="#475569" />
                  <Text style={styles.backBtnText}>Back</Text>
                </TouchableOpacity>
              </View>
            </View>

            {errorBanner}

            {/* ── DESKTOP: All 6 Stat Cards in ONE Row ── */}
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 14, marginTop: -32, marginHorizontal: 22 }}>
              {statCards.map(c => (
                <View key={c.label} style={[styles.statCard, { flex: 1, width: undefined }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statLabel}>{c.label.toUpperCase()}</Text>
                    <Text style={styles.statValue}>{c.value}</Text>
                    {c.sub && <Text style={styles.statSub}>{c.sub}</Text>}
                  </View>
                  <View style={[styles.statIconBox, { backgroundColor: c.iconBg }]}>
                    <Ionicons name={c.iconName as any} size={20} color={c.iconColor} />
                  </View>
                </View>
              ))}
            </View>

            {/* ── DESKTOP: All Filters in ONE Row ── */}
            <View style={[styles.card, { marginBottom: 14 }]}>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-end", flexWrap: "nowrap" }}>
                {/* Seller */}
                <View style={{ flex: 2, minWidth: 160 }}>
                  <View style={styles.filterLabel}>
                    <Ionicons name="person-outline" size={13} color="#64748B" />
                    <Text style={styles.filterLabelText}>Seller</Text>
                  </View>
                  <SellerFilterDropdown
                    value={selectedSellerId}
                    onChange={handleSellerFilterChange}
                    options={enrichedSellerNameOptions}
                    displayOverride={selectedSellerDisplayOption}
                  />
                </View>
                {/* Filter type */}
                <View style={{ flex: 1, minWidth: 110 }}>
                  <View style={styles.filterLabel}>
                    <Ionicons name="funnel-outline" size={13} color="#64748B" />
                    <Text style={styles.filterLabelText}>Filter</Text>
                  </View>
                  <Dropdown value={filterType} onChange={setFilterType} options={FILTER_OPTIONS} />
                </View>
                {/* Year */}
                <View style={{ flex: 0.8, minWidth: 90 }}>
                  <View style={styles.filterLabel}>
                    <Ionicons name="calendar-outline" size={13} color="#64748B" />
                    <Text style={styles.filterLabelText}>Year</Text>
                  </View>
                  <Dropdown value={filterYear} onChange={setFilterYear} options={yearOptions} />
                </View>
                {/* From */}
                <View style={{ flex: 1, minWidth: 130 }}>
                  <View style={styles.filterLabel}>
                    <Ionicons name="calendar-outline" size={13} color="#64748B" />
                    <Text style={styles.filterLabelText}>From</Text>
                  </View>
                  <DatePicker value={fromDate} onChange={setFromDate} placeholder="DD/MM/YYYY" />
                </View>
                {/* To */}
                <View style={{ flex: 1, minWidth: 130 }}>
                  <View style={styles.filterLabel}>
                    <Ionicons name="calendar-outline" size={13} color="#64748B" />
                    <Text style={styles.filterLabelText}>To</Text>
                  </View>
                  <DatePicker value={toDate} onChange={setToDate} placeholder="DD/MM/YYYY" />
                </View>
                {/* Apply button */}
                <TouchableOpacity
                  style={[styles.resetBtn, { paddingHorizontal: 16, alignSelf: "flex-end", height: 40, justifyContent: "center" }]}
                  onPress={resetAnalyticsFilters}
                >
                  <Ionicons name="refresh" size={14} color="#475569" />
                  <Text style={styles.resetBtnText}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.applyBtn, { paddingHorizontal: 20, alignSelf: "flex-end", height: 40, justifyContent: "center" }]}
                  onPress={applyFilters}
                >
                  <Ionicons name="funnel" size={14} color="#fff" />
                  <Text style={styles.applyBtnText}>Apply</Text>
                </TouchableOpacity>
              </View>
              <AnalyticsFilterCaption
                filterType={filterType}
                filterYear={filterYear}
                fromDate={fromDate}
                toDate={toDate}
                selectedSellerId={selectedSellerId}
                sellerName={selectedSellerMeta?.name ?? selectedSeller?.name ?? ""}
                sellerBusiness={selectedSellerMeta?.business ?? selectedSeller?.business ?? ""}
                sellerUniqueId={selectedSellerMeta?.uniqueId ?? ""}
                sellerOnboard={selectedSellerMeta?.onboard ?? selectedSeller?.onboard ?? ""}
                exportingCsv={exportingCsv}
                onExportCsv={() => void handleExportSellerCsv()}
              />
            </View>

            {/* ── DESKTOP: Chart + Key Insights side by side ── */}
            <View style={{ flexDirection: "row", gap: 14, marginBottom: 14 }}>
              {/* Yearly Overview (left, larger) */}
              <View style={[styles.card, { flex: 2, marginBottom: 0 }]}>
                <View style={styles.chartHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.chartTitle}>Yearly Overview</Text>
                    <Text style={styles.chartSubtitle}>Monthly counts for the selected period (hover a point for details)</Text>
                  </View>
                  <Dropdown value={activeSeries} onChange={setActiveSeries}
                    options={METRIC_OPTIONS} style={{ minWidth: 140 }} />
                </View>
                <View onLayout={e => setChartWidth(e.nativeEvent.layout.width)} style={{ width: "100%" }}>
                  {chartWidth > 0 && chartData.labels.length > 0 ? (
                    <LineChart width={chartWidth} activeSeries={activeSeries} chartData={chartData} chartYear={filterYear} />
                  ) : (
                    <View style={styles.chartEmpty}>
                      <Ionicons name="bar-chart-outline" size={32} color="#CBD5E1" />
                      <Text style={styles.chartEmptyText}>
                        {dataLoading ? "Loading chart..." : "No chart data for the selected filters."}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.legendRow}>
                  {SERIES.map(s => {
                    const isActive = activeSeries === "All Metrics" || activeSeries === s.label;
                    return (
                      <TouchableOpacity
                        key={s.key}
                        onPress={() => setActiveSeries(activeSeries === s.label ? "All Metrics" : s.label)}
                        style={[styles.legendItem, { opacity: isActive ? 1 : 0.35 }]}
                      >
                        <LegendSwatch series={s} active={isActive} />
                        <Text style={styles.legendLabel}>{s.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Key Insights (right, smaller) */}
              <View style={[styles.card, { flex: 1, marginBottom: 0 }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
                  <Ionicons name="bulb" size={18} color="#F59E0B" />
                  <Text style={styles.chartTitle}>Key Insights</Text>
                </View>
                {insights.map((ins, i) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                    <View style={[styles.insightIcon, { backgroundColor: ins.bg }]}>
                      <Ionicons name={ins.iconName as any} size={18} color={ins.color} />
                    </View>
                    <Text style={styles.insightText}>{ins.text}</Text>
                  </View>
                ))}
              </View>
            </View>

            {selectedSeller ? (
              <SellerGraphDetailPanel
                seller={selectedSeller}
                emailVerified={detailEmailVerified}
                products={detailProducts}
                loading={detailProductsLoading}
                onBack={closeSellerDetail}
                isDesktop
              />
            ) : null}

            {!selectedSeller ? (
            <View style={[styles.card, { marginBottom: 14 }]}>
              {/* List header */}
              <View style={styles.listHeaderRow}>
                <View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="people" size={16} color={ORANGE} />
                    <Text style={styles.chartTitle}>Seller List</Text>
                  </View>
                  <Text style={styles.chartSubtitle}>Browse all sellers onboarded on our platform</Text>
                </View>
                <View style={styles.totalBadge}>
                  <Ionicons name="person" size={11} color="#64748B" />
                  <Text style={styles.totalBadgeText}>Total {totalSellers}</Text>
                </View>
              </View>

              {/* Search row */}
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 14, alignItems: "center" }}>
                <View style={[styles.searchRow, { flex: 1 }]}>
                  <Ionicons name="search-outline" size={15} color="#94A3B8" />
                  <TextInput
                    value={search} onChangeText={setSearch}
                    onSubmitEditing={doSearch} returnKeyType="search"
                    placeholder="Search name / email / mobile / business..."
                    placeholderTextColor="#94A3B8" style={styles.searchInput}
                  />
                  {search.length > 0 && (
                    <TouchableOpacity onPress={() => { setSearch(""); setSearchQ(""); setPage(1); }}>
                      <Ionicons name="close-circle" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>
                <View style={{ minWidth: 100 }}>
                  <Text style={[styles.filterLabelText, { marginBottom: 4 }]}>Per page</Text>
                  <Dropdown value={String(perPage)} onChange={v => { setPerPage(Number(v)); setPage(1); }} options={PERPAGE_OPTIONS} />
                </View>
                <TouchableOpacity onPress={doSearch} style={[styles.applyBtn, { paddingHorizontal: 20, height: 40, alignSelf: "flex-end", justifyContent: "center" }]}>
                  <Ionicons name="search" size={13} color="#fff" />
                  <Text style={styles.applyBtnText}>Search</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={doReset} style={[styles.resetBtn, { paddingHorizontal: 20, height: 40, alignSelf: "flex-end", justifyContent: "center" }]}>
                  <Ionicons name="refresh" size={13} color="#475569" />
                  <Text style={styles.resetBtnText}>Reset</Text>
                </TouchableOpacity>
              </View>

              {/* Table */}
              <View style={styles.tableContainer}>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { flex: 0.85 }]}>Seller ID</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.6 }]}>Seller</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Business</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 0.9 }]}>Onboard</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.0 }]}>Status</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 0.7 }]}>Profile</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 0.95 }]}>Shiprocket</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 0.5 }]}>Products</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 0.6 }]}>Action</Text>
                </View>

                {/* Table Rows */}
                {paginated.length === 0 ? (
                  <View style={{ alignItems: "center", paddingVertical: 48 }}>
                    <Ionicons name="archive-outline" size={36} color="#CBD5E1" />
                    <Text style={{ fontSize: 14, color: "#94A3B8", marginTop: 10 }}>No sellers found</Text>
                    <TouchableOpacity onPress={doReset} style={styles.clearBtn}>
                      <Text style={{ fontSize: 12, color: ORANGE, fontWeight: "600" }}>Clear filters</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  paginated.map((s, idx) => (
                    <DesktopTableRow key={s.id} item={s} idx={idx} onView={() => openSellerDetail(s)} />
                  ))
                )}
              </View>
            </View>
            ) : null}

            {!selectedSeller ? (
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              totalItems={totalSellers}
              itemsPerPage={perPage}
              itemName="sellers"
              onPageChange={setPage}
            />
            ) : null}


          </ScrollView>
        </View >
      </AdminLayout >
    );
  }

  /* ────────────────────────────────────────────────────────────────────
     MOBILE / TABLET LAYOUT
  ──────────────────────────────────────────────────────────────────── */
  return (
    <AdminLayout>
      <View style={styles.root}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header Container (Dark Blue) ── */}
          <View style={[styles.headerContainer, { paddingHorizontal: 16, paddingBottom: 40 }]}>
            <View style={styles.pageHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="bar-chart" size={20} color={ORANGE} />
                  <Text style={[styles.pageTitle, { flex: 1 }]} numberOfLines={2}>Sellers Graph / Analysis</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => router.push("/sellers")} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={13} color="#475569" />
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
            </View>
          </View>

          {errorBanner}

          {/* ── Stat Cards (mobile: horizontal scroll view with overlap) ── */}
          <View style={{ marginTop: -26, zIndex: 10, marginBottom: 14 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                flexDirection: "row",
                gap: 12,
                paddingHorizontal: 4,
                paddingVertical: 6,
              }}
            >
              {statCards.map((c, i) => (
                <View
                  style={[
                    styles.statCard,
                    {
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      gap: 6,
                      flexDirection: "column",
                      alignItems: "flex-start",
                      width: 135,
                      flexGrow: 0,
                      borderWidth: 1,
                      borderColor: "#E8EDF5",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.05,
                      shadowRadius: 6,
                      elevation: 3,
                    }
                  ]}
                  key={c.label}
                >
                  <View style={[styles.statIconBox, { backgroundColor: c.iconBg, width: 30, height: 30, borderRadius: 15 }]}>
                    <Ionicons name={c.iconName as any} size={14} color={c.iconColor} />
                  </View>
                  <View>
                    <Text style={{ fontSize: 9.5, color: "#888", fontWeight: "600", marginBottom: 2 }} numberOfLines={1}>{c.label}</Text>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: "#1a2332", lineHeight: 15 }} numberOfLines={1}>{c.value}</Text>
                    {c.sub && <Text style={{ fontSize: 8.5, color: "#aaa", marginTop: 2 }} numberOfLines={1}>{c.sub}</Text>}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* ── Filters Card ── */}
          <View style={styles.card}>
            <View style={styles.filterLabel}>
              <Ionicons name="person-outline" size={13} color="#64748B" />
              <Text style={styles.filterLabelText}>Seller</Text>
            </View>
            <SellerFilterDropdown
              value={selectedSellerId}
              onChange={handleSellerFilterChange}
              options={enrichedSellerNameOptions}
              displayOverride={selectedSellerDisplayOption}
              style={{ marginBottom: 12 }}
            />

            <View style={[styles.filterRow]}>
              <View style={{ flex: 1 }}>
                <View style={styles.filterLabel}>
                  <Ionicons name="funnel-outline" size={13} color="#64748B" />
                  <Text style={styles.filterLabelText}>Filter</Text>
                </View>
                <Dropdown value={filterType} onChange={setFilterType} options={FILTER_OPTIONS} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.filterLabel}>
                  <Ionicons name="calendar-outline" size={13} color="#64748B" />
                  <Text style={styles.filterLabelText}>Year</Text>
                </View>
                <Dropdown value={filterYear} onChange={setFilterYear} options={yearOptions} />
              </View>
            </View>

            <View style={[styles.filterRow]}>
              <View style={{ flex: 1 }}>
                <View style={styles.filterLabel}>
                  <Ionicons name="calendar-outline" size={13} color="#64748B" />
                  <Text style={styles.filterLabelText}>From</Text>
                </View>
                <DatePicker value={fromDate} onChange={setFromDate} placeholder="DD/MM/YYYY" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.filterLabel}>
                  <Ionicons name="calendar-outline" size={13} color="#64748B" />
                  <Text style={styles.filterLabelText}>To</Text>
                </View>
                <DatePicker value={toDate} onChange={setToDate} placeholder="DD/MM/YYYY" />
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              <TouchableOpacity style={[styles.resetBtn, { flex: 1 }]} onPress={resetAnalyticsFilters}>
                <Ionicons name="refresh" size={14} color="#475569" />
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.applyBtn, { flex: 2 }]} onPress={applyFilters}>
                <Ionicons name="funnel" size={14} color="#fff" />
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>

            <AnalyticsFilterCaption
              filterType={filterType}
              filterYear={filterYear}
              fromDate={fromDate}
              toDate={toDate}
              selectedSellerId={selectedSellerId}
              sellerName={selectedSellerMeta?.name ?? selectedSeller?.name ?? ""}
              sellerBusiness={selectedSellerMeta?.business ?? selectedSeller?.business ?? ""}
              sellerUniqueId={selectedSellerMeta?.uniqueId ?? ""}
              sellerOnboard={selectedSellerMeta?.onboard ?? selectedSeller?.onboard ?? ""}
              exportingCsv={exportingCsv}
              onExportCsv={() => void handleExportSellerCsv()}
            />
          </View>


          {/* ── Chart Card ── */}
          <View style={[styles.card, { marginBottom: 14 }]}>
            <View style={styles.chartHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.chartTitle}>Yearly Overview</Text>
                <Text style={styles.chartSubtitle}>Monthly counts for the selected period (hover a point for details)</Text>
              </View>
              <Dropdown value={activeSeries} onChange={setActiveSeries}
                options={METRIC_OPTIONS} style={{ minWidth: 140 }} />
            </View>
            <View onLayout={e => setChartWidth(e.nativeEvent.layout.width)} style={{ width: "100%" }}>
              {chartWidth > 0 && chartData.labels.length > 0 ? (
                <LineChart width={chartWidth} activeSeries={activeSeries} chartData={chartData} chartYear={filterYear} />
              ) : (
                <View style={styles.chartEmpty}>
                  <Ionicons name="bar-chart-outline" size={32} color="#CBD5E1" />
                  <Text style={styles.chartEmptyText}>
                    {dataLoading ? "Loading chart..." : "No chart data for the selected filters."}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.legendRow}>
              {SERIES.map(s => {
                const isActive = activeSeries === "All Metrics" || activeSeries === s.label;
                return (
                  <TouchableOpacity
                    key={s.key}
                    onPress={() => setActiveSeries(activeSeries === s.label ? "All Metrics" : s.label)}
                    style={[styles.legendItem, { opacity: isActive ? 1 : 0.35 }]}
                  >
                    <LegendSwatch series={s} active={isActive} />
                    <Text style={styles.legendLabel}>{s.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Key Insights ── */}
          <View style={[styles.card, { marginBottom: 14 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
              <Ionicons name="bulb" size={18} color="#F59E0B" />
              <Text style={styles.chartTitle}>Key Insights</Text>
            </View>
            {insights.map((ins, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                <View style={[styles.insightIcon, { backgroundColor: ins.bg }]}>
                  <Ionicons name={ins.iconName as any} size={18} color={ins.color} />
                </View>
                <Text style={styles.insightText}>{ins.text}</Text>
              </View>
            ))}
          </View>

          {selectedSeller ? (
            <SellerGraphDetailPanel
              seller={selectedSeller}
              emailVerified={detailEmailVerified}
              products={detailProducts}
              loading={detailProductsLoading}
              onBack={closeSellerDetail}
            />
          ) : null}

          {!selectedSeller ? (
          <View style={styles.card}>
            <View style={styles.listHeaderRow}>
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="people" size={16} color={ORANGE} />
                  <Text style={styles.chartTitle}>Seller List</Text>
                </View>
                <Text style={styles.chartSubtitle}>Browse all sellers onboarded on our platform</Text>
              </View>
              <View style={styles.totalBadge}>
                <Ionicons name="person" size={11} color="#64748B" />
                <Text style={styles.totalBadgeText}>Total {totalSellers}</Text>
              </View>
            </View>

            <View style={{ gap: 8, marginBottom: 12, zIndex: 20 }}>
              {/* Search */}
              <View style={styles.searchRow}>
                <TouchableOpacity onPress={doSearch}>
                  <Ionicons name="search-outline" size={15} color={ORANGE} />
                </TouchableOpacity>
                <TextInput
                  value={search} onChangeText={setSearch} onSubmitEditing={doSearch}
                  returnKeyType="search"
                  placeholder="Search sellers..."
                  placeholderTextColor="#94A3B8" style={styles.searchInput}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => { setSearch(""); setSearchQ(""); setPage(1); }}>
                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                {/* Per page */}
                <View style={{ flex: 1 }}>
                  <Dropdown
                    value={String(perPage)}
                    displayValue={`Per Page: ${perPage}`}
                    onChange={v => { setPerPage(Number(v)); setPage(1); }}
                    options={PERPAGE_OPTIONS}
                    style={{ minWidth: 0, flex: 1 }}
                  />
                </View>

                {/* Reset */}
                <TouchableOpacity
                  onPress={doReset}
                  style={[styles.resetBtn, { flex: 1, paddingVertical: 0, height: 38, justifyContent: "center" }]}
                >
                  <Ionicons name="refresh" size={13} color="#475569" />
                  <Text style={styles.resetBtnText}>Reset</Text>
                </TouchableOpacity>
              </View>
            </View>

            {paginated.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 48 }}>
                <Ionicons name="archive-outline" size={36} color="#CBD5E1" />
                <Text style={{ fontSize: 14, color: "#94A3B8", marginTop: 10 }}>No sellers found</Text>
                <TouchableOpacity onPress={doReset} style={styles.clearBtn}>
                  <Text style={{ fontSize: 12, color: ORANGE, fontWeight: "600" }}>Clear filters</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.sellerCardsContainer}>
                {paginated.map(s => (
                  <SellerCard key={s.id} item={s} onView={() => openSellerDetail(s)} />
                ))}
              </View>
            )}
          </View>
          ) : null}

          {!selectedSeller ? (
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={totalSellers}
            itemsPerPage={perPage}
            itemName="sellers"
            onPageChange={setPage}
          />
          ) : null}


        </ScrollView>
      </View >
    </AdminLayout >
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════════════════════════ */
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: LIGHT_BG,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
  },

  headerContainer: {
    backgroundColor: "#151D4F",
    marginHorizontal: 2,
    marginTop: 12,
    borderRadius: 22,
    paddingHorizontal: 32,
    paddingVertical: 28,
    paddingBottom: 68,
    shadowColor: "#151D4F",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 14,
  },

  pageHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 0,
    gap: 10,
  },
  breadcrumb: { fontSize: 12, color: ORANGE, fontWeight: "600" },
  pageTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  backBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10,
    paddingVertical: 7, paddingHorizontal: 14, backgroundColor: "#fff",
  },
  backBtnText: { fontSize: 13, fontWeight: "600", color: "#475569" },

  filterLabel: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 },
  filterLabelText: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 12 },

  applyBtn: {
    backgroundColor: ORANGE, borderRadius: 9, paddingVertical: 11,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
  },
  applyBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  resetBtn: {
    backgroundColor: "#F1F5F9", borderRadius: 9, paddingVertical: 11,
    borderWidth: 1, borderColor: "#E2E8F0",
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
  },
  resetBtnText: { color: "#475569", fontWeight: "700", fontSize: 14 },
  filterCaption: { fontSize: 11, color: "#94A3B8", flex: 1 },
  filterCaptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  filterCaptionStrong: { color: "#475569", fontWeight: "700" },
  exportCsvBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 2,
  },
  exportCsvLink: { fontSize: 11, color: ORANGE, fontWeight: "700" },

  /* Stat Cards */
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    width: "47%", flexGrow: 1,
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#F1F5F9",
    borderRadius: 12, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  statLabel: { fontSize: 10, color: "#94A3B8", fontWeight: "600", letterSpacing: 0.5, marginBottom: 2 },
  statValue: { fontSize: 22, fontWeight: "800", color: DARK_NAV, lineHeight: 24 },
  statSub: { fontSize: 10, color: "#94A3B8", marginTop: 2 },
  statIconBox: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },

  /* Chart */
  chartHeader: {
    flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between",
    marginBottom: 16, gap: 10, flexWrap: "wrap",
  },
  chartTitle: { fontSize: 16, fontWeight: "800", color: DARK_NAV, marginBottom: 2 },
  chartSubtitle: { fontSize: 11, color: "#94A3B8", lineHeight: 16 },
  legendRow: {
    flexDirection: "row", flexWrap: "wrap", gap: 10,
    marginTop: 16, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: "#F1F5F9",
    justifyContent: "center",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendLabel: { fontSize: 11, color: "#374151", fontWeight: "500" },

  /* Insights */
  insightIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  insightText: { flex: 1, fontSize: 13, color: "#475569", lineHeight: 20 },

  /* Seller list */
  listHeaderRow: {
    flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between",
    marginBottom: 14, flexWrap: "wrap", gap: 6,
  },
  totalBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#F1F5F9", borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10,
  },
  totalBadgeText: { fontSize: 12, fontWeight: "700", color: "#64748B" },
  searchRow: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 9,
    paddingHorizontal: 10, backgroundColor: "#fff", gap: 6,
  },
  searchInput: { flex: 1, fontSize: 13, color: "#374151", paddingVertical: 9, outlineStyle: "none" } as any,
  searchControlsRow: { flexDirection: "row", gap: 8, marginBottom: 12, alignItems: "center" },
  showingText: { fontSize: 12, color: "#64748B", marginBottom: 12 },
  clearBtn: {
    marginTop: 10, borderWidth: 1, borderColor: "#E2E8F0",
    borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14,
  },
  sellerCardsContainer: { gap: 12 },

  /* Desktop Table */
  tableContainer: {
    borderWidth: 1, borderColor: BORDER, borderRadius: 10, overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#151D4F",
    paddingVertical: 12, paddingHorizontal: 14,
  },
  tableHeaderCell: {
    fontSize: 12, fontWeight: "700", color: "#fff",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: BORDER,
    alignItems: "center",
  },
  tableCell: { fontSize: 12, color: "#374151" },

  /* Seller card (mobile) */
  sellerCard: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: BORDER,
    borderRadius: 14, padding: 14, marginBottom: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  sellerCardDesktop: { marginBottom: 0 },
  sellerCardName: { fontWeight: "700", color: DARK_NAV, fontSize: 14 },
  sellerCardSub: { fontSize: 11, color: "#94A3B8", marginTop: 1 },
  idBadge: { backgroundColor: "#F1F5F9", borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8, flexShrink: 0 },
  idBadgeText: { fontSize: 11, fontWeight: "700", color: "#94A3B8" },
  sellerMetaGrid: {
    flexDirection: "row", backgroundColor: "#F8FAFC",
    borderRadius: 8, padding: 10, marginTop: 10, gap: 4,
  },
  metaLabel: { fontSize: 9, color: "#94A3B8", fontWeight: "700", textTransform: "uppercase", marginBottom: 3 },
  metaVal: { fontSize: 12, color: "#374151", fontWeight: "600" },
  badgeLabel: { fontSize: 9, color: "#94A3B8", fontWeight: "700", textTransform: "uppercase", marginBottom: 3 },
  shipDateText: { fontSize: 11, color: "#94A3B8", marginTop: 8 },
  viewBtn: {
    backgroundColor: DARK_NAV, borderRadius: 9, paddingVertical: 10,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10,
  },
  viewBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  /* Pagination */
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    flexWrap: "wrap",
    gap: 8,
  },
  pageText: { fontSize: 12, color: "#64748B" },
  pagBtn: {
    width: 32, height: 32, borderWidth: 1, borderColor: "#E2E8F0",
    borderRadius: 8, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },

  /* Dropdown */
  dropdownTrigger: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1, borderColor: BORDER, borderRadius: 8,
    paddingVertical: 9, paddingHorizontal: 12, backgroundColor: "#fff", zIndex: 10,
  },
  dropdownText: { fontSize: 13, color: "#374151", flex: 1, marginRight: 6 },
  dropdownOverlay: { position: "absolute", paddingHorizontal: 0, zIndex: 9999 },
  dropdownMenu: {
    backgroundColor: "#fff", borderRadius: 12,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 12,
    overflow: "hidden", width: "100%", maxWidth: 340, zIndex: 10000,
  },
  dropdownMenuDesktop: { maxWidth: 400 },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: BORDER },
  sellerSearchBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    margin: 10, marginBottom: 6, paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: BORDER, borderRadius: 8, backgroundColor: "#F8FAFC",
  },
  sellerSearchInput: { flex: 1, fontSize: 13, color: "#374151", padding: 0, outlineStyle: "none" } as any,
  sellerDropdownCount: {
    fontSize: 11, color: "#94A3B8", textAlign: "center",
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: BORDER,
  },

  /* Date Input */
  dateInputContainer: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1, borderColor: BORDER, borderRadius: 8,
    backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 9,
  },
  dateInput: { flex: 1, fontSize: 13, color: "#374151", padding: 0, margin: 0, outlineStyle: "none" } as any,

  /* DatePicker Modal */
  datePickerOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center", alignItems: "center",
  },
  datePickerModal: {
    backgroundColor: "#fff", borderRadius: 12, padding: 16, paddingBottom: 10,
    width: "90%", maxWidth: 350,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 8,
  },
  datePickerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  datePickerTitle: { fontSize: 16, fontWeight: "700", color: "#1a2332" },
  datePickerWeekHeader: { flexDirection: "row", marginBottom: 8 },
  datePickerWeekDay: { flex: 1, textAlign: "center", fontSize: 12, fontWeight: "600", color: "#64748B" },
  datePickerDays: { flexDirection: "row", flexWrap: "wrap", marginBottom: 4 },
  datePickerDay: { width: "14.28%", height: 32, justifyContent: "center", alignItems: "center", borderRadius: 8, marginBottom: 4 },
  datePickerDayEmpty: { backgroundColor: "transparent" },
  datePickerDaySelected: { backgroundColor: ORANGE },
  datePickerDayText: { fontSize: 13, color: "#374151" },
  datePickerDayTextEmpty: { color: "transparent" },
  datePickerDayTextSelected: { color: "#fff", fontWeight: "700" },
  datePickerCloseBtn: { backgroundColor: ORANGE, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  datePickerCloseBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  detailBackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginBottom: 2,
  },
  detailBackText: { fontSize: 13, fontWeight: "700", color: ORANGE },
  detailRoot: { gap: 14, marginBottom: 14 },
  detailHero: {
    borderRadius: 18,
    padding: 18,
    overflow: "hidden",
    shadowColor: DETAIL_NAVY,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },
  detailHeroBack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  detailHeroBackText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  detailHeroMain: { gap: 16 },
  detailHeroIdentity: { flexDirection: "row", alignItems: "center", gap: 14 },
  detailHeroTextCol: { flex: 1, minWidth: 0 },
  detailHeroBusiness: { fontSize: 22, fontWeight: "800", color: "#fff", marginBottom: 4 },
  detailHeroOwner: { fontSize: 14, color: "#CBD5E1", fontWeight: "600", marginBottom: 10 },
  detailHeroMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  detailHeroIdPill: {
    backgroundColor: "rgba(249,115,22,0.22)",
    borderWidth: 1,
    borderColor: "rgba(249,115,22,0.45)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  detailHeroIdText: { color: "#FED7AA", fontSize: 12, fontWeight: "800" },
  detailHeroOnboardPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  detailHeroOnboardText: { color: "#E2E8F0", fontSize: 11, fontWeight: "600" },
  detailQuickStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  detailQuickStatsDesktop: { alignSelf: "flex-start", minWidth: 320 },
  detailQuickStat: { flex: 1, alignItems: "center", gap: 6 },
  detailQuickStatValue: { fontSize: 24, fontWeight: "800", color: "#fff" },
  detailQuickStatLabel: { fontSize: 10, color: "#CBD5E1", fontWeight: "700", textTransform: "uppercase" },
  detailQuickStatDivider: { width: 1, height: 36, backgroundColor: "rgba(255,255,255,0.14)" },
  detailPanelCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  detailPanelOrange: { borderLeftWidth: 4, borderLeftColor: ORANGE, backgroundColor: "#FFFBF7" },
  detailPanelPurple: { borderLeftWidth: 4, borderLeftColor: "#7C3AED", backgroundColor: "#FDFCFF" },
  detailPanelProducts: { borderTopWidth: 4, borderTopColor: "#2563EB", backgroundColor: "#FAFCFF" },
  detailPanelHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  detailPanelIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  detailPanelTitle: { fontSize: 16, fontWeight: "800", color: DARK_NAV },
  detailInfoGrid: { gap: 10, marginBottom: 12 },
  detailInfoTile: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 12,
  },
  detailCardTitle: { fontSize: 16, fontWeight: "800", color: DARK_NAV, marginBottom: 14 },
  detailInfoRow: { marginBottom: 10 },
  detailInfoLabel: { fontSize: 11, color: "#94A3B8", fontWeight: "700", marginBottom: 4, textTransform: "uppercase" },
  detailInfoValue: { fontSize: 14, color: DARK_NAV, fontWeight: "700" },
  detailBadgeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 4, marginBottom: 12 },
  detailBadgeItem: { minWidth: 110 },
  detailShipDate: { fontSize: 10, color: "#94A3B8", marginTop: 4 },
  detailContactRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  detailContactChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 180,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  detailContactText: { flex: 1, fontSize: 12, color: "#334155", fontWeight: "600" },
  detailProductsHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  detailProductsSub: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  detailProductsCountPill: {
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 72,
  },
  detailProductsCountValue: { fontSize: 20, fontWeight: "800", color: "#2563EB" },
  detailProductsCountLabel: { fontSize: 10, color: "#64748B", fontWeight: "700", textTransform: "uppercase" },
  detailTable: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  detailTableHeader: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  detailTableHeaderDark: {
    flexDirection: "row",
    backgroundColor: DETAIL_NAVY,
    paddingVertical: 11,
    paddingHorizontal: 12,
    gap: 8,
  },
  detailTableHeadCell: { fontSize: 11, fontWeight: "800", color: "#64748B", textTransform: "uppercase" },
  detailTableHeadCellDark: { fontSize: 11, fontWeight: "800", color: "#E2E8F0", textTransform: "uppercase" },
  detailTableRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#fff",
  },
  detailTableRowAlt: { backgroundColor: "#F8FAFC" },
  detailTableCell: { fontSize: 12, color: "#374151" },
  detailTableCellAccent: { fontSize: 12, color: "#7C3AED", fontWeight: "800" },
  detailTableIdCell: { fontSize: 12, fontWeight: "800", color: ORANGE },
  detailEmptyText: { fontSize: 13, color: "#94A3B8", padding: 18, textAlign: "center" },

  /* Modal */
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center", alignItems: "center", padding: 16,
  },
  modalSheet: {
    backgroundColor: "#fff", borderRadius: 20,
    width: "100%", maxWidth: 520, maxHeight: "88%",
    shadowColor: "#000", shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.22, shadowRadius: 40, elevation: 20, overflow: "hidden",
  },
  modalSheetDesktop: { maxWidth: 700 },
  modalCloseBtn: {
    position: "absolute", top: 12, right: 12, zIndex: 10,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "#E2E8F0", alignItems: "center", justifyContent: "center",
  },
  modalHeader: {
    flexDirection: "row", alignItems: "center",
    padding: 20, paddingRight: 56,
    borderBottomWidth: 1, borderBottomColor: "#F1F5F9",
  },
  modalSellerName: { fontSize: 17, fontWeight: "800", color: DARK_NAV },
  modalBusiness: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  sectionLabel: {
    fontSize: 11, fontWeight: "700", color: "#94A3B8",
    textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10,
  },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  contactLabel: { fontSize: 13, fontWeight: "600", color: "#64748B", minWidth: 76 },
  contactVal: { fontSize: 13, color: "#374151", flex: 1 },
  productsBox: {
    backgroundColor: "#F8FAFC", borderRadius: 10, padding: 16,
    alignItems: "center", borderWidth: 1, borderColor: "#E8EDF5", marginBottom: 12,
  },
  productsCount: { fontSize: 32, fontWeight: "800", color: DARK_NAV },
  productsLabel: { fontSize: 12, color: "#94A3B8", marginTop: 4 },
  shiprocketBox: { backgroundColor: "#ECFDF5", borderRadius: 8, padding: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  shiprocketText: { fontSize: 13, color: "#065F46" },

  footer: { textAlign: "center", paddingVertical: 20, fontSize: 12, color: "#94A3B8", lineHeight: 20 },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  errorBannerText: { flex: 1, fontSize: 12, color: "#92400E", lineHeight: 18 },
  errorRetryText: { fontSize: 12, fontWeight: "700", color: ORANGE },
  chartEmpty: {
    height: 240,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  chartEmptyText: { fontSize: 13, color: "#94A3B8", textAlign: "center", paddingHorizontal: 20 },
});