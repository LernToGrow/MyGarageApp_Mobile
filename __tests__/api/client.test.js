// Mock axios before anything else
const mockRequestUse = jest.fn();
const mockResponseUse = jest.fn();
const mockAxiosInstance = {
  interceptors: {
    request: { use: mockRequestUse },
    response: { use: mockResponseUse },
  },
};

jest.mock('axios', () => ({
  __esModule: true,
  default: { create: jest.fn(() => mockAxiosInstance) },
  create: jest.fn(() => mockAxiosInstance),
}));

jest.mock('../../src/i18n', () => ({
  __esModule: true,
  default: { t: jest.fn((k) => k), changeLanguage: jest.fn() },
  t: jest.fn((k) => k),
}));

jest.mock('../../src/i18n/errorCodes', () => ({
  __esModule: true,
  default: { TOKEN_INVALID: 'errors.tokenInvalid' },
}));

const mockLogout = jest.fn();
const mockGetState = jest.fn(() => ({ token: null, logout: mockLogout }));

jest.mock('../../src/store/authStore', () => ({
  __esModule: true,
  default: { getState: mockGetState },
}));

describe('api/client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetState.mockReturnValue({ token: null, logout: mockLogout });
    jest.resetModules();
    // re-apply mocks after resetModules
    jest.mock('axios', () => ({
      __esModule: true,
      default: { create: jest.fn(() => mockAxiosInstance) },
      create: jest.fn(() => mockAxiosInstance),
    }));
  });

  it('registers request and response interceptors on load', () => {
    require('../../src/api/client');
    expect(mockRequestUse).toHaveBeenCalledTimes(1);
    expect(mockResponseUse).toHaveBeenCalledTimes(1);
  });

  describe('request interceptor', () => {
    it('attaches Bearer token when token exists', () => {
      mockGetState.mockReturnValue({ token: 'tok123', logout: mockLogout });
      require('../../src/api/client');
      const handler = mockRequestUse.mock.calls[0][0];
      const config = { headers: {} };
      handler(config);
      expect(config.headers.Authorization).toBe('Bearer tok123');
    });

    it('does not set Authorization when token is null', () => {
      mockGetState.mockReturnValue({ token: null, logout: mockLogout });
      require('../../src/api/client');
      const handler = mockRequestUse.mock.calls[0][0];
      const config = { headers: {} };
      handler(config);
      expect(config.headers.Authorization).toBeUndefined();
    });
  });

  describe('response interceptor', () => {
    it('calls logout when response status is 401', async () => {
      require('../../src/api/client');
      const errorHandler = mockResponseUse.mock.calls[0][1];
      const error = { response: { status: 401, data: {} } };
      await expect(errorHandler(error)).rejects.toEqual(error);
      expect(mockLogout).toHaveBeenCalled();
    });

    it('passes through success responses unchanged', () => {
      require('../../src/api/client');
      const successHandler = mockResponseUse.mock.calls[0][0];
      const response = { data: { ok: true } };
      expect(successHandler(response)).toBe(response);
    });

    it('does not call logout for non-401 errors', async () => {
      require('../../src/api/client');
      const errorHandler = mockResponseUse.mock.calls[0][1];
      const error = { response: { status: 500, data: {} } };
      await expect(errorHandler(error)).rejects.toEqual(error);
      expect(mockLogout).not.toHaveBeenCalled();
    });
  });
});
