/**
 * customermngt.tsx
 * -----------------------------------------------------------------------
 * Customers Management screen — sidebar & top navbar removed, fully
 * responsive (phones 320/375/425, tablet 768, laptop 1024/1440, desktop
 * 2560). Distinct palette & layout from adsadminusers.tsx — hero banner
 * header, teal/slate accents instead of navy/blue, card style differs.
 *
 * Working features:
 *  - List view (table) <-> Grid view (cards), toggle works on all sizes
 *  - Delete guard: customers with orders > 0 cannot be deleted — a
 *    warning modal blocks it (matches "Cannot Delete Customer" flow).
 *    Customers with 0 orders show a normal confirm-delete modal.
 *  - Live search across name / email / company
 *  - "View Orders" (header) & per-row "Orders" button (demo alert)
 *
 * Install before use:
 *   npm install react-native-bootstrap-icons
 * -----------------------------------------------------------------------
 */

import AdminLayout from '@/components/admin-layout';
import AdminSidebar from '@/components/admin-sidebar';
import Pagination from '@/components/Pagination';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import BagCheckFill from 'react-native-bootstrap-icons/icons/bag-check-fill';
import Building from 'react-native-bootstrap-icons/icons/building';
import CalendarEvent from 'react-native-bootstrap-icons/icons/calendar-event';
import ChevronRight from 'react-native-bootstrap-icons/icons/chevron-right';
import EnvelopeFill from 'react-native-bootstrap-icons/icons/envelope-fill';
import ExclamationTriangleFill from 'react-native-bootstrap-icons/icons/exclamation-triangle-fill';
import Grid3x3GapFill from 'react-native-bootstrap-icons/icons/grid-3x3-gap-fill';
import InfoCircleFill from 'react-native-bootstrap-icons/icons/info-circle-fill';
import ListUl from 'react-native-bootstrap-icons/icons/list-ul';
import LockFill from 'react-native-bootstrap-icons/icons/lock-fill';
import PeopleFill from 'react-native-bootstrap-icons/icons/people-fill';
import Search from 'react-native-bootstrap-icons/icons/search';
import TelephoneFill from 'react-native-bootstrap-icons/icons/telephone-fill';
import TrashFill from 'react-native-bootstrap-icons/icons/trash-fill';
import XLg from 'react-native-bootstrap-icons/icons/x-lg';

// ---------------------------------------------------------------------------
// Types & seed data
// ---------------------------------------------------------------------------
interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  orders: number;
  joined: string;
}

const SEED_CUSTOMERS: Customer[] = [
  { id: 1, name: 'Flint & Thread', email: 'flintnthread@gmail.com', phone: '8121433370', company: 'Flint & Thread', orders: 1, joined: '26 Oct, 2025' },
  { id: 2, name: 'Tayi Gopi Chand', email: 'gopichand93667@gmail.com', phone: '09705699481', company: 'N/A', orders: 5, joined: '06 Oct, 2025' },
  { id: 3, name: 'John Doe', email: 'john@example.com', phone: '9876543210', company: 'ABC Company', orders: 1, joined: '06 Oct, 2025' },
  { id: 4, name: 'Jane Smith', email: 'jane@example.com', phone: '9876543211', company: 'XYZ Corp', orders: 0, joined: '06 Oct, 2025' },
];

// Distinct palette — teal / slate / amber (different from adsadminusers.tsx's
// navy + blue/green/purple/orange scheme)
const COLORS = {
  teal: '#0D9488',
  tealDark: '#0F766E',
  amber: '#F59E0B',
  amberDark: '#D97706',
  darkOrange: '#E65100',
  blue: '#2563EB',
  blueDark: '#1D4ED8',
  headerBg: '#2D2D60',
  slate: '#1E293B',
  sub: '#64748B',
  border: '#E2E8F0',
  bg: '#F1F5F9',
  card: '#FFFFFF',
  chip: '#ECFEFF',
  chipText: '#0E7490',
  danger: '#DC2626',
  dangerBg: '#FEE2E2',
  warnBg: '#FEF3C7',
  warnBorder: '#FCD34D',
  warnText: '#92400E',
};

// ---------------------------------------------------------------------------
// Responsive breakpoint helper
// ---------------------------------------------------------------------------
type Bp = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
function getBreakpoint(width: number): Bp {
  if (width < 360) return 'xs';   // 320
  if (width < 400) return 'sm';   // 375
  if (width < 768) return 'md';   // 425
  if (width < 1024) return 'lg';  // 768 tablet
  if (width < 1440) return 'xl';  // 1024 laptop
  return 'xxl';                   // 1440 / 2560
}

