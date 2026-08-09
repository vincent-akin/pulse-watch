import { getAccessToken, getRefreshToken, setTokens, clearTokens, getCurrentOrgId } from "./tokenStorage";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api/v1";

export class ApiError extends Error {
  constructor(message, status, errors = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

let refreshPromise = null;

// Rotates the refresh token exactly once per 401, sharing the in-flight promise across
// concurrent requests so we don't race multiple refreshes against the same refresh token.
async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) throw new ApiError("No refresh token available.", 401);

      const res = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      const body = await res.json();
      if (!res.ok) throw new ApiError(body.message, res.status, body.errors);

      setTokens(body.data);
      return body.data.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// Core request helper. Automatically attaches auth + organization headers, retries once on 401
// via refresh-token rotation, and unwraps the standard { success, message, data, meta } envelope.
export async function apiRequest(path, { method = "GET", body, params, organizationId, skipAuth = false, isRetry = false, ifMatch } = {}) {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
    });
  }

  const headers = { "Content-Type": "application/json" };
  if (ifMatch) headers["If-Match"] = ifMatch;
  if (!skipAuth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const orgId = organizationId || getCurrentOrgId();
    if (orgId) headers["X-Organization-ID"] = orgId;
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return { data: null, meta: null };

  const contentType = res.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await res.json() : null;
  const etag = res.headers.get("etag") || undefined;

  if (res.status === 401 && !skipAuth && !isRetry) {
    try {
      await refreshAccessToken();
      return apiRequest(path, { method, body, params, organizationId, skipAuth, isRetry: true, ifMatch });
    } catch {
      clearTokens();
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new ApiError("Session expired. Please log in again.", 401);
    }
  }

  if (!res.ok) {
    throw new ApiError(payload?.message || res.statusText, res.status, payload?.errors || []);
  }

  return { data: payload?.data, meta: payload?.meta, message: payload?.message, etag };
}

export const api = {
  get: (path, opts) => apiRequest(path, { ...opts, method: "GET" }),
  post: (path, body, opts) => apiRequest(path, { ...opts, method: "POST", body }),
  patch: (path, body, opts) => apiRequest(path, { ...opts, method: "PATCH", body }),
  delete: (path, opts) => apiRequest(path, { ...opts, method: "DELETE" }),
};

export { API_BASE_URL };
