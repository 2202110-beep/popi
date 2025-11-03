import { request } from './auth.js';

export function fetchPublicPlaces(params = {}) {
  const query = new URLSearchParams();
  if (params.lat != null) query.set('lat', String(params.lat));
  if (params.lng != null) query.set('lng', String(params.lng));
  if (params.radius_km != null) query.set('radius_km', String(params.radius_km));
  const qs = query.toString();
  const path = `/api/auth/places/public/${qs ? `?${qs}` : ''}`;
  return request(path, { method: 'GET' });
}
