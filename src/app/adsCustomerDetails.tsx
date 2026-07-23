import AdminLayout from '@/components/admin-layout';
import { getApiErrorMessage } from '@/lib/api/client';
import { formatRupee } from '@/lib/format';
import {
  fetchAdsCustomer,
  fetchAdsOrders,
  formatAdsDate,
  type AdsApiRow,
} from '@/services/adsApi';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

const COLORS = {
  headerBg: '#151D4F',
  teal: '#0D9488',
  tealDark: '#0F766E',
  slate: '#1E293B',
  sub: '#64748B',
  border: '#E2E8F0',
  bg: '#F1F5F9',
  card: '#FFFFFF',
  chip: '#ECFEFF',
  chipText: '#0E7490',
  amber: '#F59E0B',
};

type CustomerDetail = {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  joined: string;
  updated: string;
  orderCount: number;
};

function mapCustomer(raw: AdsApiRow): CustomerDetail {
  return {
    id: Number(raw.id ?? 0),
    name: String(raw.name ?? '—'),
    email: String(raw.email ?? '—'),
    phone: String(raw.phone ?? '—'),
    company: String(raw.company ?? 'N/A'),
    address: String(raw.address ?? '—'),
    city: String(raw.city ?? '—'),
    state: String(raw.state ?? '—'),
    pincode: String(raw.pincode ?? '—'),
    joined: formatAdsDate(raw.createdAt),
    updated: formatAdsDate(raw.updatedAt),
    orderCount: Number(raw.orderCount ?? 0) || 0,
  };
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

export default function AdsCustomerDetailsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isPhone = width < 768;

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [orders, setOrders] = useState<AdsApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const customerId = Number(id);
    if (!id || Number.isNaN(customerId)) {
      setError('Invalid customer id.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const detail = await fetchAdsCustomer(customerId);
      const mapped = mapCustomer(detail);
      setCustomer(mapped);

      const orderPage = await fetchAdsOrders({
        userId: customerId,
        page: 0,
        size: 1000,
      });
      setOrders(orderPage.items ?? []);
    } catch (e) {
      setError(getApiErrorMessage(e, 'Failed to load customer details.'));
      setCustomer(null);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const openOrder = (row: AdsApiRow) => {
    const internalId = Number(row.id ?? 0);
    const orderCode = String(row.orderId ?? '');
    if (internalId > 0) {
      router.push({ pathname: '/order-details' as any, params: { id: String(internalId) } });
      return;
    }
    if (orderCode) {
      router.push({ pathname: '/order-details' as any, params: { orderId: orderCode } });
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <View style={styles.stateBox}>
          <ActivityIndicator size="large" color={COLORS.teal} />
          <Text style={styles.stateText}>Loading customer…</Text>
        </View>
      </AdminLayout>
    );
  }

  if (error || !customer) {
    return (
      <AdminLayout>
        <View style={styles.stateBox}>
          <Text style={styles.errorText}>{error ?? 'Customer not found'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => (error ? void load() : router.back())}>
            <Text style={styles.retryBtnText}>{error ? 'Retry' : 'Go Back'}</Text>
          </TouchableOpacity>
        </View>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 28 }}>
        <View style={[styles.header, isPhone && { paddingHorizontal: 12, paddingVertical: 14 }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{customer.name}</Text>
            <Text style={styles.headerSubtitle}>Customer #{customer.id}</Text>
          </View>
          <View style={styles.orderChip}>
            <Text style={styles.orderChipText}>{customer.orderCount} Orders</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact Information</Text>
          <InfoRow label="Email" value={customer.email} />
          <InfoRow label="Phone" value={customer.phone} />
          <InfoRow label="Company" value={customer.company} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Address</Text>
          <InfoRow label="Street" value={customer.address} />
          <InfoRow label="City" value={customer.city} />
          <InfoRow label="State" value={customer.state} />
          <InfoRow label="Pincode" value={customer.pincode} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>
          <InfoRow label="Joined" value={customer.joined} />
          <InfoRow label="Last Updated" value={customer.updated} />
        </View>

        <View style={styles.card}>
          <View style={styles.ordersHeader}>
            <Text style={styles.cardTitle}>Orders</Text>
            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => router.push({
                pathname: '/order-details' as any,
                params: { customerEmail: customer.email, customerName: customer.name },
              })}
            >
              <Text style={styles.viewAllBtnText}>View All</Text>
            </TouchableOpacity>
          </View>

          {orders.length === 0 ? (
            <Text style={styles.emptyOrders}>No orders found for this customer.</Text>
          ) : (
            orders.map((row) => {
              const orderId = String(row.orderId ?? row.id ?? '—');
              const status = String(row.status ?? '—');
              const amount = formatRupee(Number(row.amount ?? 0));
              return (
                <TouchableOpacity key={String(row.id ?? orderId)} style={styles.orderRow} onPress={() => openOrder(row)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderId}>{orderId}</Text>
                    <Text style={styles.orderMeta}>{formatAdsDate(row.createdAt)} · {status}</Text>
                  </View>
                  <Text style={styles.orderAmount}>{amount}</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.sub} />
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  stateBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  stateText: { color: COLORS.sub, fontSize: 14 },
  errorText: { color: '#DC2626', fontSize: 14, textAlign: 'center' },
  retryBtn: { backgroundColor: COLORS.headerBg, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: '#fff', fontWeight: '700' },

  header: {
    backgroundColor: COLORS.headerBg,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSubtitle: { color: '#A0A0C0', fontSize: 12, marginTop: 2 },
  orderChip: { backgroundColor: COLORS.chip, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  orderChipText: { color: COLORS.chipText, fontWeight: '700', fontSize: 12 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.slate, marginBottom: 12 },
  infoRow: { marginBottom: 10 },
  infoLabel: { fontSize: 11, color: COLORS.sub, fontWeight: '600', marginBottom: 2, textTransform: 'uppercase' },
  infoValue: { fontSize: 14, color: COLORS.slate, fontWeight: '500' },

  ordersHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  viewAllBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#1d324e' },
  viewAllBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  emptyOrders: { color: COLORS.sub, fontSize: 13, paddingVertical: 8 },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  orderId: { fontSize: 14, fontWeight: '700', color: COLORS.slate },
  orderMeta: { fontSize: 12, color: COLORS.sub, marginTop: 2 },
  orderAmount: { fontSize: 13, fontWeight: '700', color: COLORS.tealDark },
});
