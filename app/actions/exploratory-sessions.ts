'use server';

import { auth } from '@/auth';
import { db } from '@/lib/db';
import { exploratorySessions, sessionNotes, qaBlockers, projects, users, qaIssues } from '@/db/schema';
import { eq, desc, and, inArray, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { safeParse, startSessionSchema, captureNoteSchema, createBlockerSchema, resolveBlockerSchema } from '@/lib/validations';
import { isMockMode } from '@/lib/mode';
import { logger } from '@/lib/logger';
import type { JSONContent } from '@tiptap/core';

// --- Session Management ---

export async function startExploratorySession(data: unknown) {
    const session = await auth();
    if (!session?.user?.id && !isMockMode()) throw new Error('Unauthorized');

    const parsed = safeParse(startSessionSchema, data);
    if (!parsed.success) throw new Error(parsed.error);
    const { projectId, charter, issueId, testArea, environment } = parsed.data;

    const userId = session?.user?.id || 'mock-user-id';

    try {
        const [newSession] = await db.insert(exploratorySessions).values({
            userId,
            projectId,
            charter,
            issueId: issueId || null,
            testArea: testArea || null,
            environment: environment || null,
            status: 'active',
            startedAt: new Date(),
        }).returning();

        revalidatePath(`/sessions/${newSession.id}`);
        return { success: true, sessionId: newSession.id };
    } catch (error) {
        logger.error('Failed to start session', error);
        throw new Error('Failed to start session');
    }
}

export async function getActiveSession() {
    const session = await auth();
    if (!session?.user?.id && !isMockMode()) return null;

    const userId = session?.user?.id || 'mock-user-id';

    const activeSession = await db.query.exploratorySessions.findFirst({
        where: and(
            eq(exploratorySessions.userId, userId),
            eq(exploratorySessions.status, 'active')
        ),
        with: {
            project: true,
            issue: true,
        }
    });

    return activeSession;
}

export async function getSession(sessionId: number) {
    const session = await auth();
    if (!session?.user?.id && !isMockMode()) throw new Error('Unauthorized');

    const result = await db.query.exploratorySessions.findFirst({
        where: eq(exploratorySessions.id, sessionId),
        with: {
            project: true,
            issue: true,
            notes: {
                orderBy: [desc(sessionNotes.timestamp)],
            },
            blockers: true,
        }
    });

    if (!result) throw new Error('Session not found');
    return result;
}

export async function completeSession(sessionId: number, postTestNotes?: string) {
    const session = await auth();
    if (!session?.user?.id && !isMockMode()) throw new Error('Unauthorized');

    try {
        // Calculate duration
        const currentSession = await db.query.exploratorySessions.findFirst({
            where: eq(exploratorySessions.id, sessionId),
        });

        if (!currentSession) throw new Error('Session not found');

        const completedAt = new Date();
        const startedAt = currentSession.startedAt || new Date();
        const totalDuration = Math.round((completedAt.getTime() - startedAt.getTime()) / 1000);

        await db.update(exploratorySessions)
            .set({
                status: 'completed',
                completedAt,
                totalDuration,
                postTestNotes: postTestNotes || null,
            })
            .where(eq(exploratorySessions.id, sessionId));

        revalidatePath(`/sessions/${sessionId}`);
        revalidatePath(`/${currentSession.projectId}/sessions`);
        revalidatePath(`/${currentSession.projectId}/blockers`);
        return { success: true };
    } catch (error) {
        logger.error('Failed to complete session', error);
        throw new Error('Failed to complete session');
    }
}

export async function abandonSession(sessionId: number) {
    const session = await auth();
    if (!session?.user?.id && !isMockMode()) throw new Error('Unauthorized');

    try {
        const currentSession = await db.query.exploratorySessions.findFirst({
            where: eq(exploratorySessions.id, sessionId),
        });

        if (!currentSession) throw new Error('Session not found');

        const abandonedAt = new Date();
        const startedAt = currentSession.startedAt || new Date();
        const totalDuration = Math.round((abandonedAt.getTime() - startedAt.getTime()) / 1000);

        await db.update(exploratorySessions)
            .set({
                status: 'abandoned',
                completedAt: abandonedAt,
                totalDuration,
            })
            .where(eq(exploratorySessions.id, sessionId));

        revalidatePath(`/sessions/${sessionId}`);
        revalidatePath(`/${currentSession.projectId}/sessions`);
        return { success: true };
    } catch (error) {
        logger.error('Failed to abandon session', error);
        throw new Error('Failed to abandon session');
    }
}

// --- Note Capture ---

export async function captureSessionNote(data: unknown) {
    const session = await auth();
    if (!session?.user?.id && !isMockMode()) throw new Error('Unauthorized');

    const parsed = safeParse(captureNoteSchema, data);
    if (!parsed.success) throw new Error(parsed.error);
    const noteData = parsed.data;

    try {
        // 1. Create the note
        const [note] = await db.insert(sessionNotes).values({
            sessionId: noteData.sessionId,
            type: noteData.type,
            content: noteData.content,
            timestamp: noteData.timestamp ? new Date(noteData.timestamp) : new Date(),
            sessionTime: noteData.sessionTime,
            url: noteData.url,
            testDataUsed: noteData.testDataUsed,
            relatedCode: noteData.relatedCode,
            screenshotUrl: noteData.screenshotUrl,
            tags: noteData.tags,
            blockerSeverity: noteData.blockerSeverity,
            blockerReason: noteData.blockerReason,
        }).returning();

        // 2. Update session counters
        const counterMap: Record<string, string> = {
            'bug': 'issuesFoundCount',
            'blocker': 'blockersLoggedCount',
            'question': 'questionsCount',
            'out_of_scope': 'outOfScopeCount',
        };

        const fieldToIncrement = counterMap[noteData.type];

        if (fieldToIncrement) {
             await db.update(exploratorySessions)
                .set({
                    [fieldToIncrement]: sql`${exploratorySessions[fieldToIncrement as keyof typeof exploratorySessions._.columns]} + 1`
                })
                .where(eq(exploratorySessions.id, noteData.sessionId));
        }

        // 3. If it's a blocker, create a QA Blocker entry automatically
        if (noteData.type === 'blocker') {
            const currentSession = await db.query.exploratorySessions.findFirst({
                where: eq(exploratorySessions.id, noteData.sessionId),
            });

            if (currentSession) {
                await db.insert(qaBlockers).values({
                    sessionId: noteData.sessionId,
                    projectId: currentSession.projectId,
                    title: `Blocker from Session #${noteData.sessionId}`, // Default title, user can edit
                    description: noteData.content,
                    severity: noteData.blockerSeverity || 'medium',
                    blockingWhat: 'testing', // Default
                    createdFromNoteId: note.id,
                    status: 'active',
                });
            }
        }

        revalidatePath(`/sessions/${noteData.sessionId}`);
        return { success: true, noteId: note.id };
    } catch (error) {
        logger.error('Failed to capture note', error);
        throw new Error('Failed to capture note');
    }
}

// --- Blocker Management ---

export async function createBlocker(data: unknown) {
    const session = await auth();
    if (!session?.user?.id && !isMockMode()) throw new Error('Unauthorized');

    const parsed = safeParse(createBlockerSchema, data);
    if (!parsed.success) throw new Error(parsed.error);
    const blockerData = parsed.data;

    try {
        const [blocker] = await db.insert(qaBlockers).values({
            sessionId: blockerData.sessionId,
            projectId: blockerData.projectId,
            title: blockerData.title,
            description: blockerData.description,
            severity: blockerData.severity,
            blockingWhat: blockerData.blockingWhat,
            estimatedResolutionHours: blockerData.estimatedResolutionHours,
            createdFromNoteId: blockerData.createdFromNoteId,
            relatedIssueId: blockerData.relatedIssueId,
            status: 'active',
        }).returning();

        // If linked to a session, increment counter
        if (blockerData.sessionId) {
            await db.update(exploratorySessions)
                .set({
                    blockersLoggedCount: sql`${exploratorySessions.blockersLoggedCount} + 1`
                })
                .where(eq(exploratorySessions.id, blockerData.sessionId));

            revalidatePath(`/sessions/${blockerData.sessionId}`);
        }

        revalidatePath(`/${blockerData.projectId}/blockers`);

        return { success: true, blockerId: blocker.id };
    } catch (error) {
        logger.error('Failed to create blocker', error);
        throw new Error('Failed to create blocker');
    }
}

export async function resolveBlocker(data: unknown) {
    const session = await auth();
    if (!session?.user?.id && !isMockMode()) throw new Error('Unauthorized');

    const parsed = safeParse(resolveBlockerSchema, data);
    if (!parsed.success) throw new Error(parsed.error);
    const { blockerId, resolutionNotes, resolutionTimeHours } = parsed.data;

    try {
        const [updatedBlocker] = await db.update(qaBlockers)
            .set({
                status: 'resolved',
                resolvedAt: new Date(),
                resolutionNotes,
                resolutionTimeHours,
            })
            .where(eq(qaBlockers.id, blockerId))
            .returning();

        // Update session resolved count if applicable
        if (updatedBlocker.sessionId) {
            await db.update(exploratorySessions)
                .set({
                    blockersResolvedCount: sql`${exploratorySessions.blockersResolvedCount} + 1`
                })
                .where(eq(exploratorySessions.id, updatedBlocker.sessionId));

            revalidatePath(`/sessions/${updatedBlocker.sessionId}`);
        }


        return { success: true };
    } catch (error) {
        logger.error('Failed to resolve blocker', error);
        throw new Error('Failed to resolve blocker');
    }
}

export async function updateBlocker(blockerId: number, updates: {
    title?: string;
    description?: any;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    status?: 'active' | 'resolved' | 'escalated';
    blockingWhat?: 'testing' | 'development' | 'deployment';
    resolutionNotes?: string;
}) {
    const session = await auth();
    if (!session?.user?.id && !isMockMode()) throw new Error('Unauthorized');

    try {
        const [updatedBlocker] = await db.update(qaBlockers)
            .set(updates)
            .where(eq(qaBlockers.id, blockerId))
            .returning();

        // Revalidate relevant paths
        if (updatedBlocker.sessionId) {
            revalidatePath(`/sessions/${updatedBlocker.sessionId}`);
        }
        revalidatePath(`/${updatedBlocker.projectId}/blockers`);


        return { success: true, blocker: updatedBlocker };
    } catch (error) {
        logger.error('Failed to update blocker', error);
        throw new Error('Failed to update blocker');
    }
}

export async function deleteBlocker(blockerId: number) {
    const session = await auth();
    if (!session?.user?.id && !isMockMode()) throw new Error('Unauthorized');

    try {
        // Get blocker details before deletion
        const blocker = await db.query.qaBlockers.findFirst({
            where: eq(qaBlockers.id, blockerId),
        });

        if (!blocker) throw new Error('Blocker not found');

        // Delete the blocker
        await db.delete(qaBlockers).where(eq(qaBlockers.id, blockerId));

        // Decrement session counter if applicable
        if (blocker.sessionId) {
            // Ensure we don't go below 0 (though unlikely if logic is correct)
            await db.update(exploratorySessions)
                .set({
                    blockersLoggedCount: sql`MAX(0, ${exploratorySessions.blockersLoggedCount} - 1)`
                })
                .where(eq(exploratorySessions.id, blocker.sessionId));

            revalidatePath(`/sessions/${blocker.sessionId}`);
        }

        // Revalidate paths
        revalidatePath(`/${blocker.projectId}/blockers`);


        return { success: true };
    } catch (error) {
        logger.error('Failed to delete blocker', error);
        throw new Error('Failed to delete blocker');
    }
}

export async function getProjectBlockers(groupIdOrProjectId: number) {
    const session = await auth();
    if (!session?.user?.id && !isMockMode()) return [];

    // Fetch all projects in this group
    const projectsList = await db.query.projects.findMany({
        where: eq(projects.groupId, groupIdOrProjectId)
    });

    const projectIds = projectsList.map(p => p.id);

    // If no projects found, the ID might be a direct project ID (backward compatibility)
    if (projectIds.length === 0) {
        projectIds.push(groupIdOrProjectId);
    }

    const blockers = await db.query.qaBlockers.findMany({
        where: inArray(qaBlockers.projectId, projectIds),
        orderBy: [desc(qaBlockers.createdAt)],
        with: {
            session: true,
        }
    });

    return blockers;
}

export async function getProjectSessions(groupIdOrProjectId: number) {
    const session = await auth();
    if (!session?.user?.id && !isMockMode()) return [];

    // Fetch all projects in this group
    const projectsList = await db.query.projects.findMany({
        where: eq(projects.groupId, groupIdOrProjectId)
    });

    const projectIds = projectsList.map(p => p.id);

    // If no projects found, the ID might be a direct project ID (backward compatibility)
    if (projectIds.length === 0) {
        projectIds.push(groupIdOrProjectId);
    }

    const sessions = await db.query.exploratorySessions.findMany({
        where: inArray(exploratorySessions.projectId, projectIds),
        orderBy: [desc(exploratorySessions.startedAt)],
        with: {
            user: true,
            issue: true,
        }
    });

    return sessions;
}
