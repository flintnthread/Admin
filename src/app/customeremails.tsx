/**

 * customeremails.tsx

 * -----------------------------------------------------------------------

 * Fully responsive "Customer Emails" admin screen for Flint & Thread.

 * Breakpoints tuned for: 320 / 375 / 425 (mobile) · 768 (tablet)

 *                         1024 / 1440 / 2560 (laptop/desktop/wide)

 *

 * UI ONLY — no backend / API calls. All data below is mock data so the

 * screen can be dropped in and viewed immediately. Wire up your own

 * fetch/send handlers where marked "// TODO: connect to API".

 *

 * Icons: Feather (from @expo/vector-icons)

 * -----------------------------------------------------------------------

 */



import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
    Animated,

    Modal,

    Platform,

    Pressable,

    ScrollView,

    StyleSheet,

    Text,

    TextInput,

    TouchableOpacity,

    useWindowDimensions,

    View
} from 'react-native';



import AdminLayout from '@/components/admin-layout';
import Pagination from '@/components/Pagination';



import { getApiErrorMessage } from '@/lib/api/client';

import { formatDate } from '@/lib/format';
import { sweetError, sweetSuccess } from '@/lib/sweetAlert';

import { fetchCustomers } from '@/services/customerApi';

import { sendCustomerEmails } from '@/services/emailApi';

import { Feather } from '@expo/vector-icons';



// ---------------------------------------------------------------------------

// Design tokens

// ---------------------------------------------------------------------------

const COLORS = {

    navy: "#151D4F",

    navySoft: "#152238",

    orange: "#F97316",

    orangeDark: "#EA580C",

    bg: "#F8FAFC",

    card: "#FFFFFF",

    surface: "#FFFFFF",

    border: "#E2E8F0",

    text: "#1E293B",

    textMuted: "#64748B",

    textFaint: "#94A3B8",

    muted: "#8B8FA3",

    emerald: "#059669",

    emeraldBg: "#ECFDF5",

    rose: "#E11D48",

    roseBg: "#FFF1F2",

    amber: "#D97706",

    amberBg: "#FFFBEB",

    orangeBg: "#FFF7ED",

    slate: '#64748B',

    slateSoft: '#F1F5F9',

    infoSoft: '#EFF6FF',

    infoText: '#3B82F6',

    white: '#ffffff',

    primary: "#F97316",

    primaryDark: "#EA580C",

    primarySoft: "#FDE7DA",

    chipBg: "#FBEFE6",

};



// ---------------------------------------------------------------------------

// Mock data — replace with API response

// ---------------------------------------------------------------------------

type Customer = {

    id: number;

    name: string;

    email: string;

    mobile: string;

    registeredOn: string;

};



function mapCustomerRow(c: { id: number; name?: string; email?: string; phone?: string; createdAt?: string; lastOrderAt?: string }): Customer {

    return {

        id: c.id,

        name: c.name ?? 'Customer',

        email: c.email ?? '',

        mobile: c.phone ?? '',

        registeredOn: formatDate(c.createdAt ?? c.lastOrderAt),

    };

}



// ---------------------------------------------------------------------------

// Responsive helpers

// ---------------------------------------------------------------------------

type BP = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';



function useBreakpoint(): { bp: BP; width: number; columns: number; isCompact: boolean } {

    const { width } = useWindowDimensions();

    let bp: BP = 'xs';

    if (width >= 2000) bp = 'xxl';

    else if (width >= 1440) bp = 'xl';

    else if (width >= 1024) bp = 'lg';

    else if (width >= 768) bp = 'md';

    else if (width >= 425) bp = 'sm';

    else bp = 'xs';



    const columns = bp === 'xxl' ? 4 : bp === 'xl' ? 3 : bp === 'lg' ? 1 /* table */ : bp === 'md' ? 2 : 1;

    const isCompact = bp === 'xs' || bp === 'sm';

    return { bp, width, columns, isCompact };

}



// Clamp helper for fluid sizing between two breakpoints

const clamp = (min: number, val: number, max: number) => Math.min(Math.max(val, min), max);



const initials = (name: string) =>

    name

        .trim()

        .split(/\s+/)

        .slice(0, 2)

        .map((n) => n[0]?.toUpperCase())

        .join('');



// Icons use Feather from @expo/vector-icons (same as seller-emails.tsx)



// ---------------------------------------------------------------------------

// Main component

