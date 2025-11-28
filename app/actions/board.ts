'use server';

import { auth } from '@/auth';
import { updateIssueLabels } from '@/lib/gitlab';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { projects } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function moveIssue(projectId: number, issueIid: number, newLabel: string, oldLabel: string) {
    const session = await auth();
    const isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

    if (!session?.accessToken && !isMockMode) throw new Error('Unauthorized');

    try {
        // 1. Fetch project to get label mapping
        // We need this to know if we are moving to a QA column
        const { getOrCreateQARun, submitQARun } = await import('./qa');

        const projectResults = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
        const project = projectResults[0];

        const labelMapping = project?.qaLabelMapping || {
            pending: 'qa::ready',
            passed: 'qa::passed',
            failed: 'qa::failed'
        };

        // 2. Handle QA Run Logic BEFORE updating labels
        // Check if we are moving TO a QA status
        if (newLabel === labelMapping.pending) {
            console.log('[moveIssue] Moving to Ready for QA - Starting new QA Run');
            await getOrCreateQARun({
                projectId,
                issueIid,
                forceNewRun: true
            });
        } else if (newLabel === labelMapping.passed) {
            console.log('[moveIssue] Moving to Passed - Completing QA Run');
            // Find active run and pass it
            const { run } = await getOrCreateQARun({ projectId, issueIid });
            if (run && run.status === 'pending') {
                const result = await submitQARun(projectId, run.id, 'passed');
                if (result.success) {
                    return { success: true };
                }
            }
        } else if (newLabel === labelMapping.failed) {
            console.log('[moveIssue] Moving to Failed - Failing QA Run');
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
            console.log('[moveIssue] No labels to add or remove, skipping');
            return { success: true };
        }

        console.log(`[moveIssue] Moving issue #${issueIid} in project ${projectId}`, {
            add: newLabel || '(none)',
            remove: oldLabel || '(none)',
            isMockMode
        });

        await updateIssueLabels(projectId, issueIid, session?.accessToken || 'mock-token', updateOptions);

        // In mock mode, don't revalidate - the optimistic update in KanbanBoard is sufficient
        // and revalidation causes the mockIssuesStore update to revert
        if (!isMockMode) {
            // Revalidate all board-related paths for production
            revalidatePath(`/${projectId}`);
            revalidatePath(`/${projectId}/board`);
            revalidatePath('/board');
            revalidatePath('/issues');
        } else {
            console.log('[moveIssue] Mock mode - skipping revalidation to preserve optimistic update');
        }

        console.log(`[moveIssue] Successfully moved issue #${issueIid}`);
        return { success: true };
    } catch (error) {
        console.error('Failed to move issue:', error);
        return { success: false, error: `Failed to update issue: ${error}` };
    }
}
