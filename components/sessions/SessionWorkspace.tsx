'use client';

import { useState } from 'react';
import { SessionHeader } from '@/components/sessions/SessionHeader';
import { QuickCaptureBar } from '@/components/sessions/QuickCaptureBar';
import { NotesTimeline } from '@/components/sessions/NotesTimeline';
import { cn } from '@/lib/utils';

interface SessionWorkspaceProps {
    session: any;
    sessionId: number;
}

export function SessionWorkspace({ session, sessionId }: SessionWorkspaceProps) {
    const [isPaused, setIsPaused] = useState(session.status === 'paused');

    return (
        <div className="h-screen w-full bg-background flex flex-col overflow-hidden">
            <SessionHeader
                session={session}
                onStatusChange={(status) => setIsPaused(status === 'paused')}
            />

            <div className={cn("flex-1 flex overflow-hidden relative", isPaused && "opacity-50 pointer-events-none select-none")}>
                {/* Left Panel: Quick Capture & Tools - Fixed width 320px */}
                <div className="w-[320px] border-r border-border flex flex-col bg-muted/10 shrink-0">
                    <QuickCaptureBar sessionId={sessionId} projectId={session.projectId} />
                    <div className="flex-1 p-4 overflow-y-auto">
                        {/* Removed placeholder text as requested */}
                    </div>
                </div>

                {/* Center Panel: Timeline - Flexible */}
                <div className="flex-1 flex flex-col bg-background min-w-[400px] border-r border-border">
                    <div className="p-4 border-b border-border bg-muted/5">
                        <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Session Timeline</h2>
                    </div>
                    <NotesTimeline sessionId={sessionId} initialNotes={session.notes} />
                </div>

                {/* Right Panel: Mind Map - Placeholder for future implementation */}
                <div className="w-[400px] flex flex-col bg-muted/5 shrink-0">
                    <div className="p-4 border-b border-border">
                        <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Mind Map</h2>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-10">
                        <div className="text-center text-muted-foreground">
                            <div className="text-4xl mb-4">🧠</div>
                            <p className="text-sm">Mind Map visualization</p>
                            <p className="text-xs mt-1">Coming soon</p>
                        </div>
                    </div>
                </div>

                {isPaused && (
                    <div className="absolute inset-0 flex items-center justify-center z-50">
                        <div className="bg-background/80 backdrop-blur-sm p-6 rounded-lg border shadow-lg text-center">
                            <h2 className="text-xl font-bold mb-2">Session Paused</h2>
                            <p className="text-muted-foreground">Resume the session to continue testing.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
