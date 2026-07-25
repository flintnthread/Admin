/**
 * adsadminusers.tsx
 * -----------------------------------------------------------------------
 * Ads Admin Users screen — sidebar & top navbar removed, fully responsive
 * (phones 320/375/425, tablet 768, laptop 1024/1440, desktop 2560) and
 * fully working Add / Edit / Delete flows.
 *
 * Install before use:
 *   npm install react-native-bootstrap-icons
 *   npm install @react-native-picker/picker
 *
 * react-native-bootstrap-icons exposes every Bootstrap Icon as its own
 * named component, e.g. <PersonFill />, <PlusLg />, <PencilFill /> etc.
 * If that package isn't available in your setup, swap the icon imports
 * for `react-native-vector-icons` (Feather/Ionicons) — every icon is used
 * through the small <Ico /> wrapper below, so only one block needs to change.
 * -----------------------------------------------------------------------
 */

import AdminLayout from '@/components/admin-layout';
import { getApiErrorMessage } from '@/lib/api/client';
import { sweetCrud, sweetError, sweetWarning } from '@/lib/sweetAlert';
import {
    createAdsAdminUser,
    deleteAdsAdminUser,
    fetchAdsAdminUsers,
    toApiStatus,
    toUiStatus,
    updateAdsAdminUser,
    type AdsApiRow,
} from '@/services/adsApi';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    FlatList,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';

import Pagination from '@/components/Pagination';
import CalendarWeek from 'react-native-bootstrap-icons/icons/calendar-week';
import PeopleFill from 'react-native-bootstrap-icons/icons/people-fill';
import PersonCheckFill from 'react-native-bootstrap-icons/icons/person-check-fill';
import PersonXFill from 'react-native-bootstrap-icons/icons/person-x-fill';
import PlusLg from 'react-native-bootstrap-icons/icons/plus-lg';
import Search from 'react-native-bootstrap-icons/icons/search';

// ---------------------------------------------------------------------------
// Types & seed data
// ---------------------------------------------------------------------------
type Role = 'Admin' | 'Manager' | 'Viewer';
type Status = 'Active' | 'Inactive';

interface AdsUser {
    id: number;
    fullName: string;
    username: string;
    email: string;
    role: Role;
    status: Status;
    lastLogin: string;
}

function toUiRole(role?: unknown): Role {
    const normalized = String(role ?? '').toLowerCase();
    if (normalized === 'manager') return 'Manager';
    if (normalized === 'viewer') return 'Viewer';
    return 'Admin';
}

function toApiRole(role: Role): string {
    return role.toLowerCase();
}

function formatLastLogin(value?: unknown): string {
    if (value == null || value === '') return 'Never';
    const d = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(d.getTime())) return 'Never';
    return d.toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function mapAdsUserFromApi(row: AdsApiRow): AdsUser {
    return {
        id: Number(row.id),
        fullName: String(row.fullName ?? row.full_name ?? ''),
        username: String(row.username ?? ''),
        email: String(row.email ?? ''),
        role: toUiRole(row.role),
        status: toUiStatus(row.status),
        lastLogin: formatLastLogin(row.lastLogin ?? row.last_login),
    };
}

const ROLES: Role[] = ['Admin', 'Manager', 'Viewer'];
const STATUSES: Status[] = ['Active', 'Inactive'];
const PAGE_SIZE = 5;

// Brand palette (matches the reference dashboard)
const COLORS = {
    orange: '#F5821F',
    orangeDark: '#DD6F10',
    navy: '#151D4F',
    ink: '#1F2937',
    sub: '#6B7280',
    border: '#E5E7EB',
    bg: '#F3F4F6',
    card: '#FFFFFF',
    blueBg: '#EAF2FF', blueText: '#2563EB',
    greenBg: '#E9FBF0', greenText: '#16A34A',
    orangeBg: '#FFF1E6', orangeText: '#EA580C',
    purpleBg: '#F2EBFF', purpleText: '#7C3AED',
    danger: '#E11D48',
};

// ---------------------------------------------------------------------------
// Responsive breakpoint helper
// ---------------------------------------------------------------------------
type Bp = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

function getBreakpoint(width: number): Bp {
    if (width < 360) return 'xs';   // ~320
    if (width < 400) return 'sm';   // ~375
    if (width < 768) return 'md';   // ~425 falls here too (phone)
    if (width < 1024) return 'lg';  // ~768 tablet
    if (width < 1440) return 'xl';  // ~1024 laptop
    return 'xxl';                   // ~1440 / 2560
}

// ---------------------------------------------------------------------------
// Small reusable pieces
// ---------------------------------------------------------------------------
const StatCard: React.FC<{
    label: string; value: number; sub: string;
    bg: string; fg: string; Icon: React.ComponentType<any>; wide: boolean;
    style?: any;
    isMobile?: boolean;
}> = ({ label, value, sub, bg, fg, Icon, wide, style, isMobile }) => (
    <View style={[
        styles.statCard,
        isMobile ? styles.statCardMobile : styles.statCardDesktop,
        !isMobile && { width: wide ? '23.5%' : '48%' },
        style
    ]}>
        {isMobile ? (
            <>
                <View style={[styles.statIconWrap, styles.statIconWrapMobile, { backgroundColor: bg }]}>
                    <Icon width={14} height={14} fill={fg} />
                </View>
                <Text style={[styles.statValue, styles.statValueMobile, { color: fg }]}>{value}</Text>
                <Text style={styles.statLabelMobile} numberOfLines={1}>{label}</Text>
            </>
        ) : (
            <>
                <View style={styles.statCardTopRow}>
                    <View style={[styles.statIconWrap, { backgroundColor: bg }]}>
                        <Icon width={16} height={16} fill={fg} />
                    </View>
                    <Text style={[styles.statValue, { color: fg }]}>{value}</Text>
                </View>
                <Text style={styles.statLabel}>{label}</Text>
                <Text style={styles.statSub}>{sub}</Text>
            </>
        )}
    </View>
);

