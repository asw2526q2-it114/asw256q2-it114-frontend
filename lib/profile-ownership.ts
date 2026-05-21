export function isOwnProfile(viewedUsername?: string, activeUsername?: string | null) {
  if (!viewedUsername) return true;
  if (!activeUsername) return false;
  return viewedUsername === activeUsername;
}
