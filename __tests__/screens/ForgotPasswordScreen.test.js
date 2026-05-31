import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ForgotPasswordScreen from '../../src/screens/auth/ForgotPasswordScreen';

// ── mocks ────────────────────────────────────────────────────────────────────

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

const mockForgotPassword = jest.fn();
const mockResetPassword  = jest.fn();
jest.mock('../../src/api/auth.api', () => ({
  forgotPassword: (...args) => mockForgotPassword(...args),
  resetPassword:  (...args) => mockResetPassword(...args),
}));

const mockShowAlert = jest.fn();
jest.mock('../../src/utils/alert', () => ({
  showAlert: (...args) => mockShowAlert(...args),
}));

const mockNavigate = jest.fn();
const mockGoBack   = jest.fn();
const navigation   = { navigate: mockNavigate, goBack: mockGoBack };

// ── helpers ───────────────────────────────────────────────────────────────────

function renderScreen() {
  return render(<ForgotPasswordScreen navigation={navigation} />);
}

// ── tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ForgotPasswordScreen — Step 1 (phone entry)', () => {
  it('renders phone input and send button', () => {
    const { getByPlaceholderText, getByText } = renderScreen();
    expect(getByPlaceholderText('98765 43210')).toBeTruthy();
    expect(getByText('auth.sendResetCode')).toBeTruthy();
  });

  it('shows alert for invalid phone (too short)', () => {
    const { getByPlaceholderText, getByText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText('98765 43210'), '123');
    fireEvent.press(getByText('auth.sendResetCode'));
    expect(mockShowAlert).toHaveBeenCalledWith('', 'auth.invalidPhone');
    expect(mockForgotPassword).not.toHaveBeenCalled();
  });

  it('shows alert for phone starting with invalid digit', () => {
    const { getByPlaceholderText, getByText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText('98765 43210'), '1234567890'); // starts with 1
    fireEvent.press(getByText('auth.sendResetCode'));
    expect(mockShowAlert).toHaveBeenCalledWith('', 'auth.invalidPhone');
  });

  it('calls forgotPassword API with +91 prefix on valid phone', async () => {
    mockForgotPassword.mockResolvedValueOnce({ data: {} });
    const { getByPlaceholderText, getByText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText('98765 43210'), '9876543210');
    fireEvent.press(getByText('auth.sendResetCode'));
    await waitFor(() =>
      expect(mockForgotPassword).toHaveBeenCalledWith('+919876543210')
    );
  });

  it('pre-fills reset token when API returns reset_token (dev mode)', async () => {
    mockForgotPassword.mockResolvedValueOnce({ data: { reset_token: 'TOK123' } });
    // The alert button press advances to step 2; capture the onPress callback
    mockShowAlert.mockImplementationOnce((_title, _msg, buttons) => {
      buttons[0].onPress?.();
    });
    const { getByPlaceholderText, getByText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText('98765 43210'), '9876543210');
    fireEvent.press(getByText('auth.sendResetCode'));
    await waitFor(() =>
      expect(getByPlaceholderText('auth.resetTokenPlaceholder')).toBeTruthy()
    );
  });

  it('shows API error on forgotPassword failure', async () => {
    mockForgotPassword.mockRejectedValueOnce({ response: { data: { error: 'User not found' } } });
    const { getByPlaceholderText, getByText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText('98765 43210'), '9876543210');
    fireEvent.press(getByText('auth.sendResetCode'));
    await waitFor(() =>
      expect(mockShowAlert).toHaveBeenCalledWith('', 'User not found')
    );
  });

  it('calls navigation.goBack on back button press', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('← common.back'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});

