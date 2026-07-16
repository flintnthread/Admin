import AdminLayout from "@/components/admin-layout";
import Pagination from "@/components/Pagination";
import { pickCategoryImageUrl } from "@/lib/api/categoryMedia";
import { getApiErrorMessage } from "@/lib/api/client";
import { sweetCrud, sweetError, sweetWarning } from "@/lib/sweetAlert";
import {
  createMainCategory,
  createSubcategory,
  deleteCategory,
  fetchMainCategories,
  fetchSubcategories,
  updateCategory,
  uploadCategoryImages,
  type CategoryRow
} from "@/services/categoryApi";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useState } from "react";
import {
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
      stroke={active ? "#FFFFFF" : "#6B7280"}
      strokeWidth={1.6}
    />
    <Rect
      x="10.5"
      y="1"
      width="6.5"
      height="6.5"
      rx="1.5"
      stroke={active ? "#FFFFFF" : "#6B7280"}
      strokeWidth={1.6}
    />
    <Rect
      x="1"
      y="10.5"
      width="6.5"
      height="6.5"
      rx="1.5"
      stroke={active ? "#FFFFFF" : "#6B7280"}
      strokeWidth={1.6}
    />
    <Rect
      x="10.5"
      y="10.5"
      width="6.5"
      height="6.5"
      rx="1.5"
      stroke={active ? "#FFFFFF" : "#6B7280"}
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
      stroke={active ? "#FFFFFF" : "#6B7280"}
      strokeWidth={1.6}
      strokeLinecap="round"
    />
    <Line
      x1="5"
      y1="9"
      x2="17"
      y2="9"
      stroke={active ? "#FFFFFF" : "#6B7280"}
      strokeWidth={1.6}
      strokeLinecap="round"
    />
    <Line
      x1="5"
      y1="13.5"
      x2="17"
      y2="13.5"
      stroke={active ? "#FFFFFF" : "#6B7280"}
      strokeWidth={1.6}
      strokeLinecap="round"
    />
    <Circle cx="2" cy="4.5" r="1" fill={active ? "#FFFFFF" : "#6B7280"} />
    <Circle cx="2" cy="9" r="1" fill={active ? "#FFFFFF" : "#6B7280"} />
    <Circle cx="2" cy="13.5" r="1" fill={active ? "#FFFFFF" : "#6B7280"} />
  </Svg>
);

