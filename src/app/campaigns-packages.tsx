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
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AdminLayout from '@/components/admin-layout';
import { getApiErrorMessage } from '@/lib/api/client';
import { sweetCrud, sweetError, sweetWarning } from '@/lib/sweetAlert';
import {
  createCampaignPackage,
  deleteCampaignPackage,
  fetchCampaignPackages,
  formatAdsDate,
  toApiStatus,
  toUiStatus,
  updateCampaignPackage,
  type AdsApiRow,
} from '@/services/adsApi';
// -----------------------------
// Design tokens
// -----------------------------
const COLORS = {
  navy: "#151D4F",
  navyDark: "#0E1438",
  navyLight: "#152238",
  navySoft: "#152238",
  orange: "#F97316",
  orangeDark: "#EA580C",
  orangeLight: "#FB923C",
  orangeSoft: "#FFF7ED",
  green: "#059669",
  greenSoft: "#ECFDF5",
  gold: "#CA8A04",
  goldSoft: "#FEF9C3",
  blue: "#2563EB",
  blueSoft: "#EFF6FF",
  red: "#E11D48",
  redSoft: "#FFF1F2",
  bg: "#F8FAFC",
  warmBg: "#F8FAFC",
  white: "#FFFFFF",
  card: "#FFFFFF",
  border: "#E2E8F0",
  textPrimary: "#1E293B",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
  emerald: "#059669",
  emeraldBg: "#ECFDF5",
  rose: "#E11D48",
  roseBg: "#FFF1F2",
};

const Animated = RNAnimated;

// -----------------------------
// Types
// -----------------------------
type PackageType =
  | 'Email Campaign'
  | 'Push Campaign'
  | 'Brand Takeover'
  | 'Starter Package'
  | 'Premium Package'
  | 'Enterprise Package';

type PackageStatus = 'Active' | 'Inactive';

interface CampaignPackage {
  id: number;
  name: string;
  description: string;
  type: PackageType;
  campaignPrice: number;
  monthlyPrice: number;
  status: PackageStatus;
  createdAt: string;
  features?: string;
}

const PACKAGE_TYPES: PackageType[] = [
  'Email Campaign',
  'Push Campaign',
  'Brand Takeover',
  'Starter Package',
  'Premium Package',
  'Enterprise Package',
];

const STATUSES: PackageStatus[] = ['Active', 'Inactive'];

function mapCampaignPackageFromApi(row: AdsApiRow): CampaignPackage {
  const campaign = row.campaignPrice ?? row.campaign_price;
  const monthly = row.monthlyPrice ?? row.monthly_price;
  return {
    id: Number(row.id),
    name: String(row.name ?? ''),
    description: String(row.description ?? ''),
    type: String(row.type ?? '') as PackageType,
    campaignPrice: Number(campaign ?? 0),
    monthlyPrice: Number(monthly ?? 0),
    status: toUiStatus(row.status),
    createdAt: formatAdsDate(row.createdAt),
    features: String(row.features ?? ''),
  };
}

const TYPE_ACCENTS: Record<PackageType, { bg: string; fg: string }> = {
  'Email Campaign': { bg: COLORS.blueSoft, fg: COLORS.blue },
  'Push Campaign': { bg: COLORS.blueSoft, fg: COLORS.blue },
  'Brand Takeover': { bg: COLORS.goldSoft, fg: COLORS.gold },
  'Starter Package': { bg: '#eef1fb', fg: COLORS.navyLight },
  'Premium Package': { bg: COLORS.orangeSoft, fg: COLORS.orange },
  'Enterprise Package': { bg: COLORS.greenSoft, fg: COLORS.green },
};

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
            <ScrollView style={{ maxHeight: Dimensions.get('window').width < 768 ? 160 : 260 }} nestedScrollEnabled>
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
function StatusPill({ status }: { status: PackageStatus }) {
  const map: Record<PackageStatus, { bg: string; fg: string }> = {
    Active: { bg: COLORS.greenSoft, fg: COLORS.green },
    Inactive: { bg: COLORS.orangeSoft, fg: COLORS.orange },
  };
  const c = map[status];
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <View style={[styles.pillDot, { backgroundColor: c.fg }]} />
      <Text style={[styles.pillText, { color: c.fg }]}>{status}</Text>
    </View>
  );
}

function TypeBadge({ type }: { type: PackageType }) {
  const c = TYPE_ACCENTS[type];
  return (
    <View style={[styles.typeBadge, { backgroundColor: c.bg }]}>
      <Text style={[styles.typeBadgeText, { color: c.fg }]} numberOfLines={1}>
        {type}
      </Text>
    </View>
  );
}

