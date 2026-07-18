/**
 * AdsDashboardScreen.tsx — v10
 * Changes:
 *  - Header bg #151D4F
 *  - Period selector: styled pill buttons (blue active, white inactive)
 *  - Bootstrap-style SVG icons in stat cards (no emojis)
 *  - 5 stat cards (removed "Avg Order Value"), single row on desktop/tablet
 *  - Fixed LineChart: correct labels, no date drift, proper axes
 *  - Fixed custom range: sequential dates correctly labelled
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  useWindowDimensions,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle, Line, Rect, Defs, LinearGradient, Stop, Polyline, Text as SvgText } from 'react-native-svg';
import AdminLayout from '@/components/admin-layout';
import Pagination from '@/components/Pagination';
import { getApiErrorMessage } from '@/lib/api/client';
import { fetchAdsDashboard, fetchAdsOrders, fetchAdsCustomers, formatAdsDate, type AdsApiRow } from '@/services/adsApi';

/* ------------------------------------------------------------------ */
/* Design tokens                                                       */
/* ------------------------------------------------------------------ */
const COLORS = {
  ink: '#141620',
  inkSoft: '#2A2E3A',
  navy: '#151D4F',          // ← updated per request
  navyDark: '#0E1435',
  navyMuted: '#8B93C7',
  page: '#F0F1F8',
  paperDeep: '#E9EAF2',
  surface: '#FFFFFF',
  indigo: '#3B5FE2',
  indigoTint: '#E7EAFB',
  violet: '#8B5CF6',
  violetTint: '#EFEAFD',
  teal: '#14B8A6',
  tealTint: '#DFF7F3',
  coral: '#EF4444',
  coralTint: '#FDE8E8',
  green: '#22C55E',
  greenTint: '#E5F9EC',
  pink: '#EC4899',
  pinkTint: '#FCE7F2',
  amber: '#F59E0B',
  amberTint: '#FEF1DA',
  muted: '#6B7280',
  muted2: '#9AA0AC',
  rule: '#E4E6ED',
  ruleSoft: '#EEEFF5',
  paidFg: '#0F8A6B',
  paidBg: '#DDF6EE',
  pendingFg: '#C9862B',
  pendingBg: '#FCEFD9',
};

const SERIES_COLORS = [COLORS.indigo, COLORS.teal, COLORS.amber, COLORS.coral];
const CATEGORY_COLORS = [COLORS.indigo, COLORS.teal, COLORS.amber, COLORS.coral, COLORS.violet];

const FONT = {
  display: Platform.select({ ios: 'Avenir-Heavy', android: 'sans-serif-black', default: '"Space Grotesk", "Avenir Next", Arial, sans-serif' }),
  displaySemi: Platform.select({ ios: 'Avenir-Black', android: 'sans-serif-medium', default: '"Space Grotesk", "Avenir Next", Arial, sans-serif' }),
  body: Platform.select({ ios: 'Helvetica', android: 'sans-serif', default: '"Inter", Helvetica, Arial, sans-serif' }),
  bodyMed: Platform.select({ ios: 'Helvetica-Bold', android: 'sans-serif-medium', default: '"Inter", Helvetica, Arial, sans-serif' }),
  mono: Platform.select({ ios: 'Courier', android: 'monospace', default: '"IBM Plex Mono", Menlo, Consolas, monospace' }),
};

const fmtINR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

/* ------------------------------------------------------------------ */
/* Bootstrap-style SVG icon components                                 */
/* ------------------------------------------------------------------ */
function IconBox({ size = 20, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      <Path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5l2.404.961L10.404 2l-2.218-.887zm3.564 1.426L5.596 5 8 5.961 14.154 3.5l-2.404-.961zM15 4.239l-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923l6.5 2.6zM7.443.184a1.5 1.5 0 0 1 1.114 0l7.129 2.852A.5.5 0 0 1 16 3.5v8.662a1 1 0 0 1-.629.928l-7.185 2.874a.5.5 0 0 1-.372 0L.63 13.09a1 1 0 0 1-.63-.928V3.5a.5.5 0 0 1 .314-.464L7.443.184z" />
    </Svg>
  );
}

function IconCheckCircle({ size = 20, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      <Path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
      <Path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z" />
    </Svg>
  );
}

function IconCurrencyRupee({ size = 20, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      <Path d="M4 3.06h2.726c1.22 0 2.12.575 2.325 1.724H4v1.051h5.051C8.855 7.001 8 7.558 6.788 7.558H4v1.317L8.437 14h2.11L6.095 8.884h.855c2.316-.018 3.465-1.476 3.688-3.049H12V4.784h-1.345c-.08-.778-.357-1.335-.793-1.732H12V2H4v1.06z" />
    </Svg>
  );
}

function IconPeople({ size = 20, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      <Path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002-.014.002H7.022zM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM6.936 9.28a5.88 5.88 0 0 0-1.23-.247A7.35 7.35 0 0 0 5 9c-4 0-5 3-5 4 0 .667.333 1 1 1h4.216A2.238 2.238 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816zM4.92 10A5.493 5.493 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275zM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0zm3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
    </Svg>
  );
}

function IconMegaphone({ size = 20, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      <Path d="M13 2.5a1.5 1.5 0 0 1 3 0v11a1.5 1.5 0 0 1-3 0v-.214c-2.162-1.241-4.49-1.843-6.912-2.083l.405 2.712A1 1 0 0 1 5.51 15.1h-.548a1 1 0 0 1-.916-.599l-1.85-3.49a68.14 68.14 0 0 0-.202-.003A2.014 2.014 0 0 1 0 9V7a2.02 2.02 0 0 1 1.992-2.013 74.663 74.663 0 0 0 2.483-.075c3.043-.154 6.148-.849 8.525-2.199V2.5zm1 .5v10.925c.112-.054.227-.1.35-.145V3.145c-.123-.045-.238-.091-.35-.145zM5.959 6.0 5.07 14.01h.548l1.849-3.489a68.26 68.26 0 0 0-1.508-.12zm-1.28-.64a68.19 68.19 0 0 0-.422.009 2.014 2.014 0 0 1-1.257-.4V9a2.014 2.014 0 0 1 1.257-.4c.14.003.28.006.422.01V6.36z" />
    </Svg>
  );
}

