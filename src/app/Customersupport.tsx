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
import Pagination from '@/components/Pagination';
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

const StatTotalIcon = ({ color = "#F97316" }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const StatOpenIcon = ({ color = "#10B981" }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
    <Path d="M8 12l3 3 5-5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const StatProgressIcon = ({ color = "#F59E0B" }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
    <Path d="M12 6v6l4 2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const StatClosedIcon = ({ color = "#6B7280" }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
    <Path d="M15 9l-6 6M9 9l6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
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
          {/* Header — navy blue */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <XIcon />
            </TouchableOpacity>
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
              style={[styles.modalOption, styles.modalOptionClear]}
              onPress={() => {
                onSelect("");
                onClose();
              }}
            >
              <Text style={styles.modalOptionClearText}>
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
  <View style={styles.webTableCard}>
    {/* Table Header */}
    <View style={styles.webTableHeader}>
      <Text style={[styles.webTh, { flex: 1.2 }]}>ID</Text>
      <Text style={[styles.webTh, { flex: 1.8 }]}>Subject</Text>
      <Text style={[styles.webTh, { flex: 2 }]}>Customer</Text>
      <Text style={[styles.webTh, { flex: 1.4 }]}>Type</Text>
      <Text style={[styles.webTh, { flex: 1.2 }]}>Order</Text>
      <Text style={[styles.webTh, { flex: 1.2 }]}>Status</Text>
      <Text style={[styles.webTh, { flex: 1.2 }]}>Created</Text>
      <Text style={[styles.webTh, { flex: 0.8, textAlign: "center" }]}>Actions</Text>
    </View>

    {/* Table Rows */}
    {tickets.map((ticket, idx) => (
      <View
        key={ticket.id}
        style={[styles.webTableRow, idx % 2 === 1 && styles.webTableRowAlt]}
      >
        <Text style={[styles.webTd, { flex: 1.2 }, styles.webTdId]} numberOfLines={2}>{ticket.id}</Text>
        <Text style={[styles.webTd, { flex: 1.8 }]} numberOfLines={2}>{ticket.subject}</Text>
        <View style={[styles.webTdCell, { flex: 2 }]}>
          <Text style={styles.webTdCustomerName}>{ticket.customer}</Text>
          <Text style={styles.webTdCustomerEmail} numberOfLines={1}>{ticket.email}</Text>
        </View>
        <View style={[styles.webTdCell, { flex: 1.4 }]}>
          <TypeBadge type={ticket.type} />
        </View>
        <Text style={[styles.webTd, { flex: 1.2 }, styles.webOrderLink]}>{ticket.order}</Text>
        <View style={[styles.webTdCell, { flex: 1.2 }]}>
          <StatusBadge status={ticket.status} />
        </View>
        <Text style={[styles.webTd, { flex: 1.2 }, styles.webTdMuted]}>{ticket.created}</Text>
        <View style={[styles.webTdActions, { flex: 0.8 }]}>
          <TouchableOpacity style={styles.actionBtnView} onPress={() => onView(ticket)}>
            <EyeIcon />
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

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const ITEMS_PER_PAGE = 15;

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
          page: currentPage - 1,
          size: ITEMS_PER_PAGE,
        }),
        fetchCustomerSupportStats(),
      ]);
      setTickets((listRes.items ?? []).map(mapCustomerSupportTicket));
      setTotalPages(listRes.totalPages ?? 1);
      setTotalItems(listRes.totalElements ?? 0);
      setStats(statsRes);
    } catch (e) {
      setLoadError(getApiErrorMessage(e, 'Failed to load support tickets.'));
      setTickets([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [token, selectedStatus, selectedType, searchQ, currentPage]);

  useEffect(() => {
    if (authLoading || !token) return;
    void loadTickets();
  }, [authLoading, token, loadTickets]);

  const filtered = tickets;

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setSearchQ(value);
    setCurrentPage(1);
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
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <View style={styles.pageHeaderIcon}>
              <TicketIcon />
            </View>
            <View>
              <Text style={styles.pageTitle}>Support Tickets</Text>
              <Text style={styles.pageSubTitle}>Manage and track all support tickets</Text>
            </View>
          </View>
        </View>

        {stats ? (
          isWeb ? (
            // ── Web: desktop-style full-width stat cards (icon+value row, label below)
            <View style={styles.statsRowWeb}>
              {[
                { icon: <StatTotalIcon color="#F97316" />, iconBg: '#FFF0EA', value: stats.total,      label: 'Total Tickets',   sub: 'All support tickets',  valueColor: '#1d324e' },
                { icon: <StatOpenIcon color="#10B981" />,  iconBg: '#ECFDF5', value: stats.open,       label: 'Open',            sub: 'Awaiting response',    valueColor: '#16A34A' },
                { icon: <StatProgressIcon color="#F59E0B" />, iconBg: '#FEF3C7', value: stats.inProgress, label: 'In Progress',  sub: 'Being worked on',      valueColor: '#CA8A04' },
                { icon: <StatClosedIcon color="#6B7280" />, iconBg: '#F3F4F6', value: stats.closed,    label: 'Closed',          sub: 'Resolved tickets',     valueColor: '#6B7280' },
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
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={[styles.statCardIconBox, { backgroundColor: '#FFF0EA' }]}><StatTotalIcon color="#F97316" /></View>
                <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{stats.total}</Text>
                <Text style={styles.statLabel} numberOfLines={1}>Total</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statCardIconBox, { backgroundColor: '#ECFDF5' }]}><StatOpenIcon color="#10B981" /></View>
                <Text style={[styles.statValue, { color: '#16A34A' }]} numberOfLines={1} adjustsFontSizeToFit>{stats.open}</Text>
                <Text style={styles.statLabel} numberOfLines={1}>Open</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statCardIconBox, { backgroundColor: '#FEF3C7' }]}><StatProgressIcon color="#F59E0B" /></View>
                <Text style={[styles.statValue, { color: '#CA8A04' }]} numberOfLines={1} adjustsFontSizeToFit>{stats.inProgress}</Text>
                <Text style={styles.statLabel} numberOfLines={1}>In Progress</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statCardIconBox, { backgroundColor: '#F3F4F6' }]}><StatClosedIcon color="#6B7280" /></View>
                <Text style={[styles.statValue, { color: '#6B7280' }]} numberOfLines={1} adjustsFontSizeToFit>{stats.closed}</Text>
                <Text style={styles.statLabel} numberOfLines={1}>Closed</Text>
              </View>
            </View>
          )
        ) : null}

        {loadError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{loadError}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => void loadTickets()}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* â”€â”€ Search + Filters Row â”€â”€ */}
        <View style={[styles.toolbarRow, isWeb && styles.toolbarRowWeb]}>
          {/* Search */}
          <View style={[styles.searchBox, isWeb && styles.searchBoxWeb]}>
            <SearchIcon />
            <TextInput
              style={styles.searchInput}
              placeholder="Search tickets..."
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={handleSearch}
              onSubmitEditing={() => setSearchQ(search)}
              returnKeyType="search"
            />
          </View>

          {/* Filter Buttons */}
          <View style={[styles.filterRow, !isWeb && { width: '100%' }]}>
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
                {selectedStatus || "Status"}
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
                {selectedType || "Type"}
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

        {!loading && filtered.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            itemName="tickets"
            onPageChange={setCurrentPage}
          />
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
        onSelect={(val) => {
          setSelectedStatus(val);
          setCurrentPage(1);
        }}
        onClose={() => setStatusModalOpen(false)}
        isWeb={isWeb}
      />

      {/* â”€â”€ Type Filter Modal â”€â”€ */}
      <FilterModal
        visible={typeModalOpen}
        title="Filter by Type"
        options={TYPE_OPTIONS}
        selected={selectedType}
        onSelect={(val) => {
          setSelectedType(val);
          setCurrentPage(1);
        }}
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
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // Page Header
  pageHeader: {
    marginBottom: 0,
    backgroundColor: "#151D4F",
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
    gap: 11,
  },
  pageHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: "#ef7b1a",
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  pageSubTitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    marginTop: 1,
  },

  // Toolbar — bare on web, card on mobile
  toolbarRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "space-between",
    // mobile card styling
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  toolbarRowWeb: {
    // on web, strip the card appearance
    backgroundColor: "transparent",
    borderWidth: 0,
    borderColor: "transparent",
    shadowOpacity: 0,
    elevation: 0,
    padding: 0,
    flexWrap: "nowrap",
    marginBottom: 14,
  },
  searchBox: {
    flex: 1,
    minWidth: 200,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchBoxWeb: {
    flex: 1,
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
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    height: 42,
    gap: 6,
  },
  filterBtnActive: {
    backgroundColor: "#FFF5EE",
    borderColor: "#ef7b1a",
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
  },
  filterBtnTextActive: {
    color: "#ef7b1a",
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
  tableScrollWrapper: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  } as any,
  tableWrapper: {
    backgroundColor: "#FFFFFF",
    minWidth: 1120,
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
    flexWrap: "wrap",
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
    backgroundColor: "#F97316",
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  modalWeb: {
    width: 320,
    borderRadius: 24,
    marginBottom: 0,
    alignSelf: "center",
    position: "absolute",
    top: "50%",
    transform: [{ translateY: -160 }],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 20,
  },
  modalMobile: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#1d324e",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalOptions: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginVertical: 2,
  },
  modalOptionSelected: {
    backgroundColor: "#FFF5EE",
  },
  modalOptionText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  modalOptionTextSelected: {
    color: "#ef7b1a",
    fontWeight: "700",
  },
  modalOptionClear: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    marginTop: 4,
    borderRadius: 0,
  },
  modalOptionClearText: {
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "500",
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
  // Web table — flex columns, no horizontal scroll
  webTableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E2D9',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  webTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F3EE',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1.5,
    borderBottomColor: '#E8E2D9',
  },
  webTh: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingRight: 6,
  },
  webTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  webTableRowAlt: {
    backgroundColor: '#FAFAFA',
  },
  webTd: {
    fontSize: 13,
    color: '#374151',
    paddingRight: 8,
  },
  webTdId: {
    fontWeight: '700',
    color: '#1d324e',
  },
  webTdCell: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingRight: 8,
  },
  webTdCustomerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C2B4A',
    marginBottom: 2,
  },
  webTdCustomerEmail: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  webTdMuted: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  webOrderLink: {
    color: '#3B82F6',
    fontWeight: '500',
  },
  webTdActions: {
    alignItems: 'center',
    justifyContent: 'center',
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
