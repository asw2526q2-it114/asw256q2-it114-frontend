"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { ArrowLeft, Edit, Plus, Trash2 } from "lucide-react";
import { AuthPending } from "@/components/auth-pending";
import { ErrorPanel } from "@/components/error-panel";
import { LoadingPanel } from "@/components/loading-panel";
import { PageTitle } from "@/components/page-title";
import { useToast } from "@/components/feedback-provider";
import { CatalogItem, catalogApi, displayName, getCatalogResource } from "@/lib/api";
import { useAsyncData } from "@/lib/hooks";

type FieldType = "checkbox" | "color" | "number" | "select" | "text";
type FieldName = "before_after" | "color" | "days" | "is_closed" | "label" | "name";

type FieldConfig = {
  name: FieldName;
  label: string;
  required?: boolean;
  type: FieldType;
  options?: { label: string; value: string }[];
};

type ResourceUiConfig = {
  columns: FieldName[];
  defaults: Record<string, string | boolean>;
  editable: FieldConfig[];
  titleField: FieldName;
};

const colorField: FieldConfig = { name: "color", label: "Color", type: "color" };

const resourceUi: Record<string, ResourceUiConfig> = {
  statuses: {
    columns: ["label", "color", "is_closed"],
    defaults: { label: "", color: "#70728f", is_closed: false },
    editable: [
      { name: "label", label: "Label", required: true, type: "text" },
      colorField,
      { name: "is_closed", label: "Closed status", type: "checkbox" }
    ],
    titleField: "label"
  },
  priorities: colorSettingConfig("Priority"),
  types: colorSettingConfig("Type"),
  severities: colorSettingConfig("Severity"),
  tags: {
    columns: ["label"],
    defaults: { label: "" },
    editable: [{ name: "label", label: "Label", required: true, type: "text" }],
    titleField: "label"
  },
  "due-dates": {
    columns: ["name", "color", "days", "before_after"],
    defaults: { name: "", color: "#a8e440", days: "", before_after: "" },
    editable: [
      { name: "name", label: "Name", required: true, type: "text" },
      colorField,
      { name: "days", label: "Days", type: "number" },
      {
        name: "before_after",
        label: "Direction",
        type: "select",
        options: [
          { label: "Default rule", value: "" },
          { label: "Before deadline", value: "before" },
          { label: "After deadline", value: "after" }
        ]
      }
    ],
    titleField: "name"
  }
};

export function SettingsResourcePage({ resourceKey }: { resourceKey: string }) {
  const toast = useToast();
  const resource = getCatalogResource(resourceKey);
  const ui = resourceUi[resource.key] || resourceUi.statuses;
  const [editing, setEditing] = useState<CatalogItem | "new" | null>(null);
  const [deleting, setDeleting] = useState<CatalogItem | null>(null);
  const { data, error, loading, unauthorized, reload } = useAsyncData(() => catalogApi.list(resource.path), [resource.path]);

  async function remove(item: CatalogItem, replacement: string) {
    try {
      await catalogApi.remove(resource.path, item.id, { replacement });
      toast.success(`${resource.singular} was deleted.`, "Setting deleted");
    } catch (error) {
      toast.error(error, `Unable to delete ${resource.singular.toLowerCase()}.`);
      return;
    }
    setDeleting(null);
    await reload();
  }

  return (
    <main className="page">
      <PageTitle
        eyebrow="Settings"
        title={resource.label}
        description={`Manage IssueHub ${resource.label.toLowerCase()} through the API.`}
        actions={
          <>
            <Link className="button secondary" href="/settings">
              <ArrowLeft size={16} aria-hidden="true" />
              Back to settings
            </Link>
            <button className="button primary" onClick={() => setEditing("new")} type="button">
              <Plus size={16} aria-hidden="true" />
              New {resource.singular.toLowerCase()}
            </button>
          </>
        }
      />
      {unauthorized ? <AuthPending /> : null}
      {loading ? <LoadingPanel label={`Loading ${resource.label.toLowerCase()}`} /> : null}
      {error && !unauthorized ? <ErrorPanel error={error} onRetry={reload} /> : null}
      {data ? (
        <section className="panel table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                {ui.columns.map((column) => (
                  <th key={column}>{columnLabel(column)}</th>
                ))}
                <th>Created</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  {ui.columns.map((column) => (
                    <td key={column}>{renderField(item, column)}</td>
                  ))}
                  <td>{formatDate(item.created_at)}</td>
                  <td>
                    <span className="toolbar">
                      <button className="icon-button ghost" onClick={() => setEditing(item)} title="Edit" type="button">
                        <Edit size={16} aria-hidden="true" />
                      </button>
                      <button className="icon-button danger" onClick={() => setDeleting(item)} title="Delete" type="button">
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.length === 0 ? (
            <div className="empty-state">
              <p>No {resource.label.toLowerCase()} found.</p>
            </div>
          ) : null}
        </section>
      ) : null}
      {editing ? (
        <CatalogEditor
          item={editing === "new" ? null : editing}
          label={resource.singular}
          ui={ui}
          onClose={() => setEditing(null)}
          onSaved={async (input) => {
            if (editing === "new") await catalogApi.create(resource.path, input);
            else await catalogApi.update(resource.path, editing.id, input);
            setEditing(null);
            await reload();
          }}
        />
      ) : null}
      {deleting && data ? (
        <ReplacementDeleteDialog
          item={deleting}
          items={data}
          label={resource.singular}
          ui={ui}
          onClose={() => setDeleting(null)}
          onDelete={(replacement) => remove(deleting, replacement)}
        />
      ) : null}
    </main>
  );
}

