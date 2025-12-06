'use client';

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface SyncStatusProps {
    lastSyncedAt: Date | null;
    projectIds: number[];
    onSync?: () => void;
}

export function SyncStatus({ lastSyncedAt, projectIds, onSync }: SyncStatusProps) {
    const [isPending, startTransition] = useTransition();
    const [localLastSynced, setLocalLastSynced] = useState(lastSyncedAt);
    const [now, setNow] = useState(new Date());

    // Update "now" every minute to refresh relative time
    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    const handleSync = async () => {
        startTransition(async () => {
            try {
                const { syncGroupIssues } = await import('@/app/actions/sync');

                // Sync each project
                for (const projectId of projectIds) {
                    const { syncProjectIssues } = await import('@/app/actions/sync');
                    await syncProjectIssues(projectId);
                }

                setLocalLastSynced(new Date());
                onSync?.();

                // Reload the page to show updated data
                window.location.reload();
            } catch (error) {
                console.error('Sync failed:', error);
            }
        });
    };

    const lastSynced = localLastSynced || lastSyncedAt;
    const relativeTime = lastSynced
        ? formatDistanceToNow(lastSynced, { addSuffix: true })
        : 'Never';

    return (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
                <span className={cn(
                    "w-2 h-2 rounded-full",
                    lastSynced ? "bg-green-500" : "bg-yellow-500"
                )} />
                Last synced: {relativeTime}
            </span>
            <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={isPending}
                className="h-7 px-2 gap-1.5"
            >
                <RefreshCw className={cn("h-3.5 w-3.5", isPending && "animate-spin")} />
                {isPending ? 'Syncing...' : 'Refresh'}
            </Button>
        </div>
    );
}
