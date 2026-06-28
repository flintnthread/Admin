import React, { useCallback, useEffect, useState } from "react";
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
} from "react-native";
import { Feather } from "@expo/vector-icons";
import AdminLayout from "@/components/admin-layout";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getApiErrorMessage } from "@/lib/api/client";
import { mapPayoutDetailToSpdOrder } from "@/lib/mappers";
import { fetchPayoutDetail, generatePayoutInvoice, markPayoutPaid } from "@/services/payoutApi";

// ─── THEME ────────────────────────────────────────────────────────────────────
const PRIMARY = "#ef7b1a";
const DARK = "#79411c";
const PRIMARY_LIGHT = "#fef3e9";
const BG_PAGE = "#faf7f5";
const BG_CARD = "#FFFFFF";
const TEXT_HEAD = "#1a0f08";
const TEXT_BODY = "#504f56";
const TEXT_MUTED = "#9b8b7e";
const BORDER = "#ede5de";
const GREEN = "#1a7a45";
const GREEN_BG = "#e8f7ee";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type PaymentStatus = "Pending" | "Paid" | "Cancelled";
type ReminderBucket = "green" | "orange" | "red";
type CityType = "Intra-City" | "Metro-Metro";

interface PayoutLineItem {
    productName: string;
    hsn: string;
    sku: string;
    qty: number;
    basePrice: number;
    total: number;
}

