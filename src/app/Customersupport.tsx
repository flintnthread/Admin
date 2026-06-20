import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { getApiErrorMessage } from '@/lib/api/client';
import { mapCustomerSupportTicket } from '@/lib/mappers';
import {
  fetchCustomerSupportStats,
  fetchCustomerSupportTickets,
  type CustomerSupportStats,
} from '@/services/customerSupportApi';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import AdminLayout from '@/components/admin-layout';
import Svg, { Path, Circle, G, Rect } from 'react-native-svg';

// â”€â”€â”€ SVG Icons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SearchIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="M7.333 12.667A5.333 5.333 0 1 0 7.333 2a5.333 5.333 0 0 0 0 10.667ZM14 14l-2.9-2.9"
      stroke="#9CA3AF"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ChevronDownIcon = ({ color = "#374151" }: { color?: string }) => (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Path
      d="M3.5 5.25L7 8.75L10.5 5.25"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const EyeIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
      stroke="#FFFFFF"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="12" cy="12" r="3" stroke="#FFFFFF" strokeWidth={2} />
  </Svg>
);

const RefreshIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M23 4v6h-6M1 20v-6h6"
      stroke="#FFFFFF"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
      stroke="#FFFFFF"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CheckIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="M13.5 4.5L6.5 11.5L3 8"
      stroke="#1E3A5F"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const XIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Path
      d="M13.5 4.5L4.5 13.5M4.5 4.5L13.5 13.5"
      stroke="#6B7280"
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </Svg>
);

const TicketIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"
      stroke="#FFFFFF"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// â”€â”€â”€ Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Tickets loaded from /api/admin/contacts

const STATUS_OPTIONS = ["Open", "In Progress", "Closed"];
const TYPE_OPTIONS = [
  "Delivery Issue",
  "Product Issue",
  "Payment Issue",
  "Other",
];

type Ticket = ReturnType<typeof mapCustomerSupportTicket>;

// â”€â”€â”€ Status Badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const statusColors: Record<string, { bg: string; text: string; dot: string }> =
  {
    Open: { bg: "#DCFCE7", text: "#16A34A", dot: "#16A34A" },
    "In Progress": { bg: "#FEF9C3", text: "#CA8A04", dot: "#CA8A04" },
    Closed: { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF" },
  };

const typeColors: Record<string, { bg: string; text: string }> = {
  "Delivery Issue": { bg: "#EFF6FF", text: "#3B82F6" },
  "Product Issue": { bg: "#FFF7ED", text: "#EA580C" },
  "Payment Issue": { bg: "#FDF4FF", text: "#A21CAF" },
  Other: { bg: "#F0FDF4", text: "#16A34A" },
};

const StatusBadge = ({ status }: { status: string }) => {
  const c = statusColors[status] || statusColors["Open"];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: c.dot }]} />
      <Text style={[styles.badgeText, { color: c.text }]}>{status}</Text>
    </View>
  );
};

const TypeBadge = ({ type }: { type: string }) => {
  const c = typeColors[type] || typeColors["Other"];
  return (
    <View style={[styles.typeBadge, { backgroundColor: c.bg }]}>
      <Text style={[styles.typeBadgeText, { color: c.text }]}>{type}</Text>
    </View>
  );
};

// â”€â”€â”€ Filter Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface FilterModalProps {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
  isWeb: boolean;
}

const FilterModal = ({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
  isWeb,
}: FilterModalProps) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType={isWeb ? "fade" : "slide"}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[
            styles.modalContainer,
            isWeb ? styles.modalWeb : styles.modalMobile,
          ]}
        >
          {/* Mobile handle */}
          {!isWeb && <View style={styles.mobileHandle} />}

          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            {isWeb && (
              <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
                <XIcon />
              </TouchableOpacity>
            )}
          </View>

          {/* Options */}
          <View style={styles.modalOptions}>
            {options.map((opt) => {
              const isSelected = selected === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.modalOption,
                    isSelected && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    onSelect(opt);
                    onClose();
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      isSelected && styles.modalOptionTextSelected,
                    ]}
                  >
                    {opt}
                  </Text>
                  {isSelected && <CheckIcon />}
                </TouchableOpacity>
              );
            })}
            {/* Clear option */}
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                onSelect("");
                onClose();
              }}
            >
              <Text style={[styles.modalOptionText, { color: "#9CA3AF" }]}>
                Clear filter
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// â”€â”€â”€ Mobile Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface MobileCardProps {
  ticket: Ticket;
  onView: () => void;
  onRefresh: () => void;
}

