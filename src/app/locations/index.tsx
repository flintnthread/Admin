import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
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

import AdminLayout from '@/components/admin-layout';
import { ThemedText } from '@/components/themed-text';
import { LocationColors } from '@/constants/locations-theme';

type DetailTab = 'overview' | 'states' | 'cities' | 'areas' | 'pincodes';
type RowStatus = 'Active' | 'Inactive';
type ViewMode = 'list' | 'grid';

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

const ROW_ICON_THEMES = [
  { iconBg: '#FFF7ED', iconColor: '#EA580C' },
  { iconBg: '#F3E8FF', iconColor: '#9333EA' },
  { iconBg: '#EFF6FF', iconColor: '#2563EB' },
  { iconBg: '#FEF9C3', iconColor: '#CA8A04' },
  { iconBg: '#DCFCE7', iconColor: '#16A34A' },
] as const;

const LIST_COLS: Record<DetailTab, { codeLabel?: string; countLabel?: string }> = {
  overview: { codeLabel: 'Code' },
  states: { countLabel: 'Cities' },
  cities: { codeLabel: 'Code', countLabel: 'Areas' },
  areas: { codeLabel: 'City', countLabel: 'Pins' },
  pincodes: {},
};

const COUNTRY = { name: 'India', flag: '🇮🇳', code: '+91', status: 'Active' as RowStatus };

const DETAIL_TABS: { key: DetailTab; label: string; count?: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'states', label: 'States', count: '36' },
  { key: 'cities', label: 'Cities', count: '532' },
  { key: 'areas', label: 'Areas', count: '1,055' },
  { key: 'pincodes', label: 'Pincodes', count: '19,000+' },
];

const TAB_META: Record<
  DetailTab,
  { title: string; singular: string; plural: string; total: number; nameCol: string }
> = {
  overview: { title: 'Countries Management', singular: 'Country', plural: 'countries', total: 195, nameCol: 'Country Name' },
  states: { title: 'States Management', singular: 'State', plural: 'states', total: 36, nameCol: 'State Name' },
  cities: { title: 'Cities Management', singular: 'City', plural: 'cities', total: 532, nameCol: 'City Name' },
  areas: { title: 'Areas Management', singular: 'Area', plural: 'areas', total: 1055, nameCol: 'Area Name' },
  pincodes: { title: 'Pincodes Management', singular: 'Pincode', plural: 'pincodes', total: 19000, nameCol: 'Pincode' },
};

const ROWS: Record<DetailTab, ListRow[]> = {
  overview: [
    { id: 1, name: 'India', flag: '🇮🇳', code: 'IN', status: 'Active' },
    { id: 2, name: 'United States', flag: '🇺🇸', code: 'US', status: 'Active' },
    { id: 3, name: 'United Kingdom', flag: '🇬🇧', code: 'GB', status: 'Active' },
    { id: 4, name: 'Canada', flag: '🇨🇦', code: 'CA', status: 'Inactive' },
    { id: 5, name: 'Australia', flag: '🇦🇺', code: 'AU', status: 'Active' },
  ],
  states: [
    { id: 1, name: 'Maharashtra', code: 'MH', count: 44, status: 'Active' },
    { id: 2, name: 'Karnataka', code: 'KA', count: 31, status: 'Active' },
    { id: 3, name: 'Gujarat', code: 'GJ', count: 29, status: 'Active' },
    { id: 4, name: 'Tamil Nadu', code: 'TN', count: 38, status: 'Active' },
    { id: 5, name: 'Uttar Pradesh', code: 'UP', count: 75, status: 'Active' },
  ],
  cities: [
    { id: 1, name: 'Mumbai', code: 'MH', count: 12, status: 'Active' },
    { id: 2, name: 'Bengaluru', code: 'KA', count: 8, status: 'Active' },
    { id: 3, name: 'Ahmedabad', code: 'GJ', count: 6, status: 'Active' },
    { id: 4, name: 'Chennai', code: 'TN', count: 9, status: 'Active' },
    { id: 5, name: 'Lucknow', code: 'UP', count: 7, status: 'Active' },
  ],
  areas: [
    { id: 1, name: 'Andheri', code: 'Mumbai', count: 4, status: 'Active' },
    { id: 2, name: 'Indiranagar', code: 'Bengaluru', count: 3, status: 'Active' },
    { id: 3, name: 'Navrangpura', code: 'Ahmedabad', count: 2, status: 'Active' },
    { id: 4, name: 'Guindy', code: 'Chennai', count: 5, status: 'Inactive' },
    { id: 5, name: 'Gomti Nagar', code: 'Lucknow', count: 3, status: 'Active' },
  ],
  pincodes: [
    { id: 1, name: '400001', status: 'Active' },
    { id: 2, name: '560001', status: 'Active' },
    { id: 3, name: '380001', status: 'Active' },
    { id: 4, name: '600001', status: 'Inactive' },
    { id: 5, name: '226001', status: 'Active' },
  ],
};

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
}: {
  icon: { ios: string; android: MaterialIconName; web: MaterialIconName };
  color?: string;
  danger?: boolean;
  mobile?: boolean;
}) {
  return (
    <Pressable style={[styles.actionBtn, mobile && styles.actionBtnMobile, danger && styles.actionBtnDanger]}>
      <Icon name={icon} size={mobile ? 12 : 14} color={danger ? LocationColors.inactiveText : color} />
    </Pressable>
  );
}

