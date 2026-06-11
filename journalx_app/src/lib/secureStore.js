/* Secure storage for the auth JWT (expo-secure-store → Keychain / Keystore). */
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "jx-auth-token";

export async function saveToken(token) {
  try {
    if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {}
}

export async function getToken() {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function clearToken() {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {}
}
