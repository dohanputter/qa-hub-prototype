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

export async function createNotification(data: {
    userId: string;
    type: 'mention' | 'assignment' | 'status_change' | 'comment';
    title: string;
    message: string;
    resourceType?: 'issue' | 'qa_record' | 'qa_run';
    resourceId?: string;
    actionUrl?: string;
}) {
    const { notificationEmitter, EVENTS } = await import('@/lib/events');

    const [newNotification] = await db.insert(notifications).values({
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        actionUrl: data.actionUrl,
    }).returning();

    // Emit event for real-time updates
    notificationEmitter.emit(EVENTS.NEW_NOTIFICATION, newNotification);

    return newNotification;
}
