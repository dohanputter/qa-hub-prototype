import { Badge } from '@/components/ui/badge';
import { TiptapEditor } from './TiptapEditor';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface QAHistoryProps {
    runs: any[];
}

export function QAHistory({ runs }: QAHistoryProps) {
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
                    </div>

                    <div className="space-y-4 text-sm text-muted-foreground pl-1">
                        {run.issuesFoundContent && (
                            <div className="bg-red-50/50 rounded-lg p-4 border border-red-100/50">
                                <div className="font-medium text-red-700 mb-2 text-xs uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    Issues Found
                                </div>
                                <TiptapEditor content={run.issuesFoundContent} readOnly={true} className="border-0 bg-transparent p-0 min-h-0" />
                            </div>
                        )}
                        {run.testCasesContent && (
                            <div className="bg-slate-50/50 rounded-lg p-4 border border-border/40">
                                <div className="font-medium text-foreground/70 mb-2 text-xs uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                    Test Cases
                                </div>
                                <TiptapEditor content={run.testCasesContent} readOnly={true} className="border-0 bg-transparent p-0 min-h-0" />
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
