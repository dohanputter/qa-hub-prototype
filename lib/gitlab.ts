
import 'server-only';
import { Gitlab } from '@gitbeaker/rest';
import { env } from '@/lib/env';
import { isMockMode } from '@/lib/mode';
import { logger } from '@/lib/logger';

// Import mock data from modular structure
import {
    MOCK_GROUPS,
    MOCK_PROJECTS,
    MOCK_USERS,
    MOCK_LABELS,
    MOCK_PROJECT_USERS,
    MOCK_ISSUES,
    MOCK_SNIPPETS,
    USER_MOCK_PERMISSIONS,
} from '@/lib/gitlab/mock-data';

// Import simulation utilities
import {
    simulateRealisticError,
    updateDataTimestamps,
    isMockTokenExpired,
    simulateWebhook,
    createIssueWebhookPayload,
} from '@/lib/gitlab/simulation';

// Re-export for backwards compatibility
export {
    simulateRealisticError,
    simulateWebhook,
    createIssueWebhookPayload,
};

// Global type declarations for mock data
declare global {
    var mockIssuesStore: Record<number, any[]> | undefined;
}

// Mutable store for mock issues (so we can update labels in mock mode)
// We use a global variable here to simulate persistence in memory during the session
let mockIssuesStore = JSON.parse(JSON.stringify(MOCK_ISSUES));
let mockSnippetsStore = JSON.parse(JSON.stringify(MOCK_SNIPPETS));

export const getAllMockIssues = () => mockIssuesStore;

// --- HELPER FUNCTIONS ---

// Re-export isMock for backwards compatibility
export const isMock = isMockMode;

export function getGitlabClient(token: string) {
    return new Gitlab({
        token,
        host: env.GITLAB_BASE_URL,
    });
}

// --- API METHODS ---

export const getAccessibleProjects = async (token: string, userEmail?: string) => {
    if (isMock()) {
        // In mock mode, filter by user's mock permissions if email is provided
        if (userEmail && USER_MOCK_PERMISSIONS[userEmail]) {
            const allowedIds = USER_MOCK_PERMISSIONS[userEmail];
            return MOCK_PROJECTS.filter(p => allowedIds.includes(p.id));
        }
        // If no email or no permissions defined, return all mock projects (or empty if strict)
        // For now, default to all for easier testing if email is missing
        return MOCK_PROJECTS;
    }
    try {
        const gitlab = getGitlabClient(token);
        return await gitlab.Projects.all({ membership: true, simple: true });
    } catch (error) {
        console.error('GitLab API Error (getAccessibleProjects):', error);
        throw new Error('Failed to fetch projects from GitLab');
    }
};

export const getUserGroups = async (token: string) => {
    if (isMock()) return MOCK_GROUPS;
    try {
        const gitlab = getGitlabClient(token);
        // Use minAccessLevel to filter groups where user is a member
        return await gitlab.Groups.all({ minAccessLevel: 10 } as any);
    } catch (error) {
        console.error('GitLab API Error (getUserGroups):', error);
    }
};

export const getGroup = async (groupId: number, token: string) => {
    if (isMock()) {
        return MOCK_GROUPS.find(g => g.id === Number(groupId)) || MOCK_GROUPS[0];
    }
    try {
        const gitlab = getGitlabClient(token);
        return await gitlab.Groups.show(groupId);
    } catch (error) {
        console.error('GitLab API Error (getGroup):', error);
        throw new Error('Failed to fetch group details');
    }
};

export const getGroupProjects = async (groupId: number, token: string) => {
    if (isMock()) {
        return MOCK_PROJECTS.filter(p => p.namespace.id === Number(groupId));
    }
    try {
        const gitlab = getGitlabClient(token);
        // Groups API supports listing projects
        return await (gitlab.Groups as any).projects.all(groupId);
    } catch (error) {
        console.error('GitLab API Error (getGroupProjects):', error);
        throw new Error('Failed to fetch group projects');
    }
};

