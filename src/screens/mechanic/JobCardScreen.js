import { showAlert } from '../../utils/alert'
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ScrollView, ActivityIndicator, Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { startJob, addService, markServiceDone, removeService, removePart, completeJob, getJob } from '../../api/job.api';
import { getServices } from '../../api/service.api';
import useJobStore from '../../store/jobStore';
import { checkDeliveryAlert } from '../../utils/scheduleDeliveryAlert';

function Totals({ job }) {
  const { t } = useTranslation();
  const sub  = job.subtotal      || 0;
  const gst  = job.gst_amount    || 0;
  const tot  = job.total_amount  || 0;
  return (
    <View style={styles.totalsBox}>
      <Row label={t('jobCard.subtotal')} val={`₹${sub.toFixed(2)}`} />
      <Row label={t('jobCard.gst')}      val={`₹${gst.toFixed(2)}`} />
      <View style={styles.totalDivider} />
      <Row label={t('jobCard.total')}    val={`₹${tot.toFixed(2)}`} bold />
    </View>
  );
}

function Row({ label, val, bold }) {
  return (
    <View style={styles.totalsRow}>
      <Text style={[styles.totalsLabel, bold && { fontWeight: '700', color: '#111' }]}>{label}</Text>
      <Text style={[styles.totalsVal,   bold && { fontWeight: '700', color: '#E85D04', fontSize: 16 }]}>{val}</Text>
    </View>
  );
}

