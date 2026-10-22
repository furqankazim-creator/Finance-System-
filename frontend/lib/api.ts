import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const TOKEN_KEY = "auth_token";

const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// Attach the JWT (stored by auth-context on sign in/up) on every request
api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalise error responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error?.message ||
      error.message ||
      "An unexpected error occurred";
    return Promise.reject(new Error(message));
  }
);

export default api;
