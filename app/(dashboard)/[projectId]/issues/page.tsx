import { getAllIssues } from '@/app/actions/issues';
import { getGroup, getGroupProjects } from '@/lib/gitlab';
import { auth } from '@/auth';
import { IssuesTable } from '@/components/issues/IssuesTable';
import { IssueSearch } from '@/components/issues/IssueSearch';
import { SyncStatus } from '@/components/issues/SyncStatus';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isMockMode } from '@/lib/mode';
import { db } from '@/lib/db';
import { projects } from '@/db/schema';
import { inArray } from 'drizzle-orm';

export default async function IssuesPage({
    params,
    searchParams,
}: {
    params: Promise<{ projectId: string }>;
    searchParams: Promise<{ search?: string; state?: string; labels?: string }>;
}) {
    const session = await auth();
    if (!session?.accessToken) redirect('/auth/signin');

    const { projectId } = await params;
    const { search, state, labels: labelParams } = await searchParams;
    const groupId = Number(projectId); // URL param is still named projectId

    const issues = await getAllIssues({
        groupId: projectId, // Pass as groupId
        search: search,
        state: (state as 'opened' | 'closed') || 'opened',
        labels: labelParams,
    });

    // Fetch group details
    const group = await getGroup(groupId, session.accessToken);

    // Get all projects in the group
    const groupProjects = await getGroupProjects(groupId, session.accessToken);
    const projectIds = groupProjects.map((p: any) => p.id);

    // Get last synced timestamp (use the oldest one if multiple projects)
    let lastSyncedAt: Date | null = null;
    if (!isMockMode() && projectIds.length > 0) {
        const dbProjects = await db.select({ lastSyncedAt: projects.lastSyncedAt })
            .from(projects)
            .where(inArray(projects.id, projectIds));

        // Find the oldest sync time (most stale)
        const syncTimes = dbProjects
            .map(p => p.lastSyncedAt)
            .filter((t): t is Date => t !== null);

        if (syncTimes.length > 0) {
            lastSyncedAt = new Date(Math.min(...syncTimes.map(t => t.getTime())));
        }
    }

    // Fetch labels from the first project
    const labels = groupProjects.length > 0
        ? (await import('@/lib/gitlab')).getProjectLabels(groupProjects[0].id, session.accessToken)
        : [];

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{group.name} Issues</h2>
                    <p className="text-muted-foreground">Manage QA issues and test runs for {group.name}</p>
                </div>
                <div className="flex items-center gap-4">
                    <SyncStatus
                        lastSyncedAt={lastSyncedAt}
                        projectIds={projectIds}
                    />
                    <Button asChild className="bg-primary hover:bg-primary/90">
                        <Link href={`/${groupId}/issues/new`}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Issue
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <IssueSearch labels={await labels} projectId={groupId} />
            </div>

            <IssuesTable
                issues={issues}
                projectId={groupId}
                labels={await labels as any}
            />
        </div>
    );
}
