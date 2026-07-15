import React, { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api/client";
import { mapFaqCategoryRow, mapFaqQuestionRow } from "@/lib/mappers";
import {
    createFaq,
    deleteFaq,
    fetchFaqCategories,
    fetchFaqs,
    updateFaq,
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
    useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import AdminLayout from "@/components/admin-layout";
import Pagination from "@/components/Pagination";

// ─── THEME ──────────────────────────────────────────────────────────────────
const PRIMARY = "#ef7b1a";
const PRIMARY_LIGHT = "#fff4eb";
const NAVY = "#1e3a5f";
const ACCENT_TEAL = "#00b894";
const ACCENT_PURPLE = "#6c5ce7";
const ACCENT_SKY = "#0984e3";
const ACCENT_AMBER = "#e17055";
const ACCENT_PINK = "#e84393";
const ACCENT_RED = "#d63031";
const ACCENT_GREEN = "#00b359";
const ACCENT_VIOLET = "#8e44ad";

const BG_PAGE = "#f2f4f7";
const BG_CARD = "#ffffff";
const BORDER = "#e8ecf0";
const TEXT_HEAD = "#1a2b4a";
const TEXT_BODY = "#4a5568";
const TEXT_MUTED = "#a0aec0";

// ─── RESPONSIVE BREAKPOINTS ─────────────────────────────────────────────────
// mobile   : < 640
// tablet   : 640 – 899
// desktop  : >= 900 (up to and beyond 1024)
type Breakpoint = "mobile" | "tablet" | "desktop";
const getBreakpoint = (width: number): Breakpoint => {
    if (width < 640) return "mobile";
    if (width < 900) return "tablet";
    return "desktop";
};

// ─── TYPES ──────────────────────────────────────────────────────────────────
interface FaqCategory {
    id: number;
    name: string;
    icon: string;
    color: string;
    slug: string;
}

interface FaqQuestion {
    id: number;
    categoryId: number;
    question: string;
    answer: string;
    status: "Active" | "Inactive";
    createdAt: string;
    order: number;
    isForSeller?: boolean;
}

// FAQ categories and questions load from /api/admin/faq

const getSafeIcon = (category?: FaqCategory | null): string => {
    if (!category) return "help-circle";
    const name = (category.name || "").toLowerCase();

    if (name.includes("order") || name.includes("shipping") || name.includes("delivery")) return "truck";
    if (name.includes("payment") || name.includes("wallet") || name.includes("card") || name.includes("bank")) return "credit-card";
    if (name.includes("return") || name.includes("refund") || name.includes("exchange")) return "refresh-ccw";
    if (name.includes("account") || name.includes("profile") || name.includes("user")) return "user";
    if (name.includes("product") || name.includes("item") || name.includes("inventory")) return "box";
    if (name.includes("offer") || name.includes("discount") || name.includes("promo") || name.includes("sale")) return "tag";
    if (name.includes("security") || name.includes("privacy") || name.includes("policy")) return "shield";
    if (name.includes("setting") || name.includes("preference")) return "settings";
    if (name.includes("seller") || name.includes("vendor") || name.includes("store")) return "shopping-bag";
    if (name.includes("support") || name.includes("contact") || name.includes("help")) return "message-circle";

    const defaults = ["info", "star", "bookmark", "layers", "list", "file-text"];
    return category.icon && category.icon !== "help-circle" ? category.icon : defaults[(category.id || 0) % defaults.length];
};

// ─── VIEW QUESTION MODAL ────────────────────────────────────────────────────
const ViewModal: React.FC<{
    visible: boolean;
    question: FaqQuestion | null;
    category: FaqCategory | undefined;
    onClose: () => void;
    isWeb: boolean;
}> = ({ visible, question, category, onClose, isWeb }) => {
    if (!visible || !question) return null;
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={mSt.overlay}>
                <View style={[mSt.sheet, isWeb && mSt.sheetWeb]}>
                    <View style={[mSt.headerBar, { borderBottomColor: category?.color ?? PRIMARY }]}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                            <View style={[mSt.iconSmall, { backgroundColor: (category?.color ?? PRIMARY) + "20" }]}>
                                <Feather name={getSafeIcon(category) as any} size={16} color={category?.color ?? PRIMARY} />
                            </View>
                            <View>
                                <Text style={mSt.sheetTitle}>View Question</Text>
                                <Text style={mSt.sheetSub}>{category?.name}</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={mSt.closeBtn}>
                            <Feather name="x" size={16} color={TEXT_BODY} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={{ padding: 22 }}>
                        <View style={[mSt.qBox, { borderLeftColor: category?.color ?? PRIMARY }]}>
                            <Text style={mSt.qLabel}>QUESTION</Text>
                            <Text style={mSt.qText}>{question.question}</Text>
                        </View>
                        <View style={mSt.aBox}>
                            <Text style={mSt.qLabel}>ANSWER</Text>
                            <Text style={mSt.aText}>{question.answer}</Text>
                        </View>
                        <View style={mSt.metaGrid}>
                            <View style={mSt.metaItem}>
                                <Text style={mSt.metaKey}>Status</Text>
                                <View style={[mSt.badge, { backgroundColor: question.status === "Active" ? ACCENT_TEAL + "20" : ACCENT_RED + "20" }]}>
                                    <View style={[mSt.dot, { backgroundColor: question.status === "Active" ? ACCENT_TEAL : ACCENT_RED }]} />
                                    <Text style={[mSt.badgeText, { color: question.status === "Active" ? ACCENT_TEAL : ACCENT_RED }]}>{question.status}</Text>
                                </View>
                            </View>
                            <View style={mSt.metaItem}>
                                <Text style={mSt.metaKey}>Created</Text>
                                <Text style={mSt.metaVal}>{question.createdAt}</Text>
                            </View>
                            <View style={mSt.metaItem}>
                                <Text style={mSt.metaKey}>For Seller</Text>
                                <Text style={mSt.metaVal}>{question.isForSeller ? "Yes" : "No"}</Text>
                            </View>
                            <View style={mSt.metaItem}>
                                <Text style={mSt.metaKey}>Order #</Text>
                                <Text style={mSt.metaVal}>{question.order}</Text>
                            </View>
                        </View>
                    </ScrollView>
                    <View style={mSt.footer}>
                        <TouchableOpacity style={mSt.footerCloseBtn} onPress={onClose}>
                            <Text style={mSt.footerCloseTxt}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// ─── ADD / EDIT QUESTION MODAL ──────────────────────────────────────────────
const QuestionModal: React.FC<{
    visible: boolean;
    editing: FaqQuestion | null;
    categoryId: number;
    categories: FaqCategory[];
    onClose: () => void;
    onSave: (q: Partial<FaqQuestion> & { categoryId: number }) => void;
    isWeb: boolean;
}> = ({ visible, editing, categoryId, categories, onClose, onSave, isWeb }) => {
    const [question, setQuestion] = useState(editing?.question ?? "");
    const [answer, setAnswer] = useState(editing?.answer ?? "");
    const [status, setStatus] = useState<"Active" | "Inactive">(editing?.status ?? "Active");
    const [catId, setCatId] = useState(editing?.categoryId ?? categoryId);
    const [isForSeller, setIsForSeller] = useState(editing?.isForSeller ?? false);

    React.useEffect(() => {
        setQuestion(editing?.question ?? "");
        setAnswer(editing?.answer ?? "");
        setStatus(editing?.status ?? "Active");
        setCatId(editing?.categoryId ?? categoryId);
        setIsForSeller(editing?.isForSeller ?? false);
    }, [editing, visible, categoryId]);

    if (!visible) return null;
    const cat = categories.find(c => c.id === catId);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={mSt.overlay}>
                <View style={[mSt.sheet, isWeb && mSt.sheetWeb]}>
                    <View style={[mSt.headerBar, { borderBottomColor: cat?.color ?? PRIMARY }]}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                            <View style={[mSt.headerDot, { backgroundColor: cat?.color ?? PRIMARY }]} />
                            <Text style={mSt.sheetTitle}>{editing ? "Edit Question" : "Add New Question"}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={mSt.closeBtn}>
                            <Feather name="x" size={16} color={TEXT_BODY} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ padding: 22 }}>
                        <Text style={mSt.label}>Category</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
                            <View style={{ flexDirection: "row", gap: 8 }}>
                                {categories.map(c => (
                                    <TouchableOpacity key={c.id}
                                        style={[mSt.catChip, catId === c.id && { backgroundColor: c.color, borderColor: c.color }]}
                                        onPress={() => setCatId(c.id)}>
                                        <Feather name={getSafeIcon(c) as any} size={11} color={catId === c.id ? "#fff" : c.color} />
                                        <Text style={[mSt.catChipText, catId === c.id && { color: "#fff" }]}>{c.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        <Text style={mSt.label}>Question</Text>
                        <TextInput style={[mSt.input, { height: 80, textAlignVertical: "top", paddingTop: 12 }]}
                            value={question} onChangeText={setQuestion}
                            placeholder="Enter the FAQ question..." placeholderTextColor={TEXT_MUTED} multiline />

                        <Text style={mSt.label}>Answer</Text>
                        <TextInput style={[mSt.input, { height: 120, textAlignVertical: "top", paddingTop: 12 }]}
                            value={answer} onChangeText={setAnswer}
                            placeholder="Enter the detailed answer..." placeholderTextColor={TEXT_MUTED} multiline />

                        <Text style={mSt.label}>Status</Text>
                        <View style={mSt.statusToggle}>
                            {(["Active", "Inactive"] as const).map(s => (
                                <TouchableOpacity key={s}
                                    style={[mSt.statusOption, status === s && {
                                        backgroundColor: s === "Active" ? ACCENT_TEAL : ACCENT_RED,
                                        borderColor: s === "Active" ? ACCENT_TEAL : ACCENT_RED,
                                    }]}
                                    onPress={() => setStatus(s)}>
                                    <Text style={[mSt.statusOptionTxt, status === s && { color: "#fff" }]}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={mSt.label}>For Seller?</Text>
                        <View style={mSt.statusToggle}>
                            {(["On", "Off"] as const).map(s => {
                                const isSelected = (s === "On") === isForSeller;
                                return (
                                    <TouchableOpacity key={s}
                                        style={[mSt.statusOption, isSelected && {
                                            backgroundColor: s === "On" ? ACCENT_TEAL : TEXT_MUTED,
                                            borderColor: s === "On" ? ACCENT_TEAL : TEXT_MUTED,
                                        }]}
                                        onPress={() => setIsForSeller(s === "On")}>
                                        <Text style={[mSt.statusOptionTxt, isSelected && { color: "#fff" }]}>{s}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>

                    <View style={mSt.footer}>
                        <TouchableOpacity style={mSt.cancelBtn} onPress={onClose}>
                            <Text style={mSt.cancelTxt}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[mSt.saveBtn, { backgroundColor: cat?.color ?? PRIMARY }]}
                            onPress={() => { onSave({ question, answer, status, categoryId: catId, isForSeller }); onClose(); }}>
                            <Feather name={editing ? "check" : "plus"} size={14} color="#fff" />
                            <Text style={mSt.saveTxt}>{editing ? "Save Changes" : "Add Question"}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// ─── DELETE CONFIRM MODAL ───────────────────────────────────────────────────
const DeleteModal: React.FC<{
    visible: boolean;
    question: FaqQuestion | null;
    onClose: () => void;
    onConfirm: () => void;
    isWeb: boolean;
}> = ({ visible, question, onClose, onConfirm, isWeb }) => {
    if (!visible || !question) return null;
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={mSt.overlay}>
                <View style={[mSt.sheet, isWeb && { width: 400 }, { maxHeight: 300 }]}>
                    <View style={[mSt.headerBar, { borderBottomColor: ACCENT_RED }]}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                            <View style={[mSt.headerDot, { backgroundColor: ACCENT_RED }]} />
                            <Text style={[mSt.sheetTitle, { color: ACCENT_RED }]}>Delete Question</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={mSt.closeBtn}>
                            <Feather name="x" size={16} color={TEXT_BODY} />
                        </TouchableOpacity>
                    </View>
                    <View style={{ padding: 22, flex: 1 }}>
                        <Text style={[TEXT_BODY && { color: TEXT_BODY }, { fontSize: 14, lineHeight: 22 }]}>
                            Are you sure you want to delete this question?{"\n\n"}
                            <Text style={{ fontWeight: "700", color: TEXT_HEAD }}>"{question.question}"</Text>
                            {"\n\n"}This action cannot be undone.
                        </Text>
                    </View>
                    <View style={mSt.footer}>
                        <TouchableOpacity style={mSt.cancelBtn} onPress={onClose}>
                            <Text style={mSt.cancelTxt}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[mSt.saveBtn, { backgroundColor: ACCENT_RED }]} onPress={onConfirm}>
                            <Feather name="trash-2" size={14} color="#fff" />
                            <Text style={mSt.saveTxt}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// ─── CATEGORY RAIL ITEM (sidebar on tablet/desktop, chip strip on mobile) ───
const CategoryRailItem: React.FC<{
    cat: FaqCategory;
    count: number;
    activeCount: number;
    selected: boolean;
    layout: Breakpoint;
    onPress: () => void;
}> = ({ cat, count, activeCount, selected, layout, onPress }) => {
    const ratio = count > 0 ? activeCount / count : 0;
    if (layout === "mobile") {
        return (
            <TouchableOpacity
                style={[railSt.chip, { borderColor: selected ? cat.color : BORDER }, selected && { backgroundColor: cat.color + "12" }]}
                onPress={onPress}>
                <View style={[railSt.chipIcon, { backgroundColor: cat.color + "20" }]}>
                    <Feather name={getSafeIcon(cat) as any} size={13} color={cat.color} />
                </View>
                <Text style={[railSt.chipText, selected && { color: cat.color }]} numberOfLines={1}>{cat.name}</Text>
                <View style={[railSt.chipCount, { backgroundColor: cat.color + "20" }]}>
                    <Text style={[railSt.chipCountText, { color: cat.color }]}>{count}</Text>
                </View>
            </TouchableOpacity>
        );
    }
    return (
        <TouchableOpacity
            style={[railSt.item, selected && { backgroundColor: cat.color + "10", borderLeftColor: cat.color }]}
            onPress={onPress}>
            <View style={[railSt.itemIcon, { backgroundColor: cat.color + "18" }]}>
                <Feather name={getSafeIcon(cat) as any} size={15} color={cat.color} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[railSt.itemName, selected && { color: cat.color }]} numberOfLines={1}>{cat.name}</Text>
                <View style={railSt.itemBarTrack}>
                    <View style={[railSt.itemBarFill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: cat.color }]} />
                </View>
            </View>
            <Text style={[railSt.itemCount, selected && { color: cat.color }]}>{count}</Text>
        </TouchableOpacity>
    );
};

// ─── STAT PILL ───────────────────────────────────────────────────────────
const StatPill: React.FC<{ icon: string; label: string; value: number; color: string }> = ({ icon, label, value, color }) => (
    <View style={statSt.pill}>
        <View style={[statSt.pillIcon, { backgroundColor: color + "18" }]}>
            <Feather name={icon as any} size={15} color={color} />
        </View>
        <View>
            <Text style={statSt.pillValue}>{value}</Text>
            <Text style={statSt.pillLabel}>{label}</Text>
        </View>
    </View>
);

// ─── ACCORDION QUESTION CARD (list mode) ───────────────────────────────────
const QuestionAccordionCard: React.FC<{
    q: FaqQuestion;
    cat: FaqCategory | undefined;
    index: number;
    expanded: boolean;
    onToggleExpand: () => void;
    onToggleSeller: () => void;
    onView: () => void;
    onEdit: () => void;
    onDelete: () => void;
}> = ({ q, cat, index, expanded, onToggleExpand, onToggleSeller, onView, onEdit, onDelete }) => {
    const isActive = q.status === "Active";
    const accent = cat?.color ?? PRIMARY;
    return (
        <View style={[accSt.card, expanded && { borderColor: accent }]}>
            <TouchableOpacity style={accSt.head} onPress={onToggleExpand} activeOpacity={0.75}>
                <View style={[accSt.badge, { backgroundColor: accent + "18" }]}>
                    <Text style={[accSt.badgeText, { color: accent }]}>{String(index).padStart(2, "0")}</Text>
                </View>
                <View style={accSt.headMid}>
                    <Text style={accSt.question} numberOfLines={expanded ? undefined : 1}>{q.question}</Text>
                    <View style={accSt.metaRow}>
                        <View style={[accSt.statusDot, { backgroundColor: isActive ? ACCENT_TEAL : ACCENT_RED }]} />
                        <Text style={accSt.metaText}>{q.status}</Text>
                        <Text style={accSt.metaDivider}>•</Text>
                        <Text style={accSt.metaText}>Order {q.order}</Text>
                        {q.isForSeller ? (
                            <>
                                <Text style={accSt.metaDivider}>•</Text>
                                <Text style={[accSt.metaText, { color: PRIMARY, fontWeight: "700" }]}>Seller</Text>
                            </>
                        ) : null}
                    </View>
                </View>
                <Feather name={expanded ? "chevron-up" : "chevron-down"} size={18} color={TEXT_MUTED} />
            </TouchableOpacity>

            {expanded && (
                <View style={accSt.body}>
                    <Text style={accSt.answer}>{q.answer}</Text>
                    <View style={accSt.footerRow}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                            <Text style={accSt.dateText}>{q.createdAt}</Text>
                            <TouchableOpacity
                                style={[accSt.toggle, q.isForSeller && { backgroundColor: ACCENT_TEAL }]}
                                onPress={onToggleSeller}
                                activeOpacity={0.8}>
                                <View style={[accSt.toggleThumb, q.isForSeller && accSt.toggleThumbOn]} />
                            </TouchableOpacity>
                            <Text style={accSt.toggleLabel}>For seller</Text>
                        </View>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                            <TouchableOpacity style={[accSt.actionBtn, { backgroundColor: ACCENT_SKY + "15", borderColor: ACCENT_SKY + "40" }]} onPress={onView}>
                                <Feather name="eye" size={13} color={ACCENT_SKY} />
                            </TouchableOpacity>
                            <TouchableOpacity style={[accSt.actionBtn, { backgroundColor: accent + "15", borderColor: accent + "40" }]} onPress={onEdit}>
                                <Feather name="edit-2" size={13} color={accent} />
                            </TouchableOpacity>
                            <TouchableOpacity style={[accSt.actionBtn, { backgroundColor: ACCENT_RED + "15", borderColor: ACCENT_RED + "40" }]} onPress={onDelete}>
                                <Feather name="trash-2" size={13} color={ACCENT_RED} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
};

// ─── TILE QUESTION CARD (grid mode) ─────────────────────────────────────────
const QuestionTileCard: React.FC<{
    q: FaqQuestion;
    cat: FaqCategory | undefined;
    index: number;
    widthPct: string;
    onView: () => void;
    onEdit: () => void;
    onDelete: () => void;
}> = ({ q, cat, index, widthPct, onView, onEdit, onDelete }) => {
    const isActive = q.status === "Active";
    const accent = cat?.color ?? PRIMARY;
    return (
        <View style={[tileSt.card, { width: widthPct as any, borderTopColor: accent }]}>
            <View style={tileSt.topRow}>
                <Text style={[tileSt.index, { color: accent }]}>Q{index}</Text>
                <View style={[tileSt.statusChip, { backgroundColor: isActive ? ACCENT_TEAL + "18" : ACCENT_RED + "18" }]}>
                    <Text style={[tileSt.statusChipText, { color: isActive ? ACCENT_TEAL : ACCENT_RED }]}>{q.status}</Text>
                </View>
            </View>
            <Text style={tileSt.question} numberOfLines={3}>{q.question}</Text>
            <Text style={tileSt.answer} numberOfLines={3}>{q.answer}</Text>
            <View style={tileSt.bottomRow}>
                <Text style={tileSt.dateText}>{q.createdAt}</Text>
                {q.isForSeller && (
                    <View style={tileSt.sellerTag}>
                        <Feather name="briefcase" size={9} color={PRIMARY} />
                        <Text style={tileSt.sellerTagText}>Seller</Text>
                    </View>
                )}
            </View>
            <View style={tileSt.actions}>
                <TouchableOpacity style={[tileSt.actionBtn, { backgroundColor: ACCENT_SKY + "15" }]} onPress={onView}>
                    <Feather name="eye" size={13} color={ACCENT_SKY} />
                </TouchableOpacity>
                <TouchableOpacity style={[tileSt.actionBtn, { backgroundColor: accent + "15" }]} onPress={onEdit}>
                    <Feather name="edit-2" size={13} color={accent} />
                </TouchableOpacity>
                <TouchableOpacity style={[tileSt.actionBtn, { backgroundColor: ACCENT_RED + "15" }]} onPress={onDelete}>
                    <Feather name="trash-2" size={13} color={ACCENT_RED} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
const FaqQuestionsScreen: React.FC = () => {
    const isWeb = Platform.OS === "web";
    const { width } = useWindowDimensions();
    const layout = getBreakpoint(width);
    const isMobile = layout === "mobile";
    const isDesktopLayout = layout !== "mobile";

    const { categoryId: initialCategoryId } = useLocalSearchParams();
    const [categories, setCategories] = useState<FaqCategory[]>([]);
    const [questions, setQuestions] = useState<FaqQuestion[]>([]);
    const [selectedCatId, setSelectedCatId] = useState<number>(initialCategoryId ? Number(initialCategoryId) : 0);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
    const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive">("All");

    const [viewModal, setViewModal] = useState<FaqQuestion | null>(null);
    const [editModal, setEditModal] = useState<FaqQuestion | null>(null);
    const [addModal, setAddModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState<FaqQuestion | null>(null);
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const loadCategories = useCallback(async () => {
        try {
            setLoadError(null);
            const rows = await fetchFaqCategories();
            const mapped = rows
                .map((r, i) => {
                    const cat = mapFaqCategoryRow(r, i);
                    return { id: cat.id, name: cat.name, icon: cat.icon, color: cat.color, slug: cat.slug, status: cat.status };
                })
                .filter((cat) => cat.status === "Active");
            setCategories(mapped);
            if (mapped.length > 0) {
                setSelectedCatId((prev) => (prev && mapped.some((c) => c.id === prev) ? prev : mapped[0].id));
            }
        } catch (e) {
            setLoadError(getApiErrorMessage(e));
        }
    }, []);

    const loadQuestions = useCallback(async (categoryId: number) => {
        if (!categoryId) return;
        try {
            setLoadError(null);
            const rows = await fetchFaqs(categoryId);
            setQuestions(rows.map(mapFaqQuestionRow));
        } catch (e) {
            setLoadError(getApiErrorMessage(e));
            setQuestions([]);
        }
    }, []);

    useEffect(() => {
        void loadCategories();
    }, [loadCategories]);

    useEffect(() => {
        if (selectedCatId) void loadQuestions(selectedCatId);
    }, [selectedCatId, loadQuestions]);

    const selectedCat = categories.find(c => c.id === selectedCatId);

    const filtered = questions.filter(q => {
        const inCat = q.categoryId === selectedCatId;
        const inSearch = q.question.toLowerCase().includes(search.toLowerCase()) ||
            q.answer.toLowerCase().includes(search.toLowerCase());
        const inStatus = statusFilter === "All" || q.status === statusFilter;
        return inCat && inSearch && inStatus;
    });

    const paginated = filtered.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const toggleExpand = (id: number) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleSave = (data: Partial<FaqQuestion> & { categoryId: number }) => {
        void (async () => {
            try {
                const payload = {
                    question: data.question,
                    answer: data.answer,
                    sortOrder: data.order ?? questions.length + 1,
                    status: data.status !== "Inactive",
                    isSeller: data.isForSeller ?? false,
                };
                if (editModal) {
                    await updateFaq(data.categoryId, editModal.id, payload);
                } else {
                    await createFaq(data.categoryId, payload);
                }
                await loadQuestions(data.categoryId);
                await loadCategories();
            } catch (e) {
                setLoadError(getApiErrorMessage(e));
            } finally {
                setEditModal(null);
                setAddModal(false);
            }
        })();
    };

    const handleDelete = () => {
        if (!deleteModal) return;
        void (async () => {
            try {
                await deleteFaq(deleteModal.categoryId, deleteModal.id);
                await loadQuestions(deleteModal.categoryId);
                await loadCategories();
            } catch (e) {
                setLoadError(getApiErrorMessage(e));
            } finally {
                setDeleteModal(null);
            }
        })();
    };

    // Stats for selected category
    const catQuestions = questions.filter(q => q.categoryId === selectedCatId);
    const activeCount = catQuestions.filter(q => q.status === "Active").length;
    const inactiveCount = catQuestions.length - activeCount;

    // Grid tile width per breakpoint
    const tileWidthPct = layout === "mobile" ? "100%" : layout === "tablet" ? "48%" : "31.5%";

    return (
        <AdminLayout>
            <View style={st.root}>
                <StatusBar barStyle="light-content" backgroundColor={NAVY} />

                <ScrollView style={st.scroll} showsVerticalScrollIndicator={false}>
                    {/* ——— PAGE HEADER (unchanged) ——— */}
                    <View style={[
                        st.header,
                        isWeb ? st.headerWeb : st.headerMobile,
                        { backgroundColor: "#151D4F", borderBottomColor: "#151D4F" }
                    ]}>
                        <View style={st.headerLeft}>
                            <View style={[st.headerIcon, { backgroundColor: PRIMARY }]}>
                                <Feather name="help-circle" size={isMobile ? 18 : 22} color="#fff" />
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={[st.headerTitle, { color: "#fff", fontSize: isMobile ? 16 : 20 }]} numberOfLines={1}>FAQ Questions</Text>
                                {!isMobile && <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 2 }}>Manage frequently asked questions</Text>}
                            </View>
                        </View>
                        <TouchableOpacity style={[st.addBtn, { backgroundColor: PRIMARY, flexShrink: 0 }]}
                            onPress={() => { setEditModal(null); setAddModal(true); }}>
                            <Feather name="plus" size={14} color="#fff" />
                            <Text style={st.addBtnText}>{isMobile ? "Add" : "Add"}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* ——— BODY: new sidebar + main layout ——— */}
                    <View style={[st.body, !isMobile && st.bodyRow, !isWeb && { paddingBottom: 120 }]}>

                        {loadError ? (
                            <Text style={{ color: ACCENT_RED, marginHorizontal: 16, marginTop: 12 }}>{loadError}</Text>
                        ) : null}

                        {/* ── CATEGORY RAIL ── */}
                        {isMobile ? (
                            <View style={railSt.mobileWrap}>
                                <Text style={st.sectionLabel}>CATEGORIES</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
                                    {categories.map(cat => {
                                        const catQCount = questions.filter(q => q.categoryId === cat.id).length;
                                        const catActiveCount = questions.filter(q => q.categoryId === cat.id && q.status === "Active").length;
                                        return (
                                            <CategoryRailItem
                                                key={cat.id}
                                                cat={cat}
                                                count={catQCount}
                                                activeCount={catActiveCount}
                                                selected={cat.id === selectedCatId}
                                                layout={layout}
                                                onPress={() => { setSelectedCatId(cat.id); setSearch(""); setStatusFilter("All"); setExpandedIds(new Set()); setCurrentPage(1); }}
                                            />
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        ) : (
                            <View style={[railSt.sidebar, layout === "tablet" && { width: 190 }]}>
                                <Text style={st.sectionLabel}>CATEGORIES</Text>
                                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
                                    {categories.map(cat => {
                                        const catQCount = questions.filter(q => q.categoryId === cat.id).length;
                                        const catActiveCount = questions.filter(q => q.categoryId === cat.id && q.status === "Active").length;
                                        return (
                                            <CategoryRailItem
                                                key={cat.id}
                                                cat={cat}
                                                count={catQCount}
                                                activeCount={catActiveCount}
                                                selected={cat.id === selectedCatId}
                                                layout={layout}
                                                onPress={() => { setSelectedCatId(cat.id); setSearch(""); setStatusFilter("All"); setExpandedIds(new Set()); setCurrentPage(1); }}
                                            />
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        )}

                        {/* ── MAIN PANE ── */}
                        <View style={st.mainPane}>

                            {/* Stats strip */}
                            <View style={[statSt.row, isMobile && { flexWrap: "wrap" as any }]}>
                                <View style={statSt.headingWrap}>
                                    <View style={[statSt.catIcon, { backgroundColor: (selectedCat?.color ?? PRIMARY) + "18" }]}>
                                        <Feather name={getSafeIcon(selectedCat) as any} size={20} color={selectedCat?.color ?? PRIMARY} />
                                    </View>
                                    <Text style={[statSt.heading, isWeb && { maxWidth: "none" as any }]} numberOfLines={isWeb ? undefined : 1}>{selectedCat?.name ?? "—"}</Text>
                                </View>
                                <View style={statSt.pillsWrap}>
                                    <StatPill icon="hash" label="Total" value={catQuestions.length} color={NAVY} />
                                    <StatPill icon="check-circle" label="Active" value={activeCount} color={ACCENT_TEAL} />
                                    <StatPill icon="pause-circle" label="Inactive" value={inactiveCount} color={ACCENT_RED} />
                                </View>
                            </View>

                            {/* Toolbar */}
                            {isMobile ? (
                                <View style={st.toolbarMobile}>
                                    {/* Search bar — full width on mobile, always on top */}
                                    <View style={[st.searchWrap, { width: "100%", flex: 0 }]}>
                                        <Feather name="search" size={14} color={selectedCat?.color ?? PRIMARY} />
                                        <TextInput style={st.searchInput}
                                            placeholder="Search questions..."
                                            placeholderTextColor={TEXT_MUTED}
                                            value={search}
                                            onChangeText={(t) => {
                                                setSearch(t);
                                                setCurrentPage(1);
                                            }} />
                                        {search.length > 0 && (
                                            <TouchableOpacity onPress={() => {
                                                setSearch("");
                                                setCurrentPage(1);
                                            }}>
                                                <Feather name="x-circle" size={14} color={TEXT_MUTED} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    {/* Filter chips + view toggle — below search on mobile */}
                                    <View style={st.toolbarSecondRow}>
                                        <View style={st.chips}>
                                            {(["All", "Active", "Inactive"] as const).map(f => (
                                                <TouchableOpacity key={f}
                                                    style={[st.chip,
                                                    statusFilter === f && { backgroundColor: selectedCat?.color ?? PRIMARY, borderColor: selectedCat?.color ?? PRIMARY }]}
                                                    onPress={() => {
                                                        setStatusFilter(f);
                                                        setCurrentPage(1);
                                                    }}>
                                                    <Text style={[st.chipText, statusFilter === f && { color: "#fff" }]}>{f}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                        <View style={st.viewToggle}>
                                            <TouchableOpacity
                                                style={[st.viewToggleBtn, viewMode === "list" && st.viewToggleBtnActive]}
                                                onPress={() => setViewMode("list")}>
                                                <Feather name="list" size={16} color={viewMode === "list" ? "#fff" : "#374151"} />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[st.viewToggleBtn, viewMode === "grid" && st.viewToggleBtnActive]}
                                                onPress={() => setViewMode("grid")}>
                                                <Feather name="grid" size={16} color={viewMode === "grid" ? "#fff" : "#374151"} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            ) : (
                                <View style={st.toolbar}>
                                    <View style={st.searchWrap}>
                                        <Feather name="search" size={14} color={selectedCat?.color ?? PRIMARY} />
                                        <TextInput style={st.searchInput}
                                            placeholder="Search questions..."
                                            placeholderTextColor={TEXT_MUTED}
                                            value={search}
                                            onChangeText={(t) => {
                                                setSearch(t);
                                                setCurrentPage(1);
                                            }} />
                                        {search.length > 0 && (
                                            <TouchableOpacity onPress={() => {
                                                setSearch("");
                                                setCurrentPage(1);
                                            }}>
                                                <Feather name="x-circle" size={14} color={TEXT_MUTED} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    <View style={st.chips}>
                                        {(["All", "Active", "Inactive"] as const).map(f => (
                                            <TouchableOpacity key={f}
                                                style={[st.chip,
                                                statusFilter === f && { backgroundColor: selectedCat?.color ?? PRIMARY, borderColor: selectedCat?.color ?? PRIMARY }]}
                                                onPress={() => {
                                                    setStatusFilter(f);
                                                    setCurrentPage(1);
                                                }}>
                                                <Text style={[st.chipText, statusFilter === f && { color: "#fff" }]}>{f}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                    <View style={st.viewToggle}>
                                        <TouchableOpacity
                                            style={[st.viewToggleBtn, viewMode === "list" && st.viewToggleBtnActive]}
                                            onPress={() => setViewMode("list")}>
                                            <Feather name="list" size={16} color={viewMode === "list" ? "#fff" : "#374151"} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[st.viewToggleBtn, viewMode === "grid" && st.viewToggleBtnActive]}
                                            onPress={() => setViewMode("grid")}>
                                            <Feather name="grid" size={16} color={viewMode === "grid" ? "#fff" : "#374151"} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            {/* Result count */}
                            <Text style={st.resultCount}>
                                Showing <Text style={{ color: selectedCat?.color ?? PRIMARY, fontWeight: "700" }}>{filtered.length}</Text> questions
                            </Text>

                            {/* Content */}
                            {filtered.length === 0 ? (
                                <View style={st.empty}>
                                    <View style={[st.emptyIconWrap, { backgroundColor: (selectedCat?.color ?? PRIMARY) + "15" }]}>
                                        <Feather name="inbox" size={36} color={selectedCat?.color ?? TEXT_MUTED} />
                                    </View>
                                    <Text style={st.emptyTitle}>No questions found</Text>
                                    <Text style={st.emptySubtitle}>Try adjusting your search or add a new question</Text>
                                    <TouchableOpacity style={[st.emptyAddBtn, { backgroundColor: selectedCat?.color ?? PRIMARY }]}
                                        onPress={() => { setEditModal(null); setAddModal(true); }}>
                                        <Feather name="plus" size={14} color="#fff" />
                                        <Text style={st.emptyAddTxt}>Add </Text>
                                    </TouchableOpacity>
                                </View>
                            ) : viewMode === "grid" ? (
                                <View style={st.gridContainer}>
                                    {paginated.map((q, idx) => (
                                        <QuestionTileCard
                                            key={q.id}
                                            q={q}
                                            cat={selectedCat}
                                            index={(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                                            widthPct={tileWidthPct}
                                            onView={() => setViewModal(q)}
                                            onEdit={() => { setEditModal(q); setAddModal(true); }}
                                            onDelete={() => setDeleteModal(q)}
                                        />
                                    ))}
                                </View>
                            ) : (
                                <View style={{ gap: 10 }}>
                                    {paginated.map((q, idx) => (
                                        <QuestionAccordionCard
                                            key={q.id}
                                            q={q}
                                            cat={selectedCat}
                                            index={(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                                            expanded={expandedIds.has(q.id)}
                                            onToggleExpand={() => toggleExpand(q.id)}
                                            onToggleSeller={() => setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, isForSeller: !x.isForSeller } : x))}
                                            onView={() => setViewModal(q)}
                                            onEdit={() => { setEditModal(q); setAddModal(true); }}
                                            onDelete={() => setDeleteModal(q)}
                                        />
                                    ))}
                                </View>
                            )}

                            {filtered.length > 0 && (
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={Math.ceil(filtered.length / ITEMS_PER_PAGE)}
                                    totalItems={filtered.length}
                                    itemsPerPage={ITEMS_PER_PAGE}
                                    itemName="questions"
                                    onPageChange={setCurrentPage}
                                />
                            )}
                        </View>
                    </View>
                </ScrollView>

                {/* ── MODALS ── */}
                <ViewModal
                    visible={!!viewModal}
                    question={viewModal}
                    category={categories.find(c => c.id === viewModal?.categoryId)}
                    onClose={() => setViewModal(null)}
                    isWeb={isWeb}
                />
                <QuestionModal
                    visible={addModal}
                    editing={editModal}
                    categoryId={selectedCatId}
                    categories={categories}
                    onClose={() => { setAddModal(false); setEditModal(null); }}
                    onSave={handleSave}
                    isWeb={isWeb}
                />
                <DeleteModal
                    visible={!!deleteModal}
                    question={deleteModal}
                    onClose={() => setDeleteModal(null)}
                    onConfirm={handleDelete}
                    isWeb={isWeb}
                />
            </View>
        </AdminLayout>
    );
};

export default FaqQuestionsScreen;

// ─── MAIN STYLES ─────────────────────────────────────────────────────────────
const st = StyleSheet.create({
    root: { flex: 1, height: "100%", backgroundColor: BG_PAGE },

    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#151D4F", paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
    headerWeb: { marginHorizontal: 18, marginTop: 22, borderRadius: 18, paddingHorizontal: 28, paddingVertical: 18, paddingBottom: 36, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 18, elevation: 10 },
    headerMobile: {
        marginHorizontal: 14,
        marginTop: 16,
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
        elevation: 6,
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1, minWidth: 0, marginRight: 10 },
    headerIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4, flexShrink: 0 },
    headerTitle: { fontSize: 20, fontWeight: "800", color: TEXT_HEAD, letterSpacing: -0.3 },
    headerBreadcrumb: { fontSize: 12, color: TEXT_BODY, marginTop: 2 },
    addBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 },
    addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

    scroll: { flex: 1 },

    // New body: sidebar + main
    body: { padding: 14, gap: 12 },
    bodyRow: { flexDirection: "row", alignItems: "flex-start" },

    sectionLabel: { fontSize: 10, fontWeight: "800", color: PRIMARY, letterSpacing: 1.2, marginBottom: 10, textTransform: "uppercase" as any },

    mainPane: { flex: 1, gap: 12, minWidth: 0 },

    // Toolbar
    toolbar: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: BG_CARD, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: BORDER, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
    toolbarMobile: { flexDirection: "column", gap: 10, backgroundColor: BG_CARD, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: BORDER, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
    toolbarSecondRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
    searchWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1.5, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: BG_PAGE },
    searchInput: { flex: 1, fontSize: 13, color: TEXT_HEAD, outlineStyle: "none" } as any,
    chips: { flexDirection: "row", gap: 6 },
    chip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: BORDER, backgroundColor: BG_PAGE },
    chipText: { fontSize: 12, fontWeight: "700", color: TEXT_BODY },

    resultCount: { fontSize: 12, color: TEXT_MUTED, fontWeight: "600", paddingHorizontal: 2 },

    // Grid container
    gridContainer: { flexDirection: "row", flexWrap: "wrap", gap: 12 },

    // View toggle
    viewToggle: { flexDirection: "row", backgroundColor: "#E5E7EB", borderRadius: 10, padding: 3 },
    viewToggleBtn: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    viewToggleBtnActive: { backgroundColor: "#1E2B6B" },

    // Empty
    empty: { alignItems: "center", paddingVertical: 60, gap: 12, backgroundColor: BG_CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER },
    emptyIconWrap: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center" },
    emptyTitle: { fontSize: 16, fontWeight: "700", color: TEXT_HEAD },
    emptySubtitle: { fontSize: 13, color: TEXT_MUTED },
    emptyAddBtn: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 10, marginTop: 4 },
    emptyAddTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },
});

// ─── CATEGORY RAIL STYLES ────────────────────────────────────────────────────
const railSt = StyleSheet.create({
    mobileWrap: { backgroundColor: BG_CARD, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: BORDER, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    sidebar: { width: 240, backgroundColor: BG_CARD, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: BORDER, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },

    // mobile chip
    chip: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 22, borderWidth: 1.5, backgroundColor: BG_PAGE, maxWidth: 210 },
    chipIcon: { width: 24, height: 24, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    chipText: { fontSize: 12, fontWeight: "700", color: TEXT_HEAD, flexShrink: 1 },
    chipCount: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
    chipCountText: { fontSize: 11, fontWeight: "800" },

    // desktop/tablet vertical item
    item: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 10, borderLeftWidth: 3, borderLeftColor: "transparent", marginBottom: 4 },
    itemIcon: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
    itemName: { fontSize: 13, fontWeight: "700", color: TEXT_HEAD, marginBottom: 5 },
    itemBarTrack: { height: 4, borderRadius: 2, backgroundColor: BORDER, overflow: "hidden" },
    itemBarFill: { height: 4, borderRadius: 2 },
    itemCount: { fontSize: 12, fontWeight: "800", color: TEXT_MUTED },
});

// ─── STAT PILL STYLES ─────────────────────────────────────────────────────────
const statSt = StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: BG_CARD, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER, gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    headingWrap: { flexDirection: "row", alignItems: "center", gap: 10, minWidth: 0 },
    catIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    heading: { fontSize: 16, fontWeight: "800", color: TEXT_HEAD, maxWidth: 160 },
    pillsWrap: { flexDirection: "row", gap: 8, flexWrap: "wrap" as any },
    pill: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: BG_PAGE, borderWidth: 1, borderColor: BORDER },
    pillIcon: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    pillValue: { fontSize: 15, fontWeight: "800", color: TEXT_HEAD, lineHeight: 17 },
    pillLabel: { fontSize: 10, fontWeight: "700", color: TEXT_MUTED, letterSpacing: 0.3 },
});

// ─── ACCORDION CARD STYLES ────────────────────────────────────────────────────
const accSt = StyleSheet.create({
    card: { backgroundColor: BG_CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    head: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
    badge: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    badgeText: { fontSize: 12, fontWeight: "800" },
    headMid: { flex: 1, minWidth: 0 },
    question: { fontSize: 14, fontWeight: "700", color: TEXT_HEAD, lineHeight: 19 },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5 },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    metaText: { fontSize: 11, color: TEXT_MUTED, fontWeight: "600" },
    metaDivider: { fontSize: 11, color: TEXT_MUTED },
    body: { paddingHorizontal: 14, paddingBottom: 14, gap: 12, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 12, backgroundColor: "#fafbfc" },
    answer: { fontSize: 13, color: TEXT_BODY, lineHeight: 21 },
    footerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as any, gap: 10 },
    dateText: { fontSize: 11, color: TEXT_MUTED },
    toggle: { width: 34, height: 20, borderRadius: 10, backgroundColor: "#cbd5e1", justifyContent: "center", paddingHorizontal: 2 },
    toggleThumb: { width: 16, height: 16, borderRadius: 8, backgroundColor: "#fff" },
    toggleThumbOn: { alignSelf: "flex-end" as any },
    toggleLabel: { fontSize: 11, color: TEXT_MUTED, fontWeight: "600" },
    actionBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});

// ─── TILE CARD STYLES ─────────────────────────────────────────────────────────
const tileSt = StyleSheet.create({
    card: { backgroundColor: BG_CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, borderTopWidth: 3, padding: 14, gap: 8 },
    topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    index: { fontSize: 12, fontWeight: "800" },
    statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
    statusChipText: { fontSize: 11, fontWeight: "700" },
    question: { fontSize: 13, fontWeight: "700", color: TEXT_HEAD, lineHeight: 18 },
    answer: { fontSize: 12, color: TEXT_BODY, lineHeight: 17 },
    bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    dateText: { fontSize: 11, color: TEXT_MUTED },
    sellerTag: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: PRIMARY + "18", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
    sellerTagText: { fontSize: 10, fontWeight: "700", color: PRIMARY },
    actions: { flexDirection: "row", gap: 6, marginTop: 4 },
    actionBtn: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
});

// ─── MODAL STYLES ─────────────────────────────────────────────────────────────
const mSt = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center" },
    sheet: { backgroundColor: BG_CARD, borderRadius: 20, overflow: "hidden", width: "92%", maxWidth: 520, maxHeight: "90%" as any, borderWidth: 1, borderColor: BORDER, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
    sheetWeb: { width: 540 },
    headerBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22, paddingVertical: 18, borderBottomWidth: 2, borderBottomColor: BORDER },
    iconSmall: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    headerDot: { width: 10, height: 10, borderRadius: 5 },
    sheetTitle: { fontSize: 16, fontWeight: "800", color: TEXT_HEAD },
    sheetSub: { fontSize: 11, color: TEXT_MUTED, marginTop: 1 },
    closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: BG_PAGE, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: BORDER },

    qBox: { borderLeftWidth: 4, backgroundColor: BG_PAGE, borderRadius: 10, padding: 14, marginBottom: 16 },
    qLabel: { fontSize: 10, fontWeight: "800", color: TEXT_MUTED, letterSpacing: 0.6, marginBottom: 8 },
    qText: { fontSize: 15, fontWeight: "700", color: TEXT_HEAD, lineHeight: 22 },
    aBox: { backgroundColor: BG_PAGE, borderRadius: 10, padding: 14, marginBottom: 16 },
    aText: { fontSize: 13, color: TEXT_BODY, lineHeight: 21 },
    metaGrid: { flexDirection: "row", gap: 16 },
    metaItem: { gap: 6 },
    metaKey: { fontSize: 10, fontWeight: "700", color: TEXT_MUTED, letterSpacing: 0.5 },
    metaVal: { fontSize: 13, fontWeight: "600", color: TEXT_HEAD },
    badge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    dot: { width: 6, height: 6, borderRadius: 3 },
    badgeText: { fontSize: 11, fontWeight: "700" },

    label: { fontSize: 11, fontWeight: "700", color: TEXT_BODY, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 },
    input: { borderWidth: 1.5, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 13, color: TEXT_HEAD, backgroundColor: BG_PAGE, marginBottom: 18 },
    catChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: BORDER, backgroundColor: BG_PAGE },
    catChipText: { fontSize: 12, fontWeight: "600", color: TEXT_BODY },
    statusToggle: { flexDirection: "row", gap: 10, marginBottom: 18 },
    statusOption: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, alignItems: "center" },
    statusOptionTxt: { fontSize: 13, fontWeight: "700", color: TEXT_BODY },

    footer: { flexDirection: "row", justifyContent: "flex-end", gap: 12, padding: 18, borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: BG_PAGE },
    footerCloseBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, backgroundColor: BG_CARD, alignItems: "center" },
    footerCloseTxt: { color: TEXT_BODY, fontWeight: "700", fontSize: 13 },
    cancelBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, backgroundColor: BG_CARD },
    cancelTxt: { color: TEXT_BODY, fontWeight: "700", fontSize: 13 },
    saveBtn: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 },
    saveTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },
});