import AdminLayout from "@/components/admin-layout";
import Pagination from "@/components/Pagination";
import { getApiErrorMessage } from "@/lib/api/client";
import type { Department as ApiDepartment } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import {
    createDepartment,
    deleteDepartment,
    fetchDepartments,
    updateDepartment,
} from "@/services/hrApi";
import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from "react-native";

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

function releaseModalFocus() {
    if (Platform.OS === "web" && typeof document !== "undefined") {
        (document.activeElement as HTMLElement | null)?.blur?.();
    }
}

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

function mapApiDepartment(d: ApiDepartment): Department {
    return {
        id: d.id,
        name: d.name ?? "",
        description: d.description ?? "",
        jobs: Number(d.jobCount ?? 0),
        createdAt: formatDate(d.createdAt),
        status: d.active !== false ? "Active" : "Inactive",
    };
}

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
        onRequestClose={() => { releaseModalFocus(); onCancel(); }}
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
    const isWeb = Platform.OS === "web";
    const [name, setName] = useState(dept?.name ?? "");
    const [desc, setDesc] = useState(dept?.description ?? "");
    const [status, setStatus] = useState<"Active" | "Inactive">(dept?.status ?? "Active");
    const [statusOpen, setStatusOpen] = useState(false);
    const [nameError, setNameError] = useState("");

    React.useEffect(() => {
        if (dept) { setName(dept.name); setDesc(dept.description); setStatus(dept.status); }
        else { setName(""); setDesc(""); setStatus("Active"); }
        setStatusOpen(false);
        setNameError("");
    }, [dept, visible]);

    const isAdd = !dept;

    return (
        <Modal
            visible={visible}
            transparent
            animationType={isWeb ? "fade" : "slide"}
            onRequestClose={() => { releaseModalFocus(); onCancel(); }}
        >
            <View style={[em.overlay, isWeb && em.overlayWeb]}>
                <View style={[em.sheet, isWeb && em.sheetWeb]}>
                    {/* Header */}
                    <View style={em.header}>
                        <Text style={em.title}>{isAdd ? "Add Department" : "Edit Department"}</Text>
                        <TouchableOpacity style={em.closeBtn} onPress={() => { releaseModalFocus(); onCancel(); }}>
                            <Feather name="x" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <View style={[em.body, { zIndex: 1000 }]}>
                        {/* Name field */}
                        <Text style={[em.label, { marginTop: 0 }]}>Department Name <Text style={em.asterisk}>*</Text></Text>
                        <View style={[em.fieldWrap, !!nameError && { borderColor: T.red }]}>
                            <TextInput
                                style={em.input}
                                value={name}
                                onChangeText={(t) => { setName(t); setNameError(""); }}
                                placeholder={isAdd ? "e.g., Engineering, Marketing" : "Customer Support"}
                                placeholderTextColor={T.textHint}
                            />
                        </View>
                        {!!nameError && (
                            <Text style={{ color: T.red, fontSize: 12, marginTop: 4, fontWeight: "500" }}>{nameError}</Text>
                        )}

                        {/* Description field */}
                        <Text style={em.label}>Description</Text>
                        <View style={[em.fieldWrap, { alignItems: "flex-start", paddingVertical: 12 }]}>
                            <TextInput
                                style={[em.input, { height: 80, textAlignVertical: "top" }]}
                                value={desc}
                                onChangeText={setDesc}
                                placeholder={isAdd ? "Describe the department..." : "Customer service and support roles"}
                                placeholderTextColor={T.textHint}
                                multiline
                            />
                        </View>

                        {/* Status field */}
                        <Text style={em.label}>Status <Text style={em.asterisk}>*</Text></Text>
                        <View style={{ zIndex: 1000, elevation: 1000 }}>
                            <TouchableOpacity style={[em.fieldWrap, statusOpen && { borderColor: T.orange, borderWidth: 2 }]} onPress={() => setStatusOpen(!statusOpen)} activeOpacity={0.8}>
                                <Text style={[em.input, { color: T.textH }]}>{status}</Text>
                                <Feather name="chevron-down" size={16} color={T.textM} />
                            </TouchableOpacity>
                            {statusOpen && (
                                <View style={em.dropdown}>
                                    <TouchableOpacity style={[em.dropItem, status === "Active" && { backgroundColor: '#1a73e8' }]} onPress={() => { setStatus("Active"); setStatusOpen(false); }}>
                                        <Text style={[em.dropItemText, status === "Active" && { color: '#fff' }]}>Active</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[em.dropItem, { borderBottomWidth: 0 }, status === "Inactive" && { backgroundColor: '#1a73e8' }]} onPress={() => { setStatus("Inactive"); setStatusOpen(false); }}>
                                        <Text style={[em.dropItemText, status === "Inactive" && { color: '#fff' }]}>Inactive</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>

                    <View style={em.divider} />

                    {/* Footer */}
                    <View style={em.footer}>
                        <TouchableOpacity style={em.cancelBtn} onPress={() => { releaseModalFocus(); onCancel(); }}>
                            <Feather name="x" size={14} color="#fff" />
                            <Text style={em.cancelTxt}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={em.saveBtn}
                            onPress={() => {
                                const trimName = name.trim();
                                const trimDesc = desc.trim();
                                if (!trimName) {
                                    setNameError("Department name is required.");
                                    return;
                                }
                                setNameError("");
                                releaseModalFocus();
                                if (dept) {
                                    onSave({ ...dept, name: trimName, description: trimDesc || dept.description, status });
                                } else {
                                    const newDept: Department = {
                                        id: Date.now(),
                                        name: trimName,
                                        description: trimDesc,
                                        jobs: 0,
                                        createdAt: new Date().toLocaleDateString("en-GB", {
                                            day: "numeric", month: "short", year: "numeric"
                                        }),
                                        status,
                                    };
                                    onSave(newDept);
                                }
                            }}
                        >
                            <Feather name="save" size={14} color="#fff" />
                            <Text style={em.saveTxt}>{isAdd ? "Save Department" : "Update"}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const em = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "flex-end",
    },
    overlayWeb: {
        justifyContent: "center",
        alignItems: "center",
    },
    sheet: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingBottom: Platform.OS === 'ios' ? 24 : 0,
    },
    sheetWeb: {
        width: "90%",
        maxWidth: 500,
        borderRadius: 16,
        overflow: "hidden",
    },
    header: {
        marginHorizontal: 2, marginTop: 12, borderRadius: 22,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: T.orange,
        padding: 18,
        paddingHorizontal: 24,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    title: {
        fontSize: 16,
        fontWeight: "700",
        color: "#fff",
    },
    closeBtn: {
        padding: 4,
    },
    body: {
        padding: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: "500",
        color: "#1d324e",
        marginBottom: 8,
        marginTop: 20,
    },
    asterisk: {
        color: T.red,
    },
    fieldWrap: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#fff",
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    input: {
        flex: 1,
        fontSize: 14,
        color: "#1d324e",
        outlineStyle: "none" as any,
    } as any,
    dropdown: {
        position: "absolute",
        top: "100%",
        left: 0,
        right: 0,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 8,
        marginTop: 4,
        zIndex: 999,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
    },
    dropItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
    },
    dropItemText: {
        fontSize: 14,
        color: "#1d324e",
    },
    divider: {
        height: 1,
        backgroundColor: "#f1f5f9",
    },
    footer: {
        flexDirection: "row",
        gap: 12,
        padding: 24,
    },
    cancelBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 14,
        borderRadius: 8,
        backgroundColor: "#505461",
    },
    cancelTxt: {
        fontSize: 14,
        fontWeight: "600",
        color: "#fff",
    },
    saveBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 14,
        borderRadius: 8,
        backgroundColor: T.orange,
    },
    saveTxt: {
        fontSize: 14,
        fontWeight: "600",
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
}> = ({ icon, value, label, iconBg, iconFg }) => {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;

    return (
        <View style={[
            sc.card,
            isMobile && {
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 10,
                gap: 6,
                height: 90,
            }
        ]}>
            <View style={[
                sc.iconWrap,
                { backgroundColor: iconBg },
                isMobile && { width: 28, height: 28, borderRadius: 8 }
            ]}>
                <Feather name={icon} size={isMobile ? 12 : 16} color={iconFg} />
            </View>
            <View style={isMobile && { alignItems: "center" }}>
                <Text style={[sc.value, isMobile && { fontSize: 16, lineHeight: 18 }]}>{value}</Text>
                <Text style={[sc.label, isMobile && { fontSize: 8, marginTop: 1, textAlign: "center" }]}>{label}</Text>
            </View>
        </View>
    );
};

