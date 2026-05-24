import { showAlert } from '../../utils/alert'
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { getMonthly } from '../../api/dashboard.api';
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
function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfToday() {
  const d = new Date(); d.setHours(23, 59, 59, 999); return d;
}

const PRESETS = [
  { key: 'today', tKey: 'presets.today' },
  { key: 'week',  tKey: 'presets.thisWeek' },
  { key: 'month', tKey: 'presets.thisMonth' },
  { key: 'last3', tKey: 'presets.last3' },
];

function StatRow({ label, value, highlight }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>{value}</Text>
    </View>
  );
}

export default function RevenueScreen({ navigation, route }) {
  const { t, i18n } = useTranslation();
  const today = new Date();

  const initPreset = route?.params?.filterPreset || 'month';
  const [fromDate, setFromDate]   = useState(
    initPreset === 'today' ? new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0) : startOfMonth(today)
  );
  const [toDate,   setToDate]     = useState(today);
  const [activePreset, setActivePreset] = useState(initPreset);

  const [showPicker, setShowPicker]     = useState(false);
  const [pickerTarget, setPickerTarget] = useState('from');

  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  async function load(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await getMonthly(fmtISO(fromDate), fmtISO(toDate));
      setData(res.data);
    } catch {
      showAlert(t('common.error'), t('revenue.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [fromDate, toDate]);
  useFocusEffect(useCallback(() => { load(); }, []));

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

  const fmt = (n) => `₹${(n ?? 0).toLocaleString('en-IN')}`;
  const dur = (mins) => {
    if (!mins) return '—';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E85D04']} />
      }
    >
      <View style={styles.rangeCard}>
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
      </View>

      <DatePickerModal
        visible={showPicker}
        value={pickerTarget === 'from' ? fromDate : toDate}
        maximumDate={pickerTarget === 'to' ? endOfToday() : undefined}
        minimumDate={pickerTarget === 'to' ? fromDate : undefined}
        onConfirm={onConfirmPicker}
        onCancel={() => setShowPicker(false)}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#E85D04" />
        </View>
      ) : (
        <>
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>{t('revenue.totalRevenue')}</Text>
            <Text style={styles.heroValue}>{fmt(data?.total_revenue)}</Text>
            <Text style={styles.heroSub}>{fmtDisplay(fromDate, i18n.language)} – {fmtDisplay(toDate, i18n.language)}</Text>
          </View>

          <View style={styles.splitRow}>
            <View style={[styles.splitCard, { borderLeftColor: '#2d6a4f' }]}>
              <Text style={styles.splitValue}>{fmt(data?.cash_collected)}</Text>
              <Text style={styles.splitLabel}>{t('revenue.cash')}</Text>
            </View>
            <View style={[styles.splitCard, { borderLeftColor: '#0077b6' }]}>
              <Text style={styles.splitValue}>{fmt(data?.online_collected)}</Text>
              <Text style={styles.splitLabel}>{t('revenue.onlineUpi')}</Text>
            </View>
          </View>

          <View style={styles.statsCard}>
            <StatRow label={t('revenue.totalJobs')}   value={data?.total_jobs ?? 0} />
            <StatRow label={t('revenue.pendingDues')} value={fmt(data?.pending_dues)} highlight />
            <StatRow label={t('revenue.onTimeRate')}  value={data?.on_time_rate ?? '—'} />
            <StatRow label={t('revenue.avgDuration')} value={dur(data?.avg_job_duration_minutes)} />
          </View>

          <TouchableOpacity
            style={styles.paymentsBtn}
            onPress={() => navigation.navigate('Payments')}
            activeOpacity={0.8}
          >
            <Text style={styles.paymentsBtnText}>{t('revenue.viewPayments')}</Text>
            <Text style={styles.paymentsBtnArrow}>›</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f6f6' },
  center:    { paddingTop: 60, alignItems: 'center' },

  rangeCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
  },
  filterLabel:        { fontSize: 11, fontWeight: '700', color: '#E85D04', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  presetRow:          { gap: 8, marginBottom: 14 },
  presetChip:         { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#e0e0e0' },
  presetChipActive:   { backgroundColor: '#E85D04' },
  presetChipText:     { fontSize: 13, color: '#555', fontWeight: '600' },
  presetChipTextActive: { color: '#fff' },

  rangeRow: { flexDirection: 'row', alignItems: 'center' },
  dateBtn: {
    flex: 1,
    backgroundColor: '#f6f6f6',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
  },
  dateBtnActive: { borderColor: '#E85D04', backgroundColor: '#fff7f3' },
  dateBtnLabel:  { fontSize: 10, color: '#E85D04', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  dateBtnValue:  { fontSize: 14, fontWeight: '700', color: '#111' },

  rangeSeparator:     { paddingHorizontal: 10 },
  rangeSeparatorText: { fontSize: 18, color: '#E85D04' },

  heroCard: {
    backgroundColor: '#E85D04',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#E85D04',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  heroLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginBottom: 6 },
  heroValue: { fontSize: 36, fontWeight: '800', color: '#fff' },
  heroSub:   { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 6 },

  splitRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  splitCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
  },
  splitValue: { fontSize: 20, fontWeight: '800', color: '#111', marginBottom: 4 },
  splitLabel: { fontSize: 13, color: '#666' },

  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
  },
  statRow:             { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  statLabel:           { fontSize: 15, color: '#555' },
  statValue:           { fontSize: 15, fontWeight: '700', color: '#111' },
  statValueHighlight:  { color: '#c62828' },

  paymentsBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#E85D04',
  },
  paymentsBtnText:  { fontSize: 15, fontWeight: '700', color: '#E85D04' },
  paymentsBtnArrow: { fontSize: 22, color: '#E85D04' },
});