interface SellerOrder {
    id: number;
    orderId: string;
    orderDate: string;
    orderStatus: "Completed" | "Processing";
    sellerName: string;
    sellerEmail: string;
    sellerPhone: string;
    customerPaid: string;
    deliveryDate: string;
    deliveryTime: string;
    reminderLabel: string;
    reminderDays: number;
    reminderBucket: ReminderBucket;
    paymentStatus: PaymentStatus;
    walletBalance: string;
    // Customer & shipping
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    shippingAddressLine1: string;
    shippingAddressLine2: string;
    shippingCity: string;
    shippingState: string;
    shippingPincode: string;
    cityType: CityType;
    // Invoice fields
    sellerGstin?: string;
    sellerAddressLine1?: string;
    sellerAddressLine2?: string;
    sellerCity?: string;
    sellerState?: string;
    sellerPincode?: string;
    bankAccountHolder?: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankIfsc?: string;
    itemDescription?: string;
    hsn?: string;
    sku?: string;
    qty?: number;
    basePrice?: number;
    totalAmount?: number;
    orderRef?: string;
    // Price breakdown fields (from API / mapper)
    mrpExclGst?: number;
    discountPercent?: number;
    discountAmount?: number;
    sellingPriceExclGst?: number;
    gstPercent?: number;
    gstAmount?: number;
    sellingPriceWithGst?: number;
    commissionPercent?: number;
    commissionAmount?: number;
    sellingPlusCommission?: number;
    mrpWithGst?: number;
    // Numeric breakdown from API
    customerPaidNum?: number;
    orderAmountNum?: number;
    gstAmountNum?: number;
    deliveryChargeNum?: number;
    commissionAmountNum?: number;
    commissionRateNum?: number;
    finalPayableNum?: number;
    items?: PayoutLineItem[];
    transactionRef?: string;
    adminNote?: string;
    invoiceNumber?: string;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const getReminderColor = (bucket: ReminderBucket) => {
    if (bucket === "green") return { bg: "#e8f7ee", color: "#1a7a45", dot: "#22c55e" };
    if (bucket === "orange") return { bg: PRIMARY_LIGHT, color: PRIMARY, dot: PRIMARY };
    return { bg: "#fce8e8", color: "#b91c1c", dot: "#ef4444" };
};

const getPaymentColor = (status: PaymentStatus) => {
    if (status === "Paid") return { bg: "#e8f7ee", color: "#1a7a45" };
    if (status === "Cancelled") return { bg: "#fce8e8", color: "#b91c1c" };
    return { bg: PRIMARY_LIGHT, color: PRIMARY };
};

const getInitials = (name?: string) =>
    (name || "N A").split(" ").map(w => w?.[0] || "").join("").toUpperCase().slice(0, 2);

const fmtAmt = (n: number) =>
    `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── INVOICE: NUMBER TO WORDS ─────────────────────────────────────────────────
const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function numToWords(n: number): string {
    if (n === 0) return "Zero";
    if (n < 20) return ONES[n];
    if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");
    if (n < 1000) return ONES[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + numToWords(n % 100) : "");
    if (n < 100000) return numToWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + numToWords(n % 1000) : "");
    if (n < 10000000) return numToWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + numToWords(n % 100000) : "");
    return numToWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + numToWords(n % 10000000) : "");
}

const amountInWords = (amount: number) => {
    const rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);
    const rupeeWords = rupees > 0 ? `${numToWords(rupees)} Rupees` : "Zero Rupees";
    const paiseWords = paise > 0 ? ` and ${numToWords(paise)} Paise` : "";
    return `${rupeeWords}${paiseWords} Only`;
};

// ─── COMPANY CONSTANTS ────────────────────────────────────────────────────────
const COMPANY = {
    name1: "FLINT", name2: "& THREAD",
    tagline: "The Infinity and Beyond",
    addressLine: "Hyderabad, Telangana, India",
    phone: "+91 9063459092",
    email: "support@flintthread.in",
    website: "www.flintthread.in",
    gstin: "29AAFCT1136R1Z0",
    supportEmail: "support@flintthread.in",
    supportPhone: "+91 9063459092",
    legalName: "Flint & Thread India Pvt. Ltd.",
    year: new Date().getFullYear(),
};

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
const SectionHeader: React.FC<{ icon: string; title: string; accent?: string }> = ({ icon, title, accent = PRIMARY }) => (
    <View style={sectionStyles.row}>
        <View style={[sectionStyles.iconWrap, { backgroundColor: accent }]}>
            <Feather name={icon as any} size={14} color="#fff" />
        </View>
        <Text style={sectionStyles.title}>{title}</Text>
        <View style={sectionStyles.line} />
    </View>
);
const sectionStyles = StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14, marginTop: 4 },
    iconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    title: { fontSize: 13, fontWeight: "800", color: TEXT_HEAD, textTransform: "uppercase", letterSpacing: 0.6 },
    line: { flex: 1, height: 1, backgroundColor: BORDER },
});

// ─── INFO ROW ─────────────────────────────────────────────────────────────────
const InfoRow: React.FC<{ label: string; value: string; valueColor?: string; bold?: boolean }> = ({ label, value, valueColor = TEXT_HEAD, bold = false }) => (
    <View style={infoStyles.row}>
        <Text style={infoStyles.label}>{label}</Text>
        <Text style={[infoStyles.value, { color: valueColor, fontWeight: bold ? "800" : "600" }]}>{value}</Text>
    </View>
);
const infoStyles = StyleSheet.create({
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "#f3ece6" },
    label: { fontSize: 12, color: TEXT_MUTED, fontWeight: "600", flex: 1 },
    value: { fontSize: 13, flex: 1, textAlign: "right" },
});

// ─── ADDRESS CHIP ─────────────────────────────────────────────────────────────
const AddressChip: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <View style={addressChipStyles.chip}>
        <Text style={addressChipStyles.label}>{label}</Text>
        <Text style={addressChipStyles.value} numberOfLines={1}>{value}</Text>
    </View>
);
const addressChipStyles = StyleSheet.create({
    chip: { flex: 1, minWidth: 100, backgroundColor: BG_PAGE, borderRadius: 10, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, paddingVertical: 9 },
    label: { fontSize: 10, color: TEXT_MUTED, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 3 },
    value: { fontSize: 13, color: TEXT_HEAD, fontWeight: "700" },
});

// ─── ACTION BUTTON ────────────────────────────────────────────────────────────
const ActionButton: React.FC<{ icon: string; label: string; color: string; onPress: () => void; flex?: boolean; width?: any }> = ({ icon, label, color, onPress, flex, width }) => (
    <TouchableOpacity style={[actionStyles.btn, { backgroundColor: color, flex: flex ? 1 : undefined, width }]} onPress={onPress} activeOpacity={0.8}>
        {icon === "dollar-sign" ? (
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "800", marginTop: -1 }}>₹</Text>
        ) : (
            <Feather name={icon as any} size={14} color="#fff" />
        )}
        <Text style={actionStyles.text}>{label}</Text>
    </TouchableOpacity>
);
const actionStyles = StyleSheet.create({
    btn: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 10, justifyContent: "center" },
    text: { color: "#fff", fontWeight: "700", fontSize: 13 },
});

// ─── COST ROW ─────────────────────────────────────────────────────────────────
const CostRow: React.FC<{ label: string; value: string; highlight?: boolean; dimmed?: boolean }> = ({ label, value, highlight, dimmed }) => (
    <View style={costStyles.row}>
        <Text style={[costStyles.label, dimmed && { color: TEXT_MUTED }]}>{label}</Text>
        <Text style={[costStyles.value, highlight && { color: PRIMARY, fontSize: 17, fontWeight: "800" }, dimmed && { color: TEXT_MUTED }]}>{value}</Text>
    </View>
);
const costStyles = StyleSheet.create({
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3ece6" },
    label: { fontSize: 13, color: TEXT_BODY, fontWeight: "600" },
    value: { fontSize: 14, color: TEXT_HEAD, fontWeight: "700" },
});

// ─── PRICE BREAKDOWN ROW (matches reference image exactly) ───────────────────
type PBRowVariant = "normal" | "negative" | "positive" | "subtotal-green" | "subtotal-bold" | "total-orange" | "divider";

const PriceBreakdownRow: React.FC<{
    label: string;
    value?: string;
    variant?: PBRowVariant;
    isHeader?: boolean;
}> = ({ label, value, variant = "normal", isHeader = false }) => {
    if (variant === "divider") {
        return <View style={pbStyles.divider} />;
    }

    const labelStyle: any[] = [pbStyles.label];
    const valueStyle: any[] = [pbStyles.value];

    if (isHeader) {
        labelStyle.push(pbStyles.labelHeader);
        valueStyle.push(pbStyles.labelHeader);
    }

    switch (variant) {
        case "negative":
            valueStyle.push({ color: "#e53e3e" });
            break;
        case "positive":
            valueStyle.push({ color: PRIMARY });
            break;
        case "subtotal-green":
            labelStyle.push({ color: GREEN, fontWeight: "800" as any, fontSize: 14 });
            valueStyle.push({ color: GREEN, fontWeight: "800" as any, fontSize: 14 });
            break;
        case "subtotal-bold":
            labelStyle.push({ fontWeight: "800" as any, color: TEXT_HEAD, fontSize: 13 });
            valueStyle.push({ fontWeight: "800" as any, color: TEXT_HEAD, fontSize: 13 });
            break;
        case "total-orange":
            labelStyle.push({ fontWeight: "800" as any, color: PRIMARY, fontSize: 14 });
            valueStyle.push({ fontWeight: "800" as any, color: PRIMARY, fontSize: 14 });
            break;
    }

    return (
        <View style={[pbStyles.row, (variant === "subtotal-green" || variant === "subtotal-bold" || variant === "total-orange") && pbStyles.rowHighlight]}>
            <Text style={labelStyle}>{label}</Text>
            {value !== undefined && <Text style={valueStyle}>{value}</Text>}
        </View>
    );
};

const pbStyles = StyleSheet.create({
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 9,
        paddingHorizontal: 16,
    },
    rowHighlight: {
        backgroundColor: "#fafafa",
        borderRadius: 6,
        marginHorizontal: -4,
        paddingHorizontal: 12,
    },
    label: { fontSize: 13, color: TEXT_BODY, fontWeight: "500", flex: 1 },
    labelHeader: { fontSize: 13, fontWeight: "800", color: TEXT_HEAD },
    value: { fontSize: 13, color: TEXT_HEAD, fontWeight: "600", textAlign: "right" },
    divider: { height: 1, backgroundColor: BORDER, marginVertical: 6, marginHorizontal: 4 },
});

// ─── PRICE BREAKDOWN CARD ─────────────────────────────────────────────────────
const PriceBreakdownCard: React.FC<{ order: SellerOrder }> = ({ order }) => {
    // Derive values — use API fields if present, else calculate from customerPaid
    const parseAmount = (str: string) => parseFloat(str.replace(/[^0-9.]/g, "")) || 0;
    const customerPaidNum = parseAmount(order.customerPaid);

    // If API provides breakdown fields use them, else derive sensible defaults
    const gstPct = order.gstPercent ?? 5;
    const commissionPct = order.commissionPercent ?? 15;
    const discountPct = order.discountPercent ?? 0;

    // Work backwards from customerPaid (which is sellingPriceWithGst)
    const sellingWithGst = order.sellingPriceWithGst ?? customerPaidNum;
    const gstAmt = order.gstAmount ?? +((sellingWithGst * gstPct) / (100 + gstPct)).toFixed(2);
    const sellingExclGst = order.sellingPriceExclGst ?? +(sellingWithGst - gstAmt).toFixed(2);
    const discountAmt = order.discountAmount ?? +(sellingExclGst * discountPct / 100).toFixed(2);
    const mrpExclGst = order.mrpExclGst ?? +(sellingExclGst + discountAmt).toFixed(2);
    const commissionAmt = order.commissionAmount ?? +((sellingWithGst * commissionPct) / 100).toFixed(2);
    const sellingPlusCommission = order.sellingPlusCommission ?? +(sellingWithGst + commissionAmt).toFixed(2);
    const mrpWithGst = order.mrpWithGst ?? +(mrpExclGst * (1 + gstPct / 100)).toFixed(2);

    return (
        <View style={styles.card}>
            <SectionHeader icon="tag" title="Price Breakdown" accent="#1d4ed8" />

            <View style={pbStyles2.container}>
                {/* MRP (Excl. GST) */}
                <PriceBreakdownRow
                    label="MRP (Excl. GST)"
                    value={fmtAmt(mrpExclGst)}
                    variant="normal"
                />

                {/* Discount */}
                <PriceBreakdownRow
                    label={`Discount (${discountPct.toFixed(2)}%)`}
                    value={discountAmt > 0 ? `- ${fmtAmt(discountAmt)}` : fmtAmt(0)}
                    variant="negative"
                />

                {/* Selling Price Excl GST */}
                <PriceBreakdownRow
                    label="Selling Price (Excl. GST)"
                    value={fmtAmt(sellingExclGst)}
                    variant="normal"
                />

                {/* GST */}
                <PriceBreakdownRow
                    label={`GST (${gstPct.toFixed(2)}%)`}
                    value={`+ ${fmtAmt(gstAmt)}`}
                    variant="positive"
                />

                <PriceBreakdownRow label="" variant="divider" />

                {/* Selling Price With GST — green subtotal */}
                <PriceBreakdownRow
                    label="Selling Price (With GST)"
                    value={fmtAmt(sellingWithGst)}
                    variant="subtotal-green"
                />

                {/* Commission */}
                <PriceBreakdownRow
                    label={`Commission (${commissionPct.toFixed(2)}% of SP w/ GST)`}
                    value={`+ ${fmtAmt(commissionAmt)}`}
                    variant="positive"
                />

                <PriceBreakdownRow label="" variant="divider" />

                {/* Selling Price + Commission = Total — bold */}
                <PriceBreakdownRow
                    label="Selling Price (With GST) + Commission = Total"
                    value={fmtAmt(sellingPlusCommission)}
                    variant="subtotal-bold"
                />

                <PriceBreakdownRow label="" variant="divider" />

                {/* MRP (With GST) — orange total */}
                <PriceBreakdownRow
                    label="MRP (With GST)"
                    value={fmtAmt(mrpWithGst)}
                    variant="total-orange"
                />
            </View>
        </View>
    );
};

const pbStyles2 = StyleSheet.create({
    container: {
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: BG_CARD,
    },
});

// ─── CUSTOMER & SHIPPING CARD ─────────────────────────────────────────────────
const CustomerShippingCard: React.FC<{ order: SellerOrder }> = ({ order }) => {
    const customerInitials = getInitials(order.customerName);
    return (
        <View style={styles.card}>
            <SectionHeader icon="map-pin" title="Customer & Shipping" accent="#0f766e" />
            <View style={styles.avatarRow}>
                <View style={[styles.avatar, { backgroundColor: "#0f766e" }]}>
                    <Text style={styles.avatarText}>{customerInitials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.avatarName}>{order.customerName || "Unknown Customer"}</Text>
                    <Text style={styles.avatarSub}>{order.customerPhone || "—"}</Text>
                    {order.customerEmail ? <Text style={styles.avatarSub}>{order.customerEmail}</Text> : null}
                </View>
                <View style={[styles.cityTypePill, { backgroundColor: order.cityType === "Intra-City" ? PRIMARY_LIGHT : "#e6f1fb" }]}>
                    <Text style={[styles.cityTypeText, { color: order.cityType === "Intra-City" ? PRIMARY : "#185fa5" }]}>
                        {order.cityType || "N/A"}
                    </Text>
                </View>
            </View>
            <View style={styles.addressBlock}>
                <View style={styles.addressBlockHeader}>
                    <Feather name="home" size={12} color={TEXT_MUTED} />
                    <Text style={styles.addressBlockLabel}>Delivery address</Text>
                </View>
                <Text style={styles.addressFreeText}>
                    {order.shippingAddressLine1 || "No Address Provided"}
                    {order.shippingAddressLine2 ? `, ${order.shippingAddressLine2}` : ""}
                </Text>
                <View style={styles.addressChipsRow}>
                    <AddressChip label="City" value={order.shippingCity || "—"} />
                    <AddressChip label="State" value={order.shippingState || "—"} />
                    <AddressChip label="Pincode" value={order.shippingPincode || "—"} />
                </View>
            </View>
        </View>
    );
};

// ─── INVOICE MODAL PIECES ─────────────────────────────────────────────────────
const InvoiceDetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <View style={invDr.row}>
        <Text style={invDr.label}>{label}</Text>
        <Text style={invDr.value}>{value}</Text>
    </View>
);
const invDr = StyleSheet.create({
    row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, gap: 10 },
    label: { fontSize: 11, color: TEXT_MUTED, fontWeight: "600" },
    value: { fontSize: 11, color: TEXT_HEAD, fontWeight: "700", textAlign: "right", flexShrink: 1 },
});

const InvoiceSettlementRow: React.FC<{ label: string; value: string; negative?: boolean; bold?: boolean }> = ({ label, value, negative, bold }) => (
    <View style={invSr.row}>
        <Text style={[invSr.label, bold && { fontWeight: "800", color: TEXT_HEAD }]}>{label}</Text>
        <Text style={[invSr.value, negative && { color: "#b91c1c" }, bold && { fontWeight: "800" }]}>{value}</Text>
    </View>
);
const invSr = StyleSheet.create({
    row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
    label: { fontSize: 12, color: TEXT_BODY, fontWeight: "600" },
    value: { fontSize: 12, color: TEXT_HEAD, fontWeight: "700" },
});

// ─── INVOICE MODAL ────────────────────────────────────────────────────────────
interface InvoiceModalProps {
    visible: boolean;
    onClose: () => void;
    order: SellerOrder;
    invoiceNo: string;
    generatedAt: string;
    orderRef: string;
    customerPaidNum: number;
    gstAmount: number;
    deliveryCharge: number;
    commissionAmount: number;
    commissionRate: number;
    sellerEarning: number;
    onPrint: () => void;
    onRegenerate: () => void;
    regenLoading?: boolean;
}

const InvoiceModalView: React.FC<InvoiceModalProps> = ({
    visible, onClose, order, invoiceNo, generatedAt, orderRef,
    customerPaidNum, gstAmount, deliveryCharge, commissionAmount, commissionRate, sellerEarning,
    onPrint, onRegenerate, regenLoading,
}) => {
    const isWeb = Platform.OS === "web";
    const fmtInv = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const lineItems = order.items?.length
        ? order.items
        : [{
            productName: order.itemDescription || "Product",
            hsn: order.hsn || "-",
            sku: order.sku || "-",
            qty: order.qty ?? 1,
            basePrice: order.basePrice ?? customerPaidNum,
            total: order.totalAmount ?? customerPaidNum,
        }];

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={invStyles.overlay}>
                <View style={[invStyles.sheet, isWeb && invStyles.sheetWeb]}>
                    <View style={invStyles.topBar}>
                        <Text style={invStyles.topBarTimestamp}>{generatedAt}</Text>
                        <Text style={invStyles.topBarTitle} numberOfLines={1}>Seller Payment Invoice - {invoiceNo}</Text>
                        <View style={invStyles.topBarActions}>
                            <TouchableOpacity style={invStyles.iconBtn} onPress={onPrint} activeOpacity={0.75}>
                                <Feather name="printer" size={13} color={TEXT_BODY} />
                                <Text style={invStyles.iconBtnText}>Print</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={invStyles.iconBtn} onPress={onRegenerate} activeOpacity={0.75} disabled={regenLoading}>
                                <Feather name="rotate-ccw" size={13} color={TEXT_BODY} />
                                <Text style={invStyles.iconBtnText}>{regenLoading ? "Regenerating…" : "Regenerate"}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={invStyles.closeBtn} onPress={onClose} activeOpacity={0.75}>
                                <Feather name="x" size={16} color={TEXT_BODY} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView style={invStyles.scroll} contentContainerStyle={invStyles.scrollContent} showsVerticalScrollIndicator={false}>
                        <View style={invStyles.page} nativeID="invoice-print-area">
                            <View style={invStyles.brandRow}>
                                <View style={invStyles.brandLeft}>
                                    <View style={invStyles.logoRow}>
                                        <Image
                                            source={require("../../assets/images/flint-thread-logo.png")}
                                            style={{ height: 40, width: 150, resizeMode: "contain" }}
                                        />
                                    </View>
                                    <Text style={invStyles.tagline}>{COMPANY.tagline}</Text>
                                    <View style={{ marginTop: 10, gap: 2 }}>
                                        <Text style={invStyles.companyLine}>{COMPANY.addressLine}</Text>
                                        <Text style={invStyles.companyLine}>{COMPANY.phone}</Text>
                                        <Text style={invStyles.companyLine}>{COMPANY.email}</Text>
                                        <Text style={invStyles.companyLine}>{COMPANY.website}</Text>
                                        <Text style={invStyles.companyLine}>GSTIN: {COMPANY.gstin}</Text>
                                    </View>
                                </View>
                                <View style={invStyles.brandRight}>
                                    <Text style={invStyles.sellerPaymentTitle}>SELLER PAYMENT</Text>
                                    <View style={{ marginTop: 8, gap: 3 }}>
                                        <Text style={invStyles.metaLine}><Text style={invStyles.metaLabel}>Invoice No: </Text><Text style={invStyles.metaValue}>{invoiceNo}</Text></Text>
                                        <Text style={invStyles.metaLine}><Text style={invStyles.metaLabel}>Date: </Text><Text style={invStyles.metaValue}>{generatedAt.split(",")[0]}</Text></Text>
                                        <Text style={invStyles.metaLine}><Text style={invStyles.metaLabel}>Order Ref: </Text><Text style={invStyles.metaValue}>{orderRef}</Text></Text>
                                    </View>
                                </View>
                            </View>

                            <View style={invStyles.divider} />

                            <View style={[invStyles.twoColRow, !isWeb && { flexDirection: "column", alignItems: "stretch" }]}>
                                <View style={invStyles.infoCard}>
                                    <Text style={invStyles.infoCardTitle}>BENEFICIARY DETAILS</Text>
                                    <Text style={invStyles.beneficiaryName}>{order.sellerName}</Text>
                                    <Text style={invStyles.beneficiaryAddr}>
                                        {[order.sellerAddressLine1, order.sellerAddressLine2, order.sellerCity, order.sellerState, order.sellerPincode].filter(Boolean).join(", ") || "Address not provided"}
                                    </Text>
                                    <Text style={invStyles.beneficiaryAddr}>GSTIN: {order.sellerGstin || "—"}</Text>
                                    <Text style={invStyles.beneficiaryAddr}>Contact: {order.sellerPhone || "—"}</Text>
                                    <View style={invStyles.settledBadge}>
                                        <Feather name="check" size={11} color="#1a7a45" />
                                        <Text style={invStyles.settledBadgeText}>{order.paymentStatus === "Paid" ? "PAYMENT SETTLED" : "PAYMENT PENDING"}</Text>
                                    </View>
                                </View>
                                <View style={invStyles.infoCard}>
                                    <Text style={invStyles.infoCardTitle}>PAYOUT DETAILS</Text>
                                    <InvoiceDetailRow label="Holder" value={order.bankAccountHolder || order.sellerName} />
                                    <InvoiceDetailRow label="Bank" value={order.bankName || "—"} />
                                    <InvoiceDetailRow label="A/C No" value={order.bankAccountNumber || "—"} />
                                    <InvoiceDetailRow label="IFSC" value={order.bankIfsc || "—"} />
                                </View>
                            </View>

                            <View style={invStyles.table}>
                                <View style={invStyles.tableHeaderRow}>
                                    <Text style={[invStyles.th, { flex: 3 }]}>Item Description</Text>
                                    <Text style={[invStyles.th, invStyles.tCenter]}>HSN</Text>
                                    <Text style={[invStyles.th, invStyles.tCenter]}>SKU</Text>
                                    <Text style={[invStyles.th, invStyles.tCenter]}>Qty</Text>
                                    <Text style={[invStyles.th, invStyles.tRight]}>Base Price</Text>
                                    <Text style={[invStyles.th, invStyles.tRight]}>Total Amount</Text>
                                </View>
                                {lineItems.map((item, idx) => (
                                    <View key={idx} style={[invStyles.tableRow, idx > 0 && { borderTopWidth: 1, borderTopColor: BORDER }]}>
                                        <Text style={[invStyles.td, { flex: 3, fontWeight: "700", color: TEXT_HEAD }]}>{item.productName || "Product"}</Text>
                                        <Text style={[invStyles.td, invStyles.tCenter]}>{item.hsn || "-"}</Text>
                                        <Text style={[invStyles.td, invStyles.tCenter]}>{item.sku || "-"}</Text>
                                        <Text style={[invStyles.td, invStyles.tCenter]}>{item.qty ?? 1}</Text>
                                        <Text style={[invStyles.td, invStyles.tRight]}>{fmtInv(item.basePrice)}</Text>
                                        <Text style={[invStyles.td, invStyles.tRight, { fontWeight: "800", color: TEXT_HEAD }]}>{fmtInv(item.total)}</Text>
                                    </View>
                                ))}
                            </View>

                            <View style={[invStyles.twoColRow, !isWeb && { flexDirection: "column", alignItems: "stretch" }]}>
                                <View style={invStyles.wordsBlock}>
                                    <Text style={invStyles.wordsLabel}>Amount Payable (in words):</Text>
                                    <Text style={invStyles.wordsValue}>{amountInWords(sellerEarning)}</Text>
                                    <View style={{ marginTop: 18 }}>
                                        <Text style={invStyles.termsTitle}>Terms & Conditions</Text>
                                        <Text style={invStyles.termsItem}>1. This is a system generated settlement advice.</Text>
                                        <Text style={invStyles.termsItem}>2. Deductions include GST, Shipping & Commission fees.</Text>
                                        <Text style={invStyles.termsItem}>3. For discrepancies, contact support immediately.</Text>
                                        <Text style={invStyles.termsItem}>4. Payment has been processed and credited to seller wallet.</Text>
                                    </View>
                                </View>
                                <View style={invStyles.settlementBlock}>
                                    <InvoiceSettlementRow label="Total Order Value" value={fmtInv(customerPaidNum)} />
                                    <InvoiceSettlementRow label="Less GST" value={`- ${fmtInv(gstAmount)}`} negative />
                                    <InvoiceSettlementRow label="Less Shipping" value={`- ${fmtInv(deliveryCharge)}`} negative />
                                    <InvoiceSettlementRow label={`Less Commission (${commissionRate.toFixed(1)}%)`} value={`- ${fmtInv(commissionAmount)}`} negative />
                                    <View style={invStyles.settlementDivider} />
                                    <View style={invStyles.netRow}>
                                        <Text style={invStyles.netLabel}>NET SETTLEMENT:</Text>
                                        <Text style={invStyles.netValue}>{fmtInv(sellerEarning)}</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={invStyles.footerDivider} />
                            <View style={invStyles.footer}>
                                <Text style={invStyles.footerMuted}>This is an automatically generated invoice and does not require a signature or stamp.</Text>
                                <Text style={invStyles.footerBold}>This invoice has been electronically generated by our system and is valid for all accounting and record-keeping purposes.</Text>
                                <Text style={[invStyles.footerMuted, { marginTop: 10 }]}>For any queries or assistance regarding this payment, please contact:</Text>
                                <Text style={invStyles.footerContact}>Email: {COMPANY.supportEmail}  |  Phone: {COMPANY.supportPhone}</Text>
                                <Text style={[invStyles.footerMuted, { marginTop: 10 }]}>© {COMPANY.year} {COMPANY.legalName}. All Rights Reserved.</Text>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
interface SellerPaymentDetailScreenProps {
    order: SellerOrder;
    onBack: () => void;
}

const SellerPaymentDetailScreen: React.FC<Partial<SellerPaymentDetailScreenProps>> = ({ order: propOrder, onBack: propOnBack }) => {
    const isWeb = Platform.OS === "web";
    const [regenLoading, setRegenLoading] = useState(false);
    const [invoiceLoading, setInvoiceLoading] = useState(false);
    const [invoiceVisible, setInvoiceVisible] = useState(false);
    const [invoiceNo, setInvoiceNo] = useState<string | null>(null);
    const [invoiceGeneratedAt, setInvoiceGeneratedAt] = useState<string>("");
    const [payLoading, setPayLoading] = useState(false);
    const [payModalVisible, setPayModalVisible] = useState(false);
    const [transactionRef, setTransactionRef] = useState("");
    const [adminNote, setAdminNote] = useState("");

    const params = useLocalSearchParams();
    const router = useRouter();

    const legacyOrder = params.orderData ? JSON.parse(params.orderData as string) : null;
    const payoutId = params.id ? Number(params.id) : legacyOrder?.id ?? null;

    const [order, setOrder] = useState<SellerOrder | null>(propOrder ?? legacyOrder ?? null);
    const [loading, setLoading] = useState(!propOrder && !legacyOrder && !!payoutId);
    const [error, setError] = useState<string | null>(null);

    const loadDetail = useCallback(async (id: number) => {
        setLoading(true);
        setError(null);
        try {
            const detail = await fetchPayoutDetail(id);
            setOrder(mapPayoutDetailToSpdOrder(detail) as SellerOrder);
        } catch (e) {
            setError(getApiErrorMessage(e));
        } finally {
            setLoading(false);
        }
    }, []);

    const formatTimestamp = (iso?: string) => {
        if (!iso) return buildTimestamp();
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return iso;
        return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    };

    const buildTimestamp = () => {
        const now = new Date();
        return `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}, ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    };

    const buildInvoiceNo = (id: number) => {
        const year = new Date().getFullYear();
        const seed = String(id).padStart(6, "0").slice(-6);
        return `SP-${year}-${seed}`;
    };

    const openInvoice = useCallback(async (target: SellerOrder) => {
        setInvoiceLoading(true);
        try {
            const inv = await generatePayoutInvoice(target.id);
            const mapped = mapPayoutDetailToSpdOrder(inv);
            setOrder((prev) => ({ ...(prev ?? target), ...mapped } as SellerOrder));
            setInvoiceNo(mapped.invoiceNumber || buildInvoiceNo(target.id));
            setInvoiceGeneratedAt(formatTimestamp(String(inv.invoiceDate ?? "")));
            setInvoiceVisible(true);
        } catch (e) {
            const msg = getApiErrorMessage(e);
            if (Platform.OS === "web") window.alert(msg);
            else Alert.alert("Error", msg);
        } finally {
            setInvoiceLoading(false);
        }
    }, []);

    useEffect(() => {
        if (propOrder || legacyOrder || !payoutId) return;
        void loadDetail(payoutId);
    }, [propOrder, legacyOrder, payoutId, loadDetail]);

    useEffect(() => {
        if (params.invoiceMode === "true" && order && !invoiceNo) {
            void openInvoice(order);
        }
    }, [params.invoiceMode, order, invoiceNo, openInvoice]);

    const onBack = propOnBack || (() => {
        if (router.canGoBack()) router.back();
        else router.replace("/Sellerpayments");
    });

    const handleInvoice = () => {
        if (order) void openInvoice(order);
    };

    const handleRegen = async () => {
        if (!order) return;
        setRegenLoading(true);
        await openInvoice(order);
        setRegenLoading(false);
    };

    const handleConfirmPay = async () => {
        if (!order) return;
        setPayLoading(true);
        try {
            await markPayoutPaid(order.id, transactionRef.trim() || undefined, adminNote.trim() || undefined, "paid");
            setPayModalVisible(false);
            await loadDetail(order.id);
            const msg = "Payment marked as Paid!";
            if (Platform.OS === "web") window.alert(msg);
            else Alert.alert("Success", msg);
        } catch (e) {
            const msg = getApiErrorMessage(e);
            if (Platform.OS === "web") window.alert(msg);
            else Alert.alert("Error", msg);
        } finally {
            setPayLoading(false);
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <View style={[styles.root, isWeb && styles.rootWeb, { alignItems: "center", justifyContent: "center", padding: 40 }]}>
                    <ActivityIndicator size="large" color={PRIMARY} />
                    <Text style={{ marginTop: 12, color: TEXT_MUTED }}>Loading payment details…</Text>
                </View>
            </AdminLayout>
        );
    }

    if (error || !order) {
        return (
            <AdminLayout>
                <View style={[styles.root, isWeb && styles.rootWeb, { alignItems: "center", justifyContent: "center", padding: 40 }]}>
                    <Text style={{ color: "#b91c1c", marginBottom: 12 }}>{error ?? "Order not found"}</Text>
                    <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                        <Feather name="arrow-left" size={18} color="#fff" />
                    </TouchableOpacity>
                </View>
            </AdminLayout>
        );
    }

    const remStyle = getReminderColor(order.reminderBucket);
    const payStyle = getPaymentColor(order.paymentStatus);
    const initials = getInitials(order.sellerName);

    const parseAmount = (str: string) => parseFloat(str.replace(/[^0-9.]/g, "")) || 0;
    const customerPaidNum = order.customerPaidNum ?? parseAmount(order.customerPaid);
    const gstAmount = order.gstAmountNum ?? 0;
    const deliveryCharge = order.deliveryChargeNum ?? 0;
    const commissionAmount = order.commissionAmountNum ?? 0;
    const commissionRate = order.commissionRateNum ?? 15;
    const sellerEarning = order.finalPayableNum ?? +(customerPaidNum - gstAmount - deliveryCharge - commissionAmount).toFixed(2);

    const handlePrint = () => {
        if (Platform.OS === "web") {
            if (!invoiceVisible) setInvoiceVisible(true);
            const styleId = "invoice-print-style";
            let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;
            if (!styleTag) {
                styleTag = document.createElement("style");
                styleTag.id = styleId;
                document.head.appendChild(styleTag);
            }
            styleTag.innerHTML = `
                @media print {
                    body * { visibility: hidden !important; }
                    #invoice-print-area, #invoice-print-area * { visibility: visible !important; }
                    #invoice-print-area { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; margin: 0 !important; }
                }
            `;
            setTimeout(() => window.print(), 50);
        } else {
            Alert.alert("Print", "Sending invoice to printer…");
        }
    };

    // ── Shared card content blocks ───────────────────────────────────────────

    const OrderSummaryCard = (
        <View style={styles.card}>
            <SectionHeader icon="shopping-bag" title="Order Summary" />
            <View style={styles.amountStrip}>
                <View>
                    <Text style={styles.amountLabel}>Customer Paid</Text>
                    <Text style={styles.amountValue}>{order.customerPaid}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.amountLabel}>Seller Earning</Text>
                    <Text style={[styles.amountValue, { color: "#1a7a45" }]}>{fmtAmt(sellerEarning)}</Text>
                </View>
            </View>
            <InfoRow label="Order ID" value={order.orderId} valueColor={PRIMARY} bold />
            <InfoRow label="Order Date" value={order.orderDate} />
            <InfoRow label="Order Status" value={order.orderStatus} valueColor={order.orderStatus === "Completed" ? "#1a7a45" : PRIMARY} />
            <InfoRow label="Delivery Date" value={order.deliveryDate} />
            <InfoRow label="Delivery Time" value={order.deliveryTime} />
            <View style={{ marginTop: 10 }}>
                <View style={[styles.reminderBadge, { backgroundColor: remStyle.bg }]}>
                    <Feather name="clock" size={12} color={remStyle.dot} />
                    <Text style={[styles.reminderText, { color: remStyle.color }]}>Reminder: {order.reminderLabel}</Text>
                </View>
            </View>
        </View>
    );

    const SellerCard = (
        <View style={styles.card}>
            <SectionHeader icon="user" title="Seller Details" accent={DARK} />
            <View style={styles.avatarRow}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.avatarName}>{order.sellerName}</Text>
                    <Text style={styles.avatarSub}>{order.sellerEmail}</Text>
                    <Text style={styles.avatarSub}>{order.sellerPhone}</Text>
                </View>
            </View>
            <InfoRow label="Wallet Balance" value={order.walletBalance} valueColor="#1d4ed8" bold />
        </View>
    );

    const CostBreakdownCard = (
        <View style={styles.card}>
            <SectionHeader icon="bar-chart-2" title="Cost Breakdown" accent="#7c3aed" />
            <CostRow label="Customer Paid (Total)" value={fmtAmt(customerPaidNum)} />
            <CostRow label="Less: GST" value={`− ${fmtAmt(gstAmount)}`} dimmed />
            <CostRow label="Less: Delivery Charge" value={`− ${fmtAmt(deliveryCharge)}`} dimmed />
            <CostRow label={`Less: Commission (${commissionRate.toFixed(1)}%)`} value={`− ${fmtAmt(commissionAmount)}`} dimmed />
            <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Amount to Pay Seller</Text>
                <Text style={styles.totalValue}>{fmtAmt(sellerEarning)}</Text>
            </View>
        </View>
    );

    const PaymentInfoCard = (
        <View style={styles.card}>
            <SectionHeader icon="credit-card" title="Payment Info" accent="#0891b2" />
            <InfoRow label="Payment Status" value={order.paymentStatus} valueColor={payStyle.color} bold />
            <InfoRow label="Wallet Balance" value={order.walletBalance} />
            <InfoRow label="Reminder Days" value={`${order.reminderDays} day(s)`} valueColor={remStyle.color} />
            {order.transactionRef ? <InfoRow label="Transaction Ref" value={order.transactionRef} valueColor={GREEN} /> : null}
            {order.adminNote ? <InfoRow label="Admin Note" value={order.adminNote} /> : null}
        </View>
    );

    const ActionsCard = (
        <View style={styles.card}>
            <SectionHeader icon="zap" title="Actions" accent="#d97706" />
            <View style={styles.actionsGrid}>
                <ActionButton icon="file-text" label={invoiceLoading ? "Generating…" : "Generate Invoice"} color="#f59e0b" onPress={() => void handleInvoice()} flex={isWeb} width={!isWeb ? "48%" : undefined} />
                <ActionButton icon="refresh-cw" label={regenLoading ? "Regenerating…" : "Regenerate Invoice"} color="#64748b" onPress={() => void handleRegen()} flex={isWeb} width={!isWeb ? "48%" : undefined} />
                <ActionButton icon="printer" label="Print Invoice" color="#3b82f6" onPress={handlePrint} flex={isWeb} width={!isWeb ? "48%" : undefined} />
                {order.paymentStatus === "Pending" && (
                    <ActionButton icon="dollar-sign" label="Mark as Paid" color="#10b981" onPress={() => {
                        setTransactionRef(order.transactionRef ?? "");
                        setAdminNote(order.adminNote ?? "");
                        setPayModalVisible(true);
                    }} flex={isWeb} width={!isWeb ? "48%" : undefined} />
                )}
            </View>
        </View>
    );

    return (
        <AdminLayout>
            <View style={[styles.root, isWeb && styles.rootWeb]}>
                <StatusBar barStyle="light-content" backgroundColor="#151D4F" />

                <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, !isWeb && { paddingBottom: 60 }]} showsVerticalScrollIndicator={false}>

                    {/* Header */}
                    <View style={[styles.header, isWeb && styles.headerWeb]}>
                        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
                            <Feather name="arrow-left" size={18} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.headerMid}>
                            <Text style={styles.headerTitle}>Order Details</Text>
                            <Text style={styles.headerSub}>
                                Dashboard › Seller Payments › <Text style={{ color: PRIMARY }}>{order.orderId}</Text>
                            </Text>
                        </View>
                        <View style={styles.headerRight}>
                            <View style={[styles.statusPill, { backgroundColor: payStyle.bg }]}>
                                <View style={[styles.statusDot, { backgroundColor: payStyle.color }]} />
                                <Text style={[styles.statusPillText, { color: payStyle.color }]}>{order.paymentStatus}</Text>
                            </View>
                        </View>
                    </View>

                    {isWeb ? (
                        // ── WEB: 2-column grid ──────────────────────────────
                        <View style={styles.grid}>
                            {/* LEFT */}
                            <View style={styles.col}>
                                {OrderSummaryCard}
                                {SellerCard}
                                <CustomerShippingCard order={order} />
                            </View>
                            {/* RIGHT */}
                            <View style={styles.col}>
                                {CostBreakdownCard}
                                {/* ── PRICE BREAKDOWN (new) ── */}
                                <PriceBreakdownCard order={order} />
                                {PaymentInfoCard}
                                {ActionsCard}
                            </View>
                        </View>
                    ) : (
                        // ── MOBILE: single column ───────────────────────────
                        <View style={{ gap: 14 }}>
                            {OrderSummaryCard}
                            {SellerCard}
                            <CustomerShippingCard order={order} />
                            {CostBreakdownCard}
                            {/* ── PRICE BREAKDOWN (new) ── */}
                            <PriceBreakdownCard order={order} />
                            {PaymentInfoCard}
                            {ActionsCard}
                        </View>
                    )}
                </ScrollView>

                {invoiceNo && (
                    <InvoiceModalView
                        visible={invoiceVisible}
                        onClose={() => setInvoiceVisible(false)}
                        order={order}
                        invoiceNo={invoiceNo}
                        generatedAt={invoiceGeneratedAt}
                        orderRef={order.orderRef || order.orderId}
                        customerPaidNum={customerPaidNum}
                        gstAmount={gstAmount}
                        deliveryCharge={deliveryCharge}
                        commissionAmount={commissionAmount}
                        commissionRate={commissionRate}
                        sellerEarning={sellerEarning}
                        onPrint={handlePrint}
                        onRegenerate={handleRegen}
                        regenLoading={regenLoading}
                    />
                )}

                <Modal visible={payModalVisible} transparent animationType="fade" onRequestClose={() => setPayModalVisible(false)}>
                    <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 20 }}>
                        <View style={{ backgroundColor: BG_CARD, borderRadius: 16, width: "100%", maxWidth: 440, padding: 20 }}>
                            <Text style={{ fontSize: 16, fontWeight: "800", color: TEXT_HEAD, marginBottom: 4 }}>Mark as Paid</Text>
                            <Text style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 16 }}>Order {order.orderId} · {fmtAmt(sellerEarning)}</Text>
                            <Text style={{ fontSize: 12, fontWeight: "700", color: TEXT_MUTED, marginBottom: 6 }}>Transaction ID / UTR</Text>
                            <TextInput
                                style={{ borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 13 }}
                                placeholder="Enter transfer reference"
                                value={transactionRef}
                                onChangeText={setTransactionRef}
                            />
                            <Text style={{ fontSize: 12, fontWeight: "700", color: TEXT_MUTED, marginBottom: 6 }}>Admin Note</Text>
                            <TextInput
                                style={{ borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13, minHeight: 72, textAlignVertical: "top" }}
                                placeholder="Add admin note"
                                multiline
                                value={adminNote}
                                onChangeText={setAdminNote}
                            />
                            <View style={{ flexDirection: "row", gap: 10 }}>
                                <TouchableOpacity style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: BORDER, alignItems: "center" }} onPress={() => setPayModalVisible(false)}>
                                    <Text style={{ fontWeight: "700", color: TEXT_MUTED }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: GREEN, alignItems: "center", opacity: payLoading ? 0.7 : 1 }}
                                    onPress={() => void handleConfirmPay()}
                                    disabled={payLoading}
                                >
                                    {payLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ fontWeight: "700", color: "#fff" }}>Confirm Pay</Text>}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </AdminLayout>
    );
};

