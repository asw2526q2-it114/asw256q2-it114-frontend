"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isUnauthorized } from "@/lib/api";
import { getStoredApiKey, subscribeToAuthChanges } from "@/lib/auth";

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

  useEffect(() => {
    // Reload when authentication changes (e.g. user switcher)
    return subscribeToAuthChanges(() => {
      void load();
    });
  }, [load]);

  return { ...state, reload: load };
}

export function useAuthGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isPending, setIsPending] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = () => {
      const hasKey = Boolean(getStoredApiKey());
      setIsAuthenticated(hasKey);
      setIsPending(false);

      const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/auth");
      if (!isAuthRoute && !hasKey) {
        router.replace("/login");
      } else if (isAuthRoute && hasKey) {
        router.replace("/issues");
      }
    };

    checkAuth();
    return subscribeToAuthChanges(checkAuth);
  }, [pathname, router]);

  return { isAuthenticated, isPending };
}
