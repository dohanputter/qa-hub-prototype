'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserNotifications, markAllNotificationsAsRead } from '@/app/actions/notifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { CheckCheck, Bell } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function NotificationsList() {
    const queryClient = useQueryClient();
    const { data: notifications, isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => getUserNotifications(50)
    });

    const markAllRead = useMutation({
        mutationFn: markAllNotificationsAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
    });

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()} disabled={!notifications?.some((n: Awaited<ReturnType<typeof getUserNotifications>>[number]) => !n.isRead)}>
                    <CheckCheck className="mr-2 h-4 w-4" /> Mark all as read
                </Button>
            </div>
            <div className="space-y-2">
                {notifications?.map((n: Awaited<ReturnType<typeof getUserNotifications>>[number]) => (
                    <Card key={n.id} className={`transition-opacity ${n.isRead ? 'opacity-60 bg-gray-50' : 'bg-white border-l-4 border-l-blue-500'}`}>
                        <CardContent className="p-4 flex justify-between items-start">
                            <div className="space-y-1">
                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                    {n.title}
                                    {!n.isRead && <span className="h-2 w-2 rounded-full bg-blue-500 inline-block" />}
                                </h4>
                                <p className="text-sm text-gray-600">{n.message}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : ''}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {!notifications?.length && (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Bell className="h-12 w-12 mb-4 opacity-20" />
                        <p>No notifications yet</p>
                    </div>
                )}
            </div>
        </div>
    );
}
