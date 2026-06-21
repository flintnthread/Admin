import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import AdminLayout from "@/components/admin-layout";
import { useLocalSearchParams, useRouter } from "expo-router";

// ─── THEME (matches SellerPaymentsScreen) ─────────────────────────────────────
const PRIMARY = "#ef7b1a";
const DARK = "#79411c";
const PRIMARY_LIGHT = "#fef3e9";
const BG_PAGE = "#faf7f5";
const BG_CARD = "#FFFFFF";
const TEXT_HEAD = "#1a0f08";
const TEXT_BODY = "#504f56";
const TEXT_MUTED = "#9b8b7e";
const BORDER = "#ede5de";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type PaymentStatus = "Pending" | "Paid";
type ReminderBucket = "green" | "orange" | "red";
type CityType = "Intra-City" | "Metro-Metro";

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
    // ── Customer & shipping (new) ──────────────────────────────────────────
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    shippingAddressLine1: string;
    shippingAddressLine2: string;
    shippingCity: string;
    shippingState: string;
    shippingPincode: string;
    cityType: CityType;
    // ── Invoice-related fields (optional — fall back gracefully) ──────────
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
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const getReminderColor = (bucket: ReminderBucket) => {
    if (bucket === "green") return { bg: "#e8f7ee", color: "#1a7a45", dot: "#22c55e" };
    if (bucket === "orange") return { bg: PRIMARY_LIGHT, color: PRIMARY, dot: PRIMARY };
    return { bg: "#fce8e8", color: "#b91c1c", dot: "#ef4444" };
};

const getPaymentColor = (status: PaymentStatus) =>
    status === "Paid"
        ? { bg: "#e8f7ee", color: "#1a7a45" }
        : { bg: PRIMARY_LIGHT, color: PRIMARY };

const getInitials = (name?: string) =>
    (name || "N A").split(" ").map(w => w?.[0] || "").join("").toUpperCase().slice(0, 2);

// ─── INVOICE: NUMBER TO WORDS (Indian numbering) ─────────────────────────────
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

// ─── INVOICE: COMPANY CONSTANTS (replace with real tenant data when available) ─
const COMPANY = {
    name1: "FLINT",
    name2: "& THREAD",
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
const SectionHeader: React.FC<{ icon: string; title: string; accent?: string }> = ({
    icon, title, accent = PRIMARY,
}) => (
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
const InfoRow: React.FC<{ label: string; value: string; valueColor?: string; bold?: boolean }> = ({
    label, value, valueColor = TEXT_HEAD, bold = false,
}) => (
    <View style={infoStyles.row}>
        <Text style={infoStyles.label}>{label}</Text>
        <Text style={[infoStyles.value, { color: valueColor, fontWeight: bold ? "800" : "600" }]}>
            {value}
        </Text>
    </View>
);

const infoStyles = StyleSheet.create({
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "#f3ece6" },
    label: { fontSize: 12, color: TEXT_MUTED, fontWeight: "600", flex: 1 },
    value: { fontSize: 13, flex: 1, textAlign: "right" },
});

// ─── ADDRESS CHIP (new — used by Customer & Shipping card) ───────────────────
const AddressChip: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <View style={addressChipStyles.chip}>
        <Text style={addressChipStyles.label}>{label}</Text>
        <Text style={addressChipStyles.value} numberOfLines={1}>{value}</Text>
    </View>
);

const addressChipStyles = StyleSheet.create({
    chip: {
        flex: 1,
        minWidth: 100,
        backgroundColor: BG_PAGE,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: BORDER,
        paddingHorizontal: 12,
        paddingVertical: 9,
    },
    label: { fontSize: 10, color: TEXT_MUTED, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 3 },
    value: { fontSize: 13, color: TEXT_HEAD, fontWeight: "700" },
});

