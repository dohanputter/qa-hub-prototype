import type { JSONContent } from '@tiptap/core';

/**
 * GitLab User/Member structure
 */
export interface GitLabUser {
    id: number;
    name: string;
    username: string;
    state?: string;
    avatar_url?: string;
    avatarUrl?: string; // Support both naming conventions
    web_url?: string;
}

/**
 * GitLab Project structure
 */
export interface GitLabProject {
    id: number;
    name: string;
    description: string;
    web_url: string;
    avatar_url: string | null;
    path_with_namespace: string;
}

/**
 * GitLab Issue structure
 */
export interface GitLabIssue {
    id: number;
    iid: number;
    project_id: number;
    title: string;
    description: string;
    description_html?: string;
    state: string; // More flexible than 'opened' | 'closed'
    labels: string[] | any[]; // Support both string[] and SimpleLabelSchema[]
    web_url: string;
    created_at: string;
    updated_at: string;
    author: GitLabUser;
    assignees?: GitLabUser[]; // Optional, can be undefined
}

/**
 * Label structure
 */
export interface Label {
    id: number;
    name: string;
    color: string;
    text_color?: string;
    description?: string | null; // Support both undefined and null
}

/**
 * Attachment structure
 */
export interface Attachment {
    id: string;
    filename: string;
    url: string;
    markdown: string;
    fileSize?: number;
    mimeType?: string;
    status?: 'pending' | 'uploaded' | 'failed';
    qaRunId?: string | null;
    uploadedBy?: string;
    uploadedAt?: Date | number;
}

/**
 * QA Run structure
 */
export interface QARun {
    id: string;
    qaIssueId: string;
    runNumber: number;
    status: 'pending' | 'passed' | 'failed';
    testCasesContent?: JSONContent | null;
    issuesFoundContent?: JSONContent | null;
    shareUuid: string;
    createdBy: string;
    completedAt?: Date | number | null;
    createdAt: Date | number;
    updatedAt: Date | number;
}

/**
 * QA Issue structure (Database)
 */
export interface QAIssue {
    id: number | string;
    gitlabProjectId: number;
    gitlabIssueIid: number;
    status: string;
    leakageSource: 'qa' | 'uat' | 'production';
    cumulativeTimeMs?: number | null;
    createdAt: Date | string | null;
    updatedAt: Date | string | null;
}

/**
 * Snippet structure
 */
export interface Snippet {
    id: number;
    title: string;
    content: string;
    type: 'test_case' | 'issue';
    updatedAt: Date | string;
}

/**
 * QADetail component props
 */
export interface QADetailProps {
    issue: GitLabIssue;
    qaIssue?: QAIssue;
    runs: QARun[];
    allAttachments: Attachment[];
    members: GitLabUser[];
    projectId: number;
    issueIid: number;
    labels: Label[];
}

/**
 * QAHeader component props
 */
export interface QAHeaderProps {
    issue: GitLabIssue;
    processedDescription: string;
    issueLabels: string[];
    projectLabels: Label[];
    isUpdatingLabels: boolean;
    onLabelToggle: (label: string) => void;
    onLabelRemove: (label: string) => void;
    leakageSource?: 'qa' | 'uat' | 'production';
    cumulativeTimeMs?: number | null;
    activeRun?: QARun | null;
}

/**
 * QAAttachments component props
 */
export interface QAAttachmentsProps {
    attachments: Attachment[];
    onRemove: (id: string, filename: string) => void;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * QAHistory component props
 */
export interface QAHistoryProps {
    runs: QARun[];
}
