import { showAlert } from '../../utils/alert'
import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { getJobs, deleteJob } from '../../api/job.api';
import useJobStore from '../../store/jobStore';

const STATUS_ORDER = ['received', 'inspecting', 'estimated', 'in_progress', 'done'];
const STATUS_COLOR = {
  received:    '#6c757d',
  inspecting:  '#0077b6',
  estimated:   '#9c6644',
  in_progress: '#E85D04',
  done:        '#2d6a4f',
  delivered:   '#999',
};

function JobCard({ job, onPress, onLongPress }) {
  const { t } = useTranslation();
  const statusKey = `jobs.status.${job.status}`;
  const color = STATUS_COLOR[job.status] || '#999';
  const canDelete = job.status === 'received';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.75}>
      <View style={styles.cardTop}>
        <Text style={styles.jobNum}>{job.job_number}</Text>
        <View style={[styles.badge, { backgroundColor: color }]}>
          <Text style={styles.badgeText}>{t(statusKey)}</Text>
        </View>
      </View>
      <Text style={styles.customerName}>{job.customer_id?.name}</Text>
      <Text style={styles.bikeLine}>
        {job.bike_id?.make} {job.bike_id?.model}
        {'  ·  '}{job.bike_id?.plate_number}
      </Text>
      {job.estimated_ready_at && (
        <Text style={styles.eta}>
          {t('jobs.estimatedReady')}: {new Date(job.estimated_ready_at).toLocaleTimeString('en-IN', {
            hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
          })}
        </Text>
      )}
      {canDelete && (
        <Text style={styles.deleteHint}>{t('jobs.holdToDelete') || 'Hold to delete'}</Text>
      )}
    </TouchableOpacity>
  );
}

export default function MyJobsScreen({ navigation }) {
  const { t }           = useTranslation();
  const { setActiveJob } = useJobStore();
  const [jobs, setJobs]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchJobs(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const { data } = await getJobs({ status: STATUS_ORDER.join(',') });
      // Sort by STATUS_ORDER then by created_at
      const sorted = (data.jobs || []).sort((a, b) => {
        const si = STATUS_ORDER.indexOf(a.status);
        const sj = STATUS_ORDER.indexOf(b.status);
        if (si !== sj) return si - sj;
        return new Date(b.created_at) - new Date(a.created_at);
      });
      setJobs(sorted);
    } catch {
      showAlert('', t('common.error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchJobs(); }, []));

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

  function openJob(job) {
    setActiveJob(job);
    // Route to the right screen based on job status
    const dest = {
      received:    'Inspection',
      inspecting:  'Inspection',
      estimated:   'Estimate',
      in_progress: 'JobCard',
      done:        'Payment',
    }[job.status] || 'JobDetail';
    navigation.navigate(dest);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E85D04" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <JobCard job={item} onPress={() => openJob(item)} onLongPress={() => handleDeleteJob(item)} />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchJobs(true)} colors={['#E85D04']} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('jobs.noActiveJobs')}</Text>
          </View>
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => { setActiveJob(null); navigation.navigate('AddBike'); }}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+ {t('jobs.newJob')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f6f6f6' },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardTop:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  jobNum:       { fontSize: 13, fontWeight: '700', color: '#555', letterSpacing: 0.5 },
  badge:        { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:    { color: '#fff', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  customerName: { fontSize: 17, fontWeight: '700', color: '#111', marginBottom: 2 },
  bikeLine:     { fontSize: 14, color: '#666' },
  eta:          { fontSize: 13, color: '#E85D04', marginTop: 6, fontWeight: '600' },
  deleteHint:   { fontSize: 10, color: '#ccc', marginTop: 4 },
  empty:        { alignItems: 'center', paddingTop: 80 },
  emptyText:    { fontSize: 16, color: '#aaa' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: '#E85D04',
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 22,
    elevation: 5,
    shadowColor: '#E85D04',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
