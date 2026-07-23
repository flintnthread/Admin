/**
 * JobApplicationsScreen.jsx
 * React Native â€” works on iOS, Android, and React Native Web
 *
 * Dependencies (add to your project if not present):
 *   npm install @react-navigation/native  (optional â€“ for breadcrumb nav)
 *   All other imports are from react-native core.
 */

import AdminLayout from '@/components/admin-layout';
import Pagination from '@/components/Pagination';
import { getApiErrorMessage } from '@/lib/api/client';
import { formatDate, initialsFromName } from '@/lib/format';
import { sweetError } from '@/lib/sweetAlert';
import { fetchJobApplications, fetchJobs, updateJobApplicationStatus } from '@/services/hrApi';
import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';

// â”€â”€â”€ Palette â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const C = {
  bg: '#F4F6FB',
  card: '#FFFFFF',
  primary: '#5B4EFF',
  pending: '#F97316',
  reviewed: '#06B6D4',
  shortlisted: '#10B981',
  interviewed: '#8B5CF6',
  rejected: '#EF4444',
  total: '#5B4EFF',
  text: '#1E1B4B',
  sub: '#6B7280',
  border: '#E5E7EB',
  tag: '#EEF2FF',
  tagText: '#4338CA',
  white: '#FFFFFF',
};

// â”€â”€â”€ Feather Icons mapping â”€â”€â”€â”€â”€â”€â”€â”€
const BI_MAP: Record<string, any> = {
  "file-earmark-text": "file-text",
  "hourglass-split": "clock",
  "eye": "eye",
  "star-fill": "star",
  "mic-fill": "mic",
  "x-circle-fill": "x-circle",
  "x-lg": "x",
  "search": "search",
  "arrow-counterclockwise": "rotate-ccw",
  "chevron-down": "chevron-down",
  "chevron-up": "chevron-up",
  "building": "briefcase",
  "geo-alt-fill": "map-pin",
  "envelope-fill": "mail",
  "inbox": "inbox",
};

type BIName = keyof typeof BI_MAP | string;

const BI: React.FC<{ name: BIName; size?: number; color?: string; style?: object }> = ({
  name,
  size = 15,
  color = C.sub,
  style,
}) => (
  <Feather
    name={BI_MAP[name] ?? "circle"}
    size={size}
    color={color}
    style={style}
  />
);

const AVATAR_COLORS = ['#5B4EFF', '#8B5CF6', '#06B6D4', '#F97316', '#EF4444', '#10B981', '#F59E0B', '#EC4899'];

function mapApplication(a: import('@/lib/api/types').JobApplication, index: number) {
  const statusRaw = String(a.status ?? 'pending').toLowerCase();
  const status =
    statusRaw === 'reviewed' ? 'Reviewed' :
    statusRaw === 'shortlisted' ? 'Shortlisted' :
    statusRaw === 'interviewed' ? 'Interviewed' :
    statusRaw === 'rejected' ? 'Rejected' :
    statusRaw === 'hired' ? 'Hired' :
    'Pending';
  const expYears = a.experienceYears != null ? Number(a.experienceYears) : null;
  return {
    id: String(a.id ?? index),
    jobId: a.jobId,
    name: a.name ?? 'Applicant',
    email: a.email ?? 'â€”',
    phone: a.phone ?? 'â€”',
    role: a.jobTitle ?? (a.jobId != null ? `Job #${a.jobId}` : 'â€”'),
    department: a.departmentName ?? 'â€”',
    applied: formatDate(a.appliedAt),
    avatar: initialsFromName(a.name),
    avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
    status,
    experience: expYears != null && !Number.isNaN(expYears) ? `${expYears} yr${expYears === 1 ? '' : 's'}` : 'â€”',
    resumePath: a.resumePath ?? '',
    coverLetter: a.coverLetter ?? '',
    location: a.location?.trim() || 'â€”',
    currentCompany: a.currentCompany ?? '',
    currentDesignation: a.currentDesignation ?? '',
  };
}

