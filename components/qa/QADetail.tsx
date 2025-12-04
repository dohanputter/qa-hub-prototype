'use client';

// Refined Issue Detail Page
import { useState, useEffect, useCallback, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TiptapEditor } from './TiptapEditor';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { getOrCreateQARun, submitQARun, updateQARunContent } from '@/app/actions/qa';
import { uploadAttachment } from '@/app/actions/uploadAttachment';
import { removeAttachment } from '@/app/actions/removeAttachment';
import { getSnippetsAction } from '@/app/actions/snippets';
import { toast } from '@/components/ui/useToast';
import { Loader2, Save, PlayCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { useDescriptionProcessor } from './hooks/useDescriptionProcessor';
import { useAutoDeleteWithReset } from './hooks/useAutoDelete';
import { useImageUpload } from '@/hooks/useImageUpload';
import { QAHeader } from './QAHeader';
import { QAHistory } from './QAHistory';
import { QAAttachments } from './QAAttachments';
import type { QADetailProps, Snippet, Attachment } from '@/types/qa';

export function QADetail({ issue, qaIssue, runs = [], allAttachments = [], members, projectId, issueIid, labels: projectLabels }: QADetailProps) {
    const router = useRouter();
    const activeRun = runs.find(r => r.status === 'pending');
    const [viewMode, setViewMode] = useState(activeRun ? 'active' : 'history');

    // Use Custom Hook for Description
    const processedDescription = useDescriptionProcessor(
        issue.description_html,
        issue.description,
        issue.web_url
    );

    // Filter out QA labels from display and selection
    const [issueLabels, setIssueLabels] = useState<string[]>((issue.labels || []).filter((l: string) => !l.startsWith('qa::')));
    const [isUpdatingLabels, setIsUpdatingLabels] = useState(false);

    // Editor state
    const [testCases, setTestCases] = useState(activeRun?.testCasesContent || null);
    const [issuesFound, setIssuesFound] = useState(activeRun?.issuesFoundContent || null);

    // Attachments state
    const [attachments, setAttachments] = useState<Attachment[]>(allAttachments.filter(a => a.qaRunId === activeRun?.id) || []);

    const [saving, setSaving] = useState(false);
    const [autoSaving, setAutoSaving] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [snippets, setSnippets] = useState<Snippet[]>([]);

    // Track run ID
    const [runId, setRunId] = useState(activeRun?.id || null);

    // Track last saved content to avoid unnecessary saves
    const lastSavedRef = useRef({
        testCases: activeRun?.testCasesContent,
        issuesFound: activeRun?.issuesFoundContent
    });

    useEffect(() => {
        getSnippetsAction().then(setSnippets).catch(err => logger.error("Failed to load snippets", err));
    }, []);

    // Use Auto Delete Hook with Reset Logic
    // We pass activeRun content explicitly to ensure the baseline is reset correctly on run switch
    useAutoDeleteWithReset(testCases, activeRun?.testCasesContent, runId, attachments, setAttachments);
    useAutoDeleteWithReset(issuesFound, activeRun?.issuesFoundContent, runId, attachments, setAttachments);

    const [hasTyped, setHasTyped] = useState(false);

    // Continuous Auto-Save Effect
    useEffect(() => {
        const timer = setTimeout(async () => {
            const currentTestCasesStr = JSON.stringify(testCases);
            const currentIssuesFoundStr = JSON.stringify(issuesFound);
            const lastSavedTestCasesStr = JSON.stringify(lastSavedRef.current.testCases);
            const lastSavedIssuesFoundStr = JSON.stringify(lastSavedRef.current.issuesFound);

            // Only save if content has changed
            if (currentTestCasesStr !== lastSavedTestCasesStr || currentIssuesFoundStr !== lastSavedIssuesFoundStr) {
                // Only auto-save if we have an active run
                if (!runId) return;

                setHasTyped(true);
                setAutoSaving(true);
                try {
                    await updateQARunContent(runId, testCases, issuesFound);
                    lastSavedRef.current = { testCases, issuesFound };
                } catch (e) {
                    console.error("Auto-save failed", e);
                } finally {
                    setAutoSaving(false);
                }
            }
        }, 2000); // Debounce for 2 seconds

        return () => clearTimeout(timer);
    }, [testCases, issuesFound, runId, projectId, issueIid]);

    const handleRemoveAttachment = useCallback(async (attachmentId: string, filename: string) => {
        try {
            await removeAttachment(attachmentId);
            setAttachments(prev => prev.filter(a => a.id !== attachmentId));
            toast({ title: "Attachment removed", description: filename });
        } catch (error: any) {
            toast({ title: "Failed to remove attachment", description: error.message, variant: "destructive" });
        }
    }, []);

    // Ensure state syncs when active run changes
    useEffect(() => {
        if (activeRun) {
            setTestCases(activeRun.testCasesContent || null);
            setIssuesFound(activeRun.issuesFoundContent || null);
            setRunId(activeRun.id);
            setAttachments(allAttachments.filter(a => a.qaRunId === activeRun.id));
            setViewMode('active');
        } else {
            setRunId(null);
            setTestCases(null);
            setIssuesFound(null);
            setAttachments([]);
            setViewMode('history');
        }
    }, [activeRun, allAttachments]);

    const handleSave = async (silent = false) => {
        setSaving(true);
        try {
            const result = await getOrCreateQARun({
                projectId,
                issueIid: issue.iid,
                testCasesContent: testCases || undefined,
                issuesFoundContent: issuesFound || undefined
            });

            setRunId(result.run.id);
            if (!silent) toast({ title: "Saved", description: `Run #${result.run.runNumber} saved` });
            return result.run;
        } catch (error) {
            toast({ title: "Error saving", description: "Failed to save draft", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = (result: 'passed' | 'failed') => {
        startTransition(async () => {
            try {
                // Save first
                let currentRunId = runId;
                if (!currentRunId) {
                    const run = await handleSave(true);
                    if (!run) return;
                    currentRunId = run.id;
                } else {
                    // Ensure content is saved
                    await getOrCreateQARun({
                        projectId,
                        issueIid: issue.iid,
                        testCasesContent: testCases || undefined,
                        issuesFoundContent: issuesFound || undefined
                    });
                }

                const res = await submitQARun(projectId, currentRunId, result);
                if (res.success) {
                    toast({
                        title: result === 'passed' ? "QA Passed" : "QA Failed",
                        description: "Result submitted to GitLab",
                    });
                    // Refresh to show updated state
                    router.refresh();
                }
            } catch (error: any) {
                toast({ title: "Error submitting", description: error.message, variant: "destructive" });
            }
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', projectId.toString());

        // Ensure we have a run ID
        let targetRunId = runId;
        if (!targetRunId) {
            const run = await handleSave(true);
            if (run) targetRunId = run.id;
        }

        if (targetRunId) formData.append('qaRecordId', targetRunId);

        try {
            const result = await uploadAttachment(formData);
            setAttachments([...attachments, result]);
            toast({ title: "File uploaded", description: file.name });
        } catch (error: any) {
            toast({ title: "Upload failed", description: error.message, variant: "destructive" });
        }
    };

    const { handleImagePaste: uploadImage } = useImageUpload(projectId);

    const handleImagePaste = async (file: File) => {
        let targetRunId = runId;
        if (!targetRunId) {
            const run = await handleSave(true);
            if (run) targetRunId = run.id;
            else throw new Error('Failed to create QA run');
        }

        try {
            const result = await uploadImage(file);
            setAttachments([...attachments, result]);
            return result;
        } catch (error: any) {
            toast({ title: "Upload failed", description: error.message, variant: "destructive" });
            throw error;
        }
    };

    const handleStartNewRun = async () => {
        setSaving(true);
        try {
            const result = await getOrCreateQARun({
                projectId,
                issueIid: issue.iid,
                forceNewRun: true
            });
            setRunId(result.run.id);
            setTestCases(null);
            setIssuesFound(null);
            setAttachments([]);
            setViewMode('active');
            toast({ title: "New Run Started", description: `Run #${result.run.runNumber} created` });
            // Refresh to show updated state with active run
            router.refresh();
        } catch (error) {
            toast({ title: "Error", description: "Failed to start new run", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleLabelToggle = async (labelName: string) => {
        setIsUpdatingLabels(true);
        try {
            const isCurrentlySelected = issueLabels.includes(labelName);
            const { updateLabelsAction } = await import('@/app/actions/labels');

            if (isCurrentlySelected) {
                await updateLabelsAction(projectId, issueIid, { removeLabels: [labelName] });
                setIssueLabels(prev => prev.filter(l => l !== labelName));
                toast({ title: "Label removed", description: `Removed ${labelName}` });
            } else {
                await updateLabelsAction(projectId, issueIid, { addLabels: [labelName] });
                setIssueLabels(prev => [...prev, labelName]);
                toast({ title: "Label added", description: `Added ${labelName}` });
            }
            router.refresh();
        } catch (error: any) {
            toast({ title: "Error updating labels", description: error.message, variant: "destructive" });
        } finally {
            setIsUpdatingLabels(false);
        }
    };

    const handleRemoveLabel = async (labelName: string) => {
        setIsUpdatingLabels(true);
        try {
            const { updateLabelsAction } = await import('@/app/actions/labels');
            await updateLabelsAction(projectId, issueIid, { removeLabels: [labelName] });
            setIssueLabels(prev => prev.filter(l => l !== labelName));
            toast({ title: "Label removed", description: `Removed ${labelName}` });
            router.refresh();
        } catch (error: any) {
            toast({ title: "Error removing label", description: error.message, variant: "destructive" });
        } finally {
            setIsUpdatingLabels(false);
        }
    };

    const testCaseSnippets = snippets.filter(s => s.type === 'test_case');
    const issueSnippets = snippets.filter(s => s.type === 'issue');

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* Left Panel: GitLab Info (QAHeader) */}
            <QAHeader
                issue={issue}
                processedDescription={processedDescription}
                issueLabels={issueLabels}
                projectLabels={projectLabels}
                isUpdatingLabels={isUpdatingLabels}
                onLabelToggle={handleLabelToggle}
                onLabelRemove={handleRemoveLabel}
                leakageSource={qaIssue?.leakageSource}
                cumulativeTimeMs={qaIssue?.cumulativeTimeMs}
                activeRun={activeRun}
            />

            {/* Right Panel: QA Work */}
            <div className="flex-1 flex flex-col overflow-hidden bg-background relative">
                {/* Header Actions */}
                <div className="flex items-center justify-between px-8 py-6 shrink-0">
                    <div className="flex items-center gap-4">
                        <h2 className="font-semibold text-xl tracking-tight">QA Testing</h2>
                        {runs.length > 0 && (
                            <div className="flex -space-x-1 ml-2">
                                {runs.slice(0, 5).map(r => (
                                    <div key={r.id}
                                        className={cn(
                                            "w-2.5 h-2.5 rounded-full ring-2 ring-background",
                                            r.status === 'passed' ? "bg-emerald-500" :
                                                r.status === 'failed' ? "bg-red-500" : "bg-blue-500"
                                        )}
                                        title={`Run #${r.runNumber}: ${r.status}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={async () => {
                            const { startExploratorySession } = await import('@/app/actions/exploratorySessions');
                            try {
                                const result = await startExploratorySession({
                                    projectId,
                                    charter: `Testing Issue #${issue.iid}: ${issue.title}`,
                                    environment: { url: issue.web_url }
                                });
                                if (result.success && result.sessionId) {
                                    router.push(`/sessions/${result.sessionId}/workspace`);
                                }
                            } catch (e) {
                                toast({ title: "Failed to start session", variant: "destructive" });
                            }
                        }}>
                            <PlayCircle className="h-4 w-4 mr-2" /> Start Session
                        </Button>

                        {activeRun ? (
                            <>
                                {hasTyped || autoSaving ? (
                                    <div className="flex items-center text-xs text-muted-foreground mr-2 transition-opacity duration-300">
                                        {autoSaving ? (
                                            <span className="flex items-center">
                                                <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                                                Saving...
                                            </span>
                                        ) : (
                                            <span className="flex items-center opacity-70">
                                                <CheckCircle2 className="h-3 w-3 mr-1.5 text-emerald-500" />
                                                Saved
                                            </span>
                                        )}
                                    </div>
                                ) : null}

                                <div className="h-6 w-px bg-border/60 mx-1" />
                                <Button variant="destructive" size="sm" onClick={() => handleSubmit('failed')} disabled={isPending} className="shadow-none">
                                    {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Fail
                                </Button>
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-none" onClick={() => handleSubmit('passed')} disabled={isPending}>
                                    {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Pass
                                </Button>
                            </>
                        ) : (
                            <Button onClick={handleStartNewRun} disabled={saving}>
                                <PlayCircle className="h-4 w-4 mr-2" /> Start New Run
                            </Button>
                        )}
                    </div>
                </div>

                <Tabs value={viewMode} onValueChange={setViewMode} className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-8 border-b border-border/40 shrink-0">
                        <TabsList className="bg-transparent p-0 h-auto gap-8 w-full justify-start rounded-none">
                            <TabsTrigger
                                value="active"
                                disabled={!activeRun}
                                className="data-[state=active]:text-primary data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-0 py-3 transition-colors hover:text-foreground/80 disabled:opacity-50"
                            >
                                Current Run
                            </TabsTrigger>
                            <TabsTrigger
                                value="history"
                                className="data-[state=active]:text-primary data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-0 py-3 transition-colors hover:text-foreground/80"
                            >
                                History
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="active" className="flex-1 overflow-y-auto p-8 space-y-8 outline-none">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-base font-medium">Test Cases</Label>
                            </div>
                            <TiptapEditor
                                content={testCases}
                                onChange={setTestCases}
                                members={members.map(m => ({ ...m, avatar_url: m.avatar_url || '' }))}
                                placeholder="List test cases..."
                                snippets={testCaseSnippets}
                                onImagePaste={handleImagePaste}
                                className="border-border/40 shadow-none bg-muted/20 focus-within:ring-1 focus-within:ring-primary/20 text-sm"
                            />
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-base font-medium">Issues Found</Label>
                            </div>
                            <TiptapEditor
                                content={issuesFound}
                                onChange={setIssuesFound}
                                members={members.map(m => ({ ...m, avatar_url: m.avatar_url || '' }))}
                                placeholder="Describe any issues found..."
                                snippets={issueSnippets}
                                onImagePaste={handleImagePaste}
                                className="border-border/40 shadow-none bg-muted/20 focus-within:ring-1 focus-within:ring-primary/20 text-sm"
                            />
                        </div>

                        <QAAttachments
                            attachments={attachments}
                            onRemove={handleRemoveAttachment}
                            onUpload={handleFileUpload}
                        />
                    </TabsContent>

                    <TabsContent value="history" className="flex-1 overflow-y-auto p-8 outline-none">
                        <QAHistory runs={runs.filter(r => r.status !== 'pending')} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
