// Prefer Vite proxy in dev: if no explicit API base, use relative '/api' so requests stay same-origin
const RAW_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').trim();

function buildUrl(path) {
  const cleanedPath = path.startsWith('/') ? path : `/${path}`;
  // Ensure exactly one '/api' prefix on the path
  const ensuredApiPath = cleanedPath.startsWith('/api/') ? cleanedPath : `/api${cleanedPath}`;

  if (!RAW_API_BASE_URL) {
    // Use Vite proxy: keep paths under /api relative to the dev server origin
    return ensuredApiPath;
  }
  // Normalize base: remove trailing slashes and a possible trailing '/api'
  const baseNoSlash = RAW_API_BASE_URL.replace(/\/+$/, '');
  const base = baseNoSlash.replace(/\/api$/i, '');
  return `${base}${ensuredApiPath}`;
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

async function ensureCsrfCookie() {
  // Hit the backend CSRF endpoint to set csrftoken cookie if not present
  if (typeof document !== 'undefined') {
    const existing = getCookie('csrftoken');
    if (existing) return existing;
  }
  try {
    const res = await fetch(buildUrl('/api/auth/csrf/'), { credentials: 'include' });
    await res.json().catch(() => ({}));
  } catch (e) {
    // ignore
  }
  return typeof document !== 'undefined' ? getCookie('csrftoken') : null;
}

function extractMessage(data) {
  if (!data || typeof data !== 'object') return null;
  if (typeof data.detail === 'string') return data.detail;
  if (Array.isArray(data.non_field_errors) && data.non_field_errors.length) {
    return data.non_field_errors[0];
  }
  const firstKey = Object.keys(data).find((key) => Array.isArray(data[key]) && data[key].length);
  if (firstKey) {
    const value = data[firstKey][0];
    return typeof value === 'string' ? value : null;
  }
  return null;
}

async function request(path, options = {}) {
  const { body, headers, ...rest } = options;
  const isFormData = body instanceof FormData;
  const method = (rest.method || 'GET').toUpperCase();

  // For unsafe methods, ensure CSRF cookie and send header
  let headerCsrf = {};
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const token = await ensureCsrfCookie();
    if (token) {
      headerCsrf = { 'X-CSRFToken': token };
    }
  }

  const response = await fetch(buildUrl(path), {
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...headerCsrf,
      ...(headers || {})
    },
    credentials: 'include',
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    ...rest
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = extractMessage(data) || 'Error en la solicitud';
    const error = new Error(message);
    error.payload = data;
    throw error;
  }
  return data;
}

export function registerUser(payload) {
  return request('/api/auth/register/', {
    method: 'POST',
    body: payload
  });
}

export function registerCollaborator(payload) {
  return request('/api/auth/collaborator/register/', {
    method: 'POST',
    body: payload
  });
}

export function loginUser(payload) {
  return request('/api/auth/login/', {
    method: 'POST',
    body: payload
  });
}

export function fetchMe() {
  return request('/api/auth/me/', { method: 'GET' });
}

export function logoutUser() {
  return request('/api/auth/logout/', { method: 'POST' });
}

export { request };
