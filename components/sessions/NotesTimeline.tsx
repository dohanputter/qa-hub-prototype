
'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/Badge';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Bug, Lightbulb, ShieldAlert, HelpCircle, Ban, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { extractTextFromTiptap } from '@/lib/tiptap';

interface Note {
    id: number;
    type: string;
    content: any;
    timestamp: string | Date;
    sessionTime?: number | null;
    blockerSeverity?: string | null;
    createdAt?: Date;
    requiresFollowUp?: boolean | null;
}

interface NotesTimelineProps {
    sessionId: number;
    initialNotes: Note[];
}

export function NotesTimeline({ sessionId, initialNotes }: NotesTimelineProps) {
    // In a real app, we'd use a real-time subscription or polling here.
    // For now, we'll just display initial notes. 
    // Since QuickCapture revalidates the path, this component will re-render on server action success if it was a server component,
    // but as a client component receiving props, it might need a router.refresh() in the parent or use a context.
    // However, for this MVP, we rely on the page revalidation.

    const notes = initialNotes; // In reality, useOptimistic or useEffect to fetch updates

    const getIcon = (type: string) => {
        switch (type) {
            case 'bug': return <Bug className="w-4 h-4 text-red-500" />;
            case 'blocker': return <ShieldAlert className="w-4 h-4 text-orange-600" />;
            case 'question': return <HelpCircle className="w-4 h-4 text-purple-500" />;
            case 'out_of_scope': return <Ban className="w-4 h-4 text-gray-500" />;
            case 'praise': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            default: return <Lightbulb className="w-4 h-4 text-blue-500" />;
        }
    };

    const formatTime = (seconds?: number) => {
        if (seconds === undefined) return '--:--';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
                {notes.length === 0 && (
                    <div className="text-center text-muted-foreground py-10">
                        No notes captured yet. Start testing!
                    </div>
                )}
                {notes.map((note) => (
                    <div key={note.id} className={cn(
                        "flex gap-3 p-3 rounded-lg border bg-card text-card-foreground shadow-sm",
                        note.type === 'blocker' && "border-l-4 border-l-orange-500"
                    )}>
                        <div className="flex flex-col items-center gap-1 min-w-[40px]">
                            <span className="text-xs font-mono text-muted-foreground">{formatTime(note.sessionTime || undefined)}</span>
                            <div className="p-1.5 rounded-full bg-muted">
                                {getIcon(note.type)}
                            </div>
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="capitalize text-[10px] h-5 px-1.5">
                                        {note.type.replace('_', ' ')}
                                    </Badge>
                                    {note.blockerSeverity && (
                                        <Badge variant={note.blockerSeverity === 'critical' ? 'destructive' : 'secondary'} className="text-[10px] h-5 px-1.5 capitalize">
                                            {note.blockerSeverity}
                                        </Badge>
                                    )}
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                    {format(new Date(note.timestamp), 'h:mm a')}
                                </span>
                            </div>
                            <div className="text-sm prose dark:prose-invert max-w-none">
                                {extractTextFromTiptap(note.content)}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
}
