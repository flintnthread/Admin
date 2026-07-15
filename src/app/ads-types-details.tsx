/**
 * ads-types-details.tsx
 * -----------------------------------------------------------------------
 * Ads Types & Details Management — sidebar & top navbar removed, fully
 * responsive (phones 320/375/425, tablet 768, laptop 1024/1440, desktop
 * 2560).
 *
 * - Title + "Add New Ad Type" button live in ONE header container with
 *   background #1D324E.
 * - Add New Ad Type modal: Ad Type Name, Category (dropdown with Banner
 *   Ads / Video Ads / Native Ads / Social Media Ads / Search Ads /
 *   Display Ads / Mobile Ads), Description, Technical Specifications,
 *   Requirements & Guidelines, Status (Active/Inactive) -> Create Ad Type.
 * - View (eye icon) -> read-only "Ad Type Details" modal.
 * - Edit (pencil icon) -> same form modal, pre-filled -> Update Ad Type.
 * - Delete (trash icon) -> "Delete Ad Type" confirm modal -> removes row.
 * - Stat cards + Ad Types & Specifications overview + a management table
 *   that becomes stacked cards / accordion on phones.
 *
 * Install before use:
 *   npm install react-native-bootstrap-icons
 *   npm install @react-native-picker/picker
 * -----------------------------------------------------------------------
 */

import AdminLayout from '@/components/admin-layout';
import Pagination from '@/components/Pagination';
import { getApiErrorMessage } from '@/lib/api/client';
import {
    createAdsType,
    deleteAdsType,
    fetchAdsTypes,
    formatAdsDate,
    toApiStatus,
    toUiStatus,
    updateAdsType,
    type AdsApiRow,
} from '@/services/adsApi';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
    View,
} from 'react-native';

// ---------------------------------------------------------------------------
// Types & seed data
// ---------------------------------------------------------------------------
type Status = 'Active' | 'Inactive';

interface AdType {
    id: number;
    name: string;
    category: string;
    description: string;
    techSpecs: string;
    requirements: string;
    status: Status;
    created: string;
}

const CATEGORY_OPTIONS = [
    'Select Category',
    'Banner Ads',
    'Video Ads',
    'Native Ads',
    'Social Media Ads',
    'Search Ads',
    'Display Ads',
    'Mobile Ads',
];
const STATUS_OPTIONS: Status[] = ['Active', 'Inactive'];

function mapAdTypeFromApi(row: AdsApiRow): AdType {
    return {
        id: Number(row.id),
        name: String(row.name ?? ''),
        category: String(row.category ?? ''),
        description: String(row.description ?? ''),
        techSpecs: String(row.specifications ?? ''),
        requirements: String(row.requirements ?? ''),
        status: toUiStatus(row.status),
        created: formatAdsDate(row.createdAt),
    };
}

const OVERVIEW_CARDS = [
    { key: 'Banner Ads', iconName: 'image' as const, color: '#2563EB', bg: '#DBEAFE' },
    { key: 'Video Ads', iconName: 'play-circle' as const, color: '#16A34A', bg: '#DCFCE7' },
    { key: 'Native Ads', iconName: 'code-slash' as const, color: '#EA580C', bg: '#FFEDD5' },
];

// Palette
const COLORS = {
    header: '#151D4F',
    navy: '#1D324E',
    orange: '#F5821F',
    orangeDark: '#DD6F10',
    ink: '#1F2937',
    sub: '#6B7280',
    border: '#E5E7EB',
    bg: '#F3F4F6',
    card: '#FFFFFF',
    blueBg: '#EDE9FE', blueText: '#7C3AED',
    greenBg: '#E9FBF0', greenText: '#16A34A',
    skyBg: '#E0F2FE', skyText: '#0284C7',
    redBg: '#FEE2E2', redText: '#DC2626',
    danger: '#DC2626',
    dark: '#334155',
};

// ---------------------------------------------------------------------------
// Responsive breakpoint helper
// ---------------------------------------------------------------------------
type Bp = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
function getBreakpoint(width: number): Bp {
    if (width < 360) return 'xs';   // 320
    if (width < 400) return 'sm';   // 375
    if (width < 768) return 'md';   // 425
    if (width < 1024) return 'lg';  // 768 tablet
    if (width < 1440) return 'xl';  // 1024 laptop
    return 'xxl';                   // 1440 / 2560
}

