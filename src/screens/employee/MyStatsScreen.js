import { showAlert } from '../../utils/alert';
import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { getPerformance } from '../../api/employee.api';
import useAuthStore from '../../store/authStore';

const PERIOD_KEYS = ['today', 'week', 'month'];

function StatCard({ label, value, accent }) {
  return (
    <View style={[styles.statCard, accent && { borderLeftWidth: 4, borderLeftColor: accent }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function MyStatsScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [period, setPeriod]         = useState('week');
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    if (!user?._id) return;
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await getPerformance(user._id, period);
      setData(res.data);
    } catch {
      showAlert(t('common.error'), t('performance.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, [user?._id, period]));

  const fmt = (n) => `₹${(n ?? 0).toLocaleString('en-IN')}`;
  const pct = (n) => `${Math.round((n ?? 0) * 100)}%`;
  const dur = (mins) => {
    if (!mins) return '—';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h ? `${h}h ${m}m` : `${m}m`;
  };

  const isOnTime = (job) =>
    job.estimated_ready_at && job.end_time &&
    new Date(job.end_time) <= new Date(job.estimated_ready_at);

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
            <StatCard label={t('performance.jobsCompleted')} value={data.jobs_completed ?? 0} accent="#0077b6" />
            <StatCard label={t('performance.revenue')}       value={fmt(data.revenue)}        accent="#E85D04" />
            <StatCard label={t('performance.onTimeCount')}   value={data.on_time_count ?? 0}  accent="#2d6a4f" />
            <StatCard label={t('performance.lateCount')}     value={data.late_count ?? 0}     accent="#c62828" />
            <StatCard label={t('performance.avgDuration')}   value={dur(data.avg_duration_minutes)} accent="#9c6644" />
            <StatCard label={t('performance.onTimeRate')}    value={pct(data.on_time_rate)}   accent="#2d6a4f" />
          </View>

          {data.jobs?.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>{t('performance.jobs')}</Text>
              <View style={styles.jobsCard}>
                {data.jobs.map((job, idx) => {
                  const onTime = isOnTime(job);
                  return (
                    <View key={job._id} style={[styles.jobRow, idx > 0 && styles.jobRowBorder]}>
                      <View style={styles.jobLeft}>
                        <Text style={styles.jobNum}>{job.job_number}</Text>
                        <Text style={styles.jobCustomer}>{job.customer_id?.name}</Text>
                        {job.bike_id?.plate_number ? (
                          <Text style={styles.jobBike}>{job.bike_id.make} {job.bike_id.model} · {job.bike_id.plate_number}</Text>
                        ) : null}
                      </View>
                      <View style={styles.jobRight}>
                        <Text style={styles.jobAmount}>{fmt(job.total_amount)}</Text>
                        {job.duration_minutes > 0 && (
                          <Text style={styles.jobDuration}>{dur(job.duration_minutes)}</Text>
                        )}
                        {job.estimated_ready_at ? (
                          <View style={[styles.badge, { backgroundColor: onTime ? '#e8f5e9' : '#fff5f5' }]}>
                            <Text style={[styles.badgeText, { color: onTime ? '#2d6a4f' : '#c62828' }]}>
                              {onTime ? `✓ ${t('performance.onTime')}` : `✗ ${t('performance.late')}`}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
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
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  statValue:           { fontSize: 24, fontWeight: '800', color: '#111', marginBottom: 4 },
  statLabel:           { fontSize: 13, color: '#666' },
  sectionHeader:       { fontSize: 13, fontWeight: '700', color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
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
  jobRow:              { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  jobRowBorder:        { borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  jobLeft:             { flex: 1 },
  jobNum:              { fontSize: 13, fontWeight: '700', color: '#E85D04', marginBottom: 2 },
  jobCustomer:         { fontSize: 15, fontWeight: '600', color: '#111', marginBottom: 2 },
  jobBike:             { fontSize: 13, color: '#666' },
  jobRight:            { alignItems: 'flex-end' },
  jobAmount:           { fontSize: 15, fontWeight: '700', color: '#111' },
  jobDuration:         { fontSize: 12, color: '#aaa', marginTop: 2 },
  badge:               { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 5 },
  badgeText:           { fontSize: 11, fontWeight: '700' },
});
