import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { FaqColors } from '@/constants/faq-theme';

type RowStatus = 'Active' | 'Inactive';
type ViewMode = 'list' | 'grid';
type MaterialIconName = keyof typeof MaterialIcons.glyphMap;

type CategoryTheme = {
  border: string;
  iconBg: string;
  iconColor: string;
  accent: string;
};

type FaqCategory = {
  id: number;
  name: string;
  description: string;
  sortOrder: number;
  status: RowStatus;
  createdDate: string;
  createdTime: string;
  articleCount: number;
  theme: CategoryTheme;
  icon: MaterialIconName;
};

const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: 1,
    name: 'About Flint & Thread',
    description: 'Information about our company, mission and vision, and what makes us unique in the fashion and textile industry.',
    sortOrder: 1,
    status: 'Active',
    createdDate: '18 Nov, 2025',
    createdTime: '10:30 AM',
    articleCount: 12,
    theme: { border: '#EF7B1A', iconBg: '#FFF7ED', iconColor: '#EF7B1A', accent: '#EF7B1A' },
    icon: 'groups',
  },
  {
    id: 2,
    name: 'Account & Profile',
    description: 'Manage your account settings, profile information, and personal preferences.',
    sortOrder: 2,
    status: 'Active',
    createdDate: '18 Nov, 2025',
    createdTime: '10:30 AM',
    articleCount: 8,
    theme: { border: '#22C55E', iconBg: '#ECFDF5', iconColor: '#16A34A', accent: '#16A34A' },
    icon: 'person',
  },
  {
    id: 3,
    name: 'Orders & Shopping',
    description: 'Everything about placing orders, tracking purchases, and shopping on our platform.',
    sortOrder: 3,
    status: 'Active',
    createdDate: '18 Nov, 2025',
    createdTime: '10:30 AM',
    articleCount: 15,
    theme: { border: '#9333EA', iconBg: '#F3E8FF', iconColor: '#9333EA', accent: '#9333EA' },
    icon: 'shopping-cart',
  },
  {
    id: 4,
    name: 'Shipping & Delivery',
    description: 'Shipping options, delivery timelines, and tracking your orders to your doorstep.',
    sortOrder: 4,
    status: 'Active',
    createdDate: '18 Nov, 2025',
    createdTime: '10:30 AM',
    articleCount: 10,
    theme: { border: '#2563EB', iconBg: '#EFF6FF', iconColor: '#2563EB', accent: '#2563EB' },
    icon: 'local-shipping',
  },
  {
    id: 5,
    name: 'Payments & Refunds',
    description: 'Payment methods, billing questions, and refund policies explained clearly.',
    sortOrder: 5,
    status: 'Active',
    createdDate: '18 Nov, 2025',
    createdTime: '10:30 AM',
    articleCount: 14,
    theme: { border: '#CA8A04', iconBg: '#FEF9C3', iconColor: '#CA8A04', accent: '#CA8A04' },
    icon: 'account-balance-wallet',
  },
  {
    id: 6,
    name: 'Returns & Exchanges',
    description: 'How to return or exchange items, eligibility criteria, and processing timelines.',
    sortOrder: 6,
    status: 'Active',
    createdDate: '18 Nov, 2025',
    createdTime: '10:30 AM',
    articleCount: 11,
    theme: { border: '#EF4444', iconBg: '#FEF2F2', iconColor: '#EF4444', accent: '#EF4444' },
    icon: 'autorenew',
  },
];

function Icon({
  name,
  size = 16,
  color = FaqColors.text,
}: {
  name: { ios: string; android: MaterialIconName; web: MaterialIconName };
  size?: number;
  color?: string;
}) {
  if (Platform.OS === 'ios') {
    return <SymbolView name={name.ios as never} size={size} tintColor={color} />;
  }
  const materialName = Platform.OS === 'web' ? name.web : name.android;
  return <MaterialIcons name={materialName} size={size} color={color} />;
}

function StatusBadge({ status }: { status: RowStatus }) {
  const active = status === 'Active';
  return (
    <View
      style={[
        styles.statusBadge,
        {
          backgroundColor: active ? FaqColors.activeBg : FaqColors.inactiveBg,
          borderColor: active ? FaqColors.activeBorder : FaqColors.inactiveBorder,
        },
      ]}>
      <ThemedText
        type="smallBold"
        style={{ fontSize: 12, color: active ? FaqColors.activeText : FaqColors.inactiveText }}>
        {status}
      </ThemedText>
    </View>
  );
}

