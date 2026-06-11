import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import {
  getVariantStats,
  PRODUCT_DELIVERY,
  PRODUCT_RETURNS,
  PRODUCT_SIZE_CHART,
  PRODUCT_SPECS,
  type ProductDetail,
  type ProductStatus,
  type ProductVariant,
} from '@/constants/product-approval-data';
import { getApiErrorMessage } from '@/lib/api/client';
import { formatDate, formatDateTime } from '@/lib/format';
import { approveProduct, fetchProductDetail, rejectProduct } from '@/services/productApi';

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/600?text=Product';

type ApiImage = { url?: string };
type ApiVariant = {
  id?: number;
  color?: string;
  size?: string;
  sku?: string;
  stock?: number;
  sellingPrice?: number;
  finalPrice?: number;
};

function mapApiProductDetail(data: Record<string, unknown>): {
  product: ProductDetail;
  variants: ProductVariant[];
} {
  const images = (data.images as ApiImage[] | undefined) ?? [];
  const gallery = images.map((img) => String(img.url ?? '')).filter(Boolean);
  const primaryImage = gallery[0] ?? PLACEHOLDER_IMAGE;
  const variantsRaw = (data.variants as ApiVariant[] | undefined) ?? [];
  const gst = Number(data.gstPercentage ?? 18);
  const statusRaw = String(data.status ?? 'pending').toLowerCase();
  const status: ProductStatus =
    statusRaw === 'approved'
      ? 'approved'
      : statusRaw === 'rejected'
        ? 'rejected'
        : statusRaw === 'review'
          ? 'review'
          : 'pending';

  const variants: ProductVariant[] = variantsRaw.map((v) => {
    const sellingWith = Number(v.finalPrice ?? v.sellingPrice ?? 0);
    const sellingExcl = gst > 0 ? sellingWith / (1 + gst / 100) : sellingWith;
    const gstAmount = sellingWith - sellingExcl;
    return {
      id: String(v.id ?? ''),
      colorName: String(v.color ?? '—'),
      colorHex: '#6B7280',
      image: primaryImage,
      size: String(v.size ?? '—'),
      sku: String(v.sku ?? '—'),
      stock: Number(v.stock ?? 0),
      mrp: sellingWith,
      discountPercent: 0,
      sellingPriceExclGst: sellingExcl,
      gstPercent: gst,
      gstAmount,
      sellingPriceWithGst: sellingWith,
      commissionPercent: 0,
      commissionAmount: 0,
      intraCityDelivery: 0,
      metroDelivery: 0,
    };
  });

  const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
  const firstVariant = variants[0];

  const product: ProductDetail = {
    id: String(data.id ?? ''),
    name: String(data.name ?? 'Product'),
    description: String(data.shortDescription ?? data.description ?? ''),
    image: primaryImage,
    seller: String(data.sellerName ?? `Seller #${data.sellerId ?? '—'}`),
    email: '',
    category: `Category #${data.categoryId ?? '—'}`,
    status,
    submittedOn: formatDateTime(String(data.createdAt ?? '')),
    sku: String(data.sku ?? '—'),
    lastUpdated: formatDate(String(data.createdAt ?? '')),
    categoryLabel: `Category #${data.categoryId ?? '—'}`,
    subcategory: `Subcategory #${data.subcategoryId ?? '—'}`,
    fullTitle: String(data.name ?? 'Product'),
    price: firstVariant?.sellingPriceWithGst ?? 0,
    mrp: firstVariant?.mrp ?? 0,
    gst,
    material: '—',
    weight: '—',
    hsnCode: '—',
    warranty: '—',
    returnPolicy: '—',
    size: firstVariant?.size ?? '—',
    delivery: '—',
    stock: totalStock,
    stockStatus: totalStock > 0 ? 'In Stock' : 'Out of Stock',
    discount: 0,
    color: firstVariant?.colorName ?? '—',
    dbStatus: statusRaw,
    createdAt: formatDate(String(data.createdAt ?? '')),
    approvedAt: '—',
    adminNote: String(data.adminNotes ?? '—'),
    fullDescription: String(data.description ?? data.shortDescription ?? ''),
    gallery: gallery.length > 0 ? gallery : [primaryImage],
  };

  return { product, variants };
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
  return { width, isWide: width >= 1024 };
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
}: {
  isWide: boolean;
  variants: ProductVariant[];
}) {
  const stats = getVariantStats(variants);
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'list'>('table');

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
          <Text style={styles.variantStatLabel}>Avg. Selling Price</Text>
          <Text style={[styles.variantStatValue, { color: PALETTE.navy }]}>
            ₹{stats.avgSellingPrice.toFixed(2)}
          </Text>
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
            <Pressable
              onPress={() => setViewMode('table')}
              style={[styles.viewBtn, viewMode === 'table' && styles.viewBtnActive]}>
              <MaterialCommunityIcons
                name="table"
                size={16}
                color={viewMode === 'table' ? PALETTE.navy : PALETTE.textMuted}
              />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Table view (wide) or cards (mobile) */}
      {isWide && viewMode === 'table' ? (
        <View style={styles.variantTableCard}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.variantTable}>
              <View style={styles.variantTableHeader}>
                <Text style={[styles.vth, styles.vcolColor]}>Color</Text>
                <Text style={[styles.vth, styles.vcolSize]}>Size</Text>
                <Text style={[styles.vth, styles.vcolSku]}>SKU</Text>
                <Text style={[styles.vth, styles.vcolStock]}>Stock</Text>
                <Text style={[styles.vth, styles.vcolMrp]}>MRP (Excl. GST)</Text>
                <Text style={[styles.vth, styles.vcolDisc]}>Discount (%)</Text>
                <Text style={[styles.vth, styles.vcolSell]}>Selling Price (Excl. GST)</Text>
                <Text style={[styles.vth, styles.vcolGst]}>GST (%)</Text>
                <Text style={[styles.vth, styles.vcolSellGst]}>Selling Price (With GST)</Text>
                <Text style={[styles.vth, styles.vcolComm]}>Commission (% of SP w/ GST)</Text>
                <Text style={[styles.vth, styles.vcolDel]}>Intra-City Delivery</Text>
                <Text style={[styles.vth, styles.vcolDel]}>Metro-Metro Delivery</Text>
              </View>
              {variants.map((v) => (
                <VariantTableRow key={v.id} variant={v} />
              ))}
            </View>
          </ScrollView>
        </View>
      ) : (
        <View style={viewMode === 'grid' && isWide ? styles.variantGrid : styles.variantCardList}>
          {variants.map((v) => (
            <VariantCard key={v.id} variant={v} compact={!isWide} />
          ))}
        </View>
      )}
    </View>
  );
}

