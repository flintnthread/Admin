/**
 * CustomerManagement.tsx
 * Single-file customer management screen
 * React Native + Expo + TypeScript
 * Bootstrap SVG icons only — no external icon libraries needed
 *
 * Usage: drop this file into your project and import/render <CustomerManagementScreen />
 * Requires: react-native-svg  →  npx expo install react-native-svg
 */

import React, { useMemo, useState } from "react";
import {
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
import AdminLayout from "../components/admin-layout";

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
// SAMPLE DATA  (replace with your API / state)
// ─────────────────────────────────────────────────────────────────────────────
const SAMPLE_CUSTOMERS: Customer[] = [
  {
    id: 255,
    name: "Sai Kiran",
    email: "saikiran95730@gmail.com",
    phone: "6304797436",
    orders: 0,
    totalSpent: 0,
    lastOrder: null,
    status: "Active",
  },
  {
    id: 254,
    name: "Ajay Singani",
    email: "ajaysingani56@gmail.com",
    phone: "9912137150",
    orders: 0,
    totalSpent: 0,
    lastOrder: null,
    status: "Active",
  },
  {
    id: 253,
    name: "Aruna bharati kumari",
    email: "akhilabobby204@gmail.com",
    phone: "8897941659",
    orders: 1,
    totalSpent: 364,
    lastOrder: "26 May 2026",
    status: "Active",
  },
  {
    id: 251,
    name: "Sana shaikh",
    email: "attusanshaikh@gmail.com",
    phone: "8197481081",
    orders: 1,
    totalSpent: 2318,
    lastOrder: "13 May 2026",
    status: "Active",
  },
  {
    id: 250,
    name: "Prateek Awasthi",
    email: "techgeek1809@gmail.com",
    phone: "9532369294",
    orders: 0,
    totalSpent: 0,
    lastOrder: null,
    status: "Active",
  },
  {
    id: 249,
    name: "Dodda Akhila",
    email: "dodda.akhi@gmail.com",
    phone: "9959353663",
    orders: 1,
    totalSpent: 296,
    lastOrder: "04 May 2026",
    status: "Active",
  },
  {
    id: 248,
    name: "Ravi Teja",
    email: "raviteja.k@gmail.com",
    phone: "9876543210",
    orders: 3,
    totalSpent: 5840,
    lastOrder: "01 Jun 2026",
    status: "Active",
  },
  {
    id: 247,
    name: "Meena Reddy",
    email: "meena.reddy@gmail.com",
    phone: "9988776655",
    orders: 2,
    totalSpent: 1200,
    lastOrder: "28 May 2026",
    status: "Inactive",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PALETTE
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg: "#F7F3EE",
  surface: "#FFFFFF",
  primary: "#E8571A",
  primaryLight: "#FFF0EA",
  navy: "#1C2B4A",
  text: "#1C2B4A",
  sub: "#6B7280",
  border: "#E8E2D9",
  active: "#10B981",
  activeLight: "#ECFDF5",
  inactive: "#EF4444",
  inactiveLight: "#FEF2F2",
  avatarPalette: [
    "#E8571A",
    "#1C2B4A",
    "#10B981",
    "#8B5CF6",
    "#F59E0B",
    "#3B82F6",
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// BREAKPOINTS
// ─────────────────────────────────────────────────────────────────────────────
function useLayout(width: number) {
  return {
    isMobile: width < 480,
    isTablet: width >= 480 && width < 1024,
    isDesktop: width >= 1280,
    gridCols:
      width < 480
        ? 1
        : width < 768
          ? 2
          : width < 1024
            ? 2
            : width < 1280
              ? 3
              : width < 1440
                ? 4
                : 5,
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

function rupee(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

// ─────────────────────────────────────────────────────────────────────────────
// BOOTSTRAP SVG ICONS
// ─────────────────────────────────────────────────────────────────────────────
type IP = { size?: number; color?: string };

const SearchIcon = ({ size = 18, color = C.sub }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"
    />
  </Svg>
);
const GridIcon = ({ size = 18, color = C.sub }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5z"
    />
  </Svg>
);
const ListIcon = ({ size = 18, color = C.sub }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5"
    />
  </Svg>
);
const EyeIcon = ({ size = 15, color = "#fff" }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"
    />
    <Path
      fill={color}
      d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"
    />
  </Svg>
);
const BanIcon = ({ size = 15, color = "#fff" }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M15 8a6.97 6.97 0 0 0-1.71-4.584l-9.874 9.875A7 7 0 0 0 15 8M2.71 12.584l9.874-9.875a7 7 0 0 0-9.874 9.875M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0"
    />
  </Svg>
);
const EnvelopeIcon = ({ size = 13, color = C.sub }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1zm13 2.383-4.708 2.825L15 11.105zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741M1 11.105l4.708-1.897L1 6.383z"
    />
  </Svg>
);
const PhoneIcon = ({ size = 13, color = C.sub }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.6 17.6 0 0 0 4.168 6.608 17.6 17.6 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.68.68 0 0 0-.58-.122l-2.19.547a1.75 1.75 0 0 1-1.657-.459L5.482 8.062a1.75 1.75 0 0 1-.46-1.657l.548-2.19a.68.68 0 0 0-.122-.58zM1.884.511a1.745 1.745 0 0 1 2.612.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.68.68 0 0 0 .178.643l2.457 2.457a.68.68 0 0 0 .644.178l2.189-.547a1.75 1.75 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.6 18.6 0 0 1-7.01-4.42 18.6 18.6 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877z"
    />
  </Svg>
);
const CartIcon = ({ size = 13, color = C.sub }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5M3.102 4l1.313 7h8.17l1.313-7zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4m7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4m-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2m7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2"
    />
  </Svg>
);
const CalendarIcon = ({ size = 13, color = C.sub }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z"
    />
  </Svg>
);
const PeopleIcon = ({ size = 20, color = "#fff" }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1zm-7.978-1L7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002zM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4m3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0M6.936 9.28a6 6 0 0 0-1.23-.247A7 7 0 0 0 5 9c-4 0-5 3-5 4q0 1 1 1h4.216A2.24 2.24 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816M4.92 10A5.5 5.5 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275ZM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0m3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4"
    />
  </Svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

/** Circular avatar with initials */
function Avatar({ name, size = 42 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <View
      style={[
        s.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: avatarColor(name),
        },
      ]}
    >
      <Text style={[s.avatarTxt, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

/** Active / Inactive pill badge */
function StatusPill({ status }: { status: "Active" | "Inactive" }) {
  const on = status === "Active";
  return (
    <View
      style={[
        s.pill,
        { backgroundColor: on ? C.activeLight : C.inactiveLight },
      ]}
    >
      <View
        style={[s.pillDot, { backgroundColor: on ? C.active : C.inactive }]}
      />
      <Text style={[s.pillTxt, { color: on ? C.active : C.inactive }]}>
        {status}
      </Text>
    </View>
  );
}

// ─── GRID CARD ────────────────────────────────────────────────────────────────
function GridCard({ c, onToggle }: { c: Customer; onToggle: () => void }) {
  return (
    <View style={s.gCard}>
      <View style={s.gCardTop}>
        <StatusPill status={c.status} />
        <Text style={s.gCardId}>#{c.id}</Text>
      </View>

      <View style={s.gCardCenter}>
        <Avatar name={c.name} size={52} />
        <Text style={s.gCardName} numberOfLines={1}>
          {c.name}
        </Text>
      </View>

      <View style={s.infoRow}>
        <EnvelopeIcon />
        <Text style={s.infoTxt} numberOfLines={1}>
          {c.email}
        </Text>
      </View>
      <View style={s.infoRow}>
        <PhoneIcon />
        <Text style={s.infoTxt}>{c.phone}</Text>
      </View>

      <View style={s.gStats}>
        <View style={s.gStatItem}>
          <View style={s.infoRow}>
            <CartIcon size={13} color={C.primary} />
            <Text style={[s.gStatVal, { color: C.primary }]}>
              {c.orders} {c.orders === 1 ? "order" : "orders"}
            </Text>
          </View>
        </View>
        <View style={s.gStatItem}>
          <Text style={s.gStatVal}>{rupee(c.totalSpent)}</Text>
          <Text style={s.gStatLbl}>Spent</Text>
        </View>
      </View>

      <View style={s.infoRow}>
        <CalendarIcon />
        <Text style={s.infoTxt}>{c.lastOrder ?? "N/A"}</Text>
      </View>

      <View style={s.gActions}>
        <TouchableOpacity style={s.btnView} activeOpacity={0.8}>
          <EyeIcon />
          <Text style={s.btnTxt}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.btnBan}
          onPress={onToggle}
          activeOpacity={0.8}
        >
          <BanIcon />
          <Text style={s.btnTxt}>
            {c.status === "Active" ? "Deactivate" : "Activate"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── LIST ROW (tablet / laptop / desktop) ────────────────────────────────────
function ListRow({
  c,
  onToggle,
  isDesktop,
}: {
  c: Customer;
  onToggle: () => void;
  isDesktop: boolean;
}) {
  return (
    <View style={s.lRow}>
      {/* Name */}
      <View style={[s.lCol, { flex: isDesktop ? 2.2 : 2 }]}>
        <View style={s.lAvatar}>
          <Avatar name={c.name} size={36} />
          <View style={{ flex: 1, marginLeft: 9 }}>
            <Text style={s.lName} numberOfLines={1}>
              {c.name}
            </Text>
            <Text style={s.lId}>#{c.id}</Text>
          </View>
        </View>
      </View>
      {/* Email */}
      <View style={[s.lCol, { flex: isDesktop ? 2.2 : 2 }]}>
        <View style={s.infoRow}>
          <EnvelopeIcon />
          <Text style={s.infoTxt} numberOfLines={1}>
            {c.email}
          </Text>
        </View>
      </View>
      {/* Phone */}
      <View style={[s.lCol, { flex: 1.5 }]}>
        <View style={s.infoRow}>
          <PhoneIcon />
          <Text style={s.infoTxt}>{c.phone}</Text>
        </View>
      </View>
      {/* Orders */}
      <View style={[s.lCol, { flex: 0.9, alignItems: "center" }]}>
        <Text style={[s.lOrders, { color: c.orders > 0 ? C.primary : C.sub }]}>
          {c.orders} {c.orders === 1 ? "order" : "orders"}
        </Text>
      </View>
      {/* Spent */}
      <View style={[s.lCol, { flex: 1, alignItems: "center" }]}>
        <Text style={s.lSpent}>{rupee(c.totalSpent)}</Text>
      </View>
      {/* Last Order */}
      <View style={[s.lCol, { flex: 1.2, alignItems: "center" }]}>
        <Text style={s.lDate}>{c.lastOrder ?? "N/A"}</Text>
      </View>
      {/* Status */}
      <View style={[s.lCol, { flex: 0.85, alignItems: "center" }]}>
        <StatusPill status={c.status} />
      </View>
      {/* Actions */}
      <View
        style={[
          s.lCol,
          { flex: 0.8, flexDirection: "row", gap: 7, justifyContent: "center" },
        ]}
      >
        <TouchableOpacity style={s.lBtnView} activeOpacity={0.8}>
          <EyeIcon size={14} />
        </TouchableOpacity>
        <TouchableOpacity
          style={s.lBtnBan}
          onPress={onToggle}
          activeOpacity={0.8}
        >
          <BanIcon size={14} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ListHeader({ isDesktop }: { isDesktop: boolean }) {
  const h = (flex: number, label: string, center = false) => (
    <Text style={[s.lHdr, { flex, textAlign: center ? "center" : "left" }]}>
      {label}
    </Text>
  );
  return (
    <View style={s.lHdrRow}>
      {h(isDesktop ? 2.2 : 2, "Name")}
      {h(isDesktop ? 2.2 : 2, "Email")}
      {h(1.5, "Phone")}
      {h(0.9, "Orders", true)}
      {h(1, "Total Spent", true)}
      {h(1.2, "Last Order", true)}
      {h(0.85, "Status", true)}
      {h(0.8, "Action", true)}
    </View>
  );
}

// ─── MOBILE LIST CARD ─────────────────────────────────────────────────────────
function MobileListCard({
  c,
  onToggle,
}: {
  c: Customer;
  onToggle: () => void;
}) {
  return (
    <View style={s.mCard}>
      <View style={s.mTop}>
        <View style={s.mLeft}>
          <Avatar name={c.name} size={42} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={s.mName} numberOfLines={1}>
              {c.name}
            </Text>
            <Text style={s.mId}>#{c.id}</Text>
          </View>
        </View>
        <StatusPill status={c.status} />
      </View>

      <View style={{ gap: 5, marginBottom: 12 }}>
        <View style={s.infoRow}>
          <EnvelopeIcon />
          <Text style={s.infoTxt} numberOfLines={1}>
            {c.email}
          </Text>
        </View>
        <View style={s.infoRow}>
          <PhoneIcon />
          <Text style={s.infoTxt}>{c.phone}</Text>
        </View>
      </View>

      <View style={s.mStats}>
        <View style={s.mStatBox}>
          <Text
            style={[s.mStatVal, { color: c.orders > 0 ? C.primary : C.sub }]}
          >
            {c.orders} {c.orders === 1 ? "order" : "orders"}
          </Text>
          <Text style={s.mStatLbl}>Orders</Text>
        </View>
        <View style={s.mDivider} />
        <View style={s.mStatBox}>
          <Text style={s.mStatVal}>{rupee(c.totalSpent)}</Text>
          <Text style={s.mStatLbl}>Spent</Text>
        </View>
        <View style={s.mDivider} />
        <View style={s.mStatBox}>
          <Text style={s.mStatVal}>{c.lastOrder ?? "N/A"}</Text>
          <Text style={s.mStatLbl}>Last Order</Text>
        </View>
      </View>

      <View style={s.mActions}>
        <TouchableOpacity
          style={[s.mBtn, { backgroundColor: C.navy }]}
          activeOpacity={0.8}
        >
          <EyeIcon />
          <Text style={s.btnTxt}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.mBtn, { backgroundColor: C.primary }]}
          onPress={onToggle}
          activeOpacity={0.8}
        >
          <BanIcon />
          <Text style={s.btnTxt}>
            {c.status === "Active" ? "Deactivate" : "Activate"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function CustomerManagementScreen() {
  const { width } = useWindowDimensions();
  const { isMobile, isTablet, isDesktop, gridCols } = useLayout(width);

  const [customers, setCustomers] = useState<Customer[]>(SAMPLE_CUSTOMERS);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  const filtered = useMemo(
    () =>
      customers.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.email.toLowerCase().includes(search.toLowerCase()) ||
          c.phone.includes(search),
      ),
    [customers, search],
  );

  const toggle = (id: number) =>
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status: c.status === "Active" ? "Inactive" : "Active" }
          : c,
      ),
    );

  const px = isMobile ? 14 : isTablet ? 20 : 28;
  const total = customers.length;
  const active = customers.filter((c) => c.status === "Active").length;
  const inactive = total - active;
  const revenue = customers.reduce((n, c) => n + c.totalSpent, 0);

  // grid column widths as %
  const colPct =
    gridCols === 1
      ? "100%"
      : gridCols === 2
        ? "49%"
        : gridCols === 3
          ? "32.5%"
          : gridCols === 4
            ? "24%"
            : "19.5%";

  return (
    <AdminLayout>
      <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <View style={[s.header, { paddingTop: Platform.OS === "ios" ? 50 : 16 }]}>
        <View style={[s.headerInner, { paddingHorizontal: px }]}>
          {/* Left: icon + title */}
          <View style={s.hLeft}>
            <View style={s.hIcon}>
              <PeopleIcon size={isMobile ? 17 : 21} />
            </View>
            <View>
              <Text style={[s.hTitle, { fontSize: isMobile ? 16 : 20 }]}>
                Customer Management
              </Text>
              <Text style={s.hSub}>Manage and track all your customers</Text>
            </View>
          </View>
          {/* Right: stat chips (hidden on mobile) */}
          {!isMobile && (
            <View style={s.hStats}>
              {[
                ["Total", total, "#fff"],
                ["Active", active, "#6EE7B7"],
                ["Inactive", inactive, "#FCA5A5"],
                ["Revenue", rupee(revenue), "#fff"],
              ].map(([lbl, val, clr]) => (
                <React.Fragment key={String(lbl)}>
                  <View style={s.hStatItem}>
                    <Text style={[s.hStatVal, { color: String(clr) }]}>
                      {String(val)}
                    </Text>
                    <Text style={s.hStatLbl}>{String(lbl)}</Text>
                  </View>
                  {lbl !== "Revenue" && <View style={s.hStatDiv} />}
                </React.Fragment>
              ))}
            </View>
          )}
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingHorizontal: px }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignSelf: "center", width: "100%", maxWidth: 1600 }}>
          {/* Mobile stat row */}
          {isMobile && (
            <View style={s.mobileStatRow}>
              {[
                ["Total", total, C.text],
                ["Active", active, C.active],
                ["Inactive", inactive, C.inactive],
              ].map(([lbl, val, clr]) => (
                <View key={String(lbl)} style={s.mobileStatChip}>
                  <Text style={[s.mobileStatVal, { color: String(clr) }]}>
                    {String(val)}
                  </Text>
                  <Text style={s.mobileStatLbl}>{String(lbl)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ══ TOOLBAR ═════════════════════════════════════════════════════ */}
          <View style={s.toolbar}>
            {/* Search */}
            <View style={s.searchBox}>
              <SearchIcon />
              <TextInput
                style={s.searchInput}
                placeholder="Search by name, email or phone…"
                placeholderTextColor={C.sub}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearch("")}
                  style={{ padding: 4 }}
                >
                  <Text style={{ color: C.sub, fontSize: 13 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            {/* View toggle */}
            <View style={s.toggle}>
              {(["grid", "list"] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[s.toggleBtn, view === mode && s.toggleActive]}
                  onPress={() => setView(mode)}
                  activeOpacity={0.8}
                >
                  {mode === "grid" ? (
                    <GridIcon color={view === "grid" ? "#fff" : C.sub} />
                  ) : (
                    <ListIcon color={view === "list" ? "#fff" : C.sub} />
                  )}
                  {!isMobile && (
                    <Text
                      style={[s.toggleLbl, view === mode && { color: "#fff" }]}
                    >
                      {mode === "grid" ? "Grid" : "List"}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text style={s.resultInfo}>
            Showing {filtered.length} of {total} customers
            {search ? ` for "${search}"` : ""}
          </Text>

          {/* ══ GRID VIEW ═══════════════════════════════════════════════════ */}
          {view === "grid" && (
            <View style={[s.gridWrap, { gap: isMobile ? 12 : 14 }]}>
              {filtered.map((c) => (
                <View key={c.id} style={{ width: colPct }}>
                  <GridCard c={c} onToggle={() => toggle(c.id)} />
                </View>
              ))}
            </View>
          )}

          {/* ══ LIST VIEW ═══════════════════════════════════════════════════ */}
          {view === "list" && (
            <>
              {isMobile ? (
                filtered.map((c) => (
                  <MobileListCard
                    key={c.id}
                    c={c}
                    onToggle={() => toggle(c.id)}
                  />
                ))
              ) : (
                <View style={s.listWrap}>
                  <ListHeader isDesktop={isDesktop} />
                  {filtered.map((c) => (
                    <ListRow
                      key={c.id}
                      c={c}
                      onToggle={() => toggle(c.id)}
                      isDesktop={isDesktop}
                    />
                  ))}
                </View>
              )}
            </>
          )}

          {/* Empty state */}
          {filtered.length === 0 && (
            <View style={s.empty}>
              <Text style={{ fontSize: 38, marginBottom: 10 }}>🔍</Text>
              <Text style={s.emptyTitle}>No customers found</Text>
              <Text style={s.emptySub}>Try adjusting your search term</Text>
            </View>
          )}

          <View style={{ height: 36 }} />
        </View>
      </ScrollView>
    </View>
    </AdminLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 18 },

  // Header
  header: { backgroundColor: C.navy, paddingBottom: 14 },
  headerInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
  },
  hLeft: { flexDirection: "row", alignItems: "center", gap: 11 },
  hIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  hTitle: { color: "#fff", fontWeight: "700", letterSpacing: -0.3 },
  hSub: { color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 1 },
  hStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 14,
  },
  hStatItem: { alignItems: "center" },
  hStatVal: { color: "#fff", fontWeight: "700", fontSize: 15 },
  hStatLbl: { color: "rgba(255,255,255,0.45)", fontSize: 10, marginTop: 1 },
  hStatDiv: { width: 1, height: 26, backgroundColor: "rgba(255,255,255,0.12)" },

  // Mobile stats
  mobileStatRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  mobileStatChip: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  mobileStatVal: { fontSize: 17, fontWeight: "700" },
  mobileStatLbl: { fontSize: 11, color: C.sub, marginTop: 1 },

  // Toolbar
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 12,
    height: 46,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.text, height: "100%" },
  toggle: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    overflow: "hidden",
    height: 46,
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 6,
  },
  toggleActive: { backgroundColor: C.navy },
  toggleLbl: { fontSize: 13, fontWeight: "600", color: C.sub },
  resultInfo: { fontSize: 12, color: C.sub, marginBottom: 12 },

  // Shared infoRow
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 5,
  },
  infoTxt: { fontSize: 12, color: C.sub, flex: 1 },

  // Avatar
  avatar: { alignItems: "center", justifyContent: "center" },
  avatarTxt: { color: "#fff", fontWeight: "700" },

  // Status pill
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillTxt: { fontSize: 11, fontWeight: "700" },

  // Grid
  gridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  gCard: {
    backgroundColor: C.surface,
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 3,
  },
  gCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 13,
  },
  gCardId: { fontSize: 12, color: C.sub, fontWeight: "600" },
  gCardCenter: { alignItems: "center", marginBottom: 11 },
  gCardName: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "700",
    color: C.text,
    textAlign: "center",
  },
  gStats: {
    flexDirection: "row",
    backgroundColor: C.bg,
    borderRadius: 10,
    padding: 9,
    marginVertical: 7,
    justifyContent: "space-around",
  },
  gStatItem: { alignItems: "center", gap: 2 },
  gStatVal: { fontSize: 13, fontWeight: "700", color: C.text },
  gStatLbl: { fontSize: 11, color: C.sub },
  gActions: { flexDirection: "row", gap: 8, marginTop: 11 },
  btnView: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: C.navy,
    borderRadius: 9,
    paddingVertical: 9,
  },
  btnBan: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: C.primary,
    borderRadius: 9,
    paddingVertical: 9,
  },
  btnTxt: { color: "#fff", fontSize: 13, fontWeight: "600" },

  // List (wide)
  listWrap: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 3,
  },
  lHdrRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  lHdr: {
    fontSize: 11,
    fontWeight: "700",
    color: C.sub,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    paddingRight: 6,
  },
  lRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  lCol: { justifyContent: "center", paddingRight: 6 },
  lAvatar: { flexDirection: "row", alignItems: "center" },
  lName: { fontSize: 13, fontWeight: "700", color: C.text },
  lId: { fontSize: 11, color: C.sub },
  lOrders: { fontSize: 13, fontWeight: "600" },
  lSpent: { fontSize: 13, fontWeight: "700", color: C.text },
  lDate: { fontSize: 12, color: C.sub },
  lBtnView: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: C.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  lBtnBan: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  // Mobile list cards
  mCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  mTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  mLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  mName: { fontSize: 14, fontWeight: "700", color: C.text },
  mId: { fontSize: 11, color: C.sub },
  mStats: {
    flexDirection: "row",
    backgroundColor: C.bg,
    borderRadius: 10,
    padding: 10,
    marginBottom: 11,
    alignItems: "center",
  },
  mStatBox: { flex: 1, alignItems: "center" },
  mStatVal: { fontSize: 13, fontWeight: "700", color: C.text },
  mStatLbl: { fontSize: 11, color: C.sub, marginTop: 2 },
  mDivider: { width: 1, height: 26, backgroundColor: C.border },
  mActions: { flexDirection: "row", gap: 8 },
  mBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 9,
    paddingVertical: 10,
  },

  // Empty
  empty: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: C.text },
  emptySub: { fontSize: 13, color: C.sub, marginTop: 4 },
});
