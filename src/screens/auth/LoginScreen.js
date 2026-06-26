import { showAlert } from '../../utils/alert'
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { login } from '../../api/auth.api';
import useAuthStore from '../../store/authStore';

export default function LoginScreen({ navigation }) {
  const { t } = useTranslation();
  const { setUser, setToken } = useAuthStore();

  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  function isValidPhone(p) {
    return /^[6-9]\d{9}$/.test(p.trim());
  }

  async function handleLogin() {
    if (!isValidPhone(phone)) {
      showAlert('', t('auth.invalidPhone'));
      return;
    }
    if (!password) {
      showAlert('', t('auth.passwordRequired'));
      return;
    }

    setLoading(true);
    try {
      const { data } = await login(`+91${phone.trim()}`, password);
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
        <Image
          source={require('../../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.subtitle}>{t('auth.signInToContinue')}</Text>

        {/* Phone */}
        <Text style={styles.label}>{t('auth.phoneLabel')}</Text>
        <View style={styles.inputRow}>
          <View style={styles.prefix}>
            <Text style={styles.prefixText}>+91</Text>
          </View>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="98765 43210"
            placeholderTextColor="#aaa"
            keyboardType="phone-pad"
            maxLength={10}
            returnKeyType="next"
            autoCapitalize="none"
          />
        </View>

        {/* Password */}
        <Text style={styles.label}>{t('auth.passwordLabel')}</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, styles.inputFull]}
            value={password}
            onChangeText={setPassword}
            placeholder={t('auth.passwordPlaceholder')}
            placeholderTextColor="#aaa"
            secureTextEntry={!showPass}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass((p) => !p)}>
            <Text style={styles.eyeText}>{showPass ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        </View>

        {/* Forgot password */}
        <TouchableOpacity
          style={styles.forgotBtn}
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          <Text style={styles.forgotText}>{t('auth.forgotPassword')}</Text>
        </TouchableOpacity>

        {/* Login button */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>{t('auth.login')}</Text>
          }
        </TouchableOpacity>

        {/* Register link */}
        <View style={styles.registerRow}>
          <Text style={styles.registerHint}>{t('auth.noAccount')} </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>{t('auth.createAccount')}</Text>
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
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  logo: {
    width: 220,
    height: 56,
    alignSelf: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#777',
    marginBottom: 36,
    textAlign: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
    marginBottom: 6,
    marginLeft: 2,
  },
  inputRow: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 18,
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
  prefixText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    color: '#111',
  },
  inputFull: {
    paddingLeft: 14,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  eyeText: {
    fontSize: 18,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: -8,
  },
  forgotText: {
    color: '#E85D04',
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#E85D04',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
  },
  registerHint: {
    color: '#777',
    fontSize: 14,
  },
  registerLink: {
    color: '#E85D04',
    fontSize: 14,
    fontWeight: '600',
  },
});
