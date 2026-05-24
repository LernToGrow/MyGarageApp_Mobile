import { showAlert } from '../../utils/alert'
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { forgotPassword, resetPassword } from '../../api/auth.api';

// Two-step screen:
// Step 1 — enter phone → request reset token
// Step 2 — enter token + new password → reset
export default function ForgotPasswordScreen({ navigation }) {
  const { t } = useTranslation();

  const [step,       setStep]       = useState(1); // 1 = phone, 2 = reset
  const [phone,      setPhone]      = useState('');
  const [token,      setToken]      = useState('');
  const [newPass,    setNewPass]    = useState('');
  const [confirm,    setConfirm]    = useState('');
  const [loading,    setLoading]    = useState(false);
  const [showPass,   setShowPass]   = useState(false);

  function isValidPhone(p) {
    return /^[6-9]\d{9}$/.test(p.trim());
  }

  async function handleRequestReset() {
    if (!isValidPhone(phone)) {
      showAlert('', t('auth.invalidPhone'));
      return;
    }
    setLoading(true);
    try {
      const { data } = await forgotPassword(`+91${phone.trim()}`);
      // In development the reset_token is returned in the response.
      // Pre-fill it so the tester doesn't have to copy-paste.
      if (data.reset_token) setToken(data.reset_token);
      showAlert(
        t('auth.resetSentTitle'),
        t('auth.resetSentMessage'),
        [{ text: 'OK', onPress: () => setStep(2) }]
      );
    } catch (err) {
      const msg = err.response?.data?.error || err.message || t('auth.loginFailed');
      showAlert('', msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!token.trim()) {
      showAlert('', t('auth.tokenRequired'));
      return;
    }
    if (newPass.length < 6) {
      showAlert('', t('auth.passwordTooShort'));
      return;
    }
    if (newPass !== confirm) {
      showAlert('', t('auth.passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      await resetPassword(`+91${phone.trim()}`, token.trim(), newPass);
      showAlert(
        t('auth.resetSuccessTitle'),
        t('auth.resetSuccessMessage'),
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
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

        <Text style={styles.title}>{t('auth.forgotPassword')}</Text>

        {step === 1 ? (
          <>
            <Text style={styles.subtitle}>{t('auth.forgotSubtitle')}</Text>

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
                returnKeyType="done"
                onSubmitEditing={handleRequestReset}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRequestReset}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.buttonText}>{t('auth.sendResetCode')}</Text>
              }
            </TouchableOpacity>

          </>
        ) : (
          <>
            <Text style={styles.subtitle}>{t('auth.resetSubtitle')}</Text>

            <Text style={styles.label}>{t('auth.resetTokenLabel')}</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={token}
              editable={false}
              placeholder={t('auth.resetTokenPlaceholder')}
              placeholderTextColor="#aaa"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>{t('auth.newPasswordLabel')}</Text>
            <View style={styles.passRow}>
              <TextInput
                style={styles.passInput}
                value={newPass}
                onChangeText={setNewPass}
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
              onSubmitEditing={handleResetPassword}
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.buttonText}>{t('auth.resetPassword')}</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.altLink} onPress={() => setStep(1)}>
              <Text style={styles.altLinkText}>{t('auth.requestNewCode')}</Text>
            </TouchableOpacity>
          </>
        )}
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
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#777',
    marginBottom: 28,
    textAlign: 'center',
    lineHeight: 20,
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
    marginBottom: 20,
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
    marginBottom: 16,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  altLink: { alignItems: 'center', paddingVertical: 6 },
  altLinkText: { color: '#E85D04', fontSize: 14 },
  inputDisabled: { backgroundColor: '#f0f0f0', color: '#888' },
});
