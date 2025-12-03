import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

export function useNotificationStream() {
    const queryClient = useQueryClient();
    const { data: session } = useSession();

    useEffect(() => {
        if (!session?.user) return;

        const eventSource = new EventSource('/api/sse/notifications');

        eventSource.onmessage = (event) => {
            // Handle heartbeat
            if (event.data === ': heartbeat') return;

            try {
                const payload = JSON.parse(event.data);

                if (payload.type === 'notification') {
                    const newNotification = payload.data;

                    // Update 'notifications' query (infinite list)
                    queryClient.setQueryData(['notifications'], (oldData: any) => {
                        if (!oldData) return oldData;
                        return {
                            ...oldData,
                            pages: oldData.pages.map((page: any, index: number) => {
                                if (index === 0) {
                                    return [newNotification, ...page];
                                }
                                return page;
                            }),
                        };
                    });

                    // Update 'recent-notifications' query (dashboard)
                    queryClient.setQueryData(['recent-notifications'], (oldData: any) => {
                        if (!oldData) return [newNotification];
                        return [newNotification, ...oldData].slice(0, 5);
                    });

                    // Force invalidate to ensure consistency
                    queryClient.invalidateQueries({ queryKey: ['recent-notifications'] });
                }
            } catch (error) {
                console.error('Error parsing SSE message:', error);
            }
        };

        eventSource.onerror = (error) => {
            console.error('SSE Error:', error);
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, [queryClient, session]);
}