export const getProject = async (projectId: number, token: string) => {
    if (isMock()) {
        return MOCK_PROJECTS.find(p => p.id === Number(projectId)) || MOCK_PROJECTS[0];
    }
    try {
        const gitlab = getGitlabClient(token);
        return await gitlab.Projects.show(projectId);
    } catch (error) {
        console.error('GitLab API Error (getProject):', error);
        throw new Error('Failed to fetch project details');
    }
};

export const getProjectLabels = async (projectId: number, token: string) => {
    if (isMock()) return MOCK_LABELS[projectId] || MOCK_LABELS[500];
    try {
        const gitlab = getGitlabClient(token);
        return await gitlab.ProjectLabels.all(projectId);
    } catch (error) {
        console.error('GitLab API Error (getProjectLabels):', error);
        throw new Error('Failed to fetch project labels');
    }
};

export const getProjectMembers = async (projectId: number, token: string) => {
    if (isMock()) {
        return MOCK_PROJECT_USERS[projectId] || MOCK_USERS;
    }
    try {
        const gitlab = getGitlabClient(token);
        return await gitlab.ProjectMembers.all(projectId);
    } catch (error) {
        console.error('GitLab API Error (getProjectMembers):', error);
        throw new Error('Failed to fetch project members');
    }
};

export const getIssues = async (projectId: number, token: string, params?: { state?: 'opened' | 'closed'; labels?: string; search?: string }) => {
    // Check token expiration for mock mode
    if (isMockTokenExpired(token)) {
        throw new Error('Access token expired. Please re-authenticate.');
    }

    // Enforce rate limiting
    const { enforceGitLabAPIRateLimit } = await import('@/lib/rateLimit');
    await enforceGitLabAPIRateLimit(token);

    if (isMock()) {
        // Simulate realistic errors that can occur in production
        simulateRealisticError('read');

        // Simulate data evolution over time
        updateDataTimestamps();

        // In mock mode, database acts as "GitLab" - read directly from it
        try {
            const { db } = await import('@/lib/db');
            const { qaIssues, projects } = await import('@/db/schema');
            const { sql, eq } = await import('drizzle-orm');

            logger.mock(`getIssues: Querying DB for Project ${projectId}`);

            // Fetch ALL issues from database for this project (DB is our "GitLab")
            const dbIssues = await db.select().from(qaIssues).where(sql`gitlab_project_id = ${projectId}`);

            logger.mock(`getIssues: Found ${dbIssues.length} issues in database for project ${projectId}`);

            // Build GitLab-like issue objects directly from database
            const issues = dbIssues.map((dbIssue) => {
                // Get labels from jsonLabels column (or default to empty array)
                const labels = (dbIssue.jsonLabels && Array.isArray(dbIssue.jsonLabels))
                    ? dbIssue.jsonLabels as string[]
                    : [];

                // Get assignee if assigneeId exists
                const assignees = dbIssue.assigneeId
                    ? [MOCK_USERS.find(u => u.id === dbIssue.assigneeId) || MOCK_USERS[0]]
                    : [];

                return {
                    id: dbIssue.gitlabIssueId,
                    iid: dbIssue.gitlabIssueIid,
                    project_id: dbIssue.gitlabProjectId,
                    title: dbIssue.issueTitle,
                    description: dbIssue.issueDescription || '',
                    state: 'opened', // Could be extended to track open/closed in DB
                    created_at: dbIssue.createdAt?.toISOString() || new Date().toISOString(),
                    updated_at: dbIssue.updatedAt?.toISOString() || new Date().toISOString(),
                    author: dbIssue.authorId ? (MOCK_USERS.find(u => u.id === dbIssue.authorId) || MOCK_USERS[0]) : MOCK_USERS[0],
                    assignees: assignees,
                    labels: labels,
                    web_url: dbIssue.issueUrl,
                };
            });

            // Apply filters (simulating GitLab API filtering)
            let filteredIssues = issues;

            if (params?.state) {
                filteredIssues = filteredIssues.filter((i: any) => i.state === params.state);
            }

            if (params?.labels) {
                const requestedLabels = params.labels.split(',');
                filteredIssues = filteredIssues.filter((i: any) =>
                    requestedLabels.some(label => i.labels.includes(label))
                );
            }

            if (params?.search) {
                const searchLower = params.search.toLowerCase();
                filteredIssues = filteredIssues.filter((i: any) =>
                    i.title.toLowerCase().includes(searchLower) ||
                    (i.description && i.description.toLowerCase().includes(searchLower))
                );
            }

            logger.mock(`getIssues: Returning ${filteredIssues.length} issues after filtering`);
            return filteredIssues;

        } catch (error) {
            console.error('[MOCK] Failed to fetch issues from database:', error);
            return []; // Return empty array on error
        }
    }
    try {
        const gitlab = getGitlabClient(token);
        return await gitlab.Issues.all({
            projectId,
            state: params?.state || 'opened',
            labels: params?.labels,
            search: params?.search
        });
    } catch (error) {
        console.error('GitLab API Error (getIssues):', error);
        throw new Error('Failed to fetch issues');
    }
};

