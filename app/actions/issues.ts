'use server';

import { auth } from '@/auth';
import { getUserProjects } from './project';
import { getIssues } from '@/lib/gitlab';

export async function getAllIssues(params?: { state?: 'opened' | 'closed'; search?: string }) {
    const session = await auth();
    if (!session?.accessToken) throw new Error('Unauthorized');

    const projects = await getUserProjects();

    if (projects.length === 0) return [];

    // Parallel fetch with error handling
    const issuesPromises = projects.map(p =>
        getIssues(p.id, session.accessToken!, { ...params })
            .then(issues => issues.map((i: any) => ({ ...i, project: p }))) // Attach project info
            .catch(e => {
                console.error(`Failed to fetch issues for project ${p.id}`, e);
                return [];
            })
    );

    const results = await Promise.all(issuesPromises);

    // Flatten and sort by updated_at desc
    return results.flat().sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
}
