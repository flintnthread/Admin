// @ts-nocheck
// SizesManagement.tsx
// React Native — Full Bootstrap Icons via @expo/vector-icons
//
// Install dependencies:
//   expo install expo-linear-gradient @expo/vector-icons
//
// For bare React Native CLI:
//   npm install react-native-linear-gradient
//   npm install react-native-vector-icons
//   npx react-native link react-native-vector-icons
//   Then replace the two import lines below accordingly.

import AdminLayout from "@/components/admin-layout";
import Pagination from "@/components/Pagination";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
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
    View
} from "react-native";

import { getApiErrorMessage } from "@/lib/api/client";
import {
    createSize,
    deleteSize,
    fetchSizes,
    updateSize,
    type CatalogSize,
} from "@/services/sizeApi";
import {
  SIZE_CATALOG_ALL,
  SIZE_CATALOG_GROUPS,
  classifySizeCatalog,
  countSizesByCatalogGroup,
  filterSizesByCatalogGroup,
  sizeCatalogGroupLabel,
  type SizeCatalogFilterId,
} from "@/lib/sizeCatalogGroups";

// ── Linear Gradient ──────────────────────────────────────────
// Expo:  import { LinearGradient } from "expo-linear-gradient";
// CLI:   import LinearGradient from "react-native-linear-gradient";
import { LinearGradient } from "expo-linear-gradient";

import { Ionicons } from "@expo/vector-icons";

const ION_MAP: Record<string, any> = {
  "check-circle-fill": "checkmark-circle",
  "x-circle-fill": "close-circle",
  "pencil-square": "create-outline",
  "trash3": "trash-outline",
  "calendar3": "calendar-outline",
  "chevron-left": "chevron-back-outline",
  "chevron-right": "chevron-forward-outline",
  "x-lg": "close",
  "check-circle": "checkmark-circle-outline",
  "x-circle": "close-circle-outline",
  "floppy": "save-outline",
  "grid-3x3": "apps-outline",
  "plus-lg": "add",
  "search": "search-outline",
  "grid": "grid-outline",
  "list-ul": "list-outline",
};

const BI: React.FC<{ name: string; size?: number; color?: string; style?: object }> = ({
  name,
  size = 18,
  color = "#fff",
  style,
}) => (
  <Ionicons name={ION_MAP[name] ?? "ellipse"} size={size} color={color} style={style as any} />
);

// ─────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────
interface SizeItem {
  id: number;
  name: string;
  code: string;
  createdDate: string;
  status: "Active" | "Inactive";
}

function mapSizeRow(row: CatalogSize): SizeItem {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    status: row.status,
    createdDate: row.createdDate ?? todayStr(),
  };
}

const PAGE_SIZE = 12;

const CARD_GRADIENTS: [string, string][] = [
  ["#1d324e", "#101d2e"],
  ["#1d324e", "#14243a"],
  ["#1d324e", "#192c46"],
];

