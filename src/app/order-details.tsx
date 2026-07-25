import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
/**
 * order-details.tsx  (React Native / Expo)
 * -----------------------------------------------------------------------
 * ICON NOTE:
 * react-native-bootstrap-icons was last published in 2021, so any icon
 * added to Bootstrap Icons after that date isn't in this package.
 * "graph-up-arrow" (added 2022) failed for exactly this reason and has
 * been swapped for "graph-up" (present since Bootstrap Icons v1.0).
 * "receipt-cutoff" was added right around this package's cutoff and is
 * equally risky, so it's swapped for "wallet2" (also a v1.0 icon).
 *
 * If anything else fails to resolve, it's the same issue — swap that
 * one icon for an older equivalent. To see exactly which icons your
 * installed copy actually has, run:
 *   dir node_modules\react-native-bootstrap-icons\icons      (Windows)
 *   ls node_modules/react-native-bootstrap-icons/icons        (Mac/Linux)
 * and match names against https://icons.getbootstrap.com/ — anything
 * added after ~mid-2021 on that site is not safe to assume exists here.
 *
 * ADMIN LAYOUT:
 * Left commented out at the bottom (as you had it) since the wrapper
 * import/props are still unverified against your real files. Uncomment
 * once you confirm the correct import path and prop signature.
 * -----------------------------------------------------------------------
 */

import ArrowLeftIcon from "react-native-bootstrap-icons/icons/arrow-left";
import Calendar3Icon from "react-native-bootstrap-icons/icons/calendar3";
//import ChevronRightIcon from "react-native-bootstrap-icons/icons/chevron-right";
import ClipboardDataIcon from "react-native-bootstrap-icons/icons/clipboard-data";
import CreditCardIcon from "react-native-bootstrap-icons/icons/credit-card-2-front";
//import GraphUpIcon from "react-native-bootstrap-icons/icons/graph-up";
//import HouseDoorIcon from "react-native-bootstrap-icons/icons/house-door";
import MegaphoneIcon from "react-native-bootstrap-icons/icons/megaphone";
import PersonBadgeIcon from "react-native-bootstrap-icons/icons/person-badge";
//import ReceiptIcon from "react-native-bootstrap-icons/icons/receipt";
//import Wallet2Icon from "react-native-bootstrap-icons/icons/wallet2";

import AdminLayout from "@/components/admin-layout";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatDateTime, formatRupee } from "@/lib/format";
import { fetchAdsOrder, fetchAdsOrderByCode, type AdsApiRow } from "@/services/adsApi";

/* -------------------------------------------------------------------- */
/*  Palette                                                              */
/* -------------------------------------------------------------------- */

const COLORS = {
    navy: "#151D4F",
    navyLight: "#2b4568",
    bg: "#f4f6f9",
    card: "#ffffff",
    border: "#e6e9ef",
    text: "#1e2532",
    textMuted: "#6b7385",
    accent: "#e8833a",
    successBg: "#e8f8ee",
    successFg: "#1c9a56",
    warningBg: "#fff6e5",
    warningFg: "#b9770e",
    dangerBg: "#fdecec",
    dangerFg: "#c62b2b",
    neutralBg: "#eef1f5",
    neutralFg: "#5a6270",
    headOrange: "#e8833a",
    headGreen: "#1fa971",
    headPurple: "#7c5cff",
    headTeal: "#0f9baa",
    headRose: "#ef5f7f",
    headIndigo: "#4a5ed6",
};

/* -------------------------------------------------------------------- */
/*  Types & mock data                                                    */
/* -------------------------------------------------------------------- */

interface OrderInfo {
    orderId: string;
    orderDate: string;
    status: "Paid" | "Pending" | "Failed" | "Refunded";
    amount: string;
    billingType: string;
    dailyRate: string;
    monthlyRate: string;
}
interface CustomerInfo {
    name: string;
    email: string;
    phone: string;
    company: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
}
interface PaymentInfo {
    paymentId: string;
    paymentMethod: string;
    status: "Captured" | "Pending" | "Failed" | "Refunded";
    paymentDate: string;
}
interface AdInfo {
    adName: string;
    adType: string;
    category: string;
    description: string;
    dailyRate: string;
    monthlyRate: string;
}
interface CampaignInfo {
    campaignName: string;
    placement: string;
    duration: string;
    impressions: string;
}
interface OrderDetailsData {
    order: OrderInfo;
    customer: CustomerInfo;
    payment: PaymentInfo;
    ad: AdInfo;
    campaign: CampaignInfo;
}

