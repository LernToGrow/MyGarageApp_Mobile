import { showAlert } from '../../utils/alert'
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, RefreshControl, ActivityIndicator, ScrollView, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { getJobs, deleteJob } from '../../api/job.api';
import DatePickerModal from '../../components/DatePickerModal';

function fmtDisplay(date, locale = 'en') {
  const localeMap = { en: 'en-IN', mr: 'mr-IN', hi: 'hi-IN' };
  return date.toLocaleDateString(localeMap[locale] || 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfToday() { const d = new Date(); d.setHours(23, 59, 59, 999); return d; }

const PRESETS = [
  { key: 'today', tKey: 'presets.today' },
  { key: 'week',  tKey: 'presets.thisWeek' },
  { key: 'month', tKey: 'presets.thisMonth' },
  { key: 'last3', tKey: 'presets.last3' },
];

const STATUS_OPTIONS = ['all', 'active', 'received', 'inspecting', 'estimated', 'in_progress', 'done', 'paid'];
const ACTIVE_STATUSES = 'received,inspecting,estimated,in_progress';
const STATUS_COLOR = {
  received:    '#6c757d',
  inspecting:  '#0077b6',
  estimated:   '#9c6644',
  in_progress: '#E85D04',
  done:        '#2d6a4f',
  paid:        '#1b4332',
};

function StatusChip({ label, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function durLabel(mins) {
  if (!mins) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

function JobRow({ job, onPress, onLongPress }) {
  const { t } = useTranslation();
  const color    = STATUS_COLOR[job.status] || '#999';
  const duration = durLabel(job.duration_minutes);
  const canDelete = job.status === 'received';
  const assignedName = job.assigned_to?.name;
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.75}>
      <View style={styles.rowLeft}>
        <Text style={styles.jobNum}>{job.job_number}</Text>
        <Text style={styles.customerName}>{job.customer_id?.name}</Text>
        <Text style={styles.bikeLine}>
          {job.bike_id?.make} {job.bike_id?.model}{'  ·  '}{job.bike_id?.plate_number}
        </Text>
        {assignedName && (
          <Text style={styles.assignedLine}>👤 {assignedName}</Text>
        )}
        {duration && (
          <Text style={styles.durationLine}>⏱ {duration}</Text>
        )}
        {canDelete && (
          <Text style={styles.deleteHint}>{t('jobs.holdToDelete') || 'Hold to delete'}</Text>
        )}
      </View>
      <View style={[styles.badge, { backgroundColor: color }]}>
        <Text style={styles.badgeText}>{t(`jobs.status.${job.status}`)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function JobsScreen({ navigation, route }) {
  const { t, i18n } = useTranslation();
  const today = new Date();

  const [jobs, setJobs]             = useState([]);
  const [filter, setFilter]         = useState(route?.params?.filterStatus || 'all');
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const initPreset = route?.params?.filterPreset || 'month';
  const [fromDate, setFromDate]     = useState(
    initPreset === 'today' ? new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0) : startOfMonth(today)
  );
  const [toDate, setToDate]         = useState(today);
  const [activePreset, setActivePreset] = useState(initPreset);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState('from');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [assignedDropdownOpen, setAssignedDropdownOpen] = useState(false);

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
      const f = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      setFromDate(f);
      setToDate(endOfToday());
    }
  }

  function handleDeleteJob(job) {
    if (job.status !== 'received') return;
    showAlert(
      t('jobs.deleteJob') || 'Delete Job',
      t('jobs.deleteJobConfirm', { number: job.job_number }) || `Delete ${job.job_number}? All job data will be permanently removed.`,
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

  async function fetchJobs(isRefresh = false, overrideFilter = filter, overrideFrom = fromDate, overrideTo = toDate) {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const statusParam = overrideFilter === 'active' ? ACTIVE_STATUSES : overrideFilter !== 'all' ? overrideFilter : null;
      const params = {
        ...(statusParam ? { status: statusParam } : {}),
        from: fmtISO(overrideFrom),
        to:   fmtISO(overrideTo),
      };
      const { data } = await getJobs(params);
      setJobs(data.jobs || []);
    } catch {
      showAlert(t('common.error'), t('jobs.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { fetchJobs(); }, [filter, fromDate, toDate]);
  useFocusEffect(useCallback(() => { fetchJobs(); }, []));

  const assignedEmployees = [...new Map(
    jobs.filter(j => j.assigned_to?._id).map(j => [j.assigned_to._id, j.assigned_to])
  ).values()];

  const displayed = jobs
    .filter((j) => {
      if (assignedFilter !== 'all' && j.assigned_to?._id !== assignedFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        j.job_number?.toLowerCase().includes(q) ||
        j.customer_id?.name?.toLowerCase().includes(q) ||
        j.bike_id?.plate_number?.toLowerCase().includes(q)
      );
    });

  const chipLabel = (s) => {
    if (s === 'all') return t('jobs.all');
    if (s === 'active') return t('jobs.active');
    if (s.includes(',')) return s.split(',').map((x) => t(`jobs.status.${x.trim()}`)).join(' & ');
    return t(`jobs.status.${s}`);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E85D04" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('jobs.searchPlaceholder')}
          placeholderTextColor="#aaa"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={() => setSearch('')}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Compact filter summary bar */}
      <TouchableOpacity style={styles.filterBar} onPress={() => setFiltersOpen((v) => !v)} activeOpacity={0.8}>
        <View style={styles.filterBarLeft}>
          <Text style={styles.filterBarDate}>
            {fmtDisplay(fromDate, i18n.language)} → {fmtDisplay(toDate, i18n.language)}
          </Text>
          {filter !== 'all' && (
            <View style={styles.filterBarBadge}>
              <Text style={styles.filterBarBadgeText}>{chipLabel(filter)}</Text>
            </View>
          )}
          {assignedFilter !== 'all' && (
            <View style={[styles.filterBarBadge, { backgroundColor: '#0077b6' }]}>
              <Text style={styles.filterBarBadgeText}>
                👤 {assignedEmployees.find(e => e._id === assignedFilter)?.name || ''}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.filterBarChevron}>{filtersOpen ? '▲' : '▼'}</Text>
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
                  onPress={() => setPreset(key)}
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

          <View style={styles.divider} />

          <Text style={[styles.filterLabel, { marginTop: 12 }]}>{t('jobs.statusFilter')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {STATUS_OPTIONS.map((item) => (
              <StatusChip
                key={item}
                label={chipLabel(item)}
                active={filter === item}
                onPress={() => { setFilter(item); setFiltersOpen(false); setSearch(''); }}
              />
            ))}
          </ScrollView>

          {assignedEmployees.length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={[styles.filterLabel, { marginTop: 12 }]}>Assigned To</Text>
              <TouchableOpacity
                style={styles.dropdownBtn}
                onPress={() => setAssignedDropdownOpen(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.dropdownBtnText}>
                  {assignedFilter === 'all'
                    ? 'All Employees'
                    : assignedEmployees.find(e => e._id === assignedFilter)?.name || 'All Employees'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Assigned-to dropdown modal */}
      <Modal visible={assignedDropdownOpen} transparent animationType="fade" onRequestClose={() => setAssignedDropdownOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAssignedDropdownOpen(false)}>
          <View style={styles.dropdownModal}>
            <Text style={styles.dropdownModalTitle}>Select Employee</Text>
            {[{ _id: 'all', name: 'All Employees' }, ...assignedEmployees].map((emp) => {
              const active = assignedFilter === emp._id;
              return (
                <TouchableOpacity
                  key={emp._id}
                  style={[styles.dropdownOption, active && styles.dropdownOptionActive]}
                  onPress={() => { setAssignedFilter(emp._id); setAssignedDropdownOpen(false); }}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.dropdownOptionText, active && styles.dropdownOptionTextActive]}>
                    {emp.name}
                  </Text>
                  {active && <Text style={styles.dropdownCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      <DatePickerModal
        visible={showPicker}
        value={pickerTarget === 'from' ? fromDate : toDate}
        maximumDate={pickerTarget === 'to' ? endOfToday() : undefined}
        minimumDate={pickerTarget === 'to' ? fromDate : undefined}
        onConfirm={onConfirmPicker}
        onCancel={() => setShowPicker(false)}
      />

      <View style={styles.countRow}>
        <Text style={styles.countText}>{displayed.length} of {jobs.length} {t('jobs.title').toLowerCase()}</Text>
      </View>

      <FlatList
        data={displayed}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <JobRow
            job={item}
            onPress={() => navigation.navigate('JobDetail', { jobId: item._id })}
            onLongPress={() => handleDeleteJob(item)}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchJobs(true)} colors={['#E85D04']} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>{t('jobs.noJobs')}</Text>
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
        style={{ flex: 1 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#f6f6f6' },
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchWrap: {
    margin: 16,
    marginBottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111',
  },
  clearBtn:     { paddingHorizontal: 12, paddingVertical: 10 },
  clearBtnText: { fontSize: 14, color: '#aaa', fontWeight: '700' },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  filterBarLeft:      { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  filterBarDate:      { fontSize: 13, fontWeight: '600', color: '#333' },
  filterBarBadge:     { backgroundColor: '#E85D04', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  filterBarBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  filterBarChevron:   { fontSize: 10, color: '#E85D04', fontWeight: '700', marginLeft: 8 },
  filterCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
  },
  presetRow:            { gap: 8, marginBottom: 12 },
  presetChip:           { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#e0e0e0' },
  presetChipActive:     { backgroundColor: '#E85D04' },
  presetChipText:       { fontSize: 13, color: '#555', fontWeight: '600' },
  presetChipTextActive: { color: '#fff' },
  rangeRow:             { flexDirection: 'row', alignItems: 'center' },
  dateBtn: {
    flex: 1,
    backgroundColor: '#f6f6f6',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
  },
  dateBtnActive:     { borderColor: '#E85D04', backgroundColor: '#fff7f3' },
  dateBtnLabel:      { fontSize: 10, color: '#E85D04', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  dateBtnValue:      { fontSize: 14, fontWeight: '700', color: '#111' },
  rangeSeparator:    { paddingHorizontal: 10 },
  rangeSeparatorText:{ fontSize: 18, color: '#E85D04' },
  divider:         { height: 1, backgroundColor: '#f0f0f0', marginTop: 12 },
  filterLabel:     { fontSize: 11, fontWeight: '700', color: '#E85D04', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  chipRow:         { gap: 8, alignItems: 'center', paddingVertical: 10 },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#e0e0e0',
    alignSelf: 'center',
  },
  chipActive:      { backgroundColor: '#E85D04' },
  chipText:        { fontSize: 13, color: '#555', fontWeight: '600' },
  chipTextActive:  { color: '#fff' },
  row: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
  },
  rowLeft:         { flex: 1 },
  jobNum:          { fontSize: 12, fontWeight: '700', color: '#888', letterSpacing: 0.5, marginBottom: 2 },
  customerName:    { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 2 },
  bikeLine:        { fontSize: 13, color: '#666' },
  assignedLine:    { fontSize: 12, color: '#555', fontWeight: '600', marginTop: 3 },
  durationLine:    { fontSize: 12, color: '#E85D04', fontWeight: '600', marginTop: 3 },
  deleteHint:      { fontSize: 10, color: '#ccc', marginTop: 3 },
  badge:           { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginLeft: 10 },
  badgeText:       { color: '#fff', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  emptyText:       { fontSize: 16, color: '#aaa', textAlign: 'center', marginTop: 40 },
  countRow:        { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  countText:       { fontSize: 12, color: '#aaa', fontWeight: '600' },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f6f6f6',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginTop: 4,
  },
  dropdownBtnText: { fontSize: 14, fontWeight: '600', color: '#333', flex: 1 },
  dropdownArrow:   { fontSize: 10, color: '#E85D04', fontWeight: '700', marginLeft: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dropdownModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    paddingVertical: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  dropdownModalTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E85D04',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f6f6f6',
  },
  dropdownOptionActive:     { backgroundColor: '#fff7f3' },
  dropdownOptionText:       { fontSize: 15, color: '#333', flex: 1 },
  dropdownOptionTextActive: { color: '#E85D04', fontWeight: '700' },
  dropdownCheck:            { fontSize: 16, color: '#E85D04', fontWeight: '700' },
});
