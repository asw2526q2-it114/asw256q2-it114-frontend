"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CircleUserRound,
  LayoutList,
  Settings,
} from "lucide-react";
import { AuthStatusPill } from "@/components/auth-status-pill";
import { FeedbackProvider } from "@/components/feedback-provider";
import { getStoredApiKey, subscribeToAuthChanges } from "@/lib/auth";

const navItems = [
  { href: "/issues", label: "Issues", icon: LayoutList },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/profile", label: "Profile", icon: CircleUserRound }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const authRoute = pathname.startsWith("/login") || pathname.startsWith("/auth");
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    if (authRoute) return;

    const refreshAuth = () => {
      const hasApiKey = Boolean(getStoredApiKey());
      setAuthenticated(hasApiKey);
      if (!hasApiKey) router.replace("/login");
    };

    const checkTimer = window.setTimeout(refreshAuth, 0);
    const unsubscribe = subscribeToAuthChanges(refreshAuth);

    return () => {
      window.clearTimeout(checkTimer);
      unsubscribe();
    };
  }, [authRoute, router]);

  if (authRoute) {
    return <FeedbackProvider><div className="auth-frame">{children}</div></FeedbackProvider>;
  }

  if (!authenticated) {
    return (
      <div className="auth-guard">
        <span className="brand-mark">IH</span>
      </div>
    );
  }

  return (
    <FeedbackProvider>
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <Link className="brand" href="/issues">
          <span className="brand-mark">IH</span>
          <span>IssueHub</span>
        </Link>
        <nav className="nav-group">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link className={`nav-link ${active ? "active" : ""}`} href={item.href} key={item.href}>
                <Icon size={18} aria-hidden="true" />
                <span className="nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="main-frame">
        <header className="topbar">
          <div>
            <p className="eyebrow">Issuehub management system</p>
            <strong>{titleForPath(pathname)}</strong>
          </div>
          <div className="toolbar">
            <AuthStatusPill />
          </div>
        </header>
        {children}
      </div>
      <nav className="mobile-bar" aria-label="Mobile navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link className={active ? "active" : ""} href={item.href} key={item.href} title={item.label}>
              <Icon size={20} aria-hidden="true" />
            </Link>
          );
        })}
      </nav>
    </div>
    </FeedbackProvider>
  );
}

function titleForPath(pathname: string) {
  if (pathname.startsWith("/settings")) return "Configuration";
  if (pathname.startsWith("/profile")) return "Profile";
  if (pathname.startsWith("/auth") || pathname.startsWith("/login")) return "Authentication";
  if (pathname.includes("/deadline")) return "Planning";
  if (pathname.startsWith("/issues")) return "Issues";
  return "Dashboard";
}
