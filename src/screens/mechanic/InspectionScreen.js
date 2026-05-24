import { showAlert } from '../../utils/alert'
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, FlatList,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { updateInspection, addService } from '../../api/job.api';
import { getServices } from '../../api/service.api';
import useJobStore from '../../store/jobStore';

export default function InspectionScreen({ navigation }) {
  const { t }                          = useTranslation();
  const { activeJob, updateActiveJob } = useJobStore();

  const [notes, setNotes]       = useState(activeJob?.inspection_notes || '');
  const [saving, setSaving]     = useState(false);

  const [catalog, setCatalog]   = useState([]);
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState([]); // [{ name, labour_charge }]

  useEffect(() => {
    getServices().then(({ data }) => setCatalog(data.services || [])).catch(() => {});
  }, []);

  const filtered = search.trim().length > 0
    ? catalog.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) &&
        !selected.find((x) => x.name === s.name)
      )
    : [];

  function selectService(item) {
    setSelected((prev) => [...prev, { name: item.name, labour_charge: item.default_charge || 0 }]);
    setSearch('');
  }

  function removeSelected(name) {
    setSelected((prev) => prev.filter((s) => s.name !== name));
  }

  async function handleDone() {
    if (!notes.trim()) {
      showAlert('', t('inspection.notesRequired') || 'Inspection notes are required');
      return;
    }
    setSaving(true);
    try {
      if (selected.length > 0) {
        await addService(activeJob._id, { services: selected });
      }
      const { data } = await updateInspection(activeJob._id, {
        inspection_notes: notes.trim(),
      });
      updateActiveJob(data.job);
      navigation.replace('Estimate');
    } catch (err) {
      showAlert('', err.response?.data?.error || t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">

        {/* Service search */}
        <Text style={styles.label}>{t('inspection.services') || 'Services Needed'}</Text>
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={t('inspection.searchService') || 'Search service…'}
            placeholderTextColor="#bbb"
          />
        </View>

        {/* Dropdown suggestions */}
        {filtered.length > 0 && (
          <View style={styles.suggestions}>
            {filtered.slice(0, 5).map((item) => (
              <TouchableOpacity key={item._id} style={styles.suggestionRow} onPress={() => selectService(item)}>
                <Text style={styles.suggestionName}>{item.name}</Text>
                {item.default_charge > 0 && (
                  <Text style={styles.suggestionCharge}>₹{item.default_charge}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Selected service tags */}
        {selected.length > 0 && (
          <View style={styles.tagsWrap}>
            {selected.map((s) => (
              <View key={s.name} style={styles.tag}>
                <Text style={styles.tagText}>{s.name}</Text>
                <TouchableOpacity onPress={() => removeSelected(s.name)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Text style={styles.tagRemove}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Notes */}
        <Text style={[styles.label, { marginTop: selected.length > 0 ? 20 : 8 }]}>{t('inspection.notes')}</Text>
        <TextInput
          style={styles.textArea}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('inspection.notesPlaceholder')}
          placeholderTextColor="#bbb"
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.doneBtn, saving && { opacity: 0.6 }]}
          onPress={handleDone}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.doneBtnText}>{t('inspection.inspectionDone')}</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#fff' },
  label:      { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 8 },

  searchWrap:  { marginBottom: 4 },
  searchInput: {
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: '#111',
    backgroundColor: '#fafafa',
  },

  suggestions: {
    borderWidth: 1, borderColor: '#eee', borderRadius: 10, backgroundColor: '#fff',
    marginBottom: 8, overflow: 'hidden', elevation: 3,
  },
  suggestionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  suggestionName:   { fontSize: 14, color: '#111' },
  suggestionCharge: { fontSize: 13, fontWeight: '600', color: '#E85D04' },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff3ec', borderWidth: 1.5, borderColor: '#E85D04',
    borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12,
  },
  tagText:   { fontSize: 13, fontWeight: '600', color: '#E85D04' },
  tagRemove: { fontSize: 11, color: '#E85D04', fontWeight: '700' },

  textArea: {
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 10,
    padding: 14, fontSize: 15, color: '#111', minHeight: 130,
    backgroundColor: '#fafafa', marginBottom: 28,
  },
  doneBtn:     { backgroundColor: '#E85D04', borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
