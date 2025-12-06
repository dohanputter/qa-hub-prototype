'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard } from './KanbanCard';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { KanbanIssue, KanbanColumnId } from '@/types';

interface KanbanColumnProps {
    id: KanbanColumnId;
    title: string;
    issues: KanbanIssue[];
    projectId: number;
    /** Optional custom color for the column indicator */
    color?: string;
}

export function KanbanColumn({ id, title, issues, projectId, color }: KanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ id });

    // Default colors for legacy/backlog columns
    const getDefaultColor = () => {
        switch (id) {
            case 'backlog': return '#9ca3af'; // gray-400
            case 'pending': return '#facc15'; // yellow-400
            case 'passed': return '#22c55e';  // green-500
            case 'failed': return '#ef4444';  // red-500
            default: return '#6b7280';        // gray-500
        }
    };

    const indicatorColor = color || getDefaultColor();

    return (
        <div className={cn(
            "flex flex-col h-full w-80 min-w-[20rem] rounded-xl transition-colors",
            isOver && "bg-muted/50"
        )}>
            <div className="p-4 flex items-center justify-between border-b border-border">
                <div className="flex items-center gap-2">
                    <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: indicatorColor }}
                    />
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