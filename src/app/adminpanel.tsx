// AdminUsersScreen.jsx
// React Native – works on iOS, Android, and Web (react-native-web)
// Web view: no sidebar, shows grid / list toggle (matching screenshots 1–4)
// Mobile view: card list with bottom nav
// Uses @expo/vector-icons (Ionicons) – swap with react-native-vector-icons if not using Expo

import AdminLayout from "@/components/admin-layout";
import Pagination from "@/components/Pagination";
import { getApiErrorMessage } from "@/lib/api/client";
import type { AdminUserRow } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  fromApiRole,
  updateAdminUser,
} from "@/services/adminUserApi";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
const Icon = Ionicons;

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  navy: "#1d324e",
  orange: "#e8731a",
  orangeLight: "#fff0e6",
  white: "#ffffff",
  bg: "#f4f6f9",
  text: "#1a2332",
  subtext: "#6b7280",
  border: "#e5e7eb",
  biscuit: "#f4e1c5",
  green: "#16a34a",
  greenBg: "#dcfce7",
  red: "#dc2626",
  redBg: "#fee2e2",
  inputBg: "#f0f4ff",
  tableHeaderBg: "#fff7f0",
};

// Role badge colours
const ROLE_COLORS = {
  "Admin": { bg: "#fff0e6", text: "#e8731a", border: "#e8731a" },
  "Super admin": { bg: "#fff0e6", text: "#e8731a", border: "#e8731a" },
  "Order management": { bg: "#fff0e6", text: "#e8731a", border: "#e8731a" },
  "Sellers management": { bg: "#fff0e6", text: "#e8731a", border: "#e8731a" },
  "Category management": { bg: "#fff0e6", text: "#e8731a", border: "#e8731a" },
  "Finance management": { bg: "#fff0e6", text: "#e8731a", border: "#e8731a" },
};

// Avatar background colours (cycling)
const AVATAR_BG = [
  "#7c3aed", "#4f46e5", "#7c3aed", "#e8731a",
  "#92400e", "#92400e", "#7c3aed", "#d97706",
  "#4f46e5", "#7c3aed",
];

const ROLES = ["Admin", "Super admin", "Order management", "Sellers management", "Category management", "Finance management"] as const;
const STATUSES = ["Active", "Inactive"] as const;

type Role = typeof ROLES[number];
type Status = typeof STATUSES[number];

function mapAdminRow(u: AdminUserRow): User {
  const displayRole = fromApiRole(u.role);
  const role = (ROLES.includes(displayRole as Role) ? displayRole : "Admin") as Role;
  return {
    id: u.id,
    name: u.fullName ?? u.email ?? "Admin",
    username: u.email?.split("@")[0] ?? "user",
    email: u.email ?? "",
    role,
    status: u.active !== false ? "Active" : "Inactive",
    lastLogin: u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never",
  };
}

type User = {
  id: number;
  name: string;
  username: string;
  email: string;
  role: Role;
  status: Status;
  lastLogin: string;
  password?: string;
};

type UserForm = {
  name: string;
  username: string;
  email: string;
  password: string;
  role: Role;
  status: Status;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function initials(name = "") {
  return name.split(/\s+/).map(w => w[0] || "").slice(0, 2).join("").toUpperCase();
}

const { width: SCREEN_W } = Dimensions.get("window");
const IS_WEB_WIDE = Platform.OS === "web" && SCREEN_W >= 768;

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 48, colorIndex = 0 }: { name: string; size?: number; colorIndex?: number }) {
  const bg = AVATAR_BG[colorIndex % AVATAR_BG.length];
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.33 }]}>{initials(name)}</Text>
    </View>
  );
}