// ---------------------------------------------------------------------------

export default function CustomerEmailsScreen() {

    const { bp, width, isCompact } = useBreakpoint();

    const [customers, setCustomers] = useState<Customer[]>([]);

    const [loading, setLoading] = useState(true);

    const [loadError, setLoadError] = useState<string | null>(null);

    const [query, setQuery] = useState('');

    const [singleTarget, setSingleTarget] = useState<Customer | null>(null);

    const [bulkOpen, setBulkOpen] = useState(false);

    const [subject, setSubject] = useState('');

    const [message, setMessage] = useState('');



    // ---- Toast -------------------------------------------------------

    const [toastVisible, setToastVisible] = useState(false);

    const [toastMsg, setToastMsg] = useState('');

    const toastSlide = useRef(new Animated.Value(400)).current;



    const showToast = (msg: string) => {

        setToastMsg(msg);

        setToastVisible(true);

        toastSlide.setValue(400);

        Animated.timing(toastSlide, { toValue: 0, duration: 380, useNativeDriver: true }).start();

        setTimeout(() => {

            Animated.timing(toastSlide, { toValue: 400, duration: 320, useNativeDriver: true })

                .start(() => setToastVisible(false));

        }, 3000);

    };

    // ------------------------------------------------------------------



    useEffect(() => {

        let cancelled = false;

        (async () => {

            setLoading(true);

            setLoadError(null);

            try {

                const page = await fetchCustomers(undefined, 0, 100);

                if (cancelled) return;

                setCustomers((page.items ?? []).map((c) => mapCustomerRow(c as Customer & { phone?: string; createdAt?: string; lastOrderAt?: string })));

            } catch (e) {

                if (!cancelled) setLoadError(getApiErrorMessage(e, 'Failed to load customers.'));

            } finally {

                if (!cancelled) setLoading(false);

            }

        })();

        return () => {

            cancelled = true;

        };

    }, []);



    const filtered = useMemo(() => {

        const q = query.trim().toLowerCase();

        if (!q) return customers;

        return customers.filter(

            (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.mobile.includes(q)

        );

    }, [query, customers]);



    const [currentPage, setCurrentPage] = useState(1);

    const itemsPerPage = 10;

    const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));

    const paginatedCustomers = useMemo(() => {

        return filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    }, [filtered, currentPage, itemsPerPage]);



    useEffect(() => { setCurrentPage(1); }, [query]);



    const openSingle = (c: Customer) => {

        setSubject('');

        setMessage('');

        setSingleTarget(c);

    };

    const openBulk = () => {

        setSubject('');

        setMessage('');

        setBulkOpen(true);

    };

    const closeModals = () => {

        setSingleTarget(null);

        setBulkOpen(false);

    };

    const handleSend = async () => {

        try {

            if (bulkOpen) {

                await sendCustomerEmails({ subject, message, sendAll: true });

            } else if (singleTarget) {

                await sendCustomerEmails({ subject, message, recipients: [singleTarget.id] });

            }

            closeModals();

            void sweetSuccess('Sent!', 'Email sent successfully.');

        } catch (e) {

            void sweetError('Error', getApiErrorMessage(e, 'Failed to send email.'));

        }

    };



    const gutter = clamp(16, width * 0.03, 40);



    return (

        <AdminLayout>

            <View style={{ flex: 1, backgroundColor: COLORS.bg }}>

                <ScrollView contentContainerStyle={[styles.pageInner, { paddingHorizontal: 16 }]}>

                    {/* Header */}

                    <View style={[styles.hero, isCompact && styles.heroMobile]}>

                        <View style={styles.heroTopRow}>

                            <View style={{ flexDirection: "row", alignItems: "center", gap: isCompact ? 8 : 12, flex: 1, marginRight: 8 }}>

                                <View style={styles.heroIconBadge}>

                                    <Feather name="mail" size={18} color="#fff" />

                                </View>

                                <View style={{ flex: 1 }}>

                                    <Text style={styles.heroTitle}>Customer Emails</Text>

                                    <Text style={styles.heroSubtitle} numberOfLines={2}>Manage and send emails to customers</Text>

                                </View>

                            </View>

                            {!isCompact && (

                                <TouchableOpacity

                                    style={styles.addHeaderBtn}

                                    onPress={openBulk}

                                >

                                    <Feather name="mail" size={15} color="#fff" />

                                    <Text style={styles.addHeaderBtnText}>Send to All</Text>

                                </TouchableOpacity>

                            )}

                        </View>

                        <View style={isCompact ? styles.headerCardSpacerMobile : styles.headerCardSpacer} />

                    </View>



                    {/* Search + total strip */}

                    <View style={[styles.searchStrip, isCompact && styles.searchStripMobile]}>

                        <View style={styles.searchInputWrap}>

                            <Feather name="search" size={16} color={COLORS.textFaint} />

                            <TextInput

                                style={styles.searchInput}

                                placeholder="Search customers..."

                                placeholderTextColor={COLORS.textFaint}

                                value={query}

                                onChangeText={setQuery}

                            />

                        </View>

                        <View style={styles.totalBadge}>

                            <Text style={styles.totalBadgeText}>{filtered.length} Customers</Text>

                        </View>

                    </View>



                    {/* Results count (search feedback) */}

                    {query.length > 0 && (

                        <Text style={styles.resultsHint}>

                            Showing {filtered.length} of {customers.length}

                        </Text>

                    )}



                    {loading ? (

                        <Text style={styles.resultsHint}>Loading customers…</Text>

                    ) : loadError ? (

                        <Text style={[styles.resultsHint, { color: COLORS.rose }]}>{loadError}</Text>

                    ) : null}



                    {/* Content: table on lg+, cards otherwise */}

                    {!loading && !loadError && (bp === 'lg' || bp === 'xl' || bp === 'xxl' ? (

                        <TableView data={paginatedCustomers} onSend={openSingle} />

                    ) : bp === 'md' ? (

                        <CardGrid data={paginatedCustomers} onSend={openSingle} columns={2} />

                    ) : (

                        <CardGrid data={paginatedCustomers} onSend={openSingle} columns={1} />

                    ))}



                    {!loading && !loadError && filtered.length > 0 && (

                        <Pagination

                            currentPage={currentPage}

                            totalPages={totalPages}

                            totalItems={filtered.length}

                            itemsPerPage={itemsPerPage}

                            itemName="customers"

                            onPageChange={setCurrentPage}

                        />

                    )}



                    {!loading && !loadError && filtered.length === 0 && (

                        <View style={styles.emptyState}>

                            <Feather name="search" size={28} color={COLORS.muted} />

                            <Text style={styles.emptyTitle}>No customers found</Text>

                            <Text style={styles.emptySub}>Try a different name, email, or mobile number.</Text>

                        </View>

                    )}

                </ScrollView>

            </View>



            {/* Single-customer send modal */}

            <SendModal

                visible={!!singleTarget}

                title="Send Email"

                icon="send"

                info={

                    singleTarget ? (

                        <View style={styles.toField}>

                            <Text style={styles.toLabel}>To: </Text>

                            <Text style={styles.toValue}>

                                {singleTarget.name} ({singleTarget.email})

                            </Text>

                        </View>

                    ) : null

                }

                subject={subject}

                message={message}

                onSubject={setSubject}

                onMessage={setMessage}

                onCancel={closeModals}

                onSend={handleSend}

                sendLabel="Send Email"

                isCompact={isCompact}

            />



            <SendModal

                visible={bulkOpen}

                title="Send Email to All Customers"

                icon="mail"

                info={

                    <View style={styles.noticeBox}>

                        <Feather name="info" size={15} color={COLORS.primary} />

                        <Text style={styles.noticeText}>

                            This email will be sent to all <Text style={{ fontWeight: '700' }}>{customers.length} registered customers</Text>.

                        </Text>

                    </View>

                }

                subject={subject}

                message={message}

                onSubject={setSubject}

                onMessage={setMessage}

                onCancel={closeModals}

                onSend={handleSend}

                sendLabel="Send to All"

                isCompact={isCompact}

            />



            {/* ---- Sliding Green Toast ---- */}

            {toastVisible && (

                <View style={styles.toastContainer} pointerEvents="none">

                    <Animated.View

                        style={[styles.toast, { transform: [{ translateX: toastSlide }] }]}

                    >

                        <Text style={styles.toastText}>{toastMsg}</Text>

                    </Animated.View>

                </View>

            )}

        </AdminLayout>

    );

}







