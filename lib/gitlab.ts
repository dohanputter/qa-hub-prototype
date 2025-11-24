
import 'server-only';
import { Gitlab } from '@gitbeaker/rest';
import { env } from '@/lib/env';

// Mock Data Constants
const MOCK_PROJECTS = [
    {
        id: 1,
        name: 'Frontend / Web App',
        description: 'Main customer facing application',
        path_with_namespace: 'qa-hub/frontend',
        web_url: 'https://gitlab.com/qa-hub/frontend',
        avatar_url: null,
        star_count: 12,
        forks_count: 4,
        last_activity_at: new Date().toISOString(),
    },
    {
        id: 2,
        name: 'Backend / API',
        description: 'Core API services and database',
        path_with_namespace: 'qa-hub/backend',
        web_url: 'https://gitlab.com/qa-hub/backend',
        avatar_url: null,
        star_count: 8,
        forks_count: 2,
        last_activity_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
        id: 3,
        name: 'Mobile / iOS',
        description: 'Native iOS Application',
        path_with_namespace: 'qa-hub/mobile-ios',
        web_url: 'https://gitlab.com/qa-hub/mobile-ios',
        avatar_url: null,
        star_count: 5,
        forks_count: 1,
        last_activity_at: new Date(Date.now() - 172800000).toISOString(),
    },
];

const MOCK_USERS = [
    {
        id: 99,
        name: 'Mock Tester',
        username: 'mock_tester',
        state: 'active',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
        web_url: 'https://gitlab.com/mock-tester',
    },
    {
        id: 100,
        name: 'Jane Doe',
        username: 'jane_doe',
        state: 'active',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane',
        web_url: 'https://gitlab.com/jane-doe',
    },
    {
        id: 101,
        name: 'John Smith',
        username: 'john_smith',
        state: 'active',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
        web_url: 'https://gitlab.com/john-smith',
    },
];

const MOCK_LABELS = [
    { id: 1, name: 'bug', color: '#FF0000', description: 'Something is not working' },
    { id: 2, name: 'feature', color: '#00FF00', description: 'New functionality' },
    { id: 3, name: 'ui', color: '#0000FF', description: 'User Interface' },
    { id: 4, name: 'high-priority', color: '#FFA500', description: 'Urgent task' },
    { id: 5, name: 'frontend', color: '#4287f5', description: 'Frontend related' },
    { id: 6, name: 'backend', color: '#f542aa', description: 'Backend related' },
    { id: 7, name: 'critical', color: '#7a0000', description: 'Critical severity' },
];

