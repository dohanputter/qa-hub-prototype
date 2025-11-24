'use server';

import { auth } from '@/auth';
import { getUserProjects } from './project';
import { getIssues } from '@/lib/gitlab';

export async function getAllIssues(params?: { state?: 'opened' | 'closed'; search?: string; projectId?: string }) {
    if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
        const { getIssues, getProject } = await import('@/lib/gitlab');
        // If projectId is provided, fetch for that project.
        // Otherwise fetch for all mock projects (or just the first one as default if not specified? 
        // The prototype usually filters by project context).

        let projectsToFetch = [];
        if (params?.projectId) {
            projectsToFetch = [{ id: Number(params.projectId) }];
        } else {
            // Fetch for all mock projects
            // We need to know the IDs. MOCK_PROJECTS has 1, 2, 3.
            projectsToFetch = [{ id: 1 }, { id: 2 }, { id: 3 }];
        }

        const issuesPromises = projectsToFetch.map(async (p: { id: number }) => {
            const issues = await getIssues(p.id, 'mock-token', { ...params });
            const project = await getProject(p.id, 'mock-token');
            return issues.map((i: any) => ({ ...i, project }));
        });

        const results = await Promise.all(issuesPromises);
        return results.flat().sort((a: any, b: any) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
    }

    const session = await auth();
    if (!session?.accessToken) throw new Error('Unauthorized');

    let projects = [];
    if (params?.projectId) {
        // Verify user has access to this project
        // For now, just fetch it if we trust the ID or check against user projects
        const { getProject } = await import('@/lib/gitlab');
        try {
            const project = await getProject(Number(params.projectId), session.accessToken);
            projects = [project];
        } catch (e) {
            console.error(e);
            return [];
        }
    } else {
        projects = await getUserProjects();
    }

    if (projects.length === 0) return [];

    // Parallel fetch with error handling
    const issuesPromises = projects.map((p: any) =>
        getIssues(p.id, session.accessToken!, { ...params })
            .then(issues => issues.map((i: any) => ({ ...i, project: p }))) // Attach project info
            .catch(e => {
                console.error(`Failed to fetch issues for project ${p.id}`, e);
                return [];
            })
    );

    const results = await Promise.all(issuesPromises);

    // Flatten and sort by updated_at desc
    return results.flat().sort((a: any, b: any) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
}

export async function createIssue(projectId: number, data: any) {
    if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
        console.log(`[MOCK] Creating issue in project ${projectId}:`, data);
        // In a real mock implementation with state, we would add to MOCK_ISSUES.
        // Since MOCK_ISSUES is const in lib/gitlab.ts, we can't easily modify it persistently across server actions without a mutable store.
        // For this prototype, logging is sufficient as per plan, or we could try to hack it if needed.
        return { success: true, id: Math.floor(Math.random() * 1000) };
    }

    const session = await auth();
    if (!session?.accessToken) throw new Error('Unauthorized');

    const { getGitlabClient } = await import('@/lib/gitlab');
    const gitlab = getGitlabClient(session.accessToken);

    try {
        return await gitlab.Issues.create(projectId, data.title, {
            description: data.description,
            assigneeIds: data.assigneeId ? [Number(data.assigneeId)] : [],
            labels: data.labelId,
        });
    } catch (error) {
        console.error('Failed to create issue', error);
        throw new Error('Failed to create issue');
    }
}
