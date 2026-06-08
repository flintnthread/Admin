import React, { useState } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    TextInput,
    Modal,
    Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import AdminLayout from "@/components/admin-layout";

// ─── THEME ────────────────────────────────────────────────────────────────────
const T = {
    orange: "#E8631A",
    orangeLight: "#FEF0E6",
    orangeMid: "#FDDBB9",
    navy: "#0F1F5C",
    navyLight: "#E8EBF7",
    bg: "#F7F5F2",
    card: "#FFFFFF",
    border: "#EAE5DC",
    textH: "#1A1208",
    textB: "#5A4433",
    textM: "#7A6858",
    textHint: "#B5A898",
    red: "#DC2626",
    redBg: "#FEF2F2",
    green: "#15803D",
    greenBg: "#F0FDF4",
    white: "#FFFFFF",
};

// ─── DEPT COLOR / ICON MAPS ───────────────────────────────────────────────────
type ColorKey = "orange" | "navy";
const DEPT_COLOR: Record<string, ColorKey> = {
    Finance: "orange",
    Technology: "navy",
    Marketing: "orange",
    Sales: "navy",
    Operations: "navy",
    "Human Resources": "orange",
    "Customer Support": "navy",
};

type FeatherName = React.ComponentProps<typeof Feather>["name"];
const DEPT_ICONS: Record<string, FeatherName> = {
    Finance: "dollar-sign",
    Technology: "cpu",
    Marketing: "trending-up",
    Sales: "briefcase",
    Operations: "settings",
    "Human Resources": "users",
    "Customer Support": "headphones",
};

const getColorKey = (name: string): ColorKey => DEPT_COLOR[name] || "orange";
const getIcon = (name: string): FeatherName => DEPT_ICONS[name] || "folder";

const STRIPE_COLOR: Record<ColorKey, string> = {
    orange: T.orange,
    navy: T.navy,
};
const ICON_BG: Record<ColorKey, string> = {
    orange: T.orangeLight,
    navy: T.navyLight,
};
const ICON_FG: Record<ColorKey, string> = {
    orange: T.orange,
    navy: T.navy,
};

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Department {
    id: number;
    name: string;
    description: string;
    jobs: number;
    createdAt: string;
    status: "Active" | "Inactive";
}

// ─── SEED DATA ────────────────────────────────────────────────────────────────
const SEED: Department[] = [
    { id: 1, name: "Finance", description: "Detail-oriented financial management and accounting.", jobs: 1, createdAt: "29 Dec, 2025", status: "Active" },
    { id: 2, name: "Technology", description: "Software development, IT infrastructure & technical roles.", jobs: 0, createdAt: "19 Nov, 2025", status: "Active" },
    { id: 3, name: "Marketing", description: "Digital marketing, branding and growth strategies.", jobs: 4, createdAt: "19 Nov, 2025", status: "Active" },
    { id: 4, name: "Sales", description: "Business development and customer relations.", jobs: 0, createdAt: "19 Nov, 2025", status: "Active" },
    { id: 5, name: "Operations", description: "Operations management and logistics.", jobs: 0, createdAt: "19 Nov, 2025", status: "Active" },
    { id: 6, name: "Human Resources", description: "Talent acquisition and employee management.", jobs: 0, createdAt: "19 Nov, 2025", status: "Active" },
    { id: 7, name: "Customer Support", description: "Customer service and support roles.", jobs: 2, createdAt: "19 Nov, 2025", status: "Active" },
];

