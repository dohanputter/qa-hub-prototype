'use server';

import { auth } from '@/auth';
import { getUserProjects } from './project';
import { createNotification } from './notifications';
import { getIssues } from '@/lib/gitlab';
import { revalidatePath } from 'next/cache';
import { isMockMode, getMockToken } from '@/lib/mode';
import { SYSTEM_USERS, DEFAULT_QA_LABELS, MOCK_PROJECT_IDS } from '@/lib/constants';
import { ensureMockUser, ensureMockGroup, ensureMockProject } from '@/lib/mock-user';
import { createIssueSchema, safeParse } from '@/lib/validations';
import { logger } from '@/lib/logger';
import type { GitLabIssue, GitLabProject, Project } from '@/types';

export async function getAllIssues(params?: { state?: 'opened' | 'closed'; search?: string; projectId?: string; groupId?: string; labels?: string }) {
    if (isMockMode()) {
        const { getIssues, getProject, getGroupProjects } = await import('@/lib/gitlab');
        const { executeBatched } = await import('@/lib/utils');
        const token = getMockToken();

        // Determine projects to fetch
        let projectsToFetch: { id: number }[] = [];

        if (params?.projectId) {
            projectsToFetch = [{ id: Number(params.projectId) }];
        } else if (params?.groupId) {
            const groupProjects = await getGroupProjects(Number(params.groupId), token);
            projectsToFetch = groupProjects.map((p: GitLabProject) => ({ id: p.id }));
        } else {
            projectsToFetch = MOCK_PROJECT_IDS.slice(0, 3).map(id => ({ id }));
        }

        const results = await executeBatched(projectsToFetch, 3, async (p: { id: number }) => {
            const issues = await getIssues(p.id, token, { ...params });
            const project = await getProject(p.id, token);
            return issues.map((i: GitLabIssue) => ({
                ...i,
                projectId: i.project_id,
                createdAt: i.created_at,
                updatedAt: i.updated_at,
                avatarUrl: i.author?.avatar_url,
                author: {
                    ...i.author,
                    avatarUrl: i.author?.avatar_url
                },
                assignee: i.assignees?.[0] || null,
                project
            }));
        });
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
            logger.error('Error fetching project', e);
            return [];
        }
    } else if (params?.groupId) {
        const { getGroupProjects } = await import('@/lib/gitlab');
        try {
            projects = await getGroupProjects(Number(params.groupId), session.accessToken);
        } catch (e) {
            logger.error('Error fetching group projects', e);
            return [];
        }
    } else {
        projects = await getUserProjects();
    }

    if (projects.length === 0) return [];

    // --- TASK 3 FIX: Batch API calls to prevent thundering herd ---
    const { executeBatched } = await import('@/lib/utils');

    // Execute in batches of 3 to prevent rate limiting
    // Execute in batches of 3 to prevent rate limiting
    const results = await executeBatched(projects, 3, (p: Project) =>
        getIssues(p.id, session.accessToken!, { ...params })
            .then(issues => issues.map((i: GitLabIssue) => ({
                ...i,
                projectId: i.project_id,
                createdAt: i.created_at,
                updatedAt: i.updated_at,
                avatarUrl: i.author?.avatar_url,
                author: {
                    ...i.author,
                    avatarUrl: i.author?.avatar_url
                },
                assignee: i.assignees?.[0] || null,
                project: p
            })))
            .catch(e => {
                logger.error(`Failed to fetch issues for project ${p.id}`, e);
                return [];
            })
    );

    return results.flat().sort((a: any, b: any) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
}

