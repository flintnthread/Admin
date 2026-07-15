/**
 * sellers.tsx — Active Sellers Screen
 * React Native · Fully Responsive (mobile / tablet / laptop / desktop)
 * Bootstrap Icons rendered as inline SVG via react-native-svg
 * Grid cards: always-visible View / Deactivate / Delete buttons
 * Search: name · business · email · mobile
 * Working pagination
 *
 * Fix: Grid view is now fully responsive on web using flexWrap instead of
 * manual row-splitting, which doesn't reflow correctly on web.
 */

import AdminLayout from "@/components/admin-layout";
import Pagination from '@/components/Pagination';
import SellerMediaImage from "@/components/SellerMediaImage";
import { useAuth } from "@/context/auth-context";
import { getApiErrorMessage } from '@/lib/api/client';
import { buildSellerImageCandidates } from '@/lib/api/media';
import { mapSellerListRow } from '@/lib/mappers';
import { blockSeller, fetchSellerAnalyticsSummary, fetchSellers, normalizeSellerGraphSummary, unblockSeller } from '@/services/sellerApi';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

const IS_WEB = Platform.OS === 'web';

// ─────────────────────────── TYPES ───────────────────────────────────────────
type KycStatus = 'Not Submitted' | 'Submitted' | 'Approved' | 'Pending';
type ProductStatus = 'Done' | 'Not Started' | 'Pending';
interface Seller {
  id: string; numericId: number; serialNo: number;
  name: string; email: string; mobile: string;
  business: string; sain: string;
  status: 'Active' | 'Inactive';
  kyc: KycStatus;
  products: { status: ProductStatus; count: number };
  wallet: string; registered: string;
  banner?: string; avatar?: string;
  profilePicUrl?: string; profilePicPath?: string; liveSelfiePath?: string;
  city?: string; state?: string; businessType?: string;
  revenue?: number; totalOrders?: number; country?: string;
  bankVerified?: boolean;
}

// ─────────────────────────── COLORS ──────────────────────────────────────────
const C = {
  primary: '#D4690A', primaryDark: '#B55508', primaryLight: '#FFF3E6',
  bg: '#F4F5F7', card: '#FFFFFF', border: '#E5EAF2',
  text: '#1C1C2E', sub: '#64748B', muted: '#94A3B8',
  green: '#16A34A', greenBg: '#DCFCE7',
  red: '#DC2626', redBg: '#FEE2E2',
  amber: '#D97706', amberBg: '#FEF3C7',
  navy: '#1E3A8A', navyBg: '#DBEAFE',
  purple: '#7C3AED', purpleBg: '#EDE9FE',
};

