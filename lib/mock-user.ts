/**
 * Mock user utilities for development and testing
 */

import { db } from '@/lib/db';
import { users, groups, projects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { SYSTEM_USERS, DEFAULT_QA_LABELS } from '@/lib/constants';

/**
 * Ensure the mock user exists in the database
 * Creates the user if it doesn't exist
 * @returns The mock user ID
 */
export async function ensureMockUser(): Promise<string> {
    const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.id, SYSTEM_USERS.MOCK))
        .limit(1);

    if (!existing) {
        await db.insert(users).values({
            id: SYSTEM_USERS.MOCK,
            email: 'mock@example.com',
            name: 'Mock User',
            image: 'https://picsum.photos/32/32?random=999',
        });
    }

    return SYSTEM_USERS.MOCK;
}

/**
 * Ensure the webhook system user exists in the database
 * Creates the user if it doesn't exist
 * @returns The webhook user ID
 */
export async function ensureWebhookUser(): Promise<string> {
    const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.id, SYSTEM_USERS.WEBHOOK))
        .limit(1);

    if (!existing) {
        await db.insert(users).values({
            id: SYSTEM_USERS.WEBHOOK,
            name: 'GitLab Webhook',
            email: 'webhook@system.local',
        });
    }

    return SYSTEM_USERS.WEBHOOK;
}

/**
 * Ensure a mock group exists in the database
 */
export async function ensureMockGroup(groupData: {
    id: number;
    name: string;
    fullPath: string;
}): Promise<void> {
    const [existing] = await db
        .select()
        .from(groups)
        .where(eq(groups.id, groupData.id))
        .limit(1);

    if (!existing) {
        await db.insert(groups).values({
            id: groupData.id,
            name: groupData.name,
            fullPath: groupData.fullPath,
            description: null,
            webUrl: `https://gitlab.com/groups/${groupData.fullPath}`,
            avatarUrl: null,
            createdAt: new Date(),
        });
    }
}

/**
 * Ensure a mock project exists in the database
 */
export async function ensureMockProject(projectData: {
    id: number;
    name: string;
    webUrl: string;
    description?: string | null;
    groupId?: number | null;
    qaLabelMapping?: { pending: string; passed: string; failed: string } | null;
}): Promise<void> {
    const [existing] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectData.id))
        .limit(1);

    if (!existing) {
        // Ensure we have a valid label mapping
        const labelMapping = (projectData.qaLabelMapping && 
            'pending' in projectData.qaLabelMapping && 
            'passed' in projectData.qaLabelMapping && 
            'failed' in projectData.qaLabelMapping) 
            ? projectData.qaLabelMapping 
            : DEFAULT_QA_LABELS;

        await db.insert(projects).values({
            id: projectData.id,
            groupId: projectData.groupId || null,
            name: projectData.name,
            description: projectData.description || null,
            webUrl: projectData.webUrl,
            qaLabelMapping: labelMapping,
            isConfigured: true,
            createdAt: new Date(),
        });
    }
}

