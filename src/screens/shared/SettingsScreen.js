import { showAlert } from '../../utils/alert';
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../store/authStore';
import { updateLanguage } from '../../api/auth.api';
import { useNavigation } from '@react-navigation/native';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'mr', label: 'मराठी' },
  { code: 'hi', label: 'हिन्दी' },
];

const BUSINESS_ROWS = [
  { key: 'inventory', icon: '📦', route: 'Inventory',  labelKey: 'inventory.title' },
  { key: 'services',  icon: '🔧', route: 'Services',   labelKey: 'settings.services' },
  { key: 'employees', icon: '👥', route: 'Employees',  labelKey: 'employees.title', ownerOnly: true },
];

function SectionHeader({ label }) {
  return <Text style={styles.sectionHeader}>{label}</Text>;
}

function SettingsRow({ icon, label, onPress, danger }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Text style={styles.rowIconText}>{icon}</Text>
      </View>
      <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
      <Text style={styles.rowArrow}>›</Text>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { t, i18n }             = useTranslation();
  const { user, setUser, logout } = useAuthStore();
  const [saving, setSaving]     = useState(false);
  const navigation              = useNavigation();

  const initials = (user?.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

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
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48 }}>

      {/* Profile header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.profileName}>{user?.name || '—'}</Text>
        <Text style={styles.profilePhone}>{user?.phone || ''}</Text>
        {user?.role && (
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{t(`roles.${user.role}`)}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.editProfileBtn} onPress={() => navigation.navigate('EditProfile')} activeOpacity={0.8}>
          <Text style={styles.editProfileBtnText}>{t('settings.editProfile')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>

        {/* Language */}
        <SectionHeader label={t('settings.language')} />
        <View style={styles.card}>
          <View style={styles.langRow}>
            {LANGUAGES.map((lang) => {
              const active = user?.language === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.langPill, active && styles.langPillActive]}
                  onPress={() => handleLanguage(lang.code)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.langPillText, active && styles.langPillTextActive]}>{lang.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {saving && <ActivityIndicator size="small" color="#E85D04" style={{ marginTop: 10 }} />}
        </View>

        {/* Business Settings */}
        <SectionHeader label={t('settings.businessSettings')} />
        <View style={styles.card}>
          {BUSINESS_ROWS.filter(r => !r.ownerOnly || user?.role === 'garage_owner').map((r, idx, arr) => (
            <View key={r.key}>
              <SettingsRow
                icon={r.icon}
                label={t(r.labelKey)}
                onPress={() => navigation.navigate(r.route)}
              />
              {idx < arr.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Logout */}
        <SectionHeader label={t('settings.account')} />
        <View style={styles.card}>
          <SettingsRow icon="🚪" label={t('settings.logoutBtn')} onPress={confirmLogout} danger />
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f3f7' },

  // Profile header
  profileHeader: {
    backgroundColor: '#E85D04',
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText:      { fontSize: 26, fontWeight: '800', color: '#fff' },
  profileName:     { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 2 },
  profilePhone:    { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 10 },
  roleBadge:       { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4, marginBottom: 16 },
  roleBadgeText:   { fontSize: 13, color: '#fff', fontWeight: '700' },
  editProfileBtn:  { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8 },
  editProfileBtnText: { fontSize: 14, color: '#E85D04', fontWeight: '700' },

  body: { padding: 16 },

  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#999',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 20,
    marginLeft: 4,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },

  // Language pills
  langRow:          { flexDirection: 'row', gap: 10, paddingVertical: 14 },
  langPill:         { flex: 1, alignItems: 'center', borderRadius: 12, paddingVertical: 10, backgroundColor: '#f2f3f7', borderWidth: 1.5, borderColor: '#e4e4e8' },
  langPillActive:   { backgroundColor: '#E85D04', borderColor: '#E85D04' },
  langPillText:     { fontSize: 14, color: '#555', fontWeight: '600' },
  langPillTextActive: { color: '#fff' },

  // Settings rows
  row:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  rowIcon:      { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f2f3f7', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rowIconDanger:{ backgroundColor: '#fff0ee' },
  rowIconText:  { fontSize: 17 },
  rowLabel:     { flex: 1, fontSize: 15, color: '#111', fontWeight: '500' },
  rowLabelDanger:{ color: '#c62828', fontWeight: '600' },
  rowArrow:     { fontSize: 20, color: '#ccc' },
  divider:      { height: 1, backgroundColor: '#f5f5f5', marginLeft: 46 },
});
