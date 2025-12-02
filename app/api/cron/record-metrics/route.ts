
import { recordDailyMetrics, generateAutomatedInsights } from '@/app/actions/analytics';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        // Verify cron secret if needed (e.g. check header)
        // const authHeader = request.headers.get('authorization');
        // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        //     return new Response('Unauthorized', { status: 401 });
        // }

        await recordDailyMetrics();
        await generateAutomatedInsights();

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
