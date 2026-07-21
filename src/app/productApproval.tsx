import AdminLayout from '@/components/admin-layout';
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

import {
  type ApprovalProduct,
  type ProductStatus,
} from '@/constants/product-approval-data';
import { getApiErrorMessage } from '@/lib/api/client';
import { mapProductListToApprovalRow } from '@/lib/mappers';
import { sweetConfirm, sweetError, sweetSuccess } from '@/lib/sweetAlert';
import { fetchProducts, fetchProductStats, fetchSellers, fetchProductCatalog, approveProduct, deactivateProduct, activateProduct, type ProductListRow, type SellerRow } from '@/services/productApi';
import { fetchMainCategories, fetchSubcategories, type CategoryRow } from '@/services/categoryApi';
import Pagination from '@/components/Pagination';

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
  inactive: number;
  all: number;
};

const DEFAULT_STATS: ProductStats = {
  pending: 0,
  review: 0,
  approved: 0,
  rejected: 0,
  inactive: 0,
  all: 0,
};

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect fill='%23F3F4F6' width='80' height='80'/%3E%3Ctext x='50%25' y='52%25' dominant-baseline='middle' text-anchor='middle' fill='%239CA3AF' font-size='12' font-family='Arial,sans-serif'%3ENo image%3C/text%3E%3C/svg%3E";

function sellerDisplayName(seller: SellerRow): string {
  return (
    seller.storeName?.trim() ||
    seller.businessName?.trim() ||
    seller.fullName?.trim() ||
    `${seller.firstName || ""} ${seller.lastName || ""}`.trim() ||
    seller.email?.trim() ||
    "Unknown"
  );
}

function toApprovalProduct(row: ReturnType<typeof mapProductListToApprovalRow>): ApprovalProduct {
  return {
    id: row.id,
    name: cleanText(row.name),
    description: row.sku !== '—' ? `SKU: ${row.sku}` : '—',
    image: row.image || PLACEHOLDER_IMAGE,
    seller: cleanText(row.seller),
    email: row.sellerEmail?.trim() || '',
    category: row.category,
    status: row.status as ProductStatus,
    submittedOn: row.submittedAt,
    price: row.price,
  };
}

function truncateWords(text: string, maxWords: number = 4): string {
  if (!text) return '';
  const words = text.split(' ');
  if (words.length > maxWords) {
    return words.slice(0, maxWords).join(' ') + '...';
  }
  return text;
}

function cleanText(text: string): string {
  if (!text) return '';
  return text.replace(/[\x00-\x1F\x7F-\x9F\u2018-\u201F\u00B4\u0060\u25A1\uFFFD\u0092]/g, "'").replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x2019;/gi, "'");
}

const STATUS_CONFIG: Record<
  ProductStatus,
  { label: string; color: string; bg: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }
