/**
 * EditProduct.tsx
 * React Native – Multi-step "Edit Product" screen
 *
 * Dependencies (install via npm/yarn):
 *   react-native
 *   @react-navigation/native  (for navigation.goBack())
 *   react-native-safe-area-context
 *
 * Icons are inline SVG-free replacements using text characters / emoji,
 * so no extra icon library is required. Swap with @expo/vector-icons or
 * react-native-vector-icons as you prefer.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import AdminLayout from "@/components/admin-layout";
import { router, useLocalSearchParams } from "expo-router";
import { getApiErrorMessage } from "@/lib/api/client";
import { fetchProductDetail } from "@/services/productApi";
import {
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const COLORS = {
  navy: '#1A2B6D',
  navyDeep: '#0F1A4A',
  navyMid: '#243380',
  navyLight: '#3D52A0',
  navyGhost: '#EEF1FA',
  navyBorder: '#C5CCEA',
  white: '#FFFFFF',
  bg: '#F4F6FB',
  border: '#E8EBF4',
  inputBg: '#F8F9FD',
  textDark: '#0D1340',
  textMid: '#4B5680',
  textLight: '#9AA3C2',
  textPh: '#B8BDD6',
  red: '#E53E3E',
  redPale: '#FFF5F5',
  green: '#2ECC71',
  greenPale: '#EAFAF2',
  greenText: '#1A9B52',
  acc1: '#7C3AED',
  acc2: '#0078A8',
  acc3: '#6C3FC5',
  acc4: '#C47D0E',
  acc5: '#1A8A5A',
  amber: '#D97706',
  amberPale: '#FEF3C7',
};

const STEP_CONFIG = [
  { key: 'basic', label: 'Basic Info', color: '#7C3AED', icon: 'ℹ' },
  { key: 'variants', label: 'Variants', color: '#0891B2', icon: '⚙' },
  { key: 'images', label: 'Images', color: '#059669', icon: '🖼' },
  { key: 'details', label: 'Details', color: '#D97706', icon: '📄' },
];

const CATEGORIES = [
  'Clothing', 'Electronics', 'Footwear', 'Bags', 'Accessories',
  'Sports', 'Home & Living', 'Jewellery', 'Ethnic Wear', 'Western Wear',
];
const SUBCATEGORIES: Record<string, string[]> = {
  Clothing: ['T-Shirts','Shirts','Jeans','Dresses','Jackets','Shorts','Innerwear','Ethnic Wear','Kurta Set','Track Pants'],
  Electronics: ['Mobiles','Laptops','Headphones','Cameras','Tablets'],
  Footwear: ['Sneakers','Sandals','Formal','Sports','Boots','Casual Shoes','Flip Flops'],
  Bags: ['Backpacks','Handbags','Wallets','Travel Bags','Laptop Bags'],
  Accessories: ['Watches','Sunglasses','Jewelry','Belts','Caps','Hair Accessories'],
  Sports: ['Cricket','Football','Tennis','Yoga','Gym'],
  'Home & Living': ['Furniture','Decor','Kitchen','Bedding','Wall Clock'],
  Jewellery: ['Earrings','Necklaces','Rings','Bangles','Pendants'],
  'Ethnic Wear': ['Sarees','Kurtas & Kurtis','Lehenga Cholis','Dress Material'],
  'Western Wear': ['Dresses','Jeans','Tops','Trousers'],
};
const COLORS_LIST = ['Red','Blue','Green','Black','White','Yellow','Pink','Purple','Orange','Gray','Navy','Maroon'];
const SIZES_LIST = ['XS','S','M','L','XL','XXL','Free Size','28','30','32','34','36','38','40'];
const MATERIAL_TYPES = ['Cotton','Polyester','Wool','Silk','Linen','Nylon','Leather','Canvas','Denim','Viscose','Blend'];
const DELIVERY_OPTIONS = ['Standard Delivery','Express Delivery','Same Day Delivery','Pickup Only'];
const RETURN_POLICIES = ['7 Days Return','14 Days Return','30 Days Return','No Return'];
const SIZE_CHART_COLS = ['Size','Chest/Bust','Waist','Hip','Length','Sleeve'];

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Variant {
  id: string;
  color: string;
  size: string;
  sku: string;
  stock: string;
  mrp: string;
  sellingPrice: string;
  discount: string;
}
interface BasicInfo {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  materialType: string;
  hsnCode: string;
  shortDesc: string;
  fullDesc: string;
  length: string; width: string; height: string;
  weight: string;
  fragile: 'Yes' | 'No';
  customized: boolean;
  custTitle: string;
  custInstructions: string;
  custAllowPhoto: boolean;
  custImageLabel: string;
  custAllowText: boolean;
  custTextLabel: string;
}
interface ProductImages {
  primaryImage: string | null;
  additionalImages: string[];
  video: string | null;
}
interface ProductDetails {
  sizeChart: string;
  returnPolicy: string;
  returnPolicyText: string;
  deliveryOption: string;
  minDays: string;
  maxDays: string;
  deliveryInfo: string;
  warranty: string;
  careInstructions: string;
}
interface SizeChartRow {
  id: string; size: string; chest: string; waist: string;
  hip: string; length: string; sleeve: string;
}
interface AppState {
  step: number;
  isDirty: boolean;
  basic: BasicInfo;
  variants: Variant[];
  images: ProductImages;
  details: ProductDetails;
  features: string[];
  specs: { name: string; value: string }[];
  sizeChartRows: SizeChartRow[];
  sizeChartOptions: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIAL STATE
// ─────────────────────────────────────────────────────────────────────────────

const INITIAL_STATE: AppState = {
  step: 0,
  isDirty: false,
  basic: {
    id: 'PROD-001', name: 'Classic Polo T-Shirt', category: 'Clothing',
    subcategory: 'T-Shirts', materialType: 'Cotton', hsnCode: '6109',
    shortDesc: 'Premium combed cotton polo with embroidered logo.',
    fullDesc: 'This classic polo t-shirt is crafted from 100% premium combed cotton.',
    length: '30', width: '25', height: '2', weight: '0.3',
    fragile: 'No', customized: false,
    custTitle: '', custInstructions: '', custAllowPhoto: false,
    custImageLabel: '', custAllowText: false, custTextLabel: '',
  },
  variants: [
    { id: 'v1', color: 'White', size: 'M', sku: 'SKU-001', stock: '50', mrp: '999', sellingPrice: '799', discount: '20' },
    { id: 'v2', color: 'Black', size: 'L', sku: 'SKU-002', stock: '8',  mrp: '999', sellingPrice: '799', discount: '20' },
  ],
  images: {
    primaryImage: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80',
    additionalImages: [
      'https://images.unsplash.com/photo-1503341338985-95083d48f2fb?w=400&q=80',
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400&q=80',
    ],
    video: null,
  },
  details: {
    sizeChart: 'Standard Apparel', returnPolicy: '7 Days Return',
    returnPolicyText: 'Items must be returned in original condition within 7 days of delivery.',
    deliveryOption: 'Standard Delivery', minDays: '3', maxDays: '7', deliveryInfo: '',
    warranty: '', careInstructions: 'Machine wash cold. Tumble dry low.',
  },
  features: ['100% Premium Combed Cotton','Bio-Washed for Extra Softness','Embroidered Logo','Regular Fit'],
  specs: [
    { name: 'Fabric', value: '100% Cotton' }, { name: 'Fit', value: 'Regular' },
    { name: 'Neck', value: 'Polo / Collar' }, { name: 'Sleeve', value: 'Short Sleeve' },
  ],
  sizeChartRows: [{ id: 'r1', size: 'S', chest: '34-36', waist: '28-30', hip: '36-38', length: '28', sleeve: '32-34' }],
  sizeChartOptions: ['No Size Chart', 'Standard Apparel', 'Small Chart', 'Large Chart'],
};

// ─────────────────────────────────────────────────────────────────────────────
// SMALL REUSABLE COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const Divider = () => <View style={styles.divider} />;

const SectionHeader = ({ label, color }: { label: string; color: string }) => (
  <View style={[styles.sectionHeader, { borderLeftColor: color }]}>
    <Text style={[styles.sectionHeaderText, { color }]}>{label}</Text>
  </View>
);

const FieldLabel = ({ text, required }: { text: string; required?: boolean }) => (
  <Text style={styles.fieldLabel}>
    {text}{required && <Text style={{ color: COLORS.red }}> *</Text>}
  </Text>
);

const HintText = ({ text }: { text: string }) => (
  <Text style={styles.hint}>{text}</Text>
);

const FieldWrap = ({ children, error }: { children: React.ReactNode; error?: boolean }) => (
  <View style={[styles.fieldWrap, error && styles.fieldWrapError]}>{children}</View>
);

const DropButton = ({
  value, placeholder, onPress, error,
}: { value?: string; placeholder: string; onPress: () => void; error?: boolean }) => (
  <TouchableOpacity style={[styles.dropButton, error && styles.fieldWrapError]} onPress={onPress} activeOpacity={0.8}>
    <Text style={[styles.dropButtonText, !value && styles.placeholder]} numberOfLines={1}>
      {value || placeholder}
    </Text>
    <Text style={styles.chevron}>›</Text>
  </TouchableOpacity>
);

const Toggle = ({ value, onToggle }: { value: boolean; onToggle: () => void }) => (
  <TouchableOpacity
    style={[styles.toggle, value && { backgroundColor: COLORS.acc5 }]}
    onPress={onToggle}
    activeOpacity={0.85}
  >
    <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
  </TouchableOpacity>
);

const Card = ({ children, zIndex }: { children: React.ReactNode; zIndex?: number }) => (
  <View style={[styles.card, zIndex ? { zIndex } : {}]}>{children}</View>
);

const OutlineButton = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <TouchableOpacity style={styles.outlineButton} onPress={onPress} activeOpacity={0.8}>
    <Text style={styles.outlineButtonText}>{label}</Text>
  </TouchableOpacity>
);

// Toast
interface ToastMsg { id: number; message: string; type: 'error' | 'success' }
let _toastId = 0;

// ─────────────────────────────────────────────────────────────────────────────
// PICKER MODAL
// ─────────────────────────────────────────────────────────────────────────────

const PickerModal = ({
  visible, title, options, current, onSelect, onClose,
}: {
  visible: boolean; title: string; options: string[];
  current: string; onSelect: (v: string) => void; onClose: () => void;
}) => (
  <Modal visible={visible} transparent animationType="slide">
    <Pressable style={styles.modalOverlay} onPress={onClose}>
      <View style={styles.modalSheet}>
        <View style={styles.modalDrag} />
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
            <Text style={styles.modalCloseTxt}>✕</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={options}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.pickerItem, item === current && styles.pickerItemSelected]}
              onPress={() => { onSelect(item); onClose(); }}
            >
              <Text style={[styles.pickerItemText, item === current && styles.pickerItemTextSelected]}>
                {item}
              </Text>
              {item === current && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          )}
        />
      </View>
    </Pressable>
  </Modal>
);

// ─────────────────────────────────────────────────────────────────────────────
// SUCCESS MODAL
// ─────────────────────────────────────────────────────────────────────────────

const SuccessModal = ({ visible, productId, onClose }: {
  visible: boolean; productId: string; onClose: () => void;
}) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.successOverlay}>
      <View style={styles.successCard}>
        <View style={styles.successTopBar} />
        <View style={styles.successIconOuter}>
          <View style={styles.successIconInner}>
            <Text style={styles.successCheckmark}>✓</Text>
          </View>
        </View>
        <Text style={styles.successTitle}>Product Updated!</Text>
        <Text style={styles.successSub}>Your changes have been saved{'\n'}and are now live.</Text>
        <Divider />
        <View style={styles.successInfoStrip}>
          <Text style={styles.successInfoLabel}>PRODUCT ID</Text>
          <Text style={styles.successInfoVal}>{productId}</Text>
          <View style={styles.activePill}>
            <View style={styles.activeDot} />
            <Text style={styles.activePillTxt}>Active</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.successBtn} onPress={onClose}>
          <Text style={styles.successBtnTxt}>Done</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.successSecLink}>Continue editing</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// ─────────────────────────────────────────────────────────────────────────────
// DISCARD MODAL
// ─────────────────────────────────────────────────────────────────────────────

const DiscardModal = ({ visible, onDiscard, onKeep }: {
  visible: boolean; onDiscard: () => void; onKeep: () => void;
}) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.discardOverlay}>
      <View style={styles.discardSheet}>
        <View style={styles.discardIcon}><Text style={{ fontSize: 32 }}>⚠</Text></View>
        <Text style={styles.discardTitle}>Discard Changes?</Text>
        <Text style={styles.discardBody}>You have unsaved edits. If you leave now, your changes will be lost.</Text>
        <TouchableOpacity style={styles.discardBtn} onPress={onDiscard}>
          <Text style={styles.discardBtnTxt}>Yes, Discard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.discardKeep} onPress={onKeep}>
          <Text style={styles.discardKeepTxt}>Keep Editing</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 – BASIC INFO
// ─────────────────────────────────────────────────────────────────────────────

const StepBasic = ({
  state, setState, openPicker,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  openPicker: (title: string, options: string[], current: string, onSelect: (v: string) => void) => void;
}) => {
  const b = state.basic;
  const update = (field: Partial<BasicInfo>) => setState(s => ({ ...s, isDirty: true, basic: { ...s.basic, ...field } }));

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.stepScroll} keyboardShouldPersistTaps="handled">
      {/* ID Badge */}
      <View style={styles.idBadge}>
        <Text style={styles.idText}>Product ID: {b.id}</Text>
        <View style={styles.idStatus}><Text style={styles.idStatusTxt}>● Active</Text></View>
      </View>

      {/* Identity */}
      <Card zIndex={10}>
        <SectionHeader label="Product Identity" color={COLORS.acc1} />
        <Divider />
        <FieldLabel text="Product Name" required />
        <FieldWrap>
          <TextInput style={styles.input} value={b.name} onChangeText={v => update({ name: v })} placeholder="Enter product name" placeholderTextColor={COLORS.textPh} />
        </FieldWrap>

        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <FieldLabel text="Category" required />
            <DropButton
              value={b.category} placeholder="Select category"
              onPress={() => openPicker('Select Category', CATEGORIES, b.category, v => update({ category: v, subcategory: '' }))}
            />
          </View>
          <View style={{ width: 10 }} />
          <View style={{ flex: 1 }}>
            <FieldLabel text="Subcategory" required />
            <DropButton
              value={b.subcategory} placeholder="Select sub"
              onPress={() => b.category && openPicker('Select Subcategory', SUBCATEGORIES[b.category] || [], b.subcategory, v => update({ subcategory: v }))}
            />
          </View>
        </View>

        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <FieldLabel text="Material Type" required />
            <DropButton
              value={b.materialType} placeholder="Select material"
              onPress={() => openPicker('Select Material', MATERIAL_TYPES, b.materialType, v => update({ materialType: v }))}
            />
            <HintText text="Primary material of the product" />
          </View>
          <View style={{ width: 10 }} />
          <View style={{ flex: 1 }}>
            <FieldLabel text="HSN Code" required />
            <FieldWrap>
              <TextInput style={styles.input} value={b.hsnCode} onChangeText={v => update({ hsnCode: v })} placeholder="e.g. 6109" placeholderTextColor={COLORS.textPh} keyboardType="numeric" />
            </FieldWrap>
            <HintText text="Edit if needed" />
          </View>
        </View>
      </Card>

      {/* Descriptions */}
      <Card>
        <SectionHeader label="Descriptions" color={COLORS.acc2} />
        <Divider />
        <FieldLabel text="Short Description" required />
        <FieldWrap>
          <TextInput
            style={[styles.input, { minHeight: 72, textAlignVertical: 'top', paddingTop: 10 }]}
            value={b.shortDesc} multiline maxLength={250}
            onChangeText={v => update({ shortDesc: v })}
            placeholder="Short description…" placeholderTextColor={COLORS.textPh}
          />
        </FieldWrap>
        <Text style={styles.charCount}>{(b.shortDesc || '').length}/250</Text>

        <FieldLabel text="Full Description" required />
        <FieldWrap>
          <TextInput
            style={[styles.input, { minHeight: 120, textAlignVertical: 'top', paddingTop: 10 }]}
            value={b.fullDesc} multiline maxLength={2000}
            onChangeText={v => update({ fullDesc: v })}
            placeholder="Full description…" placeholderTextColor={COLORS.textPh}
          />
        </FieldWrap>
        <Text style={styles.charCount}>{(b.fullDesc || '').length}/2000</Text>
      </Card>

      {/* Dimensions */}
      <Card>
        <SectionHeader label="Product Dimensions" color={COLORS.acc3} />
        <Divider />
        <Text style={styles.cardHint}>Enter gross dimensions (including packaging)</Text>
        <View style={styles.row3}>
          {([['Length cm', 'length'], ['Width cm', 'width'], ['Height cm', 'height']] as [string, keyof BasicInfo][]).map(([lbl, key]) => (
            <View key={key} style={{ flex: 1 }}>
              <FieldLabel text={lbl} required />
              <FieldWrap>
                <TextInput style={styles.input} value={b[key] as string} onChangeText={v => update({ [key]: v.replace(/[^0-9.]/g, '') } as any)} placeholder="0" placeholderTextColor={COLORS.textPh} keyboardType="numeric" />
              </FieldWrap>
            </View>
          ))}
        </View>
      </Card>

      {/* Weight */}
      <Card>
        <SectionHeader label="Weight & Delivery" color={COLORS.acc4} />
        <Divider />
        <Text style={styles.cardHint}>Enter gross weight (including packaging)</Text>
        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <FieldLabel text="Weight (kg)" required />
            <FieldWrap>
              <TextInput style={styles.input} value={b.weight} onChangeText={v => update({ weight: v })} placeholder="0.5" placeholderTextColor={COLORS.textPh} keyboardType="decimal-pad" />
            </FieldWrap>
          </View>
          <View style={{ width: 10 }} />
          <View style={{ flex: 1 }}>
            <FieldLabel text="Weight Slab" />
            <DropButton value="" placeholder="Auto-selected" onPress={() => {}} />
          </View>
        </View>
        <Divider />
        <FieldLabel text="Fragile Item?" />
        <View style={styles.radioRow}>
          {(['Yes', 'No'] as ('Yes' | 'No')[]).map(opt => (
            <TouchableOpacity
              key={opt}
              style={[styles.radioPill, b.fragile === opt && styles.radioPillOn]}
              onPress={() => update({ fragile: opt })}
            >
              <View style={[styles.radioDot, b.fragile === opt && styles.radioDotOn]} />
              <Text style={[styles.radioPillText, b.fragile === opt && styles.radioPillTextOn]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Customization */}
      <Card>
        <SectionHeader label="Customization" color={COLORS.acc5} />
        <Divider />
        <TouchableOpacity style={styles.customRow} onPress={() => update({ customized: !b.customized })}>
          <Toggle value={b.customized} onToggle={() => update({ customized: !b.customized })} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.customTitle}>Customized Product</Text>
            <Text style={styles.customSub}>Enable if buyers can personalise this product</Text>
          </View>
        </TouchableOpacity>

        {b.customized && (
          <View style={{ marginTop: 4 }}>
            <Divider />
            <FieldLabel text="Customization Title" required />
            <FieldWrap>
              <TextInput style={styles.input} value={b.custTitle} onChangeText={v => update({ custTitle: v })} placeholder="e.g. Personalised Name Engraving" placeholderTextColor={COLORS.textPh} maxLength={100} />
            </FieldWrap>

            <FieldLabel text="Instructions for Buyer" required />
            <FieldWrap>
              <TextInput style={[styles.input, { minHeight: 80, textAlignVertical: 'top', paddingTop: 10 }]} value={b.custInstructions} onChangeText={v => update({ custInstructions: v })} placeholder="Instructions for the buyer…" placeholderTextColor={COLORS.textPh} multiline maxLength={500} />
            </FieldWrap>

            <View style={styles.switchRow}>
              <Toggle value={b.custAllowPhoto} onToggle={() => update({ custAllowPhoto: !b.custAllowPhoto })} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.customTitle}>Buyer can upload a reference image</Text>
                <Text style={styles.customSub}>Accepted: JPG / PNG · Max 5 MB · 1 image</Text>
              </View>
            </View>
            {b.custAllowPhoto && (
              <View style={styles.custSubSection}>
                <FieldLabel text="Image Upload Label" required />
                <FieldWrap>
                  <TextInput style={styles.input} value={b.custImageLabel} onChangeText={v => update({ custImageLabel: v })} placeholder="e.g. Upload your reference photo here" placeholderTextColor={COLORS.textPh} maxLength={120} />
                </FieldWrap>
              </View>
            )}

            <View style={styles.switchRow}>
              <Toggle value={b.custAllowText} onToggle={() => update({ custAllowText: !b.custAllowText })} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.customTitle}>Buyer can enter a name or message</Text>
                <Text style={styles.customSub}>Max 100 characters · any case allowed</Text>
              </View>
            </View>
            {b.custAllowText && (
              <View style={styles.custSubSection}>
                <FieldLabel text="Text Field Label" required />
                <FieldWrap>
                  <TextInput style={styles.input} value={b.custTextLabel} onChangeText={v => update({ custTextLabel: v })} placeholder="e.g. Enter the name to be printed" placeholderTextColor={COLORS.textPh} maxLength={120} />
                </FieldWrap>
              </View>
            )}

            <View style={styles.custNote}>
              <Text style={styles.custNoteText}>ℹ Customised orders cannot be cancelled after production begins. Make sure your policy is clearly stated.</Text>
            </View>
          </View>
        )}
      </Card>
      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 – VARIANTS
