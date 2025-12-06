'use server';

import { auth } from '@/auth';
import { updateIssueLabels } from '@/lib/gitlab';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { projects } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { isMockMode, getTokenOrMock } from '@/lib/mode';
import { DEFAULT_COLUMNS } from '@/lib/constants';
import { logger } from '@/lib/logger';
import { qaIssues } from '@/db/schema';
import type { QAColumn } from '@/types';

export async function moveIssue(projectId: number, issueIid: number, newLabel: string, oldLabel: string) {
    const session = await auth();
    const inMockMode = isMockMode();

    if (!session?.accessToken && !inMockMode) throw new Error('Unauthorized');

    try {
        // 1. Fetch project to get column mapping
        const { getOrCreateQARun, submitQARun } = await import('./qa');

        const projectResults = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
        const project = projectResults[0];

        // Use new column mapping or fall back to defaults
        const columnMapping: QAColumn[] = (project?.columnMapping as QAColumn[]) || DEFAULT_COLUMNS;

        // Find the target column by its GitLab label
        const targetColumn = newLabel ? columnMapping.find(col => col.gitlabLabel === newLabel) : null;
        const sourceColumn = oldLabel ? columnMapping.find(col => col.gitlabLabel === oldLabel) : null;

        logger.info('moveIssue: Column type resolution', {
            newLabel,
            oldLabel,
            sourceColumnType: sourceColumn?.columnType || 'backlog'
        });

        // Fetch current issue data to handle wait time calculations
        const currentIssue = await db.query.qaIssues.findFirst({
            where: and(
                eq(qaIssues.gitlabProjectId, projectId),
                eq(qaIssues.gitlabIssueIid, issueIid)
            )
        });

        // Helper to calculate new cumulative wait time
        const getNewWaitTime = () => {
            if (!currentIssue?.readyForQaAt) return currentIssue?.cumulativeWaitTimeMs || 0;
            const waitDuration = new Date().getTime() - new Date(currentIssue.readyForQaAt).getTime();
            return (currentIssue.cumulativeWaitTimeMs || 0) + waitDuration;
        };

        // 2. Handle QA workflow based on column type
        if (targetColumn) {
            switch (targetColumn.columnType) {
                case 'queue':
                    // Queue column: Set readyForQaAt timestamp for wait time tracking
                    logger.info('moveIssue: Moving to Queue column - Setting wait time timestamp');
                    await db.update(qaIssues)
                        .set({ readyForQaAt: new Date(), updatedAt: new Date() })
                        .where(and(
                            eq(qaIssues.gitlabProjectId, projectId),
                            eq(qaIssues.gitlabIssueIid, issueIid)
                        ));
                    logger.info(`moveIssue: Set readyForQaAt for Issue #${issueIid}`);
                    break;

                case 'active':
                    // Active column: Start new QA Run timer
                    logger.info('moveIssue: Moving to Active column - Starting QA Run');

                    // Clear readyForQaAt since testing is now active
                    await db.update(qaIssues)
                    // Clear readyForQaAt since testing is now active, and save wait time
                    await db.update(qaIssues)
                        .set({
                            readyForQaAt: null,
                            cumulativeWaitTimeMs: getNewWaitTime(),
                            updatedAt: new Date()
                        })
                        .where(and(
                            eq(qaIssues.gitlabProjectId, projectId),
                            eq(qaIssues.gitlabIssueIid, issueIid)
                        ));

                    await getOrCreateQARun({
                        projectId,
                        issueIid,
                        forceNewRun: true
                    });
                    break;

                case 'passed':
                    // Passed column: Complete QA Run as passed
                    logger.info('moveIssue: Moving to Passed column - Completing QA Run');

                    await db.update(qaIssues)
                    await db.update(qaIssues)
                        .set({
                            readyForQaAt: null,
                            cumulativeWaitTimeMs: getNewWaitTime(),
                            updatedAt: new Date()
                        })
                        .where(and(
                            eq(qaIssues.gitlabProjectId, projectId),
                            eq(qaIssues.gitlabIssueIid, issueIid)
                        ));

                    const { run: passRun } = await getOrCreateQARun({ projectId, issueIid });
                    if (passRun && passRun.status === 'pending') {
                        const result = await submitQARun(projectId, passRun.id, 'passed');
                        if (result.success) {
                            return { success: true };
                        }
                    }
                    break;

                case 'failed':
                    // Failed column: Complete QA Run as failed
                    logger.info('moveIssue: Moving to Failed column - Failing QA Run');

                    await db.update(qaIssues)
                    await db.update(qaIssues)
                        .set({
                            readyForQaAt: null,
                            cumulativeWaitTimeMs: getNewWaitTime(),
                            updatedAt: new Date()
                        })
                        .where(and(
                            eq(qaIssues.gitlabProjectId, projectId),
                            eq(qaIssues.gitlabIssueIid, issueIid)
                        ));

                    const { run: failRun } = await getOrCreateQARun({ projectId, issueIid });
                    if (failRun && failRun.status === 'pending') {
                        const result = await submitQARun(projectId, failRun.id, 'failed');
                        if (result.success) {
                            return { success: true };
                        }
                    }
                    break;

                case 'standard':
                default:
                    // Standard column: No special QA behavior, but clear readyForQaAt if coming from queue
                    if (sourceColumn?.columnType === 'queue') {
                        await db.update(qaIssues)
                            .set({
                                readyForQaAt: null,
                                cumulativeWaitTimeMs: getNewWaitTime(),
                                updatedAt: new Date()
                            })
                            .where(and(
                                eq(qaIssues.gitlabProjectId, projectId),
                                eq(qaIssues.gitlabIssueIid, issueIid)
                            ));
                        logger.info(`moveIssue: Cleared readyForQaAt and saved wait time for Issue #${issueIid} (moved from queue to standard)`);
                    }
                    logger.info('moveIssue: Moving to Standard column - Label update only');
                    break;
            }
        } else if (!newLabel && oldLabel && sourceColumn) {
            // Moving to Backlog (removing all configured labels) - close any pending runs
            logger.info('moveIssue: Moving to Backlog - Abandoning pending QA Runs');
            const { qaRuns } = await import('@/db/schema');

            // Find the QA issue
            const existingIssue = await db
                .select()
                .from(qaIssues)
                .where(and(
                    eq(qaIssues.gitlabProjectId, projectId),
                    eq(qaIssues.gitlabIssueIid, issueIid)
                ))
                .limit(1);

            if (existingIssue.length > 0) {
                // Find and close any pending runs
                const pendingRuns = await db
                    .select()
                    .from(qaRuns)
                    .where(and(
                        eq(qaRuns.qaIssueId, existingIssue[0].id),
                        eq(qaRuns.status, 'pending')
                    ));

                let accumulatedTime = 0;
                const now = new Date();

                for (const run of pendingRuns) {
                    // Calculate duration for this run (createdAt might be null, use now as fallback)
                    const runCreatedAt = run.createdAt ? new Date(run.createdAt) : now;
                    const runDuration = now.getTime() - runCreatedAt.getTime();
                    accumulatedTime += runDuration;

                    // Mark as abandoned with completed time
                    await db.update(qaRuns)
                        .set({
                            status: 'failed',
                            completedAt: now,
                            updatedAt: now
                        })
                        .where(eq(qaRuns.id, run.id));
                    logger.info(`moveIssue: Abandoned Run #${run.runNumber} for Issue #${issueIid} (duration: ${runDuration}ms)`);
                }

                // Update cumulative time on issue with the accumulated time from abandoned runs
                const currentCumulativeTime = existingIssue[0].cumulativeTimeMs || 0;
                const newCumulativeTime = currentCumulativeTime + accumulatedTime;

                // Reset issue status to pending (for Backlog) and update cumulative time
                // Calculate wait time if applicable (using local variable since we have existingIssue)
                const currentWaitTimeMs = existingIssue[0].cumulativeWaitTimeMs || 0;
                const additionalWait = existingIssue[0].readyForQaAt
                    ? (now.getTime() - new Date(existingIssue[0].readyForQaAt).getTime())
                    : 0;

                await db.update(qaIssues)
                    .set({
                        status: 'pending',
                        cumulativeTimeMs: newCumulativeTime,
                        readyForQaAt: null,
                        cumulativeWaitTimeMs: currentWaitTimeMs + additionalWait,
                        updatedAt: now
                    })
                    .where(eq(qaIssues.id, existingIssue[0].id));

                if (accumulatedTime > 0) {
                    logger.info(`moveIssue: Added ${accumulatedTime}ms to cumulative time for Issue #${issueIid} (total: ${newCumulativeTime}ms)`);
                }
            }
        }

        // 3. Standard Label Update (if not handled by submitQARun above)
        const updateOptions: { addLabels?: string[]; removeLabels?: string[] } = {};

        // Add label if newLabel is provided (not moving to backlog)
        if (newLabel) {
            updateOptions.addLabels = [newLabel];
        }

        // Only remove old label if it exists (not from backlog)
        if (oldLabel) {
            updateOptions.removeLabels = [oldLabel];
        }

        // If both are empty, nothing to do
        if (!newLabel && !oldLabel) {
            logger.info('moveIssue: No labels to add or remove, skipping');
            return { success: true };
        }

        logger.info(`moveIssue: Moving issue #${issueIid} in project ${projectId}`, {
            add: newLabel || '(none)',
            remove: oldLabel || '(none)',
            inMockMode
        });

        const token = getTokenOrMock(session?.accessToken);
        await updateIssueLabels(projectId, issueIid, token, updateOptions);

        // In mock mode, don't revalidate - the optimistic update in KanbanBoard is sufficient
        // and revalidation causes the mockIssuesStore update to revert
        if (!inMockMode) {
            // Revalidate all board-related paths for production
            revalidatePath(`/${projectId}`);
            revalidatePath(`/${projectId}/board`);
            revalidatePath('/board');
            revalidatePath('/issues');
        } else {
            logger.info('moveIssue: Mock mode - skipping revalidation to preserve optimistic update');
        }

        logger.info(`moveIssue: Successfully moved issue #${issueIid}`);
        return { success: true };
    } catch (error) {
        logger.error('Failed to move issue', error);
        // Sanitize error message to avoid exposing sensitive information
        const errorMessage = error instanceof Error && error.message.includes('rate limit')
            ? error.message  // Rate limit messages are safe and helpful
            : 'Failed to update issue. Please try again.';
        return { success: false, error: errorMessage };
    }
}
