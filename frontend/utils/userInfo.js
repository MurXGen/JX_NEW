/* Shared, throttled user-info fetcher.

   The dashboard and DataContext both need /api/auth/user-info on load, and
   effects can re-run on navigation — which used to fire the request many times.
   This caches the response for a short TTL, de-dupes concurrent calls, and caps
   the number of real network hits per page session so the endpoint is called at
   most a few times. Pass { force: true } after a known change (e.g. profile
   save or subscription activation) to bypass the cache. */

import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const TTL_MS = 60_000; // reuse a fresh result for 60s
const MAX_CALLS = 3; // hard cap on real network hits per page session

let cache = { res: null, at: 0 };
let inflight = null;
let calls = 0;

export async function fetchUserInfo({ force = false } = {}) {
  const now = Date.now();

  // fresh cache → reuse
  if (!force && cache.res && now - cache.at < TTL_MS) return cache.res;
  // a request is already on the wire → share it
  if (inflight) return inflight;
  // hit the cap → serve whatever we last got rather than calling again
  if (!force && calls >= MAX_CALLS && cache.res) return cache.res;

  calls += 1;
  inflight = axios
    .get(`${API_BASE}/api/auth/user-info`, { withCredentials: true })
    .then((res) => {
      cache = { res, at: Date.now() };
      return res;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/* Call after login/logout or a deliberate change so the next read is fresh. */
export function resetUserInfoCache() {
  cache = { res: null, at: 0 };
  calls = 0;
  inflight = null;
}
