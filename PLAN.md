# Assignee Avatar on Main Issues Screen

## Summary
Replace the assignee name in the main issues table with an avatar-only cell in the frontend, without changing backend contracts. The table will keep using the existing issue list payload for `assigned_to.username` / `display_name`, then resolve real profile pictures client-side by fetching each unique assignee’s `/users/{username}/` profile once per page state and rendering an initials fallback until that lookup completes.

## Key Changes
- Update [components/issues-page.tsx](/Users/polmontanera/Desktop/Q6%202526/ASW/Projecte/asw256q2-it114-frontend/components/issues-page.tsx) so the assignee column renders an avatar component instead of `displayName(issue.assigned_to)`.
- Add a small shared avatar renderer, preferably `components/user-avatar.tsx`, with these rules:
  - If `avatar_url` is available, render `<img>`.
  - Otherwise render initials derived from the resolved profile initials, or from the existing assignee display name as fallback.
  - Keep the cell avatar-only, but expose the assignee name through `alt`, `title`, and/or `aria-label`.
  - For unassigned rows, render a muted `Unassigned` text cell instead of a fake avatar.
- Add a page-scoped profile lookup layer in the frontend, either in [lib/hooks.ts](/Users/polmontanera/Desktop/Q6%202526/ASW/Projecte/asw256q2-it114-frontend/lib/hooks.ts) or a new focused helper such as `lib/user-avatar-map.ts`:
  - Extract unique assignee usernames from the current `issueApi.list()` result.
  - Fetch `profileApi.get(username, {})` for missing usernames in parallel with `Promise.allSettled`.
  - Store results in a map keyed by username so repeated assignees do not trigger repeated requests during the same page lifetime.
  - Do not block table rendering on avatar fetches; render fallback initials immediately and upgrade in place when profile data arrives.
  - Ignore per-user fetch failures and keep fallback initials for those rows.
- Keep backend unchanged in `/Users/polmontanera/Desktop/Q6 2526/ASW/Projecte/asw256q2-it114`. The plan intentionally consumes the existing `GET /users/{username}/` response instead of extending issue serializers.
- Add any small CSS needed in [app/globals.css](/Users/polmontanera/Desktop/Q6%202526/ASW/Projecte/asw256q2-it114-frontend/app/globals.css) to support a compact table-sized avatar variant rather than reusing the current 64px avatar styles.

## Public Interfaces
- No backend API changes.
- New internal frontend interface:
  - A compact avatar component that accepts at least `user`, `avatarUrl`, `initials`, and a small/table size variant.
  - A lookup helper/hook that returns `Record<string, { avatar_url?: string | null; initials?: string; display_name?: string }>` keyed by username.
- Existing public API consumed:
  - `GET /api/users/{username}/` via `profileApi.get(username, {})`, reading `profile.avatar_url`, `profile.initials`, and `profile.display_name`.

## Test Plan
- Static verification in the frontend repo:
  - Run `pnpm lint`
  - Run `pnpm typecheck`
- Manual UI scenarios on the main issues page:
  - Assigned user with avatar shows image instead of name.
  - Assigned user without avatar shows initials badge instead of name.
  - Multiple rows with the same assignee reuse the resolved avatar without duplicate visual inconsistencies.
  - Unassigned issue shows `Unassigned` and does not render a broken avatar.
  - Slow or failed profile lookup keeps initials fallback and does not break row layout.
  - Hover/focus on an avatar still exposes the assignee identity accessibly.

## Assumptions
- “Main screen” means the issues table rendered by [components/issues-page.tsx](/Users/polmontanera/Desktop/Q6%202526/ASW/Projecte/asw256q2-it114-frontend/components/issues-page.tsx).
- Avatar-only applies only to that main issues table, not to issue detail, planning, watchers, or filters.
- The extra client-side profile fetches are acceptable for this iteration even though they create an N-by-unique-assignee request pattern.
- If this proves too chatty in practice, the follow-up should be a backend change to add avatar fields to the shared issue user summary serializer.
