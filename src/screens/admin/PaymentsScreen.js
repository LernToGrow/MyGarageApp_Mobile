import { showAlert } from '../../utils/alert'
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, RefreshControl, ActivityIndicator,
  Modal, ScrollView, Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import DatePickerModal from '../../components/DatePickerModal';
import { getPayments } from '../../api/dashboard.api';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function fmtDisplay(d) {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfToday()    { const d = new Date(); d.setHours(23,59,59,999); return d; }

const MODE_OPTIONS   = ['all', 'cash', 'online'];
const STATUS_OPTIONS = ['all', 'paid', 'partial', 'pending'];
const PRESETS = [
  { key: 'today', tKey: 'presets.today' },
  { key: 'week',  tKey: 'presets.thisWeek' },
  { key: 'month', tKey: 'presets.thisMonth' },
  { key: 'last3', tKey: 'presets.last3' },
];

const STATUS_COLOR = { paid: '#2d6a4f', partial: '#e65100', pending: '#c62828' };
const MODE_COLOR   = { cash: '#2d6a4f', online: '#0077b6' };

function fmt(n)  { return `₹${(n ?? 0).toLocaleString('en-IN')}`; }
function dateStr(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}

function FilterPill({ label, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.pill, active && styles.pillActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function DetailModal({ item, onClose }) {
  const { t } = useTranslation();
  if (!item) return null;
  const statusColor = STATUS_COLOR[item.payment_status] || '#888';
  const modeColor   = MODE_COLOR[item.payment_mode]    || '#888';

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View style={styles.detailHeader}>
            <View>
              <Text style={styles.detailJobNum}>{item.job_number}</Text>
              <Text style={styles.detailCustomer}>{item.customer_id?.name || '—'}</Text>
              {item.customer_id?.phone && (
                <Text style={styles.detailPhone}>{item.customer_id.phone}</Text>
              )}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusBadgeText}>{item.payment_status}</Text>
            </View>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.amountRow}>
            <View style={styles.amountBox}>
              <Text style={styles.amountLabel}>{t('payments.totalBill')}</Text>
              <Text style={styles.amountValue}>{fmt(item.total_amount)}</Text>
            </View>
            <View style={styles.amountBox}>
              <Text style={styles.amountLabel}>{t('payments.paid')}</Text>
              <Text style={[styles.amountValue, { color: '#2d6a4f' }]}>{fmt(item.amount_paid)}</Text>
            </View>
            <View style={styles.amountBox}>
              <Text style={styles.amountLabel}>{t('payments.balanceDue')}</Text>
              <Text style={[styles.amountValue, { color: item.balance_due > 0 ? '#c62828' : '#2d6a4f' }]}>
                {fmt(item.balance_due)}
              </Text>
            </View>
          </View>

          <View style={styles.detailDivider} />

          <DetailRow label={t('payment.paymentMode')} value={item.payment_mode || '—'} color={item.payment_mode ? modeColor : undefined} />
          <DetailRow label={t('payments.paidOn')}     value={dateStr(item.paid_at)} />
          <DetailRow label={t('payments.jobStatus')}  value={item.status ? t(`jobs.status.${item.status}`) : '—'} color={STATUS_COLOR[item.status]} />
          {item.bike_id && (
            <DetailRow label={t('payments.vehicle')} value={`${item.bike_id.make || ''} ${item.bike_id.model || ''} · ${item.bike_id.plate_number || ''}`.trim()} />
          )}
        </ScrollView>

        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
          <Text style={styles.closeBtnText}>{t('common.close')}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value, color }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, color && { color }]}>{value}</Text>
    </View>
  );
}

