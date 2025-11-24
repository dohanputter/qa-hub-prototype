'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

// Pure UI component for the issue card
export function IssueCard({ issue, projectId, isOverlay = false }: { issue: any, projectId: number, isOverlay?: boolean }) {
    return (
        <Card className={`cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow bg-white ${isOverlay ? 'shadow-xl cursor-grabbing' : ''}`}>
            <CardContent className="p-3 space-y-3">
                <div className="flex justify-between items-start gap-2">
                    <Link
                        href={`/${projectId}/qa/${issue.iid}`}
                        className="font-medium text-sm hover:text-indigo-600 hover:underline line-clamp-2 leading-tight"
                        onPointerDown={(e) => e.stopPropagation()} // Allow clicking link without dragging
                    >
                        {issue.title}
                    </Link>
                    <span className="text-xs text-muted-foreground whitespace-nowrap font-mono">#{issue.iid}</span>
                </div>

                <div className="flex flex-wrap gap-1">
                    {issue.labels.slice(0, 3).map((l: string) => (
                        <Badge key={l} variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-normal text-muted-foreground border-gray-200 bg-gray-50">
                            {l}
                        </Badge>
                    ))}
                    {issue.labels.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{issue.labels.length - 3}</span>
                    )}
                </div>

                <div className="flex justify-between items-center pt-1">
                    <div className="flex items-center gap-1.5">
                        {issue.assignee ? (
                            <Avatar className="h-5 w-5">
                                <AvatarImage src={issue.assignee.avatar_url} />
                                <AvatarFallback className="text-[9px]">{issue.assignee.name[0]}</AvatarFallback>
                            </Avatar>
                        ) : (
                            <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                                <span className="text-[9px] text-gray-400">?</span>
                            </div>
                        )}
                        {issue.assignee && <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{issue.assignee.name}</span>}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(issue.updated_at), { addSuffix: true })}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}

// Sortable wrapper
export function KanbanCard({ issue, projectId }: { issue: any, projectId: number }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: issue.id.toString(), data: { ...issue, type: 'Issue' } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1, // Hide original element while dragging to create a gap
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-3 touch-none">
            <IssueCard issue={issue} projectId={projectId} />
        </div>
    );
}
