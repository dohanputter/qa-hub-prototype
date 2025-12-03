'use server';

import { auth } from '@/auth';
import { db } from '@/lib/db';
import { qaDraftHistory, qaRuns, qaIssues } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { JSONContent } from '@tiptap/core';

/**
 * Save a draft snapshot to history
 */
export async function saveDraftHistory(data: {
    qaRunId: string;
    testCasesContent?: JSONContent;
    issuesFoundContent?: JSONContent;
    saveType?: 'auto' | 'manual';
}) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    // Verify the run belongs to a valid project
    const runResults = await db
        .select({
            run: qaRuns,
            issue: qaIssues,
        })
        .from(qaRuns)
        .innerJoin(qaIssues, eq(qaRuns.qaIssueId, qaIssues.id))
        .where(eq(qaRuns.id, data.qaRunId))
        .limit(1);

    if (!runResults.length) {
        throw new Error('QA Run not found');
    }

    // Create draft snapshot
    const [draft] = await db.insert(qaDraftHistory).values({
        qaRunId: data.qaRunId,
        testCasesContent: data.testCasesContent || null,
        issuesFoundContent: data.issuesFoundContent || null,
        savedBy: session.user.id,
        saveType: data.saveType || 'auto',
    }).returning();

    return { success: true, draft };
}

/**
 * Get draft history for a QA run
 */
export async function getDraftHistory(qaRunId: string, limit = 20) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    // Verify the run belongs to a valid project
    const runResults = await db
        .select({
            run: qaRuns,
            issue: qaIssues,
        })
        .from(qaRuns)
        .innerJoin(qaIssues, eq(qaRuns.qaIssueId, qaIssues.id))
        .where(eq(qaRuns.id, qaRunId))
        .limit(1);

    if (!runResults.length) {
        throw new Error('QA Run not found');
    }

    const drafts = await db
        .select()
        .from(qaDraftHistory)
        .where(eq(qaDraftHistory.qaRunId, qaRunId))
        .orderBy(desc(qaDraftHistory.createdAt))
        .limit(limit);

    return drafts;
}

/**
 * Restore a draft from history
 */
export async function restoreDraft(draftId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    const [draft] = await db
        .select()
        .from(qaDraftHistory)
        .where(eq(qaDraftHistory.id, draftId))
        .limit(1);

    if (!draft) {
        throw new Error('Draft not found');
    }

    // Verify the run belongs to a valid project
    const runResults = await db
        .select({
            run: qaRuns,
            issue: qaIssues,
        })
        .from(qaRuns)
        .innerJoin(qaIssues, eq(qaRuns.qaIssueId, qaIssues.id))
        .where(eq(qaRuns.id, draft.qaRunId))
        .limit(1);

    if (!runResults.length) {
        throw new Error('QA Run not found');
    }

    return {
        success: true,
        draft: {
            id: draft.id,
            testCasesContent: draft.testCasesContent,
            issuesFoundContent: draft.issuesFoundContent,
            createdAt: draft.createdAt,
            saveType: draft.saveType,
        },
    };
}

/**
 * Clean up old draft history (keep last 50 per run)
 */
export async function cleanupOldDrafts(qaRunId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    // Get all drafts for this run
    const drafts = await db
        .select({ id: qaDraftHistory.id })
        .from(qaDraftHistory)
        .where(eq(qaDraftHistory.qaRunId, qaRunId))
        .orderBy(desc(qaDraftHistory.createdAt));

    // Delete all but the last 50
    if (drafts.length > 50) {
        const idsToDelete = drafts.slice(50).map(d => d.id);
        await db
            .delete(qaDraftHistory)
            .where(
                and(
                    eq(qaDraftHistory.qaRunId, qaRunId),
                    // Delete only the old ones
                )
            );
    }

    return { success: true };
}
