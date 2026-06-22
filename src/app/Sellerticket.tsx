import React, { useState, useCallback, useEffect } from "react";
import { getApiErrorMessage } from "@/lib/api/client";
import { mapSellerSupportTicket } from "@/lib/mappers";
import {
  fetchSupportTicket,
  fetchSupportTickets,
  replySupportTicket,
  updateSupportTicketStatus,
} from "@/services/supportApi";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  SafeAreaView,
  StatusBar,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AdminLayout from "@/components/admin-layout";


// ─── Types ───────────────────────────────────────────────────────────────────

type TicketStatus =
  | "Open"
  | "In Progress"
  | "Waiting Admin"
  | "Waiting Seller"
  | "Resolved"
  | "Closed";

type TicketPriority = "Urgent" | "High" | "Medium" | "Low";

interface Message {
  id: string;
  sender: "user" | "admin";
  senderName: string;
  text: string;
  timestamp: string;
}

interface Ticket {
  id: string;
  ticketCode: string;
  description: string;
  sellerName: string;
  email: string;
  phone: string;
  department: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  messages: Message[];
}

const STATUS_TO_API: Record<string, string> = {
  Open: "open",
  "In Progress": "in_progress",
  "Waiting Admin": "waiting",
  "Waiting Seller": "waiting",
  Resolved: "closed",
  Closed: "closed",
};

// ─── Color Tokens ─────────────────────────────────────────────────────────────

const C = {
  brand: "#C85D1A",
  brandDark: "#1E2B6B",
  brandLight: "#F0A060",
  brandFaint: "#FDF3EC",
  bg: "#F5F6FA",
  surface: "#FFFFFF",
  surfaceAlt: "#FAFAFA",
  border: "#E8EAF0",
  textPrimary: "#1A1D23",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  // status colors
  open: { bg: "#EFF6FF", text: "#1D4ED8", dot: "#3B82F6" },
  inProgress: { bg: "#FFF7ED", text: "#C2410C", dot: "#F97316" },
  waitingAdmin: { bg: "#FFF4E5", text: "#B45309", dot: "#F59E0B" },
  waitingSeller: { bg: "#F0FDF4", text: "#166534", dot: "#22C55E" },
  resolved: { bg: "#F0FDF4", text: "#15803D", dot: "#16A34A" },
  closed: { bg: "#F3F4F6", text: "#374151", dot: "#6B7280" },
  // priority colors
  urgent: { bg: "#FEF2F2", text: "#DC2626" },
  high: { bg: "#FFF7ED", text: "#EA580C" },
  medium: { bg: "#FFFBEB", text: "#D97706" },
  low: { bg: "#F0FDF4", text: "#16A34A" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStatusStyle(status: TicketStatus) {
  const map: Record<TicketStatus, { bg: string; text: string; dot: string }> = {
    Open: C.open,
    "In Progress": C.inProgress,
    "Waiting Admin": C.waitingAdmin,
    "Waiting Seller": C.waitingSeller,
    Resolved: C.resolved,
    Closed: C.closed,
  };
  return map[status] ?? C.closed;
}

function getPriorityStyle(priority: TicketPriority) {
  const map: Record<TicketPriority, { bg: string; text: string }> = {
    Urgent: C.urgent,
    High: C.high,
    Medium: C.medium,
    Low: C.low,
  };
  return map[priority] ?? C.low;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: TicketStatus }) => {
  const s = getStatusStyle(status);
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: s.dot }]} />
      <Text style={[styles.badgeText, { color: s.text }]}>{status}</Text>
    </View>
  );
};

const PriorityBadge = ({ priority }: { priority: TicketPriority }) => {
  const s = getPriorityStyle(priority);
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.text }]}>{priority}</Text>
    </View>
  );
};

interface DropdownProps {
  label: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
}

