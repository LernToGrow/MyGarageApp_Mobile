import { showAlert } from '../../utils/alert'
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Modal, Pressable, FlatList,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { setEstimate } from '../../api/job.api';
import useJobStore from '../../store/jobStore';
import DatePickerModal from '../../components/DatePickerModal';

const HOURS   = Array.from({ length: 12 }, (_, i) => i + 1);  // 1–12
const MINUTES = ['00', '15', '30', '45'];
const PERIODS = ['AM', 'PM'];

function TimePickerModal({ visible, value, onConfirm, onCancel }) {
  const init = value ? new Date(value) : new Date();
  const initH24 = init.getHours();
  const [hour,   setHour]   = useState(initH24 % 12 || 12);
  const [minute, setMinute] = useState('00');
  const [period, setPeriod] = useState(initH24 >= 12 ? 'PM' : 'AM');

  function confirm() {
    let h = hour % 12;
    if (period === 'PM') h += 12;
    const d = new Date(value || new Date());
    d.setHours(h, parseInt(minute), 0, 0);
    onConfirm(d);
  }

  function ColPicker({ data, selected, onSelect }) {
    return (
      <FlatList
        data={data}
        keyExtractor={(item) => String(item)}
        showsVerticalScrollIndicator={false}
        style={styles.tpCol}
        renderItem={({ item }) => {
          const isActive = String(item) === String(selected);
          return (
            <TouchableOpacity
              style={[styles.tpItem, isActive && styles.tpItemActive]}
              onPress={() => onSelect(item)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tpItemText, isActive && styles.tpItemTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel} />
      <View style={styles.tpContainer}>
        <View style={styles.tpHeader}>
          <Text style={styles.tpHeaderTitle}>Select Time</Text>
          <Text style={styles.tpHeaderValue}>
            {String(hour).padStart(2, '0')}:{minute} {period}
          </Text>
        </View>
        <View style={styles.tpBody}>
          <View style={styles.tpColWrap}>
            <Text style={styles.tpColLabel}>Hour</Text>
            <ColPicker data={HOURS} selected={hour} onSelect={setHour} />
          </View>
          <View style={styles.tpColWrap}>
            <Text style={styles.tpColLabel}>Min</Text>
            <ColPicker data={MINUTES} selected={minute} onSelect={setMinute} />
          </View>
          <View style={styles.tpColWrap}>
            <Text style={styles.tpColLabel}>AM/PM</Text>
            <ColPicker data={PERIODS} selected={period} onSelect={setPeriod} />
          </View>
        </View>
        <View style={styles.tpActions}>
          <TouchableOpacity onPress={onCancel} style={styles.actionBtn} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={confirm} style={styles.actionBtn} activeOpacity={0.7}>
            <Text style={styles.confirmText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function tomorrow9am() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
}

function fmtDate(date) {
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtTime(date) {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function EstimateTimeScreen({ navigation }) {
  const { t }                          = useTranslation();
  const { activeJob, updateActiveJob } = useJobStore();

  const isUpdate = !!activeJob?.estimated_ready_at;

  const [readyAt, setReadyAt]       = useState(
    isUpdate ? new Date(activeJob.estimated_ready_at) : tomorrow9am()
  );
  const [showDate, setShowDate]     = useState(false);
  const [showTime, setShowTime]     = useState(false);
  const [saving, setSaving]         = useState(false);

  function onDateConfirm(selected) {
    const merged = new Date(selected);
    merged.setHours(readyAt.getHours(), readyAt.getMinutes(), 0, 0);
    setReadyAt(merged);
    setShowDate(false);
  }

  function onTimeConfirm(selected) {
    const merged = new Date(readyAt);
    merged.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    setReadyAt(merged);
    setShowTime(false);
  }

  async function handleSend() {
    if (readyAt <= new Date()) {
      showAlert('', t('estimateTime.mustBeFuture'));
      return;
    }
    setSaving(true);
    try {
      const { data } = await setEstimate(activeJob._id, {
        estimated_ready_at: readyAt.toISOString(),
      });
      updateActiveJob(data.job);
      showAlert(
        '✓',
        t('estimateTime.estimateSaved'),
        [{ text: t('common.ok'), onPress: () => navigation.replace('JobCard') }]
      );
    } catch (err) {
      showAlert('', err.response?.data?.error || t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>

      {/* Job summary */}
      <View style={styles.jobSummary}>
        <Text style={styles.jobNum}>{activeJob?.job_number}</Text>
        <Text style={styles.bikeName}>
          {activeJob?.bike_id?.make} {activeJob?.bike_id?.model}  ·  {activeJob?.bike_id?.plate_number}
        </Text>
        <Text style={styles.customerName}>{activeJob?.customer_id?.name}</Text>
      </View>

      <Text style={styles.sectionLabel}>{t('estimateTime.readyWhen')}</Text>

      {/* Date row */}
      <TouchableOpacity style={styles.pickerRow} onPress={() => setShowDate(true)} activeOpacity={0.75}>
        <Text style={styles.pickerIcon}>📅</Text>
        <View style={styles.pickerInfo}>
          <Text style={styles.pickerLabel}>{t('estimateTime.date')}</Text>
          <Text style={styles.pickerValue}>{fmtDate(readyAt)}</Text>
        </View>
        <Text style={styles.pickerChevron}>›</Text>
      </TouchableOpacity>

      {/* Time row */}
      <TouchableOpacity style={styles.pickerRow} onPress={() => setShowTime(true)} activeOpacity={0.75}>
        <Text style={styles.pickerIcon}>🕐</Text>
        <View style={styles.pickerInfo}>
          <Text style={styles.pickerLabel}>{t('estimateTime.time')}</Text>
          <Text style={styles.pickerValue}>{fmtTime(readyAt)}</Text>
        </View>
        <Text style={styles.pickerChevron}>›</Text>
      </TouchableOpacity>

      {/* Summary */}
      <View style={styles.preview}>
        <Text style={styles.previewLabel}>{t('estimateTime.readyBy')}</Text>
        <Text style={styles.previewDate}>{fmtDate(readyAt)}</Text>
        <Text style={styles.previewTime}>{fmtTime(readyAt)}</Text>
      </View>

      <TouchableOpacity
        style={[styles.sendBtn, saving && { opacity: 0.6 }]}
        onPress={handleSend}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.sendBtnText}>
              {isUpdate ? t('estimateTime.updateEstimate') : t('estimateTime.sendToCustomer')}
            </Text>
        }
      </TouchableOpacity>

      <DatePickerModal
        visible={showDate}
        value={readyAt}
        minimumDate={new Date()}
        onConfirm={onDateConfirm}
        onCancel={() => setShowDate(false)}
      />

      <TimePickerModal
        visible={showTime}
        value={readyAt}
        onConfirm={onTimeConfirm}
        onCancel={() => setShowTime(false)}
      />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#fff' },
  jobSummary:   { backgroundColor: '#fff5ef', borderRadius: 12, padding: 16, marginBottom: 28 },
  jobNum:       { fontSize: 12, fontWeight: '700', color: '#E85D04', letterSpacing: 1, marginBottom: 4 },
  bikeName:     { fontSize: 16, fontWeight: '700', color: '#111' },
  customerName: { fontSize: 14, color: '#555', marginTop: 2 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 },

  pickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 12,
    padding: 16, marginBottom: 12,
  },
  pickerIcon:    { fontSize: 22 },
  pickerInfo:    { flex: 1 },
  pickerLabel:   { fontSize: 11, color: '#aaa', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  pickerValue:   { fontSize: 16, fontWeight: '700', color: '#111', marginTop: 2 },
  pickerChevron: { fontSize: 24, color: '#ccc' },

  preview: {
    backgroundColor: '#fff5ef', borderRadius: 12,
    padding: 16, marginTop: 12, marginBottom: 28, alignItems: 'center',
  },
  previewLabel: { fontSize: 12, color: '#E85D04', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  previewDate:  { fontSize: 16, fontWeight: '700', color: '#111' },
  previewTime:  { fontSize: 28, fontWeight: '700', color: '#E85D04', marginTop: 2 },

  sendBtn:     { backgroundColor: '#E85D04', borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  sendBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  // Time picker modal
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  tpContainer: {
    position: 'absolute', alignSelf: 'center', top: '20%',
    width: '88%', backgroundColor: '#fff', borderRadius: 16,
    overflow: 'hidden', elevation: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8,
  },
  tpHeader: {
    backgroundColor: '#E85D04', paddingHorizontal: 20,
    paddingTop: 18, paddingBottom: 14,
  },
  tpHeaderTitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '700', marginBottom: 4 },
  tpHeaderValue: { fontSize: 24, color: '#fff', fontWeight: '800' },
  tpBody:        { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 8 },
  tpColWrap:     { flex: 1, alignItems: 'center' },
  tpColLabel:    { fontSize: 11, fontWeight: '700', color: '#aaa', textTransform: 'uppercase', marginBottom: 4 },
  tpCol:         { height: 180 },
  tpItem:        { paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  tpItemActive:  { backgroundColor: '#fff3ee' },
  tpItemText:    { fontSize: 16, color: '#555', fontWeight: '500' },
  tpItemTextActive: { fontSize: 20, color: '#E85D04', fontWeight: '800' },
  tpActions:     { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  actionBtn:     { paddingHorizontal: 16, paddingVertical: 8 },
  cancelText:    { fontSize: 15, fontWeight: '700', color: '#888' },
  confirmText:   { fontSize: 15, fontWeight: '700', color: '#E85D04' },
});
