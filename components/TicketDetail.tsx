import React, { useState, useEffect, useRef } from 'react';
import { Issue, QAStatus, Label, Snippet } from '../types';
import { USERS, LABELS, getSnippets } from '../lib/mockData';
import {
    X, CheckCircle, XCircle, Upload, Copy,
    Calendar, Tag, Flag, Paperclip, Image as ImageIcon,
    Bold, Italic, List, MoreHorizontal, ChevronRight,
    User, Clock, ArrowRight, Link as LinkIcon, ScrollText
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface TicketDetailProps {
    issue: Issue;
    onClose: () => void;
    onUpdate: (issue: Issue) => void;
}

// --- Helper: Get Caret Coordinates for Mention Popup ---
const getCaretCoordinates = (element: HTMLTextAreaElement, position: number) => {
    const div = document.createElement('div');
    const style = window.getComputedStyle(element);

    // Copy styling to mirror the textarea
    Array.from(style).forEach(prop => {
        if (!['position', 'top', 'left', 'visibility', 'height'].includes(prop)) {
            div.style.setProperty(prop, style.getPropertyValue(prop), style.getPropertyPriority(prop));
        }
    });

    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.top = '0';
    div.style.left = '0';
    div.style.width = style.width;
    div.style.font = style.font;
    div.style.padding = style.padding;
    div.style.border = style.border;
    div.style.boxSizing = style.boxSizing;

    // Content up to cursor
    div.textContent = element.value.substring(0, position);

    // Span to locate cursor
    const span = document.createElement('span');
    span.textContent = element.value.substring(position) || '.';
    div.appendChild(span);

    document.body.appendChild(div);

    const coordinates = {
        top: span.offsetTop + parseInt(style.borderTopWidth) - element.scrollTop,
        left: span.offsetLeft + parseInt(style.borderLeftWidth) - element.scrollLeft,
        height: parseInt(style.lineHeight) || 20
    };

    document.body.removeChild(div);
    return coordinates;
};

// --- Component: Smart Textarea with Mentions ---
interface MentionTextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    value: string;
    onChangeValue: (val: string) => void;
}

