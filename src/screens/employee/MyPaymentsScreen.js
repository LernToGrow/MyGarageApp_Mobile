import { showAlert } from '../../utils/alert';
import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { getJobs } from '../../api/job.api';
import DatePickerModal from '../../components/DatePickerModal';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const STATUS_COLOR = { paid: '#2d6a4f', partial: '#E85D04', pending: '#c62828' };
const MODE_COLOR   = { cash: '#2d6a4f', online: '#0077b6', upi: '#7b2d8b' };

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
function fmtDisplay(date) {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfToday() { const d = new Date(); d.setHours(23, 59, 59, 999); return d; }

function fmt(n)  { return `₹${(n ?? 0).toLocaleString('en-IN')}`; }
function dateStr(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}

function PaymentRow({ item }) {
  const { t } = useTranslation();
  const statusColor = STATUS_COLOR[item.payment_status] || '#888';
  const modeColor   = MODE_COLOR[item.payment_mode]    || '#888';
  return (
    <View style={styles.card}>
      <View style={styles.cardInner}>
        <View style={styles.cardTop}>
          <View style={styles.jobNumChip}>
            <Text style={styles.jobNum}>{item.job_number}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusColor + '22', borderColor: statusColor + '55' }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>{t(`jobs.status.${item.payment_status}`, item.payment_status)}</Text>
          </View>
        </View>
        <Text style={styles.customerName}>{item.customer_id?.name || '—'}</Text>
        <View style={styles.bikeRow}>
          <Text style={styles.bikeIcon}>🏍</Text>
          <Text style={styles.bikeLine}>{item.bike_id?.make} {item.bike_id?.model}</Text>
          {item.bike_id?.plate_number ? (
            <View style={styles.platePill}>
              <Text style={styles.platePillText}>{item.bike_id.plate_number}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.amountRow}>
          <View>
            <Text style={styles.amountLabel}>{t('payments.collected')}</Text>
            <Text style={[styles.amountValue, { color: '#2d6a4f' }]}>{fmt(item.amount_paid)}</Text>
          </View>
          {item.balance_due > 0 && (
            <View>
              <Text style={styles.amountLabel}>{t('payments.balanceDue')}</Text>
              <Text style={[styles.amountValue, { color: '#c62828' }]}>{fmt(item.balance_due)}</Text>
            </View>
          )}
          <View style={{ alignItems: 'flex-end' }}>
            {item.payment_mode && (
              <View style={[styles.modeTag, { backgroundColor: modeColor + '20' }]}>
                <Text style={[styles.modeTagText, { color: modeColor }]}>{t(`payment.${item.payment_mode}`, item.payment_mode.toUpperCase())}</Text>
              </View>
            )}
            <Text style={styles.dateText}>{dateStr(item.paid_at || item.updated_at)}</Text>
          </View>
        </View>
        {item.remitted_to_admin ? (
          <Text style={styles.remittedText}>{t('payments.handedToAdmin')}</Text>
        ) : item.amount_paid > 0 && item.payment_mode === 'cash' ? (
          <Text style={styles.pendingText}>{t('payments.pendingToAdmin')}</Text>
        ) : null}
      </View>
    </View>
  );
}

export default function MyPaymentsScreen() {
  const { t } = useTranslation();
  const today = new Date();

  const [jobs, setJobs]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState('');
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

  async function load(isRefresh = false, from = fromDate, to = toDate) {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const { data } = await getJobs({
        collected_by: 'me',
        from: fmtISO(from),
        to:   fmtISO(to),
      });
      const sorted = (data.jobs || []).sort((a, b) => {
        const dateA = a.paid_at || a.updated_at;
        const dateB = b.paid_at || b.updated_at;
        return new Date(dateB) - new Date(dateA);
      });
      setJobs(sorted);
    } catch {
      showAlert('', t('common.error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, [fromDate, toDate]));

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

  const totalCollected = displayed.reduce((sum, j) => sum + (j.amount_paid || 0), 0);
  const pendingRemit   = displayed
    .filter(j => !j.remitted_to_admin && j.amount_paid > 0 && j.payment_mode === 'cash')
    .reduce((sum, j) => sum + (j.amount_paid || 0), 0);

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
            {fmtDisplay(fromDate)}  →  {fmtDisplay(toDate)}
          </Text>
        </View>
        <View style={[styles.filterBarChevronWrap, filtersOpen && styles.filterBarChevronWrapOpen]}>
          <Text style={styles.filterBarChevron}>{filtersOpen ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {filtersOpen && (
        <View style={styles.filterCard}>
          <Text style={styles.filterLabel}>{t('payments.dateRange')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
            {PRESETS.map(({ key, tKey }) => {
              const isActive = activePreset === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.presetChip, isActive && styles.presetChipActive]}
                  onPress={() => { setPreset(key); load(false, fromDate, toDate); }}
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
              <Text style={styles.dateBtnValue}>{fmtDisplay(fromDate)}</Text>
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
              <Text style={styles.dateBtnValue}>{fmtDisplay(toDate)}</Text>
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

      {/* Count pill */}
      <View style={styles.countRow}>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{t('payments.countShown', { count: displayed.length })}</Text>
        </View>
      </View>

      <FlatList
        data={displayed}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E85D04']} />}
        ListHeaderComponent={
          displayed.length > 0 ? (
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>{t('payments.totalCollected')}</Text>
                <Text style={[styles.summaryValue, { color: '#2d6a4f' }]}>{fmt(totalCollected)}</Text>
              </View>
              {pendingRemit > 0 && (
                <View style={[styles.summaryCard, { borderLeftColor: '#E85D04' }]}>
                  <Text style={styles.summaryLabel}>{t('payments.pendingHandover')}</Text>
                  <Text style={[styles.summaryValue, { color: '#E85D04' }]}>{fmt(pendingRemit)}</Text>
                </View>
              )}
            </View>
          ) : null
        }
        renderItem={({ item }) => <PaymentRow item={item} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('payments.noPayments')}</Text>
          </View>
        }
      />
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
  filterBarLeft:            { flexDirection: 'row', alignItems: 'center', flex: 1 },
  filterBarIcon:            { fontSize: 15, marginRight: 8 },
  filterBarDate:            { fontSize: 13, fontWeight: '600', color: '#333' },
  filterBarChevronWrap:     { backgroundColor: '#f2f3f7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  filterBarChevronWrapOpen: { backgroundColor: '#fff0e9' },
  filterBarChevron:         { fontSize: 10, color: '#E85D04', fontWeight: '700' },

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

  // Count pill
  countRow:  { paddingHorizontal: 16, paddingTop: 2, paddingBottom: 8 },
  countPill: { alignSelf: 'flex-start', backgroundColor: '#e4e5ea', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  countText: { fontSize: 12, color: '#777', fontWeight: '700' },

  // Summary cards
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#2d6a4f',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
  },
  summaryLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: '800' },

  // Payment card
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
  bikeRow:      { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  bikeIcon:     { fontSize: 14 },
  bikeLine:     { fontSize: 13, color: '#666', fontWeight: '500' },
  platePill:    { backgroundColor: '#1a1a2e', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  platePillText:{ fontSize: 12, fontWeight: '800', color: '#fff', letterSpacing: 0.8 },

  amountRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  amountLabel: { fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  amountValue: { fontSize: 17, fontWeight: '800' },
  modeTag:     { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, marginBottom: 3 },
  modeTagText: { fontSize: 11, fontWeight: '700' },
  dateText:    { fontSize: 12, color: '#aaa' },

  remittedText: { fontSize: 12, color: '#2d6a4f', fontWeight: '600', marginTop: 8 },
  pendingText:  { fontSize: 12, color: '#E85D04', fontWeight: '600', marginTop: 8 },

  empty:    { alignItems: 'center', paddingTop: 80 },
  emptyText:{ fontSize: 16, color: '#bbb', fontWeight: '500' },
});
