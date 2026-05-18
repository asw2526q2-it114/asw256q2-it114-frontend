"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CircleUserRound, LogIn, LogOut } from "lucide-react";
import { clearAuthSession, getStoredSession, subscribeToAuthChanges, type AuthSession } from "@/lib/auth";

export function AuthStatusPill() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    const refreshSession = () => setSession(getStoredSession());
    refreshSession();
    return subscribeToAuthChanges(refreshSession);
  }, []);

  if (!session) {
    return (
      <Link className="badge warning auth-link" href="/login" title="Sign in with your IssueHub account">
        <LogIn size={14} aria-hidden="true" />
        Sign in
      </Link>
    );
  }

  const name = session.user.display_name || session.user.username;

  return (
    <span className="auth-status">
      <span className="badge success" title={`Signed in as ${name}`}>
        <CircleUserRound size={14} aria-hidden="true" />
        {name}
      </span>
      <button
        className="icon-button secondary auth-signout"
        onClick={() => {
          clearAuthSession();
          router.push("/login");
        }}
        title="Sign out"
        type="button"
      >
        <LogOut size={14} aria-hidden="true" />
      </button>
    </span>
  );
}
