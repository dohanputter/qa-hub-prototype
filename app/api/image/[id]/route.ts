import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { attachments, qaRuns } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    // Find the attachment
    const result = await db
        .select({
            attachment: attachments,
            run: qaRuns,
        })
        .from(attachments)
        .leftJoin(qaRuns, eq(attachments.qaRunId, qaRuns.id))
        .where(eq(attachments.id, id))
        .limit(1);

    if (result.length === 0) {
        return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    const { attachment } = result[0];
    const url = attachment.url;

    // Handle data URLs (mock mode)
    if (url.startsWith('data:')) {
        const matches = url.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
            const mimeType = matches[1];
            const base64Data = matches[2];
            const buffer = Buffer.from(base64Data, 'base64');

            return new NextResponse(buffer, {
                headers: {
                    'Content-Type': mimeType,
                    'Cache-Control': 'public, max-age=31536000, immutable',
                },
            });
        }
    }

    // Handle external URLs (production - proxy from GitLab)
    try {
        const response = await fetch(url);
        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 });
        }

        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || attachment.mimeType;

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error('Image proxy error:', error);
        return NextResponse.json({ error: 'Failed to proxy image' }, { status: 500 });
    }
}
