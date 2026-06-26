/**
 * customerAnalytics.tsx
 * 360° single-customer analytics dashboard — data from GET /api/admin/customers/{id}/analytics
 * React Native + Expo + TypeScript
 * Fully interactive hand-rolled SVG charts with hover crosshairs, tooltips, drill-downs,
 * time-filtering (7D, 30D, 90D, 6M, 1Y, All), fullscreen mode, legend toggles,
 * and PDF/CSV export features.
 *
 * Enterprise dashboard layout inspired by Shopify/Stripe/HubSpot.
 */

import AdminLayout from "@/components/admin-layout";
import {
  fetchCustomerAnalytics,
  mapApiAnalyticsToUi,
  type CustomerAnalyticsUi,
} from "@/services/customerApi";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import {
  ActivityIndicator,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  Modal,
  Share,
  Animated,
  Linking,
} from "react-native";
import Svg, {
  Circle,
  Path,
  Rect,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Line,
  G,
  Text as SvgText,
} from "react-native-svg";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { LinearGradient } from "expo-linear-gradient";

// ─────────────────────────────────────────────────────────────────────────────
// PALETTE
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  navy: "#1E2B6B",
  navyDeep: "#151D4F",
  navyMid: "#1A2B5E",
  navyLight: "#2D3E8A",
  green: "#22C55E",
  greenLight: "#86EFAC",
  greenPale: "#F0FDF4",
  red: "#EF4444",
  redLight: "#FCA5A5",
  redPale: "#FEF2F2",
  yellow: "#F59E0B",
  yellowPale: "#FFFBEB",
  blue: "#3B82F6",
  bluePale: "#EFF6FF",
  orange: "#F97316",
  orangePale: "#FFF7ED",
  orangeBorder: "#FED7AA",
  teal: "#14B8A6",
  cyan: "#06B6D4",
  white: "#FFFFFF",
  bg: "#F7F8FC",
  card: "#FFFFFF",
  border: "#E5E7EB",
  textDark: "#111827",
  textMid: "#374151",
  textLight: "#9CA3AF",
};

const primary = C.orange;
const primaryLight = C.orangePale;
const navy = C.navy;
const navyDeep = C.navyDeep;
const text = C.textDark;
const sub = C.textMid;
const border = C.border;
const surface = C.card;
const cardBg = C.bg;
const active = C.green;
const activeLight = C.greenPale;
const inactive = C.red;
const inactiveLight = C.redPale;
const green = C.green;
const red = C.red;
const blue = C.blue;
const blueLight = C.bluePale;
const yellow = C.yellow;
const yellowLight = C.yellowPale;
const purple = "#7C3AED";
const purpleLight = "#F5F3FF";
const pink = "#EC4899";
const pinkLight = "#FCE7F3";
const teal = C.teal;
const tealLight = "#ECFEFF";
const avatarPalette = [C.orange, C.navy, C.green, "#7C3AED", C.yellow, C.blue];
const CHART_COLORS = [primary, blue, green, purple, yellow, pink, teal, red];

const STICKY_NAV_HEIGHT = 52;

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSIVE LAYOUT BREAKPOINTS
// ─────────────────────────────────────────────────────────────────────────────
function useLayout(w: number) {
  return {
    isMobile: w < 540,
    isTablet: w >= 540 && w < 1024,
    isDesktop: w >= 1024,
    isWide: w >= 768,
  };
}

