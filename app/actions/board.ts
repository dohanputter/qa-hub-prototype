'use server';

import { auth } from '@/auth';
import { updateIssueLabels } from '@/lib/gitlab';
import { revalidatePath } from 'next/cache';

export async function moveIssue(projectId: number, issueIid: number, newLabel: string, oldLabel: string) {
    const session = await auth();
    const isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

    if (!session?.accessToken && !isMockMode) throw new Error('Unauthorized');

    try {
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
