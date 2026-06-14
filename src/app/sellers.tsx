/**
 * sellers.tsx — Active Sellers Screen
 * React Native · Fully Responsive (mobile / tablet / laptop / desktop)
 * Bootstrap Icons rendered as inline SVG via react-native-svg
 * Grid cards: always-visible View / Deactivate / Delete buttons
 * Search: name · business · email · mobile
 * Working pagination
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api/client';
import { mapSellerListRow } from '@/lib/mappers';
import { blockSeller, fetchSellers, unblockSeller } from '@/services/sellerApi';
import {
    Image,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';

// ─────────────────────────── TYPES ───────────────────────────────────────────
type KycStatus    = 'Not Submitted' | 'Submitted' | 'Approved' | 'Pending';
type ProductStatus = 'Done' | 'Not Started' | 'Pending';
interface Seller {
  id: string; numericId: number; serialNo: number;
  name: string; email: string; mobile: string;
  business: string; sain: string;
  status: 'Active' | 'Inactive';
  kyc: KycStatus;
  products: { status: ProductStatus; count: number };
  wallet: string; registered: string; banner?: string;
}

// ─────────────────────────── COLORS ──────────────────────────────────────────
const C = {
  primary:'#D4690A', primaryDark:'#B55508', primaryLight:'#FFF3E6',
  bg:'#F4F5F7', card:'#FFFFFF', border:'#E5EAF2',
  text:'#1C1C2E', sub:'#64748B', muted:'#94A3B8',
  green:'#16A34A', greenBg:'#DCFCE7',
  red:'#DC2626',   redBg:'#FEE2E2',
  amber:'#D97706', amberBg:'#FEF3C7',
  navy:'#1E3A8A',  navyBg:'#DBEAFE',
  purple:'#7C3AED',purpleBg:'#EDE9FE',
};

// ─────────────────────────── BOOTSTRAP ICON SVGs ─────────────────────────────
// Each icon is a pure SVG component matching Bootstrap Icons 1.11

const IconGrid = ({ size=18, color='#64748B' }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5zm8 0A1.5 1.5 0 0 1 10.5 9h3A1.5 1.5 0 0 1 15 10.5v3A1.5 1.5 0 0 1 13.5 15h-3A1.5 1.5 0 0 1 9 13.5z"/>
  </Svg>
);
const IconList = ({ size=18, color='#64748B' }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5"/>
  </Svg>
);
const IconSearch = ({ size=16, color='#94A3B8' }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
  </Svg>
);
const IconEye = ({ size=14, color='#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"/>
    <Path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/>
  </Svg>
);
const IconEyeSlash = ({ size=14, color='#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7 7 0 0 0-2.79.588l.77.771A6 6 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755q-.247.248-.517.486z"/>
    <Path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829"/>
    <Path d="M3.35 5.47q-.27.24-.518.487A13 13 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7 7 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12z"/>
  </Svg>
);
const IconTrash = ({ size=14, color='#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M11 1.5v1h3.5a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 11.115 16h-6.23a2 2 0 0 1-1.994-1.84L2.038 3.5H1.5a.5.5 0 0 1 0-1H5v-1A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5m-5 0v1h4v-1a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5M4.5 5.029l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06m6.53-.528a.5.5 0 0 0-.528.47l-.5 8.5a.5.5 0 0 0 .998.058l.5-8.5a.5.5 0 0 0-.47-.528M8 4.5a.5.5 0 0 0-.5.5v8.5a.5.5 0 0 0 1 0V5a.5.5 0 0 0-.5-.5"/>
  </Svg>
);
const IconBuilding = ({ size=12, color='#64748B' }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M4 2.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5zm3.5-.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5zM4 5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5zM7.5 5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5zm2.5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5zM4.5 8a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5zm2.5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5zm3.5-.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5z"/>
    <Path d="M2 1a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1zm11 0H3v14h3v-2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V15h3z"/>
  </Svg>
);
const IconChevLeft = ({ size=14, color='#64748B' }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0"/>
  </Svg>
);
const IconChevRight = ({ size=14, color='#64748B' }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"/>
  </Svg>
);
const IconUpload = ({ size=13, color='#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/>
    <Path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708z"/>
  </Svg>
);
const IconPerson = ({ size=22, color='#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.029 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z"/>
  </Svg>
);
const IconCheckCircle = ({ size=10, color='#16A34A' }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
    <Path d="m10.97 4.97-.02.022-3.473 4.425-2.093-2.094a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05"/>
  </Svg>
);
const IconDash = ({ size=10, color='#D97706' }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
    <Path d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8"/>
  </Svg>
);
const IconPencil = ({ size=14, color='#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325"/>
  </Svg>
);

// ─────────────────────────── BREAKPOINTS ─────────────────────────────────────
const getScreen = (w: number) => {
  if (w < 480) return 'xs';
  if (w < 768) return 'sm';
  if (w < 1024) return 'md';
  return 'lg';
};
const getCols   = (w: number) => w < 480 ? 1 : w < 768 ? 2 : 3;
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
  base: { flexDirection:'row', alignItems:'center', paddingHorizontal:8, paddingVertical:3, borderRadius:20, alignSelf:'flex-start' },
  dot:  { width:6, height:6, borderRadius:3, backgroundColor:C.green, marginRight:4 },
  txt:  { fontSize:11, fontWeight:'600' },
  idBase: { borderWidth:1.5, borderColor:C.primary, backgroundColor:C.primaryLight, borderRadius:6, paddingHorizontal:7, paddingVertical:2, alignSelf:'flex-start' },
  idTxt:  { fontSize:10, color:C.primary, fontWeight:'700' },
});

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
  overlay: { flex:1, backgroundColor:'rgba(0,0,0,0.45)', justifyContent:'center', alignItems:'center', padding:20 },
  box:     { backgroundColor:'#FFF', borderRadius:14, padding:24, width:'100%', maxWidth:380, shadowColor:'#000', shadowOffset:{width:0,height:8}, shadowOpacity:0.2, shadowRadius:20, elevation:10 },
  title:   { fontSize:17, fontWeight:'800', color:C.text, marginBottom:8 },
  msg:     { fontSize:14, color:C.sub, marginBottom:20, lineHeight:21 },
  row:     { flexDirection:'row', gap:10 },
  cancel:  { flex:1, height:42, borderRadius:8, borderWidth:1.5, borderColor:C.border, justifyContent:'center', alignItems:'center' },
  cancelTxt:  { fontSize:14, color:C.sub, fontWeight:'600' },
  confirm:    { flex:1, height:42, borderRadius:8, justifyContent:'center', alignItems:'center' },
  confirmTxt: { fontSize:14, color:'#FFF', fontWeight:'700' },
});

// ─────────────────────────── VIEW DETAIL MODAL ───────────────────────────────
const ViewModal = ({ seller, onClose }: { seller: Seller | null; onClose: () => void }) => {
  if (!seller) return null;
  const rows = [
    ['Seller ID', seller.id],
    ['Email', seller.email],
    ['Mobile', seller.mobile],
    ['Business', seller.business],
    ['Registered', seller.registered],
    ['Wallet', seller.wallet],
    ['KYC', seller.kyc],
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
          {seller.banner && <Image source={{ uri: seller.banner }} style={VM.banner} />}
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
  overlay: { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end' },
  sheet:   { backgroundColor:'#FFF', borderTopLeftRadius:20, borderTopRightRadius:20, paddingBottom:32 },
  header:  { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:20, paddingTop:20, paddingBottom:14 },
  htitle:  { fontSize:18, fontWeight:'800', color:C.text, flex:1 },
  closeBtn:{ width:32, height:32, borderRadius:16, backgroundColor:'#F1F5F9', justifyContent:'center', alignItems:'center' },
  closeX:  { fontSize:14, color:C.sub, fontWeight:'700' },
  banner:  { width:'100%', height:160, resizeMode:'cover' },
  row:     { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:20, paddingVertical:11, borderBottomWidth:1, borderBottomColor:'#F1F5F9' },
  key:     { fontSize:13, color:C.muted, fontWeight:'500', flex:1 },
  val:     { fontSize:13, color:C.text, fontWeight:'600', flex:2, textAlign:'right' },
});

// ─────────────────────────── GRID CARD ───────────────────────────────────────
const GridCard = ({
  seller, cardWidth, onView, onToggleStatus, onDelete,
}: {
  seller: Seller; cardWidth: number;
  onView: () => void; onToggleStatus: () => void; onDelete: () => void;
}) => (
  <View style={[GC.card, { width: cardWidth }]}>
    {/* Banner */}
    <View style={GC.bannerWrap}>
      {seller.banner
        ? <Image source={{ uri: seller.banner }} style={GC.banner} />
        : <View style={[GC.banner, { backgroundColor: C.primary }]} />}

      {/* S.No badge top-right */}
      <View style={GC.snoBadge}>
        <Text style={GC.snoTxt}>S.No: {seller.serialNo}</Text>
      </View>

      {/* Action buttons — always visible, centered over banner */}
      <View style={GC.actionRow}>
        <TouchableOpacity style={[GC.actionBtn, { backgroundColor: C.navy }]} onPress={onView}>
          <IconEye size={15} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity style={[GC.actionBtn, { backgroundColor: C.amber }]} onPress={onToggleStatus}>
          <IconEyeSlash size={15} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity style={[GC.actionBtn, { backgroundColor: C.red }]} onPress={onDelete}>
          <IconTrash size={15} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>

    {/* Card body */}
    <View style={GC.body}>
      {/* Name + serial */}
      <View style={GC.nameRow}>
        <Text style={GC.name} numberOfLines={1}>{seller.name}</Text>
        <View style={GC.snoMini}>
          <Text style={GC.snoMiniTxt}>S.No {seller.serialNo}</Text>
        </View>
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

      {/* Products */}
      <View style={{ marginTop: 6 }}>
        <Text style={GC.footLabel}>Products Listing</Text>
        <ProductBadge status={seller.products.status} count={seller.products.count} />
      </View>
    </View>
  </View>
);

