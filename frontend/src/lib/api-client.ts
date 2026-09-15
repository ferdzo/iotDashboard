import axios from 'axios';
import {
  applyAuthHeader,
  attachAuthInterceptor,
} from './auth-session';

// Use Vite proxy in development, or env variable in production
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Initial header sync from the single session store.
applyAuthHeader(apiClient);

// 401 refresh-then-retry, owned by the session module.
attachAuthInterceptor(apiClient, API_BASE_URL);

export default apiClient;
