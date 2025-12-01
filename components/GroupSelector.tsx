'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Folder, Layers } from 'lucide-react';

interface GroupSelectorProps {
    groups: Array<{ id: number; name: string; full_path: string }>;
    currentGroupId: string;
}

export default function GroupSelector({ groups, currentGroupId }: GroupSelectorProps) {
    const router = useRouter();
    const pathname = usePathname();

    const handleGroupChange = (newGroupId: string) => {
        if (newGroupId === currentGroupId) return;

        // Replace group ID in current URL
        // Assumes URL structure is /[groupId]/...
        const newPath = pathname.replace(/^\/\d+/, `/${newGroupId}`);

        // If we are at root or just switching groups, ensure we go to the group dashboard
        if (pathname === '/' || pathname === '/projects') {
            router.push(`/${newGroupId}`);
        } else {
            router.push(newPath);
        }
    };

    return (
        <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Layers size={16} /> Group:
            </span>
            <Select value={currentGroupId} onValueChange={handleGroupChange}>
                <SelectTrigger className="w-[300px] bg-background">
                    <SelectValue placeholder="Select group..." />
                </SelectTrigger>
                <SelectContent>
                    {groups.map(group => (
                        <SelectItem key={group.id} value={group.id.toString()}>
                            <div className="flex flex-col text-left">
                                <span className="font-medium">{group.name}</span>
                                <span className="text-xs text-muted-foreground">{group.full_path}</span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
