'use client';

// Refined Issue Detail Page
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TiptapEditor } from './TiptapEditor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getOrCreateQARun, submitQARun } from '@/app/actions/qa';
import { uploadAttachment } from '@/app/actions/uploadAttachment';
import { removeAttachment } from '@/app/actions/removeAttachment';
import { getSnippetsAction } from '@/app/actions/snippets';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Paperclip, ExternalLink, Save, PlayCircle, Plus, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { marked } from 'marked';
import { extractImageUrls } from '@/lib/tiptap';
import { useRef } from 'react';

export function QADetail({ issue, qaIssue, runs = [], allAttachments = [], members, projectId, issueIid, labels: projectLabels }: any) {
    const router = useRouter();
    const activeRun = runs.find((r: any) => r.status === 'pending');
    const [viewMode, setViewMode] = useState(activeRun ? 'active' : 'history');

    // Process description HTML to fix image URLs (client-side only)
    const [processedDescription, setProcessedDescription] = useState<string>('');

    useEffect(() => {
        // Only process on client side where DOMParser is available
        if (typeof window === 'undefined') {
            setProcessedDescription(issue.description_html || issue.description || '');
            return;
        }

        let rawContent = issue.description_html || issue.description || '';

        // If we don't have HTML but have description (e.g. mock mode), convert markdown to HTML
        if (!issue.description_html && issue.description) {
            try {
                rawContent = marked.parse(issue.description) as string;
            } catch (e) {
                console.error('Failed to parse markdown:', e);
                rawContent = issue.description;
            }
        }

        if (!rawContent) {
            setProcessedDescription('');
            return;
        }

        // Get GitLab base URL from the issue's web_url or default
        const gitlabBaseUrl = issue.web_url
            ? new URL(issue.web_url).origin
            : 'https://gitlab.com';

        // Process markdown images first (both in description and description_html)
        // Convert markdown image syntax to HTML img tags
        rawContent = rawContent.replace(
            /!\[([^\]]*)\]\(([^)]+)\)/g,
            (match: string, alt: string, url: string) => {
                let absoluteUrl = url.trim();

                // Convert relative URLs to absolute
                if (absoluteUrl.startsWith('/')) {
                    absoluteUrl = `${gitlabBaseUrl}${absoluteUrl}`;
                } else if (!absoluteUrl.startsWith('http')) {
                    absoluteUrl = `${gitlabBaseUrl}/${absoluteUrl}`;
                }

                // Use proxy for GitLab images
                const isGitLabImage = absoluteUrl.includes('gitlab.com') ||
                    absoluteUrl.includes('gitlab') ||
                    absoluteUrl.includes('/uploads/');
                const finalUrl = isGitLabImage
                    ? `/api/images/proxy?url=${encodeURIComponent(absoluteUrl)}`
                    : absoluteUrl;

                return `<img src="${finalUrl}" alt="${alt || 'Issue image'}" style="max-width: 100%; height: auto; display: block; margin: 1rem 0;" loading="lazy" />`;
            }
        );

        // Create a temporary DOM element to parse and modify the HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawContent, 'text/html');

        // Fix all image sources - handle both img tags and data-src attributes
        const images = doc.querySelectorAll('img, [data-src], [data-canonical-src]');
        images.forEach((element) => {
            const img = element as HTMLImageElement;
            // Check multiple possible src attributes (GitLab uses various formats)
            let src = img.getAttribute('src') ||
                img.getAttribute('data-src') ||
                img.getAttribute('data-canonical-src') ||
                img.getAttribute('data-original');

            if (!src) {
                // Also check for background-image in style attribute
                const style = img.getAttribute('style') || '';
                const bgMatch = style.match(/url\(['"]?([^'"]+)['"]?\)/);
                if (bgMatch) {
                    src = bgMatch[1];
                }
            }

            if (src) {
                let absoluteUrl = src;

                // Skip if already processed (has proxy URL) or is a data URL
                if (src.startsWith('/api/images/proxy') || src.startsWith('data:')) {
                    return;
                }

                // Convert relative URLs to absolute
                if (src.startsWith('/')) {
                    absoluteUrl = `${gitlabBaseUrl}${src}`;
                } else if (!src.startsWith('http')) {
                    absoluteUrl = `${gitlabBaseUrl}/${src}`;
                }

                // Use proxy for GitLab images to avoid CORS issues
                const isGitLabImage = absoluteUrl.includes('gitlab.com') ||
                    absoluteUrl.includes('gitlab') ||
                    absoluteUrl.includes('/uploads/') ||
                    absoluteUrl.includes('/-/project/');
                const finalUrl = isGitLabImage
                    ? `/api/images/proxy?url=${encodeURIComponent(absoluteUrl)}`
                    : absoluteUrl;

                // Set src attribute
                if (img.tagName === 'IMG') {
                    img.setAttribute('src', finalUrl);
                    // Remove other src attributes to avoid conflicts
                    img.removeAttribute('data-src');
                    img.removeAttribute('data-canonical-src');
                } else {
                    // For other elements with data-src, convert to img tag
                    const newImg = document.createElement('img');
                    newImg.setAttribute('src', finalUrl);
                    newImg.setAttribute('loading', 'lazy');
                    newImg.setAttribute('alt', img.getAttribute('alt') || 'Issue image');
                    newImg.style.cssText = 'max-width: 100%; height: auto; display: block; margin: 1rem 0;';
                    img.parentNode?.replaceChild(newImg, img);
                    return;
                }

                // Add loading attribute for better performance
                img.setAttribute('loading', 'lazy');

                // Add alt text if missing
                if (!img.getAttribute('alt')) {
                    img.setAttribute('alt', 'Issue image');
                }

                // Ensure images are styled properly
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                img.style.display = 'block';
                img.style.margin = '1rem 0';

                // Add error handler to log failed images
                img.onerror = () => {
                    console.warn('Failed to load image:', finalUrl);
                };
            }
        });

        // Fix all anchor links that might be relative
        const links = doc.querySelectorAll('a');
        links.forEach((link) => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('/') && !href.startsWith('//')) {
                link.setAttribute('href', `${gitlabBaseUrl}${href}`);
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
            }
        });

        setProcessedDescription(doc.body.innerHTML);
    }, [issue.description_html, issue.description, issue.web_url]);

    // Filter out QA labels from display and selection
    const [issueLabels, setIssueLabels] = useState<string[]>((issue.labels || []).filter((l: string) => !l.startsWith('qa::')));
    const filteredProjectLabels = projectLabels?.filter((l: any) => !l.name.startsWith('qa::')) || [];

    const [isUpdatingLabels, setIsUpdatingLabels] = useState(false);

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

    // Track previous image URLs to detect deletions
    const prevTestCasesImages = useRef<string[]>([]);
    const prevIssuesFoundImages = useRef<string[]>([]);

    // Initialize refs when active run changes
    useEffect(() => {
        if (activeRun) {
            prevTestCasesImages.current = extractImageUrls(activeRun.testCasesContent);
            prevIssuesFoundImages.current = extractImageUrls(activeRun.issuesFoundContent);
        } else {
            prevTestCasesImages.current = [];
            prevIssuesFoundImages.current = [];
        }
    }, [activeRun]);

    const handleRemoveAttachment = useCallback(async (attachmentId: string, filename: string) => {
        try {
            await removeAttachment(attachmentId);
            setAttachments((prev: any[]) => prev.filter((a: any) => a.id !== attachmentId));
            toast({ title: "Attachment removed", description: filename });
        } catch (error: any) {
            toast({ title: "Failed to remove attachment", description: error.message, variant: "destructive" });
        }
    }, []);

    // Check for deleted images in Test Cases
    useEffect(() => {
        if (!testCases) return;

        const currentImages = extractImageUrls(testCases);
        const prevImages = prevTestCasesImages.current;

        // Find images that were present but are now missing
        const deletedImages = prevImages.filter(url => !currentImages.includes(url));

        if (deletedImages.length > 0) {
            deletedImages.forEach(url => {
                // Find attachment with this URL
                // Note: Attachment URL might be absolute, but editor URL might be relative or proxied
                // We need to be careful with matching
                const attachment = attachments.find((a: any) => {
                    // Simple check: if attachment URL ends with the same filename or is contained
                    return url.includes(a.filename) || a.url === url;
                });

                if (attachment) {
                    handleRemoveAttachment(attachment.id, attachment.filename);
                }
            });
        }

        prevTestCasesImages.current = currentImages;
    }, [testCases, attachments, handleRemoveAttachment]);

    // Check for deleted images in Issues Found
    useEffect(() => {
        if (!issuesFound) return;

        const currentImages = extractImageUrls(issuesFound);
        const prevImages = prevIssuesFoundImages.current;

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

        prevIssuesFoundImages.current = currentImages;
    }, [issuesFound, attachments, handleRemoveAttachment]);

    // Ensure state syncs when active run changes (including when it becomes null after submission)
    useEffect(() => {
        if (activeRun) {
            setTestCases(activeRun.testCasesContent || null);
            setIssuesFound(activeRun.issuesFoundContent || null);
            setRunId(activeRun.id);
            setAttachments(allAttachments.filter((a: any) => a.qaRunId === activeRun.id));
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
                // Remove the label
                await updateLabelsAction(projectId, issueIid, {
                    removeLabels: [labelName]
                });
                setIssueLabels(prev => prev.filter(l => l !== labelName));
                toast({ title: "Label removed", description: `Removed ${labelName}` });
            } else {
                // Add the label
                await updateLabelsAction(projectId, issueIid, {
                    addLabels: [labelName]
                });
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
            await updateLabelsAction(projectId, issueIid, {
                removeLabels: [labelName]
            });
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
            {/* Left Panel: GitLab Info */}
            <div className="w-[400px] border-r border-border/40 flex flex-col overflow-y-auto bg-slate-50/50 dark:bg-zinc-900/30">
                <div className="p-8 space-y-8">
                    {/* Header */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-muted-foreground">#{issue.iid}</span>
                            <Badge variant={issue.state === 'opened' ? 'default' : 'secondary'} className="rounded-md px-2 font-normal capitalize">
                                {issue.state}
                            </Badge>
                        </div>
                        <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground">{issue.title}</h1>

                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Avatar className="h-5 w-5 border border-border/40">
                                    <AvatarImage src={issue.author.avatar_url} />
                                    <AvatarFallback>{issue.author.name[0]}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium text-foreground/80">{issue.author.name}</span>
                            </div>
                            <span>•</span>
                            <span>{formatDistanceToNow(new Date(issue.created_at))} ago</span>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-foreground">Description</h3>
                        <div className="overflow-y-auto overflow-x-auto max-h-[60vh] border border-border/40 rounded-lg p-4 bg-card/50 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                            {processedDescription ? (
                                <div
                                    className="prose prose-sm max-w-none text-foreground/90 dark:prose-invert gitlab-content min-w-full"
                                    dangerouslySetInnerHTML={{ __html: processedDescription }}
                                />
                            ) : (
                                <div className="text-sm text-muted-foreground">No description provided</div>
                            )}
                        </div>
                        <div className="pt-2">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="w-full">
                                        <ExternalLink className="h-3 w-3 mr-2" />
                                        View Full Description
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-[95vw] w-full h-[90vh] overflow-hidden flex flex-col">
                                    <DialogHeader>
                                        <DialogTitle>Issue Description</DialogTitle>
                                    </DialogHeader>
                                    <div className="flex-1 overflow-y-auto p-4">
                                        {processedDescription ? (
                                            <div
                                                className="prose prose-sm max-w-none text-foreground/90 dark:prose-invert gitlab-content min-w-full"
                                                dangerouslySetInnerHTML={{ __html: processedDescription }}
                                            />
                                        ) : (
                                            <div className="text-sm text-muted-foreground">No description provided</div>
                                        )}
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    {/* Labels & Link */}
                    <div className="space-y-6 pt-4">
                        <div className="flex flex-wrap gap-2">
                            {issueLabels.map((labelName: string) => {
                                const labelInfo = projectLabels?.find((l: any) => l.name === labelName);
                                return (
                                    <Badge
                                        key={labelName}
                                        variant="outline"
                                        className="flex items-center gap-1 pr-1 px-2.5 py-1 h-6 text-sm rounded-md border-0 font-medium transition-colors"
                                        style={{
                                            backgroundColor: `${labelInfo?.color || '#6b7280'}15`,
                                            color: labelInfo?.color || '#6b7280'
                                        }}
                                    >
                                        {labelName}
                                        <X
                                            className="h-3 w-3 cursor-pointer hover:opacity-70 ml-1"
                                            onClick={() => handleRemoveLabel(labelName)}
                                        />
                                    </Badge>
                                );
                            })}

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-6 text-xs border-dashed text-muted-foreground hover:text-foreground"
                                        disabled={isUpdatingLabels}
                                    >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add Label
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-56">
                                    {!filteredProjectLabels || filteredProjectLabels.length === 0 ? (
                                        <div className="px-2 py-1.5 text-sm text-muted-foreground">No labels available</div>
                                    ) : (
                                        filteredProjectLabels.map((label: any) => (
                                            <DropdownMenuCheckboxItem
                                                key={label.name}
                                                checked={issueLabels.includes(label.name)}
                                                onCheckedChange={() => handleLabelToggle(label.name)}
                                                disabled={isUpdatingLabels}
                                                onSelect={(e) => e.preventDefault()}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-2.5 h-2.5 rounded-full"
                                                        style={{ backgroundColor: label.color }}
                                                    />
                                                    <span>{label.name}</span>
                                                </div>
                                            </DropdownMenuCheckboxItem>
                                        ))
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div className="flex items-center gap-2 text-sm pt-4 border-t border-border/40">
                            <Link href={issue.web_url} target="_blank" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                                <ExternalLink className="h-3.5 w-3.5" />
                                View in GitLab
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel: QA Work */}
            <div className="flex-1 flex flex-col overflow-hidden bg-background relative">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 shrink-0">
                    <div className="flex items-center gap-4">
                        <h2 className="font-semibold text-xl tracking-tight">QA Testing</h2>
                        {runs.length > 0 && (
                            <div className="flex -space-x-1 ml-2">
                                {runs.slice(0, 5).map((r: any) => (
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
                        {activeRun ? (
                            <>
                                <Button variant="ghost" onClick={() => handleSave(false)} disabled={saving} className="text-muted-foreground hover:text-foreground">
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                    Save Draft
                                </Button>
                                <div className="h-6 w-px bg-border/60 mx-1" />
                                <Button variant="destructive" size="sm" onClick={() => handleSubmit('failed')} disabled={submitting} className="shadow-none">
                                    Fail
                                </Button>
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-none" onClick={() => handleSubmit('passed')} disabled={submitting}>
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

                    <TabsContent value="active" className="flex-1 overflow-y-auto p-8 space-y-10 outline-none">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-base font-medium">Test Cases</Label>
                            </div>
                            <TiptapEditor
                                content={testCases}
                                onChange={setTestCases}
                                members={members}
                                placeholder="List test cases..."
                                snippets={testCaseSnippets}
                                onImagePaste={handleImagePaste}
                                className="border-border/40 shadow-none bg-background focus-within:ring-1 focus-within:ring-primary/20"
                            />
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-base font-medium text-red-600/90">Issues Found</Label>
                            </div>
                            <TiptapEditor
                                content={issuesFound}
                                onChange={setIssuesFound}
                                members={members}
                                placeholder="Describe any issues found..."
                                snippets={issueSnippets}
                                onImagePaste={handleImagePaste}
                                className="border-red-100 dark:border-red-900/30 shadow-none bg-red-50/10 focus-within:ring-1 focus-within:ring-red-500/20"
                            />
                        </div>

                        <div className="space-y-4">
                            <Label className="text-base font-medium">Attachments</Label>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {attachments.map((att: any) => (
                                    <div key={att.id} className="group relative flex flex-col items-center justify-center p-4 border border-border/40 rounded-xl bg-slate-50/50 hover:bg-slate-100/50 transition-all text-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center border border-border/20 shadow-sm">
                                            <Paperclip className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <a href={att.url} target="_blank" className="text-sm font-medium text-foreground hover:underline truncate w-full px-2" title={att.filename}>{att.filename}</a>
                                        <button
                                            onClick={() => handleRemoveAttachment(att.id, att.filename)}
                                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-destructive/10 rounded-full text-destructive"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                                <label className="flex flex-col items-center justify-center p-4 border border-dashed border-border/60 rounded-xl cursor-pointer hover:bg-slate-50/50 hover:border-primary/40 transition-all gap-2 text-muted-foreground hover:text-primary">
                                    <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center">
                                        <Plus className="h-5 w-5" />
                                    </div>
                                    <span className="text-sm font-medium">Add File</span>
                                    <input type="file" className="hidden" onChange={handleFileUpload} />
                                </label>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="history" className="flex-1 overflow-y-auto p-8 outline-none">
                        <div className="space-y-0 max-w-3xl">
                            {runs.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <p>No history yet.</p>
                                </div>
                            ) : runs.map((run: any) => (
                                <div key={run.id} className="relative pl-8 pb-10 border-l border-border/40 last:pb-0 last:border-0">
                                    <div className={cn(
                                        "absolute left-0 top-0 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-background",
                                        run.status === 'passed' ? "bg-emerald-500" :
                                            run.status === 'failed' ? "bg-red-500" : "bg-blue-500"
                                    )} />

                                    <div className="flex items-center gap-4 mb-4 -mt-1.5">
                                        <span className="font-semibold text-lg">Run #{run.runNumber}</span>
                                        <Badge variant="outline" className={cn(
                                            "uppercase text-[10px] tracking-wider border-0 px-2 py-0.5",
                                            run.status === 'passed' ? "bg-emerald-500/10 text-emerald-600" :
                                                run.status === 'failed' ? "bg-red-500/10 text-red-600" : "bg-blue-500/10 text-blue-600"
                                        )}>
                                            {run.status}
                                        </Badge>
                                        <span className="text-sm text-muted-foreground ml-auto">
                                            {run.completedAt ? formatDistanceToNow(new Date(run.completedAt)) + ' ago' : 'In Progress'}
                                        </span>
                                    </div>

                                    <div className="space-y-4 text-sm text-muted-foreground pl-1">
                                        {run.issuesFoundContent && (
                                            <div className="bg-red-50/50 rounded-lg p-4 border border-red-100/50">
                                                <div className="font-medium text-red-700 mb-2 text-xs uppercase tracking-wider flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                    Issues Found
                                                </div>
                                                <TiptapEditor content={run.issuesFoundContent} readOnly={true} className="border-0 bg-transparent p-0 min-h-0" />
                                            </div>
                                        )}
                                        {run.testCasesContent && (
                                            <div className="bg-slate-50/50 rounded-lg p-4 border border-border/40">
                                                <div className="font-medium text-foreground/70 mb-2 text-xs uppercase tracking-wider flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                                    Test Cases
                                                </div>
                                                <TiptapEditor content={run.testCasesContent} readOnly={true} className="border-0 bg-transparent p-0 min-h-0" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
