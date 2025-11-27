'use client';

import { useState, useEffect } from 'react';
import { TiptapEditor } from './TiptapEditor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { getOrCreateQARun, submitQARun } from '@/app/actions/qa';
import { uploadAttachment } from '@/app/actions/uploadAttachment';
import { getSnippetsAction } from '@/app/actions/snippets';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Paperclip, CheckCircle, XCircle, ExternalLink, Save, History, PlayCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function QADetail({ issue, qaIssue, runs = [], allAttachments = [], members, projectId, issueIid }: any) {
    const activeRun = runs.find((r: any) => r.status === 'pending');
    const [viewMode, setViewMode] = useState(activeRun ? 'active' : 'history');

    // Editor state
    const [testCases, setTestCases] = useState(activeRun?.testCasesContent || null);
    const [issuesFound, setIssuesFound] = useState(activeRun?.issuesFoundContent || null);
    const [attachments, setAttachments] = useState(allAttachments.filter((a: any) => a.qaRunId === activeRun?.id) || []);

    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [snippets, setSnippets] = useState<any[]>([]);

    // Track run ID
    const [runId, setRunId] = useState(activeRun?.id || null);

    useEffect(() => {
        getSnippetsAction().then(setSnippets).catch(err => console.error("Failed to load snippets", err));
    }, []);

    // Ensure state syncs if active run changes (e.g. created by saving)
    useEffect(() => {
        if (activeRun) {
            if (!testCases) setTestCases(activeRun.testCasesContent);
            if (!issuesFound) setIssuesFound(activeRun.issuesFoundContent);
            if (activeRun.id !== runId) {
                setRunId(activeRun.id);
                setAttachments(allAttachments.filter((a: any) => a.qaRunId === activeRun.id));
            }
        }
    }, [activeRun]);

    const handleSave = async (silent = false) => {
        setSaving(true);
        try {
            const result = await getOrCreateQARun({
                projectId,
                issueIid: issue.iid,
                testCasesContent: testCases,
                issuesFoundContent: issuesFound
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

    const handleSubmit = async (result: 'passed' | 'failed') => {
        setSubmitting(true);
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
                    testCasesContent: testCases,
                    issuesFoundContent: issuesFound
                });
            }

            const res = await submitQARun(currentRunId, result);
            if (res.success) {
                toast({
                    title: result === 'passed' ? "QA Passed" : "QA Failed",
                    description: "Result submitted to GitLab",
                });
            }
        } catch (error: any) {
            toast({ title: "Error submitting", description: error.message, variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
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

    const handleImagePaste = async (file: File) => {
        let targetRunId = runId;
        if (!targetRunId) {
            const run = await handleSave(true);
            if (run) targetRunId = run.id;
            else throw new Error('Failed to create QA run');
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', projectId.toString());
        formData.append('qaRecordId', targetRunId);

        const result = await uploadAttachment(formData);
        setAttachments([...attachments, result]);
        return result;
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
        } catch (error) {
            toast({ title: "Error", description: "Failed to start new run", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const testCaseSnippets = snippets.filter(s => s.type === 'test_case');
    const issueSnippets = snippets.filter(s => s.type === 'issue');

    return (
        <div className="flex h-screen overflow-hidden bg-white">
            {/* Left Panel: GitLab Info */}
            <div className="w-1/3 border-r bg-gray-50 flex flex-col overflow-y-auto">
                <div className="p-6 space-y-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm text-muted-foreground font-mono">#{issue.iid}</span>
                            <Badge variant={issue.state === 'opened' ? 'default' : 'secondary'}>{issue.state}</Badge>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 leading-tight">{issue.title}</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                                <AvatarImage src={issue.author.avatar_url} />
                                <AvatarFallback>{issue.author.name[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-muted-foreground">Created by {issue.author.name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{formatDistanceToNow(new Date(issue.created_at))} ago</span>
                    </div>

                    <Separator />

                    <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: issue.description_html || issue.description }} />

                    <div className="flex flex-wrap gap-2">
                        {issue.labels.map((l: string) => <Badge key={l} variant="outline" className="bg-white">{l}</Badge>)}
                    </div>

                    <div className="pt-4">
                        <Link href={issue.web_url} target="_blank" className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
                            View in GitLab <ExternalLink className="h-3 w-3" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Right Panel: QA Work */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
                <div className="flex items-center justify-between px-6 py-4 border-b bg-white z-10">
                    <div className="flex items-center gap-4">
                        <h2 className="font-semibold text-lg">QA Testing</h2>
                        {runs.length > 0 && (
                            <div className="flex gap-1">
                                {runs.map((r: any) => (
                                    <div key={r.id}
                                        className={cn(
                                            "w-2 h-2 rounded-full",
                                            r.status === 'passed' ? "bg-green-500" :
                                            r.status === 'failed' ? "bg-red-500" : "bg-blue-500 animate-pulse"
                                        )}
                                        title={`Run #${r.runNumber}: ${r.status}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {activeRun ? (
                            <>
                                <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                    Save Draft
                                </Button>
                                <Button variant="destructive" onClick={() => handleSubmit('failed')} disabled={submitting}>
                                    <XCircle className="h-4 w-4 mr-2" /> Fail
                                </Button>
                                <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleSubmit('passed')} disabled={submitting}>
                                    <CheckCircle className="h-4 w-4 mr-2" /> Pass
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
                    <div className="px-6 border-b bg-gray-50/50">
                        <TabsList>
                            <TabsTrigger value="active" disabled={!activeRun}>Active Run {activeRun && `#${activeRun.runNumber}`}</TabsTrigger>
                            <TabsTrigger value="history">History ({runs.length})</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="active" className="flex-1 overflow-y-auto p-6 space-y-8 mt-0 data-[state=inactive]:hidden">
                         <div className="space-y-2">
                            <h3 className="font-medium text-gray-900">Test Cases Executed</h3>
                            <TiptapEditor
                                content={testCases}
                                onChange={setTestCases}
                                members={members}
                                placeholder="List test cases..."
                                snippets={testCaseSnippets}
                                onImagePaste={handleImagePaste}
                            />
                        </div>

                        <div className="space-y-2">
                            <h3 className="font-medium text-red-600">Issues Found</h3>
                            <TiptapEditor
                                content={issuesFound}
                                onChange={setIssuesFound}
                                members={members}
                                placeholder="Describe any issues found..."
                                snippets={issueSnippets}
                                onImagePaste={handleImagePaste}
                            />
                        </div>

                        <div className="space-y-2">
                            <h3 className="font-medium text-gray-900">Attachments</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {attachments.map((att: any) => (
                                    <div key={att.id} className="flex items-center gap-2 p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                                        <Paperclip className="h-4 w-4 text-gray-400" />
                                        <a href={att.url} target="_blank" className="text-sm text-indigo-600 hover:underline truncate flex-1">{att.filename}</a>
                                    </div>
                                ))}
                                <label className="flex items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-all">
                                    <input type="file" className="hidden" onChange={handleFileUpload} />
                                    <div className="text-center">
                                        <span className="text-sm font-medium text-indigo-600">Click to upload</span>
                                        <p className="text-xs text-muted-foreground mt-1">or drag and drop</p>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="history" className="flex-1 overflow-y-auto p-6 mt-0 data-[state=inactive]:hidden">
                         {runs.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p>No QA runs recorded yet.</p>
                            </div>
                         ) : (
                             <div className="space-y-6">
                                {runs.map((run: any) => (
                                    <div key={run.id} className="border rounded-lg overflow-hidden bg-white shadow-sm">
                                        <div className={cn(
                                            "px-4 py-3 flex items-center justify-between border-b",
                                            run.status === 'passed' ? "bg-green-50/50" :
                                            run.status === 'failed' ? "bg-red-50/50" : "bg-blue-50/50"
                                        )}>
                                            <div className="flex items-center gap-3">
                                                <Badge variant={
                                                    run.status === 'passed' ? 'default' :
                                                    run.status === 'failed' ? 'destructive' : 'secondary'
                                                } className={cn(
                                                     run.status === 'passed' && "bg-green-600 hover:bg-green-700",
                                                     run.status === 'pending' && "bg-blue-500 hover:bg-blue-600"
                                                )}>
                                                    {run.status.toUpperCase()}
                                                </Badge>
                                                <span className="font-semibold">Run #{run.runNumber}</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {run.completedAt ? formatDistanceToNow(new Date(run.completedAt)) + ' ago' : 'In Progress'}
                                            </div>
                                        </div>
                                        <div className="p-4 space-y-4 opacity-80 pointer-events-none">
                                            {/* Read only view of content (simplified) */}
                                             {run.issuesFoundContent && (
                                                <div>
                                                    <h4 className="text-xs font-semibold uppercase text-red-600 mb-2">Issues Found</h4>
                                                    <div className="text-sm border-l-2 border-red-200 pl-3">
                                                        <TiptapEditor content={run.issuesFoundContent} onChange={() => {}} readOnly={true} />
                                                    </div>
                                                </div>
                                            )}
                                            {run.testCasesContent && (
                                                <div>
                                                    <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">Test Cases</h4>
                                                    <div className="text-sm border-l-2 border-gray-200 pl-3">
                                                        <TiptapEditor content={run.testCasesContent} onChange={() => {}} readOnly={true} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                             </div>
                         )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
