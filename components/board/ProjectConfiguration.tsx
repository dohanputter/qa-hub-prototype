'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { configureProjectLabels, addUserProject } from '@/app/actions/project';
import { toast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

interface ProjectConfigurationProps {
    gitlabProject: any;
    labels: any[];
}

export function ProjectConfiguration({ gitlabProject, labels }: ProjectConfigurationProps) {
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState({
        pending: '',
        passed: '',
        failed: ''
    });

    const handleSave = async () => {
        if (!config.pending || !config.passed || !config.failed) {
            toast({ title: "Incomplete configuration", description: "Please select all labels", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            // Ensure project exists in DB first
            await addUserProject(gitlabProject.id);

            // Configure labels
            await configureProjectLabels(gitlabProject.id, config);

            toast({ title: "Project configured", description: "You can now use the QA Board." });
            // Page should refresh due to revalidatePath in server action
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center h-full p-8">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle>Configure QA Board</CardTitle>
                    <CardDescription>
                        Map GitLab labels to QA statuses for <strong>{gitlabProject.name}</strong>.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Pending QA Label</Label>
                        <Select onValueChange={(v) => setConfig({ ...config, pending: v })}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select label for Pending QA" />
                            </SelectTrigger>
                            <SelectContent>
                                {labels.map((l: any) => (
                                    <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Passed Label</Label>
                        <Select onValueChange={(v) => setConfig({ ...config, passed: v })}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select label for Passed" />
                            </SelectTrigger>
                            <SelectContent>
                                {labels.map((l: any) => (
                                    <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Failed Label</Label>
                        <Select onValueChange={(v) => setConfig({ ...config, failed: v })}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select label for Failed" />
                            </SelectTrigger>
                            <SelectContent>
                                {labels.map((l: any) => (
                                    <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSave} disabled={loading} className="w-full">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Configuration
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