export const getIssue = async (projectId: number, issueIid: number, token: string) => {
    if (isMock()) {
        // In mock mode, database acts as "GitLab" - read directly from it
        try {
            const { db } = await import('@/lib/db');
            const { qaIssues, projects } = await import('@/db/schema');
            const { eq, sql } = await import('drizzle-orm');

            logger.mock(`getIssue: Querying DB for Project ${projectId}, Issue IID ${issueIid}`);

            const dbIssues = await db.select()
                .from(qaIssues)
                .where(sql`gitlab_project_id = ${projectId} AND gitlab_issue_iid = ${issueIid}`)
                .limit(1);

            logger.mock(`getIssue: Found ${dbIssues.length} issues`);

            if (dbIssues.length === 0) {
                logger.mock(`getIssue: Issue #${issueIid} not found in database, checking mock store`);

                // Fallback: Check if issue exists in in-memory mock store but not yet in DB
                const mockIssue = mockIssuesStore.find((i: any) => i.project_id === projectId && i.iid === issueIid);

                if (mockIssue) {
                    logger.mock(`getIssue: Found issue #${issueIid} in mock store, syncing to DB`);

                    // Determine status from labels if possible
                    const projectResults = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
                    const project = projectResults[0];
                    const { mapLabelToStatus } = await import('@/lib/utils');
                    const status = project?.qaLabelMapping
                        ? (mapLabelToStatus(mockIssue.labels, project.qaLabelMapping) || 'pending')
                        : 'pending';

                    // Insert into DB
                    const [createdIssue] = await db.insert(qaIssues).values({
                        gitlabIssueId: mockIssue.id,
                        gitlabIssueIid: mockIssue.iid,
                        gitlabProjectId: mockIssue.project_id,
                        issueTitle: mockIssue.title,
                        issueDescription: mockIssue.description || '',
                        issueUrl: mockIssue.web_url,
                        status: status,
                        jsonLabels: mockIssue.labels,
                        assigneeId: mockIssue.assignees?.[0]?.id || null,
                        authorId: mockIssue.author?.id || null,
                        createdAt: new Date(mockIssue.created_at),
                        updatedAt: new Date(mockIssue.updated_at),
                    }).returning();

                    logger.mock(`getIssue: Synced issue #${issueIid} to DB`);

                    // Return the mock issue structure directly
                    return {
                        id: createdIssue.gitlabIssueId,
                        iid: createdIssue.gitlabIssueIid,
                        project_id: createdIssue.gitlabProjectId,
                        title: createdIssue.issueTitle,
                        description: createdIssue.issueDescription || '',
                        state: 'opened',
                        created_at: createdIssue.createdAt?.toISOString() || new Date().toISOString(),
                        updated_at: createdIssue.updatedAt?.toISOString() || new Date().toISOString(),
                        author: MOCK_USERS[0],
                        assignees: mockIssue.assignees,
                        labels: mockIssue.labels,
                        web_url: createdIssue.issueUrl,
                    };
                }

                logger.mock(`getIssue: Issue #${issueIid} not found in database or mock store`);
                return null;
            }

            const dbIssue = dbIssues[0];

            // Get labels from jsonLabels column
            const labels = (dbIssue.jsonLabels && Array.isArray(dbIssue.jsonLabels))
                ? dbIssue.jsonLabels as string[]
                : [];

            // Get assignee if assigneeId exists
            const assignees = dbIssue.assigneeId
                ? [MOCK_USERS.find(u => u.id === dbIssue.assigneeId) || MOCK_USERS[0]]
                : [];

            // Build GitLab-like issue object from database
            const issue = {
                id: dbIssue.gitlabIssueId,
                iid: dbIssue.gitlabIssueIid,
                project_id: dbIssue.gitlabProjectId,
                title: dbIssue.issueTitle,
                description: dbIssue.issueDescription || '',
                state: 'opened',
                created_at: dbIssue.createdAt?.toISOString() || new Date().toISOString(),
                updated_at: dbIssue.updatedAt?.toISOString() || new Date().toISOString(),
                author: dbIssue.authorId ? (MOCK_USERS.find(u => u.id === dbIssue.authorId) || MOCK_USERS[0]) : MOCK_USERS[0],
                assignees: assignees,
                labels: labels,
                web_url: dbIssue.issueUrl,
            };

            logger.mock(`getIssue: Returning issue #${issueIid} from database with labels: ${labels.join(', ')}`);
            return issue;

        } catch (error) {
            console.error('[MOCK] Failed to fetch issue from database:', error);
            return null;
        }
    }
    try {
        const gitlab = getGitlabClient(token);
        return await gitlab.Issues.show(projectId, issueIid as any);
    } catch (error) {
        console.error('GitLab API Error (getIssue):', error);
        throw new Error('Failed to fetch issue details');
    }
};

