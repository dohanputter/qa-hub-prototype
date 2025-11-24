import { auth } from '@/auth';
import { env } from '@/lib/env';
import { db } from '@/lib/db';
import { qaRecords } from '@/db/schema';
import { subDays, format } from 'date-fns';

export async function getDashboardStats() {
    if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
        const { getIssues } = await import('@/lib/gitlab');
        // Fetch all issues for all mock projects to aggregate stats
        // Or just use MOCK_ISSUES directly if exported. 
        // Since getIssues filters by project, we might want a way to get ALL mock issues.
        // For now, let's assume we want stats for the "active" project or all?
        // The prototype dashboard seems to be global or project specific.
        // Let's use a static mock return for simplicity and robustness as per plan.

        // We can calculate from MOCK_ISSUES if we import it, but it's not exported.
        // Let's use getIssues for project 1 as a sample or just return hardcoded stats that match the mock data we added.

        return {
            counts: {
                pending: 5,
                passed: 12,
                failed: 3,
                total: 20
            },
            chartData: [
                { name: 'Nov 01', total: 2, completed: 1 },
                { name: 'Nov 05', total: 5, completed: 3 },
                { name: 'Nov 10', total: 3, completed: 2 },
                { name: 'Nov 15', total: 8, completed: 6 },
                { name: 'Nov 20', total: 4, completed: 4 },
                { name: 'Nov 24', total: 6, completed: 5 },
            ]
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
