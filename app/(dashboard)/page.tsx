import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function RootDashboard() {
    const session = await auth();
    if (!session?.accessToken) redirect('/auth/signin');

    // Force group selection by redirecting to /projects
    redirect('/projects');
}
