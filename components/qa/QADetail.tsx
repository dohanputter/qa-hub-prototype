'use client';

import { useState } from 'react';
import { TiptapEditor } from './TiptapEditor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { createOrUpdateQARecord, submitQAResult } from '@/app/actions/qaRecords';
import { uploadAttachment } from '@/app/actions/uploadAttachment';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Paperclip, CheckCircle, XCircle, ExternalLink, Save } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export function QADetail({ issue, qaRecord, members, projectId }: any) {
    const [testCases, setTestCases] = useState(qaRecord?.testCasesContent || null);
    const [issuesFound, setIssuesFound] = useState(qaRecord?.issuesFoundContent || null);
    const [attachments, setAttachments] = useState(qaRecord?.attachments || []);
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // If we have a record ID, we use it for uploads immediately. If not, we wait until save.
    const [recordId, setRecordId] = useState(qaRecord?.id || null);

    const handleSave = async (silent = false) => {
        setSaving(true);
        try {
            const result = await createOrUpdateQARecord({
                projectId,
                issueIid: issue.iid,
                testCasesContent: testCases,
                issuesFoundContent: issuesFound
            });
            setRecordId(result.id);
            if (!silent) toast({ title: "Saved", description: "Draft saved successfully" });
            return result;
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
            const record = await handleSave(true);
            if (!record) return;

            const res = await submitQAResult(record.id, result);
            if (res.success) {
                toast({
                    title: result === 'passed' ? "QA Passed" : "QA Failed",
                    description: "Result submitted to GitLab",
                    // variant: result === 'passed' ? "success" : "destructive" // success variant not in default toast
                });
                if (res.shareUrl) {
                    // Could show a dialog with share URL
                }
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

        // If we don't have a record ID yet, we must create one first to link attachment?
        // Or we can upload to GitLab first, and link later?
        // The backend `uploadAttachment` takes optional `qaRecordId`.
        // If null, it's an orphan attachment until linked?
        // But `attachments` table has `qaRecordId` foreign key (nullable?).
        // Schema says: `qaRecordId: text('qa_record_id').references(...)`. It is nullable?
        // Let's check schema. `qaRecordId: text('qa_record_id').references(...)`. It's nullable by default in Drizzle if not `notNull()`.
        // I didn't put `notNull()`.

        if (recordId) formData.append('qaRecordId', recordId);

        try {
            const result = await uploadAttachment(formData);
            setAttachments([...attachments, result]);
            toast({ title: "File uploaded", description: file.name });
        } catch (error: any) {
            toast({ title: "Upload failed", description: error.message, variant: "destructive" });
        }
    };

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

                    {/* Labels */}
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
                    <h2 className="font-semibold text-lg">QA Testing</h2>
                    <div className="flex items-center gap-2">
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
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    <div className="space-y-2">
                        <h3 className="font-medium text-gray-900">Test Cases Executed</h3>
                        <TiptapEditor content={testCases} onChange={setTestCases} members={members} placeholder="List test cases..." />
                    </div>

                    <div className="space-y-2">
                        <h3 className="font-medium text-red-600">Issues Found</h3>
                        <TiptapEditor content={issuesFound} onChange={setIssuesFound} members={members} placeholder="Describe any issues found..." />
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
                </div>
            </div>
        </div>
    );
}
