'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ShieldAlert, Trash2, Edit, Clock, CheckCircle2 } from 'lucide-react';
import { deleteBlocker, updateBlocker } from '@/app/actions/exploratory-sessions';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';
import { extractTextFromTiptap } from '@/lib/tiptap';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface Blocker {
    id: number;
    sessionId?: number | null;
    projectId: number;
    title: string;
    description: any;
    severity: 'low' | 'medium' | 'high' | 'critical';
    status: 'active' | 'resolved' | 'escalated' | null; // Allow null to match DB schema
    blockingWhat: 'testing' | 'development' | 'deployment';
    createdAt: Date;
    resolvedAt?: Date | null;
    session?: {
        id: number;
        // add other session fields if needed
    } | null;
}

interface BlockersListProps {
    blockers: Blocker[];
    projectId: number;
}

export function BlockersList({ blockers, projectId }: BlockersListProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved'>('all');
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const filteredBlockers = blockers.filter(blocker => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'active') return (blocker.status === 'active' || blocker.status === 'escalated' || blocker.status === null); // Treat null as active
        if (statusFilter === 'resolved') return blocker.status === 'resolved';
        return true;
    });

    const handleDelete = async () => {
        if (!deletingId) return;

        try {
            await deleteBlocker(deletingId);
            toast({
                title: 'Blocker deleted',
                description: 'The blocker has been successfully removed.',
            });
            setDeleteDialogOpen(false);
            setDeletingId(null);
            router.refresh();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to delete blocker. Please try again.',
                variant: 'destructive',
            });
        }
    };

    const handleResolve = async (blockerId: number) => {
        try {
            await updateBlocker(blockerId, { status: 'resolved' });
            toast({
                title: 'Blocker resolved',
                description: 'The blocker has been marked as resolved.',
            });
            router.refresh();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to resolve blocker. Please try again.',
                variant: 'destructive',
            });
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'destructive';
            case 'high': return 'destructive';
            case 'medium': return 'default';
            case 'low': return 'secondary';
            default: return 'default';
        }
    };

    const getStatusBadge = (status: string | null) => {
        switch (status) {
            case 'active': return <Badge variant="destructive">Active</Badge>;
            case 'resolved': return <Badge variant="secondary">Resolved</Badge>;
            case 'escalated': return <Badge variant="destructive">Escalated</Badge>;
            case null: return <Badge variant="destructive">Active</Badge>; // Default null to active
            default: return <Badge>{status}</Badge>;
        }
    };

    return (
        <>
            <div className="space-y-4">
                {/* Filter Buttons */}
                <div className="flex gap-2">
                    <Button
                        variant={statusFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setStatusFilter('all')}
                    >
                        All ({blockers.length})
                    </Button>
                    <Button
                        variant={statusFilter === 'active' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setStatusFilter('active')}
                    >
                        Active ({blockers.filter(b => b.status === 'active' || b.status === 'escalated' || b.status === null).length})
                    </Button>
                    <Button
                        variant={statusFilter === 'resolved' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setStatusFilter('resolved')}
                    >
                        Resolved ({blockers.filter(b => b.status === 'resolved').length})
                    </Button>
                </div>

                {/* Blockers List */}
                {filteredBlockers.length === 0 && (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                            <div className="bg-muted/50 p-4 rounded-full mb-4">
                                <ShieldAlert className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="font-semibold text-lg mb-2">No blockers found</h3>
                            <p className="text-muted-foreground max-w-sm">
                                {statusFilter === 'all'
                                    ? 'No blockers have been logged for this project yet.'
                                    : `No ${statusFilter} blockers found.`}
                            </p>
                        </CardContent>
                    </Card>
                )}

                {filteredBlockers.map((blocker) => (
                    <Card key={blocker.id} className="hover:bg-muted/5 transition-colors">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-2 flex-1">
                                    <div className="flex items-center gap-2">
                                        <ShieldAlert className={`w-5 h-5 ${blocker.severity === 'critical' || blocker.severity === 'high'
                                                ? 'text-destructive'
                                                : 'text-muted-foreground'
                                            }`} />
                                        <h3 className="font-semibold text-lg">{blocker.title}</h3>
                                        {getStatusBadge(blocker.status)}
                                        <Badge variant={getSeverityColor(blocker.severity)}>
                                            {blocker.severity}
                                        </Badge>
                                    </div>

                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatDistanceToNow(new Date(blocker.createdAt))} ago
                                        </span>
                                        {blocker.session && (
                                            <>
                                                <span>•</span>
                                                <Link
                                                    href={`/sessions/${blocker.sessionId}/summary`}
                                                    className="hover:underline"
                                                >
                                                    Session #{blocker.sessionId}
                                                </Link>
                                            </>
                                        )}
                                        <span>•</span>
                                        <span>Blocking: {blocker.blockingWhat}</span>
                                    </div>

                                    {extractTextFromTiptap(blocker.description) && (
                                        <p className="text-sm text-muted-foreground">
                                            {extractTextFromTiptap(blocker.description)}
                                        </p>
                                    )}

                                    {blocker.status === 'resolved' && blocker.resolvedAt && (
                                        <div className="flex items-center gap-2 text-sm text-green-600">
                                            <CheckCircle2 className="w-4 h-4" />
                                            Resolved {formatDistanceToNow(new Date(blocker.resolvedAt))} ago
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    {blocker.status !== 'resolved' && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleResolve(blocker.id)}
                                        >
                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                            Resolve
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setDeletingId(blocker.id);
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
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the blocker. This action cannot be undone.
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
