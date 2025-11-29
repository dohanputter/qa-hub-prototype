
import 'server-only';
import { Gitlab } from '@gitbeaker/rest';
import { env } from '@/lib/env';

// Global type declarations for mock data
declare global {
  var mockIssuesStore: Record<number, any[]> | undefined;
}

// === DATA CONSISTENCY UTILITIES ===
const DATA_CONSISTENCY_ENABLED = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

// Check if mock access token is expired
function isMockTokenExpired(token: string): boolean {
  if (!DATA_CONSISTENCY_ENABLED || !token.startsWith('mock-access-token-')) {
    return false;
  }

  // Extract timestamp from token (mock-access-token-{timestamp})
  const parts = token.split('-');
  if (parts.length < 4) return false;

  const tokenTimestamp = parseInt(parts[3]);
  if (isNaN(tokenTimestamp)) return false;

  // Token expires after 1 hour
  return Date.now() > (tokenTimestamp + 3600000);
}

// Simulate realistic data evolution over time
function updateDataTimestamps() {
  if (!DATA_CONSISTENCY_ENABLED) return;

  // Occasionally update some mock data to simulate real-world changes
  if (Math.random() < 0.1) { // 10% chance on each API call
    try {
      // Update a random project's last activity
      const randomProject = MOCK_PROJECTS[Math.floor(Math.random() * MOCK_PROJECTS.length)];
      if (randomProject) {
        randomProject.last_activity_at = new Date().toISOString();
      }

      // Occasionally add a comment to a random issue
      if (global.mockIssuesStore) {
        const allProjects = Object.keys(global.mockIssuesStore);
        if (allProjects.length > 0) {
          const randomProjectId = allProjects[Math.floor(Math.random() * allProjects.length)];
          const projectIssues = global.mockIssuesStore[Number(randomProjectId)];
          if (projectIssues && projectIssues.length > 0) {
            const randomIssue = projectIssues[Math.floor(Math.random() * projectIssues.length)];
            // Occasionally update the issue's updated_at timestamp
            if (Math.random() < 0.3) { // 30% chance to update timestamp
              randomIssue.updated_at = new Date().toISOString();
            }
          }
        }
      }
    } catch (error) {
      // Silently fail - this is just background data evolution
    }
  }
}

// === ERROR SIMULATION UTILITIES ===
const ERROR_SIMULATION_ENABLED = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

// Realistic error scenarios that can occur in production
const MOCK_ERROR_SCENARIOS = {
  NETWORK_TIMEOUT: {
    probability: 0.02, // 2% chance
    error: new Error('Network timeout - request took too long'),
    statusCode: 408
  },
  SERVER_ERROR: {
    probability: 0.01, // 1% chance
    error: new Error('Internal server error'),
    statusCode: 500
  },
  SERVICE_UNAVAILABLE: {
    probability: 0.005, // 0.5% chance
    error: new Error('Service temporarily unavailable'),
    statusCode: 503
  },
  PERMISSION_DENIED: {
    probability: 0.03, // 3% chance for operations that might have permission issues
    error: new Error('Insufficient permissions to perform this action'),
    statusCode: 403
  },
  NOT_FOUND: {
    probability: 0.01, // 1% chance
    error: new Error('Resource not found'),
    statusCode: 404
  }
};

// Simulate realistic errors that can occur in production
export function simulateRealisticError(operationType: 'read' | 'write' | 'admin' = 'read'): void {
  if (!ERROR_SIMULATION_ENABLED) return;

  const scenarios = Object.values(MOCK_ERROR_SCENARIOS).filter(scenario => {
    // Permission errors are more likely for write/admin operations
    if (operationType === 'write' || operationType === 'admin') {
      return scenario.error.message.includes('permission') || Math.random() < scenario.probability * 2;
    }
    // Exclude permission errors for read operations (less likely)
    return !scenario.error.message.includes('permission') && Math.random() < scenario.probability;
  });

  for (const scenario of scenarios) {
    if (Math.random() < scenario.probability) {
      console.warn(`[MOCK ERROR SIMULATION] ${scenario.error.message}`);
      throw scenario.error;
    }
  }
}

// === WEBHOOK SIMULATION UTILITIES ===
const WEBHOOK_SIMULATION_ENABLED = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

