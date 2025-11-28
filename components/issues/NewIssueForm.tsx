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
import { ArrowLeft, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { CreateIssueProjectSelector } from '@/components/issues/CreateIssueProjectSelector';

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

            <div className="max-w-2xl mx-auto border rounded-lg p-6 bg-white shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-6">
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
                        <Label htmlFor="title">Title (required)</Label>
                        <Input
                            id="title"
                            placeholder="Add a title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <div className="min-h-[200px] border rounded-md p-2">
                            <textarea
                                id="description"
                                className="w-full h-full min-h-[200px] resize-none outline-none"
                                placeholder="Describe the issue..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                        <div className="text-xs text-muted-foreground text-right">Markdown supported</div>
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

                    <div className="space-y-2">
                        <Label>Labels</Label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {selectedLabels.map(labelName => {
                                const label = labels.find(l => l.name === labelName);
                                return (
                                    <Badge
                                        key={labelName}
                                        variant="outline"
                                        style={{
                                            backgroundColor: label?.color || '#e5e7eb',
                                            color: label?.text_color || '#000',
                                            borderColor: label?.color || '#e5e7eb'
                                        }}
                                        className="flex items-center gap-1"
                                    >
                                        {labelName}
                                        <X
                                            className="h-3 w-3 cursor-pointer hover:opacity-70"
                                            onClick={() => handleRemoveLabel(labelName)}
                                        />
                                    </Badge>
                                );
                            })}
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button type="button" variant="outline" size="sm" className="w-full">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add label
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56">
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

                    <div className="flex justify-end gap-4 pt-4">
                        <Button variant="outline" type="button" asChild>
                            <Link href="/issues">Cancel</Link>
                        </Button>
                        <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700">
                            {isLoading ? 'Creating...' : 'Create issue'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
