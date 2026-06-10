// AdminUsersScreen.jsx
// React Native – works on iOS, Android, and Web (react-native-web)
// Web view: no sidebar, shows grid / list toggle (matching screenshots 1–4)
// Mobile view: card list with bottom nav
// Uses @expo/vector-icons (Ionicons) – swap with react-native-vector-icons if not using Expo

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import type { AdminUserRow } from "@/lib/api/types";
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  updateAdminUser,
} from "@/services/adminUserApi";
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
  navy: "#1a2332",
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
  "Admin":              { bg: "#fff0e6", text: "#e8731a", border: "#e8731a" },
  "Super admin":        { bg: "#fff0e6", text: "#e8731a", border: "#e8731a" },
  "Order management":   { bg: "#fff0e6", text: "#e8731a", border: "#e8731a" },
  "Sellers management": { bg: "#fff0e6", text: "#e8731a", border: "#e8731a" },
  "Category management":{ bg: "#fff0e6", text: "#e8731a", border: "#e8731a" },
  "Finance management": { bg: "#fff0e6", text: "#e8731a", border: "#e8731a" },
};

// Avatar background colours (cycling)
const AVATAR_BG = [
  "#7c3aed","#4f46e5","#7c3aed","#e8731a",
  "#92400e","#92400e","#7c3aed","#d97706",
  "#4f46e5","#7c3aed",
];

const ROLES    = ["Admin", "Super admin", "Order management", "Sellers management", "Category management", "Finance management"] as const;
const STATUSES = ["Active", "Inactive"] as const;

type Role = typeof ROLES[number];
type Status = typeof STATUSES[number];