interface WebhookPayload {
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

// Simulate webhook delivery with realistic timing
export async function simulateWebhook(eventType: string, payload: WebhookPayload) {
  if (!WEBHOOK_SIMULATION_ENABLED) return;

  // Add realistic delay (100-500ms) to simulate network latency
  const delay = Math.random() * 400 + 100;

  setTimeout(async () => {
    try {
      const webhookUrl = `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/gitlab`;

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'X-Gitlab-Event': eventType,
          'X-Gitlab-Token': env.WEBHOOK_SECRET || 'mock-webhook-secret',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.warn(`[WEBHOOK SIMULATION] Failed to deliver ${eventType}:`, response.status);
      } else {
        console.log(`[WEBHOOK SIMULATION] Delivered ${eventType} webhook`);
      }
    } catch (error) {
      console.warn('[WEBHOOK SIMULATION] Error delivering webhook:', error);
    }
  }, delay);
}

// Create realistic webhook payload for issue updates
export function createIssueWebhookPayload(
  projectId: number,
  issueIid: number,
  changes: { labels?: { previous: string[], current: string[] } },
  userId: number = 1
): WebhookPayload {
  const project = MOCK_PROJECTS.find(p => p.id === projectId);
  if (!project) throw new Error('Project not found for webhook payload');

  // Get current issue state
  const issue = global.mockIssuesStore?.[projectId]?.find((i: any) => i.iid === issueIid);
  if (!issue) throw new Error('Issue not found for webhook payload');

  return {
    object_kind: 'issue',
    project: {
      id: projectId,
      name: project.name,
      path_with_namespace: project.path_with_namespace,
      web_url: project.web_url,
    },
    object_attributes: {
      id: issue.id || issue.gitlabIssueId,
      iid: issueIid,
      title: issue.title,
      description: issue.description,
      state: issue.state || 'opened',
      created_at: issue.created_at,
      updated_at: new Date().toISOString(),
      labels: issue.labels || [],
      url: issue.web_url || issue.issueUrl,
    },
    user: {
      id: userId,
      name: MOCK_USERS.find(u => u.id === userId)?.name || 'Mock User',
      username: MOCK_USERS.find(u => u.id === userId)?.username || 'mockuser',
    },
    changes,
  };
}

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
    // Bob Go
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
    // Bobe
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
    // Bob Shop App
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
    // Bob Pay
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

const USER_MOCK_PERMISSIONS: Record<string, number[]> = {
    'tester@example.com': [500, 501, 502, 503], // Access to all 4 projects
};

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

const MOCK_LABELS_500 = [
    { id: 1, name: 'bug', color: '#dc2626', text_color: '#fff', description: 'Something is not working' },
    { id: 2, name: 'feature', color: '#2563eb', text_color: '#fff', description: 'New functionality' },
    { id: 3, name: 'critical', color: '#7f1d1d', text_color: '#fff', description: 'Critical severity' },
    { id: 4, name: 'frontend', color: '#0891b2', text_color: '#fff', description: 'Frontend related' },
    { id: 6, name: 'qa::ready', color: '#f59e0b', text_color: '#fff', description: 'Ready for QA' },
    { id: 7, name: 'qa::passed', color: '#10b981', text_color: '#fff', description: 'QA Passed' },
    { id: 8, name: 'qa::failed', color: '#ef4444', text_color: '#fff', description: 'QA Failed' },
];

const MOCK_LABELS_501 = [
    { id: 10, name: 'infrastructure', color: '#7c3aed', text_color: '#fff', description: 'Infra related' },
    { id: 11, name: 'security', color: '#be123c', text_color: '#fff', description: 'Security issue' },
    { id: 12, name: 'qa::ready', color: '#f59e0b', text_color: '#fff', description: 'Ready for QA' },
    { id: 13, name: 'qa::passed', color: '#10b981', text_color: '#fff', description: 'QA Passed' },
    { id: 14, name: 'qa::failed', color: '#ef4444', text_color: '#fff', description: 'QA Failed' },
];

const MOCK_LABELS_502 = [
    { id: 20, name: 'mobile', color: '#059669', text_color: '#fff', description: 'Mobile App' },
    { id: 21, name: 'ios', color: '#000000', text_color: '#fff', description: 'iOS specific' },
    { id: 22, name: 'android', color: '#3b82f6', text_color: '#fff', description: 'Android specific' },
    { id: 23, name: 'qa::ready', color: '#f59e0b', text_color: '#fff', description: 'Ready for QA' },
    { id: 24, name: 'qa::passed', color: '#10b981', text_color: '#fff', description: 'QA Passed' },
    { id: 25, name: 'qa::failed', color: '#ef4444', text_color: '#fff', description: 'QA Failed' },
];

