'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProjectSelectorProps {
    projects: Array<{ id: number; name: string; path_with_namespace: string }>;
    currentProjectId: string;
}

export default function ProjectSelector({ projects, currentProjectId }: ProjectSelectorProps) {
    const router = useRouter();
    const pathname = usePathname();

    const handleProjectChange = (newProjectId: string) => {
        if (newProjectId === currentProjectId) return;

        // Replace project ID in current URL
        // Assumes URL structure is /[projectId]/...
        // If we are at /[projectId]/issues, it becomes /[newProjectId]/issues
        const newPath = pathname.replace(/^\/\d+/, `/${newProjectId}`);
        router.push(newPath);
    };

    return (
        <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Project:</span>
            <Select value={currentProjectId} onValueChange={handleProjectChange}>
                <SelectTrigger className="w-[300px] bg-background">
                    <SelectValue placeholder="Select project..." />
                </SelectTrigger>
                <SelectContent>
                    {projects.map(project => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                            <div className="flex flex-col text-left">
                                <span className="font-medium">{project.name}</span>
                                <span className="text-xs text-muted-foreground">{project.path_with_namespace}</span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
