import React, { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api/client";
import { mapFaqCategoryRow } from "@/lib/mappers";
import {
  createFaqCategory,
  deleteFaqCategory,
  fetchFaqCategories,
  updateFaqCategory,
} from "@/services/faqApi";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    Platform,
    Modal,
    StatusBar,
    Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import AdminLayout from "@/components/admin-layout";

// ─── THEME — Light / White ────────────────────────────────────────────────────
const PRIMARY       = "#ef7b1a";
const PRIMARY_LIGHT = "#fff4eb";
const PRIMARY_DARK  = "#c4601a";
const DARK_NAVY     = "#1a2b4a";

const ACCENT_TEAL   = "#00b894";
const ACCENT_PURPLE = "#6c5ce7";
const ACCENT_SKY    = "#0984e3";
const ACCENT_AMBER  = "#e17055";
const ACCENT_PINK   = "#e84393";
const ACCENT_RED    = "#d63031";
const ACCENT_GREEN  = "#00b359";
const ACCENT_VIOLET = "#8e44ad";

const BG_PAGE  = "#f2f4f7";
const BG_CARD  = "#ffffff";
const BORDER   = "#e8ecf0";

const TEXT_HEAD  = "#1a2b4a";
const TEXT_BODY  = "#4a5568";
const TEXT_MUTED = "#a0aec0";

// Valid Feather icon names used for category cards
const VALID_FEATHER_ICONS = new Set([
    "help-circle", "grid", "check-circle", "slash", "package", "shopping-cart",
    "shopping-bag", "truck", "credit-card", "tag", "star", "heart", "box",
    "layers", "settings", "user", "users", "shield", "lock", "alert-circle",
    "info", "book", "file-text", "folder", "archive", "clipboard", "calendar",
    "clock", "map-pin", "phone", "mail", "message-circle", "bell", "gift",
    "home", "globe", "tool", "zap", "activity", "award", "briefcase",
    "coffee", "compass", "database", "disc", "dollar-sign", "download",
    "edit", "eye", "feather", "flag", "headphones", "image", "key",
    "life-buoy", "link", "list", "mic", "monitor", "music", "navigation",
    "percent", "pie-chart", "play", "printer", "radio", "refresh-cw",
    "repeat", "search", "send", "server", "share", "smile", "sun",
    "thermometer", "thumbs-up", "trending-up", "umbrella", "upload",
    "video", "wifi", "wind", "x-circle", "aperture", "bar-chart",
]);
const safeIcon = (name: string): string => VALID_FEATHER_ICONS.has(name) ? name : "help-circle";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type CategoryStatus = "Active" | "Inactive";

interface FaqCategory {
    id: number;
    name: string;
    description: string;
    icon: string;
    color: string;
    faqCount: number;
    status: CategoryStatus;
    createdAt: string;
    slug: string;
}

// ─── ADD / EDIT MODAL ────────────────────────────────────────────────────────
const CategoryModal: React.FC<{
    visible: boolean;
    onClose: () => void;
    onSave: (cat: Partial<FaqCategory>) => void;
    editing: FaqCategory | null;
    isWeb: boolean;
}> = ({ visible, onClose, onSave, editing, isWeb }) => {
    const [name,   setName]   = useState(editing?.name        ?? "");
    const [desc,   setDesc]   = useState(editing?.description ?? "");
    const [status, setStatus] = useState<CategoryStatus>(editing?.status ?? "Active");

    React.useEffect(() => {
        setName(editing?.name        ?? "");
        setDesc(editing?.description ?? "");
        setStatus(editing?.status    ?? "Active");
    }, [editing, visible]);

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={mSt.overlay}>
                <View style={[mSt.sheet, isWeb && mSt.sheetWeb]}>
                    {/* Header */}
                    <View style={mSt.header}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                            <View style={[mSt.headerDot, { backgroundColor: PRIMARY }]} />
                            <Text style={mSt.title}>{editing ? "Edit Category" : "New FAQ Category"}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={mSt.closeBtn}>
                            <Feather name="x" size={16} color={TEXT_BODY} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ padding: 24 }}>
                        <Text style={mSt.label}>Category Name</Text>
                        <TextInput style={mSt.input} value={name} onChangeText={setName}
                            placeholder="e.g. Orders & Tracking" placeholderTextColor={TEXT_MUTED} />

                        <Text style={mSt.label}>Short Description</Text>
                        <TextInput style={[mSt.input, { height: 80, textAlignVertical: "top", paddingTop: 12 }]}
                            value={desc} onChangeText={setDesc}
                            placeholder="Briefly describe this category..." placeholderTextColor={TEXT_MUTED} multiline />

                        <Text style={mSt.label}>Status</Text>
                        <View style={mSt.statusToggle}>
                            {(["Active", "Inactive"] as const).map(s => (
                                <TouchableOpacity key={s}
                                    style={[mSt.statusOption,
                                        status === s && { backgroundColor: s === "Active" ? ACCENT_TEAL : ACCENT_RED,
                                                          borderColor:     s === "Active" ? ACCENT_TEAL : ACCENT_RED }]}
                                    onPress={() => setStatus(s)}>
                                    <Text style={[mSt.statusOptionText, status === s && { color: "#fff" }]}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    <View style={mSt.footer}>
                        <TouchableOpacity style={mSt.cancelBtn} onPress={onClose}>
                            <Text style={mSt.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={mSt.saveBtn}
                            onPress={() => { onSave({ name, description: desc, status }); onClose(); }}>
                            <Feather name={editing ? "check" : "plus"} size={14} color="#fff" />
                            <Text style={mSt.saveText}>{editing ? "Save Changes" : "Add Category"}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// ─── GRID CARD  (image-2 style) ───────────────────────────────────────────────
// Layout:
//   [ icon-box (top-left) ]          [ edit 🖊  delete 🗑 (top-right) ]
//   Category Name (bold)
//   Description (muted)
//   ─────────────────────────────────────────────
//   📋 N FAQs   📅 date    • ACTIVE / INACTIVE
// Top border uses the category accent color.
const GridCard: React.FC<{
    cat: FaqCategory;
    onEdit: () => void;
    onToggle: () => void;
    onDelete: () => void;
    onNavigate: () => void;
}> = ({ cat, onEdit, onToggle, onDelete, onNavigate }) => {
    const isActive = cat.status === "Active";
    return (
        <TouchableOpacity style={[cSt.card, { borderTopColor: cat.color }]} onPress={onNavigate} activeOpacity={0.8}>
            {/* Top row: icon + action buttons */}
            <View style={cSt.topRow}>
                <View style={[cSt.iconWrap, { backgroundColor: cat.color + "1a" }]}>
                    <Feather name={safeIcon(cat.icon) as any} size={20} color={cat.color} />
                </View>
                <View style={cSt.actionBtns}>
                    <TouchableOpacity style={cSt.iconBtn} onPress={onEdit}>
                        <Feather name="edit-2" size={13} color={TEXT_BODY} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[cSt.iconBtn, cSt.iconBtnRed]} onPress={onToggle}>
                        <Feather name={isActive ? "eye-off" : "eye"} size={13} color={ACCENT_RED} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[cSt.iconBtn, cSt.iconBtnRed]} onPress={onDelete}>
                        <Feather name="trash-2" size={13} color={ACCENT_RED} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Name + description */}
            <Text style={cSt.name} numberOfLines={1}>{cat.name}</Text>
            <Text style={cSt.desc} numberOfLines={2}>{cat.description}</Text>

            {/* Divider */}
            <View style={cSt.divider} />

            {/* Meta row */}
            <View style={cSt.metaRow}>
                <View style={cSt.metaItem}>
                    <Feather name="help-circle" size={11} color={TEXT_MUTED} />
                    <Text style={cSt.metaText}>{cat.faqCount} FAQs</Text>
                </View>
                <View style={cSt.metaItem}>
                    <Feather name="calendar" size={11} color={TEXT_MUTED} />
                    <Text style={cSt.metaText}>{cat.createdAt}</Text>
                </View>
                <View style={cSt.metaItem}>
                    <View style={[cSt.statusDot, { backgroundColor: isActive ? ACCENT_TEAL : ACCENT_RED }]} />
                    <Text style={[cSt.statusLabel, { color: isActive ? ACCENT_TEAL : ACCENT_RED }]}>
                        {cat.status.toUpperCase()}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

// ─── LIST ROW ─────────────────────────────────────────────────────────────────
const ListRow: React.FC<{
    cat: FaqCategory;
    onEdit: () => void;
    onToggle: () => void;
    onDelete: () => void;
    onNavigate: () => void;
}> = ({ cat, onEdit, onToggle, onDelete, onNavigate }) => {
    const isActive = cat.status === "Active";
    return (
        <TouchableOpacity style={lSt.row} onPress={onNavigate} activeOpacity={0.8}>
            <View style={[lSt.iconWrap, { backgroundColor: cat.color + "1a" }]}>
                <Feather name={safeIcon(cat.icon) as any} size={18} color={cat.color} />
            </View>
            <View style={lSt.info}>
                <Text style={lSt.name} numberOfLines={1}>{cat.name}</Text>
                <Text style={lSt.desc} numberOfLines={1}>{cat.description}</Text>
            </View>
            <View style={lSt.countBox}>
                <Text style={lSt.countNum}>{cat.faqCount}</Text>
                <Text style={lSt.countLabel}>FAQs</Text>
            </View>
            <View style={[lSt.badge, { backgroundColor: isActive ? ACCENT_TEAL + "18" : ACCENT_RED + "18" }]}>
                <View style={[lSt.dot, { backgroundColor: isActive ? ACCENT_TEAL : ACCENT_RED }]} />
                <Text style={[lSt.badgeText, { color: isActive ? ACCENT_TEAL : ACCENT_RED }]}>{cat.status}</Text>
            </View>
            <Text style={lSt.date}>{cat.createdAt}</Text>
            <View style={lSt.actions}>
                <TouchableOpacity style={lSt.btn} onPress={onEdit}>
                    <Feather name="edit-2" size={14} color={PRIMARY} />
                </TouchableOpacity>
                <TouchableOpacity style={[lSt.btn, lSt.btnRed]} onPress={onToggle}>
                    <Feather name={isActive ? "eye-off" : "eye"} size={14} color={ACCENT_RED} />
                </TouchableOpacity>
                <TouchableOpacity style={[lSt.btn, lSt.btnRed]} onPress={onDelete}>
                    <Feather name="trash-2" size={14} color={ACCENT_RED} />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
};

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
const FaqCategoriesScreen: React.FC = () => {
    const isWeb = Platform.OS === "web";
    const [categories, setCategories] = useState<FaqCategory[]>([]);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [search,        setSearch]        = useState("");
    const [viewMode,      setViewMode]      = useState<"grid" | "list">("grid");
    const [statusFilter,  setStatusFilter]  = useState<"All" | "Active" | "Inactive">("All");
    const [modalVisible,  setModalVisible]  = useState(false);
    const [editingCat,    setEditingCat]    = useState<FaqCategory | null>(null);

    const loadCategories = useCallback(async () => {
        try {
            setLoadError(null);
            const rows = await fetchFaqCategories();
            setCategories(rows.map((r, i) => mapFaqCategoryRow(r, i)));
        } catch (e) {
            setLoadError(getApiErrorMessage(e));
            setCategories([]);
        }
    }, []);

    useEffect(() => {
        void loadCategories();
    }, [loadCategories]);

    const filtered = categories.filter(c => {
        const ms = c.name.toLowerCase().includes(search.toLowerCase()) ||
                   c.description.toLowerCase().includes(search.toLowerCase());
        const mf = statusFilter === "All" || c.status === statusFilter;
        return ms && mf;
    });

    const totalActive = categories.filter(c => c.status === "Active").length;
    const totalFaqs   = categories.reduce((s, c) => s + c.faqCount, 0);

    const handleSave = (data: Partial<FaqCategory>) => {
        void (async () => {
            try {
                const payload = {
                    categoryName: data.name,
                    categoryIcon: editingCat?.icon ?? "help-circle",
                    sortOrder: editingCat?.id ?? categories.length + 1,
                    status: data.status !== "Inactive",
                };
                if (editingCat) {
                    await updateFaqCategory(editingCat.id, payload);
                } else {
                    await createFaqCategory(payload);
                }
                await loadCategories();
            } catch (e) {
                setLoadError(getApiErrorMessage(e));
            }
        })();
    };

    const handleToggle = (id: number) => {
        const cat = categories.find((c) => c.id === id);
        if (!cat) return;
        void (async () => {
            try {
                await updateFaqCategory(id, {
                    categoryName: cat.name,
                    categoryIcon: cat.icon,
                    sortOrder: id,
                    status: cat.status !== "Active",
                });
                await loadCategories();
            } catch (e) {
                setLoadError(getApiErrorMessage(e));
            }
        })();
    };

    const doDelete = (id: number) => {
        void (async () => {
            try {
                await deleteFaqCategory(id);
                await loadCategories();
            } catch (e) {
                setLoadError(getApiErrorMessage(e));
            }
        })();
    };

    const handleDelete = (id: number) => {
        if (Platform.OS === "web") {
            if (window.confirm("Are you sure you want to delete this category?")) {
                doDelete(id);
            }
        } else {
            Alert.alert(
                "Confirm Delete",
                "Are you sure you want to delete this category?",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: () => doDelete(id) },
                ]
            );
        }
    };

    // Stat cards data
    const stats = [
        { label: "Total Categories", value: String(categories.length), icon: "grid",         color: PRIMARY       },
        { label: "Active",           value: String(totalActive),        icon: "check-circle", color: ACCENT_TEAL   },
        { label: "Inactive",         value: String(categories.length - totalActive), icon: "slash", color: ACCENT_RED },
        { label: "Total FAQs",       value: String(totalFaqs),          icon: "help-circle",  color: ACCENT_SKY    },
    ];

    return (
        <AdminLayout>
            <View style={st.root}>
                <StatusBar barStyle="light-content" backgroundColor={DARK_NAVY} />

                {/* ── HEADER ── */}
                <View style={[st.header, isWeb && st.headerWeb]}>
                    <View style={st.headerLeft}>
                        <View style={st.headerIcon}>
                            <Feather name="help-circle" size={22} color="#fff" />
                        </View>
                        <View>
                            <Text style={st.headerTitle}>FAQ Categories</Text>
                            <Text style={st.headerBreadcrumb}>
                                <Text style={{ color: PRIMARY }}>Dashboard</Text>{"  ›  FAQ Categories"}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity style={st.addBtn}
                        onPress={() => { setEditingCat(null); setModalVisible(true); }}>
                        <Feather name="plus" size={14} color="#fff" />
                        <Text style={st.addBtnText}>Add Category</Text>
                    </TouchableOpacity>
                </View>

                {/* ── WEB STAT CARDS (overlapping header) ── */}
                {isWeb && (
                    <View style={st.statsRow}>
                        {stats.map((s, i) => (
                            <View key={i} style={[st.statCard, { borderTopColor: s.color }]}>
                                <View style={[st.statIconWrap, { backgroundColor: s.color + "18" }]}>
                                    <Feather name={s.icon as any} size={22} color={s.color} />
                                </View>
                                <View>
                                    <Text style={[st.statValue, { color: s.color }]}>{s.value}</Text>
                                    <Text style={st.statLabel}>{s.label.toUpperCase()}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                <ScrollView style={st.scroll}
                    contentContainerStyle={[st.scrollContent, !isWeb && { paddingBottom: 100 }]}
                    showsVerticalScrollIndicator={false}>

                    {loadError ? (
                        <Text style={{ color: ACCENT_RED, marginBottom: 12, paddingHorizontal: 16 }}>{loadError}</Text>
                    ) : null}

                    {/* ── MOBILE STAT CARDS ── */}
                    {!isWeb && (
                        <View style={st.statsCardSingle}>
                            {stats.map((s, i) => (
                                <React.Fragment key={i}>
                                    {i > 0 && <View style={st.statDividerSingle} />}
                                    <View style={st.statBlockSingle}>
                                        <View style={[st.statIconWrapperSingle, { backgroundColor: s.color + "18" }]}>
                                            <Feather name={s.icon as any} size={20} color={s.color} />
                                        </View>
                                        <View style={st.statTextWrapperSingle}>
                                            <Text style={[st.statValueSingle, { color: s.color }]}>{s.value}</Text>
                                            <Text style={st.statLabelSingle}>{s.label.toUpperCase()}</Text>
                                        </View>
                                    </View>
                                </React.Fragment>
                            ))}
                        </View>
                    )}

                    {/* ── TOOLBAR ── */}
                    <View style={[st.toolbar, !isWeb && { flexWrap: "wrap" as any }]}>
                        {/* Search */}
                        <View style={[st.searchWrap, !isWeb && { minWidth: "100%" as any }]}>
                            <Feather name="search" size={14} color={PRIMARY} />
                            <TextInput style={st.searchInput}
                                placeholder="Search categories..."
                                placeholderTextColor={TEXT_MUTED}
                                value={search}
                                onChangeText={setSearch} />
                            {search.length > 0 && (
                                <TouchableOpacity onPress={() => setSearch("")}>
                                    <Feather name="x-circle" size={14} color={TEXT_MUTED} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Filter chips */}
                        <View style={st.chips}>
                            {(["All", "Active", "Inactive"] as const).map(f => (
                                <TouchableOpacity key={f}
                                    style={[st.chip, statusFilter === f && { backgroundColor: PRIMARY, borderColor: PRIMARY }]}
                                    onPress={() => setStatusFilter(f)}>
                                    <Text style={[st.chipText, statusFilter === f && { color: "#fff" }]}>{f}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* View toggle */}
                        <View style={st.viewToggle}>
                            <TouchableOpacity
                                style={[st.viewBtn, viewMode === "grid" && { backgroundColor: PRIMARY }]}
                                onPress={() => setViewMode("grid")}>
                                <Feather name="grid" size={15} color={viewMode === "grid" ? "#fff" : TEXT_MUTED} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[st.viewBtn, viewMode === "list" && { backgroundColor: PRIMARY }]}
                                onPress={() => setViewMode("list")}>
                                <Feather name="list" size={15} color={viewMode === "list" ? "#fff" : TEXT_MUTED} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* ── RESULT COUNT ── */}
                    <Text style={st.resultCount}>
                        Showing{" "}
                        <Text style={{ color: PRIMARY, fontWeight: "700" }}>{filtered.length}</Text>
                        {" "}of {categories.length} categories
                    </Text>

                    {/* ── CONTENT ── */}
                    {filtered.length === 0 ? (
                        <View style={st.empty}>
                            <View style={st.emptyIconWrap}>
                                <Feather name="inbox" size={36} color={TEXT_MUTED} />
                            </View>
                            <Text style={st.emptyTitle}>No categories found</Text>
                            <Text style={st.emptySubtitle}>Try adjusting your search or filters</Text>
                        </View>
                    ) : viewMode === "grid" ? (
                        <View style={[st.grid, isWeb && st.gridWeb]}>
                            {filtered.map(cat => (
                                <View key={cat.id} style={[st.gridItem, isWeb && st.gridItemWeb]}>
                                    <GridCard
                                        cat={cat}
                                        onEdit={() => { setEditingCat(cat); setModalVisible(true); }}
                                        onToggle={() => handleToggle(cat.id)}
                                        onDelete={() => handleDelete(cat.id)}
                                        onNavigate={() => router.push("/Faqs")}
                                    />
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={st.listWrap}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={{ minWidth: 800 }}>
                                    <View style={lSt.headerRow}>
                                        <Text style={[lSt.headerCell, { flex: 2 }]}>Category</Text>
                                        <Text style={[lSt.headerCell, { width: 70  }]}>FAQs</Text>
                                        <Text style={[lSt.headerCell, { width: 90  }]}>Status</Text>
                                        <Text style={[lSt.headerCell, { width: 110 }]}>Created</Text>
                                        <Text style={[lSt.headerCell, { width: 120  }]}>Actions</Text>
                                    </View>
                                    {filtered.map(cat => (
                                        <ListRow key={cat.id} cat={cat}
                                            onEdit={() => { setEditingCat(cat); setModalVisible(true); }}
                                            onToggle={() => handleToggle(cat.id)}
                                            onDelete={() => handleDelete(cat.id)}
                                            onNavigate={() => router.push("/Faqs")} />
                                    ))}
                                </View>
                            </ScrollView>
                        </View>
                    )}
                </ScrollView>

                {/* ── MODAL ── */}
                <CategoryModal
                    visible={modalVisible}
                    onClose={() => { setModalVisible(false); setEditingCat(null); }}
                    onSave={handleSave}
                    editing={editingCat}
                    isWeb={isWeb}
                />
            </View>
        </AdminLayout>
    );
};

export default FaqCategoriesScreen;

// ─── MAIN STYLES ─────────────────────────────────────────────────────────────
const st = StyleSheet.create({
    root: { flex: 1, height: "100%", backgroundColor: BG_PAGE },

    // Header
    header:          { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: DARK_NAVY, paddingHorizontal: 18, paddingVertical: 16, borderRadius: 22 },
    headerWeb:       { paddingHorizontal: 32, paddingVertical: 28, paddingBottom: 68, marginHorizontal: 2, marginTop: 12, shadowColor: DARK_NAVY, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 10 },
    headerLeft:      { flexDirection: "row", alignItems: "center", gap: 14 },
    headerIcon:      { width: 50, height: 50, borderRadius: 16, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center", shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
    headerTitle:     { fontSize: 20, fontWeight: "800", color: "#ffffff", letterSpacing: -0.3 },
    headerBreadcrumb:{ fontSize: 12, color: "#cbd5e1", marginTop: 2 },
    addBtn:          { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: PRIMARY, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    addBtnText:      { color: "#fff", fontWeight: "700", fontSize: 13 },

    // Scroll
    scroll:        { flex: 1 },
    scrollContent: { padding: 16, gap: 14 },

    // Stats
    statsRow:    { flexDirection: "row", gap: 12, marginBottom: 4, marginTop: -42, marginHorizontal: 16, zIndex: 10, maxWidth: 900, alignSelf: "center", width: "100%" },
    statCard:    { flex: 1, backgroundColor: BG_CARD, borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 3, borderWidth: 1, borderColor: BORDER, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2 },
    statIconWrap:{ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    statValue:   { fontSize: 22, fontWeight: "800" },
    statLabel:   { fontSize: 10, color: TEXT_MUTED, marginTop: 2, fontWeight: "700", letterSpacing: 0.5 },

    // Stats Single Card (Mobile)
    statsCardSingle: { backgroundColor: BG_CARD, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2, marginBottom: 4 },
    statBlockSingle: { flexDirection: "row", alignItems: "center", gap: 14 },
    statIconWrapperSingle: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    statTextWrapperSingle: { flex: 1 },
    statValueSingle: { fontSize: 20, fontWeight: "800", marginBottom: 2 },
    statLabelSingle: { fontSize: 11, fontWeight: "700", color: TEXT_MUTED, letterSpacing: 0.5 },
    statDividerSingle: { height: 1, backgroundColor: BORDER, marginVertical: 12 },

    // Toolbar
    toolbar:     { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: BG_CARD, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
    searchWrap:  { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1.5, borderColor: PRIMARY + "55", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: BG_PAGE },
    searchInput: { flex: 1, fontSize: 13, color: TEXT_HEAD, outlineStyle: "none" } as any,
    chips:       { flexDirection: "row", gap: 6 },
    chip:        { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: BORDER, backgroundColor: BG_PAGE },
    chipText:    { fontSize: 12, fontWeight: "600", color: TEXT_BODY },
    viewToggle:  { flexDirection: "row", backgroundColor: BG_PAGE, borderRadius: 8, borderWidth: 1, borderColor: BORDER, overflow: "hidden" },
    viewBtn:     { padding: 8 },

    // Result count
    resultCount: { fontSize: 12, color: TEXT_MUTED, fontWeight: "500" },

    // Grid
    grid:        { gap: 14 },
    gridWeb:     { flexDirection: "row", flexWrap: "wrap" as any, gap: 16 },
    gridItem:    { width: "100%" },
    gridItemWeb: { width: "23%", minWidth: 240 },

    // List
    listWrap: { backgroundColor: BG_CARD, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: BORDER, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },

    // Empty
    empty:        { alignItems: "center", paddingVertical: 60, gap: 10 },
    emptyIconWrap:{ width: 72, height: 72, borderRadius: 24, backgroundColor: BG_CARD, alignItems: "center", justifyContent: "center", marginBottom: 4, borderWidth: 1, borderColor: BORDER },
    emptyTitle:   { fontSize: 16, fontWeight: "700", color: TEXT_HEAD },
    emptySubtitle:{ fontSize: 13, color: TEXT_MUTED },
});

// ─── CARD STYLES (image-2) ────────────────────────────────────────────────────
const cSt = StyleSheet.create({
    card: {
        backgroundColor: BG_CARD,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: BORDER,
        borderTopWidth: 4,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 3,
    },
    topRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
    iconWrap:   { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    actionBtns: { flexDirection: "row", gap: 8 },
    iconBtn:    { width: 32, height: 32, borderRadius: 8, backgroundColor: BG_PAGE, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: BORDER },
    iconBtnRed: { backgroundColor: ACCENT_RED + "10", borderColor: ACCENT_RED + "40" },

    name: { fontSize: 15, fontWeight: "800", color: TEXT_HEAD, marginBottom: 4 },
    desc: { fontSize: 12, color: TEXT_BODY, lineHeight: 18, marginBottom: 14 },

    divider: { height: 1, backgroundColor: BORDER, marginBottom: 12 },

    metaRow:    { flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" as any },
    metaItem:   { flexDirection: "row", alignItems: "center", gap: 4 },
    metaText:   { fontSize: 11, color: TEXT_MUTED, fontWeight: "500" },
    statusDot:  { width: 7, height: 7, borderRadius: 4 },
    statusLabel:{ fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },
});

// ─── LIST ROW STYLES ─────────────────────────────────────────────────────────
const lSt = StyleSheet.create({
    headerRow:  { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: BG_PAGE },
    headerCell: { fontSize: 10, fontWeight: "800", color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: 0.5 },

    row:        { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER, gap: 14 },
    iconWrap:   { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    info:       { flex: 1 },
    name:       { fontSize: 14, fontWeight: "700", color: TEXT_HEAD, marginBottom: 2 },
    desc:       { fontSize: 12, color: TEXT_BODY },
    countBox:   { alignItems: "center", width: 44 },
    countNum:   { fontSize: 16, fontWeight: "800", color: TEXT_HEAD },
    countLabel: { fontSize: 9,  color: TEXT_MUTED, fontWeight: "700", textTransform: "uppercase" },
    badge:      { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, width: 82 },
    dot:        { width: 6,  height: 6,  borderRadius: 3 },
    badgeText:  { fontSize: 11, fontWeight: "700" },
    date:       { fontSize: 11, color: TEXT_MUTED, width: 100 },
    actions:    { flexDirection: "row", gap: 8 },
    btn:        { width: 32, height: 32, borderRadius: 8, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: PRIMARY + "30" },
    btnRed:     { backgroundColor: ACCENT_RED + "10", borderColor: ACCENT_RED + "30" },
});

// ─── MODAL STYLES ────────────────────────────────────────────────────────────
const mSt = StyleSheet.create({
    overlay:          { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center" },
    sheet:            { backgroundColor: BG_CARD, borderRadius: 20, overflow: "hidden", width: "90%", maxWidth: 480, maxHeight: "85%" as any, borderWidth: 1, borderColor: BORDER, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
    sheetWeb:         { width: 460 },
    header:           { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: DARK_NAVY, backgroundColor: DARK_NAVY },
    headerDot:        { width: 10, height: 10, borderRadius: 5 },
    title:            { fontSize: 16, fontWeight: "800", color: "#ffffff" },
    closeBtn:         { width: 32, height: 32, borderRadius: 10, backgroundColor: BG_PAGE, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: BORDER },
    label:            { fontSize: 11, fontWeight: "700", color: TEXT_BODY, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 },
    input:            { borderWidth: 1.5, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 13, color: TEXT_HEAD, backgroundColor: BG_PAGE, marginBottom: 18 },
    statusToggle:     { flexDirection: "row", gap: 10, marginBottom: 18 },
    statusOption:     { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, alignItems: "center" },
    statusOptionText: { fontSize: 13, fontWeight: "700", color: TEXT_BODY },
    footer:           { flexDirection: "row", justifyContent: "flex-end", gap: 12, padding: 18, borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: BG_PAGE },
    cancelBtn:        { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, backgroundColor: BG_CARD },
    cancelText:       { color: TEXT_BODY, fontWeight: "700", fontSize: 13 },
    saveBtn:          { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: PRIMARY, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    saveText:         { color: "#fff", fontWeight: "700", fontSize: 13 },
});