/**
 * customermngt.tsx
 * -----------------------------------------------------------------------
 * Customers Management screen — sidebar & top navbar removed, fully
 * responsive (phones 320/375/425, tablet 768, laptop 1024/1440, desktop
 * 2560). Distinct palette & layout from adsadminusers.tsx — hero banner
 * header, teal/slate accents instead of navy/blue, card style differs.
 *
 * Working features:
 *  - List view (table) <-> Grid view (cards), toggle works on all sizes.
 *    The table itself is horizontally scrollable at every breakpoint —
 *    columns keep fixed widths (never compressed/overlapped); on narrow
 *    screens you scroll sideways to read every column.
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
import Pagination from '@/components/Pagination';
import { Ionicons } from '@expo/vector-icons';
import { getApiErrorMessage } from '@/lib/api/client';
import { deleteAdsCustomer, fetchAdsCustomers, fetchAdsOrders, formatAdsDate, type AdsApiRow } from '@/services/adsApi';
import { sweetWarning } from '@/lib/sweetAlert';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import ExclamationTriangleFill from 'react-native-bootstrap-icons/icons/exclamation-triangle-fill';
import InfoCircleFill from 'react-native-bootstrap-icons/icons/info-circle-fill';
import Search from 'react-native-bootstrap-icons/icons/search';
import Svg, { Line, Rect } from 'react-native-svg';

const GridIcon = ({ active }: { active: boolean }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Rect
      x="3"
      y="3"
      width="7"
      height="7"
      rx="1"
      stroke={active ? '#fff' : COLORS.slate}
      strokeWidth={2}
    />
    <Rect
      x="14"
      y="3"
      width="7"
      height="7"
      rx="1"
      stroke={active ? '#fff' : COLORS.slate}
      strokeWidth={2}
    />
    <Rect
      x="3"
      y="14"
      width="7"
      height="7"
      rx="1"
      stroke={active ? '#fff' : COLORS.slate}
      strokeWidth={2}
    />
    <Rect
      x="14"
      y="14"
      width="7"
      height="7"
      rx="1"
      stroke={active ? '#fff' : COLORS.slate}
      strokeWidth={2}
    />
  </Svg>
);

const ListIcon = ({ active }: { active: boolean }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Line
      x1="8"
      y1="6"
      x2="21"
      y2="6"
      stroke={active ? '#fff' : COLORS.slate}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Line
      x1="8"
      y1="12"
      x2="21"
      y2="12"
      stroke={active ? '#fff' : COLORS.slate}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Line
      x1="8"
      y1="18"
      x2="21"
      y2="18"
      stroke={active ? '#fff' : COLORS.slate}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Line
      x1="3"
      y1="6"
      x2="3.01"
      y2="6"
      stroke={active ? '#fff' : COLORS.slate}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Line
      x1="3"
      y1="12"
      x2="3.01"
      y2="12"
      stroke={active ? '#fff' : COLORS.slate}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Line
      x1="3"
      y1="18"
      x2="3.01"
      y2="18"
      stroke={active ? '#fff' : COLORS.slate}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

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

function mapAdsCustomer(row: AdsApiRow): Customer {
  return {
    id: Number(row.id ?? 0),
    name: String(row.name ?? '—'),
    email: String(row.email ?? ''),
    phone: String(row.phone ?? ''),
    company: String(row.company ?? 'N/A'),
    orders: Number(row.orderCount ?? 0) || 0,
    joined: formatAdsDate(row.createdAt),
  };
}

// Distinct palette — teal / slate / amber (different from adsadminusers.tsx's
// navy + blue/green/purple/orange scheme)
const COLORS = {
  teal: '#0D9488',
  tealDark: '#0F766E',
  amber: '#F59E0B',
  amberDark: '#D97706',
  darkOrange: '#E65100',
  orange: '#F97316',
  pink: '#F43F5E',
  blue: '#2563EB',
  blueDark: '#1D4ED8',
  headerBg: '#151D4F',
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
  if (width < 360) return 'xs';   // 320 Mobile S
  if (width < 400) return 'sm';   // 375 Mobile M
  if (width < 768) return 'md';   // 425 Mobile L
  if (width < 1024) return 'lg';  // 768 tablet
  if (width < 1440) return 'xl';  // 1024 laptop
  return 'xxl';                   // 1440 / 1920 / 2560 desktop
}

// ---------------------------------------------------------------------------
// Table column config — each column has a minWidth (floor, enforced on
// narrow screens so text is never compressed/overlapped) and a flex weight
// (used to distribute any extra space evenly on wide screens, so columns
// spread out and get proper breathing room instead of leaving a big empty
// gap on the right).
// ---------------------------------------------------------------------------
const COLUMNS = [
  { key: 'sno', label: 'S.No', minWidth: 56, flex: 0.6 },
  { key: 'name', label: 'Name', minWidth: 160, flex: 1.6 },
  { key: 'email', label: 'Email', minWidth: 200, flex: 2 },
  { key: 'phone', label: 'Phone', minWidth: 130, flex: 1.2 },
  { key: 'company', label: 'Company', minWidth: 140, flex: 1.3 },
  { key: 'orders', label: 'Orders', minWidth: 100, flex: 0.9 },
  { key: 'joined', label: 'Joined', minWidth: 140, flex: 1.2 },
  { key: 'action', label: 'Action', minWidth: 120, flex: 1.1 },
] as const;

const CELL_H_PADDING = 18; // generous horizontal breathing room between columns
const TABLE_MIN_WIDTH = COLUMNS.reduce((sum, c) => sum + c.minWidth, 0) + CELL_H_PADDING * 2;

// Grid view gutter (space between cards)
const GRID_GAP = 16;

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
              <Ionicons name="trash" size={16} color="#fff" />
              <Text style={styles.modalHeaderText}>Delete Customer</Text>
            </View>
            <TouchableOpacity onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.trashCircle}>
              <Ionicons name="trash" size={26} color="#F97316" />
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
              <Ionicons name="close-outline" size={15} color="#fff" />
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmDeleteBtn, blocked && styles.confirmDeleteBtnDisabled]}
              onPress={blocked ? undefined : onConfirm}
              disabled={blocked}
            >
              {blocked ? (
                <>
                  <Ionicons name="close-outline" size={15} color="#94A3B8" />
                  <Text style={styles.confirmDeleteBtnTextDisabled}>Cannot Delete</Text>
                </>
              ) : (
                <>
                  <Ionicons name="trash-outline" size={15} color="#fff" />
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

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>(isPhone ? 'grid' : 'list');
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const loadCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdsCustomers({
        page: page - 1,
        size: PAGE_SIZE,
        search: search.trim() || undefined,
      });
      setCustomers(res.items.map(mapAdsCustomer));
      setTotalItems(res.totalElements);
    } catch (e) {
      setError(getApiErrorMessage(e, 'Failed to load customers.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCustomers();
  }, [search, page]);

  const paginated = customers;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const handleViewOrders = async (customer?: Customer) => {
    if (!customer) {
      router.push('/ads-ordermanagement');
      return;
    }
    try {
      const page = await fetchAdsOrders({
        search: customer.email || customer.name,
        page: 0,
        size: 20,
      });
      const items = page.items ?? [];
      const match =
        items.find((row) => String(row.customerEmail ?? '').toLowerCase() === customer.email.toLowerCase()) ??
        items[0];
      if (match) {
        const internalId = Number(match.id ?? 0);
        const orderCode = String(match.orderId ?? match.id ?? '');
        if (internalId > 0) {
          router.push({ pathname: '/order-details' as any, params: { id: String(internalId) } });
          return;
        }
        if (orderCode) {
          router.push({ pathname: '/order-details' as any, params: { orderId: orderCode } });
          return;
        }
      }
      router.push({
        pathname: '/ads-ordermanagement' as any,
        params: { customerEmail: customer.email, customerName: customer.name },
      });
    } catch (e) {
      void sweetWarning('Orders', getApiErrorMessage(e, 'Could not open customer orders.'));
      router.push({
        pathname: '/ads-ordermanagement' as any,
        params: { customerEmail: customer.email },
      });
    }
  };

  const requestDelete = (customer: Customer) => setDeleteTarget(customer);
  const cancelDelete = () => setDeleteTarget(null);
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.orders > 0) return;
    try {
      const res = await deleteAdsCustomer(deleteTarget.id);
      const message = String(res.message ?? '');
      if (message.toLowerCase().includes('cascade')) {
        setError(message);
        setDeleteTarget(null);
        return;
      }
      setCustomers((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
      void loadCustomers();
    } catch (e) {
      setError(getApiErrorMessage(e, 'Failed to delete customer.'));
      setDeleteTarget(null);
    }
  };

  // Layout is driven purely by the toggle now, at every breakpoint — the
  // table stays a table (with horizontal scroll) unless Grid is selected.
  const useCardLayout = view === 'grid';

  // Explicit columns to prevent the last row from stretching
  const gridColumns = isPhone ? 1 : bp === 'lg' ? 2 : bp === 'xl' ? 3 : 4;
  const gridCellWidth = `${100 / gridColumns}%` as const;

  // ---- Table row -------------------------------------------------------
  const tableMinWidth = TABLE_MIN_WIDTH;

  const colStyle = (key: (typeof COLUMNS)[number]['key']) => {
    const col = COLUMNS.find((c) => c.key === key)!;
    return { flexGrow: col.flex, flexShrink: 1, flexBasis: col.minWidth, minWidth: col.minWidth };
  };

  const renderRow = ({ item }: { item: Customer }) => (
    <View style={styles.tableRow}>
      <View style={[styles.cell, colStyle('sno'), { overflow: 'hidden' }]}>
        <Text style={{ color: COLORS.sub, fontSize: 13, width: '100%' }} numberOfLines={1}>{item.id}</Text>
      </View>
      <View style={[styles.cell, colStyle('name'), { overflow: 'hidden' }]}>
        <Text style={{ fontWeight: '700', color: COLORS.slate, fontSize: 13, width: '100%' }} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
      </View>
      <View style={[styles.cell, colStyle('email'), { overflow: 'hidden' }]}>
        <Text style={{ color: COLORS.sub, fontSize: 13, width: '100%' }} numberOfLines={1} ellipsizeMode="tail">{item.email}</Text>
      </View>
      <View style={[styles.cell, colStyle('phone'), { overflow: 'hidden' }]}>
        <Text style={{ color: COLORS.slate, fontSize: 13, width: '100%' }} numberOfLines={1} ellipsizeMode="tail">{item.phone}</Text>
      </View>
      <View style={[styles.cell, colStyle('company'), { overflow: 'hidden' }]}>
        <Text style={{ color: COLORS.sub, fontSize: 13, width: '100%' }} numberOfLines={1} ellipsizeMode="tail">{item.company}</Text>
      </View>
      <View style={[styles.cell, colStyle('orders'), { justifyContent: 'center', overflow: 'hidden' }]}>
        <View style={styles.orderChip}>
          <Text style={styles.orderChipText}>{item.orders}</Text>
        </View>
      </View>
      <View style={[styles.cell, colStyle('joined'), { overflow: 'hidden' }]}>
        <Text style={{ color: COLORS.sub, fontSize: 12, width: '100%' }} numberOfLines={1} ellipsizeMode="tail">{item.joined}</Text>
      </View>
      <View style={[styles.cell, colStyle('action'), { flexDirection: 'row', gap: 8, alignItems: 'center' }, !isPhone && { marginLeft: 55 }]}>
        <TouchableOpacity style={styles.ordersIconBtn} onPress={() => handleViewOrders(item)}>
          <Ionicons name="eye" size={15} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => requestDelete(item)}>
          <Ionicons name="trash-outline" size={15} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ---- Grid card -----------------------------------------------------
  // Redesigned premium responsive card
  // Dynamic top bar colors for grid cards
  const CARD_TOP_COLORS = ['#2563EB', '#7C3AED', '#10B981', '#F97316', '#EC4899', '#06B6D4'];

  const renderCard = (item: Customer) => {
    const cardColor = CARD_TOP_COLORS[item.id % CARD_TOP_COLORS.length];

    return (
      <View style={styles.gridCard}>
        {/* Dynamic color line indicator at the top */}
        <View style={[styles.gridCardTopBar, { backgroundColor: cardColor }]} />

        <View style={styles.gridCardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 14 }}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.gridCardName} numberOfLines={1}>{item.name}</Text>
              <View style={styles.idBadge}>
                <Text style={styles.idBadgeText}>ID: #{item.id}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.gridInfoContainer}>
          <View style={styles.gridInfoRow}>
            <View style={styles.iconBox}><Ionicons name="mail-outline" size={14} color="#1d324e" /></View>
            <Text style={styles.gridInfoText} numberOfLines={1}>{item.email}</Text>
          </View>
          <View style={styles.gridInfoRow}>
            <View style={styles.iconBox}><Ionicons name="call-outline" size={14} color="#1d324e" /></View>
            <Text style={styles.gridInfoText} numberOfLines={1}>{item.phone}</Text>
          </View>
          <View style={styles.gridInfoRow}>
            <View style={styles.iconBox}><Ionicons name="business-outline" size={14} color="#1d324e" /></View>
            <Text style={styles.gridInfoText} numberOfLines={1}>{item.company}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.gridMetaRow}>
          <View style={styles.gridMetaItem}>
            <BagCheckFill width={15} height={15} fill={COLORS.amberDark} />
            <Text style={styles.gridMetaText}>{item.orders} Orders</Text>
          </View>
          <View style={styles.gridMetaItem}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.sub} />
            <Text style={styles.gridMetaDate}>{item.joined}</Text>
          </View>
        </View>

        <View style={styles.gridActionsRow}>
          <TouchableOpacity style={styles.ordersBtnWide} onPress={() => handleViewOrders(item)}>
            <Ionicons name="eye" size={14} color="#fff" />
            <Text style={styles.ordersBtnText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => requestDelete(item)}>
            <Ionicons name="trash-outline" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* ---------- Header ---------- */}
        <View style={[styles.header, isPhone && { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 12 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <TouchableOpacity onPress={() => router.push('/Dashboard')}>
              <View style={[styles.headerIconBox, isPhone && { width: 36, height: 36 }]}>
                <Ionicons name="people" size={isPhone ? 18 : 24} color="#fff" />
              </View>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              {isPhone ? (
                <View style={{ flex: 1 }}>
                  <Text style={[styles.headerTitle, { fontSize: 14, lineHeight: 18 }]} numberOfLines={2}>Customers Management</Text>
                </View>
              ) : (
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.headerTitle}>Customers Management</Text>
                  <Text style={styles.headerSubtitle}>Manage all customer accounts and orders</Text>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity style={[styles.refreshBtn, isPhone && { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 }]} onPress={() => handleViewOrders()}>
            <BagCheckFill width={isPhone ? 12 : 14} height={isPhone ? 12 : 14} fill={COLORS.amber} />
            <Text style={[styles.refreshBtnText, isPhone && { fontSize: 11 }]}>View Orders</Text>
          </TouchableOpacity>
        </View>

        {/* ---------- Toolbar ---------- */}
        <View style={[styles.toolbarCard, isPhone && { flexWrap: 'nowrap' }]}>
          <View style={[styles.searchBox, isPhone && { minWidth: 0 }]}>
            <Search width={15} height={15} fill={COLORS.sub} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search customers..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={(txt) => { setSearch(txt); setPage(1); }}
            />
          </View>

          {!isPhone && (
            <View style={styles.viewToggle}>
              <TouchableOpacity
                style={[styles.viewToggleBtn, view === 'list' && styles.viewToggleBtnActive]}
                onPress={() => setView('list')}
              >
                <ListIcon active={view === 'list'} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewToggleBtn, view === 'grid' && styles.viewToggleBtnActive]}
                onPress={() => setView('grid')}
              >
                <GridIcon active={view === 'grid'} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ---------- Data ---------- */}
        <View style={styles.dataCard}>
          {loading ? (
            <Text style={styles.emptyText}>Loading customers…</Text>
          ) : error ? (
            <Text style={styles.emptyText}>{error}</Text>
          ) : useCardLayout ? (
            paginated.length === 0 ? (
              <Text style={styles.emptyText}>No customers match your search.</Text>
            ) : (
              // Plain flex-wrap grid instead of FlatList numColumns: each
              // cell reserves a true percentage share of the row
              // (gridCellWidth) with the gutter applied via padding on the
              // cell rather than a fixed pixel width on the card, so cards
              // never overflow the viewport and always wrap correctly at
              // every breakpoint (1 col phone -> 2 tablet -> 3 laptop -> 4
              // desktop).
              <View style={styles.gridWrap}>
                {paginated.map((item) => (
                  <View key={item.id} style={[styles.gridCell, { width: gridCellWidth }]}>
                    {renderCard(item)}
                  </View>
                ))}
              </View>
            )
          ) : isPhone ? (
            // Mobile list view: show cards instead of horizontal scroll table
            paginated.length === 0 ? (
              <Text style={styles.emptyText}>No customers match your search.</Text>
            ) : (
              <View style={styles.mobileListWrap}>
                {paginated.map((item) => (
                  <View key={item.id} style={styles.mobileListCard}>
                    {renderCard(item)}
                  </View>
                ))}
              </View>
            )
          ) : (
            // Horizontal scroll wrapper: on wide screens the table stretches
            // to fill the full card width (flexGrow content container +
            // flex:1 inner view), so columns spread out with proper spacing
            // instead of leaving empty space on the right. Each column still
            // has a minWidth floor, so on narrow screens the row simply
            // can't shrink past it and the ScrollView scrolls horizontally
            // instead of compressing or overlapping columns.
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator
              style={styles.tableScroll}
              contentContainerStyle={{ flexGrow: 1 }}
            >
              <View style={{ flex: 1, minWidth: TABLE_MIN_WIDTH }}>
                <View style={styles.tableHeader}>
                  {COLUMNS.map((col) => (
                    <Text key={col.key} style={[styles.headCell, colStyle(col.key), col.key === 'action' && !isPhone && { marginLeft: 65 }]}>{col.label}</Text>
                  ))}
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
  headerPhone: {
    flexWrap: 'wrap',
    gap: 10,
  },
  backBtn: { padding: 8, alignSelf: 'flex-start', marginTop: 2 },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  headerIconBox: {
    width: 44, height: 44, borderRadius: 10, backgroundColor: '#F97316',
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
  searchInput: { flex: 1, fontSize: 13, color: COLORS.slate, outlineStyle: 'none' as any },
  viewToggle: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 10, padding: 3 },
  viewToggleBtn: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  viewToggleBtnActive: { backgroundColor: '#1d324e' },

  dataCard: { backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 12 },

  tableScroll: { borderRadius: 8 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderColor: COLORS.border, paddingVertical: 12, paddingHorizontal: 4, marginBottom: 4, backgroundColor: '#1d324e' },
  headCell: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', paddingRight: 16, paddingVertical: 6 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderColor: '#F1F5F9' },
  cell: { paddingRight: 16, fontSize: 13, color: COLORS.slate, justifyContent: 'center' },

  orderChip: { backgroundColor: COLORS.chip, paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, alignSelf: 'flex-start' },
  orderChipText: { color: COLORS.chipText, fontWeight: '700', fontSize: 12 },

  // Table actions — solid colored rounded-square icon buttons (orange for
  // Orders, pink/red for Delete), matching the reference style. Edit removed.
  ordersIconBtn: {
    width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1d324e',
  },
  ordersBtnWide: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#1d324e', paddingVertical: 10, borderRadius: 8,
  },
  ordersBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  deleteBtn: {
    backgroundColor: '#dc2626', width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },

  // Grid layout
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  gridCell: {
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  gridCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 20,
    shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2,
    position: 'relative', overflow: 'hidden',
  },
  gridCardTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  gridCardHeader: { marginBottom: 16 },
  avatarCircle: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.chip,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#CFFAFE'
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: COLORS.tealDark },
  gridCardName: { fontSize: 17, fontWeight: '800', color: COLORS.slate, marginBottom: 4 },
  idBadge: { backgroundColor: '#F1F5F9', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, alignSelf: 'flex-start' },
  idBadgeText: { color: COLORS.sub, fontSize: 11, fontWeight: '700' },

  divider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: -20, marginBottom: 16 },

  gridInfoContainer: { gap: 10, marginBottom: 18 },
  gridInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 26, height: 26, borderRadius: 6, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  gridInfoText: { fontSize: 13.5, color: '#475569', flexShrink: 1, fontWeight: '500' },

  gridMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10 },
  gridMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gridMetaText: { fontSize: 13, color: COLORS.amberDark, fontWeight: '700' },
  gridMetaDate: { fontSize: 13, color: COLORS.sub, fontWeight: '600' },

  gridActionsRow: { flexDirection: 'row', gap: 10 },

  mobileListWrap: { gap: 12 },
  mobileListCard: { width: '100%' },

  emptyText: { textAlign: 'center', color: COLORS.sub, paddingVertical: 24, fontSize: 13 },
  footerText: { textAlign: 'center', color: COLORS.sub, fontSize: 12, marginTop: 18 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { width: '100%', maxWidth: 440, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#F97316', paddingHorizontal: 18, paddingVertical: 16,
  },
  modalHeaderText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalBody: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 10, alignItems: 'center' },
  trashCircle: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.warnBg,
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
    flexDirection: 'row', justifyContent: 'center', gap: 10,
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