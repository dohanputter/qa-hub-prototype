
import 'server-only';
import { Gitlab } from '@gitbeaker/rest';
import { env } from '@/lib/env';

// --- MOCK DATA CONSTANTS ---

const MOCK_GROUPS = [
    {
        id: 10,
        name: 'Acme Corporation',
        full_path: 'acme-corp',
        description: 'Main QA Hub organization with all core projects',
        web_url: 'https://gitlab.com/groups/acme-corp',
        avatar_url: 'https://picsum.photos/48/48?random=10',
    },
    {
        id: 11,
        name: 'Platform Engineering',
        full_path: 'acme-corp/platform',
        description: 'DevOps, CI/CD, and infrastructure projects',
        web_url: 'https://gitlab.com/groups/acme-corp/platform',
        avatar_url: 'https://picsum.photos/48/48?random=11',
    },
    {
        id: 12,
        name: 'Mobile Division',
        full_path: 'acme-corp/mobile',
        description: 'Mobile application projects (iOS and Android)',
        web_url: 'https://gitlab.com/groups/acme-corp/mobile',
        avatar_url: 'https://picsum.photos/48/48?random=12',
    },
];

const MOCK_PROJECTS = [
    {
        id: 500,
        name: 'Frontend / Web App',
        description: 'Main customer facing application',
        path_with_namespace: 'acme-corp/frontend',
        web_url: 'https://gitlab.com/acme-corp/frontend',
        avatar_url: null,
        star_count: 12,
        forks_count: 4,
        last_activity_at: new Date().toISOString(),
        namespace: {
            id: 10,
            name: 'Acme Corporation',
            path: 'acme-corp',
            kind: 'group',
            full_path: 'acme-corp',
        },
        qaLabelMapping: {
            pending: 'qa::ready',
            passed: 'qa::passed',
            failed: 'qa::failed',
        },
    },
    {
        id: 501,
        name: 'Backend / API',
        description: 'Core API services and database',
        path_with_namespace: 'acme-corp/backend',
        web_url: 'https://gitlab.com/acme-corp/backend',
        avatar_url: null,
        star_count: 8,
        forks_count: 2,
        last_activity_at: new Date(Date.now() - 86400000).toISOString(),
        namespace: {
            id: 10,
            name: 'Acme Corporation',
            path: 'acme-corp',
            kind: 'group',
            full_path: 'acme-corp',
        },
        qaLabelMapping: {
            pending: 'qa::ready',
            passed: 'qa::passed',
            failed: 'qa::failed',
        },
    },
    {
        id: 502,
        name: 'Mobile / iOS',
        description: 'Native iOS Application',
        path_with_namespace: 'acme-corp/mobile-ios',
        web_url: 'https://gitlab.com/acme-corp/mobile-ios',
        avatar_url: null,
        star_count: 5,
        forks_count: 1,
        last_activity_at: new Date(Date.now() - 172800000).toISOString(),
        namespace: {
            id: 12,
            name: 'Mobile Division',
            path: 'mobile',
            kind: 'group',
            full_path: 'acme-corp/mobile',
        },
        qaLabelMapping: {
            pending: 'qa::ready',
            passed: 'qa::passed',
            failed: 'qa::failed',
        },
    },
];

