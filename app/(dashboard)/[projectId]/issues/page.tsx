import { getAllIssues } from '@/app/actions/issues';
import { getProject } from '@/lib/gitlab';
import { auth } from '@/auth';
import { IssuesTable } from '@/components/issues/IssuesTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function IssuesPage({
    params,
    searchParams,
}: {
    params: Promise<{ projectId: string }>;
    searchParams: Promise<{ search?: string; state?: string }>;
}) {
    const session = await auth();
    if (!session?.accessToken) redirect('/auth/signin');

    const { projectId } = await params;
    const { search, state } = await searchParams;
    const projectIdNum = Number(projectId);

    const issues = await getAllIssues({
        projectId: projectId,
        search: search,
        state: (state as 'opened' | 'closed') || 'opened',
    });

    const project = await getProject(projectIdNum, session.accessToken);

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{project.name} Issues</h2>
                    <p className="text-muted-foreground">Manage QA issues and test runs for {project.name}</p>
                </div>
                <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
                    <Link href={`/issues/new?projectId=${projectId}`}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Issue
                    </Link>
                </Button>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search issues..." className="pl-8" />
                </div>
            </div>

            <IssuesTable
                issues={issues}
                projectId={projectIdNum}
            />
        </div>
    );
}
