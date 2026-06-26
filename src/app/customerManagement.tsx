/**
 * CustomerManagement.tsx
 * Single-file customer management screen
 * React Native + Expo + TypeScript
 * Bootstrap SVG icons only — no external icon libraries needed
 */

import AdminLayout from "@/components/admin-layout";
import { getApiErrorMessage } from "@/lib/api/client";
import { mapCustomerRow } from "@/lib/mappers";
import { fetchCustomers, fetchCustomerStats } from "@/services/customerApi";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type Customer = {
  id: number;
  name: string;
  email: string;
  phone: string;
  orders: number;
  totalSpent: number;
  lastOrder: string | null;
  status: "Active" | "Inactive";
};

// ─────────────────────────────────────────────────────────────────────────────
// PALETTE
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg:            "#FFFFFF",
  surface:       "#FFFFFF",
  cardBg:        "#F7F3EE",
  primary:       "#ef7b1a",
  primaryLight:  "#FFF0EA",
  navy:          "#1d324e",
  text:          "#1C2B4A",
  sub:           "#6B7280",
  border:        "#E8E2D9",
  active:        "#10B981",
  activeLight:   "#ECFDF5",
  inactive:      "#EF4444",
  inactiveLight: "#FEF2F2",
  avatarPalette: ["#ef7b1a", "#1C2B4A", "#10B981", "#8B5CF6", "#F59E0B", "#3B82F6"],
};

