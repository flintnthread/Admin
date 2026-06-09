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

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
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
const ORANGE   = "#F97316";
const DARK_NAV = "#1B2332";
const BORDER   = "#E8EDF5";
const LIGHT_BG = "#F8FAFC";

/* ─── Data ─────────────────────────────────────────────────────────── */
const ALL_SELLERS = [
  { id: 286, name: "Sanju Sandilya",   email: "sanju.sandilya@gmail.com",  phone: "+91 98765 43210", business: "SG Creations",         onboard: "05 Jun, 2025", status: "Pending",           profile: "Complete",   kyc: "Pending",  supplement: "Not Provided", shiprocket: "Not Uploaded", shipDate: null,           products: 0,  initials: "SS", color: "#F97316" },
  { id: 285, name: "Khajaer Mohammed", email: "khater2025@gmail.com",      phone: "+91 96158 43215", business: "ZOYA ALL BAGS CENTER",  onboard: "29 May, 2025", status: "Active",            profile: "Complete",   kyc: "Pending",  supplement: "Provided",     shiprocket: "Uploaded",     shipDate: "20 May, 2025", products: 2,  initials: "KM", color: "#10B981" },
  { id: 284, name: "Sandhya Gudisa",   email: "sandhya.gm@gmail.com",      phone: "+91 98760 12349", business: "—",                    onboard: "28 May, 2025", status: "Awaiting Approval", profile: "Incomplete", kyc: "Pending",  supplement: "Not Provided", shiprocket: "Not Uploaded", shipDate: null,           products: 0,  initials: "SG", color: "#8B5CF6" },
  { id: 283, name: "Rahul Sharma",     email: "rahul.sharma@gmail.com",    phone: "+91 97654 32109", business: "RS Traders",            onboard: "20 May, 2025", status: "Active",            profile: "Complete",   kyc: "Complete", supplement: "Provided",     shiprocket: "Uploaded",     shipDate: "18 May, 2025", products: 5,  initials: "RS", color: "#3B82F6" },
  { id: 282, name: "Priya Mehta",      email: "priya.mehta@gmail.com",     phone: "+91 96543 21098", business: "PM Boutique",           onboard: "15 May, 2025", status: "Active",            profile: "Complete",   kyc: "Pending",  supplement: "Not Provided", shiprocket: "Not Uploaded", shipDate: null,           products: 3,  initials: "PM", color: "#EC4899" },
  { id: 281, name: "Amit Verma",       email: "amit.verma@gmail.com",      phone: "+91 95432 10987", business: "Verma Electronics",     onboard: "10 May, 2025", status: "Active",            profile: "Complete",   kyc: "Complete", supplement: "Provided",     shiprocket: "Uploaded",     shipDate: "08 May, 2025", products: 12, initials: "AV", color: "#06B6D4" },
  { id: 280, name: "Neha Joshi",       email: "neha.joshi@gmail.com",      phone: "+91 94321 09876", business: "Joshi Handcrafts",      onboard: "05 May, 2025", status: "Pending",           profile: "Incomplete", kyc: "Pending",  supplement: "Not Provided", shiprocket: "Not Uploaded", shipDate: null,           products: 0,  initials: "NJ", color: "#F59E0B" },
  { id: 279, name: "Vikram Singh",     email: "vikram.singh@gmail.com",    phone: "+91 93210 98765", business: "Singh Organics",        onboard: "01 May, 2025", status: "Active",            profile: "Complete",   kyc: "Complete", supplement: "Provided",     shiprocket: "Uploaded",     shipDate: "28 Apr, 2025", products: 7,  initials: "VS", color: "#EF4444" },
  { id: 278, name: "Deepa Nair",       email: "deepa.nair@gmail.com",      phone: "+91 92109 87654", business: "Nair Silks",            onboard: "28 Apr, 2025", status: "Awaiting Approval", profile: "Complete",   kyc: "Pending",  supplement: "Not Provided", shiprocket: "Not Uploaded", shipDate: null,           products: 4,  initials: "DN", color: "#7C3AED" },
  { id: 277, name: "Suresh Babu",      email: "suresh.babu@gmail.com",     phone: "+91 91098 76543", business: "Babu Enterprises",      onboard: "22 Apr, 2025", status: "Active",            profile: "Complete",   kyc: "Complete", supplement: "Provided",     shiprocket: "Uploaded",     shipDate: "20 Apr, 2025", products: 9,  initials: "SB", color: "#059669" },
  { id: 276, name: "Ananya Krishnan",  email: "ananya.k@gmail.com",        phone: "+91 90987 65432", business: "AK Fashion Studio",     onboard: "18 Apr, 2025", status: "Active",            profile: "Complete",   kyc: "Complete", supplement: "Provided",     shiprocket: "Uploaded",     shipDate: "15 Apr, 2025", products: 15, initials: "AK", color: "#DC2626" },
  { id: 275, name: "Manoj Tiwari",     email: "manoj.tiwari@gmail.com",    phone: "+91 89876 54321", business: "Tiwari General Store",  onboard: "12 Apr, 2025", status: "Pending",           profile: "Incomplete", kyc: "Pending",  supplement: "Not Provided", shiprocket: "Not Uploaded", shipDate: null,           products: 0,  initials: "MT", color: "#9333EA" },
  { id: 274, name: "Rekha Pillai",     email: "rekha.pillai@gmail.com",    phone: "+91 88765 43210", business: "Pillai Naturals",       onboard: "08 Apr, 2025", status: "Active",            profile: "Complete",   kyc: "Pending",  supplement: "Provided",     shiprocket: "Uploaded",     shipDate: "05 Apr, 2025", products: 6,  initials: "RP", color: "#0891B2" },
  { id: 273, name: "Arun Mishra",      email: "arun.mishra@gmail.com",     phone: "+91 87654 32109", business: "Mishra Kirana",         onboard: "03 Apr, 2025", status: "Active",            profile: "Complete",   kyc: "Complete", supplement: "Provided",     shiprocket: "Uploaded",     shipDate: "01 Apr, 2025", products: 11, initials: "AM", color: "#16A34A" },
  { id: 272, name: "Kavya Reddy",      email: "kavya.reddy@gmail.com",     phone: "+91 86543 21098", business: "Reddy Textiles",        onboard: "28 Mar, 2025", status: "Awaiting Approval", profile: "Incomplete", kyc: "Pending",  supplement: "Not Provided", shiprocket: "Not Uploaded", shipDate: null,           products: 0,  initials: "KR", color: "#B45309" },
  { id: 271, name: "Ravi Kumar",       email: "ravi.kumar@gmail.com",      phone: "+91 85432 10987", business: "Kumar Spices",          onboard: "22 Mar, 2025", status: "Active",            profile: "Complete",   kyc: "Complete", supplement: "Provided",     shiprocket: "Uploaded",     shipDate: "20 Mar, 2025", products: 8,  initials: "RK", color: "#F97316" },
  { id: 270, name: "Sunita Patel",     email: "sunita.patel@gmail.com",    phone: "+91 84321 09876", business: "Patel Groceries",       onboard: "18 Mar, 2025", status: "Pending",           profile: "Incomplete", kyc: "Pending",  supplement: "Not Provided", shiprocket: "Not Uploaded", shipDate: null,           products: 0,  initials: "SP", color: "#10B981" },
  { id: 269, name: "Arjun Nambiar",    email: "arjun.nambiar@gmail.com",   phone: "+91 83210 98765", business: "Nambiar Exports",       onboard: "14 Mar, 2025", status: "Active",            profile: "Complete",   kyc: "Complete", supplement: "Provided",     shiprocket: "Uploaded",     shipDate: "12 Mar, 2025", products: 20, initials: "AN", color: "#8B5CF6" },
  { id: 268, name: "Divya Menon",      email: "divya.menon@gmail.com",     phone: "+91 82109 87654", business: "Menon Crafts",          onboard: "10 Mar, 2025", status: "Awaiting Approval", profile: "Complete",   kyc: "Pending",  supplement: "Not Provided", shiprocket: "Not Uploaded", shipDate: null,           products: 2,  initials: "DM", color: "#3B82F6" },
  { id: 267, name: "Gopal Das",        email: "gopal.das@gmail.com",       phone: "+91 81098 76543", business: "Das Furniture",         onboard: "05 Mar, 2025", status: "Active",            profile: "Complete",   kyc: "Complete", supplement: "Provided",     shiprocket: "Uploaded",     shipDate: "03 Mar, 2025", products: 14, initials: "GD", color: "#EC4899" },
];

