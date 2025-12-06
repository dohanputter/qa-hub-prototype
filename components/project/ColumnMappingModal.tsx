'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/Select';
import { toast } from '@/components/ui/useToast';
import {
    GripVertical,
    Plus,
    Trash2,
    RefreshCw,
    Settings2,
    Loader2
} from 'lucide-react';
import {
    getProjectColumnMapping,
    saveProjectColumnMapping,
    getGitLabLabelsForMapping
} from '@/app/actions/columnMapping';
import type { QAColumn, QAColumnType } from '@/types';

interface ColumnMappingModalProps {
    projectId: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave?: () => void;
}

interface GitLabLabelOption {
    id: number;
    name: string;
    color: string;
    text_color: string;
    description?: string;
}

const COLUMN_TYPE_OPTIONS: { value: QAColumnType; label: string; description: string }[] = [
    { value: 'queue', label: 'Queue', description: 'Waiting state - tracks wait time' },
    { value: 'active', label: 'Active', description: 'Testing state - starts QA run timer' },
    { value: 'passed', label: 'Passed', description: 'Completes run as passed' },
    { value: 'failed', label: 'Failed', description: 'Completes run as failed' },
    { value: 'standard', label: 'Standard', description: 'No special behavior' },
];

export function ColumnMappingModal({
    projectId,
    open,
    onOpenChange,
    onSave
}: ColumnMappingModalProps) {
    const [columns, setColumns] = useState<QAColumn[]>([]);
    const [gitLabLabels, setGitLabLabels] = useState<GitLabLabelOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isFetchingLabels, setIsFetchingLabels] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    // Load current configuration
    const loadConfiguration = useCallback(async () => {
        setIsLoading(true);
        try {
            const [mapping, labels] = await Promise.all([
                getProjectColumnMapping(projectId),
                getGitLabLabelsForMapping(projectId),
            ]);
            setColumns(mapping);
            setGitLabLabels(labels);
        } catch (error) {
            console.error('Failed to load configuration:', error);
            toast({
                title: 'Error',
                description: 'Failed to load column configuration',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        if (open) {
            loadConfiguration();
        }
    }, [open, loadConfiguration]);

    const fetchGitLabLabels = async () => {
        setIsFetchingLabels(true);
        try {
            const labels = await getGitLabLabelsForMapping(projectId);
            setGitLabLabels(labels);
            toast({
                title: 'Labels Fetched',
                description: `Found ${labels.length} labels from GitLab`,
            });
        } catch (error) {
            console.error('Failed to fetch labels:', error);
            toast({
                title: 'Error',
                description: 'Failed to fetch GitLab labels',
                variant: 'destructive',
            });
        } finally {
            setIsFetchingLabels(false);
        }
    };

    const addColumn = () => {
        const newColumn: QAColumn = {
            id: `column-${Date.now()}`,
            title: 'New Column',
            gitlabLabel: '',
            color: '#6b7280',
            order: columns.length,
            columnType: 'standard',
        };
        setColumns([...columns, newColumn]);
    };

    const removeColumn = (index: number) => {
        const column = columns[index];
        // Prevent removing passed or failed columns if they're the only ones
        if (column.columnType === 'passed') {
            const passedCount = columns.filter(c => c.columnType === 'passed').length;
            if (passedCount <= 1) {
                toast({
                    title: 'Cannot Remove',
                    description: 'Must have at least one Passed column',
                    variant: 'destructive',
                });
                return;
            }
        }
        if (column.columnType === 'failed') {
            const failedCount = columns.filter(c => c.columnType === 'failed').length;
            if (failedCount <= 1) {
                toast({
                    title: 'Cannot Remove',
                    description: 'Must have at least one Failed column',
                    variant: 'destructive',
                });
                return;
            }
        }
        setColumns(columns.filter((_, i) => i !== index));
    };

    const updateColumn = (index: number, field: keyof QAColumn, value: string) => {
        const updated = [...columns];

        if (field === 'gitlabLabel') {
            // When label changes, auto-update color from the selected label
            const label = gitLabLabels.find(l => l.name === value);
            if (label) {
                updated[index] = {
                    ...updated[index],
                    [field]: value,
                    color: label.color
                };
            } else {
                updated[index] = { ...updated[index], [field]: value };
            }
        } else if (field === 'title') {
            // When title changes, generate a slug for the ID if it's a new column
            updated[index] = {
                ...updated[index],
                [field]: value,
                id: updated[index].id.startsWith('column-')
                    ? value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                    : updated[index].id
            };
        } else {
            updated[index] = { ...updated[index], [field]: value };
        }

        setColumns(updated);
    };

    // Drag and drop handlers
    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const newColumns = [...columns];
        const draggedColumn = newColumns[draggedIndex];
        newColumns.splice(draggedIndex, 1);
        newColumns.splice(index, 0, draggedColumn);

        // Update order values
        newColumns.forEach((col, i) => {
            col.order = i;
        });

        setColumns(newColumns);
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const result = await saveProjectColumnMapping(projectId, columns);
            if (result.success) {
                toast({
                    title: 'Saved',
                    description: 'Column configuration saved successfully',
                });
                onSave?.();
                onOpenChange(false);
            } else {
                toast({
                    title: 'Error',
                    description: result.error || 'Failed to save configuration',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Failed to save:', error);
            toast({
                title: 'Error',
                description: 'Failed to save configuration',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings2 className="h-5 w-5" />
                        Configure Workflow Columns
                    </DialogTitle>
                    <DialogDescription>
                        Map QA workflow columns to GitLab labels. Changes here won&apos;t affect GitLab.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto space-y-4 py-4">
                        {/* Fetch Labels Button */}
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-muted-foreground">
                                {gitLabLabels.length} GitLab labels available
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchGitLabLabels}
                                disabled={isFetchingLabels}
                            >
                                {isFetchingLabels ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                )}
                                Refresh GitLab Labels
                            </Button>
                        </div>

                        {/* Column List */}
                        <div className="space-y-2">
                            {columns.map((column, index) => (
                                <div
                                    key={column.id}
                                    draggable
                                    onDragStart={() => handleDragStart(index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragEnd={handleDragEnd}
                                    className={`flex items-center gap-3 p-3 rounded-lg border bg-card transition-all ${draggedIndex === index ? 'opacity-50 scale-[0.98]' : ''
                                        }`}
                                >
                                    {/* Drag Handle */}
                                    <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                                        <GripVertical className="h-5 w-5" />
                                    </div>

                                    {/* Color Indicator */}
                                    <div
                                        className="w-4 h-4 rounded-full border border-border flex-shrink-0"
                                        style={{ backgroundColor: column.color }}
                                    />

                                    {/* Column Title */}
                                    <div className="flex-1 min-w-0">
                                        <Input
                                            value={column.title}
                                            onChange={(e) => updateColumn(index, 'title', e.target.value)}
                                            placeholder="Column name"
                                            className="h-8"
                                        />
                                    </div>

                                    {/* GitLab Label Selector */}
                                    <div className="w-48">
                                        <Select
                                            value={column.gitlabLabel || 'none'}
                                            onValueChange={(value) => updateColumn(index, 'gitlabLabel', value === 'none' ? '' : value)}
                                        >
                                            <SelectTrigger className="h-8">
                                                <SelectValue placeholder="Select label" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">
                                                    <span className="text-muted-foreground">No label</span>
                                                </SelectItem>
                                                {gitLabLabels.map((label) => (
                                                    <SelectItem key={label.id} value={label.name}>
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className="w-3 h-3 rounded-full flex-shrink-0"
                                                                style={{ backgroundColor: label.color }}
                                                            />
                                                            <span className="truncate">{label.name}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Column Type Selector */}
                                    <div className="w-32">
                                        <Select
                                            value={column.columnType}
                                            onValueChange={(value) => updateColumn(index, 'columnType', value)}
                                        >
                                            <SelectTrigger className="h-8">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {COLUMN_TYPE_OPTIONS.map((opt) => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                        <span className="font-medium">{opt.label}</span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Delete Button */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        onClick={() => removeColumn(index)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        {/* Add Column Button */}
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={addColumn}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Column
                        </Button>

                        {/* Legend */}
                        <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                            <p className="font-medium mb-2">Column Type Behaviors:</p>
                            <ul className="space-y-1 text-muted-foreground">
                                <li><strong className="text-foreground">Queue:</strong> Sets wait time timestamp (for metrics)</li>
                                <li><strong className="text-foreground">Active:</strong> Starts QA run timer</li>
                                <li><strong className="text-foreground">Passed:</strong> Completes QA run as passed</li>
                                <li><strong className="text-foreground">Failed:</strong> Completes QA run as failed</li>
                                <li><strong className="text-foreground">Standard:</strong> No special behavior</li>
                            </ul>
                        </div>
                    </div>
                )}

                <DialogFooter className="border-t pt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving || isLoading}>
                        {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Save Configuration
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
