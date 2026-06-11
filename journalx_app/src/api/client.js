/* Axios client for the JournalX backend. Attaches the app JWT as a Bearer
   token on every request; on 401 it clears the token so the app drops to the
   login screen. */
import axios from "axios";
import Constants from "expo-constants";
import { getToken, clearToken } from "../lib/secureStore";

export const API_BASE =
  Constants.expoConfig?.extra?.apiBase ||
  process.env.EXPO_PUBLIC_API_BASE ||
  "https://api.journalx.app";

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 20000,
  // marks requests as coming from the native app — the backend skips the
  // web-only Cloudflare Turnstile for these (Play Integrity will gate the app)
  headers: { "X-App-Client": "1" },
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error?.response?.status === 401) {
      await clearToken();
      if (onUnauthorized) onUnauthorized();
    }
    return Promise.reject(error);
  },
);

export default api;
