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
import { Users, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchUserGroups } from '@/app/actions/group';

interface Group {
    id: number;
    name: string;
    full_path: string;
    description: string | null;
    web_url: string;
    avatar_url: string | null;
}

export function GroupSelector() {
    const [open, setOpen] = useState(false);
    const [groups, setGroups] = useState<Group[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const data = await fetchUserGroups();
                setGroups(data);

                // Check if there's a groupId in URL params
                const groupIdParam = searchParams.get('groupId');
                if (groupIdParam) {
                    const group = data.find((g: Group) => g.id === Number(groupIdParam));
                    if (group) {
                        setSelectedGroup(group);
                    }
                } else if (data.length > 0 && !selectedGroup) {
                    // Default to the first group if none selected
                    setSelectedGroup(data[0]);
                    const params = new URLSearchParams(searchParams.toString());
                    params.set('groupId', data[0].id.toString());
                    router.push(`?${params.toString()}`);
                }
            } catch (error) {
                console.error('Failed to fetch groups', error);
            }
        };
        fetchGroups();
    }, []); // Intentionally excluding selectedGroup from deps to avoid infinite loop

    const handleSelect = (group: Group) => {
        setSelectedGroup(group);
        setOpen(false);

        // Update URL with selected group, remove projectId since it's no longer used for viewing
        const params = new URLSearchParams(searchParams.toString());
        params.set('groupId', group.id.toString());
        params.delete('projectId'); // Remove project filter from URL
        router.push(`?${params.toString()}`);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button className="w-full text-left px-3 py-2.5 rounded-lg bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 transition-all duration-200 group">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Users className="h-4 w-4 text-gray-400 group-hover:text-gray-300 flex-shrink-0" />
                            <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-xs text-gray-500 font-medium">Group</span>
                                {selectedGroup ? (
                                    <span className="text-sm text-gray-200 font-medium truncate">{selectedGroup.name}</span>
                                ) : (
                                    <span className="text-sm text-gray-400">Select Group</span>
                                )}
                            </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-gray-400 rotate-90 flex-shrink-0" />
                    </div>
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-[#1e1e2f] border-gray-700 text-gray-100">
                <DialogHeader>
                    <DialogTitle className="text-gray-100">Select Group</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <p className="text-sm text-gray-400">
                        Choose the GitLab group you want to work with. Projects will be filtered by the selected group.
                    </p>
                    <div className="space-y-2">
                        {groups.map((group) => (
                            <div
                                key={group.id}
                                className={cn(
                                    "flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all duration-200",
                                    selectedGroup?.id === group.id
                                        ? "border-indigo-500 bg-indigo-500/10 hover:bg-indigo-500/20"
                                        : "border-gray-700 hover:bg-gray-800 hover:border-gray-600"
                                )}
                                onClick={() => handleSelect(group)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "p-2 rounded-md",
                                        selectedGroup?.id === group.id ? "bg-indigo-500/20" : "bg-gray-800"
                                    )}>
                                        <Users className={cn(
                                            "h-5 w-5",
                                            selectedGroup?.id === group.id ? "text-indigo-400" : "text-gray-400"
                                        )} />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-100">{group.name}</h4>
                                        <p className="text-sm text-gray-400">
                                            {group.description || group.full_path}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {selectedGroup?.id === group.id && (
                                        <Check className="h-4 w-4 text-indigo-400" />
                                    )}
                                    <ChevronRight className="h-4 w-4 text-gray-500" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
