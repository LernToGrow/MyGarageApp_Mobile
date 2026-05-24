import { showAlert } from '../../utils/alert'
import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { getSummary, getAlerts } from '../../api/dashboard.api';
import { getJobs } from '../../api/job.api';

const STATUS_COLOR = {
  received:    '#6c757d',
  inspecting:  '#0077b6',
  estimated:   '#9c6644',
  in_progress: '#E85D04',
  done:        '#2d6a4f',
  paid:        '#1b4332',
};

function LiveJobRow({ job, onPress }) {
  const { t } = useTranslation();
  const color = STATUS_COLOR[job.status] || '#999';
  return (
    <TouchableOpacity style={styles.jobRow} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.jobRowLeft}>
        <Text style={styles.jobNum}>{job.job_number}</Text>
        <Text style={styles.jobCustomer}>{job.customer_id?.name}</Text>
        <Text style={styles.jobBike}>
          {job.bike_id?.make} {job.bike_id?.model}{'  ·  '}{job.bike_id?.plate_number}
        </Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: color }]}>
        <Text style={styles.statusBadgeText}>{t(`jobs.status.${job.status}`)}</Text>
      </View>
    </TouchableOpacity>
  );
}

function MetricCard({ label, value, accent, onPress }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={[styles.card, accent && { borderLeftColor: accent, borderLeftWidth: 4 }]} onPress={onPress} activeOpacity={0.75}>
      <Text style={styles.cardValue}>{value}</Text>
      <Text style={styles.cardLabel}>{label}</Text>
    </Wrapper>
  );
}

function AlertRow({ icon, text, count }) {
  if (!count) return null;
  return (
    <View style={styles.alertRow}>
      <Text style={styles.alertIcon}>{icon}</Text>
      <Text style={styles.alertText}>{text}</Text>
      <View style={styles.alertBadge}>
        <Text style={styles.alertBadgeText}>{count}</Text>
      </View>
    </View>
  );
}

export default function DashboardScreen({ navigation }) {
  const { t } = useTranslation();
  const [summary, setSummary]     = useState(null);
  const [alerts, setAlerts]       = useState(null);
  const [liveJobs, setLiveJobs]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const [sumRes, alertRes, jobsRes] = await Promise.all([
        getSummary(),
        getAlerts(),
        getJobs({ status: 'received,inspecting,estimated,in_progress' }),
      ]);
      setSummary(sumRes.data);
      setAlerts(alertRes.data);
      setLiveJobs(jobsRes.data.jobs || []);
    } catch {
      showAlert(t('common.error'), t('dashboard.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E85D04" />
      </View>
    );
  }

  const fmt = (n) => `₹${(n ?? 0).toLocaleString('en-IN')}`;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E85D04']} />
      }
    >
      <Text style={styles.sectionHeader}>{t('dashboard.today')}</Text>

      <View style={styles.grid}>
        <MetricCard label={t('dashboard.activeJobs')}   value={summary?.active_jobs       ?? 0} accent="#0077b6" onPress={() => navigation.navigate('Jobs',    { filterStatus: 'active' })} />
        <MetricCard label={t('dashboard.doneToday')}    value={summary?.done_jobs_today   ?? 0} accent="#2d6a4f" onPress={() => navigation.navigate('Jobs',    { filterStatus: 'done,paid', filterPreset: 'today' })} />
        <MetricCard label={t('dashboard.todayRevenue')} value={fmt(summary?.today_revenue)}      accent="#E85D04" onPress={() => navigation.navigate('Revenue', { filterPreset: 'today' })} />
        <MetricCard label={t('dashboard.pendingDues')}  value={fmt(summary?.total_pending_dues)}  accent="#c62828" onPress={() => navigation.navigate('Payments', { filterStatus: 'pending' })} />
      </View>

      <Text style={[styles.sectionHeader, { marginTop: 24 }]}>{t('dashboard.liveJobs')}</Text>
      {liveJobs.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>{t('dashboard.noActiveJobs')}</Text>
        </View>
      ) : (
        <View style={styles.jobsCard}>
          {liveJobs.map((job) => (
            <LiveJobRow
              key={job._id}
              job={job}
              onPress={() => navigation.navigate('JobDetail', { jobId: job._id })}
            />
          ))}
        </View>
      )}

      {alerts && (
        <>
          <Text style={[styles.sectionHeader, { marginTop: 24 }]}>{t('dashboard.alerts')}</Text>
          <View style={styles.alertsCard}>
            <AlertRow icon="⚠️" text={t('dashboard.lowStockParts')}    count={alerts.low_stock_parts?.length} />
            <AlertRow icon="💰" text={t('dashboard.overduePayments')}  count={alerts.overdue_payments?.length} />
            {!alerts.low_stock_parts?.length && !alerts.overdue_payments?.length && (
              <Text style={styles.allClear}>{t('dashboard.allClear')}</Text>
            )}
          </View>

          {alerts.low_stock_parts?.length > 0 && (
            <>
              <Text style={[styles.sectionHeader, { marginTop: 24 }]}>{t('dashboard.lowStock')}</Text>
              {alerts.low_stock_parts.map((p) => (
                <TouchableOpacity
                  key={p._id}
                  style={styles.alertDetailRow}
                  onPress={() => navigation.navigate('Inventory', { editPartId: p._id })}
                  activeOpacity={0.75}
                >
                  <Text style={styles.alertDetailName}>{p.name_en}</Text>
                  <Text style={styles.alertDetailQty}>
                    {t('dashboard.qtyMin', { qty: p.quantity, min: p.min_quantity })}
                  </Text>
                  <Text style={styles.alertDetailArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#f6f6f6' },
  center:           { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionHeader:    { fontSize: 13, fontWeight: '700', color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  grid:             { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardValue:        { fontSize: 24, fontWeight: '800', color: '#111', marginBottom: 4 },
  cardLabel:        { fontSize: 13, color: '#666' },
  alertsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  alertRow:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  alertIcon:        { fontSize: 18, marginRight: 10 },
  alertText:        { flex: 1, fontSize: 15, color: '#333' },
  alertBadge:       { backgroundColor: '#c62828', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  alertBadgeText:   { color: '#fff', fontSize: 12, fontWeight: '700' },
  allClear:         { color: '#2d6a4f', fontSize: 15, textAlign: 'center', paddingVertical: 8 },
  alertDetailRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 8, elevation: 1 },
  alertDetailName:  { fontSize: 15, color: '#333', fontWeight: '600', flex: 1 },
  alertDetailQty:   { fontSize: 13, color: '#c62828', marginRight: 6 },
  alertDetailArrow: { fontSize: 20, color: '#ccc' },
  jobsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  jobRowLeft:       { flex: 1 },
  jobNum:           { fontSize: 13, fontWeight: '700', color: '#E85D04', marginBottom: 2 },
  jobCustomer:      { fontSize: 15, fontWeight: '600', color: '#111', marginBottom: 2 },
  jobBike:          { fontSize: 13, color: '#666' },
  statusBadge:      { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText:  { color: '#fff', fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  emptyText:        { color: '#aaa', fontSize: 15 },
});
