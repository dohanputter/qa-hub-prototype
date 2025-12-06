import { headers } from 'next/headers';
import { revalidateTag } from 'next/cache';
import { db } from '@/lib/db';
import { qaIssues, qaRuns, notifications, projects } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { env } from '@/lib/env';
import { ensureWebhookUser } from '@/lib/mockUser';
import { SYSTEM_USERS } from '@/lib/constants';
import { logger } from '@/lib/logger';
import { createNotification } from '@/app/actions/notifications';

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

    // Import column mapping helpers
    const { getProjectColumnMapping } = await import('@/app/actions/columnMapping');
    const { DEFAULT_COLUMNS } = await import('@/lib/constants');

    // Get column configuration (from DB or defaults)
    const columnMapping = (project?.columnMapping as any[]) || DEFAULT_COLUMNS;

    // Extract labels from webhook payload
    const issueLabels = issue.labels?.map((l: any) => l.title) || [];

    // Find which column this issue belongs to based on its labels
    const matchedColumn = columnMapping.find((col: any) =>
        col.gitlabLabel && issueLabels.includes(col.gitlabLabel)
    );

    // Determine status based on column type
    // For backward compatibility, map column types to status values
    let newStatus: 'pending' | 'passed' | 'failed' = 'pending';
    if (matchedColumn) {
        if (matchedColumn.columnType === 'passed') newStatus = 'passed';
        else if (matchedColumn.columnType === 'failed') newStatus = 'failed';
        // queue, active, standard all map to 'pending' status in the database
    }

    // Extract assignee and author from webhook
    const assigneeId = event.assignees?.[0]?.id || issue.assignee_id || null;
    const authorId = issue.author_id || null;
    const issueState = (issue.state === 'opened' || issue.state === 'closed')
        ? issue.state as 'opened' | 'closed'
        : 'opened';

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

        // Update all cached issue metadata from webhook
        await db
            .update(qaIssues)
            .set({
                status: newStatus,
                issueTitle: issue.title,
                issueDescription: issue.description || '',
                issueUrl: issue.url || existingIssue[0].issueUrl,
                jsonLabels: issueLabels,
                assigneeId: assigneeId,
                authorId: authorId,
                issueState: issueState,
                updatedAt: new Date(),
            })
            .where(eq(qaIssues.id, qaIssueId));

        logger.info(`Webhook: Updated issue #${issue.iid} cache (labels: ${issueLabels.join(', ')}, state: ${issueState})`);
    } else {
        // Create new issue with full metadata
        const [created] = await db.insert(qaIssues).values({
            gitlabIssueId: issue.id,
            gitlabIssueIid: issue.iid,
            gitlabProjectId: event.project.id,
            issueTitle: issue.title,
            issueDescription: issue.description || '',
            issueUrl: issue.url || `https://gitlab.com/${event.project.path_with_namespace}/-/issues/${issue.iid}`,
            status: newStatus,
            jsonLabels: issueLabels,
            assigneeId: assigneeId,
            authorId: authorId,
            issueState: issueState,
        }).returning();
        qaIssueId = created.id;
        oldStatus = null; // Issue is new, no old status

        logger.info(`Webhook: Created issue #${issue.iid} in cache`);
    }

    logger.info(`Webhook: Status/column change for Issue #${issue.iid}: ${oldStatus || 'new'} -> ${newStatus} (column: ${matchedColumn?.title || 'none'})`);

    // 2. Handle Run Logic based on Column Type
    // Use columnType to determine behavior instead of just status
    const columnType = matchedColumn?.columnType || null;

    // Find old column to determine transition
    const oldColumn = oldStatus ? columnMapping.find((col: any) =>
        col.columnType === (oldStatus === 'passed' ? 'passed' : oldStatus === 'failed' ? 'failed' : 'queue')
    ) : null;

    if (columnType === 'active' && oldColumn?.columnType !== 'active') {
        // Moving TO active column: Start new run
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
            logger.info(`Webhook: Started Run #${nextRunNumber} for Issue #${issue.iid} (moved to active column)`);
        } else {
            logger.info(`Webhook: Run #${activeRun.runNumber} already exists for Issue #${issue.iid}, not creating new run`);
        }
    } else if ((columnType === 'passed' || columnType === 'failed') && oldStatus === 'pending') {
        // Moving TO passed/failed column from pending: Close run
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
    } else if (columnType === 'queue') {
        // Queue column: Set readyForQaAt timestamp
        await db.update(qaIssues)
            .set({ readyForQaAt: new Date(), updatedAt: new Date() })
            .where(eq(qaIssues.id, qaIssueId));
        logger.info(`Webhook: Set readyForQaAt for Issue #${issue.iid} (queue column)`);
    } else {
        logger.info(`Webhook: No run action needed for Issue #${issue.iid} (column type: ${columnType || 'none'})`);
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
        await createNotification({
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
