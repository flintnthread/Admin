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
import React, { useMemo, useState } from "react";
import {
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

// ── Linear Gradient ──────────────────────────────────────────
// Expo:  import { LinearGradient } from "expo-linear-gradient";
// CLI:   import LinearGradient from "react-native-linear-gradient";
import { LinearGradient } from "expo-linear-gradient";

// ── Bootstrap Icons via 'bootstrap-icons' Font Family ────────
const BI_MAP: Record<string, string> = {
  "check-circle-fill": "\uF269",
  "x-circle-fill": "\uF659",
  "pencil-square": "\uF4CA",
  "trash3": "\uF78B",
  "calendar3": "\uF214",
  "chevron-left": "\uF284",
  "chevron-right": "\uF285",
  "x-lg": "\uF659",
  "check-circle": "\uF26B",
  "x-circle": "\uF623",
  "floppy": "\uF7D8",
  "grid-3x3": "\uF3FA",
  "plus-lg": "\uF64D",
  "search": "\uF52A",
  "grid": "\uF3FC",
  "list-ul": "\uF478",
};

type BIName = keyof typeof BI_MAP | string;

const BI: React.FC<{ name: BIName; size?: number; color?: string; style?: object }> = ({
  name,
  size = 18,
  color = "#fff",
  style,
}) => (
  <Text
    style={[{ fontFamily: "bootstrap-icons", fontSize: size, color, lineHeight: size + 4 }, style]}
    accessible={false}
  >
    {BI_MAP[name] ?? "•"}
  </Text>
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

const INITIAL_SIZES: SizeItem[] = [
  { id: 53, name: "1 Seater", code: "1 Seater", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 40, name: "1 Year", code: "1Y", createdDate: "02 Dec, 2025", status: "Active" },
  { id: 38, name: "10", code: "10", createdDate: "29 Nov, 2025", status: "Active" },
  { id: 73, name: "10–11 Years", code: "10–11Y", createdDate: "04 May, 2026", status: "Active" },
  { id: 39, name: "11", code: "11", createdDate: "29 Nov, 2025", status: "Active" },
  { id: 74, name: "11–12 Years", code: "11–12Y", createdDate: "04 May, 2026", status: "Active" },
  { id: 49, name: "12", code: "X-Small Choker", createdDate: "09 Dec, 2025", status: "Active" },
  { id: 41, name: "12-18 Months", code: "12-18M", createdDate: "02 Dec, 2025", status: "Active" },
  { id: 75, name: "12–13 Years", code: "12–13Y", createdDate: "04 May, 2026", status: "Active" },
  { id: 76, name: "13–14 Years", code: "13–14Y", createdDate: "04 May, 2026", status: "Active" },
  { id: 77, name: "14–15 Years", code: "14–15Y", createdDate: "04 May, 2026", status: "Active" },
  { id: 78, name: "15–16 Years", code: "15–16Y", createdDate: "04 May, 2026", status: "Active" },
  { id: 79, name: "16–17 Years", code: "16–17Y", createdDate: "04 May, 2026", status: "Active" },
  { id: 80, name: "17–18 Years", code: "17–18Y", createdDate: "04 May, 2026", status: "Active" },
  { id: 81, name: "2 Seater", code: "2 Seater", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 42, name: "2 Years", code: "2Y", createdDate: "02 Dec, 2025", status: "Active" },
  { id: 43, name: "3 Years", code: "3Y", createdDate: "02 Dec, 2025", status: "Active" },
  { id: 44, name: "3-6 Months", code: "3-6M", createdDate: "02 Dec, 2025", status: "Active" },
  { id: 45, name: "4 Years", code: "4Y", createdDate: "02 Dec, 2025", status: "Active" },
  { id: 46, name: "5 Years", code: "5Y", createdDate: "02 Dec, 2025", status: "Active" },
  { id: 47, name: "6-12 Months", code: "6-12M", createdDate: "02 Dec, 2025", status: "Active" },
  { id: 48, name: "6 Years", code: "6Y", createdDate: "02 Dec, 2025", status: "Active" },
  { id: 82, name: "7 Years", code: "7Y", createdDate: "04 May, 2026", status: "Active" },
  { id: 83, name: "8 Years", code: "8Y", createdDate: "04 May, 2026", status: "Active" },
  { id: 84, name: "9 Years", code: "9Y", createdDate: "04 May, 2026", status: "Active" },
  { id: 85, name: "Free Size", code: "FREE", createdDate: "04 May, 2026", status: "Active" },
  { id: 86, name: "L", code: "L", createdDate: "29 Nov, 2025", status: "Active" },
  { id: 87, name: "M", code: "M", createdDate: "29 Nov, 2025", status: "Active" },
  { id: 88, name: "S", code: "S", createdDate: "29 Nov, 2025", status: "Active" },
  { id: 89, name: "XL", code: "XL", createdDate: "29 Nov, 2025", status: "Active" },
  { id: 90, name: "XS", code: "XS", createdDate: "29 Nov, 2025", status: "Active" },
  { id: 91, name: "XXL", code: "XXL", createdDate: "29 Nov, 2025", status: "Active" },
  { id: 92, name: "XXXL", code: "XXXL", createdDate: "29 Nov, 2025", status: "Active" },
  { id: 93, name: "4 Seater", code: "4 Seater", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 94, name: "6 Seater", code: "6 Seater", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 95, name: "King", code: "KING", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 96, name: "Queen", code: "QUEEN", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 97, name: "Single", code: "SINGLE", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 98, name: "Double", code: "DOUBLE", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 99, name: "Twin", code: "TWIN", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 100, name: "Standard", code: "STD", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 101, name: "Mini", code: "MINI", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 102, name: "Maxi", code: "MAXI", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 103, name: "Micro", code: "MICRO", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 104, name: "Petite", code: "PETITE", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 105, name: "Plus", code: "PLUS", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 106, name: "Tall", code: "TALL", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 107, name: "Short", code: "SHORT", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 108, name: "Regular", code: "REG", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 109, name: "Slim", code: "SLIM", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 110, name: "Wide", code: "WIDE", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 111, name: "Narrow", code: "NARROW", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 112, name: "Oversized", code: "OVER", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 113, name: "Cropped", code: "CROP", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 114, name: "Full Length", code: "FULL", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 115, name: "Half Sleeve", code: "HALF", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 116, name: "Full Sleeve", code: "FSLEEVE", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 117, name: "Sleeveless", code: "SLS", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 118, name: "Knee Length", code: "KNEE", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 119, name: "Midi", code: "MIDI", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 120, name: "Maxi Length", code: "MAXIL", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 121, name: "Mini Length", code: "MINIL", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 122, name: "36", code: "36", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 123, name: "38", code: "38", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 124, name: "40", code: "40", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 125, name: "42", code: "42", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 126, name: "44", code: "44", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 127, name: "46", code: "46", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 128, name: "48", code: "48", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 129, name: "50", code: "50", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 130, name: "52", code: "52", createdDate: "22 Jan, 2026", status: "Active" },
  { id: 131, name: "54", code: "54", createdDate: "22 Jan, 2026", status: "Active" },
];

const PAGE_SIZE = 12;

const CARD_GRADIENTS: [string, string][] = [
  ["#d4691e", "#8b3e0f"],
  ["#c8611a", "#7a360a"],
  ["#e07820", "#9a4a12"],
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
// GRID CARD
// ─────────────────────────────────────────────────────────────
const GridCard: React.FC<{
  item: SizeItem;
  idx: number;
  onEdit: (s: SizeItem) => void;
  onDelete: (s: SizeItem) => void;
  cardWidth: number;
}> = ({ item, idx, onEdit, onDelete, cardWidth }) => {
  const [showActions, setShowActions] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const colors = CARD_GRADIENTS[idx % CARD_GRADIENTS.length];

  const visibleActions = showActions || isHovered;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => setShowActions(p => !p)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={[S.gridCard, { width: cardWidth }]}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={S.gridCardTop}
      >

        {visibleActions ? (
          <View style={S.gridCardActions}>
            <TouchableOpacity
              style={S.cardActionBtn}
              onPress={() => { setShowActions(false); setIsHovered(false); onEdit(item); }}
            >
              {/* Bootstrap: pencil-square */}
              <BI name="pencil-square" size={17} color="#444" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[S.cardActionBtn, { marginLeft: 10 }]}
              onPress={() => { setShowActions(false); setIsHovered(false); onDelete(item); }}
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
        <View style={S.gridCardMeta}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {/* Bootstrap: calendar3 */}
            <BI name="calendar3" size={10} color="#999" />
            <Text style={[S.gridCardDate, { marginLeft: 3 }]}>{item.createdDate}</Text>
          </View>
          <StatusBadge status={item.status} />
        </View>
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
    <Text style={[S.listCell, { width: 70, color: "#999", fontSize: 12 }]}>{item.id}</Text>
    <Text style={[S.listCell, { flex: 1.5, fontWeight: "700", color: "#111" }]} numberOfLines={1}>
      {item.name}
    </Text>
    <Text style={[S.listCell, { flex: 1.2, color: "#555" }]} numberOfLines={1}>
      {item.code}
    </Text>
    <View style={[S.listCell, { flex: 1.4, flexDirection: "row", alignItems: "center" }]}>
      {/* Bootstrap: calendar3 */}
      <BI name="calendar3" size={11} color="#aaa" />
      <Text style={{ fontSize: 11, color: "#999", marginLeft: 4 }} numberOfLines={1}>
        {item.createdDate}
      </Text>
    </View>
    <View style={{ width: 72, alignItems: "flex-start" }}>
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
// PAGINATION
// ─────────────────────────────────────────────────────────────
const Pagination: React.FC<{
  current: number;
  total: number;
  onChange: (p: number) => void;
}> = ({ current, total, onChange }) => {
  const maxVisible = 5;
  let start = Math.max(1, current - 2);
  let end = Math.min(total, start + maxVisible - 1);
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
  const pages: number[] = [];
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <View style={S.paginationRow}>
      {/* Bootstrap: chevron-left */}
      <TouchableOpacity
        style={[S.pageBtn, current === 1 && S.pageBtnDisabled]}
        onPress={() => current > 1 && onChange(current - 1)}
        disabled={current === 1}
      >
        <BI name="chevron-left" size={13} color={current === 1 ? "#bbb" : "#555"} />
      </TouchableOpacity>

      {pages.map(p => (
        <TouchableOpacity
          key={p}
          style={[S.pageBtn, p === current && S.pageBtnActive]}
          onPress={() => onChange(p)}
        >
          <Text style={[S.pageBtnText, p === current && { color: "#fff" }]}>{p}</Text>
        </TouchableOpacity>
      ))}

      {/* Bootstrap: chevron-right */}
      <TouchableOpacity
        style={[S.pageBtn, current === total && S.pageBtnDisabled]}
        onPress={() => current < total && onChange(current + 1)}
        disabled={current === total}
      >
        <BI name="chevron-right" size={13} color={current === total ? "#bbb" : "#555"} />
      </TouchableOpacity>
    </View>
  );
};

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
}> = ({ name, setName, code, setCode, status, setStatus }) => (
  <View>
    <Text style={S.label}>Size Name</Text>
    <TextInput
      style={S.input}
      value={name}
      onChangeText={setName}
      placeholder="Enter size name"
      placeholderTextColor="#bbb"
    />

    <Text style={S.label}>Size Code</Text>
    <TextInput
      style={S.input}
      value={code}
      onChangeText={setCode}
      placeholder="Enter size code"
      placeholderTextColor="#bbb"
    />

    <Text style={S.label}>Status</Text>
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
  </View>
);

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
  const isTablet = width >= 600;
  const isDesktop = width >= 960;

  const numCols = isDesktop ? 4 : isTablet ? 3 : 2;
  const PADDING = 16;
  const GAP = 12;

  const [sizes, setSizes] = useState<SizeItem[]>(INITIAL_SIZES);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<ModalState>(null);
  const [containerWidth, setContainerWidth] = useState(width);

  const cardWidth = Math.max(0, (containerWidth - PADDING * 2 - GAP * (numCols - 1)) / numCols);

  const filtered = useMemo(
    () => sizes.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase())
    ),
    [sizes, search]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleSearch(v: string) { setSearch(v); setPage(1); }

  function handleAdd(d: { name: string; code: string; status: "Active" | "Inactive" }) {
    const newId = Math.max(...sizes.map(s => s.id)) + 1;
    setSizes(prev => [...prev, { id: newId, ...d, createdDate: todayStr() }]);
  }

  function handleUpdate(updated: SizeItem) {
    setSizes(prev => prev.map(s => s.id === updated.id ? updated : s));
  }

  function handleDelete(id: number) {
    setSizes(prev => prev.filter(s => s.id !== id));
    setModal(null);
  }

  // ── Footer shared between both views
  const Footer = (
    <View style={[S.footerRow, { paddingHorizontal: PADDING }]}>
      <Text style={S.footerText}>
        Showing{" "}
        {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–
        {Math.min(safePage * PAGE_SIZE, filtered.length)}{" "}
        of {filtered.length} sizes
      </Text>
      <Pagination current={safePage} total={totalPages} onChange={setPage} />
    </View>
  );

  return (
    <AdminLayout>
      <View style={{ flex: 1 }} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
        <StatusBar barStyle="light-content" backgroundColor="#8b3e0f" />


        {/* ── BANNER ── */}
        <LinearGradient
          colors={["#0f2d6b", "#08275c"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={S.banner}
        >

          <View style={S.bannerIconBox}>
            {/* Bootstrap: grid-3x3 */}
            <BI name="grid-3x3" size={22} color="#fff" />
          </View>
        </LinearGradient>

        {/* ── TITLE CARD ── */}
        <View style={[S.titleCard, { marginHorizontal: PADDING }]}>
          <View style={{ flex: 1 }}>
            <Text style={S.pageTitle}>Sizes Management</Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
              <Text style={S.breadcrumbLink}>Dashboard</Text>
              {/* Bootstrap: chevron-right */}
              <BI name="chevron-right" size={10} color="#bbb" />
              <Text style={S.breadcrumbLink}>Categories</Text>
              <BI name="chevron-right" size={10} color="#bbb" />
              <Text style={S.breadcrumbCurrent}>Sizes</Text>
            </View>
          </View>
          {/* Bootstrap: plus-lg on Add button */}
          <TouchableOpacity style={S.addBtn} onPress={() => setModal({ type: "add" })}>
            <BI name="plus-lg" size={15} color="#fff" />
            <Text style={[S.addBtnText, { marginLeft: 6 }]}>Add New Size</Text>
          </TouchableOpacity>
        </View>

        {/* ── CONTROL BAR ── */}
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

        {/* ── GRID VIEW ── */}
        {view === "grid" ? (
          <FlatList
            key={`grid-${numCols}`}
            data={paginated}
            keyExtractor={item => String(item.id)}
            numColumns={numCols}
            renderItem={({ item, index }) => (
              <GridCard
                item={item}
                idx={(safePage - 1) * PAGE_SIZE + index}
                onEdit={s => setModal({ type: "edit", size: s })}
                onDelete={s => setModal({ type: "delete", size: s })}
                cardWidth={cardWidth}
              />
            )}
            contentContainerStyle={{
              paddingHorizontal: PADDING,
              paddingTop: 12,
              paddingBottom: 24,
              gap: GAP,
            }}
            columnWrapperStyle={{ gap: GAP }}
            ListEmptyComponent={
              <View style={S.emptyBox}>
                {/* Bootstrap: search (empty state) */}
                <BI name="search" size={40} color="#ccc" />
                <Text style={S.emptyText}>No sizes found</Text>
              </View>
            }
            ListFooterComponent={Footer}
          />
        ) : (
          /* ── LIST VIEW ── */
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ width: Math.max(containerWidth, 800) }}>
              <FlatList
                key="list"
                data={paginated}
                keyExtractor={item => String(item.id)}
                ListHeaderComponent={
                  <View style={{ paddingHorizontal: PADDING }}>
                    <View style={S.listHeader}>
                      <Text style={[S.listHeaderCell, { width: 70 }]}>ID</Text>
                      <Text style={[S.listHeaderCell, { flex: 1.5 }]}>Size Name</Text>
                      <Text style={[S.listHeaderCell, { flex: 1.2 }]}>Size Code</Text>
                      <Text style={[S.listHeaderCell, { flex: 1.4 }]}>Created Date</Text>
                      <Text style={[S.listHeaderCell, { width: 72 }]}>Status</Text>
                      <Text style={[S.listHeaderCell, { width: 80, textAlign: "center" }]}>Action</Text>
                    </View>
                  </View>
                }
                renderItem={({ item, index }) => (
                  <View style={{ paddingHorizontal: PADDING }}>
                    <ListRow
                      item={item}
                      idx={index}
                      onEdit={s => setModal({ type: "edit", size: s })}
                      onDelete={s => setModal({ type: "delete", size: s })}
                    />
                  </View>
                )}
                ListEmptyComponent={
                  <View style={S.emptyBox}>
                    <BI name="search" size={40} color="#ccc" />
                    <Text style={S.emptyText}>No sizes found</Text>
                  </View>
                }
                ListFooterComponent={Footer}
                contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
              />
            </View>
          </ScrollView>
        )}
      </View>

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

  // Banner
  banner: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 },
  bannerIconBox: {
    width: 48, height: 48, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
  },

  // Title card
  titleCard: {
    backgroundColor: "#fff", borderRadius: 14,
    padding: 16, marginTop: -28,
    flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12,
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  pageTitle: { fontSize: 20, fontWeight: "700", color: "#1a1a2e" },
  breadcrumbLink: { fontSize: 12, color: "#d4691e", marginHorizontal: 2 },
  breadcrumbCurrent: { fontSize: 12, color: "#999" },
  addBtn: {
    backgroundColor: "#e07820", borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    flexDirection: "row", alignItems: "center",
    shadowColor: "#d4691e", shadowOpacity: 0.4,
    shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
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
  searchInput: { flex: 1, fontSize: 14, color: "#333", padding: 0 },
  viewToggle: { flexDirection: "row", gap: 6 },
  viewBtn: {
    width: 36, height: 36, borderRadius: 8,
    borderWidth: 1.5, borderColor: "#ddd", backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },
  viewBtnActive: { backgroundColor: "#e07820", borderColor: "#e07820" },

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
  gridCardName: { fontSize: 13, fontWeight: "600", color: "#222", marginBottom: 4 },
  gridCardMeta: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", flexWrap: "wrap", gap: 4,
  },
  gridCardDate: { fontSize: 11, color: "#999" },

  // List view
  listHeader: {
    flexDirection: "row", backgroundColor: "#fff8f2",
    paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1.5, borderBottomColor: "#f0e8e0",
  },
  listHeaderCell: { fontSize: 13, fontWeight: "600", color: "#555" },
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
    flexDirection: "row", gap: 4, flexWrap: "wrap", justifyContent: "center", marginTop: 8,
  },
  pageBtn: {
    minWidth: 34, height: 34, borderRadius: 8,
    borderWidth: 1.5, borderColor: "#e0e0e0", backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
  },
  pageBtnActive: { backgroundColor: "#e07820", borderColor: "#e07820" },
  pageBtnDisabled: { opacity: 0.35 },
  pageBtnText: { fontSize: 14, color: "#333", fontWeight: "500" },

  // Footer
  footerRow: {
    marginTop: 16, flexDirection: "row", flexWrap: "wrap",
    alignItems: "center", justifyContent: "space-between",
    gap: 8, paddingBottom: 16,
  },
  footerText: { fontSize: 13, color: "#888" },

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
  },
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
});