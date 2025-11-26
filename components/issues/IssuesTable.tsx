'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { deleteIssue } from "@/app/actions/issues";
import { useState } from "react";
import { useRouter } from "next/navigation";

const isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

// Mock label definitions with colors
const MOCK_LABELS = [
    { id: 1, name: 'bug', color: '#dc2626', text_color: '#fff' },
    { id: 2, name: 'feature', color: '#2563eb', text_color: '#fff' },
    { id: 3, name: 'critical', color: '#7f1d1d', text_color: '#fff' },
    { id: 4, name: 'frontend', color: '#0891b2', text_color: '#fff' },
    { id: 5, name: 'backend', color: '#6366f1', text_color: '#fff' },
    { id: 6, name: 'qa::ready', color: '#f59e0b', text_color: '#fff' },
    { id: 7, name: 'qa::passed', color: '#10b981', text_color: '#fff' },
    { id: 8, name: 'qa::failed', color: '#ef4444', text_color: '#fff' },
];

const getLabelColor = (labelName: string) => {
    const label = MOCK_LABELS.find(l => l.name === labelName);
    return label ? { bg: label.color, text: label.text_color } : { bg: '#6b7280', text: '#fff' };
};

export function IssuesTable({ issues }: { issues: any[] }) {
    const router = useRouter();
    const [deletingIssueId, setDeletingIssueId] = useState<number | null>(null);

    const handleDelete = async (projectId: number, issueIid: number) => {
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
        <div className="rounded-md border bg-white">
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
                        <TableRow key={issue.id}>
                            <TableCell className="font-medium text-muted-foreground">#{issue.iid}</TableCell>
                            <TableCell>
                                <Link
                                    href={`/${issue.project.id}/qa/${issue.iid}`}
                                    className="font-medium hover:text-indigo-600 hover:underline block"
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
                                    {issue.labels.map((label: string) => {
                                        const colors = getLabelColor(label);
                                        return (
                                            <Badge
                                                key={label}
                                                variant="outline"
                                                className="text-xs font-normal px-2 py-0 h-5 border-0"
                                                style={{ backgroundColor: colors.bg, color: colors.text }}
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
                                    <span className="text-sm text-muted-foreground italic">Unassigned</span>
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
                                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => handleDelete(issue.projectId, issue.iid)}
                                        disabled={deletingIssueId === issue.iid}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            )}
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
        </div>
    );
}
