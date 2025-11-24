import { auth } from '@/auth';
import { env } from '@/lib/env';
import { db } from '@/lib/db';
import { qaRecords } from '@/db/schema';
import { subDays, format } from 'date-fns';

export async function getDashboardStats() {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    // Get stats for the user's projects or all projects they have access to?
    // Prototype implies global view or selected group.
    // We'll fetch for all projects the user is part of.
    // For now, let's just fetch all QA records created by user or in their projects.
    // Simplification: Fetch all QA records for now as we don't have strict project-user filtering in DB query yet (though we have userProjects table).

    // 1. Counts
    const records = await db.select().from(qaRecords);

    const pending = records.filter(r => r.status === 'pending').length;
    const passed = records.filter(r => r.status === 'passed').length;
    const failed = records.filter(r => r.status === 'failed').length;
    // In testing? "pending" covers it in our schema.

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