const Pill: React.FC<{ text: string; bg: string; fg: string }> = ({ text, bg, fg }) => (
    <View style={[styles.pill, { backgroundColor: bg }]}>
        <Text style={[styles.pillText, { color: fg }]}>{text}</Text>
    </View>
);

const roleColors = (role: Role) => {
    if (role === 'Admin') return { bg: COLORS.blueBg, fg: COLORS.blueText };
    if (role === 'Manager') return { bg: COLORS.purpleBg, fg: COLORS.purpleText };
    return { bg: COLORS.orangeBg, fg: COLORS.orangeText }; // Viewer
};
const statusColors = (status: Status) =>
    status === 'Active'
        ? { bg: COLORS.greenBg, fg: COLORS.greenText }
        : { bg: '#FDE8EC', fg: COLORS.danger };

// Grid and List view icons (matching orders.tsx)
const GridIcon = ({ active }: { active: boolean }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Rect
      x="3"
      y="3"
      width="7"
      height="7"
      rx="1"
      stroke={active ? '#fff' : COLORS.ink}
      strokeWidth={2}
    />
    <Rect
      x="14"
      y="3"
      width="7"
      height="7"
      rx="1"
      stroke={active ? '#fff' : COLORS.ink}
      strokeWidth={2}
    />
    <Rect
      x="3"
      y="14"
      width="7"
      height="7"
      rx="1"
      stroke={active ? '#fff' : COLORS.ink}
      strokeWidth={2}
    />
    <Rect
      x="14"
      y="14"
      width="7"
      height="7"
      rx="1"
      stroke={active ? '#fff' : COLORS.ink}
      strokeWidth={2}
    />
  </Svg>
);

const ListIcon = ({ active }: { active: boolean }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Line
      x1="8"
      y1="6"
      x2="21"
      y2="6"
      stroke={active ? '#fff' : COLORS.ink}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Line
      x1="8"
      y1="12"
      x2="21"
      y2="12"
      stroke={active ? '#fff' : COLORS.ink}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Line
      x1="8"
      y1="18"
      x2="21"
      y2="18"
      stroke={active ? '#fff' : COLORS.ink}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Line
      x1="3"
      y1="6"
      x2="3.01"
      y2="6"
      stroke={active ? '#fff' : COLORS.ink}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Line
      x1="3"
      y1="12"
      x2="3.01"
      y2="12"
      stroke={active ? '#fff' : COLORS.ink}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Line
      x1="3"
      y1="18"
      x2="3.01"
      y2="18"
      stroke={active ? '#fff' : COLORS.ink}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

// ---------------------------------------------------------------------------
// Grid view card component (supports hover overlay and responsive layout)
// ---------------------------------------------------------------------------
const UserGridCard: React.FC<{
    item: AdsUser;
    onEdit: () => void;
    onDelete: () => void;
    cardWidth: string | number;
    isMobile: boolean;
}> = ({ item, onEdit, onDelete, cardWidth, isMobile }) => {
    const rc = roleColors(item.role);
    const sc = statusColors(item.status);

    return (
        <Pressable
            style={[
                styles.gridCard,
                { width: cardWidth }
            ]}
        >
            {/* Top Banner in #151D4F */}
            <View style={styles.gridCardHeader}>
                <View style={styles.gridCardAvatar}>
                    <Text style={styles.gridCardAvatarText}>{item.fullName.charAt(0)}</Text>
                </View>
            </View>

            {/* Bottom Card Body */}
            <View style={styles.gridCardBody}>
                {/* Name & Badges */}
                <View style={styles.gridCardInfoRow}>
                    <Text style={styles.gridCardName} numberOfLines={1}>
                        {item.fullName}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                        <Pill text={item.role} bg={rc.bg} fg={rc.fg} />
                        <Pill text={item.status} bg={sc.bg} fg={sc.fg} />
                    </View>
                </View>

                {/* Email info */}
                <Text style={styles.gridCardSubText} numberOfLines={1}>
                    @{item.username} • {item.email}
                </Text>

                {/* Last Login info */}
                <Text style={styles.gridCardSubText} numberOfLines={1}>
                    Last Login: {item.lastLogin}
                </Text>

                {/* Actions */}
                <View style={styles.gridActions}>
                    <TouchableOpacity style={[styles.gridActionBtn, { backgroundColor: '#1d324e' }]} onPress={onEdit}>
                        <Ionicons name="create-outline" size={15} color="#fff" />
                        <Text style={styles.gridActionText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.gridActionBtn, { backgroundColor: '#dc2626' }]} onPress={onDelete}>
                        <Ionicons name="trash-outline" size={15} color="#fff" />
                        <Text style={styles.gridActionText}>Delete</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Pressable>
    );
};

