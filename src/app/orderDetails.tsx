/**
 * orderDetails.tsx
 * Full order detail screen — mobile / tablet / 1024 / 1440 / desktop
 * React Native + Expo + TypeScript
 * Bootstrap SVG icons only — no external icon libraries
 */

import AdminLayout from "@/components/admin-layout";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useRef } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from "react-native"; 
import Svg, { Circle, Path } from "react-native-svg";

// ─────────────────────────────────────────────────────────────────────────────
// PALETTE  (matches CustomerManagement / CustomerDetails)
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  cardBg: "#FFF8F4",
  primary: "#F97316",
  primaryLight: "#FFF0EA",
  navy: "#1C2B4A",
  text: "#1C2B4A",
  sub: "#6B7280",
  border: "#E8E2D9",
  active: "#10B981",
  activeLight: "#ECFDF5",
  inactive: "#EF4444",
  inactiveLight: "#FEF2F2",
  warning: "#F59E0B",
  warningLight: "#FFFBEB",
  blue: "#3B82F6",
  blueLight: "#EFF6FF",
  purple: "#8B5CF6",
  purpleLight: "#F5F3FF",
};

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT HOOK
// ─────────────────────────────────────────────────────────────────────────────
function useLayout(w: number) {
  return {
    isMobile: w < 480,
    isTablet: w >= 480 && w < 1024,
    isDesktop: w >= 1024,
    isWide: w >= 768,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type OrderStatus =
  | "Pending"
  | "Sent to Seller"
  | "Processing"
  | "Completed"
  | "Returned"
  | "Replacement"
  | "Cancelled";

type TrackingEvent = {
  date: string;
  time: string;
  location: string;
  description: string;
};

type OrderItem = {
  id: number;
  product: string;
  sku: string;
  seller: string;
  variant: string;
  qty: number;
  price: number;
  slug: string;
};

type StatusHistory = {
  status: OrderStatus;
  date: string;
  by: string;
  comment: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// SAMPLE DATA
// ─────────────────────────────────────────────────────────────────────────────
const ORDER = {
  id: "FNT202605137181",
  date: "13 May 2026, 11:46 AM",
  status: "Processing" as OrderStatus,
  paymentMethod: "Cash on Delivery",
  paymentStatus: "Pending",
  customer: {
    id: 251,
    name: "Sana shaikh",
    email: "attusanshaikh@gmail.com",
    phone: "8197481081",
    notes: "Please call before delivery.",
  },
  billing: {
    line1: "Plot 12, Banjara Hills",
    line2: "Road No. 2",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500034",
    country: "India",
  },
  shipping: {
    line1: "Plot 12, Banjara Hills",
    line2: "Road No. 2",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500034",
    country: "India",
  },
  shiprocket: {
    awb: "157489263041",
    courier: "Delhivery",
    status: "In Transit",
    synced: "09 Jun, 11:53 AM",
  },
  tracking: [
    {
      date: "09 Jun 2026",
      time: "11:53 AM",
      location: "Hyderabad_Kukatpally_C (Telangana)",
      description: "Shipment out for delivery",
    },
    {
      date: "08 Jun 2026",
      time: "09:10 AM",
      location: "Hyderabad_Hub (Telangana)",
      description: "Shipment arrived at hub",
    },
    {
      date: "06 Jun 2026",
      time: "06:45 PM",
      location: "Mumbai_Gateway (Maharashtra)",
      description: "Shipment in transit",
    },
    {
      date: "04 Jun 2026",
      time: "02:00 PM",
      location: "Mumbai_Pickup (Maharashtra)",
      description: "Shipment picked up",
    },
    {
      date: "30 May 2026",
      time: "08:34 PM",
      location: "Hyderabad_Kukatpally_C (Telangana)",
      description: "Order dispatched from warehouse",
    },
  ] as TrackingEvent[],
  items: [
    {
      id: 1,
      product: " Premium Cotton Shirt",
      sku: "FNT-SHT-001",
      seller: "Flint & Thread",
      variant: "Blue / XL",
      qty: 1,
      price: 1499,
      slug: "premium-cotton-shirt",
    },
    {
      id: 2,
      product: "Slim Fit Chinos",
      sku: "FNT-CHN-002",
      seller: "Flint & Thread",
      variant: "Beige / 32",
      qty: 1,
      price: 819,
      slug: "slim-fit-chinos",
    },
  ] as OrderItem[],
  subtotal: 2318,
  shippingCost: 0,
  tax: 0,
  total: 2318,
  history: [
    {
      status: "Processing" as OrderStatus,
      date: "09 Jun 2026, 11:46 AM",
      by: "System",
      comment: "No comment provided",
    },
    {
      status: "Processing" as OrderStatus,
      date: "27 May 2026, 11:45 PM",
      by: "System",
      comment: "No comment provided",
    },
    {
      status: "Pending" as OrderStatus,
      date: "26 May 2026, 12:52 PM",
      by: "System",
      comment: "Order placed with Cash on Delivery",
    },
  ] as StatusHistory[],
};

// ─────────────────────────────────────────────────────────────────────────────
// STATUS CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<
  OrderStatus,
  { bg: string; color: string; dot: string }
> = {
  Pending: { bg: C.warningLight, color: C.warning, dot: C.warning },
  "Sent to Seller": { bg: C.blueLight, color: C.blue, dot: C.blue },
  Processing: { bg: C.blueLight, color: C.blue, dot: C.blue },
  Completed: { bg: C.activeLight, color: C.active, dot: C.active },
  Returned: { bg: "#FEF3C7", color: "#D97706", dot: "#D97706" },
  Replacement: { bg: C.purpleLight, color: C.purple, dot: C.purple },
  Cancelled: { bg: C.inactiveLight, color: C.inactive, dot: C.inactive },
};

// Dropdown options matching the uploaded screenshot
const STATUS_OPTIONS: {
  label: string;
  value: OrderStatus;
  icon: React.ReactNode;
}[] = [
  { value: "Pending", label: "Mark as Pending", icon: <PendingIcon /> },
  {
    value: "Processing",
    label: "Mark as Processing",
    icon: <ProcessingIcon />,
  },
  { value: "Completed", label: "Mark as Completed", icon: <CompletedIcon /> },
  { value: "Returned", label: "Mark as Returned", icon: <ReturnedIcon /> },
  {
    value: "Replacement",
    label: "Mark as Replacement",
    icon: <ReplacementIcon />,
  },
  { value: "Cancelled", label: "Mark as Cancelled", icon: <CancelledIcon /> },
];

// Extra non-status option
const EXTRA_OPTIONS = [{ label: "Sent to Seller", icon: <SentToSellerIcon /> }];

// ─────────────────────────────────────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────────────────────────────────────
type IP = { size?: number; color?: string };

// Dropdown status icons (matching screenshot)
function PendingIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 16 16">
      <Circle
        cx="8"
        cy="8"
        r="7"
        stroke={C.warning}
        strokeWidth="1.5"
        fill="none"
      />
      <Path
        fill={C.warning}
        d="M8 4.5a.5.5 0 0 1 .5.5v3.793l1.854 1.853a.5.5 0 0 1-.708.708l-2-2A.5.5 0 0 1 7.5 9V5a.5.5 0 0 1 .5-.5z"
      />
    </Svg>
  );
}
function SentToSellerIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 16 16">
      <Path
        fill={C.blue}
        d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11z"
      />
    </Svg>
  );
}
function ProcessingIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 16 16">
      <Path
        fill={C.blue}
        d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"
      />
      <Path
        fill={C.blue}
        d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"
      />
    </Svg>
  );
}
function CompletedIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 16 16">
      <Path
        fill={C.active}
        d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"
      />
    </Svg>
  );
}
function ReturnedIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 16 16">
      <Path
        fill="#D97706"
        d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 0-1H2.964A6.5 6.5 0 1 1 2.5 8a.5.5 0 0 0-1 0 7.5 7.5 0 1 0 .5-2.772V1.5a.5.5 0 0 0-.5-.5z"
      />
    </Svg>
  );
}
function ReplacementIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 16 16">
      <Path
        fill={C.purple}
        d="M1 11.5a.5.5 0 0 0 .5.5h11.793l-3.147 3.146a.5.5 0 0 0 .708.708l4-4a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 11H1.5a.5.5 0 0 0-.5.5zm14-7a.5.5 0 0 1-.5.5H2.707l3.147 3.146a.5.5 0 1 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 4H14.5a.5.5 0 0 1 .5.5z"
      />
    </Svg>
  );
}
function CancelledIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 16 16">
      <Path
        fill={C.inactive}
        d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293z"
      />
    </Svg>
  );
}

