"use client";

import { FormEvent, useState } from "react";
import { Paperclip, Plus, Trash2 } from "lucide-react";
import { ErrorPanel } from "@/components/error-panel";
import { LoadingPanel } from "@/components/loading-panel";
import { displayName, issueApi } from "@/lib/api";
import { useAsyncData } from "@/lib/hooks";

export function IssueCollaborationPanel({ issueId, mode }: { issueId: string; mode: "comments" | "attachments" }) {
  if (mode === "attachments") return <Attachments issueId={issueId} />;
  return <Comments issueId={issueId} />;
}

function Comments({ issueId }: { issueId: string }) {
  const [comment, setComment] = useState("");
  const { data, error, loading, reload } = useAsyncData(() => issueApi.comments(issueId), [issueId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!comment.trim()) return;
    await issueApi.addComment(issueId, comment);
    setComment("");
    await reload();
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
        <h2>Activity</h2>
        {loading ? <LoadingPanel label="Loading comments" /> : null}
        {error ? <ErrorPanel error={error} onRetry={reload} /> : null}
        {data?.map((item) => (
          <article className="card panel" key={item.id}>
            <p>{item.comment || item.text || item.content || "Empty comment"}</p>
            <p className="muted">
              {displayName(item.user || item.owner)} · {formatDate(item.created_date)}
            </p>
            <button className="icon-button danger" onClick={() => void issueApi.deleteComment(issueId, item.id).then(reload)} title="Delete comment" type="button">
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function Attachments({ issueId }: { issueId: string }) {
  const { data, error, loading, reload } = useAsyncData(() => issueApi.attachments(issueId), [issueId]);
  return (
    <section className="panel grid">
      <div>
        <p className="eyebrow">Files</p>
        <h2>Attachments</h2>
        <p className="muted">Upload controls are waiting on the authenticated multipart flow.</p>
      </div>
      {loading ? <LoadingPanel label="Loading attachments" /> : null}
      {error ? <ErrorPanel error={error} onRetry={reload} /> : null}
      <div className="grid three">
        {data?.map((attachment) => (
          <article className="card panel" key={attachment.id}>
            <Paperclip size={18} aria-hidden="true" />
            <h3>{attachment.name || attachment.filename || `Attachment ${attachment.id}`}</h3>
            <p className="muted">{formatDate(attachment.created_date)}</p>
            <button
              className="button danger"
              onClick={() => void issueApi.deleteAttachment(issueId, attachment.id).then(reload)}
              type="button"
            >
              <Trash2 size={16} aria-hidden="true" />
              Delete
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function formatDate(value?: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
