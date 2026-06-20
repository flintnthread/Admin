import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api/client';
import {
  fetchCities,
  fetchCountries,
  fetchPincodes,
  fetchStates,
  type LocationRow,
} from '@/services/locationApi';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, G, Circle } from 'react-native-svg';

import AdminLayout from '@/components/admin-layout';
import { ThemedText } from '@/components/themed-text';
import { LocationColors } from '@/constants/locations-theme';

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

const ROW_ICON_THEMES = [
  { iconBg: '#FFF7ED', iconColor: '#EA580C' },
  { iconBg: '#F3E8FF', iconColor: '#9333EA' },
  { iconBg: '#EFF6FF', iconColor: '#2563EB' },
  { iconBg: '#FEF9C3', iconColor: '#CA8A04' },
  { iconBg: '#DCFCE7', iconColor: '#16A34A' },
] as const;

const LIST_COLS: Record<DetailTab, { codeLabel?: string; countLabel?: string }> = {
  overview: {},
  countries: { codeLabel: 'Code' },
  states: { countLabel: 'Cities' },
  cities: { codeLabel: 'Code', countLabel: 'Areas' },
  areas: { codeLabel: 'City', countLabel: 'Pins' },
  pincodes: {},
};

const COUNTRY = { name: 'India', flag: '🇮🇳', code: '+91', status: 'Active' as RowStatus };

const DETAIL_TABS: { key: DetailTab; label: string; count?: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'countries', label: 'Countries', count: '195' },
  { key: 'states', label: 'States', count: '36' },
  { key: 'cities', label: 'Cities', count: '532' },
  { key: 'areas', label: 'Areas', count: '1,055' },
  { key: 'pincodes', label: 'Pincodes', count: '19,000+' },
];

const TAB_META: Record<
  DetailTab,
  { title: string; singular: string; plural: string; total: number; nameCol: string }
> = {
  overview: { title: 'Locations Overview', singular: 'Overview', plural: 'overviews', total: 0, nameCol: '' },
  countries: { title: 'Countries Management', singular: 'Country', plural: 'countries', total: 195, nameCol: 'Country Name' },
  states: { title: 'States Management', singular: 'State', plural: 'states', total: 36, nameCol: 'State Name' },
  cities: { title: 'Cities Management', singular: 'City', plural: 'cities', total: 532, nameCol: 'City Name' },
  areas: { title: 'Areas Management', singular: 'Area', plural: 'areas', total: 1055, nameCol: 'Area Name' },
  pincodes: { title: 'Pincodes Management', singular: 'Pincode', plural: 'pincodes', total: 19000, nameCol: 'Pincode' },
};

function mapLocationRow(row: LocationRow, index: number, tab: DetailTab): ListRow {
  const theme = ROW_ICON_THEMES[index % ROW_ICON_THEMES.length];
  const name = String(row.name ?? row.pincode ?? row.id ?? '—');
  return {
    id: row.id,
    name,
    status: row.active === false ? 'Inactive' : 'Active',
    code: row.code ? String(row.code) : row.stateName ? String(row.stateName) : undefined,
    count: typeof row.cityCount === 'number' ? row.cityCount : undefined,
    iconBg: theme.iconBg,
    iconColor: theme.iconColor,
  };
}

// Best-effort helpers used by the Overview analysis panel. Different backends name
// parent-relationship fields differently (e.g. `countryId` vs `country_id` vs
// `countryName`), so we try a few common shapes before giving up. If your API in
// services/locationApi.ts exposes these fields under different names, just add
// them to the key lists below.
function getRelationValue(row: Record<string, any> | null | undefined, keys: string[]): string | number | undefined {
  if (!row) return undefined;
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function belongsTo(
  child: Record<string, any>,
  parent: Option,
  idKeys: string[],
  nameKeys: string[]
): boolean {
  const childId = getRelationValue(child, idKeys);
  if (childId !== undefined) return String(childId) === String(parent.id);
  const childName = getRelationValue(child, nameKeys);
  if (childName !== undefined) return String(childName).toLowerCase() === parent.name.toLowerCase();
  // No relation field available from the API — best-effort fallback so the UI
  // still shows something instead of an empty list.
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

function StatusBadge({ status }: { status: RowStatus }) {
  const active = status === 'Active';
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: active ? LocationColors.activeBg : LocationColors.inactiveBg,
          borderColor: active ? LocationColors.activeBorder : LocationColors.inactiveBorder,
        },
      ]}>
      <ThemedText
        type="smallBold"
        style={{ fontSize: 12, color: active ? LocationColors.activeText : LocationColors.inactiveText }}>
        {status}
      </ThemedText>
    </View>
  );
}

function ActionBtn({
  icon,
  color = LocationColors.textMuted,
  danger,
  mobile,
  onPress,
}: {
  icon: { ios: string; android: MaterialIconName; web: MaterialIconName };
  color?: string;
  danger?: boolean;
  mobile?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={[styles.actionBtn, mobile && styles.actionBtnMobile, danger && styles.actionBtnDanger]}>
      <Icon name={icon} size={mobile ? 12 : 14} color={danger ? LocationColors.inactiveText : color} />
    </Pressable>
  );
}

function RowActions({
  row,
  compact,
  mobile,
  onView,
  onEdit,
  onDelete,
}: {
  row: ListRow;
  compact?: boolean;
  mobile?: boolean;
  onView: (row: ListRow) => void;
  onEdit: (row: ListRow) => void;
  onDelete: (row: ListRow) => void;
}) {
  return (
    <View style={[styles.actions, compact && styles.actionsCompact, mobile && styles.actionsMobile]}>
      <ActionBtn
        mobile={mobile}
        icon={{ ios: 'eye', android: 'visibility', web: 'visibility' }}
        color={LocationColors.accentDark}
        onPress={() => onView(row)}
      />
      <ActionBtn
        mobile={mobile}
        icon={{ ios: 'square.and.pencil', android: 'edit', web: 'edit' }}
        color={LocationColors.infoText}
        onPress={() => onEdit(row)}
      />
      <ActionBtn
        mobile={mobile}
        icon={{ ios: 'trash', android: 'delete', web: 'delete' }}
        danger
        onPress={() => onDelete(row)}
      />
    </View>
  );
}

function DotStatusBadge({
  status,
  compact,
  dotOnly,
}: {
  status: RowStatus;
  compact?: boolean;
  dotOnly?: boolean;
}) {
  const active = status === 'Active';
  if (dotOnly) {
    return (
      <View
        style={[
          styles.statusDot,
          styles.statusDotCompact,
          { backgroundColor: active ? '#22C55E' : '#EF4444' },
        ]}
      />
    );
  }
  return (
    <View
      style={[
        styles.dotBadge,
        compact && styles.dotBadgeCompact,
        active ? styles.dotBadgeActive : styles.dotBadgeInactive,
      ]}>
      <View
        style={[
          styles.statusDot,
          compact && styles.statusDotCompact,
          { backgroundColor: active ? '#22C55E' : '#EF4444' },
        ]}
      />
      <ThemedText
        type="smallBold"
        style={{
          fontSize: compact ? 10 : 12,
          color: active ? '#15803D' : LocationColors.inactiveText,
        }}>
        {status}
      </ThemedText>
    </View>
  );
}

function RowNameIcon({ row }: { row: ListRow }) {
  const theme = ROW_ICON_THEMES[(row.id - 1) % ROW_ICON_THEMES.length];

  if (row.flag) {
    return <ThemedText style={{ fontSize: 18 }}>{row.flag}</ThemedText>;
  }

  return (
    <View
      style={[
        styles.rowIconBox,
        styles.rowIconBoxCompact,
        { backgroundColor: row.iconBg ?? theme.iconBg },
      ]}>
      <MaterialIcons name="account-balance" size={15} color={row.iconColor ?? theme.iconColor} />
    </View>
  );
}

