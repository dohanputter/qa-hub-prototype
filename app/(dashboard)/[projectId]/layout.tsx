import { redirect } from 'next/navigation';
import { getAccessibleProjects } from '@/lib/gitlab';
import { auth } from '@/auth';
import ProjectSelector from '@/components/ProjectSelector';

export default async function ProjectLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ projectId: string }>;
}) {
    const session = await auth();
    if (!session?.accessToken) redirect('/auth/signin');

    const { projectId } = await params;

    // Fetch user's accessible projects (GitLab handles permissions)
    const projects = await getAccessibleProjects(session.accessToken, session.user?.email || undefined);

    // Validate projectId and user access
    const project = projects.find(p => p.id === Number(projectId));
    if (!project) redirect('/'); // Redirect to project picker if invalid

    return (
        <div className="flex h-screen flex-col">
            {/* Project selection bar */}
            <div className="border-b bg-background px-4 py-3">
                <ProjectSelector
                    projects={projects}
                    currentProjectId={projectId}
                />
            </div>
            {/* Page content */}
            <div className="flex-1 overflow-auto p-6">{children}</div>
        </div>
    );
}
