'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { configureProjectLabels } from '@/app/actions/project';
import { Loader2 } from 'lucide-react';

interface ProjectSettingsFormProps {
    projectId: number;
    initialLabels: { id: number; title: string; color: string }[];
    currentMapping?: { pending: string; passed: string; failed: string };
}

export function ProjectSettingsForm({ projectId, initialLabels, currentMapping }: ProjectSettingsFormProps) {
    const [mapping, setMapping] = useState(currentMapping || {
        pending: '',
        passed: '',
        failed: ''
    });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!mapping.pending || !mapping.passed || !mapping.failed) {
            toast({ title: "Incomplete configuration", description: "Please map all statuses to GitLab labels", variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            await configureProjectLabels(projectId, mapping);
            toast({ title: "Settings saved", description: "Project workflow updated successfully" });
        } catch (error: any) {
            toast({ title: "Error saving settings", description: error.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Workflow Configuration</CardTitle>
                <CardDescription>
                    Map GitLab labels to QA Hub statuses to automate the workflow.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Pending Testing (Starts QA Run)</Label>
                        <Select
                            value={mapping.pending}
                            onValueChange={(value) => setMapping({ ...mapping, pending: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select label" />
                            </SelectTrigger>
                            <SelectContent>
                                {initialLabels.map((l) => (
                                    <SelectItem key={l.id} value={l.title}>
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
                                            {l.title}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            When an issue gets this label, a new QA Run will automatically start.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>QA Passed (Closes Run)</Label>
                        <Select
                            value={mapping.passed}
                            onValueChange={(value) => setMapping({ ...mapping, passed: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select label" />
                            </SelectTrigger>
                            <SelectContent>
                                {initialLabels.map((l) => (
                                    <SelectItem key={l.id} value={l.title}>
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
                                            {l.title}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>QA Failed (Closes Run)</Label>
                        <Select
                            value={mapping.failed}
                            onValueChange={(value) => setMapping({ ...mapping, failed: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select label" />
                            </SelectTrigger>
                            <SelectContent>
                                {initialLabels.map((l) => (
                                    <SelectItem key={l.id} value={l.title}>
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
                                            {l.title}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Configuration
                </Button>
            </CardContent>
        </Card>
    );
}
