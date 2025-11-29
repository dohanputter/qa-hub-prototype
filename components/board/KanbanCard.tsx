'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { deleteIssue } from '@/app/actions/issues';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

// Mock label definitions with colors
const MOCK_LABELS = [
    { id: 1, name: 'bug', color: '#dc2626', text_color: '#fff' },
    { id: 2, name: 'feature', color: '#2563eb', text_color: '#fff' },
    { id: 3, name: 'critical', color: '#7f1d1d', text_color: '#fff' },
    { id: 4, name: 'frontend', color: '#0891b2', text_color: '#fff' },
    { id: 5, name: 'backend', color: '#6366f1', text_color: '#fff' },
    { id: 6, name: 'qa::ready', color: '#f59e0b', text_color: '#fff' },
    { id: 7, name: 'qa::passed', color: '#10b981', text_color: '#fff' },
    { id: 8, name: 'qa::failed', color: '#ef4444', text_color: '#fff' },
];

const getLabelColor = (labelName: string) => {
    const label = MOCK_LABELS.find(l => l.name === labelName);
    return label ? { bg: label.color, text: label.text_color } : { bg: '#6b7280', text: '#fff' };
};

// Pure UI component for the issue card
export function IssueCard({ issue, projectId, isOverlay = false }: { issue: any, projectId: number, isOverlay?: boolean }) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        if (!confirm('Are you sure you want to delete this issue? This action cannot be undone.')) {
            return;
        }

        setIsDeleting(true);
        try {
            await deleteIssue(issue.project_id || projectId, issue.iid);
            router.refresh();
        } catch (error) {
            console.error('Failed to delete issue:', error);
            alert('Failed to delete issue. See console for details.');
            setIsDeleting(false);
        }
    };

    return (
        <Card className={`cursor-grab active:cursor-grabbing hover:-translate-y-1 hover:shadow-md transition-all duration-200 bg-card border-border/50 ${isOverlay ? 'shadow-xl cursor-grabbing scale-105 rotate-2' : ''}`}>
            <CardContent className="p-3 space-y-3">
                <div className="flex justify-between items-start gap-2">
                    <Link
                        href={`/${issue.project_id || projectId}/qa/${issue.iid}`}
                        className="font-medium text-sm hover:text-primary hover:underline line-clamp-2 leading-tight flex-1"
                        onPointerDown={(e) => e.stopPropagation()} // Allow clicking link without dragging
                    >
                        {issue.title}
                    </Link>
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground whitespace-nowrap font-mono">#{issue.iid}</span>
                        {isMockMode && !isOverlay && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-destructive hover:text-destructive hover:bg-destructive/10 -mr-1"
                                onClick={handleDelete}
                                onPointerDown={(e) => e.stopPropagation()} // Prevent drag when clicking delete
                                disabled={isDeleting}
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap gap-1">
                    {issue.labels
                        .filter((l: string) => !l.startsWith('qa::'))
                        .slice(0, 3)
                        .map((l: string) => {
                            const colors = getLabelColor(l);
                            return (
                                <Badge
                                    key={l}
                                    variant="outline"
                                    className="text-[10px] px-2 py-0.5 h-5 font-medium rounded-full border-0"
                                    style={{ backgroundColor: `${colors.bg}15`, color: colors.bg }}
                                >
                                    {l}
                                </Badge>
                            );
                        })}
                    {issue.labels.filter((l: string) => !l.startsWith('qa::')).length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{issue.labels.filter((l: string) => !l.startsWith('qa::')).length - 3}</span>
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
                            <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center border border-border">
                                <span className="text-[9px] text-muted-foreground">?</span>
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
    } = useSortable({ id: `${issue.project_id || projectId}-${issue.iid}`, data: { ...issue, type: 'Issue' } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1, // Show semi-transparent ghost while dragging
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-3 touch-none">
            <IssueCard issue={issue} projectId={projectId} />
        </div>
    );
}
