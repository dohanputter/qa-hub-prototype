import { auth } from '@/auth';
import { getProject, getIssues, getProjectLabels } from '@/lib/gitlab';
import { db } from '@/lib/db';
import { projects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { KanbanBoard } from '@/components/board/KanbanBoard';
import { ProjectConfiguration } from '@/components/board/ProjectConfiguration';

export default async function ProjectBoardPage({ params }: { params: Promise<{ projectId: string }> }) {
    const session = await auth();
    if (!session?.accessToken) return <div>Unauthorized</div>;

    const { projectId: projectIdStr } = await params;
    const projectId = parseInt(projectIdStr);

    // Validate projectId
    if (isNaN(projectId) || !isFinite(projectId)) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <h2 className="text-lg font-semibold">Invalid Project ID</h2>
                    <p className="text-muted-foreground">Please select a valid project.</p>
                </div>
            </div>
        );
    }

    try {
        const gitlabProject = await getProject(projectId, session.accessToken);

        if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
            // Mock project configuration for board
            const mockProjectConfig = {
                ...gitlabProject,
                qaLabelMapping: {
                    pending: 'bug',
                    passed: 'feature',
                    failed: 'critical'
                }
            };
            const issues = await getIssues(projectId, session.accessToken, { state: 'opened' });
            const labels = await getProjectLabels(projectId, session.accessToken);
            return (
                <div className="flex flex-col h-screen overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
                        <div className="flex items-baseline gap-2">
                            <h1 className="text-xl font-bold">{gitlabProject.name}</h1>
                            <span className="text-xl text-gray-400 font-normal">Board</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Filters could go here */}
                        </div>
                    </div>
                    <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 bg-[#f9fafb]">
                        <KanbanBoard
                            project={mockProjectConfig as any}
                            issues={issues}
                            labels={labels}
                        />
                    </div>
                </div>
            );
        }

        // Check DB
        const projectResults = await db
            .select()
            .from(projects)
            .where(eq(projects.id, projectId))
            .limit(1);

        let project = projectResults[0];

        if (!project || !project.isConfigured) {
            const labels = await getProjectLabels(projectId, session.accessToken);
            return <ProjectConfiguration gitlabProject={gitlabProject} labels={labels} />;
        }

        // Fetch issues and labels
        const issues = await getIssues(projectId, session.accessToken, { state: 'opened' });
        const labels = await getProjectLabels(projectId, session.accessToken);

        return (
            <div className="flex flex-col h-screen overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
                    <div className="flex items-baseline gap-2">
                        <h1 className="text-xl font-bold">{gitlabProject.name}</h1>
                        <span className="text-xl text-gray-400 font-normal">Board</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Filters could go here */}
                    </div>
                </div>
                <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 bg-[#f9fafb]">
                    <KanbanBoard
                        project={project as typeof project & { qaLabelMapping: { pending: string; passed: string; failed: string } }}
                        issues={issues}
                        labels={labels}
                    />
                </div>
            </div>
        );
    } catch (error) {
        console.error("Error loading project board:", error);
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <h2 className="text-lg font-semibold">Error loading project</h2>
                    <p className="text-muted-foreground">Please check if you have access to this project.</p>
                </div>
            </div>
        );
    }
}
