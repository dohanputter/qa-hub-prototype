import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getDashboardStats } from '@/app/actions/issues';
import { DashboardView } from '@/components/dashboard/DashboardView';

export default async function Dashboard({ params }: { params: Promise<{ projectId: string }> }) {
    const session = await auth();
    if (!session?.accessToken) redirect('/auth/signin');

    const { projectId } = await params;
    const stats = await getDashboardStats(Number(projectId));

    return <DashboardView stats={stats} projectId={Number(projectId)} />;
}
