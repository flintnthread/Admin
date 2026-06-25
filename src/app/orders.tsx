import { getApiErrorMessage } from "@/lib/api/client";
import type { OrderSummary } from "@/lib/api/types";
import { mapOrderRow } from "@/lib/mappers";
import { resolveMediaUrl } from "@/lib/api/media";
import { fetchOrders, fetchOrderStats, fetchOrderInvoice, downloadOrderInvoicePdf, updateOrderGstStatus, fetchOrderExportCsv, type OrderInvoice, type OrderStats } from "@/services/orderApi";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, { Circle, Line, Path, Polyline, Rect } from "react-native-svg";
import AdminLayout from "../components/admin-layout";

// ─── Color Palette ────────────────────────────────────────────────────────────

// ─── Design Tokens ────────────────────────────────────────────────────────────
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

// ─── Types ────────────────────────────────────────────────────────────────────
type PaymentType = "Cash on Delivery" | "Online Payment" | "UPI" | "Card";
type OrderStatus =
  | "Processing"
  | "Pending"
  | "Completed"
  | "Cancelled"
  | "Shipped"
  | "Returned"
  | "Replacement";
type GSTStatus = "Filed" | "Not Filed";
type ViewMode = "grid" | "list";
type SortOption = "newest" | "oldest" | "amount_high" | "amount_low";
type DocModalType = "invoice" | "label" | null;

interface Product {
  id: string;
  name: string;
  image: string;
  seller: string;
  sellerEmail: string;
  price?: number;
  // ── Invoice-specific fields (optional — fall back gracefully if absent) ──
  hsnCode?: string;
  color?: string;
  size?: string;
  taxPercent?: number; // e.g. 5 for 5%
  qty?: number;
}

interface SellerAddress {
  line1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  gstin?: string;
}

interface SellerGroup {
  seller: { name: string; email: string; address?: SellerAddress };
  products: Product[];
  subOrderId?: string;
  trackingId?: string;
  hasInvoice: boolean;
  hasShippingLabel: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  time: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  sellerGroups: SellerGroup[];
  amount: number;
  paymentType: PaymentType;
  status: OrderStatus;
  gstStatus: GSTStatus;
  // True when buyer & seller are in the same state → CGST+SGST split.
  // False (default) → inter-state → IGST.
  isIntraState?: boolean;
  // Shipping-label specific physical details (optional, falls back gracefully)
  weightKg?: number;
  dimensionsCm?: { l: number; w: number; h: number };
}

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<
  OrderStatus,
  { bg: string; text: string; dot: string }
> = {
  Processing: { bg: C.bluePale, text: C.blue, dot: C.blue },
  Pending: { bg: C.yellowPale, text: C.yellow, dot: C.yellow },
  Completed: { bg: C.greenPale, text: C.green, dot: C.green },
  Cancelled: { bg: C.redPale, text: C.red, dot: C.red },
  Shipped: { bg: "#F5F3FF", text: "#7C3AED", dot: "#7C3AED" },
  Returned: { bg: C.redPale, text: C.red, dot: C.red },
  Replacement: { bg: C.bluePale, text: C.blue, dot: C.blue },
};

const STATUS_FILTERS = [
  "All",
  "Processing",
  "Pending",
  "Completed",
  "Shipped",
  "Cancelled",
  "Returned",
  "Replacement",
];
const PAYMENT_FILTERS = [
  "All Payments",
  "Cash on Delivery",
  "Online Payment",
  "UPI",
  "Card",
];
const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: "newest", label: "Newest First" },
  { key: "oldest", label: "Oldest First" },
  { key: "amount_high", label: "Amount (High to Low)" },
  { key: "amount_low", label: "Amount (Low to High)" },
];

