'use server';
import 'server-only';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { projects, userProjects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getProject, getProjectLabels, createProjectWebhook } from '@/lib/gitlab';
import { revalidatePath } from 'next/cache';

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

export async function getUserProjects() {
    // Check for mock mode environment variable directly or via a helper if available in this scope
    // Since we can't easily import isMock from lib/gitlab (it's not exported), we'll check env here or export isMock.
    // Better to export isMock from lib/gitlab or just check env.
    if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
        // We need to import MOCK_PROJECTS or fetch them. 
        // Since MOCK_PROJECTS is not exported, we can use getAccessibleProjects which returns them in mock mode.
        // But getAccessibleProjects requires a token.
        // Let's modify lib/gitlab.ts to export MOCK_PROJECTS or a specific getter for them without token in mock mode.
        // Or just use getAccessibleProjects with a dummy token since it mocks anyway.
        const { getAccessibleProjects } = await import('@/lib/gitlab');
        return getAccessibleProjects('mock-token') as any;
    }

    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    const result = await db.query.userProjects.findMany({
        where: eq(userProjects.userId, session.user.id),
        with: { project: true },
    });

    return result.map((up) => up.project);
}
