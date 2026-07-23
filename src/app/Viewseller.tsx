import AdminLayout from "@/components/admin-layout";
import SellerMediaImage from "@/components/SellerMediaImage";
import { useAuth } from "@/context/auth-context";
import { getApiErrorMessage } from '@/lib/api/client';
import { isPdfMedia, resolveSellerDocumentImageUrl, resolveSellerProfileImage } from '@/lib/api/media';
import { formatDate, maskAccount } from '@/lib/format';
import {
  exportSellerOrdersCsv, exportSellerProductsCsv, fetchSellerAnalyticsChart, fetchSellerDetail, normalizeSellerGraphChart,
} from '@/services/sellerApi';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import Svg, { Circle, Path, Polygon, Polyline } from 'react-native-svg';

// ─── Bootstrap Icon component (via @expo/vector-icons or react-native-vector-icons)
let BootstrapIcon: React.FC<{ name: string; size: number; color: string }>;
try {
  const { MaterialCommunityIcons } = require('@expo/vector-icons');
  const ICON_MAP: Record<string, string> = {
    'eye': 'eye-outline',
    'eye-fill': 'eye',
    'zoom-in': 'magnify-plus-outline',
    'zoom-out': 'magnify-minus-outline',
    'arrow-counterclockwise': 'restore',
    'download': 'download-outline',
    'x-lg': 'close',
    'file-earmark-text': 'file-document-outline',
    'person-circle': 'account-circle-outline',
    'house': 'home-outline',
    'box-seam': 'package-variant',
    'cart3': 'cart-outline',
    'bar-chart-line': 'chart-line',
    'building': 'office-building-outline',
    'currency-rupee': 'currency-inr',
    'card-checklist': 'clipboard-check-outline',
    'arrow-left': 'arrow-left',
    'arrow-down-circle': 'download-circle-outline',
    'shield-check': 'shield-check-outline',
  };
  BootstrapIcon = ({ name, size, color }) => {
    const mapped = ICON_MAP[name] || 'help-circle-outline';
    return <MaterialCommunityIcons name={mapped} size={size} color={color} />;
  };
} catch {
  const TEXT_MAP: Record<string, string> = {
    'eye': '\u{1F441}',
    'zoom-in': '+',
    'zoom-out': '−',
    'arrow-counterclockwise': '↺',
    'download': '⬇',
    'x-lg': '✕',
    'file-earmark-text': '📋',
    'person-circle': '👤',
    'house': '⌂',
    'box-seam': '📦',
    'cart3': '🛒',
    'bar-chart-line': '📊',
    'building': '🏢',
    'currency-rupee': '₹',
    'card-checklist': '📄',
    'arrow-left': '←',
    'arrow-down-circle': '⬇',
    'shield-check': '🛡',
  };
  BootstrapIcon = ({ name, size, color }) => (
    <Text style={{ fontSize: size * 0.75, color, lineHeight: size }}>{TEXT_MAP[name] || '•'}</Text>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChartDataPoint {
  label: string;
  value: number;
}

interface SellerData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  sellerId: string;
  emailVerified: boolean;
  registrationDate: string;
  lastLogin: string;
  status: 'Active' | 'Inactive' | 'Pending';
  avatar?: string;
  profilePicUrl?: string;
  profilePicPath?: string;
  liveSelfiePath?: string;
  fullName: string;
  businessName: string;
  businessType: string;
  gstNumber: string;
  panNumber: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  mobileVerified: boolean;
  bankVerified: boolean;
  kycVerified: boolean;
  profileCompleted: boolean;
  branchName: string;
  totalRevenue: number;
  totalOrders: number;
  referralCode: string;
  sellerCategory: string;
  hasGst: boolean;
  warehouseAddress: string;
  warehouseCity: string;
  warehouseState: string;
  warehouseCountry: string;
  warehouseArea: string;
  adminRemarks: string;
  kycRemarks: string;
  walletBalance: number;
  ifscCode: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  productsListingStatus: 'Live' | 'Inactive';
  totalProducts: number;
  productStatusDistribution: {
    active: number;
    inactive: number;
    pending: number;
  };
  orderStatusDistribution: {
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
  verificationDocuments: {
    name: string;
    available: boolean;
    url?: string;
    path?: string;
  }[];
  analyticsData: {
    daily: ChartDataPoint[];
    weekly: ChartDataPoint[];
    monthly: ChartDataPoint[];
    yearly: ChartDataPoint[];
  };
  ordersAnalyticsData: {
    daily: ChartDataPoint[];
    weekly: ChartDataPoint[];
    monthly: ChartDataPoint[];
    yearly: ChartDataPoint[];
  };
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_SELLER: SellerData = {
  id: '285',
  firstName: 'Khaiser',
  lastName: 'Mohammed',
  email: 'mohammed1156@gmail.com',
  mobile: '7799784234',
  sellerId: 'FNT-SELLER-000101',
  emailVerified: true,
  registrationDate: '25 May, 2026 17:12',
  lastLogin: '04 Jun, 2026 11:26',
  status: 'Active',
  fullName: 'Khaiser Mohammed',
  businessName: 'JOYA ALL BAGS CENTRE',
  businessType: 'Sole Proprietorship',
  gstNumber: '36JCBPA4456R1ZS',
  panNumber: 'JCBPA4456R',
  address: 'H NO: A-26/1, 52, MARKET ROAD, NEAR WATER TANK',
  city: 'Sangareddy',
  state: 'Telangana',
  pincode: '502110',
  country: 'India',
  mobileVerified: true,
  bankVerified: true,
  kycVerified: true,
  profileCompleted: true,
  branchName: '—',
  totalRevenue: 0,
  referralCode: '—',
  sellerCategory: '—',
  hasGst: true,
  warehouseAddress: '—',
  warehouseCity: '—',
  warehouseState: '—',
  warehouseCountry: '—',
  warehouseArea: '—',
  adminRemarks: '—',
  kycRemarks: '—',
  walletBalance: 0.0,
  ifscCode: 'FDRL0002111',
  bankName: 'FEDERAL BANK LTD',
  accountHolder: 'JOYA ALL BAGS CENTRE',
  accountNumber: '17382150062',
  productsListingStatus: 'Live',
  totalProducts: 2,
  productStatusDistribution: { active: 2, inactive: 0, pending: 0 },
  orderStatusDistribution: { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 },
  totalOrders: 0,
  verificationDocuments: [
    { name: 'Aadhaar Front', available: true },
    { name: 'Aadhaar Back', available: true },
    { name: 'PAN Card', available: true },
    { name: 'Cancelled Cheque', available: true },
    { name: 'Business Proof', available: true },
    { name: 'Bank Proof', available: true },
  ],
  analyticsData: {
    daily: Array.from({ length: 30 }, (_, i) => {
      const d = new Date(2026, 4, 12);
      d.setDate(d.getDate() + i);
      return {
        label: `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`,
        value: i === 22 ? 2 : i === 21 ? 1 : 0,
      };
    }),
    weekly: [
      { label: 'Week 1', value: 0 },
      { label: 'Week 2', value: 1 },
      { label: 'Week 3', value: 2 },
      { label: 'Week 4', value: 0 },
    ],
    monthly: [
      { label: 'Jan', value: 0 },
      { label: 'Feb', value: 0 },
      { label: 'Mar', value: 1 },
      { label: 'Apr', value: 0 },
      { label: 'May', value: 2 },
      { label: 'Jun', value: 1 },
    ],
    yearly: [
      { label: '2023', value: 0 },
      { label: '2024', value: 3 },
      { label: '2025', value: 5 },
      { label: '2026', value: 2 },
    ],
  },
  ordersAnalyticsData: {
    daily: Array.from({ length: 30 }, (_, i) => {
      const d = new Date(2026, 4, 12);
      d.setDate(d.getDate() + i);
      return { label: `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`, value: 0 };
    }),
    weekly: [
      { label: 'Week 1', value: 0 },
      { label: 'Week 2', value: 0 },
      { label: 'Week 3', value: 0 },
      { label: 'Week 4', value: 0 },
    ],
    monthly: [
      { label: 'Jan', value: 0 },
      { label: 'Feb', value: 0 },
      { label: 'Mar', value: 0 },
      { label: 'Apr', value: 0 },
      { label: 'May', value: 0 },
      { label: 'Jun', value: 0 },
    ],
    yearly: [
      { label: '2023', value: 0 },
      { label: '2024', value: 0 },
      { label: '2025', value: 0 },
      { label: '2026', value: 0 },
    ],
  },
};

// ─── Color Tokens ─────────────────────────────────────────────────────────────
const COLORS = {
  primary: '#F97316',
  primaryLight: '#FFA55C',
  primaryBg: '#FFF5EE',
  headerBg: '#1D324E',          // ← dark blue for page header container
  headerBgDeep: '#152540',      // ← slightly deeper for subtle depth
  sectionHeader: '#FFFFFF',
  white: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#666666',
  textMuted: '#999999',
  border: '#E8E0D8',
  success: '#28A745',
  danger: '#DC3545',
  warning: '#FFC107',
  info: '#17A2B8',
  teal: '#20C997',
  cardBg: '#FAFAFA',
  shadowColor: '#00000018',
};

// ─── Mini Sparkline Chart ─────────────────────────────────────────────────────
const SparklineChart: React.FC<{
  data: ChartDataPoint[];
  width: number;
  height: number;
  color: string;
  tooltipIndex: number | null;
  onPointPress: (index: number | null) => void;
  tooltipLabel?: string;
  period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
}> = ({ data, width, height, color, tooltipIndex, onPointPress, tooltipLabel = 'Products Listed', period = 'daily' }) => {
  const padding = { top: 20, bottom: 30, left: 36, right: 16 };
  const chartW = Math.max(0, width - padding.left - padding.right);
  const chartH = height - padding.top - padding.bottom;

  if (!data || data.length === 0) {
    return (
      <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 13, color: COLORS.textMuted }}>No data available</Text>
      </View>
    );
  }

  let maxDataVal = Math.max(...data.map(d => d.value), 0);
  let chartMax = Math.max(2, maxDataVal);
  if (chartMax > 2 && chartMax % 2 !== 0) chartMax += 1;

  const maxVal = chartMax;
  const minVal = 0;

  const getX = (i: number) => {
    if (data.length <= 1) return padding.left;
    return padding.left + (i / (data.length - 1)) * chartW;
  };
  const getY = (v: number) =>
    padding.top + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;

  const points = data.map((d, i) => ({ x: getX(i), y: getY(d.value) }));
  const fillPoints = [
    { x: getX(0), y: padding.top + chartH },
    ...points,
    { x: getX(data.length - 1), y: padding.top + chartH },
  ];

  const yLabels = [0, maxVal / 2, maxVal];

  // Calculate label thinning to avoid overlap on small screens
  const approxLabelWidth = 44; // px
  const availablePerLabel = chartW / Math.max(1, data.length - 1);
  let step = Math.max(1, Math.ceil(approxLabelWidth / Math.max(1, availablePerLabel)));

  const isSmall = width <= 360;
  // On very small screens show all labels but rotate and compact them for readability
  const rotateLabels = isSmall;
  if (rotateLabels) {
    step = 1; // show every label but rotate/compact them
  }

  // On tablet and larger widths, always show all labels (no hiding) and allow slightly larger label space
  const isLarge = width >= 768;
  if (isLarge) {
    step = 1;
  }

  const abbreviate = (lbl: string) => {
    if (width < 380 && lbl.length > 6) return lbl.substring(0, 4) + '..';
    return lbl;
  };

  // allow rotated labels to be visible inside container
  return (
    <View style={{ width, height, overflow: 'visible' }}>
      {yLabels.map(v => (
        <View
          key={v}
          style={{
            position: 'absolute',
            left: 0,
            top: getY(v) - 7,
            width: padding.left - 4,
            alignItems: 'flex-end',
          }}
        >
          <Text style={{ fontSize: 10, color: COLORS.textMuted }}>{v}</Text>
        </View>
      ))}
      {yLabels.map(v => (
        <View
          key={v}
          style={{
            position: 'absolute',
            left: padding.left,
            top: getY(v),
            width: chartW,
            height: 1,
            backgroundColor: '#F0EAE4',
          }}
        />
      ))}
      <View style={{ position: 'absolute', top: 0, left: 0, width, height }}>
        <Svg width={width} height={height} style={{ overflow: 'hidden' }}>
          <Polygon
            points={fillPoints.map(p => `${p.x},${p.y}`).join(' ')}
            fill={color + '22'}
          />
          <Polyline
            points={points.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={color}
            strokeWidth="2"
          />
        </Svg>
      </View>
      {data.map((d, i) => (
        <TouchableOpacity
          key={i}
          onPress={() => onPointPress(tooltipIndex === i ? null : i)}
          style={{
            position: 'absolute',
            left: Math.min(Math.max(getX(i) - 10, 0), width - 20),
            top: Math.min(Math.max(getY(d.value) - 10, 0), height - 24),
            width: 20,
            height: 20,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <View
            style={{
              width: d.value > 0 ? 8 : 5,
              height: d.value > 0 ? 8 : 5,
              borderRadius: 4,
              backgroundColor: d.value > 0 ? color : COLORS.border,
              borderWidth: d.value > 0 ? 2 : 1,
              borderColor: d.value > 0 ? COLORS.white : COLORS.border,
            }}
          />
        </TouchableOpacity>
      ))}
      {tooltipIndex !== null && data[tooltipIndex] && (
        <View
          style={{
            position: 'absolute',
            left: Math.min(Math.max(getX(tooltipIndex) - 60, 4), width - 130),
            top: getY(data[tooltipIndex].value) < 60 ? getY(data[tooltipIndex].value) + 15 : getY(data[tooltipIndex].value) - 52,
            backgroundColor: '#1A1A1A',
            borderRadius: 6,
            padding: 8,
            minWidth: 120,
            zIndex: 20,
          }}
        >
          <Text style={{ color: COLORS.white, fontSize: 11, fontWeight: '600' }}>
            {data[tooltipIndex].label}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginRight: 4 }} />
            <Text style={{ color: COLORS.white, fontSize: 11 }}>
              {tooltipLabel}: {data[tooltipIndex].value}
            </Text>
          </View>
        </View>
      )}
      {data.map((d, i) => {
        // Only render some labels to avoid overlap, unless rotateLabels is enabled
        if (!rotateLabels && i !== data.length - 1 && (i % step !== 0 || data.length - 1 - i < step)) return null;
        const labelContainerWidth = rotateLabels ? 56 : Math.max(60, Math.min(140, chartW / Math.max(1, data.length) - 4));
        const x = Math.min(
          Math.max(getX(i) - labelContainerWidth / 2, padding.left - labelContainerWidth / 2),
          width - labelContainerWidth - 4,
        );
        const labelTop = rotateLabels ? padding.top + chartH + 12 : padding.top + chartH + 4;
        const labelFont = isLarge ? 11 : (rotateLabels ? Math.max(7, Math.round(width / 48)) : 9);
        const labelStyle: any = rotateLabels
          ? { fontSize: labelFont, color: COLORS.textMuted, transform: [{ rotate: '-45deg' }], textAlign: 'left' }
          : { fontSize: labelFont, color: COLORS.textMuted, textAlign: 'center' };
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: Math.max(x, 2),
              top: labelTop,
              width: labelContainerWidth,
              alignItems: rotateLabels ? 'flex-start' : 'center',
            }}
          >
            <Text numberOfLines={isLarge ? 2 : 1} ellipsizeMode="tail" style={labelStyle}>
              {isLarge ? String(d.label || '') : abbreviate(String(d.label || ''))}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

// ─── DonutChart ───────────────────────────────────────────────────────────────
const DonutChart: React.FC<{
  segments: { value: number; color: string; label: string }[];
  total: number;
  size: number;
  label?: string;
}> = ({ segments, total, size, label }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const strokeW = Math.max(12, size * 0.12);
  const r = size / 2 - strokeW / 2;
  const cx = size / 2;
  const cy = size / 2;

  let startAngle = -90;
  const gapAngle = segments.filter(s => s.value > 0).length > 1 ? 2 : 0;

  const arcs = segments.map(seg => {
    const pct = total > 0 ? seg.value / total : 0;
    const angle = pct * 360;
    const adjustedAngle = angle > gapAngle ? angle - gapAngle : angle;
    const sa = startAngle;
    startAngle += angle;
    return { ...seg, pct, startAngle: sa, angle: adjustedAngle };
  });

  const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
    const s = polarToCartesian(cx, cy, r, endAngle);
    const e = polarToCartesian(cx, cy, r, startAngle);
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y}`;
  };

  const hasData = total > 0 && segments.some(s => s.value > 0);
  const activeArc = activeIndex !== null ? arcs[activeIndex] : null;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {!hasData ? (
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={COLORS.success}
            strokeWidth={strokeW}
          />
        ) : (
          arcs.map((arc, i) => {
            if (arc.value === 0) return null;
            const isSelected = activeIndex === i;
            const currentStrokeW = isSelected ? strokeW * 1.15 : strokeW;
            if (arc.angle >= 359) {
              return (
                <Circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth={currentStrokeW}
                  onPress={() => setActiveIndex(isSelected ? null : i)}
                />
              )
            }
            return (
              <Path
                key={i}
                d={describeArc(cx, cy, r, arc.startAngle, arc.startAngle + arc.angle)}
                fill="none"
                stroke={arc.color}
                strokeWidth={currentStrokeW}
                strokeLinecap="round"
                onPress={() => setActiveIndex(isSelected ? null : i)}
              />
            );
          })
        )}
      </Svg>
      {activeArc && (
        <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center', width: size - strokeW * 2, height: size - strokeW * 2, borderRadius: size }} pointerEvents="none">
          <Text style={{ fontSize: size * 0.15, fontWeight: '800', color: COLORS.text }}>{activeArc.value}</Text>
          <Text style={{ fontSize: size * 0.08, color: COLORS.textSecondary, textAlign: 'center', marginTop: 2, paddingHorizontal: 4 }} numberOfLines={2} adjustsFontSizeToFit>{activeArc.label}</Text>
        </View>
      )}
    </View>
  );
};

// ─── Document Viewer Modal ────────────────────────────────────────────────────
interface DocModalProps {
  visible: boolean;
  docName: string;
  docUrl?: string;
  onClose: () => void;
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  box: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    backgroundColor: '#2C3A4F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  headerSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  imgContainer: {
    backgroundColor: COLORS.white,
    margin: 16,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  imgScrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  btnRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 4,
    gap: 8,
    justifyContent: 'center',
  },
  actionOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
  },
  actionOutlineBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  downloadBtn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  downloadBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
});

const DocumentViewerModal: React.FC<DocModalProps> = ({ visible, docName, docUrl, onClose }) => {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const isMobile = screenW < 600;

  const scale = useRef(new Animated.Value(1)).current;
  const [zoomLevel, setZoomLevel] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);

  const candidates = React.useMemo(() => {
    const uri = resolveSellerDocumentImageUrl(docUrl, docUrl);
    return uri ? [uri] : [];
  }, [docUrl]);
  const imageUri = candidates[0] ?? "";
  const isPdf = isPdfMedia(docUrl);

  useEffect(() => {
    setImageIndex(0);
    setZoomLevel(1);
    scale.setValue(1);
  }, [docUrl, visible, scale]);

  const zoomIn = () => {
    const next = Math.min(zoomLevel + 0.25, 3);
    setZoomLevel(next);
    Animated.spring(scale, { toValue: next, useNativeDriver: true }).start();
  };
  const zoomOut = () => {
    const next = Math.max(zoomLevel - 0.25, 0.5);
    setZoomLevel(next);
    Animated.spring(scale, { toValue: next, useNativeDriver: true }).start();
  };
  const reset = () => {
    setZoomLevel(1);
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  const modalW = isMobile ? screenW - 24 : Math.min(screenW - 64, 800);
  const imgH = isMobile ? 220 : 340;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={modalStyles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={e => e.stopPropagation()}
          style={[modalStyles.box, { width: modalW }]}
        >
          <View style={modalStyles.header}>
            <View style={modalStyles.headerLeft}>
              <View style={modalStyles.headerIconWrap}>
                <BootstrapIcon name="file-earmark-text" size={22} color={COLORS.white} />
              </View>
              <View>
                <Text style={modalStyles.headerTitle}>{docName}</Text>
                <Text style={modalStyles.headerSub}>View verification document</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <BootstrapIcon name="x-lg" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          <View style={[modalStyles.imgContainer, { height: imgH }]}>
            {!imageUri ? (
              <View style={modalStyles.imgScrollContent}>
                <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>No document image available</Text>
              </View>
            ) : isPdf ? (
              <View style={modalStyles.imgScrollContent}>
                <Text style={{ color: COLORS.textMuted, fontSize: 14, marginBottom: 12 }}>PDF document</Text>
                {Platform.OS === "web" ? (
                  <iframe
                    src={imageUri}
                    title={docName}
                    style={{ width: "100%", height: imgH - 40, border: "none" } as any}
                  />
                ) : (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => {
                      if (typeof window !== "undefined") window.open(imageUri, "_blank");
                    }}
                  >
                    <Text style={styles.actionBtnText}>Open PDF</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <ScrollView
                contentContainerStyle={modalStyles.imgScrollContent}
                maximumZoomScale={3}
                minimumZoomScale={0.5}
                bouncesZoom
                centerContent
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
              >
                <Animated.View style={{ transform: [{ scale }] }}>
                  <Image
                    source={{ uri: imageUri }}
                    style={{ width: modalW - 32, height: imgH - 16, resizeMode: 'contain' }}
                    onError={() => {
                      if (imageIndex < candidates.length - 1) setImageIndex((i) => i + 1);
                    }}
                  />
                </Animated.View>
              </ScrollView>
            )}
          </View>

          <View style={[modalStyles.btnRow, isMobile && { flexWrap: 'wrap' }]}>
            <TouchableOpacity style={modalStyles.actionOutlineBtn} onPress={zoomIn}>
              <BootstrapIcon name="zoom-in" size={15} color={COLORS.primary} />
              <Text style={modalStyles.actionOutlineBtnText}>  Zoom In</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modalStyles.actionOutlineBtn} onPress={zoomOut}>
              <BootstrapIcon name="zoom-out" size={15} color={COLORS.primary} />
              <Text style={modalStyles.actionOutlineBtnText}>  Zoom Out</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modalStyles.actionOutlineBtn} onPress={reset}>
              <BootstrapIcon name="arrow-counterclockwise" size={15} color={COLORS.primary} />
              <Text style={modalStyles.actionOutlineBtnText}>  Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.actionOutlineBtn, modalStyles.downloadBtn]}
              onPress={() => {
                if (Platform.OS === 'web') {
                  const link = document.createElement('a');
                  link.href = imageUri;
                  link.download = `${docName.replace(/\s+/g, '_')}.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                } else {
                  console.log('Download:', docName, imageUri);
                }
              }}
            >
              <BootstrapIcon name="download" size={15} color={COLORS.white} />
              <Text style={modalStyles.downloadBtnText}>  Download</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader: React.FC<{ icon: string; title: string }> = ({ icon, title }) => (
  <View style={styles.sectionHeader}>
    <BootstrapIcon name={icon} size={16} color={COLORS.primary} />
    <Text style={[styles.sectionHeaderText, { marginLeft: 8 }]}>{title}</Text>
  </View>
);

// ─── Info Row ─────────────────────────────────────────────────────────────────
const InfoRow: React.FC<{
  label: string;
  value: string | React.ReactNode;
  isHalf?: boolean;
  width: number;
}> = ({ label, value, isHalf = false, width }) => {
  const isMobile = width < 600;
  return (
    <View style={[styles.infoRow, isHalf && !isMobile ? { width: '50%' } : { width: '100%' }]}>
      <Text style={styles.infoLabel}>{label}</Text>
      {typeof value === 'string' ? (
        <Text style={styles.infoValue}>{value}</Text>
      ) : (
        value
      )}
    </View>
  );
};

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color }]}>
    <Text style={[styles.badgeText, { color }]}>{label}</Text>
  </View>
);

