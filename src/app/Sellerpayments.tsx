import AdminLayout from "@/components/admin-layout";
import { getApiErrorMessage } from "@/lib/api/client";
import { mapPayoutToPaymentRow } from "@/lib/mappers";
import { fetchPayoutStats, fetchPayouts, markPayoutPaid } from "@/services/payoutApi";
import { Feather } from "@expo/vector-icons";
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
    TextInput,
    TouchableOpacity,
    View
} from "react-native";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type PaymentStatus = "Pending" | "Paid";
type ReminderBucket = "green" | "orange" | "red";

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
}

// ─── THEME (2 colors only) ────────────────────────────────────────────────────
const PRIMARY = "#ef7b1a";
const DARK = "#79411c";
const PRIMARY_LIGHT = "#fef3e9";
const DARK_LIGHT = "#f5ede7";
const BG_PAGE = "#faf7f5";
const BG_CARD = "#FFFFFF";
const TEXT_HEAD = "#1a0f08";
const TEXT_BODY = "#504f56";
const TEXT_MUTED = "#9b8b7e";
const BORDER = "#ede5de";

// Status helpers using only our two colors
const getReminderStyle = (bucket: ReminderBucket) => {
    if (bucket === "green") return { bg: "#e8f7ee", color: "#1a7a45", dot: "#22c55e" };
    if (bucket === "orange") return { bg: PRIMARY_LIGHT, color: PRIMARY, dot: PRIMARY };
    return { bg: "#fce8e8", color: "#b91c1c", dot: "#ef4444" };
};

const getPaymentStyle = (status: PaymentStatus) =>
    status === "Paid"
        ? { bg: "#e8f7ee", color: "#1a7a45" }
        : { bg: PRIMARY_LIGHT, color: PRIMARY };

// ─── ORDER CARD ───────────────────────────────────────────────────────────────
const OrderCard: React.FC<{
    order: SellerOrder;
    onPay: (id: number) => void;
    onView: (id: number) => void;
    onInvoice: (id: number) => void;
}> = ({ order, onPay, onView, onInvoice }) => {
    const payStyle = getPaymentStyle(order.paymentStatus);
    const remStyle = getReminderStyle(order.reminderBucket);
    const initials = order.sellerName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

    return (
        <View style={styles.card}>
            {/* Left accent bar */}
            <View style={[styles.cardAccent, { backgroundColor: remStyle.dot }]} />

            <View style={styles.cardInner}>
                {/* Top row: avatar + info + amount */}
                <View style={styles.cardTopRow}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                    <View style={styles.cardInfo}>
                        <Text style={styles.sellerName} numberOfLines={1}>{order.sellerName}</Text>
                        <Text style={styles.orderId}>{order.orderId}</Text>
                        <Text style={styles.orderDate}>{order.orderDate}</Text>
                    </View>
                    <View style={styles.cardAmountBlock}>
                        <Text style={styles.amount}>{order.customerPaid}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: payStyle.bg }]}>
                            <Text style={[styles.statusText, { color: payStyle.color }]}>{order.paymentStatus}</Text>
                        </View>
                    </View>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Meta row */}
                <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                        <Feather name="truck" size={12} color={TEXT_MUTED} />
                        <Text style={styles.metaText}>{order.deliveryDate}</Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Feather name="bell" size={12} color={remStyle.dot} />
                        <Text style={[styles.metaText, { color: remStyle.color }]}>{order.reminderLabel}</Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Feather name="credit-card" size={12} color={TEXT_MUTED} />
                        <Text style={styles.metaText}>{order.walletBalance}</Text>
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.actionsRow}>
                    {order.paymentStatus === "Pending" && (
                        <TouchableOpacity style={styles.btnPrimary} onPress={() => onPay(order.id)}>
                            <Feather name="dollar-sign" size={12} color="#fff" />
                            <Text style={styles.btnPrimaryText}>Pay Now</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.btnOutline} onPress={() => onInvoice(order.id)}>
                        <Feather name="file-text" size={12} color={PRIMARY} />
                        <Text style={styles.btnOutlineText}>Invoice</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnOutline} onPress={() => onView(order.id)}>
                        <Feather name="eye" size={12} color={DARK} />
                        <Text style={[styles.btnOutlineText, { color: DARK }]}>View</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

// ─── PAY MODAL ────────────────────────────────────────────────────────────────
const PAYMENTS_PAGE_SIZE = 20;

