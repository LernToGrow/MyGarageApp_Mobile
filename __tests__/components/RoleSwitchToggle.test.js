import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RoleSwitchToggle from '../../src/components/RoleSwitchToggle';

// Mock translation hook
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => ({ 'roles.mechanic': 'Mechanic', 'roles.admin': 'Admin' }[key] ?? key),
  }),
}));

// Mock auth store
const mockSetMode = jest.fn();
let mockStoreState = { user: null, currentMode: 'mechanic', setMode: mockSetMode };

jest.mock('../../src/store/authStore', () => () => mockStoreState);

beforeEach(() => {
  mockSetMode.mockClear();
  mockStoreState = { user: null, currentMode: 'mechanic', setMode: mockSetMode };
});

describe('RoleSwitchToggle', () => {
  it('renders nothing when user is not garage_owner', () => {
    mockStoreState.user = { role: 'mechanic' };
    const { toJSON } = render(<RoleSwitchToggle />);
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when user is null', () => {
    mockStoreState.user = null;
    const { toJSON } = render(<RoleSwitchToggle />);
    expect(toJSON()).toBeNull();
  });

  it('renders both pills for garage_owner', () => {
    mockStoreState.user = { role: 'garage_owner' };
    const { getByText } = render(<RoleSwitchToggle />);
    expect(getByText('Mechanic')).toBeTruthy();
    expect(getByText('Admin')).toBeTruthy();
  });

  it('calls setMode("mechanic") when Mechanic pill is pressed', () => {
    mockStoreState.user = { role: 'garage_owner' };
    const { getByText } = render(<RoleSwitchToggle />);
    fireEvent.press(getByText('Mechanic'));
    expect(mockSetMode).toHaveBeenCalledWith('mechanic');
  });

  it('calls setMode("admin") when Admin pill is pressed', () => {
    mockStoreState.user = { role: 'garage_owner' };
    const { getByText } = render(<RoleSwitchToggle />);
    fireEvent.press(getByText('Admin'));
    expect(mockSetMode).toHaveBeenCalledWith('admin');
  });

  it('matches snapshot with mechanic mode active', () => {
    mockStoreState.user = { role: 'garage_owner' };
    mockStoreState.currentMode = 'mechanic';
    const { toJSON } = render(<RoleSwitchToggle />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches snapshot with admin mode active', () => {
    mockStoreState.user = { role: 'garage_owner' };
    mockStoreState.currentMode = 'admin';
    const { toJSON } = render(<RoleSwitchToggle />);
    expect(toJSON()).toMatchSnapshot();
  });
});
