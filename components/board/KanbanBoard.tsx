'use client';

import { useState, useEffect } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, closestCorners } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
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

        // Find destination column
        let destStatus = over.id as keyof typeof columns;

        // If dropped on a card, find that card's status
        if (!columns[destStatus]) {
            const overIssue = issues.find(i => i.id.toString() === over.id);
            if (overIssue) {
                destStatus = Object.keys(columns).find(key =>
                    overIssue.labels.includes(columns[key as keyof typeof columns])
                ) as keyof typeof columns;
            } else {
                // Check if dropped on a column container directly (when empty)
                // The droppable ID for column is the status key (pending, passed, failed)
                const isColumn = Object.keys(columns).includes(over.id);
                if (isColumn) {
                    destStatus = over.id as keyof typeof columns;
                }
            }
        }

        if (!sourceStatus || !destStatus) return;

        // Handle reordering in same column
        if (sourceStatus === destStatus) {
            const oldIndex = issues.findIndex(i => i.id.toString() === active.id);
            const newIndex = issues.findIndex(i => i.id.toString() === over.id);

            if (oldIndex !== newIndex) {
                setIssues((items) => arrayMove(items, oldIndex, newIndex));
                // Note: We are not persisting reordering to the server in this prototype
                // as the backend/mock data doesn't support ranking yet.
                // But the UI will update.
            }
            return;
        }

        // Optimistic Update for moving between columns
        const oldLabel = columns[sourceStatus];
        const newLabel = columns[destStatus];

        const newIssues = issues.map(i => {
            if (i.id.toString() === active.id) {
                return {
                    ...i,
                    labels: i.labels.filter((l: string) => l !== oldLabel).concat(newLabel)
                };
            }
            return i;
        });

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
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex h-full gap-6 overflow-x-auto pb-4 items-start">
                <KanbanColumn id="pending" title="Ready for QA" issues={getIssuesByStatus('pending')} projectId={project.id} />
                <KanbanColumn id="passed" title="Passed" issues={getIssuesByStatus('passed')} projectId={project.id} />
                <KanbanColumn id="failed" title="Failed" issues={getIssuesByStatus('failed')} projectId={project.id} />
            </div>
            <DragOverlay>
                {activeIssue ? <KanbanCard issue={activeIssue} projectId={project.id} /> : null}
            </DragOverlay>
        </DndContext>
    );
}
