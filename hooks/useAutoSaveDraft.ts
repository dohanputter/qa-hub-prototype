'use client';

import { useEffect, useRef } from 'react';
import { saveDraftHistory } from '@/app/actions/draftHistory';
import { toast } from '@/components/ui/useToast';
import type { JSONContent } from '@tiptap/core';

const AUTO_SAVE_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

interface UseAutoSaveDraftOptions {
    qaRunId: string | null;
    testCasesContent: JSONContent | null;
    issuesFoundContent: JSONContent | null;
    enabled?: boolean;
}

/**
 * Custom hook that automatically saves draft history every 5 minutes
 */
export function useAutoSaveDraft({
    qaRunId,
    testCasesContent,
    issuesFoundContent,
    enabled = true,
}: UseAutoSaveDraftOptions) {
    const lastSaveRef = useRef<string>('');
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isSavingRef = useRef(false);

    const saveDraft = async () => {
        if (!qaRunId || !enabled || isSavingRef.current) return;

        // Create a hash of the current content to avoid saving duplicates
        const currentContentHash = JSON.stringify({
            test: testCasesContent,
            issues: issuesFoundContent,
        });

        // Don't save if content hasn't changed
        if (currentContentHash === lastSaveRef.current) {
            return;
        }

        // Don't save if both fields are empty
        const hasContent =
            (testCasesContent && JSON.stringify(testCasesContent).length > 50) ||
            (issuesFoundContent && JSON.stringify(issuesFoundContent).length > 50);

        if (!hasContent) {
            return;
        }

        isSavingRef.current = true;
        try {
            await saveDraftHistory({
                qaRunId,
                testCasesContent: testCasesContent || undefined,
                issuesFoundContent: issuesFoundContent || undefined,
                saveType: 'auto',
            });

            lastSaveRef.current = currentContentHash;

            // Show subtle toast notification
            toast({
                title: 'Draft auto-saved',
                description: 'Your work has been saved',
                duration: 2000,
            });
        } catch (error: any) {
            console.error('Auto-save failed:', error);
            // Don't show error toast for auto-save failures to avoid annoying the user
        } finally {
            isSavingRef.current = false;
        }
    };

    useEffect(() => {
        if (!enabled || !qaRunId) {
            // Clear any existing timeout
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            return;
        }

        // Set up auto-save interval
        const startAutoSave = () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                saveDraft();
                startAutoSave(); // Schedule next save
            }, AUTO_SAVE_INTERVAL);
        };

        startAutoSave();

        // Cleanup on unmount or when dependencies change
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [qaRunId, testCasesContent, issuesFoundContent, enabled]);

    // Manual save function that can be called externally
    const saveNow = async () => {
        if (!qaRunId) return;

        try {
            await saveDraftHistory({
                qaRunId,
                testCasesContent: testCasesContent || undefined,
                issuesFoundContent: issuesFoundContent || undefined,
                saveType: 'manual',
            });

            toast({
                title: 'Draft saved',
                description: 'Your work has been saved to history',
            });
        } catch (error: any) {
            toast({
                title: 'Save failed',
                description: error.message,
                variant: 'destructive',
            });
        }
    };

    return { saveNow };
}
