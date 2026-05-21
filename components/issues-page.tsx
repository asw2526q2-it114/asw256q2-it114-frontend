"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, KeyboardEvent, MouseEvent, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Edit, Layers3, Plus, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { AuthPending } from "@/components/auth-pending";
import { StatusBadge } from "@/components/badge";
import { ErrorPanel } from "@/components/error-panel";
import { IssueEditor } from "@/components/issue-editor";
import { LoadingPanel } from "@/components/loading-panel";
import { PageTitle } from "@/components/page-title";
import { useConfirm, useToast } from "@/components/feedback-provider";
import {
  CatalogItem,
  UserSummary,
  catalogApi,
  displayName,
  isCurrentUser,
  issueApi,
  Issue,
  IssueBulkCreateInput,
  issueNumber,
  issueTags
} from "@/lib/api";
import { useAsyncData } from "@/lib/hooks";

const emptyFilters = {
  assigned_to: "",
  dir: "desc",
  issue_type: "",
  priority: "",
  severity: "",
  sort: "created_at",
  status: "",
  tag: ""
};

export function IssuesPage() {
  const confirm = useConfirm();
  const router = useRouter();
  const toast = useToast();
  const [searchDraft, setSearchDraft] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editing, setEditing] = useState<Issue | "new" | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const params = useMemo(() => ({ q: query, ...filters }), [query, filters]);
  const { data, error, loading, unauthorized, reload } = useAsyncData(() => issueApi.list(params), [params]);
  const statuses = useAsyncData(() => catalogApi.list("/statuses/"), []);
  const priorities = useAsyncData(() => catalogApi.list("/priorities/"), []);
  const types = useAsyncData(() => catalogApi.list("/types/"), []);
  const severities = useAsyncData(() => catalogApi.list("/severities/"), []);
  const tags = useAsyncData(() => catalogApi.list("/tags/"), []);
  const memberOptions = useMemo(() => uniqueMembers(data || []), [data]);
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  async function removeIssue(issue: Issue) {
    await confirm({
      title: `Delete issue #${issueNumber(issue)}?`,
      description: "This removes the issue and its related discussion from the tracker.",
      actionLabel: "Delete issue",
      destructive: true,
      onConfirm: async () => {
        try {
          await issueApi.remove(issue.id);
          await reload();
          toast.success(`Issue #${issueNumber(issue)} was deleted.`, "Issue deleted");
        } catch (error) {
          toast.error(error, "Unable to delete issue.");
        }
      }
    });
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setQuery(searchDraft.trim());
  }

  function sortBy(column: string) {
    setFilters((current) => ({
      ...current,
      sort: column,
      dir: current.sort === column && current.dir === "asc" ? "desc" : "asc"
    }));
  }

  function openIssueFromRow(event: MouseEvent<HTMLTableRowElement> | KeyboardEvent<HTMLTableRowElement>, issue: Issue) {
    const target = event.target as HTMLElement;
    if (target.closest("a, button, input, select, textarea")) return;
    router.push(`/issues/${issue.id}`);
  }

  const catalogsLoading = statuses.loading || priorities.loading || types.loading || severities.loading || tags.loading;
  const catalogError = statuses.error || priorities.error || types.error || severities.error || tags.error;

  async function reloadCatalogs() {
    await Promise.all([statuses.reload(), priorities.reload(), types.reload(), severities.reload(), tags.reload()]);
  }

  return (
    <main className="page">
      <PageTitle
        eyebrow="Issue discovery"
        title="Issues"
        description="Search on demand, filter, sort, create, update, and review issues from the IssueHub API."
        actions={
          <>
            <button className="button secondary" onClick={() => setBulkOpen(true)} type="button">
              <Layers3 size={16} aria-hidden="true" />
              Bulk insert
            </button>
            <button className="button primary" onClick={() => setEditing("new")} type="button">
              <Plus size={16} aria-hidden="true" />
              New issue
            </button>
          </>
        }
      />

      <section className="panel grid" style={{ marginBottom: 16 }}>
        <form className="toolbar" onSubmit={submitSearch}>
          <div className="search">
            <Search size={16} aria-hidden="true" />
            <input
              className="input"
              placeholder="Search subject or description"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
            />
          </div>
          <button className="button primary" type="submit">
            <Search size={16} aria-hidden="true" />
            Search
          </button>
          <button
            aria-controls="issue-filters"
            aria-expanded={filtersOpen}
            className="button secondary"
            onClick={() => setFiltersOpen((open) => !open)}
            type="button"
          >
            <SlidersHorizontal size={16} aria-hidden="true" />
            Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}
            {filtersOpen ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
          </button>
          {query ? (
            <button
              className="button secondary"
              onClick={() => {
                setSearchDraft("");
                setQuery("");
              }}
              type="button"
            >
              Clear search
            </button>
          ) : null}
        </form>
        {filtersOpen ? (
          <>
            <div className="toolbar" id="issue-filters">
              <CatalogFilter label="Status" options={statuses.data} value={filters.status} onChange={(value) => setFilters((current) => ({ ...current, status: value }))} />
              <CatalogFilter label="Type" options={types.data} value={filters.issue_type} onChange={(value) => setFilters((current) => ({ ...current, issue_type: value }))} />
              <CatalogFilter label="Severity" options={severities.data} value={filters.severity} onChange={(value) => setFilters((current) => ({ ...current, severity: value }))} />
              <CatalogFilter label="Priority" options={priorities.data} value={filters.priority} onChange={(value) => setFilters((current) => ({ ...current, priority: value }))} />
              <CatalogFilter label="Tag" options={tags.data} value={filters.tag} onChange={(value) => setFilters((current) => ({ ...current, tag: value }))} />
              <select
                className="select compact"
                value={filters.assigned_to}
                onChange={(event) => setFilters((current) => ({ ...current, assigned_to: event.target.value }))}
              >
                <option value="">Any assignee</option>
                {memberOptions.map((member) => (
                  <option key={member.id || member.username} value={member.id}>
                    {displayName(member)}
                  </option>
                ))}
              </select>
              <button className="button secondary" onClick={() => setFilters(emptyFilters)} type="button">
                Clear filters
              </button>
            </div>
            {catalogsLoading ? <LoadingPanel label="Loading filters" /> : null}
            {catalogError ? <ErrorPanel error={catalogError} onRetry={() => void reloadCatalogs()} /> : null}
          </>
        ) : null}
      </section>

      {unauthorized ? <AuthPending /> : null}
      {loading ? <LoadingPanel label="Loading issues" /> : null}
      {error && !unauthorized ? <ErrorPanel error={error} onRetry={reload} /> : null}
      {!loading && !error && data ? (
        <section className="panel table-wrap">
          <table className="table">
            <thead>
              <tr>
                <SortableHeader activeSort={filters.sort} className="dot-column" column="issue_type" dir={filters.dir} label="Type" onSort={sortBy} />
                <SortableHeader activeSort={filters.sort} className="dot-column" column="severity" dir={filters.dir} label="Severity" onSort={sortBy} />
                <SortableHeader activeSort={filters.sort} className="dot-column" column="priority" dir={filters.dir} label="Priority" onSort={sortBy} />
                <SortableHeader activeSort={filters.sort} column="pk" dir={filters.dir} label="Issue" onSort={sortBy} />
                <SortableHeader activeSort={filters.sort} column="status" dir={filters.dir} label="Status" onSort={sortBy} />
                <SortableHeader activeSort={filters.sort} column="assigned_to" dir={filters.dir} label="Assignee" onSort={sortBy} />
                <th>Tags</th>
                <SortableHeader activeSort={filters.sort} column="created_at" dir={filters.dir} label="Created" onSort={sortBy} />
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {data.map((issue) => {
                const ownIssue = isCurrentUser(issue.creator);
                return (
                  <tr
                    className="clickable-row"
                    key={issue.id}
                    onClick={(event) => openIssueFromRow(event, issue)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") openIssueFromRow(event, issue);
                    }}
                    tabIndex={0}
                  >
                    <td className="dot-column">
                      <CatalogDot value={catalogBadge(issue.issue_type_label, issue.issue_type_color, issue.issue_type)} />
                    </td>
                    <td className="dot-column">
                      <CatalogDot value={catalogBadge(issue.severity_label, issue.severity_color, issue.severity)} />
                    </td>
                    <td className="dot-column">
                      <CatalogDot value={catalogBadge(issue.priority_label, issue.priority_color, issue.priority)} />
                    </td>
                    <td>
                      <Link href={`/issues/${issue.id}`}>
                        <strong>#{issueNumber(issue)}</strong> {issue.subject}
                      </Link>
                      {issue.description ? <p className="muted">{truncate(issue.description, 120)}</p> : null}
                    </td>
                    <td>
                      <StatusBadge value={catalogBadge(issue.status_label, issue.status_color, issue.status)} />
                    </td>
                    <td>{displayName(issue.assigned_to)}</td>
                    <td>{issueTags(issue.tags) || "No tags"}</td>
                    <td>{formatDate(issue.created_at)}</td>
                    <td>
                      {ownIssue ? (
                        <div className="toolbar">
                          <button className="icon-button ghost" onClick={() => setEditing(issue)} title="Edit" type="button">
                            <Edit size={16} aria-hidden="true" />
                          </button>
                          <button className="icon-button danger" onClick={() => void removeIssue(issue)} title="Delete" type="button">
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </div>
                      ) : (
                        <span className="muted">Owner only</span>
                      )}
                    </td>
                  </tr>
                );
              })}
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
          fallbackMembers={memberOptions}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await reload();
          }}
        />
      ) : null}
      {bulkOpen ? (
        <BulkInsertDialog
          fallbackMembers={memberOptions}
          onClose={() => setBulkOpen(false)}
          onSaved={async () => {
            setBulkOpen(false);
            await reload();
          }}
        />
      ) : null}
    </main>
  );
}

