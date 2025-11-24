import { getAllIssues } from '@/app/actions/issues';
import { IssuesTable } from '@/components/issues/IssuesTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export default async function IssuesPage({
    searchParams,
}: {
    searchParams: Promise<{ search?: string; state?: string }>;
}) {
    const params = await searchParams;
    const issues = await getAllIssues({
        search: params.search,
        state: (params.state as 'opened' | 'closed') || 'opened',
    });

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Issues</h2>
                <div className="flex items-center space-x-2">
                    {/* Add filters if needed */}
                </div>
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
