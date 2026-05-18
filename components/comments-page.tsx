"use client";

import Link from "next/link";
import { AuthPending } from "@/components/auth-pending";
import { ErrorPanel } from "@/components/error-panel";
import { LoadingPanel } from "@/components/loading-panel";
import { PageTitle } from "@/components/page-title";
import { commentApi, displayName } from "@/lib/api";
import { useAsyncData } from "@/lib/hooks";

export function CommentsPage() {
  const { data, error, loading, unauthorized, reload } = useAsyncData(() => commentApi.list(), []);

  return (
    <main className="page">
      <PageTitle
        eyebrow="Issue discovery"
        title="All comments"
        description="Cross-issue activity view for finding recent collaboration."
      />
      {unauthorized ? <AuthPending /> : null}
      {loading ? <LoadingPanel label="Loading comments" /> : null}
      {error && !unauthorized ? <ErrorPanel error={error} onRetry={reload} /> : null}
      {data ? (
        <section className="panel table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Comment</th>
                <th>Issue</th>
                <th>Author</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {data.map((comment) => (
                <tr key={comment.id}>
                  <td>{comment.comment || comment.text || comment.content || "Empty comment"}</td>
                  <td>
                    {comment.issue ? <Link href={`/issues/${comment.issue}`}>#{comment.issue}</Link> : displayName(comment.issue_extra_info)}
                  </td>
                  <td>{displayName(comment.user || comment.owner)}</td>
                  <td>{formatDate(comment.created_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </main>
  );
}

function formatDate(value?: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
