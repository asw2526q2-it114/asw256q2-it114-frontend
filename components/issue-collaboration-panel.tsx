"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { CustomSelect } from "@/components/custom-select";
import { Edit, FileUp, ImageIcon, Paperclip, Plus, Save, Trash2, X } from "lucide-react";
import { ErrorPanel } from "@/components/error-panel";
import { useConfirm, useToast } from "@/components/feedback-provider";
import { LoadingPanel } from "@/components/loading-panel";
import { Attachment, Issue, IssueComment, UserSummary, displayName, isCurrentUser, issueApi } from "@/lib/api";
import { useAsyncData } from "@/lib/hooks";

type CollaborationMode = "activities" | "attachments" | "comments" | "watchers";

export function IssueCollaborationPanel({ issueId, mode }: { issueId: string; mode: CollaborationMode }) {
  if (mode === "attachments") return <Attachments issueId={issueId} />;
  if (mode === "watchers") return <Watchers issueId={issueId} />;
  if (mode === "activities") return <ActivitiesPlaceholder />;
  return <Comments issueId={issueId} />;
}

function Comments({ issueId }: { issueId: string }) {
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
          toast.success("Comment was deleted.", "Comment deleted");
        } catch (error) {
          toast.error(error, "Unable to delete comment.");
        }
      }
    });
  }

  return (
    <section className="grid two">
      <form className="panel grid" onSubmit={(event) => void submit(event)}>
        <div>
          <p className="eyebrow">Comments</p>
          <h2>Add comment</h2>
        </div>
        <textarea className="textarea" value={comment} onChange={(event) => setComment(event.target.value)} />
        <button className="button primary" type="submit">
          <Plus size={16} aria-hidden="true" />
          Add comment
        </button>
      </form>
      <div className="panel grid">
        <h2>Comments</h2>
        {loading ? <LoadingPanel label="Loading comments" /> : null}
        {error ? <ErrorPanel error={error} onRetry={reload} /> : null}
        {comments.map((item) => {
          const ownComment = isCurrentUser(item.creator);
          return (
            <article className="activity-item" id={`comment-${item.id}`} key={item.id}>
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
                      <button
                        className="icon-button danger"
                        onClick={() => void deleteComment(item)}
                        title="Delete comment"
                        type="button"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </article>
          );
        })}
        {!loading && comments.length === 0 ? <p className="muted">No comments yet.</p> : null}
      </div>
    </section>
  );
}

