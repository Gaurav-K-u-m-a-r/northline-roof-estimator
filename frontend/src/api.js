const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function handle(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = data.code;
    throw err;
  }
  return data;
}

export async function getPublicConfig() {
  const res = await fetch(`${API_URL}/api/config`);
  return handle(res);
}

export async function submitEstimate(payload) {
  const res = await fetch(`${API_URL}/api/estimate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handle(res);
}

export async function adminLogin(username, password) {
  const res = await fetch(`${API_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  return handle(res);
}

function authHeaders() {
  const token = localStorage.getItem('wantace_admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getAdminConfig() {
  const res = await fetch(`${API_URL}/api/admin/config`, { headers: authHeaders() });
  return handle(res);
}

export async function saveAdminConfig(config) {
  const res = await fetch(`${API_URL}/api/admin/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(config)
  });
  return handle(res);
}

export async function getAdminLeads() {
  const res = await fetch(`${API_URL}/api/admin/leads`, { headers: authHeaders() });
  return handle(res);
}
