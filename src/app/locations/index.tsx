import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api/client';
import {
  fetchAreas,
  fetchCities,
  fetchCountries,
  fetchLocationCounts,
  fetchPincodes,
  fetchStates,
  createCountry,
  createState,
  createCity,
  createArea,
  createPincode,
  updateCountry,
  updateState,
  updateCity,
  updateArea,
  updatePincode,
  deleteCountry,
  deleteState,
  deleteCity,
  deleteArea,
  deletePincode,
  type LocationCounts,
  type LocationRow,
} from '@/services/locationApi';
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, G, Circle, Text as SvgText } from 'react-native-svg';

import AdminLayout from '@/components/admin-layout';
import Pagination from '@/components/Pagination';
import { ThemedText } from '@/components/themed-text';
import { LocationColors, ROW_THEMES } from '@/constants/locations-theme';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type DetailTab = 'overview' | 'countries' | 'states' | 'cities' | 'areas' | 'pincodes';
type RowStatus = 'Active' | 'Inactive';
type ViewMode = 'list' | 'grid';
type ModalMode = 'add' | 'edit' | 'view';

type ListRow = {
  id: number;
  name: string;
  flag?: string;
  status: RowStatus;
  code?: string;
  count?: number;
  iconBg?: string;
  iconColor?: string;
};

type Option = { id: number; name: string };

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const LIST_COLS: Record<DetailTab, { codeLabel?: string; countLabel?: string }> = {
  overview: {},
  countries: { codeLabel: 'Code' },
  states: { countLabel: 'Cities' },
  cities: { codeLabel: 'Code', countLabel: 'Areas' },
  areas: { codeLabel: 'City', countLabel: 'Pins' },
  pincodes: {},
};

const DETAIL_TABS: { key: DetailTab; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: 'dashboard' },
  { key: 'countries', label: 'Countries', icon: 'public' },
  { key: 'states', label: 'States', icon: 'map' },
  { key: 'cities', label: 'Cities', icon: 'location-city' },
  { key: 'areas', label: 'Areas', icon: 'place' },
  { key: 'pincodes', label: 'Pincodes', icon: 'mail-outline' },
];

const TAB_META: Record<
  DetailTab,
  { title: string; singular: string; plural: string; total: number; nameCol: string }