const GC = StyleSheet.create({
  card: { backgroundColor:C.card, borderRadius:12, overflow:'hidden', marginBottom:16, shadowColor:'#000', shadowOffset:{width:0,height:3}, shadowOpacity:0.09, shadowRadius:10, elevation:4, borderWidth:1, borderColor:C.border },
  bannerWrap: { height:130, position:'relative' },
  banner: { width:'100%', height:130, resizeMode:'cover' },
  snoBadge: { position:'absolute', top:8, right:8, backgroundColor:'rgba(0,0,0,0.55)', borderRadius:5, paddingHorizontal:7, paddingVertical:3 },
  snoTxt: { color:'#FFF', fontSize:10, fontWeight:'700' },
  actionRow: { position:'absolute', top:0, left:0, right:0, bottom:0, flexDirection:'row', justifyContent:'center', alignItems:'center', gap:10, backgroundColor:'rgba(0,0,0,0.35)' },
  actionBtn: { width:36, height:36, borderRadius:8, justifyContent:'center', alignItems:'center', shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.3, shadowRadius:4, elevation:4 },
  body: { padding:12, gap:5 },
  nameRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  name: { fontSize:13, fontWeight:'700', color:C.text, flex:1, marginRight:6 },
  snoMini: { backgroundColor:'#1C1C2E', borderRadius:5, paddingHorizontal:6, paddingVertical:2 },
  snoMiniTxt: { color:'#FFF', fontSize:9, fontWeight:'700' },
  infoRow: { flexDirection:'row', alignItems:'center', gap:5, marginTop:2 },
  infoTxt: { fontSize:11, color:C.sub, flex:1 },
  divider: { height:1, backgroundColor:C.border, marginVertical:6 },
  footRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-end' },
  footLabel: { fontSize:10, color:C.muted, marginBottom:3 },
  wallet: { fontSize:14, fontWeight:'700', color:C.green },
});