// ---------------------------------------------------------------------------
// Delete confirmation modal (guarded when orders > 0)
// ---------------------------------------------------------------------------
const DeleteModal: React.FC<{
  visible: boolean;
  customer: Customer | null;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ visible, customer, onCancel, onConfirm }) => {
  if (!customer) return null;
  const blocked = customer.orders > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TrashFill width={16} height={16} fill="#fff" />
              <Text style={styles.modalHeaderText}>Delete Customer</Text>
            </View>
            <TouchableOpacity onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <XLg width={18} height={18} fill="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.trashCircle}>
              <TrashFill width={26} height={26} fill="#F97316" />
            </View>
            <Text style={styles.confirmTitle}>Are you sure you want to delete this customer?</Text>
            <Text style={styles.confirmSub}>This action cannot be undone!</Text>

            <View style={styles.infoBox}>
              <InfoCircleFill width={14} height={14} fill={COLORS.amberDark} />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={styles.infoBoxLine}>
                  Customer: <Text style={{ fontWeight: '700' }}>{customer.name}</Text>
                </Text>
                <Text style={styles.infoBoxLine}>Orders: {customer.orders}</Text>
              </View>
            </View>

            {blocked && (
              <View style={styles.warnBox}>
                <ExclamationTriangleFill width={14} height={14} fill={COLORS.warnText} />
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <Text style={styles.warnTitle}>WARNING: Cannot Delete Customer</Text>
                  <Text style={styles.warnBody}>
                    This customer has {customer.orders} order(s) associated. Please delete the
                    orders first before deleting this customer.
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <XLg width={13} height={13} fill={COLORS.slate} />
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmDeleteBtn, blocked && styles.confirmDeleteBtnDisabled]}
              onPress={blocked ? undefined : onConfirm}
              disabled={blocked}
            >
              {blocked ? (
                <>
                  <XLg width={13} height={13} fill="#94A3B8" />
                  <Text style={styles.confirmDeleteBtnTextDisabled}>Cannot Delete</Text>
                </>
              ) : (
                <>
                  <TrashFill width={13} height={13} fill="#fff" />
                  <Text style={styles.confirmDeleteBtnText}>Delete</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
const CustomerManagement: React.FC = () => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const bp = getBreakpoint(width);
  const isPhone = bp === 'xs' || bp === 'sm' || bp === 'md';
  const isTablet = bp === 'lg';

  const [customers, setCustomers] = useState<Customer[]>(SEED_CUSTOMERS);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  const handleViewOrders = (customer?: Customer) => {
    router.push('/ads-orders');
  };

  const requestDelete = (customer: Customer) => setDeleteTarget(customer);
  const cancelDelete = () => setDeleteTarget(null);
  const confirmDelete = () => {
    if (!deleteTarget) return;
    setCustomers((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const useCardLayout = isPhone || view === 'grid';

  // ---- Table row -------------------------------------------------------
  const renderRow = ({ item }: { item: Customer }) => (
    <View style={styles.tableRow}>
      <Text style={[styles.cell, { width: 44, color: COLORS.sub }]}>{item.id}</Text>
      <Text style={[styles.cell, { width: 160, fontWeight: '700', color: COLORS.slate }]} numberOfLines={1}>{item.name}</Text>
      <Text style={[styles.cell, { width: 200, color: COLORS.sub }]} numberOfLines={1}>{item.email}</Text>
      <Text style={[styles.cell, { width: 120 }]} numberOfLines={1}>{item.phone}</Text>
      <Text style={[styles.cell, { width: 130, color: COLORS.sub }]} numberOfLines={1}>{item.company}</Text>
      <View style={[styles.cell, { width: 80 }]}>
        <View style={styles.orderChip}>
          <Text style={styles.orderChipText}>{item.orders}</Text>
        </View>
      </View>
      <Text style={[styles.cell, { width: 130, color: COLORS.sub, fontSize: 12 }]}>{item.joined}</Text>
      <View style={[styles.cell, { width: 150, flexDirection: 'row', gap: 8 }]}>
        <TouchableOpacity style={styles.ordersBtn} onPress={() => handleViewOrders(item)}>
          <LockFill width={12} height={12} fill="#fff" />
          <Text style={styles.ordersBtnText}>Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => requestDelete(item)}>
          <TrashFill width={13} height={13} fill="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ---- Grid card ---------------------------------------------------------
  const renderCard = ({ item }: { item: Customer }) => (
    <View style={[styles.gridCard, isPhone && { width: '100%' }]}>
      <View style={styles.gridCardHeader}>
        <Text style={styles.gridCardName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.idBadge}>
          <Text style={styles.idBadgeText}>#{item.id}</Text>
        </View>
      </View>

      <View style={styles.gridInfoRow}>
        <EnvelopeFill width={12} height={12} fill={COLORS.sub} />
        <Text style={styles.gridInfoText} numberOfLines={1}>{item.email}</Text>
      </View>
      <View style={styles.gridInfoRow}>
        <TelephoneFill width={12} height={12} fill={COLORS.sub} />
        <Text style={styles.gridInfoText} numberOfLines={1}>{item.phone}</Text>
      </View>
      <View style={styles.gridInfoRow}>
        <Building width={12} height={12} fill={COLORS.sub} />
        <Text style={styles.gridInfoText} numberOfLines={1}>{item.company}</Text>
      </View>

      <View style={styles.gridMetaRow}>
        <View style={styles.gridMetaItem}>
          <BagCheckFill width={12} height={12} fill={COLORS.tealDark} />
          <Text style={styles.gridMetaText}>{item.orders} orders</Text>
        </View>
        <View style={styles.gridMetaItem}>
          <CalendarEvent width={12} height={12} fill={COLORS.sub} />
          <Text style={styles.gridMetaText}>{item.joined}</Text>
        </View>
      </View>

      <View style={styles.gridActionsRow}>
        <TouchableOpacity style={styles.ordersBtnWide} onPress={() => handleViewOrders(item)}>
          <LockFill width={12} height={12} fill="#fff" />
          <Text style={styles.ordersBtnText}>Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => requestDelete(item)}>
          <TrashFill width={13} height={13} fill="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const numColumns = bp === 'xxl' ? 4 : bp === 'xl' ? 3 : bp === 'lg' ? 2 : 1;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* ---------- Header ---------- */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn}>
            <ChevronRight width={24} height={24} fill="#fff" style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <View style={styles.headerIconBox}>
              <PeopleFill width={20} height={20} fill="#fff" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Customers Management</Text>
              <Text style={styles.headerSubtitle}>Manage all customer accounts and orders</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.refreshBtn} onPress={() => handleViewOrders()}>
            <BagCheckFill width={14} height={14} fill={COLORS.amber} />
            <Text style={styles.refreshBtnText}>View Orders</Text>
          </TouchableOpacity>
        </View>

        {/* ---------- Toolbar ---------- */}
        <View style={styles.toolbarCard}>
          <View style={[styles.searchBox, isPhone && { width: '100%' }]}>
            <Search width={15} height={15} fill={COLORS.sub} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search customers..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={(txt) => { setSearch(txt); setPage(1); }}
            />
          </View>
 
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.viewToggleBtn, view === 'list' && styles.viewToggleBtnActive]}
              onPress={() => setView('list')}
            >
              <ListUl width={14} height={14} fill={view === 'list' ? '#fff' : COLORS.slate} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleBtn, view === 'grid' && styles.viewToggleBtnActive]}
              onPress={() => setView('grid')}
            >
              <Grid3x3GapFill width={14} height={14} fill={view === 'grid' ? '#fff' : COLORS.slate} />
            </TouchableOpacity>
          </View>
        </View>
 
        {/* ---------- Data ---------- */}
        <View style={styles.dataCard}>
          {useCardLayout ? (
            <FlatList
              key={`grid-${numColumns}`}
              data={paginated}
              keyExtractor={(c) => String(c.id)}
              renderItem={renderCard}
              numColumns={isPhone ? 1 : numColumns}
              columnWrapperStyle={!isPhone && numColumns > 1 ? { gap: 12 } : undefined}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
              scrollEnabled={false}
              ListEmptyComponent={<Text style={styles.emptyText}>No customers match your search.</Text>}
            />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={isTablet}>
              <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.headCell, { width: 44 }]}>S.No</Text>
                  <Text style={[styles.headCell, { width: 160 }]}>Name</Text>
                  <Text style={[styles.headCell, { width: 200 }]}>Email</Text>
                  <Text style={[styles.headCell, { width: 120 }]}>Phone</Text>
                  <Text style={[styles.headCell, { width: 130 }]}>Company</Text>
                  <Text style={[styles.headCell, { width: 80 }]}>Orders</Text>
                  <Text style={[styles.headCell, { width: 130 }]}>Joined</Text>
                  <Text style={[styles.headCell, { width: 150 }]}>Action</Text>
                </View>
                <FlatList
                  data={paginated}
                  keyExtractor={(c) => String(c.id)}
                  renderItem={renderRow}
                  scrollEnabled={false}
                  ListEmptyComponent={<Text style={styles.emptyText}>No customers match your search.</Text>}
                />
              </View>
            </ScrollView>
          )}
        </View>

        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={PAGE_SIZE}
          itemName="customers"
          onPageChange={setPage}
        />

        <Text style={styles.footerText}>
          2026 © Flintnthread India Pvt. Ltd. Crafted by{' '}
          <Text style={{ color: COLORS.teal, fontWeight: '700' }}>Flintnthread India Pvt. Ltd.</Text>
        </Text>
      </ScrollView>

      <DeleteModal
        visible={!!deleteTarget}
        customer={deleteTarget}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </View>
  );
};

