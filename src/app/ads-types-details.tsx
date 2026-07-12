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
import { Picker } from '@react-native-picker/picker';
import React, { useMemo, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import BarChartFill from 'react-native-bootstrap-icons/icons/bar-chart-fill';
import BoxSeam from 'react-native-bootstrap-icons/icons/box-seam';
import CheckCircleFill from 'react-native-bootstrap-icons/icons/check-circle-fill';
import ChevronDown from 'react-native-bootstrap-icons/icons/chevron-down';
import ChevronRight from 'react-native-bootstrap-icons/icons/chevron-right';
import ChevronUp from 'react-native-bootstrap-icons/icons/chevron-up';
import CodeSlash from 'react-native-bootstrap-icons/icons/code-slash';
import ExclamationCircleFill from 'react-native-bootstrap-icons/icons/exclamation-circle-fill';
import EyeFill from 'react-native-bootstrap-icons/icons/eye-fill';
import GearFill from 'react-native-bootstrap-icons/icons/gear-fill';
import HouseDoorFill from 'react-native-bootstrap-icons/icons/house-door-fill';
import ImageFill from 'react-native-bootstrap-icons/icons/image-fill';
import ListUl from 'react-native-bootstrap-icons/icons/list-ul';
import PencilFill from 'react-native-bootstrap-icons/icons/pencil-fill';
import PlayCircleFill from 'react-native-bootstrap-icons/icons/play-circle-fill';
import PlusLg from 'react-native-bootstrap-icons/icons/plus-lg';
import Save2Fill from 'react-native-bootstrap-icons/icons/save2-fill';
import ShieldFillCheck from 'react-native-bootstrap-icons/icons/shield-fill-check';
import TrashFill from 'react-native-bootstrap-icons/icons/trash-fill';
import XLg from 'react-native-bootstrap-icons/icons/x-lg';

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

const SEED_AD_TYPES: AdType[] = [
    {
        id: 6,
        name: 'Banner Ads',
        category: 'Banner Ads',
        description: 'Static and animated banner advertisements for web display',
        techSpecs: 'Formats: JPG, PNG, GIF\nSizes: 728x90, 300x250, 160x600\nFile Size: Max 100KB\nAnimation: Max 5 seconds',
        requirements: 'High-quality images\nBrand-appropriate content\nNo misleading claims\nMobile-responsive design',
        status: 'Active',
        created: 'Oct 05, 2025',
    },
    {
        id: 7,
        name: 'Video Ads',
        category: 'Video Ads',
        description: 'Video advertisements for maximum engagement and reach',
        techSpecs: 'Formats: MP4, WebM\nDuration: 15-30 seconds\nResolution: 1920x1080, 1280x720\nFile Size: Max 10MB',
        requirements: 'Clear audio and visuals\nCaptioned for accessibility\nSkippable after 5 seconds\nBrand-safe content',
        status: 'Active',
        created: 'Oct 05, 2025',
    },
    {
        id: 8,
        name: 'Native Ads',
        category: 'Native Ads',
        description: 'Seamlessly integrated content advertisements that match platform design',
        techSpecs: 'Content: Text + Image\nHeadline: Max 60 characters\nDescription: Max 150 characters\nImage: 1200x630px',
        requirements: 'Matches platform tone\nClearly labeled as sponsored\nNo clickbait headlines\nHigh-resolution imagery',
        status: 'Active',
        created: 'Oct 05, 2025',
    },
    {
        id: 9,
        name: 'Social Media Ads',
        category: 'Social Media Ads',
        description: 'Advertisement posts for Instagram and Facebook platforms',
        techSpecs: 'Formats: JPG, PNG, MP4\nAspect Ratio: 1:1, 4:5, 9:16\nFile Size: Max 30MB\nCaption: Max 2200 characters',
        requirements: 'Follows platform ad policy\nEngaging opening frame\nCTA clearly visible\nNo excessive text on image',
        status: 'Active',
        created: 'Oct 05, 2025',
    },
    {
        id: 10,
        name: 'Search Ads',
        category: 'Search Ads',
        description: 'Pay-per-click advertisements in search results',
        techSpecs: 'Headline: Max 30 characters x3\nDescription: Max 90 characters x2\nDisplay URL: Max 15 characters\nExtensions: Sitelinks, Callouts',
        requirements: 'Relevant keywords\nAccurate landing page match\nNo trademark misuse\nCompliant with ad policies',
        status: 'Active',
        created: 'Oct 05, 2025',
    },
];

const OVERVIEW_CARDS: { key: string; Icon: React.ComponentType<any>; color: string; bg: string }[] = [
    { key: 'Banner Ads', Icon: ImageFill, color: '#EA580C', bg: '#FFF1E6' },
    { key: 'Video Ads', Icon: PlayCircleFill, color: '#16A34A', bg: '#E9FBF0' },
    { key: 'Native Ads', Icon: CodeSlash, color: '#CA8A04', bg: '#FEF9E7' },
];

// Palette
const COLORS = {
    header: '#1D324E',
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
    label: string; value: number | string; sub: string;
    bg: string; fg: string; Icon: React.ComponentType<any>; wide: boolean;
}> = ({ label, value, sub, bg, fg, Icon, wide }) => (
    <View style={[styles.statCard, { width: wide ? '23.5%' : '48%' }]}>
        <View style={[styles.statIconWrap, { backgroundColor: fg }]}>
            <Icon width={18} height={18} fill="#fff" />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statSub}>{sub}</Text>
    </View>
);

