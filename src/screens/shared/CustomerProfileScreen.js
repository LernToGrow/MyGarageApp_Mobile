import { showAlert } from '../../utils/alert'
import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl, TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { getCustomer } from '../../api/customer.api';

const STATUS_COLOR = {
  received:    '#6c757d',
  inspecting:  '#0077b6',
  estimated:   '#9c6644',
  in_progress: '#E85D04',
  done:        '#2d6a4f',
  paid:        '#1b4332',
};

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function BikeCard({ bike }) {
  return (
    <View style={styles.bikeCard}>
      <Text style={styles.bikePlate}>{bike.plate_number}</Text>
      <Text style={styles.bikeDetail}>{bike.make} {bike.model}{bike.year ? ` (${bike.year})` : ''}</Text>
      <Text style={styles.bikeDetail}>{bike.fuel_type}{bike.odometer ? `  ·  ${bike.odometer} km` : ''}</Text>
    </View>
  );
}

export default function CustomerProfileScreen({ route, navigation }) {
  const { t } = useTranslation();
  const customerId = route.params?.customerId;
  const [customer, setCustomer]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    if (!customerId) return;
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const { data } = await getCustomer(customerId);
      setCustomer(data.customer || data);
    } catch {
      showAlert(t('common.error'), t('customer.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, [customerId]));

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#E85D04" /></View>;
  }
  if (!customer) {
    return <View style={styles.center}><Text style={{ color: '#aaa' }}>{t('customer.notFound')}</Text></View>;
  }

  const jobs = customer.jobs || [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E85D04']} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(customer.name || '?')[0].toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.customerName}>{customer.name}</Text>
          <Text style={styles.customerPhone}>{customer.phone}</Text>
        </View>
      </View>

      {/* Details */}
      <Section title={t('customer.details')}>
        <InfoRow label={t('customer.address')}  value={customer.address} />
        <InfoRow label={t('customer.language')} value={customer.language} />
      </Section>

      {/* Bikes */}
      {customer.bikes?.length > 0 && (
        <Section title={t('customer.bikes', { count: customer.bikes.length })}>
          {customer.bikes.map((bike, i) => (
            <BikeCard key={bike._id || i} bike={bike} />
          ))}
        </Section>
      )}

      {/* Job history */}
      {jobs.length > 0 && (
        <Section title={t('customer.jobHistory', { count: jobs.length })}>
          {jobs.map((job) => {
            const color = STATUS_COLOR[job.status] || '#999';
            return (
              <TouchableOpacity
                key={job._id}
                style={styles.jobRow}
                onPress={() => navigation.navigate('JobDetail', { jobId: job._id })}
                activeOpacity={0.75}
              >
                <View style={styles.jobLeft}>
                  <Text style={styles.jobNum}>{job.job_number}</Text>
                  <Text style={styles.jobBike}>
                    {job.bike_id?.make} {job.bike_id?.model}{'  ·  '}{job.bike_id?.plate_number}
                  </Text>
                  <Text style={styles.jobDate}>
                    {new Date(job.created_at).toLocaleDateString('en-IN')}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: color }]}>
                  <Text style={styles.badgeText}>{t(`jobs.status.${job.status}`, job.status?.replace('_', ' ')).toUpperCase()}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </Section>
      )}

      {jobs.length === 0 && customer.bikes?.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('customer.noBikesOrJobs')}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#f6f6f6' },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E85D04',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText:     { color: '#fff', fontSize: 22, fontWeight: '800' },
  customerName:   { fontSize: 20, fontWeight: '800', color: '#111' },
  customerPhone:  { fontSize: 14, color: '#666', marginTop: 2 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  sectionTitle:   { fontSize: 12, fontWeight: '700', color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  infoRow:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  infoLabel:      { fontSize: 14, color: '#666' },
  infoValue:      { fontSize: 14, color: '#111', fontWeight: '600' },
  bikeCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#E85D04',
  },
  bikePlate:      { fontSize: 15, fontWeight: '800', color: '#111', marginBottom: 2 },
  bikeDetail:     { fontSize: 13, color: '#666' },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  jobLeft:        { flex: 1 },
  jobNum:         { fontSize: 12, fontWeight: '700', color: '#888', marginBottom: 2 },
  jobBike:        { fontSize: 14, color: '#333', fontWeight: '600', marginBottom: 2 },
  jobDate:        { fontSize: 12, color: '#aaa' },
  badge:          { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginLeft: 10 },
  badgeText:      { color: '#fff', fontSize: 11, fontWeight: '700' },
  empty:          { alignItems: 'center', paddingTop: 40 },
  emptyText:      { fontSize: 15, color: '#aaa' },
});
