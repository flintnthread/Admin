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
 * Icons: react-native-bootstrap-icons
 *   npm install react-native-bootstrap-icons react-native-svg
 * -----------------------------------------------------------------------
 */

import React, { useMemo, useState } from 'react';
import {
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View
} from 'react-native';

import AdminLayout from '@/components/admin-layout';

import Calendar3 from 'react-native-bootstrap-icons/icons/calendar3';
import EnvelopeFill from 'react-native-bootstrap-icons/icons/envelope-fill';
import InfoCircleFill from 'react-native-bootstrap-icons/icons/info-circle-fill';
import PeopleFill from 'react-native-bootstrap-icons/icons/people-fill';
import Search from 'react-native-bootstrap-icons/icons/search';
import Send from 'react-native-bootstrap-icons/icons/telegram';
import Telephone from 'react-native-bootstrap-icons/icons/telephone';
import XLg from 'react-native-bootstrap-icons/icons/x-lg';

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const COLORS = {
    bg: '#F6F4EF',
    surface: '#FFFFFF',
    border: '#ECE6DA',
    navy: '#1C2439',
    navySoft: '#5B6478',
    muted: '#8B8FA3',
    primary: '#E8672C',
    primaryDark: '#C8531F',
    primarySoft: '#FDE7DA',
    danger: '#D64545',
    chipBg: '#FBEFE6',
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

const MOCK_CUSTOMERS: Customer[] = [
    { id: 257, name: 'Sandeep', email: 'sandeepbhosale.5852@gmail.com', mobile: '9209232425', registeredOn: '13 Jun, 2026' },
    { id: 256, name: 'Janu', email: 'jaanujanjanu@gmail.com', mobile: '9491079717', registeredOn: '11 Jun, 2026' },
    { id: 255, name: 'Sai Kiran', email: 'saikiran95730@gmail.com', mobile: '6304797436', registeredOn: '29 May, 2026' },
    { id: 254, name: 'Ajay Singani', email: 'ajaysingani56@gmail.com', mobile: '9912137150', registeredOn: '29 May, 2026' },
    { id: 253, name: 'Aruna Bharati Kumari', email: 'akhilabobby204@gmail.com', mobile: '8897941659', registeredOn: '26 May, 2026' },
    { id: 251, name: 'Sana Shaikh', email: 'attusanshaikh@gmail.com', mobile: '8197481081', registeredOn: '13 May, 2026' },
    { id: 250, name: 'Prateek Awasthi', email: 'techgeek1809@gmail.com', mobile: '9532369294', registeredOn: '11 May, 2026' },
];

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

// ---------------------------------------------------------------------------
// Icon wrapper (keeps every icon call consistent)
// ---------------------------------------------------------------------------
const Ic = ({ icon: IconCmp, size = 16, color = COLORS.navy }: { icon: any; size?: number; color?: string }) => (
    <IconCmp width={size} height={size} color={color} fill={color} />
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function CustomerEmailsScreen() {
    const { bp, width, isCompact } = useBreakpoint();
    const [query, setQuery] = useState('');
    const [singleTarget, setSingleTarget] = useState<Customer | null>(null);
    const [bulkOpen, setBulkOpen] = useState(false);
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');

    const maxContentWidth = bp === 'xxl' ? 1600 : bp === 'xl' ? 1280 : bp === 'lg' ? 1040 : undefined;

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return MOCK_CUSTOMERS;
        return MOCK_CUSTOMERS.filter(
            (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.mobile.includes(q)
        );
    }, [query]);

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
    const handleSend = () => {
        // TODO: connect to API — POST subject/message to selected customer(s)
        closeModals();
    };

    const gutter = clamp(16, width * 0.03, 40);

    return (
        <AdminLayout>
            <ScrollView contentContainerStyle={{ flexGrow: 1, backgroundColor: COLORS.bg }}>
                <View style={[styles.pageInner, { paddingHorizontal: gutter, maxWidth: maxContentWidth, alignSelf: 'center', width: '100%' }]}>
                    {/* Header */}
                    <View style={[styles.headerRow, isCompact && styles.headerRowCompact, { backgroundColor: '#1d324e', padding: 20, borderRadius: 12 }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.pageTitle, { color: '#ffffff' }]}>Customer Emails</Text>

                        </View>

                        <Pressable
                            onPress={openBulk}
                            style={({ pressed }) => [
                                styles.primaryBtn,
                                isCompact && styles.primaryBtnCompact,
                                pressed && { opacity: 0.85 },
                            ]}
                        >
                            <Ic icon={EnvelopeFill} size={15} color="#fff" />
                            <Text style={styles.primaryBtnText}>{isCompact ? 'Mail All' : 'Send Mail to All'}</Text>
                        </Pressable>
                    </View>

                    {/* Search + total */}
                    <View style={[styles.toolRow, isCompact && styles.toolRowCompact]}>
                        <View style={styles.searchBox}>
                            <Ic icon={Search} size={15} color={COLORS.muted} />
                            <TextInput
                                value={query}
                                onChangeText={setQuery}
                                placeholder="Search customers…"
                                placeholderTextColor={COLORS.muted}
                                style={styles.searchInput}
                            />
                        </View>
                        <View style={styles.totalChip}>
                            <Ic icon={PeopleFill} size={14} color={COLORS.primary} />
                            <Text style={styles.totalChipText}>Total: {MOCK_CUSTOMERS.length} Customers</Text>
                        </View>
                    </View>

                    {/* Results count (search feedback) */}
                    {query.length > 0 && (
                        <Text style={styles.resultsHint}>
                            Showing {filtered.length} of {MOCK_CUSTOMERS.length}
                        </Text>
                    )}

                    {/* Content: table on lg+, cards otherwise */}
                    {bp === 'lg' || bp === 'xl' || bp === 'xxl' ? (
                        <TableView data={filtered} onSend={openSingle} />
                    ) : bp === 'md' ? (
                        <CardGrid data={filtered} onSend={openSingle} columns={2} />
                    ) : (
                        <CardGrid data={filtered} onSend={openSingle} columns={1} />
                    )}

                    {filtered.length === 0 && (
                        <View style={styles.emptyState}>
                            <Ic icon={Search} size={28} color={COLORS.muted} />
                            <Text style={styles.emptyTitle}>No customers found</Text>
                            <Text style={styles.emptySub}>Try a different name, email, or mobile number.</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Single-customer send modal */}
            <SendModal
                visible={!!singleTarget}
                title="Send Email"
                icon={Send}
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
                icon={EnvelopeFill}
                info={
                    <View style={styles.noticeBox}>
                        <Ic icon={InfoCircleFill} size={15} color={COLORS.primary} />
                        <Text style={styles.noticeText}>
                            This email will be sent to all <Text style={{ fontWeight: '700' }}>{MOCK_CUSTOMERS.length} registered customers</Text>.
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
        </AdminLayout>
    );
}



// ---------------------------------------------------------------------------
// Table view — laptop / desktop / wide
// ---------------------------------------------------------------------------
function TableView({ data, onSend }: { data: Customer[]; onSend: (c: Customer) => void }) {
    return (
        <View style={styles.tableCard}>
            <View style={[styles.tableRow, styles.tableHeaderRow]}>
                <Text style={[styles.th, { flex: 0.6 }]}>ID</Text>
                <Text style={[styles.th, { flex: 1.6 }]}>Name</Text>
                <Text style={[styles.th, { flex: 2.4 }]}>Email</Text>
                <Text style={[styles.th, { flex: 1.3 }]}>Mobile</Text>
                <Text style={[styles.th, { flex: 1.5 }]}>Registered On</Text>
                <Text style={[styles.th, { flex: 1.4, textAlign: 'right' }]}>Action</Text>
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
                        <Ic icon={EnvelopeFill} size={13} color={COLORS.muted} />
                        <Text style={styles.td} numberOfLines={1}> {c.email}</Text>
                    </View>
                    <Text style={[styles.td, { flex: 1.3 }]}>{c.mobile}</Text>
                    <View style={{ flex: 1.5, flexDirection: 'row', alignItems: 'center' }}>
                        <Ic icon={Calendar3} size={13} color={COLORS.muted} />
                        <Text style={styles.td}> {c.registeredOn}</Text>
                    </View>
                    <View style={{ flex: 1.4, alignItems: 'flex-end' }}>
                        <Pressable
                            onPress={() => onSend(c)}
                            style={({ pressed }) => [styles.rowActionBtn, pressed && { opacity: 0.85 }]}
                        >
                            <Ic icon={Send} size={12} color="#fff" />
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
                        <Ic icon={EnvelopeFill} size={13} color={COLORS.primary} />
                        <Text style={styles.cardDetailText} numberOfLines={1}>{c.email}</Text>
                    </View>
                    <View style={styles.cardDetailRow}>
                        <Ic icon={Telephone} size={13} color={COLORS.primary} />
                        <Text style={styles.cardDetailText}>{c.mobile}</Text>
                    </View>
                    <View style={styles.cardDetailRow}>
                        <Ic icon={Calendar3} size={13} color={COLORS.primary} />
                        <Text style={styles.cardDetailText}>Registered {c.registeredOn}</Text>
                    </View>

                    <Pressable
                        onPress={() => onSend(c)}
                        style={({ pressed }) => [styles.cardActionBtn, pressed && { opacity: 0.85 }]}
                    >
                        <Ic icon={Send} size={13} color="#fff" />
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
    icon: any;
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
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ic icon={icon} size={16} color="#fff" />
                            <Text style={styles.modalTitle}>{title}</Text>
                        </View>
                        <Pressable onPress={onCancel} hitSlop={10}>
                            <Ic icon={XLg} size={16} color="#fff" />
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
                            <Ic icon={XLg} size={13} color={COLORS.navySoft} />
                            <Text style={styles.ghostBtnText}>Cancel</Text>
                        </Pressable>
                        <Pressable onPress={onSend} style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}>
                            <Ic icon={Send} size={14} color="#fff" />
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

    primaryBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 11,
        borderRadius: 10,
    },
    primaryBtnCompact: { paddingHorizontal: 12, paddingVertical: 9 },
    primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

    toolRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
    toolRowCompact: { flexDirection: 'column', alignItems: 'stretch' },
    searchBox: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: COLORS.surface,
        borderRadius: 10, paddingHorizontal: 14, height: 44,
    },
    searchInput: { flex: 1, fontSize: 13, color: COLORS.navy, ...(Platform.OS === 'web' && { outlineStyle: 'none' as any }) },
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
    tableHeaderRow: { backgroundColor: '#FBF6EF', borderBottomWidth: 1, borderBottomColor: COLORS.border },
    tableRowAlt: { backgroundColor: '#FCFBF8' },
    th: { fontSize: 11, fontWeight: '700', color: COLORS.navySoft, textTransform: 'uppercase', letterSpacing: 0.4 },
    td: { fontSize: 13, color: COLORS.navySoft },
    tdStrong: { fontSize: 13, color: COLORS.navy, fontWeight: '700' },
    tdMuted: { color: COLORS.muted },
    rowActionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
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
        backgroundColor: COLORS.primary, paddingVertical: 11, borderRadius: 9, marginTop: 6,
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
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: COLORS.primary, paddingHorizontal: 18, paddingVertical: 15,
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
        flexDirection: 'row', justifyContent: 'flex-end', gap: 10,
        paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: 1, borderTopColor: COLORS.border,
    },
    ghostBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: COLORS.bg, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 10,
    },
    ghostBtnText: { color: COLORS.navySoft, fontWeight: '700', fontSize: 13 },
});