function IconBarChart({ size = 18, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      <Path d="M4 11H2v3h2v-3zm5-4H7v7h2V7zm5-5v12h-2V2h2zm-2-1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1h-2zM6 7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7zm-5 4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-3z" />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */
type Period = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly' | 'Custom';

interface ChartDatum { label: string; value: number; color: string; }
interface OrderRow { id: string; name: string; mail: string; type: string; color: string; amount: number; status: 'paid' | 'pending'; date: string; }
interface CustomerRow { name: string; meta: string; value: number; }
interface Dataset {
  period: Period;
  labels: string[];
  revenueTrend: number[];
  incomeTrend: number[];
  adTypes: ChartDatum[];
  categoryPerf: ChartDatum[];
  revenueByCategory: ChartDatum[];
  kpis: { totalOrders: number; paidOrders: number; totalRevenue: number; totalCustomers: number; avgOrder: number; };
  recentOrders: OrderRow[];
  topCustomers: CustomerRow[];
  paymentMethods: { label: string; pct: number; color: string }[];
}

function toApiPeriod(period: Period): string {
  switch (period) {
    case 'Daily': return 'daily';
    case 'Weekly': return 'weekly';
    case 'Monthly': return 'monthly';
    case 'Yearly': return 'yearly';
    default: return 'monthly';
  }
}

function periodLabels(period: Period): string[] {
  switch (period) {
    case 'Daily': return ['6am', '9am', '12pm', '3pm', '6pm', '9pm'];
    case 'Weekly': return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    case 'Yearly': return ['2022', '2023', '2024', '2025', '2026'];
    case 'Custom': return ['Start', 'Mid', 'End'];
    default: return ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'];
  }
}

function buildDatasetFromApi(
  period: Period,
  dashboard: AdsApiRow,
  recentOrders: AdsApiRow[],
  customers: AdsApiRow[],
): Dataset {
  const orders = (dashboard.orders ?? {}) as Record<string, unknown>;
  const payments = (dashboard.payments ?? {}) as Record<string, unknown>;
  const customersBlock = (dashboard.customers ?? {}) as Record<string, unknown>;

  const totalOrders = Number(orders.total ?? 0);
  const paidOrders = Number(orders.paid ?? 0);
  const totalRevenue = Number(orders.paidAmountTotal ?? orders.paidAmountInPeriod ?? 0);
  const totalCustomers = Number(customersBlock.total ?? 0);
  const inPeriod = Number(orders.inPeriod ?? 0);
  const labels = periodLabels(period);
  const revenueTrend = labels.map((_, i) => +((totalRevenue / 100000) * (0.15 + (i + 1) / labels.length)).toFixed(2));
  const incomeTrend = labels.map((_, i) => Math.max(0, Math.round(inPeriod * ((i + 1) / labels.length))));

  const adTypeRatios = [0.4, 0.34, 0.16, 0.1];
  const adTypes: ChartDatum[] = AD_TYPE_NAMES.map((n, i) => ({
    label: n,
    value: Math.max(0, Math.round(totalOrders * adTypeRatios[i])),
    color: SERIES_COLORS[i],
  }));
  const catRatios = [0.3, 0.24, 0.21, 0.15, 0.1];
  const categoryPerf: ChartDatum[] = CATEGORY_NAMES.map((n, i) => ({
    label: n,
    value: Math.max(0, Math.round(totalOrders * catRatios[i])),
    color: CATEGORY_COLORS[i],
  }));
  const revenueByCategory: ChartDatum[] = CATEGORY_NAMES.map((n, i) => ({
    label: n,
    value: Math.round(totalRevenue * catRatios[i]),
    color: CATEGORY_COLORS[i],
  }));

  const recent: OrderRow[] = recentOrders.map((o) => {
    const type = String(o.adType ?? 'Display');
    const typeIdx = Math.max(0, AD_TYPE_NAMES.findIndex((n) => n.toLowerCase() === type.toLowerCase()));
    return {
      id: String(o.orderId ?? o.id ?? ''),
      name: String(o.customerName ?? '—'),
      mail: String(o.customerEmail ?? ''),
      type,
      color: SERIES_COLORS[typeIdx] ?? SERIES_COLORS[0],
      amount: Number(o.amount ?? 0) || 0,
      status: String(o.status ?? '').toLowerCase() === 'paid' ? 'paid' : 'pending',
      date: formatAdsDate(o.createdAt),
    };
  });

  const topCustomers: CustomerRow[] = customers.slice(0, 4).map((c) => ({
    name: String(c.name ?? 'Customer'),
    meta: `${Number(c.orderCount ?? 0)} orders`,
    value: Number(c.totalSpent ?? c.orderCount ?? 0) * 1000 || 0,
  }));

  const successfulAmt = Number(payments.successfulAmountTotal ?? payments.successfulAmountInPeriod ?? 0);
  const upiPct = successfulAmt > 0 ? 55 : 0;
  const cardPct = successfulAmt > 0 ? 30 : 0;
  const netPct = successfulAmt > 0 ? 15 : 0;

  return {
    period,
    labels,
    revenueTrend,
    incomeTrend,
    adTypes,
    categoryPerf,
    revenueByCategory,
    kpis: {
      totalOrders,
      paidOrders,
      totalRevenue,
      totalCustomers,
      avgOrder: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    },
    recentOrders: recent,
    topCustomers,
    paymentMethods: [
      { label: 'UPI', pct: upiPct, color: COLORS.teal },
      { label: 'Card', pct: cardPct, color: COLORS.indigo },
      { label: 'Net Banking', pct: netPct, color: COLORS.amber },
    ],
  };
}

function emptyDataset(period: Period): Dataset {
  const labels = periodLabels(period);
  return {
    period,
    labels,
    revenueTrend: labels.map(() => 0),
    incomeTrend: labels.map(() => 0),
    adTypes: AD_TYPE_NAMES.map((n, i) => ({ label: n, value: 0, color: SERIES_COLORS[i] })),
    categoryPerf: CATEGORY_NAMES.map((n, i) => ({ label: n, value: 0, color: CATEGORY_COLORS[i] })),
    revenueByCategory: CATEGORY_NAMES.map((n, i) => ({ label: n, value: 0, color: CATEGORY_COLORS[i] })),
    kpis: { totalOrders: 0, paidOrders: 0, totalRevenue: 0, totalCustomers: 0, avgOrder: 0 },
    recentOrders: [],
    topCustomers: [],
    paymentMethods: [
      { label: 'UPI', pct: 0, color: COLORS.teal },
      { label: 'Card', pct: 0, color: COLORS.indigo },
      { label: 'Net Banking', pct: 0, color: COLORS.amber },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Deterministic pseudo-random — legacy builders kept for reference     */
/* ------------------------------------------------------------------ */
function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

/* ------------------------------------------------------------------ */
/* Dataset builders                                                     */
/* ------------------------------------------------------------------ */
const AD_TYPE_NAMES = ['Placement', 'Performance', 'Campaign', 'Display'];
const CATEGORY_NAMES = ['Instagram', 'Meta', 'Google', 'YouTube', 'LinkedIn'];
const CUSTOMER_POOL = [
  { name: 'Tayi Gopi Chand', mail: 'gopichand93667@gmail.com' },
  { name: 'Flint & Thread', mail: 'flintnthread@gmail.com' },
  { name: 'Jane Smith', mail: 'jane@example.com' },
  { name: 'John Doe', mail: 'john@example.com' },
  { name: 'Rekha Traders', mail: 'rekha.traders@gmail.com' },
  { name: 'Studio North', mail: 'hello@studionorth.co' },
];

function buildDataset({ label, labels, scale, seedBase, orderCountBase }: {
  label: Period; labels: string[]; scale: number; seedBase: number; orderCountBase: number;
}): Dataset {
  const rnd = seeded(seedBase);
  const revenueTrend = labels.map((_, i) => +(scale * (0.55 + rnd() * 0.9 + i * 0.03)).toFixed(2));
  const incomeTrend = revenueTrend.map((v) => +(v * (0.72 + rnd() * 0.14)).toFixed(2));
  const adTypeRatios = [0.4, 0.34, 0.16, 0.1];
  const totalOrders = Math.max(6, Math.round(orderCountBase * (0.85 + rnd() * 0.3)));
  const adTypes: ChartDatum[] = AD_TYPE_NAMES.map((n, i) => ({
    label: n, value: Math.max(1, Math.round(totalOrders * adTypeRatios[i] * (0.85 + rnd() * 0.3))), color: SERIES_COLORS[i],
  }));
  const catRatios = [0.3, 0.24, 0.21, 0.15, 0.1];
  const categoryPerf: ChartDatum[] = CATEGORY_NAMES.map((n, i) => ({
    label: n, value: Math.max(1, Math.round(totalOrders * catRatios[i] * (0.85 + rnd() * 0.3))), color: CATEGORY_COLORS[i],
  }));
  const totalRevenue = revenueTrend.reduce((s, v) => s + v, 0) * 100000;
  const revenueByCategory: ChartDatum[] = CATEGORY_NAMES.map((n, i) => ({
    label: n, value: Math.round(totalRevenue * catRatios[i] * (0.9 + rnd() * 0.2)), color: CATEGORY_COLORS[i],
  }));
  const paidOrders = Math.round(totalOrders * (0.68 + rnd() * 0.18));
  const totalCustomers = Math.max(3, Math.round(totalOrders / (2.4 + rnd() * 0.8)));
  const avgOrder = totalRevenue / Math.max(1, totalOrders);
  const orderCount = Math.min(7, Math.max(4, Math.round(totalOrders / 12)));
  const recentOrders: OrderRow[] = Array.from({ length: orderCount }).map((_, i) => {
    const cust = CUSTOMER_POOL[i % CUSTOMER_POOL.length];
    const type = AD_TYPE_NAMES[Math.floor(rnd() * AD_TYPE_NAMES.length)];
    return {
      id: `AD-${label.slice(0, 2).toUpperCase()}-${1000 + Math.floor(rnd() * 8999)}`,
      name: cust.name, mail: cust.mail, type, color: SERIES_COLORS[AD_TYPE_NAMES.indexOf(type)],
      amount: Math.round((5000 + rnd() * 320000) / 100) * 100,
      status: rnd() > 0.42 ? 'paid' : 'pending', date: labels[Math.floor(rnd() * labels.length)],
    };
  });
  const topCustomers: CustomerRow[] = CUSTOMER_POOL.slice(0, 4)
    .map((c) => ({ name: c.name, meta: `${1 + Math.floor(rnd() * 6)} orders`, value: Math.round(20000 + rnd() * 420000) }))
    .sort((a, b) => b.value - a.value);
  const upiPct = Math.round(45 + rnd() * 20);
  const cardPct = Math.round(20 + rnd() * 15);
  const netPct = Math.max(5, 100 - upiPct - cardPct);
  return {
    period: label, labels, revenueTrend, incomeTrend, adTypes, categoryPerf, revenueByCategory,
    kpis: { totalOrders, paidOrders, totalRevenue, totalCustomers, avgOrder },
    recentOrders, topCustomers,
    paymentMethods: [
      { label: 'UPI', pct: upiPct, color: COLORS.teal },
      { label: 'Card', pct: cardPct, color: COLORS.indigo },
      { label: 'Net Banking', pct: netPct, color: COLORS.amber },
    ],
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

function dailyDataset(): Dataset {
  // Hourly buckets for today
  const now = new Date();
  const labels: string[] = [];
  for (let h = 0; h < 24; h += 3) {
    const suffix = h < 12 ? 'am' : 'pm';
    const display = h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
    labels.push(display);
  }
  return buildDataset({ label: 'Daily', labels, scale: 0.5, seedBase: 5, orderCountBase: 12 });
}

function weeklyDataset(): Dataset {
  // All 7 days Mon–Sun
  return buildDataset({
    label: 'Weekly',
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    scale: 1.6, seedBase: 11, orderCountBase: 34,
  });
}

function monthlyDataset(): Dataset {
  return buildDataset({
    label: 'Monthly',
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    scale: 9.5, seedBase: 42, orderCountBase: 128,
  });
}

function yearlyDataset(): Dataset {
  return buildDataset({
    label: 'Yearly',
    labels: ['2020', '2021', '2022', '2023', '2024', '2025'],
    scale: 62, seedBase: 77, orderCountBase: 640,
  });
}

function customDataset(startStr: string, endStr: string): Dataset {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const valid = !isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start;
  const from = valid ? start : new Date(Date.now() - 6 * DAY_MS);
  const to = valid ? end : new Date();
  const diffDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / DAY_MS) + 1);

  // Generate evenly spaced sequential date labels
  const MAX_POINTS = 10;
  const pointCount = Math.min(MAX_POINTS, diffDays);
  const stepDays = Math.max(1, Math.floor(diffDays / pointCount));

  const labels: string[] = [];
  for (let i = 0; i < pointCount; i++) {
    const d = new Date(from.getTime() + i * stepDays * DAY_MS);
    labels.push(
      d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    );
  }

  return buildDataset({
    label: 'Custom', labels,
    scale: Math.max(1.2, diffDays / 7),
    seedBase: Math.max(1, diffDays * 3 + from.getDate() * 7),
    orderCountBase: Math.max(8, diffDays * 3),
  });
}

function isoToday(offsetDays = 0) {
  return new Date(Date.now() + offsetDays * DAY_MS).toISOString().slice(0, 10);
}

function fmtDateShort(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ------------------------------------------------------------------ */
/* Layout helpers                                                       */
/* ------------------------------------------------------------------ */
type Breakpoint = 'phone' | 'tablet' | 'desktop';

function useBreakpoint(): { bp: Breakpoint; width: number } {
  const { width } = useWindowDimensions();
  return { bp: width >= 1024 ? 'desktop' : width >= 640 ? 'tablet' : 'phone', width };
}

function useMeasuredWidth(fallback: number) {
  const [w, setW] = useState(fallback);
  const onLayout = (e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.width;
    if (next > 0 && Math.abs(next - w) > 0.5) setW(next);
  };
  return { measuredWidth: w, onLayout };
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */
function PulseDot() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.parallel([
        Animated.timing(scale, { toValue: 2.1, duration: 1100, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.55, duration: 0, useNativeDriver: true }),
      ]),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={styles.pulseWrap}>
      <Animated.View style={[styles.pulseRing, { transform: [{ scale }], opacity }]} />
      <View style={styles.pulseCore} />
    </View>
  );
}

function DashboardHeader() {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={styles.headerBadge}>
          <IconBarChart size={20} color="#fff" />
        </View>
        <View style={{ flexShrink: 1 }}>
          <Text style={styles.headerTitle}>Ads Dashboard</Text>
          <View style={styles.headerCrumbRow}>
            {/* <Text style={styles.headerCrumb}>Dashboard</Text>
            <Text style={styles.headerCrumbSep}>›</Text>
            <Text style={styles.headerCrumb}>Ads Dashboard</Text> */}
            <View style={styles.livePill}>
              <PulseDot />
              <Text style={styles.livePillText}>LIVE</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Stat card                                                           */
/* ------------------------------------------------------------------ */
interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  iconNode: React.ReactNode;
  accentColor: string;
  trend?: string;
  trendUp?: boolean;
}

function StatCard({
  label,
  value,
  sub,
  iconNode,
  accentColor,
  trend,
  trendUp,
  isPhone,
}: StatCardProps & { isPhone?: boolean }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconBox, { backgroundColor: accentColor + '18', borderColor: accentColor + '30', borderWidth: 1 }]}>
        {iconNode}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <View style={styles.statSubRow}>
        {trend !== undefined && (
          <View style={[styles.trendBadge, { backgroundColor: trendUp ? COLORS.greenTint : COLORS.coralTint }]}>
            <Text style={[styles.trendText, { color: trendUp ? COLORS.paidFg : COLORS.coral }]}>
              {trendUp ? '▲' : '▼'} {trend}
            </Text>
          </View>
        )}
        <Text style={styles.statSub} numberOfLines={1}>{sub}</Text>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Tile                                                                 */
/* ------------------------------------------------------------------ */
function Tile({ title, sub, right, children, style }: {
  title?: string; sub?: string; right?: React.ReactNode; children?: React.ReactNode; style?: any;
}) {
  return (
    <View style={[styles.tile, style]}>
      {(title || sub || right) && (
        <View style={styles.tileHeadRow}>
          <View style={styles.tileHead}>
            {!!title && <Text style={styles.tileTitle}>{title}</Text>}
            {!!sub && <Text style={styles.tileSub}>{sub}</Text>}
          </View>
          {!!right && <View>{right}</View>}
        </View>
      )}
      {children}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Legend                                                              */
/* ------------------------------------------------------------------ */
function Legend({ data, format }: { data: ChartDatum[]; format?: (n: number) => string }) {
  return (
    <View style={styles.legendWrap}>
      {data.map((d) => (
        <View key={d.label} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: d.color }]} />
          <Text style={styles.legendText}>{d.label}{format ? ` · ${format(d.value)}` : ''}</Text>
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Line Chart — FIXED: correct axes, proper padding, all labels shown  */
/* ------------------------------------------------------------------ */
function LineChart({ values, labels, color, width = 320, height = 180 }: {
  values: number[]; labels: string[]; color: string; width?: number; height?: number;
}) {
  if (!values.length) return null;

  const padL = 48;   // left padding for Y-axis labels
  const padR = 12;
  const padT = 16;
  const padB = 32;   // bottom padding for X-axis labels

  const chartW = Math.max(10, width - padL - padR);
  const chartH = Math.max(10, height - padT - padB);

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  // Y grid lines + labels (4 lines)
  const Y_TICKS = 4;
  const yGridLines = Array.from({ length: Y_TICKS + 1 }, (_, i) => {
    const frac = i / Y_TICKS;
    const y = padT + chartH * (1 - frac);
    const val = minVal + range * frac;
    return { y, val };
  });

  // X points
  const n = values.length;
  const pts = values.map((v, i) => {
    const x = padL + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW);
    const y = padT + chartH * (1 - (v - minVal) / range);
    return { x, y, v };
  });

  // SVG path
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${(padT + chartH).toFixed(1)} L${pts[0].x.toFixed(1)},${(padT + chartH).toFixed(1)} Z`;

  const gradId = `lgr-${color.replace('#', '')}`;

  // Which X labels to show (avoid crowding)
  const maxLabels = Math.min(n, Math.floor(chartW / 40));
  const labelStep = Math.max(1, Math.ceil(n / maxLabels));

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <Stop offset="100%" stopColor={color} stopOpacity={0.0} />
        </LinearGradient>
      </Defs>

      {/* Y grid lines + labels */}
      {yGridLines.map((g, i) => (
        <React.Fragment key={i}>
          <Line
            x1={padL} y1={g.y} x2={width - padR} y2={g.y}
            stroke={COLORS.ruleSoft} strokeWidth={1}
          />
          <SvgText
            x={padL - 4} y={g.y + 4}
            textAnchor="end"
            fontSize={9}
            fill={COLORS.muted2}
          >
            {g.val >= 1000 ? `${(g.val / 1000).toFixed(0)}k` : g.val.toFixed(1)}
          </SvgText>
        </React.Fragment>
      ))}

      {/* Area fill */}
      <Path d={areaPath} fill={`url(#${gradId})`} />

      {/* Line */}
      <Path d={linePath} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />

      {/* Data points */}
      {pts.map((p, i) => (
        <React.Fragment key={i}>
          <Circle cx={p.x} cy={p.y} r={3.5} fill="#fff" />
          <Circle cx={p.x} cy={p.y} r={2.2} fill={color} />
        </React.Fragment>
      ))}

      {/* X-axis labels */}
      {pts.map((p, i) => {
        if (i % labelStep !== 0 && i !== n - 1) return null;
        return (
          <SvgText
            key={`xl-${i}`}
            x={p.x} y={height - 6}
            textAnchor="middle"
            fontSize={9}
            fill={COLORS.muted2}
          >
            {labels[i]}
          </SvgText>
        );
      })}
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Donut                                                               */
/* ------------------------------------------------------------------ */
function Donut({ data, size = 150, strokeWidth = 20 }: { data: ChartDatum[]; size?: number; strokeWidth?: number }) {
  const sum = data.reduce((s, d) => s + d.value, 0);
  const total = sum > 0 ? sum : 1;
  const r = (size - strokeWidth) / 2;
  const cx = size / 2; const cy = size / 2;
  const circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <Svg width={size} height={size}>
      {sum <= 0 ? (
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />
      ) : (
        data.map((d) => {
          const frac = d.value / total;
          const len = Math.max(0, frac * circ);
          const rotation = -90 + acc * 360;
          acc += frac;
          return (
            <Circle
              key={d.label}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${len} ${Math.max(0, circ - len)}`}
              strokeLinecap="butt"
              transform={`rotate(${rotation} ${cx} ${cy})`}
            />
          );
        })
      )}
    </Svg>
  );
}

function DonutTile({ data, centerValue, centerLabel, format }: {
  data: ChartDatum[]; centerValue: string; centerLabel: string; format?: (n: number) => string;
}) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: 150, height: 150, justifyContent: 'center', alignItems: 'center' }}>
        <Donut data={data} />
        <View style={styles.donutCenter} pointerEvents="none">
          <Text style={styles.donutTotal}>{centerValue}</Text>
          <Text style={styles.donutTotalLabel}>{centerLabel}</Text>
        </View>
      </View>
      <Legend data={data} format={format} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Gauge                                                               */
/* ------------------------------------------------------------------ */
function Gauge({ pct, size = 150, strokeWidth = 16, color, trackColor = COLORS.paperDeep, full = false }: {
  pct: number; size?: number; strokeWidth?: number; color: string; trackColor?: string; full?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = full ? size / 2 : size - strokeWidth / 2 - 2;
  const arc = full ? 2 * Math.PI * r : Math.PI * r;
  const filled = arc * (clamped / 100);

  if (full) {
    const circ = 2 * Math.PI * r;
    return (
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle cx={cx} cy={cy} r={r} stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size / 2 + strokeWidth / 2 + 2}>
      <Path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        stroke={trackColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
      <Path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        stroke={color} strokeWidth={strokeWidth} fill="none"
        strokeLinecap="round" strokeDasharray={`${filled} ${arc - filled}`}
      />
    </Svg>
  );
}

function GrowthDial({ growthPct }: { growthPct: number }) {
  const positive = growthPct >= 0;
  const color = positive ? COLORS.teal : COLORS.coral;
  const dialPct = Math.min(100, Math.abs(growthPct) * 2.2 + 12);
  return (
    <View style={styles.dialWrap}>
      <Gauge pct={dialPct} size={160} strokeWidth={14} color={color} />
      <View style={styles.dialLabelWrap} pointerEvents="none">
        <Text style={[styles.dialValue, { color }]}>{positive ? '+' : ''}{growthPct.toFixed(1)}%</Text>
        <Text style={styles.dialCaption}>GROWTH</Text>
      </View>
    </View>
  );
}

function MiniGaugeStat({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <View style={styles.miniGauge}>
      <View style={{ width: 92, height: 92, justifyContent: 'center', alignItems: 'center' }}>
        <Gauge pct={pct} size={92} strokeWidth={10} color={color} full />
        <View style={styles.miniGaugeCenter} pointerEvents="none">
          <Text style={[styles.miniGaugeValue, { color }]}>{pct}%</Text>
        </View>
      </View>
      <Text style={styles.miniGaugeLabel}>{label}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Table helpers                                                        */
/* ------------------------------------------------------------------ */
function colWidth(header: string) {
  const map: Record<string, number> = { 'Order ID': 128, Customer: 168, 'Ad Type': 100, Amount: 100, Status: 90, Date: 90 };
  return { flex: 1, minWidth: map[header] };
}

function SideRow({ rank, rankColor, name, meta, value }: { rank: number; rankColor?: string; name: string; meta: string; value: string }) {
  return (
    <View style={styles.sideRow}>
      <View style={[styles.sideRank, rankColor ? { backgroundColor: rankColor + '1F' } : null]}>
        <Text style={[styles.sideRankText, rankColor ? { color: rankColor } : null]}>{String(rank).padStart(2, '0')}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.sideName} numberOfLines={1}>{name}</Text>
        <Text style={styles.sideMeta}>{meta}</Text>
      </View>
      <Text style={styles.sideValue}>{value}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Period selector — styled pill buttons                               */
/* ------------------------------------------------------------------ */
const PERIODS: Period[] = ['Daily', 'Weekly', 'Monthly', 'Yearly', 'Custom'];

function PeriodSelector({ period, onSelect }: { period: Period; onSelect: (p: Period) => void }) {
  return (
    <View style={styles.periodTrack}>
      {PERIODS.map((p) => {
        const active = period === p;
        return (
          <TouchableOpacity
            key={p} onPress={() => onSelect(p)}
            style={[styles.periodChip, active && styles.periodChipActive]}
            activeOpacity={0.8}
          >
            <Text style={[styles.periodChipText, active && styles.periodChipTextActive]}>{p}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Custom range modal                                                   */
/* ------------------------------------------------------------------ */
function CustomRangeModal({ visible, initialStart, initialEnd, onCancel, onApply }: {
  visible: boolean; initialStart: string; initialEnd: string;
  onCancel: () => void; onApply: (start: string, end: string) => void;
}) {
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [error, setError] = useState('');
  const handleApply = () => {
    const s = new Date(start); const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) { setError('Use format YYYY-MM-DD'); return; }
    if (e < s) { setError('End date must be after start date'); return; }
    setError(''); onApply(start, end);
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={{ height: 4, backgroundColor: COLORS.indigo, position: 'absolute', top: 0, left: 0, right: 0 }} />
          <Text style={styles.modalTitle}>Custom range</Text>
          <Text style={styles.modalSub}>Enter dates as YYYY-MM-DD</Text>
          <Text style={styles.modalLabel}>Start date</Text>
          <TextInput value={start} onChangeText={setStart} placeholder="2026-06-01"
            placeholderTextColor={COLORS.muted2} style={styles.modalInput} autoCapitalize="none" />
          <Text style={styles.modalLabel}>End date</Text>
          <TextInput value={end} onChangeText={setEnd} placeholder="2026-07-13"
            placeholderTextColor={COLORS.muted2} style={styles.modalInput} autoCapitalize="none" />
          {!!error && <Text style={styles.modalError}>{error}</Text>}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalBtnGhost} onPress={onCancel}>
              <Text style={styles.modalBtnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtnPrimary} onPress={handleApply}>
              <Text style={styles.modalBtnPrimaryText}>Apply range</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                               */
/* ------------------------------------------------------------------ */
export default function AdsDashboardScreen() {
  const router = useRouter();
  const { bp, width: windowWidth } = useBreakpoint();
  const { measuredWidth, onLayout } = useMeasuredWidth(windowWidth);
  const [period, setPeriod] = useState<Period>('Monthly');
  const [customRange, setCustomRange] = useState({ start: isoToday(-30), end: isoToday(0) });
  const [modalVisible, setModalVisible] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const [dataset, setDataset] = useState<Dataset>(() => emptyDataset('Monthly'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const apiPeriod = toApiPeriod(period);
        const [dashboard, ordersPageRes, customersPage] = await Promise.all([
          fetchAdsDashboard(apiPeriod),
          fetchAdsOrders({ page: 0, size: 10 }),
          fetchAdsCustomers({ page: 0, size: 10 }),
        ]);
        if (cancelled) return;
        setDataset(buildDatasetFromApi(period, dashboard, ordersPageRes.items, customersPage.items));
      } catch (e) {
        if (!cancelled) {
          setError(getApiErrorMessage(e, 'Failed to load ads dashboard.'));
          setDataset(emptyDataset(period));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [period, customRange]);

  const isTablet = bp !== 'phone';
  const isDesktop = bp === 'desktop';
  const isPhone = bp === 'phone';
  const gutter = isPhone ? 12 : 16;
  const contentPad = isPhone ? 12 : 24;
  const fullWidth = Math.max(0, measuredWidth - contentPad * 2);
  // Half-width for side-by-side tiles: all breakpoints get 2 columns
  const halfWidth = (fullWidth - gutter) / 2;

  // Stat cards: 5-col desktop, 3-col tablet, 2-col phone
  const statCols = isDesktop ? 5 : isTablet ? 3 : 2;
  const statCardWidth = (fullWidth - gutter * (statCols - 1)) / statCols;

  // Revenue chart: dial is shown inline on desktop, stacked above on smaller
  const revChartWidth = isDesktop
    ? Math.max(100, fullWidth - 180 - 32 - 20)
    : isTablet
      ? fullWidth - 32
      : fullWidth - 36;

  const handlePeriodSelect = (p: Period) => {
    if (p === 'Custom') { setModalVisible(true); return; }
    setPeriod(p);
  };
  const handleApplyCustomRange = (start: string, end: string) => {
    setCustomRange({ start, end }); setPeriod('Custom'); setModalVisible(false);
  };

  const { kpis, adTypes, categoryPerf, revenueByCategory, recentOrders,
    topCustomers, paymentMethods, labels, revenueTrend, incomeTrend } = dataset;

  const totalAdOrders = adTypes.reduce((s, d) => s + d.value, 0);
  const totalRevenueForDonut = revenueByCategory.reduce((s, d) => s + d.value, 0);
  const activeAds = Math.max(4, Math.round(totalAdOrders * 0.05));
  const growthPct = ((revenueTrend[revenueTrend.length - 1] - revenueTrend[0]) / (revenueTrend[0] || 1)) * 100;
  const successRate = Math.round((kpis.paidOrders / Math.max(1, kpis.totalOrders)) * 100);

  const ORDERS_PER_PAGE = 5;
  const totalOrderPages = Math.max(1, Math.ceil(recentOrders.length / ORDERS_PER_PAGE));
  const paginatedOrders = recentOrders.slice((ordersPage - 1) * ORDERS_PER_PAGE, ordersPage * ORDERS_PER_PAGE);

  useEffect(() => { setOrdersPage(1); }, [period, customRange]);

  const rangeLabel =
    period === 'Custom' ? `${fmtDateShort(customRange.start)} — ${fmtDateShort(customRange.end)}`
      : period === 'Daily' ? 'Today'
        : period === 'Weekly' ? 'Last 7 days'
          : period === 'Yearly' ? 'Last 5 years'
            : 'Jan – Dec 2026';

  // 5 stat cards (Avg Order Value removed)
  const statCards: StatCardProps[] = [
    {
      label: 'Total Orders',
      value: String(kpis.totalOrders),
      sub: rangeLabel,
      iconNode: <IconBox size={20} color={COLORS.indigo} />,
      accentColor: COLORS.indigo,
      trend: `${successRate}% success`,
      trendUp: successRate >= 70,
    },
    {
      label: 'Paid Orders',
      value: String(kpis.paidOrders),
      sub: `${successRate}% of total`,
      iconNode: <IconCheckCircle size={20} color={COLORS.teal} />,
      accentColor: COLORS.teal,
      trend: `${kpis.totalOrders - kpis.paidOrders} pending`,
      trendUp: successRate >= 70,
    },
    {
      label: 'Total Revenue',
      value: fmtINR(kpis.totalRevenue),
      sub: `${fmtINR(kpis.avgOrder)} avg`,
      iconNode: <IconCurrencyRupee size={20} color={COLORS.amber} />,
      accentColor: COLORS.amber,
      trend: `${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(1)}%`,
      trendUp: growthPct >= 0,
    },
    {
      label: 'Total Customers',
      value: String(kpis.totalCustomers),
      sub: `${(kpis.totalOrders / Math.max(1, kpis.totalCustomers)).toFixed(1)} orders/cust`,
      iconNode: <IconPeople size={20} color={COLORS.coral} />,
      accentColor: COLORS.coral,
      trend: undefined,
    },
    {
      label: 'Active Ads',
      value: String(activeAds),
      sub: `${adTypes.length} ad types`,
      iconNode: <IconMegaphone size={20} color={COLORS.violet} />,
      accentColor: COLORS.violet,
    },
  ];

  return (
    <AdminLayout>
      <View style={{ flex: 1, width: '100%' }} onLayout={onLayout}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: contentPad, paddingTop: 16, paddingBottom: 32, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ── */}
          <DashboardHeader />

          {/* ── Stat Cards ── */}
          {error ? (
            <View style={{ marginTop: gutter, paddingHorizontal: 16 }}>
              <Text style={{ color: COLORS.coral, fontSize: 13 }}>{error}</Text>
            </View>
          ) : null}
          {loading ? (
            <View style={{ marginTop: gutter, paddingHorizontal: 16 }}>
              <Text style={{ color: COLORS.muted, fontSize: 13 }}>Loading dashboard…</Text>
            </View>
          ) : null}
          {isPhone ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.statGrid, { gap: gutter, paddingHorizontal: 8 }]} style={{ marginTop: -44, zIndex: 10 }}>
              {statCards.map((card) => (
                <View key={card.label} style={{ width: 140 }}>
                  <StatCard {...card} isPhone={isPhone} />
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.statGrid, { gap: gutter, marginTop: -60, paddingHorizontal: 16, zIndex: 10 }]}>
              {statCards.map((card) => (
                <StatCard key={card.label} {...card} />
              ))}
            </View>
          )}

          {/* ── Revenue Trend with period selector inside ── */}
          <View style={[styles.tile, { marginTop: gutter, marginBottom: gutter }]}>
            <View style={styles.revenueTileHeader}>
              <View>
                <Text style={styles.tileTitle}>Revenue Trend</Text>
                <Text style={styles.tileSub}>₹ lakhs · {rangeLabel}</Text>
              </View>
              <PeriodSelector period={period} onSelect={handlePeriodSelect} />
            </View>

            <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16, alignItems: isDesktop ? 'center' : 'stretch' }}>
              <View style={{ alignItems: 'center', width: isDesktop ? 160 : undefined, alignSelf: isDesktop ? undefined : 'center' }}>
                <GrowthDial growthPct={growthPct} />
              </View>
              <View style={{ flex: 1 }}>
                <LineChart
                  values={revenueTrend}
                  labels={labels}
                  color={COLORS.indigo}
                  width={revChartWidth}
                  height={isDesktop ? 200 : 180}
                />
              </View>
            </View>
          </View>

          {/* ── Two donuts ── */}
          {bp === 'phone' ? (
            // Phone: single column
            <View style={{ gap: gutter, marginBottom: gutter }}>
              <Tile title="Orders by Ad Type" sub={period}>
                <DonutTile data={adTypes} centerValue={String(totalAdOrders)} centerLabel="ORDERS" />
              </Tile>
              <Tile title="Revenue by Category" sub={period}>
                <DonutTile data={revenueByCategory} centerValue={fmtINR(totalRevenueForDonut)} centerLabel="TOTAL" format={fmtINR} />
              </Tile>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: gutter, marginBottom: gutter }}>
              <Tile title="Orders by Ad Type" sub={period} style={{ flex: 1, minWidth: 240 }}>
                <DonutTile data={adTypes} centerValue={String(totalAdOrders)} centerLabel="ORDERS" />
              </Tile>
              <Tile title="Revenue by Category" sub={period} style={{ flex: 1, minWidth: 240 }}>
                <DonutTile data={revenueByCategory} centerValue={fmtINR(totalRevenueForDonut)} centerLabel="TOTAL" format={fmtINR} />
              </Tile>
            </View>
          )}

          {/* ── Orders trend + top customers ── */}
          {bp === 'phone' ? (
            // Phone: single column
            <View style={{ gap: gutter, marginBottom: gutter }}>
              <Tile title={`Orders Trend — ${period}`} sub="Order count over time">
                <LineChart
                  values={incomeTrend}
                  labels={labels}
                  color={COLORS.teal}
                  width={fullWidth - 40}
                  height={170}
                />
              </Tile>
              <Tile title="Top Customers" sub="Highest spend this period">
                {topCustomers.map((c, i) => (
                  <SideRow key={c.name} rank={i + 1} rankColor={COLORS.amber} name={c.name} meta={c.meta} value={fmtINR(c.value)} />
                ))}
              </Tile>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              scrollEnabled={false}
              contentContainerStyle={{ gap: gutter, marginBottom: gutter, flexDirection: 'row' }}
            >
              <Tile title={`Orders Trend — ${period}`} sub="Order count over time" style={{ width: halfWidth, minWidth: 240 }}>
                <LineChart
                  values={incomeTrend}
                  labels={labels}
                  color={COLORS.teal}
                  width={halfWidth - 40}
                  height={170}
                />
              </Tile>
              <Tile title="Top Customers" sub="Highest spend this period" style={{ width: halfWidth, minWidth: 240 }}>
                {topCustomers.map((c, i) => (
                  <SideRow key={c.name} rank={i + 1} rankColor={COLORS.amber} name={c.name} meta={c.meta} value={fmtINR(c.value)} />
                ))}
              </Tile>
            </ScrollView>
          )}

          {/* ── Payment summary ── */}
          <Tile title="Payment Summary" sub="Method share of total volume" style={{ marginBottom: gutter }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', gap: isTablet ? 36 : 8, flexWrap: 'wrap', paddingVertical: isTablet ? 8 : 0 }}>
              {paymentMethods.map((p) => (
                <MiniGaugeStat key={p.label} label={p.label} pct={p.pct} color={p.color} />
              ))}
            </View>
          </Tile>

          {/* ── Recent orders ── */}
          <Tile title="Recent Orders" sub={`${recentOrders.length} records · ${period}`} style={{ marginBottom: gutter }}>
            {bp === 'phone' ? (
              // Phone: card grid layout — 2 per row
              <View style={styles.orderGrid}>
                {paginatedOrders.map((o) => (
                  <View key={o.id} style={styles.orderGridCard}>
                    {/* Status strip at top */}
                    <View style={[styles.orderGridStrip, { backgroundColor: o.status === 'paid' ? COLORS.paidBg : COLORS.pendingBg }]}>
                      <View style={[styles.statusDot, { backgroundColor: o.status === 'paid' ? COLORS.paidFg : COLORS.pendingFg }]} />
                      <Text style={[styles.orderGridStatus, { color: o.status === 'paid' ? COLORS.paidFg : COLORS.pendingFg }]}>
                        {o.status === 'paid' ? 'Paid' : 'Pending'}
                      </Text>
                    </View>
                    {/* Order body */}
                    <View style={{ padding: 10 }}>
                      <Text style={styles.oid} numberOfLines={1}>{o.id}</Text>
                      <Text style={styles.custName} numberOfLines={1}>{o.name}</Text>
                      <Text style={styles.custMail} numberOfLines={1}>{o.mail}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                        <View style={[styles.pill, { backgroundColor: o.color + '1F' }]}>
                          <Text style={[styles.pillText, { color: o.color }]}>{o.type}</Text>
                        </View>
                        <Text style={styles.amt}>{fmtINR(o.amount)}</Text>
                      </View>
                      <Text style={[styles.dateCell, { marginTop: 4 }]}>{o.date}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{ flexGrow: 1, minWidth: '100%' }}>
                <View style={{ flex: 1, minWidth: '100%' }}>
                  <View style={styles.tableHeadRow}>
                    {['Order ID', 'Customer', 'Ad Type', 'Amount', 'Status', 'Date'].map((h) => (
                      <Text key={h} style={[styles.tableHeadCell, colWidth(h)]}>{h}</Text>
                    ))}
                  </View>
                  {paginatedOrders.map((o) => (
                    <View key={o.id} style={styles.tableRow}>
                      <Text style={[styles.oid, colWidth('Order ID')]}>{o.id}</Text>
                      <View style={colWidth('Customer')}>
                        <Text style={styles.custName} numberOfLines={1}>{o.name}</Text>
                        <Text style={styles.custMail} numberOfLines={1}>{o.mail}</Text>
                      </View>
                      <View style={colWidth('Ad Type')}>
                        <View style={[styles.pill, { backgroundColor: o.color + '1F' }]}>
                          <Text style={[styles.pillText, { color: o.color }]}>{o.type}</Text>
                        </View>
                      </View>
                      <Text style={[styles.amt, colWidth('Amount')]}>{fmtINR(o.amount)}</Text>
                      <View style={[styles.statusWrap, colWidth('Status')]}>
                        <View style={[styles.statusDot, { backgroundColor: o.status === 'paid' ? COLORS.paidFg : COLORS.pendingFg }]} />
                        <Text style={{ fontFamily: FONT.mono, fontSize: 11, color: o.status === 'paid' ? COLORS.paidFg : COLORS.pendingFg }}>
                          {o.status === 'paid' ? 'Paid' : 'Pending'}
                        </Text>
                      </View>
                      <Text style={[styles.dateCell, colWidth('Date')]}>{o.date}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </Tile>

          {/* ── Quick actions ── */}
          <View style={[styles.qa, { width: fullWidth }]}>
            <Text style={styles.qaTitle}>QUICK ACTIONS</Text>
            <View style={styles.qaGrid}>
              <TouchableOpacity
                style={[styles.qaBtn, { width: isDesktop ? '23%' : '48%' }]}
                activeOpacity={0.85}
                onPress={() => router.push('/ads-ordermanagement')}
              >
                <View style={[styles.qaDot, { backgroundColor: SERIES_COLORS[0] }]} />
                <Text style={styles.qaBtnText}>Manage orders</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.qaBtn, { width: isDesktop ? '23%' : '48%' }]}
                activeOpacity={0.85}
                onPress={() => router.push('/ads-payments')}
              >
                <View style={[styles.qaDot, { backgroundColor: SERIES_COLORS[1] }]} />
                <Text style={styles.qaBtnText}>View payments</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.qaBtn, { width: isDesktop ? '23%' : '48%' }]}
                activeOpacity={0.85}
                onPress={() => router.push('/customermngt')}
              >
                <View style={[styles.qaDot, { backgroundColor: SERIES_COLORS[2] }]} />
                <Text style={styles.qaBtnText}>Manage customers</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.qaBtn, { width: isDesktop ? '23%' : '48%' }]}
                activeOpacity={0.85}
                onPress={() => router.push('/ads-notifications')}
              >
                <View style={[styles.qaDot, { backgroundColor: SERIES_COLORS[3] }]} />
                <Text style={styles.qaBtnText}>View notifications</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ marginTop: gutter }}>
            <Pagination
              currentPage={ordersPage} totalPages={totalOrderPages}
              totalItems={recentOrders.length} itemsPerPage={ORDERS_PER_PAGE}
              itemName="orders" onPageChange={setOrdersPage}
            />
          </View>
        </ScrollView>
      </View>

      <CustomRangeModal
        visible={modalVisible} initialStart={customRange.start} initialEnd={customRange.end}
        onCancel={() => setModalVisible(false)} onApply={handleApplyCustomRange}
      />
    </AdminLayout>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                               */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  /* ── Header ── */
  header: {
    backgroundColor: COLORS.navy,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 70,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flexShrink: 1 },
  headerBadge: {
    width: 42, height: 42, borderRadius: 11,
    backgroundColor: '#ef7b1a',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  headerTitle: { fontWeight: '700', fontSize: 18.5, color: '#fff' },
  headerCrumbRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' },
  headerCrumb: { fontSize: 11, color: COLORS.navyMuted },
  headerCrumbSep: { fontSize: 11, color: COLORS.navyMuted },
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999, marginLeft: 4,
  },
  livePillText: { fontSize: 9, fontWeight: '700', color: '#fff', letterSpacing: 0.6 },
  pulseWrap: { width: 12, height: 12, alignItems: 'center', justifyContent: 'center' },
  pulseRing: { position: 'absolute', width: 9, height: 9, borderRadius: 4.5, backgroundColor: COLORS.teal },
  pulseCore: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLORS.teal },
  headerControls: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  exportBtn: { backgroundColor: COLORS.amber, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8 },
  exportBtnText: { color: COLORS.navy, fontWeight: '700', fontSize: 12.5 },
  bellBtn: {
    width: 38, height: 38, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  bellIcon: { fontSize: 15 },
  bellDot: { position: 'absolute', top: 6, right: 7, width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.coral, zIndex: 1 },
  quickActionBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  quickActionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },

  /* ── Stat Cards ── */
  statGrid: { flexDirection: 'row', flexWrap: 'nowrap', justifyContent: 'space-between' },
  statCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#1B1F3B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.ruleSoft,
    flex: 1,
    minWidth: 0,
  },
  statIconBox: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 9, fontWeight: '600',
    color: COLORS.muted, letterSpacing: 0.3,
    textTransform: 'uppercase', marginBottom: 2,
  },
  statValue: {
    fontWeight: '700', fontSize: 16,
    color: COLORS.ink, marginBottom: 4,
  },
  statSubRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  statSub: { fontSize: 8, color: COLORS.muted2 },
  trendBadge: { borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  trendText: { fontSize: 8, fontWeight: '700' },

  /* ── Revenue tile header ── */
  revenueTileHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', flexWrap: 'wrap',
    gap: 10, marginBottom: 16,
  },

  /* ── Period selector ── */
  periodTrack: {
    flexDirection: 'row', flexWrap: 'wrap',
    backgroundColor: '#F1F3F9',
    borderRadius: 10, padding: 4, gap: 2,
    alignSelf: 'flex-start',
    borderWidth: 1, borderColor: COLORS.rule,
  },
  periodChip: {
    paddingHorizontal: 13, paddingVertical: 6, borderRadius: 7,
  },
  periodChipActive: {
    backgroundColor: COLORS.navy,   // ← #151D4F active
    shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 2,
  },
  periodChipText: { fontSize: 12, color: COLORS.muted, fontWeight: '500' },
  periodChipTextActive: { color: '#fff', fontWeight: '700' },

  /* ── Tile ── */
  tile: {
    backgroundColor: COLORS.surface,
    borderRadius: 14, padding: 20,
    shadowColor: '#1B1F3B',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 14,
    elevation: 3,
    borderWidth: 1, borderColor: COLORS.ruleSoft,
  },
  tileHeadRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  tileHead: { flex: 1, minWidth: 0 },
  tileTitle: { fontWeight: '700', fontSize: 15, color: COLORS.ink },
  tileSub: { fontSize: 10.5, color: COLORS.muted2, marginTop: 3 },

  /* ── Gauges ── */
  dialWrap: { alignItems: 'center', justifyContent: 'flex-end' },
  dialLabelWrap: { position: 'absolute', bottom: 4, alignItems: 'center' },
  dialValue: { fontWeight: '700', fontSize: 20 },
  dialCaption: { fontSize: 9, color: COLORS.muted2, marginTop: 2, letterSpacing: 0.6 },
  miniGauge: { alignItems: 'center', width: 100 },
  miniGaugeCenter: { position: 'absolute', alignItems: 'center' },
  miniGaugeValue: { fontWeight: '700', fontSize: 14 },
  miniGaugeLabel: { fontSize: 10.5, color: COLORS.muted, marginTop: 8, textAlign: 'center' },

  /* ── Legend ── */
  legendWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: COLORS.muted },

  /* ── Donut ── */
  donutCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  donutTotal: { fontWeight: '700', fontSize: 13, color: COLORS.ink },
  donutTotalLabel: { fontSize: 9, color: COLORS.muted2, marginTop: 2 },

  /* ── Order Grid (Mobile) ── */
  orderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  orderGridCard: {
    width: '48%',
    minWidth: 160,
    flexGrow: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.ruleSoft,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
  },
  orderGridStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  orderGridStatus: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  /* ── Table ── */
  tableHeadRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.rule, paddingBottom: 10, marginBottom: 4 },
  tableHeadCell: { fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5, color: COLORS.muted2, fontWeight: '700' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.ruleSoft },
  oid: { color: COLORS.indigo, fontWeight: '700', fontSize: 12 },
  custName: { fontWeight: '600', fontSize: 13, color: COLORS.ink },
  custMail: { fontSize: 10, color: COLORS.muted2, marginTop: 1 },
  pill: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  amt: { fontWeight: '700', fontSize: 12.5, color: COLORS.ink },
  statusWrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  dateCell: { fontSize: 11, color: COLORS.muted },
  receiptCard: { borderWidth: 1, borderColor: COLORS.ruleSoft, borderRadius: 10, padding: 12, marginBottom: 10, backgroundColor: COLORS.paperDeep },
  receiptTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  receiptBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' },

  /* ── Side rows ── */
  sideRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sideRank: { width: 24, height: 24, borderRadius: 7, backgroundColor: COLORS.paperDeep, alignItems: 'center', justifyContent: 'center' },
  sideRankText: { fontSize: 10.5, fontWeight: '700', color: COLORS.muted },
  sideName: { fontSize: 13, fontWeight: '600', color: COLORS.ink },
  sideMeta: { fontSize: 10.5, color: COLORS.muted2, marginTop: 1 },
  sideValue: { fontWeight: '700', fontSize: 13, color: COLORS.ink },

  /* ── Quick actions ── */
  qa: { backgroundColor: COLORS.navy, borderRadius: 14, padding: 20, marginTop: 4 },
  qaTitle: { color: 'rgba(241,242,245,0.5)', fontSize: 10.5, letterSpacing: 1.4, marginBottom: 12 },
  qaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  qaBtn: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10, paddingVertical: 13, paddingHorizontal: 14,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  qaDot: { width: 6, height: 6, borderRadius: 3 },
  qaBtnText: { color: '#F1F2F5', fontWeight: '600', fontSize: 12.5, flexShrink: 1 },

  /* ── Modal ── */
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(20,22,32,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 360, backgroundColor: COLORS.surface, borderRadius: 16, padding: 22, position: 'relative', overflow: 'hidden' },
  modalTitle: { fontWeight: '700', fontSize: 17, color: COLORS.ink, marginTop: 8 },
  modalSub: { fontSize: 11, color: COLORS.muted2, marginTop: 4, marginBottom: 16 },
  modalLabel: { fontSize: 12, fontWeight: '600', color: COLORS.muted, marginBottom: 6, marginTop: 10 },
  modalInput: { borderWidth: 1, borderColor: COLORS.rule, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: COLORS.ink },
  modalError: { fontSize: 12, color: COLORS.coral, marginTop: 10 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalBtnGhost: { flex: 1, paddingVertical: 11, borderRadius: 8, borderWidth: 1, borderColor: COLORS.rule, alignItems: 'center' },
  modalBtnGhostText: { fontWeight: '600', fontSize: 13, color: COLORS.muted },
  modalBtnPrimary: { flex: 1, paddingVertical: 11, borderRadius: 8, backgroundColor: COLORS.indigo, alignItems: 'center' },
  modalBtnPrimaryText: { fontWeight: '600', fontSize: 13, color: '#fff' },
});