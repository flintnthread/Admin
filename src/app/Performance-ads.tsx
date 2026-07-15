import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal as RNModal,
  Platform,
  useWindowDimensions,
  Animated as RNAnimated,
  DimensionValue,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AdminLayout from '@/components/admin-layout';
import { getApiErrorMessage } from '@/lib/api/client';
import { sweetCrud, sweetError, sweetWarning } from '@/lib/sweetAlert';
import {
  createPerformanceAd,
  deletePerformanceAd,
  fetchPerformanceAds,
  formatAdsDate,
  toApiStatus,
  toUiStatus,
  updatePerformanceAd,
  type AdsApiRow,
} from '@/services/adsApi';

// NOTE: adjust the AdminLayout import path above to match your project structure
// (kept consistent with other screens e.g. homepageSectionsSettings.tsx, customerManagement.tsx)

// -----------------------------
// Design tokens (shared system)
// -----------------------------
const COLORS = {
  navy: "#151D4F",
  navySoft: "#152238",
  orange: "#F97316",
  orangeDark: "#EA580C",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  textPrimary: "#1E293B",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
  emerald: "#059669",
  emeraldBg: "#ECFDF5",
  rose: "#E11D48",
  roseBg: "#FFF1F2",
  orangeSoft: "#FFF7ED",
  white: "#FFFFFF",
};

const Animated = RNAnimated; // aliased per project convention

// -----------------------------
// Types
// -----------------------------
type AdType =
  | 'Search Sponsored Listings'
  | 'YouTube Video Spotlight'
  | 'Instagram Posts'
  | 'Instagram Reels'
  | 'Instagram Stories'
  | 'Facebook Posts'
  | 'Facebook Stories';

type PricingModel =
  | 'Cost Per Click (CPC)'
  | 'Cost Per Mille (CPM)'
  | 'Daily Rate'
  | 'Monthly Rate'
  | 'Per Post'
  | 'Per Reel'
  | 'Per Story';

type AdStatus = 'Active' | 'Inactive';

interface PerformanceAd {
  id: number;
  name: string;
  type: AdType;
  pricingModel: PricingModel;
  lowPrice: number;
  highPrice: number;
  description: string;
  status: AdStatus;
  createdAt: string;
}

const AD_TYPES: AdType[] = [
  'Search Sponsored Listings',
  'YouTube Video Spotlight',
  'Instagram Posts',
  'Instagram Reels',
  'Instagram Stories',
  'Facebook Posts',
  'Facebook Stories',
];

const PRICING_MODELS: PricingModel[] = [
  'Cost Per Click (CPC)',
  'Cost Per Mille (CPM)',
  'Daily Rate',
  'Monthly Rate',
  'Per Post',
  'Per Reel',
  'Per Story',
];

const STATUSES: AdStatus[] = ['Active', 'Inactive'];

function mapPerformanceAdFromApi(row: AdsApiRow): PerformanceAd {
  const low = row.lowPrice ?? row.low_price;
  const high = row.highPrice ?? row.high_price;
  return {
    id: Number(row.id),
    name: String(row.name ?? ''),
    type: String(row.type ?? '') as AdType,
    pricingModel: String(row.pricingModel ?? row.pricing_model ?? '') as PricingModel,
    lowPrice: Number(low ?? 0),
    highPrice: Number(high ?? 0),
    description: String(row.description ?? ''),
    status: toUiStatus(row.status),
    createdAt: formatAdsDate(row.createdAt),
  };
}

// -----------------------------
// Responsive breakpoints
// -----------------------------
function useBreakpoint() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isLaptop = width >= 1024;
  const isDesktop = width >= 1440;
  return {
    width,
    isTablet,
    isLaptop,
    isDesktop,
    columns: isDesktop ? 3 : isLaptop ? 3 : isTablet ? 2 : 1,
  };
}

// removed notify

