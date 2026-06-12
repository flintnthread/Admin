import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  useWindowDimensions,
  Platform,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AdminLayout from '@/components/admin-layout';
import Svg, { Path, Circle, Rect, Line, Polyline } from 'react-native-svg';

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const SearchIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M7.333 12.667A5.333 5.333 0 1 0 7.333 2a5.333 5.333 0 0 0 0 10.667ZM14 14l-2.9-2.9" stroke="#9CA3AF" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const GridIcon = ({ active }: { active: boolean }) => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Rect x="1" y="1" width="6.5" height="6.5" rx="1.5" stroke={active ? '#FFFFFF' : '#6B7280'} strokeWidth={1.6} />
    <Rect x="10.5" y="1" width="6.5" height="6.5" rx="1.5" stroke={active ? '#FFFFFF' : '#6B7280'} strokeWidth={1.6} />
    <Rect x="1" y="10.5" width="6.5" height="6.5" rx="1.5" stroke={active ? '#FFFFFF' : '#6B7280'} strokeWidth={1.6} />
    <Rect x="10.5" y="10.5" width="6.5" height="6.5" rx="1.5" stroke={active ? '#FFFFFF' : '#6B7280'} strokeWidth={1.6} />
  </Svg>
);

const ListIcon = ({ active }: { active: boolean }) => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Line x1="5" y1="4.5" x2="17" y2="4.5" stroke={active ? '#FFFFFF' : '#6B7280'} strokeWidth={1.6} strokeLinecap="round" />
    <Line x1="5" y1="9" x2="17" y2="9" stroke={active ? '#FFFFFF' : '#6B7280'} strokeWidth={1.6} strokeLinecap="round" />
    <Line x1="5" y1="13.5" x2="17" y2="13.5" stroke={active ? '#FFFFFF' : '#6B7280'} strokeWidth={1.6} strokeLinecap="round" />
    <Circle cx="2" cy="4.5" r="1" fill={active ? '#FFFFFF' : '#6B7280'} />
    <Circle cx="2" cy="9" r="1" fill={active ? '#FFFFFF' : '#6B7280'} />
    <Circle cx="2" cy="13.5" r="1" fill={active ? '#FFFFFF' : '#6B7280'} />
  </Svg>
);

const PlusIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M8 2v12M2 8h12" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const EditIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
    <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const TrashIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
    <Polyline points="3,6 5,6 21,6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const XIcon = ({ color = '#6B7280' }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Path d="M13.5 4.5L4.5 13.5M4.5 4.5L13.5 13.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const UploadIcon = () => (
  <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
    <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="#9CA3AF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="17,8 12,3 7,8" stroke="#9CA3AF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 3v12" stroke="#9CA3AF" strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const ChevronDownIcon = ({ color = '#374151' }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M4 6l4 4 4-4" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ChevronLeftIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M10 12L6 8l4-4" stroke="#374151" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ChevronRightIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M6 4l4 4-4 4" stroke="#374151" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const LayersIcon = ({ color = '#1d324e' }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const HsnIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="3" width="20" height="14" rx="2" stroke="#0EA5E9" strokeWidth={1.8} />
    <Path d="M8 21h8M12 17v4" stroke="#0EA5E9" strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const GstIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z" stroke="#10B981" strokeWidth={1.8} />
    <Path d="M15 9l-6 6M9 9h.01M15 15h.01" stroke="#10B981" strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const CalendarIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="4" width="18" height="18" rx="2" stroke="#9CA3AF" strokeWidth={1.6} />
    <Path d="M16 2v4M8 2v4M3 10h18" stroke="#9CA3AF" strokeWidth={1.6} strokeLinecap="round" />
  </Svg>
);

const FolderIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="#F97316" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const WarningIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="#EF4444" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 9v4M12 17h.01" stroke="#EF4444" strokeWidth={1.6} strokeLinecap="round" />
  </Svg>
);

const InfoIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke="#3B82F6" strokeWidth={1.6} />
    <Path d="M12 8v4M12 16h.01" stroke="#3B82F6" strokeWidth={1.6} strokeLinecap="round" />
  </Svg>
);

// ─── Design Tokens ───────────────────────────────────────────────────────────