function FaqRowActions() {
  return (
    <View style={styles.rowActions}>
      <Pressable style={[styles.faqActionBtn, { backgroundColor: FaqColors.viewBtn }]}>
        <Icon name={{ ios: 'eye', android: 'visibility', web: 'visibility' }} size={14} color="#fff" />
      </Pressable>
      <Pressable style={[styles.faqActionBtn, { backgroundColor: FaqColors.editBtn }]}>
        <Icon name={{ ios: 'square.and.pencil', android: 'edit', web: 'edit' }} size={14} color="#fff" />
      </Pressable>
      <Pressable style={[styles.faqActionBtn, styles.faqDeleteBtn]}>
        <Icon
          name={{ ios: 'trash', android: 'delete', web: 'delete' }}
          size={14}
          color={FaqColors.deleteBtnIcon}
        />
      </Pressable>
    </View>
  );
}

function CategoryNameCell({ category }: { category: FaqCategory }) {
  return (
    <View style={styles.nameCell}>
      <View style={[styles.nameIcon, { backgroundColor: category.theme.iconBg }]}>
        <MaterialIcons name={category.icon} size={18} color={category.theme.iconColor} />
      </View>
      <View style={styles.nameTextWrap}>
        <ThemedText type="smallBold" style={styles.categoryName} numberOfLines={1}>
          {category.name}
        </ThemedText>
        <ThemedText type="small" style={styles.categoryDesc} numberOfLines={2}>
          {category.description}
        </ThemedText>
      </View>
    </View>
  );
}

function FaqGridCard({ category }: { category: FaqCategory }) {
  return (
    <View style={[styles.gridCard, { borderTopColor: category.theme.border }]}>
      <View style={styles.gridCardHeader}>
        <View style={styles.gridCardTitleRow}>
          <View style={[styles.gridIcon, { backgroundColor: category.theme.iconBg }]}>
            <MaterialIcons name={category.icon} size={20} color={category.theme.iconColor} />
          </View>
          <ThemedText type="smallBold" style={styles.gridCardTitle} numberOfLines={2}>
            {category.name}
          </ThemedText>
        </View>
        <Pressable hitSlop={8}>
          <MaterialIcons name="more-vert" size={18} color={FaqColors.textMuted} />
        </Pressable>
      </View>

      <ThemedText type="small" style={styles.gridCardDesc} numberOfLines={3}>
        {category.description}
      </ThemedText>

      <View style={styles.gridMetaRow}>
        <View style={styles.gridDateRow}>
          <MaterialIcons name="calendar-today" size={13} color={FaqColors.textMuted} />
          <ThemedText type="small" style={{ color: FaqColors.textMuted }}>
            {category.createdDate}
          </ThemedText>
        </View>
        <StatusBadge status={category.status} />
      </View>

      <View style={styles.gridCardFooter}>
        <ThemedText type="smallBold" style={{ color: category.theme.accent }}>
          {category.articleCount} Articles
        </ThemedText>
        <Pressable style={[styles.gridArrowBtn, { borderColor: category.theme.accent }]}>
          <MaterialIcons name="chevron-right" size={18} color={category.theme.accent} />
        </Pressable>
      </View>
    </View>
  );
}

