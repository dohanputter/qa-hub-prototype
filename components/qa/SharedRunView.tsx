'use client';

import { Badge } from '@/components/ui/Badge';
import { TiptapEditor } from './TiptapEditor';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { CheckCircle2, XCircle, Clock, FileText, AlertTriangle, Paperclip, ExternalLink, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { JSONContent } from '@tiptap/core';
import { useTheme } from 'next-themes';

interface SharedRunData {
    run: {
        id: string;
        runNumber: number;
        status: 'pending' | 'passed' | 'failed';
        testCasesContent: JSONContent | null;
        issuesFoundContent: JSONContent | null;
        closingNote: string | null;
        completedAt: Date | number | null;
        createdAt: Date | number | null;
    };
    issue: {
        issueTitle: string;
        issueUrl: string;
        gitlabIssueIid: number;
    };
    project: {
        name: string;
        webUrl: string;
    };
    attachments: Array<{
        id: string;
        filename: string;
        url: string;
        mimeType: string;
    }>;
}

interface SharedRunViewProps {
    data: SharedRunData;
}

export function SharedRunView({ data }: SharedRunViewProps) {
    const { run, issue, project, attachments } = data;

    // Helper to get proxy URL for attachments
    const getProxyUrl = (attachmentId: string) => `/api/image/${attachmentId}`;

    const statusConfig = {
        passed: {
            icon: CheckCircle2,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            border: 'border-emerald-200',
            label: 'Passed',
        },
        failed: {
            icon: XCircle,
            color: 'text-red-600',
            bg: 'bg-red-50',
            border: 'border-red-200',
            label: 'Failed',
        },
        pending: {
            icon: Clock,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            label: 'In Progress',
        },
    };

    const config = statusConfig[run.status];
    const StatusIcon = config.icon;
    const { theme, setTheme } = useTheme();

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-lg", config.bg)}>
                                <StatusIcon className={cn("h-5 w-5", config.color)} />
                            </div>
                            <div>
                                <h1 className="font-semibold text-lg">QA Run #{run.runNumber}</h1>
                                <p className="text-sm text-muted-foreground">
                                    {project.name} • Issue #{issue.gitlabIssueIid}
                                </p>
                            </div>
                        </div>
                        <Badge className={cn("uppercase text-xs", config.bg, config.color, "border-0")}>
                            {config.label}
                        </Badge>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="ml-2"
                            title="Toggle theme"
                        >
                            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                            <span className="sr-only">Toggle theme</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
                {/* Issue Info Card */}
                <div className="bg-card rounded-xl border shadow-sm p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <h2 className="font-medium text-lg truncate">{issue.issueTitle}</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                {run.completedAt
                                    ? `Completed ${formatDistanceToNow(new Date(run.completedAt))} ago`
                                    : run.createdAt
                                        ? `Started ${formatDistanceToNow(new Date(run.createdAt))} ago`
                                        : 'In Progress'
                                }
                                {run.completedAt && (
                                    <span className="text-muted-foreground/60">
                                        {' '}• {format(new Date(run.completedAt), 'MMM d, yyyy h:mm a')}
                                    </span>
                                )}
                            </p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                            <a href={issue.issueUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View in GitLab
                            </a>
                        </Button>
                    </div>
                </div>

                {/* Test Cases */}
                {run.testCasesContent && (
                    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b bg-muted/50 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-medium">Test Cases Executed</h3>
                        </div>
                        <div className="p-6">
                            <TiptapEditor
                                content={run.testCasesContent}
                                readOnly={true}
                                className="border-0 bg-transparent p-0 min-h-0"
                            />
                        </div>
                    </div>
                )}

                {/* Issues Found */}
                {run.issuesFoundContent && (
                    <div className="bg-card rounded-xl border border-red-200 dark:border-red-900/50 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                            <h3 className="font-medium text-red-900 dark:text-red-300">Issues Found</h3>
                        </div>
                        <div className="p-6">
                            <TiptapEditor
                                content={run.issuesFoundContent}
                                readOnly={true}
                                className="border-0 bg-transparent p-0 min-h-0"
                            />
                        </div>
                    </div>
                )}

                {/* Closing Note */}
                {run.status === 'passed' && run.closingNote && (
                    <div className="bg-card rounded-xl border border-emerald-200 dark:border-emerald-900/50 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            <h3 className="font-medium text-emerald-900 dark:text-emerald-300">Closing Note</h3>
                        </div>
                        <div className="p-6">
                            <p className="text-foreground/80 whitespace-pre-wrap">{run.closingNote}</p>
                        </div>
                    </div>
                )}

                {/* Attachments */}
                {attachments.length > 0 && (
                    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b bg-muted/50 flex items-center gap-2">
                            <Paperclip className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-medium">Attachments ({attachments.length})</h3>
                        </div>
                        <div className="p-6">
                            <div className="grid gap-3">
                                {attachments.map((attachment) => {
                                    const proxyUrl = getProxyUrl(attachment.id);
                                    return (
                                        <a
                                            key={attachment.id}
                                            href={proxyUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                        >
                                            {attachment.mimeType.startsWith('image/') ? (
                                                <div className="w-12 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
                                                    <img
                                                        src={proxyUrl}
                                                        alt={attachment.filename}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                                    <Paperclip className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                            )}
                                            <span className="text-sm font-medium truncate flex-1">
                                                {attachment.filename}
                                            </span>
                                            <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="text-center text-sm text-muted-foreground pt-8 pb-4">
                    <p>This is a view-only share link from QA Hub</p>
                </div>
            </div>
        </div>
    );
}