function VariantTableRow({ variant: v }: { variant: ProductVariant }) {
  return (
    <View style={styles.variantTableRow}>
      <View style={[styles.vcolColor, styles.vcellColor]}>
        <Image source={{ uri: v.image }} style={styles.vColorImg} contentFit="cover" />
        <View style={[styles.vColorDot, { backgroundColor: v.colorHex }]} />
        <Text style={styles.vColorName}>{v.colorName}</Text>
      </View>
      <View style={styles.vcolSize}>
        <View style={styles.vSizePill}>
          <Text style={styles.vSizeText}>{v.size}</Text>
        </View>
      </View>
      <Text style={[styles.vcolSku, styles.vSkuText]}>{v.sku}</Text>
      <View style={styles.vcolStock}>
        <View style={styles.vStockPill}>
          <Text style={styles.vStockText}>{v.stock} units</Text>
        </View>
      </View>
      <Text style={[styles.vcolMrp, styles.vMrpText]}>₹{v.mrp.toFixed(2)}</Text>
      <Text style={[styles.vcolDisc, styles.vDiscText]}>{v.discountPercent.toFixed(2)}% OFF</Text>
      <Text style={[styles.vcolSell, styles.vcellText]}>₹{v.sellingPriceExclGst.toFixed(2)}</Text>
      <View style={styles.vcolGst}>
        <Text style={styles.vGstAmount}>+ ₹{v.gstAmount.toFixed(2)}</Text>
        <Text style={styles.vGstPct}>({v.gstPercent}%)</Text>
      </View>
      <Text style={[styles.vcolSellGst, styles.vSellGstText]}>₹{v.sellingPriceWithGst.toFixed(2)}</Text>
      <View style={styles.vcolComm}>
        <Text style={styles.vCommAmount}>+ ₹{v.commissionAmount.toFixed(2)}</Text>
        <Text style={styles.vCommPct}>({v.commissionPercent}%)</Text>
      </View>
      <Text style={[styles.vcolDel, styles.vcellText]}>+ ₹{v.intraCityDelivery.toFixed(2)}</Text>
      <Text style={[styles.vcolDel, styles.vcellText]}>+ ₹{v.metroDelivery.toFixed(2)}</Text>
    </View>
  );
}

