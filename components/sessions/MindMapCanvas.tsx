
'use client';

import { useState } from 'react';

interface MindMapCanvasProps {
    sessionId: number;
    charter: string;
}

export function MindMapCanvas({ sessionId, charter }: MindMapCanvasProps) {
    // For MVP, this is a placeholder. A real mind map needs a library like React Flow or custom canvas logic.
    // We'll just show the charter as the central node.

    return (
        <div className="flex-1 relative overflow-hidden flex items-center justify-center p-10">
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(circle, #888 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                }}
            />

            <div className="bg-card border border-border shadow-lg rounded-xl p-6 max-w-xs text-center animate-in zoom-in duration-500">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Session Charter</div>
                <div className="font-medium text-lg">{charter}</div>
            </div>

            <div className="absolute bottom-4 right-4 text-xs text-muted-foreground">
                Mind Map Canvas (MVP Placeholder)
            </div>
        </div>
    );
}