const MOCK_USERS = [
    { id: 1, name: 'Jane Doe', username: 'jdoe', state: 'active', avatar_url: 'https://picsum.photos/32/32?random=1', web_url: 'https://gitlab.com/jdoe' },
    { id: 2, name: 'John Smith', username: 'jsmith', state: 'active', avatar_url: 'https://picsum.photos/32/32?random=2', web_url: 'https://gitlab.com/jsmith' },
    { id: 3, name: 'QA Lead', username: 'qalead', state: 'active', avatar_url: 'https://picsum.photos/32/32?random=3', web_url: 'https://gitlab.com/qalead' },
    { id: 4, name: 'Sarah Connor', username: 'sconnor', state: 'active', avatar_url: 'https://picsum.photos/32/32?random=4', web_url: 'https://gitlab.com/sconnor' },
    { id: 5, name: 'Michael Chen', username: 'mchen', state: 'active', avatar_url: 'https://picsum.photos/32/32?random=5', web_url: 'https://gitlab.com/mchen' },
    { id: 6, name: 'Emily Davis', username: 'edavis', state: 'active', avatar_url: 'https://picsum.photos/32/32?random=6', web_url: 'https://gitlab.com/edavis' },
    { id: 7, name: 'David Wilson', username: 'dwilson', state: 'active', avatar_url: 'https://picsum.photos/32/32?random=7', web_url: 'https://gitlab.com/dwilson' },
    { id: 8, name: 'Olivia Martinez', username: 'omartinez', state: 'active', avatar_url: 'https://picsum.photos/32/32?random=8', web_url: 'https://gitlab.com/omartinez' },
    { id: 9, name: 'James Rodriguez', username: 'jrodriguez', state: 'active', avatar_url: 'https://picsum.photos/32/32?random=9', web_url: 'https://gitlab.com/jrodriguez' },
    { id: 10, name: 'Sophia Anderson', username: 'sanderson', state: 'active', avatar_url: 'https://picsum.photos/32/32?random=10', web_url: 'https://gitlab.com/sanderson' },
    { id: 11, name: 'Lucas Brown', username: 'lbrown', state: 'active', avatar_url: 'https://picsum.photos/32/32?random=11', web_url: 'https://gitlab.com/lbrown' },
    { id: 12, name: 'Mia White', username: 'mwhite', state: 'active', avatar_url: 'https://picsum.photos/32/32?random=12', web_url: 'https://gitlab.com/mwhite' },
    { id: 13, name: 'Alexander Hall', username: 'ahall', state: 'active', avatar_url: 'https://picsum.photos/32/32?random=13', web_url: 'https://gitlab.com/ahall' },
    { id: 14, name: 'Charlotte King', username: 'cking', state: 'active', avatar_url: 'https://picsum.photos/32/32?random=14', web_url: 'https://gitlab.com/cking' },
    { id: 15, name: 'Benjamin Wright', username: 'bwright', state: 'active', avatar_url: 'https://picsum.photos/32/32?random=15', web_url: 'https://gitlab.com/bwright' },
];

const MOCK_LABELS = [
    { id: 1, name: 'bug', color: '#dc2626', text_color: '#fff', description: 'Something is not working' },
    { id: 2, name: 'feature', color: '#2563eb', text_color: '#fff', description: 'New functionality' },
    { id: 3, name: 'critical', color: '#7f1d1d', text_color: '#fff', description: 'Critical severity' },
    { id: 4, name: 'frontend', color: '#0891b2', text_color: '#fff', description: 'Frontend related' },
    { id: 5, name: 'backend', color: '#6366f1', text_color: '#fff', description: 'Backend related' },
    { id: 6, name: 'qa::ready', color: '#f59e0b', text_color: '#fff', description: 'Ready for QA' },
    { id: 7, name: 'qa::passed', color: '#10b981', text_color: '#fff', description: 'QA Passed' },
    { id: 8, name: 'qa::failed', color: '#ef4444', text_color: '#fff', description: 'QA Failed' },
];

