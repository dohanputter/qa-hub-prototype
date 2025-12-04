'use server';

import { auth } from '@/auth';
import { updateIssueLabels } from '@/lib/gitlab';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { projects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { isMockMode, getMockToken, getTokenOrMock } from '@/lib/mode';
import { DEFAULT_QA_LABELS } from '@/lib/constants';
import { logger } from '@/lib/logger';

export async function moveIssue(projectId: number, issueIid: number, newLabel: string, oldLabel: string) {
    const session = await auth();
    const inMockMode = isMockMode();

    if (!session?.accessToken && !inMockMode) throw new Error('Unauthorized');

    try {
        // 1. Fetch project to get label mapping
        // We need this to know if we are moving to a QA column
        const { getOrCreateQARun, submitQARun } = await import('./qa');

        const projectResults = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
        const project = projectResults[0];

        const labelMapping = project?.qaLabelMapping || DEFAULT_QA_LABELS;

        // 2. Handle QA Run Logic BEFORE updating labels
        // Check if we are moving TO a QA status
        if (newLabel === labelMapping.pending) {
            logger.info('moveIssue: Moving to Ready for QA - Starting new QA Run');
            await getOrCreateQARun({
                projectId,
                issueIid,
                forceNewRun: true
            });
        } else if (newLabel === labelMapping.passed) {
            logger.info('moveIssue: Moving to Passed - Completing QA Run');
            // Find active run and pass it
            const { run } = await getOrCreateQARun({ projectId, issueIid });
            if (run && run.status === 'pending') {
                const result = await submitQARun(projectId, run.id, 'passed');
                if (result.success) {
                    return { success: true };
                }
            }
        } else if (newLabel === labelMapping.failed) {
            logger.info('moveIssue: Moving to Failed - Failing QA Run');
            const { run } = await getOrCreateQARun({ projectId, issueIid });
            if (run && run.status === 'pending') {
                const result = await submitQARun(projectId, run.id, 'failed');
                if (result.success) {
                    return { success: true };
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