// ---------------------------------------------------------------------------

// Table view — laptop / desktop / wide

// ---------------------------------------------------------------------------

function TableView({ data, onSend }: { data: Customer[]; onSend: (c: Customer) => void }) {

    return (

        <View style={styles.tableCard}>

            <View style={styles.tableHeaderRow}>

                <Text style={[styles.tableHeaderCell, { flex: 0.6 }]}>ID</Text>

                <Text style={[styles.tableHeaderCell, { flex: 1.6 }]}>Name</Text>

                <Text style={[styles.tableHeaderCell, { flex: 2.4 }]}>Email</Text>

                <Text style={[styles.tableHeaderCell, { flex: 1.3 }]}>Mobile</Text>

                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Registered On</Text>

                <Text style={[styles.tableHeaderCell, { flex: 1.4, textAlign: 'right' }]}>Action</Text>

            </View>



            {data.map((c, idx) => (

                <View key={c.id} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>

                    <Text style={[styles.td, styles.tdMuted, { flex: 0.6 }]}>{c.id}</Text>

                    <View style={{ flex: 1.6, flexDirection: 'row', alignItems: 'center' }}>

                        <View style={styles.avatarSmall}>

                            <Text style={styles.avatarSmallText}>{initials(c.name)}</Text>

                        </View>

                        <Text style={styles.tdStrong} numberOfLines={1}>{c.name}</Text>

                    </View>

                    <View style={{ flex: 2.4, flexDirection: 'row', alignItems: 'center' }}>

                        <Text style={styles.td} numberOfLines={1}>{c.email}</Text>

                    </View>

                    <Text style={[styles.td, { flex: 1.3 }]}>{c.mobile}</Text>

                    <View style={{ flex: 1.5, flexDirection: 'row', alignItems: 'center' }}>

                        <Feather name="calendar" size={13} color={COLORS.muted} />

                        <Text style={styles.td}> {c.registeredOn}</Text>

                    </View>

                    <View style={{ flex: 1.4, alignItems: 'flex-end' }}>

                        <Pressable

                            onPress={() => onSend(c)}

                            style={({ pressed }) => [styles.rowActionBtn, pressed && { opacity: 0.85 }]}

                        >

                            <Feather name="send" size={12} color="#fff" />

                            <Text style={styles.rowActionText}>Send Email</Text>

                        </Pressable>

                    </View>

                </View>

            ))}

        </View>

    );

}