function PaymentRow({ item, onPress }) {
  const statusColor = STATUS_COLOR[item.payment_status] || '#888';
  const modeColor   = MODE_COLOR[item.payment_mode]    || '#888';
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.rowLeft}>
        <Text style={styles.jobNum}>{item.job_number}</Text>
        <Text style={styles.customerName}>{item.customer_id?.name || '—'}</Text>
        <Text style={styles.dateLine}>{dateStr(item.paid_at)}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.amountText}>{fmt(item.amount_paid)}</Text>
        {item.balance_due > 0 && (
          <Text style={styles.dueText}>Due: {fmt(item.balance_due)}</Text>
        )}
        <View style={styles.tagsRow}>
          {item.payment_mode && (
            <View style={[styles.tag, { backgroundColor: modeColor + '20' }]}>
              <Text style={[styles.tagText, { color: modeColor }]}>{item.payment_mode}</Text>
            </View>
          )}
          <View style={[styles.tag, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.tagText, { color: statusColor }]}>{item.payment_status}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function PaymentsScreen({ route }) {
  const { t } = useTranslation();
  const today = new Date();

  const [fromDate, setFromDate]         = useState(startOfMonth(today));
  const [toDate,   setToDate]           = useState(today);
  const [activePreset, setActivePreset] = useState('month');

  const [showPicker, setShowPicker]     = useState(false);
  const [pickerTarget, setPickerTarget] = useState('from');

  const [modeFilter, setModeFilter]     = useState('all');
  const [statusFilter, setStatusFilter] = useState(route?.params?.filterStatus || 'all');
  const [search, setSearch]             = useState('');
  const [filtersOpen, setFiltersOpen]   = useState(false);

  const [payments, setPayments]         = useState([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [pages, setPages]               = useState(1);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [loadingMore, setLoadingMore]   = useState(false);

  const [selected, setSelected]         = useState(null);

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

  async function load(isRefresh = false, resetPage = true) {
    try {
      if (isRefresh) setRefreshing(true); else if (resetPage) setLoading(true);
      const p = resetPage ? 1 : page;
      const res = await getPayments(fmtISO(fromDate), fmtISO(toDate), p);
      const list = res.data.payments || [];
      if (resetPage) { setPayments(list); setPage(1); }
      else           { setPayments((prev) => [...prev, ...list]); }
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch {
      showAlert(t('common.error'), t('payments.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => { load(); }, [fromDate, toDate]);
  useFocusEffect(useCallback(() => { load(); }, []));

  async function loadMore() {
    if (loadingMore || page >= pages) return;
    setLoadingMore(true);
    const next = page + 1;
    setPage(next);
    try {
      const res = await getPayments(fmtISO(fromDate), fmtISO(toDate), next);
      setPayments((prev) => [...prev, ...(res.data.payments || [])]);
      setPages(res.data.pages);
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  }

  const displayed = payments.filter((p) => {
    if (modeFilter   !== 'all' && p.payment_mode   !== modeFilter)   return false;
    if (statusFilter !== 'all' && p.payment_status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const hit =
        p.job_number?.toLowerCase().includes(q) ||
        p.customer_id?.name?.toLowerCase().includes(q) ||
        p.customer_id?.phone?.includes(q);
      if (!hit) return false;
    }
    return true;
  });

  const pillLabel = (val, domain) => {
    if (val === 'all') return t('common.all');
    if (domain === 'mode')   return t(`payment.${val}`);
    return val;
  };

  return (
    <View style={styles.container}>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('payments.searchPlaceholder')}
          placeholderTextColor="#aaa"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Compact filter summary bar */}
      <TouchableOpacity style={styles.filterBar} onPress={() => setFiltersOpen((v) => !v)} activeOpacity={0.8}>
        <View style={styles.filterBarLeft}>
          <Text style={styles.filterBarDate}>{fmtDisplay(fromDate)} → {fmtDisplay(toDate)}</Text>
          {statusFilter !== 'all' && (
            <View style={styles.filterBarBadge}>
              <Text style={styles.filterBarBadgeText}>{statusFilter}</Text>
            </View>
          )}
          {modeFilter !== 'all' && (
            <View style={[styles.filterBarBadge, { backgroundColor: '#0077b6' }]}>
              <Text style={styles.filterBarBadgeText}>{pillLabel(modeFilter, 'mode')}</Text>
            </View>
          )}
        </View>
        <Text style={styles.filterBarChevron}>{filtersOpen ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {filtersOpen && (
        <View style={styles.filterPanel}>
          <Text style={styles.dateFilterLabel}>{t('jobs.dateFilter')}</Text>
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
              <Text style={styles.dateBtnValue}>{fmtDisplay(fromDate)}</Text>
            </TouchableOpacity>
            <Text style={styles.rangeSep}>→</Text>
            <TouchableOpacity
              style={[styles.dateBtn, pickerTarget === 'to' && showPicker && styles.dateBtnActive]}
              onPress={() => openPicker('to')}
              activeOpacity={0.8}
            >
              <Text style={styles.dateBtnLabel}>{t('common.to')}</Text>
              <Text style={styles.dateBtnValue}>{fmtDisplay(toDate)}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.panelDivider} />

          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>{t('payments.mode')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillGroup}>
              {MODE_OPTIONS.map((m) => (
                <FilterPill key={m} label={pillLabel(m, 'mode')} active={modeFilter === m} onPress={() => setModeFilter(m)} />
              ))}
            </ScrollView>
          </View>

          <View style={[styles.filterRow, { marginBottom: 0 }]}>
            <Text style={styles.filterLabel}>{t('payments.status')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillGroup}>
              {STATUS_OPTIONS.map((s) => (
                <FilterPill key={s} label={s === 'all' ? t('common.all') : s} active={statusFilter === s} onPress={() => { setStatusFilter(s); setFiltersOpen(false); }} />
              ))}
            </ScrollView>
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

      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {t('payments.count', { shown: displayed.length, total })}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#E85D04" />
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <PaymentRow item={item} onPress={() => setSelected(item)} />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E85D04']} />}
          ListEmptyComponent={<Text style={styles.emptyText}>{t('payments.noPayments')}</Text>}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator color="#E85D04" style={{ marginVertical: 16 }} /> : null}
        />
      )}

      <DetailModal item={selected} onClose={() => setSelected(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f6f6f6' },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  searchInput:  { flex: 1, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: '#111' },
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
  filterBarBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  filterBarChevron:   { fontSize: 10, color: '#E85D04', fontWeight: '700', marginLeft: 8 },
  filterPanel: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 8,
    borderRadius: 14,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
  },
  dateFilterLabel:      { fontSize: 11, fontWeight: '700', color: '#E85D04', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  presetRow:            { gap: 8, marginBottom: 12 },
  presetChip:           { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#e0e0e0' },
  presetChipActive:     { backgroundColor: '#E85D04' },
  presetChipText:       { fontSize: 13, color: '#555', fontWeight: '600' },
  presetChipTextActive: { color: '#fff' },

  rangeRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 0 },
  dateBtn:       { flex: 1, backgroundColor: '#f6f6f6', borderRadius: 10, padding: 10, borderWidth: 1.5, borderColor: '#e0e0e0' },
  dateBtnActive: { borderColor: '#E85D04', backgroundColor: '#fff7f3' },
  dateBtnLabel:  { fontSize: 10, color: '#E85D04', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  dateBtnValue:  { fontSize: 13, fontWeight: '700', color: '#111' },
  rangeSep:      { paddingHorizontal: 10, fontSize: 18, color: '#E85D04' },

  panelDivider:  { height: 1, backgroundColor: '#f0f0f0', marginVertical: 12 },

  filterRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  filterLabel:   { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, width: 54 },
  pillGroup:     { gap: 8, flexDirection: 'row' },
  pill:          { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 5, backgroundColor: '#e0e0e0' },
  pillActive:    { backgroundColor: '#E85D04' },
  pillText:      { fontSize: 13, color: '#555', fontWeight: '600', textTransform: 'capitalize' },
  pillTextActive:{ color: '#fff' },

  countRow:  { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  countText: { fontSize: 12, color: '#aaa', fontWeight: '600' },

  row: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
  },
  rowLeft:      { flex: 1, gap: 2 },
  jobNum:       { fontSize: 11, fontWeight: '700', color: '#aaa', letterSpacing: 0.5 },
  customerName: { fontSize: 16, fontWeight: '700', color: '#111' },
  dateLine:     { fontSize: 12, color: '#999' },
  rowRight:     { alignItems: 'flex-end', gap: 3 },
  amountText:   { fontSize: 17, fontWeight: '800', color: '#111' },
  dueText:      { fontSize: 12, color: '#c62828', fontWeight: '600' },
  tagsRow:      { flexDirection: 'row', gap: 4, marginTop: 2 },
  tag:          { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  tagText:      { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  emptyText:    { fontSize: 16, color: '#aaa', textAlign: 'center', marginTop: 60 },

  overlay:      { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  sheetHandle:  { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },

  detailHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  detailJobNum:   { fontSize: 13, fontWeight: '700', color: '#aaa', letterSpacing: 0.5, marginBottom: 2 },
  detailCustomer: { fontSize: 20, fontWeight: '800', color: '#111' },
  detailPhone:    { fontSize: 14, color: '#666', marginTop: 2 },
  statusBadge:    { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText:{ color: '#fff', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },

  detailDivider:  { height: 1, backgroundColor: '#f0f0f0', marginVertical: 16 },

  amountRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  amountBox:    { flex: 1, alignItems: 'center' },
  amountLabel:  { fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  amountValue:  { fontSize: 18, fontWeight: '800', color: '#111' },

  detailRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  detailLabel:  { fontSize: 14, color: '#888' },
  detailValue:  { fontSize: 14, fontWeight: '600', color: '#111', textTransform: 'capitalize', maxWidth: '55%', textAlign: 'right' },

  closeBtn:     { margin: 16, backgroundColor: '#E85D04', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  closeBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