const PlusIcon = ({ color = "#FFFFFF" }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="M8 2v12M2 8h12"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

const EditIcon = ({ color = "#FFFFFF" }: { color?: string }) => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
    <Path
      d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const TrashIcon = ({ color = "#FFFFFF" }: { color?: string }) => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
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

const UploadIcon = () => (
  <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
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

const ChevronDownIcon = ({ color = "#374151" }: { color?: string }) => (
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

const ChevronLeftIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="M10 12L6 8l4-4"
      stroke="#374151"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ChevronRightIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="M6 4l4 4-4 4"
      stroke="#374151"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const LayersIcon = ({ color = "#1d324e" }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const HsnIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01"
      stroke="#ef7b1a"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const GstIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"
      stroke="#151D4F"
      strokeWidth={1.8}
    />
    <Path
      d="M15 9l-6 6M9 9h.01M15 15h.01"
      stroke="#151D4F"
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

const CalendarIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
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

const FolderIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path
      d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
      stroke="#F97316"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const WarningIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path
      d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
      stroke="#EF4444"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 9v4M12 17h.01"
      stroke="#EF4444"
      strokeWidth={1.6}
      strokeLinecap="round"
    />
  </Svg>
);

const InfoIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke="#ef7b1a" strokeWidth={1.6} />
    <Path
      d="M12 8v4M12 16h.01"
      stroke="#ef7b1a"
      strokeWidth={1.6}
      strokeLinecap="round"
    />
  </Svg>
);

// ─── Design Tokens ───────────────────────────────────────────────────────────

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
  hsnBg: "#FFF0EA",
  hsnText: "#ef7b1a",
  gstBg: "#e8ecf2",
  gstText: "#151D4F",
  rowAlt: "#FDFAF7",
  tableHead: "#151D4F",
  tableHeadText: "#FFFFFF",
};

// ─── Constants ────────────────────────────────────────────────────────────────

const GST_RATES = [
  "0% (Exempt/Nil rated)",
  "0.1% (Special rate)",
  "0.25% (Special rate)",
  "3% (Special rate)",
  "5% (Standard rate)",
  "12% (Standard rate)",
  "18% (Standard rate)",
  "28% (Luxury rate)",
];


const ITEMS_PER_PAGE = 8;

// ─── Types ──────────────────────────────────────────────────────────────

interface Category {
  id: number;
  name: string;
  type: "Main Category" | "Category";
  parent?: string;
  parentId?: number | null;
  hsn: string;
  gst: string;
  created: string;
  status: "Active" | "Inactive";
  image?: string;
}

const SAMPLE_CATEGORIES: Category[] = [
  {
    id: 1,
    name: "Accessories",
    type: "Main Category",
    hsn: "4202",
    gst: "12.00%",
    created: "03 Nov, 2025",
    status: "Active",
    image:
      "https://images.unsplash.com/photo-1523779917675-b6ed3a42a561?w=200&h=200&fit=crop",
  },
  {
    id: 2,
    name: "Bags",
    type: "Category",
    parent: "Accessories",
    hsn: "HSN-4CC36DB6",
    gst: "18.00%",
    created: "16 Nov, 2025",
    status: "Active",
    image:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200&h=200&fit=crop",
  },
  {
    id: 3,
    name: "Jewellery",
    type: "Category",
    parent: "Accessories",
    hsn: "HSN-A5AEE672",
    gst: "5.00%",
    created: "16 Nov, 2025",
    status: "Active",
    image:
      "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200&h=200&fit=crop",
  },
  {
    id: 4,
    name: "Watches",
    type: "Category",
    parent: "Accessories",
    hsn: "HSN-5B411A96",
    gst: "5.00%",
    created: "16 Nov, 2025",
    status: "Active",
    image:
      "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=200&h=200&fit=crop",
  },
  {
    id: 5,
    name: "Women",
    type: "Main Category",
    hsn: "6204",
    gst: "5.00%",
    created: "03 Nov, 2025",
    status: "Active",
    image:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&h=200&fit=crop",
  },
  {
    id: 6,
    name: "Men",
    type: "Main Category",
    hsn: "6203",
    gst: "5.00%",
    created: "03 Nov, 2025",
    status: "Active",
    image:
      "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=200&h=200&fit=crop",
  },
  {
    id: 7,
    name: "Footwear",
    type: "Main Category",
    hsn: "6401",
    gst: "18.00%",
    created: "04 Nov, 2025",
    status: "Active",
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop",
  },
  {
    id: 8,
    name: "Kids",
    type: "Main Category",
    hsn: "6111",
    gst: "5.00%",
    created: "05 Nov, 2025",
    status: "Inactive",
    image:
      "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=200&h=200&fit=crop",
  },
  {
    id: 9,
    name: "Beauty & Personal Care",
    type: "Main Category",
    hsn: "3304",
    gst: "18.00%",
    created: "06 Nov, 2025",
    status: "Active",
    image:
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&h=200&fit=crop",
  },
  {
    id: 10,
    name: "Sportswear",
    type: "Main Category",
    hsn: "6211",
    gst: "12.00%",
    created: "07 Nov, 2025",
    status: "Active",
    image:
      "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=200&h=200&fit=crop",
  },
];

// ─── Shared: Image Picker Field ───────────────────────────────────────────────

const ImagePickerField = ({
  image,
  onPick,
}: {
  image: string | null;
  onPick: (uri: string, file?: File | null) => void;
}) => {
  const handlePick = async () => {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/jpeg,image/png";
      input.onchange = (e: any) => {
        const file = e.target.files?.[0] as File | undefined;
        if (file) {
          if (file.size > 2 * 1024 * 1024) {
            void sweetWarning("Image too large", "Please choose an image under 2MB.");
            return;
          }
          const reader = new FileReader();
          reader.onload = (ev) => onPick(ev.target?.result as string, file);
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });
      if (!result.canceled) onPick(result.assets[0].uri, null);
    }
  };

  return (
    <TouchableOpacity
      style={styles.imagePickerBox}
      onPress={handlePick}
      activeOpacity={0.7}
    >
      {image ? (
        <Image
          source={{ uri: image }}
          style={styles.imagePreview}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.imagePickerInner}>
          <UploadIcon />
          <Text style={styles.imagePickerTitle}>Click to upload image</Text>
          <Text style={styles.imagePickerSub}>JPG, PNG (Max 2MB)</Text>
          <Text style={styles.imagePickerDim}>1600 × 1600 (no crop)</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ─── Shared: Custom Dropdown ──────────────────────────────────────────────────

const Dropdown = ({
  value,
  placeholder,
  options,
  onChange,
}: {
  value: string;
  placeholder: string;
  options: string[];
  onChange: (v: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.dropdownWrap}>
      <TouchableOpacity
        style={styles.dropdownTrigger}
        onPress={() => setOpen(!open)}
      >
        <Text
          style={[styles.dropdownValue, !value && styles.dropdownPlaceholder]}
        >
          {value || placeholder}
        </Text>
        <ChevronDownIcon color={open ? "#1E3A5F" : "#6B7280"} />
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdownMenu}>
          <ScrollView
            style={{ maxHeight: 200 }}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {options.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.dropdownItem,
                  value === opt && styles.dropdownItemActive,
                ]}
                onPress={() => {
                  onChange(opt);
                  setOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    value === opt && styles.dropdownItemTextActive,
                  ]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

// ─── Add Main Category Modal ──────────────────────────────────────────────────

const AddMainCategoryModal = ({ visible, onClose, onSave, isWeb, editData }: { visible: boolean; onClose: () => void; onSave: (data: any) => Promise<void>; isWeb: boolean; editData?: Category | null; }) => {
  const [name, setName] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageChanged, setImageChanged] = useState(false);
  const [hsn, setHsn] = useState("");
  const [gst, setGst] = useState("");
  const [status, setStatus] = useState("Active");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName("");
    setImage(null);
    setImageFile(null);
    setImageChanged(false);
    setHsn("");
    setGst("");
    setStatus("Active");
    setSaving(false);
  };

  React.useEffect(() => {
    if (visible) {
      if (editData) {
        setName(editData.name);
        setImage(editData.image || null);
        setImageFile(null);
        setImageChanged(false);
        setHsn(editData.hsn === "—" ? "" : editData.hsn);
        setGst(editData.gst === "—" ? "" : editData.gst);
        setStatus(editData.status);
      } else {
        reset();
      }
    }
  }, [visible, editData]);

  const handleSave = async () => {
    if (!name.trim()) {
      void sweetWarning("Required", "Please enter a category name.");
      return;
    }
    if (!editData && !image) {
      void sweetWarning("Required", "Please upload a category image.");
      return;
    }
    if (!gst) {
      void sweetWarning("Required", "Please select GST percentage.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        id: editData?.id,
        name: name.trim(),
        image,
        imageFile,
        imageChanged,
        hsn: hsn.trim(),
        gst,
        status,
        type: "Main Category",
      });
      reset();
      onClose();
    } catch {
      // Parent shows error toast
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isWeb ? "fade" : "slide"}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalBox,
            isWeb ? styles.modalBoxWeb : styles.modalBoxMobile,
          ]}
        >
          {!isWeb && <View style={styles.mobileHandle} />}

          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View style={styles.modalIconWrap}>
                <LayersIcon color="#FFFFFF" />
              </View>
              <Text style={styles.modalTitle}>{editData ? "Edit Main Category" : "Add Main Category"}</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                reset();
                onClose();
              }}
              style={styles.modalCloseBtn}
            >
              <XIcon color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {/* Name */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Main Category Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Electronics, Fashion"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Image */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>
                Category Image <Text style={styles.required}>* Required</Text>
              </Text>
              <Text style={styles.fieldHint}>
                1600 × 1600 (no crop) · JPG, PNG (Max 2MB)
              </Text>
              <ImagePickerField
                image={image}
                onPick={(uri, file) => {
                  setImage(uri);
                  setImageFile(file ?? null);
                  setImageChanged(true);
                }}
              />
              {image && (
                <TouchableOpacity
                  onPress={() => {
                    setImage(null);
                    setImageFile(null);
                    setImageChanged(true);
                  }}
                  style={styles.removeImg}
                >
                  <Text style={styles.removeImgText}>Remove image</Text>
                </TouchableOpacity>
              )}
              <View style={styles.infoNote}>
                <InfoIcon />
                <Text style={styles.infoText}>
                  Images will be resized to 1600×1600 without cropping.
                </Text>
              </View>
              <View style={styles.warnNote}>
                <WarningIcon />
                <Text style={styles.warnText}>
                  Uploading inappropriate images may result in legal action.
                </Text>
              </View>
            </View>

            {/* HSN */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>HSN Code</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 4202"
                placeholderTextColor="#9CA3AF"
                value={hsn}
                onChangeText={setHsn}
              />
              <Text style={styles.fieldHint}>
                Harmonized System of Nomenclature code (optional)
              </Text>
            </View>

            {/* GST */}
            <View style={[styles.formGroup, { zIndex: 30 }]}>
              <Text style={styles.fieldLabel}>
                GST Percentage (%){" "}
                <Text style={styles.required}>* Required</Text>
              </Text>
              <Dropdown
                value={gst}
                placeholder="-- Select GST Rate --"
                options={GST_RATES}
                onChange={setGst}
              />
            </View>

            {/* Status */}
            <View style={[styles.formGroup, { zIndex: 20 }]}>
              <Text style={styles.fieldLabel}>Status</Text>
              <Dropdown
                value={status}
                placeholder="Select Status"
                options={["Active", "Inactive"]}
                onChange={setStatus}
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                reset();
                onClose();
              }}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={() => void handleSave()} disabled={saving}>
              <Text style={styles.saveBtnText}>{saving ? "Saving..." : editData ? "Update Category" : "Save Category"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Add Category Modal ───────────────────────────────────────────────────────

const AddCategoryModal = ({
  visible,
  onClose,
  onSave,
  isWeb,
  editData,
  mainCategories,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  isWeb: boolean;
  editData?: Category | null;
  mainCategories: Category[];
}) => {
  const [mainCat, setMainCat] = useState("");
  const [name, setName] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageChanged, setImageChanged] = useState(false);
  const [hsn, setHsn] = useState("");
  const [gst, setGst] = useState("");
  const [status, setStatus] = useState("Active");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setMainCat("");
    setName("");
    setImage(null);
    setImageFile(null);
    setImageChanged(false);
    setHsn("");
    setGst("");
    setStatus("Active");
    setSaving(false);
  };

  React.useEffect(() => {
    if (visible) {
      if (editData) {
        setMainCat(editData.parent || "");
        setName(editData.name);
        setImage(editData.image || null);
        setImageFile(null);
        setImageChanged(false);
        setHsn(editData.hsn === "—" ? "" : editData.hsn);
        setGst(editData.gst === "—" ? "" : editData.gst);
        setStatus(editData.status);
      } else {
        reset();
      }
    }
  }, [visible, editData]);

  const handleSave = async () => {
    if (!mainCat) {
      void sweetWarning("Required", "Please select a main category.");
      return;
    }
    if (!name.trim()) {
      void sweetWarning("Required", "Please enter a category name.");
      return;
    }
    if (!gst) {
      void sweetWarning("Required", "Please select GST percentage.");
      return;
    }
    const selectedMain = mainCategories.find(c => c.name === mainCat);
    if (!selectedMain?.id) {
      void sweetWarning("Required", "Please select a valid main category.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        id: editData?.id,
        parentId: selectedMain.id,
        name: name.trim(),
        image,
        imageFile,
        imageChanged,
        hsn: hsn.trim(),
        gst,
        status,
        type: "Category",
        parent: mainCat,
      });
      reset();
      onClose();
    } catch {
      // Parent shows error toast
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isWeb ? "fade" : "slide"}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalBox,
            isWeb ? styles.modalBoxWeb : styles.modalBoxMobile,
          ]}
        >
          {!isWeb && <View style={styles.mobileHandle} />}

          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View
                style={[
                  styles.modalIconWrap,
                  { backgroundColor: "rgba(239,123,26,0.25)" },
                ]}
              >
                <FolderIcon />
              </View>
              <Text style={styles.modalTitle}>{editData ? "Edit Category" : "Add Category"}</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                reset();
                onClose();
              }}
              style={styles.modalCloseBtn}
            >
              <XIcon color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {/* Main Category */}
            <View style={[styles.formGroup, { zIndex: 40 }]}>
              <Text style={styles.fieldLabel}>
                Select Main Category{" "}
                <Text style={styles.required}>* Required</Text>
              </Text>
              <Dropdown
                value={mainCat}
                placeholder="-- Select Main Category --"
                options={mainCategories.map(c => c.name)}
                onChange={setMainCat}
              />
            </View>

            {/* Name */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Category Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Bags, Watches, Sneakers"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Image */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Category Image</Text>
              <Text style={styles.fieldHint}>
                1600 × 1600 (no crop) · JPG, PNG (Max 2MB)
              </Text>
              <ImagePickerField
                image={image}
                onPick={(uri, file) => {
                  setImage(uri);
                  setImageFile(file ?? null);
                  setImageChanged(true);
                }}
              />
              {image && (
                <TouchableOpacity
                  onPress={() => {
                    setImage(null);
                    setImageFile(null);
                    setImageChanged(true);
                  }}
                  style={styles.removeImg}
                >
                  <Text style={styles.removeImgText}>Remove image</Text>
                </TouchableOpacity>
              )}
              <View style={styles.infoNote}>
                <InfoIcon />
                <Text style={styles.infoText}>
                  Images will be resized to 1600×1600 without cropping.
                </Text>
              </View>
              <View style={styles.warnNote}>
                <WarningIcon />
                <Text style={styles.warnText}>
                  Uploading inappropriate images may result in legal action.
                </Text>
              </View>
            </View>

            {/* HSN */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>HSN Code</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. HSN-4CC36DB6"
                placeholderTextColor="#9CA3AF"
                value={hsn}
                onChangeText={setHsn}
              />
              <Text style={styles.fieldHint}>
                Harmonized System of Nomenclature code (optional)
              </Text>
            </View>

            {/* GST */}
            <View style={[styles.formGroup, { zIndex: 30 }]}>
              <Text style={styles.fieldLabel}>
                GST Percentage (%){" "}
                <Text style={styles.required}>* Required</Text>
              </Text>
              <Dropdown
                value={gst}
                placeholder="-- Select GST Rate --"
                options={GST_RATES}
                onChange={setGst}
              />
            </View>

            {/* Status */}
            <View style={[styles.formGroup, { zIndex: 20 }]}>
              <Text style={styles.fieldLabel}>Status</Text>
              <Dropdown
                value={status}
                placeholder="Select Status"
                options={["Active", "Inactive"]}
                onChange={setStatus}
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                reset();
                onClose();
              }}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: "#F97316" }, saving && { opacity: 0.7 }]}
              onPress={() => void handleSave()}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>{saving ? "Saving..." : editData ? "Update Category" : "Save Category"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Grid Card ────────────────────────────────────────────────────────────────
// ✅ UPDATED: date + actions in one row, no divider, no Platform.OS calc() hack

const GridCard = ({
  cat,
  onEdit,
  onDelete,
}: {
  cat: Category;
  onEdit: () => void;
  onDelete: () => void;
}) => (
  <View style={styles.gridCard}>
    {/* Image */}
    <View style={styles.gridCardImage}>
      {cat.image ? (
        <Image
          source={{ uri: cat.image }}
          style={styles.gridCardImg}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.gridCardImgPlaceholder}>
          <LayersIcon color={C.navy} />
        </View>
      )}
      {/* Status pill */}
      <View
        style={[
          styles.gridStatusPill,
          { backgroundColor: cat.status === "Active" ? "#DCFCE7" : "#FEE2E2" },
        ]}
      >
        <Text
          style={[
            styles.gridStatusText,
            { color: cat.status === "Active" ? "#16A34A" : "#DC2626" },
          ]}
        >
          {cat.status}
        </Text>
      </View>
    </View>

    <View style={styles.gridCardBody}>
      {/* S.No badge */}
      <View style={styles.snoRow}>
        <Text style={styles.gridCatName}>{cat.name}</Text>
        <View style={styles.snoBadge}>
          <Text style={styles.snoText}>S.No: {cat.id}</Text>
        </View>
      </View>

      {/* Type tag */}
      <View
        style={[
          styles.typeTag,
          cat.type === "Main Category" ? styles.typeTagMain : styles.typeTagSub,
        ]}
      >
        <Text
          style={[
            styles.typeTagText,
            cat.type === "Main Category"
              ? styles.typeTagTextMain
              : styles.typeTagTextSub,
          ]}
        >
          {cat.type === "Main Category"
            ? "⊟ Main Category"
            : `↳ Category under: ${cat.parent}`}
        </Text>
      </View>

      {/* HSN / GST */}
      <View style={styles.gridChips}>
        <View style={styles.hsnChip}>
          <HsnIcon />
          <Text style={styles.hsnChipText}>HSN: {cat.hsn}</Text>
        </View>
        <View style={styles.gstChip}>
          <GstIcon />
          <Text style={styles.gstChipText}>GST: {cat.gst}</Text>
        </View>
      </View>

      {/* ✅ Date + Actions in ONE row — no divider */}
      <View style={styles.gridCardFooter}>
        <View style={styles.dateRow}>
          <CalendarIcon />
          <Text style={styles.dateText}>{cat.created}</Text>
        </View>
        <View style={styles.gridCardActions}>
          <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
            <EditIcon />
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
            <TrashIcon />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </View>
);

