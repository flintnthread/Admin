/**
 * AdsPaymentsScreen.tsx
 * ----------------------------------------------------------------
 * Ads Payments â€” React Native screen.
 *
 * Companion screen to AdsOrdersScreen.tsx / AdsDashboardScreen.tsx â€”
 * same navy (#151D4F) + orange design tokens, same measured-width
 * responsive pattern. Deliberately NOT a re-skin of the Orders
 * table: payments are chronological events, so the signature here
 * is a date-grouped ledger (table on tablet/desktop, a connected
 * vertical timeline of receipts on phone) instead of a flat table
 * or card grid.
 *
 * Distinct pieces built for this screen specifically:
 *   - Stat cards: Total Payments / Captured / Success Rate /
 *     Refunded, sitting directly under the header, shadow-only
 *     (no colored borders).
 *   - Date-grouped ledger: rows are clustered under a date rail
 *     (table) or a connected dot-and-line timeline (phone), so
 *     "when" is always visible without repeating the date per row.
 *   - Method filter as a horizontal icon-chip strip (scrolls on
 *     narrow screens) + a status dropdown, always available (not
 *     split awkwardly between chip rows per breakpoint).
 *   - Action opens a Payment Details panel: a full-width sheet on
 *     phone, a centered modal card on tablet/desktop, mirroring the
 *     provided reference (orange header, two-column detail grid,
 *     navy "Close" button).
 *
 * FIX (z-index / stacking): the Status and Method dropdown menus
 * were being visually covered by the results section (table / grid
 * / timeline) and by pagination underneath them. In React Native
 * (and RN Web), a child's zIndex only competes with its *siblings
 * under the same parent* â€” raising zIndex deep inside FilterBar
 * doesn't help it beat elements that are siblings of FilterBar's
 * own wrapper one level up. The fix is to give the wrapper around
 * <FilterBar/>, the wrapper around the results section, and the
 * wrapper around <Pagination/> explicit, descending zIndex values
 * (30 / 1 / 0) so the stacking order is correct at the level where
 * these sections are actually siblings. See the screen's render
 * below â€” that's the only functional change from the previous
 * version; everything else (data, layout, styles) is unchanged.
 *
 * Breakpoints (measured container width):
 *   phone   : width < 640
 *   tablet  : 640 <= width < 1024
 *   desktop : width >= 1024
 *
 * Dependencies:
 *   npm install react-native-svg
 * ----------------------------------------------------------------
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  LayoutChangeEvent,
  useWindowDimensions,
  DimensionValue,
} from 'react-native';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import AdminLayout from '@/components/admin-layout';
import Pagination from '@/components/Pagination';
import { getApiErrorMessage } from '@/lib/api/client';
import { useLocalSearchParams } from 'expo-router';
import { fetchAdsPayments, fetchAdsPaymentStats, formatAdsDate, type AdsApiRow } from '@/services/adsApi';

/* ------------------------------------------------------------------ */
/* Design tokens â€” navy + orange only, shared across the Ads screens   */
/* ------------------------------------------------------------------ */
const COLORS = {
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  cardBg: '#F7F3EE',
  primary: '#ef7b1a',
  primaryLight: '#FFF0EA',
  navy: '#151D4F',
  text: '#1C2B4A',
  sub: '#6B7280',
  border: '#E8E2D9',
  active: '#10B981',
  activeLight: '#ECFDF5',
  inactive: '#EF4444',
  inactiveLight: '#FEF2F2',
  avatarPalette: ["#ef7b1a", "#1C2B4A", "#10B981", "#8B5CF6", "#F59E0B", "#3B82F6"],
  // Legacy mappings
  ink: '#1C2B4A',
  inkSoft: '#1C2B4A',
  navyDeep: '#151D4F',
  navyMid: '#151D4F',
  navyMuted: '#6B7280',
  navyTint: '#F7F3EE',
  page: '#FFFFFF',
  paperDeep: '#F7F3EE',
  orange: '#ef7b1a',
  orangeDeep: '#ef7b1a',
  orangeTint: '#FFF0EA',
  muted: '#6B7280',
  muted2: '#6B7280',
  rule: '#E8E2D9',
  ruleSoft: '#E8E2D9',
  blue: '#3B82F6',
  neutralBg: '#F3F4F6',
};

const FONT = {
  display: Platform.select({ ios: 'Avenir-Heavy', android: 'sans-serif-black', default: '"Space Grotesk", "Avenir Next", Arial, sans-serif' }),
  displaySemi: Platform.select({ ios: 'Avenir-Black', android: 'sans-serif-medium', default: '"Space Grotesk", "Avenir Next", Arial, sans-serif' }),
  body: Platform.select({ ios: 'Helvetica', android: 'sans-serif', default: '"Inter", Helvetica, Arial, sans-serif' }),
  bodyMed: Platform.select({ ios: 'Helvetica-Bold', android: 'sans-serif-medium', default: '"Inter", Helvetica, Arial, sans-serif' }),
  mono: Platform.select({ ios: 'Courier', android: 'monospace', default: '"IBM Plex Mono", Menlo, Consolas, monospace' }),
};

const fmtINR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

/* ------------------------------------------------------------------ */
/* Types + mock data                                                    */
/* ------------------------------------------------------------------ */
type PaymentStatus = 'captured' | 'pending' | 'failed' | 'refunded';
type PaymentMethod = 'Card' | 'UPI' | 'Netbanking' | 'Wallet';

