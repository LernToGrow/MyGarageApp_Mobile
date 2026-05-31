import { showAlert } from '../../utils/alert'
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, FlatList,
  StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { searchCustomers, createCustomer, addBike } from '../../api/customer.api';
import { createJob } from '../../api/job.api';
import { getEmployees } from '../../api/employee.api';
import useJobStore from '../../store/jobStore';
import useAuthStore from '../../store/authStore';

const FUEL_TYPES = ['petrol', 'diesel', 'electric', 'cng'];

export default function AddBikeScreen({ navigation }) {
  const { t }           = useTranslation();
  const { setActiveJob } = useJobStore();
  const { user }        = useAuthStore();

  const [phone, setPhone]         = useState('');
  const [searching, setSearching] = useState(false);
  const [customer, setCustomer]   = useState(null);
  const [bikes, setBikes]         = useState([]);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newName, setNewName]     = useState('');

  const [selectedBikeId, setSelectedBikeId] = useState(null);
  const [showBikeForm, setShowBikeForm]     = useState(false);
  const [make, setMake]         = useState('');
  const [model, setModel]       = useState('');
  const [year, setYear]         = useState('');
  const [plate, setPlate]       = useState('');
  const [fuelType, setFuelType] = useState('petrol');
  const [odometer, setOdometer] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const isOwner = user?.role === 'garage_owner';
  const [assignList, setAssignList]         = useState([]);
  const [assignee, setAssignee]             = useState(null);
  const [assignPickerOpen, setAssignPickerOpen] = useState(false);

  useEffect(() => {
    if (!isOwner) return;
    getEmployees().then(({ data }) => {
      const employees = Array.isArray(data) ? data : (data.employees ?? []);
      const active = employees.filter(e => e.is_active);
      setAssignList([{ _id: user._id, name: user.name, _self: true }, ...active]);
      setAssignee({ _id: user._id, name: user.name, _self: true });
    }).catch(() => {});
  }, []);

  async function handleSearch() {
    const trimmed = phone.trim();
    if (trimmed.length < 10) return;
    setSearching(true);
    setCustomer(null); setBikes([]); setShowNewCustomer(false); setSelectedBikeId(null); setShowBikeForm(false);
    try {
      const { data } = await searchCustomers(trimmed);
      if (data.customers?.length > 0) {
        const found = data.customers[0];
        setCustomer(found);
        setBikes(found.bikes || []);
      } else {
        setShowNewCustomer(true);
      }
    } catch {
      showAlert('', t('common.error'));
    } finally {
      setSearching(false);
    }
  }

  async function handleCreateJob() {
    setSubmitting(true);
    try {
      let finalCustomer = customer;

      if (!finalCustomer) {
        if (!newName.trim()) { showAlert('', t('addBike.enterCustomerName')); setSubmitting(false); return; }
        const { data } = await createCustomer({ name: newName.trim(), phone: phone.trim() });
        finalCustomer = data.customer;
        setCustomer(finalCustomer);
      }

      let bikeId = selectedBikeId;
      if (!bikeId) {
        if (!make || !model || !plate) {
          showAlert('', t('addBike.makeModelPlateRequired'));
          setSubmitting(false);
          return;
        }
        const { data } = await addBike(finalCustomer._id, {
          make: make.trim(),
          model: model.trim(),
          year: year ? parseInt(year) : undefined,
          plate_number: plate.trim().toUpperCase(),
          fuel_type: fuelType,
          odometer: odometer ? parseInt(odometer) : undefined,
        });
        bikeId = data.bike._id;
      }

      const { data } = await createJob({ customer_id: finalCustomer._id, bike_id: bikeId, assigned_to: assignee?._id || user._id });
      setActiveJob(data.job);
      navigation.replace('Inspection');
    } catch (err) {
      showAlert('', err.response?.data?.error || t('common.error'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">

        <Text style={styles.label}>{t('addBike.searchCustomer')}</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={phone}
            onChangeText={setPhone}
            placeholder="98765 43210"
            keyboardType="phone-pad"
            maxLength={10}
          />
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={searching}>
            {searching
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.searchBtnText}>{t('common.search')}</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Customer found */}
        {customer && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✓ {customer.name}</Text>
            <Text style={styles.sectionSub}>{customer.phone}</Text>

            {bikes.length > 0 && (
              <>
                <Text style={styles.label}>{t('addBike.selectBike')}</Text>
                {bikes.map((b) => (
                  <TouchableOpacity
                    key={b._id}
                    style={[styles.bikeRow, selectedBikeId === b._id && styles.bikeRowSelected]}
                    onPress={() => { setSelectedBikeId(b._id); setShowBikeForm(false); }}
                  >
                    <Text style={styles.bikeText}>{b.make} {b.model}  ·  {b.plate_number}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            <TouchableOpacity style={styles.linkBtn} onPress={() => { setSelectedBikeId(null); setShowBikeForm(true); }}>
              <Text style={styles.linkBtnText}>+ {t('addBike.addNewBike')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* New customer */}
        {showNewCustomer && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('addBike.customerNotFound')}</Text>
            <Text style={styles.label}>{t('addBike.customerName')}</Text>
            <TextInput style={styles.input} value={newName} onChangeText={setNewName} placeholder={t('addBike.fullNamePlaceholder')} autoCapitalize="words" />
            <TouchableOpacity style={styles.linkBtn} onPress={() => setShowBikeForm(true)}>
              <Text style={styles.linkBtnText}>+ {t('addBike.addNewBike')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bike form */}
        {showBikeForm && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('addBike.addNewBike')}</Text>
            {[
              { lbl: t('addBike.bikeMake'),  val: make,     set: setMake },
              { lbl: t('addBike.bikeModel'), val: model,    set: setModel },
              { lbl: t('addBike.bikeYear'),  val: year,     set: setYear,     kbd: 'number-pad' },
              { lbl: t('addBike.plate'),     val: plate,    set: setPlate,    auto: 'characters' },
              { lbl: t('addBike.odometer'),  val: odometer, set: setOdometer, kbd: 'number-pad' },
            ].map(({ lbl, val, set, kbd, auto }) => (
              <View key={lbl}>
                <Text style={styles.label}>{lbl}</Text>
                <TextInput style={styles.input} value={val} onChangeText={set} keyboardType={kbd || 'default'} autoCapitalize={auto || 'words'} />
              </View>
            ))}

            <Text style={styles.label}>{t('addBike.fuelType')}</Text>
            <View style={styles.fuelRow}>
              {FUEL_TYPES.map((f) => (
                <TouchableOpacity key={f} style={[styles.fuelPill, fuelType === f && styles.fuelPillActive]} onPress={() => setFuelType(f)}>
                  <Text style={[styles.fuelText, fuelType === f && styles.fuelTextActive]}>{t(`addBike.fuelTypes.${f}`)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Assign To — only for garage owner */}
        {isOwner && (customer || showNewCustomer) && (
          <View style={{ marginTop: 20 }}>
            <Text style={styles.label}>{t('addBike.assignTo')}</Text>
            <TouchableOpacity style={styles.assignBtn} onPress={() => setAssignPickerOpen(true)}>
              <Text style={styles.assignBtnText}>
                {assignee ? `${assignee.name}${assignee._self ? ' (You)' : ''}` : t('addBike.selectEmployee')}
              </Text>
              <Text style={{ color: '#E85D04', fontSize: 16 }}>▾</Text>
            </TouchableOpacity>
          </View>
        )}

        {(customer || showNewCustomer) && (
          <TouchableOpacity style={[styles.createBtn, submitting && { opacity: 0.6 }]} onPress={handleCreateJob} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>{t('addBike.createJob')}</Text>}
          </TouchableOpacity>
        )}

        {/* Assign To picker modal */}
        <Modal visible={assignPickerOpen} transparent animationType="slide" onRequestClose={() => setAssignPickerOpen(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAssignPickerOpen(false)}>
            <View style={styles.modalSheet}>
              <Text style={styles.modalTitle}>{t('addBike.assignTo')}</Text>
              <FlatList
                data={assignList}
                keyExtractor={item => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.assignOption, assignee?._id === item._id && styles.assignOptionSelected]}
                    onPress={() => { setAssignee(item); setAssignPickerOpen(false); }}
                  >
                    <Text style={[styles.assignOptionText, assignee?._id === item._id && { color: '#E85D04', fontWeight: '700' }]}>
                      {item.name}{item._self ? ' (You)' : ''}
                    </Text>
                    {assignee?._id === item._id && <Text style={{ color: '#E85D04' }}>✓</Text>}
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#fff' },
  label:          { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 12, fontSize: 15, color: '#111', backgroundColor: '#fafafa',
  },
  row:            { flexDirection: 'row', gap: 8 },
  searchBtn:      { backgroundColor: '#E85D04', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  searchBtnText:  { color: '#fff', fontWeight: '700', fontSize: 14 },
  section:        { marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  sectionTitle:   { fontSize: 17, fontWeight: '700', color: '#111', marginBottom: 2 },
  sectionSub:     { fontSize: 14, color: '#888', marginBottom: 8 },
  bikeRow:        { borderWidth: 1.5, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 8 },
  bikeRowSelected:{ borderColor: '#E85D04', backgroundColor: '#fff5ef' },
  bikeText:       { fontSize: 15, color: '#333' },
  linkBtn:        { marginTop: 10 },
  linkBtnText:    { color: '#E85D04', fontWeight: '700', fontSize: 15 },
  fuelRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  fuelPill:       { borderWidth: 1.5, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  fuelPillActive: { borderColor: '#E85D04', backgroundColor: '#fff5ef' },
  fuelText:       { fontSize: 13, color: '#777' },
  fuelTextActive: { color: '#E85D04', fontWeight: '700' },
  createBtn:      { marginTop: 32, backgroundColor: '#E85D04', borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  createBtnText:  { color: '#fff', fontSize: 17, fontWeight: '700' },
  assignBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 8,
    paddingVertical: 12, paddingHorizontal: 14, backgroundColor: '#fafafa',
  },
  assignBtnText:  { fontSize: 15, color: '#111' },
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, maxHeight: '60%',
  },
  modalTitle:     { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 12 },
  assignOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  assignOptionSelected: { backgroundColor: '#fff5ef' },
  assignOptionText:     { fontSize: 15, color: '#333' },
});
