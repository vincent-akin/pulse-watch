"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "./apiClient";
import { getAccessToken, setTokens, clearTokens } from "./tokenStorage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Session bootstrap on mount — intentional fetch-then-setState; there's no external
    // system to synchronize against here, just an initial async load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMe();
  }, [loadMe]);

  async function login(email, password) {
    const { data } = await api.post("/auth/login", { email, password }, { skipAuth: true });
    setTokens(data);
    setUser(data.user);
    return data.user;
  }

  async function register(payload) {
    return api.post("/auth/register", payload, { skipAuth: true });
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch {
      /* best-effort — clear local state regardless */
    }
    clearTokens();
    setUser(null);
    if (typeof window !== "undefined") window.location.href = "/login";
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, refresh: loadMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