export default function JobCardScreen({ navigation }) {
  const { t }                         = useTranslation();
  const { activeJob, updateActiveJob, setActiveJob } = useJobStore();

  const [starting, setStarting]   = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showAddSvc, setShowAddSvc] = useState(false);
  const [svcName, setSvcName]     = useState('');
  const [svcCharge, setSvcCharge] = useState('');
  const [addingSvc, setAddingSvc] = useState(false);
  const [catalog, setCatalog]     = useState([]);
  const [showCatalog, setShowCatalog] = useState(false);

  useEffect(() => {
    getServices().then(({ data }) => setCatalog(data.services || [])).catch(() => {});
    checkDeliveryAlert(activeJob);
  }, []);

  const job     = activeJob;
  const started = !!job?.start_time;

  async function handleStart() {
    setStarting(true);
    try {
      const { data } = await startJob(job._id);
      updateActiveJob(data.job);
      showAlert('', t('jobs.jobStarted'));
    } catch (err) {
      showAlert('', err.response?.data?.error || t('common.error'));
    } finally {
      setStarting(false);
    }
  }

  async function handleAddService() {
    if (!svcName.trim() || !svcCharge) return;
    setAddingSvc(true);
    try {
      const { data } = await addService(job._id, {
        services: [{ name: svcName.trim(), labour_charge: parseFloat(svcCharge) }],
      });
      updateActiveJob(data.job);
      setSvcName(''); setSvcCharge(''); setShowAddSvc(false);
    } catch (err) {
      showAlert('', err.response?.data?.error || t('common.error'));
    } finally {
      setAddingSvc(false);
    }
  }

  async function handleMarkDone(svcId) {
    try {
      const { data } = await markServiceDone(job._id, svcId);
      updateActiveJob(data.job);
    } catch (err) {
      showAlert('', err.response?.data?.error || t('common.error'));
    }
  }

  async function handleRemovePart(partIndex, partName) {
    showAlert(t('jobCard.removePart'), t('jobCard.removePartConfirm', { name: partName }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.remove'), style: 'destructive',
        onPress: async () => {
          try {
            const { data } = await removePart(job._id, partIndex);
            updateActiveJob(data.job);
          } catch (err) {
            showAlert('', err.response?.data?.error || t('common.error'));
          }
        },
      },
    ]);
  }

  async function handleRemoveService(svcId, svcName) {
    showAlert(t('jobCard.removeService'), t('jobCard.removeServiceConfirm', { name: svcName }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.remove'), style: 'destructive',
        onPress: async () => {
          try {
            const { data } = await removeService(job._id, svcId);
            updateActiveJob(data.job);
          } catch (err) {
            showAlert('', err.response?.data?.error || t('common.error'));
          }
        },
      },
    ]);
  }

  async function handleComplete() {
    const hasServices = (job.services || []).length > 0;
    const hasParts    = (job.parts_used || []).length > 0;

    if (!hasServices && !hasParts) {
      showAlert(t('jobCard.nothingAdded'), t('jobCard.nothingAddedMsg'));
      return;
    }

    const undone = (job.services || []).filter((s) => !s.done_at);
    if (undone.length > 0) {
      showAlert(
        t('jobCard.servicesIncomplete'),
        t('jobCard.servicesNotDonePrefix', { count: undone.length }) +
          '\n\n' + undone.map((s) => `• ${s.name}`).join('\n') +
          '\n\n' + t('jobCard.servicesIncompleteSuffix')
      );
      return;
    }
    showAlert(t('jobs.markDone'), t('jobCard.markDoneConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.done'),
        onPress: async () => {
          setCompleting(true);
          try {
            const { data } = await completeJob(job._id);
            updateActiveJob(data.job);
            navigation.replace('Payment');
          } catch (err) {
            showAlert('', err.response?.data?.error || t('common.error'));
          } finally {
            setCompleting(false);
          }
        },
      },
    ]);
  }

  async function refreshJob() {
    try {
      const { data } = await getJob(job._id);
      setActiveJob(data.job);
    } catch {}
  }

  if (!job) return null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>

        {/* Job summary header */}
        <View style={styles.header}>
          <Text style={styles.jobNum}>{job.job_number}</Text>
          <Text style={styles.bikeLine} numberOfLines={2}>{job.bike_id?.make} {job.bike_id?.model}  ·  {job.bike_id?.plate_number}</Text>
          {!!job.estimated_ready_at && (
            <View style={styles.dueBadge}>
              <Text style={styles.dueText}>
                ⏰  {t('jobCard.dueBy') || 'Due by'}{'  '}
                {new Date(job.estimated_ready_at).toLocaleString('en-IN', {
                  day: 'numeric', month: 'short',
                  hour: '2-digit', minute: '2-digit', hour12: true,
                })}
              </Text>
            </View>
          )}
          {!started && (
            <TouchableOpacity style={[styles.startBtn, starting && { opacity: 0.6 }]} onPress={handleStart} disabled={starting}>
              {starting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.startBtnText}>{t('jobs.startJob')}</Text>}
            </TouchableOpacity>
          )}
        </View>

        {/* Services */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('jobCard.services')}</Text>
            <TouchableOpacity onPress={() => setShowAddSvc(true)}>
              <Text style={styles.addLink}>+ {t('jobCard.addService')}</Text>
            </TouchableOpacity>
          </View>

          {(job.services || []).length === 0
            ? <Text style={styles.emptyNote}>{t('jobCard.noServices')}</Text>
            : (job.services || []).map((svc) => (
                <TouchableOpacity
                  key={svc._id}
                  style={[styles.serviceRow, svc.done_at && styles.serviceRowDone]}
                  onPress={() => handleMarkDone(svc._id)}
                  onLongPress={() => handleRemoveService(svc._id, svc.name)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, svc.done_at && styles.checkboxDone]}>
                    {svc.done_at && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.svcName, svc.done_at && styles.svcNameDone]}>{svc.name}</Text>
                    <Text style={styles.svcHint}>{t('jobCard.holdToRemove')}</Text>
                  </View>
                  <Text style={styles.svcCharge}>₹{svc.labour_charge}</Text>
                </TouchableOpacity>
              ))
          }
        </View>

        {/* Parts summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('jobCard.parts')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AddParts')}>
              <Text style={styles.addLink}>+ {t('jobCard.addParts')}</Text>
            </TouchableOpacity>
          </View>
          {(job.parts_used || []).length === 0
            ? <Text style={styles.emptyNote}>{t('jobCard.noParts')}</Text>
            : (job.parts_used || []).map((p, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.partRow}
                  onLongPress={() => handleRemovePart(i, p.name)}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.partName}>{p.name}  ×{p.quantity}</Text>
                    <Text style={styles.partHint}>{t('jobCard.holdToRemove')}</Text>
                  </View>
                  <Text style={styles.partPrice}>₹{p.total_price}</Text>
                </TouchableOpacity>
              ))
          }
        </View>

        {/* Totals */}
        <Totals job={job} />

        {/* Refresh */}
        <TouchableOpacity style={styles.refreshBtn} onPress={refreshJob}>
          <Text style={styles.refreshText}>{t('jobCard.refresh')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Mark Done FAB */}
      {started && (
        <TouchableOpacity
          style={[styles.fab, completing && { opacity: 0.6 }]}
          onPress={handleComplete}
          disabled={completing}
        >
          {completing
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.fabText}>✓  {t('jobs.markDone')}</Text>
          }
        </TouchableOpacity>
      )}

      {/* Add Service Modal */}
      <Modal visible={showAddSvc} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{t('jobCard.addService')}</Text>

            {/* Catalog picker button */}
            {catalog.length > 0 && (
              <TouchableOpacity style={styles.catalogBtn} onPress={() => setShowCatalog(true)}>
                <Text style={styles.catalogBtnText}>📋  {t('jobCard.pickFromCatalog')}</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.label}>{t('jobCard.serviceName')}</Text>
            <TextInput
              style={styles.input}
              value={svcName}
              onChangeText={setSvcName}
              placeholder="e.g. Oil change"
              autoCapitalize="sentences"
            />
            <Text style={styles.label}>{t('jobCard.labourCharge')}</Text>
            <TextInput style={styles.input} value={svcCharge} onChangeText={setSvcCharge} placeholder="350" keyboardType="decimal-pad" />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowAddSvc(false); setSvcName(''); setSvcCharge(''); }}>
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, addingSvc && { opacity: 0.6 }]} onPress={handleAddService} disabled={addingSvc}>
                {addingSvc ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.confirmBtnText}>{t('common.save')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Catalog picker modal */}
      <Modal visible={showCatalog} animationType="slide">
        <View style={styles.pickerModal}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{t('jobCard.selectService')}</Text>
            <TouchableOpacity onPress={() => setShowCatalog(false)}>
              <Text style={styles.pickerClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={catalog}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.catalogItem}
                onPress={() => {
                  setSvcName(item.name);
                  setSvcCharge(String(item.default_charge || ''));
                  setShowCatalog(false);
                }}
              >
                <View>
                  <Text style={styles.catalogItemName}>{item.name}</Text>
                  {item.category ? <Text style={styles.catalogItemSub}>{item.category}</Text> : null}
                </View>
                {item.default_charge > 0 && (
                  <Text style={styles.catalogItemCharge}>₹{item.default_charge}</Text>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#f6f6f6' },
  header: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    elevation: 1,
  },
  jobNum:           { fontSize: 12, fontWeight: '700', color: '#E85D04', letterSpacing: 1, marginBottom: 2 },
  bikeLine:         { fontSize: 15, fontWeight: '700', color: '#111', marginTop: 2 },
  dueBadge:         { marginTop: 8, alignSelf: 'flex-start', backgroundColor: '#fff3ec', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  dueText:          { fontSize: 12, fontWeight: '600', color: '#E85D04' },
  startBtn:         { backgroundColor: '#E85D04', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 12 },
  startBtnText:     { color: '#fff', fontWeight: '700', fontSize: 13 },
  section:          { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, elevation: 1 },
  sectionHeader:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle:     { fontSize: 14, fontWeight: '700', color: '#333' },
  addLink:          { color: '#E85D04', fontWeight: '700', fontSize: 14 },
  emptyNote:        { fontSize: 13, color: '#bbb', fontStyle: 'italic' },
  serviceRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  serviceRowDone:   { opacity: 0.55 },
  checkbox:         { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center' },
  checkboxDone:     { backgroundColor: '#2d6a4f', borderColor: '#2d6a4f' },
  checkmark:        { color: '#fff', fontSize: 12, fontWeight: '700' },
  svcName:          { fontSize: 14, color: '#333' },
  svcNameDone:      { textDecorationLine: 'line-through', color: '#aaa' },
  svcHint:          { fontSize: 10, color: '#ccc', marginTop: 1 },
  svcCharge:        { fontSize: 14, fontWeight: '600', color: '#555' },
  partRow:          { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  partName:         { fontSize: 13, color: '#555' },
  partHint:         { fontSize: 10, color: '#ccc', marginTop: 1 },
  partPrice:        { fontSize: 13, fontWeight: '600', color: '#333' },
  totalsBox:        { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, elevation: 1 },
  totalsRow:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  totalsLabel:      { fontSize: 14, color: '#777' },
  totalsVal:        { fontSize: 14, color: '#333' },
  totalDivider:     { borderTopWidth: 1, borderTopColor: '#eee', marginVertical: 6 },
  refreshBtn:       { alignItems: 'center', paddingVertical: 8 },
  refreshText:      { color: '#aaa', fontSize: 14 },
  fab: {
    position: 'absolute', bottom: 24, left: 20, right: 20,
    backgroundColor: '#2d6a4f', borderRadius: 12, paddingVertical: 16, alignItems: 'center',
    elevation: 5,
  },
  fabText:          { color: '#fff', fontWeight: '700', fontSize: 16 },
  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet:       { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle:       { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 16 },
  label:            { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 12, fontSize: 15, color: '#111',
  },
  modalBtns:        { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn:        { flex: 1, borderWidth: 1.5, borderColor: '#ddd', borderRadius: 8, paddingVertical: 13, alignItems: 'center' },
  cancelBtnText:    { color: '#555', fontWeight: '600' },
  confirmBtn:       { flex: 1, backgroundColor: '#E85D04', borderRadius: 8, paddingVertical: 13, alignItems: 'center' },
  confirmBtnText:   { color: '#fff', fontWeight: '700' },
  catalogBtn:       { borderWidth: 1.5, borderColor: '#E85D04', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginBottom: 14 },
  catalogBtnText:   { color: '#E85D04', fontWeight: '600', fontSize: 14 },
  pickerModal:      { flex: 1, backgroundColor: '#fff' },
  pickerHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  pickerTitle:      { fontSize: 18, fontWeight: '700', color: '#111' },
  pickerClose:      { fontSize: 18, color: '#999' },
  catalogItem:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  catalogItemName:  { fontSize: 15, fontWeight: '600', color: '#111' },
  catalogItemSub:   { fontSize: 12, color: '#888', marginTop: 2 },
  catalogItemCharge:{ fontSize: 14, fontWeight: '700', color: '#E85D04' },
});