const MOCK_LABELS_503 = [
    { id: 30, name: 'payment', color: '#16a34a', text_color: '#fff', description: 'Payment gateway' },
    { id: 31, name: 'compliance', color: '#ea580c', text_color: '#fff', description: 'Compliance' },
    { id: 32, name: 'qa::ready', color: '#f59e0b', text_color: '#fff', description: 'Ready for QA' },
    { id: 33, name: 'qa::passed', color: '#10b981', text_color: '#fff', description: 'QA Passed' },
    { id: 34, name: 'qa::failed', color: '#ef4444', text_color: '#fff', description: 'QA Failed' },
];

const MOCK_LABELS: Record<number, any[]> = {
    500: MOCK_LABELS_500,
    501: MOCK_LABELS_501,
    502: MOCK_LABELS_502,
    503: MOCK_LABELS_503,
};

// Assign different users to different projects
const MOCK_USERS_500 = MOCK_USERS.slice(0, 5); // Jane, John, QA Lead, Sarah, Michael
const MOCK_USERS_501 = MOCK_USERS.slice(4, 8); // Michael, Emily, David, Olivia
const MOCK_USERS_502 = MOCK_USERS.slice(8, 12); // James, Sophia, Lucas, Mia
const MOCK_USERS_503 = MOCK_USERS.slice(11, 15); // Mia, Alexander, Charlotte, Benjamin

const MOCK_PROJECT_USERS: Record<number, any[]> = {
    500: MOCK_USERS_500,
    501: MOCK_USERS_501,
    502: MOCK_USERS_502,
    503: MOCK_USERS_503,
};

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

export const isMock = () => process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

export function getGitlabClient(token: string) {
    return new Gitlab({
        token,
        host: env.GITLAB_BASE_URL,
    });
}

// --- API METHODS ---

export const getAccessibleProjects = async (token: string, userEmail?: string) => {
    if (isMock()) {
        // In mock mode, filter by user's mock permissions if email is provided
        if (userEmail && USER_MOCK_PERMISSIONS[userEmail]) {
            const allowedIds = USER_MOCK_PERMISSIONS[userEmail];
            return MOCK_PROJECTS.filter(p => allowedIds.includes(p.id));
        }
        // If no email or no permissions defined, return all mock projects (or empty if strict)
        // For now, default to all for easier testing if email is missing
        return MOCK_PROJECTS;
    }
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
    if (isMock()) return MOCK_LABELS[projectId] || MOCK_LABELS[500];
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
        return MOCK_PROJECT_USERS[projectId] || MOCK_USERS;
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
    // Check token expiration for mock mode
    if (isMockTokenExpired(token)) {
        throw new Error('Access token expired. Please re-authenticate.');
    }

    // Enforce rate limiting
    const { enforceGitLabAPIRateLimit } = await import('@/lib/rateLimit');
    await enforceGitLabAPIRateLimit(token);

    if (isMock()) {
        // Simulate realistic errors that can occur in production
        simulateRealisticError('read');

        // Simulate data evolution over time
        updateDataTimestamps();

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
    // Check token expiration for mock mode
    if (isMockTokenExpired(token)) {
        throw new Error('Access token expired. Please re-authenticate.');
    }

    // Enforce rate limiting
    const { enforceGitLabAPIRateLimit } = await import('@/lib/rateLimit');
    await enforceGitLabAPIRateLimit(token);

    if (isMock()) {
        // Simulate realistic errors that can occur in production
        simulateRealisticError('write');

        // Simulate data evolution over time
        updateDataTimestamps();

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
            let oldLabels: string[] = [];

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

                // Store old labels for webhook simulation
                const oldLabels = [...currentLabels];

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

            // Simulate webhook for issue update
            if (oldLabels.length !== currentLabels.length || !oldLabels.every((l, i) => l === currentLabels[i])) {
              const webhookPayload = createIssueWebhookPayload(projectId, issueIid, {
                labels: {
                  previous: oldLabels,
                  current: currentLabels,
                },
              });
              await simulateWebhook('Issue Hook', webhookPayload);
            }

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
