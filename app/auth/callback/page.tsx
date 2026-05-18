"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Github, LoaderCircle } from "lucide-react";
import { storeAuthSession, type AuthSession } from "@/lib/auth";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useMemo(() => sessionFromParams(searchParams), [searchParams]);
  const error = session ? null : "The OAuth callback did not include an API key and user.";

  useEffect(() => {
    if (!session) return;

    storeAuthSession(session);
    router.replace("/issues");
  }, [router, session]);

  return (
    <main className="login-page">
      <section className="login-panel single" aria-labelledby="callback-title">
        <div className="login-summary">
          <span className="brand-mark">
            <Github size={18} aria-hidden="true" />
          </span>
          <div>
            <p className="eyebrow">GitHub sign in</p>
            <h1 id="callback-title">{error ? "Sign in needs attention" : "Finishing sign in"}</h1>
            <p className="muted">
              {error ? "Return to login and try again once the backend callback is configured." : "Saving your session for this browser."}
            </p>
          </div>
        </div>
        <div className="login-form">
          {error ? (
            <div className="auth-error" role="alert">
              <AlertCircle size={16} aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : (
            <div className="toolbar">
              <LoaderCircle className="spin" size={18} aria-hidden="true" />
              <strong>Signing you in</strong>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function sessionFromParams(searchParams: URLSearchParams): AuthSession | null {
  const sessionParam = searchParams.get("session");
  if (sessionParam) {
    try {
      const parsed = JSON.parse(sessionParam) as AuthSession;
      if (parsed.api_key && parsed.user?.username) return parsed;
    } catch {
      return null;
    }
  }

  const apiKey = searchParams.get("api_key") || searchParams.get("apiKey") || searchParams.get("token");
  const username = searchParams.get("username");
  if (!apiKey || !username) return null;

  return {
    api_key: apiKey,
    user: {
      id: Number(searchParams.get("user_id") || searchParams.get("id") || 0),
      username,
      display_name: searchParams.get("display_name") || username
    }
  };
}
