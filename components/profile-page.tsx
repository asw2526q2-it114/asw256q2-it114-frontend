"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { Edit, Pencil, Save, Trash2, Upload, X } from "lucide-react";
import { AuthPending } from "@/components/auth-pending";
import { ErrorPanel } from "@/components/error-panel";
import { useConfirm, useToast } from "@/components/feedback-provider";
import { LoadingPanel } from "@/components/loading-panel";
import { IssueComment, UserMeIssueSummary, UserProfile, displayName, isCurrentUser, issueApi, profileApi } from "@/lib/api";
import { useAsyncData } from "@/lib/hooks";

type ProfileTab = "assigned" | "comments" | "watched";
type IssueSort = "id" | "issue_type" | "priority" | "severity" | "status" | "updated_at";

export function ProfilePage({ username }: { username?: string }) {
  const [tab, setTab] = useState<ProfileTab>("assigned");
  const [editing, setEditing] = useState(false);
  const ownProfile = !username;
  const activeTab = !ownProfile && tab === "watched" ? "assigned" : tab;
  const loader = () => (username ? profileApi.get(username, { tab: activeTab }) : profileApi.me({ tab: activeTab }));
  const { data, error, loading, unauthorized, reload } = useAsyncData(loader, [username, activeTab]);
  const tabs: ProfileTab[] = ownProfile ? ["assigned", "watched", "comments"] : ["assigned", "comments"];

  return (
    <main className="page profile-page">
      {unauthorized ? <AuthPending /> : null}
      {loading ? <LoadingPanel label="Loading profile" /> : null}
      {error && !unauthorized ? <ErrorPanel error={error} onRetry={reload} /> : null}
      {data ? (
        <section className="profile-layout">
          <div className="profile-left-column">
            <ProfileSummary
              ownProfile={ownProfile}
              profile={data}
              onEdit={() => setEditing(true)}
            />
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
          </div>
          <ProfileActivity
            ownProfile={ownProfile}
            profile={data}
            tab={activeTab}
            tabs={tabs}
            onCommentChanged={reload}
            onTabChange={setTab}
          />
        </section>
      ) : null}
    </main>
  );
}

function ProfileSummary({ onEdit, ownProfile, profile }: { onEdit: () => void; ownProfile: boolean; profile: UserProfile }) {
  const user = profile.profile;
  return (
    <aside className="profile-card">
      <Avatar profile={profile} />
      <div className="profile-identity">
        <h1>{displayName(user)}</h1>
        <p>@{user?.username || "unknown"}</p>
      </div>

      <div className="profile-divider" />

      <div className="profile-stats">
        <Stat label="Open Assigned Issues" value={profile.stats?.open_assigned_count} />
        <Stat label="Watched Issues" value={profile.stats?.watched_count} />
        <Stat label="Comments" value={profile.stats?.comments_count} />
      </div>

      <div className="profile-divider" />

      <section className="profile-bio">
        <div className="profile-section-title">
          <h2>Bio</h2>
          {ownProfile ? (
            <button className="button secondary" onClick={onEdit} type="button">
              <Pencil size={15} aria-hidden="true" />
              Edit profile
            </button>
          ) : null}
        </div>
        <p>{user?.bio || "This user has not added a bio yet."}</p>
      </section>

      {ownProfile ? (
        <>
          <div className="profile-divider" />
          <section className="profile-api-key">
            <h2>API-Key:</h2>
            <strong>{user?.api_key || "Not available"}</strong>
          </section>
        </>
      ) : null}
    </aside>
  );
}

function Avatar({ profile }: { profile: UserProfile }) {
  const user = profile.profile;
  if (user?.avatar_url) {
    return <img alt={displayName(user)} className="profile-avatar-image" src={user.avatar_url} />;
  }
  return <span className="profile-avatar-fallback">{user?.initials || String(displayName(user)).slice(0, 2).toUpperCase()}</span>;
}

function Stat({ label, value }: { label: string; value?: number }) {
  return (
    <div className="profile-stat">
      <strong>{value ?? 0}</strong>
      <span>{label}</span>
    </div>
  );
}