export const updateIssueLabels = async (
    projectId: number,
    issueIid: number,
    token: string,
    options: { addLabels?: string[]; removeLabels?: string[] }
) => {
    // Check token expiration for mock mode
    if (isMockTokenExpired(token)) {
        throw new Error('Access token expired. Please re-authenticate.');
    }

    // Enforce rate limiting
    const { enforceGitLabAPIRateLimit } = await import('@/lib/rateLimit');
    await enforceGitLabAPIRateLimit(token);

    if (isMock()) {
        // Simulate realistic errors that can occur in production
        simulateRealisticError('write');

        // Simulate data evolution over time
        updateDataTimestamps();

        logger.mock(`Updating labels for issue ${issueIid} in project ${projectId}`, options);

        try {
            const { db } = await import('@/lib/db');
            const { qaIssues, qaRuns, projects, qaBlockers } = await import('@/db/schema');
            const { eq, and, desc } = await import('drizzle-orm');
            const { mapLabelToStatus } = await import('@/lib/utils');

            // First, read current state from DB
            const existingIssues = await db.select().from(qaIssues).where(and(
                eq(qaIssues.gitlabProjectId, projectId),
                eq(qaIssues.gitlabIssueIid, issueIid)
            )).limit(1);

            let existingIssue;
            let oldStatus: 'pending' | 'passed' | 'failed' | null = null;
            let currentLabels: string[] = [];
            let oldLabels: string[] = [];

            if (existingIssues.length === 0) {
                logger.mock(`updateIssueLabels: Issue ${issueIid} not found in database, fetching and creating`);

                // Get issue details from GitLab/mock to create the record
                const issue = await getIssue(projectId, issueIid, 'mock-token');

                if (!issue) {
                    console.error(`[MOCK] Could not fetch issue ${issueIid} from GitLab`);
                    return { success: false };
                }

                // Apply label changes to get updated label list
                // Handle both string[] and label object[] formats
                let issueLabels = Array.isArray(issue.labels)
                    ? issue.labels.map((l: any) => typeof l === 'string' ? l : l.name || l)
                    : [];

                if (options.removeLabels) {
                    issueLabels = issueLabels.filter((l: string) => !options.removeLabels!.includes(l));
                }
                if (options.addLabels) {
                    issueLabels = [...issueLabels, ...options.addLabels.filter((l: string) => !issueLabels.includes(l))];
                }

                // Get project QA label mapping
                const projectResults = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
                const project = projectResults[0];

                if (!project?.qaLabelMapping) {
                    console.error(`[MOCK] Project ${projectId} has no QA label mapping`);
                    return { success: false };
                }

                // Determine status from updated labels (don't default to pending if no QA label)
                const newStatus = mapLabelToStatus(issueLabels, project.qaLabelMapping) || oldStatus || 'pending';

                // Create the issue in qa_issues table
                const [created] = await db.insert(qaIssues).values({
                    gitlabIssueId: issue.id,
                    gitlabIssueIid: issue.iid,
                    gitlabProjectId: projectId,
                    issueTitle: issue.title,
                    issueDescription: issue.description || '',
                    issueUrl: issue.web_url,
                    status: newStatus,
                    jsonLabels: issueLabels,
                    assigneeId: issue.assignees?.[0]?.id || null,
                    authorId: issue.author?.id || null,
                    createdAt: new Date(issue.created_at),
                    updatedAt: new Date(),
                }).returning();

                existingIssue = created;
                oldStatus = null; // New issue, no old status
                currentLabels = issueLabels;

                logger.mock(`updateIssueLabels: Created new issue #${issueIid} with status ${newStatus}, labels: ${issueLabels.join(', ')}`);
            } else {
                existingIssue = existingIssues[0];
                oldStatus = existingIssue.status;

                // Get current labels from DB
                if (existingIssue.jsonLabels && Array.isArray(existingIssue.jsonLabels)) {
                    currentLabels = [...existingIssue.jsonLabels] as string[];
                }

                logger.mock(`updateIssueLabels: Current labels`, currentLabels);

                // Store old labels for webhook simulation
                const oldLabels = [...currentLabels];

                // Apply label changes
                if (options.removeLabels) {
                    currentLabels = currentLabels.filter((l: string) => !options.removeLabels!.includes(l));
                }
                if (options.addLabels) {
                    currentLabels = [...currentLabels, ...options.addLabels.filter((l: string) => !currentLabels.includes(l))];
                }

                logger.mock(`updateIssueLabels: Updated labels`, currentLabels);

                // Get project QA label mapping
                const projectResults = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
                const project = projectResults[0];

                if (!project?.qaLabelMapping) {
                    console.error(`[MOCK] Project ${projectId} has no QA label mapping`);
                    logger.error(`[MOCK] Project ${projectId} has no QA label mapping`);
                    return { success: false };
                }

                // Determine new status from labels (preserve old status if no QA label found)
                const newStatus = mapLabelToStatus(currentLabels, project.qaLabelMapping) || oldStatus;
                logger.mock(`updateIssueLabels: Status change ${oldStatus} -> ${newStatus}`);

                // Update the database with new labels and status
                await db.update(qaIssues).set({
                    status: newStatus,
                    jsonLabels: currentLabels,
                    updatedAt: new Date(),
                }).where(eq(qaIssues.id, existingIssue.id));

                logger.mock(`updateIssueLabels: Updated issue #${issueIid} - Labels: ${currentLabels.join(', ')}, Status: ${newStatus}`);
            }

            // Check for blocker label and create/ensure blocker exists
            if (currentLabels.some((l: string) => l.toLowerCase().includes('blocker'))) {
                const existingBlocker = await db.query.qaBlockers.findFirst({
                    where: eq(qaBlockers.relatedIssueId, existingIssue.id)
                });

                if (!existingBlocker) {
                    await db.insert(qaBlockers).values({
                        projectId: projectId,
                        title: existingIssue.issueTitle,
                        description: {
                            type: 'doc',
                            content: [{
                                type: 'paragraph',
                                content: [{ type: 'text', text: existingIssue.issueDescription || '' }]
                            }]
                        },
                        severity: 'medium',
                        blockingWhat: 'testing',
                        status: 'active',
                        relatedIssueId: existingIssue.id,
                    });
                    logger.mock(`updateIssueLabels: Created blocker for issue #${issueIid}`);
                }
            }

            // Recalculate status after all updates (preserve old status if no QA label)
            const projectResults2 = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
            const project2 = projectResults2[0];
            const finalStatus = project2?.qaLabelMapping ? (mapLabelToStatus(currentLabels, project2.qaLabelMapping) || oldStatus || 'pending') : (oldStatus || 'pending');

            // Handle Run Logic - REMOVED to avoid double-handling and ensure single source of truth
            // QA Run logic is now handled explicitly in board actions or submitQARun
            logger.mock(`updateIssueLabels: Status updated to ${finalStatus}, run logic handled by caller`);

            // Simulate webhook for issue update
            if (oldLabels.length !== currentLabels.length || !oldLabels.every((l, i) => l === currentLabels[i])) {
                const webhookPayload = createIssueWebhookPayload(projectId, issueIid, {
                    labels: {
                        previous: oldLabels,
                        current: currentLabels,
                    },
                });
                await simulateWebhook('Issue Hook', webhookPayload);
            }

            // Revalidate to refresh UI
            const { revalidatePath } = await import('next/cache');
            revalidatePath('/issues');
            revalidatePath('/board');
            revalidatePath(`/${projectId}`);

            return { success: true };
        } catch (error) {
            console.error('[MOCK] Failed to update labels in database:', error);
            return { success: false };
        }
    }
    try {
        const gitlab = getGitlabClient(token);
        return await gitlab.Issues.edit(projectId, issueIid, {
            addLabels: options.addLabels?.join(','),
            removeLabels: options.removeLabels?.join(','),
        });
    } catch (error) {
        console.error('GitLab API Error (updateIssueLabels):', error);
        throw new Error('Failed to update issue labels');
    }
};