const ORDERS_PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtCur = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatInvoiceDate(value?: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function flattenInvoiceLineItems(invoice: OrderInvoice) {
  return (invoice.sellerGroups ?? []).flatMap((group) =>
    (group.products ?? []).map((product) => ({
      ...product,
      sellerName: group.seller?.name ?? "Seller",
    }))
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildInvoiceDownloadHtml(invoice: OrderInvoice) {
  const company = invoice.company;
  const billing = invoice.billing;
  const shippingAddr = invoice.shipping;
  const firstGroup = invoice.sellerGroups?.[0];
  const seller = firstGroup?.seller;
  const sellerAddress = seller?.address;
  const lineItems = flattenInvoiceLineItems(invoice);
  const subtotal = toNumber(invoice.totals?.subtotal);
  const totalTax = toNumber(invoice.totals?.tax);
  const shipping = toNumber(invoice.totals?.shipping);
  const grandTotal = toNumber(invoice.totals?.grandTotal);
  const isIntraState = Boolean(invoice.isIntraState);
  const cgst = toNumber(invoice.gstBreakdown?.cgst);
  const sgst = toNumber(invoice.gstBreakdown?.sgst);
  const igst = toNumber(invoice.gstBreakdown?.igst);
  const qrImg = invoice.qrCode?.imageDataUrl ?? "";

  const itemRows = lineItems
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.name ?? "—")}</td>
        <td style="text-align:center">${escapeHtml(item.hsnCode ?? "—")}</td>
        <td style="text-align:right">${item.qty ?? 0}</td>
        <td style="text-align:right">${fmtCur(toNumber(item.unitPrice))}</td>
        <td style="text-align:right">${toNumber(item.taxPercent)}%</td>
        <td style="text-align:right">${fmtCur(toNumber(item.taxAmount))}</td>
        <td style="text-align:right">${fmtCur(toNumber(item.lineTotal))}</td>
      </tr>`
    )
    .join("");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; color: #111827; padding: 24px; }
          h1 { color: #1E2B6B; margin: 0 0 4px; }
          .meta { color: #6B7280; font-size: 13px; margin-bottom: 18px; }
          .grid { display: flex; gap: 24px; margin-bottom: 20px; }
          .col { flex: 1; }
          .label { font-size: 11px; font-weight: 700; color: #F97316; letter-spacing: 0.5px; }
          .name { font-weight: 700; margin: 4px 0; }
          .muted { color: #6B7280; font-size: 13px; line-height: 1.5; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
          th, td { border-bottom: 1px solid #E5E7EB; padding: 8px 6px; vertical-align: top; }
          th { background: #FFF7ED; text-align: left; }
          .totals { margin-top: 18px; width: 320px; margin-left: auto; }
          .totals div { display: flex; justify-content: space-between; padding: 6px 0; }
          .grand { font-size: 16px; font-weight: 800; border-top: 2px solid #1E2B6B; margin-top: 8px; padding-top: 8px; }
          .qr { width: 88px; height: 88px; }
        </style>
      </head>
      <body>
        <div style="display:flex; justify-content:space-between; gap:20px;">
          <div>
            <h1>INVOICE</h1>
            <div class="meta">${escapeHtml(invoice.invoiceNumber ?? "")}</div>
            <div class="meta">Order: ${escapeHtml(invoice.orderNumber ?? "")}</div>
            <div class="meta">Date: ${escapeHtml(formatInvoiceDate(invoice.invoiceDate ?? invoice.orderDate))}</div>
            <div class="muted" style="margin-top:12px;">
              <strong>${escapeHtml(company?.name ?? "")}</strong><br/>
              ${escapeHtml(company?.country ?? "")}<br/>
              Phone: ${escapeHtml(company?.phone ?? "")}<br/>
              Email: ${escapeHtml(company?.email ?? "")}<br/>
              GSTIN: ${escapeHtml(company?.gstin ?? "")}
            </div>
          </div>
          ${qrImg ? `<img class="qr" src="${qrImg}" alt="Order QR" />` : ""}
        </div>

        <div class="grid">
          <div class="col">
            <div class="label">SOLD BY</div>
            <div class="name">${escapeHtml(seller?.name ?? "Seller")}</div>
            <div class="muted">
              ${escapeHtml(sellerAddress?.line1 ?? "")}<br/>
              ${escapeHtml([sellerAddress?.city, sellerAddress?.state].filter(Boolean).join(", "))}
              ${sellerAddress?.pincode ? ` - ${escapeHtml(sellerAddress.pincode)}` : ""}<br/>
              ${seller?.phone ? `Phone: ${escapeHtml(seller.phone)}<br/>` : ""}
              ${seller?.email ? `Email: ${escapeHtml(seller.email)}<br/>` : ""}
              ${seller?.gstin ? `GSTIN: ${escapeHtml(seller.gstin)}` : ""}
            </div>
          </div>
        </div>

        <div class="grid">
          <div class="col">
            <div class="label">BILL TO</div>
            <div class="name">${escapeHtml(billing?.name ?? "—")}</div>
            <div class="muted">
              ${escapeHtml(billing?.address ?? billing?.line1 ?? "")}<br/>
              ${escapeHtml([billing?.city, billing?.state].filter(Boolean).join(", "))}
              ${billing?.pincode ? ` - ${escapeHtml(billing.pincode)}` : ""}<br/>
              Phone: ${escapeHtml(billing?.phone ?? "—")}<br/>
              Email: ${escapeHtml(billing?.email ?? "—")}
            </div>
          </div>
          <div class="col">
            <div class="label">SHIP TO</div>
            <div class="name">${escapeHtml(shippingAddr?.name ?? "—")}</div>
            <div class="muted">
              ${escapeHtml(shippingAddr?.address ?? shippingAddr?.line1 ?? "")}<br/>
              ${escapeHtml([shippingAddr?.city, shippingAddr?.state].filter(Boolean).join(", "))}
              ${shippingAddr?.pincode ? ` - ${escapeHtml(shippingAddr.pincode)}` : ""}<br/>
              Phone: ${escapeHtml(shippingAddr?.phone ?? "—")}<br/>
              Email: ${escapeHtml(shippingAddr?.email ?? "—")}
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>HSN</th>
              <th style="text-align:right">Qty</th>
              <th style="text-align:right">Unit Price</th>
              <th style="text-align:right">Tax %</th>
              <th style="text-align:right">Tax Amt</th>
              <th style="text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>

        <div class="totals">
          <div><span>Subtotal</span><span>${fmtCur(subtotal)}</span></div>
          <div><span>${isIntraState ? "CGST + SGST" : "IGST"}</span><span>${fmtCur(totalTax)}</span></div>
          <div><span>Shipping</span><span>${shipping === 0 ? "FREE" : fmtCur(shipping)}</span></div>
          <div class="grand"><span>Grand Total</span><span>${fmtCur(grandTotal)}</span></div>
        </div>

        <div class="muted" style="margin-top:18px;">
          CGST: ${fmtCur(cgst)} | SGST: ${fmtCur(sgst)} | IGST: ${fmtCur(igst)}<br/>
          Payment: ${escapeHtml(invoice.payment?.method ?? "—")} |
          Status: ${escapeHtml(invoice.payment?.status ?? "—")}
        </div>
      </body>
    </html>
  `;
}

async function downloadInvoiceFile(invoice: OrderInvoice) {
  const safeName = (invoice.invoiceNumber ?? `invoice-${invoice.orderId}`)
    .replace(/[^\w.-]+/g, "_");
  const fileName = `${safeName}.pdf`;

  if (invoice.orderId) {
    if (Platform.OS === "web") {
      await downloadOrderInvoicePdf(invoice.orderId, fileName);
      return;
    }

    const html = buildInvoiceDownloadHtml(invoice);
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: fileName,
        UTI: "com.adobe.pdf",
      });
      return;
    }

    Alert.alert("Invoice saved", uri);
    return;
  }

  if (Platform.OS === "web" && typeof document !== "undefined") {
    const html = buildInvoiceDownloadHtml(invoice);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeName}.html`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  const html = buildInvoiceDownloadHtml(invoice);
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: fileName,
      UTI: "com.adobe.pdf",
    });
    return;
  }

  Alert.alert("Invoice saved", uri);
}
const getInitials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

// ─── Mapper ───────────────────────────────────────────────────────────────────
function mapStatusFilterToApi(filter: string): string | undefined {
  if (filter === "All") return undefined;
  const map: Record<string, string> = {
    Processing: "processing",
    Pending: "pending",
    Completed: "delivered",
    Shipped: "shipped",
    Cancelled: "cancelled",
    Returned: "returned",
    Replacement: "replacement",
  };
  return map[filter] ?? filter.toLowerCase();
}

function mapPaymentFilterToApi(filter: string): string | undefined {
  if (filter === "All Payments") return undefined;
  const map: Record<string, string> = {
    "Cash on Delivery": "cod",
    "Online Payment": "online",
    UPI: "upi",
    Card: "card",
  };
  return map[filter];
}

export function buildSellerGroups(raw: OrderSummary): SellerGroup[] {
  if (Array.isArray(raw.sellerGroups) && raw.sellerGroups.length > 0) {
    return raw.sellerGroups.map((group, gi) => {
      const sellerName = group.seller?.name ?? "Seller";
      const addr = group.seller?.address;
      return {
        seller: {
          name: sellerName,
          email: group.seller?.email ?? addr?.email ?? "",
          address: addr
            ? {
                line1: addr.line1,
                city: addr.city,
                state: addr.state,
                pincode: addr.pincode,
                phone: addr.phone ?? group.seller?.phone,
                email: addr.email ?? group.seller?.email,
                gstin: addr.gstin ?? group.seller?.gstin,
              }
            : undefined,
        },
        products: (group.products ?? []).map((item, pi) => ({
          id: String(item.id ?? item.productId ?? `${gi}-${pi}`),
          name: item.name ?? item.productName ?? "Product",
          image: resolveMediaUrl(item.imageUrl ?? "") || "",
          seller: sellerName,
          sellerEmail: group.seller?.email ?? "",
          price:
            typeof (item as { unitPrice?: number }).unitPrice === "number"
              ? (item as { unitPrice?: number }).unitPrice
              : typeof item.price === "number"
                ? item.price
                : undefined,
          hsnCode: item.hsnCode,
          color: item.color,
          size: item.size,
          taxPercent: (item as { taxPercent?: number }).taxPercent,
          qty: item.qty ?? item.quantity ?? 1,
        })),
        trackingId: raw.trackingId ?? raw.shiprocketAwbCode ?? undefined,
        hasInvoice: true,
        hasShippingLabel: Boolean(raw.shiprocketAwbCode ?? raw.trackingId),
      };
    });
  }

  const rawItems: any[] =
    (raw as any).items ??
    (raw as any).orderItems ??
    (raw as any).products ??
    (raw as any).lineItems ??
    [];

  if (!Array.isArray(rawItems) || rawItems.length === 0) return [];

  const bySeller = new Map<string, SellerGroup>();

  const sellerEmailByName = new Map(
    (raw.sellers ?? []).map((s) => [s.name ?? "", s.email ?? ""]),
  );

  for (const item of rawItems) {
    const sellerName: string =
      item.sellerName ??
      item.seller?.businessName ??
      item.seller?.name ??
      item.shopName ??
      "Unknown Seller";
    const key = sellerName;

    if (!bySeller.has(key)) {
      bySeller.set(key, {
        seller: { name: sellerName, email: sellerEmailByName.get(sellerName) ?? "" },
        products: [],
        subOrderId: item.subOrderId ?? item.suborderId ?? undefined,
        trackingId: item.trackingId ?? item.trackingNumber ?? undefined,
        hasInvoice: Boolean(item.invoiceUrl ?? item.hasInvoice),
        hasShippingLabel: Boolean(
          item.shippingLabelUrl ?? item.hasShippingLabel,
        ),
      });
    }

    bySeller.get(key)!.products.push({
      id: String(
        item.id ??
          item.productId ??
          `${key}-${bySeller.get(key)!.products.length}`,
      ),
      name: item.productName ?? item.name ?? "",
      image:
        resolveMediaUrl(item.imageUrl ?? item.productImage ?? item.image ?? item.thumbnail ?? "") ||
        "",
      seller: sellerName,
      sellerEmail: "",
      price:
        typeof item.price === "number"
          ? item.price
          : Number(item.price ?? NaN) || undefined,
      hsnCode: item.hsnCode ?? item.hsn ?? undefined,
      color: item.color ?? undefined,
      size: item.size ?? undefined,
      taxPercent:
        typeof item.taxPercent === "number" ? item.taxPercent : undefined,
      qty: typeof item.qty === "number" ? item.qty : item.quantity ?? 1,
    });
  }

  const groups = Array.from(bySeller.values());
  if (groups.length > 0) {
    const trackingId = raw.trackingId ?? raw.shiprocketAwbCode;
    return groups.map((g) => ({
      ...g,
      trackingId,
      hasInvoice: true,
      hasShippingLabel: Boolean(trackingId),
    }));
  }
  return groups;
}

const PLACEHOLDER_PRODUCTS = [
  {
    name: "Women's Cotton Pants Regular Fit",
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200&h=200&fit=crop",
    price: 1499,
    seller: "Wugo Store",
    hsnCode: "62046200",
    color: "Beige",
    size: "M",
    taxPercent: 5,
  },
  {
    name: "Classic Crew Neck Tee",
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop",
    price: 799,
    seller: "Ishna Fashions",
    hsnCode: "61091000",
    color: "Black",
    size: "L",
    taxPercent: 5,
  },
  {
    name: "Denim Slim Fit Jacket",
    image:
      "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=200&h=200&fit=crop",
    price: 2199,
    seller: "Wugo Store",
    hsnCode: "62034200",
    color: "Indigo",
    size: "M",
    taxPercent: 12,
  },
  {
    name: "Leather Strap Watch",
    image:
      "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=200&h=200&fit=crop",
    price: 3499,
    seller: "Ishna Fashions",
    hsnCode: "91021900",
    color: "Brown",
    size: "Free Size",
    taxPercent: 18,
  },
  {
    name: "Running Sneakers",
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop",
    price: 2799,
    seller: "Wugo Store",
    hsnCode: "64041100",
    color: "White",
    size: "9",
    taxPercent: 12,
  },
  {
    name: "Wireless Earbuds",
    image:
      "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=200&h=200&fit=crop",
    price: 1999,
    seller: "Tech Bazaar",
    hsnCode: "85183000",
    color: "Black",
    size: "Free Size",
    taxPercent: 18,
  },
  {
    name: "Ceramic Coffee Mug Set",
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200&h=200&fit=crop",
    price: 599,
    seller: "Home Essentials",
    hsnCode: "69120090",
    color: "White",
    size: "Free Size",
    taxPercent: 12,
  },
  {
    name: "Yoga Mat Premium",
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop",
    price: 899,
    seller: "Tech Bazaar",
    hsnCode: "95069190",
    color: "Purple",
    size: "Free Size",
    taxPercent: 12,
  },
];

const PLACEHOLDER_SELLER_ADDRESSES: Record<string, SellerAddress> = {
  "Wugo Store": {
    line1: "Plot No. 14, Industrial Estate, Phase II",
    city: "Gurugram",
    state: "Haryana",
    pincode: "122015",
    phone: "+919812345670",
    email: "support@wugostore.in",
    gstin: "06AABCW1234L1Z5",
  },
  "Ishna Fashions": {
    line1: "HSC.NO. 6737, Kothacheruvu, 1st Ward, Dharmavaram Main Road",
    city: "Puttaparthi, Sri Sathya Sai",
    state: "Andhra Pradesh",
    pincode: "515133",
    phone: "+919966220474",
    email: "support@ishnafashions.in",
    gstin: "36AAGCF5402J1ZP",
  },
  "Tech Bazaar": {
    line1: "4th Floor, Cyber Towers, Hitech City",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500081",
    phone: "+917788990011",
    email: "support@techbazaar.in",
    gstin: "36AACTB5678K1ZQ",
  },
  "Home Essentials": {
    line1: "Warehouse 3, Logistics Park, Bhiwandi",
    city: "Thane",
    state: "Maharashtra",
    pincode: "421302",
    phone: "+919900112233",
    email: "support@homeessentials.in",
    gstin: "27AAHCH9012M1ZR",
  },
};

function buildPlaceholderSellerGroups(orderId: string): SellerGroup[] {
  const digits = orderId.replace(/\D/g, "");
  const seed = Number(digits.slice(-2)) || 0;

  const isMultiSeller = seed % 100 < 35;

  const makeGroup = (
    sellerName: string,
    items: typeof PLACEHOLDER_PRODUCTS,
    count: number,
    startIdx: number,
  ): SellerGroup => {
    const products: Product[] = [];
    for (let i = 0; i < count; i++) {
      const item = items[(startIdx + i) % items.length];
      products.push({
        id: `${orderId}-${sellerName}-p${i}`,
        name: item.name,
        image: item.image,
        seller: sellerName,
        sellerEmail: "",
        price: item.price,
        hsnCode: item.hsnCode,
        color: item.color,
        size: item.size,
        taxPercent: item.taxPercent,
        qty: 1,
      });
    }
    return {
      seller: {
        name: sellerName,
        email: PLACEHOLDER_SELLER_ADDRESSES[sellerName]?.email ?? "",
        address: PLACEHOLDER_SELLER_ADDRESSES[sellerName],
      },
      products,
      hasInvoice: true,
      hasShippingLabel: true,
    };
  };

  if (!isMultiSeller) {
    const sellers = Array.from(
      new Set(PLACEHOLDER_PRODUCTS.map((p) => p.seller)),
    );
    const sellerName = sellers[seed % sellers.length];
    const itemsForSeller = PLACEHOLDER_PRODUCTS.filter(
      (p) => p.seller === sellerName,
    );
    const itemCount = (seed % 3) + 1;
    return [makeGroup(sellerName, itemsForSeller, itemCount, seed)];
  }

  const sellers = Array.from(
    new Set(PLACEHOLDER_PRODUCTS.map((p) => p.seller)),
  );
  const sellerCount = (seed % 2) + 2;
  const groups: SellerGroup[] = [];
  for (let s = 0; s < sellerCount; s++) {
    const sellerName = sellers[(seed + s) % sellers.length];
    const itemsForSeller = PLACEHOLDER_PRODUCTS.filter(
      (p) => p.seller === sellerName,
    );
    const itemCount = ((seed + s) % 2) + 1;
    groups.push(makeGroup(sellerName, itemsForSeller, itemCount, seed + s));
  }
  return groups;
}

function toUiOrder(
  row: ReturnType<typeof mapOrderRow>,
  raw: OrderSummary,
): Order {
  const createdAt = raw.createdAt ? new Date(raw.createdAt) : null;
  const validDate = createdAt && !Number.isNaN(createdAt.getTime());
  const statusMap: Record<string, OrderStatus> = {
    processing: "Processing",
    pending: "Pending",
    confirmed: "Pending",
    completed: "Completed",
    delivered: "Completed",
    cancelled: "Cancelled",
    shipped: "Shipped",
    returned: "Returned",
    refunded: "Returned",
    replacement: "Replacement",
  };
  const paymentMap: Record<string, PaymentType> = {
    cod: "Cash on Delivery",
    cash_on_delivery: "Cash on Delivery",
    upi: "UPI",
    card: "Card",
    online: "Online Payment",
  };
  const orderNumber = row.orderId.startsWith("#")
    ? row.orderId
    : `#${row.orderId}`;
  const sellerGroups = buildSellerGroups(raw);

  const buyerState = raw.shippingState;
  const sellerState = sellerGroups[0]?.seller.address?.state;
  const isIntraState =
    buyerState && sellerState
      ? String(buyerState).toLowerCase() === String(sellerState).toLowerCase()
      : false;

  const shippingLine = [raw.shippingAddress1, raw.shippingAddress2]
    .filter((v) => v && String(v).trim())
    .join(", ");

  return {
    id: String(row.id),
    orderNumber,
    date: validDate
      ? createdAt!.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : row.date,
    time: validDate
      ? createdAt!.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "",
    customer: {
      name: row.customer,
      email: row.email,
      phone: raw.shippingPhone ?? row.phone ?? "",
      address: shippingLine || undefined,
      city: raw.shippingCity,
      state: raw.shippingState,
      pincode: raw.shippingPincode,
    },
    sellerGroups,
    amount:
      typeof raw.totalAmount === "number"
        ? raw.totalAmount
        : Number(raw.totalAmount ?? 0),
    paymentType:
      paymentMap[
        (raw.paymentMethod ?? raw.paymentStatus ?? "").toLowerCase()
      ] ?? "Cash on Delivery",
    status: statusMap[(raw.orderStatus ?? "").toLowerCase()] ?? "Pending",
    gstStatus: row.gstStatus?.toLowerCase() === "filed" ? "Filed" : "Not Filed",
    isIntraState,
    weightKg:
      typeof raw.weightKg === "number" && raw.weightKg > 0
        ? raw.weightKg
        : undefined,
    dimensionsCm: raw.dimensionsCm
      ? {
          l: Number(raw.dimensionsCm.l ?? 0),
          w: Number(raw.dimensionsCm.w ?? 0),
          h: Number(raw.dimensionsCm.h ?? 0),
        }
      : undefined,
  };
}

// ─── Mock actions ─────────────────────────────────────────────────────────────
const copyToClipboard = async (text: string) => {
  try {
    if (Platform.OS === "web" && navigator?.clipboard) {
      await navigator.clipboard.writeText(text);
    }
    Alert.alert("Copied", `${text} copied to clipboard`);
  } catch {
    Alert.alert("Copied", `${text} copied to clipboard`);
  }
};

// ─── SVG ICONS ────────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path
      d="M11 19A8 8 0 1 0 11 3a8 8 0 0 0 0 16ZM21 21l-4.35-4.35"
      stroke={C.textLight}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);
const GridIcon = ({ active }: { active: boolean }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Rect
      x="3"
      y="3"
      width="7"
      height="7"
      rx="1"
      stroke={active ? C.white : C.textMid}
      strokeWidth={2}
    />
    <Rect
      x="14"
      y="3"
      width="7"
      height="7"
      rx="1"
      stroke={active ? C.white : C.textMid}
      strokeWidth={2}
    />
    <Rect
      x="3"
      y="14"
      width="7"
      height="7"
      rx="1"
      stroke={active ? C.white : C.textMid}
      strokeWidth={2}
    />
    <Rect
      x="14"
      y="14"
      width="7"
      height="7"
      rx="1"
      stroke={active ? C.white : C.textMid}
      strokeWidth={2}
    />
  </Svg>
);
const ListIcon = ({ active }: { active: boolean }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Line
      x1="8"
      y1="6"
      x2="21"
      y2="6"
      stroke={active ? C.white : C.textMid}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Line
      x1="8"
      y1="12"
      x2="21"
      y2="12"
      stroke={active ? C.white : C.textMid}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Line
      x1="8"
      y1="18"
      x2="21"
      y2="18"
      stroke={active ? C.white : C.textMid}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Line
      x1="3"
      y1="6"
      x2="3.01"
      y2="6"
      stroke={active ? C.white : C.textMid}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Line
      x1="3"
      y1="12"
      x2="3.01"
      y2="12"
      stroke={active ? C.white : C.textMid}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Line
      x1="3"
      y1="18"
      x2="3.01"
      y2="18"
      stroke={active ? C.white : C.textMid}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);
const SortIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 6h18M7 12h10M11 18h2"
      stroke={C.navy}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);
const ExportIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
      stroke={C.white}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Polyline
      points="7 10 12 15 17 10"
      stroke={C.white}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M12 15V3" stroke={C.white} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);