function ProfileEditor({ profile, onCancel, onSaved }: { profile: UserProfile; onCancel: () => void; onSaved: () => Promise<void> }) {
  const toast = useToast();
  const user = profile.profile;
  const [input, setInput] = useState({ avatar: null as File | null, bio: profile.profile?.bio || "", remove_avatar: false });
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await profileApi.update(input);
      await onSaved();
      toast.success("Profile was saved.", "Profile saved");
    } catch (error) {
      toast.error(error, "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal profile-edit-modal grid" onSubmit={(event) => void submit(event)} role="dialog" aria-modal="true" aria-labelledby="profile-edit-title">
        <div className="page-header">
          <div>
            <p className="eyebrow">Edit profile</p>
            <h2 id="profile-edit-title">Profile details</h2>
          </div>
          <button className="icon-button ghost" disabled={saving} onClick={onCancel} title="Close" type="button">
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="profile-edit-grid">
          <section className="profile-edit-preview">
            <Avatar profile={profile} />
            <div>
              <strong>{displayName(user)}</strong>
              <p className="muted">@{user?.username || "unknown"}</p>
            </div>
          </section>

          <section className="grid">
            <div className="grid two">
              <ReadonlyField label="Display name" value={displayName(user)} />
              <ReadonlyField label="Username" value={`@${user?.username || "unknown"}`} />
            </div>
            <ReadonlyField label="API key" value={user?.api_key || "Not available"} />
            <div className="field">
              <label htmlFor="bio">Bio</label>
              <textarea className="textarea" id="bio" value={input.bio} onChange={(event) => setInput((current) => ({ ...current, bio: event.target.value }))} />
            </div>
            <div className="field">
              <label htmlFor="avatar">Avatar</label>
              <label className="file-picker" htmlFor="avatar">
                <Upload size={16} aria-hidden="true" />
                <span>{input.avatar?.name || "Choose image"}</span>
                <input
                  accept="image/*"
                  id="avatar"
                  type="file"
                  onChange={(event) => setInput((current) => ({ ...current, avatar: event.target.files?.[0] || null, remove_avatar: false }))}
                />
              </label>
            </div>
            {profile.profile?.avatar_url ? (
              <label className="checkbox-row">
                <input checked={input.remove_avatar} type="checkbox" onChange={(event) => setInput((current) => ({ ...current, avatar: event.target.checked ? null : current.avatar, remove_avatar: event.target.checked }))} />
                Remove current avatar
              </label>
            ) : null}
          </section>
        </div>

        <div className="toolbar profile-edit-actions">
          <button className="button primary" disabled={saving} type="submit">
            <Save size={16} aria-hidden="true" />
            {saving ? "Saving" : "Save profile"}
          </button>
          <button className="button secondary" disabled={saving} onClick={onCancel} type="button">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="readonly-field">{value}</div>
    </div>
  );
}

function ProfileActivity({
  onCommentChanged,
  onTabChange,
  ownProfile,
  profile,
  tab,
  tabs
}: {
  onCommentChanged: () => Promise<void>;
  onTabChange: (tab: ProfileTab) => void;
  ownProfile: boolean;
  profile: UserProfile;
  tab: ProfileTab;
  tabs: ProfileTab[];
}) {
  const [sort, setSort] = useState<IssueSort>("updated_at");
  const issueItems = useMemo(() => sortIssues(tab === "assigned" ? profile.assigned_issues : profile.watched_issues, sort), [profile.assigned_issues, profile.watched_issues, sort, tab]);
  const comments = useMemo(() => [...(profile.comments || [])].sort((left, right) => dateValue(right.created_at) - dateValue(left.created_at)), [profile.comments]);

  return (
    <section className="profile-activity-card">
      <div className="profile-activity-tabs">
        {tabs.map((item) => (
          <button className={tab === item ? "active" : ""} key={item} onClick={() => onTabChange(item)} type="button">
            {tabLabel(item)}
          </button>
        ))}
      </div>

      {tab === "comments" ? (
        <ProfileComments comments={comments} onCommentChanged={onCommentChanged} ownProfile={ownProfile} />
      ) : (
        <ProfileIssues issues={issueItems} sort={sort} tab={tab} onSortChange={setSort} />
      )}
    </section>
  );
}

