'use server';
import 'server-only';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { projects, userProjects } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getProject, getProjectLabels, createProjectWebhook } from '@/lib/gitlab';
import { revalidatePath } from 'next/cache';
import { isMockMode, getMockToken } from '@/lib/mode';

export async function addUserProject(projectId: number) {
    const session = await auth();
    if (!session?.accessToken || !session.user?.id) throw new Error('Unauthorized');

    const gitlabProject = await getProject(projectId, session.accessToken);

    await db.insert(projects)
        .values({
            id: gitlabProject.id,
            name: gitlabProject.name,
            description: gitlabProject.description || null,
            webUrl: gitlabProject.web_url,
            isConfigured: false,
        })
        .onConflictDoUpdate({
            target: projects.id,
            set: {
                name: gitlabProject.name,
                description: gitlabProject.description || null,
                webUrl: gitlabProject.web_url
            },
        });

    await db.insert(userProjects)
        .values({ userId: session.user.id, projectId: gitlabProject.id })
        .onConflictDoNothing();

    revalidatePath('/projects');
    return { success: true, projectId: gitlabProject.id };
}

export async function configureProjectLabels(
    projectId: number,
    labelMapping: { pending: string; passed: string; failed: string }
) {
    const session = await auth();
    if (!session?.accessToken) throw new Error('Unauthorized');

    const labels = await getProjectLabels(projectId, session.accessToken);
    const labelNames = labels.map((l) => l.name);

    if (!labelNames.includes(labelMapping.pending) ||
        !labelNames.includes(labelMapping.passed) ||
        !labelNames.includes(labelMapping.failed)) {
        throw new Error('One or more labels do not exist in GitLab project');
    }

    const webhook = await createProjectWebhook(projectId, session.accessToken);

    await db.update(projects)
        .set({
            qaLabelMapping: labelMapping,
            webhookId: webhook.id,
            isConfigured: true
        })
        .where(eq(projects.id, projectId));

    revalidatePath(`/${projectId}`);
    return { success: true };
}

export async function getUserProjects(groupId?: number) {
    if (isMockMode()) {
        const { getAccessibleProjects, getGroupProjects } = await import('@/lib/gitlab');
        const token = getMockToken();

        if (groupId) {
            return getGroupProjects(groupId, token) as any;
        }
        return getAccessibleProjects(token) as any;
    }

    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    const result = await db
        .select({
            project: projects,
        })
        .from(userProjects)
        .innerJoin(projects, eq(userProjects.projectId, projects.id))
        .where(
            groupId
                ? and(eq(userProjects.userId, session.user.id), eq(projects.groupId, groupId))
                : eq(userProjects.userId, session.user.id)
        );

    return result.map((row: { project: typeof projects.$inferSelect }) => row.project);
}

export async function getProjectUsers(projectId: number) {
    const { getProjectMembers } = await import('@/lib/gitlab');

    if (isMockMode()) {
        const members = await getProjectMembers(projectId, getMockToken());
        return members.map((m: any) => ({
            id: m.id,
            name: m.name,
            username: m.username,
            avatarUrl: m.avatar_url
        }));
    }

    const session = await auth();
    if (!session?.accessToken) throw new Error('Unauthorized');

    const members = await getProjectMembers(projectId, session.accessToken);
    return members.map((m: any) => ({
        id: m.id,
        name: m.name,
        username: m.username,
        avatarUrl: m.avatar_url
    }));
}

export async function getProjectLabelsAction(projectId: number) {
    const mapLabel = (l: any) => ({
        id: l.id,
        title: l.name,
        color: l.color,
        textColor: l.text_color || '#fff'
    });

    if (isMockMode()) {
        const labels = await getProjectLabels(projectId, getMockToken());
        return labels.map(mapLabel);
    }

    const session = await auth();
    if (!session?.accessToken) throw new Error('Unauthorized');

    const labels = await getProjectLabels(projectId, session.accessToken);
    return labels.map(mapLabel);
}
