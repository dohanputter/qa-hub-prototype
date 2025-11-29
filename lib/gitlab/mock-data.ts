/**
 * Mock data for GitLab simulation
 * Used in development/testing mode
 */

import type { GitLabMockUser, GitLabMockProject, GitLabMockGroup, GitLabMockLabel, GitLabMockIssue } from './types';

// === MOCK GROUPS ===
export const MOCK_GROUPS: GitLabMockGroup[] = [
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

// === MOCK PROJECTS ===
export const MOCK_PROJECTS: GitLabMockProject[] = [
    {
        id: 500,
        name: 'Bob Go',
        description: 'Logistics and delivery platform',
        path_with_namespace: 'bob-group/bob-go',
        web_url: 'https://gitlab.com/bob-group/bob-go',
        avatar_url: null,
        star_count: 45,
        forks_count: 12,
        last_activity_at: new Date().toISOString(),
        namespace: {
            id: 100,
            name: 'Bob Group',
            path: 'bob-group',
            kind: 'group',
            full_path: 'bob-group',
        },
        qaLabelMapping: {
            pending: 'qa::ready',
            passed: 'qa::passed',
            failed: 'qa::failed',
        },
    },
    {
        id: 501,
        name: 'Bobe',
        description: 'Bobe core platform services',
        path_with_namespace: 'bob-group/bobe',
        web_url: 'https://gitlab.com/bob-group/bobe',
        avatar_url: null,
        star_count: 20,
        forks_count: 5,
        last_activity_at: new Date(Date.now() - 86400000).toISOString(),
        namespace: {
            id: 100,
            name: 'Bob Group',
            path: 'bob-group',
            kind: 'group',
            full_path: 'bob-group',
        },
        qaLabelMapping: {
            pending: 'qa::ready',
            passed: 'qa::passed',
            failed: 'qa::failed',
        },
    },
    {
        id: 502,
        name: 'Bob Shop App',
        description: 'Mobile shopping application',
        path_with_namespace: 'bob-group/bob-shop-app',
        web_url: 'https://gitlab.com/bob-group/bob-shop-app',
        avatar_url: null,
        star_count: 35,
        forks_count: 8,
        last_activity_at: new Date(Date.now() - 172800000).toISOString(),
        namespace: {
            id: 100,
            name: 'Bob Group',
            path: 'bob-group',
            kind: 'group',
            full_path: 'bob-group',
        },
        qaLabelMapping: {
            pending: 'qa::ready',
            passed: 'qa::passed',
            failed: 'qa::failed',
        },
    },
    {
        id: 503,
        name: 'Bob Pay',
        description: 'Payment processing system',
        path_with_namespace: 'bob-group/bob-pay',
        web_url: 'https://gitlab.com/bob-group/bob-pay',
        avatar_url: null,
        star_count: 15,
        forks_count: 3,
        last_activity_at: new Date(Date.now() - 259200000).toISOString(),
        namespace: {
            id: 100,
            name: 'Bob Group',
            path: 'bob-group',
            kind: 'group',
            full_path: 'bob-group',
        },
        qaLabelMapping: {
            pending: 'qa::ready',
            passed: 'qa::passed',
            failed: 'qa::failed',
        },
    },
];

// === USER PERMISSIONS (Email -> Project IDs) ===
export const USER_MOCK_PERMISSIONS: Record<string, number[]> = {
    'tester@example.com': [500, 501, 502, 503],
};

// === MOCK USERS ===
export const MOCK_USERS: GitLabMockUser[] = [
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

// === MOCK LABELS BY PROJECT ===
const MOCK_LABELS_500: GitLabMockLabel[] = [
    { id: 1, name: 'bug', color: '#dc2626', text_color: '#fff', description: 'Something is not working' },
    { id: 2, name: 'feature', color: '#2563eb', text_color: '#fff', description: 'New functionality' },
    { id: 3, name: 'critical', color: '#7f1d1d', text_color: '#fff', description: 'Critical severity' },
    { id: 4, name: 'frontend', color: '#0891b2', text_color: '#fff', description: 'Frontend related' },
    { id: 6, name: 'qa::ready', color: '#f59e0b', text_color: '#fff', description: 'Ready for QA' },
    { id: 7, name: 'qa::passed', color: '#10b981', text_color: '#fff', description: 'QA Passed' },
    { id: 8, name: 'qa::failed', color: '#ef4444', text_color: '#fff', description: 'QA Failed' },
];

const MOCK_LABELS_501: GitLabMockLabel[] = [
    { id: 10, name: 'infrastructure', color: '#7c3aed', text_color: '#fff', description: 'Infra related' },
    { id: 11, name: 'security', color: '#be123c', text_color: '#fff', description: 'Security issue' },
    { id: 12, name: 'qa::ready', color: '#f59e0b', text_color: '#fff', description: 'Ready for QA' },
    { id: 13, name: 'qa::passed', color: '#10b981', text_color: '#fff', description: 'QA Passed' },
    { id: 14, name: 'qa::failed', color: '#ef4444', text_color: '#fff', description: 'QA Failed' },
];

const MOCK_LABELS_502: GitLabMockLabel[] = [
    { id: 20, name: 'mobile', color: '#059669', text_color: '#fff', description: 'Mobile App' },
    { id: 21, name: 'ios', color: '#5856d6', text_color: '#fff', description: 'iOS specific' },
    { id: 22, name: 'android', color: '#3b82f6', text_color: '#fff', description: 'Android specific' },
    { id: 23, name: 'qa::ready', color: '#f59e0b', text_color: '#fff', description: 'Ready for QA' },
    { id: 24, name: 'qa::passed', color: '#10b981', text_color: '#fff', description: 'QA Passed' },
    { id: 25, name: 'qa::failed', color: '#ef4444', text_color: '#fff', description: 'QA Failed' },
];

const MOCK_LABELS_503: GitLabMockLabel[] = [
    { id: 30, name: 'payment', color: '#16a34a', text_color: '#fff', description: 'Payment gateway' },
    { id: 31, name: 'compliance', color: '#ea580c', text_color: '#fff', description: 'Compliance' },
    { id: 32, name: 'qa::ready', color: '#f59e0b', text_color: '#fff', description: 'Ready for QA' },
    { id: 33, name: 'qa::passed', color: '#10b981', text_color: '#fff', description: 'QA Passed' },
    { id: 34, name: 'qa::failed', color: '#ef4444', text_color: '#fff', description: 'QA Failed' },
];

export const MOCK_LABELS: Record<number, GitLabMockLabel[]> = {
    500: MOCK_LABELS_500,
    501: MOCK_LABELS_501,
    502: MOCK_LABELS_502,
    503: MOCK_LABELS_503,
};

// === MOCK PROJECT USERS ===
export const MOCK_PROJECT_USERS: Record<number, GitLabMockUser[]> = {
    500: MOCK_USERS.slice(0, 5),
    501: MOCK_USERS.slice(4, 8),
    502: MOCK_USERS.slice(8, 12),
    503: MOCK_USERS.slice(11, 15),
};

// === MOCK ISSUES ===
export const MOCK_ISSUES: GitLabMockIssue[] = [
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

// === MOCK SNIPPETS ===
export const MOCK_SNIPPETS = [
    {
        id: 1,
        title: 'Login Test Case',
        content: '1. Go to login page\n2. Enter valid credentials\n3. Click Login\n4. Verify dashboard loads',
        type: 'test_case' as const,
        updatedAt: new Date().toISOString()
    },
    {
        id: 2,
        title: 'Bug Report Template',
        content: '### Steps to Reproduce\n1. \n2. \n\n### Expected Behavior\n\n### Actual Behavior',
        type: 'issue' as const,
        updatedAt: new Date().toISOString()
    }
];

