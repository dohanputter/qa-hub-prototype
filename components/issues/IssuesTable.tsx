'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export function IssuesTable({ issues }: { issues: any[] }) {
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
                                    {issue.labels.map((label: string) => (
                                        <Badge key={label} variant="outline" className="text-xs font-normal px-2 py-0 h-5">
                                            {label}
                                        </Badge>
                                    ))}
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
                        </TableRow>
                    ))}
                    {issues.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                No issues found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
