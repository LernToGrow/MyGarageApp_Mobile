jest.mock('../../src/api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

import client from '../../src/api/client';
import {
  getParts,
  getLowStock,
  createPart,
  updatePart,
  adjustStock,
} from '../../src/api/part.api';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('part.api', () => {
  describe('getParts', () => {
    it('GETs /parts with no params by default', () => {
      getParts();
      expect(client.get).toHaveBeenCalledWith('/parts', { params: {} });
    });

    it('GETs /parts with provided params', () => {
      getParts({ search: 'brake' });
      expect(client.get).toHaveBeenCalledWith('/parts', { params: { search: 'brake' } });
    });
  });

  describe('getLowStock', () => {
    it('GETs /parts/low-stock', () => {
      getLowStock();
      expect(client.get).toHaveBeenCalledWith('/parts/low-stock');
    });
  });

  describe('createPart', () => {
    it('POSTs to /parts with data', () => {
      const data = { name: 'Brake Pad', sku: 'BP001', quantity: 10, unit_price: 150 };
      createPart(data);
      expect(client.post).toHaveBeenCalledWith('/parts', data);
    });
  });

  describe('updatePart', () => {
    it('PATCHes /parts/:id with data', () => {
      updatePart('p1', { unit_price: 200 });
      expect(client.patch).toHaveBeenCalledWith('/parts/p1', { unit_price: 200 });
    });
  });

  describe('adjustStock', () => {
    it('PATCHes /parts/:id/stock with quantity_change and reason', () => {
      adjustStock('p1', { quantity_change: -2, reason: 'used in job' });
      expect(client.patch).toHaveBeenCalledWith('/parts/p1/stock', {
        quantity_change: -2,
        reason: 'used in job',
      });
    });
  });
});
