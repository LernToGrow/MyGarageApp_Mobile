import client from './client';

export function searchCustomers(query) {
  return client.get('/customers', { params: { search: query } });
}

export function createCustomer(data) {
  // data: { name, phone, address?, language? }
  return client.post('/customers', data);
}

export function getCustomer(customerId) {
  return client.get(`/customers/${customerId}`);
}

export function updateCustomer(customerId, data) {
  return client.patch(`/customers/${customerId}`, data);
}

export function addBike(customerId, data) {
  // data: { make, model, year, plate_number, fuel_type, odometer }
  return client.post(`/customers/${customerId}/bikes`, data);
}

export function getBikes(customerId) {
  return client.get(`/customers/${customerId}/bikes`);
}