// ─────────────────────────── BOOTSTRAP ICON SVGs ─────────────────────────────
const IconGrid = ({ size = 18, color = '#64748B' }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5zm8 0A1.5 1.5 0 0 1 10.5 9h3A1.5 1.5 0 0 1 15 10.5v3A1.5 1.5 0 0 1 13.5 15h-3A1.5 1.5 0 0 1 9 13.5z" />
  </Svg>
);
const IconList = ({ size = 18, color = '#64748B' }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5" />
  </Svg>
);
const IconSearch = ({ size = 16, color = '#94A3B8' }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0" />
  </Svg>
);
const IconEye = ({ size = 14, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z" />
    <Path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0" />
  </Svg>
);
const IconEyeSlash = ({ size = 14, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7 7 0 0 0-2.79.588l.77.771A6 6 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755q-.247.248-.517.486z" />
    <Path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829" />
    <Path d="M3.35 5.47q-.27.24-.518.487A13 13 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7 7 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12z" />
  </Svg>
);
const IconTrash = ({ size = 14, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M11 1.5v1h3.5a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 11.115 16h-6.23a2 2 0 0 1-1.994-1.84L2.038 3.5H1.5a.5.5 0 0 1 0-1H5v-1A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5m-5 0v1h4v-1a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5M4.5 5.029l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06m6.53-.528a.5.5 0 0 0-.528.47l-.5 8.5a.5.5 0 0 0 .998.058l.5-8.5a.5.5 0 0 0-.47-.528M8 4.5a.5.5 0 0 0-.5.5v8.5a.5.5 0 0 0 1 0V5a.5.5 0 0 0-.5-.5" />
  </Svg>
);
const IconBuilding = ({ size = 12, color = '#64748B' }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M4 2.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5zm3.5-.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5zM4 5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5zM7.5 5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5zm2.5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5zM4.5 8a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5zm2.5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5zm3.5-.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5z" />
    <Path d="M2 1a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1zm11 0H3v14h3v-2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V15h3z" />
  </Svg>
);
const IconChevLeft = ({ size = 14, color = '#64748B' }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0" />
  </Svg>
);
const IconChevRight = ({ size = 14, color = '#64748B' }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708" />
  </Svg>
);
const IconUpload = ({ size = 13, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5" />
    <Path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708z" />
  </Svg>
);
const IconPerson = ({ size = 22, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.029 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z" />
  </Svg>
);
const IconCheckCircle = ({ size = 10, color = '#16A34A' }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16" />
    <Path d="m10.97 4.97-.02.022-3.473 4.425-2.093-2.094a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05" />
  </Svg>
);
const IconDash = ({ size = 10, color = '#D97706' }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16" />
    <Path d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8" />
  </Svg>
);
const IconCloseCircle = ({ size = 10, color = '#DC2626' }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16" />
    <Path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708" />
  </Svg>
);

// ─────────────────────────── BREAKPOINTS ─────────────────────────────────────
const getScreen = (w: number) => {
  if (w < 480) return 'xs';
  if (w < 768) return 'sm';
  if (w < 1024) return 'md';
  return 'lg';
};

// Native grid columns (used only on non-web)
const getCols = (w: number) => w < 480 ? 1 : w < 768 ? 2 : 3;

// Web grid columns — richer breakpoints since browser reflow works correctly
const getWebCols = (w: number) => {
  if (w >= 1400) return 4;
  if (w >= 1024) return 3;
  if (w >= 640) return 2;
  return 1;
};

const getPerPage = (w: number) => w < 480 ? 6 : w < 768 ? 9 : 12;

// ─────────────────────────── BADGES ──────────────────────────────────────────
const ActiveBadge = () => (
  <View style={[Bd.base, { backgroundColor: C.greenBg }]}>
    <View style={Bd.dot} />
    <Text style={[Bd.txt, { color: C.green }]}>Active</Text>
  </View>
);
const InactiveBadge = () => (
  <View style={[Bd.base, { backgroundColor: '#F1F5F9' }]}>
    <View style={[Bd.dot, { backgroundColor: C.muted }]} />
    <Text style={[Bd.txt, { color: C.muted }]}>Inactive</Text>
  </View>
);
const KycBadge = ({ kyc }: { kyc: KycStatus }) => {
  const ok = kyc === 'Submitted' || kyc === 'Approved';
  return (
    <View style={[Bd.base, { backgroundColor: ok ? C.greenBg : C.redBg }]}>
      <Text style={[Bd.txt, { color: ok ? C.green : C.red }]}>{kyc}</Text>
    </View>
  );
};
const ProductBadge = ({ status, count }: { status: ProductStatus; count: number }) => {
  const done = status === 'Done';
  return (
    <View style={[Bd.base, { backgroundColor: done ? C.greenBg : C.amberBg, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
      {done
        ? <IconCheckCircle size={10} color={C.green} />
        : <IconDash size={10} color={C.amber} />}
      <Text style={[Bd.txt, { color: done ? C.green : C.amber }]}>
        {done ? `Done (${count})` : 'Not Started'}
      </Text>
    </View>
  );
};
const IdBadge = ({ id }: { id: string }) => (
  <View style={Bd.idBase}>
    <Text style={Bd.idTxt} numberOfLines={1}>ID: {id}</Text>
  </View>
);
const Bd = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green, marginRight: 4 },
  txt: { fontSize: 11, fontWeight: '600' },
  idBase: { borderWidth: 1.5, borderColor: C.primary, backgroundColor: C.primaryLight, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start' },
  idTxt: { fontSize: 10, color: C.primary, fontWeight: '700' },
});

const SellerAvatar = ({
  seller,
  size = 34,
  style,
}: {
  seller: Seller;
  size?: number;
  style?: object;
}) => (
  <SellerMediaImage seller={seller} size={size} style={style} />
);

// ─────────────────────────── CONFIRM MODAL ───────────────────────────────────
const ConfirmModal = ({
  visible, title, message, confirmLabel, confirmColor, onConfirm, onCancel,
}: {
  visible: boolean; title: string; message: string;
  confirmLabel: string; confirmColor: string;
  onConfirm: () => void; onCancel: () => void;
}) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={CM.overlay}>
      <View style={CM.box}>
        <Text style={CM.title}>{title}</Text>
        <Text style={CM.msg}>{message}</Text>
        <View style={CM.row}>
          <TouchableOpacity style={CM.cancel} onPress={onCancel}>
            <Text style={CM.cancelTxt}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[CM.confirm, { backgroundColor: confirmColor }]} onPress={onConfirm}>
            <Text style={CM.confirmTxt}>{confirmLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);
const CM = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  box: { backgroundColor: '#FFF', borderRadius: 14, padding: 24, width: '100%', maxWidth: 380, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  title: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 8 },
  msg: { fontSize: 14, color: C.sub, marginBottom: 20, lineHeight: 21 },
  row: { flexDirection: 'row', gap: 10 },
  cancel: { flex: 1, height: 42, borderRadius: 8, borderWidth: 1.5, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  cancelTxt: { fontSize: 14, color: C.sub, fontWeight: '600' },
  confirm: { flex: 1, height: 42, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  confirmTxt: { fontSize: 14, color: '#FFF', fontWeight: '700' },
});

// ─────────────────────────── VIEW DETAIL MODAL ───────────────────────────────
const ViewModal = ({ seller, onClose }: { seller: Seller | null; onClose: () => void }) => {
  if (!seller) return null;
  const rows = [
    ['Seller ID', seller.id],
    ['Email', seller.email],
    ['Mobile', seller.mobile],
    ['Business', seller.business],
    ['Business Type', seller.businessType ?? '—'],
    ['Location', `${seller.city ?? '—'}, ${seller.state ?? '—'}`],
    ['Registered', seller.registered],
    ['Wallet', seller.wallet],
    ['Revenue', seller.revenue != null ? `₹${seller.revenue.toLocaleString('en-IN')}` : '—'],
    ['Total Orders', seller.totalOrders != null ? String(seller.totalOrders) : '—'],
    ['Country', seller.country ?? '—'],
    ['KYC', seller.kyc],
    ['Bank Verified', seller.bankVerified ? 'Yes' : 'No'],
  ];
  return (
    <Modal visible={!!seller} transparent animationType="slide">
      <View style={VM.overlay}>
        <View style={VM.sheet}>
          <View style={VM.header}>
            <Text style={VM.htitle}>{seller.name}</Text>
            <TouchableOpacity onPress={onClose} style={VM.closeBtn}>
              <Text style={VM.closeX}>✕</Text>
            </TouchableOpacity>
          </View>
          {seller.profilePicPath || seller.profilePicUrl || seller.liveSelfiePath ? (
            <SellerMediaImage seller={seller} size={160} style={VM.banner} borderRadius={0} resizeMode="cover" />
          ) : seller.banner ? (
            <Image source={{ uri: seller.banner }} style={VM.banner} />
          ) : null}
          <ScrollView style={{ maxHeight: 320 }}>
            {rows.map(([k, v]) => (
              <View key={k} style={VM.row}>
                <Text style={VM.key}>{k}</Text>
                <Text style={VM.val}>{v}</Text>
              </View>
            ))}
            <View style={VM.row}>
              <Text style={VM.key}>Products</Text>
              <ProductBadge status={seller.products.status} count={seller.products.count} />
            </View>
            <View style={VM.row}>
              <Text style={VM.key}>Status</Text>
              {seller.status === 'Active' ? <ActiveBadge /> : <InactiveBadge />}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
const VM = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 },
  header: { marginHorizontal: 2, marginTop: 12, borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14 },
  htitle: { fontSize: 18, fontWeight: '800', color: C.text, flex: 1 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  closeX: { fontSize: 14, color: C.sub, fontWeight: '700' },
  banner: { width: '100%', height: 160, resizeMode: 'cover' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  key: { fontSize: 13, color: C.muted, fontWeight: '500', flex: 1 },
  val: { fontSize: 13, color: C.text, fontWeight: '600', flex: 2, textAlign: 'right' },
});

// ─────────────────────────── GRID CARD ───────────────────────────────────────
const GridCard = ({
  seller, cardWidth, onView, onToggleStatus, onDelete,
}: {
  seller: Seller;
  cardWidth: number | string;
  onView: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}) => {
  const [isImageHovered, setIsImageHovered] = useState(false);
  const imageHoverProps = IS_WEB
    ? { onMouseEnter: () => setIsImageHovered(true), onMouseLeave: () => setIsImageHovered(false) }
    : {};
  const candidates = buildSellerImageCandidates(seller);
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerUri = candidates[bannerIndex] ?? null;

  useEffect(() => {
    setBannerIndex(0);
  }, [candidates.join('|')]);

  return (
    <View style={[GC.card, { width: cardWidth as any }]}>
      {/* Banner */}
      {IS_WEB ? (
        <View style={GC.bannerWrap} {...(imageHoverProps as any)}>
          {bannerUri ? (
            <Image
              source={{ uri: bannerUri }}
              style={GC.banner}
              onError={() => {
                if (bannerIndex < candidates.length - 1) setBannerIndex((i) => i + 1);
              }}
            />
          ) : (
            <View style={[GC.banner, GC.bannerEmpty]}>
              <IconPerson size={36} color="rgba(255,255,255,0.9)" />
            </View>
          )}
          {isImageHovered && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onView}
              style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10,
              }}
            >
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#fff',
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 20,
                gap: 6,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 4,
              }}>
                <IconEye size={16} color="#1E3A8A" />
                <Text style={{ color: '#1E3A8A', fontWeight: '700', fontSize: 13 }}>View Profile</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onView}
          style={GC.bannerWrap}
        >
          {bannerUri ? (
            <Image
              source={{ uri: bannerUri }}
              style={GC.banner}
              onError={() => {
                if (bannerIndex < candidates.length - 1) setBannerIndex((i) => i + 1);
              }}
            />
          ) : (
            <View style={[GC.banner, GC.bannerEmpty]}>
              <IconPerson size={36} color="rgba(255,255,255,0.9)" />
            </View>
          )}
        </TouchableOpacity>
      )}
      {/* S.No badge top-right */}
      <View style={GC.snoBadge}>
        <Text style={GC.snoTxt}>S.No: {seller.serialNo}</Text>
      </View>

      {/* Card body */}
      <View style={GC.body}>
        {/* Name */}
        <View style={GC.nameRow}>
          <SellerAvatar seller={seller} size={28} />
          <Text style={[GC.name, { marginLeft: 8 }]} numberOfLines={1}>{seller.name}</Text>
        </View>

        {/* ID badge */}
        <IdBadge id={seller.id} />

        {/* Business */}
        <View style={GC.infoRow}>
          <IconBuilding size={12} color={C.muted} />
          <Text style={GC.infoTxt} numberOfLines={1}>{seller.business}</Text>
        </View>

        {/* Status */}
        <View style={{ marginTop: 2 }}>
          {seller.status === 'Active' ? <ActiveBadge /> : <InactiveBadge />}
        </View>

        <View style={GC.divider} />

        {/* KYC + Wallet */}
        <View style={GC.footRow}>
          <View>
            <Text style={GC.footLabel}>KYC Status:</Text>
            <KycBadge kyc={seller.kyc} />
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={GC.footLabel}>Wallet:</Text>
            <Text style={GC.wallet}>{seller.wallet}</Text>
          </View>
        </View>

        {/* Products Listing Row with Actions */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={GC.footLabel}>Products Listing</Text>
            <ProductBadge status={seller.products.status} count={seller.products.count} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[GC.actionBtn, { backgroundColor: '#1d324e' }]}
              onPress={onView}
            >
              <IconEye size={15} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[GC.actionBtn, { backgroundColor: C.amber }]}
              onPress={onToggleStatus}
            >
              <IconEyeSlash size={15} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[GC.actionBtn, { backgroundColor: C.red }]}
              onPress={onDelete}
            >
              <IconTrash size={15} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const GC = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.09, shadowRadius: 10, elevation: 4 },
  bannerWrap: { height: 130, position: 'relative', overflow: 'hidden' },
  banner: { width: '100%', height: 130, resizeMode: 'cover' },
  bannerEmpty: { backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center' },
  snoBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  snoTxt: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  actionBtn: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  body: { padding: 12, gap: 5 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 13, fontWeight: '700', color: C.text, flex: 1, marginRight: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  infoTxt: { fontSize: 11, color: C.sub, flex: 1 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 6 },
  footRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  footLabel: { fontSize: 10, color: C.muted, marginBottom: 3 },
  wallet: { fontSize: 14, fontWeight: '700', color: C.green },
});