const BackIcon = ({ size = 18, color = "#fff" }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"
    />
  </Svg>
);
const InvoiceIcon = ({ size = 14, color = "#fff" }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z"
    />
    <Path
      fill={color}
      d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0z"
    />
    <Path
      fill={color}
      d="M4.5 8a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1zm0 2.5a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1zm0-5a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1z"
    />
  </Svg>
);
const ShiprocketIcon = ({ size = 14, color = "#fff" }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M0 2.5A.5.5 0 0 1 .5 2H2a.5.5 0 0 1 .485.379L2.89 4H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 13H4a.5.5 0 0 1-.491-.408L2.01 4.607 1.61 3H.5a.5.5 0 0 1-.5-.5M3.102 5l1.313 7h8.17l1.313-7zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4m7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4m-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2m7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2"
    />
  </Svg>
);
const ChevronIcon = ({ size = 14, color = C.sub }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"
    />
  </Svg>
);
const PersonIcon = ({ size = 13, color = C.primary }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.029 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z"
    />
  </Svg>
);
const LinkIcon = ({ size = 13, color = C.primary }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1 1 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4 4 0 0 1-.128-1.287z"
    />
    <Path
      fill={color}
      d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243z"
    />
  </Svg>
);
const MapPinIcon = ({ size = 13, color = C.primary }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6"
    />
  </Svg>
);
const SyncIcon = ({ size = 14, color = "#fff" }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41m-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9"
    />
    <Path
      fill={color}
      d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3M3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9z"
    />
  </Svg>
);
const TrackIcon = ({ size = 14, color = "#fff" }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M0 3.5A1.5 1.5 0 0 1 1.5 2h9A1.5 1.5 0 0 1 12 3.5V5h1.02a1.5 1.5 0 0 1 1.17.563l1.481 1.85a1.5 1.5 0 0 1 .329.938V10.5a1.5 1.5 0 0 1-1.5 1.5H14a2 2 0 1 1-4 0H5a2 2 0 1 1-3.998-.085A1.5 1.5 0 0 1 0 10.5zm1.294 7.456A2 2 0 0 1 4.732 11h5.536a2 2 0 0 1 .732-.732V3.5a.5.5 0 0 0-.5-.5h-9a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .294.456M12 10a2 2 0 0 1 1.732 1h.768a.5.5 0 0 0 .5-.5V8.35a.5.5 0 0 0-.11-.312l-1.48-1.85A.5.5 0 0 0 13.02 6H12zm-9 1a1 1 0 1 0 0 2 1 1 0 0 0 0-2m9 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2"
    />
  </Svg>
);
const AddIcon = ({ size = 14, color = "#fff" }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2"
    />
  </Svg>
);
const OrderIcon = ({ size = 20, color = "#fff" }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"
    />
    <Path
      fill={color}
      d="M4.5 8a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1zm0-2.5a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1zm0 5a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1z"
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
const PhoneIcon2 = ({ size = 13, color = C.sub }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.6 17.6 0 0 0 4.168 6.608 17.6 17.6 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.68.68 0 0 0-.58-.122l-2.19.547a1.75 1.75 0 0 1-1.657-.459L5.482 8.062a1.75 1.75 0 0 1-.46-1.657l.548-2.19a.68.68 0 0 0-.122-.58z"
    />
  </Svg>
);
const NoteIcon = ({ size = 13, color = C.sub }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1zm2-1v3h4V.5a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5"
    />
  </Svg>
);
const WalletIcon = ({ size = 15, color = C.primary }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M0 3a2 2 0 0 1 2-2h13.5a.5.5 0 0 1 0 1H15v2a1 1 0 0 1 1 1v8.5a1.5 1.5 0 0 1-1.5 1.5h-12A2.5 2.5 0 0 1 0 12.5zm1 1.732V12.5A1.5 1.5 0 0 0 2.5 14h12a.5.5 0 0 0 .5-.5V5H2a2 2 0 0 1-1-.268M1 3a1 1 0 0 0 1 1h12V2H2a1 1 0 0 0-1 1"
    />
  </Svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// SHARED CARD WRAPPER
// ─────────────────────────────────────────────────────────────────────────────
function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return <View style={[s.card, style]}>{children}</View>;
}
function CardHeader({
  icon,
  title,
  right,
}: {
  icon: React.ReactNode;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={s.cardHeader}>
      <View style={s.cardHeaderLeft}>
        <View style={s.cardIconBox}>{icon}</View>
        <Text style={s.cardTitle}>{title}</Text>
      </View>
      {right && <View>{right}</View>}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS PILL
// ─────────────────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <View style={[s.badge, { backgroundColor: cfg.bg }]}>
      <View style={[s.badgeDot, { backgroundColor: cfg.dot }]} />
      <Text style={[s.badgeTxt, { color: cfg.color }]}>{status}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS DROPDOWN (matching the uploaded screenshot)
// ─────────────────────────────────────────────────────────────────────────────
function StatusDropdown({
  current,
  onSelect,
}: {
  current: OrderStatus;
  onSelect: (v: OrderStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 210 });
  const btnRef = useRef<View>(null);

  const openMenu = () => {
    btnRef.current?.measureInWindow((x, y, width, height) => {
      setMenuPos({ top: y + height + 6, left: x + width - 210, width: 210 });
      setOpen(true);
    });
  };

  return (
    <View ref={btnRef} collapsable={false}>
      <TouchableOpacity
        style={[s.dropBtn, { borderColor: C.navy }]}
        onPress={openMenu}
        activeOpacity={0.8}
      >
        <Text style={[s.dropBtnTxt, { color: C.navy }]}>{current}</Text>
        <ChevronIcon color={C.navy} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={{ flex: 1 }}>
            <View
              style={[
                s.dropMenu,
                {
                  position: "absolute",
                  top: menuPos.top,
                  left: menuPos.left,
                  width: menuPos.width,
                },
              ]}
            >
              {[
                { value: "Pending" as OrderStatus, label: "Mark as Pending", icon: <PendingIcon /> },
                { value: "Sent to Seller" as OrderStatus, label: "Sent to Seller", icon: <SentToSellerIcon /> },
                { value: "Processing" as OrderStatus, label: "Mark as Processing", icon: <ProcessingIcon /> },
                { value: "Completed" as OrderStatus, label: "Mark as Completed", icon: <CompletedIcon /> },
                { value: "Returned" as OrderStatus, label: "Mark as Returned", icon: <ReturnedIcon /> },
                { value: "Replacement" as OrderStatus, label: "Mark as Replacement", icon: <ReplacementIcon /> },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[s.dropItem, current === opt.value && s.dropItemActive]}
                  onPress={() => {
                    onSelect(opt.value);
                    setOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={s.dropItemIcon}>{opt.icon}</View>
                  <Text
                    style={[
                      s.dropItemTxt,
                      current === opt.value && { fontWeight: "700", color: C.navy },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADDRESS BLOCK
// ─────────────────────────────────────────────────────────────────────────────
function AddressBlock({
  title,
  addr,
}: {
  title: string;
  addr: typeof ORDER.billing;
}) {
  return (
    <View style={s.addrBlock}>
      <Text style={s.addrTitle}>{title}</Text>
      <View style={s.addrBody}>
        <View
          style={{ flexDirection: "row", alignItems: "flex-start", gap: 7 }}
        >
          <MapPinIcon />
          <View style={{ flex: 1 }}>
            <Text style={s.addrLine}>{addr.line1}</Text>
            {addr.line2 ? <Text style={s.addrLine}>{addr.line2}</Text> : null}
            <Text style={s.addrLine}>
              {addr.city}, {addr.state} — {addr.pincode}
            </Text>
            <Text style={s.addrLine}>{addr.country}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INFO ROW
// ─────────────────────────────────────────────────────────────────────────────
function InfoRow({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: React.ReactNode;
  valueStyle?: object;
}) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      {typeof value === "string" ? (
        <Text style={[s.infoValue, valueStyle]}>{value}</Text>
      ) : (
        value
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RUPEE HELPER
// ─────────────────────────────────────────────────────────────────────────────
function rupee(n: number) {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function OrderDetailScreen() {
  const { width } = useWindowDimensions();
  const { isMobile, isTablet, isDesktop, isWide } = useLayout(width);
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const displayOrderId = orderId ?? ORDER.id;

  const [status, setStatus] = useState<OrderStatus>(ORDER.status);
  const px = isMobile ? 14 : isTablet ? 20 : 28;

  return (
    <AdminLayout>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <View style={[s.header, { paddingTop: Platform.OS === "ios" ? 50 : 16 }]}>
        <View style={[s.headerInner, { paddingHorizontal: px }]}>
          <View style={s.headerLeft}>
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <BackIcon size={18} />
            </TouchableOpacity>
            <View style={s.headerIconBox}>
              <OrderIcon size={isMobile ? 17 : 20} />
            </View>
            <View>
              <Text style={[s.hTitle, { fontSize: isMobile ? 15 : 19 }]}>
                Order Details
              </Text>
              <Text style={s.hSub}>#{ORDER.id}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ══ BODY ════════════════════════════════════════════════════════════ */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingHorizontal: px }]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            s.body,
            { maxWidth: 1600, alignSelf: "center", width: "100%" },
          ]}
        >
          {/* ── CARD 1: Actions ─────────────────────────────────────────── */}
          <Card>
            <View
              style={[
                s.actionBar,
                isMobile && {
                  flexDirection: "column",
                  alignItems: "flex-start",
                },
              ]}
            >
              {/* Order ID */}
              <View style={s.actionOrderId}>
                <Text style={s.actionOrderLbl}>Order</Text>
                <Text style={s.actionOrderNum}>#{displayOrderId}</Text>
              </View>

              {/* Buttons */}
              <View style={[s.actionBtns, isMobile && { flexWrap: "wrap" }]}>
                {/* Invoice */}
                <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: C.navy }]}
                  activeOpacity={0.8}
                >
                  <InvoiceIcon />
                  <Text style={s.actionBtnTxt}>Invoice</Text>
                </TouchableOpacity>
                {/* Force Push */}
                <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: C.primary }]}
                  activeOpacity={0.8}
                >
                  <ShiprocketIcon />
                  <Text style={s.actionBtnTxt}>Force Push to Shiprocket</Text>
                </TouchableOpacity>
                {/* Update Status dropdown */}
                <StatusDropdown current={status} onSelect={setStatus} />
              </View>
            </View>
          </Card>

          {/* ── ROW 2: Order Info + Customer Info ───────────────────────── */}
          <View style={[s.row, !isWide && s.colStack]}>
            {/* CARD 2 — Order Information */}
            <Card style={{ flex: 1 }}>
              <CardHeader
                icon={<OrderIcon size={16} color={C.primary} />}
                title="Order Information"
              />
              <View style={s.cardBody}>
                <InfoRow
                  label="Order ID"
                  value={`#${displayOrderId}`}
                  valueStyle={{ color: C.primary, fontWeight: "700" }}
                />
                <InfoRow label="Order Date" value={ORDER.date} />
                <InfoRow
                  label="Order Status"
                  value={<StatusBadge status={status} />}
                />
                <InfoRow label="Payment Method" value={ORDER.paymentMethod} />
                <InfoRow
                  label="Payment Status"
                  value={
                    <View
                      style={[
                        s.badge,
                        {
                          backgroundColor:
                            ORDER.paymentStatus === "Paid"
                              ? C.activeLight
                              : C.warningLight,
                        },
                      ]}
                    >
                      <View
                        style={[
                          s.badgeDot,
                          {
                            backgroundColor:
                              ORDER.paymentStatus === "Paid"
                                ? C.active
                                : C.warning,
                          },
                        ]}
                      />
                      <Text
                        style={[
                          s.badgeTxt,
                          {
                            color:
                              ORDER.paymentStatus === "Paid"
                                ? C.active
                                : C.warning,
                          },
                        ]}
                      >
                        {ORDER.paymentStatus}
                      </Text>
                    </View>
                  }
                />
              </View>
            </Card>

            {/* CARD 3 — Customer Information */}
            <Card style={{ flex: 1 }}>
              <CardHeader
                icon={<PersonIcon size={16} color={C.primary} />}
                title="Customer Information"
              />
              <View style={s.cardBody}>
                {/* Name with navigate icon */}
                <InfoRow
                  label="Customer Name"
                  value={
                    <TouchableOpacity
                      style={s.custNameRow}
                      onPress={() =>
                        router.push({
                          pathname: "/customerDetails",
                          params: { id: String(ORDER.customer.id) },
                        })
                      }
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          s.infoValue,
                          { color: C.primary, fontWeight: "700" },
                        ]}
                      >
                        {ORDER.customer.name}
                      </Text>
                      <LinkIcon size={13} color={C.primary} />
                    </TouchableOpacity>
                  }
                />
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Email Address</Text>
                  <View style={s.infoValRow}>
                    <EnvelopeIcon />
                    <Text style={s.infoValue} numberOfLines={1}>
                      {ORDER.customer.email}
                    </Text>
                  </View>
                </View>
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Phone Number</Text>
                  <View style={s.infoValRow}>
                    <PhoneIcon2 />
                    <Text style={s.infoValue}>{ORDER.customer.phone}</Text>
                  </View>
                </View>
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Order Notes</Text>
                  <View style={s.infoValRow}>
                    <NoteIcon />
                    <Text style={[s.infoValue, { fontStyle: "italic" }]}>
                      {ORDER.customer.notes}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          </View>

          {/* ── CARD 4: Addresses ───────────────────────────────────────── */}
          <Card>
            <CardHeader
              icon={<MapPinIcon size={16} color={C.primary} />}
              title="Addresses"
            />
            <View style={[s.cardBody, isWide ? s.addrRow : s.colStack]}>
              <View style={{ flex: 1 }}>
                <AddressBlock title="Billing Address" addr={ORDER.billing} />
              </View>
              {isWide && <View style={s.addrVertDivider} />}
              {!isWide && <View style={s.addrHorizDivider} />}
              <View style={{ flex: 1 }}>
                <AddressBlock title="Shipping Address" addr={ORDER.shipping} />
              </View>
            </View>
          </Card>

          {/* ── ROW 3: ShipRocket + Timeline ────────────────────────────── */}
          <View style={[s.row, !isWide && s.colStack]}>
            {/* CARD 5 — ShipRocket Tracking */}
            <Card style={{ flex: 1 }}>
              <CardHeader
                icon={<ShiprocketIcon size={16} color={C.primary} />}
                title="ShipRocket Tracking"
                right={
                  <TouchableOpacity
                    style={[s.smBtn, { backgroundColor: C.blue }]}
                    activeOpacity={0.8}
                  >
                    <SyncIcon size={13} />
                    <Text style={s.smBtnTxt}>Sync Now</Text>
                  </TouchableOpacity>
                }
              />
              <View style={s.cardBody}>
                <InfoRow
                  label="AWB / Tracking #"
                  value={ORDER.shiprocket.awb}
                />
                <InfoRow
                  label="Courier Partner"
                  value={ORDER.shiprocket.courier}
                />
                <InfoRow
                  label="Shipment Status"
                  value={
                    <View style={[s.badge, { backgroundColor: C.blueLight }]}>
                      <View style={[s.badgeDot, { backgroundColor: C.blue }]} />
                      <Text style={[s.badgeTxt, { color: C.blue }]}>
                        {ORDER.shiprocket.status}
                      </Text>
                    </View>
                  }
                />
                <InfoRow label="Last Synced" value={ORDER.shiprocket.synced} />
                <TouchableOpacity style={[s.trackBtn]} activeOpacity={0.8}>
                  <TrackIcon size={14} />
                  <Text style={s.trackBtnTxt}>Track on ShipRocket</Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* CARD 6 — Tracking Timeline */}
            <Card style={{ flex: 1.2 }}>
              <CardHeader
                icon={<TrackIcon size={16} color={C.primary} />}
                title="Tracking Timeline"
              />
              <View style={s.cardBody}>
                {ORDER.tracking.map((ev, idx) => (
                  <View key={idx} style={s.tlItem}>
                    {/* Line */}
                    <View style={s.tlLeft}>
                      <View style={[s.tlDot, idx === 0 && s.tlDotActive]} />
                      {idx < ORDER.tracking.length - 1 && (
                        <View style={s.tlLine} />
                      )}
                    </View>
                    {/* Content */}
                    <View style={s.tlContent}>
                      <Text style={s.tlDesc}>{ev.description}</Text>
                      <Text style={s.tlLocation}>{ev.location}</Text>
                      <Text style={s.tlDateTime}>
                        {ev.date} · {ev.time}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </Card>
          </View>

          {/* ── CARD 7: Order Items ─────────────────────────────────────── */}
          <Card>
            <CardHeader
              icon={<OrderIcon size={16} color={C.primary} />}
              title="Order Items"
            />
            <View style={{ padding: 0 }}>
              {isDesktop ? (
                // Web: table layout
                <View style={s.tblWrap}>
                  <View style={[s.tblRow, s.tblHead]}>
                    {[
                      "Product",
                      "SKU",
                      "Seller",
                      "Variants",
                      "Qty",
                      "Price",
                      "Total",
                    ].map((h) => (
                      <Text
                        key={h}
                        style={[s.tblHdr, h === "Product" ? { flex: 2.5 } : {}]}
                      >
                        {h}
                      </Text>
                    ))}
                  </View>
                  {ORDER.items.map((item) => (
                    <View key={item.id} style={s.tblRow}>
                      {/* Product with link */}
                      <View
                        style={[
                          s.tblCell,
                          {
                            flex: 2.5,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                          },
                        ]}
                      >
                        <Text style={s.tblCellTxt} numberOfLines={2}>
                          {item.product}
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            /* open flintnthread.in/product/slug */
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={s.viewProductBtn}>
                            <LinkIcon size={11} color={C.primary} />
                            <Text style={s.viewProductTxt}>View</Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                      <View style={s.tblCell}>
                        <Text style={s.tblCellSub}>{item.sku}</Text>
                      </View>
                      <View style={s.tblCell}>
                        <Text style={s.tblCellTxt}>{item.seller}</Text>
                      </View>
                      <View style={s.tblCell}>
                        <Text style={s.tblCellSub}>{item.variant}</Text>
                      </View>
                      <View style={s.tblCell}>
                        <Text style={[s.tblCellTxt, { textAlign: "center" }]}>
                          {item.qty}
                        </Text>
                      </View>
                      <View style={s.tblCell}>
                        <Text style={s.tblCellTxt}>{rupee(item.price)}</Text>
                      </View>
                      <View style={s.tblCell}>
                        <Text
                          style={[
                            s.tblCellTxt,
                            { fontWeight: "700", color: C.text },
                          ]}
                        >
                          {rupee(item.price * item.qty)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                // Mobile / Tablet: card format
                <View style={{ padding: 14, gap: 12 }}>
                  {ORDER.items.map((item) => (
                    <View key={item.id} style={s.itemCard}>
                      <View style={s.itemCardTop}>
                        <Text style={s.itemCardName}>{item.product}</Text>
                        <TouchableOpacity
                          style={s.viewProductBtn}
                          onPress={() => {
                            /* open product page */
                          }}
                          activeOpacity={0.7}
                        >
                          <LinkIcon size={11} color={C.primary} />
                          <Text style={s.viewProductTxt}>View</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={s.itemCardGrid}>
                        {[
                          ["SKU", item.sku],
                          ["Seller", item.seller],
                          ["Variant", item.variant],
                          ["Qty", String(item.qty)],
                          ["Price", rupee(item.price)],
                          ["Total", rupee(item.price * item.qty)],
                        ].map(([lbl, val]) => (
                          <View key={lbl} style={s.itemCardCell}>
                            <Text style={s.itemCardLbl}>{lbl}</Text>
                            <Text
                              style={[
                                s.itemCardVal,
                                lbl === "Total" && {
                                  color: C.primary,
                                  fontWeight: "700",
                                },
                              ]}
                            >
                              {val}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Payment Info + Order Summary */}
            <View style={[s.cardBody, isWide ? s.addrRow : s.colStack]}>
              {/* Payment Information */}
              <View style={[s.summaryBox, { flex: 1 }]}>
                <Text style={s.summaryTitle}>Payment Information</Text>
                <View style={s.summaryRow}>
                  <WalletIcon size={14} color={C.sub} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={s.summaryLbl}>Payment Method</Text>
                    <Text style={s.summaryVal}>{ORDER.paymentMethod}</Text>
                  </View>
                </View>
                <View style={s.summaryRow}>
                  <WalletIcon
                    size={14}
                    color={
                      ORDER.paymentStatus === "Paid" ? C.active : C.warning
                    }
                  />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={s.summaryLbl}>Payment Status</Text>
                    <Text
                      style={[
                        s.summaryVal,
                        {
                          color:
                            ORDER.paymentStatus === "Paid"
                              ? C.active
                              : C.warning,
                        },
                      ]}
                    >
                      {ORDER.paymentStatus}
                    </Text>
                  </View>
                </View>
              </View>

              {isWide && <View style={s.addrVertDivider} />}
              {!isWide && <View style={s.addrHorizDivider} />}

              {/* Order Summary */}
              <View style={[s.summaryBox, { flex: 1 }]}>
                <Text style={s.summaryTitle}>Order Summary</Text>
                {[
                  ["Subtotal", rupee(ORDER.subtotal), false],
                  [
                    "Shipping",
                    ORDER.shippingCost === 0
                      ? "Free"
                      : rupee(ORDER.shippingCost),
                    false,
                  ],
                  ["Tax", ORDER.tax === 0 ? "₹0.00" : rupee(ORDER.tax), false],
                ].map(([lbl, val]) => (
                  <View key={String(lbl)} style={s.summaryLineRow}>
                    <Text style={s.summaryLineLbl}>{String(lbl)}</Text>
                    <Text style={s.summaryLineVal}>{String(val)}</Text>
                  </View>
                ))}
                <View style={s.summaryTotalRow}>
                  <Text style={s.summaryTotalLbl}>Total</Text>
                  <Text style={s.summaryTotalVal}>{rupee(ORDER.total)}</Text>
                </View>
              </View>
            </View>
          </Card>

          {/* ── CARD 8: Order Status History ────────────────────────────── */}
          <Card>
            <CardHeader
              icon={<NoteIcon size={16} color={C.primary} />}
              title="Order Status History"
              right={
                <TouchableOpacity
                  style={[s.smBtn, { backgroundColor: C.navy }]}
                  activeOpacity={0.8}
                >
                  <AddIcon size={13} />
                  <Text style={s.smBtnTxt}>Add Status Update</Text>
                </TouchableOpacity>
              }
            />
            <View style={s.cardBody}>
              {ORDER.history.map((h, idx) => {
                const cfg = STATUS_CFG[h.status];
                return (
                  <View key={idx} style={s.histItem}>
                    {/* Left: colored dot + line */}
                    <View style={s.histLeft}>
                      <View style={[s.histDot, { backgroundColor: cfg.dot }]} />
                      {idx < ORDER.history.length - 1 && (
                        <View style={s.histLine} />
                      )}
                    </View>
                    {/* Content */}
                    <View style={s.histContent}>
                      <View style={s.histTopRow}>
                        <StatusBadge status={h.status} />
                        <Text style={s.histBy}>{h.by}</Text>
                      </View>
                      <Text style={s.histDate}>{h.date}</Text>
                      <Text style={s.histComment}>{h.comment}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </AdminLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingTop: 20 },
  body: { gap: 16 },
  row: { flexDirection: "row", gap: 16 },
  colStack: { flexDirection: "column" },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: { backgroundColor: C.navy, paddingBottom: 14 },
  headerInner: { flexDirection: "row", alignItems: "center" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  hTitle: { color: "#fff", fontWeight: "700", letterSpacing: -0.3 },
  hSub: { color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 1 },

  // ── Card ───────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 3,
    overflow: "visible",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: C.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    flexWrap: "wrap",
    gap: 10,
  },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardIconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: C.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: C.text },
  cardBody: { padding: 18, gap: 12 },

  // ── CARD 1: Action bar ─────────────────────────────────────────────────────
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    gap: 12,
    flexWrap: "wrap",
  },
  actionOrderId: { gap: 2 },
  actionOrderLbl: {
    fontSize: 11,
    color: C.sub,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  actionOrderNum: { fontSize: 16, fontWeight: "800", color: C.text },
  actionBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    justifyContent: "flex-end",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  actionBtnTxt: { color: "#fff", fontSize: 13, fontWeight: "600" },

  // ── Status dropdown ────────────────────────────────────────────────────────
  dropBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: C.surface,
  },
  dropDot: { width: 7, height: 7, borderRadius: 3.5 },
  dropBtnTxt: { fontSize: 13, fontWeight: "700" },
  dropOverlay: {
    position: "absolute",
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    zIndex: 90,
  },
  dropMenu: {
    position: "absolute",
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 12,
    zIndex: 999,
    minWidth: 210,
    paddingVertical: 6,
  },
  dropItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  dropItemActive: { backgroundColor: C.cardBg },
  dropItemIcon: { width: 22, alignItems: "center" },
  dropItemTxt: { fontSize: 13, color: C.text },
  dropDivider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 4,
    marginHorizontal: 14,
  },

  // ── Status badge ───────────────────────────────────────────────────────────
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeTxt: { fontSize: 12, fontWeight: "700" },

  // ── Info row ───────────────────────────────────────────────────────────────
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F0EA",
  },
  infoLabel: { fontSize: 12, color: C.sub, flex: 1 },
  infoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: C.text,
    flex: 1.5,
    textAlign: "right",
  },
  infoValRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1.5,
    justifyContent: "flex-end",
  },
  custNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1.5,
    justifyContent: "flex-end",
  },

  // ── Address ────────────────────────────────────────────────────────────────
  addrRow: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
  addrBlock: { flex: 1, gap: 8 },
  addrTitle: { fontSize: 13, fontWeight: "700", color: C.text },
  addrBody: { backgroundColor: C.cardBg, borderRadius: 10, padding: 12 },
  addrLine: { fontSize: 13, color: C.sub, lineHeight: 20 },
  addrVertDivider: {
    width: 1,
    backgroundColor: C.border,
    alignSelf: "stretch",
  },
  addrHorizDivider: { height: 1, backgroundColor: C.border },

  // ── Small button ───────────────────────────────────────────────────────────
  smBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  smBtnTxt: { color: "#fff", fontSize: 12, fontWeight: "600" },

  // ── Track button ───────────────────────────────────────────────────────────
  trackBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingVertical: 11,
    marginTop: 4,
  },
  trackBtnTxt: { color: "#fff", fontSize: 13, fontWeight: "700" },

  // ── Tracking timeline ──────────────────────────────────────────────────────
  tlItem: { flexDirection: "row", gap: 12, minHeight: 56 },
  tlLeft: { alignItems: "center", width: 16 },
  tlDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.border,
    borderWidth: 2,
    borderColor: C.border,
  },
  tlDotActive: { backgroundColor: C.primary, borderColor: C.primary },
  tlLine: { flex: 1, width: 2, backgroundColor: C.border, marginTop: 3 },
  tlContent: { flex: 1, paddingBottom: 16 },
  tlDesc: { fontSize: 13, fontWeight: "700", color: C.text },
  tlLocation: { fontSize: 12, color: C.sub, marginTop: 2 },
  tlDateTime: { fontSize: 11, color: C.sub, marginTop: 2 },

  // ── Order items table (desktop) ────────────────────────────────────────────
  tblWrap: { borderTopWidth: 1, borderTopColor: C.border },
  tblHead: { backgroundColor: C.cardBg },
  tblRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tblHdr: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    color: C.sub,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  tblCell: { flex: 1, paddingRight: 8 },
  tblCellTxt: { fontSize: 13, color: C.text },
  tblCellSub: { fontSize: 12, color: C.sub },

  // View product link
  viewProductBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: C.primaryLight,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  viewProductTxt: { fontSize: 11, color: C.primary, fontWeight: "600" },

  // ── Order item cards (mobile/tablet) ──────────────────────────────────────
  itemCard: { backgroundColor: C.cardBg, borderRadius: 12, padding: 13 },
  itemCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 8,
  },
  itemCardName: { flex: 1, fontSize: 13, fontWeight: "700", color: C.text },
  itemCardGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  itemCardCell: { width: "48%", gap: 2 },
  itemCardLbl: {
    fontSize: 10,
    color: C.sub,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  itemCardVal: { fontSize: 13, fontWeight: "600", color: C.text },

  // ── Summary boxes ─────────────────────────────────────────────────────────
  summaryBox: { gap: 10 },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: C.text,
    marginBottom: 2,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.cardBg,
    borderRadius: 10,
    padding: 12,
  },
  summaryLbl: { fontSize: 11, color: C.sub },
  summaryVal: { fontSize: 13, fontWeight: "600", color: C.text },
  summaryLineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F0EA",
  },
  summaryLineLbl: { fontSize: 13, color: C.sub },
  summaryLineVal: { fontSize: 13, color: C.text },
  summaryTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
    marginTop: 2,
  },
  summaryTotalLbl: { fontSize: 15, fontWeight: "800", color: C.text },
  summaryTotalVal: { fontSize: 16, fontWeight: "800", color: C.primary },

  // ── Status history ─────────────────────────────────────────────────────────
  histItem: { flexDirection: "row", gap: 12, minHeight: 72 },
  histLeft: { alignItems: "center", width: 16 },
  histDot: { width: 12, height: 12, borderRadius: 6 },
  histLine: { flex: 1, width: 2, backgroundColor: C.border, marginTop: 4 },
  histContent: { flex: 1, paddingBottom: 18 },
  histTopRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  histBy: { fontSize: 11, color: C.sub },
  histDate: { fontSize: 11, color: C.sub, marginTop: 4 },
  histComment: {
    fontSize: 13,
    color: C.text,
    marginTop: 4,
    fontStyle: "italic",
  },
});