> = {
  pending: { label: 'Pending', color: PALETTE.orange, bg: PALETTE.orangeLight, icon: 'clock-outline' },
  review: { label: 'Review', color: PALETTE.blue, bg: PALETTE.blueLight, icon: 'magnify' },
  approved: { label: 'Approved', color: PALETTE.green, bg: PALETTE.greenLight, icon: 'check-circle-outline' },
  rejected: { label: 'Rejected', color: PALETTE.red, bg: PALETTE.redLight, icon: 'close-circle-outline' },
  inactive: { label: 'Deactivated', color: '#64748B', bg: '#F1F5F9', icon: 'pause-circle-outline' },
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
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.statIconWrap, styles.statIconWrapGrid, { backgroundColor: bg }]}>
                <MaterialCommunityIcons name={icon} size={18} color={color} />
              </View>
              <Text style={[styles.statCount, styles.statCountGrid, { color }]}>{count}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={16} color={color} />
          </View>
          <Text style={[styles.statLabel, styles.statLabelGrid]} numberOfLines={2}>
            {label}
          </Text>
        </>
      ) : (
        <>
          <View style={[styles.statIconWrap, { backgroundColor: bg }]}>
            <MaterialCommunityIcons name={icon} size={22} color={color} />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statCount} adjustsFontSizeToFit numberOfLines={1}>{count}</Text>
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
  options,
  onSelect,
  wide,
  isOpen,
  onOpenChange,
}: {
  label: string;
  value: string;
  options?: string[];
  onSelect?: (val: string) => void;
  wide?: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <View style={[styles.filterDropdown, wide ? styles.filterDropdownWide : styles.filterDropdownCompact, isOpen && { zIndex: 100, elevation: 100 }]}>
      <Text style={styles.filterLabel}>{label}</Text>
      <Pressable style={styles.filterSelect} onPress={() => onOpenChange(!isOpen)}>
        <Text style={styles.filterSelectText} numberOfLines={1}>
          {value}
        </Text>
        <MaterialCommunityIcons name={isOpen ? "chevron-up" : "chevron-down"} size={18} color={PALETTE.textSecondary} />
      </Pressable>
      {isOpen && options && options.length > 0 && (
        <View style={styles.dropdownMenu}>
          <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {options.map((opt, i) => (
              <Pressable
                key={i}
                style={[styles.dropdownItem, value === opt && styles.dropdownItemActive]}
                onPress={() => {
                  if (onSelect) onSelect(opt);
                  onOpenChange(false);
                }}
              >
                <Text style={[styles.dropdownItemText, value === opt && styles.dropdownItemTextActive]}>
                  {opt}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function ActionButtons({
  inline,
  productId,
  status,
  busy,
  onActivate,
  onDeactivate,
}: {
  inline?: boolean;
  productId?: string;
  status?: ProductStatus;
  busy?: boolean;
  onActivate?: (id: string) => void;
  onDeactivate?: (id: string) => void;
}) {
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
      {(status === 'pending' || status === 'inactive' || status === 'rejected') && (
        <Pressable
          disabled={busy || !productId}
          onPress={() => productId && onActivate?.(productId)}
          style={({ pressed }) => [
            styles.activateBtn,
            inline && styles.activateBtnInline,
            (busy || pressed) && styles.pressed,
            busy && { opacity: 0.6 },
          ]}>
          <MaterialCommunityIcons name="check-circle-outline" size={inline ? 12 : 14} color="#FFF" />
          <Text style={[styles.activateText, inline && styles.actionTextInline]}>
            {status === 'pending' ? 'Activate' : 'Reactivate'}
          </Text>
        </Pressable>
      )}
      {status === 'approved' && (
        <Pressable
          disabled={busy || !productId}
          onPress={() => productId && onDeactivate?.(productId)}
          style={({ pressed }) => [
            styles.deactivateBtn,
            inline && styles.activateBtnInline,
            (busy || pressed) && styles.pressed,
            busy && { opacity: 0.6 },
          ]}>
          <MaterialCommunityIcons name="close-circle-outline" size={inline ? 12 : 14} color="#FFF" />
          <Text style={[styles.activateText, inline && styles.actionTextInline]}>Deactivate</Text>
        </Pressable>
      )}
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

function PageHeader({ isWide, stats, onFilter, isMobile, isTablet }: { isWide: boolean; stats?: ProductStats; onFilter?: (f: FilterKey) => void; isMobile?: boolean; isTablet?: boolean }) {
  return (
    <View>
      <View style={[styles.pageHeader, isWide && styles.pageHeaderWide]}>
        <View style={styles.pageHeaderLeft}>
          <View style={styles.pageIcon}>
            <MaterialCommunityIcons name="shield-check" size={28} color="#FFF" />
          </View>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={[styles.pageTitle, isMobile && { fontSize: 18 }]}>Product Approvals</Text>
          </View>
        </View>
      </View>
      {/* Mobile/Tablet: stat cards overlapping the header bottom */}
      {(isMobile || isTablet) && stats && onFilter && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mobileHeaderStats} contentContainerStyle={{ paddingHorizontal: 8, flexGrow: 1, justifyContent: 'center' }}>
          <StatsRow stats={stats} onFilter={onFilter} isWide={false} />
        </ScrollView>
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
        count={stats.inactive}
        label="Deactivated Products"
        color="#64748B"
        bg="#F1F5F9"
        icon="pause-circle-outline"
        onPress={() => onFilter('inactive')}
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
    { key: 'all', label: 'All', count: stats.all, color: PALETTE.brandOrange, bg: PALETTE.brandOrange },
    { key: 'pending', label: 'Pending', count: stats.pending, color: PALETTE.orange, bg: PALETTE.orangeLight },
    { key: 'review', label: 'Review', count: stats.review, color: PALETTE.blue, bg: PALETTE.blueLight },
    { key: 'approved', label: 'Approved', count: stats.approved, color: PALETTE.green, bg: PALETTE.greenLight },
    { key: 'inactive', label: 'Deactivated', count: stats.inactive, color: '#64748B', bg: '#F1F5F9' },
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
          isActive && tab.key === 'all' && { backgroundColor: PALETTE.brandOrange, borderColor: PALETTE.brandOrange },
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
  sellerOptions,
  mainCategoryOptions,
  categoryOptions,
  subcategoryOptions,
  mainCategories,
  onMainCategoryChange,
  onCategoryChange,
  onSellerChange,
}: {
  stats: ProductStats;
  search: string;
  onSearchChange: (v: string) => void;
  activeFilter: FilterKey;
  onFilterChange: (f: FilterKey) => void;
  isMobile: boolean;
  isTablet: boolean;
  isWide: boolean;
  sellerOptions: string[];
  mainCategoryOptions: string[];
  categoryOptions: string[];
  subcategoryOptions: string[];
  mainCategories: CategoryRow[];
  onMainCategoryChange: (selectedMainCat: string) => void;
  onCategoryChange: (selectedCategory: string) => void;
  onSellerChange?: (selectedSeller: string) => void;
}) {
  const [seller, setSeller] = useState("All Sellers");
  const [mainCat, setMainCat] = useState("All Main Categories");
  const [category, setCategory] = useState("All Categories");
  const [subcategory, setSubcategory] = useState("All Subcategories");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const handleMainCategorySelect = (value: string) => {
    setMainCat(value);
    setCategory("All Categories");
    setSubcategory("All Subcategories");
    onMainCategoryChange(value);
  };

  const handleCategorySelect = (value: string) => {
    setCategory(value);
    setSubcategory("All Subcategories");
    onCategoryChange(value);
  };

  const handleSellerSelect = (value: string) => {
    setSeller(value);
    if (onSellerChange) onSellerChange(value);
  };

  return (
    <View style={[styles.queueCard, { zIndex: 10, elevation: 10 }]}>
      <View style={[styles.queueHeader, { zIndex: 1, elevation: 1 }]}>
        <Text style={styles.queueTitle}>Product Approval Queue</Text>
      </View>

      <View
        style={[
          styles.filtersGrid,
          isMobile && styles.filtersGridMobile,
          isTablet && styles.filtersGridTablet,
          isWide && styles.filtersGridWide,
          { zIndex: 10, elevation: 10 }
        ]}>
        <FilterDropdown
          label="Seller"
          value={seller}
          onSelect={handleSellerSelect}
          options={sellerOptions}
          wide={isWide}
          isOpen={openDropdown === 'seller'}
          onOpenChange={(open) => setOpenDropdown(open ? 'seller' : null)}
        />
        <FilterDropdown
          label="Main Category"
          value={mainCat}
          onSelect={handleMainCategorySelect}
          options={mainCategoryOptions}
          wide={isWide}
          isOpen={openDropdown === 'mainCat'}
          onOpenChange={(open) => setOpenDropdown(open ? 'mainCat' : null)}
        />
        <FilterDropdown
          label="Category"
          value={category}
          onSelect={handleCategorySelect}
          options={categoryOptions}
          wide={isWide}
          isOpen={openDropdown === 'category'}
          onOpenChange={(open) => setOpenDropdown(open ? 'category' : null)}
        />
        <FilterDropdown
          label="Subcategory"
          value={subcategory}
          onSelect={setSubcategory}
          options={subcategoryOptions}
          wide={isWide}
          isOpen={openDropdown === 'subcategory'}
          onOpenChange={(open) => setOpenDropdown(open ? 'subcategory' : null)}
        />
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
            </Pressable>
          </View>
        )}
      </View>

      <StatusTabs stats={stats} active={activeFilter} onChange={onFilterChange} isMobile={isMobile} />
    </View>
  );
}

// ─── Product list ────────────────────────────────────────────────────────────

function ProductCard({
  product,
  busy,
  onActivate,
  onDeactivate,
}: {
  product: Product;
  busy?: boolean;
  onActivate?: (id: string) => void;
  onDeactivate?: (id: string) => void;
}) {
  return (
    <View style={styles.productCard}>
      <View style={styles.productCardTop}>
        <Image source={{ uri: product.image }} style={styles.productThumb} contentFit="cover" />
        <View style={styles.productCardInfo}>
          <View style={styles.productNameRow}>
            <Text style={styles.productName} numberOfLines={1}>
              {truncateWords(product.name, 4)}
            </Text>
            {product.isNew && <NewBadge />}
          </View>
          <Text style={styles.productDesc} numberOfLines={2}>
            {product.description}
          </Text>
          {product.price ? (
            <Text style={styles.productPrice}>{product.price}</Text>
          ) : null}
        </View>
        <StatusBadge status={product.status} />
      </View>

      <View style={styles.sellerActionRow}>
        <View style={styles.sellerRow}>
          <View style={styles.sellerIcon}>
            <MaterialCommunityIcons name="store" size={14} color={PALETTE.brandOrange} />
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
        <ActionButtons
          inline
          productId={product.id}
          status={product.status}
          busy={busy}
          onActivate={onActivate}
          onDeactivate={onDeactivate}
        />
      </View>
    </View>
  );
}

function ProductTable({
  products,
  selected,
  onToggle,
  onToggleAll,
  actionBusyId,
  onActivate,
  onDeactivate,
}: {
  products: Product[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  actionBusyId?: string | null;
  onActivate?: (id: string) => void;
  onDeactivate?: (id: string) => void;
}) {
  const allSelected = products.length > 0 && products.every((p) => selected.has(p.id));

  return (
    <View style={styles.tableCard}>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.tableColProduct]}>Product Details</Text>
          <Text style={[styles.tableHeaderText, styles.tableColSeller]}>Seller</Text>
          <Text style={[styles.tableHeaderText, styles.tableColCategory]}>Category</Text>
          <Text style={[styles.tableHeaderText, styles.tableColPrice]}>Total Price</Text>
          <Text style={[styles.tableHeaderText, styles.tableColStatus]}>Status</Text>
          <Text style={[styles.tableHeaderText, styles.tableColDate]}>Submitted On</Text>
          <Text style={[styles.tableHeaderText, styles.tableColActions]}>Actions</Text>
        </View>

        {products.map((product) => (
          <View key={product.id} style={styles.tableRow}>

            <View style={[styles.tableColProduct, styles.tableCellProduct]}>
              <Image
                source={{ uri: product.image }}
                style={styles.tableThumb}
                contentFit="cover"
              />
              <View style={styles.tableProductInfo}>
                <View style={styles.productNameRow}>
                  <Text style={styles.productName}>{truncateWords(product.name, 4)}</Text>
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

            <Text style={[styles.tableColPrice, styles.tableCellText]}>{product.price ?? '—'}</Text>

            <View style={styles.tableColStatus}>
              <StatusBadge status={product.status} />
            </View>

            <Text style={[styles.tableColDate, styles.tableCellText]}>{product.submittedOn}</Text>

            <View style={styles.tableColActions}>
              <ActionButtons
                inline
                productId={product.id}
                status={product.status}
                busy={actionBusyId === product.id}
                onActivate={onActivate}
                onDeactivate={onDeactivate}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const PAGE_SIZE = 20;

function filterStatusForApi(filter: FilterKey): string | undefined {
  if (filter === 'all') return undefined;
  if (filter === 'approved') return 'active';
  if (filter === 'review') return 'under_review';
  if (filter === 'inactive') return 'inactive';
  return filter;
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ProductApprovalScreen() {
  const { isMobile, isTablet, isWide, width, isLaptop } = useBreakpoint();
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
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [selectedSeller, setSelectedSeller] = useState("All Sellers");
  const [sellers, setSellers] = useState<SellerRow[]>([]);

  // Filter options from backend
  const [sellerOptions, setSellerOptions] = useState<string[]>(["All Sellers"]);
  const [mainCategoryOptions, setMainCategoryOptions] = useState<string[]>(["All Main Categories"]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>(["All Categories"]);
  const [subcategoryOptions, setSubcategoryOptions] = useState<string[]>(["All Subcategories"]);
  const [mainCategories, setMainCategories] = useState<CategoryRow[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadFilterData = useCallback(async () => {
    try {
      // Fetch main categories (parentId is NULL)
      const mainCats = await fetchMainCategories();
      setMainCategories(mainCats);
      setMainCategoryOptions(["All Main Categories", ...mainCats.map(cat => cat.categoryName)]);

      // Fetch sellers from backend
      const sellersPage = await fetchSellers();
      setSellers(sellersPage.items);
      const sellerNames = sellersPage.items.map((seller) => sellerDisplayName(seller));
      setSellerOptions(["All Sellers", ...sellerNames]);

      // Categories (parentId is NOT NULL) and subcategories will be updated based on main category selection
    } catch (err) {
      console.error("Failed to load filter data:", err);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiStatus = filterStatusForApi(activeFilter);
      let sellerId: number | undefined;
      if (selectedSeller !== "All Sellers") {
        const foundSeller = sellers.find((seller) => sellerDisplayName(seller) === selectedSeller);
        if (foundSeller) {
          sellerId = foundSeller.id;
        }
      }

      const [productsResult, statsResult] = await Promise.allSettled([
        fetchProducts({
          status: apiStatus,
          search: debouncedSearch.trim() || undefined,
          sellerId: sellerId,
          page: currentPage - 1,
          size: PAGE_SIZE,
        }),
        fetchProductStats(),
      ]);

      if (productsResult.status === "rejected") {
        throw productsResult.reason;
      }

      const page = productsResult.value;
      const mappedProducts = (page.items ?? []).map((p: ProductListRow) =>
        toApprovalProduct(mapProductListToApprovalRow(p)),
      );
      setProducts(mappedProducts);
      setTotalProducts(page.totalElements ?? mappedProducts.length);
      setTotalPages(page.totalPages ?? 0);
      if (currentPage > page.totalPages && page.totalPages > 0) {
        setCurrentPage(page.totalPages);
      }

      if (statsResult.status === "fulfilled") {
        const apiStats = statsResult.value;
        setStats({
          pending: Number(apiStats.pending ?? 0),
          review: Number(apiStats.underReview ?? 0),
          approved: Number(apiStats.approved ?? apiStats.active ?? 0),
          rejected: Number(apiStats.rejected ?? 0),
          inactive: Number(apiStats.inactive ?? 0),
          all: Number(apiStats.total ?? 0),
        });
      } else {
        console.warn("Product stats unavailable:", statsResult.reason);
      }

      // Extract unique categories from products
      const uniqueCategories = new Set<string>(["All Categories"]);
      mappedProducts.forEach(p => {
        if (p.category) uniqueCategories.add(p.category);
      });
      setCategoryOptions(Array.from(uniqueCategories));

    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load products.'));
    } finally {
      setLoading(false);
    }
  }, [activeFilter, currentPage, debouncedSearch, selectedSeller, sellers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadFilterData();
  }, [loadFilterData]);

  const handleFilterChange = useCallback((filter: FilterKey) => {
    setActiveFilter(filter);
    setCurrentPage(1);
    setSelected(new Set());
  }, []);

  const handleActivate = useCallback(async (id: string) => {
    const numericId = Number(id);
    if (!Number.isFinite(numericId) || numericId <= 0) return;
    const confirmed = await sweetConfirm({
      title: 'Activate product?',
      text: 'This product will become visible to buyers.',
      confirmText: 'Yes, Activate',
    });
    if (!confirmed) return;
    setActionBusyId(id);
    setError(null);
    try {
      await activateProduct(numericId);
      await loadData();
      void sweetSuccess('Activated!', 'Product activated successfully.');
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Failed to activate product.');
      setError(msg);
      void sweetError('Error', msg);
    } finally {
      setActionBusyId(null);
    }
  }, [loadData]);

  const handleDeactivate = useCallback(async (id: string) => {
    const numericId = Number(id);
    if (!Number.isFinite(numericId) || numericId <= 0) return;
    const confirmed = await sweetConfirm({
      title: 'Deactivate product?',
      text: 'This product will be hidden from buyers.',
      confirmText: 'Yes, Deactivate',
      danger: true,
    });
    if (!confirmed) return;
    setActionBusyId(id);
    setError(null);
    try {
      await deactivateProduct(numericId);
      await loadData();
      void sweetSuccess('Deactivated!', 'Product deactivated successfully.');
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Failed to deactivate product.');
      setError(msg);
      void sweetError('Error', msg);
    } finally {
      setActionBusyId(null);
    }
  }, [loadData]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setCurrentPage(1);
    setSelected(new Set());
  }, []);

  const handleSellerChange = useCallback((seller: string) => {
    setSelectedSeller(seller);
    setCurrentPage(1);
    setSelected(new Set());
  }, []);

  const handleMainCategoryChange = useCallback(async (selectedMainCat: string) => {
    if (selectedMainCat === "All Main Categories") {
      setCategoryOptions(["All Categories"]);
      setSubcategoryOptions(["All Subcategories"]);
      return;
    }

    try {
      const selectedMainCategory = mainCategories.find(cat => cat.categoryName === selectedMainCat);
      if (selectedMainCategory) {
        // Fetch categories (parentId is NOT NULL - these are children of main category)
        const categories = await fetchSubcategories(selectedMainCategory.id);
        setCategoryOptions(["All Categories", ...categories.map(cat => cat.categoryName)]);

        // Reset subcategories until a category is selected
        setSubcategoryOptions(["All Subcategories"]);
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  }, [mainCategories]);

  const handleCategoryChange = useCallback(async (selectedCategory: string) => {
    // For now, subcategories will be extracted from products
    // TODO: Add dedicated subcategory API endpoint when available
    setSubcategoryOptions(["All Subcategories"]);
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

  return (
    <AdminLayout>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}>
        <PageHeader isWide={isWide} stats={stats} onFilter={handleFilterChange} isMobile={isMobile} isTablet={isTablet} />

        {isWide && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScrollWrapper} contentContainerStyle={styles.statsScrollContent}>
            <StatsRow stats={stats} onFilter={handleFilterChange} isWide={isWide} />
          </ScrollView>
        )}

        <View style={styles.scrollContent}>

          <FilterSection
            stats={stats}
            search={search}
            onSearchChange={handleSearchChange}
            activeFilter={activeFilter}
            onFilterChange={handleFilterChange}
            isMobile={isMobile}
            isTablet={isTablet}
            isWide={isWide}
            sellerOptions={sellerOptions}
            mainCategoryOptions={mainCategoryOptions}
            categoryOptions={categoryOptions}
            subcategoryOptions={subcategoryOptions}
            mainCategories={mainCategories}
            onMainCategoryChange={handleMainCategoryChange}
            onCategoryChange={handleCategoryChange}
            onSellerChange={handleSellerChange}
          />

          {loading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator size="large" color={PALETTE.brandOrange} />
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
              <ScrollView horizontal showsHorizontalScrollIndicator={isLaptop} style={{ width: '100%' }} contentContainerStyle={{ paddingBottom: 8, minWidth: '100%' }}>
                <ProductTable
                  products={products}
                  selected={selected}
                  onToggle={toggleSelect}
                  onToggleAll={toggleSelectAll}
                  actionBusyId={actionBusyId}
                  onActivate={handleActivate}
                  onDeactivate={handleDeactivate}
                />
              </ScrollView>
          ) : (
            <View style={styles.productList}>
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  busy={actionBusyId === product.id}
                  onActivate={handleActivate}
                  onDeactivate={handleDeactivate}
                />
              ))}
            </View>
          )}

          {!loading && !error && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalProducts}
              itemsPerPage={PAGE_SIZE}
              itemName="products"
              onPageChange={setCurrentPage}
            />
          )}
        </View>
      </ScrollView>
    </AdminLayout>
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
    paddingHorizontal: 0,
    paddingBottom: 0,
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
    backgroundColor: '#151D4F',
    paddingHorizontal: 32,
    paddingVertical: 28,
    paddingBottom: 68,
    borderRadius: 22,
    marginHorizontal: 2,
    marginTop: 12,
    gap: 12,
    shadowColor: '#151D4F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  pageHeaderWide: {
    alignItems: 'center',
  },
  mobileHeaderStats: {
    marginTop: -62,
    zIndex: 10,
    elevation: 10,
    marginBottom: 4,
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
    backgroundColor: PALETTE.brandOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
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
    backgroundColor: PALETTE.brandOrange,
  },
  headerPurpleText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13,
  },

  // Stats — 2×2 grid on mobile & tablet (native + web responsive)
  statsGridCompact: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 10,
    alignSelf: 'stretch',
    paddingBottom: 4,
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 12,
    width: '100%',
  },
  statsGridWide: {
    flexWrap: 'nowrap',
    minWidth: 900,
    justifyContent: 'center',
  },
  statsScrollWrapper: {
    marginTop: -62,
    zIndex: 10,
    marginBottom: 4,
    alignSelf: 'stretch',
  },
  statsScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexGrow: 1,
    justifyContent: 'center',
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
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  statCardGrid: {
    width: 150,
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
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: PALETTE.cardBg,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 8,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 1000,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.border,
  },
  dropdownItemActive: {
    backgroundColor: PALETTE.blue,
  },
  dropdownItemText: {
    fontSize: 13,
    color: PALETTE.textPrimary,
  },
  dropdownItemTextActive: {
    color: '#FFF',
    fontWeight: '600',
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
    outlineStyle: 'none' as any,
  },
  searchBtn: {
    backgroundColor: PALETTE.brandOrange,
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
  productPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE.brandOrange,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
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
    color: PALETTE.brandOrange,
    fontWeight: '500',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'nowrap',
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
    backgroundColor: PALETTE.brandOrange,
    alignSelf: 'flex-start',
  },
  activateText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  deactivateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: PALETTE.red,
    alignSelf: 'flex-start',
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
    overflow: 'visible',
    width: '100%',
  },
  table: {
    width: '100%',
    minWidth: 1000,
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
    flex: 1.2,
    paddingRight: 16,
  },
  tableColSeller: {
    flex: 1,
    paddingRight: 16,
  },
  tableColCategory: {
    flex: 1.4,
    paddingRight: 16,
  },
  tableColPrice: {
    flex: 0.9,
    paddingRight: 16,
  },
  tableColStatus: {
    flex: 0.8,
    paddingRight: 16,
  },
  tableColDate: {
    flex: 1,
    paddingRight: 16,
  },
  tableColActions: {
    flex: 1.2,
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
    backgroundColor: PALETTE.brandOrange,
    borderColor: PALETTE.brandOrange,
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
    backgroundColor: PALETTE.brandOrange,
    borderColor: PALETTE.brandOrange,
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
    backgroundColor: PALETTE.brandOrange,
  },
  retryBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13,
  },
});
