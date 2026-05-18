"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Edit, Plus, Search, Trash2 } from "lucide-react";
import { AuthPending } from "@/components/auth-pending";
import { StatusBadge } from "@/components/badge";
import { ErrorPanel } from "@/components/error-panel";
import { LoadingPanel } from "@/components/loading-panel";
import { PageTitle } from "@/components/page-title";
import { displayName, issueApi, Issue, IssueInput, issueNumber } from "@/lib/api";
import { useAsyncData } from "@/lib/hooks";

const sortOptions = ["modified", "type", "severity", "number", "status"];

export function IssuesPage() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ sort: "modified", dir: "desc" });
  const [editing, setEditing] = useState<Issue | "new" | null>(null);
  const params = useMemo(() => ({ q: query, sort: filters.sort, dir: filters.dir }), [query, filters]);
  const { data, error, loading, unauthorized, reload } = useAsyncData(() => issueApi.list(params), [params]);

  async function removeIssue(issue: Issue) {
    if (!confirm(`Delete issue #${issueNumber(issue)}?`)) return;
    await issueApi.remove(issue.id);
    await reload();
  }

  return (
    <main className="page">
      <PageTitle
        eyebrow="Issue discovery"
        title="Issues"
        description="Search, sort, create, update, and review issues from the IssueHub API."
        actions={
          <button className="button primary" onClick={() => setEditing("new")} type="button">
            <Plus size={16} aria-hidden="true" />
            New issue
          </button>
        }
      />

      <section className="panel grid" style={{ marginBottom: 16 }}>
        <div className="toolbar">
          <div className="search">
            <Search size={16} aria-hidden="true" />
            <input
              className="input"
              placeholder="Search by subject, description, or number"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <select
            className="select"
            style={{ width: 160 }}
            value={filters.sort}
            onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value }))}
          >
            {sortOptions.map((option) => (
              <option key={option} value={option}>
                Sort: {option}
              </option>
            ))}
          </select>
          <select
            className="select"
            style={{ width: 130 }}
            value={filters.dir}
            onChange={(event) => setFilters((current) => ({ ...current, dir: event.target.value }))}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </section>

      {unauthorized ? <AuthPending /> : null}
      {loading ? <LoadingPanel label="Loading issues" /> : null}
      {error && !unauthorized ? <ErrorPanel error={error} onRetry={reload} /> : null}
      {!loading && !error && data ? (
        <section className="panel table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Issue</th>
                <th>Status</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Priority</th>
                <th>Assignee</th>
                <th>Modified</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {data.map((issue) => (
                <tr key={issue.id}>
                  <td>
                    <Link href={`/issues/${issue.id}`}>
                      <strong>#{issueNumber(issue)}</strong> {issue.subject}
                    </Link>
                    {issue.description ? <p className="muted">{truncate(issue.description, 120)}</p> : null}
                  </td>
                  <td>
                    <StatusBadge value={issue.status_extra_info || issue.status} />
                  </td>
                  <td>{displayName(issue.type_extra_info || issue.issue_type || issue.type)}</td>
                  <td>
                    <StatusBadge value={issue.severity_extra_info || issue.severity} />
                  </td>
                  <td>{displayName(issue.priority_extra_info || issue.priority)}</td>
                  <td>{displayName(issue.assigned_to_extra_info || issue.assigned_to)}</td>
                  <td>{formatDate(issue.modified_date || issue.created_date)}</td>
                  <td>
                    <div className="toolbar">
                      <button className="icon-button ghost" onClick={() => setEditing(issue)} title="Edit" type="button">
                        <Edit size={16} aria-hidden="true" />
                      </button>
                      <button className="icon-button danger" onClick={() => void removeIssue(issue)} title="Delete" type="button">
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.length === 0 ? (
            <div className="empty-state">
              <p>No issues match the current filters.</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {editing ? (
        <IssueEditor
          issue={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await reload();
          }}
        />
      ) : null}
    </main>
  );
}

function IssueEditor({ issue, onClose, onSaved }: { issue: Issue | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [input, setInput] = useState<IssueInput>({
    subject: issue?.subject || "",
    description: issue?.description || "",
    issue_type: primitive(issue?.issue_type || issue?.type),
    status: primitive(issue?.status),
    priority: primitive(issue?.priority),
    severity: primitive(issue?.severity)
  });
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      if (issue) await issueApi.update(issue.id, input);
      else await issueApi.create(input);
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal grid" onSubmit={(event) => void submit(event)}>
        <div className="page-header">
          <div>
            <p className="eyebrow">{issue ? "Edit issue" : "Create issue"}</p>
            <h2>{issue ? `#${issueNumber(issue)}` : "New issue"}</h2>
          </div>
          <button className="button ghost" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <div className="field">
          <label htmlFor="subject">Subject</label>
          <input
            className="input"
            id="subject"
            required
            value={input.subject}
            onChange={(event) => setInput((current) => ({ ...current, subject: event.target.value }))}
          />
        </div>
        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea
            className="textarea"
            id="description"
            value={input.description}
            onChange={(event) => setInput((current) => ({ ...current, description: event.target.value }))}
          />
        </div>
        <div className="grid three">
          <TextField label="Type" value={input.issue_type} onChange={(value) => setInput((current) => ({ ...current, issue_type: value }))} />
          <TextField label="Status" value={input.status} onChange={(value) => setInput((current) => ({ ...current, status: value }))} />
          <TextField label="Priority" value={input.priority} onChange={(value) => setInput((current) => ({ ...current, priority: value }))} />
        </div>
        <TextField label="Severity" value={input.severity} onChange={(value) => setInput((current) => ({ ...current, severity: value }))} />
        <div className="toolbar">
          <button className="button primary" disabled={saving} type="submit">
            {saving ? "Saving" : "Save issue"}
          </button>
          <button className="button secondary" onClick={onClose} type="button">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value?: string | number; onChange: (value: string) => void }) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input className="input" id={id} value={value || ""} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function primitive(value: unknown) {
  if (typeof value === "string" || typeof value === "number") return value;
  if (value && typeof value === "object" && "id" in value) return String((value as { id: unknown }).id);
  return "";
}

function formatDate(value?: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}
