'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { createIssue } from '@/app/actions/issues';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { CreateIssueProjectSelector } from '@/components/issues/CreateIssueProjectSelector';

export function NewIssueForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const projectIdParam = searchParams.get('projectId');

    const [showProjectSelector, setShowProjectSelector] = useState(!projectIdParam);
    const [selectedProjectId, setSelectedProjectId] = useState(projectIdParam || '');
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'issue',
        assigneeId: '',
        labelId: '',
    });

    const handleProjectSelect = (projectId: number) => {
        setSelectedProjectId(projectId.toString());
        setShowProjectSelector(false);

        // Update URL with selected project
        const params = new URLSearchParams(searchParams.toString());
        params.set('projectId', projectId.toString());
        router.push(`/issues/new?${params.toString()}`);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await createIssue(Number(selectedProjectId), formData);
            router.push('/issues');
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
                        <Link href="/issues">
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

                    <div className="grid grid-cols-2 gap-4">
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
                            <Select
                                value={formData.labelId}
                                onValueChange={(value) => setFormData({ ...formData, labelId: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="bug">Bug</SelectItem>
                                    <SelectItem value="feature">Feature</SelectItem>
                                    <SelectItem value="ui">UI</SelectItem>
                                    <SelectItem value="backend">Backend</SelectItem>
                                    <SelectItem value="critical">Critical</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
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
