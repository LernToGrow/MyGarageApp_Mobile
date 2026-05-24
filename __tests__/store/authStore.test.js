import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../../src/i18n', () => ({
  __esModule: true,
  default: { changeLanguage: jest.fn(() => Promise.resolve()) },
}));

import useAuthStore from '../../src/store/authStore';

const INITIAL = { user: null, token: null, currentMode: 'mechanic', hydrated: false };

beforeEach(() => {
  useAuthStore.setState(INITIAL);
  jest.clearAllMocks();
});

describe('authStore', () => {
  describe('initial state', () => {
    it('starts with null user and token', () => {
      const { user, token } = useAuthStore.getState();
      expect(user).toBeNull();
      expect(token).toBeNull();
    });

    it('starts with mechanic mode', () => {
      expect(useAuthStore.getState().currentMode).toBe('mechanic');
    });

    it('starts as not hydrated', () => {
      expect(useAuthStore.getState().hydrated).toBe(false);
    });
  });

  describe('setUser', () => {
    it('updates user in state', () => {
      const user = { id: '1', name: 'Alice', role: 'mechanic' };
      useAuthStore.getState().setUser(user);
      expect(useAuthStore.getState().user).toEqual(user);
    });

    it('persists user to AsyncStorage', () => {
      const user = { id: '1', name: 'Alice' };
      useAuthStore.getState().setUser(user);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@garage_user',
        JSON.stringify(user)
      );
    });

    it('changes i18n language when user has language preference', () => {
      const i18n = require('../../src/i18n').default;
      const user = { id: '1', name: 'Alice', language: 'mr' };
      useAuthStore.getState().setUser(user);
      expect(i18n.changeLanguage).toHaveBeenCalledWith('mr');
    });
  });

  describe('setToken', () => {
    it('updates token in state', () => {
      useAuthStore.getState().setToken('abc123');
      expect(useAuthStore.getState().token).toBe('abc123');
    });

    it('saves token to AsyncStorage when non-null', () => {
      useAuthStore.getState().setToken('abc123');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@garage_token', 'abc123');
    });

    it('removes token from AsyncStorage when null', () => {
      useAuthStore.getState().setToken(null);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@garage_token');
    });
  });

  describe('setMode', () => {
    it('updates currentMode in state', () => {
      useAuthStore.getState().setMode('admin');
      expect(useAuthStore.getState().currentMode).toBe('admin');
    });

    it('persists mode to AsyncStorage', () => {
      useAuthStore.getState().setMode('admin');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@garage_mode', 'admin');
    });
  });

  describe('logout', () => {
    it('clears user, token and resets mode to mechanic', () => {
      useAuthStore.setState({ user: { id: '1' }, token: 'tok', currentMode: 'admin' });
      useAuthStore.getState().logout();

      const { user, token, currentMode } = useAuthStore.getState();
      expect(user).toBeNull();
      expect(token).toBeNull();
      expect(currentMode).toBe('mechanic');
    });

    it('removes all session keys from AsyncStorage', () => {
      useAuthStore.getState().logout();
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        '@garage_token',
        '@garage_user',
        '@garage_mode',
      ]);
    });
  });

  describe('hydrate', () => {
    it('restores token, user, and mode from AsyncStorage', async () => {
      const user = { id: '1', name: 'Bob' };
      AsyncStorage.multiGet.mockResolvedValueOnce([
        ['@garage_token', 'tok123'],
        ['@garage_user', JSON.stringify(user)],
        ['@garage_mode', 'admin'],
      ]);

      await useAuthStore.getState().hydrate();

      const state = useAuthStore.getState();
      expect(state.token).toBe('tok123');
      expect(state.user).toEqual(user);
      expect(state.currentMode).toBe('admin');
      expect(state.hydrated).toBe(true);
    });

    it('defaults mode to mechanic when not stored', async () => {
      AsyncStorage.multiGet.mockResolvedValueOnce([
        ['@garage_token', null],
        ['@garage_user', null],
        ['@garage_mode', null],
      ]);

      await useAuthStore.getState().hydrate();
      expect(useAuthStore.getState().currentMode).toBe('mechanic');
      expect(useAuthStore.getState().hydrated).toBe(true);
    });

    it('sets hydrated=true even when AsyncStorage throws', async () => {
      AsyncStorage.multiGet.mockRejectedValueOnce(new Error('storage error'));
      await useAuthStore.getState().hydrate();
      expect(useAuthStore.getState().hydrated).toBe(true);
    });
  });
});