const ChevronDownIcon = ({
  color = C.textLight,
  size = 14,
}: {
  color?: string;
  size?: number;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 9l6 6 6-6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
const ChevronLeftIcon = ({ color = C.textMid }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 18l-6-6 6-6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
const ChevronRightIcon = ({ color = C.textMid }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 18l6-6-6-6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
const EyeIcon = ({ color = C.white }: { color?: string }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path
      d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={2} />
  </Svg>
);
const CopyIcon = ({ color = C.textMid }: { color?: string }) => (
  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
    <Rect
      x="9"
      y="9"
      width="13"
      height="13"
      rx="2"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
const PrintIcon = ({ color = C.textMid }: { color?: string }) => (
  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
    <Polyline
      points="6 9 6 2 18 2 18 9"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Rect
      x="6"
      y="14"
      width="12"
      height="8"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
const InvoiceIcon = ({ color = C.navy }: { color?: string }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Polyline
      points="14 2 14 8 20 8"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M8 13h8M8 17h5"
      stroke={color}
      strokeWidth={1.4}
      strokeLinecap="round"
    />
  </Svg>
);
const FileIcon = ({ color = C.navy }: { color?: string }) => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Polyline
      points="14 2 14 8 20 8"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
const TruckIcon = ({ color = C.orange }: { color?: string }) => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
    <Rect
      x="1"
      y="3"
      width="15"
      height="13"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M16 8h4l3 3v5h-7V8z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="5.5" cy="18.5" r="2.5" stroke={color} strokeWidth={1.8} />
    <Circle cx="18.5" cy="18.5" r="2.5" stroke={color} strokeWidth={1.8} />
  </Svg>
);
const CheckIcon = ({ color = C.green }: { color?: string }) => (
  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
    <Path
      d="M22 11.08V12a10 10 0 1 1-5.93-9.14"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Polyline
      points="22 4 12 14.01 9 11.01"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
const ShopIcon = ({ color = C.orange }: { color?: string }) => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M3 6h18M16 10a4 4 0 0 1-8 0"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
const UserIcon = ({ color = C.textLight }: { color?: string }) => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={1.8} />
  </Svg>
);
const CalendarIcon = ({
  color = C.textLight,
  size = 16,
}: {
  color?: string;
  size?: number;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x="3"
      y="4"
      width="18"
      height="18"
      rx="2"
      stroke={color}
      strokeWidth={1.6}
    />
    <Path
      d="M16 2v4M8 2v4M3 10h18"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
    />
  </Svg>
);
const MoreIcon = ({
  color = C.textMid,
  bold = false,
}: {
  color?: string;
  bold?: boolean;
}) => (
  <Svg
    width={bold ? 18 : 16}
    height={bold ? 18 : 16}
    viewBox="0 0 24 24"
    fill="none"
  >
    <Circle cx="12" cy="5" r={bold ? 2.2 : 1} fill={color} />
    <Circle cx="12" cy="12" r={bold ? 2.2 : 1} fill={color} />
    <Circle cx="12" cy="19" r={bold ? 2.2 : 1} fill={color} />
  </Svg>
);
const CloseIcon = ({
  color = C.textMid,
  size = 18,
}: {
  color?: string;
  size?: number;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 6L6 18M6 6l12 12"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);
const DownloadIcon = ({
  color = C.green,
  size = 16,
}: {
  color?: string;
  size?: number;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Polyline
      points="7 10 12 15 17 10"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M12 15V3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);
const OrderBoxIcon = ({
  color = C.white,
  size = 16,
}: {
  color?: string;
  size?: number;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Polyline
      points="3.27 6.96 12 12.01 20.73 6.96"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 22.08V12"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </Svg>
);
// Flint & Thread monogram mark — navy "F" + orange "T" interlocking badge,
// replacing the plain navy-square "F&T" text placeholder.
const FntLogoMark = ({ size = 34 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    {/* Navy "F" stroke */}
    <Path
      d="M9 32V8h15"
      stroke={C.navy}
      strokeWidth={4.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 19h10"
      stroke={C.navy}
      strokeWidth={4.2}
      strokeLinecap="round"
    />
    {/* Orange "T" stroke, overlapping to the right */}
    <Path
      d="M19 8h13"
      stroke={C.orange}
      strokeWidth={4.2}
      strokeLinecap="round"
    />
    <Path
      d="M25.5 8v24"
      stroke={C.orange}
      strokeWidth={4.2}
      strokeLinecap="round"
    />
    {/* small accent dot where the two letterforms meet */}
    <Circle cx="19" cy="19" r="2.1" fill={C.orange} />
  </Svg>
);

const QrPlaceholderIcon = ({ size = 70 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x="2"
      y="2"
      width="7"
      height="7"
      stroke={C.textDark}
      strokeWidth={1.4}
    />
    <Rect
      x="15"
      y="2"
      width="7"
      height="7"
      stroke={C.textDark}
      strokeWidth={1.4}
    />
    <Rect
      x="2"
      y="15"
      width="7"
      height="7"
      stroke={C.textDark}
      strokeWidth={1.4}
    />
    <Rect x="4.3" y="4.3" width="2.4" height="2.4" fill={C.textDark} />
    <Rect x="17.3" y="4.3" width="2.4" height="2.4" fill={C.textDark} />
    <Rect x="4.3" y="17.3" width="2.4" height="2.4" fill={C.textDark} />
    <Rect x="12" y="2" width="2" height="2" fill={C.textDark} />
    <Rect x="12" y="6" width="2" height="2" fill={C.textDark} />
    <Rect x="12" y="12" width="2" height="2" fill={C.textDark} />
    <Rect x="16" y="12" width="2" height="2" fill={C.textDark} />
    <Rect x="20" y="12" width="2" height="2" fill={C.textDark} />
    <Rect x="12" y="16" width="2" height="2" fill={C.textDark} />
    <Rect x="12" y="20" width="2" height="2" fill={C.textDark} />
    <Rect x="16" y="20" width="2" height="2" fill={C.textDark} />
    <Rect x="20" y="16" width="2" height="2" fill={C.textDark} />
  </Svg>
);

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: OrderStatus }) => {
  const c = STATUS_CFG[status];
  return (
    <View style={[s.badge, { backgroundColor: c.bg }]}>
      <View style={[s.badgeDot, { backgroundColor: c.dot }]} />
      <Text style={[s.badgeText, { color: c.text }]}>{status}</Text>
    </View>
  );
};

// ─── GST Badge ────────────────────────────────────────────────────────────────
const GSTBadge = ({
  status,
  onMark,
}: {
  status: GSTStatus;
  onMark: () => void;
}) => {
  const filed = status === "Filed";
  const pill = (
    <View style={[s.gstBadge, filed ? s.gstBadgeFiled : s.gstBadgePending]}>
      <View
        style={[s.gstDot, { backgroundColor: filed ? C.green : C.yellow }]}
      />
      <Text
        style={[s.gstBadgeText, { color: filed ? "#15803D" : "#B45309" }]}
        numberOfLines={1}
      >
        {filed ? "GST Filed" : "GST Pending"}
      </Text>
    </View>
  );
  if (filed) return pill;
  return (
    <TouchableOpacity onPress={onMark} activeOpacity={0.75}>
      {pill}
    </TouchableOpacity>
  );
};

// ─── Sort Modal ───────────────────────────────────────────────────────────────
const SortModal = ({
  visible,
  isWeb,
  current,
  onSelect,
  onClose,
}: {
  visible: boolean;
  isWeb: boolean;
  current: SortOption;
  onSelect: (s: SortOption) => void;
  onClose: () => void;
}) => {
  if (!visible) return null;

  const content = (
    <View style={[s.sortMenu, isWeb && s.sortMenuWeb]}>
      <View style={s.sortHeader}>
        <Text style={s.sortTitle}>Sort Orders</Text>
        {isWeb && (
          <TouchableOpacity
            onPress={onClose}
            style={s.sortDismiss}
            activeOpacity={0.7}
          >
            <CloseIcon />
          </TouchableOpacity>
        )}
      </View>
      {SORT_OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.key}
          style={[s.sortItem, current === opt.key && s.sortItemActive]}
          onPress={() => {
            onSelect(opt.key);
            onClose();
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              s.sortItemText,
              current === opt.key && s.sortItemTextActive,
            ]}
          >
            {opt.label}
          </Text>
          {current === opt.key && (
            <View style={s.sortCheck}>
              <CheckIcon color={C.white} />
            </View>
          )}
        </TouchableOpacity>
      ))}
      {!isWeb && (
        <TouchableOpacity
          style={s.sortCancelBtn}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Text style={s.sortCancelText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isWeb) {
    return (
      <View style={s.sortOverlayWeb}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />
        {content}
      </View>
    );
  }

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={s.sortOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />
        {content}
      </View>
    </Modal>
  );
};

// ─── Payment Filter Modal (mirrors SortModal exactly) ────────────────────────
const PaymentModal = ({
  visible,
  isWeb,
  current,
  onSelect,
  onClose,
}: {
  visible: boolean;
  isWeb: boolean;
  current: string;
  onSelect: (p: string) => void;
  onClose: () => void;
}) => {
  if (!visible) return null;

  const content = (
    <View style={[s.sortMenu, isWeb && s.sortMenuWeb]}>
      <View style={s.sortHeader}>
        <Text style={s.sortTitle}>Filter by Payment</Text>
        {isWeb && (
          <TouchableOpacity
            onPress={onClose}
            style={s.sortDismiss}
            activeOpacity={0.7}
          >
            <CloseIcon />
          </TouchableOpacity>
        )}
      </View>
      {PAYMENT_FILTERS.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[s.sortItem, current === opt && s.sortItemActive]}
          onPress={() => {
            onSelect(opt);
            onClose();
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[s.sortItemText, current === opt && s.sortItemTextActive]}
          >
            {opt}
          </Text>
          {current === opt && (
            <View style={s.sortCheck}>
              <CheckIcon color={C.white} />
            </View>
          )}
        </TouchableOpacity>
      ))}
      {!isWeb && (
        <TouchableOpacity
          style={s.sortCancelBtn}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Text style={s.sortCancelText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isWeb) {
    return (
      <View style={s.sortOverlayWeb}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />
        {content}
      </View>
    );
  }

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={s.sortOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />
        {content}
      </View>
    </Modal>
  );
};

// ─── Action Menu (RE-THEMED: navy header + orange accents + close button) ────
const ActionMenu = ({
  order,
  visible,
  onClose,
  onView,
  onGST,
  onOpenDoc,
  isWeb,
}: {
  order: Order;
  visible: boolean;
  onClose: () => void;
  onView: (o: Order) => void;
  onGST: (id: string) => void;
  onOpenDoc: (o: Order, type: "invoice" | "label") => void;
  isWeb: boolean;
}) => {
  if (!visible) return null;

  const actions = [
    {
      label: "View Details",
      icon: <EyeIcon color={C.navy} />,
      onPress: () => {
        onClose();
        onView(order);
      },
    },
    {
      label: "Copy Order ID",
      icon: <CopyIcon />,
      onPress: () => {
        copyToClipboard(order.orderNumber);
        onClose();
      },
    },
    {
      label: "Generate Invoice",
      sub: "Preview & print invoice",
      icon: <InvoiceIcon />,
      onPress: () => {
        onOpenDoc(order, "invoice");
        onClose();
      },
    },
    {
      label: "Generate Shipping Label",
      sub: "Preview & print label",
      icon: <TruckIcon />,
      onPress: () => {
        onOpenDoc(order, "label");
        onClose();
      },
    },
    ...(order.gstStatus !== "Filed"
      ? [
          {
            label: "Mark GST Filed",
            icon: <CheckIcon color={C.orange} />,
            onPress: () => {
              onGST(order.id);
              onClose();
            },
          },
        ]
      : []),
  ];

  const menu = (
    <View style={[s.actionMenu, isWeb && s.actionMenuWeb]}>
      <View style={s.menuHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.menuTitle}>ORDER ACTIONS</Text>
          <Text style={s.menuSubtitle}>{order.orderNumber}</Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          style={s.menuCloseBtn}
          activeOpacity={0.75}
        >
          <CloseIcon color={C.white} size={16} />
        </TouchableOpacity>
      </View>

      {actions.map((a, i) => (
        <TouchableOpacity
          key={i}
          style={s.actionItem}
          onPress={a.onPress}
          activeOpacity={0.7}
        >
          <View style={s.actionItemIcon}>{a.icon}</View>
          <View style={{ flex: 1 }}>
            <Text style={s.actionItemText}>{a.label}</Text>
            {a.sub ? <Text style={s.actionItemSub}>{a.sub}</Text> : null}
          </View>
        </TouchableOpacity>
      ))}

      {!isWeb && (
        <TouchableOpacity
          style={s.actionDismissBtn}
          onPress={onClose}
          activeOpacity={0.85}
        >
          <Text style={s.actionDismissText}>Dismiss</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isWeb) {
    return (
      <View style={s.actionOverlayWeb}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />
        {menu}
      </View>
    );
  }

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={s.actionOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />
        {menu}
      </View>
    </Modal>
  );
};

// ─── Shipping Label Modal (native RN, replicates uploaded label PDF) ─────────
// ─── Shipping Label Modal (REDESIGNED to match the supplied label.pdf) ──────
// Layout mirrors the reference exactly: brand header → "SHIPPING LABEL" caption
// → Courier bar → AWB barcode + QR side-by-side → SHIP TO → meta grid (Order #,
// Invoice, Date, Payment, Weight, Dimensions) → PRODUCT DETAILS table with
// per-item HSN/Qty/Price/CGST/SGST/IGST/Total + TOTAL row → RETURN ADDRESS →
// footer GST line → auto-generated note → Powered by.
const ShippingLabelModal = ({
  order,
  visible,
  onClose,
}: {
  order: Order | null;
  visible: boolean;
  onClose: () => void;
}) => {
  const { width } = useWindowDimensions();
  const sheetWidth = Math.min(width - 32, 520);

  // Deterministic bar pattern from order number — visual only, not scannable
  // Must be declared before any conditional return (Rules of Hooks)
  const bars = useMemo(() => {
    if (!order) return [];
    let seed = 0;
    for (const ch of order.orderNumber)
      seed = (seed * 31 + ch.charCodeAt(0)) % 9973;
    return Array.from({ length: 34 }, () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return 35 + (seed % 65);
    });
  }, [order]);

  if (!order) return null;
  const firstGroup = order.sellerGroups[0];
  const trackingId =
    (firstGroup?.trackingId ?? order.orderNumber.replace(/\D/g, "")) || "—";
  const invoiceNum = `INV-${order.orderNumber.replace(/\D/g, "")}`;
  const products = firstGroup?.products ?? [];
  const isIntraState = !!order.isIntraState;

  const handlePrint = () => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.print();
    } else {
      Alert.alert("Print", `Sending ${order.orderNumber} label to printer`);
    }
  };

  // Per-item GST split — same logic as the invoice: IGST for inter-state,
  // CGST+SGST for intra-state, derived from each product's own tax%.
  const lineItems = products.map((p) => {
    const unitPrice = p.price ?? 0;
    const qty = p.qty ?? 1;
    const taxPercent = p.taxPercent ?? 0;
    const lineSubtotal = unitPrice * qty;
    const taxAmount = (lineSubtotal * taxPercent) / 100;
    const cgst = isIntraState ? taxAmount / 2 : 0;
    const sgst = isIntraState ? taxAmount / 2 : 0;
    const igst = isIntraState ? 0 : taxAmount;
    const lineTotal = lineSubtotal + taxAmount;
    return { ...p, qty, unitPrice, taxPercent, cgst, sgst, igst, lineTotal };
  });

  const totalCgst = lineItems.reduce((sum, li) => sum + li.cgst, 0);
  const totalSgst = lineItems.reduce((sum, li) => sum + li.sgst, 0);
  const totalIgst = lineItems.reduce((sum, li) => sum + li.igst, 0);
  const grandTotal = lineItems.reduce((sum, li) => sum + li.lineTotal, 0);

  const dims = order.dimensionsCm;
  const dimensionsText = dims
    ? `${dims.l.toFixed(1)}cm × ${dims.w.toFixed(1)}cm × ${dims.h.toFixed(1)}cm`
    : "—";
  const weightText =
    typeof order.weightKg === "number" ? `${order.weightKg.toFixed(2)} kg` : "—";

  const sellerAddr = firstGroup?.seller.address;
  const sellerAddressLine = [
    sellerAddr?.line1,
    [sellerAddr?.city, sellerAddr?.state].filter(Boolean).join(", "),
    sellerAddr?.pincode ? `${sellerAddr.pincode}.` : undefined,
  ]
    .filter(Boolean)
    .join(", ");

  const gstFooterLabel = isIntraState
    ? `CGST+SGST: ${fmtCur(totalCgst + totalSgst)}`
    : `IGST: ${fmtCur(totalIgst)}`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      transparent={false}
    >
      <View style={s.docScreen}>
        <View style={s.docTopBar}>
          <Text style={s.docTopBarTitle}>Shipping Label</Text>
          <TouchableOpacity
            onPress={onClose}
            style={s.docTopClose}
            activeOpacity={0.75}
          >
            <CloseIcon color={C.navy} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={s.docScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={[s.labelSheet, { width: sheetWidth }]}>
            {/* Brand header + title */}
            <View style={s.labelBrandHeader}>
              <Image
                source={require("../../assets/images/flint-thread-logo.png")}
                style={s.labelBrandLogo}
                resizeMode="contain"
              />
              <Text style={s.labelTitleText}>SHIPPING LABEL</Text>
            </View>

            {/* Courier bar */}
            <View style={s.labelCourierBar}>
              <Text style={s.labelCourierBarText}>Courier</Text>
            </View>

            {/* AWB barcode + QR side-by-side */}
            <View style={s.labelAwbArea}>
              <View style={s.labelAwbLeft}>
                <Text style={s.labelAwbCaption}>AWB NUMBER</Text>
                <View style={s.barcodeRow}>
                  {bars.map((h, i) => (
                    <View key={i} style={[s.barcodeBar, { height: `${h}%` }]} />
                  ))}
                </View>
                <Text style={s.labelAwbNumber}>{trackingId}</Text>
              </View>
              <View style={s.labelQrBox}>
                <QrPlaceholderIcon size={62} />
              </View>
            </View>

            {/* Ship To */}
            <View style={s.labelSection}>
              <Text style={s.labelSectionLabel}>SHIP TO</Text>
              <Text style={s.labelShipName}>{order.customer.name}</Text>
              {order.customer.address && (
                <Text style={s.labelShipAddress}>{order.customer.address}</Text>
              )}
              <Text style={s.labelShipAddress}>
                {[order.customer.city, order.customer.state]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
              {order.customer.pincode && (
                <Text style={s.labelShipAddress}>
                  <Text style={{ fontWeight: "800" }}>PIN: </Text>
                  {order.customer.pincode}
                  {order.customer.phone
                    ? `  |  Ph: ${order.customer.phone}`
                    : ""}
                </Text>
              )}
            </View>

            {/* Meta grid: Order #, Invoice, Date, Payment, Weight, Dimensions */}
            <View style={s.labelMetaList}>
              <View style={s.labelMetaRow}>
                <Text style={s.labelMetaKList}>Order #:</Text>
                <Text style={s.labelMetaVList}>{order.orderNumber}</Text>
              </View>
              <View style={s.labelMetaRow}>
                <Text style={s.labelMetaKList}>Invoice:</Text>
                <Text style={s.labelMetaVList}>{invoiceNum}</Text>
              </View>
              <View style={s.labelMetaRow}>
                <Text style={s.labelMetaKList}>Date:</Text>
                <Text style={s.labelMetaVList}>{order.date}</Text>
              </View>
              <View style={s.labelMetaRow}>
                <Text style={s.labelMetaKList}>Payment:</Text>
                <Text style={s.labelMetaVList}>
                  {order.paymentType === "Cash on Delivery" ? "COD" : "Prepaid"}{" "}
                  {fmtCur(grandTotal)}
                </Text>
              </View>
              <View style={s.labelMetaRow}>
                <Text style={s.labelMetaKList}>Weight:</Text>
                <Text style={s.labelMetaVList}>{weightText}</Text>
              </View>
              <View style={s.labelMetaRow}>
                <Text style={s.labelMetaKList}>Dimensions:</Text>
                <Text style={s.labelMetaVList}>{dimensionsText}</Text>
              </View>
            </View>

            {/* Product details table */}
            <View style={s.labelSectionLabelBar}>
              <Text style={s.labelSectionLabelBarText}>PRODUCT DETAILS</Text>
            </View>
            <View>
              <View style={s.labelProductHead}>
                <Text style={[s.labelProductHeadText, { flex: 2 }]}>Item</Text>
                <Text
                  style={[
                    s.labelProductHeadText,
                    s.labelProductHeadCenter,
                    { flex: 0.8 },
                  ]}
                >
                  HSN
                </Text>
                <Text
                  style={[
                    s.labelProductHeadText,
                    s.labelProductHeadCenter,
                    { flex: 0.4 },
                  ]}
                >
                  Q
                </Text>
                <Text
                  style={[s.labelProductHeadText, { flex: 0.8, textAlign: "right" }]}
                >
                  Price
                </Text>
                <Text
                  style={[s.labelProductHeadText, { flex: 0.65, textAlign: "right" }]}
                >
                  CGST
                </Text>
                <Text
                  style={[s.labelProductHeadText, { flex: 0.65, textAlign: "right" }]}
                >
                  SGST
                </Text>
                <Text
                  style={[s.labelProductHeadText, { flex: 0.75, textAlign: "right" }]}
                >
                  IGST
                </Text>
                <Text
                  style={[s.labelProductHeadText, { flex: 0.9, textAlign: "right" }]}
                >
                  Total
                </Text>
              </View>
              {lineItems.map((li, i) => (
                <View
                  key={li.id}
                  style={[
                    s.labelProductRow,
                    i === lineItems.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <Text
                    style={[s.labelProductName, { flex: 2 }]}
                    numberOfLines={2}
                  >
                    {li.name}
                  </Text>
                  <Text
                    style={[
                      s.labelProductNum,
                      s.labelProductCenter,
                      { flex: 0.8 },
                    ]}
                  >
                    {li.hsnCode ?? "—"}
                  </Text>
                  <Text
                    style={[
                      s.labelProductNum,
                      s.labelProductCenter,
                      { flex: 0.4 },
                    ]}
                  >
                    {li.qty}
                  </Text>
                  <Text style={[s.labelProductNum, { flex: 0.8 }]}>
                    {fmtCur(li.unitPrice)}
                  </Text>
                  <Text style={[s.labelProductNum, { flex: 0.65 }]}>
                    {li.cgst > 0 ? fmtCur(li.cgst) : "-"}
                  </Text>
                  <Text style={[s.labelProductNum, { flex: 0.65 }]}>
                    {li.sgst > 0 ? fmtCur(li.sgst) : "-"}
                  </Text>
                  <Text style={[s.labelProductNum, { flex: 0.75 }]}>
                    {li.igst > 0 ? (
                      <>
                        <Text>{li.taxPercent}%{"\n"}</Text>
                        {fmtCur(li.igst)}
                      </>
                    ) : (
                      "-"
                    )}
                  </Text>
                  <Text style={[s.labelProductNum, { flex: 0.9, fontWeight: "800" }]}>
                    {fmtCur(li.lineTotal)}
                  </Text>
                </View>
              ))}
              <View style={s.labelTotalsRowFull}>
                <Text style={[s.labelTotalsLabel, { flex: 3.2 }]}>TOTAL:</Text>
                <Text style={[s.labelTotalsValueCell, { flex: 0.65 }]}>
                  {fmtCur(totalCgst)}
                </Text>
                <Text style={[s.labelTotalsValueCell, { flex: 0.65 }]}>
                  {fmtCur(totalSgst)}
                </Text>
                <Text style={[s.labelTotalsValueCell, { flex: 0.75 }]}>
                  {fmtCur(totalIgst)}
                </Text>
                <Text
                  style={[
                    s.labelTotalsValueCell,
                    { flex: 0.9, color: C.orange, fontWeight: "800" },
                  ]}
                >
                  {fmtCur(grandTotal)}
                </Text>
              </View>
            </View>

            {/* Return address */}
            <View style={s.labelSection}>
              <Text style={s.labelSectionLabel}>RETURN ADDRESS</Text>
              <Text style={s.labelReturnName}>
                {firstGroup?.seller.name?.toUpperCase() ?? "SELLER"}
              </Text>
              <Text style={s.labelReturnAddr}>
                {sellerAddressLine || "Registered seller address on file"}
                {sellerAddr?.phone ? `  |  Ph: ${sellerAddr.phone}` : ""}
              </Text>
            </View>

            {/* Footer */}
            <View style={s.labelFooterNote}>
              <Text style={s.labelFooterGst}>GST: {gstFooterLabel}</Text>
              <Text style={s.labelFooterAuto}>
                AUTO-GENERATED LABEL · NO SIGNATURE REQUIRED
              </Text>
              <Text style={s.labelFooterPowered}>
                Powered By{" "}
                <Text style={{ color: C.navy, fontWeight: "800" }}>
                  Flint & Thread
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Exactly 2 buttons: Print, Close */}
        <View style={s.docActionBar}>
          <TouchableOpacity
            style={s.docBtnPrint}
            onPress={handlePrint}
            activeOpacity={0.85}
          >
            <PrintIcon color={C.white} />
            <Text style={s.docBtnPrintText}>Print</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.docBtnClose}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <CloseIcon color={C.navy} size={15} />
            <Text style={s.docBtnCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Invoice Modal (REDESIGNED to match the supplied PDF exactly) ───────────
// Layout mirrors the reference: brand header + QR on the right, "Sold By"
// block with full seller address, Bill/Ship two-column, item table with
// HSN/Qty/Unit Price/Tax%/Tax Amt/Total, CGST/SGST/IGST breakdown panel,
// payment info, and a single Print + Close footer.
export const InvoiceModal = ({
  orderId,
  visible,
  onClose,
}: {
  orderId: number | null;
  visible: boolean;
  onClose: () => void;
}) => {
  const { width } = useWindowDimensions();
  const sheetWidth = Math.min(width - 32, 760);
  const isNarrow = sheetWidth < 560;
  const [invoice, setInvoice] = useState<OrderInvoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !orderId) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchOrderInvoice(orderId)
      .then((data) => {
        if (!cancelled) setInvoice(data);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, "Failed to load invoice."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, orderId]);

  if (!visible) return null;

  const handlePrint = () => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.print();
    } else {
      Alert.alert("Print", `Sending ${invoice?.invoiceNumber ?? "invoice"} to printer`);
    }
  };

  const handleDownload = async () => {
    if (!invoice || downloading) return;
    setDownloading(true);
    try {
      await downloadInvoiceFile(invoice);
    } catch (err) {
      Alert.alert("Download failed", getApiErrorMessage(err, "Could not download invoice."));
    } finally {
      setDownloading(false);
    }
  };

  const firstGroup = invoice?.sellerGroups?.[0];
  const sellerAddr = firstGroup?.seller?.address;
  const sellerAddressLines = [
    sellerAddr?.line1,
    [sellerAddr?.city, sellerAddr?.state].filter(Boolean).join(", "),
    sellerAddr?.pincode ? `PIN: ${sellerAddr.pincode}` : undefined,
  ].filter(Boolean);

  const lineItems = invoice ? flattenInvoiceLineItems(invoice) : [];
  const subtotal = toNumber(invoice?.totals?.subtotal);
  const totalTax = toNumber(invoice?.totals?.tax);
  const shipping = toNumber(invoice?.totals?.shipping);
  const discount = toNumber(invoice?.totals?.discount);
  const wallet = toNumber(invoice?.totals?.walletDeduction);
  const referral = toNumber(invoice?.totals?.referralDiscount);
  const grandTotal = toNumber(invoice?.totals?.grandTotal);
  const isIntraState = Boolean(invoice?.isIntraState);
  const cgst = toNumber(invoice?.gstBreakdown?.cgst);
  const sgst = toNumber(invoice?.gstBreakdown?.sgst);
  const igst = toNumber(invoice?.gstBreakdown?.igst);
  const isPaid = Boolean(invoice?.payment?.paid);
  const billing = invoice?.billing;
  const shippingAddr = invoice?.shipping;
  const company = invoice?.company;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      transparent={false}
    >
      <View style={s.docScreen}>
        <View style={s.docTopBar}>
          <Text style={s.docTopBarTitle}>Invoice</Text>
          <TouchableOpacity
            onPress={onClose}
            style={s.docTopClose}
            activeOpacity={0.75}
          >
            <CloseIcon color={C.navy} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={s.docLoadingWrap}>
            <ActivityIndicator size="large" color={C.orange} />
            <Text style={s.docLoadingText}>Loading invoice…</Text>
          </View>
        ) : error ? (
          <View style={s.docLoadingWrap}>
            <Text style={s.docErrorText}>{error}</Text>
          </View>
        ) : !invoice ? (
          <View style={s.docLoadingWrap}>
            <Text style={s.docErrorText}>Invoice not available.</Text>
          </View>
        ) : (
        <ScrollView
          contentContainerStyle={s.docScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={[s.invoiceSheet, { width: sheetWidth }]}>
            {/* ── Top header: brand left, INVOICE meta + QR right ── */}
            <View
              style={[
                s.invTopHeaderRow,
                isNarrow && s.invTopHeaderRowNarrow,
              ]}
            >
              <View style={s.invBrandCol}>
                <Image
                  source={require("../../assets/images/flint-thread-logo.png")}
                  style={s.invBrandLogo}
                  resizeMode="contain"
                />

                <View style={s.invSenderInfo}>
                  <Text style={s.invSenderName}>
                    {company?.name ?? "Flint & Thread (India) Pvt. Ltd."}
                  </Text>
                  <Text style={s.invSenderLine}>{company?.country ?? "India"}</Text>
                  {company?.phone ? (
                    <Text style={s.invSenderLine}>Phone: {company.phone}</Text>
                  ) : null}
                  {company?.email ? (
                    <Text style={s.invSenderLine}>Email: {company.email}</Text>
                  ) : null}
                  {company?.gstin ? (
                    <Text style={s.invSenderLine}>GSTIN: {company.gstin}</Text>
                  ) : null}
                </View>
              </View>

              <View
                style={[
                  s.invMetaColRight,
                  isNarrow && s.invMetaColRightNarrow,
                ]}
              >
                <Text style={s.invTitle}>INVOICE</Text>
                <Text style={s.invMetaLine}>{invoice.invoiceNumber}</Text>
                <Text style={s.invMetaLineMuted}>
                  Order: {invoice.orderNumber}
                </Text>
                <Text style={s.invMetaLineMuted}>
                  Date: {formatInvoiceDate(invoice.invoiceDate ?? invoice.orderDate)}
                </Text>

                <View style={s.invQrBox}>
                  {invoice.qrCode?.imageDataUrl ? (
                    <Image
                      source={{ uri: invoice.qrCode.imageDataUrl }}
                      style={{ width: 62, height: 62 }}
                      resizeMode="contain"
                    />
                  ) : (
                    <QrPlaceholderIcon size={62} />
                  )}
                </View>
                <Text style={s.invQrCaption}>Scan for order details</Text>
              </View>
            </View>

            {/* ── Sold By ── */}
            <View style={s.invSection}>
              <Text style={s.invSectionLabelNavy}>SOLD BY</Text>
              <Text style={s.invBoldName}>
                {(firstGroup?.seller?.name ?? "UNKNOWN SELLER").toUpperCase()}
              </Text>
              {sellerAddressLines.length > 0 ? (
                sellerAddressLines.map((line, i) => (
                  <Text key={i} style={s.invMutedLine}>
                    {line}
                  </Text>
                ))
              ) : (
                <Text style={s.invMutedLine}>Seller details on file</Text>
              )}
              {firstGroup?.seller?.phone ? (
                <Text style={s.invMutedLine}>Phone: {firstGroup.seller.phone}</Text>
              ) : null}
              {firstGroup?.seller?.email ? (
                <Text style={s.invMutedLine}>Email: {firstGroup.seller.email}</Text>
              ) : null}
              {firstGroup?.seller?.gstin ? (
                <Text style={s.invMutedLine}>GSTIN: {firstGroup.seller.gstin}</Text>
              ) : null}
            </View>

            {/* ── Bill / Ship ── */}
            <View style={s.invBsGrid}>
              <View style={s.invBsCol}>
                <Text style={s.invSectionLabelOrange}>BILL TO</Text>
                <Text style={s.invBoldName}>{billing?.name || "—"}</Text>
                {billing?.address ? (
                  <Text style={s.invMutedLine}>{billing.address}</Text>
                ) : null}
                {billing?.line1 ? (
                  <Text style={s.invMutedLine}>{billing.line1}</Text>
                ) : null}
                {billing?.line2 ? (
                  <Text style={s.invMutedLine}>{billing.line2}</Text>
                ) : null}
                {(billing?.city || billing?.state) && (
                  <Text style={s.invMutedLine}>
                    {[billing?.city, billing?.state].filter(Boolean).join(", ")}
                    {billing?.pincode ? ` - ${billing.pincode}` : ""}
                  </Text>
                )}
                {billing?.phone ? (
                  <Text style={s.invMutedLine}>Phone: {billing.phone}</Text>
                ) : null}
                <Text style={s.invMutedLine}>Email: {billing?.email || "—"}</Text>
              </View>
              <View style={s.invBsCol}>
                <Text style={s.invSectionLabelOrange}>SHIP TO</Text>
                <Text style={s.invBoldName}>{shippingAddr?.name || "—"}</Text>
                {shippingAddr?.address ? (
                  <Text style={s.invMutedLine}>{shippingAddr.address}</Text>
                ) : null}
                {shippingAddr?.line1 ? (
                  <Text style={s.invMutedLine}>{shippingAddr.line1}</Text>
                ) : null}
                {shippingAddr?.line2 ? (
                  <Text style={s.invMutedLine}>{shippingAddr.line2}</Text>
                ) : null}
                {(shippingAddr?.city || shippingAddr?.state) && (
                  <Text style={s.invMutedLine}>
                    {[shippingAddr?.city, shippingAddr?.state].filter(Boolean).join(", ")}
                    {shippingAddr?.pincode ? ` - ${shippingAddr.pincode}` : ""}
                  </Text>
                )}
                {shippingAddr?.phone ? (
                  <Text style={s.invMutedLine}>Phone: {shippingAddr.phone}</Text>
                ) : null}
                <Text style={s.invMutedLine}>Email: {shippingAddr?.email || "—"}</Text>
              </View>
            </View>

            {/* ── Items table ── */}
            <View style={s.invTable}>
              <View style={s.invTableHead}>
                <Text style={[s.invTh, { flex: 2.2 }]}>Item Description</Text>
                <Text style={[s.invTh, s.invThCenter, { flex: 1 }]}>HSN Code</Text>
                <Text style={[s.invTh, s.invThRight, { flex: 0.6 }]}>Qty</Text>
                <Text style={[s.invTh, s.invThRight, { flex: 1 }]}>Unit Price</Text>
                <Text style={[s.invTh, s.invThRight, { flex: 0.7 }]}>Tax %</Text>
                <Text style={[s.invTh, s.invThRight, { flex: 1 }]}>Tax Amount</Text>
                <Text style={[s.invTh, s.invThRight, { flex: 1 }]}>Total</Text>
              </View>
              {lineItems.map((li, i) => (
                <View
                  key={`${li.id ?? i}-${li.name}`}
                  style={[s.invTr, i % 2 === 1 && { backgroundColor: C.bg }]}
                >
                  <View style={{ flex: 2.2, flexDirection: "row", gap: 8, alignItems: "center" }}>
                    {li.imageUrl ? (
                      <Image
                        source={{ uri: li.imageUrl }}
                        style={{ width: 36, height: 36, borderRadius: 6, backgroundColor: C.bg }}
                        resizeMode="cover"
                      />
                    ) : null}
                    <View style={{ flex: 1 }}>
                      <Text style={s.invTdName} numberOfLines={2}>
                        {li.name}
                      </Text>
                      {(li.color || li.size) && (
                        <Text style={s.invTdVariant}>
                          {[
                            li.color ? `Color: ${li.color}` : null,
                            li.size ? `Size: ${li.size}` : null,
                          ]
                            .filter(Boolean)
                            .join("  ")}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Text style={[s.invTdNum, s.invTdCenter, { flex: 1 }]}>
                    {li.hsnCode || "—"}
                  </Text>
                  <Text style={[s.invTdNum, { flex: 0.6 }]}>{li.qty ?? 0}</Text>
                  <Text style={[s.invTdNum, { flex: 1 }]}>
                    {fmtCur(toNumber(li.unitPrice))}
                  </Text>
                  <Text style={[s.invTdNum, { flex: 0.7 }]}>
                    {toNumber(li.taxPercent)}%
                  </Text>
                  <Text style={[s.invTdNum, { flex: 1 }]}>
                    {fmtCur(toNumber(li.taxAmount))}
                  </Text>
                  <Text style={[s.invTdNum, { flex: 1, fontWeight: "800" }]}>
                    {fmtCur(toNumber(li.lineTotal))}
                  </Text>
                </View>
              ))}
            </View>

            {/* ── Totals ── */}
            <View style={s.invTotalsWrap}>
              <View style={s.invTotalsBox}>
                <View style={s.invTotalsLine}>
                  <Text style={s.invTotalsLabel}>Subtotal (Before Tax)</Text>
                  <Text style={s.invTotalsValue}>{fmtCur(subtotal)}</Text>
                </View>
                <View style={s.invTotalsLine}>
                  <Text style={s.invTotalsLabel}>
                    {isIntraState ? "CGST + SGST" : "IGST"} @{" "}
                    {subtotal > 0 ? ((totalTax / subtotal) * 100).toFixed(2) : "0.00"}%
                  </Text>
                  <Text style={s.invTotalsValue}>{fmtCur(totalTax)}</Text>
                </View>
                <View style={s.invTotalsLine}>
                  <Text style={s.invTotalsLabel}>Shipping Charges</Text>
                  <Text
                    style={[
                      s.invTotalsValue,
                      shipping === 0 && { color: C.green, fontWeight: "800" },
                    ]}
                  >
                    {shipping === 0 ? "FREE" : fmtCur(shipping)}
                  </Text>
                </View>
                {discount > 0 ? (
                  <View style={s.invTotalsLine}>
                    <Text style={s.invTotalsLabel}>Discount</Text>
                    <Text style={s.invTotalsValue}>- {fmtCur(discount)}</Text>
                  </View>
                ) : null}
                {wallet > 0 ? (
                  <View style={s.invTotalsLine}>
                    <Text style={s.invTotalsLabel}>Wallet</Text>
                    <Text style={s.invTotalsValue}>- {fmtCur(wallet)}</Text>
                  </View>
                ) : null}
                {referral > 0 ? (
                  <View style={s.invTotalsLine}>
                    <Text style={s.invTotalsLabel}>Referral</Text>
                    <Text style={s.invTotalsValue}>- {fmtCur(referral)}</Text>
                  </View>
                ) : null}
                <View style={s.invGrandLine}>
                  <Text style={s.invGrandLabel}>Grand Total</Text>
                  <Text style={s.invGrandValue}>{fmtCur(grandTotal)}</Text>
                </View>
              </View>
            </View>

            {/* ── GST Breakdown Summary ── */}
            <View style={s.invGstBlock}>
              <Text style={s.invGstTitle}>GST Breakdown Summary</Text>
              <View style={s.invGstLine}>
                <Text style={s.invGstK}>Total CGST:</Text>
                <Text style={s.invGstV}>{fmtCur(cgst)}</Text>
              </View>
              <View style={s.invGstLine}>
                <Text style={s.invGstK}>Total SGST:</Text>
                <Text style={s.invGstV}>{fmtCur(sgst)}</Text>
              </View>
              <View style={s.invGstLine}>
                <Text style={s.invGstK}>Total IGST:</Text>
                <Text style={s.invGstV}>{fmtCur(igst)}</Text>
              </View>
              <View style={[s.invGstLine, s.invGstLineTotal]}>
                <Text style={s.invGstKTotal}>Total GST:</Text>
                <Text style={s.invGstVTotal}>{fmtCur(totalTax)}</Text>
              </View>
              <Text style={s.invGstNote}>
                {isIntraState
                  ? "*Intra-state transaction - CGST + SGST applicable"
                  : "*Inter-state transaction - IGST applicable"}
              </Text>
            </View>

            {/* ── Payment Information ── */}
            <View style={s.invPaymentBlock}>
              <Text style={s.invPaymentTitle}>Payment Information:</Text>
              <Text style={s.invPaymentLine}>
                Payment Method: {invoice.payment?.method || "—"}
              </Text>
              <View style={s.invPaymentStatusRow}>
                <Text style={s.invPaymentLine}>Payment Status: </Text>
                <View
                  style={[
                    s.invPayChip,
                    isPaid ? s.invPayChipPaid : s.invPayChipPending,
                  ]}
                >
                  <Text
                    style={[
                      s.invPayChipText,
                      { color: isPaid ? C.green : C.orange },
                    ]}
                  >
                    {isPaid ? "PAID" : (invoice.payment?.status || "PENDING").toUpperCase()}
                  </Text>
                </View>
              </View>
              {invoice.gstNumber ? (
                <Text style={s.invPaymentLine}>Customer GSTIN: {invoice.gstNumber}</Text>
              ) : null}
            </View>

            {/* ── Thank-you footer ── */}
            <View style={s.invThankYouBlock}>
              <Text style={s.invThankYouTitle}>Thank you for your business!</Text>
              <Text style={s.invThankYouLine}>
                If you have any questions about this invoice, please contact us at
              </Text>
              <Text style={s.invThankYouContact}>
                {company?.email ?? "support@flintnthread.in"}
              </Text>
            </View>

            <Text style={s.invDocFooter}>
              This is a system-generated invoice and does not require a signature.
            </Text>
          </View>
        </ScrollView>
        )}

        {/* Footer: Print, Download, Close */}
        <View style={s.docActionBar}>
          <TouchableOpacity
            style={[s.docBtnPrint, (loading || !invoice) && { opacity: 0.6 }]}
            onPress={handlePrint}
            activeOpacity={0.85}
            disabled={loading || !invoice}
          >
            <PrintIcon color={C.white} />
            <Text style={s.docBtnPrintText}>Print</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.docBtnDownload, (loading || !invoice || downloading) && { opacity: 0.6 }]}
            onPress={() => void handleDownload()}
            activeOpacity={0.85}
            disabled={loading || !invoice || downloading}
          >
            <DownloadIcon color={C.white} size={15} />
            <Text style={s.docBtnDownloadText}>
              {downloading ? "Downloading…" : "Download"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.docBtnClose}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <CloseIcon color={C.navy} size={15} />
            <Text style={s.docBtnCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Product Summary (grid card) ──────────────────────────────────────────────
const ProductSummary = ({
  order,
  onView,
}: {
  order: Order;
  onView: (o: Order) => void;
}) => {
  const groups = order.sellerGroups;
  const isMultiSeller = groups.length > 1;
  const firstGroup = groups[0];
  const primary = firstGroup?.products[0];
  const itemCount = firstGroup?.products.length ?? 0;

  const metaString = firstGroup
    ? [
        firstGroup.seller.name,
        `${itemCount} item${itemCount !== 1 ? "s" : ""}`,
        isMultiSeller
          ? `+${groups.length - 1} seller${groups.length > 2 ? "s" : ""}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "Seller details unavailable";

  return (
    <View style={s.prodSection}>
      {primary?.image ? (
        <Image
          source={{ uri: primary.image }}
          style={s.prodThumb}
          resizeMode="cover"
        />
      ) : (
        <View style={s.prodThumbEmpty}>
          <ShopIcon color={C.textLight} />
        </View>
      )}
      <View style={s.prodInfo}>
        <Text style={s.prodName} numberOfLines={1}>
          {primary?.name || "Untitled product"}
        </Text>
        <Text style={s.prodMeta} numberOfLines={1}>
          {metaString}
        </Text>
      </View>
    </View>
  );
};

// ─── Grid Order Card ──────────────────────────────────────────────────────────
const GridOrderCard = ({
  order,
  onView,
  onGST,
  onMore,
  isWeb,
}: {
  order: Order;
  onView: (o: Order) => void;
  onGST: (id: string) => void;
  onMore: (o: Order) => void;
  isWeb: boolean;
}) => {
  const cfg = STATUS_CFG[order.status];

  return (
    <View style={[s.gridCard, isWeb && s.gridCardWeb]}>
      <View style={[s.cardAccent, { backgroundColor: cfg.dot }]} />

      <View style={s.gridCardHeader}>
        <View style={{ flex: 1 }}>
          <View style={s.orderIdRow}>
            <Text style={s.gridOrderNum} numberOfLines={1}>
              {order.orderNumber}
            </Text>
            <TouchableOpacity
              onPress={() => copyToClipboard(order.orderNumber)}
              style={s.copyBtn}
              activeOpacity={0.7}
            >
              <CopyIcon color={C.textLight} />
            </TouchableOpacity>
          </View>
          <View style={s.metaRow}>
            <CalendarIcon />
            <Text style={s.metaText}> {order.date}</Text>
            {order.time ? (
              <Text style={s.metaText}> · {order.time}</Text>
            ) : null}
          </View>
        </View>
        <View style={s.headerRight}>
          <StatusBadge status={order.status} />
          <TouchableOpacity
            onPress={() => onMore(order)}
            style={s.moreBtn}
            activeOpacity={0.7}
          >
            <MoreIcon bold />
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.divider} />

      <ProductSummary order={order} onView={onView} />

      <View style={s.divider} />

      <View style={s.customerRow}>
        <View style={s.customerRowLeft}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{getInitials(order.customer.name)}</Text>
          </View>
          <Text style={s.customerName} numberOfLines={1}>
            {order.customer.name}
          </Text>
        </View>
        <Text style={s.amountVal} numberOfLines={1}>
          {fmtCur(order.amount)}
        </Text>
      </View>

      <View style={s.cardFooter}>
        <GSTBadge status={order.gstStatus} onMark={() => onGST(order.id)} />
        <TouchableOpacity
          style={s.ctaRow}
          onPress={() => onView(order)}
          activeOpacity={0.7}
        >
          <Text style={s.ctaText}>View Details</Text>
          <ChevronRightIcon color={C.blue} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── List Table Row ───────────────────────────────────────────────────────────
const ListTableRow = ({
  order,
  idx,
  onView,
  onGST,
}: {
  order: Order;
  idx: number;
  onView: (o: Order) => void;
  onGST: (id: string) => void;
}) => (
  <View style={[s.tRow, idx % 2 === 1 && s.tRowAlt]}>
    <View style={[s.tcell, s.colOrder]}>
      <View style={s.orderIdRow}>
        <Text style={s.tdOrderNum} numberOfLines={1}>
          {order.orderNumber}
        </Text>
        <TouchableOpacity
          onPress={() => copyToClipboard(order.orderNumber)}
          activeOpacity={0.7}
        >
          <CopyIcon color={C.textLight} />
        </TouchableOpacity>
      </View>
      <View style={s.metaRow}>
        <CalendarIcon />
        <Text style={s.metaText}> {order.date}</Text>
      </View>
    </View>

    <View style={[s.tcell, s.colCustomer]}>
      <View style={s.customerRowInner}>
        <View style={s.avatarSm}>
          <Text style={s.avatarSmText}>{getInitials(order.customer.name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.tdName} numberOfLines={1}>
            {order.customer.name}
          </Text>
          <Text style={s.tdEmail} numberOfLines={1}>
            {order.customer.email}
          </Text>
        </View>
      </View>
    </View>

    <View style={[s.tcell, s.colSeller]}>
      {order.sellerGroups.length === 0 ? (
        <Text style={s.tdMuted}>—</Text>
      ) : (
        order.sellerGroups.map((g, i) => (
          <View
            key={i}
            style={[
              i > 0 && {
                marginTop: 8,
                paddingTop: 8,
                borderTopWidth: 1,
                borderTopColor: C.border,
              },
            ]}
          >
            <Text style={s.tdSellerName} numberOfLines={1}>
              {g.seller.name}
            </Text>
            {g.subOrderId && (
              <Text style={s.tdMuted} numberOfLines={1}>
                #{g.subOrderId}
              </Text>
            )}
          </View>
        ))
      )}
    </View>

    <View style={[s.tcell, s.colProducts]}>
      {order.sellerGroups.length === 0 ? (
        <Text style={s.tdMuted}>—</Text>
      ) : (
        order.sellerGroups.map((g, gi) => {
          const primary = g.products[0];
          return (
            <View
              key={gi}
              style={[s.tableProductRow, gi > 0 && { marginTop: 8 }]}
            >
              {primary?.image ? (
                <Image
                  source={{ uri: primary.image }}
                  style={s.tableThumb}
                  resizeMode="cover"
                />
              ) : (
                <View style={s.tableThumbEmpty} />
              )}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.tdProductName} numberOfLines={1}>
                  {primary?.name || "—"}
                </Text>
                {g.products.length > 1 && (
                  <Text style={s.tdMuted}>{g.products.length} Items</Text>
                )}
              </View>
            </View>
          );
        })
      )}
    </View>

    <View style={[s.tcell, s.colAmount]}>
      <Text style={s.tdAmount}>{fmtCur(order.amount)}</Text>
      <Text style={s.tdPayment} numberOfLines={1}>
        {order.paymentType}
      </Text>
    </View>

    <View style={[s.tcell, s.colStatus]}>
      <StatusBadge status={order.status} />
    </View>

    <View style={[s.tcell, s.colGst]}>
      <GSTBadge status={order.gstStatus} onMark={() => onGST(order.id)} />
    </View>

    <View style={[s.tcell, s.colDocs]}>
      {order.sellerGroups.map((g, i) => (
        <View key={i} style={[s.tableDocRow, i > 0 && { marginTop: 4 }]}>
          <TouchableOpacity style={s.tableDocBtn} activeOpacity={0.75}>
            <FileIcon color={C.navy} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tableDocBtn, { borderColor: "#FED7AA" }]}
            activeOpacity={0.75}
          >
            <TruckIcon color={C.orange} />
          </TouchableOpacity>
        </View>
      ))}
    </View>

    <View style={[s.tcell, s.colAction]}>
      <View style={s.tableActions}>
        <TouchableOpacity
          style={s.viewBtnSm}
          onPress={() => onView(order)}
          activeOpacity={0.85}
        >
          <EyeIcon color={C.white} />
          <Text style={s.viewBtnSmText}>View</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

// ─── Pagination ───────────────────────────────────────────────────────────────
function buildPages(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (
    let p = Math.max(2, current - 1);
    p <= Math.min(total - 1, current + 1);
    p++
  )
    pages.push(p);
  if (current < total - 2) pages.push("…");
  if (total > 1) pages.push(total);
  return pages;
}

const PaginationBar = ({
  page,
  total,
  rangeStart,
  rangeEnd,
  totalElements,
  onPrev,
  onNext,
  onPage,
}: {
  page: number;
  total: number;
  rangeStart: number;
  rangeEnd: number;
  totalElements: number;
  onPrev: () => void;
  onNext: () => void;
  onPage: (p: number) => void;
}) => (
  <View style={s.pagination}>
    <Text style={s.paginationInfo}>
      Showing {rangeStart}–{rangeEnd} of {totalElements} orders
    </Text>
    {total > 1 && (
      <View style={s.paginationControls}>
        <TouchableOpacity
          style={[s.pageBtn, page <= 1 && s.pageBtnOff]}
          onPress={onPrev}
          disabled={page <= 1}
        >
          <ChevronLeftIcon color={page <= 1 ? C.textLight : C.textMid} />
        </TouchableOpacity>
        {buildPages(page, total).map((num, i) =>
          num === "…" ? (
            <Text key={`e-${i}`} style={s.pageEllipsis}>
              …
            </Text>
          ) : (
            <TouchableOpacity
              key={num}
              style={[s.pageBtn, num === page && s.pageBtnActive]}
              onPress={() => onPage(num as number)}
            >
              <Text
                style={[s.pageBtnText, num === page && s.pageBtnTextActive]}
              >
                {num}
              </Text>
            </TouchableOpacity>
          ),
        )}
        <TouchableOpacity
          style={[s.pageBtn, page >= total && s.pageBtnOff]}
          onPress={onNext}
          disabled={page >= total}
        >
          <ChevronRightIcon color={page >= total ? C.textLight : C.textMid} />
        </TouchableOpacity>
      </View>
    )}
  </View>
);

// ─── Responsive grid helpers ──────────────────────────────────────────────────
const GRID_GUTTER = 16;

function getColumnCount(width: number): number {
  if (width >= 1440) return 4;
  if (width >= 1024) return 3;
  if (width >= 768) return 2;
  return 1;
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function OrdersScreen() {
  const { width } = useWindowDimensions();
  const isWeb = width >= 768;
  const isMobile = width < 480;
  const columnCount = getColumnCount(width);
  const px = isMobile ? 14 : isWeb ? 28 : 20;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const params = useLocalSearchParams<{ status?: string }>();
  const [statusFilter, setStatusFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All Payments");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortVisible, setSortVisible] = useState(false);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [activeAction, setActiveAction] = useState<Order | null>(null);
  const [docModal, setDocModal] = useState<DocModalType>(null);
  const [docOrder, setDocOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (params.status) {
      setStatusFilter(params.status);
    }
  }, [params.status]);

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [page, orderStats] = await Promise.all([
        fetchOrders({
          page: currentPage - 1,
          size: ORDERS_PAGE_SIZE,
          search: searchQuery || undefined,
          status: mapStatusFilterToApi(statusFilter),
          paymentMethod: mapPaymentFilterToApi(paymentFilter),
          sort: sortOption,
        }),
        fetchOrderStats(),
      ]);
      setOrders(page.items.map((item) => toUiOrder(mapOrderRow(item), item)));
      setTotalElements(page.totalElements);
      setTotalPages(page.totalPages);
      setStats(orderStats);
      if (currentPage > page.totalPages && page.totalPages > 0)
        setCurrentPage(page.totalPages);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load orders."));
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, statusFilter, paymentFilter, sortOption]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const router = useRouter();

  const handleView = useCallback(
    (o: Order) => {
      router.push({ pathname: "/orderDetails", params: { orderId: o.id } });
    },
    [router],
  );

  const handleGST = useCallback(async (id: string) => {
    try {
      await updateOrderGstStatus(Number(id), "Filed");
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, gstStatus: "Filed" } : o)),
      );
    } catch (err) {
      const msg = getApiErrorMessage(err, "Failed to update GST status.");
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Error", msg);
    }
  }, []);

  const handleOpenDoc = useCallback(
    (order: Order, type: "invoice" | "label") => {
      setDocOrder(order);
      setDocModal(type);
    },
    [],
  );

  const handleCloseDoc = useCallback(() => {
    setDocModal(null);
    setDocOrder(null);
  }, []);

  const filtered = orders;

  const handleExportCSV = useCallback(async () => {
    if (Platform.OS !== "web") {
      Alert.alert("Export", "CSV export is currently supported on web only.");
      return;
    }
    try {
      const csv = await fetchOrderExportCsv({
        search: searchQuery || undefined,
        status: mapStatusFilterToApi(statusFilter),
        paymentMethod: mapPaymentFilterToApi(paymentFilter),
        sort: sortOption,
      });
      const blob = new Blob([csv.startsWith("\uFEFF") ? csv : "\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      Alert.alert("Export failed", e instanceof Error ? e.message : "Could not export orders.");
    }
  }, [searchQuery, statusFilter, paymentFilter, sortOption]);

  const rangeStart =
    totalElements === 0 ? 0 : (currentPage - 1) * ORDERS_PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * ORDERS_PAGE_SIZE, totalElements);

  const statCards = [
    {
      label: "Total Orders",
      value: String(stats?.totalOrders ?? totalElements),
      icon: <OrderBoxIcon color={C.navy} />,
      iconBg: "rgba(30,43,107,0.08)",
      valueColor: C.navy,
    },
    {
      label: "This Month",
      value: String(stats?.thisMonth ?? 0),
      icon: <CalendarIcon color={C.teal} />,
      iconBg: "#ECFEFF",
      valueColor: C.teal,
    },
    {
      label: "Monthly Revenue",
      value: fmtCur(Number(stats?.monthRevenue ?? 0)),
      icon: <DownloadIcon color={C.green} />,
      iconBg: C.greenPale,
      valueColor: C.green,
    },
    {
      label: "Pending Payment",
      value: String(stats?.pendingPayments ?? 0),
      icon: <ChevronRightIcon color={C.orange} />,
      iconBg: C.orangePale,
      valueColor: C.orange,
    },
  ];

  const currentSortLabel =
    SORT_OPTIONS.find((s) => s.key === sortOption)?.label ?? "Newest First";

  const cardWidthPercent = useMemo(() => {
    if (columnCount <= 1) return undefined;
    const totalGutter = GRID_GUTTER * (columnCount - 1);
    return `calc((100% - ${totalGutter}px) / ${columnCount})` as unknown as number;
  }, [columnCount]);

  return (
    <AdminLayout>
      <StatusBar barStyle="light-content" backgroundColor={C.navyDeep} />
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header — floats with side margins, rounded on all 4 corners ── */}
          <View
            style={{
              paddingHorizontal: 16,
            }}
          >
            <View
              style={[
                s.headerBlock,
                {
                  paddingTop: Platform.OS === "ios" ? 50 : 20,
                },
              ]}
            >
              <View
                style={[s.headerTop, { paddingHorizontal: isMobile ? 16 : 22 }]}
              >
                <View style={s.headerLeft}>
                  <View style={s.headerIcon}>
                    <OrderBoxIcon color={C.white} />
                  </View>
                  <View>
                    <Text
                      style={[s.headerTitle, { fontSize: isMobile ? 16 : 20 }]}
                    >
                      Orders Management
                    </Text>
                    <Text style={s.headerSub}>
                      Manage and track all customer orders
                    </Text>
                  </View>
                </View>
                <View style={s.headerActions}>
                  <TouchableOpacity
                    style={s.exportBtn}
                    onPress={handleExportCSV}
                    activeOpacity={0.85}
                  >
                    <ExportIcon />
                    {!isMobile && (
                      <Text style={s.exportBtnText}>Export CSV</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* ── Overlapping stat cards ── */}
            <View
              style={[
                s.statCardsWrap,
                { paddingHorizontal: 10 },
                isMobile && s.statCardsWrapMobile,
              ]}
            >
              {statCards.map((stat, i) => (
                <View key={i} style={s.statCard}>
                  <View
                    style={[s.statIconBox, { backgroundColor: stat.iconBg }]}
                  >
                    {stat.icon}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      style={[s.statValue, { color: stat.valueColor }]}
                      numberOfLines={1}
                    >
                      {stat.value}
                    </Text>
                    <Text style={s.statLabel} numberOfLines={1}>
                      {stat.label}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* ── Filter pills (moved out of the header, into the toolbar area) ── */}
          <View style={[s.filterPillsWrap, { paddingHorizontal: px }]}>
            <View style={s.filterPillsCard}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.filterPillsRow}
              >
              {STATUS_FILTERS.map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[
                    s.filterPill,
                    statusFilter === f && s.filterPillActive,
                  ]}
                  onPress={() => {
                    setStatusFilter(f);
                    setCurrentPage(1);
                  }}
                  activeOpacity={0.75}
                >
                  {statusFilter === f && (
                    <View
                      style={[
                        s.filterPillDot,
                        {
                          backgroundColor:
                            f === "All"
                              ? C.white
                              : (STATUS_CFG[f as OrderStatus]?.dot ?? C.white),
                        },
                      ]}
                    />
                  )}
                  <Text
                    style={[
                      s.filterPillText,
                      statusFilter === f && s.filterPillTextActive,
                    ]}
                  >
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            </View>
          </View>

          {/* ── Toolbar ── */}
          <View style={[s.toolbar, { paddingHorizontal: px }]}>
            <View style={s.searchBox}>
              <SearchIcon />
              <TextInput
                style={s.searchInput}
                placeholder="Search orders, customers…"
                placeholderTextColor={C.textLight}
                value={search}
                onChangeText={(t) => {
                  setSearch(t);
                  setCurrentPage(1);
                }}
              />
            </View>

            <View style={s.toolbarRight}>
              <TouchableOpacity
                style={s.paymentDrop}
                onPress={() => setPaymentVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={s.paymentDropText} numberOfLines={1}>
                  {paymentFilter === "All Payments" ? "Payment" : paymentFilter}
                </Text>
                <ChevronDownIcon />
              </TouchableOpacity>

              <TouchableOpacity
                style={s.sortBtn}
                onPress={() => setSortVisible(true)}
                activeOpacity={0.8}
              >
                <SortIcon />
                <Text style={s.sortBtnText} numberOfLines={1}>
                  {isWeb ? currentSortLabel : "Sort"}
                </Text>
                <ChevronDownIcon color={C.navy} />
              </TouchableOpacity>

              <View style={s.viewToggle}>
                <TouchableOpacity
                  style={[
                    s.viewToggleBtn,
                    viewMode === "grid" && s.viewToggleBtnActive,
                  ]}
                  onPress={() => setViewMode("grid")}
                  activeOpacity={0.8}
                >
                  <GridIcon active={viewMode === "grid"} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    s.viewToggleBtn,
                    viewMode === "list" && s.viewToggleBtnActive,
                  ]}
                  onPress={() => setViewMode("list")}
                  activeOpacity={0.8}
                >
                  <ListIcon active={viewMode === "list"} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ── Content ── */}
          {loading ? (
            <View style={[s.stateBox, { marginHorizontal: px }]}>
              <ActivityIndicator size="large" color={C.navy} />
              <Text style={s.stateText}>Loading orders…</Text>
            </View>
          ) : error ? (
            <View style={[s.stateBox, { marginHorizontal: px }]}>
              <Text style={s.errorText}>{error}</Text>
              <TouchableOpacity
                style={s.retryBtn}
                onPress={loadOrders}
                activeOpacity={0.8}
              >
                <Text style={s.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : filtered.length === 0 ? (
            <View style={[s.stateBox, { marginHorizontal: px }]}>
              <OrderBoxIcon color={C.textLight} />
              <Text style={s.stateText}>No orders found</Text>
              <Text style={s.stateSub}>
                Try adjusting your filters or search
              </Text>
            </View>
          ) : viewMode === "grid" ? (
            <View style={[s.gridWrap, { paddingHorizontal: px }]}>
              {filtered.map((o) => (
                <View
                  key={o.id}
                  style={
                    columnCount > 1
                      ? [s.gridItem, { width: cardWidthPercent as any }]
                      : s.gridItemFull
                  }
                >
                  <GridOrderCard
                    order={o}
                    onView={handleView}
                    onGST={handleGST}
                    onMore={(ord) => setActiveAction(ord)}
                    isWeb={isWeb}
                  />
                </View>
              ))}
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              style={[s.tableScroll, { paddingHorizontal: px }]}
            >
              <View style={s.tableWrap}>
                <View style={s.tHead}>
                  {[
                    { label: "Order #", style: s.colOrder },
                    { label: "Customer", style: s.colCustomer },
                    { label: "Seller", style: s.colSeller },
                    { label: "Products", style: s.colProducts },
                    { label: "Amount", style: s.colAmount },
                    { label: "Status", style: s.colStatus },
                    { label: "GST Filed", style: s.colGst },
                    { label: "Invoice/Label", style: s.colDocs },
                    { label: "Action", style: s.colAction },
                  ].map((col) => (
                    <Text key={col.label} style={[s.th, col.style]}>
                      {col.label}
                    </Text>
                  ))}
                </View>

                {filtered.map((o, idx) => (
                  <ListTableRow
                    key={o.id}
                    order={o}
                    idx={idx}
                    onView={handleView}
                    onGST={handleGST}
                  />
                ))}
              </View>
            </ScrollView>
          )}

          {/* ── Pagination ── */}
          {!loading && !error && totalPages > 0 && (
            <View style={{ paddingHorizontal: px }}>
              <PaginationBar
                page={currentPage}
                total={totalPages}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                totalElements={totalElements}
                onPrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
                onNext={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                onPage={setCurrentPage}
              />
            </View>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      </View>

      <SortModal
        visible={sortVisible}
        isWeb={isWeb}
        current={sortOption}
        onSelect={(opt) => {
          setSortOption(opt);
          setCurrentPage(1);
        }}
        onClose={() => setSortVisible(false)}
      />

      <PaymentModal
        visible={paymentVisible}
        isWeb={isWeb}
        current={paymentFilter}
        onSelect={(p) => {
          setPaymentFilter(p);
          setCurrentPage(1);
        }}
        onClose={() => setPaymentVisible(false)}
      />

      {activeAction && (
        <ActionMenu
          order={activeAction}
          visible={!!activeAction}
          onClose={() => setActiveAction(null)}
          onView={handleView}
          onGST={handleGST}
          onOpenDoc={handleOpenDoc}
          isWeb={isWeb}
        />
      )}

      <ShippingLabelModal
        order={docModal === "label" ? docOrder : null}
        visible={docModal === "label"}
        onClose={handleCloseDoc}
      />

      <InvoiceModal
        orderId={docModal === "invoice" && docOrder ? Number(docOrder.id) : null}
        visible={docModal === "invoice"}
        onClose={handleCloseDoc}
      />
    </AdminLayout>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  scrollContent: { paddingBottom: 60 },

  // ── Header — floating rounded card (all 4 corners) ──────────────────────────
  headerBlock: {
    backgroundColor: C.navyDeep,
    paddingHorizontal: 32,
    paddingVertical: 28,
    paddingBottom: 68,
    borderRadius: 22,
    marginHorizontal: 2,
    marginTop: 12,
    shadowColor: C.navyDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontWeight: "800",
    color: C.white,
    letterSpacing: -0.3,
  },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2 },
  headerActions: { flexDirection: "row", gap: 8 },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.orange,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  exportBtnText: { fontSize: 13, fontWeight: "700", color: C.white },

  // ── Overlapping stat cards (sit on top of the header's bottom edge) ────────
  statCardsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: -42,
    marginBottom: 4,
  },
  statCardsWrapMobile: { flexWrap: "nowrap", gap: 6, marginTop: -26 },
  statCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 130,
    maxWidth: 240,
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.navyDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    gap: 12,
  },
  statIconBox: {
    width: 38,
    height: 38,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  statLabel: {
    fontSize: 11.5,
    color: C.textLight,
    fontWeight: "600",
  },

  filterPillsWrap: { marginTop: 4, marginBottom: 6 },
  filterPillsCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.navyDeep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  filterPillsRow: { gap: 8, flexDirection: "row" },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 30,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterPillActive: { backgroundColor: C.navy, borderColor: C.navy },
  filterPillDot: { width: 6, height: 6, borderRadius: 3 },
  filterPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textMid,
  },
  filterPillTextActive: { color: C.white },

  // ── Toolbar ──────────────────────────────────────────────────────────────────
  toolbar: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    paddingVertical: 14,
    flexWrap: "wrap",
  },
  searchBox: {
    flex: 1,
    minWidth: 180,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: C.textDark,
    outlineStyle: "none",
  } as any,
  toolbarRight: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    flexShrink: 0,
    flexWrap: "wrap",
  },
  paymentDrop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    height: 44,
  },
  paymentDropText: { fontSize: 13, color: C.textMid, maxWidth: 110 },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    height: 44,
  },
  sortBtnText: {
    fontSize: 13,
    color: C.navy,
    fontWeight: "600",
    maxWidth: 140,
  },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: C.border,
    borderRadius: 10,
    padding: 3,
  },
  viewToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  viewToggleBtnActive: { backgroundColor: C.navy },

  // ── Sort Modal ───────────────────────────────────────────────────────────────
  sortOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(21,29,79,0.45)",
  },
  sortOverlayWeb: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(21,29,79,0.35)",
  },
  sortMenu: {
    backgroundColor: C.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    shadowColor: C.navyDeep,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  sortMenuWeb: {
    borderRadius: 20,
    minWidth: 300,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sortHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  sortTitle: { fontSize: 16, fontWeight: "700", color: C.textDark },
  sortDismiss: { padding: 6 },
  sortItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  sortItemActive: { backgroundColor: "#F0F3FF" },
  sortItemText: { fontSize: 15, color: C.textMid },
  sortItemTextActive: { color: C.navy, fontWeight: "700" },
  sortCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  sortCancelBtn: {
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  sortCancelText: { fontSize: 15, fontWeight: "600", color: C.textMid },

  // ── Action Menu (re-themed: navy + orange) ──────────────────────────────────
  actionOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(21,29,79,0.5)",
  },
  actionOverlayWeb: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(21,29,79,0.4)",
  },
  actionMenu: {
    backgroundColor: C.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
    overflow: "hidden",
  },
  actionMenuWeb: {
    borderRadius: 20,
    minWidth: 320,
    maxWidth: 360,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  menuHeader: {
    backgroundColor: C.navy,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 3,
    borderBottomColor: C.orange,
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: C.white,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  menuSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    marginTop: 4,
    fontWeight: "700",
  },
  menuCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  actionItemIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: C.orangePale,
    borderWidth: 1,
    borderColor: C.orangeBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  actionItemText: { fontSize: 15, color: C.textDark, fontWeight: "600" },
  actionItemSub: { fontSize: 11.5, color: C.textLight, marginTop: 2 },
  actionDismissBtn: {
    marginHorizontal: 20,
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.orange,
    alignItems: "center",
  },
  actionDismissText: { fontSize: 15, fontWeight: "700", color: C.white },

  // ── Document screen shell (Invoice / Shipping Label modals) ────────────────
  docScreen: { flex: 1, backgroundColor: C.white },
  docLoadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  docLoadingText: { fontSize: 14, color: C.textMid },
  docErrorText: { fontSize: 14, color: C.red, textAlign: "center" },
  docTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 52 : 16,
    paddingBottom: 14,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  docTopBarTitle: { fontSize: 16, fontWeight: "800", color: C.navyDeep },
  docTopClose: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  docScroll: { padding: 16, paddingBottom: 100, alignItems: "center", backgroundColor: C.white },
  docActionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.border,
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
  },
  docBtnPrint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.orange,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 13,
    minWidth: 120,
    justifyContent: "center",
  },
  docBtnPrintText: { fontSize: 14, fontWeight: "700", color: C.white },
  docBtnDownload: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.green,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 13,
    minWidth: 120,
    justifyContent: "center",
  },
  docBtnDownloadText: { fontSize: 14, fontWeight: "700", color: C.white },
  docBtnClose: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.white,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.navy,
    paddingHorizontal: 20,
    paddingVertical: 13,
    minWidth: 120,
    justifyContent: "center",
  },
  docBtnCloseText: { fontSize: 14, fontWeight: "700", color: C.navy },

  // ── Shipping label sheet ─────────────────────────────────────────────────────
  labelSheet: {
    backgroundColor: C.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  labelBrandHeader: {
    alignItems: "center",
    paddingTop: 22,
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  labelBrandLogo: { width: 200, height: 52, marginBottom: 6 },
  labelBrandTag: { fontSize: 10, color: C.textLight, marginTop: 2 },
  labelTitleText: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "800",
    color: C.textLight,
    letterSpacing: 2,
  },

  labelCourierBar: {
    backgroundColor: C.bg,
    borderTopWidth: 2,
    borderTopColor: C.navy,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingVertical: 8,
    alignItems: "center",
  },
  labelCourierBarText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.textMid,
  },
  labelAwbArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  labelAwbLeft: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  labelAwbCaption: {
    fontSize: 9,
    fontWeight: "700",
    color: C.textLight,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  barcodeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 44,
    gap: 2,
  },
  barcodeBar: { width: 2, backgroundColor: C.textDark },
  labelAwbNumber: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
  },
  labelQrBox: {
    width: 72,
    height: 72,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  labelSection: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  labelSectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: C.orange,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  labelShipName: {
    fontSize: 15,
    fontWeight: "800",
    color: C.navyDeep,
    textTransform: "capitalize",
    marginBottom: 3,
  },
  labelShipAddress: { fontSize: 12.5, color: C.textMid, lineHeight: 19 },

  labelMetaList: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.bg,
  },
  labelMetaRow: { flexDirection: "row", gap: 6 },
  labelMetaKList: { fontSize: 12, fontWeight: "800", color: C.textDark },
  labelMetaVList: { fontSize: 12, color: C.textMid, flexShrink: 1 },

  labelSectionLabelBar: {
    backgroundColor: C.bg,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  labelSectionLabelBarText: {
    fontSize: 10,
    fontWeight: "700",
    color: C.orange,
    letterSpacing: 1.2,
  },

  labelProductHead: {
    flexDirection: "row",
    backgroundColor: C.navyDeep,
    paddingVertical: 9,
    paddingHorizontal: 8,
  },
  labelProductHeadText: {
    color: C.white,
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  labelProductHeadCenter: { textAlign: "center" },
  labelProductRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    alignItems: "center",
  },
  labelProductName: { fontSize: 11, fontWeight: "700", color: C.textDark },
  labelProductNum: {
    fontSize: 10.5,
    fontWeight: "700",
    color: C.textDark,
    textAlign: "right",
  },
  labelProductCenter: { textAlign: "center" },
  labelTotalsRowFull: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    alignItems: "center",
  },
  labelTotalsLabel: {
    fontSize: 11.5,
    fontWeight: "800",
    color: C.textMid,
    textAlign: "right",
  },
  labelTotalsValueCell: {
    fontSize: 11,
    fontWeight: "800",
    color: C.textDark,
    textAlign: "right",
  },

  labelReturnName: {
    fontWeight: "800",
    fontSize: 12.5,
    color: C.textDark,
    marginBottom: 4,
  },
  labelReturnAddr: { fontSize: 11.5, color: C.textMid, lineHeight: 17 },

  labelFooterNote: { alignItems: "center", padding: 16, gap: 4 },
  labelFooterGst: { fontSize: 10.5, fontWeight: "700", color: C.textMid },
  labelFooterAuto: { fontSize: 9.5, color: C.textLight, letterSpacing: 0.4 },
  labelFooterPowered: { fontSize: 10, color: C.textLight, marginTop: 3 },

  // ── Invoice sheet (REDESIGNED to match supplied PDF) ───────────────────────
  invoiceSheet: {
    backgroundColor: C.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    padding: 24,
  },

  // Top header row: brand+sender info (left) vs INVOICE meta+QR (right)
  invTopHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 20,
  },
  invTopHeaderRowNarrow: {
    flexDirection: "column",
    gap: 16,
  },
  invBrandCol: { flex: 1.3, minWidth: 200 },
  invBrandRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  invBrandLogo: { width: 220, height: 56, marginBottom: 10 },
  invBrandName: { fontSize: 19, fontWeight: "800", letterSpacing: -0.2 },
  invBrandTag: { fontSize: 10.5, color: C.textLight, marginTop: 2 },

  invSenderInfo: { marginTop: 14, gap: 2 },
  invSenderName: {
    fontSize: 13.5,
    fontWeight: "800",
    color: C.textDark,
    marginBottom: 2,
  },
  invSenderLine: { fontSize: 12, color: C.textMid, lineHeight: 18 },

  invMetaColRight: { alignItems: "flex-end", flexShrink: 0 },
  invMetaColRightNarrow: { alignItems: "flex-start" },
  invTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: C.orange,
    letterSpacing: 1,
  },
  invMetaLine: {
    fontSize: 12.5,
    color: C.textDark,
    fontWeight: "700",
    marginTop: 6,
  },
  invMetaLineMuted: { fontSize: 11.5, color: C.textMid, marginTop: 2 },
  invQrBox: {
    marginTop: 14,
    width: 84,
    height: 84,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  invQrCaption: {
    fontSize: 10,
    color: C.textLight,
    marginTop: 6,
  },

  invSenderBlock: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  invSection: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  invSectionLabelNavy: {
    fontSize: 11,
    fontWeight: "700",
    color: C.navy,
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  invSectionLabelOrange: {
    fontSize: 11,
    fontWeight: "700",
    color: C.orange,
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  invBoldName: {
    fontSize: 13.5,
    fontWeight: "800",
    color: C.textDark,
    marginBottom: 4,
  },
  invMutedLine: { fontSize: 12, color: C.textMid, lineHeight: 18 },

  invBsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  invBsCol: { flex: 1, minWidth: 160 },

  invTable: {
    marginTop: 18,
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
  },
  invTableHead: {
    flexDirection: "row",
    backgroundColor: C.navyDeep,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  invTh: {
    color: C.white,
    fontSize: 9.5,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  invThCenter: { textAlign: "center" },
  invThRight: { textAlign: "right" },
  invTr: {
    flexDirection: "row",
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
    alignItems: "center",
  },
  invTdName: { fontSize: 12.5, fontWeight: "700", color: C.textDark },
  invTdVariant: { fontSize: 10.5, color: C.textLight, marginTop: 2 },
  invTdNum: { fontSize: 11.5, color: C.textMid, textAlign: "right" },
  invTdCenter: { textAlign: "center" },

  invTotalsWrap: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 18,
  },
  invTotalsBox: { width: "100%", maxWidth: 300 },
  invTotalsLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  invTotalsLabel: { fontSize: 13, color: C.textMid },
  invTotalsValue: { fontSize: 13, color: C.textMid, fontWeight: "600" },
  invGrandLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 2,
    borderTopColor: C.navyDeep,
    marginTop: 6,
    paddingTop: 12,
  },
  invGrandLabel: { fontSize: 15, fontWeight: "800", color: C.navyDeep },
  invGrandValue: { fontSize: 17, fontWeight: "800", color: C.orange },

  invGstBlock: {
    marginTop: 22,
    borderLeftWidth: 4,
    borderLeftColor: C.orange,
    backgroundColor: C.orangePale,
    padding: 16,
    borderRadius: 6,
  },
  invGstTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: C.orange,
    marginBottom: 10,
  },
  invGstLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  invGstLineTotal: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.orangeBorder,
  },
  invGstK: { fontSize: 12.5, color: C.textMid },
  invGstV: { fontSize: 12.5, fontWeight: "700", color: C.navyDeep },
  invGstKTotal: { fontSize: 13, fontWeight: "800", color: C.textDark },
  invGstVTotal: { fontSize: 14, fontWeight: "800", color: C.orange },
  invGstNote: {
    fontSize: 10.5,
    color: C.textLight,
    fontStyle: "italic",
    marginTop: 8,
  },

  invPaymentBlock: {
    marginTop: 22,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  invPaymentTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: C.navyDeep,
    marginBottom: 8,
  },
  invPaymentLine: { fontSize: 12.5, color: C.textMid },
  invPaymentStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  invPayChip: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 2 },
  invPayChipPaid: { backgroundColor: C.greenPale },
  invPayChipPending: { backgroundColor: C.yellowPale },
  invPayChipText: {
    fontSize: 10.5,
    fontWeight: "800",
    textTransform: "uppercase",
  },

  invThankYouBlock: {
    marginTop: 26,
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: C.orange,
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: C.bg,
    borderRadius: 6,
  },
  invThankYouTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: C.orange,
    marginBottom: 6,
    textAlign: "center",
  },
  invThankYouLine: {
    fontSize: 11.5,
    color: C.textMid,
    textAlign: "center",
  },
  invThankYouContact: {
    fontSize: 12,
    fontWeight: "800",
    color: C.navyDeep,
    marginTop: 4,
  },

  invDocFooter: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 10.5,
    color: C.textLight,
  },

  // ── Grid ─────────────────────────────────────────────────────────────────────
  gridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: GRID_GUTTER,
    rowGap: 24,
    alignItems: "flex-start",
  },
  gridItem: {},
  gridItemFull: { width: "100%" },

  gridCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    shadowColor: C.navyDeep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  gridCardWeb: {},
  cardAccent: { height: 3 },

  gridCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 8,
  },
  orderIdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  gridOrderNum: {
    fontSize: 15,
    fontWeight: "600",
    color: C.navyDeep,
    letterSpacing: -0.3,
  },
  copyBtn: { padding: 3 },
  metaRow: { flexDirection: "row", alignItems: "center" },
  metaText: { fontSize: 10, color: C.textLight },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  moreBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bg,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
    marginHorizontal: 12,
  },

  prodSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  prodThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  prodThumbEmpty: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  prodInfo: { flex: 1, minWidth: 0 },
  prodName: {
    fontSize: 12,
    fontWeight: "700",
    color: C.textDark,
    lineHeight: 16,
  },
  prodMeta: { fontSize: 11, color: C.textLight, marginTop: 3, lineHeight: 14 },

  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  customerRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 10, fontWeight: "800", color: C.navy },
  customerName: {
    fontSize: 12,
    fontWeight: "600",
    color: C.textDark,
    flexShrink: 1,
  },
  amountVal: {
    fontSize: 15,
    fontWeight: "700",
    color: C.orange,
    letterSpacing: -0.3,
    flexShrink: 0,
  },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },

  gstBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  gstBadgeFiled: { backgroundColor: C.greenPale },
  gstBadgePending: { backgroundColor: C.yellowPale },
  gstDot: { width: 5, height: 5, borderRadius: 3 },
  gstBadgeText: { fontSize: 11, fontWeight: "600" },

  ctaRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  ctaText: { fontSize: 12, fontWeight: "600", color: C.blue },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  badgeDot: { width: 5, height: 5, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: "700" },

  // ── List / Table ─────────────────────────────────────────────────────────────
  tableScroll: {},
  tableWrap: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    minWidth: 1200,
  },
  tHead: {
    flexDirection: "row",
    backgroundColor: C.navyDeep,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  th: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  tRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    alignItems: "flex-start",
    backgroundColor: C.white,
    minHeight: 72,
  },
  tRowAlt: { backgroundColor: "#FAFBFF" },
  tcell: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    justifyContent: "center",
  },

  colOrder: { width: 160 },
  colCustomer: { width: 180 },
  colSeller: { width: 160 },
  colProducts: { width: 200 },
  colAmount: { width: 130 },
  colStatus: { width: 120 },
  colGst: { width: 110 },
  colDocs: { width: 90 },
  colAction: { width: 110 },

  tdOrderNum: {
    fontSize: 13,
    fontWeight: "700",
    color: C.navyDeep,
    marginBottom: 2,
  },
  tdName: { fontSize: 13, fontWeight: "600", color: C.textDark },
  tdEmail: { fontSize: 11, color: C.textLight, marginTop: 1 },
  tdSellerName: { fontSize: 12, fontWeight: "700", color: C.textDark },
  tdProductName: { fontSize: 11, fontWeight: "600", color: C.textDark },
  tdAmount: { fontSize: 14, fontWeight: "800", color: C.orange },
  tdPayment: { fontSize: 10, color: C.textLight, marginTop: 3 },
  tdMuted: { fontSize: 11, color: C.textLight },

  customerRowInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatarSm: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarSmText: { fontSize: 10, fontWeight: "800", color: C.navy },

  tableProductRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tableThumb: {
    width: 32,
    height: 32,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: C.border,
  },
  tableThumbEmpty: {
    width: 32,
    height: 32,
    borderRadius: 7,
    backgroundColor: "#F3F4F6",
  },
  tableDocRow: { flexDirection: "row", gap: 4 },
  tableDocBtn: {
    width: 30,
    height: 30,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  tableActions: { flexDirection: "row", gap: 6, alignItems: "center" },
  viewBtnSm: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.navy,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  viewBtnSmText: { fontSize: 11, fontWeight: "700", color: C.white },

  // ── Pagination ───────────────────────────────────────────────────────────────
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  paginationInfo: { fontSize: 13, color: C.textMid },
  paginationControls: { flexDirection: "row", alignItems: "center", gap: 6 },
  pageBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.card,
  },
  pageBtnActive: { backgroundColor: C.navy, borderColor: C.navy },
  pageBtnOff: { opacity: 0.35 },
  pageBtnText: { fontSize: 13, fontWeight: "600", color: C.textMid },
  pageBtnTextActive: { color: C.white },
  pageEllipsis: { fontSize: 13, color: C.textLight, paddingHorizontal: 2 },

  // ── State boxes ──────────────────────────────────────────────────────────────
  stateBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  stateText: { fontSize: 16, fontWeight: "700", color: C.textMid },
  stateSub: { fontSize: 13, color: C.textLight },
  errorText: {
    fontSize: 14,
    color: C.red,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: C.navy,
  },
  retryText: { color: C.white, fontWeight: "700", fontSize: 13 },
});