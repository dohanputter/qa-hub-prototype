/**
 * GitLab-related types
 */

export interface GitLabMockUser {
    id: number;
    name: string;
    username: string;
    state: string;
    avatar_url: string;
    web_url: string;
}

export interface GitLabMockProject {
    id: number;
    name: string;
    description: string;
    path_with_namespace: string;
    web_url: string;
    avatar_url: string | null;
    star_count: number;
    forks_count: number;
    last_activity_at: string;
    namespace: {
        id: number;
        name: string;
        path: string;
        kind: string;
        full_path: string;
    };
    qaLabelMapping: {
        pending: string;
        passed: string;
        failed: string;
    };
}

export interface GitLabMockGroup {
    id: number;
    name: string;
    full_path: string;
    description: string;
    web_url: string;
    avatar_url: string;
}

export interface GitLabMockLabel {
    id: number;
    name: string;
    color: string;
    text_color: string;
    description: string;
}

export interface GitLabMockIssue {
    id: number;
    iid: number;
    project_id: number;
    title: string;
    description: string;
    state: 'opened' | 'closed';
    created_at: string;
    updated_at: string;
    author: GitLabMockUser;
    assignees: GitLabMockUser[];
    labels: string[];
    web_url: string;
}

export interface WebhookPayload {
    object_kind: string;
    project: {
        id: number;
        name: string;
        path_with_namespace: string;
        web_url: string;
    };
    object_attributes?: any;
    user?: any;
    issue?: any;
    labels?: any[];
    changes?: any;
}

