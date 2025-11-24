import { getDashboardStats } from '@/app/actions/dashboard';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { DashboardChart } from '@/components/dashboard/DashboardChart';
import { RecentNotifications } from '@/components/dashboard/RecentNotifications';

export default async function DashboardPage() {
    const stats = await getDashboardStats();

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            </div>
            <div className="space-y-4">
                <DashboardStats counts={stats.counts} />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <DashboardChart data={stats.chartData} />
                    <RecentNotifications />
                </div>
            </div>
        </div>
    );
}
