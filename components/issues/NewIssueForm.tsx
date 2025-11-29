'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createIssue } from '@/app/actions/issues';
import { getLabelsAction } from '@/app/actions/labels';
import { uploadAttachment } from '@/app/actions/uploadAttachment';
import { ArrowLeft, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { CreateIssueProjectSelector } from '@/components/issues/CreateIssueProjectSelector';
import { TiptapEditor } from '@/components/qa/TiptapEditor';
import { tiptapToMarkdown } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

export function NewIssueForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const projectIdParam = searchParams.get('projectId');

    const [showProjectSelector, setShowProjectSelector] = useState(!projectIdParam);
    const [selectedProjectId, setSelectedProjectId] = useState(projectIdParam || '');
    const [isLoading, setIsLoading] = useState(false);
    const [labels, setLabels] = useState<any[]>([]);
    const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'issue',
        assigneeId: '',
    });

    // Mock members for mentions
    const members = [
        { name: 'Mock Tester', username: 'mock_tester', avatar_url: '' },
        { name: 'Jane Doe', username: 'jane_doe', avatar_url: '' },
        { name: 'John Smith', username: 'john_smith', avatar_url: '' },
    ];

    // Load labels when project is selected
    useEffect(() => {
        if (selectedProjectId) {
            const loadLabels = async () => {
                try {
                    const projectLabels = await getLabelsAction(Number(selectedProjectId));
                    // Filter out QA status labels
                    const filteredLabels = projectLabels.filter((l: any) => !l.name.startsWith('qa::'));
                    setLabels(filteredLabels);
                } catch (error) {
                    console.error('Failed to fetch labels', error);
                }
            };
            loadLabels();
        }
    }, [selectedProjectId]);

    const handleProjectSelect = (projectId: number) => {
        setSelectedProjectId(projectId.toString());
        setShowProjectSelector(false);

        // Update URL with selected project
        const params = new URLSearchParams(searchParams.toString());
        params.set('projectId', projectId.toString());
        router.push(`/issues/new?${params.toString()}`);
    };

    const handleLabelToggle = (labelName: string) => {
        setSelectedLabels(prev =>
            prev.includes(labelName)
                ? prev.filter(l => l !== labelName)
                : [...prev, labelName]
        );
    };

    const handleRemoveLabel = (labelName: string) => {
        setSelectedLabels(prev => prev.filter(l => l !== labelName));
    };

    const handleEditorChange = (jsonContent: any) => {
        const markdown = tiptapToMarkdown(jsonContent);
        setFormData(prev => ({ ...prev, description: markdown }));
    };

    const handleImagePaste = async (file: File) => {
        if (!selectedProjectId) {
            throw new Error('Please select a project first');
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', selectedProjectId);

        const result = await uploadAttachment(formData);
        return result;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await createIssue(Number(selectedProjectId), {
                ...formData,
                labels: selectedLabels.join(',')
            });
            router.push(`/${selectedProjectId}/issues`);
            router.refresh();
        } catch (error) {
            console.error('Failed to create issue', error);
            toast({
                title: "Error",
                description: "Failed to create issue",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Show project selector modal if no project is selected
    if (!selectedProjectId) {
        return (
            <>
                <CreateIssueProjectSelector
                    open={showProjectSelector}
                    onSelect={handleProjectSelect}
                    onOpenChange={setShowProjectSelector}
                />
                <div className="flex-1 space-y-4 p-8 pt-6">
                    <div className="flex items-center justify-between space-y-2">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" asChild>
                                <Link href="/issues">
                                    <ArrowLeft className="h-4 w-4" />
                                </Link>
                            </Button>
                            <div>
                                <h2 className="text-3xl font-bold tracking-tight">New Issue</h2>
                                <p className="text-muted-foreground">Select a project to create an issue</p>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={`/${selectedProjectId}/issues`}>
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">New Issue</h2>
                        <p className="text-muted-foreground">Create a new issue in Project {selectedProjectId}</p>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto border rounded-lg p-6 bg-card shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="type">Type</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(value) => setFormData({ ...formData, type: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="issue">Issue</SelectItem>
                                    <SelectItem value="incident">Incident</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Assignee</Label>
                            <Select
                                value={formData.assigneeId}
                                onValueChange={(value) => setFormData({ ...formData, assigneeId: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Unassigned" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="99">Mock Tester</SelectItem>
                                    <SelectItem value="100">Jane Doe</SelectItem>
                                    <SelectItem value="101">John Smith</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
                        <Input
                            id="title"
                            placeholder="Add a title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                            className="text-lg font-medium"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <div className="min-h-[200px] border rounded-md">
                            <TiptapEditor
                                content={formData.description}
                                onChange={handleEditorChange}
                                members={members}
                                placeholder="Describe the issue..."
                                onImagePaste={handleImagePaste}
                            />
                        </div>
                        <div className="text-xs text-muted-foreground text-right">Markdown supported</div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Labels</Label>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button type="button" variant="outline" size="sm" className="h-8">
                                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                                        Add label
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    {labels.length === 0 ? (
                                        <div className="px-2 py-1.5 text-sm text-muted-foreground">No labels available</div>
                                    ) : (
                                        labels.map(label => (
                                            <DropdownMenuCheckboxItem
                                                key={label.name}
                                                checked={selectedLabels.includes(label.name)}
                                                onCheckedChange={() => handleLabelToggle(label.name)}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-3 h-3 rounded-full"
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

                        {selectedLabels.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2">
                                {selectedLabels.map(labelName => {
                                    const label = labels.find(l => l.name === labelName);
                                    return (
                                        <Badge
                                            key={labelName}
                                            variant="secondary"
                                            style={{
                                                backgroundColor: `${label?.color || '#6b7280'}15`,
                                                color: label?.color || '#6b7280',
                                                borderColor: `${label?.color || '#6b7280'}30`
                                            }}
                                            className="flex items-center gap-1 px-2.5 py-0.5 h-7 rounded-md border font-medium transition-colors hover:bg-opacity-20"
                                        >
                                            {labelName}
                                            <X
                                                className="h-3 w-3 cursor-pointer hover:opacity-70 ml-1"
                                                onClick={() => handleRemoveLabel(labelName)}
                                            />
                                        </Badge>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-6 border-t">
                        <Button variant="ghost" type="button" asChild>
                            <Link href="/issues">Cancel</Link>
                        </Button>
                        <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90 min-w-[120px]">
                            {isLoading ? 'Creating...' : 'Create Issue'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
