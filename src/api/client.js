import axios from 'axios';
import Constants from 'expo-constants';
import useAuthStore from '../store/authStore';
import i18n from '../i18n';
import ERROR_CODE_KEYS from '../i18n/errorCodes';

const BASE_URL =
  Constants.expoConfig?.extra?.apiUrl ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://10.249.242.70:5000/api';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear auth so AppNavigator redirects to Login
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    const data = error.response?.data;
    if (data?.code) {
      const key = ERROR_CODE_KEYS[data.code];
      if (key) {
        error.response.data.error = i18n.t(key);
      }
    }
    return Promise.reject(error);
  }
);

export default client;
