'use server';
import 'server-only';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { notifications } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getUserNotifications(limit = 50) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    return db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, session.user.id))
        .orderBy(desc(notifications.createdAt))
        .limit(limit);
}

export async function markNotificationAsRead(notificationId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    await db.update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, notificationId));

    revalidatePath('/notifications');
    return { success: true };
}

export async function markAllNotificationsAsRead() {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    await db.update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, session.user.id));

    revalidatePath('/notifications');
    return { success: true };
}
