import client from './client';

export function getSummary() {
  return client.get('/dashboard/summary');
}

export function getMonthly(from, to) {
  return client.get('/dashboard/monthly', { params: { from, to } });
}

export function getAlerts() {
  return client.get('/dashboard/alerts');
}

export function getPayments(from, to, page = 1) {
  return client.get('/dashboard/payments', { params: { from, to, page, limit: 20 } });
}
