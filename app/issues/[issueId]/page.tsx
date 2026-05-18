import { IssueDetailPage } from "@/components/issue-detail-page";

export default async function Page({ params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await params;
  return <IssueDetailPage issueId={issueId} />;
}
