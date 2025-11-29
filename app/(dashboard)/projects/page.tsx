import { getAccessibleProjects } from '@/lib/gitlab';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function ProjectsRedirect() {
    const session = await auth();
    if (!session?.accessToken) redirect('/auth/signin');

    // Get user's accessible projects
    const projects = await getAccessibleProjects(session.accessToken, session.user?.email || undefined);

    // Redirect to first project's issues page
    if (projects.length > 0) {
        redirect(`/${projects[0].id}/issues`);
    }

    // No projects available - show error or landing page
    return (
        <div className="container mx-auto px-4 py-12">
            <h1 className="text-2xl font-bold">No Projects Available</h1>
            <p className="text-muted-foreground">You don&apos;t have access to any projects.</p>
        </div>
    );
}
