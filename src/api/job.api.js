import client from './client';

export function getJobs(params = {}) {
  return client.get('/jobs', { params });
}

export function getJob(jobId) {
  return client.get(`/jobs/${jobId}`);
}

export function createJob(data) {
  // data: { customer_id, bike_id, assigned_to? }
  return client.post('/jobs', data);
}

export function updateInspection(jobId, data) {
  // data: { inspection_notes, inspection_photos? }
  return client.patch(`/jobs/${jobId}/inspection`, data);
}

export function setEstimate(jobId, data) {
  // data: { estimated_duration, estimated_ready_at }
  return client.patch(`/jobs/${jobId}/estimate`, data);
}

export function startJob(jobId) {
  return client.patch(`/jobs/${jobId}/start`);
}

export function addService(jobId, data) {
  // data: { services: [{ name, labour_charge }] }
  return client.post(`/jobs/${jobId}/services`, data);
}

export function markServiceDone(jobId, serviceId) {
  return client.patch(`/jobs/${jobId}/services/${serviceId}`);
}

export function removeService(jobId, serviceId) {
  return client.delete(`/jobs/${jobId}/services/${serviceId}`);
}

export function removePart(jobId, partIndex) {
  return client.delete(`/jobs/${jobId}/parts/${partIndex}`);
}

export function addPart(jobId, data) {
  // data: { source_type, part_id?, name, quantity, unit_price }
  return client.post(`/jobs/${jobId}/parts`, data);
}

export function completeJob(jobId) {
  return client.patch(`/jobs/${jobId}/complete`);
}

export function recordPayment(jobId, data) {
  // data: { payment_mode, amount_paid }
  return client.post(`/jobs/${jobId}/payment`, data);
}

export function getInvoice(jobId) {
  return client.get(`/jobs/${jobId}/invoice`);
}

export function deleteJob(jobId) {
  return client.delete(`/jobs/${jobId}`);
}

export function remitPayment(jobId) {
  return client.patch(`/jobs/${jobId}/remit`);
}