const sc = StyleSheet.create({
    card: {
        flex: 1,
        backgroundColor: T.card,
        borderRadius: 14,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderWidth: 1,
        borderColor: T.border,
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
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
    const { width } = useWindowDimensions();
    const isMobileScreen = width < 768;
    const isSmallMobile = width < 480;

    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadDepartments = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const rows = await fetchDepartments();
            setDepartments(rows.map(mapApiDepartment));
        } catch (e) {
            setError(getApiErrorMessage(e, "Failed to load departments."));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDepartments();
    }, [loadDepartments]);

    const [search, setSearch] = useState("");
    const [editTarget, setEditTarget] = useState<Department | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
    const [addOpen, setAddOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message: string; type?: 'success' | 'error' }>({ visible: false, title: "", message: "", type: 'success' });

    const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);
    const [filterStatus, setFilterStatus] = useState<"All" | "Active" | "Inactive">("All");

    const isWeb = Platform.OS === "web";

    let cardWidth: any = undefined;
    if (isWeb) {
        if (width >= 1024) {
            cardWidth = "calc(25% - 11px)";
        } else if (width >= 640) {
            cardWidth = "calc(50% - 7px)";
        } else {
            cardWidth = "100%";
        }
    }

    let filtered = departments.filter(d =>
        (d.name.toLowerCase().includes(search.toLowerCase()) ||
            d.description.toLowerCase().includes(search.toLowerCase())) &&
        (filterStatus === "All" || d.status === filterStatus)
    );

    if (sortOrder) {
        filtered.sort((a, b) => {
            const cmp = a.name.localeCompare(b.name);
            return sortOrder === "asc" ? cmp : -cmp;
        });
    }

    const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const totalJobs = departments.reduce((s, d) => s + d.jobs, 0);
    const activeCount = departments.filter(d => d.status === "Active").length;
    const inactiveCount = departments.length - activeCount;

    const handleSave = async (updated: Department) => {
        try {
            const payload = {
                name: updated.name,
                description: updated.description,
                active: updated.status === "Active",
            };
            if (departments.find((d) => d.id === updated.id)) {
                await updateDepartment(updated.id, payload);
                setAlertConfig({ visible: true, title: "Updated!", message: "Department updated successfully.", type: 'success' });
            } else {
                await createDepartment(payload);
                setAlertConfig({ visible: true, title: "Added!", message: "Department added successfully.", type: 'success' });
            }
            await loadDepartments();
            setEditTarget(null);
            setAddOpen(false);
        } catch (e) {
            console.warn(getApiErrorMessage(e));
            setAlertConfig({ visible: true, title: "Error", message: getApiErrorMessage(e), type: 'error' });
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteDepartment(deleteTarget.id);
            await loadDepartments();
            setDeleteTarget(null);
        } catch (e) {
            console.warn(getApiErrorMessage(e));
            setAlertConfig({ visible: true, title: "Error", message: getApiErrorMessage(e), type: 'error' });
        }
    };

    const Container = isWeb ? View : SafeAreaView;

    const MainContent = (
        <Container style={s.safe}>
            <StatusBar barStyle="light-content" backgroundColor="#151D4F" />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[s.scroll, !isWeb && { paddingTop: 0, paddingHorizontal: 12, marginTop: -20 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* ── PAGE HEADER ── */}
                {!isWeb ? (
                    // ── MOBILE PAGE HEADER (title + add only) ──
                    <View style={[mob.headerCard, isMobileScreen && { paddingHorizontal: 12, paddingBottom: 40 }]}>
                        <View style={mob.headerTopRow}>
                            <View style={mob.headerTitleBlock}>
                                <Text style={[mob.headerTitle, isSmallMobile && { fontSize: 20 }]}>Manage Departments</Text>
                                {!isSmallMobile && (
                                    <Text style={mob.headerSub}>Organize your workforce by department structure</Text>
                                )}
                            </View>
                            <TouchableOpacity
                                style={mob.addBtn}
                                onPress={() => setAddOpen(true)}
                                activeOpacity={0.85}
                            >
                                <Feather name="plus" size={14} color="#fff" />
                                <Text style={mob.addBtnTxt}>Add</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    // ── WEB PAGE HEADER (unchanged) ──
                    <View style={[
                        s.pageHead,
                        isMobileScreen && { padding: 16, paddingBottom: 40, borderRadius: 16 }
                    ]}>
                        <View style={s.pageHeadLeft}>
                            <Text style={[
                                s.pageTitle,
                                isMobileScreen && { fontSize: 18, lineHeight: 22 }
                            ]}>Manage Departments</Text>
                            {!isSmallMobile && (
                                <Text style={s.pageSub}>Organize your workforce by department structure</Text>
                            )}
                        </View>
                        <TouchableOpacity
                            style={[
                                s.addBtn,
                                isMobileScreen && { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }
                            ]}
                            onPress={() => setAddOpen(true)}
                            activeOpacity={0.85}
                        >
                            <Feather name="plus" size={15} color="#fff" />
                            <Text style={[
                                s.addBtnTxt,
                                isMobileScreen && { fontSize: 12 }
                            ]}>
                                {isSmallMobile ? "Add" : "Add Department"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

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
                        icon="x-circle"
                        value={inactiveCount}
                        label="Inactive"
                        iconBg={T.redBg}
                        iconFg={T.red}
                    />
                </View>

                {/* ── CONTROLS ── */}
                {isMobileScreen ? (
                    <View style={mob.controlsCard}>
                        {/* Row 1: Search bar + Grid/List toggle */}
                        <View style={mob.mobileRow1}>
                            <View style={mob.searchBox}>
                                <Feather name="search" size={15} color={T.textHint} />
                                <TextInput
                                    style={mob.searchInput}
                                    placeholder="Search departments…"
                                    placeholderTextColor={T.textHint}
                                    value={search}
                                    onChangeText={(t) => { setSearch(t); setCurrentPage(1); }}
                                />
                                {search.length > 0 && (
                                    <TouchableOpacity onPress={() => { setSearch(""); setCurrentPage(1); }}>
                                        <Feather name="x-circle" size={15} color={T.textHint} />
                                    </TouchableOpacity>
                                )}
                            </View>
                            <View style={mob.toggleGroup}>
                                <TouchableOpacity
                                    style={[mob.toggleBtn, viewMode === 'grid' && mob.toggleBtnActive]}
                                    onPress={() => setViewMode('grid')}
                                    activeOpacity={0.8}
                                >
                                    <Feather name="grid" size={16} color={viewMode === 'grid' ? '#fff' : '#374151'} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[mob.toggleBtn, viewMode === 'list' && mob.toggleBtnActive]}
                                    onPress={() => setViewMode('list')}
                                    activeOpacity={0.8}
                                >
                                    <Feather name="list" size={16} color={viewMode === 'list' ? '#fff' : '#374151'} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Row 2: Filter and Sort buttons */}
                        <View style={mob.mobileRow2}>
                            <TouchableOpacity
                                style={[mob.chipBtn, filterStatus !== "All" && mob.chipBtnActive]}
                                onPress={() => {
                                    setFilterStatus(prev => prev === "All" ? "Active" : prev === "Active" ? "Inactive" : "All");
                                    setCurrentPage(1);
                                }}
                                activeOpacity={0.8}
                            >
                                <Feather name="sliders" size={13} color={filterStatus !== "All" ? T.orange : T.textM} />
                                <Text style={[mob.chipTxt, filterStatus !== "All" && mob.chipTxtActive]}>
                                    {filterStatus === "All" ? "Filter" : filterStatus}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[mob.chipBtn, sortOrder !== null && mob.chipBtnActive]}
                                onPress={() => {
                                    setSortOrder(prev => prev === "asc" ? "desc" : prev === "desc" ? null : "asc");
                                    setCurrentPage(1);
                                }}
                                activeOpacity={0.8}
                            >
                                <Feather
                                    name={sortOrder === "asc" ? "arrow-down" : sortOrder === "desc" ? "arrow-up" : "arrow-up"}
                                    size={13}
                                    color={sortOrder ? T.orange : T.textM}
                                />
                                <Text style={[mob.chipTxt, sortOrder !== null && mob.chipTxtActive]}>
                                    {sortOrder === "asc" ? "A–Z" : sortOrder === "desc" ? "Z–A" : "Sort"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    isWeb && (
                        <View style={s.toolBar}>
                            <View style={s.searchBox}>
                                <Feather name="search" size={15} color={T.textHint} />
                                <TextInput
                                    style={s.searchInput}
                                    placeholder="Search departments…"
                                    placeholderTextColor={T.textHint}
                                    value={search}
                                    onChangeText={(t) => { setSearch(t); setCurrentPage(1); }}
                                />
                                {search.length > 0 && (
                                    <TouchableOpacity onPress={() => { setSearch(""); setCurrentPage(1); }}>
                                        <Feather name="x-circle" size={15} color={T.textHint} />
                                    </TouchableOpacity>
                                )}
                            </View>
                            <View style={s.filterGroup}>
                                <View style={{ flexDirection: "row", backgroundColor: "#E5E7EB", borderRadius: 10, padding: 3 }}>
                                    <TouchableOpacity style={[s.viewBtn, viewMode === 'grid' && s.viewBtnActive]} onPress={() => setViewMode('grid')}>
                                        <Feather name="grid" size={16} color={viewMode === 'grid' ? '#fff' : '#374151'} />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[s.viewBtn, viewMode === 'list' && s.viewBtnActive]} onPress={() => setViewMode('list')}>
                                        <Feather name="list" size={16} color={viewMode === 'list' ? '#fff' : '#374151'} />
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity style={[s.filterBtn, filterStatus !== "All" && s.viewBtnActive]} onPress={() => { setFilterStatus(prev => prev === "All" ? "Active" : prev === "Active" ? "Inactive" : "All"); setCurrentPage(1); }}>
                                    <Feather name="sliders" size={13} color={filterStatus !== "All" ? T.orange : T.textM} />
                                    <Text style={[s.filterBtnTxt, filterStatus !== "All" && { color: T.orange }]}>{filterStatus === "All" ? "Filter" : filterStatus}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[s.filterBtn, sortOrder !== null && s.viewBtnActive]} onPress={() => { setSortOrder(prev => prev === "asc" ? "desc" : prev === "desc" ? null : "asc"); setCurrentPage(1); }}>
                                    <Feather name={sortOrder === "asc" ? "arrow-down" : sortOrder === "desc" ? "arrow-up" : "arrow-up"} size={13} color={sortOrder ? T.orange : T.textM} />
                                    <Text style={[s.filterBtnTxt, sortOrder !== null && { color: T.orange }]}>{sortOrder === "asc" ? "Sort A-Z" : sortOrder === "desc" ? "Sort Z-A" : "Sort"}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )
                )}

                {/* ── COUNT LINE ── */}
                <Text style={s.countLine}>
                    <Text style={{ color: T.orange, fontWeight: "700" }}>{filtered.length}</Text>
                    {" "}of {departments.length} departments
                </Text>

                {/* ── DEPARTMENT CARDS / LIST ── */}
                {loading ? (
                    <View style={s.empty}>
                        <Text style={s.emptyTitle}>Loading departments…</Text>
                    </View>
                ) : error ? (
                    <View style={s.empty}>
                        <Text style={s.emptyTitle}>{error}</Text>
                        <TouchableOpacity style={s.addBtn} onPress={loadDepartments}>
                            <Text style={s.addBtnTxt}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : filtered.length === 0 ? (
                    <View style={s.empty}>
                        <View style={s.emptyIcon}>
                            <Feather name="inbox" size={30} color={T.textHint} />
                        </View>
                        <Text style={s.emptyTitle}>
                            {departments.length === 0 ? "No departments yet" : "No departments found"}
                        </Text>
                        <Text style={s.emptySub}>
                            {departments.length === 0
                                ? "Add your first department to organize job openings."
                                : "Try adjusting your search or filters."}
                        </Text>
                        {departments.length === 0 ? (
                            <TouchableOpacity style={[s.addBtn, { marginTop: 16 }]} onPress={() => setAddOpen(true)}>
                                <Feather name="plus" size={14} color="#fff" />
                                <Text style={s.addBtnTxt}>Add Department</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                ) : viewMode === "list" ? (
                    (isWeb && !isMobileScreen) ? (
                        <View style={s.tableCard}>
                            <View style={s.tableHeader}>
                                <Text style={[s.th, { flex: 2 }]}>Department</Text>
                                <Text style={[s.th, { flex: 3 }]}>Description</Text>
                                <Text style={[s.th, { flex: 1, textAlign: 'center' }]}>Jobs</Text>
                                <Text style={[s.th, { flex: 1, textAlign: 'center' }]}>Status</Text>
                                <Text style={[s.th, { flex: 1, textAlign: 'right' }]}>Action</Text>
                            </View>
                            {paginated.map((dept, idx) => (
                                <View key={dept.id} style={[s.tableRow, idx % 2 === 1 && s.tableRowAlt]}>
                                    <View style={{ flex: 2 }}>
                                        <Text style={[{ fontWeight: '700', color: T.textH }, s.td]}>{dept.name}</Text>
                                        <Text style={{ fontSize: 11, color: T.textHint, marginTop: 4 }}>{dept.createdAt}</Text>
                                    </View>
                                    <Text style={[s.td, { flex: 3 }]} numberOfLines={2}>{dept.description}</Text>
                                    <Text style={[s.td, { flex: 1, textAlign: 'center', fontWeight: '600' }]}>{dept.jobs}</Text>
                                    <View style={{ flex: 1, alignItems: 'center' }}>
                                        <View style={[{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5 }, { backgroundColor: dept.status === "Active" ? T.greenBg : T.redBg }]}>
                                            <View style={[{ width: 6, height: 6, borderRadius: 3 }, { backgroundColor: dept.status === "Active" ? T.green : T.red }]} />
                                            <Text style={[{ fontSize: 11, fontWeight: '700' }, { color: dept.status === "Active" ? T.green : T.red }]}>{dept.status}</Text>
                                        </View>
                                    </View>
                                    <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                                        <TouchableOpacity style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' }} onPress={() => setEditTarget(dept)}>
                                            <Feather name="edit-2" size={13} color={T.textM} />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: "#FCA5A5" }} onPress={() => setDeleteTarget(dept)}>
                                            <Feather name="trash-2" size={13} color={T.red} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : (
                        // ── MOBILE LIST VIEW ──
                        <View style={{ gap: 10 }}>
                            {paginated.map(dept => (
                                <View key={dept.id} style={{ backgroundColor: T.card, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: T.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: T.orangeLight, alignItems: 'center', justifyContent: 'center' }}>
                                        <Feather name="grid" size={18} color={T.orange} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 15, fontWeight: '700', color: T.textH, marginBottom: 2 }}>{dept.name}</Text>
                                        <Text style={{ fontSize: 12, color: T.textHint }} numberOfLines={1}>{dept.jobs} Open Jobs</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end', gap: 8 }}>
                                        <View style={[{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }, { backgroundColor: dept.status === "Active" ? T.greenBg : T.redBg }]}>
                                            <View style={[{ width: 5, height: 5, borderRadius: 2.5 }, { backgroundColor: dept.status === "Active" ? T.green : T.red }]} />
                                            <Text style={[{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }, { color: dept.status === "Active" ? T.green : T.red }]}>{dept.status}</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', gap: 10 }}>
                                            <TouchableOpacity onPress={() => setEditTarget(dept)} style={{ padding: 4 }}>
                                                <Feather name="edit-2" size={15} color={T.textM} />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => setDeleteTarget(dept)} style={{ padding: 4 }}>
                                                <Feather name="trash-2" size={15} color={T.red} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )
                ) : (
                    <View style={isWeb
                        ? { flexDirection: "row", flexWrap: "wrap", gap: 14 }
                        : { gap: 12 }
                    }>
                        {paginated.map(dept => (
                            <View
                                key={dept.id}
                                style={isWeb ? { width: cardWidth } : undefined}
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

                {filtered.length > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(filtered.length / ITEMS_PER_PAGE)}
                        totalItems={filtered.length}
                        itemsPerPage={ITEMS_PER_PAGE}
                        itemName="departments"
                        onPageChange={setCurrentPage}
                    />
                )}
            </ScrollView>

            {/* ── MODALS ── */}
            <EditModal
                visible={!!editTarget}
                dept={editTarget}
                onCancel={() => { releaseModalFocus(); setEditTarget(null); }}
                onSave={handleSave}
            />
            <EditModal
                visible={addOpen}
                dept={null}
                onCancel={() => { releaseModalFocus(); setAddOpen(false); }}
                onSave={handleSave}
            />
            <ConfirmModal
                visible={!!deleteTarget}
                dept={deleteTarget}
                onCancel={() => { releaseModalFocus(); setDeleteTarget(null); }}
                onConfirm={handleDelete}
            />

            {/* ── SWEET ALERT ── */}
            <Modal transparent animationType="fade" visible={alertConfig.visible} onRequestClose={() => { releaseModalFocus(); setAlertConfig({ ...alertConfig, visible: false }); }}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
                    <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '90%', maxWidth: 360, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 }}>
                        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: alertConfig.type === 'error' ? '#fee2e2' : '#d1fae5', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                            <Feather name={alertConfig.type === 'error' ? "alert-triangle" : "check"} size={32} color={alertConfig.type === 'error' ? "#ef4444" : "#10b981"} />
                        </View>
                        <Text style={{ fontSize: 20, fontWeight: '800', color: '#1f2937', marginBottom: 8, textAlign: 'center' }}>{alertConfig.title}</Text>
                        <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 }}>{alertConfig.message}</Text>
                        <TouchableOpacity style={{ backgroundColor: alertConfig.type === 'error' ? '#ef4444' : T.orange, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 8, width: '100%', alignItems: 'center' }} onPress={() => { releaseModalFocus(); setAlertConfig({ ...alertConfig, visible: false }); }}>
                            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>OK</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </Container>
    );

    return <AdminLayout>{MainContent}</AdminLayout>;
};

export default DepartmentsScreen;

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE-ONLY HEADER STYLES
// ─────────────────────────────────────────────────────────────────────────────
const mob = StyleSheet.create({
    // Header card: title + add button only (no search/controls inside)
    headerCard: {
        backgroundColor: "#151D4F",
        borderRadius: 22,
        marginHorizontal: 4,
        marginTop: 19,
        paddingTop: Platform.OS === 'android' ? 16 : 12,
        paddingHorizontal: 16,
        paddingBottom: 48,
    },

    // Controls card: sits below stats strip, white background
    controlsCard: {
        backgroundColor: T.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: T.border,
        padding: 12,
        gap: 9,
    },

    // Title row: title block + add button
    headerTopRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 10,
    },
    headerTitleBlock: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: "800",
        color: "#FFFFFF",
        letterSpacing: -0.5,
        lineHeight: 26,
    },
    headerSub: {
        fontSize: 11,
        color: "#D1D5DB",
        marginTop: 3,
        fontWeight: "400",
    },
    addBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: T.orange,
        paddingHorizontal: 13,
        paddingVertical: 9,
        borderRadius: 10,
        flexShrink: 0,
    },
    addBtnTxt: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "800",
        letterSpacing: -0.2,
    },

    // Search bar (light, inside white controlsCard)
    searchBox: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 9,
        backgroundColor: T.bg,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: T.border,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        color: T.textH,
    },

    // Controls row
    controlsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },

    mobileRow1: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        width: "100%",
    },
    mobileRow2: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        width: "100%",
    },

    // Grid/List segmented toggle (light)
    toggleGroup: {
        flexDirection: "row",
        backgroundColor: "#E5E7EB",
        borderRadius: 10,
        padding: 3,
    },
    toggleBtn: {
        width: 36,
        height: 36,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    toggleBtnActive: {
        backgroundColor: "#1E2B6B",
    },
    toggleTxt: {
        fontSize: 12,
        fontWeight: "600",
        color: T.textHint,
    },
    toggleTxtActive: {
        color: T.orange,
    },

    // Filter / Sort chip buttons (light)
    chipBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 8,
        backgroundColor: T.bg,
        borderWidth: 1,
        borderColor: T.border,
    },
    chipBtnActive: {
        backgroundColor: T.orangeLight,
        borderColor: T.orange,
    },
    chipTxt: {
        fontSize: 12,
        fontWeight: "600",
        color: T.textM,
    },
    chipTxtActive: {
        color: T.orange,
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    safe: {
        flex: 1,
        height: "100%",
        backgroundColor: "#FFFFFF",
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
        paddingTop: 10,
        paddingHorizontal: 16,
        paddingBottom: 48,
        gap: 14,
    },

    // ── Page Header (web only) ──
    pageHead: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        backgroundColor: "#151D4F",
        padding: 24,
        paddingBottom: 48,
        borderRadius: 22,
        marginHorizontal: 2,
        marginTop: 12,
    },
    pageHeadLeft: {
        flex: 1,
    },
    pageTag: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: "rgba(239, 123, 26, 0.15)",
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
        color: "#FFFFFF",
        letterSpacing: -0.5,
        lineHeight: 26,
    },
    pageSub: {
        fontSize: 12,
        color: "#D1D5DB",
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

    statsRow: {
        flexDirection: "row",
        gap: 10,
        marginTop: -42,
        zIndex: 10,
        maxWidth: 900,
        alignSelf: "center",
        width: "100%",
    },

    // ── Toolbar (web only) ──
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
        borderWidth: 0,
        outline: "none" as any,
        outlineStyle: "none" as any,
        outlineWidth: 0 as any,
    } as any,
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
    viewBtn: {
        width: 36,
        height: 36,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    viewBtnActive: {
        backgroundColor: "#1E2B6B",
    },
    tableCard: {
        backgroundColor: T.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: T.border,
        overflow: "hidden",
    },
    tableHeader: {
        flexDirection: "row",
        backgroundColor: T.bg,
        borderBottomWidth: 1,
        borderBottomColor: T.border,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    th: {
        fontSize: 12,
        fontWeight: "700",
        color: T.textHint,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    tableRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: T.border,
    },
    tableRowAlt: {
        backgroundColor: "#fcfdfd",
    },
    td: {
        fontSize: 13,
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