// ─────────────────────────── LIST HEADER ─────────────────────────────────────
const ListHeader = ({ isTablet }: { isTablet: boolean }) => (
  <View style={LV.hrow}>
    <Text style={[LV.hcell, LV.cSno]}>S. No</Text>
    <Text style={[LV.hcell, LV.cId]}>Seller ID</Text>
    <Text style={[LV.hcell, { flex:2 }]}>Seller</Text>
    {!isTablet && <Text style={[LV.hcell, { flex:2 }]}>Business</Text>}
    <Text style={[LV.hcell, LV.cStatus]}>Status</Text>
    <Text style={[LV.hcell, LV.cKyc]}>KYC</Text>
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
  const init = seller.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  const rowBg = even ? '#FFF' : '#FFF8F2';

  const Actions = () => (
    <View style={{ flexDirection:'row', gap:5 }}>
      <TouchableOpacity style={[LV.actBtn, { backgroundColor:C.navy }]} onPress={onView}>
        <IconEye size={13} color="#FFF" />
      </TouchableOpacity>
      <TouchableOpacity style={[LV.actBtn, { backgroundColor:C.amber }]} onPress={onToggleStatus}>
        <IconEyeSlash size={13} color="#FFF" />
      </TouchableOpacity>
      <TouchableOpacity style={[LV.actBtn, { backgroundColor:C.red }]} onPress={onDelete}>
        <IconTrash size={13} color="#FFF" />
      </TouchableOpacity>
    </View>
  );

  if (isMobile) {
    return (
      <View style={[LV.mrow, { backgroundColor: rowBg }]}>
        <View style={[LV.avatar, { backgroundColor: C.primary }]}>
          <Text style={LV.avTxt}>{init}</Text>
        </View>
        <View style={{ flex:1, marginLeft:10 }}>
          <Text style={LV.selName}>{seller.name}</Text>
          <IdBadge id={seller.id} />
          <Text style={LV.selEmail} numberOfLines={1}>{seller.business}</Text>
        </View>
        <View style={{ alignItems:'flex-end', gap:4 }}>
          {seller.status === 'Active' ? <ActiveBadge /> : <InactiveBadge />}
          <Text style={{ fontSize:13, fontWeight:'700', color:C.green }}>{seller.wallet}</Text>
          <Actions />
        </View>
      </View>
    );
  }

  return (
    <View style={[LV.row, { backgroundColor: rowBg }]}>
      <Text style={[LV.cell, LV.cSno]}>{seller.serialNo}</Text>
      <View style={LV.cId}><IdBadge id={seller.id} /></View>
      <View style={{ flex:2, flexDirection:'row', alignItems:'center', gap:8, paddingRight:8, minWidth:0 }}>
        <View style={[LV.avatar, { backgroundColor: C.primary }]}>
          <Text style={LV.avTxt}>{init}</Text>
        </View>
        <View style={{ flex:1, minWidth:0 }}>
          <Text style={LV.selName} numberOfLines={1}>{seller.name}</Text>
          <Text style={LV.selEmail} numberOfLines={1}>{seller.email}</Text>
        </View>
      </View>
      {!isTablet && (
        <View style={{ flex:2, paddingRight:8 }}>
          <Text style={LV.bizName} numberOfLines={1}>{seller.business}</Text>
          <Text style={LV.sain} numberOfLines={1}>{seller.sain}</Text>
        </View>
      )}
      <View style={LV.cStatus}>
        {seller.status === 'Active' ? <ActiveBadge /> : <InactiveBadge />}
      </View>
      <View style={LV.cKyc}><KycBadge kyc={seller.kyc} /></View>
      {!isTablet && <View style={LV.cProd}><ProductBadge status={seller.products.status} count={seller.products.count} /></View>}
      <Text style={[LV.cell, LV.cWallet]}>{seller.wallet}</Text>
      {!isTablet && <Text style={[LV.cell, LV.cDate]}>{seller.registered}</Text>}
      <View style={LV.cAction}><Actions /></View>
    </View>
  );
};

