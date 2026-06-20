import React, { useCallback, useEffect, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api/client';
import { mapCategoryRequestRow } from '@/lib/mappers';
import {
  approveCategoryRequest,
  fetchCategoryRequests,
  fetchCategoryRequestStats,
  rejectCategoryRequest,
} from '@/services/categoryRequestApi';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  useWindowDimensions,
  TextInput,
  Platform,
} from 'react-native';
import AdminLayout from '@/components/admin-layout';
import Svg, { Path, Circle, Rect, G, Polyline } from 'react-native-svg';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type Status = 'Pending' | 'Approved' | 'Rejected';

interface CategoryRequest {
  id: string;
  numericId: number;
  categoryName: string;
  sellerName: string;
  sellerEmail: string;
  description: string;
  reason: string;
  status: Status;
  submitted: string;
  adminReason?: string;
}

// â”€â”€â”€ SVG Icons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const LayersIcon = ({ color = '#1E3A5F', size = 20 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2L2 7l10 5 10-5-10-5z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ClockIcon = ({ color = '#D97706' }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.8} />
    <Path d="M12 6v6l4 2" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const CheckCircleIcon = ({ color = '#16A34A' }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.8} />
    <Path d="M9 12l2 2 4-4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const XCircleIcon = ({ color = '#DC2626' }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.8} />
    <Path d="M15 9l-6 6M9 9l6 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const EyeIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={2} />
  </Svg>
);

const XIcon = ({ color = '#6B7280' }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Path d="M13.5 4.5L4.5 13.5M4.5 4.5L13.5 13.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const CheckIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M13.5 4.5L6.5 11.5L3 8" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const TotalIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="7" height="7" rx="1" stroke="#1E3A5F" strokeWidth={1.8} />
    <Rect x="14" y="3" width="7" height="7" rx="1" stroke="#1E3A5F" strokeWidth={1.8} />
    <Rect x="3" y="14" width="7" height="7" rx="1" stroke="#1E3A5F" strokeWidth={1.8} />
    <Rect x="14" y="14" width="7" height="7" rx="1" stroke="#1E3A5F" strokeWidth={1.8} />
  </Svg>
);

// â”€â”€â”€ Sample Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Loaded from /api/admin/category-requests

// â”€â”€â”€ Status Badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const statusConfig: Record<Status, { bg: string; text: string; dot: string }> = {
  Pending: { bg: '#FEF9C3', text: '#CA8A04', dot: '#CA8A04' },
  Approved: { bg: '#DCFCE7', text: '#16A34A', dot: '#16A34A' },
  Rejected: { bg: '#FEE2E2', text: '#DC2626', dot: '#DC2626' },
};

const StatusBadge = ({ status }: { status: Status }) => {
  const c = statusConfig[status];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: c.dot }]} />
      <Text style={[styles.badgeText, { color: c.text }]}>{status}</Text>
    </View>
  );
};

// â”€â”€â”€ Stat Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
  bg: string;
}

const StatCard = ({ label, value, icon, accent, bg }: StatCardProps) => (
  <View style={[styles.statCard, { borderTopColor: accent }]}>
    <View style={[styles.statIconWrap, { backgroundColor: bg }]}>{icon}</View>
    <View style={styles.statTextWrap}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  </View>
);

// â”€â”€â”€ View Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ViewModalProps {
  request: CategoryRequest | null;
  onClose: () => void;
  onUpdate: (id: string, status: 'Approved' | 'Rejected', reason: string) => void;
  isWeb: boolean;
}

