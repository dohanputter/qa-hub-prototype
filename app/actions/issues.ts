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
        const { getProject } = await import('@/lib/gitlab');
        const { db } = await import('@/lib/db');
        const { qaIssues, users, projects } = await import('@/db/schema');
        const { mapLabelToStatus } = await import('@/lib/utils');
        const { eq } = await import('drizzle-orm');

        // Handle both 'labels' (comma-separated) and 'labelId' (single label) from form
        const issueLabels = data.labels
            ? data.labels.split(',').map((l: string) => l.trim()).filter((l: string) => l)
            : (data.labelId ? [data.labelId] : []);

        console.log(`[MOCK] Creating issue with labels:`, issueLabels);

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

        // Get next IID for this project
        const existingIssues = await db.select().from(qaIssues).where(eq(qaIssues.gitlabProjectId, projectId));
        const maxIid = existingIssues.reduce((max, issue) => Math.max(max, issue.gitlabIssueIid), 0);
        const newIid = maxIid + 1;

        // Generate a negative ID to avoid collision with real GitLab IDs
        const newId = -(Date.now());

        // Determine status from labels
        const labelMapping = (project.qaLabelMapping ?? {
            pending: 'qa::ready',
            passed: 'qa::passed',
            failed: 'qa::failed'
        }) as { pending: string; passed: string; failed: string };
        const status = mapLabelToStatus(issueLabels, labelMapping) || 'pending';

        const assigneeId = data.assigneeId ? Number(data.assigneeId) : null;

        console.log(`[MOCK] Writing issue to DB - IID: ${newIid}, Labels: ${issueLabels.join(', ')}, AssigneeId: ${assigneeId}, Status: ${status}`);

        // Write directly to database
        try {
            await db.insert(qaIssues).values({
                gitlabIssueId: newId,
                gitlabIssueIid: newIid,
                gitlabProjectId: projectId,
                issueTitle: data.title,
                issueDescription: data.description || '',
                issueUrl: `https://gitlab.com/mock/issues/${newId}`,
                status,
                jsonLabels: issueLabels,
                assigneeId: assigneeId,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            console.log(`[MOCK] Created issue #${newIid} and persisted to database`);
        } catch (error: any) {
            // Handle unique constraint violation
            if (error.message && error.message.includes('UNIQUE constraint failed')) {
                console.error(`[MOCK] Issue #${newIid} already exists in project ${projectId}, retrying with next IID...`);
                // Recursively try with next IID
                const existingIssues2 = await db.select().from(qaIssues).where(eq(qaIssues.gitlabProjectId, projectId));
                const maxIid2 = existingIssues2.reduce((max, issue) => Math.max(max, issue.gitlabIssueIid), 0);
                const retryIid = maxIid2 + 1;

                await db.insert(qaIssues).values({
                    gitlabIssueId: newId,
                    gitlabIssueIid: retryIid,
                    gitlabProjectId: projectId,
                    issueTitle: data.title,
                    issueDescription: data.description || '',
                    issueUrl: `https://gitlab.com/mock/issues/${newId}`,
                    status,
                    jsonLabels: issueLabels,
                    assigneeId: assigneeId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });

                console.log(`[MOCK] Created issue #${retryIid} on retry`);

                // Revalidate pages to show the new issue
                revalidatePath('/issues');
                revalidatePath('/board');
                revalidatePath(`/${projectId}`);

                return { success: true, id: newId, iid: retryIid };
            }
            throw error; // Re-throw if it's a different error
        }

        // Revalidate pages to show the new issue
        revalidatePath('/issues');
        revalidatePath('/board');
        revalidatePath(`/${projectId}`);

        return { success: true, id: newId, iid: newIid };
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
    const { qaIssues } = await import('@/db/schema');
    const { eq, and } = await import('drizzle-orm');

    // Delete from in-memory mock store
    const deletedFromMemory = deleteMockIssue(projectId, issueIid);

    // Also delete from database
    await db
        .delete(qaIssues)
        .where(
            and(
                eq(qaIssues.gitlabProjectId, projectId),
                eq(qaIssues.gitlabIssueIid, issueIid)
            )
        );

    console.log(`[MOCK] Deleted issue ${issueIid} from project ${projectId} - Memory: ${deletedFromMemory}`);

    return { success: true, deletedFromMemory };
}

export async function getProjectStats(projectIds: number[]) {
    const session = await auth();
    if (!session?.accessToken && process.env.NEXT_PUBLIC_MOCK_MODE !== 'true') return {};

    const isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
    const stats: Record<number, { open: number; closed: number; total: number }> = {};

    if (isMockMode) {
        const { getIssues } = await import('@/lib/gitlab');
        for (const pid of projectIds) {
            const issues = await getIssues(pid, 'mock-token');
            stats[pid] = {
                open: issues.filter((i: any) => i.state === 'opened').length,
                closed: issues.filter((i: any) => i.state === 'closed').length,
                total: issues.length
            };
        }
    } else {
        const { getGitlabClient } = await import('@/lib/gitlab');
        const gitlab = getGitlabClient(session?.accessToken as string);

        // Fetch in parallel
        await Promise.all(projectIds.map(async (pid) => {
            try {
                // We can use the statistics field if available, or just count issues
                // Fetching all issues just to count is expensive. GitLab Project API has statistics.
                const project = await gitlab.Projects.show(pid, { statistics: true });
                // @ts-ignore - gitbeaker types might be missing statistics sometimes
                const statistics = project.statistics as any;

                // If statistics not available, fall back to issues count (simplified)
                if (statistics) {
                    stats[pid] = {
                        open: statistics.opened_issues || statistics.issues || 0,
                        closed: statistics.closed_issues || 0,
                        total: statistics.issues || 0
                    };
                } else {
                    // Fallback: fetch open issues count
                    // simplified fallback
                    stats[pid] = { open: 0, closed: 0, total: 0 };
                }
            } catch (e) {
                console.error(`Failed to fetch stats for project ${pid}`, e);
                stats[pid] = { open: 0, closed: 0, total: 0 };
            }
        }));
    }

    return stats;
}

export async function getDashboardStats() {
    // In a real app, this would aggregate data from DB/GitLab
    // For prototype, we return realistic mock data

    // 1. Project Stats (Open/Closed)
    // We can reuse getProjectStats if we had project IDs, but let's mock for speed/demo
    const projectStats = [
        { name: 'Bob Go', open: 12, closed: 45 },
        { name: 'Bobe', open: 8, closed: 32 },
        { name: 'Bob Shop', open: 15, closed: 28 },
        { name: 'Bob Pay', open: 5, closed: 12 },
    ];

    // 2. Time Spent Trend (Last 7 days)
    const timeStats = [
        { date: 'Mon', hours: 4.5 },
        { date: 'Tue', hours: 6.2 },
        { date: 'Wed', hours: 5.8 },
        { date: 'Thu', hours: 7.1 },
        { date: 'Fri', hours: 4.9 },
        { date: 'Sat', hours: 2.1 },
        { date: 'Sun', hours: 1.5 },
    ];

    // 3. Pass/Fail Rates
    const passRates = [
        { name: 'Passed First Time', value: 65, color: '#22c55e' },
        { name: 'Failed First Time', value: 35, color: '#ef4444' },
    ];

    return {
        projectStats,
        timeStats,
        passRates
    };
}
