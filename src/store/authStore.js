import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';

const STORAGE_KEY_TOKEN = '@garage_token';
const STORAGE_KEY_USER  = '@garage_user';
const STORAGE_KEY_MODE  = '@garage_mode';

const useAuthStore = create((set) => ({
  user:        null,
  token:       null,
  currentMode: 'mechanic', // 'admin' | 'mechanic'
  hydrated:    false,

  setUser: (user) => {
    set({ user });
    AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user)).catch(() => {});
    // sync language preference
    if (user?.language) {
      i18n.changeLanguage(user.language).catch(() => {});
    }
  },

  setToken: (token) => {
    set({ token });
    if (token) {
      AsyncStorage.setItem(STORAGE_KEY_TOKEN, token).catch(() => {});
    } else {
      AsyncStorage.removeItem(STORAGE_KEY_TOKEN).catch(() => {});
    }
  },

  setMode: (mode) => {
    set({ currentMode: mode });
    AsyncStorage.setItem(STORAGE_KEY_MODE, mode).catch(() => {});
  },

  logout: () => {
    set({ user: null, token: null, currentMode: 'mechanic' });
    AsyncStorage.multiRemove([STORAGE_KEY_TOKEN, STORAGE_KEY_USER, STORAGE_KEY_MODE]).catch(() => {});
  },

  // Call once on app start to restore persisted session
  hydrate: async () => {
    try {
      const [token, userJson, mode] = await AsyncStorage.multiGet([
        STORAGE_KEY_TOKEN,
        STORAGE_KEY_USER,
        STORAGE_KEY_MODE,
      ]);
      const restoredToken = token[1];
      const restoredUser  = userJson[1] ? JSON.parse(userJson[1]) : null;
      const restoredMode  = mode[1] || 'mechanic';

      if (restoredUser?.language) {
        await i18n.changeLanguage(restoredUser.language).catch(() => {});
      }

      set({
        token:       restoredToken,
        user:        restoredUser,
        currentMode: restoredMode,
        hydrated:    true,
      });
    } catch {
      set({ hydrated: true });
    }
  },
}));

export default useAuthStore;
