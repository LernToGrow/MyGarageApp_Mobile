import { showAlert } from '../../utils/alert';
import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { getJobs, deleteJob } from '../../api/job.api';
import useJobStore from '../../store/jobStore';
import useAuthStore from '../../store/authStore';
import DatePickerModal from '../../components/DatePickerModal';

const STATUS_ORDER   = ['received', 'inspecting', 'estimated', 'in_progress', 'done'];
const HISTORY_STATUS = ['paid', 'closed'];
const STATUS_COLOR = {
  received:    '#6c757d',
  inspecting:  '#0077b6',
  estimated:   '#9c6644',
  in_progress: '#E85D04',
  done:        '#2d6a4f',
  paid:        '#2d6a4f',
  closed:      '#999',
};

const PRESETS = [
  { key: 'today', tKey: 'presets.today' },
  { key: 'week',  tKey: 'presets.thisWeek' },
  { key: 'month', tKey: 'presets.thisMonth' },
  { key: 'last3', tKey: 'presets.last3' },
];

function fmtISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function fmtDisplay(date, locale = 'en') {
  const localeMap = { en: 'en-IN', mr: 'mr-IN', hi: 'hi-IN' };
  return date.toLocaleDateString(localeMap[locale] || 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfToday() { const d = new Date(); d.setHours(23, 59, 59, 999); return d; }

function JobCard({ job, onPress, onLongPress }) {
  const { t } = useTranslation();
  const statusKey = `jobs.status.${job.status}`;
  const color = STATUS_COLOR[job.status] || '#999';
  const canDelete = job.status === 'received';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.75}>
      <View style={styles.cardInner}>
        <View style={styles.cardTop}>
          <View style={styles.jobNumChip}>
            <Text style={styles.jobNum}>{job.job_number}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
            <Text style={[styles.badgeText, { color }]}>{t(statusKey)}</Text>
          </View>
        </View>
        <Text style={styles.customerName}>{job.customer_id?.name}</Text>
        <View style={styles.bikeRow}>
          <Text style={styles.bikeIcon}>🏍</Text>
          <Text style={styles.bikeLine}>
            {job.bike_id?.make} {job.bike_id?.model}
          </Text>
          <View style={styles.platePill}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff', letterSpacing: 0.8 }}>{job.bike_id?.plate_number}</Text>
          </View>
        </View>
        {(job.assigned_to?.name || job.estimated_ready_at) && (
          <View style={styles.cardFooter}>
            {job.assigned_to?.name && (
              <View style={styles.assignedRow}>
                <Text style={styles.assignedIcon}>👤</Text>
                <Text style={styles.assignedLine}>{job.assigned_to.name}</Text>
              </View>
            )}
            {job.estimated_ready_at && (
              <View style={styles.etaRow}>
                <Text style={styles.etaIcon}>🕐</Text>
                <Text style={styles.eta}>
                  {new Date(job.estimated_ready_at).toLocaleTimeString('en-IN', {
                    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
                  })}
                </Text>
              </View>
            )}
          </View>
        )}
        {canDelete && (
          <Text style={styles.deleteHint}>{t('jobs.holdToDelete') || 'Hold to delete'}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function MyJobsScreen({ navigation }) {
  const { t, i18n }  = useTranslation();
  const { setActiveJob } = useJobStore();
  const { user }         = useAuthStore();
  const canBilling       = user?.role === 'garage_owner' || (user?.permissions ?? []).includes('add_billing');

  const today = new Date();
  const [tab, setTab]               = useState('active');
  const [jobs, setJobs]             = useState([]);
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fromDate, setFromDate]     = useState(startOfMonth(today));
  const [toDate, setToDate]         = useState(today);
  const [activePreset, setActivePreset] = useState('month');
  const [filtersOpen, setFiltersOpen]   = useState(false);
  const [showPicker, setShowPicker]     = useState(false);
  const [pickerTarget, setPickerTarget] = useState('from');

  function setPreset(preset) {
    const now = new Date();
    setActivePreset(preset);
    if (preset === 'today') {
      setFromDate(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0));
      setToDate(endOfToday());
    } else if (preset === 'week') {
      const mon = new Date(now);
      mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      mon.setHours(0, 0, 0, 0);
      setFromDate(mon);
      setToDate(endOfToday());
    } else if (preset === 'month') {
      setFromDate(startOfMonth(now));
      setToDate(endOfToday());
    } else if (preset === 'last3') {
      setFromDate(new Date(now.getFullYear(), now.getMonth() - 2, 1));
      setToDate(endOfToday());
    }
  }

  function openPicker(target) {
    setActivePreset(null);
    setPickerTarget(target);
    setShowPicker(true);
  }

  function onConfirmPicker(date) {
    setShowPicker(false);
    if (pickerTarget === 'from') {
      const d = new Date(date); d.setHours(0, 0, 0, 0);
      setFromDate(d);
      if (d > toDate) setToDate(d);
    } else {
      const d = new Date(date); d.setHours(23, 59, 59, 999);
      setToDate(d);
      if (d < fromDate) setFromDate(d);
    }
  }

  async function fetchJobs(isRefresh = false, activeTab = tab, from = fromDate, to = toDate) {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const statuses = activeTab === 'active' ? STATUS_ORDER : HISTORY_STATUS;
      const params = {
        status: statuses.join(','),
        from: fmtISO(from),
        to:   fmtISO(to),
      };
      if (user?.role === 'garage_owner') {
        params.assigned_to = user._id;
      }
      const { data } = await getJobs(params);
      const sorted = (data.jobs || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setJobs(sorted);
    } catch {
      showAlert('', t('common.error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchJobs(); }, [tab, fromDate, toDate]));

  function switchTab(newTab) {
    setTab(newTab);
    setJobs([]);
    fetchJobs(false, newTab);
  }

  function handleDeleteJob(job) {
    if (job.status !== 'received') return;
    showAlert(
      t('jobs.deleteJob') || 'Delete Job',
      t('jobs.deleteJobConfirm', { number: job.job_number }) || `Delete ${job.job_number}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete') || 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteJob(job._id);
              setJobs((prev) => prev.filter((j) => j._id !== job._id));
            } catch (err) {
              showAlert(t('common.error'), err.response?.data?.error || t('common.error'));
            }
          },
        },
      ]
    );
  }

  function openJob(job) {
    setActiveJob(job);
    if (tab === 'history') {
      navigation.navigate('JobDetail', { jobId: job._id });
      return;
    }
    const dest = {
      received:    'Inspection',
      inspecting:  'Inspection',
      estimated:   'Estimate',
      in_progress: 'JobCard',
      done:        canBilling ? 'Payment' : 'JobDetail',
    }[job.status] || 'JobDetail';
    if (job.status === 'done' && !canBilling) {
      showAlert('', 'You need billing permission to collect payment. Ask your admin.');
    }
    const params = dest === 'JobDetail' ? { jobId: job._id } : undefined;
    navigation.navigate(dest, params);
  }

  const displayed = search.trim()
    ? jobs.filter((j) => {
        const q = search.toLowerCase();
        return (
          j.job_number?.toString().toLowerCase().includes(q) ||
          j.customer_id?.name?.toLowerCase().includes(q) ||
          j.bike_id?.plate_number?.toLowerCase().includes(q)
        );
      })
    : jobs;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E85D04" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder={t('jobs.searchPlaceholder')}
          placeholderTextColor="#bbb"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={() => setSearch('')}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter bar */}
      <TouchableOpacity style={styles.filterBar} onPress={() => setFiltersOpen(v => !v)} activeOpacity={0.8}>
        <View style={styles.filterBarLeft}>
          <Text style={styles.filterBarIcon}>📅</Text>
          <Text style={styles.filterBarDate}>
            {fmtDisplay(fromDate, i18n.language)}  →  {fmtDisplay(toDate, i18n.language)}
          </Text>
        </View>
        <View style={[styles.filterBarChevronWrap, filtersOpen && styles.filterBarChevronWrapOpen]}>
          <Text style={styles.filterBarChevron}>{filtersOpen ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {filtersOpen && (
        <View style={styles.filterCard}>
          <Text style={styles.filterLabel}>{t('jobs.dateFilter')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
            {PRESETS.map(({ key, tKey }) => {
              const isActive = activePreset === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.presetChip, isActive && styles.presetChipActive]}
                  onPress={() => { setPreset(key); fetchJobs(false, tab); }}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.presetChipText, isActive && styles.presetChipTextActive]}>{t(tKey)}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.rangeRow}>
            <TouchableOpacity
              style={[styles.dateBtn, pickerTarget === 'from' && showPicker && styles.dateBtnActive]}
              onPress={() => openPicker('from')}
              activeOpacity={0.8}
            >
              <Text style={styles.dateBtnLabel}>{t('common.from')}</Text>
              <Text style={styles.dateBtnValue}>{fmtDisplay(fromDate, i18n.language)}</Text>
            </TouchableOpacity>
            <View style={styles.rangeSeparator}>
              <Text style={styles.rangeSeparatorText}>→</Text>
            </View>
            <TouchableOpacity
              style={[styles.dateBtn, pickerTarget === 'to' && showPicker && styles.dateBtnActive]}
              onPress={() => openPicker('to')}
              activeOpacity={0.8}
            >
              <Text style={styles.dateBtnLabel}>{t('common.to')}</Text>
              <Text style={styles.dateBtnValue}>{fmtDisplay(toDate, i18n.language)}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <DatePickerModal
        visible={showPicker}
        value={pickerTarget === 'from' ? fromDate : toDate}
        maximumDate={pickerTarget === 'to' ? endOfToday() : undefined}
        minimumDate={pickerTarget === 'to' ? fromDate : undefined}
        onConfirm={onConfirmPicker}
        onCancel={() => setShowPicker(false)}
      />

      {/* Tab toggle */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'active' && styles.tabBtnActive]}
          onPress={() => switchTab('active')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabBtnText, tab === 'active' && styles.tabBtnTextActive]}>{t('jobs.active')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'history' && styles.tabBtnActive]}
          onPress={() => switchTab('history')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabBtnText, tab === 'history' && styles.tabBtnTextActive]}>{t('jobs.history')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.countRow}>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{displayed.length} {t('jobs.title').toLowerCase()}</Text>
        </View>
      </View>

      <FlatList
        data={displayed}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <JobCard job={item} onPress={() => openJob(item)} onLongPress={() => handleDeleteJob(item)} />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchJobs(true)} colors={['#E85D04']} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {tab === 'active' ? t('jobs.noActiveJobs') : t('jobs.noCompletedJobs')}
            </Text>
          </View>
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
      />

      {tab === 'active' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => { setActiveJob(null); navigation.navigate('AddBike'); }}
          activeOpacity={0.85}
        >
          <Text style={styles.fabText}>+ {t('jobs.newJob')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f3f7' },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    paddingHorizontal: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  searchIcon:   { fontSize: 16, marginRight: 6 },
  searchInput:  { flex: 1, paddingVertical: 12, fontSize: 15, color: '#111' },
  clearBtn:     { paddingHorizontal: 8, paddingVertical: 10 },
  clearBtnText: { fontSize: 15, color: '#bbb', fontWeight: '700' },

  // Filter bar
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  filterBarLeft:         { flexDirection: 'row', alignItems: 'center', flex: 1 },
  filterBarIcon:         { fontSize: 15, marginRight: 8 },
  filterBarDate:         { fontSize: 13, fontWeight: '600', color: '#333' },
  filterBarChevronWrap:  { backgroundColor: '#f2f3f7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  filterBarChevronWrapOpen: { backgroundColor: '#fff0e9' },
  filterBarChevron:      { fontSize: 10, color: '#E85D04', fontWeight: '700' },

  // Filter card
  filterCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 6,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  filterLabel:          { fontSize: 11, fontWeight: '800', color: '#E85D04', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  presetRow:            { gap: 8, marginBottom: 14 },
  presetChip:           { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f2f3f7', borderWidth: 1, borderColor: '#e0e0e0' },
  presetChipActive:     { backgroundColor: '#E85D04', borderColor: '#E85D04' },
  presetChipText:       { fontSize: 13, color: '#555', fontWeight: '600' },
  presetChipTextActive: { color: '#fff' },
  rangeRow:             { flexDirection: 'row', alignItems: 'center' },
  dateBtn: {
    flex: 1,
    backgroundColor: '#f8f8fb',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#e4e4e8',
  },
  dateBtnActive:      { borderColor: '#E85D04', backgroundColor: '#fff8f5' },
  dateBtnLabel:       { fontSize: 10, color: '#E85D04', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  dateBtnValue:       { fontSize: 14, fontWeight: '700', color: '#111' },
  rangeSeparator:     { paddingHorizontal: 10 },
  rangeSeparatorText: { fontSize: 20, color: '#E85D04' },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 6,
    backgroundColor: '#e4e5ea',
    borderRadius: 12,
    padding: 3,
  },
  tabBtn:           { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  tabBtnActive:     { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  tabBtnText:       { fontSize: 14, fontWeight: '600', color: '#999' },
  tabBtnTextActive: { color: '#E85D04', fontWeight: '800' },

  // Count pill
  countRow:  { paddingHorizontal: 16, paddingTop: 2, paddingBottom: 6 },
  countPill: { alignSelf: 'flex-start', backgroundColor: '#e4e5ea', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  countText: { fontSize: 12, color: '#777', fontWeight: '700' },

  // Job card
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardInner:  { flex: 1, padding: 14 },
  cardTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  jobNumChip: { backgroundColor: '#f2f3f7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  jobNum:     { fontSize: 12, fontWeight: '800', color: '#555', letterSpacing: 0.6 },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  badgeText:    { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  customerName: { fontSize: 17, fontWeight: '800', color: '#111', marginBottom: 6 },
  bikeRow:      { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  bikeIcon:     { fontSize: 14 },
  bikeLine:     { fontSize: 13, color: '#666', fontWeight: '500' },
  platePill: {
    backgroundColor: '#1a1a2e',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  // platePillText lives inside platePill — we write it as Text directly with inline style
  cardFooter:   { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  assignedRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  assignedIcon: { fontSize: 13 },
  assignedLine: { fontSize: 13, color: '#555', fontWeight: '600' },
  etaRow:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  etaIcon:      { fontSize: 13 },
  eta:          { fontSize: 13, color: '#E85D04', fontWeight: '700' },
  deleteHint:   { fontSize: 10, color: '#ddd', marginTop: 6 },

  empty:    { alignItems: 'center', paddingTop: 80 },
  emptyText:{ fontSize: 16, color: '#bbb', fontWeight: '500' },

  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    backgroundColor: '#E85D04',
    borderRadius: 30,
    paddingVertical: 15,
    paddingHorizontal: 24,
    elevation: 6,
    shadowColor: '#E85D04',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  fabText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
});
