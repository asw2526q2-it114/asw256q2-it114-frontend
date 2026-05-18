"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Save } from "lucide-react";
import { AuthPending } from "@/components/auth-pending";
import { ErrorPanel } from "@/components/error-panel";
import { LoadingPanel } from "@/components/loading-panel";
import { PageTitle } from "@/components/page-title";
import { displayName, issueNumber, profileApi, UserProfile } from "@/lib/api";
import { useAsyncData } from "@/lib/hooks";

export function ProfilePage({ username }: { username?: string }) {
  const [tab, setTab] = useState<"assigned" | "watched" | "comments">("assigned");
  const loader = () => (username ? profileApi.get(username, { tab }) : profileApi.me({ tab }));
  const { data, error, loading, unauthorized, reload } = useAsyncData(loader, [username, tab]);

  return (
    <main className="page">
      <PageTitle
        eyebrow="Profile"
        title={username ? `${username}'s profile` : "My profile"}
        description="View assigned issues, watched issues, comments, and editable profile information."
      />
      <nav className="tabs">
        {(["assigned", "watched", "comments"] as const).map((item) => (
          <button className={`tab ${tab === item ? "active" : ""}`} key={item} onClick={() => setTab(item)} type="button">
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
          {!username ? <ProfileEditor profile={data} onSaved={reload} /> : null}
          <ProfileActivity profile={data} tab={tab} />
        </section>
      ) : null}
    </main>
  );
}

function ProfileSummary({ profile }: { profile: UserProfile }) {
  return (
    <div className="panel grid">
      <div>
        <p className="eyebrow">User</p>
        <h2>{displayName(profile)}</h2>
        <p className="muted">{profile.email || profile.username || "No public email"}</p>
      </div>
      <p>{profile.bio || "No bio provided."}</p>
    </div>
  );
}

function ProfileEditor({ profile, onSaved }: { profile: UserProfile; onSaved: () => Promise<void> }) {
  const [input, setInput] = useState({ full_name: profile.full_name || "", bio: profile.bio || "" });

  async function submit(event: FormEvent) {
    event.preventDefault();
    await profileApi.update(input);
    await onSaved();
  }

  return (
    <form className="panel grid" onSubmit={(event) => void submit(event)}>
      <div>
        <p className="eyebrow">Edit profile</p>
        <h2>Editable fields</h2>
        <p className="muted">Saving is gated by the future GitHub OAuth session.</p>
      </div>
      <div className="field">
        <label htmlFor="full-name">Full name</label>
        <input
          className="input"
          id="full-name"
          value={input.full_name}
          onChange={(event) => setInput((current) => ({ ...current, full_name: event.target.value }))}
        />
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
      <button className="button primary" type="submit">
        <Save size={16} aria-hidden="true" />
        Save profile
      </button>
    </form>
  );
}

function ProfileActivity({ profile, tab }: { profile: UserProfile; tab: "assigned" | "watched" | "comments" }) {
  const items = profile[tab];
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
              const issueId = typeof record.id === "number" ? record.id : typeof record.issue === "number" ? record.issue : undefined;
              return (
                <tr key={String(record.id || record.issue || JSON.stringify(record))}>
                  <td>
                    {issueId ? <Link href={`/issues/${issueId}`}>#{issueNumber(record as never)}</Link> : "Activity"}
                  </td>
                  <td>{String(record.subject || record.comment || record.text || record.content || "No detail")}</td>
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