interface Payment {
  paymentId: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  bank: string | null;
  dateObj: Date;
  dateLabel: string;
  createdLabel: string;
}

function mapPaymentMethod(raw?: unknown): PaymentMethod {
  const s = String(raw ?? 'card').toLowerCase();
  if (s.includes('upi')) return 'UPI';
  if (s.includes('netbank') || s.includes('bank')) return 'Netbanking';
  if (s.includes('wallet')) return 'Wallet';
  return 'Card';
}

function mapPaymentStatus(raw?: unknown): PaymentStatus {
  const s = String(raw ?? 'pending').toLowerCase();
  if (s === 'captured' || s === 'paid' || s === 'success') return 'captured';
  if (s === 'refunded') return 'refunded';
  if (s === 'failed') return 'failed';
  return 'pending';
}

function mapPaymentRow(row: AdsApiRow): Payment {
  const createdAt = String(row.createdAt ?? '');
  const dateObj = createdAt ? new Date(createdAt) : new Date();
  const validDate = Number.isNaN(dateObj.getTime()) ? new Date() : dateObj;
  const contact = String(row.contact ?? '');
  const email = String(row.email ?? '');
  const customerName = contact || email || 'â€”';
  return {
    paymentId: String(row.razorpayPaymentId ?? row.id ?? ''),
    orderId: String(row.orderId ?? 'â€”'),
    customerName,
    customerEmail: email || contact,
    amount: Number(row.amount ?? 0) || 0,
    status: mapPaymentStatus(row.status),
    method: mapPaymentMethod(row.method),
    bank: row.bank != null ? String(row.bank) : null,
    dateObj: validDate,
    dateLabel: formatAdsDate(row.createdAt),
    createdLabel: validDate.toLocaleString('en-IN'),
  };
}

const STATUS_META: Record<PaymentStatus, { label: string; color: string; bg: string }> = {
  captured: { label: 'Captured', color: COLORS.active, bg: COLORS.activeLight },
  refunded: { label: 'Refunded', color: COLORS.sub, bg: COLORS.cardBg },
  pending: { label: 'Pending', color: COLORS.primary, bg: COLORS.primaryLight },
  failed: { label: 'Failed', color: COLORS.inactive, bg: COLORS.inactiveLight },
};

/* ------------------------------------------------------------------ */
/* Layout helpers (same measured-width pattern as the other screens)   */
/* ------------------------------------------------------------------ */
type Breakpoint = 'phone' | 'tablet' | 'desktop';

function useBreakpoint(): { width: number } {
  const { width } = useWindowDimensions();
  return { width };
}

function useMeasuredWidth(fallback: number) {
  const [w, setW] = useState(fallback);
  const onLayout = (e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.width;
    if (next > 0 && Math.abs(next - w) > 0.5) setW(next);
  };
  return { measuredWidth: w, onLayout };
}

