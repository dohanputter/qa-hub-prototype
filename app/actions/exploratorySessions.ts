'use server';

import { auth } from '@/auth';
import { db } from '@/lib/db';
import { exploratorySessions, sessionNotes, qaBlockers, projects, users, qaIssues } from '@/db/schema';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getIssue } from '@/lib/gitlab';
import { safeParse, startSessionSchema, captureNoteSchema, createBlockerSchema, resolveBlockerSchema } from '@/lib/validations';
import { isMockMode } from '@/lib/mode';
import { SYSTEM_USERS } from '@/lib/constants';
import { logger } from '@/lib/logger';
import type { JSONContent } from '@tiptap/core';

// --- Session Management ---

export async function startExploratorySession(data: unknown) {
    const session = await auth();
    if (!session?.user?.id && !isMockMode()) throw new Error('Unauthorized');

    const parsed = safeParse(startSessionSchema, data);
    if (!parsed.success) throw new Error(parsed.error);
    const { projectId, charter, issueId, testArea, environment } = parsed.data;

    const userId = session?.user?.id || SYSTEM_USERS.MOCK;

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

    const userId = session?.user?.id || SYSTEM_USERS.MOCK;

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

export async function pauseSession(sessionId: number) {
    const session = await auth();
    if (!session?.user?.id && !isMockMode()) throw new Error('Unauthorized');

    try {
        await db.update(exploratorySessions)
            .set({
                status: 'paused',
                pausedAt: new Date(),
            })
            .where(eq(exploratorySessions.id, sessionId));

        revalidatePath(`/sessions/${sessionId}`);
        return { success: true };
    } catch (error) {
        logger.error('Failed to pause session', error);
        throw new Error('Failed to pause session');
    }
}

export async function resumeSession(sessionId: number) {
    const session = await auth();
    if (!session?.user?.id && !isMockMode()) throw new Error('Unauthorized');

    try {
        // Get current session to calculate pause duration
        const currentSession = await db.query.exploratorySessions.findFirst({
            where: eq(exploratorySessions.id, sessionId),
        });

        if (!currentSession) throw new Error('Session not found');
        if (!currentSession.pausedAt) throw new Error('Session is not paused');

        // Calculate how long the session was paused
        const pausedAt = new Date(currentSession.pausedAt).getTime();
        const now = new Date().getTime();
        const pauseDuration = Math.round((now - pausedAt) / 1000); // in seconds

        // Add to total paused duration
        const totalPausedDuration = (currentSession.totalPausedDuration || 0) + pauseDuration;

        await db.update(exploratorySessions)
            .set({
                status: 'active',
                pausedAt: null,
                totalPausedDuration,
            })
            .where(eq(exploratorySessions.id, sessionId));

        revalidatePath(`/sessions/${sessionId}`);
        return { success: true };
    } catch (error) {
        logger.error('Failed to resume session', error);
        throw new Error('Failed to resume session');
    }
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
        let totalPausedDuration = currentSession.totalPausedDuration || 0;

        // If the session is currently paused, add the current pause duration
        if (currentSession.status === 'paused' && currentSession.pausedAt) {
            const pausedAt = new Date(currentSession.pausedAt).getTime();
            const currentPauseDuration = Math.round((completedAt.getTime() - pausedAt) / 1000);
            totalPausedDuration += currentPauseDuration;
        }

        // Total duration is the total time minus time spent paused
        const totalDuration = Math.round((completedAt.getTime() - startedAt.getTime()) / 1000) - totalPausedDuration;

        await db.update(exploratorySessions)
            .set({
                status: 'completed',
                completedAt,
                totalDuration,
                totalPausedDuration,
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
        let totalPausedDuration = currentSession.totalPausedDuration || 0;

        // If the session is currently paused, add the current pause duration
        if (currentSession.status === 'paused' && currentSession.pausedAt) {
            const pausedAt = new Date(currentSession.pausedAt).getTime();
            const currentPauseDuration = Math.round((abandonedAt.getTime() - pausedAt) / 1000);
            totalPausedDuration += currentPauseDuration;
        }

        // Total duration is the total time minus time spent paused
        const totalDuration = Math.round((abandonedAt.getTime() - startedAt.getTime()) / 1000) - totalPausedDuration;

        await db.update(exploratorySessions)
            .set({
                status: 'abandoned',
                completedAt: abandonedAt,
                totalDuration,
                totalPausedDuration,
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

export async function deleteSession(sessionId: number) {
    const session = await auth();
    if (!session?.user?.id && !isMockMode()) throw new Error('Unauthorized');

    try {
        // Get session details before deletion
        const currentSession = await db.query.exploratorySessions.findFirst({
            where: eq(exploratorySessions.id, sessionId),
        });

        if (!currentSession) throw new Error('Session not found');

        const projectId = currentSession.projectId;

        // 1. Delete all session notes (required FK, cascade)
        await db.delete(sessionNotes).where(eq(sessionNotes.sessionId, sessionId));

        // 2. Unlink blockers (optional FK, set to null)
        await db.update(qaBlockers)
            .set({ sessionId: null })
            .where(eq(qaBlockers.sessionId, sessionId));

        // 3. Delete the session itself
        await db.delete(exploratorySessions).where(eq(exploratorySessions.id, sessionId));

        // 4. Revalidate paths
        revalidatePath(`/${projectId}/sessions`);
        revalidatePath(`/${projectId}/blockers`);

        return { success: true };
    } catch (error) {
        logger.error('Failed to delete session', error);
        throw new Error('Failed to delete session');
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
                    relatedIssueId: currentSession.issueId,
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

    let relatedIssueId: string | undefined = blockerData.relatedIssueId ? String(blockerData.relatedIssueId) : undefined;

    // If relatedIssueId is provided, check if it's a UUID or an IID
    if (relatedIssueId) {
        // Check if it's a UUID (simple regex check)
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(relatedIssueId);

        if (!isUuid) {
            // Assume it's an IID (GitLab IID)
            const iid = Number(relatedIssueId);

            // Try to find existing issue in local DB
            const existingIssue = await db.query.qaIssues.findFirst({
                where: and(
                    eq(qaIssues.gitlabProjectId, blockerData.projectId),
                    eq(qaIssues.gitlabIssueIid, iid)
                )
            });

            if (existingIssue) {
                relatedIssueId = existingIssue.id;
            } else {
                // Issue not in local DB, try to fetch from GitLab and sync
                try {
                    const session = await auth();
                    if (session?.accessToken) {
                        const gitlabIssue = await getIssue(blockerData.projectId, iid, session.accessToken);

                        if (gitlabIssue) {
                            // Sync issue to local DB
                            const [newIssue] = await db.insert(qaIssues).values({
                                gitlabIssueId: gitlabIssue.id,
                                gitlabIssueIid: gitlabIssue.iid,
                                gitlabProjectId: gitlabIssue.project_id,
                                issueTitle: gitlabIssue.title,
                                issueDescription: gitlabIssue.description,
                                issueUrl: gitlabIssue.web_url,
                                status: gitlabIssue.state === 'opened' ? 'pending' : 'passed', // Simplified mapping
                                jsonLabels: gitlabIssue.labels,
                                createdAt: new Date(gitlabIssue.created_at),
                                updatedAt: new Date(gitlabIssue.updated_at),
                            }).returning();

                            relatedIssueId = newIssue.id;
                        }
                    }
                } catch (error) {
                    logger.error('Failed to sync issue for blocker', error);
                    // If sync fails, we can't link the issue, so we leave relatedIssueId as is (which will fail FK)
                    // or set to null? Better to fail so we know something is wrong, or set to null to allow blocker creation?
                    // The user wants it linked. If we can't link, maybe we should still create the blocker but warn?
                    // But the FK constraint will fail if we pass the IID.
                    // So we must set it to null if we can't resolve it.
                    relatedIssueId = undefined;
                }
            }
        }
    }

    // If linked to a session but no issue ID provided, try to find it from the session
    if (blockerData.sessionId && !relatedIssueId) {
        const session = await db.query.exploratorySessions.findFirst({
            where: eq(exploratorySessions.id, blockerData.sessionId),
        });
        if (session?.issueId) {
            relatedIssueId = session.issueId;
        }
    }

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
            relatedIssueId: relatedIssueId,
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

        // Revalidate blockers page to reflect the resolved status
        revalidatePath(`/${updatedBlocker.projectId}/blockers`);

        return { success: true };
    } catch (error) {
        logger.error('Failed to resolve blocker', error);
        throw new Error('Failed to resolve blocker');
    }
}

export async function updateBlocker(blockerId: number, updates: {
    title?: string;
    description?: JSONContent;
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
            relatedIssue: true,
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
