/**
 * Mock data for GitLab simulation
 * Used in development/testing mode
 */

import type { GitLabMockUser, GitLabMockProject, GitLabMockGroup, GitLabMockLabel, GitLabMockIssue } from './types';

// === MOCK GROUPS ===
export const MOCK_GROUPS: GitLabMockGroup[] = [
    {
        id: 101,
        name: 'Bob Go',
        full_path: 'bob-group/bob-go',
        description: 'Logistics and delivery platform',
        web_url: 'https://gitlab.com/groups/bob-group/bob-go',
        avatar_url: null,
    },
    {
        id: 102,
        name: 'Bobe',
        full_path: 'bob-group/bobe',
        description: 'Bobe core platform services',
        web_url: 'https://gitlab.com/groups/bob-group/bobe',
        avatar_url: null,
    },
    {
        id: 103,
        name: 'Bob Shop App',
        full_path: 'bob-group/bob-shop-app',
        description: 'Mobile shopping application',
        web_url: 'https://gitlab.com/groups/bob-group/bob-shop-app',
        avatar_url: null,
    },
    {
        id: 104,
        name: 'Bob Pay',
        full_path: 'bob-group/bob-pay',
        description: 'Payment processing system',
        web_url: 'https://gitlab.com/groups/bob-group/bob-pay',
        avatar_url: null,
    },
];

