import {
    sqliteTable,
    text,
    integer,
    index,
    uniqueIndex,
    primaryKey,
} from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import type { AdapterAccount } from 'next-auth/adapters';

// ===== AUTH.JS TABLES =====
export const users = sqliteTable('user', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text('name'),
    email: text('email').notNull(),
    emailVerified: integer('emailVerified', { mode: 'timestamp_ms' }),
    image: text('image'),
});

export const accounts = sqliteTable('account', {
    userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccount['type']>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
}, (account) => ({
    compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
}));

export const sessions = sqliteTable('session', {
    sessionToken: text('sessionToken').primaryKey(),
    userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
    expires: integer('expires', { mode: 'timestamp_ms' }).notNull(),
});

export const verificationTokens = sqliteTable('verificationToken', {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: integer('expires', { mode: 'timestamp_ms' }).notNull(),
}, (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
}));

// ===== QA HUB TABLES =====
export const groups = sqliteTable('groups', {
    id: integer('id').primaryKey(),
    name: text('name').notNull(),
    fullPath: text('full_path').notNull(),
    description: text('description'),
    webUrl: text('web_url').notNull(),
    avatarUrl: text('avatar_url'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
});

export const userGroups = sqliteTable(
    'user_groups',
    {
        userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
        groupId: integer('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
        addedAt: integer('added_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
    },
    (table) => ({
        pk: primaryKey({ columns: [table.userId, table.groupId] }),
    })
);

export const projects = sqliteTable('projects', {
    id: integer('id').primaryKey(),
    groupId: integer('group_id').references(() => groups.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    description: text('description'),
    webUrl: text('web_url').notNull(),
    qaLabelMapping: text('qa_label_mapping', { mode: 'json' }).$type<{
        pending: string;
        passed: string;
        failed: string;
    }>(),
    webhookId: integer('webhook_id'),
    isConfigured: integer('is_configured', { mode: 'boolean' }).default(false).notNull(),
    lastSyncedAt: integer('last_synced_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
});

export const userProjects = sqliteTable(
    'user_projects',
    {
        userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
        projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
        addedAt: integer('added_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
    },
    (table) => ({
        pk: primaryKey({ columns: [table.userId, table.projectId] }),
    })
);


export const qaIssues = sqliteTable('qa_issues', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    gitlabIssueId: integer('gitlab_issue_id').notNull(),
    gitlabIssueIid: integer('gitlab_issue_iid').notNull(),
    gitlabProjectId: integer('gitlab_project_id').notNull().references(() => projects.id),
    issueTitle: text('issue_title').notNull(),
    issueDescription: text('issue_description'),
    issueUrl: text('issue_url').notNull(),
    // We keep a high-level status on the issue for quick filtering
    status: text('status').$type<'pending' | 'passed' | 'failed'>().default('pending').notNull(),
    // Track where the defect was discovered (defect leakage tracking)
    leakageSource: text('leakage_source').$type<'qa' | 'uat' | 'production'>().default('qa').notNull(),
    jsonLabels: text('json_labels', { mode: 'json' }),
    assigneeId: integer('assignee_id'),
    authorId: integer('author_id'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
}, (table) => ({
    projectIdx: index('idx_qa_issues_project').on(table.gitlabProjectId),
    issueIdx: index('idx_qa_issues_issue').on(table.gitlabIssueIid),
    uniqueProjectIssue: uniqueIndex('idx_unique_issue').on(table.gitlabProjectId, table.gitlabIssueIid),
}));

// NEW TABLE: qaRuns
export const qaRuns = sqliteTable('qa_runs', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    qaIssueId: text('qa_issue_id').notNull().references(() => qaIssues.id, { onDelete: 'cascade' }),
    runNumber: integer('run_number').notNull(),
    status: text('status').$type<'pending' | 'passed' | 'failed'>().default('pending').notNull(),

    testCasesContent: text('test_cases_content', { mode: 'json' }),
    issuesFoundContent: text('issues_found_content', { mode: 'json' }),

    shareUuid: text('share_uuid').$defaultFn(() => crypto.randomUUID()).unique().notNull(),

    createdBy: text('created_by').notNull().references(() => users.id),
    completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
}, (table) => ({
    qaIssueIdx: index('idx_qa_runs_issue').on(table.qaIssueId),
    runNumberIdx: index('idx_qa_runs_number').on(table.qaIssueId, table.runNumber),
}));


export const attachments = sqliteTable('attachments', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    // CHANGED: References qaRuns instead of qaRecords
    qaRunId: text('qa_run_id').references(() => qaRuns.id, { onDelete: 'cascade' }),
    filename: text('filename').notNull(),
    url: text('url').notNull(),
    markdown: text('markdown').notNull(),
    fileSize: integer('file_size').notNull(),
    mimeType: text('mime_type').notNull(),
    status: text('status').$type<'pending' | 'uploaded' | 'failed'>().default('uploaded').notNull(),
    uploadedBy: text('uploaded_by').notNull().references(() => users.id),
    uploadedAt: integer('uploaded_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
}, (table) => ({
    qaRunIdx: index('idx_attachments_qa_run').on(table.qaRunId),
}));

export const notifications = sqliteTable('notifications', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<'mention' | 'assignment' | 'status_change' | 'comment'>().notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    resourceType: text('resource_type').$type<'issue' | 'qa_record' | 'qa_run'>(),
    resourceId: text('resource_id'),
    actionUrl: text('action_url'),
    isRead: integer('is_read', { mode: 'boolean' }).default(false).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
}, (table) => ({
    userIdx: index('idx_notifications_user').on(table.userId),
    unreadIdx: index('idx_notifications_unread').on(table.userId, table.isRead),
}));

// ===== RELATIONS =====
export const groupsRelations = relations(groups, ({ many }) => ({
    projects: many(projects),
    userGroups: many(userGroups),
}));

export const userGroupsRelations = relations(userGroups, ({ one }) => ({
    user: one(users, { fields: [userGroups.userId], references: [users.id] }),
    group: one(groups, { fields: [userGroups.groupId], references: [groups.id] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
    group: one(groups, { fields: [projects.groupId], references: [groups.id] }),
    qaIssues: many(qaIssues),
    userProjects: many(userProjects),
}));

export const userProjectsRelations = relations(userProjects, ({ one }) => ({
    user: one(users, { fields: [userProjects.userId], references: [users.id] }),
    project: one(projects, { fields: [userProjects.projectId], references: [projects.id] }),
}));

export const qaIssuesRelations = relations(qaIssues, ({ one, many }) => ({
    project: one(projects, { fields: [qaIssues.gitlabProjectId], references: [projects.id] }),
    runs: many(qaRuns),
}));

export const qaRunsRelations = relations(qaRuns, ({ one, many }) => ({
    qaIssue: one(qaIssues, { fields: [qaRuns.qaIssueId], references: [qaIssues.id] }),
    attachments: many(attachments),
    creator: one(users, { fields: [qaRuns.createdBy], references: [users.id] }),
}));


export const attachmentsRelations = relations(attachments, ({ one }) => ({
    qaRun: one(qaRuns, { fields: [attachments.qaRunId], references: [qaRuns.id] }),
    uploader: one(users, { fields: [attachments.uploadedBy], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
    user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

// ===== SNIPPETS TABLE =====
export const snippets = sqliteTable('snippets', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    content: text('content').notNull(),
    type: text('type').$type<'test_case' | 'issue'>().notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
});

// ===== EXPLORATORY SESSIONS TABLES =====
export const exploratorySessions = sqliteTable("exploratory_sessions", {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').notNull().references(() => users.id),

    // Optional linkage
    issueId: text('issue_id').references(() => qaIssues.id), // Changed to text to match qaIssues.id type
    projectId: integer('project_id').notNull().references(() => projects.id),

    // Core session data
    charter: text('charter').notNull(),
    testArea: text('test_area'),
    environment: text('environment', { mode: 'json' }).$type<{ browser?: string; os?: string; device?: string; url?: string }>(),

    // Status & timing
    status: text('status').$type<'preparing' | 'active' | 'paused' | 'completed' | 'abandoned'>().default('preparing').notNull(),
    startedAt: integer('started_at', { mode: 'timestamp_ms' }),
    pausedAt: integer('paused_at', { mode: 'timestamp_ms' }),
    completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
    totalDuration: integer('total_duration'), // in seconds
    totalPausedDuration: integer('total_paused_duration').default(0), // accumulated paused time in seconds

    // Testing context
    preTestNotes: text('pre_test_notes'),
    postTestNotes: text('post_test_notes'),

    // Outcomes with blocker counts
    issuesFoundCount: integer('issues_found_count').default(0),
    blockersLoggedCount: integer('blockers_logged_count').default(0),
    blockersResolvedCount: integer('blockers_resolved_count').default(0),
    questionsCount: integer('questions_count').default(0),
    outOfScopeCount: integer('out_of_scope_count').default(0),

    createdAt: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()).notNull(),
});

export const sessionNotes = sqliteTable("session_notes", {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sessionId: integer('session_id').notNull().references(() => exploratorySessions.id),

    // Capture moment
    type: text('type').$type<'observation' | 'bug' | 'blocker' | 'hypothesis' | 'question' | 'out_of_scope' | 'pattern' | 'praise'>().notNull(),
    content: text('content', { mode: 'json' }).notNull(), // Tiptap JSON

    // Timeline context
    sessionTime: integer('session_time'), // seconds from start
    timestamp: integer('timestamp', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()).notNull(),

    // Testing context
    url: text('url'),
    testDataUsed: text('test_data_used'),
    relatedCode: text('related_code'),

    // Visual evidence
    screenshotUrl: text('screenshot_url'),
    consoleLogs: text('console_logs', { mode: 'json' }).$type<Array<{ level: string; message: string; timestamp: number }>>(),

    // Blocker-specific fields
    blockerSeverity: text('blocker_severity').$type<'low' | 'medium' | 'high' | 'critical'>(),
    blockerReason: text('blocker_reason'),
    blockerResolved: integer('blocker_resolved', { mode: 'boolean' }).default(false),
    blockerResolution: text('blocker_resolution'),

    // Issue linkage
    convertedToGitLabIssue: integer('converted_to_gitlab_issue', { mode: 'boolean' }).default(false),
    gitLabIssueId: integer('gitlab_issue_id'),

    // Metadata
    tags: text('tags', { mode: 'json' }).$type<string[]>(),
    priority: text('priority').$type<'now' | 'later' | 'never'>().default('later'),
    requiresFollowUp: integer('requires_follow_up', { mode: 'boolean' }).default(false),

    createdAt: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()).notNull(),
});

export const qaBlockers = sqliteTable("qa_blockers", {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sessionId: integer('session_id').references(() => exploratorySessions.id),
    projectId: integer('project_id').notNull().references(() => projects.id),

    // Core blocker info
    title: text('title').notNull(),
    description: text('description', { mode: 'json' }).notNull(), // Tiptap JSON
    severity: text('severity').$type<'low' | 'medium' | 'high' | 'critical'>().notNull(),
    status: text('status').$type<'active' | 'resolved' | 'escalated'>().default('active'),

    // Blocking context
    blockingWhat: text('blocking_what').$type<'testing' | 'development' | 'deployment'>().notNull(),
    estimatedResolutionHours: integer('estimated_resolution_hours'),

    // Resolution tracking
    resolvedAt: integer('resolved_at', { mode: 'timestamp_ms' }),
    resolutionTimeHours: integer('resolution_time_hours'),
    resolutionNotes: text('resolution_notes'),

    // Linkage
    createdFromNoteId: integer('created_from_note_id').references(() => sessionNotes.id),
    relatedIssueId: text('related_issue_id').references(() => qaIssues.id), // Changed to text to match qaIssues.id type

    createdAt: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()).notNull(),
});



// ===== NEW RELATIONS =====
export const exploratorySessionsRelations = relations(exploratorySessions, ({ one, many }) => ({
    user: one(users, { fields: [exploratorySessions.userId], references: [users.id] }),
    issue: one(qaIssues, { fields: [exploratorySessions.issueId], references: [qaIssues.id] }),
    project: one(projects, { fields: [exploratorySessions.projectId], references: [projects.id] }),
    notes: many(sessionNotes),
    blockers: many(qaBlockers),
}));

export const sessionNotesRelations = relations(sessionNotes, ({ one }) => ({
    session: one(exploratorySessions, { fields: [sessionNotes.sessionId], references: [exploratorySessions.id] }),
}));

export const qaBlockersRelations = relations(qaBlockers, ({ one }) => ({
    session: one(exploratorySessions, { fields: [qaBlockers.sessionId], references: [exploratorySessions.id] }),
    project: one(projects, { fields: [qaBlockers.projectId], references: [projects.id] }),
    relatedIssue: one(qaIssues, { fields: [qaBlockers.relatedIssueId], references: [qaIssues.id] }),
}));