export const createIssueNote = async (projectId: number, issueIid: number, token: string, body: string) => {
    if (isMock()) {
        logger.mock(`Creating note for issue ${issueIid} in project ${projectId}`, body);
        return {
            id: Math.floor(Math.random() * 1000),
            body,
            created_at: new Date().toISOString(),
            author: MOCK_USERS[0]
        };
    }
    try {
        const gitlab = getGitlabClient(token);
        return await gitlab.IssueNotes.create(projectId, issueIid, body);
    } catch (error) {
        console.error('GitLab API Error (createIssueNote):', error);
        throw new Error('Failed to create issue comment');
    }
};

export async function uploadAttachmentToGitLab(projectId: number, token: string, file: File) {
    if (isMock()) {
        logger.mock(`Uploading file to project ${projectId}: ${file.name}`);

        // For images, create a data URL to avoid CORS issues
        if (file.type.startsWith('image/')) {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const base64 = Buffer.from(arrayBuffer).toString('base64');
                const dataUrl = `data:${file.type};base64,${base64}`;

                // Return both data URL (for display) and a placeholder URL (for GitLab markdown)
                const placeholderUrl = `https://via.placeholder.com/150?text=${encodeURIComponent(file.name.substring(0, 15))}`;
                return {
                    url: dataUrl, // Use data URL for immediate display
                    markdown: `![${file.name}](${placeholderUrl})` // Use placeholder for GitLab compatibility
                };
            } catch (error) {
                console.error('Error creating data URL:', error);
                // Fallback to placeholder URL
                const placeholderUrl = `https://via.placeholder.com/150?text=${encodeURIComponent(file.name.substring(0, 15))}`;
                return {
                    url: placeholderUrl,
                    markdown: `![${file.name}](${placeholderUrl})`
                };
            }
        }

        // For non-images, use placeholder URL
        const placeholderUrl = `https://via.placeholder.com/150?text=${encodeURIComponent(file.name.substring(0, 15))}`;
        return {
            url: placeholderUrl,
            markdown: `![${file.name}](${placeholderUrl})`
        };
    }
    try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const gitlab = getGitlabClient(token);
        const upload = await (gitlab.Projects as any).upload(projectId, { filename: file.name, content: buffer });

        const fullUrl = upload.url.startsWith('http')
            ? upload.url
            : `${env.GITLAB_BASE_URL.replace(/\/$/, '')}${upload.url}`;

        return { url: fullUrl, markdown: upload.markdown };
    } catch (error) {
        console.error('GitLab API Error (uploadAttachmentToGitLab):', error);
        throw new Error('Failed to upload file to GitLab');
    }
}