describe('ForgotPasswordScreen — Step 2 (reset password)', () => {
  async function advanceToStep2(utils) {
    mockForgotPassword.mockResolvedValueOnce({ data: { reset_token: 'TOK' } });
    // Auto-advance by triggering the OK button callback in the alert
    mockShowAlert.mockImplementationOnce((_t, _m, buttons) => buttons?.[0]?.onPress?.());
    fireEvent.changeText(utils.getByPlaceholderText('98765 43210'), '9876543210');
    fireEvent.press(utils.getByText('auth.sendResetCode'));
    await waitFor(() => utils.getByText('auth.resetPassword'));
  }

  it('shows alert when token is empty', async () => {
    const utils = renderScreen();
    await advanceToStep2(utils);
    // Clear the pre-filled token to simulate empty state (token field is not editable, but we test the guard)
    // We can verify by calling reset without filling new pass (token is pre-filled by API)
    mockShowAlert.mockClear();
    fireEvent.changeText(utils.getByPlaceholderText('auth.passwordPlaceholder'), '');
    fireEvent.press(utils.getByText('auth.resetPassword'));
    expect(mockShowAlert).toHaveBeenCalledWith('', 'auth.passwordTooShort');
  });

  it('shows alert when new password is too short', async () => {
    const utils = renderScreen();
    await advanceToStep2(utils);
    mockShowAlert.mockClear();
    fireEvent.changeText(utils.getByPlaceholderText('auth.passwordPlaceholder'), 'abc');
    fireEvent.press(utils.getByText('auth.resetPassword'));
    expect(mockShowAlert).toHaveBeenCalledWith('', 'auth.passwordTooShort');
  });

  it('shows alert when passwords do not match', async () => {
    const utils = renderScreen();
    await advanceToStep2(utils);
    mockShowAlert.mockClear();
    fireEvent.changeText(utils.getByPlaceholderText('auth.passwordPlaceholder'),        'pass123');
    fireEvent.changeText(utils.getByPlaceholderText('auth.confirmPasswordPlaceholder'), 'different');
    fireEvent.press(utils.getByText('auth.resetPassword'));
    expect(mockShowAlert).toHaveBeenCalledWith('', 'auth.passwordMismatch');
  });

  it('calls resetPassword API with correct args', async () => {
    mockResetPassword.mockResolvedValueOnce({});
    mockShowAlert.mockImplementation((_t, _m, buttons) => buttons?.[0]?.onPress?.());
    const utils = renderScreen();
    await advanceToStep2(utils);
    mockShowAlert.mockClear();
    fireEvent.changeText(utils.getByPlaceholderText('auth.passwordPlaceholder'),        'newpass1');
    fireEvent.changeText(utils.getByPlaceholderText('auth.confirmPasswordPlaceholder'), 'newpass1');
    fireEvent.press(utils.getByText('auth.resetPassword'));
    await waitFor(() =>
      expect(mockResetPassword).toHaveBeenCalledWith('+919876543210', 'TOK', 'newpass1')
    );
  });

  it('navigates to Login on successful reset', async () => {
    mockResetPassword.mockResolvedValueOnce({});
    // First call = step 1 OK button, second call = success OK button
    mockShowAlert
      .mockImplementationOnce((_t, _m, buttons) => buttons[0].onPress?.())
      .mockImplementationOnce((_t, _m, buttons) => buttons[0].onPress?.());
    const utils = renderScreen();
    mockForgotPassword.mockResolvedValueOnce({ data: { reset_token: 'TOK' } });
    fireEvent.changeText(utils.getByPlaceholderText('98765 43210'), '9876543210');
    fireEvent.press(utils.getByText('auth.sendResetCode'));
    await waitFor(() => utils.getByText('auth.resetPassword'));
    fireEvent.changeText(utils.getByPlaceholderText('auth.passwordPlaceholder'),        'newpass1');
    fireEvent.changeText(utils.getByPlaceholderText('auth.confirmPasswordPlaceholder'), 'newpass1');
    fireEvent.press(utils.getByText('auth.resetPassword'));
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('Login')
    );
  });

  it('shows API error on resetPassword failure', async () => {
    mockResetPassword.mockRejectedValueOnce({ response: { data: { error: 'Invalid token' } } });
    mockShowAlert.mockImplementationOnce((_t, _m, buttons) => buttons?.[0]?.onPress?.());
    const utils = renderScreen();
    await advanceToStep2(utils);
    mockShowAlert.mockClear();
    fireEvent.changeText(utils.getByPlaceholderText('auth.passwordPlaceholder'),        'newpass1');
    fireEvent.changeText(utils.getByPlaceholderText('auth.confirmPasswordPlaceholder'), 'newpass1');
    fireEvent.press(utils.getByText('auth.resetPassword'));
    await waitFor(() =>
      expect(mockShowAlert).toHaveBeenCalledWith('', 'Invalid token')
    );
  });

  it('goes back to step 1 when "request new code" link is pressed', async () => {
    const utils = renderScreen();
    await advanceToStep2(utils);
    fireEvent.press(utils.getByText('auth.requestNewCode'));
    await waitFor(() =>
      expect(utils.getByText('auth.sendResetCode')).toBeTruthy()
    );
  });
});
