import { Issue, IssueState, Label, QAStatus, User, Notification, Project, Group, Snippet } from '../types';

export const USERS: User[] = [
  { id: 1, name: 'Jane Doe', username: 'jdoe', avatarUrl: 'https://picsum.photos/32/32?random=1' },
  { id: 2, name: 'John Smith', username: 'jsmith', avatarUrl: 'https://picsum.photos/32/32?random=2' },
  { id: 3, name: 'QA Lead', username: 'qalead', avatarUrl: 'https://picsum.photos/32/32?random=3' },
  { id: 4, name: 'Sarah Connor', username: 'sconnor', avatarUrl: 'https://picsum.photos/32/32?random=4' },
  { id: 5, name: 'Michael Chen', username: 'mchen', avatarUrl: 'https://picsum.photos/32/32?random=5' },
  { id: 6, name: 'Emily Davis', username: 'edavis', avatarUrl: 'https://picsum.photos/32/32?random=6' },
  { id: 7, name: 'David Wilson', username: 'dwilson', avatarUrl: 'https://picsum.photos/32/32?random=7' },
  { id: 8, name: 'Olivia Martinez', username: 'omartinez', avatarUrl: 'https://picsum.photos/32/32?random=8' },
  { id: 9, name: 'James Rodriguez', username: 'jrodriguez', avatarUrl: 'https://picsum.photos/32/32?random=9' },
  { id: 10, name: 'Sophia Anderson', username: 'sanderson', avatarUrl: 'https://picsum.photos/32/32?random=10' },
  { id: 11, name: 'Lucas Brown', username: 'lbrown', avatarUrl: 'https://picsum.photos/32/32?random=11' },
  { id: 12, name: 'Mia White', username: 'mwhite', avatarUrl: 'https://picsum.photos/32/32?random=12' },
  { id: 13, name: 'Alexander Hall', username: 'ahall', avatarUrl: 'https://picsum.photos/32/32?random=13' },
  { id: 14, name: 'Charlotte King', username: 'cking', avatarUrl: 'https://picsum.photos/32/32?random=14' },
  { id: 15, name: 'Benjamin Wright', username: 'bwright', avatarUrl: 'https://picsum.photos/32/32?random=15' },
];

export const LABELS: Label[] = [
  { id: 1, title: 'bug', color: '#dc2626', textColor: '#fff' },
  { id: 2, title: 'feature', color: '#2563eb', textColor: '#fff' },
  { id: 3, title: 'critical', color: '#7f1d1d', textColor: '#fff' },
  { id: 4, title: 'frontend', color: '#0891b2', textColor: '#fff' },
  { id: 5, title: 'backend', color: '#6366f1', textColor: '#fff' },
];

export const PROJECTS: Project[] = [
    { id: 500, name: 'Frontend / Web App', description: 'Main customer facing application' },
    { id: 501, name: 'Backend / API', description: 'Core API services and database' },
    { id: 502, name: 'Mobile / iOS', description: 'Native iOS Application' },
];

export const GROUPS: Group[] = [
    { id: 10, name: 'Acme Corporation', path: 'acme-corp', avatarUrl: 'https://picsum.photos/48/48?random=10' },
    { id: 11, name: 'Platform Engineering', path: 'platform-eng', avatarUrl: 'https://picsum.photos/48/48?random=11' },
    { id: 12, name: 'Mobile Division', path: 'mobile-div', avatarUrl: 'https://picsum.photos/48/48?random=12' },
];

const RAW_SNIPPETS: Snippet[] = [
  {
    id: 1,
    title: 'Standard Login Test',
    type: 'test_case',
    content: '- [ ] Navigate to login page\n- [ ] Enter valid credentials\n- [ ] Click submit\n- [ ] Verify dashboard loads',
    updatedAt: '2023-10-26T10:00:00Z'
  },
  {
    id: 2,
    title: 'Browser Compatibility Check',
    type: 'test_case',
    content: '- [ ] Chrome (Latest)\n- [ ] Firefox (Latest)\n- [ ] Safari (Latest)\n- [ ] Edge (Latest)',
    updatedAt: '2023-10-25T14:00:00Z'
  },
  {
    id: 3,
    title: 'API 500 Error Template',
    type: 'issue',
    content: '**Endpoint**: POST /api/v1/resource\n**Status**: 500 Internal Server Error\n**Payload**: `{ "id": 123 }`\n**Expected**: 200 OK',
    updatedAt: '2023-10-20T09:30:00Z'
  },
  {
    id: 4,
    title: 'UI Overflow Issue',
    type: 'issue',
    content: '**Device**: iPhone 12\n**Component**: Sidebar\n**Issue**: Content overflows container on small screens.\n**Screenshot**: (Attach here)',
    updatedAt: '2023-10-22T11:15:00Z'
  }
];

