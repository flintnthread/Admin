/**
 * ViewPendingSeller.tsx
 * ─────────────────────────────────────────────────────────────────
 * Full seller profile page – no sidebar, no top navbar
 * Fully responsive: Mobile / Tablet / Laptop / Desktop
 * Bootstrap Icons via 'bootstrap-icons' font family
 * ─────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useMemo, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api/client';
import { fetchPendingProfileDetail } from '@/services/sellerApi';
import {
    Dimensions,
    Image,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  orange:       '#E07B20',
  orangeLight:  '#FFF3E0',
  orangeBorder: '#F5A855',
  navy:         '#1B2A4A',
  navyLight:    '#243356',
  dark:         '#1A1A1A',
  mid:          '#4A4A4A',
  light:        '#888',
  border:       '#E4E8EF',
  bg:           '#F2F3F6',
  white:        '#FFFFFF',
  cream:        '#FFF8F2',
  red:          '#EF4444',
  yellow:       '#F59E0B',
  green:        '#10B981',
  blue:         '#3B82F6',
  blueSoft:     '#EFF6FF',
};

// ─── Bootstrap Icons ──────────────────────────────────────────────────────────
const BI_MAP: Record<string, string> = {
  'geo-alt-fill':      '\uF390',
  'arrow-left':        '\uF12A',
  'person-fill':       '\uF4E0',
  'envelope-fill':     '\uF32F',
  'telephone-fill':    '\uF5F4',
  'calendar3':         '\uF214',
  'shop':              '\uF541',
  'building':          '\uF1D7',
  'bank':              '\uF14E',
  'geo':               '\uF38C',
  'shield-check':      '\uF54E',
  'camera-fill':       '\uF225',
  'file-earmark':      '\uF339',
  'image':             '\uF3D1',
  'eye':               '\uF332',
  'check-circle-fill': '\uF269',
  'x-circle-fill':     '\uF659',
  'clock-fill':        '\uF293',
  'house-fill':        '\uF425',
  'chevron-right':     '\uF285',
  'person-badge':      '\uF4DB',
  'card-list':         '\uF231',
  'hash':              '\uF3A7',
  'tag-fill':          '\uF5C8',
  'wallet2':           '\uF618',
  'box-seam':          '\uF1C9',
  'x-lg':              '\uF659',
};

type BIProps = { name: string; size?: number; color?: string; style?: object };
const BI = ({ name, size = 15, color = C.mid, style }: BIProps) => (
  <Text
    style={[{ fontFamily: 'bootstrap-icons', fontSize: size, color, lineHeight: size + 4 }, style]}
    accessible={false}
  >
    {BI_MAP[name] ?? ''}
  </Text>
);

// ─── Breakpoints ──────────────────────────────────────────────────────────────
const BP = { mobile: 480, tablet: 768, laptop: 1024 };
type Device = 'mobile' | 'tablet' | 'laptop' | 'desktop';
const getDevice = (w: number): Device =>
  w < BP.mobile ? 'mobile' : w < BP.tablet ? 'tablet' : w < BP.laptop ? 'laptop' : 'desktop';

// ─── Seller prop type (fields passed from PendingSellers list) ────────────────
export type SellerProp = {
  id: number;
  name: string;
  businessName: string;
  email: string;
  mobile: string;
  submittedOn: string;
};

const EMPTY_SELLER = {
  id: 0,
  firstName: '',
  lastName: '',
  email: '',
  mobile: '',
  registeredOn: '',
  businessName: '',
  sellerCategory: '',
  businessType: '',
  address: '',
  gst: 'No',
  panNumber: '',
  bankName: '',
  branchName: '',
  accountNumber: '',
  ifscCode: '',
  accountHolder: '',
  warehouseAddress: '',
  country: '',
  state: '',
  city: '',
  area: '',
  pincode: '',
  profileImage: null as string | null,
  documents: [] as { name: string; url?: string }[],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const shadow = (depth: number = 3) => Platform.select({
  ios:     { shadowColor: '#000', shadowOpacity: 0.06 * depth, shadowRadius: depth * 3, shadowOffset: { width: 0, height: depth } },
  android: { elevation: depth },
  default: {},
}) as object;

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
type Props = { onBack?: () => void; seller?: SellerProp };

export default function ViewPendingSeller({ onBack, seller: sellerProp }: Props) {
  const [dim, setDim] = useState(Dimensions.get('window'));
  const [docModal, setDocModal] = useState<{ visible: boolean; label: string; url?: string }>({ visible: false, label: '' });
  const [sellerState, setSellerState] = useState(EMPTY_SELLER);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window: w }) => setDim(w));
    return () => sub?.remove();
  }, []);

  useEffect(() => {
    const sellerId = sellerProp?.id;
    if (!sellerId) return;
    void (async () => {
      try {
        setLoadError(null);
        const d = await fetchPendingProfileDetail(sellerId);
        setSellerState({
          id: Number(d.sellerId ?? sellerId),
          firstName: String(d.firstName ?? sellerProp?.name.split(' ')[0] ?? ''),
          lastName: String(d.lastName ?? sellerProp?.name.split(' ').slice(1).join(' ') ?? ''),
          email: String(d.email ?? sellerProp?.email ?? ''),
          mobile: String(d.mobile ?? sellerProp?.mobile ?? ''),
          registeredOn: String(d.registeredOn ?? sellerProp?.submittedOn ?? ''),
          businessName: String(d.businessName ?? sellerProp?.businessName ?? ''),
          sellerCategory: String(d.sellerCategory ?? '').toUpperCase(),
          businessType: String(d.businessType ?? '—'),
          address: String(d.address ?? '—'),
          gst: d.hasGst ? String(d.gstNumber ?? 'Yes') : 'No',
          panNumber: String(d.panNumber ?? '—'),
          bankName: String(d.bankName ?? '—'),
          branchName: String(d.branchName ?? '—'),
          accountNumber: String(d.accountNumber ?? '—'),
          ifscCode: String(d.ifscCode ?? '—'),
          accountHolder: String(d.accountHolder ?? '—'),
          warehouseAddress: String(d.warehouseAddress ?? '—'),
          country: String(d.warehouseCountry ?? d.country ?? '—'),
          state: String(d.warehouseState ?? d.state ?? '—'),
          city: String(d.warehouseCity ?? d.city ?? '—'),
          area: String(d.warehouseArea ?? '—'),
          pincode: String(d.pincode ?? '—'),
          profileImage: (d.profilePicUrl as string) || null,
          documents: Array.isArray(d.documents) ? d.documents as { name: string; url?: string }[] : [],
        });
      } catch (e) {
        setLoadError(getApiErrorMessage(e));
      }
    })();
  }, [sellerProp]);

  const SELLER = sellerState;

  const { width } = dim;
  const device   = getDevice(width);
  const isMobile = device === 'mobile';
  const isTablet = device === 'tablet';
  const isBig    = device === 'laptop' || device === 'desktop';

  const pad = isMobile ? 12 : isTablet ? 16 : 24;

  // ── Section wrapper ───────────────────────────────────────────────────────
  const Section = ({ children, style }: { children: React.ReactNode; style?: object }) => (
    <View style={[sc.section, style]}>{children}</View>
  );

  // ── Section header bar ────────────────────────────────────────────────────
  const SectionBar = ({ icon, title }: { icon: string; title: string }) => (
    <View style={sc.sectionBar}>
      <BI name={icon} size={15} color={C.white} style={{ marginRight: 8 }} />
      <Text style={sc.sectionBarTitle}>{title}</Text>
    </View>
  );

  // ── Label + Value row ─────────────────────────────────────────────────────
  const Field = ({
    label, value, badge, badgeColor,
  }: {
    label: string; value: string; badge?: boolean; badgeColor?: string;
  }) => (
    <View style={[sc.field, isMobile && { width: '100%' }]}>
      <Text style={sc.fieldLabel}>{label}</Text>
      {badge ? (
        <View style={[sc.badge, { backgroundColor: (badgeColor ?? C.orange) + '20', borderColor: badgeColor ?? C.orange }]}>
          <Text style={[sc.badgeText, { color: badgeColor ?? C.orange }]}>{value}</Text>
        </View>
      ) : (
        <Text style={sc.fieldValue}>{value || '—'}</Text>
      )}
    </View>
  );

  // ── Two-column field row ──────────────────────────────────────────────────
  const FieldRow = ({ left, right }: { left: React.ReactNode; right?: React.ReactNode }) => (
    <View style={[sc.fieldRow, isMobile && { flexDirection: 'column' }]}>
      <View style={[sc.fieldCol, isMobile && { width: '100%' }]}>{left}</View>
      {right && <View style={[sc.fieldCol, isMobile && { width: '100%' }]}>{right}</View>}
    </View>
  );

  // ── Verification doc row ──────────────────────────────────────────────────
  const DocRow = ({ label, onView }: { label: string; onView?: () => void }) => (
    <View style={sc.docRow}>
      <View style={sc.docLeft}>
        <BI name="file-earmark" size={14} color={C.orange} style={{ marginRight: 8 }} />
        <Text style={sc.docLabel}>{label}</Text>
      </View>
      {onView ? (
        <TouchableOpacity style={sc.docViewBtn} onPress={onView}>
          <BI name="eye" size={12} color={C.white} style={{ marginRight: 4 }} />
          <Text style={sc.docViewBtnT}>View</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  // ── Image thumbnail placeholder ───────────────────────────────────────────
  const ImgThumb = () => (
    <View style={sc2.imgThumb}>
      <BI name="image" size={22} color={C.light} />
    </View>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={g.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.orange} />
      <ScrollView
        style={g.flex}
        contentContainerStyle={[g.scroll, { padding: pad }]}
      >
        <View style={[g.page, isBig && g.pageWide]}>

          {loadError ? (
            <View style={{ marginBottom: 12, padding: 12, backgroundColor: '#FEE2E2', borderRadius: 8 }}>
              <Text style={{ color: '#B91C1C' }}>{loadError}</Text>
            </View>
          ) : null}

          {/* ════════════════════════════════════════════════
              HERO BANNER
          ════════════════════════════════════════════════ */}
          <View style={hero.banner}>
            {/* Back button */}
            {onBack && (
              <TouchableOpacity style={hero.backBtn} onPress={onBack}>
                <BI name="arrow-left" size={16} color={C.dark} />
              </TouchableOpacity>
            )}

            {/* Decorative circles */}
            <View style={[hero.circle, { width: 180, height: 180, right: 60,  top: -50, opacity: 0.12 }]} />
            <View style={[hero.circle, { width: 110, height: 110, right: -10, top: 20,  opacity: 0.09 }]} />
            <View style={[hero.circle, { width: 70,  height: 70,  right: 220, top: 30,  opacity: 0.07 }]} />

            {/* Avatar */}
            <View style={hero.avatarWrap}>
              {SELLER.profileImage
                ? <Image source={{ uri: SELLER.profileImage }} style={hero.avatar} />
                : (
                  <View style={hero.avatarFallback}>
                    <BI name="person-fill" size={30} color={C.orange} />
                  </View>
                )}
            </View>

            {/* Name block */}
            <View style={hero.info}>
              <Text style={[hero.name, isMobile && { fontSize: 18 }]}>{SELLER.firstName} {SELLER.lastName}</Text>
              <View style={hero.metaRow}>
                <BI name="envelope-fill" size={11} color="rgba(255,255,255,0.75)" style={{ marginRight: 4 }} />
                <Text style={hero.metaTxt}>{SELLER.email}</Text>
              </View>
              <View style={hero.metaRow}>
                <BI name="calendar3" size={11} color="rgba(255,255,255,0.75)" style={{ marginRight: 4 }} />
                <Text style={hero.metaTxt}>Joined {SELLER.registeredOn}</Text>
                <BI name="shop" size={11} color="rgba(255,255,255,0.75)" style={{ marginLeft: 12, marginRight: 4 }} />
                <Text style={hero.metaTxt}>{SELLER.businessName}</Text>
              </View>
            </View>

            {/* Status chip + back-to-sellers */}
            <View style={hero.actions}>
              <View style={hero.statusChip}>
                <BI name="clock-fill" size={12} color={C.orange} style={{ marginRight: 4 }} />
                <Text style={hero.statusChipTxt}>Pending</Text>
                <Text style={hero.statusSub}> · Verification Review</Text>
              </View>
              {onBack && (
                <TouchableOpacity style={hero.backToBtn} onPress={onBack}>
                  <BI name="arrow-left" size={12} color={C.mid} style={{ marginRight: 4 }} />
                  <Text style={hero.backToBtnTxt}>Back to Sellers</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ════════════════════════════════════════════════
              MAIN CONTENT: left (seller info) + right (profile/docs)
          ════════════════════════════════════════════════ */}
          <View style={[g.cols, isMobile && { flexDirection: 'column' }, isTablet && { flexDirection: 'column' }]}>

            {/* ── LEFT COLUMN ── */}
            <View style={[g.colMain, (isMobile || isTablet) && { width: '100%' }]}>

              {/* Seller Information */}
              <Section>
                <SectionBar icon="person-badge" title="Seller Information" />
                <View style={sc.body}>

                  {/* Personal + Business header */}
                  <View style={[sc.subHeaderRow, isMobile && { flexDirection: 'column', gap: 4 }]}>
                    <View style={sc.subHeader}>
                      <BI name="person-fill" size={13} color={C.orange} style={{ marginRight: 6 }} />
                      <Text style={sc.subHeaderTxt}>Personal Details</Text>
                    </View>
                    <View style={sc.subHeader}>
                      <BI name="shop" size={13} color={C.orange} style={{ marginRight: 6 }} />
                      <Text style={sc.subHeaderTxt}>Business Details</Text>
                    </View>
                  </View>

                  <FieldRow
                    left={<Field label="First Name" value={SELLER.firstName} />}
                    right={<Field label="Business Name" value={SELLER.businessName} />}
                  />
                  <FieldRow
                    left={<Field label="Last Name" value={SELLER.lastName} />}
                    right={<Field label="Seller Category" value={SELLER.sellerCategory} badge badgeColor={C.blue} />}
                  />
                  <FieldRow
                    left={<Field label="Email" value={SELLER.email} />}
                    right={<Field label="Business Type" value={SELLER.businessType} />}
                  />
                  <FieldRow
                    left={<Field label="Mobile" value={SELLER.mobile} />}
                    right={<Field label="Address" value={SELLER.address} />}
                  />
                  <FieldRow
                    left={<Field label="Registered On" value={SELLER.registeredOn} />}
                    right={<Field label="GST" value={SELLER.gst} />}
                  />
                  <FieldRow
                    left={<View />}
                    right={<Field label="PAN Number" value={SELLER.panNumber} />}
                  />
                </View>
              </Section>

              {/* Bank Details */}
              <Section style={{ marginTop: 16 }}>
                <SectionBar icon="bank" title="Bank Details" />
                <View style={sc.body}>
                  <FieldRow
                    left={<Field label="Bank Name" value={SELLER.bankName} />}
                    right={<Field label="Country" value={SELLER.country} />}
                  />
                  <FieldRow
                    left={<Field label="Branch Name" value={SELLER.branchName} />}
                    right={<Field label="State" value={SELLER.state} />}
                  />
                  <FieldRow
                    left={<Field label="Account Number" value={SELLER.accountNumber} />}
                    right={<Field label="City" value={SELLER.city} />}
                  />
                  <FieldRow
                    left={<Field label="IFSC Code" value={SELLER.ifscCode} />}
                    right={<Field label="Area" value={SELLER.area} />}
                  />
                  <FieldRow
                    left={<Field label="Account Holder" value={SELLER.accountHolder} />}
                    right={<Field label="Pincode" value={SELLER.pincode} />}
                  />
                </View>
              </Section>

              {/* Warehouse Details */}
              <Section style={{ marginTop: 16 }}>
                <SectionBar icon="box-seam" title="Warehouse Details" />
                <View style={sc.body}>
                  <FieldRow
                    left={<Field label="Warehouse Address" value={SELLER.warehouseAddress} />}
                    right={<Field label="State" value={SELLER.state} />}
                  />
                  <FieldRow
                    left={<Field label="Country" value={SELLER.country} />}
                    right={<Field label="City" value={SELLER.city} />}
                  />
                  <FieldRow
                    left={<View />}
                    right={<Field label="Area" value={SELLER.area} />}
                  />
                </View>
              </Section>
            </View>

            {/* ── RIGHT COLUMN ── */}
            <View style={[g.colSide, (isMobile || isTablet) && { width: '100%' }]}>

              {/* Profile Picture */}
              <Section>
                <View style={pp.header}>
                  <BI name="person-fill" size={14} color={C.mid} style={{ marginRight: 6 }} />
                  <Text style={pp.headerTxt}>Profile Picture</Text>
                </View>
                <View style={pp.body}>
                  <View style={pp.picWrap}>
                    {SELLER.profileImage
                      ? <Image source={{ uri: SELLER.profileImage }} style={pp.pic} />
                      : (
                        <View style={pp.picFallback}>
                          <BI name="person-fill" size={48} color={C.border} />
                        </View>
                      )}
                  </View>
                </View>
              </Section>

              {/* Verification Documents */}
              <Section style={{ marginTop: 16 }}>
                <View style={vd.header}>
                  <BI name="card-list" size={14} color={C.mid} style={{ marginRight: 6 }} />
                  <Text style={vd.headerTxt}>Verification Documents</Text>
                </View>
                <View style={vd.body}>
                  {(SELLER.documents.length > 0 ? SELLER.documents : [{ name: 'No documents uploaded' }]).map((doc) => (
                    <DocRow
                      key={doc.name}
                      label={doc.name}
                      onView={doc.url ? () => setDocModal({ visible: true, label: doc.name, url: doc.url }) : undefined}
                    />
                  ))}
                </View>
              </Section>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ════════════════════════════════════════════════
          DOCUMENT VIEW MODAL
      ════════════════════════════════════════════════ */}
      <Modal
        visible={docModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setDocModal({ visible: false, label: '' })}
      >
        <TouchableWithoutFeedback onPress={() => setDocModal({ visible: false, label: '' })}>
          <View style={mod.overlay}>
            <TouchableWithoutFeedback>
              <View style={mod.card}>
                {/* Modal header */}
                <View style={mod.header}>
                  <View style={mod.headerLeft}>
                    <BI name="file-earmark" size={15} color={C.orange} style={{ marginRight: 8 }} />
                    <Text style={mod.headerTitle}>{docModal.label}</Text>
                  </View>
                  {/* Bootstrap close icon — x-lg */}
                  <TouchableOpacity
                    style={mod.closeBtn}
                    onPress={() => setDocModal({ visible: false, label: '' })}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <BI name="x-lg" size={16} color={C.mid} />
                  </TouchableOpacity>
                </View>

                {/* Modal body — placeholder document preview */}
                <View style={mod.body}>
                  {docModal.url ? (
                    <Image source={{ uri: docModal.url }} style={{ width: '100%', height: 320, resizeMode: 'contain' }} />
                  ) : (
                    <View style={mod.previewBox}>
                      <BI name="file-earmark" size={48} color={C.border} style={{ marginBottom: 12 }} />
                      <Text style={mod.previewTitle}>{docModal.label}</Text>
                      <Text style={mod.previewSub}>Document preview not available</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Shadows ──────────────────────────────────────────────────────────────────
const sh = Platform.select({
  ios:     { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } },
  android: { elevation: 3 },
  default: {},
}) as object;

// ═════════════════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════════════════

// ── Global ────────────────────────────────────────────────────────────────────
const g = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: C.bg },
  flex:     { flex: 1 },
  scroll:   { flexGrow: 1 },
  page:     { width: '100%' },
  pageWide: { maxWidth: 1280, alignSelf: 'center', width: '100%' },
  cols:     { flexDirection: 'row', gap: 16, marginTop: 16, alignItems: 'flex-start' },
  colMain:  { flex: 2 },
  colSide:  { width: 300 },
});

