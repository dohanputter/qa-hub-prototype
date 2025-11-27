import { headers } from 'next/headers';
import { revalidateTag } from 'next/cache';
import { db } from '@/lib/db';
import { qaIssues, qaRuns, notifications, projects, users } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
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

    // 1. Find or Create QA Issue
    let qaIssueId: string;
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
    }

    // 2. Handle Run Logic based on Status Change
    if (newStatus === 'pending') {
        // TRIGGER: Start new run if none active
        const runs = await db
            .select()
            .from(qaRuns)
            .where(eq(qaRuns.qaIssueId, qaIssueId))
            .orderBy(desc(qaRuns.runNumber));

        const activeRun = runs.find(r => r.status === 'pending');

        if (!activeRun) {
            // Check who triggered this. If it was the system (via our own action), we might want to be careful.
            // But usually webhooks come from GitLab user actions.
            // We need a user ID for 'createdBy'. We'll try to find the GitLab user in our DB, or use a system user.

            const gitlabUserId = event.user.id; // numeric ID
            // We don't store numeric gitlab IDs in users table (we store UUIDs or strings).
            // We need a fallback mechanism.
            // For now, let's see if we can find a user by email if provided, or use a default "System/Webhook" user.

            // Simplified: Use the first admin or a placeholder.
            // Better: Create a system user if not exists.

            const systemUserId = 'system-webhook-runner';
            const [sysUser] = await db.select().from(users).where(eq(users.id, systemUserId));
            if (!sysUser) {
                await db.insert(users).values({
                    id: systemUserId,
                    name: 'GitLab Webhook',
                    email: 'webhook@system.local',
                });
            }

            const nextRunNumber = (runs[0]?.runNumber || 0) + 1;

            await db.insert(qaRuns).values({
                qaIssueId: qaIssueId,
                runNumber: nextRunNumber,
                status: 'pending',
                createdBy: systemUserId,
            });
            console.log(`[Webhook] Started Run #${nextRunNumber} for Issue #${issue.iid}`);
        }
    } else if (newStatus === 'passed' || newStatus === 'failed') {
        // TRIGGER: Close active run if exists
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
             console.log(`[Webhook] Closed Run #${activeRun.runNumber} for Issue #${issue.iid} as ${newStatus}`);
        }
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
