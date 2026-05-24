import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore';

export default function RoleSwitchToggle() {
  const { t }                       = useTranslation();
  const { user, currentMode, setMode } = useAuthStore();

  // Only garage_owner sees this toggle
  if (user?.role !== 'garage_owner') return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.pill, currentMode === 'mechanic' && styles.pillActive]}
        onPress={() => setMode('mechanic')}
        activeOpacity={0.8}
      >
        <Text style={[styles.pillText, currentMode === 'mechanic' && styles.pillTextActive]}>
          {t('roles.mechanic')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.pill, currentMode === 'admin' && styles.pillActive]}
        onPress={() => setMode('admin')}
        activeOpacity={0.8}
      >
        <Text style={[styles.pillText, currentMode === 'admin' && styles.pillTextActive]}>
          {t('roles.admin')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    padding: 3,
    marginRight: 12,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 18,
  },
  pillActive: {
    backgroundColor: '#E85D04',
    shadowColor: '#E85D04',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
  },
  pillTextActive: {
    color: '#fff',
  },
});
