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
    Animated,
    useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import AdminLayout from "@/components/admin-layout";
import Pagination from "@/components/Pagination";

// â”€â”€â”€ THEME â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ TYPES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ VIEW QUESTION MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
                                <Feather name={(category?.icon ?? "help-circle") as any} size={16} color={category?.color ?? PRIMARY} />
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

// â”€â”€â”€ ADD / EDIT QUESTION MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
                                        <Feather name={c.icon as any} size={11} color={catId === c.id ? "#fff" : c.color} />
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

// â”€â”€â”€ DELETE CONFIRM MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ QUESTION TABLE ROW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const QuestionRow: React.FC<{
    q: FaqQuestion;
    cat: FaqCategory | undefined;
    index: number;
    onToggleSeller: () => void;
    onView: () => void;
    onEdit: () => void;
    onDelete: () => void;
}> = ({ q, cat, index, onToggleSeller, onView, onEdit, onDelete }) => {
    const isActive = q.status === "Active";
    const accentColor = cat?.color ?? PRIMARY;
    return (
        <View style={[qSt.row, index % 2 === 0 && qSt.rowAlt]}>
            {/* ID */}
            <View style={qSt.cellId}>
                <Text style={qSt.idText}>{q.id}</Text>
            </View>
            {/* Category */}
            <View style={qSt.cellCat}>
                {cat?.icon && <Feather name={cat.icon as any} size={14} color={accentColor} style={{ marginRight: 6 }} />}
                <Text style={[qSt.catText, { color: accentColor }]} numberOfLines={2}>{cat?.name ?? "—"}</Text>
            </View>
            {/* Question */}
            <View style={qSt.cellQuestion}>
                <Text style={qSt.questionText} numberOfLines={2}>{q.question}</Text>
            </View>
            {/* Sort Order */}
            <View style={qSt.cellOrder}>
                <Text style={qSt.orderText}>{q.order}</Text>
            </View>
            {/* Status */}
            <View style={qSt.cellStatus}>
                <View style={[qSt.statusBadge, { backgroundColor: isActive ? "#e6faf5" : "#fde8e8", borderColor: isActive ? ACCENT_TEAL : ACCENT_RED }]}>
                    <Text style={[qSt.statusBadgeTxt, { color: isActive ? ACCENT_TEAL : ACCENT_RED }]}>{q.status}</Text>
                </View>
            </View>
            {/* Seller Toggle */}
            <View style={qSt.cellSeller}>
                <TouchableOpacity
                    style={[qSt.toggle, q.isForSeller && { backgroundColor: ACCENT_TEAL }]}
                    onPress={onToggleSeller}
                    activeOpacity={0.8}>
                    <View style={[qSt.toggleThumb, q.isForSeller && qSt.toggleThumbOn]} />
                </TouchableOpacity>
            </View>
            {/* Created Date */}
            <View style={qSt.cellDate}>
                <Text style={qSt.dateText}>{q.createdAt}</Text>
            </View>
            {/* Actions */}
            <View style={qSt.cellAction}>
                <TouchableOpacity style={[qSt.actionBtn, { backgroundColor: "#1e293b" }]} onPress={onView}>
                    <Feather name="eye" size={13} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={[qSt.actionBtn, { backgroundColor: "#1e293b" }]} onPress={onEdit}>
                    <Feather name="edit-2" size={13} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={[qSt.actionBtn, { backgroundColor: ACCENT_RED }]} onPress={onDelete}>
                    <Feather name="trash-2" size={13} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

// â”€â”€â”€ QUESTION GRID CARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const QuestionGridCard: React.FC<{
    q: FaqQuestion;
    cat: FaqCategory | undefined;
    index: number;
    onView: () => void;
    onEdit: () => void;
    onDelete: () => void;
}> = ({ q, cat, index, onView, onEdit, onDelete }) => {
    const isActive = q.status === "Active";
    const accentColor = cat?.color ?? PRIMARY;
    return (
        <View style={[gSt.card, { borderTopColor: accentColor }]}>
            <View style={gSt.cardHeader}>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                    <View style={[gSt.indexBadge, { backgroundColor: accentColor + "18" }]}>
                        <Text style={[gSt.indexText, { color: accentColor }]}>Q{index}</Text>
                    </View>
                    {cat?.icon && (
                        <View style={[gSt.iconBadge, { backgroundColor: accentColor + "18" }]}>
                            <Feather name={cat.icon as any} size={12} color={accentColor} />
                        </View>
                    )}
                </View>
                <View style={[gSt.statusPill, { backgroundColor: isActive ? ACCENT_TEAL + "18" : ACCENT_RED + "18" }]}>
                    <View style={[gSt.statusDot, { backgroundColor: isActive ? ACCENT_TEAL : ACCENT_RED }]} />
                    <Text style={[gSt.statusTxt, { color: isActive ? ACCENT_TEAL : ACCENT_RED }]}>{q.status}</Text>
                </View>
            </View>
            <Text style={gSt.questionText} numberOfLines={3}>{q.question}</Text>
            <Text style={gSt.answerText} numberOfLines={2}>{q.answer}</Text>
            {q.isForSeller && (
                <View style={gSt.sellerBadge}>
                    <Feather name="briefcase" size={10} color={PRIMARY} />
                    <Text style={gSt.sellerBadgeTxt}>Seller</Text>
                </View>
            )}
            <View style={gSt.divider} />
            <View style={gSt.cardFooter}>
                <Text style={gSt.dateText}>{q.createdAt}</Text>
                <View style={gSt.actions}>
                    <TouchableOpacity style={[gSt.actionBtn, { backgroundColor: ACCENT_SKY + "15", borderColor: ACCENT_SKY + "40" }]} onPress={onView}>
                        <Feather name="eye" size={13} color={ACCENT_SKY} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[gSt.actionBtn, { backgroundColor: PRIMARY + "15", borderColor: PRIMARY + "40" }]} onPress={onEdit}>
                        <Feather name="edit-2" size={13} color={PRIMARY} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[gSt.actionBtn, { backgroundColor: ACCENT_RED + "15", borderColor: ACCENT_RED + "40" }]} onPress={onDelete}>
                        <Feather name="trash-2" size={13} color={ACCENT_RED} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

// â”€â”€â”€ MAIN SCREEN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const FaqQuestionsScreen: React.FC = () => {
    const isWeb = Platform.OS === "web";
    const { width } = useWindowDimensions();
    const isMobile = width < 480;

    const [categories, setCategories] = useState<FaqCategory[]>([]);
    const [questions, setQuestions] = useState<FaqQuestion[]>([]);
    const [selectedCatId, setSelectedCatId] = useState<number>(0);
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
            const mapped = rows.map((r, i) => {
                const cat = mapFaqCategoryRow(r, i);
                return { id: cat.id, name: cat.name, icon: cat.icon, color: cat.color, slug: cat.slug };
            });
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

    return (
        <AdminLayout>
            <View style={st.root}>
                <StatusBar barStyle="light-content" backgroundColor={NAVY} />

                <ScrollView style={st.scroll} showsVerticalScrollIndicator={false}>
                    {/* ——— PAGE HEADER ——— */}
                    <View style={[
                        st.header,
                        isWeb ? st.headerWeb : st.headerMobile,
                        { backgroundColor: NAVY, borderBottomColor: NAVY }
                    ]}>
                        <View style={st.headerLeft}>
                            <View style={[st.headerIcon, { backgroundColor: PRIMARY }]}>
                                <Feather name="help-circle" size={22} color="#fff" />
                            </View>
                            <View>
                                <Text style={[st.headerTitle, { color: "#fff" }]}>FAQ Questions</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={[st.addBtn, { backgroundColor: PRIMARY }]}
                            onPress={() => { setEditModal(null); setAddModal(true); }}>
                            <Feather name="plus" size={14} color="#fff" />
                            <Text style={st.addBtnText}>Add Question</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={[st.scrollContent, !isWeb && { paddingBottom: 120 }]}>

                        {loadError ? (
                            <Text style={{ color: ACCENT_RED, marginBottom: 12 }}>{loadError}</Text>
                        ) : null}

                        {/* CATEGORY TABS */}
                        <View style={st.catSection}>
                            <Text style={st.sectionLabel}>SELECT CATEGORY</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}
                                contentContainerStyle={st.catScrollContent}>
                                {categories.map(cat => {
                                    const catQCount = questions.filter(q => q.categoryId === cat.id).length;
                                    const isSelected = cat.id === selectedCatId;
                                    return (
                                        <TouchableOpacity key={cat.id}
                                            style={[st.catBtn,
                                            { borderColor: isSelected ? NAVY : PRIMARY },
                                            isSelected && { backgroundColor: NAVY }]}
                                            onPress={() => { setSelectedCatId(cat.id); setSearch(""); setStatusFilter("All"); setExpandedIds(new Set()); setCurrentPage(1); }}>
                                            <View style={[st.catBtnIcon, { backgroundColor: isSelected ? "rgba(255,255,255,0.25)" : PRIMARY + "18" }]}>
                                                <Feather name={cat.icon as any} size={14} color={isSelected ? "#fff" : PRIMARY} />
                                            </View>
                                            <Text style={[st.catBtnText, isSelected && { color: "#fff" }]} numberOfLines={1}>{cat.name}</Text>
                                            <View style={[st.catBtnCount, { backgroundColor: isSelected ? "rgba(255,255,255,0.25)" : PRIMARY + "20" }]}>
                                                <Text style={[st.catBtnCountText, { color: isSelected ? "#fff" : PRIMARY }]}>{catQCount}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        {/* â”€â”€ SELECTED CATEGORY HERO â”€â”€ */}
                        <View style={[st.heroCard, { borderLeftColor: selectedCat?.color ?? PRIMARY }]}>
                            <View style={st.heroLeft}>
                                <View style={[st.heroIcon, { backgroundColor: (selectedCat?.color ?? PRIMARY) + "18" }]}>
                                    <Feather name={(selectedCat?.icon ?? "help-circle") as any} size={28} color={selectedCat?.color ?? PRIMARY} />
                                </View>
                                <View>
                                    <Text style={st.heroTitle}>{selectedCat?.name}</Text>
                                    <Text style={st.heroSub}>{catQuestions.length} questions  Â·  {activeCount} active</Text>
                                </View>
                            </View>
                            <View style={[st.heroBadge, { backgroundColor: (selectedCat?.color ?? PRIMARY) + "18" }]}>
                                <Text style={[st.heroBadgeText, { color: selectedCat?.color ?? PRIMARY }]}>{catQuestions.length} FAQs</Text>
                            </View>
                        </View>

                        <View style={[st.toolbar, !isWeb && { flexWrap: "wrap" as any }]}>
                            <View style={[st.searchWrap, !isWeb && { width: "100%", flex: 0 }]}>
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
                            {isMobile ? (
                                <View style={st.viewToggle}>
                                    <TouchableOpacity
                                        style={[st.viewToggleBtn, viewMode === "list" && st.viewToggleBtnActive]}
                                        onPress={() => setViewMode("list")}>
                                        <Feather name="list" size={15} color={viewMode === "list" ? "#fff" : TEXT_BODY} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[st.viewToggleBtn, viewMode === "grid" && st.viewToggleBtnActive]}
                                        onPress={() => setViewMode("grid")}>
                                        <Feather name="grid" size={15} color={viewMode === "grid" ? "#fff" : TEXT_BODY} />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <>
                                    <TouchableOpacity style={st.expandAllBtn}
                                        onPress={() => {
                                            if (expandedIds.size === filtered.length) setExpandedIds(new Set());
                                            else setExpandedIds(new Set(filtered.map(q => q.id)));
                                        }}>
                                        <Feather name={expandedIds.size === filtered.length ? "minimize-2" : "maximize-2"} size={13} color={TEXT_BODY} />
                                        <Text style={st.expandAllTxt}>{expandedIds.size === filtered.length ? "Collapse" : "Expand"} All</Text>
                                    </TouchableOpacity>

                                    <View style={st.viewToggle}>
                                        <TouchableOpacity
                                            style={[st.viewToggleBtn, viewMode === "list" && st.viewToggleBtnActive]}
                                            onPress={() => setViewMode("list")}>
                                            <Feather name="list" size={15} color={viewMode === "list" ? "#fff" : TEXT_BODY} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[st.viewToggleBtn, viewMode === "grid" && st.viewToggleBtnActive]}
                                            onPress={() => setViewMode("grid")}>
                                            <Feather name="grid" size={15} color={viewMode === "grid" ? "#fff" : TEXT_BODY} />
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </View>

                        {/* â”€â”€ RESULT COUNT â”€â”€ */}
                        <Text style={st.resultCount}>
                            Showing <Text style={{ color: selectedCat?.color ?? PRIMARY, fontWeight: "700" }}>{filtered.length}</Text> questions
                        </Text>

                        {/* â”€â”€ QUESTIONS LIST / GRID â”€â”€ */}
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
                                    <Text style={st.emptyAddTxt}>Add Question</Text>
                                </TouchableOpacity>
                            </View>
                        ) : viewMode === "grid" ? (
                            <View style={st.gridContainer}>
                                {paginated.map((q, idx) => (
                                    <View key={q.id} style={[st.gridItem, !isWeb && { width: "100%" as any }]}>
                                        <QuestionGridCard
                                            q={q}
                                            cat={selectedCat}
                                            index={idx + 1}
                                            onView={() => setViewModal(q)}
                                            onEdit={() => { setEditModal(q); setAddModal(true); }}
                                            onDelete={() => setDeleteModal(q)}
                                        />
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <View style={st.tableWrap}>
                                {isWeb ? (
                                    <View style={{ width: "100%" }}>
                                        {/* Table header */}
                                        <View style={qSt.headerRow}>
                                            <Text style={[qSt.headerCell, { width: 60 }]}>ID</Text>
                                            <Text style={[qSt.headerCell, { width: 200 }]}>Category</Text>
                                            <Text style={[qSt.headerCell, { flex: 1 }]}>Question</Text>
                                            <Text style={[qSt.headerCell, { width: 80 }]}>Sort Order</Text>
                                            <Text style={[qSt.headerCell, { width: 100 }]}>Status</Text>
                                            <Text style={[qSt.headerCell, { width: 70 }]}>Seller</Text>
                                            <Text style={[qSt.headerCell, { width: 110 }]}>Created Date</Text>
                                            <Text style={[qSt.headerCell, { width: 110 }]}>Action</Text>
                                        </View>
                                        {paginated.map((q, idx) => (
                                            <QuestionRow
                                                key={q.id}
                                                q={q}
                                                cat={selectedCat}
                                                index={idx}
                                                onToggleSeller={() => setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, isForSeller: !x.isForSeller } : x))}
                                                onView={() => setViewModal(q)}
                                                onEdit={() => { setEditModal(q); setAddModal(true); }}
                                                onDelete={() => setDeleteModal(q)}
                                            />
                                        ))}
                                    </View>
                                ) : (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        <View style={{ minWidth: 900 }}>
                                            {/* Table header */}
                                            <View style={qSt.headerRow}>
                                                <Text style={[qSt.headerCell, { width: 60 }]}>ID</Text>
                                                <Text style={[qSt.headerCell, { width: 200 }]}>Category</Text>
                                                <Text style={[qSt.headerCell, { flex: 1 }]}>Question</Text>
                                                <Text style={[qSt.headerCell, { width: 80 }]}>Sort Order</Text>
                                                <Text style={[qSt.headerCell, { width: 100 }]}>Status</Text>
                                                <Text style={[qSt.headerCell, { width: 70 }]}>Seller</Text>
                                                <Text style={[qSt.headerCell, { width: 110 }]}>Created Date</Text>
                                                <Text style={[qSt.headerCell, { width: 110 }]}>Action</Text>
                                            </View>
                                            {paginated.map((q, idx) => (
                                                <QuestionRow
                                                    key={q.id}
                                                    q={q}
                                                    cat={selectedCat}
                                                    index={idx}
                                                    onToggleSeller={() => setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, isForSeller: !x.isForSeller } : x))}
                                                    onView={() => setViewModal(q)}
                                                    onEdit={() => { setEditModal(q); setAddModal(true); }}
                                                    onDelete={() => setDeleteModal(q)}
                                                />
                                            ))}
                                        </View>
                                    </ScrollView>
                                )}
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
                </ScrollView>

                {/* â”€â”€ MODALS â”€â”€ */}
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

// â”€â”€â”€ MAIN STYLES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const st = StyleSheet.create({
    root: { flex: 1, height: "100%", backgroundColor: BG_PAGE },

    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: BG_CARD, paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
    headerWeb: { marginHorizontal: 2, marginTop: 12, borderRadius: 22, paddingHorizontal: 32, paddingVertical: 28, paddingBottom: 48, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 10 },
    headerMobile: {
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingVertical: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
    headerIcon: { width: 50, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
    headerTitle: { fontSize: 20, fontWeight: "800", color: TEXT_HEAD, letterSpacing: -0.3 },
    headerBreadcrumb: { fontSize: 12, color: TEXT_BODY, marginTop: 2 },
    addBtn: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

    scroll: { flex: 1 },
    scrollContent: { padding: 16, gap: 14 },

    // Category tabs
    catSection: { backgroundColor: BG_CARD, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: BORDER },
    sectionLabel: { fontSize: 10, fontWeight: "800", color: TEXT_MUTED, letterSpacing: 0.8, marginBottom: 12 },
    catScrollContent: { gap: 8, paddingRight: 4 },
    catBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 24, borderWidth: 1.5, backgroundColor: BG_PAGE, maxWidth: 220 },
    catBtnIcon: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    catBtnText: { fontSize: 13, fontWeight: "700", color: TEXT_HEAD, flexShrink: 1 },
    catBtnCount: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    catBtnCountText: { fontSize: 11, fontWeight: "800" },

    // Hero card
    heroCard: { backgroundColor: BG_CARD, borderRadius: 14, padding: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: BORDER, borderLeftWidth: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
    heroLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
    heroIcon: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    heroTitle: { fontSize: 17, fontWeight: "800", color: TEXT_HEAD, marginBottom: 4 },
    heroSub: { fontSize: 12, color: TEXT_MUTED, fontWeight: "500" },
    heroBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
    heroBadgeText: { fontSize: 13, fontWeight: "800" },

    // Toolbar
    toolbar: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: BG_CARD, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER },
    searchWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1.5, borderColor: BORDER, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: BG_PAGE },
    searchInput: { flex: 1, fontSize: 13, color: TEXT_HEAD, outlineStyle: "none" } as any,
    chips: { flexDirection: "row", gap: 6 },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: BORDER, backgroundColor: BG_PAGE },
    chipText: { fontSize: 12, fontWeight: "600", color: TEXT_BODY },
    expandAllBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: BORDER, backgroundColor: BG_PAGE },
    expandAllTxt: { fontSize: 12, fontWeight: "600", color: TEXT_BODY },

    resultCount: { fontSize: 12, color: TEXT_MUTED, fontWeight: "500" },

    // Questions list
    questionsList: { gap: 10 },
    tableWrap: { backgroundColor: BG_CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, overflow: "hidden" },

    // Grid container
    gridContainer: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    gridItem: { width: "48%" as any, minWidth: 260 },

    // View toggle
    viewToggle: { flexDirection: "row", borderRadius: 8, borderWidth: 1, borderColor: BORDER, overflow: "hidden" },
    viewToggleBtn: { padding: 8, backgroundColor: BG_PAGE },
    viewToggleBtnActive: { backgroundColor: PRIMARY },

    // Empty
    empty: { alignItems: "center", paddingVertical: 60, gap: 12 },
    emptyIconWrap: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center" },
    emptyTitle: { fontSize: 16, fontWeight: "700", color: TEXT_HEAD },
    emptySubtitle: { fontSize: 13, color: TEXT_MUTED },
    emptyAddBtn: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 10, marginTop: 4 },
    emptyAddTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },
});

