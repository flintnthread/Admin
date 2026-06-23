import AdminLayout from "@/components/admin-layout";
import { getApiErrorMessage } from '@/lib/api/client';
import { formatDate } from '@/lib/format';
import { fetchShiprocketSellers, type ShiprocketSellerRow } from '@/services/sellerApi';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Seller {
  id: string;
  businessName: string;
  contactPerson: string;
  phone: string;
  city: string;
  state: string;
  status: 'Not Uploaded' | 'Uploaded';
  uploadedAt?: string;
}

interface Props {
  // navigation prop removed - using expo-router
}

function mapShiprocketRow(row: ShiprocketSellerRow, status: Seller['status']): Seller {
  return {
    id: String(row.id),
    businessName: row.businessName ?? '—',
    contactPerson: row.contactPerson ?? '—',
    phone: row.phone ?? '—',
    city: row.city ?? '—',
    state: row.state ?? '—',
    status,
    uploadedAt: row.uploadedAt ? formatDate(row.uploadedAt) : undefined,
  };
}

// ─── Bootstrap Icon Component (SVG-free text fallback) ───────────────────────
// Uses Unicode characters that closely match Bootstrap Icons

const BsIcon: React.FC<{ name: string; size?: number; color?: string }> = ({
  name,
  size = 18,
  color = '#333',
}) => {
  const icons: Record<string, string> = {
    'arrow-left': '←',
    'box-arrow-up-right': '↗',
    'check-circle': '✓',
    'hourglass-split': '⏳',
    'check2': '✔',
    'exclamation-triangle': '⚠',
    'info-circle': 'ℹ',
    'building': '🏢',
    'person': '👤',
    'telephone': '📞',
    'geo-alt': '📍',
    'calendar': '📅',
    'upload': '⬆',
    'check-square': '☑',
    'square': '☐',
    'download': '⬇',
    'shop': '🛍',
    'list': '☰',
  };
  return (
    <Text style={{ fontSize: size, color, lineHeight: size + 4 }}>
      {icons[name] ?? '•'}
    </Text>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const SellerShiprocket: React.FC<Props> = () => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [pendingSellers, setPendingSellers] = useState<Seller[]>([]);
  const [uploadedSellers, setUploadedSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [markingUploaded, setMarkingUploaded] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadSellers = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [pendingRes, uploadedRes] = await Promise.all([
        fetchShiprocketSellers('pending', 0, 500),
        fetchShiprocketSellers('uploaded', 0, 500),
      ]);
      setPendingSellers((pendingRes.items ?? []).map((r) => mapShiprocketRow(r, 'Not Uploaded')));
      setUploadedSellers((uploadedRes.items ?? []).map((r) => mapShiprocketRow(r, 'Uploaded')));
    } catch (e) {
      setLoadError(getApiErrorMessage(e));
      setPendingSellers([]);
      setUploadedSellers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSellers();
  }, [loadSellers]);

  // ── Breakpoints ──────────────────────────────────────────────────────────
  const isMobile = width < 480;
  const isTablet = width >= 480 && width < 768;
  const isLaptop = width >= 768 && width < 1280;
  const isDesktop = width >= 1280;

  const contentPadding = isMobile ? 12 : isTablet ? 16 : isLaptop ? 24 : 32;
  const cardRadius = isMobile ? 10 : 14;
  const fontSize = {
    xs: isMobile ? 10 : 11,
    sm: isMobile ? 12 : 13,
    base: isMobile ? 14 : 15,
    lg: isMobile ? 17 : isTablet ? 19 : 22,
    xl: isMobile ? 20 : isTablet ? 24 : 28,
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.size === pendingSellers.length
        ? new Set()
        : new Set(pendingSellers.map((s) => s.id))
    );
  }, [pendingSellers]);

  const handleMarkUploaded = useCallback(async () => {
    if (selectedIds.size === 0) {
      Alert.alert('No Selection', 'Please select sellers to mark as uploaded.');
      return;
    }
    setMarkingUploaded(true);
    Alert.alert(
      'Tracked in database',
      'Upload status is set when the seller completes their warehouse address in profile. Refresh this page after Shiprocket upload and seller warehouse update.'
    );
    setMarkingUploaded(false);
    setSelectedIds(new Set());
    void loadSellers();
  }, [selectedIds, loadSellers]);

  const handleExport = useCallback(async () => {
    setExporting(true);

    const headers = ['Business Name', 'Contact Person', 'Phone', 'City', 'State', 'Status'];
    const rows = pendingSellers.map((s) =>
      [s.businessName, s.contactPerson, s.phone, s.city, s.state, s.status].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');

    if (Platform.OS === 'web') {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'shiprocket_new_sellers.csv';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // React Native: use expo-file-system / react-native-fs in real project
      Alert.alert('Export Ready', 'CSV download triggered.\n\nIn production, use expo-file-system to save:\n\n' + csv.slice(0, 120) + '…');
    }
    setExporting(false);
  }, [pendingSellers]);

  const handleBackToSellers = useCallback(() => {
    router.push('/sellers');
  }, [router]);

  // ── Sub-components ────────────────────────────────────────────────────────

  // Header bar (no sidebar, no topnav — just page header)
  const renderHeader = () => (
    <View style={[styles.header, { paddingHorizontal: contentPadding }]}>
      <View style={styles.headerLeft}>
        <View style={styles.headerIconBox}>
          <BsIcon name="upload" size={isMobile ? 20 : 24} color="#fff" />
        </View>
        <View style={{ marginLeft: 12 }}>
          <Text style={[styles.headerTitle, { fontSize: fontSize.lg }]}>
            Shiprocket Upload Tracker
          </Text>
          {/* Breadcrumb */}
          <View style={styles.breadcrumb}>
            <Text style={[styles.breadcrumbLink, { fontSize: fontSize.xs }]}>Dashboard</Text>
            <Text style={[styles.breadcrumbSep, { fontSize: fontSize.xs }]}> › </Text>
            <Text style={[styles.breadcrumbLink, { fontSize: fontSize.xs }]}>Sellers</Text>
            <Text style={[styles.breadcrumbSep, { fontSize: fontSize.xs }]}> › </Text>
            <Text style={[styles.breadcrumbCurrent, { fontSize: fontSize.xs }]}>Upload Tracker</Text>
          </View>
        </View>
        <View style={styles.profileBadge}>
          <Text style={[styles.profileBadgeText, { fontSize: fontSize.xs }]}>● Profile Completed</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={[styles.headerActions, isMobile && styles.headerActionsMobile]}>
        <TouchableOpacity
          style={[styles.btnOutline, { paddingVertical: isMobile ? 8 : 10, paddingHorizontal: isMobile ? 12 : 16 }]}
          onPress={handleBackToSellers}
          activeOpacity={0.75}
        >
          <BsIcon name="arrow-left" size={isMobile ? 13 : 15} color="#6B7280" />
          <Text style={[styles.btnOutlineText, { fontSize: fontSize.sm, marginLeft: 5 }]}>
            Back to Sellers
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnPrimary, { paddingVertical: isMobile ? 8 : 10, paddingHorizontal: isMobile ? 12 : 16, marginLeft: 8 }]}
          onPress={handleExport}
          activeOpacity={0.8}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <BsIcon name="box-arrow-up-right" size={isMobile ? 13 : 15} color="#fff" />
              <Text style={[styles.btnPrimaryText, { fontSize: fontSize.sm, marginLeft: 5 }]}>
                Export New Sellers
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  // Stat cards
  const renderStatCards = () => (
    <View
      style={[
        styles.statsRow,
        { paddingHorizontal: contentPadding, marginTop: isMobile ? 12 : -42, zIndex: 10, elevation: 10 },
        isMobile && styles.statsRowMobile,
      ]}
    >
      {/* Pending Upload */}
      <View style={[styles.statCard, styles.statCardPending, { borderRadius: cardRadius, width: isMobile ? '100%' : 420 }]}>
        <View style={styles.statCardContent}>
          <View>
            <Text style={[styles.statLabel, { fontSize: fontSize.sm }]}>
              Profile Completed - Pending Upload
            </Text>
            <Text style={[styles.statValue, { fontSize: isMobile ? 32 : 40 }]}>
              {pendingSellers.length}
            </Text>
            <Text style={[styles.statSubLabel, { fontSize: fontSize.xs }]}>
              Profile Completed Sellers
            </Text>
          </View>
          <BsIcon name="hourglass-split" size={isMobile ? 28 : 36} color="#D97706" />
        </View>
      </View>

      {/* Already Uploaded */}
      <View
        style={[
          styles.statCard,
          styles.statCardUploaded,
          { borderRadius: cardRadius, width: isMobile ? '100%' : 420, marginLeft: isMobile ? 0 : 16, marginTop: isMobile ? 10 : 0 },
        ]}
      >
        <View style={styles.statCardContent}>
          <View>
            <Text style={[styles.statLabel, { fontSize: fontSize.sm }]}>
              Profile Completed - Already Uploaded
            </Text>
            <Text style={[styles.statValue, styles.statValueGreen, { fontSize: isMobile ? 32 : 40 }]}>
              {uploadedSellers.length}
            </Text>
            <Text style={[styles.statSubLabel, { fontSize: fontSize.xs }]}>
              Profile Completed Sellers
            </Text>
          </View>
          <BsIcon name="check-circle" size={isMobile ? 28 : 36} color="#EA580C" />
        </View>
      </View>
    </View>
  );

  // Steps guide
  const renderStepsGuide = () => (
    <View style={[styles.stepsCard, { marginHorizontal: contentPadding, borderRadius: cardRadius, marginTop: 16 }]}>
      <View style={styles.stepsHeader}>
        <BsIcon name="info-circle" size={15} color="#0369A1" />
        <Text style={[styles.stepsTitle, { fontSize: fontSize.base, marginLeft: 6 }]}>
          Steps to Upload & Verify:
        </Text>
      </View>
      {[
        { num: '1', title: 'Export', desc: 'Click "Export New Sellers" button above to download CSV.' },
        { num: '2', title: 'Upload to Shiprocket', desc: 'Go to Shiprocket Pickup Locations → Click "Bulk Upload" → Upload CSV.' },
        {
          num: '3', title: 'Verify Addresses', desc: 'After upload, addresses will show as "UNVERIFIED".',
          sub: [
            'Click "Edit" on each address in Shiprocket',
            'Click "Verify" or wait for IVR/SMS verification call',
            'Complete verification (usually takes 24–48 hours for auto-verification)',
          ],
        },
        { num: '4', title: 'Mark as Uploaded', desc: 'Come back here and select the sellers below, then click "Mark as Uploaded".' },
      ].map((step) => (
        <View key={step.num} style={[styles.stepRow, { marginTop: 8 }]}>
          <View style={styles.stepNumBadge}>
            <Text style={[styles.stepNum, { fontSize: fontSize.sm }]}>{step.num}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.stepText, { fontSize: fontSize.sm }]}>
              <Text style={styles.stepBold}>{step.title}: </Text>
              {step.desc}
            </Text>
            {step.sub?.map((s, i) => (
              <View key={i} style={styles.stepSubRow}>
                <Text style={[styles.stepSubBullet, { fontSize: fontSize.sm }]}>•  </Text>
                <Text style={[styles.stepSubText, { fontSize: fontSize.sm }]}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      {/* Note */}
      <View style={[styles.noteBox, { marginTop: 12, borderRadius: cardRadius - 4 }]}>
        <BsIcon name="exclamation-triangle" size={13} color="#92400E" />
        <Text style={[styles.noteText, { fontSize: fontSize.xs, marginLeft: 6 }]}>
          <Text style={{ fontWeight: '700' }}>Note: </Text>
          Shiprocket requires manual verification of all new pickup addresses. Even with IVR/SMS enabled, you may need to click "Edit" → "Verify" in Shiprocket's dashboard for each address.
        </Text>
      </View>
    </View>
  );

  // Pending sellers section
  const renderPendingSellers = () => (
    <View style={[styles.section, { marginHorizontal: contentPadding, marginTop: 20, borderRadius: cardRadius }]}>
      {/* Section header */}
      <View style={styles.sectionHeaderPending}>
        <BsIcon name="hourglass-split" size={15} color="#D97706" />
        <Text style={[styles.sectionTitle, { fontSize: fontSize.base, marginLeft: 6 }]}>
          Profile Completed Sellers Pending Upload ({pendingSellers.length})
        </Text>
      </View>
      <Text style={[styles.sectionSubtitle, { fontSize: fontSize.xs, paddingHorizontal: 16, paddingTop: 4 }]}>
        These profile completed sellers need to be uploaded to Shiprocket
      </Text>

      {/* Table / Cards */}
      {isMobile || isTablet ? (
        // Card view for mobile & tablet
        <View style={{ padding: 12 }}>
          {/* Select All */}
          <TouchableOpacity style={styles.selectAllRow} onPress={toggleSelectAll}>
            <BsIcon
              name={selectedIds.size === pendingSellers.length ? 'check-square' : 'square'}
              size={16}
              color="#4F46E5"
            />
            <Text style={[styles.selectAllText, { fontSize: fontSize.sm, marginLeft: 8 }]}>
              {selectedIds.size === pendingSellers.length ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>

          {pendingSellers.map((seller) => (
            <View
              key={seller.id}
              style={[
                styles.sellerCard,
                { borderRadius: cardRadius - 2, marginBottom: 10 },
                selectedIds.has(seller.id) && styles.sellerCardSelected,
              ]}
            >
              <TouchableOpacity
                style={styles.sellerCardHeader}
                onPress={() => toggleSelect(seller.id)}
                activeOpacity={0.8}
              >
                <BsIcon
                  name={selectedIds.has(seller.id) ? 'check-square' : 'square'}
                  size={18}
                  color={selectedIds.has(seller.id) ? '#4F46E5' : '#9CA3AF'}
                />
                <Text style={[styles.sellerCardName, { fontSize: fontSize.base, marginLeft: 10 }]}>
                  {seller.businessName}
                </Text>
                <View style={styles.statusBadgeRed}>
                  <Text style={[styles.statusBadgeText, { fontSize: fontSize.xs }]}>Not Uploaded</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.sellerCardBody}>
                <View style={styles.sellerCardRow}>
                  <BsIcon name="person" size={13} color="#6B7280" />
                  <Text style={[styles.sellerCardMeta, { fontSize: fontSize.sm }]}> {seller.contactPerson}</Text>
                </View>
                <View style={styles.sellerCardRow}>
                  <BsIcon name="telephone" size={13} color="#6B7280" />
                  <Text style={[styles.sellerCardMeta, { fontSize: fontSize.sm }]}> {seller.phone}</Text>
                </View>
                <View style={styles.sellerCardRow}>
                  <BsIcon name="geo-alt" size={13} color="#6B7280" />
                  <Text style={[styles.sellerCardMeta, { fontSize: fontSize.sm }]}> {seller.city}, {seller.state}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        // Table view for laptop & desktop
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ minWidth: '100%' }}>
          <View style={{ width: '100%', minWidth: isLaptop ? 700 : 900 }}>
            {/* Table head */}
            <View style={[styles.tableHead, { paddingHorizontal: 16 }]}>
              <TouchableOpacity style={{ width: 36 }} onPress={toggleSelectAll}>
                <BsIcon
                  name={selectedIds.size === pendingSellers.length ? 'check-square' : 'square'}
                  size={16}
                  color="#4F46E5"
                />
              </TouchableOpacity>
              {['Business Name', 'Contact Person', 'Phone', 'City', 'State', 'Status'].map((h) => (
                <Text key={h} style={[styles.tableHeadCell, { fontSize: fontSize.xs, flex: h === 'Business Name' ? 2 : 1 }]}>
                  {h}
                </Text>
              ))}
            </View>

            {pendingSellers.map((seller, idx) => (
              <TouchableOpacity
                key={seller.id}
                onPress={() => toggleSelect(seller.id)}
                style={[
                  styles.tableRow,
                  { paddingHorizontal: 16 },
                  idx % 2 === 1 && styles.tableRowAlt,
                  selectedIds.has(seller.id) && styles.tableRowSelected,
                ]}
                activeOpacity={0.8}
              >
                <View style={{ width: 36 }}>
                  <BsIcon
                    name={selectedIds.has(seller.id) ? 'check-square' : 'square'}
                    size={16}
                    color={selectedIds.has(seller.id) ? '#4F46E5' : '#9CA3AF'}
                  />
                </View>
                <Text style={[styles.tableCell, { fontSize: fontSize.sm, flex: 2, fontWeight: '600', paddingRight: 24 }]}>
                  {seller.businessName}
                </Text>
                <Text style={[styles.tableCell, { fontSize: fontSize.sm, flex: 1, paddingRight: 24 }]}>{seller.contactPerson}</Text>
                <Text style={[styles.tableCell, { fontSize: fontSize.sm, flex: 1, paddingRight: 24 }]}>{seller.phone}</Text>
                <Text style={[styles.tableCell, { fontSize: fontSize.sm, flex: 1, paddingRight: 24 }]}>{seller.city}</Text>
                <Text style={[styles.tableCell, { fontSize: fontSize.sm, flex: 1, paddingRight: 24 }]}>{seller.state}</Text>
                <View style={[styles.tableCell, { flex: 1 }]}>
                  <View style={styles.statusBadgeRed}>
                    <Text style={[styles.statusBadgeText, { fontSize: fontSize.xs }]}>Not Uploaded</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Mark as Uploaded CTA */}
      <View style={[styles.markUploadedBar, { paddingHorizontal: contentPadding }]}>
        <TouchableOpacity
          style={[
            styles.btnSuccess,
            { paddingVertical: isMobile ? 10 : 12, paddingHorizontal: isMobile ? 16 : 20 },
            selectedIds.size === 0 && styles.btnDisabled,
          ]}
          onPress={handleMarkUploaded}
          disabled={markingUploaded || selectedIds.size === 0}
          activeOpacity={0.8}
        >
          {markingUploaded ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <BsIcon name="check2" size={15} color="#fff" />
              <Text style={[styles.btnSuccessText, { fontSize: fontSize.sm, marginLeft: 6 }]}>
                Mark Selected as Uploaded
              </Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={[styles.markUploadedHint, { fontSize: fontSize.xs, marginLeft: 12, flex: 1 }]}>
          Select sellers after successfully uploading them to Shiprocket
        </Text>
      </View>
    </View>
  );

  // Recently uploaded sellers
  const renderUploadedSellers = () => (
    <View style={[styles.section, { marginHorizontal: contentPadding, marginTop: 20, marginBottom: 32, borderRadius: cardRadius }]}>
      <View style={styles.sectionHeaderUploaded}>
        <BsIcon name="check-circle" size={15} color="#EA580C" />
        <Text style={[styles.sectionTitle, { fontSize: fontSize.base, marginLeft: 6 }]}>
          Recently Uploaded Profile Completed Sellers
        </Text>
      </View>
      <Text style={[styles.sectionSubtitle, { fontSize: fontSize.xs, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 }]}>
        These profile completed sellers have already been uploaded to Shiprocket
      </Text>

      {isMobile || isTablet ? (
        // Card view
        <View style={{ padding: 12 }}>
          {uploadedSellers.map((seller) => (
            <View key={seller.id} style={[styles.sellerCard, { borderRadius: cardRadius - 2, marginBottom: 10 }]}>
              <View style={styles.sellerCardHeader}>
                <Text style={[styles.sellerCardName, { fontSize: fontSize.base }]}>
                  {seller.businessName}
                </Text>
                <View style={styles.statusBadgeGreen}>
                  <Text style={[styles.statusBadgeText, { fontSize: fontSize.xs }]}>✔ Uploaded</Text>
                </View>
              </View>
              <View style={styles.sellerCardBody}>
                <View style={styles.sellerCardRow}>
                  <BsIcon name="person" size={13} color="#6B7280" />
                  <Text style={[styles.sellerCardMeta, { fontSize: fontSize.sm }]}> {seller.contactPerson}</Text>
                </View>
                <View style={styles.sellerCardRow}>
                  <BsIcon name="geo-alt" size={13} color="#6B7280" />
                  <Text style={[styles.sellerCardMeta, { fontSize: fontSize.sm }]}> {seller.city}, {seller.state}</Text>
                </View>
                <View style={styles.sellerCardRow}>
                  <BsIcon name="calendar" size={13} color="#6B7280" />
                  <Text style={[styles.sellerCardMeta, { fontSize: fontSize.sm }]}> {seller.uploadedAt}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        // Table view
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ minWidth: '100%' }}>
          <View style={{ width: '100%', minWidth: isLaptop ? 750 : 950 }}>
            <View style={[styles.tableHead, { paddingHorizontal: 16 }]}>
              {['Business Name', 'Contact Person', 'City', 'State', 'Uploaded At', 'Status'].map((h) => (
                <Text key={h} style={[styles.tableHeadCell, { fontSize: fontSize.xs, flex: h === 'Business Name' ? 2 : 1 }]}>
                  {h}
                </Text>
              ))}
            </View>
            {uploadedSellers.map((seller, idx) => (
              <View
                key={seller.id}
                style={[styles.tableRow, { paddingHorizontal: 16 }, idx % 2 === 1 && styles.tableRowAlt]}
              >
                <Text style={[styles.tableCell, { fontSize: fontSize.sm, flex: 2, fontWeight: '600', color: '#1E3A5F' }]}>
                  {seller.businessName}
                </Text>
                <Text style={[styles.tableCell, { fontSize: fontSize.sm, flex: 1, paddingRight: 24 }]}>{seller.contactPerson}</Text>
                <Text style={[styles.tableCell, { fontSize: fontSize.sm, flex: 1, paddingRight: 24 }]}>{seller.city}</Text>
                <Text style={[styles.tableCell, { fontSize: fontSize.sm, flex: 1, paddingRight: 24 }]}>{seller.state}</Text>
                <Text style={[styles.tableCell, { fontSize: fontSize.sm, flex: 1, color: '#6B7280' }]}>{seller.uploadedAt}</Text>
                <View style={[styles.tableCell, { flex: 1 }]}>
                  <View style={styles.statusBadgeGreen}>
                    <Text style={[styles.statusBadgeText, { fontSize: fontSize.xs }]}>✔ Uploaded</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <View style={styles.root}>
        {/* Header */}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Page header */}
          <View style={[styles.pageHeaderWrapper, { paddingHorizontal: contentPadding, paddingTop: 20, paddingBottom: isMobile ? 20 : 68 }]}>
            {renderHeader()}
          </View>

          {loadError ? (
            <Text style={{ color: '#DC2626', marginHorizontal: contentPadding, marginTop: 8 }}>{loadError}</Text>
          ) : null}

          {loading ? (
            <ActivityIndicator size="large" color="#F97316" style={{ marginTop: 24 }} />
          ) : null}

          {/* Stats */}
          {!loading ? renderStatCards() : null}

          {/* Steps guide */}
          {!loading ? renderStepsGuide() : null}

          {/* Pending sellers */}
          {!loading ? renderPendingSellers() : null}

          {/* Uploaded sellers */}
          {!loading ? renderUploadedSellers() : null}
        </ScrollView>
      </View>
    </AdminLayout>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F3F4F8',
  },
  topAccentBar: {
    height: 6,
    backgroundColor: '#B45309',
  },
  scroll: {
    flex: 1,
  },

  pageHeaderWrapper: {
    backgroundColor: '#151D4F',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginHorizontal: 24,
    marginTop: 24,
    borderRadius: 22,
  },
  header: { marginHorizontal: 2, marginTop: 12, borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    flex: 1,
    gap: 8,
  },
  headerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#B45309',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  breadcrumbLink: {
    color: '#94A3B8',
  },
  breadcrumbSep: {
    color: '#64748B',
  },
  breadcrumbCurrent: {
    color: '#CBD5E1',
    fontWeight: '500',
  },
  profileBadge: {
    backgroundColor: '#FFEDD5',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  profileBadgeText: {
    color: '#C2410C',
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  headerActionsMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },

  // ── Buttons ──────────────────────────────────────────────────────────────
  btnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  btnOutlineText: {
    color: '#374151',
    fontWeight: '600',
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#B45309',
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: '700',
  },
  btnSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#EA580C',
  },
  btnSuccessText: {
    color: '#fff',
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.45,
  },

  // ── Stat Cards ───────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  statsRowMobile: {
    flexDirection: 'column',
  },
  statCard: {
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statCardPending: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  statCardUploaded: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  statCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statLabel: {
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontWeight: '800',
    color: '#1E3A5F',
    lineHeight: 48,
  },
  statValueGreen: {
    color: '#EA580C',
  },
  statSubLabel: {
    color: '#9CA3AF',
    marginTop: 2,
  },

  // ── Steps Guide ──────────────────────────────────────────────────────────
  stepsCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 16,
  },
  stepsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepsTitle: {
    fontWeight: '700',
    color: '#1E3A5F',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNum: {
    color: '#fff',
    fontWeight: '700',
    lineHeight: 18,
  },
  stepText: {
    color: '#374151',
    lineHeight: 20,
  },
  stepBold: {
    fontWeight: '700',
    color: '#1E3A5F',
  },
  stepSubRow: {
    flexDirection: 'row',
    marginTop: 3,
    marginLeft: 8,
  },
  stepSubBullet: {
    color: '#6B7280',
  },
  stepSubText: {
    color: '#6B7280',
    flex: 1,
    lineHeight: 18,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 10,
  },
  noteText: {
    color: '#92400E',
    flex: 1,
    lineHeight: 18,
  },

  // ── Section ──────────────────────────────────────────────────────────────
  section: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionHeaderPending: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionHeaderUploaded: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#1E3A5F',
  },
  sectionSubtitle: {
    color: '#6B7280',
  },

  // ── Table ────────────────────────────────────────────────────────────────
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 10,
  },
  tableHeadCell: {
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingRight: 16,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableRowAlt: {
    backgroundColor: '#FAFAFA',
  },
  tableRowSelected: {
    backgroundColor: '#EEF2FF',
  },
  tableCell: {
    color: '#374151',
    paddingRight: 16,
  },

  // ── Seller Cards (mobile/tablet) ─────────────────────────────────────────
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 10,
  },
  selectAllText: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  sellerCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    backgroundColor: '#FAFAFA',
  },
  sellerCardSelected: {
    borderColor: '#818CF8',
    backgroundColor: '#EEF2FF',
  },
  sellerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  sellerCardName: {
    fontWeight: '700',
    color: '#1E3A5F',
    flex: 1,
  },
  sellerCardBody: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 5,
  },
  sellerCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  sellerCardMeta: {
    color: '#6B7280',
  },

  // ── Status Badges ─────────────────────────────────────────────────────────
  statusBadgeRed: {
    backgroundColor: '#FEE2E2',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  statusBadgeGreen: {
    backgroundColor: '#FFEDD5',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  statusBadgeText: {
    fontWeight: '600',
    color: '#374151',
  },

  // ── Mark Uploaded Bar ────────────────────────────────────────────────────
  markUploadedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    flexWrap: 'wrap',
    gap: 8,
  },
  markUploadedHint: {
    color: '#6B7280',
    fontStyle: 'italic',
  },
});

export default SellerShiprocket;