/**
 * PendingSellers.tsx
 * ─────────────────────────────────────────────────────────────────
 * • No sidebar, no top navbar, no right-side panel on desktop
 * • Table is 100% full-width on all breakpoints
 * • "View" on any device → navigates to ViewPendingSeller component
 * • Back button returns to list
 * • Bootstrap Icons via bi font (load 'bootstrap-icons' TTF in your app)
 * ─────────────────────────────────────────────────────────────────
 */

import { getApiErrorMessage } from '@/lib/api/client';
import { mapPendingProfileRow } from '@/lib/mappers';
import { fetchPendingProfileSellers } from '@/services/sellerApi';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import ViewPendingSeller, { SellerProp } from '@/components/ViewPendingSeller';

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  orange:      '#E07B20',
  orangeLight: '#FFF3E0',
  blue:        '#3B82F6',
  dark:        '#1A1A1A',
  mid:         '#555',
  light:       '#999',
  border:      '#E8D9C8',
  cream:       '#FFF8F2',
  tableHead:   '#FDF0E4',
  rowAlt:      '#FFFAF5',
  bg:          '#F2F3F5',
  white:       '#FFFFFF',
};

// ─── Bootstrap Icons ──────────────────────────────────────────────────────────
const BI_MAP: Record<string, string> = {
  'geo-alt-fill':       '\uF390',
  'house-fill':         '\uF425',
  'search':             '\uF52A',
  'clock-history':      '\uF292',
  'eye':                '\uF332',
  'arrow-left':         '\uF12A',
  'chevron-left':       '\uF284',
  'chevron-right':      '\uF285',
  'person-badge':       '\uF4DB',
  'shop':               '\uF541',
  'envelope-fill':      '\uF32F',
  'telephone-fill':     '\uF5F4',
  'calendar3':          '\uF214',
  'hash':               '\uF3A7',
  'funnel':             '\uF38B',
};

type BIProps = { name: string; size?: number; color?: string; style?: object };
const BI = ({ name, size = 16, color = C.mid, style }: BIProps) => (
  <Text
    style={[{ fontFamily: 'bootstrap-icons', fontSize: size, color, lineHeight: size + 4 }, style]}
    accessible={false}
  >
    {BI_MAP[name] ?? '•'}
  </Text>
);

// ─── Data ─────────────────────────────────────────────────────────────────────
type Seller = {
  id: number;
  name: string;
  businessName: string;
  email: string;
  mobile: string;
  submittedOn: string;
};