const Pill: React.FC<{ text: string; bg: string; fg: string }> = ({ text, bg, fg }) => (
    <View style={[styles.pill, { backgroundColor: bg }]}>
        <Text style={[styles.pillText, { color: fg }]}>{text}</Text>
    </View>
);

const SpecLine: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <View style={styles.specLine}>
        <CheckCircleFill width={12} height={12} fill={COLORS.orange} style={{ marginTop: 2 }} />
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
                            <XLg width={18} height={18} fill="#fff" />
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
                                <View style={styles.pickerWrap}>
                                    <Picker selectedValue={form.category} onValueChange={(v) => update('category', v as string)} style={styles.picker}>
                                        {CATEGORY_OPTIONS.map((c) => (
                                            <Picker.Item key={c} label={c} value={c} />
                                        ))}
                                    </Picker>
                                </View>
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
                        <View style={styles.pickerWrap}>
                            <Picker selectedValue={form.status} onValueChange={(v) => update('status', v as string)} style={styles.picker}>
                                {STATUS_OPTIONS.map((s) => (
                                    <Picker.Item key={s} label={s} value={s} />
                                ))}
                            </Picker>
                        </View>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                            <XLg width={13} height={13} fill="#fff" />
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                            <Save2Fill width={13} height={13} fill="#fff" />
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
                            <EyeFill width={16} height={16} fill="#fff" />
                            <Text style={styles.modalHeaderText}>Ad Type Details</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <XLg width={18} height={18} fill="#fff" />
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

                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <XLg width={13} height={13} fill="#fff" />
                            <Text style={styles.cancelBtnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
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
                        <TrashFill width={16} height={16} fill="#fff" />
                        <Text style={styles.modalHeaderText}>Delete Ad Type</Text>
                    </View>
                    <TouchableOpacity onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <XLg width={18} height={18} fill="#fff" />
                    </TouchableOpacity>
                </View>

                <View style={[styles.modalBody, { alignItems: 'center', paddingTop: 26 }]}>
                    <View style={styles.trashCircle}>
                        <TrashFill width={26} height={26} fill={COLORS.orange} />
                    </View>
                    <Text style={styles.confirmTitle}>Are you sure you want to delete this ad type?</Text>
                    <Text style={styles.confirmSub}>This action cannot be undone!</Text>
                </View>

                <View style={styles.modalFooter}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                        <XLg width={13} height={13} fill="#fff" />
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteConfirmBtn} onPress={onConfirm}>
                        <TrashFill width={13} height={13} fill="#fff" />
                        <Text style={styles.submitBtnText}>Delete Ad Type</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    </Modal>
);

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

    const [items, setItems] = useState<AdType[]>(SEED_AD_TYPES);
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 10;

    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);

    const paginatedItems = useMemo(() => {
        const start = (safePage - 1) * PAGE_SIZE;
        return items.slice(start, start + PAGE_SIZE);
    }, [items, safePage]);
    const [expandedOverview, setExpandedOverview] = useState<string | null>(null);

    const [formVisible, setFormVisible] = useState(false);
    const [editingItem, setEditingItem] = useState<AdType | null>(null);
    const [viewItem, setViewItem] = useState<AdType | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const stats = useMemo(() => {
        const total = items.length + 7; // demo total to mirror "12 Total Ad Types" seed screenshot
        const active = items.filter((i) => i.status === 'Active').length + 7;
        return { total, active, totalAds: 48, urgent: 5 };
    }, [items]);

    const overviewData = useMemo(
        () => OVERVIEW_CARDS.map((c) => ({ ...c, item: items.find((i) => i.name === c.key) })).filter((c) => c.item),
        [items]
    );

    // ---- CRUD ------------------------------------------------------------
    const openAdd = () => { setEditingItem(null); setFormVisible(true); };
    const openEdit = (item: AdType) => { setEditingItem(item); setFormVisible(true); };
    const closeForm = () => setFormVisible(false);

    const handleSubmit = (form: FormState) => {
        if (editingItem) {
            setItems((prev) => prev.map((i) => (i.id === editingItem.id ? { ...i, ...form } : i)));
        } else {
            const newId = items.length ? Math.max(...items.map((i) => i.id)) + 1 : 1;
            setItems((prev) => [
                { id: newId, ...form, created: 'Today' },
                ...prev,
            ]);
        }
        setFormVisible(false);
    };

    const requestDelete = (id: number) => setDeleteId(id);
    const cancelDelete = () => setDeleteId(null);
    const confirmDelete = () => {
        if (deleteId != null) setItems((prev) => prev.filter((i) => i.id !== deleteId));
        setDeleteId(null);
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
            <Text style={[styles.cell, { width: 44, color: COLORS.sub }]}>{item.id}</Text>
            <Text style={[styles.cell, { width: 130, fontWeight: '700' }]} numberOfLines={1}>{item.name}</Text>
            <View style={[styles.cell, { width: 120 }]}>
                <Pill text={item.category} bg={COLORS.blueBg} fg={COLORS.blueText} />
            </View>
            <Text style={[styles.cell, { width: 260, color: COLORS.sub }]} numberOfLines={2}>{item.description}</Text>
            <View style={[styles.cell, { width: 90 }]}>
                <Pill text={item.status} bg={item.status === 'Active' ? COLORS.greenBg : COLORS.redBg} fg={item.status === 'Active' ? COLORS.greenText : COLORS.redText} />
            </View>
            <Text style={[styles.cell, { width: 100, color: COLORS.sub, fontSize: 12 }]}>{item.created}</Text>
            <View style={[styles.cell, { width: 120, flexDirection: 'row', gap: 6 }]}>
                <TouchableOpacity style={styles.viewBtn} onPress={() => setViewItem(item)}>
                    <EyeFill width={13} height={13} fill="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                    <PencilFill width={13} height={13} fill="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => requestDelete(item.id)}>
                    <TrashFill width={13} height={13} fill="#fff" />
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
                    <EyeFill width={13} height={13} fill="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                    <PencilFill width={13} height={13} fill="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => requestDelete(item.id)}>
                    <TrashFill width={13} height={13} fill="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.screen}>
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
                {/* ---------- Header: title + Add button in ONE #1D324E container ---------- */}
                <View style={[styles.headerContainer, isPhone && { flexDirection: 'column', alignItems: 'flex-start', gap: 14 }]}>
                    <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <GearFill width={isPhone ? 18 : 22} height={isPhone ? 18 : 22} fill="#fff" />
                            <Text style={[styles.title, isPhone && { fontSize: 19 }]}>Ads Types & Details Management</Text>
                        </View>
                        <View style={styles.breadcrumbRow}>
                            <HouseDoorFill width={11} height={11} fill={COLORS.orange} />
                            <Text style={styles.breadcrumbActive}> Dashboard</Text>
                            <ChevronRight width={9} height={9} fill="#94A3B8" style={{ marginHorizontal: 4 }} />
                            <Text style={styles.breadcrumbActive}>Ads</Text>
                            <ChevronRight width={9} height={9} fill="#94A3B8" style={{ marginHorizontal: 4 }} />
                            <Text style={styles.breadcrumbCurrent}>Ads Types & Details</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={[styles.addBtn, isPhone && { alignSelf: 'stretch', justifyContent: 'center' }]} onPress={openAdd}>
                        <PlusLg width={14} height={14} fill="#fff" />
                        <Text style={styles.addBtnText}>Add New Ad Type</Text>
                    </TouchableOpacity>
                </View>

                {/* ---------- Stat cards ---------- */}
                <View style={styles.statsRow}>
                    <StatCard label="Total Ad Types" value={stats.total} sub="All active ad types" bg="#F5F3FF" fg="#7C3AED" Icon={BoxSeam} wide={statsWide} />
                    <StatCard label="Active Ad Types" value={stats.active} sub="Currently active" bg="#E9FBF0" fg="#16A34A" Icon={ShieldFillCheck} wide={statsWide} />
                    <StatCard label="Total Ads" value={stats.totalAds} sub="Across all types" bg="#E0F2FE" fg="#0284C7" Icon={BarChartFill} wide={statsWide} />
                    <StatCard label="Urgent Review" value={stats.urgent} sub="Require attention" bg="#FEE2E2" fg="#DC2626" Icon={ExclamationCircleFill} wide={statsWide} />
                </View>

                {/* ---------- Specifications overview ---------- */}
                <View style={styles.sectionBanner}>
                    <ListUl width={14} height={14} fill="#fff" />
                    <Text style={styles.sectionBannerText}>Ad Types & Specifications Overview</Text>
                </View>

                <View style={styles.overviewCard}>
                    {isPhone ? (
                        overviewData.map(({ key, Icon, color, bg, item }) => {
                            const open = expandedOverview === key;
                            return (
                                <View key={key} style={styles.accordionItem}>
                                    <TouchableOpacity
                                        style={styles.accordionHeader}
                                        onPress={() => setExpandedOverview(open ? null : key)}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                            <View style={[styles.overviewIconWrap, { backgroundColor: bg }]}>
                                                <Icon width={16} height={16} fill={color} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.overviewTitle}>{key}</Text>
                                                <Text style={styles.overviewDesc} numberOfLines={1}>{item!.description}</Text>
                                            </View>
                                        </View>
                                        {open ? (
                                            <ChevronUp width={14} height={14} fill={COLORS.sub} />
                                        ) : (
                                            <ChevronDown width={14} height={14} fill={COLORS.sub} />
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
                            {overviewData.map(({ key, Icon, color, bg, item }) => (
                                <View key={key} style={[styles.overviewFullCard, { width: overviewCols === 3 ? '31.8%' : overviewCols === 2 ? '48%' : '100%' }]}>
                                    <View style={[styles.overviewIconCircle, { backgroundColor: color }]}>
                                        <Icon width={20} height={20} fill="#fff" />
                                    </View>
                                    <Text style={styles.overviewCardTitle}>{key}</Text>
                                    <Text style={styles.overviewCardDesc}>{item!.description}</Text>
                                    <View style={{ marginTop: 10, width: '100%' }}>
                                        {parseSpecs(item!.techSpecs).map((s, idx) => (
                                            <SpecLine key={idx} label={s.label} value={s.value} />
                                        ))}
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* ---------- Management table ---------- */}
                <View style={styles.sectionBanner}>
                    <ListUl width={14} height={14} fill="#fff" />
                    <Text style={styles.sectionBannerText}>Ad Types & Details Management</Text>
                </View>

                <View style={styles.dataCard}>
                    {isPhone ? (
                        <FlatList
                            data={paginatedItems}
                            keyExtractor={(i) => String(i.id)}
                            renderItem={renderMobileCard}
                            scrollEnabled={false}
                            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                        />
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={isTablet}>
                            <View>
                                <View style={styles.tableHeader}>
                                    <Text style={[styles.headCell, { width: 44 }]}>ID</Text>
                                    <Text style={[styles.headCell, { width: 130 }]}>Name</Text>
                                    <Text style={[styles.headCell, { width: 120 }]}>Category</Text>
                                    <Text style={[styles.headCell, { width: 260 }]}>Description</Text>
                                    <Text style={[styles.headCell, { width: 90 }]}>Status</Text>
                                    <Text style={[styles.headCell, { width: 100 }]}>Created</Text>
                                    <Text style={[styles.headCell, { width: 120 }]}>Action</Text>
                                </View>
                                <FlatList
                                    data={paginatedItems}
                                    keyExtractor={(i) => String(i.id)}
                                    renderItem={renderTableRow}
                                    scrollEnabled={false}
                                />
                            </View>
                        </ScrollView>
                    )}
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
    screen: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16, paddingTop: 16 },

    headerContainer: {
        backgroundColor: COLORS.header, borderRadius: 14, padding: 18,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
    },
    title: { fontSize: 22, fontWeight: '800', color: '#fff' },
    breadcrumbRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, flexWrap: 'wrap' },
    breadcrumbActive: { color: COLORS.orange, fontSize: 12.5, fontWeight: '600' },
    breadcrumbCurrent: { color: '#CBD5E1', fontSize: 12.5 },

    addBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.orange,
        paddingVertical: 11, paddingHorizontal: 18, borderRadius: 10,
    },
    addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: '2%', marginBottom: 16, rowGap: 12 },
    statCard: {
        backgroundColor: COLORS.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border,
    },
    statIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    statValue: { fontSize: 22, fontWeight: '800', color: COLORS.ink },
    statLabel: { fontSize: 12.5, fontWeight: '700', color: COLORS.ink, marginTop: 2 },
    statSub: { fontSize: 11, color: COLORS.sub, marginTop: 2 },

    sectionBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.orange,
        borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 12,
    },
    sectionBannerText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    overviewCard: { backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 14, marginBottom: 16 },

    overviewFullCard: {
        backgroundColor: '#FAFAFA', borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 16, alignItems: 'center',
    },
    overviewIconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    overviewCardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.ink, marginBottom: 4 },
    overviewCardDesc: { fontSize: 12, color: COLORS.sub, textAlign: 'center' },

    accordionItem: { borderBottomWidth: 1, borderColor: COLORS.border },
    accordionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
    overviewIconWrap: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    overviewTitle: { fontSize: 13.5, fontWeight: '700', color: COLORS.ink },
    overviewDesc: { fontSize: 11.5, color: COLORS.sub },
    accordionBody: { paddingBottom: 12, paddingLeft: 4 },

    specLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 5 },
    specLineText: { fontSize: 12, color: COLORS.ink, flexShrink: 1 },

    dataCard: { backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 12 },
    tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderColor: COLORS.border, paddingBottom: 10, marginBottom: 4 },
    headCell: { fontSize: 12, fontWeight: '700', color: COLORS.sub, paddingHorizontal: 4 },
    tableRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#F1F2F4' },
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
    picker: { height: 44, color: COLORS.ink },

    viewRow: { flexDirection: 'row', gap: 20, marginBottom: 4 },
    viewCol: { flex: 1 },
    viewLabel: { fontSize: 12, fontWeight: '700', color: COLORS.sub, marginTop: 12, marginBottom: 4, textTransform: 'uppercase' },
    viewValue: { fontSize: 14, color: COLORS.ink, lineHeight: 20 },

    modalFooter: {
        flexDirection: 'row', justifyContent: 'flex-end', gap: 10,
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
});