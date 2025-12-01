import { auth } from '@/auth';
import { notificationEmitter, EVENTS } from '@/lib/events';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return new Response('Unauthorized', { status: 401 });
    }

    const userId = session.user.id;
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            // Send initial connection message
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));

            const onNotification = (data: any) => {
                // Only send notifications meant for this user
                if (data.userId === userId) {
                    const message = `data: ${JSON.stringify({ type: 'notification', data })}\n\n`;
                    controller.enqueue(encoder.encode(message));
                }
            };

            notificationEmitter.on(EVENTS.NEW_NOTIFICATION, onNotification);

            // Keep connection alive with heartbeats
            const heartbeat = setInterval(() => {
                controller.enqueue(encoder.encode(': heartbeat\n\n'));
            }, 15000);

            // Cleanup on close
            req.signal.addEventListener('abort', () => {
                notificationEmitter.off(EVENTS.NEW_NOTIFICATION, onNotification);
                clearInterval(heartbeat);
                controller.close();
            });
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