// === MOCK PROJECTS ===
export const MOCK_PROJECTS: GitLabMockProject[] = [
    // Bob Go Projects
    {
        id: 500,
        name: 'Bob Go Core',
        description: 'Main backend services for Bob Go',
        path_with_namespace: 'bob-group/bob-go/core',
        web_url: 'https://gitlab.com/bob-group/bob-go/core',
        avatar_url: null,
        star_count: 45,
        forks_count: 12,
        last_activity_at: new Date().toISOString(),
        namespace: { id: 101, name: 'Bob Go', path: 'bob-go', kind: 'group', full_path: 'bob-group/bob-go' },
        qaLabelMapping: { pending: 'qa::ready', passed: 'qa::passed', failed: 'qa::failed' },
    },
    {
        id: 501,
        name: 'Bob Go Frontend',
        description: 'React dashboard for Bob Go',
        path_with_namespace: 'bob-group/bob-go/frontend',
        web_url: 'https://gitlab.com/bob-group/bob-go/frontend',
        avatar_url: null,
        star_count: 30,
        forks_count: 8,
        last_activity_at: new Date().toISOString(),
        namespace: { id: 101, name: 'Bob Go', path: 'bob-go', kind: 'group', full_path: 'bob-group/bob-go' },
        qaLabelMapping: { pending: 'qa::ready', passed: 'qa::passed', failed: 'qa::failed' },
    },

    // Bobe Projects
    {
        id: 502,
        name: 'Bobe API',
        description: 'Core API services',
        path_with_namespace: 'bob-group/bobe/api',
        web_url: 'https://gitlab.com/bob-group/bobe/api',
        avatar_url: null,
        star_count: 20,
        forks_count: 5,
        last_activity_at: new Date().toISOString(),
        namespace: { id: 102, name: 'Bobe', path: 'bobe', kind: 'group', full_path: 'bob-group/bobe' },
        qaLabelMapping: { pending: 'qa::ready', passed: 'qa::passed', failed: 'qa::failed' },
    },

    // Bob Shop App Projects
    {
        id: 503,
        name: 'iOS App',
        description: 'Native iOS application',
        path_with_namespace: 'bob-group/bob-shop-app/ios',
        web_url: 'https://gitlab.com/bob-group/bob-shop-app/ios',
        avatar_url: null,
        star_count: 35,
        forks_count: 8,
        last_activity_at: new Date().toISOString(),
        namespace: { id: 103, name: 'Bob Shop App', path: 'bob-shop-app', kind: 'group', full_path: 'bob-group/bob-shop-app' },
        qaLabelMapping: { pending: 'qa::ready', passed: 'qa::passed', failed: 'qa::failed' },
    },
    {
        id: 504,
        name: 'Android App',
        description: 'Native Android application',
        path_with_namespace: 'bob-group/bob-shop-app/android',
        web_url: 'https://gitlab.com/bob-group/bob-shop-app/android',
        avatar_url: null,
        star_count: 32,
        forks_count: 7,
        last_activity_at: new Date().toISOString(),
        namespace: { id: 103, name: 'Bob Shop App', path: 'bob-shop-app', kind: 'group', full_path: 'bob-group/bob-shop-app' },
        qaLabelMapping: { pending: 'qa::ready', passed: 'qa::passed', failed: 'qa::failed' },
    },

    // Bob Pay Projects
    {
        id: 505,
        name: 'Payment Gateway',
        description: 'Core payment processing',
        path_with_namespace: 'bob-group/bob-pay/gateway',
        web_url: 'https://gitlab.com/bob-group/bob-pay/gateway',
        avatar_url: null,
        star_count: 15,
        forks_count: 3,
        last_activity_at: new Date().toISOString(),
        namespace: { id: 104, name: 'Bob Pay', path: 'bob-pay', kind: 'group', full_path: 'bob-group/bob-pay' },
        qaLabelMapping: { pending: 'qa::ready', passed: 'qa::passed', failed: 'qa::failed' },
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
// Project 500 has comprehensive workflow labels for testing column mapping
const MOCK_LABELS_500: GitLabMockLabel[] = [
    // Standard labels
    { id: 1, name: 'bug', color: '#dc2626', text_color: '#fff', description: 'Something is not working' },
    { id: 2, name: 'feature', color: '#2563eb', text_color: '#fff', description: 'New functionality' },
    { id: 3, name: 'critical', color: '#7f1d1d', text_color: '#fff', description: 'Critical severity' },
    { id: 4, name: 'frontend', color: '#0891b2', text_color: '#fff', description: 'Frontend related' },
    // QA workflow labels
    { id: 6, name: 'qa::ready', color: '#f59e0b', text_color: '#fff', description: 'Ready for QA' },
    { id: 7, name: 'qa::testing', color: '#3b82f6', text_color: '#fff', description: 'Currently being tested' },
    { id: 8, name: 'qa::passed', color: '#10b981', text_color: '#fff', description: 'QA Passed' },
    { id: 9, name: 'qa::failed', color: '#ef4444', text_color: '#fff', description: 'QA Failed' },
    // Extended workflow labels for column mapping testing
    { id: 100, name: 'workflow::pending-review', color: '#9333ea', text_color: '#fff', description: 'Pending code review' },
    { id: 101, name: 'workflow::pending-testing', color: '#f97316', text_color: '#fff', description: 'Ready for QA testing' },
    { id: 102, name: 'workflow::in-testing', color: '#0ea5e9', text_color: '#fff', description: 'Currently being tested' },
    { id: 103, name: 'workflow::qa-approved', color: '#22c55e', text_color: '#fff', description: 'QA Approved' },
    { id: 104, name: 'workflow::qa-rejected', color: '#dc2626', text_color: '#fff', description: 'QA Rejected' },
    { id: 105, name: 'workflow::blocked', color: '#991b1b', text_color: '#fff', description: 'Blocked by issue' },
    { id: 106, name: 'workflow::uat', color: '#8b5cf6', text_color: '#fff', description: 'Ready for UAT' },
    { id: 107, name: 'workflow::uat-passed', color: '#059669', text_color: '#fff', description: 'UAT Passed' },
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
        id: -101,
        iid: 1,
        project_id: 500, // Bob Go Core
        title: 'Fix login page crash on mobile safari',
        description: 'When a user tries to login via Safari on iOS 16, the page freezes.',
        state: 'opened',
        created_at: '2023-10-25T10:00:00Z',
        updated_at: '2023-10-26T14:30:00Z',
        author: MOCK_USERS[1],
        assignees: [MOCK_USERS[0]],
        labels: ['bug', 'frontend'],
        web_url: 'https://gitlab.com/bob-group/bob-go/core/-/issues/1',
    },
    {
        id: -102,
        iid: 2,
        project_id: 500, // Bob Go Core
        title: 'Implement Dark Mode toggle',
        description: 'Add a toggle in the user settings to switch between light and dark themes.',
        state: 'opened',
        created_at: '2023-10-20T09:00:00Z',
        updated_at: '2023-10-25T11:00:00Z',
        author: MOCK_USERS[2],
        assignees: [MOCK_USERS[1]],
        labels: ['feature', 'frontend'],
        web_url: 'https://gitlab.com/bob-group/bob-go/core/-/issues/2',
    },
    {
        id: -103,
        iid: 3,
        project_id: 500, // Bob Go Core
        title: 'API rate limiting middleware',
        description: 'Ensure users cannot exceed 100 req/min.',
        state: 'opened',
        created_at: '2023-10-27T15:00:00Z',
        updated_at: '2023-10-27T15:00:00Z',
        author: MOCK_USERS[0],
        assignees: [],
        labels: ['feature'],
        web_url: 'https://gitlab.com/bob-group/bob-go/core/-/issues/3',
    },
    {
        id: -104,
        iid: 4,
        project_id: 500, // Bob Go Core
        title: 'Legacy data migration script',
        description: 'Migrate old user table to new schema.',
        state: 'closed',
        created_at: '2023-09-15T10:00:00Z',
        updated_at: '2023-09-20T14:30:00Z',
        author: MOCK_USERS[0],
        assignees: [MOCK_USERS[2]],
        labels: [],
        web_url: 'https://gitlab.com/bob-group/bob-go/core/-/issues/4',
    },
    {
        id: -105,
        iid: 5,
        project_id: 502, // Bobe API
        title: 'Update payment gateway API key',
        description: 'Key expired, need to rotate.',
        state: 'opened',
        created_at: '2023-10-28T08:00:00Z',
        updated_at: '2023-10-28T08:30:00Z',
        author: MOCK_USERS[2],
        assignees: [MOCK_USERS[0]],
        labels: ['critical'],
        web_url: 'https://gitlab.com/bob-group/bobe/api/-/issues/5',
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

