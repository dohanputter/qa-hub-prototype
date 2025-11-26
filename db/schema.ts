import {
    sqliteTable,
    text,
    integer,
    index,
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

export const qaRecords = sqliteTable('qa_records', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    shareUuid: text('share_uuid').$defaultFn(() => crypto.randomUUID()).unique().notNull(),
    gitlabIssueId: integer('gitlab_issue_id').notNull(),
    gitlabIssueIid: integer('gitlab_issue_iid').notNull(),
    gitlabProjectId: integer('gitlab_project_id').notNull().references(() => projects.id),
    issueTitle: text('issue_title').notNull(),
    issueDescription: text('issue_description'),
    issueUrl: text('issue_url').notNull(),
    status: text('status').$type<'pending' | 'passed' | 'failed'>().default('pending').notNull(),
    testCasesContent: text('test_cases_content', { mode: 'json' }),
    issuesFoundContent: text('issues_found_content', { mode: 'json' }),
    createdBy: text('created_by').notNull().references(() => users.id),
    completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
}, (table) => ({
    projectIdx: index('idx_records_project').on(table.gitlabProjectId),
    issueIdx: index('idx_records_issue').on(table.gitlabIssueIid),
    uniqueIssueIdx: index('idx_unique_issue').on(table.gitlabProjectId, table.gitlabIssueIid),
}));

export const attachments = sqliteTable('attachments', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    qaRecordId: text('qa_record_id').references(() => qaRecords.id, { onDelete: 'cascade' }),
    filename: text('filename').notNull(),
    url: text('url').notNull(),
    markdown: text('markdown').notNull(),
    fileSize: integer('file_size').notNull(),
    mimeType: text('mime_type').notNull(),
    status: text('status').$type<'pending' | 'uploaded' | 'failed'>().default('uploaded').notNull(),
    uploadedBy: text('uploaded_by').notNull().references(() => users.id),
    uploadedAt: integer('uploaded_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
}, (table) => ({
    qaRecordIdx: index('idx_attachments_qa_record').on(table.qaRecordId),
}));

export const notifications = sqliteTable('notifications', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<'mention' | 'assignment' | 'status_change' | 'comment'>().notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    resourceType: text('resource_type').$type<'issue' | 'qa_record'>(),
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
    qaRecords: many(qaRecords),
    userProjects: many(userProjects),
}));

export const userProjectsRelations = relations(userProjects, ({ one }) => ({
    user: one(users, { fields: [userProjects.userId], references: [users.id] }),
    project: one(projects, { fields: [userProjects.projectId], references: [projects.id] }),
}));

export const qaRecordsRelations = relations(qaRecords, ({ one, many }) => ({
    project: one(projects, { fields: [qaRecords.gitlabProjectId], references: [projects.id] }),
    attachments: many(attachments),
    creator: one(users, { fields: [qaRecords.createdBy], references: [users.id] }),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
    qaRecord: one(qaRecords, { fields: [attachments.qaRecordId], references: [qaRecords.id] }),
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