> = {
  overview: { title: 'Overview', singular: 'Overview', plural: 'overviews', total: 0, nameCol: '' },
  countries: { title: 'Countries', singular: 'Country', plural: 'countries', total: 195, nameCol: 'Country Name' },
  states: { title: 'States', singular: 'State', plural: 'states', total: 36, nameCol: 'State Name' },
  cities: { title: 'Cities', singular: 'City', plural: 'cities', total: 532, nameCol: 'City Name' },
  areas: { title: 'Areas', singular: 'Area', plural: 'areas', total: 1055, nameCol: 'Area Name' },
  pincodes: { title: 'Pincodes', singular: 'Pincode', plural: 'pincodes', total: 19000, nameCol: 'Pincode' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function mapLocationRow(row: LocationRow, index: number, tab: DetailTab): ListRow {
  const theme = ROW_THEMES[index % ROW_THEMES.length];
  return {
    id: row.id,
    name: String(row.name ?? row.pincode ?? row.id ?? '—'),
    status: row.active === false ? 'Inactive' : 'Active',
    code: row.code ? String(row.code) : row.stateName ? String(row.stateName) : undefined,
    count: typeof row.cityCount === 'number' ? row.cityCount : undefined,
    iconBg: theme.bg,
    iconColor: theme.color,
  };
}

function getRelationValue(row: Record<string, any> | null | undefined, keys: string[]): string | number | undefined {
  if (!row) return undefined;
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function belongsTo(child: Record<string, any>, parent: Option, idKeys: string[], nameKeys: string[]): boolean {
  const childId = getRelationValue(child, idKeys);
  if (childId !== undefined) return String(childId) === String(parent.id);
  const childName = getRelationValue(child, nameKeys);
  if (childName !== undefined) return String(childName).toLowerCase() === parent.name.toLowerCase();
  return true;
}

type MaterialIconName = keyof typeof MaterialIcons.glyphMap;

function Icon({
  name,
  size = 16,
  color = LocationColors.text,
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

// ─────────────────────────────────────────────────────────────────────────────
// StatusBadge
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status, compact }: { status: RowStatus; compact?: boolean }) {
  const active = status === 'Active';
  return (
    <View style={[
      s.badge,
      active ? s.badgeActive : s.badgeInactive,
      compact && s.badgeCompact,
    ]}>
      <View style={[s.badgeDot, { backgroundColor: active ? LocationColors.activeDot : LocationColors.inactiveText }]} />
      <ThemedText style={[s.badgeText, { color: active ? LocationColors.activeText : LocationColors.inactiveText, fontSize: compact ? 10 : 11 }]}>
        {status}
      </ThemedText>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HeroHeader
// ─────────────────────────────────────────────────────────────────────────────

function HeroHeader({
  isMobile,
  countriesCount,
  statesCount,
  citiesCount,
  pincodesCount,
}: {
  isMobile: boolean;
  countriesCount: number;
  statesCount: number;
  citiesCount: number;
  pincodesCount: number;
}) {
  const stats = [
    { label: 'Countries', value: countriesCount, icon: 'public' as MaterialIconName, color: '#2563EB', bg: '#EFF6FF' },
    { label: 'Active States', value: statesCount, icon: 'map' as MaterialIconName, color: '#059669', bg: '#ECFDF5' },
    { label: 'Inactive', value: 0, icon: 'location-off' as MaterialIconName, color: '#DC2626', bg: '#FEF2F2' },
    { label: 'Cities', value: citiesCount, icon: 'location-city' as MaterialIconName, color: '#D97706', bg: '#FFFBEB' },
    { label: 'Pincodes', value: `${pincodesCount.toLocaleString()}+`, icon: 'mail-outline' as MaterialIconName, color: '#7C3AED', bg: '#F5F3FF' },
  ];

  return (
    <>
      {/* Navy header */}
      <View style={[s.hero, isMobile && s.heroMobile]}>
        <View style={s.heroTitle}>
          <View style={s.heroIconBadge}>
            <MaterialIcons name="place" size={22} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={s.heroHeading}>Locations Management</ThemedText>
            <ThemedText style={s.heroSub}>Manage all countries, states, cities and pincodes</ThemedText>
          </View>
        </View>
      </View>

      {/* Stat cards */}
      {isMobile ? (
        // ── Mobile / small-tablet: 2-column grid, Pincodes full width ──
        <View style={s.statCardsMobileGrid}>
          {stats.slice(0, 4).map((p, i) => (
            <View key={i} style={s.statCardMobile}>
              <View style={[s.statCardIcon, { backgroundColor: p.bg }]}>
                <MaterialIcons name={p.icon} size={20} color={p.color} />
              </View>
              <View style={{ marginLeft: 12 }}>
                <ThemedText style={[s.statCardValue, { color: p.color }]}>
                  {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
                </ThemedText>
                <ThemedText style={s.statCardLabel}>{p.label}</ThemedText>
              </View>
            </View>
          ))}
          {/* Pincodes — full width */}
          <View style={s.statCardMobileFull}>
            <View style={[s.statCardIcon, { backgroundColor: stats[4].bg }]}>
              <MaterialIcons name={stats[4].icon} size={20} color={stats[4].color} />
            </View>
            <View style={{ marginLeft: 12 }}>
              <ThemedText style={[s.statCardValue, { color: stats[4].color }]}>
                {typeof stats[4].value === 'number' ? stats[4].value.toLocaleString() : stats[4].value}
              </ThemedText>
              <ThemedText style={s.statCardLabel}>{stats[4].label}</ThemedText>
            </View>
          </View>
        </View>
      ) : (
        // ── Tablet / Web: horizontal wrapping row ──
        <View style={s.statCardsRow}>
          {stats.map((p, i) => (
            <View key={i} style={s.statCard}>
              <View style={[s.statCardIcon, { backgroundColor: p.bg }]}>
                <MaterialIcons name={p.icon} size={20} color={p.color} />
              </View>
              <View style={{ marginLeft: 12 }}>
                <ThemedText style={[s.statCardValue, { color: p.color }]}>
                  {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
                </ThemedText>
                <ThemedText style={s.statCardLabel}>{p.label}</ThemedText>
              </View>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab bar
// ─────────────────────────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: DetailTab; onChange: (t: DetailTab) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabScroll}>
      <View style={s.tabRow}>
        {DETAIL_TABS.map((tab) => {
          const isActive = active === tab.key;
          return (
            <Pressable key={tab.key} onPress={() => onChange(tab.key)} style={[s.tab, isActive && s.tabActive]}>
              <MaterialIcons
                name={tab.icon as MaterialIconName}
                size={15}
                color={isActive ? LocationColors.accentStrong : LocationColors.textMuted}
              />
              <ThemedText style={[s.tabLabel, isActive && s.tabLabelActive]}>{tab.label}</ThemedText>
              {isActive && <View style={s.tabIndicator} />}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DonutChart
// ─────────────────────────────────────────────────────────────────────────────

function DonutChart({
  data,
  size = 140,
  title,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
  title?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.38;
  const r = size * 0.22;

  let currentAngle = -90;
  const slices = data
    .filter((d) => d.value > 0)
    .map((item) => {
      const angle = (item.value / total) * 360;
      const start = currentAngle;
      const end = currentAngle + angle;
      currentAngle += angle;

      const toRad = (deg: number) => (deg * Math.PI) / 180;
      const x1 = cx + R * Math.cos(toRad(start));
      const y1 = cy + R * Math.sin(toRad(start));
      const x2 = cx + R * Math.cos(toRad(end));
      const y2 = cy + R * Math.sin(toRad(end));
      const ix1 = cx + r * Math.cos(toRad(start));
      const iy1 = cy + r * Math.sin(toRad(start));
      const ix2 = cx + r * Math.cos(toRad(end));
      const iy2 = cy + r * Math.sin(toRad(end));
      const large = angle > 180 ? 1 : 0;

      const path =
        angle >= 359.9
          ? undefined
          : `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${r} ${r} 0 ${large} 0 ${ix1} ${iy1} Z`;

      return { ...item, path, angle };
    });

  return (
    <View style={s.donutWrap}>
      <Svg width={size} height={size}>
        {slices.map((slice, i) =>
          slice.path ? (
            <Path key={i} d={slice.path} fill={slice.color} />
          ) : (
            <Circle key={i} cx={cx} cy={cy} r={R} fill={slice.color} />
          )
        )}
        <Circle cx={cx} cy={cy} r={r - 2} fill={LocationColors.cardBg} />
        {title && (
          <SvgText
            x={cx}
            y={cy + 4}
            textAnchor="middle"
            fontSize={11}
            fill={LocationColors.textMuted}
            fontWeight="600">
            {title}
          </SvgText>
        )}
      </Svg>
      <View style={s.donutLegend}>
        {slices.map((d, i) => (
          <View key={i} style={s.donutLegendRow}>
            <View style={[s.donutDot, { backgroundColor: d.color }]} />
            <ThemedText style={s.donutLegendLabel}>{d.label}</ThemedText>
            <ThemedText style={[s.donutLegendVal, { color: d.color }]}>{d.value.toLocaleString()}</ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SelectField
// ─────────────────────────────────────────────────────────────────────────────

function SelectField({
  label,
  placeholder,
  value,
  options,
  onSelect,
  onClear,
  disabled,
}: {
  label: string;
  placeholder: string;
  value: Option | null;
  options: Option[];
  onSelect: (opt: Option) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = useMemo(
    () => options.filter((o) => o.name.toLowerCase().includes(search.trim().toLowerCase())),
    [options, search]
  );

  return (
    <View style={s.selectWrap}>
      <ThemedText style={s.selectLabel}>{label}</ThemedText>
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[s.selectBox, disabled && s.selectBoxDisabled]}>
        <ThemedText style={[s.selectVal, !value && s.selectPlaceholder]} numberOfLines={1}>
          {value ? value.name : placeholder}
        </ThemedText>
        <View style={s.selectRight}>
          {value && !disabled && (
            <Pressable onPress={onClear} hitSlop={6}>
              <MaterialIcons name="close" size={14} color={LocationColors.textMuted} />
            </Pressable>
          )}
          <MaterialIcons name="expand-more" size={18} color={LocationColors.textMuted} />
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.pickerOverlay} onPress={() => setOpen(false)}>
          <Pressable style={s.pickerBox} onPress={(e) => e.stopPropagation()}>
            <View style={s.pickerHeader}>
              <ThemedText style={s.pickerTitle}>Select {label}</ThemedText>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <MaterialIcons name="close" size={18} color={LocationColors.textMuted} />
              </Pressable>
            </View>
            <View style={s.pickerSearch}>
              <MaterialIcons name="search" size={16} color={LocationColors.textLight} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={`Search ${label.toLowerCase()}...`}
                placeholderTextColor={LocationColors.textLight}
                style={s.pickerSearchInput}
              />
            </View>
            <ScrollView style={{ maxHeight: 280 }} bounces={false}>
              {filtered.length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <ThemedText style={{ color: LocationColors.textMuted }}>No matches.</ThemedText>
                </View>
              ) : (
                filtered.map((opt) => {
                  const sel = value?.id === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      style={({ pressed }) => [s.pickerRow, (pressed || sel) && s.pickerRowSel]}
                      onPress={() => { onSelect(opt); setOpen(false); setSearch(''); }}>
                      <ThemedText style={[s.pickerRowText, sel && { fontWeight: '700', color: LocationColors.accentStrong }]}>
                        {opt.name}
                      </ThemedText>
                      {sel && <MaterialIcons name="check" size={16} color={LocationColors.accentStrong} />}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OverviewPanel
// ─────────────────────────────────────────────────────────────────────────────

function OverviewPanel({
  isMobile,
  loading,
  countriesCount,
  statesCount,
  citiesCount,
  pincodesCount,
  countryOptions,
  stateOptions,
  cityOptions,
  selectedCountry,
  selectedState,
  selectedCity,
  cityPincodes,
  pincodesLoading,
  onSelectCountry,
  onSelectState,
  onSelectCity,
  onReset,
}: {
  isMobile: boolean;
  loading: boolean;
  countriesCount: number;
  statesCount: number;
  citiesCount: number;
  pincodesCount: number;
  countryOptions: Option[];
  stateOptions: Option[];
  cityOptions: Option[];
  selectedCountry: Option | null;
  selectedState: Option | null;
  selectedCity: Option | null;
  cityPincodes: LocationRow[] | null;
  pincodesLoading: boolean;
  onSelectCountry: (o: Option) => void;
  onSelectState: (o: Option) => void;
  onSelectCity: (o: Option) => void;
  onReset: () => void;
}) {
  const pieData = useMemo(() => {
    if (!selectedCountry) {
      return [
        { label: 'Countries', value: countriesCount || 1, color: '#2563EB' },
        { label: 'States', value: statesCount || 36, color: '#9333EA' },
        { label: 'Cities', value: citiesCount || 532, color: '#EA580C' },
        { label: 'Pincodes', value: Math.min(pincodesCount || 100, 500), color: '#16A34A' },
      ];
    }
    if (selectedCountry && !selectedState) {
      const activeStates = stateOptions.length;
      return [
        { label: 'States', value: activeStates || statesCount, color: '#9333EA' },
        { label: 'Cities (est.)', value: citiesCount, color: '#EA580C' },
      ];
    }
    if (selectedState && !selectedCity) {
      const cityCount = cityOptions.length;
      const active = Math.ceil(cityCount * 0.75);
      return [
        { label: 'Active Cities', value: active, color: '#16A34A' },
        { label: 'Inactive', value: cityCount - active, color: '#EF4444' },
      ];
    }
    if (selectedCity) {
      const total = cityPincodes?.length ?? 0;
      if (total === 0 && pincodesLoading) return [];
      return [
        { label: 'Pincodes', value: total, color: '#16A34A' },
      ];
    }
    return [];
  }, [selectedCountry, selectedState, selectedCity, stateOptions, cityOptions, cityPincodes, pincodesLoading, countriesCount, statesCount, citiesCount, pincodesCount]);

  const breadcrumb = [selectedCountry?.name, selectedState?.name, selectedCity?.name].filter(Boolean).join(' › ');

  return (
    <View style={s.overviewRoot}>
      {/* Drill-down card */}
      <View style={s.drillCard}>
        <View style={s.drillHeader}>
          <View>
            <ThemedText style={s.drillTitle}>Location Breakdown</ThemedText>
            <ThemedText style={s.drillSub}>Select a country to drill into its states and cities</ThemedText>
          </View>
          {(selectedCountry || selectedState || selectedCity) && (
            <Pressable onPress={onReset} style={s.resetBtn}>
              <MaterialIcons name="refresh" size={14} color={LocationColors.accentStrong} />
              <ThemedText style={s.resetBtnText}>Reset</ThemedText>
            </Pressable>
          )}
        </View>

        {/* Selectors */}
        <View style={[s.selectorsRow, isMobile && s.selectorsRowMobile]}>
          <SelectField
            label="Country"
            placeholder="Choose a country"
            value={selectedCountry}
            options={countryOptions}
            onSelect={onSelectCountry}
            onClear={onReset}
          />
          <SelectField
            label="State"
            placeholder={selectedCountry ? 'Choose a state' : '— select country first —'}
            value={selectedState}
            options={stateOptions}
            onSelect={onSelectState}
            onClear={() => { }}
            disabled={!selectedCountry}
          />
          <SelectField
            label="City"
            placeholder={selectedState ? 'Choose a city' : '— select state first —'}
            value={selectedCity}
            options={cityOptions}
            onSelect={onSelectCity}
            onClear={() => { }}
            disabled={!selectedState}
          />
        </View>

        {/* Breadcrumb */}
        {breadcrumb ? (
          <View style={s.breadcrumbRow}>
            <MaterialIcons name="navigation" size={13} color={LocationColors.accentStrong} />
            <ThemedText style={s.breadcrumbText}>{breadcrumb}</ThemedText>
          </View>
        ) : null}

        {/* Chart area */}
        {loading || pincodesLoading ? (
          <View style={s.drillLoading}>
            <ActivityIndicator color={LocationColors.accentStrong} />
            <ThemedText style={s.drillLoadingText}>Loading data…</ThemedText>
          </View>
        ) : pieData.length > 0 ? (
          <View style={[s.chartArea, isMobile && s.chartAreaMobile]}>
            <DonutChart
              data={pieData}
              size={isMobile ? 130 : 160}
              title={
                !selectedCountry
                  ? 'Global'
                  : !selectedState
                    ? selectedCountry.name.slice(0, 8)
                    : !selectedCity
                      ? selectedState.name.slice(0, 8)
                      : selectedCity.name.slice(0, 8)
              }
            />
            {selectedCity && !pincodesLoading && cityPincodes && cityPincodes.length > 0 && (
              <View style={s.pincodeArea}>
                <ThemedText style={s.pincodeAreaTitle}>Pincodes in {selectedCity.name}</ThemedText>
                <View style={s.pincodeChips}>
                  {cityPincodes.slice(0, 15).map((p, idx) => (
                    <View key={idx} style={s.pincodeChip}>
                      <ThemedText style={s.pincodeChipText}>{String(p.pincode ?? p.name ?? p.id)}</ThemedText>
                    </View>
                  ))}
                  {cityPincodes.length > 15 && (
                    <View style={[s.pincodeChip, { backgroundColor: LocationColors.accentLight }]}>
                      <ThemedText style={[s.pincodeChipText, { color: LocationColors.accentStrong }]}>
                        +{cityPincodes.length - 15} more
                      </ThemedText>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        ) : !selectedCountry ? (
          <View style={s.drillEmpty}>
            <MaterialIcons name="travel-explore" size={40} color={LocationColors.textLight} />
            <ThemedText style={s.drillEmptyText}>Select a country above to see the breakdown</ThemedText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EntityCard
// ─────────────────────────────────────────────────────────────────────────────

function EntityCard({
  row,
  tab,
  onView,
  onEdit,
  onDelete,
}: {
  row: ListRow;
  tab: DetailTab;
  onView: (r: ListRow) => void;
  onEdit: (r: ListRow) => void;
  onDelete: (r: ListRow) => void;
}) {
  const cols = LIST_COLS[tab];

  return (
    <Pressable onPress={() => onView(row)} style={s.entityCard}>
      <View style={s.entityCardTop}>
        <StatusBadge status={row.status} compact />
        <ThemedText style={s.entityCardId}>#{row.id}</ThemedText>
      </View>

      <View style={s.entityCardAvatar}>
        {row.flag ? (
          <ThemedText style={{ fontSize: 32 }}>{row.flag}</ThemedText>
        ) : (
          <View style={[s.entityCardIconCircle, { backgroundColor: row.iconBg ?? '#FFF7ED' }]}>
            <MaterialIcons name="place" size={24} color={row.iconColor ?? LocationColors.accentStrong} />
          </View>
        )}
        <ThemedText style={s.entityCardName} numberOfLines={2}>{row.name}</ThemedText>
      </View>

      {(cols.codeLabel || cols.countLabel) && (
        <View style={s.entityCardStats}>
          {cols.codeLabel && (
            <View style={s.entityCardStat}>
              <ThemedText style={s.entityCardStatVal}>{row.code ?? '—'}</ThemedText>
              <ThemedText style={s.entityCardStatLabel}>{cols.codeLabel}</ThemedText>
            </View>
          )}
          {cols.countLabel && (
            <View style={s.entityCardStat}>
              <ThemedText style={s.entityCardStatVal}>{row.count ?? '—'}</ThemedText>
              <ThemedText style={s.entityCardStatLabel}>{cols.countLabel}</ThemedText>
            </View>
          )}
        </View>
      )}

      {/* View / Edit / Delete actions */}
      <View style={s.entityCardActions}>
        <Pressable
          onPress={() => onView(row)}
          style={[s.entityActionBtn, s.entityActionBtnView]}>
          <MaterialIcons name="visibility" size={15} color={LocationColors.accentStrong} />
        </Pressable>
        <Pressable
          onPress={() => onEdit(row)}
          style={[s.entityActionBtn, s.entityActionBtnEdit]}>
          <MaterialIcons name="edit" size={15} color="#2563EB" />
        </Pressable>
        <Pressable
          onPress={() => onDelete(row)}
          style={[s.entityActionBtn, s.entityActionBtnDel]}>
          <MaterialIcons name="delete" size={15} color={LocationColors.inactiveText} />
        </Pressable>
      </View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GridView
// ─────────────────────────────────────────────────────────────────────────────

function GridView({
  rows,
  columns,
  tab,
  onView,
  onEdit,
  onDelete,
}: {
  rows: ListRow[];
  columns: number;
  tab: DetailTab;
  onView: (r: ListRow) => void;
  onEdit: (r: ListRow) => void;
  onDelete: (r: ListRow) => void;
}) {
  if (rows.length === 0) {
    return (
      <View style={s.emptyWrap}>
        <MaterialIcons name="place" size={36} color={LocationColors.textLight} />
        <ThemedText style={s.emptyText}>No results found.</ThemedText>
      </View>
    );
  }

  const gap = 14;
  const colWidth = columns === 1 ? '100%' : columns === 2 ? '48.5%' : '31.8%';

  return (
    <View style={[s.grid, { gap }]}>
      {rows.map((row) => (
        <View key={row.id} style={{ width: colWidth }}>
          <EntityCard row={row} tab={tab} onView={onView} onEdit={onEdit} onDelete={onDelete} />
        </View>
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ListTable
// ─────────────────────────────────────────────────────────────────────────────

function ListTable({
  rows,
  tab,
  nameCol,
  onView,
  onEdit,
  onDelete,
}: {
  rows: ListRow[];
  tab: DetailTab;
  nameCol: string;
  onView: (r: ListRow) => void;
  onEdit: (r: ListRow) => void;
  onDelete: (r: ListRow) => void;
}) {
  const cols = LIST_COLS[tab];
  if (rows.length === 0) {
    return (
      <View style={s.tableCard}>
        <View style={s.emptyWrap}>
          <ThemedText style={s.emptyText}>No results found.</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={s.tableCard}>
      <View style={s.tableHead}>
        <View style={[s.th, s.colId]}><ThemedText style={s.thText}>ID</ThemedText></View>
        <View style={[s.th, s.colName]}><ThemedText style={s.thText}>{nameCol}</ThemedText></View>
        {cols.codeLabel && <View style={[s.th, s.colCode]}><ThemedText style={s.thText}>{cols.codeLabel}</ThemedText></View>}
        {cols.countLabel && <View style={[s.th, s.colCount]}><ThemedText style={s.thText}>{cols.countLabel}</ThemedText></View>}
        <View style={[s.th, s.colStatus]}><ThemedText style={s.thText}>Status</ThemedText></View>
        <View style={[s.th, s.colActions]}><ThemedText style={s.thText}>Actions</ThemedText></View>
      </View>

      {rows.map((row, i) => (
        <Pressable
          key={row.id}
          onPress={() => onView(row)}
          style={({ hovered }: any) => [
            s.tableRow,
            i > 0 && s.tableRowBorder,
            hovered && s.tableRowHover,
          ]}>
          <View style={[s.td, s.colId]}>
            <ThemedText style={s.tdText}>{row.id}</ThemedText>
          </View>
          <View style={[s.td, s.colName]}>
            <View style={s.nameCell}>
              {row.flag ? (
                <ThemedText style={{ fontSize: 20 }}>{row.flag}</ThemedText>
              ) : (
                <View style={[s.rowIcon, { backgroundColor: row.iconBg }]}>
                  <MaterialIcons name="place" size={14} color={row.iconColor} />
                </View>
              )}
              <ThemedText style={s.nameText} numberOfLines={1}>{row.name}</ThemedText>
            </View>
          </View>
          {cols.codeLabel && (
            <View style={[s.td, s.colCode]}>
              <ThemedText style={s.tdText}>{row.code ?? '—'}</ThemedText>
            </View>
          )}
          {cols.countLabel && (
            <View style={[s.td, s.colCount]}>
              <ThemedText style={s.tdText}>{row.count ?? '—'}</ThemedText>
            </View>
          )}
          <View style={[s.td, s.colStatus]}>
            <StatusBadge status={row.status} />
          </View>
          <View style={[s.td, s.colActions]}>
            <View style={s.actionRow}>
              <Pressable onPress={() => onView(row)} style={[s.actionBtn, s.actionBtnView]}>
                <MaterialIcons name="visibility" size={13} color={LocationColors.accentStrong} />
              </Pressable>
              <Pressable onPress={() => onEdit(row)} style={[s.actionBtn, s.actionBtnEdit]}>
                <MaterialIcons name="edit" size={13} color="#2563EB" />
              </Pressable>
              <Pressable onPress={() => onDelete(row)} style={[s.actionBtn, s.actionBtnDel]}>
                <MaterialIcons name="delete" size={13} color={LocationColors.inactiveText} />
              </Pressable>
            </View>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MobileListTable
// ─────────────────────────────────────────────────────────────────────────────

function MobileListTable({
  rows,
  tab,
  nameCol,
  onView,
  onEdit,
  onDelete,
}: {
  rows: ListRow[];
  tab: DetailTab;
  nameCol: string;
  onView: (r: ListRow) => void;
  onEdit: (r: ListRow) => void;
  onDelete: (r: ListRow) => void;
}) {
  const cols = LIST_COLS[tab];

  if (rows.length === 0) {
    return (
      <View style={s.tableCard}>
        <View style={s.emptyWrap}>
          <ThemedText style={s.emptyText}>No results found.</ThemedText>
        </View>
      </View>
    );
  }

  const tableWidth = 40 + 150 + (cols.codeLabel ? 80 : 0) + (cols.countLabel ? 60 : 0) + 80 + 110;

  return (
    <View style={s.tableCard}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
        <View style={{ minWidth: tableWidth }}>
          <View style={s.tableHead}>
            <View style={[s.th, { width: 40 }]}><ThemedText style={s.thText}>ID</ThemedText></View>
            <View style={[s.th, { width: 150 }]}><ThemedText style={s.thText}>{nameCol}</ThemedText></View>
            {cols.codeLabel && <View style={[s.th, { width: 80 }]}><ThemedText style={s.thText}>{cols.codeLabel}</ThemedText></View>}
            {cols.countLabel && <View style={[s.th, { width: 60 }]}><ThemedText style={s.thText}>{cols.countLabel}</ThemedText></View>}
            <View style={[s.th, { width: 80 }]}><ThemedText style={s.thText}>Status</ThemedText></View>
            <View style={[s.th, { width: 110 }]}><ThemedText style={s.thText}>Actions</ThemedText></View>
          </View>

          {rows.map((row, i) => (
            <Pressable
              key={row.id}
              onPress={() => onView(row)}
              style={({ pressed }) => [s.tableRow, i > 0 && s.tableRowBorder, pressed && s.tableRowHover]}>
              <View style={[s.td, { width: 40 }]}>
                <ThemedText style={[s.tdText, { fontSize: 11 }]}>{row.id}</ThemedText>
              </View>
              <View style={[s.td, { width: 150 }]}>
                <View style={s.nameCell}>
                  {row.flag ? (
                    <ThemedText style={{ fontSize: 16 }}>{row.flag}</ThemedText>
                  ) : (
                    <View style={[s.rowIcon, { backgroundColor: row.iconBg }]}>
                      <MaterialIcons name="place" size={12} color={row.iconColor} />
                    </View>
                  )}
                  <ThemedText style={[s.nameText, { fontSize: 11 }]} numberOfLines={1}>{row.name}</ThemedText>
                </View>
              </View>
              {cols.codeLabel && (
                <View style={[s.td, { width: 80 }]}>
                  <ThemedText style={[s.tdText, { fontSize: 11 }]}>{row.code ?? '—'}</ThemedText>
                </View>
              )}
              {cols.countLabel && (
                <View style={[s.td, { width: 60 }]}>
                  <ThemedText style={[s.tdText, { fontSize: 11 }]}>{row.count ?? '—'}</ThemedText>
                </View>
              )}
              <View style={[s.td, { width: 80 }]}>
                <StatusBadge status={row.status} compact />
              </View>
              <View style={[s.td, { width: 110 }]}>
                <View style={s.actionRow}>
                  <Pressable onPress={() => onView(row)} style={[s.actionBtn, s.actionBtnView, { width: 26, height: 26 }]}>
                    <MaterialIcons name="visibility" size={11} color={LocationColors.accentStrong} />
                  </Pressable>
                  <Pressable onPress={() => onEdit(row)} style={[s.actionBtn, s.actionBtnEdit, { width: 26, height: 26 }]}>
                    <MaterialIcons name="edit" size={11} color="#2563EB" />
                  </Pressable>
                  <Pressable onPress={() => onDelete(row)} style={[s.actionBtn, s.actionBtnDel, { width: 26, height: 26 }]}>
                    <MaterialIcons name="delete" size={11} color={LocationColors.inactiveText} />
                  </Pressable>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EntityModal
// ─────────────────────────────────────────────────────────────────────────────

function EntityModal({
  visible, mode, onClose, tab, isMobile, initialRow, onSave,
}: {
  visible: boolean; mode: ModalMode; onClose: () => void; tab: DetailTab;
  isMobile: boolean; initialRow: ListRow | null;
  onSave: (d: { name: string; code: string; status: RowStatus; parentId?: number }) => Promise<void>;
}) {
  const meta = TAB_META[tab];
  const insets = useSafeAreaInsets();
  const { height: wh } = useWindowDimensions();
  const [status, setStatus] = useState<RowStatus>('Active');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [parentOptions, setParentOptions] = useState<{ id: number; name: string }[]>([]);
  const [parentId, setParentId] = useState<number | null>(null);
  const [parentOpen, setParentOpen] = useState(false);
  const readOnly = mode === 'view';
  const showCode = tab === 'countries';
  const needsParent = mode === 'add' && tab !== 'countries' && tab !== 'overview';
  const parentLabel =
    tab === 'states' ? 'Country' :
      tab === 'cities' ? 'State' :
        tab === 'areas' ? 'City' :
          tab === 'pincodes' ? 'Area' : '';

  useEffect(() => {
    if (visible) {
      setStatus(initialRow?.status ?? 'Active');
      setName(initialRow?.name ?? '');
      setCode(initialRow?.code ?? '');
      setError(null);
      setParentId(null);
      setParentOpen(false);
    }
  }, [visible, initialRow]);

  useEffect(() => {
    if (!visible || !needsParent) {
      setParentOptions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        let options: { id: number; name: string }[] = [];
        if (tab === 'states') {
          options = (await fetchCountries()).map((row) => ({ id: row.id, name: String(row.name ?? row.id) }));
        } else if (tab === 'cities') {
          options = (await fetchStates()).map((row) => ({ id: row.id, name: String(row.name ?? row.id) }));
        } else if (tab === 'areas') {
          options = (await fetchCities()).map((row) => ({ id: row.id, name: String(row.name ?? row.id) }));
        } else if (tab === 'pincodes') {
          options = (await fetchAreas()).map((row) => ({ id: row.id, name: String(row.name ?? row.id) }));
        }
        if (!cancelled) {
          setParentOptions(options);
          if (options.length === 1) setParentId(options[0].id);
        }
      } catch (e) {
        if (!cancelled) setError(getApiErrorMessage(e, `Failed to load ${parentLabel.toLowerCase()} list.`));
      }
    })();
    return () => { cancelled = true; };
  }, [visible, needsParent, tab, parentLabel]);

  const heading = mode === 'add' ? `Add ${meta.singular}` : mode === 'edit' ? `Edit ${meta.singular}` : `${meta.singular} Details`;
  const selectedParent = parentOptions.find((opt) => opt.id === parentId);

  const handleSave = async () => {
    if (!name.trim()) { setError(`${meta.singular} name is required.`); return; }
    if (showCode && !code.trim()) { setError('Country code is required.'); return; }
    if (needsParent && !parentId) { setError(`${parentLabel} is required.`); return; }
    try {
      await onSave({ name: name.trim(), code: code.trim(), status, parentId: parentId ?? undefined });
    } catch (e: unknown) {
      setError(getApiErrorMessage(e));
    }
  };

  return (
    <Modal visible={visible} transparent animationType={isMobile ? 'slide' : 'fade'} onRequestClose={onClose}>
      <Pressable
        style={[s.modalOverlay, isMobile ? s.modalOverlayMobile : s.modalOverlayWeb]}
        onPress={onClose}>
        <Pressable
          style={isMobile ? s.modalSheetWrap : s.modalCenterWrap}
          onPress={(e) => e.stopPropagation()}>
          <View style={[s.modalBox, !isMobile && { maxHeight: Math.min(wh * 0.88, 680) }]}>
            <View style={s.modalHead}>
              <View style={s.modalHeadIcon}>
                <MaterialIcons name="place" size={18} color="#fff" />
              </View>
              <ThemedText style={s.modalHeadTitle}>{heading}</ThemedText>
              <Pressable onPress={onClose} hitSlop={8}>
                <MaterialIcons name="close" size={20} color="#fff" />
              </Pressable>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={s.modalBody} bounces={false}>
              <ThemedText style={s.fieldLabel}>{meta.singular} Name {!readOnly && <ThemedText style={{ color: LocationColors.inactiveText }}>*</ThemedText>}</ThemedText>
              <TextInput
                value={name} onChangeText={setName} editable={!readOnly}
                placeholder={`Enter ${meta.singular.toLowerCase()} name`}
                placeholderTextColor={LocationColors.textLight}
                style={[s.fieldInput, readOnly && s.fieldInputRO]}
              />

              {showCode && (
                <>
                  <ThemedText style={s.fieldLabel}>Country Code {!readOnly && <ThemedText style={{ color: LocationColors.inactiveText }}>*</ThemedText>}</ThemedText>
                  <TextInput
                    value={code} onChangeText={setCode} editable={!readOnly}
                    placeholder="e.g. IN, US"
                    placeholderTextColor={LocationColors.textLight}
                    style={[s.fieldInput, readOnly && s.fieldInputRO]}
                    autoCapitalize="characters"
                    maxLength={2}
                  />
                </>
              )}

              {needsParent && (
                <>
                  <ThemedText style={s.fieldLabel}>{parentLabel} {!readOnly && <ThemedText style={{ color: LocationColors.inactiveText }}>*</ThemedText>}</ThemedText>
                  <Pressable
                    style={[s.fieldInput, { justifyContent: 'center' }]}
                    onPress={() => !readOnly && setParentOpen((open) => !open)}
                    disabled={readOnly}
                  >
                    <ThemedText style={{ color: selectedParent ? LocationColors.text : LocationColors.textLight }}>
                      {selectedParent?.name ?? `Select ${parentLabel.toLowerCase()}`}
                    </ThemedText>
                  </Pressable>
                  {parentOpen && parentOptions.length > 0 && (
                    <View style={[s.fieldInput, { padding: 0, maxHeight: 180 }]}>
                      <ScrollView nestedScrollEnabled>
                        {parentOptions.map((opt) => (
                          <Pressable
                            key={opt.id}
                            style={{ paddingVertical: 10, paddingHorizontal: 12, backgroundColor: parentId === opt.id ? '#EFF6FF' : 'transparent' }}
                            onPress={() => { setParentId(opt.id); setParentOpen(false); }}
                          >
                            <ThemedText>{opt.name}</ThemedText>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </>
              )}

              <ThemedText style={s.fieldLabel}>Status</ThemedText>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {(['Active', 'Inactive'] as RowStatus[]).map((opt) => {
                  const sel = status === opt;
                  const isA = opt === 'Active';
                  return (
                    <Pressable
                      key={opt} disabled={readOnly} onPress={() => setStatus(opt)}
                      style={[s.statusOpt, sel && (isA ? s.statusOptActive : s.statusOptInactive)]}>
                      <View style={[s.radioCircle, sel && s.radioCircleSel]}>
                        {sel && <View style={s.radioDot} />}
                      </View>
                      <ThemedText style={[s.statusOptText, sel && { color: isA ? LocationColors.activeText : LocationColors.inactiveText }]}>{opt}</ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              {error && <ThemedText style={s.errorText}>{error}</ThemedText>}
            </ScrollView>

            <View style={[s.modalFoot, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              {readOnly ? (
                <Pressable style={s.btnSave} onPress={onClose}>
                  <ThemedText style={s.btnSaveText}>Close</ThemedText>
                </Pressable>
              ) : (
                <>
                  <Pressable style={s.btnCancel} onPress={onClose}>
                    <ThemedText style={s.btnCancelText}>Cancel</ThemedText>
                  </Pressable>
                  <Pressable style={s.btnSave} onPress={handleSave}>
                    <MaterialIcons name="save" size={15} color="#fff" />
                    <ThemedText style={s.btnSaveText}>{mode === 'edit' ? 'Save Changes' : `Add ${meta.singular}`}</ThemedText>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ConfirmDelete
// ─────────────────────────────────────────────────────────────────────────────

function ConfirmDelete({ row, singular, onCancel, onConfirm }: { row: ListRow | null; singular: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Modal visible={!!row} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={s.confirmOverlay} onPress={onCancel}>
        <Pressable style={s.confirmBox} onPress={(e) => e.stopPropagation()}>
          <View style={s.confirmIcon}>
            <MaterialIcons name="warning" size={24} color={LocationColors.inactiveText} />
          </View>
          <ThemedText style={s.confirmTitle}>Delete {singular}?</ThemedText>
          <ThemedText style={s.confirmBody}>"{row?.name}" will be permanently removed.</ThemedText>
          <View style={s.confirmBtns}>
            <Pressable style={s.btnCancel} onPress={onCancel}><ThemedText style={s.btnCancelText}>Cancel</ThemedText></Pressable>
            <Pressable style={[s.btnSave, { backgroundColor: '#DC2626' }]} onPress={onConfirm}>
              <MaterialIcons name="delete" size={14} color="#fff" />
              <ThemedText style={s.btnSaveText}>Delete</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────

export default function LocationsScreen() {
  const { width } = useWindowDimensions();

  // ── Responsive breakpoints ──────────────────────────────────────────────
  // Previously this screen decided "mobile vs web" purely from Platform.OS,
  // so on web the layout stayed in "desktop mode" even at very small browser
  // widths (and native devices always stayed in "mobile mode" even on large
  // tablets). That's why things looked broken between phone size and 1024px.
  // Now the layout responds to the actual viewport width instead, on every
  // platform, so resizing a web browser (or opening on a tablet) reflows
  // correctly all the way from mobile widths up through ~1024px and beyond.
  const isMobile = width < 768;                 // stacked / compact layout
  const gridColumns = width < 640 ? 1 : width < 1024 ? 2 : 3; // grid card columns

  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [rows, setRows] = useState<ListRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [modalVisible, setModalVisible] = useState(false);
  const [activeRow, setActiveRow] = useState<ListRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ListRow | null>(null);

  const [analysisCountries, setAnalysisCountries] = useState<LocationRow[]>([]);
  const [analysisStates, setAnalysisStates] = useState<LocationRow[]>([]);
  const [analysisCities, setAnalysisCities] = useState<LocationRow[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Option | null>(null);
  const [selectedState, setSelectedState] = useState<Option | null>(null);
  const [selectedCity, setSelectedCity] = useState<Option | null>(null);
  const [cityPincodes, setCityPincodes] = useState<LocationRow[] | null>(null);
  const [pincodesLoading, setPincodesLoading] = useState(false);
  const [locationCounts, setLocationCounts] = useState<LocationCounts | null>(null);

  const meta = TAB_META[detailTab];

  const loadRows = useCallback(async () => {
    try {
      if (detailTab === 'overview') { setRows([]); return; }
      let data: LocationRow[] = [];
      if (detailTab === 'countries') data = await fetchCountries();
      else if (detailTab === 'states') data = await fetchStates();
      else if (detailTab === 'cities') data = await fetchCities();
      else if (detailTab === 'areas') data = await fetchAreas();
      else if (detailTab === 'pincodes') data = await fetchPincodes();
      setRows(data.map((r, i) => mapLocationRow(r, i, detailTab)));
    } catch (e) {
      console.warn(getApiErrorMessage(e));
      setRows([]);
    }
  }, [detailTab]);

  useEffect(() => { loadRows(); }, [loadRows]);
  useEffect(() => { setQuery(''); setCurrentPage(1); }, [detailTab]);
  useEffect(() => { setCurrentPage(1); }, [query]);

  useEffect(() => {
    if (detailTab !== 'overview' || analysisCountries.length > 0) return;
    let cancelled = false;
    (async () => {
      setOverviewLoading(true);
      try {
        const [c, counts] = await Promise.all([fetchCountries(), fetchLocationCounts()]);
        if (!cancelled) {
          setAnalysisCountries(c);
          setLocationCounts(counts);
        }
      }
      catch (e) { console.warn(getApiErrorMessage(e)); }
      finally { if (!cancelled) setOverviewLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [detailTab, analysisCountries.length]);

  useEffect(() => {
    if (!selectedCountry) { setAnalysisStates([]); return; }
    let cancelled = false;
    (async () => {
      setOverviewLoading(true);
      try { const s = await fetchStates(selectedCountry.id); if (!cancelled) setAnalysisStates(s); }
      catch (e) { console.warn(getApiErrorMessage(e)); }
      finally { if (!cancelled) setOverviewLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [selectedCountry]);

  useEffect(() => {
    if (!selectedState) { setAnalysisCities([]); return; }
    let cancelled = false;
    (async () => {
      setOverviewLoading(true);
      try { const c = await fetchCities(selectedState.id); if (!cancelled) setAnalysisCities(c); }
      catch (e) { console.warn(getApiErrorMessage(e)); }
      finally { if (!cancelled) setOverviewLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [selectedState]);

  useEffect(() => {
    if (!selectedCity) { setCityPincodes(null); return; }
    let cancelled = false;
    (async () => {
      setPincodesLoading(true);
      try {
        const all = await fetchPincodes();
        if (cancelled) return;
        const matches = all.filter((p) =>
          belongsTo(p as unknown as Record<string, any>, selectedCity, ['cityId', 'city_id'], ['cityName', 'city_name', 'city'])
        );
        setCityPincodes(matches);
      } catch (e) { setCityPincodes([]); }
      finally { if (!cancelled) setPincodesLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [selectedCity]);

  const countryOptions = useMemo(() => analysisCountries.map((c) => ({ id: c.id, name: String(c.name ?? c.id) })), [analysisCountries]);
  const stateOptions = useMemo(() => analysisStates.map((s) => ({ id: s.id, name: String(s.name ?? s.id) })), [analysisStates]);
  const cityOptions = useMemo(() => analysisCities.map((c) => ({ id: c.id, name: String(c.name ?? c.id) })), [analysisCities]);

  const handleSelectCountry = (opt: Option) => { setSelectedCountry(opt); setSelectedState(null); setSelectedCity(null); };
  const handleSelectState = (opt: Option) => { setSelectedState(opt); setSelectedCity(null); };
  const resetSelection = () => { setSelectedCountry(null); setSelectedState(null); setSelectedCity(null); };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q) || String(r.id).includes(q));
  }, [query, rows]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginatedRows = useMemo(() => {
    return filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const openAdd = () => { setActiveRow(null); setModalMode('add'); setModalVisible(true); };
  const openEdit = (row: ListRow) => { setActiveRow(row); setModalMode('edit'); setModalVisible(true); };
  const openView = (row: ListRow) => { setActiveRow(row); setModalMode('view'); setModalVisible(true); };
  const closeModal = () => { setModalVisible(false); setActiveRow(null); };

  const handleSave = async (data: { name: string; code: string; status: RowStatus; parentId?: number }) => {
    const active = data.status === 'Active';
    try {
      if (modalMode === 'edit' && activeRow) {
        if (detailTab === 'countries') await updateCountry(activeRow.id, data.name, data.code, active);
        else if (detailTab === 'states') await updateState(activeRow.id, data.name, active);
        else if (detailTab === 'cities') await updateCity(activeRow.id, data.name, active);
        else if (detailTab === 'areas') await updateArea(activeRow.id, data.name, active);
        else if (detailTab === 'pincodes') await updatePincode(activeRow.id, data.name, active);
        setRows((prev) => prev.map((r) => r.id === activeRow.id ? { ...r, name: data.name, status: data.status, code: data.code } : r));
      } else {
        let newRow: LocationRow;
        if (detailTab === 'countries') newRow = await createCountry(data.name, data.code, active);
        else if (detailTab === 'states') {
          if (!data.parentId) throw new Error('Country is required.');
          newRow = await createState(data.parentId, data.name, active);
        } else if (detailTab === 'cities') {
          if (!data.parentId) throw new Error('State is required.');
          newRow = await createCity(data.parentId, data.name, active);
        } else if (detailTab === 'areas') {
          if (!data.parentId) throw new Error('City is required.');
          newRow = await createArea(data.parentId, data.name, active);
        } else if (detailTab === 'pincodes') {
          if (!data.parentId) throw new Error('Area is required.');
          newRow = await createPincode(data.parentId, data.name, active);
        } else return;
        const theme = ROW_THEMES[newRow.id % ROW_THEMES.length];
        setRows((prev) => [{
          ...mapLocationRow(newRow, 0, detailTab),
          status: data.status,
          code: data.code || String(newRow.code ?? ''),
          iconBg: theme.bg,
          iconColor: theme.color,
        }, ...prev]);
      }
      closeModal();
      await loadRows();
    } catch (e: unknown) {
      console.warn(getApiErrorMessage(e));
      throw new Error(getApiErrorMessage(e));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (detailTab === 'countries') await deleteCountry(deleteTarget.id);
      else if (detailTab === 'states') await deleteState(deleteTarget.id);
      else if (detailTab === 'cities') await deleteCity(deleteTarget.id);
      else if (detailTab === 'areas') await deleteArea(deleteTarget.id);
      else if (detailTab === 'pincodes') await deletePincode(deleteTarget.id);
      setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    } catch (e) {
      console.warn(getApiErrorMessage(e));
    }
    setDeleteTarget(null);
  };

  return (
    <AdminLayout>
      <ScrollView
        style={s.screen}
        contentContainerStyle={[s.content, isMobile && s.contentMobile]}
        showsVerticalScrollIndicator={false}>

        <HeroHeader
          isMobile={isMobile}
          countriesCount={locationCounts?.countries ?? analysisCountries.length ?? 195}
          statesCount={locationCounts?.states ?? analysisStates.length ?? 36}
          citiesCount={locationCounts?.cities ?? analysisCities.length ?? 532}
          pincodesCount={locationCounts?.pincodes ?? 19000}
        />

        <TabBar active={detailTab} onChange={setDetailTab} />

        {detailTab === 'overview' && (
          <OverviewPanel
            isMobile={isMobile}
            loading={overviewLoading}
            countriesCount={locationCounts?.countries ?? analysisCountries.length ?? 195}
            statesCount={locationCounts?.states ?? analysisStates.length ?? 36}
            citiesCount={locationCounts?.cities ?? analysisCities.length ?? 532}
            pincodesCount={locationCounts?.pincodes ?? 19000}
            countryOptions={countryOptions}
            stateOptions={stateOptions}
            cityOptions={cityOptions}
            selectedCountry={selectedCountry}
            selectedState={selectedState}
            selectedCity={selectedCity}
            cityPincodes={cityPincodes}
            pincodesLoading={pincodesLoading}
            onSelectCountry={handleSelectCountry}
            onSelectState={handleSelectState}
            onSelectCity={setSelectedCity}
            onReset={resetSelection}
          />
        )}

        {detailTab !== 'overview' && (
          <>
            <View style={[s.toolbar, isMobile && s.toolbarMobile]}>
              <View style={s.searchBox}>
                <MaterialIcons name="search" size={16} color={LocationColors.textLight} />
                <TextInput
                  value={query} onChangeText={setQuery}
                  placeholder={`Search ${meta.plural}…`}
                  placeholderTextColor={LocationColors.textLight}
                  style={s.searchInput}
                />
              </View>
              <View style={s.toolbarRight}>
                <View style={s.viewToggle}>
                  <Pressable style={[s.viewBtn, viewMode === 'grid' && s.viewBtnActive]} onPress={() => setViewMode('grid')}>
                    <MaterialIcons name="grid-view" size={15} color={viewMode === 'grid' ? '#fff' : LocationColors.textMuted} />
                  </Pressable>
                  <Pressable style={[s.viewBtn, viewMode === 'list' && s.viewBtnActive]} onPress={() => setViewMode('list')}>
                    <MaterialIcons name="view-list" size={15} color={viewMode === 'list' ? '#fff' : LocationColors.textMuted} />
                  </Pressable>
                </View>
                <Pressable style={s.addBtn} onPress={openAdd}>
                  <MaterialIcons name="add" size={16} color="#fff" />
                  {!isMobile && <ThemedText style={s.addBtnText}>Add {meta.singular}</ThemedText>}
                </Pressable>
              </View>
            </View>

            {viewMode === 'grid' ? (
              <GridView rows={paginatedRows} columns={gridColumns} tab={detailTab} onView={openView} onEdit={openEdit} onDelete={setDeleteTarget} />
            ) : isMobile ? (
              <MobileListTable rows={paginatedRows} tab={detailTab} nameCol={meta.nameCol} onView={openView} onEdit={openEdit} onDelete={setDeleteTarget} />
            ) : (
              <ListTable rows={paginatedRows} tab={detailTab} nameCol={meta.nameCol} onView={openView} onEdit={openEdit} onDelete={setDeleteTarget} />
            )}

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filtered.length}
              itemsPerPage={itemsPerPage}
              itemName={meta.plural}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </ScrollView>

      <EntityModal
        visible={modalVisible} mode={modalMode} onClose={closeModal}
        tab={detailTab} isMobile={isMobile} initialRow={activeRow} onSave={handleSave}
      />
      <ConfirmDelete row={deleteTarget} singular={meta.singular} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} />
    </AdminLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: LocationColors.pageBg },
  content: { padding: 20, paddingBottom: 48, maxWidth: 1200, alignSelf: 'center', width: '100%' },
  contentMobile: { padding: 14, paddingBottom: 32 },

  // ── Hero ──
  hero: {
    borderRadius: 22,
    backgroundColor: LocationColors.heroStart,
    padding: 24,
    paddingBottom: 52,
    shadowColor: LocationColors.heroStart,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  heroMobile: { padding: 18, paddingBottom: 52 },
  heroTitle: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroIconBadge: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroHeading: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', lineHeight: 28 },
  heroSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 3 },

  // ── Web / tablet stat cards row ──
  statCardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: -42,
    marginBottom: 16,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    minWidth: 180,
    flexGrow: 1,
    flexBasis: 180,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  statCardIcon: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  statCardValue: { fontSize: 20, fontWeight: '700', lineHeight: 24, marginTop: 8 },
  statCardLabel: { color: '#6B7280', fontSize: 11, marginTop: 2, fontWeight: '500' },

  // ── Mobile / small-tablet stat cards grid (2-col + full-width Pincodes) ──
  statCardsMobileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: -42,
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  statCardMobile: {
    // ~48% width so 2 per row with gap
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  statCardMobileFull: {
    // full width for Pincodes
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },

  // ── Tabs ──
  tabScroll: { marginBottom: 20, flexGrow: 0 },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: LocationColors.cardBg,
    borderRadius: 14,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 11,
    position: 'relative',
    flexShrink: 0, // prevent tabs from shrinking on mobile
  },
  tabActive: { backgroundColor: LocationColors.accentLight },
  tabLabel: { fontSize: 13, color: LocationColors.textMuted, fontWeight: '500' },
  tabLabelActive: { color: LocationColors.accentStrong, fontWeight: '700' },
  tabIndicator: {
    position: 'absolute', bottom: 4, left: 16, right: 16,
    height: 2, backgroundColor: LocationColors.accentStrong, borderRadius: 1,
  },

  // ── Overview ──
  overviewRoot: { gap: 16 },

  // Web overview summary row
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  summaryRowMobile: { flexDirection: 'row', flexWrap: 'wrap' },
  summaryCard: {
    flexGrow: 1, flexBasis: 160,
    backgroundColor: LocationColors.cardBg,
    borderRadius: 18, padding: 18,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  summaryCardMobile: { flexBasis: '45%', padding: 14 },

  // Mobile overview summary grid (3-col + full-width Pincodes)
  summaryMobileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCardMobileThird: {
    // ~31% so 3 per row
    flexBasis: '30%',
    flexGrow: 1,
    backgroundColor: LocationColors.cardBg,
    borderRadius: 14,
    padding: 10,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryCardMobileFull: {
    width: '100%',
    backgroundColor: LocationColors.cardBg,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  summaryIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  summaryValue: { fontSize: 22, fontWeight: '700', color: LocationColors.text, lineHeight: 26 },
  summaryLabel: { fontSize: 12, color: LocationColors.textMuted, marginTop: 3 },

  drillCard: {
    backgroundColor: LocationColors.cardBg,
    borderRadius: 18, padding: 22,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
    gap: 14,
  },
  drillHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  drillTitle: { fontSize: 17, fontWeight: '700', color: LocationColors.text },
  drillSub: { fontSize: 12, color: LocationColors.textMuted, marginTop: 3 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: LocationColors.accentLight, borderRadius: 8 },
  resetBtnText: { fontSize: 12, color: LocationColors.accentStrong, fontWeight: '600' },
  selectorsRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  selectorsRowMobile: { flexDirection: 'column', gap: 10 },
  breadcrumbRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: LocationColors.accentLight, borderRadius: 8 },
  breadcrumbText: { fontSize: 13, color: LocationColors.accentStrong, fontWeight: '600' },
  chartArea: { flexDirection: 'row', alignItems: 'flex-start', gap: 24, paddingTop: 8, flexWrap: 'wrap' },
  chartAreaMobile: { flexDirection: 'column', alignItems: 'center', gap: 16 },
  drillLoading: { alignItems: 'center', gap: 10, paddingVertical: 32 },
  drillLoadingText: { color: LocationColors.textMuted, fontSize: 13 },
  drillEmpty: { alignItems: 'center', gap: 12, paddingVertical: 36 },
  drillEmptyText: { color: LocationColors.textMuted, textAlign: 'center', fontSize: 13 },

  // Donut
  donutWrap: { flexDirection: 'row', alignItems: 'center', gap: 24, flexWrap: 'wrap' },
  donutLegend: { gap: 10 },
  donutLegendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  donutDot: { width: 10, height: 10, borderRadius: 5 },
  donutLegendLabel: { fontSize: 12, color: LocationColors.textSecondary, width: 90 },
  donutLegendVal: { fontSize: 14, fontWeight: '700' },

  // Pincodes
  pincodeArea: { flex: 1, minWidth: 180 },
  pincodeAreaTitle: { fontSize: 13, fontWeight: '700', color: LocationColors.text, marginBottom: 10 },
  pincodeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pincodeChip: { backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  pincodeChipText: { fontSize: 12, color: LocationColors.textSecondary, fontWeight: '500' },

  // ── Toolbar ──
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
  toolbarMobile: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  searchBox: {
    flex: 1, minWidth: 160, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: LocationColors.cardBg, borderWidth: 1, borderColor: LocationColors.border,
    borderRadius: 12, paddingHorizontal: 14, height: 44,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 14, color: LocationColors.text, paddingVertical: 0, outlineStyle: "none" as any } as any,
  toolbarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  viewToggle: { flexDirection: 'row', gap: 4 },
  viewBtn: {
    width: 36, height: 36, borderRadius: 9, borderWidth: 1, borderColor: LocationColors.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: LocationColors.cardBg,
  },
  viewBtnActive: { backgroundColor: LocationColors.viewActive, borderColor: LocationColors.viewActive },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: LocationColors.accentStrong,
    paddingHorizontal: 16, height: 36, borderRadius: 10,
    shadowColor: LocationColors.accentStrong, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // ── Grid ──
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },

  // Entity card
  entityCard: {
    backgroundColor: LocationColors.cardBg,
    borderRadius: 18, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
  },
  entityCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  entityCardId: { fontSize: 11, color: LocationColors.textMuted },
  entityCardAvatar: { alignItems: 'center', gap: 10, marginBottom: 14 },
  entityCardIconCircle: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  entityCardName: { fontSize: 15, fontWeight: '700', color: LocationColors.text, textAlign: 'center' },
  entityCardStats: {
    flexDirection: 'row', gap: 1,
    backgroundColor: LocationColors.borderLight, borderRadius: 10, overflow: 'hidden', marginBottom: 14,
  },
  entityCardStat: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  entityCardStatVal: { fontSize: 14, fontWeight: '700', color: LocationColors.text },
  entityCardStatLabel: { fontSize: 10, color: LocationColors.textMuted, marginTop: 2 },
  entityCardViewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: LocationColors.heroStart,
    borderRadius: 10, paddingVertical: 10,
  },
  entityCardViewBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Entity card — view / edit / delete action row (grid view)
  entityCardActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  entityActionBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entityActionBtnView: { borderColor: LocationColors.accentBorder, backgroundColor: LocationColors.accentLight },
  entityActionBtnEdit: { borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' },
  entityActionBtnDel: { borderColor: LocationColors.inactiveBorder, backgroundColor: LocationColors.inactiveBg },

  // ── Table ──
  tableCard: {
    backgroundColor: LocationColors.cardBg, borderRadius: 18, overflow: 'hidden', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  tableHead: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: LocationColors.tableHead,
    paddingVertical: 13, paddingHorizontal: 12,
  },
  th: { alignItems: 'center', justifyContent: 'center' },
  thText: { color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: 12,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
  },
  tableRowBorder: { borderTopWidth: 1, borderTopColor: LocationColors.borderLight },
  tableRowHover: { backgroundColor: LocationColors.accentLight },
  td: { justifyContent: 'center', overflow: 'hidden' },
  tdText: { fontSize: 13, color: LocationColors.textSecondary, textAlign: 'center' },
  colId: { width: 50, flexShrink: 0 },
  colName: { flex: 1, minWidth: 120, alignItems: 'flex-start' },
  colCode: { width: 90, flexShrink: 0 },
  colCount: { width: 90, flexShrink: 0 },
  colStatus: { width: 110, flexShrink: 0 },
  colActions: { width: 130, flexShrink: 0 },
  nameCell: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0, paddingHorizontal: 6 },
  nameText: { fontSize: 13, color: LocationColors.text, fontWeight: '600', flexShrink: 1 },
  rowIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  actionRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 6 },
  actionBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  actionBtnView: { borderColor: LocationColors.accentBorder, backgroundColor: LocationColors.accentLight },
  actionBtnEdit: { borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' },
  actionBtnDel: { borderColor: LocationColors.inactiveBorder, backgroundColor: LocationColors.inactiveBg },

  // ── Badge ──
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, borderWidth: 1, alignSelf: 'flex-start' },
  badgeCompact: { paddingHorizontal: 6, paddingVertical: 3 },
  badgeActive: { backgroundColor: LocationColors.activeBg, borderColor: LocationColors.activeBorder },
  badgeInactive: { backgroundColor: LocationColors.inactiveBg, borderColor: LocationColors.inactiveBorder },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontWeight: '600' },

  // ── Empty ──
  emptyWrap: { alignItems: 'center', gap: 10, paddingVertical: 40 },
  emptyText: { color: LocationColors.textMuted, fontSize: 14 },

  // ── Pagination ──
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  paginationMobile: { flexDirection: 'column', gap: 10, alignItems: 'flex-start' },
  paginationText: { fontSize: 13, color: LocationColors.textMuted },
  pages: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pageArrow: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: LocationColors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: LocationColors.cardBg },
  pageNum: { minWidth: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: LocationColors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, backgroundColor: LocationColors.cardBg },
  pageNumActive: { backgroundColor: LocationColors.accentStrong, borderColor: LocationColors.accentStrong },
  pageNumText: { fontSize: 13, color: LocationColors.textMuted, fontWeight: '600' },
  pageNumTextActive: { color: '#fff' },

  // ── Select ──
  selectWrap: { flex: 1, minWidth: 160 },
  selectLabel: { fontSize: 12, fontWeight: '600', color: LocationColors.textSecondary, marginBottom: 6 },
  selectBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    height: 44, borderWidth: 1, borderColor: LocationColors.border,
    borderRadius: 10, paddingHorizontal: 12, backgroundColor: LocationColors.cardBg,
  },
  selectBoxDisabled: { backgroundColor: '#F8FAFC', opacity: 0.55 },
  selectVal: { flex: 1, fontSize: 14, color: LocationColors.text },
  selectPlaceholder: { color: LocationColors.textLight },
  selectRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  pickerBox: { width: '100%', maxWidth: 380, maxHeight: 420, backgroundColor: LocationColors.cardBg, borderRadius: 16, overflow: 'hidden' },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: LocationColors.borderLight },
  pickerTitle: { fontSize: 15, fontWeight: '700', color: LocationColors.text },
  pickerSearch: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 12, height: 40, paddingHorizontal: 12, borderWidth: 1, borderColor: LocationColors.border, borderRadius: 10 },
  pickerSearchInput: { flex: 1, fontSize: 14, color: LocationColors.text, paddingVertical: 0, outlineStyle: "none" as any } as any,
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 8, borderRadius: 8 },
  pickerRowSel: { backgroundColor: LocationColors.accentLight },
  pickerRowText: { fontSize: 14, color: LocationColors.text },

  // ── Modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center' },
  modalOverlayWeb: { justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 32 },
  modalOverlayMobile: { justifyContent: 'flex-end', paddingHorizontal: 0 },
  modalCenterWrap: { width: '100%', maxWidth: 460 },
  modalSheetWrap: { width: '100%', paddingHorizontal: 10 },
  modalBox: { backgroundColor: LocationColors.cardBg, borderRadius: 18, overflow: 'hidden' },
  modalHead: {
    backgroundColor: LocationColors.modalHeader,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 16,
  },
  modalHeadIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  modalHeadTitle: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '700' },
  modalBody: { padding: 22, paddingBottom: 10, gap: 4 },
  modalFoot: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: LocationColors.borderLight },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: LocationColors.text, marginTop: 10, marginBottom: 6 },
  fieldInput: { height: 44, borderWidth: 1, borderColor: LocationColors.border, borderRadius: 10, paddingHorizontal: 14, fontSize: 14, color: LocationColors.text, backgroundColor: LocationColors.cardBg },
  fieldInputRO: { backgroundColor: '#F8FAFC', color: LocationColors.textMuted },
  statusOpt: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: LocationColors.border },
  statusOptActive: { borderColor: LocationColors.activeBorder, backgroundColor: LocationColors.activeBg },
  statusOptInactive: { borderColor: LocationColors.inactiveBorder, backgroundColor: LocationColors.inactiveBg },
  statusOptText: { fontSize: 13, fontWeight: '600', color: LocationColors.text },
  radioCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: LocationColors.border, alignItems: 'center', justifyContent: 'center' },
  radioCircleSel: { borderColor: LocationColors.accentStrong },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: LocationColors.accentStrong },
  errorText: { fontSize: 12, color: LocationColors.inactiveText, marginTop: 8 },
  btnCancel: { flex: 1, height: 46, borderRadius: 10, borderWidth: 1, borderColor: LocationColors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: LocationColors.cardBg },
  btnCancelText: { fontSize: 14, fontWeight: '600', color: LocationColors.textSecondary },
  btnSave: { flex: 1, flexDirection: 'row', height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: LocationColors.accentStrong, shadowColor: LocationColors.accentStrong, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  btnSaveText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // ── Confirm delete ──
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  confirmBox: { width: '100%', maxWidth: 340, backgroundColor: LocationColors.cardBg, borderRadius: 18, padding: 24, alignItems: 'center', gap: 8 },
  confirmIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: LocationColors.inactiveBg, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  confirmTitle: { fontSize: 17, fontWeight: '700', color: LocationColors.text },
  confirmBody: { fontSize: 13, color: LocationColors.textMuted, textAlign: 'center', marginBottom: 10 },
  confirmBtns: { flexDirection: 'row', gap: 10, width: '100%' },
});