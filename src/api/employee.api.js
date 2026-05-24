import client from './client';

export function getEmployees() {
  return client.get('/employees');
}

export function inviteEmployee(data) {
  // data: { phone, name, permissions? }
  return client.post('/employees/invite', data);
}

export function updatePermissions(employeeId, permissions) {
  return client.patch(`/employees/${employeeId}/permissions`, { permissions });
}

export function deactivateEmployee(employeeId) {
  return client.patch(`/employees/${employeeId}/deactivate`);
}

export function getPerformance(employeeId, period) {
  // period: 'today' | 'week' | 'month'
  return client.get(`/employees/${employeeId}/performance`, { params: { period } });
}
