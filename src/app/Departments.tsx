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
    Alert,
    Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";

// ─── THEME ────────────────────────────────────────────────────────────────────
const T = {
    primary:  "#ef7b1a",
    pDark:    "#b85a0d",
    pLight:   "#fff4eb",
    pMid:     "#fde8cc",
    bg:       "#f6f4f1",
    card:     "#ffffff",
    border:   "#ede5db",
    textH:    "#1a100a",
    textB:    "#5a4433",
    textM:    "#a08878",
    red:      "#e53e3e",
    redBg:    "#fff5f5",
    green:    "#16a34a",
    greenBg:  "#f0fdf4",
    white:    "#ffffff",
};

// ─── DEPARTMENT ICON COLORS ───────────────────────────────────────────────────
const DEPT_COLORS: Record<string, string> = {
    Finance:          "#ef7b1a",
    Technology:       "#6366f1",
    Marketing:        "#ec4899",
    Sales:            "#10b981",
    Operations:       "#f59e0b",
    "Human Resources":"#8b5cf6",
    "Customer Support":"#0ea5e9",
};

const getColor = (name: string) =>
    DEPT_COLORS[name] || T.primary;

// ─── ICON MAP ─────────────────────────────────────────────────────────────────
type FeatherName = React.ComponentProps<typeof Feather>["name"];
const DEPT_ICONS: Record<string, FeatherName> = {
    Finance:          "dollar-sign",
    Technology:       "cpu",
    Marketing:        "trending-up",
    Sales:            "briefcase",
    Operations:       "settings",
    "Human Resources":"users",
    "Customer Support":"headphones",
};
const getIcon = (name: string): FeatherName =>
    DEPT_ICONS[name] || "folder";

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
    { id: 1, name: "Finance",          description: "Detail-oriented financial management and accounting.",      jobs: 1, createdAt: "29 Dec, 2025", status: "Active" },
    { id: 2, name: "Technology",       description: "Software development, IT infrastructure & technical roles.", jobs: 0, createdAt: "19 Nov, 2025", status: "Active" },
    { id: 3, name: "Marketing",        description: "Digital marketing, branding and growth strategies.",         jobs: 4, createdAt: "19 Nov, 2025", status: "Active" },
    { id: 4, name: "Sales",            description: "Business development and customer relations.",               jobs: 0, createdAt: "19 Nov, 2025", status: "Active" },
    { id: 5, name: "Operations",       description: "Operations management and logistics.",                       jobs: 0, createdAt: "19 Nov, 2025", status: "Active" },
    { id: 6, name: "Human Resources",  description: "Talent acquisition and employee management.",               jobs: 0, createdAt: "19 Nov, 2025", status: "Active" },
    { id: 7, name: "Customer Support", description: "Customer service and support roles.",                       jobs: 2, createdAt: "19 Nov, 2025", status: "Active" },
];

// ─── CONFIRM MODAL ────────────────────────────────────────────────────────────
const ConfirmModal: React.FC<{
    visible: boolean;
    dept: Department | null;
    onCancel: () => void;
    onConfirm: () => void;
}> = ({ visible, dept, onCancel, onConfirm }) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
        <View style={cm.overlay}>
            <View style={cm.box}>
                <View style={cm.iconWrap}>
                    <Feather name="trash-2" size={28} color={T.red} />
                </View>
                <Text style={cm.title}>Delete Department?</Text>
                <Text style={cm.sub}>
                    <Text style={{ fontWeight: "700", color: T.textH }}>{dept?.name}</Text>
                    {" "}will be permanently removed. This action cannot be undone.
                </Text>
                <View style={cm.row}>
                    <TouchableOpacity style={cm.cancel} onPress={onCancel}>
                        <Text style={cm.cancelTxt}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={cm.confirm} onPress={onConfirm}>
                        <Feather name="trash-2" size={14} color="#fff" />
                        <Text style={cm.confirmTxt}>Delete</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    </Modal>
);
const cm = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 32 },
    box: { backgroundColor: T.card, borderRadius: 24, padding: 28, alignItems: "center", width: "100%" },
    iconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: T.redBg, alignItems: "center", justifyContent: "center", marginBottom: 16 },
    title: { fontSize: 18, fontWeight: "800", color: T.textH, marginBottom: 10, letterSpacing: -0.3 },
    sub: { fontSize: 13, color: T.textB, textAlign: "center", lineHeight: 20, marginBottom: 24 },
    row: { flexDirection: "row", gap: 12, width: "100%" },
    cancel: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: T.border, alignItems: "center" },
    cancelTxt: { fontSize: 14, fontWeight: "700", color: T.textM },
    confirm: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 13, borderRadius: 12, backgroundColor: T.red },
    confirmTxt: { fontSize: 14, fontWeight: "800", color: "#fff" },
});

