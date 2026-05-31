import { showAlert } from '../../utils/alert'
import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, Modal,
  StyleSheet, RefreshControl, ActivityIndicator,
  ScrollView, Switch, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
  getEmployees, inviteEmployee, updatePermissions, deactivateEmployee,
} from '../../api/employee.api';

const ALL_PERMISSIONS = [
  'add_job', 'edit_job', 'delete_job',
  'add_inventory', 'edit_inventory',
  'view_billing', 'add_billing',
  'add_employee', 'edit_employee',
  'view_reports', 'manage_customers',
];

function EmployeeRow({ emp, onPress }) {
  const { t } = useTranslation();
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(emp.name || '?')[0].toUpperCase()}</Text>
      </View>
      <View style={styles.rowInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.empName}>{emp.name}</Text>
          {!emp.is_active && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>{t('employees.inactive')}</Text>
            </View>
          )}
        </View>
        <Text style={styles.empPhone}>{emp.phone}</Text>
        <Text style={styles.empPerms}>
          {t('employees.permissionsCount', { count: emp.permissions?.length || 0 })}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

export default function EmployeeScreen({ navigation }) {
  const { t } = useTranslation();
  const [employees, setEmployees]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [inviteVisible, setInviteVisible] = useState(false);
  const [inviteName, setInviteName]       = useState('');
  const [invitePhone, setInvitePhone]     = useState('');
  const [invitePerms, setInvitePerms]     = useState([]);
  const [inviteSaving, setInviteSaving]   = useState(false);

  const [editEmp, setEditEmp]             = useState(null);
  const [editPerms, setEditPerms]         = useState([]);
  const [editSaving, setEditSaving]       = useState(false);

  async function load(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const { data } = await getEmployees();
      setEmployees(data.employees || []);
    } catch {
      showAlert(t('common.error'), t('employees.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  function openInvite() {
    setInviteName('');
    setInvitePhone('');
    setInvitePerms([]);
    setInviteVisible(true);
  }

  async function submitInvite() {
    if (!invitePhone.trim() || invitePhone.trim().length < 10) {
      showAlert('', t('employees.invalidPhone'));
      return;
    }
    try {
      setInviteSaving(true);
      await inviteEmployee({ name: inviteName.trim(), phone: invitePhone.trim(), permissions: invitePerms });
      setInviteVisible(false);
      load(true);
    } catch (e) {
      showAlert(t('common.error'), e?.response?.data?.error || t('employees.inviteError'));
    } finally {
      setInviteSaving(false);
    }
  }

  function openEdit(emp) {
    setEditEmp(emp);
    setEditPerms([...(emp.permissions || [])]);
  }

  function togglePerm(perms, setPerms, perm) {
    setPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  }

  async function savePermissions() {
    try {
      setEditSaving(true);
      await updatePermissions(editEmp._id, editPerms);
      setEditEmp(null);
      load(true);
    } catch (e) {
      showAlert(t('common.error'), e?.response?.data?.error || t('employees.updateError'));
    } finally {
      setEditSaving(false);
    }
  }

  function confirmDeactivate(emp) {
    showAlert(
      t('employees.deactivate'),
      t('employees.deactivateConfirm', { name: emp.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('employees.deactivate'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deactivateEmployee(emp._id);
              load(true);
            } catch {
              showAlert(t('common.error'), t('employees.deactivateError'));
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#E85D04" /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={employees}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <EmployeeRow emp={item} onPress={() => openEdit(item)} />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E85D04']} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('employees.noEmployees')}</Text>
          </View>
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      />

      <TouchableOpacity style={styles.fab} onPress={openInvite} activeOpacity={0.85}>
        <Text style={styles.fabText}>+ {t('employees.inviteBtn')}</Text>
      </TouchableOpacity>

      {/* Invite modal */}
      <Modal visible={inviteVisible} animationType="slide" onRequestClose={() => setInviteVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setInviteVisible(false)}>
              <Text style={styles.modalCancel}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('employees.invite')}</Text>
            <TouchableOpacity onPress={submitInvite} disabled={inviteSaving}>
              <Text style={[styles.modalSave, inviteSaving && { opacity: 0.5 }]}>{t('employees.inviteBtn')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <Text style={styles.fieldLabel}>{t('common.name')}</Text>
            <TextInput
              style={styles.fieldInput}
              value={inviteName}
              onChangeText={setInviteName}
              placeholder={t('employees.namePlaceholder')}
              placeholderTextColor="#bbb"
            />
            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>{t('common.phone')} *</Text>
            <TextInput
              style={styles.fieldInput}
              value={invitePhone}
              onChangeText={setInvitePhone}
              placeholder={t('employees.phonePlaceholder')}
              placeholderTextColor="#bbb"
              keyboardType="phone-pad"
              maxLength={10}
            />
            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>{t('employees.permissions')}</Text>
            {ALL_PERMISSIONS.map((perm) => (
              <View key={perm} style={styles.permRow}>
                <Text style={styles.permLabel}>{t(`employees.perms.${perm}`)}</Text>
                <Switch
                  value={invitePerms.includes(perm)}
                  onValueChange={() => togglePerm(invitePerms, setInvitePerms, perm)}
                  trackColor={{ true: '#E85D04' }}
                  thumbColor="#fff"
                />
              </View>
            ))}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit permissions modal */}
      {editEmp && (
        <Modal visible animationType="slide" onRequestClose={() => setEditEmp(null)}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditEmp(null)}>
              <Text style={styles.modalCancel}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editEmp.name}</Text>
            <TouchableOpacity onPress={savePermissions} disabled={editSaving}>
              <Text style={[styles.modalSave, editSaving && { opacity: 0.5 }]}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <View style={styles.editInfoCard}>
              <Text style={styles.editInfoPhone}>{editEmp.phone}</Text>
              <Text style={styles.editInfoPerms}>
                {t('employees.permissionsActive', { count: editPerms.length })}
              </Text>
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 8 }]}>{t('employees.permissions')}</Text>
            {ALL_PERMISSIONS.map((perm) => (
              <View key={perm} style={styles.permRow}>
                <Text style={styles.permLabel}>{t(`employees.perms.${perm}`)}</Text>
                <Switch
                  value={editPerms.includes(perm)}
                  onValueChange={() => togglePerm(editPerms, setEditPerms, perm)}
                  trackColor={{ true: '#E85D04' }}
                  thumbColor="#fff"
                />
              </View>
            ))}

            {editEmp.is_active && (
              <TouchableOpacity
                style={styles.deactivateBtn}
                onPress={() => { setEditEmp(null); confirmDeactivate(editEmp); }}
              >
                <Text style={styles.deactivateBtnText}>{t('employees.deactivate')} {t('employees.title').toLowerCase()}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.performanceBtn}
              onPress={() => { setEditEmp(null); navigation.navigate('Performance', { employeeId: editEmp._id, name: editEmp.name }); }}
            >
              <Text style={styles.performanceBtnText}>{t('employees.viewPerformance')} →</Text>
            </TouchableOpacity>
          </ScrollView>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#f6f6f6' },
  center:             { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E85D04',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText:         { color: '#fff', fontSize: 18, fontWeight: '800' },
  rowInfo:            { flex: 1 },
  empName:            { fontSize: 16, fontWeight: '700', color: '#111' },
  empPhone:           { fontSize: 13, color: '#666', marginTop: 2 },
  empPerms:           { fontSize: 12, color: '#aaa', marginTop: 2 },
  inactiveBadge:      { backgroundColor: '#e0e0e0', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  inactiveBadgeText:  { fontSize: 10, color: '#888', fontWeight: '700' },
  chevron:            { fontSize: 22, color: '#ccc', marginLeft: 8 },
  empty:              { alignItems: 'center', paddingTop: 80 },
  emptyText:          { fontSize: 16, color: '#aaa' },
  fab: {
    position: 'absolute',
    bottom: 80,
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
  fabText:            { color: '#fff', fontWeight: '700', fontSize: 15 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  modalCancel:        { fontSize: 16, color: '#888' },
  modalTitle:         { fontSize: 17, fontWeight: '700', color: '#111' },
  modalSave:          { fontSize: 16, color: '#E85D04', fontWeight: '700' },
  fieldLabel:         { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
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
  permRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  permLabel:          { fontSize: 15, color: '#333' },
  editInfoCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  editInfoPhone:      { fontSize: 15, color: '#555' },
  editInfoPerms:      { fontSize: 13, color: '#888', marginTop: 4 },
  deactivateBtn: {
    marginTop: 32,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffccbc',
  },
  deactivateBtnText:  { color: '#c62828', fontWeight: '700', fontSize: 15 },
  performanceBtn: {
    marginTop: 12,
    backgroundColor: '#fff3e0',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  performanceBtnText: { color: '#E85D04', fontWeight: '700', fontSize: 15 },
});
