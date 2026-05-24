import { showAlert } from '../../utils/alert'
import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../store/authStore';
import { updateLanguage } from '../../api/auth.api';
import { useNavigation } from '@react-navigation/native';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'mr', label: 'मराठी' },
  { code: 'hi', label: 'हिन्दी' },
];

function LangPill({ lang, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.pill, selected && styles.pillActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.pillText, selected && styles.pillTextActive]}>{lang.label}</Text>
    </TouchableOpacity>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const { t, i18n }            = useTranslation();
  const { user, setUser, logout } = useAuthStore();
  const [saving, setSaving]    = useState(false);
  const navigation             = useNavigation();

  async function handleLanguage(code) {
    if (code === user?.language) return;
    try {
      setSaving(true);
      await updateLanguage(code);
      await i18n.changeLanguage(code);
      setUser({ ...user, language: code });
    } catch {
      showAlert(t('common.error'), t('settings.languageError'));
    } finally {
      setSaving(false);
    }
  }

  function confirmLogout() {
    showAlert(t('settings.logoutTitle'), t('settings.logoutMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.logoutBtn'), style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/* Language */}
      <Text style={styles.sectionHeader}>{t('settings.language')}</Text>
      <View style={styles.card}>
        <View style={styles.pillRow}>
          {LANGUAGES.map((lang) => (
            <LangPill
              key={lang.code}
              lang={lang}
              selected={user?.language === lang.code}
              onPress={() => handleLanguage(lang.code)}
            />
          ))}
        </View>
        {saving && <ActivityIndicator size="small" color="#E85D04" style={{ marginTop: 8 }} />}
      </View>

      {/* Account */}
      <Text style={[styles.sectionHeader, { marginTop: 24 }]}>{t('settings.account')}</Text>
      <View style={styles.card}>
        <InfoRow label={t('common.name')}  value={user?.name} />
        <InfoRow label={t('common.phone')} value={user?.phone} />
        <InfoRow label={t('settings.role')}  value={user?.role ? t(`roles.${user.role}`) : null} />
        <TouchableOpacity style={styles.editProfileRow} onPress={() => navigation.navigate('EditProfile')} activeOpacity={0.7}>
          <Text style={styles.editProfileText}>{t('settings.editProfile')}</Text>
          <Text style={styles.businessRowArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Business Settings */}
      <Text style={[styles.sectionHeader, { marginTop: 24 }]}>{t('settings.businessSettings')}</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.businessRow} onPress={() => navigation.navigate('Inventory')} activeOpacity={0.7}>
          <Text style={styles.businessRowText}>{t('inventory.title')}</Text>
          <Text style={styles.businessRowArrow}>›</Text>
        </TouchableOpacity>
        <View style={styles.rowDivider} />
        <TouchableOpacity style={styles.businessRow} onPress={() => navigation.navigate('Services')} activeOpacity={0.7}>
          <Text style={styles.businessRowText}>{t('settings.services')}</Text>
          <Text style={styles.businessRowArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout} activeOpacity={0.8}>
        <Text style={styles.logoutText}>{t('settings.logoutBtn')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#f6f6f6' },
  sectionHeader:   { fontSize: 13, fontWeight: '700', color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
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
  pillRow:         { flexDirection: 'row', gap: 10 },
  pill:            { borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8, backgroundColor: '#e0e0e0' },
  pillActive:      { backgroundColor: '#E85D04' },
  pillText:        { fontSize: 15, color: '#555', fontWeight: '600' },
  pillTextActive:  { color: '#fff' },
  infoRow:         { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  infoLabel:       { fontSize: 14, color: '#666' },
  infoValue:       { fontSize: 14, color: '#111', fontWeight: '600' },
  logoutBtn: {
    marginTop: 32,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffccbc',
  },
  logoutText:      { fontSize: 16, color: '#c62828', fontWeight: '700' },
  businessRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  businessRowText: { fontSize: 15, color: '#111', fontWeight: '500' },
  businessRowArrow:{ fontSize: 20, color: '#aaa' },
  rowDivider:      { height: 1, backgroundColor: '#f5f5f5' },
  editProfileRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, marginTop: 4, borderTopWidth: 1, borderTopColor: '#f5f5f5' },
  editProfileText: { fontSize: 15, color: '#E85D04', fontWeight: '600' },
});
