import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import type { ProductVariant } from '@/constants/product-approval-data';
import {
  SWEETS_DEFAULT_COLOR,
  variantDimensionLabels,
} from '@/lib/product/sweetsCategory';

const PALETTE = {
  navy: '#1E3A5F',
  orange: '#F97316',
  pageBg: '#F4F6FB',
  cardBg: '#FFFFFF',
  border: '#E5E7EB',
  inputBg: '#F9FAFB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  required: '#EF4444',
};

const COLOR_OPTIONS = ['Coffee Brown', 'Black', 'White', 'Navy Blue', 'Red'];
const SIZE_OPTIONS = ['6', '7', '8', '9', '10', '11', '12'];

type AddVariantModalProps = {
  visible: boolean;
  onClose: () => void;
  onAdd: (variant: ProductVariant) => void;
  sweetsProduct?: boolean;
};

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={styles.label}>
      {label}
      {required && <Text style={styles.required}> *</Text>}
    </Text>
  );
}

function SelectField({
  placeholder,
  value,
  options,
  onSelect,
}: {
  placeholder: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.selectWrap}>
      <Pressable style={styles.select} onPress={() => setOpen(!open)}>
        <Text style={[styles.selectText, !value && styles.selectPlaceholder]}>
          {value || placeholder}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={18} color={PALETTE.textMuted} />
      </Pressable>
      {open && (
        <View style={styles.dropdown}>
          {options.map((opt) => (
            <Pressable
              key={opt}
              style={styles.dropdownItem}
              onPress={() => {
                onSelect(opt);
                setOpen(false);
              }}>
              <Text style={styles.dropdownText}>{opt}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export function AddVariantModal({
  visible,
  onClose,
  onAdd,
  sweetsProduct = false,
}: AddVariantModalProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 640;
  const dimLabels = variantDimensionLabels(sweetsProduct);

  const [color, setColor] = useState(sweetsProduct ? SWEETS_DEFAULT_COLOR : '');
  const [size, setSize] = useState('');
  const [stock, setStock] = useState('');
  const [mrp, setMrp] = useState('');
  const [discount, setDiscount] = useState('');
  const [gst, setGst] = useState('5');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  useEffect(() => {
    if (sweetsProduct) setColor(SWEETS_DEFAULT_COLOR);
  }, [sweetsProduct]);

  const reset = () => {
    setColor(sweetsProduct ? SWEETS_DEFAULT_COLOR : '');
    setSize('');
    setStock('');
    setMrp('');
    setDiscount('');
    setGst('5');
    setImageUrl('');
    setVideoUrl('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = () => {
    const stockNum = parseInt(stock, 10) || 0;
    const mrpNum = parseFloat(mrp) || 0;
    const discNum = parseFloat(discount) || 0;
    const gstNum = parseFloat(gst) || 5;
    const sellingExcl = mrpNum * (1 - discNum / 100);
    const gstAmount = sellingExcl * (gstNum / 100);
    const sellingWith = sellingExcl + gstAmount;

    const variant: ProductVariant = {
      id: `v-${Date.now()}`,
      colorName: sweetsProduct ? SWEETS_DEFAULT_COLOR : color || 'Coffee Brown',
      colorHex: '#6F4E37',
      image:
        imageUrl ||
        'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=120&h=120&fit=crop',
      size: size || '6',
      sku: `PRE-${(sweetsProduct ? 'SW' : (color || 'CO')).slice(0, 2).toUpperCase()}${size || '6'}-${Math.floor(Math.random() * 9000) + 1000}`,
      stock: stockNum,
      mrp: mrpNum,
      discountPercent: discNum,
      sellingPriceExclGst: sellingExcl,
      gstPercent: gstNum,
      gstAmount,
      sellingPriceWithGst: sellingWith,
      commissionPercent: 15,
      commissionAmount: sellingWith * 0.15,
      intraCityDelivery: 20,
      metroDelivery: 25,
    };

    onAdd(variant);
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={[styles.modal, { maxWidth: isWide ? 560 : width - 32 }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View style={styles.modalIcon}>
                <MaterialCommunityIcons name="plus" size={18} color="#FFF" />
              </View>
              <Text style={styles.modalTitle}>Add New Variant</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={handleClose}>
              <MaterialCommunityIcons name="close" size={18} color={PALETTE.textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>
            {/* Row 1 */}
            <View style={[styles.row, isWide && styles.rowTwoCol]}>
              {dimLabels.showColor ? (
                <View style={[styles.field, isWide && styles.fieldHalf]}>
                  <FieldLabel label={dimLabels.colorLabel} required />
                  <SelectField
                    placeholder="Select color"
                    value={color}
                    options={COLOR_OPTIONS}
                    onSelect={setColor}
                  />
                </View>
              ) : null}
              <View style={[styles.field, isWide && dimLabels.showColor ? styles.fieldHalf : undefined]}>
                <FieldLabel label={dimLabels.sizeLabel} required />
                <SelectField
                  placeholder={dimLabels.sizePlaceholder}
                  value={size}
                  options={SIZE_OPTIONS}
                  onSelect={setSize}
                />
              </View>
            </View>

            {/* Stock */}
            <View style={styles.field}>
              <FieldLabel label="Stock Quantity" required />
              <TextInput
                style={styles.input}
                placeholder="e.g. 15"
                placeholderTextColor={PALETTE.textMuted}
                keyboardType="numeric"
                value={stock}
                onChangeText={setStock}
              />
            </View>

            {/* MRP + Discount */}
            <View style={[styles.row, isWide && styles.rowTwoCol]}>
              <View style={[styles.field, isWide && styles.fieldHalf]}>
                <FieldLabel label="MRP (Excl. GST)" required />
                <View style={styles.inputPrefix}>
                  <Text style={styles.prefixText}>₹</Text>
                  <TextInput
                    style={styles.inputInner}
                    placeholder="0.00"
                    placeholderTextColor={PALETTE.textMuted}
                    keyboardType="decimal-pad"
                    value={mrp}
                    onChangeText={setMrp}
                  />
                </View>
              </View>
              <View style={[styles.field, isWide && styles.fieldHalf]}>
                <FieldLabel label="Discount (%)" required />
                <View style={styles.inputSuffix}>
                  <TextInput
                    style={styles.inputInner}
                    placeholder="0"
                    placeholderTextColor={PALETTE.textMuted}
                    keyboardType="decimal-pad"
                    value={discount}
                    onChangeText={setDiscount}
                  />
                  <Text style={styles.suffixText}>%</Text>
                </View>
              </View>
            </View>

            {/* GST */}
            <View style={styles.field}>
              <FieldLabel label="GST (%)" />
              <TextInput
                style={styles.input}
                placeholder="5"
                placeholderTextColor={PALETTE.textMuted}
                keyboardType="decimal-pad"
                value={gst}
                onChangeText={setGst}
              />
            </View>

            {/* Media section */}
            <View style={styles.mediaSection}>
              <View style={styles.mediaHeader}>
                <MaterialCommunityIcons name="image-outline" size={18} color={PALETTE.navy} />
                <Text style={styles.mediaTitle}>Media (Optional)</Text>
              </View>

              <View style={styles.field}>
                <FieldLabel label="Variant Image URL" />
                <View style={styles.inputIcon}>
                  <MaterialCommunityIcons name="image-outline" size={16} color={PALETTE.textMuted} />
                  <TextInput
                    style={styles.inputInner}
                    placeholder="https://example.com/image.jpg"
                    placeholderTextColor={PALETTE.textMuted}
                    value={imageUrl}
                    onChangeText={setImageUrl}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <Pressable style={styles.uploadBtn}>
                <MaterialCommunityIcons name="upload" size={16} color={PALETTE.navy} />
                <Text style={styles.uploadText}>Upload Image</Text>
              </Pressable>

              <View style={styles.previewBox}>
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.previewImage} contentFit="cover" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="image-plus" size={32} color={PALETTE.textMuted} />
                    <Text style={styles.previewText}>Image preview will appear here</Text>
                  </>
                )}
              </View>

              <View style={styles.field}>
                <FieldLabel label="Variant Video URL" />
                <View style={styles.inputIcon}>
                  <MaterialCommunityIcons name="video-outline" size={16} color={PALETTE.textMuted} />
                  <TextInput
                    style={styles.inputInner}
                    placeholder="https://example.com/video.mp4"
                    placeholderTextColor={PALETTE.textMuted}
                    value={videoUrl}
                    onChangeText={setVideoUrl}
                    autoCapitalize="none"
                  />
                </View>
              </View>
            </View>

            {/* Submit */}
            <Pressable style={styles.submitBtn} onPress={handleSubmit}>
              <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#FFF" />
              <Text style={styles.submitText}>Add Variant</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modal: {
    backgroundColor: PALETTE.cardBg,
    borderRadius: 14,
    width: '100%',
    maxHeight: '92%',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { boxShadow: '0 8px 32px rgba(0,0,0,0.18)' } : {}),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.border,
  },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: PALETTE.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: PALETTE.navy },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PALETTE.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  form: { padding: 20, gap: 16, paddingBottom: 28 },
  row: { gap: 14 },
  rowTwoCol: { flexDirection: 'row' },
  field: { gap: 6 },
  fieldHalf: { flex: 1 },
  label: { fontSize: 13, fontWeight: '600', color: PALETTE.textPrimary },
  required: { color: PALETTE.required },

  input: {
    backgroundColor: PALETTE.inputBg,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    fontSize: 14,
    color: PALETTE.textPrimary,
  },
  inputPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.inputBg,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 10,
    paddingLeft: 14,
  },
  inputSuffix: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.inputBg,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 10,
    paddingRight: 14,
  },
  inputIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PALETTE.inputBg,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
  },
  prefixText: { fontSize: 14, fontWeight: '600', color: PALETTE.textSecondary },
  suffixText: { fontSize: 14, fontWeight: '600', color: PALETTE.textSecondary },
  inputInner: { flex: 1, fontSize: 14, color: PALETTE.textPrimary, paddingVertical: 0 },

  selectWrap: { position: 'relative', zIndex: 10 },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: PALETTE.inputBg,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectText: { fontSize: 14, color: PALETTE.textPrimary },
  selectPlaceholder: { color: PALETTE.textMuted },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: PALETTE.cardBg,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 10,
    marginTop: 4,
    zIndex: 100,
    ...(Platform.OS === 'web' ? { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } : {}),
  },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 10 },
  dropdownText: { fontSize: 14, color: PALETTE.textPrimary },

  mediaSection: {
    borderTopWidth: 1,
    borderTopColor: PALETTE.border,
    paddingTop: 16,
    gap: 14,
  },
  mediaHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mediaTitle: { fontSize: 14, fontWeight: '700', color: PALETTE.navy },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: PALETTE.navy,
    borderRadius: 10,
    paddingVertical: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
  },
  uploadText: { fontSize: 13, fontWeight: '700', color: PALETTE.navy },
  previewBox: {
    borderWidth: 1.5,
    borderColor: PALETTE.border,
    borderStyle: 'dashed',
    borderRadius: 10,
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PALETTE.inputBg,
    overflow: 'hidden',
  },
  previewImage: { width: '100%', height: 160 },
  previewText: { fontSize: 12, color: PALETTE.textMuted },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PALETTE.navy,
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 4,
  },
  submitText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