// ─── Breakpoints ──────────────────────────────────────────────────────────────
const BP = { mobile: 480, tablet: 768, laptop: 1024 };
type Device = 'mobile' | 'tablet' | 'laptop' | 'desktop';
const getDevice = (w: number): Device =>
  w < BP.mobile ? 'mobile' : w < BP.tablet ? 'tablet' : w < BP.laptop ? 'laptop' : 'desktop';

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function Pendingsellers() {
  const [dim, setDim]                       = useState(Dimensions.get('window'));
  const [search, setSearch]                 = useState('');
  const [sellers, setSellers]               = useState<Seller[]>([]);
  const [loadError, setLoadError]           = useState<string | null>(null);
  const [detailSeller, setDetailSeller]     = useState<SellerProp | null>(null);

  const loadPending = useCallback(async () => {
    try {
      setLoadError(null);
      const rows = await fetchPendingProfileSellers();
      setSellers(rows.map(mapPendingProfileRow));
    } catch (e) {
      setLoadError(getApiErrorMessage(e));
    }
  }, []);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window: w }) => setDim(w));
    return () => sub?.remove();
  }, []);

  useEffect(() => { void loadPending(); }, [loadPending]);

  const { width } = dim;
  const device   = getDevice(width);
  const isMobile = device === 'mobile';
  const isTablet = device === 'tablet';
  const isBig    = device === 'laptop' || device === 'desktop';

  const filtered = sellers.filter(s =>
    [s.name, s.businessName, s.email].some(v =>
      v.toLowerCase().includes(search.toLowerCase())
    )
  );

  // ── Navigate to ViewPendingSeller (all devices) ───────────────────────────
  if (detailSeller) {
    return (
      <ViewPendingSeller
        seller={detailSeller}
        onBack={() => setDetailSeller(null)}
      />
    );
  }

  // ── List page ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.orange} />
      <ScrollView
        style={st.flex}
        contentContainerStyle={[
          st.scrollContent,
          isMobile && { padding: 12 },
          isTablet && { padding: 16 },
          isBig    && { padding: 24, maxWidth: 1200, alignSelf: 'center', width: '100%' },
        ]}
      >
        {/* ── Page card ── */}
        <View style={st.card}>
          {/* Banner */}
          <Banner />

          <View style={[st.cardBody, isMobile && { paddingHorizontal: 14, paddingTop: 28 }]}>
            {/* Header */}
            <View style={st.headerRow}>
              <View>
                <Text style={[st.pageTitle, isMobile && { fontSize: 19 }]}>Pending Sellers</Text>
                <View style={st.breadcrumb}>
                  <BI name="house-fill" size={11} color={C.orange} />
                  <Text style={st.bcLink}> Dashboard</Text>
                  <Text style={st.bcSep}> › </Text>
                  <Text style={st.bcCur}>Pending Sellers</Text>
                </View>
              </View>
              <View style={st.badge}>
                <BI name="clock-history" size={12} color={C.orange} />
                <Text style={st.badgeTxt}>  {filtered.length} Pending</Text>
              </View>
            </View>

            {loadError ? <Text style={{ color: C.orange, marginBottom: 10 }}>{loadError}</Text> : null}

            {/* Search */}
            <View style={st.searchBox}>
              <TextInput
                style={st.searchInput}
                placeholder="Search pending sellers..."
                placeholderTextColor={C.light}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            {/* Table / Cards */}
            {isMobile
              ? filtered.map((s, i) => (
                  <MobileCard key={s.id} seller={s} index={i} onView={() => setDetailSeller(s)} />
                ))
              : (
                <View style={st.tableWrap}>
                  {/* Table header */}
                  <View style={st.tHead}>
                    <Text style={[st.hT, { width: 70 }]}>ID</Text>
                    <Text style={[st.hT, { flex: 1 }]}>Name</Text>
                    <Text style={[st.hT, { flex: 1 }]}>Business Name</Text>
                    {isBig && <Text style={[st.hT, { flex: 1.4 }]}>Email</Text>}
                    <Text style={[st.hT, { width: 140 }]}>Mobile</Text>
                    {isBig && <Text style={[st.hT, { width: 118 }]}>Submitted On</Text>}
                    <Text style={[st.hT, { width: 90, textAlign: 'center' }]}>Actions</Text>
                  </View>

                  {/* Table rows */}
                  {filtered.map((s, i) => (
                    <View key={s.id} style={[st.tRow, i % 2 !== 0 && { backgroundColor: C.rowAlt }]}>
                      {/* ID */}
                      <View style={{ width: 70, justifyContent: 'center' }}>
                        <View style={st.idPill}><Text style={st.idPillT}>{s.id}</Text></View>
                      </View>
                      {/* Name */}
                      <Text style={[st.cT, { flex: 1 }]}>{s.name}</Text>
                      {/* Business */}
                      <Text style={[st.cT, { flex: 1 }]}>{s.businessName}</Text>
                      {/* Email – desktop only */}
                      {isBig && (
                        <Text style={[st.cT, { flex: 1.4 }]} numberOfLines={1}>{s.email}</Text>
                      )}
                      {/* Mobile */}
                      <Text style={[st.cT, { width: 140 }]}>{s.mobile}</Text>
                      {/* Date – desktop only */}
                      {isBig && (
                        <Text style={[st.cT, { width: 118 }]}>{s.submittedOn}</Text>
                      )}
                      {/* Action */}
                      <View style={{ width: 90, alignItems: 'center' }}>
                        <TouchableOpacity style={st.viewBtn} onPress={() => setDetailSeller(s)}>
                          <BI name="eye" size={12} color={C.white} style={{ marginRight: 4 }} />
                          <Text style={st.viewBtnT}>View</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}

            {/* Pagination */}
            <View style={st.pgRow}>
              <Text style={st.pgInfo}>Showing 1 – {filtered.length} of {filtered.length} pending sellers</Text>
              <View style={st.pgBtns}>
                <TouchableOpacity style={st.pgBtn}>
                  <BI name="chevron-left" size={13} color={C.mid} />
                </TouchableOpacity>
                <View style={st.pgActive}><Text style={st.pgActiveT}>1</Text></View>
                <TouchableOpacity style={st.pgBtn}>
                  <BI name="chevron-right" size={13} color={C.mid} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MOBILE CARD
// ═════════════════════════════════════════════════════════════════════════════
function MobileCard({
  seller,
  index,
  onView,
}: {
  seller: Seller;
  index: number;
  onView: () => void;
}) {
  return (
    <View style={[mc.card, index % 2 !== 0 && { backgroundColor: C.cream }]}>
      <View style={mc.top}>
        <View style={mc.left}>
          <View style={mc.idPill}><Text style={mc.idPillT}>#{seller.id}</Text></View>
          <Text style={mc.name}>{seller.name}</Text>
        </View>
        <TouchableOpacity style={mc.btn} onPress={onView}>
          <BI name="eye" size={13} color={C.white} style={{ marginRight: 4 }} />
          <Text style={mc.btnT}>View</Text>
        </TouchableOpacity>
      </View>
      <View style={mc.row}>
        <BI name="shop" size={12} color={C.orange} style={{ marginRight: 6 }} />
        <Text style={mc.sub}>{seller.businessName}</Text>
      </View>
      <View style={mc.row}>
        <BI name="envelope-fill" size={12} color={C.light} style={{ marginRight: 6 }} />
        <Text style={mc.meta} numberOfLines={1}>{seller.email}</Text>
      </View>
      <View style={mc.row}>
        <BI name="telephone-fill" size={12} color={C.light} style={{ marginRight: 6 }} />
        <Text style={mc.meta}>{seller.mobile}</Text>
        <BI name="calendar3" size={12} color={C.light} style={{ marginLeft: 14, marginRight: 4 }} />
        <Text style={mc.meta}>{seller.submittedOn}</Text>
      </View>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// BANNER
// ═════════════════════════════════════════════════════════════════════════════
function Banner() {
  return (
    <View style={st.banner}>
      <View style={st.logoBox}>
        <BI name="geo-alt-fill" size={22} color={C.orange} />
      </View>
      <View style={[st.circle, { width: 140, height: 140, right: 90,  top: -30, opacity: 0.14 }]} />
      <View style={[st.circle, { width: 85,  height: 85,  right: 20,  top: 10,  opacity: 0.10 }]} />
      <View style={[st.circle, { width: 55,  height: 55,  right: 200, top: 18,  opacity: 0.08 }]} />
    </View>
  );
}

// ─── Shadows helper ───────────────────────────────────────────────────────────
const shadow = Platform.select({
  ios:     { shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 2 } },
  android: { elevation: 3 },
  default: {},
}) as object;

// ═════════════════════════════════════════════════════════════════════════════
// STYLES – LIST PAGE
// ═════════════════════════════════════════════════════════════════════════════
const st = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: C.bg },
  flex:         { flex: 1 },
  scrollContent:{ flexGrow: 1, padding: 20 },

  // Card shell
  card: { backgroundColor: C.white, borderRadius: 16, overflow: 'hidden', ...shadow },
  cardBody: { paddingHorizontal: 22, paddingTop: 32, paddingBottom: 22 },

  // Banner
  banner: {
    height: 108, backgroundColor: C.orange,
    borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden',
  },
  logoBox: {
    width: 52, height: 52, backgroundColor: C.white, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    position: 'absolute', bottom: -22, left: 22, zIndex: 10, ...shadow,
  },
  circle: { position: 'absolute', backgroundColor: C.white, borderRadius: 999 },

  // Header
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 8,
  },
  pageTitle:  { fontSize: 22, fontWeight: '800', color: C.dark, letterSpacing: -0.3, marginBottom: 4 },
  breadcrumb: { flexDirection: 'row', alignItems: 'center' },
  bcLink:     { fontSize: 12, color: C.orange, fontWeight: '600' },
  bcSep:      { fontSize: 12, color: C.light },
  bcCur:      { fontSize: 12, color: C.mid },
  badge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.orangeLight, borderColor: C.orange, borderWidth: 1.5,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  badgeTxt: { color: C.orange, fontWeight: '700', fontSize: 13 },

  // Search
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: C.orange, borderRadius: 10,
    paddingHorizontal: 14, height: 46, marginBottom: 18, backgroundColor: C.white,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.dark },

  // Table
  tableWrap: { borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: C.border, width: '100%' },
  tHead: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.tableHead, paddingVertical: 13, paddingHorizontal: 10,
  },
  hT: { fontWeight: '700', fontSize: 13, color: C.dark, paddingHorizontal: 4 },
  tRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 10,
    borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.white,
  },
  cT:      { fontSize: 13, color: C.mid, paddingHorizontal: 4 },
  idPill:  { backgroundColor: C.blue, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  idPillT: { color: C.white, fontSize: 12, fontWeight: '700' },
  viewBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.dark, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 6,
  },
  viewBtnT: { color: C.white, fontSize: 12, fontWeight: '600' },

  // Pagination
  pgRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, flexWrap: 'wrap', gap: 8 },
  pgInfo:   { fontSize: 12, color: C.light },
  pgBtns:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pgBtn:    { width: 32, height: 32, borderRadius: 7, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  pgActive: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.orange, justifyContent: 'center', alignItems: 'center' },
  pgActiveT:{ color: C.white, fontWeight: '700', fontSize: 14 },
});

// ═════════════════════════════════════════════════════════════════════════════
// STYLES – MOBILE CARD
// ═════════════════════════════════════════════════════════════════════════════
const mc = StyleSheet.create({
  card: {
    backgroundColor: C.white, borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: C.border,
  },
  top:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 },
  left:   { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  name:   { fontSize: 15, fontWeight: '700', color: C.dark, flexShrink: 1 },
  row:    { flexDirection: 'row', alignItems: 'center', marginTop: 5, flexWrap: 'wrap' },
  sub:    { fontSize: 13, color: C.orange, fontWeight: '500' },
  meta:   { fontSize: 12, color: C.light, flexShrink: 1 },
  btn:    { flexDirection: 'row', alignItems: 'center', backgroundColor: C.dark, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 6 },
  btnT:   { color: C.white, fontSize: 12, fontWeight: '600' },
  idPill: { backgroundColor: C.blue, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  idPillT:{ color: C.white, fontSize: 12, fontWeight: '700' },
});