import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getDashboardStats } from '@/app/actions/issues';
import { DashboardView } from '@/components/dashboard/DashboardView';

export default async function Dashboard({ params }: { params: Promise<{ projectId: string }> }) {
    const session = await auth();
    if (!session?.accessToken) redirect('/auth/signin');

    const { projectId } = await params;
    // Note: URL param is named 'projectId' but it's actually a groupId
    const groupId = Number(projectId);
    const stats = await getDashboardStats(groupId);

    return <DashboardView stats={stats} projectId={groupId} />;
}
