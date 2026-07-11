import AdminLayout from "@/components/admin-layout";
import Pagination from "@/components/Pagination";
import * as ImagePicker from "expo-image-picker";
import React, { useRef, useState, useEffect } from "react";
import Swal from "sweetalert2";
import {
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Circle, Line, Path, Polyline, Rect } from "react-native-svg";
import {
  fetchSubcategories,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  uploadSubcategoryImages,
  parseMaterialSlabs,
  serializeMaterialSlabs,
  type SubcategoryRow,
  type MaterialSlab,
} from "@/services/subcategoryApi";
import { fetchMainCategories, fetchSubcategories as fetchChildCategories, type CategoryRow } from "@/services/categoryApi";
import { getApiErrorMessage } from "@/lib/api/client";
import { pickCategoryImageUrl, resolveCatalogMediaUrl } from "@/lib/api/categoryMedia";

const isWeb = Platform.OS === "web";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  primary: "#ef7b1a",
  primaryLight: "#FFF0EA",
  navy: "#151D4F",
  navyLight: "#e8ecf2",
  text: "#1C2B4A",
  sub: "#6B7280",
  border: "#E8E2D9",
  active: "#10B981",
  activeLight: "#ECFDF5",
  inactive: "#EF4444",
  inactiveLight: "#FEF2F2",
  rowAlt: "#FDFAF7",
  matChip: "#EFF6FF",
  matChipText: "#2563EB",
  gstChip: "#ECFDF5",
  gstChipText: "#059669",
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="M7.333 12.667A5.333 5.333 0 1 0 7.333 2a5.333 5.333 0 0 0 0 10.667ZM14 14l-2.9-2.9"
      stroke="#9CA3AF"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
const GridIcon = ({ active }: { active: boolean }) => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Rect
      x="1"
      y="1"
      width="6.5"
      height="6.5"
      rx="1.5"
      stroke={active ? "#FFF" : "#6B7280"}
      strokeWidth={1.6}
    />
    <Rect
      x="10.5"
      y="1"
      width="6.5"
      height="6.5"
      rx="1.5"
      stroke={active ? "#FFF" : "#6B7280"}
      strokeWidth={1.6}
    />
    <Rect
      x="1"
      y="10.5"
      width="6.5"
      height="6.5"
      rx="1.5"
      stroke={active ? "#FFF" : "#6B7280"}
      strokeWidth={1.6}
    />
    <Rect
      x="10.5"
      y="10.5"
      width="6.5"
      height="6.5"
      rx="1.5"
      stroke={active ? "#FFF" : "#6B7280"}
      strokeWidth={1.6}
    />
  </Svg>
);
const ListIcon = ({ active }: { active: boolean }) => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Line
      x1="5"
      y1="4.5"
      x2="17"
      y2="4.5"
      stroke={active ? "#FFF" : "#6B7280"}
      strokeWidth={1.6}
      strokeLinecap="round"
    />
    <Line
      x1="5"
      y1="9"
      x2="17"
      y2="9"
      stroke={active ? "#FFF" : "#6B7280"}
      strokeWidth={1.6}
      strokeLinecap="round"
    />
    <Line
      x1="5"
      y1="13.5"
      x2="17"
      y2="13.5"
      stroke={active ? "#FFF" : "#6B7280"}
      strokeWidth={1.6}
      strokeLinecap="round"
    />
    <Circle cx="2" cy="4.5" r="1" fill={active ? "#FFF" : "#6B7280"} />
    <Circle cx="2" cy="9" r="1" fill={active ? "#FFF" : "#6B7280"} />
    <Circle cx="2" cy="13.5" r="1" fill={active ? "#FFF" : "#6B7280"} />
  </Svg>
);
const PlusIcon = ({ color = "#FFF" }: { color?: string }) => (
  <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
    <Path
      d="M7.5 2v11M2 7.5h11"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);
const EditIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path
      d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
      stroke="#FFF"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
      stroke="#FFF"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
