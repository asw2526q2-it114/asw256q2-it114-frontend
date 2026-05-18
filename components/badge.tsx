export function StatusBadge({ value }: { value: unknown }) {
  const label = labelFor(value);
  const tone = toneFor(label);
  return <span className={`badge ${tone}`}>{label}</span>;
}

export function ColorSwatch({ color }: { color?: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 14,
        height: 14,
        borderRadius: 999,
        display: "inline-block",
        background: color || "#c4c9b4",
        border: "1px solid rgb(0 0 0 / 0.12)"
      }}
    />
  );
}

function labelFor(value: unknown) {
  if (!value) return "Unset";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return String(record.name || record.slug || record.value || "Unset");
  }
  return "Unset";
}

function toneFor(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("done") || normalized.includes("closed")) return "success";
  if (normalized.includes("ready") || normalized.includes("new")) return "info";
  if (normalized.includes("critical") || normalized.includes("block")) return "danger";
  if (normalized.includes("high") || normalized.includes("important")) return "warning";
  return "";
}
