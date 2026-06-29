// @ts-nocheck
/**
 * ColorsScreen – React Native
 * Responsive list view table matching Flint & Thread admin design.
 *
 * Icons: @expo/vector-icons  (Ionicons)
 * Install: npx expo install @expo/vector-icons
 *
 * Fix: Grid view is now fully responsive on web using a ScrollView + flexWrap
 * approach instead of FlatList numColumns, which is unreliable on web.
 */

import AdminLayout from "@/components/admin-layout";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from "react-native";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  createColor,
  deleteColor,
  fetchColors,
  updateColor,
  type CatalogColor,
} from "@/services/colorApi";

// ─────────────────────────────────────────────────────────────────────────────
// Bootstrap-like icon name map → Ionicons
// ─────────────────────────────────────────────────────────────────────────────
const BI = {
  palette: "color-palette-outline",
  plus: "add-outline",
  search: "search-outline",
  xCircle: "close-circle-outline",
  grid: "grid-outline",
  list: "list-outline",
  calendar: "calendar-outline",
  pencil: "create-outline",
  trash: "trash-outline",
  houseDoor: "home-outline",
  x: "close-outline",
  floppyDisk: "save-outline",
  chevronLeft: "chevron-back-outline",
  chevronRight: "chevron-forward-outline",
  exclamationTriangle: "warning-outline",
  trashFill: "trash",
  chevronDown: "chevron-down-outline",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const BRAND = "#e8651a";
const DARK_BTN = "#1E2A45";
const HEADER_BG = "#1d324e";
const PAGE_SIZE = 12;

// Responsive breakpoints
const BP = { sm: 480, md: 640, lg: 900, xl: 1200 };

const IS_WEB = Platform.OS === "web";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface ColorItem {
  id: number;
  name: string;
  code: string;
  status: "Active" | "Inactive";
  createdDate: string;
}
type ViewMode = "grid" | "list";

function mapColorRow(row: CatalogColor): ColorItem {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    status: row.status,
    createdDate: row.createdDate ?? todayStr(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const hexPattern = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
function todayStr() {
  return new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function isValidHex(code: string) {
  return hexPattern.test(code.startsWith("#") ? code : "#" + code);
}
function normalizeHex(code: string) {
  return code.startsWith("#") ? code : "#" + code;
}

// ─────────────────────────────────────────────────────────────────────────────
// StatusBadge
// ─────────────────────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: "Active" | "Inactive" }) => (
  <View style={[
    styles.statusBadge,
    status === "Active" ? styles.statusActive : styles.statusInactive,
  ]}>
    <Text style={[
      styles.statusText,
      status === "Active" ? styles.statusTextActive : styles.statusTextInactive,
    ]}>
      {status}
    </Text>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// StatusDropdown
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_OPTIONS = ["Active", "Inactive"] as const;

const StatusDropdown = ({
  value,
  onChange,
}: {
  value: "Active" | "Inactive";
  onChange: (v: "Active" | "Inactive") => void;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.dropdownWrapper}>
      <TouchableOpacity
        style={[styles.dropdownBtn, open && styles.dropdownBtnOpen]}
        onPress={() => setOpen((o) => !o)}
        activeOpacity={0.85}
      >
        <Text style={styles.dropdownBtnText}>{value}</Text>
        <Ionicons
          name={BI.chevronDown as any}
          size={18}
          color={BRAND}
          style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
        />
      </TouchableOpacity>

      {open && (
        <>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setOpen(false)}
            hitSlop={{ top: 600, bottom: 600, left: 600, right: 600 }}
          />
          <View style={styles.dropdownList}>
            {STATUS_OPTIONS.map((opt) => {
              const isSelected = value === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                  onPress={() => { onChange(opt); setOpen(false); }}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ColorFormModal (Add / Edit)
// ─────────────────────────────────────────────────────────────────────────────
interface ColorModalProps {
  mode: "add" | "edit";
  initial?: ColorItem;
  onSave: (data: { name: string; code: string; status: "Active" | "Inactive" }) => void;
  onClose: () => void;
}
const ColorFormModal = ({ mode, initial, onSave, onClose }: ColorModalProps) => {
  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? BRAND);
  const [status, setStatus] = useState<"Active" | "Inactive">(initial?.status ?? "Active");
  const [nameErr, setNameErr] = useState("");
  const [codeErr, setCodeErr] = useState("");

  function validate() {
    let ok = true;
    if (!name.trim()) { setNameErr("Color name is required"); ok = false; } else setNameErr("");
    if (!isValidHex(code)) { setCodeErr("Enter a valid hex code e.g. #ff0000"); ok = false; } else setCodeErr("");
    return ok;
  }
  function handleSave() {
    if (!validate()) return;
    onSave({ name: name.trim(), code: normalizeHex(code), status });
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{mode === "add" ? "Add New Color" : "Edit Color"}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name={BI.x as any} size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>Color Name</Text>
            <TextInput
              value={name}
              onChangeText={(t) => { setName(t); setNameErr(""); }}
              placeholder="Enter color name"
              placeholderTextColor="#bbb"
              style={[styles.textInput, nameErr ? styles.inputError : null]}
            />
            {!!nameErr && (
              <View style={styles.errorRow}>
                <Ionicons name={BI.exclamationTriangle as any} size={13} color="#e53e3e" />
                <Text style={styles.errorText}>{nameErr}</Text>
              </View>
            )}
            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Color Code</Text>
            <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
              <View style={[
                styles.colorSwatchInput,
                { backgroundColor: isValidHex(code) ? normalizeHex(code) : BRAND },
              ]} />
              <TextInput
                value={code}
                onChangeText={(t) => { setCode(t); setCodeErr(""); }}
                placeholder="#ffffff"
                placeholderTextColor="#bbb"
                autoCapitalize="none"
                style={[styles.textInput, { flex: 1 }, codeErr ? styles.inputError : null]}
              />
            </View>
            {!!codeErr && (
              <View style={styles.errorRow}>
                <Ionicons name={BI.exclamationTriangle as any} size={13} color="#e53e3e" />
                <Text style={styles.errorText}>{codeErr}</Text>
              </View>
            )}
            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Status</Text>
            <StatusDropdown value={status} onChange={setStatus} />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Ionicons name={BI.x as any} size={15} color="#fff" />
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Ionicons name={BI.floppyDisk as any} size={15} color="#fff" />
                <Text style={styles.saveBtnText}>{mode === "add" ? "Save Color" : "Update Color"}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DeleteModal
// ─────────────────────────────────────────────────────────────────────────────
const DeleteModal = ({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) => (
  <Modal visible transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      <View style={[styles.modalCard, { maxWidth: 380 }]}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Confirm Delete</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name={BI.x as any} size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={{ padding: 28, alignItems: "center" }}>
          <View style={styles.deleteIconCircle}>
            <Ionicons name={BI.trashFill as any} size={36} color={BRAND} />
          </View>
          <Text style={styles.deleteTitle}>Are you sure?</Text>
          <Text style={styles.deleteSubtitle}>You won't be able to revert this action.</Text>
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Ionicons name={BI.x as any} size={15} color="#fff" />
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={onConfirm}>
              <Ionicons name={BI.trash as any} size={15} color="#fff" />
              <Text style={styles.saveBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  </Modal>
);

// ─────────────────────────────────────────────────────────────────────────────
// Grid Card
// ─────────────────────────────────────────────────────────────────────────────
const ColorCard = ({
  item, onEdit, onDelete, cardWidth,
}: {
  item: ColorItem; onEdit: () => void; onDelete: () => void; cardWidth: number | string;
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [overlayVisible, setOverlayVisible] = useState(false);
  
  // Disable hover overlay on mobile to prevent double-tap issues
  const hoverProps = (IS_WEB && !isMobile)
    ? { onMouseEnter: () => setOverlayVisible(true), onMouseLeave: () => setOverlayVisible(false) }
    : {};

  return (
    <Pressable
      onLongPress={() => !IS_WEB && !isMobile && setOverlayVisible(true)}
      onPressOut={() => !IS_WEB && !isMobile && setOverlayVisible(false)}
      style={[styles.gridCard, { width: cardWidth as any }]}
      {...(hoverProps as any)}
    >
      <View style={[styles.gridSwatch, { backgroundColor: item.code }]}>
        {overlayVisible && !isMobile && (
          <View style={styles.swatchOverlay}>
            <TouchableOpacity style={styles.overlayBtn} onPress={(e) => { (e as any).stopPropagation?.(); onEdit(); }}>
              <Ionicons name={BI.pencil as any} size={16} color={DARK_BTN} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.overlayBtn} onPress={(e) => { (e as any).stopPropagation?.(); onDelete(); }}>
              <Ionicons name={BI.trash as any} size={16} color="#e53e3e" />
            </TouchableOpacity>
          </View>
        )}
      </View>
      <View style={styles.gridCardBody}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <Text style={styles.gridCardName} numberOfLines={1}>{item.name}</Text>
          <StatusBadge status={item.status} />
        </View>
        <Text style={styles.gridCardCode}>{item.code}</Text>
        <View style={[styles.gridCardBar, { backgroundColor: item.code }]} />
        
        {isMobile && (
          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
            <TouchableOpacity style={styles.editBtn} onPress={(e) => { (e as any).stopPropagation?.(); onEdit(); }}>
              <Ionicons name={BI.pencil as any} size={13} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={(e) => { (e as any).stopPropagation?.(); onDelete(); }}>
              <Ionicons name={BI.trash as any} size={13} color="#dc2626" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Pressable>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// WebGridView — uses flexWrap for reliable web responsiveness
// On web, FlatList numColumns is broken; this renders a flex-wrap row instead.
// ─────────────────────────────────────────────────────────────────────────────
const WebGridView = ({
  items,
  onEdit,
  onDelete,
  screenWidth,
  padding,
  gap,
}: {
  items: ColorItem[];
  onEdit: (item: ColorItem) => void;
  onDelete: (item: ColorItem) => void;
  screenWidth: number;
  padding: number;
  gap: number;
}) => {
  // Calculate columns based on available content width
  const contentWidth = screenWidth - padding * 2;
  const numCols =
    contentWidth >= BP.xl - padding * 2 ? 6 :
      contentWidth >= BP.lg - padding * 2 ? 5 :
        contentWidth >= 700 - padding * 2 ? 4 :
          contentWidth >= BP.sm - padding * 2 ? 3 : 2;

  // Use percentage widths with gap compensation via padding trick
  // Each card gets: (100% / numCols) minus the gap distributed
  const cardWidthPct = `${(100 / numCols).toFixed(4)}%` as any;

  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        paddingHorizontal: padding,
        // Negative margin trick to handle gap on all sides uniformly
        marginHorizontal: -gap / 2,
      }}
    >
      {items.map((item) => (
        <View
          key={item.id}
          style={{
            width: cardWidthPct,
            paddingHorizontal: gap / 2,
            paddingBottom: gap,
          }}
        >
          <ColorCard
            item={item}
            cardWidth="100%"
            onEdit={() => onEdit(item)}
            onDelete={() => onDelete(item)}
          />
        </View>
      ))}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ListRow — Responsive table row
// ─────────────────────────────────────────────────────────────────────────────
const ListRow = ({
  item, onEdit, onDelete, isLast, screenWidth, isEven,
}: {
  item: ColorItem; onEdit: () => void; onDelete: () => void;
  isLast: boolean; screenWidth: number; isEven: boolean;
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const showId = screenWidth >= BP.md;
  const showDate = screenWidth >= BP.md;

  return (
    <View style={[
      styles.listRow,
      isEven && styles.listRowEven,
      !isLast && styles.listRowBorder,
      IS_WEB ? ({ ":hover": { backgroundColor: "#fdf7f3" } } as any) : {},
    ]}>
      {showId && (
        <View style={styles.colId}>
          <Text style={styles.cellId}>{item.id}</Text>
        </View>
      )}

      <View style={styles.colName}>
        <Text style={styles.cellName} numberOfLines={1}>{item.name}</Text>
      </View>

      <View style={styles.colPreview}>
        <View style={[styles.swatchCell, { backgroundColor: item.code }]} />
      </View>

      <View style={styles.colCode}>
        <View style={styles.codePill}>
          <Text style={styles.cellCode} numberOfLines={1}>{item.code}</Text>
        </View>
      </View>

      {showDate && (
        <View style={styles.colDate}>
          <Ionicons name={BI.calendar as any} size={13} color="#888" style={{ marginRight: 5 }} />
          <Text style={styles.cellDate}>{item.createdDate}</Text>
        </View>
      )}

      <View style={styles.colStatus}>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.colAction}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={onEdit}
          activeOpacity={0.85}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name={BI.pencil as any} size={13} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={onDelete}
          activeOpacity={0.85}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name={BI.trash as any} size={13} color="#dc2626" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ListHeader
// ─────────────────────────────────────────────────────────────────────────────
const ListHeader = ({ screenWidth }: { screenWidth: number }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const showId = screenWidth >= BP.md;
  const showDate = screenWidth >= BP.md;

  return (
    <View style={styles.tableHeader}>
      {showId && (
        <View style={styles.colId}>
          <Text style={styles.headerCell}>ID</Text>
        </View>
      )}
      <View style={styles.colName}>
        <Text style={styles.headerCell}>COLOR NAME</Text>
      </View>
      <View style={styles.colPreview}>
        <Text style={[styles.headerCell, { textAlign: "center", width: "100%" }]}>COLOR PREVIEW</Text>
      </View>
      <View style={styles.colCode}>
        <Text style={styles.headerCell}>COLOR CODE</Text>
      </View>
      {showDate && (
        <View style={styles.colDate}>
          <Text style={styles.headerCell}>CREATED DATE</Text>
        </View>
      )}
      <View style={styles.colStatus}>
        <Text style={styles.headerCell}>STATUS</Text>
      </View>
      <View style={styles.colAction}>
        <Text style={[styles.headerCell, { textAlign: "right", width: "100%" }]}>ACTIONS</Text>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────────────────────────
const Pagination = ({
  total, page, pageSize, onChange,
}: {
  total: number; page: number; pageSize: number; onChange: (p: number) => void;
}) => {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <View style={styles.pagination}>
      <TouchableOpacity
        style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
        onPress={() => page > 1 && onChange(page - 1)}
        disabled={page === 1}
      >
        <Ionicons name={BI.chevronLeft as any} size={16} color={page === 1 ? "#ccc" : "#555"} />
      </TouchableOpacity>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 4, alignItems: "center" }}>
        {pages.map((p, i) =>
          p === "..." ? (
            <Text key={`e-${i}`} style={{ color: "#888", paddingHorizontal: 4 }}>…</Text>
          ) : (
            <TouchableOpacity
              key={p}
              style={[styles.pageBtn, page === p && styles.pageBtnActive]}
              onPress={() => onChange(p as number)}
            >
              <Text style={[styles.pageBtnText, page === p && styles.pageBtnTextActive]}>{p}</Text>
            </TouchableOpacity>
          )
        )}
      </ScrollView>
      <TouchableOpacity
        style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}
        onPress={() => page < totalPages && onChange(page + 1)}
        disabled={page === totalPages}
      >
        <Ionicons name={BI.chevronRight as any} size={16} color={page === totalPages ? "#ccc" : "#555"} />
      </TouchableOpacity>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function ColorsScreen() {
  const { width } = useWindowDimensions();

  // Native grid: still uses numColumns via FlatList (works fine on native)
  const numCols = useMemo(() => {
    if (width >= BP.xl) return 6;
    if (width >= BP.lg) return 5;
    if (width >= 700) return 4;
    if (width >= BP.sm) return 3;
    return 2;
  }, [width]);

  const GAP = 12;
  const PADDING = 16;
  const cardWidth = (width - PADDING * 2 - GAP * (numCols - 1)) / numCols;

  const [containerWidth, setContainerWidth] = useState(width);
  const [colors, setColors] = useState<ColorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ColorItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ColorItem | null>(null);

  const filtered = useMemo(
    () => colors.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
    ),
    [colors, search]
  );

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = useCallback((val: string) => { setSearch(val); setPage(1); }, []);

  const loadColors = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await fetchColors();
      setColors(rows.map(mapColorRow));
    } catch (error) {
      setLoadError(getApiErrorMessage(error, "Failed to load colors."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadColors();
  }, [loadColors]);

  const handleAdd = useCallback(async (data: { name: string; code: string; status: "Active" | "Inactive" }) => {
    setSaving(true);
    try {
      const created = await createColor(data);
      setColors((prev) => [...prev, mapColorRow(created)]);
      setAddOpen(false);
    } catch (error) {
      Alert.alert("Error", getApiErrorMessage(error, "Could not add color."));
    } finally {
      setSaving(false);
    }
  }, []);

  const handleEdit = useCallback(async (data: { name: string; code: string; status: "Active" | "Inactive" }) => {
    if (!editTarget) return;
    setSaving(true);
    try {
      const updated = await updateColor(editTarget.id, data);
      setColors((prev) => prev.map((c) => (c.id === editTarget.id ? mapColorRow(updated) : c)));
      setEditTarget(null);
    } catch (error) {
      Alert.alert("Error", getApiErrorMessage(error, "Could not update color."));
    } finally {
      setSaving(false);
    }
  }, [editTarget]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteColor(deleteTarget.id);
      setColors((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      const maxPage = Math.max(1, Math.ceil((filtered.length - 1) / PAGE_SIZE));
      if (page > maxPage) setPage(maxPage);
      setDeleteTarget(null);
    } catch (error) {
      Alert.alert("Error", getApiErrorMessage(error, "Could not delete color."));
    } finally {
      setSaving(false);
    }
  }, [deleteTarget, filtered.length, page]);

  // ── Native-only FlatList grid render ──────────────────────────────────────
  const renderGridItem = useCallback(({ item }: { item: ColorItem }) => (
    <ColorCard
      item={item}
      cardWidth={cardWidth}
      onEdit={() => setEditTarget(item)}
      onDelete={() => setDeleteTarget(item)}
    />
  ), [cardWidth]);

  const renderListItem = useCallback(({ item, index }: { item: ColorItem; index: number }) => (
    <ListRow
      item={item}
      isLast={index === pageItems.length - 1}
      isEven={index % 2 === 0}
      screenWidth={viewMode === "list" ? Math.max(containerWidth, 950) : width}
      onEdit={() => setEditTarget(item)}
      onDelete={() => setDeleteTarget(item)}
    />
  ), [pageItems.length, viewMode, containerWidth, width]);

  // ── Shared header + toolbar + footer sections ──────────────────────────────
  const HeaderSection = (
    <>
      <View style={styles.webPageHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 16 }}>
          <View style={styles.headerIconBox}>
            <Ionicons name={BI.palette as any} size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.webPageTitle}>Colors Management</Text>
            <Text style={styles.webPageSubtitle}>Manage catalog color variants and status settings</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddOpen(true)}>
          <Ionicons name={BI.plus as any} size={18} color="#fff" />
          {width >= BP.sm && <Text style={styles.addBtnText}>Add New Color</Text>}
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: PADDING, marginTop: 24 }}>
        {loadError ? (
          <Text style={{ color: "#dc2626", marginBottom: 8 }}>{loadError}</Text>
        ) : null}
        {loading ? (
          <View style={{ paddingVertical: 24, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#D4690A" />
          </View>
        ) : null}
        {/* Toolbar */}
        <View style={styles.toolbar}>
          <View style={styles.searchBox}>
            <Ionicons name={BI.search as any} size={15} color="#bbb" style={{ marginRight: 6 }} />
            <TextInput
              value={search}
              onChangeText={handleSearch}
              placeholder="Search colors..."
              placeholderTextColor="#bbb"
              style={styles.searchInput}
            />
            {!!search && (
              <TouchableOpacity onPress={() => handleSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={BI.xCircle as any} size={17} color="#aaa" />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.viewBtn, viewMode === "grid" && styles.viewBtnActive]}
              onPress={() => setViewMode("grid")}
            >
              <Ionicons name={BI.grid as any} size={17} color={viewMode === "grid" ? "#fff" : "#666"} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewBtn, viewMode === "list" && styles.viewBtnActive]}
              onPress={() => setViewMode("list")}
            >
              <Ionicons name={BI.list as any} size={19} color={viewMode === "list" ? "#fff" : "#666"} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </>
  );

  const FooterSection = (
    <View style={{ paddingHorizontal: PADDING }}>
      {viewMode === "list" && <View style={styles.tableCardBottom} />}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Showing{" "}
          {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
          {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} colors
        </Text>
        <Pagination
          total={filtered.length}
          page={page}
          pageSize={PAGE_SIZE}
          onChange={(p) => setPage(p)}
        />
      </View>
      <Text style={styles.copyright}>2026 © Flintnthread India Pvt. Ltd.</Text>
    </View>
  );

  const EmptyComponent = (
    <View style={{ padding: 60, alignItems: "center" }}>
      <Ionicons name={BI.palette as any} size={48} color="#ddd" style={{ marginBottom: 12 }} />
      <Text style={{ color: "#aaa", fontSize: 15 }}>No colors found</Text>
    </View>
  );

  // ── WEB: Grid view rendered in a ScrollView with flexWrap ─────────────────
  if (IS_WEB && viewMode === "grid") {
    return (
      <AdminLayout>
        {/* <StatusBar barStyle="light-content" backgroundColor={BRAND} /> */}
        <StatusBar barStyle="light-content" backgroundColor={HEADER_BG} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        >


          {HeaderSection}

          {pageItems.length === 0 ? EmptyComponent : (
            <WebGridView
              items={pageItems}
              onEdit={(item) => setEditTarget(item)}
              onDelete={(item) => setDeleteTarget(item)}
              screenWidth={width}
              padding={PADDING}
              gap={GAP}
            />
          )}

          {FooterSection}
        </ScrollView>

        {addOpen && <ColorFormModal mode="add" onSave={handleAdd} onClose={() => setAddOpen(false)} />}
        {editTarget && (
          <ColorFormModal
            mode="edit"
            initial={editTarget}
            onSave={handleEdit}
            onClose={() => setEditTarget(null)}
          />
        )}
        {deleteTarget && <DeleteModal onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />}
      </AdminLayout>
    );
  }

  const isMobile = width < 768;

  // ── DEFAULT: FlatList for list view (all platforms) and native grid ────────
  const listContent = (
    <FlatList
      data={pageItems}
      keyExtractor={(item) => String(item.id)}
      renderItem={viewMode === "grid" ? renderGridItem : renderListItem}
      numColumns={viewMode === "grid" ? numCols : 1}
      key={`${viewMode}-${numCols}`}
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}

      ListHeaderComponent={
        <View>
          {!isMobile && HeaderSection}
          {/* List table header row */}
          {viewMode === "list" && (
            <View style={{ paddingHorizontal: PADDING }}>
              <View style={styles.tableCard}>
                <ListHeader screenWidth={viewMode === "list" ? Math.max(containerWidth, 950) : width} />
              </View>
            </View>
          )}
        </View>
      }

      columnWrapperStyle={viewMode === "grid"
        ? { gap: GAP, paddingHorizontal: PADDING }
        : undefined}
      ItemSeparatorComponent={viewMode === "grid"
        ? () => <View style={{ height: GAP }} />
        : undefined}

      CellRendererComponent={viewMode === "list"
        ? ({ children, style, ...rest }: any) => (
          <View style={[{ paddingHorizontal: PADDING }, style]} {...rest}>
            <View style={styles.tableCardRows}>
              {children}
            </View>
          </View>
        )
        : undefined}

      ListEmptyComponent={EmptyComponent}

      ListFooterComponent={FooterSection}
    />
  );

  return (
    <AdminLayout>
      <View style={{ flex: 1 }} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
        <StatusBar barStyle="light-content" backgroundColor={BRAND} />

        {isMobile && HeaderSection}

        {viewMode === "list" ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ width: Math.max(containerWidth, 950) }}>
              {listContent}
            </View>
          </ScrollView>
        ) : (
          listContent
        )}

        {/* Modals */}
        {addOpen && <ColorFormModal mode="add" onSave={handleAdd} onClose={() => setAddOpen(false)} />}
        {editTarget && (
          <ColorFormModal
            mode="edit"
            initial={editTarget}
            onSave={handleEdit}
            onClose={() => setEditTarget(null)}
          />
        )}
        {deleteTarget && <DeleteModal onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />}
      </View>
    </AdminLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  safe: { flex: 1, backgroundColor: "#f5f6fa" },

  // Hero
  // hero: { height: 110, backgroundColor: BRAND, overflow: "hidden" },
  hero: { height: 110, backgroundColor: HEADER_BG, overflow: "hidden" },

  heroBubble1: {
    position: "absolute", width: 80, height: 80, borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.07)", top: -10, left: "15%",
  },
  heroBubble2: {
    position: "absolute", width: 120, height: 120, borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.07)", top: -30, left: "45%",
  },
  heroBubble3: {
    position: "absolute", width: 60, height: 60, borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.07)", top: 30, left: "75%",
  },

  // Header Card
  headerCard: {
    backgroundColor: "#fff", borderRadius: 16, marginTop: 16, marginBottom: 16,
    padding: 16, flexDirection: "row", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  headerIcon: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: "#fff5ee", alignItems: "center", justifyContent: "center",
    marginRight: 12, flexShrink: 0,
  },
  headerContent: { flex: 1, minWidth: 0 },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: BRAND,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  addBtn: {
    backgroundColor: BRAND,
    borderWidth: 1.2,
    borderColor: BRAND,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
    marginLeft: 12,
  },
  addBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  webPageHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 24, paddingVertical: 20,
    backgroundColor: "#1d324e",
    borderRadius: 22,
    marginHorizontal: 16,
    marginTop: 16,
  },
  webPageTitle: { fontSize: 22, fontWeight: "800", color: "#fff" },
  webPageSubtitle: { fontSize: 13, color: "#cbd5e1", marginTop: 4 },

  // Toolbar
  toolbar: {
    backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 12,
    flexDirection: "row", alignItems: "center", gap: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  searchBox: {
    flex: 1, flexDirection: "row", alignItems: "center",
    backgroundColor: "#f8f8f8", borderRadius: 8,
    borderWidth: 1.5, borderColor: "#e0e0e0", paddingHorizontal: 10,
    minWidth: 0,
  },
  searchInput: { flex: 1, paddingVertical: 8, fontSize: 14, color: "#222", outlineStyle: "none" } as any,
  viewToggle: { flexDirection: "row", gap: 4, flexShrink: 0 },
  viewBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: "#f0f0f0", alignItems: "center", justifyContent: "center",
  },
  viewBtnActive: { backgroundColor: DARK_BTN },

  // ── TABLE CARD ──────────────────────────────────────────────────────────────
  tableCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  tableCardRows: {
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  tableCardBottom: {
    height: 12,
    backgroundColor: "#fff",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },

  // Table header row
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F1E8",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerCell: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Table data row
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 64,
    ...(IS_WEB ? ({ cursor: "default" } as any) : {}),
  },
  listRowEven: { backgroundColor: "#fafbfc" },
  listRowBorder: { borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },

  // Column widths
  colId: { width: 95, flexShrink: 0 },
  colName: { flex: 1, minWidth: 80, paddingRight: 24 },
  colPreview: { width: 160, flexShrink: 0, alignItems: "center" },
  colCode: { width: 160, flexShrink: 0, paddingLeft: 16, paddingRight: 12 },
  colDate: { width: 175, flexShrink: 0, flexDirection: "row", alignItems: "center", paddingHorizontal: 12 },
  colStatus: { width: 120, flexShrink: 0, paddingHorizontal: 12 },
  colAction: { width: 104, flexShrink: 0, flexDirection: "row", gap: 8, justifyContent: "flex-end" },

  // Cell content
  cellId: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  cellName: { fontSize: 14, fontWeight: "600", color: "#1a1a2e" },

  swatchCell: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.09)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },

  codePill: {
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    alignSelf: "flex-start",
  },
  cellCode: {
    fontSize: 12,
    color: "#555",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },

  cellDate: { fontSize: 12, color: "#888" },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  statusActive: { backgroundColor: "#dcfce7", borderColor: "#22c55e" },
  statusInactive: { backgroundColor: "#fee2e2", borderColor: "#ef4444" },
  statusText: { fontSize: 11, fontWeight: "700" },
  statusTextActive: { color: "#15803d" },
  statusTextInactive: { color: "#dc2626" },

  editBtn: {
    width: 32, height: 32, borderRadius: 6,
    backgroundColor: DARK_BTN, alignItems: "center", justifyContent: "center",
  },
  deleteBtn: {
    width: 32, height: 32, borderRadius: 6,
    backgroundColor: "#fee2e2", alignItems: "center", justifyContent: "center",
  },

  // Grid card
  gridCard: {
    backgroundColor: "#fff", borderRadius: 12, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
    ...(IS_WEB ? ({ cursor: "pointer" } as any) : {}),
  },
  gridSwatch: { height: 90 },
  swatchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.38)",
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
  },
  overlayBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  gridCardBody: { padding: 10 },
  gridCardName: { fontSize: 13, fontWeight: "700", color: "#222", flex: 1, marginRight: 4 },
  gridCardCode: {
    fontSize: 11, color: "#888",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  gridCardBar: { height: 3, borderRadius: 2, marginTop: 8 },

  // Footer
  footer: {
    backgroundColor: "#fff", borderRadius: 8, marginTop: 16,
    padding: 16, gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
    borderWidth: 1, borderColor: "#E5E7EB",
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap",
  },
  footerText: { fontSize: 13, color: "#666" },
  pagination: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  pageBtn: {
    width: 32, height: 32, borderRadius: 6,
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb",
    alignItems: "center", justifyContent: "center",
  },
  pageBtnActive: { backgroundColor: "#1d324e", borderColor: "#1d324e" },
  pageBtnDisabled: { opacity: 0.35 },
  pageBtnText: { fontSize: 13, color: "#374151", fontWeight: "600" },
  pageBtnTextActive: { color: "#fff", fontWeight: "700" },
  copyright: { textAlign: "center", color: "#ccc", fontSize: 12, marginTop: 16 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center", alignItems: "center", padding: 20,
  },
  modalCard: {
    width: "100%", maxWidth: 480, backgroundColor: "#fff",
    borderRadius: 16, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2, shadowRadius: 40, elevation: 20, maxHeight: "90%",
  },
  modalHeader: {
    backgroundColor: BRAND, paddingHorizontal: 20, paddingVertical: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  modalTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },

  // Form
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#333", marginBottom: 6 },
  textInput: {
    borderWidth: 1.5, borderColor: "#e0e0e0", borderRadius: 8,
    padding: 10, fontSize: 14, color: "#222", backgroundColor: "#fff",
    outlineStyle: "none",
  } as any,
  inputError: { borderColor: "#e53e3e" },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  errorText: { color: "#e53e3e", fontSize: 12 },
  colorSwatchInput: {
    width: 52, height: 44, borderRadius: 8, borderWidth: 1.5, borderColor: "#e0e0e0",
  },
  modalButtons: {
    flexDirection: "row", gap: 12, justifyContent: "flex-end",
    marginTop: 24, marginBottom: 8, flexWrap: "wrap",
  },
  cancelBtn: {
    paddingHorizontal: 18, paddingVertical: 10, backgroundColor: DARK_BTN,
    borderRadius: 8, flexDirection: "row", alignItems: "center", gap: 6,
  },
  cancelBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  saveBtn: {
    paddingHorizontal: 18, paddingVertical: 10, backgroundColor: BRAND,
    borderRadius: 8, flexDirection: "row", alignItems: "center", gap: 6,
  },
  saveBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  // Inline Dropdown
  dropdownWrapper: { position: "relative", zIndex: 100 },
  dropdownBtn: {
    borderWidth: 1.5, borderColor: "#e0e0e0", borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 11,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#fff",
  },
  dropdownBtnOpen: {
    borderColor: BRAND,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  dropdownBtnText: { fontSize: 14, color: "#222" },
  dropdownList: {
    position: "absolute",
    top: "100%" as any,
    left: 0, right: 0,
    backgroundColor: "#fff",
    borderWidth: 1.5, borderColor: BRAND, borderTopWidth: 0,
    borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
    overflow: "hidden", zIndex: 200,
    shadowColor: "#000", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 16,
  },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 13, backgroundColor: "#fff" },
  dropdownItemSelected: { backgroundColor: "#2563eb" },
  dropdownItemText: { fontSize: 14, color: "#222" },
  dropdownItemTextSelected: { color: "#fff", fontWeight: "600" },

  // Delete modal
  deleteIconCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: "#fff5ee",
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  deleteTitle: { fontSize: 17, fontWeight: "700", color: "#222", marginBottom: 6 },
  deleteSubtitle: { fontSize: 14, color: "#888", textAlign: "center" },
});