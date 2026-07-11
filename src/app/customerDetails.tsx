/**
 * CustomerDetails.tsx
 * Full customer detail screen — mobile / tablet / 1024 / 1440 / desktop
 * React Native + Expo + TypeScript
 * No external icon libraries — Bootstrap SVG paths only
 */

import AdminLayout from "@/components/admin-layout";
import Pagination from "@/components/Pagination";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatDate } from "@/lib/format";
import {
  downloadCustomerOrderHistoryExcel,
  downloadCustomerOrderHistoryPdf,
  fetchCustomerDetail,
} from "@/services/customerApi";
import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
export type Customer = {
  id: number;
  name: string;
  email: string;
  phone: string;
  orders: number;
  totalSpent: number;
  lastOrder: string | null;
  status: "Active" | "Inactive";
  registeredOn?: string;
  lastLogin?: string;
  billingAddress?: Address;
  shippingAddress?: Address;
  orderHistory?: Order[];
  monthlySpending?: MonthlyData[];
};

type Address = { line1: string; line2?: string; city: string; state: string; pincode: string; country?: string };
type Order = {
  orderId: number;
  orderNumber: string;
  date: string;
  items: number;
  amount: number;
  payment: string;
  paymentStatus?: string;
  status: "Ordered" | "Processing" | "Delivered" | "Cancelled" | "Returned" /*| "Replacement"*/;
};
type MonthlyData = { month: string; amount: number };

// ─────────────────────────────────────────────────────────────────────────────
// PALETTE
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg:            "#FFFFFF",
  surface:       "#FFFFFF",
  cardBg:        "#FFFFFF",
  primary:       "#ef7b1a",
  primaryLight:  "#FFF0EA",
  navy:          "#151D4F",
  text:          "#1C2B4A",
  sub:           "#6B7280",
  border:        "#E8E2D9",
  active:        "#10B981",
  activeLight:   "#ECFDF5",
  inactive:      "#EF4444",
  inactiveLight: "#FEF2F2",
  green:         "#10B981",
  red:           "#EF4444",
  avatarPalette: ["#ef7b1a", "#1C2B4A", "#10B981", "#8B5CF6", "#F59E0B", "#3B82F6"],
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return C.avatarPalette[Math.abs(h) % C.avatarPalette.length];
}
function rupee(n: number) { return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2 }); }
function rupeeShort(n: number) {
  if (n >= 100000) return "₹" + (n / 100000).toFixed(1) + "L";
  if (n >= 1000)   return "₹" + (n / 1000).toFixed(1) + "K";
  return "₹" + n;
}
function useLayout(w: number) {
  return {
    isXs: w < 375,            // e.g., 320
    isSm: w >= 375 && w < 425,
    isMd: w >= 425 && w < 768,
    isMobile: w < 768,
    isTablet: w >= 768 && w < 1024,
    isDesktop: w >= 1024 && w < 1440,
    isLargeDesktop: w >= 1440,
    isWide: w >= 768,
    cols: w < 768 ? 1 : w < 1280 ? 2 : 3,
  };
}

// Builds a compact page-number list with ellipses for large page counts,
// e.g. [1, "…", 4, 5, 6, "…", 12]
function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

function mapApiCustomerDetail(data: Record<string, unknown>): Customer {
  const address: Address | undefined = data.address1
    ? {
        line1: String(data.address1 ?? ""),
        line2: data.address2 ? String(data.address2) : undefined,
        city: String(data.city ?? ""),
        state: String(data.state ?? ""),
        pincode: String(data.pincode ?? ""),
        country: data.country ? String(data.country) : undefined,
      }
    : undefined;

  const orderHistory: Order[] = Array.isArray(data.orders)
    ? (data.orders as Record<string, unknown>[]).map((o) => ({
        orderId: Number(o.id ?? o.orderId ?? 0),
        orderNumber: String(o.orderNumber ?? o.id ?? "—"),
        date: formatDate(String(o.createdAt ?? "")),
        items: Number(o.itemCount ?? 0),
        amount: Number(o.totalAmount ?? 0),
        payment: formatPaymentLabel(String(o.paymentMethod ?? "")),
        paymentStatus: o.paymentStatus ? String(o.paymentStatus) : undefined,
        status: mapOrderStatus(String(o.orderStatus ?? "")),
      }))
    : [];

  const monthlySpending: MonthlyData[] = Array.isArray(data.monthlySpending)
    ? (data.monthlySpending as Record<string, unknown>[]).map((m) => ({
        month: String(m.month ?? ""),
        amount: Number(m.amount ?? 0),
      }))
    : [];

  return {
    id: Number(data.id ?? 0),
    name: String(data.name ?? "Customer"),
    email: String(data.email ?? ""),
    phone: String(data.phone ?? ""),
    orders: Number(data.orderCount ?? 0),
    totalSpent: Number(data.totalSpent ?? 0),
    lastOrder: data.lastOrderAt ? formatDate(String(data.lastOrderAt)) : null,
    status: "Active",
    registeredOn: data.firstOrderAt ? formatDate(String(data.firstOrderAt)) : undefined,
    lastLogin: "Never",
    billingAddress: address,
    shippingAddress: address,
    orderHistory,
    monthlySpending,
  };
}

function formatPaymentLabel(method: string) {
  const normalized = method.toLowerCase();
  if (normalized.includes("cod") || normalized.includes("cash")) return "COD";
  if (!method) return "Online";
  return method.charAt(0).toUpperCase() + method.slice(1);
}

function mapOrderStatus(status: string): Order["status"] {
  const normalized = status.toLowerCase();
  if (normalized.includes("deliver"))  return "Delivered";
  if (normalized.includes("cancel"))   return "Cancelled";
  if (normalized.includes("return"))   return "Returned";
  if (normalized.includes("process") || normalized.includes("ship") || normalized.includes("pending")) {
    return "Processing";
  }
  return "Ordered";
}

function openOrderDetails(router: ReturnType<typeof useRouter>, orderId: number) {
  const id = Number(orderId);
  if (!id || Number.isNaN(id)) return;
  router.push(`/orderDetails?orderId=${id}`);
}

