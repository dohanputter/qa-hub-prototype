import { getAccessibleProjects } from '@/lib/gitlab';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function NotificationsRedirect() {
    const session = await auth();
    if (!session?.accessToken) redirect('/auth/signin');

    // Get user's accessible projects
    const projects = await getAccessibleProjects(session.accessToken, session.user?.email || undefined);

    // Redirect to first project's notifications page
    if (projects.length > 0) {
        redirect(`/${projects[0].id}/notifications`);
    }

    // No projects available
    redirect('/projects');
}