/* ------------------------------------------------------------------ */
/* Glyph icons                                                          */
/* ------------------------------------------------------------------ */
function SearchGlyph({ color = COLORS.muted2, size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth={2} fill="none" />
      <Path d="M20 20 L16.2 16.2" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
function EyeGlyph({ color = '#fff', size = 14 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M2 12c2.7-4.7 6.3-7 10-7s7.3 2.3 10 7c-2.7 4.7-6.3 7-10 7s-7.3-2.3-10-7Z" stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" />
      <Circle cx="12" cy="12" r="3" fill={color} />
    </Svg>
  );
}
function XGlyph({ color = '#fff', size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 5 L19 19 M19 5 L5 19" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}
function ChevronGlyph({ color = COLORS.muted, size = 11, open }: { color?: string; size?: number; open?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
      <Path d="M5 9 L12 16 L19 9" stroke={color} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function ArrowRightGlyph({ color = '#fff', size = 13 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 12 H20 M13 5 L20 12 L13 19" stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function MethodGlyph({ method, color, size = 14 }: { method: PaymentMethod; color: string; size?: number }) {
  if (method === 'Card') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Rect x="3" y="6" width="18" height="13" rx="2.2" stroke={color} strokeWidth={2} fill="none" />
        <Line x1="3" y1="10.5" x2="21" y2="10.5" stroke={color} strokeWidth={2} />
      </Svg>
    );
  }
  if (method === 'UPI') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M4 12 L10 5 L14 9 L20 3" stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M4 17 L10 10 L14 14 L20 8" stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />
      </Svg>
    );
  }
  if (method === 'Netbanking') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M3 10 L12 4 L21 10 Z" stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" />
        <Rect x="5" y="11" width="14" height="7" rx="1" stroke={color} strokeWidth={2} fill="none" />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="3" y="6" width="18" height="14" rx="2.5" stroke={color} strokeWidth={2} fill="none" />
      <Circle cx="16.5" cy="13" r="1.6" fill={color} />
    </Svg>
  );
}
function ReceiptGlyph({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 3 h14 v18 l-2.5 -1.6 L14 21 l-2 -1.6 L10 21 l-2.5 -1.6 L5 21 Z" stroke={color} strokeWidth={1.8} fill="none" strokeLinejoin="round" />
      <Path d="M8 8 h8 M8 12 h8 M8 16 h5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
function CheckCircleGlyph({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} fill="none" />
      <Path d="M8 12.5 L11 15.5 L16.5 9" stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function TrendGlyph({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 17 L10 11 L14 15 L20 6" stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 6 H20 V12" stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function RefundGlyph({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 8 H15 a5 5 0 0 1 0 10 H9" stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8 4 L4 8 L8 12" stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return COLORS.avatarPalette[Math.abs(h) % COLORS.avatarPalette.length];
}

function GridGlyph({ color = COLORS.muted, size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="3" width="7" height="7" />
      <Rect x="14" y="3" width="7" height="7" />
      <Rect x="14" y="14" width="7" height="7" />
      <Rect x="3" y="14" width="7" height="7" />
    </Svg>
  );
}

function ListIconGlyph({ color = COLORS.muted, size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Header + embedded stat cards (like other screens)                    */
/* ------------------------------------------------------------------ */
function ScreenHeader() {
  return (
    <View style={[styles.header, { paddingBottom: 54, paddingTop: 16 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, gap: 14 }}>
        <View style={{ width: 44, height: 44, backgroundColor: COLORS.orange, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
          <ReceiptGlyph color="#fff" size={24} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', fontSize: 22, color: '#FFFFFF' }}>Ads Payments</Text>
          <Text style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>Manage and track all your payments</Text>
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Stat cards â€” Total / Captured / Success Rate / Refunded, sitting     */
/* directly under the header. Shadow-only, no colored borders.          */
/* ------------------------------------------------------------------ */
function StatCard({
  icon,
  label,
  value,
  iconColor,
  iconBg,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  iconColor: string;
  iconBg: string;
  valueColor: string;
}) {
  return (
    <View style={[styles.statCard, { minWidth: 150 }]}>
      <View style={styles.statCardTop}>
        <View style={[styles.statIconBadge, { backgroundColor: iconBg }]}>{icon}</View>
        <Text style={[styles.statValue, { color: valueColor }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}
function StatCardsRow({
  stats,
  isPhone
}: {
  stats: { total: number; captured: number; capturedAmt: number; successRate: number; refunded: number };
  isPhone?: boolean;
}) {
  const cards = (
    <>
      <StatCard
        icon={<ReceiptGlyph color={COLORS.navy} size={17} />}
        label="TOTAL PAYMENTS"
        value={String(stats.total)}
        iconColor={COLORS.navy}
        iconBg={COLORS.navy + '14'}
        valueColor={COLORS.navy}
      />
      <StatCard
        icon={<CheckCircleGlyph color={COLORS.active} size={17} />}
        label="CAPTURED"
        value={fmtINR(stats.capturedAmt)}
        iconColor={COLORS.active}
        iconBg={COLORS.active + '14'}
        valueColor={COLORS.active}
      />
      <StatCard
        icon={<TrendGlyph color={COLORS.blue} size={17} />}
        label="SUCCESS RATE"
        value={`${stats.successRate.toFixed(0)}%`}
        iconColor={COLORS.blue}
        iconBg={COLORS.blue + '14'}
        valueColor={COLORS.blue}
      />
      <StatCard
        icon={<RefundGlyph color={COLORS.orange} size={17} />}
        label="REFUNDED"
        value={String(stats.refunded)}
        iconColor={COLORS.orange}
        iconBg={COLORS.orange + '14'}
        valueColor={COLORS.orange}
      />
    </>
  );

  if (isPhone) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingRight: 16 }}>
        {cards}
      </ScrollView>
    );
  }

  return (
    <View style={styles.statsRow}>
      {cards}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Filters â€” all in one row with dropdowns                              */
/* ------------------------------------------------------------------ */
type MethodFilter = 'all' | PaymentMethod;
type StatusFilter = 'all' | PaymentStatus;

function StatusDropdown({ value, onChange, open, onToggle }: { value: StatusFilter; onChange: (v: StatusFilter) => void; open: boolean; onToggle: () => void }) {
  const OPTIONS: { label: string; value: StatusFilter }[] = [
    { label: 'All statuses', value: 'all' },
    { label: 'Captured', value: 'captured' },
    { label: 'Pending', value: 'pending' },
    { label: 'Failed', value: 'failed' },
    { label: 'Refunded', value: 'refunded' },
  ];
  const current = OPTIONS.find((o) => o.value === value)?.label ?? 'All statuses';
  return (
    <View style={[styles.statusDropdownWrap, open && { zIndex: 50 }]}>
      <TouchableOpacity style={styles.statusDropdownBtn} onPress={onToggle} activeOpacity={0.85}>
        {value !== 'all' ? (
          <View style={[styles.statusDot, { backgroundColor: STATUS_META[value as PaymentStatus].color }]} />
        ) : (
          <View style={[styles.statusDot, { backgroundColor: 'transparent' }]} />
        )}
        <Text style={styles.statusDropdownText} numberOfLines={1}>{current}</Text>
        <ChevronGlyph open={open} color={COLORS.navy} />
      </TouchableOpacity>
      {open && (
        <View style={styles.statusDropdownMenu}>
          {OPTIONS.map((opt) => {
            const active = opt.value === value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.dropdownOption, active && styles.dropdownOptionActive]}
                onPress={() => { onChange(opt.value); onToggle(); }}
                activeOpacity={0.8}
              >
                {opt.value !== 'all' ? (
                  <View style={[styles.statusDot, { backgroundColor: STATUS_META[opt.value as PaymentStatus].color }]} />
                ) : (
                  <View style={[styles.statusDot, { backgroundColor: 'transparent' }]} />
                )}
                <Text style={[styles.dropdownOptionText, active && styles.dropdownOptionTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

function MethodDropdown({ value, onChange, open, onToggle }: { value: MethodFilter; onChange: (v: MethodFilter) => void; open: boolean; onToggle: () => void }) {
  const OPTIONS: { label: string; value: MethodFilter; icon?: PaymentMethod }[] = [
    { label: 'All methods', value: 'all' },
    { label: 'Card', value: 'Card', icon: 'Card' },
    { label: 'UPI', value: 'UPI', icon: 'UPI' },
    { label: 'Netbanking', value: 'Netbanking', icon: 'Netbanking' },
    { label: 'Wallet', value: 'Wallet', icon: 'Wallet' },
  ];
  const current = OPTIONS.find((o) => o.value === value)?.label ?? 'All methods';
  return (
    <View style={[styles.statusDropdownWrap, open && { zIndex: 50 }]}>
      <TouchableOpacity style={styles.statusDropdownBtn} onPress={onToggle} activeOpacity={0.85}>
        {value !== 'all' && <MethodGlyph method={value as PaymentMethod} color={COLORS.navy} />}
        <Text style={styles.statusDropdownText} numberOfLines={1}>{current}</Text>
        <ChevronGlyph open={open} color={COLORS.navy} />
      </TouchableOpacity>
      {open && (
        <View style={styles.statusDropdownMenu}>
          {OPTIONS.map((opt) => {
            const active = opt.value === value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.dropdownOption, active && styles.dropdownOptionActive]}
                onPress={() => { onChange(opt.value); onToggle(); }}
                activeOpacity={0.8}
              >
                {opt.icon ? <MethodGlyph method={opt.icon} color={active ? COLORS.primary : COLORS.navy} /> : <View style={styles.statusDot} />}
                <Text style={[styles.dropdownOptionText, active && styles.dropdownOptionTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

function FilterBar({
  search,
  onSearch,
  method,
  onMethod,
  status,
  onStatus,
  viewMode,
  setViewMode,
  isTablet,
}: {
  search: string;
  onSearch: (v: string) => void;
  method: MethodFilter;
  onMethod: (v: MethodFilter) => void;
  status: StatusFilter;
  onStatus: (v: StatusFilter) => void;
  viewMode: 'list' | 'grid';
  setViewMode: (v: 'list' | 'grid') => void;
  isTablet: boolean;
}) {
  const [openDropdown, setOpenDropdown] = useState<'status' | 'method' | null>(null);

  const hasFilters = search !== '' || status !== 'all' || method !== 'all';
  const handleClearFilters = () => {
    onSearch('');
    onStatus('all');
    onMethod('all');
  };

  const toggleButtons = (
    <View style={styles.viewToggleGroup}>
      <TouchableOpacity
        style={[
          styles.viewToggleBoxBtn,
          viewMode === 'grid' && styles.viewToggleBoxBtnActive,
        ]}
        onPress={() => setViewMode('grid')}
        activeOpacity={0.85}
      >
        <GridGlyph color={viewMode === 'grid' ? '#fff' : '#374151'} size={16} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.viewToggleBoxBtn,
          viewMode === 'list' && styles.viewToggleBoxBtnActive,
        ]}
        onPress={() => setViewMode('list')}
        activeOpacity={0.85}
      >
        <ListIconGlyph color={viewMode === 'list' ? '#fff' : '#374151'} size={16} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.filterCard, { zIndex: 100 }]}>
      {isTablet ? (
        <View style={[styles.filterRow, { zIndex: 100 }]}>
          {/* Search box */}
          <View style={[styles.searchBox, { flex: 1 }]}>
            <SearchGlyph />
            <TextInput
              value={search}
              onChangeText={onSearch}
              placeholder="Search payments..."
              placeholderTextColor={COLORS.sub}
              style={styles.searchInput}
            />
          </View>
          {hasFilters && (
            <TouchableOpacity onPress={handleClearFilters} style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: COLORS.inactiveLight, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: COLORS.inactive, fontWeight: '600', fontSize: 13 }}>Clear</Text>
            </TouchableOpacity>
          )}
          {toggleButtons}
          <StatusDropdown 
            value={status} onChange={onStatus} 
            open={openDropdown === 'status'} onToggle={() => setOpenDropdown(p => p === 'status' ? null : 'status')} 
          />
          <MethodDropdown 
            value={method} onChange={onMethod} 
            open={openDropdown === 'method'} onToggle={() => setOpenDropdown(p => p === 'method' ? null : 'method')} 
          />
        </View>
      ) : (
        <View style={{ gap: 12, zIndex: 100 }}>
          {/* Search box */}
          <View style={styles.searchBox}>
            <SearchGlyph />
            <TextInput
              value={search}
              onChangeText={onSearch}
              placeholder="Search payments..."
              placeholderTextColor={COLORS.sub}
              style={styles.searchInput}
            />
          </View>
          {/* Controls â€” all in one row, no wrapping */}
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap', gap: 6, zIndex: 100, overflow: 'visible' }}>
            <View style={{ flexShrink: 1, zIndex: openDropdown === 'status' ? 50 : 20, overflow: 'visible' }}>
              <StatusDropdown 
                value={status} onChange={onStatus} 
                open={openDropdown === 'status'} onToggle={() => setOpenDropdown(p => p === 'status' ? null : 'status')} 
              />
            </View>
            <View style={{ flexShrink: 1, zIndex: openDropdown === 'method' ? 50 : 10, overflow: 'visible' }}>
              <MethodDropdown 
                value={method} onChange={onMethod} 
                open={openDropdown === 'method'} onToggle={() => setOpenDropdown(p => p === 'method' ? null : 'method')} 
              />
            </View>
            {toggleButtons}
            {hasFilters && (
              <TouchableOpacity onPress={handleClearFilters} style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: COLORS.inactiveLight, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: COLORS.inactive, fontWeight: '600', fontSize: 13 }}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Shared bits                                                          */
/* ------------------------------------------------------------------ */
function StatusBadge({ status }: { status: PaymentStatus }) {
  const meta = STATUS_META[status];
  return (
    <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
      <Text style={[styles.statusBadgeText, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}
function ViewAction({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.viewActionBtn} activeOpacity={0.85} onPress={onPress}>
      <EyeGlyph />
    </TouchableOpacity>
  );
}
function DateRail({ label, count }: { label: string; count: number }) {
  return null; // Kept for backwards compat if needed, but unused
}

/* ------------------------------------------------------------------ */
/* Ledger table â€” date-grouped, for tablet/desktop. Full width.         */
/* ------------------------------------------------------------------ */
function PaymentsTable({ payments, onView }: { payments: Payment[]; onView: (p: Payment) => void }) {
  return (
    <View style={styles.tableCard}>
      <View style={styles.tableHeadRow}>
        <Text style={[styles.tableHeadCell, { flex: 1.2 }]}>Date</Text>
        <Text style={[styles.tableHeadCell, { flex: 1.4 }]}>Payment ID</Text>
        <Text style={[styles.tableHeadCell, { flex: 0.9 }]}>Order ID</Text>
        <Text style={[styles.tableHeadCell, { flex: 1.6 }]}>Customer</Text>
        <Text style={[styles.tableHeadCell, { flex: 0.85 }]}>Amount</Text>
        <Text style={[styles.tableHeadCell, { flex: 0.85 }]}>Status</Text>
        <Text style={[styles.tableHeadCell, { flex: 1 }]}>Method</Text>
        <Text style={[styles.tableHeadCell, { flex: 0.5, textAlign: 'center' }]}>Action</Text>
      </View>
      {payments.map((p) => {
        const avaColor = avatarColor(p.customerName);
        return (
          <View key={p.paymentId} style={styles.tableRow}>
            <View style={{ flex: 1.2, paddingRight: 8 }}>
              <Text style={styles.timeText}>{p.dateLabel}</Text>
            </View>
            <View style={{ flex: 1.4, paddingRight: 8 }}>
              <Text style={styles.idMono} numberOfLines={1}>{p.paymentId}</Text>
            </View>
            <Text style={[styles.orderIdText, { flex: 0.9 }]} numberOfLines={1}>{p.orderId}</Text>
            <View style={{ flex: 1.6, flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8 }}>
              <View style={[styles.avatar, { backgroundColor: avaColor }]}>
                <Text style={styles.avatarText}>{p.customerName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.custName} numberOfLines={1}>{p.customerName}</Text>
                <Text style={styles.custMail} numberOfLines={1}>{p.customerEmail}</Text>
              </View>
            </View>
            <Text style={[styles.amt, { flex: 0.85 }]}>{fmtINR(p.amount)}</Text>
            <View style={{ flex: 0.85 }}>
              <StatusBadge status={p.status} />
            </View>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MethodGlyph method={p.method} color={COLORS.sub} />
              <Text style={styles.methodText}>{p.method}</Text>
            </View>
            <View style={{ flex: 0.5, alignItems: 'center' }}>
              <ViewAction onPress={() => onView(p)} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Grid card â€” for grid view                                            */
/* ------------------------------------------------------------------ */
function PaymentGridCard({ payment, onView, cardWidth }: { payment: Payment; onView: (p: Payment) => void; cardWidth: number }) {
  const avaColor = avatarColor(payment.customerName);
  return (
    <TouchableOpacity
      style={[styles.gridCard, { width: cardWidth }]}
      activeOpacity={0.9}
      onPress={() => onView(payment)}
    >
      <View style={styles.gridCardTop}>
        <View style={[styles.avatar, { backgroundColor: avaColor, width: 40, height: 40, borderRadius: 12 }]}>
          <Text style={[styles.avatarText, { fontSize: 15 }]}>{payment.customerName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.custName} numberOfLines={1}>{payment.customerName}</Text>
          <Text style={styles.custMail} numberOfLines={1}>{payment.customerEmail}</Text>
        </View>
        <StatusBadge status={payment.status} />
      </View>
      <View style={styles.gridCardMid}>
        <Text style={styles.gridCardAmt}>{fmtINR(payment.amount)}</Text>
        <Text style={styles.idMono} numberOfLines={1}>{payment.paymentId}</Text>
      </View>
      <View style={styles.gridCardBottom}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MethodGlyph method={payment.method} color={COLORS.sub} />
          <Text style={styles.methodText}>{payment.method}</Text>
        </View>
        <Text style={styles.timeText}>{payment.dateLabel}</Text>
      </View>
    </TouchableOpacity>
  );
}
function PaymentsGrid({ payments, onView, cardWidth }: { payments: Payment[]; onView: (p: Payment) => void; cardWidth: number }) {
  return (
    <View style={styles.gridRow}>
      {payments.map((p) => (
        <PaymentGridCard key={p.paymentId} payment={p} onView={onView} cardWidth={cardWidth} />
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Timeline â€” connected receipt cards, for phone                       */
/* ------------------------------------------------------------------ */
function TimelineReceipt({ payment, isLast, onView }: { payment: Payment; isLast: boolean; onView: (p: Payment) => void }) {
  const meta = STATUS_META[payment.status];
  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineRail}>
        <View style={[styles.timelineDot, { backgroundColor: meta.color }]} />
        {!isLast && <View style={styles.timelineLine} />}
      </View>
      <View style={styles.receiptCard}>
        <View style={styles.receiptTopRow}>
          <Text style={styles.idMono} numberOfLines={1}>{payment.paymentId}</Text>
          <StatusBadge status={payment.status} />
        </View>
        <Text style={styles.custName} numberOfLines={1}>{payment.customerName}</Text>
        <Text style={styles.custMail} numberOfLines={1}>{payment.customerEmail}</Text>
        <View style={styles.receiptBottomRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MethodGlyph method={payment.method} color={COLORS.navyMuted} />
            <Text style={styles.methodText}>{payment.method}</Text>
          </View>
          <Text style={styles.amt}>{fmtINR(payment.amount)}</Text>
        </View>
        {/* Explicit View button row */}
        <View style={styles.receiptViewRow}>
          <TouchableOpacity
            style={styles.receiptViewBtn}
            activeOpacity={0.85}
            onPress={() => onView(payment)}
          >
            <EyeGlyph size={13} />
            <Text style={styles.receiptViewBtnText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
function PaymentsTimeline({ payments, onView }: { payments: Payment[]; onView: (p: Payment) => void }) {
  return (
    <View>
      {payments.map((p, i) => (
        <View key={p.paymentId} style={{ marginBottom: 16 }}>
          <Text style={[styles.timeText, { marginBottom: 8, fontWeight: '600', color: COLORS.navyDeep }]}>{p.dateLabel}</Text>
          <TimelineReceipt payment={p} isLast={true} onView={onView} />
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Payment Details panel â€” orange header, 2-col grid, navy Close        */
/* ------------------------------------------------------------------ */
function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailField}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}
function PaymentDetailsPanel({ payment, onClose, isTablet }: { payment: Payment; onClose: () => void; isTablet: boolean }) {
  const meta = STATUS_META[payment.status];
  return (
    <View style={styles.modalOverlay}>
      <View style={[styles.modalCard, !isTablet && styles.modalCardPhone]}>
        {/* Orange header */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalHeaderTitle}>Payment Details</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseIcon} activeOpacity={0.8}>
            <XGlyph />
          </TouchableOpacity>
        </View>
        {/* Body â€” ScrollView ensures content never collapses on small screens */}
        <ScrollView
          style={{ flexGrow: 0 }}
          contentContainerStyle={styles.modalBody}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Status badge row */}
          <View style={styles.modalStatusRow}>
            <View style={[styles.statusBadge, { backgroundColor: meta.bg, alignSelf: 'auto' }]}>
              <Text style={[styles.statusBadgeText, { color: meta.color }]}>{meta.label}</Text>
            </View>
            <Text style={styles.modalAmtBig}>{fmtINR(payment.amount)}</Text>
          </View>
          {/* All fields listed vertically â€” safe on any screen size */}
          <View style={styles.detailFieldsList}>
            <DetailField label="Payment ID" value={payment.paymentId} />
            <DetailField label="Order ID" value={payment.orderId} />
            <DetailField label="Customer" value={payment.customerName} />
            <DetailField label="Email" value={payment.customerEmail} />
            <DetailField label="Amount" value={fmtINR(payment.amount)} />
            <DetailField label="Status" value={meta.label} />
            <DetailField label="Method" value={payment.method} />
            <DetailField label="Bank" value={payment.bank ?? 'N/A'} />
            <DetailField label="Date" value={payment.dateLabel} />
            <DetailField label="Created" value={payment.createdLabel} />
          </View>
        </ScrollView>
        {/* Footer */}
        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose} activeOpacity={0.85}>
            <XGlyph size={12} />
            <Text style={styles.modalCloseBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                               */
/* ------------------------------------------------------------------ */
const PAGE_SIZE = 8;

export default function AdsPaymentsScreen() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const { width: windowWidth } = useBreakpoint();
  const { measuredWidth, onLayout } = useMeasuredWidth(windowWidth);

  const [search, setSearch] = useState(orderId || '');
  const [method, setMethod] = useState<MethodFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Payment | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, captured: 0, capturedAmt: 0, successRate: 0, refunded: 0 });

  const bp: Breakpoint = measuredWidth >= 1024 ? 'desktop' : measuredWidth >= 640 ? 'tablet' : 'phone';
  const isTablet = bp !== 'phone';
  const contentPad = bp === 'phone' ? 14 : 24;
  const gutter = bp === 'phone' ? 12 : 16;
  const fullWidth = Math.max(0, measuredWidth - contentPad * 2);
  const gridCols = bp === 'desktop' ? 3 : bp === 'tablet' ? 2 : 1;
  const gridGap = 16;
  const gridCardWidth = (fullWidth - gridGap * (gridCols - 1)) / gridCols;

  useEffect(() => setPage(1), [search, status, method]);

  // If the `orderId` param changes, update the search state
  useEffect(() => {
    if (orderId) {
      setSearch(orderId);
    }
  }, [orderId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [pageRes, statsRes] = await Promise.all([
          fetchAdsPayments({
            page: page - 1,
            size: PAGE_SIZE,
            search: search.trim() || undefined,
            status: status === 'all' ? undefined : status,
          }),
          fetchAdsPaymentStats(),
        ]);
        if (cancelled) return;
        const mapped = pageRes.items.map(mapPaymentRow);
        setPayments(mapped);
        setTotalItems(pageRes.totalElements);
        const total = Number(statsRes.totalPayments ?? pageRes.totalElements ?? 0);
        const capturedAmt = Number(statsRes.totalSuccessfulAmount ?? 0);
        const capturedCount = mapped.filter((p) => p.status === 'captured').length;
        const refunded = mapped.filter((p) => p.status === 'refunded').length;
        setStats({
          total,
          captured: capturedCount,
          capturedAmt,
          successRate: total > 0 ? (capturedCount / Math.max(1, mapped.length)) * 100 : 0,
          refunded,
        });
      } catch (e) {
        if (!cancelled) setError(getApiErrorMessage(e, 'Failed to load payments.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [search, status, method, page]);

  const filtered = useMemo(() => {
    if (method === 'all') return payments;
    return payments.filter((p) => p.method === method);
  }, [payments, method]);

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const pageItems = filtered;

  return (
    <AdminLayout>
      <View style={{ flex: 1, width: '100%' }} onLayout={onLayout}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: contentPad, paddingTop: 16, paddingBottom: 28, flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <ScreenHeader />
          <View style={{ marginTop: -52, paddingHorizontal: 16, zIndex: 10 }}>
            <StatCardsRow stats={stats} isPhone={bp === 'phone'} />
          </View>

          {/*
            Z-INDEX FIX: this wrapper (around FilterBar, which owns the
            Status/Method dropdown menus) and the results wrapper below
            it are SIBLINGS. A zIndex set deep inside FilterBar only
            outranks things inside FilterBar â€” it can't reach past this
            sibling boundary. So the stacking order has to be decided
            here, at the level where the filter section and the results
            section are actually adjacent: filter wrapper gets the
            highest value, results wrapper a lower one, and pagination
            (further down, also a sibling) the lowest.
          */}
          <View style={{ marginTop: gutter, zIndex: 30, position: 'relative' }}>
            <FilterBar
              search={search}
              onSearch={setSearch}
              method={method}
              onMethod={setMethod}
              status={status}
              onStatus={setStatus}
              viewMode={viewMode}
              setViewMode={setViewMode}
              isTablet={isTablet}
            />
          </View>

          <View style={{ marginTop: 8, zIndex: 1 }}>
            {loading ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Loading paymentsâ€¦</Text>
              </View>
            ) : error ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>{error}</Text>
              </View>
            ) : filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No payments match your filters</Text>
                <Text style={styles.emptySub}>Try clearing the search or switching the method/status filters.</Text>
              </View>
            ) : viewMode === 'grid' ? (
              <PaymentsGrid payments={pageItems} onView={setSelected} cardWidth={gridCardWidth} />
            ) : !isTablet ? (
              <PaymentsTimeline payments={pageItems} onView={setSelected} />
            ) : (
              <PaymentsTable payments={pageItems} onView={setSelected} />
            )}
          </View>

          {!loading && !error && totalItems > 0 && (
            <View style={{ marginTop: gutter, zIndex: 0 }}>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={PAGE_SIZE}
                itemName="payments"
                onPageChange={setPage}
              />
            </View>
          )}
        </ScrollView>

        {selected && <PaymentDetailsPanel payment={selected} onClose={() => setSelected(null)} isTablet={isTablet} />}
      </View>
    </AdminLayout>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                               */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  /* header with embedded stat strip */
  header: { backgroundColor: COLORS.navyDeep, borderRadius: 16, marginBottom: 4, overflow: 'hidden' },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14, gap: 12 },
  headerTitle: { fontWeight: '700', fontSize: 20, color: '#FFFFFF' },
  viewOrdersBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.orange, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  viewOrdersBtnText: { fontWeight: '700', fontSize: 12.5, color: '#fff' },
  /* embedded stat strip inside header */
  headerStatStrip: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 20, paddingVertical: 14 },
  headerStat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerStatIconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  headerStatValue: { fontWeight: '700', fontSize: 15, color: '#fff' },
  headerStatLabel: { fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.55)', letterSpacing: 0.4, marginTop: 1 },
  headerStatDiv: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 4 },

  /* stat cards */
  statsRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap', justifyContent: 'center' },
  statCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.ruleSoft,
    shadowColor: '#1B1F3B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  statCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  statIconBadge: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontWeight: '700', fontSize: 18 },
  statLabel: { fontSize: 11, fontWeight: '600', color: COLORS.muted, letterSpacing: 0.4 },


  /* filter bar */
  filterCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#1B1F3B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  searchBox: { flex: 1, minWidth: 160, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.rule, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.ink, outlineStyle: 'none' } as any,

  statusDropdownWrap: { position: 'relative', zIndex: 20 },
  statusDropdownBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: COLORS.rule, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 10, backgroundColor: COLORS.page },
  statusDropdownText: { flexShrink: 1, fontWeight: '600', fontSize: 12, color: COLORS.ink },
  statusDropdownMenu: {
    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
    backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.rule,
    overflow: 'hidden', shadowColor: '#1B1F3B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 18, elevation: 30, zIndex: 999,
  },
  dropdownOption: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: COLORS.ruleSoft },
  dropdownOptionActive: { backgroundColor: COLORS.navyTint },
  dropdownOptionText: { fontSize: 12.5, color: COLORS.ink },
  dropdownOptionTextActive: { fontWeight: '700', color: COLORS.navyDeep },
  statusDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: COLORS.rule },

  /* view toggle â€” pill container with navy active button */
  viewToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    padding: 3,
  },
  viewToggleBoxBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggleBoxBtnActive: {
    backgroundColor: '#1E2B6B',
  },

  /* grid card */
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  gridCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#1B1F3B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.ruleSoft,
    gap: 12,
  },
  gridCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gridCardMid: { gap: 4 },
  gridCardAmt: { fontWeight: '700', fontSize: 18, color: COLORS.navyDeep },
  gridCardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.ruleSoft },

  /* avatar */
  avatar: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  /* shared row bits */
  idMono: { fontSize: 11.5, fontWeight: '700', color: COLORS.orangeDeep },
  orderIdText: { fontSize: 12, fontWeight: '700', color: COLORS.navyDeep },
  custName: { fontWeight: '600', fontSize: 13, color: COLORS.ink, marginTop: 6 },
  custMail: { fontSize: 10, color: COLORS.muted2, marginTop: 1 },
  amt: { fontWeight: '700', fontSize: 13.5, color: COLORS.ink },
  methodText: { fontSize: 12, color: COLORS.muted },
  timeText: { fontSize: 11, color: COLORS.muted },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusBadgeText: { fontWeight: '700', fontSize: 10.5, color: '#fff', textTransform: 'capitalize' },
  viewActionBtn: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.navyDeep },

  /* date rail (shared by table + timeline) */
  dateRail: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, marginTop: 8 },
  dateRailDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: COLORS.orange, marginRight: 8 },
  dateRailLabel: { fontSize: 11, fontWeight: '700', color: COLORS.navyDeep, letterSpacing: 0.4 },
  dateRailLine: { flex: 1, height: 1, backgroundColor: COLORS.ruleSoft, marginHorizontal: 10 },
  dateRailCount: { fontSize: 10, color: COLORS.muted2 },

  /* table (tablet/desktop) */
  tableCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#1B1F3B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  tableHeadRow: { flexDirection: 'row', backgroundColor: COLORS.orangeTint, paddingVertical: 13, paddingHorizontal: 14, gap: 8 },
  tableHeadCell: { fontSize: 10.5, fontWeight: '700', color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: 0.4 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, gap: 8, borderBottomWidth: 1, borderBottomColor: COLORS.ruleSoft },

  /* timeline (phone) */
  timelineItem: { flexDirection: 'row', paddingLeft: 4 },
  timelineRail: { width: 20, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 14, borderWidth: 2, borderColor: COLORS.surface },
  timelineLine: { flex: 1, width: 2, backgroundColor: COLORS.ruleSoft, marginTop: 2, marginBottom: 2 },
  receiptCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.ruleSoft,
    padding: 12,
    marginLeft: 6,
    marginBottom: 12,
  },
  receiptTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  receiptBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },

  /* payment details panel */
  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15,17,32,0.55)', alignItems: 'center', justifyContent: 'center',
    padding: 18, zIndex: 200, elevation: 50,
  },
  modalCard: { width: '100%', maxWidth: 480, backgroundColor: COLORS.surface, borderRadius: 16 },
  modalCardPhone: { maxWidth: '100%', borderRadius: 14 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.orange, paddingHorizontal: 18, paddingVertical: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  modalHeaderTitle: { fontWeight: '700', fontSize: 16, color: '#fff' },
  modalCloseIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  modalBody: { padding: 20, gap: 0 },
  modalStatusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: COLORS.ruleSoft },
  modalAmtBig: { fontWeight: '800', fontSize: 20, color: COLORS.navyDeep },
  detailFieldsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  detailGrid: { flexDirection: 'row', gap: 20 },
  detailCol: { flexShrink: 0, gap: 16 },
  detailField: { paddingVertical: 2, width: '48%' },
  detailLabel: { fontWeight: '600', fontSize: 11.5, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  detailValue: { fontSize: 13, fontWeight: '700', color: COLORS.navyDeep, marginTop: 2 },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingBottom: 20 },
  modalCloseBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.navyMid, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 9 },
  modalCloseBtnText: { fontWeight: '700', fontSize: 12.5, color: '#fff' },
  /* receipt view button */
  receiptViewRow: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.ruleSoft },
  receiptViewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.navyDeep, borderRadius: 8, paddingVertical: 8 },
  receiptViewBtnText: { fontWeight: '700', fontSize: 12, color: '#fff' },

  /* empty state */
  emptyState: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 32, alignItems: 'center' },
  emptyTitle: { fontWeight: '700', fontSize: 15, color: COLORS.ink },
  emptySub: { fontSize: 12.5, color: COLORS.muted, marginTop: 6, textAlign: 'center' },
});