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
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { Label } from '@/components/ui/Label';
import { Loader2 } from 'lucide-react';

interface PassRunModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (options: { note?: string; generateLink: boolean }) => void;
    isSubmitting?: boolean;
}

export function PassRunModal({ open, onOpenChange, onConfirm, isSubmitting }: PassRunModalProps) {
    const [note, setNote] = useState('');
    const [generateLink, setGenerateLink] = useState(true);

    const handleConfirm = () => {
        onConfirm({
            note: note.trim() || undefined,
            generateLink,
        });
        // Reset state after confirmation
        setNote('');
        setGenerateLink(true);
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            // Reset state when closing
            setNote('');
            setGenerateLink(true);
        }
        onOpenChange(newOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Pass QA Run</DialogTitle>
                    <DialogDescription>
                        Add an optional closing note and choose whether to generate a public share link.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="closing-note">Closing Note (Optional)</Label>
                        <Textarea
                            id="closing-note"
                            placeholder="Add any final notes or observations..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="min-h-[100px]"
                        />
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="generate-link"
                            checked={generateLink}
                            onCheckedChange={(checked: boolean | 'indeterminate') => setGenerateLink(checked === true)}
                        />
                        <Label
                            htmlFor="generate-link"
                            className="text-sm font-normal cursor-pointer"
                        >
                            Generate public share link
                        </Label>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="ghost"
                        onClick={() => handleOpenChange(false)}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isSubmitting}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Submitting...
                            </>
                        ) : (
                            'Confirm Pass'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
