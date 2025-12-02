
'use server';

import { db } from '@/lib/db';
import { metricSnapshots, qaBlockers, qaIssues, qaRuns, projects, automatedInsights } from '@/db/schema';
import { eq, and, desc, gte, lt, sql, isNull } from 'drizzle-orm';
import { subDays, differenceInHours, startOfDay, endOfDay } from 'date-fns';
import { isMockMode } from '@/lib/mode';

// --- Metrics Calculation ---

export async function getTimeMetrics(projectId?: number) {
    // This would be complex SQL or aggregation. For MVP, we'll do simple JS aggregation or simplified queries.
    // In a real app with large data, use SQL aggregation.

    // Fetch completed runs
    const runs = await db.query.qaRuns.findMany({
        where: projectId ? undefined : undefined, // We need to filter by project via issue... simplified for now
        with: {
            qaIssue: true,
        }
    });

    const filteredRuns = projectId
        ? runs.filter(r => r.qaIssue.gitlabProjectId === projectId)
        : runs;

    let totalMinutes = 0;
    let count = 0;

    filteredRuns.forEach(r => {
        if (r.completedAt && r.createdAt) {
            totalMinutes += (r.completedAt.getTime() - r.createdAt.getTime()) / 1000 / 60;
            count++;
        }
    });

    return {
        avgTimeToTest: count > 0 ? Math.round(totalMinutes / count) : 0,
        // Other metrics...
    };
}

export async function getBlockerMetrics(projectId?: number) {
    const blockers = await db.query.qaBlockers.findMany({
        where: projectId ? eq(qaBlockers.projectId, projectId) : undefined,
    });

    const activeBlockers = blockers.filter(b => b.status === 'active' || b.status === 'escalated');
    const resolvedBlockers = blockers.filter(b => b.status === 'resolved');

    // Avg resolution time
    let totalHours = 0;
    resolvedBlockers.forEach(b => {
        if (b.resolutionTimeHours) {
            totalHours += b.resolutionTimeHours;
        } else if (b.resolvedAt && b.createdAt) {
            totalHours += differenceInHours(b.resolvedAt, b.createdAt);
        }
    });

    const avgResolutionTime = resolvedBlockers.length > 0 ? Math.round(totalHours / resolvedBlockers.length) : 0;

    // Severity distribution
    const severity = {
        low: activeBlockers.filter(b => b.severity === 'low').length,
        medium: activeBlockers.filter(b => b.severity === 'medium').length,
        high: activeBlockers.filter(b => b.severity === 'high').length,
        critical: activeBlockers.filter(b => b.severity === 'critical').length,
    };

    return {
        activeCount: activeBlockers.length,
        resolvedCount: resolvedBlockers.length,
        avgResolutionTime,
        severity,
    };
}

export async function getReleaseReadiness(projectId?: number) {
    // Confidence score algorithm
    // 100 - penalties

    const blockerMetrics = await getBlockerMetrics(projectId);

    // Penalties
    let penalty = 0;
    penalty += blockerMetrics.severity.critical * 25;
    penalty += blockerMetrics.severity.high * 15;
    penalty += blockerMetrics.severity.medium * 5;

    // Check for old blockers (simplified: just check if any active blocker is > 48h old)
    // In real app, check individual ages.

    // Check open high severity issues (from qaIssues)
    // ...

    let score = 100 - penalty;
    if (score < 0) score = 0;

    return {
        score,
        details: {
            blockerPenalty: penalty,
            // ...
        }
    };
}

// --- Snapshot Recording ---

export async function recordDailyMetrics() {
    // This function should be called by a cron job (e.g., Vercel Cron)

    const allProjects = await db.query.projects.findMany();

    for (const project of allProjects) {
        const blockerMetrics = await getBlockerMetrics(project.id);
        const timeMetrics = await getTimeMetrics(project.id);

        // Calculate other metrics...

        await db.insert(metricSnapshots).values({
            projectId: project.id,
            snapshotDate: new Date(),
            activeBlockerCount: blockerMetrics.activeCount,
            blockerResolutionTime: blockerMetrics.avgResolutionTime,
            criticalBlockerCount: blockerMetrics.severity.critical,
            avgTimeToTest: timeMetrics.avgTimeToTest,
            // ... fill other fields
        });
    }

    return { success: true };
}

export async function generateAutomatedInsights() {
    // Analyze patterns and generate insights
    // For MVP, simple rules

    const allProjects = await db.query.projects.findMany();

    for (const project of allProjects) {
        const blockerMetrics = await getBlockerMetrics(project.id);

        if (blockerMetrics.severity.critical > 0) {
            await db.insert(automatedInsights).values({
                projectId: project.id,
                title: 'Critical Blockers Detected',
                description: `There are ${blockerMetrics.severity.critical} critical blockers affecting this project.`,
                insightType: 'critical',
                action: 'Review and escalate critical blockers immediately.',
            });
        }

        if (blockerMetrics.avgResolutionTime > 24) {
            await db.insert(automatedInsights).values({
                projectId: project.id,
                title: 'Slow Blocker Resolution',
                description: `Average blocker resolution time is ${blockerMetrics.avgResolutionTime} hours, which exceeds the 24h target.`,
                insightType: 'warning',
                action: 'Investigate bottlenecks in blocker resolution process.',
            });
        }
    }

    return { success: true };
}

export async function getHistoricalMetrics(days: number = 30, projectId?: number) {
    const startDate = subDays(new Date(), days);

    const snapshots = await db.query.metricSnapshots.findMany({
        where: and(
            projectId ? eq(metricSnapshots.projectId, projectId) : undefined,
            gte(metricSnapshots.snapshotDate, startDate)
        ),
        orderBy: [desc(metricSnapshots.snapshotDate)],
    });

    return snapshots;
}
