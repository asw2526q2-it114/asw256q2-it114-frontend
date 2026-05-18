import { ApiError } from "@/lib/api";

export function ErrorPanel({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof ApiError ? error.message : "Something went wrong while loading this view.";
  return (
    <div className="empty-state panel">
      <div>
        <h3>Unable to load data</h3>
        <p className="muted">{message}</p>
        {onRetry ? (
          <button className="button secondary" onClick={onRetry} type="button">
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}
