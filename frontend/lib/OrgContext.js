"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "./apiClient";
import { getCurrentOrgId, setCurrentOrgId } from "./tokenStorage";
import { useAuth } from "./AuthContext";

const OrgContext = createContext(null);

export function OrgProvider({ children }) {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState([]); // [{ organization, role }]
  const [currentOrgId, setCurrentOrgIdState] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadOrgs = useCallback(async () => {
    if (!user) {
      setMemberships([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get("/organizations");
      setMemberships(data || []);
      const saved = getCurrentOrgId();
      const stillValid = data?.find((m) => m.organization._id === saved);
      const chosen = stillValid ? saved : data?.[0]?.organization?._id || null;
      setCurrentOrgIdState(chosen);
      setCurrentOrgId(chosen);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadOrgs();
  }, [loadOrgs]);

  function switchOrg(orgId) {
    setCurrentOrgIdState(orgId);
    setCurrentOrgId(orgId);
    if (typeof window !== "undefined") window.location.reload();
  }

  const current = memberships.find((m) => m.organization._id === currentOrgId) || null;

  return (
    <OrgContext.Provider
      value={{
        memberships,
        currentOrgId,
        currentOrg: current?.organization || null,
        role: current?.role || null,
        loading,
        switchOrg,
        refresh: loadOrgs,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}

// Role hierarchy mirrors the backend's RBAC ranks (owner > admin > engineer > viewer).
const RANK = { owner: 4, admin: 3, engineer: 2, viewer: 1 };
export function hasRole(role, minRole) {
  if (!role) return false;
  return RANK[role] >= RANK[minRole];
}
