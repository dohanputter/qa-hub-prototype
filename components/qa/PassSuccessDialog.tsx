'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CheckCircle2, Copy, Check, ExternalLink } from 'lucide-react';

interface PassSuccessDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    shareUrl: string | null;
}

export function PassSuccessDialog({ open, onOpenChange, shareUrl }: PassSuccessDialogProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!shareUrl) return;

        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            setCopied(false);
        }
        onOpenChange(newOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <DialogTitle>QA Passed Successfully</DialogTitle>
                            <DialogDescription>
                                The result has been submitted to GitLab.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {shareUrl && (
                    <div className="space-y-3 py-4">
                        <label className="text-sm font-medium">Share Link</label>
                        <div className="flex gap-2">
                            <Input
                                readOnly
                                value={shareUrl}
                                className="flex-1 bg-muted/50"
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={handleCopy}
                                className="shrink-0"
                            >
                                {copied ? (
                                    <Check className="h-4 w-4 text-emerald-600" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                asChild
                                className="shrink-0"
                            >
                                <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Use this link to share the QA run details publicly.
                        </p>
                    </div>
                )}

                <DialogFooter>
                    <Button onClick={() => handleOpenChange(false)} className="w-full sm:w-auto">
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
