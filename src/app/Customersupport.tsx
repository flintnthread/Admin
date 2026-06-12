import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AdminLayout from '@/components/admin-layout';
import Svg, { Path, Circle, G, Rect } from 'react-native-svg';

// ─── SVG Icons ──────────────────────────────────────────────────────────────

const SearchIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="M7.333 12.667A5.333 5.333 0 1 0 7.333 2a5.333 5.333 0 0 0 0 10.667ZM14 14l-2.9-2.9"
      stroke="#9CA3AF"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ChevronDownIcon = ({ color = '#374151' }: { color?: string }) => (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Path
      d="M3.5 5.25L7 8.75L10.5 5.25"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const EyeIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
      stroke="#FFFFFF"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="12" cy="12" r="3" stroke="#FFFFFF" strokeWidth={2} />
  </Svg>
);

const RefreshIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M23 4v6h-6M1 20v-6h6"
      stroke="#FFFFFF"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
      stroke="#FFFFFF"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CheckIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="M13.5 4.5L6.5 11.5L3 8"
      stroke="#1E3A5F"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const XIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Path
      d="M13.5 4.5L4.5 13.5M4.5 4.5L13.5 13.5"
      stroke="#6B7280"
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </Svg>
);

const TicketIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"
      stroke="#FFFFFF"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ─── Column widths — all fixed so content never squeezes ─────────────────────
const COL = {
  id:       70,
  subject:  320,
  customer: 210,
  type:     130,
  order:    170,
  status:   120,
  created:  150,
  actions:  100,
};

const TABLE_MIN_WIDTH =
  COL.id + COL.subject + COL.customer + COL.type +
  COL.order + COL.status + COL.created + COL.actions; // ≈ 1270

// ─── Data ────────────────────────────────────────────────────────────────────

const TICKETS = [
  {
    id: '#11',
    subject: "Order #FNT202604028262 - My order is not delivered on time and it's cancelled",
    customer: 'Sravani Surampalli',
    email: 'sravanisurampalli612@gmail.com',
    type: 'Delivery Issue',
    order: '#FNT202604028262',
    status: 'Open',
    created: '08 Jun, 2026 16:58',
  },
  {
    id: '#12',
    subject: 'Order #FNT202604019831 - Product received was damaged',
    customer: 'Rahul Mehta',
    email: 'rahulmehta@example.com',
    type: 'Product Issue',
    order: '#FNT202604019831',
    status: 'In Progress',
    created: '07 Jun, 2026 11:22',
  },
  {
    id: '#13',
    subject: 'Order #FNT202604009412 - Payment deducted but order not confirmed',
    customer: 'Priya Sharma',
    email: 'priyasharma@example.com',
    type: 'Payment Issue',
    order: '#FNT202604009412',
    status: 'Closed',
    created: '05 Jun, 2026 09:14',
  },
  {
    id: '#14',
    subject: 'Order #FNT202604031100 - Need to change delivery address',
    customer: 'Ankit Verma',
    email: 'ankitverma@example.com',
    type: 'Other',
    order: '#FNT202604031100',
    status: 'Open',
    created: '09 Jun, 2026 14:05',
  },
];

const STATUS_OPTIONS = ['Open', 'In Progress', 'Closed'];
const TYPE_OPTIONS = ['Delivery Issue', 'Product Issue', 'Payment Issue', 'Other'];

// ─── Badges ───────────────────────────────────────────────────────────────────

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  'Open':        { bg: '#DCFCE7', text: '#16A34A', dot: '#16A34A' },
  'In Progress': { bg: '#FEF9C3', text: '#CA8A04', dot: '#CA8A04' },
  'Closed':      { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF' },
};

const typeColors: Record<string, { bg: string; text: string }> = {
  'Delivery Issue': { bg: '#EFF6FF', text: '#3B82F6' },
  'Product Issue':  { bg: '#FFF7ED', text: '#EA580C' },
  'Payment Issue':  { bg: '#FDF4FF', text: '#A21CAF' },
  'Other':          { bg: '#F0FDF4', text: '#16A34A' },
};

const StatusBadge = ({ status }: { status: string }) => {
  const c = statusColors[status] || statusColors['Open'];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: c.dot }]} />
      <Text style={[styles.badgeText, { color: c.text }]}>{status}</Text>
    </View>
  );
};

