
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea'; // Assuming standard textarea if not in UI
import { createBlocker } from '@/app/actions/exploratorySessions';
import { useToast } from '@/components/ui/useToast';

interface BlockerFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sessionId?: number;
    projectId: number;
    initialContent?: string;
    relatedIssueId?: string;
    onSuccess?: () => void;
}

export function BlockerFormModal({ open, onOpenChange, sessionId, projectId, initialContent, relatedIssueId, onSuccess }: BlockerFormModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState(initialContent || '');
    const [severity, setSeverity] = useState('medium');
    const [blockingWhat, setBlockingWhat] = useState('testing');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async () => {
        if (!title.trim()) return;

        setIsSubmitting(true);
        try {
            await createBlocker({
                sessionId,
                projectId,
                title,
                description: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }] },
                severity,
                blockingWhat,
                estimatedResolutionHours: 0,
                relatedIssueId,
            });
            toast({ title: 'Blocker logged', variant: 'destructive' });
            onOpenChange(false);
            setTitle('');
            setDescription('');
            onSuccess?.();
        } catch (error) {
            toast({ title: 'Failed to log blocker', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Log Blocker</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title">Title</Label>
                        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What is blocking you?" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="severity">Severity</Label>
                        <Select value={severity} onValueChange={setSeverity}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="blocking">Blocking What?</Label>
                        <Select value={blockingWhat} onValueChange={setBlockingWhat}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="testing">Testing</SelectItem>
                                <SelectItem value="development">Development</SelectItem>
                                <SelectItem value="deployment">Deployment</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Details about the blocker..."
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleSubmit} disabled={isSubmitting || !title.trim()}>Log Blocker</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