// -----------------------------
// Enterprise campaign highlight cards (restyled, not a direct copy)
// -----------------------------
interface HighlightCard {
  icon: keyof typeof Feather.glyphMap;
  accent: string;
  title: string;
  primaryStat: string;
  secondaryStat: string;
  footnote: string;
}

const HIGHLIGHT_CARDS: HighlightCard[] = [
  {
    icon: 'mail',
    accent: COLORS.blue,
    title: 'Email & Push Campaigns',
    primaryStat: '₹15k – 1L',
    secondaryStat: 'per campaign / month',
    footnote: '₹15-30k per campaign · ₹50k-1 Lakh per month',
  },
  {
    icon: 'award',
    accent: COLORS.gold,
    title: 'Exclusive Brand Takeover',
    primaryStat: '₹1L – 10L',
    secondaryStat: 'per day / week',
    footnote: '₹1-2 Lakh per day · ₹6-10 Lakh per week — complete platform takeover',
  },
];

// -----------------------------
// Starter package tiers (restyled pricing cards)
// -----------------------------
interface PricingTier {
  name: string;
  accent: string;
  priceRange: string;
  features: string[];
}

const PRICING_TIERS: PricingTier[] = [
  {
    name: 'Basic Package',
    accent: COLORS.blue,
    priceRange: '₹10k – 25k',
    features: ['Category Banner Ads', 'Basic Analytics', 'Email Support'],
  },
  {
    name: 'Standard Package',
    accent: COLORS.green,
    priceRange: '₹25k – 40k',
    features: ['Homepage Sub-Banner', 'Advanced Analytics', 'Priority Support', 'Social Media Integration'],
  },
  {
    name: 'Premium Package',
    accent: COLORS.gold,
    priceRange: '₹40k – 50k',
    features: ['Homepage Main Banner', 'Full Analytics Suite', 'Dedicated Account Manager', 'Custom Campaigns'],
  },
];