function mapAdminRow(u: AdminUserRow): User {
  const role = (ROLES.includes((u.role ?? "Admin") as Role) ? u.role : "Admin") as Role;
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
              style={({ hovered, pressed }) => [
                styles.dropdownItem,
                idx < options.length - 1 && styles.dropdownItemBorder,
                (hovered || pressed) && styles.dropdownItemHovered,
                option === value && styles.dropdownItemSelected,
              ]}
            >
              {({ hovered, pressed }) => (
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
            <Field label="Name"     value={form.name}     onChange={v => set("name", v)} />
            <Field label="Email"    value={form.email}    onChange={v => set("email", v)} />
            <Field label="Username" value={form.username} onChange={v => set("username", v)} />
            <Field label="Password" hint={isEdit ? "Leave blank to keep current" : undefined}
                   value={form.password} onChange={v => set("password", v)} secure />
            <Select label="Role"   value={form.role}   options={ROLES}    onChange={v => set("role", v)} />
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
  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <Avatar name={user.name} colorIndex={index} />
        {/* <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userSub}>{user.username}</Text>
          <Text style={styles.userSub}>{user.email}</Text>
          <RoleBadge role={user.role} />
        </View>
        <View style={{ alignItems: "flex-end", gap: 6 }}>
          <StatusBadge status={user.status} />
          <View style={styles.timeRow}>
            <Icon name="time-outline" size={12} color={C.subtext} />
            <Text style={styles.timeText}>{user.lastLogin}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
            <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(user)}>
              <Icon name="create-outline" size={16} color={C.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(user)}>
              <Icon name="trash-outline" size={16} color={C.white} />
            </TouchableOpacity>
          </View>
        </View> */}
        <View
  style={{
    flex: 1,
    marginLeft: 12,
    paddingRight: 110, // reserve space for status/actions
  }}
>
  <Text style={styles.userName}>{user.name}</Text>
  <Text style={styles.userSub}>{user.username}</Text>
  <Text style={styles.userSub}>{user.email}</Text>
  <RoleBadge role={user.role} />
</View>

<View
  style={{
    width: 100, // fixed width
    alignItems: "flex-end",
    gap: 6,
  }}
>
  <StatusBadge status={user.status} />

  <View style={styles.timeRow}>
    <Icon name="time-outline" size={12} color={C.subtext} />
    <Text style={styles.timeText}>{user.lastLogin}</Text>
  </View>

  <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
    <TouchableOpacity
      style={styles.editBtn}
      onPress={() => onEdit(user)}
    >
      <Icon name="create-outline" size={16} color={C.white} />
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.deleteBtn}
      onPress={() => onDelete(user)}
    >
      <Icon name="trash-outline" size={16} color={C.white} />
    </TouchableOpacity>
  </View>
</View>
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
      <Text style={[styles.tableCell, { width: 50, color: C.subtext }]}>{user.id}</Text>
      <View style={[styles.tableCell, { width: 200, flexDirection: "row", alignItems: "center", gap: 10 }]}> 
        <Avatar name={user.name} size={36} colorIndex={index} />
        <View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={[styles.userSub, { fontSize: 11 }]}>{user.username}</Text>
        </View>
      </View>
      <Text style={[styles.tableCell, { flex: 1, color: C.subtext, fontSize: 13 }]}>{user.email}</Text>
      <View style={[styles.tableCell, { width: 140 }]}> 
        <RoleBadge role={user.role} />
      </View>
      <View style={[styles.tableCell, { width: 100 }]}> 
        <StatusBadge status={user.status} />
      </View>
      <View style={[styles.tableCell, { width: 190, flexDirection: "row", alignItems: "center", gap: 4 }]}> 
        <Icon name="time-outline" size={12} color={C.subtext} />
        <Text style={styles.timeText}>{user.lastLogin}</Text>
      </View>
      <View style={[styles.tableCell, { width: 90, flexDirection: "row", gap: 8 }]}> 
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
function Pagination({ total }: { total: number }) {
  return (
    <View style={styles.pagination}>
      <Text style={styles.paginationText}>Showing 1 – {total} of {total} users</Text>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <TouchableOpacity style={styles.pageBtn}>
          <Icon name="chevron-back" size={16} color={C.subtext} />
        </TouchableOpacity>
        <View style={styles.pageActive}><Text style={styles.pageActiveText}>1</Text></View>
        <TouchableOpacity style={styles.pageBtn}>
          <Icon name="chevron-forward" size={16} color={C.subtext} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AdminUsersScreen() {
  const [users, setUsers]           = useState<User[]>([]);
  const [sortBy, setSortBy]         = useState<"Last Login" | "Name">("Last Login");
  const [sortOpen, setSortOpen]     = useState(false);
  const [viewMode, setViewMode]     = useState<"list" | "grid">("list");
  const [addVisible, setAddVisible] = useState(false);
  const [editUser, setEditUser]     = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
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
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity>
          <Icon name="menu" size={26} color={C.white} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Admin Users</Text>
        <View style={styles.topBarIcons}>
          <TouchableOpacity style={styles.topBarAdd} onPress={() => setAddVisible(true)}>
            <Icon name="add" size={20} color={C.white} />
          </TouchableOpacity>
          <TouchableOpacity><Icon name="search-outline" size={22} color={C.white} /></TouchableOpacity>
          <View style={{ position: "relative" }}>
            <TouchableOpacity><Icon name="notifications-outline" size={22} color={C.white} /></TouchableOpacity>
            <View style={styles.notifBadge}><Text style={styles.notifBadgeText}>2</Text></View>
          </View>
          <View style={styles.avatarSmall}><Text style={styles.avatarSmallText}>FL</Text></View>
        </View>
      </View>

      {/* Content */}
      <View style={{ flex: 1, backgroundColor: C.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
          {/* Stats Card */}
          <View style={styles.statsCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={styles.statsIcon}>
                <Icon name="people" size={26} color={C.orange} />
              </View>
              <View>
                <Text style={styles.statsLabel}>Total Users</Text>
                <Text style={styles.statsCount}>{users.length}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => setAddVisible(true)}>
              <Icon name="add" size={18} color={C.white} />
              <Text style={styles.addBtnText}>Add New User</Text>
            </TouchableOpacity>
          </View>

          {/* Sort Row */}
          {/* <View style={styles.sortRow}>
            <Text style={styles.sortLabel}>Sort By</Text>
            <View style={{ position: "relative" }}>
              <TouchableOpacity style={styles.sortBox} onPress={() => setSortOpen(!sortOpen)}>
                <Text style={styles.sortBoxText}>{sortBy}</Text>
                <Icon name={sortOpen ? "chevron-up" : "chevron-down"} size={16} color={C.text} />
              </TouchableOpacity>
              {sortOpen && (
                <View style={styles.sortDropdown}>
                  {["Last Login", "Name"].map(o => (
                    <TouchableOpacity key={o} style={styles.sortItem}
                      onPress={() => { setSortBy(o as "Last Login" | "Name"); setSortOpen(false); }}>
                      <Text style={[styles.sortItemText, o === sortBy && { color: C.orange }]}>{o}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View> */}

          {/* User Cards */}
          {sorted.map((u, i) => (
            <UserCard key={u.id} user={u} index={i}
              onEdit={u => setEditUser(u)}
              onDelete={u => setDeleteUser(u)} />
          ))}

          <Pagination total={users.length} />
        </ScrollView>
      </View>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        {([
          { icon: "people",              label: "Users",     active: true  },
          { icon: "grid-outline",        label: "Dashboard", active: false },
          { icon: "bag-outline",         label: "Orders",    active: false },
          { icon: "cube-outline",        label: "Products",  active: false },
          { icon: "ellipsis-horizontal", label: "More",      active: false },
        ] as const).map(tab => (
          <TouchableOpacity key={tab.label} style={styles.navTab}>
                <Icon name={tab.icon} size={22} color={tab.active ? C.orange : C.subtext} />
            <Text style={[styles.navTabLabel, tab.active && { color: C.orange }]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );

  // ── Web Layout (NO sidebar) ───────────────────────────────────────────────
  const WebLayout = () => (
    <View style={{ flex: 1, backgroundColor: C.bg }}>



      {/* ── Page Header ── */}
      <View style={styles.webPageHeader}>
        <View>
          <Text style={styles.webPageTitle}>Admin Panel Users</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
            <Icon name="home-outline" size={13} color={C.subtext} />
            <Text style={styles.breadcrumb}>Dashboard</Text>
            <Text style={styles.breadcrumb}> › </Text>
            <Text style={[styles.breadcrumb, { color: C.text }]}>Admin Users</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddVisible(true)}>
            <Icon name="add" size={18} color={C.white} />
          <Text style={styles.addBtnText}>Add New User</Text>
        </TouchableOpacity>
      </View>

      {/* ── Content ── */}
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 16 }}>

        {/* Stats + View Toggle Row */}
        <View style={styles.webStatsRow}>
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
          <View style={styles.tableContainer}>
            {/* Header */}
            <View style={[styles.tableRow, styles.tableHeader]}>
              {[
                { label: "ID",         w: 50  },
                { label: "Name",       w: 200 },
                { label: "Email",      flex: 1 },
                { label: "Role",       w: 140 },
                { label: "Status",     w: 100 },
                { label: "Last Login", w: 190 },
                { label: "Actions",    w: 90  },
              ].map(h => (
                <Text key={h.label} style={[
                  styles.tableHeadCell,
                  h.flex ? { flex: h.flex } : { width: h.w },
                ]}>{h.label}</Text>
              ))}
            </View>
            {sorted.map((u, i) => (
              <TableRow key={u.id} user={u} index={i}
                selected={selectedUserId === u.id}
                onPress={() => setSelectedUserId(selectedUserId === u.id ? null : u.id)}
                onEdit={u => setEditUser(u)}
                onDelete={u => setDeleteUser(u)} />
            ))}
          </View>
        )}

        {/* ── GRID VIEW ── */}
        {viewMode === "grid" && (
          <View style={styles.gridContainer}>
            {sorted.map((u, i) => (
              <GridCard key={u.id} user={u} index={i}
                onEdit={u => setEditUser(u)}
                onDelete={u => setDeleteUser(u)} />
            ))}
          </View>
        )}

        <Pagination total={users.length} />

        {/* Footer */}
        <View style={styles.webFooter}>
          <Text style={styles.webFooterText}>
            2026 © Flintnthread India Pvt. Ltd. Crafted by{" "}
            <Text style={{ color: C.orange, fontWeight: "700" }}>Flintnthread India Pvt. Ltd.</Text>
          </Text>
        </View>
      </ScrollView>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
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
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Avatar ──
  avatar:     { justifyContent: "center", alignItems: "center" },
  avatarText: { color: C.white, fontWeight: "700" },

  // ── Badges ──
  roleBadge:     { alignSelf: "flex-start", borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  roleBadgeText: { fontSize: 11, fontWeight: "600" },
  statusBadge:   { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" },
  statusText:    { fontSize: 11, fontWeight: "600" },

  // ── Mobile Top Bar ──
  topBar: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: C.navy,
  },
  topBarTitle:  { color: C.orange, fontSize: 20, fontWeight: "700" },
  topBarIcons:  { flexDirection: "row", alignItems: "center", gap: 14 },
  topBarAdd:    { backgroundColor: C.orange, borderRadius: 10, padding: 8, justifyContent: "center", alignItems: "center" },
  avatarSmall:  { width: 36, height: 36, borderRadius: 18, backgroundColor: C.orange, justifyContent: "center", alignItems: "center" },
  avatarSmallText: { color: C.white, fontWeight: "700", fontSize: 13 },
  notifBadge:   { position: "absolute", top: -4, right: -4, backgroundColor: C.orange, borderRadius: 8, width: 16, height: 16, justifyContent: "center", alignItems: "center" },
  notifBadgeText: { color: C.white, fontSize: 10, fontWeight: "700" },

  // ── Stats Card (mobile) ──
  statsCard: {
    backgroundColor: C.white, borderRadius: 14, padding: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 16,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  statsIcon:  { backgroundColor: C.orangeLight, borderRadius: 12, padding: 10 },
  statsLabel: { color: C.subtext, fontSize: 13 },
  statsCount: { color: C.orange, fontSize: 22, fontWeight: "800" },

  // ── Add Button ──
  addBtn:     { backgroundColor: C.orange, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10 },
  addBtnText: { color: C.white, fontWeight: "700", fontSize: 14 },

  // ── Sort ──
  sortRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: C.white, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  sortLabel:    { color: C.subtext, fontSize: 14 },
  sortBox:      { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, minWidth: 140 },
  sortBoxText:  { color: C.text, fontSize: 14, flex: 1 },
  sortDropdown: { position: "absolute", top: 38, right: 0, backgroundColor: C.white, borderRadius: 8, borderWidth: 1, borderColor: C.border, zIndex: 99, minWidth: 140, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  sortItem:     { paddingHorizontal: 14, paddingVertical: 10 },
  sortItemText: { fontSize: 14, color: C.text },

  // ── Mobile Card ──
  card:     { backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardRow:  { flexDirection: "row", alignItems: "flex-start" },
  userName: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 2 },
  userSub:  { fontSize: 12, color: C.subtext, marginBottom: 2 },
  timeRow:  { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  timeText: { fontSize: 11, color: C.subtext },

  // ── Action buttons ──
  editBtn:   { backgroundColor: C.navy, borderRadius: 8, padding: 8, justifyContent: "center", alignItems: "center" },
  deleteBtn: { backgroundColor: C.red,  borderRadius: 8, padding: 8, justifyContent: "center", alignItems: "center" },

  // ── Pagination ──
  pagination:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 },
  paginationText: { color: C.subtext, fontSize: 13 },
  pageBtn:        { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: C.border, justifyContent: "center", alignItems: "center" },
  pageActive:     { width: 32, height: 32, borderRadius: 8, backgroundColor: C.orange, justifyContent: "center", alignItems: "center" },
  pageActiveText: { color: C.white, fontWeight: "700", fontSize: 14 },

  // ── Bottom Nav (mobile) ──
  bottomNav:    { flexDirection: "row", backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border, paddingBottom: Platform.OS === "ios" ? 20 : 6, paddingTop: 8, position: "absolute", bottom: 0, left: 0, right: 0 },
  navTab:       { flex: 1, alignItems: "center", gap: 3 },
  navTabLabel:  { fontSize: 11, color: C.subtext },

  // ── Modal ──
  overlay:      { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 16 },
  modalCard:    { backgroundColor: C.white, borderRadius: 14, width: "100%", maxWidth: 460, maxHeight: "90%", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20, elevation: 10, overflow: "visible" },
  modalHeader:  { backgroundColor: C.orange, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16 },
  modalTitle:   { color: C.white, fontSize: 17, fontWeight: "700" },
  modalFooter:  { flexDirection: "row", gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: C.border, justifyContent: "flex-end" },
  cancelBtn:    { backgroundColor: "#374151", borderRadius: 9, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10 },
  cancelBtnText:{ color: C.white, fontWeight: "600", fontSize: 14 },
  submitBtn:    { backgroundColor: C.orange, borderRadius: 9, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 18, paddingVertical: 10 },
  submitBtnText:{ color: C.white, fontWeight: "700", fontSize: 14 },

  // ── Form ──
  label:      { color: C.text, fontWeight: "600", fontSize: 14, marginBottom: 6 },
  input:      { backgroundColor: C.inputBg, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: C.text, borderWidth: 1, borderColor: C.border },
  selectBox:  { backgroundColor: C.inputBg, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: C.border },
  selectBoxActive: { borderColor: C.orange, borderWidth: 2 },
  selectText: { flex: 1, fontSize: 14, color: C.text },
  dropdown:   { position: "absolute", top: "100%", left: 0, right: 0, width: "100%", backgroundColor: C.white, borderRadius: 8, borderWidth: 1, borderColor: C.border, maxHeight: 280, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8 },
  dropdownItem:{ paddingHorizontal: 14, paddingVertical: 10 },
  dropdownItemBorder:{ borderBottomWidth: 1, borderBottomColor: C.border },
  dropdownItemHovered:{ backgroundColor: "#2563eb" },
  dropdownItemSelected:{ backgroundColor: "#2563eb" },
  dropdownText:{ fontSize: 14, color: C.text },
  dropdownTextSelected:{ color: C.white, fontWeight: "700" },

  // ── Web Top Bar ──
  webTopBar: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28, paddingVertical: 12,
    backgroundColor: C.white,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  webLogo:        { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  webLogoBox:     { width: 40, height: 40, borderRadius: 8, backgroundColor: C.orange, justifyContent: "center", alignItems: "center" },
  webLogoBoxText: { color: C.white, fontWeight: "900", fontSize: 13 },
  webLogoName:    { color: C.text, fontWeight: "800", fontSize: 11 },
  webLogoTagline: { color: C.subtext, fontSize: 9 },
  webSearch:      { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.bg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, marginHorizontal: 28, borderWidth: 1, borderColor: C.border },
  webSearchInput: { flex: 1, fontSize: 13, color: C.text },
  webTopBarRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconCircle:     { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: C.border, justifyContent: "center", alignItems: "center" },

  // ── Web Page Header ──
  webPageHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 28, paddingVertical: 20,
    backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  webPageTitle: { fontSize: 22, fontWeight: "800", color: C.text },
  breadcrumb:   { fontSize: 12, color: C.subtext },

  // ── Web Stats Row ──
  webStatsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  webTotalBadge:{ backgroundColor: C.white, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10, borderWidth: 1, borderColor: C.border },
  webTotalText: { color: C.subtext, fontSize: 14 },
  webTotalCount:{ color: C.orange, fontWeight: "800", fontSize: 16 },

  // ── View Toggle ──
  viewToggle:          { flexDirection: "row", borderWidth: 1, borderColor: C.border, borderRadius: 8, overflow: "hidden" },
  viewToggleBtn:       { padding: 8, backgroundColor: C.white },
  viewToggleBtnActive: { backgroundColor: C.navy },

  // ── Table ──
  tableContainer: { backgroundColor: C.white, borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: "hidden", marginBottom: 20 },
  tableHeader:    { backgroundColor: C.tableHeaderBg },
  tableRow:       { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  tableCell:      { paddingRight: 8 },
  tableHeadCell:  { paddingRight: 8, fontSize: 12, fontWeight: "700", color: C.subtext, textTransform: "uppercase", letterSpacing: 0.5 },

  // ── Grid ──
  gridContainer: { flexDirection: "row", flexWrap: "wrap", gap: 20, marginBottom: 20 },
  gridCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    overflow: "hidden",
    width: 270,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  gridBanner:       { height: 110, justifyContent: "flex-end", alignItems: "center", paddingBottom: 0 },
  gridAvatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.9)", justifyContent: "center", alignItems: "center", marginBottom: -36, borderWidth: 3, borderColor: C.white },
  gridAvatarText:   { fontSize: 24, fontWeight: "800", color: C.navy },
  gridBody:         { paddingHorizontal: 16, paddingTop: 44, paddingBottom: 16 },
  gridName:         { fontSize: 16, fontWeight: "800", color: C.text, textAlign: "center", marginBottom: 10 },
  gridInfoRow:      { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  gridInfoText:     { fontSize: 12, color: C.subtext, flex: 1 },
  gridBadgeRow:     { flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 8, marginBottom: 6 },
  gridTimeRow:      { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 12 },
  gridTimeText:     { fontSize: 11, color: C.subtext },
  gridActions:      { flexDirection: "row", gap: 8 },
  gridActionBtn:    { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 8, paddingVertical: 8 },
  gridActionText:   { color: C.white, fontSize: 13, fontWeight: "600" },

  // ── Web Footer ──
  webFooter:     { paddingTop: 24, paddingBottom: 8, alignItems: "center" },
  webFooterText: { fontSize: 13, color: C.subtext },
});