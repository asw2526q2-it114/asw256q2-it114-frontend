import { Github } from "lucide-react";

export function AuthStatusPill() {
  return (
    <span className="badge warning" title="GitHub OAuth is pending backend support">
      <Github size={14} aria-hidden="true" />
      Auth pending
    </span>
  );
}