function ProfileIssues({ issues, onSortChange, sort, tab }: { issues: UserMeIssueSummary[]; onSortChange: (sort: IssueSort) => void; sort: IssueSort; tab: ProfileTab }) {
  return (
    <div className="profile-table-wrap">
      <div className="profile-table-actions">
        <select className="select compact" value={sort} onChange={(event) => onSortChange(event.target.value as IssueSort)}>
          <option value="issue_type">Sort: type</option>
          <option value="severity">Sort: severity</option>
          <option value="priority">Sort: priority</option>
          <option value="id">Sort: issue #</option>
          <option value="status">Sort: status</option>
          <option value="updated_at">Sort: modified</option>
        </select>
      </div>
      <table className="profile-table">
        <thead>
          <tr>
            <th className="center">T</th>
            <th className="center">S</th>
            <th className="center">P</th>
            <th>Issue</th>
            <th>Status</th>
            <th>Modified</th>
          </tr>
        </thead>
        <tbody>
          {issues.length > 0 ? (
            issues.map((item) => (
              <tr key={item.id}>
                <td className="center">
                  <Dot value={catalogMeta(item.issue_type_label, item.issue_type_color, item.issue_type)} />
                </td>
                <td className="center">
                  <Dot value={catalogMeta(item.severity_label, item.severity_color, item.severity)} />
                </td>
                <td className="center">
                  <Dot value={catalogMeta(item.priority_label, item.priority_color, item.priority)} />
                </td>
                <td>
                  <Link href={`/issues/${item.id}`}>
                    <strong>#{item.id}</strong> {item.subject}
                  </Link>
                </td>
                <td>{catalogMeta(item.status_label, item.status_color, item.status).label}</td>
                <td>{formatDate(item.updated_at)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="profile-empty-cell" colSpan={6}>
                No issues in this tab.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <span className="visually-hidden">{tabLabel(tab)}</span>
    </div>
  );
}

function ProfileComments({ comments, onCommentChanged, ownProfile }: { comments: IssueComment[]; onCommentChanged: () => Promise<void>; ownProfile: boolean }) {
  const confirm = useConfirm();
  const toast = useToast();
  const [editing, setEditing] = useState<IssueComment | null>(null);

  async function saveComment(event: FormEvent) {
    event.preventDefault();
    if (!editing?.issue?.id || !editing.body?.trim()) return;
    try {
      await issueApi.updateComment(editing.issue.id, editing.id, editing.body);
      setEditing(null);
      await onCommentChanged();
      toast.success("Comment was updated.", "Comment saved");
    } catch (error) {
      toast.error(error, "Unable to update comment.");
    }
  }

  async function deleteComment(comment: IssueComment) {
    if (!comment.issue?.id) return;
    await confirm({
      title: "Delete this comment?",
      description: "This removes the comment from its issue discussion.",
      actionLabel: "Delete comment",
      destructive: true,
      onConfirm: async () => {
        try {
          await issueApi.deleteComment(comment.issue?.id as number, comment.id);
          await onCommentChanged();
          toast.success("Comment was deleted.", "Comment deleted");
        } catch (error) {
          toast.error(error, "Unable to delete comment.");
        }
      }
    });
  }

  return (
    <div className="profile-table-wrap">
      <table className="profile-table">
        <thead>
          <tr>
            <th>Issue</th>
            <th>Comment</th>
            <th>Created</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {comments.length > 0 ? (
            comments.map((comment) => {
              const issue = comment.issue;
              const canEdit = ownProfile || isCurrentUser(comment.creator);
              return (
                <tr key={comment.id}>
                  <td>{issue?.id ? <Link href={`/issues/${issue.id}#comment-${comment.id}`}>#{issue.id} {issue.subject}</Link> : "Issue"}</td>
                  <td>
                    {editing?.id === comment.id ? (
                      <form className="toolbar" onSubmit={(event) => void saveComment(event)}>
                        <input className="input" value={editing.body || ""} onChange={(event) => setEditing((current) => (current ? { ...current, body: event.target.value } : current))} />
                        <button className="icon-button secondary" title="Save comment" type="submit">
                          <Save size={16} aria-hidden="true" />
                        </button>
                        <button className="icon-button ghost" onClick={() => setEditing(null)} title="Cancel" type="button">
                          <X size={16} aria-hidden="true" />
                        </button>
                      </form>
                    ) : (
                      comment.body || "Empty comment"
                    )}
                  </td>
                  <td>{formatDate(comment.created_at)}</td>
                  <td>
                    {canEdit && editing?.id !== comment.id ? (
                      <span className="toolbar">
                        <button className="icon-button ghost" onClick={() => setEditing(comment)} title="Edit comment" type="button">
                          <Edit size={16} aria-hidden="true" />
                        </button>
                        <button className="icon-button danger" onClick={() => void deleteComment(comment)} title="Delete comment" type="button">
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td className="profile-empty-cell" colSpan={4}>
                No comments in this tab.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Dot({ value }: { value: { color?: string; label: string } }) {
  return <span className="profile-dot" style={{ background: value.color || "#747792" }} title={value.label} />;
}

function sortIssues(items: UserMeIssueSummary[] | undefined, sort: IssueSort) {
  return [...(items || [])].sort((left, right) => {
    if (sort === "id") return left.id - right.id;
    if (sort === "updated_at") return dateValue(right.updated_at) - dateValue(left.updated_at);
    return String(left[sort] || "").localeCompare(String(right[sort] || ""));
  });
}

function tabLabel(tab: ProfileTab) {
  if (tab === "assigned") return "Open Assigned Issues";
  if (tab === "watched") return "Watched Issues";
  return "Comments";
}

function catalogMeta(label: unknown, color: unknown, key: unknown) {
  return {
    color: typeof color === "string" ? color : undefined,
    label: String(label || key || "Unset")
  };
}

function dateValue(value?: string) {
  return value ? new Date(value).getTime() : 0;
}

function formatDate(value?: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