const Dropdown = ({ label, value, options, onSelect }: DropdownProps) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.dropdownWrapper}>
      <TouchableOpacity
        style={styles.dropdownTrigger}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.dropdownLabel}>{label}: </Text>
        <Text style={styles.dropdownValue} numberOfLines={1}>
          {value}
        </Text>
        <Text style={styles.dropdownArrow}>▾</Text>
      </TouchableOpacity>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.dropdownBackdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.dropdownMenu} onPress={(e) => e.stopPropagation()}>
            <View style={styles.dropdownMenuHeader}>
              <Text style={styles.dropdownMenuTitle}>{label}</Text>
              <TouchableOpacity
                style={styles.dropdownDismissBtn}
                onPress={() => setOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <CloseIcon size={16} color={C.textSecondary} />
              </TouchableOpacity>
            </View>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.dropdownItem, value === opt && styles.dropdownItemActive]}
                onPress={() => {
                  onSelect(opt);
                  setOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    value === opt && styles.dropdownItemTextActive,
                  ]}
                >
                  {opt}
                </Text>
                {value === opt && <Text style={styles.dropdownCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ─── Lightweight inline icons (no external icon lib dependency) ─────────────

const SearchIcon = ({ size = 16, color = C.textMuted }: { size?: number; color?: string }) => {
  const circleSize = size * 0.62;
  const strokeWidth = Math.max(1.5, size * 0.11);
  const handleLength = size * 0.4;
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          width: circleSize,
          height: circleSize,
          borderRadius: circleSize / 2,
          borderWidth: strokeWidth,
          borderColor: color,
          position: "absolute",
          top: 0,
          left: 0,
        }}
      />
      <View
        style={{
          width: handleLength,
          height: strokeWidth,
          backgroundColor: color,
          borderRadius: strokeWidth / 2,
          position: "absolute",
          top: circleSize - strokeWidth * 0.5,
          left: circleSize - strokeWidth * 0.5,
          transform: [{ rotate: "45deg" }, { translateX: handleLength / 2 }],
        }}
      />
    </View>
  );
};

const CloseIcon = ({ size = 16, color = C.textSecondary }: { size?: number; color?: string }) => (
  <View style={{ width: size, height: size, justifyContent: "center", alignItems: "center" }}>
    <View
      style={{
        width: size * 0.78,
        height: 1.8,
        backgroundColor: color,
        borderRadius: 1,
        position: "absolute",
        transform: [{ rotate: "45deg" }],
      }}
    />
    <View
      style={{
        width: size * 0.78,
        height: 1.8,
        backgroundColor: color,
        borderRadius: 1,
        position: "absolute",
        transform: [{ rotate: "-45deg" }],
      }}
    />
  </View>
);

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  sublabel: string;
  count: number;
  color: string;
  bgColor: string;
  icon: string;
}

const StatCard = ({ label, sublabel, count, color, bgColor, icon }: StatCardProps) => (
  <View style={styles.statCard}>
    <View style={styles.statCardTop}>
      <View style={[styles.statIconChip, { backgroundColor: bgColor }]}>
        <Text style={[styles.statIconText, { color }]}>{icon}</Text>
      </View>
      <Text style={[styles.statCount, { color }]}>{count}</Text>
    </View>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statSublabel}>{sublabel}</Text>
  </View>
);

// ─── Ticket List Item ─────────────────────────────────────────────────────────

interface TicketItemProps {
  ticket: Ticket;
  selected: boolean;
  onPress: () => void;
}

const TicketItem = ({ ticket, selected, onPress }: TicketItemProps) => (
  <TouchableOpacity
    style={[styles.ticketItem, selected && styles.ticketItemSelected]}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <Text style={styles.ticketDescription} numberOfLines={2}>
      {ticket.description}
    </Text>
    <View style={styles.ticketSeller}>
      <Text style={styles.ticketSellerIcon}>⊙</Text>
      <Text style={styles.ticketSellerName}>{ticket.sellerName}</Text>
    </View>
    <View style={styles.ticketBadges}>
      <StatusBadge status={ticket.status} />
      <PriorityBadge priority={ticket.priority} />
    </View>
    <View style={styles.ticketMeta}>
      <Text style={styles.ticketMetaText}>⊞ {ticket.ticketCode}</Text>
      <Text style={styles.ticketMetaText}>🕐 {ticket.createdAt}</Text>
    </View>
  </TouchableOpacity>
);

