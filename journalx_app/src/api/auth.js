/* Auth API — reuses the existing backend routes. Each login path returns a
   JWT (token) which the app stores; the web keeps using cookies. */
import api from "./client";

export const login = (email, password) =>
  api.post("/auth/login", { email, password }).then((r) => r.data);

export const requestLoginOtp = (email) =>
  api.post("/auth/login-otp/request", { email }).then((r) => r.data);

export const verifyLoginOtp = (userId, otp) =>
  api.post("/auth/login-otp/verify", { userId, otp }).then((r) => r.data);

export const register = (name, email, password) =>
  api.post("/auth/register", { name, email, password }).then((r) => r.data);

export const verifyOtp = (userId, otp) =>
  api.post("/auth/verify-otp", { userId, otp }).then((r) => r.data);

export const resendOtp = (userId) =>
  api.post("/auth/resend-otp", { userId }).then((r) => r.data);

export const googleNative = (idToken) =>
  api.post("/auth/google/native", { idToken }).then((r) => r.data);

export const fetchUserInfo = () =>
  api.get("/auth/user-info").then((r) => r.data?.userData);

/*
 NOTE: password login + native Google also expect a Cloudflare Turnstile token
 on web. On the app we skip Turnstile and rely on Google Play Integrity instead
 (added in a later phase). The OTP login endpoints currently require a
 turnstileToken on the backend — for the app we will gate those behind Play
 Integrity; password + Google native work without it.
*/
