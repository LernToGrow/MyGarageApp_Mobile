import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import RegisterScreen from '../../src/screens/auth/RegisterScreen';

// ── mocks ────────────────────────────────────────────────────────────────────

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

const mockSetUser  = jest.fn();
const mockSetToken = jest.fn();
jest.mock('../../src/store/authStore', () => () => ({
  setUser:  mockSetUser,
  setToken: mockSetToken,
}));

const mockRegister = jest.fn();
jest.mock('../../src/api/auth.api', () => ({
  register: (...args) => mockRegister(...args),
}));

const mockShowAlert = jest.fn();
jest.mock('../../src/utils/alert', () => ({
  showAlert: (...args) => mockShowAlert(...args),
}));

const mockGoBack = jest.fn();
const navigation = { goBack: mockGoBack };

// ── helpers ───────────────────────────────────────────────────────────────────

function renderScreen() {
  return render(<RegisterScreen navigation={navigation} />);
}

function fillForm({ name = 'Alice', garageName = 'Ace Garage', phone = '9876543210', password = 'pass123', confirm = 'pass123' } = {}) {
  const { getByPlaceholderText } = renderScreen();
  fireEvent.changeText(getByPlaceholderText('auth.namePlaceholder'),           name);
  fireEvent.changeText(getByPlaceholderText('auth.garageNamePlaceholder'),     garageName);
  fireEvent.changeText(getByPlaceholderText('98765 43210'),                    phone);
  fireEvent.changeText(getByPlaceholderText('auth.passwordPlaceholder'),       password);
  fireEvent.changeText(getByPlaceholderText('auth.confirmPasswordPlaceholder'),confirm);
  return getByPlaceholderText;
}

// ── tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

describe('RegisterScreen', () => {
  it('renders all input fields and register button', () => {
    const { getByPlaceholderText, getByText } = renderScreen();
    expect(getByPlaceholderText('auth.namePlaceholder')).toBeTruthy();
    expect(getByPlaceholderText('auth.garageNamePlaceholder')).toBeTruthy();
    expect(getByPlaceholderText('98765 43210')).toBeTruthy();
    expect(getByPlaceholderText('auth.passwordPlaceholder')).toBeTruthy();
    expect(getByPlaceholderText('auth.confirmPasswordPlaceholder')).toBeTruthy();
    expect(getByText('auth.register')).toBeTruthy();
  });

  it('shows alert when name is empty', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('auth.register'));
    expect(mockShowAlert).toHaveBeenCalledWith('', 'auth.nameRequired');
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('shows alert when garage name is empty', () => {
    const { getByPlaceholderText, getByText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText('auth.namePlaceholder'), 'Alice');
    fireEvent.press(getByText('auth.register'));
    expect(mockShowAlert).toHaveBeenCalledWith('', 'auth.garageNameRequired');
  });

  it('shows alert when phone is invalid', () => {
    const { getByPlaceholderText, getByText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText('auth.namePlaceholder'),       'Alice');
    fireEvent.changeText(getByPlaceholderText('auth.garageNamePlaceholder'), 'Ace Garage');
    fireEvent.changeText(getByPlaceholderText('98765 43210'),                '123'); // invalid
    fireEvent.press(getByText('auth.register'));
    expect(mockShowAlert).toHaveBeenCalledWith('', 'auth.invalidPhone');
  });

  it('shows alert when password is too short', () => {
    const { getByPlaceholderText, getByText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText('auth.namePlaceholder'),       'Alice');
    fireEvent.changeText(getByPlaceholderText('auth.garageNamePlaceholder'), 'Ace Garage');
    fireEvent.changeText(getByPlaceholderText('98765 43210'),                '9876543210');
    fireEvent.changeText(getByPlaceholderText('auth.passwordPlaceholder'),   'abc');
    fireEvent.press(getByText('auth.register'));
    expect(mockShowAlert).toHaveBeenCalledWith('', 'auth.passwordTooShort');
  });

  it('shows alert when passwords do not match', () => {
    const { getByPlaceholderText, getByText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText('auth.namePlaceholder'),            'Alice');
    fireEvent.changeText(getByPlaceholderText('auth.garageNamePlaceholder'),      'Ace Garage');
    fireEvent.changeText(getByPlaceholderText('98765 43210'),                     '9876543210');
    fireEvent.changeText(getByPlaceholderText('auth.passwordPlaceholder'),        'pass123');
    fireEvent.changeText(getByPlaceholderText('auth.confirmPasswordPlaceholder'), 'different');
    fireEvent.press(getByText('auth.register'));
    expect(mockShowAlert).toHaveBeenCalledWith('', 'auth.passwordMismatch');
  });

  it('calls register API with correct args on valid form', async () => {
    mockRegister.mockResolvedValueOnce({ data: { token: 'tok', user: { id: '1' } } });
    const { getByPlaceholderText, getByText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText('auth.namePlaceholder'),            'Alice');
    fireEvent.changeText(getByPlaceholderText('auth.garageNamePlaceholder'),      'Ace Garage');
    fireEvent.changeText(getByPlaceholderText('98765 43210'),                     '9876543210');
    fireEvent.changeText(getByPlaceholderText('auth.passwordPlaceholder'),        'pass123');
    fireEvent.changeText(getByPlaceholderText('auth.confirmPasswordPlaceholder'), 'pass123');
    fireEvent.press(getByText('auth.register'));
    await waitFor(() => expect(mockRegister).toHaveBeenCalledWith('+919876543210', 'pass123', 'Alice', 'Ace Garage'));
  });

  it('stores token and user on successful register', async () => {
    const fakeUser  = { id: '1', name: 'Alice' };
    const fakeToken = 'jwt-tok';
    mockRegister.mockResolvedValueOnce({ data: { token: fakeToken, user: fakeUser } });
    const { getByPlaceholderText, getByText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText('auth.namePlaceholder'),            'Alice');
    fireEvent.changeText(getByPlaceholderText('auth.garageNamePlaceholder'),      'Ace Garage');
    fireEvent.changeText(getByPlaceholderText('98765 43210'),                     '9876543210');
    fireEvent.changeText(getByPlaceholderText('auth.passwordPlaceholder'),        'pass123');
    fireEvent.changeText(getByPlaceholderText('auth.confirmPasswordPlaceholder'), 'pass123');
    fireEvent.press(getByText('auth.register'));
    await waitFor(() => {
      expect(mockSetToken).toHaveBeenCalledWith(fakeToken);
      expect(mockSetUser).toHaveBeenCalledWith(fakeUser);
    });
  });

  it('shows API error message on register failure', async () => {
    mockRegister.mockRejectedValueOnce({ response: { data: { error: 'Phone already registered' } } });
    const { getByPlaceholderText, getByText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText('auth.namePlaceholder'),            'Alice');
    fireEvent.changeText(getByPlaceholderText('auth.garageNamePlaceholder'),      'Ace Garage');
    fireEvent.changeText(getByPlaceholderText('98765 43210'),                     '9876543210');
    fireEvent.changeText(getByPlaceholderText('auth.passwordPlaceholder'),        'pass123');
    fireEvent.changeText(getByPlaceholderText('auth.confirmPasswordPlaceholder'), 'pass123');
    fireEvent.press(getByText('auth.register'));
    await waitFor(() =>
      expect(mockShowAlert).toHaveBeenCalledWith('', 'Phone already registered')
    );
  });

  it('calls navigation.goBack when back button is pressed', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('← common.back'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('calls navigation.goBack when "already have account" login link is pressed', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('auth.login'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});
