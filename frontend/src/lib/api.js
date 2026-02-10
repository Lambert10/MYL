import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const api = axios.create({
  baseURL,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("myl_access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function apiGet(path, config) {
  const res = await api.get(path, config);
  return res.data;
}

export async function apiPost(path, body, config) {
  const res = await api.post(path, body, config);
  return res.data;
}

export async function apiPut(path, body, config) {
  const res = await api.put(path, body, config);
  return res.data;
}

export async function apiDelete(path, config) {
  const res = await api.delete(path, config);
  return res.data;
}
