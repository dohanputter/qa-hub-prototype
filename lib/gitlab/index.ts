/**
 * GitLab integration module - Types and Mock Data
 * 
 * This module provides types and mock data for the GitLab integration.
 * For API methods, import from '@/lib/gitlab' directly.
 */

// Re-export types
export type { 
    GitLabMockUser, 
    GitLabMockProject, 
    GitLabMockGroup, 
    GitLabMockLabel, 
    GitLabMockIssue,
    WebhookPayload 
} from './types';

// Re-export mock data
export { 
    MOCK_GROUPS, 
    MOCK_PROJECTS, 
    MOCK_USERS, 
    MOCK_LABELS, 
    MOCK_PROJECT_USERS, 
    MOCK_ISSUES, 
    MOCK_SNIPPETS,
    USER_MOCK_PERMISSIONS 
} from './mock-data';

// Re-export simulation utilities
export { 
    simulateRealisticError, 
    updateDataTimestamps, 
    isMockTokenExpired, 
    simulateWebhook, 
    createIssueWebhookPayload 
} from './simulation';

// Note: For API methods (getIssues, updateIssueLabels, etc.), 
// continue importing from '@/lib/gitlab' directly.
// This avoids circular dependency issues.

