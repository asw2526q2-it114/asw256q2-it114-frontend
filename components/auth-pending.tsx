import Link from "next/link";
import { Github } from "lucide-react";

export function AuthPending({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "panel" : "empty-state panel"}>
      <div>
        <Github size={compact ? 18 : 28} aria-hidden="true" />
        <h3>GitHub OAuth pending</h3>
        <p className="muted">
          The backend contract does not expose OAuth yet. Protected API actions are wired but paused until
          authenticated headers are available.
        </p>
        {!compact ? (
          <Link className="button secondary" href="/auth">
            View auth status
          </Link>
        ) : null}
      </div>
    </div>
  );
}