const LV = StyleSheet.create({
  hrow:  { flexDirection:'row', alignItems:'center', paddingVertical:12, paddingHorizontal:16, backgroundColor:'#FFF5EC', borderBottomWidth:2, borderBottomColor:C.border },
  hcell: { fontSize:11, fontWeight:'700', color:C.sub, textTransform:'uppercase', paddingRight:8 },
  row:   { flexDirection:'row', alignItems:'center', paddingVertical:13, paddingHorizontal:16, borderBottomWidth:1, borderBottomColor:C.border },
  mrow:  { flexDirection:'row', alignItems:'center', padding:12, borderBottomWidth:1, borderBottomColor:C.border },
  cell:  { fontSize:13, color:C.sub, paddingRight:8 },
  cSno:  { width:44, textAlign:'center', fontWeight:'600' },
  cId:   { width:172, paddingRight:8 },
  cStatus:{ width:76 },
  cKyc:  { width:115 },
  cProd: { width:120 },
  cWallet:{ width:76, textAlign:'right', fontWeight:'700', color:C.green },
  cDate: { width:110, fontSize:11 },
  cAction:{ width:108, marginLeft:'auto' },
  avatar:{ width:34, height:34, borderRadius:17, justifyContent:'center', alignItems:'center', flexShrink:0 },
  avTxt: { color:'#FFF', fontWeight:'700', fontSize:12 },
  selName:{ fontSize:13, fontWeight:'700', color:C.text },
  selEmail:{ fontSize:11, color:C.muted, marginTop:1 },
  bizName:{ fontSize:12, fontWeight:'600', color:C.text },
  sain:  { fontSize:10, color:C.muted, marginTop:1 },
  actBtn:{ width:30, height:30, borderRadius:6, justifyContent:'center', alignItems:'center' },
});