// ─── EDIT MODAL ───────────────────────────────────────────────────────────────
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
    }, [dept]);

    if (!dept) return null;
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
            <View style={em.overlay}>
                <View style={em.sheet}>
                    <View style={em.handle} />
                    <View style={em.header}>
                        <View>
                            <Text style={em.title}>Edit Department</Text>
                            <Text style={em.sub}>Update department details</Text>
                        </View>
                        <TouchableOpacity style={em.closeBtn} onPress={onCancel}>
                            <Feather name="x" size={16} color={T.textB} />
                        </TouchableOpacity>
                    </View>
                    <View style={em.body}>
                        <Text style={em.label}>Department Name</Text>
                        <View style={em.inputWrap}>
                            <Feather name="folder" size={15} color={T.primary} />
                            <TextInput
                                style={em.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="e.g. Finance"
                                placeholderTextColor={T.textM}
                            />
                        </View>
                        <Text style={em.label}>Description</Text>
                        <View style={[em.inputWrap, { alignItems: "flex-start", paddingTop: 12 }]}>
                            <Feather name="align-left" size={15} color={T.primary} style={{ marginTop: 1 }} />
                            <TextInput
                                style={[em.input, { height: 80, textAlignVertical: "top" }]}
                                value={desc}
                                onChangeText={setDesc}
                                placeholder="Brief description..."
                                placeholderTextColor={T.textM}
                                multiline
                            />
                        </View>
                        <View style={em.footer}>
                            <TouchableOpacity style={em.cancelBtn} onPress={onCancel}>
                                <Text style={em.cancelTxt}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={em.saveBtn}
                                onPress={() => onSave({ ...dept, name: name.trim() || dept.name, description: desc.trim() || dept.description })}
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
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.42)", justifyContent: "flex-end" },
    sheet: { backgroundColor: T.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 36 },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: T.border, alignSelf: "center", marginTop: 12 },
    header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", padding: 20, paddingBottom: 0 },
    title: { fontSize: 18, fontWeight: "800", color: T.textH, letterSpacing: -0.3 },
    sub: { fontSize: 12, color: T.textM, marginTop: 3, fontWeight: "500" },
    closeBtn: { width: 32, height: 32, borderRadius: 9, backgroundColor: T.bg, alignItems: "center", justifyContent: "center" },
    body: { padding: 20 },
    label: { fontSize: 11, fontWeight: "700", color: T.textB, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8, marginTop: 16 },
    inputWrap: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: T.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1.5, borderColor: T.border },
    input: { flex: 1, fontSize: 14, color: T.textH },
    footer: { flexDirection: "row", gap: 12, marginTop: 28 },
    cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 13, borderWidth: 1.5, borderColor: T.border, alignItems: "center" },
    cancelTxt: { fontSize: 14, fontWeight: "700", color: T.textM },
    saveBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 13, backgroundColor: T.primary },
    saveTxt: { fontSize: 14, fontWeight: "800", color: "#fff" },
});

