import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  type ApprovalProduct,
  type ProductStatus,
} from '@/constants/product-approval-data';
import { getApiErrorMessage } from '@/lib/api/client';
import { mapProductListToApprovalRow } from '@/lib/mappers';
import { fetchProductStats, fetchProducts, type ProductListRow } from '@/services/productApi';

// ─── Theme & breakpoints ─────────────────────────────────────────────────────

const PALETTE = {
  purple: '#5E35B1',
  purpleLight: '#EDE9FE',
  purpleDark: '#4C1D95',
  orange: '#F59E0B',
  orangeLight: '#FEF3C7',
  blue: '#3B82F6',
  blueLight: '#DBEAFE',
  green: '#22C55E',
  greenLight: '#DCFCE7',
  red: '#EF4444',
  redLight: '#FEE2E2',
  pageBg: '#F4F6FB',
  cardBg: '#FFFFFF',
  border: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  brandOrange: '#F97316',
};

const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  laptop: 1024,
  desktop: 1280,
} as const;

type Product = ApprovalProduct;

type ProductStats = {
  pending: number;
  review: number;
  approved: number;
  rejected: number;
  all: number;
};

const DEFAULT_STATS: ProductStats = {
  pending: 0,
  review: 0,
  approved: 0,
  rejected: 0,
  all: 0,
};

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/96?text=Product';

function toApprovalProduct(row: ReturnType<typeof mapProductListToApprovalRow>): ApprovalProduct {
  return {
    id: row.id,
    name: row.name,
    description: row.sku !== '—' ? `SKU: ${row.sku}` : '—',
    image: row.image || PLACEHOLDER_IMAGE,
    seller: row.seller,
    email: '',
    category: row.category,
    status: row.status as ProductStatus,
    submittedOn: row.submittedAt,
  };
}

const STATUS_CONFIG: Record<
  ProductStatus,
  { label: string; color: string; bg: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }
> = {
  pending: { label: 'Pending', color: PALETTE.orange, bg: PALETTE.orangeLight, icon: 'clock-outline' },
  review: { label: 'Review', color: PALETTE.blue, bg: PALETTE.blueLight, icon: 'magnify' },
  approved: { label: 'Approved', color: PALETTE.green, bg: PALETTE.greenLight, icon: 'check-circle-outline' },
  rejected: { label: 'Rejected', color: PALETTE.red, bg: PALETTE.redLight, icon: 'close-circle-outline' },
};

type FilterKey = 'all' | ProductStatus;

// ─── Hooks ─────────────────────────────────────────────────────────────────────

function useBreakpoint() {
  const { width } = useWindowDimensions();
  return {
    width,
    isMobile: width < BREAKPOINTS.tablet,
    isTablet: width >= BREAKPOINTS.tablet && width < BREAKPOINTS.laptop,
    isLaptop: width >= BREAKPOINTS.laptop && width < BREAKPOINTS.desktop,
    isDesktop: width >= BREAKPOINTS.desktop,
    isWide: width >= BREAKPOINTS.laptop,
  };
}

// ─── Shared UI ─────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ProductStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

function NewBadge() {
  return (
    <View style={styles.newBadge}>
      <Text style={styles.newBadgeText}>New</Text>
    </View>
  );
}

function StatCard({
  count,
  label,
  color,
  bg,
  icon,
  onPress,
  grid,
  wide,
}: {
  count: number;
  label: string;
  color: string;
  bg: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress?: () => void;
  grid?: boolean;
  wide?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.statCard,
        grid && styles.statCardGrid,
        wide && styles.statCardWide,
        pressed && styles.pressed,
      ]}>
      {grid ? (
        <>
          <View style={styles.statCardTop}>
            <View style={[styles.statIconWrap, styles.statIconWrapGrid, { backgroundColor: bg }]}>
              <MaterialCommunityIcons name={icon} size={18} color={color} />
            </View>
            <MaterialCommunityIcons name="chevron-right" size={16} color={color} />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statCount, styles.statCountGrid]}>{count}</Text>
            <Text style={[styles.statLabel, styles.statLabelGrid]} numberOfLines={2}>
              {label}
            </Text>
          </View>
        </>
      ) : (
        <>
          <View style={[styles.statIconWrap, { backgroundColor: bg }]}>
            <MaterialCommunityIcons name={icon} size={22} color={color} />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statCount}>{count}</Text>
            <Text style={styles.statLabel} numberOfLines={2}>
              {label}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={18} color={color} />
        </>
      )}
    </Pressable>
  );
}

