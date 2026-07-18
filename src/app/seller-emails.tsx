import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AdminLayout from '@/components/admin-layout';
import Pagination from '@/components/Pagination';
import { getApiErrorMessage } from '@/lib/api/client';
import { sweetError, sweetSuccess, sweetWarning } from '@/lib/sweetAlert';
import { formatDate } from '@/lib/format';
import { fetchSellers } from '@/services/sellerApi';
import { sendSellerEmails } from '@/services/emailApi';

// NOTE: adjust the AdminLayout import path above to match your project structure

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
  text: "#1E293B",
  textMuted: "#64748B",
  textFaint: "#94A3B8",
  emerald: "#059669",
  emeraldBg: "#ECFDF5",
  rose: "#E11D48",
  roseBg: "#FFF1F2",
  amber: "#D97706",
  amberBg: "#FFFBEB",
  orangeBg: "#FFF7ED",
  slate: '#64748B',
  slateSoft: '#F1F5F9',
  infoSoft: '#EFF6FF',
  infoText: '#3B82F6',
  white: '#ffffff',
};

const Animated = RNAnimated;

// -----------------------------
// Types
// -----------------------------
type SellerStatus = 'Active' | 'Email_pending' | 'Rejected';

interface Seller {
  id: number;
  name: string;
  email: string;
  business: string;
  status: SellerStatus;
  registeredOn: string;
}

function mapSellerStatus(raw?: string): SellerStatus {
  const s = String(raw ?? '').toLowerCase();
  if (s === 'active') return 'Active';
  if (s === 'rejected') return 'Rejected';
  if (s === 'email_pending' || s === 'pending') return 'Email_pending';
  return 'Email_pending';
}

function mapSellerRow(s: {
  id: number;
  fullName?: string;
  email?: string;
  businessName?: string;
  status?: string;
  createdAt?: string;
}): Seller {
  return {
    id: s.id,
    name: s.fullName ?? `Seller #${s.id}`,
    email: s.email ?? '',
    business: s.businessName?.trim() || 'N/A',
    status: mapSellerStatus(s.status),
    registeredOn: formatDate(s.createdAt),
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
  return { width, isTablet, isLaptop, isDesktop };
}

// -----------------------------
// Status pill
// -----------------------------
function StatusPill({ status }: { status: SellerStatus }) {
  const map: Record<SellerStatus, { bg: string; fg: string; label: string; icon: any }> = {
    Active: { bg: COLORS.emeraldBg, fg: COLORS.emerald, label: 'Active', icon: 'check-circle' },
    Email_pending: { bg: COLORS.amberBg, fg: COLORS.amber, label: 'Email pending', icon: 'clock' },
    Rejected: { bg: COLORS.roseBg, fg: COLORS.rose, label: 'Rejected', icon: 'x-circle' },
  };
  const c = map[status];
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <Feather name={c.icon} size={11} color={c.fg} />
      <Text style={[styles.pillText, { color: c.fg }]}>{c.label}</Text>
    </View>
  );
}

// -----------------------------
// Stat Card component
// -----------------------------
function StatCard({
  icon,
  value,
  label,
  tint,
  tintBg,
  isMobile,
}: {
  icon: keyof typeof Feather.glyphMap;
  value: string;
  label: string;
  tint: string;
  tintBg: string;
  isMobile: boolean;
}) {
  return (
    <View style={[
      styles.statCard, 
      isMobile ? styles.statCardMobile : styles.statCardDesktop
    ]}>
      {isMobile ? (
        <>
          <View style={[styles.statIconBox, styles.statIconBoxMobile, { backgroundColor: tintBg }]}>
            <Feather name={icon} size={14} color={tint} />
          </View>
          <Text style={[styles.statValue, styles.statValueMobile, { color: tint }]}>{value}</Text>
          <Text style={styles.statLabelMobile} numberOfLines={1}>{label}</Text>
        </>
      ) : (
        <>
          <View style={styles.statCardTopRow}>
            <View style={[styles.statIconBox, { backgroundColor: tintBg }]}>
              <Feather name={icon} size={15} color={tint} />
            </View>
            <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
          </View>
          <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
        </>
      )}
    </View>
  );
}