// ─────────────────────────────────────────────────────────────────────────────
// DELETE CONFIRM MODAL
// ─────────────────────────────────────────────────────────────────────────────
const ConfirmModal: React.FC<{
    visible: boolean;
    dept: Department | null;
    onCancel: () => void;
    onConfirm: () => void;
}> = ({ visible, dept, onCancel, onConfirm }) => (
    <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onCancel}
    >
        <View style={cm.overlay}>
            <View style={cm.box}>
                {/* Icon */}
                <View style={cm.iconWrap}>
                    <Feather name="trash-2" size={26} color={T.red} />
                </View>

                <Text style={cm.title}>Delete Department?</Text>

                <Text style={cm.msg}>
                    You're about to permanently remove{" "}
                    <Text style={{ fontWeight: "700", color: T.textH }}>{dept?.name}</Text>.
                    {" "}This action cannot be undone and will affect all related data.
                </Text>

                <View style={cm.divider} />

                <View style={cm.row}>
                    <TouchableOpacity style={cm.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
                        <Text style={cm.cancelTxt}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={cm.deleteBtn} onPress={onConfirm} activeOpacity={0.8}>
                        <Feather name="trash-2" size={14} color="#fff" />
                        <Text style={cm.deleteTxt}>Delete</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    </Modal>
);

