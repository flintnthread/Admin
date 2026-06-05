import MaterialIcons from '@expo/vector-icons/MaterialIcons';
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
import { SafeAreaView } from 'react-native-safe-area-context';

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
    { id: 1, name: 'India', flag: '🇮🇳', status: 'Active' },
    { id: 2, name: 'United States', flag: '🇺🇸', status: 'Active' },
    { id: 3, name: 'United Kingdom', flag: '🇬🇧', status: 'Active' },
    { id: 4, name: 'Canada', flag: '🇨🇦', status: 'Inactive' },
    { id: 5, name: 'Australia', flag: '🇦🇺', status: 'Active' },
  ],
  states: [
    { id: 1, name: 'Maharashtra', status: 'Active' },
    { id: 2, name: 'Karnataka', status: 'Active' },
    { id: 3, name: 'Gujarat', status: 'Active' },
    { id: 4, name: 'Rajasthan', status: 'Inactive' },
    { id: 5, name: 'Tamil Nadu', status: 'Active' },
  ],
  cities: [
    { id: 1, name: 'Mumbai', status: 'Active' },
    { id: 2, name: 'Bengaluru', status: 'Active' },
    { id: 3, name: 'Ahmedabad', status: 'Active' },
    { id: 4, name: 'Jaipur', status: 'Inactive' },
    { id: 5, name: 'Chennai', status: 'Active' },
  ],
  areas: [
    { id: 1, name: 'Andheri', status: 'Active' },
    { id: 2, name: 'Indiranagar', status: 'Active' },
    { id: 3, name: 'Navrangpura', status: 'Active' },
    { id: 4, name: 'Malviya Nagar', status: 'Inactive' },
    { id: 5, name: 'Guindy', status: 'Active' },
  ],
  pincodes: [
    { id: 1, name: '400001', status: 'Active' },
    { id: 2, name: '560001', status: 'Active' },
    { id: 3, name: '380001', status: 'Active' },
    { id: 4, name: '302001', status: 'Inactive' },
    { id: 5, name: '600001', status: 'Active' },
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
}: {
  icon: { ios: string; android: MaterialIconName; web: MaterialIconName };
  color?: string;
  danger?: boolean;
}) {
  return (
    <Pressable style={[styles.actionBtn, danger && styles.actionBtnDanger]}>
      <Icon name={icon} size={14} color={danger ? LocationColors.inactiveText : color} />
    </Pressable>
  );
}

function RowActions({ compact }: { compact?: boolean }) {
  return (
    <View style={[styles.actions, compact && styles.actionsCompact]}>
      <ActionBtn icon={{ ios: 'eye', android: 'visibility', web: 'visibility' }} color={LocationColors.accentDark} />
      <ActionBtn icon={{ ios: 'square.and.pencil', android: 'edit', web: 'edit' }} color={LocationColors.infoText} />
      <ActionBtn icon={{ ios: 'trash', android: 'delete', web: 'delete' }} danger />
      <ActionBtn icon={{ ios: 'ellipsis', android: 'more-vert', web: 'more-vert' }} />
    </View>
  );
}

function MobileListCards({ rows }: { rows: ListRow[] }) {
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
    <View style={styles.mobileList}>
      {rows.map((row) => (
        <View key={row.id} style={styles.mobileCard}>
          <View style={styles.mobileCardMain}>
            <View style={styles.mobileCardLeft}>
              {row.flag ? (
                <ThemedText style={styles.mobileFlag}>{row.flag}</ThemedText>
              ) : (
                <View style={styles.mobileAvatar}>
                  <ThemedText type="smallBold" style={{ color: LocationColors.accentStrong }}>
                    {row.name.charAt(0)}
                  </ThemedText>
                </View>
              )}
              <View style={styles.mobileCardInfo}>
                <ThemedText type="smallBold" style={styles.mobileCardName} numberOfLines={1}>
                  {row.name}
                </ThemedText>
                <ThemedText type="small" style={{ color: LocationColors.textMuted }}>
                  ID: {row.id}
                </ThemedText>
              </View>
            </View>
            <StatusBadge status={row.status} />
          </View>
          <View style={styles.mobileCardActions}>
            <RowActions compact />
          </View>
        </View>
      ))}
    </View>
  );
}

