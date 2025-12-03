import { useEffect, useRef, useCallback } from 'react';
import { extractImageUrls } from '@/lib/tiptap';
import { removeAttachment } from '@/app/actions/removeAttachment';
import { toast } from '@/components/ui/useToast';
import type { JSONContent } from '@tiptap/core';

export function useAutoDeleteWithReset(
    currentEditorContent: JSONContent | null | undefined,
    initialRunContent: JSONContent | null | undefined,
    runId: string | null,
    attachments: any[],
    setAttachments: (cb: (prev: any[]) => any[]) => void
) {
    // Stores the list of images currently known to be in the editor
    const prevImagesRef = useRef<string[]>([]);

    // Track the run ID to detect switches
    const lastRunIdRef = useRef<string | null>(null);

    const handleRemoveAttachment = useCallback(async (attachmentId: string, filename: string) => {
        try {
            await removeAttachment(attachmentId);
            setAttachments((prev: any[]) => prev.filter((a: any) => a.id !== attachmentId));
            toast({ title: "Attachment removed", description: filename });
        } catch (error: any) {
            toast({ title: "Failed to remove attachment", description: error.message, variant: "destructive" });
        }
    }, [setAttachments]);

    // Effect 1: Handle Run Switching (Reset Logic)
    // This MUST run when runId changes to reset the baseline.
    useEffect(() => {
        if (runId !== lastRunIdRef.current) {
            lastRunIdRef.current = runId;
            // When switching runs, we reset our baseline to the NEW run's content
            // We ignore 'currentEditorContent' here because it might still be stale (from previous run)
            // during the render cycle. We use 'initialRunContent' which comes directly from the DB object.
            prevImagesRef.current = initialRunContent ? extractImageUrls(initialRunContent) : [];
        }
    }, [runId, initialRunContent]);

    // Effect 2: Handle Content Changes (Deletion Logic)
    useEffect(() => {
        // If the run IDs don't match, we are mid-switch. DO NOT process deletions.
        if (runId !== lastRunIdRef.current) return;

        // If content is null/undefined, we assume it's loading or empty, do not delete
        if (!currentEditorContent) return;

        const currentImages = extractImageUrls(currentEditorContent);
        const prevImages = prevImagesRef.current;

        // Find images that were present but are now missing
        const deletedImages = prevImages.filter(url => !currentImages.includes(url));

        if (deletedImages.length > 0) {
            deletedImages.forEach(url => {
                const attachment = attachments.find((a: any) => {
                    return url.includes(a.filename) || a.url === url;
                });

                if (attachment) {
                    handleRemoveAttachment(attachment.id, attachment.filename);
                }
            });
        }

        // Update baseline
        prevImagesRef.current = currentImages;
    }, [currentEditorContent, runId, attachments, handleRemoveAttachment]);
}
