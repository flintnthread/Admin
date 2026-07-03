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
import Pagination from '@/components/Pagination';
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

const ClockIcon = ({ color = '#D97706', size = 20 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.8} />
    <Path d="M12 6v6l4 2" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const CheckCircleIcon = ({ color = '#16A34A', size = 20 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.8} />
    <Path d="M9 12l2 2 4-4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const XCircleIcon = ({ color = '#DC2626', size = 20 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
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

const SearchIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="#9CA3AF" strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const ChevronDownIcon = ({ color = '#374151' }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const TotalIcon = ({ size = 20, color = '#1E3A5F' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth={1.8} />
    <Rect x="14" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth={1.8} />
    <Rect x="3" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth={1.8} />
    <Rect x="14" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth={1.8} />
  </Svg>
);

// —————————————————————————————————————————————————————— Sample Data ——————————————————————————————————————————————————————————————
  // Loaded from /api/admin/category-requests

// —————————————————————————————————————————————————————— Status Badge ——————————————————————————————————————————————————————————————

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

          <ScrollView style={styles.modalBody} contentContainerStyle={!isWeb ? { paddingBottom: 60 } : undefined} showsVerticalScrollIndicator={false}>
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

//  Main Screen 

export default function CategoryRequests() {
  const { width } = useWindowDimensions();
  const isWeb = width >= 768;

  const [requests, setRequests] = useState<CategoryRequest[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'All' | Status>('All');
  const [search, setSearch] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CategoryRequest | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

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

  const filtered = requests.filter(req => {
    if (filter !== 'All' && req.status !== filter) return false;
    if (searchQ) {
      const q = searchQ.toLowerCase();
      return (
        req.id.toLowerCase().includes(q) ||
        req.categoryName.toLowerCase().includes(q) ||
        req.sellerName.toLowerCase().includes(q) ||
        req.sellerEmail.toLowerCase().includes(q) ||
        req.description.toLowerCase().includes(q) ||
        req.reason.toLowerCase().includes(q)
      );
    }
    return true;
  });
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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

  const getFilterCount = (f: 'All' | Status) => {
    switch (f) {
      case 'All': return stats.total;
      case 'Pending': return stats.pending;
      case 'Approved': return stats.approved;
      case 'Rejected': return stats.rejected;
      default: return 0;
    }
  };

  const cardWidth = isWeb ? undefined : (width - 32 - 8) / 2;

  const filterTabsMobile = FILTERS.map((f) => {
    const count = getFilterCount(f);
    return (
      <TouchableOpacity
        key={f}
        style={[styles.filterTab, filter === f && styles.filterTabActive, styles.filterTabMobile]}
        onPress={() => {
          setFilter(f);
          setCurrentPage(1);
        }}
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
  });

  const filterTabsWeb = (
    <View style={styles.filterContainerWeb}>
      {FILTERS.map((f, i) => {
        const count = getFilterCount(f);
        const isActive = filter === f;
        
        // Only show divider if neither this tab nor the next tab is active, and it's not the last tab
        const isNextActive = i < FILTERS.length - 1 && filter === FILTERS[i + 1];
        const showDivider = !isActive && !isNextActive && i !== FILTERS.length - 1;

        return (
          <React.Fragment key={f}>
            <TouchableOpacity
              style={[styles.filterTabWeb, isActive && styles.filterTabWebActive]}
              onPress={() => {
                setFilter(f);
                setCurrentPage(1);
              }}
            >
              <Text style={[styles.filterTabTextWeb, isActive && styles.filterTabTextWebActive]}>
                {f}
              </Text>
              <View style={[styles.filterCountWeb, isActive && styles.filterCountWebActive]}>
                <Text style={[styles.filterCountTextWeb, isActive && styles.filterCountTextWebActive]}>
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
            {showDivider && <View style={styles.filterDividerWeb} />}
          </React.Fragment>
        );
      })}
    </View>
  );

  return (
    <AdminLayout>
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.rootContent, !isWeb && styles.rootContentMobile]}
        showsVerticalScrollIndicator={false}
      >
        {loadError ? (
          <Text style={{ color: '#DC2626', marginBottom: 12 }}>{loadError}</Text>
        ) : null}

        {/* ── Status Dropdown Modal (Mobile) ── */}
      <Modal visible={statusModalOpen} transparent animationType="fade" onRequestClose={() => setStatusModalOpen(false)}>
        <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setStatusModalOpen(false)}>
          <View style={styles.dropdownMenu}>
            {FILTERS.map(f => {
              const count = getFilterCount(f);
              const isActive = filter === f;
              return (
                <TouchableOpacity
                  key={f}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setFilter(f);
                    setCurrentPage(1);
                    setStatusModalOpen(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, isActive && styles.dropdownItemTextActive]}>
                    {f} ({count})
                  </Text>
                  {isActive && <CheckIcon color="#1E3A5F" />}
                </TouchableOpacity>
              )
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── View Modal ── */}
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <View style={styles.pageHeaderIcon}>
              <LayersIcon color="#FFFFFF" size={20} />
            </View>
            <View>
              <Text style={styles.pageTitle}>Category Requests</Text>
              <Text style={styles.pageSubTitle}>Manage seller category requests</Text>
            </View>
          </View>
        </View>

        {/* ── Stats Cards ── */}
        {isWeb ? (
          // Web: desktop-style full-width stat cards (icon+value row, label below)
          <View style={styles.statsRowWeb}>
            {[
              { icon: <TotalIcon color="#4F46E5" size={20} />, iconBg: '#EEF2FF', value: stats.total,      label: 'Total Requests', sub: 'All requests', valueColor: '#1d324e' },
              { icon: <ClockIcon color="#D97706" size={20} />,  iconBg: '#FEF9C3', value: stats.pending,    label: 'Pending',        sub: 'Awaiting review', valueColor: '#D97706' },
              { icon: <CheckCircleIcon color="#16A34A" size={20} />, iconBg: '#DCFCE7', value: stats.approved, label: 'Approved',       sub: 'Accepted requests', valueColor: '#16A34A' },
              { icon: <XCircleIcon color="#DC2626" size={20} />, iconBg: '#FEE2E2', value: stats.rejected,   label: 'Rejected',       sub: 'Declined requests', valueColor: '#DC2626' },
            ].map((item) => (
              <View key={item.label} style={styles.statCardWeb}>
                <View style={styles.statCardWebTop}>
                  <View style={[styles.statCardWebIconBox, { backgroundColor: item.iconBg }]}>{item.icon}</View>
                  <Text style={[styles.statCardWebValue, { color: item.valueColor }]} numberOfLines={1} adjustsFontSizeToFit>{item.value}</Text>
                </View>
                <Text style={styles.statCardWebLabel}>{item.label}</Text>
                <Text style={styles.statCardWebSub}>{item.sub}</Text>
              </View>
            ))}
          </View>
        ) : (
          // Mobile: compact stat cards
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.statCardIconBox, { backgroundColor: '#EEF2FF' }]}><TotalIcon color="#4F46E5" size={16} /></View>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{stats.total}</Text>
              <Text style={styles.statLabel} numberOfLines={1}>Total</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statCardIconBox, { backgroundColor: '#FEF9C3' }]}><ClockIcon color="#D97706" size={16} /></View>
              <Text style={[styles.statValue, { color: '#D97706' }]} numberOfLines={1} adjustsFontSizeToFit>{stats.pending}</Text>
              <Text style={styles.statLabel} numberOfLines={1}>Pending</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statCardIconBox, { backgroundColor: '#DCFCE7' }]}><CheckCircleIcon color="#16A34A" size={16} /></View>
              <Text style={[styles.statValue, { color: '#16A34A' }]} numberOfLines={1} adjustsFontSizeToFit>{stats.approved}</Text>
              <Text style={styles.statLabel} numberOfLines={1}>Approved</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statCardIconBox, { backgroundColor: '#FEE2E2' }]}><XCircleIcon color="#DC2626" size={16} /></View>
              <Text style={[styles.statValue, { color: '#DC2626' }]} numberOfLines={1} adjustsFontSizeToFit>{stats.rejected}</Text>
              <Text style={styles.statLabel} numberOfLines={1}>Rejected</Text>
            </View>
          </View>
        )}

        {/* ── Toolbar ── */}
        <View style={[styles.toolbarRow, isWeb && styles.toolbarRowWeb]}>
          <View style={[styles.searchBox, isWeb && styles.searchBoxWeb]}>
            <SearchIcon />
            <TextInput
              style={styles.searchInput as any}
              placeholder="Search requests..."
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={() => {
                setSearchQ(search);
                setCurrentPage(1);
              }}
              returnKeyType="search"
            />
          </View>
          
          {isWeb ? (
            <View style={styles.filterRowWeb}>
              {filterTabsWeb}
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.statusDropdownBtn}
              onPress={() => setStatusModalOpen(true)}
            >
              <Text style={styles.statusDropdownText} numberOfLines={1} adjustsFontSizeToFit>{filter === 'All' ? 'Status' : filter}</Text>
              <ChevronDownIcon />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Web Table / Mobile Cards ── */}
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
            {paginated.map((req, idx) => (
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
          <View style={[styles.cardList, !isWeb && styles.cardListMobile]}>
            {paginated.map((req) => (
              <View key={req.id} style={[styles.card, !isWeb && styles.cardMobile]}>
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

                <Text style={[styles.cardDesc, !isWeb && styles.cardDescMobile]} numberOfLines={2}>{req.description}</Text>

                <View style={[styles.cardDivider, !isWeb && styles.cardDividerMobile]} />

                <View style={[styles.cardMeta, !isWeb && styles.cardMetaMobile]}>
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
                  style={[styles.cardViewBtn, !isWeb && styles.cardViewBtnMobile]}
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

        {filtered.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(filtered.length / ITEMS_PER_PAGE)}
            totalItems={filtered.length}
            itemsPerPage={ITEMS_PER_PAGE}
            itemName="category requests"
            onPageChange={setCurrentPage}
          />
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

// â”€â”€â”€ Styles 

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  rootContent: {
    padding: 20,
    paddingBottom: 48,
  },
  rootContentMobile: {
    padding: 16,
    paddingBottom: 32,
  },

  // Page Header
  pageHeader: {
    marginBottom: 0,
    backgroundColor: "#151D4F", // Dark navy modified by user
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 42,
    borderRadius: 24,
    marginHorizontal: 2,
    marginTop: 12,
  },
  pageHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pageHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: "#F97316",
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  pageSubTitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    marginTop: 1,
  },

  // Stats
  // Mobile compact stat cards row
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 16,
    marginTop: -34,
    zIndex: 10,
    elevation: 5,
    paddingHorizontal: 4,
  },
  // Web desktop stat cards row
  statsRowWeb: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: -32,
    marginBottom: 14,
    zIndex: 10,
    elevation: 5,
  },
  statCardWeb: {
    flex: 1,
    minWidth: 130,
    maxWidth: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8E2D9',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  statCardWebTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statCardWebIconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardWebValue: {
    fontSize: 17,
    fontWeight: '800',
  },
  statCardWebLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C2B4A',
  },
  statCardWebSub: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 1,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  statCardIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E3A5F',
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Toolbar
  toolbarRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toolbarRowWeb: {
    marginBottom: 24,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchBoxWeb: {
    flex: 1.5, // Reduced from 2.2 to give filters more space
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    outlineStyle: "none",
  } as any,
  statusDropdownBtn: {
    width: '28%', // ~25-30% width
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    height: 44,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statusDropdownText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 20,
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 8,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 320,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  dropdownItemTextActive: {
    fontWeight: '700',
    color: '#1E3A5F',
  },

  // Filter Tabs
  filterRowWeb: {
    flex: 1.5, // Increased from 1 to give filters more space
  },
  filterContainerWeb: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  filterTabWeb: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  filterTabWebActive: {
    backgroundColor: '#151D4F',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  filterDividerWeb: {
    width: 1,
    height: '60%',
    backgroundColor: '#E5E7EB',
  },
  filterTabTextWeb: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  filterTabTextWebActive: {
    color: '#FFFFFF',
  },
  filterCountWeb: {
    minWidth: 24,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  filterCountWebActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  filterCountTextWeb: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  filterCountTextWebActive: {
    color: '#FFFFFF',
  },

  // Mobile Filter Tabs
  filterScrollMobile: {
    marginBottom: 16,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  filterRowMobile: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 32,
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
  filterTabMobile: {
    height: 44,
    paddingVertical: 0,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: '#151D4F',
    borderColor: '#151D4F',
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
    backgroundColor: '#151D4F',
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
  cardListMobile: {
    gap: 8,
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
  cardMobile: {
    borderRadius: 12,
    padding: 12,
    shadowOffset: { width: 0, height: 2 },
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
  cardDescMobile: {
    marginBottom: 8,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 12,
  },
  cardDividerMobile: {
    marginBottom: 8,
  },
  cardMeta: {
    gap: 8,
    marginBottom: 14,
  },
  cardMetaMobile: {
    marginBottom: 12,
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
    backgroundColor: '#151D4F',
    borderRadius: 10,
    paddingVertical: 11,
  },
  cardViewBtnMobile: {
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
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
