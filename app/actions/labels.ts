'use server';

import { auth } from '@/auth';
import { getProjectLabels, updateIssueLabels } from '@/lib/gitlab';
import { revalidatePath } from 'next/cache';

export async function getLabelsAction(projectId: number) {
    if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
        return await getProjectLabels(projectId, 'mock-token');
    }

    const session = await auth();
    if (!session?.accessToken) throw new Error('Unauthorized');

    return await getProjectLabels(projectId, session.accessToken);
}

export async function updateLabelsAction(
    projectId: number,
    issueIid: number,
    options: { addLabels?: string[]; removeLabels?: string[] }
) {
    if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
        const result = await updateIssueLabels(projectId, issueIid, 'mock-token', options);

        // Revalidate relevant paths
        revalidatePath(`/${projectId}/qa/${issueIid}`);
        revalidatePath('/issues');
        revalidatePath('/board');

        return result;
    }

    const session = await auth();
    if (!session?.accessToken) throw new Error('Unauthorized');

    const result = await updateIssueLabels(projectId, issueIid, session.accessToken, options);

    // Revalidate relevant paths
    revalidatePath(`/${projectId}/qa/${issueIid}`);
    revalidatePath('/issues');
    revalidatePath('/board');

    return result;
}
