import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('gdc_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      // Session expired or token invalidated
      localStorage.removeItem('gdc_auth_user');
      localStorage.removeItem('gdc_auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Silent background keep-alive heartbeat: pings /health every 9 minutes while browser tab is open
if (typeof window !== 'undefined') {
  setInterval(() => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      api.get('/health').catch(() => {
        // silent suppression for background ping
      });
    }
  }, 9 * 60 * 1000);
}

export default api;
