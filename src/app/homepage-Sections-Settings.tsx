/**
 * homepageSectionsSettings.tsx
 *
 * Matches the Orders Management visual pattern: solid navy (#151D4F) header
 * card with an orange icon badge, an action button on the right, overlapping
 * white stat cards below the header, pill filters, a search bar, then the
 * section list itself.
 *
 * If you keep colors/tokens in a shared theme file, swap the local COLORS
 * object below for your existing import.
 */

import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
  DimensionValue,
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AdminLayout from '@/components/admin-layout';
import { getApiErrorMessage } from '@/lib/api/client';
import { sweetCrud, sweetError } from '@/lib/sweetAlert';
import {
  fetchHomepageSections,
  saveHomepageSections,
  SECTION_UI_TO_KEY,
  isSectionVisible,
} from '@/services/cmsApi';

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const COLORS = {
  navy: '#151D4F',
  orange: '#ef7b1a',
  orangePale: '#fdeee0',
  bluePale: '#e8ecfb',
  bg: '#F3F4F6',
  white: '#ffffff',
  textDark: '#151D4F',
  textMid: '#6b7280',
  textFaint: '#9aa3b2',
  greenPale: '#e4f6ea',
  green: '#1f9d55',
  redPale: '#fdeaea',
  red: '#c94b4b',
  border: '#e9ebf1',
};

// ---------------------------------------------------------------------------
// Data — mirrors the sections/state from the current admin page
// ---------------------------------------------------------------------------
interface SectionItem {
  id: string;
  label: string;
  caption: string;
  visible: boolean;
}

interface SectionGroup {
  id: string;
  title: string;
  icon: keyof typeof Feather.glyphMap;
  items: SectionItem[];
}

const INITIAL_GROUPS: SectionGroup[] = [
  {
    id: 'nav',
    title: 'Navigation Tabs',
    icon: 'menu',
    items: [
      {
        id: 'wmk-tabs',
        label: "Women's, Men's, Kids Wear (tabs)",
        caption: 'Top-level category tab switcher',
        visible: false,
      },
      {
        id: 'sfa-tabs',
        label: 'Sports Wear / Footwear / Accessories (tabs)',
        caption: 'Secondary category tab switcher',
        visible: false,
      },
    ],
  },
  {
    id: 'highlights',
    title: 'Product Highlights',
    icon: 'star',
    items: [
      {
        id: 'latest-products',
        label: 'Latest Products',
        caption: 'Newest items across the catalog',
        visible: true,
      },
      {
        id: 'featured-products',
        label: 'Featured Products',
        caption: 'Hand-picked, curated items',
        visible: false,
      },
      {
        id: 'mostly-viewed-ordered',
        label: 'Mostly Viewed & Mostly Ordered',
        caption: 'Popularity-driven product rail',
        visible: false,
      },
    ],
  },
  {
    id: 'collections',
    title: 'Collections',
    icon: 'grid',
    items: [
      { id: 'womens-collection', label: "Women's Wear Collection", caption: 'Collection grid', visible: false },
      { id: 'mens-collection', label: "Men's Wear Collection", caption: 'Collection grid', visible: false },
      { id: 'kids-collection', label: 'Kids Wear Collection', caption: 'Collection grid', visible: false },
      { id: 'footwear-collection', label: 'Footwear Collection', caption: 'Collection grid', visible: false },
      { id: 'sports-collection', label: 'Sports Wear Collection', caption: 'Collection grid', visible: false },
      { id: 'accessories-collection', label: 'Accessories Collection', caption: 'Collection grid', visible: false },
    ],
  },
];

function applySectionValues(
  groups: SectionGroup[],
  valuesByKey: Record<string, string>,
): SectionGroup[] {
  return groups.map((group) => ({
    ...group,
    items: group.items.map((item) => {
      const apiKey = SECTION_UI_TO_KEY[item.id];
      if (!apiKey) return item;
      return { ...item, visible: isSectionVisible(valuesByKey[apiKey]) };
    }),
  }));
}