// ---------------------------------------------------------------------------
// Small reusable pieces
// ---------------------------------------------------------------------------
const StatCard: React.FC<{
    icon: keyof typeof Feather.glyphMap;
    value: string;
    label: string;
    tint: string;
    tintBg: string;
    isMobile: boolean;
}> = ({ icon, value, label, tint, tintBg, isMobile }) => (
    <View style={[
        styles.statCard,
        isMobile ? styles.statCardMobile : styles.statCardDesktop
    ]}>
        {isMobile ? (
            <>
                <View style={[styles.statIconBox, styles.statIconBoxMobile, { backgroundColor: tintBg }]}>
                    <Feather name={icon} size={14} color={tint} />
                </View>
                <Text style={[styles.statValue, styles.statValueMobile, { color: tint }]}>{value}</Text>
                <Text style={styles.statLabelMobile} numberOfLines={1}>{label}</Text>
            </>
        ) : (
            <>
                <View style={styles.statCardTopRow}>
                    <View style={[styles.statIconBox, { backgroundColor: tintBg }]}>
                        <Feather name={icon} size={15} color={tint} />
                    </View>
                    <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
                </View>
                <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
            </>
        )}
    </View>
);

const Pill: React.FC<{ text: string; bg: string; fg: string }> = ({ text, bg, fg }) => (
    <View style={[styles.pill, { backgroundColor: bg }]}>
        <Text style={[styles.pillText, { color: fg }]}>{text}</Text>
    </View>
);

const SpecLine: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <View style={styles.specLine}>
        <Ionicons name="checkmark-circle" size={12} color={COLORS.orange} style={{ marginTop: 2 }} />
        <Text style={styles.specLineText}>
            <Text style={{ fontWeight: '700' }}>{label}: </Text>
            {value}
        </Text>
    </View>
);

const parseSpecs = (raw: string) =>
    raw.split('\n').map((line) => {
        const idx = line.indexOf(':');
        if (idx === -1) return { label: line, value: '' };
        return { label: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() };
    });

// ---------------------------------------------------------------------------
// Add / Edit modal
// ---------------------------------------------------------------------------
interface FormState {
    name: string;
    category: string;
    description: string;
    techSpecs: string;
    requirements: string;
    status: Status;
}
const emptyForm: FormState = {
    name: '', category: 'Select Category', description: '', techSpecs: '', requirements: '', status: 'Active',
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
        <View style={{ zIndex: open ? 1000 : 1, position: 'relative', width: '100%' }}>
            <TouchableOpacity
                style={[
                    styles.customDropdownTrigger,
                    open && { borderColor: COLORS.orange }
                ]}
                onPress={() => setOpen(!open)}
            >
                <Text style={styles.customDropdownTriggerText} numberOfLines={1}>
                    {value === 'Select Category' ? label : value}
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
                                    {opt === 'Select Category' ? label : opt}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}
        </View>
    );
};