// ─── DEPARTMENT CARD ──────────────────────────────────────────────────────────
const DeptCard: React.FC<{
    dept: Department;
    onEdit: () => void;
    onDelete: () => void;
}> = ({ dept, onEdit, onDelete }) => {
    const color = getColor(dept.name);
    const icon  = getIcon(dept.name);

    return (
        <View style={dc.card}>
            {/* Colored header banner */}
            <View style={[dc.banner, { backgroundColor: color }]}>
                {/* Decorative circles */}
                <View style={[dc.deco1, { backgroundColor: "rgba(255,255,255,0.12)" }]} />
                <View style={[dc.deco2, { backgroundColor: "rgba(255,255,255,0.08)" }]} />

                {/* Icon circle */}
                <View style={dc.iconCircle}>
                    <Feather name={icon} size={22} color={color} />
                </View>

                {/* Edit / Delete top-right */}
                <View style={dc.bannerActions}>
                    <TouchableOpacity style={dc.bannerBtn} onPress={onEdit} activeOpacity={0.8}>
                        <Feather name="edit-2" size={13} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[dc.bannerBtn, { backgroundColor: "rgba(220,50,50,0.75)" }]} onPress={onDelete} activeOpacity={0.8}>
                        <Feather name="trash-2" size={13} color="#fff" />
                    </TouchableOpacity>
                </View>

                <Text style={dc.bannerTitle}>{dept.name}</Text>
            </View>

            {/* Card body */}
            <View style={dc.body}>
                <Text style={dc.desc} numberOfLines={2}>{dept.description}</Text>

                <View style={dc.metaRow}>
                    <View style={dc.metaItem}>
                        <View style={[dc.metaDot, { backgroundColor: color + "30" }]}>
                            <Feather name="briefcase" size={11} color={color} />
                        </View>
                        <Text style={dc.metaTxt}>{dept.jobs} {dept.jobs === 1 ? "Job" : "Jobs"}</Text>
                    </View>
                    <View style={dc.metaItem}>
                        <View style={[dc.metaDot, { backgroundColor: "#e8f0fe" }]}>
                            <Feather name="calendar" size={11} color="#3b82f6" />
                        </View>
                        <Text style={dc.metaTxt}>{dept.createdAt}</Text>
                    </View>
                    <View style={[dc.statusBadge, { backgroundColor: dept.status === "Active" ? T.greenBg : "#f3f4f6" }]}>
                        <View style={[dc.statusDot, { backgroundColor: dept.status === "Active" ? T.green : T.textM }]} />
                        <Text style={[dc.statusTxt, { color: dept.status === "Active" ? T.green : T.textM }]}>
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
        borderRadius: 20,
        overflow: "hidden",
        marginBottom: 14,
        borderWidth: 1,
        borderColor: T.border,
        shadowColor: "#2c1a0e",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.09,
        shadowRadius: 12,
        elevation: 4,
    },
    banner: {
        height: 110,
        alignItems: "center",
        justifyContent: "flex-end",
        paddingBottom: 14,
        position: "relative",
        overflow: "hidden",
    },
    deco1: { position: "absolute", width: 130, height: 130, borderRadius: 65, top: -50, right: -30 },
    deco2: { position: "absolute", width: 80, height: 80, borderRadius: 40, bottom: -25, left: -20 },
    iconCircle: {
        position: "absolute",
        top: 18,
        left: 18,
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: "rgba(255,255,255,0.92)",
        alignItems: "center",
        justifyContent: "center",
    },
    bannerActions: {
        position: "absolute",
        top: 14,
        right: 14,
        flexDirection: "row",
        gap: 8,
    },
    bannerBtn: {
        width: 32,
        height: 32,
        borderRadius: 9,
        backgroundColor: "rgba(255,255,255,0.22)",
        alignItems: "center",
        justifyContent: "center",
    },
    bannerTitle: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "800",
        letterSpacing: -0.3,
        textShadowColor: "rgba(0,0,0,0.2)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    body: { padding: 14 },
    desc: { fontSize: 12, color: T.textB, lineHeight: 18, marginBottom: 12, fontWeight: "500" },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
    metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
    metaDot: { width: 22, height: 22, borderRadius: 7, alignItems: "center", justifyContent: "center" },
    metaTxt: { fontSize: 11, color: T.textM, fontWeight: "600" },
    statusBadge: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusTxt: { fontSize: 10, fontWeight: "800" },
});

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
const DepartmentsScreen: React.FC = () => {
    const [departments, setDepartments] = useState<Department[]>(SEED);
    const [search, setSearch] = useState("");
    const [editTarget, setEditTarget] = useState<Department | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);

    const filtered = departments.filter(d =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.description.toLowerCase().includes(search.toLowerCase())
    );

    const handleSave = (updated: Department) => {
        setDepartments(prev => prev.map(d => d.id === updated.id ? updated : d));
        setEditTarget(null);
    };

    const handleDelete = () => {
        if (!deleteTarget) return;
        setDepartments(prev => prev.filter(d => d.id !== deleteTarget.id));
        setDeleteTarget(null);
    };

    const totalJobs = departments.reduce((s, d) => s + d.jobs, 0);
    const activeCount = departments.filter(d => d.status === "Active").length;

    return (
        <SafeAreaView style={s.safe}>
            <StatusBar barStyle="dark-content" backgroundColor={T.bg} />

            {/* ── Header ── */}
            <View style={s.header}>
                <View style={s.headerLeft}>
                    <View style={s.headerIcon}>
                        <Feather name="grid" size={20} color="#fff" />
                    </View>
                    <View>
                        <Text style={s.headerTitle}>Departments</Text>
                        <Text style={s.headerCrumb}>Dashboard › Careers › Departments</Text>
                    </View>
                </View>
                <TouchableOpacity style={s.addBtn} activeOpacity={0.85}>
                    <Feather name="plus" size={16} color="#fff" />
                    <Text style={s.addTxt}>Add New</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={s.scroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* ── Stats strip ── */}
                <View style={s.statsRow}>
                    <View style={s.statCard}>
                        <View style={[s.statIcon, { backgroundColor: T.pLight }]}>
                            <Feather name="grid" size={16} color={T.primary} />
                        </View>
                        <Text style={s.statVal}>{departments.length}</Text>
                        <Text style={s.statLbl}>Total</Text>
                    </View>
                    <View style={s.statCard}>
                        <View style={[s.statIcon, { backgroundColor: T.greenBg }]}>
                            <Feather name="check-circle" size={16} color={T.green} />
                        </View>
                        <Text style={s.statVal}>{activeCount}</Text>
                        <Text style={s.statLbl}>Active</Text>
                    </View>
                    <View style={s.statCard}>
                        <View style={[s.statIcon, { backgroundColor: "#eff6ff" }]}>
                            <Feather name="briefcase" size={16} color="#3b82f6" />
                        </View>
                        <Text style={s.statVal}>{totalJobs}</Text>
                        <Text style={s.statLbl}>Jobs</Text>
                    </View>
                </View>

                {/* ── Search ── */}
                <View style={s.searchBox}>
                    <Feather name="search" size={15} color={T.primary} />
                    <TextInput
                        style={s.searchInput}
                        placeholder="Search departments..."
                        placeholderTextColor={T.textM}
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch("")}>
                            <Feather name="x-circle" size={15} color={T.textM} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* ── Count ── */}
                <Text style={s.countTxt}>
                    <Text style={{ color: T.primary, fontWeight: "700" }}>{filtered.length}</Text>
                    {" "}of {departments.length} departments
                </Text>

                {/* ── Cards ── */}
                {filtered.length === 0 ? (
                    <View style={s.empty}>
                        <View style={s.emptyIcon}>
                            <Feather name="inbox" size={32} color={T.textM} />
                        </View>
                        <Text style={s.emptyTitle}>No departments found</Text>
                        <Text style={s.emptySub}>Try adjusting your search</Text>
                    </View>
                ) : (
                    filtered.map(dept => (
                        <DeptCard
                            key={dept.id}
                            dept={dept}
                            onEdit={() => setEditTarget(dept)}
                            onDelete={() => setDeleteTarget(dept)}
                        />
                    ))
                )}
            </ScrollView>

            {/* ── Modals ── */}
            <EditModal
                visible={!!editTarget}
                dept={editTarget}
                onCancel={() => setEditTarget(null)}
                onSave={handleSave}
            />
            <ConfirmModal
                visible={!!deleteTarget}
                dept={deleteTarget}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
            />
        </SafeAreaView>
    );
};

