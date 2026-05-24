import { showAlert } from '../../utils/alert'
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { register } from '../../api/auth.api';
import useAuthStore from '../../store/authStore';

export default function RegisterScreen({ navigation }) {
  const { t } = useTranslation();
  const { setUser, setToken } = useAuthStore();

  const [phone,      setPhone]      = useState('');
  const [password,   setPassword]   = useState('');
  const [confirm,    setConfirm]    = useState('');
  const [name,       setName]       = useState('');
  const [garageName, setGarageName] = useState('');
  const [loading,    setLoading]    = useState(false);
  const [showPass,   setShowPass]   = useState(false);

  function isValidPhone(p) {
    return /^[6-9]\d{9}$/.test(p.trim());
  }

  async function handleRegister() {
    if (!name.trim()) {
      showAlert('', t('auth.nameRequired'));
      return;
    }
    if (!garageName.trim()) {
      showAlert('', t('auth.garageNameRequired'));
      return;
    }
    if (!isValidPhone(phone)) {
      showAlert('', t('auth.invalidPhone'));
      return;
    }
    if (password.length < 6) {
      showAlert('', t('auth.passwordTooShort'));
      return;
    }
    if (password !== confirm) {
      showAlert('', t('auth.passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      const { data } = await register(`+91${phone.trim()}`, password, name.trim(), garageName.trim());
      setToken(data.token);
      setUser(data.user);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || t('auth.loginFailed');
      showAlert('', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← {t('common.back')}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{t('auth.createAccount')}</Text>
        <Text style={styles.subtitle}>{t('auth.registerSubtitle')}</Text>

        <Text style={styles.label}>{t('auth.nameLabel')}</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={t('auth.namePlaceholder')}
          placeholderTextColor="#aaa"
          returnKeyType="next"
          autoCapitalize="words"
        />

        <Text style={styles.label}>{t('auth.garageNameLabel')}</Text>
        <TextInput
          style={styles.input}
          value={garageName}
          onChangeText={setGarageName}
          placeholder={t('auth.garageNamePlaceholder')}
          placeholderTextColor="#aaa"
          returnKeyType="next"
          autoCapitalize="words"
        />

        <Text style={styles.label}>{t('auth.phoneLabel')}</Text>
        <View style={styles.phoneRow}>
          <View style={styles.prefix}>
            <Text style={styles.prefixText}>+91</Text>
          </View>
          <TextInput
            style={styles.phoneInput}
            value={phone}
            onChangeText={setPhone}
            placeholder="98765 43210"
            placeholderTextColor="#aaa"
            keyboardType="phone-pad"
            maxLength={10}
            returnKeyType="next"
          />
        </View>

        <Text style={styles.label}>{t('auth.passwordLabel')}</Text>
        <View style={styles.passRow}>
          <TextInput
            style={styles.passInput}
            value={password}
            onChangeText={setPassword}
            placeholder={t('auth.passwordPlaceholder')}
            placeholderTextColor="#aaa"
            secureTextEntry={!showPass}
            returnKeyType="next"
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass((p) => !p)}>
            <Text style={styles.eyeText}>{showPass ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>{t('auth.confirmPasswordLabel')}</Text>
        <TextInput
          style={styles.input}
          value={confirm}
          onChangeText={setConfirm}
          placeholder={t('auth.confirmPasswordPlaceholder')}
          placeholderTextColor="#aaa"
          secureTextEntry={!showPass}
          returnKeyType="done"
          onSubmitEditing={handleRegister}
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>{t('auth.register')}</Text>
          }
        </TouchableOpacity>

        <View style={styles.loginRow}>
          <Text style={styles.loginHint}>{t('auth.haveAccount')} </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.loginLink}>{t('auth.login')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 80,
    paddingBottom: 40,
  },
  backBtn: { position: 'absolute', top: 56, left: 24 },
  backText: { fontSize: 16, color: '#E85D04' },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#777',
    marginBottom: 28,
    textAlign: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
    marginBottom: 6,
    marginLeft: 2,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 10,
    fontSize: 16,
    paddingVertical: 13,
    paddingHorizontal: 14,
    color: '#111',
    marginBottom: 16,
    backgroundColor: '#fafafa',
  },
  phoneRow: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 16,
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  prefix: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 14,
    alignSelf: 'stretch',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  prefixText: { fontSize: 16, color: '#333', fontWeight: '600' },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 13,
    paddingHorizontal: 14,
    color: '#111',
  },
  passRow: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 16,
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  passInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 13,
    paddingHorizontal: 14,
    color: '#111',
  },
  eyeBtn: { paddingHorizontal: 14 },
  eyeText: { fontSize: 18 },
  button: {
    backgroundColor: '#E85D04',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  loginRow: { flexDirection: 'row', justifyContent: 'center' },
  loginHint: { color: '#777', fontSize: 14 },
  loginLink: { color: '#E85D04', fontSize: 14, fontWeight: '600' },
});
