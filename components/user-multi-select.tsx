"use client";

import { Check, ChevronDown, X } from "lucide-react";
import { UserSummary, displayName } from "@/lib/api";

type UserOption = {
  label: string;
  value: string;
};

export function UserMultiSelect({
  disabled,
  emptyText = "No available members",
  id,
  label,
  labelHidden = false,
  onChange,
  options,
  showSelectedList = true,
  value
}: {
  disabled?: boolean;
  emptyText?: string;
  id: string;
  label: string;
  labelHidden?: boolean;
  onChange: (value: string[]) => void;
  options: UserSummary[];
  showSelectedList?: boolean;
  value: string[];
}) {
  const selected = new Set(value);
  const userOptions = normalizeUserOptions(options);
  const selectedUsers = value.map((userId) => ({
    label: userOptions.find((option) => option.value === userId)?.label || userId,
    value: userId
  }));
  const unavailable = disabled || userOptions.length === 0;

  function toggleUser(userId: string) {
    if (selected.has(userId)) onChange(value.filter((item) => item !== userId));
    else onChange([...value, userId]);
  }

  function removeUser(userId: string) {
    onChange(value.filter((item) => item !== userId));
  }

  return (
    <div className="field">
      <span className={labelHidden ? "visually-hidden" : "label"} id={`${id}-label`}>
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
          <span>{selectedUsers.length ? `${selectedUsers.length} selected` : userOptions.length ? "Select watchers" : emptyText}</span>
          <ChevronDown size={16} aria-hidden="true" />
        </summary>
        <div className="multi-select-menu" role="group" aria-labelledby={`${id}-label`}>
          {userOptions.map((option) => {
            const checked = selected.has(option.value);
            return (
              <label className="multi-select-option" key={option.value}>
                <input checked={checked} type="checkbox" onChange={() => toggleUser(option.value)} />
                <span>{option.label}</span>
                {checked ? <Check size={16} aria-hidden="true" /> : null}
              </label>
            );
          })}
        </div>
      </details>
      {showSelectedList ? (
        <div className="selected-tag-list" aria-live="polite">
          {selectedUsers.length ? (
            selectedUsers.map((user) => (
              <span className="selected-tag-chip" key={user.value}>
                {user.label}
                <button aria-label={`Remove ${user.label}`} onClick={() => removeUser(user.value)} type="button">
                  <X size={12} aria-hidden="true" />
                </button>
              </span>
            ))
          ) : (
            <span className="muted">No watchers selected</span>
          )}
        </div>
      ) : null}
    </div>
  );
}

function normalizeUserOptions(options: UserSummary[]) {
  const seen = new Set<string>();
  const normalized: UserOption[] = [];

  options.forEach((option) => {
    const value = option.id ? String(option.id) : option.username || "";
    if (!value || seen.has(value)) return;
    seen.add(value);
    normalized.push({ label: displayName(option), value });
  });

  return normalized;
}
