import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
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

const getInitials = (name: string) =>
    name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

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
        <Feather name={icon as any} size={14} color="#fff" />
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
                    <Text style={styles.avatarName}>{order.customerName}</Text>
                    <Text style={styles.avatarSub}>{order.customerPhone}</Text>
                    {order.customerEmail ? <Text style={styles.avatarSub}>{order.customerEmail}</Text> : null}
                </View>
                <View style={[styles.cityTypePill, { backgroundColor: order.cityType === "Intra-City" ? PRIMARY_LIGHT : "#e6f1fb" }]}>
                    <Text style={[styles.cityTypeText, { color: order.cityType === "Intra-City" ? PRIMARY : "#185fa5" }]}>
                        {order.cityType}
                    </Text>
                </View>
            </View>

            <View style={styles.addressBlock}>
                <View style={styles.addressBlockHeader}>
                    <Feather name="home" size={12} color={TEXT_MUTED} />
                    <Text style={styles.addressBlockLabel}>Delivery address</Text>
                </View>
                <Text style={styles.addressFreeText}>
                    {order.shippingAddressLine1}
                    {order.shippingAddressLine2 ? `, ${order.shippingAddressLine2}` : ""}
                </Text>

                <View style={styles.addressChipsRow}>
                    <AddressChip label="City" value={order.shippingCity} />
                    <AddressChip label="State" value={order.shippingState} />
                    <AddressChip label="Pincode" value={order.shippingPincode} />
                </View>
            </View>
        </View>
    );
};

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
const SellerPaymentDetailScreen: React.FC<Partial<SellerPaymentDetailScreenProps>> = ({ order: propOrder, onBack: propOnBack }) => {
    const isWeb = Platform.OS === "web";
    const [regenLoading, setRegenLoading] = useState(false);
    const [invoiceLoading, setInvoiceLoading] = useState(false);

    const params = useLocalSearchParams();
    const router = useRouter();

    const orderRaw = params.orderData ? JSON.parse(params.orderData as string) : null;
    const order = propOrder || orderRaw;
    const onBack = propOnBack || (() => router.back());

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

    const handleInvoice = async () => {
        setInvoiceLoading(true);
        setTimeout(() => {
            setInvoiceLoading(false);
            const msg = `Invoice generated for order ${order.orderId}`;
            if (Platform.OS === "web") window.alert(msg);
            else Alert.alert("Invoice", msg);
        }, 900);
    };

    const handleRegen = async () => {
        setRegenLoading(true);
        setTimeout(() => {
            setRegenLoading(false);
            const msg = `Invoice regenerated for order ${order.orderId}`;
            if (Platform.OS === "web") window.alert(msg);
            else Alert.alert("Regenerated", msg);
        }, 1100);
    };

    const handlePrint = () => {
        if (Platform.OS === "web") window.print();
        else Alert.alert("Print", "Print triggered");
    };

    return (
        <AdminLayout>
            <View style={[styles.root, isWeb && styles.rootWeb]}>
                <StatusBar barStyle="dark-content" backgroundColor={BG_PAGE} />

                {/* ── HEADER ─────────────────────────────────────────────── */}
                <View style={[styles.header, isWeb && styles.headerWeb]}>
                    <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
                        <Feather name="arrow-left" size={18} color={DARK} />
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
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={[styles.scrollContent, !isWeb && { paddingBottom: 60 }]}
                    showsVerticalScrollIndicator={false}
                >
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
        backgroundColor: BG_CARD,
        paddingHorizontal: 18,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
    },
    headerWeb: { paddingHorizontal: 28, paddingVertical: 20 },
    backBtn: {
        width: 40, height: 40, borderRadius: 12,
        borderWidth: 1.5, borderColor: BORDER,
        alignItems: "center", justifyContent: "center",
        backgroundColor: BG_PAGE,
    },
    headerMid: { flex: 1 },
    headerTitle: { fontSize: 20, fontWeight: "800", color: TEXT_HEAD, letterSpacing: -0.5 },
    headerSub: { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
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