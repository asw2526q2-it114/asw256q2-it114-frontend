"use client";

import { FormEvent, useState } from "react";
import { Save, Trash2, UserMinus } from "lucide-react";
import { ErrorPanel } from "@/components/error-panel";
import { LoadingPanel } from "@/components/loading-panel";
import { displayName, issueApi } from "@/lib/api";
import { useAsyncData } from "@/lib/hooks";

export function IssuePlanningPanel({ issueId }: { issueId: string }) {
  const deadline = useAsyncData(() => issueApi.getDeadline(issueId), [issueId]);
  const members = useAsyncData(() => issueApi.assignableMembers(issueId), [issueId]);
  const [date, setDate] = useState("");
  const [assignee, setAssignee] = useState("");

  async function saveDeadline(event: FormEvent) {
    event.preventDefault();
    await issueApi.saveDeadline(issueId, { deadline: date || null });
    await deadline.reload();
  }

  async function saveAssignee() {
    if (!assignee) return;
    await issueApi.setAssignee(issueId, Number(assignee));
  }

  return (
    <section className="grid two">
      <form className="panel grid" onSubmit={(event) => void saveDeadline(event)}>
        <div>
          <p className="eyebrow">Deadline</p>
          <h2>Plan delivery</h2>
        </div>
        {deadline.loading ? <LoadingPanel label="Loading deadline" /> : null}
        {deadline.error && !deadline.unauthorized ? <ErrorPanel error={deadline.error} onRetry={deadline.reload} /> : null}
        <div className="field">
          <label htmlFor="deadline">Deadline</label>
          <input
            className="input"
            id="deadline"
            type="date"
            value={date || String(deadline.data?.deadline || "").slice(0, 10)}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
        <div className="toolbar">
          <button className="button primary" type="submit">
            <Save size={16} aria-hidden="true" />
            Save deadline
          </button>
          <button
            className="button danger"
            onClick={async () => {
              await issueApi.deleteDeadline(issueId);
              await deadline.reload();
            }}
            type="button"
          >
            <Trash2 size={16} aria-hidden="true" />
            Remove
          </button>
        </div>
      </form>
      <div className="panel grid">
        <div>
          <p className="eyebrow">Assignee</p>
          <h2>Assign ownership</h2>
        </div>
        {members.loading ? <LoadingPanel label="Loading members" /> : null}
        {members.error && !members.unauthorized ? <ErrorPanel error={members.error} onRetry={members.reload} /> : null}
        <div className="field">
          <label htmlFor="assignee">Assignable member</label>
          <select className="select" id="assignee" value={assignee} onChange={(event) => setAssignee(event.target.value)}>
            <option value="">Select user</option>
            {members.data?.map((member) => (
              <option key={member.id || member.username} value={member.id}>
                {displayName(member)}
              </option>
            ))}
          </select>
        </div>
        <div className="toolbar">
          <button className="button primary" onClick={() => void saveAssignee()} type="button">
            <Save size={16} aria-hidden="true" />
            Assign
          </button>
          <button className="button secondary" onClick={() => void issueApi.deleteAssignee(issueId)} type="button">
            <UserMinus size={16} aria-hidden="true" />
            Clear assignee
          </button>
        </div>
      </div>
    </section>
  );
}
