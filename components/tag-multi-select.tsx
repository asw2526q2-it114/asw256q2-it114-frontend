"use client";

import { Check, ChevronDown, X } from "lucide-react";
import { CatalogItem, displayName } from "@/lib/api";

type TagOption = {
  label: string;
  value: string;
};

export function TagMultiSelect({
  disabled,
  emptyText = "No existing tags",
  id,
  label,
  onChange,
  options,
  value
}: {
  disabled?: boolean;
  emptyText?: string;
  id: string;
  label: string;
  onChange: (value: string[]) => void;
  options: CatalogItem[] | null;
  value: string[];
}) {
  const selected = new Set(value);
  const tagOptions = normalizeTagOptions(options);
  const selectedTags = value.map((tag) => ({
    label: tagOptions.find((option) => option.value === tag)?.label || tag,
    value: tag
  }));
  const unavailable = disabled || tagOptions.length === 0;

  function toggleTag(tag: string) {
    if (selected.has(tag)) onChange(value.filter((item) => item !== tag));
    else onChange([...value, tag]);
  }

  function removeTag(tag: string) {
    onChange(value.filter((item) => item !== tag));
  }

  return (
    <div className="field">
      <span className="label" id={`${id}-label`}>
        {label}
      </span>
      <details className="multi-select">
        <summary
          aria-disabled={unavailable}
          aria-labelledby={`${id}-label ${id}-summary`}
          className={`multi-select-trigger ${unavailable ? "disabled" : ""}`}
          id={`${id}-summary`}
          onClick={(event) => {
            if (unavailable) event.preventDefault();
          }}
        >
          <span>{selectedTags.length ? `${selectedTags.length} selected` : tagOptions.length ? "Select tags" : emptyText}</span>
          <ChevronDown size={16} aria-hidden="true" />
        </summary>
        <div className="multi-select-menu" role="group" aria-labelledby={`${id}-label`}>
          {tagOptions.map((option) => {
            const checked = selected.has(option.value);
            return (
              <label className="multi-select-option" key={option.value}>
                <input checked={checked} type="checkbox" onChange={() => toggleTag(option.value)} />
                <span>{option.label}</span>
                {checked ? <Check size={16} aria-hidden="true" /> : null}
              </label>
            );
          })}
        </div>
      </details>
      <div className="selected-tag-list" aria-live="polite">
        {selectedTags.length ? (
          selectedTags.map((tag) => (
            <span className="selected-tag-chip" key={tag.value}>
              {tag.label}
              <button aria-label={`Remove ${tag.label}`} onClick={() => removeTag(tag.value)} type="button">
                <X size={12} aria-hidden="true" />
              </button>
            </span>
          ))
        ) : (
          <span className="muted">No tags selected</span>
        )}
      </div>
    </div>
  );
}

function normalizeTagOptions(options: CatalogItem[] | null): TagOption[] {
  const seen = new Set<string>();
  const normalized: TagOption[] = [];

  options?.forEach((option) => {
    const value = option.key || displayName(option);
    if (!value || seen.has(value)) return;
    seen.add(value);
    normalized.push({ label: displayName(option), value });
  });

  return normalized;
}
