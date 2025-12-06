'use server';

import { auth } from '@/auth';
import { db } from '@/lib/db';
import { projects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { isMockMode, getTokenOrMock } from '@/lib/mode';
import { getProjectLabels } from '@/lib/gitlab';
import { DEFAULT_COLUMNS } from '@/lib/constants';
import { logger } from '@/lib/logger';
import type { QAColumn } from '@/types';

/**
 * Get the column mapping configuration for a project
 * Returns the custom mapping or default columns if not configured
 */
export async function getProjectColumnMapping(projectId: number): Promise<QAColumn[]> {
    const [project] = await db
        .select({ columnMapping: projects.columnMapping })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

    if (project?.columnMapping && project.columnMapping.length > 0) {
        return project.columnMapping as QAColumn[];
    }

    // Return default columns if no custom mapping
    return DEFAULT_COLUMNS;
}

/**
 * Save column mapping configuration for a project
 */
export async function saveProjectColumnMapping(
    projectId: number,
    columns: QAColumn[]
): Promise<{ success: boolean; error?: string }> {
    const session = await auth();
    const inMockMode = isMockMode();

    if (!session?.accessToken && !inMockMode) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        // Validate columns
        if (!columns || columns.length === 0) {
            return { success: false, error: 'At least one column is required' };
        }

        // Ensure unique IDs
        const ids = columns.map(c => c.id);
        if (new Set(ids).size !== ids.length) {
            return { success: false, error: 'Column IDs must be unique' };
        }

        // Ensure at least one passed and one failed column type
        const hasPassedColumn = columns.some(c => c.columnType === 'passed');
        const hasFailedColumn = columns.some(c => c.columnType === 'failed');

        if (!hasPassedColumn || !hasFailedColumn) {
            return { success: false, error: 'Must have at least one Passed and one Failed column type' };
        }

        // Sort by order and normalize
        const normalizedColumns = columns
            .sort((a, b) => a.order - b.order)
            .map((col, index) => ({
                ...col,
                order: index,
            }));

        await db
            .update(projects)
            .set({
                columnMapping: normalizedColumns,
                isConfigured: true,
            })
            .where(eq(projects.id, projectId));

        logger.info(`Saved column mapping for project ${projectId}`, { columnCount: normalizedColumns.length });

        revalidatePath(`/${projectId}`);
        revalidatePath(`/${projectId}/board`);
        revalidatePath(`/${projectId}/settings`);

        return { success: true };
    } catch (error) {
        logger.error('Failed to save column mapping', error);
        return { success: false, error: 'Failed to save configuration' };
    }
}

/**
 * Fetch available GitLab labels for column mapping
 * In mock mode, returns mock labels. In production, fetches from GitLab API.
 */
export async function getGitLabLabelsForMapping(
    projectId: number
): Promise<{ id: number; name: string; color: string; text_color: string; description?: string }[]> {
    const session = await auth();
    const inMockMode = isMockMode();

    if (!session?.accessToken && !inMockMode) {
        throw new Error('Unauthorized');
    }

    const token = getTokenOrMock(session?.accessToken);
    const labels = await getProjectLabels(projectId, token);

    return labels.map(label => ({
        id: label.id,
        name: label.name,
        color: label.color,
        text_color: label.text_color,
        description: label.description || undefined,
    }));
}

/**
 * Get column by GitLab label from project's column mapping
 * Used by webhook handler for bidirectional sync
 */
export async function getColumnByGitLabLabel(
    projectId: number,
    gitlabLabel: string
): Promise<QAColumn | null> {
    const columns = await getProjectColumnMapping(projectId);
    return columns.find(col => col.gitlabLabel === gitlabLabel) || null;
}

/**
 * Get the column that matches the given column type
 * Used for finding passed/failed columns dynamically
 */
export async function getColumnByType(
    projectId: number,
    columnType: QAColumn['columnType']
): Promise<QAColumn | null> {
    const columns = await getProjectColumnMapping(projectId);
    return columns.find(col => col.columnType === columnType) || null;
}