// -----------------------------
// Portal Dropdown (Modal + measureInWindow pattern)
// -----------------------------
interface PortalDropdownProps {
  label: string;
  required?: boolean;
  value: string;
  placeholder: string;
  options: string[];
  onSelect: (value: string) => void;
  width?: DimensionValue;
}

function PortalDropdown({ label, required, value, placeholder, options, onSelect, width }: PortalDropdownProps) {
  const anchorRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0, w: 0, h: 0 });

  const openDropdown = () => {
    if (anchorRef.current) {
      anchorRef.current.measureInWindow((x, y, w, h) => {
        setCoords({ x, y, w, h });
        setOpen(true);
      });
    }
  };

  return (
    <View style={[styles.fieldGroup, width ? { width } : styles.fieldFlex]}>
      <Text style={styles.fieldLabel}>
        {label} {required && <Text style={styles.requiredMark}>*</Text>}
      </Text>
      <Pressable ref={anchorRef} style={styles.dropdownTrigger} onPress={openDropdown}>
        <Text style={value ? styles.dropdownValueText : styles.dropdownPlaceholderText} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Feather name="chevron-down" size={16} color={COLORS.textSecondary} />
      </Pressable>

      <RNModal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.dropdownBackdrop} onPress={() => setOpen(false)}>
          <View
            style={[
              styles.dropdownList,
              {
                position: 'absolute',
                top: coords.y + coords.h + 4,
                left: coords.x,
                width: Math.max(coords.w, 220),
              },
            ]}
          >
            <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {options.map((opt) => (
                <Pressable
                  key={opt}
                  style={({ pressed }) => [
                    styles.dropdownOption,
                    opt === value && styles.dropdownOptionActive,
                    pressed && styles.dropdownOptionPressed,
                  ]}
                  onPress={() => {
                    onSelect(opt);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.dropdownOptionText, opt === value && styles.dropdownOptionTextActive]}>
                    {opt}
                  </Text>
                  {opt === value && <Feather name="check" size={14} color={COLORS.orange} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </RNModal>
    </View>
  );
}

// -----------------------------
// Status pill
// -----------------------------
function StatusPill({ status }: { status: AdStatus }) {
  const map: Record<AdStatus, { bg: string; fg: string }> = {
    Active: { bg: COLORS.emeraldBg, fg: COLORS.emerald },
    Inactive: { bg: COLORS.roseBg, fg: COLORS.rose },
  };
  const c = map[status];
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <View style={[styles.pillDot, { backgroundColor: c.fg }]} />
      <Text style={[styles.pillText, { color: c.fg }]}>{status}</Text>
    </View>
  );
}

// -----------------------------
// Channel summary card (info strip - restyled, not a direct copy)
// -----------------------------
interface ChannelCard {
  icon: keyof typeof Feather.glyphMap;
  accent: string;
  title: string;
  text1: string;
  text2: string;
}

const CHANNEL_CARDS: ChannelCard[] = [
  {
    icon: 'search',
    accent: '#0E7490', // Cyan/blue
    title: 'Search Sponsored Listings',
    text1: '₹20–50 CPC (low) | ₹50–100 CPC (high)',
    text2: 'Pay per click advertising',
  },
  {
    icon: 'video',
    accent: '#22C55E', // Green
    title: 'YouTube / Video Spotlight',
    text1: '₹15k–30k/day | ₹3–6 Lakh/month',
    text2: 'Video advertising platform',
  },
  {
    icon: 'smartphone',
    accent: '#F59E0B', // Orange
    title: 'Social Media Ads',
    text1: 'Posts: ₹7k–15k | Reels: ₹10k–25k | Stories: ₹3k–8k',
    text2: 'Instagram & Facebook advertising',
  },
];

// -----------------------------
// Main Screen
// -----------------------------
export default function PerformanceAdsScreen() {
  const { isTablet, isLaptop, isDesktop, columns, width } = useBreakpoint();
  const isWeb = Platform.OS === 'web';

  const [ads, setAds] = useState<PerformanceAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const loadAds = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await fetchPerformanceAds();
      setAds(rows.map(mapPerformanceAdFromApi));
    } catch (err) {
      setLoadError(getApiErrorMessage(err, 'Failed to load performance ads.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAds();
  }, [loadAds]);

  const [form, setForm] = useState({
    name: '',
    type: '' as AdType | '',
    pricingModel: '' as PricingModel | '',
    lowPrice: '',
    highPrice: '',
    description: '',
    status: 'Active' as AdStatus,
  });

  const resetForm = () =>
    setForm({ name: '', type: '', pricingModel: '', lowPrice: '', highPrice: '', description: '', status: 'Active' });

  const openCreate = () => {
    resetForm();
    setEditingId(null);
    setModalVisible(true);
  };

  const openEdit = (ad: PerformanceAd) => {
    setForm({
      name: ad.name,
      type: ad.type,
      pricingModel: ad.pricingModel,
      lowPrice: String(ad.lowPrice),
      highPrice: String(ad.highPrice),
      description: ad.description,
      status: ad.status,
    });
    setEditingId(ad.id);
    setModalVisible(true);
  };

  const handleDelete = async (ad: PerformanceAd) => {
    if (!(await sweetCrud.confirmDelete('Performance ad', ad.name))) return;
    setSaving(true);
    try {
      await deletePerformanceAd(ad.id);
      await loadAds();
      void sweetCrud.deleted('Performance ad');
    } catch (err) {
      void sweetError('Error', getApiErrorMessage(err, 'Could not delete performance ad.'));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.type || !form.pricingModel || !form.lowPrice || !form.highPrice) {
      void sweetWarning('Missing information', 'Please fill in all required fields.');
      return;
    }
    const low = Number(form.lowPrice);
    const high = Number(form.highPrice);
    if (Number.isNaN(low) || Number.isNaN(high) || high < low) {
      void sweetWarning('Invalid price range', 'High price must be greater than or equal to low price.');
      return;
    }

    const body = {
      name: form.name.trim(),
      type: form.type,
      pricingModel: form.pricingModel,
      lowPrice: low,
      highPrice: high,
      description: form.description,
      status: toApiStatus(form.status),
    };

    if (editingId) {
      if (!(await sweetCrud.confirmUpdate('Performance ad', body.name))) return;
    } else {
      if (!(await sweetCrud.confirmAdd('Performance ad', body.name))) return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updatePerformanceAd(editingId, body);
        void sweetCrud.updated('Performance ad');
      } else {
        await createPerformanceAd(body);
        void sweetCrud.added('Performance ad');
      }
      setModalVisible(false);
      resetForm();
      setEditingId(null);
      await loadAds();
    } catch (err) {
      void sweetError('Error', getApiErrorMessage(err, editingId ? 'Could not update performance ad.' : 'Could not create performance ad.'));
    } finally {
      setSaving(false);
    }
  };

  const cardWidth: DimensionValue = useMemo(() => {
    if (columns === 1) return '100%';
    if (columns === 2) return '48%';
    return '31.5%';
  }, [columns]);

  return (
    <AdminLayout>
      <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.hero, !isTablet && styles.heroMobile]}>
          <View style={styles.heroTopRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: !isTablet ? 8 : 12, flex: 1, marginRight: 8 }}>
              <View style={styles.heroIconBadge}>
                <Feather name="trending-up" size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>Performance Ads</Text>
                <Text style={styles.heroSubtitle} numberOfLines={2}>Configure pay-per-click, video and social placements</Text>
              </View>
            </View>
            {isTablet && (
              <Pressable style={styles.primaryButton} onPress={openCreate}>
                <Feather name="plus" size={16} color={COLORS.white} />
                <Text style={styles.primaryButtonText}>New Ad</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Channel summary strip - overlapping the header edge on wider screens */}
        <View style={[styles.channelStrip, isTablet && styles.channelStripOverlap]}>
          {CHANNEL_CARDS.map((c) => (
            <View key={c.title} style={[styles.channelCard, { width: isTablet ? cardWidth : '100%' }]}>
              <View style={[styles.channelIconWrap, { backgroundColor: c.accent }]}>
                <Feather name={c.icon} size={20} color="#FFF" />
              </View>
              <Text style={styles.channelTitle}>{c.title}</Text>
              <Text style={styles.channelText1}>{c.text1}</Text>
              <Text style={styles.channelText2}>{c.text2}</Text>
            </View>
          ))}
        </View>

        {/* Table section */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderIcon}>
            <Feather name="list" size={14} color={COLORS.white} />
          </View>
          <Text style={styles.sectionHeaderText}>All Performance Ads</Text>
          <View style={styles.sectionHeaderCount}>
            <Text style={styles.sectionHeaderCountText}>{ads.length}</Text>
          </View>
        </View>

        {loadError ? (
          <Text style={{ color: COLORS.rose, marginBottom: 12 }}>{loadError}</Text>
        ) : null}

        {loading ? (
          <View style={{ paddingVertical: 48, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.orange} />
          </View>
        ) : isLaptop ? (
          // ---- Desktop / laptop table ----
          <View style={styles.tableWrap}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, { flex: 0.4 }]}>ID</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.6 }]}>Name</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.4 }]}>Type</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Pricing</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Range</Text>
              <Text style={[styles.tableHeaderCell, { flex: 0.9 }]}>Status</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Created</Text>
              <Text style={[styles.tableHeaderCell, { flex: 0.9, textAlign: 'right' }]}>Action</Text>
            </View>
            {ads.map((ad, idx) => (
              <View key={ad.id} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                <Text style={[styles.tableCell, styles.tableCellMuted, { flex: 0.4 }]}>{ad.id}</Text>
                <View style={{ flex: 1.6 }}>
                  <Text style={styles.tableCellStrong}>{ad.name}</Text>
                  <Text style={styles.tableCellCaption} numberOfLines={1}>
                    {ad.description}
                  </Text>
                </View>
                <View style={{ flex: 1.4 }}>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText} numberOfLines={1}>
                      {ad.type}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.tableCell, { flex: 1.2 }]} numberOfLines={1}>
                  {ad.pricingModel}
                </Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>
                  ₹{ad.lowPrice.toLocaleString('en-IN')} - ₹{ad.highPrice.toLocaleString('en-IN')}
                </Text>
                <View style={{ flex: 0.9 }}>
                  <StatusPill status={ad.status} />
                </View>
                <Text style={[styles.tableCell, styles.tableCellMuted, { flex: 1 }]}>{ad.createdAt}</Text>
                <View style={[styles.actionCell, { flex: 0.9 }]}>
                  <Pressable style={styles.actionIconBtn} onPress={() => openEdit(ad)}>
                    <Feather name="edit-2" size={14} color={COLORS.navy} />
                  </Pressable>
                  <Pressable style={[styles.actionIconBtn, styles.actionIconBtnDanger]} onPress={() => handleDelete(ad)}>
                    <Feather name="trash-2" size={14} color={COLORS.rose} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : (
          // ---- Mobile / tablet card list ----
          <View style={styles.cardList}>
            {ads.map((ad) => (
              <View key={ad.id} style={styles.adCard}>
                <View style={styles.adCardTopRow}>
                  <View style={styles.adCardIdBadge}>
                    <Text style={styles.adCardIdText}>#{ad.id}</Text>
                  </View>
                  <StatusPill status={ad.status} />
                </View>
                <Text style={styles.adCardTitle}>{ad.name}</Text>
                <Text style={styles.adCardDescription} numberOfLines={2}>
                  {ad.description}
                </Text>

                <View style={styles.adCardMetaRow}>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{ad.type}</Text>
                  </View>
                </View>

                <View style={styles.adCardFooterRow}>
                  <View>
                    <Text style={styles.adCardFooterLabel}>{ad.pricingModel}</Text>
                    <Text style={styles.adCardFooterPrice}>
                      ₹{ad.lowPrice.toLocaleString('en-IN')} - ₹{ad.highPrice.toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.adCardActions}>
                    <Pressable style={styles.actionIconBtn} onPress={() => openEdit(ad)}>
                      <Feather name="edit-2" size={14} color={COLORS.navy} />
                    </Pressable>
                    <Pressable style={[styles.actionIconBtn, styles.actionIconBtnDanger]} onPress={() => handleDelete(ad)}>
                      <Feather name="trash-2" size={14} color={COLORS.rose} />
                    </Pressable>
                  </View>
                </View>
                <Text style={styles.adCardCreated}>Created {ad.createdAt}</Text>
              </View>
            ))}
          </View>
        )}

        {!loading && ads.length === 0 && (
          <View style={styles.emptyState}>
            <Feather name="inbox" size={28} color={COLORS.textMuted} />
            <Text style={styles.emptyStateTitle}>No performance ads yet</Text>
            <Text style={styles.emptyStateText}>Create your first ad to see it listed here.</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Mobile floating action button */}
      {!isTablet && (
        <Pressable style={styles.fab} onPress={openCreate}>
          <Feather name="plus" size={22} color={COLORS.white} />
        </Pressable>
      )}

      {/* Add / Edit Modal */}
      <RNModal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalCard, isDesktop && styles.modalCardWide]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>{editingId ? 'Edit Performance Ad' : 'Add New Performance Ad'}</Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={8}>
                <Feather name="x" size={20} color={COLORS.white} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
              <View style={styles.formRow}>
                <View style={[styles.fieldGroup, { width: isTablet ? '48%' : '100%' }]}>
                  <Text style={styles.fieldLabel}>
                    Ad Name <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Search Sponsored Listings - Low"
                    placeholderTextColor={COLORS.textMuted}
                    value={form.name}
                    onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
                  />
                </View>

                <PortalDropdown
                  label="Ad Type"
                  required
                  value={form.type}
                  placeholder="Select type"
                  options={AD_TYPES}
                  onSelect={(v) => setForm((f) => ({ ...f, type: v as AdType }))}
                  width={isTablet ? '48%' : '100%'}
                />
              </View>

              <View style={styles.formRow}>
                <PortalDropdown
                  label="Pricing Model"
                  required
                  value={form.pricingModel}
                  placeholder="Select pricing model"
                  options={PRICING_MODELS}
                  onSelect={(v) => setForm((f) => ({ ...f, pricingModel: v as PricingModel }))}
                  width={isTablet ? '48%' : '100%'}
                />
                <View style={[styles.fieldGroup, { width: isTablet ? '48%' : '100%' }]}>
                  <Text style={styles.fieldLabel}>
                    Low Price (₹) <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="0"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                    value={form.lowPrice}
                    onChangeText={(t) => setForm((f) => ({ ...f, lowPrice: t.replace(/[^0-9]/g, '') }))}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.fieldGroup, { width: isTablet ? '48%' : '100%' }]}>
                  <Text style={styles.fieldLabel}>
                    High Price (₹) <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="0"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                    value={form.highPrice}
                    onChangeText={(t) => setForm((f) => ({ ...f, highPrice: t.replace(/[^0-9]/g, '') }))}
                  />
                </View>
                <PortalDropdown
                  label="Status"
                  required
                  value={form.status}
                  placeholder="Select status"
                  options={STATUSES}
                  onSelect={(v) => setForm((f) => ({ ...f, status: v as AdStatus }))}
                  width="48%"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Enter performance ad description..."
                  placeholderTextColor={COLORS.textMuted}
                  value={form.description}
                  onChangeText={(t) => setForm((f) => ({ ...f, description: t }))}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
              <View style={styles.modalFooter}>
                <Pressable style={[styles.cancelButton, !isTablet && { flex: 1, justifyContent: 'center' }]} onPress={() => setModalVisible(false)}>
                  <Feather name="x" size={15} color={COLORS.textSecondary} />
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.submitButton, !isTablet && { flex: 1, justifyContent: 'center' }]} onPress={handleSubmit}>
                  <Feather name="save" size={15} color={COLORS.white} />
                  <Text style={styles.submitButtonText}>
                    {editingId ? 'Save Changes' : 'Create'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </RNModal>

    </AdminLayout>
  );
}