export async function createProjectWebhook(projectId: number, token: string) {
    if (isMock()) {
        logger.mock(`Creating webhook for project ${projectId}`);
        return { id: 123, url: 'http://mock-webhook-url' };
    }
    try {
        const gitlab = getGitlabClient(token);
        const webhookUrl = `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/gitlab`;

        return await gitlab.ProjectHooks.add(projectId, webhookUrl, {
            token: env.WEBHOOK_SECRET,
            issuesEvents: true,
            noteEvents: true,
            pushEvents: false,
            mergeRequestsEvents: false,
            enableSslVerification: true,
        });
    } catch (error) {
        console.error('GitLab API Error (createProjectWebhook):', error);
        throw new Error('Failed to create webhook');
    }
}

// --- NEW MOCK MUTATION METHODS ---

export const createMockIssue = (issueData: any) => {
    // Use NEGATIVE IDs to avoid collision with real GitLab IDs (always positive)
    const existingMockIds = mockIssuesStore.map((i: any) => i.id).filter((id: number) => id < 0);
    const newId = existingMockIds.length > 0 ? Math.min(...existingMockIds) - 1 : -1;
    const newIid = Math.max(0, ...mockIssuesStore.filter((i: any) => i.project_id === issueData.project_id).map((i: any) => i.iid)) + 1;

    const newIssue = {
        id: newId,
        iid: newIid,
        project_id: issueData.project_id,
        title: issueData.title,
        description: issueData.description,
        state: 'opened',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        author: MOCK_USERS[0], // Current mock user
        assignees: issueData.assignee_id ? [MOCK_USERS.find(u => u.id === issueData.assignee_id)] : [],
        labels: issueData.labels || [],
        web_url: `https://gitlab.com/mock/issues/${newId}`
    };

    mockIssuesStore.unshift(newIssue);
    return newIssue;
};

