import { auth } from '@/auth';
import { getIssue } from '@/lib/gitlab';
import { QADetail } from '@/components/qa/QADetail';
import { getProjectUsers } from '@/app/actions/project';

import { db } from '@/lib/db';
import { qaRecords } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export default async function QAPage({ params }: { params: Promise<{ projectId: string, issueIid: string }> }) {
    const session = await auth();
    const isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
    if (!session?.accessToken && !isMockMode) return <div>Unauthorized</div>;

    const { projectId: projectIdStr, issueIid: issueIidStr } = await params;
    const projectId = parseInt(projectIdStr);
    const issueIid = parseInt(issueIidStr);

    try {
        const gitlabIssue = await getIssue(projectId, issueIid, session?.accessToken || 'mock-token');

        if (!gitlabIssue) {
            return (
                <div className="flex items-center justify-center h-screen">
                    <div className="text-center">
                        <h2 className="text-lg font-semibold">Issue not found</h2>
                        <p className="text-muted-foreground">Issue #{issueIid} does not exist in this project.</p>
                    </div>
                </div>
            );
        }

        // Fetch QA record if it exists
        const existingRecords = await db.select().from(qaRecords).where(and(
            eq(qaRecords.gitlabProjectId, projectId),
            eq(qaRecords.gitlabIssueIid, issueIid)
        )).limit(1);

        const qaRecord = existingRecords[0] || null;

        // Fetch project members for @ mentions
        const members = await getProjectUsers(projectId);

        return (
            <QADetail
                issue={gitlabIssue}
                qaRecord={qaRecord}
                members={members}
                projectId={projectId}
            />
        );
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
