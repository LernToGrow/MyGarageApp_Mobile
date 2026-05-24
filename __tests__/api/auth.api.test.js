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
  sendOtp,
  verifyOtp,
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
  describe('sendOtp', () => {
    it('POSTs to /auth/send-otp with phone', () => {
      sendOtp('+911234567890');
      expect(client.post).toHaveBeenCalledWith('/auth/send-otp', { phone: '+911234567890' });
    });
  });

  describe('verifyOtp', () => {
    it('POSTs to /auth/verify-otp with idToken, name, garageName', () => {
      verifyOtp('id_tok', 'Alice', 'Best Garage');
      expect(client.post).toHaveBeenCalledWith('/auth/verify-otp', {
        idToken: 'id_tok',
        name: 'Alice',
        garageName: 'Best Garage',
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
