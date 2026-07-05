import React, { useState, useCallback, useEffect } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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
import Svg, { Path } from "react-native-svg";


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
  brand: "#ef7b1a",
  brandDark: "#151D4F",
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
  // Show a short display value: strip "All " prefix for compactness
  const displayValue = value.replace(/^All /, "") || value;
  return (
    <View style={styles.dropdownWrapper}>
      <TouchableOpacity
        style={styles.dropdownTrigger}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.dropdownTriggerText} numberOfLines={1}>
          {displayValue}
        </Text>
        <ChevronDownIcon size={14} color={C.textSecondary} />
      </TouchableOpacity>

      <Modal transparent visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
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

// ─── Lightweight inline Bootstrap vector icons ─────────────────────────────

const SearchIcon = ({ size = 16, color = C.textMuted }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path
      d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"
      fill={color}
    />
  </Svg>
);

const CloseIcon = ({ size = 16, color = C.textSecondary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path
      d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"
      fill={color}
    />
  </Svg>
);

const ClockIcon = ({ size = 16, color = C.textSecondary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path
      d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71z"
      fill={color}
    />
    <Path
      d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"
      fill={color}
    />
  </Svg>
);

const FileTextIcon = ({ size = 16, color = C.textSecondary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path
      d="M5 4a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1zm-.5 2.5A.5.5 0 0 1 5 6h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5M5 8a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1zm0 2a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1z"
      fill={color}
    />
    <Path
      d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zm10-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1"
      fill={color}
    />
  </Svg>
);

const CircleUserIcon = ({ size = 16, color = C.textSecondary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path
      d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0"
      fill={color}
    />
    <Path
      fillRule="evenodd"
      d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1"
      fill={color}
      clipRule="evenodd"
    />
  </Svg>
);

const EnvelopeIcon = ({ size = 16, color = C.textSecondary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path
      d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1zm13 2.383-4.708 2.825L15 11.105zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741M1 11.105l4.708-2.897L1 5.383z"
      fill={color}
    />
  </Svg>
);

const SmartphoneIcon = ({ size = 16, color = C.textSecondary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path
      d="M11 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM5 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"
      fill={color}
    />
    <Path
      d="M8 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2"
      fill={color}
    />
  </Svg>
);

const FolderIcon = ({ size = 16, color = C.textSecondary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path
      d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.958 0 1.76.56 2.056 1.353l.543 1.447H14.5A1.5 1.5 0 0 1 16 6.3V14a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 14V5v-.5A1.5 1.5 0 0 1 1.5 3.5m.3 1H1.5a.5.5 0 0 0-.5.5V14a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5V6.3a.5.5 0 0 0-.5-.5H8.3a.5.5 0 0 0-.414-.218L7.09 4.133A.5.5 0 0 0 6.637 4H2.5a.5.5 0 0 0-.5.5z"
      fill={color}
    />
  </Svg>
);

const ChatIcon = ({ size = 16, color = C.textMuted }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path
      d="M2 1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h9.586a1 1 0 0 1 .707.293l2.853 2.853a.5.5 0 0 0 .854-.353V2a1 1 0 0 0-1-1zM2 0h12a2 2 0 0 1 2 2v12.793a.5.5 0 0 1-.854.353l-2.853-2.853a1 1 0 0 0-.707-.293H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2"
      fill={color}
    />
  </Svg>
);

const LockIcon = ({ size = 16, color = C.textMuted }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path
      d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2m3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2M5 8h6a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1"
      fill={color}
    />
  </Svg>
);

const InboxIcon = ({ size = 16, color = C.textMuted }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path
      d="M4.98 4a.5.5 0 0 0-.39.188L1.54 8H6a.5.5 0 0 1 .5.5 1.5 1.5 0 1 0 3 0A.5.5 0 0 1 10 8h4.46l-3.05-3.813A.5.5 0 0 0 11.02 4zm-1.11-.471A1.5 1.5 0 0 1 4.98 3h6.04a1.5 1.5 0 0 1 1.11.471L15.906 8.5A1.5 1.5 0 0 1 14.5 11h-13a1.5 1.5 0 0 1-1.406-2.5zM1.5 12a.5.5 0 0 0-.5.5v2a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 0-.5-.5zM0 12.5A1.5 1.5 0 0 1 1.5 11h13a1.5 1.5 0 0 1 1.5 1.5v2a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 14.5z"
      fill={color}
    />
  </Svg>
);

const ChevronDownIcon = ({ size = 16, color = C.textSecondary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path
      d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"
      fill={color}
    />
  </Svg>
);

const CheckCircleIcon = ({ size = 16, color = C.textSecondary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path fill={color} d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
  </Svg>
);

const AlertIcon = ({ size = 16, color = C.textSecondary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Path fill={color} d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
  </Svg>
);

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  sublabel: string;
  count: number;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}

const StatCard = ({ label, sublabel, count, color, bgColor, icon, compact }: StatCardProps & { compact?: boolean }) => {
  if (compact) {
    return (
      <View style={styles.statCardCompact}>
        <View style={[styles.statCardIconBoxCompact, { backgroundColor: bgColor }]}>{icon}</View>
        <Text style={[styles.statCardValueCompact, { color }]} numberOfLines={1}>
          {count}
        </Text>
        <Text style={styles.statCardLabelCompact} numberOfLines={1}>
          {label}
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconChip, { backgroundColor: bgColor }]}>
        {icon}
      </View>
      <Text style={[styles.statCount, { color }]} numberOfLines={1}>
        {count}
      </Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};


// ─── Ticket List Item ─────────────────────────────────────────────────────────

interface TicketItemProps {
  ticket: Ticket;
  selected: boolean;
  onPress: () => void;
}

const TicketItem = ({ ticket, selected, onPress, compact }: TicketItemProps & { compact?: boolean }) => (
  <TouchableOpacity
    style={[styles.ticketItem, compact && styles.ticketItemMobile, selected && styles.ticketItemSelected]}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <Text style={[styles.ticketDescription, compact && styles.ticketDescriptionMobile]} numberOfLines={2}>
      {ticket.description}
    </Text>
    {compact ? (
      // Mobile layout: seller + badges inline
      <View style={styles.ticketMetaRow}>
        <View style={styles.metaItem}>
          <CircleUserIcon size={14} color={C.textSecondary} />
          <Text style={styles.ticketSellerNameMobile}>{ticket.sellerName}</Text>
        </View>
        <View style={styles.ticketBadgesMobile}>
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
        </View>
      </View>
    ) : (
      // Desktop layout
      <>
        <View style={styles.ticketSeller}>
          <CircleUserIcon size={14} color={C.textSecondary} />
          <Text style={styles.ticketSellerName}>{ticket.sellerName}</Text>
        </View>
        <View style={styles.ticketBadges}>
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
        </View>
      </>
    )}
    <View style={[styles.ticketMeta, compact && styles.ticketMetaMobile]}>
      <View style={styles.metaItem}>
        <FileTextIcon size={14} color={C.textSecondary} />
        <Text style={[styles.ticketMetaText, compact && styles.ticketMetaTextMobile]}>{ticket.ticketCode}</Text>
      </View>
      <View style={styles.metaItem}>
        <ClockIcon size={14} color={C.textSecondary} />
        <Text style={[styles.ticketMetaText, compact && styles.ticketMetaTextMobile]}>{ticket.createdAt}</Text>
      </View>
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
  
  const isMobile = !!onClose;

  const handleSend = () => {
    const t = replyText.trim();
    if (!t) return;
    onSend(ticket.id, t);
    setReplyText("");
  };

  return (
    <View style={styles.chatPanel}>
      {/* Detail Header */}
      <View style={[styles.chatHeader, isMobile && styles.chatHeaderMobile]}>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={[styles.chatBackBtn, isMobile && styles.chatBackBtnMobile]}>
            {isMobile ? (
              <Ionicons name="chevron-back" size={24} color={C.textPrimary} />
            ) : (
              <Text style={styles.chatBackIcon}>←</Text>
            )}
          </TouchableOpacity>
        )}
        <View style={[styles.chatHeaderInfo, isMobile && styles.chatHeaderInfoMobile]}>
          <Text style={[styles.chatHeaderTitle, isMobile && styles.chatHeaderTitleMobile]} numberOfLines={1}>
            {ticket.description}
          </Text>
          <View style={[styles.chatHeaderMeta, isMobile && styles.chatHeaderMetaMobile]}>
            <View style={styles.chatHeaderMetaItem}>
              <FileTextIcon size={14} color={isMobile ? C.textSecondary : "rgba(255,255,255,0.85)"} />
              <Text style={[styles.chatHeaderMetaText, isMobile && styles.chatHeaderMetaTextMobile]}>{ticket.ticketCode}</Text>
            </View>
            <View style={styles.chatHeaderMetaItem}>
              <CircleUserIcon size={14} color={isMobile ? C.textSecondary : "rgba(255,255,255,0.85)"} />
              <Text style={[styles.chatHeaderMetaText, isMobile && styles.chatHeaderMetaTextMobile]}>{ticket.sellerName}</Text>
            </View>
            <StatusBadge status={ticket.status} />
          </View>
          <View style={[styles.chatHeaderContact, isMobile && styles.chatHeaderContactMobile]}>
            {!!ticket.email && (
              <View style={styles.chatContactItem}>
                <EnvelopeIcon size={14} color={isMobile ? C.textSecondary : "rgba(255,255,255,0.75)"} />
                <Text style={[styles.chatContactText, isMobile && styles.chatContactTextMobile]}>{ticket.email}</Text>
              </View>
            )}
            {!!ticket.phone && (
              <View style={styles.chatContactItem}>
                <SmartphoneIcon size={14} color={isMobile ? C.textSecondary : "rgba(255,255,255,0.75)"} />
                <Text style={[styles.chatContactText, isMobile && styles.chatContactTextMobile]}>{ticket.phone}</Text>
              </View>
            )}
            {!!ticket.department && (
              <View style={styles.chatContactItem}>
                <FolderIcon size={14} color={isMobile ? C.textSecondary : "rgba(255,255,255,0.75)"} />
                <Text style={[styles.chatContactText, isMobile && styles.chatContactTextMobile]}>{ticket.department}</Text>
              </View>
            )}
          </View>
        </View>
        {isClosed && (
          <TouchableOpacity
            style={[styles.reopenBtn, isMobile && styles.reopenBtnMobile]}
            onPress={() => onReopen(ticket.id)}
          >
            <Text style={[styles.reopenBtnText, isMobile && styles.reopenBtnTextMobile]}>↺ Reopen</Text>
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
            <ChatIcon size={36} color={C.textMuted} />
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
              <View style={styles.messageMetaRow}>
                <CircleUserIcon
                  size={12}
                  color={msg.sender === "admin" ? "rgba(255,255,255,0.65)" : C.textMuted}
                />
                <Text
                  style={[
                    styles.messageTimestampText,
                    msg.sender === "admin" && styles.messageTimestampAdminText,
                  ]}
                >
                  {msg.senderName} · {msg.timestamp}
                </Text>
              </View>
            </View>
          </View>
        ))}

        {isClosed && (
          <View style={styles.closedNotice}>
            <LockIcon size={32} color={C.textMuted} />
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
      icon: <FolderIcon size={!isDesktop ? 14 : 18} color={C.brand} />,
    },
    {
      label: "Open",
      sublabel: "Needs response",
      count: stats.open,
      color: C.open.text,
      bgColor: C.open.bg,
      icon: <EnvelopeIcon size={!isDesktop ? 14 : 18} color={C.open.text} />,
    },
    {
      label: "In Progress",
      sublabel: "Being handled",
      count: stats.inProgress,
      color: C.inProgress.text,
      bgColor: C.inProgress.bg,
      icon: <ClockIcon size={!isDesktop ? 14 : 18} color={C.inProgress.text} />,
    },
    {
      label: "Waiting",
      sublabel: "Pending reply",
      count: stats.waiting,
      color: C.waitingAdmin.text,
      bgColor: C.waitingAdmin.bg,
      icon: <ChatIcon size={!isDesktop ? 14 : 18} color={C.waitingAdmin.text} />,
    },
    {
      label: "Resolved",
      sublabel: "Completed",
      count: stats.resolved,
      color: C.resolved.text,
      bgColor: C.resolved.bg,
      icon: <CheckCircleIcon size={!isDesktop ? 14 : 18} color={C.resolved.text} />,
    },
    {
      label: "Urgent",
      sublabel: "High priority",
      count: stats.urgent,
      color: C.urgent.text,
      bgColor: C.urgent.bg,
      icon: <AlertIcon size={!isDesktop ? 14 : 18} color={C.urgent.text} />,
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
            <View style={[styles.headerPanel, !isDesktop && styles.headerPanelMobile]}>
              <View style={[styles.headerTitleRow, !isDesktop && styles.headerTitleRowMobile]}>
                <View style={styles.hIcon}>
                  <Ionicons name="ticket" size={21} color="#FFFFFF" />
                </View>
                <View style={styles.headerTitleTextWrap}>
                  <Text style={[styles.headerTitle, !isDesktop && styles.headerTitleMobile]}>Support Tickets</Text>
                  <Text style={styles.headerSubtitle}>Manage all support requests</Text>
                </View>
                <TouchableOpacity style={[styles.headerAvatar, !isDesktop && styles.headerAvatarMobile]}>
                  <Text style={[styles.headerAvatarText, !isDesktop && styles.headerAvatarTextMobile]}>A</Text>
                </TouchableOpacity>
              </View>

              {/* Spacer so the panel has enough height for cards to overlap into */}
              <View style={[styles.headerCardSpacer, !isDesktop && styles.headerCardSpacerMobile]} />
            </View>

            {/* Stat cards: overlapping the bottom edge of the dark panel */}
            {!isDesktop ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.statsScrollMobile}
                contentContainerStyle={styles.statsRowMobile}
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
                    compact={true}
                  />
                ))}
              </ScrollView>
            ) : (
              <View style={styles.statsWrapDesktop}>
                {statCards.map((card) => (
                  <StatCard
                    key={card.label}
                    label={card.label}
                    sublabel={card.sublabel}
                    count={card.count}
                    color={card.color}
                    bgColor={card.bgColor}
                    icon={card.icon}
                    compact={false}
                  />
                ))}
              </View>
            )}
          </View>

          {loadError ? (
            <Text style={{ color: C.brand, marginBottom: 8, paddingHorizontal: 4 }}>{loadError}</Text>
          ) : null}

          {/* ── Filters: desktop keeps original row, mobile gets stacked layout ── */}
          {isDesktop ? (
            <View style={styles.filtersRow}>
              <View style={styles.searchBox}>
                <SearchIcon size={18} color={C.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search tickets"
                  placeholderTextColor={C.textMuted}
                  value={searchText}
                  onChangeText={setSearchText}
                />
              </View>
              <Dropdown
                label="Status "
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
          ) : (
            <View style={styles.filtersContainerMobile}>
              <View style={styles.searchBoxMobile}>
                <SearchIcon size={18} color={C.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search tickets..."
                  placeholderTextColor={C.textMuted}
                  value={searchText}
                  onChangeText={setSearchText}
                />
                {!!searchText && (
                  <TouchableOpacity
                    onPress={() => setSearchText("")}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <CloseIcon size={14} color={C.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.dropdownsRowMobile}>
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
            </View>
          )}

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
                      <InboxIcon size={40} color={C.textMuted} />
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
                    <ChatIcon size={48} color={C.textMuted} />
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
              <View style={[styles.panelHeader, styles.panelHeaderMobile]}>
                <Text style={styles.panelTitle}>Support Tickets</Text>
                <Text style={styles.panelCountLabel}>
                  {filteredTickets.length} {filteredTickets.length === 1 ? "Ticket" : "Tickets"}
                </Text>
              </View>
              {filteredTickets.length === 0 ? (
                <View style={styles.emptyState}>
                  <InboxIcon size={40} color={C.textMuted} />
                  <Text style={styles.emptyText}>No tickets match your filters</Text>
                </View>
              ) : (
                filteredTickets.map((t) => (
                  <TicketItem
                    key={t.id}
                    ticket={t}
                    selected={false}
                    compact
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
  modalSafe: {
    flex: 1,
    backgroundColor: C.surface,
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
  // Mobile override — ~15-20% shorter
  headerPanelMobile: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTitleRowMobile: {
    gap: 10,
  },
  headerTitleTextWrap: {
    flex: 1,
  },
  headerCardSpacer: {
    height: 54,
  },
  headerCardSpacerMobile: {
    height: 40,
  },
  hIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: C.brand,
    alignItems: "center",
    justifyContent: "center",
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
  headerTitleMobile: {
    fontSize: 17,
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
  headerAvatarMobile: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  headerAvatarText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  headerAvatarTextMobile: {
    fontSize: 13,
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
  statsWrapDesktop: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: -30,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  statsScrollMobile: {
    marginTop: -24,
    marginBottom: 14,
    paddingHorizontal: 10,
  },
  statsRowMobile: {
    flexDirection: "row",
    gap: 7,
    paddingRight: 10,
  },
  statCard: {
    flexGrow: 1,
    flexShrink: 1,
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 3,
    gap: 4,
  },
  statIconChip: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  statCount: {
    fontSize: 15,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: C.textSecondary,
    textAlign: "center",
  },

  // Mobile override (compact mode)
  statCardCompact: {
    width: 82,
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
    gap: 4,
  },
  statCardIconBoxCompact: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statCardValueCompact: {
    fontSize: 14,
    fontWeight: "800",
  },
  statCardLabelCompact: {
    fontSize: 10,
    fontWeight: "600",
    color: C.textSecondary,
    textAlign: "center",
  },

  // Filters — desktop: single row; mobile: stacked
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
  filtersContainerMobile: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 10,
    gap: 8,
    marginBottom: 12,
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
  searchBoxMobile: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: C.textPrimary,
    outlineStyle: "none",
    borderWidth: 0,
    padding: 0,
  } as any,
  dropdownsRow: {
    flexDirection: "row",
    gap: 10,
  },
  dropdownsRowMobile: {
    flexDirection: "row",
    gap: 8,
  },
  dropdownWrapper: {
    flex: 1,
    minWidth: 0,
  },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: C.border,
    gap: 4,
    overflow: "hidden",
  },
  dropdownTriggerText: {
    flex: 1,
    fontSize: 13,
    color: C.textPrimary,
    fontWeight: "600",
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
    fontSize: 18,
    lineHeight: 22,
    color: C.textSecondary,
    flexShrink: 0,
  },
  dropdownBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  // Mobile override — tighter
  panelHeaderMobile: {
    paddingVertical: 10,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.textPrimary,
  },
  // Descriptive count label for mobile (instead of opaque orange badge)
  panelCountLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: C.textSecondary,
  },
  // Orange badge used on desktop list panel
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

  // Ticket items (desktop defaults)
  ticketItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  // Mobile override — tighter
  ticketItemMobile: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
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
  ticketDescriptionMobile: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 4,
    lineHeight: 19,
  },
  // Mobile-only row: seller name + badges side-by-side
  ticketMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  // Desktop seller row
  ticketSeller: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  // Mobile seller row (inside ticketMetaRow, no marginBottom)
  ticketSellerMobile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
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
  ticketSellerNameMobile: {
    fontSize: 11,
    color: C.textSecondary,
    fontWeight: "500",
  },
  // Desktop badges row
  ticketBadges: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  // Mobile badges row (no marginBottom, tighter gap)
  ticketBadgesMobile: {
    flexDirection: "row",
    gap: 4,
    flexWrap: "wrap",
  },
  ticketMeta: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  ticketMetaMobile: {
    gap: 10,
  },
  ticketMetaText: {
    fontSize: 11,
    color: C.textMuted,
  },
  ticketMetaTextMobile: {
    fontSize: 10,
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
  chatHeaderMobile: {
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  chatBackBtn: {
    padding: 4,
    marginTop: 2,
  },
  chatBackBtnMobile: {
    marginTop: -2,
    marginLeft: -4,
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
  chatHeaderInfoMobile: {
    gap: 6,
  },
  chatHeaderTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  chatHeaderTitleMobile: {
    color: C.textPrimary,
    fontSize: 16,
    lineHeight: 22,
  },
  chatHeaderMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  chatHeaderMetaMobile: {
    gap: 8,
  },
  chatHeaderMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chatHeaderMetaText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
  },
  chatHeaderMetaTextMobile: {
    color: C.textSecondary,
    fontSize: 12,
  },
  chatHeaderContact: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
    marginTop: 2,
  },
  chatHeaderContactMobile: {
    gap: 12,
    marginTop: 4,
  },
  chatContactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chatContactText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
  },
  chatContactTextMobile: {
    color: C.textSecondary,
    fontSize: 12,
  },
  reopenBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  reopenBtnMobile: {
    backgroundColor: C.brandFaint,
    borderColor: C.brand,
  },
  reopenBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  reopenBtnTextMobile: {
    color: C.brand,
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

  // Alignment helpers for inline icons
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  messageMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  messageTimestampText: {
    fontSize: 10,
    color: C.textMuted,
  },
  messageTimestampAdminText: {
    color: "rgba(255,255,255,0.65)",
  },
});