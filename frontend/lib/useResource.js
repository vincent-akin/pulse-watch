"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { api, ApiError } from "./apiClient";

// Minimal fetch-on-mount(+deps) hook so pages don't hand-roll loading/error state each time.
// Not a caching layer — just enough consistency for a CRUD-heavy dashboard.
export function useResource(path, { params, enabled = true, deps = [] } = {}) {
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const paramsRef = useRef(params);

  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  const depsKey = JSON.stringify(deps);

  const refetch = useCallback(async () => {
    if (!enabled || !path) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(path, { params: paramsRef.current });
      setData(res.data);
      setMeta(res.meta);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(err.message, 0));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, enabled, depsKey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
  }, [refetch]);

  return { data, meta, loading, error, refetch, setData };
}