const chartData: Record<string, string[] | number[]> = {
  labels:             ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
  registered:         [10, 20, 28, 50, 90, 160, 300, 450, 580, 680, 760, 880],
  profileCompleted:   [ 0,  2,  5, 10, 20,  50, 120, 220, 320, 430, 500, 590],
  approved:           [ 0,  1,  3,  8, 18,  55, 140, 250, 310, 380, 430, 440],
  productsAdded:      [ 0,  0,  2,  5, 10,  28,  90, 195, 285, 345, 255, 280],
  shiprocketUploaded: [ 0,  0,  0,  2,  5,  10,  25,  50,  70, 100, 115, 140],
};

const SERIES = [
  { key: "registered",         label: "Registered",          color: "#2563EB", dashArray: [],          marker: "circle"   },
  { key: "profileCompleted",   label: "Profile Completed",   color: "#16A34A", dashArray: [8, 4],      marker: "square"   },
  { key: "approved",           label: "Approved",            color: "#F97316", dashArray: [6, 3, 2, 3],marker: "triangle" },
  { key: "productsAdded",      label: "Products Added",      color: "#7C3AED", dashArray: [4, 4],      marker: "diamond"  },
  { key: "shiprocketUploaded", label: "Shiprocket Uploaded", color: "#0891B2", dashArray: [],          marker: "star"     },
];

const YEAR_OPTIONS   = ["2027","2026","2025","2024","2023","2022","2021","2020","2019","2018","2017","2016"];
const FILTER_OPTIONS = ["Overall","Monthly","Weekly","Quarterly"];
const PERPAGE_OPTIONS = ["10","25","50","100"];
const SELLER_OPTIONS = ["All Sellers", ...ALL_SELLERS.map(s => s.name)];
const METRIC_OPTIONS = ["All Metrics","Registered","Profile Completed","Approved","Products Added","Shiprocket Uploaded"];

type Seller = typeof ALL_SELLERS[0];

/* ─── Status config ─────────────────────────────────────────────────── */
const STATUS_MAP: Record<string, { bg: string; color: string; border: string }> = {
  "Pending":           { bg: "#FEF3C7", color: "#92400E", border: "#FCD34D" },
  "Active":            { bg: "#D1FAE5", color: "#065F46", border: "#34D399" },
  "Awaiting Approval": { bg: "#EDE9FE", color: "#4C1D95", border: "#A78BFA" },
  "Complete":          { bg: "#D1FAE5", color: "#065F46", border: "#34D399" },
  "Incomplete":        { bg: "#FEE2E2", color: "#7F1D1D", border: "#FCA5A5" },
  "Not Uploaded":      { bg: "#F3F4F6", color: "#374151", border: "#D1D5DB" },
  "Uploaded":          { bg: "#D1FAE5", color: "#065F46", border: "#34D399" },
  "Provided":          { bg: "#D1FAE5", color: "#065F46", border: "#34D399" },
  "Not Provided":      { bg: "#F3F4F6", color: "#374151", border: "#D1D5DB" },
  "Not done":          { bg: "#1F2937", color: "#F9FAFB", border: "#374151" },
};