function buildSectionPayload(groups: SectionGroup[]) {
  const items: { key: string; value: string }[] = [];
  for (const group of groups) {
    for (const item of group.items) {
      const apiKey = SECTION_UI_TO_KEY[item.id];
      if (!apiKey) continue;
      items.push({ key: apiKey, value: item.visible ? '1' : '0' });
    }
  }
  return items;
}

// ---------------------------------------------------------------------------
// Animated toggle switch
// ---------------------------------------------------------------------------
// Aliasing avoids a TS/RN JSX-namespace resolution quirk where
// `Animated.View` used directly in JSX can error with
// "refers to a value, but is being used as a type here."
const AnimatedView = Animated.View;

const ToggleSwitch = ({ value, onToggle }: { value: boolean; onToggle: () => void }) => {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  const handlePress = () => {
    Animated.timing(anim, {
      toValue: value ? 0 : 1,
      duration: 160,
      useNativeDriver: false,
    }).start();
    onToggle();
  };

  const trackColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.redPale, COLORS.greenPale],
  });
  const thumbColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.red, COLORS.green],
  });
  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 23],
  });

  return (
    <Pressable onPress={handlePress} hitSlop={10}>
      <AnimatedView style={[styles.track, { backgroundColor: trackColor }]}>
        <AnimatedView style={[styles.thumb, { backgroundColor: thumbColor, transform: [{ translateX }] }]}>
          <Feather name={value ? 'check' : 'eye-off'} size={10} color={COLORS.white} />
        </AnimatedView>
      </AnimatedView>
    </Pressable>
  );
};

// ---------------------------------------------------------------------------
// Small stat card
// ---------------------------------------------------------------------------
const StatCard = ({
  icon,
  iconColor,
  iconBg,
  value,
  label,
  isMobile,
}: {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  iconBg: string;
  value: number;
  label: string;
  isMobile?: boolean;
}) => (
  <View style={[styles.statCard, isMobile && { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4 }]}>
    {isMobile ? (
      <>
        <View style={[styles.statIconBox, { backgroundColor: iconBg, marginBottom: 6 }]}>
          <Feather name={icon} size={16} color={iconColor} />
        </View>
        <Text style={[styles.statValue, { fontSize: 15 }]}>{value}</Text>
        <Text style={[styles.statLabel, { marginTop: 4, textAlign: 'center' }]}>{label}</Text>
      </>
    ) : (
      <>
        <View style={styles.statCardTop}>
          <View style={[styles.statIconBox, { backgroundColor: iconBg }]}>
            <Feather name={icon} size={16} color={iconColor} />
          </View>
          <Text style={styles.statValue}>{value}</Text>
        </View>
        <Text style={styles.statLabel}>{label}</Text>
      </>
    )}
  </View>
);