// ─── Chat Detail Panel ────────────────────────────────────────────────────────

interface ChatPanelProps {
  ticket: Ticket;
  onClose?: () => void;
  onReopen: (id: string) => void;
  onSend: (id: string, text: string) => void;
}

const ChatPanel = ({ ticket, onClose, onReopen, onSend }: ChatPanelProps) => {
  const [replyText, setReplyText] = useState("");
  const isClosed = ticket.status === "Closed" || ticket.status === "Resolved";
  const hasMessages = ticket.messages && ticket.messages.length > 0;

  const handleSend = () => {
    const t = replyText.trim();
    if (!t) return;
    onSend(ticket.id, t);
    setReplyText("");
  };

  return (
    <View style={styles.chatPanel}>
      {/* Detail Header */}
      <View style={styles.chatHeader}>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.chatBackBtn}>
            <Text style={styles.chatBackIcon}>←</Text>
          </TouchableOpacity>
        )}
        <View style={styles.chatHeaderInfo}>
          <Text style={styles.chatHeaderTitle} numberOfLines={1}>
            {ticket.description}
          </Text>
          <View style={styles.chatHeaderMeta}>
            <Text style={styles.chatHeaderMetaText}>⊞ {ticket.ticketCode}</Text>
            <Text style={styles.chatHeaderMetaText}>  ⊙ {ticket.sellerName}</Text>
            <StatusBadge status={ticket.status} />
          </View>
          <View style={styles.chatHeaderContact}>
            {!!ticket.email && <Text style={styles.chatContactText}>✉ {ticket.email}</Text>}
            {!!ticket.phone && <Text style={styles.chatContactText}>  📱 {ticket.phone}</Text>}
            {!!ticket.department && <Text style={styles.chatContactText}>  🗂 {ticket.department}</Text>}
          </View>
        </View>
        {isClosed && (
          <TouchableOpacity
            style={styles.reopenBtn}
            onPress={() => onReopen(ticket.id)}
          >
            <Text style={styles.reopenBtnText}>↺ Reopen</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      <ScrollView
        style={styles.chatMessages}
        contentContainerStyle={styles.chatMessagesContent}
        showsVerticalScrollIndicator={false}
      >
        {!hasMessages && (
          <View style={styles.emptyMessages}>
            <Text style={styles.emptyMessagesIcon}>💬</Text>
            <Text style={styles.emptyMessagesText}>No messages yet</Text>
          </View>
        )}

        {ticket.messages?.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageBubbleWrapper,
              msg.sender === "admin" && styles.messageBubbleWrapperRight,
            ]}
          >
            <View
              style={[
                styles.messageBubble,
                msg.sender === "admin"
                  ? styles.messageBubbleAdmin
                  : styles.messageBubbleUser,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  msg.sender === "admin" && styles.messageTextAdmin,
                ]}
              >
                {msg.text}
              </Text>
              <Text
                style={[
                  styles.messageTimestamp,
                  msg.sender === "admin" && styles.messageTimestampAdmin,
                ]}
              >
                {msg.sender === "admin" ? "👤 " : "⊙ "}
                {msg.senderName} · {msg.timestamp}
              </Text>
            </View>
          </View>
        ))}

        {isClosed && (
          <View style={styles.closedNotice}>
            <Text style={styles.closedNoticeIcon}>🔒</Text>
            <Text style={styles.closedNoticeText}>This ticket is {ticket.status.toLowerCase()}</Text>
          </View>
        )}
      </ScrollView>

      {/* Reply Box */}
      {!isClosed && (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={80}
        >
          <View style={styles.replyBox}>
            <TextInput
              style={styles.replyInput}
              placeholder="Type your reply..."
              placeholderTextColor={C.textMuted}
              value={replyText}
              onChangeText={setReplyText}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !replyText.trim() && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!replyText.trim()}
            >
              <Text style={styles.sendBtnText}>Send</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SupportTicketManagement() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [priorityFilter, setPriorityFilter] = useState("All Priorities");
  const [searchText, setSearchText] = useState("");

  const loadTickets = useCallback(async () => {
    try {
      setLoadError(null);
      const statusParam =
        statusFilter === "All Status" ? undefined : STATUS_TO_API[statusFilter];
      const res = await fetchSupportTickets({ status: statusParam, size: 200 });
      let rows = (res.items ?? []).map(mapSellerSupportTicket) as Ticket[];
      if (priorityFilter !== "All Priorities") {
        rows = rows.filter((t) => t.priority === priorityFilter);
      }
      setTickets(rows);
    } catch (e) {
      setLoadError(getApiErrorMessage(e));
      setTickets([]);
    }
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const statusOptions = [
    "All Status",
    "Open",
    "In Progress",
    "Waiting Admin",
    "Waiting Seller",
    "Resolved",
    "Closed",
  ];

  const priorityOptions = ["All Priorities", "Urgent", "High", "Medium", "Low"];

  // Stats
  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === "Open").length,
    inProgress: tickets.filter((t) => t.status === "In Progress").length,
    waiting: tickets.filter(
      (t) => t.status === "Waiting Admin" || t.status === "Waiting Seller"
    ).length,
    resolved: tickets.filter((t) => t.status === "Resolved").length,
    urgent: tickets.filter((t) => t.priority === "Urgent").length,
  };

  // Filtered tickets
  const filteredTickets = tickets.filter((t) => {
    const matchStatus =
      statusFilter === "All Status" || t.status === statusFilter;
    const matchPriority =
      priorityFilter === "All Priorities" || t.priority === priorityFilter;
    const matchSearch =
      !searchText ||
      t.description.toLowerCase().includes(searchText.toLowerCase()) ||
      t.sellerName.toLowerCase().includes(searchText.toLowerCase()) ||
      t.ticketCode.toLowerCase().includes(searchText.toLowerCase());
    return matchStatus && matchPriority && matchSearch;
  });

  const handleSelectTicket = useCallback(
    (ticket: Ticket) => {
      setSelectedTicket(ticket);
      // Refresh from the detail endpoint so messages/email/phone are fully populated,
      // in case the list endpoint returns a lighter-weight shape than the detail endpoint.
      void refreshTicket(ticket.id);
    },
    []
  );

  const refreshTicket = useCallback(async (id: string) => {
    try {
      const detail = mapSellerSupportTicket(await fetchSupportTicket(Number(id))) as Ticket;
      setTickets((prev) => prev.map((t) => (t.id === id ? detail : t)));
      setSelectedTicket((prev) => (prev?.id === id ? detail : prev));
    } catch (e) {
      setLoadError(getApiErrorMessage(e));
    }
  }, []);

  const handleReopen = useCallback((id: string) => {
    void (async () => {
      try {
        await updateSupportTicketStatus(Number(id), "open");
        await refreshTicket(id);
        await loadTickets();
      } catch (e) {
        setLoadError(getApiErrorMessage(e));
      }
    })();
  }, [loadTickets, refreshTicket]);

  const handleSend = useCallback((id: string, text: string) => {
    void (async () => {
      try {
        await replySupportTicket(Number(id), text);
        await updateSupportTicketStatus(Number(id), "in_progress");
        await refreshTicket(id);
        await loadTickets();
      } catch (e) {
        setLoadError(getApiErrorMessage(e));
      }
    })();
  }, [loadTickets, refreshTicket]);

  const statCards = [
    {
      label: "Total Tickets",
      sublabel: "All requests",
      count: stats.total,
      color: C.brand,
      bgColor: C.brandFaint,
      icon: "⊞",
    },
    {
      label: "Open",
      sublabel: "Needs response",
      count: stats.open,
      color: C.open.text,
      bgColor: C.open.bg,
      icon: "●",
    },
    {
      label: "In Progress",
      sublabel: "Being handled",
      count: stats.inProgress,
      color: C.inProgress.text,
      bgColor: C.inProgress.bg,
      icon: "◐",
    },
    {
      label: "Waiting",
      sublabel: "Pending reply",
      count: stats.waiting,
      color: C.waitingAdmin.text,
      bgColor: C.waitingAdmin.bg,
      icon: "◷",
    },
    {
      label: "Resolved",
      sublabel: "Completed",
      count: stats.resolved,
      color: C.resolved.text,
      bgColor: C.resolved.bg,
      icon: "✓",
    },
    {
      label: "Urgent",
      sublabel: "High priority",
      count: stats.urgent,
      color: C.urgent.text,
      bgColor: C.urgent.bg,
      icon: "!",
    },
  ];

  return (
    <AdminLayout>
      <View style={{ flex: 1 }}>
        <ScrollView
          style={styles.body}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.bodyContent}
        >
          {/* ── Header panel: rounded dark card with title row + overlapping stat cards ── */}
          <View style={styles.headerOuter}>
            <View style={styles.headerPanel}>
              <View style={styles.headerTitleRow}>
                <TouchableOpacity style={styles.menuBtn}>
                  <View style={styles.menuLine} />
                  <View style={[styles.menuLine, { width: 16 }]} />
                  <View style={styles.menuLine} />
                </TouchableOpacity>
                <View style={styles.headerTitleTextWrap}>
                  <Text style={styles.headerTitle}>Support Tickets</Text>
                  <Text style={styles.headerSubtitle}>Admin Panel · Manage all support requests</Text>
                </View>
                <TouchableOpacity style={styles.headerAvatar}>
                  <Text style={styles.headerAvatarText}>A</Text>
                </TouchableOpacity>
              </View>

              {/* Spacer so the panel has enough height for cards to overlap into */}
              <View style={styles.headerCardSpacer} />
            </View>

            {/* Stat cards: horizontally scrollable, overlapping the bottom edge of the dark panel */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.statsScroll}
              contentContainerStyle={styles.statsRow}
            >
              {statCards.map((card) => (
                <StatCard
                  key={card.label}
                  label={card.label}
                  sublabel={card.sublabel}
                  count={card.count}
                  color={card.color}
                  bgColor={card.bgColor}
                  icon={card.icon}
                />
              ))}
            </ScrollView>
          </View>

          {loadError ? (
            <Text style={{ color: C.brand, marginBottom: 12, paddingHorizontal: 4 }}>{loadError}</Text>
          ) : null}

          {/* ── Filters ── */}
          <View style={styles.filtersRow}>
            <View style={styles.searchBox}>
              <SearchIcon size={16} color={C.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search tickets..."
                placeholderTextColor={C.textMuted}
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>
            <Dropdown
              label="Status"
              value={statusFilter}
              options={statusOptions}
              onSelect={setStatusFilter}
            />
            <Dropdown
              label="Priority"
              value={priorityFilter}
              options={priorityOptions}
              onSelect={setPriorityFilter}
            />
          </View>

          {/* ── Main Content ── */}
          {isDesktop ? (
            /* Desktop: side-by-side layout */
            <View style={styles.desktopLayout}>
              {/* Ticket List */}
              <View style={styles.desktopListPanel}>
                <View style={styles.panelHeader}>
                  <Text style={styles.panelTitle}>Support Tickets</Text>
                  <Text style={styles.panelCount}>{filteredTickets.length}</Text>
                </View>
                <ScrollView
                  style={styles.desktopListScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {filteredTickets.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyIcon}>📭</Text>
                      <Text style={styles.emptyText}>No tickets match your filters</Text>
                    </View>
                  ) : (
                    filteredTickets.map((t) => (
                      <TicketItem
                        key={t.id}
                        ticket={t}
                        selected={selectedTicket?.id === t.id}
                        onPress={() => handleSelectTicket(t)}
                      />
                    ))
                  )}
                </ScrollView>
              </View>

              {/* Chat Panel */}
              <View style={styles.desktopDetailPanel}>
                {selectedTicket ? (
                  <ChatPanel
                    ticket={selectedTicket}
                    onReopen={handleReopen}
                    onSend={handleSend}
                  />
                ) : (
                  <View style={styles.emptyDetail}>
                    <Text style={styles.emptyDetailIcon}>💬</Text>
                    <Text style={styles.emptyDetailTitle}>Select a Ticket</Text>
                    <Text style={styles.emptyDetailSub}>
                      Choose a support ticket from the list to view details and respond.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            /* Mobile: list view, modal for detail */
            <View style={styles.mobileList}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>Support Tickets</Text>
                <Text style={styles.panelCount}>{filteredTickets.length}</Text>
              </View>
              {filteredTickets.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>📭</Text>
                  <Text style={styles.emptyText}>No tickets match your filters</Text>
                </View>
              ) : (
                filteredTickets.map((t) => (
                  <TicketItem
                    key={t.id}
                    ticket={t}
                    selected={false}
                    onPress={() => handleSelectTicket(t)}
                  />
                ))
              )}
            </View>
          )}
        </ScrollView>

        {/* Mobile: Full-screen Chat Modal */}
        {!isDesktop && selectedTicket && (
          <Modal
            visible={!!selectedTicket}
            animationType="slide"
            onRequestClose={() => setSelectedTicket(null)}
          >
            <SafeAreaView style={styles.modalSafe}>
              <ChatPanel
                ticket={selectedTicket}
                onClose={() => setSelectedTicket(null)}
                onReopen={handleReopen}
                onSend={handleSend}
              />
            </SafeAreaView>
          </Modal>
        )}
      </View>
    </AdminLayout>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.brandDark,
  },

  // Header
  headerOuter: {
    marginHorizontal: -16,
    marginTop: -8,
    paddingHorizontal: 16,
    paddingTop: 8,
    marginBottom: 8,
  },
  headerPanel: {
    backgroundColor: C.brandDark,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 18,
    overflow: "hidden",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTitleTextWrap: {
    flex: 1,
  },
  headerCardSpacer: {
    height: 54,
  },
  menuBtn: {
    gap: 4,
    padding: 4,
  },
  menuLine: {
    height: 2,
    width: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 1,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 11,
    marginTop: 1,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },

  // Body
  body: {
    flex: 1,
    backgroundColor: C.bg,
  },
  bodyContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },

  // Stats — overlap the bottom edge of the dark header panel
  statsScroll: {
    marginTop: -46,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexGrow: 1,
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  statCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    width: 150,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
  },
  statCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statIconChip: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  statIconText: {
    fontSize: 14,
    fontWeight: "700",
  },
  statCount: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 13,
    color: C.textPrimary,
    fontWeight: "700",
  },
  statSublabel: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 2,
  },

  // Filters
  filtersRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 12,
    gap: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  searchBox: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: C.textPrimary,
  },
  dropdownsRow: {
    flexDirection: "row",
    gap: 10,
  },
  dropdownWrapper: {
    flex: 1,
  },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: C.border,
    gap: 4,
  },
  dropdownLabel: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: "500",
  },
  dropdownValue: {
    flex: 1,
    fontSize: 13,
    color: C.textPrimary,
    fontWeight: "600",
  },
  dropdownArrow: {
    fontSize: 12,
    color: C.textSecondary,
  },
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  dropdownMenu: {
    backgroundColor: C.surface,
    borderRadius: 16,
    paddingVertical: 8,
    width: "100%",
    maxWidth: 340,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 12,
  },
  dropdownMenuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    marginBottom: 4,
  },
  dropdownMenuTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  dropdownDismissBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownItemActive: {
    backgroundColor: C.brandFaint,
  },
  dropdownItemText: {
    flex: 1,
    fontSize: 14,
    color: C.textPrimary,
  },
  dropdownItemTextActive: {
    color: C.brand,
    fontWeight: "600",
  },
  dropdownCheck: {
    color: C.brand,
    fontWeight: "700",
  },

  // Layout
  desktopLayout: {
    flexDirection: "row",
    gap: 16,
    minHeight: 600,
  },
  desktopListPanel: {
    width: 340,
    backgroundColor: C.surface,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  desktopListScroll: {
    flex: 1,
    maxHeight: 680,
  },
  desktopDetailPanel: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  mobileList: {
    backgroundColor: C.surface,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },

  // Panel header
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.surfaceAlt,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.textPrimary,
  },
  panelCount: {
    fontSize: 12,
    fontWeight: "700",
    color: C.surface,
    backgroundColor: C.brand,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: "hidden",
  },

  // Ticket items
  ticketItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  ticketItemSelected: {
    backgroundColor: C.brandFaint,
    borderLeftWidth: 3,
    borderLeftColor: C.brand,
  },
  ticketDescription: {
    fontSize: 14,
    fontWeight: "600",
    color: C.textPrimary,
    marginBottom: 6,
    lineHeight: 20,
  },
  ticketSeller: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  ticketSellerIcon: {
    fontSize: 11,
    color: C.textMuted,
  },
  ticketSellerName: {
    fontSize: 12,
    color: C.textSecondary,
    fontWeight: "500",
  },
  ticketBadges: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  ticketMeta: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  ticketMetaText: {
    fontSize: 11,
    color: C.textMuted,
  },

  // Badges
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    gap: 4,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },

  // Chat panel
  chatPanel: {
    flex: 1,
    flexDirection: "column",
  },
  chatHeader: {
    backgroundColor: C.brand,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  chatBackBtn: {
    padding: 4,
    marginTop: 2,
  },
  chatBackIcon: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "300",
  },
  chatHeaderInfo: {
    flex: 1,
    gap: 4,
  },
  chatHeaderTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  chatHeaderMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  chatHeaderMetaText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
  },
  chatHeaderContact: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
    marginTop: 2,
  },
  chatContactText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
  },
  reopenBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  reopenBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },

  // Messages
  chatMessages: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  chatMessagesContent: {
    padding: 16,
    gap: 12,
  },
  emptyMessages: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 8,
  },
  emptyMessagesIcon: {
    fontSize: 36,
    opacity: 0.5,
  },
  emptyMessagesText: {
    fontSize: 13,
    color: C.textMuted,
    fontWeight: "500",
  },
  messageBubbleWrapper: {
    alignItems: "flex-start",
  },
  messageBubbleWrapperRight: {
    alignItems: "flex-end",
  },
  messageBubble: {
    maxWidth: "80%",
    borderRadius: 16,
    padding: 12,
  },
  messageBubbleUser: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 4,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  messageBubbleAdmin: {
    backgroundColor: C.brand,
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 13,
    color: C.textPrimary,
    lineHeight: 20,
  },
  messageTextAdmin: {
    color: "#FFFFFF",
  },
  messageTimestamp: {
    fontSize: 10,
    color: C.textMuted,
    marginTop: 6,
  },
  messageTimestampAdmin: {
    color: "rgba(255,255,255,0.65)",
  },

  // Closed notice
  closedNotice: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  closedNoticeIcon: {
    fontSize: 36,
  },
  closedNoticeText: {
    fontSize: 13,
    color: C.textMuted,
    fontWeight: "500",
  },

  // Reply
  replyBox: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.surface,
    gap: 10,
  },
  replyInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: C.bg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: C.textPrimary,
    borderWidth: 1,
    borderColor: C.border,
  },
  sendBtn: {
    backgroundColor: C.brand,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: "flex-end",
  },
  sendBtnDisabled: {
    backgroundColor: C.border,
  },
  sendBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },

  // Empty states
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyText: {
    fontSize: 13,
    color: C.textMuted,
    textAlign: "center",
  },
  emptyDetail: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  emptyDetailIcon: {
    fontSize: 52,
  },
  emptyDetailTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: C.textPrimary,
  },
  emptyDetailSub: {
    fontSize: 13,
    color: C.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },

  // Modal
  modalSafe: {
    flex: 1,
    backgroundColor: C.surface,
  },
});