function CatalogDot({ value }: { value: { color?: string; label: string } }) {
  return (
    <span
      aria-label={value.label}
      className="issue-catalog-dot"
      role="img"
      style={{ background: value.color || "#747792" }}
      title={value.label}
    />
  );
}

function SortableHeader({
  activeSort,
  className,
  column,
  dir,
  label,
  onSort
}: {
  activeSort: string;
  className?: string;
  column: string;
  dir: string;
  label: string;
  onSort: (column: string) => void;
}) {
  const active = activeSort === column;
  return (
    <th className={className} aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <button className={`table-sort-button ${active ? "active" : ""}`} onClick={() => onSort(column)} type="button">
        {label}
        {active ? <span aria-hidden="true">{dir === "asc" ? "▲" : "▼"}</span> : null}
      </button>
    </th>
  );
}

function BulkInsertDialog({ fallbackMembers, onClose, onSaved }: { fallbackMembers: UserSummary[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const toast = useToast();
  const statuses = useAsyncData(() => catalogApi.list("/statuses/"), []);
  const priorities = useAsyncData(() => catalogApi.list("/priorities/"), []);
  const types = useAsyncData(() => catalogApi.list("/types/"), []);
  const severities = useAsyncData(() => catalogApi.list("/severities/"), []);
  const [input, setInput] = useState({
    assigned_to: "",
    issue_type: "",
    priority: "",
    rows: "",
    severity: "",
    status: "",
    tags: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const catalogsLoading = statuses.loading || priorities.loading || types.loading || severities.loading;
  const catalogError = statuses.error || priorities.error || types.error || severities.error;

  async function submit(event: FormEvent) {
    event.preventDefault();
    const validation = validateBulkInput(input);
    setErrors(validation.errors);
    if (validation.firstInvalid) {
      focusBulkField(validation.firstInvalid);
      return;
    }

    setSaving(true);
    try {
      const payload: IssueBulkCreateInput = {
        rows: input.rows,
        issue_type: input.issue_type,
        priority: input.priority,
        severity: input.severity,
        status: input.status,
        assigned_to: input.assigned_to ? Number(input.assigned_to) : null,
        tags: input.tags.trim()
      };
      const created = await issueApi.bulkCreate(payload);
      await onSaved();
      toast.success(`${created.length} issues were created.`, "Bulk insert complete");
    } catch (error) {
      toast.error(error, "Unable to create issues.");
    } finally {
      setSaving(false);
    }
  }

  function updateField(field: string, value: string) {
    setInput((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  }

  async function reloadCatalogs() {
    await Promise.all([statuses.reload(), priorities.reload(), types.reload(), severities.reload()]);
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal grid" onSubmit={(event) => void submit(event)} noValidate>
        <div className="page-header">
          <div>
            <p className="eyebrow">Bulk insert</p>
            <h2>Create multiple issues</h2>
          </div>
          <button className="button ghost" onClick={onClose} type="button">
            Close
          </button>
        </div>
        {catalogsLoading ? <LoadingPanel label="Loading issue fields" /> : null}
        {catalogError ? <ErrorPanel error={catalogError} onRetry={() => void reloadCatalogs()} /> : null}
        <div className="field">
          <label htmlFor="bulk-rows">Issues</label>
          <textarea
            aria-describedby={errors.rows ? "bulk-rows-error" : undefined}
            aria-invalid={Boolean(errors.rows)}
            className="textarea tall"
            id="bulk-rows"
            placeholder="Subject&#10;Subject | Description"
            value={input.rows}
            onChange={(event) => updateField("rows", event.target.value)}
          />
          <FieldError id="bulk-rows-error" message={errors.rows} />
        </div>
        <div className="grid two">
          <SelectField error={errors.issue_type} field="issue_type" label="Type" options={types.data} value={input.issue_type} onChange={updateField} />
          <SelectField error={errors.status} field="status" label="Status" options={statuses.data} value={input.status} onChange={updateField} />
          <SelectField error={errors.priority} field="priority" label="Priority" options={priorities.data} value={input.priority} onChange={updateField} />
          <SelectField error={errors.severity} field="severity" label="Severity" options={severities.data} value={input.severity} onChange={updateField} />
        </div>
        <div className="grid two">
          <div className="field">
            <label htmlFor="bulk-assignee">Assignee</label>
            <select className="select" id="bulk-assignee" value={input.assigned_to} onChange={(event) => updateField("assigned_to", event.target.value)}>
              <option value="">Unassigned</option>
              {fallbackMembers.map((member) => (
                <option key={member.id || member.username} value={member.id}>
                  {displayName(member)}
                </option>
              ))}
            </select>
            <FieldError id="bulk-assignee-error" />
          </div>
          <div className="field">
            <label htmlFor="bulk-tags">Tags</label>
            <input className="input" id="bulk-tags" value={input.tags} onChange={(event) => updateField("tags", event.target.value)} />
            <FieldError id="bulk-tags-error" />
          </div>
        </div>
        <div className="toolbar">
          <button className="button primary" disabled={saving || catalogsLoading || Boolean(catalogError)} type="submit">
            <Layers3 size={16} aria-hidden="true" />
            {saving ? "Creating" : "Create issues"}
          </button>
          <button className="button secondary" disabled={saving} onClick={onClose} type="button">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function CatalogFilter({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: CatalogItem[] | null; value: string }) {
  return (
    <select className="select compact" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Any {label.toLowerCase()}</option>
      {options?.map((option) => (
        <option key={option.id} value={option.key || displayName(option)}>
          {displayName(option)}
        </option>
      ))}
    </select>
  );
}

function SelectField({
  error,
  field,
  label,
  onChange,
  options,
  value
}: {
  error?: string;
  field: string;
  label: string;
  onChange: (field: string, value: string) => void;
  options: CatalogItem[] | null;
  value: string;
}) {
  const id = `bulk-${field}`;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={Boolean(error)}
        className="select"
        id={id}
        value={value}
        onChange={(event) => onChange(field, event.target.value)}
      >
        <option value="">Select {label.toLowerCase()}</option>
        {options?.map((option) => (
          <option key={option.id} value={option.key || ""}>
            {displayName(option)}
          </option>
        ))}
      </select>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return (
    <p className="field-error" id={id} aria-hidden={!message}>
      {message || "\u00a0"}
    </p>
  );
}

function validateBulkInput(input: {
  issue_type: string;
  priority: string;
  rows: string;
  severity: string;
  status: string;
}) {
  const errors: Record<string, string> = {};
  const required = [
    ["rows", "Add at least one issue row."],
    ["issue_type", "Type is required."],
    ["status", "Status is required."],
    ["priority", "Priority is required."],
    ["severity", "Severity is required."]
  ] as const;
  let firstInvalid = "";
  required.forEach(([field, message]) => {
    if (input[field].trim()) return;
    errors[field] = message;
    if (!firstInvalid) firstInvalid = field;
  });
  return { errors, firstInvalid };
}

function focusBulkField(field: string) {
  const id = field === "rows" ? "bulk-rows" : `bulk-${field}`;
  const element = document.getElementById(id);
  if (element instanceof HTMLElement) element.focus();
}

function uniqueMembers(issues: Issue[]) {
  const seen = new Set<string>();
  const members: UserSummary[] = [];
  issues.forEach((issue) => {
    const member = issue.assigned_to;
    const key = member?.id ? `id:${member.id}` : member?.username ? `u:${member.username}` : "";
    if (!member || !key || seen.has(key)) return;
    seen.add(key);
    members.push(member);
  });
  return members;
}

function countActiveFilters(filters: typeof emptyFilters) {
  return [filters.assigned_to, filters.issue_type, filters.priority, filters.severity, filters.status, filters.tag].filter(Boolean).length;
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
