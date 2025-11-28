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

            // Create notification for the new issue
            const { notifications } = await import('@/db/schema');
            const session = await auth();
            const userIdToNotify = session?.user?.id || mockUserId;

            if (assigneeId) {
                await db.insert(notifications).values({
                    userId: userIdToNotify,
                    type: 'assignment',
                    title: 'New Issue Assigned',
                    message: `You have been assigned to issue #${newIid}: ${data.title}`,
                    resourceType: 'issue',
                    resourceId: newId.toString(),
                    actionUrl: `/${projectId}/issues/${newIid}`,
                });
            } else {
                await db.insert(notifications).values({
                    userId: userIdToNotify,
                    type: 'status_change',
                    title: 'Issue Created',
                    message: `Issue #${newIid} created in ${project.name}`,
                    resourceType: 'issue',
                    resourceId: newId.toString(),
                    actionUrl: `/${projectId}/issues/${newIid}`,
                });
            }

            // Revalidate pages to show the new issue
            revalidatePath('/issues');
            revalidatePath('/board');
            revalidatePath(`/${projectId}`);

            return { success: true, id: newId, iid: newIid };

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

                // Create notification for retry case too
                const { notifications } = await import('@/db/schema');
                const session = await auth();
                const userIdToNotify = session?.user?.id || mockUserId;

                await db.insert(notifications).values({
                    userId: userIdToNotify,
                    type: 'status_change',
                    title: 'Issue Created',
                    message: `Issue #${retryIid} created in ${project.name}`,
                    resourceType: 'issue',
                    resourceId: newId.toString(),
                    actionUrl: `/${projectId}/issues/${retryIid}`,
                });

                // Revalidate pages to show the new issue
                revalidatePath('/issues');
                revalidatePath('/board');
                revalidatePath(`/${projectId}`);

                return { success: true, id: newId, iid: retryIid };
            }
            throw error; // Re-throw if it's a different error
        }
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