// -----------------------------
// Styles
// -----------------------------
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  screenContent: {
    padding: 16,
    width: '100%',
    alignSelf: 'center',
  },

  // Hero
  hero: { backgroundColor: COLORS.navy, borderRadius: 20, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 18, overflow: "visible", zIndex: 1 },
  heroMobile: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14 },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  heroIconBadge: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.orange, alignItems: "center", justifyContent: "center" },
  heroTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  heroSubtitle: { color: "#94A3B8", fontSize: 12, marginTop: 2, fontWeight: "400" },
  
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.orange,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  primaryButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 13,
  },

  // Channel strip
  channelStrip: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 16,
  },
  channelStripOverlap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  channelCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  channelTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  channelText1: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 10,
  },
  channelText2: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    textAlign: 'center',
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionHeaderIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sectionHeaderCount: {
    backgroundColor: COLORS.orangeSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionHeaderCountText: {
    color: COLORS.orange,
    fontSize: 11,
    fontWeight: '700',
  },

  // Desktop table
  tableWrap: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.navy,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableRowAlt: {
    backgroundColor: COLORS.bg,
  },
  tableCell: {
    fontSize: 12.5,
    color: COLORS.textPrimary,
  },
  tableCellStrong: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  tableCellCaption: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  tableCellMuted: {
    color: COLORS.textSecondary,
  },
  actionCell: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },

  // Badges / pills
  typeBadge: {
    backgroundColor: '#eef1fb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    fontSize: 11,
    color: COLORS.navySoft,
    fontWeight: '600',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },

  actionIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#eef1fb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconBtnDanger: {
    backgroundColor: COLORS.roseBg,
  },

  // Mobile card list
  cardList: {
    gap: 12,
  },
  adCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  adCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  adCardIdBadge: {
    backgroundColor: '#eef1fb',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  adCardIdText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.navySoft,
  },
  adCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  adCardDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  adCardMetaRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  adCardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  adCardFooterLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  adCardFooterPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.navy,
  },
  adCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  adCardCreated: {
    fontSize: 10.5,
    color: COLORS.textMuted,
    marginTop: 10,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 6,
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptyStateText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
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
    elevation: 6,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,20,50,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    width: '100%',
    maxWidth: 560,
    maxHeight: '88%',
    overflow: 'hidden',
  },
  modalCardWide: {
    maxWidth: 660,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.navy,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalHeaderTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  formRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 14,
  },
  formRowSplit: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fieldGroup: {
    marginBottom: 0,
  },
  fieldFlex: {
    width: '100%',
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  requiredMark: {
    color: COLORS.rose,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
  },
  textArea: {
    minHeight: 90,
    paddingTop: 10,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: COLORS.white,
  },
  dropdownValueText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  dropdownPlaceholderText: {
    fontSize: 13,
    color: COLORS.textMuted,
    flexShrink: 1,
  },
  dropdownBackdrop: {
    flex: 1,
  },
  dropdownList: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    paddingVertical: 4,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dropdownOptionActive: {
    backgroundColor: COLORS.orangeSoft,
  },
  dropdownOptionPressed: {
    backgroundColor: '#f5f5f5',
  },
  dropdownOptionText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  dropdownOptionTextActive: {
    color: COLORS.orange,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#f1f1f1',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: COLORS.orange,
  },
  submitButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
});