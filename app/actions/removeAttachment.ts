'use server';
import 'server-only';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { attachments } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function removeAttachment(attachmentId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    // Verify the attachment exists and belongs to the user
    const [attachment] = await db
        .select()
        .from(attachments)
        .where(eq(attachments.id, attachmentId))
        .limit(1);

    if (!attachment) {
        throw new Error('Attachment not found');
    }

    // Check if user uploaded this attachment
    if (attachment.uploadedBy !== session.user.id) {
        throw new Error('You can only delete attachments you uploaded');
    }

    // Delete the attachment
    await db
        .delete(attachments)
        .where(eq(attachments.id, attachmentId));

    return { success: true };
}
