'use server';
import 'server-only';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { notifications } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { isMockMode } from '@/lib/mode';
import { SYSTEM_USERS } from '@/lib/constants';

export async function getUserNotifications(limit = 50, offset = 0) {
    const session = await auth();

    const userId = session?.user?.id || (isMockMode() ? SYSTEM_USERS.MOCK : null);

    if (!userId) throw new Error('Unauthorized');

    return db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset);
}

export async function markAllNotificationsAsRead() {
    const session = await auth();

    const userId = session?.user?.id || (isMockMode() ? SYSTEM_USERS.MOCK : null);

    if (!userId) throw new Error('Unauthorized');

    await db.update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, userId));

    revalidatePath('/notifications');
    return { success: true };
}