const C = {
  bg:            '#FFFFFF',
  surface:       '#FFFFFF',
  primary:       '#ef7b1a',
  primaryLight:  '#FFF0EA',
  navy:          '#1d324e',
  navyLight:     '#e8ecf2',
  text:          '#1C2B4A',
  sub:           '#6B7280',
  border:        '#E8E2D9',
  active:        '#10B981',
  activeLight:   '#ECFDF5',
  inactive:      '#EF4444',
  inactiveLight: '#FEF2F2',
  hsnBg:         '#EEF6FF',
  hsnText:       '#2563EB',
  gstBg:         '#ECFDF5',
  gstText:       '#059669',
  rowAlt:        '#FDFAF7',
  tableHead:     '#1d324e',
  tableHeadText: '#FFFFFF',
};

// ─── Constants ────────────────────────────────────────────────────────────────

const GST_RATES = [
  '0% (Exempt/Nil rated)',
  '0.1% (Special rate)',
  '0.25% (Special rate)',
  '3% (Special rate)',
  '5% (Standard rate)',
  '12% (Standard rate)',
  '18% (Standard rate)',
  '28% (Luxury rate)',
];

const MAIN_CATEGORIES = [
  'Accessories', 'Beauty & Personal Care', 'Footwear',
  'Homely Hub', 'Indoor Play', 'Kids', 'Men', 'Sportswear', 'Sweets', 'Women',
];

const ITEMS_PER_PAGE = 8;

// ─── Sample Data ──────────────────────────────────────────────────────────────

interface Category {
  id: number;
  name: string;
  type: 'Main Category' | 'Category';
  parent?: string;
  hsn: string;
  gst: string;
  created: string;
  status: 'Active' | 'Inactive';
  image?: string;
}