function FilterDropdown({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <View style={[styles.filterDropdown, wide ? styles.filterDropdownWide : styles.filterDropdownCompact]}>
      <Text style={styles.filterLabel}>{label}</Text>
      <Pressable style={styles.filterSelect}>
        <Text style={styles.filterSelectText} numberOfLines={1}>
          {value}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={18} color={PALETTE.textSecondary} />
      </Pressable>
    </View>
  );
}

function ActionButtons({ inline, productId }: { inline?: boolean; productId?: string }) {
  const openDetails = () => {
    if (productId) router.push(`/productDetails?id=${productId}`);
  };

  return (
    <View style={[styles.actionButtons, inline && styles.actionButtonsInline]}>
      <Pressable
        onPress={openDetails}
        style={({ pressed }) => [
          styles.viewDetailsBtn,
          inline && styles.viewDetailsBtnInline,
          pressed && styles.pressed,
        ]}>
        <MaterialCommunityIcons name="eye-outline" size={inline ? 12 : 14} color={PALETTE.orange} />
        <Text style={[styles.viewDetailsText, inline && styles.actionTextInline]}>View Details</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [
          styles.activateBtn,
          inline && styles.activateBtnInline,
          pressed && styles.pressed,
        ]}>
        <MaterialCommunityIcons name="check-circle-outline" size={inline ? 12 : 14} color="#FFF" />
        <Text style={[styles.activateText, inline && styles.actionTextInline]}>Activate</Text>
      </Pressable>
    </View>
  );
}

// ─── Headers ─────────────────────────────────────────────────────────────────

function MobileTopBar() {
  return (
    <View style={styles.mobileTopBar}>
      <Pressable style={styles.iconBtn} hitSlop={8}>
        <MaterialCommunityIcons name="menu" size={24} color={PALETTE.textPrimary} />
      </Pressable>

      <View style={styles.brandCenter}>
        <View style={styles.brandLogo}>
          <Text style={styles.brandLogoText}>F</Text>
        </View>
        <View>
          <Text style={styles.brandName}>FLINT & THREAD</Text>
          <Text style={styles.brandTagline}>The Infinity and Vanguard</Text>
        </View>
      </View>

      <View style={styles.topBarActions}>
        <Pressable style={styles.iconBtn} hitSlop={8}>
          <MaterialCommunityIcons name="weather-night" size={20} color={PALETTE.textPrimary} />
        </Pressable>
        <Pressable style={styles.iconBtn} hitSlop={8}>
          <View>
            <MaterialCommunityIcons name="bell-outline" size={20} color={PALETTE.textPrimary} />
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>2</Text>
            </View>
          </View>
        </Pressable>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>FL</Text>
        </View>
      </View>
    </View>
  );
}

