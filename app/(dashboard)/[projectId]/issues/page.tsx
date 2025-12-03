import { getAllIssues } from '@/app/actions/issues';
import { getGroup, getGroupProjects } from '@/lib/gitlab';
import { auth } from '@/auth';
import { IssuesTable } from '@/components/issues/IssuesTable';
import { IssueSearch } from '@/components/issues/IssueSearch';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

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

    // We might want to fetch labels for all projects in the group or just use a set of common labels
    // For now, let's try to get labels from the first project in the group as a heuristic
    // or we could fetch group labels if GitLab supports it (it does)
    // But our getProjectLabels fetches project labels.
    // Let's fetch group projects and get labels from the first one for now
    const projects = await getGroupProjects(groupId, session.accessToken);
    const labels = projects.length > 0 ? (await import('@/lib/gitlab')).getProjectLabels(projects[0].id, session.accessToken) : [];

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{group.name} Issues</h2>
                    <p className="text-muted-foreground">Manage QA issues and test runs for {group.name}</p>
                </div>
                <Button asChild className="bg-primary hover:bg-primary/90">
                    <Link href={`/${groupId}/issues/new`}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Issue
                    </Link>
                </Button>
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
