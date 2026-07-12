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
import BoxSeam from 'react-native-bootstrap-icons/icons/box-seam';
import CalendarEvent from 'react-native-bootstrap-icons/icons/calendar-event';
import CheckCircleFill from 'react-native-bootstrap-icons/icons/check-circle-fill';
import ClockFill from 'react-native-bootstrap-icons/icons/clock-fill';
import CurrencyDollar from 'react-native-bootstrap-icons/icons/currency-dollar';
import EyeFill from 'react-native-bootstrap-icons/icons/eye-fill';
import Funnel from 'react-native-bootstrap-icons/icons/funnel';
import Grid3x3GapFill from 'react-native-bootstrap-icons/icons/grid-3x3-gap-fill';
import ListUl from 'react-native-bootstrap-icons/icons/list-ul';
import PencilFill from 'react-native-bootstrap-icons/icons/pencil-fill';
import PersonFill from 'react-native-bootstrap-icons/icons/person-fill';
import Search from 'react-native-bootstrap-icons/icons/search';
import TrashFill from 'react-native-bootstrap-icons/icons/trash-fill';
import XCircleFill from 'react-native-bootstrap-icons/icons/x-circle-fill';
import XLg from 'react-native-bootstrap-icons/icons/x-lg';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AdOrder {
  id: number;
  adName: string;
  customer: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  date: string;
  duration: string;
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------
const initialOrders: AdOrder[] = [
  { id: 1, adName: 'Summer Sale Campaign', customer: 'Flint & Thread', amount: 2500, status: 'approved', date: '15 Oct, 2025', duration: '30 days' },
  { id: 2, adName: 'Product Launch', customer: 'Tech Corp', amount: 5000, status: 'pending', date: '16 Oct, 2025', duration: '45 days' },
  { id: 3, adName: 'Brand Awareness', customer: 'Global Inc', amount: 3200, status: 'rejected', date: '14 Oct, 2025', duration: '60 days' },
  { id: 4, adName: 'Holiday Special', customer: 'Retail Plus', amount: 1800, status: 'completed', date: '13 Oct, 2025', duration: '15 days' },
  { id: 5, adName: 'Flash Sale', customer: 'Quick Mart', amount: 1200, status: 'approved', date: '12 Oct, 2025', duration: '7 days' },
  { id: 6, adName: 'New Collection', customer: 'Fashion Hub', amount: 4000, status: 'pending', date: '11 Oct, 2025', duration: '30 days' },
];

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------
const COLORS = {
  primary: '#2D2D60',
  primaryLight: '#3D3D80',
  orange: '#F97316',
  orangeDark: '#EA580C',
  green: '#10B981',
  red: '#EF4444',
  yellow: '#F59E0B',
  slate: '#1E293B',
  sub: '#64748B',
  border: '#E2E8F0',
  bg: '#F1F5F9',
  card: '#FFFFFF',
  white: '#FFFFFF',
};

// ---------------------------------------------------------------------------
// Responsive breakpoint helper
// ---------------------------------------------------------------------------
type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
function getBreakpoint(width: number): Breakpoint {
  if (width < 375) return 'xs';
  if (width < 425) return 'sm';
  if (width < 768) return 'md';
  if (width < 1024) return 'lg';
  if (width < 1440) return 'xl';
  return 'xxl';
}

// ---------------------------------------------------------------------------
// Status badge component
// ---------------------------------------------------------------------------
const StatusBadge = ({ status }: { status: string }) => {
  const config = {
    pending: { bg: '#FEF3C7', text: '#92400E', icon: ClockFill },
    approved: { bg: '#D1FAE5', text: '#065F46', icon: CheckCircleFill },
    rejected: { bg: '#FEE2E2', text: '#991B1B', icon: XCircleFill },
    completed: { bg: '#DBEAFE', text: '#1E40AF', icon: CheckCircleFill },
  };
  const { bg, text, icon: Icon } = config[status as keyof typeof config] || config.pending;
  
  return (
    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
      <Icon width={12} height={12} fill={text} />
      <Text style={[styles.statusBadgeText, { color: text }]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function AdsOrders() {
  const { width } = useWindowDimensions();
  const bp = getBreakpoint(width);
  
  const [orders, setOrders] = useState<AdOrder[]>(initialOrders);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selectedOrder, setSelectedOrder] = useState<AdOrder | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const isPhone = bp === 'xs' || bp === 'sm' || bp === 'md';
  const isTablet = bp === 'lg';
  const isLaptop = bp === 'xl' || bp === 'xxl';

  const filtered = useMemo(() => {
    return orders.filter(
      (order) =>
        order.adName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [orders, searchQuery]);

  const numColumns = bp === 'xxl' ? 4 : bp === 'xl' ? 3 : bp === 'lg' ? 2 : 1;

  // ---------------------------------------------------------------------------
  // Render functions
  // ---------------------------------------------------------------------------
  const renderGridCard = ({ item }: { item: AdOrder }) => (
    <View style={[styles.gridCard, isPhone && { width: '100%' }]}>
      <View style={styles.gridCardHeader}>
        <Text style={styles.gridCardName} numberOfLines={1}>{item.adName}</Text>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.gridInfoRow}>
        <PersonFill width={14} height={14} fill={COLORS.sub} />
        <Text style={styles.gridInfoText} numberOfLines={1}>{item.customer}</Text>
      </View>
      <View style={styles.gridInfoRow}>
        <CurrencyDollar width={14} height={14} fill={COLORS.sub} />
        <Text style={styles.gridInfoText}>${item.amount.toLocaleString()}</Text>
      </View>
      <View style={styles.gridInfoRow}>
        <CalendarEvent width={14} height={14} fill={COLORS.sub} />
        <Text style={styles.gridInfoText}>{item.date}</Text>
      </View>
      <View style={styles.gridInfoRow}>
        <BoxSeam width={14} height={14} fill={COLORS.sub} />
        <Text style={styles.gridInfoText}>{item.duration}</Text>
      </View>

      <View style={styles.gridActionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => { setSelectedOrder(item); setModalVisible(true); }}>
          <EyeFill width={14} height={14} fill={COLORS.primary} />
          <Text style={styles.actionBtnText}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.editBtn]}>
          <PencilFill width={14} height={14} fill={COLORS.orange} />
          <Text style={[styles.actionBtnText, { color: COLORS.orange }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]}>
          <TrashFill width={14} height={14} fill={COLORS.red} />
          <Text style={[styles.actionBtnText, { color: COLORS.red }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTableRow = ({ item }: { item: AdOrder }) => (
    <View style={styles.tableRow}>
      <Text style={[styles.tableCell, styles.tableCellText, { width: isPhone ? 50 : 60 }]}>{item.id}</Text>
      <Text style={[styles.tableCell, styles.tableCellText, { width: isPhone ? 120 : 180, fontWeight: '700' }]} numberOfLines={1}>{item.adName}</Text>
      <Text style={[styles.tableCell, styles.tableCellText, { width: isPhone ? 100 : 140 }]} numberOfLines={1}>{item.customer}</Text>
      <Text style={[styles.tableCell, styles.tableCellText, { width: isPhone ? 80 : 100 }]}>${item.amount.toLocaleString()}</Text>
      <View style={[styles.tableCell, { width: isPhone ? 90 : 110 }]}>
        <StatusBadge status={item.status} />
      </View>
      <Text style={[styles.tableCell, styles.tableCellText, { width: isPhone ? 80 : 100 }]}>{item.date}</Text>
      <View style={[styles.tableCell, { width: isPhone ? 80 : 100, flexDirection: 'row', gap: 8 }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => { setSelectedOrder(item); setModalVisible(true); }}>
          <EyeFill width={16} height={16} fill={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn}>
          <PencilFill width={16} height={16} fill={COLORS.orange} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn}>
          <TrashFill width={16} height={16} fill={COLORS.red} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <BoxSeam width={28} height={28} fill={COLORS.orange} />
            <View>
              <Text style={styles.headerTitle}>Ads Orders</Text>
              <Text style={styles.headerSubtitle}>Manage all advertisement orders</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.filterBtn}>
            <Funnel width={16} height={16} fill={COLORS.white} />
            <Text style={styles.filterBtnText}>Filter</Text>
          </TouchableOpacity>
        </View>

        {/* Toolbar */}
        <View style={styles.toolbar}>
          <View style={[styles.searchBox, isPhone && { width: '100%' }]}>
            <Search width={16} height={16} fill={COLORS.sub} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search orders..."
              placeholderTextColor={COLORS.sub}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, view === 'grid' && styles.toggleBtnActive]}
              onPress={() => setView('grid')}
            >
              <Grid3x3GapFill width={16} height={16} fill={view === 'grid' ? COLORS.white : COLORS.sub} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, view === 'list' && styles.toggleBtnActive]}
              onPress={() => setView('list')}
            >
              <ListUl width={16} height={16} fill={view === 'list' ? COLORS.white : COLORS.sub} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconBox}>
              <BoxSeam width={24} height={24} fill={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.statValue}>{orders.length}</Text>
              <Text style={styles.statLabel}>Total Orders</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#D1FAE5' }]}>
              <CheckCircleFill width={24} height={24} fill={COLORS.green} />
            </View>
            <View>
              <Text style={styles.statValue}>{orders.filter(o => o.status === 'approved').length}</Text>
              <Text style={styles.statLabel}>Approved</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#FEF3C7' }]}>
              <ClockFill width={24} height={24} fill={COLORS.yellow} />
            </View>
            <View>
              <Text style={styles.statValue}>{orders.filter(o => o.status === 'pending').length}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>
        </View>

        {/* Data */}
        <View style={styles.dataContainer}>
          {view === 'grid' ? (
            <FlatList
              key={`grid-${numColumns}`}
              data={filtered}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderGridCard}
              numColumns={isPhone ? 1 : numColumns}
              columnWrapperStyle={!isPhone && numColumns > 1 ? { gap: 16 } : undefined}
              ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
              scrollEnabled={false}
              ListEmptyComponent={<Text style={styles.emptyText}>No orders found.</Text>}
            />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { width: isPhone ? 50 : 60 }]}>ID</Text>
                  <Text style={[styles.tableHeaderCell, { width: isPhone ? 120 : 180 }]}>Ad Name</Text>
                  <Text style={[styles.tableHeaderCell, { width: isPhone ? 100 : 140 }]}>Customer</Text>
                  <Text style={[styles.tableHeaderCell, { width: isPhone ? 80 : 100 }]}>Amount</Text>
                  <Text style={[styles.tableHeaderCell, { width: isPhone ? 90 : 110 }]}>Status</Text>
                  <Text style={[styles.tableHeaderCell, { width: isPhone ? 80 : 100 }]}>Date</Text>
                  <Text style={[styles.tableHeaderCell, { width: isPhone ? 80 : 100 }]}>Actions</Text>
                </View>
                <FlatList
                  data={filtered}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={renderTableRow}
                  scrollEnabled={false}
                  ListEmptyComponent={<Text style={styles.emptyText}>No orders found.</Text>}
                />
              </View>
            </ScrollView>
          )}
        </View>
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <XLg width={20} height={20} fill={COLORS.white} />
              </TouchableOpacity>
            </View>
            {selectedOrder && (
              <View style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Ad Name:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.adName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Customer:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.customer}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Amount:</Text>
                  <Text style={styles.detailValue}>${selectedOrder.amount.toLocaleString()}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <StatusBadge status={selectedOrder.status} />
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.date}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Duration:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.duration}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    minHeight: '100%',
  },
  
  // Header
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#A0A0C0',
    marginTop: 2,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  filterBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },

  // Toolbar
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.card,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.slate,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    padding: 4,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.orange,
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.slate,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.sub,
    marginTop: 2,
  },

  // Data Container
  dataContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
  },

  // Grid Card
  gridCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 200,
  },
  gridCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  gridCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.slate,
    flex: 1,
    marginRight: 8,
  },
  gridInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  gridInfoText: {
    fontSize: 13,
    color: COLORS.sub,
    flex: 1,
  },
  gridActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  editBtn: {
    backgroundColor: '#FFF7ED',
  },
  deleteBtn: {
    backgroundColor: '#FEE2E2',
  },

  // Table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.sub,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tableCell: {},
  tableCellText: {
    fontSize: 13,
    color: COLORS.slate,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Status Badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Empty State
  emptyText: {
    textAlign: 'center',
    color: COLORS.sub,
    fontSize: 14,
    paddingVertical: 40,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    overflow: 'hidden',
  },
  modalHeader: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  modalBody: {
    padding: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.sub,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.slate,
    fontWeight: '600',
  },
});
