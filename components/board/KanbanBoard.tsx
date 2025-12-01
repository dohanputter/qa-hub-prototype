"use client";

import { useState, useEffect, useRef, useCallback, useOptimistic, useTransition } from "react";
import {
    DndContext,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor,
    closestCenter,
    DragStartEvent,
    DragEndEvent,
    DragOverEvent,
    pointerWithin,
    rectIntersection,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard, IssueCard, LabelColorsProvider } from "./KanbanCard";
import { moveIssue } from "@/app/actions/board";
import { toast } from "@/components/ui/use-toast";
import { Search, X, Loader2 } from "lucide-react";
import type { KanbanIssue, GitLabLabel, QALabelMapping } from "@/types";
import { DEFAULT_QA_LABELS } from "@/lib/constants";

// Debug logging - only logs in development
const DEBUG = process.env.NODE_ENV === 'development';
const log = (...args: unknown[]) => DEBUG && console.log(...args);

interface KanbanBoardProps {
    project: {
        id: number;
        qaLabelMapping?: QALabelMapping;
    };
    issues: KanbanIssue[];
    labels: GitLabLabel[];
    projectId: number;
}

export function KanbanBoard({
    project,
    issues: initialIssues,
    labels,
    projectId
}: KanbanBoardProps) {
    const [issues, setIssues] = useState<KanbanIssue[]>(initialIssues);
    const [optimisticIssues, setOptimisticIssues] = useOptimistic(issues, (state, newIssues: KanbanIssue[]) => newIssues);
    const [isPending, startTransition] = useTransition();
    const [activeId, setActiveId] = useState<string | null>(null);
    // Counter-based syncing to handle multiple concurrent operations
    const [syncCount, setSyncCount] = useState(0);
    const isSyncing = syncCount > 0 || isPending;

    // Helper functions to manage sync state safely
    const startSync = useCallback(() => setSyncCount(c => c + 1), []);
    const endSync = useCallback(() => setSyncCount(c => Math.max(0, c - 1)), []);

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [showLabelSuggestions, setShowLabelSuggestions] = useState(false);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const previousIssueIdsRef = useRef<string>('');
    const hasLocalChangesRef = useRef(false);

    // Update local state when server data changes, but preserve local reordering
    // Note: 'issues' is intentionally omitted from deps - we only want to run when server data (initialIssues) changes,
    // not when local state changes due to drag operations
    useEffect(() => {
        // Create a signature of issue IDs to detect actual data changes (not just reordering)
        const currentIssueIds = initialIssues.map((i: any) => `${i.project_id || project.id}-${i.iid}`).sort().join(',');
        const previousIssueIds = previousIssueIdsRef.current;

        // Only update if the set of issues actually changed (new issues added/removed)
        if (currentIssueIds !== previousIssueIds) {
            if (previousIssueIds === '') {
                // First render - initialize
                setIssues(initialIssues);
                hasLocalChangesRef.current = false;
            } else {
                // Check if it's just a reorder (same IDs, different order) or actual data change
                const currentIdsSet = new Set(initialIssues.map((i: any) => `${i.project_id || project.id}-${i.iid}`));
                const localIdsSet = new Set(issues.map((i: any) => `${i.project_id || project.id}-${i.iid}`));

                // If the sets are the same, it's just a reorder - preserve local order
                const setsAreEqual = currentIdsSet.size === localIdsSet.size &&
                    [...currentIdsSet].every(id => localIdsSet.has(id));

                if (!setsAreEqual) {
                    // Actual data change - update state
                    log('[KanbanBoard] Data changed, updating issues');
                    setIssues(initialIssues);
                    hasLocalChangesRef.current = false;
                } else if (!hasLocalChangesRef.current) {
                    // Same issues and no local changes - update from server
                    log('[KanbanBoard] Same issues, no local changes, syncing from server');
                    setIssues(initialIssues);
                } else {
                    // Same issues but we have local changes - preserve local order
                    log('[KanbanBoard] Same issues, preserving local order');
                }
            }
        }

        previousIssueIdsRef.current = currentIssueIds;
    }, [initialIssues, issues, project.id]);

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

    // Custom collision detection that prioritizes sortable items over droppable columns
    const collisionDetectionStrategy = (args: any) => {
        // First, check for sortable item collisions (cards)
        const pointerCollisions = pointerWithin(args);
        const rectCollisions = rectIntersection(args);

        // Combine and prioritize collisions
        const allCollisions = [...pointerCollisions, ...rectCollisions];

        // Prioritize cards (IDs with '-') over columns
        const cardCollisions = allCollisions.filter(
            (collision) => String(collision.id).includes('-')
        );

        if (cardCollisions.length > 0) {
            // Return the closest card collision
            return [cardCollisions[0]];
        }

        // Fall back to closest center for column detection
        return closestCenter(args);
    };

    const columns = {
        pending: project.qaLabelMapping?.pending || DEFAULT_QA_LABELS.pending,
        passed: project.qaLabelMapping?.passed || DEFAULT_QA_LABELS.passed,
        failed: project.qaLabelMapping?.failed || DEFAULT_QA_LABELS.failed,
    };

    // Filter Logic
    const filteredIssues = optimisticIssues.filter((issue: any) => {
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

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;

        if (!over) return;

        const activeIdStr = String(active.id);
        const overIdStr = String(over.id);

        // Skip if same item or no valid over target
        if (activeIdStr === overIdStr) return;

        // Only handle card-to-card dragging for same-column reordering
        if (!activeIdStr.includes('-') || !overIdStr.includes('-')) return;

        const [activeProjectId, activeIssueIid] = activeIdStr.split('-').map(Number);
        const [overProjectId, overIssueIid] = overIdStr.split('-').map(Number);

        const activeIssue = issues.find((i: any) =>
            (i.project_id || project.id) === activeProjectId && i.iid === activeIssueIid
        );
        const overIssue = issues.find((i: any) =>
            (i.project_id || project.id) === overProjectId && i.iid === overIssueIid
        );

        if (!activeIssue || !overIssue) return;

        // Determine if both items are in the same column
        const activeStatus = Object.keys(columns).find((key) =>
            activeIssue.labels.includes(columns[key as keyof typeof columns])
        );
        const overStatus = Object.keys(columns).find((key) =>
            overIssue.labels.includes(columns[key as keyof typeof columns])
        );

        // Check if both in backlog (no status labels)
        const activeInBacklog = !activeStatus;
        const overInBacklog = !overStatus;

        // Only reorder if in the same column (same status or both in backlog)
        const isSameColumn = (activeStatus === overStatus) || (activeInBacklog && overInBacklog);

        if (isSameColumn) {
            setIssues((items: any) => {
                const oldIndex = items.findIndex((item: any) =>
                    `${item.project_id || project.id}-${item.iid}` === activeIdStr
                );
                const newIndex = items.findIndex((item: any) =>
                    `${item.project_id || project.id}-${item.iid}` === overIdStr
                );

                if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                    hasLocalChangesRef.current = true;
                    return arrayMove(items, oldIndex, newIndex);
                }

                return items;
            });
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        log('[Drag] handleDragEnd called', { activeId: active?.id, overId: over?.id });

        setActiveId(null);
        if (!over) {
            log('[Drag] No over target, aborting');
            return;
        }

        // Active ID is in format "projectId-issueIid"
        const activeIdStr = String(active.id);
        const [activeProjectId, activeIssueIid] = activeIdStr.split('-').map(Number);
        const activeIssue = issues.find((i: any) =>
            (i.project_id || project.id) === activeProjectId && i.iid === activeIssueIid
        );

        if (!activeIssue) {
            log('[Drag] Could not find active issue', { activeProjectId, activeIssueIid });
            return;
        }

        log('[Drag] Found active issue', { iid: activeIssue.iid, labels: activeIssue.labels });

        // Start syncing feedback (counter-based to handle concurrent operations)
        startSync();
        const syncStartTime = Date.now();

        // Determine source status (can be undefined if in backlog)
        const sourceStatus = Object.keys(columns).find((key) =>
            activeIssue.labels.includes(columns[key as keyof typeof columns])
        ) as keyof typeof columns | undefined;
        const isFromBacklog = !sourceStatus;

        log('[Drag] Source status:', { sourceStatus, isFromBacklog });

        let destStatus: keyof typeof columns | undefined;
        let droppedOnCard = false;
        let isMovingToBacklog = false;

        // Check if dropped on another card (over ID will be in format "projectId-issueIid")
        const overIdStr = String(over.id);
        const overIssue = overIdStr.includes('-')
            ? (() => {
                const [overProjectId, overIssueIid] = overIdStr.split('-').map(Number);
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
            log('[Drag] Dropped on card', { destStatus });
        } else {
            // Check if dropped on a column
            if (overIdStr === 'backlog') {
                isMovingToBacklog = true;
                log('[Drag] Moving to backlog');
            } else {
                const isColumn = Object.keys(columns).includes(overIdStr);
                if (isColumn) {
                    destStatus = overIdStr as keyof typeof columns;
                    log('[Drag] Dropped on column', { destStatus });
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

            startTransition(async () => {
                setOptimisticIssues(newIssues);
                log('[Drag] Removing label for backlog', { oldLabel });

                const result = await moveIssue(
                    activeProjectId,
                    activeIssue.iid,
                    '', // New label is empty for backlog
                    oldLabel
                );

                if (!result.success) {
                    log('[Drag] Failed to move to backlog', result.error);
                    toast({
                        title: "Error moving issue",
                        description: result.error,
                        variant: "destructive",
                    });
                    setIssues(issues);
                } else {
                    log('[Drag] Successfully moved to backlog');
                }
                endSync();
            });
            return;
        }

        if (!destStatus) {
            log('[Drag] No destination status, aborting');
            endSync();
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

            startTransition(async () => {
                setOptimisticIssues(newIssues);
                log('[Drag] Moving from backlog, adding label', { newLabel });

                const result = await moveIssue(
                    activeProjectId,
                    activeIssue.iid,
                    newLabel,
                    '' // Empty old label for backlog
                );

                if (!result.success) {
                    log('[Drag] Failed to move from backlog', result.error);
                    toast({
                        title: "Error moving issue",
                        description: result.error,
                        variant: "destructive",
                    });
                    setIssues(issues);
                } else {
                    log('[Drag] Successfully moved from backlog');
                }
                endSync();
            });
            return;
        }

        if (!sourceStatus || !destStatus) {
            log('[Drag] Missing source or dest status', { sourceStatus, destStatus });
            endSync();
            return;
        }

        // Handle reordering within the same column
        // Check if both source and dest are the same column (or both in backlog)
        const overIssueStatus = overIssue ? Object.keys(columns).find((key) =>
            overIssue.labels.includes(columns[key as keyof typeof columns])
        ) as keyof typeof columns | undefined : undefined;
        const overInBacklog = overIssue && !overIssueStatus;

        const isSameColumn = (sourceStatus === destStatus && sourceStatus !== undefined) ||
            (isFromBacklog && (overIdStr === 'backlog' || overInBacklog));

        if (isSameColumn && activeIdStr !== overIdStr) {
            log('[Drag] Same column reorder completed (handled in dragOver)', {
                activeId: activeIdStr,
                overId: overIdStr,
                sourceStatus,
                destStatus,
                isFromBacklog,
                isSameColumn
            });
            // Reordering is already handled in handleDragOver, just stop syncing indicator
            endSync();
            return;
        }

        const oldLabel = columns[sourceStatus];
        const newLabel = columns[destStatus];

        log('[Drag] Moving between columns', { from: sourceStatus, to: destStatus, oldLabel, newLabel });

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
            const [overProjectId, overIssueIid] = overIdStr.split('-').map(Number);
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

        startTransition(async () => {
            setOptimisticIssues(newIssues);

            const result = await moveIssue(
                activeProjectId,
                activeIssue.iid,
                newLabel,
                oldLabel
            );

            if (!result.success) {
                log('[Drag] Failed to move between columns', result.error);
                toast({
                    title: "Error moving issue",
                    description: result.error,
                    variant: "destructive",
                });
                setIssues(issues);
            } else {
                log('[Drag] Successfully moved between columns');
            }
            endSync();
        });
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
        <LabelColorsProvider labels={labels}>
            <div className="flex flex-col h-full">
                {/* Sticky Header */}
                <div className="flex justify-between items-center mb-6 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2">
                    {/* Search Input Container */}
                    <div className="relative w-80" ref={searchContainerRef}>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Search or type @label..."
                                value={searchQuery}
                                onChange={handleSearchInput}
                                onKeyDown={handleKeyDown}
                                className="w-full pl-10 pr-8 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background shadow-sm text-foreground"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => { setSearchQuery(''); setShowLabelSuggestions(false); }}
                                    className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {/* Autocomplete Dropdown */}
                        {showLabelSuggestions && filteredLabels.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                                <div className="px-3 py-2 bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase">
                                    Select Label
                                </div>
                                <ul className="max-h-48 overflow-y-auto">
                                    {filteredLabels.map((label: any, index: number) => (
                                        <li
                                            key={label.id}
                                            onClick={() => selectLabel(label.name)}
                                            className={`px-3 py-2 flex items-center gap-2 cursor-pointer text-sm ${index === activeSuggestionIndex ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50 text-foreground'
                                                }`}
                                        >
                                            <span
                                                className="w-3 h-3 rounded-full border border-foreground/10"
                                                style={{ backgroundColor: label.color }}
                                            ></span>
                                            <span className="font-medium">{label.name}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Syncing Badge */}
                    {isSyncing && (
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 animate-in fade-in duration-300">
                            <Loader2 className="h-4 w-4 text-primary animate-spin" />
                        </div>
                    )}
                </div>

                <DndContext
                    id="kanban-board-dnd-context"
                    sensors={sensors}
                    collisionDetection={collisionDetectionStrategy}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                >
                    <div className="flex h-full gap-6 overflow-x-auto pb-4 items-start px-6">
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
        </LabelColorsProvider>
    );
}