function RowActions({ compact, mobile }: { compact?: boolean; mobile?: boolean }) {
  return (
    <View style={[styles.actions, compact && styles.actionsCompact, mobile && styles.actionsMobile]}>
      <ActionBtn
        mobile={mobile}
        icon={{ ios: 'eye', android: 'visibility', web: 'visibility' }}
        color={LocationColors.accentDark}
      />
      <ActionBtn
        mobile={mobile}
        icon={{ ios: 'square.and.pencil', android: 'edit', web: 'edit' }}
        color={LocationColors.infoText}
      />
      <ActionBtn mobile={mobile} icon={{ ios: 'trash', android: 'delete', web: 'delete' }} danger />
      <ActionBtn mobile={mobile} icon={{ ios: 'ellipsis', android: 'more-vert', web: 'more-vert' }} />
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
    180
  );
}

function MobileListTable({
  rows,
  tab,
  nameCol,
}: {
  rows: ListRow[];
  tab: DetailTab;
  nameCol: string;
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
                <RowActions />
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
}: {
  rows: ListRow[];
  tab: DetailTab;
  nameCol: string;
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
          style={({ hovered }) => [
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
            <RowActions />
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function GridViewCards({ rows, columns }: { rows: ListRow[]; columns: number }) {
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
        <View key={row.id} style={[styles.gridCard, { width: itemWidth }]}>
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
            <RowActions compact />
          </View>
        </View>
      ))}
    </View>
  );
}

