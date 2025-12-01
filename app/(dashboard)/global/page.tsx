import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getDashboardStats } from '@/app/actions/issues';
import { DashboardView } from '@/components/dashboard/DashboardView';

export default async function GlobalDashboard() {
    const session = await auth();
    if (!session?.accessToken) redirect('/auth/signin');

    const stats = await getDashboardStats(); // No projectId = global stats

    return <DashboardView stats={stats} />;
}