// -----------------------------
// Email composer modal (shared by single + bulk send)
// -----------------------------
interface EmailModalProps {
  visible: boolean;
  onClose: () => void;
  mode: 'single' | 'bulk';
  seller?: Seller | null;
  sellerCount: number;
  onSend: (subject: string, message: string) => void;
  isDesktop: boolean;
  isMobile?: boolean;
}

function EmailModal({ visible, onClose, mode, seller, sellerCount, onSend, isDesktop, isMobile }: EmailModalProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const reset = () => {
    setSubject('');
    setMessage('');
  };

  const handleSend = () => {
    if (!subject.trim() || !message.trim()) {
      void sweetWarning('Missing information', 'Please enter a subject and message.');
      return;
    }
    onSend(subject, message);
    reset();
  };

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, isMobile && { justifyContent: 'flex-end', padding: 0 }]}>
        <View style={[
          styles.modalCard, 
          isDesktop && styles.modalCardWide,
          isMobile && { borderRadius: 0, borderTopLeftRadius: 22, borderTopRightRadius: 22 }
        ]}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderTitleRow}>
              <View style={styles.modalIconBadge}>
                <Feather name="send" size={14} color={COLORS.orange} />
              </View>
              <Text style={styles.modalHeaderTitle}>{mode === 'single' ? 'Send Email' : 'Send Email to All Sellers'}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color={COLORS.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
            {mode === 'single' && seller ? (
              <View style={styles.recipientBox}>
                <Text style={styles.recipientLabel}>To</Text>
                <Text style={styles.recipientValue}>
                  {seller.name} ({seller.email})
                </Text>
              </View>
            ) : (
              <View style={styles.infoBanner}>
                <Feather name="info" size={15} color={COLORS.infoText} />
                <Text style={styles.infoBannerText}>
                  This email will be sent to all <Text style={styles.infoBannerBold}>{sellerCount} registered sellers</Text>.
                </Text>
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Subject</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter email subject"
                placeholderTextColor={COLORS.textMuted}
                value={subject}
                onChangeText={setSubject}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Message</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Enter your message (HTML supported)"
                placeholderTextColor={COLORS.textMuted}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={7}
                textAlignVertical="top"
              />
              <Text style={styles.helperText}>You can use HTML tags for formatting</Text>
            </View>

            <View style={styles.modalFooter}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => {
                  reset();
                  onClose();
                }}
              >
                <Feather name="x" size={15} color={COLORS.textMuted} />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.submitButton} onPress={handleSend}>
                <Feather name="send" size={14} color={COLORS.white} />
                <Text style={styles.submitButtonText}>{mode === 'single' ? 'Send Email' : 'Send to All'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </RNModal>
  );
}