const SAMPLE_CATEGORIES: Category[] = [
  { id: 1, name: 'Accessories', type: 'Main Category', hsn: '4202', gst: '12.00%', created: '03 Nov, 2025', status: 'Active', image: 'https://images.unsplash.com/photo-1523779917675-b6ed3a42a561?w=200&h=200&fit=crop' },
  { id: 2, name: 'Bags', type: 'Category', parent: 'Accessories', hsn: 'HSN-4CC36DB6', gst: '18.00%', created: '16 Nov, 2025', status: 'Active', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200&h=200&fit=crop' },
  { id: 3, name: 'Jewellery', type: 'Category', parent: 'Accessories', hsn: 'HSN-A5AEE672', gst: '5.00%', created: '16 Nov, 2025', status: 'Active', image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200&h=200&fit=crop' },
  { id: 4, name: 'Watches', type: 'Category', parent: 'Accessories', hsn: 'HSN-5B411A96', gst: '5.00%', created: '16 Nov, 2025', status: 'Active', image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=200&h=200&fit=crop' },
  { id: 5, name: 'Women', type: 'Main Category', hsn: '6204', gst: '5.00%', created: '03 Nov, 2025', status: 'Active', image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&h=200&fit=crop' },
  { id: 6, name: 'Men', type: 'Main Category', hsn: '6203', gst: '5.00%', created: '03 Nov, 2025', status: 'Active', image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=200&h=200&fit=crop' },
  { id: 7, name: 'Footwear', type: 'Main Category', hsn: '6401', gst: '18.00%', created: '04 Nov, 2025', status: 'Active', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop' },
  { id: 8, name: 'Kids', type: 'Main Category', hsn: '6111', gst: '5.00%', created: '05 Nov, 2025', status: 'Inactive', image: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=200&h=200&fit=crop' },
  { id: 9, name: 'Beauty & Personal Care', type: 'Main Category', hsn: '3304', gst: '18.00%', created: '06 Nov, 2025', status: 'Active', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&h=200&fit=crop' },
  { id: 10, name: 'Sportswear', type: 'Main Category', hsn: '6211', gst: '12.00%', created: '07 Nov, 2025', status: 'Active', image: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=200&h=200&fit=crop' },
];

// ─── Shared: Image Picker Field ───────────────────────────────────────────────

const ImagePickerField = ({
  image,
  onPick,
}: {
  image: string | null;
  onPick: (uri: string) => void;
}) => {
  const handlePick = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png';
      input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => onPick(ev.target?.result as string);
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
      if (!result.canceled) onPick(result.assets[0].uri);
    }
  };

  return (
    <TouchableOpacity style={styles.imagePickerBox} onPress={handlePick} activeOpacity={0.7}>
      {image ? (
        <Image source={{ uri: image }} style={styles.imagePreview} resizeMode="cover" />
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
      <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setOpen(!open)}>
        <Text style={[styles.dropdownValue, !value && styles.dropdownPlaceholder]}>
          {value || placeholder}
        </Text>
        <ChevronDownIcon color={open ? '#1E3A5F' : '#6B7280'} />
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdownMenu}>
          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.dropdownItem, value === opt && styles.dropdownItemActive]}
                onPress={() => { onChange(opt); setOpen(false); }}
              >
                <Text style={[styles.dropdownItemText, value === opt && styles.dropdownItemTextActive]}>
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

const AddMainCategoryModal = ({
  visible,
  onClose,
  onSave,
  isWeb,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isWeb: boolean;
}) => {
  const [name, setName] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [hsn, setHsn] = useState('');
  const [gst, setGst] = useState('');
  const [status, setStatus] = useState('Active');

  const reset = () => { setName(''); setImage(null); setHsn(''); setGst(''); setStatus('Active'); };

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('Required', 'Please enter a category name.'); return; }
    if (!image) { Alert.alert('Required', 'Please upload a category image.'); return; }
    if (!gst) { Alert.alert('Required', 'Please select GST percentage.'); return; }
    onSave({ name, image, hsn, gst, status, type: 'Main Category' });
    reset(); onClose();
  };

  return (
    <Modal visible={visible} transparent animationType={isWeb ? 'fade' : 'slide'} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalBox, isWeb ? styles.modalBoxWeb : styles.modalBoxMobile]}>
          {!isWeb && <View style={styles.mobileHandle} />}

          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View style={styles.modalIconWrap}><LayersIcon color="#FFFFFF" /></View>
              <Text style={styles.modalTitle}>Add Main Category</Text>
            </View>
            <TouchableOpacity onPress={() => { reset(); onClose(); }} style={styles.modalCloseBtn}>
              <XIcon color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} nestedScrollEnabled>

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
              <Text style={styles.fieldHint}>1600 × 1600 (no crop) · JPG, PNG (Max 2MB)</Text>
              <ImagePickerField image={image} onPick={setImage} />
              {image && (
                <TouchableOpacity onPress={() => setImage(null)} style={styles.removeImg}>
                  <Text style={styles.removeImgText}>Remove image</Text>
                </TouchableOpacity>
              )}
              <View style={styles.infoNote}>
                <InfoIcon />
                <Text style={styles.infoText}>Images will be resized to 1600×1600 without cropping.</Text>
              </View>
              <View style={styles.warnNote}>
                <WarningIcon />
                <Text style={styles.warnText}>Uploading inappropriate images may result in legal action.</Text>
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
              <Text style={styles.fieldHint}>Harmonized System of Nomenclature code (optional)</Text>
            </View>

            {/* GST */}
            <View style={[styles.formGroup, { zIndex: 30 }]}>
              <Text style={styles.fieldLabel}>
                GST Percentage (%) <Text style={styles.required}>* Required</Text>
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
                options={['Active', 'Inactive']}
                onChange={setStatus}
              />
            </View>

          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { reset(); onClose(); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save Category</Text>
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
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isWeb: boolean;
}) => {
  const [mainCat, setMainCat] = useState('');
  const [name, setName] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [hsn, setHsn] = useState('');
  const [gst, setGst] = useState('');
  const [status, setStatus] = useState('Active');

  const reset = () => { setMainCat(''); setName(''); setImage(null); setHsn(''); setGst(''); setStatus('Active'); };

  const handleSave = () => {
    if (!mainCat) { Alert.alert('Required', 'Please select a main category.'); return; }
    if (!name.trim()) { Alert.alert('Required', 'Please enter a category name.'); return; }
    if (!gst) { Alert.alert('Required', 'Please select GST percentage.'); return; }
    onSave({ name, image, hsn, gst, status, type: 'Category', parent: mainCat });
    reset(); onClose();
  };

  return (
    <Modal visible={visible} transparent animationType={isWeb ? 'fade' : 'slide'} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalBox, isWeb ? styles.modalBoxWeb : styles.modalBoxMobile]}>
          {!isWeb && <View style={styles.mobileHandle} />}

          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View style={[styles.modalIconWrap, { backgroundColor: 'rgba(239,123,26,0.25)' }]}>
                <FolderIcon />
              </View>
              <Text style={styles.modalTitle}>Add Category</Text>
            </View>
            <TouchableOpacity onPress={() => { reset(); onClose(); }} style={styles.modalCloseBtn}>
              <XIcon color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} nestedScrollEnabled>

            {/* Main Category */}
            <View style={[styles.formGroup, { zIndex: 40 }]}>
              <Text style={styles.fieldLabel}>
                Select Main Category <Text style={styles.required}>* Required</Text>
              </Text>
              <Dropdown
                value={mainCat}
                placeholder="-- Select Main Category --"
                options={MAIN_CATEGORIES}
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
              <Text style={styles.fieldHint}>1600 × 1600 (no crop) · JPG, PNG (Max 2MB)</Text>
              <ImagePickerField image={image} onPick={setImage} />
              {image && (
                <TouchableOpacity onPress={() => setImage(null)} style={styles.removeImg}>
                  <Text style={styles.removeImgText}>Remove image</Text>
                </TouchableOpacity>
              )}
              <View style={styles.infoNote}>
                <InfoIcon />
                <Text style={styles.infoText}>Images will be resized to 1600×1600 without cropping.</Text>
              </View>
              <View style={styles.warnNote}>
                <WarningIcon />
                <Text style={styles.warnText}>Uploading inappropriate images may result in legal action.</Text>
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
              <Text style={styles.fieldHint}>Harmonized System of Nomenclature code (optional)</Text>
            </View>

            {/* GST */}
            <View style={[styles.formGroup, { zIndex: 30 }]}>
              <Text style={styles.fieldLabel}>
                GST Percentage (%) <Text style={styles.required}>* Required</Text>
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
                options={['Active', 'Inactive']}
                onChange={setStatus}
              />
            </View>

          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { reset(); onClose(); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#F97316' }]} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save Category</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Grid Card ────────────────────────────────────────────────────────────────

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
        <Image source={{ uri: cat.image }} style={styles.gridCardImg} resizeMode="cover" />
      ) : (
        <View style={styles.gridCardImgPlaceholder}>
          <LayersIcon color={C.navy} />
        </View>
      )}
      {/* Status pill */}
      <View style={[styles.gridStatusPill, { backgroundColor: cat.status === 'Active' ? '#DCFCE7' : '#FEE2E2' }]}>
        <Text style={[styles.gridStatusText, { color: cat.status === 'Active' ? '#16A34A' : '#DC2626' }]}>
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
      <View style={[styles.typeTag, cat.type === 'Main Category' ? styles.typeTagMain : styles.typeTagSub]}>
        <Text style={[styles.typeTagText, cat.type === 'Main Category' ? styles.typeTagTextMain : styles.typeTagTextSub]}>
          {cat.type === 'Main Category' ? '⊟ Main Category' : `↳ Category under: ${cat.parent}`}
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

      {/* Date */}
      <View style={styles.dateRow}>
        <CalendarIcon />
        <Text style={styles.dateText}>{cat.created}</Text>
      </View>
    </View>

    {/* Actions */}
    <View style={styles.gridCardFooter}>
      <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
        <EditIcon />
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
        <TrashIcon />
      </TouchableOpacity>
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
  // No horizontal ScrollView — table stretches to fill 100% of the content area
  <View style={styles.tableWrapper}>
    {/* Header */}
    <View style={styles.tableHeader}>
      <Text style={[styles.th, styles.colSno]}>S.No</Text>
      <Text style={[styles.th, styles.colImage]}>Image</Text>
      <Text style={[styles.th, styles.colName]}>Category Name</Text>
      <Text style={[styles.th, styles.colType]}>Type</Text>
      <Text style={[styles.th, styles.colHsn]}>HSN/GST Info</Text>
      <Text style={[styles.th, styles.colDate]}>Created Date</Text>
      <Text style={[styles.th, styles.colStatus]}>Status</Text>
      <Text style={[styles.th, styles.colAction, { textAlign: 'center' }]}>Action</Text>
    </View>

    {/* Rows */}
    {categories.map((cat, idx) => (
      <View key={cat.id} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
        {/* S.No */}
        <View style={[styles.cell, styles.colSno]}>
          <Text style={styles.tdSno}>{cat.id}</Text>
        </View>
        {/* Image */}
        <View style={[styles.cell, styles.colImage]}>
          {cat.image ? (
            <Image source={{ uri: cat.image }} style={styles.tableThumb} resizeMode="cover" />
          ) : (
            <View style={styles.tableThumbPlaceholder}><LayersIcon color={C.navy} /></View>
          )}
        </View>
        {/* Name */}
        <View style={[styles.cell, styles.colName]}>
          <Text style={styles.tdName}>{cat.name}</Text>
        </View>
        {/* Type */}
        <View style={[styles.cell, styles.colType]}>
          <View style={[styles.typeTag, cat.type === 'Main Category' ? styles.typeTagMain : styles.typeTagSub]}>
            <Text style={[styles.typeTagText, cat.type === 'Main Category' ? styles.typeTagTextMain : styles.typeTagTextSub]}>
              {cat.type === 'Main Category' ? '⊟ Main Category' : '↳ Category'}
            </Text>
          </View>
          {cat.parent && <Text style={styles.tdParent}>under: {cat.parent}</Text>}
        </View>
        {/* HSN/GST */}
        <View style={[styles.cell, styles.colHsn, { gap: 4 }]}>
          <View style={styles.hsnChip}>
            <HsnIcon />
            <Text style={styles.hsnChipText}>HSN: {cat.hsn}</Text>
          </View>
          <View style={styles.gstChip}>
            <GstIcon />
            <Text style={styles.gstChipText}>GST: {cat.gst}</Text>
          </View>
        </View>
        {/* Created */}
        <View style={[styles.cell, styles.colDate]}>
          <Text style={styles.tdDate}>{cat.created}</Text>
        </View>
        {/* Status */}
        <View style={[styles.cell, styles.colStatus]}>
          <View style={[styles.statusBadge, { backgroundColor: cat.status === 'Active' ? '#DCFCE7' : '#FEE2E2' }]}>
            <View style={[styles.statusDot, { backgroundColor: cat.status === 'Active' ? '#16A34A' : '#DC2626' }]} />
            <Text style={[styles.statusText, { color: cat.status === 'Active' ? '#16A34A' : '#DC2626' }]}>
              {cat.status}
            </Text>
          </View>
        </View>
        {/* Actions */}
        <View style={[styles.cell, styles.colAction, { flexDirection: 'row', gap: 6, justifyContent: 'center' }]}>
          <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(cat)}>
            <EditIcon />
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(cat)}>
            <TrashIcon />
          </TouchableOpacity>
        </View>
      </View>
    ))}
  </View>
);

