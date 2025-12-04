'use server';
import 'server-only';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { qaIssues, qaRuns, attachments, notifications, projects, groups, users, accounts } from '@/db/schema';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import {
    getIssue,
    createIssueNote,
    updateIssueLabels,
    getProjectMembers,
    getProject,
} from '@/lib/gitlab';
import { tiptapToMarkdown, extractMentions } from '@/lib/tiptap';
import { revalidatePath, revalidateTag } from 'next/cache';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { createNotification } from './notifications';
import type { JSONContent } from '@tiptap/core';

export async function getOrCreateQARun(data: {
    projectId: number;
    issueIid: number;
    testCasesContent?: JSONContent;
    issuesFoundContent?: JSONContent;
    forceNewRun?: boolean;
}) {
    const session = await auth();
    if (!session?.accessToken || !session.user?.id) throw new Error('Unauthorized');

    // 1. Fetch Issue from GitLab
    const issue = await getIssue(data.projectId, data.issueIid, session.accessToken);
    if (!issue) {
        throw new Error(`Issue not found: Project ${data.projectId}, IID ${data.issueIid}`);
    }

    // 2. Ensure User Exists
    const [existingUser] = await db.select().from(users).where(eq(users.id, session.user.id));
    if (!existingUser) {
        await db.insert(users).values({
            id: session.user.id,
            name: session.user.name || 'Unknown User',
            email: session.user.email || '',
        });
    }

    // 3. Ensure Project Exists
    const [existingProject] = await db.select().from(projects).where(eq(projects.id, data.projectId));
    if (!existingProject) {
        const projectData = await getProject(data.projectId, session.accessToken);
        if (projectData.namespace && projectData.namespace.kind === 'group') {
            const [existingGroup] = await db.select().from(groups).where(eq(groups.id, projectData.namespace.id));
            if (!existingGroup) {
                await db.insert(groups).values({
                    id: projectData.namespace.id,
                    name: projectData.namespace.name,
                    fullPath: projectData.namespace.full_path,
                    webUrl: (projectData.namespace as any).web_url || '',
                });
            }
        }
        await db.insert(projects).values({
            id: projectData.id,
            groupId: projectData.namespace?.kind === 'group' ? projectData.namespace.id : null,
            name: projectData.name,
            description: projectData.description,
            webUrl: projectData.web_url,
        });
    }

    // 4. Find or Create QA Issue
    let qaIssueId: string;
    const existingIssue = await db
        .select()
        .from(qaIssues)
        .where(eq(qaIssues.gitlabIssueId, issue.id))
        .limit(1);

    if (existingIssue.length > 0) {
        qaIssueId = existingIssue[0].id;
        // Sync title/desc
        await db.update(qaIssues).set({
            issueTitle: issue.title,
            issueDescription: issue.description || '',
            updatedAt: new Date()
        }).where(eq(qaIssues.id, qaIssueId));
    } else {
        const [createdIssue] = await db.insert(qaIssues).values({
            gitlabIssueId: issue.id,
            gitlabIssueIid: issue.iid,
            gitlabProjectId: data.projectId,
            issueTitle: issue.title,
            issueDescription: issue.description || '',
            issueUrl: issue.web_url,
            status: 'pending',
        }).returning();
        qaIssueId = createdIssue.id;
    }

    // 5. Find Active Run or Create New One
    const runs = await db
        .select()
        .from(qaRuns)
        .where(eq(qaRuns.qaIssueId, qaIssueId))
        .orderBy(desc(qaRuns.runNumber));

    const latestRun = runs[0];
    const activeRun = runs.find(r => r.status === 'pending');

    if (activeRun && !data.forceNewRun) {
        if (data.testCasesContent || data.issuesFoundContent) {
            const [updated] = await db.update(qaRuns).set({
                testCasesContent: data.testCasesContent || activeRun.testCasesContent,
                issuesFoundContent: data.issuesFoundContent || activeRun.issuesFoundContent,
                updatedAt: new Date(),
            }).where(eq(qaRuns.id, activeRun.id)).returning();
            return { run: updated, issueId: qaIssueId };
        }
        return { run: activeRun, issueId: qaIssueId };
    } else {
        const nextRunNumber = latestRun ? latestRun.runNumber + 1 : 1;

        const [newRun] = await db.insert(qaRuns).values({
            qaIssueId: qaIssueId,
            runNumber: nextRunNumber,
            status: 'pending',
            createdBy: session.user.id,
            testCasesContent: data.testCasesContent || null,
            issuesFoundContent: data.issuesFoundContent || null,
        }).returning();

        return { run: newRun, issueId: qaIssueId };
    }
}

