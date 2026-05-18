export function StatusBadge({ value }: { value: unknown }) {
  const label = labelFor(value);
  const color = colorFor(value);
  const tone = toneFor(label);
  return (
    <span
      className={`badge ${tone}`}
      style={color ? { borderColor: color, color } : undefined}
      title={color || label}
    >
      {label}
    </span>
  );
}

function labelFor(value: unknown) {
  if (!value) return "Unset";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return String(record.label || record.name || record.display_name || record.key || record.slug || record.value || "Unset");
  }
  return "Unset";
}

function colorFor(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const color = (value as Record<string, unknown>).color;
  return typeof color === "string" ? color : "";
}

function toneFor(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("done") || normalized.includes("closed")) return "success";
  if (normalized.includes("ready") || normalized.includes("new")) return "info";
  if (normalized.includes("critical") || normalized.includes("block")) return "danger";
  if (normalized.includes("high") || normalized.includes("important")) return "warning";
  return "";
}
