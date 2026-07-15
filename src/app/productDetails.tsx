import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminLayout from '@/components/admin-layout';

import {
  getVariantStats,
  type ProductDetail,
  type ProductStatus,
  type ProductVariant,
} from '@/constants/product-approval-data';
import { getApiErrorMessage } from '@/lib/api/client';
import { sweetError, sweetSuccess } from '@/lib/sweetAlert';
import { resolveMediaUrl } from '@/lib/api/media';
import { formatDate, formatDateTime } from '@/lib/format';
import { approveProduct, fetchProductDetail, rejectProduct } from '@/services/productApi';
import {
  isSweetsCategory,
  isSweetsPlaceholderColor,
  variantDimensionLabels,
} from '@/lib/product/sweetsCategory';

const PLACEHOLDER_IMAGE = '';

/** Approve-modal templates — selecting one auto-fills Admin Notes. */
const APPROVE_NOTE_TEMPLATES: { id: string; label: string; note: string }[] = [
  {
    id: '1',
    label: '1. Approved – Clean & Simple',
    note: 'Product reviewed and approved. All details and images meet the required quality standards.',
  },
  {
    id: '2',
    label: '2. Approved with Minor Changes',
    note:
      'Product approved. Minor adjustments suggested for future listings (image clarity, description format, pricing alignment).',
  },
  {
    id: '9',
    label: '9. Verified Stock & Pricing',
    note: 'Product verified. Stock quantity and pricing validated. Approved for listing.',
  },
  {
    id: '5',
    label: '5. Needs Revision',
    note:
      'Product review pending revisions. Update the product specifications and correct formatting issues to proceed with approval.',
  },
  {
    id: '10',
    label: '10. Flagged for Further Review',
    note:
      'Product held for additional verification. Team will contact for supporting documents if required.',
  },
];

type ApiImage = { url?: string; variantId?: number };
type ApiSizeChartRow = { size?: string; chest?: string; waist?: string; hip?: string; length?: string };
type ApiVariant = {
  id?: number;
  color?: string;
  colorHex?: string;
  imageUrl?: string;
  size?: string;
  sku?: string;
  stock?: number;
  basePrice?: number;
  mrpExclGst?: number;
  mrpInclGst?: number;
  mrpPrice?: number;
  discountPercentage?: number;
  discountAmount?: number;
  sellingPrice?: number;
  taxPercentage?: number;
  taxAmount?: number;
  finalPrice?: number;
  commissionPercentage?: number;
  commissionAmount?: number;
  intraCityDeliveryCharge?: number;
  metroMetroDeliveryCharge?: number;
  totalPriceIntraCity?: number;
  totalPriceMetroMetro?: number;
  priceWithCommission?: number;
  highestDeliveryCharge?: number;
  displayPrice?: number;
  customerPrice?: number;
  sellingPriceWithGst?: number;
  weight?: number;
};

type SpecItem = { label: string; value: string };

export type ProductDetailExtras = {
  specItems: SpecItem[];
  keyFeatures: string;
  package: {
    boxDimensions: string;
    grossWeight: string;
    packagingType: string;
    fragileItem: string;
    productWeight: string;
    productDimensions: string;
  };
  delivery: {
    estimatedDays: string;
    coverageNote: string;
    standardDelivery: string;
    expressDelivery: string;
    cashOnDelivery: string;
    coverage: string;
    charges: { zone: string; standard: string; express: string }[];
  };
  returns: {
    policyHighlight: string;
    policySubtext: string;
    returnWindow: string;
    refundMode: string;
    warranty: string;
    conditions: string[];
    processSteps: string[];
  };
  sizeChart: {
    unit: string;
    footerNote: string;
    imageUrl?: string;
    rows: { size: string; chest: string; waist: string; hip: string; length: string }[];
  };
};

function cleanText(text: string): string {
  if (!text) return '';
  return text.replace(/[\x00-\x1F\x7F-\x9F\u2018-\u201F\u00B4\u0060\u25A1\uFFFD\u0092]/g, "'").replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x2019;/gi, "'");
}

function dash(value: unknown): string {
  if (value == null || value === '') return '—';
  return String(value);
}

function formatRupee(value: unknown): string {
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return `₹${n.toLocaleString('en-IN')}`;
}

function formatDims(l?: unknown, w?: unknown, h?: unknown): string {
  if (l == null && w == null && h == null) return '—';
  return `${dash(l)} × ${dash(w)} × ${dash(h)} cm`;
}

function parseSpecItems(raw: unknown): SpecItem[] {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => {
          if (item && typeof item === 'object') {
            const row = item as Record<string, unknown>;
            const label = dash(row.label ?? row.name ?? row.key);
            const value = dash(row.value ?? row.val);
            if (label === '—') return null;
            return { label, value };
          }
          return null;
        })
        .filter((item): item is SpecItem => item != null);
    }
  } catch {
    // plain text fallback
  }
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => ({ label: `Item ${index + 1}`, value: line }));
}

function toNum(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseKeyFeatures(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) return '—';
  const trimmed = raw.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item) => String(item)).join(' · ');
      }
    } catch {
      // plain text fallback
    }
  }
  return trimmed;
}

function parseSizeChartRows(
  raw: unknown,
  variants: ProductVariant[],
  chartImage?: string,
): ProductDetailExtras['sizeChart'] {
  const apiRows = Array.isArray(raw) ? (raw as ApiSizeChartRow[]) : [];
  if (apiRows.length > 0) {
    return {
      unit: 'Measurements from linked size chart',
      footerNote: 'Size chart loaded from seller catalog',
      imageUrl: chartImage || undefined,
      rows: apiRows.map((row) => ({
        size: dash(row.size),
        chest: dash(row.chest),
        waist: dash(row.waist),
        hip: dash(row.hip),
        length: dash(row.length),
      })),
    };
  }
  const uniqueSizes = [...new Set(variants.map((v) => v.size).filter((s) => s && s !== '—'))];
  return {
    unit: 'Variant sizes from listing',
    footerNote: uniqueSizes.length > 0 ? 'Detailed measurements not linked for this product' : 'No size chart linked',
    rows: uniqueSizes.map((size) => ({
      size,
      chest: '—',
      waist: '—',
      hip: '—',
      length: '—',
    })),
  };
}

function buildExtras(data: Record<string, unknown>, variants: ProductVariant[]): ProductDetailExtras {
  const minDays = data.deliveryTimeMin;
  const maxDays = data.deliveryTimeMax;
  const estimatedDays =
    minDays != null && maxDays != null
      ? `${minDays}-${maxDays} days`
      : minDays != null
        ? `${minDays} days`
        : maxDays != null
          ? `${maxDays} days`
          : '—';

  const returnPolicy = dash(data.returnPolicy);
  const warrantyInfo = dash(data.warrantyInfo);
  const careInstructions = dash(data.careInstructions);
  const deliveryInfo = dash(data.deliveryInfo);
  const acceptCod = data.acceptCod === true;
  const deliverAll = data.deliverAllLocations !== false;
  const careLines = careInstructions !== '—'
    ? careInstructions.split(/\n|;/).map((line) => line.trim()).filter(Boolean)
    : [];

  return {
    specItems: parseSpecItems(data.specifications),
    keyFeatures: parseKeyFeatures(data.features),
    package: {
      boxDimensions: formatDims(data.lengthCm, data.widthCm, data.heightCm),
      grossWeight: dash(data.productWeight) !== '—' ? `${dash(data.productWeight)} kg` : '—',
      packagingType: dash(data.productMaterialType),
      fragileItem: data.fragile === true ? 'Yes' : data.fragile === false ? 'No' : '—',
      productWeight: dash(data.productWeight) !== '—' ? `${dash(data.productWeight)} kg` : '—',
      productDimensions: formatDims(data.lengthCm, data.widthCm, data.heightCm),
    },
    delivery: {
      estimatedDays,
      coverageNote: deliveryInfo !== '—' ? deliveryInfo : deliverAll ? 'Deliverable across India' : 'Limited locations',
      standardDelivery: estimatedDays !== '—' ? `Available (${estimatedDays})` : '—',
      expressDelivery: '—',
      cashOnDelivery: acceptCod ? 'Available' : 'Not Available',
      coverage: deliverAll ? 'Pan India' : 'Selected locations',
      charges: [
        { zone: 'Intra City', standard: formatRupee(data.intraCityCharge), express: '—' },
        { zone: 'Metro to Metro', standard: formatRupee(data.metroMetroCharge), express: '—' },
      ],
    },
    returns: {
      policyHighlight: returnPolicy !== '—' ? returnPolicy : 'Return policy not specified',
      policySubtext: deliveryInfo !== '—' ? deliveryInfo : 'See seller return terms',
      returnWindow: returnPolicy !== '—' ? returnPolicy : '—',
      refundMode: 'As per marketplace policy',
      warranty: warrantyInfo,
      conditions: careLines.length > 0 ? careLines : returnPolicy !== '—' ? [returnPolicy] : ['Product must be unused and in original packaging'],
      processSteps: ['Request Return', 'Pickup Scheduled', 'Quality Check', 'Refund Processed'],
    },
    sizeChart: parseSizeChartRows(
      data.sizeChartRows,
      variants,
      data.sizeChartImage ? resolveMediaUrl(String(data.sizeChartImage)) : undefined,
    ),
  };
}