const MobileCard = ({ ticket, onView, onRefresh }: MobileCardProps) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={styles.cardIdRow}>
        <Text style={styles.cardId}>{ticket.id}</Text>
        <StatusBadge status={ticket.status} />
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtnView} onPress={onView}>
          <EyeIcon />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtnRefresh} onPress={onRefresh}>
          <RefreshIcon />
        </TouchableOpacity>
      </View>
    </View>

    <Text style={styles.cardSubject} numberOfLines={2}>
      {ticket.subject}
    </Text>

    <View style={styles.cardDivider} />

    <View style={styles.cardMeta}>
      <View style={styles.cardMetaRow}>
        <Text style={styles.cardMetaLabel}>Customer</Text>
        <Text style={styles.cardMetaValue}>{ticket.customer}</Text>
      </View>
      <View style={styles.cardMetaRow}>
        <Text style={styles.cardMetaLabel}>Type</Text>
        <TypeBadge type={ticket.type} />
      </View>
      <View style={styles.cardMetaRow}>
        <Text style={styles.cardMetaLabel}>Order</Text>
        <Text style={[styles.cardMetaValue, styles.orderLink]}>
          {ticket.order}
        </Text>
      </View>
      <View style={styles.cardMetaRow}>
        <Text style={styles.cardMetaLabel}>Created</Text>
        <Text style={styles.cardMetaValue}>{ticket.created}</Text>
      </View>
    </View>
  </View>
);

// â”€â”€â”€ Web Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface WebTableProps {
  tickets: Ticket[];
  onView: (ticket: Ticket) => void;
  onRefresh: (ticket: Ticket) => void;
}

const WebTable = ({ tickets, onView, onRefresh }: WebTableProps) => (
  <View style={styles.tableWrapper}>
    {/* Table Header */}
    <View style={styles.tableHeader}>
      <Text style={[styles.th, { width: 60 }]}>ID</Text>
      <Text style={[styles.th, { flex: 2.5 }]}>Subject</Text>
      <Text style={[styles.th, { flex: 1.4 }]}>Customer</Text>
      <Text style={[styles.th, { width: 120 }]}>Type</Text>
      <Text style={[styles.th, { width: 130 }]}>Order</Text>
      <Text style={[styles.th, { width: 100 }]}>Status</Text>
      <Text style={[styles.th, { width: 130 }]}>Created</Text>
      <Text style={[styles.th, { width: 90, textAlign: "center" }]}>
        Actions
      </Text>
    </View>

    {/* Table Rows */}
    {tickets.map((ticket, idx) => (
      <View
        key={ticket.id}
        style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}
      >
        <Text style={[styles.td, { width: 60 }, styles.tdId]}>{ticket.id}</Text>
        <Text style={[styles.td, { flex: 2.5 }]} numberOfLines={2}>
          {ticket.subject}
        </Text>
        <View
          style={[{ flex: 1.4, paddingVertical: 13, paddingHorizontal: 12 }]}
        >
          <Text style={styles.tdCustomerName}>{ticket.customer}</Text>
          <Text style={styles.tdCustomerEmail} numberOfLines={1}>
            {ticket.email}
          </Text>
        </View>
        <View
          style={[
            {
              width: 120,
              paddingVertical: 13,
              paddingHorizontal: 12,
              justifyContent: "center",
            },
          ]}
        >
          <TypeBadge type={ticket.type} />
        </View>
        <Text style={[styles.td, { width: 130 }, styles.orderLink]}>
          {ticket.order}
        </Text>
        <View
          style={[
            {
              width: 100,
              paddingVertical: 13,
              paddingHorizontal: 12,
              justifyContent: "center",
            },
          ]}
        >
          <StatusBadge status={ticket.status} />
        </View>
        <Text style={[styles.td, { width: 130 }, styles.tdMuted]}>
          {ticket.created}
        </Text>
        <View style={[styles.tdActions, { width: 90 }]}>
          <TouchableOpacity
            style={styles.actionBtnView}
            onPress={() => onView(ticket)}
          >
            <EyeIcon />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtnRefresh}
            onPress={() => onRefresh(ticket)}
          >
            <RefreshIcon />
          </TouchableOpacity>
        </View>
      </View>
    ))}
  </View>
);

