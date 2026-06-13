import React, { useEffect, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api/client';
import { mapContactToCustomerTicket } from '@/lib/mappers';
import { fetchContact, replyContact, updateContactStatus } from '@/services/contactApi';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AdminLayout from '@/components/admin-layout';
import Svg, { Path, Circle, Polyline, Line } from 'react-native-svg';

// ─── SVG Icons ──────────────────────────────────────────────────────────────

const BackArrowIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M12.5 15L7.5 10L12.5 5"
      stroke="#FFFFFF"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const TicketInfoIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"
      stroke="#1E3A5F"
      strokeWidth={1.8}
    />
  </Svg>
);

const CustomerIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
      stroke="#1E3A5F"
      strokeWidth={1.8}
      strokeLinecap="round"
    />
    <Circle cx="12" cy="7" r="4" stroke="#1E3A5F" strokeWidth={1.8} />
  </Svg>
);

const SubjectIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
      stroke="#1E3A5F"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ReplyIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Polyline
      points="9 17 4 12 9 7"
      stroke="#1E3A5F"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M20 18v-2a4 4 0 0 0-4-4H4"
      stroke="#1E3A5F"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ExternalLinkIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Path
      d="M6 2H2a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V8"
      stroke="#3B82F6"
      strokeWidth={1.5}
      strokeLinecap="round"
    />
    <Path
      d="M8 1h5v5M13 1L7 7"
      stroke="#3B82F6"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ChevronDownIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="M4 6L8 10L12 6"
      stroke="#6B7280"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const SendIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
      stroke="#FFFFFF"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const InfoDotIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Circle cx="7" cy="7" r="6" stroke="#F97316" strokeWidth={1.4} />
    <Path d="M7 6.5V10" stroke="#F97316" strokeWidth={1.4} strokeLinecap="round" />
    <Circle cx="7" cy="4.5" r="0.75" fill="#F97316" />
  </Svg>
);

// ─── Badge Components ─────────────────────────────────────────────────────────

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  'Open': { bg: '#DCFCE7', text: '#16A34A', dot: '#16A34A' },
  'In Progress': { bg: '#FEF9C3', text: '#CA8A04', dot: '#CA8A04' },
  'Closed': { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF' },
};

const typeColors: Record<string, { bg: string; text: string }> = {
  'Delivery Issue': { bg: '#EFF6FF', text: '#3B82F6' },
  'Product Issue': { bg: '#FFF7ED', text: '#EA580C' },
  'Payment Issue': { bg: '#FDF4FF', text: '#A21CAF' },
  'Other': { bg: '#F0FDF4', text: '#16A34A' },
};

const StatusBadge = ({ status }: { status: string }) => {
  const c = statusColors[status] || statusColors['Open'];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: c.dot }]} />
      <Text style={[styles.badgeText, { color: c.text }]}>{status}</Text>
    </View>
  );
};

const TypeBadge = ({ type }: { type: string }) => {
  const c = typeColors[type] || typeColors['Other'];
  return (
    <View style={[styles.typeBadge, { backgroundColor: c.bg }]}>
      <Text style={[styles.typeBadgeText, { color: c.text }]}>{type}</Text>
    </View>
  );
};

// ─── Card Component ───────────────────────────────────────────────────────────

interface CardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

const Card = ({ icon, title, children }: CardProps) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={styles.cardIconWrap}>{icon}</View>
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
    <View style={styles.cardBody}>{children}</View>
  </View>
);

// ─── Info Row ─────────────────────────────────────────────────────────────────

const InfoRow = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <View style={styles.infoValue}>{children}</View>
  </View>
);

// ─── Status Dropdown ──────────────────────────────────────────────────────────

const STATUS_UPDATE_OPTIONS = ['In Progress', 'Closed'];