// ─────────────────────────── WEB GRID VIEW ───────────────────────────────────
// Replaces the manual gridRows row-splitting approach for web.
// Uses flexWrap so the browser handles reflow at any viewport width.
const WebGridView = ({
  sellers,
  onView,
  onToggleStatus,
  onDelete,
  screenWidth,
  hPad,
  gutter,
}: {
  sellers: Seller[];
  onView: (s: Seller) => void;
  onToggleStatus: (s: Seller) => void;
  onDelete: (s: Seller) => void;
  screenWidth: number;
  hPad: number;
  gutter: number;
}) => {
  const numCols = getWebCols(screenWidth);
  // Percentage width per card, using padding to implement gap
  const cardWidthPct = `${(100 / numCols).toFixed(4)}%` as any;

  if (sellers.length === 0) {
    return (
      <View style={SS.empty}>
        <Text style={SS.emptyTxt}>No sellers found</Text>
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: hPad,
        // Negative outer margin to compensate for per-card padding used as gap
        marginHorizontal: -(gutter / 2),
      }}
    >
      {sellers.map((s) => (
        <View
          key={s.id}
          style={{
            width: cardWidthPct,
            paddingHorizontal: gutter / 2,
            paddingBottom: gutter,
          }}
        >
          <GridCard
            seller={s}
            cardWidth="100%"
            onView={() => onView(s)}
            onToggleStatus={() => onToggleStatus(s)}
            onDelete={() => onDelete(s)}
          />
        </View>
      ))}
    </View>
  );
};