const MOCK_ISSUES = [
    {
        id: 101,
        iid: 1,
        project_id: 500,
        title: 'Fix login page crash on mobile safari',
        description: 'When a user tries to login via Safari on iOS 16, the page freezes.',
        state: 'opened',
        created_at: '2023-10-25T10:00:00Z',
        updated_at: '2023-10-26T14:30:00Z',
        author: MOCK_USERS[1],
        assignees: [MOCK_USERS[0]],
        labels: ['bug', 'frontend'],
        web_url: 'https://gitlab.com/acme-corp/frontend/-/issues/1',
    },
    {
        id: 102,
        iid: 2,
        project_id: 500,
        title: 'Implement Dark Mode toggle',
        description: 'Add a toggle in the user settings to switch between light and dark themes.',
        state: 'opened',
        created_at: '2023-10-20T09:00:00Z',
        updated_at: '2023-10-25T11:00:00Z',
        author: MOCK_USERS[2],
        assignees: [MOCK_USERS[1]],
        labels: ['feature', 'frontend'],
        web_url: 'https://gitlab.com/acme-corp/frontend/-/issues/2',
    },
    {
        id: 103,
        iid: 3,
        project_id: 500,
        title: 'API rate limiting middleware',
        description: 'Ensure users cannot exceed 100 req/min.',
        state: 'opened',
        created_at: '2023-10-27T15:00:00Z',
        updated_at: '2023-10-27T15:00:00Z',
        author: MOCK_USERS[0],
        assignees: [],
        labels: ['feature'],
        web_url: 'https://gitlab.com/acme-corp/frontend/-/issues/3',
    },
    {
        id: 104,
        iid: 4,
        project_id: 500,
        title: 'Legacy data migration script',
        description: 'Migrate old user table to new schema.',
        state: 'closed',
        created_at: '2023-09-15T10:00:00Z',
        updated_at: '2023-09-20T14:30:00Z',
        author: MOCK_USERS[0],
        assignees: [MOCK_USERS[2]],
        labels: [],
        web_url: 'https://gitlab.com/acme-corp/frontend/-/issues/4',
    },
    {
        id: 105,
        iid: 5,
        project_id: 500,
        title: 'Update payment gateway API key',
        description: 'Key expired, need to rotate.',
        state: 'opened',
        created_at: '2023-10-28T08:00:00Z',
        updated_at: '2023-10-28T08:30:00Z',
        author: MOCK_USERS[2],
        assignees: [MOCK_USERS[0]],
        labels: ['critical'],
        web_url: 'https://gitlab.com/acme-corp/frontend/-/issues/5',
    },
];

const MOCK_SNIPPETS = [
    {
        id: 1,
        title: 'Login Test Case',
        content: '1. Go to login page\n2. Enter valid credentials\n3. Click Login\n4. Verify dashboard loads',
        type: 'test_case',
        updatedAt: new Date().toISOString()
    },
    {
        id: 2,
        title: 'Bug Report Template',
        content: '### Steps to Reproduce\n1. \n2. \n\n### Expected Behavior\n\n### Actual Behavior',
        type: 'issue',
        updatedAt: new Date().toISOString()
    }
];

// Mutable store for mock issues (so we can update labels in mock mode)
// We use a global variable here to simulate persistence in memory during the session
let mockIssuesStore = JSON.parse(JSON.stringify(MOCK_ISSUES));
let mockSnippetsStore = JSON.parse(JSON.stringify(MOCK_SNIPPETS));

export const getAllMockIssues = () => mockIssuesStore;

// --- HELPER FUNCTIONS ---

const isMock = () => process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

export function getGitlabClient(token: string) {
    return new Gitlab({
        token,
        host: env.GITLAB_BASE_URL,
    });
}

// --- API METHODS ---