function Attachments({ issueId }: { issueId: string }) {
  const confirm = useConfirm();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const { data, error, loading, reload } = useAsyncData(() => issueApi.attachments(issueId), [issueId]);
  const attachments = useMemo(() => normalizeAttachments(data), [data]);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      await issueApi.uploadAttachments(issueId, files);
      if (inputRef.current) inputRef.current.value = "";
      await reload();
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
          toast.success("Attachment was deleted.", "Attachment deleted");
        } catch (error) {
          toast.error(error, "Unable to delete attachment.");
        }
      }
    });
  }

  return (
    <section className="panel grid">
      <div className="page-header">
        <div>
          <p className="eyebrow">Files</p>
          <h2>Attachments</h2>
        </div>
        <div>
          <input
            className="visually-hidden"
            multiple
            ref={inputRef}
            type="file"
            onChange={(event) => void upload(event.target.files)}
          />
          <button className="button primary" disabled={uploading} onClick={() => inputRef.current?.click()} type="button">
            <Plus size={16} aria-hidden="true" />
            {uploading ? "Uploading" : "Add"}
          </button>
        </div>
      </div>
      {loading ? <LoadingPanel label="Loading attachments" /> : null}
      {error ? <ErrorPanel error={error} onRetry={reload} /> : null}
      <div className="attachment-list">
        {attachments.map((attachment) => {
          const canDelete = !attachment.creator || isCurrentUser(attachment.creator);
          return (
            <article className="attachment-row" key={attachment.id}>
              {isImageAttachment(attachment) && attachment.url ? (
                <img alt={attachment.original_name || `Attachment ${attachment.id}`} className="attachment-preview" src={attachment.url} />
              ) : (
                <span className="attachment-icon">{isImageAttachment(attachment) ? <ImageIcon size={18} aria-hidden="true" /> : <Paperclip size={18} aria-hidden="true" />}</span>
              )}
              <div>
                <h3>
                  {attachment.url ? (
                    <a href={attachment.url} rel="noreferrer" target="_blank">
                      {attachment.original_name || `Attachment ${attachment.id}`}
                    </a>
                  ) : (
                    attachment.original_name || `Attachment ${attachment.id}`
                  )}
                </h3>
                <p className="muted">
                  {formatBytes(attachment.size)} {attachment.content_type ? `- ${attachment.content_type}` : ""}
                  {attachment.extension ? ` - .${attachment.extension}` : ""} - {formatDate(attachment.uploaded_at)}
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

function Watchers({ issueId }: { issueId: string }) {
  const confirm = useConfirm();
  const toast = useToast();
  const [selected, setSelected] = useState("");
  const watchers = useAsyncData(() => issueApi.watchers(issueId), [issueId]);
  const members = useAsyncData(() => issueApi.assignableMembers(issueId), [issueId]);
  const watcherList = useMemo(() => normalizeWatchers(watchers.data), [watchers.data]);
  const watcherKeys = new Set(watcherList.map((watcher) => String(watcher.id || watcher.username)));
  const availableMembers = members.data?.filter((member) => !watcherKeys.has(String(member.id || member.username))) || [];

  async function addWatcher(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    try {
      await issueApi.addWatcher(issueId, Number(selected));
      setSelected("");
      await watchers.reload();
      toast.success("Watcher was added.", "Watcher added");
    } catch (error) {
      toast.error(error, "Unable to add watcher.");
    }
  }

  async function removeWatcher(watcher: UserSummary) {
    if (!watcher.id) return;
    await confirm({
      title: `Remove ${displayName(watcher)} as watcher?`,
      description: "They will stop watching this issue.",
      actionLabel: "Remove watcher",
      destructive: true,
      onConfirm: async () => {
        try {
          await issueApi.deleteWatcher(issueId, watcher.id as number);
          await watchers.reload();
          toast.success("Watcher was removed.", "Watcher removed");
        } catch (error) {
          toast.error(error, "Unable to remove watcher.");
        }
      }
    });
  }

  return (
    <section className="grid two">
      <form className="panel grid" onSubmit={(event) => void addWatcher(event)}>
        <div>
          <p className="eyebrow">Watchers</p>
          <h2>Add watcher</h2>
        </div>
        {members.loading ? <LoadingPanel label="Loading members" /> : null}
        {members.error ? <ErrorPanel error={members.error} onRetry={members.reload} /> : null}
        <div className="field">
          <label htmlFor="watcher">Member</label>
          <CustomSelect
            id="watcher"
            value={selected}
            onChange={(val) => setSelected(val)}
            options={[
              { value: "", label: "Select user" },
              ...availableMembers.map((member) => ({
                value: String(member.id || ""),
                label: displayName(member)
              }))
            ]}
          />
        </div>
        <button className="button primary" disabled={!selected} type="submit">
          <Plus size={16} aria-hidden="true" />
          Add watcher
        </button>
      </form>
      <div className="panel grid">
        <h2>Current watchers</h2>
        {watchers.loading ? <LoadingPanel label="Loading watchers" /> : null}
        {watchers.error ? <ErrorPanel error={watchers.error} onRetry={watchers.reload} /> : null}
        {watcherList.map((watcher) => (
          <article className="watcher-row" key={watcher.id || watcher.username}>
            <span>{displayName(watcher)}</span>
            {watcher.id ? (
              <button className="icon-button danger" onClick={() => void removeWatcher(watcher)} title="Remove watcher" type="button">
                <Trash2 size={16} aria-hidden="true" />
              </button>
            ) : null}
          </article>
        ))}
        {!watchers.loading && watcherList.length === 0 ? <p className="muted">No watchers yet.</p> : null}
      </div>
    </section>
  );
}

function ActivitiesPlaceholder() {
  return (
    <section className="panel empty-state">
      <div>
        <FileUp size={24} aria-hidden="true" />
        <h2>Activities endpoint pending</h2>
        <p>The API schema does not expose an activities endpoint yet, so this timeline will stay empty until the backend provides the exact path.</p>
      </div>
    </section>
  );
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

function normalizeWatchers(value: unknown): UserSummary[] {
  if (Array.isArray(value)) return value as UserSummary[];
  if (value && typeof value === "object" && Array.isArray((value as Issue).watchers)) return (value as Issue).watchers || [];
  return [];
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
