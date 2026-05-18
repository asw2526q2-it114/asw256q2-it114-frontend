"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Pencil, Save, X } from "lucide-react";
import { AuthPending } from "@/components/auth-pending";
import { StatusBadge } from "@/components/badge";
import { ErrorPanel } from "@/components/error-panel";
import { LoadingPanel } from "@/components/loading-panel";
import { PageTitle } from "@/components/page-title";
import { displayName, profileApi, UserProfile } from "@/lib/api";
import { useAsyncData } from "@/lib/hooks";

export function ProfilePage({ username }: { username?: string }) {
  const [tab, setTab] = useState<"assigned" | "watched" | "comments">("assigned");
  const [editing, setEditing] = useState(false);
  const ownProfile = !username;
  const activeTab = !ownProfile && tab === "watched" ? "assigned" : tab;
  const loader = () => (username ? profileApi.get(username, { tab: activeTab }) : profileApi.me({ tab: activeTab }));
  const { data, error, loading, unauthorized, reload } = useAsyncData(loader, [username, activeTab]);
  const tabs: Array<"assigned" | "watched" | "comments"> = ownProfile ? ["assigned", "watched", "comments"] : ["assigned", "comments"];

  return (
    <main className="page">
      <PageTitle
        eyebrow="Profile"
        title={username ? `${username}'s profile` : "My profile"}
        description="View assigned issues, watched issues, comments, and profile information."
        actions={
          ownProfile && data && !editing ? (
            <button className="button secondary" onClick={() => setEditing(true)} type="button">
              <Pencil size={16} aria-hidden="true" />
              Edit profile
            </button>
          ) : null
        }
      />
      <nav className="tabs">
        {tabs.map((item) => (
          <button className={`tab ${activeTab === item ? "active" : ""}`} key={item} onClick={() => setTab(item)} type="button">
            {item}
          </button>
        ))}
      </nav>
      {unauthorized ? <AuthPending /> : null}
      {loading ? <LoadingPanel label="Loading profile" /> : null}
      {error && !unauthorized ? <ErrorPanel error={error} onRetry={reload} /> : null}
      {data ? (
        <section className="grid two">
          <ProfileSummary profile={data} />
          {ownProfile && editing ? (
            <ProfileEditor
              profile={data}
              onCancel={() => setEditing(false)}
              onSaved={async () => {
                await reload();
                setEditing(false);
              }}
            />
          ) : null}
          <ProfileActivity profile={data} tab={activeTab} />
        </section>
      ) : null}
    </main>
  );
}

function ProfileSummary({ profile }: { profile: UserProfile }) {
  const user = profile.profile;
  return (
    <div className="panel grid">
      <div>
        <p className="eyebrow">User</p>
        <h2>{displayName(user)}</h2>
        <p className="muted">{user?.username || "No username"}</p>
      </div>
      <p>{user?.bio || "No bio provided."}</p>
      <div className="grid three">
        <Stat label="Open assigned" value={profile.stats?.open_assigned_count} />
        <Stat label="Watched" value={profile.stats?.watched_count} />
        <Stat label="Comments" value={profile.stats?.comments_count} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value?: number }) {
  return (
    <div>
      <p className="label">{label}</p>
      <strong>{value ?? "Not shown"}</strong>
    </div>
  );
}

function ProfileEditor({
  profile,
  onCancel,
  onSaved
}: {
  profile: UserProfile;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const [input, setInput] = useState({ bio: profile.profile?.bio || "" });
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await profileApi.update(input);
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="panel grid" onSubmit={(event) => void submit(event)}>
      <div>
        <p className="eyebrow">Edit profile</p>
        <h2>Profile details</h2>
        <p className="muted">Saving uses the API key from your current sign-in.</p>
      </div>
      <div className="field">
        <label htmlFor="bio">Bio</label>
        <textarea
          className="textarea"
          id="bio"
          value={input.bio}
          onChange={(event) => setInput((current) => ({ ...current, bio: event.target.value }))}
        />
      </div>
      <div className="toolbar">
        <button className="button primary" disabled={saving} type="submit">
          <Save size={16} aria-hidden="true" />
          {saving ? "Saving" : "Save profile"}
        </button>
        <button className="button secondary" disabled={saving} onClick={onCancel} type="button">
          <X size={16} aria-hidden="true" />
          Cancel
        </button>
      </div>
    </form>
  );
}

function ProfileActivity({ profile, tab }: { profile: UserProfile; tab: "assigned" | "watched" | "comments" }) {
  const items = tab === "assigned" ? profile.assigned_issues : tab === "watched" ? profile.watched_issues : profile.comments;
  return (
    <div className="panel table-wrap" style={{ gridColumn: "1 / -1" }}>
      <table className="table">
        <thead>
          <tr>
            <th>{tab === "comments" ? "Comment" : "Issue"}</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(items) && items.length > 0 ? (
            items.map((item) => {
              const record = item as Record<string, unknown>;
              const nestedIssue = record.issue && typeof record.issue === "object" ? (record.issue as Record<string, unknown>) : null;
              const issueId = typeof nestedIssue?.id === "number" ? nestedIssue.id : typeof record.id === "number" ? record.id : undefined;
              const detail =
                tab === "comments"
                  ? String(record.body || "No detail")
                  : String(record.subject || nestedIssue?.subject || "No detail");
              return (
                <tr key={String(record.id || record.issue || JSON.stringify(record))}>
                  <td>
                    {issueId ? <Link href={`/issues/${issueId}`}>#{issueId}</Link> : "Activity"}
                  </td>
                  <td>
                    <div className="grid">
                      <span>{detail}</span>
                      {tab === "comments" ? <span className="muted">{formatDate(String(record.created_at || ""))}</span> : <IssueSummaryBadges record={record} />}
                    </div>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={2}>No {tab} activity.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function IssueSummaryBadges({ record }: { record: Record<string, unknown> }) {
  return (
    <span className="toolbar">
      <StatusBadge value={catalogBadge(record.status_label, record.status_color, record.status)} />
      <StatusBadge value={catalogBadge(record.priority_label, record.priority_color, record.priority)} />
      <span className="muted">{formatDate(String(record.updated_at || ""))}</span>
    </span>
  );
}

function catalogBadge(label: unknown, color: unknown, key: unknown) {
  return {
    color: typeof color === "string" ? color : undefined,
    label: String(label || key || "Unset")
  };
}

function formatDate(value?: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