// ── Hero banner ───────────────────────────────────────────────────────────────
const hero = StyleSheet.create({
  banner: {
    backgroundColor: C.orange,
    borderRadius: 16,
    overflow: 'hidden',
    padding: 20,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 16,
    minHeight: 110,
  },
  circle: { position: 'absolute', backgroundColor: C.white, borderRadius: 999 },
  backBtn: {
    position: 'absolute', top: 14, left: 14, zIndex: 20,
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: C.white, justifyContent: 'center', alignItems: 'center', ...sh,
  },
  avatarWrap: {
    width: 64, height: 64, borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)',
    marginTop: 6,
    ...sh,
  },
  avatar:         { width: '100%', height: '100%' },
  avatarFallback: { flex: 1, backgroundColor: C.white, justifyContent: 'center', alignItems: 'center' },
  info:    { flex: 1, minWidth: 180 },
  name:    { fontSize: 22, fontWeight: '800', color: C.white, marginBottom: 5, letterSpacing: -0.3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3, flexWrap: 'wrap' },
  metaTxt: { fontSize: 12, color: 'rgba(255,255,255,0.85)', flexShrink: 1 },
  actions: { alignItems: 'flex-end', gap: 8, justifyContent: 'flex-start', marginLeft: 'auto' as any },
  statusChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.white, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  statusChipTxt: { fontSize: 12, fontWeight: '700', color: C.orange },
  statusSub:     { fontSize: 11, color: C.light },
  backToBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  backToBtnTxt: { fontSize: 12, color: C.white, fontWeight: '600' },
});