// ─────────────────────────── LIST HEADER ─────────────────────────────────────
const ListHeader = ({ isTablet }: { isTablet: boolean }) => (
  <View style={LV.hrow}>
    <Text style={[LV.hcell, LV.cSno]}>S. No</Text>
    <Text style={[LV.hcell, LV.cId]}>Seller ID</Text>
    <Text style={[LV.hcell, LV.cSeller]}>Seller</Text>
    {!isTablet && <Text style={[LV.hcell, LV.cBiz]}>Business</Text>}
    <Text style={[LV.hcell, LV.cStatus]}>Status</Text>
    {!isTablet && <Text style={[LV.hcell, LV.cProd]}>Products</Text>}
    <Text style={[LV.hcell, LV.cWallet]}>Wallet</Text>
    {!isTablet && <Text style={[LV.hcell, LV.cDate]}>Registered</Text>}
    <Text style={[LV.hcell, LV.cAction]}>Action</Text>
  </View>
);

// ─────────────────────────── LIST ROW ────────────────────────────────────────
const ListRow = ({
  seller, even, isTablet, isMobile, onView, onToggleStatus, onDelete,
}: {
  seller: Seller; even: boolean; isTablet: boolean; isMobile: boolean;
  onView: () => void; onToggleStatus: () => void; onDelete: () => void;
}) => {
  const rowBg = even ? '#FFF' : '#FFF8F2';

  const Actions = () => (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      <TouchableOpacity style={[LV.actBtn, { backgroundColor: '#1d324e' }]} onPress={onView}>
        <IconEye size={13} color="#FFF" />
      </TouchableOpacity>
      <TouchableOpacity style={[LV.actBtn, { backgroundColor: C.amber }]} onPress={onToggleStatus}>
        <IconEyeSlash size={13} color="#FFF" />
      </TouchableOpacity>
      <TouchableOpacity style={[LV.actBtn, { backgroundColor: C.red }]} onPress={onDelete}>
        <IconTrash size={13} color="#FFF" />
      </TouchableOpacity>
    </View>
  );

  if (isMobile) {
    return (
      <View style={[LV.mrow, { backgroundColor: rowBg }]}>
        <SellerAvatar seller={seller} size={34} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={LV.selName}>{seller.name}</Text>
          <IdBadge id={seller.id} />
          <Text style={LV.selEmail} numberOfLines={1}>{seller.business}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          {seller.status === 'Active' ? <ActiveBadge /> : <InactiveBadge />}
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.green }}>{seller.wallet}</Text>
          <Actions />
        </View>
      </View>
    );
  }

  return (
    <View style={[LV.row, { backgroundColor: rowBg }]}>
      <Text style={[LV.cell, LV.cSno]}>{seller.serialNo}</Text>
      <View style={LV.cId}><IdBadge id={seller.id} /></View>
      <View style={LV.cSeller}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <SellerAvatar seller={seller} size={34} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={LV.selName} numberOfLines={1}>{seller.name}</Text>
            <Text style={LV.selEmail} numberOfLines={1}>{seller.email}</Text>
          </View>
        </View>
      </View>
      {!isTablet && (
        <View style={LV.cBiz}>
          <Text style={LV.bizName} numberOfLines={1}>{seller.business}</Text>
          <Text style={LV.sain} numberOfLines={1}>{seller.sain}</Text>
        </View>
      )}
      <View style={LV.cStatus}>
        {seller.status === 'Active' ? <ActiveBadge /> : <InactiveBadge />}
      </View>
      {!isTablet && <View style={LV.cProd}><ProductBadge status={seller.products.status} count={seller.products.count} /></View>}
      <Text style={[LV.cell, LV.cWallet]}>{seller.wallet}</Text>
      {!isTablet && <Text style={[LV.cell, LV.cDate]}>{seller.registered}</Text>}
      <View style={LV.cAction}><Actions /></View>
    </View>
  );
};

