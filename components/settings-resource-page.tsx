"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Edit, Plus, Trash2 } from "lucide-react";
import { AuthPending } from "@/components/auth-pending";
import { ColorSwatch } from "@/components/badge";
import { ErrorPanel } from "@/components/error-panel";
import { LoadingPanel } from "@/components/loading-panel";
import { PageTitle } from "@/components/page-title";
import { CatalogItem, catalogApi, getCatalogResource } from "@/lib/api";
import { useAsyncData } from "@/lib/hooks";

export function SettingsResourcePage({ resourceKey }: { resourceKey: string }) {
  const resource = getCatalogResource(resourceKey);
  const [editing, setEditing] = useState<CatalogItem | "new" | null>(null);
  const { data, error, loading, unauthorized, reload } = useAsyncData(() => catalogApi.list(resource.path), [resource.path]);

  async function remove(item: CatalogItem) {
    if (!confirm(`Delete ${resource.singular.toLowerCase()} "${item.name}"?`)) return;
    await catalogApi.remove(resource.path, item.id);
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
              Settings hub
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
                <th>Name</th>
                <th>Slug</th>
                <th>Color</th>
                <th>Order</th>
                <th>Flags</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                  </td>
                  <td>{item.slug || "—"}</td>
                  <td>
                    <span className="toolbar">
                      <ColorSwatch color={item.color} />
                      {item.color || "Not set"}
                    </span>
                  </td>
                  <td>{item.order ?? "—"}</td>
                  <td>
                    <span className="toolbar">
                      {item.is_closed ? <span className="badge success">Closed</span> : null}
                      {item.by_default ? <span className="badge info">Default</span> : null}
                      {typeof item.days_to_due === "number" ? <span className="badge">{item.days_to_due} days</span> : null}
                    </span>
                  </td>
                  <td>
                    <span className="toolbar">
                      <button className="icon-button ghost" onClick={() => setEditing(item)} title="Edit" type="button">
                        <Edit size={16} aria-hidden="true" />
                      </button>
                      <button className="icon-button danger" onClick={() => void remove(item)} title="Delete" type="button">
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
      {editing ? (
        <CatalogEditor
          item={editing === "new" ? null : editing}
          label={resource.singular}
          onClose={() => setEditing(null)}
          onSaved={async (input) => {
            if (editing === "new") await catalogApi.create(resource.path, input);
            else await catalogApi.update(resource.path, editing.id, input);
            setEditing(null);
            await reload();
          }}
        />
      ) : null}
    </main>
  );
}

function CatalogEditor({
  item,
  label,
  onClose,
  onSaved
}: {
  item: CatalogItem | null;
  label: string;
  onClose: () => void;
  onSaved: (input: Partial<CatalogItem>) => Promise<void>;
}) {
  const [input, setInput] = useState<Partial<CatalogItem>>({
    name: item?.name || "",
    slug: item?.slug || "",
    color: item?.color || "#70728F",
    order: item?.order,
    is_closed: item?.is_closed || false,
    by_default: item?.by_default || false,
    days_to_due: item?.days_to_due ?? undefined
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSaved(input);
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal grid" onSubmit={(event) => void submit(event)}>
        <div className="page-header">
          <div>
            <p className="eyebrow">{item ? `Edit ${label}` : `New ${label}`}</p>
            <h2>{item?.name || label}</h2>
          </div>
          <button className="button ghost" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <div className="grid two">
          <div className="field">
            <label htmlFor="catalog-name">Name</label>
            <input
              className="input"
              id="catalog-name"
              required
              value={input.name || ""}
              onChange={(event) => setInput((current) => ({ ...current, name: event.target.value }))}
            />
          </div>
          <div className="field">
            <label htmlFor="catalog-slug">Slug</label>
            <input
              className="input"
              id="catalog-slug"
              value={input.slug || ""}
              onChange={(event) => setInput((current) => ({ ...current, slug: event.target.value }))}
            />
          </div>
          <div className="field">
            <label htmlFor="catalog-color">Color</label>
            <input
              className="input"
              id="catalog-color"
              type="color"
              value={input.color || "#70728F"}
              onChange={(event) => setInput((current) => ({ ...current, color: event.target.value }))}
            />
          </div>
          <div className="field">
            <label htmlFor="catalog-order">Order</label>
            <input
              className="input"
              id="catalog-order"
              type="number"
              value={input.order ?? ""}
              onChange={(event) =>
                setInput((current) => ({ ...current, order: event.target.value ? Number(event.target.value) : undefined }))
              }
            />
          </div>
          <div className="field">
            <label htmlFor="catalog-days">Days to due</label>
            <input
              className="input"
              id="catalog-days"
              type="number"
              value={input.days_to_due ?? ""}
              onChange={(event) =>
                setInput((current) => ({
                  ...current,
                  days_to_due: event.target.value ? Number(event.target.value) : undefined
                }))
              }
            />
          </div>
        </div>
        <label className="toolbar">
          <input
            checked={Boolean(input.is_closed)}
            type="checkbox"
            onChange={(event) => setInput((current) => ({ ...current, is_closed: event.target.checked }))}
          />
          Closed state
        </label>
        <label className="toolbar">
          <input
            checked={Boolean(input.by_default)}
            type="checkbox"
            onChange={(event) => setInput((current) => ({ ...current, by_default: event.target.checked }))}
          />
          Default value
        </label>
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