function WebTopBar() {
  return (
    <View style={styles.webTopBar}>
      <View style={styles.globalSearch}>
        <MaterialCommunityIcons name="magnify" size={18} color={PALETTE.textMuted} />
        <TextInput
          placeholder="Search anything..."
          placeholderTextColor={PALETTE.textMuted}
          style={styles.globalSearchInput}
        />
        <View style={styles.searchShortcut}>
          <Text style={styles.searchShortcutText}>Ctrl + K</Text>
        </View>
      </View>

      <View style={styles.webTopBarRight}>
        <Pressable style={styles.webIconBtn}>
          <MaterialCommunityIcons name="weather-night" size={20} color={PALETTE.textPrimary} />
        </Pressable>
        <Pressable style={styles.webIconBtn}>
          <View>
            <MaterialCommunityIcons name="bell-outline" size={20} color={PALETTE.textPrimary} />
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>2</Text>
            </View>
          </View>
        </Pressable>
        <Pressable style={styles.webIconBtn}>
          <MaterialCommunityIcons name="cog-outline" size={20} color={PALETTE.textPrimary} />
        </Pressable>
        <View style={styles.webProfile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>FL</Text>
          </View>
          <View>
            <Text style={styles.profileName}>Flint Admin</Text>
            <Text style={styles.profileRole}>Super Admin</Text>
          </View>
          <MaterialCommunityIcons name="chevron-down" size={18} color={PALETTE.textSecondary} />
        </View>
      </View>
    </View>
  );
}

function PageHeader({ isWide }: { isWide: boolean }) {
  return (
    <View style={[styles.pageHeader, isWide && styles.pageHeaderWide]}>
      <View style={styles.pageHeaderLeft}>
        <View style={styles.pageIcon}>
          <MaterialCommunityIcons name="shield-check" size={28} color="#FFF" />
        </View>
        <View>
          <Text style={styles.pageTitle}>Product Approvals</Text>
          <Text style={styles.breadcrumb}>Dashboard {'>'} Product Approvals</Text>
        </View>
      </View>

      {isWide && (
        <View style={styles.pageHeaderActions}>
          <Pressable style={({ pressed }) => [styles.headerOutlineBtn, pressed && styles.pressed]}>
            <Text style={styles.headerOutlineText}>View Details</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.headerPurpleBtn, pressed && styles.pressed]}>
            <Text style={styles.headerPurpleText}>Activate</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── Stats & Filters ─────────────────────────────────────────────────────────

function StatsRow({
  stats,
  onFilter,
  isWide,
}: {
  stats: ProductStats;
  onFilter: (f: FilterKey) => void;
  isWide: boolean;
}) {
  const isCompact = !isWide;
  const cardProps = { grid: isCompact, wide: isWide };
  const cards = (
    <>
      <StatCard
        {...cardProps}
        count={stats.pending}
        label="Pending Products"
        color={PALETTE.orange}
        bg={PALETTE.orangeLight}
        icon="clock-outline"
        onPress={() => onFilter('pending')}
      />
      <StatCard
        {...cardProps}
        count={stats.review}
        label="Under Review Products"
        color={PALETTE.blue}
        bg={PALETTE.blueLight}
        icon="magnify"
        onPress={() => onFilter('review')}
      />
      <StatCard
        {...cardProps}
        count={stats.approved}
        label="Approved Products"
        color={PALETTE.green}
        bg={PALETTE.greenLight}
        icon="check-circle-outline"
        onPress={() => onFilter('approved')}
      />
      <StatCard
        {...cardProps}
        count={stats.rejected}
        label="Rejected Products"
        color={PALETTE.red}
        bg={PALETTE.redLight}
        icon="close-circle-outline"
        onPress={() => onFilter('rejected')}
      />
    </>
  );

  if (isCompact) {
    return <View style={styles.statsGridCompact}>{cards}</View>;
  }

  return <View style={[styles.statsGrid, styles.statsGridWide]}>{cards}</View>;
}

function StatusTabs({
  stats,
  active,
  onChange,
  isMobile,
}: {
  stats: ProductStats;
  active: FilterKey;
  onChange: (f: FilterKey) => void;
  isMobile: boolean;
}) {
  const tabs: { key: FilterKey; label: string; count: number; color: string; bg: string }[] = [
    { key: 'all', label: 'All', count: stats.all, color: '#FFF', bg: PALETTE.purple },
    { key: 'pending', label: 'Pending', count: stats.pending, color: PALETTE.orange, bg: PALETTE.orangeLight },
    { key: 'review', label: 'Review', count: stats.review, color: PALETTE.blue, bg: PALETTE.blueLight },
    { key: 'approved', label: 'Approved', count: stats.approved, color: PALETTE.green, bg: PALETTE.greenLight },
    { key: 'rejected', label: 'Rejected', count: stats.rejected, color: PALETTE.red, bg: PALETTE.redLight },
  ];

  const content = tabs.map((tab) => {
    const isActive = active === tab.key;
    return (
      <Pressable
        key={tab.key}
        onPress={() => onChange(tab.key)}
        style={[
          styles.statusTab,
          isActive && tab.key === 'all' && { backgroundColor: PALETTE.purple },
          isActive && tab.key !== 'all' && { backgroundColor: tab.bg, borderColor: tab.color },
          !isActive && { borderColor: tab.color, backgroundColor: '#FFF' },
        ]}>
        <Text
          style={[
            styles.statusTabText,
            isActive && tab.key === 'all' && { color: '#FFF' },
            isActive && tab.key !== 'all' && { color: tab.color },
            !isActive && { color: tab.color },
          ]}>
          {tab.label} ({tab.count})
        </Text>
      </Pressable>
    );
  });

  if (isMobile) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statusTabsScroll}>
        {content}
      </ScrollView>
    );
  }

  return <View style={styles.statusTabs}>{content}</View>;
}