const STATUS_CONFIG = {
  Pending: { color: C.pending, bg: '#FFF7ED', icon: 'hourglass-split' },
  Reviewed: { color: C.reviewed, bg: '#ECFEFF', icon: 'eye' },
  Shortlisted: { color: C.shortlisted, bg: '#ECFDF5', icon: 'star-fill' },
  Interviewed: { color: C.interviewed, bg: '#F5F3FF', icon: 'mic-fill' },
  Rejected: { color: C.rejected, bg: '#FEF2F2', icon: 'x-circle-fill' },
  Hired: { color: C.shortlisted, bg: '#ECFDF5', icon: 'check-circle-fill' },
};

const STAT_CARDS = [
  { key: 'total', label: 'Total', color: C.total, icon: 'file-earmark-text' },
  { key: 'Pending', label: 'Pending', color: C.pending, icon: 'hourglass-split' },
  { key: 'Reviewed', label: 'Reviewed', color: C.reviewed, icon: 'eye' },
  { key: 'Shortlisted', label: 'Shortlisted', color: C.shortlisted, icon: 'star-fill' },
  { key: 'Interviewed', label: 'Interviewed', color: C.interviewed, icon: 'mic-fill' },
  { key: 'Rejected', label: 'Rejected', color: C.rejected, icon: 'x-circle-fill' },
];

const STATUSES = ['All Status', 'Pending', 'Reviewed', 'Shortlisted', 'Interviewed', 'Rejected', 'Hired'];
const STATUS_UPDATE_OPTIONS = ['Pending', 'Reviewed', 'Shortlisted', 'Interviewed', 'Rejected', 'Hired'] as const;

// â”€â”€â”€ Helper components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || { color: C.sub, bg: C.bg, icon: 'â€¢' };
  const isBI = cfg.icon !== 'â€¢';
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
      {isBI ? (
        <BI name={cfg.icon} size={9} color={cfg.color} />
      ) : (
        <Text style={{ color: cfg.color }}>â€¢</Text>
      )}
      <Text style={[styles.badgeText, { color: cfg.color }]}>
        {status}
      </Text>
    </View>
  );
}

function Avatar({ initials, color, size = 36 }: { initials: string, color: string, size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color + '22', borderColor: color + '44' }]}>
      <Text style={[styles.avatarText, { color, fontSize: size * 0.35 }]}>{initials}</Text>
    </View>
  );
}

function StatCard({ label, count, color, icon, isWeb }: { label: string, count: number | string, color: string, icon: string, isWeb: boolean }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <View style={[styles.statIcon, { width: isWeb ? 32 : 28, height: isWeb ? 32 : 28, borderRadius: isWeb ? 8 : 7, backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center' }]}>
        <BI name={icon} size={isWeb ? 14 : 12} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.statCount, { color }]} numberOfLines={1}>{count}</Text>
        <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
      </View>
    </View>
  );
}

