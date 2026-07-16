import AdminLayout from "@/components/admin-layout";
import { useAuth } from "@/context/auth-context";
import { getApiErrorMessage } from "@/lib/api/client";
import { sweetError, sweetInfo, sweetSuccess } from "@/lib/sweetAlert";
import { mapPayoutToPaymentRow } from "@/lib/mappers";
import { fetchPayoutStats, fetchPayouts, markPayoutPaid, fetchPayoutDetail, fetchPayoutExportCsv, fetchPayoutRequests, closePayoutRequest, fetchPayoutAlerts, type PayoutRequestItem, type PayoutAlerts } from "@/services/payoutApi";
import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import Pagination from "@/components/Pagination";
import {
    ActivityIndicator,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View
} from "react-native";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type PaymentStatus = "Pending" | "Paid" | "Cancelled";
type ReminderBucket = "green" | "orange" | "red";
type PageTab = "payments" | "requests";
const REQUESTS_PAGE_SIZE = 10;

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
    transactionRef?: string;
    adminNote?: string;
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
}> = ({ order, onPay, onView }) => {
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
                    <TouchableOpacity style={styles.btnPrimary} onPress={() => void onPay(order.id)}>
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
        if (visible && order) {
            setTransactionRef(order.transactionRef ?? "");
            setAdminNote(order.adminNote ?? "");
            setSelectedStatus(order.paymentStatus === "Cancelled" ? "Cancelled" : "Paid");
            setStatusDropdownOpen(false);
        }
    }, [visible, order?.id, order?.transactionRef, order?.adminNote, order?.paymentStatus]);

    if (!visible || !order) return null;

    const isPending = order.paymentStatus === "Pending";
    const confirmOptions: PaymentStatus[] = isPending ? ["Paid", "Cancelled"] : [];

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
                                    {(confirmOptions.length ? confirmOptions : PAYMENT_STATUS_OPTIONS).map(opt => {
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
                            style={[styles.confirmBtn, selectedStatus === "Cancelled" && { backgroundColor: "#ef4444" }, !isPending && { opacity: 0.5 }]}
                            onPress={() => onConfirm(order.id, transactionRef.trim(), adminNote.trim(), selectedStatus)}
                            disabled={!isPending}
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
                    style={[styles.exportDropdownMenu, !isWeb && { position: "absolute", top: 40, left: 0, width: 200, zIndex: 999 }]}
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

const formatMoney = (value?: number | string | null) => {
    const num = typeof value === "number" ? value : Number(value ?? 0);
    if (Number.isNaN(num)) return "₹0.00";
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDateTime = (value?: string | null) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const PayoutRequestCard: React.FC<{
    item: PayoutRequestItem;
    statusDraft: string;
    onStatusChange: (text: string) => void;
    onClose: () => void;
    closing: boolean;
}> = ({ item, statusDraft, onStatusChange, onClose, closing }) => {
    const isPending = (item.status ?? "").toLowerCase() === "pending";
    const statusLabel = (item.status ?? "pending").replace(/^\w/, (c) => c.toUpperCase());
    const statusStyle = isPending
        ? { bg: PRIMARY_LIGHT, color: PRIMARY }
        : (item.status ?? "").toLowerCase() === "closed"
            ? { bg: "#e8f7ee", color: "#1a7a45" }
            : { bg: "#f1f5f9", color: TEXT_BODY };

    return (
        <View style={styles.requestCard}>
            <View style={styles.requestCardTop}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.requestOrder}>{item.orderNumber || `Order #${item.orderId}`}</Text>
                    <Text style={styles.requestSeller}>{item.sellerName || "Seller"}</Text>
                    <Text style={styles.requestMeta}>{item.sellerEmail || "—"}{item.sellerPhone ? ` · ${item.sellerPhone}` : ""}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                    <Text style={styles.requestAmount}>{formatMoney(item.requestedAmount)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                        <Text style={[styles.statusText, { color: statusStyle.color }]}>{statusLabel}</Text>
                    </View>
                </View>
            </View>
            <Text style={styles.requestMeta}>Requested: {formatDateTime(item.requestedAt)}</Text>
            {!!item.sellerNote && (
                <Text style={styles.requestNote}>Seller note: {item.sellerNote}</Text>
            )}
            {isPending ? (
                <View style={styles.requestCloseRow}>
                    <TextInput
                        style={[styles.input, { flex: 1, marginBottom: 0 }]}
                        placeholder="Enter payment status for seller..."
                        placeholderTextColor={TEXT_MUTED}
                        value={statusDraft}
                        onChangeText={onStatusChange}
                        editable={!closing}
                    />
                    <TouchableOpacity
                        style={[styles.closeRequestBtn, closing && { opacity: 0.6 }]}
                        onPress={onClose}
                        disabled={closing}
                    >
                        {closing ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Feather name="check-circle" size={14} color="#fff" />
                                <Text style={styles.closeRequestBtnText}>Close</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.closedStatusBox}>
                    <Text style={styles.closedStatusLabel}>Payment status sent to seller</Text>
                    <Text style={styles.closedStatusText}>{item.adminNote || item.paymentStatus || "—"}</Text>
                </View>
            )}
        </View>
    );
};


// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
const SellerPaymentsScreen: React.FC = () => {
    const { token, isLoading: authLoading } = useAuth();
    const params = useLocalSearchParams<{ tab?: string }>();
    const isWeb = Platform.OS === "web";
    const { width: windowWidth } = useWindowDimensions();
    // The multi-column desktop layout (data table, inline filter bar, row-based
    // stats/legend) only makes sense once there's enough horizontal room. Below
    // 1024px — whether that's a phone, a tablet, or a browser window/devtools
    // device-toolbar resized down on a laptop — we fall back to the same
    // mobile-style stacked/card layout. This makes the page respond correctly
    // to resizing instead of only reacting to Platform.OS.
    const isWideWeb = isWeb && windowWidth >= 1024;
    const isUltraWide = isWeb && windowWidth >= 1200;
    const [activeTab, setActiveTab] = useState<PageTab>(
        params.tab === "requests" ? "requests" : "payments",
    );
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

    const [requests, setRequests] = useState<PayoutRequestItem[]>([]);
    const [requestsLoading, setRequestsLoading] = useState(false);
    const [requestsError, setRequestsError] = useState<string | null>(null);
    const [requestPage, setRequestPage] = useState(1);
    const [requestTotalPages, setRequestTotalPages] = useState(0);
    const [requestTotalElements, setRequestTotalElements] = useState(0);
    const [requestFilter, setRequestFilter] = useState<"All" | "Pending" | "Closed">("All");
    const [requestStatusDrafts, setRequestStatusDrafts] = useState<Record<number, string>>({});
    const [closingRequestId, setClosingRequestId] = useState<number | null>(null);
    const [alerts, setAlerts] = useState<PayoutAlerts | null>(null);
    const alertedNewRef = useRef(false);
    const alertedOverdueRef = useRef(false);

    useEffect(() => {
        if (params.tab === "requests") {
            setActiveTab("requests");
        }
    }, [params.tab]);

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

    const requestApiStatus =
        requestFilter === "Pending" ? "pending" :
            requestFilter === "Closed" ? "closed" :
                undefined;

    const loadRequests = useCallback(async () => {
        if (!token) return;
        setRequestsLoading(true);
        setRequestsError(null);
        try {
            const page = await fetchPayoutRequests(requestApiStatus, requestPage - 1, REQUESTS_PAGE_SIZE);
            setRequests(page.items ?? []);
            setRequestTotalElements(page.totalElements);
            setRequestTotalPages(page.totalPages);
            if (requestPage > page.totalPages && page.totalPages > 0) {
                setRequestPage(page.totalPages);
            }
        } catch (e) {
            setRequestsError(getApiErrorMessage(e, "Failed to load payout requests."));
        } finally {
            setRequestsLoading(false);
        }
    }, [requestApiStatus, requestPage, token]);

    const loadAlerts = useCallback(async () => {
        if (!token) return;
        try {
            const data = await fetchPayoutAlerts();
            setAlerts(data);
            if (!alertedNewRef.current && Number(data.newRequestCount ?? 0) > 0) {
                alertedNewRef.current = true;
                void sweetInfo(
                    "New payment request",
                    `You have ${data.newRequestCount} new seller payment request(s). Check the Requests tab.`,
                );
            }
            if (!alertedOverdueRef.current && Number(data.overduePaymentCount ?? 0) > 0) {
                alertedOverdueRef.current = true;
                void sweetInfo(
                    "Seller payment reminder",
                    `${data.overduePaymentCount} payment(s) need to be sent to sellers (customer paid ${data.overdueDays}+ days ago).`,
                );
            }
        } catch {
            // Alerts are non-blocking
        }
    }, [token]);

    useEffect(() => {
        if (authLoading || !token) return;
        void loadPayments();
    }, [authLoading, token, loadPayments]);

    useEffect(() => {
        if (authLoading || !token || activeTab !== "requests") return;
        void loadRequests();
    }, [authLoading, token, activeTab, loadRequests]);

    useEffect(() => {
        if (authLoading || !token) return;
        void loadAlerts();
        const timer = setInterval(() => {
            void loadAlerts();
        }, 60_000);
        return () => clearInterval(timer);
    }, [authLoading, token, loadAlerts]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filterPayment]);

    useEffect(() => {
        setRequestPage(1);
    }, [requestFilter]);

    const handleCloseRequest = async (id: number) => {
        const paymentStatus = (requestStatusDrafts[id] ?? "").trim();
        if (!paymentStatus) {
            void sweetError("Required", "Please enter the payment status before closing.");
            return;
        }
        setClosingRequestId(id);
        try {
            await closePayoutRequest(id, paymentStatus);
            setRequestStatusDrafts((prev) => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
            void sweetSuccess("Closed", "Request closed and seller emailed with payment status.");
            await Promise.all([loadRequests(), loadAlerts()]);
        } catch (e) {
            void sweetError("Error", getApiErrorMessage(e, "Failed to close request."));
        } finally {
            setClosingRequestId(null);
        }
    };

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
            const apiStatus = status === "Cancelled" ? "cancelled" : "paid";
            await markPayoutPaid(id, transactionRef || undefined, adminNote || undefined, apiStatus);
            setPayModalOrder(null);
            const msg = `Payment marked as ${status}!`;
            void sweetSuccess("Success", msg);
            await loadPayments();
        } catch (e) {
            const msg = getApiErrorMessage(e);
            void sweetError("Error", msg);
        }
    };

    const openPayModal = async (id: number) => {
        try {
            const detail = await fetchPayoutDetail(id);
            const mapped = mapPayoutToPaymentRow(detail as any);
            setPayModalOrder(mapped);
        } catch (e) {
            const existing = orders.find((x) => x.id === id);
            if (existing) setPayModalOrder(existing);
            else {
                const msg = getApiErrorMessage(e);
                void sweetError("Error", msg);
            }
        }
    };

    const handleView = (id: number) => {
        router.push({ pathname: "/Spd", params: { id: String(id) } });
    };

    const handleInvoice = (id: number) => {
        router.push({ pathname: "/Spd", params: { id: String(id), invoiceMode: "true" } });
    };

    // ─── CSV EXPORT (backend) ────────────────────────────────────────────────
    const downloadCsv = (content: string, suffix: string) => {
        if (Platform.OS !== "web") {
            void sweetInfo("Export", "CSV export is currently supported on web only.");
            return;
        }
        const fileName = `seller_payments_${suffix}_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
        const blob = new Blob([content.startsWith("\uFEFF") ? content : "\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const downloadBackendExport = async (status?: string, minReminderDays?: number) => {
        if (Platform.OS !== "web") {
            void sweetInfo("Export", "CSV export is currently supported on web only.");
            return;
        }
        try {
            const csv = await fetchPayoutExportCsv(status, minReminderDays);
            const suffix = minReminderDays != null
                ? `overdue_${minReminderDays}d`
                : (status ?? "all");
            downloadCsv(csv, suffix);
        } catch (e) {
            const msg = getApiErrorMessage(e, "Failed to export payouts.");
            void sweetError("Error", msg);
        }
    };

    const handleExport = (type: "all" | "pending" | "paid-cancelled") => {
        if (type === "all") {
            void downloadBackendExport();
        } else if (type === "pending") {
            void downloadBackendExport("pending");
        } else {
            void downloadBackendExport("paid-cancelled");
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

            {/* Tabs */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === "payments" && styles.tabBtnActive]}
                    onPress={() => setActiveTab("payments")}
                >
                    <Feather name="list" size={14} color={activeTab === "payments" ? PRIMARY : TEXT_MUTED} />
                    <Text style={[styles.tabBtnText, activeTab === "payments" && styles.tabBtnTextActive]}>Payments</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === "requests" && styles.tabBtnActive]}
                    onPress={() => setActiveTab("requests")}
                >
                    <Feather name="inbox" size={14} color={activeTab === "requests" ? PRIMARY : TEXT_MUTED} />
                    <Text style={[styles.tabBtnText, activeTab === "requests" && styles.tabBtnTextActive]}>Requests</Text>
                    {Number(alerts?.pendingRequestCount ?? 0) > 0 && (
                        <View style={styles.tabBadge}>
                            <Text style={styles.tabBadgeText}>{alerts?.pendingRequestCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Alert banners */}
            {(Number(alerts?.newRequestCount ?? 0) > 0 || Number(alerts?.overduePaymentCount ?? 0) > 0) && (
                <View style={styles.alertStack}>
                    {Number(alerts?.newRequestCount ?? 0) > 0 && (
                        <TouchableOpacity style={[styles.alertBanner, { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }]} onPress={() => setActiveTab("requests")}>
                            <Feather name="bell" size={16} color="#1d4ed8" />
                            <Text style={[styles.alertBannerText, { color: "#1e3a8a" }]}>
                                You have {alerts?.newRequestCount} new payment request(s). Open Requests to review.
                            </Text>
                        </TouchableOpacity>
                    )}
                    {Number(alerts?.overduePaymentCount ?? 0) > 0 && (
                        <TouchableOpacity style={[styles.alertBanner, { backgroundColor: "#fef2f2", borderColor: "#fecaca" }]} onPress={() => setActiveTab("payments")}>
                            <Feather name="alert-triangle" size={16} color="#b91c1c" />
                            <Text style={[styles.alertBannerText, { color: "#7f1d1d" }]}>
                                Payment needs to be sent to {alerts?.overduePaymentCount} seller(s) — customer paid {alerts?.overdueDays}+ days ago.
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {activeTab === "payments" ? (
            <>
            {/* Stats Card */}
            <View style={[
                styles.statsCardSingle,
                !isUltraWide && { flexDirection: "column", gap: 16 },
                isUltraWide && { justifyContent: "space-between", flexDirection: "row", alignItems: "center" }
            ]}>
                <View style={[
                    { gap: isUltraWide ? 24 : 16, flex: isUltraWide ? 1 : undefined },
                    isUltraWide ? { flexDirection: "row", alignItems: "center" } : { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }
                ]}>
                    {[
                        { icon: "list", label: "All Payouts", value: String(stats.total), color: "#a78bfa" },
                        { icon: "clock", label: "Pending", value: String(stats.pending), color: "#f472b6" },
                        { icon: "check-circle", label: "Paid", value: String(stats.paid), color: "#7dd3fc" },
                        { icon: "dollar-sign", label: "Total Paid", value: `₹${stats.totalPaidAmount.toLocaleString("en-IN")}`, color: "#6ee7b7" },
                    ].map((s, i) => (
                        <React.Fragment key={i}>
                            <View style={[styles.statBlockSingle, windowWidth < 600 && { width: "47%" }]}>
                                <View style={[styles.statIconWrapperSingle, { backgroundColor: s.color }]}>
                                    <Feather name={s.icon as any} size={20} color="#ffffff" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.statValueSingle} numberOfLines={1}>{s.value}</Text>
                                    <Text style={styles.statLabelSingle} numberOfLines={1}>{s.label}</Text>
                                </View>
                            </View>
                            {i < 3 && isUltraWide && <View style={styles.statDividerSingle} />}
                        </React.Fragment>
                    ))}
                </View>

                {/* Legend */}
                <View style={{ flexDirection: isUltraWide ? "row" : "column", alignItems: isUltraWide ? "center" : "stretch", gap: isUltraWide ? 24 : 12, flexShrink: 0, paddingLeft: isUltraWide ? 12 : 0, marginTop: isUltraWide ? 0 : 16 }}>
                    {isUltraWide && <View style={styles.statDividerSingle} />}
                    <View style={{ gap: 6, justifyContent: "center", width: isUltraWide ? 300 : "100%" }}>
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
                            !isUltraWide && { flexDirection: "column", gap: 10, alignItems: "stretch" }
                        ]}>
                            {/* Search */}
                            <View style={[styles.webSearchInputWrapper, !isUltraWide && { width: "100%" }]}>
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
                                !isUltraWide && { width: "100%" }
                            ]}>
                                {/* Payment filter */}
                                <View style={[{ position: "relative", zIndex: 1000 }, windowWidth < 550 && { width: "100%" }]}>
                                    <TouchableOpacity
                                        style={styles.webSelectBox}
                                        onPress={() => setOpenDropdown(openDropdown === "payment" ? null : "payment")}
                                    >
                                        <Text style={styles.webSelectText}>{filterPayment === "All" ? "All Payments" : filterPayment}</Text>
                                        <Feather name="chevron-down" size={14} color={TEXT_MUTED} />
                                    </TouchableOpacity>
                                    {openDropdown === "payment" && (
                                        <View style={[styles.webDropdownMenu, !isWideWeb && { position: "relative", top: 0, marginTop: 4, width: "100%", zIndex: 1 }]}>
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
                                <View style={[{ position: "relative", zIndex: 999 }, windowWidth < 550 && { width: "100%" }]}>
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
                                        <View style={[styles.webDropdownMenu, { width: 180 }, !isWideWeb && { position: "relative", top: 0, marginTop: 4, width: "100%", zIndex: 1 }]}>
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
                                <View style={[{ position: "relative", zIndex: 998 }, windowWidth < 550 && { width: "100%" }]}>
                                    <TouchableOpacity
                                        style={styles.webSelectBox}
                                        onPress={() => setOpenDropdown(openDropdown === "priority" ? null : "priority")}
                                    >
                                        <Text style={styles.webSelectText}>{sortPriority}</Text>
                                        <Feather name="chevron-down" size={14} color={TEXT_MUTED} />
                                    </TouchableOpacity>
                                    {openDropdown === "priority" && (
                                        <View style={[styles.webDropdownMenu, { width: 170 }, !isWideWeb && { position: "relative", top: 0, marginTop: 4, width: "100%", zIndex: 1 }]}>
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
                                <View style={[{ flexDirection: "column", gap: 8 }, windowWidth < 550 && { width: "100%" }]}>
                                    {/* Export row: button + >=4d side by side */}
                                    <View style={{ flexDirection: "row", gap: 8 }}>
                                        {/* Export All Dropdown trigger only (fixed width, not flex) */}
                                        <ExportDropdown onExport={handleExport} isWeb={isWideWeb} isOpen={openDropdown === "export"} onToggle={() => setOpenDropdown(openDropdown === "export" ? null : "export")} />

                                        {/* Export >=4d button */}
                                        <TouchableOpacity
                                            style={[styles.webExportBtn, { backgroundColor: "#ef4444" }]}
                                            onPress={() => void downloadBackendExport("pending", 4)}
                                        >
                                            <Feather name="clock" size={14} color="#fff" />
                                            <Text style={styles.webExportBtnText}>Export &gt;=4d</Text>
                                        </TouchableOpacity>
                                    </View>
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
                    ) : isWideWeb ? (
                        <View style={{ width: "100%" }}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ minWidth: "100%" }}>
                                <View style={styles.tableContainer}>
                                    <View style={styles.tableHeaderRow}>
                                        <Text style={[styles.tableHeaderCell, { flex: 1.4 }]}>Order</Text>
                                        <Text style={[styles.tableHeaderCell, { flex: 2.2 }]}>Seller</Text>
                                        <Text style={[styles.tableHeaderCell, { flex: 1.4 }]}>Customer Paid{"\n"}<Text style={{ fontSize: 9, textTransform: "none", fontWeight: "500" }}>(order+total_amount)</Text></Text>
                                        <Text style={[styles.tableHeaderCell, { flex: 1.3 }]}>Delivery Date</Text>
                                        <Text style={[styles.tableHeaderCell, { flex: 1.1 }]}>Reminder</Text>
                                        <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Payment Status</Text>
                                        <Text style={[styles.tableHeaderCell, { flex: 1.0 }]}>Wallet Balance</Text>
                                        <Text style={[styles.tableHeaderCell, { flex: 1.8 }]}>Actions</Text>
                                    </View>
                                    {filtered.map(order => {
                                        const payStyle = getPaymentStyle(order.paymentStatus);
                                        let remBg = "#10b981";
                                        if (order.reminderBucket === "orange") remBg = "#f59e0b";
                                        if (order.reminderBucket === "red") remBg = "#ef4444";

                                        return (
                                            <View key={order.id} style={[styles.tableRow, { alignItems: "center" }]}>
                                                {/* Order */}
                                                <View style={{ flex: 1.4 }}>
                                                    <Text style={{ fontWeight: "700", color: PRIMARY, fontSize: 13 }}>{order.orderId}</Text>
                                                    <Text style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 2, marginBottom: 4 }}>{order.orderDate}</Text>
                                                    <View style={{ backgroundColor: "#2dd4bf", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: "flex-start" }}>
                                                        <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>{order.orderStatus}</Text>
                                                    </View>
                                                </View>
                                                {/* Seller */}
                                                <View style={{ flex: 2.2 }}>
                                                    <Text style={{ fontWeight: "700", color: TEXT_HEAD, fontSize: 13 }} numberOfLines={1}>{order.sellerName}</Text>
                                                    <Text style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 2 }}>{order.sellerEmail}</Text>
                                                    <Text style={{ color: TEXT_MUTED, fontSize: 11 }}>{order.sellerPhone}</Text>
                                                </View>
                                                {/* Customer Paid */}
                                                <View style={{ flex: 1.4 }}>
                                                    <Text style={{ fontWeight: "700", color: DARK, fontSize: 14 }}>{order.customerPaid}</Text>
                                                </View>
                                                {/* Delivery Date */}
                                                <View style={{ flex: 1.3 }}>
                                                    <Text style={{ color: TEXT_HEAD, fontSize: 13 }}>{order.deliveryDate}</Text>
                                                    <Text style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 2 }}>{order.deliveryTime}</Text>
                                                </View>
                                                {/* Reminder */}
                                                <View style={{ flex: 1.1 }}>
                                                    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: remBg, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 4, alignSelf: "flex-start", gap: 4 }}>
                                                        <Feather name="clock" size={10} color="#fff" />
                                                        <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{order.reminderLabel}</Text>
                                                    </View>
                                                </View>
                                                {/* Payment Status */}
                                                <View style={{ flex: 1.2 }}>
                                                    <View style={[styles.statusBadge, { backgroundColor: payStyle.bg, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 6 }]}>
                                                        <Feather name="clock" size={10} color={payStyle.color} />
                                                        <Text style={[styles.statusText, { color: payStyle.color }]}>{order.paymentStatus}</Text>
                                                    </View>
                                                </View>
                                                {/* Wallet Balance */}
                                                <View style={{ flex: 1.0 }}>
                                                    <Text style={{ fontWeight: "700", color: TEXT_HEAD, fontSize: 13 }}>{order.walletBalance}</Text>
                                                </View>
                                                {/* Actions */}
                                                <View style={{ flex: 1.8, flexDirection: "row", alignItems: "center", gap: 6 }}>
                                                    <TouchableOpacity
                                                        style={[styles.actionBtn, { backgroundColor: "#10b981" }]}
                                                        onPress={() => void openPayModal(order.id)}
                                                    >
                                                        <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700", marginRight: 1 }}>₹</Text>
                                                        <Text style={styles.actionBtnText}>Pay</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[styles.actionBtn, { backgroundColor: "#14b8a6" }]}
                                                        onPress={() => void handleView(order.id)}
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
                                        onPay={(id) => void openPayModal(id)}
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
            ) : (
            <View style={[styles.main, isWeb && styles.mainWeb]}>
                <View style={[styles.scrollArea, styles.scrollContent, !isWeb && { paddingBottom: 20 }]}>
                    <View style={[styles.webFilterSection, { zIndex: 10 }]}>
                        <View style={[styles.webFilterBar, { justifyContent: "space-between" }]}>
                            <Text style={{ fontSize: 14, fontWeight: "700", color: TEXT_HEAD }}>
                                Seller payout requests
                            </Text>
                            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                                {(["All", "Pending", "Closed"] as const).map((option) => (
                                    <TouchableOpacity
                                        key={option}
                                        style={[
                                            styles.webSelectBox,
                                            requestFilter === option && { borderColor: PRIMARY, backgroundColor: PRIMARY_LIGHT },
                                        ]}
                                        onPress={() => setRequestFilter(option)}
                                    >
                                        <Text style={[styles.webSelectText, requestFilter === option && { color: PRIMARY, fontWeight: "700" }]}>
                                            {option}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>

                    {(requestsLoading || authLoading) && (
                        <ActivityIndicator size="large" color={PRIMARY} style={{ marginVertical: 24 }} />
                    )}
                    {requestsError && (
                        <View style={{ marginBottom: 12, gap: 8 }}>
                            <Text style={{ color: "#DC2626", fontSize: 13 }}>{requestsError}</Text>
                            <TouchableOpacity style={styles.exportBtn} onPress={() => void loadRequests()}>
                                <Text style={styles.exportBtnText}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <Text style={styles.resultCount}>
                        Showing <Text style={{ color: PRIMARY, fontWeight: "700" }}>{requests.length}</Text> of {requestTotalElements} requests
                    </Text>

                    {!requestsLoading && !requestsError && requests.length === 0 ? (
                        <View style={styles.empty}>
                            <Feather name="inbox" size={44} color={TEXT_MUTED} />
                            <Text style={styles.emptyTitle}>No payout requests</Text>
                        </View>
                    ) : (
                        <View style={{ gap: 12 }}>
                            {requests.map((item) => (
                                <PayoutRequestCard
                                    key={item.id}
                                    item={item}
                                    statusDraft={requestStatusDrafts[item.id] ?? ""}
                                    onStatusChange={(text) =>
                                        setRequestStatusDrafts((prev) => ({ ...prev, [item.id]: text }))
                                    }
                                    onClose={() => void handleCloseRequest(item.id)}
                                    closing={closingRequestId === item.id}
                                />
                            ))}
                        </View>
                    )}

                    {!requestsLoading && !requestsError && requests.length > 0 && (
                        <Pagination
                            currentPage={requestPage}
                            totalPages={requestTotalPages}
                            totalItems={requestTotalElements}
                            itemsPerPage={REQUESTS_PAGE_SIZE}
                            itemName="requests"
                            onPageChange={setRequestPage}
                        />
                    )}
                </View>
            </View>
            )}
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
                    isWeb={isWideWeb}
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
        marginHorizontal: 2,
        marginTop: 12,
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

    tabBar: {
        flexDirection: "row",
        gap: 8,
        marginHorizontal: 16,
        marginTop: -36,
        marginBottom: 12,
        zIndex: 20,
        backgroundColor: BG_CARD,
        borderRadius: 12,
        padding: 6,
        borderWidth: 1,
        borderColor: BORDER,
        alignSelf: "flex-start",
        shadowColor: DARK,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
    },
    tabBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 8,
    },
    tabBtnActive: { backgroundColor: PRIMARY_LIGHT },
    tabBtnText: { fontSize: 13, fontWeight: "600", color: TEXT_MUTED },
    tabBtnTextActive: { color: PRIMARY, fontWeight: "800" },
    tabBadge: {
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: "#ef4444",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 4,
    },
    tabBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
    alertStack: { gap: 8, marginHorizontal: 16, marginBottom: 8 },
    alertBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    alertBannerText: { flex: 1, fontSize: 12, fontWeight: "600" },
    requestCard: {
        backgroundColor: BG_CARD,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: BORDER,
        padding: 14,
        gap: 8,
    },
    requestCardTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
    requestOrder: { fontSize: 14, fontWeight: "800", color: PRIMARY },
    requestSeller: { fontSize: 14, fontWeight: "700", color: TEXT_HEAD, marginTop: 2 },
    requestMeta: { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
    requestAmount: { fontSize: 16, fontWeight: "800", color: DARK },
    requestNote: { fontSize: 12, color: TEXT_BODY, fontStyle: "italic" },
    requestCloseRow: { flexDirection: "row", gap: 8, alignItems: "center", marginTop: 6 },
    closeRequestBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#1a7a45",
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderRadius: 10,
        minWidth: 96,
        justifyContent: "center",
    },
    closeRequestBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
    closedStatusBox: {
        marginTop: 4,
        backgroundColor: "#f8fafc",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: BORDER,
        padding: 12,
        gap: 4,
    },
    closedStatusLabel: { fontSize: 10, fontWeight: "800", color: TEXT_MUTED, textTransform: "uppercase" },
    closedStatusText: { fontSize: 13, fontWeight: "600", color: TEXT_HEAD },

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
        marginTop: 0,
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
        width: "100%",
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