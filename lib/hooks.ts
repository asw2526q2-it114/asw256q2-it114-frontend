"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Issue, UserProfile, isUnauthorized, profileApi } from "@/lib/api";
import { getStoredApiKey, getStoredUser, subscribeToAuthChanges, type AuthUser } from "@/lib/auth";

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

export type UserAvatarMap = Record<
  string,
  {
    avatar_url?: string | null;
    display_name?: string;
    initials?: string;
  }
>;

export function useAssigneeAvatarMap(issues: Issue[] | null) {
  const [avatars, setAvatars] = useState<UserAvatarMap>({});
  const usernames = useMemo(() => {
    const values = new Set<string>();
    issues?.forEach((issue) => {
      const username = issue.assigned_to?.username;
      if (username) values.add(username);
    });
    return Array.from(values);
  }, [issues]);

  useEffect(() => {
    let cancelled = false;
    if (usernames.length === 0) return;

    void Promise.allSettled(
      usernames.map(async (username) => {
        const response = await fetchProfileWithTimeout(username, 2000);
        return [username, toAvatarSummary(response)] as const;
      })
    ).then((results) => {
      if (cancelled) return;

      const resolved = results.reduce<UserAvatarMap>((current, result) => {
        if (result.status !== "fulfilled") return current;
        const [username, profile] = result.value;
        current[username] = profile;
        return current;
      }, {});

      if (Object.keys(resolved).length === 0) return;
      setAvatars((current) => ({ ...current, ...resolved }));
    });

    return () => {
      cancelled = true;
    };
  }, [usernames]);

  return avatars;
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

export function useStoredAuthUser() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const refresh = () => {
      setUser(getStoredUser());
    };

    refresh();
    return subscribeToAuthChanges(refresh);
  }, []);

  return user;
}

function toAvatarSummary(profile: UserProfile) {
  return {
    avatar_url: profile.profile?.avatar_url,
    display_name: profile.profile?.display_name,
    initials: profile.profile?.initials
  };
}

function fetchProfileWithTimeout(username: string, timeoutMs: number) {
  return new Promise<UserProfile>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out loading profile for ${username}`));
    }, timeoutMs);

    void profileApi
      .get(username, {})
      .then((profile) => {
        clearTimeout(timer);
        resolve(profile);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}
