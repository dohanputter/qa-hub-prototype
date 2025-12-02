
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea'; // Assuming this exists, if not I'll use standard textarea
import { captureSessionNote } from '@/app/actions/exploratory-sessions';
import { Bug, Lightbulb, ShieldAlert, HelpCircle, Ban, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { BlockerFormModal } from './BlockerFormModal';

interface QuickCaptureBarProps {
    sessionId: number;
    projectId: number;
}

type NoteType = 'observation' | 'bug' | 'blocker' | 'question' | 'out_of_scope' | 'praise';

export function QuickCaptureBar({ sessionId, projectId }: QuickCaptureBarProps) {
    const [content, setContent] = useState('');
    const [activeType, setActiveType] = useState<NoteType>('observation');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showBlockerModal, setShowBlockerModal] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { toast } = useToast();

    const handleSubmit = async () => {
        if (!content.trim() && activeType !== 'blocker') return;

        if (activeType === 'blocker') {
            setShowBlockerModal(true);
            return;
        }

        setIsSubmitting(true);
        try {
            await captureSessionNote({
                sessionId,
                type: activeType,
                content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: content }] }] }, // Simple Tiptap JSON
                timestamp: Date.now(),
            });
            setContent('');
            toast({ title: 'Note captured', duration: 1500 });
        } catch (error) {
            toast({ title: 'Failed to capture note', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
            // Keep focus
            textareaRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSubmit();
        }
    };

    // Global shortcuts
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (!(e.metaKey || e.ctrlKey) || !e.shiftKey) return;

            switch (e.key.toLowerCase()) {
                case 'n': setActiveType('observation'); textareaRef.current?.focus(); break;
                case 'b': setActiveType('blocker'); setShowBlockerModal(true); break;
                case 'u': setActiveType('bug'); textareaRef.current?.focus(); break;
                case 'q': setActiveType('question'); textareaRef.current?.focus(); break;
                case 'o': setActiveType('out_of_scope'); textareaRef.current?.focus(); break;
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

    return (
        <div className="p-4 border-b border-border bg-background flex flex-col gap-3">
            <div className="flex items-center gap-1 overflow-x-auto pb-2 no-scrollbar">
                {types.map((t) => (
                    <Button
                        key={t.id}
                        variant={activeType === t.id ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveType(t.id)}
                        className={cn("gap-2 whitespace-nowrap", activeType === t.id && "bg-muted font-medium")}
                    >
                        <t.icon className={cn("w-4 h-4", t.color)} />
                        {t.label}
                    </Button>
                ))}
            </div>

            <div className="relative">
                <Textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Capture ${activeType}... (Ctrl+Enter to save)`}
                    className="w-full min-h-[80px] p-3 resize-none shadow-sm"
                    disabled={isSubmitting}
                />
                <div className="absolute bottom-2 right-2 flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                        <ImageIcon className="w-4 h-4 text-muted-foreground" />
                    </Button>
                </div>
            </div>

            <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                    {activeType === 'blocker' ? 'Opens blocker form' : 'Ctrl+Enter to save'}
                </span>
                <Button size="sm" onClick={handleSubmit} disabled={isSubmitting || (!content.trim() && activeType !== 'blocker')}>
                    {activeType === 'blocker' ? 'Log Blocker' : 'Save Note'}
                </Button>
            </div>

            <BlockerFormModal
                open={showBlockerModal}
                onOpenChange={setShowBlockerModal}
                sessionId={sessionId}
                projectId={projectId}
                initialContent={content}
                onSuccess={() => {
                    setContent('');
                    setActiveType('observation');
                }}
            />
        </div>
    );
}