async function exportOrderHistoryFallback(customer: Customer, isMobileView: boolean) {
  let csvContent = "Customer Name,Customer ID,Status,Orders,Total Spent,Last Order\n";
  csvContent += `"${customer.name}","${customer.id}","${customer.status}","${customer.orders}","${customer.totalSpent}","${customer.lastOrder ?? "N/A"}"\n\n`;
  csvContent += "Order #,Date,Items,Amount,Payment,Status\n";
  (customer.orderHistory || []).forEach((o) => {
    csvContent += `"${o.orderNumber}","${o.date}","${o.items}","${o.amount}","${o.payment}","${o.status}"\n`;
  });

  const XLSX = require("xlsx");
  const workbook = XLSX.read(csvContent, { type: "string" });
  const fileName = `Customer_${customer.id}_Export.xlsx`;

  if (typeof document !== "undefined" && typeof navigator !== "undefined" && navigator.product !== "ReactNative") {
    XLSX.writeFile(workbook, fileName);
    return;
  }

  const base64 = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });

  const directory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!directory) {
    console.error("Unable to access local storage for download.");
    return;
  }
  
  const fileUri = `${directory}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: fileName,
      UTI: "com.microsoft.excel.xls",
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────────────────────────────────────
type IP = { size?: number; color?: string };
const BackIcon       = ({ size = 20, color = "#fff" }: IP) => <Svg width={size} height={size} viewBox="0 0 16 16"><Path fill={color} d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"/></Svg>;
const InfoIcon       = ({ size = 18, color = C.primary }: IP) => <Svg width={size} height={size} viewBox="0 0 16 16"><Path fill={color} d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2"/></Svg>;
const EnvelopeIcon   = ({ size = 16, color = C.primary }: IP) => <Svg width={size} height={size} viewBox="0 0 16 16"><Path fill={color} d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1zm13 2.383-4.708 2.825L15 11.105zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741M1 11.105l4.708-1.897L1 6.383z"/></Svg>;
const PhoneIcon      = ({ size = 16, color = C.primary }: IP) => <Svg width={size} height={size} viewBox="0 0 16 16"><Path fill={color} d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.6 17.6 0 0 0 4.168 6.608 17.6 17.6 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.68.68 0 0 0-.58-.122l-2.19.547a1.75 1.75 0 0 1-1.657-.459L5.482 8.062a1.75 1.75 0 0 1-.46-1.657l.548-2.19a.68.68 0 0 0-.122-.58z"/></Svg>;
const CalendarIcon   = ({ size = 16, color = C.primary }: IP) => <Svg width={size} height={size} viewBox="0 0 16 16"><Path fill={color} d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z"/></Svg>;
const MemberIcon     = ({ size = 16, color = C.primary }: IP) => <Svg width={size} height={size} viewBox="0 0 16 16"><Path fill={color} d="M6 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m-5 6s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1zm5-6a2 2 0 1 1 0-4 2 2 0 0 1 0 4M11 3.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5m.5 2.5a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1zm2 3a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1zm0 3a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1z"/></Svg>;
const LoginIcon      = ({ size = 16, color = C.primary }: IP) => <Svg width={size} height={size} viewBox="0 0 16 16"><Path fill={color} d="M6 3.5a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-2a.5.5 0 0 0-1 0v2A1.5 1.5 0 0 0 6.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-8A1.5 1.5 0 0 0 5 3.5v2a.5.5 0 0 0 1 0z"/><Path fill={color} d="M11.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H1.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708z"/></Svg>;
const MapPinIcon     = ({ size = 16, color = C.primary }: IP) => <Svg width={size} height={size} viewBox="0 0 16 16"><Path fill={color} d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6"/></Svg>;
const WalletIcon     = ({ size = 18, color = C.primary }: IP) => <Svg width={size} height={size} viewBox="0 0 16 16"><Path fill={color} d="M0 3a2 2 0 0 1 2-2h13.5a.5.5 0 0 1 0 1H15v2a1 1 0 0 1 1 1v8.5a1.5 1.5 0 0 1-1.5 1.5h-12A2.5 2.5 0 0 1 0 12.5zm1 1.732V12.5A1.5 1.5 0 0 0 2.5 14h12a.5.5 0 0 0 .5-.5V5H2a2 2 0 0 1-1-.268M1 3a1 1 0 0 0 1 1h12V2H2a1 1 0 0 0-1 1"/></Svg>;
const CartIcon       = ({ size = 18, color = C.primary }: IP) => <Svg width={size} height={size} viewBox="0 0 16 16"><Path fill={color} d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5M3.102 4l1.313 7h8.17l1.313-7zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4m7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4m-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2m7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/></Svg>;
const EyeIcon        = ({ size = 15, color = "#fff" }: IP) => <Svg width={size} height={size} viewBox="0 0 16 16"><Path fill={color} d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"/><Path fill={color} d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/></Svg>;
const BarChartIcon   = ({ size = 18, color = C.primary }: IP) => <Svg width={size} height={size} viewBox="0 0 16 16"><Path fill={color} d="M4 11H2v3h2zm5-4H7v7h2zm5-5h-2v12h2zm-2-1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM6 7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zm-5 4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1z"/></Svg>;
const BagIcon        = ({ size = 18, color = C.primary }: IP) => <Svg width={size} height={size} viewBox="0 0 16 16"><Path fill={color} d="M14 10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h1.5a.5.5 0 0 0 0-1H3a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-1.5a.5.5 0 0 0 0 1H13a1 1 0 0 1 1 1zM8.5 1a.5.5 0 0 0-1 0V4H6a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1H8.5z"/></Svg>;
const BackupIcon     = ({ size = 15, color = "#fff" }: IP) => <Svg width={size} height={size} viewBox="0 0 16 16"><Path fill={color} d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/><Path fill={color} d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"/></Svg>;
const DeleteIcon     = ({ size = 15, color = "#fff" }: IP) => <Svg width={size} height={size} viewBox="0 0 16 16"><Path fill={color} d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/><Path fill={color} d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/></Svg>;
const ViewAllIcon    = ({ size = 15, color = "#fff" }: IP) => <Svg width={size} height={size} viewBox="0 0 16 16"><Path fill={color} d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.128.334L10 8.692V13.5a.5.5 0 0 1-.342.474l-3 1A.5.5 0 0 1 6 14.5V8.692L1.628 3.834A.5.5 0 0 1 1.5 3.5zm1 .5v1.308l4.372 4.858A.5.5 0 0 1 7 8.5v5.306l2-.666V8.5a.5.5 0 0 1 .128-.334L13.5 3.308V2z"/></Svg>;
const CheckIcon      = ({ size = 14, color = C.green }: IP) => <Svg width={size} height={size} viewBox="0 0 16 16"><Path fill={color} d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/></Svg>;
const CodIcon        = ({ size = 14, color = C.sub }: IP) => <Svg width={size} height={size} viewBox="0 0 16 16"><Path fill={color} d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4"/><Path fill={color} d="M0 4a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1zm3 0a2 2 0 0 1-2 2v4a2 2 0 0 1 2 2h10a2 2 0 0 1 2-2V6a2 2 0 0 1-2-2z"/></Svg>;

// ── New icons for the order-status overview cards ──────────────────────────
const ClockIcon      = ({ size = 16, color = C.primary }: IP) => <Svg width={size} height={size} viewBox="0 0 16 16"><Path fill={color} d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71zM8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16zm7-8A7 7 0 1 0 1 8a7 7 0 0 0 14 0z"/></Svg>;
const BanIcon         = ({ size = 16, color = C.red }: IP) => <Svg width={size} height={size} viewBox="0 0 16 16"><Path fill={color} d="M15 8a6.97 6.97 0 0 0-1.71-4.584l-9.874 9.875A7 7 0 0 0 15 8M2.71 12.584l9.874-9.875a7 7 0 0 0-9.874 9.875M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0"/></Svg>;
const ReplyIcon       = ({ size = 16, color = C.primary }: IP) => <Svg width={size} height={size} viewBox="0 0 16 16"><Path fill={color} d="M5.921 11.9 1.353 8.62a.719.719 0 0 1 0-1.238L5.921 4.1A.716.716 0 0 1 7 4.719V6c1.5 0 6 0 7 8-2.5-4.5-7-4-7-4v1.281c0 .56-.606.898-1.079.62z"/></Svg>;
const SwapIcon        = ({ size = 16, color = C.primary }: IP) => <Svg width={size} height={size} viewBox="0 0 16 16"><Path fill={color} d="M1 11.5a.5.5 0 0 0 .5.5h11.793l-3.147 3.146a.5.5 0 0 0 .708.708l4-4a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 11H1.5a.5.5 0 0 0-.5.5zm14-7a.5.5 0 0 1-.5.5H2.707l3.147 3.146a.5.5 0 1 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 4H14.5a.5.5 0 0 1 .5.5z"/></Svg>;

// ── Pagination chevrons ─────────────────────────────────────────────────────
const ChevronLeftIcon  = ({ size = 14, color = C.text }: IP) => <Svg width={size} height={size} viewBox="0 0 16 16"><Path fill={color} d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0"/></Svg>;
const ChevronRightIcon = ({ size = 14, color = C.text }: IP) => <Svg width={size} height={size} viewBox="0 0 16 16"><Path fill={color} d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"/></Svg>;

// ─────────────────────────────────────────────────────────────────────────────
// CARD WRAPPER
// ─────────────────────────────────────────────────────────────────────────────
function Card({ children, style, themed }: { children: React.ReactNode; style?: object; themed?: boolean }) {
  return <View style={[s.card, themed && s.themedCard, style]}>{children}</View>;
}
function CardHeader({ icon, title, right, isMobile, themed, navyHeader }: { icon: React.ReactNode; title: string; right?: React.ReactNode; isMobile?: boolean; themed?: boolean; navyHeader?: boolean }) {
  return (
    <View style={[s.cardHeader, themed && s.themedCardHeader, navyHeader && s.navyCardHeader, isMobile && { flexDirection: "column", alignItems: "flex-start" }]}>
      <View style={s.cardHeaderLeft}>
        <View style={[s.cardIconBox, themed && s.themedCardIconBox, navyHeader && s.navyCardIconBox]}>{icon}</View>
        <Text style={[s.cardTitle, themed && s.themedCardTitle, navyHeader && s.navyCardTitle]}>{title}</Text>
      </View>
      {right && <View style={isMobile ? { width: "100%", marginTop: 10 } : {}}>{right}</View>}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AVATAR / STATUS PILL / ORDER STATUS PILL
// ─────────────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 72 }: { name: string; size?: number }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: avatarColor(name) }]}>
      <Text style={[s.avatarTxt, { fontSize: size * 0.36 }]}>{initials}</Text>
    </View>
  );
}
function StatusPill({ status }: { status: "Active" | "Inactive" }) {
  const on = status === "Active";
  return (
    <View style={[s.pill, { backgroundColor: on ? C.activeLight : C.inactiveLight }]}>
      <View style={[s.pillDot, { backgroundColor: on ? C.active : C.inactive }]} />
      <Text style={[s.pillTxt, { color: on ? C.active : C.inactive }]}>{status}</Text>
    </View>
  );
}
function OrderStatusPill({ status }: { status: Order["status"] }) {
  const map: Record<Order["status"], { bg: string; color: string }> = {
    Ordered:     { bg: C.primaryLight,  color: C.primary },
    Processing:  { bg: "#E0E7FF",       color: C.navy    },
    Delivered:   { bg: C.activeLight,   color: C.green   },
    Cancelled:   { bg: C.inactiveLight, color: C.red     },
    Returned:    { bg: "#F3E8FF",       color: "#8B5CF6" },
    // Replacement: { bg: C.primaryLight,  color: C.primary },
  };
  const { bg, color } = map[status];
  return (
    <View style={[s.orderStatus, { backgroundColor: bg, borderColor: color }]}>
      <CheckIcon size={12} color={color} />
      <Text style={[s.orderStatusTxt, { color }]}>{status}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MINI STAT CARD  (overlapping order-status cards under the header)
// ─────────────────────────────────────────────────────────────────────────────
function MiniStatCard({
  icon,
  iconBg,
  value,
  label,
  valueColor = C.text,
}: {
  icon: React.ReactNode;
  iconBg: string;
  value: string | number;
  label: string;
  valueColor?: string;
}) {
  const { width } = useWindowDimensions();
  const { isMobile, isTablet } = useLayout(width);

  if (isMobile) {
    // Compact fixed-width card — fits in a single horizontal scroll row
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

  // Allow cards to flex evenly without wrapping into a second row on tablet
  const flexBasis = "15%";

  return (
    <View style={[s.statCard, { flexBasis }]}>
      <View style={[s.statCardIconBox, { backgroundColor: iconBg }]}>{icon}</View>
      <Text style={[s.statCardValue, { color: valueColor }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={s.statCardLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INFO ROW / SPENDING BAR / ADDRESS
// ─────────────────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <View style={s.infoIconBox}>{icon}</View>
      <View style={s.infoText}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
      </View>
    </View>
  );
}
function SpendingBar({ label, amount, max }: { label: string; amount: number; max: number }) {
  const pct = max > 0 ? Math.round((amount / max) * 100) : 0;
  return (
    <View style={s.spendBar}>
      <View style={s.spendBarTop}>
        <Text style={s.spendBarLabel}>{label}</Text>
        <Text style={s.spendBarAmt}>{rupee(amount)}</Text>
      </View>
      <View style={s.spendTrack}>
        <View style={[s.spendFill, { width: `${pct}%` as any }]} />
      </View>
    </View>
  );
}
function AddressBlock({ title, addr }: { title: string; addr?: Address }) {
  return (
    <View style={s.addrBlock}>
      <Text style={s.addrTitle}>{title}</Text>
      {addr ? (
        <View style={s.addrBody}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}>
            <MapPinIcon size={14} color={C.primary} />
            <View style={{ flex: 1 }}>
              <Text style={s.addrLine}>{addr.line1}</Text>
              {addr.line2 ? <Text style={s.addrLine}>{addr.line2}</Text> : null}
              <Text style={s.addrLine}>{addr.city}, {addr.state} — {addr.pincode}</Text>
              {addr.country ? <Text style={s.addrLine}>{addr.country}</Text> : null}
            </View>
          </View>
        </View>
      ) : (
        <Text style={s.addrEmpty}>No address on file</Text>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ★  DYNAMIC SPENDING CHART  ★
//
// • Fully responsive — measures its own container width via onLayout
// • Tap any dot/bar to see an interactive tooltip with exact value
// • Active months highlighted; zero-months show subtle floor dot
// • Gradient area fill, smooth bezier line
// • Summary strip: Active Months / Peak Month / Year Total
// • TrendBadge now compares last active month vs prev active month
//   (not just last 2 items which are almost always 0)
// ─────────────────────────────────────────────────────────────────────────────

function SpendingChart({ data }: { data: MonthlyData[] }) {
  const [containerW, setContainerW] = useState(0);
  const [activeIdx, setActiveIdx]   = useState<number | null>(null);

  const H    = 180;
  const padL = 38;  // left pad for Y labels
  const padR = 10;
  const padT = 28;
  const padB = 30;

  const W = containerW > 0 ? containerW : 300;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const maxVal  = Math.max(...data.map((d) => d.amount), 1);
  const n       = data.length;
  const step    = chartW / (n - 1);
  const peakIdx = data.reduce((pi, d, i) => (d.amount > data[pi].amount ? i : pi), 0);

  const pts = data.map((d, i) => ({
    x: padL + i * step,
    y: padT + (1 - d.amount / maxVal) * chartH,
    amount: d.amount,
    month: d.month,
    active: d.amount > 0,
    i,
  }));

  // Y axis grid values (4 lines)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: padT + (1 - f) * chartH,
    label: rupeeShort(Math.round(maxVal * f)),
  }));

  // Smooth bezier path
  function bezierPath(points: typeof pts) {
    if (points.length < 2) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const c1x = points[i].x + step / 3;
      const c1y = points[i].y;
      const c2x = points[i + 1].x - step / 3;
      const c2y = points[i + 1].y;
      d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${points[i + 1].x} ${points[i + 1].y}`;
    }
    return d;
  }
  const linePath = bezierPath(pts);
  const areaPath = linePath + ` L ${pts[pts.length - 1].x} ${padT + chartH} L ${pts[0].x} ${padT + chartH} Z`;

  // Selected point tooltip
  const sel = activeIdx !== null ? pts[activeIdx] : null;

  // Summary stats
  const activePts    = data.filter((d) => d.amount > 0);
  const yearTotal    = data.reduce((s, d) => s + d.amount, 0);
  const peakMonth    = data[peakIdx];

  // ── Trend: compare last two ACTIVE months ────────────────────────────────
  const activeSorted = data.filter((d) => d.amount > 0);
  let trendLabel = "No data";
  let trendColor = C.sub;
  let trendBg    = "#F3F4F6";
  let trendArrow = "–";
  if (activeSorted.length >= 2) {
    const last = activeSorted[activeSorted.length - 1].amount;
    const prev = activeSorted[activeSorted.length - 2].amount;
    const pct  = Math.round(((last - prev) / prev) * 100);
    if (last > prev)      { trendLabel = `+${pct}% vs prev`; trendColor = C.green; trendBg = C.activeLight;   trendArrow = "↑"; }
    else if (last < prev) { trendLabel = `${pct}% vs prev`;  trendColor = C.red;   trendBg = C.inactiveLight; trendArrow = "↓"; }
    else                  { trendLabel = "No change";        trendColor = C.sub;   trendBg = "#F3F4F6";       trendArrow = "→"; }
  } else if (activeSorted.length === 1) {
    trendLabel = "First purchase"; trendColor = C.primary; trendBg = C.primaryLight; trendArrow = "★";
  }

  return (
    <View>
      {/* ── Trend pill — meaningful comparison ──────────────────────────── */}
      <View style={ch.trendRow}>
        <View style={[ch.trendPill, { backgroundColor: trendBg }]}>
          <Text style={[ch.trendArrow, { color: trendColor }]}>{trendArrow}</Text>
          <Text style={[ch.trendTxt, { color: trendColor }]}>{trendLabel}</Text>
        </View>
        {sel && (
          <View style={ch.selPill}>
            <Text style={ch.selPillTxt}>{sel.month}: {rupee(sel.amount)}</Text>
          </View>
        )}
      </View>

      {/* ── SVG Chart ────────────────────────────────────────────────────── */}
      <View onLayout={(e: LayoutChangeEvent) => setContainerW(e.nativeEvent.layout.width)}>
        {containerW > 0 && (
          <Svg width={W} height={H}>
            <Defs>
              <LinearGradient id="chartArea" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%"   stopColor={C.primary} stopOpacity="0.25" />
                <Stop offset="100%" stopColor={C.primary} stopOpacity="0.02" />
              </LinearGradient>
              <LinearGradient id="chartLine" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%"   stopColor="#F59E0B" />
                <Stop offset="50%"  stopColor={C.primary} />
                <Stop offset="100%" stopColor="#8B5CF6" />
              </LinearGradient>
            </Defs>

            {/* Y axis grid lines + labels */}
            {yTicks.map((t, i) => (
              <React.Fragment key={i}>
                <Line x1={padL} y1={t.y} x2={W - padR} y2={t.y}
                  stroke={i === 0 ? C.border : "#F0EBE3"}
                  strokeWidth={i === 0 ? "1" : "0.8"}
                  strokeDasharray={i === 0 ? "0" : "4,3"} />
                <SvgText x={padL - 4} y={t.y + 3.5}
                  textAnchor="end" fill={C.sub} fontSize="8" fontWeight="500">
                  {t.label}
                </SvgText>
              </React.Fragment>
            ))}

            {/* Vertical drop line for selected point */}
            {sel && (
              <Line x1={sel.x} y1={padT} x2={sel.x} y2={padT + chartH}
                stroke={C.primary} strokeWidth="1" strokeDasharray="4,3" strokeOpacity="0.5" />
            )}

            {/* Area fill */}
            <Path d={areaPath} fill="url(#chartArea)" />

            {/* Line */}
            <Path d={linePath} fill="none" stroke="url(#chartLine)"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Dots — tappable */}
            {pts.map((p) => (
              <React.Fragment key={p.i}>
                {p.active ? (
                  <>
                    {/* Outer glow for peak or selected */}
                    {(p.i === peakIdx || p.i === activeIdx) && (
                      <Circle cx={p.x} cy={p.y} r="11"
                        fill={p.i === activeIdx ? C.primary : C.primary} fillOpacity="0.12" />
                    )}
                    <Circle cx={p.x} cy={p.y} r={p.i === activeIdx ? 7 : 5}
                      fill={p.i === peakIdx ? C.primary : "#fff"}
                      stroke={C.primary} strokeWidth="2.5" />
                    {p.i === peakIdx && p.i !== activeIdx && (
                      <Circle cx={p.x} cy={p.y} r="2.5" fill="#fff" />
                    )}
                  </>
                ) : (
                  <Circle cx={p.x} cy={padT + chartH} r="2.5" fill="#E8E2D9" />
                )}
                {/* Invisible hit area for tap */}
                <Circle cx={p.x} cy={p.active ? p.y : padT + chartH} r="16"
                  fill="transparent"
                  onPress={() => setActiveIdx(activeIdx === p.i ? null : p.i)} />
              </React.Fragment>
            ))}

            {/* Tooltip bubble for selected */}
            {sel && sel.active && (() => {
              const bW = 68, bH = 26, bR = 7, bX = Math.min(Math.max(sel.x - bW / 2, padL), W - padR - bW);
              const bY = sel.y - bH - 10;
              const tipX = Math.max(bX + 8, Math.min(sel.x, bX + bW - 8));
              return (
                <>
                  <Path
                    d={`M${bX + bR} ${bY} H${bX + bW - bR} Q${bX + bW} ${bY} ${bX + bW} ${bY + bR} V${bY + bH - bR} Q${bX + bW} ${bY + bH} ${bX + bW - bR} ${bY + bH} H${tipX + 6} L${tipX} ${bY + bH + 7} L${tipX - 6} ${bY + bH} H${bX + bR} Q${bX} ${bY + bH} ${bX} ${bY + bH - bR} V${bY + bR} Q${bX} ${bY} ${bX + bR} ${bY} Z`}
                    fill={C.navy}
                  />
                  <SvgText x={bX + bW / 2} y={bY + bH / 2 + 1}
                    textAnchor="middle" fill="#fff" fontSize="9.5" fontWeight="700">
                    {rupee(sel.amount)}
                  </SvgText>
                </>
              );
            })()}

            {/* X axis month labels */}
            {pts.map((p) => (
              <SvgText key={p.i} x={p.x} y={H - 6}
                textAnchor="middle"
                fill={p.i === activeIdx ? C.primary : p.active ? C.text : "#C4B8AC"}
                fontSize="8.5"
                fontWeight={p.i === activeIdx || p.i === peakIdx ? "700" : "400"}>
                {p.month}
              </SvgText>
            ))}
          </Svg>
        )}
      </View>

      {/* ── Tap hint ─────────────────────────────────────────────────────── */}
      <Text style={ch.hint}>Tap any point to see details</Text>

      {/* ── Summary strip ────────────────────────────────────────────────── */}
      <View style={ch.strip}>
        <View style={ch.stripItem}>
          <Text style={ch.stripVal}>{activePts.length}</Text>
          <Text style={ch.stripLbl}>Active Months</Text>
        </View>
        <View style={ch.stripDiv} />
        <View style={ch.stripItem}>
          <Text style={ch.stripVal}>{peakMonth ? rupeeShort(peakMonth.amount) : "–"}</Text>
          <Text style={ch.stripLbl}>Peak ({peakMonth?.month})</Text>
        </View>
        <View style={ch.stripDiv} />
        <View style={ch.stripItem}>
          <Text style={ch.stripVal}>{rupeeShort(yearTotal)}</Text>
          <Text style={ch.stripLbl}>Year Total</Text>
        </View>
      </View>
    </View>
  );
}

