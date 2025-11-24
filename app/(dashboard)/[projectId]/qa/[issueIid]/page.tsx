import { auth } from '@/auth';
import { getIssue, getProjectMembers } from '@/lib/gitlab';
import { db } from '@/lib/db';
import { qaRecords } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { QADetail } from '@/components/qa/QADetail';

export default async function QAPage({ params }: { params: Promise<{ projectId: string, issueIid: string }> }) {
    const session = await auth();
    if (!session?.accessToken) return <div>Unauthorized</div>;

    const { projectId: projectIdStr, issueIid: issueIidStr } = await params;
    const projectId = parseInt(projectIdStr);
    const issueIid = parseInt(issueIidStr);

    try {
        const issue = await getIssue(projectId, issueIid, session.accessToken);
        const members = await getProjectMembers(projectId, session.accessToken);

        const qaRecord = await db.query.qaRecords.findFirst({
            where: and(
                eq(qaRecords.gitlabProjectId, projectId),
                eq(qaRecords.gitlabIssueIid, issueIid)
            ),
            with: { attachments: true }
        });

        return <QADetail issue={issue} qaRecord={qaRecord} members={members} projectId={projectId} />;
    } catch (error) {
        console.error("Error loading QA page:", error);
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <h2 className="text-lg font-semibold">Error loading issue</h2>
                    <p className="text-muted-foreground">Please check if the issue exists and you have access.</p>
                </div>
            </div>
        );
    }
}
