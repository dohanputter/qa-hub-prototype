
import { getBlockerMetrics, getReleaseReadiness, getHistoricalMetrics, generateAutomatedInsights } from '@/app/actions/analytics';
import { ReleaseReadinessGauge } from '@/components/analytics/ReleaseReadinessGauge';
import { BlockerSummaryCards } from '@/components/analytics/BlockerSummaryCards';
import { HistoricalTrendsChart } from '@/components/analytics/HistoricalTrendsChart';
import { AutomatedInsightsPanel } from '@/components/analytics/AutomatedInsightsPanel';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { revalidatePath } from 'next/cache';

export default async function EnhancedAnalyticsPage() {
    // Fetch data
    const blockerMetrics = await getBlockerMetrics();
    const readiness = await getReleaseReadiness();
    const history = await getHistoricalMetrics(30);

    // Trigger insights generation on load (or could be separate)
    // await generateAutomatedInsights(); 
    // Actually, let's just fetch existing insights. We need an action for that.
    // For now, we'll assume insights are passed or fetched inside the component.

    return (
        <div className="p-6 space-y-6 bg-background min-h-screen">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Enhanced Analytics</h1>
                    <p className="text-muted-foreground">Release readiness and blocker intelligence.</p>
                </div>
                <form action={async () => {
                    'use server';
                    revalidatePath('/analytics/enhanced');
                }}>
                    <Button variant="outline" size="sm">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh Data
                    </Button>
                </form>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                {/* Readiness Gauge - Takes up 2 cols */}
                <div className="col-span-2">
                    <ReleaseReadinessGauge score={readiness.score} details={readiness.details} />
                </div>

                {/* Summary Cards - Takes up 5 cols */}
                <div className="col-span-5">
                    <BlockerSummaryCards metrics={blockerMetrics} />
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Historical Trends - 2 cols */}
                <div className="col-span-2">
                    <HistoricalTrendsChart data={history} />
                </div>

                {/* Insights - 1 col */}
                <div className="col-span-1">
                    <AutomatedInsightsPanel />
                </div>
            </div>
        </div>
    );
}
