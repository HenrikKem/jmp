const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export async function apiPost(path, body, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await res.json().catch(() => ({ message: res.statusText }));
  return res.status === 204 ? null : res.json();
}

export async function apiGet(path, token = null) {
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) throw await res.json().catch(() => ({ message: res.statusText }));
  return res.json();
}

export async function apiPut(path, body, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await res.json().catch(() => ({ message: res.statusText }));
  return res.status === 204 ? null : res.json();
}

export async function apiPatch(path, body, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await res.json().catch(() => ({ message: res.statusText }));
  return res.status === 204 ? null : res.json();
}

export async function apiDelete(path, token = null) {
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE', headers });
  if (!res.ok) throw await res.json().catch(() => ({ message: res.statusText }));
  return res.status === 204 ? null : res.json().catch(() => null);
}
