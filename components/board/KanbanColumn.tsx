'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard } from './KanbanCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
    id: string;
    title: string;
    issues: any[];
    projectId: number;
}

export function KanbanColumn({ id, title, issues, projectId }: KanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <div className={cn(
            "flex flex-col h-full w-80 min-w-[20rem] rounded-xl transition-colors",
            isOver && "bg-muted/50"
        )}>
            <div className="p-4 flex items-center justify-between border-b border-border">
                <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full",
                        id === 'backlog' ? "bg-gray-400" :
                            id === 'pending' ? "bg-yellow-400" :
                                id === 'passed' ? "bg-green-500" :
                                    id === 'failed' ? "bg-red-500" : "bg-gray-400"
                    )} />
                    <h3 className="font-semibold text-sm text-foreground">{title}</h3>
                </div>
                <Badge variant="secondary" className="text-xs font-mono bg-card shadow-sm">{issues.length}</Badge>
            </div>

            <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                    <div className="p-2 h-full">
                        <SortableContext
                            items={issues.map(i => `${i.project_id || projectId}-${i.iid}`)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div ref={setNodeRef} className="min-h-[calc(100vh-250px)] space-y-3 pb-4">
                                {issues.map((issue) => (
                                    <KanbanCard key={`${issue.project_id || projectId}-${issue.iid}`} issue={issue} projectId={projectId} />
                                ))}
                            </div>
                        </SortableContext>
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}