// ─── ACTION BUTTON ────────────────────────────────────────────────────────────
const ActionButton: React.FC<{
    icon: string; label: string; color: string; onPress: () => void; flex?: boolean;
}> = ({ icon, label, color, onPress, flex }) => (
    <TouchableOpacity
        style={[actionStyles.btn, { backgroundColor: color, flex: flex ? 1 : undefined }]}
        onPress={onPress}
        activeOpacity={0.8}
    >
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

// ─── COST BREAKDOWN ROW ───────────────────────────────────────────────────────
const CostRow: React.FC<{ label: string; value: string; highlight?: boolean; dimmed?: boolean }> = ({
    label, value, highlight, dimmed,
}) => (
    <View style={costStyles.row}>
        <Text style={[costStyles.label, dimmed && { color: TEXT_MUTED }]}>{label}</Text>
        <Text style={[costStyles.value, highlight && { color: PRIMARY, fontSize: 17, fontWeight: "800" }, dimmed && { color: TEXT_MUTED }]}>
            {value}
        </Text>
    </View>
);

const costStyles = StyleSheet.create({
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3ece6" },
    label: { fontSize: 13, color: TEXT_BODY, fontWeight: "600" },
    value: { fontSize: 14, color: TEXT_HEAD, fontWeight: "700" },
});

// ─── PROPS ────────────────────────────────────────────────────────────────────
interface SellerPaymentDetailScreenProps {
    /** The order object passed from the payments list screen */
    order: SellerOrder;
    /** Navigate back to list */
    onBack: () => void;
}

// ─── CUSTOMER & SHIPPING CARD (new — shared between web/mobile) ──────────────
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

// ─── INVOICE: SMALL PIECES ────────────────────────────────────────────────────
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

const InvoiceSettlementRow: React.FC<{ label: string; value: string; negative?: boolean; bold?: boolean }> = ({
    label, value, negative, bold,
}) => (
    <View style={invSr.row}>
        <Text style={[invSr.label, bold && { fontWeight: "800", color: TEXT_HEAD }]}>{label}</Text>
        <Text style={[invSr.value, negative && { color: "#b91c1c" }, bold && { fontWeight: "800" }]}>
            {value}
        </Text>
    </View>
);
const invSr = StyleSheet.create({
    row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
    label: { fontSize: 12, color: TEXT_BODY, fontWeight: "600" },
    value: { fontSize: 12, color: TEXT_HEAD, fontWeight: "700" },
});

// ─── INVOICE MODAL (inline — full-screen invoice view) ───────────────────────
interface InvoiceModalProps {
    visible: boolean;
    onClose: () => void;
    order: SellerOrder;
    invoiceNo: string;
    generatedAt: string;
    orderRef: string;
    customerPaidNum: number;
    platformFee: number;
    deliveryCharge: number;
    tax: number;
    sellerEarning: number;
    onPrint: () => void;
    onRegenerate: () => void;
    regenLoading?: boolean;
}

const InvoiceModalView: React.FC<InvoiceModalProps> = ({
    visible, onClose, order, invoiceNo, generatedAt, orderRef,
    customerPaidNum, platformFee, deliveryCharge, tax, sellerEarning,
    onPrint, onRegenerate, regenLoading,
}) => {
    const isWeb = Platform.OS === "web";
    const fmtInv = (n: number) =>
        `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const itemTotal = order.totalAmount ?? customerPaidNum;

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={invStyles.overlay}>
                <View style={[invStyles.sheet, isWeb && invStyles.sheetWeb]}>

                    {/* ── Top bar: timestamp / title / actions ───────────────── */}
                    <View style={invStyles.topBar}>
                        <Text style={invStyles.topBarTimestamp}>{generatedAt}</Text>
                        <Text style={invStyles.topBarTitle} numberOfLines={1}>
                            Seller Payment Invoice - {invoiceNo}
                        </Text>
                        <View style={invStyles.topBarActions}>
                            <TouchableOpacity style={invStyles.iconBtn} onPress={onPrint} activeOpacity={0.75}>
                                <Feather name="printer" size={13} color={TEXT_BODY} />
                                <Text style={invStyles.iconBtnText}>Print</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={invStyles.iconBtn}
                                onPress={onRegenerate}
                                activeOpacity={0.75}
                                disabled={regenLoading}
                            >
                                <Feather name="rotate-ccw" size={13} color={TEXT_BODY} />
                                <Text style={invStyles.iconBtnText}>{regenLoading ? "Regenerating…" : "Regenerate"}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={invStyles.closeBtn} onPress={onClose} activeOpacity={0.75}>
                                <Feather name="x" size={16} color={TEXT_BODY} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView
                        style={invStyles.scroll}
                        contentContainerStyle={invStyles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={invStyles.page} nativeID="invoice-print-area">

                            {/* ── Brand header / invoice meta ─────────────────── */}
                            <View style={invStyles.brandRow}>
                                <View style={invStyles.brandLeft}>
                                    <View style={invStyles.logoRow}>
                                        <View style={invStyles.logoMark}>
                                            <Text style={invStyles.logoMarkText}>FT</Text>
                                        </View>
                                        <Text style={invStyles.logoText}>
                                            <Text style={{ color: TEXT_HEAD }}>{COMPANY.name1} </Text>
                                            <Text style={{ color: PRIMARY }}>{COMPANY.name2}</Text>
                                        </Text>
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
                                        <Text style={invStyles.metaLine}>
                                            <Text style={invStyles.metaLabel}>Invoice No: </Text>
                                            <Text style={invStyles.metaValue}>{invoiceNo}</Text>
                                        </Text>
                                        <Text style={invStyles.metaLine}>
                                            <Text style={invStyles.metaLabel}>Date: </Text>
                                            <Text style={invStyles.metaValue}>{generatedAt.split(",")[0]}</Text>
                                        </Text>
                                        <Text style={invStyles.metaLine}>
                                            <Text style={invStyles.metaLabel}>Order Ref: </Text>
                                            <Text style={invStyles.metaValue}>{orderRef}</Text>
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <View style={invStyles.divider} />

                            {/* ── Beneficiary / Payout cards ──────────────────── */}
                            <View style={invStyles.twoColRow}>
                                <View style={invStyles.infoCard}>
                                    <Text style={invStyles.infoCardTitle}>BENEFICIARY DETAILS</Text>
                                    <Text style={invStyles.beneficiaryName}>{order.sellerName}</Text>
                                    <Text style={invStyles.beneficiaryAddr}>
                                        {[order.sellerAddressLine1, order.sellerAddressLine2, order.sellerCity, order.sellerState, order.sellerPincode]
                                            .filter(Boolean)
                                            .join(", ") || "Address not provided"}
                                    </Text>
                                    <Text style={invStyles.beneficiaryAddr}>GSTIN: {order.sellerGstin || "—"}</Text>
                                    <Text style={invStyles.beneficiaryAddr}>Contact: {order.sellerPhone || "—"}</Text>

                                    <View style={invStyles.settledBadge}>
                                        <Feather name="check" size={11} color="#1a7a45" />
                                        <Text style={invStyles.settledBadgeText}>
                                            {order.paymentStatus === "Paid" ? "PAYMENT SETTLED" : "PAYMENT PENDING"}
                                        </Text>
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

                            {/* ── Item table ───────────────────────────────────── */}
                            <View style={invStyles.table}>
                                <View style={invStyles.tableHeaderRow}>
                                    <Text style={[invStyles.th, { flex: 3 }]}>Item Description</Text>
                                    <Text style={[invStyles.th, invStyles.tCenter]}>HSN</Text>
                                    <Text style={[invStyles.th, invStyles.tCenter]}>SKU</Text>
                                    <Text style={[invStyles.th, invStyles.tCenter]}>Qty</Text>
                                    <Text style={[invStyles.th, invStyles.tRight]}>Base Price</Text>
                                    <Text style={[invStyles.th, invStyles.tRight]}>Total Amount</Text>
                                </View>
                                <View style={invStyles.tableRow}>
                                    <Text style={[invStyles.td, { flex: 3, fontWeight: "700", color: TEXT_HEAD }]}>
                                        {order.itemDescription || "Product"}
                                    </Text>
                                    <Text style={[invStyles.td, invStyles.tCenter]}>{order.hsn || "-"}</Text>
                                    <Text style={[invStyles.td, invStyles.tCenter]}>{order.sku || "-"}</Text>
                                    <Text style={[invStyles.td, invStyles.tCenter]}>{order.qty ?? 1}</Text>
                                    <Text style={[invStyles.td, invStyles.tRight]}>{fmtInv(order.basePrice ?? itemTotal)}</Text>
                                    <Text style={[invStyles.td, invStyles.tRight, { fontWeight: "800", color: TEXT_HEAD }]}>
                                        {fmtInv(itemTotal)}
                                    </Text>
                                </View>
                            </View>

                            {/* ── Amount in words / Settlement breakdown ──────── */}
                            <View style={invStyles.twoColRow}>
                                <View style={invStyles.wordsBlock}>
                                    <Text style={invStyles.wordsLabel}>Amount Payable (in words):</Text>
                                    <Text style={invStyles.wordsValue}>{amountInWords(sellerEarning)}</Text>

                                    <View style={{ marginTop: 18 }}>
                                        <Text style={invStyles.termsTitle}>Terms & Conditions</Text>
                                        <Text style={invStyles.termsItem}>1. This is a system generated settlement advice.</Text>
                                        <Text style={invStyles.termsItem}>2. Deductions include GST, Shipping &amp; Commission fees.</Text>
                                        <Text style={invStyles.termsItem}>3. For discrepancies, contact support immediately.</Text>
                                        <Text style={invStyles.termsItem}>4. Payment has been processed and credited to seller wallet.</Text>
                                    </View>
                                </View>

                                <View style={invStyles.settlementBlock}>
                                    <InvoiceSettlementRow label="Total Order Value" value={fmtInv(customerPaidNum)} />
                                    <InvoiceSettlementRow label="Less GST" value={`- ${fmtInv(tax)}`} negative />
                                    <InvoiceSettlementRow label="Less Shipping" value={`- ${fmtInv(deliveryCharge)}`} negative />
                                    <InvoiceSettlementRow label="Less Commission (15.0%)" value={`- ${fmtInv(platformFee)}`} negative />
                                    <View style={invStyles.settlementDivider} />
                                    <View style={invStyles.netRow}>
                                        <Text style={invStyles.netLabel}>NET SETTLEMENT:</Text>
                                        <Text style={invStyles.netValue}>{fmtInv(sellerEarning)}</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={invStyles.footerDivider} />

                            {/* ── Footer ───────────────────────────────────────── */}
                            <View style={invStyles.footer}>
                                <Text style={invStyles.footerMuted}>
                                    This is an automatically generated invoice and does not require a signature or stamp.
                                </Text>
                                <Text style={invStyles.footerBold}>
                                    This invoice has been electronically generated by our system and is valid for all accounting and record-keeping purposes.
                                </Text>
                                <Text style={[invStyles.footerMuted, { marginTop: 10 }]}>
                                    For any queries or assistance regarding this payment, please contact:
                                </Text>
                                <Text style={invStyles.footerContact}>
                                    Email: {COMPANY.supportEmail}  |  Phone: {COMPANY.supportPhone}
                                </Text>
                                <Text style={[invStyles.footerMuted, { marginTop: 10 }]}>
                                    © {COMPANY.year} {COMPANY.legalName}. All Rights Reserved.
                                </Text>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
const SellerPaymentDetailScreen: React.FC<Partial<SellerPaymentDetailScreenProps>> = ({ order: propOrder, onBack: propOnBack }) => {
    const isWeb = Platform.OS === "web";
    const [regenLoading, setRegenLoading] = useState(false);
    const [invoiceLoading, setInvoiceLoading] = useState(false);

    // ── Invoice modal state ────────────────────────────────────────────────
    const [invoiceVisible, setInvoiceVisible] = useState(false);
    const [invoiceNo, setInvoiceNo] = useState<string | null>(null);
    const [invoiceGeneratedAt, setInvoiceGeneratedAt] = useState<string>("");

    const params = useLocalSearchParams();
    const router = useRouter();

    const orderRaw = params.orderData ? JSON.parse(params.orderData as string) : null;
    const order = propOrder || orderRaw;
    const onBack = propOnBack || (() => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace("/Sellerpayments");
        }
    });

    if (!order) {
        return (
            <AdminLayout>
                <View style={[styles.root, isWeb && styles.rootWeb, { alignItems: 'center', justifyContent: 'center' }]}>
                    <Text>Loading order details...</Text>
                </View>
            </AdminLayout>
        );
    }

    const remStyle = getReminderColor(order.reminderBucket);
    const payStyle = getPaymentColor(order.paymentStatus);
    const initials = getInitials(order.sellerName);

    // ── Parse numeric amounts from formatted string like "₹1,200.00" ──────────
    const parseAmount = (str: string) => {
        const num = parseFloat(str.replace(/[^0-9.]/g, "")) || 0;
        return num;
    };

    const customerPaidNum = parseAmount(order.customerPaid);
    // Example breakdown — replace with real API fields when available
    const platformFee = +(customerPaidNum * 0.05).toFixed(2);
    const deliveryCharge = 40;
    const tax = +(customerPaidNum * 0.02).toFixed(2);
    const sellerEarning = +(customerPaidNum - platformFee - deliveryCharge - tax).toFixed(2);

    const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

    // ── Build a fresh timestamp like "29/06/2026, 12:32" ───────────────────
    const buildTimestamp = () => {
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, "0");
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const yyyy = now.getFullYear();
        const hh = String(now.getHours()).padStart(2, "0");
        const min = String(now.getMinutes()).padStart(2, "0");
        return `${dd}/${mm}/${yyyy}, ${hh}:${min}`;
    };

    // ── Deterministic-ish invoice number for this order ────────────────────
    const buildInvoiceNo = () => {
        const year = new Date().getFullYear();
        const seed = (order.id ?? Math.floor(Math.random() * 999999)).toString().padStart(6, "0").slice(-6);
        return `SP-${year}-${seed}`;
    };

    const handleInvoice = async () => {
        setInvoiceLoading(true);
        setTimeout(() => {
            setInvoiceLoading(false);
            setInvoiceNo(buildInvoiceNo());
            setInvoiceGeneratedAt(buildTimestamp());
            setInvoiceVisible(true);
        }, 700);
    };

    const handleRegen = async () => {
        setRegenLoading(true);
        setTimeout(() => {
            setRegenLoading(false);
            // Same invoice number, refreshed timestamp
            if (!invoiceNo) setInvoiceNo(buildInvoiceNo());
            setInvoiceGeneratedAt(buildTimestamp());
            setInvoiceVisible(true);
        }, 900);
    };

    const handlePrint = () => {
        if (Platform.OS === "web") {
            // Make sure the invoice is open before printing.
            if (!invoiceVisible) setInvoiceVisible(true);

            // Inject a one-off print stylesheet that hides everything on the
            // page except the invoice content, so the browser's print dialog
            // only shows the invoice — not the dashboard behind it.
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
                    #invoice-print-area {
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                    }
                }
            `;

            // Give the modal a moment to render before the print dialog opens.
            setTimeout(() => {
                window.print();
            }, 50);
        } else {
            Alert.alert("Print", "Sending invoice to printer…");
        }
    };

    return (
        <AdminLayout>
            <View style={[styles.root, isWeb && styles.rootWeb]}>
                <StatusBar barStyle="light-content" backgroundColor="#151D4F" />

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={[styles.scrollContent, !isWeb && { paddingBottom: 60 }]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── HEADER ─────────────────────────────────────────────── */}
                    <View style={[styles.header, isWeb && styles.headerWeb]}>
                        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
                            <Feather name="arrow-left" size={18} color="#fff" />
                        </TouchableOpacity>

                        <View style={styles.headerMid}>
                            <Text style={styles.headerTitle}>Order Details</Text>
                            <Text style={styles.headerSub}>
                                Dashboard › Seller Payments ›{" "}
                                <Text style={{ color: PRIMARY }}>{order.orderId}</Text>
                            </Text>
                        </View>

                        <View style={styles.headerRight}>
                            {/* Payment status pill */}
                            <View style={[styles.statusPill, { backgroundColor: payStyle.bg }]}>
                                <View style={[styles.statusDot, { backgroundColor: payStyle.color }]} />
                                <Text style={[styles.statusPillText, { color: payStyle.color }]}>
                                    {order.paymentStatus}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* ── BODY ───────────────────────────────────────────────── */}
                    {isWeb ? (
                        // ── WEB: 2-column grid ─────────────────────────────
                        <View style={styles.grid}>

                            {/* LEFT column */}
                            <View style={styles.col}>

                                {/* Order Summary card */}
                                <View style={styles.card}>
                                    <SectionHeader icon="shopping-bag" title="Order Summary" />

                                    {/* Hero amount strip */}
                                    <View style={styles.amountStrip}>
                                        <View>
                                            <Text style={styles.amountLabel}>Customer Paid</Text>
                                            <Text style={styles.amountValue}>{order.customerPaid}</Text>
                                        </View>
                                        <View style={{ alignItems: "flex-end" }}>
                                            <Text style={styles.amountLabel}>Seller Earning</Text>
                                            <Text style={[styles.amountValue, { color: "#1a7a45" }]}>{fmt(sellerEarning)}</Text>
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
                                            <Text style={[styles.reminderText, { color: remStyle.color }]}>
                                                Reminder: {order.reminderLabel}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Seller Info card */}
                                <View style={styles.card}>
                                    <SectionHeader icon="user" title="Seller Details" accent={DARK} />
                                    <View style={styles.avatarRow}>
                                        <View style={styles.avatar}>
                                            <Text style={styles.avatarText}>{initials}</Text>
                                        </View>
                                        <View>
                                            <Text style={styles.avatarName}>{order.sellerName}</Text>
                                            <Text style={styles.avatarSub}>{order.sellerEmail}</Text>
                                            <Text style={styles.avatarSub}>{order.sellerPhone}</Text>
                                        </View>
                                    </View>
                                    <InfoRow label="Wallet Balance" value={order.walletBalance} valueColor="#1d4ed8" bold />
                                </View>

                                {/* Customer & Shipping card (new) */}
                                <CustomerShippingCard order={order} />
                            </View>

                            {/* RIGHT column */}
                            <View style={styles.col}>

                                {/* Cost Breakdown card */}
                                <View style={styles.card}>
                                    <SectionHeader icon="bar-chart-2" title="Cost Breakdown" accent="#7c3aed" />
                                    <CostRow label="Customer Paid (Total)" value={fmt(customerPaidNum)} />
                                    <CostRow label="Platform Fee (5%)" value={`− ${fmt(platformFee)}`} dimmed />
                                    <CostRow label="Delivery Charge" value={`− ${fmt(deliveryCharge)}`} dimmed />
                                    <CostRow label="Tax (2%)" value={`− ${fmt(tax)}`} dimmed />
                                    <View style={styles.totalRow}>
                                        <Text style={styles.totalLabel}>Amount to Pay Seller</Text>
                                        <Text style={styles.totalValue}>{fmt(sellerEarning)}</Text>
                                    </View>
                                </View>

                                {/* Payment Info card */}
                                <View style={styles.card}>
                                    <SectionHeader icon="credit-card" title="Payment Info" accent="#0891b2" />
                                    <InfoRow label="Payment Status" value={order.paymentStatus} valueColor={payStyle.color} bold />
                                    <InfoRow label="Wallet Balance" value={order.walletBalance} />
                                    <InfoRow label="Reminder Days" value={`${order.reminderDays} day(s)`} valueColor={remStyle.color} />
                                </View>

                                {/* Actions card */}
                                <View style={styles.card}>
                                    <SectionHeader icon="zap" title="Actions" accent="#d97706" />
                                    <View style={styles.actionsGrid}>
                                        <ActionButton
                                            icon="file-text"
                                            label={invoiceLoading ? "Generating…" : "Generate Invoice"}
                                            color="#f59e0b"
                                            onPress={handleInvoice}
                                            flex
                                        />
                                        <ActionButton
                                            icon="refresh-cw"
                                            label={regenLoading ? "Regenerating…" : "Regenerate Invoice"}
                                            color="#64748b"
                                            onPress={handleRegen}
                                            flex
                                        />
                                        <ActionButton
                                            icon="printer"
                                            label="Print Invoice"
                                            color="#3b82f6"
                                            onPress={handlePrint}
                                            flex
                                        />
                                        {order.paymentStatus === "Pending" && (
                                            <ActionButton
                                                icon="dollar-sign"
                                                label="Mark as Paid"
                                                color="#10b981"
                                                onPress={() => {
                                                    const msg = `Mark order ${order.orderId} as paid?`;
                                                    if (Platform.OS === "web") window.alert(msg);
                                                    else Alert.alert("Pay", msg);
                                                }}
                                                flex
                                            />
                                        )}
                                    </View>
                                </View>
                            </View>
                        </View>
                    ) : (
                        // ── MOBILE: single column ──────────────────────────
                        <View style={{ gap: 14 }}>

                            {/* Order summary */}
                            <View style={styles.card}>
                                <SectionHeader icon="shopping-bag" title="Order Summary" />
                                <View style={styles.amountStrip}>
                                    <View>
                                        <Text style={styles.amountLabel}>Customer Paid</Text>
                                        <Text style={styles.amountValue}>{order.customerPaid}</Text>
                                    </View>
                                    <View style={{ alignItems: "flex-end" }}>
                                        <Text style={styles.amountLabel}>Seller Earning</Text>
                                        <Text style={[styles.amountValue, { color: "#1a7a45" }]}>{fmt(sellerEarning)}</Text>
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
                                        <Text style={[styles.reminderText, { color: remStyle.color }]}>
                                            Reminder: {order.reminderLabel}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Seller info */}
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

                            {/* Customer & Shipping (new) */}
                            <CustomerShippingCard order={order} />

                            {/* Cost breakdown */}
                            <View style={styles.card}>
                                <SectionHeader icon="bar-chart-2" title="Cost Breakdown" accent="#7c3aed" />
                                <CostRow label="Customer Paid (Total)" value={fmt(customerPaidNum)} />
                                <CostRow label="Platform Fee (5%)" value={`− ${fmt(platformFee)}`} dimmed />
                                <CostRow label="Delivery Charge" value={`− ${fmt(deliveryCharge)}`} dimmed />
                                <CostRow label="Tax (2%)" value={`− ${fmt(tax)}`} dimmed />
                                <View style={styles.totalRow}>
                                    <Text style={styles.totalLabel}>Amount to Pay Seller</Text>
                                    <Text style={styles.totalValue}>{fmt(sellerEarning)}</Text>
                                </View>
                            </View>

                            {/* Payment info */}
                            <View style={styles.card}>
                                <SectionHeader icon="credit-card" title="Payment Info" accent="#0891b2" />
                                <InfoRow label="Payment Status" value={order.paymentStatus} valueColor={payStyle.color} bold />
                                <InfoRow label="Wallet Balance" value={order.walletBalance} />
                                <InfoRow label="Reminder Days" value={`${order.reminderDays} day(s)`} valueColor={remStyle.color} />
                            </View>

                            {/* Actions */}
                            <View style={styles.card}>
                                <SectionHeader icon="zap" title="Actions" accent="#d97706" />
                                <View style={styles.actionsGrid}>
                                    <ActionButton
                                        icon="file-text"
                                        label={invoiceLoading ? "Generating…" : "Invoice"}
                                        color="#f59e0b"
                                        onPress={handleInvoice}
                                        flex
                                    />
                                    <ActionButton
                                        icon="refresh-cw"
                                        label={regenLoading ? "Regen…" : "Regenerate"}
                                        color="#64748b"
                                        onPress={handleRegen}
                                        flex
                                    />
                                    <ActionButton
                                        icon="printer"
                                        label="Print"
                                        color="#3b82f6"
                                        onPress={handlePrint}
                                        flex
                                    />
                                    {order.paymentStatus === "Pending" && (
                                        <ActionButton
                                            icon="dollar-sign"
                                            label="Mark Paid"
                                            color="#10b981"
                                            onPress={() => Alert.alert("Pay", `Mark ${order.orderId} as paid?`)}
                                            flex
                                        />
                                    )}
                                </View>
                            </View>
                        </View>
                    )}
                </ScrollView>

                {/* ── INVOICE MODAL ──────────────────────────────────────────── */}
                {invoiceNo && (
                    <InvoiceModalView
                        visible={invoiceVisible}
                        onClose={() => setInvoiceVisible(false)}
                        order={order}
                        invoiceNo={invoiceNo}
                        generatedAt={invoiceGeneratedAt}
                        orderRef={order.orderRef || order.orderId}
                        customerPaidNum={customerPaidNum}
                        platformFee={platformFee}
                        deliveryCharge={deliveryCharge}
                        tax={tax}
                        sellerEarning={sellerEarning}
                        onPrint={handlePrint}
                        onRegenerate={handleRegen}
                        regenLoading={regenLoading}
                    />
                )}
            </View>
        </AdminLayout>
    );
};

