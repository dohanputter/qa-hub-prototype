import { NextResponse } from 'next/server';
import { isMock } from '@/lib/gitlab';
import { env } from '@/lib/env';

export async function POST(request: Request) {
    if (!isMock()) {
        return NextResponse.json(
            { error: 'Webhook simulation only available in mock mode' },
            { status: 403 }
        );
    }

    try {
        const body = await request.json();
        const { eventType, payload } = body;

        // Forward to real webhook handler
        const webhookUrl = `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/gitlab`;

        await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'X-Gitlab-Event': eventType,
                'X-Gitlab-Token': env.WEBHOOK_SECRET || '',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Webhook simulation error:', error);
        return NextResponse.json(
            { error: 'Failed to simulate webhook' },
            { status: 500 }
        );
    }
}
