import { showAlert } from '../../utils/alert'
import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, Modal,
  StyleSheet, RefreshControl, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { getServices, createService, updateService } from '../../api/service.api';

const BLANK = { name: '', default_charge: '', category: '' };

function ServiceRow({ item, onPress }) {
  const { t } = useTranslation();
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.rowLeft}>
        <Text style={styles.name}>{item.name}</Text>
        {item.category ? <Text style={styles.meta}>{item.category}</Text> : null}
        <Text style={styles.charge}>
          {t('services.defaultChargeDisplay', { amount: item.default_charge || 0 })}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

function Field({ label, value, onChangeText, keyboardType, placeholder }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType || 'default'}
        placeholder={placeholder || ''}
        placeholderTextColor="#bbb"
      />
    </View>
  );
}

export default function ServicesScreen() {
  const { t } = useTranslation();
  const [services, setServices]     = useState([]);
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem]   = useState(null);
  const [form, setForm]             = useState(BLANK);
  const [saving, setSaving]         = useState(false);

  async function load(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const { data } = await getServices();
      setServices(data.services || []);
    } catch {
      showAlert('', t('services.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  function openAdd() {
    setEditingItem(null);
    setForm(BLANK);
    setModalVisible(true);
  }

  function openEdit(item) {
    setEditingItem(item);
    setForm({
      name:           item.name,
      default_charge: String(item.default_charge || ''),
      category:       item.category || '',
    });
    setModalVisible(true);
  }

  function set(field) {
    return (val) => setForm((f) => ({ ...f, [field]: val }));
  }

  async function handleSave() {
    if (!form.name.trim()) { showAlert('', t('services.nameRequired')); return; }
    setSaving(true);
    try {
      const payload = {
        name:           form.name.trim(),
        default_charge: parseFloat(form.default_charge) || 0,
        category:       form.category.trim(),
      };
      if (editingItem) {
        const { data } = await updateService(editingItem._id, payload);
        setServices((prev) => prev.map((s) => s._id === editingItem._id ? data.service : s));
      } else {
        const { data } = await createService(payload);
        setServices((prev) => [data.service, ...prev]);
      }
      setModalVisible(false);
    } catch (err) {
      showAlert('', err.response?.data?.error || t('services.saveError'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!editingItem) return;
    showAlert(
      t('common.deactivate'),
      t('services.deactivateConfirm', { name: editingItem.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'), style: 'destructive',
          onPress: async () => {
            try {
              await updateService(editingItem._id, { is_active: false });
              setServices((prev) => prev.filter((s) => s._id !== editingItem._id));
              setModalVisible(false);
            } catch {
              showAlert('', t('services.removeError'));
            }
          },
        },
      ]
    );
  }

  const filtered = services.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.category || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={t('common.search') + '…'}
          placeholderTextColor="#bbb"
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity style={styles.searchClear} onPress={() => setSearch('')}>
            <Text style={styles.searchClearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading
        ? <ActivityIndicator color="#E85D04" style={{ marginTop: 40 }} />
        : <FlatList
            data={filtered}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => <ServiceRow item={item} onPress={() => openEdit(item)} />}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E85D04']} />}
            ListEmptyComponent={<Text style={styles.empty}>{t('services.empty')}</Text>}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
      }

      <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.85}>
        <Text style={styles.fabText}>+ {t('services.addService')}</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.overlay}>
            <View style={styles.sheet}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>
                  {editingItem ? t('services.editService') : t('services.addService')}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              <Field
                label={`${t('services.serviceName')} *`}
                value={form.name}
                onChangeText={set('name')}
                placeholder={t('services.namePlaceholder')}
              />
              <Field
                label={t('services.defaultCharge')}
                value={form.default_charge}
                onChangeText={set('default_charge')}
                placeholder="350"
                keyboardType="decimal-pad"
              />
              <Field
                label={t('inventory.category')}
                value={form.category}
                onChangeText={set('category')}
                placeholder={t('services.categoryPlaceholder')}
              />

              <View style={styles.modalBtns}>
                {editingItem && (
                  <TouchableOpacity style={styles.deleteBtn} onPress={handleDeactivate}>
                    <Text style={styles.deleteBtnText}>{t('common.remove')}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.saveBtnText}>{t('common.save')}</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f6f6f6' },
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
  fabText:      { color: '#fff', fontWeight: '700', fontSize: 15 },
  searchWrap:   { marginHorizontal: 16, marginTop: 14, marginBottom: 6, flexDirection: 'row', alignItems: 'center' },
  searchInput:  { flex: 1, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1.5, borderColor: '#eee', paddingVertical: 10, paddingHorizontal: 14, paddingRight: 36, fontSize: 15, color: '#111', elevation: 1 },
  searchClear:  { position: 'absolute', right: 12 },
  searchClearText: { fontSize: 14, color: '#999' },
  row:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 10, padding: 14, elevation: 1 },
  rowLeft:      { flex: 1 },
  name:         { fontSize: 15, fontWeight: '700', color: '#111' },
  meta:         { fontSize: 12, color: '#888', marginTop: 2 },
  charge:       { fontSize: 13, color: '#555', marginTop: 2 },
  chevron:      { fontSize: 22, color: '#ccc' },
  empty:        { textAlign: 'center', color: '#aaa', marginTop: 40, fontSize: 15 },
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  sheetHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sheetTitle:   { fontSize: 18, fontWeight: '700', color: '#111' },
  closeBtn:     { fontSize: 18, color: '#999' },
  field:        { marginTop: 14 },
  fieldLabel:   { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  fieldInput:   { borderWidth: 1.5, borderColor: '#ddd', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, fontSize: 15, color: '#111', backgroundColor: '#fafafa' },
  modalBtns:    { flexDirection: 'row', gap: 10, marginTop: 22 },
  deleteBtn:    { flex: 1, borderWidth: 1.5, borderColor: '#E85D04', borderRadius: 8, paddingVertical: 13, alignItems: 'center' },
  deleteBtnText:{ color: '#E85D04', fontWeight: '600' },
  saveBtn:      { flex: 2, backgroundColor: '#E85D04', borderRadius: 8, paddingVertical: 13, alignItems: 'center' },
  saveBtnText:  { color: '#fff', fontWeight: '700' },
});