// ── Section shells ────────────────────────────────────────────────────────────
const sc = StyleSheet.create({
  section: {
    backgroundColor: C.white, borderRadius: 12, overflow: 'hidden', ...sh,
  },
  sectionBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.navy, paddingHorizontal: 16, paddingVertical: 13,
  },
  sectionBarTitle: { fontSize: 14, fontWeight: '700', color: C.white, letterSpacing: 0.2 },
  body:            { paddingHorizontal: 16, paddingVertical: 14 },
  subHeaderRow: {
    flexDirection: 'row', gap: 0,
    marginBottom: 10,
    borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 8,
  },
  subHeader:    { flex: 1, flexDirection: 'row', alignItems: 'center' },
  subHeaderTxt: { fontSize: 13, fontWeight: '700', color: C.dark },
  fieldRow:     { flexDirection: 'row', gap: 12, marginBottom: 10 },
  fieldCol:     { flex: 1 },
  field:        { width: '100%' },
  fieldLabel:   { fontSize: 11, color: C.light, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  fieldValue:   { fontSize: 13, color: C.dark, fontWeight: '500' },
  badge: {
    alignSelf: 'flex-start', borderRadius: 6,
    paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  docRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  docLeft:    { flexDirection: 'row', alignItems: 'center', flex: 1 },
  docLabel:   { fontSize: 13, color: C.mid, flexShrink: 1 },
  docViewBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.dark, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5 },
  docViewBtnT:{ color: C.white, fontSize: 12, fontWeight: '600' },
});

