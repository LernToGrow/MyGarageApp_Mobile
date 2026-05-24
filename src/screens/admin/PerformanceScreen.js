import { showAlert } from '../../utils/alert'
import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { getPerformance } from '../../api/employee.api';

const PERIOD_KEYS = ['today', 'week', 'month'];

function StatCard({ label, value }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function PerformanceScreen({ route }) {
  const { t } = useTranslation();
  const { employeeId } = route.params || {};
  const [period, setPeriod]     = useState('week');
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    if (!employeeId) return;
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await getPerformance(employeeId, period);
      setData(res.data);
    } catch {
      showAlert(t('common.error'), t('performance.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, [employeeId, period]));

  const fmt = (n) => `₹${(n ?? 0).toLocaleString('en-IN')}`;
  const pct = (n) => `${Math.round((n ?? 0) * 100)}%`;
  const dur = (mins) => {
    if (!mins) return '—';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h ? `${h}h ${m}m` : `${m}m`;
  };

  const periodLabel = (key) => {
    const map = { today: 'presets.today', week: 'presets.thisWeek', month: 'presets.thisMonth' };
    return t(map[key]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E85D04']} />}
    >
      <View style={styles.periodRow}>
        {PERIOD_KEYS.map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.periodBtn, period === key && styles.periodBtnActive]}
            onPress={() => setPeriod(key)}
            activeOpacity={0.75}
          >
            <Text style={[styles.periodBtnText, period === key && styles.periodBtnTextActive]}>
              {periodLabel(key)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#E85D04" />
        </View>
      ) : !data ? (
        <View style={styles.center}>
          <Text style={{ color: '#aaa' }}>{t('performance.noData')}</Text>
        </View>
      ) : (
        <>
          <View style={styles.grid}>
            <StatCard label={t('performance.jobsCompleted')} value={data.jobs_completed ?? 0} />
            <StatCard label={t('performance.revenue')}       value={fmt(data.revenue)} />
            <StatCard label={t('performance.avgDuration')}   value={dur(data.avg_duration_minutes)} />
            <StatCard label={t('performance.onTimeRate')}    value={pct(data.on_time_rate)} />
          </View>

          {data.jobs?.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>{t('performance.jobs')}</Text>
              {data.jobs.map((job) => (
                <View key={job._id} style={styles.jobRow}>
                  <View style={styles.jobLeft}>
                    <Text style={styles.jobNum}>{job.job_number}</Text>
                    <Text style={styles.jobCustomer}>{job.customer_id?.name}</Text>
                  </View>
                  <View style={styles.jobRight}>
                    <Text style={styles.jobAmount}>{fmt(job.total_amount)}</Text>
                    {job.duration_minutes > 0 && (
                      <Text style={styles.jobDuration}>{dur(job.duration_minutes)}</Text>
                    )}
                  </View>
                </View>
              ))}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: '#f6f6f6' },
  center:              { paddingTop: 60, alignItems: 'center' },
  periodRow:           { flexDirection: 'row', gap: 10, marginBottom: 20 },
  periodBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
  },
  periodBtnActive:     { backgroundColor: '#E85D04' },
  periodBtnText:       { fontSize: 13, fontWeight: '700', color: '#666' },
  periodBtnTextActive: { color: '#fff' },
  grid:                { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
  },
  statValue:           { fontSize: 24, fontWeight: '800', color: '#111', marginBottom: 4 },
  statLabel:           { fontSize: 13, color: '#666' },
  sectionHeader:       { fontSize: 13, fontWeight: '700', color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  jobRow: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
  },
  jobLeft:             { flex: 1 },
  jobNum:              { fontSize: 12, fontWeight: '700', color: '#888', marginBottom: 2 },
  jobCustomer:         { fontSize: 15, fontWeight: '600', color: '#111' },
  jobRight:            { alignItems: 'flex-end' },
  jobAmount:           { fontSize: 15, fontWeight: '700', color: '#E85D04' },
  jobDuration:         { fontSize: 12, color: '#aaa', marginTop: 2 },
});
