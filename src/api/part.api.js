import client from './client';

export function getParts(params = {}) {
  return client.get('/parts', { params });
}

export function getLowStock() {
  return client.get('/parts/low-stock');
}

export function createPart(data) {
  return client.post('/parts', data);
}

export function updatePart(partId, data) {
  return client.patch(`/parts/${partId}`, data);
}

export function adjustStock(partId, data) {
  // data: { quantity_change, reason }
  return client.patch(`/parts/${partId}/stock`, data);
}
