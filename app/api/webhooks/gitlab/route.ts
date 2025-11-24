import { headers } from 'next/headers';
import { revalidateTag } from 'next/cache';
import { db } from '@/lib/db';
import { qaRecords, notifications, projects } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { mapLabelToStatus } from '@/lib/utils';
import { env } from '@/lib/env';

export async function POST(req: Request) {
    const headersList = await headers();
    const token = headersList.get('X-Gitlab-Token');
    const eventType = headersList.get('X-Gitlab-Event');

    if (token !== env.WEBHOOK_SECRET) {
        console.warn('Webhook auth failed:', { receivedToken: token?.substring(0, 8) });
        return new Response('Invalid token', { status: 401 });
    }

    if (!['Issue Hook', 'Note Hook'].includes(eventType ?? '')) {
        return new Response('Ignored', { status: 200 });
    }

    try {
        const event = await req.json();
        const projectId = event.project.id;

        if (eventType === 'Issue Hook') {
            await handleIssueEvent(event);
        } else if (eventType === 'Note Hook') {
            await handleNoteEvent(event);
        }

        revalidateTag(`issues-${projectId}`);
        return new Response('OK', { status: 200 });
    } catch (error) {
        console.error('Webhook error:', error);
        return new Response('Error processing webhook', { status: 500 });
    }
}

async function handleIssueEvent(event: any) {
    const issue = event.object_attributes;
    const projectResults = await db
        .select()
        .from(projects)
        .where(eq(projects.id, event.project.id))
        .limit(1);

    const project = projectResults[0];

    if (!project?.qaLabelMapping) return;

    const labels = issue.labels?.map((l: any) => l.title) || [];
    const newStatus = mapLabelToStatus(labels, project.qaLabelMapping);

    await db
        .update(qaRecords)
        .set({
            status: newStatus,
            issueTitle: issue.title,
            issueDescription: issue.description || '',
            updatedAt: new Date(),
        })
        .where(
            and(
                eq(qaRecords.gitlabProjectId, event.project.id),
                eq(qaRecords.gitlabIssueIid, issue.iid)
            )
        );
}

async function handleNoteEvent(event: any) {
    const note = event.object_attributes;
    const issue = event.issue;

    if (!issue) return;

    const qaRecordResults = await db
        .select()
        .from(qaRecords)
        .where(
            and(
                eq(qaRecords.gitlabProjectId, event.project.id),
                eq(qaRecords.gitlabIssueIid, issue.iid)
            )
        )
        .limit(1);

    const qaRecord = qaRecordResults[0];

    if (!qaRecord) return;

    await db.insert(notifications).values({
        userId: qaRecord.createdBy,
        type: 'comment',
        title: `New comment on QA: ${qaRecord.issueTitle}`,
        message: note.note.substring(0, 200),
        resourceType: 'qa_record',
        resourceId: qaRecord.id,
        actionUrl: qaRecord.issueUrl,
    });
}