const TypeBadge = ({ type }: { type: string }) => {
  const c = typeColors[type] || typeColors['Other'];
  return (
    <View style={[styles.typeBadge, { backgroundColor: c.bg }]}>
      <Text style={[styles.typeBadgeText, { color: c.text }]}>{type}</Text>
    </View>
  );
};

// ─── Filter Modal ─────────────────────────────────────────────────────────────

interface FilterModalProps {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
  isWeb: boolean;
}

const FilterModal = ({
  visible, title, options, selected, onSelect, onClose, isWeb,
}: FilterModalProps) => (
  <Modal
    visible={visible}
    transparent
    animationType={isWeb ? 'fade' : 'slide'}
    onRequestClose={onClose}
  >
    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        style={[styles.modalContainer, isWeb ? styles.modalWeb : styles.modalMobile]}
      >
        {!isWeb && <View style={styles.mobileHandle} />}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          {isWeb && (
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <XIcon />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.modalOptions}>
          {options.map((opt) => {
            const isSelected = selected === opt;
            return (
              <TouchableOpacity
                key={opt}
                style={[styles.modalOption, isSelected && styles.modalOptionSelected]}
                onPress={() => { onSelect(opt); onClose(); }}
              >
                <Text style={[styles.modalOptionText, isSelected && styles.modalOptionTextSelected]}>
                  {opt}
                </Text>
                {isSelected && <CheckIcon />}
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={styles.modalOption}
            onPress={() => { onSelect(''); onClose(); }}
          >
            <Text style={[styles.modalOptionText, { color: '#9CA3AF' }]}>Clear filter</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </TouchableOpacity>
  </Modal>
);

// ─── Mobile Card ──────────────────────────────────────────────────────────────

const MobileCard = ({
  ticket,
  onView,
  onRefresh,
}: {
  ticket: typeof TICKETS[0];
  onView: () => void;
  onRefresh: () => void;
}) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={styles.cardIdRow}>
        <Text style={styles.cardId}>{ticket.id}</Text>
        <StatusBadge status={ticket.status} />
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtnView} onPress={onView}>
          <EyeIcon />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtnRefresh} onPress={onRefresh}>
          <RefreshIcon />
        </TouchableOpacity>
      </View>
    </View>
    <Text style={styles.cardSubject} numberOfLines={2}>{ticket.subject}</Text>
    <View style={styles.cardDivider} />
    <View style={styles.cardMeta}>
      {[
        { label: 'Customer', value: ticket.customer },
        { label: 'Order',    value: ticket.order,    isLink: true },
        { label: 'Created',  value: ticket.created },
      ].map(({ label, value, isLink }) => (
        <View key={label} style={styles.cardMetaRow}>
          <Text style={styles.cardMetaLabel}>{label}</Text>
          <Text style={[styles.cardMetaValue, isLink && styles.orderLink]}>{value}</Text>
        </View>
      ))}
      <View style={styles.cardMetaRow}>
        <Text style={styles.cardMetaLabel}>Type</Text>
        <TypeBadge type={ticket.type} />
      </View>
    </View>
  </View>
);

// ─── Web Table ────────────────────────────────────────────────────────────────

const WebTable = ({
  tickets,
  onView,
  onRefresh,
}: {
  tickets: typeof TICKETS;
  onView: (t: typeof TICKETS[0]) => void;
  onRefresh: (t: typeof TICKETS[0]) => void;
}) => (
  /* Horizontal scroll wrapper — table never gets squished */
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableScrollOuter}>
    <View style={[styles.tableWrapper, { minWidth: TABLE_MIN_WIDTH }]}>

      {/* Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.th, { width: COL.id }]}>ID</Text>
        <Text style={[styles.th, { width: COL.subject }]}>Subject</Text>
        <Text style={[styles.th, { width: COL.customer }]}>Customer</Text>
        <Text style={[styles.th, { width: COL.type }]}>Type</Text>
        <Text style={[styles.th, { width: COL.order }]}>Order</Text>
        <Text style={[styles.th, { width: COL.status }]}>Status</Text>
        <Text style={[styles.th, { width: COL.created }]}>Created</Text>
        <Text style={[styles.th, { width: COL.actions, textAlign: 'center' }]}>Actions</Text>
      </View>

      {/* Rows */}
      {tickets.map((ticket, idx) => (
        <View
          key={ticket.id}
          style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}
        >
          {/* ID */}
          <View style={[styles.cell, { width: COL.id }]}>
            <Text style={styles.tdId}>{ticket.id}</Text>
          </View>

          {/* Subject */}
          <View style={[styles.cell, { width: COL.subject }]}>
            <Text style={styles.tdSubject} numberOfLines={2}>{ticket.subject}</Text>
          </View>

          {/* Customer */}
          <View style={[styles.cell, { width: COL.customer }]}>
            <Text style={styles.tdCustomerName}>{ticket.customer}</Text>
            <Text style={styles.tdCustomerEmail} numberOfLines={1}>{ticket.email}</Text>
          </View>

          {/* Type */}
          <View style={[styles.cell, { width: COL.type }]}>
            <TypeBadge type={ticket.type} />
          </View>

          {/* Order */}
          <View style={[styles.cell, { width: COL.order }]}>
            <Text style={[styles.tdOrder]} numberOfLines={1}>{ticket.order}</Text>
          </View>

          {/* Status */}
          <View style={[styles.cell, { width: COL.status }]}>
            <StatusBadge status={ticket.status} />
          </View>

          {/* Created */}
          <View style={[styles.cell, { width: COL.created }]}>
            <Text style={styles.tdMuted}>{ticket.created}</Text>
          </View>

          {/* Actions */}
          <View style={[styles.cell, { width: COL.actions, flexDirection: 'row', gap: 6, justifyContent: 'center' }]}>
            <TouchableOpacity style={styles.actionBtnView} onPress={() => onView(ticket)}>
              <EyeIcon />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtnRefresh} onPress={() => onRefresh(ticket)}>
              <RefreshIcon />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {tickets.length === 0 && (
        <View style={styles.emptyRow}>
          <Text style={styles.emptyRowText}>No tickets match your filters</Text>
        </View>
      )}
    </View>
  </ScrollView>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CustomerSupportTickets() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = width >= 768;

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [typeModalOpen, setTypeModalOpen] = useState(false);

  const filtered = TICKETS.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      t.subject.toLowerCase().includes(q) ||
      t.customer.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q);
    const matchStatus = !selectedStatus || t.status === selectedStatus;
    const matchType   = !selectedType   || t.type   === selectedType;
    return matchSearch && matchStatus && matchType;
  });

  const handleView = (ticket: typeof TICKETS[0]) => {
    router.push({
      pathname: '/Customersupportdetails',
      params: { ticketId: ticket.id },
    });
  };

  const handleRefresh = (ticket: typeof TICKETS[0]) => {
    console.log('Refresh ticket', ticket.id);
  };

  return (
    <AdminLayout>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.rootContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Page Header ── */}
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <TicketIcon />
            <Text style={styles.pageTitle}>Support Tickets</Text>
          </View>
          <View style={styles.ticketCount}>
            <Text style={styles.ticketCountText}>{filtered.length} tickets</Text>
          </View>
        </View>

        {/* ── Search + Filters ── */}
        <View style={styles.toolbarRow}>
          <View style={[styles.searchBox, isWeb && styles.searchBoxWeb]}>
            <SearchIcon />
            <TextInput
              style={styles.searchInput}
              placeholder="Search tickets by ID, subject or customer..."
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <View style={styles.filterRow}>
            {[
              {
                label: selectedStatus || 'All Statuses',
                active: !!selectedStatus,
                onPress: () => setStatusModalOpen(true),
              },
              {
                label: selectedType || 'All Types',
                active: !!selectedType,
                onPress: () => setTypeModalOpen(true),
              },
            ].map(({ label, active, onPress }) => (
              <TouchableOpacity
                key={label}
                style={[styles.filterBtn, active && styles.filterBtnActive]}
                onPress={onPress}
              >
                <Text style={[styles.filterBtnText, active && styles.filterBtnTextActive]}>
                  {label}
                </Text>
                <ChevronDownIcon color={active ? '#1E3A5F' : '#374151'} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Content ── */}
        {isWeb ? (
          <WebTable tickets={filtered} onView={handleView} onRefresh={handleRefresh} />
        ) : (
          <View style={styles.cardList}>
            {filtered.map((ticket) => (
              <MobileCard
                key={ticket.id}
                ticket={ticket}
                onView={() => handleView(ticket)}
                onRefresh={() => handleRefresh(ticket)}
              />
            ))}
          </View>
        )}

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No tickets found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your search or filters</Text>
          </View>
        )}
      </ScrollView>

      <FilterModal
        visible={statusModalOpen}
        title="Filter by Status"
        options={STATUS_OPTIONS}
        selected={selectedStatus}
        onSelect={setSelectedStatus}
        onClose={() => setStatusModalOpen(false)}
        isWeb={isWeb}
      />
      <FilterModal
        visible={typeModalOpen}
        title="Filter by Type"
        options={TYPE_OPTIONS}
        selected={selectedType}
        onSelect={setSelectedType}
        onClose={() => setTypeModalOpen(false)}
        isWeb={isWeb}
      />
    </AdminLayout>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F9FB' },
  rootContent: { padding: 20, paddingBottom: 40 },

  // Header
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    backgroundColor: '#1E3A5F',
    padding: 15,
    borderRadius: 10,
  },
  pageHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.3 },
  ticketCount: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  ticketCountText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },

  // Toolbar
  toolbarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchBoxWeb: { maxWidth: 400 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    outlineStyle: 'none',
  } as any,
  filterRow: { flexDirection: 'row', gap: 8 },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    height: 42,
  },
  filterBtnActive: { backgroundColor: '#EBF0F8', borderColor: '#1E3A5F' },
  filterBtnText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  filterBtnTextActive: { color: '#1E3A5F', fontWeight: '600' },

  // Badges
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  typeBadgeText: { fontSize: 12, fontWeight: '500' },

  // Table
  tableScrollOuter: { borderRadius: 14 },
  tableWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(246, 199, 149, 0.2);',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  th: {
    paddingVertical: 13,
    paddingHorizontal: 14,
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    alignItems: 'center',
    minHeight: 60,
  },
  tableRowAlt: { backgroundColor: '#FAFAFA' },

  // Every data cell — consistent padding, no overlap
  cell: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },

  // Cell text styles
  tdId: { fontSize: 13, fontWeight: '700', color: '#1E3A5F' },
  tdSubject: { fontSize: 13, color: '#374151', lineHeight: 18 },
  tdCustomerName: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 2 },
  tdCustomerEmail: { fontSize: 11, color: '#9CA3AF' },
  tdOrder: { fontSize: 13, color: '#3B82F6', fontWeight: '500' },
  tdMuted: { fontSize: 12, color: '#9CA3AF' },
  orderLink: { color: '#3B82F6', fontWeight: '500' },

  emptyRow: { padding: 40, alignItems: 'center' },
  emptyRowText: { fontSize: 14, color: '#9CA3AF' },

  // Action Buttons
  actionBtnView: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: '#1E3A5F',
    alignItems: 'center', justifyContent: 'center',
  },
  actionBtnRefresh: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: '#F97316',
    alignItems: 'center', justifyContent: 'center',
  },

  // Mobile Cards
  cardList: { gap: 12 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardIdRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardId: { fontSize: 15, fontWeight: '700', color: '#1E3A5F' },
  cardActions: { flexDirection: 'row', gap: 8 },
  cardSubject: { fontSize: 13, color: '#374151', lineHeight: 19, marginBottom: 12 },
  cardDivider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 12 },
  cardMeta: { gap: 8 },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardMetaLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '500', width: 70 },
  cardMetaValue: {
    fontSize: 13, color: '#374151', fontWeight: '500',
    flex: 1, textAlign: 'right',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContainer: { backgroundColor: '#FFFFFF', width: '100%' },
  modalWeb: {
    width: 360,
    borderRadius: 16,
    alignSelf: 'center',
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -160 }],
  },
  modalMobile: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  mobileHandle: {
    width: 40, height: 4, backgroundColor: '#D1D5DB',
    borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  modalOptions: { paddingHorizontal: 16, paddingVertical: 8 },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginVertical: 2,
  },
  modalOptionSelected: { backgroundColor: '#EBF0F8' },
  modalOptionText: { fontSize: 15, color: '#374151', fontWeight: '500' },
  modalOptionTextSelected: { color: '#1E3A5F', fontWeight: '700' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 8 },
  emptySubtitle: { fontSize: 14, color: '#9CA3AF' },
});