'use server';

import { auth } from '@/auth';
import { getUserProjects } from './project';
import { getIssues } from '@/lib/gitlab';
import { revalidatePath } from 'next/cache';

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
                assignee: i.assignees?.[0] || null, // Transform assignees array to single assignee
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

    // --- TASK 3 FIX: Batch API calls to prevent thundering herd ---
    // Helper function to execute promises in batches
    async function executeBatched<T>(
        tasks: (() => Promise<T>)[],
        batchSize: number
    ): Promise<T[]> {
        const results: T[] = [];
        for (let i = 0; i < tasks.length; i += batchSize) {
            const batch = tasks.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(task => task()));
            results.push(...batchResults);
        }
        return results;
    }

    // Create task functions for fetching issues (not executing yet)
    const issueTasks = projects.map((p: any) => () =>
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

    // Execute in batches of 3 to prevent rate limiting
    const results = await executeBatched(issueTasks, 3);

    return results.flat().sort((a: any, b: any) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
}

export async function createIssue(projectId: number, data: any) {
    if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
        const { createMockIssue, getProject } = await import('@/lib/gitlab');
        const { db } = await import('@/lib/db');
        const { qaRecords, users, projects } = await import('@/db/schema');
        const { mapLabelToStatus } = await import('@/lib/utils');
        const { eq } = await import('drizzle-orm');

        // Create the mock issue in memory
        // Handle both 'labels' (comma-separated) and 'labelId' (single label) from form
        const issueLabels = data.labels
            ? data.labels.split(',')
            : (data.labelId ? [data.labelId] : []);

        const newIssue = createMockIssue({
            project_id: projectId,
            title: data.title,
            description: data.description,
            assignee_id: data.assigneeId ? Number(data.assigneeId) : undefined,
            labels: issueLabels
        });

        // Ensure mock user exists in database (for foreign key constraint)
        const mockUserId = 'mock-user-00000000-0000-0000-0000-000000000001';
        const existingUser = await db.select().from(users).where(eq(users.id, mockUserId)).limit(1);

        if (existingUser.length === 0) {
            await db.insert(users).values({
                id: mockUserId,
                email: 'mock@example.com',
                name: 'Mock User',
                image: 'https://picsum.photos/32/32?random=999',
            });
        }

        // Get project data from mock store
        const project = await getProject(projectId, 'mock-token');

        // Ensure mock group exists in database (for nested foreign key constraint)
        if (project.namespace?.id) {
            const { groups } = await import('@/db/schema');
            const existingGroup = await db.select().from(groups).where(eq(groups.id, project.namespace.id)).limit(1);

            if (existingGroup.length === 0) {
                await db.insert(groups).values({
                    id: project.namespace.id,
                    name: project.namespace.name || 'Mock Group',
                    fullPath: project.namespace.full_path || project.namespace.path || 'mock-group',
                    description: null,
                    webUrl: `https://gitlab.com/groups/${project.namespace.path || 'mock-group'}`,
                    avatarUrl: null,
                    createdAt: new Date(),
                });
            }
        }

        // Ensure mock project exists in database (for foreign key constraint)
        const existingProject = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);

        if (existingProject.length === 0) {
            await db.insert(projects).values({
                id: projectId,
                groupId: project.namespace?.id || null,
                name: project.name,
                description: project.description || null,
                webUrl: project.web_url,
                qaLabelMapping: (project.qaLabelMapping || {
                    pending: 'qa::ready',
                    passed: 'qa::passed',
                    failed: 'qa::failed'
                }) as { pending: string; passed: string; failed: string },
                isConfigured: true,
                createdAt: new Date(),
            });
        }

        // Determine status from labels
        const labelMapping = (project.qaLabelMapping ?? {
            pending: 'qa::ready',
            passed: 'qa::passed',
            failed: 'qa::failed'
        }) as { pending: string; passed: string; failed: string };
        const status = mapLabelToStatus(newIssue.labels, labelMapping);

        await db.insert(qaRecords).values({
            gitlabIssueId: newIssue.id,
            gitlabIssueIid: newIssue.iid,
            gitlabProjectId: projectId,
            issueTitle: newIssue.title,
            issueDescription: newIssue.description || '',
            issueUrl: newIssue.web_url,
            status,
            createdBy: mockUserId,
            createdAt: new Date(newIssue.created_at),
            updatedAt: new Date(newIssue.updated_at),
        });

        console.log(`[MOCK] Created issue ${newIssue.iid} and persisted to database`);

        // Revalidate pages to show the new issue
        revalidatePath('/issues');
        revalidatePath('/board');
        revalidatePath(`/${projectId}`);

        return { success: true, id: newIssue.id, iid: newIssue.iid };
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

export async function deleteIssue(projectId: number, issueIid: number) {
    // Only allow deletion in mock mode - GitLab API doesn't support issue deletion
    if (process.env.NEXT_PUBLIC_MOCK_MODE !== 'true') {
        throw new Error('Issue deletion is not supported in production mode. GitLab does not allow deleting issues via API.');
    }

    const { deleteMockIssue } = await import('@/lib/gitlab');
    const { db } = await import('@/lib/db');
    const { qaRecords } = await import('@/db/schema');
    const { eq, and } = await import('drizzle-orm');

    // Delete from in-memory mock store
    const deletedFromMemory = deleteMockIssue(projectId, issueIid);

    // Also delete from database
    await db
        .delete(qaRecords)
        .where(
            and(
                eq(qaRecords.gitlabProjectId, projectId),
                eq(qaRecords.gitlabIssueIid, issueIid)
            )
        );

    console.log(`[MOCK] Deleted issue ${issueIid} from project ${projectId} - Memory: ${deletedFromMemory}`);

    return { success: true, deletedFromMemory };
}