export default function CustomerManagementPage() {
  return (
    <AdminLayout>
      <CustomerManagement />
    </AdminLayout>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16, paddingTop: 16 },

  header: {
    backgroundColor: COLORS.headerBg, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16,
    borderRadius: 14, marginBottom: 16,
  },
  backBtn: { padding: 8 },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  headerIconBox: {
    width: 44, height: 44, borderRadius: 10, backgroundColor: COLORS.amber,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: 12, color: '#A0A0C0', marginTop: 2 },
  refreshBtn: {
    backgroundColor: '#3D3D80', flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: '#4D4D90',
  },
  refreshBtnText: { color: COLORS.amber, fontSize: 13, fontWeight: '700' },

  toolbarCard: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 14, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, justifyContent: 'space-between',
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff',
    borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12,
    height: 42, flex: 1, minWidth: 200,
  },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.slate },
  viewToggle: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 10, padding: 3 },
  viewToggleBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  viewToggleBtnActive: { backgroundColor: '#F97316' },

  dataCard: { backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 12 },

  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderColor: COLORS.border, paddingBottom: 10, marginBottom: 4, backgroundColor: '#F8FAFC' },
  headCell: { fontSize: 12, fontWeight: '700', color: COLORS.sub, paddingHorizontal: 12, paddingVertical: 6 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#F1F5F9' },
  cell: { paddingHorizontal: 12, fontSize: 13, color: COLORS.slate, justifyContent: 'center' },

  orderChip: { backgroundColor: COLORS.chip, paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, alignSelf: 'flex-start' },
  orderChipText: { color: COLORS.chipText, fontWeight: '700', fontSize: 12 },

  ordersBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F97316',
    paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8,
  },
  ordersBtnWide: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#F97316', paddingVertical: 10, borderRadius: 8,
  },
  ordersBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  deleteBtn: { backgroundColor: '#1D324E', width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  gridCard: {
    backgroundColor: '#FAFCFF', borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 14,
    height: 200, minHeight: 200,width: 345,
  },
  gridCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  gridCardName: { fontSize: 15, fontWeight: '800', color: COLORS.slate, flex: 1, marginRight: 8 },
  idBadge: { backgroundColor: COLORS.slate, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6 },
  idBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  gridInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  gridInfoText: { fontSize: 12.5, color: COLORS.sub, flexShrink: 1 },

  gridMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, marginBottom: 12 },
  gridMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gridMetaText: { fontSize: 12, color: COLORS.slate, fontWeight: '600' },

  gridActionsRow: { flexDirection: 'row', gap: 8 },

  emptyText: { textAlign: 'center', color: COLORS.sub, paddingVertical: 24, fontSize: 13 },
  footerText: { textAlign: 'center', color: COLORS.sub, fontSize: 12, marginTop: 18 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { width: '100%', maxWidth: 440, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.amber, paddingHorizontal: 18, paddingVertical: 16,
  },
  modalHeaderText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalBody: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 10, alignItems: 'center' },
  trashCircle: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.warnBg,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  confirmTitle: { fontSize: 15, fontWeight: '700', color: COLORS.slate, textAlign: 'center' },
  confirmSub: { fontSize: 12.5, color: COLORS.sub, marginTop: 4, marginBottom: 16, textAlign: 'center' },
  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFF7ED', borderWidth: 1,
    borderColor: '#FED7AA', borderRadius: 10, padding: 12, width: '100%', marginBottom: 10,
  },
  infoBoxLine: { fontSize: 12.5, color: '#7C2D12' },
  warnBox: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.dangerBg, borderWidth: 1,
    borderColor: '#FCA5A5', borderRadius: 10, padding: 12, width: '100%',
  },
  warnTitle: { fontSize: 12.5, fontWeight: '700', color: '#991B1B', marginBottom: 2 },
  warnBody: { fontSize: 12, color: '#991B1B', lineHeight: 17 },

  modalFooter: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: 10,
    paddingHorizontal: 18, paddingVertical: 16,
  },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 10, backgroundColor: '#334155',
  },
  cancelBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  confirmDeleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 10, backgroundColor: COLORS.blue,
  },
  confirmDeleteBtnDisabled: { backgroundColor: '#CBD5E1' },
  confirmDeleteBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  confirmDeleteBtnTextDisabled: { color: '#64748B', fontWeight: '700', fontSize: 13 },
});