// ---------------------------------------------------------------------------

// Card grid — mobile / tablet

// ---------------------------------------------------------------------------

function CardGrid({ data, onSend, columns }: { data: Customer[]; onSend: (c: Customer) => void; columns: 1 | 2 }) {

    return (

        <View style={[styles.grid, columns === 2 && styles.gridTwoCol]}>

            {data.map((c) => (

                <View key={c.id} style={[styles.card, columns === 2 ? styles.cardHalf : styles.cardFull]}>

                    <View style={styles.cardTopRow}>

                        <View style={styles.avatarMed}>

                            <Text style={styles.avatarMedText}>{initials(c.name)}</Text>

                        </View>

                        <View style={{ flex: 1 }}>

                            <Text style={styles.cardName} numberOfLines={1}>{c.name}</Text>

                            <Text style={styles.cardId}>ID #{c.id}</Text>

                        </View>

                    </View>



                    <View style={styles.cardDetailRow}>

                        <Text style={styles.cardDetailText} numberOfLines={1}>{c.email}</Text>

                    </View>

                    <View style={styles.cardDetailRow}>

                        <Feather name="phone" size={13} color={COLORS.primary} />

                        <Text style={styles.cardDetailText}>{c.mobile}</Text>

                    </View>

                    <View style={styles.cardDetailRow}>

                        <Feather name="calendar" size={13} color={COLORS.primary} />

                        <Text style={styles.cardDetailText}>Registered {c.registeredOn}</Text>

                    </View>



                    <Pressable

                        onPress={() => onSend(c)}

                        style={({ pressed }) => [styles.cardActionBtn, pressed && { opacity: 0.85 }]}

                    >

                        <Feather name="send" size={13} color="#fff" />

                        <Text style={styles.rowActionText}>Send Email</Text>

                    </Pressable>

                </View>

            ))}

        </View>

    );

}



// ---------------------------------------------------------------------------

// Shared send modal (single + bulk)

// ---------------------------------------------------------------------------

