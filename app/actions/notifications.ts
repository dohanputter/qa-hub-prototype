'use server';
import 'server-only';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { notifications } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getUserNotifications(limit = 50) {
    const session = await auth();
    const isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
    const mockUserId = 'mock-user-00000000-0000-0000-0000-000000000001';

    const userId = session?.user?.id || (isMockMode ? mockUserId : null);

    if (!userId) throw new Error('Unauthorized');

    return db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit);
}

export async function markNotificationAsRead(notificationId: string) {
    const session = await auth();
    const isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

    // In mock mode we don't strictly enforce user check for the specific notification ownership 
    // (simplified for prototype), but we still need a "user" context if we were to be strict.
    // Here we just check if we have a user ID or are in mock mode.
    if (!session?.user?.id && !isMockMode) throw new Error('Unauthorized');

    await db.update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, notificationId));

    revalidatePath('/notifications');
    return { success: true };
}

export async function markAllNotificationsAsRead() {
    const session = await auth();
    const isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
    const mockUserId = 'mock-user-00000000-0000-0000-0000-000000000001';

    const userId = session?.user?.id || (isMockMode ? mockUserId : null);

    if (!userId) throw new Error('Unauthorized');

    await db.update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, userId));

    revalidatePath('/notifications');
    return { success: true };
}
