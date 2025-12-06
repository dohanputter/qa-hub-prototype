import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { TiptapEditor } from './TiptapEditor';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface QAHistoryProps {
    runs: any[];
}

export function QAHistory({ runs }: QAHistoryProps) {
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const getShareUrl = (shareUuid: string) => {
        return `${typeof window !== 'undefined' ? window.location.origin : ''}/shared/${shareUuid}`;
    };

    const handleCopy = async (runId: string, shareUuid: string) => {
        try {
            await navigator.clipboard.writeText(getShareUrl(shareUuid));
            setCopiedId(runId);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className="space-y-0 max-w-3xl">
            {runs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <p>No history yet.</p>
                </div>
            ) : runs.map((run: any) => (
                <div key={run.id} className="relative pl-8 pb-10 border-l border-border/40 last:pb-0 last:border-0">
                    <div className={cn(
                        "absolute left-0 top-0 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-background",
                        run.status === 'passed' ? "bg-emerald-500" :
                            run.status === 'failed' ? "bg-red-500" : "bg-blue-500"
                    )} />

                    <div className="flex items-center gap-4 mb-4 -mt-1.5">
                        <span className="font-semibold text-lg">Run #{run.runNumber}</span>
                        <Badge variant="outline" className={cn(
                            "uppercase text-[10px] tracking-wider border-0 px-2 py-0.5",
                            run.status === 'passed' ? "bg-emerald-500/10 text-emerald-600" :
                                run.status === 'failed' ? "bg-red-500/10 text-red-600" : "bg-blue-500/10 text-blue-600"
                        )}>
                            {run.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground ml-auto">
                            {run.completedAt ? formatDistanceToNow(new Date(run.completedAt)) + ' ago' : 'In Progress'}
                        </span>
                        {run.status !== 'pending' && run.shareUuid && (
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleCopy(run.id, run.shareUuid)}
                                    title="Copy share link"
                                >
                                    {copiedId === run.id ? (
                                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                                    ) : (
                                        <Copy className="h-3.5 w-3.5" />
                                    )}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    asChild
                                    title="Open share link"
                                >
                                    <a href={getShareUrl(run.shareUuid)} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4 text-sm text-muted-foreground pl-1">
                        {run.issuesFoundContent && (
                            <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4 border border-red-200 dark:border-red-900/50">
                                <div className="font-medium text-red-700 dark:text-red-400 mb-2 text-xs uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    Issues Found
                                </div>
                                <TiptapEditor content={run.issuesFoundContent} readOnly={true} className="border-0 bg-transparent p-0 min-h-0" />
                            </div>
                        )}
                        {run.testCasesContent && (
                            <div className="bg-muted/50 rounded-lg p-4 border border-border">
                                <div className="font-medium text-muted-foreground mb-2 text-xs uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                                    Test Cases
                                </div>
                                <TiptapEditor content={run.testCasesContent} readOnly={true} className="border-0 bg-transparent p-0 min-h-0" />
                            </div>
                        )}
                        {run.status === 'passed' && run.closingNote && (
                            <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-4 border border-emerald-200 dark:border-emerald-900/50">
                                <div className="font-medium text-emerald-700 dark:text-emerald-400 mb-2 text-xs uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Closing Note
                                </div>
                                <p className="text-sm text-foreground/80 whitespace-pre-wrap">{run.closingNote}</p>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
