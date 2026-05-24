import { showAlert } from '../../utils/alert'
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../store/authStore';
import { updateProfile, updateGarage } from '../../api/auth.api';

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const { user, setUser } = useAuthStore();
  const garage = user?.garage_id || {};

  const [name, setName]     = useState(user?.name || '');
  const [address, setAddress] = useState(garage.address || '');
  const [city, setCity]       = useState(garage.city || '');
  const [gstin, setGstin]     = useState(garage.gstin || '');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingGarage, setSavingGarage]   = useState(false);

  async function saveProfile() {
    if (!name.trim()) { showAlert(t('common.error'), t('editProfile.nameCantBeEmpty')); return; }
    try {
      setSavingProfile(true);
      const res = await updateProfile(name);
      setUser({ ...user, name: res.data.user.name });
      showAlert(t('editProfile.savedTitle'), t('editProfile.profileSaved'));
    } catch (e) {
      showAlert(t('common.error'), e?.response?.data?.error || t('common.error'));
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveGarage() {
    try {
      setSavingGarage(true);
      const res = await updateGarage({ address, city, gstin });
      const updatedGarage = res.data.garage;
      setAddress(updatedGarage.address || address);
      setCity(updatedGarage.city || city);
      setGstin(updatedGarage.gstin || gstin);
      setUser({ ...user, garage_id: { ...garage, ...updatedGarage } });
      showAlert(t('editProfile.savedTitle'), t('editProfile.garageSaved'));
    } catch (e) {
      showAlert(t('common.error'), e?.response?.data?.error || t('common.error'));
    } finally {
      setSavingGarage(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Profile */}
      <Text style={styles.sectionHeader}>{t('editProfile.profile')}</Text>
      <View style={styles.card}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('common.name')}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t('editProfile.namePlaceholder')}
            placeholderTextColor="#aaa"
          />
        </View>
        <TouchableOpacity
          style={[styles.saveBtn, savingProfile && styles.saveBtnDisabled]}
          onPress={saveProfile}
          disabled={savingProfile}
          activeOpacity={0.8}
        >
          {savingProfile
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.saveBtnText}>{t('editProfile.saveProfile')}</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Garage */}
      <Text style={[styles.sectionHeader, { marginTop: 24 }]}>{t('editProfile.garage')}</Text>
      <View style={styles.card}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('editProfile.address')}</Text>
          <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder={t('editProfile.address')} placeholderTextColor="#aaa" />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('editProfile.city')}</Text>
          <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder={t('editProfile.city')} placeholderTextColor="#aaa" />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('editProfile.gstin')}</Text>
          <TextInput style={styles.input} value={gstin} onChangeText={setGstin} placeholder={t('editProfile.gstinPlaceholder')} placeholderTextColor="#aaa" autoCapitalize="characters" />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, savingGarage && styles.saveBtnDisabled]}
          onPress={saveGarage}
          disabled={savingGarage}
          activeOpacity={0.8}
        >
          {savingGarage
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.saveBtnText}>{t('editProfile.saveGarage')}</Text>
          }
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#f6f6f6' },
  content:       { padding: 16, paddingBottom: 48 },
  sectionHeader: { fontSize: 13, fontWeight: '700', color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
  },
  field:      { marginBottom: 14 },
  fieldLabel: { fontSize: 12, color: '#888', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111',
    backgroundColor: '#fafafa',
  },
  saveBtn:         { backgroundColor: '#E85D04', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText:     { color: '#fff', fontWeight: '700', fontSize: 15 },
});
