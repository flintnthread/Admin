/**
 * customerAnalytics.tsx
 * 360° single-customer analytics dashboard (mock data only, no backend)
 * React Native + Expo + TypeScript
 * Bootstrap-style single-path SVG icons, hand-rolled SVG charts — no external libraries
 *
 * Enterprise dashboard layout (Shopify Admin / Stripe Dashboard inspired):
 *  - Customer Hero with avatar, identity, health score, quick actions
 *  - Sticky horizontal section navigation (RN-safe via stickyHeaderIndices,
 *    no position:"sticky" hacks) that scrolls the page to each section and
 *    tracks which section is currently in view
 *  - KPI grid: 1 col (mobile) / 2 col (tablet) / 4 col (desktop+), via
 *    numeric flexBasis + gap (NOT CSS calc()) so React Native's Yoga layout
 *    engine resolves rows correctly on every platform, including web.
 *  - Chart grid: 1 / 2 / 3 columns, same numeric-flexBasis + gap technique.
 *  - Line/bar charts measure their own rendered width (onLayout) and build a
 *    matching SVG viewBox, so stroke width, dot radius, and padding stay
 *    visually consistent at any container size instead of stretching/squashing.
 *  - Shared, memoized presentational primitives (Card, KPI, StatPair, etc.)
 *    keep the JSX in the screen body declarative and free of duplication.
 *
 * Theme: navy / orange palette, matching OrdersScreen.tsx and orderDetails.tsx.
 */

import AdminLayout from "@/components/admin-layout";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import {
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
} from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

// ─────────────────────────────────────────────────────────────────────────────
// PALETTE — matches OrdersScreen.tsx / orderDetails.tsx
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

// Semantic aliases so the body of the file reads cleanly while only ever
// pulling colors from the shared palette above.
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
// LAYOUT / RESPONSIVE BREAKPOINTS
// ─────────────────────────────────────────────────────────────────────────────
function useLayout(w: number) {
  return {
    isMobile: w < 480,
    isTablet: w >= 480 && w < 1024,
    isDesktop: w >= 1024,
    isWide: w >= 768,
  };
}