// ─── Role Badge ───────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: Role }) {
  const col = ROLE_COLORS[role] || ROLE_COLORS["Admin"];
  return (
    <View style={[styles.roleBadge, { backgroundColor: col.bg, borderColor: col.border }]}>
      <Text style={[styles.roleBadgeText, { color: col.text }]}>{role}</Text>
    </View>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Status }) {
  const active = status === "Active";
  return (
    <View style={[styles.statusBadge, { borderColor: active ? C.green : C.red }]}>
      <Text style={[styles.statusText, { color: active ? C.green : C.red }]}>{status}</Text>
    </View>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────
function Select<T extends string>({ label, value, options, onChange, hideValue }: { label?: string; value: T; options: readonly T[]; onChange: (value: T) => void; hideValue?: boolean }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<any>(null);
  const isMobileWeb = Platform.OS !== "web" && !IS_WEB_WIDE;
  const isWeb = Platform.OS === "web";

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!open) return;

    function onDocClick(event: MouseEvent) {
      const el = wrapperRef.current as any;
      if (!el) return;
      if (el.contains && el.contains(event.target)) return;
      setOpen(false);
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    // @ts-ignore
    <View
      ref={wrapperRef}
      style={{
        marginBottom: 16,
        position: "relative",
        overflow: "visible",
        zIndex: open && (isMobileWeb || isWeb) ? 1000 : undefined,
        elevation: open && (isMobileWeb || isWeb) ? 20 : undefined,
      }}
    >
      {label ? (
        <Text style={styles.label}>
          {label} <Text style={{ color: C.orange }}>*</Text>
        </Text>
      ) : null}
      <TouchableOpacity style={[styles.selectBox, open && styles.selectBoxActive]} onPress={() => setOpen((prev) => !prev)}>
        <Text style={styles.selectText}>{value}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={C.subtext} />
      </TouchableOpacity>
      {open && (
        <ScrollView
          nestedScrollEnabled={true}
          style={[styles.dropdown, isMobileWeb ? { zIndex: 1001, elevation: 20 } : undefined]}
          scrollEnabled={isMobileWeb}
          showsVerticalScrollIndicator={true}
        >
          {options.map((option, idx) => (
            <Pressable
              key={option}
              onPress={() => {
                onChange(option);
                setOpen(false);
              }}
              style={({ hovered, pressed }: any) => [
                styles.dropdownItem,
                idx < options.length - 1 && styles.dropdownItemBorder,
                (hovered || pressed) && styles.dropdownItemHovered,
                option === value && styles.dropdownItemSelected,
              ]}
            >
              {({ hovered, pressed }: any) => (
                <Text
                  style={[
                    styles.dropdownText,
                    option === value ? styles.dropdownTextSelected : (hovered || pressed) ? styles.dropdownTextSelected : null,
                  ]}
                >
                  {option}
                </Text>
              )}
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, hint, value, onChange, secure }: { label: string; hint?: string; value: string; onChange: (value: string) => void; secure?: boolean }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>
        {label}{hint ? <Text style={{ color: C.subtext, fontWeight: "400", fontSize: 12 }}> ({hint})</Text> : null}
        {" "}<Text style={{ color: C.orange }}>*</Text>
      </Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure}
        placeholder={label}
        placeholderTextColor={C.subtext}
      />
    </View>
  );
}

// ─── User Form Modal ──────────────────────────────────────────────────────────
function UserModal({ visible, onClose, onSubmit, initial }: { visible: boolean; onClose: () => void; onSubmit: (form: UserForm) => void; initial: User | null }) {
  const isEdit = !!initial;
  const [form, setForm] = useState<UserForm>(
    initial
      ? {
        name: initial.name,
        email: initial.email,
        username: initial.username,
        password: initial.password ?? "",
        role: initial.role,
        status: initial.status,
      }
      : { name: "", email: "", username: "", password: "", role: "Admin", status: "Active" }
  );
  const set = <K extends keyof UserForm>(k: K, v: UserForm[K]) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{isEdit ? "Edit Admin User" : "Add New Admin User"}</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={22} color={C.white} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
            <Field label="Name" value={form.name} onChange={v => set("name", v)} />
            <Field label="Email" value={form.email} onChange={v => set("email", v)} />
            <Field label="Username" value={form.username} onChange={v => set("username", v)} />
            <Field label="Password" hint={isEdit ? "Leave blank to keep current" : undefined}
              value={form.password} onChange={v => set("password", v)} secure />
            <Select label="Role" value={form.role} options={ROLES} onChange={v => set("role", v)} />
            <Select label="Status" value={form.status} options={STATUSES} onChange={v => set("status", v)} />
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Icon name="close" size={16} color={C.white} />
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={() => onSubmit(form)}>
              <Icon name={isEdit ? "sync" : "person-add"} size={16} color={C.white} />
              <Text style={styles.submitBtnText}>{isEdit ? "Update" : "Add User"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({ visible, user, onClose, onConfirm }: { visible: boolean; user: User | null; onClose: () => void; onConfirm: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { maxWidth: 340 }]}>
          <View style={[styles.modalHeader, { backgroundColor: C.red }]}>
            <Text style={styles.modalTitle}>Delete User</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={22} color={C.white} />
            </TouchableOpacity>
          </View>
          <View style={{ padding: 24 }}>
            <Text style={{ color: C.text, fontSize: 15, textAlign: "center" }}>
              Are you sure you want to delete{"\n"}
              <Text style={{ fontWeight: "700" }}>{user?.name}</Text>?
            </Text>
          </View>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: C.red }]} onPress={onConfirm}>
              <Icon name="trash" size={16} color={C.white} />
              <Text style={styles.submitBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Mobile User Card ─────────────────────────────────────────────────────────
function UserCard({ user, index, onEdit, onDelete }: { user: User; index: number; onEdit: (user: User) => void; onDelete: (user: User) => void }) {
  const bg = AVATAR_BG[index % AVATAR_BG.length];
  return (
    <View style={styles.mobileCard}>
      {/* Colored top banner */}
      <View style={[styles.mobileCardBanner, { backgroundColor: bg }]}>
        <View style={styles.mobileCardAvatarCircle}>
          <Text style={styles.mobileCardAvatarText}>{initials(user.name)}</Text>
        </View>
      </View>

      {/* Card body */}
      <View style={styles.mobileCardBody}>
        <Text style={styles.mobileCardName}>{user.name}</Text>

        <View style={styles.mobileCardInfoRow}>
          <Icon name="mail-outline" size={13} color={C.subtext} />
          <Text style={styles.mobileCardInfoText} numberOfLines={1}>{user.email}</Text>
        </View>

        <View style={styles.mobileCardInfoRow}>
          <Icon name="person-outline" size={13} color={C.subtext} />
          <Text style={styles.mobileCardInfoText}>{user.username}</Text>
        </View>

        <View style={styles.mobileCardBadgeRow}>
          <RoleBadge role={user.role} />
          <StatusBadge status={user.status} />
        </View>

        <View style={styles.mobileCardTimeRow}>
          <Icon name="time-outline" size={12} color={C.subtext} />
          <Text style={styles.mobileCardTimeText}>
            {user.lastLogin === "Never" ? "Never logged in" : user.lastLogin}
          </Text>
        </View>

        <View style={styles.mobileCardActions}>
          <TouchableOpacity style={[styles.mobileCardActionBtn, { backgroundColor: C.navy }]} onPress={() => onEdit(user)}>
            <Icon name="create-outline" size={16} color={C.white} />
            <Text style={styles.mobileCardActionText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.mobileCardActionBtn, { backgroundColor: C.red }]} onPress={() => onDelete(user)}>
            <Icon name="trash-outline" size={16} color={C.white} />
            <Text style={styles.mobileCardActionText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Mobile List Row ─────────────────────────────────────────────────────────
function MobileListRow({ user, index, onEdit, onDelete }: { user: User; index: number; onEdit: (user: User) => void; onDelete: (user: User) => void }) {
  const bg = AVATAR_BG[index % AVATAR_BG.length];
  return (
    <View style={[styles.mobileListRow, index % 2 === 1 && { backgroundColor: "#fafafa" }]}>
      {/* Avatar */}
      <View style={[styles.mobileListAvatar, { backgroundColor: bg }]}>
        <Text style={styles.mobileListAvatarText}>{initials(user.name)}</Text>
      </View>

      {/* Info */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.mobileListName} numberOfLines={1}>{user.name}</Text>
        <Text style={styles.mobileListEmail} numberOfLines={1}>{user.email}</Text>
        <View style={{ flexDirection: "row", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
          <RoleBadge role={user.role} />
          <StatusBadge status={user.status} />
        </View>
      </View>

      {/* Actions */}
      <View style={styles.mobileListActions}>
        <TouchableOpacity style={styles.mobileListEditBtn} onPress={() => onEdit(user)}>
          <Icon name="create-outline" size={16} color={C.white} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.mobileListDeleteBtn} onPress={() => onDelete(user)}>
          <Icon name="trash-outline" size={16} color={C.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Web List Table Row ───────────────────────────────────────────────────────
function TableRow({ user, index, selected, onPress, onEdit, onDelete }: { user: User; index: number; selected: boolean; onPress: () => void; onEdit: (user: User) => void; onDelete: (user: User) => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [
      styles.tableRow,
      index % 2 === 1 && !selected && { backgroundColor: "#fafafa" },
      selected && { backgroundColor: C.biscuit },
      pressed && { opacity: 0.85 },
    ]}>
      <Text style={[styles.tableCell, { width: 50, color: C.subtext, flexShrink: 0 }]}>{user.id}</Text>
      <View style={[styles.tableCell, { width: 200, flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 0 }]}>
        <Avatar name={user.name} size={36} colorIndex={index} />
        <View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={[styles.userSub, { fontSize: 11 }]}>{user.username}</Text>
        </View>
      </View>
      <Text style={[styles.tableCell, { flex: 1, color: C.subtext, fontSize: 13 }]}>{user.email}</Text>
      <View style={[styles.tableCell, { width: 140, flexShrink: 0 }]}>
        <RoleBadge role={user.role} />
      </View>
      <View style={[styles.tableCell, { width: 100, flexShrink: 0 }]}>
        <StatusBadge status={user.status} />
      </View>
      <View style={[styles.tableCell, { width: 190, flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 0 }]}>
        <Icon name="time-outline" size={12} color={C.subtext} />
        <Text style={styles.timeText}>{user.lastLogin}</Text>
      </View>
      <View style={[styles.tableCell, { width: 90, flexDirection: "row", gap: 8, flexShrink: 0 }]}>
        <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(user)}>
          <Icon name="create-outline" size={16} color={C.white} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(user)}>
          <Icon name="trash-outline" size={16} color={C.white} />
        </TouchableOpacity>
      </View>
    </Pressable>
  );
}

// ─── Web Grid Card ────────────────────────────────────────────────────────────
function GridCard({ user, index, onEdit, onDelete }: { user: User; index: number; onEdit: (user: User) => void; onDelete: (user: User) => void }) {
  const bg = AVATAR_BG[index % AVATAR_BG.length];
  return (
    <View style={styles.gridCard}>
      {/* Coloured top banner */}
      <View style={[styles.gridBanner, { backgroundColor: bg }]}>
        <View style={styles.gridAvatarCircle}>
          <Text style={styles.gridAvatarText}>{initials(user.name)}</Text>
        </View>
      </View>
      {/* Card body */}
      <View style={styles.gridBody}>
        <Text style={styles.gridName}>{user.name}</Text>
        <View style={styles.gridInfoRow}>
          <Icon name="mail-outline" size={13} color={C.subtext} />
          <Text style={styles.gridInfoText} numberOfLines={1}>{user.email}</Text>
        </View>
        <View style={styles.gridInfoRow}>
          <Icon name="person-outline" size={13} color={C.subtext} />
          <Text style={styles.gridInfoText}>{user.username}</Text>
        </View>
        <View style={styles.gridBadgeRow}>
          <RoleBadge role={user.role} />
          <StatusBadge status={user.status} />
        </View>
        <View style={styles.gridTimeRow}>
          <Icon name="time-outline" size={12} color={C.subtext} />
          <Text style={styles.gridTimeText}>
            {user.lastLogin === "Never" ? "Never logged in" : user.lastLogin}
          </Text>
        </View>
        <View style={styles.gridActions}>
          <TouchableOpacity style={[styles.gridActionBtn, { backgroundColor: C.navy }]} onPress={() => onEdit(user)}>
            <Icon name="create-outline" size={15} color={C.white} />
            <Text style={styles.gridActionText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.gridActionBtn, { backgroundColor: C.red }]} onPress={() => onDelete(user)}>
            <Icon name="trash-outline" size={15} color={C.white} />
            <Text style={styles.gridActionText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
// (Using reusable component from @/components/Pagination)

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AdminUsersScreen() {
  const [containerWidth, setContainerWidth] = useState(SCREEN_W);
  const [users, setUsers] = useState<User[]>([]);
  const [sortBy, setSortBy] = useState<"Last Login" | "Name">("Last Login");
  const [sortOpen, setSortOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [addVisible, setAddVisible] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const isWide = IS_WEB_WIDE;

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetchAdminUsers(0, 100);
      setUsers((res.items ?? []).map(mapAdminRow));
    } catch (e) {
      console.warn(getApiErrorMessage(e));
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const sorted = [...users].sort((a, b) => {
    if (sortBy === "Last Login") {
      if (a.lastLogin === "Never") return 1;
      if (b.lastLogin === "Never") return -1;
      return new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime();
    }
    return a.name.localeCompare(b.name);
  });

  const totalItems = sorted.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedUsers = sorted.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  async function handleAdd(form: UserForm) {
    try {
      await createAdminUser({
        email: form.email,
        fullName: form.name,
        role: form.role,
        active: form.status === "Active",
        password: form.password,
      });
      await loadUsers();
      setAddVisible(false);
    } catch (e) {
      console.warn(getApiErrorMessage(e));
    }
  }

  async function handleEdit(form: UserForm) {
    if (!editUser) return;
    try {
      await updateAdminUser(editUser.id, {
        fullName: form.name,
        role: form.role,
        active: form.status === "Active",
        ...(form.password ? { password: form.password } : {}),
      });
      await loadUsers();
      setEditUser(null);
    } catch (e) {
      console.warn(getApiErrorMessage(e));
    }
  }

  async function handleDelete() {
    if (!deleteUser) return;
    try {
      await deleteAdminUser(deleteUser.id);
      await loadUsers();
      setDeleteUser(null);
    } catch (e) {
      console.warn(getApiErrorMessage(e));
    }
  }

  // ── Mobile Layout ────────────────────────────────────────────────────────
  const MobileLayout = () => (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Content */}
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
          {/* Header Card */}
          <View style={styles.mobileHeaderCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={styles.headerCardIcon}>
                <Icon name="people" size={26} color={C.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerCardSubtitle}>Manage system administrators, roles,{"\n"}permissions, and account statuses</Text>
              </View>
              <TouchableOpacity style={styles.mobileAddBtn} onPress={() => setAddVisible(true)}>
                <Icon name="add" size={18} color={C.white} />
                <Text style={styles.mobileAddBtnText}>Add User</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats + View Toggle Card */}
          <View style={styles.mobileStatsCard}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={styles.mobileStatsText}>Total Users: <Text style={styles.mobileStatsCount}>{users.length}</Text></Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={styles.sortLabel}>View:</Text>
                <View style={styles.viewToggle}>
                  <TouchableOpacity
                    style={[styles.viewToggleBtn, viewMode === "grid" && styles.viewToggleBtnActive]}
                    onPress={() => setViewMode("grid")}>
                    <Icon name="grid-outline" size={18} color={viewMode === "grid" ? C.white : C.subtext} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.viewToggleBtn, viewMode === "list" && styles.viewToggleBtnActive]}
                    onPress={() => setViewMode("list")}>
                    <Icon name="list-outline" size={18} color={viewMode === "list" ? C.white : C.subtext} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* User Cards / List Rows */}
          {viewMode === "grid"
            ? paginatedUsers.map((u, i) => (
              <UserCard key={u.id} user={u} index={i}
                onEdit={u => setEditUser(u)}
                onDelete={u => setDeleteUser(u)} />
            ))
            : (
              <View style={styles.mobileListContainer}>
                {paginatedUsers.map((u, i) => (
                  <MobileListRow key={u.id} user={u} index={i}
                    onEdit={u => setEditUser(u)}
                    onDelete={u => setDeleteUser(u)} />
                ))}
              </View>
            )
          }

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            itemName="users"
            onPageChange={setCurrentPage}
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );

  // ── Web Layout (NO sidebar) ───────────────────────────────────────────────
  const WebLayout = () => (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 24 }}>

        {/* ── Page Header ── */}
        <View style={styles.webPageHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 16 }}>
            <View style={styles.headerIconBox}>
              <Icon name="people" size={24} color={C.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.webPageTitle}>Admin Panel Users</Text>
              <Text style={styles.webPageSubtitle}>Manage system administrators, roles, permissions, and account statuses</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setAddVisible(true)}>
            <Icon name="add" size={18} color={C.white} />
            <Text style={styles.addBtnText}>Add New User</Text>
          </TouchableOpacity>
        </View>

        {/* Stats + View Toggle Row */}
        <View style={[styles.webStatsRow, { marginTop: 16 }]}>
          <View style={styles.webTotalBadge}>
            <Text style={styles.webTotalText}>Total Users: <Text style={styles.webTotalCount}>{users.length}</Text></Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Text style={styles.sortLabel}>View:</Text>
            <View style={styles.viewToggle}>
              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === "grid" && styles.viewToggleBtnActive]}
                onPress={() => setViewMode("grid")}>
                <Icon name="grid-outline" size={18} color={viewMode === "grid" ? C.white : C.subtext} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === "list" && styles.viewToggleBtnActive]}
                onPress={() => setViewMode("list")}>
                <Icon name="list-outline" size={18} color={viewMode === "list" ? C.white : C.subtext} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── LIST VIEW (table) ── */}
        {viewMode === "list" && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={[styles.tableContainer, { width: Math.max(containerWidth - 48, 960), marginBottom: 20 }]}>
              {/* Header */}
              <View style={[styles.tableRow, styles.tableHeader]}>
                {[
                  { label: "ID", w: 50 },
                  { label: "Name", w: 200 },
                  { label: "Email", flex: 1 },
                  { label: "Role", w: 140 },
                  { label: "Status", w: 100 },
                  { label: "Last Login", w: 190 },
                  { label: "Actions", w: 90 },
                ].map(h => (
                  <Text key={h.label} style={[
                    styles.tableHeadCell,
                    h.flex ? { flex: h.flex } : { width: h.w, flexShrink: 0 },
                  ]}>{h.label}</Text>
                ))}
              </View>
              {paginatedUsers.map((u, i) => (
                <TableRow key={u.id} user={u} index={i}
                  selected={selectedUserId === u.id}
                  onPress={() => setSelectedUserId(selectedUserId === u.id ? null : u.id)}
                  onEdit={u => setEditUser(u)}
                  onDelete={u => setDeleteUser(u)} />
              ))}
            </View>
          </ScrollView>
        )}

        {/* ── GRID VIEW ── */}
        {viewMode === "grid" && (
          <View style={styles.gridContainer}>
            {paginatedUsers.map((u, i) => (
              <GridCard key={u.id} user={u} index={i}
                onEdit={u => setEditUser(u)}
                onDelete={u => setDeleteUser(u)} />
            ))}
          </View>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={ITEMS_PER_PAGE}
          itemName="users"
          onPageChange={setCurrentPage}
        />

      </ScrollView>
    </View>
  );

  return (
    <AdminLayout>
      <View style={{ flex: 1 }} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
        {isWide ? <WebLayout /> : <MobileLayout />}

        <UserModal
          visible={addVisible}
          onClose={() => setAddVisible(false)}
          onSubmit={handleAdd}
          initial={null}
        />

        {editUser && (
          <UserModal
            visible={!!editUser}
            onClose={() => setEditUser(null)}
            onSubmit={handleEdit}
            initial={editUser}
          />
        )}

        <DeleteModal
          visible={!!deleteUser}
          user={deleteUser}
          onClose={() => setDeleteUser(null)}
          onConfirm={handleDelete}
        />
      </View>
    </AdminLayout>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Avatar ──
  avatar: { justifyContent: "center", alignItems: "center" },
  avatarText: { color: C.white, fontWeight: "700" },

  // ── Badges ──
  roleBadge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleBadgeText: { fontSize: 11, fontWeight: "600" },
  statusBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" },
  statusText: { fontSize: 11, fontWeight: "600" },

  // ── Mobile Top Bar ──
  mobileTopBar: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: C.navy,
  },
  topBarTitle: { color: C.white, fontSize: 20, fontWeight: "700" },

  // ── Mobile Header Card ──
  mobileHeaderCard: {
    backgroundColor: C.navy, borderRadius: 14, padding: 16,
    marginBottom: 16,
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  headerCardIcon: { backgroundColor: C.orange, borderRadius: 10, padding: 8 },
  headerCardTitle: { color: C.white, fontSize: 18, fontWeight: "700" },
  headerCardSubtitle: { color: "#cbd5e1", fontSize: 12, marginTop: 2 },
  mobileAddBtn: { backgroundColor: C.orange, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 10 },
  mobileAddBtnText: { color: C.white, fontWeight: "700", fontSize: 13 },

  // ── Mobile Stats Card ──
  mobileStatsCard: {
    backgroundColor: C.white, borderRadius: 10, padding: 14,
    marginBottom: 16,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  mobileStatsText: { color: C.subtext, fontSize: 14 },
  mobileStatsCount: { color: C.orange, fontWeight: "800", fontSize: 16 },

  // ── Mobile View Toggle ──
  mobileViewToggleRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },

  // ── Mobile Card ──
  mobileCard: { backgroundColor: C.white, borderRadius: 14, overflow: "hidden", marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  mobileCardBanner: { height: 100, justifyContent: "flex-end", alignItems: "center", paddingBottom: 0 },
  mobileCardAvatarCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.95)", justifyContent: "center", alignItems: "center", marginBottom: -32, borderWidth: 3, borderColor: C.white },
  mobileCardAvatarText: { fontSize: 20, fontWeight: "800", color: C.navy },
  mobileCardBody: { paddingHorizontal: 16, paddingTop: 40, paddingBottom: 16 },
  mobileCardName: { fontSize: 16, fontWeight: "800", color: C.text, textAlign: "center", marginBottom: 12 },
  mobileCardInfoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  mobileCardInfoText: { fontSize: 13, color: C.subtext, flex: 1 },
  mobileCardBadgeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, marginBottom: 10, flexWrap: "wrap" },
  mobileCardTimeRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 14 },
  mobileCardTimeText: { fontSize: 12, color: C.subtext },
  mobileCardActions: { flexDirection: "row", gap: 8 },
  mobileCardActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 8, paddingVertical: 10 },
  mobileCardActionText: { color: C.white, fontSize: 14, fontWeight: "600" },

  // ── Action buttons ──
  editBtn: { backgroundColor: C.navy, borderRadius: 8, padding: 8, justifyContent: "center", alignItems: "center" },
  deleteBtn: { backgroundColor: C.red, borderRadius: 8, padding: 8, justifyContent: "center", alignItems: "center" },

  // ── Mobile List Row ──
  mobileListContainer: { backgroundColor: C.white, borderRadius: 14, overflow: "hidden", marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  mobileListRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.white },
  mobileListAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  mobileListAvatarText: { color: C.white, fontWeight: "700", fontSize: 14 },
  mobileListName: { fontSize: 14, fontWeight: "700", color: C.text },
  mobileListEmail: { fontSize: 12, color: C.subtext, marginTop: 2 },
  mobileListActions: { flexDirection: "row", gap: 6, flexShrink: 0 },
  mobileListEditBtn: { backgroundColor: C.navy, borderRadius: 8, padding: 8, justifyContent: "center", alignItems: "center" },
  mobileListDeleteBtn: { backgroundColor: C.red, borderRadius: 8, padding: 8, justifyContent: "center", alignItems: "center" },

  // ── Pagination ──
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 },
  paginationText: { color: C.subtext, fontSize: 13 },
  pageBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: C.border, justifyContent: "center", alignItems: "center" },
  pageActive: { width: 32, height: 32, borderRadius: 8, backgroundColor: C.orange, justifyContent: "center", alignItems: "center" },
  pageActiveText: { color: C.white, fontWeight: "700", fontSize: 14 },

  // ── Bottom Nav (mobile) ──
  bottomNav: { flexDirection: "row", backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border, paddingBottom: Platform.OS === "ios" ? 20 : 6, paddingTop: 8, position: "absolute", bottom: 0, left: 0, right: 0 },
  navTab: { flex: 1, alignItems: "center", gap: 3 },
  navTabLabel: { fontSize: 11, color: C.subtext },

  // ── Modal ──
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 16 },
  modalCard: { backgroundColor: C.white, borderRadius: 14, width: "100%", maxWidth: 460, maxHeight: "90%", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20, elevation: 10, overflow: "visible" },
  modalHeader: { backgroundColor: C.orange, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16 },
  modalTitle: { color: C.white, fontSize: 17, fontWeight: "700" },
  modalFooter: { flexDirection: "row", gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: C.border, justifyContent: "flex-end" },
  cancelBtn: { backgroundColor: "#374151", borderRadius: 9, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10 },
  cancelBtnText: { color: C.white, fontWeight: "600", fontSize: 14 },
  submitBtn: { backgroundColor: C.orange, borderRadius: 9, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 18, paddingVertical: 10 },
  submitBtnText: { color: C.white, fontWeight: "700", fontSize: 14 },

  // ── Form ──
  label: { color: C.text, fontWeight: "600", fontSize: 14, marginBottom: 6 },
  input: { backgroundColor: C.inputBg, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: C.text, borderWidth: 1, borderColor: C.border },
  selectBox: { backgroundColor: C.inputBg, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: C.border },
  selectBoxActive: { borderColor: C.orange, borderWidth: 2 },
  selectText: { flex: 1, fontSize: 14, color: C.text },
  dropdown: { position: "absolute", top: "100%", left: 0, right: 0, width: "100%", backgroundColor: C.white, borderRadius: 8, borderWidth: 1, borderColor: C.border, maxHeight: 280, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8 },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 10 },
  dropdownItemBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  dropdownItemHovered: { backgroundColor: "#2563eb" },
  dropdownItemSelected: { backgroundColor: "#2563eb" },
  dropdownText: { fontSize: 14, color: C.text },
  dropdownTextSelected: { color: C.white, fontWeight: "700" },

  // ── Web Top Bar ──
  webTopBar: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28, paddingVertical: 12,
    backgroundColor: C.white,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  webLogo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  webLogoBox: { width: 40, height: 40, borderRadius: 8, backgroundColor: C.orange, justifyContent: "center", alignItems: "center" },
  webLogoBoxText: { color: C.white, fontWeight: "900", fontSize: 13 },
  webLogoName: { color: C.text, fontWeight: "800", fontSize: 11 },
  webLogoTagline: { color: C.subtext, fontSize: 9 },
  webSearch: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.bg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, marginHorizontal: 28, borderWidth: 1, borderColor: C.border },
  webSearchInput: { flex: 1, fontSize: 13, color: C.text },
  webTopBarRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: C.border, justifyContent: "center", alignItems: "center" },

  // ── Web Page Header ──
  webPageHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 24, paddingVertical: 20,
    backgroundColor: C.navy,
    borderRadius: 12,
    marginHorizontal: 24,
    marginTop: 24,
  },
  webPageTitle: { fontSize: 22, fontWeight: "800", color: C.white },
  webPageSubtitle: { fontSize: 13, color: "#cbd5e1", marginTop: 4 },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: C.orange,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  // ── Web Stats Row ──
  webStatsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  webTotalBadge: { backgroundColor: C.white, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10, borderWidth: 1, borderColor: C.border },
  webTotalText: { color: C.subtext, fontSize: 14 },
  webTotalCount: { color: C.orange, fontWeight: "800", fontSize: 16 },

  // ── View Toggle ──
  viewToggle: { flexDirection: "row", borderWidth: 1, borderColor: C.border, borderRadius: 8, overflow: "hidden" },
  viewToggleBtn: { padding: 8, backgroundColor: C.white },
  viewToggleBtnActive: { backgroundColor: C.navy },

  // ── Table ──
  tableContainer: { backgroundColor: C.white, borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: "hidden", marginBottom: 20 },
  tableHeader: { backgroundColor: C.tableHeaderBg },
  tableRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  tableCell: { paddingRight: 8 },
  tableHeadCell: { paddingRight: 8, fontSize: 12, fontWeight: "700", color: C.subtext, textTransform: "uppercase", letterSpacing: 0.5 },

  // ── Grid ──
  gridContainer: { flexDirection: "row", flexWrap: "wrap", gap: 20, marginBottom: 20 },
  gridCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    overflow: "hidden",
    width: 340,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  gridBanner: { height: 110, justifyContent: "flex-end", alignItems: "center", paddingBottom: 0 },
  gridAvatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.9)", justifyContent: "center", alignItems: "center", marginBottom: -36, borderWidth: 3, borderColor: C.white },
  gridAvatarText: { fontSize: 24, fontWeight: "800", color: C.navy },
  gridBody: { paddingHorizontal: 16, paddingTop: 44, paddingBottom: 16 },
  gridName: { fontSize: 16, fontWeight: "800", color: C.text, textAlign: "center", marginBottom: 10 },
  gridInfoRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  gridInfoText: { fontSize: 12, color: C.subtext, flex: 1 },
  gridBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "nowrap",
    marginTop: 8,
    marginBottom: 6,
  },
  gridTimeRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 12 },
  gridTimeText: { fontSize: 11, color: C.subtext },
  gridActions: { flexDirection: "row", gap: 8 },
  gridActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 8, paddingVertical: 8 },
  gridActionText: { color: C.white, fontSize: 13, fontWeight: "600" },

  // ── Web Footer ──
  webFooter: { paddingTop: 24, paddingBottom: 8, alignItems: "center" },
  webFooterText: { fontSize: 13, color: C.subtext },

  // ── Shared ──
  timeText: { fontSize: 11, color: C.subtext },
  userName: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 2 },
  userSub: { fontSize: 12, color: C.subtext, marginBottom: 2 },
  sortLabel: { color: C.subtext, fontSize: 14 },
  addBtn: { backgroundColor: C.orange, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10 },
  addBtnText: { color: C.white, fontWeight: "700", fontSize: 14 },
});