const AdTypeFormModal: React.FC<{
    visible: boolean;
    isEdit: boolean;
    initial: FormState;
    onCancel: () => void;
    onSubmit: (f: FormState) => void;
}> = ({ visible, isEdit, initial, onCancel, onSubmit }) => {
    const [form, setForm] = useState<FormState>(initial);
    const { width } = useWindowDimensions();
    const isPhone = getBreakpoint(width) !== 'lg' && width < 768;

    React.useEffect(() => {
        if (visible) setForm(initial);
    }, [visible, initial]);

    const update = (key: keyof FormState, val: string) => setForm((f) => ({ ...f, [key]: val }));

    const handleSubmit = () => {
        if (!form.name.trim() || form.category === 'Select Category' || !form.description.trim()) {
            Alert.alert('Missing information', 'Please fill in the ad type name, category and description.');
            return;
        }
        onSubmit(form);
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalCard, { maxWidth: isPhone ? '100%' : 640 }]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalHeaderText}>{isEdit ? 'Edit Ad Type' : 'Add New Ad Type'}</Text>
                        <TouchableOpacity onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="close" size={18} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ maxHeight: 500 }} contentContainerStyle={styles.modalBody}>
                        <View style={[styles.formRow, isPhone && { flexDirection: 'column' }]}>
                            <View style={[styles.formCol, isPhone && { width: '100%' }]}>
                                <Text style={styles.label}>Ad Type Name <Text style={styles.req}>*</Text></Text>
                                <TextInput
                                    style={styles.input}
                                    value={form.name}
                                    onChangeText={(t) => update('name', t)}
                                    placeholder="e.g. Banner Ads"
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>
                            <View style={[styles.formCol, isPhone && { width: '100%', marginTop: 12 }]}>
                                <Text style={styles.label}>Category <Text style={styles.req}>*</Text></Text>
                                {isPhone ? (
                                    <CustomDropdown
                                        label="Select Category"
                                        value={form.category}
                                        options={CATEGORY_OPTIONS}
                                        onValueChange={(v) => update('category', v)}
                                    />
                                ) : (
                                    <View style={styles.pickerWrap}>
                                        <Picker selectedValue={form.category} onValueChange={(v) => update('category', v as string)} style={styles.picker}>
                                            {CATEGORY_OPTIONS.map((c) => (
                                                <Picker.Item key={c} label={c} value={c} />
                                            ))}
                                        </Picker>
                                    </View>
                                )}
                            </View>
                        </View>

                        <Text style={styles.label}>Description <Text style={styles.req}>*</Text></Text>
                        <TextInput
                            style={[styles.input, styles.textarea]}
                            value={form.description}
                            onChangeText={(t) => update('description', t)}
                            placeholder="Enter ad type description..."
                            placeholderTextColor="#9CA3AF"
                            multiline
                        />

                        <Text style={styles.label}>Technical Specifications</Text>
                        <TextInput
                            style={[styles.input, styles.textarea]}
                            value={form.techSpecs}
                            onChangeText={(t) => update('techSpecs', t)}
                            placeholder="Enter technical specifications (formats, sizes, requirements)..."
                            placeholderTextColor="#9CA3AF"
                            multiline
                        />

                        <Text style={styles.label}>Requirements & Guidelines</Text>
                        <TextInput
                            style={[styles.input, styles.textarea]}
                            value={form.requirements}
                            onChangeText={(t) => update('requirements', t)}
                            placeholder="Enter requirements and guidelines..."
                            placeholderTextColor="#9CA3AF"
                            multiline
                        />

                        <Text style={styles.label}>Status <Text style={styles.req}>*</Text></Text>
                        {isPhone ? (
                            <CustomDropdown
                                label="Select Status"
                                value={form.status}
                                options={STATUS_OPTIONS}
                                onValueChange={(v) => update('status', v)}
                            />
                        ) : (
                            <View style={styles.pickerWrap}>
                                <Picker selectedValue={form.status} onValueChange={(v) => update('status', v as string)} style={styles.picker}>
                                    {STATUS_OPTIONS.map((s) => (
                                        <Picker.Item key={s} label={s} value={s} />
                                    ))}
                                </Picker>
                            </View>
                        )}
                        <View style={{ height: 20 }} />
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                            <Ionicons name="close" size={13} color="#fff" />
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                            <Ionicons name="save" size={13} color="#fff" />
                            <Text style={styles.submitBtnText}>{isEdit ? 'Update Ad Type' : 'Create Ad Type'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// ---------------------------------------------------------------------------
// View (read-only) modal
// ---------------------------------------------------------------------------
const ViewModal: React.FC<{ visible: boolean; item: AdType | null; onClose: () => void }> = ({ visible, item, onClose }) => {
    const { width } = useWindowDimensions();
    const isPhone = width < 768;
    if (!item) return null;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalCard, { maxWidth: isPhone ? '100%' : 560 }]}>
                    <View style={styles.modalHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="eye" size={16} color="#fff" />
                            <Text style={styles.modalHeaderText}>Ad Type Details</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="close" size={18} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={styles.modalBody}>
                        <View style={[styles.viewRow, isPhone && { flexDirection: 'column' }]}>
                            <View style={styles.viewCol}>
                                <Text style={styles.viewLabel}>Name</Text>
                                <Text style={styles.viewValue}>{item.name}</Text>
                            </View>
                            <View style={styles.viewCol}>
                                <Text style={styles.viewLabel}>Category</Text>
                                <Text style={styles.viewValue}>{item.category}</Text>
                            </View>
                        </View>

                        <Text style={styles.viewLabel}>Description</Text>
                        <Text style={styles.viewValue}>{item.description}</Text>

                        <Text style={styles.viewLabel}>Technical Specifications</Text>
                        <Text style={styles.viewValue}>{item.techSpecs.replace(/\n/g, '  ')}</Text>

                        <Text style={styles.viewLabel}>Requirements & Guidelines</Text>
                        <Text style={styles.viewValue}>{item.requirements.replace(/\n/g, '  ')}</Text>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

// ---------------------------------------------------------------------------
// Delete modal
// ---------------------------------------------------------------------------
const DeleteModal: React.FC<{ visible: boolean; onCancel: () => void; onConfirm: () => void }> = ({ visible, onCancel, onConfirm }) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
        <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { maxWidth: 420 }]}>
                <View style={styles.modalHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="trash" size={16} color="#fff" />
                        <Text style={styles.modalHeaderText}>Delete Ad Type</Text>
                    </View>
                    <TouchableOpacity onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close" size={18} color="#fff" />
                    </TouchableOpacity>
                </View>

                <View style={[styles.modalBody, { alignItems: 'center', paddingTop: 26 }]}>
                    <View style={styles.trashCircle}>
                        <Ionicons name="trash" size={26} color={COLORS.orange} />
                    </View>
                    <Text style={styles.confirmTitle}>Are you sure you want to delete this ad type?</Text>
                    <Text style={styles.confirmSub}>This action cannot be undone!</Text>
                </View>

                <View style={[styles.modalFooter, { justifyContent: 'center' }]}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                        <Ionicons name="close" size={13} color="#fff" />
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteConfirmBtn} onPress={onConfirm}>
                        <Ionicons name="trash" size={13} color="#fff" />
                        <Text style={styles.submitBtnText}>Delete Ad Type</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    </Modal>
);

