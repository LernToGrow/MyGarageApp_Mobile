import { showAlert } from '../../utils/alert'
import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl, TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getJob } from '../../api/job.api';
import useAuthStore from '../../store/authStore';
import StatusPipeline from '../../components/StatusPipeline';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:5000/api';

const SOURCE_KEY = {
  own_stock:          'sourceOwn',
  outsourced:         'sourceOutsourced',
  external_purchase:  'sourceExternal',
  customer_supplied:  'sourceCustomer',
};

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function JobDetailScreen({ route }) {
  const { t }     = useTranslation();
  const { token } = useAuthStore();
  const jobId     = route.params?.jobId;
  const [job, setJob]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sharing, setSharing] = useState(false);

  async function handleSharePdf() {
    if (sharing) return;
    setSharing(true);
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) { showAlert('', t('payment.sharingNotAvailable')); return; }

      const pdfUrl   = `${BASE_URL}/jobs/${jobId}/invoice/pdf`;
      const localUri = `${FileSystem.cacheDirectory}invoice_${job.job_number}.pdf`;

      const result = await FileSystem.downloadAsync(pdfUrl, localUri, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (result.status !== 200) { showAlert('', t('payment.pdfDownloadFailed')); return; }

      await Sharing.shareAsync(result.uri, {
        mimeType: 'application/pdf',
        dialogTitle: t('payment.shareInvoiceTitle'),
        UTI: 'com.adobe.pdf',
      });
    } catch {
      showAlert('', t('payment.pdfDownloadFailed'));
    } finally {
      setSharing(false);
    }
  }

  async function load(isRefresh = false) {
    if (!jobId) return;
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const { data } = await getJob(jobId);
      setJob(data.job || data);
    } catch {
      showAlert(t('common.error'), t('jobDetail.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, [jobId]));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E85D04" />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.center}>
        <Text style={{ color: '#aaa' }}>{t('jobDetail.notFound')}</Text>
      </View>
    );
  }

  const fmt = (n) => `₹${(n ?? 0).toLocaleString('en-IN')}`;
  const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }) : '—';

  const isPaid    = job.status === 'paid';
  const isPartial = job.payment_status === 'partial';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E85D04']} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.jobNumber}>{job.job_number}</Text>
        <View style={[styles.badge, { backgroundColor: isPaid ? '#1b4332' : '#E85D04' }]}>
          <Text style={styles.badgeText}>{t(`jobs.status.${job.status}`, job.status?.replace('_', ' ')).toUpperCase()}</Text>
        </View>
      </View>

      {/* Status pipeline */}
      <View style={styles.pipelineWrap}>
        <StatusPipeline status={job.status} />
      </View>

      {/* Customer + bike */}
      <Section title={t('jobDetail.customer')}>
        <Row label={t('common.name')}  value={job.customer_id?.name} />
        <Row label={t('common.phone')} value={job.customer_id?.phone} />
      </Section>

      <Section title={t('jobDetail.bike')}>
        <Row label={t('jobDetail.makeModel')} value={`${job.bike_id?.make || ''} ${job.bike_id?.model || ''}`.trim()} />
        <Row label={t('jobDetail.plate')}     value={job.bike_id?.plate_number} />
        <Row label={t('jobDetail.year')}      value={job.bike_id?.year} />
        <Row label={t('jobDetail.fuel')}      value={job.bike_id?.fuel_type} />
        <Row label={t('jobDetail.odometer')}  value={job.bike_id?.odometer ? `${job.bike_id.odometer} km` : null} />
      </Section>

      {/* Timeline */}
      <Section title={t('jobDetail.timeline')}>
        <Row label={t('jobDetail.created')}   value={fmtDate(job.created_at)} />
        <Row label={t('jobDetail.inspected')} value={fmtDate(job.inspection_done_at)} />
        <Row label={t('jobDetail.readyBy')}   value={fmtDate(job.estimated_ready_at)} />
        <Row label={t('jobDetail.started')}   value={fmtDate(job.start_time)} />
        <Row label={t('jobDetail.completed')} value={fmtDate(job.end_time)} />
        {job.duration_minutes > 0 && (
          <Row label={t('jobDetail.duration')} value={`${Math.floor(job.duration_minutes / 60)}h ${job.duration_minutes % 60}m`} />
        )}
      </Section>

      {/* Inspection notes */}
      {job.inspection_notes ? (
        <Section title={t('jobDetail.inspectionNotes')}>
          <Text style={styles.notes}>{job.inspection_notes}</Text>
        </Section>
      ) : null}

      {/* Services */}
      {job.services?.length > 0 && (
        <Section title={t('jobDetail.services')}>
          {job.services.map((svc, i) => (
            <View key={svc._id || i} style={styles.lineItem}>
              <View style={styles.lineItemLeft}>
                <Text style={[styles.lineItemName, svc.done && styles.strikethrough]}>{svc.name}</Text>
                {svc.done && <Text style={styles.doneLabel}>{t('jobDetail.done')}</Text>}
              </View>
              <Text style={styles.lineItemPrice}>{fmt(svc.labour_charge)}</Text>
            </View>
          ))}
        </Section>
      )}

      {/* Parts */}
      {job.parts_used?.length > 0 && (
        <Section title={t('jobDetail.parts')}>
          {job.parts_used.map((p, i) => (
            <View key={p._id || i} style={styles.lineItem}>
              <View style={styles.lineItemLeft}>
                <Text style={styles.lineItemName}>{p.name}</Text>
                <Text style={styles.sourceTag}>
                  {t(`jobDetail.${SOURCE_KEY[p.source_type] || 'sourceOwn'}`, p.source_type)}  ×{p.quantity}
                </Text>
              </View>
              <Text style={styles.lineItemPrice}>{fmt(p.total_price)}</Text>
            </View>
          ))}
        </Section>
      )}

      {/* Totals */}
      <Section title={t('jobDetail.invoice')}>
        <Row label={t('jobDetail.subtotal')}  value={fmt(job.subtotal)} />
        <Row label={t('jobDetail.gst')}       value={fmt(job.gst_amount)} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{t('jobDetail.total')}</Text>
          <Text style={styles.totalValue}>{fmt(job.total_amount)}</Text>
        </View>
      </Section>

      {/* Payment */}
      <Section title={t('jobDetail.payment')}>
        <Row label={t('jobDetail.mode')}       value={job.payment_mode} />
        <Row label={t('jobDetail.paid')}        value={fmt(job.amount_paid)} />
        {isPartial && <Row label={t('jobDetail.balanceDue')} value={fmt(job.balance_due)} />}
        <View style={[styles.payStatus, { backgroundColor: isPaid ? '#e8f5e9' : isPartial ? '#fff3e0' : '#fce4ec' }]}>
          <Text style={[styles.payStatusText, { color: isPaid ? '#2d6a4f' : isPartial ? '#e65100' : '#c62828' }]}>
            {isPaid ? t('jobDetail.fullyPaid') : isPartial ? t('jobDetail.partialPayment') : t('jobDetail.unpaid')}
          </Text>
        </View>
        {job.invoice_id?.invoice_number && (
          <Row label={t('jobDetail.invoiceNum')} value={job.invoice_id.invoice_number} />
        )}
      </Section>

      {/* Share PDF — only when invoice exists (done or paid) */}
      {(job.status === 'done' || job.status === 'paid') && (
        <TouchableOpacity
          style={[styles.shareBtn, sharing && { opacity: 0.6 }]}
          onPress={handleSharePdf}
          disabled={sharing}
        >
          {sharing
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.shareBtnText}>📄  {t('payment.shareInvoice')}</Text>
          }
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#f6f6f6' },
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  jobNumber:       { fontSize: 20, fontWeight: '800', color: '#111' },
  badge:           { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText:       { color: '#fff', fontSize: 11, fontWeight: '700' },
  pipelineWrap: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    overflow: 'hidden',
  },
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
  sectionTitle:    { fontSize: 12, fontWeight: '700', color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  row:             { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  rowLabel:        { fontSize: 14, color: '#666' },
  rowValue:        { fontSize: 14, color: '#111', fontWeight: '600', flexShrink: 1, textAlign: 'right', marginLeft: 12 },
  notes:           { fontSize: 14, color: '#444', lineHeight: 20 },
  lineItem:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  lineItemLeft:    { flex: 1 },
  lineItemName:    { fontSize: 14, color: '#111', fontWeight: '600' },
  strikethrough:   { textDecorationLine: 'line-through', color: '#aaa' },
  doneLabel:       { fontSize: 11, color: '#2d6a4f', fontWeight: '700', marginTop: 2 },
  sourceTag:       { fontSize: 12, color: '#888', marginTop: 2 },
  lineItemPrice:   { fontSize: 14, color: '#333', fontWeight: '600', marginLeft: 12 },
  totalRow:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, marginTop: 4 },
  totalLabel:      { fontSize: 16, fontWeight: '800', color: '#111' },
  totalValue:      { fontSize: 16, fontWeight: '800', color: '#E85D04' },
  payStatus:       { borderRadius: 8, padding: 10, marginTop: 8, alignItems: 'center' },
  payStatusText:   { fontWeight: '700', fontSize: 14 },
  shareBtn:        { backgroundColor: '#0077b6', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  shareBtnText:    { color: '#fff', fontSize: 16, fontWeight: '700' },
});
