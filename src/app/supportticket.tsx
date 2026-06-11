/**
 * SupportTicketManagement.tsx
 * React Native — exact port of the web version
 *
 * Dependencies (add to your project):
 *   npm install @expo/vector-icons
 *   -- OR --
 *   npm install react-native-vector-icons
 *   (icons used: MaterialCommunityIcons + Ionicons as Bootstrap-icon substitutes)
 *
 * Bootstrap Icons are web-only (SVG font). The closest RN approach is
 * @expo/vector-icons (MaterialCommunityIcons / Ionicons). Every icon is
 * mapped 1-to-1 to a visually identical alternative below.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { getApiErrorMessage } from "@/lib/api/client";
import { mapSupportTicket } from "@/lib/mappers";
import {
  fetchSupportTicket,
  fetchSupportTickets,
  replySupportTicket,
  updateSupportTicketStatus,
} from "@/services/supportApi";
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View, 
  useWindowDimensions,
} from "react-native";

// ─── icon shim ───────────────────────────────────────────────────────────────
// If you use Expo: import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
// If you use bare RN: import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
//                     import Ionicons from "react-native-vector-icons/Ionicons";
//
// For demonstration this file uses a tiny fallback so it compiles without the
// package. Replace the two lines below with the real imports once installed.
import { MaterialCommunityIcons } from "@expo/vector-icons";
// ─────────────────────────────────────────────────────────────────────────────

const { width: SCREEN_W } = Dimensions.get("window");

/* ══════════════════════════════════════════════
   THEME
══════════════════════════════════════════════ */
const ORANGE  = "#F97316";
const DARK_BG = "#7B3F00";

/* ══════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════ */
type TicketStatus   = "Open" | "In Progress" | "Waiting" | "Resolved" | "Urgent";
type TicketPriority = "General" | "High" | "Low" | "Critical";

interface Message {
  from:    string;
  content: string;
  time:    string;
  isAdmin: boolean;
}

interface Ticket {
  id:       string;
  subject:  string;
  user:     string;
  priority: TicketPriority;
  status:   TicketStatus;
  ticketNo: string;
  date:     string;
  messages: Message[];
}

const STATUS_TO_API: Record<string, string> = {
  Open: "open",
  "In Progress": "in_progress",
  Waiting: "waiting",
  Resolved: "closed",
  Urgent: "open",
};

/* ══════════════════════════════════════════════
   BADGE CONFIGS
══════════════════════════════════════════════ */
const PRIORITY_BADGE: Record<TicketPriority, { bg: string; color: string }> = {
  "General":  { bg: "#1F2937", color: "#fff" },
  "High":     { bg: "#F59E0B", color: "#fff" },
  "Low":      { bg: "#3B82F6", color: "#fff" },
  "Critical": { bg: "#EF4444", color: "#fff" },
};

const STATUS_BADGE: Record<TicketStatus, { bg: string; color: string }> = {
  "Open":        { bg: "#F97316", color: "#fff" },
  "In Progress": { bg: "#F59E0B", color: "#fff" },
  "Waiting":     { bg: "#0D9488", color: "#fff" },
  "Resolved":    { bg: "#10B981", color: "#fff" },
  "Urgent":      { bg: "#EF4444", color: "#fff" },
};

const ALL_STATUSES:   (TicketStatus   | "All Status")[]     = ["All Status", "Open", "In Progress", "Waiting", "Resolved", "Urgent"];
const ALL_PRIORITIES: (TicketPriority | "All Priorities")[] = ["All Priorities", "General", "High", "Low", "Critical"];