function mobileTableWidth(tab: DetailTab) {
  const cols = LIST_COLS[tab];
  return (
    40 +
    150 +
    (cols.codeLabel ? (tab === 'areas' ? 100 : 56) : 0) +
    (cols.countLabel ? 56 : 0) +
    84 +
    140
  );
}

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
  onView: (row: ListRow) => void;
  onEdit: (row: ListRow) => void;
  onDelete: (row: ListRow) => void;
}) {
  const cols = LIST_COLS[tab];
  const tableWidth = mobileTableWidth(tab);

  if (rows.length === 0) {
    return (
      <View style={styles.empty}>
        <ThemedText type="small" style={{ color: LocationColors.textMuted }}>
          No results found.
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.mobileTableCard}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
        <View style={[styles.mobileTableInner, { minWidth: tableWidth }]}>
          <View style={styles.mobileTableHead}>
            <View style={[styles.mobileThCell, styles.mobileColId]}>
              <ThemedText type="smallBold" style={styles.mobileTh} numberOfLines={1}>
                ID
              </ThemedText>
            </View>
            <View style={[styles.mobileThCell, styles.mobileColName]}>
              <ThemedText type="smallBold" style={styles.mobileTh} numberOfLines={1}>
                {nameCol}
              </ThemedText>
            </View>
            {cols.codeLabel && (
              <View
                style={[
                  styles.mobileThCell,
                  tab === 'areas' ? styles.mobileColCodeWide : styles.mobileColCode,
                ]}>
                <ThemedText type="smallBold" style={styles.mobileTh} numberOfLines={1}>
                  {cols.codeLabel}
                </ThemedText>
              </View>
            )}
            {cols.countLabel && (
              <View style={[styles.mobileThCell, styles.mobileColCount]}>
                <ThemedText type="smallBold" style={styles.mobileTh} numberOfLines={1}>
                  {cols.countLabel}
                </ThemedText>
              </View>
            )}
            <View style={[styles.mobileThCell, styles.mobileColStatus]}>
              <ThemedText type="smallBold" style={styles.mobileTh} numberOfLines={1}>
                Status
              </ThemedText>
            </View>
            <View style={[styles.mobileThCell, styles.mobileColActions]}>
              <ThemedText type="smallBold" style={styles.mobileTh} numberOfLines={1}>
                Action
              </ThemedText>
            </View>
          </View>

          {rows.map((row, i) => (
            <Pressable
              key={row.id}
              onPress={() => onView(row)}
              style={({ pressed }) => [
                styles.mobileTableRow,
                i > 0 && styles.mobileTableRowBorder,
                pressed && styles.mobileTableRowPressed,
              ]}>
              <View style={[styles.mobileTdCell, styles.mobileColId]}>
                <ThemedText type="smallBold" style={[styles.mobileTd, styles.mobileTdCenter]}>
                  {row.id}
                </ThemedText>
              </View>
              <View style={[styles.mobileTdCell, styles.mobileColName]}>
                <View style={styles.mobileNameCell}>
                  <RowNameIcon row={row} />
                  <ThemedText
                    type="smallBold"
                    style={styles.mobileNameText}
                    numberOfLines={1}
                    ellipsizeMode="tail">
                    {row.name}
                  </ThemedText>
                </View>
              </View>
              {cols.codeLabel && (
                <View
                  style={[
                    styles.mobileTdCell,
                    tab === 'areas' ? styles.mobileColCodeWide : styles.mobileColCode,
                  ]}>
                  <ThemedText
                    type="smallBold"
                    style={[styles.mobileTd, styles.mobileTdCenter]}
                    numberOfLines={1}
                    ellipsizeMode="tail">
                    {row.code ?? '—'}
                  </ThemedText>
                </View>
              )}
              {cols.countLabel && (
                <View style={[styles.mobileTdCell, styles.mobileColCount]}>
                  <ThemedText
                    type="small"
                    style={[styles.mobileTd, styles.mobileTdCenter]}
                    numberOfLines={1}>
                    {row.count ?? '—'}
                  </ThemedText>
                </View>
              )}
              <View style={[styles.mobileTdCell, styles.mobileColStatus, styles.mobileStatusCell]}>
                <DotStatusBadge status={row.status} compact />
              </View>
              <View style={[styles.mobileTdCell, styles.mobileColActions, styles.mobileActionsCell]}>
                <RowActions row={row} mobile onView={onView} onEdit={onEdit} onDelete={onDelete} />
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function ListViewTable({
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
  onView: (row: ListRow) => void;
  onEdit: (row: ListRow) => void;
  onDelete: (row: ListRow) => void;
}) {
  const cols = LIST_COLS[tab];

  if (rows.length === 0) {
    return (
      <View style={styles.empty}>
        <ThemedText type="small" style={{ color: LocationColors.textMuted }}>
          No results found.
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.tableCard}>
      <View style={styles.tableHead}>
        <View style={[styles.thCell, styles.webColId]}>
          <ThemedText type="smallBold" style={styles.th}>
            ID
          </ThemedText>
        </View>
        <View style={[styles.thCell, styles.webColName]}>
          <ThemedText type="smallBold" style={styles.th}>
            {nameCol}
          </ThemedText>
        </View>
        {cols.codeLabel && (
          <View style={[styles.thCell, styles.webColCode]}>
            <ThemedText type="smallBold" style={styles.th}>
              {cols.codeLabel}
            </ThemedText>
          </View>
        )}
        {cols.countLabel && (
          <View style={[styles.thCell, styles.webColCount]}>
            <ThemedText type="smallBold" style={styles.th}>
              {cols.countLabel}
            </ThemedText>
          </View>
        )}
        <View style={[styles.thCell, styles.webColStatus]}>
          <ThemedText type="smallBold" style={styles.th}>
            Status
          </ThemedText>
        </View>
        <View style={[styles.thCell, styles.webColActions]}>
          <ThemedText type="smallBold" style={styles.th}>
            Action
          </ThemedText>
        </View>
      </View>

      {rows.map((row, i) => (
        <Pressable
          key={row.id}
          onPress={() => onView(row)}
          style={({ hovered }: any) => [
            styles.tableRow,
            i > 0 && styles.tableRowBorder,
            hovered && styles.tableRowHover,
          ]}>
          <View style={[styles.webTdCell, styles.webColId]}>
            <ThemedText type="smallBold" style={styles.webTd}>
              {row.id}
            </ThemedText>
          </View>
          <View style={[styles.webTdCell, styles.webColName, styles.webNameCell]}>
            <View style={styles.nameCell}>
              {row.flag && <ThemedText style={{ fontSize: 20 }}>{row.flag}</ThemedText>}
              <ThemedText type="smallBold" numberOfLines={1}>
                {row.name}
              </ThemedText>
            </View>
          </View>
          {cols.codeLabel && (
            <View style={[styles.webTdCell, styles.webColCode]}>
              <ThemedText type="smallBold" style={styles.webTd} numberOfLines={1}>
                {row.code ?? '—'}
              </ThemedText>
            </View>
          )}
          {cols.countLabel && (
            <View style={[styles.webTdCell, styles.webColCount]}>
              <ThemedText type="small" style={styles.webTd} numberOfLines={1}>
                {row.count ?? '—'}
              </ThemedText>
            </View>
          )}
          <View style={[styles.webTdCell, styles.webColStatus]}>
            <StatusBadge status={row.status} />
          </View>
          <View style={[styles.webTdCell, styles.webColActions]}>
            <RowActions row={row} onView={onView} onEdit={onEdit} onDelete={onDelete} />
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function GridViewCards({
  rows,
  columns,
  onView,
  onEdit,
  onDelete,
}: {
  rows: ListRow[];
  columns: number;
  onView: (row: ListRow) => void;
  onEdit: (row: ListRow) => void;
  onDelete: (row: ListRow) => void;
}) {
  if (rows.length === 0) {
    return (
      <View style={[styles.empty, styles.gridEmpty]}>
        <ThemedText type="small" style={{ color: LocationColors.textMuted }}>
          No results found.
        </ThemedText>
      </View>
    );
  }

  const itemWidth = columns === 1 ? '100%' : columns === 2 ? '48.5%' : '31.8%';

  return (
    <View style={styles.gridContainer}>
      {rows.map((row) => (
        <Pressable key={row.id} onPress={() => onView(row)} style={[styles.gridCard, { width: itemWidth }]}>
          <View style={styles.gridCardTop}>
            <ThemedText type="small" style={{ color: LocationColors.textMuted }}>
              #{row.id}
            </ThemedText>
            <StatusBadge status={row.status} />
          </View>

          <View style={styles.gridCardBody}>
            {row.flag ? (
              <ThemedText style={{ fontSize: 32 }}>{row.flag}</ThemedText>
            ) : (
              <View style={styles.gridPlaceholder}>
                <Icon
                  name={{ ios: 'mappin.and.ellipse', android: 'place', web: 'place' }}
                  size={20}
                  color={LocationColors.accentStrong}
                />
              </View>
            )}
            <ThemedText type="smallBold" style={styles.gridName} numberOfLines={2}>
              {row.name}
            </ThemedText>
          </View>

          <View style={styles.gridCardFooter}>
            <RowActions row={row} compact onView={onView} onEdit={onEdit} onDelete={onDelete} />
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  bg,
  color,
}: {
  icon: MaterialIconName;
  label: string;
  value: string | number;
  bg: string;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconBox, { backgroundColor: bg }]}>
        <MaterialIcons name={icon} size={18} color={color} />
      </View>
      <View style={{ flexShrink: 1 }}>
        <ThemedText type="subtitle" style={styles.statValue} numberOfLines={1}>
          {value}
        </ThemedText>
        <ThemedText type="small" style={styles.statLabel}>
          {label}
        </ThemedText>
      </View>
    </View>
  );
}

function AnalysisChip({ value, label }: { value: number | string; label: string }) {
  return (
    <View style={styles.analysisChip}>
      <ThemedText type="smallBold" style={styles.analysisChipValue}>
        {value}
      </ThemedText>
      <ThemedText type="small" style={styles.analysisChipLabel}>
        {label}
      </ThemedText>
    </View>
  );
}

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
    <View style={styles.selectWrap}>
      <ThemedText type="smallBold" style={styles.selectLabel}>
        {label}
      </ThemedText>
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.selectBox, disabled && styles.selectBoxDisabled]}>
        <ThemedText
          style={[styles.selectValue, !value && styles.selectPlaceholder]}
          numberOfLines={1}>
          {value ? value.name : placeholder}
        </ThemedText>
        <View style={styles.selectIcons}>
          {value && !disabled && (
            <Pressable onPress={onClear} hitSlop={6} style={styles.selectClear}>
              <MaterialIcons name="close" size={14} color={LocationColors.textMuted} />
            </Pressable>
          )}
          <MaterialIcons name="expand-more" size={18} color={LocationColors.textMuted} />
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.pickerOverlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.pickerBox} onPress={(e) => e.stopPropagation()}>
            <View style={styles.pickerHeader}>
              <ThemedText type="smallBold">Select {label}</ThemedText>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <MaterialIcons name="close" size={18} color={LocationColors.textMuted} />
              </Pressable>
            </View>
            <View style={styles.pickerSearchBox}>
              <MaterialIcons name="search" size={16} color={LocationColors.textLight} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={`Search ${label.toLowerCase()}...`}
                placeholderTextColor={LocationColors.textLight}
                style={styles.pickerSearchInput}
              />
            </View>
            <ScrollView style={styles.pickerList} bounces={false}>
              {filtered.length === 0 ? (
                <View style={styles.pickerEmpty}>
                  <ThemedText type="small" style={{ color: LocationColors.textMuted }}>
                    No matches found.
                  </ThemedText>
                </View>
              ) : (
                filtered.map((opt) => {
                  const selected = value?.id === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      style={({ pressed }) => [styles.pickerRow, pressed && styles.pickerRowActive]}
                      onPress={() => {
                        onSelect(opt);
                        setOpen(false);
                        setSearch('');
                      }}>
                      {selected ? (
                        <ThemedText type="smallBold" style={styles.pickerRowText}>
                          {opt.name}
                        </ThemedText>
                      ) : (
                        <ThemedText style={styles.pickerRowText}>{opt.name}</ThemedText>
                      )}
                      {selected && <MaterialIcons name="check" size={16} color={LocationColors.accentDark} />}
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

function ConfirmDeleteDialog({
  row,
  singular,
  onCancel,
  onConfirm,
}: {
  row: ListRow | null;
  singular: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={!!row} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.confirmOverlay} onPress={onCancel}>
        <Pressable style={styles.confirmBox} onPress={(e) => e.stopPropagation()}>
          <View style={styles.confirmIconWrap}>
            <MaterialIcons name="error-outline" size={22} color={LocationColors.inactiveText} />
          </View>
          <ThemedText type="smallBold" style={styles.confirmTitle}>
            Delete this {singular.toLowerCase()}?
          </ThemedText>
          <ThemedText type="small" style={styles.confirmBody}>
            {row ? `"${row.name}" will be removed. This can't be undone.` : ''}
          </ThemedText>
          <View style={styles.confirmActions}>
            <Pressable style={[styles.cancelBtn, styles.modalActionBtn]} onPress={onCancel}>
              <ThemedText type="smallBold">Cancel</ThemedText>
            </Pressable>
            <Pressable style={[styles.confirmDeleteBtn, styles.modalActionBtn]} onPress={onConfirm}>
              <MaterialIcons name="delete" size={14} color="#fff" />
              <ThemedText type="smallBold" style={{ color: '#fff' }}>
                Delete
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function EntityModal({
  visible,
  mode,
  onClose,
  tab,
  isMobile,
  initialRow,
  onSave,
}: {
  visible: boolean;
  mode: ModalMode;
  onClose: () => void;
  tab: DetailTab;
  isMobile: boolean;
  initialRow: ListRow | null;
  onSave: (data: { name: string; code: string; status: RowStatus }) => void;
}) {
  const meta = TAB_META[tab];
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [status, setStatus] = useState<RowStatus>('Active');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const showCodeField = tab === 'countries';
  const readOnly = mode === 'view';

  useEffect(() => {
    if (visible) {
      setStatus(initialRow?.status ?? 'Active');
      setName(initialRow?.name ?? '');
      setCode(initialRow?.code ?? '');
      setError(null);
    }
  }, [visible, initialRow, mode, tab]);

  const heading =
    mode === 'add' ? `Add New ${meta.singular}` : mode === 'edit' ? `Edit ${meta.singular}` : `${meta.singular} Details`;

  const handleSave = () => {
    if (!name.trim()) {
      setError(`${meta.singular} name is required.`);
      return;
    }
    if (showCodeField && !code.trim()) {
      setError('Country code is required.');
      return;
    }
    onSave({ name: name.trim(), code: code.trim(), status });
  };

  const footer = readOnly ? (
    <View style={[styles.modalFooter, isMobile && styles.modalFooterMobile]}>
      <Pressable style={[styles.saveBtn, styles.modalActionBtn]} onPress={onClose}>
        <ThemedText type="smallBold" style={{ color: '#fff' }}>
          Close
        </ThemedText>
      </Pressable>
    </View>
  ) : (
    <View style={[styles.modalFooter, isMobile && styles.modalFooterMobile]}>
      <Pressable style={[styles.cancelBtn, isMobile && styles.modalActionBtn]} onPress={onClose}>
        <Icon name={{ ios: 'xmark', android: 'close', web: 'close' }} size={14} />
        <ThemedText type="smallBold">Cancel</ThemedText>
      </Pressable>
      <Pressable style={[styles.saveBtn, isMobile && styles.modalActionBtn]} onPress={handleSave}>
        <Icon name={{ ios: 'square.and.arrow.down', android: 'save', web: 'save' }} size={14} color="#fff" />
        <ThemedText type="smallBold" style={{ color: '#fff' }} numberOfLines={1}>
          {mode === 'edit' ? 'Save Changes' : `Add ${meta.singular}`}
        </ThemedText>
      </Pressable>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isMobile ? 'slide' : 'fade'}
      onRequestClose={onClose}>
      <Pressable
        style={[styles.modalOverlay, isMobile ? styles.modalOverlayMobile : styles.modalOverlayWeb]}
        onPress={onClose}>
        <Pressable
          style={isMobile ? styles.modalWrapMobile : styles.modalWrapWeb}
          onPress={(e) => e.stopPropagation()}>
          <View
            style={[
              styles.modalBox,
              isMobile && styles.modalBoxMobile,
              !isMobile && { maxHeight: Math.min(windowHeight * 0.88, 720) },
            ]}>
            {isMobile && (
              <View style={styles.sheetHandleRow}>
                <View style={styles.sheetHandle} />
              </View>
            )}

            <View style={styles.modalTopBar}>
              <ThemedText type="smallBold" style={styles.modalTopBarTitle}>
                {heading}
              </ThemedText>
              <Pressable onPress={onClose} hitSlop={8}>
                <Icon name={{ ios: 'xmark', android: 'close', web: 'close' }} size={18} color="#fff" />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={[styles.modalBody, isMobile && styles.modalBodyMobile]}
              showsVerticalScrollIndicator={false}
              bounces={false}>
              {isMobile ? (
                <View style={styles.mobileModalIntro}>
                  <ThemedText type="smallBold" style={styles.mobileModalTitle}>
                    {heading}
                  </ThemedText>
                  {!readOnly && (
                    <ThemedText type="small" style={styles.mobileModalSubtitle}>
                      Enter the details for this {meta.singular.toLowerCase()}.
                    </ThemedText>
                  )}
                </View>
              ) : (
                <View style={styles.modalGlobeWrap}>
                  <View style={styles.modalGlobe}>
                    <Icon
                      name={{ ios: 'globe', android: 'public', web: 'public' }}
                      size={28}
                      color={LocationColors.accentStrong}
                    />
                  </View>
                  <ThemedText type="smallBold" style={{ fontSize: 20 }}>
                    {heading}
                  </ThemedText>
                  {!readOnly && (
                    <ThemedText type="small" style={{ color: LocationColors.textMuted, textAlign: 'center' }}>
                      Enter the details for this {meta.singular.toLowerCase()}.
                    </ThemedText>
                  )}
                </View>
              )}

              <ThemedText type="smallBold" style={styles.fieldLabel}>
                {meta.singular} Name{' '}
                {!readOnly && <ThemedText style={{ color: LocationColors.inactiveText }}>*</ThemedText>}
              </ThemedText>
              <TextInput
                value={name}
                onChangeText={setName}
                editable={!readOnly}
                placeholder={`Enter ${meta.singular.toLowerCase()} name`}
                placeholderTextColor={LocationColors.textLight}
                style={[styles.fieldInput, readOnly && styles.fieldInputReadOnly]}
              />
              {!readOnly && (
                <ThemedText type="small" style={styles.fieldHint}>
                  Enter the official {meta.singular.toLowerCase()} name.
                </ThemedText>
              )}

              {showCodeField && (
                <>
                  <ThemedText type="smallBold" style={styles.fieldLabel}>
                    Country Code (ISO){' '}
                    {!readOnly && <ThemedText style={{ color: LocationColors.inactiveText }}>*</ThemedText>}
                  </ThemedText>
                  <View style={styles.codeRow}>
                    {!readOnly && (
                      <Pressable style={styles.flagPicker}>
                        <ThemedText style={{ fontSize: 18 }}>🇺🇸</ThemedText>
                        <Icon
                          name={{ ios: 'chevron.down', android: 'expand-more', web: 'expand-more' }}
                          size={12}
                        />
                      </Pressable>
                    )}
                    <TextInput
                      value={code}
                      onChangeText={setCode}
                      editable={!readOnly}
                      placeholder="US"
                      placeholderTextColor={LocationColors.textLight}
                      style={[styles.fieldInput, styles.fieldInputFlex, readOnly && styles.fieldInputReadOnly]}
                    />
                  </View>
                  {!readOnly && (
                    <ThemedText type="small" style={styles.fieldHint}>
                      Two letter ISO country code (e.g., US, GB, IN)
                    </ThemedText>
                  )}
                </>
              )}

              <ThemedText type="smallBold" style={styles.fieldLabel}>
                Status {!readOnly && <ThemedText style={{ color: LocationColors.inactiveText }}>*</ThemedText>}
              </ThemedText>
              <View style={styles.statusCards}>
                {(['Active', 'Inactive'] as RowStatus[]).map((opt) => {
                  const selected = status === opt;
                  const isActive = opt === 'Active';
                  return (
                    <Pressable
                      key={opt}
                      disabled={readOnly}
                      onPress={() => setStatus(opt)}
                      style={[
                        styles.statusCard,
                        selected && (isActive ? styles.statusCardOn : styles.statusCardOff),
                      ]}>
                      <View style={[styles.radio, selected && styles.radioOn]}>
                        {selected && <View style={styles.radioDot} />}
                      </View>
                      <View style={styles.statusCardText}>
                        <ThemedText type="smallBold">{opt}</ThemedText>
                        <ThemedText type="small" style={styles.statusCardHint}>
                          {meta.singular} will be {opt.toLowerCase()}
                        </ThemedText>
                      </View>
                      {selected && isActive && (
                        <Icon
                          name={{
                            ios: 'checkmark.circle.fill',
                            android: 'check-circle',
                            web: 'check-circle',
                          }}
                          size={20}
                          color={LocationColors.accentDark}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {error && (
                <ThemedText type="small" style={styles.errorText}>
                  {error}
                </ThemedText>
              )}
            </ScrollView>

            <View
              style={[
                styles.modalFooterWrap,
                isMobile
                  ? { paddingBottom: Math.max(insets.bottom, 16) }
                  : styles.modalFooterWrapWeb,
              ]}>
              {footer}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SimplePieChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;

  let currentAngle = 0;
  const radius = 50;
  const cx = 60;
  const cy = 60;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 32, marginTop: 16 }}>
      <Svg width={120} height={120} viewBox="0 0 120 120">
        <G rotation="-90" origin="60, 60">
          {data.map((item, idx) => {
            if (item.value === 0) return null;
            const angle = (item.value / total) * 360;
            if (angle === 360) {
              return <Circle key={idx} cx={cx} cy={cy} r={radius} fill={item.color} />;
            }
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            currentAngle += angle;

            const startX = cx + radius * Math.cos((Math.PI * startAngle) / 180);
            const startY = cy + radius * Math.sin((Math.PI * startAngle) / 180);
            const endX = cx + radius * Math.cos((Math.PI * endAngle) / 180);
            const endY = cy + radius * Math.sin((Math.PI * endAngle) / 180);

            const largeArcFlag = angle > 180 ? 1 : 0;
            const pathData = `M ${cx} ${cy} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;

            return <Path key={idx} d={pathData} fill={item.color} />;
          })}
        </G>
      </Svg>
      <View style={{ gap: 12 }}>
        {data.map((item, idx) => (
          <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: item.color }} />
            <ThemedText type="small" style={{ width: 80 }}>{item.label}</ThemedText>
            <ThemedText type="smallBold">{item.value.toLocaleString()}</ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function LocationsScreen() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isMobile = !isWeb;

  const [detailTab, setDetailTab] = useState<DetailTab>('states');
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [rows, setRows] = useState<ListRow[]>([]);

  // Add / edit / view modal state
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [modalVisible, setModalVisible] = useState(false);
  const [activeRow, setActiveRow] = useState<ListRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ListRow | null>(null);

  // Overview analysis state
  const [analysisCountries, setAnalysisCountries] = useState<LocationRow[]>([]);
  const [analysisStates, setAnalysisStates] = useState<LocationRow[]>([]);
  const [analysisCities, setAnalysisCities] = useState<LocationRow[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Option | null>(null);
  const [selectedState, setSelectedState] = useState<Option | null>(null);
  const [selectedCity, setSelectedCity] = useState<Option | null>(null);
  const [cityPincodes, setCityPincodes] = useState<LocationRow[] | null>(null);
  const [pincodesLoading, setPincodesLoading] = useState(false);

  const meta = TAB_META[detailTab];
  const gridColumns = isWeb ? (width < 960 ? 2 : 3) : 1;

  const loadRows = useCallback(async () => {
    try {
      let data: LocationRow[] = [];
      if (detailTab === 'overview') { setRows([]); return; }
      else if (detailTab === 'countries') data = await fetchCountries();
      else if (detailTab === 'states') data = await fetchStates();
      else if (detailTab === 'cities' || detailTab === 'areas') data = await fetchCities();
      else if (detailTab === 'pincodes') data = await fetchPincodes();
      setRows(data.map((r, i) => mapLocationRow(r, i, detailTab)));
    } catch (e) {
      console.warn(getApiErrorMessage(e));
      setRows([]);
    }
  }, [detailTab]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => setQuery(''), [detailTab]);

  // Fetch all countries initially
  useEffect(() => {
    if (detailTab !== 'overview' || analysisCountries.length > 0) return;
    let cancelled = false;
    (async () => {
      setOverviewLoading(true);
      try {
        const countries = await fetchCountries();
        if (!cancelled) setAnalysisCountries(countries);
      } catch (e) {
        console.warn(getApiErrorMessage(e));
      } finally {
        if (!cancelled) setOverviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detailTab, analysisCountries.length]);

  // Fetch states dynamically when a country is chosen
  useEffect(() => {
    if (!selectedCountry) {
      setAnalysisStates([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setOverviewLoading(true);
      try {
        const states = await fetchStates(selectedCountry.id);
        if (!cancelled) setAnalysisStates(states);
      } catch (e) {
        console.warn(getApiErrorMessage(e));
      } finally {
        if (!cancelled) setOverviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedCountry]);

  // Fetch cities dynamically when a state is chosen
  useEffect(() => {
    if (!selectedState) {
      setAnalysisCities([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setOverviewLoading(true);
      try {
        const cities = await fetchCities(selectedState.id);
        if (!cancelled) setAnalysisCities(cities);
      } catch (e) {
        console.warn(getApiErrorMessage(e));
      } finally {
        if (!cancelled) setOverviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedState]);

  // Pincodes are fetched lazily once a city is picked, since this list can be large.
  useEffect(() => {
    if (!selectedCity) {
      setCityPincodes(null);
      return;
    }
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
      } catch (e) {
        console.warn(getApiErrorMessage(e));
        setCityPincodes([]);
      } finally {
        if (!cancelled) setPincodesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedCity]);

  const countryOptions = useMemo(
    () => analysisCountries.map((c) => ({ id: c.id, name: String(c.name ?? c.id) })),
    [analysisCountries]
  );

  const stateOptions = useMemo(() => {
    return analysisStates.map((s) => ({ id: s.id, name: String(s.name ?? s.id) }));
  }, [analysisStates]);

  const cityOptions = useMemo(() => {
    return analysisCities.map((c) => ({ id: c.id, name: String(c.name ?? c.id) }));
  }, [analysisCities]);

  const handleSelectCountry = (opt: Option) => {
    setSelectedCountry(opt);
    setSelectedState(null);
    setSelectedCity(null);
  };
  const handleSelectState = (opt: Option) => {
    setSelectedState(opt);
    setSelectedCity(null);
  };
  const resetSelection = () => {
    setSelectedCountry(null);
    setSelectedState(null);
    setSelectedCity(null);
  };

  const countryCountDisplay = analysisCountries.length || TAB_META.overview.total;
  const stateCountDisplay = analysisStates.length || TAB_META.states.total;
  const cityCountDisplay = analysisCities.length || TAB_META.cities.total;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q) || String(r.id).includes(q));
  }, [query, rows]);

  // ── Add / Edit / View / Delete (local state — see TODOs for wiring real API calls) ──
  const openAddModal = () => {
    setActiveRow(null);
    setModalMode('add');
    setModalVisible(true);
  };
  const openEditModal = (row: ListRow) => {
    setActiveRow(row);
    setModalMode('edit');
    setModalVisible(true);
  };
  const openViewModal = (row: ListRow) => {
    setActiveRow(row);
    setModalMode('view');
    setModalVisible(true);
  };
  const closeModal = () => {
    setModalVisible(false);
    setActiveRow(null);
  };

  const handleSaveEntity = (data: { name: string; code: string; status: RowStatus }) => {
    if (modalMode === 'edit' && activeRow) {
      // TODO: replace with a real update call, e.g. updateCountry(activeRow.id, data)
      setRows((prev) =>
        prev.map((r) =>
          r.id === activeRow.id ? { ...r, name: data.name, code: data.code || r.code, status: data.status } : r
        )
      );
    } else {
      // TODO: replace with a real create call, e.g. createCountry(data)
      const nextId = rows.reduce((max, r) => Math.max(max, r.id), 0) + 1;
      const theme = ROW_ICON_THEMES[nextId % ROW_ICON_THEMES.length];
      const newRow: ListRow = {
        id: nextId,
        name: data.name,
        status: data.status,
        code: data.code || undefined,
        iconBg: theme.iconBg,
        iconColor: theme.iconColor,
      };
      setRows((prev) => [newRow, ...prev]);
    }
    closeModal();
  };

  const requestDelete = (row: ListRow) => setDeleteTarget(row);
  const confirmDelete = () => {
    // TODO: replace with a real delete call, e.g. deleteCountry(deleteTarget.id)
    if (deleteTarget) setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <AdminLayout>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, isMobile && styles.contentMobile]}
        showsVerticalScrollIndicator={false}>



        <View style={[styles.entityCard, isMobile && styles.entityCardMobile]}>
          <View style={[styles.entityLeft, isMobile && styles.entityLeftMobile]}>

            <View style={isMobile ? styles.entityTextMobile : undefined}>
              <View style={styles.entityTitleRow}>
                <ThemedText type="smallBold" style={{ fontSize: isMobile ? 20 : 22 }}>
                  {COUNTRY.name}
                </ThemedText>
                <StatusBadge status={COUNTRY.status} />
              </View>
              <ThemedText type="small" style={{ color: LocationColors.textMuted, marginTop: 4 }}>
                Country Code: {COUNTRY.code}
              </ThemedText>
            </View>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
          <View style={styles.tabsRow}>
            {DETAIL_TABS.map((tab) => (
              <Pressable key={tab.key} onPress={() => setDetailTab(tab.key)} style={styles.tab}>
                <ThemedText
                  type="smallBold"
                  style={[styles.tabText, detailTab === tab.key && styles.tabTextActive]}>
                  {tab.label}
                  {tab.count ? ` (${tab.count})` : ''}
                </ThemedText>
                {detailTab === tab.key && <View style={styles.tabLine} />}
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {detailTab === 'overview' && (
          <View style={styles.overviewSection}>
            <ThemedText type="subtitle" style={styles.overviewHeading}>
              Overview
            </ThemedText>
            <ThemedText type="small" style={styles.overviewSubtitle}>
              A snapshot of every country, state, city and pincode — and a quick way to drill into one.
            </ThemedText>

            <View style={styles.statsGrid}>
              <StatCard icon="public" label="Countries" value={countryCountDisplay} bg="#EFF6FF" color="#2563EB" />
              <StatCard icon="map" label="States" value={stateCountDisplay} bg="#F3E8FF" color="#9333EA" />
              <StatCard icon="location-city" label="Cities" value={cityCountDisplay} bg="#FFF7ED" color="#EA580C" />
              <StatCard
                icon="mail-outline"
                label="Pincodes"
                value={`${TAB_META.pincodes.total.toLocaleString()}+`}
                bg="#DCFCE7"
                color="#16A34A"
              />
            </View>

            <View style={styles.analysisCard}>
              <View style={styles.analysisCardHeader}>
                <ThemedText type="smallBold" style={{ fontSize: 16 }}>
                  Analyze by location
                </ThemedText>
                {(selectedCountry || selectedState || selectedCity) && (
                  <Pressable onPress={resetSelection} hitSlop={6}>
                    <ThemedText type="small" style={{ color: LocationColors.accentStrong }}>
                      Reset
                    </ThemedText>
                  </Pressable>
                )}
              </View>
              <ThemedText type="small" style={styles.analysisCardSubtitle}>
                Pick a country, then a state and city, to see how the data breaks down.
              </ThemedText>

              <View style={[styles.selectsRow, isMobile && styles.selectsRowMobile]}>
                <SelectField
                  label="Country"
                  placeholder="Select country"
                  value={selectedCountry}
                  options={countryOptions}
                  onSelect={handleSelectCountry}
                  onClear={resetSelection}
                />
                <SelectField
                  label="State"
                  placeholder={selectedCountry ? 'Select state' : 'Select a country first'}
                  value={selectedState}
                  options={stateOptions}
                  onSelect={handleSelectState}
                  onClear={() => setSelectedState(null)}
                  disabled={!selectedCountry}
                />
                <SelectField
                  label="City"
                  placeholder={selectedState ? 'Select city' : 'Select a state first'}
                  value={selectedCity}
                  options={cityOptions}
                  onSelect={setSelectedCity}
                  onClear={() => setSelectedCity(null)}
                  disabled={!selectedState}
                />
              </View>

              {overviewLoading ? (
                <ThemedText type="small" style={styles.analysisLoading}>
                  Loading location data…
                </ThemedText>
              ) : !selectedCountry ? (
                <View style={styles.analysisEmpty}>
                  <MaterialIcons name="public" size={20} color={LocationColors.textLight} />
                  <ThemedText type="small" style={styles.analysisEmptyText}>
                    Select a country above to see its states, cities and pincodes.
                  </ThemedText>
                </View>
              ) : (
                <View style={styles.analysisResult}>
                  <ThemedText type="small" style={styles.analysisBreadcrumb} numberOfLines={1}>
                    {[selectedCountry.name, selectedState?.name, selectedCity?.name].filter(Boolean).join(' › ')}
                  </ThemedText>

                  {(() => {
                    if (!selectedState) {
                      return (
                        <SimplePieChart
                          data={[
                            { label: 'States', value: stateOptions.length, color: '#9333EA' },
                            { label: 'Cities', value: analysisStates.reduce((sum, s) => sum + (typeof s.cityCount === 'number' ? s.cityCount : 0), 0) || 0, color: '#EA580C' },
                          ]}
                        />
                      );
                    }
                    if (selectedState && !selectedCity) {
                      return (
                        <SimplePieChart
                          data={[
                            { label: 'Cities', value: cityOptions.length, color: '#EA580C' },
                          ]}
                        />
                      );
                    }
                    if (selectedCity) {
                      return (
                        <SimplePieChart
                          data={[
                            { label: 'Pincodes', value: pincodesLoading ? 0 : (cityPincodes?.length ?? 0), color: '#16A34A' },
                          ]}
                        />
                      );
                    }
                    return null;
                  })()}

                  {selectedCity && !pincodesLoading && cityPincodes && cityPincodes.length > 0 && (
                    <View style={styles.pincodeList}>
                      {cityPincodes.slice(0, 12).map((p, idx) => (
                        <View key={idx} style={styles.pincodeChip}>
                          <ThemedText type="small">{String(p.pincode ?? p.name ?? p.id)}</ThemedText>
                        </View>
                      ))}
                      {cityPincodes.length > 12 && (
                        <ThemedText type="small" style={{ color: LocationColors.textMuted }}>
                          +{cityPincodes.length - 12} more
                        </ThemedText>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {detailTab !== 'overview' && (
          <>
            <View style={[styles.listHeader, isMobile && styles.listHeaderMobile]}>
              <ThemedText type="subtitle" style={[styles.listTitle, isMobile && styles.listTitleMobile]}>
                {meta.title}
              </ThemedText>
              <Pressable style={[styles.addBtn, isMobile && styles.addBtnMobile]} onPress={openAddModal}>
                <Icon name={{ ios: 'plus', android: 'add', web: 'add' }} size={14} color="#fff" />
                <ThemedText type="smallBold" style={{ color: '#fff' }}>
                  Add New {meta.singular}
                </ThemedText>
              </Pressable>
            </View>

            <View style={[styles.toolbar, isMobile && styles.toolbarMobile]}>
              <View style={[styles.searchBox, isMobile && styles.searchBoxMobile]}>
                <Icon name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} size={16} color={LocationColors.textLight} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder={`Search ${meta.plural}...`}
                  placeholderTextColor={LocationColors.textLight}
                  style={styles.searchInput}
                />
              </View>
              <View style={[styles.viewToggle, isMobile && styles.viewToggleMobile]}>
                {!isMobile && (
                  <ThemedText type="small" style={{ color: LocationColors.textMuted }}>
                    View:
                  </ThemedText>
                )}
                <Pressable
                  style={[styles.viewBtn, viewMode === 'grid' && styles.viewBtnActive]}
                  onPress={() => setViewMode('grid')}>
                  <Icon
                    name={{ ios: 'square.grid.2x2', android: 'grid-view', web: 'grid-view' }}
                    size={15}
                    color={viewMode === 'grid' ? '#fff' : LocationColors.textMuted}
                  />
                </Pressable>
                <Pressable
                  style={[styles.viewBtn, viewMode === 'list' && styles.viewBtnActive]}
                  onPress={() => setViewMode('list')}>
                  <Icon
                    name={{ ios: 'list.bullet', android: 'view-list', web: 'view-list' }}
                    size={15}
                    color={viewMode === 'list' ? '#fff' : LocationColors.textMuted}
                  />
                </Pressable>
              </View>
            </View>

            {viewMode === 'list' ? (
              isWeb ? (
                <ListViewTable
                  rows={filtered}
                  tab={detailTab}
                  nameCol={meta.nameCol}
                  onView={openViewModal}
                  onEdit={openEditModal}
                  onDelete={requestDelete}
                />
              ) : (
                <MobileListTable
                  rows={filtered}
                  tab={detailTab}
                  nameCol={meta.nameCol}
                  onView={openViewModal}
                  onEdit={openEditModal}
                  onDelete={requestDelete}
                />
              )
            ) : (
              <GridViewCards
                rows={filtered}
                columns={gridColumns}
                onView={openViewModal}
                onEdit={openEditModal}
                onDelete={requestDelete}
              />
            )}

            <View style={[styles.pagination, isMobile && styles.paginationMobile]}>
              <ThemedText type="small" style={{ color: LocationColors.textMuted }}>
                Showing 1 to {Math.min(5, filtered.length)} of {meta.total} {meta.plural}
              </ThemedText>
              <View style={styles.pages}>
                <Pressable style={styles.pageArrow}>
                  <Icon name={{ ios: 'chevron.left', android: 'chevron-left', web: 'chevron-left' }} size={14} color={LocationColors.textMuted} />
                </Pressable>
                {[1, 2, 3].map((p) => (
                  <Pressable key={p} style={[styles.pageNum, p === 1 && styles.pageNumActive]}>
                    <ThemedText type="smallBold" style={{ color: p === 1 ? '#fff' : LocationColors.textMuted }}>{p}</ThemedText>
                  </Pressable>
                ))}
                <ThemedText type="small" style={{ color: LocationColors.textMuted }}>...</ThemedText>
                <Pressable style={styles.pageNum}>
                  <ThemedText type="smallBold" style={{ color: LocationColors.textMuted }}>39</ThemedText>
                </Pressable>
                <Pressable style={styles.pageArrow}>
                  <Icon name={{ ios: 'chevron.right', android: 'chevron-right', web: 'chevron-right' }} size={14} color={LocationColors.textMuted} />
                </Pressable>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <EntityModal
        visible={modalVisible}
        mode={modalMode}
        onClose={closeModal}
        tab={detailTab}
        isMobile={isMobile}
        initialRow={activeRow}
        onSave={handleSaveEntity}
      />

      <ConfirmDeleteDialog
        row={deleteTarget}
        singular={meta.singular}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: LocationColors.pageBg },
  screen: { flex: 1 },
  content: { padding: 24, paddingBottom: 40, maxWidth: 1200, alignSelf: 'center', width: '100%' },
  contentMobile: { padding: 16, paddingBottom: 28 },
  breadcrumbs: { color: LocationColors.textMuted, fontSize: 13, marginBottom: 16 },
  breadcrumbsMobile: { fontSize: 12, marginBottom: 12 },
  screenNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  navLink: { color: LocationColors.accentStrong, fontSize: 13 },
  navSep: { color: LocationColors.textLight, fontSize: 13 },
  navActive: { color: LocationColors.text, fontSize: 13 },
  entityCard: {
    backgroundColor: LocationColors.cardBg,
    borderRadius: 20,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 12,
  },
  entityCardMobile: { padding: 16, flexDirection: 'column', alignItems: 'stretch' },
  entityLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  entityLeftMobile: { flex: 0 },
  entityTextMobile: { flex: 1 },
  entityTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  tabsScroll: { marginBottom: 24, flexGrow: 0 },
  tabsRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: LocationColors.border },
  tab: { paddingHorizontal: 14, paddingVertical: 12, position: 'relative' },
  tabText: { color: LocationColors.textMuted, fontSize: 14 },
  tabTextActive: { color: LocationColors.accentStrong },
  tabLine: {
    position: 'absolute', bottom: 0, left: 10, right: 10,
    height: 3, backgroundColor: LocationColors.accentStrong, borderRadius: 2,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, borderWidth: 1, alignSelf: 'flex-start' },

  // ── Overview dashboard ──
  overviewSection: { marginBottom: 28, gap: 16 },
  overviewHeading: { fontSize: 24, lineHeight: 30, color: LocationColors.text },
  overviewSubtitle: { color: LocationColors.textMuted, marginTop: -8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    flexGrow: 1,
    flexBasis: 180,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: LocationColors.cardBg,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  statIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { fontSize: 24, fontWeight: '700', lineHeight: 28, color: LocationColors.text },
  statLabel: { color: LocationColors.textMuted, marginTop: 4, fontSize: 13 },
  analysisCard: {
    backgroundColor: LocationColors.cardBg,
    borderRadius: 20,
    padding: 24,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  analysisCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  analysisCardSubtitle: { color: LocationColors.textMuted, marginBottom: 12 },
  selectsRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  selectsRowMobile: { flexDirection: 'column' },
  selectWrap: { flex: 1, minWidth: 0 },
  selectLabel: { marginBottom: 6, color: LocationColors.text },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    borderWidth: 1,
    borderColor: LocationColors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: LocationColors.cardBg,
  },
  selectBoxDisabled: { backgroundColor: LocationColors.inactiveBg, opacity: 0.6 },
  selectValue: { flex: 1, color: LocationColors.text, fontSize: 14 },
  selectPlaceholder: { color: LocationColors.textLight },
  selectIcons: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  selectClear: { padding: 2 },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  pickerBox: {
    width: '100%',
    maxWidth: 380,
    maxHeight: 420,
    backgroundColor: LocationColors.cardBg,
    borderRadius: 14,
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: LocationColors.borderLight,
  },
  pickerSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 6,
    height: 40,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: LocationColors.border,
    borderRadius: 9,
  },
  pickerSearchInput: { flex: 1, fontSize: 14, color: LocationColors.text, paddingVertical: 0 },
  pickerList: { paddingHorizontal: 8, paddingBottom: 8 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  pickerRowActive: { backgroundColor: '#FFF7ED' },
  pickerRowText: { color: LocationColors.text },
  pickerEmpty: { padding: 24, alignItems: 'center' },
  analysisLoading: { color: LocationColors.textMuted, marginTop: 4 },
  analysisEmpty: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 22,
  },
  analysisEmptyText: { color: LocationColors.textMuted, textAlign: 'center' },
  analysisResult: {
    marginTop: 8,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: LocationColors.borderLight,
    gap: 12,
  },
  analysisBreadcrumb: { color: LocationColors.accentStrong, fontWeight: '600' },
  analysisChipsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  analysisChip: {
    backgroundColor: '#FFF7ED',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 76,
  },
  analysisChipValue: { fontSize: 16, color: LocationColors.accentStrong },
  analysisChipLabel: { color: LocationColors.textMuted },
  pincodeList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  pincodeChip: {
    backgroundColor: LocationColors.inactiveBg === LocationColors.cardBg ? '#F1F5F9' : '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  listHeaderMobile: { flexDirection: 'column', alignItems: 'flex-start', gap: 12 },
  listTitle: { fontSize: 26, lineHeight: 32, color: LocationColors.text },
  listTitleMobile: { fontSize: 22, lineHeight: 28 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: LocationColors.accentStrong, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12,
    shadowColor: LocationColors.accentStrong, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  addBtnMobile: {
    width: '70%',
    justifyContent: 'center',
    backgroundColor: LocationColors.accentStrong,
    paddingVertical: 14,
    borderRadius: 12,
    marginLeft: 40,
    shadowColor: LocationColors.accentStrong, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  toolbarMobile: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: LocationColors.cardBg, borderWidth: 1, borderColor: LocationColors.border,
    borderRadius: 10, paddingHorizontal: 14, height: 44,
  },
  searchBoxMobile: { minWidth: 0 },
  searchInput: { flex: 1, fontSize: 14, color: LocationColors.text, paddingVertical: 0 },
  viewToggle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  viewToggleMobile: { flexShrink: 0 },
  viewBtn: {
    width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: LocationColors.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: LocationColors.cardBg,
  },
  viewBtnActive: { backgroundColor: LocationColors.viewActive, borderColor: LocationColors.viewActive },
  tableCard: {
    backgroundColor: LocationColors.cardBg, borderRadius: 20,
    overflow: 'hidden', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LocationColors.modalHeader,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  thCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  th: {
    color: '#ffffff',
    fontSize: 13,
    textAlign: 'center',
    width: '100%',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
  },
  tableRowBorder: { borderTopWidth: 1, borderTopColor: LocationColors.borderLight },
  tableRowHover: { backgroundColor: '#FFF7ED' },
  webColId: { width: 50, flexShrink: 0 },
  webColName: { flex: 1, minWidth: 120, flexShrink: 1 },
  webColCode: { width: 90, flexShrink: 0 },
  webColCount: { width: 90, flexShrink: 0 },
  webColStatus: { width: 110, flexShrink: 0 },
  webColActions: { width: 140, flexShrink: 0 },
  webTdCell: {
    justifyContent: 'center',
    overflow: 'hidden',
  },
  webNameCell: {
    alignItems: 'flex-start',
  },
  webTd: {
    textAlign: 'center',
    width: '100%',
    color: LocationColors.text,
  },
  nameCell: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, minWidth: 0 },
  actions: { flexDirection: 'row', gap: 6, paddingLeft: 8, width: 130 },
  actionsCompact: { paddingLeft: 0, width: 'auto', justifyContent: 'center' },
  actionsMobile: { gap: 2, paddingLeft: 0, width: 'auto', justifyContent: 'center' },
  actionBtn: {
    width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: LocationColors.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: LocationColors.cardBg,
  },
  actionBtnMobile: { width: 22, height: 22, borderRadius: 6 },
  actionBtnDanger: { borderColor: LocationColors.inactiveBorder, backgroundColor: LocationColors.inactiveBg },
  empty: { padding: 32, alignItems: 'center' },
  gridEmpty: {
    backgroundColor: LocationColors.cardBg,
    borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  gridCard: {
    backgroundColor: LocationColors.cardBg,
    borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
    padding: 20,
    minWidth: 200,
  },
  gridCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  gridCardBody: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  gridPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridName: {
    fontSize: 16,
    textAlign: 'center',
    color: LocationColors.text,
  },
  gridCardFooter: {
    borderTopWidth: 1,
    borderTopColor: LocationColors.borderLight,
    paddingTop: 12,
    alignItems: 'center',
  },
  mobileTableCard: {
    backgroundColor: LocationColors.cardBg,
    borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  mobileTableInner: {
    width: '100%',
  },
  mobileTableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LocationColors.modalHeader,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  mobileThCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileTh: {
    color: '#ffffff',
    fontSize: 11,
    textAlign: 'center',
    width: '100%',
  },
  mobileTd: {
    color: LocationColors.text,
    fontSize: 12,
  },
  mobileTdCell: {
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mobileTdCenter: {
    textAlign: 'center',
    width: '100%',
  },
  mobileColId: { width: 40, flexShrink: 0 },
  mobileColName: { width: 150, flexShrink: 0 },
  mobileColCode: { width: 56, flexShrink: 0 },
  mobileColCodeWide: { width: 100, flexShrink: 0 },
  mobileColCount: { width: 56, flexShrink: 0 },
  mobileColStatus: { width: 84, flexShrink: 0 },
  mobileColActions: { width: 130, flexShrink: 0 },
  mobileTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  mobileTableRowBorder: {
    borderTopWidth: 1,
    borderTopColor: LocationColors.borderLight,
  },
  mobileTableRowPressed: {
    backgroundColor: '#FFF7ED',
  },
  mobileNameCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
    flex: 1,
  },
  mobileNameText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 12,
    color: LocationColors.text,
    minWidth: 0,
  },
  mobileStatusCell: {
    alignItems: 'center',
    overflow: 'visible',
  },
  mobileActionsCell: {
    alignItems: 'center',
    overflow: 'visible',
  },
  rowIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowIconBoxCompact: {
    width: 30,
    height: 30,
    borderRadius: 8,
  },
  dotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  dotBadgeCompact: {
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 16,
  },
  dotBadgeActive: {
    backgroundColor: '#ECFDF5',
  },
  dotBadgeInactive: {
    backgroundColor: LocationColors.inactiveBg,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusDotCompact: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  paginationMobile: { flexDirection: 'column', gap: 12, alignItems: 'flex-start' },
  pages: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pageArrow: {
    width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: LocationColors.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: LocationColors.cardBg,
  },
  pageNum: {
    minWidth: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: LocationColors.border,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, backgroundColor: LocationColors.cardBg,
  },
  pageNumActive: { backgroundColor: LocationColors.accentDark, borderColor: LocationColors.accentDark },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalOverlayWeb: {
    justifyContent: 'center',
    paddingVertical: 32,
  },
  modalOverlayMobile: {
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  modalWrapWeb: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  modalWrapMobile: {
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: 12,
  },
  modalBox: {
    width: '100%',
    backgroundColor: LocationColors.cardBg,
    borderRadius: 14,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  modalBoxMobile: {
    width: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    maxHeight: '92%',
  },
  modalScroll: { width: '100%', flexShrink: 1, flexGrow: 1, minHeight: 0 },
  sheetHandleRow: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: LocationColors.cardBg,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: LocationColors.border,
  },
  modalTopBar: {
    backgroundColor: LocationColors.modalHeader,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    width: '100%',
    flexShrink: 0,
  },
  modalTopBarTitle: { color: '#fff', fontSize: 16, flex: 1, marginRight: 12 },
  modalBody: { width: '100%', padding: 24, paddingBottom: 16 },
  modalBodyMobile: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  mobileModalIntro: { width: '100%', alignItems: 'center', marginBottom: 20, gap: 6 },
  mobileModalTitle: { fontSize: 20, color: LocationColors.text, textAlign: 'center' },
  mobileModalSubtitle: { color: LocationColors.textMuted, textAlign: 'center', lineHeight: 20 },
  modalGlobeWrap: { width: '100%', alignItems: 'center', marginBottom: 20, gap: 8, paddingTop: 4 },
  modalGlobe: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#FDEBD8',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  fieldLabel: { marginTop: 10, marginBottom: 6, width: '100%' },
  fieldInputFlex: { flex: 1, width: undefined, minWidth: 0 },
  fieldInput: {
    width: '100%',
    height: 44,
    borderWidth: 1,
    borderColor: LocationColors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: LocationColors.text,
    backgroundColor: LocationColors.cardBg,
  },
  fieldInputReadOnly: { backgroundColor: LocationColors.inactiveBg, color: LocationColors.textMuted },
  fieldHint: { color: LocationColors.textMuted, fontSize: 12, marginBottom: 4, width: '100%' },
  codeRow: { flexDirection: 'row', gap: 10, width: '100%', alignItems: 'center' },
  flagPicker: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 12,
    borderWidth: 1, borderColor: LocationColors.border, borderRadius: 10, backgroundColor: LocationColors.cardBg,
  },
  statusCards: { gap: 10, marginTop: 4, width: '100%' },
  statusCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LocationColors.border,
    backgroundColor: LocationColors.cardBg,
  },
  statusCardOn: { borderColor: '#ef7b1a', backgroundColor: '#FFF8F0' },
  statusCardOff: { borderColor: LocationColors.inactiveBorder, backgroundColor: LocationColors.inactiveBg },
  statusCardText: { flex: 1, minWidth: 0 },
  statusCardHint: { color: LocationColors.textMuted, fontSize: 12 },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: LocationColors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOn: { borderColor: LocationColors.accentDark },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: LocationColors.accentDark },
  errorText: { color: LocationColors.inactiveText, marginTop: 10 },
  modalFooter: { flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' },
  modalFooterMobile: { marginTop: 0 },
  modalFooterWrap: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: LocationColors.borderLight,
    backgroundColor: LocationColors.cardBg,
    flexShrink: 0,
  },
  modalFooterWrapWeb: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  modalActionBtn: { flex: 1, minWidth: 0 },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LocationColors.border,
    backgroundColor: LocationColors.cardBg,
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    backgroundColor: LocationColors.accentStrong,
    shadowColor: LocationColors.accentStrong, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  confirmBox: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: LocationColors.cardBg,
    borderRadius: 14,
    padding: 22,
    alignItems: 'center',
    gap: 6,
  },
  confirmIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: LocationColors.inactiveBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  confirmTitle: { fontSize: 16 },
  confirmBody: { color: LocationColors.textMuted, textAlign: 'center', marginBottom: 14 },
  confirmActions: { flexDirection: 'row', gap: 12, width: '100%' },
  confirmDeleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#DC2626',
  },
});