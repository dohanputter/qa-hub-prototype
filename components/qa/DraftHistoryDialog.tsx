'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { History, Clock, Save, RotateCcw } from 'lucide-react';
import { getDraftHistory, restoreDraft } from '@/app/actions/draftHistory';
import { toast } from '@/components/ui/useToast';
import { cn } from '@/lib/utils';
import type { JSONContent } from '@tiptap/core';
import { format } from 'date-fns';

interface DraftHistoryItem {
    id: string;
    testCasesContent: JSONContent | null;
    issuesFoundContent: JSONContent | null;
    createdAt: Date;
    saveType: 'auto' | 'manual';
}

interface DraftHistoryDialogProps {
    qaRunId: string | null;
    onRestore: (draft: { testCasesContent: JSONContent | null; issuesFoundContent: JSONContent | null }) => void;
}

export function DraftHistoryDialog({ qaRunId, onRestore }: DraftHistoryDialogProps) {
    const [open, setOpen] = useState(false);
    const [drafts, setDrafts] = useState<DraftHistoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [restoring, setRestoring] = useState<string | null>(null);

    useEffect(() => {
        if (open && qaRunId) {
            loadDrafts();
        }
    }, [open, qaRunId]);

    const loadDrafts = async () => {
        if (!qaRunId) return;

        setLoading(true);
        try {
            const history = await getDraftHistory(qaRunId);
            setDrafts(history as DraftHistoryItem[]);
        } catch (error: any) {
            toast({
                title: 'Failed to load draft history',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (draftId: string) => {
        setRestoring(draftId);
        try {
            const result = await restoreDraft(draftId);
            if (result.success && result.draft) {
                onRestore({
                    testCasesContent: result.draft.testCasesContent as JSONContent | null,
                    issuesFoundContent: result.draft.issuesFoundContent as JSONContent | null,
                });
                toast({
                    title: 'Draft restored',
                    description: 'Your previous work has been restored',
                });
                setOpen(false);
            }
        } catch (error: any) {
            toast({
                title: 'Failed to restore draft',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setRestoring(null);
        }
    };

    const getContentPreview = (draft: DraftHistoryItem) => {
        const hasTestCases = draft.testCasesContent && JSON.stringify(draft.testCasesContent).length > 50;
        const hasIssues = draft.issuesFoundContent && JSON.stringify(draft.issuesFoundContent).length > 50;

        if (hasTestCases && hasIssues) return 'Test Cases & Issues';
        if (hasTestCases) return 'Test Cases';
        if (hasIssues) return 'Issues Found';
        return 'Empty draft';
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    disabled={!qaRunId}
                    className="text-muted-foreground hover:text-foreground"
                >
                    <History className="h-4 w-4 mr-2" />
                    Draft History
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>Draft History</DialogTitle>
                    <DialogDescription>
                        Restore a previous version of your work. Auto-saves happen every 5 minutes.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-[500px] pr-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center text-muted-foreground">
                                Loading draft history...
                            </div>
                        </div>
                    ) : drafts.length === 0 ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center text-muted-foreground">
                                <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                <p>No draft history yet</p>
                                <p className="text-sm mt-1">Drafts will be saved automatically every 5 minutes</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {drafts.map((draft, index) => (
                                <div
                                    key={draft.id}
                                    className={cn(
                                        "group relative border rounded-lg p-4 hover:border-primary/50 transition-colors",
                                        index === 0 && "border-primary/30 bg-primary/5"
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                {draft.saveType === 'auto' ? (
                                                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                                ) : (
                                                    <Save className="h-3.5 w-3.5 text-blue-500" />
                                                )}
                                                <span className="text-sm font-medium">
                                                    {draft.saveType === 'auto' ? 'Auto-saved' : 'Manual save'}
                                                </span>
                                                {index === 0 && (
                                                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                                        Latest
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {format(new Date(draft.createdAt), 'MMM d, yyyy \'at\' h:mm a')}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {getContentPreview(draft)}
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleRestore(draft.id)}
                                            disabled={restoring === draft.id}
                                            className="shrink-0"
                                        >
                                            {restoring === draft.id ? (
                                                <>Restoring...</>
                                            ) : (
                                                <>
                                                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                                                    Restore
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
