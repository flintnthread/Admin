import AdminLayout from "@/components/admin-layout";
import { useAuth } from "@/context/auth-context";
import { getApiErrorMessage } from "@/lib/api/client";
import { mapPayoutToPaymentRow } from "@/lib/mappers";
import { fetchPayoutStats, fetchPayouts, markPayoutPaid } from "@/services/payoutApi";
import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import Pagination from "@/components/Pagination";
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
type PaymentStatus = "Pending" | "Paid" | "Cancelled";
type ReminderBucket = "green" | "orange" | "red";

interface SellerOrder {
    id: number;
    orderId: string;
    orderDate: string;
    orderStatus: "Completed" | "Processing";
    sellerName: string;
    sellerEmail: string;
    sellerPhone: string;
    customerName?: string;
    customerEmail?: string;
    customerPaid: string;
    deliveryDate: string;
    deliveryTime: string;
    reminderLabel: string;
    reminderDays: number;
    reminderBucket: ReminderBucket;
    paymentStatus: PaymentStatus;
    walletBalance: string;
    // Bank details for payment modal
    bankName?: string;
    branchName?: string;
    accountNumber?: string;
    ifscCode?: string;
    accountHolderName?: string;
    // Amount breakdown
    orderAmount?: string;
    gstAmount?: string;
    deliveryCharge?: string;
    deliveryType?: string;
    commissionAmount?: string;
    commissionRate?: string;
    finalPayableAmount?: string;
    sellerRequestNote?: string;
}

// ─── THEME ────────────────────────────────────────────────────────────────────
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

const getReminderStyle = (bucket: ReminderBucket) => {
    if (bucket === "green") return { bg: "#e8f7ee", color: "#1a7a45", dot: "#22c55e" };
    if (bucket === "orange") return { bg: PRIMARY_LIGHT, color: PRIMARY, dot: PRIMARY };
    return { bg: "#fce8e8", color: "#b91c1c", dot: "#ef4444" };
};

const getPaymentStyle = (status: PaymentStatus) => {
    if (status === "Paid") return { bg: "#e8f7ee", color: "#1a7a45" };
    if (status === "Cancelled") return { bg: "#fce8e8", color: "#b91c1c" };
    return { bg: PRIMARY_LIGHT, color: PRIMARY };
};

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
            <View style={[styles.cardAccent, { backgroundColor: remStyle.dot }]} />
            <View style={styles.cardInner}>
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
                <View style={styles.divider} />
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
                <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.btnPrimary} onPress={() => onPay(order.id)}>
                        <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700", marginRight: 2 }}>₹</Text>
                        <Text style={styles.btnPrimaryText}>Pay</Text>
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
const PAYMENTS_PAGE_SIZE = 7;

const PAYMENT_STATUS_OPTIONS: PaymentStatus[] = ["Pending", "Paid", "Cancelled"];