// â”€â”€â”€ Main Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function CustomerSupportTickets() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const { width } = useWindowDimensions();
  const isWeb = width >= 768;

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<CustomerSupportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [typeModalOpen, setTypeModalOpen] = useState(false);

  const loadTickets = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setLoadError(null);
      const [listRes, statsRes] = await Promise.all([
        fetchCustomerSupportTickets({
          status: selectedStatus || undefined,
          type: selectedType || undefined,
          search: searchQ || undefined,
          page: 0,
          size: 500,
        }),
        fetchCustomerSupportStats(),
      ]);
      setTickets((listRes.items ?? []).map(mapCustomerSupportTicket));
      setStats(statsRes);
    } catch (e) {
      setLoadError(getApiErrorMessage(e, 'Failed to load support tickets.'));
      setTickets([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [token, selectedStatus, selectedType, searchQ]);

  useEffect(() => {
    if (authLoading || !token) return;
    void loadTickets();
  }, [authLoading, token, loadTickets]);

  const filtered = tickets;

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setSearchQ(value);
  }, []);

  const handleView = (ticket: (typeof tickets)[0]) => {
    router.push({
      pathname: "/Customersupportdetails",
      params: { ticketId: String(ticket.numericId) },
    });
  };

  const handleRefresh = (ticket: (typeof tickets)[0]) => {
    // Refresh ticket logic
    void loadTickets();
  };

  return (
    <AdminLayout>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.rootContent}
        showsVerticalScrollIndicator={false}
      >
        {loadError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{loadError}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => void loadTickets()}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {stats ? (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#16A34A' }]}>{stats.open}</Text>
              <Text style={styles.statLabel}>Open</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#CA8A04' }]}>{stats.inProgress}</Text>
              <Text style={styles.statLabel}>In Progress</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#6B7280' }]}>{stats.closed}</Text>
              <Text style={styles.statLabel}>Closed</Text>
            </View>
          </View>
        ) : null}
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <TicketIcon />
            <Text style={styles.pageTitle}>Support Tickets</Text>
          </View>
          <View style={styles.ticketCount}>
            <Text style={styles.ticketCountText}>
              {filtered.length} tickets
            </Text>
          </View>
        </View>

        {/* â”€â”€ Search + Filters Row â”€â”€ */}
        <View style={styles.toolbarRow}>
          {/* Search */}
          <View style={[styles.searchBox, isWeb && styles.searchBoxWeb]}>
            <SearchIcon />
            <TextInput
              style={styles.searchInput}
              placeholder="Search tickets by ID, subject or customer..."
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={handleSearch}
              onSubmitEditing={() => setSearchQ(search)}
              returnKeyType="search"
            />
          </View>

          {/* Filter Buttons */}
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[
                styles.filterBtn,
                selectedStatus ? styles.filterBtnActive : null,
              ]}
              onPress={() => setStatusModalOpen(true)}
            >
              <Text
                style={[
                  styles.filterBtnText,
                  selectedStatus ? styles.filterBtnTextActive : null,
                ]}
              >
                {selectedStatus || "All Statuses"}
              </Text>
              <ChevronDownIcon color={selectedStatus ? "#1E3A5F" : "#374151"} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterBtn,
                selectedType ? styles.filterBtnActive : null,
              ]}
              onPress={() => setTypeModalOpen(true)}
            >
              <Text
                style={[
                  styles.filterBtnText,
                  selectedType ? styles.filterBtnTextActive : null,
                ]}
              >
                {selectedType || "All Types"}
              </Text>
              <ChevronDownIcon color={selectedType ? "#1E3A5F" : "#374151"} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#1E3A5F" />
            <Text style={styles.loadingText}>Loading support tickets...</Text>
          </View>
        ) : isWeb ? (
          <WebTable
            tickets={filtered}
            onView={handleView}
            onRefresh={handleRefresh}
          />
        ) : (
          <View style={styles.cardList}>
            {filtered.map((ticket) => (
              <MobileCard
                key={ticket.id}
                ticket={ticket}
                onView={() => handleView(ticket)}
                onRefresh={() => handleRefresh(ticket)}
              />
            ))}
          </View>
        )}

        {!loading && filtered.length === 0 && (
          <View style={styles.emptyState}>
            <TicketIcon />
            <Text style={styles.emptyTitle}>No tickets found</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your search or filters
            </Text>
          </View>
        )}
      </ScrollView>

      {/* â”€â”€ Status Filter Modal â”€â”€ */}
      <FilterModal
        visible={statusModalOpen}
        title="Filter by Status"
        options={STATUS_OPTIONS}
        selected={selectedStatus}
        onSelect={setSelectedStatus}
        onClose={() => setStatusModalOpen(false)}
        isWeb={isWeb}
      />

      {/* â”€â”€ Type Filter Modal â”€â”€ */}
      <FilterModal
        visible={typeModalOpen}
        title="Filter by Type"
        options={TYPE_OPTIONS}
        selected={selectedType}
        onSelect={setSelectedType}
        onClose={() => setTypeModalOpen(false)}
        isWeb={isWeb}
      />
    </AdminLayout>
  );
}

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8F9FB",
  },
  rootContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Page Header
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    backgroundColor: "#1E3A5F",
    padding: 15,
    borderRadius: 10,
  },
  pageHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  ticketCount: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  ticketCountText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Toolbar
  toolbarRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
    alignItems: "center",
  },
  searchBox: {
    flex: 1,
    minWidth: 200,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchBoxWeb: {
    maxWidth: 400,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    outlineStyle: "none",
  } as any,
  filterRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 10,
    height: 42,
  },
  filterBtnActive: {
    backgroundColor: "#EBF0F8",
    borderColor: "#1E3A5F",
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
  },
  filterBtnTextActive: {
    color: "#1E3A5F",
    fontWeight: "600",
  },

  // Badges
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  typeBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: "500",
  },

  // Table
  tableWrapper: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F1F4F9",
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  th: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    alignItems: "center",
  },
  tableRowAlt: {
    backgroundColor: "#FAFAFA",
  },
  td: {
    paddingVertical: 13,
    paddingHorizontal: 12,
    fontSize: 13,
    color: "#374151",
  },
  tdId: {
    fontWeight: "700",
    color: "#1E3A5F",
  },
  tdCustomerName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  tdCustomerEmail: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  tdMuted: {
    color: "#9CA3AF",
    fontSize: 12,
  },
  orderLink: {
    color: "#3B82F6",
    fontWeight: "500",
  },
  tdActions: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    paddingHorizontal: 8,
  },

  // Action Buttons
  actionBtnView: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#1E3A5F",
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnRefresh: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#F97316",
    alignItems: "center",
    justifyContent: "center",
  },

  // Mobile Cards
  cardList: {
    gap: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  cardIdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardId: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E3A5F",
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
  },
  cardSubject: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 19,
    marginBottom: 12,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginBottom: 12,
  },
  cardMeta: {
    gap: 8,
  },
  cardMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardMetaLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
    width: 70,
  },
  cardMetaValue: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    width: "100%",
  },
  modalWeb: {
    width: 360,
    borderRadius: 16,
    marginBottom: 0,
    alignSelf: "center",
    position: "absolute",
    top: "50%",
    transform: [{ translateY: -160 }],
  },
  modalMobile: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  mobileHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#D1D5DB",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  modalOptions: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginVertical: 2,
  },
  modalOptionSelected: {
    backgroundColor: "#EBF0F8",
  },
  modalOptionText: {
    fontSize: 15,
    color: "#374151",
    fontWeight: "500",
  },
  modalOptionTextSelected: {
    color: "#1E3A5F",
    fontWeight: "700",
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
  },

  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  errorText: {
    flex: 1,
    color: '#DC2626',
    fontSize: 14,
  },
  retryBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E3A5F',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
});
