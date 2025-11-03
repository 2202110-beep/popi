import { request } from './auth.js';

export function listPartnerApplications() {
  return request('/api/auth/partner/applications/', { method: 'GET' });
}

export function createBathroom(applicationId) {
  return request(`/api/auth/partner/applications/${applicationId}/bathroom/`, {
    method: 'POST',
    body: {},
  });
}

export function applyCollaboratorBusiness(formData) {
  return request('/api/auth/collaborator/apply/', {
    method: 'POST',
    body: formData,
  });
}