function FilterSection({
  stats,
  search,
  onSearchChange,
  activeFilter,
  onFilterChange,
  isMobile,
  isTablet,
  isWide,
}: {
  stats: ProductStats;
  search: string;
  onSearchChange: (v: string) => void;
  activeFilter: FilterKey;
  onFilterChange: (f: FilterKey) => void;
  isMobile: boolean;
  isTablet: boolean;
  isWide: boolean;
}) {
  return (
    <View style={styles.queueCard}>
      <View style={styles.queueHeader}>
        <Text style={styles.queueTitle}>Product Approval Queue</Text>
        <Pressable style={styles.filterIconBtn}>
          <MaterialCommunityIcons name="filter-variant" size={18} color={PALETTE.purple} />
        </Pressable>
      </View>

      <View
        style={[
          styles.filtersGrid,
          isMobile && styles.filtersGridMobile,
          isTablet && styles.filtersGridTablet,
          isWide && styles.filtersGridWide,
        ]}>
        <FilterDropdown label="Seller" value="All Sellers" wide={isWide} />
        <FilterDropdown label="Main Category" value="All Main Categories" wide={isWide} />
        <FilterDropdown label="Category" value="All Categories" wide={isWide} />
        <FilterDropdown label="Subcategory" value="All Subcategories" wide={isWide} />
      </View>

      <View style={[styles.searchRow, isMobile && styles.searchRowMobile]}>
        <View style={styles.searchBox}>
          <TextInput
            placeholder="Search products..."
            placeholderTextColor={PALETTE.textMuted}
            value={search}
            onChangeText={onSearchChange}
            style={styles.searchInput}
          />
          <Pressable style={styles.searchBtn}>
            <MaterialCommunityIcons name="magnify" size={20} color="#FFF" />
          </Pressable>
        </View>

        {isMobile && (
          <View style={styles.mobileStatusDropdown}>
            <Text style={styles.filterLabel}>Status</Text>
            <Pressable style={styles.filterSelect}>
              <Text style={styles.filterSelectText}>All ({stats.all})</Text>
              <MaterialCommunityIcons name="chevron-down" size={18} color={PALETTE.textSecondary} />
            </Pressable>
          </View>
        )}
      </View>

      <StatusTabs stats={stats} active={activeFilter} onChange={onFilterChange} isMobile={isMobile} />
    </View>
  );
}

// ─── Product list ────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: Product }) {
  return (
    <View style={styles.productCard}>
      <View style={styles.productCardTop}>
        <Image source={{ uri: product.image }} style={styles.productThumb} contentFit="cover" />
        <View style={styles.productCardInfo}>
          <View style={styles.productNameRow}>
            <Text style={styles.productName} numberOfLines={1}>
              {product.name}
            </Text>
            {product.isNew && <NewBadge />}
          </View>
          <Text style={styles.productDesc} numberOfLines={2}>
            {product.description}
          </Text>
        </View>
        <StatusBadge status={product.status} />
      </View>

      <View style={styles.sellerActionRow}>
        <View style={styles.sellerRow}>
          <View style={styles.sellerIcon}>
            <MaterialCommunityIcons name="store" size={14} color={PALETTE.purple} />
          </View>
          <View style={styles.sellerInfo}>
            <Text style={styles.sellerName} numberOfLines={1}>
              {product.seller}
            </Text>
            <Text style={styles.sellerEmail} numberOfLines={1}>
              {product.email}
            </Text>
            <Text style={styles.sellerCategory} numberOfLines={1}>
              {product.category}
            </Text>
          </View>
        </View>
        <ActionButtons inline productId={product.id} />
      </View>
    </View>
  );
}