export const getAccessibleProjects = async (token: string) => {
    if (isMock()) return MOCK_PROJECTS;
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
        throw new Error('Failed to fetch groups from GitLab');
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
    if (isMock()) return MOCK_LABELS;
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
        return MOCK_USERS;
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
    if (isMock()) {
        // In mock mode, database acts as "GitLab" - read directly from it
        try {
            const { db } = await import('@/lib/db');
            const { qaIssues, projects } = await import('@/db/schema');
            const { sql } = await import('drizzle-orm');

            console.log(`[MOCK getIssues] Querying DB using SQL raw query for Project: ${projectId}`);

            // Fetch ALL issues from database for this project (DB is our "GitLab")
            const dbIssues = await db.select().from(qaIssues).where(sql`gitlab_project_id = ${projectId}`);

            console.log(`[MOCK getIssues] Found ${dbIssues.length} issues in database for project ${projectId}`);

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
                    author: MOCK_USERS[0], // Default author
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

            console.log(`[MOCK getIssues] Returning ${filteredIssues.length} issues after filtering`);
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
            const { qaIssues } = await import('@/db/schema');
            const { eq, sql } = await import('drizzle-orm');

            console.log(`[MOCK getIssue] Querying DB using SQL raw query for Project: ${projectId} (${typeof projectId}), Issue IID: ${issueIid} (${typeof issueIid})`);

            const dbIssues = await db.select()
                .from(qaIssues)
                .where(sql`gitlab_project_id = ${projectId} AND gitlab_issue_iid = ${issueIid}`)
                .limit(1);

            console.log(`[MOCK getIssue] Found ${dbIssues.length} issues`);

            if (dbIssues.length === 0) {
                console.log(`[MOCK getIssue] Issue #${issueIid} not found in database`);

                // Dump all issues for this project to see what's there
                const allProjectIssues = await db.select().from(qaIssues).where(eq(qaIssues.gitlabProjectId, projectId));
                console.log(`[MOCK getIssue] All issues for project ${projectId}:`, allProjectIssues.map(i => ({ iid: i.gitlabIssueIid, id: i.gitlabIssueId })));
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
                author: MOCK_USERS[0],
                assignees: assignees,
                labels: labels,
                web_url: dbIssue.issueUrl,
            };

            console.log(`[MOCK getIssue] Returning issue #${issueIid} from database with labels: ${labels.join(', ')}`);
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
    if (isMock()) {
        console.log(`[MOCK] Updating labels for issue ${issueIid} in project ${projectId}:`, options);

        try {
            const { db } = await import('@/lib/db');
            const { qaIssues, qaRuns, projects } = await import('@/db/schema');
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

            if (existingIssues.length === 0) {
                console.log(`[MOCK] Issue ${issueIid} not found in database, fetching from GitLab and creating...`);

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
                    createdAt: new Date(issue.created_at),
                    updatedAt: new Date(),
                }).returning();

                existingIssue = created;
                oldStatus = null; // New issue, no old status
                currentLabels = issueLabels;

                console.log(`[MOCK DB] Created new issue #${issueIid} with status: ${newStatus}, labels: ${issueLabels.join(', ')}`);
            } else {
                existingIssue = existingIssues[0];
                oldStatus = existingIssue.status;

                // Get current labels from DB
                if (existingIssue.jsonLabels && Array.isArray(existingIssue.jsonLabels)) {
                    currentLabels = [...existingIssue.jsonLabels] as string[];
                }

                console.log(`[MOCK DB] Current labels:`, currentLabels);

                // Apply label changes
                if (options.removeLabels) {
                    currentLabels = currentLabels.filter((l: string) => !options.removeLabels!.includes(l));
                }
                if (options.addLabels) {
                    currentLabels = [...currentLabels, ...options.addLabels.filter((l: string) => !currentLabels.includes(l))];
                }

                console.log(`[MOCK DB] Updated labels:`, currentLabels);

                // Get project QA label mapping
                const projectResults = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
                const project = projectResults[0];

                if (!project?.qaLabelMapping) {
                    console.error(`[MOCK] Project ${projectId} has no QA label mapping`);
                    return { success: false };
                }

                // Determine new status from labels (preserve old status if no QA label found)
                const newStatus = mapLabelToStatus(currentLabels, project.qaLabelMapping) || oldStatus;
                console.log(`[MOCK DB] Status change: ${oldStatus} -> ${newStatus}`);

                // Update the database with new labels and status
                await db.update(qaIssues).set({
                    status: newStatus,
                    jsonLabels: currentLabels,
                    updatedAt: new Date(),
                }).where(eq(qaIssues.id, existingIssue.id));

                console.log(`[MOCK DB] Updated issue #${issueIid} in database - Labels: ${currentLabels.join(', ')}, Status: ${newStatus}`);
            }

            // Recalculate status after all updates (preserve old status if no QA label)
            const projectResults2 = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
            const project2 = projectResults2[0];
            const finalStatus = project2?.qaLabelMapping ? (mapLabelToStatus(currentLabels, project2.qaLabelMapping) || oldStatus || 'pending') : (oldStatus || 'pending');

            // Handle Run Logic - REMOVED to avoid double-handling and ensure single source of truth
            // QA Run logic is now handled explicitly in board actions or submitQARun
            console.log(`[MOCK DB] Status updated to ${finalStatus}, run logic handled by caller`);

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
        console.log(`[MOCK] Creating note for issue ${issueIid} in project ${projectId}:`, body);
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
        console.log(`[MOCK] Uploading file to project ${projectId}:`, file.name);
        return {
            url: `https://via.placeholder.com/150?text=${encodeURIComponent(file.name)}`,
            markdown: `![${file.name}](https://via.placeholder.com/150?text=${encodeURIComponent(file.name)})`
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
        console.log(`[MOCK] Creating webhook for project ${projectId}`);
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
        console.log(`[MOCK] Deleted issue ${issueIid} from project ${projectId}`);
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