const MentionTextArea: React.FC<MentionTextAreaProps> = ({ value, onChangeValue, className, ...props }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionPos, setSuggestionPos] = useState({ top: 0, left: 0 });
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);

    const filteredUsers = USERS.filter(u =>
        u.username.toLowerCase().includes(query.toLowerCase()) ||
        u.name.toLowerCase().includes(query.toLowerCase())
    );

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const newCursorPos = e.target.selectionStart;
        onChangeValue(newValue);

        // Check for trigger
        const textBeforeCursor = newValue.slice(0, newCursorPos);
        // Match @ followed by word chars at end of string
        const match = textBeforeCursor.match(/@(\w*)$/);

        if (match) {
            const matchQuery = match[1];
            setQuery(matchQuery);
            setShowSuggestions(true);

            if (textareaRef.current) {
                const coords = getCaretCoordinates(textareaRef.current, newCursorPos);
                // Adjust for toolbar height (approx 40px) + some padding
                setSuggestionPos({ top: coords.top + 20, left: coords.left });
            }
            setSelectedIndex(0);
        } else {
            setShowSuggestions(false);
        }
    };

    const insertMention = (username: string) => {
        if (!textareaRef.current) return;
        const cursor = textareaRef.current.selectionStart;
        const textBefore = value.slice(0, cursor);
        const textAfter = value.slice(cursor);
        const match = textBefore.match(/@(\w*)$/);

        if (match) {
            const start = match.index!;
            const newText = value.slice(0, start) + `@${username} ` + textAfter;
            onChangeValue(newText);
            setShowSuggestions(false);

            // Restore focus and move cursor
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    textareaRef.current.setSelectionRange(start + username.length + 2, start + username.length + 2);
                }
            }, 0);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (showSuggestions && filteredUsers.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % filteredUsers.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length);
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                insertMention(filteredUsers[selectedIndex].username);
            } else if (e.key === 'Escape') {
                setShowSuggestions(false);
            }
        }
    };

    return (
        <div className="relative flex-1 flex flex-col">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                className={className}
                {...props}
            />
            {showSuggestions && filteredUsers.length > 0 && (
                <div
                    className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg w-64 overflow-hidden"
                    style={{ top: suggestionPos.top, left: suggestionPos.left }}
                >
                    <ul className="max-h-48 overflow-y-auto">
                        {filteredUsers.map((user, index) => (
                            <li
                                key={user.id}
                                onClick={() => insertMention(user.username)}
                                className={`px-3 py-2 flex items-center gap-2 cursor-pointer text-sm ${index === selectedIndex ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-gray-50 text-gray-700'
                                    }`}
                            >
                                <img src={user.avatarUrl} className="w-5 h-5 rounded-full" alt="" />
                                <div className="flex flex-col">
                                    <span className="font-medium leading-none">{user.username}</span>
                                    <span className="text-xs text-gray-400 leading-none mt-1">{user.name}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

// --- Editor Toolbar ---
interface EditorToolbarProps {
    onInsertSnippet: () => void;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ onInsertSnippet }) => (
    <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-100 bg-gray-50/50 text-gray-500">
        <div className="flex items-center gap-1">
            <button className="p-1 hover:bg-gray-200 rounded" title="Bold"><Bold size={14} /></button>
            <button className="p-1 hover:bg-gray-200 rounded" title="Italic"><Italic size={14} /></button>
            <div className="w-px h-4 bg-gray-300 mx-1"></div>
            <button className="p-1 hover:bg-gray-200 rounded" title="List"><List size={14} /></button>
            <button className="p-1 hover:bg-gray-200 rounded" title="Image"><ImageIcon size={14} /></button>
            <button className="p-1 hover:bg-gray-200 rounded" title="Attachment"><Paperclip size={14} /></button>
        </div>
        <button
            onClick={onInsertSnippet}
            className="flex items-center gap-1.5 px-2 py-1 hover:bg-indigo-50 hover:text-indigo-600 rounded text-xs font-medium transition-colors"
            title="Insert Snippet"
        >
            <ScrollText size={14} />
            <span>Snippets</span>
        </button>
    </div>
);

// --- Main Ticket Detail Component ---
export const TicketDetail: React.FC<TicketDetailProps> = ({ issue, onClose, onUpdate }) => {
    const { toast: showToast } = useToast();

    // Initialize state with local draft if available to prevent data loss on reload
    const getDraft = () => {
        try {
            const draft = localStorage.getItem(`draft_${issue.id}`);
            if (draft) return JSON.parse(draft);
        } catch (e) { }
        return null;
    };
    const draft = getDraft();

    const [testCases, setTestCases] = useState(draft?.testCases ?? issue.testCases ?? '');
    const [issuesFound, setIssuesFound] = useState(draft?.issuesFound ?? issue.issuesFound ?? '');

    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
    const [lastSavedTime, setLastSavedTime] = useState<Date>(new Date());
    const [showLabelDropdown, setShowLabelDropdown] = useState(false);
    const [successLink, setSuccessLink] = useState<string | null>(null);

    // Snippet Selection State
    const [showSnippetSelector, setShowSnippetSelector] = useState(false);
    const [targetSnippetField, setTargetSnippetField] = useState<'testCases' | 'issuesFound' | null>(null);

    const labelDropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (labelDropdownRef.current && !labelDropdownRef.current.contains(event.target as Node)) {
                setShowLabelDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Save Draft to LocalStorage immediately on change
    useEffect(() => {
        localStorage.setItem(`draft_${issue.id}`, JSON.stringify({ testCases, issuesFound, timestamp: Date.now() }));
    }, [testCases, issuesFound, issue.id]);

    // Sync local state if issue prop changes externally (e.g. fast switching) AND no draft is newer
    useEffect(() => {
        // Only overwrite if the issue prop is actually different and we don't have a fresher draft
        // For simplicity in this prototype: prioritize user input. 
        // If the component re-mounts with a different issue ID, the useState initializer handles it.
        // If props update while mounted (rare here), we might want to be careful.
    }, [issue.id]);

    // Auto-save Logic (Commit to DB)
    useEffect(() => {
        if (testCases === issue.testCases && issuesFound === issue.issuesFound) {
            setSaveStatus('saved');
            return;
        }

        setSaveStatus('unsaved');
        const timer = setTimeout(() => {
            setSaveStatus('saving');
            onUpdate({
                ...issue,
                testCases,
                issuesFound
            });
            setSaveStatus('saved');
            setLastSavedTime(new Date());
        }, 1000); // 1s debounce

        return () => clearTimeout(timer);
    }, [testCases, issuesFound, issue, onUpdate]);

    const handleClose = () => {
        // Force final save if pending changes exist before closing
        if (testCases !== issue.testCases || issuesFound !== issue.issuesFound) {
            onUpdate({
                ...issue,
                testCases,
                issuesFound
            });
        }
        onClose();
    };

    const handleSave = (status?: QAStatus) => {
        const updatedIssue = {
            ...issue,
            testCases,
            issuesFound,
            qaStatus: status || issue.qaStatus
        };
        onUpdate(updatedIssue);

        if (status === QAStatus.PASSED) {
            // Generate a mock UUID link
            const mockUuid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            setSuccessLink(`https://qa-hub.app/shared/qa-record-${mockUuid}`);
            showToast({
                title: "Success",
                description: "Ticket marked as Passed!",
            });
        } else if (status === QAStatus.FAILED) {
            showToast({
                title: "Failed",
                description: "Ticket failed and moved to Failed column.",
                variant: "destructive",
            });
            handleClose();
        }
    };

    const handleRemoveLabel = (labelId: number) => {
        const newLabels = issue.labels.filter(l => l.id !== labelId);
        onUpdate({ ...issue, labels: newLabels });
    };

    const toggleLabel = (label: Label) => {
        const exists = issue.labels.find(l => l.id === label.id);
        let newLabels;
        if (exists) {
            newLabels = issue.labels.filter(l => l.id !== label.id);
        } else {
            newLabels = [...issue.labels, label];
        }
        onUpdate({ ...issue, labels: newLabels });
    };

    const handleOpenSnippetSelector = (field: 'testCases' | 'issuesFound') => {
        setTargetSnippetField(field);
        setShowSnippetSelector(true);
    };

    const handleInsertSnippet = (content: string) => {
        if (targetSnippetField === 'testCases') {
            setTestCases((prev: string) => prev ? `${prev}\n\n${content}` : content);
        } else if (targetSnippetField === 'issuesFound') {
            setIssuesFound((prev: string) => prev ? `${prev}\n\n${content}` : content);
        }
        setShowSnippetSelector(false);
        setTargetSnippetField(null);
    };

    const handleCopyLink = () => {
        if (successLink) {
            navigator.clipboard.writeText(successLink);
            showToast({
                title: "Copied",
                description: "Link copied to clipboard!",
            });
        }
    };

    // Get filtered snippets based on active field
    const availableSnippets = getSnippets().filter(s => {
        if (targetSnippetField === 'testCases') return s.type === 'test_case';
        if (targetSnippetField === 'issuesFound') return s.type === 'issue';
        return false;
    });

    return (
        <div className="fixed inset-0 bg-gray-100/50 backdrop-blur-sm z-50 flex justify-end">
            <div className="relative w-full h-full bg-gray-50 flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl">

                {/* Header */}
                <header className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0 sticky top-0 z-20">
                    <div className="flex items-center gap-4 overflow-hidden">
                        <button onClick={handleClose} className="p-2 -ml-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                            <X size={20} />
                        </button>
                        <div className="flex flex-col overflow-hidden">
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-0.5">
                                <span className="font-mono">#{issue.iid}</span>
                                <ChevronRight size={12} />
                                <span>{issue.author.name}</span>
                            </div>
                            <h2 className="font-bold text-gray-900 text-lg truncate">{issue.title}</h2>
                        </div>
                        <div className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold border ${issue.qaStatus === QAStatus.PASSED ? 'bg-green-50 border-green-200 text-green-700' :
                            issue.qaStatus === QAStatus.FAILED ? 'bg-red-50 border-red-200 text-red-700' :
                                'bg-gray-100 border-gray-200 text-gray-600'
                            }`}>
                            {issue.qaStatus}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="text-gray-400 hover:text-gray-700 transition-colors">
                            <MoreHorizontal size={20} />
                        </button>
                    </div>
                </header>

                {/* Main Content Grid */}
                <div className="flex-1 overflow-y-auto px-6 pt-6 pb-40 scroll-smooth">
                    <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">

                        {/* LEFT COLUMN: Context & Metadata (4 Cols) */}
                        <div className="lg:col-span-4 space-y-6">

                            {/* Metadata Card */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Assignee</span>
                                    {issue.assignee ? (
                                        <div className="flex items-center gap-2">
                                            <img src={issue.assignee.avatarUrl} alt={issue.assignee.name} className="w-6 h-6 rounded-full border border-gray-200" />
                                            <span className="text-sm font-medium text-gray-700">{issue.assignee.name}</span>
                                        </div>
                                    ) : <span className="text-sm text-gray-400">Unassigned</span>}
                                </div>

                                <div className="border-t border-gray-50"></div>

                                <div>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Labels</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {issue.labels.map(l => (
                                            <span key={l.id} className="px-2 py-1 rounded text-xs font-medium border border-transparent flex items-center gap-1"
                                                style={{ backgroundColor: `${l.color}15`, color: l.color, borderColor: `${l.color}30` }}>
                                                {l.title}
                                                <button
                                                    onClick={() => handleRemoveLabel(l.id)}
                                                    className="hover:bg-black/10 rounded p-0.5 transition-colors"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                        <div className="relative" ref={labelDropdownRef}>
                                            <button
                                                onClick={() => setShowLabelDropdown(!showLabelDropdown)}
                                                className="px-2 py-1 rounded text-xs font-medium bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200 border-dashed">
                                                + Add
                                            </button>
                                            {showLabelDropdown && (
                                                <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-200 shadow-xl rounded-lg z-20 py-1">
                                                    <div className="px-3 py-2 border-b border-gray-100 text-xs font-bold text-gray-500">Add Labels</div>
                                                    <div className="max-h-48 overflow-y-auto">
                                                        {LABELS.map(l => {
                                                            const isSelected = !!issue.labels.find(sl => sl.id === l.id);
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
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-gray-50"></div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Milestone</span>
                                        <div className="flex items-center gap-1.5 text-sm text-gray-700">
                                            <Flag size={14} className="text-gray-400" /> v2.4.0
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Due Date</span>
                                        <div className="flex items-center gap-1.5 text-sm text-gray-700">
                                            <Calendar size={14} className="text-gray-400" /> Oct 31
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Description Card */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-gray-800 text-sm">GitLab Description</h3>
                                    <a href="#" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                                        Open <ArrowRight size={10} />
                                    </a>
                                </div>
                                {/* Fixed: Use whitespace-pre-wrap for proper text formatting without relying on 'prose' plugin */}
                                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                    {issue.description || <span className="text-gray-400 italic">No description provided.</span>}
                                </div>
                            </div>

                            {/* Activity Feed (Condensed) */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                                <h3 className="font-bold text-gray-800 text-sm mb-4">Activity</h3>
                                <div className="space-y-4 relative pl-2">
                                    {/* Line */}
                                    <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gray-100"></div>

                                    <div className="flex gap-3 relative">
                                        <img src={issue.author.avatarUrl} className="w-6 h-6 rounded-full bg-white ring-4 ring-white z-10" />
                                        <div>
                                            <p className="text-xs text-gray-600 leading-relaxed">
                                                <span className="font-semibold text-gray-900">{issue.author.username}</span> created this issue
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">{new Date(issue.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 relative">
                                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold ring-4 ring-white z-10">QA</div>
                                        <div>
                                            <p className="text-xs text-gray-600 leading-relaxed">
                                                Moved to <span className="font-medium text-gray-900">{issue.qaStatus}</span>
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">Just now</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* RIGHT COLUMN: Workspace (8 Cols) */}
                        <div className="lg:col-span-8 flex flex-col gap-6">

                            {/* Test Cases Section */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-visible min-h-[450px] relative">
                                <div className="px-5 py-3 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white rounded-t-xl">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                        <h3 className="font-bold text-gray-800 text-sm">Test Cases</h3>
                                    </div>
                                </div>

                                <EditorToolbar onInsertSnippet={() => handleOpenSnippetSelector('testCases')} />

                                <MentionTextArea
                                    className="flex-1 w-full p-5 focus:outline-none resize-none text-sm font-mono leading-relaxed text-gray-700 bg-white rounded-b-xl"
                                    placeholder="1. Navigate to... (Type @ to mention)"
                                    value={testCases}
                                    onChangeValue={setTestCases}
                                />
                            </div>

                            {/* Issues Found Section */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-visible min-h-[300px] relative">
                                <div className="px-5 py-3 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-red-50/50 to-white rounded-t-xl">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                        <h3 className="font-bold text-gray-800 text-sm">Issues Found</h3>
                                    </div>
                                    <span className="text-xs text-gray-400 font-medium">Markdown supported</span>
                                </div>

                                <EditorToolbar onInsertSnippet={() => handleOpenSnippetSelector('issuesFound')} />

                                <MentionTextArea
                                    className="flex-1 w-full p-5 focus:outline-none resize-none text-sm font-mono leading-relaxed text-gray-700 bg-white rounded-b-xl"
                                    placeholder="Describe any bugs... (Type @ to mention)"
                                    value={issuesFound}
                                    onChangeValue={setIssuesFound}
                                />
                            </div>

                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <footer className="bg-white/90 backdrop-blur-md border-t border-gray-200 px-8 py-4 flex justify-between items-center shrink-0 sticky bottom-0 z-20 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        {saveStatus === 'saving' ? (
                            <>
                                <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-500"></span>
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <Clock size={16} />
                                <span>Last saved {lastSavedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handleSave(QAStatus.FAILED)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-red-200 bg-white text-red-600 font-semibold hover:bg-red-50 transition-colors text-sm">
                            <XCircle size={18} /> Fail Ticket
                        </button>
                        <button
                            onClick={() => handleSave(QAStatus.PASSED)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 shadow-sm transition-all text-sm hover:shadow-md hover:-translate-y-0.5">
                            <CheckCircle size={18} /> Pass Ticket
                        </button>
                    </div>
                </footer>

                {/* Snippet Selection Modal (Z-Index > 50 to sit on top of ticket modal) */}
                {showSnippetSelector && (
                    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
                            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-t-xl">
                                <div>
                                    <h3 className="font-bold text-gray-800">Insert Snippet</h3>
                                    <p className="text-xs text-gray-500">
                                        Showing {targetSnippetField === 'testCases' ? 'Test Case' : 'Issue'} snippets
                                    </p>
                                </div>
                                <button onClick={() => setShowSnippetSelector(false)} className="text-gray-400 hover:text-gray-600">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="overflow-y-auto p-2">
                                {availableSnippets.length > 0 ? (
                                    availableSnippets.map(snippet => (
                                        <button
                                            key={snippet.id}
                                            onClick={() => handleInsertSnippet(snippet.content)}
                                            className="w-full text-left p-3 hover:bg-indigo-50 rounded-lg group transition-colors border border-transparent hover:border-indigo-100 mb-1"
                                        >
                                            <h4 className="font-semibold text-gray-800 text-sm group-hover:text-indigo-700 mb-1">
                                                {snippet.title}
                                            </h4>
                                            <p className="text-xs text-gray-500 line-clamp-2 font-mono bg-gray-50 p-1.5 rounded border border-gray-100">
                                                {snippet.content}
                                            </p>
                                        </button>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-gray-400 text-sm flex flex-col items-center">
                                        <ScrollText size={32} className="mb-2 opacity-50" />
                                        <p>No snippets found for this type.</p>
                                        <p className="text-xs mt-1">Go to Tools &gt; Snippets to create one.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Success Overlay for QA Passed */}
                {successLink && (
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                        <div className="bg-white rounded-2xl shadow-2xl border border-green-100 p-8 max-w-md w-full text-center relative overflow-hidden">
                            {/* Decorative background */}
                            <div className="absolute top-0 left-0 w-full h-2 bg-green-500"></div>

                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-300">
                                <CheckCircle size={32} />
                            </div>

                            <h2 className="text-2xl font-bold text-gray-900 mb-2">QA Passed!</h2>
                            <p className="text-gray-500 mb-6 text-sm">The ticket has been moved to Passed. A unique read-only link has been generated for sharing.</p>

                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center gap-3 mb-8 hover:border-indigo-200 transition-colors group">
                                <div className="p-1.5 bg-white border border-gray-200 rounded text-gray-400 group-hover:text-indigo-500">
                                    <LinkIcon size={14} />
                                </div>
                                <code className="text-xs text-gray-600 truncate flex-1 text-left font-mono select-all cursor-text">{successLink}</code>
                                <button
                                    onClick={handleCopyLink}
                                    className="text-gray-400 hover:text-indigo-600 transition-colors p-1 hover:bg-indigo-50 rounded"
                                    title="Copy to clipboard"
                                >
                                    <Copy size={16} />
                                </button>
                            </div>

                            <button
                                onClick={handleClose}
                                className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3 rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