export default SellerPaymentDetailScreen;

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: BG_PAGE },
    rootWeb: { backgroundColor: BG_PAGE },

    // Header
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        backgroundColor: "#151D4F",
        paddingHorizontal: 18,
        paddingVertical: 16,
        borderRadius: 16,
        shadowColor: DARK,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
    },
    headerWeb: { paddingHorizontal: 28, paddingVertical: 20, borderRadius: 16 },
    backBtn: {
        width: 40, height: 40, borderRadius: 12,
        borderWidth: 1.5, borderColor: "rgba(255,255,255,0.2)",
        alignItems: "center", justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.1)",
    },
    headerMid: { flex: 1 },
    headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
    headerSub: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 },
    headerRight: { alignItems: "flex-end" },

    statusPill: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    },
    statusDot: { width: 7, height: 7, borderRadius: 99 },
    statusPillText: { fontSize: 12, fontWeight: "700" },

    // Scroll
    scroll: { flex: 1 },
    scrollContent: { padding: 16, gap: 16 },

    // Layout
    grid: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
    col: { flex: 1, gap: 16 },

    // Card
    card: {
        backgroundColor: BG_CARD,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: BORDER,
        shadowColor: DARK,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
    },

    // Amount strip inside card
    amountStrip: {
        flexDirection: "row",
        justifyContent: "space-between",
        backgroundColor: BG_PAGE,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: BORDER,
    },
    amountLabel: { fontSize: 11, color: TEXT_MUTED, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 4 },
    amountValue: { fontSize: 22, fontWeight: "800", color: DARK },

    // Reminder badge
    reminderBadge: {
        flexDirection: "row", alignItems: "center", gap: 7,
        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, alignSelf: "flex-start",
    },
    reminderText: { fontSize: 12, fontWeight: "700" },

    // Avatar row
    avatarRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 },
    avatar: {
        width: 52, height: 52, borderRadius: 14,
        backgroundColor: DARK, alignItems: "center", justifyContent: "center",
    },
    avatarText: { color: "#fff", fontSize: 17, fontWeight: "800" },
    avatarName: { fontSize: 15, fontWeight: "800", color: TEXT_HEAD, marginBottom: 3 },
    avatarSub: { fontSize: 12, color: TEXT_MUTED, marginBottom: 1 },

    // City type pill (new — Customer & Shipping card)
    cityTypePill: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        alignSelf: "flex-start",
    },
    cityTypeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.2 },

    // Address block (new — Customer & Shipping card)
    addressBlock: {
        marginTop: 4,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: "#f3ece6",
    },
    addressBlockHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
    addressBlockLabel: { fontSize: 11, color: TEXT_MUTED, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
    addressFreeText: { fontSize: 13, color: TEXT_BODY, fontWeight: "600", lineHeight: 19, marginBottom: 12 },
    addressChipsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },

    // Total row
    totalRow: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        paddingTop: 14, marginTop: 4,
    },
    totalLabel: { fontSize: 14, fontWeight: "800", color: TEXT_HEAD },
    totalValue: { fontSize: 20, fontWeight: "800", color: PRIMARY },

    // Actions grid
    actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
});

