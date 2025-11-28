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

    // Get all issues (will be filtered by group via getAllIssues if needed)
    const issues = await getAllIssues({
        state: (params.state as 'opened' | 'closed') || 'opened',
    });

    // Get projects for the selected group or all projects
    const projects = await getUserProjects(groupId);

    if (projects.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center space-y-4">
                    <h2 className="text-2xl font-bold">No Projects Available</h2>
                    <p className="text-muted-foreground">Select a group with projects to view the board.</p>
                </div>
            </div>
        );
    }

    // Filter issues by projects in the selected group
    const projectIds = projects.map((p: { id: number }) => p.id);
    const filteredIssues = groupId
        ? issues.filter(issue => projectIds.includes(issue.projectId || issue.project_id))
        : issues;

    // Use first project's label mapping as default (or create one)
    const defaultProject = projects[0];
    const projectWithLabels = {
        ...defaultProject,
        qaLabelMapping: defaultProject.qaLabelMapping || {
            pending: 'qa::ready',
            passed: 'qa::passed',
            failed: 'qa::failed'
        }
    };

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Issues Board</h2>
                    <p className="text-muted-foreground mt-1">
                        {groupId
                            ? `Showing ${projects.length} project${projects.length > 1 ? 's' : ''} from ${projects[0]?.name?.split('/')[0] || 'selected group'}`
                            : `Showing all projects (${filteredIssues.length} issues)`
                        }
                    </p>
                </div>
                <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
                    <Link href={groupId ? `/issues/new?groupId=${groupId}` : "/issues/new"}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Issue
                    </Link>
                </Button>
            </div>

            <KanbanBoard issues={filteredIssues} project={projectWithLabels} labels={[]} />
        </div>
    );
}
