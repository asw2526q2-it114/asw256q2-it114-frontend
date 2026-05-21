"use client";

import Link from "next/link";
import { FormEvent, useMemo, useRef, useState } from "react";
import { CustomSelect } from "@/components/custom-select";
import {
  AlertTriangle,
  Edit,
  ImageIcon,
  Paperclip,
  Plus,
  Save,
  Trash2,
  Upload,
  UserMinus,
  X
} from "lucide-react";
import { AuthPending } from "@/components/auth-pending";
import { ErrorPanel } from "@/components/error-panel";
import { useConfirm, useToast } from "@/components/feedback-provider";
import { IssueEditor } from "@/components/issue-editor";
import { LoadingPanel } from "@/components/loading-panel";
import { PageTitle } from "@/components/page-title";
import { getStoredUser } from "@/lib/auth";
import {
  Attachment,
  Issue,
  IssueActivity,
  IssueComment,
  UserSummary,
  displayName,
  isCurrentUser,
  issueApi,
  issueNumber
} from "@/lib/api";
import { useAsyncData } from "@/lib/hooks";

export function IssueDetailPage({ issueId }: { issueId: string }) {
  const [editing, setEditing] = useState(false);
  const [activitiesRefreshToken, setActivitiesRefreshToken] = useState(0);
  const { data: issue, error, loading, unauthorized, reload } = useAsyncData(() => issueApi.get(issueId), [issueId]);
  const ownIssue = issue ? isCurrentUser(issue.creator) : false;

  return (
    <main className="page issue-detail-page">
      <PageTitle
        eyebrow="Issue detail"
        title={issue ? `#${issueNumber(issue)}` : `Issue #${issueId}`}
        actions={
          <>
            {ownIssue ? (
              <button className="button primary" onClick={() => setEditing(true)} type="button">
                <Edit size={16} aria-hidden="true" />
                Edit issue
              </button>
            ) : null}
            <Link className="button secondary" href="/issues">
              Back to issues
            </Link>
          </>
        }
      />
      {unauthorized ? <AuthPending /> : null}
      {loading ? <LoadingPanel label="Loading issue" /> : null}
      {error && !unauthorized ? <ErrorPanel error={error} onRetry={reload} /> : null}
      {issue ? (
        <IssueWorkspace
          issue={issue}
          issueId={issueId}
          onIssueChanged={reload}
          activitiesRefreshToken={activitiesRefreshToken}
          onActivitiesRefresh={() => setActivitiesRefreshToken((token) => token + 1)}
        />
      ) : null}
      {issue && editing ? (
        <IssueEditor
          fallbackMembers={[]}
          issue={issue}
          onClose={() => setEditing(false)}
          onSaved={async (result) => {
            setEditing(false);
            await reload();
            if (result?.changed) {
              setActivitiesRefreshToken((token) => token + 1);
            }
          }}
        />
      ) : null}
    </main>
  );
}

function IssueWorkspace({
  issue,
  issueId,
  onIssueChanged,
  activitiesRefreshToken,
  onActivitiesRefresh
}: {
  issue: Issue;
  issueId: string;
  onIssueChanged: () => Promise<void>;
  activitiesRefreshToken: number;
  onActivitiesRefresh: () => void;
}) {
  return (
    <section className="issue-workspace">
      <div className="issue-main-column">
        <header className="issue-view-header">
          <span className="issue-kind-icon" aria-hidden="true">
            <AlertTriangle size={18} />
          </span>
          <span className="issue-id">#{issueNumber(issue)}</span>
          <h2>{issue.subject}</h2>
        </header>

        <section className="issue-section">
          <h3>Description</h3>
          <p className={issue.description ? "issue-description" : "muted"}>{issue.description || "No description provided."}</p>
        </section>

        <AttachmentsBlock issueId={issueId} onAttachmentsChanged={onActivitiesRefresh} />
        <CommentsBlock issueId={issueId} onCommentChanged={onActivitiesRefresh} />
        <ActivitiesBlock issueId={issueId} refreshToken={activitiesRefreshToken} />
      </div>

      <IssueSidebar issue={issue} issueId={issueId} onIssueChanged={onIssueChanged} onActivitiesRefresh={onActivitiesRefresh} />
    </section>
  );
}

