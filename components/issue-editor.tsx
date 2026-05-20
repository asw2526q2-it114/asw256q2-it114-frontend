"use client";

import { FormEvent, useState } from "react";
import { CatalogItem, Issue, IssueInput, UserSummary, catalogApi, displayName, issueApi, issueNumber, issueTags } from "@/lib/api";
import { useAsyncData } from "@/lib/hooks";
import { ErrorPanel } from "@/components/error-panel";
import { useToast } from "@/components/feedback-provider";
import { LoadingPanel } from "@/components/loading-panel";

type IssueEditorInput = {
  assigned_to: string;
  deadline: string;
  description: string;
  issue_type: string;
  priority: string;
  severity: string;
  status: string;
  subject: string;
  tags: string;
};

type IssueEditorErrors = Partial<Record<keyof IssueEditorInput, string>>;

export function IssueEditor({
  fallbackMembers,
  issue,
  onClose,
  onSaved
}: {
  fallbackMembers: UserSummary[];
  issue: Issue | null;
  onClose: () => void;
  onSaved: (result?: { changed: boolean }) => Promise<void>;
}) {
  const toast = useToast();
  const statuses = useAsyncData(() => catalogApi.list("/statuses/"), []);
  const priorities = useAsyncData(() => catalogApi.list("/priorities/"), []);
  const types = useAsyncData(() => catalogApi.list("/types/"), []);
  const severities = useAsyncData(() => catalogApi.list("/severities/"), []);
  const members = useAsyncData(() => (issue ? issueApi.assignableMembers(issue.id) : Promise.resolve(fallbackMembers)), [issue?.id, fallbackMembers]);
  const [input, setInput] = useState<IssueEditorInput>({
    assigned_to: issue?.assigned_to?.id ? String(issue.assigned_to.id) : "",
    deadline: issue?.deadline ? String(issue.deadline).slice(0, 10) : "",
    description: issue?.description || "",
    issue_type: issue?.issue_type || "",
    priority: issue?.priority || "",
    severity: issue?.severity || "",
    status: issue?.status || "",
    subject: issue?.subject || "",
    tags: issueTags(issue?.tags)
  });
  const [errors, setErrors] = useState<IssueEditorErrors>({});
  const [saving, setSaving] = useState(false);
  const catalogsLoading = statuses.loading || priorities.loading || types.loading || severities.loading || members.loading;
  const catalogError = statuses.error || priorities.error || types.error || severities.error || members.error;

  async function reloadCatalogs() {
    await Promise.all([statuses.reload(), priorities.reload(), types.reload(), severities.reload(), members.reload()]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const validation = validateIssueInput(input);
    setErrors(validation.errors);
    if (validation.firstInvalid) {
      focusField(validation.firstInvalid);
      return;
    }

    setSaving(true);
    try {
      const payload = cleanIssueInput(input);
      const changed = issue ? hasIssueInputChanged(issue, input) : true;
      if (issue) await issueApi.update(issue.id, payload);
      else await issueApi.create(payload);
      await onSaved({ changed });
      toast.success(issue ? `Issue #${issueNumber(issue)} was saved.` : "Issue was created.", issue ? "Issue saved" : "Issue created");
    } catch (error) {
      toast.error(error, issue ? "Unable to save issue." : "Unable to create issue.");
    } finally {
      setSaving(false);
    }
  }

  function updateField(field: keyof IssueEditorInput, value: string) {
    setInput((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal grid" onSubmit={(event) => void submit(event)} noValidate>
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
          <label htmlFor="issue-editor-subject">Subject</label>
          <input
            aria-describedby={errors.subject ? "issue-editor-subject-error" : undefined}
            aria-invalid={Boolean(errors.subject)}
            className="input"
            id="issue-editor-subject"
            value={input.subject}
            onChange={(event) => updateField("subject", event.target.value)}
          />
          <FieldError id="issue-editor-subject-error" message={errors.subject} />
        </div>
        <div className="field">
          <label htmlFor="issue-editor-description">Description</label>
          <textarea className="textarea" id="issue-editor-description" value={input.description} onChange={(event) => updateField("description", event.target.value)} />
        </div>
        {catalogsLoading ? <LoadingPanel label="Loading issue fields" /> : null}
        {catalogError ? <ErrorPanel error={catalogError} onRetry={() => void reloadCatalogs()} /> : null}
        <div className="grid three">
          <SelectField error={errors.issue_type} field="issue_type" label="Type" options={types.data} value={input.issue_type} onChange={updateField} />
          <SelectField error={errors.status} field="status" label="Status" options={statuses.data} value={input.status} onChange={updateField} />
          <SelectField error={errors.priority} field="priority" label="Priority" options={priorities.data} value={input.priority} onChange={updateField} />
        </div>
        <div className="grid three">
          <SelectField error={errors.severity} field="severity" label="Severity" options={severities.data} value={input.severity} onChange={updateField} />
          <div className="field">
            <label htmlFor="issue-editor-assignee">Assignee</label>
            <select className="select" id="issue-editor-assignee" value={input.assigned_to} onChange={(event) => updateField("assigned_to", event.target.value)}>
              <option value="">Unassigned</option>
              {members.data?.map((member) => (
                <option key={member.id || member.username} value={member.id}>
                  {displayName(member)}
                </option>
              ))}
            </select>
            <FieldError id="issue-editor-assignee-error" />
          </div>
          <div className="field">
            <label htmlFor="issue-editor-deadline">Deadline</label>
            <input className="input" id="issue-editor-deadline" type="date" value={input.deadline} onChange={(event) => updateField("deadline", event.target.value)} />
            <FieldError id="issue-editor-deadline-error" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="issue-editor-tags">Tags</label>
          <input className="input" id="issue-editor-tags" placeholder="Comma-separated tags" value={input.tags} onChange={(event) => updateField("tags", event.target.value)} />
          <FieldError id="issue-editor-tags-error" />
        </div>
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
  error,
  field,
  label,
  onChange,
  options,
  value
}: {
  error?: string;
  field: keyof IssueEditorInput;
  label: string;
  onChange: (field: keyof IssueEditorInput, value: string) => void;
  options: CatalogItem[] | null;
  value: string;
}) {
  const id = `issue-editor-${field}`;
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

function validateIssueInput(input: IssueEditorInput) {
  const errors: IssueEditorErrors = {};
  const required: Array<[keyof IssueEditorInput, string]> = [
    ["subject", "Subject is required."],
    ["issue_type", "Type is required."],
    ["status", "Status is required."],
    ["priority", "Priority is required."],
    ["severity", "Severity is required."]
  ];
  const firstInvalid = required.find(([field, message]) => {
    if (input[field].trim()) return false;
    errors[field] = message;
    return true;
  })?.[0] || null;

  required.slice(firstInvalid ? required.findIndex(([field]) => field === firstInvalid) + 1 : 0).forEach(([field, message]) => {
    if (!input[field].trim()) errors[field] = message;
  });

  return { errors, firstInvalid };
}

function focusField(field: keyof IssueEditorInput) {
  const element = document.getElementById(`issue-editor-${field}`);
  if (element instanceof HTMLElement) element.focus();
}

function cleanIssueInput(input: IssueEditorInput): IssueInput {
  return {
    subject: input.subject.trim(),
    description: input.description,
    issue_type: input.issue_type,
    status: input.status,
    priority: input.priority,
    severity: input.severity,
    assigned_to: input.assigned_to ? Number(input.assigned_to) : null,
    deadline: input.deadline || null,
    tags: input.tags.trim()
  };
}

function hasIssueInputChanged(issue: Issue, input: IssueEditorInput) {
  const payload = cleanIssueInput(input);
  const initialAssignedTo = issue.assigned_to?.id ?? null;
  const initialDeadline = issue.deadline ? String(issue.deadline).slice(0, 10) : null;

  return (
    payload.subject !== issue.subject ||
    payload.description !== (issue.description || "") ||
    payload.issue_type !== (issue.issue_type || "") ||
    payload.status !== (issue.status || "") ||
    payload.priority !== (issue.priority || "") ||
    payload.severity !== (issue.severity || "") ||
    payload.assigned_to !== initialAssignedTo ||
    payload.deadline !== initialDeadline ||
    payload.tags !== issueTags(issue.tags)
  );
}