// ─────────────────────────── PAGINATION ──────────────────────────────────────
const Pagination = ({
  current, total, onChange,
}: { current:number; total:number; onChange:(p:number)=>void }) => {
  const pages: (number|'...')[] = [];
  if (total <= 7) {
    for (let i=1; i<=total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push('...');
    for (let i=Math.max(2,current-1); i<=Math.min(total-1,current+1); i++) pages.push(i);
    if (current < total-2) pages.push('...');
    pages.push(total);
  }
  return (
    <View style={PG.wrap}>
      <TouchableOpacity style={[PG.btn, current===1 && PG.dis]} disabled={current===1} onPress={()=>onChange(current-1)}>
        <IconChevLeft size={13} color={current===1 ? C.muted : C.sub} />
      </TouchableOpacity>
      {pages.map((p,i) => p==='...'
        ? <Text key={`e${i}`} style={PG.ellipsis}>…</Text>
        : <TouchableOpacity key={p} style={[PG.btn, p===current && PG.active]} onPress={()=>onChange(p as number)}>
            <Text style={[PG.btnTxt, p===current && PG.activeTxt]}>{p}</Text>
          </TouchableOpacity>
      )}
      <TouchableOpacity style={[PG.btn, current===total && PG.dis]} disabled={current===total} onPress={()=>onChange(current+1)}>
        <IconChevRight size={13} color={current===total ? C.muted : C.sub} />
      </TouchableOpacity>
    </View>
  );
};
const PG = StyleSheet.create({
  wrap:     { flexDirection:'row', alignItems:'center', gap:5 },
  btn:      { minWidth:34, height:34, borderRadius:7, backgroundColor:C.card, borderWidth:1, borderColor:C.border, justifyContent:'center', alignItems:'center', paddingHorizontal:5 },
  active:   { backgroundColor:C.primary, borderColor:C.primary },
  dis:      { opacity:0.4 },
  btnTxt:   { fontSize:13, color:C.sub, fontWeight:'600' },
  activeTxt:{ color:'#FFF' },
  ellipsis: { fontSize:13, color:C.muted, paddingHorizontal:4 },
});

// ─────────────────────────── MAIN SCREEN ─────────────────────────────────────
export default function SellersScreen() {
  const { width } = useWindowDimensions();
  const screen   = getScreen(width);
  const isMobile = screen === 'xs';
  const isTablet = screen === 'sm';
  const numCols  = getCols(width);
  const ipp      = getPerPage(width);

  const GUTTER = isMobile ? 10 : isTablet ? 14 : 18;
  const HPAD   = isMobile ? 12 : isTablet ? 16 : 24;

  const [sellers, setSellers]       = useState<Seller[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [loadError, setLoadError]   = useState<string | null>(null);
  const [viewMode, setViewMode]     = useState<'grid'|'list'>('grid');
  const [search, setSearch]         = useState('');
  const [searchQ, setSearchQ]       = useState('');
  const [page, setPage]             = useState(1);
  const [viewSeller, setViewSeller] = useState<Seller|null>(null);

  const loadSellers = useCallback(async () => {
    try {
      setLoadError(null);
      const res = await fetchSellers({ status: 'active', search: searchQ || undefined, page: page - 1, size: ipp });
      const items = (res.items ?? []).map((s, i) => ({
        ...mapSellerListRow(s, (page - 1) * ipp + i),
      }));
      setSellers(items);
      setTotalElements(res.totalElements ?? items.length);
    } catch (e) {
      setLoadError(getApiErrorMessage(e));
    }
  }, [ipp, page, searchQ]);

  useEffect(() => { void loadSellers(); }, [loadSellers]);
  const [confirmModal, setConfirmModal] = useState<{
    visible:boolean; title:string; message:string;
    confirmLabel:string; confirmColor:string; onConfirm:()=>void;
  }>({ visible:false, title:'', message:'', confirmLabel:'', confirmColor:'', onConfirm:()=>{} });

  const totalPages = Math.max(1, Math.ceil(totalElements / ipp));
  const safePage   = Math.min(page, totalPages);
  const paginated  = sellers;

  const handleSearch = useCallback((v: string) => { setSearch(v); setSearchQ(v); setPage(1); }, []);

  const doView = (s: Seller) => router.push({ pathname: '/Viewseller', params: { sellerId: String(s.numericId) } });

  const doToggle = (s: Seller) => {
    setConfirmModal({
      visible: true,
      title: s.status==='Active' ? 'Deactivate Seller' : 'Activate Seller',
      message: `Are you sure you want to ${s.status==='Active'?'deactivate':'activate'} "${s.name}"?`,
      confirmLabel: s.status==='Active' ? 'Deactivate' : 'Activate',
      confirmColor: s.status==='Active' ? C.amber : C.green,
      onConfirm: () => {
        void (async () => {
          try {
            if (s.status === 'Active') await blockSeller(s.numericId);
            else await unblockSeller(s.numericId);
            setConfirmModal(m => ({ ...m, visible:false }));
            void loadSellers();
          } catch (e) {
            setLoadError(getApiErrorMessage(e));
            setConfirmModal(m => ({ ...m, visible:false }));
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
            setConfirmModal(m => ({ ...m, visible:false }));
            void loadSellers();
          } catch (e) {
            setLoadError(getApiErrorMessage(e));
            setConfirmModal(m => ({ ...m, visible:false }));
          }
        })();
      },
    });
  };

  const cardW = (width - HPAD*2 - GUTTER*(numCols-1)) / numCols;
  const gridRows: Seller[][] = [];
  for (let i=0; i<paginated.length; i+=numCols) gridRows.push(paginated.slice(i, i+numCols));

  return (
    <View style={SS.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1d324e" />

      {/* Dark blue top bar */}
      <View style={SS.topBar}>
        <TouchableOpacity style={SS.backButton} onPress={() => router.back()}>
          <IconChevLeft size={16} color="#FFF" />
          <Text style={SS.backButtonText}>Back</Text>
        </TouchableOpacity>
        <View style={[SS.logoBox, { marginLeft: 10 }]}><IconPerson size={22} color="#FFF" /></View>
      </View>

      {/* Title bar */}
      <View style={SS.titleBar}>
        <View style={SS.breadcrumb}>
          <Text style={SS.bcLink}>🏠 Dashboard</Text>
          <Text style={SS.bcSep}> › </Text>
          <Text style={SS.bcLink}>Ecommerce</Text>
          <Text style={SS.bcSep}> › </Text>
          <Text style={SS.bcCur}>Active Sellers</Text>
        </View>
        {loadError ? (
          <Text style={{ color: C.red, marginBottom: 8 }}>{loadError}</Text>
        ) : null}
        <View style={[SS.titleRow, isMobile && { flexWrap:'wrap', gap:8 }]}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:10, flex:1 }}>
            <Text style={[SS.pageTitle, isMobile && { fontSize:18 }]}>Active Sellers</Text>
            <View style={SS.pill}><Text style={SS.pillTxt}>Active Only</Text></View>
          </View>
          <TouchableOpacity style={SS.exportBtn} onPress={() => router.push('/sellershiprocket')}>
            <IconUpload size={13} color="#FFF" />
            <Text style={SS.exportTxt}>  Export to Shiprocket</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Toolbar */}
      <View style={[SS.toolbar, isMobile && { flexDirection:'column', gap:10 }]}>
        <View style={[SS.searchBox, isMobile && { width:'100%', maxWidth:99999 }]}>
          <IconSearch size={16} color={C.muted} />
          <TextInput
            style={SS.searchInput}
            placeholder="Search by name, business, email, mobile..."
            placeholderTextColor={C.muted}
            value={search}
            onChangeText={handleSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')} style={SS.clearBtn}>
              <Text style={{ fontSize:14, color:C.muted }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={SS.viewToggle}>
          <Text style={SS.viewLabel}>View:</Text>
          <TouchableOpacity
            style={[SS.vBtn, viewMode==='grid' && SS.vBtnOn]}
            onPress={() => setViewMode('grid')}>
            <IconGrid size={17} color={viewMode==='grid' ? '#FFF' : C.sub} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[SS.vBtn, viewMode==='list' && SS.vBtnOn]}
            onPress={() => setViewMode('list')}>
            <IconList size={17} color={viewMode==='list' ? '#FFF' : C.sub} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex:1 }}
        contentContainerStyle={[SS.content, viewMode==='list' && { paddingHorizontal:0 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {viewMode === 'grid' ? (
          paginated.length === 0 ? (
            <View style={SS.empty}><Text style={SS.emptyTxt}>{`No sellers found for "${search}"`}</Text></View>
          ) : (
            gridRows.map((row, ri) => (
              <View key={ri} style={{ flexDirection:'row', gap:GUTTER }}>
                {row.map(s => (
                  <GridCard
                    key={s.id} seller={s} cardWidth={cardW}
                    onView={() => doView(s)}
                    onToggleStatus={() => doToggle(s)}
                    onDelete={() => doDelete(s)}
                  />
                ))}
                {row.length < numCols && Array.from({ length: numCols-row.length }).map((_,ei) => (
                  <View key={`ph${ei}`} style={{ width:cardW }} />
                ))}
              </View>
            ))
          )
        ) : (
          <View style={[SS.listBox, isMobile && { marginHorizontal:0, borderRadius:0 }]}>
            {paginated.length === 0
              ? <View style={SS.empty}><Text style={SS.emptyTxt}>{`No sellers found for "${search}"`}</Text></View>
              : paginated.map((s, idx) => (
                  <ListRow
                    key={s.id} seller={s} even={idx%2===0}
                    isTablet={isTablet} isMobile={isMobile}
                    onView={() => doView(s)}
                    onToggleStatus={() => doToggle(s)}
                    onDelete={() => doDelete(s)}
                  />
                ))
            }
          </View>
        )}

        {/* Footer */}
        {totalElements > 0 && (
          <View style={[SS.footer, isMobile && { flexDirection:'column', alignItems:'flex-start' }]}>
            <Text style={SS.footTxt}>
              Showing {(safePage-1)*ipp + 1}–{Math.min(safePage*ipp, totalElements)} of {totalElements} sellers
            </Text>
            <Pagination current={safePage} total={totalPages} onChange={setPage} />
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <ViewModal seller={viewSeller} onClose={() => setViewSeller(null)} />
      <ConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        confirmColor={confirmModal.confirmColor}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(m => ({ ...m, visible:false }))}
      />
    </View>
  );
}

// ─────────────────────────── ROOT STYLES ─────────────────────────────────────
const SS = StyleSheet.create({
  root:       { flex:1, backgroundColor:C.bg },
  topBar:     { height:56, backgroundColor:'#1d324e', flexDirection:'row', alignItems:'center', paddingHorizontal:16 },
  logoBox:    { width:40, height:40, borderRadius:8, backgroundColor:'rgba(255,255,255,0.2)', justifyContent:'center', alignItems:'center' },
  backButton: { flexDirection:'row', alignItems:'center', marginRight:10 },
  backButtonText: { color:'#FFF', fontSize:14, fontWeight:'600', marginLeft:4 },
  titleBar:   { backgroundColor:C.card, paddingHorizontal:20, paddingTop:14, paddingBottom:14, borderBottomWidth:1, borderBottomColor:C.border },
  breadcrumb: { flexDirection:'row', alignItems:'center', marginBottom:10 },
  bcLink:     { fontSize:12, color:C.primary, fontWeight:'500' },
  bcSep:      { fontSize:12, color:C.muted, marginHorizontal:2 },
  bcCur:      { fontSize:12, color:C.sub },
  titleRow:   { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  pageTitle:  { fontSize:22, fontWeight:'800', color:C.text },
  pill:       { backgroundColor:C.primaryLight, borderWidth:1.5, borderColor:C.primary, borderRadius:20, paddingHorizontal:10, paddingVertical:3 },
  pillTxt:    { fontSize:11, color:C.primary, fontWeight:'700' },
  exportBtn:  { backgroundColor:C.primary, paddingHorizontal:14, paddingVertical:9, borderRadius:8, flexDirection:'row', alignItems:'center' },
  exportTxt:  { color:'#FFF', fontSize:13, fontWeight:'700' },
  toolbar:    { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:20, paddingVertical:14, backgroundColor:C.card, borderBottomWidth:1, borderBottomColor:C.border },
  searchBox:  { flex:1, maxWidth:700, flexDirection:'row', alignItems:'center', backgroundColor:C.bg, borderWidth:1, borderColor:C.border, borderRadius:8, paddingHorizontal:12, height:42 },
  searchInput:{ flex:1, fontSize:14, color:C.text, height:42, marginLeft:8 },
  clearBtn:   { padding:4 },
  viewToggle: { flexDirection:'row', alignItems:'center', gap:6, marginLeft:14 },
  viewLabel:  { fontSize:13, color:C.sub, fontWeight:'500', marginRight:2 },
  vBtn:       { width:36, height:36, borderRadius:7, backgroundColor:C.bg, borderWidth:1, borderColor:C.border, justifyContent:'center', alignItems:'center' },
  vBtnOn:     { backgroundColor:C.primary, borderColor:C.primary },
  content:    { paddingVertical:20, paddingBottom:50 },
  listBox:    { backgroundColor:C.card, marginHorizontal:20, borderRadius:12, overflow:'hidden', shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.06, shadowRadius:10, elevation:3 },
  footer:     { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:20, paddingTop:20, gap:12, flexWrap:'wrap' },
  footTxt:    { fontSize:13, color:C.sub },
  empty:      { padding:40, alignItems:'center' },
  emptyTxt:   { fontSize:14, color:C.muted, textAlign:'center' },
});