'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { formatDistanceToNow } from 'date-fns';
import { PlayCircle, Clock, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/useToast';
import { deleteSession } from '@/app/actions/exploratorySessions';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/AlertDialog';

interface Session {
    id: number;
    charter: string;
    status: 'preparing' | 'active' | 'completed' | 'paused' | 'abandoned';
    startedAt?: Date | null;
    createdAt: Date;
    issuesFoundCount?: number | null;
    blockersLoggedCount?: number | null;
    totalDuration?: number | null;
    issue?: {
        gitlabIssueIid: number;
    } | null;
    user?: {
        name: string | null;
    } | null;
}

interface SessionsListProps {
    sessions: Session[];
    projectId: number;
}

export function SessionsList({ sessions, projectId }: SessionsListProps) {
    const router = useRouter();
    const { toast } = useToast();

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Delete state
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    // Calculate paginated sessions
    const paginatedSessions = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sessions.slice(startIndex, startIndex + itemsPerPage);
    }, [sessions, currentPage, itemsPerPage]);

    const handleDelete = async () => {
        if (!deletingId) return;

        try {
            await deleteSession(deletingId);
            toast({
                title: 'Session deleted',
                description: 'The session has been successfully removed.',
            });
            setDeleteDialogOpen(false);
            setDeletingId(null);
            router.refresh();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to delete session. Please try again.',
                variant: 'destructive',
            });
        }
    };

    if (sessions.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="bg-muted/50 p-4 rounded-full mb-4">
                        <PlayCircle className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">No sessions yet</h3>
                    <p className="text-muted-foreground max-w-sm mb-6">
                        Start an exploratory session from an issue to track your testing journey.
                    </p>
                    <Button asChild>
                        <Link href={`/${projectId}/issues`}>Go to Issues</Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <div className="space-y-4">
                {paginatedSessions.map((session) => (
                    <Card key={session.id} className="hover:bg-muted/5 transition-colors">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-lg">{session.charter}</h3>
                                    <Badge variant={
                                        session.status === 'completed' ? 'secondary' :
                                            session.status === 'abandoned' ? 'destructive' :
                                                'default'
                                    }>
                                        {session.status}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatDistanceToNow(new Date(session.startedAt || session.createdAt))} ago
                                    </span>
                                    {session.issue && (
                                        <span>Issue #{session.issue.gitlabIssueIid}</span>
                                    )}
                                    <span>•</span>
                                    <span>{session.user?.name || 'Unknown User'}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="flex gap-4 text-sm">
                                    <div className="flex flex-col items-center">
                                        <span className="font-bold">{session.issuesFoundCount || 0}</span>
                                        <span className="text-muted-foreground text-xs">Bugs</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="font-bold">{session.blockersLoggedCount || 0}</span>
                                        <span className="text-muted-foreground text-xs">Blockers</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="font-bold">{Math.round((session.totalDuration || 0) / 60)}m</span>
                                        <span className="text-muted-foreground text-xs">Duration</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {session.status !== 'abandoned' && (
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={session.status === 'completed' ? `/sessions/${session.id}/summary` : `/sessions/${session.id}/workspace`}>
                                                {session.status === 'completed' ? 'View Summary' : 'Resume'}
                                            </Link>
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setDeletingId(session.id);
                                            setDeleteDialogOpen(true);
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                <Pagination
                    currentPage={currentPage}
                    totalItems={sessions.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                />
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the session and all its notes.
                            Any linked blockers will be unlinked but not deleted. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeletingId(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