const MOCK_ISSUES = [
    // Bugs (Pending)
    {
        id: 101,
        iid: 1,
        project_id: 1,
        title: 'Fix login page crash on mobile safari',
        description: 'Login page crashes on submit when using Safari on iOS.',
        state: 'opened',
        created_at: new Date(Date.now() - 2592000000).toISOString(),
        updated_at: new Date().toISOString(),
        author: MOCK_USERS[1],
        assignees: [MOCK_USERS[0]],
        labels: ['bug', 'frontend'],
        web_url: 'https://gitlab.com/qa-hub/frontend/-/issues/1',
    },
    {
        id: 106,
        iid: 6,
        project_id: 1,
        title: 'Fix navigation menu on mobile',
        description: 'Menu does not collapse when clicking outside.',
        state: 'opened',
        created_at: new Date(Date.now() - 100000000).toISOString(),
        updated_at: new Date().toISOString(),
        author: MOCK_USERS[0],
        assignees: [MOCK_USERS[1]],
        labels: ['bug', 'frontend'],
        web_url: 'https://gitlab.com/qa-hub/frontend/-/issues/6',
    },
    {
        id: 111,
        iid: 11,
        project_id: 1,
        title: 'Fix typo in landing page',
        description: 'Correct "welocme" to "welcome".',
        state: 'opened',
        created_at: new Date(Date.now() - 600000000).toISOString(),
        updated_at: new Date().toISOString(),
        author: MOCK_USERS[2],
        assignees: [],
        labels: ['bug', 'frontend'],
        web_url: 'https://gitlab.com/qa-hub/frontend/-/issues/11',
    },
    {
        id: 114,
        iid: 14,
        project_id: 1,
        title: 'Add unit tests for utils',
        description: 'Increase test coverage for utility functions.',
        state: 'opened',
        created_at: new Date(Date.now() - 900000000).toISOString(),
        updated_at: new Date().toISOString(),
        author: MOCK_USERS[2],
        assignees: [],
        labels: ['bug', 'backend'],
        web_url: 'https://gitlab.com/qa-hub/frontend/-/issues/14',
    },
    {
        id: 115,
        iid: 15,
        project_id: 1,
        title: 'Fix broken link in footer',
        description: 'Terms of service link is 404.',
        state: 'opened',
        created_at: new Date(Date.now() - 1000000000).toISOString(),
        updated_at: new Date().toISOString(),
        author: MOCK_USERS[0],
        assignees: [MOCK_USERS[1]],
        labels: ['bug', 'frontend'],
        web_url: 'https://gitlab.com/qa-hub/frontend/-/issues/15',
    },

    // Features (Passed)
    {
        id: 102,
        iid: 2,
        project_id: 1,
        title: 'Implement Dark Mode toggle',
        description: 'Add dark mode support to the UI based on system preference.',
        state: 'opened',
        created_at: new Date(Date.now() - 172800000).toISOString(),
        updated_at: new Date().toISOString(),
        author: MOCK_USERS[2],
        assignees: [],
        labels: ['feature', 'frontend'],
        web_url: 'https://gitlab.com/qa-hub/frontend/-/issues/2',
    },
    {
        id: 103,
        iid: 3,
        project_id: 1,
        title: 'API rate limiting middleware',
        description: 'Implement rate limiting to prevent abuse.',
        state: 'opened',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date().toISOString(),
        author: MOCK_USERS[0],
        assignees: [MOCK_USERS[2]],
        labels: ['feature', 'backend'],
        web_url: 'https://gitlab.com/qa-hub/backend/-/issues/3',
    },
    {
        id: 107,
        iid: 7,
        project_id: 1,
        title: 'Add user profile page',
        description: 'Create a page for users to view and edit their profile.',
        state: 'opened',
        created_at: new Date(Date.now() - 200000000).toISOString(),
        updated_at: new Date().toISOString(),
        author: MOCK_USERS[1],
        assignees: [MOCK_USERS[2]],
        labels: ['feature', 'frontend'],
        web_url: 'https://gitlab.com/qa-hub/frontend/-/issues/7',
    },
    {
        id: 108,
        iid: 8,
        project_id: 1,
        title: 'Optimize image loading',
        description: 'Use lazy loading for images below the fold.',
        state: 'opened',
        created_at: new Date(Date.now() - 300000000).toISOString(),
        updated_at: new Date().toISOString(),
        author: MOCK_USERS[2],
        assignees: [],
        labels: ['feature', 'frontend'],
        web_url: 'https://gitlab.com/qa-hub/frontend/-/issues/8',
    },
    {
        id: 110,
        iid: 10,
        project_id: 1,
        title: 'Update dependency versions',
        description: 'Update React and Next.js to latest versions.',
        state: 'opened',
        created_at: new Date(Date.now() - 500000000).toISOString(),
        updated_at: new Date().toISOString(),
        author: MOCK_USERS[1],
        assignees: [MOCK_USERS[1]],
        labels: ['feature', 'backend'],
        web_url: 'https://gitlab.com/qa-hub/frontend/-/issues/10',
    },
    {
        id: 112,
        iid: 12,
        project_id: 1,
        title: 'Implement search functionality',
        description: 'Add search bar to the header.',
        state: 'opened',
        created_at: new Date(Date.now() - 700000000).toISOString(),
        updated_at: new Date().toISOString(),
        author: MOCK_USERS[0],
        assignees: [MOCK_USERS[2]],
        labels: ['feature', 'frontend'],
        web_url: 'https://gitlab.com/qa-hub/frontend/-/issues/12',
    },
    {
        id: 113,
        iid: 13,
        project_id: 1,
        title: 'Refactor auth middleware',
        description: 'Simplify authentication logic.',
        state: 'opened',
        created_at: new Date(Date.now() - 800000000).toISOString(),
        updated_at: new Date().toISOString(),
        author: MOCK_USERS[1],
        assignees: [MOCK_USERS[0]],
        labels: ['feature', 'backend'],
        web_url: 'https://gitlab.com/qa-hub/frontend/-/issues/13',
    },

    // Critical (Failed)
    {
        id: 105,
        iid: 5,
        project_id: 1,
        title: 'Update payment gateway API key',
        description: 'Key rotation required.',
        state: 'opened',
        created_at: new Date(Date.now() - 43200000).toISOString(),
        updated_at: new Date().toISOString(),
        author: MOCK_USERS[2],
        assignees: [],
        labels: ['critical'],
        web_url: 'https://gitlab.com/qa-hub/frontend/-/issues/5',
    },
    {
        id: 109,
        iid: 9,
        project_id: 1,
        title: 'Database connection timeout',
        description: 'Investigate intermittent connection timeouts.',
        state: 'opened',
        created_at: new Date(Date.now() - 400000000).toISOString(),
        updated_at: new Date().toISOString(),
        author: MOCK_USERS[0],
        assignees: [MOCK_USERS[0]],
        labels: ['critical', 'backend'],
        web_url: 'https://gitlab.com/qa-hub/frontend/-/issues/9',
    },
    {
        id: 104,
        iid: 4,
        project_id: 1,
        title: 'Legacy data migration script',
        description: 'Script to migrate old data to new schema.',
        state: 'opened',
        created_at: new Date(Date.now() - 604800000).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString(),
        author: MOCK_USERS[1],
        assignees: [MOCK_USERS[1]],
        labels: ['critical', 'backend'],
        web_url: 'https://gitlab.com/qa-hub/backend/-/issues/4',
    },
];

