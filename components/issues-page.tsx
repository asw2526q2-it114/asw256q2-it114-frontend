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
import { TagMultiSelect } from "@/components/tag-multi-select";
import { CustomSelect } from "@/components/custom-select";
import { UserAvatar } from "@/components/user-avatar";
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
import { useAssigneeAvatarMap, useAsyncData } from "@/lib/hooks";

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
  const dueDates = useAsyncData(() => catalogApi.list("/due-dates/"), []);
  const memberOptions = useMemo(() => uniqueMembers(data || []), [data]);
  const assigneeAvatarMap = useAssigneeAvatarMap(data);
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

  const catalogsLoading = statuses.loading || priorities.loading || types.loading || severities.loading || tags.loading || dueDates.loading;
  const catalogError = statuses.error || priorities.error || types.error || severities.error || tags.error || dueDates.error;

  async function reloadCatalogs() {
    await Promise.all([statuses.reload(), priorities.reload(), types.reload(), severities.reload(), tags.reload(), dueDates.reload()]);
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
              <CustomSelect
                value={filters.assigned_to}
                onChange={(value) => setFilters((current) => ({ ...current, assigned_to: value }))}
                options={[
                  { value: "", label: "Any assignee" },
                  ...memberOptions.map((member) => ({
                    value: String(member.id || ""),
                    label: displayName(member)
                  }))
                ]}
                compact
              />
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
                <SortableHeader activeSort={filters.sort} className="left-align" column="pk" dir={filters.dir} label="Issue" onSort={sortBy} />
                <SortableHeader activeSort={filters.sort} column="status" dir={filters.dir} label="Status" onSort={sortBy} />
                <SortableHeader activeSort={filters.sort} column="assigned_to" dir={filters.dir} label="Assignee" onSort={sortBy} />
                <th>Deadline</th>
                <th>Tags</th>
                <SortableHeader activeSort={filters.sort} column="created_at" dir={filters.dir} label="Created" onSort={sortBy} />
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {data.map((issue) => {
                const ownIssue = isCurrentUser(issue.creator);
                const assignee = issue.assigned_to;
                const assigneeProfile = assignee?.username ? assigneeAvatarMap[assignee.username] : undefined;
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
                    <td className="left-align">
                      <Link href={`/issues/${issue.id}`}>
                        <strong>#{issueNumber(issue)}</strong> {issue.subject}
                      </Link>
                    </td>
                    <td>
                      <StatusBadge value={catalogBadge(issue.status_label, issue.status_color, issue.status)} />
                    </td>
                    <td className="user-avatar-cell">
                      {assignee ? (
                        assignee.username ? (
                          <Link
                            aria-label={`Open ${displayName(assigneeProfile?.display_name || assignee)} profile`}
                            href={`/profile/${assignee.username}`}
                            title={displayName(assigneeProfile?.display_name || assignee)}
                          >
                            <UserAvatar
                              avatarUrl={assigneeProfile?.avatar_url}
                              initials={assigneeProfile?.initials}
                              size="table"
                              user={{
                                ...assignee,
                                display_name: assigneeProfile?.display_name || assignee.display_name
                              }}
                            />
                          </Link>
                        ) : (
                          <UserAvatar
                            avatarUrl={assigneeProfile?.avatar_url}
                            initials={assigneeProfile?.initials}
                            size="table"
                            user={{
                              ...assignee,
                              display_name: assigneeProfile?.display_name || assignee.display_name
                            }}
                          />
                        )
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </td>
                    <td>
                      <DeadlineBadge deadline={issue.deadline} dueDates={dueDates.data} />
                    </td>
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
                      ) : null}
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

function DeadlineBadge({ deadline, dueDates }: { deadline?: string | null; dueDates: CatalogItem[] | null }) {
  if (!deadline) return <span className="muted">-</span>;

  const label = formatDateOnly(deadline);
  const rule = matchingDueDateRule(deadline, dueDates || []);
  const color = typeof rule?.color === "string" ? rule.color : "";

  return (
    <span className="badge" style={color ? { borderColor: color, color } : undefined} title={rule ? `${displayName(rule)}: ${label}` : label}>
      {label}
    </span>
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
  const tags = useAsyncData(() => catalogApi.list("/tags/"), []);
  const [input, setInput] = useState({
    assigned_to: "",
    issue_type: "",
    priority: "",
    rows: "",
    severity: "",
    status: "",
    tags: [] as string[]
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const catalogsLoading = statuses.loading || priorities.loading || types.loading || severities.loading || tags.loading;
  const catalogError = statuses.error || priorities.error || types.error || severities.error || tags.error;

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
        tags: input.tags
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

  function updateTags(value: string[]) {
    setInput((current) => ({ ...current, tags: value }));
    setErrors((current) => ({ ...current, tags: "" }));
  }

  async function reloadCatalogs() {
    await Promise.all([statuses.reload(), priorities.reload(), types.reload(), severities.reload(), tags.reload()]);
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
            <CustomSelect
              id="bulk-assignee"
              value={input.assigned_to}
              onChange={(value) => updateField("assigned_to", value)}
              options={[
                { value: "", label: "Unassigned" },
                ...fallbackMembers.map((member) => ({
                  value: String(member.id || ""),
                  label: displayName(member)
                }))
              ]}
            />
            <FieldError id="bulk-assignee-error" />
          </div>
          <TagMultiSelect disabled={catalogsLoading || Boolean(catalogError)} id="bulk-tags" label="Tags" options={tags.data} value={input.tags} onChange={updateTags} />
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
  const customOptions = useMemo(() => {
    const mapped = (options || []).map((option) => ({
      value: option.key || displayName(option),
      label: displayName(option),
      color: option.color
    }));
    return [
      { value: "", label: `Any ${label.toLowerCase()}` },
      ...mapped
    ];
  }, [options, label]);

  return (
    <CustomSelect
      value={value}
      onChange={onChange}
      options={customOptions}
      compact
    />
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
  const customOptions = useMemo(() => {
    const mapped = (options || []).map((option) => ({
      value: option.key || "",
      label: displayName(option),
      color: option.color
    }));
    return [
      { value: "", label: `Select ${label.toLowerCase()}` },
      ...mapped
    ];
  }, [options, label]);

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <CustomSelect
        id={id}
        value={value}
        onChange={(val) => onChange(field, val)}
        options={customOptions}
        ariaDescribedBy={error ? `${id}-error` : undefined}
        ariaInvalid={Boolean(error)}
      />
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

const dayMs = 24 * 60 * 60 * 1000;

function matchingDueDateRule(deadline: string, dueDates: CatalogItem[]) {
  const deadlineDate = localDate(deadline);
  if (!deadlineDate) return null;

  const today = localDate(new Date());
  if (!today) return null;
  const dayDifference = daysBetween(today, deadlineDate);

  if (dayDifference >= 0) {
    const beforeRules = dueDates
      .filter((rule) => rule.before_after === "before" && numericDays(rule) !== null && dayDifference <= Number(rule.days))
      .sort((left, right) => Number(left.days) - Number(right.days));
    if (beforeRules[0]) return beforeRules[0];
  } else {
    const daysOverdue = Math.abs(dayDifference);
    const afterRules = dueDates
      .filter((rule) => rule.before_after === "after" && numericDays(rule) !== null && daysOverdue >= Number(rule.days))
      .sort((left, right) => Number(right.days) - Number(left.days));
    if (afterRules[0]) return afterRules[0];
  }

  return dueDates.find((rule) => !rule.before_after) || null;
}

function numericDays(rule: CatalogItem) {
  if (rule.days === null || rule.days === undefined) return null;
  const days = Number(rule.days);
  return Number.isFinite(days) ? days : null;
}

function formatDate(value?: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatDateOnly(value?: string | null) {
  const date = localDate(value);
  if (!date) return "Not set";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
}

function localDate(value?: Date | string | null) {
  if (!value) return null;
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate());

  const text = String(value);
  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnly) return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(left: Date, right: Date) {
  const leftTime = Date.UTC(left.getFullYear(), left.getMonth(), left.getDate());
  const rightTime = Date.UTC(right.getFullYear(), right.getMonth(), right.getDate());
  return Math.round((rightTime - leftTime) / dayMs);
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}