/* ══════════════════════════════════════════════
   ICON MAP  (Bootstrap → MaterialCommunityIcons / Ionicons)
══════════════════════════════════════════════ */
// Each helper renders an icon matching the original Bootstrap icon
const Icon = {
  headset:        (size: number, color: string) => <MaterialCommunityIcons name="headset" size={size} color={color} />,
  ticket:         (size: number, color: string) => <MaterialCommunityIcons name="ticket-outline" size={size} color={color} />,
  envelopeOpen:   (size: number, color: string) => <MaterialCommunityIcons name="email-open-outline" size={size} color={color} />,
  refresh:        (size: number, color: string) => <MaterialCommunityIcons name="refresh" size={size} color={color} />,
  clock:          (size: number, color: string) => <MaterialCommunityIcons name="clock-outline" size={size} color={color} />,
  checkCircle:    (size: number, color: string) => <MaterialCommunityIcons name="check-circle-outline" size={size} color={color} />,
  exclamation:    (size: number, color: string) => <MaterialCommunityIcons name="alert-circle-outline" size={size} color={color} />,
  person:         (size: number, color: string) => <MaterialCommunityIcons name="account-circle-outline" size={size} color={color} />,
  personFill:     (size: number, color: string) => <MaterialCommunityIcons name="account-circle" size={size} color={color} />,
  send:           (size: number, color: string) => <MaterialCommunityIcons name="send" size={size} color={color} />,
  chat:           (size: number, color: string) => <MaterialCommunityIcons name="chat-outline" size={size} color={color} />,
  inbox:          (size: number, color: string) => <MaterialCommunityIcons name="inbox" size={size} color={color} />,
  home:           (size: number, color: string) => <MaterialCommunityIcons name="home" size={size} color={color} />,
  chevronRight:   (size: number, color: string) => <MaterialCommunityIcons name="chevron-right" size={size} color={color} />,
  chevronDown:    (size: number, color: string) => <MaterialCommunityIcons name="chevron-down" size={size} color={color} />,
  chevronUp:      (size: number, color: string) => <MaterialCommunityIcons name="chevron-up" size={size} color={color} />,
  arrowLeft:      (size: number, color: string) => <MaterialCommunityIcons name="arrow-left" size={size} color={color} />,
};

/* ══════════════════════════════════════════════
   PRIORITY & STATUS BADGES
══════════════════════════════════════════════ */
function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const cfg = PRIORITY_BADGE[priority];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.badgeText, { color: cfg.color }]}>{priority}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: TicketStatus }) {
  const cfg = STATUS_BADGE[status];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.badgeText, { color: cfg.color }]}>{status}</Text>
    </View>
  );
}

