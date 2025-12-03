
'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { completeSession, abandonSession, pauseSession, resumeSession } from '@/app/actions/exploratorySessions';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Pause, Play, Square, Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface SessionHeaderProps {
    session: any;
    onStatusChange?: (status: 'active' | 'paused') => void;
}

export function SessionHeader({ session, onStatusChange }: SessionHeaderProps) {
    const router = useRouter();
    const [elapsed, setElapsed] = useState(0);
    const [status, setStatus] = useState<'active' | 'paused'>(session.status === 'paused' ? 'paused' : 'active');
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        const totalPausedDuration = session.totalPausedDuration || 0;

        if (status === 'active') {
            // Calculate initial elapsed time minus paused duration
            const startTime = new Date(session.startedAt).getTime();
            const now = new Date().getTime();
            const initialElapsed = Math.floor((now - startTime) / 1000) - totalPausedDuration;
            setElapsed(initialElapsed);

            const interval = setInterval(() => {
                setElapsed(e => e + 1);
            }, 1000);

            return () => clearInterval(interval);
        } else if (status === 'paused' && session.pausedAt) {
            // When paused, freeze the timer at the pause moment
            const startTime = new Date(session.startedAt).getTime();
            const pausedTime = new Date(session.pausedAt).getTime();
            const frozenElapsed = Math.floor((pausedTime - startTime) / 1000) - totalPausedDuration;
            setElapsed(frozenElapsed);
        }
    }, [status, session.startedAt, session.pausedAt, session.totalPausedDuration]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleStatusToggle = async () => {
        if (isUpdating) return;

        setIsUpdating(true);
        try {
            const newStatus = status === 'active' ? 'paused' : 'active';

            if (newStatus === 'paused') {
                await pauseSession(session.id);
            } else {
                await resumeSession(session.id);
            }

            setStatus(newStatus);
            onStatusChange?.(newStatus);
            router.refresh();
        } catch (error) {
            console.error('Failed to toggle session status:', error);
            alert('Failed to update session status. Please try again.');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleComplete = async () => {
        if (confirm('Are you sure you want to complete this session?')) {
            await completeSession(session.id);
            router.push(`/sessions/${session.id}/summary`);
        }
    };

    const handleAbandon = async () => {
        if (confirm('Are you sure you want to stop this session? This will mark it as abandoned.')) {
            await abandonSession(session.id);
            router.push(`/${session.project.groupId}/sessions`);
        }
    };

    return (
        <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/${session.project.groupId}/sessions`}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Sessions
                    </Link>
                </Button>
                <div className="flex flex-col">
                    <h1 className="font-semibold text-lg leading-tight">{session.charter}</h1>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(session.createdAt), 'MMM d, yyyy')}
                        </span>
                        <span>•</span>
                        <span>{session.project?.name}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md font-mono text-sm font-medium">
                    <span className={status === 'active' ? 'text-green-500 animate-pulse' : 'text-muted-foreground'}>●</span>
                    {formatTime(elapsed)}
                </div>

                <div className="flex items-center gap-2">
                    {session.blockersLoggedCount > 0 && (
                        <Badge variant="destructive" className="animate-in fade-in zoom-in">
                            {session.blockersLoggedCount} Blocker{session.blockersLoggedCount !== 1 ? 's' : ''}
                        </Badge>
                    )}

                    <Button variant="outline" size="sm" onClick={handleStatusToggle} disabled={isUpdating}>
                        {status === 'active' ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                        {status === 'active' ? 'Pause' : 'Resume'}
                    </Button>

                    <Button variant="outline" size="sm" onClick={handleAbandon}>
                        <Square className="w-4 h-4 mr-2" />
                        Stop Session
                    </Button>

                    <Button variant="destructive" size="sm" onClick={handleComplete}>
                        <Square className="w-4 h-4 mr-2 fill-current" />
                        Complete
                    </Button>
                </div>
            </div>
        </header>
    );
}
