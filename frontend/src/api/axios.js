import axios from "axios";

const baseURL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";

// Debug: Log the API URL being used
console.log("API Base URL:", baseURL);

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
    
    console.log("Making request to:", config.baseURL + config.url);
    console.log("Full config:", {
      method: config.method,
      url: config.url,
      baseURL: config.baseURL,
      headers: config.headers
    });
    
    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => {
    console.log("Response received:", response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error("API Error:", {
      message: error.message,
      code: error.code,
      config: error.config,
      response: error.response?.data
    });
    return Promise.reject(error);
  }
);

export default api;
