import { getApiErrorMessage } from '@/lib/api/client';
import { formatDate, maskAccount } from '@/lib/format';
import { fetchSellerDetail } from '@/services/sellerApi';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';

// ─── Bootstrap Icon component (via @expo/vector-icons or react-native-vector-icons)
// Install: expo install @expo/vector-icons  OR  npm install react-native-vector-icons
// Falls back to text symbols if icons not available
let BootstrapIcon: React.FC<{ name: string; size: number; color: string }>;
try {
  const { MaterialCommunityIcons } = require('@expo/vector-icons');
  // Map Bootstrap icon names → MaterialCommunityIcons equivalents
  const ICON_MAP: Record<string, string> = {
    'eye':                   'eye-outline',
    'eye-fill':              'eye',
    'zoom-in':               'magnify-plus-outline',
    'zoom-out':              'magnify-minus-outline',
    'arrow-counterclockwise':'restore',
    'download':              'download-outline',
    'x-lg':                  'close',
    'file-earmark-text':     'file-document-outline',
    'person-circle':         'account-circle-outline',
    'house':                 'home-outline',
    'box-seam':              'package-variant',
    'cart3':                 'cart-outline',
    'bar-chart-line':        'chart-line',
    'building':              'office-building-outline',
    'currency-rupee':        'currency-inr',
    'card-checklist':        'clipboard-check-outline',
    'arrow-left':            'arrow-left',
    'arrow-down-circle':     'download-circle-outline',
    'shield-check':          'shield-check-outline',
  };
  BootstrapIcon = ({ name, size, color }) => {
    const mapped = ICON_MAP[name] || 'help-circle-outline';
    return <MaterialCommunityIcons name={mapped} size={size} color={color} />;
  };
} catch {
  // Fallback text symbols when icon library not installed
  const TEXT_MAP: Record<string, string> = {
    'eye':                    '\u{1F441}',
    'zoom-in':                '+',
    'zoom-out':               '−',
    'arrow-counterclockwise': '↺',
    'download':               '⬇',
    'x-lg':                   '✕',
    'file-earmark-text':      '📋',
    'person-circle':          '👤',
    'house':                  '⌂',
    'box-seam':               '📦',
    'cart3':                  '🛒',
    'bar-chart-line':         '📊',
    'building':               '🏢',
    'currency-rupee':         '₹',
    'card-checklist':         '📄',
    'arrow-left':             '←',
    'arrow-down-circle':      '⬇',
    'shield-check':           '🛡',
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
  businessName: string;
  businessType: string;
  gstNumber: string;
  panNumber: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
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
  totalOrders: number;
  verificationDocuments: {
    name: string;
    available: boolean;
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
  businessName: 'JOYA ALL BAGS CENTRE',
  businessType: 'Sole Proprietorship',
  gstNumber: '36JCBPA4456R1ZS',
  panNumber: 'JCBPA4456R',
  address: 'H NO: A-26/1, 52, MARKET ROAD, NEAR WATER TANK',
  city: 'Sangareddy',
  state: 'Telangana',
  pincode: '502110',
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
  primary: '#B85C00',
  primaryLight: '#E07B30',
  primaryBg: '#FFF5EE',
  headerBg: '#8B4000',
  sectionHeader: '#A0522D',
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
}> = ({ data, width, height, color, tooltipIndex, onPointPress }) => {
  const padding = { top: 20, bottom: 30, left: 36, right: 16 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const minVal = 0;

  const getX = (i: number) => padding.left + (i / (data.length - 1)) * chartW;
  const getY = (v: number) =>
    padding.top + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;

  // Build SVG-like path as polygon points for fill area
  const points = data.map((d, i) => ({ x: getX(i), y: getY(d.value) }));
  const fillPoints = [
    { x: getX(0), y: padding.top + chartH },
    ...points,
    { x: getX(data.length - 1), y: padding.top + chartH },
  ];

  // Y-axis labels (0, 1, 2)
  const yLabels = [0, 1, 2].filter(v => v <= maxVal + 0);

  return (
    <View style={{ width, height }}>
      {/* Y-axis labels */}
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

      {/* Horizontal grid lines */}
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

      {/* Fill area */}
      <View style={{ position: 'absolute', top: 0, left: 0 }}>
        <svg width={width} height={height} style={{ overflow: 'visible' }}>
          <polygon
            points={fillPoints.map(p => `${p.x},${p.y}`).join(' ')}
            fill={color + '22'}
          />
          <polyline
            points={points.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={color}
            strokeWidth="2"
          />
        </svg>
      </View>

      {/* Touch points */}
      {data.map((d, i) => (
        <TouchableOpacity
          key={i}
          onPress={() => onPointPress(tooltipIndex === i ? null : i)}
          style={{
            position: 'absolute',
            left: getX(i) - 10,
            top: getY(d.value) - 10,
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

      {/* Tooltip */}
      {tooltipIndex !== null && (
        <View
          style={{
            position: 'absolute',
            left: Math.min(Math.max(getX(tooltipIndex) - 60, 0), width - 130),
            top: getY(data[tooltipIndex].value) - 52,
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
              Products Listed: {data[tooltipIndex].value}
            </Text>
          </View>
        </View>
      )}

      {/* X-axis labels – show all labels */}
      {data.map((d, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: getX(i) - 16,
            top: padding.top + chartH + 4,
            width: 32,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 8, color: COLORS.textMuted }}>{d.label}</Text>
        </View>
      ))}
    </View>
  );
};

// ─── DonutChart ───────────────────────────────────────────────────────────────
const DonutChart: React.FC<{
  segments: { value: number; color: string; label: string }[];
  total: number;
  size: number;
}> = ({ segments, total, size }) => {
  const r = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;
  const strokeW = 20;

  let startAngle = -90;
  const arcs = segments.map(seg => {
    const pct = total > 0 ? seg.value / total : 0;
    const angle = pct * 360;
    const sa = startAngle;
    startAngle += angle;
    return { ...seg, pct, startAngle: sa, angle };
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

  if (total === 0) {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            width: r * 2,
            height: r * 2,
            borderRadius: r,
            borderWidth: strokeW,
            borderColor: COLORS.success,
          }}
        />
      </View>
    );
  }

  return (
    <View style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        {arcs.map((arc, i) => (
          <path
            key={i}
            d={describeArc(cx, cy, r, arc.startAngle, arc.startAngle + arc.angle)}
            fill="none"
            stroke={arc.color}
            strokeWidth={strokeW}
            strokeLinecap="butt"
          />
        ))}
      </svg>
    </View>
  );
};

// ─── Document Viewer Modal ────────────────────────────────────────────────────
interface DocModalProps {
  visible: boolean;
  docName: string;
  onClose: () => void;
}

// Mock document images keyed by name
const DOC_IMAGES: Record<string, string> = {
  'Aadhaar Front':    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Aadhaar_Card.svg/640px-Aadhaar_Card.svg.png',
  'Aadhaar Back':     'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Aadhaar_Card.svg/640px-Aadhaar_Card.svg.png',
  'PAN Card':         'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/PAN_card_India.svg/640px-PAN_card_India.svg.png',
  'Cancelled Cheque': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Cheque_India.svg/640px-Cheque_India.svg.png',
  'Business Proof':   'https://via.placeholder.com/600x400/CCCCCC/666666?text=Business+Proof',
  'Bank Proof':       'https://via.placeholder.com/600x400/CCCCCC/666666?text=Bank+Proof',
};

const DocumentViewerModal: React.FC<DocModalProps> = ({ visible, docName, onClose }) => {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const isMobile = screenW < 600;

  const scale = useRef(new Animated.Value(1)).current;
  const [zoomLevel, setZoomLevel] = useState(1);

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

  const imageUri = DOC_IMAGES[docName] || `https://via.placeholder.com/600x400/CCCCCC/666666?text=${encodeURIComponent(docName)}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Overlay */}
      <TouchableOpacity
        style={modalStyles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        {/* Modal box — stop propagation */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={e => e.stopPropagation()}
          style={[modalStyles.box, { width: modalW }]}
        >
          {/* ── Header ─────────────────────────────────────── */}
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

          {/* ── Image area ─────────────────────────────────── */}
          <View style={[modalStyles.imgContainer, { height: imgH }]}>
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
                  defaultSource={{ uri: `https://via.placeholder.com/${modalW - 32}x${imgH - 16}/F5F0EB/A0522D?text=Loading...` }}
                />
              </Animated.View>
            </ScrollView>
          </View>

          {/* ── Action Buttons ─────────────────────────────── */}
          <View style={[modalStyles.btnRow, isMobile && { flexWrap: 'wrap' }]}>
            {/* Zoom In */}
            <TouchableOpacity style={modalStyles.actionOutlineBtn} onPress={zoomIn}>
              <BootstrapIcon name="zoom-in" size={15} color={COLORS.primary} />
              <Text style={modalStyles.actionOutlineBtnText}>  Zoom In</Text>
            </TouchableOpacity>

            {/* Zoom Out */}
            <TouchableOpacity style={modalStyles.actionOutlineBtn} onPress={zoomOut}>
              <BootstrapIcon name="zoom-out" size={15} color={COLORS.primary} />
              <Text style={modalStyles.actionOutlineBtnText}>  Zoom Out</Text>
            </TouchableOpacity>

            {/* Reset */}
            <TouchableOpacity style={modalStyles.actionOutlineBtn} onPress={reset}>
              <BootstrapIcon name="arrow-counterclockwise" size={15} color={COLORS.primary} />
              <Text style={modalStyles.actionOutlineBtnText}>  Reset</Text>
            </TouchableOpacity>

            {/* Download */}
            <TouchableOpacity
              style={[modalStyles.actionOutlineBtn, modalStyles.downloadBtn]}
              onPress={() => {
                if (Platform.OS === 'web') {
                  // Web download using blob
                  const link = document.createElement('a');
                  link.href = imageUri;
                  link.download = `${docName.replace(/\s+/g, '_')}.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                } else {
                  // React Native: use expo-file-system or similar
                  console.log('Download:', docName, imageUri);
                  // In production, implement with expo-file-system:
                  // import * as FileSystem from 'expo-file-system';
                  // const fileUri = FileSystem.documentDirectory + `${docName}.png`;
                  // await FileSystem.downloadAsync(imageUri, fileUri);
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
    <BootstrapIcon name={icon} size={16} color={COLORS.white} />
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

// ─── CSV Export Modal ───────────────────────────────────────────────────────────
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
          <TouchableOpacity style={csvModalStyles.closeBtnBottom} onPress={onClose}>
            <Text style={csvModalStyles.closeBtnText}>Close</Text>
          </TouchableOpacity>
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
function mapDetailToSellerData(d: Record<string, unknown>): SellerData {
  const emptySeries = { daily: [] as ChartDataPoint[], weekly: [] as ChartDataPoint[], monthly: [] as ChartDataPoint[], yearly: [] as ChartDataPoint[] };
  const docs = Array.isArray(d.documents) ? d.documents as { name: string }[] : [];
  const productCount = Number(d.productCount ?? 0);
  const statusRaw = String(d.status ?? 'active').toLowerCase();
  return {
    id: String(d.id ?? ''),
    firstName: String(d.firstName ?? ''),
    lastName: String(d.lastName ?? ''),
    email: String(d.email ?? ''),
    mobile: String(d.mobile ?? ''),
    sellerId: String(d.sellerUniqueId ?? `FNT-SELLER-${String(d.id ?? '').padStart(6, '0')}`),
    emailVerified: Boolean(d.emailVerified),
    registrationDate: formatDate(d.createdAt as string),
    lastLogin: formatDate(d.lastLoginAt as string),
    status: statusRaw === 'suspended' ? 'Inactive' : statusRaw === 'pending' ? 'Pending' : 'Active',
    avatar: d.profilePicUrl as string | undefined,
    businessName: String(d.businessName ?? '—'),
    businessType: String(d.businessType ?? '—'),
    gstNumber: String(d.gstNumber ?? '—'),
    panNumber: String(d.panNumber ?? '—'),
    address: String(d.address ?? '—'),
    city: String(d.city ?? '—'),
    state: String(d.state ?? '—'),
    pincode: String(d.pincode ?? '—'),
    walletBalance: Number(d.walletBalance ?? 0),
    ifscCode: String(d.ifscCode ?? '—'),
    bankName: String(d.bankName ?? '—'),
    accountHolder: String(d.accountHolder ?? '—'),
    accountNumber: maskAccount(d.accountNumber as string | undefined) || '—',
    productsListingStatus: productCount > 0 ? 'Live' : 'Inactive',
    totalProducts: productCount,
    productStatusDistribution: { active: productCount, inactive: 0, pending: 0 },
    orderStatusDistribution: { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 },
    totalOrders: 0,
    verificationDocuments: docs.map((doc) => ({ name: doc.name, available: true })),
    analyticsData: emptySeries,
    ordersAnalyticsData: emptySeries,
  };
}

export default function ViewSeller() {
  const params = useLocalSearchParams<{ sellerId?: string }>();
  const { width } = useWindowDimensions();
  const [seller, setSeller] = useState<SellerData>(() => mapDetailToSellerData({}));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sellerId = Number(params.sellerId);
    if (!sellerId || Number.isNaN(sellerId)) {
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const detail = await fetchSellerDetail(sellerId);
        setSeller(mapDetailToSellerData(detail as Record<string, unknown>));
      } catch (e) {
        setLoadError(getApiErrorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [params.sellerId]);
  const [analyticsTab, setAnalyticsTab] = useState<'products' | 'orders'>('products');
  const [periodTab, setPeriodTab] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [tooltipIndex, setTooltipIndex] = useState<number | null>(null);
  const [docModalVisible, setDocModalVisible] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<string>('');
  const [productsExportModal, setProductsExportModal] = useState(false);
  const [ordersExportModal, setOrdersExportModal] = useState(false);

  const openDoc = (name: string) => {
    setSelectedDoc(name);
    setDocModalVisible(true);
  };

  const isMobile = width < 600;
  const isTablet = width >= 600 && width < 1024;
  const chartWidth = width - (isMobile ? 32 : isTablet ? 48 : 64);

  const currentData =
    analyticsTab === 'products'
      ? seller.analyticsData[periodTab]
      : seller.ordersAnalyticsData[periodTab];

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      {/* Page Header */}
      <View style={[styles.pageHeader, { paddingHorizontal: isMobile ? 16 : 24 }]}>
        <View style={styles.pageHeaderLeft}>
          <BootstrapIcon name="person-circle" size={32} color={COLORS.primary} />
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.pageHeaderTitle}>Seller Details</Text>
            <View style={styles.breadcrumb}>
              <BootstrapIcon name="house" size={11} color={COLORS.primary} />
              <Text style={[styles.breadcrumbItem, { marginLeft: 3 }]}>Dashboard</Text>
              <Text style={styles.breadcrumbSep}> › </Text>
              <Text style={styles.breadcrumbItem}>Ecommerce</Text>
              <Text style={styles.breadcrumbSep}> › </Text>
              <Text style={styles.breadcrumbItem}>Sellers List</Text>
              <Text style={styles.breadcrumbSep}> › </Text>
              <Text style={[styles.breadcrumbItem, { color: COLORS.textMuted }]}>Seller Details</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/sellers')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <BootstrapIcon name="arrow-left" size={13} color={COLORS.white} />
            <Text style={styles.backBtnText}>Back to Sellers</Text>
          </View>
        </TouchableOpacity>
      </View>

      {loadError ? (
        <View style={{ marginHorizontal: isMobile ? 16 : 24, marginBottom: 12, padding: 12, backgroundColor: '#FEE2E2', borderRadius: 8 }}>
          <Text style={{ color: '#B91C1C' }}>{loadError}</Text>
        </View>
      ) : null}

      {/* ── Analytics Dashboard ─────────────────────────────────────────── */}
      <View style={[styles.card, { marginHorizontal: isMobile ? 12 : 20 }]}>
        <SectionHeader icon="bar-chart-line" title="Analytics Dashboard" />

        {/* Tabs: Products | Orders */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, analyticsTab === 'products' && styles.tabActive]}
            onPress={() => { setAnalyticsTab('products'); setTooltipIndex(null); }}
          >
            <BootstrapIcon name="box-seam" size={14} color={analyticsTab === 'products' ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.tabText, analyticsTab === 'products' && styles.tabTextActive, { marginLeft: 5 }]}>
              Products Analytics
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, analyticsTab === 'orders' && styles.tabActive]}
            onPress={() => { setAnalyticsTab('orders'); setTooltipIndex(null); }}
          >
            <BootstrapIcon name="cart3" size={14} color={analyticsTab === 'orders' ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.tabText, analyticsTab === 'orders' && styles.tabTextActive, { marginLeft: 5 }]}>
              Orders Analytics
            </Text>
          </TouchableOpacity>
        </View>

        {/* Period Buttons */}
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

        {/* Legend */}
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.primaryLight }]} />
          <Text style={styles.legendText}>
            {analyticsTab === 'products' ? 'Products Listed' : 'Orders Placed'}
          </Text>
        </View>

        {/* Chart */}
        <View style={{ marginTop: 8, overflow: 'hidden' }}>
          <SparklineChart
            data={currentData}
            width={chartWidth}
            height={isMobile ? 180 : 220}
            color={COLORS.primaryLight}
            tooltipIndex={tooltipIndex}
            onPointPress={setTooltipIndex}
          />
        </View>
      </View>

      {/* ── Products & Orders Statistics ───────────────────────────────── */}
      <View style={[styles.card, { marginHorizontal: isMobile ? 12 : 20 }]}>
        <SectionHeader icon="bar-chart-line" title="Products & Orders Statistics" />

        {/* Export buttons */}
        <View style={styles.exportRow}>
          <TouchableOpacity style={styles.exportBtn} onPress={() => router.push('/sellers')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <BootstrapIcon name="list" size={13} color={COLORS.white} />
              <Text style={styles.exportBtnText}>View List</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportBtn} onPress={() => setProductsExportModal(true)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <BootstrapIcon name="download" size={13} color={COLORS.white} />
              <Text style={styles.exportBtnText}>Export Products CSV</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportBtn} onPress={() => setOrdersExportModal(true)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <BootstrapIcon name="download" size={13} color={COLORS.white} />
              <Text style={styles.exportBtnText}>Export Orders CSV</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.statsRow, isMobile && { flexDirection: 'column' }]}>
          {/* Product Status Distribution */}
          <View style={[styles.statCard, isMobile && { width: '100%', marginBottom: 12 }]}>
            <Text style={styles.statCardTitle}>Product Status Distribution</Text>
            <Text style={styles.statCardTotal}>{seller.totalProducts}</Text>
            <Text style={styles.statCardTotalLabel}>Total Products</Text>
            <View style={styles.donutWrap}>
              <DonutChart
                segments={productSegments}
                total={seller.totalProducts}
                size={isMobile ? 120 : 140}
              />
            </View>
            {productSegments.map(s => (
              <View key={s.label} style={styles.statLegendRow}>
                <Text style={styles.statLegendLabel}>{s.label}</Text>
                <View style={[styles.statLegendDot, { backgroundColor: s.color }]} />
              </View>
            ))}
          </View>

          {/* Order Status Distribution */}
          <View style={[styles.statCard, isMobile && { width: '100%' }]}>
            <Text style={styles.statCardTitle}>Order Status Distribution</Text>
            <Text style={styles.statCardTotal}>{seller.totalOrders}</Text>
            <Text style={styles.statCardTotalLabel}>Total Orders</Text>
            <View style={styles.donutWrap}>
              <DonutChart
                segments={orderSegments}
                total={Math.max(seller.totalOrders, 1)}
                size={isMobile ? 120 : 140}
              />
            </View>
            {orderSegments.map(s => (
              <View key={s.label} style={styles.statLegendRow}>
                <Text style={styles.statLegendLabel}>{s.label}</Text>
                <View style={[styles.statLegendDot, { backgroundColor: s.color }]} />
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ── Seller Profile Card ────────────────────────────────────────── */}
      <View style={[styles.card, { marginHorizontal: isMobile ? 12 : 20 }]}>
        <View style={[styles.profileRow, isMobile && { flexDirection: 'column', alignItems: 'center' }]}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {seller.firstName[0]}{seller.lastName[0]}
              </Text>
            </View>
            <Text style={styles.avatarName}>{seller.firstName} {seller.lastName}</Text>
            <Text style={styles.avatarEmail}>{seller.email}</Text>
            <Text style={styles.avatarId}>ID: {seller.sellerId}</Text>
            <StatusBadge
              label={seller.status}
              color={seller.status === 'Active' ? COLORS.success : seller.status === 'Pending' ? COLORS.warning : COLORS.danger}
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              <TouchableOpacity style={styles.actionBtn}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <BootstrapIcon name="arrow-down-circle" size={13} color={COLORS.white} />
                  <Text style={styles.actionBtnText}>Download</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.textSecondary }]} onPress={() => router.push('/sellers')}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <BootstrapIcon name="arrow-left" size={13} color={COLORS.white} />
                  <Text style={styles.actionBtnText}>Back to List</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Personal Information */}
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
        </View>
        <TouchableOpacity style={[styles.actionBtn, { alignSelf: 'flex-start', marginTop: 12, marginLeft: 8, flexDirection: 'row', alignItems: 'center', gap: 5 }]} onPress={() => router.push('/productApproval')}>
          <BootstrapIcon name="eye-fill" size={13} color={COLORS.white} />
          <Text style={styles.actionBtnText}>View All Products</Text>
        </TouchableOpacity>
      </View>

      {/* ── Verification Documents ─────────────────────────────────────── */}
      <View style={[styles.card, { marginHorizontal: isMobile ? 12 : 20 }]}>
        <SectionHeader icon="shield-check" title="Verification Documents" />
        {seller.verificationDocuments.map((doc, i) => (
          <View key={i} style={styles.docRow}>
            <View style={styles.docLeft}>
              <BootstrapIcon name="file-earmark-text" size={18} color={COLORS.primary} />
              <Text style={[styles.docName, { marginLeft: 8 }]}>{doc.name}</Text>
            </View>
            {doc.available && (
              <TouchableOpacity
                style={styles.viewDocBtn}
                onPress={() => openDoc(doc.name)}
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
        onClose={() => setDocModalVisible(false)}
      />

      {/* Products Export Modal */}
      <CsvExportModal
        visible={productsExportModal}
        onClose={() => setProductsExportModal(false)}
        title="Export Products CSV"
        content='263,"Red Banarasi Style Cotton Silk Saree with Silver Zari Border",Active,"2026-05-25 13:41:05"'
      />

      {/* Orders Export Modal */}
      <CsvExportModal
        visible={ordersExportModal}
        onClose={() => setOrdersExportModal(false)}
        title="Export Orders CSV"
        content='"Order Status","Total Amount","Created At"'
      />

      {/* Bottom spacer */}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F0EB',
  },
  container: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F0EB',
  },

  // Page header
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  pageHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pageHeaderIcon: {
    fontSize: 28,
    marginRight: 4,
  },
  pageHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  breadcrumb: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  breadcrumbItem: {
    fontSize: 12,
    color: COLORS.primary,
  },
  breadcrumbSep: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  backBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
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
  sectionHeaderIcon: {
    fontSize: 16,
  },
  sectionHeaderText: {
    color: COLORS.white,
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
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabIcon: {
    fontSize: 13,
  },
  tabText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
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
    backgroundColor: COLORS.primary,
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
    marginBottom: 8,
  },
  donutWrap: {
    marginVertical: 8,
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
  docIcon: {
    fontSize: 16,
  },
  docName: {
    fontSize: 13,
    color: COLORS.text,
  },
  viewDocBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 5,
  },
  viewDocBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
});

// ─── Modal Styles ─────────────────────────────────────────────────────────────
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