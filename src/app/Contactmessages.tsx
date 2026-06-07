import React, { useState } from "react";
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
  Alert,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type MessageStatus = "Replied" | "Not Replied";
type ViewMode = "grid" | "list";
type FilterType = "All" | "Not Replied" | "Replied";

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

// ─── DATA ─────────────────────────────────────────────────────────────────────
const initialMessages: ContactMessage[] = [
  {
    id: 1,
    name: "Denise Stevens",
    email: "dstevens73@aol.com",
    phone: "242-735-9739",
    subject: "Wording fix suggested",
    content:
      "Hi, Thought I'd mention \"Water\" as possibly misspelled. Quickly checking with spellpros.com might clarify things. Thanks, Denise",
    date: "10 May, 2026 05:45",
    status: "Not Replied",
    avatarColor: "#7C3AED",
    avatarBg: "#EDE9FE",
  },
  {
    id: 2,
    name: "DavidBes David B.",
    email: "david.bes@gmail.com",
    phone: "310-892-4421",
    subject: "Support Request",
    content:
      "Hello, I'm having trouble accessing my account dashboard after the recent update. The page keeps loading indefinitely. Please help.",
    date: "28 Apr, 2026 11:30",
    status: "Not Replied",
    avatarColor: "#2563EB",
    avatarBg: "#DBEAFE",
  },
  {
    id: 3,
    name: "Guddanti Venkatesh",
    email: "venkatesh.g@email.com",
    phone: "998-231-7766",
    subject: "Partnership Proposal",
    content:
      "Dear Team, We are looking to collaborate on a joint venture for our upcoming project. Would love to schedule a call to discuss details.",
    date: "27 Apr, 2026 09:15",
    status: "Replied",
    avatarColor: "#059669",
    avatarBg: "#D1FAE5",
  },
  {
    id: 4,
    name: "Nick Harrison",
    email: "nick.h@outlook.com",
    phone: "541-673-2298",
    subject: "General Feedback",
    content:
      "Just wanted to say the new UI update is fantastic! Really improved the workflow. The dark mode especially is a huge plus. Keep it up.",
    date: "25 Mar, 2026 14:00",
    status: "Not Replied",
    avatarColor: "#D97706",
    avatarBg: "#FEF3C7",
  },
  {
    id: 5,
    name: "Nick Romano",
    email: "nick.romano@webmail.com",
    phone: "714-882-3310",
    subject: "Bug Report",
    content:
      "Found a critical bug in the checkout flow that causes the cart to reset when switching between payment methods. Reproducible every time.",
    date: "10 Mar, 2026 08:45",
    status: "Not Replied",
    avatarColor: "#DC2626",
    avatarBg: "#FEE2E2",
  },
  {
    id: 6,
    name: "Madison Calley",
    email: "madison.c@yahoo.com",
    phone: "603-441-9982",
    subject: "Subscription Query",
    content:
      "Hi, I'd like to know more about upgrading my current plan and what additional benefits come with the premium tier. Student discount?",
    date: "24 Feb, 2026 16:20",
    status: "Not Replied",
    avatarColor: "#7C3AED",
    avatarBg: "#EDE9FE",
  },
  {
    id: 7,
    name: "Sarah Thompson",
    email: "sarah.t@company.io",
    phone: "889-213-6670",
    subject: "Invoice Discrepancy",
    content:
      "Hello, I noticed a discrepancy in my last invoice. I was charged for 3 licenses but I only have 2 active users. Please review.",
    date: "18 Feb, 2026 10:00",
    status: "Replied",
    avatarColor: "#059669",
    avatarBg: "#D1FAE5",
  },
  {
    id: 8,
    name: "Raj Patel",
    email: "raj.patel@techfirm.in",
    phone: "091-987-5544",
    subject: "API Integration Help",
    content:
      "We are integrating your API into our mobile app but keep hitting CORS errors on POST requests. Our backend is Node.js. Sample code?",
    date: "12 Feb, 2026 13:35",
    status: "Not Replied",
    avatarColor: "#2563EB",
    avatarBg: "#DBEAFE",
  },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

const AvatarIcon: React.FC<{ color: string; bg: string; name: string }> = ({
  color,
  bg,
  name,
}) => (
  <View style={[styles.avatarWrapper, { backgroundColor: bg }]}>
    <Text style={[styles.avatarText, { color }]}>{getInitials(name)}</Text>
  </View>
);

const StatusBadge: React.FC<{ status: MessageStatus }> = ({ status }) => (
  <View
    style={[
      styles.statusBadge,
      { backgroundColor: status === "Replied" ? "#D1FAE5" : "#FEF3C7" },
    ]}
  >
    <Text
      style={[
        styles.statusText,
        { color: status === "Replied" ? "#059669" : "#D97706" },
      ]}
    >
      {status === "Replied" ? "✓  Replied" : "⏳  Pending"}
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
    {/* Card Header Banner */}
    <View style={styles.cardBanner}>
      <AvatarIcon color={msg.avatarColor} bg={msg.avatarBg} name={msg.name} />
    </View>

    {/* Card Body */}
    <View style={styles.cardBody}>
      <Text style={styles.cardName}>{msg.name}</Text>

      {/* Meta */}
      <View style={styles.cardMeta}>
        <View style={styles.cardDateRow}>
          <Feather name="calendar" size={11} color={TEXT_MUTED} />
          <Text style={styles.cardDate}>
            {" "}
            {msg.date.split(" ").slice(0, 3).join(" ")}
          </Text>
        </View>
        <StatusBadge status={msg.status} />
      </View>
    </View>

    {/* Card Divider */}
    <View style={styles.cardDivider} />

    {/* Action Buttons */}
    <View style={styles.actionRow}>
      <TouchableOpacity
        style={styles.btnView}
        onPress={() => onView(msg)}
        activeOpacity={0.75}
      >
        <Feather name="eye" size={14} color={msg.isRead ? "#3B82F6" : PRIMARY} />
        <Text style={[styles.btnViewText, { color: msg.isRead ? "#3B82F6" : PRIMARY }]}>View</Text>
      </TouchableOpacity>

      {msg.status !== "Replied" && (
        <TouchableOpacity
          style={styles.btnMark}
          onPress={() => onMarkReplied(msg.id)}
          activeOpacity={0.75}
        >
          <Feather name="check" size={13} color="#059669" />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.btnReply}
        onPress={() => onReply(msg)}
        activeOpacity={0.75}
      >
        <Feather name="corner-up-left" size={13} color="#2563EB" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.btnDelete}
        onPress={() => onDelete(msg.id)}
        activeOpacity={0.75}
      >
        <Feather name="trash-2" size={13} color="#DC2626" />
      </TouchableOpacity>
    </View>
  </View>
);

// ─── STATS HEADER ─────────────────────────────────────────────────────────────
const StatsHeader: React.FC<{ messages: ContactMessage[] }> = ({
  messages,
}) => {
  const total = messages.length;
  const replied = messages.filter((m) => m.status === "Replied").length;
  const pending = messages.filter((m) => m.status === "Not Replied").length;

  const statsData = [
    {
      icon: "mail" as const,
      value: String(total),
      label: "Total Messages",
      sub: "All messages",
      tint: "#EDE9FE",
      textColor: "#7C3AED",
    },
    {
      icon: "check-circle" as const,
      value: String(replied),
      label: "Replied",
      sub: "Responded",
      tint: "#D1FAE5",
      textColor: "#059669",
    },
    {
      icon: "clock" as const,
      value: String(pending),
      label: "Pending",
      sub: "Needs reply",
      tint: "#FEF3C7",
      textColor: "#D97706",
    },
  ];

  return (
    <View style={styles.statsContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsScroll}
      >
        {statsData.map((stat, index) => (
          <View key={index} style={styles.statItem}>
            <View
              style={[styles.statIconCircle, { backgroundColor: stat.tint }]}
            >
              <Feather name={stat.icon} size={14} color={stat.textColor} />
            </View>
            <Text style={[styles.statValue, { color: stat.textColor }]}>
              {stat.value}
            </Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
            <Text style={styles.statSub}>{stat.sub}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
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

  const handleMarkReplied = () => {
    onMarkReplied(msg.id);
    onClose();
  };

  const content = (
    <View style={[styles.modalContainer, isWeb && styles.modalContainerWeb]}>
      {/* Header */}
      <View style={styles.modalHeader}>
        <View style={styles.modalHeaderLeft}>
          <Feather name="mail" size={16} color="#FFFFFF" />
          <Text style={[styles.modalTitle, { marginLeft: 8 }]}>
            Message Details
          </Text>
        </View>
        <TouchableOpacity onPress={onClose}>
          <Feather name="x" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Body */}
      <ScrollView style={styles.modalBody}>
        {/* Info Grid */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>From</Text>
            <Text style={styles.infoValue}>{msg.name}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Subject</Text>
            <Text style={styles.infoValue}>{msg.subject}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{msg.email}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>{msg.date}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{msg.phone}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Status</Text>
            <StatusBadge status={msg.status} />
          </View>
        </View>

        {/* Message Content */}
        <View style={styles.contentBox}>
          <Text style={styles.contentLabel}>Message Content</Text>
          <Text style={styles.contentText}>{msg.content}</Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.modalFooter}>
        <TouchableOpacity style={styles.btnCancel} onPress={onClose}>
          <Feather name="x" size={14} color="#FFFFFF" />
          <Text style={styles.btnCancelText}> Close</Text>
        </TouchableOpacity>
        {msg.status !== "Replied" && (
          <TouchableOpacity style={styles.btnMarkModal} onPress={handleMarkReplied}>
            <Feather name="check" size={14} color="#FFFFFF" />
            <Text style={styles.btnUpdateText}> Mark as Replied</Text>
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
    <Modal
      visible={visible}
      transparent
      animationType={isWeb ? "fade" : "slide"}
      onRequestClose={onClose}
    >
      <View
        style={isWeb ? styles.modalOverlayWeb : styles.modalOverlayMobile}
      >
        {content}
      </View>
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
      if (Platform.OS === "web") {
        window.alert("Please enter a reply message.");
      } else {
        Alert.alert("Validation", "Please enter a reply message.");
      }
      return;
    }
    onSend(msg.id, replyText);
    setReplyText("");
  };

  return (
    <Modal visible={visible} transparent animationType={isWeb ? "fade" : "slide"} onRequestClose={onClose}>
      <View style={isWeb ? styles.modalOverlayWeb : styles.modalOverlayMobile}>
        <View style={[styles.modalContainer, isWeb && styles.modalContainerWeb, { maxWidth: 700, width: "95%" }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <Feather name="check-circle" size={18} color="#FFFFFF" />
              <Text style={[styles.modalTitle, { marginLeft: 8 }]}>Send Reply</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={[styles.modalBody, { backgroundColor: "#FFFFFF" }]}>
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

          {/* Footer */}
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
  const [status, setStatus] = useState<MessageStatus>("Not Replied");

  if (!visible) return null;

  const handleSave = () => {
    if (!name.trim() || !email.trim() || !subject.trim() || !content.trim()) {
      const msg = "Please fill all required fields.";
      if (Platform.OS === "web") {
        window.alert(msg);
      } else {
        Alert.alert("Validation", msg);
      }
      return;
    }
    const now = new Date();
    const dateStr =
      now.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) +
      " " +
      now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

    onSave({ name, email, phone: phone || "N/A", subject, content, date: dateStr, status });
    setName(""); setEmail(""); setPhone(""); setSubject(""); setContent("");
    setStatus("Not Replied");
    onClose();
  };

  const content_el = (
    <View style={[styles.modalContainer, isWeb && styles.modalContainerWeb]}>
      {/* Header */}
      <View style={styles.modalHeader}>
        <View style={styles.modalHeaderLeft}>
          <Feather name="plus-circle" size={16} color="#FFFFFF" />
          <Text style={[styles.modalTitle, { marginLeft: 8 }]}>
            Add New Message
          </Text>
        </View>
        <TouchableOpacity onPress={onClose}>
          <Feather name="x" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Body */}
      <ScrollView style={styles.modalBody}>
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.inputLabel}>
              Name <Text style={styles.textAsterisk}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="Full name"
              placeholderTextColor={TEXT_MUTED}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>
              Email <Text style={styles.textAsterisk}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={setEmail}
              placeholder="email@example.com"
              keyboardType="email-address"
              placeholderTextColor={TEXT_MUTED}
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.inputLabel}>Phone</Text>
            <TextInput
              style={styles.textInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone number"
              keyboardType="phone-pad"
              placeholderTextColor={TEXT_MUTED}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Status</Text>
            <View style={styles.statusSelector}>
              <TouchableOpacity
                style={[
                  styles.statusOption,
                  status === "Not Replied" && styles.statusOptionActive,
                ]}
                onPress={() => setStatus("Not Replied")}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.statusOptionText,
                    status === "Not Replied" && styles.statusOptionTextActive,
                  ]}
                >
                  Not Replied
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.statusOption,
                  status === "Replied" && styles.statusOptionRepliedActive,
                ]}
                onPress={() => setStatus("Replied")}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.statusOptionText,
                    status === "Replied" && styles.statusOptionRepliedText,
                  ]}
                >
                  Replied
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            Subject <Text style={styles.textAsterisk}>*</Text>
          </Text>
          <TextInput
            style={styles.textInput}
            value={subject}
            onChangeText={setSubject}
            placeholder="Message subject"
            placeholderTextColor={TEXT_MUTED}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            Message <Text style={styles.textAsterisk}>*</Text>
          </Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={content}
            onChangeText={setContent}
            placeholder="Type your message here..."
            placeholderTextColor={TEXT_MUTED}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* Footer */}
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
    <Modal
      visible={visible}
      transparent
      animationType={isWeb ? "fade" : "slide"}
      onRequestClose={onClose}
    >
      <View
        style={isWeb ? styles.modalOverlayWeb : styles.modalOverlayMobile}
      >
        {content_el}
      </View>
    </Modal>
  );
};

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
const ContactMessagesScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";

  const [messages, setMessages] = useState<ContactMessage[]>(initialMessages);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filter, setFilter] = useState<FilterType>("All");
  const [search, setSearch] = useState("");
  const [viewMsg, setViewMsg] = useState<ContactMessage | null>(null);
  const [replyMsg, setReplyMsg] = useState<ContactMessage | null>(null);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  const AVATAR_COLORS = [
    { color: "#7C3AED", bg: "#EDE9FE" },
    { color: "#2563EB", bg: "#DBEAFE" },
    { color: "#059669", bg: "#D1FAE5" },
    { color: "#D97706", bg: "#FEF3C7" },
    { color: "#DC2626", bg: "#FEE2E2" },
  ];

  const filtered = messages.filter((m) => {
    const mf = filter === "All" || m.status === filter;
    const ms =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.subject.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase());
    return mf && ms;
  });

  const handleView = (msg: ContactMessage) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, isRead: true } : m))
    );
    setViewMsg(msg);
  };

  const markReplied = (id: number) =>
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: "Replied" } : m))
    );

  const handleSendReply = (id: number, text: string) => {
    markReplied(id);
    setReplyMsg(null);
    const successMsg = "Reply sent successfully!";
    if (Platform.OS === "web") {
      window.alert(successMsg);
    } else {
      Alert.alert("Success", successMsg);
    }
  };

  const deleteMessage = (id: number) => {
    const confirmDelete = () => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
      const msg = "Message deleted successfully!";
      if (Platform.OS === "web") {
        window.alert(msg);
      } else {
        Alert.alert("Deleted", msg);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to delete this message?")) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        "Confirm Delete",
        "Are you sure you want to delete this message?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: confirmDelete },
        ]
      );
    }
  };

  const addMessage = (
    msg: Omit<ContactMessage, "id" | "avatarColor" | "avatarBg">
  ) => {
    const nextId = Math.max(...messages.map((m) => m.id)) + 1;
    const av = AVATAR_COLORS[nextId % AVATAR_COLORS.length];
    setMessages((prev) => [
      { ...msg, id: nextId, avatarColor: av.color, avatarBg: av.bg },
      ...prev,
    ]);
  };

  const MainContent = (
    <View
      style={[
        styles.mainContentContainer,
        isWeb && styles.webMainContentContainer,
      ]}
    >
      {/* ── Header ── */}
      <View style={[styles.header, isWeb && styles.webHeader]}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Contact Messages</Text>
          <Text style={styles.headerSubtitle}>
            Manage and respond to incoming contact messages.
          </Text>
        </View>
        <View style={styles.headerActions}>
          {isWeb && (
            <View style={styles.viewSwitcher}>
              <Text style={styles.viewLabel}>View:</Text>
              <TouchableOpacity
                style={[
                  styles.viewButton,
                  viewMode === "grid" && styles.viewButtonActive,
                ]}
                onPress={() => setViewMode("grid")}
                activeOpacity={0.8}
              >
                <Feather
                  name="grid"
                  size={16}
                  color={viewMode === "grid" ? "#FFFFFF" : TEXT_MUTED}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.viewButton,
                  viewMode === "list" && styles.viewButtonActive,
                ]}
                onPress={() => setViewMode("list")}
                activeOpacity={0.8}
              >
                <Feather
                  name="list"
                  size={16}
                  color={viewMode === "list" ? "#FFFFFF" : TEXT_MUTED}
                />
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity
            style={styles.addButton}
            activeOpacity={0.85}
            onPress={() => setIsAddModalVisible(true)}
          >
            <Feather
              name="plus"
              size={16}
              color="#FFFFFF"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.addButtonText}>Add New Message</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Mobile Controls ── */}
      {!isWeb && (
        <View style={styles.mobileControlsContainer}>
          <View style={styles.searchContainerMobile}>
            <Feather
              name="search"
              size={16}
              color={TEXT_MUTED}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search messages..."
              placeholderTextColor={TEXT_MUTED}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <View style={styles.viewSwitcherMobile}>
            <Text style={styles.viewLabelMobile}>View Format:</Text>
            <View style={{ flexDirection: "row", gap: 4 }}>
              <TouchableOpacity
                style={[
                  styles.viewButton,
                  viewMode === "grid" && styles.viewButtonActive,
                ]}
                onPress={() => setViewMode("grid")}
                activeOpacity={0.8}
              >
                <Feather
                  name="grid"
                  size={16}
                  color={viewMode === "grid" ? "#FFFFFF" : TEXT_MUTED}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.viewButton,
                  viewMode === "list" && styles.viewButtonActive,
                ]}
                onPress={() => setViewMode("list")}
                activeOpacity={0.8}
              >
                <Feather
                  name="list"
                  size={16}
                  color={viewMode === "list" ? "#FFFFFF" : TEXT_MUTED}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.listContent}
        contentContainerStyle={
          isWeb ? styles.webListContent : { paddingBottom: 80 }
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Web Search + Filter ── */}
        {isWeb && (
          <View style={styles.webToolbar}>
            <View style={styles.searchContainerWeb}>
              <Feather name="search" size={16} color={TEXT_MUTED} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, subject, or email..."
                placeholderTextColor={TEXT_MUTED}
                value={search}
                onChangeText={setSearch}
              />
            </View>
            <View style={styles.filterPills}>
              {(["All", "Not Replied", "Replied"] as FilterType[]).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.pill, filter === f && styles.pillActive]}
                  onPress={() => setFilter(f)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Mobile Filter */}
        {!isWeb && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.mobileFilterScroll}
            contentContainerStyle={{ paddingHorizontal: 2, gap: 8 }}
          >
            {(["All", "Not Replied", "Replied"] as FilterType[]).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.pill, filter === f && styles.pillActive]}
                onPress={() => setFilter(f)}
                activeOpacity={0.8}
              >
                <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Stats */}
        <StatsHeader messages={messages} />

        {/* Result count */}
        <Text style={styles.resultCount}>
          {filtered.length} message{filtered.length !== 1 ? "s" : ""} found
        </Text>

        {/* ── GRID VIEW ── */}
        {viewMode === "grid" && (
          <View
            style={[
              styles.cardGrid,
              !isWeb && { marginHorizontal: 0 },
            ]}
          >
            {filtered.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.cardGridItem,
                  !isWeb && {
                    flexBasis: "100%",
                    maxWidth: "100%",
                    marginHorizontal: 0,
                  },
                ]}
              >
                <MessageCard
                  msg={item}
                  onView={handleView}
                  onMarkReplied={markReplied}
                  onReply={setReplyMsg}
                  onDelete={deleteMessage}
                />
              </View>
            ))}
          </View>
        )}

        {/* ── LIST VIEW ── */}
        {viewMode === "list" && (
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

              {filtered.map((msg) => (
                <View key={msg.id} style={[styles.tableRow, { gap: 24 }]}>
                  {/* Sender */}
                  <View style={[styles.tableCellRow, { width: 200 }]}>
                    <View style={[styles.tableAvatar, { backgroundColor: msg.avatarBg }]}>
                      <Text style={[styles.tableAvatarText, { color: msg.avatarColor }]}>
                        {getInitials(msg.name)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tableCell, { fontWeight: "700" }]} numberOfLines={1}>
                        {msg.name}
                      </Text>
                      <Text style={[styles.tableCell, { color: TEXT_MUTED, fontSize: 11 }]} numberOfLines={1}>
                        {msg.email}
                      </Text>
                    </View>
                  </View>

                  {/* Subject */}
                  <Text style={[styles.tableCell, { width: 160, fontWeight: "600" }]} numberOfLines={1}>
                    {msg.subject}
                  </Text>

                  {/* Preview */}
                  <Text style={[styles.tableCell, { width: 260, color: TEXT_MUTED }]} numberOfLines={2}>
                    {msg.content}
                  </Text>

                  {/* Date */}
                  <Text style={[styles.tableCell, { width: 120, color: TEXT_MUTED }]}>
                    {msg.date.split(" ").slice(0, 3).join(" ")}
                  </Text>

                  {/* Status */}
                  <View style={{ width: 100 }}>
                    <StatusBadge status={msg.status} />
                  </View>

                  {/* Actions */}
                  <View style={{ width: 130, flexDirection: "row", justifyContent: "center", gap: 6 }}>
                    <TouchableOpacity style={styles.tableBtnView} onPress={() => handleView(msg)}>
                      <Feather name="eye" size={13} color="#FFFFFF" />
                    </TouchableOpacity>
                    {msg.status !== "Replied" && (
                      <TouchableOpacity style={styles.tableBtnMark} onPress={() => markReplied(msg.id)}>
                        <Feather name="check" size={13} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={[styles.tableBtnView, { backgroundColor: "#2563EB", borderColor: "#2563EB" }]} onPress={() => setReplyMsg(msg)}>
                      <Feather name="corner-up-left" size={13} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tableBtnDelete} onPress={() => deleteMessage(msg.id)}>
                      <Feather name="trash-2" size={13} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </ScrollView>
    </View>
  );

  if (isWeb) {
    return (
      <View style={styles.webLayout}>
        <View style={styles.webMainColumn}>
          {MainContent}
        </View>
        <ViewDetailModal
          visible={!!viewMsg}
          onClose={() => setViewMsg(null)}
          msg={viewMsg}
          onMarkReplied={markReplied}
          onReply={setReplyMsg}
          isWeb={isWeb}
        />
        <ReplyMessageModal
          visible={!!replyMsg}
          onClose={() => setReplyMsg(null)}
          onSend={handleSendReply}
          msg={replyMsg}
          isWeb={isWeb}
        />
        <AddMessageModal
          visible={isAddModalVisible}
          onClose={() => setIsAddModalVisible(false)}
          onSave={addMessage}
          isWeb={isWeb}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {MainContent}
      <ViewDetailModal
        visible={!!viewMsg}
        onClose={() => setViewMsg(null)}
        msg={viewMsg}
        onMarkReplied={markReplied}
        onReply={setReplyMsg}
        isWeb={isWeb}
      />
      <ReplyMessageModal
        visible={!!replyMsg}
        onClose={() => setReplyMsg(null)}
        onSend={handleSendReply}
        msg={replyMsg}
        isWeb={isWeb}
      />
      <AddMessageModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        onSave={addMessage}
        isWeb={isWeb}
      />
    </SafeAreaView>
  );
};

export default ContactMessagesScreen;

// ─── STYLES ───────────────────────────────────────────────────────────────────
const PRIMARY = "#1d4ed8";
const PRIMARY_LIGHT = "#bfdbfe";
const BORDER = "#E5E7EB";
const TEXT_PRIMARY = "#1e293b";
const TEXT_MUTED = "#64748b";

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
  webMainContentContainer: {
    backgroundColor: "#FFFFFF",
    margin: 16,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 0,
  },
  webHeader: {
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    elevation: 0,
    shadowOpacity: 0,
    paddingTop: 24,
    paddingHorizontal: 24,
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
    backgroundColor: "#F1F5F9",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginRight: 12,
  },
  viewLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginRight: 8,
    fontWeight: "600",
  },
  viewButton: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 2,
  },
  viewButtonActive: {
    backgroundColor: PRIMARY,
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
    maxWidth: 400,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    color: TEXT_PRIMARY,
  },
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
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
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
    paddingTop: 18,
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
    flexBasis: "32%",
    maxWidth: 360,
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
    gap: 8,
    padding: 12,
    alignItems: "center",
  },
  btnView: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: PRIMARY_LIGHT,
  },
  btnViewText: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY,
  },
  btnMark: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  btnReply: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: PRIMARY_LIGHT,
  },
  btnDelete: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },

  // ── Stats ──
  statsContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 18,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  statLabel: {
    fontSize: 10,
    color: TEXT_PRIMARY,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 2,
  },
  statSub: {
    fontSize: 9,
    color: TEXT_MUTED,
    textAlign: "center",
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

  // Info grid in detail modal
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
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

  // Status selector in add modal
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

  // Modal Footer & Buttons
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

  // Form inputs
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