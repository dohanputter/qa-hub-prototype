import { getAllIssues } from '@/app/actions/issues';
import { getGroup, getGroupProjects } from '@/lib/gitlab';
import { auth } from '@/auth';
import { KanbanBoard } from '@/components/board/KanbanBoard';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getProjectColumnMapping } from '@/app/actions/columnMapping';
import { revalidatePath } from 'next/cache';

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

    // Fetch projects in group for labels
    const projects = await getGroupProjects(groupId, session.accessToken);

    const firstProjectId = projects.length > 0 ? projects[0].id : groupId;
    const labels = projects.length > 0 ? (await import('@/lib/gitlab')).getProjectLabels(firstProjectId, session.accessToken) : [];

    // Fetch column mapping for the group (stored per-group)
    // (Column mapping is stored per-project, and boards show group-level issues)
    const columns = await getProjectColumnMapping(groupId);

    // Callback to refresh when columns are updated
    const handleColumnsChange = async () => {
        'use server';
        revalidatePath(`/${groupId}/board`);
    };

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
                project={{ ...group, id: groupId } as any}
                labels={await labels as any}
                projectId={groupId}
                columns={columns}
                onColumnsChange={handleColumnsChange}
            />
        </div>
    );
}