export async function submitQARun(projectId: number, runId: string, result: 'passed' | 'failed') {
    const session = await auth();
    if (!session?.accessToken || !session.user?.id) throw new Error('Unauthorized');

    const runResults = await db
        .select({
            run: qaRuns,
            issue: qaIssues,
        })
        .from(qaRuns)
        .innerJoin(qaIssues, eq(qaRuns.qaIssueId, qaIssues.id))
        .where(and(
            eq(qaRuns.id, runId),
            eq(qaIssues.gitlabProjectId, projectId) // Security: verify record belongs to project
        ))
        .limit(1);

    const data = runResults[0];
    if (!data) throw new Error('QA Run not found');

    const { run, issue } = data;

    const projectResults = await db
        .select()
        .from(projects)
        .where(eq(projects.id, issue.gitlabProjectId))
        .limit(1);

    const project = projectResults[0];
    const isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

    // Default label mapping for mock mode or when not configured
    const defaultLabelMapping = {
        pending: 'QA::Pending',
        passed: 'QA::Passed',
        failed: 'QA::Failed'
    };

    const labelMapping = project?.qaLabelMapping || defaultLabelMapping;

    const attachmentsResults = await db
        .select()
        .from(attachments)
        .where(eq(attachments.qaRunId, runId));

    let commentBody = '';
    const shareUrl = `${env.NEXT_PUBLIC_APP_URL}/shared/${run.shareUuid}`;

    if (result === 'passed') {
        commentBody = `## ✅ QA Passed (Run #${run.runNumber})\n\n**View details:** ${shareUrl}\n\n`;
        if (run.testCasesContent) {
            commentBody += `### Test Cases Executed\n\n`;
            commentBody += tiptapToMarkdown(run.testCasesContent as JSONContent);
        }
    } else {
        commentBody = `## ❌ QA Failed (Run #${run.runNumber})\n\n**View details:** ${shareUrl}\n\n`;
        if (run.issuesFoundContent) {
            commentBody += `### Issues Found\n\n`;
            commentBody += tiptapToMarkdown(run.issuesFoundContent as JSONContent);
            if (attachmentsResults.length > 0) {
                commentBody += `\n\n### Attachments\n\n`;
                attachmentsResults.forEach((att) => (commentBody += `- ${att.markdown}\n`));
            }
        }
    }

    const mentions: string[] = [];
    if (run.testCasesContent) mentions.push(...extractMentions(run.testCasesContent as JSONContent));
    if (run.issuesFoundContent) mentions.push(...extractMentions(run.issuesFoundContent as JSONContent));

    // Only update GitLab if we have proper label configuration or in mock mode
    try {
        const newLabel = result === 'passed' ? labelMapping.passed : labelMapping.failed;
        const labelsToRemove = [labelMapping.pending, labelMapping.passed, labelMapping.failed].filter((l) => l !== newLabel);

        if (isMockMode) {
            logger.mock('Updating labels', {
                add: newLabel,
                remove: labelsToRemove
            });

            // Actually update labels in mock mode so the board reflects the change
            await updateIssueLabels(issue.gitlabProjectId, issue.gitlabIssueIid, 'mock-token', {
                addLabels: [newLabel],
                removeLabels: labelsToRemove,
            });

            logger.mock('Would create GitLab comment', commentBody);
        } else if (project?.qaLabelMapping) {
            // Only update GitLab if labels are properly configured
            await createIssueNote(issue.gitlabProjectId, issue.gitlabIssueIid, session.accessToken, commentBody);

            await updateIssueLabels(issue.gitlabProjectId, issue.gitlabIssueIid, session.accessToken, {
                addLabels: [newLabel],
                removeLabels: labelsToRemove,
            });
        } else {
            logger.warn('Project labels not configured, skipping GitLab updates. Please configure labels in project settings.');
        }
    } catch (gitlabError) {
        logger.error('GitLab update failed', gitlabError);
        // Don't throw in mock mode, just log
        if (!isMockMode) {
            throw new Error('Failed to update GitLab. Please try again.');
        }
    }

    await db.update(qaRuns)
        .set({ status: result, completedAt: new Date(), updatedAt: new Date() })
        .where(eq(qaRuns.id, runId));

    // Calculate and update cumulative time
    const runCreatedAt = run.createdAt ? new Date(run.createdAt).getTime() : Date.now();
    const duration = Date.now() - runCreatedAt;

    await db.update(qaIssues)
        .set({
            status: result,
            cumulativeTimeMs: sql`${qaIssues.cumulativeTimeMs} + ${duration}`,
            updatedAt: new Date()
        })
        .where(eq(qaIssues.id, issue.id));

    // Clean up any pending attachments for this run (just in case)
    await db.update(attachments)
        .set({ qaRunId: runId })
        .where(and(isNull(attachments.qaRunId), eq(attachments.uploadedBy, session.user.id)));

    if (mentions.length > 0) {
        const members = await getProjectMembers(issue.gitlabProjectId, session.accessToken);
        const memberMap = new Map(members.map((m) => [m.username, m.id]));

        for (const mention of mentions) {
            let gitlabUserId = memberMap.get(mention);

            if (gitlabUserId) {
                let targetUserId: string | null = null;

                // In Mock Mode, we trust the ID directly (as mock users don't have accounts entries)
                if (isMockMode) {
                    targetUserId = gitlabUserId.toString();
                } else {
                    // In Production, map GitLab ID to local User UUID via accounts table
                    const account = await db.select()
                        .from(accounts)
                        .where(and(
                            eq(accounts.provider, 'gitlab'),
                            eq(accounts.providerAccountId, gitlabUserId.toString())
                        ))
                        .limit(1);

                    if (account.length > 0) {
                        targetUserId = account[0].userId;
                    }
                }

                if (targetUserId) {
                    // Double check if user exists in users table to enforce FK constraint
                    const userExists = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);

                    if (userExists.length > 0) {
                        await createNotification({
                            userId: targetUserId,
                            type: 'mention',
                            title: `Mentioned in QA (Run #${run.runNumber})`,
                            message: `You were mentioned in QA testing for issue #${issue.gitlabIssueIid}`,
                            resourceType: 'qa_run',
                            resourceId: runId,
                            actionUrl: issue.issueUrl,
                        });
                    }
                }
            }
        }
    }

    // Create notification for status change
    // Notify the user who created the run (if different from current user) or just log it for the project
    // For now, let's notify the current user to verify it works in the UI
    await createNotification({
        userId: session.user.id,
        type: 'status_change',
        title: `QA Run #${run.runNumber} ${result === 'passed' ? 'Passed' : 'Failed'}`,
        message: `QA Run for issue #${issue.gitlabIssueIid} has ${result}.`,
        resourceType: 'qa_run',
        resourceId: runId,
        actionUrl: `/${projectId}/issues/${issue.gitlabIssueIid}`,
    });

    revalidateTag(`issues-${issue.gitlabProjectId}`);
    revalidatePath(`/${issue.gitlabProjectId}/board`);
    revalidatePath('/board'); // Also revalidate main board page

    return {
        success: true,
        shareUrl: result === 'passed' ? shareUrl : null
    };
}

export async function deleteQARun(runId: string) {
    const session = await auth();
    if (!session?.accessToken) throw new Error('Unauthorized');

    await db.delete(qaRuns).where(eq(qaRuns.id, runId));

    return { success: true };
}

export async function updateQARunContent(runId: string, testCasesContent: JSONContent | null, issuesFoundContent: JSONContent | null) {
    const session = await auth();
    if (!session?.accessToken) throw new Error('Unauthorized');

    await db.update(qaRuns)
        .set({
            testCasesContent: testCasesContent,
            issuesFoundContent: issuesFoundContent,
            updatedAt: new Date(),
        })
        .where(eq(qaRuns.id, runId));

    return { success: true };
}