function FaqListTable({ rows }: { rows: FaqCategory[] }) {
  if (rows.length === 0) {
    return (
      <View style={styles.empty}>
        <ThemedText type="small" style={{ color: FaqColors.textMuted }}>
          No categories found.
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.tableCard}>
      <View style={styles.tableHead}>
        <View style={[styles.thCell, styles.colId]}>
          <ThemedText type="smallBold" style={styles.th}>ID</ThemedText>
        </View>
        <View style={[styles.thCell, styles.colName]}>
          <ThemedText type="smallBold" style={styles.th}>Category Name</ThemedText>
        </View>
        <View style={[styles.thCell, styles.colSort]}>
          <ThemedText type="smallBold" style={styles.th}>Sort Order</ThemedText>
        </View>
        <View style={[styles.thCell, styles.colStatus]}>
          <ThemedText type="smallBold" style={styles.th}>Status</ThemedText>
        </View>
        <View style={[styles.thCell, styles.colDate]}>
          <ThemedText type="smallBold" style={styles.th}>Created Date</ThemedText>
        </View>
        <View style={[styles.thCell, styles.colActions]}>
          <ThemedText type="smallBold" style={styles.th}>Action</ThemedText>
        </View>
      </View>

      {rows.map((row, i) => (
        <Pressable
          key={row.id}
          style={({ hovered }) => [
            styles.tableRow,
            i > 0 && styles.tableRowBorder,
            hovered && styles.tableRowHover,
          ]}>
          <View style={[styles.tdCell, styles.colId]}>
            <ThemedText type="smallBold" style={styles.idText}>
              {String(row.id).padStart(2, '0')}
            </ThemedText>
          </View>
          <View style={[styles.tdCell, styles.colName, styles.nameTdCell]}>
            <CategoryNameCell category={row} />
          </View>
          <View style={[styles.tdCell, styles.colSort]}>
            <ThemedText type="smallBold" style={styles.tdCenter}>{row.sortOrder}</ThemedText>
          </View>
          <View style={[styles.tdCell, styles.colStatus]}>
            <StatusBadge status={row.status} />
          </View>
          <View style={[styles.tdCell, styles.colDate]}>
            <ThemedText type="smallBold" style={styles.tdCenter}>{row.createdDate}</ThemedText>
            <ThemedText type="small" style={styles.timeText}>{row.createdTime}</ThemedText>
          </View>
          <View style={[styles.tdCell, styles.colActions]}>
            <FaqRowActions />
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const MOBILE_TABLE_WIDTH = 720;

function FaqMobileListTable({ rows }: { rows: FaqCategory[] }) {
  if (rows.length === 0) {
    return (
      <View style={styles.empty}>
        <ThemedText type="small" style={{ color: FaqColors.textMuted }}>
          No categories found.
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.tableCard}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
        <View style={{ minWidth: MOBILE_TABLE_WIDTH }}>
          <View style={styles.tableHead}>
            <View style={[styles.thCell, styles.colId]}>
              <ThemedText type="smallBold" style={styles.th}>ID</ThemedText>
            </View>
            <View style={[styles.thCell, styles.colName]}>
              <ThemedText type="smallBold" style={styles.th}>Category Name</ThemedText>
            </View>
            <View style={[styles.thCell, styles.colSort]}>
              <ThemedText type="smallBold" style={styles.th}>Sort Order</ThemedText>
            </View>
            <View style={[styles.thCell, styles.colStatus]}>
              <ThemedText type="smallBold" style={styles.th}>Status</ThemedText>
            </View>
            <View style={[styles.thCell, styles.colDate]}>
              <ThemedText type="smallBold" style={styles.th}>Created Date</ThemedText>
            </View>
            <View style={[styles.thCell, styles.colActions]}>
              <ThemedText type="smallBold" style={styles.th}>Action</ThemedText>
            </View>
          </View>

          {rows.map((row, i) => (
            <Pressable
              key={row.id}
              style={[styles.tableRow, i > 0 && styles.tableRowBorder, styles.tableRowPressed]}>
              <View style={[styles.tdCell, styles.colId]}>
                <ThemedText type="smallBold" style={styles.idText}>
                  {String(row.id).padStart(2, '0')}
                </ThemedText>
              </View>
              <View style={[styles.tdCell, styles.colName, styles.nameTdCell]}>
                <CategoryNameCell category={row} />
              </View>
              <View style={[styles.tdCell, styles.colSort]}>
                <ThemedText type="smallBold" style={styles.tdCenter}>{row.sortOrder}</ThemedText>
              </View>
              <View style={[styles.tdCell, styles.colStatus]}>
                <StatusBadge status={row.status} />
              </View>
              <View style={[styles.tdCell, styles.colDate]}>
                <ThemedText type="smallBold" style={styles.tdCenter}>{row.createdDate}</ThemedText>
                <ThemedText type="small" style={styles.timeText}>{row.createdTime}</ThemedText>
              </View>
              <View style={[styles.tdCell, styles.colActions]}>
                <FaqRowActions />
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function FaqGridView({ rows, columns }: { rows: FaqCategory[]; columns: number }) {
  if (rows.length === 0) {
    return (
      <View style={[styles.empty, styles.gridEmpty]}>
        <ThemedText type="small" style={{ color: FaqColors.textMuted }}>
          No categories found.
        </ThemedText>
      </View>
    );
  }

  const itemWidth = columns === 1 ? '100%' : columns === 2 ? '48.5%' : '31.8%';

  return (
    <View style={styles.gridContainer}>
      {rows.map((category) => (
        <View key={category.id} style={[styles.gridCardWrap, { width: itemWidth }]}>
          <FaqGridCard category={category} />
        </View>
      ))}
    </View>
  );
}

export default function FaqCategoriesScreen() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isMobile = !isWeb;

  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const gridColumns = isWeb ? (width < 768 ? 1 : width < 1100 ? 2 : 3) : 1;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQ_CATEGORIES;
    return FAQ_CATEGORIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        String(c.id).includes(q),
    );
  }, [query]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <AppHeader />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, isMobile && styles.contentMobile]}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.pageHeader, isMobile && styles.pageHeaderMobile]}>
          <View style={[styles.pageHeaderLeft, isMobile && styles.pageHeaderLeftMobile]}>
            <View style={styles.pageIconBox}>
              <MaterialIcons name="help-outline" size={22} color="#fff" />
            </View>
            <View style={styles.pageTitleWrap}>
              <ThemedText type="subtitle" style={[styles.pageTitle, isMobile && styles.pageTitleMobile]}>
                FAQ Categories Management
              </ThemedText>
              <View style={styles.breadcrumbs}>
                <Icon
                  name={{ ios: 'house', android: 'home', web: 'home' }}
                  size={13}
                  color={FaqColors.accent}
                />
                <ThemedText type="small" style={styles.breadcrumbLink}>Dashboard</ThemedText>
                <ThemedText type="small" style={styles.breadcrumbSep}>&gt;</ThemedText>
                <ThemedText type="small" style={styles.breadcrumbActive}>FAQ Categories</ThemedText>
              </View>
            </View>
          </View>
          <Pressable style={[styles.addBtn, isMobile && styles.addBtnMobile]}>
            <Icon name={{ ios: 'plus', android: 'add', web: 'add' }} size={14} color="#fff" />
            <ThemedText type="smallBold" style={{ color: '#fff' }}>
              Add New FAQ Category
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.screenNav}>
          <Link href="/locations" asChild>
            <Pressable>
              <ThemedText type="small" style={styles.navLink}>Locations</ThemedText>
            </Pressable>
          </Link>
          <ThemedText type="small" style={styles.navSep}>|</ThemedText>
          <ThemedText type="smallBold" style={styles.navActive}>FAQ Categories</ThemedText>
        </View>

        <View style={[styles.toolbar, isMobile && styles.toolbarMobile]}>
          <View style={[styles.searchBox, isMobile && styles.searchBoxMobile]}>
            <Icon name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} size={16} color={FaqColors.textLight} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search categories..."
              placeholderTextColor={FaqColors.textLight}
              style={styles.searchInput}
            />
          </View>
          <View style={styles.viewToggle}>
            {!isMobile && (
              <ThemedText type="small" style={{ color: FaqColors.textMuted }}>View:</ThemedText>
            )}
            <Pressable
              style={[styles.viewBtn, viewMode === 'grid' && styles.viewBtnActive]}
              onPress={() => setViewMode('grid')}>
              <Icon
                name={{ ios: 'square.grid.2x2', android: 'grid-view', web: 'grid-view' }}
                size={15}
                color={viewMode === 'grid' ? '#fff' : FaqColors.textMuted}
              />
            </Pressable>
            <Pressable
              style={[styles.viewBtn, viewMode === 'list' && styles.viewBtnActive]}
              onPress={() => setViewMode('list')}>
              <Icon
                name={{ ios: 'list.bullet', android: 'view-list', web: 'view-list' }}
                size={15}
                color={viewMode === 'list' ? '#fff' : FaqColors.textMuted}
              />
            </Pressable>
          </View>
        </View>

        {viewMode === 'list' ? (
          isWeb ? (
            <FaqListTable rows={filtered} />
          ) : (
            <FaqMobileListTable rows={filtered} />
          )
        ) : (
          <FaqGridView rows={filtered} columns={gridColumns} />
        )}

        <View style={[styles.pagination, isMobile && styles.paginationMobile]}>
          <ThemedText type="small" style={{ color: FaqColors.textMuted }}>
            Showing 1 to {filtered.length} of {filtered.length} categories
          </ThemedText>
          <View style={styles.pages}>
            <Pressable style={styles.pageArrow}>
              <Icon name={{ ios: 'chevron.left', android: 'chevron-left', web: 'chevron-left' }} size={14} color={FaqColors.textMuted} />
            </Pressable>
            <Pressable style={[styles.pageNum, styles.pageNumActive]}>
              <ThemedText type="smallBold" style={{ color: '#fff' }}>1</ThemedText>
            </Pressable>
            <Pressable style={styles.pageArrow}>
              <Icon name={{ ios: 'chevron.right', android: 'chevron-right', web: 'chevron-right' }} size={14} color={FaqColors.textMuted} />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: FaqColors.pageBg },
  screen: { flex: 1 },
  content: {
    padding: 24,
    paddingBottom: 40,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  contentMobile: { padding: 16, paddingBottom: 28 },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 16,
  },
  pageHeaderMobile: { flexDirection: 'column', alignItems: 'stretch' },
  pageHeaderLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, flex: 1 },
  pageHeaderLeftMobile: { flexDirection: 'row' },
  pageIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: FaqColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  pageTitleWrap: { flex: 1, minWidth: 0 },
  pageTitle: { fontSize: 26, lineHeight: 32, color: FaqColors.titleDark, marginBottom: 6 },
  pageTitleMobile: { fontSize: 22, lineHeight: 28 },
  breadcrumbs: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  breadcrumbLink: { color: FaqColors.accent, fontSize: 13 },
  breadcrumbSep: { color: FaqColors.textMuted, fontSize: 13 },
  breadcrumbActive: { color: FaqColors.textMuted, fontSize: 13 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: FaqColors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flexShrink: 0,
  },
  addBtnMobile: { justifyContent: 'center', paddingVertical: 12 },
  screenNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  navLink: { color: FaqColors.accent, fontSize: 13 },
  navSep: { color: FaqColors.textLight, fontSize: 13 },
  navActive: { color: FaqColors.text, fontSize: 13 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  toolbarMobile: { gap: 10 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: FaqColors.cardBg,
    borderWidth: 1,
    borderColor: FaqColors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 44,
  },
  searchBoxMobile: { minWidth: 0 },
  searchInput: { flex: 1, fontSize: 14, color: FaqColors.text, paddingVertical: 0 },
  viewToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  viewBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: FaqColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: FaqColors.cardBg,
  },
  viewBtnActive: { backgroundColor: FaqColors.viewActive, borderColor: FaqColors.viewActive },
  tableCard: {
    backgroundColor: FaqColors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: FaqColors.border,
    overflow: 'hidden',
    marginBottom: 16,
  },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FaqColors.tableHeader,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: FaqColors.border,
  },
  thCell: { alignItems: 'center', justifyContent: 'center' },
  th: { color: FaqColors.textMuted, fontSize: 13, textAlign: 'center', width: '100%' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
  },
  tableRowBorder: { borderTopWidth: 1, borderTopColor: FaqColors.borderLight },
  tableRowHover: { backgroundColor: '#FFF7ED' },
  tableRowPressed: { backgroundColor: '#FFF7ED' },
  colId: { width: 56, flexShrink: 0 },
  colName: { width: 260, flexShrink: 0 },
  colSort: { width: 90, flexShrink: 0 },
  colStatus: { width: 100, flexShrink: 0 },
  colDate: { width: 120, flexShrink: 0 },
  colActions: { width: 130, flexShrink: 0 },
  tdCell: { justifyContent: 'center', overflow: 'hidden' },
  nameTdCell: { alignItems: 'flex-start' },
  tdCenter: { textAlign: 'center', width: '100%', color: FaqColors.text },
  idText: { color: FaqColors.idText, textAlign: 'center', width: '100%' },
  timeText: { color: FaqColors.textMuted, textAlign: 'center', fontSize: 11, marginTop: 2 },
  nameCell: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 4, minWidth: 0 },
  nameIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  nameTextWrap: { flex: 1, minWidth: 0 },
  categoryName: { color: FaqColors.text, fontSize: 13, marginBottom: 2 },
  categoryDesc: { color: FaqColors.textMuted, fontSize: 12, lineHeight: 16 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'center',
  },
  rowActions: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  faqActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqDeleteBtn: { backgroundColor: FaqColors.deleteBtnBg },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 16 },
  gridCardWrap: { minWidth: 200 },
  gridCard: {
    backgroundColor: FaqColors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: FaqColors.border,
    borderTopWidth: 3,
    padding: 16,
    flex: 1,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 1px 3px rgba(0,0,0,0.08)' as never }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.08,
          shadowRadius: 3,
          elevation: 2,
        }),
  },
  gridCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  gridCardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  gridIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  gridCardTitle: { flex: 1, color: FaqColors.text, fontSize: 15 },
  gridCardDesc: { color: FaqColors.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 14 },
  gridMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  gridDateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gridCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: FaqColors.borderLight,
    paddingTop: 12,
  },
  gridArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { padding: 32, alignItems: 'center' },
  gridEmpty: {
    backgroundColor: FaqColors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: FaqColors.border,
    marginBottom: 16,
  },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  paginationMobile: { flexDirection: 'column', gap: 12, alignItems: 'flex-start' },
  pages: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pageArrow: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: FaqColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: FaqColors.cardBg,
  },
  pageNum: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: FaqColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: FaqColors.cardBg,
  },
  pageNumActive: { backgroundColor: FaqColors.accent, borderColor: FaqColors.accent },
});
