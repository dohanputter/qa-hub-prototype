'use server';

import { db } from '@/lib/db';
import { qaIssues, projects } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { isMockMode } from '@/lib/mode';
import { logger } from '@/lib/logger';
import { revalidatePath } from 'next/cache';
import { mapLabelToStatus } from '@/lib/utils';

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Check if a project's issue cache is stale
 */
export async function isProjectCacheStale(projectId: number): Promise<boolean> {
    const [project] = await db
        .select({ lastSyncedAt: projects.lastSyncedAt })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

    if (!project?.lastSyncedAt) {
        return true; // Never synced, definitely stale
    }

    const timeSinceSync = Date.now() - project.lastSyncedAt.getTime();
    return timeSinceSync > CACHE_DURATION_MS;
}

/**
 * Get the last synced timestamp for a project
 */
export async function getProjectLastSynced(projectId: number): Promise<Date | null> {
    const [project] = await db
        .select({ lastSyncedAt: projects.lastSyncedAt })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

    return project?.lastSyncedAt || null;
}

/**
 * Sync issues from GitLab to the local database for a specific project
 */
export async function syncProjectIssues(projectId: number): Promise<{ synced: number; created: number; updated: number }> {
    const session = await auth();

    // In mock mode, DB is already the source of truth
    if (isMockMode()) {
        logger.mock(`syncProjectIssues: Skipping sync in mock mode for project ${projectId}`);
        return { synced: 0, created: 0, updated: 0 };
    }

    if (!session?.accessToken) {
        throw new Error('Unauthorized');
    }

    logger.info(`syncProjectIssues: Starting sync for project ${projectId}`);

    // Get project for label mapping
    const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

    if (!project) {
        throw new Error(`Project ${projectId} not found`);
    }

    // Fetch issues from GitLab API
    const { getGitlabClient } = await import('@/lib/gitlab');
    const gitlab = getGitlabClient(session.accessToken);

    let allIssues: any[] = [];
    try {
        // Fetch both opened and closed issues
        const openedIssues = await gitlab.Issues.all({ projectId, state: 'opened' });
        const closedIssues = await gitlab.Issues.all({ projectId, state: 'closed' });
        allIssues = [...openedIssues, ...closedIssues];
    } catch (error) {
        logger.error(`syncProjectIssues: Failed to fetch issues from GitLab for project ${projectId}`, error);
        throw new Error('Failed to fetch issues from GitLab');
    }

    logger.info(`syncProjectIssues: Fetched ${allIssues.length} issues from GitLab`);

    let created = 0;
    let updated = 0;

    // Upsert each issue to the database
    for (const issue of allIssues) {
        const labels = issue.labels?.map((l: any) => typeof l === 'string' ? l : l.name || l) || [];
        const status = project.qaLabelMapping
            ? (mapLabelToStatus(labels, project.qaLabelMapping) || 'pending')
            : 'pending';

        // Check if issue exists
        const [existing] = await db
            .select({ id: qaIssues.id })
            .from(qaIssues)
            .where(and(
                eq(qaIssues.gitlabProjectId, projectId),
                eq(qaIssues.gitlabIssueIid, issue.iid)
            ))
            .limit(1);

        if (existing) {
            // Update existing issue
            await db.update(qaIssues)
                .set({
                    issueTitle: issue.title,
                    issueDescription: issue.description || '',
                    issueUrl: issue.web_url,
                    status: status, // Update status based on current labels
                    jsonLabels: labels,
                    issueState: issue.state as 'opened' | 'closed',
                    assigneeId: issue.assignees?.[0]?.id || null,
                    authorId: issue.author?.id || null,
                    updatedAt: new Date(),
                })
                .where(eq(qaIssues.id, existing.id));
            updated++;
        } else {
            // Create new issue
            await db.insert(qaIssues).values({
                gitlabIssueId: issue.id,
                gitlabIssueIid: issue.iid,
                gitlabProjectId: projectId,
                issueTitle: issue.title,
                issueDescription: issue.description || '',
                issueUrl: issue.web_url,
                status: status,
                jsonLabels: labels,
                issueState: issue.state as 'opened' | 'closed',
                assigneeId: issue.assignees?.[0]?.id || null,
                authorId: issue.author?.id || null,
                createdAt: new Date(issue.created_at),
                updatedAt: new Date(issue.updated_at),
            });
            created++;
        }
    }

    // Update lastSyncedAt timestamp
    await db.update(projects)
        .set({ lastSyncedAt: new Date() })
        .where(eq(projects.id, projectId));

    logger.info(`syncProjectIssues: Synced ${allIssues.length} issues (${created} created, ${updated} updated) for project ${projectId}`);

    // Revalidate paths
    revalidatePath(`/${projectId}/issues`);
    revalidatePath(`/${projectId}/board`);

    return { synced: allIssues.length, created, updated };
}

/**
 * Sync issues for all projects in a group
 */
export async function syncGroupIssues(groupId: number): Promise<{ projectsSynced: number; totalIssues: number }> {
    const session = await auth();

    if (isMockMode()) {
        logger.mock(`syncGroupIssues: Skipping sync in mock mode for group ${groupId}`);
        return { projectsSynced: 0, totalIssues: 0 };
    }

    if (!session?.accessToken) {
        throw new Error('Unauthorized');
    }

    // Get all projects in the group
    const { getGroupProjects } = await import('@/lib/gitlab');
    const groupProjects = await getGroupProjects(groupId, session.accessToken);

    let projectsSynced = 0;
    let totalIssues = 0;

    for (const project of groupProjects) {
        try {
            const result = await syncProjectIssues(project.id);
            projectsSynced++;
            totalIssues += result.synced;
        } catch (error) {
            logger.error(`syncGroupIssues: Failed to sync project ${project.id}`, error);
            // Continue with other projects
        }
    }

    return { projectsSynced, totalIssues };
}

/**
 * Trigger a background sync if cache is stale
 * This is called from getAllIssues to implement stale-while-revalidate
 */
export async function triggerBackgroundSyncIfStale(projectId: number): Promise<void> {
    const isStale = await isProjectCacheStale(projectId);

    if (isStale) {
        // Trigger sync in background (don't await)
        syncProjectIssues(projectId).catch(error => {
            logger.error(`Background sync failed for project ${projectId}`, error);
        });
    }
}
