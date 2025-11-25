'use server';
import 'server-only';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { groups, userGroups } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getUserGroups, getGroupProjects } from '@/lib/gitlab';
import { revalidatePath } from 'next/cache';

export async function fetchUserGroups() {
    // Check for mock mode
    if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
        const { getUserGroups: getMockGroups } = await import('@/lib/gitlab');
        return getMockGroups('mock-token') as any;
    }

    const session = await auth();
    if (!session?.accessToken || !session.user?.id) throw new Error('Unauthorized');

    const gitlabGroups = await getUserGroups(session.accessToken);

    return gitlabGroups;
}

export async function addUserGroup(groupId: number) {
    const session = await auth();
    if (!session?.accessToken || !session.user?.id) throw new Error('Unauthorized');

    // In mock mode, just return success
    if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
        return { success: true, groupId };
    }

    const gitlabGroups = await getUserGroups(session.accessToken);
    const gitlabGroup = gitlabGroups.find((g: any) => g.id === Number(groupId));

    if (!gitlabGroup) {
        throw new Error('Group not found');
    }

    await db.insert(groups)
        .values({
            id: gitlabGroup.id,
            name: gitlabGroup.name,
            fullPath: gitlabGroup.full_path,
            description: gitlabGroup.description || null,
            webUrl: gitlabGroup.web_url,
            avatarUrl: gitlabGroup.avatar_url || null,
        })
        .onConflictDoUpdate({
            target: groups.id,
            set: {
                name: gitlabGroup.name,
                fullPath: gitlabGroup.full_path,
                description: gitlabGroup.description || null,
                webUrl: gitlabGroup.web_url,
                avatarUrl: gitlabGroup.avatar_url || null,
            },
        });

    await db.insert(userGroups)
        .values({ userId: session.user.id, groupId: gitlabGroup.id })
        .onConflictDoNothing();

    revalidatePath('/');
    return { success: true, groupId: gitlabGroup.id };
}

export async function getGroupProjectsList(groupId: number) {
    // Check for mock mode
    if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
        const { getGroupProjects: getMockGroupProjects } = await import('@/lib/gitlab');
        return getMockGroupProjects(groupId, 'mock-token') as any;
    }

    const session = await auth();
    if (!session?.accessToken) throw new Error('Unauthorized');

    const projects = await getGroupProjects(groupId, session.accessToken);
    return projects;
}

export async function getUserGroupsList() {
    // Check for mock mode
    if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
        const { getUserGroups: getMockGroups } = await import('@/lib/gitlab');
        return getMockGroups('mock-token') as any;
    }

    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    const result = await db
        .select({
            group: groups,
        })
        .from(userGroups)
        .innerJoin(groups, eq(userGroups.groupId, groups.id))
        .where(eq(userGroups.userId, session.user.id));

    return result.map((row: { group: typeof groups.$inferSelect }) => row.group);
}