// ─── CSV Export Modal ─────────────────────────────────────────────────────────
const CsvExportModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  title: string;
  content: string;
}> = ({ visible, onClose, title, content }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={csvModalStyles.overlay}>
        <View style={[csvModalStyles.modal, isMobile && csvModalStyles.modalMobile]}>
          <View style={csvModalStyles.header}>
            <Text style={csvModalStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={csvModalStyles.closeBtn}>
              <BootstrapIcon name="x-lg" size={18} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <ScrollView style={csvModalStyles.content}>
            <Text style={csvModalStyles.csvText}>{content}</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const csvModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 600,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalMobile: {
    maxWidth: '100%',
  },
  header: {
    marginHorizontal: 2, marginTop: 12, borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    padding: 16,
    maxHeight: 400,
  },
  csvText: {
    fontSize: 12,
    color: COLORS.text,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    lineHeight: 18,
  },
  closeBtnBottom: {
    padding: 14,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
});

// ─── Main Component ───────────────────────────────────────────────────────────
function splitSellerName(d: Record<string, unknown>) {
  let firstName = String(d.firstName ?? '').trim();
  let lastName = String(d.lastName ?? '').trim();
  const fullName = String(d.fullName ?? '').trim();
  if (!firstName && fullName) {
    const parts = fullName.split(/\s+/);
    firstName = parts[0] ?? '';
    lastName = parts.slice(1).join(' ') || '';
  }
  return {
    firstName,
    lastName,
    fullName: fullName || `${firstName} ${lastName}`.trim() || 'Seller',
  };
}

function chartToSeries(raw: unknown, valueKey: 'productsAdded' | 'ordersPlaced' | 'registered'): ChartDataPoint[] {
  const chart = normalizeSellerGraphChart(raw);
  return chart.labels.map((label, i) => ({
    label,
    value: Number(chart[valueKey]?.[i] ?? 0),
  }));
}

function mapDetailToSellerData(
  d: Record<string, unknown>,
  charts?: { monthly?: unknown; yearly?: unknown },
): SellerData {
  const emptySeries = { daily: [] as ChartDataPoint[], weekly: [] as ChartDataPoint[], monthly: [] as ChartDataPoint[], yearly: [] as ChartDataPoint[] };
  const docs = Array.isArray(d.documents)
    ? (d.documents as { name?: string; url?: string; path?: string; available?: boolean }[])
    : [];
  const productCount = Number(d.productCount ?? 0);
  const totalOrders = Number(d.totalOrders ?? 0);
  const productDist = (d.productStatusDistribution ?? {}) as Record<string, number>;
  const orderDist = (d.orderStatusDistribution ?? {}) as Record<string, number>;
  const statusRaw = String(d.status ?? 'active').toLowerCase();
  const names = splitSellerName(d);
  const profile = {
    profilePicUrl: d.profilePicUrl as string | undefined,
    profilePicPath: d.profilePicPath as string | undefined,
    liveSelfiePath: d.liveSelfiePath as string | undefined,
  };
  const monthlyProducts = chartToSeries(charts?.monthly, 'productsAdded');
  const yearlyProducts = chartToSeries(charts?.yearly, 'productsAdded');
  const monthlyOrders = chartToSeries(charts?.monthly, 'ordersPlaced');
  const yearlyOrders = chartToSeries(charts?.yearly, 'ordersPlaced');

  return {
    id: String(d.id ?? ''),
    firstName: names.firstName,
    lastName: names.lastName,
    fullName: names.fullName,
    email: String(d.email ?? ''),
    mobile: String(d.mobile ?? ''),
    sellerId: String(d.sellerUniqueId ?? `FNT-SELLER-${String(d.id ?? '').padStart(6, '0')}`),
    emailVerified: Boolean(d.emailVerified),
    mobileVerified: Boolean(d.mobileVerified),
    registrationDate: formatDate(d.createdAt as string),
    lastLogin: formatDate(d.lastLoginAt as string),
    status: statusRaw === 'suspended' ? 'Inactive' : statusRaw === 'pending' ? 'Pending' : 'Active',
    avatar: resolveSellerProfileImage(profile) || undefined,
    profilePicUrl: profile.profilePicUrl,
    profilePicPath: profile.profilePicPath,
    liveSelfiePath: profile.liveSelfiePath,
    businessName: String(d.businessName ?? '—'),
    businessType: String(d.businessType ?? '—'),
    gstNumber: String(d.gstNumber ?? '—'),
    panNumber: String(d.panNumber ?? '—'),
    hasGst: Boolean(d.hasGst),
    address: String(d.address ?? '—').replace(/\r\n/g, ', '),
    city: String(d.city ?? '—'),
    state: String(d.state ?? '—'),
    pincode: String(d.pincode ?? '—'),
    country: String(d.country ?? '—'),
    walletBalance: Number(d.walletBalance ?? 0),
    ifscCode: String(d.ifscCode ?? '—'),
    bankName: String(d.bankName ?? '—'),
    accountHolder: String(d.accountHolder ?? '—'),
    accountNumber: maskAccount(d.accountNumber as string | undefined) || '—',
    branchName: String(d.branchName ?? '—'),
    bankVerified: Boolean(d.bankVerified),
    kycVerified: Boolean(d.kycVerified),
    profileCompleted: Boolean(d.profileCompleted),
    referralCode: String(d.referralCode ?? '—'),
    sellerCategory: String(d.sellerCategory ?? '—'),
    totalRevenue: Number(d.totalRevenue ?? 0),
    totalOrders,
    warehouseAddress: String(d.warehouseAddress ?? '—').replace(/\r\n/g, ', '),
    warehouseCity: String(d.warehouseCity ?? '—'),
    warehouseState: String(d.warehouseState ?? '—'),
    warehouseCountry: String(d.warehouseCountry ?? '—'),
    warehouseArea: String(d.warehouseArea ?? '—'),
    adminRemarks: String(d.adminRemarks ?? '—'),
    kycRemarks: String(d.kycRemarks ?? '—'),
    productsListingStatus: productCount > 0 ? 'Live' : 'Inactive',
    totalProducts: productCount,
    productStatusDistribution: (() => {
      const active = Number(productDist.active ?? 0);
      const inactive = Number(productDist.inactive ?? 0);
      const pending = Number(productDist.pending ?? 0);
      if (productCount > 0 && active + inactive + pending === 0) {
        return { active: productCount, inactive: 0, pending: 0 };
      }
      return { active, inactive, pending };
    })(),
    orderStatusDistribution: (() => {
      const pending = Number(orderDist.pending ?? 0);
      const processing = Number(orderDist.processing ?? 0);
      const shipped = Number(orderDist.shipped ?? 0);
      const delivered = Number(orderDist.delivered ?? 0);
      const cancelled = Number(orderDist.cancelled ?? 0);
      const sum = pending + processing + shipped + delivered + cancelled;
      if (totalOrders > 0 && sum === 0) {
        return { pending: totalOrders, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };
      }
      return { pending, processing, shipped, delivered, cancelled };
    })(),
    verificationDocuments: (() => {
      const defaultDocNames = [
        'Aadhaar Front',
        'Aadhaar Back',
        'PAN Card',
        'Cancelled Cheque',
        'Business Proof',
        'Bank Proof',
      ];
      const apiDocsByName = new Map<string, { url?: string; path?: string; available?: boolean }>();
      docs.forEach((doc) => {
        if (doc.name) {
          apiDocsByName.set(doc.name, doc);
        }
      });
      const finalDocs: { name: string; available: boolean; url?: string; path?: string }[] = [];
      defaultDocNames.forEach((name) => {
        if (apiDocsByName.has(name)) {
          const apiDoc = apiDocsByName.get(name)!;
          const rawPath = String(apiDoc.path ?? apiDoc.url ?? "");
          finalDocs.push({
            name,
            available: apiDoc.available !== false,
            path: rawPath || undefined,
            url: resolveSellerDocumentImageUrl(rawPath, apiDoc.url) || undefined,
          });
          apiDocsByName.delete(name);
        } else {
          finalDocs.push({
            name,
            available: false,
          });
        }
      });
      apiDocsByName.forEach((apiDoc, name) => {
        const rawPath = String(apiDoc.path ?? apiDoc.url ?? "");
        finalDocs.push({
          name,
          available: apiDoc.available !== false,
          path: rawPath || undefined,
          url: resolveSellerDocumentImageUrl(rawPath, apiDoc.url) || undefined,
        });
      });
      return finalDocs;
    })(),
    analyticsData: {
      daily: monthlyProducts,
      weekly: monthlyProducts,
      monthly: monthlyProducts,
      yearly: yearlyProducts,
    },
    ordersAnalyticsData: {
      daily: monthlyOrders,
      weekly: monthlyOrders,
      monthly: monthlyOrders,
      yearly: yearlyOrders,
    },
  };
}

function formatChartData(dataPoints: any[], period: 'daily' | 'weekly' | 'monthly' | 'yearly', forceDesktopLabels = false): ChartDataPoint[] {
  if (!Array.isArray(dataPoints)) return [];

  if (period === 'daily') {
    const targetLabels = forceDesktopLabels
      ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const sourceData = dataPoints.length >= 7 ? dataPoints.slice(-7) : dataPoints;
    return targetLabels.map((label, idx) => {
      const val = sourceData[idx]?.value ?? 0;
      return { label, value: Number(val) || 0 };
    });
  }

  if (period === 'weekly') {
    const targetLabels = forceDesktopLabels
      ? Array.from({ length: 12 }, (_, i) => `Week ${i + 1}`)
      : Array.from({ length: Math.max(dataPoints.length, 4) }, (_, i) => `Week ${i + 1}`);
    return targetLabels.map((label, idx) => {
      const val = dataPoints[idx]?.value ?? 0;
      return { label, value: Number(val) || 0 };
    });
  }

  if (period === 'monthly') {
    const targetLabels = forceDesktopLabels
      ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dataMap = new Map();
    dataPoints.forEach((d) => {
      if (d && d.label) {
        const cleanLabel = String(d.label).substring(0, 3);
        dataMap.set(cleanLabel, d.value);
      }
    });
    return targetLabels.map((label, idx) => {
      let val: any;
      if (forceDesktopLabels) {
        const shortLabel = label.substring(0, 3);
        val = dataMap.get(shortLabel);
      } else {
        val = dataMap.get(label);
      }
      if (val === undefined) {
        val = dataPoints[idx]?.value ?? 0;
      }
      return { label, value: Number(val) || 0 };
    });
  }

  if (period === 'yearly') {
    const targetLabels = ['2021', '2022', '2023', '2024', '2025', '2026'];
    const dataMap = new Map();
    dataPoints.forEach((d) => {
      if (d && d.label) {
        dataMap.set(String(d.label), d.value);
      }
    });
    return targetLabels.map((label, idx) => {
      let val = dataMap.get(label);
      if (val === undefined) {
        val = dataPoints[idx]?.value ?? 0;
      }
      return { label, value: Number(val) || 0 };
    });
  }

  return dataPoints;
}

export default function ViewSeller() {
  const params = useLocalSearchParams<{ sellerId?: string }>();
  const { token, isLoading: authLoading } = useAuth();
  const { width } = useWindowDimensions();
  const [seller, setSeller] = useState<SellerData>(() => mapDetailToSellerData({}));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sellerId = Number(params.sellerId);
    if (!sellerId || Number.isNaN(sellerId) || authLoading || !token) {
      if (!authLoading && !token) setLoading(false);
      return;
    }
    void (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const [detail, monthlyChart, yearlyChart] = await Promise.all([
          fetchSellerDetail(sellerId),
          fetchSellerAnalyticsChart({ sellerId, filterType: 'monthly' }).catch(() => null),
          fetchSellerAnalyticsChart({ sellerId, filterType: 'yearly' }).catch(() => null),
        ]);
        setSeller(mapDetailToSellerData(detail as Record<string, unknown>, {
          monthly: monthlyChart,
          yearly: yearlyChart,
        }));
        setChartData({
          daily: null,
          weekly: null,
          monthly: monthlyChart,
          yearly: yearlyChart,
        });
      } catch (e) {
        setLoadError(getApiErrorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [params.sellerId, authLoading, token]);

  const [analyticsTab, setAnalyticsTab] = useState<'products' | 'orders'>('products');
  const [periodTab, setPeriodTab] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [tooltipIndex, setTooltipIndex] = useState<number | null>(null);
  const [docModalVisible, setDocModalVisible] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<string>('');
  const [selectedDocUrl, setSelectedDocUrl] = useState<string>('');
  const [csvLoading, setCsvLoading] = useState(false);
  const [chartData, setChartData] = useState<Record<'daily' | 'weekly' | 'monthly' | 'yearly', unknown>>({
    daily: null,
    weekly: null,
    monthly: null,
    yearly: null,
  });

  // Fetch chart data when period changes
  useEffect(() => {
    const sellerId = Number(params.sellerId);
    if (!sellerId || Number.isNaN(sellerId) || !token) return;
    void (async () => {
      try {
        const data = await fetchSellerAnalyticsChart({ sellerId, filterType: periodTab });
        setChartData(prev => ({ ...prev, [periodTab]: data }));
      } catch (e) {
        console.error('Failed to fetch chart data:', e);
      }
    })();
  }, [periodTab, params.sellerId, token]);

  const exportSellerProfileToCsv = () => {
    const headers = [
      "ID",
      "Seller ID",
      "First Name",
      "Last Name",
      "Email",
      "Mobile",
      "Email Verified",
      "Mobile Verified",
      "Status",
      "Registration Date",
      "Last Login",
      "Business Name",
      "Business Type",
      "GST Number",
      "PAN Number",
      "Address",
      "City",
      "State",
      "Pincode",
      "Country",
      "GST Registered",
      "Seller Category",
      "Referral Code",
      "Wallet Balance (INR)",
      "Bank Name",
      "Account Holder",
      "Account Number",
      "IFSC Code",
      "Branch",
      "Bank Verified",
      "KYC Verified",
      "Profile Completed",
      "Total Revenue (INR)",
      "Total Orders",
      "Total Products",
      "Products Listing Status",
      "Warehouse Address",
      "Warehouse Area",
      "Warehouse City",
      "Warehouse State",
      "Warehouse Country",
      "KYC Remarks",
      "Admin Remarks"
    ];

    const values = [
      seller.id,
      seller.sellerId,
      seller.firstName,
      seller.lastName,
      seller.email,
      seller.mobile,
      seller.emailVerified ? "Yes" : "No",
      seller.mobileVerified ? "Yes" : "No",
      seller.status,
      seller.registrationDate,
      seller.lastLogin,
      seller.businessName,
      seller.businessType,
      seller.gstNumber,
      seller.panNumber,
      seller.address,
      seller.city,
      seller.state,
      seller.pincode,
      seller.country,
      seller.hasGst ? "Yes" : "No",
      seller.sellerCategory,
      seller.referralCode,
      seller.walletBalance.toFixed(2),
      seller.bankName,
      seller.accountHolder,
      seller.accountNumber,
      seller.ifscCode,
      seller.branchName,
      seller.bankVerified ? "Yes" : "No",
      seller.kycVerified ? "Verified" : "Pending",
      seller.profileCompleted ? "Yes" : "No",
      seller.totalRevenue,
      seller.totalOrders,
      seller.totalProducts,
      seller.productsListingStatus,
      seller.warehouseAddress,
      seller.warehouseArea,
      seller.warehouseCity,
      seller.warehouseState,
      seller.warehouseCountry,
      seller.kycRemarks,
      seller.adminRemarks
    ];

    const formatCsvCell = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).trim();
      const escaped = str.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const csvContent = [
      headers.map(formatCsvCell).join(','),
      values.map(formatCsvCell).join(',')
    ].join('\n');

    const fileName = `seller_${seller.sellerId || seller.id}_profile.csv`;

    try {
      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        Share.share({
          message: csvContent,
          title: `Seller Profile Export`,
        });
      }
    } catch (error) {
      console.error("Export profile CSV error:", error);
      Alert.alert("Export Error", "Failed to export seller profile.");
    }
  };

  const openDoc = (name: string, url?: string, path?: string) => {
    setSelectedDoc(name);
    // Always resolve to flintnthread.com/uploads/seller_documents/... (never .in)
    setSelectedDocUrl(resolveSellerDocumentImageUrl(path, url));
    setDocModalVisible(true);
  };

  const handleExportProductsCsv = async () => {
    const sellerId = Number(params.sellerId);
    if (!sellerId || Number.isNaN(sellerId)) return;
    try {
      setCsvLoading(true);
      const csv = await exportSellerProductsCsv(sellerId);
      await downloadCsv(csv, `products_seller_${sellerId}.csv`);
    } catch (e) {
      alert(getApiErrorMessage(e));
    } finally {
      setCsvLoading(false);
    }
  };

  const handleExportOrdersCsv = async () => {
    const sellerId = Number(params.sellerId);
    if (!sellerId || Number.isNaN(sellerId)) return;
    try {
      setCsvLoading(true);
      const csv = await exportSellerOrdersCsv(sellerId);
      await downloadCsv(csv, `orders_seller_${sellerId}.csv`);
    } catch (e) {
      alert(getApiErrorMessage(e));
    } finally {
      setCsvLoading(false);
    }
  };

  const downloadCsv = async (csvContent: string, filename: string) => {
    try {
      if (Platform.OS === "web" && typeof document !== "undefined") {
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
      }
      await Share.share({
        message: csvContent,
        title: filename,
      });
    } catch (error) {
      console.error("CSV download error:", error);
      Alert.alert("Export Error", "Unable to save or share the CSV file.");
    }
  };

  const isMobile = width < 600;
  const isTablet = width >= 600 && width < 1024;
  const isDesktopWide = width >= 1024;
  const sidebarWidth = isDesktopWide ? 250 : 0;
  const chartWidth = width - sidebarWidth - (isMobile ? 32 : isTablet ? 48 : 64);

  const currentChart = chartData[periodTab];
  const rawData = currentChart
    ? chartToSeries(currentChart, analyticsTab === 'products' ? 'productsAdded' : 'ordersPlaced')
    : (analyticsTab === 'products' ? seller.analyticsData[periodTab] : seller.ordersAnalyticsData[periodTab]);
  const currentData = formatChartData(rawData, periodTab, isDesktopWide);

  const productSegments = [
    { value: seller.productStatusDistribution.active, color: COLORS.success, label: 'Active' },
    { value: seller.productStatusDistribution.inactive, color: COLORS.danger, label: 'Inactive' },
    { value: seller.productStatusDistribution.pending, color: COLORS.warning, label: 'Pending' },
  ];

  const orderSegments = [
    { value: seller.orderStatusDistribution.pending, color: COLORS.warning, label: 'Pending' },
    { value: seller.orderStatusDistribution.processing, color: COLORS.info, label: 'Processing' },
    { value: seller.orderStatusDistribution.shipped, color: COLORS.teal, label: 'Shipped' },
    { value: seller.orderStatusDistribution.delivered, color: COLORS.success, label: 'Delivered' },
    { value: seller.orderStatusDistribution.cancelled, color: COLORS.danger, label: 'Cancelled' },
  ];

  if (loading || authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <AdminLayout>
      <ScrollView style={styles.root} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Page Header — dark blue container (matches approveseller) ── */}
        <View style={[styles.pageHeaderContainer, { marginHorizontal: isMobile ? 12 : 20 }]}>
          <View style={[styles.pageHeader, { paddingHorizontal: isMobile ? 16 : 24 }]}>
            <TouchableOpacity style={styles.pageHeaderBackBtn} onPress={() => router.push('/sellers')}>
              <BootstrapIcon name="arrow-left" size={22} color={COLORS.white} />
            </TouchableOpacity>
            <View style={styles.pageHeaderCenter}>
              <Text style={styles.pageHeaderSellerName} numberOfLines={1}>{seller.fullName}</Text>
              <Text style={styles.pageHeaderSellerId}>ID: {seller.sellerId}</Text>
            </View>
            <View style={styles.pageHeaderRight}>
              <View style={[
                styles.pageHeaderStatusBadge,
                seller.status === 'Active' ? styles.pageHeaderStatusActive
                  : seller.status === 'Pending' ? styles.pageHeaderStatusPending
                    : styles.pageHeaderStatusInactive
              ]}>
                <Text style={[
                  styles.pageHeaderStatusText,
                  { color: seller.status === 'Active' ? '#10B981' : seller.status === 'Pending' ? '#F59E0B' : '#EF4444' }
                ]}>
                  {seller.status}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {loadError ? (
          <View style={{ marginHorizontal: isMobile ? 16 : 24, marginBottom: 12, padding: 12, backgroundColor: '#FEE2E2', borderRadius: 8 }}>
            <Text style={{ color: '#B91C1C' }}>{loadError}</Text>
          </View>
        ) : null}

        {/* ── Analytics Dashboard ─────────────────────────────────────────── */}
        <View style={[styles.card, { marginHorizontal: isMobile ? 12 : 20 }]}>
          <SectionHeader icon="bar-chart-line" title="Analytics Dashboard" />

          <View style={[styles.tabRow, isMobile && { justifyContent: 'center' }]}>
            <TouchableOpacity
              style={[styles.tab, analyticsTab === 'products' && styles.tabActive, isMobile && styles.tabMobile]}
              onPress={() => { setAnalyticsTab('products'); setTooltipIndex(null); }}
            >
              <BootstrapIcon name="box-seam" size={14} color={analyticsTab === 'products' ? COLORS.primary : COLORS.textSecondary} />
              <Text style={[styles.tabText, analyticsTab === 'products' && styles.tabTextActive, isMobile && styles.tabTextMobile, { marginLeft: 5 }]}>
                Products Analytics
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, analyticsTab === 'orders' && styles.tabActive, isMobile && styles.tabMobile]}
              onPress={() => { setAnalyticsTab('orders'); setTooltipIndex(null); }}
            >
              <BootstrapIcon name="cart3" size={14} color={analyticsTab === 'orders' ? COLORS.primary : COLORS.textSecondary} />
              <Text style={[styles.tabText, analyticsTab === 'orders' && styles.tabTextActive, isMobile && styles.tabTextMobile, { marginLeft: 5 }]}>
                Orders Analytics
              </Text>
            </TouchableOpacity>
          </View>

          {isMobile ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.periodRow, { paddingHorizontal: 12 }]}
            >
              {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.periodBtn, periodTab === p && styles.periodBtnActive]}
                  onPress={() => { setPeriodTab(p); setTooltipIndex(null); }}
                >
                  <Text style={[styles.periodBtnText, periodTab === p && styles.periodBtnTextActive]}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.periodRow}>
              {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.periodBtn, periodTab === p && styles.periodBtnActive]}
                  onPress={() => { setPeriodTab(p); setTooltipIndex(null); }}
                >
                  <Text style={[styles.periodBtnText, periodTab === p && styles.periodBtnTextActive]}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={[styles.legendRow, isMobile && { justifyContent: 'center' }]}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.primaryLight }]} />
            <Text style={[styles.legendText, isMobile && { textAlign: 'center' }]}>
              {analyticsTab === 'products' ? 'Products Listed' : 'Orders Placed'}
            </Text>
          </View>

          <View style={{ marginTop: 8, zIndex: 10 }}>
            <SparklineChart
              data={formatChartData(currentData, periodTab)}
              width={chartWidth}
              height={isMobile ? 180 : 220}
              color={COLORS.primaryLight}
              tooltipIndex={tooltipIndex}
              onPointPress={setTooltipIndex}
              tooltipLabel={analyticsTab === 'products' ? 'Products Listed' : 'Orders Placed'}
              period={periodTab}
            />
          </View>
        </View>

        {/* ── Products & Orders Statistics ───────────────────────────────── */}
        <View style={[styles.card, { marginHorizontal: isMobile ? 12 : 20 }]}>
          <SectionHeader icon="bar-chart-line" title="Products & Orders Statistics" />

          <View style={styles.exportRow}>
            <TouchableOpacity style={styles.exportBtn} onPress={() => router.push('/sellers')}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <BootstrapIcon name="list" size={13} color={COLORS.white} />
                <Text style={styles.exportBtnText}>View List</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportBtn} onPress={handleExportProductsCsv} disabled={csvLoading}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <BootstrapIcon name="download" size={13} color={COLORS.white} />
                <Text style={styles.exportBtnText}>Export Products CSV</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportBtn} onPress={handleExportOrdersCsv} disabled={csvLoading}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <BootstrapIcon name="download" size={13} color={COLORS.white} />
                <Text style={styles.exportBtnText}>Export Orders CSV</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={[styles.statsRow, width <= 1024 && { flexDirection: 'column' }]}>
            <View style={[styles.statCard, width <= 1024 && { width: '100%', marginBottom: 12 }]}>
              <Text style={styles.statCardTitle}>Product Status Distribution</Text>
              <Text style={styles.statCardTotalLabel}>Total Products</Text>
              <Text style={styles.statCardTotal}>{seller.totalProducts}</Text>
              <View style={[styles.chartAndLegendContainer, width < 600 ? { flexDirection: 'column', alignItems: 'center', gap: 8 } : { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32, width: '100%' }]}>
                <View style={[styles.donutWrap, { width: Math.min(260, Math.max(150, width * 0.35)), height: Math.min(260, Math.max(150, width * 0.35)) }]}>
                  <DonutChart
                    segments={productSegments}
                    total={seller.totalProducts}
                    size={Math.min(260, Math.max(150, width * 0.35))}
                  />
                </View>
                <View style={[styles.legendList, width >= 600 && { flex: 1, maxWidth: 220 }]}>
                  {productSegments.map(s => (
                    <View key={s.label} style={styles.statLegendRow}>
                      <Text style={styles.statLegendLabel}>{s.label}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={[styles.statLegendLabel, { fontWeight: '600', color: COLORS.text }]}>{s.value}</Text>
                        <View style={[styles.statLegendDot, { backgroundColor: s.color }]} />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <View style={[styles.statCard, width <= 1024 && { width: '100%' }]}>
              <Text style={styles.statCardTitle}>Order Status Distribution</Text>
              <Text style={styles.statCardTotalLabel}>Total Orders</Text>
              <Text style={styles.statCardTotal}>{seller.totalOrders}</Text>
              <View style={[styles.chartAndLegendContainer, width < 600 ? { flexDirection: 'column', alignItems: 'center', gap: 8 } : { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32, width: '100%' }]}>
                <View style={[styles.donutWrap, { width: Math.min(260, Math.max(150, width * 0.35)), height: Math.min(260, Math.max(150, width * 0.35)) }]}>
                  <DonutChart
                    segments={orderSegments}
                    total={Math.max(
                      orderSegments.reduce((s, x) => s + x.value, 0),
                      seller.totalOrders,
                      1,
                    )}
                    size={Math.min(260, Math.max(150, width * 0.35))}
                  />
                </View>
                <View style={[styles.legendList, width >= 600 && { flex: 1, maxWidth: 220 }]}>
                  {orderSegments.map(s => (
                    <View key={s.label} style={styles.statLegendRow}>
                      <Text style={styles.statLegendLabel}>{s.label}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={[styles.statLegendLabel, { fontWeight: '600', color: COLORS.text }]}>{s.value}</Text>
                        <View style={[styles.statLegendDot, { backgroundColor: s.color }]} />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── Seller Profile Card ────────────────────────────────────────── */}
        <View style={[styles.card, { marginHorizontal: isMobile ? 12 : 20 }]}>
          <View style={[styles.profileRow, isMobile && { flexDirection: 'column', alignItems: 'center' }]}>
            <View style={styles.avatarWrap}>
              <SellerMediaImage
                seller={{
                  name: seller.fullName,
                  avatar: seller.avatar,
                  profilePicUrl: seller.profilePicUrl,
                  profilePicPath: seller.profilePicPath,
                  liveSelfiePath: seller.liveSelfiePath,
                }}
                size={80}
                fallbackBg={COLORS.primary}
              />
              <Text style={styles.avatarName}>{seller.fullName}</Text>
              <Text style={styles.avatarEmail}>{seller.email}</Text>
              <Text style={styles.avatarId}>ID: {seller.sellerId}</Text>
              <StatusBadge
                label={seller.status}
                color={seller.status === 'Active' ? COLORS.success : seller.status === 'Pending' ? COLORS.warning : COLORS.danger}
              />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                <TouchableOpacity style={styles.actionBtn} onPress={exportSellerProfileToCsv}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <BootstrapIcon name="file-earmark-text" size={13} color={COLORS.white} />
                    <Text style={styles.actionBtnText}>Export CSV</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#F97316' }]} onPress={() => router.push('/sellers')}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <BootstrapIcon name="arrow-left" size={13} color={COLORS.white} />
                    <Text style={styles.actionBtnText}>Back to List</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.personalInfo, isMobile && { width: '100%', marginTop: 16 }]}>
              <SectionHeader icon="person-circle" title="Personal Information" />
              <View style={styles.infoGrid}>
                <InfoRow label="First Name" value={seller.firstName} isHalf width={width} />
                <InfoRow
                  label="Email Verified"
                  value={<StatusBadge label={seller.emailVerified ? 'Verified' : 'Not Verified'} color={seller.emailVerified ? COLORS.success : COLORS.danger} />}
                  isHalf
                  width={width}
                />
                <InfoRow label="Last Name" value={seller.lastName} isHalf width={width} />
                <InfoRow label="Registration Date" value={seller.registrationDate} isHalf width={width} />
                <InfoRow label="Email" value={seller.email} isHalf width={width} />
                <InfoRow label="Last Login" value={seller.lastLogin} isHalf width={width} />
                <InfoRow label="Mobile" value={seller.mobile} isHalf width={width} />
                <InfoRow label="Seller ID" value={seller.sellerId} isHalf width={width} />
              </View>
            </View>
          </View>
        </View>

        {/* ── Business Information ───────────────────────────────────────── */}
        <View style={[styles.card, { marginHorizontal: isMobile ? 12 : 20 }]}>
          <SectionHeader icon="building" title="Business Information" />
          <View style={styles.infoGrid}>
            <InfoRow label="Business Name" value={seller.businessName} isHalf width={width} />
            <InfoRow label="Address" value={seller.address} isHalf width={width} />
            <InfoRow label="Business Type" value={seller.businessType} isHalf width={width} />
            <InfoRow label="City" value={seller.city} isHalf width={width} />
            <InfoRow label="GST Number" value={seller.gstNumber} isHalf width={width} />
            <InfoRow label="State" value={seller.state} isHalf width={width} />
            <InfoRow label="PAN Number" value={seller.panNumber} isHalf width={width} />
            <InfoRow label="Pincode" value={seller.pincode} isHalf width={width} />
            <InfoRow label="Country" value={seller.country} isHalf width={width} />
            <InfoRow label="GST Registered" value={seller.hasGst ? 'Yes' : 'No'} isHalf width={width} />
            <InfoRow label="Seller Category" value={seller.sellerCategory} isHalf width={width} />
            <InfoRow label="Referral Code" value={seller.referralCode} isHalf width={width} />
          </View>
        </View>

        {/* ── Warehouse Information & Verification Status ─────────────────── */}
        <View style={[styles.rowCards, { marginHorizontal: isMobile ? 12 : 20 }]}>
          <View style={[styles.card, styles.halfCard]}>
            <SectionHeader icon="geo-alt" title="Warehouse / Pickup Address" />
            <View style={styles.infoGrid}>
              <InfoRow label="Address" value={seller.warehouseAddress} isHalf width={width} />
              <InfoRow label="Area" value={seller.warehouseArea} isHalf width={width} />
              <InfoRow label="City" value={seller.warehouseCity} isHalf width={width} />
              <InfoRow label="State" value={seller.warehouseState} isHalf width={width} />
              <InfoRow label="Country" value={seller.warehouseCountry} isHalf width={width} />
            </View>
          </View>

          <View style={[styles.card, styles.halfCard]}>
            <SectionHeader icon="shield-check" title="Verification Status" />
            <View style={styles.infoGrid}>
              <InfoRow
                label="Profile Completed"
                value={<StatusBadge label={seller.profileCompleted ? 'Yes' : 'No'} color={seller.profileCompleted ? COLORS.success : COLORS.danger} />}
                isHalf
                width={width}
              />
              <InfoRow
                label="KYC Verified"
                value={<StatusBadge label={seller.kycVerified ? 'Verified' : 'Pending'} color={seller.kycVerified ? COLORS.success : COLORS.warning} />}
                isHalf
                width={width}
              />
              <InfoRow
                label="Bank Verified"
                value={<StatusBadge label={seller.bankVerified ? 'Verified' : 'Pending'} color={seller.bankVerified ? COLORS.success : COLORS.warning} />}
                isHalf
                width={width}
              />
              <InfoRow
                label="Mobile Verified"
                value={<StatusBadge label={seller.mobileVerified ? 'Verified' : 'Not Verified'} color={seller.mobileVerified ? COLORS.success : COLORS.danger} />}
                isHalf
                width={width}
              />
              <InfoRow label="KYC Remarks" value={seller.kycRemarks} isHalf width={width} />
              <InfoRow label="Admin Remarks" value={seller.adminRemarks} isHalf width={width} />
            </View>
          </View>
        </View>

        {/* ── Financial Information ──────────────────────────────────────── */}
        <View style={[styles.card, { marginHorizontal: isMobile ? 12 : 20 }]}>
          <SectionHeader icon="currency-rupee" title="Financial Information" />
          <View style={styles.infoGrid}>
            <InfoRow
              label="Wallet Balance"
              value={<Text style={[styles.infoValue, { color: COLORS.primary, fontWeight: '700' }]}>₹{seller.walletBalance.toFixed(2)}</Text>}
              isHalf
              width={width}
            />
            <InfoRow label="IFSC Code" value={seller.ifscCode} isHalf width={width} />
            <InfoRow label="Bank Name" value={seller.bankName} isHalf width={width} />
            <InfoRow label="Account Holder" value={seller.accountHolder} isHalf width={width} />
            <InfoRow label="Account Number" value={seller.accountNumber} isHalf width={width} />
            <InfoRow label="Branch" value={seller.branchName} isHalf width={width} />
            <InfoRow
              label="Bank Verified"
              value={<StatusBadge label={seller.bankVerified ? 'Verified' : 'Pending'} color={seller.bankVerified ? COLORS.success : COLORS.warning} />}
              isHalf
              width={width}
            />
            <InfoRow
              label="Total Revenue"
              value={<Text style={[styles.infoValue, { color: COLORS.primary, fontWeight: '700' }]}>₹{seller.totalRevenue.toLocaleString('en-IN')}</Text>}
              isHalf
              width={width}
            />
            <InfoRow
              label="Total Orders"
              value={<Text style={[styles.infoValue, { fontWeight: '700' }]}>{seller.totalOrders}</Text>}
              isHalf
              width={width}
            />
          </View>
        </View>

        {/* ── Products Listing ───────────────────────────────────────────── */}
        <View style={[styles.card, { marginHorizontal: isMobile ? 12 : 20 }]}>
          <SectionHeader icon="box-seam" title="Products Listing" />
          <View style={styles.infoGrid}>
            <InfoRow
              label="Products Listing Status"
              value={<StatusBadge label={seller.productsListingStatus} color={seller.productsListingStatus === 'Live' ? COLORS.success : COLORS.danger} />}
              isHalf
              width={width}
            />
            <InfoRow
              label="Total Products"
              value={<Text style={[styles.infoValue, { color: COLORS.primary, fontWeight: '700' }]}>{seller.totalProducts} Products</Text>}
              isHalf
              width={width}
            />
            <TouchableOpacity
              style={[styles.actionBtn, { alignSelf: 'flex-start', marginTop: 12, marginLeft: 8, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#1d324e' }]}
              onPress={() => router.push('/Products')}
            >
              <BootstrapIcon name="eye-fill" size={13} color={COLORS.white} />
              <Text style={styles.actionBtnText}>View All Products</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Verification Documents ─────────────────────────────────────── */}
        <View style={[styles.card, { marginHorizontal: isMobile ? 12 : 20 }]}>
          <SectionHeader icon="shield-check" title="Verification Documents" />
          {seller.verificationDocuments.map((doc, i) => (
            <View key={i} style={styles.docRow}>
              <View style={styles.docLeft}>
                {doc.available && doc.url && !isPdfMedia(doc.url) ? (
                  <Image
                    source={{ uri: resolveSellerDocumentImageUrl(doc.path, doc.url) }}
                    style={{ width: 40, height: 40, borderRadius: 6, backgroundColor: COLORS.border }}
                  />
                ) : (
                  <BootstrapIcon name="file-earmark-text" size={18} color={COLORS.primary} />
                )}
                <Text style={[styles.docName, { marginLeft: 8 }]}>{doc.name}</Text>
              </View>
              {doc.available && (
                <TouchableOpacity
                  style={styles.viewDocBtn}
                  onPress={() => openDoc(doc.name, doc.url, doc.path)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <BootstrapIcon name="eye" size={13} color={COLORS.white} />
                    <Text style={styles.viewDocBtnText}>View</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Document Viewer Modal */}
        <DocumentViewerModal
          visible={docModalVisible}
          docName={selectedDoc}
          docUrl={selectedDocUrl}
          onClose={() => setDocModalVisible(false)}
        />

        <View style={{ height: 32 }} />
      </ScrollView>
    </AdminLayout>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },

  // ── Page header container — dark blue background ──────────────────────────
  pageHeaderContainer: {
    backgroundColor: '#1d324e',
    borderRadius: 12,
    marginTop: 16,
    paddingTop: 20,
    paddingBottom: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  rowCards: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCard: {
    flex: 1,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageHeaderBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageHeaderCenter: {
    flex: 1,
    marginLeft: 16,
  },
  pageHeaderSellerName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  pageHeaderSellerId: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  pageHeaderRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  pageHeaderStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  pageHeaderStatusActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  pageHeaderStatusPending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  pageHeaderStatusInactive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  pageHeaderStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  backBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },

  // Cards
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
  },

  // Section header
  sectionHeader: {
    backgroundColor: COLORS.sectionHeader,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  sectionHeaderText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabMobile: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    minWidth: 88,
    marginHorizontal: 6,
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  tabTextMobile: {
    fontSize: 12,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  // Period buttons
  periodRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  periodBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  periodBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  periodBtnText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  periodBtnTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },

  // Legend
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 4,
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  // Export
  exportRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  exportBtn: {
    backgroundColor: '#F97316',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 5,
  },
  exportBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  statCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  statCardTotal: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
  },
  statCardTotalLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  donutWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 250,
    aspectRatio: 1,
  },

  chartAndLegendContainer: {
    width: '100%',
  },
  legendList: {
    width: '100%',
  },
  statLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 3,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 2,
  },
  statLegendLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statLegendDot: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },

  // Profile
  profileRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  avatarWrap: {
    alignItems: 'center',
    minWidth: 160,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '800',
  },
  avatarName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  avatarEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  avatarId: {
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 4,
    textAlign: 'center',
  },

  // Personal info
  personalInfo: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Info grid
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  infoRow: {
    padding: 8,
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },

  // Badge
  badge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Action button
  actionBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  actionBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },

  // Documents
  docRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  docLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  docName: {
    fontSize: 13,
    color: COLORS.text,
  },
  viewDocBtn: {
    backgroundColor: '#1d324e',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 5,
  },
  viewDocBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },


  //     borderRadius: 12,
  //     overflow: 'hidden',
  //     maxHeight: '90%',
  //     shadowColor: '#000',
  //     shadowOffset: { width: 0, height: 8 },
  //     shadowOpacity: 0.3,
  //     shadowRadius: 20,
  //     elevation: 20,
  //   },
  //   header: {
  //     backgroundColor: '#2C3A4F',
  //     flexDirection: 'row',
  //     alignItems: 'center',
  //     justifyContent: 'space-between',
  //     paddingHorizontal: 18,
  //     paddingVertical: 14,
  //   },
  //   headerLeft: {
  //     flexDirection: 'row',
  //     alignItems: 'center',
  //     gap: 12,
  //     flex: 1,
  //   },
  //   headerIconWrap: {
  //     width: 40,
  //     height: 40,
  //     borderRadius: 8,
  //     backgroundColor: 'rgba(255,255,255,0.15)',
  //     alignItems: 'center',
  //     justifyContent: 'center',
  //   },
  //   headerTitle: {
  //     color: COLORS.white,
  //     fontSize: 16,
  //     fontWeight: '700',
  //   },
  //   headerSub: {
  //     color: 'rgba(255,255,255,0.7)',
  //     fontSize: 12,
  //     marginTop: 2,
  //   },
  //   closeBtn: {
  //     width: 32,
  //     height: 32,
  //     borderRadius: 16,
  //     backgroundColor: 'rgba(255,255,255,0.15)',
  //     alignItems: 'center',
  //     justifyContent: 'center',
  //     marginLeft: 8,
  //   },
  //   imgContainer: {
  //     backgroundColor: COLORS.white,
  //     margin: 16,
  //     borderRadius: 8,
  //     overflow: 'hidden',
  //     borderWidth: 1,
  //     borderColor: COLORS.border,
  //   },
  //   imgScrollContent: {
  //     flexGrow: 1,
  //     alignItems: 'center',
  //     justifyContent: 'center',
  //     padding: 8,
  //   },
  //   btnRow: {
  //     flexDirection: 'row',
  //     paddingHorizontal: 16,
  //     paddingBottom: 20,
  //     paddingTop: 4,
  //     gap: 8,
  //     justifyContent: 'center',
  //   },
  //   actionOutlineBtn: {
  //     flexDirection: 'row',
  //     alignItems: 'center',
  //     borderWidth: 1.5,
  //     borderColor: COLORS.primary,
  //     borderRadius: 6,
  //     paddingHorizontal: 14,
  //     paddingVertical: 8,
  //     backgroundColor: COLORS.white,
  //   },
  //   actionOutlineBtnText: {
  //     color: COLORS.primary,
  //     fontSize: 13,
  //     fontWeight: '600',
  //   },
  //   downloadBtn: {
  //     backgroundColor: COLORS.primary,
  //     borderColor: COLORS.primary,
  //   },
  //   downloadBtnText: {
  //     color: COLORS.white,
  //     fontSize: 13,
  //     fontWeight: '600',
  //   },
});
