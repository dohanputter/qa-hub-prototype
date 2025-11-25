'use server';

import { auth } from '@/auth';
import { getUserProjects } from './project';
import { getIssues } from '@/lib/gitlab';

export async function getAllIssues(params?: { state?: 'opened' | 'closed'; search?: string; projectId?: string }) {
    if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
        const { getIssues, getProject } = await import('@/lib/gitlab');

        let projectsToFetch = [];
        if (params?.projectId) {
            projectsToFetch = [{ id: Number(params.projectId) }];
        } else {
            // Fetch for all mock projects (IDs 500, 501, 502)
            projectsToFetch = [{ id: 500 }, { id: 501 }, { id: 502 }];
        }

        const issuesPromises = projectsToFetch.map(async (p: { id: number }) => {
            const issues = await getIssues(p.id, 'mock-token', { ...params });
            const project = await getProject(p.id, 'mock-token');
            return issues.map((i: any) => ({
                ...i,
                projectId: i.project_id,
                createdAt: i.created_at,
                updatedAt: i.updated_at,
                avatarUrl: i.author?.avatar_url,
                author: {
                    ...i.author,
                    avatarUrl: i.author?.avatar_url
                },
                project
            }));
        });

        const results = await Promise.all(issuesPromises);
        return results.flat().sort((a: any, b: any) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
    }

    const session = await auth();
    if (!session?.accessToken) throw new Error('Unauthorized');

    let projects = [];
    if (params?.projectId) {
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

    const issuesPromises = projects.map((p: any) =>
        getIssues(p.id, session.accessToken!, { ...params })
            .then(issues => issues.map((i: any) => ({
                ...i,
                projectId: i.project_id,
                createdAt: i.created_at,
                updatedAt: i.updated_at,
                avatarUrl: i.author?.avatar_url,
                author: {
                    ...i.author,
                    avatarUrl: i.author?.avatar_url
                },
                project: p
            })))
            .catch(e => {
                console.error(`Failed to fetch issues for project ${p.id}`, e);
                return [];
            })
    );

    const results = await Promise.all(issuesPromises);

    return results.flat().sort((a: any, b: any) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
}

export async function createIssue(projectId: number, data: any) {
    if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
        const { createMockIssue } = await import('@/lib/gitlab');
        const newIssue = createMockIssue({
            project_id: projectId,
            title: data.title,
            description: data.description,
            assignee_id: data.assigneeId ? Number(data.assigneeId) : undefined,
            labels: data.labels ? data.labels.split(',') : []
        });
        return { success: true, id: newIssue.id };
    }

    const session = await auth();
    if (!session?.accessToken) throw new Error('Unauthorized');

    const { getGitlabClient } = await import('@/lib/gitlab');
    const gitlab = getGitlabClient(session.accessToken);

    try {
        return await gitlab.Issues.create(projectId, data.title, {
            description: data.description,
            assigneeIds: data.assigneeId ? [Number(data.assigneeId)] : [],
            labels: data.labels, // Expecting comma-separated string or array? GitLab expects string or array.
        });
    } catch (error) {
        console.error('Failed to create issue', error);
        throw new Error('Failed to create issue');
    }
}