// Resolve a column count to a numeric flexBasis percentage. Deliberately a
// plain number (not a CSS calc() string) — React Native's Yoga layout engine
// resolves `gap` against the flex container natively on every platform
// (iOS / Android / web), so a numeric basis is both simpler and more portable
// than a calc() expression that only ever worked on react-native-web.
function basisForColumns(cols: number): number {
  switch (cols) {
    case 1:
      return 100;
    case 2:
      return 50;
    case 3:
      return 33.333;
    default:
      return 25;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function rupee(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return avatarPalette[Math.abs(h) % avatarPalette.length];
}
// Deterministic seeded PRNG so mock numbers stay stable for a given customer
// instead of reshuffling on every re-render.
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
// ICONS — Bootstrap-style single-path SVGs
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

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type Trend = "up" | "down" | "flat";
type ChartPoint = { label: string; value: number };
type SlicePoint = { label: string; value: number; color: string };
type RecentOrder = {
  id: string;
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
  | "address"
  | "reviews"
  | "support"
  | "timeline"
  | "risk"
  | "insights"
  | "actions"
  | "orders";

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA BUILDER — deterministic per customer, no backend calls
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
type CustomerAnalytics = ReturnType<typeof buildMockAnalytics>;

// ─────────────────────────────────────────────────────────────────────────────
// SHARED CARD / SECTION PIECES — memoized presentational primitives
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

// Numeric flexBasis (resolved by the caller via basisForColumns) + minWidth
// guarantees content never clips on very narrow phones while still wrapping
// cleanly into rows on tablet/desktop, all without a single calc() string.
const KpiCard = React.memo(function KpiCard({
  icon,
  iconBg,
  title,
  value,
  sub: subText,
  trend,
  trendVal,
  basisPct,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  value: string;
  sub: string;
  trend: Trend;
  trendVal: string;
  basisPct: number;
}) {
  return (
    <View style={[s.kpiCard, { flexBasis: `${basisPct}%` as const }]}>
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
    </View>
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
}: {
  items: { label: string; value: string; color?: string }[];
}) {
  return (
    <View style={s.miniTrio}>
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

const BarList = React.memo(function BarList({ data }: { data: ChartPoint[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={{ gap: 10 }}>
      {data.map((d, i) => (
        <View key={d.label} style={s.barListRow}>
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
        </View>
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
// RESPONSIVE CHART CONTAINER WITH LABELS + TOOLTIP
// Measures its own rendered width via onLayout so the SVG viewBox always
// matches the real pixel width (no stretch/squash at any breakpoint).
// Renders an axis-label row under the plot and supports a tap/hover tooltip
// that surfaces the exact value for a given point or bar.
// ─────────────────────────────────────────────────────────────────────────────
function MeasuredChart({
  plotHeight = 140,
  render,
}: {
  plotHeight?: number;
  render: (width: number, height: number) => React.ReactNode;
}) {
  const [w, setW] = useState(0);
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const next = Math.round(e.nativeEvent.layout.width);
      if (next > 0 && next !== w) setW(next);
    },
    [w],
  );
  // Narrow cards (3-col desktop grid) get a slightly shorter plot so
  // proportions stay natural instead of looking artificially tall.
  const effectivePlotHeight =
    w > 0 && w < 280 ? Math.max(100, plotHeight - 24) : plotHeight;
  return (
    <View onLayout={onLayout} style={{ width: "100%" }}>
      {w > 0 ? (
        render(w, effectivePlotHeight)
      ) : (
        <View style={{ height: effectivePlotHeight }} />
      )}
    </View>
  );
}

// Shared tooltip bubble: a small pill that floats above the active point/bar.
const ChartTooltip = React.memo(function ChartTooltip({
  x,
  plotWidth,
  label,
  value,
  color,
}: {
  x: number;
  plotWidth: number;
  label: string;
  value: string;
  color: string;
}) {
  const bubbleW = 88;
  const left = Math.min(Math.max(x - bubbleW / 2, 0), plotWidth - bubbleW);
  return (
    <View
      pointerEvents="none"
      style={[s.tooltipBubble, { left, width: bubbleW, borderColor: color }]}
    >
      <Text style={s.tooltipLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[s.tooltipValue, { color }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
});

function LineChartSvg({
  data,
  color = primary,
  width,
  height = 140,
  activeIdx,
  onActivate,
  formatValue,
}: {
  data: ChartPoint[];
  color?: string;
  width: number;
  height?: number;
  activeIdx: number | null;
  onActivate: (i: number | null) => void;
  formatValue: (v: number) => string;
}) {
  const padX = Math.max(8, width * 0.025);
  const padY = 14;
  const max = Math.max(...data.map((d) => d.value), 1);
  const step = (width - padX * 2) / Math.max(data.length - 1, 1);
  const pts = data.map((d, i) => ({
    x: padX + i * step,
    y: padY + (1 - d.value / max) * (height - padY * 2),
  }));
  const line = pts
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");
  const area =
    line +
    ` L ${pts[pts.length - 1].x} ${height - padY} L ${pts[0].x} ${height - padY} Z`;
  const dotR = Math.max(2.5, Math.min(3.5, width / 110));
  const activeDotR = dotR + 1.5;
  const strokeW = Math.max(1.8, Math.min(2.5, width / 160));
  const hitW = Math.max(step, 18);

  return (
    <View>
      <View style={{ width, height }}>
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <Path d={area} fill={color} fillOpacity={0.12} />
          <Path
            d={line}
            fill="none"
            stroke={color}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {pts.map((p, i) =>
            data[i].value > 0 ? (
              <Circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={activeIdx === i ? activeDotR : dotR}
                fill={color}
                stroke={activeIdx === i ? "#fff" : "none"}
                strokeWidth={activeIdx === i ? 2 : 0}
              />
            ) : null,
          )}
        </Svg>
        {/* Invisible tap targets, one per point, positioned to match the SVG coords */}
        <View style={StyleSheet.absoluteFillObject}>
          {pts.map((p, i) => (
            <Pressable
              key={i}
              onPress={() => onActivate(activeIdx === i ? null : i)}
              style={{
                position: "absolute",
                left: p.x - hitW / 2,
                top: 0,
                width: hitW,
                height,
              }}
            />
          ))}
        </View>
        {activeIdx !== null && (
          <ChartTooltip
            x={pts[activeIdx].x}
            plotWidth={width}
            label={data[activeIdx].label}
            value={formatValue(data[activeIdx].value)}
            color={color}
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
  height = 140,
  activeIdx,
  onActivate,
  formatValue,
}: {
  data: ChartPoint[];
  color?: string;
  width: number;
  height?: number;
  activeIdx: number | null;
  onActivate: (i: number | null) => void;
  formatValue: (v: number) => string;
}) {
  const padX = Math.max(6, width * 0.02);
  const padY = 8;
  const max = Math.max(...data.map((d) => d.value), 1);
  const slot = (width - padX * 2) / data.length;
  const barW = Math.max(4, slot * 0.55);
  const bars = data.map((d, i) => {
    const h = Math.max(
      (d.value / max) * (height - padY * 2),
      d.value > 0 ? 3 : 0,
    );
    const x = padX + i * slot + (slot - barW) / 2;
    const y = height - padY - h;
    return { x, y, h, d };
  });

  return (
    <View>
      <View style={{ width, height }}>
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          {bars.map((b, i) => (
            <Rect
              key={i}
              x={b.x}
              y={b.y}
              width={barW}
              height={b.h}
              rx={3}
              fill={color}
              opacity={activeIdx === i ? 1 : 0.55 + 0.45 * (b.d.value / max)}
            />
          ))}
        </Svg>
        <View style={StyleSheet.absoluteFillObject}>
          {bars.map((b, i) => (
            <Pressable
              key={i}
              onPress={() => onActivate(activeIdx === i ? null : i)}
              style={{
                position: "absolute",
                left: padX + i * slot,
                top: 0,
                width: slot,
                height,
              }}
            />
          ))}
        </View>
        {activeIdx !== null && (
          <ChartTooltip
            x={bars[activeIdx].x + barW / 2}
            plotWidth={width}
            label={data[activeIdx].label}
            value={formatValue(data[activeIdx].value)}
            color={color}
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

function MiniLineChart({
  data,
  color = primary,
  plotHeight = 140,
  formatValue = (v: number) => String(v),
}: {
  data: ChartPoint[];
  color?: string;
  plotHeight?: number;
  formatValue?: (v: number) => string;
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  return (
    <MeasuredChart
      plotHeight={plotHeight}
      render={(w, h) => (
        <LineChartSvg
          data={data}
          color={color}
          width={w}
          height={h}
          activeIdx={activeIdx}
          onActivate={setActiveIdx}
          formatValue={formatValue}
        />
      )}
    />
  );
}
function MiniBarChart({
  data,
  color = primary,
  plotHeight = 140,
  formatValue = (v: number) => String(v),
}: {
  data: ChartPoint[];
  color?: string;
  plotHeight?: number;
  formatValue?: (v: number) => string;
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  return (
    <MeasuredChart
      plotHeight={plotHeight}
      render={(w, h) => (
        <BarChartSvg
          data={data}
          color={color}
          width={w}
          height={h}
          activeIdx={activeIdx}
          onActivate={setActiveIdx}
          formatValue={formatValue}
        />
      )}
    />
  );
}

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
}: {
  data: SlicePoint[];
  donut?: boolean;
  size?: number;
}) {
  const total = Math.max(
    data.reduce((sum, d) => sum + d.value, 0),
    1,
  );
  const cx = size / 2,
    cy = size / 2,
    rOuter = size / 2 - 4,
    rInner = donut ? rOuter * 0.55 : 0;
  let angle = 0;
  const slices = data.map((d) => {
    const sweep = (d.value / total) * 360;
    const gap = sweep < 359 ? 1.5 : 0;
    const path = donutSlicePath(
      cx,
      cy,
      rOuter,
      rInner,
      angle,
      angle + sweep - gap,
    );
    angle += sweep;
    return { path, color: d.color };
  });
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((sl, i) => (
        <Path key={i} d={sl.path} fill={sl.color} />
      ))}
    </Svg>
  );
});
const LegendList = React.memo(function LegendList({
  data,
}: {
  data: SlicePoint[];
}) {
  const total = Math.max(
    data.reduce((sum, d) => sum + d.value, 0),
    1,
  );
  return (
    <View style={{ gap: 8, width: "100%" }}>
      {data.map((d) => (
        <View key={d.label} style={s.legendRow}>
          <View style={[s.legendDot, { backgroundColor: d.color }]} />
          <Text style={s.legendLbl} numberOfLines={1}>
            {d.label}
          </Text>
          <Text style={s.legendVal}>
            {Math.round((d.value / total) * 100)}%
          </Text>
        </View>
      ))}
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// ORDER STATUS CHIP / TIMELINE / ACTION ICON LOOKUPS
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
// SECTION WRAPPER — reports its own vertical offset so the sticky nav can
// scroll to it and so the scroll handler can detect which section is active.
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

// ─────────────────────────────────────────────────────────────────────────────
// STICKY HORIZONTAL SECTION NAVIGATION
// Implemented with React Native's native `stickyHeaderIndices` prop on the
// page ScrollView (works on iOS, Android, and web — no position:"sticky"
// hacks required). Tapping a tab smooth-scrolls the page to that section;
// the active tab is derived from the current scroll offset.
// ─────────────────────────────────────────────────────────────────────────────
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
              <Text
                style={[s.navTabTxt, isActive && s.navTabTxtActive]}
                numberOfLines={1}
              >
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
// MAIN SCREEN
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
  const px = isMobile ? 14 : isTablet ? 20 : 28;

  const customerId = id ?? "0";
  const customerName = name ?? "Customer";
  const customerEmail = email ?? "—";
  const customerPhone = phone ?? "—";

  const data: CustomerAnalytics = useMemo(
    () => buildMockAnalytics(customerId, customerName),
    [customerId, customerName],
  );

  // 1 / 2 / 4 column KPI grid via numeric flexBasis (no calc()).
  const kpiCols = isMobile ? 1 : isTablet ? 2 : 4;
  const kpiBasis = basisForColumns(kpiCols);

  // Chart grid: 1 col mobile / 2 col tablet / 3 col desktop+, same technique.
  const chartCols = isMobile ? 1 : isTablet ? 2 : 3;
  const chartBasis = basisForColumns(chartCols);

  const behaviourCols = isMobile ? 1 : isTablet ? 2 : 4;
  const behaviourBasis = basisForColumns(behaviourCols);

  const actionBasis = isMobile ? 50 : isTablet ? 31.5 : 23.5;

  // ── Sticky section navigation: scroll-position tracking ────────────────
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Partial<Record<SectionId, number>>>({});
  const [activeSection, setActiveSection] = useState<SectionId>("overview");

  const SECTIONS: { id: SectionId; label: string; icon: React.ReactNode }[] =
    useMemo(
      () => [
        { id: "overview", label: "Overview", icon: <BarChartFillIcon size={13} /> },
        { id: "analytics", label: "Analytics", icon: <GraphUpIcon size={13} /> },
        { id: "behaviour", label: "Behaviour", icon: <PersonIcon size={13} /> },
        { id: "payments", label: "Payments", icon: <CreditCardIcon size={13} /> },
        { id: "returns", label: "Returns", icon: <ReplyIcon size={13} /> },
        { id: "address", label: "Address", icon: <MapPinIcon size={13} /> },
        { id: "reviews", label: "Reviews", icon: <StarFillIcon size={13} /> },
        { id: "support", label: "Support", icon: <TicketIcon size={13} /> },
        { id: "timeline", label: "Timeline", icon: <ActivityIcon size={13} /> },
        { id: "risk", label: "Risk", icon: <ShieldIcon size={13} /> },
        { id: "insights", label: "AI Insights", icon: <SparkleIcon size={13} /> },
        { id: "actions", label: "Actions", icon: <ArrowUpRightIcon size={13} color={primary} /> },
        { id: "orders", label: "Orders", icon: <BagIcon size={13} /> },
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

  const kpis: {
    icon: React.ReactNode;
    iconBg: string;
    title: string;
    value: string;
    sub: string;
    trend: Trend;
    trendVal: string;
  }[] = useMemo(
    () => [
      {
        icon: <WalletIcon color={primary} size={18} />,
        iconBg: primaryLight,
        title: "Lifetime Spend",
        value: rupee(data.lifetimeSpend),
        sub: "All-time total",
        trend: "up",
        trendVal: "+12%",
      },
      {
        icon: <BagIcon color={navy} size={18} />,
        iconBg: "rgba(30,43,107,0.08)",
        title: "Total Orders",
        value: String(data.totalOrders),
        sub: "All-time orders",
        trend: "up",
        trendVal: "+4",
      },
      {
        icon: <CartIcon color={blue} size={18} />,
        iconBg: blueLight,
        title: "Average Order Value",
        value: rupee(data.avgOrderValue),
        sub: "Per order",
        trend: "flat",
        trendVal: "0%",
      },
      {
        icon: <CheckCircleIcon color={green} size={18} />,
        iconBg: activeLight,
        title: "Delivered Orders",
        value: String(data.delivered),
        sub: "Successfully delivered",
        trend: "up",
        trendVal: "+6%",
      },
      {
        icon: <ClockIcon color={yellow} size={18} />,
        iconBg: yellowLight,
        title: "Processing Orders",
        value: String(data.processing),
        sub: "Currently in progress",
        trend: "flat",
        trendVal: "0",
      },
      {
        icon: <BanIcon color={red} size={18} />,
        iconBg: inactiveLight,
        title: "Cancelled Orders",
        value: String(data.cancelled),
        sub: "Cancelled by customer",
        trend: "down",
        trendVal: "-2%",
      },
      {
        icon: <ReplyIcon color={purple} size={18} />,
        iconBg: purpleLight,
        title: "Returned Orders",
        value: String(data.returned),
        sub: "Returned items",
        trend: "down",
        trendVal: "-1%",
      },
      {
        icon: <WalletIcon color={red} size={18} />,
        iconBg: inactiveLight,
        title: "Refund Amount",
        value: rupee(data.refundAmount),
        sub: "Total refunded",
        trend: "down",
        trendVal: "-3%",
      },
      {
        icon: <ActivityIcon color={primary} size={18} />,
        iconBg: primaryLight,
        title: "Purchase Frequency",
        value: data.behaviour.currentStreak,
        sub: "Current streak",
        trend: "up",
        trendVal: "+1",
      },
      {
        icon: <CalendarIcon color={navy} size={18} />,
        iconBg: "rgba(30,43,107,0.08)",
        title: "Last Order Date",
        value: data.lastPurchase,
        sub: "Most recent purchase",
        trend: "flat",
        trendVal: "—",
      },
    ],
    [data],
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

  const goToOrders = useCallback(
    () =>
      router.push({
        pathname: "/customerDetails",
        params: { id: customerId },
      }),
    [router, customerId],
  );

  return (
    <AdminLayout>
      <StatusBar barStyle="light-content" backgroundColor={navyDeep} />
      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        onScroll={handleScroll}
        scrollEventThrottle={32}
      >
        {/* ══ HERO ════════════════════════════════════════════════════════ */}
        <View
          style={{
            alignSelf: "center",
            width: "100%",
            maxWidth: 1600,
            paddingHorizontal: px,
            backgroundColor: surface,
          }}
        >
          <View
            style={[
              s.header,
              {
                paddingTop: Platform.OS === "ios" ? 50 : 16,
                marginTop: isMobile ? 12 : 18,
              },
            ]}
          >
            <View
              style={[s.headerTop, { paddingHorizontal: isMobile ? 16 : 22 }]}
            >
              <TouchableOpacity
                style={s.backBtn}
                onPress={() => router.back()}
                activeOpacity={0.8}
              >
                <BackIcon size={18} />
              </TouchableOpacity>
              <Text style={s.headerCrumb}>Customer Analytics</Text>
            </View>

            {/* Profile row stacks to a column below tablet width so the
                health box never squeezes against the identity block. */}
            <View
              style={[
                s.headerProfile,
                !isWide && {
                  flexDirection: "column",
                  alignItems: "flex-start",
                },
              ]}
            >
              <View style={s.headerProfileLeft}>
                <View
                  style={[
                    s.avatar,
                    { backgroundColor: avatarColor(customerName) },
                  ]}
                >
                  <Text style={s.avatarTxt}>{initials}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={s.nameRow}>
                    <Text style={s.headerName} numberOfLines={1}>
                      {customerName}
                    </Text>
                    {data.isVip && (
                      <View style={s.vipBadge}>
                        <CrownIcon size={11} color={navyDeep} />
                        <Text style={s.vipTxt}>VIP</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.headerSub}>
                    Customer #{customerId} · {data.status}
                  </Text>
                  <View style={s.headerMetaRow}>
                    <View style={s.headerMetaItem}>
                      <EnvelopeIcon size={11} color="rgba(255,255,255,0.65)" />
                      <Text style={s.headerMetaTxt} numberOfLines={1}>
                        {customerEmail}
                      </Text>
                    </View>
                    <View style={s.headerMetaItem}>
                      <PhoneIcon size={11} color="rgba(255,255,255,0.65)" />
                      <Text style={s.headerMetaTxt}>{customerPhone}</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View
                style={[
                  s.headerRight,
                  !isWide && {
                    width: "100%",
                    marginTop: 14,
                    alignItems: "flex-start",
                  },
                ]}
              >
                <View style={s.healthBox}>
                  <Text style={s.healthLabel}>Health Score</Text>
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
                    {data.healthScore}
                  </Text>
                </View>
                <View style={s.quickActions}>
                  <TouchableOpacity style={s.quickBtn} activeOpacity={0.8}>
                    <PhoneIcon size={13} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.quickBtn} activeOpacity={0.8}>
                    <EnvelopeIcon size={13} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.quickBtnWide}
                    activeOpacity={0.8}
                    onPress={goToOrders}
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
                <Text style={s.headerFootTxt}>
                  Customer since {data.customerSince}
                </Text>
              </View>
              <View style={s.headerFootItem}>
                <ClockIcon size={12} color="rgba(255,255,255,0.7)" />
                <Text style={s.headerFootTxt}>
                  Last purchase {data.lastPurchase}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ══ STICKY SECTION NAV (direct ScrollView child — index 1) ══════ */}
        <SectionNav
          sections={SECTIONS}
          activeId={activeSection}
          onSelect={handleSelectSection}
        />

        {/* ══ BODY ══════════════════════════════════════════════════════ */}
        <View
          style={[
            s.body,
            {
              maxWidth: 1600,
              alignSelf: "center",
              width: "100%",
              paddingHorizontal: px,
            },
          ]}
        >
          {/* ══ OVERVIEW — KPI GRID ═══════════════════════════════════════ */}
          <PageSection id="overview" onMeasure={handleMeasure}>
            <View style={[s.kpiGrid, { gap: 12 }]}>
              {kpis.map((k) => (
                <KpiCard key={k.title} {...k} basisPct={kpiBasis} />
              ))}
            </View>
          </PageSection>

          {/* ══ ANALYTICS — time series + distribution charts ════════════ */}
          <PageSection id="analytics" onMeasure={handleMeasure}>
            <View style={{ gap: 16 }}>
              <View style={[s.chartGrid, { gap: 16 }]}>
                <Card
                  style={{
                    flexBasis: `${chartBasis}%` as const,
                    minWidth: 260,
                  }}
                >
                  <SectionHeader
                    icon={<GraphUpIcon color={primary} size={16} />}
                    title="Monthly Spending Trend"
                  />
                  <View style={s.cardBody}>
                    <MiniLineChart
                      data={data.monthlySpend}
                      color={primary}
                      formatValue={(v) => rupee(v)}
                    />
                  </View>
                </Card>
                <Card
                  style={{
                    flexBasis: `${chartBasis}%` as const,
                    minWidth: 260,
                  }}
                >
                  <SectionHeader
                    icon={<BarChartFillIcon color={blue} size={16} />}
                    title="Monthly Orders"
                  />
                  <View style={s.cardBody}>
                    <MiniBarChart
                      data={data.monthlyOrders}
                      color={blue}
                      formatValue={(v) => `${v} order${v === 1 ? "" : "s"}`}
                    />
                  </View>
                </Card>
                <Card
                  style={{
                    flexBasis: `${chartBasis}%` as const,
                    minWidth: 260,
                  }}
                >
                  <SectionHeader
                    icon={<GraphUpIcon color={green} size={16} />}
                    title="Order Frequency"
                  />
                  <View style={s.cardBody}>
                    <MiniLineChart
                      data={data.orderFrequency}
                      color={green}
                      formatValue={(v) => `${v} order${v === 1 ? "" : "s"}`}
                    />
                  </View>
                </Card>
                <Card
                  style={{
                    flexBasis: `${chartBasis}%` as const,
                    minWidth: 260,
                  }}
                >
                  <SectionHeader
                    icon={<ClockIcon color={yellow} size={16} />}
                    title="Purchase Time Distribution"
                  />
                  <View style={s.cardBody}>
                    <MiniBarChart
                      data={data.purchaseTime}
                      color={yellow}
                      formatValue={(v) => `${v}%`}
                    />
                  </View>
                </Card>
              </View>

              <View style={[s.chartGrid, { gap: 16 }]}>
                <Card
                  style={{
                    flexBasis: `${chartBasis}%` as const,
                    minWidth: 260,
                  }}
                >
                  <SectionHeader
                    icon={<PieChartIcon color={purple} size={16} />}
                    title="Order Status"
                  />
                  <View style={[s.cardBody, s.ringCardBody]}>
                    <RingChart data={data.orderStatusBreakdown} donut />
                    <View style={{ flex: 1, width: "100%", minWidth: 140 }}>
                      <LegendList data={data.orderStatusBreakdown} />
                    </View>
                  </View>
                </Card>
                <Card
                  style={{
                    flexBasis: `${chartBasis}%` as const,
                    minWidth: 260,
                  }}
                >
                  <SectionHeader
                    icon={<CreditCardIcon color={navy} size={16} />}
                    title="Payment Method Distribution"
                  />
                  <View style={[s.cardBody, s.ringCardBody]}>
                    <RingChart data={data.paymentMethods} donut={false} />
                    <View style={{ flex: 1, width: "100%", minWidth: 140 }}>
                      <LegendList data={data.paymentMethods} />
                    </View>
                  </View>
                </Card>
                <Card
                  style={{
                    flexBasis: `${chartBasis}%` as const,
                    minWidth: 260,
                  }}
                >
                  <SectionHeader
                    icon={<TagIcon color={teal} size={16} />}
                    title="Purchase Categories"
                  />
                  <View style={[s.cardBody, s.ringCardBody]}>
                    <BarList data={data.categories} />
                  </View>
                </Card>
                <Card
                  style={{
                    flexBasis: `${chartBasis}%` as const,
                    minWidth: 260,
                  }}
                >
                  <SectionHeader
                    icon={<HeartIcon color={pink} size={16} />}
                    title="Favourite Brands"
                  />
                  <View style={[s.cardBody, s.ringCardBody]}>
                    <BarList data={data.brands} />
                  </View>
                </Card>
              </View>
            </View>
          </PageSection>

          {/* ══ BEHAVIOUR ═════════════════════════════════════════════════ */}
          <PageSection id="behaviour" onMeasure={handleMeasure}>
            <Card>
              <SectionHeader
                icon={<PersonIcon size={16} />}
                title="Customer Behaviour"
              />
              <View
                style={[
                  s.cardBody,
                  { flexDirection: "row", flexWrap: "wrap", gap: 12 },
                ]}
              >
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
                  <View
                    key={label}
                    style={{ flexBasis: `${behaviourBasis}%` as const, minWidth: 130 }}
                  >
                    <StatPair label={label} value={value} />
                  </View>
                ))}
              </View>
            </Card>
          </PageSection>

          {/* ══ PAYMENTS ═══════════════════════════════════════════════════ */}
          <PageSection id="payments" onMeasure={handleMeasure}>
            <Card>
              <SectionHeader
                icon={<CreditCardIcon size={16} />}
                title="Payments"
              />
              <View style={s.cardBody}>
                <MiniStatTrio
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
                <Text style={s.subHeading}>Refund History</Text>
                <View style={{ gap: 8 }}>
                  {data.paymentsData.refundHistory.map((r, i) => (
                    <View key={i} style={s.listRow}>
                      <Text style={s.listRowMain} numberOfLines={1}>
                        {r.reason}
                      </Text>
                      <Text style={s.listRowSub}>{r.date}</Text>
                      <Text style={s.listRowAmt}>{rupee(r.amount)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Card>
          </PageSection>

          {/* ══ RETURNS ════════════════════════════════════════════════════ */}
          <PageSection id="returns" onMeasure={handleMeasure}>
            <Card>
              <SectionHeader icon={<ReplyIcon size={16} />} title="Returns" />
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
                <Text style={s.subHeading}>Top Return Reasons</Text>
                <BarList data={data.returnsData.reasons} />
              </View>
            </Card>
          </PageSection>

          {/* ══ ADDRESS ════════════════════════════════════════════════════ */}
          <PageSection id="address" onMeasure={handleMeasure}>
            <Card>
              <SectionHeader icon={<MapPinIcon size={16} />} title="Address" />
              <View style={s.cardBody}>
                <StatPair
                  label="Primary Address"
                  value={data.addressData.primary}
                />
                <View
                  style={{
                    flexDirection: "row",
                    gap: 12,
                    marginTop: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <View style={{ flex: 1, minWidth: 140 }}>
                    <StatPair
                      label="Saved Addresses"
                      value={String(data.addressData.savedCount)}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 140 }}>
                    <StatPair
                      label="Most Delivered Location"
                      value={data.addressData.mostDelivered}
                    />
                  </View>
                </View>
                <Text style={s.subHeading}>Recent Delivery Locations</Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {data.addressData.recentLocations.map((loc, i) => (
                    <View key={i} style={s.chipOutline}>
                      <MapPinIcon size={11} />
                      <Text style={s.chipOutlineTxt}>{loc}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Card>
          </PageSection>

          {/* ══ REVIEWS ════════════════════════════════════════════════════ */}
          <PageSection id="reviews" onMeasure={handleMeasure}>
            <Card>
              <SectionHeader
                icon={<StarFillIcon size={16} />}
                title="Reviews"
              />
              <View style={s.cardBody}>
                <MiniStatTrio
                  items={[
                    {
                      label: "Reviews Submitted",
                      value: String(data.reviewsData.submitted),
                    },
                    {
                      label: "Avg Rating",
                      value: data.reviewsData.avgRating + "★",
                      color: "#F59E0B",
                    },
                    {
                      label: "Photo Reviews",
                      value: String(data.reviewsData.photoReviews),
                    },
                  ]}
                />
                <View style={{ marginTop: 14 }}>
                  <StatPair
                    label="Helpful Votes"
                    value={String(data.reviewsData.helpfulVotes)}
                  />
                </View>
              </View>
            </Card>
          </PageSection>

          {/* ══ SUPPORT ════════════════════════════════════════════════════ */}
          <PageSection id="support" onMeasure={handleMeasure}>
            <Card>
              <SectionHeader icon={<TicketIcon size={16} />} title="Support" />
              <View style={s.cardBody}>
                <MiniStatTrio
                  items={[
                    {
                      label: "Total Tickets",
                      value: String(data.supportData.tickets),
                    },
                    {
                      label: "Resolved",
                      value: String(data.supportData.resolved),
                      color: green,
                    },
                    {
                      label: "Pending",
                      value: String(data.supportData.pending),
                      color: data.supportData.pending > 0 ? "#F59E0B" : green,
                    },
                  ]}
                />
                <View
                  style={{
                    flexDirection: "row",
                    gap: 12,
                    marginTop: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <View style={{ flex: 1, minWidth: 160 }}>
                    <StatPair
                      label="Average Resolution Time"
                      value={data.supportData.avgResolutionTime}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 160 }}>
                    <StatPair
                      label="Latest Ticket"
                      value={data.supportData.latestTicket}
                    />
                  </View>
                </View>
              </View>
            </Card>
          </PageSection>

          {/* ══ ACTIVITY TIMELINE ═════════════════════════════════════════ */}
          <PageSection id="timeline" onMeasure={handleMeasure}>
            <Card>
              <SectionHeader
                icon={<ActivityIcon size={16} />}
                title="Activity Timeline"
              />
              <View style={s.cardBody}>
                {data.timeline.map((ev, i) => {
                  const cfg =
                    TIMELINE_ICON_CFG[ev.type] ?? TIMELINE_ICON_CFG.order;
                  return (
                    <View key={i} style={s.tlRow}>
                      <View style={s.tlLeft}>
                        <View
                          style={[s.tlIconBox, { backgroundColor: cfg.bg }]}
                        >
                          {cfg.icon}
                        </View>
                        {i < data.timeline.length - 1 && (
                          <View style={s.tlLine} />
                        )}
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

          {/* ══ RISK ANALYSIS ═════════════════════════════════════════════ */}
          <PageSection id="risk" onMeasure={handleMeasure}>
            <Card>
              <SectionHeader
                icon={<ShieldIcon size={16} />}
                title="Risk Analysis"
              />
              <View
                style={[
                  s.cardBody,
                  { flexDirection: "row", flexWrap: "wrap", gap: 8 },
                ]}
              >
                {data.riskBadges.map((b) => (
                  <Badge
                    key={b.label}
                    label={b.label}
                    color={b.color}
                    bg={b.bg}
                  />
                ))}
              </View>
            </Card>
          </PageSection>

          {/* ══ AI INSIGHTS ════════════════════════════════════════════════ */}
          <PageSection id="insights" onMeasure={handleMeasure}>
            <Card>
              <SectionHeader
                icon={<SparkleIcon size={16} />}
                title="AI Insights"
              />
              <View style={[s.cardBody, { gap: 10 }]}>
                {data.aiInsights.map((txt, i) => (
                  <View key={i} style={s.insightRow}>
                    <View style={s.insightIconBox}>
                      <SparkleIcon size={13} color={purple} />
                    </View>
                    <Text style={s.insightTxt}>{txt}</Text>
                  </View>
                ))}
              </View>
            </Card>
          </PageSection>

          {/* ══ RECOMMENDED ACTIONS ═══════════════════════════════════════ */}
          <PageSection id="actions" onMeasure={handleMeasure}>
            <Card>
              <SectionHeader
                icon={<ArrowUpRightIcon size={16} color={primary} />}
                title="Recommended Actions"
              />
              <View
                style={[
                  s.cardBody,
                  { flexDirection: "row", flexWrap: "wrap", gap: 10 },
                ]}
              >
                {data.recommendedActions.map((a) => (
                  <TouchableOpacity
                    key={a.label}
                    style={[
                      s.actionCard,
                      { flexBasis: `${actionBasis}%` as const, minWidth: 110 },
                    ]}
                    activeOpacity={0.85}
                  >
                    <View
                      style={[s.actionIconBox, { backgroundColor: a.color }]}
                    >
                      {ACTION_ICON_CFG[a.icon]}
                    </View>
                    <Text style={s.actionLabel}>{a.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
          </PageSection>

          {/* ══ RECENT ORDERS ══════════════════════════════════════════════ */}
          <PageSection id="orders" onMeasure={handleMeasure}>
            <Card>
              <SectionHeader
                icon={<BagIcon size={16} />}
                title="Recent Orders"
              />
              <View style={{ padding: 0 }}>
                {isDesktop ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator>
                    <View style={[s.orderTable, { minWidth: 720 }]}>
                      <View style={[s.orderTableRow, s.orderTableHead]}>
                        <Text style={[s.orderTableHdr, { flex: 1.6 }]}>
                          Order ID
                        </Text>
                        <Text style={s.orderTableHdr}>Date</Text>
                        <Text style={s.orderTableHdr}>Amount</Text>
                        <Text style={[s.orderTableHdr, { flex: 1.2 }]}>
                          Status
                        </Text>
                        <Text style={s.orderTableHdr}>Payment</Text>
                        <Text
                          style={[
                            s.orderTableHdr,
                            { flex: 0.6, textAlign: "center" },
                          ]}
                        >
                          Action
                        </Text>
                      </View>
                      {data.recentOrders.map((o) => (
                        <View key={o.id} style={s.orderTableRow}>
                          <Text
                            style={[s.orderIdText, { flex: 1.6 }]}
                            numberOfLines={1}
                          >
                            {o.id}
                          </Text>
                          <Text style={s.orderTableCell}>{o.date}</Text>
                          <Text
                            style={[
                              s.orderTableCell,
                              { fontWeight: "700", color: text },
                            ]}
                          >
                            {rupee(o.amount)}
                          </Text>
                          <View style={{ flex: 1.2 }}>
                            <OrderStatusChip status={o.status} />
                          </View>
                          <Text style={s.orderTableCell}>{o.payment}</Text>
                          <View style={{ flex: 0.6, alignItems: "center" }}>
                            <TouchableOpacity
                              style={s.eyeBtn}
                              activeOpacity={0.8}
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
                      <View key={o.id} style={s.orderMobileCard}>
                        <View style={s.omTop}>
                          <Text style={s.omId} numberOfLines={1}>
                            {o.id}
                          </Text>
                          <OrderStatusChip status={o.status} />
                        </View>
                        <View style={s.omRow}>
                          <Text style={s.omSub}>
                            {o.date} · {o.payment}
                          </Text>
                          <Text style={s.omAmt}>{rupee(o.amount)}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </Card>
          </PageSection>

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
  scroll: { flex: 1, backgroundColor: surface },
  scrollContent: { paddingTop: 0, backgroundColor: surface },
  body: { gap: 16, paddingTop: 16 },

  header: { backgroundColor: navy, paddingBottom: 26, borderRadius: 24 },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCrumb: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "600",
  },

  headerProfile: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 22,
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
  },
  avatarTxt: { color: "#fff", fontWeight: "700", fontSize: 22 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  headerName: { color: "#fff", fontSize: 19, fontWeight: "800", flexShrink: 1 },
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
  headerSub: { color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 2 },
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
  headerMetaTxt: { color: "rgba(255,255,255,0.75)", fontSize: 12 },

  headerRight: { alignItems: "flex-end", gap: 10 },
  healthBox: { alignItems: "flex-end" },
  healthLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  healthVal: { fontSize: 22, fontWeight: "800", marginTop: 2 },
  quickActions: { flexDirection: "row", gap: 8 },
  quickBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
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
    paddingHorizontal: 22,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
  },
  headerFootItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerFootTxt: { color: "rgba(255,255,255,0.7)", fontSize: 11 },

  // ── Sticky horizontal section nav ───────────────────────────────────────
  navWrap: {
    backgroundColor: surface,
    borderBottomWidth: 1,
    borderBottomColor: border,
    height: STICKY_NAV_HEIGHT,
    justifyContent: "center",
    shadowColor: navyDeep,
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
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

  // ── KPI grid (1 / 2 / 4 columns via numeric flexBasis) ──────────────────
  kpiGrid: { flexDirection: "row", flexWrap: "wrap" },
  kpiCard: {
    backgroundColor: surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: border,
    padding: 14,
    gap: 6,
    minWidth: 140,
    shadowColor: navyDeep,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
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
  kpiValue: { fontSize: 18, fontWeight: "800", color: text, marginTop: 4 },
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

  // ── Chart grid: 1 / 2 / 3 columns via numeric flexBasis ─────────────────
  chartGrid: { flexDirection: "row", flexWrap: "wrap" },
  card: {
    backgroundColor: surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: border,
    shadowColor: navyDeep,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
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

  barListRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  barListLbl: { width: 92, fontSize: 12, color: text },
  barListTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F0F1F5",
    overflow: "hidden",
  },
  barListFill: { height: "100%", borderRadius: 4 },
  barListVal: {
    width: 26,
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

  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
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

  chipOutline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: border,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipOutlineTxt: { fontSize: 11, color: text },

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
    backgroundColor: navyDeep,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 100,
  },
  tooltipLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tooltipValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    marginTop: 2,
  },

  axisRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  axisLabel: { fontSize: 11, color: sub, textAlign: "center", minWidth: 30 },

  ringCardBody: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
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
});