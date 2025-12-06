/**
 * Simulation utilities for mock mode
 * Error simulation, webhook simulation, and data evolution
 */

import { env } from '@/lib/env';
import { MOCK_PROJECTS, MOCK_USERS } from './mockData';
import type { WebhookPayload } from './types';

// Local isMockMode to avoid circular dependency
const isMockMode = () => process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

// Note: mockIssuesStore global is declared in gitlab.ts where it's defined

// === ERROR SIMULATION ===

const MOCK_ERROR_SCENARIOS = {
    NETWORK_TIMEOUT: {
        probability: 0.02,
        error: new Error('Network timeout - request took too long'),
        statusCode: 408
    },
    SERVER_ERROR: {
        probability: 0.01,
        error: new Error('Internal server error'),
        statusCode: 500
    },
    SERVICE_UNAVAILABLE: {
        probability: 0.005,
        error: new Error('Service temporarily unavailable'),
        statusCode: 503
    },
    PERMISSION_DENIED: {
        probability: 0.03,
        error: new Error('Insufficient permissions to perform this action'),
        statusCode: 403
    },
    NOT_FOUND: {
        probability: 0.01,
        error: new Error('Resource not found'),
        statusCode: 404
    }
};

/**
 * Simulate realistic errors that can occur in production
 */
export function simulateRealisticError(operationType: 'read' | 'write' | 'admin' = 'read'): void {
    if (!isMockMode()) return;

    const scenarios = Object.values(MOCK_ERROR_SCENARIOS).filter(scenario => {
        if (operationType === 'write' || operationType === 'admin') {
            return scenario.error.message.includes('permission') || Math.random() < scenario.probability * 2;
        }
        return !scenario.error.message.includes('permission') && Math.random() < scenario.probability;
    });

    for (const scenario of scenarios) {
        if (Math.random() < scenario.probability) {
            console.warn(`[MOCK ERROR SIMULATION] ${scenario.error.message}`);
            throw scenario.error;
        }
    }
}

// === DATA EVOLUTION ===

/**
 * Simulate realistic data evolution over time
 * Occasionally updates timestamps to simulate real-world changes
 */
export function updateDataTimestamps(): void {
    if (!isMockMode()) return;

    // 10% chance on each API call
    if (Math.random() < 0.1) {
        try {
            const randomProject = MOCK_PROJECTS[Math.floor(Math.random() * MOCK_PROJECTS.length)];
            if (randomProject) {
                (randomProject as any).last_activity_at = new Date().toISOString();
            }

            if (global.mockIssuesStore) {
                const allProjects = Object.keys(global.mockIssuesStore);
                if (allProjects.length > 0) {
                    const randomProjectId = allProjects[Math.floor(Math.random() * allProjects.length)];
                    const projectIssues = global.mockIssuesStore[Number(randomProjectId)];
                    if (projectIssues && projectIssues.length > 0) {
                        const randomIssue = projectIssues[Math.floor(Math.random() * projectIssues.length)];
                        if (Math.random() < 0.3) {
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

// === TOKEN VALIDATION ===

/**
 * Check if a mock access token is expired
 */
export function isMockTokenExpired(token: string): boolean {
    if (!isMockMode() || !token.startsWith('mock-access-token-')) {
        return false;
    }

    const parts = token.split('-');
    if (parts.length < 4) return false;

    const tokenTimestamp = parseInt(parts[3]);
    if (isNaN(tokenTimestamp)) return false;

    // Token expires after 1 hour
    return Date.now() > (tokenTimestamp + 3600000);
}

// === WEBHOOK SIMULATION ===

/**
 * Simulate webhook delivery with realistic timing
 */
export async function simulateWebhook(eventType: string, payload: WebhookPayload): Promise<void> {
    if (!isMockMode()) return;

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

/**
 * Create a realistic webhook payload for issue updates
 */
export function createIssueWebhookPayload(
    projectId: number,
    issueIid: number,
    changes: { labels?: { previous: string[], current: string[] } },
    userId: number = 1
): WebhookPayload {
    const project = MOCK_PROJECTS.find(p => p.id === projectId);
    if (!project) throw new Error('Project not found for webhook payload');

    // Get current issue state from global store (may not be populated if issues are in DB)
    const issue = global.mockIssuesStore?.[projectId]?.find((i: any) => i.iid === issueIid);

    // If issue not in global store, use minimal data from changes
    // This happens because in mock mode, issues are stored in the database, not the global store
    if (!issue) {
        console.warn(`[WEBHOOK SIMULATION] Issue #${issueIid} not found in global store, using minimal payload`);
    }

    return {
        object_kind: 'issue',
        project: {
            id: projectId,
            name: project.name,
            path_with_namespace: project.path_with_namespace,
            web_url: project.web_url,
        },
        object_attributes: {
            id: issue?.id || issue?.gitlabIssueId || issueIid,
            iid: issueIid,
            title: issue?.title || `Issue #${issueIid}`,
            description: issue?.description || '',
            state: issue?.state || 'opened',
            created_at: issue?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            labels: changes.labels?.current || issue?.labels || [],
            url: issue?.web_url || issue?.issueUrl || `${project.web_url}/-/issues/${issueIid}`,
        },
        user: {
            id: userId,
            name: MOCK_USERS.find(u => u.id === userId)?.name || 'Mock User',
            username: MOCK_USERS.find(u => u.id === userId)?.username || 'mockuser',
        },
        changes,
    };
}