function todayStr(): string {
  const d = new Date();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]}, ${d.getFullYear()}`;
}

// ─────────────────────────────────────────────────────────────
// RESPONSIVE HOOK
// ─────────────────────────────────────────────────────────────
function useWindowDimensions() {
  const [dims, setDims] = useState(Dimensions.get("window"));
  React.useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => setDims(window));
    return () => sub?.remove?.();
  }, []);
  return dims;
}

// ─────────────────────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <View style={[
    S.badge,
    { backgroundColor: status === "Active" ? "#e8f5e9" : "#fce4ec" },
  ]}>
    <BI
      name={status === "Active" ? "check-circle-fill" : "x-circle-fill"}
      size={10}
      color={status === "Active" ? "#2e7d32" : "#c62828"}
    />
    <Text style={[
      S.badgeText,
      { color: status === "Active" ? "#2e7d32" : "#c62828", marginLeft: 3 },
    ]}>
      {status}
    </Text>
  </View>
);
// ─────────────────────────────────────────────────────────────
// STATUS DROPDOWN
// ─────────────────────────────────────────────────────────────
const STATUS_OPTIONS = ["Active", "Inactive"] as const;

const StatusDropdown = ({
  value,
  onChange,
}: {
  value: "Active" | "Inactive";
  onChange: (v: "Active" | "Inactive") => void;
}) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<View>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const dims = useWindowDimensions();
  const isMobile = dims.width < 768;

  const handlePress = () => {
    if (!open && triggerRef.current) {
      triggerRef.current.measureInWindow((x, y, width, height) => {
        setMenuPosition({ top: y + height, left: x, width });
      });
    }
    setOpen((o) => !o);
  };

  if (!isMobile) {
    return (
      <View style={S.dropdownWrapper}>
        <TouchableOpacity
          style={[S.dropdownBtn, open && S.dropdownBtnOpen]}
          onPress={() => setOpen((o) => !o)}
          activeOpacity={0.85}
        >
          <Text style={S.dropdownBtnText}>{value}</Text>
          <Ionicons
            name="chevron-down"
            size={18}
            color="#e07820"
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
            <View style={S.dropdownList}>
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = value === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[S.dropdownItem, isSelected && S.dropdownItemSelected]}
                    onPress={() => { onChange(opt); setOpen(false); }}
                    activeOpacity={0.85}
                  >
                    <Text style={[S.dropdownItemText, isSelected && S.dropdownItemTextSelected]}>
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
  }

  return (
    <View style={S.dropdownWrapper}>
      <TouchableOpacity
        ref={triggerRef as any}
        style={[S.dropdownBtn, open && S.dropdownBtnOpen]}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        <Text style={S.dropdownBtnText}>{value}</Text>
        <Ionicons
          name="chevron-down"
          size={18}
          color="#e07820"
          style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
        />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
        {menuPosition && (
          <View style={[S.dropdownOverlay, { top: menuPosition.top, left: menuPosition.left, width: menuPosition.width }]}>
            <View style={[S.dropdownMenu, { borderColor: "#e07820", borderWidth: 1.5, borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }]}>
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = value === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[S.dropdownItem, isSelected && S.dropdownItemSelected]}
                    onPress={() => { onChange(opt); setOpen(false); }}
                    activeOpacity={0.85}
                  >
                    <Text style={[S.dropdownItemText, isSelected && S.dropdownItemTextSelected]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// GRID CARD
// ─────────────────────────────────────────────────────────────
const GridCard: React.FC<{
  item: SizeItem;
  idx: number;
  onEdit: (s: SizeItem) => void;
  onDelete: (s: SizeItem) => void;
  cardWidth: number | string;
}> = ({ item, idx, onEdit, onDelete, cardWidth }) => {
  const dims = useWindowDimensions();
  const isMobile = dims.width < 768;
  const [isHovered, setIsHovered] = useState(false);
  const colors = CARD_GRADIENTS[idx % CARD_GRADIENTS.length];

  const visibleActions = isHovered;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => !isMobile && setIsHovered(false)}
      style={[S.gridCard, { width: cardWidth }]}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={S.gridCardTop}
      >
        {visibleActions && !isMobile ? (
          <View style={S.gridCardActions}>
            <TouchableOpacity
              style={S.cardActionBtn}
              onPress={() => { setIsHovered(false); onEdit(item); }}
            >
              {/* Bootstrap: pencil-square */}
              <BI name="pencil-square" size={17} color="#444" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[S.cardActionBtn, { marginLeft: 10 }]}
              onPress={() => { setIsHovered(false); onDelete(item); }}
            >
              {/* Bootstrap: trash3 */}
              <BI name="trash3" size={17} color="#e53935" />
            </TouchableOpacity>
          </View>
        ) : (
          <Text
            style={S.gridCardCode}
            numberOfLines={2}
            adjustsFontSizeToFit
          >
            {item.code}
          </Text>
        )}
      </LinearGradient>

      <View style={S.gridCardBottom}>
        <Text style={S.gridCardName} numberOfLines={1}>{item.name}</Text>
        <Text style={S.gridCardCatalog} numberOfLines={1}>
          {sizeCatalogGroupLabel(classifySizeCatalog(item.name, item.code))}
        </Text>
        <View style={S.gridCardMeta}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {/* Bootstrap: calendar3 */}
            <BI name="calendar3" size={10} color="#999" />
            <Text style={[S.gridCardDate, { marginLeft: 3 }]}>{item.createdDate}</Text>
          </View>
          <StatusBadge status={item.status} />
        </View>

        {isMobile && (
          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
            <TouchableOpacity style={S.mobileEditBtn} onPress={() => onEdit(item)}>
              <BI name="pencil-square" size={13} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={S.mobileDeleteBtn} onPress={() => onDelete(item)}>
              <BI name="trash3" size={13} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

      </View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────
// LIST ROW
// ─────────────────────────────────────────────────────────────
const ListRow: React.FC<{
  item: SizeItem;
  idx: number;
  onEdit: (s: SizeItem) => void;
  onDelete: (s: SizeItem) => void;
}> = ({ item, idx, onEdit, onDelete }) => (
  <View style={[S.listRow, { backgroundColor: idx % 2 === 0 ? "#fff" : "#fdfaf8" }]}>
    <Text style={[S.listCell, { width: 95, color: "#999", fontSize: 12 }]}>{item.id}</Text>
    <Text style={[S.listCell, { flex: 1.5, fontWeight: "700", color: "#111" }]} numberOfLines={1}>
      {item.name}
    </Text>
    <Text style={[S.listCell, { flex: 1.2, color: "#555" }]} numberOfLines={1}>
      {item.code}
    </Text>
    <Text style={[S.listCell, { flex: 1.2, color: "#8b3e0f", fontWeight: "600" }]} numberOfLines={1}>
      {sizeCatalogGroupLabel(classifySizeCatalog(item.name, item.code))}
    </Text>
    <View style={[S.listCell, { flex: 1.4, flexDirection: "row", alignItems: "center" }]}>
      {/* Bootstrap: calendar3 */}
      <BI name="calendar3" size={11} color="#aaa" />
      <Text style={{ fontSize: 11, color: "#999", marginLeft: 4 }} numberOfLines={1}>
        {item.createdDate}
      </Text>
    </View>
    <View style={{ width: 150, alignItems: "flex-start" }}>
      <StatusBadge status={item.status} />
    </View>
    <View style={S.listActions}>
      {/* Bootstrap: pencil-square (edit) */}
      <TouchableOpacity style={S.listEditBtn} onPress={() => onEdit(item)}>
        <BI name="pencil-square" size={14} color="#fff" />
      </TouchableOpacity>
      {/* Bootstrap: trash3 (delete) */}
      <TouchableOpacity style={[S.listEditBtn, S.listDeleteBtn]} onPress={() => onDelete(item)}>
        <BI name="trash3" size={14} color="#fff" />
      </TouchableOpacity>
    </View>
  </View>
);



// ─────────────────────────────────────────────────────────────
// MODAL WRAPPER
// ─────────────────────────────────────────────────────────────
const ModalWrapper: React.FC<{
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ visible, title, onClose, children }) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    statusBarTranslucent
    onRequestClose={onClose}
  >
    <KeyboardAvoidingView
      style={S.modalOverlay}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={S.modalBox}>
        <LinearGradient
          colors={["#e07820", "#c0601a"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={S.modalHeader}
        >
          <Text style={S.modalTitle}>{title}</Text>
          {/* Bootstrap: x-lg */}
          <TouchableOpacity onPress={onClose} style={S.modalCloseBtn}>
            <BI name="x-lg" size={16} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>
        <ScrollView
          style={{ flexGrow: 0 }}
          contentContainerStyle={S.modalBody}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

// ─────────────────────────────────────────────────────────────
// SIZE FORM — shared by Add + Edit modals
// ─────────────────────────────────────────────────────────────
const SizeForm: React.FC<{
  name: string; setName: (v: string) => void;
  code: string; setCode: (v: string) => void;
  status: "Active" | "Inactive"; setStatus: (v: "Active" | "Inactive") => void;
}> = ({ name, setName, code, setCode, status, setStatus }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const matchedGroup = classifySizeCatalog(name, code);
  const matchedLabel = sizeCatalogGroupLabel(matchedGroup);

  return (
    <View>
      <Text style={S.label}>Size Name</Text>
      <TextInput
        style={S.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. M, UK 8, 32, 2-3Y, Free Size"
        placeholderTextColor="#bbb"
      />

      <Text style={S.label}>Size Code</Text>
      <TextInput
        style={S.input}
        value={code}
        onChangeText={setCode}
        placeholder="e.g. M, UK-8, 32, 2-3Y, FS"
        placeholderTextColor="#bbb"
      />

      <View style={S.catalogMatchBox}>
        <Text style={S.catalogMatchLabel}>Will appear under</Text>
        <Text style={S.catalogMatchValue}>{matchedLabel}</Text>
        <Text style={S.catalogMatchHint}>
          Matched from name/code · Apparel, Footwear, Waist, Kids, Free Size, or Other
        </Text>
      </View>

      <Text style={S.label}>Status</Text>
      {isMobile ? (
        <StatusDropdown value={status} onChange={setStatus} />
      ) : (
        <View style={S.statusToggleRow}>
          {(["Active", "Inactive"] as const).map(s => (
            <TouchableOpacity
              key={s}
              style={[S.statusToggleBtn, status === s && S.statusToggleBtnActive]}
              onPress={() => setStatus(s)}
            >
              {/* Bootstrap: check-circle / x-circle */}
              <BI
                name={s === "Active" ? "check-circle" : "x-circle"}
                size={14}
                color={status === s ? "#fff" : "#888"}
              />
              <Text style={[S.statusToggleBtnText, status === s && { color: "#fff" }, { marginLeft: 6 }]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// MODAL FOOTER BUTTONS
// ─────────────────────────────────────────────────────────────
const ModalFooter: React.FC<{
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmIcon: BIName;
  disabled?: boolean;
  danger?: boolean;
}> = ({ onCancel, onConfirm, confirmLabel, confirmIcon, disabled, danger }) => (
  <View style={S.modalFooter}>
    {/* Bootstrap: x-lg — Cancel */}
    <TouchableOpacity style={S.cancelBtn} onPress={onCancel}>
      <BI name="x-lg" size={13} color="#fff" />
      <Text style={[S.cancelBtnText, { marginLeft: 6 }]}>Cancel</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[
        S.confirmBtn,
        danger && { backgroundColor: "#e53935" },
        disabled && S.confirmBtnDisabled,
      ]}
      onPress={onConfirm}
      disabled={disabled}
    >
      <BI name={confirmIcon} size={13} color="#fff" />
      <Text style={[S.confirmBtnText, { marginLeft: 6 }]}>{confirmLabel}</Text>
    </TouchableOpacity>
  </View>
);

// ─────────────────────────────────────────────────────────────
// ADD SIZE MODAL
// ─────────────────────────────────────────────────────────────
const AddSizeModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSave: (d: { name: string; code: string; status: "Active" | "Inactive" }) => void;
}> = ({ visible, onClose, onSave }) => {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");

  function handleSave() {
    if (!name.trim() || !code.trim()) return;
    onSave({ name: name.trim(), code: code.trim(), status });
    setName(""); setCode(""); setStatus("Active");
    onClose();
  }

  return (
    <ModalWrapper visible={visible} title="Add New Size" onClose={onClose}>
      <SizeForm name={name} setName={setName} code={code} setCode={setCode} status={status} setStatus={setStatus} />
      <ModalFooter
        onCancel={onClose}
        onConfirm={handleSave}
        confirmLabel="Save Size"
        confirmIcon="floppy"       // Bootstrap: floppy (save)
        disabled={!name.trim() || !code.trim()}
      />
    </ModalWrapper>
  );
};

// ─────────────────────────────────────────────────────────────
// EDIT SIZE MODAL
// ─────────────────────────────────────────────────────────────
const EditSizeModal: React.FC<{
  visible: boolean;
  size: SizeItem | null;
  onClose: () => void;
  onUpdate: (s: SizeItem) => void;
}> = ({ visible, size, onClose, onUpdate }) => {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");

  React.useEffect(() => {
    if (size) { setName(size.name); setCode(size.code); setStatus(size.status); }
  }, [size]);

  function handleUpdate() {
    if (!size || !name.trim() || !code.trim()) return;
    onUpdate({ ...size, name: name.trim(), code: code.trim(), status });
    onClose();
  }

  return (
    <ModalWrapper visible={visible} title="Edit Size" onClose={onClose}>
      <SizeForm name={name} setName={setName} code={code} setCode={setCode} status={status} setStatus={setStatus} />
      <ModalFooter
        onCancel={onClose}
        onConfirm={handleUpdate}
        confirmLabel="Update"
        confirmIcon="floppy"       // Bootstrap: floppy
        disabled={!name.trim() || !code.trim()}
      />
    </ModalWrapper>
  );
};

// ─────────────────────────────────────────────────────────────
// DELETE CONFIRM MODAL
// ─────────────────────────────────────────────────────────────
const DeleteModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onDelete: () => void;
}> = ({ visible, onClose, onDelete }) => (
  <ModalWrapper visible={visible} title="Confirm Delete" onClose={onClose}>
    <View style={{ alignItems: "center", paddingVertical: 16 }}>
      {/* Bootstrap: trash3 large */}
      <BI name="trash3" size={52} color="#e07820" />
      <Text style={[S.deleteTitle, { marginTop: 12 }]}>Are you sure?</Text>
      <Text style={S.deleteSubtitle}>
        {"You won't be able to revert this action.\nThis will permanently delete the size."}
      </Text>
    </View>
    <ModalFooter
      onCancel={onClose}
      onConfirm={onDelete}
      confirmLabel="Delete"
      confirmIcon="trash3"         // Bootstrap: trash3
      danger
    />
  </ModalWrapper>
);

// ─────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────
type ModalState =
  | { type: "add" }
  | { type: "edit"; size: SizeItem }
  | { type: "delete"; size: SizeItem }
  | null;

export default function SizesManagement() {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const isTablet = width >= 600;
  const isDesktop = width >= 960;

  const contentWidth = width - 16 * 2;
  const numCols =
    contentWidth >= 1248 ? 6 :
      contentWidth >= 960 ? 5 :
        contentWidth >= 700 ? 4 :
          contentWidth >= 600 ? 3 : 2;
  const PADDING = 16;
  const GAP = 12;

  const [sizes, setSizes] = useState<SizeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [catalogFilter, setCatalogFilter] = useState<SizeCatalogFilterId>(SIZE_CATALOG_ALL);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<ModalState>(null);
  const [containerWidth, setContainerWidth] = useState(width);

  const cardWidth = Math.max(0, (containerWidth - PADDING * 2 - GAP * (numCols - 1)) / numCols);
  const cardWidthPct = `${(100 / numCols).toFixed(4)}%` as any;

  const catalogCounts = useMemo(() => countSizesByCatalogGroup(sizes), [sizes]);

  const filtered = useMemo(() => {
    const byGroup = filterSizesByCatalogGroup(sizes, catalogFilter);
    const q = search.toLowerCase().trim();
    if (!q) return byGroup;
    return byGroup.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q)
    );
  }, [sizes, search, catalogFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleSearch(v: string) { setSearch(v); setPage(1); }
  function handleCatalogFilter(id: SizeCatalogFilterId) {
    setCatalogFilter(id);
    setPage(1);
  }

  const loadSizes = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await fetchSizes();
      setSizes(rows.map(mapSizeRow));
    } catch (error) {
      setLoadError(getApiErrorMessage(error, "Failed to load sizes."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSizes();
  }, [loadSizes]);

  async function handleAdd(d: { name: string; code: string; status: "Active" | "Inactive" }) {
    setSaving(true);
    try {
      const created = await createSize(d);
      const mapped = mapSizeRow(created);
      setSizes((prev) => [...prev, mapped]);
      const group = classifySizeCatalog(mapped.name, mapped.code);
      setCatalogFilter(group);
      setPage(1);
      setSearch("");
      setModal(null);
    } catch (error) {
      Alert.alert("Error", getApiErrorMessage(error, "Could not add size."));
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(updated: SizeItem) {
    setSaving(true);
    try {
      const saved = await updateSize(updated.id, {
        name: updated.name,
        code: updated.code,
        status: updated.status,
      });
      const mapped = mapSizeRow(saved);
      setSizes((prev) => prev.map((s) => (s.id === updated.id ? mapped : s)));
      setCatalogFilter(classifySizeCatalog(mapped.name, mapped.code));
      setPage(1);
      setModal(null);
    } catch (error) {
      Alert.alert("Error", getApiErrorMessage(error, "Could not update size."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    setSaving(true);
    try {
      await deleteSize(id);
      setSizes((prev) => prev.filter((s) => s.id !== id));
      setModal(null);
    } catch (error) {
      Alert.alert("Error", getApiErrorMessage(error, "Could not delete size."));
    } finally {
      setSaving(false);
    }
  }

  // ── Footer shared between both views
  const Footer = (
    <Pagination
      currentPage={safePage}
      totalPages={totalPages}
      totalItems={filtered.length}
      itemsPerPage={PAGE_SIZE}
      itemName="sizes"
      onPageChange={setPage}
    />
  );

  return (
    <AdminLayout>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, width: "100%" }} keyboardShouldPersistTaps="handled">
        <View style={{ flex: 1, width: "100%" }} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
          <StatusBar barStyle="light-content" backgroundColor="#8b3e0f" />

          {/* ── WEB PAGE HEADER — Mobile: Border Radius Added ── */}
          {width < 450 ? (
            <View style={[
              S.webPageHeader,
              S.webPageHeaderMobile,
              { flexDirection: "column", alignItems: "stretch", gap: 10 }
            ]}>
              {/* Row 1: Icon & Title on Left & Add Button on Right */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                  <View style={[S.headerIconBox, { width: 28, height: 28, marginRight: 0, flexShrink: 0 }]}>
                    <BI name="grid-3x3" size={12} color="#fff" />
                  </View>
                  <Text style={[S.webPageTitle, { fontSize: width < 360 ? 17 : 19, fontWeight: "800", flexShrink: 1 }]} numberOfLines={1}>
                    Sizes Management
                  </Text>
                </View>
                <TouchableOpacity
                  style={[S.addBtn, S.addBtnMobile, { paddingVertical: 6, paddingHorizontal: 10, marginLeft: 8, flexShrink: 0, flexDirection: "row", alignItems: "center" }]}
                  onPress={() => setModal({ type: "add" })}
                >
                  <BI name="plus-lg" size={12} color="#fff" />
                  <Text style={[S.addBtnText, { fontSize: 12, marginLeft: 4 }]}>Add Size</Text>
                </TouchableOpacity>
              </View>

              {/* Subtitle Row */}
              <Text style={S.webPageSubtitle}>
                Manage catalog size variants and status settings
              </Text>
            </View>
          ) : (
            <View style={[S.webPageHeader, isMobile && S.webPageHeaderMobile]}>
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: isMobile ? 8 : 16 }}>
                <View style={[S.headerIconBox, { width: 34, height: 34, marginRight: 10 }]}>
                  <BI name="grid-3x3" size={15} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={S.webPageTitle}>Sizes Management</Text>
                  {!isMobile && <Text style={S.webPageSubtitle}>Manage catalog size variants and status settings</Text>}
                </View>
              </View>
              <TouchableOpacity
                style={[S.addBtn, isMobile && S.addBtnMobile]}
                onPress={() => setModal({ type: "add" })}
              >
                <BI name="plus-lg" size={15} color="#fff" />
                <Text style={[S.addBtnText, { marginLeft: 6 }]}>Add New Size</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── CONTROL BAR ── */}
          {loadError ? (
            <Text style={{ color: "#dc2626", marginHorizontal: PADDING, marginTop: 12 }}>{loadError}</Text>
          ) : null}
          {loading ? (
            <View style={{ padding: 24, alignItems: "center" }}>
              <ActivityIndicator size="large" color="#8b3e0f" />
            </View>
          ) : null}
          <View style={[S.controlBar, { marginHorizontal: PADDING }]}>
            <View style={S.searchBox}>
              {/* Bootstrap: search */}
              <BI name="search" size={15} color="#aaa" />
              <TextInput
                style={S.searchInput}
                value={search}
                onChangeText={handleSearch}
                placeholder="Search sizes..."
                placeholderTextColor="#bbb"
              />
              {!!search && (
                <TouchableOpacity onPress={() => handleSearch("")}>
                  {/* Bootstrap: x-lg */}
                  <BI name="x-lg" size={13} color="#aaa" />
                </TouchableOpacity>
              )}
            </View>

            <View style={S.viewToggle}>
              {/* Bootstrap: grid (grid view) */}
              <TouchableOpacity
                style={[S.viewBtn, view === "grid" && S.viewBtnActive]}
                onPress={() => setView("grid")}
              >
                <BI name="grid" size={17} color={view === "grid" ? "#fff" : "#666"} />
              </TouchableOpacity>
              {/* Bootstrap: list-ul (list view) */}
              <TouchableOpacity
                style={[S.viewBtn, view === "list" && S.viewBtnActive]}
                onPress={() => setView("list")}
              >
                <BI name="list-ul" size={17} color={view === "list" ? "#fff" : "#666"} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: PADDING, marginTop: 10 }}
            contentContainerStyle={S.catalogTabsRow}
          >
            <TouchableOpacity
              style={[S.catalogTab, catalogFilter === SIZE_CATALOG_ALL && S.catalogTabActive]}
              onPress={() => handleCatalogFilter(SIZE_CATALOG_ALL)}
            >
              <Text style={[S.catalogTabText, catalogFilter === SIZE_CATALOG_ALL && S.catalogTabTextActive]}>
                All ({catalogCounts.all})
              </Text>
            </TouchableOpacity>
            {SIZE_CATALOG_GROUPS.map((g) => {
              const active = catalogFilter === g.id;
              return (
                <TouchableOpacity
                  key={g.id}
                  style={[S.catalogTab, active && S.catalogTabActive]}
                  onPress={() => handleCatalogFilter(g.id)}
                >
                  <Text style={[S.catalogTabText, active && S.catalogTabTextActive]}>
                    {g.label} ({catalogCounts[g.id]})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ── LIST / GRID ── */}
          {paginated.length === 0 ? (
            <View style={S.emptyBox}>
              <BI name="search" size={40} color="#ccc" />
              <Text style={S.emptyText}>No sizes found</Text>
            </View>
          ) : view === "grid" ? (
            <View style={{
              flexDirection: "row",
              flexWrap: "wrap",
              paddingHorizontal: PADDING,
              paddingTop: 12,
              paddingBottom: 24,
              marginHorizontal: -GAP / 2
            }}>
              {paginated.map((item, index) => (
                <View
                  key={item.id}
                  style={{
                    width: cardWidthPct,
                    paddingHorizontal: GAP / 2,
                    paddingBottom: GAP
                  }}
                >
                  <GridCard
                    item={item}
                    idx={(safePage - 1) * PAGE_SIZE + index}
                    onEdit={s => setModal({ type: "edit", size: s })}
                    onDelete={s => setModal({ type: "delete", size: s })}
                    cardWidth="100%"
                  />
                </View>
              ))}
            </View>
          ) : (
            <View style={{ width: "100%" }}>
              {/* @ts-ignore */}
              <ScrollView className="orange-scrollbar" horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: "100%" }}>
                <View style={{ width: Math.max(containerWidth, 800) }}>
                  <View style={{ paddingHorizontal: PADDING, paddingTop: 12 }}>
                    <View style={S.listHeader}>
                      <Text style={[S.listHeaderCell, { width: 95 }]}>ID</Text>
                      <Text style={[S.listHeaderCell, { flex: 1.5 }]}>Size Name</Text>
                      <Text style={[S.listHeaderCell, { flex: 1.2 }]}>Size Code</Text>
                      <Text style={[S.listHeaderCell, { flex: 1.2 }]}>Catalog</Text>
                      <Text style={[S.listHeaderCell, { flex: 1.4 }]}>Created Date</Text>
                      <Text style={[S.listHeaderCell, { width: 150 }]}>Status</Text>
                      <Text style={[S.listHeaderCell, { width: 80, textAlign: "center" }]}>Action</Text>
                    </View>
                  </View>
                  <View style={{ paddingHorizontal: PADDING, paddingBottom: 24 }}>
                    {paginated.map((item, index) => (
                      <ListRow
                        key={item.id}
                        item={item}
                        idx={index}
                        onEdit={s => setModal({ type: "edit", size: s })}
                        onDelete={s => setModal({ type: "delete", size: s })}
                      />
                    ))}
                  </View>
                </View>
              </ScrollView>
            </View>
          )}

          {Footer}
        </View>
      </ScrollView>

      {/* ── MODALS ── */}
      <AddSizeModal
        visible={modal?.type === "add"}
        onClose={() => setModal(null)}
        onSave={handleAdd}
      />
      <EditSizeModal
        visible={modal?.type === "edit"}
        size={modal?.type === "edit" ? modal.size : null}
        onClose={() => setModal(null)}
        onUpdate={handleUpdate}
      />
      <DeleteModal
        visible={modal?.type === "delete"}
        onClose={() => setModal(null)}
        onDelete={() => modal?.type === "delete" && handleDelete(modal.size.id)}
      />
    </AdminLayout>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f6fa" },

  // Web Page Header Card
  webPageHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 24, paddingVertical: 20,
    backgroundColor: "#151D4F",
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
  },
  webPageHeaderMobile: {
    paddingHorizontal: 12, paddingVertical: 14,
    marginHorizontal: 8, marginTop: 12,
    borderRadius: 16,
  },
  webPageTitle: { fontSize: 22, fontWeight: "800", color: "#fff" },
  webPageSubtitle: { fontSize: 13, color: "#cbd5e1", marginTop: 4 },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#e07820",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  addBtn: {
    backgroundColor: "#e07820",
    borderWidth: 1.2,
    borderColor: "#e07820",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addBtnMobile: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 8,
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Control bar
  controlBar: {
    backgroundColor: "#fff", borderRadius: 12, padding: 12, marginTop: 12,
    flexDirection: "row", alignItems: "center", gap: 10,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  searchBox: {
    flex: 1, flexDirection: "row", alignItems: "center",
    backgroundColor: "#f8f8f8", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1.5, borderColor: "#eee", gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#333", padding: 0, outlineStyle: "none" } as any,
  viewToggle: { flexDirection: "row", gap: 6 },
  viewBtn: {
    width: 36, height: 36, borderRadius: 8,
    borderWidth: 1.5, borderColor: "#ddd", backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },
  viewBtnActive: { backgroundColor: "#1d324e", borderColor: "#1d324e" },

  // Grid card
  gridCard: {
    borderRadius: 12, overflow: "hidden", backgroundColor: "#fff",
    shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  gridCardTop: {
    height: 110, alignItems: "center", justifyContent: "center", padding: 8,
  },
  gridCardCode: {
    color: "rgba(255,255,255,0.93)", fontWeight: "800",
    fontSize: 22, textAlign: "center",
  },
  gridCardActions: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
  },
  cardActionBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  gridCardBottom: { backgroundColor: "#fff", padding: 10 },
  gridCardName: { fontSize: 13, fontWeight: "600", color: "#222", marginBottom: 2 },
  gridCardCatalog: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8b3e0f",
    marginBottom: 6,
  },
  catalogTabsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
    paddingRight: 8,
  },
  catalogTab: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e5d5c8",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  catalogTabActive: {
    backgroundColor: "#8b3e0f",
    borderColor: "#8b3e0f",
  },
  catalogTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6b5a4e",
  },
  catalogTabTextActive: {
    color: "#fff",
  },
  catalogMatchBox: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  catalogMatchLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9A3412",
    marginBottom: 2,
  },
  catalogMatchValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#C2410C",
  },
  catalogMatchHint: {
    marginTop: 4,
    fontSize: 11,
    color: "#9A3412",
    lineHeight: 15,
  },
  gridCardMeta: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", flexWrap: "wrap", gap: 4,
  },
  gridCardDate: { fontSize: 11, color: "#999" },
  mobileEditBtn: {
    width: 32, height: 32, borderRadius: 6,
    backgroundColor: "#1a2a4a", alignItems: "center", justifyContent: "center",
  },
  mobileDeleteBtn: {
    width: 32, height: 32, borderRadius: 6,
    backgroundColor: "#e53935", alignItems: "center", justifyContent: "center",
  },

  // List view
  listHeader: {
    flexDirection: "row", backgroundColor: "#151D4F",
    paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1.5, borderBottomColor: "#f0e8e0",
  },
  listHeaderCell: { fontSize: 13, fontWeight: "600", color: "#fff" },
  listRow: {
    flexDirection: "row", paddingHorizontal: 12, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: "#f5f0eb", alignItems: "center",
  },
  listCell: { fontSize: 13, color: "#555", paddingRight: 8 },
  listActions: { width: 80, flexDirection: "row", gap: 6, justifyContent: "center" },
  listEditBtn: {
    width: 30, height: 30, borderRadius: 6, backgroundColor: "#1a2a4a",
    alignItems: "center", justifyContent: "center",
  },
  listDeleteBtn: { backgroundColor: "#e53935" },

  // Badge
  badge: {
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
    flexDirection: "row", alignItems: "center",
  },
  badgeText: { fontSize: 11, fontWeight: "600" },

  // Pagination
  paginationRow: {
    flexDirection: "row", gap: 4, flexWrap: "wrap", justifyContent: "center",
  },
  pageBtn: {
    minWidth: 32, height: 32, borderRadius: 6,
    borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
  },
  pageBtnActive: { backgroundColor: "#1d324e", borderColor: "#1d324e" },
  pageBtnDisabled: { opacity: 0.35 },
  pageBtnText: { fontSize: 13, color: "#374151", fontWeight: "600" },

  // Footer
  footerRow: {
    marginTop: 16, flexDirection: "row", flexWrap: "wrap",
    alignItems: "center", justifyContent: "space-between", gap: 12,
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  footerText: { fontSize: 13, color: "#666" },

  // Empty
  emptyBox: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { color: "#bbb", fontSize: 16, marginTop: 10 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center", alignItems: "center", padding: 20,
  },
  modalBox: {
    backgroundColor: "#fff", borderRadius: 14, width: "100%", maxWidth: 460,
    overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.25,
    shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10,
  },
  modalHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16,
  },
  modalTitle: { color: "#fff", fontWeight: "700", fontSize: 16 },
  modalCloseBtn: { padding: 4 },
  modalBody: { padding: 20 },
  modalFooter: {
    flexDirection: "row", gap: 10, marginTop: 20, justifyContent: "flex-end",
  },

  // Form
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1.5, borderColor: "#ddd", borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 9,
    fontSize: 14, color: "#333", backgroundColor: "#fafafa",
    outlineStyle: "none",
  } as any,
  statusToggleRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  statusToggleBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1.5, borderColor: "#ddd",
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#fafafa",
  },
  statusToggleBtnActive: { backgroundColor: "#e07820", borderColor: "#e07820" },
  statusToggleBtnText: { fontSize: 14, fontWeight: "600", color: "#555" },

  // Buttons
  cancelBtn: {
    backgroundColor: "#3a3f4a", borderRadius: 8,
    paddingHorizontal: 18, paddingVertical: 10,
    flexDirection: "row", alignItems: "center",
  },
  cancelBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  confirmBtn: {
    backgroundColor: "#e07820", borderRadius: 8,
    paddingHorizontal: 18, paddingVertical: 10,
    flexDirection: "row", alignItems: "center",
  },
  confirmBtnDisabled: { backgroundColor: "#ccc" },
  confirmBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  // Delete modal
  deleteTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a2e", marginBottom: 8 },
  deleteSubtitle: {
    fontSize: 14, color: "#666", textAlign: "center", lineHeight: 20, paddingHorizontal: 8,
  },

  // Dropdown styles
  dropdownWrapper: { position: "relative", zIndex: 100 },
  dropdownOverlay: { position: "absolute", paddingHorizontal: 0, zIndex: 9999 },
  dropdownMenu: {
    backgroundColor: "#fff", borderRadius: 12,
    borderWidth: 1, borderColor: "#e5e7eb",
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 12,
    overflow: "hidden", width: "100%", zIndex: 10000,
  },
  dropdownBtn: {
    borderWidth: 1.5, borderColor: "#ddd", borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 11,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#fafafa",
  },
  dropdownBtnOpen: {
    borderColor: "#e07820",
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  dropdownBtnText: { fontSize: 14, color: "#333" },
  dropdownList: {
    position: "absolute",
    top: "100%" as any,
    left: 0, right: 0,
    backgroundColor: "#fff",
    borderWidth: 1.5, borderColor: "#e07820", borderTopWidth: 0,
    borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
    overflow: "hidden", zIndex: 200,
    shadowColor: "#000", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 16,
  },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 13, backgroundColor: "#fff" },
  dropdownItemSelected: { backgroundColor: "#2563eb" },
  dropdownItemText: { fontSize: 14, color: "#222" },
  dropdownItemTextSelected: { color: "#fff", fontWeight: "600" },
});