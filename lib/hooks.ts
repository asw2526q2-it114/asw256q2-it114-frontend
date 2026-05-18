"use client";

import { useCallback, useEffect, useState } from "react";
import { isUnauthorized } from "@/lib/api";

export type LoadState<T> = {
  data: T | null;
  error: unknown;
  loading: boolean;
  unauthorized: boolean;
};

export function useAsyncData<T>(loader: () => Promise<T>, deps: React.DependencyList) {
  const [state, setState] = useState<LoadState<T>>({
    data: null,
    error: null,
    loading: true,
    unauthorized: false
  });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null, unauthorized: false }));
    try {
      const data = await loader();
      setState({ data, error: null, loading: false, unauthorized: false });
    } catch (error) {
      setState({ data: null, error, loading: false, unauthorized: isUnauthorized(error) });
    }
    // Custom hook callers provide the loader dependencies explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo
  }, deps);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, reload: load };
}