const TrashIcon = ({ color = "#FFF" }: { color?: string }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Polyline
      points="3,6 5,6 21,6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
const XIcon = ({ color = "#6B7280" }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Path
      d="M13.5 4.5L4.5 13.5M4.5 4.5L13.5 13.5"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </Svg>
);
const ChevronDownIcon = ({ color = C.sub }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="M4 6l4 4 4-4"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
const ChevronLeft = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="M10 12L6 8l4-4"
      stroke={C.text}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
const ChevronRight2 = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="M6 4l4 4-4 4"
      stroke={C.text}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
const UploadIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
      stroke="#9CA3AF"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Polyline
      points="17,8 12,3 7,8"
      stroke="#9CA3AF"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 3v12"
      stroke="#9CA3AF"
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </Svg>
);
const RefreshIcon = ({ color = C.navy }: { color?: string }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path
      d="M1 4v6h6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M3.51 15a9 9 0 1 0 .49-4"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
const DownloadIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="M2 11v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2"
      stroke="#FFF"
      strokeWidth={1.6}
      strokeLinecap="round"
    />
    <Path
      d="M8 2v8M5 7l3 3 3-3"
      stroke="#FFF"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
const InfoIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke="#3B82F6" strokeWidth={1.6} />
    <Path
      d="M12 8v4M12 16h.01"
      stroke="#3B82F6"
      strokeWidth={1.6}
      strokeLinecap="round"
    />
  </Svg>
);
const LayersIcon = ({ color = C.navy }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
const CalendarIcon = () => (
  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
    <Rect
      x="3"
      y="4"
      width="18"
      height="18"
      rx="2"
      stroke="#9CA3AF"
      strokeWidth={1.6}
    />
    <Path
      d="M16 2v4M8 2v4M3 10h18"
      stroke="#9CA3AF"
      strokeWidth={1.6}
      strokeLinecap="round"
    />
  </Svg>
);
const TagIcon = () => (
  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01"
      stroke="#9CA3AF"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ─── Constants ────────────────────────────────────────────────────────────────
const GST_RATES = ["0%", "0.1%", "0.25%", "3%", "5%", "12%", "18%", "28%"];
const ITEMS_PER_PAGE = 9;

// ─── Types ────────────────────────────────────────────────────────────────────
interface Material {
  id: string;
  name: string;
  hsn: string;
  slabs: { min: string; max: string; gst: string }[];
}
interface Subcategory {
  id: number;
  categoryId: number;
  subcategoryName: string;
  subcategoryImage?: string;
  mobileImage?: string;
  materialSlabs?: string;
  weightSlabs?: string;
  gstPercentage?: number;
  status: boolean;
  createdAt?: string;
  sellerId?: number;
  // UI-specific fields
  mainCat?: string;
  category?: string;
  name?: string;
  materials?: Material[];
  created?: string;
  image?: string;
  // For UI compatibility
  statusText?: "Active" | "Inactive";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);

// ─── Simple Dropdown ─────────────────────────────────────────────────────────────
const Dropdown = ({
  value,
  placeholder,
  options,
  onChange,
  style,
  bottomSheet = true,
}: {
  value: string;
  placeholder: string;
  options: string[] | { label: string; value: string }[];
  onChange: (v: string) => void;
  style?: any;
  bottomSheet?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [menuLayout, setMenuLayout] = useState({ x: 0, y: 0, width: 0 });
  const triggerRef = useRef<View>(null);

  // Handle both string options and object options with label/value
  const getOptionLabel = (opt: any) => typeof opt === 'string' ? opt : opt.label;
  const getOptionValue = (opt: any) => typeof opt === 'string' ? opt : opt.value;

  return (
    <View style={[S.ddWrap, style, open && { zIndex: 50 }]}>
      <TouchableOpacity
        ref={triggerRef as any}
        style={[S.ddTrigger, open && S.ddTriggerOpen]}
        onPress={() => {
          if (!open && triggerRef.current) {
            triggerRef.current.measure((x, y, width, height, pageX, pageY) => {
              setMenuLayout({ x: pageX, y: pageY + height, width });
              setOpen(true);
            });
          } else {
            setOpen(!open);
          }
        }}
      >
        <Text style={[S.ddVal, !value && S.ddPh]} numberOfLines={1}>
          {value ? getOptionLabel(options.find((o: any) => getOptionValue(o) === value) || value) : placeholder}
        </Text>
        <ChevronDownIcon color={open ? C.navy : C.sub} />
      </TouchableOpacity>

      {/* Portal modal so menu floats perfectly on both Web and Mobile without getting clipped by touch bounds */}
      <Modal
        visible={open}
        transparent
        animationType={isWeb ? "none" : (bottomSheet ? "slide" : "none")}
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          style={S.ddBackdrop}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        />
        <View
          style={[
            S.ddPortalMenu,
            isWeb ? {
              position: "absolute",
              top: menuLayout.y,
              left: menuLayout.x,
              width: menuLayout.width,
            } : bottomSheet ? {
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingBottom: 24,
              paddingTop: 8,
              maxHeight: "60%",
            } : {
              position: "absolute",
              top: menuLayout.y,
              left: menuLayout.x,
              width: menuLayout.width,
              minWidth: 180,
            },
          ]}
        >
          {!isWeb && bottomSheet && (
            <View style={{ marginBottom: 12, paddingHorizontal: 20, paddingTop: 4, flexDirection: "row", justifyContent: "center", alignItems: "center", position: "relative" }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "#D1D5DB" }} />
              <TouchableOpacity onPress={() => setOpen(false)} style={{ position: "absolute", right: 16, top: -4, padding: 8 }}>
                <XIcon color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          )}
          <ScrollView
            style={isWeb ? { maxHeight: 240 } : undefined}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {options.map((opt: any) => {
              const optValue = getOptionValue(opt);
              const optLabel = getOptionLabel(opt);
              return (
                <TouchableOpacity
                  key={optValue}
                  style={[
                    S.ddItem,
                    isWeb && value === optValue && S.ddItemActive,
                    isWeb && hovered === optValue && S.ddItemHovered,
                    !isWeb && { justifyContent: "flex-start" }
                  ]}
                  onPress={() => {
                    onChange(optValue);
                    setOpen(false);
                    setHovered(null);
                  }}
                  onPressIn={() => setHovered(optValue)}
                  onPressOut={() => setHovered(null)}
                >
                  {!isWeb && (
                    <View
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        borderWidth: 2,
                        borderColor: value === optValue ? C.primary : "#D1D5DB",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                      }}
                    >
                      {value === optValue && (
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary }} />
                      )}
                    </View>
                  )}
                  <Text
                    style={[S.ddItemText, value === optValue && S.ddItemTextActive, !isWeb && { flex: 1, color: value === optValue ? C.primary : C.text }]}
                    numberOfLines={1}
                  >
                    {optLabel}
                  </Text>
                  {isWeb && value === optValue && <View style={S.ddCheckDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

// ─── Material Row ─────────────────────────────────────────────────────────────
const MaterialBlock = ({
  mat,
  onChange,
  onRemove,
}: {
  mat: Material;
  onChange: (m: Material) => void;
  onRemove: () => void;
}) => {
  const addSlab = () =>
    onChange({ ...mat, slabs: [...mat.slabs, { min: "", max: "", gst: "" }] });
  const updateSlab = (i: number, field: string, val: string) => {
    const s = [...mat.slabs];
    s[i] = { ...s[i], [field]: val };
    onChange({ ...mat, slabs: s });
  };
  const removeSlab = (i: number) =>
    onChange({ ...mat, slabs: mat.slabs.filter((_, idx) => idx !== i) });

  return (
    <View style={S.matBlock}>
      <View style={S.matBlockHeader}>
        <Text style={S.matBlockLabel}>Material</Text>
        <TouchableOpacity style={S.removeMatBtn} onPress={onRemove}>
          <TrashIcon color={C.inactive} />
          <Text style={S.removeMatText}>Remove</Text>
        </TouchableOpacity>
      </View>
      <View style={S.matRow}>
        <TextInput
          style={[S.matInput, { flex: 1 }]}
          placeholder="e.g. Cotton, Synthetic"
          placeholderTextColor="#9CA3AF"
          value={mat.name}
          onChangeText={(v) => onChange({ ...mat, name: v })}
        />
        <TextInput
          style={[S.matInput, { flex: 1 }]}
          placeholder="HSN e.g. 61112000"
          placeholderTextColor="#9CA3AF"
          value={mat.hsn}
          onChangeText={(v) => onChange({ ...mat, hsn: v })}
        />
      </View>
      <Text style={S.slabLabel}>Price slabs for this material</Text>
      {mat.slabs.map((slab, i) => (
        <View key={i} style={S.slabRow}>
          <TextInput
            style={S.slabInput}
            placeholder="Min Price"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            value={slab.min}
            onChangeText={(v) => updateSlab(i, "min", v)}
          />
          <TextInput
            style={S.slabInput}
            placeholder="Max (Empty=∞)"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            value={slab.max}
            onChangeText={(v) => updateSlab(i, "max", v)}
          />
          <View style={S.slabGstWrap}>
            <Dropdown
              value={slab.gst}
              placeholder="GST%"
              options={GST_RATES}
              onChange={(v: string) => updateSlab(i, "gst", v)}
            />
          </View>
          <TouchableOpacity style={S.slabDelete} onPress={() => removeSlab(i)}>
            <TrashIcon />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity style={S.addSlabBtn} onPress={addSlab}>
        <PlusIcon color={C.navy} />
        <Text style={S.addSlabText}>Add slab</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Add Subcategory Modal ────────────────────────────────────────────────────
const AddModal = ({
  visible,
  onClose,
  onSave,
  isWeb,
  editData,
  mainCategories,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (d: any) => void;
  isWeb: boolean;
  editData?: Subcategory | null;
  mainCategories: CategoryRow[];
}) => {
  const [mainCategoryId, setMainCategoryId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [childCategories, setChildCategories] = useState<CategoryRow[]>([]);
  const [name, setName] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | Blob | null>(null);
  const [imageChanged, setImageChanged] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [status, setStatus] = useState("Active");

  const reset = () => {
    setMainCategoryId("");
    setCategoryId("");
    setChildCategories([]);
    setName("");
    setImage(null);
    setImageFile(null);
    setImageChanged(false);
    setMaterials([]);
    setStatus("Active");
  };

  const loadChildCategories = async (parentId: number) => {
    try {
      const children = await fetchChildCategories(parentId);
      setChildCategories(children);
    } catch {
      setChildCategories([]);
    }
  };

  useEffect(() => {
    if (visible) {
      if (editData) {
        const matchedMain = mainCategories.find((cat) => cat.categoryName === editData.mainCat);
        const mainId = matchedMain?.id?.toString() ?? "";
        setMainCategoryId(mainId);
        if (matchedMain?.id) {
          void loadChildCategories(matchedMain.id).then(() => {
            setCategoryId(editData.categoryId ? editData.categoryId.toString() : "");
          });
        } else {
          setCategoryId(editData.categoryId ? editData.categoryId.toString() : "");
        }
        setName(editData.subcategoryName || editData.name || "");
        setImage(
          pickCategoryImageUrl(editData, "subcategories") ||
            resolveCatalogMediaUrl(editData.subcategoryImage || editData.image || "", "subcategories") ||
            null
        );
        setImageFile(null);
        setImageChanged(false);
        setMaterials(editData.materials || []);
        setStatus(editData.statusText || (typeof editData.status === "boolean" ? (editData.status ? "Active" : "Inactive") : "Active"));
      } else {
        reset();
      }
    }
  }, [visible, editData, mainCategories]);

  const handleMainCategoryChange = (value: string) => {
    setMainCategoryId(value);
    setCategoryId("");
    setChildCategories([]);
    const parentId = Number(value);
    if (!Number.isNaN(parentId) && parentId > 0) {
      void loadChildCategories(parentId);
    }
  };

  const pickImage = async () => {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/jpeg,image/png,image/webp";
      input.onchange = (e: any) => {
        const file = e.target.files?.[0] as File | undefined;
        if (file) {
          setImageFile(file);
          setImageChanged(true);
          const r = new FileReader();
          r.onload = (ev) => setImage(ev.target?.result as string);
          r.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });
      if (!res.canceled) {
        const asset = res.assets[0];
        setImage(asset.uri);
        setImageChanged(true);
        try {
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          setImageFile(blob);
        } catch {
          setImageFile(null);
        }
      }
    }
  };

  const addMaterial = () =>
    setMaterials((prev) => [
      ...prev,
      { id: uid(), name: "", hsn: "", slabs: [] },
    ]);
  const updateMat = (id: string, m: Material) =>
    setMaterials((prev) => prev.map((x) => (x.id === id ? m : x)));
  const removeMat = (id: string) =>
    setMaterials((prev) => prev.filter((x) => x.id !== id));

  const handleSave = () => {
    if (!mainCategoryId) {
      Alert.alert("Required", "Please select a main category.");
      return;
    }
    if (!categoryId) {
      Alert.alert("Required", "Please select a category.");
      return;
    }
    if (!name.trim()) {
      Alert.alert("Required", "Please enter a subcategory name.");
      return;
    }
    onSave({
      id: editData?.id,
      categoryId: parseInt(categoryId, 10),
      name,
      image,
      imageFile,
      imageChanged,
      // Keep existing mobile image unless a dedicated mobile picker is added.
      mobileImage: undefined,
      materials,
      status,
    });
    reset();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isWeb ? "fade" : "slide"}
      onRequestClose={onClose}
    >
      <View style={S.modalOverlay}>
        <View style={[S.modalBox, isWeb ? S.modalBoxWeb : S.modalBoxMobile]}>
          {!isWeb && <View style={S.handle} />}
          {/* Header */}
          <View style={S.modalHeader}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <View style={S.modalIconWrap}>
                <LayersIcon color="#FFF" />
              </View>
              <Text style={S.modalTitle}>{editData ? "Edit Subcategory" : "Add Subcategory"}</Text>
            </View>
            <TouchableOpacity
              style={S.modalCloseBtn}
              onPress={() => {
                reset();
                onClose();
              }}
            >
              <XIcon color="#FFF" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={S.modalBody}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            contentContainerStyle={!isWeb ? { paddingBottom: 24 } : undefined}
          >
            {/* Main Category */}
            <View style={S.fg}>
              <Text style={S.fl}>
                Main Category <Text style={S.req}>*</Text>
              </Text>
              <Dropdown
                value={mainCategoryId}
                placeholder="-- Select Main Category --"
                options={mainCategories.map((cat) => ({
                  label: cat.categoryName,
                  value: cat.id.toString(),
                }))}
                onChange={handleMainCategoryChange}
              />
            </View>

            {/* Category */}
            <View style={S.fg}>
              <Text style={S.fl}>
                Category <Text style={S.req}>*</Text>
              </Text>
              <Dropdown
                value={categoryId}
                placeholder={mainCategoryId ? "-- Select Category --" : "Select main category first"}
                options={childCategories.map((cat) => ({
                  label: cat.categoryName,
                  value: cat.id.toString(),
                }))}
                onChange={(val: string) => setCategoryId(val)}
              />
              {/* HSN helper */}
              <View style={S.hsnNote}>
                <InfoIcon />
                <Text style={S.hsnNoteText}>
                  HSN segregation: Main Category (e.g. Kids Wear) → Category
                  (e.g. 4-digit: 6111, 6209) → Subcategory (e.g. 6–8 digit:
                  61112000 Cotton, 61113000 Synthetic). Select a category to add
                  subcategories under it. Use HSN codes for tax alignment.
                </Text>
              </View>
            </View>

            {/* Name */}
            <View style={S.fg}>
              <Text style={S.fl}>Subcategory Name</Text>
              <TextInput
                style={S.input}
                placeholder="e.g. Backpacks, Sneakers"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Image */}
            <View style={S.fg}>
              <Text style={S.fl}>
                Subcategory Image <Text style={S.hint}>(for header menu)</Text>
              </Text>
              <TouchableOpacity
                style={S.imgPicker}
                onPress={pickImage}
                activeOpacity={0.7}
              >
                {image ? (
                  <Image
                    source={{ uri: image }}
                    style={S.imgPreview}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={S.imgPickerInner}>
                    <UploadIcon />
                    <Text style={S.imgPickerTitle}>
                      Drag & drop image here or browse
                    </Text>
                    <Text style={S.imgPickerSub}>JPG, PNG · Max 2MB</Text>
                  </View>
                )}
              </TouchableOpacity>
              {image && (
                <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  <TouchableOpacity
                    onPress={pickImage}
                    style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.navyLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 }}
                  >
                    <RefreshIcon color={C.navy} />
                    <Text style={{ fontSize: 12, fontWeight: "600", color: C.navy }}>Retake</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setImage(null)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.inactiveLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 }}
                  >
                    <TrashIcon color={C.inactive} />
                    <Text style={{ fontSize: 12, fontWeight: "600", color: C.inactive }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Materials */}
            <View style={S.fg}>
              <View style={[S.matHeader, !isWeb && { flexWrap: "wrap", gap: 8 }]}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 7, flexShrink: 1 }}
                >
                  <TagIcon />
                  <Text style={[S.fl, { flexShrink: 1 }]}>Material type → HSN & Price Slabs</Text>
                </View>
                <TouchableOpacity style={S.addMatBtn} onPress={addMaterial}>
                  <PlusIcon color="#FFF" />
                  <Text style={S.addMatText}>Add Material</Text>
                </TouchableOpacity>
              </View>
              <Text style={S.hint2}>
                Add each material type (e.g. Cotton, Synthetic) with its HSN
                code and GST price slabs.
              </Text>
              {materials.map((mat) => (
                <MaterialBlock
                  key={mat.id}
                  mat={mat}
                  onChange={(m) => updateMat(mat.id, m)}
                  onRemove={() => removeMat(mat.id)}
                />
              ))}
              {materials.length === 0 && (
                <Text style={{ fontSize: 12, color: C.sub, marginTop: 4 }}>
                  No materials added yet. Click "Add Material" to start.
                </Text>
              )}
            </View>

            {/* Status */}
            <View style={S.fg}>
              <Text style={S.fl}>Status</Text>
              <Dropdown
                value={status}
                placeholder="Select Status"
                options={["Active", "Inactive"]}
                onChange={setStatus}
                bottomSheet={false}
              />
            </View>

            {/* Buttons — inline for mobile, footer for web */}
            {!isWeb && (
              <View style={[S.modalFooter, { borderTopWidth: 0, paddingHorizontal: 0, paddingTop: 16 }]}>
                <TouchableOpacity
                  style={S.cancelBtn}
                  onPress={() => {
                    reset();
                    onClose();
                  }}
                >
                  <Text style={S.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={S.saveBtn} onPress={handleSave}>
                  <Text style={S.saveText}>{editData ? "Update Subcategory" : "Save Subcategory"}</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Footer — web only */}
          {isWeb && (
          <View style={S.modalFooter}>
            <TouchableOpacity
              style={S.cancelBtn}
              onPress={() => {
                reset();
                onClose();
              }}
            >
              <Text style={S.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={S.saveBtn} onPress={handleSave}>
              <Text style={S.saveText}>{editData ? "Update Subcategory" : "Save Subcategory"}</Text>
            </TouchableOpacity>
          </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

// ─── Grid Card ────────────────────────────────────────────────────────────────
const GridCard = ({
  item,
  onEdit,
  onDelete,
}: {
  item: Subcategory;
  onEdit: () => void;
  onDelete: () => void;
}) => (
  <View style={S.card}>
    {/* Image */}
    <View style={S.cardImgWrap}>
      {item.image ? (
        <Image
          source={{ uri: item.image }}
          style={S.cardImg}
          resizeMode="cover"
        />
      ) : (
        <View style={S.cardImgPlaceholder}>
          <LayersIcon color={C.navy} />
        </View>
      )}
      <View
        style={[
          S.cardStatusPill,
          {
            backgroundColor:
              item.status === true ? C.activeLight : C.inactiveLight,
          },
        ]}
      >
        <Text
          style={[
            S.cardStatusText,
            { color: item.status === true ? C.active : C.inactive },
          ]}
        >
          {item.status === true ? "Active" : "Inactive"}
        </Text>
      </View>
    </View>

    <View style={S.cardBody}>
      {/* Breadcrumb */}
      <View style={S.breadcrumb}>
        <LayersIcon color={C.sub} />
        <Text style={S.breadcrumbText}>{item.mainCat}</Text>
        <Text style={S.breadcrumbSep}>›</Text>
        <Text style={S.breadcrumbText}>{item.category}</Text>
      </View>

      <Text style={S.cardName}>{item.name}</Text>

      {/* Materials - simple text display */}
      {item.materials && item.materials.length > 0 && (
        <Text style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
          {item.materials.map(m => m.name).join(", ")}
        </Text>
      )}

      {/* Footer */}
      <View style={S.cardFooter}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <CalendarIcon />
          <Text style={S.cardDate}>{item.created}</Text>
        </View>
        <View style={S.cardActions}>
          <TouchableOpacity style={S.editBtn} onPress={onEdit}>
            <EditIcon />
          </TouchableOpacity>
          <TouchableOpacity style={S.deleteBtn} onPress={onDelete}>
            <TrashIcon />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </View>
);

// ─── List Table ───────────────────────────────────────────────────────────────
const ListTable = ({
  items,
  onEdit,
  onDelete,
}: {
  items: Subcategory[];
  onEdit: (cat: Subcategory) => void;
  onDelete: (id: number) => void;
}) => (
  <View style={S.tableWrap}>
    {/* Header */}
    <View style={S.tHead}>
      <Text style={[S.th, S.cId]}>ID</Text>
      <Text style={[S.th, S.cImg]}>Image</Text>
      <Text style={[S.th, S.cMain]}>Main Category</Text>
      <Text style={[S.th, S.cCat]}>Category</Text>
      <Text style={[S.th, S.cName]}>Subcategory Name</Text>
      <Text style={[S.th, S.cMat]}>Materials</Text>
      <Text style={[S.th, S.cDate]}>Created Date</Text>
      <Text style={[S.th, S.cStatus]}>Status</Text>
      <Text style={[S.th, S.cAction, { textAlign: "center" }]}>Action</Text>
    </View>

    {items.map((item, idx) => (
      <View key={item.id} style={[S.tRow, idx % 2 === 1 && S.tRowAlt]}>
        {/* ID */}
        <View style={[S.cell, S.cId]}>
          <Text style={S.tdId}>{item.id}</Text>
        </View>
        {/* Image */}
        <View style={[S.cell, S.cImg]}>
          {item.image ? (
            <Image
              source={{ uri: item.image }}
              style={S.tableThumb}
              resizeMode="cover"
            />
          ) : (
            <View style={S.tableThumbPlaceholder}>
              <LayersIcon color={C.navy} />
            </View>
          )}
        </View>
        {/* Main Category */}
        <View style={[S.cell, S.cMain]}>
          <Text style={S.tdText}>{item.mainCat || "—"}</Text>
        </View>
        {/* Category */}
        <View style={[S.cell, S.cCat]}>
          <Text style={S.tdText}>{item.category || "—"}</Text>
        </View>
        {/* Subcategory Name */}
        <View style={[S.cell, S.cName]}>
          <Text style={S.tdBold}>{item.name}</Text>
        </View>
        {/* Materials */}
        <View style={[S.cell, S.cMat]}>
          <Text style={S.tdMat}>
            {item.materials?.map((m) => m.name).join(", ") || "—"}
          </Text>
        </View>
        {/* Created Date */}
        <View style={[S.cell, S.cDate]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <CalendarIcon />
            <Text style={S.tdDate}>{item.created}</Text>
          </View>
        </View>
        {/* Status */}
        <View style={[S.cell, S.cStatus]}>
          <View
            style={[
              S.statusBadge,
              {
                backgroundColor:
                  item.status === true ? C.activeLight : C.inactiveLight,
              },
            ]}
          >
            <View
              style={[
                S.statusDot,
                {
                  backgroundColor:
                    item.status === true ? C.active : C.inactive,
                },
              ]}
            />
            <Text
              style={[
                S.statusText,
                { color: item.status === true ? C.active : C.inactive },
              ]}
            >
              {item.status === true ? "Active" : "Inactive"}
            </Text>
          </View>
        </View>
        {/* Actions */}
        <View
          style={[
            S.cell,
            S.cAction,
            { flexDirection: "row", gap: 6, justifyContent: "center" },
          ]}
        >
          <TouchableOpacity style={S.editBtn} onPress={() => onEdit(item)}>
            <EditIcon />
          </TouchableOpacity>
          <TouchableOpacity
            style={S.deleteBtn}
            onPress={() => onDelete(item.id)}
          >
            <TrashIcon />
          </TouchableOpacity>
        </View>
      </View>
    ))}
  </View>
);

// ─── Mobile List Card ─────────────────────────────────────────────────────────
// Used only on mobile when view === "list"
const MobileListCard = ({
  item,
  onEdit,
  onDelete,
}: {
  item: Subcategory;
  onEdit: () => void;
  onDelete: () => void;
}) => (
  <View style={S.mlCard}>
    {/* Top: image + info */}
    <View style={S.mlCardTop}>
      <View style={S.mlThumb}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={S.mlThumbImg} resizeMode="cover" />
        ) : (
          <View style={S.mlThumbPlaceholder}>
            <LayersIcon color={C.navy} />
          </View>
        )}
      </View>
      <View style={S.mlInfo}>
        {/* Breadcrumb */}
        <View style={S.breadcrumb}>
          <LayersIcon color={C.sub} />
          <Text style={S.breadcrumbText} numberOfLines={1}>{item.mainCat}</Text>
          <Text style={S.breadcrumbSep}>›</Text>
          <Text style={S.breadcrumbText} numberOfLines={1}>{item.category}</Text>
        </View>
        {/* Name + ID */}
        <View style={S.mlNameRow}>
          <Text style={S.mlName} numberOfLines={2}>{item.name}</Text>
          <View style={S.mlIdBadge}>
            <Text style={S.mlIdText}>#{item.id}</Text>
          </View>
        </View>
      </View>
    </View>

    {/* Materials chips */}
    {item.materials && item.materials.length > 0 && (
      <View style={S.mlChips}>
        {item.materials.map((m, i) => (
          <View key={i} style={S.mlChip}>
            <Text style={S.mlChipText}>{m.name}</Text>
          </View>
        ))}
      </View>
    )}

    {/* Footer: date + status + actions */}
    <View style={S.mlFooter}>
      <View style={S.mlFooterLeft}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <CalendarIcon />
          <Text style={S.cardDate}>{item.created}</Text>
        </View>
        <View
          style={[
            S.statusBadge,
            { backgroundColor: item.status === true ? C.activeLight : C.inactiveLight },
          ]}
        >
          <View style={[S.statusDot, { backgroundColor: item.status === true ? C.active : C.inactive }]} />
          <Text style={[S.statusText, { color: item.status === true ? C.active : C.inactive }]}>
            {item.status === true ? "Active" : "Inactive"}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TouchableOpacity style={S.editBtn} onPress={onEdit}>
          <EditIcon />
        </TouchableOpacity>
        <TouchableOpacity style={S.deleteBtn} onPress={onDelete}>
          <TrashIcon />
        </TouchableOpacity>
      </View>
    </View>
  </View>
);



export default function Subcategories() {
  const { width } = useWindowDimensions();
  const isWeb = width >= 768;

  const [items, setItems] = useState<Subcategory[]>([]);
  const [mainCategories, setMainCategories] = useState<CategoryRow[]>([]);
  const [mainCatOptions, setMainCatOptions] = useState<string[]>(["All"]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [mainCatFilter, setMainCatFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  // Load subcategories and main categories on mount
  useEffect(() => {
    loadSubcategories();
    loadMainCategories();
  }, []);

  const loadSubcategories = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await fetchSubcategories();
      
      const mapped: Subcategory[] = data.map((row: SubcategoryRow) => {
        const materialSlabsValue = row.materialSlabs ?? row.material_slabs;
        const materials = parseMaterialSlabs(materialSlabsValue);
        const imageUrl = pickCategoryImageUrl(row, "subcategories");

        return {
          id: row.id,
          categoryId: row.categoryId,
          subcategoryName: row.subcategoryName,
          subcategoryImage: row.subcategoryImage,
          mobileImage: row.mobileImage,
          materialSlabs: materialSlabsValue,
          weightSlabs: row.weightSlabs ?? row.weight_slabs,
          gstPercentage: row.gstPercentage,
          status: row.status,
          statusText: row.status ? "Active" : "Inactive",
          createdAt: row.createdAt,
          sellerId: row.sellerId,
          mainCat: row.mainCat,
          category: row.category,
          name: row.subcategoryName,
          image: imageUrl || undefined,
          created: row.createdAt ? new Date(row.createdAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }) : "—",
          materials,
        };
      });
      
      setItems(mapped);
    } catch (error) {
      const message = getApiErrorMessage(error, "Failed to load subcategories.");
      setLoadError(message);
      console.error("Failed to load subcategories:", error);
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  const loadMainCategories = async () => {
    try {
      const data = await fetchMainCategories();
      setMainCategories(data);
      setMainCatOptions(["All", ...data.map((cat: any) => cat.categoryName)]);
    } catch (error) {
      console.error("Failed to load main categories:", error);
    }
  };

  const filtered = items.filter((i) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      (i.name && i.name.toLowerCase().includes(q)) ||
      (i.subcategoryName && i.subcategoryName.toLowerCase().includes(q));
    const matchCat = mainCatFilter === "All" || i.mainCat === mainCatFilter;
    return matchSearch && matchCat;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const [editCat, setEditCat] = useState<Subcategory | null>(null);

  const handleEdit = (cat: Subcategory) => {
    setEditCat(cat);
    setModalOpen(true);
  };

  const handleSave = async (data: any) => {
    try {
      let successMsg = "";
      const statusValue = data.status === "Active";
      const materialPayload = serializeMaterialSlabs(data.materials as MaterialSlab[]);
      const shouldUploadImage = Boolean(data.imageChanged && data.imageFile);
      // Prefer multipart upload for new files. For data-URL fallback (no File), send image string.
      const imagePayload =
        !shouldUploadImage && typeof data.image === "string" && data.image.startsWith("data:image/")
          ? data.image
          : undefined;

      if (data.id) {
        let saved = await updateSubcategory(
          data.id,
          data.categoryId,
          data.name,
          imagePayload,
          undefined,
          materialPayload,
          undefined,
          undefined,
          statusValue
        );
        if (shouldUploadImage) {
          saved = await uploadSubcategoryImages(data.id, data.imageFile);
        }
        const imageUrl = pickCategoryImageUrl(saved, "subcategories");
        setItems((prev) =>
          prev.map((c) =>
            c.id === data.id
              ? {
                  ...c,
                  ...data,
                  subcategoryName: saved.subcategoryName,
                  subcategoryImage: saved.subcategoryImage,
                  mobileImage: saved.mobileImage,
                  image: imageUrl || c.image,
                  status: saved.status,
                  statusText: saved.status ? "Active" : "Inactive",
                  materials: data.materials,
                }
              : c
          )
        );
        successMsg = "Subcategory updated successfully!";
      } else {
        let newRow = await createSubcategory(
          data.categoryId,
          data.name,
          imagePayload,
          undefined,
          materialPayload,
          undefined,
          undefined,
          statusValue
        );
        if (shouldUploadImage && newRow.id) {
          newRow = await uploadSubcategoryImages(newRow.id, data.imageFile);
        }
        const newCat: Subcategory = {
          id: newRow.id,
          categoryId: newRow.categoryId,
          subcategoryName: newRow.subcategoryName,
          subcategoryImage: newRow.subcategoryImage,
          mobileImage: newRow.mobileImage,
          materialSlabs: newRow.materialSlabs,
          weightSlabs: newRow.weightSlabs,
          gstPercentage: newRow.gstPercentage,
          status: newRow.status,
          statusText: newRow.status ? "Active" : "Inactive",
          createdAt: newRow.createdAt,
          sellerId: newRow.sellerId,
          mainCat: newRow.mainCat,
          category: newRow.category,
          name: newRow.subcategoryName,
          image: pickCategoryImageUrl(newRow, "subcategories") || undefined,
          created: newRow.createdAt ? new Date(newRow.createdAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }) : new Date().toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          materials: data.materials,
        };
        setItems((prev) => [newCat, ...prev]);
        setCurrentPage(1);
        successMsg = "Subcategory added successfully!";
      }
      setEditCat(null);
      await loadSubcategories();

      if (Platform.OS === "web") {
        setTimeout(() => {
          Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: successMsg,
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
          });
        }, 300);
      } else {
        Alert.alert("Success", successMsg);
      }
    } catch (error) {
      console.error("Failed to save subcategory:", error);
      Alert.alert("Error", "Failed to save subcategory. Please try again.");
    }
  };

  const handleDelete = async (id: number) => {
    const confirmDelete = async () => {
      try {
        await deleteSubcategory(id);
        setItems((prev) => prev.filter((i) => i.id !== id));
        if (Platform.OS === "web") {
          Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: "Subcategory deleted successfully!",
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
          });
        } else {
          Alert.alert("Success", "Subcategory deleted successfully!");
        }
      } catch (error) {
        console.error("Failed to delete subcategory:", error);
        Alert.alert("Error", "Failed to delete subcategory. Please try again.");
      }
    };

    if (Platform.OS === "web") {
      Swal.fire({
        title: "Are you sure?",
        text: `You won't be able to revert this!`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#151D4F",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, delete it!"
      }).then((result) => {
        if (result.isConfirmed) {
          confirmDelete();
        }
      });
    } else {
      Alert.alert("Delete", "Delete this subcategory?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: confirmDelete },
      ]);
    }
  };

  const handleExport = () => {
    if (Platform.OS !== "web") {
      Alert.alert("Export", "CSV export is supported on web.");
      return;
    }
    const headers = ["ID", "Main Category", "Category", "Subcategory", "Materials", "Status", "Created"];
    const escape = (val: string | number) => {
      const s = String(val ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = filtered.map((item) => [
      item.id,
      item.mainCat ?? "",
      item.category ?? "",
      item.name ?? item.subcategoryName ?? "",
      item.materials?.map((m) => m.name).join("; ") ?? "",
      item.status ? "Active" : "Inactive",
      item.created ?? "",
    ].map(escape).join(","));
    const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `subcategories_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <ScrollView
        style={S.root}
        contentContainerStyle={S.rootContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={[S.pageHeader, !isWeb && { paddingVertical: 12, marginBottom: 14 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: !isWeb ? 8 : 12, flex: 1, flexShrink: 1 }}>
            <View style={[S.pageIconWrap, !isWeb && { width: 36, height: 36, borderRadius: 9 }]}>
              <LayersIcon color="#FFF" />
            </View>
            <View style={{ flex: 1, flexShrink: 1 }}>
              <Text style={[S.pageTitle, !isWeb && { fontSize: 17 }]}>Subcategories</Text>
              <Text style={[S.pageSub, !isWeb && { fontSize: 11 }]}>Manage product subcategories</Text>
            </View>
          </View>
          <TouchableOpacity style={[S.exportBtn, !isWeb && { paddingHorizontal: 12, paddingVertical: 10, gap: 0 }]} onPress={handleExport}>
            <DownloadIcon />
            {isWeb && <Text style={S.exportText}>Export CSV</Text>}
          </TouchableOpacity>
        </View>

        {loadError ? (
          <View style={{ marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 8, backgroundColor: "#FEF2F2" }}>
            <Text style={{ color: "#DC2626", fontSize: 13 }}>{loadError}</Text>
            <TouchableOpacity onPress={() => void loadSubcategories()} style={{ marginTop: 8 }}>
              <Text style={{ color: "#1E3A5F", fontWeight: "600", fontSize: 13 }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── Toolbar ── */}
        <View style={S.toolbar}>
          {/* Search */}
          <View style={S.searchBox}>
            <SearchIcon />
            <TextInput
              style={S.searchInput}
              placeholder="Search subcategories"
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={(t) => {
                setSearch(t);
                setCurrentPage(1);
              }}
            />
          </View>
          <View style={[S.toolbarRight, !isWeb && { width: "100%", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: !isWeb ? 1 : undefined, marginRight: !isWeb ? 8 : 0 }}>
              {/* View Toggle */}
              <View style={S.viewToggle}>
                <TouchableOpacity
                  style={[S.vtBtn, view === "grid" && S.vtBtnActive]}
                  onPress={() => setView("grid")}
                >
                  <GridIcon active={view === "grid"} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[S.vtBtn, view === "list" && S.vtBtnActive]}
                  onPress={() => setView("list")}
                >
                  <ListIcon active={view === "list"} />
                </TouchableOpacity>
              </View>
              {/* Main Category Filter */}
              <View style={{ width: isWeb ? 180 : undefined, flex: !isWeb ? 1 : undefined }}>
                <Dropdown
                  value={mainCatFilter === "All" ? "" : mainCatFilter}
                  placeholder="Main Category"
                  options={mainCatOptions}
                  onChange={(v: string | undefined) => {
                    setMainCatFilter(v || "All");
                    setCurrentPage(1);
                  }}
                />
              </View>
            </View>
            {/* Add Button */}
            <TouchableOpacity
              style={[S.addBtn, !isWeb && { paddingHorizontal: 10, gap: 4 }]}
              onPress={() => setModalOpen(true)}
            >
              <PlusIcon />
              <Text style={S.addBtnText}>
                {isWeb ? "Add Subcategory" : "Add"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Count ── */}
        {/* <Text style={S.countText}>
          Showing {paginated.length} of {filtered.length} subcategories
        </Text> */}

        {/* ── Content ── */}
        {view === "grid" ? (
          <View style={[S.grid, isWeb && S.gridWeb]}>
            {paginated.map((item) => (
              <View
                key={item.id}
                style={
                  width >= 1024
                    ? { flexBasis: "31%", flexGrow: 1, flexShrink: 1, minWidth: 200, maxWidth: "33%" }
                    : width >= 768
                    ? { flexBasis: "47%", flexGrow: 1, flexShrink: 1, minWidth: 240, maxWidth: "49%" }
                    : S.gridCardWrapperMobile
                }
              >
                <GridCard
                  item={item}
                  onEdit={() => handleEdit(item)}
                  onDelete={() => handleDelete(item.id)}
                />
              </View>
            ))}
          </View>
        ) : isWeb ? (
          <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: "100%" }} contentContainerStyle={{ minWidth: "100%" }}>
            <ListTable items={paginated} onEdit={handleEdit} onDelete={handleDelete} />
          </ScrollView>
        ) : (
          // Mobile list view: responsive card layout, no horizontal scroll
          <View style={S.mlList}>
            {paginated.map((item) => (
              <MobileListCard
                key={item.id}
                item={item}
                onEdit={() => handleEdit(item)}
                onDelete={() => handleDelete(item.id)}
              />
            ))}
          </View>
        )}

        {filtered.length === 0 && (
          <View style={S.empty}>
            <LayersIcon color="#D1D5DB" />
            <Text style={S.emptyTitle}>No subcategories found</Text>
            <Text style={S.emptySub}>
              Try adjusting filters or add a new subcategory
            </Text>
          </View>
        )}

        {/* ── Pagination ── */}
        {filtered.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(filtered.length / ITEMS_PER_PAGE)}
            totalItems={filtered.length}
            itemsPerPage={ITEMS_PER_PAGE}
            itemName="subcategories"
            onPageChange={setCurrentPage}
          />
        )}
      </ScrollView>

      <AddModal
        visible={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditCat(null);
        }}
        onSave={handleSave}
        isWeb={isWeb}
        editData={editCat}
        mainCategories={mainCategories}
      />
    </AdminLayout>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  rootContent: { padding: 20, paddingBottom: 48 },

  // Header
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.navy,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 18,
  },
  pageIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFF",
    letterSpacing: -0.3,
  },
  pageSub: { fontSize: 12, color: "rgba(255,255,255,0.90)", marginTop: 1, flexShrink: 1 },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.primary,
    borderRadius: 9,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  exportText: { fontSize: 13, fontWeight: "700", color: "#FFF" },

  // Toolbar
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
    flexWrap: "wrap",
    width: "100%",
  },
  searchBox: {
    flex: 1,
    minWidth: 180,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: C.text,
    outlineStyle: "none",
  } as any,
  toolbarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
    flexWrap: "wrap",
  },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: C.navyLight,
    borderRadius: 10,
    padding: 3,
  },
  vtBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  vtBtnActive: { backgroundColor: C.navy },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.navy,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 42,
  },
  addBtnText: { fontSize: 13, fontWeight: "700", color: "#FFF" },
  countText: { fontSize: 13, color: C.sub, marginBottom: 14 },

  // Grid
  grid: { flexDirection: "column", gap: 14 },
  gridWeb: { flexDirection: "row", flexWrap: "wrap", gap: 16 },

  // Grid Card Wrapper - controls width on web
  gridCardWrapper: {
    flexBasis: "31%",
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 260,
    maxWidth: "33%",
  },
  gridCardWrapperMobile: {
    width: "100%",
  },

  // Card
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    width: "100%",
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImgWrap: {
    position: "relative",
    height: 200,
    backgroundColor: C.navyLight,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    overflow: "hidden",
  },
  cardImg: { width: "100%", height: "100%" },
  cardImgPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardStatusPill: {
    position: "absolute",
    top: 10,
    right: 10,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cardStatusText: { fontSize: 11, fontWeight: "700" },
  cardBody: { padding: 14, gap: 8 },
  breadcrumb: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap", flexShrink: 1 },
  breadcrumbText: { fontSize: 11, color: C.sub, fontWeight: "500", flexShrink: 1 },
  breadcrumbSep: { fontSize: 11, color: C.sub },
  cardName: { fontSize: 16, fontWeight: "700", color: C.text },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  matChip: {
    backgroundColor: C.matChip,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  matChipText: { fontSize: 11, fontWeight: "600", color: C.matChipText },
  gstChipStyle: {
    backgroundColor: C.gstChip,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  gstChipText: { fontSize: 11, fontWeight: "600", color: C.gstChipText },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  cardDate: { fontSize: 12, color: C.sub },
  cardActions: { flexDirection: "row", gap: 6 },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: C.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: C.inactive,
    alignItems: "center",
    justifyContent: "center",
  },

  // Table
  tableWrap: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    width: "100%",
    minWidth: 920,
    overflow: "hidden",
  },
  tHead: {
    flexDirection: "row",
    backgroundColor: C.navy,
    width: "100%",
    borderBottomWidth: 0,
  },
  th: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 11,
    fontWeight: "700",
    color: "#FFF",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  tRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    alignItems: "center",
    minHeight: 72,
    width: "100%",
    backgroundColor: C.surface,
  },
  tRowAlt: { backgroundColor: C.rowAlt },
  cell: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  cId: { width: 56 },
  cImg: { width: 70 },
  cMain: { flex: 1, minWidth: 110 },
  cCat: { flex: 1, minWidth: 100 },
  cName: { flex: 1.2, minWidth: 120 },
  cMat: { flex: 2, minWidth: 160 },
  cDate: { flex: 1, minWidth: 110 },
  cStatus: { flex: 1, minWidth: 90 },
  cAction: { width: 90 },
  tdId: { fontSize: 14, fontWeight: "700", color: C.sub },
  tdText: { fontSize: 14, color: C.text },
  tdBold: { fontSize: 14, fontWeight: "600", color: C.text },
  tdMat: { fontSize: 12, color: C.matChipText },
  tdDate: { fontSize: 12, color: C.sub },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: "600" },

  // Pagination
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 24,
  },
  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  pageBtnActive: { backgroundColor: C.navy, borderColor: C.navy },
  pageBtnOff: { opacity: 0.35 },
  pageBtnText: { fontSize: 13, fontWeight: "600", color: C.text },
  pageBtnTextActive: { color: "#FFF" },

  // Empty
  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: C.text, marginTop: 8 },
  emptySub: { fontSize: 13, color: C.sub },

  // Mobile List Card
  mlList: { gap: 12 },
  mlCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 12,
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  mlCardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  mlThumb: {
    width: 68,
    height: 68,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: C.navyLight,
    flexShrink: 0,
  },
  mlThumbImg: { width: "100%", height: "100%" },
  mlThumbPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mlInfo: { flex: 1, gap: 6 },
  mlNameRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  mlName: { fontSize: 15, fontWeight: "700", color: C.text, flex: 1 },
  mlIdBadge: {
    backgroundColor: C.navy,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    flexShrink: 0,
  },
  mlIdText: { fontSize: 11, fontWeight: "700", color: "#FFF" },
  mlChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  mlChip: {
    backgroundColor: C.matChip,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  mlChipText: { fontSize: 11, fontWeight: "600", color: C.matChipText },
  mlFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 10,
  },
  mlFooterLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, flexWrap: "wrap" },

  // Table
  tableThumb: { width: 46, height: 46, borderRadius: 8 },
  tableThumbPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: C.navyLight,
    alignItems: "center",
    justifyContent: "center",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  modalBox: { backgroundColor: C.surface, width: "100%" },
  modalBoxWeb: {
    width: 580,
    maxHeight: "90%",
    borderRadius: 18,
    alignSelf: "center",
    position: "absolute",
    top: "4%",
  },
  modalBoxMobile: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: "93%",
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#D1D5DB",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.15)",
    backgroundColor: C.navy,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  modalIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#FFF" },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 8 },

  // Form
  fg: { marginBottom: 18 },
  fl: { fontSize: 13, fontWeight: "700", color: C.text, marginBottom: 6 },
  req: { color: C.inactive },
  hint: { fontSize: 12, fontWeight: "400", color: C.sub },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: C.text,
    outlineStyle: "none",
  } as any,

  // HSN note
  hsnNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    backgroundColor: "#EFF6FF",
    borderRadius: 9,
    padding: 11,
    marginTop: 8,
  },
  hsnNoteText: { fontSize: 12, color: "#1D4ED8", flex: 1, lineHeight: 18 },

  // Image picker
  imgPicker: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderStyle: "dashed",
    borderRadius: 12,
    overflow: "hidden",
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  imgPickerInner: { alignItems: "center", gap: 6, padding: 20 },
  imgPickerTitle: { fontSize: 13, fontWeight: "600", color: C.text },
  imgPickerSub: { fontSize: 11, color: C.sub },
  imgPreview: { width: "100%", height: 150 },

  // Materials
  matHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  addMatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.primary,
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  addMatText: { fontSize: 12, fontWeight: "700", color: "#FFF" },
  hint2: { fontSize: 12, color: C.sub, marginBottom: 10 },
  matBlock: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 10,
  },
  matBlockHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  matBlockLabel: { fontSize: 13, fontWeight: "700", color: C.text },
  removeMatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.inactiveLight,
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  removeMatText: { fontSize: 12, fontWeight: "600", color: C.inactive },
  matRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  matInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: C.text,
    outlineStyle: "none",
  } as any,
  slabLabel: { fontSize: 12, fontWeight: "600", color: C.sub, marginBottom: 8 },
  slabRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    marginBottom: 8,
  },
  slabInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 13,
    color: C.text,
    outlineStyle: "none",
  } as any,
  slabGstWrap: { width: 90 },
  slabDelete: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: C.inactive,
    alignItems: "center",
    justifyContent: "center",
  },
  addSlabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: "flex-start",
  },
  addSlabText: { fontSize: 12, fontWeight: "600", color: C.navy },

  ddWrap: { position: "relative", zIndex: 10, width: "100%" },
  ddTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  ddTriggerOpen: { borderColor: C.navy },
  ddVal: { fontSize: 14, color: C.text, flex: 1 },
  ddPh: { color: "#9CA3AF" },
  ddMenu: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 20,
  },
  ddItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EBE4",
  },
  ddItemActive: { backgroundColor: C.navyLight },
  ddItemText: { fontSize: 14, color: C.text },
  ddItemTextActive: { color: C.navy, fontWeight: "700" },
  ddCheckDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.navy },
  ddPortalMenu: {
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 20,
    overflow: "hidden",
  },
  ddBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  ddItemHovered: { backgroundColor: C.primaryLight },

  // Modal footer
  modalFooter: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surface,
  },
  cancelText: { fontSize: 14, fontWeight: "700", color: C.sub },
  saveBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.navy,
  },
  saveText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
});
