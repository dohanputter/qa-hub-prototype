'use client';

import React, { useState } from 'react';
import { ScrollText, Plus, Search, Trash2, Edit2, Save, X, CheckSquare, AlertCircle, Clock, ArrowLeft } from 'lucide-react';
import { Snippet } from '@/types';
import { getSnippets, createSnippet, updateSnippet, deleteSnippet } from '@/lib/mockData';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';

export const SnippetsManager: React.FC = () => {
    const { toast } = useToast();
    const router = useRouter();
    const [snippets, setSnippets] = useState<Snippet[]>(getSnippets());
    const [filter, setFilter] = useState<'all' | 'test_case' | 'issue'>('all');
    const [search, setSearch] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [currentSnippet, setCurrentSnippet] = useState<Partial<Snippet>>({});

    // Validation State
    const [titleError, setTitleError] = useState('');
    const [contentError, setContentError] = useState('');

    // Deletion State (Custom Modal)
    const [snippetToDelete, setSnippetToDelete] = useState<number | null>(null);

    const refreshSnippets = () => {
        setSnippets([...getSnippets()]);
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

    const confirmDelete = () => {
        if (snippetToDelete !== null) {
            deleteSnippet(snippetToDelete);
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
            setSnippetToDelete(null);
        }
    };

    const handleSave = () => {
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

        if (currentSnippet.id) {
            updateSnippet(currentSnippet as Snippet);
            toast({
                title: "Snippet updated",
                description: "Snippet updated successfully",
                variant: "default",
            });
        } else {
            createSnippet(currentSnippet as Omit<Snippet, 'id' | 'updatedAt'>);
            toast({
                title: "Snippet created",
                description: "Snippet created successfully",
                variant: "default",
            });
        }
        setIsEditing(false);
        refreshSnippets();
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
                        className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                        title="Back"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                            <ScrollText className="text-indigo-600" /> Snippets Library
                        </h2>
                        <p className="text-gray-500 mt-1">Manage reusable content for test cases and issues.</p>
                    </div>
                </div>
                <button
                    onClick={handleCreate}
                    className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
                >
                    <Plus size={18} /> New Snippet
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex gap-8 flex-1 min-h-0">

                {/* Left Side: List */}
                <div className="w-1/3 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                    {/* Search & Filter */}
                    <div className="p-4 border-b border-gray-200 space-y-3 bg-gray-50">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search snippets..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900"
                            />
                        </div>
                        <div className="flex p-1 bg-gray-200 rounded-lg">
                            {['all', 'test_case', 'issue'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f as any)}
                                    className={`flex-1 py-1 text-xs font-medium rounded-md capitalize transition-all ${filter === f ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
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
                            <div className="divide-y divide-gray-100">
                                {filteredSnippets.map(snippet => (
                                    <div
                                        key={snippet.id}
                                        className="p-4 hover:bg-gray-50 cursor-pointer group transition-colors"
                                        onClick={() => handleEdit(snippet)}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-semibold text-gray-800 text-sm">{snippet.title}</h4>
                                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${snippet.type === 'test_case'
                                                    ? 'bg-blue-50 text-blue-600 border-blue-200'
                                                    : 'bg-orange-50 text-orange-600 border-orange-200'
                                                }`}>
                                                {snippet.type === 'test_case' ? 'Test Case' : 'Issue'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 line-clamp-2 font-mono mb-3">{snippet.content}</p>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1 text-[10px] text-gray-400">
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
                                                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
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
                            <div className="p-8 text-center text-gray-400 text-sm">
                                No snippets found.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Editor (or Placeholder) */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden relative">
                    {isEditing ? (
                        <>
                            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col">
                                        <input
                                            type="text"
                                            value={currentSnippet.title}
                                            onChange={e => { setCurrentSnippet({ ...currentSnippet, title: e.target.value }); setTitleError(''); }}
                                            placeholder="Snippet Title"
                                            className={`text-lg font-bold bg-transparent focus:ring-0 placeholder-gray-400 text-gray-800 w-64 border-none p-0 bg-white ${titleError ? 'border-b border-red-500' : ''}`}
                                        />
                                        {titleError && <span className="text-xs text-red-500 mt-1">{titleError}</span>}
                                    </div>
                                    <div className="flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden">
                                        <button
                                            onClick={() => setCurrentSnippet({ ...currentSnippet, type: 'test_case' })}
                                            className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 ${currentSnippet.type === 'test_case' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-500'
                                                }`}
                                        >
                                            <CheckSquare size={14} /> Test Case
                                        </button>
                                        <div className="w-px h-full bg-gray-300"></div>
                                        <button
                                            onClick={() => setCurrentSnippet({ ...currentSnippet, type: 'issue' })}
                                            className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 ${currentSnippet.type === 'issue' ? 'bg-orange-50 text-orange-700' : 'hover:bg-gray-50 text-gray-500'
                                                }`}
                                        >
                                            <AlertCircle size={14} /> Issue
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="px-3 py-1.5 text-gray-500 hover:bg-gray-200 rounded-lg text-sm font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
                                    >
                                        <Save size={16} /> Save Snippet
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 flex flex-col relative">
                                <textarea
                                    value={currentSnippet.content}
                                    onChange={e => { setCurrentSnippet({ ...currentSnippet, content: e.target.value }); setContentError(''); }}
                                    className={`flex-1 p-6 w-full resize-none focus:outline-none font-mono text-sm leading-relaxed text-gray-900 bg-white ${contentError ? 'ring-1 ring-inset ring-red-300 bg-red-50/10' : ''}`}
                                    placeholder="Enter your snippet content here..."
                                />
                                {contentError && (
                                    <div className="absolute bottom-12 left-6 text-xs text-red-500 bg-white/90 px-2 py-1 rounded border border-red-200 shadow-sm">
                                        {contentError}
                                    </div>
                                )}
                            </div>
                            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-400 flex justify-between">
                                <span>Use this snippet to quickly populate Test Cases or Issue descriptions.</span>
                                <span>Markdown Supported</span>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <Edit2 size={32} className="text-gray-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-600">Select a snippet to edit</h3>
                            <p className="text-sm mt-2">Or create a new one to get started.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Custom Delete Confirmation Modal */}
            {snippetToDelete !== null && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                                <Trash2 size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Delete Snippet?</h3>
                        </div>
                        <p className="text-gray-600 text-sm mb-6 ml-1">
                            Are you sure you want to delete this snippet? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setSnippetToDelete(null)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors shadow-sm"
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
