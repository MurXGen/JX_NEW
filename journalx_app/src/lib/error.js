/* Turn an axios error into a readable, diagnostic message. */
export function apiErrorMessage(e) {
  if (e?.response) {
    const d = e.response.data;
    const msg = (d && (d.message || d.error)) || (typeof d === "string" ? d.slice(0, 140) : "");
    return msg || `Server error (${e.response.status})`;
  }
  if (e?.request) {
    // request was made but no response → can't reach the backend
    return "Can't reach the server. Check your connection and the API URL (app.json → extra.apiBase).";
  }
  return e?.message || "Something went wrong";
}