// ─── INVOICE MODAL STYLES ─────────────────────────────────────────────────────
const GREEN = "#1a7a45";
const GREEN_BG = "#e8f7ee";

const invStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(20,12,6,0.55)",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
    },
    sheet: {
        width: "100%",
        height: "100%",
        backgroundColor: BG_PAGE,
        borderRadius: 0,
        overflow: "hidden",
    },
    sheetWeb: {
        maxWidth: 720,
        height: "92%",
        borderRadius: 18,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 30,
    },

    topBar: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: BG_CARD,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
    },
    topBarTimestamp: { fontSize: 11, color: TEXT_MUTED, fontWeight: "600", width: 110 },
    topBarTitle: { flex: 1, fontSize: 12, fontWeight: "700", color: TEXT_HEAD, textAlign: "center" },
    topBarActions: { flexDirection: "row", alignItems: "center", gap: 8 },
    iconBtn: {
        flexDirection: "row", alignItems: "center", gap: 6,
        borderWidth: 1, borderColor: BORDER, borderRadius: 8,
        paddingHorizontal: 10, paddingVertical: 7,
        backgroundColor: BG_PAGE,
    },
    iconBtnText: { fontSize: 11, fontWeight: "700", color: TEXT_BODY },
    closeBtn: {
        width: 30, height: 30, borderRadius: 8,
        alignItems: "center", justifyContent: "center",
        backgroundColor: BG_PAGE, borderWidth: 1, borderColor: BORDER,
    },

    scroll: { flex: 1 },
    scrollContent: { padding: 18, paddingBottom: 40 },

    page: {
        backgroundColor: BG_CARD,
        borderRadius: 14,
        padding: 22,
        borderWidth: 1,
        borderColor: BORDER,
    },

    // Brand row
    brandRow: { flexDirection: "row", justifyContent: "space-between", gap: 16 },
    brandLeft: { flex: 1.4 },
    brandRight: { flex: 1, alignItems: "flex-end" },

    logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    logoMark: {
        width: 28, height: 28, borderRadius: 7,
        backgroundColor: PRIMARY_LIGHT, borderWidth: 1, borderColor: PRIMARY,
        alignItems: "center", justifyContent: "center",
    },
    logoMarkText: { fontSize: 11, fontWeight: "800", color: PRIMARY },
    logoText: { fontSize: 17, fontWeight: "800", letterSpacing: 0.2 },
    tagline: { fontSize: 10, color: TEXT_MUTED, fontStyle: "italic", marginTop: 2, marginLeft: 36 },
    companyLine: { fontSize: 11, color: TEXT_BODY, fontWeight: "600" },

    sellerPaymentTitle: { fontSize: 16, fontWeight: "800", color: PRIMARY, letterSpacing: 0.4 },
    metaLine: { fontSize: 11 },
    metaLabel: { color: TEXT_MUTED, fontWeight: "600" },
    metaValue: { color: TEXT_HEAD, fontWeight: "800" },

    divider: { height: 2, backgroundColor: PRIMARY, marginVertical: 16, opacity: 0.85 },

    // Two-column generic row
    twoColRow: { flexDirection: "row", gap: 14, marginBottom: 18, alignItems: "flex-start" },

    infoCard: {
        flex: 1,
        backgroundColor: BG_PAGE,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: BORDER,
        padding: 14,
    },
    infoCardTitle: {
        fontSize: 10.5, fontWeight: "800", color: PRIMARY,
        textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8,
    },
    beneficiaryName: { fontSize: 13, fontWeight: "800", color: TEXT_HEAD, marginBottom: 4 },
    beneficiaryAddr: { fontSize: 11, color: TEXT_BODY, fontWeight: "600", marginBottom: 3, lineHeight: 15 },
    settledBadge: {
        flexDirection: "row", alignItems: "center", gap: 5,
        backgroundColor: GREEN_BG, borderRadius: 6,
        paddingHorizontal: 9, paddingVertical: 5,
        alignSelf: "flex-start", marginTop: 8,
    },
    settledBadgeText: { fontSize: 10, fontWeight: "800", color: GREEN, letterSpacing: 0.3 },

    // Table
    table: {
        borderWidth: 1, borderColor: BORDER, borderRadius: 10,
        overflow: "hidden", marginBottom: 18,
    },
    tableHeaderRow: {
        flexDirection: "row", backgroundColor: BG_PAGE,
        paddingHorizontal: 12, paddingVertical: 9,
        borderBottomWidth: 1, borderBottomColor: BORDER,
    },
    tableRow: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 11 },
    th: { flex: 1, fontSize: 10, fontWeight: "800", color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: 0.3 },
    td: { flex: 1, fontSize: 12, color: TEXT_BODY, fontWeight: "600" },
    tCenter: { textAlign: "center" },
    tRight: { textAlign: "right" },

    // Words + settlement
    wordsBlock: { flex: 1.2 },
    wordsLabel: { fontSize: 11, color: TEXT_MUTED, fontWeight: "700", marginBottom: 4 },
    wordsValue: { fontSize: 13, color: "#1d4ed8", fontWeight: "800", lineHeight: 18 },

    termsTitle: { fontSize: 11, fontWeight: "800", color: TEXT_HEAD, marginBottom: 6 },
    termsItem: { fontSize: 10.5, color: TEXT_MUTED, fontWeight: "500", marginBottom: 3, lineHeight: 14 },

    settlementBlock: {
        flex: 1,
        backgroundColor: BG_PAGE,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: BORDER,
        padding: 14,
    },
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