export default SellerPaymentDetailScreen;

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: BG_PAGE },
    rootWeb: { backgroundColor: BG_PAGE },

    header: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#151D4F", paddingHorizontal: 18, paddingVertical: 16, borderRadius: 16, shadowColor: DARK, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
    headerWeb: { marginHorizontal: 2, marginTop: 12, borderRadius: 22, paddingHorizontal: 28, paddingVertical: 20 },
    backBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.1)" },
    headerMid: { flex: 1 },
    headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
    headerSub: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 },
    headerRight: { alignItems: "flex-end" },
    statusPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    statusDot: { width: 7, height: 7, borderRadius: 99 },
    statusPillText: { fontSize: 12, fontWeight: "700" },

    scroll: { flex: 1 },
    scrollContent: { padding: 16, gap: 16 },

    grid: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
    col: { flex: 1, gap: 16 },

    card: { backgroundColor: BG_CARD, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: BORDER, shadowColor: DARK, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },

    amountStrip: { flexDirection: "row", justifyContent: "space-between", backgroundColor: BG_PAGE, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 16, borderWidth: 1, borderColor: BORDER },
    amountLabel: { fontSize: 11, color: TEXT_MUTED, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 4 },
    amountValue: { fontSize: 22, fontWeight: "800", color: DARK },

    reminderBadge: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, alignSelf: "flex-start" },
    reminderText: { fontSize: 12, fontWeight: "700" },

    avatarRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 },
    avatar: { width: 52, height: 52, borderRadius: 14, backgroundColor: DARK, alignItems: "center", justifyContent: "center" },
    avatarText: { color: "#fff", fontSize: 17, fontWeight: "800" },
    avatarName: { fontSize: 15, fontWeight: "800", color: TEXT_HEAD, marginBottom: 3 },
    avatarSub: { fontSize: 12, color: TEXT_MUTED, marginBottom: 1 },

    cityTypePill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: "flex-start" },
    cityTypeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.2 },

    addressBlock: { marginTop: 4, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#f3ece6" },
    addressBlockHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
    addressBlockLabel: { fontSize: 11, color: TEXT_MUTED, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
    addressFreeText: { fontSize: 13, color: TEXT_BODY, fontWeight: "600", lineHeight: 19, marginBottom: 12 },
    addressChipsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },

    totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 14, marginTop: 4 },
    totalLabel: { fontSize: 14, fontWeight: "800", color: TEXT_HEAD },
    totalValue: { fontSize: 20, fontWeight: "800", color: PRIMARY },

    actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
});

