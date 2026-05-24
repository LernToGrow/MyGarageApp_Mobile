import { showAlert } from '../../utils/alert'
import React, { useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { auth } from '../../config/firebase';
import { verifyOtp } from '../../api/auth.api';
import useAuthStore from '../../store/authStore';

export default function OTPScreen({ route, navigation }) {
  const { t }           = useTranslation();
  const { verificationId, phone } = route.params;

  const [otp, setOtp]           = useState('');
  const [loading, setLoading]   = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [name, setName]         = useState('');
  const [garageName, setGarageName] = useState('');
  const [idToken, setIdToken]   = useState(null);
  const inputRef                = useRef(null);
  const { setUser, setToken }   = useAuthStore();

  async function handleVerify() {
    if (otp.trim().length !== 6) {
      showAlert('', t('auth.invalidOtp'));
      return;
    }
    setLoading(true);
    try {
      const credential = PhoneAuthProvider.credential(verificationId, otp.trim());
      const userCred   = await signInWithCredential(auth, credential);
      const token      = await userCred.user.getIdToken();
      setIdToken(token);
      await submitToBackend(token, null, null);
    } catch (err) {
      console.log('OTP verify error:', JSON.stringify({ code: err.code, message: err.message }));
      const msg = err.code === 'auth/invalid-verification-code'
        ? t('auth.invalidOtp')
        : err.message || t('auth.loginFailed');
      showAlert('', msg);
    } finally {
      setLoading(false);
    }
  }

  async function submitToBackend(token, ownerName, garageNameVal) {
    try {
      const { data } = await verifyOtp(token, ownerName, garageNameVal);
      setToken(data.token);
      setUser(data.user);
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.isNewUser) {
        setIsNewUser(true);
      } else {
        showAlert('', resp?.error || err.message || t('auth.loginFailed'));
      }
    }
  }

  async function handleRegister() {
    if (!name.trim() || !garageName.trim()) {
      showAlert('', 'Please enter your name and garage name.');
      return;
    }
    setLoading(true);
    try {
      await submitToBackend(idToken, name.trim(), garageName.trim());
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← {t('common.back')}</Text>
      </TouchableOpacity>

      {!isNewUser ? (
        <>
          <Text style={styles.title}>{t('auth.enterOtp')}</Text>
          <Text style={styles.subtitle}>Sent to {phone}</Text>

          <TextInput
            ref={inputRef}
            style={styles.otpInput}
            value={otp}
            onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
            placeholder="------"
            placeholderTextColor="#ccc"
            keyboardType="number-pad"
            maxLength={6}
            returnKeyType="done"
            onSubmitEditing={handleVerify}
            autoFocus
            textAlign="center"
            letterSpacing={12}
          />

          <TouchableOpacity
            style={[styles.button, (loading || otp.length < 6) && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={loading || otp.length < 6}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>{t('auth.verifyOtp')}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.resendBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.resendText}>{t('auth.resendOtp')}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Tell us about your garage</Text>

          <TextInput
            style={styles.regInput}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor="#aaa"
            returnKeyType="next"
          />
          <TextInput
            style={styles.regInput}
            value={garageName}
            onChangeText={setGarageName}
            placeholder="Garage name"
            placeholderTextColor="#aaa"
            returnKeyType="done"
            onSubmitEditing={handleRegister}
          />

          <TouchableOpacity
            style={[styles.button, (loading || !name.trim() || !garageName.trim()) && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading || !name.trim() || !garageName.trim()}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Create Account</Text>
            }
          </TouchableOpacity>
        </>
      )}

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  backBtn: {
    position: 'absolute',
    top: 56,
    left: 24,
  },
  backText: {
    fontSize: 16,
    color: '#E85D04',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#777',
    marginBottom: 36,
    textAlign: 'center',
  },
  otpInput: {
    borderWidth: 1.5,
    borderColor: '#E85D04',
    borderRadius: 12,
    fontSize: 32,
    fontWeight: '700',
    paddingVertical: 18,
    paddingHorizontal: 16,
    color: '#111',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#E85D04',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  resendBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  resendText: {
    color: '#E85D04',
    fontSize: 15,
  },
  regInput: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 10,
    fontSize: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    color: '#111',
    marginBottom: 16,
  },
});