// ─── List Table ───────────────────────────────────────────────────────────────

const ListTable = ({
  categories,
  onEdit,
  onDelete,
}: {
  categories: Category[];
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
}) => (
  <View style={styles.tableWrapper}>
    {/* Header */}
    <View style={styles.tableHeader}>
      <Text style={[styles.th, styles.colSno]}>S.No</Text>
      <Text style={[styles.th, styles.colImage]}>Image</Text>
      <Text style={[styles.th, styles.colName]}>Category Name</Text>
      <Text style={[styles.th, styles.colType]}>Type</Text>
      <Text style={[styles.th, styles.colHsn]}>HSN Code</Text>
      <Text style={[styles.th, styles.colGst]}>GST</Text>
      <Text style={[styles.th, styles.colDate]}>Created Date</Text>
      <Text style={[styles.th, styles.colStatus]}>Status</Text>
      <Text style={[styles.th, styles.colAction, { textAlign: "center" }]}>
        Action
      </Text>
    </View>

    {/* Rows */}
    {categories.map((cat, idx) => (
      <View
        key={cat.id}
        style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}
      >
        {/* S.No */}
        <View style={[styles.cell, styles.colSno]}>
          <Text style={styles.tdSno}>{cat.id}</Text>
        </View>
        {/* Image */}
        <View style={[styles.cell, styles.colImage]}>
          {cat.image ? (
            <Image
              source={{ uri: cat.image }}
              style={styles.tableThumb}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.tableThumbPlaceholder}>
              <LayersIcon color={C.navy} />
            </View>
          )}
        </View>
        {/* Name */}
        <View style={[styles.cell, styles.colName]}>
          <Text style={styles.tdName}>{cat.name}</Text>
        </View>
        {/* Type */}
        <View style={[styles.cell, styles.colType]}>
          <View
            style={[
              styles.typeTag,
              cat.type === "Main Category"
                ? styles.typeTagMain
                : styles.typeTagSub,
            ]}
          >
            <Text
              style={[
                styles.typeTagText,
                cat.type === "Main Category"
                  ? styles.typeTagTextMain
                  : styles.typeTagTextSub,
              ]}
            >
              {cat.type === "Main Category" ? "⊟ Main Category" : "↳ Category"}
            </Text>
          </View>
          {cat.parent && (
            <Text style={styles.tdParent}>under: {cat.parent}</Text>
          )}
        </View>
        {/* HSN */}
        <View style={[styles.cell, styles.colHsn]}>
          <View style={styles.hsnChip}>
            <HsnIcon />
            <Text style={styles.hsnChipText}>{cat.hsn}</Text>
          </View>
        </View>
        {/* GST */}
        <View style={[styles.cell, styles.colGst]}>
          <View style={styles.gstChip}>
            <GstIcon />
            <Text style={styles.gstChipText}>{cat.gst}</Text>
          </View>
        </View>
        {/* Created */}
        <View style={[styles.cell, styles.colDate]}>
          <Text style={styles.tdDate}>{cat.created}</Text>
        </View>
        {/* Status */}
        <View style={[styles.cell, styles.colStatus]}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  cat.status === "Active" ? "#DCFCE7" : "#FEE2E2",
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    cat.status === "Active" ? "#16A34A" : "#DC2626",
                },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: cat.status === "Active" ? "#16A34A" : "#DC2626" },
              ]}
            >
              {cat.status}
            </Text>
          </View>
        </View>
        {/* Actions */}
        <View
          style={[
            styles.cell,
            styles.colAction,
            { flexDirection: "row", gap: 6, justifyContent: "center", paddingRight: 16 },
          ]}
        >
          <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(cat)}>
            <EditIcon />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => onDelete(cat)}
          >
            <TrashIcon />
          </TouchableOpacity>
        </View>
      </View>
    ))}
  </View>
);