function ApplicationCard({
  item,
  isWeb,
  onStatusChange,
  updating,
}: {
  item: ReturnType<typeof mapApplication>;
  isWeb: boolean;
  onStatusChange: (id: string, status: string) => void;
  updating: boolean;
}) {
  const [statusOpen, setStatusOpen] = useState(false);

  if (!isWeb) {
    return (
      <View style={[styles.appCard, { flexDirection: 'column', alignItems: 'stretch', gap: 10 }]}>
        {/* Top Row: Avatar + Info (Name, Role) + Status */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <Avatar initials={item.avatar} color={item.avatarColor} size={38} />
            <View style={{ flex: 1 }}>
              <Text style={styles.appName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.appRole} numberOfLines={1}>{item.role}</Text>
            </View>
          </View>
          <View style={[styles.appRight, { zIndex: statusOpen ? 4000 : 1 }]}>
            <View style={styles.statusPickerWrap}>
              <TouchableOpacity
                onPress={() => setStatusOpen((o) => !o)}
                activeOpacity={0.8}
                disabled={updating}
              >
                <StatusBadge status={updating ? 'Updatingâ€¦' : item.status} />
              </TouchableOpacity>
              {statusOpen && (
                <View style={styles.statusMenu}>
                  {STATUS_UPDATE_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.statusMenuItem, item.status === opt && styles.statusMenuItemActive]}
                      onPress={() => {
                        setStatusOpen(false);
                        if (opt !== item.status) onStatusChange(item.id, opt);
                      }}
                    >
                      <Text
                        style={[
                          styles.statusMenuText,
                          item.status === opt && { color: C.primary, fontWeight: '700' },
                        ]}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Middle Row: Meta Chips */}
        <View style={[styles.appMeta, { marginTop: 4, width: '100%' }]}>
          <View style={styles.metaChip}>
            <BI name="building" size={8} color={C.sub} />
            <Text style={styles.metaChipText}>{item.department}</Text>
          </View>
          <View style={styles.metaChip}>
            <BI name="envelope-fill" size={8} color={C.sub} />
            <Text style={styles.metaChipText}>{item.email}</Text>
          </View>
          <View style={styles.metaChip}>
            <BI name="telephone-fill" size={8} color={C.sub} />
            <Text style={styles.metaChipText}>{item.phone}</Text>
          </View>
        </View>

        {/* Bottom Row: Date */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2, width: '100%' }}>
          <Text style={styles.appDate}>{item.applied}</Text>
        </View>
      </View>
    );
  }

  // Web Layout
  return (
    <View style={[styles.appCard, styles.appCardWeb]}>
      <Avatar initials={item.avatar} color={item.avatarColor} size={42} />

      <View style={styles.appInfo}>
        <Text style={styles.appName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.appRole} numberOfLines={1}>{item.role}</Text>
        <View style={styles.appMeta}>
          <View style={styles.metaChip}>
            <BI name="building" size={8} color={C.sub} />
            <Text style={styles.metaChipText}>{item.department}</Text>
          </View>
          <View style={styles.metaChip}>
            <BI name="envelope-fill" size={8} color={C.sub} />
            <Text style={styles.metaChipText}>{item.email}</Text>
          </View>
          <View style={styles.metaChip}>
            <BI name="telephone-fill" size={8} color={C.sub} />
            <Text style={styles.metaChipText}>{item.phone}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.appRight, { zIndex: statusOpen ? 4000 : 1 }]}>
        <View style={styles.statusPickerWrap}>
          <TouchableOpacity
            onPress={() => setStatusOpen((o) => !o)}
            activeOpacity={0.8}
            disabled={updating}
          >
            <StatusBadge status={updating ? 'Updatingâ€¦' : item.status} />
          </TouchableOpacity>
          {statusOpen && (
            <View style={styles.statusMenu}>
              {STATUS_UPDATE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.statusMenuItem, item.status === opt && styles.statusMenuItemActive]}
                  onPress={() => {
                    setStatusOpen(false);
                    if (opt !== item.status) onStatusChange(item.id, opt);
                  }}
                >
                  <Text
                    style={[
                      styles.statusMenuText,
                      item.status === opt && { color: C.primary, fontWeight: '700' },
                    ]}
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        <Text style={styles.appDate}>{item.applied}</Text>
      </View>
    </View>
  );
}

