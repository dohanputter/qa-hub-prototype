import { getAllIssues } from '@/app/actions/issues';
import { IssuesTable } from '@/components/issues/IssuesTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus } from 'lucide-react';
import Link from 'next/link';

export default async function IssuesPage({
    searchParams,
}: {
    searchParams: Promise<{ search?: string; state?: string; groupId?: string }>;
}) {
    const params = await searchParams;
    const issues = await getAllIssues({
        search: params.search,
        state: (params.state as 'opened' | 'closed') || 'opened',
    });

    const createIssueUrl = params.groupId
        ? `/issues/new?groupId=${params.groupId}`
        : '/issues/new';

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Issues</h2>
                <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
                    <Link href={createIssueUrl}>
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
                <div className="flex items-center gap-2">
                    {/* State toggle could go here */}
                </div>
            </div>

            <IssuesTable issues={issues} />
        </div>
    );
}