export async function createIssue(projectId: number, data: unknown) {
    // Validate input data
    const parsed = safeParse(createIssueSchema, data);
    if (!parsed.success) {
        // Provide more helpful error message
        const errorMsg = parsed.error.includes('too long')
            ? `Description is too long. Please reduce the content size or remove some images. (${parsed.error})`
            : `Validation error: ${parsed.error}`;
        throw new Error(errorMsg);
    }
    const validatedData = parsed.data;

    if (isMockMode()) {
        // Simulate realistic errors that can occur in production
        const { simulateRealisticError, getProject } = await import('@/lib/gitlab');
        simulateRealisticError('write');
        const { db } = await import('@/lib/db');
        const { qaIssues, projects } = await import('@/db/schema');
        const { mapLabelToStatus, executeBatched } = await import('@/lib/utils');
        const { eq } = await import('drizzle-orm');
        const token = getMockToken();

        // Handle both 'labels' (comma-separated) and 'labelId' (single label) from form
        const issueLabels = validatedData.labels
            ? validatedData.labels.split(',').map((l: string) => l.trim()).filter((l: string) => l)
            : (validatedData.labelId ? [validatedData.labelId] : []);

        logger.mock(`Creating issue with labels`, issueLabels);

        // Ensure mock user exists in database (for foreign key constraint)
        await ensureMockUser();

        // Get project data from mock store
        const project = await getProject(projectId, token);

        // Ensure mock group exists in database (for nested foreign key constraint)
        if (project.namespace?.id) {
            await ensureMockGroup({
                id: project.namespace.id,
                name: project.namespace.name || 'Mock Group',
                fullPath: project.namespace.full_path || project.namespace.path || 'mock-group',
            });
        }

        // Ensure mock project exists in database (for foreign key constraint)
        // Validate qaLabelMapping has required properties
        const projectLabelMapping = (project.qaLabelMapping &&
            typeof project.qaLabelMapping === 'object' &&
            'pending' in project.qaLabelMapping &&
            'passed' in project.qaLabelMapping &&
            'failed' in project.qaLabelMapping)
            ? project.qaLabelMapping as { pending: string; passed: string; failed: string }
            : null;

        await ensureMockProject({
            id: projectId,
            name: project.name,
            webUrl: project.web_url,
            description: project.description,
            groupId: project.namespace?.id,
            qaLabelMapping: projectLabelMapping,
        });

        // Get next IID globally across all projects (to ensure unique IDs on board)
        const existingIssues = await db.select().from(qaIssues);
        const maxIid = existingIssues.reduce((max, issue) => Math.max(max, issue.gitlabIssueIid), 0);
        const newIid = maxIid + 1;

        // Generate a negative ID to avoid collision with real GitLab IDs
        const newId = -(Date.now());

        // Determine status from labels
        const labelMapping = (project.qaLabelMapping ?? DEFAULT_QA_LABELS) as { pending: string; passed: string; failed: string };
        const status = mapLabelToStatus(issueLabels, labelMapping) || 'pending';

        const assigneeId = validatedData.assigneeId ? Number(validatedData.assigneeId) : null;

        logger.mock(`Writing issue to DB - IID: ${newIid}, Labels: ${issueLabels.join(', ')}, AssigneeId: ${assigneeId}, Status: ${status}`);

        // Write directly to database
        try {
            await db.insert(qaIssues).values({
                gitlabIssueId: newId,
                gitlabIssueIid: newIid,
                gitlabProjectId: projectId,
                issueTitle: validatedData.title,
                issueDescription: validatedData.description || '',
                issueUrl: `https://gitlab.com/mock/issues/${newId}`,
                status,
                jsonLabels: issueLabels,
                assigneeId: assigneeId,
                authorId: SYSTEM_USERS.MOCK ? 1 : null, // Default to mock user ID 1 if in mock mode
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            logger.mock(`Created issue #${newIid} and persisted to database`);

            // Simulate webhook for new issue
            try {
                const { simulateWebhook, createIssueWebhookPayload } = await import('@/lib/gitlab');
                const webhookPayload = createIssueWebhookPayload(projectId, newIid, {
                    labels: {
                        previous: [],
                        current: issueLabels,
                    },
                });
                await simulateWebhook('Issue Hook', webhookPayload);
            } catch (error) {
                console.warn('[MOCK] Failed to simulate webhook for new issue:', error);
            }

            // Create notification for the new issue
            const { notifications } = await import('@/db/schema');
            const session = await auth();
            const userIdToNotify = session?.user?.id || SYSTEM_USERS.MOCK;

            if (assigneeId) {
                await createNotification({
                    userId: userIdToNotify,
                    type: 'assignment',
                    title: 'New Issue Assigned',
                    message: `You have been assigned to issue #${newIid}: ${validatedData.title}`,
                    resourceType: 'issue',
                    resourceId: newId.toString(),
                    actionUrl: `/${projectId}/issues/${newIid}`,
                });
            } else {
                await createNotification({
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
                logger.error(`[MOCK] Issue #${newIid} already exists in project ${projectId}, retrying with next IID...`);
                // Recursively try with next IID
                const existingIssues2 = await db.select().from(qaIssues).where(eq(qaIssues.gitlabProjectId, projectId));
                const maxIid2 = existingIssues2.reduce((max, issue) => Math.max(max, issue.gitlabIssueIid), 0);
                const retryIid = maxIid2 + 1;

                await db.insert(qaIssues).values({
                    gitlabIssueId: newId,
                    gitlabIssueIid: retryIid,
                    gitlabProjectId: projectId,
                    issueTitle: validatedData.title,
                    issueDescription: validatedData.description || '',
                    issueUrl: `https://gitlab.com/mock/issues/${newId}`,
                    status,
                    jsonLabels: issueLabels,
                    assigneeId: assigneeId,
                    authorId: SYSTEM_USERS.MOCK ? 1 : null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });

                logger.mock(`Created issue #${retryIid} on retry`);

                // Simulate webhook for new issue (retry case)
                try {
                    const { simulateWebhook, createIssueWebhookPayload } = await import('@/lib/gitlab');
                    const webhookPayload = createIssueWebhookPayload(projectId, retryIid, {
                        labels: {
                            previous: [],
                            current: issueLabels,
                        },
                    });
                    await simulateWebhook('Issue Hook', webhookPayload);
                } catch (webhookError) {
                    console.warn('[MOCK] Failed to simulate webhook for new issue (retry):', webhookError);
                }

                // Create notification for retry case too
                const { notifications } = await import('@/db/schema');
                const session = await auth();
                const userIdToNotify = session?.user?.id || SYSTEM_USERS.MOCK;

                await createNotification({
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
        return await gitlab.Issues.create(projectId, validatedData.title, {
            description: validatedData.description,
            assigneeIds: validatedData.assigneeId ? [Number(validatedData.assigneeId)] : [],
            labels: validatedData.labels,
        });
    } catch (error) {
        logger.error('Failed to create issue', error);
        throw new Error('Failed to create issue. Please try again.');
    }
}

export async function deleteIssue(projectId: number, issueIid: number) {
    // Only allow deletion in mock mode - GitLab API doesn't support issue deletion
    if (!isMockMode()) {
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

    logger.mock(`Deleted issue ${issueIid} from project ${projectId} - Memory: ${deletedFromMemory}`);

    return { success: true, deletedFromMemory };
}

export async function getProjectStats(projectIds: number[]) {
    const session = await auth();
    if (!session?.accessToken && !isMockMode()) return {};

    const stats: Record<number, { open: number; closed: number; total: number }> = {};

    if (isMockMode()) {
        const { getIssues } = await import('@/lib/gitlab');
        const token = getMockToken();
        for (const pid of projectIds) {
            const issues = await getIssues(pid, token);
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
                logger.error(`Failed to fetch stats for project ${pid}`, e);
                stats[pid] = { open: 0, closed: 0, total: 0 };
            }
        }));
    }

    return stats;
}

export async function getDashboardStats(groupId?: number) {
    const session = await auth();

    if (!isMockMode() && !session?.accessToken) {
        return { projectStats: [], timeStats: [], passRates: [], kpi: { avgTimeToTest: 0, firstTimePassRate: 0, issuesFound: 0, activeTests: 0 } };
    }

    // Imports for DB access
    const { db } = await import('@/lib/db');
    const { qaIssues, qaRuns, projects } = await import('@/db/schema');
    const { eq, desc, sql, and, inArray } = await import('drizzle-orm');
    const { subDays, format, differenceInHours, differenceInMinutes } = await import('date-fns');

    // Fetch issues and runs
    // If groupId is provided, filter by all projects in that group
    let allIssues: typeof qaIssues.$inferSelect[] = [];
    let allRuns: typeof qaRuns.$inferSelect[] = [];
    let allProjects: typeof projects.$inferSelect[] = [];

    if (groupId) {
        // Fetch all projects in the group
        const { getGroupProjects } = await import('@/lib/gitlab');
        const token = session?.accessToken || getMockToken();
        const groupProjects = await getGroupProjects(groupId, token);
        const projectIds = groupProjects.map((p: any) => p.id);

        if (projectIds.length > 0) {
            // Fetch issues from all projects in the group
            allIssues = await db.select().from(qaIssues).where(inArray(qaIssues.gitlabProjectId, projectIds));

            // Fetch runs for issues in this group
            const runsResult = await db.select({ run: qaRuns })
                .from(qaRuns)
                .innerJoin(qaIssues, eq(qaRuns.qaIssueId, qaIssues.id))
                .where(inArray(qaIssues.gitlabProjectId, projectIds));
            allRuns = runsResult.map(r => r.run);

            // Fetch project metadata
            allProjects = await db.select().from(projects).where(inArray(projects.id, projectIds));
        } else {
            allIssues = [];
            allRuns = [];
            allProjects = [];
        }
    } else {
        allIssues = await db.select().from(qaIssues);
        allRuns = await db.select().from(qaRuns);
        allProjects = await db.select().from(projects);
    }

    // 1. Project Stats (Open/Closed)
    const projectStatsMap = new Map<number, { name: string; open: number; closed: number }>();

    // Initialize with known projects
    // Fetch projects based on groupId context
    let targetProjects: any[];
    if (groupId) {
        // Fetch all projects in the group
        const { getGroupProjects } = await import('@/lib/gitlab');
        const token = session?.accessToken || getMockToken();
        targetProjects = await getGroupProjects(groupId, token);
    } else {
        // Global stats - get all user projects
        targetProjects = await getUserProjects();
    }

    targetProjects.forEach((p: any) => {
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
    // Active Tests (Pending Issues)
    const activeTests = allIssues.filter(i => i.status === 'pending').length;

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