const PayModal: React.FC<{
    visible: boolean;
    order: SellerOrder | null;
    onClose: () => void;
    onConfirm: (id: number, transactionRef: string, adminNote: string) => void;
    isWeb: boolean;
}> = ({ visible, order, onClose, onConfirm, isWeb }) => {
    const [transactionRef, setTransactionRef] = useState("");
    const [adminNote, setAdminNote] = useState("");

    useEffect(() => {
        if (visible) {
            setTransactionRef("");
            setAdminNote("");
        }
    }, [visible, order?.id]);

    if (!visible || !order) return null;
    return (
        <Modal visible={visible} transparent animationType={isWeb ? "fade" : "slide"} onRequestClose={onClose}>
            <View style={isWeb ? styles.overlayWeb : styles.overlayMobile}>
                <View style={[styles.modal, isWeb && styles.modalWeb]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Confirm Payment</Text>
                        <TouchableOpacity onPress={onClose}><Feather name="x" size={18} color="#fff" /></TouchableOpacity>
                    </View>
                    <ScrollView style={{ padding: 20 }}>
                        <View style={styles.summaryBox}>
                            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Order ID</Text><Text style={styles.summaryValue}>{order.orderId}</Text></View>
                            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Seller</Text><Text style={styles.summaryValue}>{order.sellerName}</Text></View>
                            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Amount</Text><Text style={[styles.summaryValue, { color: PRIMARY, fontSize: 18, fontWeight: "800" }]}>{order.customerPaid}</Text></View>
                            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Wallet</Text><Text style={styles.summaryValue}>{order.walletBalance}</Text></View>
                        </View>
                        <Text style={styles.inputLabel}>Transaction Reference</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter UTR / Ref number"
                            placeholderTextColor={TEXT_MUTED}
                            value={transactionRef}
                            onChangeText={setTransactionRef}
                        />
                        <Text style={styles.inputLabel}>Remarks</Text>
                        <TextInput
                            style={[styles.input, { height: 80, textAlignVertical: "top", paddingTop: 12 }]}
                            placeholder="Optional remarks..."
                            placeholderTextColor={TEXT_MUTED}
                            multiline
                            value={adminNote}
                            onChangeText={setAdminNote}
                        />
                    </ScrollView>
                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.confirmBtn} onPress={() => onConfirm(order.id, transactionRef.trim(), adminNote.trim())}>
                            <Feather name="check" size={14} color="#fff" />
                            <Text style={styles.confirmBtnText}>Confirm Payment</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
const SellerPaymentsScreen: React.FC = () => {
    const isWeb = Platform.OS === "web";
    const [orders, setOrders] = useState<SellerOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState({ total: 0, pending: 0, paid: 0, totalPaidAmount: 0 });
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [search, setSearch] = useState("");
    const [filterPayment, setFilterPayment] = useState<"All" | "Pending" | "Paid" | "Cancelled">("All");
    const [filterReminderBucket, setFilterReminderBucket] = useState<"All" | "green" | "orange" | "red">("All");
    const [sortPriority, setSortPriority] = useState<"Priority (Red first)" | "Date: Newest First" | "Date: Oldest First">("Priority (Red first)");
    const [openDropdown, setOpenDropdown] = useState<"payment" | "reminder" | "priority" | null>(null);
    const [payModalOrder, setPayModalOrder] = useState<SellerOrder | null>(null);

    const apiStatus =
        filterPayment === "Pending" ? "pending" :
        filterPayment === "Paid" ? "paid" :
        filterPayment === "Cancelled" ? "cancelled" :
        undefined;

    const loadPayments = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [page, apiStats] = await Promise.all([
                fetchPayouts(apiStatus, currentPage - 1, PAYMENTS_PAGE_SIZE),
                fetchPayoutStats(),
            ]);
            setOrders((page.items ?? []).map(mapPayoutToPaymentRow));
            setTotalElements(page.totalElements);
            setTotalPages(page.totalPages);
            if (currentPage > page.totalPages && page.totalPages > 0) {
                setCurrentPage(page.totalPages);
            }
            setStats({
                total: Number(apiStats.total ?? 0),
                pending: Number(apiStats.pending ?? 0),
                paid: Number(apiStats.paid ?? 0),
                totalPaidAmount: Number(apiStats.totalPaidAmount ?? 0),
            });
        } catch (e) {
            setError(getApiErrorMessage(e, "Failed to load seller payments."));
        } finally {
            setLoading(false);
        }
    }, [apiStatus, currentPage]);

    useEffect(() => {
        loadPayments();
    }, [loadPayments]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filterPayment]);

    const filtered = orders.filter((o) => {
        const ms = o.orderId.toLowerCase().includes(search.toLowerCase()) || o.sellerName.toLowerCase().includes(search.toLowerCase());
        const mp = filterPayment === "All" || o.paymentStatus === filterPayment;
        const mr = filterReminderBucket === "All" || o.reminderBucket === filterReminderBucket;
        return ms && mp && mr;
    }).sort((a, b) => {
        if (sortPriority === "Date: Newest First") {
            return new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
        }
        if (sortPriority === "Date: Oldest First") {
            return new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime();
        }
        // Priority (Red first): Red(3) > Orange(2) > Green(1). Pending(1) > Paid(0)
        const bucketScoreA = a.reminderBucket === "red" ? 3 : a.reminderBucket === "orange" ? 2 : 1;
        const bucketScoreB = b.reminderBucket === "red" ? 3 : b.reminderBucket === "orange" ? 2 : 1;
        const statusScoreA = a.paymentStatus === "Pending" ? 1 : 0;
        const statusScoreB = b.paymentStatus === "Pending" ? 1 : 0;
        const scoreA = bucketScoreA * 10 + statusScoreA;
        const scoreB = bucketScoreB * 10 + statusScoreB;
        return scoreB - scoreA;
    });

    const handleConfirmPay = async (id: number, transactionRef: string, adminNote: string) => {
        try {
            await markPayoutPaid(id, transactionRef || undefined, adminNote || undefined);
            setPayModalOrder(null);
            const msg = "Payment marked as paid!";
            if (Platform.OS === "web") window.alert(msg);
            else Alert.alert("Success", msg);
            await loadPayments();
        } catch (e) {
            const msg = getApiErrorMessage(e);
            if (Platform.OS === "web") window.alert(msg);
            else Alert.alert("Error", msg);
        }
    };

    const handleView = (id: number) => {
        const o = orders.find(x => x.id === id);
        const msg = `Order: ${o?.orderId}\nSeller: ${o?.sellerName}\nAmount: ${o?.customerPaid}`;
        if (Platform.OS === "web") window.alert(msg);
        else Alert.alert("Order Details", msg);
    };

    const handleInvoice = (id: number) => {
        if (Platform.OS === "web") window.alert("Invoice generated!");
        else Alert.alert("Invoice", "Invoice generated!");
    };

    const MainContent = (
        <View style={[styles.main, isWeb && styles.mainWeb]}>
            {/* Header */}
            <View style={[styles.header, isWeb && styles.headerWeb]}>
                <View style={styles.headerLeft}>
                    <View style={styles.headerIcon}>
                        <Feather name="credit-card" size={22} color="#fff" />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>Seller Payments</Text>
                        <Text style={styles.headerSubtitle}>Dashboard › Seller Payments</Text>
                    </View>
                </View>
            </View>

            {/* Stats Card — outside ScrollView so it can overlap the header */}
            <View style={[styles.statsCardSingle, !isWeb && { flexDirection: "column", gap: 16 }, isWeb && { justifyContent: "space-between" }]}>
                <View style={{ flexDirection: isWeb ? "row" : "column", gap: isWeb ? 24 : 16, alignItems: isWeb ? "center" : "stretch", flex: isWeb ? 1 : undefined }}>
                    {[
                        { icon: "list", label: "All Payouts", value: String(stats.total), color: "#a78bfa" },
                        { icon: "clock", label: "Pending", value: String(stats.pending), color: "#f472b6" },
                        { icon: "check-circle", label: "Paid", value: String(stats.paid), color: "#7dd3fc" },
                        { icon: "dollar-sign", label: "Total Paid", value: `₹${stats.totalPaidAmount.toLocaleString("en-IN")}`, color: "#6ee7b7" },
                    ].map((s, i) => (
                        <React.Fragment key={i}>
                            <View style={[styles.statBlockSingle]}>
                                <View style={[styles.statIconWrapperSingle, { backgroundColor: s.color }]}>
                                    <Feather name={s.icon as any} size={20} color="#ffffff" />
                                </View>
                                <View style={styles.statTextWrapperSingle}>
                                    <Text style={styles.statValueSingle}>{s.value}</Text>
                                    <Text style={styles.statLabelSingle}>{s.label}</Text>
                                </View>
                            </View>
                            {i < 3 && <View style={[styles.statDividerSingle, !isWeb && { width: "100%", height: 1, marginVertical: 0 }]} />}
                        </React.Fragment>
                    ))}
                </View>

                {/* Legend Section Inside Card */}
                <View style={{ flexDirection: isWeb ? 'row' : 'column', alignItems: isWeb ? 'center' : 'stretch', gap: isWeb ? 24 : 12, flexShrink: 0, paddingLeft: isWeb ? 12 : 0, marginTop: isWeb ? 0 : 16 }}>
                    {isWeb && <View style={styles.statDividerSingle} />}
                    <View style={{ gap: 6, justifyContent: 'center', width: isWeb ? 300 : '100%' }}>
                        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                            <View style={[styles.legendBadge, { backgroundColor: "#34d399", flex: 1, minWidth: 90 }]}>
                                <Text style={[styles.legendText, { textAlign: 'center' }]}>Green (0-2d): 0</Text>
                            </View>
                            <View style={[styles.legendBadge, { backgroundColor: "#fbbf24", flex: 1, minWidth: 90 }]}>
                                <Text style={[styles.legendText, { textAlign: 'center' }]}>Orange (3-4d): 0</Text>
                            </View>
                            <View style={[styles.legendBadge, { backgroundColor: "#f87171", flex: 1, minWidth: 90 }]}>
                                <Text style={[styles.legendText, { textAlign: 'center' }]}>Red (5+d): 0</Text>
                            </View>
                        </View>
                        <View style={[styles.legendBadge, { backgroundColor: "#475569" }]}>
                            <Text style={[styles.legendText, { textAlign: 'center' }]}>Red and pending are prioritized on top; paid rows are moved down</Text>
                        </View>
                    </View>
                </View>
            </View>

            <ScrollView style={styles.scrollArea} contentContainerStyle={[styles.scrollContent, !isWeb && { paddingBottom: 250 }]} showsVerticalScrollIndicator={false}>

                {loading && (
                    <ActivityIndicator size="large" color={PRIMARY} style={{ marginVertical: 24 }} />
                )}
                {error ? (
                    <View style={{ marginBottom: 12, gap: 8 }}>
                        <Text style={{ color: "#DC2626", fontSize: 13 }}>{error}</Text>
                        <TouchableOpacity style={styles.exportBtn} onPress={loadPayments}>
                            <Text style={styles.exportBtnText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                {/* Search + Filter */}
                <View style={[styles.webFilterSection, { zIndex: 999, elevation: 999 }]}>
                    {/* Filter Bar */}
                    <View style={[styles.webFilterBar, { zIndex: 999, elevation: 999, flexWrap: "wrap" }]}>
                        <View style={[styles.webSearchInputWrapper, !isWeb && { minWidth: "100%" }]}>
                            <Feather name="search" size={14} color="#f97316" />
                            <TextInput 
                                style={styles.webSearchInput} 
                                placeholder="Search orders, sellers..." 
                                placeholderTextColor={TEXT_MUTED}
                                value={search}
                                onChangeText={setSearch}
                            />
                            {search.length > 0 && !isWeb && <TouchableOpacity onPress={() => setSearch("")}><Feather name="x-circle" size={15} color={TEXT_MUTED} /></TouchableOpacity>}
                        </View>
                            
                            <View style={{ position: 'relative', zIndex: 1000, elevation: 1000 }}>
                                <TouchableOpacity 
                                    style={styles.webSelectBox}
                                    onPress={() => setOpenDropdown(openDropdown === "payment" ? null : "payment")}
                                >
                                    <Text style={styles.webSelectText}>
                                        {filterPayment === "All" ? "All Payments" : filterPayment}
                                    </Text>
                                    <Feather name="chevron-down" size={14} color={TEXT_MUTED} />
                                </TouchableOpacity>

                                {openDropdown === "payment" && (
                                    <View style={[styles.webDropdownMenu, !isWeb && { position: "relative", top: 0, left: 0, marginTop: 4, elevation: 0, shadowOpacity: 0 }]}>
                                        {(["All", "Pending", "Paid", "Cancelled"] as const).map(option => (
                                            <TouchableOpacity 
                                                key={option} 
                                                style={[
                                                    styles.webDropdownItem, 
                                                    filterPayment === option && { backgroundColor: "#1d4ed8" }
                                                ]}
                                                onPress={() => {
                                                    setFilterPayment(option);
                                                    setOpenDropdown(null);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.webDropdownItemText,
                                                    filterPayment === option && { color: "#fff" }
                                                ]}>
                                                    {option === "All" ? "All Payments" : option}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>

                            <View style={{ position: 'relative', zIndex: 999, elevation: 999 }}>
                                <TouchableOpacity 
                                    style={styles.webSelectBox}
                                    onPress={() => setOpenDropdown(openDropdown === "reminder" ? null : "reminder")}
                                >
                                    <Text style={styles.webSelectText}>
                                        {filterReminderBucket === "All" ? "All Reminder Buckets" : filterReminderBucket === "green" ? "Green (0-2 days)" : filterReminderBucket === "orange" ? "Orange (3-4 days)" : "Red (5+ days)"}
                                    </Text>
                                    <Feather name="chevron-down" size={14} color={TEXT_MUTED} />
                                </TouchableOpacity>

                                {openDropdown === "reminder" && (
                                    <View style={[styles.webDropdownMenu, { width: 180 }, !isWeb && { position: "relative", top: 0, left: 0, marginTop: 4, elevation: 0, shadowOpacity: 0 }]}>
                                        {[
                                            { label: "All Reminder Buckets", value: "All" },
                                            { label: "Green (0-2 days)", value: "green" },
                                            { label: "Orange (3-4 days)", value: "orange" },
                                            { label: "Red (5+ days)", value: "red" }
                                        ].map(option => (
                                            <TouchableOpacity 
                                                key={option.value} 
                                                style={[
                                                    styles.webDropdownItem, 
                                                    filterReminderBucket === option.value && { backgroundColor: "#1d4ed8" }
                                                ]}
                                                onPress={() => {
                                                    setFilterReminderBucket(option.value as any);
                                                    setOpenDropdown(null);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.webDropdownItemText,
                                                    filterReminderBucket === option.value && { color: "#fff" }
                                                ]}>
                                                    {option.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>

                            <View style={{ position: 'relative', zIndex: 998, elevation: 998 }}>
                                <TouchableOpacity 
                                    style={styles.webSelectBox}
                                    onPress={() => setOpenDropdown(openDropdown === "priority" ? null : "priority")}
                                >
                                    <Text style={styles.webSelectText}>{sortPriority}</Text>
                                    <Feather name="chevron-down" size={14} color={TEXT_MUTED} />
                                </TouchableOpacity>

                                {openDropdown === "priority" && (
                                    <View style={[styles.webDropdownMenu, { width: 170 }, !isWeb && { position: "relative", top: 0, left: 0, marginTop: 4, elevation: 0, shadowOpacity: 0 }]}>
                                        {[
                                            "Priority (Red first)",
                                            "Date: Newest First",
                                            "Date: Oldest First"
                                        ].map(option => (
                                            <TouchableOpacity 
                                                key={option} 
                                                style={[
                                                    styles.webDropdownItem, 
                                                    sortPriority === option && { backgroundColor: "#1d4ed8" }
                                                ]}
                                                onPress={() => {
                                                    setSortPriority(option as any);
                                                    setOpenDropdown(null);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.webDropdownItemText,
                                                    sortPriority === option && { color: "#fff" }
                                                ]}>
                                                    {option}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>

                            <TouchableOpacity style={[styles.webExportBtn, { backgroundColor: "#1e293b", flex: !isWeb ? 1 : undefined, justifyContent: "center" }]}>
                                <Feather name="download" size={14} color="#fff" />
                                <Text style={styles.webExportBtnText}>Export All</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.webExportBtn, { backgroundColor: "#ef4444", flex: !isWeb ? 1 : undefined, justifyContent: "center" }]}>
                                <Feather name="clock" size={14} color="#fff" />
                                <Text style={styles.webExportBtnText}>Export {">="} 4d</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                <Text style={styles.resultCount}>Showing <Text style={{ color: PRIMARY, fontWeight: "700" }}>{filtered.length}</Text> of {orders.length} orders</Text>

                {/* Cards */}
                {filtered.length === 0 ? (
                    <View style={styles.empty}>
                        <Feather name="inbox" size={44} color={TEXT_MUTED} />
                        <Text style={styles.emptyTitle}>No orders found</Text>
                    </View>
                ) : isWeb ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ width: "100%" }}>
                        <View style={styles.tableContainer}>
                            <View style={styles.tableHeaderRow}>
                                <Text style={[styles.tableHeaderCell, { width: 140 }]}>Order</Text>
                                <Text style={[styles.tableHeaderCell, { width: 220 }]}>Seller</Text>
                                <Text style={[styles.tableHeaderCell, { width: 140 }]}>Customer paid{"\n"}<Text style={{fontSize: 9, textTransform: "none"}}>(order+total_amount)</Text></Text>
                                <Text style={[styles.tableHeaderCell, { width: 130 }]}>Delivery Date</Text>
                                <Text style={[styles.tableHeaderCell, { width: 110 }]}>Reminder</Text>
                                <Text style={[styles.tableHeaderCell, { width: 120 }]}>Payment Status</Text>
                                <Text style={[styles.tableHeaderCell, { width: 100 }]}>Wallet Balance</Text>
                                <Text style={[styles.tableHeaderCell, { width: 340 }]}>Actions</Text>
                            </View>
                            {filtered.map(order => {
                                const isPending = order.paymentStatus === "Pending";
                                const payStyle = isPending ? { bg: "#fef3c7", color: "#d97706" } : { bg: "#d1fae5", color: "#059669" };
                                
                                let remBg = "#10b981";
                                if(order.reminderBucket === "orange") remBg = "#f59e0b";
                                if(order.reminderBucket === "red") remBg = "#ef4444";

                                return (
                                    <View key={order.id} style={styles.tableRow}>
                                        <View style={{ width: 140, justifyContent: "center" }}>
                                            <Text style={[styles.tableCell, { fontWeight: "700", color: PRIMARY, fontSize: 13 }]}>{order.orderId}</Text>
                                            <Text style={[styles.tableCell, { color: TEXT_MUTED, fontSize: 11, marginTop: 2, marginBottom: 4 }]}>{order.orderDate}</Text>
                                            <View style={{ backgroundColor: "#2dd4bf", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: "flex-start" }}>
                                                <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>{order.orderStatus}</Text>
                                            </View>
                                        </View>
                                        <View style={{ width: 220, justifyContent: "center" }}>
                                            <Text style={[styles.tableCell, { fontWeight: "700", color: TEXT_HEAD, fontSize: 13 }]} numberOfLines={1}>{order.sellerName}</Text>
                                            <Text style={[styles.tableCell, { color: TEXT_MUTED, fontSize: 11, marginTop: 2 }]}>{order.sellerEmail}</Text>
                                            <Text style={[styles.tableCell, { color: TEXT_MUTED, fontSize: 11 }]}>{order.sellerPhone}</Text>
                                        </View>
                                        <View style={{ width: 140, justifyContent: "center" }}>
                                            <Text style={[styles.tableCell, { fontWeight: "700", color: DARK, fontSize: 14 }]}>{order.customerPaid}</Text>
                                        </View>
                                        <View style={{ width: 130, justifyContent: "center" }}>
                                            <Text style={[styles.tableCell, { color: TEXT_HEAD, fontSize: 13 }]}>{order.deliveryDate}</Text>
                                            <Text style={[styles.tableCell, { color: TEXT_MUTED, fontSize: 11, marginTop: 2 }]}>{order.deliveryTime}</Text>
                                        </View>
                                        <View style={{ width: 110, justifyContent: "center" }}>
                                            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: remBg, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 4, alignSelf: "flex-start", gap: 4 }}>
                                                <Feather name="clock" size={10} color="#fff" />
                                                <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{order.reminderLabel}</Text>
                                            </View>
                                        </View>
                                        <View style={{ width: 120, justifyContent: "center" }}>
                                            <View style={[styles.statusBadge, { backgroundColor: payStyle.bg, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 4 }]}>
                                                <Feather name="clock" size={10} color={payStyle.color} />
                                                <Text style={[styles.statusText, { color: payStyle.color }]}>{order.paymentStatus}</Text>
                                            </View>
                                        </View>
                                        <View style={{ width: 100, justifyContent: "center" }}>
                                            <Text style={[styles.tableCell, { fontWeight: "700", color: TEXT_HEAD, fontSize: 13 }]}>{order.walletBalance}</Text>
                                        </View>
                                        <View style={{ width: 340, flexDirection: "row", alignItems: "center", gap: 6 }}>
                                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#10b981" }]} onPress={() => { const o = orders.find(x => x.id === order.id); if (o) setPayModalOrder(o); }}>
                                                <Feather name="dollar-sign" size={12} color="#fff" />
                                                <Text style={styles.actionBtnText}>Pay</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#f59e0b" }]} onPress={() => handleInvoice(order.id)}>
                                                <Feather name="file-text" size={12} color="#fff" />
                                                <Text style={styles.actionBtnText}>Invoice</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#3b82f6" }]}>
                                                <Feather name="printer" size={12} color="#fff" />
                                                <Text style={styles.actionBtnText}>Print</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#64748b" }]}>
                                                <Feather name="refresh-cw" size={12} color="#fff" />
                                                <Text style={styles.actionBtnText}>Regen</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#14b8a6" }]} onPress={() => handleView(order.id)}>
                                                <Feather name="eye" size={12} color="#fff" />
                                                <Text style={styles.actionBtnText}>View</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </ScrollView>
                ) : (
                    <View style={styles.cardsList}>
                        {filtered.map(order => (
                            <View key={order.id} style={styles.cardWrap}>
                                <OrderCard order={order} onPay={id => { const o = orders.find(x => x.id === id); if (o) setPayModalOrder(o); }} onView={handleView} onInvoice={handleInvoice} />
                            </View>
                        ))}
                    </View>
                )}

                {!loading && !error && totalPages > 1 && (
                    <View style={styles.paginationBar}>
                        <Text style={styles.paginationInfo}>
                            Showing {(currentPage - 1) * PAYMENTS_PAGE_SIZE + 1} to{" "}
                            {Math.min(currentPage * PAYMENTS_PAGE_SIZE, totalElements)} of {totalElements}
                        </Text>
                        <View style={styles.paginationControls}>
                            <TouchableOpacity
                                style={[styles.pageBtn, currentPage <= 1 && styles.pageBtnDisabled]}
                                disabled={currentPage <= 1}
                                onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            >
                                <Feather name="chevron-left" size={14} color={TEXT_BODY} />
                            </TouchableOpacity>
                            <Text style={styles.pageNumText}>{currentPage} / {totalPages}</Text>
                            <TouchableOpacity
                                style={[styles.pageBtn, currentPage >= totalPages && styles.pageBtnDisabled]}
                                disabled={currentPage >= totalPages}
                                onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            >
                                <Feather name="chevron-right" size={14} color={TEXT_BODY} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );

  return (
    <AdminLayout>
      <View style={styles.webLayout}>
        <StatusBar barStyle="light-content" backgroundColor="#151D4F" />
        <View style={styles.webColumn}>
          {MainContent}
        </View>
        <PayModal visible={!!payModalOrder} order={payModalOrder} onClose={() => setPayModalOrder(null)} onConfirm={handleConfirmPay} isWeb={isWeb} />
      </View>
    </AdminLayout>
  );
};

export default SellerPaymentsScreen;

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: BG_PAGE, paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 },
    webLayout: { flex: 1, backgroundColor: BG_PAGE, height: "100vh" as any },
    webColumn: { flex: 1 },

    main: { flex: 1, backgroundColor: BG_PAGE },
    mainWeb: { backgroundColor: BG_CARD, margin: 16, borderRadius: 20, overflow: "hidden", shadowColor: DARK, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 5 },

    // Header
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#151D4F", paddingHorizontal: 32, paddingVertical: 28, paddingBottom: 68, borderRadius: 22, marginHorizontal: 24, marginTop: 24, marginBottom: 0, zIndex: 1, shadowColor: "#151D4F", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 10 },
    headerWeb: {  },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
    headerIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center", shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
    headerTitle: { fontSize: 20, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5 },
    headerSubtitle: { fontSize: 12, color: "#D1D5DB", marginTop: 2 },
    exportBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: PRIMARY, backgroundColor: PRIMARY_LIGHT },
    exportBtnText: { fontSize: 12, fontWeight: "700", color: PRIMARY },

    // Scroll
    scrollArea: { flex: 1 },
    scrollContent: { padding: 16, gap: 14 },

    // Stats Single Card
    statsCardSingle: { flexDirection: "row", backgroundColor: BG_CARD, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20, borderWidth: 1, borderColor: BORDER, shadowColor: DARK, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginBottom: 16, marginTop: -52, marginHorizontal: 32, zIndex: 10 },
    statBlockSingle: { flexDirection: "row", alignItems: "center", gap: 12 },
    statIconWrapperSingle: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    statTextWrapperSingle: { },
    statValueSingle: { fontSize: 20, fontWeight: "800", color: TEXT_HEAD, marginBottom: 2 },
    statLabelSingle: { fontSize: 12, fontWeight: "600", color: TEXT_MUTED, whiteSpace: "nowrap" } as any,
    statDividerSingle: { width: 1, backgroundColor: BORDER, height: 44 },

    // Search
    searchRow: { marginBottom: 4 },
    searchBox: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: BG_CARD, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: BORDER },
    searchInput: { flex: 1, fontSize: 13, color: TEXT_HEAD },

    // Filter Mobile
    filterRow: { gap: 8, paddingVertical: 2 },
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: BG_CARD, borderWidth: 1, borderColor: BORDER },
    filterChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
    filterChipText: { fontSize: 12, fontWeight: "600", color: TEXT_MUTED },
    filterChipTextActive: { color: "#fff" },

    // Web Filter Bar Section
    webFilterSection: { marginBottom: 16 },
    legendRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
    legendBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4 },
    legendText: { color: "#fff", fontSize: 11, fontWeight: "700" },
    webFilterBar: { backgroundColor: "#fff", borderRadius: 12, padding: 14, flexDirection: "row", gap: 12, alignItems: "center", shadowColor: DARK, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: BORDER },
    webSearchInputWrapper: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#fed7aa", borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#fff" },
    webSearchInput: { flex: 1, fontSize: 13, color: TEXT_HEAD, outlineStyle: "none" } as any,
    webSelectBox: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: BORDER, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#fff" },
    webSelectText: { fontSize: 12, color: TEXT_MUTED },
    webExportBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
    webExportBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
    webDropdownMenu: { position: "absolute", top: "100%", left: 0, marginTop: 4, width: 140, backgroundColor: "#fff", borderWidth: 1, borderColor: BORDER, borderRadius: 4, shadowColor: DARK, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, zIndex: 100 },
    webDropdownItem: { paddingVertical: 10, paddingHorizontal: 14 },
    webDropdownItemText: { fontSize: 13, color: TEXT_HEAD },

    resultCount: { fontSize: 12, color: TEXT_MUTED, fontWeight: "500" },

    // Cards list
    cardsList: { gap: 12 },
    cardsListWeb: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
    cardWrap: { width: "100%" },
    cardWrapWeb: { flexBasis: "48%", minWidth: 320 },

    // Card
    card: { backgroundColor: BG_CARD, borderRadius: 16, flexDirection: "row", overflow: "hidden", borderWidth: 1, borderColor: BORDER, shadowColor: DARK, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
    cardAccent: { width: 5 },
    cardInner: { flex: 1, padding: 14 },
    cardTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
    avatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: DARK, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    avatarText: { color: "#fff", fontSize: 15, fontWeight: "800" },
    cardInfo: { flex: 1 },
    sellerName: { fontSize: 14, fontWeight: "700", color: TEXT_HEAD, marginBottom: 2 },
    orderId: { fontSize: 11, color: PRIMARY, fontWeight: "600", marginBottom: 1 },
    orderDate: { fontSize: 11, color: TEXT_MUTED },
    cardAmountBlock: { alignItems: "flex-end", gap: 6 },
    amount: { fontSize: 16, fontWeight: "800", color: DARK },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    statusText: { fontSize: 10, fontWeight: "700" },

    divider: { height: 1, backgroundColor: BORDER, marginBottom: 10 },

    metaRow: { flexDirection: "row", gap: 14, marginBottom: 12, flexWrap: "wrap" },
    metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
    metaText: { fontSize: 11, color: TEXT_MUTED, fontWeight: "500" },

    actionsRow: { flexDirection: "row", gap: 8 },
    btnPrimary: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: PRIMARY, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
    btnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 12 },
    btnOutline: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1.5, borderColor: BORDER, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: BG_PAGE },
    btnOutlineText: { color: PRIMARY, fontWeight: "700", fontSize: 12 },

    // Empty
    empty: { alignItems: "center", paddingVertical: 50, gap: 10 },
    emptyTitle: { fontSize: 16, fontWeight: "700", color: TEXT_BODY },

    // Modal
    overlayWeb: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
    overlayMobile: { flex: 1, backgroundColor: "transparent", justifyContent: "flex-end" },
    modal: { backgroundColor: BG_CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden", maxHeight: "90%" },
    modalWeb: { width: "90%", maxWidth: 500, borderRadius: 20 },
    modalHeader: { backgroundColor: PRIMARY, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22, paddingVertical: 18 },
    modalTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
    summaryBox: { backgroundColor: BG_PAGE, borderRadius: 12, padding: 16, marginBottom: 16, gap: 10, borderWidth: 1, borderColor: BORDER },
    summaryRow: { flexDirection: "row", justifyContent: "space-between" },
    summaryLabel: { fontSize: 12, color: TEXT_MUTED, fontWeight: "600" },
    summaryValue: { fontSize: 13, color: TEXT_HEAD, fontWeight: "700" },
    inputLabel: { fontSize: 12, fontWeight: "700", color: TEXT_BODY, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.3 },
    input: { borderWidth: 1.5, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 13, color: TEXT_HEAD, backgroundColor: BG_PAGE, marginBottom: 14 },
    modalFooter: { flexDirection: "row", justifyContent: "flex-end", gap: 12, padding: 18, borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: BG_PAGE },
    cancelBtn: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, backgroundColor: BG_CARD },
    cancelBtnText: { color: TEXT_MUTED, fontWeight: "700", fontSize: 13 },
    confirmBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: PRIMARY, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 10, shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    confirmBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

    // Table Web
    tableContainer: { minWidth: 1400, backgroundColor: BG_CARD, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: BORDER, marginBottom: 16 },
    tableHeaderRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fdf8f4", paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: BORDER, gap: 16 },
    tableHeaderCell: { fontSize: 11, fontWeight: "800", color: TEXT_HEAD, textTransform: "capitalize" },
    tableRow: { flexDirection: "row", paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#f1f5f9", gap: 16 },
    tableCell: { fontSize: 13, color: TEXT_HEAD },
    tableAvatar: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#fff7ed", alignItems: "center", justifyContent: "center" },
    tableAvatarText: { color: PRIMARY, fontSize: 13, fontWeight: "800" },
    tableActionBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
    actionBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 4 },
    actionBtnText: { color: "#fff", fontSize: 10, fontWeight: "700" },

    paginationBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        marginTop: 8,
        marginBottom: 16,
        padding: 14,
        backgroundColor: BG_CARD,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: BORDER,
    },
    paginationInfo: { fontSize: 13, color: TEXT_MUTED },
    paginationControls: { flexDirection: "row", alignItems: "center", gap: 10 },
    pageBtn: {
        width: 34,
        height: 34,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: BORDER,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: BG_CARD,
    },
    pageBtnDisabled: { opacity: 0.4 },
    pageNumText: { fontSize: 13, fontWeight: "700", color: TEXT_HEAD },
});