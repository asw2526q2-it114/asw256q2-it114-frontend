"use client";

import { FormEvent, useState } from "react";
import { CustomSelect } from "@/components/custom-select";
import { Save, Trash2, UserMinus } from "lucide-react";
import { ErrorPanel } from "@/components/error-panel";
import { useConfirm, useToast } from "@/components/feedback-provider";
import { LoadingPanel } from "@/components/loading-panel";
import { displayName, issueApi } from "@/lib/api";
import { useAsyncData } from "@/lib/hooks";

export function IssuePlanningPanel({ issueId }: { issueId: string }) {
  const confirm = useConfirm();
  const toast = useToast();
  const deadline = useAsyncData(() => issueApi.getDeadline(issueId), [issueId]);
  const currentAssignee = useAsyncData(() => issueApi.assignee(issueId), [issueId]);
  const members = useAsyncData(() => issueApi.assignableMembers(issueId), [issueId]);
  const [date, setDate] = useState("");
  const [assignee, setAssignee] = useState("");

  async function saveDeadline(event: FormEvent) {
    event.preventDefault();
    try {
      await issueApi.saveDeadline(issueId, { deadline: date || null });
      await deadline.reload();
      toast.success("Deadline was saved.", "Deadline saved");
    } catch (error) {
      toast.error(error, "Unable to save deadline.");
    }
  }

  async function saveAssignee() {
    if (!assignee) return;
    try {
      await issueApi.setAssignee(issueId, Number(assignee));
      setAssignee("");
      await Promise.all([currentAssignee.reload(), members.reload()]);
      toast.success("Assignee was updated.", "Assignee saved");
    } catch (error) {
      toast.error(error, "Unable to assign issue.");
    }
  }

  async function removeDeadline() {
    await confirm({
      title: "Remove this deadline?",
      description: "The issue will no longer have a deadline date.",
      actionLabel: "Remove deadline",
      destructive: true,
      onConfirm: async () => {
        try {
          await issueApi.deleteDeadline(issueId);
          setDate("");
          await deadline.reload();
          toast.success("Deadline was removed.", "Deadline removed");
        } catch (error) {
          toast.error(error, "Unable to remove deadline.");
        }
      }
    });
  }

  async function clearAssignee() {
    await confirm({
      title: "Clear the current assignee?",
      description: "The issue will become unassigned.",
      actionLabel: "Clear assignee",
      destructive: true,
      onConfirm: async () => {
        try {
          await issueApi.deleteAssignee(issueId);
          setAssignee("");
          await Promise.all([currentAssignee.reload(), members.reload()]);
          toast.success("Assignee was cleared.", "Assignee cleared");
        } catch (error) {
          toast.error(error, "Unable to clear assignee.");
        }
      }
    });
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
            onClick={() => void removeDeadline()}
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
        {currentAssignee.loading ? <LoadingPanel label="Loading assignee" /> : null}
        {currentAssignee.error && !currentAssignee.unauthorized ? <ErrorPanel error={currentAssignee.error} onRetry={currentAssignee.reload} /> : null}
        {!currentAssignee.loading ? <p className="muted">Current assignee: {displayName(currentAssignee.data)}</p> : null}
        {members.loading ? <LoadingPanel label="Loading members" /> : null}
        {members.error && !members.unauthorized ? <ErrorPanel error={members.error} onRetry={members.reload} /> : null}
        <div className="field">
          <label htmlFor="assignee">Assignable member</label>
          <CustomSelect
            id="assignee"
            value={assignee}
            onChange={(val) => setAssignee(val)}
            options={[
              { value: "", label: "Select user" },
              ...(members.data || []).map((member) => ({
                value: String(member.id || ""),
                label: displayName(member)
              }))
            ]}
          />
        </div>
        <div className="toolbar">
          <button className="button primary" onClick={() => void saveAssignee()} type="button">
            <Save size={16} aria-hidden="true" />
            Assign
          </button>
          <button
            className="button secondary"
            onClick={() => void clearAssignee()}
            type="button"
          >
            <UserMinus size={16} aria-hidden="true" />
            Clear assignee
          </button>
        </div>
      </div>
    </section>
  );
}