const ch = StyleSheet.create({
  trendRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  trendPill:  { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20 },
  trendArrow: { fontSize: 14, fontWeight: "700" },
  trendTxt:   { fontSize: 12, fontWeight: "600" },
  selPill:    { backgroundColor: C.navy, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  selPillTxt: { color: "#fff", fontSize: 12, fontWeight: "700" },
  hint:       { fontSize: 10, color: C.sub, textAlign: "center", marginTop: 4, marginBottom: 10 },
  strip:      { flexDirection: "row", alignItems: "center", backgroundColor: C.cardBg, borderRadius: 12, paddingVertical: 12, marginTop: 4 },
  stripItem:  { flex: 1, alignItems: "center" },
  stripVal:   { fontSize: 14, fontWeight: "700", color: C.text },
  stripLbl:   { fontSize: 10, color: C.sub, marginTop: 2 },
  stripDiv:   { width: 1, height: 28, backgroundColor: C.border },
});

// ─────────────────────────────────────────────────────────────────────────────
// PAGINATION BAR  (matches the customerManagement.tsx pattern)
// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
type Props = { customer?: Customer; onBack?: () => void };

const ORDERS_PER_PAGE = 10;

export default function CustomerDetailScreen({ customer: customerProp, onBack: onBackProp }: Props) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width }                               = useWindowDimensions();
  const { isMobile, isTablet, isDesktop, cols, isWide } = useLayout(width);

  const [customer, setCustomer] = useState<Customer | null>(customerProp ?? null);
  const [loading, setLoading] = useState(Boolean(id) && !customerProp);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const onBack = onBackProp ?? (() => router.back());

  const loadCustomer = useCallback(async () => {
    const customerId = Number(id);
    if (!id || Number.isNaN(customerId)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchCustomerDetail(customerId);
      setCustomer(mapApiCustomerDetail(data));
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load customer."));
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadCustomer();
    } else if (customerProp) {
      setCustomer(customerProp);
    }
  }, [id, customerProp, loadCustomer]);

  // Reset to page 1 whenever we land on a different customer
  useEffect(() => {
    setCurrentPage(1);
  }, [id]);

  const handleViewOrder = useCallback(
    (orderId: number) => openOrderDetails(router, orderId),
    [router]
  );

  const px  = isMobile ? 14 : isTablet ? 20 : 28;

  if (loading) {
    return (
      <AdminLayout>
        <View style={[s.stateBox, { flex: 1 }]}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={s.stateText}>Loading customer…</Text>
        </View>
      </AdminLayout>
    );
  }

  if (error || !customer) {
    return (
      <AdminLayout>
        <View style={[s.stateBox, { flex: 1 }]}>
          <Text style={s.errorText}>{error ?? "Customer not found"}</Text>
          <TouchableOpacity
            style={s.retryBtn}
            onPress={() => (error ? loadCustomer() : onBack())}
            activeOpacity={0.8}
          >
            <Text style={s.retryBtnText}>{error ? "Retry" : "Go Back"}</Text>
          </TouchableOpacity>
        </View>
      </AdminLayout>
    );
  }

  const c = customer;

  const handleDownload = async () => {
    try {
      await downloadCustomerOrderHistoryExcel(c.id, `Customer_${c.id}_Export.xlsx`);
    } catch (err) {
      console.error("Order history export failed:", err);
      try {
        await exportOrderHistoryFallback(c, isMobile);
      } catch (fallbackErr) {
        console.error("Fallback export failed:", fallbackErr);
      }
    }
  };

  const monthlyData: MonthlyData[] = c.monthlySpending ?? [];
  const weekly   = monthlyData.length
    ? monthlyData[monthlyData.length - 1]?.amount ?? 0
    : 0;
  const monthly  = monthlyData.reduce((sum, m) => sum + m.amount, 0);
  const yearly   = c.totalSpent;
  const maxSpend = Math.max(weekly, monthly, yearly, 1);
  const avgOrder = c.orders > 0 ? c.totalSpent / c.orders : 0;

  // ── Order-status breakdown for the overlapping stat cards ────────────────
  const orderList    = c.orderHistory ?? [];
  const totalOrders  = c.orders;
  const statusCounts = {
    pending:     orderList.filter((o) => o.status === "Ordered").length,
    processing:  orderList.filter((o) => o.status === "Processing").length,
    delivered:   orderList.filter((o) => o.status === "Delivered").length,
    cancelled:   orderList.filter((o) => o.status === "Cancelled").length,
    returned:    orderList.filter((o) => o.status === "Returned").length,
    // replacement: orderList.filter((o) => o.status === "Replacement").length,
  };

  // ── Order History pagination ──────────────────────────────────────────────
  const totalOrderRecords = orderList.length;
  const totalOrderPages   = Math.max(1, Math.ceil(totalOrderRecords / ORDERS_PER_PAGE));
  const safePage           = Math.min(currentPage, totalOrderPages);
  const paginatedOrders    = orderList.slice((safePage - 1) * ORDERS_PER_PAGE, safePage * ORDERS_PER_PAGE);
  const rangeStart         = totalOrderRecords === 0 ? 0 : (safePage - 1) * ORDERS_PER_PAGE + 1;
  const rangeEnd           = Math.min(safePage * ORDERS_PER_PAGE, totalOrderRecords);

  const memberDays = (() => {
    if (!c.registeredOn) return "N/A";
    const parts = c.registeredOn.split(" ");
    if (parts.length < 3) return "N/A";
    const d = new Date(`${parts[1]} ${parts[0]} ${parts[2]}`);
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
    return `${diff} day${diff !== 1 ? "s" : ""}`;
  })();

  const OrderHistoryActions = (
    <View style={s.orderActions}>
      <TouchableOpacity 
        style={[s.orderActionBtn, { backgroundColor: C.green }]} 
        activeOpacity={0.8}
        onPress={handleDownload}
      >
        <BackupIcon size={13} /><Text style={s.orderActionTxt}>Export</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[s.orderActionBtn, { backgroundColor: C.primary }]}
        activeOpacity={0.8}
        onPress={() =>
          router.push({
            pathname: "/customerAnalytics",
            params: {
              id: String(c.id),
              name: c.name,
              email: c.email,
              phone: c.phone,
            },
          })
        }
      >
        <BarChartIcon size={13} color="#fff" /><Text style={s.orderActionTxt}>View Analytics</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <AdminLayout>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ══ HEADER — floats with margin, rounded on all corners (now scrolls) ══ */}
        <View style={{ alignSelf: "center", width: "100%", maxWidth: 1600, paddingHorizontal: px, backgroundColor: "#FFFFFF" }}>
          <View
            style={[
              s.header,
              {
                paddingTop: Platform.OS === "ios" ? 50 : 16,
                marginTop: isMobile ? 12 : 18,
              },
            ]}
          >
          <View style={[s.headerInner, { paddingHorizontal: isMobile ? 16 : 22 }]}>
            <View style={s.headerLeft}>
              <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.8}>
                <BackIcon size={18} color="#fff" />
              </TouchableOpacity>
              <View>
                <Text style={[s.hTitle, { fontSize: isMobile ? 15 : 19 }]}>Customer Details</Text>
                <Text style={s.hSub}>#{c.id} · {c.name}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ══ OVERLAPPING ORDER-STATUS STAT CARDS ════════════════════════ */}
        {isMobile ? (
          // Mobile: single horizontally-scrollable row (matches customerManagement)
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.statCardsScrollContent}
            style={[s.statCardsWrapMobile]}
          >
            <MiniStatCard
              icon={<CartIcon color={C.navy} size={13} />}
              iconBg="rgba(29,50,78,0.08)"
              value={totalOrders}
              label="Total Orders"
              valueColor={C.navy}
            />
            <MiniStatCard
              icon={<BagIcon color="#3B82F6" size={13} />}
              iconBg="#EFF6FF"
              value={statusCounts.pending}
              label="Pending"
              valueColor="#3B82F6"
            />
            <MiniStatCard
              icon={<ClockIcon color="#CA8A04" size={13} />}
              iconBg="#FEF9C3"
              value={statusCounts.processing}
              label="Processing"
              valueColor="#CA8A04"
            />
            <MiniStatCard
              icon={<CheckIcon color={C.green} size={13} />}
              iconBg={C.activeLight}
              value={statusCounts.delivered}
              label="Delivered"
              valueColor={C.green}
            />
            <MiniStatCard
              icon={<BanIcon color={C.red} size={13} />}
              iconBg={C.inactiveLight}
              value={statusCounts.cancelled}
              label="Cancelled"
              valueColor={C.red}
            />
            <MiniStatCard
              icon={<ReplyIcon color="#8B5CF6" size={13} />}
              iconBg="#F3E8FF"
              value={statusCounts.returned}
              label="Returned"
              valueColor="#8B5CF6"
            />
          </ScrollView>
        ) : (
          // Tablet / Desktop: existing wrapped row — unchanged
          <View style={[s.statCardsWrap, { paddingHorizontal: 10 }]}>
            <MiniStatCard
              icon={<CartIcon color={C.navy} size={15} />}
              iconBg="rgba(29,50,78,0.08)"
              value={totalOrders}
              label="Total Orders"
              valueColor={C.navy}
            />
            <MiniStatCard
              icon={<BagIcon color="#3B82F6" size={15} />}
              iconBg="#EFF6FF"
              value={statusCounts.pending}
              label="Pending"
              valueColor="#3B82F6"
            />
            <MiniStatCard
              icon={<ClockIcon color="#CA8A04" size={15} />}
              iconBg="#FEF9C3"
              value={statusCounts.processing}
              label="Processing"
              valueColor="#CA8A04"
            />
            <MiniStatCard
              icon={<CheckIcon color={C.green} size={15} />}
              iconBg={C.activeLight}
              value={statusCounts.delivered}
              label="Delivered"
              valueColor={C.green}
            />
            <MiniStatCard
              icon={<BanIcon color={C.red} size={15} />}
              iconBg={C.inactiveLight}
              value={statusCounts.cancelled}
              label="Cancelled"
              valueColor={C.red}
            />
            <MiniStatCard
              icon={<ReplyIcon color="#8B5CF6" size={15} />}
              iconBg="#F3E8FF"
              value={statusCounts.returned}
              label="Returned"
              valueColor="#8B5CF6"
            />
            {/* <MiniStatCard
              icon={<SwapIcon color={C.primary} size={15} />}
              iconBg={C.primaryLight}
              value={statusCounts.replacement}
              label="Replacement"
              valueColor={C.primary}
            /> */}
          </View>
        )}
      </View>