// ── Profile picture card ──────────────────────────────────────────────────────
const pp = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: C.cream,
  },
  headerTxt: { fontSize: 13, fontWeight: '700', color: C.dark },
  body:      { padding: 16, alignItems: 'center' },
  picWrap:   { width: 120, height: 120, borderRadius: 60, overflow: 'hidden', borderWidth: 3, borderColor: C.orangeLight, ...sh },
  pic:       { width: '100%', height: '100%' },
  picFallback:{ width: '100%', height: '100%', backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
});

// ── Verification documents card ───────────────────────────────────────────────
const vd = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: C.cream,
  },
  headerTxt:  { fontSize: 13, fontWeight: '700', color: C.dark },
  body:       { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14 },
  subHeading: { fontSize: 12, fontWeight: '700', color: C.dark, marginTop: 14, marginBottom: 8 },
  thumbRow:   { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});

// ── Image thumbnail ────────────────────────────────────────────────────────────
const sc2 = StyleSheet.create({
  imgThumb: {
    width: 60, height: 60, borderRadius: 8,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    justifyContent: 'center', alignItems: 'center',
  },
});
const ImgThumb = () => (
  <View style={sc2.imgThumb}>
    <BI name="image" size={20} color={C.light} />
  </View>
);

// ── Document view modal ───────────────────────────────────────────────────────
const mod = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: C.white,
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 12 },
      default: {},
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.cream,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.dark,
    flexShrink: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: C.bg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    marginLeft: 12,
  },
  body: {
    padding: 24,
    minHeight: 260,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewBox: {
    width: '100%',
    paddingVertical: 36,
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: 'dashed',
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.dark,
    marginBottom: 6,
  },
  previewSub: {
    fontSize: 13,
    color: C.light,
  },
});