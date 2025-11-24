'use client';

import { useState, useEffect } from 'react'; import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, closestCenter } from '@dnd-kit/core'; import { arrayMove } from '@dnd-kit/sortable'; import { KanbanColumn } from './KanbanColumn'; import { KanbanCard, IssueCard } from './KanbanCard'; import { moveIssue } from '@/app/actions/board'; import { toast } from '@/components/ui/use-toast';

interface KanbanBoardProps { project: { id: number; qaLabelMapping: { pending: string; passed: string; failed: string; }; }; issues: any[]; }

export function KanbanBoard({ project, issues: initialIssues }: KanbanBoardProps) {
    const [issues, setIssues] = useState(initialIssues); const [activeId, setActiveId] = useState<string | null>(null);

    // Update local state when server data changes
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

        // 1. Determine Source and Destination Status
        const sourceStatus = Object.keys(columns).find(key =>
            activeIssue.labels.includes(columns[key as keyof typeof columns])
        ) as keyof typeof columns | undefined;

        let destStatus: keyof typeof columns | undefined;
        let droppedOnCard = false;

        // Check if dropped on a card
        const overIssue = issues.find(i => i.id.toString() === over.id);
        if (overIssue) {
            droppedOnCard = true;
            destStatus = Object.keys(columns).find(key =>
                overIssue.labels.includes(columns[key as keyof typeof columns])
            ) as keyof typeof columns;
        } else {
            // Dropped on a column container
            const isColumn = Object.keys(columns).includes(over.id);
            if (isColumn) {
                destStatus = over.id as keyof typeof columns;
            }
        }

        if (!sourceStatus || !destStatus) return;

        // 2. Handle Reordering in Same Column (Visual Only)
        if (sourceStatus === destStatus && droppedOnCard) {
            const activeIndex = issues.findIndex(i => i.id.toString() === active.id);
            const overIndex = issues.findIndex(i => i.id.toString() === over.id);

            if (activeIndex !== overIndex) {
                setIssues((items) => arrayMove(items, activeIndex, overIndex));
            }
            return;
        }

        // 3. Handle Moving Between Columns
        const oldLabel = columns[sourceStatus];
        const newLabel = columns[destStatus];

        // Optimistic Update: Update label and timestamp
        // We update timestamp to 'now' because the server will sort by updated_at DESC.
        // This prevents the card from "jumping" when the server revalidates.
        const updatedIssue = {
            ...activeIssue,
            updated_at: new Date().toISOString(),
            labels: activeIssue.labels.filter((l: string) => l !== oldLabel).concat(newLabel)
        };

        // Remove active issue from its old position
        const activeIndex = issues.findIndex(i => i.id.toString() === active.id);
        let newIssues = [...issues];
        newIssues.splice(activeIndex, 1);

        // Calculate Insertion Index
        let insertIndex = 0;

        if (droppedOnCard && overIssue) {
            // If dropped on a card, we try to insert it at that specific visual position
            // We need to find where that card is in the GLOBAL list
            const overIndex = issues.findIndex(i => i.id.toString() === over.id);

            // Since we removed the item at 'activeIndex', if 'activeIndex' was before 'overIndex',
            // the indices have shifted down by 1.
            insertIndex = overIndex;
            if (activeIndex < overIndex) {
                insertIndex--;
            }
        } else {
            // Dropped on column background -> Insert at the TOP of the global list (Index 0)
            // This effectively puts it at the top of the destination column.
            // This matches backend behavior (sort by updated_at DESC).
            insertIndex = 0;
        }

        // Insert the updated issue
        newIssues.splice(insertIndex, 0, updatedIssue);
        setIssues(newIssues);

        // 4. Server Action
        const result = await moveIssue(project.id, activeIssue.iid, newLabel, oldLabel);

        if (!result.success) {
            toast({ title: "Error moving issue", description: result.error, variant: "destructive" });
            setIssues(issues); // Revert to original state on failure
        } else {
            // Optional: Toast success
            // toast({ title: "Issue moved", description: `Moved to ${destStatus}` });
        }
    };

    const activeIssue = activeId ? issues.find(i => i.id.toString() === activeId) : null;

    return (
        <DndContext
            id="kanban-board-dnd-context"
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
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