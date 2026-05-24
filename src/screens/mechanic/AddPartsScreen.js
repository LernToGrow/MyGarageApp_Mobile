import { showAlert } from '../../utils/alert'
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ScrollView, ActivityIndicator, Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { addPart as addPartToJob } from '../../api/job.api';
import { getParts } from '../../api/part.api';
import useJobStore from '../../store/jobStore';

const SOURCE_TYPES = [
  { key: 'own_stock',          labelKey: 'addParts.ownStock' },
  { key: 'outsourced',         labelKey: 'addParts.outsourced' },
  { key: 'customer_supplied',  labelKey: 'addParts.customerSupplied' },
  { key: 'external_purchase',  labelKey: 'addParts.externalPurchase' },
];

export default function AddPartsScreen({ navigation }) {
  const { t }                         = useTranslation();
  const { activeJob, updateActiveJob } = useJobStore();

  const [sourceType, setSourceType] = useState('own_stock');
  const [quantity, setQuantity]     = useState('1');
  const [unitPrice, setUnitPrice]   = useState('');
  const [partName, setPartName]     = useState('');
  const [saving, setSaving]         = useState(false);

  // Own stock
  const [stockParts, setStockParts]     = useState([]);
  const [loadingParts, setLoadingParts] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [showPicker, setShowPicker]     = useState(false);
  const [search, setSearch]             = useState('');

  useEffect(() => {
    if (sourceType === 'own_stock') loadStockParts();
  }, [sourceType]);

  async function loadStockParts() {
    setLoadingParts(true);
    try {
      const { data } = await getParts();
      setStockParts(data.parts || []);
    } catch {
      showAlert('', t('common.error'));
    } finally {
      setLoadingParts(false);
    }
  }

  async function handleAdd() {
    const qty = parseInt(quantity) || 1;

    if (sourceType === 'own_stock' && !selectedPart) {
      showAlert('', t('addParts.selectPart')); return;
    }
    if (sourceType !== 'own_stock' && sourceType !== 'customer_supplied' && !partName.trim()) {
      showAlert('', t('addParts.enterPartName')); return;
    }

    setSaving(true);
    try {
      const payload = {
        source_type: sourceType,
        quantity: qty,
        ...(sourceType === 'own_stock' && { part_id: selectedPart._id, name: selectedPart.name_en }),
        ...(sourceType !== 'own_stock' && { name: partName.trim() }),
        ...(sourceType !== 'customer_supplied' && unitPrice && { unit_price: parseFloat(unitPrice) }),
      };
      const { data } = await addPartToJob(activeJob._id, payload);
      updateActiveJob(data.job);
      navigation.goBack();
    } catch (err) {
      showAlert('', err.response?.data?.error || t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  const filteredParts = stockParts.filter((p) =>
    p.name_en?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">

        {/* Source type selector */}
        <Text style={styles.label}>{t('addParts.sourceType')}</Text>
        <View style={styles.sourceRow}>
          {SOURCE_TYPES.map(({ key, labelKey }) => (
            <TouchableOpacity
              key={key}
              style={[styles.sourceChip, sourceType === key && styles.sourceChipActive]}
              onPress={() => { setSourceType(key); setSelectedPart(null); setPartName(''); setUnitPrice(''); }}
            >
              <Text style={[styles.sourceChipText, sourceType === key && styles.sourceChipTextActive]}>
                {t(labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Own stock: part picker */}
        {sourceType === 'own_stock' && (
          <>
            <Text style={styles.label}>{t('addParts.selectPart')}</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowPicker(true)}>
              <Text style={selectedPart ? styles.pickerBtnText : styles.pickerBtnPlaceholder}>
                {selectedPart ? `${selectedPart.name_en}  (qty: ${selectedPart.quantity})` : t('addParts.tapToSelect')}
              </Text>
            </TouchableOpacity>
            {selectedPart && (
              <Text style={styles.stockNote}>
                {t('addParts.stockInfo', { price: selectedPart.sell_price, qty: selectedPart.quantity })}
              </Text>
            )}
          </>
        )}

        {/* Name input for non-own-stock */}
        {sourceType !== 'own_stock' && sourceType !== 'customer_supplied' && (
          <>
            <Text style={styles.label}>{t('addParts.partName')}</Text>
            <TextInput style={styles.input} value={partName} onChangeText={setPartName} placeholder="e.g. Brake cable" autoCapitalize="sentences" />
          </>
        )}

        {sourceType === 'customer_supplied' && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>{t('addParts.customerSuppliedInfo')}</Text>
          </View>
        )}

        {/* Quantity */}
        <Text style={styles.label}>{t('addParts.quantity')}</Text>
        <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType="number-pad" />

        {/* Unit price — not for customer_supplied */}
        {sourceType !== 'customer_supplied' && (
          <>
            <Text style={styles.label}>{t('addParts.unitPrice')}</Text>
            <TextInput
              style={styles.input}
              value={sourceType === 'own_stock' && selectedPart ? String(selectedPart.sell_price) : unitPrice}
              onChangeText={setUnitPrice}
              placeholder="0.00"
              keyboardType="decimal-pad"
              editable={sourceType !== 'own_stock'}
            />
            {sourceType === 'own_stock' && <Text style={styles.hintText}>{t('addParts.sellPriceAutoFilled')}</Text>}
          </>
        )}

        <TouchableOpacity
          style={[styles.addBtn, saving && { opacity: 0.6 }]}
          onPress={handleAdd}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.addBtnText}>{t('addParts.addPart')}</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* Part picker modal */}
      <Modal visible={showPicker} animationType="slide">
        <View style={styles.pickerModal}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{t('addParts.selectPartTitle')}</Text>
            <TouchableOpacity onPress={() => setShowPicker(false)}>
              <Text style={styles.pickerClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.pickerSearch}
            value={search}
            onChangeText={setSearch}
            placeholder={t('addParts.searchPlaceholder')}
            autoFocus
          />
          {loadingParts
            ? <ActivityIndicator color="#E85D04" style={{ marginTop: 40 }} />
            : <FlatList
                data={filteredParts}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.partItem}
                    onPress={() => {
                      setSelectedPart(item);
                      setUnitPrice(String(item.sell_price || ''));
                      setShowPicker(false);
                    }}
                  >
                    <View>
                      <Text style={styles.partItemName}>{item.name_en}</Text>
                      <Text style={styles.partItemSub}>SKU: {item.sku || '—'}  ·  ₹{item.sell_price}  ·  Qty: {item.quantity}</Text>
                    </View>
                    {item.quantity <= item.min_quantity && (
                      <Text style={styles.lowStockBadge}>{t('inventory.low')}</Text>
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.emptyNote}>{t('addParts.noPartsFound')}</Text>}
              />
          }
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: '#fff' },
  label:                { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 16 },
  sourceRow:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sourceChip: {
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  sourceChipActive:     { borderColor: '#E85D04', backgroundColor: '#fff5ef' },
  sourceChipText:       { fontSize: 13, color: '#777' },
  sourceChipTextActive: { color: '#E85D04', fontWeight: '700' },
  input: {
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 12, fontSize: 15, color: '#111', backgroundColor: '#fafafa',
  },
  pickerBtn: {
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 8,
    paddingVertical: 12, paddingHorizontal: 12, backgroundColor: '#fafafa',
  },
  pickerBtnText:        { fontSize: 15, color: '#111' },
  pickerBtnPlaceholder: { fontSize: 15, color: '#aaa' },
  stockNote:            { fontSize: 12, color: '#888', marginTop: 4 },
  hintText:             { fontSize: 12, color: '#aaa', marginTop: 4 },
  infoBox:              { backgroundColor: '#f0f7ff', borderRadius: 8, padding: 12, marginTop: 12 },
  infoText:             { fontSize: 13, color: '#444' },
  addBtn:               { marginTop: 28, backgroundColor: '#E85D04', borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  addBtnText:           { color: '#fff', fontSize: 17, fontWeight: '700' },
  pickerModal:          { flex: 1, backgroundColor: '#fff' },
  pickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingTop: 56, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  pickerTitle:          { fontSize: 18, fontWeight: '700', color: '#111' },
  pickerClose:          { fontSize: 18, color: '#999' },
  pickerSearch: {
    margin: 16, borderWidth: 1.5, borderColor: '#ddd', borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 14, fontSize: 15,
  },
  partItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  partItemName:         { fontSize: 15, fontWeight: '600', color: '#111' },
  partItemSub:          { fontSize: 12, color: '#888', marginTop: 2 },
  lowStockBadge:        { backgroundColor: '#ffe5d0', color: '#E85D04', fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  emptyNote:            { textAlign: 'center', color: '#aaa', marginTop: 40, fontSize: 15 },
});
