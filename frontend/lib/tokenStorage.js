// Client-only token storage. A JWT access token + opaque refresh token, per the API's auth flow.
const ACCESS_KEY = "pw_access_token";
const REFRESH_KEY = "pw_refresh_token";
const ORG_KEY = "pw_current_org";

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens({ accessToken, refreshToken }) {
  if (typeof window === "undefined") return;
  if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function getCurrentOrgId() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ORG_KEY);
}

export function setCurrentOrgId(id) {
  if (typeof window === "undefined") return;
  if (id) localStorage.setItem(ORG_KEY, id);
  else localStorage.removeItem(ORG_KEY);
}
