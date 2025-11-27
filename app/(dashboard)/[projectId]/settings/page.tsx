import { auth } from '@/auth';
import { getProject, getProjectLabels } from '@/lib/gitlab';
import { ProjectSettingsForm } from '@/components/project/ProjectSettingsForm';
import { db } from '@/lib/db';
import { projects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';

export default async function ProjectSettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
    const session = await auth();
    if (!session?.accessToken && process.env.NEXT_PUBLIC_MOCK_MODE !== 'true') return <div>Unauthorized</div>;

    const { projectId: projectIdStr } = await params;
    const projectId = parseInt(projectIdStr);

    // Fetch project data from DB
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));

    if (!project) {
        // If not in DB, maybe try to fetch from GitLab first to verify access,
        // but user should have added it.
        // For simplicity, assuming user is accessing a known project.
        // In real app, we might redirect to add project.
    }

    let labels: any[] = [];
    try {
        labels = await getProjectLabels(projectId, session?.accessToken || 'mock-token');
    } catch (error) {
        console.error("Failed to fetch labels", error);
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Project Settings</h2>
            </div>

            <ProjectSettingsForm
                projectId={projectId}
                initialLabels={labels}
                currentMapping={project?.qaLabelMapping || undefined}
            />
        </div>
    );
}