export const deleteMockIssue = (projectId: number, issueIid: number) => {
    const initialLength = mockIssuesStore.length;
    mockIssuesStore = mockIssuesStore.filter(
        (i: any) => !(i.project_id === Number(projectId) && i.iid === Number(issueIid))
    );
    const deleted = mockIssuesStore.length < initialLength;
    if (deleted) {
        logger.mock(`Deleted issue ${issueIid} from project ${projectId}`);
    }
    return deleted;
};

// --- SNIPPET METHODS ---

export const getMockSnippets = () => mockSnippetsStore;

export const createMockSnippet = (snippet: any) => {
    const newSnippet = {
        ...snippet,
        id: Math.max(0, ...mockSnippetsStore.map((s: any) => s.id)) + 1,
        updatedAt: new Date().toISOString()
    };
    mockSnippetsStore.unshift(newSnippet);
    return newSnippet;
};

export const updateMockSnippet = (snippet: any) => {
    const index = mockSnippetsStore.findIndex((s: any) => s.id === snippet.id);
    if (index !== -1) {
        mockSnippetsStore[index] = { ...mockSnippetsStore[index], ...snippet, updatedAt: new Date().toISOString() };
        return mockSnippetsStore[index];
    }
    return null;
};

export const deleteMockSnippet = (id: number) => {
    mockSnippetsStore = mockSnippetsStore.filter((s: any) => s.id !== id);
    return true;
};