function basisForColumns(cols: number): number {
  switch (cols) {
    case 1:
      return 100;
    case 2:
      return 47; // Leave room for flex gaps on Web and Mobile
    case 3:
      return 31.5; // Leave room for flex gaps on Web
    case 4:
      return 23.5; // Leave room for flex gaps on Web
    default:
      return 23.5;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTERS & PRNG
// ─────────────────────────────────────────────────────────────────────────────
function rupee(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return avatarPalette[Math.abs(h) % avatarPalette.length];
}

function seedFromString(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return h || 1;
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ICONS (Bootstrap SVGs)
// ─────────────────────────────────────────────────────────────────────────────
type IP = { size?: number; color?: string };

const BackIcon = ({ size = 18, color = "#fff" }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"
    />
  </Svg>
);
const EnvelopeIcon = ({ size = 14, color = primary }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1zm13 2.383-4.708 2.825L15 11.105zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741M1 11.105l4.708-1.897L1 6.383z"
    />
  </Svg>
);
const PhoneIcon = ({ size = 14, color = primary }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.6 17.6 0 0 0 4.168 6.608 17.6 17.6 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.68.68 0 0 0-.58-.122l-2.19.547a1.75 1.75 0 0 1-1.657-.459L5.482 8.062a1.75 1.75 0 0 1-.46-1.657l.548-2.19a.68.68 0 0 0-.122-.58z"
    />
  </Svg>
);
const CalendarIcon = ({ size = 14, color = primary }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z"
    />
  </Svg>
);
const ClockIcon = ({ size = 14, color = primary }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71zM8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16zm7-8A7 7 0 1 0 1 8a7 7 0 0 0 14 0z"
    />
  </Svg>
);
const CheckCircleIcon = ({ size = 14, color = green }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"
    />
  </Svg>
);
const BanIcon = ({ size = 14, color = red }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M15 8a6.97 6.97 0 0 0-1.71-4.584l-9.874 9.875A7 7 0 0 0 15 8M2.71 12.584l9.874-9.875a7 7 0 0 0-9.874 9.875M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0"
    />
  </Svg>
);
const SwapIcon = ({ size = 14, color = purple }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M1 11.5a.5.5 0 0 0 .5.5h11.793l-3.147 3.146a.5.5 0 0 0 .708.708l4-4a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 11H1.5a.5.5 0 0 0-.5.5zm14-7a.5.5 0 0 1-.5.5H2.707l3.147 3.146a.5.5 0 1 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 4H14.5a.5.5 0 0 1 .5.5z"
    />
  </Svg>
);
const ReplyIcon = ({ size = 14, color = blue }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M5.921 11.9 1.353 8.62a.719.719 0 0 1 0-1.238L5.921 4.1A.716.716 0 0 1 7 4.719V6c1.5 0 6 0 7 8-2.5-4.5-7-4-7-4v1.281c0 .56-.606.898-1.079.62z"
    />
  </Svg>
);
const CartIcon = ({ size = 14, color = primary }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5M3.102 4l1.313 7h8.17l1.313-7zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4m7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4m-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2m7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2"
    />
  </Svg>
);
const WalletIcon = ({ size = 14, color = primary }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M0 3a2 2 0 0 1 2-2h13.5a.5.5 0 0 1 0 1H15v2a1 1 0 0 1 1 1v8.5a1.5 1.5 0 0 1-1.5 1.5h-12A2.5 2.5 0 0 1 0 12.5zm1 1.732V12.5A1.5 1.5 0 0 0 2.5 14h12a.5.5 0 0 0 .5-.5V5H2a2 2 0 0 1-1-.268M1 3a1 1 0 0 0 1 1h12V2H2a1 1 0 0 0-1 1"
    />
  </Svg>
);
const BagIcon = ({ size = 14, color = primary }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M14 10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h1.5a.5.5 0 0 0 0-1H3a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-1.5a.5.5 0 0 0 0 1H13a1 1 0 0 1 1 1zM8.5 1a.5.5 0 0 0-1 0V4H6a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1H8.5z"
    />
  </Svg>
);
const BarChartFillIcon = ({ size = 14, color = primary }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M4 11H2v3h2zm5-4H7v7h2zm5-5h-2v12h2zm-2-1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM6 7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zm-5 4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1z"
    />
  </Svg>
);
const PieChartIcon = ({ size = 14, color = primary }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M7.5.5a.5.5 0 0 0-1 0v7.5a.5.5 0 0 0 .5.5H15a.5.5 0 0 0 0-1H8V.5z"
    />
    <Path
      fill={color}
      d="M0.5 9.5a7 7 0 0 0 14 0 .5.5 0 0 0-.5-.5H1a.5.5 0 0 0-.5.5"
    />
  </Svg>
);
const GraphUpIcon = ({ size = 14, color = green }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      fillRule="evenodd"
      d="M0 0h1v15h15v1H0zm14.817 3.113a.5.5 0 0 1 .07.704l-4.5 5.5a.5.5 0 0 1-.74.037L7.06 6.767l-3.656 5.027a.5.5 0 0 1-.808-.588l4-5.5a.5.5 0 0 1 .758-.06l2.609 2.61 4.15-5.073a.5.5 0 0 1 .704-.07"
    />
  </Svg>
);
const GraphDownIcon = ({ size = 14, color = red }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      fillRule="evenodd"
      d="M0 0h1v15h15v1H0zm10 11.5a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1 0-1h2.793L5.354 8.061 3.296 9.832a.5.5 0 0 1-.65-.756l2.5-2.182a.5.5 0 0 1 .65 0L8.5 8.853l3.157-3.157H9.5a.5.5 0 0 1 0-1h3a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0V6.207L8.854 9.354a.5.5 0 0 1-.708 0L6 7.207 5.354 7.5z"
    />
  </Svg>
);
const StarFillIcon = ({ size = 14, color = "#F59E0B" }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"
    />
  </Svg>
);
const GiftIcon = ({ size = 14, color = pink }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M3 2.5a2.5 2.5 0 0 1 5 0v.006H8v-.006a2.5 2.5 0 0 1 5 0c0 .59-.187 1.105-.452 1.494H14a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1v4.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.494V7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1h1.452C3.187 3.605 3 3.09 3 2.5M9 8H7v5h2zm0-4.506V6h1.5a1.5 1.5 0 1 0-1.5-2.506M6.5 1.5A1.5 1.5 0 0 0 5 3h1.5z"
    />
  </Svg>
);
const TicketIcon = ({ size = 14, color = blue }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M0 4.5A1.5 1.5 0 0 1 1.5 3h13A1.5 1.5 0 0 1 16 4.5V6a1.5 1.5 0 0 0 0 3v1.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 10.5V9a1.5 1.5 0 0 0 0-3zM1.5 4a.5.5 0 0 0-.5.5v1.05a2.5 2.5 0 0 1 0 4.9v1.05a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-1.05a2.5 2.5 0 0 1 0-4.9V4.5a.5.5 0 0 0-.5-.5z"
    />
  </Svg>
);
const ShieldIcon = ({ size = 14, color = green }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M5.338 1.59a61 61 0 0 0-2.837.856.48.48 0 0 0-.328.39c-.554 4.157.726 7.19 2.371 9.190a11.8 11.8 0 0 0 2.443 2.184c.484.32.668.32.819.49a1.2 1.2 0 0 0 1.07 0c.151-.17.335-.17.819-.49a11.8 11.8 0 0 0 2.443-2.184c1.645-2 2.925-5.033 2.371-9.19a.48.48 0 0 0-.328-.39A61 61 0 0 0 8.94 1.51a.5.5 0 0 0-.358.001A61 61 0 0 0 5.338 1.59"
    />
  </Svg>
);
const TruckIcon = ({ size = 14, color = blue }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M0 3.5A1.5 1.5 0 0 1 1.5 2h9A1.5 1.5 0 0 1 12 3.5V5h1.02a1.5 1.5 0 0 1 1.17.563l1.481 1.85a1.5 1.5 0 0 1 .329.938V10.5a1.5 1.5 0 0 1-1.5 1.5H14a2 2 0 1 1-4 0H5a2 2 0 1 1-3.998-.085A1.5 1.5 0 0 1 0 10.5zm1.294 7.456A2 2 0 0 1 4.732 11h5.536a2 2 0 0 1 .732-.732V3.5a.5.5 0 0 0-.5-.5h-9a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .294.456M12 10a2 2 0 0 1 1.732 1h.768a.5.5 0 0 0 .5-.5V8.35a.5.5 0 0 0-.11-.312l-1.48-1.85A.5.5 0 0 0 13.02 6H12zm-9 1a1 1 0 1 0 0 2 1 1 0 0 0 0-2m9 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2"
    />
  </Svg>
);
const TagIcon = ({ size = 14, color = purple }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M2 2a1 1 0 0 1 1-1h4.586a1 1 0 0 1 .707.293l7 7a1 1 0 0 1 0 1.414l-4.586 4.586a1 1 0 0 1-1.414 0l-7-7A1 1 0 0 1 2 6.586zm3.5 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3"
    />
  </Svg>
);
const HeartIcon = ({ size = 14, color = red }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314"
    />
  </Svg>
);
const CreditCardIcon = ({ size = 14, color = navy }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm0 2v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6zm14-1V4a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v1z"
    />
  </Svg>
);
const FlagIcon = ({ size = 14, color = "#fff" }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M14.778.085A.5.5 0 0 1 15 .5V8a.5.5 0 0 1-.314.464L14.5 8 14.886 8.5a.5.5 0 0 1-.314.464c-.547.226-1.793.677-3.21.677-1.412 0-2.59-.526-3.433-.917-.842-.39-1.412-.654-2.012-.654-1.062 0-2.087.391-2.59.6V1.302c.323-.236 1.39-.998 2.59-.998 1.422 0 2.553.604 3.49 1.025.917.41 1.578.604 2.51.604 1.21 0 2.336-.46 2.876-.667a.5.5 0 0 1 .376-.181zM1.5 1a.5.5 0 0 0-.5.5v13.5h1V2.062c.486-.181 1.292-.562 2.07-.562.624 0 1.123.21 1.797.532l.054.025c.733.346 1.594.745 2.738.745 1.345 0 2.575-.448 3.14-.687V8c-.526.197-1.59.5-2.71.5-1.04 0-1.96-.298-2.792-.692C5.523 7.443 4.633 7 3.5 7c-1.1 0-2.061.396-2.5.65"
    />
  </Svg>
);
const SendIcon = ({ size = 14, color = "#fff" }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11z"
    />
  </Svg>
);
const ArrowUpRightIcon = ({ size = 14, color = "#fff" }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M2 5a.5.5 0 0 0 .5.5h7.793L1.146 14.646a.5.5 0 0 0 .708.708L10.5 6.707V14.5a.5.5 0 0 0 1 0v-9a.5.5 0 0 0-.5-.5h-9A.5.5 0 0 0 2 5z"
    />
  </Svg>
);
const SparkleIcon = ({ size = 14, color = purple }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M7.657 6.247c.11-.33.576-.33.686 0l.645 1.937a2.89 2.89 0 0 0 1.829 1.828l1.936.645c.33.11.33.576 0 .686l-1.937.645a2.89 2.89 0 0 0-1.828 1.829l-.645 1.936a.361.361 0 0 1-.686 0l-.645-1.937a2.89 2.89 0 0 0-1.828-1.828l-1.937-.645a.361.361 0 0 1 0-.686l1.937-.645a2.89 2.89 0 0 0 1.828-1.828zM3.794 1.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387A1.73 1.73 0 0 0 4.593 5.69l-.387 1.162a.217.217 0 0 1-.412 0L3.407 5.69A1.73 1.73 0 0 0 2.31 4.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387A1.73 1.73 0 0 0 3.407 2.31z"
    />
  </Svg>
);
const PersonIcon = ({ size = 14, color = primary }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.029 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z"
    />
  </Svg>
);
const MapPinIcon = ({ size = 14, color = primary }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6"
    />
  </Svg>
);
const CrownIcon = ({ size = 14, color = "#F59E0B" }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path fill={color} d="M1.5 12.5h13l.7-7-3.7 2.5L8 3 4.5 8l-3.7-2.5z" />
    <Path fill={color} d="M1.5 13.5h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1 0-1" />
  </Svg>
);
const EyeIcon = ({ size = 14, color = "#fff" }: IP) => (
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
const ActivityIcon = ({ size = 14, color = primary }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M6 2a.5.5 0 0 1 .47.33L10.42 13.7l1.07-3.21A.5.5 0 0 1 12 10h3.5a.5.5 0 0 1 0 1h-3.13l-1.4 4.21a.5.5 0 0 1-.94.02L5.94 4.5 4.46 9.7A.5.5 0 0 1 4 10H.5a.5.5 0 0 1 0-1h3.13l1.85-6.5A.5.5 0 0 1 6 2z"
    />
  </Svg>
);
const MaximizeIcon = ({ size = 14, color = primary }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M1.5 1c-.276 0-.5.224-.5.5v4a.5.5 0 0 0 1 0V2.707l3.146 3.147a.5.5 0 1 0 .708-.708L2.707 2H5.5a.5.5 0 0 0 0-1H1.5zm9.5 0a.5.5 0 0 0 0 1h2.793l-3.147 3.146a.5.5 0 1 0 .708.708L14 2.707V5.5a.5.5 0 0 0 1 0v-4c0-.276-.224-.5-.5-.5H11zM1.5 10a.5.5 0 0 0-.5.5v4c0 .276.224.5.5.5h4a.5.5 0 0 0 0-1H2.707l3.146-3.146a.5.5 0 1 0-.708-.708L2 13.293V10.5a.5.5 0 0 0-.5-.5zm13 0a.5.5 0 0 0-.5.5v2.793l-3.146-3.147a.5.5 0 0 0-.708.708L13.293 15H10.5a.5.5 0 0 0 0 1h4c.276 0 .5-.224.5-.5v-4a.5.5 0 0 0-.5-.5z"
    />
  </Svg>
);
const DownloadIcon = ({ size = 14, color = primary }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path
      fill={color}
      d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"
    />
    <Path
      fill={color}
      d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"
    />
  </Svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type Trend = "up" | "down" | "flat";
type ChartPoint = { label: string; value: number };
type SlicePoint = { label: string; value: number; color: string };
type RecentOrder = {
  id: string;
  orderNumber: string;
  productName: string;
  date: string;
  amount: number;
  status: "Delivered" | "Processing" | "Cancelled" | "Returned" | "Replacement";
  payment: string;
};
type SectionId =
  | "overview"
  | "analytics"
  | "behaviour"
  | "payments"
  | "returns"
  | "orders"
  | "timeline"
  | "profile";

type TimeFrame = "7D" | "30D" | "90D" | "6M" | "1Y" | "All";

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA BUILDER
// ─────────────────────────────────────────────────────────────────────────────
function buildMockAnalytics(customerId: string, name: string) {
  const rng = mulberry32(seedFromString(customerId + name));
  const pick = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)];
  const between = (min: number, max: number) =>
    Math.round(min + rng() * (max - min));

  const totalOrders = between(8, 60);
  const lifetimeSpend = between(8000, 250000);
  const avgOrderValue = lifetimeSpend / totalOrders;

  const delivered = Math.round(totalOrders * (0.6 + rng() * 0.2));
  const processing = Math.round(totalOrders * (0.05 + rng() * 0.08));
  const cancelled = Math.round(totalOrders * (0.03 + rng() * 0.06));
  const returned = Math.round(totalOrders * (0.03 + rng() * 0.06));
  const replacement = Math.max(
    0,
    totalOrders - delivered - processing - cancelled - returned,
  );
  const refundAmount = Math.round((cancelled + returned) * avgOrderValue * 0.6);

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthlySpend: ChartPoint[] = months.map((m) => ({
    label: m,
    value: rng() < 0.18 ? 0 : between(500, Math.round(avgOrderValue * 3)),
  }));
  const monthlyOrders: ChartPoint[] = months.map((m) => ({
    label: m,
    value: rng() < 0.18 ? 0 : between(0, 6),
  }));

  const orderStatusBreakdown: SlicePoint[] = [
    { label: "Delivered", value: delivered, color: green },
    { label: "Processing", value: processing, color: yellow },
    { label: "Cancelled", value: cancelled, color: red },
    { label: "Returned", value: returned, color: purple },
    { label: "Replacement", value: replacement, color: blue },
  ].filter((d) => d.value > 0);

  const allCategories = [
    "Apparel",
    "Footwear",
    "Electronics",
    "Home & Living",
    "Beauty",
    "Accessories",
    "Sportswear",
  ];
  const categories: ChartPoint[] = allCategories
    .map((label) => ({ label, value: between(2, 40) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const allBrands = [
    "Flint & Thread",
    "Nova",
    "Urban Edge",
    "Lumen",
    "Voltrek",
    "Carrow",
    "Birchwood",
  ];
  const brands: ChartPoint[] = allBrands
    .map((label) => ({ label, value: between(2, 35) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const paymentMethods: SlicePoint[] = [
    { label: "UPI", value: between(20, 70), color: green },
    { label: "Card", value: between(10, 40), color: blue },
    { label: "COD", value: between(5, 30), color: yellow },
    { label: "Wallet", value: between(2, 15), color: purple },
  ];

  const orderFrequency: ChartPoint[] = Array.from({ length: 8 }, (_, i) => ({
    label: `W${i + 1}`,
    value: between(0, 4),
  }));

  const purchaseTime: ChartPoint[] = [
    { label: "Morning", value: between(5, 30) },
    { label: "Afternoon", value: between(10, 40) },
    { label: "Evening", value: between(20, 50) },
    { label: "Night", value: between(5, 25) },
  ];

  const behaviour = {
    mostPurchasedCategory: categories[0]?.label ?? "—",
    favouriteBrand: brands[0]?.label ?? "—",
    avgBasketSize: between(1, 4) + "." + between(0, 9) + " items",
    mostActiveDay: pick(["Monday", "Friday", "Saturday", "Sunday"]),
    mostActiveTime:
      purchaseTime.slice().sort((a, b) => b.value - a.value)[0]?.label ?? "—",
    avgDeliveryTime: between(2, 7) + " days",
    longestGap: between(20, 90) + " days",
    currentStreak: between(1, 6) + " orders",
  };

  const returnsData = {
    returnRate: Math.round((returned / Math.max(totalOrders, 1)) * 100),
    replacementRate: Math.round((replacement / Math.max(totalOrders, 1)) * 100),
    refundAmount,
    reasons: [
      { label: "Wrong Product", value: between(5, 40) },
      { label: "Damaged", value: between(5, 30) },
      { label: "Quality Issue", value: between(5, 25) },
      { label: "Size Issue", value: between(5, 35) },
    ] as ChartPoint[],
  };

  const sortedPayments = paymentMethods
    .slice()
    .sort((a, b) => b.value - a.value);
  const paymentsData = {
    successRate: between(88, 99),
    preferredMethod: sortedPayments[0]?.label ?? "UPI",
    failedPayments: between(0, 4),
    refundHistory: Array.from({ length: 3 }, () => ({
      date: `${between(1, 28)} ${pick(["Jan", "Feb", "Mar", "Apr", "May"])} 2026`,
      amount: between(300, 4000),
      reason: pick(["Order cancelled", "Item returned", "Payment failed"]),
    })),
  };

  const addressData = {
    primary: `${between(1, 200)}, ${pick(["MG Road", "Banjara Hills", "Jubilee Hills", "Kukatpally", "Gachibowli"])}, Hyderabad, Telangana`,
    savedCount: between(1, 4),
    mostDelivered: pick([
      "Hyderabad",
      "Bengaluru",
      "Chennai",
      "Pune",
      "Mumbai",
    ]),
    recentLocations: Array.from({ length: 3 }, () =>
      pick([
        "Hyderabad, TG",
        "Secunderabad, TG",
        "Gachibowli, TG",
        "Kukatpally, TG",
      ]),
    ),
  };

  const reviewsData = {
    submitted: between(0, totalOrders),
    avgRating: (3 + rng() * 2).toFixed(1),
    photoReviews: between(0, 5),
    helpfulVotes: between(0, 30),
  };

  const ticketsTotal = between(0, 8);
  const ticketsResolved = Math.max(0, ticketsTotal - between(0, 2));
  const supportData = {
    tickets: ticketsTotal,
    resolved: ticketsResolved,
    pending: Math.max(0, ticketsTotal - ticketsResolved),
    avgResolutionTime: between(2, 24) + "h",
    latestTicket:
      ticketsTotal > 0
        ? pick([
            "Order delayed",
            "Refund query",
            "Wrong item received",
            "Damaged on arrival",
          ])
        : "No tickets raised",
  };

  const loyaltyData = {
    tier: pick(["Bronze", "Silver", "Gold", "Platinum"]),
    points: between(50, 5000),
    progressPct: between(20, 95),
    nextTier: pick(["Silver", "Gold", "Platinum"]),
    couponsUsed: between(0, 12),
    lifetimeSavings: between(200, 15000),
  };

  const riskBadges: { label: string; color: string; bg: string }[] = [];
  if (lifetimeSpend > 80000)
    riskBadges.push({
      label: "High Value Customer",
      color: green,
      bg: activeLight,
    });
  if (totalOrders > 15)
    riskBadges.push({ label: "Repeat Buyer", color: blue, bg: blueLight });
  if (loyaltyData.tier === "Gold" || loyaltyData.tier === "Platinum")
    riskBadges.push({ label: "VIP Customer", color: "#F59E0B", bg: "#FEF9C3" });
  if (returnsData.returnRate < 8)
    riskBadges.push({
      label: "Low Return Rate",
      color: green,
      bg: activeLight,
    });
  if (cancelled / Math.max(totalOrders, 1) > 0.15)
    riskBadges.push({
      label: "Frequent Canceller",
      color: red,
      bg: inactiveLight,
    });
  if (rng() < 0.15)
    riskBadges.push({ label: "Inactive Customer", color: sub, bg: "#F3F4F6" });
  if (paymentsData.failedPayments > 2)
    riskBadges.push({
      label: "Late Payment Risk",
      color: red,
      bg: inactiveLight,
    });
  if (riskBadges.length === 0)
    riskBadges.push({ label: "Standard Customer", color: sub, bg: "#F3F4F6" });

  const aiInsights: string[] = [
    `Mostly shops on ${behaviour.mostActiveDay}s during the ${behaviour.mostActiveTime.toLowerCase()}.`,
    `Prefers ${behaviour.mostPurchasedCategory} over other categories.`,
    `Uses ${paymentsData.preferredMethod} for the majority of purchases.`,
    `Average reorder cycle is around ${between(10, 30)} days.`,
    `Lifetime value has increased ${between(8, 35)}% over the last 6 months.`,
    `Likely to purchase again within ${between(5, 18)} days.`,
    `Return rate is ${returnsData.returnRate < 10 ? "below" : "above"} average for this segment.`,
  ];

  const recommendedActions: { label: string; icon: string; color: string }[] = [
    { label: "Send Coupon", icon: "gift", color: pink },
    { label: "Upgrade Loyalty Tier", icon: "crown", color: "#F59E0B" },
    { label: "Offer Free Shipping", icon: "truck", color: blue },
    { label: "Notify About Sale", icon: "send", color: purple },
    { label: "Contact Customer", icon: "phone", color: green },
    { label: "Flag Customer", icon: "flag", color: red },
  ];

  const statusPool: RecentOrder["status"][] = [
    "Delivered",
    "Processing",
    "Cancelled",
    "Returned",
    "Replacement",
  ];
  const recentOrders: RecentOrder[] = Array.from(
    { length: Math.min(6, Math.max(totalOrders, 1)) },
    (_, i) => ({
      id: `FNT${20260500 + between(100, 999)}${i}`,
      orderNumber: `ORD-${20260500 + between(100, 999)}${i}`,
      productName: pick([
        "Wireless Noise-Cancelling Headphones",
        "Ergonomic Mechanical Keyboard",
        "Ultra-Wide Curved Monitor 34\"",
        "Smart Fitness Watch v2",
        "Portable USB-C SSD 1TB",
        "Dual-Band Wi-Fi 6 Router",
      ]),
      date: `${between(1, 28)} ${pick(["Jan", "Feb", "Mar", "Apr", "May", "Jun"])} 2026`,
      amount: between(500, Math.max(Math.round(avgOrderValue * 2), 600)),
      status: i === 0 ? "Delivered" : pick(statusPool),
      payment: pick(["UPI", "Card", "COD", "Wallet"]),
    }),
  );

  const timeline: { type: string; title: string; date: string }[] = [
    {
      type: "order",
      title: "Order placed — #" + (recentOrders[0]?.id ?? "—"),
      date: "2 days ago",
    },
    {
      type: "payment",
      title: "Payment received via " + paymentsData.preferredMethod,
      date: "2 days ago",
    },
    {
      type: "ticket",
      title: "Support ticket: " + supportData.latestTicket,
      date: "5 days ago",
    },
    {
      type: "review",
      title: "Submitted a " + reviewsData.avgRating + "★ review",
      date: "1 week ago",
    },
    { type: "coupon", title: "Used a loyalty coupon", date: "2 weeks ago" },
    {
      type: "replacement",
      title: "Requested a replacement",
      date: "3 weeks ago",
    },
    { type: "address", title: "Updated shipping address", date: "1 month ago" },
    { type: "return", title: "Returned an order", date: "1 month ago" },
  ];

  return {
    totalOrders,
    lifetimeSpend,
    avgOrderValue,
    delivered,
    processing,
    cancelled,
    returned,
    replacement,
    refundAmount,
    monthlySpend,
    monthlyOrders,
    orderStatusBreakdown,
    categories,
    brands,
    paymentMethods,
    orderFrequency,
    purchaseTime,
    behaviour,
    returnsData,
    paymentsData,
    addressData,
    reviewsData,
    supportData,
    loyaltyData,
    riskBadges,
    aiInsights,
    recommendedActions,
    recentOrders,
    timeline,
    customerSince: `${between(1, 28)} ${pick(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"])} ${pick([2023, 2024, 2025])}`,
    lastPurchase: `${between(1, 28)} ${pick(["Apr", "May", "Jun"])} 2026`,
    healthScore: between(55, 98),
    isVip: loyaltyData.tier === "Gold" || loyaltyData.tier === "Platinum",
    status: rng() < 0.85 ? "Active" : "Inactive",
  };
}
// Timeframe categorical filtering — lifetime aggregates from backend
function getFilteredCategoricalData<T extends { label: string; value: number }>(
  baseData: T[],
  _timeframe: TimeFrame,
): T[] {
  return baseData;
}

function sliceMonthlyData(data: ChartPoint[], timeframe: TimeFrame): ChartPoint[] {
  const now = new Date();
  const currentMonth = now.getMonth();
  let monthsToInclude = 12;
  switch (timeframe) {
    case "7D":
    case "30D":
      monthsToInclude = 1;
      break;
    case "90D":
      monthsToInclude = 3;
      break;
    case "6M":
      monthsToInclude = 6;
      break;
    default:
      return data;
  }
  const indices: number[] = [];
  for (let i = monthsToInclude - 1; i >= 0; i--) {
    indices.push((currentMonth - i + 12) % 12);
  }
  return indices.map((m) => data[m] ?? { label: "", value: 0 }).filter((p) => p.label);
}

function sliceTailData(data: ChartPoint[], timeframe: TimeFrame): ChartPoint[] {
  if (timeframe === "All" || timeframe === "1Y") return data;
  let count = data.length;
  switch (timeframe) {
    case "7D":
      count = 1;
      break;
    case "30D":
      count = Math.min(4, data.length);
      break;
    case "90D":
      count = Math.min(6, data.length);
      break;
    case "6M":
      count = Math.min(6, data.length);
      break;
  }
  return data.slice(-count);
}

// Timeframe filtering — slice real monthly / weekly series from backend
function getFilteredData(
  baseData: ChartPoint[],
  timeframe: TimeFrame,
  metricType: "spend" | "orders" | "freq" | "time",
): ChartPoint[] {
  if (timeframe === "All" || timeframe === "1Y") {
    return baseData;
  }
  if (metricType === "spend" || metricType === "orders") {
    return sliceMonthlyData(baseData, timeframe);
  }
  if (metricType === "freq") {
    return sliceTailData(baseData, timeframe);
  }
  return baseData;
}

function parseTrendValue(val: string): Trend {
  const num = parseFloat(val.replace("%", "").replace("+", ""));
  if (!val || val === "0%" || Number.isNaN(num) || num === 0) return "flat";
  return num > 0 ? "up" : "down";
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED PRESENTATIONAL COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
const Card = React.memo(function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return <View style={[s.card, style]}>{children}</View>;
});

const SectionHeader = React.memo(function SectionHeader({
  icon,
  title,
  right,
}: {
  icon: React.ReactNode;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={s.sectionHeader}>
      <View style={s.sectionHeaderLeft}>
        <View style={s.sectionIconBox}>{icon}</View>
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      {right ?? null}
    </View>
  );
});

const TrendTag = React.memo(function TrendTag({
  trend,
  value,
}: {
  trend: Trend;
  value: string;
}) {
  const color = trend === "up" ? green : trend === "down" ? red : sub;
  const bg =
    trend === "up" ? activeLight : trend === "down" ? inactiveLight : "#F3F4F6";
  return (
    <View style={[s.trendTag, { backgroundColor: bg }]}>
      {trend === "up" ? (
        <GraphUpIcon size={11} color={color} />
      ) : trend === "down" ? (
        <GraphDownIcon size={11} color={color} />
      ) : null}
      <Text style={[s.trendTagTxt, { color }]}>{value}</Text>
    </View>
  );
});

const KpiCard = React.memo(function KpiCard({
  icon,
  iconBg,
  title,
  value,
  sub: subText,
  trend,
  trendVal,
  basisPct,
  onPress,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  value: string;
  sub: string;
  trend: Trend;
  trendVal: string;
  basisPct: number;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.85 : 1}
      onPress={onPress}
      style={[s.kpiCard, { flexBasis: `${basisPct}%` as const, flexGrow: 1, flexShrink: 1 }]}
    >
      <View style={s.kpiTop}>
        <View style={[s.kpiIconBox, { backgroundColor: iconBg }]}>{icon}</View>
        <TrendTag trend={trend} value={trendVal} />
      </View>
      <Text style={s.kpiValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={s.kpiTitle} numberOfLines={1}>
        {title}
      </Text>
      <Text style={s.kpiSub} numberOfLines={1}>
        {subText}
      </Text>
    </TouchableOpacity>
  );
});

const StatPair = React.memo(function StatPair({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={s.statPair}>
      <Text style={s.statPairLbl}>{label}</Text>
      <Text style={s.statPairVal} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
});

const MiniStatTrio = React.memo(function MiniStatTrio({
  items,
  style,
}: {
  items: { label: string; value: string; color?: string }[];
  style?: any;
}) {
  return (
    <View style={[s.miniTrio, style]}>
      {items.map((it, i) => (
        <React.Fragment key={it.label}>
          <View style={s.miniTrioItem}>
            <Text
              style={[s.miniTrioVal, it.color ? { color: it.color } : null]}
              numberOfLines={1}
            >
              {it.value}
            </Text>
            <Text style={s.miniTrioLbl} numberOfLines={2}>
              {it.label}
            </Text>
          </View>
          {i < items.length - 1 && <View style={s.miniTrioDiv} />}
        </React.Fragment>
      ))}
    </View>
  );
});

const BarList = React.memo(function BarList({ data, onRowPress }: { data: ChartPoint[]; onRowPress?: (row: ChartPoint) => void }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={{ gap: 10 }}>
      {data.map((d, i) => (
        <TouchableOpacity
          key={d.label}
          activeOpacity={onRowPress ? 0.75 : 1}
          onPress={() => onRowPress?.(d)}
          style={s.barListRow}
        >
          <Text style={s.barListLbl} numberOfLines={1}>
            {d.label}
          </Text>
          <View style={s.barListTrack}>
            <View
              style={[
                s.barListFill,
                {
                  width: `${(d.value / max) * 100}%`,
                  backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                },
              ]}
            />
          </View>
          <Text style={s.barListVal}>{d.value}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
});

const Badge = React.memo(function Badge({
  label,
  color,
  bg,
}: {
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <View style={[s.badgeDot, { backgroundColor: color }]} />
      <Text style={[s.badgeTxt, { color }]}>{label}</Text>
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTING HELPERS (CSV / PDF)
// ─────────────────────────────────────────────────────────────────────────────
const shareData = async (title: string, data: ChartPoint[]) => {
  const csvString = "Label,Value\n" + data.map(d => `"${d.label}",${d.value}`).join("\n");
  try {
    if (Platform.OS === 'web') {
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${title.replace(/\s+/g, '_')}_data.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      await Share.share({
        message: csvString,
        title: `${title} CSV Export`,
      });
    }
  } catch (error) {
    console.error("Export error:", error);
  }
};

const printDataPDF = async (title: string, data: ChartPoint[], customerId: string) => {
  const rows = data.map(d => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #E5E7EB; font-family: system-ui;">${d.label}</td>
      <td style="padding: 8px; border-bottom: 1px solid #E5E7EB; text-align: right; font-weight: bold; font-family: system-ui;">${d.value.toLocaleString()}</td>
    </tr>
  `).join("");

  const html = `
    <html>
      <body style="font-family: system-ui, sans-serif; padding: 24px; color: #111827;">
        <h1 style="color: #1E2B6B; font-size: 24px; margin-bottom: 4px;">Customer Analytics Export</h1>
        <h2 style="color: #F97316; font-size: 14px; margin-top: 0; margin-bottom: 24px;">Report: ${title} &middot; Customer #${customerId}</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #F3F4F6;">
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #E5E7EB;">Metric label</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #E5E7EB;">Value</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <p style="margin-top: 40px; text-align: center; font-size: 11px; color: #9CA3AF;">Generated dynamically via Admin Panel Dashboard.</p>
      </body>
    </html>
  `;

  try {
    if (Platform.OS === 'web') {
      await Print.printAsync({ html });
    } else {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    }
  } catch (error) {
    console.error("PDF Print error:", error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSIVE INTERACTIVE CHARTS
// ─────────────────────────────────────────────────────────────────────────────
interface MeasuredChartProps {
  plotHeight?: number;
  render: (width: number, height: number) => React.ReactNode;
}
function MeasuredChart({ plotHeight = 140, render }: MeasuredChartProps) {
  const [w, setW] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const next = Math.round(e.nativeEvent.layout.width);
    if (next > 0 && next !== w) setW(next);
  }, [w]);

  const effectivePlotHeight = w > 0 && w < 280 ? Math.max(100, plotHeight - 20) : plotHeight;
  return (
    <View onLayout={onLayout} style={{ width: "100%" }}>
      {w > 0 ? render(w, effectivePlotHeight) : <View style={{ height: effectivePlotHeight }} />}
    </View>
  );
}

// Helper to format month abbreviations to full Month Year (e.g. "Jan" to "Jan 2026")
function formatPeriodLabel(label: string) {
  const monthMap: Record<string, string> = {
    Jan: "Jan 2026", Feb: "Feb 2026", Mar: "Mar 2026", Apr: "Apr 2026",
    May: "May 2026", Jun: "Jun 2026", Jul: "Jul 2026", Aug: "Aug 2026",
    Sep: "Sep 2026", Oct: "Oct 2026", Nov: "Nov 2026", Dec: "Dec 2026"
  };
  return monthMap[label] ?? label;
}

interface ChartTooltipProps {
  x: number;
  y: number;
  plotWidth: number;
  plotHeight: number;
  metricName: string;
  label: string;
  value: string;
  color: string;
  pctChange?: string | null;
  percentageShare?: string | null;
  contributionStr?: string | null;
}

// Chart Tooltip card
const ChartTooltip = React.memo(function ChartTooltip({
  x,
  y,
  plotWidth,
  plotHeight,
  metricName,
  label,
  value,
  color,
  pctChange,
  percentageShare,
  contributionStr,
}: ChartTooltipProps) {
  const bubbleW = 180;
  // Dynamic height estimation
  let bubbleH = 68;
  if (pctChange) bubbleH += 18;
  if (percentageShare) bubbleH += 18;
  if (contributionStr) bubbleH += 18;

  const left = Math.min(Math.max(x - bubbleW / 2, 0), plotWidth - bubbleW);
  let top = y - bubbleH - 12;
  if (top < 4) {
    top = y + 16;
  }
  top = Math.min(Math.max(top, 4), plotHeight - bubbleH - 4);

  return (
    <View pointerEvents="none" style={[s.tooltipBubble, { left, top, width: bubbleW }]}>
      <Text style={s.tooltipMetricName} numberOfLines={1}>{metricName}</Text>
      <Text style={s.tooltipLabel} numberOfLines={1}>{formatPeriodLabel(label)}</Text>
      <Text style={[s.tooltipValue, { color }]} numberOfLines={1}>{value}</Text>
      {pctChange ? (
        <Text style={[s.tooltipPctChange, { color: pctChange.startsWith("-") ? C.red : C.green }]} numberOfLines={1}>
          {pctChange}
        </Text>
      ) : null}
      {percentageShare ? (
        <Text style={s.tooltipPctShare} numberOfLines={1}>{percentageShare}</Text>
      ) : null}
      {contributionStr ? (
        <Text style={s.tooltipContribution} numberOfLines={1}>{contributionStr}</Text>
      ) : null}
    </View>
  );
});

// Advanced Interactive Line Chart Svg Component
interface SvgChartProps {
  data: ChartPoint[];
  color?: string;
  width: number;
  height: number;
  formatValue: (v: number) => string;
  onPointPress?: (p: ChartPoint) => void;
  onHoverValueChange?: (val: string | null) => void;
  metricName: string;
  timeframe?: TimeFrame;
}
function LineChartSvg({
  data,
  color = primary,
  width,
  height,
  formatValue,
  onPointPress,
  onHoverValueChange,
  metricName,
  timeframe,
}: SvgChartProps) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const padX = Math.max(12, width * 0.04);
  const padY = 20;

  // Simple transition animation on filter update
  const growAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    growAnim.setValue(0);
    Animated.timing(growAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, [data]);

  const max = Math.max(...data.map((d) => d.value), 1);
  const step = (width - padX * 2) / Math.max(data.length - 1, 1);

  const pts = useMemo(() => {
    return data.map((d, i) => ({
      x: padX + i * step,
      y: padY + (1 - d.value / max) * (height - padY * 2),
    }));
  }, [data, padX, step, max, height]);

  const linePath = useMemo(() => {
    if (pts.length === 0) return "";
    return pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
  }, [pts]);

  const areaPath = useMemo(() => {
    if (pts.length === 0) return "";
    return `${linePath} L ${pts[pts.length - 1].x} ${height - padY} L ${pts[0].x} ${height - padY} Z`;
  }, [linePath, pts, height]);

  // Touch handlers to compute index
  const handleTouch = (evt: any) => {
    const locX = evt.nativeEvent.locationX;
    const innerX = locX - padX;
    const innerWidth = width - padX * 2;
    const index = Math.round((innerX / innerWidth) * (data.length - 1));
    const clamped = Math.max(0, Math.min(data.length - 1, index));
    if (clamped !== activeIdx) {
      setActiveIdx(clamped);
      if (onHoverValueChange) {
        onHoverValueChange(`${data[clamped].label}: ${formatValue(data[clamped].value)}`);
      }
    }
  };

  const handleTouchEnd = () => {
    setActiveIdx(null);
    if (onHoverValueChange) {
      onHoverValueChange(null);
    }
  };

  const handleWebMove = (evt: any) => {
    const rect = evt.currentTarget.getBoundingClientRect();
    const locX = evt.clientX - rect.left;
    const innerX = locX - padX;
    const innerWidth = width - padX * 2;
    const index = Math.round((innerX / innerWidth) * (data.length - 1));
    const clamped = Math.max(0, Math.min(data.length - 1, index));
    if (clamped !== activeIdx) {
      setActiveIdx(clamped);
      if (onHoverValueChange) {
        onHoverValueChange(`${data[clamped].label}: ${formatValue(data[clamped].value)}`);
      }
    }
  };

  const pointerProps = Platform.OS === 'web' ? {
    onMouseMove: handleWebMove,
    onMouseLeave: handleTouchEnd,
  } : {
    onTouchStart: handleTouch,
    onTouchMove: handleTouch,
    onTouchEnd: handleTouchEnd,
  };

  // Percentage change from previous period
  const pctChange = useMemo(() => {
    if (activeIdx === null || activeIdx === 0 || !data[activeIdx - 1]) return null;
    const prev = data[activeIdx - 1].value;
    const curr = data[activeIdx].value;
    if (prev === 0) {
      return curr > 0 ? "+100.0% from prev period" : "0.0% from prev period";
    }
    const pct = ((curr - prev) / prev) * 100;
    const sign = pct >= 0 ? "+" : "";
    const period = timeframe === "7D" ? "day" : (timeframe === "30D" || timeframe === "90D" ? "week" : "month");
    return `${sign}${pct.toFixed(1)}% from previous ${period}`;
  }, [activeIdx, data, timeframe]);

  return (
    <View style={{ width, height: height + 24, zIndex: activeIdx !== null ? 10 : 1 }}>
      {/* Chart Canvas Area */}
      <View
        {...pointerProps}
        style={{ width, height, position: "relative", zIndex: 10 }}
      >
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <Defs>
            <SvgLinearGradient id={`areaGrad-${color}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={color} stopOpacity={0.24} />
              <Stop offset="100%" stopColor={color} stopOpacity={0.0} />
            </SvgLinearGradient>
          </Defs>

          {/* Grid lines */}
          <Line x1={padX} y1={padY} x2={width - padX} y2={padY} stroke="#E5E7EB" strokeWidth={1} strokeDasharray="4,4" />
          <Line x1={padX} y1={height / 2} x2={width - padX} y2={height / 2} stroke="#E5E7EB" strokeWidth={1} strokeDasharray="4,4" />
          <Line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke="#E5E7EB" strokeWidth={1} strokeDasharray="4,4" />

          {/* Paths */}
          <Path d={areaPath} fill={`url(#areaGrad-${color})`} />
          <Path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />

          {/* Active Crosshair line */}
          {activeIdx !== null && pts[activeIdx] && (
            <Line
              x1={pts[activeIdx].x}
              y1={padY}
              x2={pts[activeIdx].x}
              y2={height - padY}
              stroke={color}
              strokeWidth={1.5}
              strokeDasharray="3,3"
            />
          )}

          {/* Plot Dots */}
          {pts.map((p, i) => (
            <G key={i}>
              {activeIdx === i && (
                <Circle
                  cx={p.x}
                  cy={p.y}
                  r={11}
                  fill={color}
                  opacity={0.16}
                  pointerEvents="none"
                />
              )}
              <Circle
                cx={p.x}
                cy={p.y}
                r={activeIdx === i ? 6 : 4}
                fill={activeIdx === i ? "#fff" : color}
                stroke={color}
                strokeWidth={activeIdx === i ? 3.5 : 0}
                onPress={() => onPointPress?.(data[i])}
              />
            </G>
          ))}
        </Svg>

        {activeIdx !== null && pts[activeIdx] && (
          <ChartTooltip
            x={pts[activeIdx].x}
            y={pts[activeIdx].y}
            plotWidth={width}
            plotHeight={height}
            metricName={metricName}
            label={data[activeIdx].label}
            value={formatValue(data[activeIdx].value)}
            color={color}
            pctChange={pctChange}
          />
        )}
      </View>

      {/* Axis Rows */}
      <View style={[s.axisRow, { paddingHorizontal: padX }]}>
        {data.map((d, i) => (
          <Text
            key={i}
            style={[
              s.axisLabel,
              activeIdx === i && { color, fontWeight: "700" },
              { flex: 1, textAlign: "center" }
            ]}
            numberOfLines={1}
          >
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function BarChartSvg({
  data,
  color = primary,
  width,
  height,
  formatValue,
  onPointPress,
  onHoverValueChange,
  metricName,
  timeframe,
}: SvgChartProps) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const padX = Math.max(12, width * 0.03);
  const padY = 16;

  const max = Math.max(...data.map((d) => d.value), 1);
  const slot = (width - padX * 2) / data.length;
  const barW = Math.max(6, slot * 0.6);

  const bars = useMemo(() => {
    return data.map((d, i) => {
      const h = Math.max((d.value / max) * (height - padY * 2), d.value > 0 ? 4 : 0);
      const x = padX + i * slot + (slot - barW) / 2;
      const y = height - padY - h;
      return { x, y, h, d, index: i };
    });
  }, [data, max, slot, barW, padX, height]);

  const totalVal = useMemo(() => {
    return Math.max(data.reduce((sum, d) => sum + d.value, 0), 1);
  }, [data]);

  const handleTouch = (evt: any) => {
    const locX = evt.nativeEvent.locationX;
    const innerX = locX - padX;
    const index = Math.floor(innerX / slot);
    const clamped = Math.max(0, Math.min(data.length - 1, index));
    if (clamped !== activeIdx) {
      setActiveIdx(clamped);
      if (onHoverValueChange) {
        onHoverValueChange(`${data[clamped].label}: ${formatValue(data[clamped].value)}`);
      }
    }
  };

  const handleTouchEnd = () => {
    setActiveIdx(null);
    if (onHoverValueChange) {
      onHoverValueChange(null);
    }
  };

  const handleWebMove = (evt: any) => {
    const rect = evt.currentTarget.getBoundingClientRect();
    const locX = evt.clientX - rect.left;
    const innerX = locX - padX;
    const index = Math.floor(innerX / slot);
    const clamped = Math.max(0, Math.min(data.length - 1, index));
    if (clamped !== activeIdx) {
      setActiveIdx(clamped);
      if (onHoverValueChange) {
        onHoverValueChange(`${data[clamped].label}: ${formatValue(data[clamped].value)}`);
      }
    }
  };

  const pointerProps = Platform.OS === 'web' ? {
    onMouseMove: handleWebMove,
    onMouseLeave: handleTouchEnd,
  } : {
    onTouchStart: handleTouch,
    onTouchMove: handleTouch,
    onTouchEnd: handleTouchEnd,
  };

  return (
    <View style={{ width, height: height + 24, zIndex: activeIdx !== null ? 10 : 1 }}>
      <View
        {...pointerProps}
        style={{ width, height, position: "relative", zIndex: 10 }}
      >
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          {/* Horizontal lines */}
          <Line x1={padX} y1={padY} x2={width - padX} y2={padY} stroke="#E5E7EB" strokeWidth={1} strokeDasharray="3,3" />
          <Line x1={padX} y1={height / 2} x2={width - padX} y2={height / 2} stroke="#E5E7EB" strokeWidth={1} strokeDasharray="3,3" />
          <Line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke="#E5E7EB" strokeWidth={1} strokeDasharray="3,3" />

          {bars.map((b) => (
            <Rect
              key={b.index}
              x={b.x}
              y={b.y}
              width={barW}
              height={b.h}
              rx={4}
              fill={color}
              opacity={activeIdx === b.index ? 1.0 : activeIdx === null ? 0.65 : 0.45}
              stroke={activeIdx === b.index ? color : "none"}
              strokeWidth={activeIdx === b.index ? 1 : 0}
              onPress={() => onPointPress?.(b.d)}
            />
          ))}
        </Svg>

        {activeIdx !== null && bars[activeIdx] && (
          <ChartTooltip
            x={bars[activeIdx].x + barW / 2}
            y={bars[activeIdx].y}
            plotWidth={width}
            plotHeight={height}
            metricName={metricName}
            label={data[activeIdx].label}
            value={formatValue(data[activeIdx].value)}
            color={color}
            contributionStr={`${((data[activeIdx].value / totalVal) * 100).toFixed(1)}% of Total`}
          />
        )}
      </View>

      <View style={[s.axisRow, { paddingHorizontal: padX }]}>
        {data.map((d, i) => (
          <Text
            key={i}
            style={[
              s.axisLabel,
              activeIdx === i && { color, fontWeight: "700" },
              { flex: 1, textAlign: "center" }
            ]}
            numberOfLines={1}
          >
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// POLAR MATH & DONUT SLICE RENDERER
// ─────────────────────────────────────────────────────────────────────────────
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSlicePath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number,
) {
  const outerStart = polarToCartesian(cx, cy, rOuter, startAngle);
  const outerEnd = polarToCartesian(cx, cy, rOuter, endAngle);
  const innerStart = polarToCartesian(cx, cy, rInner, endAngle);
  const innerEnd = polarToCartesian(cx, cy, rInner, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  if (rInner <= 0.01) {
    return `M ${cx} ${cy} L ${outerStart.x} ${outerStart.y} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y} Z`;
  }
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y}`,
    "Z",
  ].join(" ");
}

const RingChart = React.memo(function RingChart({
  data,
  donut = true,
  size = 150,
  metricName,
  unit = "Orders",
}: {
  data: SlicePoint[];
  donut?: boolean;
  size?: number;
  metricName: string;
  unit?: string;
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const total = Math.max(data.reduce((sum, d) => sum + d.value, 0), 1);
  const cx = size / 2,
    cy = size / 2,
    rOuter = size / 2 - 6,
    rInner = donut ? rOuter * 0.55 : 0;
  let angle = 0;

  if (data.length === 0) {
    return (
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 12, color: C.textLight }}>No Active Slices</Text>
      </View>
    );
  }

  const slices = data.map((d, i) => {
    const sweep = (d.value / total) * 360;
    const gap = sweep < 359 ? 1.5 : 0;
    const currentStartAngle = angle;
    angle += sweep;
    return {
      d,
      index: i,
      sweep,
      gap,
      startAngle: currentStartAngle,
      color: d.color,
    };
  });

  // Dynamic center text for Donut Chart
  let centerTextElement = null;
  if (donut) {
    if (activeIdx !== null && data[activeIdx]) {
      const pct = ((data[activeIdx].value / total) * 100).toFixed(1) + "%";
      centerTextElement = (
        <G pointerEvents="none">
          <SvgText
            x={cx}
            y={cy - 14}
            fontSize={9}
            fontWeight="700"
            fill={C.textLight}
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {data[activeIdx].label.toUpperCase()}
          </SvgText>
          <SvgText
            x={cx}
            y={cy + 4}
            fontSize={15}
            fontWeight="800"
            fill={C.textDark}
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {data[activeIdx].value.toLocaleString()}
          </SvgText>
          <SvgText
            x={cx}
            y={cy + 20}
            fontSize={10}
            fontWeight="700"
            fill={data[activeIdx].color}
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {pct}
          </SvgText>
        </G>
      );
    } else {
      centerTextElement = (
        <G pointerEvents="none">
          <SvgText
            x={cx}
            y={cy - 10}
            fontSize={9}
            fontWeight="700"
            fill={C.textLight}
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            TOTAL
          </SvgText>
          <SvgText
            x={cx}
            y={cy + 8}
            fontSize={16}
            fontWeight="800"
            fill={C.textDark}
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {total.toLocaleString()}
          </SvgText>
        </G>
      );
    }
  }

  const activeSlice = activeIdx !== null ? data[activeIdx] : null;
  const activePct = activeSlice ? ((activeSlice.value / total) * 100).toFixed(1) + "%" : "";
  const InteractivePath = Path as any;

  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ width: size, height: size, position: "relative" }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {slices.map((sl, i) => {
            const isActive = activeIdx === i;
            const path = donutSlicePath(cx, cy, rOuter, rInner, sl.startAngle, sl.startAngle + sl.sweep - sl.gap);

            return (
              <G key={i}>
                <InteractivePath
                  d={path}
                  fill={sl.color}
                  opacity={activeIdx === null || isActive ? 1.0 : 0.6}
                  onMouseEnter={() => setActiveIdx(i)}
                  onMouseLeave={() => setActiveIdx(null)}
                  onPressIn={() => setActiveIdx(i)}
                  onPressOut={() => setActiveIdx(null)}
                  onPress={() => setActiveIdx(i)}
                  style={Platform.OS === 'web' ? { cursor: 'pointer' } : undefined}
                />
              </G>
            );
          })}
          {centerTextElement}
        </Svg>
      </View>
      
      {/* Simple un-intrusive text label below the chart */}
      <View style={{ height: 20, marginTop: 4, justifyContent: "center", alignItems: "center" }}>
        {activeSlice ? (
          <Text style={{ fontSize: 11, fontWeight: "700", color: activeSlice.color }}>
            {activeSlice.label}: {activeSlice.value.toLocaleString()} {unit} ({activePct})
          </Text>
        ) : (
          <Text style={{ fontSize: 10, color: C.textLight, fontStyle: "italic" }}>
            Hover slices for details
          </Text>
        )}
      </View>
    </View>
  );
});

const LegendList = React.memo(function LegendList({
  data,
  hiddenLabels,
  onToggleLabel,
}: {
  data: SlicePoint[];
  hiddenLabels: Set<string>;
  onToggleLabel: (label: string) => void;
}) {
  const total = Math.max(data.reduce((sum, d) => sum + d.value, 0), 1);
  return (
    <View style={{ gap: 8, width: "100%" }}>
      {data.map((d) => {
        const isHidden = hiddenLabels.has(d.label);
        return (
          <TouchableOpacity
            key={d.label}
            activeOpacity={0.7}
            onPress={() => onToggleLabel(d.label)}
            style={[s.legendRow, isHidden && { opacity: 0.4 }]}
          >
            <View style={[s.legendDot, { backgroundColor: isHidden ? C.border : d.color }]} />
            <Text style={[s.legendLbl, isHidden && { textDecorationLine: "line-through" }]} numberOfLines={1}>
              {d.label}
            </Text>
            <Text style={s.legendVal}>
              {isHidden ? "0%" : `${Math.round((d.value / total) * 100)}%`}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// ORDER STATUS CHIPS / TIMELINE LOOKUPS
// ─────────────────────────────────────────────────────────────────────────────
const ORDER_STATUS_CFG: Record<
  RecentOrder["status"],
  { bg: string; color: string }
> = {
  Delivered: { bg: activeLight, color: green },
  Processing: { bg: yellowLight, color: yellow },
  Cancelled: { bg: inactiveLight, color: red },
  Returned: { bg: purpleLight, color: purple },
  Replacement: { bg: blueLight, color: blue },
};
const OrderStatusChip = React.memo(function OrderStatusChip({
  status,
}: {
  status: RecentOrder["status"];
}) {
  const cfg = ORDER_STATUS_CFG[status];
  return (
    <View style={[s.statusChip, { backgroundColor: cfg.bg }]}>
      <Text style={[s.statusChipTxt, { color: cfg.color }]}>{status}</Text>
    </View>
  );
});

const TIMELINE_ICON_CFG: Record<string, { icon: React.ReactNode; bg: string }> =
  {
    order: { icon: <BagIcon size={13} color={primary} />, bg: primaryLight },
    payment: {
      icon: <CreditCardIcon size={13} color={green} />,
      bg: activeLight,
    },
    ticket: { icon: <TicketIcon size={13} color={blue} />, bg: blueLight },
    review: { icon: <StarFillIcon size={13} />, bg: "#FEF9C3" },
    coupon: { icon: <GiftIcon size={13} color={pink} />, bg: pinkLight },
    replacement: {
      icon: <SwapIcon size={13} color={purple} />,
      bg: purpleLight,
    },
    address: { icon: <MapPinIcon size={13} color={teal} />, bg: tealLight },
    return: { icon: <ReplyIcon size={13} color={red} />, bg: inactiveLight },
  };

const ACTION_ICON_CFG: Record<string, React.ReactNode> = {
  gift: <GiftIcon size={16} color="#fff" />,
  crown: <CrownIcon size={16} color="#fff" />,
  truck: <TruckIcon size={16} color="#fff" />,
  send: <SendIcon size={16} color="#fff" />,
  phone: <PhoneIcon size={16} color="#fff" />,
  flag: <FlagIcon size={16} color="#fff" />,
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGE WRAPPER / STICKY NAV
// ─────────────────────────────────────────────────────────────────────────────
function PageSection({
  id,
  onMeasure,
  children,
}: {
  id: SectionId;
  onMeasure: (id: SectionId, y: number) => void;
  children: React.ReactNode;
}) {
  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => onMeasure(id, e.nativeEvent.layout.y),
    [id, onMeasure],
  );
  return <View onLayout={handleLayout}>{children}</View>;
}

const SectionNav = React.memo(function SectionNav({
  sections,
  activeId,
  onSelect,
}: {
  sections: { id: SectionId; label: string; icon: React.ReactNode }[];
  activeId: SectionId;
  onSelect: (id: SectionId) => void;
}) {
  return (
    <View style={s.navWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.navScrollContent}
      >
        {sections.map((sec) => {
          const isActive = sec.id === activeId;
          return (
            <TouchableOpacity
              key={sec.id}
              onPress={() => onSelect(sec.id)}
              style={[s.navTab, isActive && s.navTabActive]}
              activeOpacity={0.75}
            >
              {sec.icon}
              <Text style={[s.navTabTxt, isActive && s.navTabTxtActive]} numberOfLines={1}>
                {sec.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// DRILL-DOWN & FULLSCREEN MODALS
// ─────────────────────────────────────────────────────────────────────────────
interface DrillDownModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  dataPoint: ChartPoint | null;
  customerId: string;
  customerName: string;
}
const DrillDownModal = React.memo(function DrillDownModal({
  visible,
  onClose,
  title,
  dataPoint,
  customerId,
  customerName,
}: DrillDownModalProps) {
  if (!dataPoint) return null;

  // Generate deterministic breakout orders
  const rng = mulberry32(seedFromString(dataPoint.label + customerId));
  const between = (min: number, max: number) => Math.round(min + rng() * (max - min));
  const ordersCount = between(1, 3);
  const simulatedOrders = Array.from({ length: ordersCount }, (_, i) => ({
    id: `FNT${20260000 + between(1000, 9999)}${i}`,
    date: `${between(1, 28)} ${dataPoint.label.substring(0, 3)} 2026`,
    amount: Math.round(dataPoint.value / ordersCount),
    status: (i === 0 ? "Delivered" : "Processing") as RecentOrder["status"],
  }));

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.modalOverlay}>
        <View style={s.modalContent}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{title} Detail Breakdown</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeBtnTxt}>Close</Text>
            </TouchableOpacity>
          </View>

          <View style={s.modalBody}>
            <View style={s.breakoutSummary}>
              <View>
                <Text style={s.breakoutLbl}>Interval / Category</Text>
                <Text style={s.breakoutVal}>{dataPoint.label}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={s.breakoutLbl}>Calculated Value</Text>
                <Text style={[s.breakoutVal, { color: primary }]}>
                  {dataPoint.value > 100 ? rupee(dataPoint.value) : dataPoint.value}
                </Text>
              </View>
            </View>

            <Text style={s.modalSubheading}>Simulated Transactions ({simulatedOrders.length})</Text>
            <View style={{ gap: 8 }}>
              {simulatedOrders.map((o) => (
                <View key={o.id} style={s.breakoutRow}>
                  <View>
                    <Text style={s.breakoutRowId}>{o.id}</Text>
                    <Text style={s.breakoutRowSub}>{o.date}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={s.breakoutRowAmt}>{rupee(o.amount)}</Text>
                    <OrderStatusChip status={o.status} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
});

interface FullscreenChartModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  data: ChartPoint[];
  exportCSV: () => void;
  exportPDF: () => void;
}
const FullscreenChartModal = React.memo(function FullscreenChartModal({
  visible,
  onClose,
  title,
  children,
  data,
  exportCSV,
  exportPDF,
}: FullscreenChartModalProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={s.modalOverlay}>
        <View style={[s.modalContent, { height: "70%", maxHeight: 600 }]}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Fullscreen: {title}</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeBtnTxt}>Exit</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={s.modalBody} contentContainerStyle={{ gap: 20 }}>
            <View style={s.fullscreenChartContainer}>{children}</View>

            <View style={s.fullscreenActions}>
              <TouchableOpacity onPress={exportCSV} style={s.actionOutline}>
                <DownloadIcon size={12} color={primary} />
                <Text style={s.actionOutlineTxt}>CSV Export</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={exportPDF} style={s.actionOutline}>
                <DownloadIcon size={12} color={blue} />
                <Text style={s.actionOutlineTxt}>PDF Export</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.modalSubheading}>Dataset</Text>
            <View style={s.datasetTable}>
              {data.map((d) => (
                <View key={d.label} style={s.datasetRow}>
                  <Text style={s.datasetCellLabel}>{d.label}</Text>
                  <Text style={s.datasetCellValue}>
                    {d.value > 100 ? rupee(d.value) : d.value}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function CustomerAnalyticsScreen() {
  const { id, name, email, phone } = useLocalSearchParams<{
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
  }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { isMobile, isTablet, isDesktop, isWide } = useLayout(width);
  const px = isMobile ? 12 : isTablet ? 18 : 24;

  const customerId = id ?? "0";
  const [analytics, setAnalytics] = useState<CustomerAnalyticsUi | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    const numericId = Number(customerId);
    if (!numericId || Number.isNaN(numericId)) {
      setLoadError("Invalid customer id");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const raw = await fetchCustomerAnalytics(numericId);
      setAnalytics(mapApiAnalyticsToUi(raw));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load analytics");
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const customerName = analytics?.customer.name || name || "Customer";

  const customerEmail = useMemo(() => {
    const fromApi = analytics?.customer.email;
    if (fromApi && fromApi !== "—") return fromApi;
    if (email && email !== "—" && email !== "") return email;
    return "—";
  }, [analytics?.customer.email, email]);

  const customerPhone = useMemo(() => {
    const fromApi = analytics?.customer.phone;
    if (fromApi && fromApi !== "—") return fromApi;
    if (phone && phone !== "—" && phone !== "") return phone;
    return "—";
  }, [analytics?.customer.phone, phone]);

  const handleEmailPress = useCallback(() => {
    if (Platform.OS === 'web' && typeof window !== "undefined") {
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(customerEmail)}`, '_blank');
    } else {
      Linking.openURL(`mailto:${customerEmail}`).catch(err =>
        console.error("Failed to open mail client:", err)
      );
    }
  }, [customerEmail]);

  const data = analytics;

  // Timeframe states for charts
  const [spendTF, setSpendTF] = useState<TimeFrame>("All");
  const [ordersTF, setOrdersTF] = useState<TimeFrame>("All");
  const [freqTF, setFreqTF] = useState<TimeFrame>("All");
  const [distTF, setDistTF] = useState<TimeFrame>("All");
  const [statusTF, setStatusTF] = useState<TimeFrame>("All");
  const [paymentTF, setPaymentTF] = useState<TimeFrame>("All");
  const [categoryTF, setCategoryTF] = useState<TimeFrame>("All");

  const spendData = useMemo(() => {
    if (!data) return [];
    return getFilteredData(data.monthlySpend, spendTF, "spend");
  }, [data, spendTF]);

  const ordersData = useMemo(() => {
    if (!data) return [];
    return getFilteredData(data.monthlyOrders, ordersTF, "orders");
  }, [data, ordersTF]);

  const freqData = useMemo(() => {
    if (!data) return [];
    return getFilteredData(data.orderFrequency, freqTF, "freq");
  }, [data, freqTF]);

  const distData = useMemo(() => {
    if (!data) return [];
    return getFilteredData(data.purchaseTime, distTF, "time");
  }, [data, distTF]);

  // Legend toggle state
  const [hiddenStatusLabels, setHiddenStatusLabels] = useState<Set<string>>(new Set());
  const [hiddenPaymentLabels, setHiddenPaymentLabels] = useState<Set<string>>(new Set());
  const [hiddenCategoryLabels, setHiddenCategoryLabels] = useState<Set<string>>(new Set());

  const scaledOrderStatus = useMemo(() => {
    if (!data) return [];
    return getFilteredCategoricalData(data.orderStatusBreakdown, statusTF);
  }, [data, statusTF]);

  const activeOrderStatus = useMemo(() => {
    return scaledOrderStatus.filter(item => !hiddenStatusLabels.has(item.label));
  }, [scaledOrderStatus, hiddenStatusLabels]);

  const scaledPaymentMethods = useMemo(() => {
    if (!data) return [];
    return getFilteredCategoricalData(data.paymentMethods, paymentTF);
  }, [data, paymentTF]);

  const activePaymentMethods = useMemo(() => {
    return scaledPaymentMethods.filter(item => !hiddenPaymentLabels.has(item.label));
  }, [scaledPaymentMethods, hiddenPaymentLabels]);

  const filteredCategories = useMemo(() => {
    if (!data) return [];
    return getFilteredCategoricalData(data.categories, categoryTF);
  }, [data, categoryTF]);

  const categorySlices = useMemo(() => {
    const slices = filteredCategories.map((c, idx) => ({
      label: c.label,
      value: c.value,
      color: CHART_COLORS[idx % CHART_COLORS.length],
    }));
    return slices.filter(item => !hiddenCategoryLabels.has(item.label));
  }, [filteredCategories, hiddenCategoryLabels]);

  // Live KPI scrubbing displays
  const [spendLiveKPI, setSpendLiveKPI] = useState<string | null>(null);
  const [ordersLiveKPI, setOrdersLiveKPI] = useState<string | null>(null);
  const [freqLiveKPI, setFreqLiveKPI] = useState<string | null>(null);
  const [distLiveKPI, setDistLiveKPI] = useState<string | null>(null);

  // Fullscreen modals states
  const [fullscreenChartTitle, setFullscreenChartTitle] = useState<string | null>(null);
  const [fullscreenData, setFullscreenData] = useState<ChartPoint[]>([]);
  const [fullscreenRender, setFullscreenRender] = useState<((w: number, h: number) => React.ReactNode) | null>(null);

  // Drill-down Modal state
  const [drilldownPoint, setDrilldownPoint] = useState<ChartPoint | null>(null);
  const [drilldownTitle, setDrilldownTitle] = useState<string>("");

  // Grid responsiveness basis
  const kpiBasis = basisForColumns(isMobile ? 2 : isTablet ? 2 : (width < 1200 ? 2 : 4));
  const chartBasis = (isMobile || width < 1200) ? 100 : 48.5;
  const behaviourBasis = basisForColumns(isMobile ? 1 : isTablet ? 2 : (width < 1200 ? 2 : 4));
  const actionBasis = isMobile ? 50 : isTablet ? 31.5 : 23.5;

  // Sticky Section scroll logic
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Partial<Record<SectionId, number>>>({});
  const [activeSection, setActiveSection] = useState<SectionId>("overview");

  const SECTIONS: { id: SectionId; label: string; icon: React.ReactNode }[] = useMemo(
    () => [
      { id: "overview", label: "Overview", icon: <BarChartFillIcon size={13} /> },
      { id: "analytics", label: "Analytics", icon: <GraphUpIcon size={13} /> },
      { id: "behaviour", label: "Behaviour", icon: <PersonIcon size={13} /> },
      { id: "payments", label: "Payments", icon: <CreditCardIcon size={13} /> },
      { id: "returns", label: "Returns", icon: <ReplyIcon size={13} /> },
      { id: "orders", label: "Orders", icon: <BagIcon size={13} /> },
      { id: "timeline", label: "Timeline", icon: <ActivityIcon size={13} /> },
      { id: "profile", label: "Profile", icon: <ShieldIcon size={13} /> },
    ],
    [],
  );

  const handleMeasure = useCallback((id: SectionId, y: number) => {
    sectionOffsets.current[id] = y;
  }, []);

  const handleSelectSection = useCallback((id: SectionId) => {
    const y = sectionOffsets.current[id] ?? 0;
    setActiveSection(id);
    scrollRef.current?.scrollTo({
      y: Math.max(y - STICKY_NAV_HEIGHT - 10, 0),
      animated: true,
    });
  }, []);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const threshold = y + STICKY_NAV_HEIGHT + 24;
      let current: SectionId = SECTIONS[0].id;
      for (const sec of SECTIONS) {
        const offset = sectionOffsets.current[sec.id];
        if (offset !== undefined && offset <= threshold) current = sec.id;
      }
      setActiveSection((prev) => (prev === current ? prev : current));
    },
    [SECTIONS],
  );

  // Dynamic status-based KPI definitions
  const kpis = useMemo(
    () => {
      if (!data) return [];
      const spendTrend = parseTrendValue(data.trends.spendTrend);
      const ordersTrend = parseTrendValue(data.trends.ordersTrend);
      return [
      {
        icon: <WalletIcon color={primary} size={18} />,
        iconBg: primaryLight,
        title: "Lifetime Spend",
        value: spendLiveKPI ? spendLiveKPI : rupee(data.lifetimeSpend),
        sub: spendLiveKPI ? "Live Hover Value" : "All-time total",
        trend: spendTrend,
        trendVal: data.trends.spendTrend,
      },
      {
        icon: <BagIcon color={navy} size={18} />,
        iconBg: "rgba(30,43,107,0.08)",
        title: "Total Orders",
        value: ordersLiveKPI ? ordersLiveKPI : String(data.totalOrders),
        sub: ordersLiveKPI ? "Live Hover Value" : "All-time orders",
        trend: ordersTrend,
        trendVal: data.trends.ordersTrend,
      },
      {
        icon: <CartIcon color={blue} size={18} />,
        iconBg: blueLight,
        title: "Average Order Value",
        value: rupee(data.avgOrderValue),
        sub: "Per order",
        trend: "flat" as Trend,
        trendVal: "0%",
      },
      {
        icon: <CheckCircleIcon color={green} size={18} />,
        iconBg: activeLight,
        title: "Delivered Orders",
        value: String(data.delivered),
        sub: "Successfully delivered",
        trend: "up" as Trend,
        trendVal: "+6%",
      },
      {
        icon: <ClockIcon color={yellow} size={18} />,
        iconBg: yellowLight,
        title: "Processing Orders",
        value: String(data.processing),
        sub: "Currently in progress",
        trend: "flat" as Trend,
        trendVal: "0",
      },
      {
        icon: <BanIcon color={red} size={18} />,
        iconBg: inactiveLight,
        title: "Cancelled Orders",
        value: String(data.cancelled),
        sub: "Cancelled by customer",
        trend: "down" as Trend,
        trendVal: "-2%",
      },
      {
        icon: <ReplyIcon color={purple} size={18} />,
        iconBg: purpleLight,
        title: "Returned Orders",
        value: String(data.returned),
        sub: "Returned items",
        trend: "down" as Trend,
        trendVal: "-1%",
      },
      {
        icon: <WalletIcon color={red} size={18} />,
        iconBg: inactiveLight,
        title: "Refund Amount",
        value: rupee(data.refundAmount),
        sub: "Total refunded",
        trend: "down" as Trend,
        trendVal: "-3%",
      },
    ];
    },
    [data, spendLiveKPI, ordersLiveKPI],
  );

  const initials = useMemo(
    () =>
      customerName
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
    [customerName],
  );

  // Time filter rendering
  const renderTimeFilters = (current: TimeFrame, setFilter: (tf: TimeFrame) => void) => (
    <View style={s.tfRow}>
      {(["7D", "30D", "90D", "6M", "1Y", "All"] as TimeFrame[]).map((tf) => (
        <TouchableOpacity
          key={tf}
          onPress={() => setFilter(tf)}
          style={[s.tfBtn, current === tf && s.tfBtnActive]}
        >
          <Text style={[s.tfBtnTxt, current === tf && s.tfBtnTxtActive]}>{tf}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return (
      <AdminLayout>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40 }}>
          <ActivityIndicator size="large" color={primary} />
          <Text style={{ marginTop: 12, color: sub }}>Loading customer analytics…</Text>
        </View>
      </AdminLayout>
    );
  }

  if (loadError || !data) {
    return (
      <AdminLayout>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 }}>
          <Text style={{ color: red, fontWeight: "700" }}>{loadError ?? "No analytics data"}</Text>
          <TouchableOpacity onPress={loadAnalytics} style={[s.tfBtn, s.tfBtnActive]}>
            <Text style={[s.tfBtnTxt, s.tfBtnTxtActive]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <StatusBar barStyle="light-content" backgroundColor={navyDeep} />
      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={isMobile ? [] : [1]}
        onScroll={handleScroll}
        scrollEventThrottle={32}
      >
        {/* ══ HERO SECTION ════════════════════════════════════════════════ */}
        <View style={s.heroOuter}>
          <LinearGradient
            colors={[C.navyDeep, C.navy, C.navyLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              s.header,
              {
                paddingTop: Platform.OS === "ios" ? 40 : 16,
                marginTop: isMobile ? 12 : 18,
              },
            ]}
          >
            <View style={s.headerTop}>
              <TouchableOpacity
                style={s.backBtn}
                onPress={() => router.back()}
                activeOpacity={0.8}
              >
                <BackIcon size={18} />
              </TouchableOpacity>
              <Text style={s.headerCrumb}>Customer Analytics Suite</Text>
            </View>

            <View style={[s.headerProfile, !isWide && { flexDirection: "column", alignItems: "flex-start" }]}>
              <View style={s.headerProfileLeft}>
                <View style={[s.avatar, { backgroundColor: avatarColor(customerName) }]}>
                  <Text style={s.avatarTxt}>{initials}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={s.nameRow}>
                    <Text style={s.headerName} numberOfLines={1}>
                      {customerName}
                    </Text>
                  </View>
                  <Text style={s.headerSub}>
                    Customer ID #{customerId} &middot; Status: {data.status}
                  </Text>
                  <View style={s.headerMetaRow}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={handleEmailPress}
                      style={s.headerMetaItem}
                    >
                      <EnvelopeIcon size={11} color="rgba(255,255,255,0.7)" />
                      <Text style={s.headerMetaTxt} numberOfLines={1}>{customerEmail}</Text>
                    </TouchableOpacity>
                    {Platform.OS !== "web" && customerPhone !== "—" && (
                      <View style={s.headerMetaItem}>
                        <PhoneIcon size={11} color="rgba(255,255,255,0.7)" />
                        <Text style={s.headerMetaTxt}>{customerPhone}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              <View style={[s.headerRight, !isWide && { width: "100%", marginTop: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
                <View style={[s.healthBox, !isWide && { alignItems: "flex-start" }]}>
                  <Text style={s.healthLabel}>Account Health</Text>
                  <Text
                    style={[
                      s.healthVal,
                      {
                        color:
                          data.healthScore > 75
                            ? green
                            : data.healthScore > 50
                              ? "#F59E0B"
                              : red,
                      },
                    ]}
                  >
                    {data.healthScore}%
                  </Text>
                </View>
                <View style={s.quickActions}>
                  {Platform.OS !== 'web' && (
                    <TouchableOpacity
                      style={s.quickBtn}
                      activeOpacity={0.8}
                      onPress={() => Linking.openURL('tel:' + customerPhone)}
                    >
                      <PhoneIcon size={13} color="#fff" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={s.quickBtn}
                    activeOpacity={0.8}
                    onPress={handleEmailPress}
                  >
                    <EnvelopeIcon size={13} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.quickBtnWide}
                    activeOpacity={0.8}
                    onPress={() =>
                      router.push({
                        pathname: "/customerDetails",
                        params: { id: customerId },
                      })
                    }
                  >
                    <BagIcon size={13} color="#fff" />
                    <Text style={s.quickBtnTxt}>View Orders</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={[s.headerFootRow, isMobile && { flexWrap: "wrap" }]}>
              <View style={s.headerFootItem}>
                <CalendarIcon size={12} color="rgba(255,255,255,0.7)" />
                <Text style={s.headerFootTxt}>Customer Since: {data.customerSince}</Text>
              </View>
              <View style={s.headerFootItem}>
                <ClockIcon size={12} color="rgba(255,255,255,0.7)" />
                <Text style={s.headerFootTxt}>Last Purchase: {data.lastPurchase}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* ══ STICKY NAVIGATION BAR ═════════════════════════════════════ */}
        <SectionNav
          sections={SECTIONS}
          activeId={activeSection}
          onSelect={handleSelectSection}
        />

        {/* ══ DASHBOARD BODY CONTAINER ══════════════════════════════════ */}
        <View style={[s.body, { maxWidth: 1600, alignSelf: "center", width: "100%", paddingHorizontal: px }]}>
          
          {/* ══ KPI OVERVIEW GRID ═════════════════════════════════════════ */}
          <PageSection id="overview" onMeasure={handleMeasure}>
            <View style={[s.kpiGrid, { gap: 12 }]}>
              {kpis.map((k) => (
                <KpiCard key={k.title} {...k} basisPct={kpiBasis} />
              ))}
            </View>
          </PageSection>

          {/* ══ ANALYTICS CHARTS ══════════════════════════════════════════ */}
          <PageSection id="analytics" onMeasure={handleMeasure}>
            <View style={{ gap: 16 }}>
              {/* Time Series Charts Grid */}
              <View style={[s.chartGrid, { gap: 16 }]}>
                {/* Spending Line Chart */}
                <Card style={{ flexBasis: `${chartBasis}%` as const, minWidth: 280 }}>
                  <SectionHeader
                    icon={<GraphUpIcon color={primary} size={16} />}
                    title="Spending Trend"
                    right={
                      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                        <TouchableOpacity
                          onPress={() => {
                            setFullscreenChartTitle("Monthly Spending Trend");
                            setFullscreenData(spendData);
                            setFullscreenRender(() => (w: number, h: number) => (
                              <LineChartSvg
                                data={spendData}
                                color={primary}
                                width={w}
                                height={h}
                                formatValue={rupee}
                                metricName="Revenue"
                                timeframe={spendTF}
                                onPointPress={(p) => {
                                  setDrilldownPoint(p);
                                  setDrilldownTitle("Monthly Spending");
                                }}
                              />
                            ));
                          }}
                        >
                          <MaximizeIcon size={14} color={C.textLight} />
                        </TouchableOpacity>
                      </View>
                    }
                  />
                  <View style={s.cardBody}>
                    {renderTimeFilters(spendTF, setSpendTF)}
                    <MeasuredChart
                      plotHeight={150}
                      render={(w, h) => (
                        <LineChartSvg
                          data={spendData}
                          color={primary}
                          width={w}
                          height={h}
                          formatValue={rupee}
                          onHoverValueChange={setSpendLiveKPI}
                          metricName="Revenue"
                          timeframe={spendTF}
                          onPointPress={(p) => {
                            setDrilldownPoint(p);
                            setDrilldownTitle("Monthly Spending");
                          }}
                        />
                      )}
                    />
                  </View>
                </Card>

                {/* Orders Bar Chart */}
                <Card style={{ flexBasis: `${chartBasis}%` as const, minWidth: 280 }}>
                  <SectionHeader
                    icon={<BarChartFillIcon color={blue} size={16} />}
                    title="Orders Placed"
                    right={
                      <TouchableOpacity
                        onPress={() => {
                          setFullscreenChartTitle("Orders Count");
                          setFullscreenData(ordersData);
                          setFullscreenRender(() => (w: number, h: number) => (
                            <BarChartSvg
                              data={ordersData}
                              color={blue}
                              width={w}
                              height={h}
                              formatValue={(v) => `${v.toLocaleString()} Orders`}
                              metricName="Orders"
                              timeframe={ordersTF}
                              onPointPress={(p) => {
                                setDrilldownPoint(p);
                                setDrilldownTitle("Orders Placed");
                              }}
                            />
                          ));
                        }}
                      >
                        <MaximizeIcon size={14} color={C.textLight} />
                      </TouchableOpacity>
                    }
                  />
                  <View style={s.cardBody}>
                    {renderTimeFilters(ordersTF, setOrdersTF)}
                    <MeasuredChart
                      plotHeight={150}
                      render={(w, h) => (
                        <BarChartSvg
                          data={ordersData}
                          color={blue}
                          width={w}
                          height={h}
                          formatValue={(v) => `${v.toLocaleString()} Orders`}
                          onHoverValueChange={setOrdersLiveKPI}
                          metricName="Orders"
                          timeframe={ordersTF}
                          onPointPress={(p) => {
                            setDrilldownPoint(p);
                            setDrilldownTitle("Orders Placed");
                          }}
                        />
                      )}
                    />
                  </View>
                </Card>

                {/* Frequency Line Chart */}
                <Card style={{ flexBasis: `${chartBasis}%` as const, minWidth: 280 }}>
                  <SectionHeader
                    icon={<GraphUpIcon color={green} size={16} />}
                    title="Order Frequency"
                    right={
                      <TouchableOpacity
                        onPress={() => {
                          setFullscreenChartTitle("Order Frequency");
                          setFullscreenData(freqData);
                          setFullscreenRender(() => (w: number, h: number) => (
                            <LineChartSvg
                              data={freqData}
                              color={green}
                              width={w}
                              height={h}
                              formatValue={(v) => `${v.toFixed(1)} orders/wk`}
                              metricName="Order Frequency"
                              timeframe={freqTF}
                              onPointPress={(p) => {
                                setDrilldownPoint(p);
                                setDrilldownTitle("Order Frequency");
                              }}
                            />
                          ));
                        }}
                      >
                        <MaximizeIcon size={14} color={C.textLight} />
                      </TouchableOpacity>
                    }
                  />
                  <View style={s.cardBody}>
                    {renderTimeFilters(freqTF, setFreqTF)}
                    <MeasuredChart
                      plotHeight={150}
                      render={(w, h) => (
                        <LineChartSvg
                          data={freqData}
                          color={green}
                          width={w}
                          height={h}
                          formatValue={(v) => `${v.toFixed(1)} orders/wk`}
                          onHoverValueChange={setFreqLiveKPI}
                          metricName="Order Frequency"
                          timeframe={freqTF}
                          onPointPress={(p) => {
                            setDrilldownPoint(p);
                            setDrilldownTitle("Order Frequency");
                          }}
                        />
                      )}
                    />
                  </View>
                </Card>

                {/* Distribution Bar Chart */}
                <Card style={{ flexBasis: `${chartBasis}%` as const, minWidth: 280 }}>
                  <SectionHeader
                    icon={<ClockIcon color={yellow} size={16} />}
                    title="Purchase Time Breakdown"
                    right={
                      <TouchableOpacity
                        onPress={() => {
                          setFullscreenChartTitle("Purchase Time");
                          setFullscreenData(distData);
                          setFullscreenRender(() => (w: number, h: number) => (
                            <BarChartSvg
                              data={distData}
                              color={yellow}
                              width={w}
                              height={h}
                              formatValue={(v) => `${v.toFixed(1)}% of orders`}
                              metricName="Purchase Time Breakdown"
                              timeframe={distTF}
                              onPointPress={(p) => {
                                setDrilldownPoint(p);
                                setDrilldownTitle("Purchase Time Distribution");
                              }}
                            />
                          ));
                        }}
                      >
                        <MaximizeIcon size={14} color={C.textLight} />
                      </TouchableOpacity>
                    }
                  />
                  <View style={s.cardBody}>
                    {renderTimeFilters(distTF, setDistTF)}
                    <MeasuredChart
                      plotHeight={150}
                      render={(w, h) => (
                        <BarChartSvg
                          data={distData}
                          color={yellow}
                          width={w}
                          height={h}
                          formatValue={(v) => `${v.toFixed(1)}% of orders`}
                          onHoverValueChange={setDistLiveKPI}
                          metricName="Purchase Time Breakdown"
                          timeframe={distTF}
                          onPointPress={(p) => {
                            setDrilldownPoint(p);
                            setDrilldownTitle("Purchase Time Distribution");
                          }}
                        />
                      )}
                    />
                  </View>
                </Card>
              </View>

              {/* Categorical Distribution Grid */}
              <View style={[s.chartGrid, { gap: 16 }]}>
                {/* Order Status Donut Chart */}
                <Card style={{ flexBasis: `${chartBasis}%` as const, minWidth: 280 }}>
                  <SectionHeader icon={<PieChartIcon color={purple} size={16} />} title="Order Status Distribution" />
                  <View style={[s.cardBody, s.ringCardBody]}>
                    <View style={{ width: "100%", marginBottom: 8 }}>
                      {renderTimeFilters(statusTF, setStatusTF)}
                    </View>
                    <RingChart data={activeOrderStatus} donut metricName="Order Status" unit="Orders" />
                    <View style={{ flex: 1, width: "100%", minWidth: 140 }}>
                      <LegendList
                        data={scaledOrderStatus}
                        hiddenLabels={hiddenStatusLabels}
                        onToggleLabel={(lbl) => {
                          setHiddenStatusLabels((prev) => {
                            const copy = new Set(prev);
                            if (copy.has(lbl)) copy.delete(lbl);
                            else copy.add(lbl);
                            return copy;
                          });
                        }}
                      />
                    </View>
                  </View>
                </Card>

                {/* Payment Methods Donut Chart */}
                <Card style={{ flexBasis: `${chartBasis}%` as const, minWidth: 280 }}>
                  <SectionHeader icon={<CreditCardIcon color={navy} size={16} />} title="Preferred Payment Methods" />
                  <View style={[s.cardBody, s.ringCardBody]}>
                    <View style={{ width: "100%", marginBottom: 8 }}>
                      {renderTimeFilters(paymentTF, setPaymentTF)}
                    </View>
                    <RingChart data={activePaymentMethods} donut metricName="Payment Method" unit="Orders" />
                    <View style={{ flex: 1, width: "100%", minWidth: 140 }}>
                      <LegendList
                        data={scaledPaymentMethods}
                        hiddenLabels={hiddenPaymentLabels}
                        onToggleLabel={(lbl) => {
                          setHiddenPaymentLabels((prev) => {
                            const copy = new Set(prev);
                            if (copy.has(lbl)) copy.delete(lbl);
                            else copy.add(lbl);
                            return copy;
                          });
                        }}
                      />
                    </View>
                  </View>
                </Card>

                {/* Purchase Categories Donut Chart */}
                <Card style={{ flexBasis: `${chartBasis}%` as const, minWidth: 280 }}>
                  <SectionHeader icon={<PieChartIcon color={teal} size={16} />} title="Purchase Categories" />
                  <View style={[s.cardBody, s.ringCardBody, { paddingVertical: 16 }]}>
                    <View style={{ width: "100%", marginBottom: 8 }}>
                      {renderTimeFilters(categoryTF, setCategoryTF)}
                    </View>
                    <RingChart data={categorySlices} donut metricName="Categories" unit="Orders" />
                    <View style={{ flex: 1, width: "100%", minWidth: 140 }}>
                      <LegendList
                        data={categorySlices}
                        hiddenLabels={hiddenCategoryLabels}
                        onToggleLabel={(lbl) => {
                          setHiddenCategoryLabels((prev) => {
                            const copy = new Set(prev);
                            if (copy.has(lbl)) copy.delete(lbl);
                            else copy.add(lbl);
                            return copy;
                          });
                        }}
                      />
                    </View>
                  </View>
                </Card>

                {/* Most Purchased Categories List */}
                <Card style={{ flexBasis: `${chartBasis}%` as const, minWidth: 280 }}>
                  <SectionHeader icon={<TagIcon color={pink} size={16} />} title="Most Purchased Categories" />
                  <View style={[s.cardBody, { paddingVertical: 16 }]}>
                    {renderTimeFilters(categoryTF, setCategoryTF)}
                    <View style={{ marginTop: 12 }}>
                      <BarList
                        data={filteredCategories}
                        onRowPress={(p) => {
                          setDrilldownPoint(p);
                          setDrilldownTitle("Category Purchases");
                        }}
                      />
                    </View>
                  </View>
                </Card>
              </View>
            </View>
          </PageSection>

          {/* ══ CUSTOMER BEHAVIOUR ════════════════════════════════════════ */}
          <PageSection id="behaviour" onMeasure={handleMeasure}>
            <Card>
              <SectionHeader icon={<PersonIcon size={16} />} title="Customer Behaviour Metrics" />
              <View style={[s.cardBody, { flexDirection: "row", flexWrap: "wrap", gap: 12 }]}>
                {[
                  ["Most Purchased Category", data.behaviour.mostPurchasedCategory],
                  ["Favourite Brand", data.behaviour.favouriteBrand],
                  ["Average Basket Size", data.behaviour.avgBasketSize],
                  ["Most Active Shopping Day", data.behaviour.mostActiveDay],
                  ["Most Active Shopping Time", data.behaviour.mostActiveTime],
                  ["Average Delivery Time", data.behaviour.avgDeliveryTime],
                  ["Longest Purchase Gap", data.behaviour.longestGap],
                  ["Current Purchase Streak", data.behaviour.currentStreak],
                ].map(([label, value]) => (
                  <View key={label} style={{ flexBasis: `${behaviourBasis}%` as const, minWidth: 130 }}>
                    <StatPair label={label} value={value} />
                  </View>
                ))}
              </View>
            </Card>
          </PageSection>

          {/* ══ PAYMENTS DETAIL ═══════════════════════════════════════════ */}
          <PageSection id="payments" onMeasure={handleMeasure}>
            <Card>
              <SectionHeader icon={<CreditCardIcon size={16} />} title="Financial Transactions" />
              <View style={[s.cardBody, isWide && { flexDirection: "row", gap: 24 }]}>
                <View style={isWide ? { flex: 1, height: 140 } : null}>
                  <MiniStatTrio
                    style={isWide ? { height: "100%", justifyContent: "space-around" } : null}
                    items={[
                      {
                        label: "Success Rate",
                        value: data.paymentsData.successRate + "%",
                        color: green,
                      },
                      {
                        label: "Preferred Method",
                        value: data.paymentsData.preferredMethod,
                      },
                      {
                        label: "Failed Payments",
                        value: String(data.paymentsData.failedPayments),
                        color: data.paymentsData.failedPayments > 0 ? red : green,
                      },
                    ]}
                  />
                </View>
                <View style={isWide ? { flex: 1.2, height: 140 } : { marginTop: 16 }}>
                  <Text style={[s.subHeading, { marginTop: isWide ? 0 : 16, marginBottom: 6 }]}>Refund History</Text>
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    style={isWide ? { flex: 1 } : { maxHeight: 100 }}
                  >
                    <View style={{ gap: 8 }}>
                      {data.paymentsData.refundHistory.map((r, i) => (
                        <View key={i} style={s.listRow}>
                          <Text style={s.listRowMain} numberOfLines={1}>{r.reason}</Text>
                          <Text style={s.listRowSub}>{r.date}</Text>
                          <Text style={s.listRowAmt}>{rupee(r.amount)}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>
            </Card>
          </PageSection>

          {/* ══ RETURNS DETAIL ════════════════════════════════════════════ */}
          <PageSection id="returns" onMeasure={handleMeasure}>
            <Card>
              <SectionHeader icon={<ReplyIcon size={16} />} title="Returns Log" />
              <View style={s.cardBody}>
                <MiniStatTrio
                  items={[
                    {
                      label: "Return Rate",
                      value: data.returnsData.returnRate + "%",
                      color: red,
                    },
                    {
                      label: "Replacement Rate",
                      value: data.returnsData.replacementRate + "%",
                      color: purple,
                    },
                    {
                      label: "Refund Amount",
                      value: rupee(data.returnsData.refundAmount),
                    },
                  ]}
                />
                <Text style={s.subHeading}>Primary Return Reasons</Text>
                <BarList data={data.returnsData.reasons} />
              </View>
            </Card>
          </PageSection>

          {/* ══ RECENT ORDERS LIST ════════════════════════════════════════ */}
          <PageSection id="orders" onMeasure={handleMeasure}>
            <Card>
              <SectionHeader icon={<BagIcon size={16} />} title="Recent Customer Orders" />
              <View style={{ padding: 0 }}>
                {isDesktop ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator
                    style={{ width: "100%" }}
                    contentContainerStyle={{ flexGrow: 1 }}
                  >
                    <View style={[s.orderTable, { minWidth: 800, width: "100%" }]}>
                      <View style={[s.orderTableRow, s.orderTableHead]}>
                        <Text style={[s.orderTableHdr, { flex: 1.6 }]}>Order ID</Text>
                        <Text style={[s.orderTableHdr, { flex: 2.2 }]}>Product Name</Text>
                        <Text style={s.orderTableHdr}>Date</Text>
                        <Text style={s.orderTableHdr}>Amount</Text>
                        <Text style={[s.orderTableHdr, { flex: 1.2 }]}>Status</Text>
                        <Text style={s.orderTableHdr}>Payment</Text>
                        <Text style={[s.orderTableHdr, { flex: 0.6, textAlign: "center" }]}>Action</Text>
                      </View>
                      {data.recentOrders.map((o) => (
                        <View key={o.id} style={s.orderTableRow}>
                          <TouchableOpacity
                            activeOpacity={0.7}
                            style={{ flex: 1.6 }}
                            onPress={() => router.push({ pathname: "/orderDetails", params: { orderId: o.id } })}
                          >
                            <Text style={s.orderIdText} numberOfLines={1}>{o.orderNumber}</Text>
                          </TouchableOpacity>
                          <Text style={[s.orderTableCell, { flex: 2.2 }]} numberOfLines={1}>{o.productName}</Text>
                          <Text style={s.orderTableCell}>{o.date}</Text>
                          <Text style={[s.orderTableCell, { fontWeight: "700", color: text }]}>{rupee(o.amount)}</Text>
                          <View style={{ flex: 1.2 }}>
                            <OrderStatusChip status={o.status} />
                          </View>
                          <Text style={s.orderTableCell}>{o.payment}</Text>
                          <View style={{ flex: 0.6, alignItems: "center" }}>
                            <TouchableOpacity
                              style={s.eyeBtn}
                              activeOpacity={0.8}
                              onPress={() => router.push({ pathname: "/orderDetails", params: { orderId: o.id } })}
                            >
                              <EyeIcon size={14} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                ) : (
                  <View style={{ padding: 14, gap: 10 }}>
                    {data.recentOrders.map((o) => (
                      <TouchableOpacity
                        key={o.id}
                        activeOpacity={0.8}
                        style={s.orderMobileCard}
                        onPress={() => router.push({ pathname: "/orderDetails", params: { orderId: o.id } })}
                      >
                        <View style={s.omTop}>
                          <Text style={s.omId} numberOfLines={1}>{o.orderNumber}</Text>
                          <OrderStatusChip status={o.status} />
                        </View>
                        <View style={s.omRow}>
                          <Text style={{ fontSize: 13, fontWeight: "600", color: text }} numberOfLines={1}>
                            {o.productName}
                          </Text>
                        </View>
                        <View style={s.omRow}>
                          <Text style={s.omSub}>{o.date} &middot; {o.payment}</Text>
                          <Text style={s.omAmt}>{rupee(o.amount)}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </Card>
          </PageSection>

          {/* ══ ACTIVITY TIMELINE ═════════════════════════════════════════ */}
          <PageSection id="timeline" onMeasure={handleMeasure}>
            <Card>
              <SectionHeader icon={<ActivityIcon size={16} />} title="Historical Timeline" />
              <View style={s.cardBody}>
                {data.timeline.map((ev, i) => {
                  const cfg = TIMELINE_ICON_CFG[ev.type] ?? TIMELINE_ICON_CFG.order;
                  return (
                    <View key={i} style={s.tlRow}>
                      <View style={s.tlLeft}>
                        <View style={[s.tlIconBox, { backgroundColor: cfg.bg }]}>{cfg.icon}</View>
                        {i < data.timeline.length - 1 && <View style={s.tlLine} />}
                      </View>
                      <View style={s.tlContent}>
                        <Text style={s.tlTitle}>{ev.title}</Text>
                        <Text style={s.tlDate}>{ev.date}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </Card>
          </PageSection>

          {/* ══ CUSTOMER PROFILE CARD ═════════════════════════════════════ */}
          <PageSection id="profile" onMeasure={handleMeasure}>
            <Card>
              <SectionHeader icon={<ShieldIcon size={16} />} title="Customer Identity & Risk Profile" />
              <View style={s.cardBody}>
                <StatPair label="Primary shipping address" value={data.addressData.primary} />
                <View style={{ flexDirection: "row", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
                  <View style={{ flex: 1, minWidth: 140 }}>
                    <StatPair label="Saved Addresses" value={`${data.addressData.savedCount} locations`} />
                  </View>
                  <View style={{ flex: 1, minWidth: 140 }}>
                    <StatPair label="Most Delivered City" value={data.addressData.mostDelivered} />
                  </View>
                  <View style={{ flex: 1, minWidth: 140 }}>
                    <StatPair label="Loyalty Tier" value={data.loyaltyData.tier} />
                  </View>
                  <View style={{ flex: 1, minWidth: 140 }}>
                    <StatPair label="Loyalty Points" value={String(data.loyaltyData.points)} />
                  </View>
                </View>

                {/* Risk Badges */}
                <Text style={s.subHeading}>System Risk Analysis Indicators</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {data.riskBadges.map((b) => (
                    <Badge key={b.label} label={b.label} color={b.color} bg={b.bg} />
                  ))}
                </View>

                <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap", borderTopWidth: 1, borderTopColor: border, paddingTop: 14 }}>
                  <View style={{ flex: 1, minWidth: 130 }}>
                    <StatPair label="Feedback Rating" value={`${data.reviewsData.avgRating}★ (${data.reviewsData.submitted} reviews)`} />
                  </View>
                  <View style={{ flex: 1, minWidth: 130 }}>
                    <StatPair label="Pending Support Tickets" value={String(data.supportData.pending)} />
                  </View>
                  <View style={{ flex: 1, minWidth: 130 }}>
                    <StatPair label="Loyalty Savings" value={rupee(data.loyaltyData.lifetimeSavings)} />
                  </View>
                </View>
              </View>
            </Card>
          </PageSection>



          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* Interactive Drill Down Detail Modal */}
      <DrillDownModal
        visible={!!drilldownPoint}
        onClose={() => setDrilldownPoint(null)}
        title={drilldownTitle}
        dataPoint={drilldownPoint}
        customerId={customerId}
        customerName={customerName}
      />

      {/* Chart Fullscreen Viewer Modal */}
      <FullscreenChartModal
        visible={!!fullscreenChartTitle}
        onClose={() => {
          setFullscreenChartTitle(null);
          setFullscreenRender(null);
        }}
        title={fullscreenChartTitle ?? ""}
        data={fullscreenData}
        exportCSV={() => shareData(fullscreenChartTitle ?? "Chart", fullscreenData)}
        exportPDF={() => printDataPDF(fullscreenChartTitle ?? "Chart", fullscreenData, customerId)}
      >
        {fullscreenChartTitle && fullscreenRender && (
          <MeasuredChart
            plotHeight={280}
            render={(w, h) => fullscreenRender(w, h)}
          />
        )}
      </FullscreenChartModal>
    </AdminLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLESHEET
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: surface },
  scrollContent: { paddingTop: 0, backgroundColor: surface },
  body: { gap: 16, paddingTop: 16 },

  heroOuter: { width: "100%", alignSelf: "center", maxWidth: 1600, paddingHorizontal: 10 },
  header: { marginHorizontal: 2, marginTop: 12, paddingBottom: 20, borderRadius: 24, paddingHorizontal: 20 },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCrumb: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "700",
  },

  headerProfile: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  headerProfileLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  avatarTxt: { color: "#fff", fontWeight: "800", fontSize: 24 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  headerName: { color: "#fff", fontSize: 21, fontWeight: "800", flexShrink: 1 },
  vipBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F59E0B",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  vipTxt: { color: navyDeep, fontSize: 10, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 2 },
  headerMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 8,
  },
  headerMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "100%",
  },
  headerMetaTxt: { color: "rgba(255,255,255,0.85)", fontSize: 12 },

  headerRight: { alignItems: "flex-end", gap: 10 },
  healthBox: { alignItems: "flex-end" },
  healthLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "700",
  },
  healthVal: { fontSize: 22, fontWeight: "800", marginTop: 2 },
  quickActions: { flexDirection: "row", gap: 8 },
  quickBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  quickBtnWide: {
    height: 34,
    borderRadius: 9,
    backgroundColor: primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
  },
  quickBtnTxt: { color: "#fff", fontSize: 12, fontWeight: "700" },

  headerFootRow: {
    flexDirection: "row",
    gap: 20,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
  },
  headerFootItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerFootTxt: { color: "rgba(255,255,255,0.75)", fontSize: 11 },

  // Sticky horizontal nav
  navWrap: {
    backgroundColor: surface,
    borderBottomWidth: 1,
    borderBottomColor: border,
    height: STICKY_NAV_HEIGHT,
    justifyContent: "center",
    shadowColor: navyDeep,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  navScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  navTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 20,
    backgroundColor: cardBg,
    borderWidth: 1,
    borderColor: "transparent",
  },
  navTabActive: {
    backgroundColor: primaryLight,
    borderColor: C.orangeBorder,
  },
  navTabTxt: { fontSize: 12, fontWeight: "600", color: sub },
  navTabTxtActive: { color: primary, fontWeight: "800" },

  // KPI Grid
  kpiGrid: { flexDirection: "row", flexWrap: "wrap" },
  kpiCard: {
    backgroundColor: surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: border,
    padding: 16,
    gap: 6,
    minWidth: 130,
    shadowColor: navyDeep,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  kpiTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  kpiIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiValue: { fontSize: 19, fontWeight: "800", color: text, marginTop: 4 },
  kpiTitle: { fontSize: 12, fontWeight: "700", color: text },
  kpiSub: { fontSize: 11, color: sub },
  trendTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  trendTagTxt: { fontSize: 10, fontWeight: "700" },

  // Chart Grid
  chartGrid: { flexDirection: "row", flexWrap: "wrap" },
  card: {
    backgroundColor: surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: border,
    shadowColor: navyDeep,
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: cardBg,
    borderBottomWidth: 1,
    borderBottomColor: border,
  },
  sectionHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 9 },
  sectionIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: text },
  cardBody: { padding: 16 },
  subHeading: {
    fontSize: 12,
    fontWeight: "700",
    color: text,
    marginTop: 16,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  tfRow: { flexDirection: "row", gap: 6, marginBottom: 12, flexWrap: "wrap" },
  tfBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: cardBg },
  tfBtnActive: { backgroundColor: primary },
  tfBtnTxt: { fontSize: 11, fontWeight: "700", color: sub },
  tfBtnTxtActive: { color: "#fff" },

  statPair: { gap: 3 },
  statPairLbl: { fontSize: 11, color: sub },
  statPairVal: { fontSize: 13, fontWeight: "700", color: text },

  miniTrio: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: cardBg,
    borderRadius: 12,
    paddingVertical: 12,
  },
  miniTrioItem: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  miniTrioVal: { fontSize: 15, fontWeight: "800", color: text },
  miniTrioLbl: { fontSize: 10, color: sub, marginTop: 3, textAlign: "center" },
  miniTrioDiv: { width: 1, height: 28, backgroundColor: border },

  barListRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 2 },
  barListLbl: { width: 100, fontSize: 12, color: text },
  barListTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F0F1F5",
    overflow: "hidden",
  },
  barListFill: { height: "100%", borderRadius: 4 },
  barListVal: {
    width: 32,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "700",
    color: text,
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeTxt: { fontSize: 12, fontWeight: "700" },

  legendRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 2 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLbl: { flex: 1, fontSize: 12, color: text },
  legendVal: { fontSize: 12, fontWeight: "700", color: sub },

  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: cardBg,
    borderRadius: 10,
    padding: 10,
  },
  listRowMain: { flex: 1.4, fontSize: 12, color: text, fontWeight: "600" },
  listRowSub: { flex: 1, fontSize: 11, color: sub },
  listRowAmt: { fontSize: 12, fontWeight: "700", color: text },

  tlRow: { flexDirection: "row", gap: 12, minHeight: 56 },
  tlLeft: { alignItems: "center", width: 26 },
  tlIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tlLine: { flex: 1, width: 2, backgroundColor: border, marginTop: 4 },
  tlContent: { flex: 1, paddingBottom: 16 },
  tlTitle: { fontSize: 13, fontWeight: "600", color: text },
  tlDate: { fontSize: 11, color: sub, marginTop: 2 },

  insightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: cardBg,
    borderRadius: 10,
    padding: 12,
  },
  insightIconBox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: purpleLight,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  insightTxt: { flex: 1, fontSize: 13, color: text, lineHeight: 19 },

  actionCard: {
    alignItems: "center",
    gap: 8,
    backgroundColor: cardBg,
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: border,
  },
  actionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: text,
    textAlign: "center",
  },

  tooltipBubble: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    zIndex: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#1A2B5E",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 6,
  },
  tooltipMetricName: {
    fontSize: 9,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tooltipLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
    marginTop: 2,
  },
  tooltipValue: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 4,
  },
  tooltipPctChange: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },
  tooltipPctShare: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4B5563",
    marginTop: 3,
  },
  tooltipContribution: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4B5563",
    marginTop: 3,
  },

  axisRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  axisLabel: { fontSize: 10, color: sub, minWidth: 24 },

  ringCardBody: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 16,
    flexWrap: "wrap",
  },

  orderTable: { borderTopWidth: 1, borderTopColor: border },
  orderTableHead: { backgroundColor: cardBg },
  orderTableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: border,
  },
  orderTableHdr: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    color: sub,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  orderTableCell: { flex: 1, fontSize: 13, color: sub },
  orderIdText: { fontSize: 13, fontWeight: "700", color: primary },
  statusChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  statusChipTxt: { fontSize: 11, fontWeight: "700" },
  eyeBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: navy,
    alignItems: "center",
    justifyContent: "center",
  },

  orderMobileCard: {
    backgroundColor: cardBg,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  omTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  omId: {
    fontSize: 12,
    fontWeight: "700",
    color: primary,
    flex: 1,
    marginRight: 8,
  },
  omRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  omSub: { fontSize: 11, color: sub },
  omAmt: { fontSize: 13, fontWeight: "700", color: text },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    width: "100%",
    maxHeight: 500,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: border,
    backgroundColor: cardBg,
  },
  modalTitle: { fontSize: 16, fontWeight: "800", color: navyDeep },
  closeBtn: { padding: 8, backgroundColor: border, borderRadius: 8 },
  closeBtnTxt: { fontSize: 12, fontWeight: "700", color: text },
  modalBody: { padding: 20 },

  breakoutSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: cardBg,
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: border,
  },
  breakoutLbl: { fontSize: 11, color: sub },
  breakoutVal: { fontSize: 18, fontWeight: "800", color: navyDeep, marginTop: 4 },

  modalSubheading: { fontSize: 14, fontWeight: "700", color: text, marginBottom: 10, marginTop: 12 },
  breakoutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: border,
  },
  breakoutRowId: { fontSize: 13, fontWeight: "700", color: primary },
  breakoutRowSub: { fontSize: 11, color: sub, marginTop: 2 },
  breakoutRowAmt: { fontSize: 13, fontWeight: "800", color: text, marginBottom: 4 },

  fullscreenChartContainer: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: border,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  fullscreenActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  actionOutline: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: border,
    borderRadius: 10,
    paddingVertical: 12,
    backgroundColor: cardBg,
  },
  actionOutlineTxt: { fontSize: 12, fontWeight: "700", color: text },

  datasetTable: {
    borderWidth: 1,
    borderColor: border,
    borderRadius: 10,
    overflow: "hidden",
  },
  datasetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: border,
  },
  datasetCellLabel: { fontSize: 12, color: text },
  datasetCellValue: { fontSize: 12, fontWeight: "800", color: navyDeep },
});