const RAW_ISSUES: Issue[] = [
  {
    id: 101,
    iid: 1,
    projectId: 500,
    title: 'Fix login page crash on mobile safari',
    description: 'When a user tries to login via Safari on iOS 16, the page freezes.',
    state: IssueState.OPEN,
    createdAt: '2023-10-25T10:00:00Z',
    updatedAt: '2023-10-26T14:30:00Z',
    assignee: USERS[0],
    author: USERS[1],
    labels: [LABELS[0], LABELS[3]],
    qaStatus: QAStatus.IN_QA,
    testCases: '- [ ] Open Safari on iOS 16\n- [ ] Navigate to login\n- [ ] Enter valid creds',
    issuesFound: ''
  },
  {
    id: 102,
    iid: 2,
    projectId: 500,
    title: 'Implement Dark Mode toggle',
    description: 'Add a toggle in the user settings to switch between light and dark themes.',
    state: IssueState.OPEN,
    createdAt: '2023-10-20T09:00:00Z',
    updatedAt: '2023-10-25T11:00:00Z',
    assignee: USERS[1],
    author: USERS[2],
    labels: [LABELS[1], LABELS[3]],
    qaStatus: QAStatus.READY_FOR_QA,
    testCases: '',
    issuesFound: ''
  },
  {
    id: 103,
    iid: 3,
    projectId: 500,
    title: 'API rate limiting middleware',
    description: 'Ensure users cannot exceed 100 req/min.',
    state: IssueState.OPEN,
    createdAt: '2023-10-27T15:00:00Z',
    updatedAt: '2023-10-27T15:00:00Z',
    assignee: undefined,
    author: USERS[0],
    labels: [LABELS[1]],
    qaStatus: QAStatus.TODO,
    testCases: '',
    issuesFound: ''
  },
  {
    id: 104,
    iid: 4,
    projectId: 500,
    title: 'Legacy data migration script',
    description: 'Migrate old user table to new schema.',
    state: IssueState.CLOSED,
    createdAt: '2023-09-15T10:00:00Z',
    updatedAt: '2023-09-20T14:30:00Z',
    assignee: USERS[2],
    author: USERS[0],
    labels: [],
    qaStatus: QAStatus.PASSED,
    testCases: '- [x] Run script\n- [x] Verify counts',
    issuesFound: ''
  },
  {
    id: 105,
    iid: 5,
    projectId: 500,
    title: 'Update payment gateway API key',
    description: 'Key expired, need to rotate.',
    state: IssueState.OPEN,
    createdAt: '2023-10-28T08:00:00Z',
    updatedAt: '2023-10-28T08:30:00Z',
    assignee: USERS[0],
    author: USERS[2],
    labels: [LABELS[2]],
    qaStatus: QAStatus.FAILED,
    testCases: '- [x] Process payment',
    issuesFound: '**Critical**: Payment still declining with 403 error.'
  }
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 1, text: 'Jane Doe assigned you to issue #101', time: '2h ago', linkId: 101, read: false },
  { id: 2, text: 'Pipeline failed for branch feature/dark-mode', time: '5h ago', linkId: 102, read: true },
  { id: 3, text: 'John mentioned you in comment on #105', time: '1d ago', linkId: 105, read: true },
];

// --- PERSISTENCE LAYER ---
const ISSUES_STORAGE_KEY = 'qa_hub_issues_v1';
const SNIPPETS_STORAGE_KEY = 'qa_hub_snippets_v1';

const loadFromStorage = <T>(key: string, fallback: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (e) {
        console.error('Failed to load from storage', e);
        return fallback;
    }
};

const persistData = (key: string, data: any) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error('Failed to save to storage', e);
    }
};

// Initialize Stores
let currentIssues = loadFromStorage(ISSUES_STORAGE_KEY, RAW_ISSUES);
let currentSnippets = loadFromStorage(SNIPPETS_STORAGE_KEY, RAW_SNIPPETS);

