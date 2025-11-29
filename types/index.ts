export enum IssueState {
    OPEN = 'opened',
    CLOSED = 'closed'
}

export enum QAStatus {
    TODO = 'To Do',
    IN_DEV = 'In Dev',
    READY_FOR_QA = 'Ready for QA',
    IN_QA = 'In QA',
    PASSED = 'QA Passed',
    FAILED = 'QA Failed'
}

export interface User {
    id: number;
    name: string;
    avatarUrl: string;
    username: string;
}

export interface Label {
    id: number;
    title: string;
    color: string;
    textColor: string;
}

export interface Project {
    id: number;
    name: string;
    description: string;
}

export interface Group {
    id: number;
    name: string;
    path: string;
    avatarUrl?: string;
}

export interface Snippet {
    id: number;
    title: string;
    content: string;
    type: 'test_case' | 'issue';
    updatedAt: string;
}

export interface Issue {
    id: number;
    iid: number; // internal id like #123
    projectId: number;
    title: string;
    description: string;
    state: IssueState;
    createdAt: string;
    updatedAt: string;
    assignee?: User;
    author: User;
    labels: Label[];
    qaStatus: QAStatus; // Mapped to a label in real life, but explicit here

    // QA Hub Specific Data
    testCases?: string;
    issuesFound?: string;
}

export interface Notification {
    id: number;
    text: string;
    time: string;
    linkId: number;
    read: boolean;
}

export type ViewState =
    | { type: 'DASHBOARD' }
    | { type: 'ISSUES_LIST' }
    | { type: 'ISSUES_BOARD' }
    | { type: 'NOTIFICATIONS' }
    | { type: 'TOOLS' }
    | { type: 'SNIPPETS' }
    | { type: 'TEST_DATA_GEN' }
    | { type: 'TICKET_DETAIL'; issueId: number }
    | { type: 'CREATE_ISSUE' };

// ============================================
// Kanban Board Types (GitLab API-compatible)
// ============================================

export interface GitLabUser {
    id: number;
    name: string;
    username: string;
    state: string;
    avatar_url: string;
    web_url: string;
}

export interface GitLabLabel {
    id: number;
    name: string;
    color: string;
    text_color: string;
    description?: string;
}

export interface QALabelMapping {
    pending: string;
    passed: string;
    failed: string;
}

export interface KanbanProject {
    id: number;
    name: string;
    description?: string;
    path_with_namespace: string;
    web_url: string;
    avatar_url?: string | null;
    namespace?: {
        id: number;
        name: string;
        path: string;
        kind: string;
        full_path: string;
    };
    qaLabelMapping: QALabelMapping;
}

export interface KanbanIssue {
    id: number;
    iid: number;
    project_id: number;
    title: string;
    description?: string;
    state: 'opened' | 'closed';
    created_at: string;
    updated_at: string;
    author?: GitLabUser;
    assignee?: GitLabUser | null;
    assignees?: GitLabUser[];
    labels: string[];
    web_url: string;
}

export type KanbanColumnId = 'backlog' | 'pending' | 'passed' | 'failed';

// Re-export dashboard and editor types
export type { 
    DashboardStats, 
    DashboardKPI, 
    ProjectStat, 
    TimeStat, 
    PassRateStat 
} from './dashboard';

export type { 
    TiptapEditorProps, 
    EditorMember, 
    EditorSnippet, 
    ImageUploadResult,
    ProjectLabel 
} from './editor';