// ─────────────────────────────────────────────────────────────────────────────
// BREAKPOINTS
// ─────────────────────────────────────────────────────────────────────────────
function useLayout(width: number) {
  return {
    isMobile:  width < 480,
    isTablet:  width >= 480 && width < 1024,
    isDesktop: width >= 1280,
    // ── Grid columns ──────────────────────────────────────────────────────────
    // mobile:480   → 1 col   (full width cards, stacked)
    // tablet:768   → 2 cols
    // tablet:1024  → 3 cols
    // laptop:1024  → 4 cols  (exact ask)
    // laptop:1440  → 4 cols  (exact ask)
    // big screen   → 5 cols
    gridCols:
      width < 480  ? 1 :
      width < 768  ? 2 :
      width < 1024 ? 3 :
      width < 1440 ? 4 : 5,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return C.avatarPalette[Math.abs(h) % C.avatarPalette.length];
}

// Whole-rupee formatting — drops paise so values stay compact in tight spaces.
function rupee(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

// Compact Indian-style formatting for fixed-width spaces like grid cards —
// ₹38.1K, ₹2.4L, ₹1.2Cr — so a large totalSpent never overflows or wraps.
function rupeeCompact(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1e7) return "₹" + (n / 1e7).toFixed(2).replace(/\.00$/, "") + "Cr";
  if (abs >= 1e5) return "₹" + (n / 1e5).toFixed(2).replace(/\.00$/, "") + "L";
  if (abs >= 1e3) return "₹" + (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

// ─────────────────────────────────────────────────────────────────────────────
// BOOTSTRAP SVG ICONS
// ─────────────────────────────────────────────────────────────────────────────
type IP = { size?: number; color?: string };

const SearchIcon   = ({ size = 18, color = C.sub }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16"><Path fill={color} d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/></Svg>
);
const GridIcon     = ({ size = 16, color = C.sub }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16"><Path fill={color} d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5z"/></Svg>
);
const ListIcon     = ({ size = 16, color = C.sub }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16"><Path fill={color} d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5"/></Svg>
);
const EyeIcon      = ({ size = 15, color = "#fff" }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16"><Path fill={color} d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"/><Path fill={color} d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/></Svg>
);
const BanIcon      = ({ size = 15, color = "#fff" }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16"><Path fill={color} d="M15 8a6.97 6.97 0 0 0-1.71-4.584l-9.874 9.875A7 7 0 0 0 15 8M2.71 12.584l9.874-9.875a7 7 0 0 0-9.874 9.875M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0"/></Svg>
);
const EnvelopeIcon = ({ size = 13, color = C.sub }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16"><Path fill={color} d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1zm13 2.383-4.708 2.825L15 11.105zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741M1 11.105l4.708-1.897L1 6.383z"/></Svg>
);
const PhoneIcon    = ({ size = 13, color = C.sub }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16"><Path fill={color} d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.6 17.6 0 0 0 4.168 6.608 17.6 17.6 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.68.68 0 0 0-.58-.122l-2.19.547a1.75 1.75 0 0 1-1.657-.459L5.482 8.062a1.75 1.75 0 0 1-.46-1.657l.548-2.19a.68.68 0 0 0-.122-.58zM1.884.511a1.745 1.745 0 0 1 2.612.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.68.68 0 0 0 .178.643l2.457 2.457a.68.68 0 0 0 .644.178l2.189-.547a1.75 1.75 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.6 18.6 0 0 1-7.01-4.42 18.6 18.6 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877z"/></Svg>
);
const PeopleIcon   = ({ size = 20, color = "#fff" }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16"><Path fill={color} d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1zm-7.978-1L7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002zM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4m3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0M6.936 9.28a6 6 0 0 0-1.23-.247A7 7 0 0 0 5 9c-4 0-5 3-5 4q0 1 1 1h4.216A2.24 2.24 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816M4.92 10A5.5 5.5 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275ZM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0m3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4"/></Svg>
);
const ExportIcon = ({ size = 15, color = "#fff" }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path fill={color} d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/>
    <Path fill={color} d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708z"/>
  </Svg>
);
const CheckCircleIcon = ({ size = 15, color = "#fff" }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path fill={color} d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
  </Svg>
);
const WalletIcon = ({ size = 15, color = "#fff" }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path fill={color} d="M0 3a2 2 0 0 1 2-2h13.5a.5.5 0 0 1 0 1H15v2a1 1 0 0 1 1 1v8.5a1.5 1.5 0 0 1-1.5 1.5h-12A2.5 2.5 0 0 1 0 12.5zm1 1.732V12.5A1.5 1.5 0 0 0 2.5 14h12a.5.5 0 0 0 .5-.5V5H2a2 2 0 0 1-1-.268M1 3a1 1 0 0 0 1 1h12V2H2a1 1 0 0 0-1 1"/>
  </Svg>
);
// ─────────────────────────────────────────────────────────────────────────────
// AVATAR
// ─────────────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 42 }: { name: string; size?: number }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: avatarColor(name) }]}>
      <Text style={[s.avatarTxt, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS PILL
// ─────────────────────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: "Active" | "Inactive" }) {
  const on = status === "Active";
  return (
    <View style={[s.pill, { backgroundColor: on ? C.activeLight : C.inactiveLight }]}>
      <View style={[s.pillDot, { backgroundColor: on ? C.active : C.inactive }]} />
      <Text style={[s.pillTxt, { color: on ? C.active : C.inactive }]}>{status}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAT CHIP  (legacy — no longer rendered, kept in case you want it elsewhere)
// ─────────────────────────────────────────────────────────────────────────────
function StatChip({ label, value, valueColor = C.text }: { label: string; value: string | number; valueColor?: string }) {
  return (
    <View style={s.statChip}>
      <Text style={[s.statChipVal, { color: valueColor }]}>{String(value)}</Text>
      <Text style={s.statChipLbl}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD (overlapping header card — Product Management style)
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({
  icon,
  iconBg,
  value,
  label,
  sub,
  valueColor = C.text,
  compact = false,
}: {
  icon: React.ReactNode;
  iconBg: string;
  value: string | number;
  label: string;
  sub?: string;
  valueColor?: string;
  compact?: boolean;
}) {
  if (compact) {
    // Tiny version — used on mobile so all 4 fit in a single row
    return (
      <View style={s.statCardCompact}>
        <View style={[s.statCardIconBoxCompact, { backgroundColor: iconBg }]}>{icon}</View>
        <Text style={[s.statCardValueCompact, { color: valueColor }]} numberOfLines={1}>
          {value}
        </Text>
        <Text style={s.statCardLabelCompact} numberOfLines={1}>
          {label}
        </Text>
      </View>
    );
  }
  return (
    <View style={s.statCard}>
      <View style={s.statCardTop}>
        <View style={[s.statCardIconBox, { backgroundColor: iconBg }]}>{icon}</View>
        <Text style={[s.statCardValue, { color: valueColor }]}>{value}</Text>
      </View>
      <Text style={s.statCardLabel}>{label}</Text>
      {sub ? <Text style={s.statCardSub}>{sub}</Text> : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GRID CARD  (web / tablet only)
// ─────────────────────────────────────────────────────────────────────────────
function GridCard({ c, onView }: { c: Customer; onView: () => void }) {
  return (
    <View style={s.gCard}>
      <View style={s.gCardTop}>
        <StatusPill status={c.status} />
        <Text style={s.gCardId}>#{c.id}</Text>
      </View>
      <View style={s.gCardCenter}>
        <Avatar name={c.name} size={52} />
        <Text style={s.gCardName} numberOfLines={1}>{c.name}</Text>
      </View>
      <View style={s.infoRowCenter}>
        <EnvelopeIcon />
        <Text style={s.infoTxtCenter} numberOfLines={1}>{c.email}</Text>
      </View>
      <View style={s.infoRowCenter}>
        <PhoneIcon />
        <Text style={s.infoTxtCenter}>{c.phone}</Text>
      </View>
      <View style={s.gStatsRow}>
        <View style={[s.gStatCell, { flex: 0.6 }]}>
          <Text
            style={[s.gStatVal, { color: c.orders > 0 ? C.primary : C.sub }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {c.orders}
          </Text>
          <Text style={s.gStatLbl}>Orders</Text>
        </View>
        <View style={s.gStatDivider} />
        <View style={[s.gStatCell, { flex: 1.1 }]}>
          <Text
            style={s.gStatVal}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {rupeeCompact(c.totalSpent)}
          </Text>
          <Text style={s.gStatLbl}>Spent</Text>
        </View>
        <View style={s.gStatDivider} />
        <View style={[s.gStatCell, { flex: 1.3 }]}>
          <Text style={s.gStatVal} numberOfLines={1}>{c.lastOrder ?? "N/A"}</Text>
          <Text style={s.gStatLbl}>Last Order</Text>
        </View>
      </View>
      <View style={s.gActions}>
        <TouchableOpacity style={s.btnView} onPress={onView} activeOpacity={0.8}>
          <EyeIcon /><Text style={s.btnTxt}>View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WEB LIST ROW + HEADER  (tablet / desktop — unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function ListRow({ c, onView, isDesktop }: { c: Customer; onView: () => void; isDesktop: boolean }) {
  return (
    <View style={s.lRow}>
      <View style={[s.lCol, { flex: isDesktop ? 2.2 : 2 }]}>
        <View style={s.lAvatar}>
          <Avatar name={c.name} size={36} />
          <View style={{ flex: 1, marginLeft: 9 }}>
            <Text style={s.lName} numberOfLines={1}>{c.name}</Text>
            <Text style={s.lId}>#{c.id}</Text>
          </View>
        </View>
      </View>
      <View style={[s.lCol, { flex: isDesktop ? 2.2 : 2 }]}>
        <View style={s.infoRow}><EnvelopeIcon /><Text style={s.infoTxt} numberOfLines={1}>{c.email}</Text></View>
      </View>
      <View style={[s.lCol, { flex: 1.5 }]}>
        <View style={s.infoRow}><PhoneIcon /><Text style={s.infoTxt}>{c.phone}</Text></View>
      </View>
      <View style={[s.lCol, { flex: 0.9, alignItems: "center" }]}>
        <Text style={[s.lOrders, { color: c.orders > 0 ? C.primary : C.sub }]}>{c.orders} {c.orders === 1 ? "order" : "orders"}</Text>
      </View>
      <View style={[s.lCol, { flex: 1, alignItems: "center" }]}>
        <Text style={s.lSpent} numberOfLines={1}>{rupee(c.totalSpent)}</Text>
      </View>
      <View style={[s.lCol, { flex: 1.2, alignItems: "center" }]}>
        <Text style={s.lDate}>{c.lastOrder ?? "N/A"}</Text>
      </View>
      <View style={[s.lCol, { flex: 0.85, alignItems: "center" }]}>
        <StatusPill status={c.status} />
      </View>
      <View style={[s.lCol, { flex: 0.8, flexDirection: "row", gap: 7, justifyContent: "center" }]}>
        <TouchableOpacity style={s.lBtnView} onPress={onView} activeOpacity={0.8}><EyeIcon size={14} /></TouchableOpacity>
      </View>
    </View>
  );
}

function ListHeader({ isDesktop }: { isDesktop: boolean }) {
  const h = (flex: number, label: string, center = false) => (
    <Text style={[s.lHdr, { flex, textAlign: center ? "center" : "left" }]}>{label}</Text>
  );
  return (
    <View style={s.lHdrRow}>
      {h(isDesktop ? 2.2 : 2, "Name")}
      {h(isDesktop ? 2.2 : 2, "Email")}
      {h(1.5, "Phone")}
      {h(0.9, "Orders", true)}
      {h(1,   "Total Spent", true)}
      {h(1.2, "Last Order", true)}
      {h(0.85,"Status", true)}
      {h(0.8, "Action", true)}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE GRID CARD  (used when isMobile + grid view)
// ─────────────────────────────────────────────────────────────────────────────
function MobileListCard({ c, onView }: { c: Customer; onView: () => void }) {
  return (
    <View style={s.mCard}>
      <View style={s.mTop}>
        <View style={s.mLeft}>
          <Avatar name={c.name} size={42} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={s.mName} numberOfLines={1}>{c.name}</Text>
            <Text style={s.mId}>#{c.id}</Text>
          </View>
        </View>
        <StatusPill status={c.status} />
      </View>
      <View style={{ gap: 5, marginBottom: 12 }}>
        <View style={s.infoRow}><EnvelopeIcon /><Text style={s.infoTxt} numberOfLines={1}>{c.email}</Text></View>
        <View style={s.infoRow}><PhoneIcon /><Text style={s.infoTxt}>{c.phone}</Text></View>
      </View>
      <View style={s.mStats}>
        <View style={s.mStatBox}>
          <Text style={[s.mStatVal, { color: c.orders > 0 ? C.primary : C.sub }]}>{c.orders}</Text>
          <Text style={s.mStatLbl}>Orders</Text>
        </View>
        <View style={s.mDivider} />
        <View style={s.mStatBox}>
          <Text
            style={s.mStatVal}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {rupeeCompact(c.totalSpent)}
          </Text>
          <Text style={s.mStatLbl}>Spent</Text>
        </View>
        <View style={s.mDivider} />
        <View style={s.mStatBox}>
          <Text style={s.mStatVal} numberOfLines={1}>{c.lastOrder ?? "N/A"}</Text>
          <Text style={s.mStatLbl}>Last Order</Text>
        </View>
      </View>
      <View style={s.mActions}>
        <TouchableOpacity style={[s.mBtn, { backgroundColor: C.navy }]} onPress={onView} activeOpacity={0.8}>
          <EyeIcon /><Text style={s.btnTxt}>View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE HORIZONTAL-SCROLL TABLE  (list view on mobile only)
// ─────────────────────────────────────────────────────────────────────────────

// Fixed pixel widths for each column — enough space for content + padding
const COL = {
  name:    180,
  email:   200,
  phone:   140,
  orders:  90,
  spent:   100,
  last:    120,
  status:  90,
  action:  90,
};
const TABLE_WIDTH = Object.values(COL).reduce((a, b) => a + b, 0); // 1010px total

function MobileTableHeader() {
  const cols: [string, number, "left" | "center"][] = [
    ["Name",       COL.name,   "left"],
    ["Email",      COL.email,  "left"],
    ["Phone",      COL.phone,  "left"],
    ["Orders",     COL.orders, "center"],
    ["Spent",      COL.spent,  "center"],
    ["Last Order", COL.last,   "center"],
    ["Status",     COL.status, "center"],
    ["Action",     COL.action, "center"],
  ];
  return (
    <View style={[mt.headerRow, { width: TABLE_WIDTH }]}>
      {cols.map(([label, w, align]) => (
        <View key={label} style={[mt.th, { width: w }]}>
          <Text style={[mt.thTxt, { textAlign: align }]}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

function MobileTableRow({ c, onView, isEven }: { c: Customer; onView: () => void; isEven: boolean }) {
  return (
    <View style={[mt.row, { width: TABLE_WIDTH, backgroundColor: isEven ? "#FAFAFA" : C.surface }]}>

      {/* Name */}
      <View style={[mt.td, { width: COL.name }]}>
        <View style={mt.nameCell}>
          <Avatar name={c.name} size={30} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={mt.nameTxt} numberOfLines={1}>{c.name}</Text>
            <Text style={mt.idTxt}>#{c.id}</Text>
          </View>
        </View>
      </View>

      {/* Email */}
      <View style={[mt.td, { width: COL.email }]}>
        <Text style={mt.cellTxt} numberOfLines={1}>{c.email}</Text>
      </View>

      {/* Phone */}
      <View style={[mt.td, { width: COL.phone }]}>
        <Text style={mt.cellTxt}>{c.phone}</Text>
      </View>

      {/* Orders */}
      <View style={[mt.td, { width: COL.orders, alignItems: "center" }]}>
        <Text style={[mt.cellTxt, { color: c.orders > 0 ? C.primary : C.sub, fontWeight: "700" }]}>
          {c.orders}
        </Text>
      </View>

      {/* Spent */}
      <View style={[mt.td, { width: COL.spent, alignItems: "center" }]}>
        <Text
          style={[mt.cellTxt, { fontWeight: "700", color: C.text }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {rupeeCompact(c.totalSpent)}
        </Text>
      </View>

      {/* Last Order */}
      <View style={[mt.td, { width: COL.last, alignItems: "center" }]}>
        <Text style={mt.cellTxt}>{c.lastOrder ?? "N/A"}</Text>
      </View>

      {/* Status */}
      <View style={[mt.td, { width: COL.status, alignItems: "center" }]}>
        <StatusPill status={c.status} />
      </View>

      {/* Action */}
      <View style={[mt.td, { width: COL.action, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" }]}>
        <TouchableOpacity style={mt.iconBtnView} onPress={onView} activeOpacity={0.8}>
          <EyeIcon size={13} />
        </TouchableOpacity>
      </View>

    </View>
  );
}

// Mobile table styles
const mt = StyleSheet.create({
  // Outer container: rounded card with shadow, clips the scroll
  outerCard:  { borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.05, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 3, backgroundColor: C.surface },
  headerRow:  { flexDirection: "row", backgroundColor: C.cardBg, borderBottomWidth: 1.5, borderBottomColor: C.border },
  th:         { paddingVertical: 11, paddingHorizontal: 12, justifyContent: "center" },
  thTxt:      { fontSize: 11, fontWeight: "700", color: C.sub, textTransform: "uppercase", letterSpacing: 0.4 },
  row:        { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.border },
  td:         { paddingVertical: 13, paddingHorizontal: 12, justifyContent: "center" },
  // Name cell
  nameCell:   { flexDirection: "row", alignItems: "center" },
  nameTxt:    { fontSize: 12, fontWeight: "700", color: C.text },
  idTxt:      { fontSize: 10, color: C.sub },
  // Generic cell text
  cellTxt:    { fontSize: 12, color: C.sub },
  // Action icon buttons
  iconBtnView: { width: 30, height: 30, borderRadius: 8, backgroundColor: C.navy,    alignItems: "center", justifyContent: "center" },
  iconBtnBan:  { width: 30, height: 30, borderRadius: 8, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function CustomerManagementScreen() {
  const { width } = useWindowDimensions();
  const { isMobile, isTablet, isDesktop, gridCols } = useLayout(width);
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch]       = useState("");
  const [view, setView]           = useState<"grid" | "list">("grid");
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  // Measured width of the grid container (excludes sidebar + all padding).
  // Initialised to 0; cards render only once a real measurement arrives.
  const [gridContainerWidth, setGridContainerWidth] = useState(0);
  const [customerStats, setCustomerStats] = useState<{ total: number; revenue: number }>({
    total: 0,
    revenue: 0,
  });

  const PAGE_SIZE = 20;

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const safePage = Math.max(1, page);
      const [response, statsRes] = await Promise.all([
        fetchCustomers(search.trim() || undefined, safePage - 1, PAGE_SIZE),
        fetchCustomerStats(),
      ]);
      setCustomers(response.items.map((c) => mapCustomerRow(c) as Customer));
      setTotalPages(Math.max(1, response.totalPages));
      setCustomerStats({
        total: Number(statsRes.total ?? statsRes.totalCustomers ?? 0),
        revenue: Number(statsRes.totalRevenue ?? 0),
      });
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load customers."));
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const safePage = Math.min(page, totalPages);
  const paginated = customers;

  const viewCustomer = (id: number) =>
    router.push({ pathname: "/customerDetails", params: { id: String(id) } });

  const px      = isMobile ? 14 : isTablet ? 20 : 28;
  const total   = customerStats.total;
  const active  = total;
  const inactive = 0;
  const revenue  = customerStats.revenue;

  // Range shown by the "Showing X–Y of Z" label
  const rangeStart = total === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd    = Math.min(safePage * PAGE_SIZE, total);

  // ── Card column width — measured via onLayout, React Native compatible ──────
  // We attach onLayout to the grid wrapper View so React Native tells us its
  // exact rendered width after the sidebar, all padding, and scroll bars are
  // accounted for. cardWidth is then pure arithmetic — no CSS calc() needed.
  //   cardWidth = (measuredWidth - GAP × (cols - 1)) / cols
  const GAP = 14;
  const cardWidth =
    gridContainerWidth > 0
      ? (gridContainerWidth - GAP * (gridCols - 1)) / gridCols
      : 0;

  return (
    <AdminLayout>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ══ HEADER (now scrolls away with content) ═══════════════════════ */}
        <View style={{ paddingHorizontal: 16 }}>
          <View
            style={[
              s.header,
              {
                paddingTop: Platform.OS === "ios" ? 50 : 16,
                marginTop: 12,
              },
            ]}
          >
            <View style={[s.headerInner, { paddingHorizontal: isMobile ? 16 : 22 }]}>
              <View style={s.hLeft}>
                <View style={s.hIcon}><PeopleIcon size={isMobile ? 17 : 21} /></View>
                <View>
                  <Text style={[s.hTitle, { fontSize: isMobile ? 16 : 20 }]}>Customer Management</Text>
                  <Text style={s.hSub}>Manage and track all your customers</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ══ OVERLAPPING STAT CARDS ════════════════════════════════════════ */}
        <View
          style={[
            s.statCardsWrap,
            { paddingHorizontal: px + 10 },
            isMobile && s.statCardsWrapMobile,
          ]}
        >
          <StatCard
            compact={isMobile}
            icon={<PeopleIcon color={C.primary} size={isMobile ? 13 : 16} />}
            iconBg={C.primaryLight}
            value={total}
            label="Total Customers"
            sub="All registered customers"
          />
          <StatCard
            compact={isMobile}
            icon={<CheckCircleIcon color={C.active} size={isMobile ? 13 : 16} />}
            iconBg={C.activeLight}
            value={active}
            label="Active"
            valueColor={C.active}
            sub="Currently active"
          />
          <StatCard
            compact={isMobile}
            icon={<BanIcon color={C.inactive} size={isMobile ? 13 : 16} />}
            iconBg={C.inactiveLight}
            value={inactive}
            label="Inactive"
            valueColor={C.inactive}
            sub="Needs attention"
          />
          <StatCard
            compact={isMobile}
            icon={<WalletIcon color={C.navy} size={isMobile ? 13 : 16} />}
            iconBg="rgba(29,50,78,0.08)"
            value={rupee(revenue)}
            label="Revenue"
            valueColor={C.primary}
            sub="Total lifetime revenue"
          />
        </View>

        <View style={{ alignSelf: "center", width: "100%", maxWidth: 1600, paddingHorizontal: px }}>

          {/* ══ TOOLBAR ═════════════════════════════════════════════════════ */}
          <View style={s.toolbar}>
            {/* Search */}
            <View style={s.searchBox}>
              <SearchIcon />
              <TextInput
                style={[s.searchInput, { fontSize: isMobile ? 12 : 14 }]}
                placeholder={isMobile ? "Search…" : "Search by name, email or phone…"}
                placeholderTextColor={C.sub}
                value={search}
                onChangeText={(text) => {
                  setSearch(text);
                  setPage(1);
                }}
                numberOfLines={1}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")} style={{ padding: 4 }}>
                  <Text style={{ color: C.sub, fontSize: 13 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Grid / List toggle */}
            <View style={s.toggle}>
              {(["grid", "list"] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[s.toggleBtn, view === mode && s.toggleActive]}
                  onPress={() => setView(mode)}
                  activeOpacity={0.8}
                >
                  {mode === "grid"
                    ? <GridIcon color={view === "grid" ? "#fff" : C.sub} size={16} />
                    : <ListIcon color={view === "list" ? "#fff" : C.sub} size={16} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {loading ? (
            <View style={s.stateBox}>
              <ActivityIndicator size="large" color={C.primary} />
              <Text style={s.stateText}>Loading customers…</Text>
            </View>
          ) : error ? (
            <View style={s.stateBox}>
              <Text style={s.errorText}>{error}</Text>
              <TouchableOpacity style={s.retryBtn} onPress={loadCustomers} activeOpacity={0.8}>
                <Text style={s.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* ══ GRID VIEW ═══════════════════════════════════════════════════ */}
          {!loading && !error && view === "grid" && (
            isMobile ? (
              // Mobile grid → stacked cards
              <View>
                {paginated.map((c) => (
                  <MobileListCard key={c.id} c={c} onView={() => viewCustomer(c.id)} />
                ))}
              </View>
            ) : (
              // Tablet / Laptop / Desktop - auto-fit multi-column grid
              <View
                style={[s.gridWrap, { gap: GAP }]}
                onLayout={(e) => setGridContainerWidth(e.nativeEvent.layout.width)}
              >
                {cardWidth > 0 && paginated.map((c) => (
                  <View key={c.id} style={{ width: cardWidth, marginBottom: GAP }}>
                    <GridCard c={c} onView={() => viewCustomer(c.id)} />
                  </View>
                ))}
              </View>
            )
          )}

          {/* ══ LIST VIEW ═══════════════════════════════════════════════════ */}
          {!loading && !error && view === "list" && (
            isMobile ? (
              // ── MOBILE: horizontal-scroll table ───────────────────────────
              <View style={mt.outerCard}>
                <ScrollView horizontal showsHorizontalScrollIndicator={true} bounces={false}>
                  <View>
                    <MobileTableHeader />
                    {paginated.map((c, idx) => (
                      <MobileTableRow
                        key={c.id}
                        c={c}
                        isEven={idx % 2 === 0}
                        onView={() => viewCustomer(c.id)}
                      />
                    ))}
                  </View>
                </ScrollView>
              </View>
            ) : (
              // ── Tablet / Desktop: existing table — unchanged ───────────────
              <View style={s.listWrap}>
                <ListHeader isDesktop={isDesktop} />
                {paginated.map((c) => (
                  <ListRow key={c.id} c={c} onView={() => viewCustomer(c.id)} isDesktop={isDesktop} />
                ))}
              </View>
            )
          )}

          {/* Empty state */}
          {!loading && !error && customers.length === 0 && (
            <View style={s.empty}>
              <Text style={{ fontSize: 38, marginBottom: 10 }}>🔍</Text>
              <Text style={s.emptyTitle}>No customers found</Text>
              <Text style={s.emptySub}>Try adjusting your search term</Text>
            </View>
          )}

          {/* ══ PAGINATION ══════════════════════════════════════════════════ */}
          {!loading && !error && totalPages > 1 && (
            <View style={[s.pgWrap, isMobile && s.pgWrapMobile]}>
              <Text style={s.pgInfo}>
                Showing {rangeStart}–{rangeEnd} of {total} customers
              </Text>

              <View style={s.pgControls}>
                <TouchableOpacity
                  style={[s.pgBtn, safePage === 1 && s.pgBtnDisabled]}
                  onPress={() => safePage > 1 && setPage(safePage - 1)}
                  activeOpacity={0.7}
                  disabled={safePage === 1}
                >
                  <Svg width={13} height={13} viewBox="0 0 16 16">
                    <Path fill={safePage === 1 ? C.border : C.sub} d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0"/>
                  </Svg>
                </TouchableOpacity>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[s.pgBtn, safePage === p && s.pgBtnActive]}
                    onPress={() => setPage(p)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.pgBtnTxt, safePage === p && s.pgBtnTxtActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={[s.pgBtn, safePage === totalPages && s.pgBtnDisabled]}
                  onPress={() => safePage < totalPages && setPage(safePage + 1)}
                  activeOpacity={0.7}
                  disabled={safePage === totalPages}
                >
                  <Svg width={13} height={13} viewBox="0 0 16 16">
                    <Path fill={safePage === totalPages ? C.border : C.sub} d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"/>
                  </Svg>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={{ height: 36 }} />
        </View>
      </ScrollView>
    </AdminLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  scroll:        { flex: 1 },
  scrollContent: { paddingTop: 10, paddingBottom: 40 },

  // Header — rounded on all four corners, top and bottom
  header: { marginHorizontal: 2, marginTop: 12, backgroundColor: C.navy, paddingBottom: 44, borderRadius: 24 },
  headerInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  hLeft:       { flexDirection: "row", alignItems: "center", gap: 11 },
  hIcon:       { width: 40, height: 40, borderRadius: 11, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
  hTitle:      { color: "#fff", fontWeight: "700", letterSpacing: -0.3 },
  hSub:        { color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 1 },

  // Overlapping stat cards — desktop / tablet
  statCardsWrap:   { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: -32, marginBottom: 14 },
  statCard:        { flex: 1, minWidth: 130, maxWidth: 240, backgroundColor: C.surface, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.border, shadowColor: "#000", shadowOpacity: 0.06, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 4 },
  statCardTop:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  statCardIconBox: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  statCardValue:   { fontSize: 17, fontWeight: "800" },
  statCardLabel:   { fontSize: 12, fontWeight: "700", color: C.text },
  statCardSub:     { fontSize: 10, color: C.sub, marginTop: 1 },

  // Overlapping stat cards — mobile (compact, single row of 4)
  statCardsWrapMobile:    { flexWrap: "nowrap", gap: 6, marginTop: -26 },
  statCardCompact:        { flex: 1, alignItems: "center", backgroundColor: C.surface, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 2, borderWidth: 1, borderColor: C.border, shadowColor: "#000", shadowOpacity: 0.06, shadowOffset: { width: 0, height: 3 }, shadowRadius: 6, elevation: 3, gap: 4 },
  statCardIconBoxCompact: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  statCardValueCompact:   { fontSize: 14, fontWeight: "800" },
  statCardLabelCompact:   { fontSize: 9, fontWeight: "600", color: C.sub, textAlign: "center" },

  // Toolbar
  toolbar:  { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  searchBox:{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.surface, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 12, height: 42, shadowColor: "#000", shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2 },
  searchInput: { flex: 1, color: C.text, height: "100%", paddingVertical: 0 },

  statChipsRow: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 12, height: 42, gap: 10, shadowColor: "#000", shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2 },
  statChip:    { alignItems: "center", paddingHorizontal: 2 },
  statChipVal: { fontSize: 14, fontWeight: "700" },
  statChipLbl: { fontSize: 10, color: C.sub, marginTop: 1 },
  statDivider: { width: 1, height: 22, backgroundColor: C.border },

  toggle:       { flexDirection: "row", backgroundColor: C.surface, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, overflow: "hidden", height: 42 },
  toggleBtn:    { width: 38, alignItems: "center", justifyContent: "center" },
  toggleActive: { backgroundColor: C.navy },

  // Mobile stat chips (legacy — no longer rendered)
  mobileStatRow:  { flexDirection: "row", gap: 8, marginBottom: 14 },
  mobileStatChip: { flex: 1, backgroundColor: C.surface, borderRadius: 10, padding: 10, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 2 },
  mobileStatVal:  { fontSize: 17, fontWeight: "700" },
  mobileStatLbl:  { fontSize: 11, color: C.sub, marginTop: 1 },

  // Shared info rows
  infoRow:       { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 5 },
  infoTxt:       { fontSize: 12, color: C.sub, flex: 1 },
  infoRowCenter: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 5 },
  infoTxtCenter: { fontSize: 12, color: C.sub, textAlign: "center" },

  exportBtn: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  exportTxt: { color: "#fff", fontSize: 13, fontWeight: "700" },

  // Avatar
  avatar:    { alignItems: "center", justifyContent: "center" },
  avatarTxt: { color: "#fff", fontWeight: "700" },

  // Status pill
  pill:    { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillTxt: { fontSize: 11, fontWeight: "700" },

  // Grid
  gridWrap:     { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-start" },
  gCard:        { backgroundColor: C.surface, borderRadius: 15, padding: 15, borderWidth: 1, borderColor: C.border, shadowColor: "#000", shadowOpacity: 0.05, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 3 },
  gCardTop:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 13 },
  gCardId:      { fontSize: 12, color: C.sub, fontWeight: "600" },
  gCardCenter:  { alignItems: "center", marginBottom: 11 },
  gCardName:    { marginTop: 8, fontSize: 14, fontWeight: "700", color: C.text, textAlign: "center" },
  gStatsRow:    { flexDirection: "row", backgroundColor: C.cardBg, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 4, marginVertical: 8, alignItems: "center" },
  gStatCell:    { flex: 1, alignItems: "center", paddingHorizontal: 2 },
  gStatVal:     { fontSize: 12, fontWeight: "700", color: C.text },
  gStatLbl:     { fontSize: 10, color: C.sub, marginTop: 2 },
  gStatDivider: { width: 1, height: 24, backgroundColor: C.border },
  gActions:     { flexDirection: "row", gap: 8, marginTop: 4 },
  btnView:      { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.navy,    borderRadius: 9, paddingVertical: 9 },
  btnBan:       { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.primary, borderRadius: 9, paddingVertical: 9 },
  btnTxt:       { color: "#fff", fontSize: 13, fontWeight: "600" },

  // Web list table
  listWrap: { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.05, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 3 },
  lHdrRow:  { flexDirection: "row", alignItems: "center", backgroundColor: C.cardBg, paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border },
  lHdr:     { fontSize: 11, fontWeight: "700", color: C.sub, textTransform: "uppercase", letterSpacing: 0.4, paddingRight: 6 },
  lRow:     { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  lCol:     { justifyContent: "center", paddingRight: 6 },
  lAvatar:  { flexDirection: "row", alignItems: "center" },
  lName:    { fontSize: 13, fontWeight: "700", color: C.text },
  lId:      { fontSize: 11, color: C.sub },
  lOrders:  { fontSize: 13, fontWeight: "600" },
  lSpent:   { fontSize: 13, fontWeight: "700", color: C.text },
  lDate:    { fontSize: 12, color: C.sub },
  lBtnView: { width: 32, height: 32, borderRadius: 8, backgroundColor: C.navy,    alignItems: "center", justifyContent: "center" },
  lBtnBan:  { width: 32, height: 32, borderRadius: 8, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },

  // Mobile grid cards
  mCard:    { backgroundColor: C.surface, borderRadius: 14, padding: 14, marginBottom: 11, borderWidth: 1, borderColor: C.border, shadowColor: "#000", shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2 },
  mTop:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  mLeft:    { flexDirection: "row", alignItems: "center", flex: 1 },
  mName:    { fontSize: 14, fontWeight: "700", color: C.text },
  mId:      { fontSize: 11, color: C.sub },
  mStats:   { flexDirection: "row", backgroundColor: C.cardBg, borderRadius: 10, padding: 10, marginBottom: 11, alignItems: "center" },
  mStatBox: { flex: 1, alignItems: "center" },
  mStatVal: { fontSize: 13, fontWeight: "700", color: C.text },
  mStatLbl: { fontSize: 11, color: C.sub, marginTop: 2 },
  mDivider: { width: 1, height: 26, backgroundColor: C.border },
  mActions: { flexDirection: "row", gap: 8 },
  mBtn:     { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 9, paddingVertical: 10 },

  // Pagination
  pgWrap:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 18, flexWrap: "wrap", gap: 12, marginTop: 16, backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, shadowColor: "#000", shadowOpacity: 0.05, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 3 },
  pgWrapMobile:  { flexDirection: "column", alignItems: "flex-start", gap: 14 },
  pgInfo:        { fontSize: 13, color: C.sub },
  pgControls:    { flexDirection: "row", alignItems: "center", gap: 8 },
  pgBtn:         { minWidth: 36, height: 36, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  pgBtnActive:   { backgroundColor: C.navy, borderColor: C.navy },
  pgBtnDisabled: { opacity: 0.35 },
  pgBtnTxt:      { fontSize: 13, fontWeight: "600", color: C.sub },
  pgBtnTxtActive:{ color: "#fff" },

  // Empty state
  empty:      { alignItems: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: C.text },
  emptySub:   { fontSize: 13, color: C.sub, marginTop: 4 },

  stateBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 14,
  },
  stateText: {
    fontSize: 14,
    color: C.sub,
  },
  errorText: {
    fontSize: 14,
    color: C.inactive,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: C.navy,
  },
  retryBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
});