import { headers } from 'next/headers';
import { revalidateTag } from 'next/cache';
import { db } from '@/lib/db';
import { qaIssues, qaRuns, notifications, projects } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { mapLabelToStatus } from '@/lib/utils';
import { env } from '@/lib/env';
import { ensureWebhookUser } from '@/lib/mock-user';
import { SYSTEM_USERS } from '@/lib/constants';
import { logger } from '@/lib/logger';

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
    const newStatus = mapLabelToStatus(labels, project.qaLabelMapping) || 'pending';


    // 1. Find or Create QA Issue and track old status
    let qaIssueId: string;
    let oldStatus: 'pending' | 'passed' | 'failed' | null = null;

    const existingIssue = await db
        .select()
        .from(qaIssues)
        .where(and(
            eq(qaIssues.gitlabProjectId, event.project.id),
            eq(qaIssues.gitlabIssueIid, issue.iid)
        ))
        .limit(1);

    if (existingIssue.length > 0) {
        qaIssueId = existingIssue[0].id;
        oldStatus = existingIssue[0].status; // Track old status before update
        await db
            .update(qaIssues)
            .set({
                status: newStatus,
                issueTitle: issue.title,
                issueDescription: issue.description || '',
                updatedAt: new Date(),
            })
            .where(eq(qaIssues.id, qaIssueId));
    } else {
        const [created] = await db.insert(qaIssues).values({
            gitlabIssueId: issue.id,
            gitlabIssueIid: issue.iid,
            gitlabProjectId: event.project.id,
            issueTitle: issue.title,
            issueDescription: issue.description || '',
            issueUrl: issue.url || `https://gitlab.com/${event.project.path_with_namespace}/-/issues/${issue.iid}`,
            status: newStatus,
        }).returning();
        qaIssueId = created.id;
        oldStatus = null; // Issue is new, no old status
    }

    logger.info(`Webhook: Status change for Issue #${issue.iid}: ${oldStatus || 'new'} -> ${newStatus}`);

    // 2. Handle Run Logic based on Status Change
    // Only start a run if status is CHANGING TO pending (not already pending)
    if (newStatus === 'pending' && oldStatus !== 'pending') {
        // TRIGGER: Start new run if none active
        const runs = await db
            .select()
            .from(qaRuns)
            .where(eq(qaRuns.qaIssueId, qaIssueId))
            .orderBy(desc(qaRuns.runNumber));

        const activeRun = runs.find(r => r.status === 'pending');

        if (!activeRun) {
            // Ensure webhook system user exists
            await ensureWebhookUser();

            const nextRunNumber = (runs[0]?.runNumber || 0) + 1;

            await db.insert(qaRuns).values({
                qaIssueId: qaIssueId,
                runNumber: nextRunNumber,
                status: 'pending',
                createdBy: SYSTEM_USERS.WEBHOOK,
            });
            logger.info(`Webhook: Started Run #${nextRunNumber} for Issue #${issue.iid} (status changed from ${oldStatus || 'none'} to pending)`);
        } else {
            logger.info(`Webhook: Run #${activeRun.runNumber} already exists for Issue #${issue.iid}, not creating new run`);
        }
    } else if ((newStatus === 'passed' || newStatus === 'failed') && oldStatus === 'pending') {
        // Only close run if transitioning FROM pending TO passed/failed
        const runs = await db
            .select()
            .from(qaRuns)
            .where(eq(qaRuns.qaIssueId, qaIssueId))
            .orderBy(desc(qaRuns.runNumber));

        const activeRun = runs.find(r => r.status === 'pending');

        if (activeRun) {
            await db.update(qaRuns).set({
                status: newStatus,
                completedAt: new Date(),
                updatedAt: new Date()
            }).where(eq(qaRuns.id, activeRun.id));
            logger.info(`Webhook: Closed Run #${activeRun.runNumber} for Issue #${issue.iid} as ${newStatus}`);
        }
    } else {
        logger.info(`Webhook: No run action needed for Issue #${issue.iid} (status: ${oldStatus || 'new'} -> ${newStatus})`);
    }
}

async function handleNoteEvent(event: any) {
    const note = event.object_attributes;
    const issue = event.issue;

    if (!issue) return;

    // Find Issue
    const qaIssueResults = await db
        .select()
        .from(qaIssues)
        .where(
            and(
                eq(qaIssues.gitlabProjectId, event.project.id),
                eq(qaIssues.gitlabIssueIid, issue.iid)
            )
        )
        .limit(1);

    const qaIssue = qaIssueResults[0];

    if (!qaIssue) return;

    // Find latest run to attach notification to (context)
    const runs = await db
        .select()
        .from(qaRuns)
        .where(eq(qaRuns.qaIssueId, qaIssue.id))
        .orderBy(desc(qaRuns.runNumber))
        .limit(1);

    const latestRun = runs[0];

    // Identify target user (Created By of the run, or Issue creator?)
    // Usually notify the QA person who started the run.
    const targetUserId = latestRun?.createdBy || qaIssue.id; // Fallback?

    if (latestRun) {
        await db.insert(notifications).values({
            userId: latestRun.createdBy,
            type: 'comment',
            title: `New comment on QA: ${qaIssue.issueTitle}`,
            message: note.note.substring(0, 200),
            resourceType: 'qa_run',
            resourceId: latestRun.id,
            actionUrl: qaIssue.issueUrl,
        });
    }
}