function CatalogEditor({
  item,
  label,
  onClose,
  onSaved,
  ui
}: {
  item: CatalogItem | null;
  label: string;
  onClose: () => void;
  onSaved: (input: Partial<CatalogItem>) => Promise<void>;
  ui: ResourceUiConfig;
}) {
  const toast = useToast();
  const initial = useMemo(() => editorState(item, ui), [item, ui]);
  const [input, setInput] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(event: FormEvent) {
    event.preventDefault();
    const validation = validateCatalogInput(input, ui);
    setErrors(validation.errors);
    if (validation.firstInvalid) {
      focusCatalogField(validation.firstInvalid);
      return;
    }

    try {
      await onSaved(cleanCatalogInput(input, ui));
      toast.success(`${label} was saved.`, "Setting saved");
    } catch (error) {
      toast.error(error, `Unable to save ${label.toLowerCase()}.`);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal grid" onSubmit={(event) => void submit(event)} noValidate>
        <div className="page-header">
          <div>
            <p className="eyebrow">{item ? `Edit ${label}` : `New ${label}`}</p>
            <h2>{itemTitle(item, ui) || label}</h2>
          </div>
          <button className="button ghost" onClick={onClose} type="button">
            Close
          </button>
        </div>
        {ui.editable.map((field) => (
          <CatalogField
            field={field}
            key={field.name}
            value={input[field.name]}
            error={errors[field.name]}
            onChange={(value) => {
              setInput((current) => ({ ...current, [field.name]: value }));
              setErrors((current) => ({ ...current, [field.name]: "" }));
            }}
          />
        ))}
        <div className="toolbar">
          <button className="button primary" type="submit">
            Save {label.toLowerCase()}
          </button>
          <button className="button secondary" onClick={onClose} type="button">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function CatalogField({
  error,
  field,
  onChange,
  value
}: {
  error?: string;
  field: FieldConfig;
  onChange: (value: string | boolean) => void;
  value: string | boolean;
}) {
  const id = `catalog-${field.name}`;
  if (field.type === "checkbox") {
    return (
      <label className="checkbox-row" htmlFor={id}>
        <input id={id} checked={Boolean(value)} type="checkbox" onChange={(event) => onChange(event.target.checked)} />
        {field.label}
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <div className="field">
        <label htmlFor={id}>{field.label}</label>
        <select
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={Boolean(error)}
          className="select"
          id={id}
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
        >
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <FieldError id={`${id}-error`} message={error} />
      </div>
    );
  }

  return (
    <div className="field">
      <label htmlFor={id}>{field.label}</label>
      <input
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={Boolean(error)}
        className="input"
        id={id}
        min={field.type === "number" ? 0 : undefined}
        type={field.type}
        value={String(value)}
        onChange={(event) => onChange(event.target.value)}
      />
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p className="field-error" id={id}>
      {message}
    </p>
  ) : null;
}

function ReplacementDeleteDialog({
  item,
  items,
  label,
  onClose,
  onDelete,
  ui
}: {
  item: CatalogItem;
  items: CatalogItem[];
  label: string;
  onClose: () => void;
  onDelete: (replacement: string) => Promise<void>;
  ui: ResourceUiConfig;
}) {
  const replacements = items.filter((candidate) => candidate.id !== item.id);
  const [replacement, setReplacement] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="modal-backdrop" role="presentation">
      <form
        className="modal grid"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!replacement) {
            setError("Choose a replacement before deleting this item.");
            focusCatalogField("replacement");
            return;
          }
          setDeleting(true);
          void onDelete(replacement).finally(() => setDeleting(false));
        }}
      >
        <div>
          <p className="eyebrow">Delete {label}</p>
          <h2>{itemTitle(item, ui)}</h2>
          <p className="muted">Choose the remaining {label.toLowerCase()} that affected issues should use.</p>
        </div>
        <div className="field">
          <label htmlFor="replacement">Replacement</label>
          <select
            aria-describedby={error ? "replacement-error" : undefined}
            aria-invalid={Boolean(error)}
            className="select"
            id="replacement"
            value={replacement}
            onChange={(event) => {
              setReplacement(event.target.value);
              setError("");
            }}
          >
            <option value="">Choose replacement</option>
            {replacements.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {displayName(candidate)}
              </option>
            ))}
          </select>
          <FieldError id="replacement-error" message={error} />
        </div>
        <div className="toolbar">
          <button className="button danger" disabled={deleting} type="submit">
            <Trash2 size={16} aria-hidden="true" />
            {deleting ? "Deleting" : "Delete"}
          </button>
          <button className="button secondary" disabled={deleting} onClick={onClose} type="button">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function colorSettingConfig(label: string): ResourceUiConfig {
  return {
    columns: ["label", "color"],
    defaults: { label: "", color: "#70728f" },
    editable: [
      { name: "label", label, required: true, type: "text" },
      colorField
    ],
    titleField: "label"
  };
}

