'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { deleteIssue } from "@/app/actions/issues";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { BlockerFormModal } from "@/components/sessions/BlockerFormModal";
import { ShieldAlert } from "lucide-react";

const isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

interface LabelInfo {
    id?: number;
    name: string;
    color: string;
    text_color: string;
}

/**
 * Generate a consistent hash-based color for labels not in the provided list
 */
function generateLabelColor(labelName: string): { bg: string; text: string } {
    const hash = labelName.split('').reduce((acc, char) => {
        return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    const hue = Math.abs(hash) % 360;
    return { bg: `hsl(${hue}, 65%, 45%)`, text: '#fff' };
}

export function IssuesTable({ issues, projectId, labels = [] }: { issues: any[]; projectId: number; labels?: LabelInfo[] }) {
    // Create a memoized label color lookup map
    const getLabelColor = useMemo(() => {
        const colorMap = new Map<string, { bg: string; text: string }>();

        // Build map from provided labels
        labels.forEach(label => {
            colorMap.set(label.name, { bg: label.color, text: label.text_color });
        });

        // Cache for generated colors
        const generatedCache = new Map<string, { bg: string; text: string }>();

        return (labelName: string) => {
            // First check provided labels
            const mapped = colorMap.get(labelName);
            if (mapped) return mapped;

            // Check generated cache
            const cached = generatedCache.get(labelName);
            if (cached) return cached;

            // Generate and cache
            const generated = generateLabelColor(labelName);
            generatedCache.set(labelName, generated);
            return generated;
        };
    }, [labels]);
    const router = useRouter();
    const [deletingIssueId, setDeletingIssueId] = useState<number | null>(null);
    const [blockerModalOpen, setBlockerModalOpen] = useState(false);
    const [selectedProjectForBlocker, setSelectedProjectForBlocker] = useState<number | null>(null);

    const handleDelete = async (issueIid: number) => {
        if (!confirm('Are you sure you want to delete this issue? This action cannot be undone.')) {
            return;
        }

        setDeletingIssueId(issueIid);
        try {
            await deleteIssue(projectId, issueIid);
            router.refresh();
        } catch (error) {
            console.error('Failed to delete issue:', error);
            alert('Failed to delete issue. See console for details.');
        } finally {
            setDeletingIssueId(null);
        }
    };

    return (
        <div className="rounded-md border bg-card">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]">ID</TableHead>
                        <TableHead className="min-w-[300px]">Title</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Labels</TableHead>
                        <TableHead>Assignee</TableHead>
                        <TableHead className="text-right">Updated</TableHead>
                        {isMockMode && <TableHead className="w-[50px]"></TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {issues.map((issue) => (
                        <TableRow
                            key={`${issue.project.id}-${issue.iid}`}
                            className="group hover:bg-muted/50 transition-colors h-16 cursor-pointer"
                            onClick={() => router.push(`/${projectId}/qa/${issue.iid}`)}
                        >
                            <TableCell className="font-medium text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">#{issue.iid}</TableCell>
                            <TableCell>
                                <Link
                                    href={`/${projectId}/qa/${issue.iid}`}
                                    className="font-medium hover:text-primary hover:underline block"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {issue.title}
                                </Link>
                            </TableCell>
                            <TableCell>
                                <Badge variant="secondary" className="font-normal">
                                    {issue.project.name}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-wrap gap-1">
                                    {issue.labels
                                        .filter((l: string) => !l.startsWith('qa::'))
                                        .map((label: string) => {
                                            const colors = getLabelColor(label);
                                            return (
                                                <Badge
                                                    key={label}
                                                    variant="outline"
                                                    className="text-sm font-medium px-2.5 py-1 h-6 rounded-full border-0"
                                                    style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 15%, transparent)`, color: colors.bg }}
                                                >
                                                    {label}
                                                </Badge>
                                            );
                                        })}
                                </div>
                            </TableCell>
                            <TableCell>
                                {issue.assignee ? (
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={issue.assignee.avatar_url} />
                                            <AvatarFallback className="text-xs">{issue.assignee.name[0]}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm text-muted-foreground truncate max-w-[120px]">
                                            {issue.assignee.name}
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-sm text-muted-foreground italic opacity-50">Unassigned</span>
                                )}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                                {formatDistanceToNow(new Date(issue.updated_at))} ago
                            </TableCell>
                            {isMockMode && (
                                <TableCell>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-destructive/10 opacity-0 group-hover:opacity-100"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(issue.iid);
                                        }}
                                        disabled={deletingIssueId === issue.iid}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            )}
                            <TableCell className="w-[50px]">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-100 opacity-0 group-hover:opacity-100"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedProjectForBlocker(issue.project.id);
                                        setBlockerModalOpen(true);
                                    }}
                                    title="Log Blocker"
                                >
                                    <ShieldAlert className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                    {issues.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={isMockMode ? 7 : 6} className="h-24 text-center text-muted-foreground">
                                No issues found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            {selectedProjectForBlocker && (
                <BlockerFormModal
                    open={blockerModalOpen}
                    onOpenChange={setBlockerModalOpen}
                    // sessionId={0} - Removed to allow standalone blockers
                    projectId={selectedProjectForBlocker}
                    onSuccess={() => {
                        router.refresh();
                        setBlockerModalOpen(false);
                        setSelectedProjectForBlocker(null);
                    }}
                />
            )}
        </div>
    );
}