function mapOrderStatus(raw?: unknown): OrderInfo["status"] {
    const s = String(raw ?? "pending").toLowerCase();
    if (s === "paid") return "Paid";
    if (s === "failed") return "Failed";
    if (s === "refunded") return "Refunded";
    return "Pending";
}

function mapPaymentStatus(raw?: unknown): PaymentInfo["status"] {
    const s = String(raw ?? "pending").toLowerCase();
    if (s === "captured" || s === "paid") return "Captured";
    if (s === "failed") return "Failed";
    if (s === "refunded") return "Refunded";
    return "Pending";
}

function displayValue(value?: unknown): string {
    const trimmed = String(value ?? "").trim();
    return trimmed || "—";
}

function mapApiToOrderDetails(raw: AdsApiRow): OrderDetailsData {
    const user = (raw.user ?? {}) as Record<string, unknown>;
    const billingType = String(raw.billingType ?? "monthly").toLowerCase() === "daily" ? "Daily" : "Monthly";
    const adType = String(raw.adType ?? "—");
    return {
        order: {
            orderId: displayValue(raw.orderId),
            orderDate: formatDateTime(String(raw.createdAt ?? "")),
            status: mapOrderStatus(raw.status),
            amount: formatRupee(Number(raw.amount ?? 0)),
            billingType,
            dailyRate: formatRupee(Number(raw.dailyRate ?? 0)),
            monthlyRate: formatRupee(Number(raw.monthlyRate ?? 0)),
        },
        customer: {
            name: displayValue(user.name ?? raw.customerName),
            email: displayValue(user.email ?? raw.customerEmail),
            phone: displayValue(user.phone ?? raw.customerPhone),
            company: displayValue(user.company),
            address: displayValue(user.address),
            city: displayValue(user.city),
            state: displayValue(user.state),
            pincode: displayValue(user.pincode),
        },
        payment: {
            paymentId: displayValue(raw.razorpayPaymentId ?? raw.paymentId),
            paymentMethod: displayValue(raw.paymentMethod ?? raw.paymentStatus),
            status: mapPaymentStatus(raw.paymentStatus ?? raw.status),
            paymentDate: formatDateTime(String(raw.updatedAt ?? raw.createdAt ?? "")),
        },
        ad: {
            adName: displayValue(raw.adName),
            adType,
            category: displayValue(raw.selectedPlan ?? raw.adType),
            description: displayValue(raw.adDescription),
            dailyRate: formatRupee(Number(raw.dailyRate ?? 0)),
            monthlyRate: formatRupee(Number(raw.monthlyRate ?? 0)),
        },
        campaign: {
            campaignName: displayValue(raw.adName),
            placement: displayValue(raw.selectedPlan ?? raw.adType),
            duration: billingType,
            impressions: "—",
        },
    };
}

const MOCK_DATA: OrderDetailsData = {
    order: {
        orderId: "AD-2025-2159",
        orderDate: "26 Oct 2025, 16:55",
        status: "Paid",
        amount: "₹325,000.00",
        billingType: "Monthly",
        dailyRate: "₹16,000",
        monthlyRate: "₹325,000",
    },
    customer: {
        name: "Flint & Thread",
        email: "flintnthread@gmail.com",
        phone: "8121433370",
        company: "Flint & Thread",
        address: "Flat No.105, Arjun Block, Krushi Defense Colony, Patancheru",
        city: "Hyderabad",
        state: "Telangana",
        pincode: "502319",
    },
    payment: {
        paymentId: "pay_RY5KerV1uUER0g",
        paymentMethod: "Card",
        status: "Captured",
        paymentDate: "26 Oct 2025, 16:58",
    },
    ad: {
        adName: "Landing Page Sub-Banner",
        adType: "Placement",
        category: "Landing Page Banner",
        description: "Sub-banner placement on landing pages",
        dailyRate: "₹16,000",
        monthlyRate: "₹325,000",
    },
    campaign: {
        campaignName: "Landing Page Sub-Banner",
        placement: "Landing Page Banner",
        duration: "Monthly",
        impressions: "—",
    },
};