function validateCatalogInput(input: Record<string, string | boolean>, ui: ResourceUiConfig) {
  const errors: Record<string, string> = {};
  let firstInvalid = "";
  ui.editable.forEach((field) => {
    if (!field.required) return;
    if (String(input[field.name] || "").trim()) return;
    errors[field.name] = `${field.label} is required.`;
    if (!firstInvalid) firstInvalid = field.name;
  });
  return { errors, firstInvalid };
}

function focusCatalogField(field: string) {
  const element = document.getElementById(field === "replacement" ? "replacement" : `catalog-${field}`);
  if (element instanceof HTMLElement) element.focus();
}

function editorState(item: CatalogItem | null, ui: ResourceUiConfig) {
  const state = { ...ui.defaults };
  if (!item) return state;
  ui.editable.forEach((field) => {
    const value = item[field.name];
    if (field.type === "checkbox") state[field.name] = Boolean(value);
    else state[field.name] = value === null || value === undefined ? "" : String(value);
  });
  return state;
}

function cleanCatalogInput(input: Record<string, string | boolean>, ui: ResourceUiConfig): Partial<CatalogItem> {
  const output: Record<string, unknown> = {};
  ui.editable.forEach((field) => {
    const value = input[field.name];
    if (field.type === "checkbox") {
      output[field.name] = Boolean(value);
      return;
    }

    const text = String(value).trim();
    if (field.required) {
      output[field.name] = text;
      return;
    }
    if (field.name === "days") {
      output.days = text ? Number(text) : null;
      return;
    }
    if (field.name === "before_after") {
      output.before_after = text as CatalogItem["before_after"];
      return;
    }
    if (text) output[field.name] = text;
  });
  return output as Partial<CatalogItem>;
}

function itemTitle(item: CatalogItem | null, ui: ResourceUiConfig) {
  if (!item) return "";
  return String(item[ui.titleField] || item.label || item.name || item.key || item.id || "");
}

function renderField(item: CatalogItem, field: FieldName) {
  if (field === "color") return <ColorValue color={item.color} />;
  if (field === "is_closed") return item.is_closed ? "Yes" : "No";
  if (field === "days") return item.days === null || item.days === undefined ? "Default" : item.days;
  if (field === "before_after") return directionLabel(item.before_after);
  return String(item[field] || "Not set");
}

function ColorValue({ color }: { color?: string }) {
  if (!color) return "Not set";
  return (
    <span className="color-value">
      <span className="color-swatch" style={{ backgroundColor: color }} />
      {color}
    </span>
  );
}

function columnLabel(column: FieldName) {
  const labels: Record<FieldName, string> = {
    before_after: "Direction",
    color: "Color",
    days: "Days",
    is_closed: "Closed",
    label: "Label",
    name: "Name"
  };
  return labels[column];
}

function directionLabel(value?: CatalogItem["before_after"]) {
  if (value === "before") return "Before deadline";
  if (value === "after") return "After deadline";
  return "Default";
}

function formatDate(value?: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
