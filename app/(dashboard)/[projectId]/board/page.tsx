import { getAllIssues } from '@/app/actions/issues';
import { getGroup, getGroupProjects } from '@/lib/gitlab';
import { auth } from '@/auth';
import { KanbanBoard } from '@/components/board/KanbanBoard';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function BoardPage({
    params,
    searchParams,
}: {
    params: Promise<{ projectId: string }>;
    searchParams: Promise<{ state?: string }>;
}) {
    const session = await auth();
    if (!session?.accessToken) redirect('/auth/signin');

    const { projectId } = await params;
    const { state } = await searchParams;
    const groupId = Number(projectId); // URL param is still named projectId

    const issues = await getAllIssues({
        groupId: projectId, // Pass as groupId
        state: (state as 'opened' | 'closed') || 'opened',
    });

    // Fetch group details
    const group = await getGroup(groupId, session.accessToken);

    // Fetch labels from first project in group (heuristic)
    const projects = await getGroupProjects(groupId, session.accessToken);
    const labels = projects.length > 0 ? (await import('@/lib/gitlab')).getProjectLabels(projects[0].id, session.accessToken) : [];

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{group.name} Board</h2>
                    <p className="text-muted-foreground mt-1">
                        Drag QA records between columns
                    </p>
                </div>
                <Button asChild className="bg-primary hover:bg-primary/90">
                    <Link href={`/${groupId}/issues/new`}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Issue
                    </Link>
                </Button>
            </div>

            <KanbanBoard
                issues={issues}
                project={group as any} // KanbanBoard might expect Project type, but Group has similar fields (name, id). Might need adjustment.
                labels={await labels as any}
                projectId={groupId}
            />
        </div>
    );
}
