import { auth } from '@/auth';
import { env } from '@/lib/env';
import { db } from '@/lib/db';
import { qaRecords } from '@/db/schema';
import { subDays, format } from 'date-fns';

export async function getDashboardStats() {
    if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
        const { getAllMockIssues } = await import('@/lib/gitlab');
        const issues = getAllMockIssues();

        const pending = issues.filter((i: any) => i.labels.includes('bug')).length;
        const passed = issues.filter((i: any) => i.labels.includes('feature')).length;
        const failed = issues.filter((i: any) => i.labels.includes('critical')).length;

        // Generate chart data from mock issues
        const chartDataMap = new Map<string, { total: number; completed: number }>();

        // Initialize last 30 days
        for (let i = 0; i < 30; i++) {
            const date = subDays(new Date(), i);
            const key = format(date, 'MMM dd');
            chartDataMap.set(key, { total: 0, completed: 0 });
        }

        issues.forEach((i: any) => {
            const key = format(new Date(i.created_at), 'MMM dd');
            if (chartDataMap.has(key)) {
                const entry = chartDataMap.get(key)!;
                entry.total++;
                if (i.state === 'closed') {
                    entry.completed++;
                }
            }
        });

        const chartData = Array.from(chartDataMap.entries())
            .map(([name, data]) => ({ name, ...data }))
            .reverse();

        return {
            counts: {
                pending,
                passed,
                failed,
                total: issues.length
            },
            chartData
        };
    }

    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    // 1. Counts
    const records = await db.select().from(qaRecords);

    const pending = records.filter(r => r.status === 'pending').length;
    const passed = records.filter(r => r.status === 'passed').length;
    const failed = records.filter(r => r.status === 'failed').length;

    // 2. Chart Data (Last 30 days)
    const thirtyDaysAgo = subDays(new Date(), 30);
    const recentRecords = records.filter(r => r.createdAt && new Date(r.createdAt) >= thirtyDaysAgo);

    // Group by day
    const chartDataMap = new Map<string, { total: number; completed: number }>();

    // Initialize last 30 days
    for (let i = 0; i < 30; i++) {
        const date = subDays(new Date(), i);
        const key = format(date, 'MMM dd');
        chartDataMap.set(key, { total: 0, completed: 0 });
    }

    recentRecords.forEach(r => {
        if (!r.createdAt) return;
        const key = format(new Date(r.createdAt), 'MMM dd');
        if (chartDataMap.has(key)) {
            const entry = chartDataMap.get(key)!;
            entry.total++;
            if (r.status === 'passed' || r.status === 'failed') {
                entry.completed++;
            }
        }
    });

    const chartData = Array.from(chartDataMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .reverse();

    return {
        counts: {
            pending,
            passed,
            failed,
            total: records.length
        },
        chartData
    };
}