function ListViewTable({
  rows,
  nameCol,
}: {
  rows: ListRow[];
  nameCol: string;
}) {
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
        <ThemedText type="smallBold" style={[styles.th, { width: 50 }]}>
          ID
        </ThemedText>
        <ThemedText type="smallBold" style={[styles.th, { flex: 1 }]}>
          {nameCol}
        </ThemedText>
        <ThemedText type="smallBold" style={[styles.th, { width: 110 }]}>
          Status
        </ThemedText>
        <ThemedText type="smallBold" style={[styles.th, { width: 180 }]}>
          Action
        </ThemedText>
      </View>

      {rows.map((row, i) => (
        <View key={row.id} style={[styles.tableRow, i > 0 && styles.tableRowBorder]}>
          <ThemedText type="smallBold" style={{ width: 50, paddingLeft: 16 }}>
            {row.id}
          </ThemedText>
          <View style={[styles.nameCell, { flex: 1 }]}>
            {row.flag && <ThemedText style={{ fontSize: 20 }}>{row.flag}</ThemedText>}
            <ThemedText type="smallBold">{row.name}</ThemedText>
          </View>
          <View style={{ width: 110, paddingLeft: 8 }}>
            <StatusBadge status={row.status} />
          </View>
          <RowActions />
        </View>
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
  const [status, setStatus] = useState<RowStatus>('Active');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    if (visible) {
      setStatus('Active');
      setName('');
      setCode('');
    }
  }, [visible, tab]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isMobile ? 'slide' : 'fade'}
      onRequestClose={onClose}>
      <Pressable
        style={[styles.modalOverlay, isMobile && styles.modalOverlayMobile]}
        onPress={onClose}>
        <View
          style={isMobile ? styles.modalWrapMobile : styles.modalWrapWeb}
          onStartShouldSetResponder={() => true}>
          <View style={[styles.modalBox, isMobile && styles.modalBoxMobile]}>
          {isMobile && <View style={styles.sheetHandle} />}
          <View style={[styles.modalTopBar, isMobile && styles.modalTopBarMobile]}>
            <ThemedText type="smallBold" style={{ color: '#fff', fontSize: 16 }}>
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
            <View style={styles.modalGlobeWrap}>
              <View style={styles.modalGlobe}>
                <Icon name={{ ios: 'globe', android: 'public', web: 'public' }} size={28} color={LocationColors.accentStrong} />
              </View>
              <ThemedText type="smallBold" style={{ fontSize: 20 }}>
                Add New {meta.singular}
              </ThemedText>
              <ThemedText type="small" style={{ color: LocationColors.textMuted, textAlign: 'center' }}>
                Enter the details to add a new {meta.singular.toLowerCase()}.
              </ThemedText>
            </View>

            <ThemedText type="smallBold" style={styles.fieldLabel}>
              {meta.singular} Name <ThemedText style={{ color: LocationColors.inactiveText }}>*</ThemedText>
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

            {(tab === 'overview' || tab === 'states') && (
              <>
                <ThemedText type="smallBold" style={styles.fieldLabel}>
                  {tab === 'overview' ? 'Country Code (ISO)' : `${meta.singular} Code`}{' '}
                  <ThemedText style={{ color: LocationColors.inactiveText }}>*</ThemedText>
                </ThemedText>
                <View style={styles.codeRow}>
                  {tab === 'overview' && (
                    <Pressable style={styles.flagPicker}>
                      <ThemedText style={{ fontSize: 18 }}>🇺🇸</ThemedText>
                      <Icon name={{ ios: 'chevron.down', android: 'expand-more', web: 'expand-more' }} size={12} />
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
                    <View style={{ flex: 1 }}>
                      <ThemedText type="smallBold">{opt}</ThemedText>
                      <ThemedText type="small" style={{ color: LocationColors.textMuted, fontSize: 12 }}>
                        {meta.singular} will be {opt.toLowerCase()}
                      </ThemedText>
                    </View>
                    {selected && isActive && (
                      <Icon
                        name={{ ios: 'checkmark.circle.fill', android: 'check-circle', web: 'check-circle' }}
                        size={20}
                        color={LocationColors.accentDark}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>

            <View style={[styles.modalFooter, isMobile && styles.modalFooterMobile]}>
              <Pressable style={styles.cancelBtn} onPress={onClose}>
                <Icon name={{ ios: 'xmark', android: 'close', web: 'close' }} size={14} />
                <ThemedText type="smallBold">Cancel</ThemedText>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={onClose}>
                <Icon name={{ ios: 'square.and.arrow.down', android: 'save', web: 'save' }} size={14} color="#fff" />
                <ThemedText type="smallBold" style={{ color: '#fff' }}>
                  Save {meta.singular}
                </ThemedText>
              </Pressable>
            </View>
          </ScrollView>
          </View>
        </View>
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
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, isMobile && styles.contentMobile]}
        showsVerticalScrollIndicator={false}>
        <ThemedText type="small" style={[styles.breadcrumbs, isMobile && styles.breadcrumbsMobile]} numberOfLines={1}>
          Dashboard {'>'} Locations {'>'} Countries {'>'} {COUNTRY.name}
        </ThemedText>

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
          <View style={[styles.entityActions, isMobile && styles.entityActionsMobile]}>
            <Pressable style={[styles.editBtn, isMobile && styles.entityBtnMobile]}>
              <Icon name={{ ios: 'square.and.pencil', android: 'edit', web: 'edit' }} size={14} color={LocationColors.accentStrong} />
              <ThemedText type="smallBold" style={{ color: LocationColors.accentStrong }}>
                {isMobile ? 'Edit' : 'Edit Country'}
              </ThemedText>
            </Pressable>
            <Pressable style={[styles.deleteBtn, isMobile && styles.entityBtnMobile]}>
              <Icon name={{ ios: 'trash', android: 'delete', web: 'delete' }} size={14} color={LocationColors.inactiveText} />
              <ThemedText type="smallBold" style={{ color: LocationColors.inactiveText }}>
                Delete
              </ThemedText>
            </Pressable>
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
            <ListViewTable rows={filtered} nameCol={meta.nameCol} />
          ) : (
            <MobileListCards rows={filtered} />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: LocationColors.pageBg },
  screen: { flex: 1 },
  content: { padding: 24, paddingBottom: 40, maxWidth: 1200, alignSelf: 'center', width: '100%' },
  contentMobile: { padding: 16, paddingBottom: 28 },
  breadcrumbs: { color: LocationColors.textMuted, fontSize: 13, marginBottom: 16 },
  breadcrumbsMobile: { fontSize: 12, marginBottom: 12 },
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
    backgroundColor: LocationColors.accentBtn, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8,
  },
  addBtnMobile: {
    width: '100%',
    justifyContent: 'center',
    backgroundColor: '#FDBA74',
    paddingVertical: 12,
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
    flexDirection: 'row', backgroundColor: LocationColors.tableHeader,
    paddingVertical: 12, paddingRight: 16, borderBottomWidth: 1, borderBottomColor: LocationColors.border,
  },
  th: { color: LocationColors.textMuted, fontSize: 13, paddingLeft: 16 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  tableRowBorder: { borderTopWidth: 1, borderTopColor: LocationColors.borderLight },
  nameCell: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 16 },
  actions: { flexDirection: 'row', gap: 6, paddingLeft: 8, width: 180 },
  actionsCompact: { paddingLeft: 0, width: 'auto', justifyContent: 'center' },
  actionBtn: {
    width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: LocationColors.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: LocationColors.cardBg,
  },
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
  mobileList: { gap: 12, marginBottom: 16 },
  mobileCard: {
    backgroundColor: LocationColors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LocationColors.border,
    padding: 14,
    gap: 12,
  },
  mobileCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  mobileCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  mobileCardInfo: { flex: 1 },
  mobileCardName: { fontSize: 16, color: LocationColors.text },
  mobileFlag: { fontSize: 28 },
  mobileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileCardActions: {
    borderTopWidth: 1,
    borderTopColor: LocationColors.borderLight,
    paddingTop: 10,
    alignItems: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
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
  },
  modalBox: {
    width: '100%',
    backgroundColor: LocationColors.cardBg,
    borderRadius: 14,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  modalBoxMobile: {
    width: '100%',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '92%',
  },
  modalScroll: { width: '100%' },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: LocationColors.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 2,
  },
  modalTopBar: {
    backgroundColor: LocationColors.modalHeader, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14,
  },
  modalTopBarMobile: {
    paddingTop: 10,
  },
  modalBody: { width: '100%', padding: 24, paddingBottom: 32 },
  modalBodyMobile: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 },
  modalGlobeWrap: { width: '100%', alignItems: 'center', marginBottom: 20, gap: 8 },
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
  statusCardOn: { borderColor: '#FDBA74', backgroundColor: '#FFF8F0' },
  statusCardOff: { borderColor: LocationColors.inactiveBorder },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: LocationColors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOn: { borderColor: LocationColors.accentDark },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: LocationColors.accentDark },
  modalFooter: { flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' },
  modalFooterMobile: { marginTop: 20 },
  cancelBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 46, borderRadius: 10, borderWidth: 1, borderColor: LocationColors.border, backgroundColor: LocationColors.cardBg,
  },
  saveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 46, borderRadius: 10, backgroundColor: LocationColors.modalHeader,
  },
});
