import axios from 'axios';

// Use Vite proxy in development, or env variable in production
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Basic error handling - can be extended if needed
    return Promise.reject(error);
  }
);

export default apiClient;
