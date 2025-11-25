'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Folder, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getUserProjects } from '@/app/actions/project';

interface Project {
    id: number;
    name: string;
    description: string | null;
    webUrl: string;
}

interface CreateIssueProjectSelectorProps {
    open: boolean;
    onSelect: (projectId: number) => void;
    onOpenChange?: (open: boolean) => void;
}

export function CreateIssueProjectSelector({ open, onSelect, onOpenChange }: CreateIssueProjectSelectorProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
    const searchParams = useSearchParams();

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                // Get groupId from URL params to filter projects
                const groupIdParam = searchParams.get('groupId');
                const groupId = groupIdParam ? Number(groupIdParam) : undefined;

                const data = await getUserProjects(groupId);
                setProjects(data);

                // Check if there's already a selected project in URL
                const projectIdParam = searchParams.get('projectId');
                if (projectIdParam) {
                    setSelectedProjectId(Number(projectIdParam));
                }
            } catch (error) {
                console.error('Failed to fetch projects', error);
            }
        };

        if (open) {
            fetchProjects();
        }
    }, [open, searchParams]);

    const handleSelect = (project: Project) => {
        setSelectedProjectId(project.id);
        onSelect(project.id);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-[#1e1e2f] border-gray-700 text-gray-100">
                <DialogHeader>
                    <DialogTitle className="text-gray-100">Select Project for New Issue</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <p className="text-sm text-gray-400">
                        Choose the project where you want to create the issue.
                    </p>
                    <div className="space-y-2">
                        {projects.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                No projects available. Please select a group first.
                            </div>
                        ) : (
                            projects.map((project) => (
                                <div
                                    key={project.id}
                                    className={cn(
                                        "flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all duration-200",
                                        selectedProjectId === project.id
                                            ? "border-indigo-500 bg-indigo-500/10 hover:bg-indigo-500/20"
                                            : "border-gray-700 hover:bg-gray-800 hover:border-gray-600"
                                    )}
                                    onClick={() => handleSelect(project)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "p-2 rounded-md",
                                            selectedProjectId === project.id ? "bg-indigo-500/20" : "bg-gray-800"
                                        )}>
                                            <Folder className={cn(
                                                "h-5 w-5",
                                                selectedProjectId === project.id ? "text-indigo-400" : "text-gray-400"
                                            )} />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-gray-100">{project.name}</h4>
                                            <p className="text-sm text-gray-400">
                                                {project.description || 'No description'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {selectedProjectId === project.id && (
                                            <Check className="h-4 w-4 text-indigo-400" />
                                        )}
                                        <ChevronRight className="h-4 w-4 text-gray-500" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