// -----------------------------
// Main Screen
// -----------------------------
export default function SellerEmailsScreen() {
  const { isTablet, isLaptop, isDesktop } = useBreakpoint();

  const [sellers, setSellers] = useState<Seller[]>([]);
  const [totalSellersCount, setTotalSellersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const page = await fetchSellers({ size: 200 });
        if (cancelled) return;
        setSellers((page.items ?? []).map(mapSellerRow));
        setTotalSellersCount(Number(page.totalElements ?? page.items?.length ?? 0));
      } catch (e) {
        if (!cancelled) setLoadError(getApiErrorMessage(e, 'Failed to load sellers.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [emailMode, setEmailMode] = useState<'single' | 'bulk'>('single');
  const [activeSeller, setActiveSeller] = useState<Seller | null>(null);

  const filteredSellers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sellers;
    return sellers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.business && s.business.toLowerCase().includes(q))
    );
  }, [search, sellers]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredSellers.length / itemsPerPage));
  const paginatedSellers = useMemo(() => {
    return filteredSellers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredSellers, currentPage, itemsPerPage]);

  useEffect(() => { setCurrentPage(1); }, [search]);

  const openSingleEmail = (seller: Seller) => {
    setActiveSeller(seller);
    setEmailMode('single');
    setEmailModalVisible(true);
  };

  const openBulkEmail = () => {
    setActiveSeller(null);
    setEmailMode('bulk');
    setEmailModalVisible(true);
  };

  const handleSend = async (subject: string, message: string) => {
    try {
      if (emailMode === 'single' && activeSeller) {
        await sendSellerEmails({ subject, message, recipients: [activeSeller.id] });
        void sweetSuccess('Email sent', `Your message was sent to ${activeSeller.name}.`);
      } else {
        await sendSellerEmails({ subject, message, sendAll: true });
        void sweetSuccess('Emails queued', `Your message is being sent to all ${sellers.length} registered sellers.`);
      }
      setEmailModalVisible(false);
    } catch (e) {
      void sweetError('Send failed', getApiErrorMessage(e, 'Failed to send email.'));
    }
  };

  const totalSellers = totalSellersCount > 0 ? totalSellersCount : sellers.length;

  const activeCount = sellers.filter((s) => s.status === 'Active').length;
  const pendingCount = sellers.filter((s) => s.status === 'Email_pending').length;
  const rejectedCount = sellers.filter((s) => s.status === 'Rejected').length;

  return (
    <AdminLayout>
      <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView style={{ width: "100%" }} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
        {/* Navy header */}
        <View style={[styles.hero, !isTablet && styles.heroMobile]}>
          <View style={styles.heroTopRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: !isTablet ? 8 : 12, flex: 1, marginRight: 8 }}>
              <View style={styles.heroIconBadge}>
                <Feather name="mail" size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>Seller Emails</Text>
                <Text style={styles.heroSubtitle} numberOfLines={2}>Manage and send emails to sellers</Text>
              </View>
            </View>
            {isTablet && (
              <TouchableOpacity
                style={styles.addHeaderBtn}
                onPress={openBulkEmail}
              >
                <Feather name="mail" size={15} color="#fff" />
                <Text style={styles.addHeaderBtnText}>Send to All</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={!isTablet ? styles.headerCardSpacerMobile : styles.headerCardSpacer} />
        </View>

        {/* Overlapping stat cards */}
        <View style={[
          styles.statsRow, 
          !isTablet && styles.statsRowMobile
        ]}>
          <StatCard icon="users" value={String(totalSellers)} label="Total Sellers" tint={COLORS.navy} tintBg="#EEF2F7" isMobile={!isTablet} />
          <StatCard icon="check-circle" value={String(activeCount)} label="Active" tint={COLORS.emerald} tintBg={COLORS.emeraldBg} isMobile={!isTablet} />
          <StatCard icon="clock" value={String(pendingCount)} label="Pending" tint={COLORS.amber} tintBg={COLORS.amberBg} isMobile={!isTablet} />
          <StatCard icon="x-circle" value={String(rejectedCount)} label="Rejected" tint={COLORS.rose} tintBg={COLORS.roseBg} isMobile={!isTablet} />
        </View>

        {/* Search + total strip */}
        <View style={[styles.searchStrip, !isTablet && styles.searchStripMobile]}>
          <View style={styles.searchInputWrap}>
            <Feather name="search" size={16} color={COLORS.textFaint} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search sellers..."
              placeholderTextColor={COLORS.textFaint}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {loading ? (
          <Text style={{ marginTop: 16, color: COLORS.textMuted, textAlign: 'center' }}>Loading sellers…</Text>
        ) : loadError ? (
          <Text style={{ marginTop: 16, color: COLORS.rose, textAlign: 'center' }}>{loadError}</Text>
        ) : null}

        {!loading && !loadError && (isLaptop ? (
          // ---- Desktop / laptop table ----
          <View style={styles.tableWrap}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, { flex: 0.4 }]}>ID</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.3 }]}>Name</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.7 }]}>Email</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.4 }]}>Business</Text>
              <Text style={[styles.tableHeaderCell, { flex: 0.9 }]}>Status</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Registered On</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Action</Text>
            </View>
            {paginatedSellers.map((s, idx) => (
              <View key={s.id} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                <Text style={[styles.tableCell, styles.tableCellMuted, { flex: 0.4 }]}>{s.id}</Text>
                <Text style={[styles.tableCellStrong, { flex: 1.3 }]}>{s.name}</Text>
                <View style={{ flex: 1.7, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Feather name="mail" size={12} color={COLORS.textMuted} />
                  <Text style={styles.tableCell} numberOfLines={1}>
                    {s.email}
                  </Text>
                </View>
                <Text style={[styles.tableCell, styles.tableCellMuted, { flex: 1.4 }]} numberOfLines={2}>
                  {s.business}
                </Text>
                <View style={{ flex: 0.9 }}>
                  <StatusPill status={s.status} />
                </View>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Feather name="calendar" size={12} color={COLORS.textMuted} />
                  <Text style={styles.tableCellMuted}>{s.registeredOn}</Text>
                </View>
                <View style={[styles.actionCell, { flex: 1 }]}>
                  <Pressable style={styles.sendEmailBtn} onPress={() => openSingleEmail(s)}>
                    <Feather name="send" size={12} color={COLORS.white} />
                    <Text style={styles.sendEmailBtnText}>Send</Text>
                  </Pressable>
                </View>
              </View>
            ))}
            {filteredSellers.length === 0 && (
              <View style={styles.emptyState}>
                <Feather name="search" size={26} color={COLORS.textMuted} />
                <Text style={styles.emptyStateTitle}>No sellers found</Text>
                <Text style={styles.emptyStateText}>Try a different search term.</Text>
              </View>
            )}
          </View>
        ) : (
          // ---- Mobile / tablet card list ----
          <View style={[styles.cardList, !isLaptop && isTablet && { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }]}>
            {paginatedSellers.map((s) => (
              <View key={s.id} style={[styles.sellerCard, !isLaptop && isTablet && { width: '48%', marginBottom: 12 }]}>
                <View style={styles.sellerCardTopRow}>
                  <View style={styles.sellerCardIdBadge}>
                    <Text style={styles.sellerCardIdText}>#{s.id}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <StatusPill status={s.status} />
                    <Pressable style={styles.sendEmailBtnSmall} onPress={() => openSingleEmail(s)}>
                      <Feather name="send" size={10} color={COLORS.orange} />
                      <Text style={styles.sendEmailBtnSmallText}>Send</Text>
                    </Pressable>
                  </View>
                </View>
                <Text style={styles.sellerCardName}>{s.name}</Text>
                <View style={styles.sellerCardRow}>
                  <Feather name="mail" size={13} color={COLORS.textMuted} />
                  <Text style={styles.sellerCardMeta} numberOfLines={1}>
                    {s.email}
                  </Text>
                </View>
                {s.business !== 'N/A' && (
                  <View style={styles.sellerCardRow}>
                    <Feather name="briefcase" size={13} color={COLORS.textMuted} />
                    <Text style={styles.sellerCardMeta} numberOfLines={2}>
                      {s.business}
                    </Text>
                  </View>
                )}
                <View style={styles.sellerCardRow}>
                  <Feather name="calendar" size={13} color={COLORS.textMuted} />
                  <Text style={styles.sellerCardMeta}>Registered {s.registeredOn}</Text>
                </View>
              </View>
            ))}
            {filteredSellers.length === 0 && (
              <View style={styles.emptyState}>
                <Feather name="search" size={26} color={COLORS.textMuted} />
                <Text style={styles.emptyStateTitle}>No sellers found</Text>
                <Text style={styles.emptyStateText}>Try a different search term.</Text>
              </View>
            )}
          </View>
        ))}

        {!loading && !loadError && filteredSellers.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredSellers.length}
            itemsPerPage={itemsPerPage}
            itemName="sellers"
            onPageChange={setCurrentPage}
          />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
      </View>

      {/* Mobile floating action button for bulk email */}
      {!isTablet && (
        <Pressable style={styles.fab} onPress={openBulkEmail}>
          <Feather name="mail" size={22} color={COLORS.white} />
        </Pressable>
      )}

      <EmailModal
        visible={emailModalVisible}
        onClose={() => setEmailModalVisible(false)}
        mode={emailMode}
        seller={activeSeller}
        sellerCount={totalSellers}
        onSend={handleSend}
        isDesktop={isDesktop}
        isMobile={!isTablet && !isLaptop && !isDesktop}
      />
    </AdminLayout>
  );
}