// ---------------------------------------------------------------------------
// Delete Modal
// ---------------------------------------------------------------------------
const DeleteModal: React.FC<{
    visible: boolean;
    user: AdsUser | null;
    onClose: () => void;
    onConfirm: () => void;
}> = ({ visible, user, onClose, onConfirm }) => {
    if (!visible || !user) return null;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
                <View style={[styles.modalCard, { maxWidth: 380 }]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalHeaderText}>Confirm Delete</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="close-outline" size={22} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <View style={{ padding: 28, alignItems: "center" }}>
                        <View style={styles.deleteIconCircle}>
                            <Ionicons name="trash" size={36} color="#dc2626" />
                        </View>
                        <Text style={styles.deleteTitle}>Are you sure?</Text>
                        <Text style={styles.deleteSubtitle}>You won't be able to revert this action.</Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                                <Ionicons name="close-outline" size={15} color="#fff" />
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.deleteConfirmBtn} onPress={onConfirm}>
                                <Ionicons name="trash-outline" size={15} color="#fff" />
                                <Text style={styles.submitBtnText}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// ---------------------------------------------------------------------------
// Add / Edit User Modal
// ---------------------------------------------------------------------------
interface UserFormState {
    fullName: string;
    username: string;
    email: string;
    password: string;
    role: Role;
    status: Status;
}
const emptyForm: UserFormState = {
    fullName: '', username: '', email: '', password: '', role: 'Admin', status: 'Active',
};

const UserFormModal: React.FC<{
    visible: boolean;
    isEdit: boolean;
    initial: UserFormState;
    saving?: boolean;
    onCancel: () => void;
    onSubmit: (form: UserFormState) => void | Promise<void>;
}> = ({ visible, isEdit, initial, saving = false, onCancel, onSubmit }) => {
    const [form, setForm] = useState<UserFormState>(initial);
    const { width } = useWindowDimensions();
    const isPhone = getBreakpoint(width) === 'xs' || getBreakpoint(width) === 'sm' || getBreakpoint(width) === 'md';
    // Picker is unreliable on react-native-web; always use dropdown on web.
    const useDropdown = isPhone || Platform.OS === 'web';

    React.useEffect(() => {
        if (visible) setForm(initial);
        // Only reseat form when modal opens / switches add↔edit (not on every parent re-render).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, isEdit, initial.fullName, initial.username, initial.email, initial.role, initial.status]);

    const update = (key: keyof UserFormState, val: string) =>
        setForm((f) => ({ ...f, [key]: val }));

    const handleSubmit = () => {
        if (saving) return;
        if (!form.fullName.trim() || !form.username.trim() || !form.email.trim()) {
            void sweetWarning('Missing information', 'Please fill in full name, username and email.');
            return;
        }
        const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
        if (!emailOk) {
            void sweetWarning('Invalid email', 'Please enter a valid email address.');
            return;
        }
        if (!isEdit && form.password.trim().length < 6) {
            void sweetWarning('Missing information', 'Please enter a password of at least 6 characters.');
            return;
        }
        void onSubmit({
            ...form,
            fullName: form.fullName.trim(),
            username: form.username.trim(),
            email: form.email.trim(),
            password: form.password,
        });
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalHeaderText}>{isEdit ? 'Edit User' : 'Add New User'}</Text>
                        <TouchableOpacity onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} disabled={saving}>
                            <Ionicons name="close-outline" size={22} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            value={form.fullName}
                            onChangeText={(t) => update('fullName', t)}
                            placeholder="e.g. Priya Reddy"
                            placeholderTextColor="#9CA3AF"
                            editable={!saving}
                        />

                        <Text style={styles.label}>Username</Text>
                        <TextInput
                            style={styles.input}
                            value={form.username}
                            onChangeText={(t) => update('username', t)}
                            placeholder="e.g. priya.admin"
                            placeholderTextColor="#9CA3AF"
                            autoCapitalize="none"
                            autoComplete="username"
                            editable={!saving}
                        />

                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            value={form.email}
                            onChangeText={(t) => update('email', t)}
                            placeholder="name@example.com"
                            placeholderTextColor="#9CA3AF"
                            autoCapitalize="none"
                            keyboardType="email-address"
                            autoComplete="email"
                            editable={!saving}
                        />

                        <Text style={styles.label}>Password{isEdit ? ' (optional)' : ''}</Text>
                        <TextInput
                            style={styles.input}
                            value={form.password}
                            onChangeText={(t) => update('password', t)}
                            placeholder={isEdit ? 'Leave blank to keep current password' : 'Min. 6 characters'}
                            placeholderTextColor="#9CA3AF"
                            secureTextEntry
                            autoComplete="new-password"
                            editable={!saving}
                        />

                        <Text style={styles.label}>Role</Text>
                        {useDropdown ? (
                            <CustomDropdown
                                label="Select Role"
                                value={form.role}
                                options={ROLES as unknown as string[]}
                                onValueChange={(v) => update('role', v)}
                            />
                        ) : (
                            <View style={styles.pickerWrap}>
                                <Picker
                                    selectedValue={form.role}
                                    onValueChange={(v) => update('role', v as string)}
                                    style={styles.picker}
                                >
                                    {ROLES.map((r) => (
                                        <Picker.Item key={r} label={r} value={r} />
                                    ))}
                                </Picker>
                            </View>
                        )}

                        <Text style={styles.label}>Status</Text>
                        {useDropdown ? (
                            <CustomDropdown
                                label="Select Status"
                                value={form.status}
                                options={STATUSES as unknown as string[]}
                                onValueChange={(v) => update('status', v)}
                            />
                        ) : (
                            <View style={styles.pickerWrap}>
                                <Picker
                                    selectedValue={form.status}
                                    onValueChange={(v) => update('status', v as string)}
                                    style={styles.picker}
                                >
                                    {STATUSES.map((s) => (
                                        <Picker.Item key={s} label={s} value={s} />
                                    ))}
                                </Picker>
                            </View>
                        )}
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={saving}>
                                <Ionicons name="close-outline" size={15} color="#fff" />
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.submitBtn, saving && { opacity: 0.7 }]}
                                onPress={handleSubmit}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Ionicons name="save-outline" size={15} color="#fff" />
                                )}
                                <Text style={styles.submitBtnText}>{isEdit ? 'Save Changes' : 'Add User'}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

