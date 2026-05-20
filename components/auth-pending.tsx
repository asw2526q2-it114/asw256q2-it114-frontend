import Link from "next/link";
import { LogIn } from "lucide-react";

export function AuthPending({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "panel" : "empty-state panel"}>
      <div>
        <LogIn size={compact ? 18 : 28} aria-hidden="true" />
        <h3>Sign in required</h3>
        <p className="muted">
          Protected API actions need your IssueHub API key. Sign in to authorize requests from this browser.
        </p>
        {!compact ? (
          <Link className="button secondary" href="/login">
            Sign in
          </Link>
        ) : null}
      </div>
    </div>
  );
}