// â”€â”€â”€ QUESTION GRID CARD STYLES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const gSt = StyleSheet.create({
    card: { backgroundColor: BG_CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, borderTopWidth: 3, padding: 14, flex: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, gap: 8 },
    cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    indexBadge: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    iconBadge: { width: 24, height: 24, borderRadius: 6, alignItems: "center", justifyContent: "center" },
    indexText: { fontSize: 11, fontWeight: "800" },
    statusPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusTxt: { fontSize: 11, fontWeight: "700" },
    questionText: { fontSize: 13, fontWeight: "700", color: TEXT_HEAD, lineHeight: 18 },
    answerText: { fontSize: 12, color: TEXT_BODY, lineHeight: 17 },
    sellerBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: PRIMARY + "18", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: "flex-start" as any },
    sellerBadgeTxt: { fontSize: 11, fontWeight: "700", color: PRIMARY },
    divider: { height: 1, backgroundColor: BORDER },
    cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    dateText: { fontSize: 11, color: TEXT_MUTED },
    actions: { flexDirection: "row", gap: 6 },
    actionBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});

// â”€â”€â”€ QUESTION ROW STYLES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const qSt = StyleSheet.create({
    // Table header
    headerRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fef3e7", paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
    headerCell: { fontSize: 11, fontWeight: "800", color: TEXT_BODY, textTransform: "uppercase", letterSpacing: 0.4 },

    // Table rows
    row: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
    rowAlt: { backgroundColor: "#fafbfc" },

    // Cells
    cellId: { width: 60, paddingRight: 24 },
    cellCat: { width: 200, paddingRight: 24, flexDirection: "row", alignItems: "center" },
    cellQuestion: { flex: 1, paddingRight: 28 },
    cellOrder: { width: 80, alignItems: "center", paddingRight: 24 },
    cellStatus: { width: 100, paddingRight: 24 },
    cellSeller: { width: 70, alignItems: "center", paddingRight: 24 },
    cellDate: { width: 110, paddingRight: 24 },
    cellAction: { width: 110, flexDirection: "row", gap: 6 },

    // Cell text
    idText: { fontSize: 13, fontWeight: "600", color: TEXT_MUTED },
    catText: { fontSize: 13, fontWeight: "700" },
    questionText: { fontSize: 13, color: TEXT_BODY, lineHeight: 18 },
    orderText: { fontSize: 13, color: TEXT_HEAD, fontWeight: "600" },
    dateText: { fontSize: 12, color: TEXT_MUTED },

    // Status badge
    statusBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" as any },
    statusBadgeTxt: { fontSize: 12, fontWeight: "700" },

    // Seller toggle
    toggle: { width: 38, height: 22, borderRadius: 11, backgroundColor: "#cbd5e1", justifyContent: "center", paddingHorizontal: 2 },
    toggleThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 2, elevation: 2 },
    toggleThumbOn: { alignSelf: "flex-end" as any },

    // Action buttons
    actionBtn: { width: 28, height: 28, borderRadius: 6, alignItems: "center", justifyContent: "center" },
});

// â”€â”€â”€ MODAL STYLES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