// ─── INVOICE STYLES ───────────────────────────────────────────────────────────
const invStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(20,12,6,0.55)", alignItems: "center", justifyContent: "center", padding: 16 },
    sheet: { width: "100%", height: "100%", backgroundColor: BG_PAGE, borderRadius: 0, overflow: "hidden" },
    sheetWeb: { maxWidth: 720, height: "92%", borderRadius: 18, shadowColor: "#000", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 30 },
    topBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: BG_CARD, borderBottomWidth: 1, borderBottomColor: BORDER },
    topBarTimestamp: { fontSize: 11, color: TEXT_MUTED, fontWeight: "600", width: 110 },
    topBarTitle: { flex: 1, fontSize: 12, fontWeight: "700", color: TEXT_HEAD, textAlign: "center" },
    topBarActions: { flexDirection: "row", alignItems: "center", gap: 8 },
    iconBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: BORDER, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: BG_PAGE },
    iconBtnText: { fontSize: 11, fontWeight: "700", color: TEXT_BODY },
    closeBtn: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: BG_PAGE, borderWidth: 1, borderColor: BORDER },
    scroll: { flex: 1 },
    scrollContent: { padding: 18, paddingBottom: 40 },
    page: { backgroundColor: BG_CARD, borderRadius: 14, padding: 22, borderWidth: 1, borderColor: BORDER },
    brandRow: { flexDirection: "row", justifyContent: "space-between", gap: 16 },
    brandLeft: { flex: 1.4 },
    brandRight: { flex: 1, alignItems: "flex-end" },
    logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    logoMark: { width: 28, height: 28, borderRadius: 7, backgroundColor: PRIMARY_LIGHT, borderWidth: 1, borderColor: PRIMARY, alignItems: "center", justifyContent: "center" },
    logoMarkText: { fontSize: 11, fontWeight: "800", color: PRIMARY },
    logoText: { fontSize: 17, fontWeight: "800", letterSpacing: 0.2 },
    tagline: { fontSize: 10, color: TEXT_MUTED, fontStyle: "italic", marginTop: 2, marginLeft: 36 },
    companyLine: { fontSize: 11, color: TEXT_BODY, fontWeight: "600" },
    sellerPaymentTitle: { fontSize: 16, fontWeight: "800", color: PRIMARY, letterSpacing: 0.4 },
    metaLine: { fontSize: 11 },
    metaLabel: { color: TEXT_MUTED, fontWeight: "600" },
    metaValue: { color: TEXT_HEAD, fontWeight: "800" },
    divider: { height: 2, backgroundColor: PRIMARY, marginVertical: 16, opacity: 0.85 },
    twoColRow: { flexDirection: "row", gap: 14, marginBottom: 18, alignItems: "flex-start" },
    infoCard: { flex: 1, backgroundColor: BG_PAGE, borderRadius: 10, borderWidth: 1, borderColor: BORDER, padding: 14 },
    infoCardTitle: { fontSize: 10.5, fontWeight: "800", color: PRIMARY, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
    beneficiaryName: { fontSize: 13, fontWeight: "800", color: TEXT_HEAD, marginBottom: 4 },
    beneficiaryAddr: { fontSize: 11, color: TEXT_BODY, fontWeight: "600", marginBottom: 3, lineHeight: 15 },
    settledBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: GREEN_BG, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5, alignSelf: "flex-start", marginTop: 8 },
    settledBadgeText: { fontSize: 10, fontWeight: "800", color: GREEN, letterSpacing: 0.3 },
    table: { borderWidth: 1, borderColor: BORDER, borderRadius: 10, overflow: "hidden", marginBottom: 18 },
    tableHeaderRow: { flexDirection: "row", backgroundColor: BG_PAGE, paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: BORDER },
    tableRow: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 11 },
    th: { flex: 1, fontSize: 10, fontWeight: "800", color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: 0.3 },
    td: { flex: 1, fontSize: 12, color: TEXT_BODY, fontWeight: "600" },
    tCenter: { textAlign: "center" },
    tRight: { textAlign: "right" },
    wordsBlock: { flex: 1.2 },
    wordsLabel: { fontSize: 11, color: TEXT_MUTED, fontWeight: "700", marginBottom: 4 },
    wordsValue: { fontSize: 13, color: "#1d4ed8", fontWeight: "800", lineHeight: 18 },
    termsTitle: { fontSize: 11, fontWeight: "800", color: TEXT_HEAD, marginBottom: 6 },
    termsItem: { fontSize: 10.5, color: TEXT_MUTED, fontWeight: "500", marginBottom: 3, lineHeight: 14 },
    settlementBlock: { flex: 1, backgroundColor: BG_PAGE, borderRadius: 10, borderWidth: 1, borderColor: BORDER, padding: 14 },
    settlementDivider: { height: 1, backgroundColor: BORDER, marginVertical: 6 },
    netRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 4 },
    netLabel: { fontSize: 12, fontWeight: "800", color: PRIMARY },
    netValue: { fontSize: 16, fontWeight: "800", color: PRIMARY },
    footerDivider: { height: 1, backgroundColor: BORDER, marginBottom: 14 },
    footer: { alignItems: "center" },
    footerMuted: { fontSize: 10, color: TEXT_MUTED, textAlign: "center", lineHeight: 14 },
    footerBold: { fontSize: 10.5, color: TEXT_BODY, fontWeight: "700", textAlign: "center", lineHeight: 14, marginTop: 4 },
    footerContact: { fontSize: 10.5, color: TEXT_HEAD, fontWeight: "700", textAlign: "center", marginTop: 4 },
});