// ─── Mobile List Card ─────────────────────────────────────────────────────────
// Used only on mobile when viewMode === "list". Desktop uses ListTable above.

const MobileListCard = ({
  cat,
  onEdit,
  onDelete,
}: {
  cat: Category;
  onEdit: () => void;
  onDelete: () => void;
}) => (
  <View style={styles.mobileCard}>
    {/* Top row: image + main info */}
    <View style={styles.mobileCardTop}>
      {/* Thumbnail */}
      <View style={styles.mobileCardThumb}>
        {cat.image ? (
          <Image
            source={{ uri: cat.image }}
            style={styles.mobileCardImg}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.mobileCardImgPlaceholder}>
            <LayersIcon color={C.navy} />
          </View>
        )}
      </View>

      {/* Name + S.No + Type */}
      <View style={styles.mobileCardInfo}>
        <View style={styles.mobileCardNameRow}>
          <Text style={styles.mobileCardName} numberOfLines={2}>
            {cat.name}
          </Text>
          <View style={styles.snoBadge}>
            <Text style={styles.snoText}>#{cat.id}</Text>
          </View>
        </View>

        <View
          style={[
            styles.typeTag,
            cat.type === "Main Category" ? styles.typeTagMain : styles.typeTagSub,
          ]}
        >
          <Text
            style={[
              styles.typeTagText,
              cat.type === "Main Category"
                ? styles.typeTagTextMain
                : styles.typeTagTextSub,
            ]}
          >
            {cat.type === "Main Category"
              ? "⊟ Main Category"
              : `↳ ${cat.parent || "Category"}`}
          </Text>
        </View>
      </View>
    </View>

    {/* Chips row: HSN + GST */}
    <View style={styles.mobileCardChips}>
      <View style={styles.hsnChip}>
        <HsnIcon />
        <Text style={styles.hsnChipText}>HSN: {cat.hsn}</Text>
      </View>
      <View style={styles.gstChip}>
        <GstIcon />
        <Text style={styles.gstChipText}>GST: {cat.gst}</Text>
      </View>
    </View>

    {/* Footer: date + status + actions */}
    <View style={styles.mobileCardFooter}>
      <View style={styles.mobileCardFooterLeft}>
        <View style={styles.dateRow}>
          <CalendarIcon />
          <Text style={styles.dateText}>{cat.created}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: cat.status === "Active" ? "#DCFCE7" : "#FEE2E2" },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: cat.status === "Active" ? "#16A34A" : "#DC2626" },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: cat.status === "Active" ? "#16A34A" : "#DC2626" },
            ]}
          >
            {cat.status}
          </Text>
        </View>
      </View>

      <View style={styles.mobileCardActions}>
        <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
          <EditIcon />
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
          <TrashIcon />
        </TouchableOpacity>
      </View>
    </View>
  </View>
);