function mapApiProductDetail(data: Record<string, unknown>): {
  product: ProductDetail;
  variants: ProductVariant[];
  extras: ProductDetailExtras;
  sellerPhone: string;
} {
  const images = (data.images as ApiImage[] | undefined) ?? [];
  const gallery = images
    .map((img) => resolveMediaUrl(String(img.url ?? '')))
    .filter(Boolean);
  const primaryImage = gallery[0] ?? PLACEHOLDER_IMAGE;
  const variantsRaw = (data.variants as ApiVariant[] | undefined) ?? [];
  const gst = toNum(data.gstPercentage, 18);
  const statusRaw = String(data.status ?? 'pending').toLowerCase();
  const status: ProductStatus =
    statusRaw === 'approved' || statusRaw === 'active'
      ? 'approved'
      : statusRaw === 'inactive' || statusRaw === 'disabled'
        ? 'inactive'
        : statusRaw === 'rejected'
          ? 'rejected'
          : statusRaw === 'review' || statusRaw === 'under_review'
            ? 'review'
            : 'pending';

  const variants: ProductVariant[] = variantsRaw.map((v) => {
    const sellingWith = toNum(v.finalPrice ?? v.mrpPrice ?? v.sellingPrice);
    const sellingExcl = toNum(v.sellingPrice, gst > 0 ? sellingWith / (1 + gst / 100) : sellingWith);
    const taxPct = toNum(v.taxPercentage, gst);
    const taxAmt = toNum(v.taxAmount, Math.max(0, sellingWith - sellingExcl));
    const mrpExcl = toNum(v.mrpExclGst ?? v.basePrice, sellingExcl);
    const discountPct = toNum(v.discountPercentage);
    const variantImage = resolveMediaUrl(String(v.imageUrl ?? '')) || primaryImage;
    return {
      id: String(v.id ?? ''),
      colorName: String(v.color ?? '—'),
      colorHex: String(v.colorHex ?? '#9CA3AF'),
      image: variantImage,
      size: String(v.size ?? '—'),
      sku: String(v.sku ?? '—'),
      stock: toNum(v.stock),
      mrp: mrpExcl,
      discountPercent: discountPct,
      sellingPriceExclGst: sellingExcl,
      gstPercent: taxPct,
      gstAmount: taxAmt,
      sellingPriceWithGst: toNum(v.sellingPriceWithGst, sellingWith),
      commissionPercent: toNum(v.commissionPercentage),
      commissionAmount: toNum(v.commissionAmount),
      intraCityDelivery: toNum(v.intraCityDeliveryCharge),
      metroDelivery: toNum(v.metroMetroDeliveryCharge),
      priceWithCommission: toNum(
        v.priceWithCommission,
        toNum(v.sellingPriceWithGst, sellingWith) + toNum(v.commissionAmount),
      ),
      highestDeliveryCharge: toNum(
        v.highestDeliveryCharge,
        Math.max(toNum(v.intraCityDeliveryCharge), toNum(v.metroMetroDeliveryCharge)),
      ),
      displayPrice: toNum(
        v.displayPrice ?? v.customerPrice,
        toNum(v.priceWithCommission, toNum(v.sellingPriceWithGst, sellingWith) + toNum(v.commissionAmount))
          + Math.max(toNum(v.intraCityDeliveryCharge), toNum(v.metroMetroDeliveryCharge)),
      ),
      totalPriceIntraCity: toNum(
        v.totalPriceIntraCity,
        toNum(v.sellingPriceWithGst, sellingWith) + toNum(v.commissionAmount) + toNum(v.intraCityDeliveryCharge),
      ),
      totalPriceMetroMetro: toNum(
        v.totalPriceMetroMetro ?? v.customerPrice,
        toNum(v.sellingPriceWithGst, sellingWith) + toNum(v.commissionAmount) + toNum(v.metroMetroDeliveryCharge),
      ),
    };
  });

  const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
  const firstVariant = variants[0];
  const mainCategory = String(data.mainCategoryName ?? '');
  const categoryName = String(data.categoryName ?? `Category #${data.categoryId ?? '—'}`);
  const categoryLabel = mainCategory && mainCategory !== categoryName
    ? `${mainCategory} > ${categoryName}`
    : categoryName;
  const sellerLabel = data.addedByAdmin === true
    ? 'Admin Catalog'
    : String(data.sellerName ?? `Seller #${data.sellerId ?? '—'}`);
  const discount = firstVariant?.discountPercent ?? 0;
  const displayPrice = firstVariant?.displayPrice ?? firstVariant?.sellingPriceWithGst ?? 0;
  const displayMrp = firstVariant?.mrp ?? displayPrice;
  const commissionLabel = firstVariant?.commissionPercent ?? 0;

  const product: ProductDetail = {
    id: String(data.id ?? ''),
    name: cleanText(String(data.name ?? 'Product')),
    description: cleanText(String(data.shortDescription ?? data.description ?? '')),
    image: primaryImage,
    seller: sellerLabel,
    email: String(data.sellerEmail ?? ''),
    category: categoryLabel,
    status,
    submittedOn: formatDateTime(String(data.createdAt ?? '')),
    sku: String(data.sku ?? '—'),
    lastUpdated: formatDate(String(data.updatedAt ?? data.createdAt ?? '')),
    categoryLabel,
    subcategory: String(data.subcategoryName ?? `Subcategory #${data.subcategoryId ?? '—'}`),
    fullTitle: cleanText(String(data.name ?? 'Product')),
    price: displayPrice,
    mrp: displayMrp,
    gst,
    material: dash(data.productMaterialType),
    weight: dash(data.productWeight) !== '—' ? `${dash(data.productWeight)} kg` : '—',
    hsnCode: dash(data.hsnCode),
    warranty: dash(data.warrantyInfo),
    returnPolicy: dash(data.returnPolicy),
    size: firstVariant?.size ?? '—',
    delivery:
      data.deliveryTimeMin != null && data.deliveryTimeMax != null
        ? `${data.deliveryTimeMin}-${data.deliveryTimeMax} days`
        : dash(data.deliveryInfo) !== '—'
          ? String(data.deliveryInfo)
          : '—',
    stock: totalStock,
    stockStatus: totalStock > 0 ? 'In Stock' : 'Out of Stock',
    discount,
    color: firstVariant?.colorName ?? '—',
    dbStatus: statusRaw,
    createdAt: formatDate(String(data.createdAt ?? '')),
    approvedAt: data.reviewedAt ? formatDateTime(String(data.reviewedAt)) : '—',
    adminNote: String(data.adminNotes ?? '—'),
    fullDescription: cleanText(String(data.description ?? data.shortDescription ?? '')),
    gallery: gallery.length > 0 ? gallery : primaryImage ? [primaryImage] : [],
  };

  const extras = buildExtras(data, variants);
  if (data.sizeChartName) {
    extras.sizeChart.unit = String(data.sizeChartName);
  }

  return {
    product,
    variants,
    extras,
    sellerPhone: String(data.sellerPhone ?? ''),
  };
}

