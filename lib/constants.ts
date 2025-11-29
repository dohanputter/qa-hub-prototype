/**
 * Application-wide constants
 */

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
 */
export const DEFAULT_QA_LABELS = {
    pending: 'qa::ready',
    passed: 'qa::passed',
    failed: 'qa::failed',
} as const;

/**
 * Rate limit configurations
 */
export const RATE_LIMITS = {
    UPLOAD_PER_MINUTE: 10,
    GITLAB_AUTHENTICATED_PER_MINUTE: 2000,
    GITLAB_UNAUTHENTICATED_PER_MINUTE: 10,
    BURST_LIMIT: 100,
    BURST_WINDOW_MS: 10000,
} as const;

/**
 * Mock project IDs (used in mock mode)
 */
export const MOCK_PROJECT_IDS = [500, 501, 502, 503] as const;