export default DepartmentsScreen;

// ─── MAIN STYLES ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: T.bg,
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: T.card,
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: T.border,
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
    headerIcon: {
        width: 44, height: 44, borderRadius: 13,
        backgroundColor: T.primary,
        alignItems: "center", justifyContent: "center",
        shadowColor: T.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 4,
    },
    headerTitle: { fontSize: 19, fontWeight: "800", color: T.textH, letterSpacing: -0.4 },
    headerCrumb: { fontSize: 10, color: T.textM, marginTop: 2, fontWeight: "500" },
    addBtn: {
        flexDirection: "row", alignItems: "center", gap: 6,
        backgroundColor: T.primary,
        paddingHorizontal: 14, paddingVertical: 10,
        borderRadius: 12,
        shadowColor: T.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    addTxt: { color: "#fff", fontSize: 13, fontWeight: "800" },
    scroll: { padding: 16, paddingBottom: 40, gap: 12 },
    statsRow: { flexDirection: "row", gap: 10, marginBottom: 2 },
    statCard: {
        flex: 1, backgroundColor: T.card, borderRadius: 16, padding: 14,
        alignItems: "center", borderWidth: 1, borderColor: T.border,
        shadowColor: "#2c1a0e", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 8 },
    statVal: { fontSize: 22, fontWeight: "800", color: T.textH, letterSpacing: -0.5 },
    statLbl: { fontSize: 10, fontWeight: "600", color: T.textM, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.3 },
    searchBox: {
        flexDirection: "row", alignItems: "center", gap: 10,
        backgroundColor: T.card, borderRadius: 14,
        paddingHorizontal: 14, paddingVertical: 12,
        borderWidth: 1.5, borderColor: T.border,
    },
    searchInput: { flex: 1, fontSize: 14, color: T.textH },
    countTxt: { fontSize: 12, color: T.textM, fontWeight: "500" },
    empty: { alignItems: "center", paddingVertical: 48, gap: 8 },
    emptyIcon: {
        width: 68, height: 68, borderRadius: 20,
        backgroundColor: T.card, borderWidth: 1, borderColor: T.border,
        alignItems: "center", justifyContent: "center", marginBottom: 4,
    },
    emptyTitle: { fontSize: 16, fontWeight: "700", color: T.textH },
    emptySub: { fontSize: 13, color: T.textM },
});