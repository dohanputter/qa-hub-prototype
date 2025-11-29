import { getAllIssues } from '@/app/actions/issues';
import { getProject, getProjectLabels } from '@/lib/gitlab';
import { auth } from '@/auth';
import { KanbanBoard } from '@/components/board/KanbanBoard';
import { Button } from '@/components/ui/button';
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
    const projectIdNum = Number(projectId);

    const issues = await getAllIssues({
        projectId: projectId,
        state: (state as 'opened' | 'closed') || 'opened',
    });

    const project = await getProject(projectIdNum, session.accessToken);
    const labels = await getProjectLabels(projectIdNum, session.accessToken);

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{project.name} Board</h2>
                    <p className="text-muted-foreground mt-1">
                        Drag QA records between columns
                    </p>
                </div>
                <Button asChild className="bg-primary hover:bg-primary/90">
                    <Link href={`/issues/new?projectId=${projectId}`}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Issue
                    </Link>
                </Button>
            </div>

            <KanbanBoard
                issues={issues}
                project={project as any}
                labels={labels as any}
                projectId={projectIdNum}
            />
        </div>
    );
}
