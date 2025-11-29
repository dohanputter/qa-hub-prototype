import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import { RecentNotifications } from '@/components/dashboard/RecentNotifications';
import type { DashboardStats as DashboardStatsType } from '@/types/dashboard';
import Link from 'next/link';

interface DashboardViewProps {
    stats: DashboardStatsType;
    projectId?: number;
}

export function DashboardView({ stats, projectId }: DashboardViewProps) {
    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        {projectId ? 'Project Dashboard' : 'Global Dashboard'}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {projectId ? 'Real-time overview of project quality metrics' : 'Overview of quality metrics across all projects'}
                    </p>
                </div>
                {projectId && (
                    <Link href="/" className="text-sm text-primary hover:underline">
                        View Global Dashboard
                    </Link>
                )}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Time to Test</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.kpi?.avgTimeToTest || '0'}m</div>
                        <p className="text-xs text-muted-foreground">Average minutes per run</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">First Time Pass</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.kpi?.firstTimePassRate || 0}%</div>
                        <p className="text-xs text-muted-foreground">Pass rate on first run</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Issues Found</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.kpi?.issuesFound || 0}</div>
                        <p className="text-xs text-muted-foreground">Total issues tracked</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Tests</CardTitle>
                        <Activity className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.kpi?.activeTests || 0}</div>
                        <p className="text-xs text-muted-foreground">Currently in progress</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-7 gap-8">
                <div className="lg:col-span-5 space-y-8">
                    <DashboardCharts
                        projectStats={stats.projectStats}
                        timeStats={stats.timeStats}
                        passRates={stats.passRates}
                    />
                </div>
                <div className="lg:col-span-2">
                    <RecentNotifications />
                </div>
            </div>
        </div>
    );
}
