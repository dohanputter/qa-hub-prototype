'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Folder, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getUserProjects } from '@/app/actions/project';

interface Project {
    id: number;
    name: string;
    description: string | null;
    webUrl: string;
}

export function ProjectSelector() {
    const [open, setOpen] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const data = await getUserProjects();
                setProjects(data);

                // Simple persistence logic: 
                // In a real app, we might use a context or URL param.
                // For now, default to the first one if none selected.
                if (data.length > 0 && !selectedProject) {
                    setSelectedProject(data[0]);
                }
            } catch (error) {
                console.error('Failed to fetch projects', error);
            }
        };
        fetchProjects();
    }, [selectedProject]);

    const handleSelect = (project: Project) => {
        setSelectedProject(project);
        setOpen(false);
        // In a real implementation, we might update a global context or redirect.
        // For this prototype, we'll just refresh or maybe set a cookie/local storage?
        // Let's assume the dashboard uses the first project or we need a way to pass this.
        // The prompt says "Filter data based on selected project".
        // We can add ?projectId=... to the URL.
        const params = new URLSearchParams(searchParams.toString());
        params.set('projectId', project.id.toString());
        router.push(`?${params.toString()}`);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                    {selectedProject ? (
                        <span className="truncate">{selectedProject.name}</span>
                    ) : (
                        <span>Select Project</span>
                    )}
                    <ChevronRight className="ml-2 h-4 w-4 opacity-50 rotate-90" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Select Project</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <p className="text-sm text-muted-foreground">
                        Choose the project where you want to create the issue.
                    </p>
                    <div className="space-y-2">
                        {projects.map((project) => (
                            <div
                                key={project.id}
                                className={cn(
                                    "flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors",
                                    selectedProject?.id === project.id && "border-primary bg-accent/50"
                                )}
                                onClick={() => handleSelect(project)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-secondary rounded-md">
                                        <Folder className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium">{project.name}</h4>
                                        <p className="text-sm text-muted-foreground">
                                            {project.description || 'No description'}
                                        </p>
                                    </div>
                                </div>
                                {selectedProject?.id === project.id && (
                                    <Check className="h-4 w-4 text-primary" />
                                )}
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