// Mutable store for mock issues (so we can update labels in mock mode)
let mockIssuesStore = JSON.parse(JSON.stringify(MOCK_ISSUES));

export const getAllMockIssues = () => mockIssuesStore;

const isMock = () => process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

export function getGitlabClient(token: string) {
    return new Gitlab({
        token,
        host: env.GITLAB_BASE_URL,
    });
}

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

export const getIssues = async (projectId: number, token: string, params?: { state?: 'opened' | 'closed'; labels?: string; search?: string }) => {
    if (isMock()) {
        let issues = mockIssuesStore.filter((i: any) => i.project_id === Number(projectId));
        if (params?.state) {
            issues = issues.filter((i: any) => i.state === params.state);
        }
        if (params?.labels) {
            const labelList = params.labels.split(',');
            issues = issues.filter((i: any) => labelList.every((l: string) => i.labels.includes(l)));
        }
        if (params?.search) {
            const searchLower = params.search.toLowerCase();
            issues = issues.filter((i: any) =>
                i.title.toLowerCase().includes(searchLower) ||
                i.description.toLowerCase().includes(searchLower)
            );
        }
        return issues;
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
        return mockIssuesStore.find((i: any) => i.project_id === Number(projectId) && i.iid === Number(issueIid));
    }
    try {
        const gitlab = getGitlabClient(token);
        return await gitlab.Issues.show(projectId, issueIid as any);
    } catch (error) {
        console.error('GitLab API Error (getIssue):', error);
        throw new Error('Failed to fetch issue details');
    }
};

export const getProjectMembers = async (projectId: number, token: string) => {
    if (isMock()) {
        return [
            {
                id: 99,
                name: 'Mock Tester',
                username: 'mock_tester',
                state: 'active',
                avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
                web_url: 'https://gitlab.com/mock-tester',
            }
        ];
    }
    try {
        const gitlab = getGitlabClient(token);
        return await gitlab.ProjectMembers.all(projectId);
    } catch (error) {
        console.error('GitLab API Error (getProjectMembers):', error);
        throw new Error('Failed to fetch project members');
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
        // Actually update the mock data
        const issue = mockIssuesStore.find((i: any) => i.project_id === Number(projectId) && i.iid === Number(issueIid));
        if (issue) {
            if (options.removeLabels) {
                issue.labels = issue.labels.filter((l: string) => !options.removeLabels!.includes(l));
            }
            if (options.addLabels) {
                issue.labels = [...issue.labels, ...options.addLabels.filter((l: string) => !issue.labels.includes(l))];
            }
            issue.updated_at = new Date().toISOString();
        }
        return { success: true };
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
            author: {
                id: 99,
                name: 'Mock Tester',
                avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
            }
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