/* -------------------------------------------------------------------- */
/*  Responsive breakpoints                                               */
/* -------------------------------------------------------------------- */

function useBreakpoint() {
    const { width } = useWindowDimensions();
    return {
        width,
        isMobile: width < 768, // 320 / 375 / 425
        isTablet: width >= 768 && width < 1024, // 768
        isLaptop: width >= 1024 && width < 1440, // 1024
        isDesktop: width >= 1440 && width < 2000, // 1440
        isWide: width >= 2000, // 2560
        threeColCount: width >= 1440 ? 3 : width >= 1024 ? 2 : 1,
        twoColCount: width >= 1024 ? 2 : 1,
        pad: width < 425 ? 16 : width < 768 ? 20 : width < 1024 ? 24 : width >= 2000 ? 48 : 32,
    };
}

/* -------------------------------------------------------------------- */
/*  Small pieces                                                         */
/* -------------------------------------------------------------------- */

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const map: Record<string, { bg: string; fg: string }> = {
        Paid: { bg: COLORS.successBg, fg: COLORS.successFg },
        Captured: { bg: COLORS.successBg, fg: COLORS.successFg },
        Pending: { bg: COLORS.warningBg, fg: COLORS.warningFg },
        Failed: { bg: COLORS.dangerBg, fg: COLORS.dangerFg },
        Refunded: { bg: COLORS.neutralBg, fg: COLORS.neutralFg },
    };
    const c = map[status] ?? { bg: COLORS.neutralBg, fg: COLORS.neutralFg };
    return (
        <View style={[styles.badge, { backgroundColor: c.bg }]}>
            <Text style={[styles.badgeText, { color: c.fg }]}>{status}</Text>
        </View>
    );
};

const KeyValue: React.FC<{ label: string; value: React.ReactNode; emphasis?: boolean; last?: boolean }> = ({
    label,
    value,
    emphasis,
    last,
}) => {
    const { isMobile } = useBreakpoint();
    return (
        <View
            style={[
                styles.kvRow,
                isMobile ? styles.kvRowStacked : styles.kvRowInline,
                last && { borderBottomWidth: 0 },
            ]}
        >
            <Text style={[styles.kvLabel, isMobile && styles.kvLabelMobile]}>{label}</Text>
            {typeof value === "string" || typeof value === "number" ? (
                <Text style={[styles.kvValue, emphasis && styles.kvEmphasis]}>{value}</Text>
            ) : (
                value
            )}
        </View>
    );
};

interface CardProps {
    Icon: React.ComponentType<{ width?: number; height?: number; fill?: string }>;
    title: string;
    children: React.ReactNode;
    headColor: string;
    style?: any;
    index?: number;
}

const Card: React.FC<CardProps> = ({ Icon, title, children, headColor, style, index = 0 }) => {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(12)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 400,
                delay: index * 70,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 400,
                delay: index * 70,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <Animated.View style={[styles.card, style, { opacity, transform: [{ translateY }] }]}>
            <View style={[styles.cardHeader, { backgroundColor: headColor }]}>
                <Icon width={18} height={18} fill="#ffffff" />
                <Text style={styles.cardHeaderText}>{title}</Text>
            </View>
            <View style={styles.cardBody}>{children}</View>
        </Animated.View>
    );
};

/* -------------------------------------------------------------------- */
/*  Main page                                                            */
/* -------------------------------------------------------------------- */

interface OrderDetailsPageProps {
    data?: OrderDetailsData;
    onBack?: () => void;
}

