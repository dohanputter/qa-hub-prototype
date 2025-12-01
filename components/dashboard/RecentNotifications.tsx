'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserNotifications } from '@/app/actions/notifications';
import { useNotificationStream } from '@/hooks/use-notification-stream';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';

export function RecentNotifications() {
    const [isMounted, setIsMounted] = useState(false);
    const queryClient = useQueryClient();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const { data: notifications, isLoading, isError } = useQuery({
        queryKey: ['recent-notifications'],
        queryFn: async () => {
            const result = await getUserNotifications(5);
            // Ensure we always return an array
            return Array.isArray(result) ? result : [];
        },
        enabled: isMounted && !!queryClient
    });

    // Use SSE for real-time updates
    useNotificationStream();

    // Safely ensure notifications is always an array
    const notificationsList = Array.isArray(notifications) ? notifications : [];

    if (isLoading) {
        return (
            <Card className="col-span-3">
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[350px] pr-4">
                    <div className="space-y-4">
                        {notificationsList.map((notification) => (
                            <div key={notification.id} className="flex flex-col gap-1 pb-4 border-b last:border-0">
                                <p className="text-sm font-medium leading-none">{notification.title}</p>
                                <p className="text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
                                <p className="text-xs text-muted-foreground pt-1">
                                    {notification.createdAt ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true }) : 'Just now'}
                                </p>
                            </div>
                        ))}
                        {notificationsList.length === 0 && !isLoading && (
                            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                                <p>{isError ? 'Failed to load activity' : 'No recent activity'}</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
