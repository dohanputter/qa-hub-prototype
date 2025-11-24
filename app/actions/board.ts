'use server';

import { auth } from '@/auth';
import { updateIssueLabels } from '@/lib/gitlab';
import { revalidatePath } from 'next/cache';

export async function moveIssue(projectId: number, issueIid: number, newLabel: string, oldLabel: string) {
    const session = await auth();
    if (!session?.accessToken) throw new Error('Unauthorized');

    try {
        await updateIssueLabels(projectId, issueIid, session.accessToken, {
            addLabels: [newLabel],
            removeLabels: [oldLabel]
        });

        revalidatePath(`/${projectId}`);
        return { success: true };
    } catch (error) {
        console.error('Failed to move issue:', error);
        return { success: false, error: 'Failed to update issue' };
    }
}
