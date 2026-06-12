import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Modal, StyleSheet, useWindowDimensions, Platform, Image, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AdminLayout from '@/components/admin-layout';
import Svg, { Path, Circle, Rect, Line, Polyline } from 'react-native-svg';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg:           '#F7F3EE',
  surface:      '#FFFFFF',
  primary:      '#ef7b1a',
  primaryLight: '#FFF0EA',
  navy:         '#1d324e',
  navyLight:    '#e8ecf2',
  text:         '#1C2B4A',
  sub:          '#6B7280',
  border:       '#E8E2D9',
  active:       '#10B981',
  activeLight:  '#ECFDF5',
  inactive:     '#EF4444',
  inactiveLight:'#FEF2F2',
  rowAlt:       '#FDFAF7',
  matChip:      '#EFF6FF',
  matChipText:  '#2563EB',
  gstChip:      '#ECFDF5',
  gstChipText:  '#059669',
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M7.333 12.667A5.333 5.333 0 1 0 7.333 2a5.333 5.333 0 0 0 0 10.667ZM14 14l-2.9-2.9" stroke="#9CA3AF" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const GridIcon = ({ active }: { active: boolean }) => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Rect x="1" y="1" width="6.5" height="6.5" rx="1.5" stroke={active ? '#FFF' : '#6B7280'} strokeWidth={1.6} />
    <Rect x="10.5" y="1" width="6.5" height="6.5" rx="1.5" stroke={active ? '#FFF' : '#6B7280'} strokeWidth={1.6} />
    <Rect x="1" y="10.5" width="6.5" height="6.5" rx="1.5" stroke={active ? '#FFF' : '#6B7280'} strokeWidth={1.6} />
    <Rect x="10.5" y="10.5" width="6.5" height="6.5" rx="1.5" stroke={active ? '#FFF' : '#6B7280'} strokeWidth={1.6} />
  </Svg>
);
const ListIcon = ({ active }: { active: boolean }) => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Line x1="5" y1="4.5" x2="17" y2="4.5" stroke={active ? '#FFF' : '#6B7280'} strokeWidth={1.6} strokeLinecap="round" />
    <Line x1="5" y1="9" x2="17" y2="9" stroke={active ? '#FFF' : '#6B7280'} strokeWidth={1.6} strokeLinecap="round" />
    <Line x1="5" y1="13.5" x2="17" y2="13.5" stroke={active ? '#FFF' : '#6B7280'} strokeWidth={1.6} strokeLinecap="round" />
    <Circle cx="2" cy="4.5" r="1" fill={active ? '#FFF' : '#6B7280'} />
    <Circle cx="2" cy="9" r="1" fill={active ? '#FFF' : '#6B7280'} />
    <Circle cx="2" cy="13.5" r="1" fill={active ? '#FFF' : '#6B7280'} />
  </Svg>
);
const PlusIcon = ({ color = '#FFF' }: { color?: string }) => (
  <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
    <Path d="M7.5 2v11M2 7.5h11" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);
const EditIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="#FFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#FFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const TrashIcon = ({ color = '#FFF' }: { color?: string }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Polyline points="3,6 5,6 21,6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const XIcon = ({ color = '#6B7280' }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Path d="M13.5 4.5L4.5 13.5M4.5 4.5L13.5 13.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);
const ChevronDownIcon = ({ color = C.sub }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M4 6l4 4 4-4" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const ChevronLeft = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M10 12L6 8l4-4" stroke={C.text} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const ChevronRight2 = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M6 4l4 4-4 4" stroke={C.text} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const UploadIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
    <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="#9CA3AF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="17,8 12,3 7,8" stroke="#9CA3AF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 3v12" stroke="#9CA3AF" strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);
const DownloadIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M2 11v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2" stroke="#FFF" strokeWidth={1.6} strokeLinecap="round" />
    <Path d="M8 2v8M5 7l3 3 3-3" stroke="#FFF" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const InfoIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke="#3B82F6" strokeWidth={1.6} />
    <Path d="M12 8v4M12 16h.01" stroke="#3B82F6" strokeWidth={1.6} strokeLinecap="round" />
  </Svg>
);
const LayersIcon = ({ color = C.navy }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const CalendarIcon = () => (
  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="4" width="18" height="18" rx="2" stroke="#9CA3AF" strokeWidth={1.6} />
    <Path d="M16 2v4M8 2v4M3 10h18" stroke="#9CA3AF" strokeWidth={1.6} strokeLinecap="round" />
  </Svg>
);
const TagIcon = () => (
  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
    <Path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01" stroke="#9CA3AF" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Constants ────────────────────────────────────────────────────────────────
const MAIN_CATS = ['All', 'Accessories', 'Footwear', 'Homely Hub', 'Indoor Play', 'Kids', 'Men', 'Women', 'Sportswear', 'Sweets'];
const CATEGORY_OPTIONS = [
  'Accessories > Bags', 'Accessories > Belts & Caps', 'Accessories > Gadgets Accessories',
  'Accessories > Jewellery', 'Accessories > Other Accessories', 'Accessories > Watches',
  'Beauty & Personal Care > Skincare Tools & Devices',
  'Footwear > Kids\' Footwear', 'Footwear > Men\'s Footwear', 'Footwear > Women\'s Footwear',
  'Homely Hub > Art & Creative Gifts', 'Homely Hub > Chairs',
  'Indoor Play > Board Games', 'Kids > Kids Wear', 'Men > Men\'s Clothing',
  'Women > Women\'s Clothing', 'Sportswear > Gym Wear', 'Sweets > Indian Sweets',
];
const GST_RATES = ['0%', '0.1%', '0.25%', '3%', '5%', '12%', '18%', '28%'];
const ITEMS_PER_PAGE = 9;

// ─── Types ────────────────────────────────────────────────────────────────────
interface Material { id: string; name: string; hsn: string; slabs: { min: string; max: string; gst: string }[] }
interface Subcategory {
  id: number; mainCat: string; category: string; name: string;
  materials: Material[]; created: string; status: 'Active' | 'Inactive'; image?: string;
}

// ─── Sample Data ──────────────────────────────────────────────────────────────
const SAMPLE: Subcategory[] = [
  { id: 68, mainCat: 'Accessories', category: 'Bags', name: 'Backpacks', created: '16 Nov, 2025', status: 'Active', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=300&fit=crop', materials: [{ id: '1', name: 'Plastic or Textile', hsn: '61120000', slabs: [{ min: '0', max: '500', gst: '18%' }] }, { id: '2', name: 'Others', hsn: '61119000', slabs: [{ min: '0', max: '', gst: '18%' }] }] },
  { id: 67, mainCat: 'Accessories', category: 'Bags', name: 'Handbags', created: '16 Nov, 2025', status: 'Active', image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=300&h=300&fit=crop', materials: [{ id: '1', name: 'Cotton', hsn: '42022100', slabs: [{ min: '0', max: '1000', gst: '18%' }] }, { id: '2', name: 'Jute', hsn: '42022900', slabs: [] }, { id: '3', name: 'Leather', hsn: '42021100', slabs: [] }, { id: '4', name: 'Others', hsn: '42029900', slabs: [] }] },
  { id: 71, mainCat: 'Accessories', category: 'Bags', name: 'Laptop Bags', created: '16 Nov, 2025', status: 'Active', image: 'https://images.unsplash.com/photo-1491637639811-60e2756cc1c7?w=300&h=300&fit=crop', materials: [{ id: '1', name: 'Plastic or Textile', hsn: '42021200', slabs: [] }, { id: '2', name: 'Others', hsn: '42029900', slabs: [] }] },
  { id: 266, mainCat: 'Accessories', category: 'Bags', name: 'Lunch Carry Bags', created: '08 Jan, 2026', status: 'Active', image: 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=300&h=300&fit=crop', materials: [{ id: '1', name: 'Plastic or Other Textile', hsn: '42021900', slabs: [] }, { id: '2', name: 'Jute', hsn: '42022900', slabs: [] }] },
  { id: 72, mainCat: 'Accessories', category: 'Jewellery', name: 'Necklaces', created: '20 Nov, 2025', status: 'Active', image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&h=300&fit=crop', materials: [{ id: '1', name: 'Gold', hsn: '71131100', slabs: [] }, { id: '2', name: 'Silver', hsn: '71131900', slabs: [] }] },
  { id: 73, mainCat: 'Accessories', category: 'Watches', name: 'Analog Watches', created: '20 Nov, 2025', status: 'Active', image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=300&h=300&fit=crop', materials: [{ id: '1', name: 'Leather Strap', hsn: '91011100', slabs: [] }, { id: '2', name: 'Metal Strap', hsn: '91011900', slabs: [] }] },
  { id: 74, mainCat: 'Footwear', category: 'Men\'s Footwear', name: 'Sneakers', created: '22 Nov, 2025', status: 'Active', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=300&fit=crop', materials: [{ id: '1', name: 'Synthetic', hsn: '64029900', slabs: [] }, { id: '2', name: 'Leather', hsn: '64021900', slabs: [] }] },
  { id: 75, mainCat: 'Footwear', category: 'Women\'s Footwear', name: 'Heels', created: '25 Nov, 2025', status: 'Active', image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=300&h=300&fit=crop', materials: [{ id: '1', name: 'Leather', hsn: '64031200', slabs: [] }] },
  { id: 76, mainCat: 'Kids', category: 'Kids Wear', name: 'Baby Rompers', created: '01 Dec, 2025', status: 'Inactive', image: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=300&h=300&fit=crop', materials: [{ id: '1', name: 'Cotton', hsn: '61111000', slabs: [] }, { id: '2', name: 'Synthetic', hsn: '61113000', slabs: [] }] },
  { id: 77, mainCat: 'Women', category: 'Women\'s Clothing', name: 'Sarees', created: '05 Dec, 2025', status: 'Active', image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=300&h=300&fit=crop', materials: [{ id: '1', name: 'Silk', hsn: '62044100', slabs: [] }, { id: '2', name: 'Cotton', hsn: '62044200', slabs: [] }] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);

// ─── Mini Dropdown ────────────────────────────────────────────────────────────
const Dropdown = ({ value, placeholder, options, onChange, style }: any) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={[S.ddWrap, style, Platform.OS === 'web' && open ? S.ddWrapOpen : undefined]}>
      <TouchableOpacity style={S.ddTrigger} onPress={() => setOpen(!open)}>
        <Text style={[S.ddVal, !value && S.ddPh]} numberOfLines={1}>{value || placeholder}</Text>
        <ChevronDownIcon color={open ? C.navy : C.sub} />
      </TouchableOpacity>
      {open && (
        <View style={S.ddMenu}>
          <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {options.map((opt: string) => (
              <TouchableOpacity key={opt} style={[S.ddItem, value === opt && S.ddItemActive]}
                onPress={() => { onChange(opt); setOpen(false); }}>
                <Text style={[S.ddItemText, value === opt && S.ddItemTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

// ─── Material Row ─────────────────────────────────────────────────────────────
const MaterialBlock = ({ mat, onChange, onRemove }: { mat: Material; onChange: (m: Material) => void; onRemove: () => void }) => {
  const addSlab = () => onChange({ ...mat, slabs: [...mat.slabs, { min: '', max: '', gst: '' }] });
  const updateSlab = (i: number, field: string, val: string) => {
    const s = [...mat.slabs]; s[i] = { ...s[i], [field]: val };
    onChange({ ...mat, slabs: s });
  };
  const removeSlab = (i: number) => onChange({ ...mat, slabs: mat.slabs.filter((_, idx) => idx !== i) });

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
        <TextInput style={[S.matInput, { flex: 1 }]} placeholder="e.g. Cotton, Synthetic" placeholderTextColor="#9CA3AF"
          value={mat.name} onChangeText={v => onChange({ ...mat, name: v })} />
        <TextInput style={[S.matInput, { flex: 1 }]} placeholder="HSN e.g. 61112000" placeholderTextColor="#9CA3AF"
          value={mat.hsn} onChangeText={v => onChange({ ...mat, hsn: v })} />
      </View>
      <Text style={S.slabLabel}>Price slabs for this material</Text>
      {mat.slabs.map((slab, i) => (
        <View key={i} style={S.slabRow}>
          <TextInput style={S.slabInput} placeholder="Min Price" placeholderTextColor="#9CA3AF"
            keyboardType="numeric" value={slab.min} onChangeText={v => updateSlab(i, 'min', v)} />
          <TextInput style={S.slabInput} placeholder="Max (Empty=∞)" placeholderTextColor="#9CA3AF"
            keyboardType="numeric" value={slab.max} onChangeText={v => updateSlab(i, 'max', v)} />
          <View style={S.slabGstWrap}>
            <Dropdown value={slab.gst} placeholder="GST%" options={GST_RATES} onChange={(v: string) => updateSlab(i, 'gst', v)} />
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
const AddModal = ({ visible, onClose, onSave, isWeb }: { visible: boolean; onClose: () => void; onSave: (d: any) => void; isWeb: boolean }) => {
  const [category, setCategory] = useState('');
  const [name, setName] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [status, setStatus] = useState('Active');

  const reset = () => { setCategory(''); setName(''); setImage(null); setMaterials([]); setStatus('Active'); };

  const pickImage = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/jpeg,image/png';
      input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (file) { const r = new FileReader(); r.onload = (ev) => setImage(ev.target?.result as string); r.readAsDataURL(file); }
      };
      input.click();
    } else {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
      if (!res.canceled) setImage(res.assets[0].uri);
    }
  };

  const addMaterial = () => setMaterials(prev => [...prev, { id: uid(), name: '', hsn: '', slabs: [] }]);
  const updateMat = (id: string, m: Material) => setMaterials(prev => prev.map(x => x.id === id ? m : x));
  const removeMat = (id: string) => setMaterials(prev => prev.filter(x => x.id !== id));

  const handleSave = () => {
    if (!category) { Alert.alert('Required', 'Please select a category.'); return; }
    if (!name.trim()) { Alert.alert('Required', 'Please enter a subcategory name.'); return; }
    const parts = category.split(' > ');
    onSave({ mainCat: parts[0], category: parts[1] || parts[0], name, image, materials, status });
    reset(); onClose();
  };

  return (
    <Modal visible={visible} transparent animationType={isWeb ? 'fade' : 'slide'} onRequestClose={onClose}>
      <View style={S.modalOverlay}>
        <View style={[S.modalBox, isWeb ? S.modalBoxWeb : S.modalBoxMobile]}>
          {!isWeb && <View style={S.handle} />}
          {/* Header */}
          <View style={S.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={S.modalIconWrap}><LayersIcon color="#FFF" /></View>
              <Text style={S.modalTitle}>Add Subcategory</Text>
            </View>
            <TouchableOpacity style={S.modalCloseBtn} onPress={() => { reset(); onClose(); }}>
              <XIcon color="#FFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={S.modalBody} showsVerticalScrollIndicator={false} nestedScrollEnabled>

            {/* Category Select */}
            <View style={[S.fg, { zIndex: 50 }]}>
              <Text style={S.fl}>Select Category <Text style={S.req}>*</Text></Text>
              <Dropdown value={category} placeholder="-- Select Category --" options={CATEGORY_OPTIONS} onChange={setCategory} />
              {/* HSN helper */}
              <View style={S.hsnNote}>
                <InfoIcon />
                <Text style={S.hsnNoteText}>
                  HSN segregation: Main Category (e.g. Kids Wear) → Category (e.g. 4-digit: 6111, 6209) → Subcategory (e.g. 6–8 digit: 61112000 Cotton, 61113000 Synthetic). Select a category to add subcategories under it. Use HSN codes for tax alignment.
                </Text>
              </View>
            </View>

            {/* Name */}
            <View style={S.fg}>
              <Text style={S.fl}>Subcategory Name</Text>
              <TextInput style={S.input} placeholder="e.g. Backpacks, Sneakers" placeholderTextColor="#9CA3AF"
                value={name} onChangeText={setName} />
            </View>

            {/* Image */}
            <View style={S.fg}>
              <Text style={S.fl}>Subcategory Image <Text style={S.hint}>(for header menu)</Text></Text>
              <TouchableOpacity style={S.imgPicker} onPress={pickImage} activeOpacity={0.7}>
                {image ? (
                  <Image source={{ uri: image }} style={S.imgPreview} resizeMode="cover" />
                ) : (
                  <View style={S.imgPickerInner}>
                    <UploadIcon />
                    <Text style={S.imgPickerTitle}>Drag & drop image here or browse</Text>
                    <Text style={S.imgPickerSub}>JPG, PNG · Max 2MB</Text>
                  </View>
                )}
              </TouchableOpacity>
              {image && (
                <TouchableOpacity onPress={() => setImage(null)}>
                  <Text style={{ fontSize: 12, color: C.inactive, marginTop: 4 }}>Remove image</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Materials */}
            <View style={S.fg}>
              <View style={S.matHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <TagIcon />
                  <Text style={S.fl}>Material type → HSN & Price Slabs</Text>
                </View>
                <TouchableOpacity style={S.addMatBtn} onPress={addMaterial}>
                  <PlusIcon color="#FFF" />
                  <Text style={S.addMatText}>Add Material</Text>
                </TouchableOpacity>
              </View>
              <Text style={S.hint2}>Add each material type (e.g. Cotton, Synthetic) with its HSN code and GST price slabs.</Text>
              {materials.map(mat => (
                <MaterialBlock key={mat.id} mat={mat}
                  onChange={m => updateMat(mat.id, m)}
                  onRemove={() => removeMat(mat.id)}
                />
              ))}
              {materials.length === 0 && (
                <Text style={{ fontSize: 12, color: C.sub, marginTop: 4 }}>No materials added yet. Click "Add Material" to start.</Text>
              )}
            </View>

            {/* Status */}
            <View style={[S.fg, { zIndex: 20 }]}>
              <Text style={S.fl}>Status</Text>
              <Dropdown value={status} placeholder="Select Status" options={['Active', 'Inactive']} onChange={setStatus} />
            </View>

          </ScrollView>

          {/* Footer */}
          <View style={S.modalFooter}>
            <TouchableOpacity style={S.cancelBtn} onPress={() => { reset(); onClose(); }}>
              <Text style={S.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={S.saveBtn} onPress={handleSave}>
              <Text style={S.saveText}>Save Subcategory</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Grid Card ────────────────────────────────────────────────────────────────
const GridCard = ({ item, onDelete }: { item: Subcategory; onDelete: () => void }) => (
  <View style={S.card}>
    {/* Image */}
    <View style={S.cardImgWrap}>
      {item.image
        ? <Image source={{ uri: item.image }} style={S.cardImg} resizeMode="cover" />
        : <View style={S.cardImgPlaceholder}><LayersIcon color={C.navy} /></View>
      }
      <View style={[S.cardStatusPill, { backgroundColor: item.status === 'Active' ? C.activeLight : C.inactiveLight }]}>
        <Text style={[S.cardStatusText, { color: item.status === 'Active' ? C.active : C.inactive }]}>{item.status}</Text>
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

      {/* Material chips */}
      <View style={S.chips}>
        {item.materials.slice(0, 3).map(m => (
          <View key={m.id} style={S.matChip}>
            <Text style={S.matChipText}>{m.name}</Text>
          </View>
        ))}
        {item.materials[0]?.slabs[0]?.gst && (
          <View style={S.gstChipStyle}>
            <Text style={S.gstChipText}>GST: {item.materials[0].slabs[0].gst}</Text>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={S.cardFooter}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <CalendarIcon />
          <Text style={S.cardDate}>{item.created}</Text>
        </View>
        <View style={S.cardActions}>
          <TouchableOpacity style={S.editBtn}><EditIcon /></TouchableOpacity>
          <TouchableOpacity style={S.deleteBtn} onPress={onDelete}><TrashIcon /></TouchableOpacity>
        </View>
      </View>
    </View>
  </View>
);

// ─── List Table ───────────────────────────────────────────────────────────────
const ListTable = ({ items, onDelete }: { items: Subcategory[]; onDelete: (id: number) => void }) => (
  <View style={S.tableWrap}>
    {/* Header */}
    <View style={S.tHead}>
      <Text style={[S.th, S.cId]}>ID</Text>
      <Text style={[S.th, S.cMain]}>Main Category</Text>
      <Text style={[S.th, S.cCat]}>Category</Text>
      <Text style={[S.th, S.cName]}>Subcategory Name</Text>
      <Text style={[S.th, S.cMat]}>Materials</Text>
      <Text style={[S.th, S.cDate]}>Created Date</Text>
      <Text style={[S.th, S.cStatus]}>Status</Text>
      <Text style={[S.th, S.cAction, { textAlign: 'center' }]}>Action</Text>
    </View>

    {items.map((item, idx) => (
      <View key={item.id} style={[S.tRow, idx % 2 === 1 && S.tRowAlt]}>
        <View style={[S.cell, S.cId]}><Text style={S.tdId}>{item.id}</Text></View>
        <View style={[S.cell, S.cMain]}><Text style={S.tdText}>{item.mainCat}</Text></View>
        <View style={[S.cell, S.cCat]}><Text style={S.tdText}>{item.category}</Text></View>
        <View style={[S.cell, S.cName]}><Text style={S.tdBold}>{item.name}</Text></View>
        <View style={[S.cell, S.cMat]}>
          <Text style={S.tdMat}>{item.materials.map(m => m.name).join(', ')}</Text>
        </View>
        <View style={[S.cell, S.cDate]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <CalendarIcon />
            <Text style={S.tdDate}>{item.created}</Text>
          </View>
        </View>
        <View style={[S.cell, S.cStatus]}>
          <View style={[S.statusBadge, { backgroundColor: item.status === 'Active' ? C.activeLight : C.inactiveLight }]}>
            <View style={[S.statusDot, { backgroundColor: item.status === 'Active' ? C.active : C.inactive }]} />
            <Text style={[S.statusText, { color: item.status === 'Active' ? C.active : C.inactive }]}>{item.status}</Text>
          </View>
        </View>
        <View style={[S.cell, S.cAction, { flexDirection: 'row', gap: 6, justifyContent: 'center' }]}>
          <TouchableOpacity style={S.editBtn}><EditIcon /></TouchableOpacity>
          <TouchableOpacity style={S.deleteBtn} onPress={() => onDelete(item.id)}><TrashIcon /></TouchableOpacity>
        </View>
      </View>
    ))}
  </View>
);

// ─── Pagination ───────────────────────────────────────────────────────────────
const Pagination = ({ page, total, onPrev, onNext, onPage }: any) => {
  const pages = Array.from({ length: total }, (_, i) => i + 1);
  return (
    <View style={S.pagination}>
      <TouchableOpacity style={[S.pageBtn, page === 1 && S.pageBtnOff]} onPress={onPrev} disabled={page === 1}>
        <ChevronLeft />
      </TouchableOpacity>
      {pages.map(p => (
        <TouchableOpacity key={p} style={[S.pageBtn, p === page && S.pageBtnActive]} onPress={() => onPage(p)}>
          <Text style={[S.pageBtnText, p === page && S.pageBtnTextActive]}>{p}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={[S.pageBtn, page === total && S.pageBtnOff]} onPress={onNext} disabled={page === total}>
        <ChevronRight2 />
      </TouchableOpacity>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function Subcategories() {
  const { width } = useWindowDimensions();
  const isWeb = width >= 768;

  const [items, setItems] = useState<Subcategory[]>(SAMPLE);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [mainCatFilter, setMainCatFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = items.filter(i => {
    const q = search.toLowerCase();
    const matchSearch = !search || i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q) || i.mainCat.toLowerCase().includes(q);
    const matchCat = mainCatFilter === 'All' || i.mainCat === mainCatFilter;
    return matchSearch && matchCat;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleSave = (data: any) => {
    setItems(prev => [{
      id: Math.max(...prev.map(x => x.id)) + 1,
      mainCat: data.mainCat, category: data.category, name: data.name,
      materials: data.materials, status: data.status, image: data.image,
      created: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    }, ...prev]);
    setPage(1);
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete', 'Delete this subcategory?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setItems(prev => prev.filter(i => i.id !== id)) },
    ]);
  };

  const handleExport = () => Alert.alert('Export', 'CSV export triggered.');

  return (
    <AdminLayout>
      <ScrollView style={S.root} contentContainerStyle={S.rootContent} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={S.pageHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={S.pageIconWrap}><LayersIcon color="#FFF" /></View>
            <View>
              <Text style={S.pageTitle}>Subcategories</Text>
              <Text style={S.pageSub}>Manage product subcategories</Text>
            </View>
          </View>
          <TouchableOpacity style={S.exportBtn} onPress={handleExport}>
            <DownloadIcon />
            <Text style={S.exportText}>{isWeb ? 'Export CSV' : 'CSV'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Toolbar ── */}
        <View style={S.toolbar}>
          {/* Search */}
          <View style={S.searchBox}>
            <SearchIcon />
            <TextInput style={S.searchInput} placeholder="Search subcategories..." placeholderTextColor="#9CA3AF"
              value={search} onChangeText={t => { setSearch(t); setPage(1); }} />
          </View>
          <View style={S.toolbarRight}>
            {/* View Toggle */}
            <View style={S.viewToggle}>
              <TouchableOpacity style={[S.vtBtn, view === 'grid' && S.vtBtnActive]} onPress={() => setView('grid')}>
                <GridIcon active={view === 'grid'} />
              </TouchableOpacity>
              <TouchableOpacity style={[S.vtBtn, view === 'list' && S.vtBtnActive]} onPress={() => setView('list')}>
                <ListIcon active={view === 'list'} />
              </TouchableOpacity>
            </View>
            {/* Main Category Filter */}
            <View style={{ width: isWeb ? 180 : 150, zIndex: 30 }}>
              <Dropdown value={mainCatFilter === 'All' ? '' : mainCatFilter}
                placeholder="Main Category" options={MAIN_CATS}
                onChange={(v: string | undefined) => { setMainCatFilter(v || 'All'); setPage(1); }} />
            </View>
            {/* Add Button */}
            <TouchableOpacity style={S.addBtn} onPress={() => setModalOpen(true)}>
              <PlusIcon />
              <Text style={S.addBtnText}>{isWeb ? 'Add Subcategory' : 'Add'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Count ── */}
        <Text style={S.countText}>Showing {paginated.length} of {filtered.length} subcategories</Text>

        {/* ── Content ── */}
        {view === 'grid' ? (
          <View style={[S.grid, isWeb && S.gridWeb]}>
            {paginated.map(item => (
              <GridCard key={item.id} item={item} onDelete={() => handleDelete(item.id)} />
            ))}
          </View>
        ) : (
          <ListTable items={paginated} onDelete={handleDelete} />
        )}

        {filtered.length === 0 && (
          <View style={S.empty}>
            <LayersIcon color="#D1D5DB" />
            <Text style={S.emptyTitle}>No subcategories found</Text>
            <Text style={S.emptySub}>Try adjusting filters or add a new subcategory</Text>
          </View>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <Pagination page={page} total={totalPages}
            onPrev={() => setPage(p => Math.max(1, p - 1))}
            onNext={() => setPage(p => Math.min(totalPages, p + 1))}
            onPage={setPage}
          />
        )}
      </ScrollView>

      <AddModal visible={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} isWeb={isWeb} />
    </AdminLayout>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, overflow: 'visible' },
  rootContent: { padding: 20, paddingBottom: 48 },

  // Header
  pageHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.navy, borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 16, marginBottom: 18,
  },
  pageIconWrap: { width: 42, height: 42, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 20, fontWeight: '700', color: '#FFF', letterSpacing: -0.3 },
  pageSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.primary, borderRadius: 9, paddingHorizontal: 13, paddingVertical: 9 },
  exportText: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  // Toolbar
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap', width: '100%' },
  searchBox: { flex: 1, minWidth: 180, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, height: 42 },
  searchInput: { flex: 1, fontSize: 14, color: C.text, outlineStyle: 'none' } as any,
  toolbarRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' },
  viewToggle: { flexDirection: 'row', backgroundColor: C.navyLight, borderRadius: 10, padding: 3 },
  vtBtn: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  vtBtnActive: { backgroundColor: C.navy },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.navy, borderRadius: 10, paddingHorizontal: 14, height: 42 },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  countText: { fontSize: 13, color: C.sub, marginBottom: 14 },

  // Grid
  grid: { flexDirection: 'column', gap: 14 },
  gridWeb: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },

  // Card
  card: {
    backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border,
    overflow: 'hidden', width: '100%',
    shadowColor: C.navy, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
    ...(Platform.OS === 'web' ? { width: 'calc(33.33% - 11px)' as any, minWidth: 260, flexShrink: 0 } : {}),
  },
  cardImgWrap: { position: 'relative', height: 200, backgroundColor: C.navyLight },
  cardImg: { width: '100%', height: '100%' },
  cardImgPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardStatusPill: { position: 'absolute', top: 10, right: 10, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  cardStatusText: { fontSize: 11, fontWeight: '700' },
  cardBody: { padding: 14, gap: 8 },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  breadcrumbText: { fontSize: 11, color: C.sub, fontWeight: '500' },
  breadcrumbSep: { fontSize: 11, color: C.sub },
  cardName: { fontSize: 16, fontWeight: '700', color: C.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  matChip: { backgroundColor: C.matChip, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  matChipText: { fontSize: 11, fontWeight: '600', color: C.matChipText },
  gstChipStyle: { backgroundColor: C.gstChip, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  gstChipText: { fontSize: 11, fontWeight: '600', color: C.gstChipText },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  cardDate: { fontSize: 12, color: C.sub },
  cardActions: { flexDirection: 'row', gap: 7 },
  editBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: C.inactive, alignItems: 'center', justifyContent: 'center' },

  // Table
  tableWrap: { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden', width: '100%' },
  tHead: { flexDirection: 'row', backgroundColor: C.navy, width: '100%' },
  th: { paddingVertical: 14, paddingHorizontal: 12, fontSize: 11, fontWeight: '700', color: '#FFF', textTransform: 'uppercase', letterSpacing: 0.5 },
  tRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border, alignItems: 'center', minHeight: 68, width: '100%', backgroundColor: C.surface },
  tRowAlt: { backgroundColor: C.rowAlt },
  cell: { paddingVertical: 13, paddingHorizontal: 12, justifyContent: 'center' },
  cId:     { width: 60 },
  cMain:   { flex: 1, minWidth: 110 },
  cCat:    { flex: 1, minWidth: 100 },
  cName:   { flex: 1.2, minWidth: 120 },
  cMat:    { flex: 2, minWidth: 160 },
  cDate:   { width: 130 },
  cStatus: { width: 96 },
  cAction: { width: 90 },
  tdId:   { fontSize: 13, fontWeight: '700', color: C.sub },
  tdText: { fontSize: 13, color: C.text },
  tdBold: { fontSize: 13, fontWeight: '600', color: C.text },
  tdMat:  { fontSize: 12, color: C.matChipText },
  tdDate: { fontSize: 12, color: C.sub },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },

  // Pagination
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 24 },
  pageBtn: { width: 36, height: 36, borderRadius: 9, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  pageBtnActive: { backgroundColor: C.navy, borderColor: C.navy },
  pageBtnOff: { opacity: 0.35 },
  pageBtnText: { fontSize: 13, fontWeight: '600', color: C.text },
  pageBtnTextActive: { color: '#FFF' },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: C.text, marginTop: 8 },
  emptySub: { fontSize: 13, color: C.sub },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', alignItems: 'center' },
  modalBox: { backgroundColor: C.surface, width: '100%' },
  modalBoxWeb: { width: 580, maxHeight: '90%', borderRadius: 18, alignSelf: 'center', position: 'absolute', top: '4%', overflow: 'visible' },
  modalBoxMobile: { borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '93%', paddingBottom: 32, overflow: 'visible' },
  handle: { width: 40, height: 4, backgroundColor: '#D1D5DB', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.15)',
    backgroundColor: C.navy, borderTopLeftRadius: 18, borderTopRightRadius: 18,
  },
  modalIconWrap: { width: 34, height: 34, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  modalBody: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 8 },

  // Form
  fg: { marginBottom: 18 },
  fl: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 6 },
  req: { color: C.inactive },
  hint: { fontSize: 12, fontWeight: '400', color: C.sub },
  input: { backgroundColor: C.bg, borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.text, outlineStyle: 'none' } as any,

  // HSN note
  hsnNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, backgroundColor: '#EFF6FF', borderRadius: 9, padding: 11, marginTop: 8 },
  hsnNoteText: { fontSize: 12, color: '#1D4ED8', flex: 1, lineHeight: 18 },

  // Image picker
  imgPicker: { borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed', borderRadius: 12, overflow: 'hidden', minHeight: 120, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  imgPickerInner: { alignItems: 'center', gap: 6, padding: 20 },
  imgPickerTitle: { fontSize: 13, fontWeight: '600', color: C.text },
  imgPickerSub: { fontSize: 11, color: C.sub },
  imgPreview: { width: '100%', height: 150 },

  // Materials
  matHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  addMatBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.primary, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 7 },
  addMatText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  hint2: { fontSize: 12, color: C.sub, marginBottom: 10 },
  matBlock: { backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 10 },
  matBlockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  matBlockLabel: { fontSize: 13, fontWeight: '700', color: C.text },
  removeMatBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.inactiveLight, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 5 },
  removeMatText: { fontSize: 12, fontWeight: '600', color: C.inactive },
  matRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  matInput: { backgroundColor: C.surface, borderRadius: 9, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: C.text, outlineStyle: 'none' } as any,
  slabLabel: { fontSize: 12, fontWeight: '600', color: C.sub, marginBottom: 8 },
  slabRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 8 },
  slabInput: { flex: 1, backgroundColor: C.surface, borderRadius: 8, borderWidth: 1, borderColor: C.border, paddingHorizontal: 10, paddingVertical: 9, fontSize: 13, color: C.text, outlineStyle: 'none' } as any,
  slabGstWrap: { width: 90 },
  slabDelete: { width: 34, height: 34, borderRadius: 8, backgroundColor: C.inactive, alignItems: 'center', justifyContent: 'center' },
  addSlabBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, alignSelf: 'flex-start' },
  addSlabText: { fontSize: 12, fontWeight: '600', color: C.navy },

  // Dropdown
  ddWrap: { position: 'relative', zIndex: 10, overflow: 'visible' },
  ddWrapOpen: { zIndex: 9999 },
  ddTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.bg, borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 12 },
  ddVal: { fontSize: 14, color: C.text, flex: 1 },
  ddPh: { color: '#9CA3AF' },
  ddMenu: { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: C.surface, borderRadius: 10, borderWidth: 1, borderColor: C.border, marginTop: 4, zIndex: 10000, overflow: 'visible', shadowColor: C.navy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 10 },
  ddItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.bg },
  ddItemActive: { backgroundColor: C.navyLight },
  ddItemText: { fontSize: 14, color: C.text },
  ddItemTextActive: { color: C.navy, fontWeight: '700' },

  // Modal footer
  modalFooter: { flexDirection: 'row', gap: 10, paddingHorizontal: 22, paddingVertical: 16, borderTopWidth: 1, borderTopColor: C.border },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface },
  cancelText: { fontSize: 14, fontWeight: '700', color: C.sub },
  saveBtn: { flex: 2, paddingVertical: 13, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: C.navy },
  saveText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});