jest.mock('../../src/api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

import client from '../../src/api/client';
import {
  register,
  login,
  forgotPassword,
  resetPassword,
  getMe,
  updateLanguage,
  updateProfile,
  updateGarage,
  removeGalleryPhoto,
} from '../../src/api/auth.api';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('auth.api', () => {
  describe('register', () => {
    it('POSTs to /auth/register with phone, password, name, garageName', () => {
      register('+911234567890', 'pass123', 'Alice', 'Best Garage');
      expect(client.post).toHaveBeenCalledWith('/auth/register', {
        phone: '+911234567890',
        password: 'pass123',
        name: 'Alice',
        garageName: 'Best Garage',
      });
    });
  });

  describe('login', () => {
    it('POSTs to /auth/login with phone and password', () => {
      login('+911234567890', 'secret');
      expect(client.post).toHaveBeenCalledWith('/auth/login', {
        phone: '+911234567890',
        password: 'secret',
      });
    });
  });

  describe('forgotPassword', () => {
    it('POSTs to /auth/forgot-password with phone', () => {
      forgotPassword('+911234567890');
      expect(client.post).toHaveBeenCalledWith('/auth/forgot-password', {
        phone: '+911234567890',
      });
    });
  });

  describe('resetPassword', () => {
    it('POSTs to /auth/reset-password with phone, reset_token, new_password', () => {
      resetPassword('+911234567890', 'tok123', 'newpass');
      expect(client.post).toHaveBeenCalledWith('/auth/reset-password', {
        phone: '+911234567890',
        reset_token: 'tok123',
        new_password: 'newpass',
      });
    });
  });

  describe('getMe', () => {
    it('GETs /auth/me', () => {
      getMe();
      expect(client.get).toHaveBeenCalledWith('/auth/me');
    });
  });

  describe('updateLanguage', () => {
    it('PATCHes /auth/me with language', () => {
      updateLanguage('hi');
      expect(client.patch).toHaveBeenCalledWith('/auth/me', { language: 'hi' });
    });
  });

  describe('updateProfile', () => {
    it('PATCHes /auth/profile with multipart form containing name', () => {
      updateProfile('Alice', null);
      expect(client.patch).toHaveBeenCalledWith(
        '/auth/profile',
        expect.any(FormData),
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
    });

    it('includes photo in form when photoUri is provided', () => {
      updateProfile('Alice', 'file:///path/to/photo.jpg');
      expect(client.patch).toHaveBeenCalledWith(
        '/auth/profile',
        expect.any(FormData),
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
    });
  });

  describe('updateGarage', () => {
    it('PATCHes /auth/garage with multipart form', () => {
      updateGarage({ address: '123 St', city: 'Pune', gstin: 'GST123' });
      expect(client.patch).toHaveBeenCalledWith(
        '/auth/garage',
        expect.any(FormData),
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
    });
  });

  describe('removeGalleryPhoto', () => {
    it('DELETEs /auth/garage/gallery with url in body', () => {
      removeGalleryPhoto('https://cdn.example.com/photo.jpg');
      expect(client.delete).toHaveBeenCalledWith('/auth/garage/gallery', {
        data: { url: 'https://cdn.example.com/photo.jpg' },
      });
    });
  });
});
