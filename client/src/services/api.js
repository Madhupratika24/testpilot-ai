import axios from "axios";

// In development, Vite forwards /api to the local server.
// In production, VITE_API_URL points to the deployed backend.
const base = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, "") : "";

const api = axios.create({
  baseURL: `${base}/api`,
  timeout: 60000,
});

// Attach the login token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;