const LV = StyleSheet.create({
  hrow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#151D4F', borderBottomWidth: 2, borderBottomColor: C.border, width: '100%' },
  hcell: { fontSize: 11, fontWeight: '700', color: '#fff', textTransform: 'uppercase', paddingRight: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.border, width: '100%' },
  mrow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  cell: { fontSize: 13, color: C.sub, paddingRight: 16 },
  cSno: { width: 44, textAlign: 'center', fontWeight: '600' },
  cId: { width: 140, paddingRight: 16 },
  cSeller: { width: 180, paddingRight: 20 },
  cBiz: { width: 120, paddingRight: 20 },
  cStatus: { width: 80, paddingRight: 12 },
  cProd: { width: 130, paddingRight: 12 },
  cWallet: { width: 140, textAlign: 'left', fontWeight: '700', color: C.green, paddingRight: 12 },
  cDate: { width: 120, fontSize: 11, paddingRight: 12 },
  cAction: { width: 100, marginLeft: 'auto' },
  avatar: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avTxt: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  selName: { fontSize: 13, fontWeight: '700', color: C.text },
  selEmail: { fontSize: 11, color: C.muted, marginTop: 1 },
  bizName: { fontSize: 12, fontWeight: '600', color: C.text },
  sain: { fontSize: 10, color: C.muted, marginTop: 1 },
  actBtn: { width: 30, height: 30, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
});



// ─────────────────────────── MAIN SCREEN ─────────────────────────────────────
export default function SellersScreen() {
  const { token, isLoading: authLoading } = useAuth();
  const { width } = useWindowDimensions();
  const screen = getScreen(width);
  const isMobile = screen === 'xs';
  const isTablet = screen === 'sm';
  const isNarrow = width < 768;
  const ipp = getPerPage(width);

  // Native only — web uses getWebCols inside WebGridView
  const numColsNative = getCols(width);

  const GUTTER = isMobile ? 10 : isTablet ? 14 : 18;
  const HPAD = isMobile ? 12 : isTablet ? 16 : 24;

  const [sellers, setSellers] = useState<Seller[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const [viewSeller, setViewSeller] = useState<Seller | null>(null);
  const [summary, setSummary] = useState<Record<string, number>>({});

  const loadSellers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setLoadError(null);
      const [res, summaryRes] = await Promise.all([
        fetchSellers({ status: 'active', search: searchQ || undefined, page: page - 1, size: ipp }),
        fetchSellerAnalyticsSummary().catch(() => ({})),
      ]);
      const items = (res.items ?? []).map((s, i) => ({
        ...mapSellerListRow(s, (page - 1) * ipp + i),
      }));
      setSellers(items);
      setTotalElements(res.totalElements ?? items.length);
      setSummary(normalizeSellerGraphSummary(summaryRes));
    } catch (e) {
      setLoadError(getApiErrorMessage(e, 'Failed to load sellers.'));
      setSellers([]);
    } finally {
      setLoading(false);
    }
  }, [ipp, page, searchQ, token]);

  useEffect(() => {
    if (authLoading || !token) return;
    void loadSellers();
  }, [authLoading, token, loadSellers]);

  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean; title: string; message: string;
    confirmLabel: string; confirmColor: string; onConfirm: () => void;
  }>({ visible: false, title: '', message: '', confirmLabel: '', confirmColor: '', onConfirm: () => { } });

  const totalPages = Math.max(1, Math.ceil(totalElements / ipp));
  const safePage = Math.min(page, totalPages);
  const paginated = sellers;

  const handleSearch = useCallback((v: string) => { setSearch(v); setSearchQ(v); setPage(1); }, []);

  const doView = (s: Seller) => router.push({ pathname: '/Viewseller', params: { sellerId: String(s.numericId) } });

  const doToggle = (s: Seller) => {
    setConfirmModal({
      visible: true,
      title: s.status === 'Active' ? 'Deactivate Seller' : 'Activate Seller',
      message: `Are you sure you want to ${s.status === 'Active' ? 'deactivate' : 'activate'} "${s.name}"?`,
      confirmLabel: s.status === 'Active' ? 'Deactivate' : 'Activate',
      confirmColor: s.status === 'Active' ? C.amber : C.green,
      onConfirm: () => {
        void (async () => {
          try {
            if (s.status === 'Active') await blockSeller(s.numericId);
            else await unblockSeller(s.numericId);
            setConfirmModal(m => ({ ...m, visible: false }));
            void loadSellers();
          } catch (e) {
            setLoadError(getApiErrorMessage(e));
            setConfirmModal(m => ({ ...m, visible: false }));
          }
        })();
      },
    });
  };

  const doDelete = (s: Seller) => {
    setConfirmModal({
      visible: true,
      title: 'Suspend Seller',
      message: `This will suspend "${s.name}" from the platform.`,
      confirmLabel: 'Suspend',
      confirmColor: C.red,
      onConfirm: () => {
        void (async () => {
          try {
            await blockSeller(s.numericId);
            setConfirmModal(m => ({ ...m, visible: false }));
            void loadSellers();
          } catch (e) {
            setLoadError(getApiErrorMessage(e));
            setConfirmModal(m => ({ ...m, visible: false }));
          }
        })();
      },
    });
  };

  // Native grid: manual row-splitting (unchanged, works fine on iOS/Android)
  const cardW = (width - HPAD * 2 - GUTTER * (numColsNative - 1)) / numColsNative;
  const gridRows: Seller[][] = [];
  for (let i = 0; i < paginated.length; i += numColsNative) {
    gridRows.push(paginated.slice(i, i + numColsNative));
  }

  const isWeb = Platform.OS === 'web';
  const Wrapper = (isMobile || isWeb) ? ScrollView : View;

  const ContentContainer = (isMobile || isWeb) ? View : ScrollView;
  const contentContainerProps = (isMobile || isWeb)
    ? { style: [SS.content, viewMode === 'list' ? { paddingHorizontal: 0 } : undefined] }
    : {
      style: { flex: 1 },
      contentContainerStyle: [SS.content, viewMode === 'list' ? { paddingHorizontal: 0 } : undefined],
      showsVerticalScrollIndicator: false,
      scrollEnabled: !isMobile,
      keyboardShouldPersistTaps: 'handled' as const
    };

  return (
    <AdminLayout>
      <Wrapper style={SS.root} {...((isMobile || isWeb) ? { showsVerticalScrollIndicator: false } : {})}>
        <StatusBar barStyle="light-content" backgroundColor="#1d324e" />

        {/* ── Header Container (Dark Blue) ── */}
        <View style={SS.headerContainer}>
          {loadError ? (
            <TouchableOpacity onPress={() => void loadSellers()}>
              <Text style={{ color: '#FCA5A5', marginBottom: 8 }}>{loadError} — Tap to retry</Text>
            </TouchableOpacity>
          ) : null}
          <View style={[SS.pageHeader, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 12 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={SS.headerIconBox}>
                <IconPerson size={16} color="#FFF" />
              </View>
              <Text style={SS.pageTitle}>Active Sellers</Text>
            </View>
            <TouchableOpacity style={SS.exportBtn} onPress={() => router.push('/sellershiprocket')}>
              <IconUpload size={13} color="#FFF" />
              <Text style={SS.exportTxt}>  Export to Shiprocket</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Stat Cards Row ── */}
        {width >= 1440 ? (
          <View style={SS.statGrid}>
            {[
              { label: "Total Sellers", value: summary.total ?? summary.registered ?? 0, icon: <IconPerson size={20} color="#3B82F6" />, iconBg: "#EFF6FF", sub: "Total signups" },
              { label: "Pending Sellers", value: summary.pending ?? summary.profileCompleted ?? 0, icon: <IconDash size={16} color="#D97706" />, iconBg: "#FEF3C7", sub: "Pending approval" },
              { label: "Approved Sellers", value: summary.approved ?? 0, icon: <IconCheckCircle size={16} color="#16A34A" />, iconBg: "#DCFCE7", sub: "Approved profiles" },
              { label: "Rejected Sellers", value: summary.rejected ?? Math.max(0, (summary.total ?? summary.registered ?? 0) - (summary.approved ?? 0) - (summary.pending ?? summary.profileCompleted ?? 0)), icon: <IconCloseCircle size={16} color="#DC2626" />, iconBg: "#FEE2E2", sub: "Rejected profiles" },
              { label: "Active Sellers", value: summary.active ?? summary.approved ?? 0, icon: <IconCheckCircle size={16} color="#059669" />, iconBg: "#E6F4EA", sub: "Active on platform" },
              { label: "Inactive Sellers", value: summary.inactive ?? Math.max(0, (summary.total ?? summary.registered ?? 0) - (summary.active ?? summary.approved ?? 0)), icon: <IconCloseCircle size={16} color="#94A3B8" />, iconBg: "#F1F5F9", sub: "Blocked/suspended" },
            ].map((c) => (
              <View key={c.label} style={SS.statCard}>
                <View style={{ flex: 1 }}>
                  <Text style={SS.statLabel}>{c.label.toUpperCase()}</Text>
                  <Text style={SS.statValue}>{c.value}</Text>
                  <Text style={SS.statSub}>{c.sub}</Text>
                </View>
                <View style={[SS.statIconBox, { backgroundColor: c.iconBg }]}>
                  {c.icon}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={{ width: "100%", marginTop: -32, marginBottom: 16, overflow: "hidden" }}>
            <ScrollView
              {...({ className: "orange-scrollbar" } as any)}
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              style={{ width: "100%" }}
              contentContainerStyle={{
                flexDirection: "row",
                gap: 12,
                paddingLeft: 22,
                paddingRight: 32,
                paddingVertical: 6,
              }}
            >
              {[
                { label: "Total Sellers", value: summary.total ?? summary.registered ?? 0, icon: <IconPerson size={20} color="#3B82F6" />, iconBg: "#EFF6FF", sub: "Total signups" },
                { label: "Pending Sellers", value: summary.pending ?? summary.profileCompleted ?? 0, icon: <IconDash size={16} color="#D97706" />, iconBg: "#FEF3C7", sub: "Pending approval" },
                { label: "Approved Sellers", value: summary.approved ?? 0, icon: <IconCheckCircle size={16} color="#16A34A" />, iconBg: "#DCFCE7", sub: "Approved profiles" },
                { label: "Rejected Sellers", value: summary.rejected ?? Math.max(0, (summary.total ?? summary.registered ?? 0) - (summary.approved ?? 0) - (summary.pending ?? summary.profileCompleted ?? 0)), icon: <IconCloseCircle size={16} color="#DC2626" />, iconBg: "#FEE2E2", sub: "Rejected profiles" },
                { label: "Active Sellers", value: summary.active ?? summary.approved ?? 0, icon: <IconCheckCircle size={16} color="#059669" />, iconBg: "#E6F4EA", sub: "Active on platform" },
                { label: "Inactive Sellers", value: summary.inactive ?? Math.max(0, (summary.total ?? summary.registered ?? 0) - (summary.active ?? summary.approved ?? 0)), icon: <IconCloseCircle size={16} color="#94A3B8" />, iconBg: "#F1F5F9", sub: "Blocked/suspended" },
              ].map((c) => (
                <View
                  key={c.label}
                  style={[
                    SS.statCard,
                    SS.statCardCompact,
                  ]}
                >
                  <View style={[SS.statIconBoxCompact, { backgroundColor: c.iconBg }]}>
                    {c.icon}
                  </View>
                  <Text style={[SS.statValueCompact, { color: '#1C1C2E' }]} numberOfLines={1}>
                    {c.value}
                  </Text>
                  <Text style={SS.statLabelCompact} numberOfLines={1}>
                    {c.label}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Toolbar */}
        <View style={[
          SS.toolbar,
          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
          width < 600 && { paddingHorizontal: 12, gap: 8 }
        ]}>
          <View style={[
            SS.searchBox,
            { flex: 1 }
          ]}>
            <IconSearch size={16} color={C.muted} />
            <TextInput
              style={SS.searchInput}
              placeholder={isMobile ? "Search by name, business, email..." : "Search by name, business, email, mobile..."}
              placeholderTextColor={C.muted}
              value={search}
              onChangeText={handleSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')} style={SS.clearBtn}>
                <Text style={{ fontSize: 14, color: C.muted }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={[
            SS.viewToggle,
            { marginLeft: width < 600 ? 8 : 14 }
          ]}>
            {width >= 600 && <Text style={SS.viewLabel}>View:</Text>}
            <TouchableOpacity style={[SS.vBtn, viewMode === 'grid' ? SS.vBtnOn : undefined]} onPress={() => setViewMode('grid')}>
              <IconGrid size={17} color={viewMode === 'grid' ? '#FFF' : C.sub} />
            </TouchableOpacity>
            <TouchableOpacity style={[SS.vBtn, viewMode === 'list' ? SS.vBtnOn : undefined]} onPress={() => setViewMode('list')}>
              <IconList size={17} color={viewMode === 'list' ? '#FFF' : C.sub} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <ContentContainer {...contentContainerProps}>
          {loading ? (
            <View style={SS.empty}>
              <ActivityIndicator size="small" color={C.primary} />
              <Text style={[SS.emptyTxt, { marginTop: 10 }]}>Loading sellers…</Text>
            </View>
          ) : viewMode === 'grid' ? (
            IS_WEB ? (
              <WebGridView
                sellers={paginated}
                onView={doView}
                onToggleStatus={doToggle}
                onDelete={doDelete}
                screenWidth={width}
                hPad={HPAD}
                gutter={GUTTER}
              />
            ) : (
              <View style={{ paddingHorizontal: HPAD }}>
                {paginated.length === 0 ? (
                  <View style={SS.empty}><Text style={SS.emptyTxt}>No sellers found for "{search}"</Text></View>
                ) : (
                  gridRows.map((row, ri) => (
                    <View key={ri} style={{ flexDirection: 'row', gap: GUTTER, marginBottom: GUTTER }}>
                      {row.map(s => (
                        <GridCard
                          key={s.id}
                          seller={s}
                          cardWidth={cardW}
                          onView={() => doView(s)}
                          onToggleStatus={() => doToggle(s)}
                          onDelete={() => doDelete(s)}
                        />
                      ))}
                      {row.length < numColsNative && Array.from({ length: numColsNative - row.length }).map((_, ei) => (
                        <View key={`ph${ei}`} style={{ width: cardW }} />
                      ))}
                    </View>
                  ))
                )}
              </View>
            )
          ) : (
            <ScrollView horizontal={width < 1100} showsHorizontalScrollIndicator={false} style={width < 1100 && { width: '100%' }}>
              <View style={[SS.listBox, width < 1100 && { marginHorizontal: 0, borderRadius: 0, minWidth: 1060 }]}>
                {(!isMobile || isMobile) && <ListHeader isTablet={width < 1100 ? false : isTablet} />}
                {paginated.length === 0 ? (
                  <View style={SS.empty}><Text style={SS.emptyTxt}>No sellers found for "{search}"</Text></View>
                ) : (
                  paginated.map((s, idx) => (
                    <ListRow
                      key={s.id}
                      seller={s}
                      even={idx % 2 === 0}
                      isTablet={width < 1100 ? false : isTablet}
                      isMobile={false}
                      onView={() => doView(s)}
                      onToggleStatus={() => doToggle(s)}
                      onDelete={() => doDelete(s)}
                    />
                  ))
                )}
              </View>
            </ScrollView>
          )}

          {/* Footer */}
          {!loading && totalElements > 0 && (
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              totalItems={totalElements}
              itemsPerPage={ipp}
              itemName="sellers"
              onPageChange={setPage}
            />
          )}
        </ContentContainer>

        {/* Modals */}
        <ViewModal seller={viewSeller} onClose={() => setViewSeller(null)} />
        <ConfirmModal
          visible={confirmModal.visible}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          confirmColor={confirmModal.confirmColor}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(m => ({ ...m, visible: false }))}
        />
      </Wrapper>
    </AdminLayout>
  );
}

// ─────────────────────────── ROOT STYLES ─────────────────────────────────────
const SS = StyleSheet.create({

  root: { flex: 1, backgroundColor: C.bg },
  topBar: { height: 56, backgroundColor: '#1d324e', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  logoBox: { width: 40, height: 40, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  backButton: { flexDirection: 'row', alignItems: 'center', marginRight: 10 },
  backButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600', marginLeft: 4 },
  headerContainer: {
    backgroundColor: "#151D4F",
    marginHorizontal: 18,
    marginTop: 22,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 48,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    marginTop: -32,
    paddingHorizontal: 20,
    marginHorizontal: 22,
    marginBottom: 16,
    zIndex: 10,
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5EAF2',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  // Compact card — mobile horizontal scroll row (matches customerDetails.tsx)
  statCardCompact: {
    width: 52,
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E5EAF2',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
    gap: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  statLabelCompact: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1C1C2E',
  },
  statValueCompact: {
    fontSize: 14,
    fontWeight: '800',
  },
  statSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  statIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconBoxCompact: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#ef7b1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  exportBtn: { backgroundColor: C.green, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  exportTxt: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  searchBox: { flex: 1, maxWidth: 1000, flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, height: 42 },
  searchInput: { flex: 1, fontSize: 14, color: C.text, height: 42, marginLeft: 8, outlineStyle: 'none' } as any,
  clearBtn: { padding: 4 },
  viewToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 14 },
  viewLabel: { fontSize: 13, color: C.sub, fontWeight: '500', marginRight: 2 },
  vBtn: { width: 36, height: 36, borderRadius: 7, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  vBtnOn: { backgroundColor: '#1d324e', borderColor: '#1d324e' },
  content: { paddingVertical: 20, paddingBottom: 0 },
  listBox: { backgroundColor: C.card, marginHorizontal: 20, borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, marginHorizontal: 20, marginTop: 16, backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2, gap: 12, flexWrap: 'wrap' },
  footTxt: { fontSize: 13, color: '#4B5563', fontWeight: '500' },
  empty: { padding: 40, alignItems: 'center' },
  emptyTxt: { fontSize: 14, color: C.muted, textAlign: 'center' },
});