// -----------------------------
// Styles
// -----------------------------
const styles = StyleSheet.create({
  screenContent: {
    padding: 16,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 40,
  },

  hero: { backgroundColor: COLORS.navy, borderRadius: 20, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 0, overflow: "visible", zIndex: 1 },
  heroMobile: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 0 },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  heroIconBadge: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.orange, alignItems: "center", justifyContent: "center" },
  heroTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  heroSubtitle: { color: "#94A3B8", fontSize: 12, marginTop: 2, fontWeight: "400" },
  headerCardSpacer: { height: 38 },
  headerCardSpacerMobile: { height: 40 },
  addHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.orange,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    shadowColor: COLORS.orange,
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  addHeaderBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  statsRow: { flexDirection: "row", flexWrap: "nowrap", justifyContent: "center", gap: 10, marginTop: -20, paddingHorizontal: 2, zIndex: 10, elevation: 5 },
  statsRowMobile: { flexWrap: "nowrap", justifyContent: "space-between", gap: 5, marginTop: -24, paddingHorizontal: 0, zIndex: 10, elevation: 5 },
  statCard: { backgroundColor: COLORS.card, borderRadius: 16, paddingHorizontal: 13, paddingVertical: 12, borderWidth: 1, borderColor: "#F1F5F9", shadowColor: "#0F172A", shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  statCardDesktop: { flexGrow: 0, flexShrink: 0, width: 154 },
  statCardMobile: { flex: 1, minWidth: 0, borderRadius: 12, paddingHorizontal: 6, paddingVertical: 10, alignItems: "center", justifyContent: "center", gap: 4 },
  statCardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statIconBox: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  statIconBoxMobile: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 17, fontWeight: "700" },
  statValueMobile: { fontSize: 14, fontWeight: "800", marginTop: 2, textAlign: "center" },
  statLabel: { fontSize: 11, color: COLORS.textFaint, fontWeight: "500", marginTop: 7 },
  statLabelMobile: { fontSize: 10, color: COLORS.textMuted, fontWeight: "600", marginTop: 2, textAlign: "center" },

  searchStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 4,
    gap: 14,
    zIndex: 10,
  },
  searchStripMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
    marginTop: 16,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    outlineStyle: 'none',
  } as any,
  totalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  totalBadgeText: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: '700',
  },

  // Desktop table
  tableWrap: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginTop: 24,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: "#151D4F",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: '600',
    color: "#fff",
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F7FA",
  },
  tableRowAlt: {
    backgroundColor: '#F8FAFC',
  },
  tableCell: {
    fontSize: 12.5,
    color: COLORS.text,
  },
  tableCellStrong: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  tableCellMuted: {
    fontSize: 12.5,
    color: COLORS.textMuted,
  },
  actionCell: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },

  // Pills
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  pillText: {
    fontSize: 10,
    fontWeight: '600',
  },

  sendEmailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.orange,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
  },
  sendEmailBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.orange,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  sendEmailBtnSmallText: {
    color: COLORS.orange,
    fontSize: 10,
    fontWeight: '600',
  },
  sendEmailBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },

  // Mobile / tablet card list
  cardList: {
    marginTop: 24,
    gap: 8,
  },
  sellerCard: {
    borderWidth: 1,
    borderColor: "#F1F5F9",
    borderRadius: 14,
    padding: 14,
    backgroundColor: COLORS.card,
    shadowColor: "#0F172A",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sellerCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sellerCardIdBadge: {
    backgroundColor: COLORS.infoSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sellerCardIdText: {
    color: COLORS.infoText,
    fontSize: 11,
    fontWeight: '700',
  },
  sellerCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
  },
  sellerCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sellerCardMeta: {
    fontSize: 13,
    color: COLORS.textMuted,
    flex: 1,
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
    color: COLORS.text,
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
    shadowColor: COLORS.orange,
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
    maxWidth: 620,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalIconBadge: { 
    width: 30, 
    height: 30, 
    borderRadius: 9, 
    backgroundColor: '#FFF7ED', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  modalHeaderTitle: {
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: '700',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  recipientBox: {
    backgroundColor: COLORS.slateSoft,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  recipientLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textFaint,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  recipientValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: COLORS.infoSoft,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  infoBannerText: {
    fontSize: 13,
    color: COLORS.infoText,
    flexShrink: 1,
  },
  infoBannerBold: {
    fontWeight: '700',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  textArea: {
    minHeight: 140,
    paddingTop: 10,
  },
  helperText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 6,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: COLORS.slateSoft,
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
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