// ---------------------------------------------------------------------------
// Success Modal
// ---------------------------------------------------------------------------
function SuccessModal({ visible, title, message, onClose }: { visible: boolean; title: string; message: string; onClose: () => void }) {
  const scale = useRef(new Animated.Value(0.85)).current;

  React.useEffect(() => {
    if (visible) {
      scale.setValue(0.85);
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 90 }).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.alertOverlay} onPress={onClose}>
        <AnimatedView style={[styles.alertCard, { transform: [{ scale }] }]}>
          <View style={styles.alertIconCircle}>
            <Feather name="check" size={24} color={COLORS.white} />
          </View>
          <Text style={styles.alertTitle}>{title}</Text>
          <Text style={styles.alertMessage}>{message}</Text>
          <Pressable style={styles.alertBtn} onPress={onClose}>
            <Text style={styles.alertBtnText}>OK</Text>
          </Pressable>
        </AnimatedView>
      </Pressable>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
export default function HomepageSectionsSettingsScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  const rowColumns = isDesktop || isTablet ? 2 : 1;

  const [groups, setGroups] = useState<SectionGroup[]>(INITIAL_GROUPS);
  const [savedGroups, setSavedGroups] = useState<SectionGroup[]>(INITIAL_GROUPS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [successAlert, setSuccessAlert] = useState<{ visible: boolean; title: string; message: string }>({ visible: false, title: '', message: '' });

  const isDirty = useMemo(() => JSON.stringify(groups) !== JSON.stringify(savedGroups), [groups, savedGroups]);

  const loadSections = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await fetchHomepageSections();
      const valuesByKey: Record<string, string> = {};
      for (const row of rows) {
        if (row.key) valuesByKey[row.key] = row.value;
      }
      const next = applySectionValues(INITIAL_GROUPS, valuesByKey);
      setGroups(next);
      setSavedGroups(next);
    } catch (err) {
      setLoadError(getApiErrorMessage(err, 'Failed to load homepage sections.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSections();
  }, [loadSections]);

  const totalCount = useMemo(() => groups.reduce((sum, g) => sum + g.items.length, 0), [groups]);
  const visibleCount = useMemo(
    () => groups.reduce((sum, g) => sum + g.items.filter((i) => i.visible).length, 0),
    [groups]
  );
  const hiddenCount = totalCount - visibleCount;

  const filteredGroups = useMemo(() => {
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter((i) => i.label.toLowerCase().includes(search.trim().toLowerCase())),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, search]);

  const handleToggle = (groupId: string, itemId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id !== groupId
          ? g
          : { ...g, items: g.items.map((i) => (i.id === itemId ? { ...i, visible: !i.visible } : i)) }
      )
    );
  };

  const handleSave = async () => {
    if (!isDirty || saving) return;
    setSaving(true);
    try {
      await saveHomepageSections(buildSectionPayload(groups));
      setSavedGroups(groups);

      void sweetCrud.saved('Homepage sections');
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Failed to save homepage sections.');
      void sweetError('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <View style={styles.screenWrap}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: isMobile ? 34 : 84 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header card */}
        <View style={[styles.headerCard, isMobile && styles.headerCardMobile]}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconBox}>
              <Feather name="layout" size={20} color={COLORS.white} />
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.headerTitle}>Homepage Sections</Text>
              <Text style={styles.headerSubtitle}>Manage visibility of homepage sections</Text>
            </View>
          </View>
        </View>

        {/* Overlapping stat cards — always a single row, no scrolling */}
        <View style={styles.statsRow}>
          <StatCard
            icon="grid"
            iconColor={COLORS.navy}
            iconBg={COLORS.bluePale}
            value={totalCount}
            label="Sections"
            isMobile={isMobile}
          />
          <StatCard
            icon="eye"
            iconColor={COLORS.green}
            iconBg={COLORS.greenPale}
            value={visibleCount}
            label="Visible"
            isMobile={isMobile}
          />
          <StatCard
            icon="eye-off"
            iconColor={COLORS.red}
            iconBg={COLORS.redPale}
            value={hiddenCount}
            label="Hidden"
            isMobile={isMobile}
          />
          <StatCard
            icon="layers"
            iconColor={COLORS.orange}
            iconBg={COLORS.orangePale}
            value={groups.length}
            label="Groups"
            isMobile={isMobile}
          />
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <View style={styles.searchBox}>
            <Feather name="search" size={16} color={COLORS.textFaint} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search sections…"
              placeholderTextColor={COLORS.textFaint}
              style={styles.searchInput}
            />
          </View>
        </View>

        {/* Groups */}
        <View style={styles.groupsWrap}>
          {loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={COLORS.orange} />
              <Text style={styles.emptyStateText}>Loading sections…</Text>
            </View>
          ) : loadError ? (
            <View style={styles.emptyState}>
              <Feather name="alert-circle" size={22} color={COLORS.red} />
              <Text style={styles.emptyStateText}>{loadError}</Text>
              <Pressable style={styles.alertBtn} onPress={loadSections}>
                <Text style={styles.alertBtnText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {filteredGroups.length === 0 && (
                <View style={styles.emptyState}>
                  <Feather name="inbox" size={22} color={COLORS.textFaint} />
                  <Text style={styles.emptyStateText}>No sections match your search.</Text>
                </View>
              )}
              {filteredGroups.map((group) => (
            <View key={group.id} style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <Feather name={group.icon} size={14} color={COLORS.navy} />
                <Text style={styles.groupTitle}>{group.title}</Text>
              </View>
              <View
                style={[
                  styles.itemsWrap,
                  rowColumns > 1 && { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
                ]}
              >
                {group.items.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.row,
                      rowColumns > 1 && { width: `${100 / rowColumns}%` as DimensionValue, paddingHorizontal: 6 },
                    ]}
                  >
                    <View style={[styles.rowInner, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
                      <View style={{ flex: isMobile ? undefined : 1, paddingRight: isMobile ? 0 : 12 }}>
                        <Text style={styles.rowLabel}>{item.label}</Text>
                        <Text style={styles.rowCaption}>{item.caption}</Text>
                      </View>
                      <View style={[styles.rowRight, isMobile && { marginTop: 14, justifyContent: 'space-between' }]}>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: item.visible ? COLORS.greenPale : COLORS.redPale },
                          ]}
                        >
                          <Text
                            style={[styles.statusBadgeText, { color: item.visible ? COLORS.green : COLORS.red }]}
                          >
                            {item.visible ? 'Visible' : 'Hidden'}
                          </Text>
                        </View>
                        <ToggleSwitch value={item.visible} onToggle={() => handleToggle(group.id, item.id)} />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
            </>
          )}
        </View>
      </ScrollView>

      {/* Floating Save button — reachable from anywhere on the page without
          taking up permanent screen space like a sticky bar would. */}
      <Pressable
        onPress={handleSave}
        disabled={!isDirty || saving}
        style={[styles.fab, (!isDirty || saving) && styles.fabDisabled]}
      >
        {saving ? (
          <ActivityIndicator size="small" color={(!isDirty || saving) ? COLORS.orange : COLORS.white} />
        ) : (
          <Feather name="save" size={22} color={(!isDirty || saving) ? COLORS.orange : COLORS.white} />
        )}
        {isDirty && !saving && <View style={styles.fabBadge} />}
      </Pressable>

      {Platform.OS !== 'web' && (
        <SuccessModal
          visible={successAlert.visible}
          title={successAlert.title}
          message={successAlert.message}
          onClose={() => setSuccessAlert(prev => ({ ...prev, visible: false }))}
        />
      )}
      </View>
    </AdminLayout>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  screenWrap: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    padding: 16,
  },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.orange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  fabDisabled: {
    backgroundColor: COLORS.orangePale,
    shadowOpacity: 0,
    elevation: 0,
  },
  alertOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.55)', padding: 24 },
  alertCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center', width: '100%', maxWidth: 300, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  alertIconCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  alertTitle: { fontSize: 18, fontWeight: '700', color: COLORS.navy, marginBottom: 8 },
  alertMessage: { fontSize: 14, color: COLORS.textMid, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  alertBtn: { alignSelf: 'stretch', backgroundColor: COLORS.orange, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  alertBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  fabBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.red,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  headerCard: {
    backgroundColor: COLORS.navy,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCardMobile: {
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexShrink: 1,
  },
  headerIconBox: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: COLORS.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 3,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    marginTop: -16,
    paddingHorizontal: 4,
  },
  statCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 9,
    margin: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  statCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statIconBox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  statLabel: {
    fontSize: 10.5,
    color: COLORS.textMid,
    marginTop: 6,
  },
  searchWrap: {
    marginTop: 20,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textDark,
  },
  groupsWrap: {
    marginTop: 18,
    gap: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 13,
    color: COLORS.textFaint,
  },
  groupCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  itemsWrap: {},
  row: {
    marginBottom: 8,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  rowCaption: {
    fontSize: 12,
    color: COLORS.textFaint,
    marginTop: 2,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusBadge: {
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  track: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
  },
  thumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});