const ViewModal = ({ request, onClose, onUpdate, isWeb }: ViewModalProps) => {
  const [adminReason, setAdminReason] = useState(request?.adminReason || '');
  const [actionTaken, setActionTaken] = useState<'Approved' | 'Rejected' | null>(null);

  React.useEffect(() => {
    setAdminReason(request?.adminReason || '');
    setActionTaken(null);
  }, [request]);

  if (!request) return null;

  const isPending = request.status === 'Pending';

  const handleAction = (action: 'Approved' | 'Rejected') => {
    if (!adminReason.trim()) return;
    onUpdate(request.id, action, adminReason);
    onClose();
  };

  return (
    <Modal visible={!!request} transparent animationType={isWeb ? 'fade' : 'slide'} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, isWeb ? styles.modalWeb : styles.modalMobile]}>
          {/* Handle for mobile */}
          {!isWeb && <View style={styles.mobileHandle} />}

          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View style={styles.modalIconWrap}>
                <LayersIcon color="#1E3A5F" size={18} />
              </View>
              <View>
                <Text style={styles.modalTitle}>Category Request</Text>
                <Text style={styles.modalSubtitle}>{request.id}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <XIcon />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Request Details */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Request Details</Text>
              <View style={styles.modalGrid}>
                <View style={styles.modalField}>
                  <Text style={styles.modalFieldLabel}>Category Name</Text>
                  <Text style={styles.modalFieldValue}>{request.categoryName}</Text>
                </View>
                <View style={styles.modalField}>
                  <Text style={styles.modalFieldLabel}>Status</Text>
                  <StatusBadge status={request.status} />
                </View>
                <View style={styles.modalField}>
                  <Text style={styles.modalFieldLabel}>Seller</Text>
                  <Text style={styles.modalFieldValue}>{request.sellerName}</Text>
                  <Text style={styles.modalFieldSub}>{request.sellerEmail}</Text>
                </View>
                <View style={styles.modalField}>
                  <Text style={styles.modalFieldLabel}>Submitted</Text>
                  <Text style={styles.modalFieldValue}>{request.submitted}</Text>
                </View>
              </View>
            </View>

            <View style={styles.modalDivider} />

            {/* Description */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Description</Text>
              <View style={styles.descBox}>
                <Text style={styles.descText}>{request.description}</Text>
              </View>
            </View>

            {/* Reason */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Seller's Reason</Text>
              <View style={styles.reasonBox}>
                <Text style={styles.reasonText}>{request.reason}</Text>
              </View>
            </View>

            <View style={styles.modalDivider} />

            {/* Admin Action Section */}
            {isPending ? (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Admin Decision</Text>
                <Text style={styles.adminReasonLabel}>
                  {actionTaken === 'Rejected' ? 'Reason for Rejection' : 'Reason for Approval'}
                  {!actionTaken ? ' (required before approving or rejecting)' : ''}
                </Text>
                <TextInput
                  style={styles.adminReasonInput}
                  placeholder="Enter your reason here..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  value={adminReason}
                  onChangeText={setAdminReason}
                  textAlignVertical="top"
                />
                {!adminReason.trim() && (
                  <Text style={styles.validationNote}>âš  Please enter a reason before taking action.</Text>
                )}

                {/* Action Buttons */}
                <View style={styles.actionBtnRow}>
                  <TouchableOpacity
                    style={[styles.rejectBtn, !adminReason.trim() && styles.btnDisabled]}
                    onPress={() => handleAction('Rejected')}
                    disabled={!adminReason.trim()}
                  >
                    <XIcon color="#FFFFFF" />
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.approveBtn, !adminReason.trim() && styles.btnDisabled]}
                    onPress={() => handleAction('Approved')}
                    disabled={!adminReason.trim()}
                  >
                    <CheckIcon />
                    <Text style={styles.approveBtnText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>
                  {request.status === 'Approved' ? 'Reason for Approval' : 'Reason for Rejection'}
                </Text>
                <View style={[
                  styles.adminDecisionBox,
                  { borderLeftColor: request.status === 'Approved' ? '#16A34A' : '#DC2626' }
                ]}>
                  <Text style={styles.adminDecisionText}>
                    {request.adminReason || 'â€”'}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// â”€â”€â”€ Main Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function CategoryRequests() {
  const { width } = useWindowDimensions();
  const isWeb = width >= 768;

  const [requests, setRequests] = useState<CategoryRequest[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'All' | Status>('All');
  const [selectedRequest, setSelectedRequest] = useState<CategoryRequest | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoadError(null);
      const statusParam = filter === 'All' ? undefined : filter.toLowerCase();
      const [listRes, statsRes] = await Promise.all([
        fetchCategoryRequests(statusParam, 0, 200),
        fetchCategoryRequestStats(),
      ]);
      setRequests((listRes.items ?? []).map(mapCategoryRequestRow));
      setStats({
        total: Number(statsRes.total ?? 0),
        pending: Number(statsRes.pending ?? 0),
        approved: Number(statsRes.approved ?? 0),
        rejected: Number(statsRes.rejected ?? 0),
      });
    } catch (e) {
      setLoadError(getApiErrorMessage(e));
      setRequests([]);
    }
  }, [filter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = requests;

  const handleUpdate = (id: string, status: 'Approved' | 'Rejected', reason: string) => {
    const row = requests.find((r) => r.id === id);
    if (!row) return;
    void (async () => {
      try {
        if (status === 'Approved') {
          await approveCategoryRequest(row.numericId, reason);
        } else {
          await rejectCategoryRequest(row.numericId, reason);
        }
        await loadData();
      } catch (e) {
        setLoadError(getApiErrorMessage(e));
      }
    })();
  };

  const FILTERS: Array<'All' | Status> = ['All', 'Pending', 'Approved', 'Rejected'];

  return (
    <AdminLayout>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.rootContent}
        showsVerticalScrollIndicator={false}
      >
        {loadError ? (
          <Text style={{ color: '#DC2626', marginBottom: 12 }}>{loadError}</Text>
        ) : null}

        {/* Page Header */}
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <View style={styles.pageIconWrap}>
              <LayersIcon color="#1E3A5F" size={20} />
            </View>
            <View>
              <Text style={styles.pageTitle}>Category Requests</Text>
              <Text style={styles.pageSubtitle}>Review and manage seller category requests</Text>
            </View>
          </View>
        </View>

        {/* â”€â”€ Stats Cards â”€â”€ */}
        <View style={[styles.statsRow, isWeb && styles.statsRowWeb]}>
          <StatCard
            label="Total Requests"
            value={stats.total}
            icon={<TotalIcon />}
            accent="#1E3A5F"
            bg="#EBF0F8"
          />
          <StatCard
            label="Pending"
            value={stats.pending}
            icon={<ClockIcon color="#D97706" />}
            accent="#F59E0B"
            bg="#FEF9C3"
          />
          <StatCard
            label="Approved"
            value={stats.approved}
            icon={<CheckCircleIcon color="#16A34A" />}
            accent="#16A34A"
            bg="#DCFCE7"
          />
          <StatCard
            label="Rejected"
            value={stats.rejected}
            icon={<XCircleIcon color="#DC2626" />}
            accent="#DC2626"
            bg="#FEE2E2"
          />
        </View>

        {/* â”€â”€ Filter Tabs â”€â”€ */}
        <View style={styles.filterRow}>
          {FILTERS.map((f) => {
            const count = f === 'All'
              ? requests.length
              : requests.filter((r) => r.status === f).length;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterTab, filter === f && styles.filterTabActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
                  {f}
                </Text>
                <View style={[styles.filterCount, filter === f && styles.filterCountActive]}>
                  <Text style={[styles.filterCountText, filter === f && styles.filterCountTextActive]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* â”€â”€ Web Table / Mobile Cards â”€â”€ */}
        {isWeb ? (
          <View style={styles.tableWrapper}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { width: 80 }]}>ID</Text>
              <Text style={[styles.th, { width: 130 }]}>Category</Text>
              <Text style={[styles.th, { flex: 1.4 }]}>Seller</Text>
              <Text style={[styles.th, { flex: 2 }]}>Description</Text>
              <Text style={[styles.th, { flex: 1.5 }]}>Reason</Text>
              <Text style={[styles.th, { width: 100 }]}>Status</Text>
              <Text style={[styles.th, { width: 120 }]}>Submitted</Text>
              <Text style={[styles.th, { width: 80, textAlign: 'center' }]}>Actions</Text>
            </View>

            {/* Table Rows */}
            {filtered.map((req, idx) => (
              <View key={req.id} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                <Text style={[styles.td, { width: 80 }, styles.tdId]}>{req.id}</Text>
                <View style={{ width: 130, paddingVertical: 14, paddingHorizontal: 12, justifyContent: 'center' }}>
                  <Text style={styles.tdCategoryName}>{req.categoryName}</Text>
                </View>
                <View style={{ flex: 1.4, paddingVertical: 14, paddingHorizontal: 12 }}>
                  <Text style={styles.tdSellerName}>{req.sellerName}</Text>
                  <Text style={styles.tdSellerEmail} numberOfLines={1}>{req.sellerEmail}</Text>
                </View>
                <Text style={[styles.td, { flex: 2 }]}>{req.description}</Text>
                <Text style={[styles.td, { flex: 1.5 }]}>{req.reason}</Text>
                <View style={{ width: 100, paddingVertical: 14, paddingHorizontal: 12, justifyContent: 'center' }}>
                  <StatusBadge status={req.status} />
                </View>
                <Text style={[styles.td, { width: 120 }, styles.tdMuted]}>{req.submitted}</Text>
                <View style={{ width: 80, alignItems: 'center', justifyContent: 'center' }}>
                  <TouchableOpacity
                    style={styles.viewBtn}
                    onPress={() => setSelectedRequest(req)}
                  >
                    <EyeIcon />
                    <Text style={styles.viewBtnText}>View</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {filtered.length === 0 && (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>No requests match this filter</Text>
              </View>
            )}
          </View>
        ) : (
          /* Mobile Cards */
          <View style={styles.cardList}>
            {filtered.map((req) => (
              <View key={req.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardTopLeft}>
                    <Text style={styles.cardId}>{req.id}</Text>
                    <View style={styles.cardCategoryTag}>
                      <LayersIcon color="#1E3A5F" size={12} />
                      <Text style={styles.cardCategoryText}>{req.categoryName}</Text>
                    </View>
                  </View>
                  <StatusBadge status={req.status} />
                </View>

                <Text style={styles.cardDesc} numberOfLines={2}>{req.description}</Text>

                <View style={styles.cardDivider} />

                <View style={styles.cardMeta}>
                  <View style={styles.cardMetaRow}>
                    <Text style={styles.cardMetaLabel}>Seller</Text>
                    <Text style={styles.cardMetaValue}>{req.sellerName}</Text>
                  </View>
                  <View style={styles.cardMetaRow}>
                    <Text style={styles.cardMetaLabel}>Submitted</Text>
                    <Text style={styles.cardMetaValue}>{req.submitted}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.cardViewBtn}
                  onPress={() => setSelectedRequest(req)}
                >
                  <EyeIcon />
                  <Text style={styles.cardViewBtnText}>View Details</Text>
                </TouchableOpacity>
              </View>
            ))}

            {filtered.length === 0 && (
              <View style={styles.emptyState}>
                <LayersIcon color="#D1D5DB" size={40} />
                <Text style={styles.emptyTitle}>No requests found</Text>
                <Text style={styles.emptySubtitle}>Try a different filter</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* â”€â”€ View Modal â”€â”€ */}
      <ViewModal
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onUpdate={handleUpdate}
        isWeb={isWeb}
      />
    </AdminLayout>
  );
}

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  rootContent: {
    padding: 20,
    paddingBottom: 48,
  },

  // Page Header
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    backgroundColor: '#151D4F',
    padding: 20,
    borderRadius: 14,
  },
  pageHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pageIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EBF0F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },

  // Stats
  statsRow: {
    flexDirection: 'column',
    gap: 12,
    marginBottom: 20,
  },
  statsRowWeb: {
    flexDirection: 'row',
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTextWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },

  // Filter Tabs
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterTabActive: {
    backgroundColor: '#1E3A5F',
    borderColor: '#1E3A5F',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  filterCount: {
    minWidth: 22,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  filterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  filterCountTextActive: {
    color: '#FFFFFF',
  },

  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Table
  tableWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F4F9',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  th: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    alignItems: 'center',
    paddingBottom: 16,
    marginBottom: 8,
  },
  tableRowAlt: {
    backgroundColor: '#FAFAFA',
  },
  td: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#374151',
  },
  tdId: {
    fontWeight: '700',
    color: '#1E3A5F',
    fontSize: 12,
  },
  tdCategoryName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  tdSellerName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  tdSellerEmail: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  tdMuted: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1E3A5F',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  viewBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyRow: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },

  // Mobile Cards
  cardList: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTopLeft: {
    gap: 6,
    flex: 1,
    marginRight: 10,
  },
  cardId: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A5F',
  },
  cardCategoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EBF0F8',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  cardCategoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E3A5F',
  },
  cardDesc: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 19,
    marginBottom: 12,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 12,
  },
  cardMeta: {
    gap: 8,
    marginBottom: 14,
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardMetaLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  cardMetaValue: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  cardViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1E3A5F',
    borderRadius: 10,
    paddingVertical: 11,
  },
  cardViewBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    width: '100%',
  },
  modalWeb: {
    width: 620,
    maxHeight: '85%',
    borderRadius: 18,
    alignSelf: 'center',
    position: 'absolute',
    top: '7%',
  },
  modalMobile: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '90%',
    paddingBottom: 32,
  },
  mobileHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EBF0F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: 22,
  },
  modalSection: {
    marginBottom: 18,
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  modalGrid: {
    gap: 12,
  },
  modalField: {
    gap: 4,
  },
  modalFieldLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  modalFieldValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  modalFieldSub: {
    fontSize: 12,
    color: '#6B7280',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 16,
  },
  descBox: {
    backgroundColor: '#F8F9FB',
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#1E3A5F',
  },
  descText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 21,
  },
  reasonBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  reasonText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 21,
  },

  // Admin Action
  adminReasonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  adminReasonInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    fontSize: 14,
    color: '#111827',
    minHeight: 110,
    outlineStyle: 'none',
  } as any,
  validationNote: {
    fontSize: 12,
    color: '#F59E0B',
    marginTop: 6,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 13,
  },
  rejectBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#16A34A',
    borderRadius: 10,
    paddingVertical: 13,
  },
  approveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  adminDecisionBox: {
    backgroundColor: '#F8F9FB',
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 3,
  },
  adminDecisionText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 21,
  },
});
