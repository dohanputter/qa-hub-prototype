import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, X, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface QAHeaderProps {
    issue: any;
    processedDescription: string;
    issueLabels: string[];
    projectLabels: any[];
    isUpdatingLabels: boolean;
    onLabelToggle: (label: string) => void;
    onLabelRemove: (label: string) => void;
}

export function QAHeader({
    issue,
    processedDescription,
    issueLabels,
    projectLabels,
    isUpdatingLabels,
    onLabelToggle,
    onLabelRemove
}: QAHeaderProps) {
    const filteredProjectLabels = projectLabels?.filter((l: any) => !l.name.startsWith('qa::')) || [];

    return (
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
