import { auth } from '@/auth';
import { getIssue, getProjectLabels } from '@/lib/gitlab';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const QADetail = dynamic(() => import('@/components/qa/QADetail').then(mod => mod.QADetail), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
});
import { getProjectUsers } from '@/app/actions/project';

import { db } from '@/lib/db';
import { qaIssues, qaRuns, attachments } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export default async function QAPage({ params }: { params: Promise<{ projectId: string, issueIid: string }> }) {
    const session = await auth();
    const isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
    if (!session?.accessToken && !isMockMode) return <div>Unauthorized</div>;

    const { projectId: projectIdStr, issueIid: issueIidStr } = await params;
    const groupId = parseInt(projectIdStr); // URL param is actually groupId
    const issueIid = parseInt(issueIidStr);

    try {
        // Get all projects in the group
        const { getGroupProjects } = await import('@/lib/gitlab');
        const token = session?.accessToken || 'mock-token';
        const groupProjects = await getGroupProjects(groupId, token);

        // Search for the issue across all projects in the group
        let gitlabIssue = null;
        let actualProjectId = null;

        for (const project of groupProjects) {
            try {
                const issue = await getIssue(project.id, issueIid, token);
                if (issue) {
                    gitlabIssue = issue;
                    actualProjectId = project.id;
                    break;
                }
            } catch (e) {
                // Issue not found in this project, continue searching
                continue;
            }
        }

        if (!gitlabIssue || !actualProjectId) {
            return (
                <div className="flex items-center justify-center h-screen">
                    <div className="text-center">
                        <h2 className="text-lg font-semibold">Issue not found</h2>
                        <p className="text-muted-foreground">Issue #{issueIid} does not exist in this group.</p>
                    </div>
                </div>
            );
        }

        // Fetch QA Issue "Folder" using the actual project ID
        const existingIssues = await db.select().from(qaIssues).where(and(
            eq(qaIssues.gitlabProjectId, actualProjectId),
            eq(qaIssues.gitlabIssueIid, issueIid)
        )).limit(1);

        const qaIssue = existingIssues[0] || null;
        let runs: any[] = [];
        let attachmentsList: any[] = [];

        if (qaIssue) {
            // Fetch all runs
            runs = await db
                .select()
                .from(qaRuns)
                .where(eq(qaRuns.qaIssueId, qaIssue.id))
                .orderBy(desc(qaRuns.runNumber));

            // Fetch attachments for all runs (or just active? good to have all)
            // Ideally we fetch attachments per run or bulk fetch.
            // For simplicity, let's just pass them down or let the client fetch?
            // Passing down is better for SSR.

            // Get all run IDs
            const runIds = runs.map(r => r.id);
            if (runIds.length > 0) {
                // Drizzle doesn't support "in" easily with array of strings in some versions, but map works.
                // Actually it does: inArray(column, values)
                const { inArray } = await import('drizzle-orm');
                attachmentsList = await db.select().from(attachments).where(inArray(attachments.qaRunId, runIds));
            }
        }

        // Fetch project members for @ mentions
        const members = await getProjectUsers(actualProjectId);

        // Fetch project labels for label management
        const labels = await getProjectLabels(actualProjectId, session?.accessToken || 'mock-token');

        return (
            <QADetail
                issue={gitlabIssue}
                qaIssue={qaIssue}
                runs={runs}
                allAttachments={attachmentsList}
                members={members}
                projectId={actualProjectId}
                issueIid={issueIid}
                labels={labels}
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