function ProductTable({
  products,
  selected,
  onToggle,
  onToggleAll,
}: {
  products: Product[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
}) {
  const allSelected = products.length > 0 && products.every((p) => selected.has(p.id));

  return (
    <View style={styles.tableCard}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Pressable style={styles.tableColCheck} onPress={onToggleAll}>
              <View style={[styles.checkbox, allSelected && styles.checkboxChecked]}>
                {allSelected && <MaterialCommunityIcons name="check" size={12} color="#FFF" />}
              </View>
            </Pressable>
            <Text style={[styles.tableHeaderText, styles.tableColProduct]}>Product Details</Text>
            <Text style={[styles.tableHeaderText, styles.tableColSeller]}>Seller</Text>
            <Text style={[styles.tableHeaderText, styles.tableColCategory]}>Category</Text>
            <Text style={[styles.tableHeaderText, styles.tableColStatus]}>Status</Text>
            <Text style={[styles.tableHeaderText, styles.tableColDate]}>Submitted On</Text>
            <Text style={[styles.tableHeaderText, styles.tableColActions]}>Actions</Text>
          </View>

          {products.map((product) => (
            <View key={product.id} style={styles.tableRow}>
              <Pressable style={styles.tableColCheck} onPress={() => onToggle(product.id)}>
                <View
                  style={[
                    styles.checkbox,
                    selected.has(product.id) && styles.checkboxChecked,
                  ]}>
                  {selected.has(product.id) && (
                    <MaterialCommunityIcons name="check" size={12} color="#FFF" />
                  )}
                </View>
              </Pressable>

              <View style={[styles.tableColProduct, styles.tableCellProduct]}>
                <Image
                  source={{ uri: product.image }}
                  style={styles.tableThumb}
                  contentFit="cover"
                />
                <View style={styles.tableProductInfo}>
                  <View style={styles.productNameRow}>
                    <Text style={styles.productName}>{product.name}</Text>
                    {product.isNew && <NewBadge />}
                  </View>
                  <Text style={styles.productDesc} numberOfLines={2}>
                    {product.description}
                  </Text>
                </View>
              </View>

              <View style={styles.tableColSeller}>
                <Text style={styles.sellerName}>{product.seller}</Text>
                <Text style={styles.sellerEmail}>{product.email}</Text>
              </View>

              <Text style={[styles.tableColCategory, styles.tableCellText]}>{product.category}</Text>

              <View style={styles.tableColStatus}>
                <StatusBadge status={product.status} />
              </View>

              <Text style={[styles.tableColDate, styles.tableCellText]}>{product.submittedOn}</Text>

              <View style={styles.tableColActions}>
                <ActionButtons productId={product.id} />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const PAGE_SIZE = 20;

function buildPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | 'ellipsis')[] = [1];
  if (current > 3) pages.push('ellipsis');
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p += 1) {
    pages.push(p);
  }
  if (current < total - 2) pages.push('ellipsis');
  if (total > 1) pages.push(total);
  return pages;
}

function Pagination({
  isMobile,
  page,
  totalPages,
  totalElements,
  onPageChange,
}: {
  isMobile: boolean;
  page: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (page: number) => void;
}) {
  const start = totalElements === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, totalElements);
  const pageNumbers = buildPageNumbers(page, totalPages);

  if (totalPages <= 1) {
    return (
      <View style={[styles.pagination, isMobile && styles.paginationMobile]}>
        <Text style={styles.paginationInfo}>
          Showing {start} to {end} of {totalElements} products
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.pagination, isMobile && styles.paginationMobile]}>
      <Text style={styles.paginationInfo}>
        Showing {start} to {end} of {totalElements} products
      </Text>
      <View style={styles.paginationControls}>
        <Pressable
          style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
          disabled={page <= 1}
          onPress={() => onPageChange(page - 1)}>
          <MaterialCommunityIcons name="chevron-left" size={18} color={PALETTE.textSecondary} />
        </Pressable>
        {pageNumbers.map((num, index) =>
          num === 'ellipsis' ? (
            <Text key={`e-${index}`} style={styles.pageEllipsis}>
              ...
            </Text>
          ) : (
            <Pressable
              key={num}
              style={[styles.pageNum, num === page && styles.pageNumActive]}
              onPress={() => onPageChange(num)}>
              <Text style={[styles.pageNumText, num === page && styles.pageNumTextActive]}>
                {num}
              </Text>
            </Pressable>
          ),
        )}
        <Pressable
          style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
          disabled={page >= totalPages}
          onPress={() => onPageChange(page + 1)}>
          <MaterialCommunityIcons name="chevron-right" size={18} color={PALETTE.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

function filterStatusForApi(filter: FilterKey): string | undefined {
  if (filter === 'all') return undefined;
  if (filter === 'approved') return 'active';
  if (filter === 'review') return 'under_review';
  return filter;
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ProductApprovalScreen() {
  const { isMobile, isTablet, isWide, width } = useBreakpoint();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [products, setProducts] = useState<ApprovalProduct[]>([]);
  const [stats, setStats] = useState<ProductStats>(DEFAULT_STATS);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiStatus = filterStatusForApi(activeFilter);
      const [page, apiStats] = await Promise.all([
        fetchProducts({
          status: apiStatus,
          search: debouncedSearch.trim() || undefined,
          page: currentPage - 1,
          size: PAGE_SIZE,
        }),
        fetchProductStats(),
      ]);
      setProducts(
        page.items.map((p: ProductListRow) =>
          toApprovalProduct(mapProductListToApprovalRow(p)),
        ),
      );
      setTotalProducts(page.totalElements);
      setTotalPages(page.totalPages);
      if (currentPage > page.totalPages && page.totalPages > 0) {
        setCurrentPage(page.totalPages);
      }
      setStats({
        pending: Number(apiStats.pending ?? 0),
        review: Number(apiStats.underReview ?? 0),
        approved: Number(apiStats.approved ?? apiStats.active ?? 0),
        rejected: Number(apiStats.rejected ?? 0),
        all: Number(apiStats.total ?? 0),
      });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load products.'));
    } finally {
      setLoading(false);
    }
  }, [activeFilter, currentPage, debouncedSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFilterChange = useCallback((filter: FilterKey) => {
    setActiveFilter(filter);
    setCurrentPage(1);
    setSelected(new Set());
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setCurrentPage(1);
    setSelected(new Set());
  }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (products.every((p) => selected.has(p.id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map((p) => p.id)));
    }
  };

  const contentMaxWidth = isWide ? Math.min(width, 1400) : width;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.screen}>
        {isWide ? <WebTopBar /> : <MobileTopBar />}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' },
          ]}
          showsVerticalScrollIndicator={false}>
          <PageHeader isWide={isWide} />

          <StatsRow stats={stats} onFilter={handleFilterChange} isWide={isWide} />

          <FilterSection
            stats={stats}
            search={search}
            onSearchChange={handleSearchChange}
            activeFilter={activeFilter}
            onFilterChange={handleFilterChange}
            isMobile={isMobile}
            isTablet={isTablet}
            isWide={isWide}
          />

          {loading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator size="large" color={PALETTE.purple} />
              <Text style={styles.stateText}>Loading products…</Text>
            </View>
          ) : error ? (
            <View style={styles.stateBox}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryBtn} onPress={loadData}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </Pressable>
            </View>
          ) : isWide ? (
            <ProductTable
              products={products}
              selected={selected}
              onToggle={toggleSelect}
              onToggleAll={toggleSelectAll}
            />
          ) : (
            <View style={styles.productList}>
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </View>
          )}

          {!loading && !error && (
            <Pagination
              isMobile={isMobile}
              page={currentPage}
              totalPages={totalPages}
              totalElements={totalProducts}
              onPageChange={setCurrentPage}
            />
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PALETTE.pageBg,
  },
  screen: {
    flex: 1,
    backgroundColor: PALETTE.pageBg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 16,
  },
  pressed: {
    opacity: 0.85,
  },

  // Mobile top bar
  mobileTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: PALETTE.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.border,
  },
  iconBtn: {
    padding: 4,
  },
  brandCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  brandLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: PALETTE.brandOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogoText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  brandName: {
    fontSize: 11,
    fontWeight: '800',
    color: PALETTE.textPrimary,
    letterSpacing: 0.5,
  },
  brandTagline: {
    fontSize: 8,
    color: PALETTE.textMuted,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: PALETTE.red,
    borderRadius: 8,
    minWidth: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: PALETTE.brandOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Web top bar
  webTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: PALETTE.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.border,
    gap: 16,
  },
  globalSearch: {
    flex: 1,
    maxWidth: 480,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.pageBg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    gap: 8,
    borderWidth: 1,
    borderColor: PALETTE.border,
  },
  globalSearchInput: {
    flex: 1,
    fontSize: 14,
    color: PALETTE.textPrimary,
  },
  searchShortcut: {
    backgroundColor: PALETTE.cardBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: PALETTE.border,
  },
  searchShortcutText: {
    fontSize: 11,
    color: PALETTE.textMuted,
    fontWeight: '500',
  },
  webTopBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  webIconBtn: {
    padding: 8,
    borderRadius: 8,
  },
  webProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: PALETTE.border,
    marginLeft: 4,
  },
  profileName: {
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE.textPrimary,
  },
  profileRole: {
    fontSize: 11,
    color: PALETTE.textMuted,
  },

  // Page header
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 8,
    gap: 12,
  },
  pageHeaderWide: {
    alignItems: 'center',
  },
  pageHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  pageIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: PALETTE.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: PALETTE.textPrimary,
  },
  breadcrumb: {
    fontSize: 13,
    color: PALETTE.textMuted,
    marginTop: 2,
  },
  pageHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  headerOutlineBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: PALETTE.orange,
  },
  headerOutlineText: {
    color: PALETTE.orange,
    fontWeight: '600',
    fontSize: 13,
  },
  headerPurpleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: PALETTE.purple,
  },
  headerPurpleText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13,
  },

  // Stats — 2×2 grid on mobile & tablet (native + web responsive)
  statsGridCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
    alignSelf: 'stretch',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
  },
  statsGridWide: {
    flexWrap: 'nowrap',
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.cardBg,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: PALETTE.border,
    flex: 1,
    minWidth: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  statCardGrid: {
    width: '48%',
    maxWidth: '48%',
    flexBasis: '48%',
    flexGrow: 0,
    flexShrink: 0,
    flex: 0,
    minWidth: 0,
    flexDirection: 'column',
    alignItems: 'stretch',
    padding: 12,
    gap: 8,
  },
  statCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statIconWrapGrid: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  statCountGrid: {
    fontSize: 20,
  },
  statLabelGrid: {
    fontSize: 11,
    lineHeight: 15,
  },
  statCardWide: {
    flex: 1,
    minWidth: 0,
  },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
  },
  statCount: {
    fontSize: 22,
    fontWeight: '800',
    color: PALETTE.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: PALETTE.textSecondary,
    marginTop: 2,
  },

  // Queue / filters
  queueCard: {
    backgroundColor: PALETTE.cardBg,
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: PALETTE.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  queueTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: PALETTE.textPrimary,
  },
  filterIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: PALETTE.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  filtersGridMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filtersGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filtersGridWide: {
    flexDirection: 'row',
  },
  filterDropdown: {
    gap: 6,
  },
  filterDropdownCompact: {
    flexBasis: '48%',
    maxWidth: '48%',
    minWidth: 140,
  },
  filterDropdownWide: {
    flex: 1,
    minWidth: 150,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: PALETTE.textSecondary,
  },
  filterSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: PALETTE.cardBg,
    gap: 8,
  },
  filterSelectText: {
    flex: 1,
    fontSize: 13,
    color: PALETTE.textPrimary,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  searchRowMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: PALETTE.cardBg,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    fontSize: 14,
    color: PALETTE.textPrimary,
  },
  searchBtn: {
    backgroundColor: PALETTE.purple,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileStatusDropdown: {
    gap: 6,
  },
  statusTabsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  statusTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  statusTabText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Product cards (mobile/tablet)
  productList: {
    gap: 12,
  },
  productCard: {
    backgroundColor: PALETTE.cardBg,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: PALETTE.border,
  },
  productCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  productThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: PALETTE.pageBg,
  },
  productCardInfo: {
    flex: 1,
    gap: 4,
  },
  productNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE.textPrimary,
  },
  newBadge: {
    backgroundColor: PALETTE.greenLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: PALETTE.green,
  },
  productDesc: {
    fontSize: 12,
    color: PALETTE.textSecondary,
    lineHeight: 17,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sellerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: PALETTE.border,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  sellerIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: PALETTE.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerInfo: {
    flex: 1,
    gap: 2,
  },
  sellerName: {
    fontSize: 13,
    fontWeight: '600',
    color: PALETTE.textPrimary,
  },
  sellerEmail: {
    fontSize: 11,
    color: PALETTE.textMuted,
  },
  sellerCategory: {
    fontSize: 11,
    color: PALETTE.purple,
    fontWeight: '500',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButtonsInline: {
    flexDirection: 'row',
    flexShrink: 0,
    flexWrap: 'nowrap',
    gap: 6,
    alignItems: 'center',
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: PALETTE.orange,
    backgroundColor: '#FFF',
    alignSelf: 'flex-start',
  },
  viewDetailsText: {
    color: PALETTE.orange,
    fontSize: 12,
    fontWeight: '600',
  },
  activateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: PALETTE.purple,
    alignSelf: 'flex-start',
  },
  activateText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  viewDetailsBtnInline: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
  },
  activateBtnInline: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
  },
  actionTextInline: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Table (laptop/desktop)
  tableCard: {
    backgroundColor: PALETTE.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PALETTE.border,
    overflow: 'hidden',
  },
  table: {
    minWidth: 960,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.pageBg,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.border,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.border,
  },
  tableColCheck: {
    width: 40,
    alignItems: 'center',
  },
  tableColProduct: {
    width: 280,
  },
  tableColSeller: {
    width: 160,
  },
  tableColCategory: {
    width: 150,
  },
  tableColStatus: {
    width: 100,
  },
  tableColDate: {
    width: 170,
  },
  tableColActions: {
    width: 220,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: PALETTE.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: PALETTE.purple,
    borderColor: PALETTE.purple,
  },
  tableCellProduct: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tableThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: PALETTE.pageBg,
  },
  tableProductInfo: {
    flex: 1,
    gap: 2,
  },
  tableCellText: {
    fontSize: 13,
    color: PALETTE.textPrimary,
  },

  // Pagination
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    flexWrap: 'wrap',
    gap: 12,
  },
  paginationMobile: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  paginationInfo: {
    fontSize: 13,
    color: PALETTE.textSecondary,
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pageBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PALETTE.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PALETTE.cardBg,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageNum: {
    minWidth: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PALETTE.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PALETTE.cardBg,
    paddingHorizontal: 6,
  },
  pageNumActive: {
    backgroundColor: PALETTE.purple,
    borderColor: PALETTE.purple,
  },
  pageNumText: {
    fontSize: 13,
    fontWeight: '600',
    color: PALETTE.textPrimary,
  },
  pageNumTextActive: {
    color: '#FFF',
  },
  pageEllipsis: {
    fontSize: 14,
    color: PALETTE.textMuted,
    paddingHorizontal: 4,
  },
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
    backgroundColor: PALETTE.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PALETTE.border,
  },
  stateText: {
    fontSize: 14,
    color: PALETTE.textSecondary,
  },
  errorText: {
    fontSize: 14,
    color: PALETTE.red,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: PALETTE.purple,
  },
  retryBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13,
  },
});
