'use server';
import 'server-only';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { qaRecords, attachments, notifications, projects } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import {
    getIssue,
    createIssueNote,
    updateIssueLabels,
    getProjectMembers,
} from '@/lib/gitlab';
import { tiptapToMarkdown, extractMentions } from '@/lib/utils';
import { revalidatePath, revalidateTag } from 'next/cache';
import { env } from '@/lib/env';
import type { JSONContent } from '@tiptap/core';

export async function createOrUpdateQARecord(data: {
    projectId: number;
    issueIid: number;
    testCasesContent?: JSONContent;
    issuesFoundContent?: JSONContent;
}) {
    const session = await auth();
    if (!session?.accessToken || !session.user?.id) throw new Error('Unauthorized');

    const issue = await getIssue(data.projectId, data.issueIid, session.accessToken);

    const existingResults = await db
        .select()
        .from(qaRecords)
        .where(eq(qaRecords.gitlabIssueId, issue.id))
        .limit(1);

    const existing = existingResults[0];

    if (existing) {
        const [updated] = await db
            .update(qaRecords)
            .set({
                testCasesContent: data.testCasesContent || existing.testCasesContent,
                issuesFoundContent: data.issuesFoundContent || existing.issuesFoundContent,
                updatedAt: new Date(),
            })
            .where(eq(qaRecords.id, existing.id))
            .returning();
        return updated;
    } else {
        const [created] = await db
            .insert(qaRecords)
            .values({
                gitlabIssueId: issue.id,
                gitlabIssueIid: issue.iid,
                gitlabProjectId: data.projectId,
                issueTitle: issue.title,
                issueDescription: issue.description || '',
                issueUrl: issue.web_url,
                testCasesContent: data.testCasesContent || null,
                issuesFoundContent: data.issuesFoundContent || null,
                createdBy: session.user.id,
                status: 'pending',
            })
            .returning();
        return created;
    }
}

export async function submitQAResult(qaRecordId: string, result: 'passed' | 'failed') {
    const session = await auth();
    if (!session?.accessToken || !session.user?.id) throw new Error('Unauthorized');

    const recordResults = await db
        .select({
            qaRecord: qaRecords,
        })
        .from(qaRecords)
        .where(eq(qaRecords.id, qaRecordId))
        .limit(1);

    const qaRecordData = recordResults[0]?.qaRecord;
    if (!qaRecordData) throw new Error('QA record not found');

    // Fetch related data
    const attachmentsResults = await db
        .select()
        .from(attachments)
        .where(eq(attachments.qaRecordId, qaRecordId));

    const projectResults = await db
        .select()
        .from(projects)
        .where(eq(projects.id, qaRecordData.gitlabProjectId))
        .limit(1);

    const record = {
        ...qaRecordData,
        attachments: attachmentsResults,
        project: projectResults[0]
    };

    if (!record) throw new Error('QA record not found');
    if (!record.project.qaLabelMapping) throw new Error('Project labels not configured');

    const labelMapping = record.project.qaLabelMapping;
    let commentBody = '';

    if (result === 'passed') {
        const shareUrl = `${env.NEXT_PUBLIC_APP_URL}/shared/${record.shareUuid}`;
        commentBody = `## ✅ QA Passed\n\n**View full QA details:** ${shareUrl}\n\n`;
        if (record.testCasesContent) {
            commentBody += `### Test Cases Executed\n\n`;
            commentBody += tiptapToMarkdown(record.testCasesContent as JSONContent);
        }
    } else {
        commentBody = `## ❌ QA Failed\n\n`;
        if (record.issuesFoundContent) {
            commentBody += `### Issues Found\n\n`;
            commentBody += tiptapToMarkdown(record.issuesFoundContent as JSONContent);
            if (record.attachments.length > 0) {
                commentBody += `\n\n### Attachments\n\n`;
                record.attachments.forEach((att: typeof attachments.$inferSelect) => (commentBody += `- ${att.markdown}\n`));
            }
        }
    }

    const mentions: string[] = [];
    if (record.testCasesContent) mentions.push(...extractMentions(record.testCasesContent as JSONContent));
    if (record.issuesFoundContent) mentions.push(...extractMentions(record.issuesFoundContent as JSONContent));

    try {
        await createIssueNote(record.gitlabProjectId, record.gitlabIssueIid, session.accessToken, commentBody);

        const newLabel = result === 'passed' ? labelMapping.passed : labelMapping.failed;
        const labelsToRemove = [labelMapping.pending, labelMapping.passed, labelMapping.failed].filter((l) => l !== newLabel);

        await updateIssueLabels(record.gitlabProjectId, record.gitlabIssueIid, session.accessToken, {
            addLabels: [newLabel],
            removeLabels: labelsToRemove,
        });
    } catch (gitlabError) {
        console.error('GitLab update failed:', gitlabError);
        throw new Error('Failed to update GitLab. Please try again.');
    }

    await db.update(qaRecords)
        .set({ status: result, completedAt: new Date(), updatedAt: new Date() })
        .where(eq(qaRecords.id, qaRecordId));

    await db.update(attachments)
        .set({ qaRecordId })
        .where(isNull(attachments.qaRecordId));

    if (mentions.length > 0) {
        const members = await getProjectMembers(record.gitlabProjectId, session.accessToken);
        const memberMap = new Map(members.map((m) => [m.username, m.id.toString()]));

        for (const mention of mentions) {
            const userId = memberMap.get(mention);
            if (userId) {
                await db.insert(notifications).values({
                    userId,
                    type: 'mention',
                    title: `Mentioned in QA: ${record.issueTitle}`,
                    message: `You were mentioned in QA testing for issue #${record.gitlabIssueIid}`,
                    resourceType: 'qa_record',
                    resourceId: qaRecordId,
                    actionUrl: record.issueUrl,
                });
            }
        }
    }

    revalidateTag(`issues-${record.gitlabProjectId}`);
    revalidatePath(`/${record.gitlabProjectId}/board`);

    return {
        success: true,
        shareUrl: result === 'passed' ? `${env.NEXT_PUBLIC_APP_URL}/shared/${record.shareUuid}` : null
    };
}

export async function deleteQARecord(qaRecordId: string) {
    const session = await auth();
    if (!session?.accessToken) throw new Error('Unauthorized');

    const recordResults = await db
        .select()
        .from(qaRecords)
        .where(eq(qaRecords.id, qaRecordId))
        .limit(1);

    const qaRecordData = recordResults[0];
    if (!qaRecordData) throw new Error('Record not found');

    // Fetch attachments
    const attachmentsResults = await db
        .select()
        .from(attachments)
        .where(eq(attachments.qaRecordId, qaRecordId));

    const record = {
        ...qaRecordData,
        attachments: attachmentsResults
    };

    if (!record) throw new Error('Record not found');

    if (record.attachments.length > 0) {
        console.warn(
            `⚠️ GitLab does not support programmatic file deletion. ${record.attachments.length} file(s) remain in GitLab storage.`
        );
    }

    await db.delete(qaRecords).where(eq(qaRecords.id, qaRecordId));

    revalidatePath(`/${record.gitlabProjectId}`);
    return { success: true, storageWarning: record.attachments.length > 0 };
}