function SendModal({

    visible,

    title,

    icon,

    info,

    subject,

    message,

    onSubject,

    onMessage,

    onCancel,

    onSend,

    sendLabel,

    isCompact,

}: {

    visible: boolean;

    title: string;

    icon: string;

    info: React.ReactNode;

    subject: string;

    message: string;

    onSubject: (v: string) => void;

    onMessage: (v: string) => void;

    onCancel: () => void;

    onSend: () => void;

    sendLabel: string;

    isCompact: boolean;

}) {

    return (

        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>

            <View style={styles.modalBackdrop}>

                <View style={[styles.modalCard, isCompact && styles.modalCardCompact]}>

                    <View style={styles.modalHeader}>

                        <View style={styles.modalHeaderTitleRow}>

                            <View style={styles.modalIconBadge}>

                                <Feather name="send" size={14} color={COLORS.orange} />

                            </View>

                            <Text style={styles.modalHeaderTitle}>{title}</Text>

                        </View>

                        <Pressable onPress={onCancel} hitSlop={8}>

                            <Feather name="x" size={20} color={COLORS.textMuted} />

                        </Pressable>

                    </View>



                    <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 8 }}>

                        {info}



                        <Text style={styles.fieldLabel}>Subject</Text>

                        <TextInput

                            value={subject}

                            onChangeText={onSubject}

                            placeholder="Enter email subject"

                            placeholderTextColor={COLORS.muted}

                            style={styles.textInput}

                        />



                        <Text style={styles.fieldLabel}>Message</Text>

                        <TextInput

                            value={message}

                            onChangeText={onMessage}

                            placeholder="Enter your message (HTML supported)"

                            placeholderTextColor={COLORS.muted}

                            style={[styles.textInput, styles.textArea]}

                            multiline

                            textAlignVertical="top"

                        />

                        <Text style={styles.helperText}>You can use HTML tags for formatting</Text>

                    </ScrollView>



                    <View style={styles.modalFooter}>

                        <Pressable onPress={onCancel} style={({ pressed }) => [styles.ghostBtn, pressed && { opacity: 0.8 }]}>

                            <Feather name="x" size={13} color={COLORS.navySoft} />

                            <Text style={styles.ghostBtnText}>Cancel</Text>

                        </Pressable>

                        <Pressable onPress={onSend} style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}>

                            <Feather name="send" size={14} color="#fff" />

                            <Text style={styles.primaryBtnText}>{sendLabel}</Text>

                        </Pressable>

                    </View>

                </View>

            </View>

        </Modal>

    );

}



// ---------------------------------------------------------------------------

// Styles

// ---------------------------------------------------------------------------