const OrderDetailsPage: React.FC<OrderDetailsPageProps> = ({ data: dataProp, onBack }) => {
    const params = useLocalSearchParams<{ id?: string; orderId?: string }>();
    const [data, setData] = useState<OrderDetailsData | null>(dataProp ?? null);
    const [loading, setLoading] = useState(!dataProp);
    const [error, setError] = useState<string | null>(null);
    const bp = useBreakpoint();
    const router = useRouter();

    useEffect(() => {
        if (dataProp) {
            setData(dataProp);
            setLoading(false);
            return;
        }
        const numericId = params.id ? Number(params.id) : NaN;
        const orderCode = params.orderId ? String(params.orderId) : "";
        if (!Number.isFinite(numericId) && !orderCode) {
            setData(MOCK_DATA);
            setLoading(false);
            return;
        }
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const raw = Number.isFinite(numericId)
                    ? await fetchAdsOrder(numericId)
                    : await fetchAdsOrderByCode(orderCode);
                if (cancelled) return;
                if (!raw) {
                    setError("Order not found.");
                    setData(null);
                } else {
                    setData(mapApiToOrderDetails(raw));
                }
            } catch (e) {
                if (!cancelled) {
                    setError(getApiErrorMessage(e, "Failed to load order details."));
                    setData(null);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [dataProp, params.id, params.orderId]);

    const handleBack = () => {
        if (onBack) return onBack();
        router.push("/ads-ordermanagement" as any);
    };

    if (loading) {
        return (
            <AdminLayout>
                <View style={[styles.scrollContent, { padding: bp.pad, alignItems: "center", justifyContent: "center", minHeight: 240 }]}>
                    <Text style={{ color: COLORS.textMuted }}>Loading order details…</Text>
                </View>
            </AdminLayout>
        );
    }

    if (error || !data) {
        return (
            <AdminLayout>
                <View style={[styles.scrollContent, { padding: bp.pad }]}>
                    <View style={[styles.pageHeader, bp.isMobile && styles.pageHeaderStacked]}>
                        <View style={styles.headerLeft}>
                            <Pressable style={({ pressed }) => [styles.backIconBtn, pressed && { opacity: 0.7 }]} onPress={handleBack}>
                                <ArrowLeftIcon width={18} height={18} fill="#ffffff" />
                            </Pressable>
                            <View>
                                <Text style={styles.headerTitle}>Order Details</Text>
                                <Text style={styles.summaryDate}>{error ?? "No order selected."}</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </AdminLayout>
        );
    }

    const { order, customer, payment, ad } = data;

    const cardBasis = (count: number) => (count === 1 ? "100%" : count === 2 ? "48%" : "31.5%");

    const content = (
        <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={[
                styles.scrollContent,
                { padding: bp.pad, paddingBottom: bp.isMobile ? 96 : 64 },
            ]}
            showsVerticalScrollIndicator
        >
            {/* Combined navy header: back icon | order info | stats */}
            <View style={[styles.pageHeader, bp.isMobile && styles.pageHeaderStacked]}>

                {/* Left: back icon + order identity */}
                <View style={styles.headerLeft}>
                    <Pressable style={({ pressed }) => [styles.backIconBtn, pressed && { opacity: 0.7 }]} onPress={handleBack}>
                        <ArrowLeftIcon width={18} height={18} fill="#ffffff" />
                    </Pressable>


                    <View>
                        <Text style={styles.headerTitle}>Order Details</Text>
                        <Text style={styles.summaryId}>{order.orderId}</Text>
                        <View style={styles.summaryDateRow}>
                            <Calendar3Icon width={12} height={12} fill="rgba(255,255,255,0.7)" />
                            <Text style={styles.summaryDate}>{order.orderDate}</Text>
                        </View>
                    </View>
                </View>

                {/* Right: stats */}
                <View style={[styles.summaryRight, bp.isMobile && styles.summaryRightStacked]}>
                    <View style={styles.summaryStatRow}>
                        <View style={styles.summaryStat}>
                            <Text style={styles.summaryStatLabel}>Status</Text>
                            <StatusBadge status={order.status} />
                        </View>
                        <View style={styles.summaryStat}>
                            <Text style={styles.summaryStatLabel}>Billing Type</Text>
                            <Text style={styles.summaryStatValue}>{order.billingType}</Text>
                        </View>
                    </View>
                    <View style={styles.summaryStat}>
                        <Text style={styles.summaryStatLabel}>Amount</Text>
                        <Text style={styles.summaryAmount}>{order.amount}</Text>
                    </View>
                </View>
            </View>



            {/* Order / Customer / Payment */}
            <View style={styles.grid}>
                <Card
                    Icon={ClipboardDataIcon}
                    title="Order Information"
                    headColor={COLORS.headOrange}
                    index={0}
                    style={{ flexBasis: cardBasis(bp.threeColCount), flexGrow: 1 }}
                >
                    <KeyValue label="Order ID" value={order.orderId} />
                    <KeyValue label="Order Date" value={order.orderDate} />
                    <KeyValue label="Status" value={<StatusBadge status={order.status} />} />
                    <KeyValue label="Billing Type" value={order.billingType} />
                    <KeyValue label="Daily Rate" value={order.dailyRate} />
                    <KeyValue label="Monthly Rate" value={order.monthlyRate} />
                    <KeyValue label="Amount" value={order.amount} emphasis last />
                </Card>

                <Card
                    Icon={PersonBadgeIcon}
                    title="Customer Information"
                    headColor={COLORS.headGreen}
                    index={1}
                    style={{ flexBasis: cardBasis(bp.threeColCount), flexGrow: 1 }}
                >
                    <KeyValue label="Name" value={customer.name} />
                    <KeyValue
                        label="Email"
                        value={
                            <Pressable onPress={() => Linking.openURL(`mailto:${customer.email}`)}>
                                <Text style={[styles.kvValue, styles.link]}>{customer.email}</Text>
                            </Pressable>
                        }
                    />
                    <KeyValue
                        label="Phone"
                        value={
                            <Pressable onPress={() => Linking.openURL(`tel:${customer.phone}`)}>
                                <Text style={[styles.kvValue, styles.link]}>{customer.phone}</Text>
                            </Pressable>
                        }
                    />
                    <KeyValue label="Company" value={customer.company} />
                    <KeyValue label="Address" value={customer.address} />
                    <KeyValue label="City" value={customer.city} />
                    <KeyValue label="State" value={customer.state} />
                    <KeyValue label="Pincode" value={customer.pincode} last />
                </Card>

                <Card
                    Icon={CreditCardIcon}
                    title="Payment Information"
                    headColor={COLORS.headPurple}
                    index={2}
                    style={{ flexBasis: cardBasis(bp.threeColCount), flexGrow: 1 }}
                >
                    <KeyValue label="Payment ID" value={payment.paymentId} />
                    <KeyValue label="Payment Method" value={payment.paymentMethod} />
                    <KeyValue label="Status" value={<StatusBadge status={payment.status} />} />
                    <KeyValue label="Payment Date" value={payment.paymentDate} last />
                </Card>
            </View>

            {/* Advertisement details — full width */}
            <Card
                Icon={MegaphoneIcon}
                title="Advertisement Details"
                headColor={COLORS.headTeal}
                index={3}
                style={{ width: "100%", marginBottom: 20 }}
            >
                <View style={[styles.twoCol, bp.isMobile && styles.twoColStacked]}>
                    <View style={styles.twoColItem}>
                        <KeyValue label="Ad Name" value={ad.adName} />
                        <KeyValue
                            label="Ad Type"
                            value={
                                <View style={styles.pill}>
                                    <Text style={styles.pillText}>{ad.adType}</Text>
                                </View>
                            }
                        />
                        <KeyValue label="Category" value={ad.category} last />
                    </View>
                    <View style={styles.twoColItem}>
                        <KeyValue label="Description" value={ad.description} />
                        <KeyValue label="Daily Rate" value={ad.dailyRate} />
                        <KeyValue label="Monthly Rate" value={ad.monthlyRate} last />
                    </View>
                </View>
            </Card>




        </ScrollView>
    );

    return (
        <AdminLayout>
            {content}
        </AdminLayout>
    );

    // Original bare return (no layout wrapper):
    // return content;
};

export default OrderDetailsPage;

/* -------------------------------------------------------------------- */
/*  Styles                                                               */
/* -------------------------------------------------------------------- */

const styles = StyleSheet.create({
    scrollArea: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    scrollContent: {
        maxWidth: 2000,
        width: "100%",
        alignSelf: "center",
    },

    pageHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: COLORS.navy,
        paddingVertical: 22,
        paddingHorizontal: 28,
        borderRadius: 16,
        marginBottom: 20,
        gap: 16,
    },
    pageHeaderStacked: { flexDirection: "column", alignItems: "flex-start", gap: 14 },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
    backIconBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: "rgba(255,255,255,0.15)",
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "flex-start",
        marginTop: 2,
    },
    headerTitle: { fontSize: 18, fontWeight: "700", color: "#ffffff", letterSpacing: 0.2, marginBottom: 2 },
    title: { fontSize: 26, fontWeight: "700", color: "#ffffff", letterSpacing: -0.3 },
    // breadcrumb: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
    // breadcrumbText: { fontSize: 13, color: COLORS.textMuted },
    // breadcrumbCurrent: { color: COLORS.text, fontWeight: "600" },

    backBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: COLORS.accent,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        shadowColor: COLORS.accent,
        shadowOpacity: 0.35,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
        alignSelf: "flex-start",
    },
    backBtnFullWidth: { alignSelf: "stretch", justifyContent: "center", marginTop: 4 },
    backBtnText: { color: "#ffffff", fontWeight: "600", fontSize: 14 },

    summary: { display: "none" as any }, // unused — kept to avoid ref errors
    summaryStacked: {},
    summaryLeft: { flexDirection: "row", alignItems: "center", gap: 16 },
    summaryIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: "rgba(255,255,255,0.15)",
        alignItems: "center",
        justifyContent: "center",
    },
    summaryEyebrow: { color: "rgba(255,255,255,0.65)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 },
    summaryId: { color: "#ffffff", fontSize: 20, fontWeight: "700", marginTop: 2, marginBottom: 4 },
    summaryDateRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    summaryDate: { color: "rgba(255,255,255,0.75)", fontSize: 13 },
    summaryRight: { flexDirection: "row", alignItems: "center", gap: 28, flexWrap: "wrap" },
    summaryRightStacked: { flexDirection: "column", alignItems: "flex-start", gap: 14, width: "100%" },
    summaryStatRow: { flexDirection: "row", alignItems: "center", gap: 100 },
    summaryStat: { gap: 5 },
    summaryStatLabel: { color: "rgba(255,255,255,0.65)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 },
    summaryStatValue: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
    summaryAmount: { color: "#ffd9ad", fontSize: 20, fontWeight: "800" },

    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 20,
        marginBottom: 20,
    },

    card: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: "hidden",
        shadowColor: COLORS.navy,
        shadowOpacity: 0.06,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 16,
        paddingHorizontal: 24,
    },
    cardHeaderText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
    cardBody: { padding: 24 },

    kvRow: {
        paddingVertical: 11,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        borderStyle: "dashed" as any,
    },
    kvRowInline: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    kvRowStacked: { flexDirection: "column", gap: 3 },
    kvLabel: { color: COLORS.textMuted, fontSize: 14, fontWeight: "500", width: 150 },
    kvLabelMobile: { width: "auto", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
    kvValue: { color: COLORS.text, fontSize: 14, fontWeight: "600", flexShrink: 1, flex: 1 },
    kvEmphasis: { color: COLORS.accent, fontSize: 16, fontWeight: "800" },
    link: { color: COLORS.navy, textDecorationLine: "underline" },

    twoCol: { flexDirection: "row", gap: 40 },
    twoColStacked: { flexDirection: "column", gap: 0 },
    twoColItem: { flex: 1 },

    badge: { alignSelf: "flex-start", paddingVertical: 4, paddingHorizontal: 12, borderRadius: 999 },
    badgeText: { fontSize: 12, fontWeight: "700" },

    pill: { alignSelf: "flex-start", backgroundColor: "#e6f0ff", paddingVertical: 3, paddingHorizontal: 10, borderRadius: 8 },
    pillText: { color: "#2458c7", fontSize: 12, fontWeight: "700" },
});