export default function MainCategories() {
  const { width } = useWindowDimensions();
  const isWeb = width >= 768;

  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [mainCatModalOpen, setMainCatModalOpen] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);

  // Fetch all categories (main + subcategories) from backend
  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const mainCats = await fetchMainCategories();
      const allCats: Category[] = mainCats.map((row: CategoryRow) => ({
        id: row.id,
        name: row.categoryName,
        type: "Main Category" as const,
        parentId: row.parentId,
        hsn: row.hsnCode || "—",
        gst: row.gstPercentage != null ? `${row.gstPercentage}%` : "—",
        created: row.createdAt ? new Date(row.createdAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }) : new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        status: row.status ? "Active" : "Inactive",
        image: pickCategoryImageUrl(row, "categories"),
      }));

      // Fetch subcategories for each main category
      for (const mainCat of mainCats) {
        const subCats = await fetchSubcategories(mainCat.id);
        subCats.forEach((row: CategoryRow) => {
          allCats.push({
            id: row.id,
            name: row.categoryName,
            type: "Category" as const,
            parentId: row.parentId,
            parent: mainCat.categoryName,
            hsn: row.hsnCode || "—",
            gst: row.gstPercentage != null ? `${row.gstPercentage}%` : "—",
            created: row.createdAt ? new Date(row.createdAt).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }) : new Date().toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
            status: row.status ? "Active" : "Inactive",
            image: pickCategoryImageUrl(row, "categories"),
          });
        });
      }

      setCategories(allCats);
    } catch (error) {
      const message = getApiErrorMessage(error, "Failed to load categories.");
      setLoadError(message);
      console.error("Failed to load categories:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const mainCategories = categories.filter(c => c.type === "Main Category");

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handleEdit = (cat: Category) => {
    setEditCat(cat);
    if (cat.type === "Main Category") {
      setMainCatModalOpen(true);
    } else {
      setCatModalOpen(true);
    }
  };

  const handleSave = async (data: any) => {
    const entityLabel = data.type === "Main Category" ? "Main category" : "Category";
    const isUpdate = !!data.id;
    if (isUpdate) {
      if (!(await sweetCrud.confirmUpdate(entityLabel, data.name))) {
        throw new Error("cancelled");
      }
    } else {
      if (!(await sweetCrud.confirmAdd(entityLabel, data.name))) {
        throw new Error("cancelled");
      }
    }
    try {
      const gstValue = data.gst ? parseFloat(String(data.gst).replace("%", "")) : undefined;
      const statusValue = data.status === "Active";
      const shouldUploadImage = Boolean(data.imageChanged && data.imageFile);
      // Prefer multipart upload for new files. For data-URL fallback (no File), send image string.
      const imagePayload =
        !shouldUploadImage && typeof data.image === "string" && data.image.startsWith("data:image/")
          ? data.image
          : undefined;

      if (data.id) {
        let saved = await updateCategory(
          data.id,
          data.name,
          data.hsn,
          gstValue,
          imagePayload,
          undefined,
          undefined,
          statusValue
        );
        if (shouldUploadImage) {
          saved = await uploadCategoryImages(data.id, data.imageFile);
        }
        const imageUrl = pickCategoryImageUrl(saved, "categories");
        setCategories((prev) =>
          prev.map((c) =>
            c.id === data.id
              ? {
                  ...c,
                  ...data,
                  name: saved.categoryName || data.name,
                  hsn: saved.hsnCode || data.hsn || "—",
                  gst: saved.gstPercentage != null ? `${saved.gstPercentage}%` : data.gst,
                  status: saved.status ? "Active" : "Inactive",
                  image: imageUrl || data.image || c.image,
                }
              : c
          )
        );
      } else {
        let newRow: CategoryRow;
        if (data.type === "Main Category") {
          newRow = await createMainCategory(
            data.name,
            data.hsn,
            gstValue,
            imagePayload,
            undefined,
            undefined,
            statusValue
          );
        } else {
          if (!data.parentId) {
            throw new Error("Please select a main category.");
          }
          newRow = await createSubcategory(
            data.parentId,
            data.name,
            data.hsn,
            gstValue,
            imagePayload,
            undefined,
            undefined,
            statusValue
          );
        }
        if (shouldUploadImage && newRow.id) {
          newRow = await uploadCategoryImages(newRow.id, data.imageFile);
        }
        const newCat: Category = {
          id: newRow.id,
          name: newRow.categoryName,
          type: data.type,
          parentId: newRow.parentId,
          parent: data.parent,
          hsn: newRow.hsnCode || "—",
          gst: newRow.gstPercentage != null ? `${newRow.gstPercentage}%` : "—",
          created: newRow.createdAt ? new Date(newRow.createdAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }) : new Date().toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          status: newRow.status ? "Active" : "Inactive",
          image: pickCategoryImageUrl(newRow, "categories") || data.image || undefined,
        };
        setCategories((prev) => [newCat, ...prev]);
        setCurrentPage(1);
      }
      setEditCat(null);
      if (isUpdate) {
        void sweetCrud.updated(entityLabel);
      } else {
        void sweetCrud.added(entityLabel);
      }
    } catch (error) {
      if (error instanceof Error && error.message === "cancelled") {
        throw error;
      }
      console.error("Failed to save category:", error);
      void sweetError("Error", getApiErrorMessage(error, "Failed to save category. Please try again."));
      throw error;
    }
  };

  const handleDelete = async (cat: Category) => {
    if (!(await sweetCrud.confirmDelete("Category", cat.name))) return;
    try {
      await deleteCategory(cat.id);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      void sweetCrud.deleted("Category");
    } catch (error) {
      console.error("Failed to delete category:", error);
      void sweetError("Error", "Failed to delete category. Please try again.");
    }
  };

  return (
    <AdminLayout>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.rootContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Page Header ── */}
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <View style={styles.pageIconWrap}>
              <LayersIcon color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, flexShrink: 1 }}>
              <Text style={styles.pageTitle}>Categories</Text>
              <Text style={styles.pageSubtitle}>
                Manage main categories and sub-categories
              </Text>
            </View>
          </View>
        </View>

        {loadError ? (
          <View style={{ marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 8, backgroundColor: "#FEF2F2" }}>
            <Text style={{ color: "#DC2626", fontSize: 13 }}>{loadError}</Text>
            <TouchableOpacity onPress={() => void loadCategories()} style={{ marginTop: 8 }}>
              <Text style={{ color: "#1E3A5F", fontWeight: "600", fontSize: 13 }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── Toolbar ── */}
        {!isWeb ? (
          <View style={{ gap: 10, marginBottom: 16 }}>
            {/* Row 1: Search & View Toggle */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={[styles.searchBox, { flex: 1, minWidth: 0 }]}>
                <SearchIcon />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search categories..."
                  placeholderTextColor="#9CA3AF"
                  value={search}
                  onChangeText={(t) => {
                    setSearch(t);
                    setCurrentPage(1);
                  }}
                />
              </View>
              <View style={styles.viewToggle}>
                <TouchableOpacity
                  style={[
                    styles.viewToggleBtn,
                    viewMode === "grid" && styles.viewToggleBtnActive,
                  ]}
                  onPress={() => setViewMode("grid")}
                >
                  <GridIcon active={viewMode === "grid"} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.viewToggleBtn,
                    viewMode === "list" && styles.viewToggleBtnActive,
                  ]}
                  onPress={() => setViewMode("list")}
                >
                  <ListIcon active={viewMode === "list"} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Row 2: Add Buttons */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <TouchableOpacity
                style={[styles.addMainBtn, { flex: 1, justifyContent: "center" }]}
                onPress={() => {
                  setEditCat(null);
                  setMainCatModalOpen(true);
                }}
              >
                <PlusIcon />
                <Text style={styles.addMainBtnText}>Main Cat</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.addCatBtn, { flex: 1, justifyContent: "center" }]}
                onPress={() => {
                  setEditCat(null);
                  setCatModalOpen(true);
                }}
              >
                <PlusIcon />
                <Text style={styles.addCatBtnText}>Category</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Desktop Toolbar */
          <View style={styles.toolbar}>
            {/* Search */}
            <View style={styles.searchBox}>
              <SearchIcon />
              <TextInput
                style={styles.searchInput}
                placeholder="Search categories..."
                placeholderTextColor="#9CA3AF"
                value={search}
                onChangeText={(t) => {
                  setSearch(t);
                  setCurrentPage(1);
                }}
              />
            </View>

            {/* Right side controls */}
            <View style={styles.toolbarRight}>
              {/* View Toggle */}
              <View style={styles.viewToggle}>
                <TouchableOpacity
                  style={[
                    styles.viewToggleBtn,
                    viewMode === "grid" && styles.viewToggleBtnActive,
                  ]}
                  onPress={() => setViewMode("grid")}
                >
                  <GridIcon active={viewMode === "grid"} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.viewToggleBtn,
                    viewMode === "list" && styles.viewToggleBtnActive,
                  ]}
                  onPress={() => setViewMode("list")}
                >
                  <ListIcon active={viewMode === "list"} />
                </TouchableOpacity>
              </View>

              {/* Add Buttons */}
              <TouchableOpacity
                style={styles.addMainBtn}
                onPress={() => {
                  setEditCat(null);
                  setMainCatModalOpen(true);
                }}
              >
                <PlusIcon />
                <Text style={styles.addMainBtnText}>Add Main Category</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addCatBtn}
                onPress={() => {
                  setEditCat(null);
                  setCatModalOpen(true);
                }}
              >
                <PlusIcon />
                <Text style={styles.addCatBtnText}>Add Category</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Content ── */}
        {viewMode === "grid" ? (
          // ✅ UPDATED: wrapper View per card handles responsive width
          <View
            style={[styles.gridContainer, isWeb && styles.gridContainerWeb]}
          >
            {paginated.map((cat) => (
              <View
                key={cat.id}
                style={
                  width >= 1024
                    ? { flexBasis: "31%", flexGrow: 1, flexShrink: 1, minWidth: 200, maxWidth: "33%" }
                    : width >= 768
                      ? { flexBasis: "47%", flexGrow: 1, flexShrink: 1, minWidth: 240, maxWidth: "49%" }
                      : styles.gridCardWrapperMobile
                }
              >
                <GridCard
                  cat={cat}
                  onEdit={() => handleEdit(cat)}
                  onDelete={() => handleDelete(cat)}
                />
              </View>
            ))}
          </View>
        ) : isWeb ? (
          <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: "100%" }} contentContainerStyle={{ minWidth: "100%" }}>
            <ListTable
              categories={paginated}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </ScrollView>
        ) : (
          // Mobile list view: card-based, no horizontal scrolling
          <View style={styles.mobileCardList}>
            {paginated.map((cat) => (
              <MobileListCard
                key={cat.id}
                cat={cat}
                onEdit={() => handleEdit(cat)}
                onDelete={() => handleDelete(cat)}
              />
            ))}
          </View>
        )}

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <LayersIcon />
            <Text style={styles.emptyTitle}>No categories found</Text>
            <Text style={styles.emptySubtitle}>
              Try a different search term or add a new category
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
            itemName="categories"
            onPageChange={setCurrentPage}
          />
        )}
      </ScrollView>

      <AddMainCategoryModal
        visible={mainCatModalOpen}
        onClose={() => {
          setMainCatModalOpen(false);
          setEditCat(null);
        }}
        onSave={handleSave}
        isWeb={isWeb}
        editData={editCat}
      />
      <AddCategoryModal
        visible={catModalOpen}
        onClose={() => {
          setCatModalOpen(false);
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  rootContent: { padding: 20, paddingBottom: 48 },

  // ── Page Header (navy banner) ─────────────────────────────────────────────
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    backgroundColor: C.navy,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
  },
  pageHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1, flexShrink: 1 },
  pageIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  pageSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.90)", marginTop: 2, flexShrink: 1, flexWrap: "wrap" },

  // ── Toolbar ───────────────────────────────────────────────────────────────
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
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
  },

  // View Toggle
  viewToggle: {
    flexDirection: "row",
    backgroundColor: C.navyLight,
    borderRadius: 10,
    padding: 3,
  },
  viewToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  viewToggleBtnActive: { backgroundColor: C.navy },

  // Add Buttons
  addMainBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.navy,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 42,
  },
  addMainBtnText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  addCatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 42,
  },
  addCatBtnText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },

  // Count
  countRow: { marginBottom: 12 },
  countText: { fontSize: 13, color: C.sub },

  // ── Grid Container ────────────────────────────────────────────────────────
  // ✅ Column on mobile, flex-wrap row on web
  gridContainer: {
    flexDirection: "column",
    gap: 14,
  },
  gridContainerWeb: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    alignItems: "flex-start",
  },

  // ✅ Wrapper controls width; card always fills 100% of wrapper
  gridCardWrapper: {
    // ~3 columns on web: (100% - 2 gaps of 14px) / 3
    // Using flex instead of calc for RN compatibility
    flexBasis: "31%",
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 260,
    maxWidth: "33%",
  },
  gridCardWrapperMobile: {
    width: "100%",
  },

  // ── Grid Card ─────────────────────────────────────────────────────────────
  // ✅ No Platform.OS width hack — card fills its wrapper
  gridCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    width: "100%",
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  gridCardImage: {
    position: "relative",
    height: 180,
    backgroundColor: C.navyLight,
  },
  gridCardImg: { width: "100%", height: "100%" },
  gridCardImgPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.navyLight,
  },
  gridStatusPill: {
    position: "absolute",
    top: 10,
    right: 10,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  gridStatusText: { fontSize: 11, fontWeight: "700" },

  gridCardBody: { padding: 14, gap: 8 },

  snoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gridCatName: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
    flex: 1,
    marginRight: 8,
  },
  snoBadge: {
    backgroundColor: C.navy,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  snoText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },

  typeTag: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  typeTagMain: { backgroundColor: C.navyLight },
  typeTagSub: {
    backgroundColor: C.primaryLight,
    borderWidth: 1,
    borderColor: "#FBCFA4",
  },
  typeTagText: { fontSize: 12, fontWeight: "600" },
  typeTagTextMain: { color: C.navy },
  typeTagTextSub: { color: C.primary },

  gridChips: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  hsnChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.hsnBg,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  hsnChipText: { fontSize: 11, fontWeight: "600", color: C.hsnText },
  gstChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.gstBg,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  gstChipText: { fontSize: 11, fontWeight: "600", color: C.gstText },

  // ✅ UPDATED: date row is inline inside footer — no separate block
  dateRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  dateText: { fontSize: 12, color: C.sub },

  // ✅ UPDATED: footer is now inside gridCardBody, no border/divider, date + actions side by side
  gridCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    // ✅ No borderTopWidth — divider removed
  },
  gridCardActions: {
    flexDirection: "row",
    gap: 6,
  },

  // ── Action Buttons ────────────────────────────────────────────────────────
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

  // ── Mobile List Cards ─────────────────────────────────────────────────────
  mobileCardList: {
    gap: 12,
  },
  mobileCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  mobileCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  mobileCardThumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: C.navyLight,
    flexShrink: 0,
  },
  mobileCardImg: {
    width: "100%",
    height: "100%",
  },
  mobileCardImgPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mobileCardInfo: {
    flex: 1,
    gap: 6,
  },
  mobileCardNameRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  mobileCardName: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text,
    flex: 1,
  },
  mobileCardChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  mobileCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 10,
  },
  mobileCardFooterLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    flex: 1,
  },
  mobileCardActions: {
    flexDirection: "row",
    gap: 8,
    flexShrink: 0,
  },

  // ── Table ─────────────────────────────────────────────────────────────────
  tableWrapper: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    width: "100%",
    minWidth: 900,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: C.tableHead,
    borderBottomWidth: 0,
    width: "100%",
  },
  th: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 11,
    fontWeight: "700",
    color: C.tableHeadText,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    alignItems: "center",
    minHeight: 72,
    width: "100%",
    backgroundColor: C.surface,
  },
  tableRowAlt: { backgroundColor: C.rowAlt },
  cell: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    justifyContent: "center",
  },

  colSno: { width: 56 },
  colImage: { width: 72 },
  colName: { flex: 2.2, minWidth: 160 },
  colType: { flex: 1.2, minWidth: 110 },
  colHsn: { flex: 0.9, minWidth: 80 },
  colGst: { flex: 0.6, minWidth: 60 },
  colDate: { flex: 0.9, minWidth: 100 },
  colStatus: { flex: 0.8, minWidth: 80 },
  colAction: { width: 100 },

  tdSno: { fontSize: 14, fontWeight: "700", color: C.sub },
  tableThumb: { width: 50, height: 50, borderRadius: 10 },
  tableThumbPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: C.navyLight,
    alignItems: "center",
    justifyContent: "center",
  },
  tdName: { fontSize: 14, fontWeight: "600", color: C.text },
  tdParent: { fontSize: 11, color: C.sub, marginTop: 3 },
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

  // ── Pagination ────────────────────────────────────────────────────────────
  pagination: {
    flexDirection: "row",
    justifyContent: "flex-end",
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
  pageBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  pageBtnDisabled: { opacity: 0.35 },
  pageBtnText: { fontSize: 13, fontWeight: "600", color: C.text },
  pageBtnTextActive: { color: "#FFFFFF" },

  // ── Modal ─────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  modalBox: { backgroundColor: C.surface, width: "100%" },
  modalBoxWeb: {
    width: 540,
    maxHeight: "88%",
    borderRadius: 18,
    alignSelf: "center",
    position: "absolute",
    top: "5%",
  },
  modalBoxMobile: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: "92%",
    paddingBottom: 32,
  },
  mobileHandle: {
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
    borderBottomColor: C.border,
    backgroundColor: C.navy,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  modalHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  modalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 8 },

  // Form
  formGroup: { marginBottom: 18 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: C.text,
    marginBottom: 6,
  },
  required: { color: C.inactive, fontWeight: "600" },
  fieldHint: { fontSize: 12, color: C.sub, marginBottom: 8 },
  textInput: {
    backgroundColor: C.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: C.text,
    outlineStyle: "none",
  } as any,

  // Image picker
  imagePickerBox: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderStyle: "dashed",
    borderRadius: 12,
    overflow: "hidden",
    minHeight: 130,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bg,
  },
  imagePickerInner: { alignItems: "center", gap: 6, padding: 20 },
  imagePickerTitle: { fontSize: 14, fontWeight: "600", color: C.text },
  imagePickerSub: { fontSize: 12, color: C.sub },
  imagePickerDim: { fontSize: 11, color: "#C4BAB0", fontStyle: "italic" },
  imagePreview: { width: "100%", height: 160 },
  removeImg: { marginTop: 6 },
  removeImgText: { fontSize: 12, color: C.inactive, fontWeight: "600" },
  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: C.primaryLight,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  infoText: { fontSize: 12, color: C.primary, flex: 1, lineHeight: 17 },
  warnNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: C.inactiveLight,
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },
  warnText: { fontSize: 12, color: C.inactive, flex: 1, lineHeight: 17 },

  // Dropdown
  dropdownWrap: { position: "relative", zIndex: 10 },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownValue: { fontSize: 14, color: C.text, flex: 1 },
  dropdownPlaceholder: { color: "#9CA3AF" },
  dropdownMenu: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 4,
    zIndex: 999,
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.bg,
  },
  dropdownItemActive: { backgroundColor: C.navyLight },
  dropdownItemText: { fontSize: 14, color: C.text },
  dropdownItemTextActive: { color: C.navy, fontWeight: "700" },

  // Modal Footer
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
  cancelBtnText: { fontSize: 14, fontWeight: "700", color: C.sub },
  saveBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.navy,
  },
  saveBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },

  // Empty
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: C.text, marginTop: 8 },
  emptySubtitle: { fontSize: 13, color: C.sub },
});