const styles = StyleSheet.create({

    screen: { flex: 1, backgroundColor: COLORS.bg },



    // Page

    pageInner: { paddingTop: 22, paddingBottom: 48 },

    headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18, gap: 12 },

    headerRowCompact: { alignItems: 'center' },

    pageTitle: { fontSize: 24, fontWeight: '800', color: COLORS.navy },

    breadcrumbRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },

    breadcrumbText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },

    breadcrumbSep: { color: COLORS.muted, fontSize: 12 },

    breadcrumbTextActive: { color: COLORS.muted, fontSize: 12 },



    // Hero header (from seller-emails.tsx)

    hero: { backgroundColor: COLORS.navy, borderRadius: 20, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 0, overflow: "visible", zIndex: 1 },

    heroMobile: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 0 },

    heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },

    heroIconBadge: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.orange, alignItems: "center", justifyContent: "center" },

    heroTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },

    heroSubtitle: { color: "#94A3B8", fontSize: 12, marginTop: 2, fontWeight: "400" },

    headerCardSpacer: { height: 38 },

    headerCardSpacerMobile: { height: 40 },

    addHeaderBtn: {

        flexDirection: "row",

        alignItems: "center",

        gap: 6,

        backgroundColor: COLORS.orange,

        borderRadius: 10,

        paddingVertical: 8,

        paddingHorizontal: 14,

        shadowColor: COLORS.orange,

        shadowOpacity: 0.25,

        shadowRadius: 4,

        shadowOffset: { width: 0, height: 2 },

        elevation: 3,

    },

    addHeaderBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },



    // Search strip (from seller-emails.tsx)

    searchStrip: {

        flexDirection: 'row',

        alignItems: 'center',

        marginTop: 16,

        paddingHorizontal: 4,

        gap: 14,

        zIndex: 10,

    },

    searchStripMobile: {

        flexDirection: 'column',

        alignItems: 'stretch',

        gap: 10,

        marginTop: 16,

    },

    searchInputWrap: {

        flex: 1,

        flexDirection: 'row',

        alignItems: 'center',

        gap: 8,

        backgroundColor: COLORS.card,

        borderWidth: 1,

        borderColor: "#F1F5F9",

        borderRadius: 14,

        paddingHorizontal: 14,

        paddingVertical: Platform.OS === 'web' ? 12 : 10,

        shadowColor: "#0F172A",

        shadowOpacity: 0.1,

        shadowRadius: 10,

        shadowOffset: { width: 0, height: 5 },

        elevation: 3,

    },

    searchInput: {

        flex: 1,

        fontSize: 14,

        color: COLORS.text,

        outlineStyle: 'none',

    } as any,

    totalBadge: {

        flexDirection: 'row',

        alignItems: 'center',

        gap: 7,

        backgroundColor: COLORS.card,

        borderWidth: 1,

        borderColor: "#F1F5F9",

        paddingHorizontal: 14,

        paddingVertical: 12,

        borderRadius: 14,

        shadowColor: "#0F172A",

        shadowOpacity: 0.1,

        shadowRadius: 10,

        shadowOffset: { width: 0, height: 5 },

        elevation: 3,

    },

    totalBadgeText: {

        color: COLORS.navy,

        fontSize: 13,

        fontWeight: '700',

    },



    primaryBtn: {

        flexDirection: 'row', alignItems: 'center', gap: 8,

        backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 11,

        borderRadius: 10,

    },

    primaryBtnCompact: { paddingHorizontal: 12, paddingVertical: 9 },

    primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },



    toolRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },

    toolRowCompact: { flexDirection: 'row' },

    searchBox: {

        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,

        backgroundColor: COLORS.surface,

        borderRadius: 10, paddingHorizontal: 14, height: 44,

    },

    totalChip: {

        flexDirection: 'row', alignItems: 'center', gap: 6,

        backgroundColor: COLORS.chipBg, borderRadius: 10, paddingHorizontal: 14, height: 44,

    },

    totalChipText: { color: COLORS.primaryDark, fontWeight: '700', fontSize: 12 },

    resultsHint: { color: COLORS.muted, fontSize: 12, marginBottom: 10 },



    // Table (lg+)

    tableCard: {

        backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,

        overflow: 'hidden', marginTop: 8,

    },

    tableRow: {

        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14,

        borderBottomWidth: 1, borderBottomColor: COLORS.border,

    },

    tableHeaderRow: {

        flexDirection: 'row',

        backgroundColor: COLORS.navy,

        paddingVertical: 12,

        paddingHorizontal: 18,

        borderBottomWidth: 1,

        borderBottomColor: "#E5E7EB",

    },

    tableHeaderCell: {

        fontSize: 11,

        fontWeight: '600',

        color: "#fff",

    },

    tableRowAlt: { backgroundColor: '#FCFBF8' },

    th: { fontSize: 11, fontWeight: '700', color: '#1C2439', textTransform: 'uppercase', letterSpacing: 0.4 },

    td: { fontSize: 13, color: COLORS.navySoft },

    tdStrong: { fontSize: 13, color: COLORS.navy, fontWeight: '700' },

    tdMuted: { color: COLORS.muted },

    rowActionBtn: {

        flexDirection: 'row', alignItems: 'center', gap: 6,

        backgroundColor: '#F97316', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,

    },

    rowActionText: { color: '#fff', fontWeight: '700', fontSize: 11 },



    // Avatars

    avatarSmall: {

        width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primarySoft,

        alignItems: 'center', justifyContent: 'center', marginRight: 10,

    },

    avatarSmallText: { color: COLORS.primaryDark, fontWeight: '700', fontSize: 11 },

    avatarMed: {

        width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primarySoft,

        alignItems: 'center', justifyContent: 'center', marginRight: 12,

    },

    avatarMedText: { color: COLORS.primaryDark, fontWeight: '700', fontSize: 14 },



    // Card grid (mobile / tablet)

    grid: { marginTop: 8, gap: 12 },

    gridTwoCol: { flexDirection: 'row', flexWrap: 'wrap' },

    card: {

        backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,

        padding: 16, marginBottom: 12,

    },

    cardFull: { width: '100%' },

    cardHalf: { width: '48.5%' },

    cardTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },

    cardName: { fontSize: 15, fontWeight: '700', color: COLORS.navy },

    cardId: { fontSize: 11, color: COLORS.muted, marginTop: 1 },

    cardDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },

    cardDetailText: { fontSize: 12.5, color: COLORS.navySoft, flexShrink: 1 },

    cardActionBtn: {

        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,

        backgroundColor: '#F97316', paddingVertical: 11, borderRadius: 9, marginTop: 6,

    },



    // Empty state

    emptyState: { alignItems: 'center', paddingVertical: 48, gap: 6 },

    emptyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.navy, marginTop: 6 },

    emptySub: { fontSize: 12, color: COLORS.muted },



    // Modal

    modalBackdrop: {

        flex: 1, backgroundColor: 'rgba(20,20,25,0.55)', alignItems: 'center', justifyContent: 'center', padding: 16,

    },

    modalCard: {

        width: '100%', maxWidth: 560, maxHeight: '86%', backgroundColor: COLORS.surface,

        borderRadius: 16, overflow: 'hidden',

    },

    modalCardCompact: { maxWidth: '100%' },

    modalHeader: {

        flexDirection: 'row',

        alignItems: 'center',

        justifyContent: 'space-between',

        paddingHorizontal: 18,

        paddingVertical: 16,

        backgroundColor: '#F97316',

        borderBottomWidth: 1,

        borderBottomColor: '#F1F5F9',

    },

    modalHeaderTitleRow: {

        flexDirection: 'row',

        alignItems: 'center',

        gap: 8,

    },

    modalIconBadge: {

        width: 32,

        height: 32,

        borderRadius: 8,

        backgroundColor: COLORS.orangeBg,

        alignItems: 'center',

        justifyContent: 'center',

    },

    modalHeaderTitle: {

        color: COLORS.navy,

        fontSize: 16,

        fontWeight: '700',

    },

    modalTitle: { color: '#fff', fontWeight: '700', fontSize: 15, marginLeft: 8 },

    modalBody: { paddingHorizontal: 18, paddingTop: 16 },

    toField: {

        flexDirection: 'row', flexWrap: 'wrap', backgroundColor: COLORS.bg,

        borderRadius: 10, padding: 12, marginBottom: 14,

    },

    toLabel: { fontWeight: '700', color: COLORS.navy, fontSize: 13 },

    toValue: { color: COLORS.navySoft, fontSize: 13 },

    noticeBox: {

        flexDirection: 'row', alignItems: 'flex-start', gap: 8,

        backgroundColor: '#E9F6F5', borderRadius: 10, padding: 12, marginBottom: 14,

    },

    noticeText: { flex: 1, color: '#2B6660', fontSize: 12.5, lineHeight: 18 },

    fieldLabel: { fontWeight: '700', color: COLORS.navy, fontSize: 12.5, marginBottom: 6, marginTop: 4 },

    textInput: {

        borderWidth: 1, borderColor: COLORS.border, borderRadius: 9,

        paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 8,

        fontSize: 13, color: COLORS.navy, marginBottom: 12, backgroundColor: '#FCFBF9',

    },

    textArea: { minHeight: 120 },

    helperText: { fontSize: 11, color: COLORS.muted, marginTop: -6, marginBottom: 4 },

    modalFooter: {

        flexDirection: 'row', justifyContent: 'center', gap: 10,

        paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: 1, borderTopColor: COLORS.border,

    },

    ghostBtn: {

        flexDirection: 'row', alignItems: 'center', gap: 8,

        backgroundColor: '#1d324e', paddingHorizontal: 16, paddingVertical: 11, borderRadius: 10,

    },

    ghostBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },



    // Toast

    toastContainer: {

        position: 'absolute',

        top: 16,

        left: 0,

        right: 0,

        alignItems: 'center',

        zIndex: 9999,

        pointerEvents: 'none',

    } as any,

    toast: {

        backgroundColor: '#16A34A',

        borderRadius: 12,

        paddingVertical: 14,

        paddingHorizontal: 24,

        flexDirection: 'row',

        alignItems: 'center',

        shadowColor: '#000',

        shadowOffset: { width: 0, height: 4 },

        shadowOpacity: 0.2,

        shadowRadius: 12,

        elevation: 10,

        minWidth: 220,

        maxWidth: 340,

    } as any,

    toastText: {

        color: '#fff',

        fontSize: 14,

        fontWeight: '700',

        flexShrink: 1,

    } as any,

});