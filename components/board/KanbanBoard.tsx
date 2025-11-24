'use client';

import { useState, useEffect } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, closestCenter } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard, IssueCard } from './KanbanCard';
import { moveIssue } from '@/app/actions/board';
import { toast } from '@/components/ui/use-toast';

interface KanbanBoardProps {
    project: {
        id: number;
        qaLabelMapping: {
            pending: string;
            passed: string;
            failed: string;
        };
    };
    issues: any[];
}

export function KanbanBoard({ project, issues: initialIssues }: KanbanBoardProps) {
    const [issues, setIssues] = useState(initialIssues);
    const [activeId, setActiveId] = useState<string | null>(null);

    // Update local state when server data changes (e.g. polling or revalidation)
    useEffect(() => {
        setIssues(initialIssues);
    }, [initialIssues]);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    const columns = {
        pending: project.qaLabelMapping.pending,
        passed: project.qaLabelMapping.passed,
        failed: project.qaLabelMapping.failed,
    };

    const getIssuesByStatus = (status: keyof typeof columns) => {
        const label = columns[status];
        return issues.filter(i => i.labels.includes(label));
    };

    const handleDragStart = (event: any) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = async (event: any) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeIssue = issues.find(i => i.id.toString() === active.id);
        if (!activeIssue) return;

        // Find source column (status)
        const sourceStatus = Object.keys(columns).find(key =>
            activeIssue.labels.includes(columns[key as keyof typeof columns])
        ) as keyof typeof columns | undefined;

        // Find destination column and the card we're dropping over
        let destStatus: keyof typeof columns | undefined;
        let overIssue: any = null;
        let droppedOnCard = false;

        // Check if dropped on a card
        const possibleOverIssue = issues.find(i => i.id.toString() === over.id);
        if (possibleOverIssue) {
            overIssue = possibleOverIssue;
            droppedOnCard = true;
            destStatus = Object.keys(columns).find(key =>
                overIssue.labels.includes(columns[key as keyof typeof columns])
            ) as keyof typeof columns;
        } else {
            // Dropped on a column container (empty or on background)
            const isColumn = Object.keys(columns).includes(over.id);
            if (isColumn) {
                destStatus = over.id as keyof typeof columns;
            }
        }

        if (!sourceStatus || !destStatus) return;

        const activeIndex = issues.findIndex(i => i.id.toString() === active.id);

        // Handle reordering in same column
        if (sourceStatus === destStatus && droppedOnCard) {
            const overIndex = issues.findIndex(i => i.id.toString() === over.id);

            if (activeIndex !== overIndex) {
                setIssues((items) => arrayMove(items, activeIndex, overIndex));
                // Note: We are not persisting reordering to the server in this prototype
                // as the backend/mock data doesn't support ranking yet.
                // But the UI will update.
            }
            return;
        }

        // Moving between columns
        const oldLabel = columns[sourceStatus];
        const newLabel = columns[destStatus];

        // Calculate new position
        let newIssues = [...issues];

        // Remove the active issue from its current position
        const [movedIssue] = newIssues.splice(activeIndex, 1);

        // Update the issue's labels
        const updatedIssue = {
            ...movedIssue,
            labels: movedIssue.labels.filter((l: string) => l !== oldLabel).concat(newLabel)
        };

        // Find the insertion index
        let insertIndex: number;
        if (droppedOnCard && overIssue) {
            // Insert at the position of the card we dropped on
            insertIndex = newIssues.findIndex(i => i.id.toString() === over.id);
        } else {
            // Dropped on empty column or column background - add to end of that column
            const destColumnIssues = newIssues.filter(i =>
                i.labels.includes(columns[destStatus as keyof typeof columns])
            );
            if (destColumnIssues.length > 0) {
                // Find the last issue in destination column
                const lastIssueInDestColumn = destColumnIssues[destColumnIssues.length - 1];
                insertIndex = newIssues.findIndex(i => i.id === lastIssueInDestColumn.id) + 1;
            } else {
                // Column is empty, find where it should go based on column order
                // Add it after the last issue of the previous column, or at the start
                const columnOrder: (keyof typeof columns)[] = ['pending', 'passed', 'failed'];
                const destColumnIndex = columnOrder.indexOf(destStatus);
                let insertAfterColumn: keyof typeof columns | null = null;
                for (let i = destColumnIndex - 1; i >= 0; i--) {
                    const prevColumnIssues = newIssues.filter(issue =>
                        issue.labels.includes(columns[columnOrder[i]])
                    );
                    if (prevColumnIssues.length > 0) {
                        insertAfterColumn = columnOrder[i];
                        break;
                    }
                }

                if (insertAfterColumn) {
                    const prevColumnIssues = newIssues.filter(i =>
                        i.labels.includes(columns[insertAfterColumn as keyof typeof columns])
                    );
                    const lastInPrevColumn = prevColumnIssues[prevColumnIssues.length - 1];
                    insertIndex = newIssues.findIndex(i => i.id === lastInPrevColumn.id) + 1;
                } else {
                    insertIndex = 0;
                }
            }
        }

        // Insert the updated issue at the calculated position
        newIssues.splice(insertIndex, 0, updatedIssue);

        setIssues(newIssues);

        // Server Action
        const result = await moveIssue(project.id, activeIssue.iid, newLabel, oldLabel);
        if (!result.success) {
            toast({ title: "Error moving issue", description: result.error, variant: "destructive" });
            setIssues(issues); // Revert
        } else {
            toast({ title: "Issue moved", description: `Moved to ${destStatus}` });
        }
    };

    const activeIssue = activeId ? issues.find(i => i.id.toString() === activeId) : null;

    return (
        <DndContext id="kanban-board-dnd-context" sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex h-full gap-6 overflow-x-auto pb-4 items-start">
                <KanbanColumn id="pending" title="Ready for QA" issues={getIssuesByStatus('pending')} projectId={project.id} />
                <KanbanColumn id="passed" title="Passed" issues={getIssuesByStatus('passed')} projectId={project.id} />
                <KanbanColumn id="failed" title="Failed" issues={getIssuesByStatus('failed')} projectId={project.id} />
            </div>
            <DragOverlay>
                {activeIssue ? <IssueCard issue={activeIssue} projectId={project.id} isOverlay /> : null}
            </DragOverlay>
        </DndContext>
    );
}
