'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    X, ChevronDown, Calendar, Flag, User as UserIcon,
    Tag, Folder, ArrowLeft, ChevronRight
} from 'lucide-react';
import { Project, User, Label, QAStatus } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { getUserProjects, getProjectUsers, getProjectLabelsAction } from '@/app/actions/project';
import { createIssue } from '@/app/actions/issues';
import Image from 'next/image';

interface CreateIssueWizardProps {
    onClose?: () => void;
    onCreate?: (data: any) => void;
}

export const CreateIssueWizard: React.FC<CreateIssueWizardProps> = ({ onClose, onCreate }) => {
    const { toast } = useToast();
    const router = useRouter();

    // Step: 'project' | 'form'
    const [step, setStep] = useState<'project' | 'form'>('project');
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isLoadingProjects, setIsLoadingProjects] = useState(true);
    const [projects, setProjects] = useState<Project[]>([]);

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [titleError, setTitleError] = useState('');

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

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (assigneeRef.current && !assigneeRef.current.contains(event.target as Node)) {
                setShowAssigneeDropdown(false);
            }
            if (labelsRef.current && !labelsRef.current.contains(event.target as Node)) {
                setShowLabelDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load projects
    useEffect(() => {
        if (step === 'project') {
            setIsLoadingProjects(true);
            getUserProjects().then((data) => {
                setProjects(data);
                setIsLoadingProjects(false);
            }).catch(err => {
                console.error("Failed to load projects", err);
                setIsLoadingProjects(false);
            });
        }
    }, [step]);

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

    const handleSubmit = async () => {
        if (!title.trim()) {
            setTitleError('This field is required.');
            return;
        }

        if (!selectedProject) return;

        const issueData = {
            projectId: selectedProject.id,
            title,
            description,
            assigneeId: assignee?.id,
            labels: selectedLabels.map(l => l.title).join(','), // Send comma separated string as expected by action
        };

        if (onCreate) {
            await onCreate(issueData);
            handleClose();
        } else {
            try {
                await createIssue(selectedProject.id, issueData);
                toast({
                    title: "Issue created",
                    description: "The issue has been created successfully.",
                });
                // Navigate to the project board
                router.push(`/${selectedProject.id}`);
            } catch (error) {
                console.error(error);
                toast({
                    title: "Error",
                    description: "Failed to create issue.",
                    variant: "destructive"
                });
            }
        }
    };

    // --- RENDER: Project Selection Step ---
    if (step === 'project') {
        return (
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                        <h2 className="text-lg font-bold text-gray-800">Select Project</h2>
                        <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6">
                        <p className="text-gray-500 mb-4 text-sm">Choose the project where you want to create the issue.</p>
                        <div className="grid grid-cols-1 gap-3">
                            {isLoadingProjects ? (
                                [1, 2, 3].map(i => (
                                    <div key={i} className="p-4 border border-gray-200 rounded-lg flex items-center gap-4">
                                        <Skeleton className="w-10 h-10 rounded" />
                                        <div className="flex-1">
                                            <Skeleton className="w-[40%] h-5 mb-2" />
                                            <Skeleton className="w-[70%] h-3.5" />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                projects.map(proj => (
                                    <button
                                        key={proj.id}
                                        onClick={() => handleProjectSelect(proj)}
                                        className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-muted hover:shadow-sm transition-all text-left group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary">
                                                <Folder size={20} />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-foreground group-hover:text-primary">{proj.name}</h3>
                                                <p className="text-sm text-muted-foreground">{proj.description}</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="text-muted-foreground group-hover:text-primary/50" size={20} />
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- RENDER: Issue Form Step ---
    return (
        <div className="fixed inset-0 bg-background z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-200">

            {/* Header */}
            <header className="px-6 py-4 border-b border-border flex items-center justify-between bg-card shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setStep('project')}
                        className="p-2 -ml-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                        title="Back to Project Selection"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 leading-tight">New Issue</h1>
                        <div className="text-sm text-gray-500 flex items-center gap-1.5 leading-tight">
                            <span className="font-medium text-gray-700">{selectedProject?.name}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleClose} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 shadow-sm transition-colors"
                    >
                        Create issue
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto">
                <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left Column: Form Inputs */}
                    <div className="lg:col-span-8 space-y-6">

                        {/* Type Selector (Mock) */}
                        <div className="w-48">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Type</label>
                            <div className="relative">
                                <select className="w-full appearance-none bg-card border border-input text-foreground py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                                    <option>Issue</option>
                                    <option>Incident</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-3 text-muted-foreground pointer-events-none" size={16} />
                            </div>
                        </div>

                        {/* Title */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Title (required)</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => { setTitle(e.target.value); setTitleError(''); }}
                                placeholder="Add a title"
                                autoFocus
                                className={`w-full px-4 py-2.5 bg-card border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-base ${titleError ? 'border-destructive' : 'border-input'}`}
                            />
                            {titleError && <p className="mt-1 text-sm text-destructive">{titleError}</p>}
                        </div>

                        {/* Description */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-bold text-foreground">Description</label>
                                <div className="relative group">
                                    <button className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">
                                        Choose a template <ChevronDown size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="border border-input rounded-lg overflow-hidden bg-card focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-shadow">
                                {/* Mock Toolbar */}
                                <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center gap-2 text-gray-600">
                                    <span className="text-xs font-semibold px-2 py-1 rounded hover:bg-gray-200 cursor-pointer">Normal text</span>
                                    <div className="w-px h-4 bg-gray-300 mx-1"></div>
                                    <button className="p-1 hover:bg-gray-200 rounded font-bold text-xs serif">B</button>
                                    <button className="p-1 hover:bg-gray-200 rounded italic text-xs serif">I</button>
                                    <button className="p-1 hover:bg-gray-200 rounded line-through text-xs serif">S</button>
                                </div>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full h-80 p-4 resize-none focus:outline-none text-sm leading-relaxed text-foreground bg-card"
                                />
                                <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex justify-between">
                                    <span>Markdown supported</span>
                                    <button className="hover:text-gray-800">Switch to plain text editing</button>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Sidebar Metadata */}
                    <div className="lg:col-span-4 space-y-6">

                        {/* Assignee */}
                        <div className="pb-4 border-b border-gray-200 relative" ref={assigneeRef}>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-bold text-foreground">Assignee</span>
                                <button
                                    onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                                    className="text-sm text-primary hover:underline"
                                >
                                    Edit
                                </button>
                            </div>

                            {assignee ? (
                                <div className="flex items-center gap-2 mt-2">
                                    <Image
                                        src={assignee.avatarUrl}
                                        alt={`${assignee.name} avatar`}
                                        width={24}
                                        height={24}
                                        className="h-6 w-6 rounded-full object-cover"
                                        unoptimized
                                    />
                                    <span className="text-sm text-foreground font-medium">{assignee.name}</span>
                                    <button onClick={() => setAssignee(undefined)} className="ml-auto text-muted-foreground hover:text-destructive"><X size={14} /></button>
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground mt-1">None - <span className="cursor-pointer hover:text-primary" onClick={() => setAssignee(users[0])}>assign yourself</span></div>
                            )}

                            {showAssigneeDropdown && (
                                <div className="absolute top-8 right-0 w-64 bg-popover border border-border shadow-xl rounded-lg z-10 py-1">
                                    <div className="px-3 py-2 border-b border-gray-100 text-xs font-bold text-gray-500">Assign to</div>
                                    {users.map(u => (
                                        <button
                                            key={u.id}
                                            onClick={() => { setAssignee(u); setShowAssigneeDropdown(false); }}
                                            className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
                                        >
                                            <Image
                                                src={u.avatarUrl}
                                                alt={`${u.name} avatar`}
                                                width={20}
                                                height={20}
                                                className="h-5 w-5 rounded-full object-cover"
                                                unoptimized
                                            />
                                            <span className="text-sm text-gray-700">{u.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Labels */}
                        <div className="pb-4 border-b border-border relative" ref={labelsRef}>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-bold text-foreground">Labels</span>
                                <button
                                    onClick={() => setShowLabelDropdown(!showLabelDropdown)}
                                    className="text-sm text-primary hover:underline"
                                >
                                    Edit
                                </button>
                            </div>

                            {selectedLabels.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {selectedLabels.map(l => (
                                        <span key={l.id} className="px-2 py-1 rounded text-xs font-medium border border-transparent flex items-center gap-1" style={{ backgroundColor: `${l.color}15`, color: l.color, borderColor: `${l.color}30` }}>
                                            {l.title}
                                            <button
                                                onClick={() => toggleLabel(l)}
                                                className="hover:bg-black/10 rounded p-0.5 transition-colors"
                                            >
                                                <X size={12} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm text-gray-500 mt-1">None</div>
                            )}

                            {showLabelDropdown && (
                                <div className="absolute top-8 right-0 w-64 bg-popover border border-border shadow-xl rounded-lg z-10 py-1">
                                    <div className="px-3 py-2 border-b border-gray-100 text-xs font-bold text-gray-500">Add Labels</div>
                                    {labels.map(l => {
                                        const isSelected = !!selectedLabels.find(sl => sl.id === l.id);
                                        return (
                                            <button
                                                key={l.id}
                                                onClick={() => toggleLabel(l)}
                                                className="w-full text-left px-3 py-2 hover:bg-muted flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="w-3 h-3 rounded bg-muted-foreground/20" style={{ backgroundColor: l.color }}></span>
                                                    <span className="text-sm text-foreground">{l.title}</span>
                                                </div>
                                                {isSelected && <div className="text-primary text-xs font-bold">✓</div>}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Milestone (Mock) */}
                        <div className="pb-4 border-b border-border">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-bold text-foreground">Milestone</span>
                                <button className="text-sm text-primary hover:underline">Edit</button>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">None</div>
                        </div>

                        {/* Dates (Mock) */}
                        <div className="pb-4 border-b border-border">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-bold text-foreground">Dates</span>
                                <button className="text-sm text-primary hover:underline">Edit</button>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">Start: None</div>
                            <div className="text-sm text-muted-foreground mt-1">Due: None</div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};