export async function getDashboardStats(projectId?: number) {
    const isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
    const session = await auth();

    if (!isMockMode && !session?.accessToken) return { projectStats: [], timeStats: [], passRates: [] };

    // Imports for DB access
    const { db } = await import('@/lib/db');
    const { qaIssues, qaRuns, projects } = await import('@/db/schema');
    const { eq, desc, sql, and } = await import('drizzle-orm');
    const { subDays, format, differenceInHours, differenceInMinutes } = await import('date-fns');

    // Fetch issues and runs
    // If projectId is provided, filter by it
    let allIssues: typeof qaIssues.$inferSelect[] = [];
    let allRuns: typeof qaRuns.$inferSelect[] = [];
    let allProjects: typeof projects.$inferSelect[] = [];

    if (projectId) {
        allIssues = await db.select().from(qaIssues).where(eq(qaIssues.gitlabProjectId, projectId));

        // For runs, we need to join with issues to filter by project, or filter in memory if we fetch all
        // Let's fetch all runs for the filtered issues
        // We can use a subquery or just filter in memory since it's a prototype
        const issueIds = allIssues.map(i => i.id);
        if (issueIds.length > 0) {
            // Drizzle 'inArray' would be better but let's just fetch all and filter for now to keep it simple
            // or use a join if we want to be efficient.
            // Let's try a join approach for correctness
            const runsResult = await db.select({ run: qaRuns })
                .from(qaRuns)
                .innerJoin(qaIssues, eq(qaRuns.qaIssueId, qaIssues.id))
                .where(eq(qaIssues.gitlabProjectId, projectId));
            allRuns = runsResult.map(r => r.run);
        } else {
            allRuns = [];
        }

        allProjects = await db.select().from(projects).where(eq(projects.id, projectId));
    } else {
        allIssues = await db.select().from(qaIssues);
        allRuns = await db.select().from(qaRuns);
        allProjects = await db.select().from(projects);
    }

    // 1. Project Stats (Open/Closed)
    const projectStatsMap = new Map<number, { name: string; open: number; closed: number }>();

    // Initialize with known projects
    allProjects.forEach(p => {
        projectStatsMap.set(p.id, { name: p.name, open: 0, closed: 0 });
    });

    allIssues.forEach(issue => {
        const pStats = projectStatsMap.get(issue.gitlabProjectId);
        if (pStats) {
            // Map 'passed'/'failed' to 'closed' (or keep as open if that's the logic? usually passed/failed means done)
            // Actually, let's stick to the issue status.
            // If status is 'pending', it's open. 'passed'/'failed' are closed.
            if (issue.status === 'pending') {
                pStats.open++;
            } else {
                pStats.closed++;
            }
        }
    });

    const projectStats = Array.from(projectStatsMap.values());

    // 2. Time Spent Trend (Last 7 days)
    // We'll use completed runs to calculate time spent
    const timeStatsMap = new Map<string, { date: string; hours: number; count: number }>();

    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const key = format(date, 'EEE'); // Mon, Tue, etc.
        timeStatsMap.set(key, { date: key, hours: 0, count: 0 });
    }

    allRuns.forEach(run => {
        if (run.completedAt && run.createdAt) {
            const date = new Date(run.completedAt);
            // Only consider last 7 days
            if (date >= subDays(new Date(), 7)) {
                const key = format(date, 'EEE');
                if (timeStatsMap.has(key)) {
                    const entry = timeStatsMap.get(key)!;
                    const minutes = differenceInMinutes(new Date(run.completedAt), new Date(run.createdAt));
                    // Cap at reasonable max (e.g. 24h = 1440m) to avoid outliers
                    entry.hours += Math.min(minutes, 1440); // reusing 'hours' field for minutes to avoid breaking types everywhere immediately, or better rename it
                    entry.count++;
                }
            }
        }
    });

    const timeStats = Array.from(timeStatsMap.values()).map(stat => ({
        date: stat.date,
        minutes: stat.count > 0 ? Math.round(stat.hours / stat.count) : 0 // 'hours' here actually stores minutes sum
    }));

    // 3. Pass/Fail Rates (First Time Pass)
    // We need to find the FIRST run for each issue
    let firstTimePass = 0;
    let firstTimeFail = 0;

    // Group runs by issue
    const runsByIssue = new Map<string, typeof allRuns>();
    allRuns.forEach(run => {
        if (!runsByIssue.has(run.qaIssueId)) {
            runsByIssue.set(run.qaIssueId, []);
        }
        runsByIssue.get(run.qaIssueId)!.push(run);
    });

    runsByIssue.forEach((runs) => {
        // Sort by run number ascending
        runs.sort((a, b) => a.runNumber - b.runNumber);

        if (runs.length > 0) {
            const firstRun = runs[0];
            if (firstRun.status === 'passed') firstTimePass++;
            else if (firstRun.status === 'failed') firstTimeFail++;
        }
    });

    const totalFirstRuns = firstTimePass + firstTimeFail;
    const passRate = totalFirstRuns > 0 ? Math.round((firstTimePass / totalFirstRuns) * 100) : 0;
    const failRate = totalFirstRuns > 0 ? Math.round((firstTimeFail / totalFirstRuns) * 100) : 0;

    const passRates = [
        { name: 'Passed First Time', value: passRate, color: '#22c55e' },
        { name: 'Failed First Time', value: failRate, color: '#ef4444' },
    ];

    // 4. KPI Metrics
    // Active Tests (Pending Runs)
    const activeTests = allRuns.filter(r => r.status === 'pending').length;

    // Issues Found (Total Issues)
    const issuesFound = allIssues.length;

    // Avg Time to Test (Overall)
    let totalMinutes = 0;
    let completedRunsCount = 0;
    allRuns.forEach(run => {
        if (run.completedAt && run.createdAt) {
            totalMinutes += differenceInMinutes(new Date(run.completedAt), new Date(run.createdAt));
            completedRunsCount++;
        }
    });
    const avgTimeToTest = completedRunsCount > 0 ? Math.round(totalMinutes / completedRunsCount) : 0;

    return {
        projectStats,
        timeStats,
        passRates,
        kpi: {
            avgTimeToTest,
            firstTimePassRate: passRate,
            issuesFound,
            activeTests
        }
    };
}