const PALETTE = {
  navy: '#1E2A3B',
  purple: '#5E35B1',
  purpleLight: '#EDE9FE',
  orange: '#F97316',
  orangeLight: '#FFF7ED',
  green: '#22C55E',
  greenLight: '#DCFCE7',
  red: '#EF4444',
  redLight: '#FEE2E2',
  blue: '#3B82F6',
  pageBg: '#F4F6FB',
  cardBg: '#FFFFFF',
  border: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  tabActive: '#1E3A5F',
};

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'variants', label: 'Variants' },
  { key: 'specifications', label: 'Specifications' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'returns', label: 'Returns' },
  { key: 'sizechart', label: 'Size Chart' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function useBreakpoint() {
  const { width } = useWindowDimensions();
  return { width, isWide: width >= 1024, isTablet: width >= 480 && width < 1024 };
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

function VariantsTab({
  isWide,
  variants,
  sweetsProduct,
}: {
  isWide: boolean;
  variants: ProductVariant[];
  sweetsProduct: boolean;
}) {
  const stats = getVariantStats(variants);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const commissionLabel = variants[0]?.commissionPercent ?? 0;
  const dimLabels = variantDimensionLabels(sweetsProduct);

  return (
    <View style={styles.tabContent}>
      {/* Summary stats */}
      <View style={[styles.variantStatsRow, !isWide && styles.variantStatsRowMobile]}>
        <View style={[styles.variantStatBox, isWide && styles.variantStatBoxWide]}>
          <Text style={styles.variantStatLabel}>Total Variants</Text>
          <Text style={[styles.variantStatValue, { color: PALETTE.navy }]}>{stats.totalVariants}</Text>
        </View>
        <View style={[styles.variantStatBox, isWide && styles.variantStatBoxWide]}>
          <Text style={styles.variantStatLabel}>Total Stock</Text>
          <Text style={[styles.variantStatValue, { color: PALETTE.green }]}>
            {stats.totalStock} units
          </Text>
        </View>
        <View style={[styles.variantStatBox, isWide && styles.variantStatBoxLast]}>
          <Text style={styles.variantStatLabel}>Avg. Total Price</Text>
          <Text style={[styles.variantStatValue, { color: PALETTE.navy }]}>
            ₹{stats.avgSellingPrice.toFixed(2)}
          </Text>
          <Text style={{ fontSize: 10, color: PALETTE.textMuted, marginTop: 2 }}>incl. GST + commission + delivery</Text>
        </View>
      </View>

      {/* Section header */}
      <View style={[styles.variantSectionHeader, !isWide && styles.variantSectionHeaderMobile]}>
        <Text style={styles.variantSectionTitle}>Product Variants ({variants.length})</Text>
        <View style={styles.variantHeaderActions}>
          <View style={styles.viewToggle}>
            <Pressable
              onPress={() => setViewMode('grid')}
              style={[styles.viewBtn, viewMode === 'grid' && styles.viewBtnActive]}>
              <MaterialCommunityIcons
                name="view-grid-outline"
                size={16}
                color={viewMode === 'grid' ? PALETTE.navy : PALETTE.textMuted}
              />
            </Pressable>
            <Pressable
              onPress={() => setViewMode('list')}
              style={[styles.viewBtn, viewMode === 'list' && styles.viewBtnActive]}>
              <MaterialCommunityIcons
                name="view-list-outline"
                size={16}
                color={viewMode === 'list' ? PALETTE.navy : PALETTE.textMuted}
              />
            </Pressable>
          </View>
          <Pressable style={styles.variantAddBtn}>
            <MaterialCommunityIcons name="plus" size={16} color="#FFF" />
            <Text style={styles.variantAddText}>Add</Text>
          </Pressable>
        </View>
      </View>

      {viewMode === 'list' ? (
        <View style={styles.variantTableCard}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.variantTable}>
              <View style={styles.variantTableHeader}>
                <Text style={[styles.vth, styles.vcolSize]}>{dimLabels.sizeLabel}</Text>
                <Text style={[styles.vth, styles.vcolSku]}>SKU</Text>
                <Text style={[styles.vth, styles.vcolStock]}>Stock</Text>
                <Text style={[styles.vth, styles.vcolMinQty]}>Min{'\n'}Qty</Text>
                <Text style={[styles.vth, styles.vcolMrp]}>MRP{'\n'}<Text style={{ fontSize: 9 }}>(Excl. GST)</Text></Text>
                <Text style={[styles.vth, styles.vcolDisc]}>Discount{'\n'}<Text style={{ fontSize: 9 }}>(%)</Text></Text>
                <Text style={[styles.vth, styles.vcolSell]}>Selling{'\n'}Price{'\n'}<Text style={{ fontSize: 9 }}>(Excl. GST)</Text></Text>
                <Text style={[styles.vth, styles.vcolGst]}>GST{'\n'}<Text style={{ fontSize: 9 }}>(%)</Text></Text>
                <Text style={[styles.vth, styles.vcolSellGst]}>Selling{'\n'}Price{'\n'}<Text style={{ fontSize: 9 }}>(With GST)</Text></Text>
                <Text style={[styles.vth, styles.vcolComm]}>Commission{'\n'}<Text style={{ fontSize: 9 }}>({commissionLabel}%)</Text></Text>
                <Text style={[styles.vth, styles.vcolDel]}>Intra-{'\n'}City{'\n'}<Text style={{ fontSize: 9 }}>Delivery</Text></Text>
                <Text style={[styles.vth, styles.vcolDel]}>Metro-{'\n'}Metro{'\n'}<Text style={{ fontSize: 9 }}>Delivery</Text></Text>
                <View style={styles.vcolTotalIntraHeader}>
                  <Text style={[styles.vth, styles.vcolTotalHeaderText]}>Total{'\n'}<Text style={{ fontSize: 9 }}>(Intra-City)</Text></Text>
                </View>
                <View style={styles.vcolTotalMetroHeader}>
                  <Text style={[styles.vth, styles.vcolTotalHeaderText]}>Total{'\n'}<Text style={{ fontSize: 9 }}>(Metro-Metro)</Text></Text>
                </View>
              </View>
              {variants.map((v) => (
                <VariantTableRow key={v.id} variant={v} />
              ))}
            </View>
          </ScrollView>
        </View>
      ) : (
        <View style={styles.variantGrid}>
          {variants.map((v) => (
            <VariantCard key={v.id} variant={v} compact={false} sweetsProduct={sweetsProduct} />
          ))}
        </View>
      )}
    </View>
  );
}

function VariantTableRow({ variant: v }: { variant: ProductVariant }) {
  const intraCityTotal = v.totalPriceIntraCity;
  const metroMetroTotal = v.totalPriceMetroMetro;

  return (
    <View style={styles.variantTableRow}>
      <View style={styles.vcolSize}>
        <View style={styles.vSizePill}>
          <Text style={styles.vSizeText}>{v.size}</Text>
        </View>
      </View>
      <View style={styles.vcolSku}>
        <View style={{ backgroundColor: '#FFEDD5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' }}>
          <Text style={{ fontSize: 10, color: '#C2410C', fontWeight: 'bold' }}>{v.sku}</Text>
        </View>
      </View>
      <View style={styles.vcolStock}>
        <View style={styles.vStockPill}>
          <Text style={styles.vStockText}>{v.stock} units</Text>
        </View>
      </View>
      <View style={styles.vcolMinQty}>
        <Text style={styles.vcellText}>—</Text>
      </View>
      <View style={styles.vcolMrp}>
        <Text style={styles.vMrpText}>₹{v.mrp.toFixed(2)}</Text>
      </View>
      <View style={styles.vcolDisc}>
        <View style={styles.vStockPill}>
          <Text style={styles.vStockText}>{v.discountPercent.toFixed(2)}% OFF</Text>
        </View>
      </View>
      <View style={styles.vcolSell}>
        <Text style={styles.vcellText}>₹{v.sellingPriceExclGst.toFixed(2)}</Text>
      </View>
      <View style={styles.vcolGst}>
        <Text style={styles.vGstAmount}>+ ₹{v.gstAmount.toFixed(2)}</Text>
        <Text style={styles.vGstPct}>({v.gstPercent}%)</Text>
      </View>
      <View style={styles.vcolSellGst}>
        <Text style={styles.vSellGstText}>₹{v.sellingPriceWithGst.toFixed(2)}</Text>
      </View>
      <View style={styles.vcolComm}>
        <Text style={styles.vCommAmount}>+ ₹{v.commissionAmount.toFixed(2)}</Text>
        <Text style={styles.vCommPct}>({v.commissionPercent}%)</Text>
      </View>
      <View style={styles.vcolDel}>
        <Text style={styles.vcellText}>+ ₹{v.intraCityDelivery.toFixed(2)}</Text>
      </View>
      <View style={styles.vcolDel}>
        <Text style={styles.vcellText}>+ ₹{v.metroDelivery.toFixed(2)}</Text>
      </View>
      <View style={styles.vcolTotalIntra}>
        <Text style={styles.vcolTotalIntraText}>₹{intraCityTotal.toFixed(2)}</Text>
      </View>
      <View style={styles.vcolTotalMetro}>
        <Text style={styles.vcolTotalMetroText}>₹{metroMetroTotal.toFixed(2)}</Text>
      </View>
    </View>
  );
}

function VariantCard({
  variant: v,
  compact,
  sweetsProduct,
}: {
  variant: ProductVariant;
  compact?: boolean;
  sweetsProduct?: boolean;
}) {
  const dimLabels = variantDimensionLabels(!!sweetsProduct);
  return (
    <View style={[styles.variantCard, compact && styles.variantCardCompact]}>
      <View style={styles.variantCardTop}>
        <Image source={{ uri: v.image }} style={styles.variantCardImg} contentFit="cover" />
        <View style={styles.variantCardInfo}>
          {dimLabels.showColor && !isSweetsPlaceholderColor(v.colorName) ? (
            <View style={styles.vcellColor}>
              <View style={[styles.vColorDot, { backgroundColor: v.colorHex }]} />
              <Text style={styles.vColorName}>{v.colorName}</Text>
            </View>
          ) : null}
          <View style={styles.vSizePill}>
            <Text style={styles.vSizeText}>
              {dimLabels.sizeLabel} {v.size}
            </Text>
          </View>
          <Text style={styles.vSkuText}>{v.sku}</Text>
        </View>
        <View style={styles.vStockPill}>
          <Text style={styles.vStockText}>{v.stock} units</Text>
        </View>
      </View>
      <View style={styles.variantCardPrices}>
        <View style={styles.variantPriceItem}>
          <Text style={styles.variantPriceLabel}>MRP</Text>
          <Text style={styles.vMrpText}>₹{v.mrp.toFixed(2)}</Text>
        </View>
        <View style={styles.variantPriceItem}>
          <Text style={styles.variantPriceLabel}>Discount</Text>
          <Text style={styles.vDiscText}>{v.discountPercent}% OFF</Text>
        </View>
        <View style={styles.variantPriceItem}>
          <Text style={styles.variantPriceLabel}>Selling (GST)</Text>
          <Text style={styles.vSellGstText}>₹{v.sellingPriceWithGst.toFixed(2)}</Text>
        </View>
        <View style={styles.variantPriceItem}>
          <Text style={styles.variantPriceLabel}>Total Price</Text>
          <Text style={styles.vSellGstText}>₹{v.displayPrice.toFixed(2)}</Text>
        </View>
      </View>
      <View style={styles.variantCardDelivery}>
        <Text style={styles.variantDelText}>Intra-City: + ₹{v.intraCityDelivery.toFixed(2)}</Text>
        <Text style={styles.variantDelText}>Metro: + ₹{v.metroDelivery.toFixed(2)}</Text>
      </View>
    </View>
  );
}

function SpecRow({
  label,
  value,
  valueColor,
  stacked,
}: {
  label: string;
  value: string;
  valueColor?: string;
  stacked?: boolean;
}) {
  return (
    <View style={[styles.specRow, stacked && styles.specRowStacked]}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text
        style={[
          styles.specValue,
          stacked && styles.specValueStacked,
          valueColor ? { color: valueColor } : null,
        ]}>
        {value}
      </Text>
    </View>
  );
}

function SpecSectionCard({
  title,
  icon,
  children,
  flex,
}: {
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  children: ReactNode;
  flex?: number;
}) {
  return (
    <View style={[styles.specCard, flex ? { flex } : null]}>
      <View style={styles.specCardHeader}>
        <MaterialCommunityIcons name={icon} size={18} color={PALETTE.tabActive} />
        <Text style={styles.specCardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function SpecificationsTab({ isWide, extras }: { isWide: boolean; extras: ProductDetailExtras }) {
  const { specItems, keyFeatures, package: pkg } = extras;

  return (
    <View style={styles.tabContent}>
      <View style={[styles.specTopRow, !isWide && styles.specTopRowMobile]}>
        <SpecSectionCard title="Specifications" icon="clipboard-list-outline" flex={isWide ? 2 : undefined}>
          {specItems.length > 0 ? (
            specItems.map((item) => (
              <SpecRow key={item.label} label={item.label} value={item.value} stacked={!isWide} />
            ))
          ) : (
            <Text style={styles.emptyTabText}>No specifications provided.</Text>
          )}
        </SpecSectionCard>

        <SpecSectionCard title="Key Features" icon="lightning-bolt" flex={isWide ? 1 : undefined}>
          <View style={styles.keyFeatureRow}>
            <MaterialCommunityIcons name="check-circle" size={16} color={PALETTE.green} />
            <Text style={styles.keyFeatureText}>{keyFeatures}</Text>
          </View>
        </SpecSectionCard>
      </View>

      <SpecSectionCard title="Package Dimensions & Handling" icon="package-variant">
        <View style={[styles.packageGrid, !isWide && styles.packageGridMobile]}>
          <View style={styles.packageCol}>
            <SpecRow label="Box Dimensions" value={pkg.boxDimensions} />
            <SpecRow label="Gross Weight" value={pkg.grossWeight} />
          </View>
          <View style={styles.packageCol}>
            <SpecRow label="Packaging Type" value={pkg.packagingType} />
            <SpecRow label="Fragile Item" value={pkg.fragileItem} valueColor={PALETTE.green} />
          </View>
          <View style={styles.packageCol}>
            <SpecRow label="Product Weight" value={pkg.productWeight} />
            <SpecRow label="Product Dimensions" value={pkg.productDimensions} />
          </View>
        </View>
      </SpecSectionCard>
    </View>
  );
}

function DeliveryTab({ isWide, extras }: { isWide: boolean; extras: ProductDetailExtras }) {
  const d = extras.delivery;

  return (
    <View style={styles.tabContent}>
      <View style={[styles.deliveryRow, !isWide && styles.deliveryRowMobile]}>
        {/* Delivery Information */}
        <View style={styles.deliveryCard}>
          <View style={styles.specCardHeader}>
            <MaterialCommunityIcons name="truck-outline" size={18} color={PALETTE.tabActive} />
            <Text style={styles.specCardTitle}>Delivery Information</Text>
          </View>

          <View style={styles.estimatedBox}>
            <MaterialCommunityIcons name="calendar-clock" size={22} color={PALETTE.blue} />
            <View style={styles.estimatedText}>
              <Text style={styles.estimatedTitle}>Estimated: {d.estimatedDays}</Text>
              <Text style={styles.estimatedSub}>{d.coverageNote}</Text>
            </View>
          </View>

          <SpecRow label="Standard Delivery" value={d.standardDelivery} valueColor={PALETTE.green} />
          <SpecRow label="Express Delivery" value={d.expressDelivery} valueColor={PALETTE.red} />
          <SpecRow label="Cash on Delivery" value={d.cashOnDelivery} valueColor={PALETTE.red} />
          <SpecRow label="Coverage" value={d.coverage} />
        </View>

        {/* Weight & Delivery Charges */}
        <View style={styles.deliveryCard}>
          <View style={styles.specCardHeader}>
            <MaterialCommunityIcons name="currency-inr" size={18} color={PALETTE.tabActive} />
            <Text style={styles.specCardTitle}>Weight & Delivery Charges</Text>
          </View>

          <View style={styles.chargesTable}>
            <View style={styles.chargesHeader}>
              <Text style={[styles.chargesTh, styles.chargesColZone]}>Zone</Text>
              <Text style={[styles.chargesTh, styles.chargesColPrice]}>Standard</Text>
              <Text style={[styles.chargesTh, styles.chargesColPrice]}>Express</Text>
            </View>
            {d.charges.map((row, index) => (
              <View key={row.zone} style={[styles.chargesRow, index % 2 === 1 && styles.chargesRowAlt]}>
                <Text style={[styles.chargesTd, styles.chargesColZone]}>{row.zone}</Text>
                <Text style={[styles.chargesTd, styles.chargesColPrice, styles.chargesGreen]}>
                  {row.standard}
                </Text>
                <Text style={[styles.chargesTd, styles.chargesColPrice, styles.chargesDash]}>
                  {row.express}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function ReturnsTab({ isWide, extras }: { isWide: boolean; extras: ProductDetailExtras }) {
  const r = extras.returns;

  return (
    <View style={styles.tabContent}>
      <View style={[styles.returnsTopRow, !isWide && styles.returnsTopRowMobile]}>
        {/* Return Policy */}
        <View style={styles.deliveryCard}>
          <View style={styles.specCardHeader}>
            <MaterialCommunityIcons name="backup-restore" size={18} color={PALETTE.tabActive} />
            <Text style={styles.specCardTitle}>Return Policy</Text>
          </View>

          <View style={styles.returnHighlightBox}>
            <MaterialCommunityIcons name="check-circle" size={20} color={PALETTE.green} />
            <View style={styles.returnHighlightText}>
              <Text style={styles.returnHighlightMain}>{r.policyHighlight}</Text>
              <Text style={styles.returnHighlightSub}>{r.policySubtext}</Text>
            </View>
          </View>

          <SpecRow label="Return Window" value={r.returnWindow} valueColor={PALETTE.green} stacked={!isWide} />
          <SpecRow label="Refund Mode" value={r.refundMode} stacked={!isWide} />
          <SpecRow label="Warranty" value={r.warranty} stacked={!isWide} />
        </View>

        {/* Return Conditions */}
        <View style={styles.deliveryCard}>
          <View style={styles.specCardHeader}>
            <MaterialCommunityIcons name="clipboard-check-outline" size={18} color={PALETTE.tabActive} />
            <Text style={styles.specCardTitle}>Return Conditions</Text>
          </View>

          {r.conditions.map((condition, index) => (
            <View key={index} style={styles.conditionRow}>
              <Text style={styles.conditionNum}>{index + 1}.</Text>
              <Text style={styles.conditionText}>{condition}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Return Process */}
      <View style={styles.deliveryCard}>
        <View style={styles.specCardHeader}>
          <MaterialCommunityIcons name="swap-horizontal" size={18} color={PALETTE.tabActive} />
          <Text style={styles.specCardTitle}>Return Process</Text>
        </View>

        <View style={styles.processBar}>
          <Text style={styles.processText}>
            {r.processSteps.join(' → ')}
          </Text>
        </View>
      </View>
    </View>
  );
}

function SizeChartTab({ isWide, extras }: { isWide: boolean; extras: ProductDetailExtras }) {
  const chart = extras.sizeChart;
  const colStyle = isWide ? styles.sizeColWide : styles.sizeCol;

  const table = (
    <View style={[styles.sizeTable, isWide && styles.sizeTableWide]}>
      <View style={[styles.sizeTableHead, isWide && styles.sizeTableHeadWide]}>
        <Text style={[styles.sizeTh, colStyle]}>Size</Text>
        <Text style={[styles.sizeTh, colStyle]}>Chest</Text>
        <Text style={[styles.sizeTh, colStyle]}>Waist</Text>
        <Text style={[styles.sizeTh, colStyle]}>Hip</Text>
        <Text style={[styles.sizeTh, colStyle]}>Length</Text>
      </View>
      {chart.rows.length === 0 ? (
        <Text style={styles.emptyTabText}>No size chart data available.</Text>
      ) : chart.rows.map((row, index) => (
        <View
          key={row.size}
          style={[
            styles.sizeTableRow,
            isWide && styles.sizeTableRowWide,
            index % 2 === 1 && styles.sizeTableRowAlt,
          ]}>
          <Text style={[styles.sizeTd, colStyle, styles.sizeTdBold]}>{row.size}</Text>
          <Text style={[styles.sizeTd, colStyle]}>{row.chest}</Text>
          <Text style={[styles.sizeTd, colStyle]}>{row.waist}</Text>
          <Text style={[styles.sizeTd, colStyle]}>{row.hip}</Text>
          <Text style={[styles.sizeTd, colStyle]}>{row.length}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.tabContent}>
      <View style={[styles.sizeChartCard, isWide && styles.sizeChartCardWide]}>
        <View style={styles.sizeChartHeader}>
          <View style={styles.sizeChartIconBox}>
            <MaterialCommunityIcons name="ruler" size={20} color={PALETTE.tabActive} />
          </View>
          <View>
            <Text style={styles.specCardTitle}>Size Chart</Text>
            <Text style={styles.sizeChartUnit}>{chart.unit}</Text>
          </View>
        </View>

        {chart.imageUrl ? (
          <Image source={{ uri: chart.imageUrl }} style={styles.sizeChartImage} contentFit="contain" />
        ) : null}

        {isWide ? table : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {table}
          </ScrollView>
        )}

        <View style={styles.sizeChartFooter}>
          <MaterialCommunityIcons name="information-outline" size={18} color={PALETTE.blue} />
          <Text style={styles.sizeChartFooterText}>{chart.footerNote}</Text>
        </View>
      </View>
    </View>
  );
}

function SectionCard({
  title,
  icon,
  children,
  flex,
}: {
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  children: ReactNode;
  flex?: number;
}) {
  return (
    <View style={[styles.sectionCard, flex ? { flex } : null]}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name={icon} size={18} color={PALETTE.purple} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isWide, width } = useBreakpoint();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [activeImage, setActiveImage] = useState(0);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [extras, setExtras] = useState<ProductDetailExtras | null>(null);
  const [sellerPhone, setSellerPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveTemplateId, setApproveTemplateId] = useState('');
  const [approveNote, setApproveNote] = useState('');
  const handleBack = () => {
    if (product?.status === 'pending' || product?.status === 'review') {
      router.push('/productApproval');
    } else {
      router.push('/productApproval');
    }
  };

  const loadProduct = useCallback(async () => {
    const productId = Number(id);
    if (!id || Number.isNaN(productId)) {
      setLoading(false);
      setProduct(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchProductDetail(productId);
      const mapped = mapApiProductDetail(data);
      setProduct(mapped.product);
      setVariants(mapped.variants);
      setExtras(mapped.extras);
      setSellerPhone(mapped.sellerPhone);
      setActiveImage(0);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load product.'));
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const canReview =
    product?.status === 'pending' || product?.status === 'review' || product?.dbStatus === 'pending';

  const openApproveModal = () => {
    setApproveTemplateId('');
    setApproveNote('');
    setShowApproveModal(true);
  };

  const handleApproveTemplateChange = (templateId: string) => {
    setApproveTemplateId(templateId);
    const matched = APPROVE_NOTE_TEMPLATES.find((t) => t.id === templateId);
    setApproveNote(matched?.note ?? '');
  };

  const handleApprove = async () => {
    const productId = Number(id);
    if (Number.isNaN(productId)) return;

    setActionLoading(true);
    try {
      const note = approveNote.trim();
      await approveProduct(productId, note || undefined);
      setShowApproveModal(false);
      setApproveTemplateId('');
      setApproveNote('');
      void sweetSuccess('Product approved.');
      handleBack();
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Failed to approve product.');
      void sweetError('Error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const productId = Number(id);
    if (Number.isNaN(productId)) return;
    setActionLoading(true);
    try {
      await rejectProduct(productId, rejectNote.trim() || 'Product rejected.');
      setShowRejectModal(false);
      setRejectNote('');
      void sweetSuccess('Product rejected.');
      handleBack();
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Failed to reject product.');
      void sweetError('Error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.notFound}>
            <ActivityIndicator size="large" color={PALETTE.purple} />
            <Text style={styles.notFoundText}>Loading product…</Text>
          </View>
        </SafeAreaView>
      </AdminLayout>
    );
  }

  if (error || !product) {
    return (
      <AdminLayout>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.notFound}>
            <Text style={styles.notFoundText}>{error ?? 'Product not found'}</Text>
            <Pressable style={styles.backBtnLight} onPress={() => (error ? loadProduct() : handleBack())}>
              <Text style={styles.backBtnLightText}>{error ? 'Retry' : 'Go Back'}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </AdminLayout>
    );
  }

  const contentMax = isWide ? Math.min(width, 1200) : width;
  const firstVariant = variants[0];
  const commissionLabel = firstVariant?.commissionPercent ?? 0;
  const sweetsProduct =
    isSweetsCategory(product.categoryLabel, product.subcategory, product.category) ||
    isSweetsPlaceholderColor(product.color);
  const dimLabels = variantDimensionLabels(sweetsProduct);

  return (
    <AdminLayout>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Modal visible={showApproveModal} transparent animationType="fade">
          <View style={styles.rejectModalBackdrop}>
            <View style={[styles.rejectModalCard, styles.approveModalCard]}>
              <View style={styles.approveModalHeader}>
                <Text style={styles.rejectModalTitle}>Approve Product</Text>
                <Pressable
                  onPress={() => {
                    if (actionLoading) return;
                    setShowApproveModal(false);
                  }}
                  hitSlop={8}
                >
                  <MaterialCommunityIcons name="close" size={22} color={PALETTE.textSecondary} />
                </Pressable>
              </View>

              <Text style={styles.approveModalLabel}>Select Template (Optional)</Text>
              {Platform.OS === 'web' ? (
                <View style={styles.approveSelectWrap}>
                  {/* @ts-expect-error web-only select */}
                  <select
                    value={approveTemplateId}
                    onChange={(e: { target: { value: string } }) =>
                      handleApproveTemplateChange(e.target.value)
                    }
                    style={{
                      width: '100%',
                      height: 42,
                      border: '1px solid #E5E7EB',
                      borderRadius: 8,
                      background: '#FFFFFF',
                      fontSize: 14,
                      color: '#111827',
                      outline: 'none',
                      paddingLeft: 12,
                      paddingRight: 12,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    <option value="">-- Select a template --</option>
                    {APPROVE_NOTE_TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </View>
              ) : (
                <View style={styles.approveTemplateList}>
                  {APPROVE_NOTE_TEMPLATES.map((t) => {
                    const active = approveTemplateId === t.id;
                    return (
                      <Pressable
                        key={t.id}
                        style={[styles.approveTemplateOption, active && styles.approveTemplateOptionActive]}
                        onPress={() => handleApproveTemplateChange(t.id)}
                      >
                        <Text
                          style={[
                            styles.approveTemplateOptionText,
                            active && styles.approveTemplateOptionTextActive,
                          ]}
                        >
                          {t.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
              <Text style={styles.approveModalHint}>
                Select a template to auto-fill notes, or write custom notes below
              </Text>

              <Text style={styles.approveModalLabel}>Admin Notes (Optional)</Text>
              <TextInput
                style={styles.rejectModalInput}
                placeholder="Admin notes for this approval"
                placeholderTextColor={PALETTE.textMuted}
                value={approveNote}
                onChangeText={setApproveNote}
                multiline
              />

              <View style={styles.approveModalActions}>
                <Pressable
                  style={styles.rejectActionBtn}
                  disabled={actionLoading}
                  onPress={() => setShowApproveModal(false)}
                >
                  <Text style={styles.rejectActionText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.approveActionBtn, actionLoading && { opacity: 0.6 }]}
                  disabled={actionLoading}
                  onPress={() => void handleApprove()}
                >
                  <Text style={styles.approveActionText}>
                    {actionLoading ? 'Approving…' : 'Approve Product'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={showRejectModal} transparent animationType="fade">
          <View style={styles.rejectModalBackdrop}>
            <View style={styles.rejectModalCard}>
              <Text style={styles.rejectModalTitle}>Reject product</Text>
              <Text style={styles.rejectModalSub}>{product.name}</Text>
              <TextInput
                style={styles.rejectModalInput}
                placeholder="Reason / admin note"
                placeholderTextColor={PALETTE.textMuted}
                value={rejectNote}
                onChangeText={setRejectNote}
                multiline
              />
              <View style={styles.headerActions}>
                <Pressable style={styles.rejectActionBtn} onPress={() => setShowRejectModal(false)}>
                  <Text style={styles.rejectActionText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={styles.approveActionBtn}
                  disabled={actionLoading}
                  onPress={() => void handleReject()}
                >
                  <Text style={styles.approveActionText}>Reject</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { maxWidth: contentMax, alignSelf: 'center', width: '100%' }]}
          showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={[styles.header, !isWide && styles.headerMobile]}>
            <View style={styles.headerLeft}>
              <Pressable style={styles.backBtn} onPress={handleBack}>
                <MaterialCommunityIcons name="arrow-left" size={18} color="#FFF" />
                <Text style={styles.backBtnText}>Back</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  Product Details
                </Text>
                <Text style={styles.headerSub} numberOfLines={1}>
                  SKU: {product.sku} - Last updated: {product.lastUpdated || '17 May 2026'}
                </Text>
              </View>
            </View>

            {/* Desktop (isWide): filled Approve/Reject next to title */}
            {canReview && isWide ? (
              <View style={styles.headerActions}>
                <Pressable
                  style={[styles.approveActionBtn, actionLoading && { opacity: 0.6 }]}
                  disabled={actionLoading}
                  onPress={openApproveModal}
                >
                  <MaterialCommunityIcons name="check-circle-outline" size={16} color="#FFF" />
                  <Text style={styles.approveActionText}>Approve</Text>
                </Pressable>
                <Pressable
                  style={[styles.rejectActionBtn, actionLoading && { opacity: 0.6 }]}
                  disabled={actionLoading}
                  onPress={() => setShowRejectModal(true)}
                >
                  <MaterialCommunityIcons name="close-circle-outline" size={16} color="#FFF" />
                  <Text style={styles.rejectActionText}>Reject</Text>
                </Pressable>
              </View>
            ) : null}

            {/* All non-wide (tablet + mobile): single row, same filled style as desktop. No duplicate bottom buttons. */}
            {canReview && !isWide ? (
              <View style={styles.mobileHeaderBtns}>
                <Pressable
                  style={[styles.approveActionBtn, styles.mobileActionBtnFlex, actionLoading && { opacity: 0.6 }]}
                  disabled={actionLoading}
                  onPress={openApproveModal}
                >
                  <MaterialCommunityIcons name="check-circle-outline" size={16} color="#FFF" />
                  <Text style={styles.approveActionText}>Approve</Text>
                </Pressable>
                <Pressable
                  style={[styles.rejectActionBtn, styles.mobileActionBtnFlex, actionLoading && { opacity: 0.6 }]}
                  disabled={actionLoading}
                  onPress={() => setShowRejectModal(true)}
                >
                  <MaterialCommunityIcons name="close-circle-outline" size={16} color="#FFF" />
                  <Text style={styles.rejectActionText}>Reject</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          <View style={[styles.scrollBody, !isWide && styles.scrollBodyMobile]}>
            {/* Hero card: overlaps header bottom on mobile */}
            <View style={[styles.heroCard, !isWide && styles.heroCardMobile]}>
              <View style={[styles.heroLayout, !isWide && styles.heroLayoutMobile]}>
                {/* Gallery */}
                <View style={[styles.galleryCol, !isWide && styles.galleryColMobile]}>
                  <View style={[styles.mainImageWrap, !isWide && { borderRadius: 0 }]}>
                    <Image
                      source={{ uri: product.gallery[activeImage] || product.image }}
                      style={[styles.mainImage, !isWide && styles.mainImageMobile]}
                      contentFit="contain"
                    />
                    {product.discount > 0 ? (
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>{product.discount.toFixed(0)}% OFF</Text>
                      </View>
                    ) : null}
                    <View style={styles.stockBadge}>
                      <MaterialCommunityIcons name="check-circle" size={12} color={PALETTE.green} />
                      <Text style={styles.stockBadgeText}>{product.stock} units</Text>
                    </View>
                  </View>
                  <View style={[styles.thumbRow, !isWide && { paddingHorizontal: 14, marginTop: 6, marginBottom: 2 }]}>
                    <Pressable
                      style={styles.thumbNav}
                      onPress={() => setActiveImage(prev => Math.max(0, prev - 1))}
                    >
                      <MaterialCommunityIcons name="chevron-left" size={18} color={PALETTE.textSecondary} />
                    </Pressable>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
                      {product.gallery.map((uri, index) => (
                        <Pressable key={uri + index} onPress={() => setActiveImage(index)}>
                          <Image
                            source={{ uri }}
                            style={[styles.thumb, activeImage === index && styles.thumbActive]}
                            contentFit="contain"
                            pointerEvents="none"
                          />
                        </Pressable>
                      ))}
                    </ScrollView>
                    <Pressable
                      style={styles.thumbNav}
                      onPress={() => setActiveImage(prev => Math.min(product.gallery.length - 1, prev + 1))}
                    >
                      <MaterialCommunityIcons name="chevron-right" size={18} color={PALETTE.textSecondary} />
                    </Pressable>
                  </View>
                </View>

                {/* Product info */}
                <View style={[styles.infoCol, !isWide && styles.infoColMobile]}>
                  <View style={styles.infoTopRow}>
                    <View style={styles.categoryPill}>
                      <Text style={styles.categoryPillText}>
                        {product.categoryLabel} · {product.subcategory}
                      </Text>
                    </View>
                    <View style={styles.stockStatus}>
                      <View style={styles.stockDot} />
                      <Text style={styles.stockStatusText}>{product.stockStatus}</Text>
                    </View>
                  </View>

                  <Text style={styles.productTitle}>{product.name}</Text>
                  <Text style={styles.productSku}>
                    {product.category} · SKU: {product.sku}
                  </Text>

                  <Text style={styles.price}>₹{product.price.toLocaleString('en-IN')}</Text>
                  <Text style={styles.priceSub}>
                    Selling + GST + {commissionLabel}% commission + highest delivery (₹{(firstVariant?.highestDeliveryCharge ?? 0).toLocaleString('en-IN')})
                  </Text>

                  <View style={[styles.attrGrid, !isWide && styles.attrGridMobile]}>
                    <View style={styles.attrBox}>
                      <Text style={styles.attrLabel}>Material</Text>
                      <Text style={styles.attrValue}>{product.material}</Text>
                    </View>
                    <View style={styles.attrBox}>
                      <Text style={styles.attrLabel}>Weight</Text>
                      <Text style={styles.attrValue}>{product.weight}</Text>
                    </View>
                    <View style={styles.attrBox}>
                      <Text style={styles.attrLabel}>HSN Code</Text>
                      <Text style={styles.attrValue}>{product.hsnCode}</Text>
                    </View>
                    <View style={styles.attrBox}>
                      <Text style={styles.attrLabel}>Warranty</Text>
                      <Text style={styles.attrValue}>{product.warranty}</Text>
                    </View>
                  </View>

                  <View style={styles.returnBox}>
                    <Text style={styles.returnLabel}>Return Policy</Text>
                    <Text style={styles.returnText}>{product.returnPolicy}</Text>
                  </View>

                  <View style={styles.footerTags}>
                    <View style={styles.footerTag}>
                      <Text style={styles.footerTagText}>
                        {dimLabels.sizeLabel}: {product.size}
                      </Text>
                    </View>
                    <View style={styles.footerTag}>
                      <Text style={[styles.footerTagText, { color: PALETTE.blue }]}>
                        Delivery: {product.delivery}
                      </Text>
                    </View>
                    <View style={styles.footerTag}>
                      <Text style={[styles.footerTagText, { color: PALETTE.navy }]}>
                        Stock: {product.stock} units
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Tabs */}
            {isWide ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
                {TABS.map((tab) => {
                  const active = activeTab === tab.key;
                  return (
                    <Pressable
                      key={tab.key}
                      onPress={() => setActiveTab(tab.key)}
                      style={[styles.tab, active && styles.tabActive]}>
                      {tab.key === 'overview' && <MaterialCommunityIcons name="information-outline" size={14} color={active ? '#FFF' : PALETTE.textSecondary} />}
                      {tab.key === 'variants' && <MaterialCommunityIcons name="tune" size={14} color={active ? '#FFF' : PALETTE.textSecondary} />}
                      {tab.key === 'specifications' && <MaterialCommunityIcons name="clipboard-list-outline" size={14} color={active ? '#FFF' : PALETTE.textSecondary} />}
                      {tab.key === 'delivery' && <MaterialCommunityIcons name="truck-outline" size={14} color={active ? '#FFF' : PALETTE.textSecondary} />}
                      {tab.key === 'returns' && <MaterialCommunityIcons name="backup-restore" size={14} color={active ? '#FFF' : PALETTE.textSecondary} />}
                      {tab.key === 'sizechart' && <MaterialCommunityIcons name="ruler" size={14} color={active ? '#FFF' : PALETTE.textSecondary} />}
                      <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
                      {tab.key === 'variants' && (
                        <View style={[styles.tabBadge, active && styles.tabBadgeActive]}>
                          <Text style={[styles.tabBadgeText, active && styles.tabBadgeTextActive]}>{variants.length}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.tabsGrid}>
                {TABS.map((tab) => {
                  const active = activeTab === tab.key;
                  return (
                    <Pressable
                      key={tab.key}
                      onPress={() => setActiveTab(tab.key)}
                      style={[styles.tab, styles.tabMobile, active && styles.tabActive]}>
                      {tab.key === 'overview' && <MaterialCommunityIcons name="information-outline" size={14} color={active ? '#FFF' : PALETTE.textSecondary} />}
                      {tab.key === 'variants' && <MaterialCommunityIcons name="tune" size={14} color={active ? '#FFF' : PALETTE.textSecondary} />}
                      {tab.key === 'specifications' && <MaterialCommunityIcons name="clipboard-list-outline" size={14} color={active ? '#FFF' : PALETTE.textSecondary} />}
                      {tab.key === 'delivery' && <MaterialCommunityIcons name="truck-outline" size={14} color={active ? '#FFF' : PALETTE.textSecondary} />}
                      {tab.key === 'returns' && <MaterialCommunityIcons name="backup-restore" size={14} color={active ? '#FFF' : PALETTE.textSecondary} />}
                      {tab.key === 'sizechart' && <MaterialCommunityIcons name="ruler" size={14} color={active ? '#FFF' : PALETTE.textSecondary} />}
                      <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
                      {tab.key === 'variants' && (
                        <View style={[styles.tabBadge, active && styles.tabBadgeActive]}>
                          <Text style={[styles.tabBadgeText, active && styles.tabBadgeTextActive]}>{variants.length}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Overview tab */}
            {activeTab === 'overview' && (
              <View style={styles.tabContent}>
                <SectionCard title="Full Description" icon="file-document-outline">
                  <Text style={styles.descriptionText}>{product.fullDescription.replace(/<\/?[^>]+(>|$)/g, "")}</Text>
                </SectionCard>

                <View style={[styles.twoCol, !isWide && styles.twoColMobile]}>
                  <SectionCard title="Classification" icon="tag-outline" flex={1}>
                    <InfoRow label="Category" value={product.categoryLabel} />
                    <InfoRow label="Subcategory" value={product.subcategory} />
                    <InfoRow label="Seller" value={product.seller} />
                    {product.email ? <InfoRow label="Seller Email" value={product.email} /> : null}
                    {sellerPhone ? <InfoRow label="Seller Phone" value={sellerPhone} /> : null}
                    {dimLabels.showColor && !isSweetsPlaceholderColor(product.color) ? (
                      <InfoRow label={dimLabels.colorLabel} value={product.color} />
                    ) : null}
                    <InfoRow label={dimLabels.sizeLabel} value={product.size} />
                    <InfoRow label="HSN Code" value={product.hsnCode} />
                    <InfoRow label="GST" value={`${product.gst}%`} valueColor={PALETTE.orange} />
                    <InfoRow label="Material" value={product.material} />
                    <InfoRow label="Return" value={product.returnPolicy} />
                    <InfoRow label="Warranty" value={product.warranty} />
                  </SectionCard>

                  <SectionCard title="Inventory" icon="warehouse" flex={1}>
                    <InfoRow label="Stock Quantity" value={`${product.stock} units`} valueColor={PALETTE.green} />
                    <InfoRow label="Status" value={product.stockStatus} valueColor={PALETTE.red} />
                    <InfoRow label="DB Status" value={product.dbStatus} />
                    <InfoRow label="Last Updated" value={product.lastUpdated} />
                    <InfoRow label="Created At" value={product.createdAt} />
                    <InfoRow label="Approved At" value={product.approvedAt} />
                  </SectionCard>
                </View>

                <SectionCard title="Admin Notes" icon="bell-outline">
                  <View style={styles.adminNote}>
                    <Text style={styles.adminNoteText}>{product.adminNote}</Text>
                  </View>
                </SectionCard>
              </View>
            )}

            {activeTab === 'variants' && (
              <VariantsTab isWide={isWide} variants={variants} sweetsProduct={sweetsProduct} />
            )}

            {activeTab === 'specifications' && extras && (
              <SpecificationsTab isWide={isWide} extras={extras} />
            )}

            {activeTab === 'delivery' && extras && <DeliveryTab isWide={isWide} extras={extras} />}

            {activeTab === 'returns' && extras && <ReturnsTab isWide={isWide} extras={extras} />}

            {activeTab === 'sizechart' && extras && <SizeChartTab isWide={isWide} extras={extras} />}
          </View>
        </ScrollView>

      </SafeAreaView>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PALETTE.pageBg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  scrollBody: { padding: 16, gap: 16 },

  header: {
    marginHorizontal: 2, marginTop: 12, borderRadius: 22,
    backgroundColor: "#151D4F",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerMobile: {
    marginHorizontal: 0,
    marginTop: 0,
    borderRadius: 22,
    paddingBottom: 18,
    flexDirection: 'column',
    gap: 10,
    alignItems: 'stretch',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 10 },
  mobileHeaderBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  mobileActionBtnFlex: { flex: 1 },
  addVariantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PALETTE.orange,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  addVariantText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#374151',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  editBtnText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  approveActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PALETTE.green,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
  },
  approveActionText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  rejectActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PALETTE.red,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
  },
  rejectActionText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  rejectModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  rejectModalCard: {
    backgroundColor: PALETTE.cardBg,
    borderRadius: 12,
    padding: 20,
    gap: 12,
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
  },
  rejectModalTitle: { fontSize: 18, fontWeight: '800', color: PALETTE.textPrimary },
  rejectModalSub: { fontSize: 13, color: PALETTE.textSecondary },
  rejectModalInput: {
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 8,
    padding: 12,
    minHeight: 88,
    textAlignVertical: 'top',
    fontSize: 14,
    color: PALETTE.textPrimary,
  },
  approveModalCard: {
    maxWidth: 520,
    gap: 10,
  },
  approveModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  approveModalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE.textPrimary,
    marginTop: 4,
  },
  approveModalHint: {
    fontSize: 12,
    color: PALETTE.textMuted,
    marginTop: -2,
  },
  approveSelectWrap: {
    width: '100%',
  },
  approveTemplateList: {
    gap: 6,
  },
  approveTemplateOption: {
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FAFAFA',
  },
  approveTemplateOptionActive: {
    borderColor: PALETTE.orange,
    backgroundColor: '#FFF7ED',
  },
  approveTemplateOptionText: {
    fontSize: 13,
    color: PALETTE.textPrimary,
  },
  approveTemplateOptionTextActive: {
    fontWeight: '700',
    color: PALETTE.orange,
  },
  approveModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },

  heroCard: {
    backgroundColor: PALETTE.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PALETTE.border,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } : {}),
  },
  heroLayout: { flexDirection: 'row', gap: 24, padding: 16 },
  heroLayoutMobile: { flexDirection: 'column', padding: 0, gap: 0 },
  galleryCol: { flex: 1, minWidth: 0 },
  galleryColMobile: { width: '100%' },
  infoCol: { flex: 1, minWidth: 0, gap: 10 },
  infoColMobile: { padding: 14, gap: 10 },

  scrollBodyMobile: { paddingHorizontal: 0, paddingTop: 0 },
  heroCardMobile: { borderRadius: 0, borderLeftWidth: 0, borderRightWidth: 0, borderTopWidth: 0 },

  mainImageWrap: { position: 'relative', overflow: 'hidden' },
  mainImage: { width: '100%', height: 280, backgroundColor: PALETTE.pageBg },
  mainImageMobile: { height: 300, borderRadius: 0 },
  discountBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: PALETTE.red,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  stockBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PALETTE.greenLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stockBadgeText: { color: PALETTE.green, fontSize: 11, fontWeight: '700' },

  thumbRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  thumbNav: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PALETTE.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbs: { gap: 8, flex: 1 },
  thumb: { width: 56, height: 56, borderRadius: 8, borderWidth: 2, borderColor: 'transparent' },
  thumbActive: { borderColor: PALETTE.purple },

  infoTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  categoryPill: { backgroundColor: PALETTE.purpleLight, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, flexShrink: 1 },
  categoryPillText: { color: PALETTE.purple, fontSize: 11, fontWeight: '600' },
  stockStatus: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 0 },
  stockDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PALETTE.red },
  stockStatusText: { color: PALETTE.red, fontSize: 12, fontWeight: '700' },

  productTitle: { fontSize: 20, fontWeight: '800', color: PALETTE.textPrimary, lineHeight: 28 },
  productSku: { fontSize: 12, color: PALETTE.textMuted },
  price: { fontSize: 28, fontWeight: '800', color: PALETTE.orange, marginTop: 4 },
  priceSub: { fontSize: 11, color: PALETTE.textMuted },

  attrGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  attrGridMobile: { gap: 8 },
  attrBox: {
    width: '48%' as any,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 10,
    padding: 12,
    gap: 4,
    ...(Platform.OS === 'web' ? { boxSizing: 'border-box' as const, width: '48%' as any } : {}),
  },
  attrLabel: { fontSize: 11, color: PALETTE.textMuted, fontWeight: '600' },
  attrValue: { fontSize: 14, fontWeight: '700', color: PALETTE.textPrimary },

  returnBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    gap: 4,
    marginTop: 4,
  },
  returnLabel: { fontSize: 11, color: PALETTE.textMuted, fontWeight: '600' },
  returnText: { fontSize: 12, color: PALETTE.green, fontWeight: '600', lineHeight: 18, flexWrap: 'wrap', flexShrink: 1 },

  footerTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  footerTag: { backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  footerTagText: { fontSize: 11, fontWeight: '600', color: PALETTE.textSecondary },

  tabs: { gap: 8, paddingVertical: 4 },
  tabsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 4 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: PALETTE.cardBg,
    borderWidth: 1,
    borderColor: PALETTE.border,
  },
  tabMobile: { width: '48%' as any },
  tabActive: { backgroundColor: PALETTE.tabActive, borderColor: PALETTE.tabActive },
  tabText: { fontSize: 13, fontWeight: '600', color: PALETTE.textSecondary },
  tabTextActive: { color: '#FFF' },
  tabBadge: {
    backgroundColor: PALETTE.orangeLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabBadgeText: { fontSize: 10, fontWeight: '800', color: PALETTE.orange },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  tabBadgeTextActive: { color: '#FFF' },

  tabContent: { gap: 16, width: '100%', alignSelf: 'stretch' },
  emptyTabText: {
    fontSize: 14,
    color: PALETTE.textSecondary,
    paddingVertical: 8,
  },

  // Variants tab
  variantStatsRow: {
    flexDirection: 'row',
    backgroundColor: PALETTE.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PALETTE.border,
    overflow: 'hidden',
  },
  variantStatsRowMobile: { flexDirection: 'column' },
  variantStatBox: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.border,
  },
  variantStatBoxWide: {
    borderBottomWidth: 0,
    borderRightWidth: 1,
    borderRightColor: PALETTE.border,
  },
  variantStatBoxLast: { borderBottomWidth: 0, borderRightWidth: 0 },
  variantStatLabel: { fontSize: 12, color: PALETTE.textMuted, fontWeight: '600' },
  variantStatValue: { fontSize: 22, fontWeight: '800' },

  variantSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  variantSectionHeaderMobile: { flexDirection: 'column', alignItems: 'flex-start' },
  variantSectionTitle: { fontSize: 16, fontWeight: '800', color: PALETTE.textPrimary },
  variantHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  viewToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  viewBtn: { padding: 8, backgroundColor: PALETTE.cardBg },
  viewBtnActive: { backgroundColor: '#F3F4F6' },
  variantAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PALETTE.orange,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  variantAddText: { color: '#FFF', fontWeight: '700', fontSize: 12 },

  variantTableCard: {
    backgroundColor: PALETTE.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PALETTE.border,
    overflow: 'hidden',
  },
  variantTable: { minWidth: 1480 },
  variantTableHeader: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#F5F0E8',
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.border,
  },
  vth: {
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE.textSecondary,
    textTransform: 'uppercase',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  variantTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    minHeight: 60,
  },
  vcolColor: { width: 148, paddingHorizontal: 8 },
  vcolSize: { width: 64, alignItems: 'center', paddingHorizontal: 4 },
  vcolSku: { width: 120, paddingHorizontal: 8 },
  vcolStock: { width: 90, alignItems: 'center', paddingHorizontal: 4 },
  vcolMinQty: { width: 70, alignItems: 'center', paddingHorizontal: 4 },
  vcolMrp: { width: 100, paddingHorizontal: 8 },
  vcolDisc: { width: 88, paddingHorizontal: 8 },
  vcolSell: { width: 110, paddingHorizontal: 8 },
  vcolGst: { width: 100, paddingHorizontal: 8 },
  vcolSellGst: { width: 110, paddingHorizontal: 8 },
  vcolComm: { width: 120, paddingHorizontal: 8 },
  vcolDel: { width: 90, paddingHorizontal: 8 },
  vcolTotalIntraHeader: { width: 108, backgroundColor: '#FFFFFF', paddingHorizontal: 8, justifyContent: 'center', alignSelf: 'stretch' },
  vcolTotalMetroHeader: { width: 108, backgroundColor: '#FFFFFF', paddingHorizontal: 8, justifyContent: 'center', alignSelf: 'stretch' },
  vcolTotalHeaderText: { color: '#111827', fontWeight: '800' },
  vcolTotalIntra: { width: 108, backgroundColor: '#FFFFFF', paddingHorizontal: 8, justifyContent: 'center', alignSelf: 'stretch' },
  vcolTotalMetro: { width: 108, backgroundColor: '#FFFFFF', paddingHorizontal: 8, justifyContent: 'center', alignSelf: 'stretch' },
  vcolTotalIntraText: { fontSize: 13, fontWeight: '800', color: '#166534' },
  vcolTotalMetroText: { fontSize: 13, fontWeight: '800', color: '#92400E' },
  vcellColor: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  vColorImg: { width: 36, height: 36, borderRadius: 6 },
  vColorDot: { width: 10, height: 10, borderRadius: 5 },
  vColorName: { fontSize: 12, fontWeight: '600', color: PALETTE.textPrimary, flex: 1 },
  vSizePill: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  vSizeText: { fontSize: 12, fontWeight: '700', color: PALETTE.blue },
  vSkuText: { fontSize: 12, color: PALETTE.textMuted },
  vStockPill: {
    backgroundColor: PALETTE.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  vStockText: { fontSize: 11, fontWeight: '700', color: PALETTE.green },
  vMrpText: { fontSize: 12, color: PALETTE.red, textDecorationLine: 'line-through' },
  vDiscText: { fontSize: 12, fontWeight: '800', color: PALETTE.green },
  vcellText: { fontSize: 12, color: PALETTE.textPrimary, fontWeight: '600' },
  vGstAmount: { fontSize: 12, fontWeight: '700', color: PALETTE.orange },
  vGstPct: { fontSize: 10, color: PALETTE.textMuted },
  vSellGstText: { fontSize: 13, fontWeight: '800', color: PALETTE.navy },
  vCommAmount: { fontSize: 12, fontWeight: '700', color: PALETTE.red },
  vCommPct: { fontSize: 10, color: PALETTE.textMuted },

  variantCardList: { gap: 12 },
  variantGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  variantCard: {
    backgroundColor: PALETTE.cardBg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: PALETTE.border,
    gap: 10,
    ...(Platform.OS === 'web' ? { flexBasis: '48%' as any, maxWidth: '48%' as any } : {}),
  },
  variantCardCompact: {
    width: '100%',
    flexBasis: '100%',
    maxWidth: '100%',
  },
  variantCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  variantCardImg: { width: 48, height: 48, borderRadius: 8 },
  variantCardInfo: { flex: 1, gap: 4 },
  variantCardPrices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  variantPriceItem: { minWidth: '40%', gap: 2 },
  variantPriceLabel: { fontSize: 10, color: PALETTE.textMuted, fontWeight: '600' },
  variantCardDelivery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 6,
  },
  variantDelText: { fontSize: 11, color: PALETTE.textSecondary, fontWeight: '600' },
  sectionCard: {
    backgroundColor: PALETTE.cardBg,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: PALETTE.border,
    gap: 12,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: PALETTE.textPrimary },
  descriptionText: { fontSize: 14, color: PALETTE.textSecondary, lineHeight: 22 },

  twoCol: { flexDirection: 'row', gap: 16 },
  twoColMobile: { flexDirection: 'column' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: { fontSize: 13, color: PALETTE.textMuted, flex: 1 },
  infoValue: { fontSize: 13, fontWeight: '700', color: PALETTE.textPrimary, flex: 1, textAlign: 'right' },

  adminNote: {
    backgroundColor: PALETTE.orangeLight,
    borderLeftWidth: 4,
    borderLeftColor: PALETTE.orange,
    padding: 14,
    borderRadius: 8,
  },
  adminNoteText: { fontSize: 13, color: '#92400E', lineHeight: 20 },

  // Specifications tab
  specTopRow: { flexDirection: 'row', gap: 16, alignItems: 'stretch' },
  specTopRowMobile: { flexDirection: 'column' },
  specCard: {
    backgroundColor: PALETTE.cardBg,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: PALETTE.border,
    gap: 4,
    flex: 1,
  },
  specCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  specCardTitle: { fontSize: 15, fontWeight: '800', color: PALETTE.tabActive },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  specLabel: { fontSize: 13, color: PALETTE.textMuted, flex: 1 },
  specValue: {
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  specRowStacked: { flexDirection: 'column', alignItems: 'flex-start', gap: 4 },
  specValueStacked: { textAlign: 'left' },
  keyFeatureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingTop: 8 },
  keyFeatureText: { fontSize: 13, color: PALETTE.textPrimary, fontWeight: '600', flex: 1, lineHeight: 20 },
  packageGrid: { flexDirection: 'row', gap: 16 },
  packageGridMobile: { flexDirection: 'column', gap: 0 },
  packageCol: { flex: 1 },

  // Delivery tab
  deliveryRow: { flexDirection: 'row', gap: 16 },
  deliveryRowMobile: { flexDirection: 'column' },
  deliveryCard: {
    flex: 1,
    backgroundColor: PALETTE.cardBg,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: PALETTE.border,
    gap: 4,
  },
  estimatedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  estimatedText: { flex: 1, gap: 2 },
  estimatedTitle: { fontSize: 14, fontWeight: '800', color: PALETTE.tabActive },
  estimatedSub: { fontSize: 12, color: PALETTE.textSecondary },
  chargesTable: {
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 8,
  },
  chargesHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.border,
  },
  chargesTh: { fontSize: 12, fontWeight: '700', color: PALETTE.textSecondary },
  chargesRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  chargesRowAlt: { backgroundColor: '#FAFAFA' },
  chargesTd: { fontSize: 13, fontWeight: '600', color: PALETTE.textPrimary },
  chargesColZone: { flex: 2 },
  chargesColPrice: { flex: 1, textAlign: 'center' },
  chargesGreen: { color: PALETTE.green, fontWeight: '800' },
  chargesDash: { color: PALETTE.blue, fontWeight: '700' },

  // Returns tab
  returnsTopRow: { flexDirection: 'row', gap: 16 },
  returnsTopRowMobile: { flexDirection: 'column' },
  returnHighlightBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: PALETTE.greenLight,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  returnHighlightText: { flex: 1, gap: 4 },
  returnHighlightMain: { fontSize: 13, fontWeight: '700', color: '#166534', lineHeight: 20 },
  returnHighlightSub: { fontSize: 12, color: PALETTE.green, fontWeight: '600' },
  conditionRow: { flexDirection: 'row', gap: 8, paddingVertical: 10, alignItems: 'flex-start' },
  conditionNum: { fontSize: 14, fontWeight: '800', color: PALETTE.tabActive, width: 20 },
  conditionText: { fontSize: 13, color: PALETTE.textPrimary, flex: 1, lineHeight: 20 },
  processBar: {
    backgroundColor: PALETTE.purpleLight,
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 8,
    alignItems: 'center',
  },
  processText: {
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE.purple,
    textAlign: 'center',
  },

  // Size Chart tab
  sizeChartCard: {
    backgroundColor: PALETTE.cardBg,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: PALETTE.border,
    gap: 16,
    width: '100%',
    alignSelf: 'stretch',
  },
  sizeChartCardWide: {
    padding: 20,
  },
  sizeChartHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sizeChartIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeChartUnit: { fontSize: 12, color: PALETTE.textMuted, marginTop: 2 },
  sizeTable: { minWidth: 480 },
  sizeTableWide: {
    width: '100%',
    minWidth: '100%',
    alignSelf: 'stretch',
  },
  sizeTableHead: {
    flexDirection: 'row',
    backgroundColor: PALETTE.tabActive,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  sizeTableHeadWide: {
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  sizeTh: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
  },
  sizeTableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sizeTableRowWide: {
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  sizeTableRowAlt: { backgroundColor: '#FAFAFA' },
  sizeTd: { fontSize: 13, color: PALETTE.textPrimary, textAlign: 'center', fontWeight: '600' },
  sizeTdBold: { fontWeight: '800', color: PALETTE.tabActive },
  sizeCol: { width: 96, minWidth: 80 },
  sizeColWide: { flex: 1, minWidth: 0 },
  sizeChartFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 14,
  },
  sizeChartImage: {
    width: '100%',
    height: 220,
    borderRadius: 10,
    marginBottom: 14,
    backgroundColor: PALETTE.pageBg,
  },
  sizeChartFooterText: { fontSize: 13, color: PALETTE.blue, fontWeight: '600', flex: 1 },

  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  notFoundText: { fontSize: 16, fontWeight: '600', color: PALETTE.textSecondary },
  backBtnLight: {
    backgroundColor: PALETTE.purple,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnLightText: { color: '#FFF', fontWeight: '700' },
}) as any;