const cm = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(10,5,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 28,
    },
    box: {
        backgroundColor: T.card,
        borderRadius: 22,
        padding: 24,
        width: "100%",
        maxWidth: 380,
    },
    iconWrap: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: T.redBg,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: "800",
        color: T.textH,
        marginBottom: 10,
        letterSpacing: -0.4,
    },
    msg: {
        fontSize: 13,
        color: T.textM,
        lineHeight: 20,
    },
    divider: {
        height: 1,
        backgroundColor: T.border,
        marginVertical: 20,
    },
    row: {
        flexDirection: "row",
        gap: 10,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 11,
        backgroundColor: T.bg,
        borderWidth: 1,
        borderColor: T.border,
        alignItems: "center",
    },
    cancelTxt: {
        fontSize: 13,
        fontWeight: "700",
        color: T.textM,
    },
    deleteBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        paddingVertical: 12,
        borderRadius: 11,
        backgroundColor: T.red,
    },
    deleteTxt: {
        fontSize: 13,
        fontWeight: "800",
        color: "#fff",
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// EDIT / ADD MODAL
// ─────────────────────────────────────────────────────────────────────────────
const EditModal: React.FC<{
    visible: boolean;
    dept: Department | null;
    onCancel: () => void;
    onSave: (d: Department) => void;
}> = ({ visible, dept, onCancel, onSave }) => {
    const [name, setName] = useState(dept?.name ?? "");
    const [desc, setDesc] = useState(dept?.description ?? "");

    React.useEffect(() => {
        if (dept) { setName(dept.name); setDesc(dept.description); }
        else { setName(""); setDesc(""); }
    }, [dept, visible]);

    const isAdd = !dept;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onCancel}
        >
            <View style={em.overlay}>
                <View style={em.sheet}>
                    <View style={em.handle} />

                    {/* Header */}
                    <View style={em.header}>
                        <View>
                            <Text style={em.title}>{isAdd ? "Add Department" : "Edit Department"}</Text>
                            <Text style={em.sub}>Fill in the details below</Text>
                        </View>
                        <TouchableOpacity style={em.closeBtn} onPress={onCancel}>
                            <Feather name="x" size={15} color={T.textB} />
                        </TouchableOpacity>
                    </View>

                    <View style={em.body}>
                        {/* Name field */}
                        <Text style={em.label}>Department Name</Text>
                        <View style={em.fieldWrap}>
                            <Feather name="grid" size={15} color={T.orange} />
                            <TextInput
                                style={em.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="e.g. Engineering"
                                placeholderTextColor={T.textHint}
                            />
                        </View>

                        {/* Description field */}
                        <Text style={em.label}>Description</Text>
                        <View style={[em.fieldWrap, { alignItems: "flex-start", paddingTop: 11 }]}>
                            <Feather name="align-left" size={15} color={T.orange} style={{ marginTop: 1 }} />
                            <TextInput
                                style={[em.input, { height: 80, textAlignVertical: "top" }]}
                                value={desc}
                                onChangeText={setDesc}
                                placeholder="Brief description of this department…"
                                placeholderTextColor={T.textHint}
                                multiline
                            />
                        </View>

                        <View style={em.divider} />

                        {/* Footer */}
                        <View style={em.footer}>
                            <TouchableOpacity style={em.cancelBtn} onPress={onCancel}>
                                <Text style={em.cancelTxt}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={em.saveBtn}
                                onPress={() => {
                                    const trimName = name.trim();
                                    const trimDesc = desc.trim();
                                    if (!trimName) return;
                                    if (dept) {
                                        onSave({ ...dept, name: trimName, description: trimDesc || dept.description });
                                    } else {
                                        const newDept: Department = {
                                            id: Date.now(),
                                            name: trimName,
                                            description: trimDesc,
                                            jobs: 0,
                                            createdAt: new Date().toLocaleDateString("en-GB", {
                                                day: "numeric", month: "short", year: "numeric"
                                            }),
                                            status: "Active",
                                        };
                                        onSave(newDept);
                                    }
                                }}
                            >
                                <Feather name="check" size={15} color="#fff" />
                                <Text style={em.saveTxt}>Save Changes</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const em = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(10,5,0,0.5)",
        justifyContent: "flex-end",
    },
    sheet: {
        backgroundColor: T.card,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingBottom: 36,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: T.border,
        alignSelf: "center",
        marginTop: 12,
    },
    header: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        padding: 20,
        paddingBottom: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: "800",
        color: T.textH,
        letterSpacing: -0.4,
    },
    sub: {
        fontSize: 12,
        color: T.textHint,
        marginTop: 3,
        fontWeight: "500",
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 9,
        backgroundColor: T.bg,
        alignItems: "center",
        justifyContent: "center",
    },
    body: {
        paddingHorizontal: 20,
    },
    label: {
        fontSize: 11,
        fontWeight: "700",
        color: T.textB,
        textTransform: "uppercase",
        letterSpacing: 0.6,
        marginBottom: 8,
        marginTop: 16,
    },
    fieldWrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: T.bg,
        borderRadius: 11,
        paddingHorizontal: 13,
        paddingVertical: 11,
        borderWidth: 1.5,
        borderColor: T.border,
    },
    input: {
        flex: 1,
        fontSize: 13,
        color: T.textH,
    },
    divider: {
        height: 1,
        backgroundColor: T.border,
        marginTop: 24,
        marginBottom: 16,
    },
    footer: {
        flexDirection: "row",
        gap: 10,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 11,
        backgroundColor: T.bg,
        borderWidth: 1,
        borderColor: T.border,
        alignItems: "center",
    },
    cancelTxt: {
        fontSize: 13,
        fontWeight: "700",
        color: T.textM,
    },
    saveBtn: {
        flex: 2,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 12,
        borderRadius: 11,
        backgroundColor: T.orange,
    },
    saveTxt: {
        fontSize: 13,
        fontWeight: "800",
        color: "#fff",
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────────────────────
const StatCard: React.FC<{
    icon: FeatherName;
    value: number;
    label: string;
    iconBg: string;
    iconFg: string;
}> = ({ icon, value, label, iconBg, iconFg }) => (
    <View style={sc.card}>
        <View style={[sc.iconWrap, { backgroundColor: iconBg }]}>
            <Feather name={icon} size={16} color={iconFg} />
        </View>
        <Text style={sc.value}>{value}</Text>
        <Text style={sc.label}>{label}</Text>
    </View>
);

const sc = StyleSheet.create({
    card: {
        flex: 1,
        backgroundColor: T.card,
        borderRadius: 14,
        padding: 14,
        alignItems: "center",
        borderWidth: 1,
        borderColor: T.border,
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    value: {
        fontSize: 20,
        fontWeight: "800",
        color: T.textH,
        letterSpacing: -0.5,
    },
    label: {
        fontSize: 9,
        fontWeight: "600",
        color: T.textHint,
        marginTop: 3,
        textTransform: "uppercase",
        letterSpacing: 0.4,
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// DEPARTMENT CARD
// ─────────────────────────────────────────────────────────────────────────────
const DeptCard: React.FC<{
    dept: Department;
    onEdit: () => void;
    onDelete: () => void;
}> = ({ dept, onEdit, onDelete }) => {
    const colorKey = getColorKey(dept.name);
    const icon = getIcon(dept.name);
    const stripeBg = STRIPE_COLOR[colorKey];
    const iconBg = ICON_BG[colorKey];
    const iconFg = ICON_FG[colorKey];

    return (
        <View style={dc.card}>
            {/* Top color stripe */}
            <View style={[dc.stripe, { backgroundColor: stripeBg }]} />

            <View style={dc.body}>
                {/* Icon + actions row */}
                <View style={dc.topRow}>
                    <View style={[dc.iconWrap, { backgroundColor: iconBg }]}>
                        <Feather name={icon} size={20} color={iconFg} />
                    </View>
                    <View style={dc.actions}>
                        <TouchableOpacity style={dc.actBtn} onPress={onEdit} activeOpacity={0.8}>
                            <Feather name="edit-2" size={13} color={T.textM} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[dc.actBtn, { borderColor: "#FCA5A5" }]}
                            onPress={onDelete}
                            activeOpacity={0.8}
                        >
                            <Feather name="trash-2" size={13} color={T.red} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Name & description */}
                <Text style={dc.name}>{dept.name}</Text>
                <Text style={dc.desc} numberOfLines={2}>{dept.description}</Text>

                {/* Footer meta */}
                <View style={dc.footer}>
                    <View style={dc.metaItem}>
                        <Feather name="briefcase" size={11} color={T.textHint} />
                        <Text style={dc.metaTxt}>{dept.jobs} {dept.jobs === 1 ? "Job" : "Jobs"}</Text>
                    </View>
                    <View style={dc.metaItem}>
                        <Feather name="calendar" size={11} color={T.textHint} />
                        <Text style={dc.metaTxt}>{dept.createdAt}</Text>
                    </View>
                    <View style={[
                        dc.statusBadge,
                        { backgroundColor: dept.status === "Active" ? T.greenBg : T.redBg }
                    ]}>
                        <View style={[
                            dc.statusDot,
                            { backgroundColor: dept.status === "Active" ? T.green : T.red }
                        ]} />
                        <Text style={[
                            dc.statusTxt,
                            { color: dept.status === "Active" ? T.green : T.red }
                        ]}>
                            {dept.status}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

const dc = StyleSheet.create({
    card: {
        backgroundColor: T.card,
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: T.border,
        shadowColor: "#1A1208",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
        elevation: 3,
    },
    stripe: {
        height: 4,
        width: "100%",
    },
    body: {
        padding: 16,
    },
    topRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    iconWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    actions: {
        flexDirection: "row",
        gap: 6,
    },
    actBtn: {
        width: 30,
        height: 30,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: T.border,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: T.card,
    },
    name: {
        fontSize: 15,
        fontWeight: "800",
        color: T.textH,
        letterSpacing: -0.3,
        marginBottom: 5,
    },
    desc: {
        fontSize: 12,
        color: T.textHint,
        lineHeight: 18,
        fontWeight: "400",
        marginBottom: 14,
    },
    footer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: T.border,
        flexWrap: "wrap",
    },
    metaItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: T.bg,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    metaTxt: {
        fontSize: 11,
        color: T.textM,
        fontWeight: "500",
    },
    statusBadge: {
        marginLeft: "auto",
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 20,
    },
    statusDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
    },
    statusTxt: {
        fontSize: 10,
        fontWeight: "800",
        textTransform: "uppercase",
        letterSpacing: 0.3,
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
const DepartmentsScreen: React.FC = () => {
    const [departments, setDepartments] = useState<Department[]>(SEED);
    const [search, setSearch] = useState("");
    const [editTarget, setEditTarget] = useState<Department | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
    const [addOpen, setAddOpen] = useState(false);

    const isWeb = Platform.OS === "web";

    const filtered = departments.filter(d =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.description.toLowerCase().includes(search.toLowerCase())
    );

    const totalJobs = departments.reduce((s, d) => s + d.jobs, 0);
    const activeCount = departments.filter(d => d.status === "Active").length;

    const handleSave = (updated: Department) => {
        if (departments.find(d => d.id === updated.id)) {
            setDepartments(prev => prev.map(d => d.id === updated.id ? updated : d));
        } else {
            setDepartments(prev => [...prev, updated]);
        }
        setEditTarget(null);
        setAddOpen(false);
    };

    const handleDelete = () => {
        if (!deleteTarget) return;
        setDepartments(prev => prev.filter(d => d.id !== deleteTarget.id));
        setDeleteTarget(null);
    };

    const Container = isWeb ? View : SafeAreaView;

    const MainContent = (
        <Container style={s.safe}>
            <StatusBar barStyle="dark-content" backgroundColor={T.bg} />

            {/* ── TOP BAR ── */}
            <View style={s.topBar}>
                <View style={s.topBarLeft}>
                    {/* Breadcrumb */}
                    <View style={s.crumb}>
                        <Text style={s.crumbItem}>Dashboard</Text>
                        <Feather name="chevron-right" size={12} color={T.textHint} />
                        <Text style={s.crumbItem}>Careers</Text>
                        <Feather name="chevron-right" size={12} color={T.textHint} />
                        <Text style={[s.crumbItem, { color: T.textH, fontWeight: "600" }]}>Departments</Text>
                    </View>
                </View>
                <View style={s.topBarRight}>
                    <TouchableOpacity style={s.iconBtn}>
                        <Feather name="bell" size={16} color={T.textM} />
                    </TouchableOpacity>
                    <TouchableOpacity style={s.iconBtn}>
                        <Feather name="help-circle" size={16} color={T.textM} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={s.scroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* ── PAGE HEADER ── */}
                <View style={s.pageHead}>
                    <View style={s.pageHeadLeft}>
                        <View style={s.pageTag}>
                            <Feather name="grid" size={11} color={T.orange} />
                            <Text style={s.pageTagTxt}>Departments</Text>
                        </View>
                        <Text style={s.pageTitle}>Manage Departments</Text>
                        <Text style={s.pageSub}>Organize your workforce by department structure</Text>
                    </View>
                    <TouchableOpacity style={s.addBtn} onPress={() => setAddOpen(true)} activeOpacity={0.85}>
                        <Feather name="plus" size={15} color="#fff" />
                        <Text style={s.addBtnTxt}>Add Department</Text>
                    </TouchableOpacity>
                </View>

                {/* ── STATS STRIP ── */}
                <View style={s.statsRow}>
                    <StatCard
                        icon="grid"
                        value={departments.length}
                        label="Total"
                        iconBg={T.orangeLight}
                        iconFg={T.orange}
                    />
                    <StatCard
                        icon="check-circle"
                        value={activeCount}
                        label="Active"
                        iconBg={T.navyLight}
                        iconFg={T.navy}
                    />
                    <StatCard
                        icon="briefcase"
                        value={totalJobs}
                        label="Open Jobs"
                        iconBg={T.greenBg}
                        iconFg={T.green}
                    />
                </View>

                {/* ── SEARCH + FILTERS ── */}
                <View style={s.toolBar}>
                    <View style={s.searchBox}>
                        <Feather name="search" size={15} color={T.textHint} />
                        <TextInput
                            style={s.searchInput}
                            placeholder="Search departments…"
                            placeholderTextColor={T.textHint}
                            value={search}
                            onChangeText={setSearch}
                        />
                        {search.length > 0 && (
                            <TouchableOpacity onPress={() => setSearch("")}>
                                <Feather name="x-circle" size={15} color={T.textHint} />
                            </TouchableOpacity>
                        )}
                    </View>
                    <View style={s.filterGroup}>
                        <TouchableOpacity style={s.filterBtn}>
                            <Feather name="sliders" size={13} color={T.textM} />
                            <Text style={s.filterBtnTxt}>Filter</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.filterBtn}>
                            <Feather name="arrow-up" size={13} color={T.textM} />
                            <Text style={s.filterBtnTxt}>Sort</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── COUNT LINE ── */}
                <Text style={s.countLine}>
                    <Text style={{ color: T.orange, fontWeight: "700" }}>{filtered.length}</Text>
                    {" "}of {departments.length} departments
                </Text>

                {/* ── CARDS GRID ── */}
                {filtered.length === 0 ? (
                    <View style={s.empty}>
                        <View style={s.emptyIcon}>
                            <Feather name="inbox" size={30} color={T.textHint} />
                        </View>
                        <Text style={s.emptyTitle}>No departments found</Text>
                        <Text style={s.emptySub}>Try adjusting your search</Text>
                    </View>
                ) : (
                    <View style={isWeb
                        ? { flexDirection: "row", flexWrap: "wrap", gap: 14 }
                        : { gap: 12 }
                    }>
                        {filtered.map(dept => (
                            <View
                                key={dept.id}
                                style={isWeb ? { width: "calc(25% - 11px)" as any } : undefined}
                            >
                                <DeptCard
                                    dept={dept}
                                    onEdit={() => setEditTarget(dept)}
                                    onDelete={() => setDeleteTarget(dept)}
                                />
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* ── MODALS ── */}
            <EditModal
                visible={!!editTarget}
                dept={editTarget}
                onCancel={() => setEditTarget(null)}
                onSave={handleSave}
            />
            <EditModal
                visible={addOpen}
                dept={null}
                onCancel={() => setAddOpen(false)}
                onSave={handleSave}
            />
            <ConfirmModal
                visible={!!deleteTarget}
                dept={deleteTarget}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
            />
        </Container>
    );

    return <AdminLayout>{MainContent}</AdminLayout>;
};

export default DepartmentsScreen;

// ─────────────────────────────────────────────────────────────────────────────
// MAIN STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    safe: {
        flex: 1,
        height: "100%",
        backgroundColor: T.bg,
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    },

    // ── Top Bar ──
    topBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: T.card,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: T.border,
    },
    topBarLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    crumb: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    crumbItem: {
        fontSize: 12,
        color: T.textHint,
        fontWeight: "400",
    },
    topBarRight: {
        flexDirection: "row",
        gap: 8,
    },
    iconBtn: {
        width: 34,
        height: 34,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: T.border,
        backgroundColor: T.card,
        alignItems: "center",
        justifyContent: "center",
    },

    // ── Scroll / content ──
    scroll: {
        padding: 18,
        paddingBottom: 48,
        gap: 14,
    },

    // ── Page Header ──
    pageHead: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
    },
    pageHeadLeft: {
        flex: 1,
    },
    pageTag: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: T.orangeLight,
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        marginBottom: 8,
    },
    pageTagTxt: {
        fontSize: 11,
        fontWeight: "700",
        color: T.orange,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    pageTitle: {
        fontSize: 22,
        fontWeight: "800",
        color: T.textH,
        letterSpacing: -0.5,
        lineHeight: 26,
    },
    pageSub: {
        fontSize: 12,
        color: T.textHint,
        marginTop: 4,
        fontWeight: "400",
    },
    addBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        backgroundColor: T.orange,
        paddingHorizontal: 16,
        paddingVertical: 11,
        borderRadius: 11,
        flexShrink: 0,
    },
    addBtnTxt: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "800",
        letterSpacing: -0.2,
    },

    // ── Stats ──
    statsRow: {
        flexDirection: "row",
        gap: 10,
    },

    // ── Toolbar ──
    toolBar: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    searchBox: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 9,
        backgroundColor: T.card,
        borderRadius: 11,
        paddingHorizontal: 13,
        paddingVertical: 11,
        borderWidth: 1.5,
        borderColor: T.border,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        color: T.textH,
    },
    filterGroup: {
        flexDirection: "row",
        gap: 8,
    },
    filterBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: T.border,
        backgroundColor: T.card,
    },
    filterBtnTxt: {
        fontSize: 12,
        fontWeight: "500",
        color: T.textM,
    },

    // ── Count line ──
    countLine: {
        fontSize: 12,
        color: T.textHint,
        fontWeight: "400",
    },

    // ── Empty state ──
    empty: {
        alignItems: "center",
        paddingVertical: 56,
        gap: 8,
    },
    emptyIcon: {
        width: 64,
        height: 64,
        borderRadius: 18,
        backgroundColor: T.card,
        borderWidth: 1,
        borderColor: T.border,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 6,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: T.textM,
    },
    emptySub: {
        fontSize: 12,
        color: T.textHint,
    },
});