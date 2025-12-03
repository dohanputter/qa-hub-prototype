
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { captureSessionNote } from '@/app/actions/exploratorySessions';
import { Bug, Lightbulb, ShieldAlert, HelpCircle, Ban, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/useToast';
import { BlockerFormModal } from './BlockerFormModal';
import { TiptapEditor } from '@/components/qa/TiptapEditor';
import type { JSONContent } from '@tiptap/core';

interface QuickCaptureBarProps {
    sessionId: number;
    projectId: number;
}

type NoteType = 'observation' | 'bug' | 'blocker' | 'question' | 'out_of_scope' | 'praise';

export function QuickCaptureBar({ sessionId, projectId }: QuickCaptureBarProps) {
    const [content, setContent] = useState<JSONContent>({ type: 'doc', content: [] });
    const [activeType, setActiveType] = useState<NoteType>('observation');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showBlockerModal, setShowBlockerModal] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async () => {
        // Check if content is empty
        const isEmpty = !content.content || content.content.length === 0 ||
            (content.content.length === 1 && content.content[0].type === 'paragraph' && (!content.content[0].content || content.content[0].content.length === 0));

        if (isEmpty) return;

        setIsSubmitting(true);
        try {
            await captureSessionNote({
                sessionId,
                type: activeType,
                content,
                timestamp: Date.now(),
            });
            setContent({ type: 'doc', content: [] });
            toast({ title: 'Note captured', duration: 1500 });
        } catch (error) {
            toast({ title: 'Failed to capture note', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Global shortcuts
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (!(e.metaKey || e.ctrlKey) || !e.shiftKey) return;

            switch (e.key.toLowerCase()) {
                case 'n':
                    setActiveType('observation');
                    break;
                case 'b':
                    e.preventDefault();
                    setShowBlockerModal(true);
                    break;
                case 'u':
                    setActiveType('bug');
                    break;
                case 'q':
                    setActiveType('question');
                    break;
                case 'o':
                    setActiveType('out_of_scope');
                    break;
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    const types: { id: NoteType; label: string; icon: any; color: string }[] = [
        { id: 'observation', label: 'Observation', icon: Lightbulb, color: 'text-blue-500' },
        { id: 'bug', label: 'Bug', icon: Bug, color: 'text-red-500' },
        { id: 'blocker', label: 'Blocker', icon: ShieldAlert, color: 'text-orange-600' },
        { id: 'question', label: 'Question', icon: HelpCircle, color: 'text-purple-500' },
        { id: 'out_of_scope', label: 'Out of Scope', icon: Ban, color: 'text-gray-500' },
        { id: 'praise', label: 'Praise', icon: CheckCircle2, color: 'text-green-500' },
    ];

    const handleTypeClick = (type: NoteType) => {
        if (type === 'blocker') {
            setShowBlockerModal(true);
        } else {
            setActiveType(type);
        }
    };

    const isContentEmpty = !content.content || content.content.length === 0 ||
        (content.content.length === 1 && content.content[0].type === 'paragraph' && (!content.content[0].content || content.content[0].content.length === 0));

    return (
        <div className="p-4 border-b border-border bg-background flex flex-col gap-3">
            <div className="flex items-center gap-1 overflow-x-auto pb-2 no-scrollbar">
                {types.map((t) => (
                    <Button
                        key={t.id}
                        variant={activeType === t.id && t.id !== 'blocker' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => handleTypeClick(t.id)}
                        className={cn("gap-2 whitespace-nowrap", activeType === t.id && t.id !== 'blocker' && "bg-muted font-medium")}
                    >
                        <t.icon className={cn("w-4 h-4", t.color)} />
                        {t.label}
                    </Button>
                ))}
            </div>

            {activeType !== 'blocker' && (
                <>
                    <TiptapEditor
                        content={content}
                        onChange={setContent}
                        placeholder={`Capture ${activeType}... (Ctrl+Enter to save)`}
                        className="min-h-[120px]"
                    />

                    <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">
                            Ctrl+Enter to save • Paste images directly
                        </span>
                        <Button
                            size="sm"
                            onClick={handleSubmit}
                            disabled={isSubmitting || isContentEmpty}
                        >
                            Save Note
                        </Button>
                    </div>
                </>
            )}

            <BlockerFormModal
                open={showBlockerModal}
                onOpenChange={setShowBlockerModal}
                sessionId={sessionId}
                projectId={projectId}
                onSuccess={() => {
                    setContent({ type: 'doc', content: [] });
                }}
            />
        </div>
    );
}
