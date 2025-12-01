import { getUserGroups } from '@/lib/gitlab';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function NotificationsRedirect() {
    const session = await auth();
    if (!session?.accessToken) redirect('/auth/signin');

    // Get user's accessible groups
    const groups = await getUserGroups(session.accessToken);

    // Redirect to first group's notifications page
    if (groups && groups.length > 0) {
        redirect(`/${groups[0].id}/notifications`);
    }

    // No groups available
    redirect('/projects');
}
