'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    X, ChevronDown, Calendar, Flag, User as UserIcon,
    Tag, Folder, ArrowLeft, ChevronRight
} from 'lucide-react';
import { Project, User, Label, QAStatus } from '@/types';
import { PROJECTS, USERS, LABELS, createIssue as createMockIssue } from '@/lib/mockData';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';

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

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [titleError, setTitleError] = useState('');

    // Sidebar State
    const [assignee, setAssignee] = useState<User | undefined>(undefined);
    const [selectedLabels, setSelectedLabels] = useState<Label[]>([]);

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

    // Simulate project loading
    useEffect(() => {
        if (step === 'project') {
            setIsLoadingProjects(true);
            const timer = setTimeout(() => setIsLoadingProjects(false), 600);
            return () => clearTimeout(timer);
        }
    }, [step]);

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

        const issueData = {
            projectId: selectedProject?.id,
            title,
            description,
            assignee,
            labels: selectedLabels,
        };

        if (onCreate) {
            await onCreate(issueData);
            handleClose();
        } else {
            // Default behavior: create in mock data and navigate
            createMockIssue(issueData);
            toast({
                title: "Issue created",
                description: "The issue has been created successfully.",
            });
            // Navigate to the project board
            router.push(`/${selectedProject?.id}`);
        }
    };

    // --- RENDER: Project Selection Step ---
    if (step === 'project') {
        return (
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
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
                                PROJECTS.map(proj => (
                                    <button
                                        key={proj.id}
                                        onClick={() => handleProjectSelect(proj)}
                                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 hover:shadow-sm transition-all text-left group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-500 group-hover:bg-white group-hover:text-indigo-600">
                                                <Folder size={20} />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-800 group-hover:text-indigo-700">{proj.name}</h3>
                                                <p className="text-sm text-gray-500">{proj.description}</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="text-gray-300 group-hover:text-indigo-400" size={20} />
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
        <div className="fixed inset-0 bg-white z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-200">

            {/* Header */}
            <header className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white shrink-0">
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
                        className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
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
                                <select className="w-full appearance-none bg-white border border-gray-300 text-gray-700 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                                    <option>Issue</option>
                                    <option>Incident</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-3 text-gray-400 pointer-events-none" size={16} />
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
                                className={`w-full px-4 py-2.5 bg-white border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base ${titleError ? 'border-red-500' : 'border-gray-300'}`}
                            />
                            {titleError && <p className="mt-1 text-sm text-red-500">{titleError}</p>}
                        </div>

                        {/* Description */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-bold text-gray-700">Description</label>
                                <div className="relative group">
                                    <button className="text-sm text-gray-500 hover:text-indigo-600 flex items-center gap-1">
                                        Choose a template <ChevronDown size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="border border-gray-300 rounded-lg overflow-hidden bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-shadow">
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
                                    className="w-full h-80 p-4 resize-none focus:outline-none text-sm leading-relaxed text-gray-800 bg-white"
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
                                <span className="text-sm font-bold text-gray-700">Assignee</span>
                                <button
                                    onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                                    className="text-sm text-indigo-600 hover:underline"
                                >
                                    Edit
                                </button>
                            </div>

                            {assignee ? (
                                <div className="flex items-center gap-2 mt-2">
                                    <img src={assignee.avatarUrl} className="w-6 h-6 rounded-full" />
                                    <span className="text-sm text-gray-800 font-medium">{assignee.name}</span>
                                    <button onClick={() => setAssignee(undefined)} className="ml-auto text-gray-400 hover:text-red-500"><X size={14} /></button>
                                </div>
                            ) : (
                                <div className="text-sm text-gray-500 mt-1">None - <span className="cursor-pointer hover:text-indigo-600" onClick={() => setAssignee(USERS[0])}>assign yourself</span></div>
                            )}

                            {showAssigneeDropdown && (
                                <div className="absolute top-8 right-0 w-64 bg-white border border-gray-200 shadow-xl rounded-lg z-10 py-1">
                                    <div className="px-3 py-2 border-b border-gray-100 text-xs font-bold text-gray-500">Assign to</div>
                                    {USERS.map(u => (
                                        <button
                                            key={u.id}
                                            onClick={() => { setAssignee(u); setShowAssigneeDropdown(false); }}
                                            className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
                                        >
                                            <img src={u.avatarUrl} className="w-5 h-5 rounded-full" />
                                            <span className="text-sm text-gray-700">{u.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Labels */}
                        <div className="pb-4 border-b border-gray-200 relative" ref={labelsRef}>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-bold text-gray-700">Labels</span>
                                <button
                                    onClick={() => setShowLabelDropdown(!showLabelDropdown)}
                                    className="text-sm text-indigo-600 hover:underline"
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
                                <div className="absolute top-8 right-0 w-64 bg-white border border-gray-200 shadow-xl rounded-lg z-10 py-1">
                                    <div className="px-3 py-2 border-b border-gray-100 text-xs font-bold text-gray-500">Add Labels</div>
                                    {LABELS.map(l => {
                                        const isSelected = !!selectedLabels.find(sl => sl.id === l.id);
                                        return (
                                            <button
                                                key={l.id}
                                                onClick={() => toggleLabel(l)}
                                                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="w-3 h-3 rounded bg-gray-200" style={{ backgroundColor: l.color }}></span>
                                                    <span className="text-sm text-gray-700">{l.title}</span>
                                                </div>
                                                {isSelected && <div className="text-indigo-600 text-xs font-bold">✓</div>}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Milestone (Mock) */}
                        <div className="pb-4 border-b border-gray-200">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-bold text-gray-700">Milestone</span>
                                <button className="text-sm text-indigo-600 hover:underline">Edit</button>
                            </div>
                            <div className="text-sm text-gray-500 mt-1">None</div>
                        </div>

                        {/* Dates (Mock) */}
                        <div className="pb-4 border-b border-gray-200">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-bold text-gray-700">Dates</span>
                                <button className="text-sm text-indigo-600 hover:underline">Edit</button>
                            </div>
                            <div className="text-sm text-gray-500 mt-1">Start: None</div>
                            <div className="text-sm text-gray-500 mt-1">Due: None</div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};