function VariantCard({ variant: v, compact }: { variant: ProductVariant; compact?: boolean }) {
  return (
    <View style={[styles.variantCard, compact && styles.variantCardCompact]}>
      <View style={styles.variantCardTop}>
        <Image source={{ uri: v.image }} style={styles.variantCardImg} contentFit="cover" />
        <View style={styles.variantCardInfo}>
          <View style={styles.vcellColor}>
            <View style={[styles.vColorDot, { backgroundColor: v.colorHex }]} />
            <Text style={styles.vColorName}>{v.colorName}</Text>
          </View>
          <View style={styles.vSizePill}>
            <Text style={styles.vSizeText}>Size {v.size}</Text>
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
          <Text style={styles.variantPriceLabel}>Commission</Text>
          <Text style={styles.vCommAmount}>+ ₹{v.commissionAmount.toFixed(2)}</Text>
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

function SpecificationsTab({ isWide }: { isWide: boolean }) {
  const { items, keyFeatures, package: pkg } = PRODUCT_SPECS;

  return (
    <View style={styles.tabContent}>
      <View style={[styles.specTopRow, !isWide && styles.specTopRowMobile]}>
        <SpecSectionCard title="Specifications" icon="clipboard-list-outline" flex={isWide ? 2 : undefined}>
          {items.map((item) => (
            <SpecRow key={item.label} label={item.label} value={item.value} stacked={!isWide} />
          ))}
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

function DeliveryTab({ isWide }: { isWide: boolean }) {
  const d = PRODUCT_DELIVERY;

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

function ReturnsTab({ isWide }: { isWide: boolean }) {
  const r = PRODUCT_RETURNS;

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

function SizeChartTab({ isWide }: { isWide: boolean }) {
  const chart = PRODUCT_SIZE_CHART;
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
      {chart.rows.map((row, index) => (
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
}: {
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  children: ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNote, setRejectNote] = useState('');

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

  const handleApprove = async () => {
    const productId = Number(id);
    if (Number.isNaN(productId)) return;

    const run = async () => {
      setActionLoading(true);
      try {
        await approveProduct(productId);
        if (Platform.OS === 'web') window.alert('Product approved.');
        else Alert.alert('Success', 'Product approved.');
        router.back();
      } catch (err) {
        const msg = getApiErrorMessage(err, 'Failed to approve product.');
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Error', msg);
      } finally {
        setActionLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Approve this product?')) void run();
    } else {
      Alert.alert('Approve product', 'Approve this product for listing?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: () => void run() },
      ]);
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
      if (Platform.OS === 'web') window.alert('Product rejected.');
      else Alert.alert('Done', 'Product rejected.');
      router.back();
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Failed to reject product.');
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFound}>
          <ActivityIndicator size="large" color={PALETTE.purple} />
          <Text style={styles.notFoundText}>Loading product…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>{error ?? 'Product not found'}</Text>
          <Pressable style={styles.backBtnLight} onPress={() => (error ? loadProduct() : router.back())}>
            <Text style={styles.backBtnLightText}>{error ? 'Retry' : 'Go Back'}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const contentMax = isWide ? Math.min(width, 1200) : width;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={18} color="#FFF" />
            <Text style={styles.backBtnText}>Back</Text>
          </Pressable>
          <View>
            <Text style={styles.headerTitle} numberOfLines={2}>
              {product.name}
            </Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {product.category} · {product.seller} · Updated {product.lastUpdated}
            </Text>
          </View>
        </View>
        {canReview && isWide ? (
          <View style={styles.headerActions}>
            <Pressable
              style={[styles.approveActionBtn, actionLoading && { opacity: 0.6 }]}
              disabled={actionLoading}
              onPress={() => void handleApprove()}
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
      </View>

      {canReview && !isWide ? (
        <View style={styles.mobileHeaderActions}>
          <Pressable
            style={[styles.approveActionBtn, { flex: 1 }, actionLoading && { opacity: 0.6 }]}
            disabled={actionLoading}
            onPress={() => void handleApprove()}
          >
            <Text style={styles.approveActionText}>Approve</Text>
          </Pressable>
          <Pressable
            style={[styles.rejectActionBtn, { flex: 1 }, actionLoading && { opacity: 0.6 }]}
            disabled={actionLoading}
            onPress={() => setShowRejectModal(true)}
          >
            <Text style={styles.rejectActionText}>Reject</Text>
          </Pressable>
        </View>
      ) : null}

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
        {/* Hero card */}
        <View style={styles.heroCard}>
          <View style={[styles.heroLayout, !isWide && styles.heroLayoutMobile]}>
            {/* Gallery */}
            <View style={styles.galleryCol}>
              <View style={styles.mainImageWrap}>
                <Image source={{ uri: product.gallery[activeImage] }} style={styles.mainImage} contentFit="cover" />
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{product.discount}% OFF</Text>
                </View>
                <View style={styles.stockBadge}>
                  <MaterialCommunityIcons name="check-circle" size={12} color={PALETTE.green} />
                  <Text style={styles.stockBadgeText}>{product.stock} units</Text>
                </View>
              </View>
              <View style={styles.thumbRow}>
                <Pressable style={styles.thumbNav}>
                  <MaterialCommunityIcons name="chevron-left" size={18} color={PALETTE.textSecondary} />
                </Pressable>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
                  {product.gallery.map((uri, index) => (
                    <Pressable key={uri + index} onPress={() => setActiveImage(index)}>
                      <Image
                        source={{ uri }}
                        style={[styles.thumb, activeImage === index && styles.thumbActive]}
                        contentFit="cover"
                      />
                    </Pressable>
                  ))}
                </ScrollView>
                <Pressable style={styles.thumbNav}>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={PALETTE.textSecondary} />
                </Pressable>
              </View>
            </View>

            {/* Product info */}
            <View style={styles.infoCol}>
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

              <Text style={styles.price}>₹{product.price}</Text>
              <Text style={styles.priceSub}>
                MRP Excl. GST ₹{product.mrp} · Selling Incl. GST ({product.gst}%)
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
                  <Text style={styles.footerTagText}>Size: {product.size}</Text>
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.tab, active && styles.tabActive]}>
                {tab.key === 'overview' && (
                  <MaterialCommunityIcons
                    name="information-outline"
                    size={14}
                    color={active ? '#FFF' : PALETTE.textSecondary}
                  />
                )}
                {tab.key === 'variants' && (
                  <MaterialCommunityIcons
                    name="tune"
                    size={14}
                    color={active ? '#FFF' : PALETTE.textSecondary}
                  />
                )}
                {tab.key === 'specifications' && (
                  <MaterialCommunityIcons
                    name="clipboard-list-outline"
                    size={14}
                    color={active ? '#FFF' : PALETTE.textSecondary}
                  />
                )}
                {tab.key === 'delivery' && (
                  <MaterialCommunityIcons
                    name="truck-outline"
                    size={14}
                    color={active ? '#FFF' : PALETTE.textSecondary}
                  />
                )}
                {tab.key === 'returns' && (
                  <MaterialCommunityIcons
                    name="backup-restore"
                    size={14}
                    color={active ? '#FFF' : PALETTE.textSecondary}
                  />
                )}
                {tab.key === 'sizechart' && (
                  <MaterialCommunityIcons
                    name="ruler"
                    size={14}
                    color={active ? '#FFF' : PALETTE.textSecondary}
                  />
                )}
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
                {tab.key === 'variants' && (
                  <View style={[styles.tabBadge, active && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, active && styles.tabBadgeTextActive]}>
                      {variants.length}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Overview tab */}
        {activeTab === 'overview' && (
          <View style={styles.tabContent}>
            <SectionCard title="Full Description" icon="file-document-outline">
              <Text style={styles.descriptionText}>{product.fullDescription}</Text>
            </SectionCard>

            <View style={[styles.twoCol, !isWide && styles.twoColMobile]}>
              <SectionCard title="Classification" icon="tag-outline">
                <InfoRow label="Category" value={product.categoryLabel} />
                <InfoRow label="Subcategory" value={product.subcategory} />
                <InfoRow label="Color" value={product.color} />
                <InfoRow label="Size" value={product.size} />
                <InfoRow label="HSN Code" value={product.hsnCode} />
                <InfoRow label="GST" value={`${product.gst}%`} valueColor={PALETTE.orange} />
                <InfoRow label="Material" value={product.material} />
                <InfoRow label="Return" value={product.returnPolicy} />
                <InfoRow label="Warranty" value={product.warranty} />
              </SectionCard>

              <SectionCard title="Inventory" icon="warehouse">
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
          <VariantsTab isWide={isWide} variants={variants} />
        )}

        {activeTab === 'specifications' && <SpecificationsTab isWide={isWide} />}

        {activeTab === 'delivery' && <DeliveryTab isWide={isWide} />}

        {activeTab === 'returns' && <ReturnsTab isWide={isWide} />}

        {activeTab === 'sizechart' && <SizeChartTab isWide={isWide} />}
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PALETTE.pageBg },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16, paddingBottom: 32 },

  header: {
    backgroundColor: PALETTE.navy,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
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
  mobileHeaderActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: PALETTE.navy,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
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

  heroCard: {
    backgroundColor: PALETTE.cardBg,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: PALETTE.border,
    ...(Platform.OS === 'web' ? { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } : {}),
  },
  heroLayout: { flexDirection: 'row', gap: 24 },
  heroLayoutMobile: { flexDirection: 'column' },
  galleryCol: { flex: 1, minWidth: 0 },
  infoCol: { flex: 1, minWidth: 0, gap: 10 },

  mainImageWrap: { position: 'relative', borderRadius: 12, overflow: 'hidden' },
  mainImage: { width: '100%', height: 280, backgroundColor: PALETTE.pageBg },
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

  infoTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  categoryPill: { backgroundColor: PALETTE.purpleLight, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  categoryPillText: { color: PALETTE.purple, fontSize: 11, fontWeight: '600' },
  stockStatus: { flexDirection: 'row', alignItems: 'center', gap: 5 },
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
  returnText: { fontSize: 12, color: PALETTE.green, fontWeight: '600', lineHeight: 18 },

  footerTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  footerTag: { backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  footerTagText: { fontSize: 11, fontWeight: '600', color: PALETTE.textSecondary },

  tabs: { gap: 8, paddingVertical: 4 },
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
  variantTable: { minWidth: 1400 },
  variantTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F0E8',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.border,
  },
  vth: {
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE.textSecondary,
    textTransform: 'uppercase',
  },
  variantTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  vcolColor: { width: 140 },
  vcolSize: { width: 60, alignItems: 'center' },
  vcolSku: { width: 120 },
  vcolStock: { width: 90, alignItems: 'center' },
  vcolMrp: { width: 110 },
  vcolDisc: { width: 100 },
  vcolSell: { width: 130 },
  vcolGst: { width: 90 },
  vcolSellGst: { width: 130 },
  vcolComm: { width: 130 },
  vcolDel: { width: 110 },
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