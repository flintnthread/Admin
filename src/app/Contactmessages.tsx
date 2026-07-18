import React, { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api/client";
import { sweetCrud, sweetError, sweetWarning, sweetSuccess } from "@/lib/sweetAlert";
import { mapContactRow } from "@/lib/mappers";
import { fetchContacts, fetchContactStats, replyContact, updateContactStatus, deleteContact } from "@/services/contactApi";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  useWindowDimensions,
  Modal,
  TextInput,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import AdminLayout from "@/components/admin-layout";
import Pagination from "@/components/Pagination";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type MessageStatus = "Read" | "Unread";
type ViewMode = "grid" | "list";
type FilterType = "All" | "Unread" | "Read";

interface ContactMessage {
  id: number;
  name: string;
  email: string;
  phone: string;
  subject: string;
  content: string;
  date: string;
  status: MessageStatus;
  avatarColor: string;
  avatarBg: string;
  isRead?: boolean;
}

const AVATAR_PALETTE = [
  { color: "#7C3AED", bg: "#EDE9FE" },
  { color: "#2563EB", bg: "#DBEAFE" },
  { color: "#059669", bg: "#D1FAE5" },
  { color: "#D97706", bg: "#FEF3C7" },
  { color: "#DC2626", bg: "#FEE2E2" },
];

function toUiContact(row: ReturnType<typeof mapContactRow>, index: number): ContactMessage {
  const av = AVATAR_PALETTE[index % AVATAR_PALETTE.length];
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || "—",
    subject: row.subject,
    content: row.message,
    date: row.date,
    status: row.status === "read" ? "Read" : "Unread",
    avatarColor: av.color,
    avatarBg: av.bg,
  };
}

function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────
const AvatarIcon: React.FC<{ color: string; bg: string; name: string }> = ({ color, bg, name }) => (
  <View style={[styles.avatarWrapper, { backgroundColor: bg }]}>
    <Text style={[styles.avatarText, { color }]}>{getInitials(name)}</Text>
  </View>
);

const StatusBadge: React.FC<{ status: MessageStatus }> = ({ status }) => (
  <View style={[styles.statusBadge, { backgroundColor: status === "Read" ? "#D1FAE5" : "#FEF3C7" }]}>
    <Text style={[styles.statusText, { color: status === "Read" ? "#059669" : "#D97706" }]}>
      {status === "Read" ? "✓  Read" : "⏳  Unread"}
    </Text>
  </View>
);

