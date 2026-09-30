export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://clothing-api.arx-app.com:4118';

export class ApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message || 'Request failed');
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function buildUrl(path) {
  const base = String(API_BASE || '').replace(/\/+$/, '');
  const suffix = String(path || '').startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

function toQuery(params) {
  if (!params || typeof params !== 'object') return '';
  const search = new URLSearchParams();
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value === undefined || value === null || value === '') return;
    search.append(key, String(value));
  });
  const str = search.toString();
  return str ? `?${str}` : '';
}

export async function request(path, options = {}) {
  const { method = 'GET', body, signal, headers = {} } = options;

  const init = {
    method,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...headers,
    },
    signal,
  };

  if (body !== undefined && body !== null) {
    init.headers['Content-Type'] = 'application/json';
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(buildUrl(path), init);
  } catch (err) {
    if (err && (err.name === 'AbortError' || err.code === 20)) {
      throw err;
    }
    throw new ApiError(
      'We could not reach the store service. Check your connection and try again.',
      0,
    );
  }

  const contentType = response.headers.get('content-type') || '';
  let payload = null;

  try {
    if (contentType.includes('application/json')) {
      payload = await response.json();
    } else {
      const text = await response.text();
      payload = text ? { message: text } : null;
    }
  } catch (err) {
    payload = null;
  }

  if (!response.ok) {
    const message =
      (payload && (payload.error || payload.message)) ||
      `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }

  return payload;
}

/* ---------------- Products ---------------- */

export function getProducts(params = {}, options = {}) {
  return request(`/api/products${toQuery(params)}`, options);
}

export function getCategories() {
  return request('/api/products/categories');
}

export function getProduct(slug, options = {}) {
  if (!slug) {
    return Promise.reject(new ApiError('A product slug is required.', 400));
  }
  return request(`/api/products/${encodeURIComponent(slug)}`, options);
}

/* ---------------- Auth ---------------- */

export function signup({ fullName, email, password }) {
  return request('/api/auth/signup', {
    method: 'POST',
    body: { fullName, email, password },
  });
}

export function login({ email, password }) {
  return request('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function logout() {
  return request('/api/auth/logout', { method: 'POST' });
}

export function getMe(options = {}) {
  return request('/api/auth/me', options);
}

/* ---------------- Orders ---------------- */

export function createOrder({ items, provider }) {
  return request('/api/orders', {
    method: 'POST',
    body: {
      items: Array.isArray(items) ? items : [],
      provider,
    },
  });
}

export function getOrders(options = {}) {
  return request('/api/orders', options);
}

export function getOrder(reference) {
  if (!reference) {
    return Promise.reject(new ApiError('An order reference is required.', 400));
  }
  return request(`/api/orders/${encodeURIComponent(reference)}`);
}

/* ---------------- Payments ---------------- */

export function getPaymentProviders(options = {}) {
  return request('/api/payments/providers', options);
}

export function getPaymentPlans(options = {}) {
  return request('/api/payments/plans', options);
}

export function createCheckout(body) {
  return request('/api/payments/checkout', { method: 'POST', body });
}

export function completePayment(reference) {
  if (!reference) {
    return Promise.reject(new ApiError('A payment reference is required.', 400));
  }
  return request(`/api/payments/${encodeURIComponent(reference)}/complete`, {
    method: 'POST',
  });
}

export function getSubscription(options = {}) {
  return request('/api/payments/subscription', options);
}

export function cancelSubscription() {
  return request('/api/payments/subscription/cancel', { method: 'POST' });
}

export function getManageUrl(options = {}) {
  return request('/api/payments/subscription/manage', options);
}

export default {
  API_BASE,
  ApiError,
  request,
  getProducts,
  getCategories,
  getProduct,
  signup,
  login,
  logout,
  getMe,
  createOrder,
  getOrders,
  getOrder,
  getPaymentProviders,
  getPaymentPlans,
  createCheckout,
  completePayment,
  getSubscription,
  cancelSubscription,
  getManageUrl,
};