// ─────────────────────────────────────────────────────────────────────────────

const StepVariants = ({
  state, setState, openPicker,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  openPicker: (title: string, options: string[], current: string, onSelect: (v: string) => void) => void;
}) => {
  const updateVariant = (id: string, field: Partial<Variant>) => {
    setState(s => ({
      ...s,
      isDirty: true,
      variants: s.variants.map(v => {
        if (v.id !== id) return v;
        const updated = { ...v, ...field };
        // auto discount
        const mrp = parseFloat(updated.mrp) || 0;
        const sp = parseFloat(updated.sellingPrice) || 0;
        if (mrp > 0 && sp > 0 && sp <= mrp)
          updated.discount = String(Math.round(((mrp - sp) / mrp) * 100));
        return updated;
      }),
    }));
  };

  const addVariant = () => {
    const id = `v${Date.now()}`;
    setState(s => ({ ...s, isDirty: true, variants: [...s.variants, { id, color: '', size: '', sku: '', stock: '', mrp: '', sellingPrice: '', discount: '0' }] }));
  };

  const removeVariant = (id: string) => {
    setState(s => ({ ...s, isDirty: true, variants: s.variants.filter(v => v.id !== id) }));
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.stepScroll} keyboardShouldPersistTaps="handled">
      <View style={styles.variantSummary}>
        <Text style={styles.variantSummaryText}>⚙ {state.variants.length} variant{state.variants.length !== 1 ? 's' : ''} — editing existing product</Text>
      </View>

      {state.variants.map((v, idx) => (
        <Card key={v.id}>
          <View style={styles.variantHeader}>
            <View style={styles.varBadge}><Text style={styles.varBadgeText}>#{idx + 1}</Text></View>
            <Text style={styles.varTitle}>Variant</Text>
            <View style={[styles.stockBadge, parseInt(v.stock) < 10 && styles.stockBadgeLow]}>
              <Text style={[styles.stockText, parseInt(v.stock) < 10 && styles.stockTextLow]}>Stock: {v.stock || '0'}</Text>
            </View>
            {state.variants.length > 1 && (
              <TouchableOpacity onPress={() => removeVariant(v.id)} style={styles.removeBtn}>
                <Text style={styles.removeBtnText}>🗑 Remove</Text>
              </TouchableOpacity>
            )}
          </View>
          <Divider />
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <FieldLabel text="Color" required />
              <DropButton value={v.color} placeholder="Select color" onPress={() => openPicker('Select Color', COLORS_LIST, v.color, val => updateVariant(v.id, { color: val }))} />
            </View>
            <View style={{ width: 10 }} />
            <View style={{ flex: 1 }}>
              <FieldLabel text="Size" required />
              <DropButton value={v.size} placeholder="Select size" onPress={() => openPicker('Select Size', SIZES_LIST, v.size, val => updateVariant(v.id, { size: val }))} />
            </View>
          </View>

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <View style={styles.lblRow}>
                <Text style={styles.fieldLabel}>SKU</Text>
                <View style={styles.autoBadge}><Text style={styles.autoBadgeText}>Auto</Text></View>
              </View>
              <FieldWrap>
                <TextInput style={styles.input} value={v.sku} onChangeText={val => updateVariant(v.id, { sku: val })} placeholder="Auto-generated" placeholderTextColor={COLORS.textPh} />
              </FieldWrap>
            </View>
            <View style={{ width: 10 }} />
            <View style={{ flex: 1 }}>
              <FieldLabel text="Stock Qty" required />
              <FieldWrap>
                <TextInput style={styles.input} value={v.stock} onChangeText={val => updateVariant(v.id, { stock: val })} placeholder="0" placeholderTextColor={COLORS.textPh} keyboardType="numeric" />
              </FieldWrap>
            </View>
          </View>

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <FieldLabel text="MRP (excl. GST)" required />
              <FieldWrap>
                <Text style={styles.fieldPrefix}>₹</Text>
                <TextInput style={[styles.input, { flex: 1 }]} value={v.mrp} onChangeText={val => updateVariant(v.id, { mrp: val })} placeholder="0.00" placeholderTextColor={COLORS.textPh} keyboardType="decimal-pad" />
              </FieldWrap>
            </View>
            <View style={{ width: 10 }} />
            <View style={{ flex: 1 }}>
              <FieldLabel text="Selling Price" required />
              <FieldWrap>
                <Text style={styles.fieldPrefix}>₹</Text>
                <TextInput style={[styles.input, { flex: 1 }]} value={v.sellingPrice} onChangeText={val => updateVariant(v.id, { sellingPrice: val })} placeholder="0.00" placeholderTextColor={COLORS.textPh} keyboardType="decimal-pad" />
              </FieldWrap>
            </View>
          </View>

          <View style={{ width: '50%' }}>
            <View style={styles.lblRow}>
              <Text style={styles.fieldLabel}>Discount %</Text>
              <View style={styles.autoBadge}><Text style={styles.autoBadgeText}>Auto</Text></View>
            </View>
            <FieldWrap>
              <TextInput style={styles.input} value={v.discount} onChangeText={val => updateVariant(v.id, { discount: val })} placeholder="0" placeholderTextColor={COLORS.textPh} keyboardType="numeric" />
            </FieldWrap>
          </View>
        </Card>
      ))}

      <TouchableOpacity style={styles.addVariantBtn} onPress={addVariant}>
        <Text style={styles.addVariantBtnText}>＋ Add Another Variant</Text>
      </TouchableOpacity>

      <View style={styles.infoBox}>
        <Text style={styles.infoBoxText}>ℹ Each variant can have its own price, stock, and images. At least one variant is required.</Text>
      </View>
      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 – IMAGES
// ─────────────────────────────────────────────────────────────────────────────

const StepImages = ({
  state, setState,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}) => {
  const [manageVisible, setManageVisible] = useState(false);

  const getAllImages = (): string[] => {
    const all: string[] = [];
    if (state.images.primaryImage) all.push(state.images.primaryImage);
    for (const u of state.images.additionalImages) { if (u && !all.includes(u)) all.push(u); }
    return all;
  };

  const fakeImageUrls = [
    'https://images.unsplash.com/photo-1571945153237-4929e783af4a?w=400&q=80',
    'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80',
    'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=400&q=80',
  ];
  const addFakeImage = () => {
    const all = getAllImages();
    if (all.length >= 8) { Alert.alert('Maximum 8 images reached'); return; }
    const uri = fakeImageUrls[all.length % fakeImageUrls.length];
    if (all.length === 0) {
      setState(s => ({ ...s, isDirty: true, images: { ...s.images, primaryImage: uri } }));
    } else {
      setState(s => ({ ...s, isDirty: true, images: { ...s.images, additionalImages: [...s.images.additionalImages, uri] } }));
    }
  };

  const setPrimary = (idx: number) => {
    const all = getAllImages();
    setState(s => ({
      ...s, isDirty: true,
      images: { ...s.images, primaryImage: all[idx] || null, additionalImages: all.filter((_, i) => i !== idx) },
    }));
  };

  const removeImage = (idx: number) => {
    const all = getAllImages();
    all.splice(idx, 1);
    setState(s => ({
      ...s, isDirty: true,
      images: { ...s.images, primaryImage: all[0] || null, additionalImages: all.slice(1) },
    }));
  };

  const allImgs = getAllImages();
  const total = allImgs.length;
  const MAX = 8;
  const previewImgs = allImgs.slice(0, 3);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.stepScroll}>
      {/* Tip */}
      <View style={styles.tipCard}>
        <Text style={styles.tipCardText}>💡 High-quality images increase conversions. Tap "More Images" to manage all product images and set the primary.</Text>
      </View>

      <Card>
        <SectionHeader label="Product Images" color={COLORS.acc2} />
        <Divider />

        <View style={styles.imgSectionRow}>
          <Text style={styles.imgSectionLabel}>
            {total} image{total !== 1 ? 's' : ''} · {MAX - total} slot{(MAX - total) !== 1 ? 's' : ''} left
          </Text>
          <TouchableOpacity style={styles.moreImgBtn} onPress={() => setManageVisible(true)}>
            <Text style={styles.moreImgBtnText}>🖼 More Images</Text>
          </TouchableOpacity>
        </View>

        {total > 0 ? (
          <>
            <View style={styles.imgPreviewRow}>
              {previewImgs.map((uri, i) => {
                const isPrimary = i === 0;
                const showMore = i === 2 && total > 3;
                return (
                  <View key={i} style={[styles.imgPreviewCard, isPrimary && styles.imgPreviewCardPrimary]}>
                    {/* In production use <Image> component */}
                    <View style={{ flex: 1, backgroundColor: COLORS.navyGhost, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ fontSize: 11, color: COLORS.textLight, textAlign: 'center', padding: 4 }}>
                        {isPrimary ? '⭐ Primary\nImage ' + (i + 1) : 'Image ' + (i + 1)}
                      </Text>
                      {showMore && total > 3 && (
                        <View style={styles.moreOverlay}>
                          <Text style={styles.moreOverlayText}>+{total - 3} more</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
            <Text style={styles.imgHint}>Tap <Text style={{ fontWeight: '700' }}>More Images</Text> to add, remove, or set the primary image</Text>
          </>
        ) : (
          <TouchableOpacity style={styles.addBox} onPress={() => setManageVisible(true)}>
            <Text style={styles.addBoxIcon}>📷</Text>
            <Text style={styles.addBoxTitle}>Add product images</Text>
            <Text style={styles.addBoxSub}>JPG · PNG · WebP · up to {MAX} images</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.imgCount}>{total}/{MAX} images</Text>

        <View style={{ height: 20 }} />
        <FieldLabel text="Product Video (Optional)" />
        <HintText text="Upload a video to show your product in action. Max 20 MB." />

        {state.images.video ? (
          <View style={styles.videoRow}>
            <Text style={{ fontSize: 24 }}>🎬</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.videoName}>product_video.mp4</Text>
              <Text style={styles.videoSub}>Video ready for upload</Text>
            </View>
            <TouchableOpacity style={styles.videoDeleteBtn} onPress={() => setState(s => ({ ...s, isDirty: true, images: { ...s.images, video: null } }))}>
              <Text style={{ color: COLORS.red }}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.videoBox} onPress={() => setState(s => ({ ...s, isDirty: true, images: { ...s.images, video: 'sample.mp4' } }))}>
            <Text style={{ fontSize: 32 }}>🎬</Text>
            <Text style={styles.videoBoxTitle}>Tap to upload product video</Text>
            <Text style={styles.videoBoxSub}>MP4 · MOV · WebM · Max 20 MB</Text>
          </TouchableOpacity>
        )}
      </Card>

      {/* Manage Images Modal */}
      <Modal visible={manageVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setManageVisible(false)}>
          <View style={[styles.modalSheet, { maxHeight: '85%' }]}>
            <View style={[styles.accentHeader, { backgroundColor: COLORS.acc2 }]}>
              <Text style={styles.accentHeaderTitle}>Manage Product Images</Text>
              <TouchableOpacity onPress={() => setManageVisible(false)} style={styles.accentHeaderClose}>
                <Text style={{ color: COLORS.white, fontSize: 18 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <Text style={styles.hint}>Set one image as primary. Tap the radio to select the main image.</Text>
              {total < MAX && (
                <TouchableOpacity style={[styles.moreImgBtn, { alignSelf: 'flex-start', marginVertical: 10 }]} onPress={addFakeImage}>
                  <Text style={styles.moreImgBtnText}>＋ Add Image (Demo)</Text>
                </TouchableOpacity>
              )}
              <View style={styles.imgGrid}>
                {allImgs.map((uri, i) => (
                  <View key={i} style={[styles.imgGridCard, i === 0 && styles.imgGridCardPrimary]}>
                    <View style={{ height: 100, backgroundColor: COLORS.navyGhost, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ color: COLORS.textLight, fontSize: 12 }}>Image {i + 1}</Text>
                      {i === 0 && <Text style={{ color: COLORS.navy, fontWeight: '700', fontSize: 11, marginTop: 4 }}>⭐ Primary</Text>}
                    </View>
                    <TouchableOpacity style={styles.imgRadioRow} onPress={() => { setPrimary(i); }}>
                      <View style={[styles.imgRadio, i === 0 && styles.imgRadioOn]}>
                        {i === 0 && <View style={styles.imgRadioDot} />}
                      </View>
                      <Text style={[styles.imgRadioLabel, i === 0 && { color: COLORS.navy, fontWeight: '700' }]}>{i === 0 ? 'Primary Image' : 'Set as Primary'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.imgDeleteBtn} onPress={() => removeImage(i)}>
                      <Text style={{ color: COLORS.red, fontSize: 12, fontWeight: '600' }}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={[styles.successBtn, { marginTop: 20 }]} onPress={() => setManageVisible(false)}>
                <Text style={styles.successBtnTxt}>Done</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4 – DETAILS
// ─────────────────────────────────────────────────────────────────────────────

const StepDetails = ({
  state, setState, openPicker,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  openPicker: (title: string, options: string[], current: string, onSelect: (v: string) => void) => void;
}) => {
  const [customPolicyVisible, setCustomPolicyVisible] = useState(false);
  const [customPolicyText, setCustomPolicyText] = useState(state.details.returnPolicyText);
  const [sizeChartVisible, setSizeChartVisible] = useState(false);

  const d = state.details;
  const updateDetails = (field: Partial<ProductDetails>) =>
    setState(s => ({ ...s, isDirty: true, details: { ...s.details, ...field } }));

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.stepScroll} keyboardShouldPersistTaps="handled">
      {/* Size Chart */}
      <Card zIndex={10}>
        <SectionHeader label="Size Chart" color={COLORS.acc1} />
        <Divider />
        <FieldLabel text="Select Size Chart" />
        <View style={styles.row2}>
          <View style={{ flex: 2 }}>
            <DropButton value={d.sizeChart} placeholder="No size chart" onPress={() => openPicker('Size Chart', state.sizeChartOptions, d.sizeChart, v => updateDetails({ sizeChart: v }))} />
          </View>
          <View style={{ width: 10 }} />
          <View style={{ flex: 1 }}>
            <OutlineButton label="＋ Create New" onPress={() => setSizeChartVisible(true)} />
          </View>
        </View>
      </Card>

      {/* Return Policy */}
      <Card zIndex={9}>
        <SectionHeader label="Return Policy" color={COLORS.acc3} />
        <Divider />
        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <FieldLabel text="Policy Template" required />
            <DropButton value={d.returnPolicy} placeholder="Select template" onPress={() => openPicker('Return Policy', RETURN_POLICIES, d.returnPolicy, v => updateDetails({ returnPolicy: v }))} />
          </View>
          <View style={{ width: 10 }} />
          <View style={{ flex: 1 }}>
            <FieldLabel text="Custom Policy" />
            <OutlineButton label="✏ Write Custom" onPress={() => setCustomPolicyVisible(true)} />
          </View>
        </View>
        <FieldLabel text="Policy Details" />
        <FieldWrap>
          <TextInput style={[styles.input, { minHeight: 80, textAlignVertical: 'top', paddingTop: 10 }]} value={d.returnPolicyText} onChangeText={v => updateDetails({ returnPolicyText: v })} multiline maxLength={1000} placeholder="Describe your return policy…" placeholderTextColor={COLORS.textPh} />
        </FieldWrap>
      </Card>

      {/* Delivery */}
      <Card zIndex={8}>
        <SectionHeader label="Delivery" color={COLORS.acc4} />
        <Divider />
        <FieldLabel text="Delivery Option" required />
        <DropButton value={d.deliveryOption} placeholder="Select option" onPress={() => openPicker('Delivery Option', DELIVERY_OPTIONS, d.deliveryOption, v => updateDetails({ deliveryOption: v }))} />

        <View style={[styles.row2, { marginTop: 10 }]}>
          <View style={{ flex: 1 }}>
            <FieldLabel text="Min Days" />
            <FieldWrap>
              <TextInput style={styles.input} value={d.minDays} onChangeText={v => updateDetails({ minDays: v })} placeholder="3" placeholderTextColor={COLORS.textPh} keyboardType="numeric" />
            </FieldWrap>
          </View>
          <View style={{ width: 10 }} />
          <View style={{ flex: 1 }}>
            <FieldLabel text="Max Days" />
            <FieldWrap>
              <TextInput style={styles.input} value={d.maxDays} onChangeText={v => updateDetails({ maxDays: v })} placeholder="7" placeholderTextColor={COLORS.textPh} keyboardType="numeric" />
            </FieldWrap>
          </View>
        </View>
        <FieldWrap>
          <TextInput style={[styles.input, { minHeight: 72, textAlignVertical: 'top', paddingTop: 10 }]} value={d.deliveryInfo} onChangeText={v => updateDetails({ deliveryInfo: v })} multiline maxLength={1000} placeholder="Extra delivery notes…" placeholderTextColor={COLORS.textPh} />
        </FieldWrap>
      </Card>

      {/* Warranty & Care */}
      <Card>
        <SectionHeader label="Warranty & Care" color={COLORS.acc2} />
        <Divider />
        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <FieldLabel text="Warranty" />
            <FieldWrap>
              <TextInput style={[styles.input, { minHeight: 80, textAlignVertical: 'top', paddingTop: 10 }]} value={d.warranty} onChangeText={v => updateDetails({ warranty: v })} multiline maxLength={500} placeholder="e.g. 1 year warranty" placeholderTextColor={COLORS.textPh} />
            </FieldWrap>
          </View>
          <View style={{ width: 10 }} />
          <View style={{ flex: 1 }}>
            <FieldLabel text="Care Instructions" />
            <FieldWrap>
              <TextInput style={[styles.input, { minHeight: 80, textAlignVertical: 'top', paddingTop: 10 }]} value={d.careInstructions} onChangeText={v => updateDetails({ careInstructions: v })} multiline maxLength={500} placeholder="Care & maintenance" placeholderTextColor={COLORS.textPh} />
            </FieldWrap>
          </View>
        </View>
      </Card>

      {/* Features & Specs */}
      <Card>
        <SectionHeader label="Features & Specs" color={COLORS.acc1} />
        <Divider />
        <FieldLabel text="Product Features" />
        {state.features.map((f, i) => (
          <View key={i} style={styles.specRow}>
            <FieldWrap>
              <TextInput style={[styles.input, { flex: 1 }]} value={f} onChangeText={v => setState(s => { const features = [...s.features]; features[i] = v; return { ...s, isDirty: true, features }; })} placeholder="Enter feature" placeholderTextColor={COLORS.textPh} />
            </FieldWrap>
            <TouchableOpacity style={styles.specDelBtn} onPress={() => setState(s => ({ ...s, isDirty: true, features: s.features.filter((_, j) => j !== i) }))}>
              <Text style={styles.specDelBtnText}>🗑</Text>
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={styles.addRowBtn} onPress={() => setState(s => ({ ...s, isDirty: true, features: [...s.features, ''] }))}>
          <Text style={styles.addRowBtnText}>＋ Add Feature</Text>
        </TouchableOpacity>

        <Divider />
        <FieldLabel text="Specifications" />
        {state.specs.map((sp, i) => (
          <View key={i} style={styles.specRow}>
            <View style={{ flex: 1 }}>
              <FieldWrap>
                <TextInput style={styles.input} value={sp.name} onChangeText={v => setState(s => { const specs = [...s.specs]; specs[i] = { ...specs[i], name: v }; return { ...s, isDirty: true, specs }; })} placeholder="Name" placeholderTextColor={COLORS.textPh} />
              </FieldWrap>
            </View>
            <View style={{ width: 8 }} />
            <View style={{ flex: 1 }}>
              <FieldWrap>
                <TextInput style={styles.input} value={sp.value} onChangeText={v => setState(s => { const specs = [...s.specs]; specs[i] = { ...specs[i], value: v }; return { ...s, isDirty: true, specs }; })} placeholder="Value" placeholderTextColor={COLORS.textPh} />
              </FieldWrap>
            </View>
            <TouchableOpacity style={styles.specDelBtn} onPress={() => setState(s => ({ ...s, isDirty: true, specs: s.specs.filter((_, j) => j !== i) }))}>
              <Text style={styles.specDelBtnText}>🗑</Text>
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={styles.addRowBtn} onPress={() => setState(s => ({ ...s, isDirty: true, specs: [...s.specs, { name: '', value: '' }] }))}>
          <Text style={styles.addRowBtnText}>＋ Add Specification</Text>
        </TouchableOpacity>
      </Card>

      {/* Custom Policy Modal */}
      <Modal visible={customPolicyVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setCustomPolicyVisible(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalDrag} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Write Custom Return Policy</Text>
              <TouchableOpacity onPress={() => setCustomPolicyVisible(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseTxt}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ padding: 16 }}>
              <HintText text="Describe your return rules clearly. This will appear to buyers on the product page." />
              <FieldLabel text="Custom Policy Details" required />
              <FieldWrap>
                <TextInput
                  style={[styles.input, { minHeight: 140, textAlignVertical: 'top', paddingTop: 10 }]}
                  value={customPolicyText}
                  onChangeText={setCustomPolicyText}
                  multiline maxLength={1000}
                  placeholder="e.g. Returns accepted within 7 days in original packaging…"
                  placeholderTextColor={COLORS.textPh}
                />
              </FieldWrap>
              <Text style={styles.charCount}>{customPolicyText.length}/1000</Text>
              <View style={styles.row2}>
                <TouchableOpacity style={styles.outlineButton} onPress={() => setCustomPolicyVisible(false)}>
                  <Text style={styles.outlineButtonText}>Cancel</Text>
                </TouchableOpacity>
                <View style={{ width: 10 }} />
                <TouchableOpacity style={[styles.successBtn, { flex: 1 }]} onPress={() => {
                  if (!customPolicyText.trim()) { Alert.alert('Please write your custom return policy.'); return; }
                  updateDetails({ returnPolicy: 'Custom Policy', returnPolicyText: customPolicyText });
                  setCustomPolicyVisible(false);
                }}>
                  <Text style={styles.successBtnTxt}>Save Policy</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Size Chart Modal */}
      <Modal visible={sizeChartVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setSizeChartVisible(false)}>
          <View style={[styles.modalSheet, { maxHeight: '85%' }]}>
            <View style={[styles.accentHeader, { backgroundColor: COLORS.acc4 }]}>
              <Text style={styles.accentHeaderTitle}>Create Size Chart</Text>
              <TouchableOpacity onPress={() => setSizeChartVisible(false)} style={styles.accentHeaderClose}>
                <Text style={{ color: COLORS.white, fontSize: 18 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <FieldLabel text="Chart Name" required />
              <FieldWrap>
                <TextInput style={styles.input} placeholder="e.g. Men's Clothing Size Chart" placeholderTextColor={COLORS.textPh} />
              </FieldWrap>
              <FieldLabel text="Additional Notes" />
              <FieldWrap>
                <TextInput style={[styles.input, { minHeight: 80, textAlignVertical: 'top', paddingTop: 10 }]} placeholder="e.g. All measurements are approximate." placeholderTextColor={COLORS.textPh} multiline maxLength={500} />
              </FieldWrap>
              <TouchableOpacity style={[styles.successBtn, { marginTop: 16 }]} onPress={() => {
                const name = `Custom Chart ${Date.now()}`;
                setState(s => ({ ...s, isDirty: true, sizeChartOptions: [...s.sizeChartOptions, name], details: { ...s.details, sizeChart: name } }));
                setSizeChartVisible(false);
              }}>
                <Text style={styles.successBtnTxt}>Save Chart</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export default function EditProduct() {
  const params = useLocalSearchParams<{ productId?: string }>();
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  useEffect(() => {
    const productId = Number(params.productId);
    if (!productId || Number.isNaN(productId)) return;
    void (async () => {
      try {
        const d = await fetchProductDetail(productId);
        const variants = Array.isArray(d.variants) ? d.variants as Record<string, unknown>[] : [];
        const images = Array.isArray(d.images) ? d.images as { url?: string }[] : [];
        setState((s) => ({
          ...s,
          basic: {
            ...s.basic,
            id: String(d.id ?? productId),
            name: String(d.name ?? ''),
            category: String(d.categoryName ?? s.basic.category),
            subcategory: String(d.subcategoryName ?? s.basic.subcategory),
            hsnCode: String(d.hsnCode ?? s.basic.hsnCode),
            shortDesc: String(d.shortDescription ?? ''),
            fullDesc: String(d.description ?? ''),
          },
          variants: variants.map((v, i) => ({
            id: String(v.id ?? `v${i}`),
            color: String(v.color ?? ''),
            size: String(v.size ?? ''),
            sku: String(v.sku ?? ''),
            stock: String(v.stock ?? '0'),
            mrp: String(v.sellingPrice ?? ''),
            sellingPrice: String(v.finalPrice ?? v.sellingPrice ?? ''),
            discount: '0',
          })),
          images: {
            ...s.images,
            primaryImage: images[0]?.url ?? s.images.primaryImage,
            additionalImages: images.slice(1).map((img) => img.url ?? '').filter(Boolean),
          },
          details: {
            ...s.details,
            returnPolicyText: String(d.returnPolicy ?? s.details.returnPolicyText),
          },
        }));
      } catch (e) {
        setToasts((t) => [...t, { id: Date.now(), message: getApiErrorMessage(e), type: 'error' }]);
      }
    })();
  }, [params.productId]);

  // Picker state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerConfig, setPickerConfig] = useState<{ title: string; options: string[]; current: string; onSelect: (v: string) => void } | null>(null);

  const showToast = useCallback((message: string, type: 'error' | 'success' = 'error') => {
    const id = ++_toastId;
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);

  const openPicker = useCallback((title: string, options: string[], current: string, onSelect: (v: string) => void) => {
    setPickerConfig({ title, options, current, onSelect });
    setPickerVisible(true);
  }, []);

  const handleBack = () => {
    if (state.step > 0) {
      setState(s => ({ ...s, step: s.step - 1 }));
    } else if (state.isDirty) {
      setShowDiscard(true);
    } else {
      router.back();
    }
  };

  const handleContinue = () => setState(s => ({ ...s, step: Math.min(s.step + 1, 3) }));

  const validate = (): string[] => {
    const b = state.basic;
    const errs: string[] = [];
    if (!b.name?.trim()) errs.push('Product Name is required');
    if (!b.category) errs.push('Category is required');
    if (!b.subcategory) errs.push('Subcategory is required');
    if (!b.materialType) errs.push('Material Type is required');
    if (!b.hsnCode?.trim()) errs.push('HSN Code is required');
    if (!b.shortDesc?.trim()) errs.push('Short Description is required');
    if (!b.weight?.trim()) errs.push('Weight is required');
    if (!state.details.returnPolicy) errs.push('Return Policy is required');
    return errs;
  };

  const handleUpdate = () => {
    const errs = validate();
    if (errs.length > 0) { errs.slice(0, 2).forEach((e, i) => setTimeout(() => showToast(e, 'error'), i * 200)); return; }
    setTimeout(() => {
      setState(s => ({ ...s, isDirty: false }));
      setShowSuccess(true);
    }, 400);
  };

  const currentStep = STEP_CONFIG[state.step];

  return (
    <AdminLayout>
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBtn} onPress={handleBack}>
          <Text style={styles.topBtnText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.topCenter}>
          <Text style={styles.topTitle}>Edit Product</Text>
          <Text style={styles.topSub}>{currentStep.label} · Step {state.step + 1} of {STEP_CONFIG.length}</Text>
        </View>
        <TouchableOpacity style={styles.topBtn} onPress={() => state.isDirty ? setShowDiscard(true) : router.back()}>
          {state.isDirty
            ? <View style={styles.dirtyDot} />
            : <Text style={styles.topBtnText}>✕</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Unsaved Banner */}
      {state.isDirty && (
        <View style={styles.unsavedBanner}>
          <Text style={styles.unsavedBannerText}>⚠ Unsaved changes · remember to update the product</Text>
        </View>
      )}

      {/* Step Progress Bar */}
      <View style={styles.stepBar}>
        {STEP_CONFIG.map((s, i) => {
          const isActive = i === state.step;
          const isDone = i < state.step;
          return (
            <TouchableOpacity key={s.key} style={styles.stepCol} onPress={() => setState(st => ({ ...st, step: i }))}>
              <View style={[styles.stepIcon, { backgroundColor: s.color, opacity: isActive || isDone ? 1 : 0.5 }]}>
                <Text style={styles.stepIconText}>{s.icon}</Text>
              </View>
              <Text style={[styles.stepLabel, (isActive || isDone) && { color: s.color, fontWeight: isActive ? '700' : '600' }]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Step Content */}
      <View style={{ flex: 1 }}>
        {state.step === 0 && <StepBasic state={state} setState={setState} openPicker={openPicker} />}
        {state.step === 1 && <StepVariants state={state} setState={setState} openPicker={openPicker} />}
        {state.step === 2 && <StepImages state={state} setState={setState} />}
        {state.step === 3 && <StepDetails state={state} setState={setState} openPicker={openPicker} />}
      </View>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        {state.step === 0 ? (
          <TouchableOpacity style={styles.btnCancel} onPress={handleBack}>
            <Text style={styles.btnCancelText}>Cancel</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.btnPrev} onPress={handleBack}>
            <Text style={styles.btnPrevText}>‹ Back</Text>
          </TouchableOpacity>
        )}

        {state.step < 3 ? (
          <TouchableOpacity style={styles.btnNext} onPress={handleContinue}>
            <Text style={styles.btnNextText}>Continue ›</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.btnSave, !state.isDirty && styles.btnSaveDim]}
            onPress={state.isDirty ? handleUpdate : undefined}
          >
            <Text style={styles.btnSaveText}>{state.isDirty ? '💾 Update Product' : 'No Changes'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Toasts */}
      <View style={styles.toastContainer} pointerEvents="none">
        {toasts.map(t => (
          <View key={t.id} style={[styles.toast, t.type === 'error' ? styles.toastError : styles.toastSuccess]}>
            <Text style={styles.toastMsg}>{t.type === 'error' ? '✕ ' : '✓ '}{t.message}</Text>
          </View>
        ))}
      </View>

      {/* Modals */}
      {pickerConfig && (
        <PickerModal
          visible={pickerVisible}
          title={pickerConfig.title}
          options={pickerConfig.options}
          current={pickerConfig.current}
          onSelect={v => { pickerConfig.onSelect(v); }}
          onClose={() => setPickerVisible(false)}
        />
      )}

      <SuccessModal
        visible={showSuccess}
        productId={state.basic.id}
        onClose={() => setShowSuccess(false)}
      />

      <DiscardModal
        visible={showDiscard}
        onDiscard={() => { setShowDiscard(false); router.back(); }}
        onKeep={() => setShowDiscard(false)}
      />
    </KeyboardAvoidingView>
    </AdminLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Layout
  stepScroll: { padding: 16, paddingBottom: 80 },

  // Top Bar
  topBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.navyDeep, paddingHorizontal: 8, paddingVertical: 12, paddingTop: Platform.OS === 'ios' ? 54 : 12 },
  topBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  topBtnText: { color: COLORS.white, fontSize: 26, lineHeight: 30 },
  topCenter: { flex: 1, alignItems: 'center' },
  topTitle: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
  topSub: { color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 2 },
  dirtyDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.amber, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)' },

  // Unsaved Banner
  unsavedBanner: { flexDirection: 'row', alignItems: 'center', padding: 9, paddingHorizontal: 16, backgroundColor: COLORS.amberPale, borderBottomWidth: 1, borderBottomColor: '#FCD34D' },
  unsavedBannerText: { fontSize: 12, color: '#92400E', fontWeight: '500' },

  // Step Bar
  stepBar: { flexDirection: 'row', backgroundColor: COLORS.white, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  stepCol: { flex: 1, alignItems: 'center', gap: 6 },
  stepIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  stepIconText: { fontSize: 18 },
  stepLabel: { fontSize: 10, fontWeight: '500', color: COLORS.textLight, textAlign: 'center' },

  // Card
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12, shadowColor: '#0F1A4A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },

  // Section Header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, paddingLeft: 10, borderLeftWidth: 3, borderRadius: 2 },
  sectionHeaderText: { fontSize: 15, fontWeight: '700', letterSpacing: 0.1 },

  // Field
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 14 },
  fieldLabel: { fontSize: 12.5, fontWeight: '600', color: COLORS.textMid, marginBottom: 6, marginTop: 12 },
  hint: { fontSize: 11, color: COLORS.textLight, marginTop: 4 },
  cardHint: { fontSize: 12, color: COLORS.textLight, marginBottom: 10, fontStyle: 'italic' },
  charCount: { fontSize: 11, color: COLORS.textLight, textAlign: 'right', marginTop: 3 },
  fieldWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.inputBg, borderWidth: 1.2, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, minHeight: 44 },
  fieldWrapError: { borderColor: COLORS.red, backgroundColor: '#FFF8F8' },
  fieldPrefix: { fontSize: 14, fontWeight: '600', color: COLORS.textMid, marginRight: 6 },
  input: { flex: 1, fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto', fontSize: 13, color: COLORS.textDark, paddingVertical: 10 },

  // Dropdown
  dropButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.inputBg, borderWidth: 1.2, borderColor: COLORS.border, borderRadius: 10, padding: 12, minHeight: 44 },
  dropButtonText: { flex: 1, fontSize: 13, color: COLORS.textDark },
  placeholder: { color: COLORS.textPh },
  chevron: { color: COLORS.textLight, fontSize: 20, lineHeight: 22 },

  // Rows
  row2: { flexDirection: 'row', marginTop: 0 },
  row3: { flexDirection: 'row', gap: 8 },

  // ID Badge
  idBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.navyGhost, borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: COLORS.navyBorder },
  idText: { flex: 1, fontSize: 12, fontWeight: '500', color: COLORS.navyLight },
  idStatus: { backgroundColor: COLORS.greenPale, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  idStatusTxt: { fontSize: 11, fontWeight: '600', color: COLORS.greenText },

  // Radio Pills
  radioRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  radioPill: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.2, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  radioPillOn: { borderColor: COLORS.navy, backgroundColor: COLORS.navyGhost },
  radioDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: COLORS.border },
  radioDotOn: { borderColor: COLORS.navy, backgroundColor: COLORS.navy },
  radioPillText: { fontSize: 13, fontWeight: '500', color: COLORS.textMid },
  radioPillTextOn: { color: COLORS.navy, fontWeight: '600' },

  // Toggle
  toggle: { width: 44, height: 26, borderRadius: 13, backgroundColor: COLORS.border, position: 'relative', justifyContent: 'center' },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.white, position: 'absolute', left: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.18, shadowRadius: 3, elevation: 2 },
  toggleThumbOn: { left: 20 },

  // Custom / Cust
  customRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  customTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textDark },
  customSub: { fontSize: 12, color: COLORS.textLight, marginTop: 3, lineHeight: 17 },
  switchRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border },
  custSubSection: { marginTop: 10, marginLeft: 8, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: COLORS.acc5 },
  custNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 16, backgroundColor: '#EDFAF4', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#A3E9C8' },
  custNoteText: { fontSize: 11.5, color: COLORS.acc5, lineHeight: 17, flex: 1 },

  // Variants
  variantSummary: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.navyGhost, borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: COLORS.navyBorder },
  variantSummaryText: { fontSize: 12, fontWeight: '500', color: COLORS.navyLight },
  variantHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  varBadge: { width: 28, height: 28, borderRadius: 8, backgroundColor: COLORS.navyGhost, alignItems: 'center', justifyContent: 'center' },
  varBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.navy },
  varTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  stockBadge: { backgroundColor: COLORS.greenPale, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  stockBadgeLow: { backgroundColor: COLORS.amberPale },
  stockText: { fontSize: 11, fontWeight: '600', color: COLORS.greenText },
  stockTextLow: { color: COLORS.amber },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  removeBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.red, fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto' },
  lblRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, marginBottom: 6 },
  autoBadge: { backgroundColor: COLORS.greenPale, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  autoBadgeText: { fontSize: 10, fontWeight: '600', color: COLORS.greenText },
  addVariantBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1.5, borderColor: COLORS.navy, borderRadius: 14, padding: 13, marginBottom: 14 },
  addVariantBtnText: { color: COLORS.navy, fontSize: 14, fontWeight: '600' },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: COLORS.navyGhost, borderRadius: 12, padding: 12 },
  infoBoxText: { fontSize: 12, color: COLORS.textMid, lineHeight: 18, flex: 1 },

  // Images
  tipCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: COLORS.amberPale, borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#FCD34D' },
  tipCardText: { fontSize: 12, color: '#92400E', lineHeight: 18, flex: 1 },
  imgSectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  imgSectionLabel: { fontSize: 12.5, fontWeight: '600', color: COLORS.textMid },
  moreImgBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.acc4, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  moreImgBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.white },
  imgPreviewRow: { flexDirection: 'row', gap: 12 },
  imgPreviewCard: { flex: 1, aspectRatio: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.inputBg },
  imgPreviewCardPrimary: { borderColor: COLORS.navy, borderWidth: 2 },
  moreOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,20,60,0.55)', alignItems: 'center', justifyContent: 'center' },
  moreOverlayText: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  imgHint: { fontSize: 11, color: COLORS.textLight, marginTop: 10, textAlign: 'center' },
  addBox: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: COLORS.navyBorder, borderRadius: 14, padding: 22, alignItems: 'center', backgroundColor: COLORS.inputBg },
  addBoxIcon: { fontSize: 32, marginBottom: 8 },
  addBoxTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textMid },
  addBoxSub: { fontSize: 11, color: COLORS.textLight },
  imgCount: { fontSize: 11.5, color: COLORS.textLight, textAlign: 'right', marginTop: 10 },
  videoBox: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: COLORS.navyBorder, borderRadius: 14, padding: 24, alignItems: 'center', marginTop: 12 },
  videoBoxTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textMid },
  videoBoxSub: { fontSize: 11, color: COLORS.textLight },
  videoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, backgroundColor: COLORS.navyGhost, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: COLORS.navyBorder },
  videoName: { fontSize: 13, fontWeight: '600', color: COLORS.textDark },
  videoSub: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  videoDeleteBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.redPale, alignItems: 'center', justifyContent: 'center' },
  imgGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  imgGridCard: { width: '47%', borderRadius: 12, overflow: 'hidden', borderWidth: 1.5, borderColor: COLORS.border },
  imgGridCardPrimary: { borderColor: COLORS.navy, borderWidth: 2 },
  imgRadioRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 9, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border },
  imgRadio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: COLORS.navyBorder, alignItems: 'center', justifyContent: 'center' },
  imgRadioOn: { borderColor: COLORS.navy },
  imgRadioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.navy },
  imgRadioLabel: { fontSize: 10.5, fontWeight: '500', color: COLORS.textMid, flex: 1 },
  imgDeleteBtn: { padding: 8, alignItems: 'center' },

  // Details
  outlineButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1.2, borderColor: COLORS.navy, borderRadius: 10, padding: 10, minHeight: 44, backgroundColor: COLORS.white, flex: 1 },
  outlineButtonText: { fontSize: 13, fontWeight: '600', color: COLORS.navy },
  specRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  specDelBtn: { width: 36, height: 36, backgroundColor: COLORS.redPale, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  specDelBtnText: { fontSize: 16 },
  addRowBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.2, borderColor: COLORS.navyBorder, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7, alignSelf: 'flex-start', marginTop: 10 },
  addRowBtnText: { fontSize: 12.5, fontWeight: '600', color: COLORS.navy },

  // Action Bar
  actionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 12, paddingHorizontal: 16, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 4 },
  btnCancel: { flex: 1, borderWidth: 1.2, borderColor: COLORS.border, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  btnCancelText: { fontSize: 14, fontWeight: '600', color: COLORS.textMid },
  btnPrev: { flex: 1, borderWidth: 1.2, borderColor: COLORS.navyBorder, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  btnPrevText: { fontSize: 14, fontWeight: '600', color: COLORS.navy },
  btnNext: { flex: 1, backgroundColor: COLORS.navy, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  btnNextText: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  btnSave: { flex: 1, backgroundColor: COLORS.navy, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  btnSaveDim: { backgroundColor: COLORS.navyLight, opacity: 0.6 },
  btnSaveText: { fontSize: 14, fontWeight: '700', color: COLORS.white },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(10,20,60,0.35)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '75%' },
  modalDrag: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', margin: 12 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textDark },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  modalCloseTxt: { fontSize: 16, color: COLORS.textMid },
  pickerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pickerItemSelected: { backgroundColor: COLORS.navyGhost },
  pickerItemText: { fontSize: 14, fontWeight: '500', color: COLORS.textMid },
  pickerItemTextSelected: { fontWeight: '600', color: COLORS.navy },
  checkmark: { fontSize: 16, color: COLORS.navy },
  accentHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingHorizontal: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  accentHeaderTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.white },
  accentHeaderClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  // Success Modal
  successOverlay: { flex: 1, backgroundColor: 'rgba(10,20,60,0.58)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  successCard: { backgroundColor: COLORS.white, borderRadius: 28, padding: 28, width: '100%', maxWidth: 400, alignItems: 'center', shadowColor: '#0F1A4A', shadowOffset: { width: 0, height: 24 }, shadowOpacity: 0.28, shadowRadius: 48, elevation: 20 },
  successTopBar: { width: '110%', height: 6, backgroundColor: COLORS.navy, marginBottom: 20, borderTopLeftRadius: 28, borderTopRightRadius: 28, alignSelf: 'center' },
  successIconOuter: { width: 96, height: 96, borderRadius: 24, backgroundColor: COLORS.navyGhost, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.navyBorder, marginBottom: 20 },
  successIconInner: { width: 76, height: 76, borderRadius: 18, backgroundColor: COLORS.navy, alignItems: 'center', justifyContent: 'center' },
  successCheckmark: { fontSize: 36, color: COLORS.white, lineHeight: 40 },
  successTitle: { fontSize: 26, fontWeight: '800', color: COLORS.textDark, textAlign: 'center', letterSpacing: -0.5, marginBottom: 8 },
  successSub: { fontSize: 14.5, color: COLORS.textMid, textAlign: 'center', lineHeight: 22 },
  successInfoStrip: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.navyGhost, borderRadius: 14, padding: 12, width: '100%', borderWidth: 1, borderColor: COLORS.navyBorder, marginBottom: 10 },
  successInfoLabel: { fontSize: 10, color: COLORS.textLight, letterSpacing: 0.5, marginBottom: 1 },
  successInfoVal: { fontSize: 13, fontWeight: '700', color: COLORS.textDark },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.greenPale, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#A3E9C8' },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.greenText },
  activePillTxt: { fontSize: 11, fontWeight: '600', color: COLORS.greenText },
  successBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.navy, borderRadius: 14, padding: 15, width: '100%', shadowColor: '#0F1A4A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.32, shadowRadius: 14, elevation: 6 },
  successBtnTxt: { fontSize: 15, fontWeight: '700', color: COLORS.white },
  successSecLink: { fontSize: 13, color: COLORS.textLight, textDecorationLine: 'underline', marginTop: 12 },

  // Discard Modal
  discardOverlay: { flex: 1, backgroundColor: 'rgba(10,20,60,0.45)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  discardSheet: { backgroundColor: COLORS.white, borderRadius: 22, padding: 28, alignItems: 'center', width: '100%', maxWidth: 360 },
  discardIcon: { width: 68, height: 68, borderRadius: 18, backgroundColor: COLORS.amberPale, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  discardTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textDark, marginBottom: 10, textAlign: 'center' },
  discardBody: { fontSize: 13.5, color: COLORS.textMid, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  discardBtn: { width: '100%', backgroundColor: COLORS.red, borderRadius: 13, padding: 14, alignItems: 'center', marginBottom: 10 },
  discardBtnTxt: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  discardKeep: { width: '100%', backgroundColor: COLORS.navyGhost, borderRadius: 13, padding: 14, alignItems: 'center' },
  discardKeepTxt: { fontSize: 14, fontWeight: '600', color: COLORS.navy },

  // Toast
  toastContainer: { position: 'absolute', top: 90, right: 14, gap: 8, alignItems: 'flex-end' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, maxWidth: '82%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 12, elevation: 6 },
  toastError: { backgroundColor: '#C0392B' },
  toastSuccess: { backgroundColor: COLORS.acc5 },
  toastMsg: { fontSize: 13, fontWeight: '600', color: COLORS.white, lineHeight: 18 },
});