// ---------------------------------------------------------------------------
// Custom Dropdown Component for Mobile
// ---------------------------------------------------------------------------
const CustomDropdown: React.FC<{
    label: string;
    value: string;
    options: string[];
    onValueChange: (val: string) => void;
}> = ({ label, value, options, onValueChange }) => {
    const [open, setOpen] = React.useState(false);

    return (
        <View style={{ zIndex: open ? 1000 : 1, position: 'relative', flex: 1 }}>
            <TouchableOpacity
                style={[
                    styles.customDropdownTrigger,
                    open && { borderColor: COLORS.orange }
                ]}
                onPress={() => setOpen(!open)}
            >
                <Text style={styles.customDropdownTriggerText} numberOfLines={1}>
                    {value === 'All' ? label : value}
                </Text>
                <Ionicons name={open ? "chevron-up" : "chevron-down"} size={14} color={COLORS.sub} />
            </TouchableOpacity>

            {open && (
                <View style={styles.customDropdownMenu}>
                    {options.map((opt) => {
                        const isSelected = opt === value;
                        return (
                            <TouchableOpacity
                                key={opt}
                                style={[
                                    styles.customDropdownItem,
                                    isSelected && { backgroundColor: '#2563EB' }
                                ]}
                                onPress={() => {
                                    onValueChange(opt);
                                    setOpen(false);
                                }}
                            >
                                <Text style={[
                                    styles.customDropdownItemText,
                                    isSelected && { color: '#fff', fontWeight: '700' }
                                ]}>
                                    {opt === 'All' ? label : opt}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}
        </View>
    );
};

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
const AdsAdminUsers: React.FC = () => {
    const { width } = useWindowDimensions();
    const bp = getBreakpoint(width);
    const isPhone = bp === 'xs' || bp === 'sm' || bp === 'md';
    const isTablet = bp === 'lg';
    const isWide = bp === 'xl' || bp === 'xxl';
    const statsWide = !isPhone; // 4-across from tablet upward, 2x2 on phones

    const [users, setUsers] = useState<AdsUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<'All' | Role>('All');
    const [statusFilter, setStatusFilter] = useState<'All' | Status>('All');
    const [view, setView] = useState<'grid' | 'list'>('list');
    const [page, setPage] = useState(1);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const rows = await fetchAdsAdminUsers();
            setUsers(rows.map(mapAdsUserFromApi));
        } catch (err) {
            setLoadError(getApiErrorMessage(err, 'Failed to load ads admin users.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadUsers();
    }, [loadUsers]);

    const [modalVisible, setModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState<AdsUser | null>(null);

    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [deletingUser, setDeletingUser] = useState<AdsUser | null>(null);

    // ---- Toast notification ------------------------------------------------
    const [toastMessage, setToastMessage] = useState('');
    const [toastVisible, setToastVisible] = useState(false);
    const toastSlide = React.useRef(new Animated.Value(400)).current;

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setToastVisible(true);
        toastSlide.setValue(400);
        Animated.timing(toastSlide, {
            toValue: 0,
            duration: 380,
            useNativeDriver: true,
        }).start();
        setTimeout(() => {
            Animated.timing(toastSlide, {
                toValue: 400,
                duration: 320,
                useNativeDriver: true,
            }).start(() => setToastVisible(false));
        }, 3000);
    };

    const filtered = useMemo(() => {
        return users
            .filter((u) => {
                const q = search.trim().toLowerCase();
                const matchesSearch =
                    !q ||
                    u.fullName.toLowerCase().includes(q) ||
                    u.username.toLowerCase().includes(q) ||
                    u.email.toLowerCase().includes(q);
                const matchesRole = roleFilter === 'All' || u.role === roleFilter;
                const matchesStatus = statusFilter === 'All' || u.status === statusFilter;
                return matchesSearch && matchesRole && matchesStatus;
            })
            .sort((a, b) => b.id - a.id);
    }, [users, search, roleFilter, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const stats = useMemo(() => {
        const total = users.length;
        const active = users.filter((u) => u.status === 'Active').length;
        const inactive = users.filter((u) => u.status === 'Inactive').length;
        const recentLogins = users.filter((u) => u.lastLogin !== 'Never').length;
        return { total, active, inactive, recentLogins };
    }, [users]);

    // ---- CRUD handlers -------------------------------------------------
    const openAddModal = () => {
        setEditingUser(null);
        setModalVisible(true);
    };
    const openEditModal = (user: AdsUser) => {
        setEditingUser(user);
        setModalVisible(true);
    };
    const closeModal = () => {
        if (saving) return;
        setModalVisible(false);
        setEditingUser(null);
    };

    const handleSubmitForm = async (form: UserFormState) => {
        const body: AdsApiRow = {
            fullName: form.fullName.trim(),
            username: form.username.trim(),
            email: form.email.trim().toLowerCase(),
            role: toApiRole(form.role),
            status: toApiStatus(form.status),
        };

        setSaving(true);
        try {
            if (editingUser) {
                if (form.password.trim()) {
                    body.password = form.password;
                }
                await updateAdsAdminUser(editingUser.id, body);
                void sweetCrud.updated('Ads admin user');
            } else {
                const password = form.password.trim();
                if (password.length < 6) {
                    void sweetWarning('Missing information', 'Please enter a password of at least 6 characters.');
                    return;
                }
                await createAdsAdminUser({ ...body, password });
                void sweetCrud.added('Ads admin user');
                setPage(1);
                setSearch('');
                setRoleFilter('All');
                setStatusFilter('All');
            }
            setModalVisible(false);
            setEditingUser(null);
            await loadUsers();
        } catch (err) {
            void sweetError('Error', getApiErrorMessage(err, editingUser ? 'Could not update user.' : 'Could not add user.'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (user: AdsUser) => {
        setDeletingUser(user);
        setDeleteModalVisible(true);
    };

    const confirmDelete = async () => {
        if (!deletingUser) return;
        setSaving(true);
        try {
            await deleteAdsAdminUser(deletingUser.id);
            setDeleteModalVisible(false);
            setDeletingUser(null);
            void sweetCrud.deleted('Ads admin user');
            await loadUsers();
        } catch (err) {
            void sweetError('Error', getApiErrorMessage(err, 'Could not delete user.'));
        } finally {
            setSaving(false);
        }
    };

    const closeDeleteModal = () => {
        setDeleteModalVisible(false);
        setDeletingUser(null);
    };

    const formInitial: UserFormState = useMemo(
        () =>
            editingUser
                ? {
                    fullName: editingUser.fullName,
                    username: editingUser.username,
                    email: editingUser.email,
                    password: '',
                    role: editingUser.role,
                    status: editingUser.status,
                }
                : emptyForm,
        [editingUser]
    );

    // ---- Row / card renderers ------------------------------------------
    const renderTableRow = ({ item }: { item: AdsUser }) => {
        const rc = roleColors(item.role);
        const sc = statusColors(item.status);
        return (
            <View style={styles.tableRow}>
                <Text style={[styles.cell, styles.colId]}>{item.id}</Text>
                <View style={[styles.colName, { flexDirection: 'row', alignItems: 'center' }]}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{item.fullName.charAt(0)}</Text>
                    </View>
                    <Text style={styles.cellNameText} numberOfLines={1}>{item.fullName}</Text>
                </View>
                <Text style={[styles.cell, styles.colUsername]} numberOfLines={1}>{item.username}</Text>
                <Text style={[styles.cell, styles.colEmail, { color: COLORS.sub }]} numberOfLines={1}>{item.email}</Text>
                <View style={[styles.colRole]}>
                    <Pill text={item.role} bg={rc.bg} fg={rc.fg} />
                </View>
                <View style={[styles.colStatus]}>
                    <Pill text={item.status} bg={sc.bg} fg={sc.fg} />
                </View>
                <Text style={[styles.cell, styles.colLastLogin, { color: COLORS.sub, fontSize: 12 }]}>{item.lastLogin}</Text>
                <View style={[styles.colAction, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
                        <Ionicons name="create-outline" size={14} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                        <Ionicons name="trash-outline" size={14} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const useCardLayout = isPhone || view === 'grid';
    const cardWidth = isPhone ? '100%' : isTablet ? '48%' : '31.5%';

    return (
        <AdminLayout>
            <View style={styles.screen}>
                <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
                    {/* ---------- Header ---------- */}
                    <View style={[styles.headerContainer, isPhone && styles.headerContainerMobile]}>
                        <View style={[styles.headerRow, isPhone && { gap: 10 }]}>
                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: isPhone ? 8 : 12, marginRight: 8 }}>
                                <View style={styles.heroIconBadge}>
                                    <PeopleFill width={isPhone ? 16 : 20} height={isPhone ? 16 : 20} fill="#fff" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.heroTitle, isPhone && styles.heroTitleMobile]} numberOfLines={1}>Ads Admin Users</Text>
                                    <Text style={styles.heroSubtitle} numberOfLines={2}>Manage users and roles</Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.addBtn, isPhone && { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }]}
                                onPress={openAddModal}
                                accessibilityRole="button"
                                accessibilityLabel="Add New User"
                            >
                                <PlusLg width={14} height={14} fill="#fff" />
                                {!isPhone && <Text style={styles.addBtnText}>Add New User</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* ---------- Stat cards ---------- */}
                    <View style={[
                        styles.statsRow,
                        isPhone ? styles.statsRowMobile : styles.statsRowDesktop
                    ]}>
                        <StatCard isMobile={isPhone} label={isPhone ? "Total" : "Total Users"} value={stats.total} sub="All registered users" bg={COLORS.blueBg} fg={COLORS.blueText} Icon={PeopleFill} wide={statsWide} />
                        <StatCard isMobile={isPhone} label={isPhone ? "Active" : "Active Users"} value={stats.active} sub="Currently active users" bg={COLORS.greenBg} fg={COLORS.greenText} Icon={PersonCheckFill} wide={statsWide} />
                        <StatCard isMobile={isPhone} label={isPhone ? "Inactive" : "Inactive Users"} value={stats.inactive} sub="Currently inactive users" bg={COLORS.orangeBg} fg={COLORS.orangeText} Icon={PersonXFill} wide={statsWide} />
                        <StatCard isMobile={isPhone} label={isPhone ? "Recent" : "Recent Logins"} value={stats.recentLogins} sub="Users logged in" bg={COLORS.purpleBg} fg={COLORS.purpleText} Icon={CalendarWeek} wide={statsWide} />
                    </View>

                    {/* ---------- Toolbar ---------- */}
                    <View style={styles.toolbarCard}>
                        <View style={[styles.searchBox, isPhone && { width: '100%', borderRadius: 10, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 }]}>
                            <Search width={15} height={15} fill={COLORS.sub} />
                            <TextInput
                                style={[styles.searchInput, isPhone && { color: COLORS.ink, fontSize: 13 }]}
                                placeholder="Search users..."
                                placeholderTextColor="#9CA3AF"
                                value={search}
                                onChangeText={(t) => { setSearch(t); setPage(1); }}
                                autoComplete="off"
                                autoCorrect={false}
                                spellCheck={false}
                            />
                        </View>

                        <View style={[styles.filterRow, isPhone && { width: '100%', marginTop: 2 }]}>
                            {isPhone ? (
                                <>
                                    <CustomDropdown
                                        label="All Roles"
                                        value={roleFilter}
                                        options={['All', ...ROLES]}
                                        onValueChange={(v) => { setRoleFilter(v as any); setPage(1); }}
                                    />
                                    <CustomDropdown
                                        label="All Status"
                                        value={statusFilter}
                                        options={['All', ...STATUSES]}
                                        onValueChange={(v) => { setStatusFilter(v as any); setPage(1); }}
                                    />
                                </>
                            ) : (
                                <>
                                    <View style={styles.selectWrap}>
                                        <Picker
                                            selectedValue={roleFilter}
                                            onValueChange={(v) => { setRoleFilter(v as any); setPage(1); }}
                                            style={styles.selectPicker}
                                        >
                                            <Picker.Item label="All Roles" value="All" />
                                            {ROLES.map((r) => (
                                                <Picker.Item key={r} label={r} value={r} />
                                            ))}
                                        </Picker>
                                    </View>
                                    <View style={styles.selectWrap}>
                                        <Picker
                                            selectedValue={statusFilter}
                                            onValueChange={(v) => { setStatusFilter(v as any); setPage(1); }}
                                            style={styles.selectPicker}
                                        >
                                            <Picker.Item label="All Status" value="All" />
                                            {STATUSES.map((s) => (
                                                <Picker.Item key={s} label={s} value={s} />
                                            ))}
                                        </Picker>
                                    </View>
                                </>
                            )}
                            {!isPhone && (
                                <View style={styles.viewToggle}>
                                    <TouchableOpacity
                                        style={[styles.viewToggleBtn, view === 'grid' && styles.viewToggleBtnActive]}
                                        onPress={() => setView('grid')}
                                    >
                                        <GridIcon active={view === 'grid'} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.viewToggleBtn, view === 'list' && styles.viewToggleBtnActive]}
                                        onPress={() => setView('list')}
                                    >
                                        <ListIcon active={view === 'list'} />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* ---------- Data (table on wide screens, cards on phones / grid view) ---------- */}
                    {loadError ? (
                        <Text style={{ color: COLORS.danger, marginBottom: 12 }}>{loadError}</Text>
                    ) : null}
                    {loading ? (
                        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                            <ActivityIndicator size="large" color={COLORS.orange} />
                        </View>
                    ) : useCardLayout ? (
                        filtered.length === 0 ? (
                            <View style={styles.dataCard}>
                                <Text style={styles.emptyText}>No users match your filters.</Text>
                            </View>
                        ) : (
                            <View style={{ width: '100%' }}>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                                    {pageData.map((item) => (
                                        <UserGridCard
                                            key={item.id}
                                            item={item}
                                            onEdit={() => openEditModal(item)}
                                            onDelete={() => handleDelete(item)}
                                            cardWidth={cardWidth}
                                            isMobile={isPhone}
                                        />
                                    ))}
                                </View>
                                <View style={{ marginTop: 16 }}>
                                    <Pagination
                                        currentPage={page}
                                        totalPages={totalPages}
                                        totalItems={filtered.length}
                                        itemsPerPage={PAGE_SIZE}
                                        itemName="users"
                                        onPageChange={setPage}
                                    />
                                </View>
                            </View>
                        )
                    ) : (
                        <View style={styles.tableCard}>
                            <ScrollView horizontal={width < 1024} showsHorizontalScrollIndicator={width < 1024}>
                                <View style={[styles.tableWrapper, { width: width < 1024 ? 1000 : '100%' }]}>
                                    <View style={styles.tableHeader}>
                                        <Text style={[styles.headCell, styles.colId]}>ID</Text>
                                        <View style={[styles.colName]}><Text style={styles.headCell}>Full Name</Text></View>
                                        <Text style={[styles.headCell, styles.colUsername]}>Username</Text>
                                        <Text style={[styles.headCell, styles.colEmail]}>Email</Text>
                                        <View style={[styles.colRole]}><Text style={styles.headCell}>Role</Text></View>
                                        <View style={[styles.colStatus]}><Text style={styles.headCell}>Status</Text></View>
                                        <Text style={[styles.headCell, styles.colLastLogin]}>Last Login</Text>
                                        <View style={[styles.colAction]}><Text style={styles.headCell}>Action</Text></View>
                                    </View>
                                    <FlatList
                                        data={pageData}
                                        keyExtractor={(u) => String(u.id)}
                                        renderItem={renderTableRow}
                                        scrollEnabled={false}
                                        ListEmptyComponent={<Text style={styles.emptyText}>No users match your filters.</Text>}
                                    />
                                </View>
                            </ScrollView>
                            <View style={{ borderTopWidth: 1, borderTopColor: COLORS.border, padding: 12 }}>
                                <Pagination
                                    currentPage={page}
                                    totalPages={totalPages}
                                    totalItems={filtered.length}
                                    itemsPerPage={PAGE_SIZE}
                                    itemName="users"
                                    onPageChange={setPage}
                                />
                            </View>
                        </View>
                    )}
                </ScrollView>

                <UserFormModal
                    key={editingUser ? `edit-${editingUser.id}` : 'add-user'}
                    visible={modalVisible}
                    isEdit={!!editingUser}
                    initial={formInitial}
                    saving={saving}
                    onCancel={closeModal}
                    onSubmit={handleSubmitForm}
                />

                <DeleteModal
                    visible={deleteModalVisible}
                    user={deletingUser}
                    onClose={closeDeleteModal}
                    onConfirm={confirmDelete}
                />

                {/* ---- Sliding Green Toast ---- */}
                {toastVisible && (
                    <View style={styles.toastContainer} pointerEvents="none">
                        <Animated.View
                            style={[
                                styles.toast,
                                { transform: [{ translateX: toastSlide }] }
                            ]}
                        >
                            <Text style={styles.toastText}>{toastMessage}</Text>
                        </Animated.View>
                    </View>
                )}
            </View>
        </AdminLayout>
    );
};

export default AdsAdminUsers;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16, paddingTop: 16 },

    headerContainer: {
        backgroundColor: COLORS.navy,
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 38,
        overflow: "visible",
        zIndex: 1,
    },
    headerContainerMobile: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 40,
    },
    heroIconBadge: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.orange, alignItems: "center", justifyContent: "center" },
    heroTitle: { color: "#fff", fontSize: 24, fontWeight: "800" },
    heroTitleMobile: { fontSize: 18 },
    heroSubtitle: { color: "#94A3B8", fontSize: 12, marginTop: 2, fontWeight: "400" },

    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 },
    title: { fontSize: 24, fontWeight: '800', color: COLORS.ink },
    breadcrumbRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    breadcrumbActive: { color: COLORS.orange, fontSize: 13, fontWeight: '600' },
    breadcrumbCurrent: { color: COLORS.sub, fontSize: 13 },

    addBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.orange,
        paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10,
        shadowColor: COLORS.orange, shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 6,
        zIndex: 20,
    },
    addBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

    statsRow: { flexDirection: 'row', zIndex: 10, elevation: 5, marginBottom: 16 },
    statsRowDesktop: { flexWrap: 'nowrap', justifyContent: 'center', gap: 10, marginTop: -20, paddingHorizontal: 22, minWidth: '100%' },
    statsRowMobile: { flexWrap: 'nowrap', justifyContent: 'space-between', gap: 6, marginTop: -24, paddingHorizontal: 0 },

    statCard: {
        backgroundColor: COLORS.card, borderRadius: 16, paddingHorizontal: 13, paddingVertical: 12,
        borderWidth: 1, borderColor: "#F1F5F9", shadowColor: "#0F172A", shadowOpacity: 0.1,
        shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3,
    },
    statCardDesktop: { flexGrow: 0, flexShrink: 0, flexDirection: 'column', alignItems: 'flex-start' },
    statCardMobile: { flex: 1, minWidth: 0, borderRadius: 12, paddingHorizontal: 2, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', gap: 2 },
    statCardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: '100%', marginBottom: 6 },

    statIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    statIconWrapMobile: { width: 26, height: 26 },

    statValue: { fontSize: 17, fontWeight: "700" },
    statValueMobile: { fontSize: 14, fontWeight: "800", marginTop: 2, textAlign: "center" },

    statLabel: { fontSize: 11, color: COLORS.sub, fontWeight: "500" },
    statLabelMobile: { fontSize: 10, color: COLORS.sub, fontWeight: "600", marginTop: 2, textAlign: "center" },

    statSub: { fontSize: 10, color: COLORS.sub, marginTop: 2 },

    toolbarCard: {
        backgroundColor: COLORS.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border,
        marginBottom: 14, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10,
    },
    searchBox: {
        flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F9FAFB',
        borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12,
        height: 42, flex: 1, minWidth: 200,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        color: COLORS.ink,
        borderWidth: 0,
        outlineStyle: 'none',
    } as any,
    filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    selectWrap: {
        borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, backgroundColor: '#F9FAFB',
        height: 42, justifyContent: 'center', minWidth: 130, overflow: 'hidden',
    },
    selectPicker: {
        color: COLORS.ink,
        backgroundColor: 'transparent',
        borderWidth: 0,
        outlineStyle: 'none',
        height: '100%',
        paddingHorizontal: 8,
    } as any,
    viewToggle: { flexDirection: 'row', backgroundColor: '#F1F2F4', borderRadius: 10, padding: 3 },
    viewToggleBtn: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    viewToggleBtnActive: { backgroundColor: COLORS.navy },

    dataCard: { backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 12 },

    tableWrapper: {
        width: 1000,
        minWidth: '100%',
    },
    colId: { flex: 0.5, paddingHorizontal: 8 },
    colName: { flex: 2, paddingHorizontal: 8 },
    colUsername: { flex: 1.5, paddingHorizontal: 8 },
    colEmail: { flex: 2.5, paddingHorizontal: 8 },
    colRole: { flex: 1.2, paddingHorizontal: 8 },
    colStatus: { flex: 1.2, paddingHorizontal: 8 },
    colLastLogin: { flex: 2, paddingHorizontal: 8 },
    colAction: { flex: 1.2, paddingHorizontal: 8 },

    tableCard: {
        backgroundColor: COLORS.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
        marginBottom: 16,
    } as any,
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#1d324e',
        paddingVertical: 14,
        alignItems: 'center',
    } as any,
    headCell: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderColor: '#F1F2F4',
    } as any,
    cell: {
        fontSize: 13,
        color: COLORS.ink,
    },
    cellNameText: { fontSize: 13, fontWeight: '600', color: COLORS.ink, flexShrink: 1 },

    avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.orange, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    avatarText: { color: '#fff', fontWeight: '800', fontSize: 13, textAlign: 'center', lineHeight: 30 },

    pill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, alignSelf: 'flex-start' },
    pillText: { fontSize: 11, fontWeight: '700' },

    editBtn: { backgroundColor: '#1d324e', width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    deleteBtn: { backgroundColor: '#dc2626', width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

    userCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#FAFAFB', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 12,
    },
    cardName: { fontSize: 14, fontWeight: '700', color: COLORS.ink },
    cardUsername: { fontSize: 12, color: COLORS.sub },
    cardEmail: { fontSize: 12, color: COLORS.sub },

    emptyText: { textAlign: 'center', color: COLORS.sub, paddingVertical: 24, fontSize: 13 },

    paginationRow: {
        flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 14, gap: 10,
    },
    paginationText: { fontSize: 12, color: COLORS.sub },
    paginationBtns: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    pageArrow: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
    pageNum: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
    pageNumActive: { backgroundColor: COLORS.orange },
    pageNumText: { fontSize: 12, color: COLORS.ink, fontWeight: '600' },
    pageNumTextActive: { color: '#fff' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center', padding: 16 },
    modalCard: { width: '100%', maxWidth: 460, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: COLORS.orange, paddingHorizontal: 18, paddingVertical: 16,
    },
    modalHeaderText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    modalBody: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 6 },
    label: { fontSize: 13, fontWeight: '600', color: COLORS.ink, marginBottom: 6, marginTop: 12 },
    input: {
        borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12,
        height: 44, fontSize: 14, color: COLORS.ink, backgroundColor: '#fff', outlineStyle: 'none',
    } as any,
    pickerWrap: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 10,
        overflow: 'hidden',
        height: 46,
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    picker: {
        color: COLORS.ink,
        backgroundColor: 'transparent',
        borderWidth: 0,
        outlineStyle: 'none',
        height: '100%',
        paddingHorizontal: 8,
    } as any,
    modalFooter: {
        flexDirection: 'row', justifyContent: 'flex-end', gap: 10,
        paddingHorizontal: 18, paddingVertical: 16, borderTopWidth: 1, borderColor: COLORS.border,
    },
    cancelBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16,
        borderRadius: 10, backgroundColor: '#334155',
    },
    cancelBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    submitBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16,
        borderRadius: 10, backgroundColor: COLORS.orange,
    },
    submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    deleteConfirmBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16,
        borderRadius: 10, backgroundColor: COLORS.danger,
    },
    deleteIconCircle: {
        width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFF1E6',
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    deleteTitle: { fontSize: 17, fontWeight: '700', color: COLORS.ink, marginBottom: 6 },
    deleteSubtitle: { fontSize: 14, color: COLORS.sub, textAlign: 'center' },

    modalButtons: {
        flexDirection: 'row', gap: 12, justifyContent: 'center',
        marginTop: 24, marginBottom: 8, flexWrap: 'wrap',
    } as any,

    // Responsive Grid Card styles
    gridCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        marginBottom: 16,
    } as any,
    gridCardHeader: {
        height: 120,
        backgroundColor: '#151D4F',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    } as any,
    gridCardAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    } as any,
    gridCardAvatarText: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '800',
    } as any,
    gridCardBody: {
        padding: 16,
    } as any,
    gridCardInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        flexWrap: 'wrap',
        gap: 6,
    } as any,
    gridCardName: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.ink,
        flex: 1,
    } as any,
    gridCardSubText: {
        fontSize: 12,
        color: COLORS.sub,
        marginTop: 4,
    } as any,
    gridActions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 10,
    } as any,
    gridActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        borderRadius: 8,
        paddingVertical: 8,
    } as any,
    gridActionText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    } as any,
    customDropdownTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 10,
        height: 48,
        paddingHorizontal: 12,
    } as any,
    customDropdownTriggerText: {
        fontSize: 13,
        color: COLORS.ink,
        fontWeight: '600',
    } as any,
    customDropdownMenu: {
        position: 'absolute',
        top: 52,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#9CA3AF',
        borderRadius: 8,
        paddingVertical: 4,
        zIndex: 2000,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    } as any,
    customDropdownItem: {
        paddingVertical: 10,
        paddingHorizontal: 12,
    } as any,
    customDropdownItemText: {
        fontSize: 13,
        color: '#4B5563',
    } as any,

    // Toast
    toastContainer: {
        position: 'absolute',
        top: 16,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 9999,
    } as any,
    toast: {
        backgroundColor: '#16A34A',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 10,
        minWidth: 220,
        maxWidth: 340,
    } as any,
    toastText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
        flexShrink: 1,
    } as any,

});