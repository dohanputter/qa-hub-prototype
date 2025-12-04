'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ScrollText, Plus, Search, Trash2, Edit2, Save, X, CheckSquare, AlertCircle, Clock, ArrowLeft } from 'lucide-react';
import { Snippet } from '@/types';
import { getSnippetsAction, createSnippetAction, updateSnippetAction, deleteSnippetAction } from '@/app/actions/snippets';
import { useToast } from '@/components/ui/useToast';
import { useRouter } from 'next/navigation';
import { TiptapEditor } from '@/components/qa/TiptapEditor';
import { tiptapToMarkdown } from '@/lib/tiptap';
import { uploadAttachment } from '@/app/actions/uploadAttachment';
import { getUserProjects, getProjectUsers } from '@/app/actions/project';
import { logger } from '@/lib/logger';
import { useImageUpload } from '@/hooks/useImageUpload';

export const SnippetsManager: React.FC = () => {
    const { toast } = useToast();
    const router = useRouter();
    const [snippets, setSnippets] = useState<Snippet[]>([]);
    const [filter, setFilter] = useState<'all' | 'test_case' | 'issue'>('all');
    const [search, setSearch] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [currentSnippet, setCurrentSnippet] = useState<Partial<Snippet>>({});

    // Editor context state
    const [defaultProjectId, setDefaultProjectId] = useState<number | null>(null);
    const [members, setMembers] = useState<any[]>([]); // TODO: Use GitLabUser[] when available

    // Validation State
    const [titleError, setTitleError] = useState('');
    const [contentError, setContentError] = useState('');

    // Deletion State (Custom Modal)
    const [snippetToDelete, setSnippetToDelete] = useState<number | null>(null);

    const loadContext = useCallback(async () => {
        try {
            const projects = await getUserProjects();
            if (projects && projects.length > 0) {
                const pid = projects[0].id;
                setDefaultProjectId(pid);
                const projectMembers = await getProjectUsers(pid);
                setMembers(projectMembers);
            }
        } catch (error) {
            logger.error("Failed to load context for editor", error);
        }
    }, []);

    const loadSnippets = useCallback(async () => {
        try {
            const data = await getSnippetsAction();
            setSnippets(data);
        } catch (error) {
            logger.error("Failed to load snippets", error);
            toast({
                title: "Error",
                description: "Failed to load snippets",
                variant: "destructive"
            });
        }
    }, [toast]);

    useEffect(() => {
        loadSnippets();
        loadContext();
    }, [loadSnippets, loadContext]);

    const refreshSnippets = () => {
        loadSnippets();
    };

    const filteredSnippets = snippets.filter(s => {
        const matchesSearch = s.title.toLowerCase().includes(search.toLowerCase()) ||
            s.content.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === 'all' || s.type === filter;
        return matchesSearch && matchesFilter;
    });

    const handleEdit = (snippet: Snippet) => {
        setCurrentSnippet(snippet);
        setIsEditing(true);
        setTitleError('');
        setContentError('');
    };

    const handleCreate = () => {
        setCurrentSnippet({ title: '', content: '', type: 'test_case' });
        setIsEditing(true);
        setTitleError('');
        setContentError('');
    };

    const requestDelete = (id: number) => {
        setSnippetToDelete(id);
    };

    const confirmDelete = async () => {
        if (snippetToDelete !== null) {
            try {
                await deleteSnippetAction(snippetToDelete);
                refreshSnippets();
                toast({
                    title: "Snippet deleted",
                    description: "Snippet deleted successfully",
                    variant: "default",
                });
                // Close editor if we deleted the currently edited snippet
                if (currentSnippet.id === snippetToDelete) {
                    setIsEditing(false);
                    setCurrentSnippet({});
                }
            } catch (error) {
                toast({
                    title: "Error",
                    description: "Failed to delete snippet",
                    variant: "destructive"
                });
            }
            setSnippetToDelete(null);
        }
    };

    const handleEditorChange = (jsonContent: any) => { // Tiptap JSONContent
        const markdown = tiptapToMarkdown(jsonContent);
        setCurrentSnippet(prev => ({ ...prev, content: markdown }));
        setContentError('');
    };

    const { handleImagePaste } = useImageUpload(defaultProjectId || undefined);

    const handleSave = async () => {
        let isValid = true;

        if (!currentSnippet.title?.trim()) {
            setTitleError('This field is required.');
            isValid = false;
        } else {
            setTitleError('');
        }

        if (!currentSnippet.content?.trim()) {
            setContentError('This field is required.');
            isValid = false;
        } else {
            setContentError('');
        }

        if (!isValid) return;

        try {
            if (currentSnippet.id) {
                await updateSnippetAction(currentSnippet as Snippet);
                toast({
                    title: "Snippet updated",
                    description: "Snippet updated successfully",
                    variant: "default",
                });
            } else {
                await createSnippetAction(currentSnippet as Omit<Snippet, 'id' | 'updatedAt'>);
                toast({
                    title: "Snippet created",
                    description: "Snippet created successfully",
                    variant: "default",
                });
            }
            setIsEditing(false);
            refreshSnippets();
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to save snippet",
                variant: "destructive"
            });
        }
    };

    const handleBack = () => {
        router.back();
    };

    return (
        <div className="p-8 max-w-7xl mx-auto h-full flex flex-col relative">
            <div className="flex justify-between items-center mb-8 shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleBack}
                        className="p-2 bg-card border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Back"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
                            <ScrollText className="text-primary" /> Snippets Library
                        </h2>
                        <p className="text-muted-foreground mt-1">Manage reusable content for test cases and issues.</p>
                    </div>
                </div>
                <button
                    onClick={handleCreate}
                    className="bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2"
                >
                    <Plus size={18} /> New Snippet
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex gap-8 flex-1 min-h-0">

                {/* Left Side: List */}
                <div className="w-1/3 bg-card rounded-xl shadow-sm border border-border flex flex-col overflow-hidden">
                    {/* Search & Filter */}
                    <div className="p-4 border-b border-border space-y-3 bg-muted/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
                            <input
                                type="text"
                                placeholder="Search snippets..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                            />
                        </div>
                        <div className="flex p-1 bg-muted rounded-lg">
                            {['all', 'test_case', 'issue'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f as 'all' | 'test_case' | 'issue')}
                                    className={`flex-1 py-1 text-xs font-medium rounded-md capitalize transition-all ${filter === f ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    {f.replace('_', ' ')}s
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto">
                        {filteredSnippets.length > 0 ? (
                            <div className="divide-y divide-border">
                                {filteredSnippets.map(snippet => (
                                    <div
                                        key={snippet.id}
                                        className="p-4 hover:bg-muted/50 cursor-pointer group transition-colors"
                                        onClick={() => handleEdit(snippet)}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-semibold text-foreground text-sm">{snippet.title}</h4>
                                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${snippet.type === 'test_case'
                                                ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                                : 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                                                }`}>
                                                {snippet.type === 'test_case' ? 'Test Case' : 'Issue'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-2 font-mono mb-3">{snippet.content}</p>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                <Clock size={12} />
                                                <span>
                                                    {new Date(snippet.updatedAt).toLocaleDateString(undefined, {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        requestDelete(snippet.id);
                                                    }}
                                                    className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                                                    title="Delete snippet"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-muted-foreground text-sm">
                                No snippets found.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Editor (or Placeholder) */}
                <div className="flex-1 bg-card rounded-xl shadow-sm border border-border flex flex-col overflow-hidden relative">
                    {isEditing ? (
                        <>
                            <div className="p-4 border-b border-border flex justify-between items-center bg-muted/50">
                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col">
                                        <input
                                            type="text"
                                            value={currentSnippet.title}
                                            onChange={e => { setCurrentSnippet({ ...currentSnippet, title: e.target.value }); setTitleError(''); }}
                                            placeholder="Snippet Title"
                                            className={`text-lg font-bold bg-transparent focus:ring-0 placeholder-muted-foreground text-foreground w-64 border-none p-0 bg-card ${titleError ? 'border-b border-destructive' : ''}`}
                                        />
                                        {titleError && <span className="text-xs text-destructive mt-1">{titleError}</span>}
                                    </div>
                                    <div className="flex items-center bg-card border border-input rounded-lg overflow-hidden">
                                        <button
                                            onClick={() => setCurrentSnippet({ ...currentSnippet, type: 'test_case' })}
                                            className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 ${currentSnippet.type === 'test_case' ? 'bg-blue-500/10 text-blue-500' : 'hover:bg-muted/50 text-muted-foreground'
                                                }`}
                                        >
                                            <CheckSquare size={14} /> Test Case
                                        </button>
                                        <div className="w-px h-full bg-border"></div>
                                        <button
                                            onClick={() => setCurrentSnippet({ ...currentSnippet, type: 'issue' })}
                                            className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 ${currentSnippet.type === 'issue' ? 'bg-orange-500/10 text-orange-500' : 'hover:bg-muted/50 text-muted-foreground'
                                                }`}
                                        >
                                            <AlertCircle size={14} /> Issue
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="px-3 py-1.5 text-muted-foreground hover:bg-muted rounded-lg text-sm font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center gap-2"
                                    >
                                        <Save size={16} /> Save Snippet
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 flex flex-col relative p-4">
                                <TiptapEditor
                                    content={currentSnippet.content}
                                    onChange={handleEditorChange}
                                    members={members}
                                    placeholder="Enter your snippet content here..."
                                    onImagePaste={handleImagePaste}
                                    className="h-full max-h-none"
                                />
                                {contentError && (
                                    <div className="absolute bottom-12 left-6 text-xs text-destructive bg-card/90 px-2 py-1 rounded border border-destructive/20 shadow-sm">
                                        {contentError}
                                    </div>
                                )}
                            </div>
                            <div className="px-4 py-2 bg-muted/50 border-t border-border text-xs text-muted-foreground flex justify-between">
                                <span>Use this snippet to quickly populate Test Cases or Issue descriptions.</span>
                                <span>Markdown Supported</span>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                            <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                                <Edit2 size={32} className="text-muted-foreground/50" />
                            </div>
                            <h3 className="text-lg font-semibold text-muted-foreground">Select a snippet to edit</h3>
                            <p className="text-sm mt-2">Or create a new one to get started.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Custom Delete Confirmation Modal */}
            {snippetToDelete !== null && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-card rounded-xl shadow-xl p-6 max-w-sm w-full animate-in zoom-in-95 duration-200 border border-border">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                                <Trash2 size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-foreground">Delete Snippet?</h3>
                        </div>
                        <p className="text-muted-foreground text-sm mb-6 ml-1">
                            Are you sure you want to delete this snippet? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setSnippetToDelete(null)}
                                className="px-4 py-2 text-foreground hover:bg-muted rounded-lg text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-bold hover:bg-destructive/90 transition-colors shadow-sm"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

