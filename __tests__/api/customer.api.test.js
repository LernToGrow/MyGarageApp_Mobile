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
  searchCustomers,
  createCustomer,
  getCustomer,
  updateCustomer,
  addBike,
  getBikes,
} from '../../src/api/customer.api';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('customer.api', () => {
  describe('searchCustomers', () => {
    it('GETs /customers with search query param', () => {
      searchCustomers('Alice');
      expect(client.get).toHaveBeenCalledWith('/customers', { params: { search: 'Alice' } });
    });
  });

  describe('createCustomer', () => {
    it('POSTs to /customers with data', () => {
      const data = { name: 'Alice', phone: '9999999999' };
      createCustomer(data);
      expect(client.post).toHaveBeenCalledWith('/customers', data);
    });
  });

  describe('getCustomer', () => {
    it('GETs /customers/:id', () => {
      getCustomer('cust1');
      expect(client.get).toHaveBeenCalledWith('/customers/cust1');
    });
  });

  describe('updateCustomer', () => {
    it('PATCHes /customers/:id with data', () => {
      updateCustomer('cust1', { address: 'New Address' });
      expect(client.patch).toHaveBeenCalledWith('/customers/cust1', { address: 'New Address' });
    });
  });

  describe('addBike', () => {
    it('POSTs to /customers/:id/bikes with bike data', () => {
      const bikeData = { make: 'Honda', model: 'CB', year: 2020, plate_number: 'MH12AB1234', fuel_type: 'petrol', odometer: 5000 };
      addBike('cust1', bikeData);
      expect(client.post).toHaveBeenCalledWith('/customers/cust1/bikes', bikeData);
    });
  });

  describe('getBikes', () => {
    it('GETs /customers/:id/bikes', () => {
      getBikes('cust1');
      expect(client.get).toHaveBeenCalledWith('/customers/cust1/bikes');
    });
  });
});
