import { showAlert } from '../../utils/alert'
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { recordPayment, getInvoice } from '../../api/job.api';
import useJobStore from '../../store/jobStore';
import useAuthStore from '../../store/authStore';

const PAYMENT_MODES = ['cash', 'online', 'upi'];

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:5000/api';

export default function PaymentScreen({ navigation }) {
  const { t }                         = useTranslation();
  const { activeJob, updateActiveJob } = useJobStore();
  const { token, user }                = useAuthStore();

  const job      = activeJob;
  const isPaid   = job?.payment_status === 'paid';
  const totalDue = job?.payment_status === 'partial'
    ? (job?.balance_due || 0)
    : (job?.total_amount || 0);

  const [mode, setMode]           = useState('cash');
  const [amount, setAmount]       = useState(String(Math.round(totalDue)));
  const [saving, setSaving]       = useState(false);
  const [invoice, setInvoice]     = useState(null);
  const [sharing, setSharing]     = useState(false);
  const [paidDone, setPaidDone]   = useState(false);

  async function handleRecord() {
    const paid = parseFloat(amount);
    if (!paid || paid <= 0) { showAlert('', t('payment.enterValidAmount')); return; }
    setSaving(true);
    try {
      const { data } = await recordPayment(job._id, { payment_mode: mode, amount_paid: paid });
      updateActiveJob(data.job);

      const status = data.job.payment_status;

      if (status === 'paid') {
        // Fetch invoice metadata
        try {
          const inv = await getInvoice(job._id);
          setInvoice(inv.data.invoice);
        } catch {}
        setPaidDone(true);
      } else {
        showAlert(
          t('payment.partialPayment'),
          t('payment.balanceDueAmount', { amount: data.job.balance_due?.toFixed(2) }),
          [{ text: t('common.ok') }]
        );
      }
    } catch (err) {
      showAlert('', err.response?.data?.error || t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  async function handleShareInvoice() {
    if (sharing) return;
    setSharing(true);
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        showAlert('', t('payment.sharingNotAvailable'));
        return;
      }

      const pdfUrl   = `${BASE_URL}/jobs/${job._id}/invoice/pdf`;
      const localUri = `${FileSystem.cacheDirectory}invoice_${job.job_number}.pdf`;

      const result = await FileSystem.downloadAsync(pdfUrl, localUri, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (result.status !== 200) {
        showAlert('', t('payment.pdfDownloadFailed'));
        return;
      }

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

  function handleWhatsApp() {
    const phone = job?.customer_id?.phone?.replace(/\D/g, '');
    if (!phone) return;
    const fullPhone = phone.startsWith('91') ? phone : `91${phone}`;
    const invoiceNum = invoice?.invoice_number || job.job_number;
    const msg = encodeURIComponent(
      t('payment.whatsappMsg', {
        name: job.customer_id?.name,
        jobNumber: job.job_number,
        invoiceNumber: invoiceNum,
        amount: (job.total_amount || 0).toFixed(2),
        bike: `${job.bike_id?.make} ${job.bike_id?.model}`,
        plate: job.bike_id?.plate_number,
      })
    );
    Linking.openURL(`whatsapp://send?phone=${fullPhone}&text=${msg}`).catch(() => {
      Linking.openURL(`https://wa.me/${fullPhone}?text=${msg}`);
    });
  }

  if (!job) return null;

  const showPaidState = isPaid || paidDone;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>

      {/* Job + totals summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.jobNum}>{job.job_number}</Text>
        <Text style={styles.bikeLine}>{job.bike_id?.make} {job.bike_id?.model}  ·  {job.bike_id?.plate_number}</Text>
        <Text style={styles.customerName}>{job.customer_id?.name}  ·  {job.customer_id?.phone}</Text>

        <View style={styles.divider} />

        {[
          { label: t('jobCard.subtotal'), val: `₹${(job.subtotal || 0).toFixed(2)}` },
          { label: t('jobCard.gst'),      val: `₹${(job.gst_amount || 0).toFixed(2)}` },
        ].map(({ label, val }) => (
          <View key={label} style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{label}</Text>
            <Text style={styles.summaryVal}>{val}</Text>
          </View>
        ))}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{t('payment.totalAmount')}</Text>
          <Text style={styles.totalVal}>₹{(job.total_amount || 0).toFixed(2)}</Text>
        </View>

        {job.payment_status === 'partial' && !paidDone && (
          <View style={[styles.totalRow, { marginTop: 4 }]}>
            <Text style={[styles.totalLabel, { color: '#E85D04' }]}>{t('payment.balanceDue')}</Text>
            <Text style={[styles.totalVal, { color: '#E85D04' }]}>₹{(job.balance_due || 0).toFixed(2)}</Text>
          </View>
        )}
      </View>

      {/* Fully paid — share options */}
      {showPaidState ? (
        <View style={styles.paidSection}>
          <View style={styles.paidBanner}>
            <Text style={styles.paidText}>✓ {t('payment.fullyPaid')}</Text>
            {invoice && <Text style={styles.invoiceNum}>{t('payment.invoiceNumber', { number: invoice.invoice_number })}</Text>}
          </View>

          <View style={styles.handoverCard}>
            <View style={styles.handoverRow}>
              <Text style={styles.handoverLabel}>{t('payment.collectedBy')}</Text>
              <Text style={styles.handoverValue}>{user?.name ?? '—'}</Text>
            </View>
            {(mode === 'cash' || job?.payment_mode === 'cash') && (
              <View style={[styles.handoverRow, { marginTop: 4 }]}>
                <Text style={styles.handoverLabel}>{t('payment.cashHandover')}</Text>
                <Text style={[styles.handoverValue, { color: '#E85D04' }]}>{t('payment.pendingAdminConfirm')}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.shareBtn, sharing && { opacity: 0.6 }]}
            onPress={handleShareInvoice}
            disabled={sharing}
          >
            {sharing
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.shareBtnText}>📄  {t('payment.shareInvoice')}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.whatsappBtn} onPress={handleWhatsApp}>
            <Text style={styles.whatsappBtnText}>💬  {t('payment.shareWhatsapp')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.navigate('MyJobs')}>
            <Text style={styles.doneBtnText}>{t('common.done')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={styles.label}>{t('payment.paymentMode')}</Text>
          <View style={styles.modeRow}>
            {PAYMENT_MODES.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.modePill, mode === m && styles.modePillActive]}
                onPress={() => setMode(m)}
              >
                <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>
                  {t(`payment.${m}`, m.toUpperCase())}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>{t('payment.amountReceived')}</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />

          <Text style={styles.hintText}>{t('payment.partialHint')}</Text>

          <TouchableOpacity
            style={[styles.recordBtn, saving && { opacity: 0.6 }]}
            onPress={handleRecord}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.recordBtnText}>{t('payment.recordPayment')}</Text>
            }
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#f6f6f6' },
  summaryCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 20,
    elevation: 1,
  },
  jobNum:        { fontSize: 12, fontWeight: '700', color: '#E85D04', letterSpacing: 1, marginBottom: 4 },
  bikeLine:      { fontSize: 16, fontWeight: '700', color: '#111' },
  customerName:  { fontSize: 13, color: '#888', marginBottom: 12, marginTop: 2 },
  divider:       { borderTopWidth: 1, borderTopColor: '#f0f0f0', marginBottom: 10 },
  summaryRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel:  { fontSize: 14, color: '#777' },
  summaryVal:    { fontSize: 14, color: '#555' },
  totalRow:      { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  totalLabel:    { fontSize: 16, fontWeight: '700', color: '#111' },
  totalVal:      { fontSize: 18, fontWeight: '700', color: '#111' },
  label:         { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 8, marginTop: 4 },
  modeRow:       { flexDirection: 'row', gap: 10, marginBottom: 16 },
  modePill: {
    flex: 1, borderWidth: 1.5, borderColor: '#ddd', borderRadius: 8,
    paddingVertical: 10, alignItems: 'center',
  },
  modePillActive: { borderColor: '#E85D04', backgroundColor: '#fff5ef' },
  modeText:       { fontSize: 14, color: '#777', fontWeight: '600' },
  modeTextActive: { color: '#E85D04', fontWeight: '700' },
  amountInput: {
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 10,
    paddingVertical: 14, paddingHorizontal: 16, fontSize: 28,
    fontWeight: '700', color: '#111', textAlign: 'center',
    backgroundColor: '#fff', marginBottom: 8,
  },
  hintText:      { fontSize: 12, color: '#aaa', textAlign: 'center', marginBottom: 24 },
  recordBtn:     { backgroundColor: '#E85D04', borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  recordBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  paidSection:   { gap: 12 },
  paidBanner:    { backgroundColor: '#d8f3dc', borderRadius: 12, padding: 20, alignItems: 'center' },
  paidText:      { fontSize: 18, fontWeight: '700', color: '#2d6a4f' },
  invoiceNum:    { fontSize: 14, color: '#555', marginTop: 6 },
  shareBtn:      { backgroundColor: '#0077b6', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  shareBtnText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
  whatsappBtn:   { backgroundColor: '#25D366', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  whatsappBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  doneBtn:       { borderWidth: 1.5, borderColor: '#ddd', borderRadius: 10, paddingVertical: 14, alignItems: 'center', backgroundColor: '#fff' },
  doneBtnText:   { fontSize: 16, color: '#555', fontWeight: '600' },
  handoverCard:  { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#f0f0f0' },
  handoverRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  handoverLabel: { fontSize: 13, color: '#999' },
  handoverValue: { fontSize: 13, fontWeight: '700', color: '#111' },
});