function AddModal({
  visible,
  onClose,
  tab,
  isMobile,
}: {
  visible: boolean;
  onClose: () => void;
  tab: DetailTab;
  isMobile: boolean;
}) {
  const meta = TAB_META[tab];
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [status, setStatus] = useState<RowStatus>('Active');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const showCodeField = tab === 'overview';

  useEffect(() => {
    if (visible) {
      setStatus('Active');
      setName('');
      setCode('');
    }
  }, [visible, tab]);

  const footer = (
    <View style={[styles.modalFooter, isMobile && styles.modalFooterMobile]}>
      <Pressable style={[styles.cancelBtn, isMobile && styles.modalActionBtn]} onPress={onClose}>
        <Icon name={{ ios: 'xmark', android: 'close', web: 'close' }} size={14} />
        <ThemedText type="smallBold">Cancel</ThemedText>
      </Pressable>
      <Pressable style={[styles.saveBtn, isMobile && styles.modalActionBtn]} onPress={onClose}>
        <Icon name={{ ios: 'square.and.arrow.down', android: 'save', web: 'save' }} size={14} color="#fff" />
        <ThemedText type="smallBold" style={{ color: '#fff' }} numberOfLines={1}>
          Save {meta.singular}
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
                Add New {meta.singular}
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
                    Add New {meta.singular}
                  </ThemedText>
                  <ThemedText type="small" style={styles.mobileModalSubtitle}>
                    Enter the details to add a new {meta.singular.toLowerCase()}.
                  </ThemedText>
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
                    Add New {meta.singular}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: LocationColors.textMuted, textAlign: 'center' }}>
                    Enter the details to add a new {meta.singular.toLowerCase()}.
                  </ThemedText>
                </View>
              )}

              <ThemedText type="smallBold" style={styles.fieldLabel}>
                {meta.singular} Name{' '}
                <ThemedText style={{ color: LocationColors.inactiveText }}>*</ThemedText>
              </ThemedText>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={`Enter ${meta.singular.toLowerCase()} name`}
                placeholderTextColor={LocationColors.textLight}
                style={styles.fieldInput}
              />
              <ThemedText type="small" style={styles.fieldHint}>
                Enter the official {meta.singular.toLowerCase()} name.
              </ThemedText>

              {showCodeField && (
                <>
                  <ThemedText type="smallBold" style={styles.fieldLabel}>
                    {tab === 'overview' ? 'Country Code (ISO)' : `${meta.singular} Code`}{' '}
                    <ThemedText style={{ color: LocationColors.inactiveText }}>*</ThemedText>
                  </ThemedText>
                  <View style={styles.codeRow}>
                    {tab === 'overview' && (
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
                      placeholder={tab === 'overview' ? 'US' : 'Enter code'}
                      placeholderTextColor={LocationColors.textLight}
                      style={[styles.fieldInput, styles.fieldInputFlex]}
                    />
                  </View>
                  <ThemedText type="small" style={styles.fieldHint}>
                    {tab === 'overview'
                      ? 'Two letter ISO country code (e.g., US, GB, IN)'
                      : `Short code for this ${meta.singular.toLowerCase()}.`}
                  </ThemedText>
                </>
              )}

              <ThemedText type="smallBold" style={styles.fieldLabel}>
                Status <ThemedText style={{ color: LocationColors.inactiveText }}>*</ThemedText>
              </ThemedText>
              <View style={styles.statusCards}>
                {(['Active', 'Inactive'] as RowStatus[]).map((opt) => {
                  const selected = status === opt;
                  const isActive = opt === 'Active';
                  return (
                    <Pressable
                      key={opt}
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

export default function LocationsScreen() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isMobile = !isWeb;

  const [detailTab, setDetailTab] = useState<DetailTab>('states');
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [modalOpen, setModalOpen] = useState(false);

  const meta = TAB_META[detailTab];
  const rows = ROWS[detailTab];
  const gridColumns = isWeb ? (width < 960 ? 2 : 3) : 1;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q) || String(r.id).includes(q));
  }, [query, rows]);

  useEffect(() => setQuery(''), [detailTab]);

  return (
    <AdminLayout>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, isMobile && styles.contentMobile]}
        showsVerticalScrollIndicator={false}>

        <View style={styles.screenNav}>
          <ThemedText type="smallBold" style={styles.navActive}>Locations</ThemedText>
          <ThemedText type="small" style={styles.navSep}>|</ThemedText>
          <Link href="/faq-categories" asChild>
            <Pressable>
              <ThemedText type="small" style={styles.navLink}>FAQ Categories</ThemedText>
            </Pressable>
          </Link>
        </View>

        <View style={[styles.entityCard, isMobile && styles.entityCardMobile]}>
          <View style={[styles.entityLeft, isMobile && styles.entityLeftMobile]}>
            <ThemedText style={{ fontSize: isMobile ? 32 : 36 }}>{COUNTRY.flag}</ThemedText>
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

        {/* ── FIRST IMAGE: table section below tabs ── */}
        <View style={[styles.listHeader, isMobile && styles.listHeaderMobile]}>
          <ThemedText type="subtitle" style={[styles.listTitle, isMobile && styles.listTitleMobile]}>
            {meta.title}
          </ThemedText>
          <Pressable style={[styles.addBtn, isMobile && styles.addBtnMobile]} onPress={() => setModalOpen(true)}>
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
            <ListViewTable rows={filtered} tab={detailTab} nameCol={meta.nameCol} />
          ) : (
            <MobileListTable rows={filtered} tab={detailTab} nameCol={meta.nameCol} />
          )
        ) : (
          <GridViewCards rows={filtered} columns={gridColumns} />
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
      </ScrollView>

      <AddModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        tab={detailTab}
        isMobile={isMobile}
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LocationColors.border,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    flexWrap: 'wrap',
    gap: 12,
  },
  entityCardMobile: { padding: 16, flexDirection: 'column', alignItems: 'stretch' },
  entityLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  entityLeftMobile: { flex: 0 },
  entityTextMobile: { flex: 1 },
  entityTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  entityActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  entityActionsMobile: { width: '100%', marginTop: 4 },
  entityBtnMobile: { flex: 1, justifyContent: 'center' },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: '#FDBA74', backgroundColor: '#FFF7ED',
  },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: LocationColors.inactiveBorder, backgroundColor: LocationColors.inactiveBg,
  },
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
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  listHeaderMobile: { flexDirection: 'column', alignItems: 'flex-start', gap: 12 },
  listTitle: { fontSize: 26, lineHeight: 32, color: LocationColors.text },
  listTitleMobile: { fontSize: 22, lineHeight: 28 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#ef7b1a', paddingHorizontal: 10, paddingVertical: 10, borderRadius: 8,
  },
  addBtnMobile: {
    width: '70%',
    justifyContent: 'center',
    backgroundColor: '#ef7b1a',
    paddingVertical: 12,
    marginLeft: 40,
    
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
    backgroundColor: LocationColors.cardBg, borderRadius: 12,
    borderWidth: 1, borderColor: LocationColors.border, overflow: 'hidden', marginBottom: 16,
  },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#69798c',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: LocationColors.border,
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
  webColActions: { width: 180, flexShrink: 0 },
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
  actions: { flexDirection: 'row', gap: 6, paddingLeft: 8, width: 180 },
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LocationColors.border,
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LocationColors.border,
    padding: 16,
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LocationColors.border,
    overflow: 'hidden',
    marginBottom: 16,
  },
  mobileTableInner: {
    width: '100%',
  },
  mobileTableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:'#69798c',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: LocationColors.border,
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
  mobileColActions: { width: 180, flexShrink: 0 },
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
    backgroundColor:'#79411c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
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
    height: 46,
    borderRadius: 10,
    backgroundColor: '#79411c',
  },
});
