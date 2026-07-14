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
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import React, { useMemo, useState } from 'react';
import {
    Alert,
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
    View,
} from 'react-native';

import Pagination from '@/components/Pagination';
import CalendarWeek from 'react-native-bootstrap-icons/icons/calendar-week';
import Grid3x3GapFill from 'react-native-bootstrap-icons/icons/grid-3x3-gap-fill';
import ListUl from 'react-native-bootstrap-icons/icons/list-ul';
import PeopleFill from 'react-native-bootstrap-icons/icons/people-fill';
import PersonCheckFill from 'react-native-bootstrap-icons/icons/person-check-fill';
import PersonXFill from 'react-native-bootstrap-icons/icons/person-x-fill';
import PlusLg from 'react-native-bootstrap-icons/icons/plus-lg';
import Save2Fill from 'react-native-bootstrap-icons/icons/save2-fill';
import Search from 'react-native-bootstrap-icons/icons/search';
import Trash from 'react-native-bootstrap-icons/icons/trash';
import XLg from 'react-native-bootstrap-icons/icons/x-lg';


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

const SEED_USERS: AdsUser[] = [
    { id: 11, fullName: 'Soujanya Veginati', username: 'souji', email: 'soujanyaveginati8096@gmail.com', role: 'Admin', status: 'Active', lastLogin: 'Never' },
    { id: 8, fullName: 'Tayi Gopi Chand', username: 'Gopi', email: 'gopichand93667@gmail.com', role: 'Admin', status: 'Active', lastLogin: 'Mar 19, 2026 16:29' },
    { id: 1, fullName: 'System Administrator', username: 'admin', email: 'admin@ads.com', role: 'Admin', status: 'Active', lastLogin: 'Feb 14, 2026 10:18' },
    { id: 12, fullName: 'Priya Reddy', username: 'priya', email: 'priyareddy@gmail.com', role: 'Manager', status: 'Inactive', lastLogin: 'Apr 20, 2026 11:45' },
    { id: 15, fullName: 'Ramesh Kumar', username: 'ramesh', email: 'rameshkumar@gmail.com', role: 'Viewer', status: 'Active', lastLogin: 'Apr 21, 2026 09:12' },
];

const ROLES: Role[] = ['Admin', 'Manager', 'Viewer'];
const STATUSES: Status[] = ['Active', 'Inactive'];
const PAGE_SIZE = 5;

