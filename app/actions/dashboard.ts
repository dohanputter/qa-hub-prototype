import { auth } from '@/auth';
import { env } from '@/lib/env';
import { db } from '@/lib/db';
import { qaIssues, qaRuns } from '@/db/schema';
import { subDays, format } from 'date-fns';
import { eq, desc } from 'drizzle-orm';

export async function getDashboardStats() {
    if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
        const { getAllMockIssues } = await import('@/lib/gitlab');
        const issues = getAllMockIssues();

        // Rough approximation for mock mode using labels
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

    // Fetch all issues and runs
    const allIssues = await db.select().from(qaIssues);

    // Status counts based on QA Issue status
    const pending = allIssues.filter(r => r.status === 'pending').length;
    const passed = allIssues.filter(r => r.status === 'passed').length;
    const failed = allIssues.filter(r => r.status === 'failed').length;

    // Chart Data (Last 30 days based on Runs)
    const thirtyDaysAgo = subDays(new Date(), 30);
    const allRuns = await db.select().from(qaRuns);
    const recentRuns = allRuns.filter(r => r.createdAt && new Date(r.createdAt) >= thirtyDaysAgo);

    // Group by day
    const chartDataMap = new Map<string, { total: number; completed: number }>();

    // Initialize last 30 days
    for (let i = 0; i < 30; i++) {
        const date = subDays(new Date(), i);
        const key = format(date, 'MMM dd');
        chartDataMap.set(key, { total: 0, completed: 0 });
    }

    recentRuns.forEach(r => {
        if (!r.createdAt) return;
        const key = format(new Date(r.createdAt), 'MMM dd');
        if (chartDataMap.has(key)) {
            const entry = chartDataMap.get(key)!;
            entry.total++; // Started a run
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
            total: allIssues.length
        },
        chartData
    };
}
