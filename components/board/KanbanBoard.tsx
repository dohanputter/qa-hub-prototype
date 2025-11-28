"use client";

import { useState, useEffect, useRef } from "react";
import {
    DndContext,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor,
    closestCenter,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard, IssueCard } from "./KanbanCard";
import { moveIssue } from "@/app/actions/board";
import { toast } from "@/components/ui/use-toast";
import { Search, X } from "lucide-react";

interface KanbanBoardProps {
    project: {
        id: number;
        qaLabelMapping: { pending: string; passed: string; failed: string };
    };
    issues: any[];
    labels: any[];
    projectId: number;
}

export function KanbanBoard({
    project,
    issues: initialIssues,
    labels,
    projectId
}: KanbanBoardProps) {
    const [issues, setIssues] = useState(initialIssues);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [showLabelSuggestions, setShowLabelSuggestions] = useState(false);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    // Update local state when server data changes
    useEffect(() => {
        setIssues(initialIssues);
    }, [initialIssues]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setShowLabelSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    const columns = {
        pending: project.qaLabelMapping.pending,
        passed: project.qaLabelMapping.passed,
        failed: project.qaLabelMapping.failed,
    };

    // Filter Logic
    const filteredIssues = issues.filter((issue: any) => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;

        // Label Filter (starts with @)
        if (query.startsWith('@')) {
            const labelTarget = query.substring(1);
            if (!labelTarget) return true;
            return issue.labels.some((l: string) => l.toLowerCase().includes(labelTarget));
        }

        // Standard Search
        return issue.title.toLowerCase().includes(query) ||
            issue.iid.toString().includes(query);
    });

    const getIssuesByStatus = (status: keyof typeof columns) => {
        const label = columns[status];
        return filteredIssues.filter((i: any) => i.labels.includes(label));
    };

    // Get issues that don't have any of the status labels (Backlog)
    const getBacklogIssues = () => {
        const statusLabels = Object.values(columns);
        return filteredIssues.filter((i: any) =>
            !statusLabels.some(label => i.labels.includes(label))
        );
    };

    // Autocomplete Logic
    const filteredLabels = labels.filter((l: any) =>
        l.name.toLowerCase().includes(searchQuery.toLowerCase().replace('@', ''))
    );

    const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearchQuery(val);

        if (val.startsWith('@')) {
            setShowLabelSuggestions(true);
            setActiveSuggestionIndex(0);
        } else {
            setShowLabelSuggestions(false);
        }
    };

    const selectLabel = (labelName: string) => {
        setSearchQuery(`@${labelName}`);
        setShowLabelSuggestions(false);
        searchInputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (showLabelSuggestions && filteredLabels.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveSuggestionIndex(prev => (prev + 1) % filteredLabels.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveSuggestionIndex(prev => (prev - 1 + filteredLabels.length) % filteredLabels.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                selectLabel(filteredLabels[activeSuggestionIndex].name);
            } else if (e.key === 'Escape') {
                setShowLabelSuggestions(false);
            }
        }
    };

    const handleDragStart = (event: any) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = async (event: any) => {
        const { active, over } = event;

        console.log('[Drag] handleDragEnd called', { activeId: active?.id, overId: over?.id });

        setActiveId(null);
        if (!over) {
            console.log('[Drag] No over target, aborting');
            return;
        }

        // Active ID is in format "projectId-issueIid"
        const [activeProjectId, activeIssueIid] = active.id.split('-').map(Number);
        const activeIssue = issues.find((i: any) =>
            (i.project_id || project.id) === activeProjectId && i.iid === activeIssueIid
        );

        if (!activeIssue) {
            console.error('[Drag] Could not find active issue', { activeProjectId, activeIssueIid });
            return;
        }

        console.log('[Drag] Found active issue', { iid: activeIssue.iid, labels: activeIssue.labels });

        // Start syncing feedback
        setIsSyncing(true);
        const syncStartTime = Date.now();

        // Determine source status (can be undefined if in backlog)
        const sourceStatus = Object.keys(columns).find((key) =>
            activeIssue.labels.includes(columns[key as keyof typeof columns])
        ) as keyof typeof columns | undefined;
        const isFromBacklog = !sourceStatus;

        console.log('[Drag] Source status:', { sourceStatus, isFromBacklog });

        let destStatus: keyof typeof columns | undefined;
        let droppedOnCard = false;
        let isMovingToBacklog = false;

        // Check if dropped on another card (over ID will be in format "projectId-issueIid")
        const overIssue = over.id.includes('-')
            ? (() => {
                const [overProjectId, overIssueIid] = over.id.split('-').map(Number);
                return issues.find((i: any) =>
                    (i.project_id || project.id) === overProjectId && i.iid === overIssueIid
                );
            })()
            : null;

        if (overIssue) {
            droppedOnCard = true;
            destStatus = Object.keys(columns).find((key) =>
                overIssue.labels.includes(columns[key as keyof typeof columns])
            ) as keyof typeof columns;
            console.log('[Drag] Dropped on card', { destStatus });
        } else {
            // Check if dropped on a column
            if (over.id === 'backlog') {
                isMovingToBacklog = true;
                console.log('[Drag] Moving to backlog');
            } else {
                const isColumn = Object.keys(columns).includes(over.id);
                if (isColumn) {
                    destStatus = over.id as keyof typeof columns;
                    console.log('[Drag] Dropped on column', { destStatus });
                }
            }
        }

        // Handle moving to backlog
        if (isMovingToBacklog && sourceStatus) {
            const oldLabel = columns[sourceStatus];
            // Only remove the QA status label, keep all other labels
            const allQALabels = Object.values(columns);
            const updatedIssue = {
                ...activeIssue,
                updated_at: new Date().toISOString(),
                labels: activeIssue.labels.filter((l: string) => !allQALabels.includes(l)),
            };

            const activeIndex = issues.findIndex((i: any) =>
                (i.project_id || project.id) === activeProjectId && i.iid === activeIssueIid
            );
            let newIssues = [...issues];
            newIssues[activeIndex] = updatedIssue;
            setIssues(newIssues);

            console.log('[Drag] Removing label for backlog', { oldLabel });

            const result = await moveIssue(
                projectId,
                activeIssue.iid,
                '', // New label is empty for backlog
                oldLabel
            );

            const elapsed = Date.now() - syncStartTime;
            const remainingTime = Math.max(0, 2500 - elapsed);
            setTimeout(() => setIsSyncing(false), remainingTime);

            if (!result.success) {
                console.error('[Drag] Failed to move to backlog', result.error);
                toast({
                    title: "Error moving issue",
                    description: result.error,
                    variant: "destructive",
                });
                setIssues(issues);
            } else {
                console.log('[Drag] Successfully moved to backlog');
            }
            return;
        }

        if (!destStatus) {
            console.log('[Drag] No destination status, aborting');
            setIsSyncing(false);
            return;
        }

        // If from backlog, we only add the new label
        if (isFromBacklog && destStatus) {
            const newLabel = columns[destStatus];
            // Add the new QA label, keeping all existing labels
            const allQALabels = Object.values(columns);
            const nonQALabels = activeIssue.labels.filter((l: string) => !allQALabels.includes(l));
            const updatedIssue = {
                ...activeIssue,
                updated_at: new Date().toISOString(),
                labels: [...nonQALabels, newLabel],
            };

            const activeIndex = issues.findIndex((i: any) =>
                (i.project_id || project.id) === activeProjectId && i.iid === activeIssueIid
            );
            let newIssues = [...issues];
            newIssues[activeIndex] = updatedIssue;
            setIssues(newIssues);

            console.log('[Drag] Moving from backlog, adding label', { newLabel });

            const result = await moveIssue(
                projectId,
                activeIssue.iid,
                newLabel,
                '' // Empty old label for backlog
            );

            // Keep syncing badge visible for minimum 2.5 seconds
            const elapsed = Date.now() - syncStartTime;
            const remainingTime = Math.max(0, 2500 - elapsed);
            setTimeout(() => setIsSyncing(false), remainingTime);

            if (!result.success) {
                console.error('[Drag] Failed to move from backlog', result.error);
                toast({
                    title: "Error moving issue",
                    description: result.error,
                    variant: "destructive",
                });
                setIssues(issues);
            } else {
                console.log('[Drag] Successfully moved from backlog');
            }
            return;
        }

        if (!sourceStatus || !destStatus) {
            console.log('[Drag] Missing source or dest status', { sourceStatus, destStatus });
            setIsSyncing(false);
            return;
        }

        if (sourceStatus === destStatus && droppedOnCard) {
            console.log('[Drag] Reordering within same column');
            const activeIndex = issues.findIndex((i: any) =>
                (i.project_id || project.id) === activeProjectId && i.iid === activeIssueIid
            );
            const [overProjectId, overIssueIid] = over.id.split('-').map(Number);
            const overIndex = issues.findIndex((i: any) =>
                (i.project_id || project.id) === overProjectId && i.iid === overIssueIid
            );
            if (activeIndex !== overIndex) {
                setIssues((items: any) => arrayMove(items, activeIndex, overIndex));
            }
            setIsSyncing(false);
            return;
        }

        const oldLabel = columns[sourceStatus];
        const newLabel = columns[destStatus];

        console.log('[Drag] Moving between columns', { from: sourceStatus, to: destStatus, oldLabel, newLabel });

        // Remove old QA label, add new QA label, preserve all other labels
        const allQALabels = Object.values(columns);
        const nonQALabels = activeIssue.labels.filter((l: string) => !allQALabels.includes(l));
        const updatedIssue = {
            ...activeIssue,
            updated_at: new Date().toISOString(),
            labels: [...nonQALabels, newLabel],
        };

        const activeIndex = issues.findIndex((i: any) =>
            (i.project_id || project.id) === activeProjectId && i.iid === activeIssueIid
        );
        let newIssues = [...issues];
        newIssues.splice(activeIndex, 1);
        let insertIndex = 0;
        if (droppedOnCard && overIssue) {
            const [overProjectId, overIssueIid] = over.id.split('-').map(Number);
            const overIndex = issues.findIndex((i: any) =>
                (i.project_id || project.id) === overProjectId && i.iid === overIssueIid
            );
            insertIndex = overIndex;
            if (activeIndex < overIndex) {
                insertIndex--;
            }
        } else {
            insertIndex = 0;
        }
        newIssues.splice(insertIndex, 0, updatedIssue);
        setIssues(newIssues);

        const result = await moveIssue(
            projectId,
            activeIssue.iid,
            newLabel,
            oldLabel
        );

        // Keep syncing badge visible for minimum 2.5 seconds
        const elapsed = Date.now() - syncStartTime;
        const remainingTime = Math.max(0, 2500 - elapsed);
        setTimeout(() => setIsSyncing(false), remainingTime);

        if (!result.success) {
            console.error('[Drag] Failed to move between columns', result.error);
            toast({
                title: "Error moving issue",
                description: result.error,
                variant: "destructive",
            });
            setIssues(issues);
        } else {
            console.log('[Drag] Successfully moved between columns');
        }
    };

    const activeIssue = activeId
        ? (() => {
            const [activeProjectId, activeIssueIid] = activeId.split('-').map(Number);
            return issues.find((i: any) =>
                (i.project_id || project.id) === activeProjectId && i.iid === activeIssueIid
            );
        })()
        : null;

    return (
        <div className="flex flex-col h-full">
            {/* Sticky Header */}
            <div className="flex justify-between items-center mb-6 sticky top-0 z-10 bg-[#f9fafb] py-2">
                {/* Syncing Badge */}
                {isSyncing && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg">
                        <svg className="animate-spin h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm font-medium text-indigo-700">Syncing...</span>
                    </div>
                )}
                {!isSyncing && <div></div>}

                {/* Search Input Container */}
                <div className="relative w-80" ref={searchContainerRef}>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search or type @label..."
                            value={searchQuery}
                            onChange={handleSearchInput}
                            onKeyDown={handleKeyDown}
                            className="w-full pl-10 pr-8 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-background shadow-sm text-foreground"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => { setSearchQuery(''); setShowLabelSuggestions(false); }}
                                className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Autocomplete Dropdown */}
                    {showLabelSuggestions && filteredLabels.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
                                Select Label
                            </div>
                            <ul className="max-h-48 overflow-y-auto">
                                {filteredLabels.map((label: any, index: number) => (
                                    <li
                                        key={label.id}
                                        onClick={() => selectLabel(label.name)}
                                        className={`px-3 py-2 flex items-center gap-2 cursor-pointer text-sm ${index === activeSuggestionIndex ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-gray-50 text-gray-700'
                                            }`}
                                    >
                                        <span
                                            className="w-3 h-3 rounded-full border border-black/10"
                                            style={{ backgroundColor: label.color }}
                                        ></span>
                                        <span className="font-medium">{label.name}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            <DndContext
                id="kanban-board-dnd-context"
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex h-full gap-6 overflow-x-auto pb-4 items-start">
                    <KanbanColumn
                        id="backlog"
                        title="Backlog"
                        issues={getBacklogIssues()}
                        projectId={project.id}
                    />

                    <KanbanColumn
                        id="pending"
                        title="Ready for QA"
                        issues={getIssuesByStatus("pending")}
                        projectId={project.id}
                    />

                    <KanbanColumn
                        id="passed"
                        title="Passed"
                        issues={getIssuesByStatus("passed")}
                        projectId={project.id}
                    />

                    <KanbanColumn
                        id="failed"
                        title="Failed"
                        issues={getIssuesByStatus("failed")}
                        projectId={project.id}
                    />
                </div>

                <DragOverlay>
                    {activeIssue ? (
                        <IssueCard issue={activeIssue} projectId={project.id} isOverlay />
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}
