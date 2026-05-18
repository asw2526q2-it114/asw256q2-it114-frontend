"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarClock, UserRoundCheck } from "lucide-react";
import { AuthPending } from "@/components/auth-pending";
import { StatusBadge } from "@/components/badge";
import { ErrorPanel } from "@/components/error-panel";
import { LoadingPanel } from "@/components/loading-panel";
import { PageTitle } from "@/components/page-title";
import { displayName, issueApi, issueNumber } from "@/lib/api";
import { useAsyncData } from "@/lib/hooks";
import { IssuePlanningPanel } from "@/components/issue-planning-panel";

const tabs = [
  { key: "overview", label: "Overview", icon: UserRoundCheck },
  { key: "planning", label: "Planning", icon: CalendarClock }
];

export function IssueDetailPage({ issueId }: { issueId: string }) {
  const [tab, setTab] = useState("overview");
  const { data: issue, error, loading, unauthorized, reload } = useAsyncData(() => issueApi.get(issueId), [issueId]);

  return (
    <main className="page">
      <PageTitle
        eyebrow="Issue detail"
        title={issue ? `#${issueNumber(issue)} ${issue.subject}` : `Issue #${issueId}`}
        description="Inspect status, planning, collaboration, watchers, and attachments."
        actions={
          <Link className="button secondary" href="/issues">
            Back to issues
          </Link>
        }
      />
      {unauthorized ? <AuthPending /> : null}
      {loading ? <LoadingPanel label="Loading issue" /> : null}
      {error && !unauthorized ? <ErrorPanel error={error} onRetry={reload} /> : null}
      {issue ? (
        <>
          <nav className="tabs">
            {tabs.map((item) => {
              const Icon = item.icon;
              return (
                <button className={`tab ${tab === item.key ? "active" : ""}`} key={item.key} onClick={() => setTab(item.key)} type="button">
                  <Icon size={15} aria-hidden="true" /> {item.label}
                </button>
              );
            })}
          </nav>
          {tab === "overview" ? (
            <section className="grid two">
              <div className="panel">
                <p className="eyebrow">Summary</p>
                <h2>{issue.subject}</h2>
                <p>{issue.description || "No description provided."}</p>
              </div>
              <div className="panel grid">
                <div className="grid two">
                  <Meta label="Status" value={<StatusBadge value={issue.status_extra_info || issue.status} />} />
                  <Meta label="Type" value={displayName(issue.type_extra_info || issue.issue_type || issue.type)} />
                  <Meta label="Severity" value={<StatusBadge value={issue.severity_extra_info || issue.severity} />} />
                  <Meta label="Priority" value={displayName(issue.priority_extra_info || issue.priority)} />
                  <Meta label="Assignee" value={displayName(issue.assigned_to_extra_info || issue.assigned_to)} />
                  <Meta label="Modified" value={formatDate(issue.modified_date || issue.created_date)} />
                </div>
              </div>
            </section>
          ) : null}
          {tab === "planning" ? <IssuePlanningPanel issueId={issueId} /> : null}
        </>
      ) : null}
    </main>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="label">{label}</p>
      <div>{value}</div>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