// ─── MESSAGE CARD (Grid) ──────────────────────────────────────────────────────
const MessageCard: React.FC<{
  msg: ContactMessage;
  onView: (msg: ContactMessage) => void;
  onMarkReplied: (id: number) => void;
  onReply: (msg: ContactMessage) => void;
  onDelete: (id: number) => void;
}> = ({ msg, onView, onMarkReplied, onReply, onDelete }) => (
  <View style={styles.card}>
    <View style={[styles.cardBody, { paddingTop: 20 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <AvatarIcon color={msg.avatarColor} bg={msg.avatarBg} name={msg.name} />
        <Text style={[styles.cardName, { flex: 1, marginBottom: 0 }]}>{msg.name}</Text>
      </View>
      <View style={styles.cardMeta}>
        <View style={styles.cardDateRow}>
          <Feather name="calendar" size={11} color={TEXT_MUTED} />
          <Text style={styles.cardDate}> {msg.date.split(" ").slice(0, 3).join(" ")}</Text>
        </View>
        <StatusBadge status={msg.status} />
      </View>
    </View>
    <View style={styles.cardDivider} />
    <View style={styles.actionRow}>
      <TouchableOpacity style={styles.btnView} onPress={() => onView(msg)} activeOpacity={0.75}>
        <Feather name="eye" size={14} color={msg.isRead ? "#3B82F6" : PRIMARY} />
        <Text style={[styles.btnViewText, { color: msg.isRead ? "#3B82F6" : PRIMARY }]}>View</Text>
      </TouchableOpacity>
      {msg.status !== "Read" && (
        <TouchableOpacity style={styles.btnMark} onPress={() => onMarkReplied(msg.id)} activeOpacity={0.75}>
          <Feather name="check" size={13} color="#059669" />
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.btnReply} onPress={() => onReply(msg)} activeOpacity={0.75}>
        <Feather name="corner-up-left" size={13} color="#2563EB" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.btnDelete} onPress={() => onDelete(msg.id)} activeOpacity={0.75}>
        <Feather name="trash-2" size={13} color="#DC2626" />
      </TouchableOpacity>
    </View>
  </View>
);

// ─── STATS HEADER ─────────────────────────────────────────────────────────────
const StatsHeader: React.FC<{ stats: { total: number; replied: number; pending: number } }> = ({ stats }) => {
  const { total, replied, pending } = stats;
  const statsData = [
    { icon: "message-square" as const, value: String(total), label: "New Messages", sub: "This Month", tint: "#EDE9FE", textColor: "#7C3AED" },
    { icon: "corner-up-left" as const, value: String(replied), label: "Read", sub: "This Month", tint: "#D1FAE5", textColor: "#059669" },
    { icon: "clock" as const, value: String(pending), label: "Unread", sub: "This Month", tint: "#FEF3C7", textColor: "#D97706" },
  ];
  return (
    <View style={styles.statsRow}>
      {statsData.map((stat, index) => (
        <View key={index} style={styles.statsContainer}>
          <View style={[styles.statIconCircle, { backgroundColor: stat.tint }]}>
            <Feather name={stat.icon} size={18} color={stat.textColor} />
          </View>
          <View style={styles.statTextWrapper}>
            <Text style={[styles.statValue, { color: stat.textColor }]}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
            <Text style={styles.statSub}>{stat.sub}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

// ─── MOBILE STATS ─────────────────────────────────────────────────────────────
const MobileStatsSection: React.FC<{ stats: { total: number; replied: number; pending: number } }> = ({ stats }) => {
  const { total, replied, pending } = stats;
  const cards = [
    { icon: "message-square" as const, value: String(total), label: "New Messages", sub: "This Month", tint: "#EDE9FE", textColor: "#7C3AED" },
    { icon: "corner-up-left" as const, value: String(replied), label: "Read", sub: "This Month", tint: "#D1FAE5", textColor: "#059669" },
    { icon: "clock" as const, value: String(pending), label: "Unread", sub: "This Month", tint: "#FEF3C7", textColor: "#D97706" },
  ];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      style={{ marginTop: -36, zIndex: 10, marginBottom: 16 }}
    >
      {cards.map((s, i) => (
        <View key={i} style={[mSt.statCard, { width: 160, marginRight: i === 2 ? 16 : 0 }]}>
          <View style={[mSt.statIcon, { backgroundColor: s.tint }]}>
            <Feather name={s.icon} size={22} color={s.textColor} />
          </View>
          <View style={mSt.statRight}>
            <Text style={[mSt.statValue, { color: s.textColor }]}>{s.value}</Text>
            <Text style={mSt.statLabel}>{s.label}</Text>
            <Text style={mSt.statSub}>{s.sub}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

// ─── VIEW DETAIL MODAL ────────────────────────────────────────────────────────
const ViewDetailModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  msg: ContactMessage | null;
  onMarkReplied: (id: number) => void;
  onReply: (msg: ContactMessage) => void;
  isWeb: boolean;
}> = ({ visible, onClose, msg, onMarkReplied, onReply, isWeb }) => {
  if (!visible || !msg) return null;
  const handleMarkReplied = () => { onMarkReplied(msg.id); onClose(); };
  const content = (
    <View style={[styles.modalContainer, isWeb && styles.modalContainerWeb]}>
      <View style={styles.modalHeader}>
        <View style={styles.modalHeaderLeft}>
          <Feather name="mail" size={16} color="#FFFFFF" />
          <Text style={[styles.modalTitle, { marginLeft: 8 }]}>Message Details</Text>
        </View>
        <TouchableOpacity onPress={onClose}>
          <Feather name="x" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}><Text style={styles.infoLabel}>From</Text><Text style={styles.infoValue}>{msg.name}</Text></View>
          <View style={styles.infoCard}><Text style={styles.infoLabel}>Subject</Text><Text style={styles.infoValue}>{msg.subject}</Text></View>
          <View style={styles.infoCard}><Text style={styles.infoLabel}>Email</Text><Text style={styles.infoValue}>{msg.email}</Text></View>
          <View style={styles.infoCard}><Text style={styles.infoLabel}>Date</Text><Text style={styles.infoValue}>{msg.date}</Text></View>
          <View style={styles.infoCard}><Text style={styles.infoLabel}>Phone</Text><Text style={styles.infoValue}>{msg.phone}</Text></View>
          <View style={styles.infoCard}><Text style={styles.infoLabel}>Status</Text><StatusBadge status={msg.status} /></View>
        </View>
        <View style={styles.contentBox}>
          <Text style={styles.contentLabel}>Message Content</Text>
          <Text style={styles.contentText}>{msg.content}</Text>
        </View>
      </ScrollView>
      <View style={styles.modalFooter}>
        <TouchableOpacity style={styles.btnCancel} onPress={onClose}>
          <Feather name="x" size={14} color="#FFFFFF" />
          <Text style={styles.btnCancelText}> Close</Text>
        </TouchableOpacity>
        {msg.status !== "Read" && (
          <TouchableOpacity style={styles.btnMarkModal} onPress={handleMarkReplied}>
            <Feather name="check" size={14} color="#FFFFFF" />
            <Text style={styles.btnUpdateText}> Mark as Read</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.btnUpdate} onPress={() => { onClose(); onReply(msg); }}>
          <Feather name="corner-up-left" size={14} color="#FFFFFF" />
          <Text style={styles.btnUpdateText}> Reply to Message</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  return (
    <Modal visible={visible} transparent animationType={isWeb ? "fade" : "slide"} onRequestClose={onClose}>
      <View style={isWeb ? styles.modalOverlayWeb : styles.modalOverlayMobile}>{content}</View>
    </Modal>
  );
};

// ─── REPLY MESSAGE MODAL ──────────────────────────────────────────────────────
const ReplyMessageModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSend: (id: number, text: string) => void;
  msg: ContactMessage | null;
  isWeb: boolean;
}> = ({ visible, onClose, onSend, msg, isWeb }) => {
  const [replyText, setReplyText] = useState("");
  if (!visible || !msg) return null;
  const handleSend = () => {
    if (!replyText.trim()) {
      void sweetWarning("Validation", "Please enter a reply message.");
      return;
    }
    onSend(msg.id, replyText);
    setReplyText("");
  };
  return (
    <Modal visible={visible} transparent animationType={isWeb ? "fade" : "slide"} onRequestClose={onClose}>
      <View style={isWeb ? styles.modalOverlayWeb : styles.modalOverlayMobile}>
        <View style={[styles.modalContainer, isWeb && styles.modalContainerWeb, { maxWidth: 700, width: "95%" }]}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <Feather name="check-circle" size={18} color="#FFFFFF" />
              <Text style={[styles.modalTitle, { marginLeft: 8 }]}>Send Reply</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <ScrollView style={[styles.modalBody, { backgroundColor: "#FFFFFF" }]} showsVerticalScrollIndicator={false}>
            <Text style={[styles.inputLabel, { color: "#64748b", fontWeight: "600", fontSize: 13, marginBottom: 8 }]}>Customer</Text>
            <View style={{ backgroundColor: "#F8FAFC", borderRadius: 8, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: "#E2E8F0" }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#0F172A" }}>{msg.name}</Text>
            </View>
            <Text style={[styles.inputLabel, { color: "#64748b", fontWeight: "600", fontSize: 13, marginBottom: 8 }]}>Reply Message</Text>
            <TextInput
              style={[styles.textInput, { height: 160, textAlignVertical: "top" }]}
              placeholder="Type your reply message here..."
              placeholderTextColor="#94A3B8"
              value={replyText}
              onChangeText={setReplyText}
              multiline
            />
          </ScrollView>
          <View style={[styles.modalFooter, { justifyContent: "flex-end", gap: 12 }]}>
            <TouchableOpacity style={styles.btnCancel} onPress={onClose}>
              <Feather name="x" size={14} color="#FFFFFF" />
              <Text style={styles.btnCancelText}> Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnUpdate} onPress={handleSend}>
              <Text style={styles.btnUpdateText}>Send Reply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── ADD MESSAGE MODAL ────────────────────────────────────────────────────────
const AddMessageModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSave: (msg: Omit<ContactMessage, "id" | "avatarColor" | "avatarBg">) => void;
  isWeb: boolean;
}> = ({ visible, onClose, onSave, isWeb }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<MessageStatus>("Unread");
  if (!visible) return null;
  const handleSave = () => {
    if (!name.trim() || !email.trim() || !subject.trim() || !content.trim()) {
      const msg = "Please fill all required fields.";
      void sweetWarning("Validation", msg);
      return;
    }
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + " " + now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    onSave({ name, email, phone: phone || "N/A", subject, content, date: dateStr, status });
    setName(""); setEmail(""); setPhone(""); setSubject(""); setContent(""); setStatus("Unread");
    onClose();
  };
  const content_el = (
    <View style={[styles.modalContainer, isWeb && styles.modalContainerWeb]}>
      <View style={styles.modalHeader}>
        <View style={styles.modalHeaderLeft}>
          <Feather name="plus-circle" size={16} color="#FFFFFF" />
          <Text style={[styles.modalTitle, { marginLeft: 8 }]}>Add New Message</Text>
        </View>
        <TouchableOpacity onPress={onClose}><Feather name="x" size={18} color="#FFFFFF" /></TouchableOpacity>
      </View>
      <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.inputLabel}>Name <Text style={styles.textAsterisk}>*</Text></Text>
            <TextInput style={styles.textInput} value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor={TEXT_MUTED} />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Email <Text style={styles.textAsterisk}>*</Text></Text>
            <TextInput style={styles.textInput} value={email} onChangeText={setEmail} placeholder="email@example.com" keyboardType="email-address" placeholderTextColor={TEXT_MUTED} autoCapitalize="none" />
          </View>
        </View>
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.inputLabel}>Phone</Text>
            <TextInput style={styles.textInput} value={phone} onChangeText={setPhone} placeholder="Phone number" keyboardType="phone-pad" placeholderTextColor={TEXT_MUTED} />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Status</Text>
            <View style={styles.statusSelector}>
              <TouchableOpacity style={[styles.statusOption, status === "Unread" && styles.statusOptionActive]} onPress={() => setStatus("Unread")} activeOpacity={0.8}>
                <Text style={[styles.statusOptionText, status === "Unread" && styles.statusOptionTextActive]}>Not Replied</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.statusOption, status === "Read" && styles.statusOptionRepliedActive]} onPress={() => setStatus("Read")} activeOpacity={0.8}>
                <Text style={[styles.statusOptionText, status === "Read" && styles.statusOptionRepliedText]}>Replied</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Subject <Text style={styles.textAsterisk}>*</Text></Text>
          <TextInput style={styles.textInput} value={subject} onChangeText={setSubject} placeholder="Message subject" placeholderTextColor={TEXT_MUTED} />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Message <Text style={styles.textAsterisk}>*</Text></Text>
          <TextInput style={[styles.textInput, styles.textArea]} value={content} onChangeText={setContent} placeholder="Type your message here..." placeholderTextColor={TEXT_MUTED} multiline numberOfLines={4} textAlignVertical="top" />
        </View>
      </ScrollView>
      <View style={styles.modalFooter}>
        <TouchableOpacity style={styles.btnCancel} onPress={onClose}>
          <Feather name="x" size={14} color="#FFFFFF" />
          <Text style={styles.btnCancelText}> Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnUpdate} onPress={handleSave}>
          <Feather name="save" size={14} color="#FFFFFF" />
          <Text style={styles.btnUpdateText}> Save Message</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  return (
    <Modal visible={visible} transparent animationType={isWeb ? "fade" : "slide"} onRequestClose={onClose}>
      <View style={isWeb ? styles.modalOverlayWeb : styles.modalOverlayMobile}>{content_el}</View>
    </Modal>
  );
};

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
const ContactMessagesScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isMobile = width < 480;

  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [contactStats, setContactStats] = useState({ total: 0, replied: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [res, statsRes] = await Promise.all([fetchContacts(0, 100), fetchContactStats()]);
      setMessages((res.items ?? []).map((item, i) => toUiContact(mapContactRow(item), i)));
      setContactStats({ total: Number(statsRes.total ?? 0), replied: Number(statsRes.closed ?? 0), pending: Number(statsRes.open ?? 0) });
    } catch (e) {
      setLoadError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filter, setFilter] = useState<FilterType>("All");
  const [search, setSearch] = useState("");
  const [viewMsg, setViewMsg] = useState<ContactMessage | null>(null);
  const [replyMsg, setReplyMsg] = useState<ContactMessage | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = messages.filter((m) => {
    const mf = filter === "All" || m.status === filter;
    const ms = m.name.toLowerCase().includes(search.toLowerCase()) || m.subject.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase());
    return mf && ms;
  });

  const ITEMS_PER_PAGE = 8;
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedMessages = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleView = (msg: ContactMessage) => {
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, isRead: true } : m)));
    setViewMsg(msg);
  };

  const markReplied = async (id: number) => {
    try {
      await updateContactStatus(id, true);
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: "Read" } : m)));
    } catch (e) {
      const msg = getApiErrorMessage(e);
      void sweetError("Error", msg);
    }
  };

  const handleSendReply = async (id: number, text: string) => {
    try {
      await replyContact(id, text);
      await markReplied(id);
      setReplyMsg(null);
      await loadMessages();
      const successMsg = "Reply sent successfully!";
      void sweetSuccess("Success", successMsg);
    } catch (e) {
      const msg = getApiErrorMessage(e);
      void sweetError("Error", msg);
    }
  };

  const deleteMessage = async (id: number) => {
    if (!(await sweetCrud.confirmDelete("Message"))) return;
    try {
      await deleteContact(id);
      await loadMessages();
      void sweetCrud.deleted("Message");
    } catch (e) {
      void sweetError("Error", getApiErrorMessage(e));
    }
  };

  // ── Mobile Layout ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <AdminLayout>
        <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
          <StatusBar barStyle="light-content" backgroundColor="#151D4F" />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

            {/* ── Mobile Header ── */}
            <View style={mSt.header}>
              <View style={mSt.headerIconWrap}>
                <Feather name="message-square" size={22} color="#fff" />
              </View>
              <View style={mSt.headerTextWrap}>
                <Text style={mSt.headerTitle}>Contact Messages</Text>
                <Text style={mSt.headerSubtitle}>Manage all support & feedback conversations</Text>
              </View>
            </View>

            {/* ── Mobile Stat Cards (overlapping header) ── */}
            <MobileStatsSection stats={contactStats} />

            {/* ── Search & View Switcher ── */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, marginBottom: 12 }}>
              <View style={[mSt.searchWrap, { flex: 1, marginHorizontal: 0, marginBottom: 0 }]}>
                <Feather name="search" size={16} color={TEXT_MUTED} style={{ marginRight: 8 }} />
                <TextInput
                  style={mSt.searchInput}
                  placeholder="Search by name, subject or email..."
                  placeholderTextColor={TEXT_MUTED}
                  value={search}
                  onChangeText={(t) => { setSearch(t); setCurrentPage(1); }}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => { setSearch(""); setCurrentPage(1); }}>
                    <Feather name="x" size={14} color={TEXT_MUTED} />
                  </TouchableOpacity>
                )}
              </View>

              {!loading && filtered.length > 0 && (
                <View style={{ flexDirection: "row", backgroundColor: "#E5E7EB", borderRadius: 10, padding: 3 }}>
                  <TouchableOpacity onPress={() => setViewMode("grid")} style={[styles.viewButton, viewMode === "grid" && styles.viewButtonActive]}>
                    <Feather name="grid" size={16} color={viewMode === "grid" ? "#FFFFFF" : "#374151"} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setViewMode("list")} style={[styles.viewButton, viewMode === "list" && styles.viewButtonActive]}>
                    <Feather name="list" size={16} color={viewMode === "list" ? "#FFFFFF" : "#374151"} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* ── Filter pills (All / New / Replied / Pending) ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={mSt.pillRow}
            >
              {([
                { label: "All", count: messages.length, filterVal: "All" as FilterType },
                { label: "Unread", count: contactStats.pending, filterVal: "Unread" as FilterType },
                { label: "Read", count: contactStats.replied, filterVal: "Read" as FilterType },
              ]).map((f) => {
                const activeMatch = f.filterVal === filter;
                return (
                  <TouchableOpacity
                    key={f.label}
                    style={[mSt.pill, activeMatch && mSt.pillActive]}
                    onPress={() => { setCurrentPage(1); setFilter(f.filterVal); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[mSt.pillLabel, activeMatch && mSt.pillLabelActive]}>{f.label}</Text>
                    <View style={[mSt.pillBadge, activeMatch && mSt.pillBadgeActive]}>
                      <Text style={[mSt.pillBadgeText, activeMatch && mSt.pillBadgeTextActive]}>{f.count}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {loadError ? (
              <Text style={{ color: "#DC2626", paddingHorizontal: 16, marginBottom: 8 }}>{loadError}</Text>
            ) : null}



            {/* ── Content ── */}
            {loading ? (
              <Text style={{ color: TEXT_MUTED, textAlign: "center", padding: 40 }}>Loading messages…</Text>
            ) : filtered.length === 0 ? (
              <View style={mSt.emptyWrap}>
                <View style={mSt.emptyIconWrap}>
                  <Feather name="inbox" size={36} color={TEXT_MUTED} />
                </View>
                <Text style={mSt.emptyTitle}>No contact messages</Text>
                <Text style={mSt.emptySubtitle}>No messages found matching your criteria.</Text>
              </View>
            ) : (
              <View style={{ paddingHorizontal: 16, gap: 12 }}>
                {viewMode === "grid" ? (
                  paginatedMessages.map((item) => (
                    <MessageCard
                      key={item.id}
                      msg={item}
                      onView={handleView}
                      onMarkReplied={markReplied}
                      onReply={setReplyMsg}
                      onDelete={deleteMessage}
                    />
                  ))
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={[styles.tableContainer, { minWidth: 1080 }]}>
                      <View style={[styles.tableHeaderRow, { gap: 24 }]}>
                        <Text style={[styles.tableHeaderCell, { width: 200 }]}>Sender</Text>
                        <Text style={[styles.tableHeaderCell, { width: 160 }]}>Subject</Text>
                        <Text style={[styles.tableHeaderCell, { width: 260 }]}>Preview</Text>
                        <Text style={[styles.tableHeaderCell, { width: 120 }]}>Date</Text>
                        <Text style={[styles.tableHeaderCell, { width: 100 }]}>Status</Text>
                        <Text style={[styles.tableHeaderCell, { width: 130, textAlign: "center" }]}>Actions</Text>
                      </View>
                      {paginatedMessages.map((msg) => (
                        <View key={msg.id} style={[styles.tableRow, { gap: 24 }]}>
                          <View style={[styles.tableCellRow, { width: 200 }]}>
                            <View style={[styles.tableAvatar, { backgroundColor: msg.avatarBg }]}>
                              <Text style={[styles.tableAvatarText, { color: msg.avatarColor }]}>{getInitials(msg.name)}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.tableCell, { fontWeight: "700" }]} numberOfLines={1}>{msg.name}</Text>
                              <Text style={[styles.tableCell, { color: TEXT_MUTED, fontSize: 11 }]} numberOfLines={1}>{msg.email}</Text>
                            </View>
                          </View>
                          <Text style={[styles.tableCell, { width: 160, fontWeight: "600" }]} numberOfLines={1}>{msg.subject}</Text>
                          <Text style={[styles.tableCell, { width: 260, color: TEXT_MUTED }]} numberOfLines={2}>{msg.content}</Text>
                          <Text style={[styles.tableCell, { width: 120, color: TEXT_MUTED }]}>{msg.date.split(" ").slice(0, 3).join(" ")}</Text>
                          <View style={{ width: 100 }}><StatusBadge status={msg.status} /></View>
                          <View style={{ width: 130, flexDirection: "row", justifyContent: "center", gap: 6 }}>
                            <TouchableOpacity style={styles.tableBtnView} onPress={() => handleView(msg)}><Feather name="eye" size={13} color="#FFFFFF" /></TouchableOpacity>
                            {msg.status !== "Read" && (
                              <TouchableOpacity style={styles.tableBtnMark} onPress={() => markReplied(msg.id)}><Feather name="check" size={13} color="#FFFFFF" /></TouchableOpacity>
                            )}
                            <TouchableOpacity style={[styles.tableBtnView, { backgroundColor: "#2563EB", borderColor: "#2563EB" }]} onPress={() => setReplyMsg(msg)}><Feather name="corner-up-left" size={13} color="#FFFFFF" /></TouchableOpacity>
                            <TouchableOpacity style={styles.tableBtnDelete} onPress={() => deleteMessage(msg.id)}><Feather name="trash-2" size={13} color="#FFFFFF" /></TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )}
              </View>
            )}

            {/* ── Pagination ── */}
            {!loading && !loadError && filtered.length > 0 && (
              <View style={{ paddingHorizontal: 16 }}>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filtered.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  itemName="messages"
                  onPageChange={setCurrentPage}
                />
              </View>
            )}
          </ScrollView>

          <ViewDetailModal visible={!!viewMsg} onClose={() => setViewMsg(null)} msg={viewMsg} onMarkReplied={markReplied} onReply={setReplyMsg} isWeb={false} />
          <ReplyMessageModal visible={!!replyMsg} onClose={() => setReplyMsg(null)} onSend={handleSendReply} msg={replyMsg} isWeb={false} />
        </View>
      </AdminLayout>
    );
  }

  // ── Web / Tablet Layout ─────────────────────────────────────────────────────
  // Whole screen now scrolls as a single ScrollView (header + stats + toolbar +
  // cards/table + pagination all inside it), and the white rounded wrapper
  // container has been removed so content sits directly on the page background.
  const MainContent = (
    <ScrollView
      style={styles.mainContentContainer}
      contentContainerStyle={isWeb ? styles.webListContent : { paddingBottom: 80 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={[styles.header, isWeb && styles.webHeader, !isWeb && { borderRadius: 16, marginHorizontal: 8, marginTop: 8, marginBottom: 12 }]}>
        <View style={[styles.headerTextContainer, { flexDirection: "row", alignItems: "center", gap: 14 }]}>
          <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: "#F97316", alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="message-square" size={26} color="#FFF" />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: "#FFFFFF" }]}>Contact Messages</Text>
            <Text style={[styles.headerSubtitle, { color: "#D1D5DB" }]}>Manage and respond to incoming contact messages.</Text>
          </View>
        </View>
        <View style={styles.headerActions} />
      </View>

      {loadError ? (
        <Text style={{ color: "#DC2626", paddingHorizontal: isWeb ? 24 : 14, marginBottom: 8 }}>{loadError}</Text>
      ) : null}

      <View style={{ marginHorizontal: isWeb ? 24 : 14, marginTop: isWeb ? -42 : -32, zIndex: 10, elevation: 10 }}>
        <StatsHeader stats={contactStats} />
      </View>

      <View style={styles.listContent}>
        {/* ── Web Toolbar ── */}
        {isWeb && (
          <View style={styles.webToolbar}>
            <View style={styles.searchContainerWeb}>
              <Feather name="search" size={16} color={TEXT_MUTED} style={styles.searchIcon} />
              <TextInput style={styles.searchInput} placeholder="Search by name, subject, or email..." placeholderTextColor={TEXT_MUTED} value={search} onChangeText={(t) => { setSearch(t); setCurrentPage(1); }} />
            </View>
            <View style={[styles.viewSwitcher, { alignItems: "center", backgroundColor: "transparent", paddingHorizontal: 0, paddingVertical: 0 }]}>
              <View style={{ flexDirection: "row", backgroundColor: "#E5E7EB", borderRadius: 10, padding: 3 }}>
                <TouchableOpacity style={[styles.viewButton, viewMode === "grid" && styles.viewButtonActive]} onPress={() => setViewMode("grid")} activeOpacity={0.8}>
                  <Feather name="grid" size={16} color={viewMode === "grid" ? "#FFFFFF" : "#374151"} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.viewButton, viewMode === "list" && styles.viewButtonActive]} onPress={() => setViewMode("list")} activeOpacity={0.8}>
                  <Feather name="list" size={16} color={viewMode === "list" ? "#FFFFFF" : "#374151"} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.filterPills}>
              {(["All", "Unread", "Read"] as FilterType[]).map((f) => (
                <TouchableOpacity key={f} style={[styles.pill, filter === f && styles.pillActive]} onPress={() => { setFilter(f); setCurrentPage(1); }} activeOpacity={0.8}>
                  <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {loading ? (
          <Text style={styles.resultCount}>Loading contact messages…</Text>
        ) : (
          <>
            <Text style={styles.resultCount}>{filtered.length} message{filtered.length !== 1 ? "s" : ""} found</Text>

            {viewMode === "grid" && (
              <View style={[styles.cardGrid, !isWeb && { marginHorizontal: 0 }]}>
                {paginatedMessages.map((item) => (
                  <View key={item.id} style={styles.cardGridItem}>
                    <MessageCard msg={item} onView={handleView} onMarkReplied={markReplied} onReply={setReplyMsg} onDelete={deleteMessage} />
                  </View>
                ))}
              </View>
            )}

            {viewMode === "list" && (
              <View style={{ width: "100%", paddingBottom: 20 }}>
                <View style={[styles.tableContainer, { width: "100%" }]}>
                  <View style={[styles.tableHeaderRow, { gap: 16 }]}>
                    <Text style={[styles.tableHeaderCell, { width: "18%" }]}>Sender</Text>
                    <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Subject</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Preview</Text>
                    <Text style={[styles.tableHeaderCell, { width: "12%" }]}>Date</Text>
                    <Text style={[styles.tableHeaderCell, { width: "10%" }]}>Status</Text>
                    <Text style={[styles.tableHeaderCell, { width: 140 }]}>Actions</Text>
                  </View>
                  {paginatedMessages.map((msg) => (
                    <View key={msg.id} style={[styles.tableRow, { gap: 16 }]}>
                      <View style={[styles.tableCellRow, { width: "18%" }]}>
                        <View style={[styles.tableAvatar, { backgroundColor: msg.avatarBg }]}>
                          <Text style={[styles.tableAvatarText, { color: msg.avatarColor }]}>{getInitials(msg.name)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.tableCell, { fontWeight: "700" }]} numberOfLines={1}>{msg.name}</Text>
                          <Text style={[styles.tableCell, { color: TEXT_MUTED, fontSize: 11 }]} numberOfLines={1}>{msg.email}</Text>
                        </View>
                      </View>
                      <Text style={[styles.tableCell, { width: "20%", fontWeight: "600" }]} numberOfLines={1}>{msg.subject}</Text>
                      <Text style={[styles.tableCell, { flex: 1, color: TEXT_MUTED }]} numberOfLines={2}>{msg.content}</Text>
                      <Text style={[styles.tableCell, { width: "12%", color: TEXT_MUTED }]}>{msg.date.split(" ").slice(0, 3).join(" ")}</Text>
                      <View style={{ width: "10%" }}><StatusBadge status={msg.status} /></View>
                      <View style={{ width: 140, flexDirection: "row", justifyContent: "flex-start", gap: 6 }}>
                        <TouchableOpacity style={styles.tableBtnView} onPress={() => handleView(msg)}><Feather name="eye" size={13} color="#FFFFFF" /></TouchableOpacity>
                        {msg.status !== "Read" && (
                          <TouchableOpacity style={styles.tableBtnMark} onPress={() => markReplied(msg.id)}><Feather name="check" size={13} color="#FFFFFF" /></TouchableOpacity>
                        )}
                        <TouchableOpacity style={[styles.tableBtnView, { backgroundColor: "#2563EB", borderColor: "#2563EB" }]} onPress={() => setReplyMsg(msg)}><Feather name="corner-up-left" size={13} color="#FFFFFF" /></TouchableOpacity>
                        <TouchableOpacity style={styles.tableBtnDelete} onPress={() => deleteMessage(msg.id)}><Feather name="trash-2" size={13} color="#FFFFFF" /></TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {!loading && !loadError && filtered.length > 0 && (
              <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} itemsPerPage={ITEMS_PER_PAGE} itemName="messages" onPageChange={setCurrentPage} />
            )}
          </>
        )}
      </View>
    </ScrollView>
  );

  return (
    <AdminLayout>
      <View style={styles.webLayout}>
        <StatusBar barStyle="light-content" backgroundColor="#1F2937" />
        <View style={styles.webMainColumn}>
          {MainContent}
        </View>
        <ViewDetailModal visible={!!viewMsg} onClose={() => setViewMsg(null)} msg={viewMsg} onMarkReplied={markReplied} onReply={setReplyMsg} isWeb={isWeb} />
        <ReplyMessageModal visible={!!replyMsg} onClose={() => setReplyMsg(null)} onSend={handleSendReply} msg={replyMsg} isWeb={isWeb} />
      </View>
    </AdminLayout>
  );
};

export default ContactMessagesScreen;

// ─── STYLES ───────────────────────────────────────────────────────────────────
const PRIMARY = "#1d4ed8";
const PRIMARY_LIGHT = "#bfdbfe";
const BORDER = "#E5E7EB";
const TEXT_PRIMARY = "#1e293b";
const TEXT_MUTED = "#64748b";

// ─── MOBILE-ONLY STYLES ───────────────────────────────────────────────────────
const mSt = StyleSheet.create({
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#151D4F",
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 52,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 22,
    gap: 14,
    shadowColor: "#151D4F",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  headerIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },

  // Stat cards
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap" as any,
    justifyContent: "space-between",
    rowGap: 12,
    marginTop: -36,
    marginHorizontal: 24,
    zIndex: 10,
    marginBottom: 16,
  },
  statCard: {
    width: "48%" as any,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statRight: {
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: TEXT_PRIMARY,
  },
  statSub: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 1,
  },

  // Search
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 28,
    marginHorizontal: 14,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: TEXT_PRIMARY,
    outlineStyle: 'none',
  } as any,

  // Filter pills
  filterRow: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: BORDER,
  },
  filterPillActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  filterPillTextActive: {
    color: "#ffffff",
  },
  filterCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  filterCountActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: TEXT_MUTED,
  },
  filterCountTextActive: {
    color: "#ffffff",
  },

  // Pill-style filter row
  pillRow: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 50,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: BORDER,
  },
  pillActive: {
    backgroundColor: "#151D4F",
    borderColor: "#151D4F",
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  pillLabelActive: {
    color: "#ffffff",
  },
  pillBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  pillBadgeActive: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  pillBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: TEXT_MUTED,
  },
  pillBadgeTextActive: {
    color: "#ffffff",
  },

  // Empty state
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: TEXT_PRIMARY,
  },
  emptySubtitle: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: "center",
  },

  // Pagination
  paginationWrap: {
    alignItems: "center",
    marginTop: 8,
    paddingBottom: 16,
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },

  // ── Web Layout ──
  webLayout: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    height: "100%" as any,
  },
  sidebarGap: {
    width: 260,
    backgroundColor: "transparent",
  },
  webMainColumn: {
    flex: 1,
    flexDirection: "column",
  },
  headerGap: {
    height: 64,
    backgroundColor: "transparent",
  },
  mainContentContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  // ── Header ──
  header: {
    marginHorizontal: 2,
    marginTop: 12,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#151D4F",
    paddingHorizontal: 18,
    paddingVertical: 16,
    paddingBottom: 40,
    borderBottomWidth: 0,
  },
  webHeader: {
    backgroundColor: "#151D4F",
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 50,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 22,
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  viewSwitcher: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  viewLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginRight: 8,
    fontWeight: "600",
  },
  viewButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  viewButtonActive: {
    backgroundColor: "#1E2B6B",
  },

  // ── Mobile Controls ──
  mobileControlsContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: "#FFFFFF",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  searchContainerMobile: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  searchContainerWeb: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: BORDER,
    flex: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    color: TEXT_PRIMARY,
    outlineStyle: 'none',
  } as any,
  viewSwitcherMobile: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  viewLabelMobile: {
    fontSize: 13,
    color: TEXT_PRIMARY,
    fontWeight: "600",
  },

  // ── Web Toolbar ──
  webToolbar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
    gap: 8,
    flexWrap: "wrap" as any,
  },
  filterPills: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  mobileFilterScroll: {
    marginBottom: 12,
    paddingTop: 12,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 7,
    backgroundColor: "transparent",
  },
  pillActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  pillText: {
    fontSize: 13,
    color: TEXT_MUTED,
    fontWeight: "500",
  },
  pillTextActive: {
    color: TEXT_PRIMARY,
    fontWeight: "700",
  },

  // ── List ──
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  webListContent: {
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 100,
  },
  resultCount: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: "500",
    marginBottom: 14,
  },

  // ── Card Grid ──
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: 16,
  },
  cardGridItem: {
    flexBasis: "31.5%",
    maxWidth: "32%",
    marginHorizontal: 0,
  },

  // ── Card ──
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#1d4ed8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardBanner: {
    height: 72,
    backgroundColor: "#1e3a5f",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  cardSno: {
    position: "absolute",
    top: 8,
    right: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  avatarWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "800",
  },
  cardBody: {
    padding: 14,
  },
  cardName: {
    fontSize: 14,
    fontWeight: "800",
    color: TEXT_PRIMARY,
    marginBottom: 2,
  },
  cardEmail: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginBottom: 8,
  },
  cardSubject: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 4,
  },
  cardPreview: {
    fontSize: 12,
    color: TEXT_MUTED,
    lineHeight: 18,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  cardDateRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardDate: {
    fontSize: 11,
    color: TEXT_MUTED,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginHorizontal: 14,
  },

  // ── Status Badge ──
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // ── Action Buttons ──
  actionRow: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnView: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: PRIMARY_LIGHT,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  btnViewText: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY,
  },
  btnMark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  btnReply: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: PRIMARY_LIGHT,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  btnDelete: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },

  // ── Stats (Web) ──
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 0,
  },
  statsContainer: {
    flex: 1,
    maxWidth: 240,
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: BORDER,
  },
  statsScroll: {
    paddingHorizontal: 8,
    paddingVertical: 14,
    gap: 0,
  },
  statItem: {
    alignItems: "center",
    paddingHorizontal: 20,
    minWidth: 100,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statTextWrapper: {
    flex: 1,
    alignItems: "flex-start",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 12,
    color: TEXT_PRIMARY,
    fontWeight: "600",
    marginTop: 2,
  },
  statSub: {
    fontSize: 10,
    color: TEXT_MUTED,
  },

  // ── Table ──
  tableContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
  },
  tableHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: "700",
    color: TEXT_PRIMARY,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  tableCellRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tableCell: {
    fontSize: 13,
    color: TEXT_PRIMARY,
  },
  tableSno: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  tableSnoText: {
    fontSize: 11,
    fontWeight: "700",
    color: TEXT_MUTED,
  },
  tableAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tableAvatarText: {
    fontSize: 12,
    fontWeight: "800",
  },
  tableBtnView: {
    backgroundColor: PRIMARY,
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  tableBtnMark: {
    backgroundColor: "#059669",
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  tableBtnDelete: {
    backgroundColor: "#DC2626",
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Modal ──
  modalOverlayWeb: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlayMobile: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
    maxHeight: "90%" as any,
  },
  modalContainerWeb: {
    width: "90%" as any,
    maxWidth: 600,
    borderRadius: 16,
  },
  modalHeader: {
    backgroundColor: "#1e3a5f",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  closeBtn: {
    padding: 4,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  modalBody: {
    padding: 20,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 0,
  },
  infoCard: {
    flexBasis: "48%",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  infoLabel: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 13,
    color: TEXT_PRIMARY,
    fontWeight: "600",
  },
  contentBox: {
    backgroundColor: "#FFFBF5",
    borderWidth: 1,
    borderColor: "#FDE8CC",
    borderRadius: 10,
    padding: 14,
  },
  contentLabel: {
    fontSize: 11,
    color: "#F97316",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  contentText: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 20,
  },
  statusSelector: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    overflow: "hidden",
  },
  statusOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  statusOptionActive: {
    backgroundColor: "#FEF3C7",
  },
  statusOptionRepliedActive: {
    backgroundColor: "#D1FAE5",
  },
  statusOptionText: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: "600",
  },
  statusOptionTextActive: {
    color: "#D97706",
    fontWeight: "700",
  },
  statusOptionRepliedText: {
    color: "#059669",
    fontWeight: "700",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: "#F9FAFB",
    gap: 10,
    flexWrap: "wrap" as any,
  },
  btnCancel: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#475569",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnCancelText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13,
  },
  btnMarkModal: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e3a5f",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnUpdate: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnUpdateText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: TEXT_PRIMARY,
    marginBottom: 6,
  },
  textAsterisk: {
    color: PRIMARY,
  },
  textInput: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: TEXT_PRIMARY,
    backgroundColor: "#FFFFFF",
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: "top",
  },
});
