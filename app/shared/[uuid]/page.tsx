import { db } from '@/lib/db';
import { qaRuns, qaIssues, projects, attachments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { SharedRunView } from '@/components/qa/SharedRunView';
import type { JSONContent } from '@tiptap/core';

interface SharedPageProps {
    params: Promise<{ uuid: string }>;
}

async function getSharedRun(uuid: string) {
    const results = await db
        .select({
            run: qaRuns,
            issue: qaIssues,
            project: projects,
        })
        .from(qaRuns)
        .innerJoin(qaIssues, eq(qaRuns.qaIssueId, qaIssues.id))
        .innerJoin(projects, eq(qaIssues.gitlabProjectId, projects.id))
        .where(eq(qaRuns.shareUuid, uuid))
        .limit(1);

    if (results.length === 0) {
        return null;
    }

    const { run, issue, project } = results[0];

    // Get attachments for this run
    const runAttachments = await db
        .select()
        .from(attachments)
        .where(eq(attachments.qaRunId, run.id));

    return {
        run: {
            ...run,
            testCasesContent: run.testCasesContent as JSONContent | null,
            issuesFoundContent: run.issuesFoundContent as JSONContent | null,
        },
        issue,
        project,
        attachments: runAttachments,
    };
}

export default async function SharedRunPage({ params }: SharedPageProps) {
    const { uuid } = await params;
    const data = await getSharedRun(uuid);

    if (!data) {
        notFound();
    }

    return <SharedRunView data={data} />;
}