const STAT_CARDS = [
  { iconName: "person-add",        label: "Registered",           value: "141", sub: "in 2025",          iconBg: "#FFF7ED", iconColor: ORANGE    },
  { iconName: "person-done",       label: "Profile Completed",    value: "74",  sub: "in 2025",          iconBg: "#F0FDF4", iconColor: "#10B981" },
  { iconName: "shield-checkmark",  label: "Approved",             value: "71",  sub: "Active + Profile", iconBg: "#EFF6FF", iconColor: "#3B82F6" },
  { iconName: "cube",              label: "Products Added",       value: "707", sub: "in 2025",          iconBg: "#F5F3FF", iconColor: "#8B5CF6" },
  { iconName: "cloud-upload",      label: "Ship Rocket",          value: "70",  sub: "CSV uploaded",     iconBg: "#ECFDF5", iconColor: "#06B6D4" },
  { iconName: "sync",              label: "Shiprocket Sync",      value: "On",  sub: "Seller sync",      iconBg: "#FFF7ED", iconColor: ORANGE    },
];

const INSIGHTS = [
  { iconName: "trending-up",       text: "Registered sellers increased by 85% vs previous period.", color: "#2563EB", bg: "#EFF6FF" },
  { iconName: "checkmark-circle",  text: "71 sellers are fully approved and active.",               color: "#16A34A", bg: "#F0FDF4" },
  { iconName: "cube",              text: "707 products added in 2025.",                             color: "#7C3AED", bg: "#F5F3FF" },
  { iconName: "sync",              text: "Shiprocket sync is currently running smoothly.",          color: ORANGE,    bg: "#FFF7ED" },
];

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
      <Text style={{ fontSize: 11, fontWeight: "600", color: s.color }}>{status}</Text>
    </View>
  );
}