// â”€â”€â”€ Dropdown (lightweight native) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Dropdown({ value, options, onSelect, placeholder }: { value: string, options: string[], onSelect: (val: string) => void, placeholder: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.dropdownWrap}>
      <TouchableOpacity style={styles.dropdownBtn} onPress={() => setOpen(o => !o)} activeOpacity={0.8}>
        <Text style={styles.dropdownText} numberOfLines={1}>{value || placeholder}</Text>
        <BI name={open ? 'chevron-up' : 'chevron-down'} size={9} color={C.sub} />
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdownMenu}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt}
              style={[styles.dropdownItem, value === opt && styles.dropdownItemActive]}
              onPress={() => { onSelect(opt); setOpen(false); }}
            >
              <Text style={[styles.dropdownItemText, value === opt && { color: C.primary, fontWeight: '700' }]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// â”€â”€â”€ Main Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function JobApplicationsScreen() {
  const { width } = useWindowDimensions();
  const isWeb = width >= 768;

  const [search, setSearch] = useState('');
  const [selectedJob, setSelectedJob] = useState('All Jobs');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [jobOptions, setJobOptions] = useState<string[]>(['All Jobs']);
  const [jobIdByTitle, setJobIdByTitle] = useState<Record<string, number>>({});
  const [applications, setApplications] = useState<ReturnType<typeof mapApplication>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const handleStatusChange = useCallback(async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      await updateJobApplicationStatus(Number(id), status.toLowerCase());
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a)),
      );
    } catch (e) {
      const msg = getApiErrorMessage(e, 'Failed to update status.');
      void sweetError('Error', msg);
    } finally {
      setUpdatingId(null);
    }
  }, []);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const jobRows = await fetchJobs();
      const titles: Record<string, number> = {};
      const options = ['All Jobs'];
      jobRows.forEach((j) => {
        if (j.id && j.title) {
          titles[j.title] = j.id;
          options.push(j.title);
        }
      });
      setJobOptions(options);
      setJobIdByTitle(titles);

      const jobId = selectedJob !== 'All Jobs' ? titles[selectedJob] : undefined;
      const res = await fetchJobApplications(jobId, 0, 100);
      setApplications((res.items ?? []).map((a, i) => mapApplication(a, i)));
    } catch (e) {
      setError(getApiErrorMessage(e, 'Failed to load applications.'));
    } finally {
      setLoading(false);
    }
  }, [selectedJob]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const filtered = useMemo(() => {
    return applications.filter(a => {
      const matchSearch =
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.role.toLowerCase().includes(search.toLowerCase());
      const matchJob = selectedJob === 'All Jobs' || a.role === selectedJob;
      const matchStatus = selectedStatus === 'All Status' || a.status === selectedStatus;
      return matchSearch && matchJob && matchStatus;
    });
  }, [search, selectedJob, selectedStatus, applications]);

  const paginated = useMemo(() => {
    return filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const counts = useMemo(() => {
    const c: { [key: string]: number } = { total: applications.length };
    applications.forEach(a => { c[a.status] = (c[a.status] || 0) + 1; });
    return c;
  }, [applications]);

  const numColumns = isWeb ? 2 : 1;

  return (
    <AdminLayout>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor="#151D4F" />
        <ScrollView style={styles.root} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* â”€â”€ Header â”€â”€ */}
          <View style={[styles.header, isWeb && styles.headerWeb]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View style={{ width: isWeb ? 38 : 34, height: isWeb ? 38 : 34, borderRadius: isWeb ? 10 : 9, backgroundColor: "#F97316", alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="file-text" size={isWeb ? 20 : 18} color="#FFF" />
              </View>
              <Text style={styles.pageTitle}>Job Applications</Text>
            </View>
          </View>

          {/* â”€â”€ Stat Cards â”€â”€ */}
          <View style={{ marginTop: isWeb ? -42 : -28, zIndex: 10, marginBottom: 14 }}>
            {isWeb ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ width: "100%", maxWidth: 900, alignSelf: "center" }}
                contentContainerStyle={{
                  flexDirection: "row",
                  gap: 8,
                  flexGrow: 1,
                  justifyContent: "center"
                }}
              >
                {STAT_CARDS.map(s => (
                  <View
                    key={s.key}
                    style={[
                      styles.statCardWrapper,
                      { width: 143 }
                    ]}
                  >
                    <StatCard
                      label={s.label}
                      count={counts[s.key] ?? 0}
                      color={s.color}
                      icon={s.icon}
                      isWeb={isWeb}
                    />
                  </View>
                ))}
              </ScrollView>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  flexDirection: "row",
                  gap: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 6,
                }}
              >
                {STAT_CARDS.map(s => (
                  <View
                    key={s.key}
                    style={[
                      styles.statCardWrapper,
                      { width: 143 }
                    ]}
                  >
                    <StatCard
                      label={s.label}
                      count={counts[s.key] ?? 0}
                      color={s.color}
                      icon={s.icon}
                      isWeb={isWeb}
                    />
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* â”€â”€ Filters â”€â”€ */}
          <View style={[styles.filterRow, isWeb && styles.filterRowWeb, !isWeb && { marginTop: 16 }]}>
            <View style={[styles.searchBox, isWeb && styles.searchBoxWeb]}>
              <BI name="search" size={12} color={C.sub} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { outlineStyle: "none" as any }]}
                placeholder="Search applicants..."
                placeholderTextColor={C.sub}
                value={search}
                onChangeText={(t) => { setSearch(t); setCurrentPage(1); }}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => { setSearch(''); setCurrentPage(1); }}>
                  <BI name="x-lg" size={11} color={C.sub} style={{ paddingHorizontal: 8 }} />
                </TouchableOpacity>
              )}
            </View>
            {!isWeb ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingRight: 16, alignItems: 'center' }}
                style={{ overflow: 'visible', zIndex: 2000, elevation: 2000 }}
                {...(Platform.OS === 'web' ? { className: "smooth-scroll-x" } : {})}
              >
                <Dropdown value={selectedJob} options={jobOptions} onSelect={(v) => { setSelectedJob(v); setCurrentPage(1); }} placeholder="All Jobs" />
                <Dropdown value={selectedStatus} options={STATUSES} onSelect={(v) => { setSelectedStatus(v); setCurrentPage(1); }} placeholder="All Status" />
                <TouchableOpacity
                  style={[styles.resetBtn, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}
                  onPress={() => { setSearch(''); setSelectedJob('All Jobs'); setSelectedStatus('All Status'); setCurrentPage(1); }}
                  activeOpacity={0.8}
                >
                  <BI name="arrow-counterclockwise" size={11} color={C.primary} />
                  <Text style={styles.resetBtnText}>Reset</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.filterDropdowns, styles.filterDropdownsWeb]}
                style={{ overflow: 'visible', zIndex: 2000, elevation: 2000 }}
                {...(Platform.OS === 'web' ? { className: "smooth-scroll-x" } : {})}
              >
                <Dropdown value={selectedJob} options={jobOptions} onSelect={(v) => { setSelectedJob(v); setCurrentPage(1); }} placeholder="All Jobs" />
                <Dropdown value={selectedStatus} options={STATUSES} onSelect={(v) => { setSelectedStatus(v); setCurrentPage(1); }} placeholder="All Status" />
                <TouchableOpacity
                  style={[styles.resetBtn, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}
                  onPress={() => { setSearch(''); setSelectedJob('All Jobs'); setSelectedStatus('All Status'); setCurrentPage(1); }}
                  activeOpacity={0.8}
                >
                  <BI name="arrow-counterclockwise" size={11} color={C.primary} />
                  <Text style={styles.resetBtnText}>Reset</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>

          {/* â”€â”€ Results info â”€â”€ */}
          <View style={styles.resultsRow}>
            <Text style={styles.resultsText}>
              Showing <Text style={{ color: C.primary, fontWeight: '700' }}>{filtered.length}</Text> of{' '}
              <Text style={{ fontWeight: '700' }}>{applications.length}</Text> applications
            </Text>
          </View>

          {/* â”€â”€ Application List â”€â”€ */}
          {loading ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Loading applicationsâ€¦</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>{error}</Text>
              <TouchableOpacity style={styles.resetBtn} onPress={loadApplications}>
                <Text style={styles.resetBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyBox}>
              <BI name="inbox" size={40} color={C.sub} style={{ marginBottom: 16 }} />
              <Text style={styles.emptyTitle}>No Applications Found</Text>
              <Text style={styles.emptySub}>Try adjusting your filters to see more results.</Text>
            </View>
          ) : isWeb ? (
            // Web: 2-column grid
            <View style={styles.webGrid}>
              {paginated.map(item => (
                <View key={item.id} style={styles.webGridItem}>
                  <ApplicationCard
                    item={item}
                    isWeb={isWeb}
                    onStatusChange={handleStatusChange}
                    updating={updatingId === item.id}
                  />
                </View>
              ))}
            </View>
          ) : (
            // Mobile: single column list
            paginated.map(item => (
              <ApplicationCard
                key={item.id}
                item={item}
                isWeb={false}
                onStatusChange={handleStatusChange}
                updating={updatingId === item.id}
              />
            ))
          )}

          {filtered.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filtered.length / ITEMS_PER_PAGE)}
              totalItems={filtered.length}
              itemsPerPage={ITEMS_PER_PAGE}
              itemName="applications"
              onPageChange={setCurrentPage}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    </AdminLayout>
  );
}

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 16 : 12,
    paddingBottom: 48,
    backgroundColor: '#151D4F',
    flexDirection: 'column',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 22,
  },
  headerWeb: {
    marginHorizontal: 16, marginTop: 16, borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 48,
  },
  breadcrumb: { fontSize: 12, color: '#D1D5DB', marginBottom: 4 },
  breadLink: { color: '#E8631A' },
  breadCurrent: { color: '#FFFFFF', fontWeight: '600' },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  addBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  addBtnText: { color: C.white, fontWeight: '700', fontSize: 14 },

  // Stat Cards
  statRow: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 8,
  },
  statCardWrapper: {
    flexGrow: 0,
  },
  statCard: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    width: '100%',
  },
  statIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCount: {
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 26,
  },
  statLabel: {
    fontSize: 11,
    color: C.sub,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // Filters
  filterRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
    zIndex: 1000,
    elevation: 1000,
  },
  filterRowWeb: {
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 1000,
    elevation: 1000,
    marginTop: 24,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchBoxWeb: {
    flex: 1,
  },
  searchIcon: { fontSize: 15, marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: C.text,
    outlineStyle: 'none' as any, // web
  } as any,
  filterDropdowns: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    zIndex: 2000,
    elevation: 2000,
  },
  filterDropdownsWeb: {
    flexWrap: 'nowrap',
    alignItems: 'center',
  },

  // Dropdown
  dropdownWrap: { position: 'relative', zIndex: 3000, elevation: 3000 },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    minWidth: 130,
  },
  dropdownText: { flex: 1, fontSize: 13, color: C.text, fontWeight: '500' },
  dropdownArrow: { fontSize: 10, color: C.sub },
  dropdownMenu: {
    position: 'absolute',
    top: 44,
    left: 0,
    minWidth: 160,
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 9999,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  dropdownItemActive: { backgroundColor: C.tag },
  dropdownItemText: { fontSize: 13, color: C.text },
  resetBtn: {
    backgroundColor: C.tag,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  resetBtnText: { color: C.primary, fontWeight: '700', fontSize: 13 },

  // Results row
  resultsRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  resultsText: { fontSize: 13, color: C.sub },

  // Application Card
  appCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  appCardWeb: {
    marginHorizontal: 0,
    paddingHorizontal: 24,
    paddingVertical: 18,
    gap: 20,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  avatarText: { fontWeight: '800' },
  appInfo: { flex: 1, gap: 3 },
  appName: { fontSize: 15, fontWeight: '800', color: C.text },
  appRole: { fontSize: 12, color: C.sub, fontWeight: '500' },
  appMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.bg,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaChipText: {
    fontSize: 11,
    color: C.sub,
  },
  appRight: { alignItems: 'flex-end', gap: 6 },
  appDate: { fontSize: 11, color: C.sub },
  statusPickerWrap: { position: 'relative' },
  statusMenu: {
    position: 'absolute',
    top: 36,
    right: 0,
    minWidth: 140,
    backgroundColor: C.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 12,
    zIndex: 5000,
    overflow: 'hidden',
  },
  statusMenuItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  statusMenuItemActive: { backgroundColor: C.tag },
  statusMenuText: { fontSize: 12, color: C.text },

  // Badge
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },

  // Web Grid
  webGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 28,
    gap: 12,
  },
  webGridItem: {
    flex: 1,
    minWidth: 400,
  },

  // Empty State
  emptyBox: {
    marginHorizontal: 16,
    marginTop: 40,
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 48,
  },
  emptyIcon: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 8 },
  emptySub: { fontSize: 14, color: C.sub, textAlign: 'center' },
});