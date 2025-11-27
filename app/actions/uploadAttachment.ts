'use server';
import 'server-only';
import { auth } from '@/auth';
import { uploadAttachmentToGitLab } from '@/lib/gitlab';
import { db } from '@/lib/db';
import { attachments } from '@/db/schema';
import { checkUploadRateLimit } from '@/lib/rateLimit';

const MAX_SIZE = 10 * 1024 * 1024;

export async function uploadAttachment(formData: FormData) {
    const session = await auth();
    if (!session?.accessToken || !session.user?.id) throw new Error('Unauthorized');

    const allowed = await checkUploadRateLimit(session.user.id);
    if (!allowed) throw new Error('Too many uploads. Please wait a minute.');

    const file = formData.get('file') as File;
    if (!file) throw new Error('No file provided');
    if (file.size > MAX_SIZE) throw new Error('File too large. Maximum 10MB.');

    // Renamed from qaRecordId to qaRunId to match schema
    const qaRunId = formData.get('qaRecordId') as string | null;
    const projectId = Number(formData.get('projectId'));

    const { url, markdown } = await uploadAttachmentToGitLab(projectId, session.accessToken, file);

    const [attachment] = await db
        .insert(attachments)
        .values({
            qaRunId: qaRunId || null,
            filename: file.name,
            url,
            markdown,
            fileSize: file.size,
            mimeType: file.type,
            uploadedBy: session.user.id,
        })
        .returning();

    return { id: attachment.id, url, markdown, filename: attachment.filename };
}
