
import 'server-only';
import { Gitlab } from '@gitbeaker/rest';
import { env } from '@/lib/env';

// Mock Data Constants
const MOCK_PROJECTS = [
    {
        id: 1,
        name: 'Mock Project Alpha',
        description: 'A mock project for testing purposes',
        path_with_namespace: 'mock-group/mock-project-alpha',
        web_url: 'https://gitlab.com/mock-group/mock-project-alpha',
        avatar_url: null,
        star_count: 5,
        forks_count: 2,
        last_activity_at: new Date().toISOString(),
    },
    {
        id: 2,
        name: 'Mock Project Beta',
        description: 'Another mock project',
        path_with_namespace: 'mock-group/mock-project-beta',
        web_url: 'https://gitlab.com/mock-group/mock-project-beta',
        avatar_url: null,
        star_count: 10,
        forks_count: 1,
        last_activity_at: new Date(Date.now() - 86400000).toISOString(),
    },
];

const MOCK_ISSUES = [
    {
        id: 101,
        iid: 1,
        project_id: 1,
        title: 'Fix login bug',
        description: 'Login page crashes on submit',
        state: 'opened',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        author: {
            id: 99,
            name: 'Mock Tester',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
            web_url: 'https://gitlab.com/mock-tester',
        },
        assignees: [],
        labels: ['bug', 'high-priority'],
        web_url: 'https://gitlab.com/mock-group/mock-project-alpha/-/issues/1',
    },
    {
        id: 102,
        iid: 2,
        project_id: 1,
        title: 'Implement dark mode',
        description: 'Add dark mode support to the UI',
        state: 'opened',
        created_at: new Date(Date.now() - 172800000).toISOString(),
        updated_at: new Date().toISOString(),
        author: {
            id: 99,
            name: 'Mock Tester',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
            web_url: 'https://gitlab.com/mock-tester',
        },
        assignees: [],
        labels: ['feature', 'ui'],
        web_url: 'https://gitlab.com/mock-group/mock-project-alpha/-/issues/2',
    },
];

const MOCK_LABELS = [
    { id: 1, name: 'bug', color: '#FF0000', description: 'Something is not working' },
    { id: 2, name: 'feature', color: '#00FF00', description: 'New functionality' },
    { id: 3, name: 'ui', color: '#0000FF', description: 'User Interface' },
    { id: 4, name: 'high-priority', color: '#FFA500', description: 'Urgent task' },
];

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
        let issues = MOCK_ISSUES.filter(i => i.project_id === Number(projectId));
        if (params?.state) {
            issues = issues.filter(i => i.state === params.state);
        }
        if (params?.labels) {
            const labelList = params.labels.split(',');
            issues = issues.filter(i => labelList.every(l => i.labels.includes(l)));
        }
        if (params?.search) {
            const searchLower = params.search.toLowerCase();
            issues = issues.filter(i =>
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
        return MOCK_ISSUES.find(i => i.project_id === Number(projectId) && i.iid === Number(issueIid));
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