const StatusDropdown = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.dropdownWrapper}>
      <TouchableOpacity
        style={styles.dropdownTrigger}
        onPress={() => setOpen(!open)}
      >
        <Text style={styles.dropdownValue}>{value}</Text>
        <ChevronDownIcon />
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdownMenu}>
          {STATUS_UPDATE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[
                styles.dropdownItem,
                value === opt && styles.dropdownItemActive,
              ]}
              onPress={() => {
                onChange(opt);
                setOpen(false);
              }}
            >
              <Text
                style={[
                  styles.dropdownItemText,
                  value === opt && styles.dropdownItemTextActive,
                ]}
              >
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CustomerSupportTicketDetails() {
  const router = useRouter();
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const { width } = useWindowDimensions();
  const isWeb = width >= 768;

  const [ticket, setTicket] = useState<ReturnType<typeof mapContactToCustomerTicket> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [response, setResponse] = useState('');
  const [updateStatus, setUpdateStatus] = useState('In Progress');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const id = Number(ticketId);
    if (!id || Number.isNaN(id)) return;
    void (async () => {
      try {
        setLoadError(null);
        const detail = await fetchContact(id);
        const mapped = mapContactToCustomerTicket(detail);
        setTicket(mapped);
        setUpdateStatus(mapped.status === 'Closed' ? 'Closed' : 'In Progress');
      } catch (e) {
        setLoadError(getApiErrorMessage(e));
      }
    })();
  }, [ticketId]);

  const handleSubmit = async () => {
    if (!response.trim()) {
      Alert.alert('Required', 'Please enter a response before submitting.');
      return;
    }
    const id = Number(ticketId);
    if (!id || Number.isNaN(id)) return;
    setSubmitting(true);
    try {
      await replyContact(id, response.trim());
      if (updateStatus === 'Closed') {
        await updateContactStatus(id, true);
      }
      const detail = await fetchContact(id);
      setTicket(mapContactToCustomerTicket(detail));
      setResponse('');
      Alert.alert('Success', 'Response submitted and status updated.');
    } catch (e) {
      Alert.alert('Error', getApiErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewCustomer = () => {
    router.push('/customerDetails');
  };

  return (
    <AdminLayout>
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.rootContent, isWeb && styles.rootContentWeb]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.push('/Customersupport')}
          >
            <BackArrowIcon />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Ticket #{ticketId || '—'}</Text>
            <Text style={styles.headerSubtitle}>Support ticket details</Text>
          </View>
        </View>

        {loadError ? (
          <Text style={{ color: '#DC2626', marginBottom: 12 }}>{loadError}</Text>
        ) : null}

        <View style={[styles.grid, isWeb && styles.gridWeb]}>

          <View style={[styles.col, isWeb && styles.colLeft]}>

            <Card icon={<TicketInfoIcon />} title="Ticket Information">
              <InfoRow label="Status">
                <StatusBadge status={ticket?.status ?? 'Open'} />
              </InfoRow>
              <View style={styles.divider} />
              <InfoRow label="Type">
                <TypeBadge type={ticket?.type ?? 'Other'} />
              </InfoRow>
              <View style={styles.divider} />
              <InfoRow label="Created">
                <Text style={styles.infoText}>{ticket?.created ?? '—'}</Text>
              </InfoRow>
              <View style={styles.divider} />
              <InfoRow label="Related Order">
                <Text style={[styles.infoText, styles.orderLink]}>
                  {ticket?.order ?? '—'}
                </Text>
              </InfoRow>
            </Card>

            <Card icon={<CustomerIcon />} title="Customer Information">
              <InfoRow label="Name">
                <Text style={styles.infoText}>{ticket?.customer ?? '—'}</Text>
              </InfoRow>
              <View style={styles.divider} />
              <InfoRow label="Email">
                <Text style={[styles.infoText, styles.emailText]} numberOfLines={1}>
                  {ticket?.email ?? '—'}
                </Text>
              </InfoRow>
              <View style={styles.divider} />
              <View style={styles.viewCustomerRow}>
                <TouchableOpacity
                  style={styles.viewCustomerBtn}
                  onPress={handleViewCustomer}
                >
                  <ExternalLinkIcon />
                  <Text style={styles.viewCustomerBtnText}>View Customer Profile</Text>
                </TouchableOpacity>
              </View>
            </Card>
          </View>

          {/* Right Column */}
          <View style={[styles.col, isWeb && styles.colRight]}>

            {/* CARD 3 — Message */}
            <Card icon={<SubjectIcon />} title="Customer Message">
              <View style={styles.messageSubjectBox}>
                <Text style={styles.messageSubject}>
                  {ticket?.subject ?? '—'}
                </Text>
              </View>
              <View style={styles.messageMeta}>
                <View style={styles.messageAvatar}>
                  <Text style={styles.messageAvatarText}>
                    {(ticket?.customer ?? 'C').slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={styles.messageAuthor}>{ticket?.customer ?? '—'}</Text>
                  <Text style={styles.messageDate}>{ticket?.created ?? '—'}</Text>
                </View>
              </View>
              <Text style={styles.messageBody}>
                {ticket?.message ?? '—'}
              </Text>
              {ticket?.adminNotes ? (
                <Text style={[styles.messageBody, { marginTop: 12, color: '#6B7280' }]}>
                  Admin notes: {ticket.adminNotes}
                </Text>
              ) : null}
            </Card>

            {/* CARD 4 — Add Response */}
            <Card icon={<ReplyIcon />} title="Add Response">
              {/* Response Input */}
              <Text style={styles.fieldLabel}>Your Response</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Type your response to the customer here..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={5}
                value={response}
                onChangeText={setResponse}
                textAlignVertical="top"
              />

              {/* Update Status */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Update Status</Text>
              <StatusDropdown value={updateStatus} onChange={setUpdateStatus} />

              {/* Note */}
              <View style={styles.noteRow}>
                <InfoDotIcon />
                <Text style={styles.noteText}>
                  Status will be updated when you submit your response.
                </Text>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                <SendIcon />
                <Text style={styles.submitBtnText}>
                  {submitting ? 'Submitting...' : 'Submit Response'}
                </Text>
              </TouchableOpacity>
            </Card>

          </View>
        </View>
      </ScrollView>
    </AdminLayout>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  rootContent: {
    padding: 20,
    paddingBottom: 48,
  },
  rootContentWeb: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
    backgroundColor: '#1E3A5F',
    padding: 15,
    borderRadius: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    gap: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
  },

  // Grid
  grid: {
    gap: 16,
  },
  gridWeb: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  col: {
    gap: 16,
  },
  colLeft: {
    width: 340,
    flexShrink: 0,
  },
  colRight: {
    flex: 1,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EBF0F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  cardBody: {
    padding: 18,
  },

  // Info Rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    minHeight: 36,
  },
  infoLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    width: 110,
    flexShrink: 0,
  },
  infoValue: {
    flex: 1,
    alignItems: 'flex-end',
  },
  infoText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
    textAlign: 'right',
  },
  orderLink: {
    color: '#3B82F6',
  },
  emailText: {
    color: '#374151',
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 4,
  },

  // View Customer Button
  viewCustomerRow: {
    marginTop: 8,
  },
  viewCustomerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  viewCustomerBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },

  // Message Card
  messageSubjectBox: {
    backgroundColor: '#F8F9FB',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#1E3A5F',
  },
  messageSubject: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 20,
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  messageAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E3A5F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  messageAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  messageDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  messageBody: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
  },

  // Response Form
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    fontSize: 14,
    color: '#111827',
    minHeight: 130,
    outlineStyle: 'none',
  } as any,

  // Dropdown
  dropdownWrapper: {
    position: 'relative',
    zIndex: 10,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 999,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemActive: {
    backgroundColor: '#EBF0F8',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#374151',
  },
  dropdownItemTextActive: {
    color: '#1E3A5F',
    fontWeight: '600',
  },

  // Note
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 14,
  },
  noteText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
    lineHeight: 17,
  },

  // Submit Button
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E3A5F',
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 16,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Badges
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  typeBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
});