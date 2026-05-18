"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Github, LockKeyhole, LogIn, Mail, UserPlus, UserRound } from "lucide-react";
import { ApiError, OAUTH_LOGIN_URL, authApi, isUnauthorized } from "@/lib/api";
import { useToast } from "@/components/feedback-provider";
import { getStoredApiKey, storeAuthSession } from "@/lib/auth";

type AuthMode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (getStoredApiKey()) router.replace("/issues");
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "signup") {
      await handleSignup();
      return;
    }

    await handleSignin();
  }

  async function handleSignin() {
    const trimmedLogin = login.trim();

    if (!trimmedLogin || !password) {
      setError("Enter your username or email and password.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const session = await authApi.login({ login: trimmedLogin, password });
      storeAuthSession(session);
      toast.success("Signed in successfully.", "Welcome back");
      router.replace("/issues");
    } catch (loginError) {
      const message = isUnauthorized(loginError) ? "Username or password is incorrect." : errorMessage(loginError, "Login failed. Try again.");
      setError(message);
      toast.error(loginError, message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignup() {
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (!trimmedUsername || !trimmedEmail || !password1 || !password2) {
      setError("Fill in every field to create your account.");
      return;
    }

    if (password1 !== password2) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const session = await authApi.signup({
        username: trimmedUsername,
        email: trimmedEmail,
        password1,
        password2
      });
      storeAuthSession(session);
      toast.success("Account created successfully.", "Welcome");
      router.replace("/issues");
    } catch (signupError) {
      const message = errorMessage(signupError, "Account creation failed. Try again.");
      setError(message);
      toast.error(signupError, message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-summary">
          <span className="brand-mark">IH</span>
          <div>
            <p className="eyebrow">IssueHub</p>
            <h1 id="login-title">{mode === "signin" ? "Sign in" : "Create account"}</h1>
            <p className="muted">
              {mode === "signin"
                ? "Use your username or email to get an API key for this browser."
                : "Create an account and start using IssueHub immediately."}
            </p>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <a className="button secondary oauth-button" href={OAUTH_LOGIN_URL}>
            <Github size={18} aria-hidden="true" />
            Continue with GitHub
          </a>
          <div className="auth-divider">
            <span>Local fallback</span>
          </div>
          <div className="auth-mode-switch" role="tablist" aria-label="Authentication mode">
            <button
              aria-selected={mode === "signin"}
              className={mode === "signin" ? "active" : ""}
              onClick={() => switchMode("signin")}
              role="tab"
              type="button"
            >
              Sign in
            </button>
            <button
              aria-selected={mode === "signup"}
              className={mode === "signup" ? "active" : ""}
              onClick={() => switchMode("signup")}
              role="tab"
              type="button"
            >
              Create account
            </button>
          </div>

          {mode === "signin" ? (
            <>
              <AuthField icon={<UserRound size={18} aria-hidden="true" />} label="Username or email">
                <input
                  className="input"
                  autoComplete="username"
                  name="login"
                  onChange={(event) => setLogin(event.target.value)}
                  type="text"
                  value={login}
                />
              </AuthField>

              <AuthField icon={<LockKeyhole size={18} aria-hidden="true" />} label="Password">
                <input
                  className="input"
                  autoComplete="current-password"
                  name="password"
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  value={password}
                />
              </AuthField>
            </>
          ) : (
            <>
              <AuthField icon={<UserRound size={18} aria-hidden="true" />} label="Username">
                <input
                  className="input"
                  autoComplete="username"
                  name="username"
                  onChange={(event) => setUsername(event.target.value)}
                  type="text"
                  value={username}
                />
              </AuthField>

              <AuthField icon={<Mail size={18} aria-hidden="true" />} label="Email">
                <input
                  className="input"
                  autoComplete="email"
                  name="email"
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  value={email}
                />
              </AuthField>

              <AuthField icon={<LockKeyhole size={18} aria-hidden="true" />} label="Password">
                <input
                  className="input"
                  autoComplete="new-password"
                  name="password1"
                  onChange={(event) => setPassword1(event.target.value)}
                  type="password"
                  value={password1}
                />
              </AuthField>

              <AuthField icon={<LockKeyhole size={18} aria-hidden="true" />} label="Confirm password">
                <input
                  className="input"
                  autoComplete="new-password"
                  name="password2"
                  onChange={(event) => setPassword2(event.target.value)}
                  type="password"
                  value={password2}
                />
              </AuthField>
            </>
          )}

          {error ? (
            <div className="auth-error" role="alert">
              <AlertCircle size={16} aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : null}

          <button className="button primary login-submit" disabled={submitting} type="submit">
            {mode === "signin" ? <LogIn size={18} aria-hidden="true" /> : <UserPlus size={18} aria-hidden="true" />}
            {submitLabel(mode, submitting)}
          </button>
        </form>
      </section>
    </main>
  );

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
  }
}

function AuthField({ children, icon, label }: { children: React.ReactNode; icon: React.ReactNode; label: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <span className="input-with-icon">
        {icon}
        {children}
      </span>
    </label>
  );
}

function submitLabel(mode: AuthMode, submitting: boolean) {
  if (mode === "signup") return submitting ? "Creating account" : "Create account";
  return submitting ? "Signing in" : "Sign in";
}

function errorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) return fallback;
  if (typeof error.details === "string") return error.details;
  if (error.details && typeof error.details === "object") {
    const details = error.details as Record<string, unknown>;
    const values = Object.values(details)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter((value): value is string => typeof value === "string");
    if (values.length > 0) return values.join(" ");
  }
  return error.message || fallback;
}
