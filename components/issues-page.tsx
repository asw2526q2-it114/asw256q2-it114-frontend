"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Edit, Plus, Search, Trash2 } from "lucide-react";
import { AuthPending } from "@/components/auth-pending";
import { StatusBadge } from "@/components/badge";
import { ErrorPanel } from "@/components/error-panel";
import { LoadingPanel } from "@/components/loading-panel";
import { PageTitle } from "@/components/page-title";
import { CatalogItem, catalogApi, displayName, issueApi, Issue, IssueInput, issueNumber } from "@/lib/api";
import { useAsyncData } from "@/lib/hooks";

const sortOptions = ["created_at", "subject", "status", "priority", "severity", "assigned_to", "deadline"];

export function IssuesPage() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ sort: "created_at", dir: "desc" });
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
                <th>Created</th>
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
                    <StatusBadge value={catalogBadge(issue.status_label, issue.status_color, issue.status)} />
                  </td>
                  <td>
                    <StatusBadge value={catalogBadge(issue.issue_type_label, issue.issue_type_color, issue.issue_type)} />
                  </td>
                  <td>
                    <StatusBadge value={catalogBadge(issue.severity_label, issue.severity_color, issue.severity)} />
                  </td>
                  <td>
                    <StatusBadge value={catalogBadge(issue.priority_label, issue.priority_color, issue.priority)} />
                  </td>
                  <td>{displayName(issue.assigned_to)}</td>
                  <td>{formatDate(issue.created_at)}</td>
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
  const statuses = useAsyncData(() => catalogApi.list("/statuses/"), []);
  const priorities = useAsyncData(() => catalogApi.list("/priorities/"), []);
  const types = useAsyncData(() => catalogApi.list("/types/"), []);
  const severities = useAsyncData(() => catalogApi.list("/severities/"), []);
  const [input, setInput] = useState({
    subject: issue?.subject || "",
    description: issue?.description || "",
    issue_type: issue?.issue_type || "",
    status: issue?.status || "",
    priority: issue?.priority || "",
    severity: issue?.severity || ""
  });
  const [saving, setSaving] = useState(false);
  const catalogsLoading = statuses.loading || priorities.loading || types.loading || severities.loading;
  const catalogError = statuses.error || priorities.error || types.error || severities.error;

  async function reloadCatalogs() {
    await Promise.all([statuses.reload(), priorities.reload(), types.reload(), severities.reload()]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = cleanIssueInput(input);
      if (issue) await issueApi.update(issue.id, payload);
      else await issueApi.create(payload);
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
        {catalogsLoading ? <LoadingPanel label="Loading issue fields" /> : null}
        {catalogError ? <ErrorPanel error={catalogError} onRetry={() => void reloadCatalogs()} /> : null}
        <div className="grid three">
          <SelectField
            label="Type"
            options={types.data}
            value={input.issue_type}
            onChange={(value) => setInput((current) => ({ ...current, issue_type: value }))}
          />
          <SelectField
            label="Status"
            options={statuses.data}
            value={input.status}
            onChange={(value) => setInput((current) => ({ ...current, status: value }))}
          />
          <SelectField
            label="Priority"
            options={priorities.data}
            value={input.priority}
            onChange={(value) => setInput((current) => ({ ...current, priority: value }))}
          />
        </div>
        <SelectField
          label="Severity"
          options={severities.data}
          value={input.severity}
          onChange={(value) => setInput((current) => ({ ...current, severity: value }))}
        />
        <div className="toolbar">
          <button className="button primary" disabled={saving || catalogsLoading || Boolean(catalogError)} type="submit">
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

function SelectField({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  options: CatalogItem[] | null;
  value: string;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select className="select" id={id} required value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select {label.toLowerCase()}</option>
        {options?.map((option) => (
          <option key={option.id} value={option.key || ""}>
            {displayName(option)}
          </option>
        ))}
      </select>
    </div>
  );
}

function cleanIssueInput(input: {
  description: string;
  issue_type: string;
  priority: string;
  severity: string;
  status: string;
  subject: string;
}): IssueInput {
  return {
    subject: input.subject,
    description: input.description,
    issue_type: input.issue_type,
    status: input.status,
    priority: input.priority,
    severity: input.severity
  };
}

function catalogBadge(label?: string, color?: string, key?: string) {
  return { color, label: label || key || "Unset" };
}

function formatDate(value?: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}
