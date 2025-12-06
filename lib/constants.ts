/**
 * Application-wide constants
 */

import type { QAColumn } from '@/types';

/**
 * System user IDs for different contexts
 */
export const SYSTEM_USERS = {
    /** Mock user for development/testing */
    MOCK: 'mock-user-00000000-0000-0000-0000-000000000001',
    /** System user for webhook-triggered operations */
    WEBHOOK: 'system-webhook-runner',
} as const;

/**
 * Default QA label mapping used when project has no custom mapping
 * @deprecated Use DEFAULT_COLUMNS instead for flexible column workflow
 */
export const DEFAULT_QA_LABELS = {
    pending: 'qa::ready',
    passed: 'qa::passed',
    failed: 'qa::failed',
} as const;

/**
 * Default column configuration for new projects
 * Provides standard QA workflow with queue → active → passed/failed
 */
export const DEFAULT_COLUMNS: QAColumn[] = [
    { id: 'ready', title: 'Ready for QA', gitlabLabel: 'qa::ready', color: '#f59e0b', order: 0, columnType: 'queue' },
    { id: 'testing', title: 'In Testing', gitlabLabel: 'qa::testing', color: '#3b82f6', order: 1, columnType: 'active' },
    { id: 'passed', title: 'Passed', gitlabLabel: 'qa::passed', color: '#10b981', order: 2, columnType: 'passed' },
    { id: 'failed', title: 'Failed', gitlabLabel: 'qa::failed', color: '#ef4444', order: 3, columnType: 'failed' },
];

/**
 * Mock project IDs (used in mock mode)
 */
export const MOCK_PROJECT_IDS = [500, 501, 502, 503] as const;