<View style={[s.body, { maxWidth: 1600, alignSelf: "center", width: "100%", paddingHorizontal: px }]}>
          {/* Profile card */}
          <Card style={[s.profileCard, isMobile && { padding: 14, gap: 12 }]}>
            <View style={[s.profileInner, isMobile && { gap: 12 }]}>
              <Avatar name={c.name} size={isMobile ? 48 : 84} />
              <View style={s.profileInfo}>
                <Text style={[s.profileName, isMobile && { fontSize: 15 }]} numberOfLines={1}>{c.name}</Text>
                <View style={[s.profileMeta, isMobile && { gap: 6, marginTop: 4 }]}>
                  <Text style={[s.profileId, isMobile && { fontSize: 11 }]}>Customer #{c.id}</Text>
                  <View style={s.metaDot} />
                  <StatusPill status={c.status} />
                </View>
              </View>
            </View>
            <View style={s.profileStatRow}>
              <View style={s.profileStat}>
                <Text style={[s.profileStatVal, { color: c.orders > 0 ? C.primary : C.sub }, isMobile && { fontSize: 14 }]}>{c.orders}</Text>
                <Text style={s.profileStatLbl}>Orders</Text>
              </View>
              <View style={s.profileStatDiv} />
              <View style={s.profileStat}>
                <Text
                  style={[s.profileStatVal, isMobile && { fontSize: 13 }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {rupee(c.totalSpent)}
                </Text>
                <Text style={s.profileStatLbl}>Total Spent</Text>
              </View>
              <View style={s.profileStatDiv} />
              <View style={s.profileStat}>
                <Text
                  style={[s.profileStatVal, { fontSize: isMobile ? 11 : 15 }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {c.lastOrder ?? "N/A"}
                </Text>
                <Text style={s.profileStatLbl}>Last Order</Text>
              </View>
            </View>
          </Card>

          {/* Contact + Address */}
          <View style={[s.row, !isWide && { flexDirection: "column" }]}>
            <Card themed style={isWide ? s.col6 : s.col12}>
              <View style={[s.cardBodyCompact, { paddingTop: 18 }]}>
                <View style={s.cardInlineTitleWrap}>
                  <InfoIcon color={C.navy} />
                  <Text style={s.cardInlineTitle}>Contact Information</Text>
                </View>
                <InfoRow icon={<EnvelopeIcon />} label="Email"         value={c.email} />
                <InfoRow icon={<PhoneIcon />}    label="Phone"         value={c.phone} />
                <InfoRow icon={<CalendarIcon />} label="Registered"    value={c.registeredOn ?? "N/A"} />
                <InfoRow icon={<MemberIcon />}   label="Member For"    value={memberDays} />
                <InfoRow icon={<LoginIcon />}    label="Last Login"    value={c.lastLogin ?? "Never"} />
              </View>
            </Card>
            <Card themed style={isWide ? s.col6 : s.col12}>
              <View style={[s.cardBodyCompact, { paddingTop: 18 }]}>
                <View style={s.cardInlineTitleWrap}>
                  <MapPinIcon color={C.navy} />
                  <Text style={s.cardInlineTitle}>Customer Addresses</Text>
                </View>
                <AddressBlock title="Billing Address"  addr={c.billingAddress} />
                <View style={s.addrDivider} />
                <AddressBlock title="Shipping Address" addr={c.shippingAddress} />
              </View>
            </Card>
          </View>

          {/* Spending + Chart */}
          <View style={[s.row, !isWide && { flexDirection: "column" }]}>
            <Card themed style={isWide ? s.col6 : s.col12}>
              <View style={[s.cardBody, { paddingTop: 18 }]}>
                <View style={s.cardInlineTitleWrap}>
                  <WalletIcon color={C.navy} />
                  <Text style={s.cardInlineTitle}>Spending Statistics</Text>
                </View>
                <View style={s.spendChipRow}>
                  <View style={s.spendChip}>
                    <CartIcon size={15} color={C.primary} />
                    <View>
                      <Text style={s.spendChipVal}>{c.orders}</Text>
                      <Text style={s.spendChipLbl}>Total Orders</Text>
                    </View>
                  </View>
                  <View style={[s.spendChip, { flex: 1.3 }]}>
                    <WalletIcon size={15} color={C.primary} />
                    <View>
                      <Text style={s.spendChipVal}>{rupee(c.totalSpent)}</Text>
                      <Text style={s.spendChipLbl}>Total Spent</Text>
                    </View>
                  </View>
                </View>
                <View style={{ gap: 12, marginTop: 4 }}>
                  <SpendingBar label="Weekly Spending"  amount={weekly}  max={maxSpend} />
                  <SpendingBar label="Monthly Spending" amount={monthly} max={maxSpend} />
                  <SpendingBar label="Yearly Spending"  amount={yearly}  max={maxSpend} />
                </View>
                <View style={s.avgBox}>
                  <Text style={s.avgLabel}>Average Order Value</Text>
                  <Text style={s.avgVal}>{rupee(avgOrder)}</Text>
                </View>
              </View>
            </Card>

            {/* ── Dynamic Chart Card ─────────────────────────────────────── */}
            <Card themed style={isWide ? s.col6 : s.col12}>
              <View style={[s.cardBody, { paddingBottom: 14, flex: 1, paddingTop: 18 }]}>
                <View style={s.cardInlineTitleWrap}>
                  <BarChartIcon color={C.navy} />
                  <Text style={s.cardInlineTitle}>Monthly Spending Analysis</Text>
                </View>
                {monthlyData.length > 0
                  ? <SpendingChart data={monthlyData} />
                  : <Text style={s.noData}>No spending data available</Text>
                }
              </View>
            </Card>
          </View>

          {/* Order History */}
          <Card>
            <CardHeader navyHeader icon={<BagIcon color="#FFFFFF" />} title="Order History" right={OrderHistoryActions} isMobile={isMobile} />
            <View style={s.cardBody}>
              {c.orderHistory && c.orderHistory.length > 0 ? (
                <>
                  {isMobile ? (
                    paginatedOrders.map((o) => (
                      <View key={o.orderId} style={s.orderMobileCard}>
                        {/* Top Row */}
                        <View style={s.omHeader}>
                          <TouchableOpacity 
                            style={{ flex: 1, marginRight: 10 }} 
                            onPress={() => handleViewOrder(o.orderId)}
                            activeOpacity={0.7}
                          >
                            <Text style={[s.omId, { flex: 0, marginRight: 0 }]} numberOfLines={1}>{o.orderNumber}</Text>
                          </TouchableOpacity>
                          <OrderStatusPill status={o.status} />
                        </View>
                        
                        {/* Middle Sections */}
                        <View style={s.omBody}>
                          <Text style={s.omDateTxt}>{o.date}</Text>
                          <Text style={s.omAmountTxt}>{rupee(o.amount)}</Text>
                          
                          <View style={s.omMetaRow}>
                            <View style={s.omMetaBadge}>
                              <Feather name="package" size={13} color={C.sub} style={{ marginRight: 2 }} />
                              <Text style={s.omMetaTxt}>{o.items} item{o.items !== 1 ? "s" : ""}</Text>
                            </View>
                            <View style={s.omMetaBadge}>
                              <Feather name="credit-card" size={13} color={C.sub} style={{ marginRight: 2 }} />
                              <Text style={s.omMetaTxt}>{o.payment}</Text>
                            </View>
                          </View>
                        </View>

                        {/* Bottom Row */}
                        <TouchableOpacity
                          style={s.orderViewBtn}
                          activeOpacity={0.7}
                          onPress={() => handleViewOrder(o.orderId)}
                        >
                          <View style={s.orderViewBtnLeft}>
                            <EyeIcon size={15} color={C.primary} />
                            <Text style={s.orderViewTxt}>View Order Details</Text>
                          </View>
                          <ChevronRightIcon size={14} color={C.primary} />
                        </TouchableOpacity>
                      </View>
                    ))
                  ) : (
                    <View style={s.orderTable}>
                      <View style={[s.orderTableRow, s.orderTableHead]}>
                        <Text style={[s.orderTableHdr, { flex: 2.5 }]}>Order #</Text>
                        <Text style={s.orderTableHdr}>Date</Text>
                        <Text style={s.orderTableHdr}>Items</Text>
                        <Text style={s.orderTableHdr}>Amount</Text>
                        <Text style={s.orderTableHdr}>Payment</Text>
                        <Text style={[s.orderTableHdr, { flex: 1.3 }]}>Status</Text>
                        <Text style={[s.orderTableHdr, { flex: 0.7, textAlign: "center" }]}>Action</Text>
                      </View>
                      {paginatedOrders.map((o) => (
                        <View key={o.orderId} style={s.orderTableRow}>
                          <TouchableOpacity 
                            style={{ flex: 2.5 }} 
                            onPress={() => handleViewOrder(o.orderId)}
                            activeOpacity={0.7}
                          >
                            <Text style={[s.orderIdText, { flex: 0 }]}>{o.orderNumber}</Text>
                          </TouchableOpacity>
                          <Text style={s.orderTableCell}>{o.date}</Text>
                          <View style={{ flex: 1 }}>
                            <View style={s.itemsBadge}><CartIcon size={12} color={C.primary} /><Text style={s.itemsBadgeTxt}>{o.items} item{o.items !== 1 ? "s" : ""}</Text></View>
                          </View>
                          <Text style={[s.orderTableCell, { fontWeight: "700", color: C.text }]}>{rupee(o.amount)}</Text>
                          <View style={{ flex: 1 }}>
                            <View style={s.codBadge}><CodIcon size={13} /><Text style={s.codTxt}>{o.payment}</Text></View>
                          </View>
                          <View style={{ flex: 1.3 }}><OrderStatusPill status={o.status} /></View>
                          <View style={{ flex: 0.7, alignItems: "center" }}>
                            <TouchableOpacity
                              style={s.eyeBtn}
                              activeOpacity={0.8}
                              accessibilityLabel="View order"
                              onPress={() => handleViewOrder(o.orderId)}
                            >
                              <EyeIcon size={15} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  <Pagination
                    currentPage={safePage}
                    totalPages={totalOrderPages}
                    totalItems={totalOrderRecords}
                    itemsPerPage={ORDERS_PER_PAGE}
                    itemName="orders"
                    onPageChange={setCurrentPage}
                  />
                </>
              ) : (
                <View style={s.noOrders}>
                  <Text style={{ fontSize: 32 }}>📦</Text>
                  <Text style={s.noOrdersTxt}>No orders yet</Text>
                </View>
              )}
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
  scroll:        { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: { paddingTop: 0, backgroundColor: "#FFFFFF" },
  body:          { gap: 16 },
  header: { marginHorizontal: 2, marginTop: 12, backgroundColor: C.navy, paddingBottom: 44, borderRadius: 24 },
  headerInner:   { flexDirection: "row", alignItems: "center" },
  headerLeft:    { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  backBtn:       { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  hTitle:        { color: "#fff", fontWeight: "700", letterSpacing: -0.3 },
  hSub:          { color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 1 },

  // Overlapping order-status stat cards
  statCardsWrap:           { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: -30, marginBottom: 16 },
  // Mobile: horizontal scroll strip (overlaps the navy header)
  statCardsWrapMobile:     { marginTop: -24, marginBottom: 14, paddingHorizontal: 10 },
  statCardsScrollContent:  { flexDirection: "row", gap: 7, paddingRight: 10 },
  statCard:                { flexGrow: 1, flexShrink: 1, alignItems: "center", backgroundColor: C.surface, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 8, borderWidth: 1, borderColor: C.border, shadowColor: "#000", shadowOpacity: 0.06, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 3, gap: 4 },
  statCardIconBox:         { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  statCardValue:           { fontSize: 15, fontWeight: "800" },
  statCardLabel:           { fontSize: 10, fontWeight: "600", color: C.sub, textAlign: "center" },
  // Compact card — mobile horizontal scroll row
  statCardCompact:         { width: 82, alignItems: "center", backgroundColor: C.surface, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 4, borderWidth: 1, borderColor: C.border, shadowColor: "#000", shadowOpacity: 0.06, shadowOffset: { width: 0, height: 3 }, shadowRadius: 6, elevation: 3, gap: 4 },
  statCardIconBoxCompact:  { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  statCardValueCompact:    { fontSize: 14, fontWeight: "800" },
  statCardLabelCompact:    { fontSize: 9, fontWeight: "600", color: C.sub, textAlign: "center" },

  card:           { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, shadowColor: "#000", shadowOpacity: 0.05, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 3, overflow: "hidden" },
  cardHeader:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border, flexWrap: "wrap", gap: 10 },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardIconBox:    { width: 32, height: 32, borderRadius: 9, backgroundColor: C.primaryLight, alignItems: "center", justifyContent: "center" },
  cardTitle:      { fontSize: 15, fontWeight: "700", color: C.text },
  cardBody:       { padding: 18, gap: 10 },
  cardBodyCompact:{ padding: 14, gap: 6 },
  row:            { flexDirection: "row", gap: 16 },
  col12:          { width: "100%", backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, shadowColor: "#000", shadowOpacity: 0.05, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 3, overflow: "hidden" },
  col6:           { flexBasis: "48%", flexGrow: 1, flexShrink: 1, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, shadowColor: "#000", shadowOpacity: 0.05, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 3, overflow: "hidden" },

  themedCard:           { borderColor: C.primary, borderWidth: 1 },
  themedCardHeader:     { backgroundColor: "#F9FAFB", borderBottomColor: C.border },
  themedCardTitle:      { color: C.navy },
  themedCardIconBox:    { backgroundColor: "rgba(21,29,79,0.08)" },
  navyCardHeader:       { backgroundColor: C.navy, borderBottomColor: C.navy },
  navyCardTitle:        { color: "#FFFFFF" },
  navyCardIconBox:      { backgroundColor: "rgba(255,255,255,0.15)" },
  cardInlineTitleWrap:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  cardInlineTitle:      { fontSize: 16, fontWeight: "700", color: C.navy },

  avatar:    { alignItems: "center", justifyContent: "center" },
  avatarTxt: { color: "#fff", fontWeight: "700" },
  pill:      { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pillDot:   { width: 6, height: 6, borderRadius: 3 },
  pillTxt:   { fontSize: 11, fontWeight: "700" },

  profileCard:    { padding: 20, gap: 16 },
  profileInner:   { flexDirection: "row", alignItems: "center", gap: 18 },
  profileInfo:    { flex: 1 },
  profileName:    { fontSize: 20, fontWeight: "800", color: C.text },
  profileMeta:    { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 },
  profileId:      { fontSize: 13, color: C.sub },
  metaDot:        { width: 4, height: 4, borderRadius: 2, backgroundColor: C.border },
  profileStatRow: { flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: C.border, paddingTop: 14 },
  profileStat:    { flex: 1, alignItems: "center", paddingVertical: 4 },
  profileStatVal: { fontSize: 16, fontWeight: "700", color: C.text },
  profileStatLbl: { fontSize: 11, color: C.sub, marginTop: 3 },
  profileStatDiv: { width: 1, height: 36, backgroundColor: C.border },

  infoRow:     { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F5F0EA" },
  infoIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: C.primaryLight, alignItems: "center", justifyContent: "center" },
  infoText:    { flex: 1, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 4 },
  infoLabel:   { fontSize: 12, color: C.sub },
  infoValue:   { fontSize: 13, fontWeight: "600", color: C.text, textAlign: "right" },

  addrBlock:   { gap: 4 },
  addrTitle:   { fontSize: 12, fontWeight: "700", color: C.text },
  addrBody:    { backgroundColor: C.cardBg, borderRadius: 8, padding: 10 },
  addrLine:    { fontSize: 12, color: C.sub, lineHeight: 18 },
  addrEmpty:   { fontSize: 12, color: C.sub, fontStyle: "italic" },
  addrDivider: { height: 1, backgroundColor: C.border },

  spendChipRow: { flexDirection: "row", gap: 10, marginBottom: 6 },
  spendChip:    { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.cardBg, borderRadius: 12, padding: 12 },
  spendChipVal: { fontSize: 15, fontWeight: "700", color: C.text },
  spendChipLbl: { fontSize: 11, color: C.sub },
  spendBar:     { gap: 6 },
  spendBarTop:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  spendBarLabel:{ fontSize: 12, color: C.sub },
  spendBarAmt:  { fontSize: 13, fontWeight: "700", color: C.text },
  spendTrack:   { height: 8, backgroundColor: "#F0EBE3", borderRadius: 4, overflow: "hidden" },
  spendFill:    { height: "100%", backgroundColor: C.primary, borderRadius: 4 },
  avgBox:       { backgroundColor: C.cardBg, borderRadius: 12, padding: 14, marginTop: 8, alignItems: "center" },
  avgLabel:     { fontSize: 12, color: C.sub },
  avgVal:       { fontSize: 22, fontWeight: "800", color: C.primary, marginTop: 4 },

  noData: { fontSize: 13, color: C.sub, textAlign: "center", paddingVertical: 24 },

  orderActions:      { flexDirection: "row", gap: 8 },
  orderActionBtn:    { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9 },
  orderActionTxt:    { color: "#fff", fontSize: 12, fontWeight: "700" },
  orderActionsMobile:{},
  orderActionBtnMobile:{},

  orderTable:     { borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: C.border },
  orderTableHead: { backgroundColor: C.cardBg },
  orderTableRow:  { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border },
  orderTableHdr:  { flex: 1, fontSize: 11, fontWeight: "700", color: C.sub, textTransform: "uppercase", letterSpacing: 0.4 },
  orderTableCell: { flex: 1, fontSize: 13, color: C.sub },
  orderIdText:    { fontSize: 13, fontWeight: "700", color: C.primary },
  itemsBadge:     { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.primaryLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: "flex-start" },
  itemsBadgeTxt:  { fontSize: 12, color: C.primary, fontWeight: "600" },
  codBadge:       { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#F3F4F6", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: "flex-start" },
  codTxt:         { fontSize: 12, color: C.sub, fontWeight: "600" },
  eyeBtn:         { width: 36, height: 36, borderRadius: 10, backgroundColor: C.navy, alignItems: "center", justifyContent: "center" },

  // Pagination bar (Order History)
  paginationBar:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16, paddingVertical: 12, marginTop: 8 },
  paginationText:     { fontSize: 13, color: C.sub },
  paginationControls: { flexDirection: "row", alignItems: "center", gap: 8 },
  pageBtn:            { width: 32, height: 32, borderRadius: 9, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", backgroundColor: C.surface },
  pageBtnDisabled:    { opacity: 0.4 },
  pageNumBtn:         { width: 32, height: 32, borderRadius: 9, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", backgroundColor: C.surface },
  pageNumBtnActive:   { backgroundColor: C.navy, borderColor: C.navy },
  pageNumTxt:         { fontSize: 13, fontWeight: "700", color: C.text },
  pageNumTxtActive:   { color: "#fff" },
  pageEllipsis:       { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  pageEllipsisTxt:    { fontSize: 13, color: C.sub, fontWeight: "700" },

  orderStatus:    { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, alignSelf: "flex-start" },
  orderStatusTxt: { fontSize: 11, fontWeight: "700" },

  orderMobileCard:  { backgroundColor: C.surface, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: C.border, shadowColor: "#000", shadowOpacity: 0.05, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 3, marginBottom: 16 },
  omHeader:         { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  omId:             { fontSize: 14, fontWeight: "700", color: C.primary, flex: 1, marginRight: 10 },
  omBody:           { paddingHorizontal: 16, paddingBottom: 14, gap: 2 },
  omDateTxt:        { fontSize: 12, color: C.sub },
  omAmountTxt:      { fontSize: 18, fontWeight: "800", color: C.text, marginTop: 2, marginBottom: 6 },
  omMetaRow:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  omMetaBadge:      { flexDirection: "row", alignItems: "center", gap: 4 },
  omMetaTxt:        { fontSize: 13, color: C.sub, fontWeight: "600" },
  orderViewBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, backgroundColor: "#FDFBF9", borderTopWidth: 1, borderTopColor: C.border },
  orderViewBtnLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  orderViewTxt:     { color: C.primary, fontSize: 13, fontWeight: "700", letterSpacing: 0.2 },

  // Legacy compat
  orderMobileTopRow:{}, orderMobileDivider:{}, orderMobileGrid:{},
  orderMobileCell:{}, orderMobileLbl:{}, orderMobileVal:{},

  noOrders:    { alignItems: "center", paddingVertical: 32, gap: 8 },
  noOrdersTxt: { fontSize: 14, color: C.sub },

  stateBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12,
    backgroundColor: C.bg,
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