// -----------------------------
// Main Screen
// -----------------------------
export default function CampaignsPackagesScreen() {
  const { isTablet, isLaptop, isDesktop } = useBreakpoint();

  const [packages, setPackages] = useState<CampaignPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const loadPackages = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await fetchCampaignPackages();
      setPackages(rows.map(mapCampaignPackageFromApi));
    } catch (err) {
      setLoadError(getApiErrorMessage(err, 'Failed to load campaign packages.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPackages();
  }, [loadPackages]);

  const [form, setForm] = useState({
    name: '',
    type: '' as PackageType | '',
    campaignPrice: '',
    monthlyPrice: '',
    description: '',
    features: '',
    status: 'Active' as PackageStatus,
  });

  const resetForm = () =>
    setForm({ name: '', type: '', campaignPrice: '', monthlyPrice: '', description: '', features: '', status: 'Active' });

  const openCreate = () => {
    resetForm();
    setEditingId(null);
    setModalVisible(true);
  };

  const openEdit = (pkg: CampaignPackage) => {
    setForm({
      name: pkg.name,
      type: pkg.type,
      campaignPrice: String(pkg.campaignPrice),
      monthlyPrice: String(pkg.monthlyPrice),
      description: pkg.description,
      features: pkg.features ?? '',
      status: pkg.status,
    });
    setEditingId(pkg.id);
    setModalVisible(true);
  };

  const handleDelete = async (pkg: CampaignPackage) => {
    if (!(await sweetCrud.confirmDelete('Campaign package', pkg.name))) return;
    setSaving(true);
    try {
      await deleteCampaignPackage(pkg.id);
      await loadPackages();
      void sweetCrud.deleted('Campaign package');
    } catch (err) {
      void sweetError('Error', getApiErrorMessage(err, 'Could not delete campaign package.'));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.type || !form.campaignPrice || !form.monthlyPrice) {
      void sweetWarning('Missing information', 'Please fill in all required fields.');
      return;
    }
    const campaignPrice = Number(form.campaignPrice);
    const monthlyPrice = Number(form.monthlyPrice);
    if (Number.isNaN(campaignPrice) || Number.isNaN(monthlyPrice)) {
      void sweetWarning('Invalid pricing', 'Please enter valid numeric prices.');
      return;
    }

    const body: AdsApiRow = {
      name: form.name.trim(),
      type: form.type,
      campaignPrice,
      monthlyPrice,
      description: form.description,
      status: toApiStatus(form.status),
    };
    if (form.features.trim()) {
      body.features = form.features.trim();
    }

    if (editingId) {
      if (!(await sweetCrud.confirmUpdate('Campaign package', body.name))) return;
    } else {
      if (!(await sweetCrud.confirmAdd('Campaign package', body.name))) return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateCampaignPackage(editingId, body);
        void sweetCrud.updated('Campaign package');
      } else {
        await createCampaignPackage(body);
        void sweetCrud.added('Campaign package');
      }
      setModalVisible(false);
      resetForm();
      setEditingId(null);
      await loadPackages();
    } catch (err) {
      void sweetError('Error', getApiErrorMessage(err, editingId ? 'Could not update campaign package.' : 'Could not create campaign package.'));
    } finally {
      setSaving(false);
    }
  };

  const tierCardWidth: DimensionValue = useMemo(() => {
    if (!isTablet) return '100%';
    return '32%';
  }, [isTablet]);

  return (
    <AdminLayout>
      <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.hero, !isTablet && styles.heroMobile]}>
          <View style={styles.heroTopRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
              <View style={styles.heroIconBadge}>
                <Feather name="award" size={20} color={COLORS.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>Campaigns & Packages</Text>
                <Text style={styles.heroSubtitle}>Manage premium campaigns and tiered advertising</Text>
              </View>
            </View>
            {isTablet && (
              <Pressable style={styles.primaryButton} onPress={openCreate}>
                <Feather name="plus" size={16} color={COLORS.white} />
                <Text style={styles.primaryButtonText}>New Package</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Highlight strip - premium campaigns (overlapping the header edge on wider screens) */}
        <View style={[styles.highlightStrip, isTablet && styles.highlightStripOverlap]}>
          {HIGHLIGHT_CARDS.map((c) => (
            <View key={c.title} style={[styles.highlightCard, { width: isTablet ? '48%' : '100%' }]}>
              <View style={[styles.highlightIconWrap, { backgroundColor: `${c.accent}1A` }]}>
                <Feather name={c.icon} size={18} color={c.accent} />
              </View>
              <Text style={styles.highlightTitle}>{c.title}</Text>
              <View style={styles.highlightStatRow}>
                <Text style={styles.highlightStatPrimary}>{c.primaryStat}</Text>
                <Text style={styles.highlightStatSecondary}>{c.secondaryStat}</Text>
              </View>
              <Text style={styles.highlightFootnote}>{c.footnote}</Text>
            </View>
          ))}
        </View>

        {/* Starter tiers */}
        <View style={isTablet ? styles.sectionContainer : null}>
          <View style={[styles.sectionHeader, isTablet && styles.sectionHeaderInline, isTablet && { borderBottomWidth: 0 }]}>
            <View style={styles.sectionHeaderIcon}>
              <Feather name="layers" size={14} color={COLORS.white} />
            </View>
            <Text style={styles.sectionHeaderText}>Starter Packages (SMEs & Small Brands)</Text>
          </View>

          <View style={[styles.tierStrip, isTablet && styles.tierStripRow, isTablet && { padding: 16, paddingTop: 4 }]}>
            {PRICING_TIERS.map((tier) => (
              <View key={tier.name} style={[styles.tierCard, { width: tierCardWidth }]}>
                <View style={[styles.tierAccentBar, { backgroundColor: tier.accent }]} />
                <Text style={[styles.tierName, { color: tier.accent }]}>{tier.name}</Text>
                <Text style={styles.tierPrice}>{tier.priceRange}</Text>
                <View style={styles.tierFeatureList}>
                  {tier.features.map((f) => (
                    <View key={f} style={styles.tierFeatureRow}>
                      <Feather name="check-circle" size={13} color={COLORS.green} />
                      <Text style={styles.tierFeatureText}>{f}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Table section */}
        <View style={isLaptop ? styles.sectionContainer : null}>
          <View style={[styles.sectionHeader, isLaptop && styles.sectionHeaderInline, { backgroundColor: COLORS.navy }]}>
            <View style={[styles.sectionHeaderIcon, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <Feather name="list" size={14} color={COLORS.white} />
            </View>
            <Text style={[styles.sectionHeaderText, { color: COLORS.white }]}>All Campaigns & Packages</Text>
            <View style={styles.sectionHeaderCount}>
              <Text style={styles.sectionHeaderCountText}>{packages.length}</Text>
            </View>
          </View>

        {loadError ? (
          <Text style={{ color: COLORS.red, margin: 16 }}>{loadError}</Text>
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
              <Text style={[styles.tableHeaderCell, { flex: 1.8 }]}>Name</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.1 }]}>Type</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Campaign Price</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Monthly Price</Text>
              <Text style={[styles.tableHeaderCell, { flex: 0.9 }]}>Status</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Created</Text>
              <Text style={[styles.tableHeaderCell, { flex: 0.9, textAlign: 'right' }]}>Action</Text>
            </View>
            {packages.map((pkg, idx) => (
              <View key={pkg.id} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                <Text style={[styles.tableCell, styles.tableCellMuted, { flex: 0.4 }]}>{pkg.id}</Text>
                <View style={{ flex: 1.8 }}>
                  <Text style={styles.tableCellStrong}>{pkg.name}</Text>
                  <Text style={styles.tableCellCaption} numberOfLines={1}>
                    {pkg.description}
                  </Text>
                </View>
                <View style={{ flex: 1.1 }}>
                  <TypeBadge type={pkg.type} />
                </View>
                <Text style={[styles.tableCell, { flex: 1 }]}>₹{pkg.campaignPrice.toLocaleString('en-IN')}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>₹{pkg.monthlyPrice.toLocaleString('en-IN')}</Text>
                <View style={{ flex: 0.9 }}>
                  <StatusPill status={pkg.status} />
                </View>
                <Text style={[styles.tableCell, styles.tableCellMuted, { flex: 1 }]}>{pkg.createdAt}</Text>
                <View style={[styles.actionCell, { flex: 0.9 }]}>
                  <Pressable style={styles.actionIconBtn} onPress={() => openEdit(pkg)}>
                    <Feather name="edit-2" size={14} color={COLORS.navy} />
                  </Pressable>
                  <Pressable style={[styles.actionIconBtn, styles.actionIconBtnDanger]} onPress={() => handleDelete(pkg)}>
                    <Feather name="trash-2" size={14} color={COLORS.red} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : (
          // ---- Mobile / tablet card list ----
          <View style={[styles.cardList, isTablet && styles.cardListTablet]}>
            {packages.map((pkg) => (
              <View key={pkg.id} style={[styles.pkgCard, isTablet && { width: '48%' }]}>
                <View style={styles.pkgCardTopRow}>
                  <View style={styles.pkgCardIdBadge}>
                    <Text style={styles.pkgCardIdText}>#{pkg.id}</Text>
                  </View>
                  <StatusPill status={pkg.status} />
                </View>
                <Text style={styles.pkgCardTitle}>{pkg.name}</Text>
                <Text style={styles.pkgCardDescription} numberOfLines={2}>
                  {pkg.description}
                </Text>

                <View style={styles.pkgCardMetaRow}>
                  <TypeBadge type={pkg.type} />
                </View>

                <View style={styles.pkgCardFooterRow}>
                  <View>
                    <Text style={styles.pkgCardFooterLabel}>Campaign</Text>
                    <Text style={styles.pkgCardFooterPrice}>₹{pkg.campaignPrice.toLocaleString('en-IN')}</Text>
                  </View>
                  <View>
                    <Text style={styles.pkgCardFooterLabel}>Monthly</Text>
                    <Text style={styles.pkgCardFooterPrice}>₹{pkg.monthlyPrice.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.pkgCardActions}>
                    <Pressable style={styles.actionIconBtn} onPress={() => openEdit(pkg)}>
                      <Feather name="edit-2" size={14} color={COLORS.navy} />
                    </Pressable>
                    <Pressable style={[styles.actionIconBtn, styles.actionIconBtnDanger]} onPress={() => handleDelete(pkg)}>
                      <Feather name="trash-2" size={14} color={COLORS.red} />
                    </Pressable>
                  </View>
                </View>
                <Text style={styles.pkgCardCreated}>Created {pkg.createdAt}</Text>
              </View>
            ))}
          </View>
        )}
        </View>

        {!loading && packages.length === 0 && (
          <View style={styles.emptyState}>
            <Feather name="inbox" size={28} color={COLORS.textMuted} />
            <Text style={styles.emptyStateTitle}>No campaign packages yet</Text>
            <Text style={styles.emptyStateText}>Create your first package to see it listed here.</Text>
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
              <Text style={styles.modalHeaderTitle}>{editingId ? 'Edit Campaign Package' : 'Add New Campaign Package'}</Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={8}>
                <Feather name="x" size={20} color={COLORS.white} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
              <View style={[styles.formRow, isTablet && styles.formRowSplit]}>
                <View style={[styles.fieldGroup, { width: isTablet ? '48%' : '100%' }]}>
                  <Text style={styles.fieldLabel}>
                    Package Name <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Starter Package - Basic"
                    placeholderTextColor={COLORS.textMuted}
                    value={form.name}
                    onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
                  />
                </View>

                <PortalDropdown
                  label="Package Type"
                  required
                  value={form.type}
                  placeholder="Select type"
                  options={PACKAGE_TYPES}
                  onSelect={(v) => setForm((f) => ({ ...f, type: v as PackageType }))}
                  width={isTablet ? '48%' : '100%'}
                />
              </View>

              <View style={[styles.formRow, isTablet && styles.formRowSplit]}>
                <View style={[styles.fieldGroup, { width: isTablet ? '48%' : '100%' }]}>
                  <Text style={styles.fieldLabel}>
                    Campaign Price (₹) <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="0"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                    value={form.campaignPrice}
                    onChangeText={(t) => setForm((f) => ({ ...f, campaignPrice: t.replace(/[^0-9]/g, '') }))}
                  />
                </View>
                <View style={[styles.fieldGroup, { width: isTablet ? '48%' : '100%' }]}>
                  <Text style={styles.fieldLabel}>
                    Monthly Price (₹) <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="0"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                    value={form.monthlyPrice}
                    onChangeText={(t) => setForm((f) => ({ ...f, monthlyPrice: t.replace(/[^0-9]/g, '') }))}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Enter package description..."
                  placeholderTextColor={COLORS.textMuted}
                  value={form.description}
                  onChangeText={(t) => setForm((f) => ({ ...f, description: t }))}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Features (one per line)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder={'Enter package features, one per line...'}
                  placeholderTextColor={COLORS.textMuted}
                  value={form.features}
                  onChangeText={(t) => setForm((f) => ({ ...f, features: t }))}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <PortalDropdown
                label="Status"
                required
                value={form.status}
                placeholder="Select status"
                options={STATUSES}
                onSelect={(v) => setForm((f) => ({ ...f, status: v as PackageStatus }))}
              />

              <View style={styles.modalFooter}>
                <Pressable style={[styles.cancelButton, { flex: 1, justifyContent: 'center' }]} onPress={() => setModalVisible(false)}>
                  <Feather name="x" size={15} color={COLORS.textSecondary} />
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.submitButton, { flex: 1, justifyContent: 'center' }]} onPress={handleSubmit}>
                  <Feather name="save" size={15} color={COLORS.white} />
                  <Text style={styles.submitButtonText}>
                    {editingId ? 'Save' : 'Create'}
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
    backgroundColor: COLORS.warmBg,
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

  // Highlight strip (Email/Push + Brand Takeover)
  highlightStrip: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 16,
  },
  highlightStripOverlap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 4,
  },
  highlightCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  highlightIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  highlightTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  highlightStatRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 4,
  },
  highlightStatPrimary: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.navy,
  },
  highlightStatSecondary: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  highlightFootnote: {
    fontSize: 11,
    color: COLORS.textMuted,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
    marginBottom: 12,
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeaderInline: {
    marginTop: 0,
    marginBottom: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  sectionContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginTop: 24,
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
    flexShrink: 1,
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

  // Starter tier pricing cards
  tierStrip: {
    flexDirection: 'column',
    gap: 12,
  },
  tierStripRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tierCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 12,
  },
  tierAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  tierName: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 4,
  },
  tierPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 14,
  },
  tierFeatureList: {
    gap: 9,
  },
  tierFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierFeatureText: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    flexShrink: 1,
  },

  tableWrap: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    margin: 16,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#faf8f4',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
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
    backgroundColor: '#fcfbf9',
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    fontSize: 11,
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
    backgroundColor: COLORS.redSoft,
  },

  // Mobile card list
  cardList: {
    gap: 12,
  },
  cardListTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  pkgCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pkgCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pkgCardIdBadge: {
    backgroundColor: '#eef1fb',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pkgCardIdText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.navyLight,
  },
  pkgCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  pkgCardDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  pkgCardMetaRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  pkgCardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  pkgCardFooterLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  pkgCardFooterPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.navy,
  },
  pkgCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  pkgCardCreated: {
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
    backgroundColor: COLORS.orange,
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
    flexDirection: 'column',
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
    color: COLORS.red,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
  },
  textArea: {
    minHeight: 80,
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
    paddingVertical: 9,
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
    paddingVertical: 8,
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