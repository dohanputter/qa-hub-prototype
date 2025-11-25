import { getAllIssues } from '@/app/actions/issues';
import { getUserProjects } from '@/app/actions/project';
import { KanbanBoard } from '@/components/board/KanbanBoard';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default async function BoardPage({
    searchParams,
}: {
    searchParams: Promise<{ state?: string; groupId?: string }>;
}) {
    const params = await searchParams;
    const groupId = params.groupId ? Number(params.groupId) : undefined;

    const issues = await getAllIssues({
        state: (params.state as 'opened' | 'closed') || 'opened',
    });

    // Get projects for the board - use first project as default for now
    const projects = await getUserProjects(groupId);
    const project = projects.length > 0 ? projects[0] : null;

    if (!project) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center space-y-4">
                    <h2 className="text-2xl font-bold">No Projects Available</h2>
                    <p className="text-muted-foreground">Select a group with projects to view the board.</p>
                </div>
            </div>
        );
    }

    // Ensure project has qaLabelMapping with defaults
    const projectWithLabels = {
        ...project,
        qaLabelMapping: project.qaLabelMapping || {
            pending: 'qa::ready',
            passed: 'qa::passed',
            failed: 'qa::failed'
        }
    };

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Issues Board</h2>
                <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
                    <Link href={groupId ? `/issues/new?groupId=${groupId}` : "/issues/new"}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Issue
                    </Link>
                </Button>
            </div>

            <KanbanBoard issues={issues} project={projectWithLabels} labels={[]} />
        </div>
    );
}
