import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
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
                    <Link href="/global" className="text-sm text-primary hover:underline">
                        View Global Dashboard
                    </Link>
                )}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card className="bg-card/50 backdrop-blur-sm border-primary/10 hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Avg. Time to Test</CardTitle>
                        <div className="p-2 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
                            <Clock className="h-4 w-4 text-primary" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold tracking-tight">{stats.kpi?.avgTimeToTest || '0'}m</div>
                        <p className="text-xs text-muted-foreground mt-1">Average minutes per run</p>
                    </CardContent>
                </Card>
                <Card className="bg-card/50 backdrop-blur-sm border-green-500/20 hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">First Time Pass</CardTitle>
                        <div className="p-2 bg-green-500/10 rounded-full group-hover:bg-green-500/20 transition-colors">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold tracking-tight">{stats.kpi?.firstTimePassRate || 0}%</div>
                        <p className="text-xs text-muted-foreground mt-1">Pass rate on first run</p>
                    </CardContent>
                </Card>
                <Card className="bg-card/50 backdrop-blur-sm border-red-500/20 hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Issues Found</CardTitle>
                        <div className="p-2 bg-red-500/10 rounded-full group-hover:bg-red-500/20 transition-colors">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold tracking-tight">{stats.kpi?.issuesFound || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total issues tracked</p>
                    </CardContent>
                </Card>
                <Card className="bg-card/50 backdrop-blur-sm border-blue-500/20 hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Active Tests</CardTitle>
                        <div className="p-2 bg-blue-500/10 rounded-full group-hover:bg-blue-500/20 transition-colors">
                            <Activity className="h-4 w-4 text-blue-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold tracking-tight">{stats.kpi?.activeTests || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Issues pending QA</p>
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
