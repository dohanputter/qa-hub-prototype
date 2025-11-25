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
