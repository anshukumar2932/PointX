import axios from "axios";

const baseURL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: baseURL,
  // Force HTTP for local development
  timeout: 10000,
  // Disable HTTPS agent for local development
  httpsAgent: false,
});

// Attach JWT automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Force HTTP protocol for localhost
    if (config.baseURL && config.baseURL.includes('localhost')) {
      config.baseURL = config.baseURL.replace('https://', 'http://');
      config.url = config.url?.replace('https://', 'http://');
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