// ---------------------------------------------------------------------------
// Table column styling configuration
// ---------------------------------------------------------------------------
const COL_STYLES = {
    id: { flex: 0.6, minWidth: 50, paddingHorizontal: 6 },
    name: { flex: 1.8, minWidth: 150, paddingHorizontal: 6 },
    category: { flex: 1.5, minWidth: 130, paddingHorizontal: 6 },
    description: { flex: 3, minWidth: 280, paddingHorizontal: 6 },
    status: { flex: 1.2, minWidth: 100, paddingHorizontal: 6 },
    created: { flex: 1.2, minWidth: 100, paddingHorizontal: 6 },
    action: { flex: 1.5, minWidth: 120, paddingHorizontal: 6 },
};

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
const AdsTypesDetails: React.FC = () => {
    const { width } = useWindowDimensions();
    const bp = getBreakpoint(width);
    const isPhone = bp === 'xs' || bp === 'sm' || bp === 'md';
    const isTablet = bp === 'lg';
    const statsWide = !isPhone;
    const overviewCols = bp === 'xxl' || bp === 'xl' ? 3 : bp === 'lg' ? 2 : 1;

    const [items, setItems] = useState<AdType[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 10;

    const loadItems = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const rows = await fetchAdsTypes();
            setItems(rows.map(mapAdTypeFromApi));
        } catch (err) {
            setLoadError(getApiErrorMessage(err, 'Failed to load ad types.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadItems();
    }, [loadItems]);

    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);

    const paginatedItems = useMemo(() => {
        const start = (safePage - 1) * PAGE_SIZE;
        return items.slice(start, start + PAGE_SIZE);
    }, [items, safePage]);
    const [expandedOverview, setExpandedOverview] = useState<string | null>(null);
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);

    const [formVisible, setFormVisible] = useState(false);
    const [editingItem, setEditingItem] = useState<AdType | null>(null);
    const [viewItem, setViewItem] = useState<AdType | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const stats = useMemo(() => {
        const total = items.length;
        const active = items.filter((i) => i.status === 'Active').length;
        return { total, active, totalAds: total, urgent: items.filter((i) => i.status === 'Inactive').length };
    }, [items]);

    const overviewData = useMemo(
        () => OVERVIEW_CARDS.map((c) => ({ ...c, item: items.find((i) => i.name === c.key || i.category === c.key) })).filter((c) => c.item),
        [items]
    );

    // ---- Toast -------------------------------------------------------
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMsg, setToastMsg] = useState('');
    const toastSlide = React.useRef(new Animated.Value(400)).current;

    const showToast = (msg: string) => {
        setToastMsg(msg);
        setToastVisible(true);
        toastSlide.setValue(400);
        Animated.timing(toastSlide, { toValue: 0, duration: 380, useNativeDriver: true }).start();
        setTimeout(() => {
            Animated.timing(toastSlide, { toValue: 400, duration: 320, useNativeDriver: true })
                .start(() => setToastVisible(false));
        }, 3000);
    };

    // ---- CRUD ------------------------------------------------------------
    const openAdd = () => { setEditingItem(null); setFormVisible(true); };
    const openEdit = (item: AdType) => { setEditingItem(item); setFormVisible(true); };
    const closeForm = () => setFormVisible(false);

    const handleSubmit = async (form: FormState) => {
        const body = {
            name: form.name.trim(),
            category: form.category,
            description: form.description.trim(),
            specifications: form.techSpecs,
            requirements: form.requirements,
            status: toApiStatus(form.status),
        };
        setSaving(true);
        try {
            if (editingItem) {
                await updateAdsType(editingItem.id, body);
                showToast('✅ Ad Type updated successfully!');
            } else {
                await createAdsType(body);
                showToast('✅ Ad Type created successfully!');
            }
            setFormVisible(false);
            await loadItems();
        } catch (err) {
            Alert.alert('Error', getApiErrorMessage(err, editingItem ? 'Could not update ad type.' : 'Could not create ad type.'));
        } finally {
            setSaving(false);
        }
    };

    const requestDelete = (id: number) => setDeleteId(id);
    const cancelDelete = () => setDeleteId(null);
    const confirmDelete = async () => {
        if (deleteId == null) return;
        setSaving(true);
        try {
            await deleteAdsType(deleteId);
            setDeleteId(null);
            await loadItems();
        } catch (err) {
            Alert.alert('Error', getApiErrorMessage(err, 'Could not delete ad type.'));
        } finally {
            setSaving(false);
        }
    };

    const formInitial: FormState = editingItem
        ? {
            name: editingItem.name,
            category: editingItem.category,
            description: editingItem.description,
            techSpecs: editingItem.techSpecs,
            requirements: editingItem.requirements,
            status: editingItem.status,
        }
        : emptyForm;

    // ---- Renderers ---------------------------------------------------------
    const renderTableRow = ({ item }: { item: AdType }) => (
        <View style={styles.tableRow}>
            <Text style={[styles.cell, COL_STYLES.id, { color: COLORS.sub }]} numberOfLines={1}>{item.id}</Text>
            <Text style={[styles.cell, COL_STYLES.name, { fontWeight: '700' }]} numberOfLines={1}>{item.name}</Text>
            <View style={[styles.cell, COL_STYLES.category]}>
                <Pill text={item.category} bg={COLORS.blueBg} fg={COLORS.blueText} />
            </View>
            <Text style={[styles.cell, COL_STYLES.description, { color: COLORS.sub }]} numberOfLines={2}>{item.description}</Text>
            <View style={[styles.cell, COL_STYLES.status]}>
                <Pill text={item.status} bg={item.status === 'Active' ? COLORS.greenBg : COLORS.redBg} fg={item.status === 'Active' ? COLORS.greenText : COLORS.redText} />
            </View>
            <Text style={[styles.cell, COL_STYLES.created, { color: COLORS.sub, fontSize: 12 }]} numberOfLines={1}>{item.created}</Text>
            <View style={[styles.cell, COL_STYLES.action, { flexDirection: 'row', gap: 6 }]}>
                <TouchableOpacity style={styles.viewBtn} onPress={() => setViewItem(item)}>
                    <Ionicons name="eye" size={13} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                    <Ionicons name="pencil" size={13} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => requestDelete(item.id)}>
                    <Ionicons name="trash" size={13} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderMobileCard = ({ item }: { item: AdType }) => (
        <View style={styles.mobileCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.mobileCardId}>#{item.id}</Text>
                <Pill text={item.status} bg={item.status === 'Active' ? COLORS.greenBg : COLORS.redBg} fg={item.status === 'Active' ? COLORS.greenText : COLORS.redText} />
            </View>
            <Text style={styles.mobileCardName}>{item.name}</Text>
            <Text style={styles.mobileCardDesc} numberOfLines={2}>{item.description}</Text>
            <View style={styles.mobileCardActions}>
                <TouchableOpacity style={styles.viewBtn} onPress={() => setViewItem(item)}>
                    <Ionicons name="eye" size={13} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                    <Ionicons name="pencil" size={13} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => requestDelete(item.id)}>
                    <Ionicons name="trash" size={13} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.screen}>
            <ScrollView 
                contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 16 }} 
                horizontal={false}
                showsVerticalScrollIndicator={false}
            >
                {/* ---------- Header: title + Add button in ONE #1D324E container ---------- */}
                <View style={[styles.headerContainer, isPhone && { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 12, paddingBottom: 50 }]}>
                    <View style={{ flex: 1, marginRight: 8, flexShrink: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            {/* Settings icon inside orange box */}
                            <View style={[styles.headerIconBox, isPhone && { width: 28, height: 28, borderRadius: 6 }]}>
                                <Ionicons name="settings" size={isPhone ? 12 : 18} color="#fff" />
                            </View>
                            {bp === 'xs' ? (
                                <View style={{ flex: 1, flexShrink: 1 }}>
                                    <Text style={[styles.title, { fontSize: 14, lineHeight: 18 }]} numberOfLines={2}>Ads Types & Details Management</Text>
                                </View>
                            ) : bp === 'sm' ? (
                                <View style={{ flex: 1, flexShrink: 1 }}>
                                    <Text style={[styles.title, { fontSize: 15, lineHeight: 19 }]} numberOfLines={2}>Ads Types & Details Management</Text>
                                </View>
                            ) : isPhone ? (
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.title, { fontSize: 17 }]} numberOfLines={1}>Ads Types & Details</Text>
                                    <Text style={[styles.title, { fontSize: 17, marginTop: 2 }]} numberOfLines={1}>Management</Text>
                                </View>
                            ) : (
                                <Text style={styles.title}>Ads Types & Details Management</Text>
                            )}
                        </View>
                    </View>

                    <TouchableOpacity style={[styles.addBtn, bp === 'xs' && { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 6 }, isPhone && bp !== 'xs' && { alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 }]} onPress={openAdd}>
                        <Text style={[styles.addBtnText, bp === 'xs' && { fontSize: 11 }, isPhone && bp !== 'xs' && { fontSize: 11 }]}>{bp === 'xs' ? '+ Add' : 'Add New Ad Type'}</Text>
                    </TouchableOpacity>
                </View>

                {/* ---------- Stat cards ---------- */}
                <View style={[
                    styles.statsRow,
                    isPhone && styles.statsRowMobile
                ]}>
                    <StatCard icon="layers" value={String(stats.total)} label="Total Ad Types" tint={COLORS.navy} tintBg="#EEF2F7" isMobile={isPhone} />
                    <StatCard icon="check-circle" value={String(stats.active)} label="Active" tint={COLORS.greenText} tintBg={COLORS.greenBg} isMobile={isPhone} />
                    <StatCard icon="bar-chart" value={String(stats.totalAds)} label="Total Ads" tint={COLORS.skyText} tintBg={COLORS.skyBg} isMobile={isPhone} />
                    <StatCard icon="alert-circle" value={String(stats.urgent)} label="Urgent Review" tint={COLORS.redText} tintBg={COLORS.redBg} isMobile={isPhone} />
                </View>

                {/* ---------- Specifications overview ---------- */}
                <View style={styles.overviewCard}>
                    <View style={styles.sectionTitleRowOverview}>
                        <Text style={[styles.sectionTitle, styles.sectionTitleOverview]}>Ad Types & Specifications Overview</Text>
                    </View>
                    <View style={styles.sectionDivider} />
                    {isPhone ? (
                        overviewData.map(({ key, iconName, color, bg, item }) => {
                            const open = expandedOverview === key;
                            return (
                                <View key={key} style={[
                                    styles.accordionItem,
                                    {
                                        borderLeftWidth: 4,
                                        borderLeftColor: color,
                                    }
                                ]}>
                                    <TouchableOpacity
                                        style={styles.accordionHeader}
                                        onPress={() => setExpandedOverview(open ? null : key)}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                            <View style={[styles.overviewIconWrap, { backgroundColor: bg }]}>
                                                <Ionicons name={iconName} size={16} color={color} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.overviewTitle}>{key}</Text>
                                                <Text style={styles.overviewDesc} numberOfLines={1}>{item!.description}</Text>
                                            </View>
                                        </View>
                                        {open ? (
                                            <Ionicons name="chevron-up" size={14} color={COLORS.sub} />
                                        ) : (
                                            <Ionicons name="chevron-down" size={14} color={COLORS.sub} />
                                        )}
                                    </TouchableOpacity>
                                    {open && (
                                        <View style={styles.accordionBody}>
                                            {parseSpecs(item!.techSpecs).map((s, idx) => (
                                                <SpecLine key={idx} label={s.label} value={s.value} />
                                            ))}
                                        </View>
                                    )}
                                </View>
                            );
                        })
                    ) : (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
                            {overviewData.map(({ key, iconName, color, bg, item }) => (
                                <Pressable
                                    key={key}
                                    onHoverIn={() => setHoveredCard(key)}
                                    onHoverOut={() => setHoveredCard(null)}
                                    style={[
                                        styles.overviewFullCard,
                                        {
                                            width: overviewCols === 3 ? '31.8%' : overviewCols === 2 ? '48%' : '100%',
                                            borderTopWidth: 4,
                                            borderTopColor: color,
                                            shadowColor: color,
                                            shadowOpacity: hoveredCard === key ? 0.22 : 0.12,
                                            shadowRadius: hoveredCard === key ? 16 : 10,
                                            shadowOffset: hoveredCard === key ? { width: 0, height: 8 } : { width: 0, height: 4 },
                                            transform: hoveredCard === key ? [{ translateY: -4 }] : [{ translateY: 0 }],
                                            elevation: hoveredCard === key ? 6 : 3,
                                        }
                                    ]}
                                >
                                    <View style={[styles.overviewIconCircle, { backgroundColor: color }]}>
                                        <Ionicons name={iconName} size={20} color="#fff" />
                                    </View>
                                    <Text style={styles.overviewCardTitle}>{key}</Text>
                                    <Text style={styles.overviewCardDesc}>{item!.description}</Text>
                                    <View style={{ marginTop: 10, width: '100%' }}>
                                        {parseSpecs(item!.techSpecs).map((s, idx) => (
                                            <SpecLine key={idx} label={s.label} value={s.value} />
                                        ))}
                                    </View>
                                </Pressable>
                            ))}
                        </View>
                    )}
                </View>

                {/* ---------- Management table ---------- */}
                <View style={{ overflow: 'hidden' }}>
                    <View style={styles.dataCard}>
                    <View style={styles.sectionTitleRow}>
                        <Text style={styles.sectionTitle}>Ad Types & Details Management</Text>
                    </View>
                    <View style={styles.sectionDivider} />
                    {loadError ? (
                        <Text style={{ color: COLORS.danger, paddingHorizontal: 12, paddingBottom: 12 }}>{loadError}</Text>
                    ) : null}
                    {loading ? (
                        <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                            <ActivityIndicator size="large" color={COLORS.orange} />
                        </View>
                    ) : isPhone ? (
                        <FlatList
                            data={paginatedItems}
                            keyExtractor={(i) => String(i.id)}
                            renderItem={renderMobileCard}
                            scrollEnabled={false}
                            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                        />
                    ) : (
                        <View style={{ flex: 1, width: '100%' }}>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={{ borderRadius: 8 }}
                                contentContainerStyle={{ flexGrow: 1 }}
                            >
                                <View style={{ flex: 1, minWidth: 1000 }}>
                                    <View style={styles.tableHeader}>
                                        <Text style={[styles.headCell, COL_STYLES.id]}>ID</Text>
                                        <Text style={[styles.headCell, COL_STYLES.name]}>Name</Text>
                                        <Text style={[styles.headCell, COL_STYLES.category]}>Category</Text>
                                        <Text style={[styles.headCell, COL_STYLES.description]}>Description</Text>
                                        <Text style={[styles.headCell, COL_STYLES.status]}>Status</Text>
                                        <Text style={[styles.headCell, COL_STYLES.created]}>Created</Text>
                                        <Text style={[styles.headCell, COL_STYLES.action]}>Action</Text>
                                    </View>
                                    <FlatList
                                        data={paginatedItems}
                                        keyExtractor={(i) => String(i.id)}
                                        renderItem={renderTableRow}
                                        scrollEnabled={false}
                                    />
                                </View>
                            </ScrollView>
                        </View>
                    )}
                    </View>
                </View>

                <Pagination
                    currentPage={safePage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={PAGE_SIZE}
                    itemName="ad types"
                    onPageChange={setPage}
                />
            </ScrollView>

            <AdTypeFormModal
                visible={formVisible}
                isEdit={!!editingItem}
                initial={formInitial}
                onCancel={closeForm}
                onSubmit={handleSubmit}
            />
            <ViewModal visible={!!viewItem} item={viewItem} onClose={() => setViewItem(null)} />
            <DeleteModal visible={deleteId != null} onCancel={cancelDelete} onConfirm={confirmDelete} />

            {/* ---- Sliding Green Toast ---- */}
            {toastVisible && (
                <View style={styles.toastContainer} pointerEvents="none">
                    <Animated.View
                        style={[styles.toast, { transform: [{ translateX: toastSlide }] }]}
                    >
                        <Text style={styles.toastText}>{toastMsg}</Text>
                    </Animated.View>
                </View>
            )}
        </View>
    );
};