/* ─── Dropdown ──────────────────────────────────────────────────────── */
function Dropdown({
  value, onChange, options, style,
}: {
  value: string; onChange: (v: string) => void;
  options: string[]; style?: object;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<View>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const { width: screenW } = Dimensions.get("window");
  const isDesktop = screenW >= 1024;

  const handlePress = () => {
    if (!open && triggerRef.current) {
      triggerRef.current.measure((x, y, width, height, pageX, pageY) => {
        const { width: screenWidth } = Dimensions.get("window");
        const menuWidth = Math.min(width, screenWidth - 32);
        const adjustedLeft = Math.min(pageX, screenWidth - menuWidth - 16);
        setMenuPosition({ top: pageY + height, left: adjustedLeft, width: menuWidth });
      });
    }
    setOpen(o => !o);
  };

  return (
    <View style={[{ minWidth: 120 }, style]}>
      <TouchableOpacity
        ref={triggerRef as any}
        activeOpacity={0.8}
        onPress={handlePress}
        style={styles.dropdownTrigger}
      >
        <Text style={styles.dropdownText} numberOfLines={1}>{value}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={12} color="#94A3B8" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
        {menuPosition && (
          <View style={[styles.dropdownOverlay, { top: menuPosition.top, left: menuPosition.left, width: menuPosition.width }]}>
            <View style={[styles.dropdownMenu, isDesktop && styles.dropdownMenuDesktop]}>
              <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
                {options.map(opt => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => { onChange(opt); setOpen(false); }}
                    style={[
                      styles.dropdownItem,
                      value === opt && { backgroundColor: ORANGE },
                    ]}
                  >
                    <Text style={{ fontSize: 13, color: value === opt ? "#fff" : "#374151", fontWeight: value === opt ? "700" : "400" }}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

/* ─── Pagination Button ─────────────────────────────────────────────── */
function PagBtn({ iconName, onPress, disabled, active }: {
  iconName: keyof typeof Ionicons.glyphMap;
  onPress: () => void; disabled?: boolean; active?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress} disabled={disabled}
      style={[styles.pagBtn, active && { backgroundColor: ORANGE, borderColor: ORANGE }]}
    >
      <Ionicons name={iconName} size={12}
        color={disabled ? "#CBD5E1" : active ? "#fff" : "#374151"} />
    </TouchableOpacity>
  );
}

/* ─── DatePicker Component ───────────────────────────────────────────── */
function DatePicker({ value, onChange, placeholder }: {
  value: string; onChange: (date: string) => void; placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) { days.push(null); }
  for (let i = 1; i <= daysInMonth; i++) { days.push(i); }

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const handleDateSelect = (day: number) => {
    const dateStr = `${String(day).padStart(2,'0')}/${String(currentMonth+1).padStart(2,'0')}/${currentYear}`;
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

  return (
    <View>
      <TouchableOpacity onPress={() => setOpen(true)} style={styles.dateInputContainer}>
        <TextInput
          value={value} editable={false} placeholder={placeholder}
          placeholderTextColor="#94A3B8" style={styles.dateInput}
        />
        <Ionicons name="calendar" size={16} color="#64748B" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.datePickerOverlay} onPress={() => setOpen(false)}>
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerHeader}>
              <TouchableOpacity onPress={handlePrevMonth}>
                <Ionicons name="chevron-back" size={20} color="#374151" />
              </TouchableOpacity>
              <Text style={styles.datePickerTitle}>{monthNames[currentMonth]} {currentYear}</Text>
              <TouchableOpacity onPress={handleNextMonth}>
                <Ionicons name="chevron-forward" size={20} color="#374151" />
              </TouchableOpacity>
            </View>
            <View style={styles.datePickerWeekHeader}>
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(day => (
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
                    selectedDate === `${String(day).padStart(2,'0')}/${String(currentMonth+1).padStart(2,'0')}/${currentYear}` && styles.datePickerDaySelected,
                  ]}
                >
                  <Text style={[
                    styles.datePickerDayText,
                    !day && styles.datePickerDayTextEmpty,
                    selectedDate === `${String(day).padStart(2,'0')}/${String(currentMonth+1).padStart(2,'0')}/${currentYear}` && styles.datePickerDayTextSelected,
                  ]}>{day || ""}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.datePickerCloseBtn} onPress={() => setOpen(false)}>
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
function LineChart({ width, activeSeries }: { width: number; activeSeries: string }) {
  const height   = 240;
  const padL = 44, padR = 16, padT = 20, padB = 38;
  const W = width - padL - padR;
  const H = height - padT - padB;
  const maxY = 900;
  const yTicks = [0, 150, 300, 450, 600, 750, 900];
  const labels  = chartData.labels as string[];
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const xScale = (i: number) => (i / (labels.length - 1)) * W;
  const yScale = (v: number) => H - (v / maxY) * H;

  const visibleSeries = activeSeries === "All Metrics"
    ? SERIES : SERIES.filter(s => s.label === activeSeries);

  const getPath = (key: string) =>
    (chartData[key] as number[]).map((v, i) =>
      `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(v).toFixed(1)}`
    ).join(" ");

  const handleTouch = (evt: any) => {
    const touchX = evt.nativeEvent.locationX - padL;
    const idx = Math.round((touchX / W) * (labels.length - 1));
    setHoveredIdx(Math.max(0, Math.min(labels.length - 1, idx)));
  };

  const ttX = hoveredIdx !== null ? xScale(hoveredIdx) : 0;
  const ttRight = ttX > W * 0.55;
  const ttW = 155, ttLineH = 20, ttPad = 28;

  return (
    <Svg
      width={width} height={height}
      onPress={handleTouch}
      onResponderMove={(e: any) => {
        const x = e.nativeEvent.locationX - padL;
        const idx = Math.round((x / W) * (labels.length - 1));
        setHoveredIdx(Math.max(0, Math.min(labels.length - 1, idx)));
      }}
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
          <SvgText key={l} x={xScale(i)} y={H + 16} textAnchor="middle"
            fontSize={9} fill="#6B7280">{l}</SvgText>
        ))}
        {visibleSeries.map(s => (
          <Path key={s.key} d={getPath(s.key)} fill="none" stroke={s.color}
            strokeWidth={2} strokeDasharray={s.dashArray.join(" ") || undefined}
            strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {visibleSeries.map(s =>
          (chartData[s.key] as number[]).map((v, i) => (
            <ChartMarker key={`${s.key}-${i}`}
              type={s.marker} cx={xScale(i)} cy={yScale(v)} color={s.color} size={4} />
          ))
        )}
        {hoveredIdx !== null && (
          <>
            <Line x1={xScale(hoveredIdx)} x2={xScale(hoveredIdx)} y1={0} y2={H}
              stroke="#94A3B8" strokeWidth={1} strokeDasharray="4 3" />
            {visibleSeries.map(s => (
              <ChartMarker key={`h-${s.key}`} type={s.marker}
                cx={xScale(hoveredIdx)}
                cy={yScale((chartData[s.key] as number[])[hoveredIdx])}
                color={s.color} size={7} />
            ))}
            <Rect
              x={ttRight ? xScale(hoveredIdx) - ttW - 8 : xScale(hoveredIdx) + 8}
              y={2} width={ttW} height={visibleSeries.length * ttLineH + ttPad}
              rx={8} fill="white" stroke="#E2E8F0" strokeWidth={1} />
            <SvgText
              x={(ttRight ? xScale(hoveredIdx) - ttW - 8 : xScale(hoveredIdx) + 8) + 10}
              y={17} fontSize={11} fontWeight="bold" fill="#1B2332">
              {labels[hoveredIdx]} 2025
            </SvgText>
            {visibleSeries.map((s, i) => (
              <SvgText key={s.key}
                x={(ttRight ? xScale(hoveredIdx) - ttW - 8 : xScale(hoveredIdx) + 8) + 10}
                y={31 + i * ttLineH} fontSize={10} fill={s.color}>
                {s.label}: {(chartData[s.key] as number[])[hoveredIdx]}
              </SvgText>
            ))}
          </>
        )}
      </G>
    </Svg>
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

/* ═══════════════════════════════════════════════════════════════════════
   SELLER MODAL
═══════════════════════════════════════════════════════════════════════ */
function SellerModal({ seller, onClose }: { seller: Seller | null; onClose: () => void }) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const { width: screenW } = Dimensions.get("window");
  const isDesktop = screenW >= 1024;

  useEffect(() => {
    if (seller) {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
      ]).start();
    }
  }, [seller]);

  if (!seller) return null;

  const statusFields = [
    { label: "Status",     val: seller.status     },
    { label: "Profile",    val: seller.profile    },
    { label: "KYC",        val: seller.kyc        },
    { label: "Supplement", val: seller.supplement },
    { label: "Shiprocket", val: seller.shiprocket },
  ];

  return (
    <Modal visible={!!seller} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[
          styles.modalSheet,
          isDesktop && styles.modalSheetDesktop,
          { transform: [{ translateY: slideAnim }] }
        ]}>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
            <Ionicons name="close-circle" size={22} color="#475569" />
          </TouchableOpacity>
          <View style={[styles.modalHeader, { borderBottomColor: "#F1F5F9" }]}>
            <Avatar initials={seller.initials} color={seller.color} size={50} />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.modalSellerName}>{seller.name}</Text>
              <Text style={styles.modalBusiness}>{seller.business}</Text>
            </View>
          </View>
          <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>
              <Ionicons name="person" size={11} color={ORANGE} />{"  "}CONTACT
            </Text>
            {[
              { iconName: "mail-outline"     as keyof typeof Ionicons.glyphMap, label: "Email",     val: seller.email   },
              { iconName: "call-outline"     as keyof typeof Ionicons.glyphMap, label: "Phone",     val: seller.phone   },
              { iconName: "calendar-outline" as keyof typeof Ionicons.glyphMap, label: "Onboarded", val: seller.onboard },
            ].map(r => (
              <View key={r.label} style={styles.contactRow}>
                <Ionicons name={r.iconName} size={14} color="#94A3B8" style={{ width: 18 }} />
                <Text style={styles.contactLabel}>{r.label}:</Text>
                <Text style={styles.contactVal} numberOfLines={1}>{r.val}</Text>
              </View>
            ))}
            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
              <Ionicons name="shield-checkmark-outline" size={11} color={ORANGE} />{"  "}STATUS
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
              {statusFields.map(b => (
                <View key={b.label}>
                  <Text style={styles.badgeLabel}>{b.label}</Text>
                  <StatusBadge status={b.val} />
                </View>
              ))}
            </View>
            <Text style={styles.sectionLabel}>
              <Ionicons name="cube-outline" size={11} color={ORANGE} />{"  "}PRODUCTS
            </Text>
            <View style={styles.productsBox}>
              <Text style={styles.productsCount}>{seller.products}</Text>
              <Text style={styles.productsLabel}>Total Products Listed</Text>
            </View>
            {seller.shipDate && (
              <View style={styles.shiprocketBox}>
                <Ionicons name="cloud-done-outline" size={15} color="#10B981" />
                <Text style={styles.shiprocketText}>Shiprocket uploaded: {seller.shipDate}</Text>
              </View>
            )}
            <View style={{ height: 20 }} />
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SELLER CARD (mobile list item)
═══════════════════════════════════════════════════════════════════════ */
function SellerCard({ item, onView, isDesktop }: { item: Seller; onView: () => void; isDesktop?: boolean }) {
  return (
    <View style={[styles.sellerCard, isDesktop && styles.sellerCardDesktop]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Avatar initials={item.initials} color={item.color} size={46} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.sellerCardName}>{item.name}</Text>
          <Text style={styles.sellerCardSub} numberOfLines={1}>✉  {item.email}</Text>
          <Text style={styles.sellerCardSub}>📞 {item.phone}</Text>
        </View>
        <View style={styles.idBadge}>
          <Text style={styles.idBadgeText}>#{item.id}</Text>
        </View>
      </View>
      <View style={styles.sellerMetaGrid}>
        {[
          { label: "Business", val: item.business  },
          { label: "Onboard",  val: item.onboard   },
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
          { label: "Status",     val: item.status     },
          { label: "Profile",    val: item.profile    },
          { label: "KYC",        val: item.kyc === "Pending" ? "Not done" : item.kyc },
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
  return (
    <View style={[
      styles.tableRow,
      idx % 2 === 0 ? { backgroundColor: "#fff" } : { backgroundColor: "#F8FAFC" },
    ]}>
      <Text style={[styles.tableCell, { flex: 0.5, fontWeight: "700", color: "#64748B" }]}>#{item.id}</Text>
      <View style={{ flex: 1.6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Avatar initials={item.initials} color={item.color} size={32} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: DARK_NAV }} numberOfLines={1}>{item.name}</Text>
            <Text style={{ fontSize: 11, color: "#94A3B8" }} numberOfLines={1}>{item.email}</Text>
            <Text style={{ fontSize: 11, color: "#94A3B8" }}>{item.phone}</Text>
          </View>
        </View>
      </View>
      <Text style={[styles.tableCell, { flex: 1.2 }]} numberOfLines={1}>{item.business}</Text>
      <Text style={[styles.tableCell, { flex: 0.9 }]}>{item.onboard}</Text>
      <View style={{ flex: 0.7, justifyContent: "center" }}>
        <StatusBadge status={item.status} />
      </View>
      <View style={{ flex: 0.7, justifyContent: "center" }}>
        <StatusBadge status={item.profile} />
      </View>
      <View style={{ flex: 0.65, justifyContent: "center" }}>
        <StatusBadge status={item.kyc === "Pending" ? "Not done" : item.kyc} />
      </View>
      <View style={{ flex: 0.9, justifyContent: "center" }}>
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
          style={{
            backgroundColor: DARK_NAV, borderRadius: 6,
            paddingVertical: 6, paddingHorizontal: 12,
            flexDirection: "row", alignItems: "center", gap: 4,
          }}
        >
          <Ionicons name="eye-outline" size={12} color="#fff" />
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#fff" }}>View</Text>
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
  const { width: screenW } = Dimensions.get("window");
  const isTablet  = screenW >= 768;
  const isDesktop = screenW >= 1024;

  const [sellerFilter, setSellerFilter] = useState("All Sellers");
  const [filterType,   setFilterType]   = useState("Overall");
  const [filterYear,   setFilterYear]   = useState("2025");
  const [activeSeries, setActiveSeries] = useState("All Metrics");
  const [fromDate,     setFromDate]     = useState("");
  const [toDate,       setToDate]       = useState("");

  const [chartWidth, setChartWidth] = useState(
    isDesktop ? screenW - 64 : isTablet ? screenW - 48 : screenW - 28
  );

  const [search,   setSearch]   = useState("");
  const [searchQ,  setSearchQ]  = useState("");
  const [page,     setPage]     = useState(1);
  const [perPage,  setPerPage]  = useState(10);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);

  const filteredSellers = ALL_SELLERS.filter(s => {
    const q = searchQ.toLowerCase();
    const matchQ = !q
      || s.name.toLowerCase().includes(q)
      || s.email.toLowerCase().includes(q)
      || s.business.toLowerCase().includes(q)
      || s.phone.includes(q);
    const matchSeller = sellerFilter === "All Sellers" || s.name === sellerFilter;
    return matchQ && matchSeller;
  });

  const totalPages = Math.max(1, Math.ceil(filteredSellers.length / perPage));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filteredSellers.slice((safePage - 1) * perPage, safePage * perPage);

  const doSearch = () => { setSearchQ(search); setPage(1); };
  const doReset  = () => { setSearch(""); setSearchQ(""); setPage(1); setPerPage(10); };
  const applyFilters = () => {
    console.log("Applying filters:", { filterType, sellerFilter, filterYear, fromDate, toDate });
  };

  const pageNums: (number | string)[] = (() => {
    if (totalPages <= 5) return [...Array(totalPages)].map((_, i) => i + 1);
    if (safePage <= 3)   return [1, 2, 3, "...", totalPages];
    if (safePage >= totalPages - 2) return [1, "...", totalPages - 2, totalPages - 1, totalPages];
    return [1, "...", safePage, "...", totalPages];
  })();

  /* ────────────────────────────────────────────────────────────────────
     DESKTOP LAYOUT
  ──────────────────────────────────────────────────────────────────── */
  if (isDesktop) {
    return (
      <View style={styles.root}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 32, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ── */}
          <View style={styles.headerContainer}>
            <View style={styles.pageHeader}>
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
                  <Ionicons name="home" size={12} color={ORANGE} />
                  <Text style={styles.breadcrumb}>Dashboard</Text>
                  <Ionicons name="chevron-forward" size={10} color="#94A3B8" />
                  <Text style={styles.breadcrumb}>Sellers</Text>
                  <Ionicons name="chevron-forward" size={10} color="#94A3B8" />
                  <Text style={{ fontSize: 12, color: "#94A3B8" }}>Sellers Graph</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="bar-chart" size={20} color={ORANGE} />
                  <Text style={styles.pageTitle}>Sellers Graph / Analysis</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={13} color="#475569" />
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
            </View>
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
                <Dropdown value={sellerFilter} onChange={v => { setSellerFilter(v); setPage(1); }} options={SELLER_OPTIONS} />
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
                <Dropdown value={filterYear} onChange={setFilterYear} options={YEAR_OPTIONS} />
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
                style={[styles.applyBtn, { paddingHorizontal: 20, alignSelf: "flex-end", height: 40, justifyContent: "center" }]}
                onPress={applyFilters}
              >
                <Ionicons name="funnel" size={14} color="#fff" />
                <Text style={styles.applyBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.filterCaption}>
              Showing analytics for {filterType} · {sellerFilter} · {filterYear}
              {fromDate && ` · From: ${fromDate}`}
              {toDate && ` · To: ${toDate}`}
            </Text>
          </View>

          {/* ── DESKTOP: All 6 Stat Cards in ONE Row ── */}
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 14 }}>
            {STAT_CARDS.map(c => (
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

          {/* ── DESKTOP: Chart + Key Insights side by side ── */}
          <View style={{ flexDirection: "row", gap: 14, marginBottom: 14 }}>
            {/* Yearly Overview (left, larger) */}
            <View style={[styles.card, { flex: 2, marginBottom: 0 }]}>
              <View style={styles.chartHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.chartTitle}>Yearly Overview</Text>
                  <Text style={styles.chartSubtitle}>Performance overview of all sellers for the selected period</Text>
                </View>
                <Dropdown value={activeSeries} onChange={setActiveSeries}
                  options={METRIC_OPTIONS} style={{ minWidth: 140 }} />
              </View>
              <View onLayout={e => setChartWidth(e.nativeEvent.layout.width)} style={{ width: "100%" }}>
                {chartWidth > 0 && <LineChart width={chartWidth} activeSeries={activeSeries} />}
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
              {INSIGHTS.map((ins, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                  <View style={[styles.insightIcon, { backgroundColor: ins.bg }]}>
                    <Ionicons name={ins.iconName as any} size={18} color={ins.color} />
                  </View>
                  <Text style={styles.insightText}>{ins.text}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── DESKTOP: Seller Table ── */}
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
                <Text style={styles.totalBadgeText}>Total {filteredSellers.length}</Text>
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

            <Text style={styles.showingText}>
              {filteredSellers.length === 0
                ? "No results found"
                : `Showing ${(safePage-1)*perPage+1}–${Math.min(safePage*perPage, filteredSellers.length)} of ${filteredSellers.length} entries`}
            </Text>

            {/* Table */}
            <View style={styles.tableContainer}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 0.5 }]}>ID</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.6 }]}>Seller</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Business</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.9 }]}>Onboard</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.7 }]}>Status</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.7 }]}>Profile</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.65 }]}>KYC</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.9 }]}>Shiprocket</Text>
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
                  <DesktopTableRow key={s.id} item={s} idx={idx} onView={() => setSelectedSeller(s)} />
                ))
              )}
            </View>

            {/* Pagination */}
            {filteredSellers.length > 0 && (
              <View style={styles.paginationRow}>
                <Text style={styles.pageText}>Page {safePage} of {totalPages}</Text>
                <View style={{ flexDirection: "row", gap: 4 }}>
                  <PagBtn iconName="play-skip-back"   onPress={() => setPage(1)}                              disabled={safePage === 1} />
                  <PagBtn iconName="chevron-back"     onPress={() => setPage(p => Math.max(1, p - 1))}       disabled={safePage === 1} />
                  {pageNums.map((p, i) =>
                    p === "..." ? (
                      <View key={"e"+i} style={styles.pagBtn}>
                        <Text style={{ color: "#94A3B8", fontSize: 12 }}>…</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        key={`n${p}`}
                        onPress={() => setPage(p as number)}
                        style={[styles.pagBtn, safePage === p && { backgroundColor: ORANGE, borderColor: ORANGE }]}
                      >
                        <Text style={{ fontSize: 12, fontWeight: "700", color: safePage === p ? "#fff" : "#374151" }}>{p}</Text>
                      </TouchableOpacity>
                    )
                  )}
                  <PagBtn iconName="chevron-forward"  onPress={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} />
                  <PagBtn iconName="play-skip-forward" onPress={() => setPage(totalPages)}                      disabled={safePage === totalPages} />
                </View>
              </View>
            )}
          </View>

          {/* ── Footer ── */}
          <Text style={styles.footer}>
            2026 © Flintnthread India Pvt. Ltd.{"\n"}
            Crafted by <Text style={{ color: "#16A34A", fontWeight: "700" }}>Flinththread India Pvt. Ltd.</Text>
          </Text>
        </ScrollView>

        <SellerModal seller={selectedSeller} onClose={() => setSelectedSeller(null)} />
      </View>
    );
  }

  /* ────────────────────────────────────────────────────────────────────
     MOBILE / TABLET LAYOUT  (unchanged)
  ──────────────────────────────────────────────────────────────────── */
  return (
    <View style={styles.root}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: isTablet ? 24 : 14, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header Container (Dark Blue) ── */}
        <View style={styles.headerContainer}>
          <View style={styles.pageHeader}>
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
                <Ionicons name="home" size={12} color={ORANGE} />
                <Text style={styles.breadcrumb}>Dashboard</Text>
                <Ionicons name="chevron-forward" size={10} color="#94A3B8" />
                <Text style={styles.breadcrumb}>Sellers</Text>
                <Ionicons name="chevron-forward" size={10} color="#94A3B8" />
                <Text style={{ fontSize: 12, color: "#94A3B8" }}>Sellers Graph</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="bar-chart" size={20} color={ORANGE} />
                <Text style={styles.pageTitle}>Sellers Graph / Analysis</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={13} color="#475569" />
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Filters Card ── */}
        <View style={styles.card}>
          <View style={styles.filterLabel}>
            <Ionicons name="person-outline" size={13} color="#64748B" />
            <Text style={styles.filterLabelText}>Seller</Text>
          </View>
          <Dropdown value={sellerFilter} onChange={v => { setSellerFilter(v); setPage(1); }}
            options={SELLER_OPTIONS} style={{ marginBottom: 12 }} />

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
              <Dropdown value={filterYear} onChange={setFilterYear} options={YEAR_OPTIONS} />
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

          <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
            <Ionicons name="funnel" size={14} color="#fff" />
            <Text style={styles.applyBtnText}>Apply Filters</Text>
          </TouchableOpacity>

          <Text style={styles.filterCaption}>
            Showing analytics for {filterType} · {sellerFilter} · {filterYear}
            {fromDate && ` · From: ${fromDate}`}
            {toDate && ` · To: ${toDate}`}
          </Text>
        </View>

        {/* ── Stat Cards (mobile: 2-col grid) ── */}
        <View style={[styles.statGrid, { marginBottom: 14 }]}>
          {STAT_CARDS.map(c => (
            <View key={c.label} style={[styles.statCard]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.statLabel}>{c.label.toUpperCase()}</Text>
                <Text style={styles.statValue}>{c.value}</Text>
                {c.sub && <Text style={styles.statSub}>{c.sub}</Text>}
              </View>
              <View style={[styles.statIconBox, { backgroundColor: c.iconBg }]}>
                <Ionicons name={c.iconName as any} size={22} color={c.iconColor} />
              </View>
            </View>
          ))}
        </View>

        {/* ── Chart Card ── */}
        <View style={[styles.card, { marginBottom: 14 }]}>
          <View style={styles.chartHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.chartTitle}>Yearly Overview</Text>
              <Text style={styles.chartSubtitle}>Performance overview of all sellers for the selected period</Text>
            </View>
            <Dropdown value={activeSeries} onChange={setActiveSeries}
              options={METRIC_OPTIONS} style={{ minWidth: 140 }} />
          </View>
          <View onLayout={e => setChartWidth(e.nativeEvent.layout.width)} style={{ width: "100%" }}>
            {chartWidth > 0 && <LineChart width={chartWidth} activeSeries={activeSeries} />}
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
          {INSIGHTS.map((ins, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
              <View style={[styles.insightIcon, { backgroundColor: ins.bg }]}>
                <Ionicons name={ins.iconName as any} size={18} color={ins.color} />
              </View>
              <Text style={styles.insightText}>{ins.text}</Text>
            </View>
          ))}
        </View>

        {/* ── Seller List (mobile cards) ── */}
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
              <Text style={styles.totalBadgeText}>Total {filteredSellers.length}</Text>
            </View>
          </View>

          <View style={{ marginBottom: 12 }}>
            <View style={styles.searchRow}>
              <Ionicons name="search-outline" size={15} color="#94A3B8" />
              <TextInput
                value={search} onChangeText={setSearch} onSubmitEditing={doSearch}
                returnKeyType="search"
                placeholder="Search name / email / mobile / business..."
                placeholderTextColor="#94A3B8" style={styles.searchInput}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => { setSearch(""); setSearchQ(""); setPage(1); }}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={[styles.searchControlsRow]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.filterLabelText}>Per page</Text>
              <Dropdown value={String(perPage)} onChange={v => { setPerPage(Number(v)); setPage(1); }} options={PERPAGE_OPTIONS} />
            </View>
            <TouchableOpacity onPress={doSearch} style={[styles.applyBtn, { flex: 1, marginTop: 18 }]}>
              <Ionicons name="search" size={13} color="#fff" />
              <Text style={styles.applyBtnText}>Search</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={doReset} style={[styles.resetBtn, { flex: 1, marginTop: 18 }]}>
              <Ionicons name="refresh" size={13} color="#475569" />
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.showingText}>
            {filteredSellers.length === 0
              ? "No results found"
              : `Showing ${(safePage-1)*perPage+1}–${Math.min(safePage*perPage, filteredSellers.length)} of ${filteredSellers.length} entries`}
          </Text>

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
                <SellerCard key={s.id} item={s} onView={() => setSelectedSeller(s)} />
              ))}
            </View>
          )}

          {filteredSellers.length > 0 && (
            <View style={styles.paginationRow}>
              <Text style={styles.pageText}>Page {safePage} of {totalPages}</Text>
              <View style={{ flexDirection: "row", gap: 4, flexWrap: "wrap" }}>
                <PagBtn iconName="play-skip-back"   onPress={() => setPage(1)}                              disabled={safePage === 1} />
                <PagBtn iconName="chevron-back"     onPress={() => setPage(p => Math.max(1, p - 1))}       disabled={safePage === 1} />
                {pageNums.map((p, i) =>
                  p === "..." ? (
                    <View key={"e"+i} style={styles.pagBtn}>
                      <Text style={{ color: "#94A3B8", fontSize: 12 }}>…</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      key={`n${p}`}
                      onPress={() => setPage(p as number)}
                      style={[styles.pagBtn, safePage === p && { backgroundColor: ORANGE, borderColor: ORANGE }]}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "700", color: safePage === p ? "#fff" : "#374151" }}>{p}</Text>
                    </TouchableOpacity>
                  )
                )}
                <PagBtn iconName="chevron-forward"  onPress={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} />
                <PagBtn iconName="play-skip-forward" onPress={() => setPage(totalPages)}                      disabled={safePage === totalPages} />
              </View>
            </View>
          )}
        </View>

        {/* ── Footer ── */}
        <Text style={styles.footer}>
          2026 © Flintnthread India Pvt. Ltd.{"\n"}
          Crafted by <Text style={{ color: "#16A34A", fontWeight: "700" }}>Flinththread India Pvt. Ltd.</Text>
        </Text>
      </ScrollView>

      <SellerModal seller={selectedSeller} onClose={() => setSelectedSeller(null)} />
    </View>
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
    backgroundColor: DARK_NAV,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
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
  pageTitle:  { fontSize: 20, fontWeight: "800", color: "#fff" },
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
  filterCaption: { fontSize: 11, color: "#94A3B8", marginTop: 10 },

  /* Stat Cards */
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    width: "47%", flexGrow: 1,
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#F1F5F9",
    borderRadius: 12, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  statLabel:   { fontSize: 10, color: "#94A3B8", fontWeight: "600", letterSpacing: 0.5, marginBottom: 2 },
  statValue:   { fontSize: 22, fontWeight: "800", color: DARK_NAV, lineHeight: 24 },
  statSub:     { fontSize: 10, color: "#94A3B8", marginTop: 2 },
  statIconBox: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },

  /* Chart */
  chartHeader: {
    flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between",
    marginBottom: 16, gap: 10, flexWrap: "wrap",
  },
  chartTitle:    { fontSize: 16, fontWeight: "800", color: DARK_NAV, marginBottom: 2 },
  chartSubtitle: { fontSize: 11, color: "#94A3B8", lineHeight: 16 },
  legendRow: {
    flexDirection: "row", flexWrap: "wrap", gap: 10,
    marginTop: 16, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: "#F1F5F9",
    justifyContent: "center",
  },
  legendItem:  { flexDirection: "row", alignItems: "center", gap: 6 },
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
  searchInput: { flex: 1, fontSize: 13, color: "#374151", paddingVertical: 9 },
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
    backgroundColor: DARK_NAV,
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
  sellerCardName:    { fontWeight: "700", color: DARK_NAV, fontSize: 14 },
  sellerCardSub:     { fontSize: 11, color: "#94A3B8", marginTop: 1 },
  idBadge: { backgroundColor: "#F1F5F9", borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8, flexShrink: 0 },
  idBadgeText: { fontSize: 11, fontWeight: "700", color: "#94A3B8" },
  sellerMetaGrid: {
    flexDirection: "row", backgroundColor: "#F8FAFC",
    borderRadius: 8, padding: 10, marginTop: 10, gap: 4,
  },
  metaLabel: { fontSize: 9, color: "#94A3B8", fontWeight: "700", textTransform: "uppercase", marginBottom: 3 },
  metaVal:   { fontSize: 12, color: "#374151", fontWeight: "600" },
  badgeLabel: { fontSize: 9, color: "#94A3B8", fontWeight: "700", textTransform: "uppercase", marginBottom: 3 },
  shipDateText: { fontSize: 11, color: "#94A3B8", marginTop: 8 },
  viewBtn: {
    backgroundColor: DARK_NAV, borderRadius: 9, paddingVertical: 10,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10,
  },
  viewBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  /* Pagination */
  paginationRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#F1F5F9",
    flexWrap: "wrap", gap: 8,
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

  /* Date Input */
  dateInputContainer: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderColor: BORDER, borderRadius: 8,
    backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 9,
  },
  dateInput: { flex: 1, fontSize: 13, color: "#374151" },

  /* DatePicker Modal */
  datePickerOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center", alignItems: "center",
  },
  datePickerModal: {
    backgroundColor: "#fff", borderRadius: 12, padding: 16,
    width: "90%", maxWidth: 350,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 8,
  },
  datePickerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  datePickerTitle:  { fontSize: 16, fontWeight: "700", color: "#1a2332" },
  datePickerWeekHeader: { flexDirection: "row", marginBottom: 8 },
  datePickerWeekDay: { flex: 1, textAlign: "center", fontSize: 12, fontWeight: "600", color: "#64748B" },
  datePickerDays:    { flexDirection: "row", flexWrap: "wrap", marginBottom: 16 },
  datePickerDay:     { width: "14.28%", aspectRatio: 1, justifyContent: "center", alignItems: "center", borderRadius: 8, marginBottom: 4 },
  datePickerDayEmpty:    { backgroundColor: "transparent" },
  datePickerDaySelected: { backgroundColor: ORANGE },
  datePickerDayText:         { fontSize: 13, color: "#374151" },
  datePickerDayTextEmpty:    { color: "transparent" },
  datePickerDayTextSelected: { color: "#fff", fontWeight: "700" },
  datePickerCloseBtn:     { backgroundColor: ORANGE, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  datePickerCloseBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },

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
  modalBusiness:   { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  sectionLabel: {
    fontSize: 11, fontWeight: "700", color: "#94A3B8",
    textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10,
  },
  contactRow:   { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  contactLabel: { fontSize: 13, fontWeight: "600", color: "#64748B", minWidth: 76 },
  contactVal:   { fontSize: 13, color: "#374151", flex: 1 },
  productsBox: {
    backgroundColor: "#F8FAFC", borderRadius: 10, padding: 16,
    alignItems: "center", borderWidth: 1, borderColor: "#E8EDF5", marginBottom: 12,
  },
  productsCount:  { fontSize: 32, fontWeight: "800", color: DARK_NAV },
  productsLabel:  { fontSize: 12, color: "#94A3B8", marginTop: 4 },
  shiprocketBox:  { backgroundColor: "#ECFDF5", borderRadius: 8, padding: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  shiprocketText: { fontSize: 13, color: "#065F46" },

  footer: { textAlign: "center", paddingVertical: 20, fontSize: 12, color: "#94A3B8", lineHeight: 20 },
});