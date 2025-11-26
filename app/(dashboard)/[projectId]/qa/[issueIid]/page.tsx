import { auth } from '@/auth';
import { getIssue } from '@/lib/gitlab';
import { TicketDetailPage } from '@/components/TicketDetailPage';
import { Issue, IssueState, QAStatus } from '@/types';

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

        // Map to App Issue (Same logic as in intercepted page)
        const qaLabelMapping = {
            pending: 'bug',
            passed: 'feature',
            failed: 'critical'
        };

        let qaStatus = QAStatus.TODO;
        const issueLabels = gitlabIssue.labels || [];
        if (issueLabels.includes(qaLabelMapping.pending)) qaStatus = QAStatus.READY_FOR_QA;
        else if (issueLabels.includes(qaLabelMapping.passed)) qaStatus = QAStatus.PASSED;
        else if (issueLabels.includes(qaLabelMapping.failed)) qaStatus = QAStatus.FAILED;
        else qaStatus = QAStatus.TODO;

        const existingRecords = await db.select().from(qaRecords).where(and(
            eq(qaRecords.gitlabProjectId, projectId),
            eq(qaRecords.gitlabIssueIid, issueIid)
        )).limit(1);

        const existingRecord = existingRecords[0];

        const appIssue: Issue = {
            id: gitlabIssue.id,
            iid: gitlabIssue.iid,
            projectId: gitlabIssue.project_id,
            title: gitlabIssue.title,
            description: gitlabIssue.description,
            state: gitlabIssue.state === 'opened' ? IssueState.OPEN : IssueState.CLOSED,
            createdAt: gitlabIssue.created_at,
            updatedAt: gitlabIssue.updated_at,
            assignee: gitlabIssue.assignees?.[0] ? {
                id: gitlabIssue.assignees[0].id,
                name: gitlabIssue.assignees[0].name,
                username: gitlabIssue.assignees[0].username,
                avatarUrl: gitlabIssue.assignees[0].avatar_url
            } : undefined,
            author: {
                id: gitlabIssue.author.id,
                name: gitlabIssue.author.name,
                username: gitlabIssue.author.username,
                avatarUrl: gitlabIssue.author.avatar_url
            },
            labels: (gitlabIssue.labels || []).map((l: string, idx: number) => ({
                id: idx,
                title: l,
                color: '#ccc',
                textColor: '#000'
            })),
            qaStatus: qaStatus,
            testCases: existingRecord?.testCasesContent ? JSON.stringify(existingRecord.testCasesContent) : '',
            issuesFound: existingRecord?.issuesFoundContent ? JSON.stringify(existingRecord.issuesFoundContent) : ''
        };

        return <TicketDetailPage issue={appIssue} />;
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