export default function AdsTypesDetailsPage() {
    return (
        <AdminLayout>
            <AdsTypesDetails />
        </AdminLayout>
    );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.bg, paddingTop: 16 },

    headerContainer: {
        backgroundColor: COLORS.header, borderRadius: 14, padding: 18,
        paddingBottom: 40,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
    },
    title: { fontSize: 22, fontWeight: '800', color: '#fff' },
    headerIconBox: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: COLORS.orange,
        alignItems: 'center', justifyContent: 'center',
    },
    breadcrumbRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, flexWrap: 'wrap' },
    breadcrumbActive: { color: COLORS.orange, fontSize: 12.5, fontWeight: '600' },
    breadcrumbCurrent: { color: '#CBD5E1', fontSize: 12.5 },

    addBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.orange,
        paddingVertical: 11, paddingHorizontal: 18, borderRadius: 10,
    },
    addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    statsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: -32, paddingHorizontal: 2, zIndex: 10, elevation: 5 },
    statsRowMobile: { flexWrap: 'wrap', justifyContent: 'space-between', gap: 5, marginTop: -36, paddingHorizontal: 0, zIndex: 10, elevation: 5 },
    statCard: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 13, paddingVertical: 12, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#0F172A', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
    statCardDesktop: { flexGrow: 0, flexShrink: 0, width: 154 },
    statCardMobile: { flex: 1, minWidth: 0, borderRadius: 12, paddingHorizontal: 6, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', gap: 4 },
    statCardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    statIconBox: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    statIconBoxMobile: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    statValue: { fontSize: 17, fontWeight: '700' },
    statValueMobile: { fontSize: 14, fontWeight: '800', marginTop: 2, textAlign: 'center' },
    statLabel: { fontSize: 11, color: COLORS.sub, fontWeight: '500', marginTop: 7 },
    statLabelMobile: { fontSize: 10, color: COLORS.sub, fontWeight: '600', marginTop: 2, textAlign: 'center' },

    sectionBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.orange,
        borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 12,
    },
    sectionBannerText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    innerHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingVertical: 10, paddingHorizontal: 14, marginBottom: 12,
        borderTopLeftRadius: 14, borderTopRightRadius: 14,
    },
    sectionTitleRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingVertical: 16,
        backgroundColor: '#151D4F',
        borderTopLeftRadius: 14, borderTopRightRadius: 14,
        marginHorizontal: -12, marginTop: -12, paddingHorizontal: 26,
    },
    sectionTitleRowOverview: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingVertical: 16, paddingHorizontal: 14,
    },
    sectionTitle: {
        fontSize: 18, fontWeight: '700', color: '#fff',
    },
    sectionTitleOverview: {
        color: '#1D324E',
    },
    sectionDivider: {
        borderBottomWidth: 1, borderColor: '#E5E7EB', marginBottom: 12,
    },

    overviewCard: { backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 14, marginBottom: 16, marginTop: 16 },
    overviewCardHighlighted: { borderWidth: 2, borderColor: COLORS.orange, backgroundColor: '#FFFBF5' },
    sectionTitleRowHighlighted: { backgroundColor: '#FFF1E6', paddingHorizontal: 14, paddingVertical: 16, marginHorizontal: -14, marginTop: -14, borderTopLeftRadius: 14, borderTopRightRadius: 14 },

    overviewFullCard: {
        backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 16, alignItems: 'center',
    },
    overviewIconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    overviewCardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.ink, marginBottom: 4 },
    overviewCardDesc: { fontSize: 12, color: COLORS.sub, textAlign: 'center' },

    accordionItem: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 4,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
    },
    accordionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
    overviewIconWrap: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    overviewTitle: { fontSize: 13.5, fontWeight: '700', color: COLORS.ink },
    overviewDesc: { fontSize: 11.5, color: COLORS.sub },
    accordionBody: { paddingBottom: 12, paddingLeft: 4 },

    specLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 5 },
    specLineText: { fontSize: 12, color: COLORS.ink, flexShrink: 1 },

    dataCard: { backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 12 },
    dataCardHighlighted: { borderWidth: 2, borderColor: COLORS.orange, backgroundColor: '#FFFBF5' },
    sectionTitleRowHighlightedDataCard: { backgroundColor: '#FFF1E6', paddingHorizontal: 12, paddingVertical: 16, marginHorizontal: -12, marginTop: -12, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
    tableHeader: { flexDirection: 'row', backgroundColor: '#faf8f4', paddingVertical: 10, paddingHorizontal: 4, borderRadius: 8, marginBottom: 4 },
    headCell: { fontSize: 12, fontWeight: '700', color: '#64748B', paddingHorizontal: 4, textTransform: 'uppercase', letterSpacing: 0.3 },
    tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#F1F2F4' },
    cell: { paddingHorizontal: 4, fontSize: 13, color: COLORS.ink },

    pill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, alignSelf: 'flex-start' },
    pillText: { fontSize: 11, fontWeight: '700' },

    viewBtn: { backgroundColor: COLORS.header, width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    editBtn: { backgroundColor: COLORS.orange, width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    deleteBtn: { backgroundColor: COLORS.danger, width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

    mobileCard: { backgroundColor: '#FAFAFB', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 12 },
    mobileCardId: { fontSize: 11, fontWeight: '700', color: COLORS.sub },
    mobileCardName: { fontSize: 15, fontWeight: '800', color: COLORS.ink, marginTop: 4 },
    mobileCardDesc: { fontSize: 12, color: COLORS.sub, marginTop: 4 },
    mobileCardActions: { flexDirection: 'row', gap: 8, marginTop: 10 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center', padding: 16 },
    modalCard: { width: '100%', backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: COLORS.orange, paddingHorizontal: 18, paddingVertical: 16,
    },
    modalHeaderText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    modalBody: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 6 },
    formRow: { flexDirection: 'row', gap: 14 },
    formCol: { flex: 1 },
    label: { fontSize: 13, fontWeight: '600', color: COLORS.ink, marginBottom: 6, marginTop: 12 },
    req: { color: COLORS.danger },
    input: {
        borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12,
        height: 44, fontSize: 14, color: COLORS.ink, backgroundColor: '#fff',
    },
    textarea: { height: 84, paddingTop: 10, textAlignVertical: 'top' },
    pickerWrap: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, overflow: 'hidden' },
    picker: {
        height: 44,
        color: COLORS.ink,
        borderWidth: 0,
        backgroundColor: 'transparent',
        ...Platform.select({
            web: {
                outlineStyle: 'none',
            } as any
        })
    },

    viewRow: { flexDirection: 'row', gap: 20, marginBottom: 4 },
    viewCol: { flex: 1 },
    viewLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.orange,
        marginTop: 12,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    viewValue: { fontSize: 14, color: COLORS.ink, lineHeight: 20 },

    modalFooter: {
        flexDirection: 'row', justifyContent: 'center', gap: 10,
        paddingHorizontal: 18, paddingVertical: 16, borderTopWidth: 1, borderColor: COLORS.border,
    },
    cancelBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16,
        borderRadius: 10, backgroundColor: COLORS.dark,
    },
    cancelBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    closeBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16,
        borderRadius: 10, backgroundColor: COLORS.dark, alignSelf: 'flex-end',
    },
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
        pointerEvents: 'none',
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