// Brand palette (matches the reference dashboard)
const COLORS = {
    orange: '#F5821F',
    orangeDark: '#DD6F10',
    navy: '#0B1B33',
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
}> = ({ label, value, sub, bg, fg, Icon, wide, style }) => (
    <View style={[styles.statCard, { width: wide ? '23.5%' : '48%' }, style]}>
        <View style={{ flex: 1 }}>
            <Text style={[styles.statLabel, { color: fg }]}>{label}</Text>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statSub}>{sub}</Text>
        </View>
        <View style={[styles.statIconWrap, { backgroundColor: bg }]}>
            <Icon width={20} height={20} fill={fg} />
        </View>
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
    const [hovered, setHovered] = useState(false);
    const rc = roleColors(item.role);
    const sc = statusColors(item.status);

    const isWeb = Platform.OS === 'web';
    const showOverlay = hovered && !isMobile;

    return (
        <Pressable
            onHoverIn={() => isWeb && !isMobile && setHovered(true)}
            onHoverOut={() => isWeb && !isMobile && setHovered(false)}
            style={[
                styles.gridCard,
                { width: cardWidth },
                hovered && !isMobile && styles.gridCardHovered
            ]}
        >
            {/* Top Banner in #151D4F */}
            <View style={styles.gridCardHeader}>
                <View style={styles.gridCardAvatar}>
                    <Text style={styles.gridCardAvatarText}>{item.fullName.charAt(0)}</Text>
                </View>

                {/* Hover actions overlay (Web/Desktop) */}
                {showOverlay && (
                    <View style={styles.gridOverlay}>
                        <TouchableOpacity style={styles.editBtn} onPress={(e) => { (e as any).stopPropagation?.(); onEdit(); }}>
                            <Ionicons name="pencil" size={13} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.deleteBtn} onPress={(e) => { (e as any).stopPropagation?.(); onDelete(); }}>
                            <Ionicons name="trash" size={13} color="#fff" />
                        </TouchableOpacity>
                    </View>
                )}
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

                {/* Mobile / Tablet actions */}
                {isMobile && (
                    <View style={styles.gridMobileActions}>
                        <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
                            <Ionicons name="pencil" size={13} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
                            <Ionicons name="trash" size={13} color="#fff" />
                        </TouchableOpacity>
                    </View>
                )}
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
                <View style={[styles.modalCard, { maxWidth: 420 }]}>
                    <View style={styles.modalHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Trash width={16} height={16} fill="#fff" />
                            <Text style={styles.modalHeaderText}>Delete User</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <XLg width={18} height={18} fill="#fff" />
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.modalBody, { alignItems: 'center', paddingTop: 26 }]}>
                        <View style={styles.trashCircle}>
                            <Trash width={26} height={26} fill={COLORS.orange} />
                        </View>
                        <Text style={styles.confirmTitle}>Are you sure you want to delete this user?</Text>
                        <Text style={styles.confirmSub}>
                            This action cannot be undone! This will permanently delete the user{' '}
                            <Text style={{ fontWeight: '700' }}>{user.fullName.toLowerCase()}</Text>.
                        </Text>
                    </View>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                            <XLg width={13} height={13} fill="#fff" />
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.deleteConfirmBtn} onPress={onConfirm}>
                            <Trash width={13} height={13} fill="#fff" />
                            <Text style={styles.submitBtnText}>Delete User</Text>
                        </TouchableOpacity>
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
    onCancel: () => void;
    onSubmit: (form: UserFormState) => void;
}> = ({ visible, isEdit, initial, onCancel, onSubmit }) => {
    const [form, setForm] = useState<UserFormState>(initial);

    React.useEffect(() => {
        if (visible) setForm(initial);
    }, [visible, initial]);

    const update = (key: keyof UserFormState, val: string) =>
        setForm((f) => ({ ...f, [key]: val }));

    const handleSubmit = () => {
        if (!form.fullName.trim() || !form.username.trim() || !form.email.trim()) {
            Alert.alert('Missing information', 'Please fill in full name, username and email.');
            return;
        }
        onSubmit(form);
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalHeaderText}>{isEdit ? 'Edit User' : 'Add New User'}</Text>
                        <TouchableOpacity onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <XLg width={18} height={18} fill="#fff" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={styles.modalBody}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            value={form.fullName}
                            onChangeText={(t) => update('fullName', t)}
                            placeholder="e.g. Priya Reddy"
                            placeholderTextColor="#9CA3AF"
                        />

                        <Text style={styles.label}>Username</Text>
                        <TextInput
                            style={styles.input}
                            value={form.username}
                            onChangeText={(t) => update('username', t)}
                            placeholder="admin@flintnthread.in"
                            placeholderTextColor="#9CA3AF"
                            autoCapitalize="none"
                            autoComplete="off"
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
                            autoComplete="off"
                        />

                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            value={form.password}
                            onChangeText={(t) => update('password', t)}
                            placeholder={isEdit ? 'Leave blank to keep current password' : '••••••••'}
                            placeholderTextColor="#9CA3AF"
                            secureTextEntry
                            autoComplete="new-password"
                        />

                        <Text style={styles.label}>Role</Text>
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

                        <Text style={styles.label}>Status</Text>
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
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                            <XLg width={14} height={14} fill="#fff" />
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                            <Save2Fill width={14} height={14} fill="#fff" />
                            <Text style={styles.submitBtnText}>{isEdit ? 'Save Changes' : 'Add User'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
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

    const [users, setUsers] = useState<AdsUser[]>(SEED_USERS);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<'All' | Role>('All');
    const [statusFilter, setStatusFilter] = useState<'All' | Status>('All');
    const [view, setView] = useState<'grid' | 'list'>('list');
    const [page, setPage] = useState(1);

    const [modalVisible, setModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState<AdsUser | null>(null);

    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [deletingUser, setDeletingUser] = useState<AdsUser | null>(null);

    const filtered = useMemo(() => {
        return users.filter((u) => {
            const q = search.trim().toLowerCase();
            const matchesSearch =
                !q ||
                u.fullName.toLowerCase().includes(q) ||
                u.username.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q);
            const matchesRole = roleFilter === 'All' || u.role === roleFilter;
            const matchesStatus = statusFilter === 'All' || u.status === statusFilter;
            return matchesSearch && matchesRole && matchesStatus;
        });
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
    const closeModal = () => setModalVisible(false);

    const handleSubmitForm = (form: UserFormState) => {
        if (editingUser) {
            setUsers((prev) =>
                prev.map((u) =>
                    u.id === editingUser.id
                        ? { ...u, fullName: form.fullName, username: form.username, email: form.email, role: form.role, status: form.status }
                        : u
                )
            );
        } else {
            const newId = users.length ? Math.max(...users.map((u) => u.id)) + 1 : 1;
            const newUser: AdsUser = {
                id: newId,
                fullName: form.fullName,
                username: form.username,
                email: form.email,
                role: form.role,
                status: form.status,
                lastLogin: 'Never',
            };
            setUsers((prev) => [newUser, ...prev]);
            setPage(1);
        }
        setModalVisible(false);
    };

    const handleDelete = (user: AdsUser) => {
        setDeletingUser(user);
        setDeleteModalVisible(true);
    };

    const confirmDelete = () => {
        if (deletingUser) {
            setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id));
            setDeleteModalVisible(false);
            setDeletingUser(null);
        }
    };

    const closeDeleteModal = () => {
        setDeleteModalVisible(false);
        setDeletingUser(null);
    };

    const formInitial: UserFormState = editingUser
        ? {
            fullName: editingUser.fullName,
            username: editingUser.username,
            email: editingUser.email,
            password: '',
            role: editingUser.role,
            status: editingUser.status,
        }
        : emptyForm;

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
                        <Ionicons name="pencil" size={13} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                        <Ionicons name="trash" size={13} color="#fff" />
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
                    <View style={styles.headerContainer}>
                        <View style={[styles.headerRow, isPhone && { flexDirection: 'column', alignItems: 'flex-start', gap: 12 }]}>
                            <View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <PeopleFill width={isPhone ? 20 : 24} height={isPhone ? 20 : 24} fill="#fff" />
                                    <Text style={[styles.title, { color: '#fff' }, isPhone && { fontSize: 20 }]}>Ads Admin Users</Text>
                                </View>
                            </View>

                            <TouchableOpacity style={[styles.addBtn, isPhone && { alignSelf: 'stretch', justifyContent: 'center' }]} onPress={openAddModal}>
                                <PlusLg width={14} height={14} fill="#fff" />
                                <Text style={styles.addBtnText}>Add New User</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* ---------- Stat cards ---------- */}
                    {isPhone ? (
                        <View style={{ marginTop: -32, zIndex: 10, marginBottom: 14 }}>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{
                                    flexDirection: 'row',
                                    gap: 12,
                                    paddingHorizontal: 16,
                                    paddingVertical: 6,
                                }}
                            >
                                <StatCard label="Total Users" value={stats.total} sub="All registered users" bg={COLORS.blueBg} fg={COLORS.blueText} Icon={PeopleFill} wide={false} style={{ width: 170 }} />
                                <StatCard label="Active Users" value={stats.active} sub="Currently active users" bg={COLORS.greenBg} fg={COLORS.greenText} Icon={PersonCheckFill} wide={false} style={{ width: 170 }} />
                                <StatCard label="Inactive Users" value={stats.inactive} sub="Currently inactive users" bg={COLORS.orangeBg} fg={COLORS.orangeText} Icon={PersonXFill} wide={false} style={{ width: 170 }} />
                                <StatCard label="Last 7 Days Logins" value={stats.recentLogins} sub="Users logged in" bg={COLORS.purpleBg} fg={COLORS.purpleText} Icon={CalendarWeek} wide={false} style={{ width: 170 }} />
                            </ScrollView>
                        </View>
                    ) : (
                        <View style={[
                            styles.statsRow,
                            {
                                marginTop: -32,
                                zIndex: 10,
                                marginHorizontal: 22,
                            }
                        ]}>
                            <StatCard label="Total Users" value={stats.total} sub="All registered users" bg={COLORS.blueBg} fg={COLORS.blueText} Icon={PeopleFill} wide={statsWide} />
                            <StatCard label="Active Users" value={stats.active} sub="Currently active users" bg={COLORS.greenBg} fg={COLORS.greenText} Icon={PersonCheckFill} wide={statsWide} />
                            <StatCard label="Inactive Users" value={stats.inactive} sub="Currently inactive users" bg={COLORS.orangeBg} fg={COLORS.orangeText} Icon={PersonXFill} wide={statsWide} />
                            <StatCard label="Last 7 Days Logins" value={stats.recentLogins} sub="Users logged in" bg={COLORS.purpleBg} fg={COLORS.purpleText} Icon={CalendarWeek} wide={statsWide} />
                        </View>
                    )}

                    {/* ---------- Toolbar ---------- */}
                    <View style={styles.toolbarCard}>
                        <View style={[styles.searchBox, isPhone && { width: '100%' }]}>
                            <Search width={15} height={15} fill={COLORS.sub} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search users by name, username or email..."
                                placeholderTextColor="#9CA3AF"
                                value={search}
                                onChangeText={(t) => { setSearch(t); setPage(1); }}
                                autoComplete={"one-time-code" as any}
                            />
                        </View>

                        <View style={[styles.filterRow, isPhone && { width: '100%', marginTop: 10 }]}>
                            <View style={[styles.selectWrap, isPhone && { flex: 1 }]}>
                                <Picker selectedValue={roleFilter} onValueChange={(v) => { setRoleFilter(v as any); setPage(1); }} style={styles.selectPicker}>
                                    <Picker.Item label="All Roles" value="All" />
                                    {ROLES.map((r) => <Picker.Item key={r} label={r} value={r} />)}
                                </Picker>
                            </View>
                            <View style={[styles.selectWrap, isPhone && { flex: 1 }]}>
                                <Picker selectedValue={statusFilter} onValueChange={(v) => { setStatusFilter(v as any); setPage(1); }} style={styles.selectPicker}>
                                    <Picker.Item label="All Status" value="All" />
                                    {STATUSES.map((s) => <Picker.Item key={s} label={s} value={s} />)}
                                </Picker>
                            </View>
                            {!isPhone && (
                                <View style={styles.viewToggle}>
                                    <TouchableOpacity
                                        style={[styles.viewToggleBtn, view === 'grid' && styles.viewToggleBtnActive]}
                                        onPress={() => setView('grid')}
                                    >
                                        <Grid3x3GapFill width={14} height={14} fill={view === 'grid' ? '#fff' : COLORS.ink} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.viewToggleBtn, view === 'list' && styles.viewToggleBtnActive]}
                                        onPress={() => setView('list')}
                                    >
                                        <ListUl width={14} height={14} fill={view === 'list' ? '#fff' : COLORS.ink} />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* ---------- Data (table on wide screens, cards on phones / grid view) ---------- */}
                    {useCardLayout ? (
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
                    visible={modalVisible}
                    isEdit={!!editingUser}
                    initial={formInitial}
                    onCancel={closeModal}
                    onSubmit={handleSubmitForm}
                />

                <DeleteModal
                    visible={deleteModalVisible}
                    user={deletingUser}
                    onClose={closeDeleteModal}
                    onConfirm={confirmDelete}
                />
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
        backgroundColor: '#1d324e',
        marginHorizontal: 2,
        marginTop: 12,
        borderRadius: 22,
        paddingHorizontal: 24,
        paddingVertical: 28,
        paddingBottom: 68,
        shadowColor: '#1d324e',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 10,
    } as any,

    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 },
    title: { fontSize: 24, fontWeight: '800', color: COLORS.ink },
    breadcrumbRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    breadcrumbActive: { color: COLORS.orange, fontSize: 13, fontWeight: '600' },
    breadcrumbCurrent: { color: COLORS.sub, fontSize: 13 },

    addBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.orange,
        paddingVertical: 11, paddingHorizontal: 18, borderRadius: 10,
    },
    addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: '2%', marginBottom: 16, rowGap: 12 },
    statCard: {
        backgroundColor: COLORS.card, borderRadius: 14, padding: 14, flexDirection: 'row',
        alignItems: 'flex-start', justifyContent: 'space-between', borderWidth: 1, borderColor: COLORS.border,
    },
    statLabel: { fontSize: 12, fontWeight: '700' },
    statValue: { fontSize: 22, fontWeight: '800', color: COLORS.ink, marginTop: 4 },
    statSub: { fontSize: 11, color: COLORS.sub, marginTop: 2 },
    statIconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

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
    viewToggleBtn: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8 },
    viewToggleBtnActive: { backgroundColor: COLORS.orange },

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

    editBtn: { backgroundColor: COLORS.orange, width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    deleteBtn: { backgroundColor: COLORS.danger, width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

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
    trashCircle: {
        width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF1E6',
        alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    },
    confirmTitle: { fontSize: 15, fontWeight: '700', color: COLORS.ink, textAlign: 'center' },
    confirmSub: { fontSize: 12.5, color: COLORS.sub, marginTop: 4, textAlign: 'center' },

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
    gridCardHovered: {
        borderColor: COLORS.orange,
        shadowOpacity: 0.1,
        shadowRadius: 12,
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
    gridOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(21, 29, 79, 0.4)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    } as any,
    gridOverlayBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
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
    gridMobileActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 10,
    } as any,

});