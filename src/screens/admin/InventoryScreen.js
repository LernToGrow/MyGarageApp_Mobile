import { showAlert } from '../../utils/alert'
import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, Modal,
  StyleSheet, RefreshControl, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { getParts, createPart, updatePart, adjustStock } from '../../api/part.api';

const BLANK_PART = {
  name_en: '', brand: '', category: '', sku: '',
  sell_price: '', buy_price: '', quantity: '', min_quantity: '',
  vendor_name: '', vendor_phone: '',
};

function PartRow({ part, onPress }) {
  const { t } = useTranslation();
  const isLow = part.quantity < part.min_quantity;
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.rowLeft}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.partName}>{part.name_en}</Text>
          {isLow && <View style={styles.lowBadge}><Text style={styles.lowBadgeText}>{t('inventory.low')}</Text></View>}
        </View>
        <Text style={styles.partMeta}>{part.brand}  ·  {part.category}</Text>
        <Text style={styles.partPrice}>₹{part.sell_price}  |  {t('inventory.quantity')}: {part.quantity}</Text>
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

export default function InventoryScreen({ route }) {
  const { t } = useTranslation();
  const [parts, setParts]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPart, setEditingPart]   = useState(null);
  const [form, setForm]           = useState(BLANK_PART);
  const [restockQty, setRestockQty] = useState('');
  const [saving, setSaving]       = useState(false);

  async function load(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const { data } = await getParts();
      const loaded = data.parts || [];
      setParts(loaded);
      if (route?.params?.editPartId) {
        const target = loaded.find((p) => p._id === route.params.editPartId);
        if (target) openEdit(target);
      }
    } catch {
      showAlert(t('common.error'), t('inventory.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, [route?.params?.editPartId]));

  function openAdd() {
    setEditingPart(null);
    setForm(BLANK_PART);
    setRestockQty('');
    setModalVisible(true);
  }

  function openEdit(part) {
    setEditingPart(part);
    setForm({
      name_en:      part.name_en || '',
      brand:        part.brand || '',
      category:     part.category || '',
      sku:          part.sku || '',
      sell_price:   String(part.sell_price || ''),
      buy_price:    String(part.buy_price || ''),
      quantity:     String(part.quantity || ''),
      min_quantity: String(part.min_quantity || ''),
      vendor_name:  part.vendor_name || '',
      vendor_phone: part.vendor_phone || '',
    });
    setRestockQty('');
    setModalVisible(true);
  }

  async function save() {
    if (!form.name_en.trim()) { showAlert('', t('inventory.nameRequired')); return; }
    try {
      setSaving(true);
      const payload = {
        ...form,
        sell_price:   parseFloat(form.sell_price) || 0,
        buy_price:    parseFloat(form.buy_price)  || 0,
        quantity:     parseInt(form.quantity)     || 0,
        min_quantity: parseInt(form.min_quantity) || 0,
      };
      if (editingPart) {
        await updatePart(editingPart._id, payload);
        if (restockQty && parseInt(restockQty) !== 0) {
          await adjustStock(editingPart._id, {
            adjustment: parseInt(restockQty),
            reason: 'restock',
          });
        }
      } else {
        await createPart(payload);
      }
      setModalVisible(false);
      load(true);
    } catch (e) {
      showAlert(t('common.error'), e?.response?.data?.error || t('inventory.saveError'));
    } finally {
      setSaving(false);
    }
  }

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E85D04" />
      </View>
    );
  }

  const lowCount = parts.filter((p) => p.quantity < p.min_quantity).length;

  return (
    <View style={styles.container}>
      {lowCount > 0 && (
        <View style={styles.lowBanner}>
          <Text style={styles.lowBannerText}>
            {t('inventory.belowMin', { count: lowCount })}
          </Text>
        </View>
      )}

      <FlatList
        data={parts}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <PartRow part={item} onPress={() => openEdit(item)} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E85D04']} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('inventory.noPartsYet')}</Text>
          </View>
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      />

      <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.85}>
        <Text style={styles.fabText}>+ {t('inventory.addPart')}</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingPart ? t('inventory.editPart') : t('inventory.addPart')}</Text>
            <TouchableOpacity onPress={save} disabled={saving}>
              <Text style={[styles.modalSave, saving && { opacity: 0.5 }]}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <Field label={`${t('inventory.partName')} *`} value={form.name_en}      onChangeText={set('name_en')} />
            <Field label={t('inventory.brand')}           value={form.brand}        onChangeText={set('brand')} />
            <Field label={t('inventory.category')}        value={form.category}     onChangeText={set('category')} />
            <Field label={t('inventory.sku')}             value={form.sku}          onChangeText={set('sku')} />
            <Field label={t('inventory.sellPrice')}       value={form.sell_price}   onChangeText={set('sell_price')}   keyboardType="numeric" />
            <Field label={t('inventory.buyPrice')}        value={form.buy_price}    onChangeText={set('buy_price')}    keyboardType="numeric" />
            {!editingPart && (
              <Field label={t('inventory.quantity')} value={form.quantity} onChangeText={set('quantity')} keyboardType="numeric" />
            )}
            <Field label={t('inventory.minQty')}          value={form.min_quantity} onChangeText={set('min_quantity')} keyboardType="numeric" />
            <Field label={t('inventory.vendorName')}      value={form.vendor_name}  onChangeText={set('vendor_name')} />
            <Field label={t('inventory.vendorPhone')}     value={form.vendor_phone} onChangeText={set('vendor_phone')} keyboardType="phone-pad" />

            {editingPart && (
              <>
                <View style={styles.stockInfoRow}>
                  <Text style={styles.stockInfoLabel}>{t('inventory.quantity')}</Text>
                  <Text style={styles.stockInfoValue}>{editingPart.quantity}</Text>
                </View>
                <Field
                  label={t('inventory.restockLabel')}
                  value={restockQty}
                  onChangeText={setRestockQty}
                  keyboardType="numbers-and-punctuation"
                  placeholder="e.g. 10 or -2"
                />
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#f6f6f6' },
  center:           { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lowBanner:        { backgroundColor: '#fff3e0', paddingHorizontal: 16, paddingVertical: 10 },
  lowBannerText:    { color: '#e65100', fontWeight: '700', fontSize: 13 },
  row: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
  },
  rowLeft:          { flex: 1 },
  partName:         { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 2 },
  partMeta:         { fontSize: 13, color: '#888', marginBottom: 2 },
  partPrice:        { fontSize: 13, color: '#555' },
  lowBadge:         { backgroundColor: '#c62828', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  lowBadgeText:     { color: '#fff', fontSize: 10, fontWeight: '800' },
  chevron:          { fontSize: 22, color: '#ccc', marginLeft: 8 },
  empty:            { alignItems: 'center', paddingTop: 80 },
  emptyText:        { fontSize: 16, color: '#aaa' },
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
  fabText:          { color: '#fff', fontWeight: '700', fontSize: 15 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  modalCancel:      { fontSize: 16, color: '#888' },
  modalTitle:       { fontSize: 17, fontWeight: '700', color: '#111' },
  modalSave:        { fontSize: 16, color: '#E85D04', fontWeight: '700' },
  stockInfoRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f6f6f6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 16 },
  stockInfoLabel:   { fontSize: 13, fontWeight: '600', color: '#555' },
  stockInfoValue:   { fontSize: 15, fontWeight: '700', color: '#111' },
  field:            { marginBottom: 16 },
  fieldLabel:       { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  fieldInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#111',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
});
