export function LoadingPanel({ label = "Loading" }: { label?: string }) {
  return (
    <div className="empty-state panel">
      <div>
        <h3>{label}</h3>
        <p className="muted">Fetching the latest data from IssueHub.</p>
      </div>
    </div>
  );
}
