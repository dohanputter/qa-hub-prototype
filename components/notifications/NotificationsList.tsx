'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { getUserNotifications, markAllNotificationsAsRead } from '@/app/actions/notifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { CheckCheck, Bell } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function NotificationsList() {
    const queryClient = useQueryClient();
    const loadMoreRef = useRef<HTMLDivElement>(null);

    const {
        data,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage
    } = useInfiniteQuery({
        queryKey: ['notifications'],
        queryFn: ({ pageParam = 0 }) => getUserNotifications(20, pageParam),
        getNextPageParam: (lastPage, allPages) => {
            if (lastPage.length < 20) return undefined;
            return allPages.length * 20;
        },
        initialPageParam: 0,
    });

    const notifications = data?.pages.flat() || [];

    // Intersection observer to load more notifications
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            { threshold: 0.1 }
        );

        if (loadMoreRef.current) {
            observer.observe(loadMoreRef.current);
        }

        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
                <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()} disabled={!notifications?.some((n) => !n.isRead)}>
                    <CheckCheck className="mr-2 h-4 w-4" /> Mark all as read
                </Button>
            </div>
            <ScrollArea className="h-[600px] w-full rounded-md border p-4">
                <div className="space-y-2">
                    {notifications?.map((n) => (
                        <Card key={n.id} className={`transition-opacity ${n.isRead ? 'opacity-60 bg-muted/50' : 'bg-card border-l-4 border-l-blue-500'}`}>
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
                    {!notifications?.length && !isLoading && (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Bell className="h-12 w-12 mb-4 opacity-20" />
                            <p>No notifications yet</p>
                        </div>
                    )}
                    {/* Load more trigger */}
                    {hasNextPage && (
                        <div ref={loadMoreRef} className="flex justify-center py-4">
                            {isFetchingNextPage ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-20 w-full" />
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">Scroll down to load more...</p>
                            )}
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
