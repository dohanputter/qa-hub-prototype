'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/Dialog";
import { Plus, X, ExternalLink, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import type { QAHeaderProps } from '@/types/qa';
import { DescriptionContent } from './DescriptionContent';

// Format milliseconds as hours:minutes:seconds
function formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    } else {
        return `${seconds}s`;
    }
}

export function QAHeader({
    issue,
    processedDescription,
    issueLabels,
    projectLabels,
    isUpdatingLabels,
    onLabelToggle,
    onLabelRemove,
    leakageSource,
    cumulativeTimeMs,
    activeRun
}: QAHeaderProps) {
    const [now, setNow] = useState(Date.now());
    // Filter out QA workflow labels from dropdown options
    const filteredProjectLabels = projectLabels?.filter((l: any) =>
        !l.name.startsWith('qa::') &&
        !l.name.startsWith('QA::') &&
        !l.name.startsWith('workflow::')
    ) || [];

    // Live timer effect - update every second when there's an active run
    useEffect(() => {
        if (!activeRun) return;

        const interval = setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => clearInterval(interval);
    }, [activeRun]);

    // Calculate total display time
    const activeRunTime = activeRun?.createdAt
        ? now - new Date(activeRun.createdAt).getTime()
        : 0;
    const totalTime = (cumulativeTimeMs || 0) + activeRunTime;

    // Helper to get display label and styling for leakage source
    const getLeakageSourceInfo = (source: 'qa' | 'uat' | 'production' | undefined) => {
        switch (source) {
            case 'uat':
                return { label: 'UAT / Staging', color: 'bg-amber-500/15 text-amber-600 border-amber-500/30' };
            case 'production':
                return { label: 'Production Leak', color: 'bg-red-500/15 text-red-600 border-red-500/30' };
            case 'qa':
            default:
                return { label: 'Internal QA', color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' };
        }
    };

    const leakageInfo = getLeakageSourceInfo(leakageSource);

    return (
        <div className="w-[400px] border-r border-border/40 flex flex-col overflow-y-auto bg-background/60 backdrop-blur-md">
            <div className="p-8 space-y-8">
                {/* Header */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm text-muted-foreground">#{issue.iid}</span>
                        <Badge variant={issue.state === 'opened' ? 'default' : 'secondary'} className="rounded-md px-2 font-normal capitalize">
                            {issue.state}
                        </Badge>
                        {leakageSource && (
                            <Badge
                                variant="outline"
                                className={`rounded-md px-2 font-medium text-xs border ${leakageInfo.color}`}
                            >
                                {leakageInfo.label}
                            </Badge>
                        )}
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

                    {/* Cumulative Time Display */}
                    {(totalTime > 0 || activeRun) && (
                        <div className="flex items-center gap-2 mt-3 p-3 rounded-lg border border-border/40 bg-card/40">
                            <Clock className={`h-4 w-4 ${activeRun ? 'text-blue-500 animate-pulse' : 'text-muted-foreground'}`} />
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground font-medium">
                                    {activeRun ? 'Time Spent (Active)' : 'Total Time Spent'}
                                </span>
                                <span className={`font-mono text-sm font-semibold ${activeRun ? 'text-blue-500' : 'text-foreground'}`}>
                                    {formatDuration(totalTime)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">Description</h3>
                    <div className="overflow-y-auto overflow-x-auto max-h-[60vh] border border-border/40 rounded-lg p-4 bg-card/40 backdrop-blur-sm scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                        {processedDescription ? (
                            <DescriptionContent html={processedDescription} />
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
                                        <DescriptionContent html={processedDescription} />
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
                                        onClick={() => onLabelRemove(labelName)}
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
                                            onCheckedChange={() => onLabelToggle(label.name)}
                                            disabled={isUpdatingLabels}
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
    );
}