function IssueSidebar({
  issue,
  issueId,
  onIssueChanged,
  onActivitiesRefresh
}: {
  issue: Issue;
  issueId: string;
  onIssueChanged: () => Promise<void>;
  onActivitiesRefresh: () => void;
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const members = useAsyncData(() => issueApi.assignableMembers(issueId), [issueId]);
  const deadline = useAsyncData(() => issueApi.getDeadline(issueId), [issueId]);
  const watchers = useAsyncData(() => issueApi.watchers(issueId), [issueId]);
  const [assignee, setAssignee] = useState("");
  const [date, setDate] = useState("");
  const currentUser = getStoredUser();

  async function saveAssignee() {
    try {
      await issueApi.setAssignee(issueId, assignee ? Number(assignee) : null);
      setAssignee("");
      await Promise.all([members.reload(), onIssueChanged()]);
      onActivitiesRefresh();
      toast.success("Assignee was updated.", "Assignee saved");
    } catch (error) {
      toast.error(error, "Unable to assign issue.");
    }
  }

  async function clearAssignee() {
    await confirm({
      title: "Clear the current assignee?",
      description: "The issue will become unassigned.",
      actionLabel: "Clear assignee",
      destructive: true,
      onConfirm: async () => {
        try {
          await issueApi.deleteAssignee(issueId);
          setAssignee("");
          await Promise.all([members.reload(), onIssueChanged()]);
          onActivitiesRefresh();
          toast.success("Assignee was cleared.", "Assignee cleared");
        } catch (error) {
          toast.error(error, "Unable to clear assignee.");
        }
      }
    });
  }

  async function saveDeadline(event: FormEvent) {
    event.preventDefault();
    try {
      await issueApi.saveDeadline(issueId, { deadline: date || currentDeadline(deadline.data) || null });
      setDate("");
      await Promise.all([deadline.reload(), onIssueChanged()]);
      onActivitiesRefresh();
      toast.success("Deadline was saved.", "Deadline saved");
    } catch (error) {
      toast.error(error, "Unable to save deadline.");
    }
  }

  async function removeDeadline() {
    await confirm({
      title: "Remove this deadline?",
      description: "The issue will no longer have a deadline date.",
      actionLabel: "Remove deadline",
      destructive: true,
      onConfirm: async () => {
        try {
          await issueApi.deleteDeadline(issueId);
          setDate("");
          await Promise.all([deadline.reload(), onIssueChanged()]);
          onActivitiesRefresh();
          toast.success("Deadline was removed.", "Deadline removed");
        } catch (error) {
          toast.error(error, "Unable to remove deadline.");
        }
      }
    });
  }

  const watcherList = normalizeWatchers(watchers.data);
  const isWatching = Boolean(currentUser && watcherList.some((watcher) => watcher.id === currentUser.id || watcher.username === currentUser.username));
  const assigneeValue = assignee || String(issue.assigned_to?.id || "");

  async function toggleWatch() {
    if (!currentUser) return;
    try {
      if (isWatching) {
        await issueApi.deleteWatcher(issueId, currentUser.id);
        toast.success("You are no longer watching this issue.", "Watch removed");
      } else {
        await issueApi.addWatcher(issueId, currentUser.id);
        toast.success("You are now watching this issue.", "Watching issue");
      }
      await watchers.reload();
      onActivitiesRefresh();
    } catch (error) {
      toast.error(error, isWatching ? "Unable to stop watching issue." : "Unable to watch issue.");
    }
  }

  return (
    <aside className="issue-sidebar">
      <SidebarGroup label="Status">
        <span className="issue-status-pill">{labelFor(issue.status_label, issue.status)}</span>
        <p className="issue-helper">Only the creator or assigned user can change the status.</p>
      </SidebarGroup>

      <SidebarGroup label="Type">
        <DotMeta color={issue.issue_type_color} value={labelFor(issue.issue_type_label, issue.issue_type)} />
      </SidebarGroup>
      <SidebarGroup label="Severity">
        <DotMeta color={issue.severity_color} value={labelFor(issue.severity_label, issue.severity)} />
      </SidebarGroup>
      <SidebarGroup label="Priority">
        <DotMeta color={issue.priority_color} value={labelFor(issue.priority_label, issue.priority)} />
      </SidebarGroup>

      <SidebarGroup label="Assigned to">
        <p className="issue-sidebar-value">{displayName(issue.assigned_to)}</p>
        {members.loading ? <LoadingPanel label="Loading members" /> : null}
        {members.error && !members.unauthorized ? <ErrorPanel error={members.error} onRetry={members.reload} /> : null}
        <div className="issue-inline-form">
          <CustomSelect
            value={assigneeValue}
            onChange={(val) => setAssignee(val)}
            options={[
              { value: "", label: "Unassigned" },
              ...(members.data || []).map((member) => ({
                value: String(member.id || ""),
                label: displayName(member)
              }))
            ]}
          />
          <button className="button secondary" onClick={() => void saveAssignee()} type="button">
            <Save size={15} aria-hidden="true" />
            Update
          </button>
        </div>
        {issue.assigned_to ? (
          <button className="button ghost issue-text-action" onClick={() => void clearAssignee()} type="button">
            <UserMinus size={15} aria-hidden="true" />
            Clear assignee
          </button>
        ) : null}
      </SidebarGroup>

      <SidebarGroup label="Created by">
        <UserLine user={issue.creator} />
      </SidebarGroup>

      <SidebarGroup label="Watchers">
        {watchers.loading ? <LoadingPanel label="Loading watchers" /> : null}
        {watchers.error ? <ErrorPanel error={watchers.error} onRetry={watchers.reload} /> : null}
        <div className="issue-watch-row">
          <p className="issue-sidebar-value">{watcherList.length} watcher{watcherList.length === 1 ? "" : "s"}</p>
          <button className="button secondary" disabled={!currentUser || watchers.loading} onClick={() => void toggleWatch()} type="button">
            {isWatching ? "Unwatch" : "Watch"}
          </button>
        </div>
        <div className="issue-chip-list">
          {watcherList.map((watcher) => (
            <span className="issue-chip" key={watcher.id || watcher.username}>
              {displayName(watcher)}
            </span>
          ))}
        </div>
        {!watchers.loading && watcherList.length === 0 ? <p className="muted">No watchers yet.</p> : null}
      </SidebarGroup>

      <SidebarGroup label="Deadline">
        {deadline.loading ? <LoadingPanel label="Loading deadline" /> : null}
        {deadline.error && !deadline.unauthorized ? <ErrorPanel error={deadline.error} onRetry={deadline.reload} /> : null}
        <form className="issue-inline-form" onSubmit={(event) => void saveDeadline(event)}>
          <input
            className="input"
            type="date"
            value={date || currentDeadline(deadline.data) || String(issue.deadline || "").slice(0, 10)}
            onChange={(event) => setDate(event.target.value)}
          />
          <button className="button secondary" type="submit">
            <Save size={15} aria-hidden="true" />
            Save
          </button>
        </form>
        {(deadline.data?.deadline || issue.deadline) ? (
          <button className="button ghost issue-text-action" onClick={() => void removeDeadline()} type="button">
            <Trash2 size={15} aria-hidden="true" />
            Remove deadline
          </button>
        ) : null}
      </SidebarGroup>

      <SidebarGroup label="Created">
        <p className="issue-sidebar-value">{formatDate(issue.created_at)}</p>
      </SidebarGroup>
      <SidebarGroup label="Modified">
        <p className="issue-sidebar-value">{formatDate(issue.updated_at)}</p>
      </SidebarGroup>
    </aside>
  );
}

function AttachmentsBlock({ issueId, onAttachmentsChanged }: { issueId: string; onAttachmentsChanged: () => void }) {
  const confirm = useConfirm();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const { data, error, loading, reload } = useAsyncData(() => issueApi.attachments(issueId), [issueId]);
  const attachments = useMemo(() => normalizeAttachments(data), [data]);

  async function upload(files: File[]) {
    if (files.length === 0) return;
    setUploading(true);
    try {
      await issueApi.uploadAttachments(issueId, files);
      if (inputRef.current) inputRef.current.value = "";
      setSelectedFiles([]);
      await reload();
      onAttachmentsChanged();
      toast.success(`${files.length} attachment${files.length === 1 ? "" : "s"} uploaded.`, "Upload complete");
    } catch (error) {
      toast.error(error, "Unable to upload attachment.");
    } finally {
      setUploading(false);
    }
  }

  async function deleteAttachment(attachment: Attachment) {
    await confirm({
      title: `Delete ${attachment.original_name || `attachment ${attachment.id}`}?`,
      description: "This removes the file from the issue.",
      actionLabel: "Delete attachment",
      destructive: true,
      onConfirm: async () => {
        try {
          await issueApi.deleteAttachment(issueId, attachment.id);
          await reload();
          onAttachmentsChanged();
          toast.success("Attachment was deleted.", "Attachment deleted");
        } catch (error) {
          toast.error(error, "Unable to delete attachment.");
        }
      }
    });
  }

  return (
    <section className="issue-section">
      <div className="issue-section-heading">
        <h3>Attachments</h3>
        <span>{attachments.length}</span>
      </div>
      <div className="issue-upload-box">
        <p className="label">Upload files</p>
        <input
          className="file-input"
          multiple
          ref={inputRef}
          type="file"
          onChange={(event) => setSelectedFiles(Array.from(event.target.files || []))}
        />
        <p className="muted">Allowed: PDF, DOC, DOCX, TXT, PNG, JPG, JPEG, CSV, XLSX. Max 5 MB per file.</p>
        <button className="button secondary" disabled={uploading || selectedFiles.length === 0} onClick={() => void upload(selectedFiles)} type="button">
          <Upload size={16} aria-hidden="true" />
          {uploading ? "Uploading" : "Upload attachments"}
        </button>
      </div>
      {loading ? <LoadingPanel label="Loading attachments" /> : null}
      {error ? <ErrorPanel error={error} onRetry={reload} /> : null}
      <div className="issue-item-list">
        {attachments.map((attachment) => {
          const canDelete = !attachment.creator || isCurrentUser(attachment.creator);
          return (
            <article className="issue-attachment-row" key={attachment.id}>
              {isImageAttachment(attachment) && attachment.url ? (
                <img alt={attachment.original_name || `Attachment ${attachment.id}`} className="attachment-preview" src={attachment.url} />
              ) : (
                <span className="attachment-icon">
                  {isImageAttachment(attachment) ? <ImageIcon size={18} aria-hidden="true" /> : <Paperclip size={18} aria-hidden="true" />}
                </span>
              )}
              <div>
                <h4>
                  {attachment.url ? (
                    <a href={attachment.url} rel="noreferrer" target="_blank">
                      {attachment.original_name || `Attachment ${attachment.id}`}
                    </a>
                  ) : (
                    attachment.original_name || `Attachment ${attachment.id}`
                  )}
                </h4>
                <p className="muted">
                  {formatBytes(attachment.size)} {attachment.content_type ? `- ${attachment.content_type}` : ""} - {formatDate(attachment.uploaded_at)}
                </p>
              </div>
              {canDelete ? (
                <button className="icon-button danger" onClick={() => void deleteAttachment(attachment)} title="Delete attachment" type="button">
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
      {!loading && attachments.length === 0 ? <p className="muted">No attachments yet.</p> : null}
    </section>
  );
}

function CommentsBlock({ issueId, onCommentChanged }: { issueId: string; onCommentChanged: () => void }) {
  const confirm = useConfirm();
  const toast = useToast();
  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState<IssueComment | null>(null);
  const { data, error, loading, reload } = useAsyncData(() => issueApi.comments(issueId), [issueId]);
  const comments = useMemo(() => normalizeComments(data), [data]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!comment.trim()) return;
    try {
      await issueApi.addComment(issueId, comment);
      setComment("");
      await reload();
      onCommentChanged();
      toast.success("Comment was added.", "Comment saved");
    } catch (error) {
      toast.error(error, "Unable to add comment.");
    }
  }

  async function updateComment(event: FormEvent) {
    event.preventDefault();
    if (!editing?.body?.trim()) return;
    try {
      await issueApi.updateComment(issueId, editing.id, editing.body);
      setEditing(null);
      await reload();
      onCommentChanged();
      toast.success("Comment was updated.", "Comment saved");
    } catch (error) {
      toast.error(error, "Unable to update comment.");
    }
  }

  async function deleteComment(item: IssueComment) {
    await confirm({
      title: "Delete this comment?",
      description: "This removes the comment from the issue discussion.",
      actionLabel: "Delete comment",
      destructive: true,
      onConfirm: async () => {
        try {
          await issueApi.deleteComment(issueId, item.id);
          await reload();
          onCommentChanged();
          toast.success("Comment was deleted.", "Comment deleted");
        } catch (error) {
          toast.error(error, "Unable to delete comment.");
        }
      }
    });
  }

  return (
    <section className="issue-section">
      <div className="issue-section-heading">
        <h3>Comments</h3>
        <span>{comments.length}</span>
      </div>
      <form className="issue-comment-form" onSubmit={(event) => void submit(event)}>
        <p className="label">Add comment</p>
        <textarea
          className="textarea tall"
          placeholder="Write a comment..."
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
        <button className="button primary" disabled={!comment.trim()} type="submit">
          <Plus size={16} aria-hidden="true" />
          Post comment
        </button>
      </form>
      {loading ? <LoadingPanel label="Loading comments" /> : null}
      {error ? <ErrorPanel error={error} onRetry={reload} /> : null}
      <div className="issue-item-list">
        {comments.map((item) => {
          const ownComment = isCurrentUser(item.creator);
          return (
            <article className="issue-comment" id={`comment-${item.id}`} key={item.id}>
              {editing?.id === item.id ? (
                <form className="grid" onSubmit={(event) => void updateComment(event)}>
                  <textarea
                    className="textarea"
                    value={editing.body || ""}
                    onChange={(event) => setEditing((current) => (current ? { ...current, body: event.target.value } : current))}
                  />
                  <div className="toolbar">
                    <button className="button primary" type="submit">
                      <Save size={16} aria-hidden="true" />
                      Save
                    </button>
                    <button className="button secondary" onClick={() => setEditing(null)} type="button">
                      <X size={16} aria-hidden="true" />
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <p>{item.body || "Empty comment"}</p>
                  <p className="muted">
                    {displayName(item.creator)} - {formatDate(item.created_at)}
                  </p>
                  {ownComment ? (
                    <div className="toolbar">
                      <button className="icon-button ghost" onClick={() => setEditing(item)} title="Edit comment" type="button">
                        <Edit size={16} aria-hidden="true" />
                      </button>
                      <button className="icon-button danger" onClick={() => void deleteComment(item)} title="Delete comment" type="button">
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </article>
          );
        })}
      </div>
      {!loading && comments.length === 0 ? <p className="muted">No comments yet.</p> : null}
    </section>
  );
}

function ActivitiesBlock({ issueId, refreshToken }: { issueId: string; refreshToken: number }) {
  const { data, error, loading, reload } = useAsyncData(() => issueApi.activities(issueId), [issueId, refreshToken]);
  const activities = useMemo(() => normalizeActivities(data), [data]);

  return (
    <section className="issue-section">
      <div className="issue-section-heading">
        <h3>Activities</h3>
        <span>{activities.length}</span>
      </div>
      {loading ? <LoadingPanel label="Loading activity" /> : null}
      {error ? <ErrorPanel error={error} onRetry={reload} /> : null}
      <div className="issue-item-list">
        {activities.map((item) => (
          <article className="issue-activity" key={item.id}>
            <ActivityItemContent activity={item} />
          </article>
        ))}
      </div>
      {!loading && activities.length === 0 ? <p className="muted">No activity yet.</p> : null}
    </section>
  );
}

const CATALOG_ACTIVITY_PREFIX: Partial<Record<string, string>> = {
  status_changed: "status",
  issue_type_changed: "issue_type",
  severity_changed: "severity",
  priority_changed: "priority"
};

const TEXT_ACTIVITY_FIELDS: Partial<Record<string, { from: string; to: string }>> = {
  subject_changed: { from: "from_subject", to: "to_subject" },
  description_changed: { from: "from_description", to: "to_description" },
  tags_changed: { from: "from_tags", to: "to_tags" }
};

function ActivityItemContent({ activity }: { activity: IssueActivity }) {
  const metadata = activity.metadata || {};
  const catalogPrefix = CATALOG_ACTIVITY_PREFIX[activity.kind];
  const textFields = TEXT_ACTIVITY_FIELDS[activity.kind];
  const isComment =
    activity.kind === "comment_created" || activity.kind === "comment_updated" || activity.kind === "comment_deleted";

  return (
    <>
      <p className="issue-activity-meta muted">
        {displayName(activity.actor)} - {formatDate(activity.created_at)}
      </p>
      {catalogPrefix ? (
        <ActivityCatalogChange metadata={metadata} prefix={catalogPrefix} summary={activity.summary} />
      ) : isComment ? (
        <>
          {activity.summary ? <p className="issue-activity-summary">{activity.summary}</p> : null}
          {stringMeta(metadata, "body") ? <p className="issue-activity-body">{stringMeta(metadata, "body")}</p> : null}
        </>
      ) : textFields ? (
        <ActivityTextChange metadata={metadata} fromKey={textFields.from} toKey={textFields.to} summary={activity.summary} />
      ) : (
        <p className="issue-activity-summary">{activity.summary || "Activity recorded."}</p>
      )}
    </>
  );
}

function ActivityCatalogChange({
  metadata,
  prefix,
  summary
}: {
  metadata: Record<string, unknown>;
  prefix: string;
  summary?: string;
}) {
  const fromLabel = stringMeta(metadata, `from_${prefix}_label`, `from_${prefix}`);
  const toLabel = stringMeta(metadata, `to_${prefix}_label`, `to_${prefix}`);

  if (!fromLabel && !toLabel) {
    return summary ? <p className="issue-activity-summary">{summary}</p> : null;
  }

  return (
    <div className="issue-activity-status-change">
      <ActivityStatusBadge
        color={stringMeta(metadata, `from_${prefix}_color`)}
        label={fromLabel || "Unset"}
      />
      <span aria-hidden="true">→</span>
      <ActivityStatusBadge
        color={stringMeta(metadata, `to_${prefix}_color`)}
        label={toLabel || "Unset"}
      />
    </div>
  );
}

function ActivityTextChange({
  metadata,
  fromKey,
  toKey,
  summary
}: {
  metadata: Record<string, unknown>;
  fromKey: string;
  toKey: string;
  summary?: string;
}) {
  const fromValue = stringMeta(metadata, fromKey);
  const toValue = stringMeta(metadata, toKey);

  if (!fromValue && !toValue) {
    return summary ? <p className="issue-activity-summary">{summary}</p> : null;
  }

  return (
    <div className="issue-activity-text-change">
      {fromValue ? <p className="issue-activity-text-value">{fromValue}</p> : null}
      <span aria-hidden="true">→</span>
      {toValue ? <p className="issue-activity-text-value">{toValue}</p> : null}
    </div>
  );
}

function ActivityStatusBadge({ color, label }: { color?: string; label: string }) {
  return (
    <span
      className="issue-activity-status-badge"
      style={color ? { borderColor: color, color } : undefined}
    >
      {label}
    </span>
  );
}

function SidebarGroup({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <section className="issue-sidebar-group">
      <h3>{label}</h3>
      {children}
    </section>
  );
}

function DotMeta({ color, value }: { color?: string; value: string }) {
  return (
    <span className="issue-dot-meta">
      <span style={{ background: color || "#747967" }} aria-hidden="true" />
      {value}
    </span>
  );
}

function UserLine({ user }: { user?: UserSummary | null }) {
  const name = displayName(user);
  return (
    <span className="issue-user-line">
      <span aria-hidden="true">{initials(name)}</span>
      {name}
    </span>
  );
}

function currentDeadline(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const deadline = (value as { deadline?: string | null }).deadline;
  return deadline ? String(deadline).slice(0, 10) : "";
}

function normalizeComments(value: unknown): IssueComment[] {
  if (Array.isArray(value)) return value as IssueComment[];
  if (value && typeof value === "object" && Array.isArray((value as Issue).comments)) return (value as Issue & { comments: IssueComment[] }).comments;
  return [];
}

function normalizeAttachments(value: unknown): Attachment[] {
  if (Array.isArray(value)) return value as Attachment[];
  if (value && typeof value === "object" && Array.isArray((value as Issue).attachments)) return (value as Issue).attachments || [];
  return [];
}

function normalizeActivities(value: unknown): IssueActivity[] {
  if (Array.isArray(value)) return value as IssueActivity[];
  return [];
}

function stringMeta(metadata: Record<string, unknown>, key: string, fallbackKey?: string) {
  const value = metadata[key] ?? (fallbackKey ? metadata[fallbackKey] : undefined);
  return value == null ? "" : String(value);
}

function normalizeWatchers(value: unknown): UserSummary[] {
  if (Array.isArray(value)) return value as UserSummary[];
  if (value && typeof value === "object" && Array.isArray((value as Issue).watchers)) return (value as Issue).watchers || [];
  return [];
}

function labelFor(label?: string, key?: string) {
  return label || key || "Unset";
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
}

function isImageAttachment(attachment: Attachment) {
  return attachment.content_type?.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "avif"].includes(String(attachment.extension || "").toLowerCase());
}

function formatDate(value?: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatBytes(value?: number) {
  if (!value && value !== 0) return "Size unknown";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
