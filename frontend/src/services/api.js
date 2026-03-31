const BASE_URL = '/api';

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, opts);

  if (!res.ok) {
    const payload = await res.json().catch(() => ({ error: { message: res.statusText } }));
    const err = new Error(payload.error?.message || 'Erreur API');
    err.status = res.status;
    throw err;
  }

  return res.status === 204 ? null : res.json();
}

export const clientsApi = {
  list: (params = {}) => request('GET', `/clients?${new URLSearchParams(params)}`),
  sync: (since) => request('GET', `/clients/sync?since=${encodeURIComponent(since)}`),
  get: (id) => request('GET', `/clients/${id}`),
  create: (data) => request('POST', '/clients', data),
  update: (id, data) => request('PUT', `/clients/${id}`, data),
  delete: (id) => request('DELETE', `/clients/${id}`),
};

export const appointmentsApi = {
  list: (params = {}) => request('GET', `/appointments?${new URLSearchParams(params)}`),
  today: () => request('GET', '/appointments/today'),
  week: () => request('GET', '/appointments/week'),
  sync: (since) => request('GET', `/appointments/sync?since=${encodeURIComponent(since)}`),
  get: (id) => request('GET', `/appointments/${id}`),
  create: (data) => request('POST', '/appointments', data),
  update: (id, data) => request('PUT', `/appointments/${id}`, data),
  updateStatus: (id, status) => request('PATCH', `/appointments/${id}/status`, { status }),
  delete: (id) => request('DELETE', `/appointments/${id}`),
};

export const statsApi = {
  overview: () => request('GET', '/stats/overview'),
  monthly: (year) => request('GET', `/stats/monthly?year=${year}`),
  upcoming: () => request('GET', '/stats/upcoming'),
};