// --- ISSUES METHODS ---

export const getIssues = () => currentIssues;
export const getIssueById = (id: number) => currentIssues.find((i: Issue) => i.id === id);

export const updateIssue = (updated: Issue) => {
  currentIssues = currentIssues.map((i: Issue) => i.id === updated.id ? updated : i);
  persistData(ISSUES_STORAGE_KEY, currentIssues);
  return updated;
};

export const updateIssueStatus = (id: number, status: QAStatus) => {
  const issue = currentIssues.find((i: Issue) => i.id === id);
  if (issue) {
    issue.qaStatus = status;
    persistData(ISSUES_STORAGE_KEY, currentIssues);
  }
  return issue;
};

export const reorderIssue = (movedId: number, targetId: number, position: 'before' | 'after' = 'after') => {
  const movedIndex = currentIssues.findIndex((i: Issue) => i.id === movedId);
  const movedIssue = currentIssues.find((i: Issue) => i.id === movedId);
  const targetIssue = currentIssues.find((i: Issue) => i.id === targetId);
  
  if (movedIndex === -1 || !movedIssue || !targetIssue) return;

  // Determine effective status change first
  // If moving to a different status via DnD, update it
  if (movedIssue.qaStatus !== targetIssue.qaStatus) {
       movedIssue.qaStatus = targetIssue.qaStatus;
       // Cross-column drag: Always insert BEFORE to allow reaching the top
       position = 'before';
  }

  // Remove from old position
  currentIssues.splice(movedIndex, 1);
  
  // Re-calculate target index because removal might have shifted it
  const targetIndexNew = currentIssues.findIndex((i: Issue) => i.id === targetId);
  
  if (targetIndexNew === -1) {
    // Fallback: push to end if target lost
    currentIssues.push(movedIssue);
    persistData(ISSUES_STORAGE_KEY, currentIssues);
    return;
  }

  // Insert based on explicit position
  if (position === 'before') {
    currentIssues.splice(targetIndexNew, 0, movedIssue);
  } else {
    currentIssues.splice(targetIndexNew + 1, 0, movedIssue);
  }
  
  persistData(ISSUES_STORAGE_KEY, currentIssues);
};

export const createIssue = (data: Partial<Issue>) => {
    const newId = Math.max(0, ...currentIssues.map((i: Issue) => i.id)) + 1;
    const newIid = Math.max(0, ...currentIssues.map((i: Issue) => i.iid)) + 1;
    
    const issue: Issue = {
        id: newId,
        iid: newIid,
        projectId: data.projectId || 500,
        title: data.title || 'Untitled',
        description: data.description || '',
        state: IssueState.OPEN,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        assignee: data.assignee,
        author: USERS[0], // Current User
        labels: data.labels || [],
        qaStatus: QAStatus.TODO,
        testCases: '',
        issuesFound: ''
    };
    
    currentIssues.unshift(issue);
    persistData(ISSUES_STORAGE_KEY, currentIssues);
    return issue;
};

// --- SNIPPETS METHODS ---

export const getSnippets = () => currentSnippets;

export const createSnippet = (snippet: Omit<Snippet, 'id' | 'updatedAt'>) => {
  const newId = Math.max(0, ...currentSnippets.map((s: Snippet) => s.id)) + 1;
  const newSnippet: Snippet = {
    ...snippet,
    id: newId,
    updatedAt: new Date().toISOString()
  };
  currentSnippets.push(newSnippet);
  persistData(SNIPPETS_STORAGE_KEY, currentSnippets);
  return newSnippet;
};

export const updateSnippet = (updatedSnippet: Snippet) => {
  const index = currentSnippets.findIndex((s: Snippet) => s.id === updatedSnippet.id);
  if (index > -1) {
    currentSnippets[index] = { 
        ...updatedSnippet, 
        updatedAt: new Date().toISOString() 
    };
    persistData(SNIPPETS_STORAGE_KEY, currentSnippets);
  }
  return updatedSnippet;
};

export const deleteSnippet = (id: number) => {
  const index = currentSnippets.findIndex((s: Snippet) => s.id === id);
  if (index > -1) {
    currentSnippets.splice(index, 1);
    persistData(SNIPPETS_STORAGE_KEY, currentSnippets);
  }
};