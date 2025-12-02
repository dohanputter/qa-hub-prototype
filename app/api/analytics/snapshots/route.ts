
import { getHistoricalMetrics } from '@/app/actions/analytics';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const projectId = searchParams.get('projectId') ? parseInt(searchParams.get('projectId')!) : undefined;

    try {
        const data = await getHistoricalMetrics(days, projectId);
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
