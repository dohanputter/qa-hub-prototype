'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { useImageUpload } from '@/hooks/useImageUpload';
import {
    X, ChevronDown, Calendar, Flag, User as UserIcon,
    Tag, Folder, ArrowLeft, ChevronRight, Search, Layers
} from 'lucide-react';
import { Project, User, Label, QAStatus } from '@/types';
import { useToast } from '@/components/ui/useToast';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRouter, useParams } from 'next/navigation';
import { getUserProjects, getProjectUsers, getProjectLabelsAction } from '@/app/actions/project';
import { createIssue } from '@/app/actions/issues';
import { uploadAttachment } from '@/app/actions/uploadAttachment';
import { logger } from '@/lib/logger';
import Image from 'next/image';
import { TiptapEditor } from '@/components/qa/TiptapEditor';
import { cn } from '@/lib/utils';
import { tiptapToMarkdown } from '@/lib/tiptapUtils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface CreateIssueWizardProps {
    onClose?: () => void;
    onCreate?: (data: {
        projectId: number;
        title: string;
        description: string;
        assigneeId?: number;
        labels: string;
    }) => Promise<void>;
}

export const CreateIssueWizard: React.FC<CreateIssueWizardProps> = ({ onClose, onCreate }) => {
    const { toast } = useToast();
    const router = useRouter();

    // Step: 'project' | 'form'
    const [step, setStep] = useState<'project' | 'form'>('project');
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isLoadingProjects, setIsLoadingProjects] = useState(true);
    const [projects, setProjects] = useState<Project[]>([]);
    const [projectSearch, setProjectSearch] = useState('');

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState<any>(null); // Tiptap JSON content
    const [titleError, setTitleError] = useState('');
    const [issueType, setIssueType] = useState('issue');

    // Sidebar State
    const [assignee, setAssignee] = useState<User | undefined>(undefined);
    const [selectedLabels, setSelectedLabels] = useState<Label[]>([]);

    // Data State
    const [users, setUsers] = useState<User[]>([]);
    const [labels, setLabels] = useState<Label[]>([]);

    // Dropdown Toggles
    const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
    const [showLabelDropdown, setShowLabelDropdown] = useState(false);

    // Refs for click outside detection
    const assigneeRef = useRef<HTMLDivElement>(null);
    const labelsRef = useRef<HTMLDivElement>(null);

    useOnClickOutside(assigneeRef, () => setShowAssigneeDropdown(false));
    useOnClickOutside(labelsRef, () => setShowLabelDropdown(false));

    const params = useParams();
    const groupId = params?.projectId ? Number(params.projectId) : undefined;

    // Load projects
    useEffect(() => {
        if (step === 'project') {
            setIsLoadingProjects(true);
            getUserProjects(groupId).then((data) => {
                setProjects(data);
                setIsLoadingProjects(false);
            }).catch(err => {
                logger.error("Failed to load projects", err);
                setIsLoadingProjects(false);
            });
        }
    }, [step, groupId]);

    // Load project data (users, labels) when project is selected
    useEffect(() => {
        if (selectedProject) {
            getProjectUsers(selectedProject.id).then(setUsers);
            getProjectLabelsAction(selectedProject.id).then(setLabels);
        }
    }, [selectedProject]);

    const handleClose = () => {
        if (onClose) onClose();
        else router.back();
    };

    const handleProjectSelect = (project: Project) => {
        setSelectedProject(project);
        setStep('form');
    };

    const toggleLabel = (label: Label) => {
        if (selectedLabels.find(l => l.id === label.id)) {
            setSelectedLabels(selectedLabels.filter(l => l.id !== label.id));
        } else {
            setSelectedLabels([...selectedLabels, label]);
        }
    };

    const { handleImagePaste } = useImageUpload(selectedProject?.id);

    const handleSubmit = async () => {
        if (!title.trim()) {
            setTitleError('Title is required');
            return;
        }

        if (!selectedProject) return;

        const issueData = {
            projectId: selectedProject.id,
            title,
            description: description ? tiptapToMarkdown(description) : '',
            assigneeId: assignee?.id,
            labels: selectedLabels.map(l => l.title).join(','),
        };

        if (onCreate) {
            await onCreate(issueData);
            handleClose();
        } else {
            try {
                const result = await createIssue(selectedProject.id, issueData);
                toast({
                    title: "Issue created",
                    description: "The issue has been created successfully.",
                });

                const groupId = typeof window !== 'undefined' ? sessionStorage.getItem('lastSelectedGroup') : null;

                if (groupId && result?.iid) {
                    router.push(`/${groupId}/qa/${result.iid}`);
                } else {
                    router.push(groupId ? `/${groupId}` : '/projects');
                }
            } catch (error) {
                logger.error('Failed to create issue', error);
                toast({
                    title: "Error",
                    description: "Failed to create issue.",
                    variant: "destructive"
                });
            }
        }
    };

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
        p.description?.toLowerCase().includes(projectSearch.toLowerCase())
    );

    // --- RENDER: Project Selection Step ---
    if (step === 'project') {
        return (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-card/50 border border-border/50 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden backdrop-blur-xl flex flex-col max-h-[80vh]">
                    <div className="px-6 py-5 border-b border-border/50 flex justify-between items-center bg-muted/20">
                        <div>
                            <h2 className="text-xl font-bold text-foreground tracking-tight">Select Project</h2>
                            <p className="text-sm text-muted-foreground">Choose where to create this issue</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={handleClose} className="rounded-full hover:bg-muted/50">
                            <X size={20} />
                        </Button>
                    </div>

                    <div className="p-4 border-b border-border/50 bg-background/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <input
                                type="text"
                                placeholder="Search projects..."
                                value={projectSearch}
                                onChange={(e) => setProjectSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="p-4 overflow-y-auto flex-1 space-y-2">
                        {isLoadingProjects ? (
                            [1, 2, 3].map(i => (
                                <div key={i} className="p-4 border border-border/40 rounded-xl flex items-center gap-4 bg-card/30">
                                    <Skeleton className="w-10 h-10 rounded-lg" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="w-[40%] h-5" />
                                        <Skeleton className="w-[70%] h-3.5" />
                                    </div>
                                </div>
                            ))
                        ) : (
                            filteredProjects.map(proj => (
                                <button
                                    key={proj.id}
                                    onClick={() => handleProjectSelect(proj)}
                                    className="w-full flex items-center justify-between p-4 border border-border/40 rounded-xl hover:border-primary/30 hover:bg-primary/5 hover:shadow-md transition-all text-left group bg-card/30"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-lg flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform duration-300">
                                            <Folder size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{proj.name}</h3>
                                            <p className="text-sm text-muted-foreground line-clamp-1">{proj.description || 'No description'}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="text-muted-foreground/50 group-hover:text-primary/50 group-hover:translate-x-1 transition-all" size={18} />
                                </button>
                            ))
                        )}
                        {!isLoadingProjects && filteredProjects.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground">
                                <Folder className="mx-auto h-12 w-12 opacity-20 mb-3" />
                                <p>No projects found</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // --- RENDER: Issue Form Step ---
    return (
        <div className="fixed inset-0 bg-background z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">

            {/* Header */}
            <header className="px-6 py-4 border-b border-border/40 flex items-center justify-between bg-background/80 backdrop-blur-xl sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setStep('project')}
                        className="rounded-full hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                        title="Change Project"
                    >
                        <ArrowLeft size={20} />
                    </Button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{selectedProject?.name}</span>
                            <span>/</span>
                            <span>New Issue</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="ghost" onClick={handleClose} className="text-muted-foreground hover:text-foreground">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105"
                    >
                        Create Issue
                    </Button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto bg-gradient-to-b from-background to-muted/10">
                <div className="w-full max-w-[95%] mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10">

                    {/* Left Column: Form Inputs */}
                    <div className="space-y-8">

                        {/* Title Input */}
                        <div className="space-y-2">
                            <textarea
                                value={title}
                                onChange={(e) => {
                                    setTitle(e.target.value);
                                    setTitleError('');
                                    e.target.style.height = 'auto';
                                    e.target.style.height = e.target.scrollHeight + 'px';
                                }}
                                rows={1}
                                placeholder="Issue Title"
                                autoFocus
                                className={cn(
                                    "w-full px-0 py-2 bg-transparent border-0 border-b-2 border-transparent focus:border-primary/20 text-4xl font-bold tracking-tight placeholder:text-muted-foreground/30 focus:ring-0 outline-none transition-all resize-none overflow-hidden min-h-[60px]",
                                    titleError && "border-destructive/50 placeholder:text-destructive/40"
                                )}
                                style={{ outline: 'none', boxShadow: 'none' }}
                            />
                            {titleError && <p className="text-sm text-destructive font-medium animate-in slide-in-from-left-2">{titleError}</p>}
                        </div>

                        {/* Description Editor */}
                        <div className="space-y-2">
                            <TiptapEditor
                                content={description}
                                onChange={(content) => setDescription(content)}
                                members={users.map(u => ({ ...u, avatar_url: u.avatarUrl }))}
                                placeholder="Describe the issue..."
                                onImagePaste={handleImagePaste}
                                className="min-h-[400px] border-border/40 bg-card/50 shadow-sm focus-within:ring-1 focus-within:ring-primary/20"
                            />
                            <p className="text-xs text-muted-foreground text-right px-2">Markdown supported</p>
                        </div>
                    </div>

                    {/* Right Column: Sidebar Metadata */}
                    <div className="space-y-6">
                        <div className="bg-card/50 backdrop-blur-sm border border-border/40 rounded-xl p-5 shadow-sm space-y-6 sticky top-6">

                            {/* Type Selector */}
                            <div className="space-y-3">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</label>
                                <div className="flex bg-muted/50 p-1 rounded-lg">
                                    {['issue', 'incident'].map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setIssueType(t)}
                                            className={cn(
                                                "flex-1 py-1.5 text-sm font-medium rounded-md transition-all capitalize",
                                                issueType === t
                                                    ? "bg-background text-foreground shadow-sm"
                                                    : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="h-px bg-border/40" />

                            {/* Assignee */}
                            <div className="space-y-3 relative" ref={assigneeRef}>
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assignee</label>
                                    <button
                                        onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                                        className="text-xs text-primary hover:underline font-medium"
                                    >
                                        Edit
                                    </button>
                                </div>

                                {assignee ? (
                                    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 border border-border/30">
                                        <Image
                                            src={assignee.avatarUrl}
                                            alt={`${assignee.name} avatar`}
                                            width={32}
                                            height={32}
                                            className="h-8 w-8 rounded-full object-cover ring-2 ring-background"
                                            unoptimized
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">{assignee.name}</p>
                                            <p className="text-xs text-muted-foreground truncate">@{assignee.username}</p>
                                        </div>
                                        <button onClick={() => setAssignee(undefined)} className="text-muted-foreground hover:text-destructive p-1">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-sm text-muted-foreground italic p-2">
                                        No assignee
                                        <span className="not-italic ml-1 cursor-pointer text-primary hover:underline" onClick={() => setAssignee(users[0])}>(assign me)</span>
                                    </div>
                                )}

                                {showAssigneeDropdown && (
                                    <div className="absolute top-full mt-2 right-0 w-full bg-popover border border-border shadow-xl rounded-xl z-20 overflow-hidden animate-in zoom-in-95 duration-100">
                                        <div className="max-h-60 overflow-y-auto p-1">
                                            {users.map(u => (
                                                <button
                                                    key={u.id}
                                                    onClick={() => { setAssignee(u); setShowAssigneeDropdown(false); }}
                                                    className="w-full text-left px-3 py-2 hover:bg-muted rounded-lg flex items-center gap-3 transition-colors"
                                                >
                                                    <Image
                                                        src={u.avatarUrl}
                                                        alt={`${u.name} avatar`}
                                                        width={24}
                                                        height={24}
                                                        className="h-6 w-6 rounded-full object-cover"
                                                        unoptimized
                                                    />
                                                    <span className="text-sm text-foreground">{u.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="h-px bg-border/40" />

                            {/* Labels */}
                            <div className="space-y-3 relative" ref={labelsRef}>
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Labels</label>
                                    <button
                                        onClick={() => setShowLabelDropdown(!showLabelDropdown)}
                                        className="text-xs text-primary hover:underline font-medium"
                                    >
                                        Edit
                                    </button>
                                </div>

                                <div className="flex flex-wrap gap-2 min-h-[2rem]">
                                    {selectedLabels.length > 0 ? (
                                        selectedLabels.map(l => (
                                            <Badge
                                                key={l.id}
                                                variant="secondary"
                                                className="flex items-center gap-1 px-2.5 py-0.5 h-7 rounded-md border font-medium transition-colors hover:bg-opacity-20"
                                                style={{
                                                    backgroundColor: `color-mix(in srgb, ${l.color} 15%, transparent)`,
                                                    color: l.color,
                                                    borderColor: `color-mix(in srgb, ${l.color} 30%, transparent)`
                                                }}
                                            >
                                                {l.title}
                                                <button
                                                    onClick={() => toggleLabel(l)}
                                                    className="hover:opacity-70 ml-1"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </Badge>
                                        ))
                                    ) : (
                                        <span className="text-sm text-muted-foreground italic">No labels</span>
                                    )}
                                </div>

                                {showLabelDropdown && (
                                    <div className="absolute top-full mt-2 right-0 w-full bg-popover border border-border shadow-xl rounded-xl z-20 overflow-hidden animate-in zoom-in-95 duration-100">
                                        <div className="max-h-60 overflow-y-auto p-1">
                                            {labels
                                                .filter(l => !l.title.toLowerCase().startsWith('qa:'))
                                                .map(l => {
                                                    const isSelected = !!selectedLabels.find(sl => sl.id === l.id);
                                                    return (
                                                        <button
                                                            key={l.id}
                                                            onClick={() => toggleLabel(l)}
                                                            className="w-full text-left px-3 py-2 hover:bg-muted rounded-lg flex items-center justify-between transition-colors"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }}></span>
                                                                <span className="text-sm text-foreground">{l.title}</span>
                                                            </div>
                                                            {isSelected && <div className="text-primary text-xs font-bold">✓</div>}
                                                        </button>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