const PayModal: React.FC<{
    visible: boolean;
    order: SellerOrder | null;
    onClose: () => void;
    onConfirm: (id: number, transactionRef: string, adminNote: string, status: PaymentStatus) => void;
    isWeb: boolean;
}> = ({ visible, order, onClose, onConfirm, isWeb }) => {
    const [transactionRef, setTransactionRef] = useState("");
    const [adminNote, setAdminNote] = useState("");
    const [selectedStatus, setSelectedStatus] = useState<PaymentStatus>("Paid");
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

    useEffect(() => {
        if (visible) {
            setTransactionRef("");
            setAdminNote("");
            setSelectedStatus("Paid");
            setStatusDropdownOpen(false);
        }
    }, [visible, order?.id]);

    if (!visible || !order) return null;

    const statusColors: Record<PaymentStatus, { bg: string; color: string; dot: string }> = {
        Paid: { bg: "#e8f7ee", color: "#1a7a45", dot: "#22c55e" },
        Pending: { bg: "#fef3c7", color: "#d97706", dot: "#f59e0b" },
        Cancelled: { bg: "#fce8e8", color: "#b91c1c", dot: "#ef4444" },
    };
    const selStatus = statusColors[selectedStatus];

    // Parse amount breakdown from order
    const orderAmt = order.orderAmount ?? order.customerPaid ?? "₹0.00";
    const gstAmt = order.gstAmount ?? "-₹0.00";
    const deliveryAmt = order.deliveryCharge ?? "-₹0.00";
    const deliveryTypeLabel = order.deliveryType ?? "Intra-City";
    const commissionRate = order.commissionRate ?? "15.00";
    const commissionAmt = order.commissionAmount ?? "-₹0.00";
    const finalAmt = order.finalPayableAmount ?? order.customerPaid ?? "₹0.00";

    return (
        <Modal visible={visible} transparent animationType={isWeb ? "fade" : "slide"} onRequestClose={onClose}>
            <View style={isWeb ? styles.overlayWeb : styles.overlayMobile}>
                <View style={[styles.modal, isWeb && styles.modalWeb]}>
                    {/* Modal Header */}
                    <View style={styles.modalHeader}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                                <Feather name="credit-card" size={16} color="#fff" />
                            </View>
                            <Text style={styles.modalTitle}>Process Payment</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" }}>
                            <Feather name="x" size={16} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
                        {/* Seller Name */}
                        <Text style={styles.sectionLabel}>Seller</Text>
                        <View style={styles.sellerNameBox}>
                            <Text style={{ fontSize: 14, fontWeight: "700", color: TEXT_HEAD }}>{order.sellerName}</Text>
                        </View>

                        {/* Amount Breakdown */}
                        <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Amount Breakdown</Text>
                        <View style={styles.amountBreakdownBox}>
                            <View style={styles.breakdownRow}>
                                <Text style={styles.breakdownLabel}>Customer paid (order lines)</Text>
                                <Text style={styles.breakdownValue}>{orderAmt}</Text>
                            </View>
                            <View style={styles.breakdownRow}>
                                <Text style={[styles.breakdownLabel, { color: "#b91c1c" }]}>Less: GST</Text>
                                <Text style={[styles.breakdownValue, { color: "#b91c1c" }]}>{gstAmt}</Text>
                            </View>
                            <View style={styles.breakdownRow}>
                                <Text style={[styles.breakdownLabel, { color: "#b91c1c" }]}>Less: Delivery ({deliveryTypeLabel})</Text>
                                <Text style={[styles.breakdownValue, { color: "#b91c1c" }]}>{deliveryAmt}</Text>
                            </View>
                            <View style={styles.breakdownRow}>
                                <Text style={[styles.breakdownLabel, { color: "#b91c1c" }]}>Less: Commission ({commissionRate}%)</Text>
                                <Text style={[styles.breakdownValue, { color: "#b91c1c" }]}>{commissionAmt}</Text>
                            </View>
                            <View style={[styles.breakdownRow, styles.finalAmountRow]}>
                                <Text style={styles.finalAmountLabel}>Final Payable Amount</Text>
                                <Text style={styles.finalAmountValue}>{finalAmt}</Text>
                            </View>
                        </View>

                        {/* Seller Bank Details — always shown */}
                        <View style={styles.bankDetailHeader}>
                            <Feather name="shield" size={13} color={PRIMARY} />
                            <Text style={[styles.sectionLabel, { marginTop: 0, marginLeft: 6 }]}>Seller Bank Details</Text>
                        </View>
                        <View style={styles.bankDetailsBox}>
                            <View style={styles.bankRow}>
                                <View style={styles.bankField}>
                                    <Text style={styles.bankFieldLabel}>Bank Name</Text>
                                    <Text style={styles.bankFieldValue}>{order.bankName ?? "—"}</Text>
                                </View>
                                <View style={styles.bankField}>
                                    <Text style={styles.bankFieldLabel}>Branch Name</Text>
                                    <Text style={styles.bankFieldValue}>{order.branchName ?? "—"}</Text>
                                </View>
                            </View>
                            <View style={styles.bankRow}>
                                <View style={styles.bankField}>
                                    <Text style={styles.bankFieldLabel}>Account Number</Text>
                                    <Text style={[styles.bankFieldValue, { fontFamily: "monospace" as any }]}>{order.accountNumber ?? "—"}</Text>
                                </View>
                                <View style={styles.bankField}>
                                    <Text style={styles.bankFieldLabel}>IFSC Code</Text>
                                    <Text style={[styles.bankFieldValue, { fontFamily: "monospace" as any }]}>{order.ifscCode ?? "—"}</Text>
                                </View>
                            </View>
                            <View style={styles.bankField}>
                                <Text style={styles.bankFieldLabel}>Account Holder Name</Text>
                                <Text style={[styles.bankFieldValue, { fontWeight: "800", textTransform: "uppercase" }]}>{order.accountHolderName ?? "—"}</Text>
                            </View>
                        </View>

                        {/* Payment Status Dropdown */}
                        <Text style={[styles.inputLabel, { marginTop: 16 }]}>Payment Status</Text>
                        <View style={{ position: "relative", zIndex: 100, marginBottom: 14 }}>
                            <TouchableOpacity
                                style={[styles.statusDropdownTrigger, { borderColor: selStatus.dot, backgroundColor: selStatus.bg }]}
                                onPress={() => setStatusDropdownOpen(!statusDropdownOpen)}
                            >
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: selStatus.dot }} />
                                    <Text style={{ fontSize: 13, fontWeight: "700", color: selStatus.color }}>{selectedStatus}</Text>
                                </View>
                                <Feather name={statusDropdownOpen ? "chevron-up" : "chevron-down"} size={14} color={selStatus.color} />
                            </TouchableOpacity>
                            {statusDropdownOpen && (
                                <View style={styles.statusDropdownMenu}>
                                    {PAYMENT_STATUS_OPTIONS.map(opt => {
                                        const s = statusColors[opt];
                                        return (
                                            <TouchableOpacity
                                                key={opt}
                                                style={[styles.statusDropdownItem, selectedStatus === opt && { backgroundColor: s.bg }]}
                                                onPress={() => { setSelectedStatus(opt); setStatusDropdownOpen(false); }}
                                            >
                                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.dot }} />
                                                <Text style={[styles.statusDropdownItemText, { color: s.color, fontWeight: selectedStatus === opt ? "700" : "500" }]}>{opt}</Text>
                                                {selectedStatus === opt && <Feather name="check" size={12} color={s.color} style={{ marginLeft: "auto" }} />}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}
                        </View>

                        {/* Seller Request Note */}
                        <Text style={styles.inputLabel}>Seller Request Note</Text>
                        <View style={[styles.input, { height: 56, justifyContent: "center" }]}>
                            <Text style={{ fontSize: 13, color: order.sellerRequestNote ? TEXT_HEAD : TEXT_MUTED }}>
                                {order.sellerRequestNote ?? "No note from seller"}
                            </Text>
                        </View>

                        {/* Transaction ID / UTR */}
                        <Text style={styles.inputLabel}>Transaction ID / UTR</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter transfer reference"
                            placeholderTextColor={TEXT_MUTED}
                            value={transactionRef}
                            onChangeText={setTransactionRef}
                        />

                        {/* Admin Note */}
                        <Text style={styles.inputLabel}>Admin Note</Text>
                        <TextInput
                            style={[styles.input, { height: 80, textAlignVertical: "top", paddingTop: 12 }]}
                            placeholder="Add admin note for this payout"
                            placeholderTextColor={TEXT_MUTED}
                            multiline
                            value={adminNote}
                            onChangeText={setAdminNote}
                        />
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                            <Feather name="x" size={13} color={TEXT_MUTED} />
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.confirmBtn, selectedStatus === "Cancelled" && { backgroundColor: "#ef4444" }]}
                            onPress={() => onConfirm(order.id, transactionRef.trim(), adminNote.trim(), selectedStatus)}
                        >
                            <Feather name="check" size={14} color="#fff" />
                            <Text style={styles.confirmBtnText}>Process Payment</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// ─── EXPORT DROPDOWN (hover/tap) ──────────────────────────────────────────────
const ExportDropdown: React.FC<{
    onExport: (type: "all" | "pending" | "paid-cancelled") => void;
    isWeb: boolean;
    isOpen: boolean;
    onToggle: () => void;
}> = ({ onExport, isWeb, isOpen, onToggle }) => {
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleMouseEnter = () => {
        if (isWeb) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (!isOpen) onToggle();
        }
    };
    const handleMouseLeave = () => {
        if (isWeb) {
            timeoutRef.current = setTimeout(() => { if (isOpen) onToggle(); }, 200);
        }
    };

    return (
        <View
            style={{ position: "relative", zIndex: 997 }}
            // @ts-ignore — web-only hover events
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <TouchableOpacity
                style={[styles.webExportBtn, { backgroundColor: "#1e293b", minWidth: 110 }]}
                onPress={onToggle}
            >
                <Feather name="download" size={14} color="#fff" />
                <Text style={styles.webExportBtnText}>Export</Text>
                <Feather name="chevron-down" size={12} color="rgba(255,255,255,0.7)" style={{ marginLeft: 2 }} />
            </TouchableOpacity>

            {isOpen && (
                <View
                    style={[styles.exportDropdownMenu, !isWeb && { position: "relative", top: 0, marginTop: 4, width: "100%", zIndex: 1 }]}
                    // @ts-ignore
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <TouchableOpacity
                        style={styles.exportDropdownItem}
                        onPress={() => { onExport("all"); onToggle(); }}
                    >
                        <Feather name="download-cloud" size={13} color="#1e293b" />
                        <View>
                            <Text style={styles.exportDropdownItemTitle}>All Orders</Text>
                            <Text style={styles.exportDropdownItemSub}>Export every order</Text>
                        </View>
                    </TouchableOpacity>
                    <View style={{ height: 1, backgroundColor: BORDER, marginHorizontal: 12 }} />
                    <TouchableOpacity
                        style={styles.exportDropdownItem}
                        onPress={() => { onExport("pending"); onToggle(); }}
                    >
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#f59e0b", marginTop: 3 }} />
                        <View>
                            <Text style={styles.exportDropdownItemTitle}>Pending Only</Text>
                            <Text style={styles.exportDropdownItemSub}>Unpaid orders</Text>
                        </View>
                    </TouchableOpacity>
                    <View style={{ height: 1, backgroundColor: BORDER, marginHorizontal: 12 }} />
                    <TouchableOpacity
                        style={styles.exportDropdownItem}
                        onPress={() => { onExport("paid-cancelled"); onToggle(); }}
                    >
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#22c55e", marginTop: 3 }} />
                        <View>
                            <Text style={styles.exportDropdownItemTitle}>Paid & Cancelled</Text>
                            <Text style={styles.exportDropdownItemSub}>Processed orders</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};


// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
const SellerPaymentsScreen: React.FC = () => {
    const { token, isLoading: authLoading } = useAuth();
    const isWeb = Platform.OS === "web";
    const [orders, setOrders] = useState<SellerOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState({ total: 0, pending: 0, paid: 0, totalPaidAmount: 0, greenCount: 0, orangeCount: 0, redCount: 0 });
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [search, setSearch] = useState("");
    const [filterPayment, setFilterPayment] = useState<"All" | "Pending" | "Paid" | "Cancelled">("All");
    const [filterReminderBucket, setFilterReminderBucket] = useState<"All" | "green" | "orange" | "red">("All");
    const [sortPriority, setSortPriority] = useState<"Priority (Red first)" | "Date: Newest First" | "Date: Oldest First">("Priority (Red first)");
    const [openDropdown, setOpenDropdown] = useState<"payment" | "reminder" | "priority" | "export" | null>(null);
    const [payModalOrder, setPayModalOrder] = useState<SellerOrder | null>(null);

    const apiStatus =
        filterPayment === "Pending" ? "pending" :
            filterPayment === "Paid" ? "paid" :
                filterPayment === "Cancelled" ? "cancelled" :
                    undefined;

    const loadPayments = useCallback(async () => {
        if (!token) return;
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
                greenCount: Number(apiStats.greenCount ?? 0),
                orangeCount: Number(apiStats.orangeCount ?? 0),
                redCount: Number(apiStats.redCount ?? 0),
            });
        } catch (e) {
            setError(getApiErrorMessage(e, "Failed to load seller payments."));
        } finally {
            setLoading(false);
        }
    }, [apiStatus, currentPage, token]);

    useEffect(() => {
        if (authLoading || !token) return;
        void loadPayments();
    }, [authLoading, token, loadPayments]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filterPayment]);

    const filtered = orders.filter((o) => {
        const ms = o.orderId.toLowerCase().includes(search.toLowerCase()) || o.sellerName.toLowerCase().includes(search.toLowerCase());
        const mp = filterPayment === "All" || o.paymentStatus === filterPayment;
        const mr = filterReminderBucket === "All" || o.reminderBucket === filterReminderBucket;
        return ms && mp && mr;
    }).sort((a, b) => {
        if (sortPriority === "Date: Newest First") return new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
        if (sortPriority === "Date: Oldest First") return new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime();
        const bucketScoreA = a.reminderBucket === "red" ? 3 : a.reminderBucket === "orange" ? 2 : 1;
        const bucketScoreB = b.reminderBucket === "red" ? 3 : b.reminderBucket === "orange" ? 2 : 1;
        const statusScoreA = a.paymentStatus === "Pending" ? 1 : 0;
        const statusScoreB = b.paymentStatus === "Pending" ? 1 : 0;
        return (bucketScoreB * 10 + statusScoreB) - (bucketScoreA * 10 + statusScoreA);
    });

    const handleConfirmPay = async (id: number, transactionRef: string, adminNote: string, status: PaymentStatus) => {
        try {
            await markPayoutPaid(id, transactionRef || undefined, adminNote || undefined);
            setPayModalOrder(null);
            const msg = `Payment marked as ${status}!`;
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
        if (o) router.push({ pathname: "/Spd", params: { orderData: JSON.stringify(o) } });
    };

    const handleInvoice = (id: number) => {
        if (Platform.OS === "web") window.alert("Invoice generated!");
        else Alert.alert("Invoice", "Invoice generated!");
    };

    // ─── CSV EXPORT ──────────────────────────────────────────────────────────
    const buildCsv = (rows: SellerOrder[]) => {
        const headers = [
            "Order ID", "Order Number", "Order Date", "Order Status",
            "Seller Name", "Seller Email", "Seller Phone",
            "Customer Name", "Customer Email",
            "Customer Paid Amount", "Delivery Date", "Delivery Time",
            "Reminder Days", "Reminder Bucket", "Payment Status", "Wallet Balance"
        ];
        const escape = (val: string | number) => {
            const s = String(val ?? "");
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const csvRows = rows.map(o => [
            o.id, o.orderId, o.orderDate, o.orderStatus,
            o.sellerName, o.sellerEmail, o.sellerPhone,
            o.customerName ?? "", o.customerEmail ?? "",
            o.customerPaid, o.deliveryDate, o.deliveryTime,
            o.reminderDays, o.reminderBucket, o.paymentStatus, o.walletBalance,
        ].map(escape).join(","));
        return "\uFEFF" + [headers.join(","), ...csvRows].join("\n");
    };

    const downloadCsv = (content: string, suffix: string) => {
        if (Platform.OS !== "web") {
            Alert.alert("Export", "CSV export is currently supported on web only.");
            return;
        }
        const fileName = `seller_payments_${suffix}_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
        const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleExport = (type: "all" | "pending" | "paid-cancelled") => {
        if (type === "all") {
            downloadCsv(buildCsv(filtered), "all");
        } else if (type === "pending") {
            downloadCsv(buildCsv(filtered.filter(o => o.paymentStatus === "Pending")), "pending");
        } else {
            downloadCsv(buildCsv(filtered.filter(o => o.paymentStatus === "Paid" || o.paymentStatus === "Cancelled")), "paid_cancelled");
        }
    };

    // ─── RENDER ───────────────────────────────────────────────────────────────
    const MainContent = (
        <>
            {/* Header */}
            <View style={[styles.header, isWeb && styles.headerWeb]}>
                <View style={styles.headerLeft}>
                    <View style={styles.headerIcon}>
                        <Feather name="credit-card" size={22} color="#fff" />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>Seller Payments</Text>
                        <Text style={styles.headerSubtitle}>Manage & process seller payouts</Text>
                    </View>
                </View>
            </View>

            {/* Stats Card */}
            <View style={[
                styles.statsCardSingle,
                !isWeb && { flexDirection: "column", gap: 16 },
                isWeb && { justifyContent: "space-between" }
            ]}>
                <View style={[
                    { gap: isWeb ? 24 : 16, flex: isWeb ? 1 : undefined },
                    isWeb ? { flexDirection: "row", alignItems: "center" } : { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }
                ]}>
                    {[
                        { icon: "list", label: "All Payouts", value: String(stats.total), color: "#a78bfa" },
                        { icon: "clock", label: "Pending", value: String(stats.pending), color: "#f472b6" },
                        { icon: "check-circle", label: "Paid", value: String(stats.paid), color: "#7dd3fc" },
                        { icon: "dollar-sign", label: "Total Paid", value: `₹${stats.totalPaidAmount.toLocaleString("en-IN")}`, color: "#6ee7b7" },
                    ].map((s, i) => (
                        <React.Fragment key={i}>
                            <View style={[styles.statBlockSingle, !isWeb && { width: "47%" }]}>
                                <View style={[styles.statIconWrapperSingle, { backgroundColor: s.color }]}>
                                    <Feather name={s.icon as any} size={20} color="#ffffff" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.statValueSingle} numberOfLines={1}>{s.value}</Text>
                                    <Text style={styles.statLabelSingle} numberOfLines={1}>{s.label}</Text>
                                </View>
                            </View>
                            {i < 3 && isWeb && <View style={styles.statDividerSingle} />}
                        </React.Fragment>
                    ))}
                </View>

                {/* Legend */}
                <View style={{ flexDirection: isWeb ? "row" : "column", alignItems: isWeb ? "center" : "stretch", gap: isWeb ? 24 : 12, flexShrink: 0, paddingLeft: isWeb ? 12 : 0, marginTop: isWeb ? 0 : 16 }}>
                    {isWeb && <View style={styles.statDividerSingle} />}
                    <View style={{ gap: 6, justifyContent: "center", width: isWeb ? 300 : "100%" }}>
                        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                            <View style={[styles.legendBadge, { backgroundColor: "#34d399", flex: 1, minWidth: 90 }]}>
                                <Text style={[styles.legendText, { textAlign: "center" }]}>Green (0-2d): {stats.greenCount}</Text>
                            </View>
                            <View style={[styles.legendBadge, { backgroundColor: "#fbbf24", flex: 1, minWidth: 90 }]}>
                                <Text style={[styles.legendText, { textAlign: "center" }]}>Orange (3-4d): {stats.orangeCount}</Text>
                            </View>
                            <View style={[styles.legendBadge, { backgroundColor: "#f87171", flex: 1, minWidth: 90 }]}>
                                <Text style={[styles.legendText, { textAlign: "center" }]}>Red (5+d): {stats.redCount}</Text>
                            </View>
                        </View>
                        <View style={[styles.legendBadge, { backgroundColor: "#475569" }]}>
                            <Text style={[styles.legendText, { textAlign: "center" }]}>Red and pending are prioritized on top; paid rows moved down</Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={[styles.main, isWeb && styles.mainWeb]}>
                <View style={[styles.scrollArea, styles.scrollContent, !isWeb && { paddingBottom: 20 }]}>

                    {(loading || authLoading) && <ActivityIndicator size="large" color={PRIMARY} style={{ marginVertical: 24 }} />}
                    {error && (
                        <View style={{ marginBottom: 12, gap: 8 }}>
                            <Text style={{ color: "#DC2626", fontSize: 13 }}>{error}</Text>
                            <TouchableOpacity style={styles.exportBtn} onPress={loadPayments}>
                                <Text style={styles.exportBtnText}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Filter Bar */}
                    <View style={[styles.webFilterSection, { zIndex: 999 }]}>
                        <View style={[
                            styles.webFilterBar,
                            !isWeb && { flexDirection: "column", gap: 10 }
                        ]}>
                            {/* Search */}
                            <View style={[styles.webSearchInputWrapper, !isWeb && { width: "100%" }]}>
                                <Feather name="search" size={14} color={PRIMARY} />
                                <TextInput
                                    style={styles.webSearchInput}
                                    placeholder="Search orders, sellers..."
                                    placeholderTextColor={TEXT_MUTED}
                                    value={search}
                                    onChangeText={setSearch}
                                />
                                {search.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearch("")}>
                                        <Feather name="x-circle" size={15} color={TEXT_MUTED} />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Mobile: row of filters */}
                            <View style={[
                                { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
                                !isWeb && { width: "100%" }
                            ]}>
                                {/* Payment filter */}
                                <View style={[{ position: "relative", zIndex: 1000 }, !isWeb && { width: "100%" }]}>
                                    <TouchableOpacity
                                        style={styles.webSelectBox}
                                        onPress={() => setOpenDropdown(openDropdown === "payment" ? null : "payment")}
                                    >
                                        <Text style={styles.webSelectText}>{filterPayment === "All" ? "All Payments" : filterPayment}</Text>
                                        <Feather name="chevron-down" size={14} color={TEXT_MUTED} />
                                    </TouchableOpacity>
                                    {openDropdown === "payment" && (
                                        <View style={[styles.webDropdownMenu, !isWeb && { position: "relative", top: 0, marginTop: 4, width: "100%", zIndex: 1 }]}>
                                            {(["All", "Pending", "Paid", "Cancelled"] as const).map(option => (
                                                <TouchableOpacity
                                                    key={option}
                                                    style={[styles.webDropdownItem, filterPayment === option && { backgroundColor: "#1d4ed8" }]}
                                                    onPress={() => { setFilterPayment(option); setOpenDropdown(null); }}
                                                >
                                                    <Text style={[styles.webDropdownItemText, filterPayment === option && { color: "#fff" }]}>
                                                        {option === "All" ? "All Payments" : option}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </View>

                                {/* Reminder filter */}
                                <View style={[{ position: "relative", zIndex: 999 }, !isWeb && { width: "100%" }]}>
                                    <TouchableOpacity
                                        style={styles.webSelectBox}
                                        onPress={() => setOpenDropdown(openDropdown === "reminder" ? null : "reminder")}
                                    >
                                        <Text style={styles.webSelectText}>
                                            {filterReminderBucket === "All" ? "All Buckets" :
                                                filterReminderBucket === "green" ? "Green (0-2d)" :
                                                    filterReminderBucket === "orange" ? "Orange (3-4d)" : "Red (5+d)"}
                                        </Text>
                                        <Feather name="chevron-down" size={14} color={TEXT_MUTED} />
                                    </TouchableOpacity>
                                    {openDropdown === "reminder" && (
                                        <View style={[styles.webDropdownMenu, { width: 180 }, !isWeb && { position: "relative", top: 0, marginTop: 4, width: "100%", zIndex: 1 }]}>
                                            {[
                                                { label: "All Buckets", value: "All" },
                                                { label: "Green (0-2 days)", value: "green" },
                                                { label: "Orange (3-4 days)", value: "orange" },
                                                { label: "Red (5+ days)", value: "red" }
                                            ].map(option => (
                                                <TouchableOpacity
                                                    key={option.value}
                                                    style={[styles.webDropdownItem, filterReminderBucket === option.value && { backgroundColor: "#1d4ed8" }]}
                                                    onPress={() => { setFilterReminderBucket(option.value as any); setOpenDropdown(null); }}
                                                >
                                                    <Text style={[styles.webDropdownItemText, filterReminderBucket === option.value && { color: "#fff" }]}>
                                                        {option.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </View>

                                {/* Sort */}
                                <View style={[{ position: "relative", zIndex: 998 }, !isWeb && { width: "100%" }]}>
                                    <TouchableOpacity
                                        style={styles.webSelectBox}
                                        onPress={() => setOpenDropdown(openDropdown === "priority" ? null : "priority")}
                                    >
                                        <Text style={styles.webSelectText}>{sortPriority}</Text>
                                        <Feather name="chevron-down" size={14} color={TEXT_MUTED} />
                                    </TouchableOpacity>
                                    {openDropdown === "priority" && (
                                        <View style={[styles.webDropdownMenu, { width: 170 }, !isWeb && { position: "relative", top: 0, marginTop: 4, width: "100%", zIndex: 1 }]}>
                                            {["Priority (Red first)", "Date: Newest First", "Date: Oldest First"].map(option => (
                                                <TouchableOpacity
                                                    key={option}
                                                    style={[styles.webDropdownItem, sortPriority === option && { backgroundColor: "#1d4ed8" }]}
                                                    onPress={() => { setSortPriority(option as any); setOpenDropdown(null); }}
                                                >
                                                    <Text style={[styles.webDropdownItemText, sortPriority === option && { color: "#fff" }]}>{option}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </View>

                                {/* Export Buttons Container */}
                                <View style={[{ flexDirection: "row", gap: 8 }, !isWeb && { width: "100%" }]}>
                                    {/* Export All Dropdown */}
                                    <View style={!isWeb ? { flex: 1 } : {}}>
                                        <ExportDropdown onExport={handleExport} isWeb={isWeb} isOpen={openDropdown === "export"} onToggle={() => setOpenDropdown(openDropdown === "export" ? null : "export")} />
                                    </View>

                                    {/* Export >=4d button */}
                                    <TouchableOpacity
                                        style={[styles.webExportBtn, { backgroundColor: "#ef4444" }, !isWeb && { flex: 1, justifyContent: "center" }]}
                                        onPress={() => {
                                            const overdueRows = filtered.filter(o => o.reminderDays >= 4);
                                            if (overdueRows.length === 0) {
                                                if (Platform.OS === "web") window.alert("No orders with 4+ reminder days found.");
                                                else Alert.alert("Export", "No orders with 4+ reminder days found.");
                                                return;
                                            }
                                            downloadCsv(buildCsv(overdueRows), "overdue_4d");
                                        }}
                                    >
                                        <Feather name="clock" size={14} color="#fff" />
                                        <Text style={styles.webExportBtnText}>Export &gt;=4d</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>

                    <Text style={styles.resultCount}>
                        Showing <Text style={{ color: PRIMARY, fontWeight: "700" }}>{filtered.length}</Text> of {orders.length} orders
                    </Text>

                    {/* Table / Cards */}
                    {filtered.length === 0 ? (
                        <View style={styles.empty}>
                            <Feather name="inbox" size={44} color={TEXT_MUTED} />
                            <Text style={styles.emptyTitle}>No orders found</Text>
                        </View>
                    ) : isWeb ? (
                        <View style={{ width: "100%" }}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={styles.tableContainer}>
                                    <View style={styles.tableHeaderRow}>
                                        <Text style={[styles.tableHeaderCell, { width: 140 }]}>Order</Text>
                                        <Text style={[styles.tableHeaderCell, { width: 220 }]}>Seller</Text>
                                        <Text style={[styles.tableHeaderCell, { width: 140 }]}>Customer Paid{"\n"}<Text style={{ fontSize: 9, textTransform: "none", fontWeight: "500" }}>(order+total_amount)</Text></Text>
                                        <Text style={[styles.tableHeaderCell, { width: 130 }]}>Delivery Date</Text>
                                        <Text style={[styles.tableHeaderCell, { width: 110 }]}>Reminder</Text>
                                        <Text style={[styles.tableHeaderCell, { width: 120 }]}>Payment Status</Text>
                                        <Text style={[styles.tableHeaderCell, { width: 100 }]}>Wallet Balance</Text>
                                        <Text style={[styles.tableHeaderCell, { width: 200 }]}>Actions</Text>
                                    </View>
                                    {filtered.map(order => {
                                        const payStyle = getPaymentStyle(order.paymentStatus);
                                        let remBg = "#10b981";
                                        if (order.reminderBucket === "orange") remBg = "#f59e0b";
                                        if (order.reminderBucket === "red") remBg = "#ef4444";

                                        return (
                                            <View key={order.id} style={[styles.tableRow, { alignItems: "center" }]}>
                                                {/* Order */}
                                                <View style={{ width: 140 }}>
                                                    <Text style={{ fontWeight: "700", color: PRIMARY, fontSize: 13 }}>{order.orderId}</Text>
                                                    <Text style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 2, marginBottom: 4 }}>{order.orderDate}</Text>
                                                    <View style={{ backgroundColor: "#2dd4bf", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: "flex-start" }}>
                                                        <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>{order.orderStatus}</Text>
                                                    </View>
                                                </View>
                                                {/* Seller */}
                                                <View style={{ width: 220 }}>
                                                    <Text style={{ fontWeight: "700", color: TEXT_HEAD, fontSize: 13 }} numberOfLines={1}>{order.sellerName}</Text>
                                                    <Text style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 2 }}>{order.sellerEmail}</Text>
                                                    <Text style={{ color: TEXT_MUTED, fontSize: 11 }}>{order.sellerPhone}</Text>
                                                </View>
                                                {/* Customer Paid */}
                                                <View style={{ width: 140 }}>
                                                    <Text style={{ fontWeight: "700", color: DARK, fontSize: 14 }}>{order.customerPaid}</Text>
                                                </View>
                                                {/* Delivery Date */}
                                                <View style={{ width: 130 }}>
                                                    <Text style={{ color: TEXT_HEAD, fontSize: 13 }}>{order.deliveryDate}</Text>
                                                    <Text style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 2 }}>{order.deliveryTime}</Text>
                                                </View>
                                                {/* Reminder */}
                                                <View style={{ width: 110 }}>
                                                    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: remBg, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 4, alignSelf: "flex-start", gap: 4 }}>
                                                        <Feather name="clock" size={10} color="#fff" />
                                                        <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{order.reminderLabel}</Text>
                                                    </View>
                                                </View>
                                                {/* Payment Status */}
                                                <View style={{ width: 120 }}>
                                                    <View style={[styles.statusBadge, { backgroundColor: payStyle.bg, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 6 }]}>
                                                        <Feather name="clock" size={10} color={payStyle.color} />
                                                        <Text style={[styles.statusText, { color: payStyle.color }]}>{order.paymentStatus}</Text>
                                                    </View>
                                                </View>
                                                {/* Wallet Balance */}
                                                <View style={{ width: 100 }}>
                                                    <Text style={{ fontWeight: "700", color: TEXT_HEAD, fontSize: 13 }}>{order.walletBalance}</Text>
                                                </View>
                                                {/* Actions */}
                                                <View style={{ width: 200, flexDirection: "row", alignItems: "center", gap: 6 }}>
                                                    <TouchableOpacity
                                                        style={[styles.actionBtn, { backgroundColor: "#10b981" }]}
                                                        onPress={() => { const o = orders.find(x => x.id === order.id); if (o) setPayModalOrder(o); }}
                                                    >
                                                        <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700", marginRight: 1 }}>₹</Text>
                                                        <Text style={styles.actionBtnText}>Pay</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[styles.actionBtn, { backgroundColor: "#14b8a6" }]}
                                                        onPress={() => handleView(order.id)}
                                                    >
                                                        <Feather name="eye" size={12} color="#fff" />
                                                        <Text style={styles.actionBtnText}>View</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            </ScrollView>
                        </View>
                    ) : (
                        <View style={styles.cardsList}>
                            {filtered.map(order => (
                                <View key={order.id} style={styles.cardWrap}>
                                    <OrderCard
                                        order={order}
                                        onPay={id => { const o = orders.find(x => x.id === id); if (o) setPayModalOrder(o); }}
                                        onView={handleView}
                                        onInvoice={handleInvoice}
                                    />
                                </View>
                            ))}
                        </View>
                    )}

                    {!loading && !error && filtered.length > 0 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalElements}
                            itemsPerPage={PAYMENTS_PAGE_SIZE}
                            itemName="payments"
                            onPageChange={setCurrentPage}
                        />
                    )}
                </View>
            </View>
        </>
    );

    return (
        <AdminLayout>
            <View style={styles.webLayout}>
                <StatusBar barStyle="light-content" backgroundColor="#151D4F" />
                <View style={styles.webColumn}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{
                            paddingHorizontal: isWeb ? 16 : 12,
                            paddingTop: 10,
                            paddingBottom: 40
                        }}
                    >
                        {MainContent}
                    </ScrollView>
                </View>
                <PayModal
                    visible={!!payModalOrder}
                    order={payModalOrder}
                    onClose={() => setPayModalOrder(null)}
                    onConfirm={handleConfirmPay}
                    isWeb={isWeb}
                />
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
    mainWeb: {
        backgroundColor: BG_CARD,
        marginHorizontal: 0,
        marginBottom: 24,
        marginTop: 0,
        borderRadius: 20,
        overflow: "hidden",
        shadowColor: DARK,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 5
    },

    // Header
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#151D4F",
        paddingHorizontal: 24,
        paddingVertical: 24,
        paddingBottom: 64,
        borderRadius: 22,
        marginBottom: 0,
        zIndex: 1,
        shadowColor: "#151D4F",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 10
    },
    headerWeb: { marginHorizontal: 2, marginTop: 12 },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
    headerIcon: {
        width: 50, height: 50, borderRadius: 16,
        backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center",
        shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5
    },
    headerTitle: { fontSize: 20, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5 },
    headerSubtitle: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
    exportBtn: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
        borderWidth: 1.5, borderColor: PRIMARY, backgroundColor: PRIMARY_LIGHT
    },
    exportBtnText: { fontSize: 12, fontWeight: "700", color: PRIMARY },

    // Scroll
    scrollArea: { flex: 1 },
    scrollContent: { padding: 16, gap: 14 },

    // Stats
    statsCardSingle: {
        flexDirection: "row",
        backgroundColor: BG_CARD,
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: BORDER,
        shadowColor: DARK,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        marginBottom: 0,
        marginTop: -40,
        marginHorizontal: 16,
        zIndex: 10
    },
    statBlockSingle: { flexDirection: "row", alignItems: "center", gap: 12 },
    statIconWrapperSingle: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    statValueSingle: { fontSize: 20, fontWeight: "800", color: TEXT_HEAD, marginBottom: 2 },
    statLabelSingle: { fontSize: 12, fontWeight: "600", color: TEXT_MUTED } as any,
    statDividerSingle: { width: 1, backgroundColor: BORDER, height: 44 },
    legendBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4 },
    legendText: { color: "#fff", fontSize: 11, fontWeight: "700" },

    // Filter
    webFilterSection: { marginBottom: 16 },
    webFilterBar: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 14,
        flexDirection: "row",
        gap: 10,
        alignItems: "center",
        flexWrap: "wrap",
        shadowColor: DARK,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: BORDER
    },
    webSearchInputWrapper: {
        flex: 1,
        minWidth: 180,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        borderWidth: 1,
        borderColor: "#fed7aa",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 9,
        backgroundColor: "#fff"
    },
    webSearchInput: { flex: 1, fontSize: 13, color: TEXT_HEAD, outlineStyle: "none" } as any,
    webSelectBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 9,
        backgroundColor: "#fff"
    },
    webSelectText: { fontSize: 12, color: TEXT_MUTED },
    webExportBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 8
    },
    webExportBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
    webDropdownMenu: {
        position: "absolute",
        top: "100%",
        left: 0,
        marginTop: 4,
        width: 150,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 8,
        shadowColor: DARK,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 8,
        zIndex: 1000
    },
    webDropdownItem: { paddingVertical: 10, paddingHorizontal: 14 },
    webDropdownItemText: { fontSize: 13, color: TEXT_HEAD },

    // Export dropdown
    exportDropdownMenu: {
        position: "absolute",
        top: "100%",
        right: 0,
        marginTop: 6,
        width: 210,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 10,
        zIndex: 2000,
        overflow: "hidden"
    },
    exportDropdownItem: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 14
    },
    exportDropdownItemTitle: { fontSize: 13, fontWeight: "700", color: TEXT_HEAD },
    exportDropdownItemSub: { fontSize: 11, color: TEXT_MUTED, marginTop: 1 },

    resultCount: { fontSize: 12, color: TEXT_MUTED, fontWeight: "500", marginBottom: 4 },

    // Cards
    cardsList: { gap: 12 },
    cardWrap: { width: "100%" },

    card: {
        backgroundColor: BG_CARD,
        borderRadius: 16,
        flexDirection: "row",
        overflow: "hidden",
        borderWidth: 1,
        borderColor: BORDER,
        shadowColor: DARK,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
        elevation: 3
    },
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
    btnPrimary: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: PRIMARY, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
    btnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 12 },
    btnOutline: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1.5, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: BG_PAGE },
    btnOutlineText: { color: PRIMARY, fontWeight: "700", fontSize: 12 },

    // Empty
    empty: { alignItems: "center", paddingVertical: 50, gap: 10 },
    emptyTitle: { fontSize: 16, fontWeight: "700", color: TEXT_BODY },

    // Modal
    overlayWeb: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
    overlayMobile: { flex: 1, backgroundColor: "transparent", justifyContent: "flex-end" },
    modal: { backgroundColor: BG_CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden", maxHeight: "92%" as any },
    modalWeb: { width: "90%", maxWidth: 520, borderRadius: 20 },
    modalHeader: {
        backgroundColor: PRIMARY,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 22,
        paddingVertical: 18
    },
    modalTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },

    // Modal sections
    sectionLabel: { fontSize: 11, fontWeight: "800", color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
    sellerNameBox: {
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: BG_PAGE
    },

    // Amount Breakdown
    amountBreakdownBox: {
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 4
    },
    breakdownRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f0ed"
    },
    breakdownLabel: { fontSize: 13, color: TEXT_BODY },
    breakdownValue: { fontSize: 13, fontWeight: "600", color: TEXT_HEAD },
    finalAmountRow: {
        backgroundColor: "#fff8f3",
        borderBottomWidth: 0,
        paddingVertical: 14
    },
    finalAmountLabel: { fontSize: 14, fontWeight: "800", color: TEXT_HEAD },
    finalAmountValue: { fontSize: 16, fontWeight: "800", color: PRIMARY },

    // Bank Details
    bankDetailHeader: { flexDirection: "row", alignItems: "center", marginTop: 16, marginBottom: 8 },
    bankDetailsBox: {
        borderWidth: 1,
        borderColor: "#fde8d0",
        borderRadius: 12,
        padding: 14,
        backgroundColor: "#fffaf5",
        gap: 12
    },
    bankRow: { flexDirection: "row", gap: 16 },
    bankField: { flex: 1 },
    bankFieldLabel: { fontSize: 10, fontWeight: "700", color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 },
    bankFieldValue: { fontSize: 13, fontWeight: "700", color: TEXT_HEAD },

    // Status dropdown in modal
    statusDropdownTrigger: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1.5,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12
    },
    statusDropdownMenu: {
        position: "absolute",
        top: "100%",
        left: 0,
        right: 0,
        marginTop: 4,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 8,
        zIndex: 200
    },
    statusDropdownItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 8,
        margin: 4
    },
    statusDropdownItemText: { fontSize: 13 },

    // Input fields
    inputLabel: { fontSize: 11, fontWeight: "800", color: TEXT_BODY, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 },
    input: {
        borderWidth: 1.5,
        borderColor: BORDER,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 11,
        fontSize: 13,
        color: TEXT_HEAD,
        backgroundColor: BG_PAGE,
        marginBottom: 14
    },

    // Modal Footer
    modalFooter: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 12,
        padding: 18,
        borderTopWidth: 1,
        borderTopColor: BORDER,
        backgroundColor: BG_PAGE
    },
    cancelBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 18,
        paddingVertical: 11,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: BORDER,
        backgroundColor: BG_CARD
    },
    cancelBtnText: { color: TEXT_MUTED, fontWeight: "700", fontSize: 13 },
    confirmBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: PRIMARY,
        paddingHorizontal: 20,
        paddingVertical: 11,
        borderRadius: 10,
        shadowColor: PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4
    },
    confirmBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

    // Table
    tableContainer: {
        minWidth: 1200,
        backgroundColor: BG_CARD,
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: BORDER,
        marginBottom: 16
    },
    tableHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fdf8f4",
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
        gap: 16
    },
    tableHeaderCell: { fontSize: 11, fontWeight: "800", color: TEXT_HEAD, textTransform: "capitalize" },
    tableRow: {
        flexDirection: "row",
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
        gap: 16
    },
    tableCell: { fontSize: 13, color: TEXT_HEAD },
    actionBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 6
    },
    actionBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },

    // Pagination
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
        borderColor: BORDER
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
        backgroundColor: BG_CARD
    },
    pageBtnDisabled: { opacity: 0.4 },
    pageNumText: { fontSize: 13, fontWeight: "700", color: TEXT_HEAD },

    // Search (unused legacy, kept for ref)
    searchRow: { marginBottom: 4 },
    searchBox: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: BG_CARD, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: BORDER },
    searchInput: { flex: 1, fontSize: 13, color: TEXT_HEAD },
});