// ─── Pagination ───────────────────────────────────────────────────────────────

const Pagination = ({
  page,
  totalPages,
  onPrev,
  onNext,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onPage: (p: number) => void;
}) => {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <View style={styles.pagination}>
      <TouchableOpacity
        style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
        onPress={onPrev}
        disabled={page === 1}
      >
        <ChevronLeftIcon />
      </TouchableOpacity>
      {pages.map((p) => (
        <TouchableOpacity
          key={p}
          style={[styles.pageBtn, p === page && styles.pageBtnActive]}
          onPress={() => onPage(p)}
        >
          <Text style={[styles.pageBtnText, p === page && styles.pageBtnTextActive]}>{p}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}
        onPress={onNext}
        disabled={page === totalPages}
      >
        <ChevronRightIcon />
      </TouchableOpacity>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MainCategories() {
  const { width } = useWindowDimensions();
  const isWeb = width >= 768;

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<Category[]>(SAMPLE_CATEGORIES);
  const [page, setPage] = useState(1);
  const [mainCatModalOpen, setMainCatModalOpen] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleSave = (data: any) => {
    const newCat: Category = {
      id: categories.length + 1,
      name: data.name,
      type: data.type,
      parent: data.parent,
      hsn: data.hsn || '—',
      gst: data.gst.split('%')[0].trim() + '%',
      created: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: data.status,
      image: data.image,
    };
    setCategories((prev) => [newCat, ...prev]);
    setPage(1);
  };

  const handleDelete = (cat: Category) => {
    Alert.alert('Delete Category', `Delete "${cat.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => setCategories((prev) => prev.filter((c) => c.id !== cat.id)),
      },
    ]);
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
            <View style={styles.pageIconWrap}><LayersIcon color="#FFFFFF" /></View>
            <View>
              <Text style={styles.pageTitle}>Categories</Text>
              <Text style={styles.pageSubtitle}>Manage main categories and sub-categories</Text>
            </View>
          </View>
        </View>

        {/* ── Toolbar ── */}
        <View style={styles.toolbar}>
          {/* Search */}
          <View style={styles.searchBox}>
            <SearchIcon />
            <TextInput
              style={styles.searchInput}
              placeholder="Search categories..."
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={(t) => { setSearch(t); setPage(1); }}
            />
          </View>

          {/* Right side controls */}
          <View style={styles.toolbarRight}>
            {/* View Toggle */}
            <View style={styles.viewToggle}>
              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === 'grid' && styles.viewToggleBtnActive]}
                onPress={() => setViewMode('grid')}
              >
                <GridIcon active={viewMode === 'grid'} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
                onPress={() => setViewMode('list')}
              >
                <ListIcon active={viewMode === 'list'} />
              </TouchableOpacity>
            </View>

            {/* Add Buttons */}
            <TouchableOpacity style={styles.addMainBtn} onPress={() => setMainCatModalOpen(true)}>
              <PlusIcon />
              <Text style={styles.addMainBtnText}>
                {isWeb ? 'Add Main Category' : 'Main Cat'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.addCatBtn} onPress={() => setCatModalOpen(true)}>
              <PlusIcon color="#1E3A5F" />
              <Text style={styles.addCatBtnText}>
                {isWeb ? 'Add Category' : 'Category'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Count Row ── */}
        <View style={styles.countRow}>
          <Text style={styles.countText}>
            Showing {paginated.length} of {filtered.length} categories
          </Text>
        </View>

        {/* ── Content ── */}
        {viewMode === 'grid' ? (
          <View style={[styles.gridContainer, isWeb && styles.gridContainerWeb]}>
            {paginated.map((cat) => (
              <GridCard
                key={cat.id}
                cat={cat}
                onEdit={() => {}}
                onDelete={() => handleDelete(cat)}
              />
            ))}
          </View>
        ) : (
          <ListTable
            categories={paginated}
            onEdit={() => {}}
            onDelete={handleDelete}
          />
        )}

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <LayersIcon />
            <Text style={styles.emptyTitle}>No categories found</Text>
            <Text style={styles.emptySubtitle}>Try a different search term or add a new category</Text>
          </View>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            onPage={setPage}
          />
        )}
      </ScrollView>

      <AddMainCategoryModal
        visible={mainCatModalOpen}
        onClose={() => setMainCatModalOpen(false)}
        onSave={handleSave}
        isWeb={isWeb}
      />
      <AddCategoryModal
        visible={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        onSave={handleSave}
        isWeb={isWeb}
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 20,
    backgroundColor: C.navy,
    paddingHorizontal: 20, paddingVertical: 16,
    borderRadius: 14,
  },
  pageHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pageIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.3 },
  pageSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2 },

  // ── Toolbar — full width ───────────────────────────────────────────────────
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    flexWrap: 'wrap',
    width: '100%',
  },
  searchBox: {
    flex: 1,
    minWidth: 180,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.surface, borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 12, height: 42,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.text, outlineStyle: 'none' } as any,
  toolbarRight: {
    flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0,
  },

  // View Toggle
  viewToggle: {
    flexDirection: 'row', backgroundColor: C.navyLight, borderRadius: 10, padding: 3,
  },
  viewToggleBtn: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  viewToggleBtnActive: { backgroundColor: C.navy },

  // Add Buttons
  addMainBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.navy, borderRadius: 10,
    paddingHorizontal: 14, height: 42,
  },
  addMainBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  addCatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.primaryLight, borderRadius: 10,
    borderWidth: 1.5, borderColor: C.primary,
    paddingHorizontal: 14, height: 42,
  },
  addCatBtnText: { fontSize: 13, fontWeight: '700', color: C.primary },

  // Count
  countRow: { marginBottom: 12 },
  countText: { fontSize: 13, color: C.sub },

  // ── Grid ──────────────────────────────────────────────────────────────────
  gridContainer: { flexDirection: 'column', gap: 14 },
  gridContainerWeb: { flexDirection: 'row', flexWrap: 'wrap' },
  gridCard: {
    backgroundColor: C.surface, borderRadius: 16,
    borderWidth: 1, borderColor: C.border,
    overflow: 'hidden', width: '100%',
    shadowColor: C.navy, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2, marginBottom: 4,
    ...(Platform.OS === 'web' ? { width: 'calc(33.33% - 10px)' as any, minWidth: 260, flex: 1 } : {}),
  },
  gridCardImage: { position: 'relative', height: 180, backgroundColor: C.navyLight },
  gridCardImg: { width: '100%', height: '100%' },
  gridCardImgPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.navyLight,
  },
  gridStatusPill: {
    position: 'absolute', top: 10, right: 10,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  gridStatusText: { fontSize: 11, fontWeight: '700' },
  gridCardBody: { padding: 14, gap: 8 },
  snoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gridCatName: { fontSize: 16, fontWeight: '700', color: C.text, flex: 1 },
  snoBadge: {
    backgroundColor: C.navy, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  snoText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  typeTag: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
  typeTagMain: { backgroundColor: C.navyLight },
  typeTagSub: { backgroundColor: C.primaryLight, borderWidth: 1, borderColor: '#FBCFA4' },
  typeTagText: { fontSize: 12, fontWeight: '600' },
  typeTagTextMain: { color: C.navy },
  typeTagTextSub: { color: C.primary },
  gridChips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  hsnChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.hsnBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
  },
  hsnChipText: { fontSize: 11, fontWeight: '600', color: C.hsnText },
  gstChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.gstBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
  },
  gstChipText: { fontSize: 11, fontWeight: '600', color: C.gstText },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dateText: { fontSize: 12, color: C.sub },
  gridCardFooter: {
    flexDirection: 'row', gap: 8, padding: 12,
    borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12,
  },

  // ── Action Buttons ────────────────────────────────────────────────────────
  editBtn: {
    width: 36, height: 36, borderRadius: 8, backgroundColor: C.navy,
    alignItems: 'center', justifyContent: 'center',
  },
  deleteBtn: {
    width: 36, height: 36, borderRadius: 8, backgroundColor: C.inactive,
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Table — full width, C-token colours ───────────────────────────────────
  tableWrapper: {
    backgroundColor: C.surface, borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
    overflow: 'hidden', width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.tableHead,   // ← navy header
    borderBottomWidth: 0,
    width: '100%',
  },
  th: {
    paddingVertical: 14, paddingHorizontal: 12,
    fontSize: 11, fontWeight: '700',
    color: C.tableHeadText,          // ← white text
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  tableRow: {
    flexDirection: 'row', borderBottomWidth: 1,
    borderBottomColor: C.border, alignItems: 'center',
    minHeight: 72, width: '100%',
    backgroundColor: C.surface,
  },
  tableRowAlt: { backgroundColor: C.rowAlt },
  cell: { paddingVertical: 14, paddingHorizontal: 12, justifyContent: 'center' },

  // Column flex/width definitions
  colSno:    { width: 56 },
  colImage:  { width: 76 },
  colName:   { flex: 1.4, minWidth: 120 },
  colType:   { flex: 1.6, minWidth: 130 },
  colHsn:    { flex: 1.8, minWidth: 150 },
  colDate:   { width: 128 },
  colStatus: { width: 100 },
  colAction: { width: 96 },

  tdSno: { fontSize: 14, fontWeight: '700', color: C.sub },
  tableThumb: { width: 50, height: 50, borderRadius: 10 },
  tableThumbPlaceholder: {
    width: 50, height: 50, borderRadius: 10,
    backgroundColor: C.navyLight, alignItems: 'center', justifyContent: 'center',
  },
  tdName: { fontSize: 14, fontWeight: '600', color: C.text },
  tdParent: { fontSize: 11, color: C.sub, marginTop: 3 },
  tdDate: { fontSize: 12, color: C.sub },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4, alignSelf: 'flex-start',
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },

  // ── Pagination ────────────────────────────────────────────────────────────
  pagination: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 6, marginTop: 24,
  },
  pageBtn: {
    width: 36, height: 36, borderRadius: 9,
    borderWidth: 1, borderColor: C.border,
    backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center',
  },
  pageBtnActive: { backgroundColor: C.navy, borderColor: C.navy },
  pageBtnDisabled: { opacity: 0.35 },
  pageBtnText: { fontSize: 13, fontWeight: '600', color: C.text },
  pageBtnTextActive: { color: '#FFFFFF' },

  // ── Modal ─────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end', alignItems: 'center',
  },
  modalBox: { backgroundColor: C.surface, width: '100%' },
  modalBoxWeb: {
    width: 540, maxHeight: '88%', borderRadius: 18,
    alignSelf: 'center', position: 'absolute', top: '5%',
  },
  modalBoxMobile: {
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    maxHeight: '92%', paddingBottom: 32,
  },
  mobileHandle: {
    width: 40, height: 4, backgroundColor: '#D1D5DB',
    borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: C.navy,             // ← navy modal header
    borderTopLeftRadius: 18, borderTopRightRadius: 18,
  },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  modalCloseBtn: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalBody: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 8 },

  // Form
  formGroup: { marginBottom: 18 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 6 },
  required: { color: C.inactive, fontWeight: '600' },
  fieldHint: { fontSize: 12, color: C.sub, marginBottom: 8 },
  textInput: {
    backgroundColor: C.bg, borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: C.text, outlineStyle: 'none',
  } as any,

  // Image picker
  imagePickerBox: {
    borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed',
    borderRadius: 12, overflow: 'hidden', minHeight: 130,
    alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg,
  },
  imagePickerInner: { alignItems: 'center', gap: 6, padding: 20 },
  imagePickerTitle: { fontSize: 14, fontWeight: '600', color: C.text },
  imagePickerSub: { fontSize: 12, color: C.sub },
  imagePickerDim: { fontSize: 11, color: '#C4BAB0', fontStyle: 'italic' },
  imagePreview: { width: '100%', height: 160 },
  removeImg: { marginTop: 6 },
  removeImgText: { fontSize: 12, color: C.inactive, fontWeight: '600' },
  infoNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#EFF6FF', borderRadius: 8, padding: 10, marginTop: 8,
  },
  infoText: { fontSize: 12, color: '#1D4ED8', flex: 1, lineHeight: 17 },
  warnNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: C.inactiveLight, borderRadius: 8, padding: 10, marginTop: 6,
  },
  warnText: { fontSize: 12, color: C.inactive, flex: 1, lineHeight: 17 },

  // Dropdown
  dropdownWrap: { position: 'relative', zIndex: 10 },
  dropdownTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.bg, borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  dropdownValue: { fontSize: 14, color: C.text, flex: 1 },
  dropdownPlaceholder: { color: '#9CA3AF' },
  dropdownMenu: {
    position: 'absolute', top: '100%', left: 0, right: 0,
    backgroundColor: C.surface, borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
    marginTop: 4, zIndex: 999,
    shadowColor: C.navy, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 6,
  },
  dropdownItem: {
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.bg,
  },
  dropdownItemActive: { backgroundColor: C.navyLight },
  dropdownItemText: { fontSize: 14, color: C.text },
  dropdownItemTextActive: { color: C.navy, fontWeight: '700' },

  // Modal Footer
  modalFooter: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 22, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  cancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 10,
    borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: C.sub },
  saveBtn: {
    flex: 2, paddingVertical: 13, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', backgroundColor: C.navy,
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: C.text, marginTop: 8 },
  emptySubtitle: { fontSize: 13, color: C.sub },
});