/* ══════════════════════════════════════════════
   CUSTOM DROPDOWN
══════════════════════════════════════════════ */
function Dropdown<T extends string>({
  value, onChange, options,
}: {
  value: T; onChange: (v: T) => void; options: T[];
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<View>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const { width: screenW } = Dimensions.get("window");
  const isDesktop = screenW >= 1024;

  const handlePress = () => {
    if (!open && triggerRef.current) {
      triggerRef.current.measure((x, y, width, height, pageX, pageY) => {
        const { width: screenWidth } = Dimensions.get("window");
        const menuWidth = Math.min(width, screenWidth - 32);
        const adjustedLeft = Math.min(pageX, screenWidth - menuWidth - 16);
        setMenuPosition({ top: pageY + height, left: adjustedLeft, width: menuWidth });
      });
    }
    setOpen(o => !o);
  };

  return (
    <View style={{ position: "relative", zIndex: 10 }}>
      <TouchableOpacity
        ref={triggerRef as any}
        onPress={handlePress}
        style={styles.dropdownTrigger}
        activeOpacity={0.8}
      >
        <Text style={styles.dropdownValue}>{value}</Text>
        {open ? Icon.chevronUp(12, "#6B7280") : Icon.chevronDown(12, "#6B7280")}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
        {menuPosition && (
          <View style={{
            position: "absolute",
            top: menuPosition.top,
            left: menuPosition.left,
            width: menuPosition.width,
            zIndex: 9999,
          }}>
            <View style={{
              backgroundColor: "#fff",
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 20,
              elevation: 10,
              overflow: "hidden",
              width: "100%",
              maxWidth: isDesktop ? 400 : 320,
              zIndex: 10000,
            }}>
              {options.map(opt => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => { onChange(opt); setOpen(false); }}
                  style={[
                    styles.dropdownItem,
                    value === opt && styles.dropdownItemSelected,
                  ]}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    value === opt && styles.dropdownItemTextSelected,
                  ]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

/* ══════════════════════════════════════════════
   STAT CARD
══════════════════════════════════════════════ */
type StatIconKey = keyof typeof STAT_ICONS;
const STAT_ICONS = {
  "bi-ticket-perforated-fill":  () => Icon.ticket(24, "#fff"),
  "bi-envelope-open-fill":      () => Icon.envelopeOpen(24, "#fff"),
  "bi-arrow-clockwise":         () => Icon.refresh(24, "#fff"),
  "bi-clock-fill":              () => Icon.clock(24, "#fff"),
  "bi-check-circle-fill":       () => Icon.checkCircle(24, "#fff"),
  "bi-exclamation-circle-fill": () => Icon.exclamation(24, "#fff"),
};

function StatCard({ label, count, bg, icon }: { label: string; count: number; bg: string; icon: string }) {
  const renderIcon = STAT_ICONS[icon as StatIconKey];
  return (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      {renderIcon?.()}
      <Text style={styles.statCount}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/* ══════════════════════════════════════════════
   TICKET ROW
══════════════════════════════════════════════ */
function TicketRow({
  ticket, selected, onPress,
}: {
  ticket: Ticket; selected: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.ticketRow,
        selected && styles.ticketRowSelected,
      ]}
    >
      {/* left accent bar */}
      <View style={[
        styles.ticketAccent,
        { backgroundColor: selected ? ORANGE : "transparent" },
      ]} />

      <View style={{ flex: 1, paddingLeft: 12 }}>
        <Text style={styles.ticketSubject} numberOfLines={2}>{ticket.subject}</Text>
        <View style={styles.ticketUserRow}>
          {Icon.person(13, "#6B7280")}
          <Text style={styles.ticketUser}>{ticket.user}</Text>
        </View>
        <View style={styles.ticketBadgeRow}>
          <PriorityBadge priority={ticket.priority} />
          <View style={{ width: 6 }} />
          <StatusBadge status={ticket.status} />
        </View>
        <Text style={styles.ticketMeta}>{ticket.ticketNo}  |  {ticket.date}</Text>
      </View>
    </TouchableOpacity>
  );
}

/* ══════════════════════════════════════════════
   CONVERSATION PANEL
══════════════════════════════════════════════ */
function ConversationPanel({
  ticket, onBack, onSendMessage, onStatusChange,
}: {
  ticket: Ticket | null;
  onBack: () => void;
  onSendMessage: (message: string) => void;
  onStatusChange: (status: TicketStatus) => void;
}) {
  const [replyText, setReplyText] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  if (!ticket) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconCircle}>
          {Icon.chat(34, "#D1D5DB")}
        </View>
        <Text style={styles.emptyTitle}>Select a ticket to view conversation</Text>
        <Text style={styles.emptySubtitle}>Choose from the list to start helping users</Text>
      </View>
    );
  }

  return (
    <View style={styles.chatContainer}>
      {/* Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {Icon.arrowLeft(15, "#374151")}
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.chatHeaderTitle} numberOfLines={2}>{ticket.subject}</Text>
          <View style={styles.chatHeaderMeta}>
            <View style={{ marginRight: 4 }}>{Icon.person(11, "#6B7280")}</View>
            <Text style={styles.chatHeaderUser}>{ticket.user}</Text>
            <Text style={styles.chatHeaderSep}> | </Text>
            <PriorityBadge priority={ticket.priority} />
            <View style={{ width: 4 }} />
            <StatusBadge status={ticket.status} />
          </View>
          <Text style={styles.ticketMeta}>{ticket.ticketNo}</Text>
          {ticket.status !== "Resolved" && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {(["Open", "In Progress", "Waiting", "Resolved"] as TicketStatus[]).map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => onStatusChange(s)}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    backgroundColor: ticket.status === s ? ORANGE : "#F3F4F6",
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: "600", color: ticket.status === s ? "#fff" : "#374151" }}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {ticket.messages.map((msg, idx) => (
          <View
            key={idx}
            style={[
              styles.messageBubbleWrapper,
              msg.isAdmin ? styles.messageBubbleRight : styles.messageBubbleLeft,
            ]}
          >
            <View style={[
              styles.messageBubble,
              { backgroundColor: msg.isAdmin ? ORANGE : "#fff" },
              msg.isAdmin ? styles.bubbleAdmin : styles.bubbleUser,
            ]}>
              <View style={styles.messageFrom}>
                {msg.isAdmin
                  ? Icon.headset(11, "rgba(255,255,255,0.85)")
                  : Icon.personFill(11, "#6B7280")}
                <Text style={[
                  styles.messageFromText,
                  { color: msg.isAdmin ? "rgba(255,255,255,0.85)" : "#6B7280" },
                ]}>
                  {"  "}{msg.from}
                </Text>
              </View>
              <Text style={[
                styles.messageContent,
                { color: msg.isAdmin ? "#fff" : "#1F2937" },
              ]}>
                {msg.content}
              </Text>
            </View>
            <Text style={[
              styles.messageTime,
              { alignSelf: msg.isAdmin ? "flex-end" : "flex-start" },
            ]}>
              {msg.time}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Reply box */}
      <View style={styles.replyBox}>
        <TextInput
          value={replyText}
          onChangeText={setReplyText}
          placeholder="Type your reply..."
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={2}
          style={styles.replyInput}
        />
        <TouchableOpacity
          onPress={() => {
            if (replyText.trim()) {
              onSendMessage(replyText);
              setReplyText("");
            }
          }}
          style={styles.sendBtn}
          activeOpacity={0.85}
        >
          {Icon.send(14, "#fff")}
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
export default function SupportTicketManagement() {
  const [statusFilter,   setStatusFilter]   = useState<TicketStatus | "All Status">("All Status");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "All Priorities">("All Priorities");
  const [selectedId,     setSelectedId]     = useState<string | null>(null);
  const [view,           setView]           = useState<"list" | "chat">("list");
  const [tickets,        setTickets]        = useState<Ticket[]>([]);

  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isDesktop = width >= 1024;

  const loadTickets = useCallback(async () => {
    try {
      const statusParam = statusFilter === "All Status" ? undefined : STATUS_TO_API[statusFilter];
      const res = await fetchSupportTickets({ status: statusParam, size: 100 });
      let rows = (res.items ?? []).map(mapSupportTicket) as Ticket[];
      if (priorityFilter !== "All Priorities") {
        rows = rows.filter((t) => t.priority === priorityFilter);
      }
      setTickets(rows);
    } catch (e) {
      console.warn(getApiErrorMessage(e));
      setTickets([]);
    }
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const refreshSelectedTicket = async (id: string) => {
    try {
      const detail = mapSupportTicket(await fetchSupportTicket(Number(id))) as Ticket;
      setTickets((prev) => prev.map((t) => (t.id === id ? detail : t)));
    } catch (e) {
      console.warn(getApiErrorMessage(e));
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!selectedId) return;
    try {
      await replySupportTicket(Number(selectedId), message);
      if (statusFilter === "All Status" || statusFilter === "Open") {
        await updateSupportTicketStatus(Number(selectedId), "in_progress");
      }
      await refreshSelectedTicket(selectedId);
      await loadTickets();
    } catch (e) {
      console.warn(getApiErrorMessage(e));
    }
  };

  const handleStatusChange = async (status: TicketStatus) => {
    if (!selectedId) return;
    const apiStatus = STATUS_TO_API[status];
    if (!apiStatus) return;
    try {
      await updateSupportTicketStatus(Number(selectedId), apiStatus);
      await refreshSelectedTicket(selectedId);
      await loadTickets();
    } catch (e) {
      console.warn(getApiErrorMessage(e));
    }
  };

  const countOf = (s: TicketStatus) => tickets.filter(t => t.status === s).length;

  const STATS = [
    { label: "Total Tickets", count: tickets.length,        bg: ORANGE,    icon: "bi-ticket-perforated-fill"   },
    { label: "Open",          count: countOf("Open"),        bg: "#10B981", icon: "bi-envelope-open-fill"       },
    { label: "In Progress",   count: countOf("In Progress"), bg: "#F59E0B", icon: "bi-arrow-clockwise"          },
    { label: "Waiting",       count: countOf("Waiting"),     bg: "#0D9488", icon: "bi-clock-fill"               },
    { label: "Resolved",      count: countOf("Resolved"),    bg: "#6B7280", icon: "bi-check-circle-fill"        },
    { label: "Urgent",        count: countOf("Urgent"),      bg: "#EF4444", icon: "bi-exclamation-circle-fill"  },
  ];

  const filtered = tickets.filter(t => {
    const okStatus   = statusFilter   === "All Status"     || t.status   === statusFilter;
    const okPriority = priorityFilter === "All Priorities" || t.priority === priorityFilter;
    return okStatus && okPriority;
  });

  const selectedTicket = tickets.find(t => t.id === selectedId) ?? null;

  // ── Chat screen ──────────────────────────────────────────────────────────
  if (view === "chat") {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" backgroundColor={ORANGE} />
        <ConversationPanel
          ticket={selectedTicket}
          onBack={() => { setView("list"); setSelectedId(null); }}
          onSendMessage={handleSendMessage}
          onStatusChange={handleStatusChange}
        />
      </View>
    );
  }

  // ── List screen ──────────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={ORANGE} />

      <ScrollView
        style={{ flex: 1 }}
        stickyHeaderIndices={[0]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Orange Header ── */}
        <View style={styles.header}>
          {/* Decorative circles */}
          <View style={[styles.deco, { width: 130, height: 130, right: -20, top: -35, opacity: 0.12 }]} />
          <View style={[styles.deco, { width: 85,  height: 85,  right: 60, top: 8, opacity: 0.09 }]} />
          <View style={[styles.deco, { width: 65,  height: 65,  right: 40, top: 50, opacity: 0.07 }]} />

          {/* Icon box */}
          <View style={styles.headerIconBox}>
            {Icon.headset(22, ORANGE)}
          </View>
          <Text style={styles.headerTitle}>Support Ticket Management</Text>

          {/* Breadcrumb */}
          <View style={styles.breadcrumb}>
            {Icon.home(13, "rgba(255,255,255,0.85)")}
            <Text style={styles.breadcrumbActive}>  Dashboard</Text>
            {Icon.chevronRight(11, "rgba(255,255,255,0.7)")}
            <Text style={styles.breadcrumbCurrent}>Support Management</Text>
          </View>
        </View>

        <View style={[styles.content, { padding: isDesktop ? 32 : isMobile ? 14 : 20 }]}>
          {/* ── Stat Cards (responsive grid) ── */}
          <View style={styles.statGrid}>
            {STATS.map((s, i) => (
              <View key={s.label} style={[styles.statGridItem, isMobile && styles.statGridItemMobile, isDesktop && styles.statGridItemDesktop]}>
                <StatCard {...s} />
              </View>
            ))}
          </View>

          {/* ── Filters ── */}
          <View style={styles.filterCard}>
            <View style={styles.filterRow}>
              <View style={styles.filterCol}>
                <Text style={styles.filterLabel}>Filter by Status</Text>
                <Dropdown
                  value={statusFilter as any}
                  onChange={v => setStatusFilter(v as any)}
                  options={ALL_STATUSES as any}
                />
              </View>
              <View style={{ width: 14 }} />
              <View style={styles.filterCol}>
                <Text style={styles.filterLabel}>Filter by Priority</Text>
                <Dropdown
                  value={priorityFilter as any}
                  onChange={v => setPriorityFilter(v as any)}
                  options={ALL_PRIORITIES as any}
                />
              </View>
            </View>
          </View>

          {/* ── Desktop Two-Column Layout ── */}
          {!isMobile && (
            <View style={styles.desktopTwoColumnLayout}>
              {/* Left Panel - Ticket List */}
              <View style={styles.desktopLeftPanel}>
                <View style={styles.ticketCard}>
                  {/* List header */}
                  <View style={styles.ticketListHeader}>
                    {Icon.ticket(16, "#fff")}
                    <Text style={styles.ticketListHeaderText}>Support Tickets</Text>
                    <View style={styles.ticketCountBadge}>
                      <Text style={styles.ticketCountText}>{filtered.length}</Text>
                    </View>
                  </View>

                  {/* Rows */}
                  {filtered.length === 0 ? (
                    <View style={styles.noTickets}>
                      {Icon.inbox(36, "#D1D5DB")}
                      <Text style={styles.noTicketsText}>No tickets match the filters</Text>
                    </View>
                  ) : (
                    filtered.map(t => (
                      <TicketRow
                        key={t.id}
                        ticket={t}
                        selected={selectedId === t.id}
                        onPress={() => {
                          setSelectedId(t.id);
                        }}
                      />
                    ))
                  )}
                </View>
              </View>

              {/* Right Panel - Conversation Area */}
              <View style={styles.desktopRightPanel}>
                {selectedTicket ? (
                  <ConversationPanel
                    ticket={selectedTicket}
                    onBack={() => setSelectedId(null)}
                    onSendMessage={handleSendMessage}
                    onStatusChange={handleStatusChange}
                  />
                ) : (
                  <View style={styles.desktopEmptyState}>
                    <View style={styles.desktopEmptyIcon}>
                      {Icon.chat(48, "#D1D5DB")}
                    </View>
                    <Text style={styles.desktopEmptyTitle}>Select a ticket to view conversation</Text>
                    <Text style={styles.desktopEmptySubtitle}>Choose from the list on the left to start helping users</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ── Mobile Ticket List ── */}
          {isMobile && (
            <View style={styles.ticketCard}>
              {/* List header */}
              <View style={styles.ticketListHeader}>
                {Icon.ticket(16, "#fff")}
                <Text style={styles.ticketListHeaderText}>Support Tickets</Text>
                <View style={styles.ticketCountBadge}>
                  <Text style={styles.ticketCountText}>{filtered.length}</Text>
                </View>
              </View>

              {/* Rows */}
              {filtered.length === 0 ? (
                <View style={styles.noTickets}>
                  {Icon.inbox(36, "#D1D5DB")}
                  <Text style={styles.noTicketsText}>No tickets match the filters</Text>
                </View>
              ) : (
                filtered.map(t => (
                  <TicketRow
                    key={t.id}
                    ticket={t}
                    selected={selectedId === t.id}
                    onPress={() => {
                      setSelectedId(t.id);
                      setView("chat");
                    }}
                  />
                ))
              )}
            </View>
          )}

          {/* Footer */}
          <Text style={styles.footer}>
            2026 © Flintnthread India Pvt. Ltd. — Support System
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

/* ══════════════════════════════════════════════
   STYLES
══════════════════════════════════════════════ */
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },

  /* ── Header ── */
  header: {
    backgroundColor: ORANGE,
    paddingTop: (Platform.OS === "android" ? StatusBar.currentHeight ?? 24 : 44) + 16,
    paddingBottom: 24,
    paddingHorizontal: 16,
    overflow: "hidden",
    position: "relative",
  },
  deco: {
    position: "absolute",
    borderRadius: 9999,
    backgroundColor: "#fff",
  },
  headerIconBox: {
    width: 46, height: 46,
    backgroundColor: "#fff",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
  },
  headerTitle: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 20,
    marginBottom: 6,
  },
  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  breadcrumbActive: {
    color: "#FFD89B",
    fontWeight: "600",
    fontSize: 13,
  },
  breadcrumbCurrent: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
  },

  /* ── Content ── */
  content: {
    padding: 14,
  },

  /* ── Stat Grid ── */
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -5,
    marginBottom: 16,
  },
  statGridItem: {
    width: "50%",
    paddingHorizontal: 5,
    marginBottom: 10,
  },
  statGridItemMobile: {
    width: "32%",
  },
  statGridItemDesktop: {
    width: "16.66%",
  },

  /* Desktop Two-Column Layout */
  desktopTwoColumnLayout: {
    flexDirection: "row",
    gap: 20,
    marginTop: 20,
  },
  desktopLeftPanel: {
    width: "43%",
  },
  desktopRightPanel: {
    width: "57%",
  },
  desktopEmptyState: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  desktopEmptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  desktopEmptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a2332",
    marginBottom: 8,
    textAlign: "center",
  },
  desktopEmptySubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },
  statCard: {
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
    minHeight: 100,
  },
  statCount: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 30,
  },
  statLabel: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.92,
    textAlign: "center",
    lineHeight: 16,
  },

  /* ── Filter Card ── */
  filterCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginBottom: 16,
    zIndex: 200,
  },
  filterRow: {
    flexDirection: "row",
  },
  filterCol: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },

  /* ── Dropdown ── */
  dropdownTrigger: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  dropdownValue: {
    flex: 1,
    fontSize: 13,
    color: "#374151",
  },
  dropdownMenu: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    zIndex: 9999,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 20,
    elevation: 10,
    marginTop: 4,
  },
  dropdownItem: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownItemSelected: {
    backgroundColor: "#FFF7ED",
  },
  dropdownItemText: {
    fontSize: 13,
    color: "#374151",
  },
  dropdownItemTextSelected: {
    color: ORANGE,
    fontWeight: "700",
  },

  /* ── Ticket Card / List ── */
  ticketCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    marginBottom: 16,
  },
  ticketListHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 16,
    backgroundColor: ORANGE,
  },
  ticketListHeaderText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    flex: 1,
  },
  ticketCountBadge: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 1,
  },
  ticketCountText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  noTickets: {
    padding: 40,
    alignItems: "center",
    gap: 10,
  },
  noTicketsText: {
    color: "#9CA3AF",
    fontSize: 13,
  },

  /* ── Ticket Row ── */
  ticketRow: {
    flexDirection: "row",
    paddingVertical: 14,
    paddingRight: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "#fff",
  },
  ticketRowSelected: {
    backgroundColor: "#FFF7ED",
  },
  ticketAccent: {
    width: 3,
    borderRadius: 2,
    alignSelf: "stretch",
  },
  ticketSubject: {
    fontWeight: "700",
    fontSize: 13,
    color: "#111827",
    marginBottom: 5,
    lineHeight: 18,
  },
  ticketUserRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 7,
  },
  ticketUser: {
    fontSize: 12,
    color: "#6B7280",
  },
  ticketBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 6,
  },
  ticketMeta: {
    fontSize: 11,
    color: "#9CA3AF",
  },

  /* ── Badge ── */
  badge: {
    borderRadius: 5,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },

  /* ── Chat / Conversation ── */
  chatContainer: {
    flex: 1,
    backgroundColor: "#fff",
    flexDirection: "column",
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) + 14 : 50,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  backBtn: {
    width: 34,
    height: 34,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  chatHeaderTitle: {
    fontWeight: "700",
    fontSize: 14,
    color: "#111827",
    marginBottom: 4,
  },
  chatHeaderMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 4,
    gap: 4,
  },
  chatHeaderUser: {
    fontSize: 11,
    color: "#6B7280",
  },
  chatHeaderSep: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  messageList: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  messageBubbleWrapper: {
    marginBottom: 14,
  },
  messageBubbleLeft: {
    alignItems: "flex-start",
  },
  messageBubbleRight: {
    alignItems: "flex-end",
  },
  messageBubble: {
    maxWidth: "78%",
    padding: 11,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  bubbleAdmin: {
    borderRadius: 14,
    borderTopRightRadius: 4,
  },
  bubbleUser: {
    borderRadius: 14,
    borderTopLeftRadius: 4,
  },
  messageFrom: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  messageFromText: {
    fontSize: 11,
    fontWeight: "700",
  },
  messageContent: {
    fontSize: 13,
    lineHeight: 19,
  },
  messageTime: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 4,
    paddingHorizontal: 4,
  },
  replyBox: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#fff",
    gap: 10,
  },
  replyInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: "#374151",
    maxHeight: 80,
    textAlignVertical: "top",
  },
  sendBtn: {
    backgroundColor: ORANGE,
    borderRadius: 10,
    paddingHorizontal: 18,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sendBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },

  /* ── Empty State ── */
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    backgroundColor: "#fff",
    gap: 14,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 21,
  },

  /* ── Footer ── */
  footer: {
    textAlign: "center",
    fontSize: 12,
    color: "#9CA3AF",
    paddingVertical: 20,
  },
});