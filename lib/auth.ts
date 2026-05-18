export const API_KEY_STORAGE_KEY = "issuehub.apiKey";
export const AUTH_USER_STORAGE_KEY = "issuehub.user";
export const AUTH_CHANGED_EVENT = "issuehub:auth-changed";

export type AuthUser = {
  id: number;
  username: string;
  display_name: string;
};

export type AuthSession = {
  api_key: string;
  user: AuthUser;
};

export function getStoredApiKey() {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(API_KEY_STORAGE_KEY);
}

export function getStoredUser() {
  if (!canUseStorage()) return null;
  const value = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
  if (!value) return null;

  try {
    return JSON.parse(value) as AuthUser;
  } catch {
    window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    return null;
  }
}

export function getStoredSession() {
  const apiKey = getStoredApiKey();
  const user = getStoredUser();
  if (!apiKey || !user) return null;
  return { api_key: apiKey, user };
}

export function storeAuthSession(session: AuthSession) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(API_KEY_STORAGE_KEY, session.api_key);
  window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(session.user));
  notifyAuthChanged();
}

export function clearAuthSession() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(API_KEY_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  notifyAuthChanged();
}

export function subscribeToAuthChanges(listener: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === API_KEY_STORAGE_KEY || event.key === AUTH_USER_STORAGE_KEY) {
      listener();
    }
  };

  window.addEventListener(AUTH_CHANGED_EVENT, listener);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(AUTH_CHANGED_EVENT, listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function notifyAuthChanged() {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}
