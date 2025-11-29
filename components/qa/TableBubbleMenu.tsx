import { Editor } from '@tiptap/core';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface TableBubbleMenuProps {
    editor: Editor;
}

export function TableBubbleMenu({ editor }: TableBubbleMenuProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Update menu position and visibility
    useEffect(() => {
        if (!editor) return;

        const updateMenu = () => {
            const isTableActive = editor.isActive('table');
            setIsVisible(isTableActive);

            if (isTableActive) {
                // Find the table and position the menu
                const { view } = editor;
                const { selection } = editor.state;

                let currentTable: HTMLTableElement | null = null;

                try {
                    // Walk up the document tree to find table node
                    const resolvedPos = view.state.doc.resolve(selection.from);
                    let depth = resolvedPos.depth;

                    while (depth >= 0) {
                        const node = resolvedPos.node(depth);
                        if (node.type.name === 'table') {
                            const domInfo = view.domAtPos(resolvedPos.start(depth));
                            const element = domInfo.node instanceof HTMLElement ? domInfo.node : domInfo.node.parentElement;
                            currentTable = element?.closest('table') as HTMLTableElement;
                            break;
                        }
                        depth--;
                    }

                    // Fallback methods
                    if (!currentTable) {
                        const domInfo = view.domAtPos(selection.from);
                        const node = domInfo.node;
                        const element = node instanceof HTMLElement ? node : node.parentElement;
                        currentTable = element?.closest('table') as HTMLTableElement;
                    }

                    if (!currentTable) {
                        const editorElement = view.dom.closest('.ProseMirror') as HTMLElement;
                        currentTable = editorElement?.querySelector('table') as HTMLTableElement;
                    }

                    if (currentTable) {
                        const rect = currentTable.getBoundingClientRect();
                        setPosition({ top: rect.top - 8, left: rect.left });
                    }
                } catch (e) {
                    // Ignore errors
                }
            } else {
                setIsVisible(false);
                setIsOpen(false);
            }
        };

        // Update immediately
        updateMenu();

        // Listen for editor updates
        editor.on('selectionUpdate', updateMenu);
        editor.on('update', updateMenu);

        // Handle scroll and resize
        const handleScroll = () => updateMenu();
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleScroll);

        return () => {
            editor.off('selectionUpdate', updateMenu);
            editor.off('update', updateMenu);
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleScroll);
        };
    }, [editor]);

    // Close dropdown when clicking outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    if (!editor || !isVisible || !position) {
        return null;
    }

    return createPortal(
        <div
            ref={menuRef}
            className="fixed z-50 flex flex-col gap-1"
            style={{
                top: position.top,
                left: position.left,
            }}
        >
            <Button
                ref={buttonRef}
                variant="secondary"
                size="sm"
                type="button"
                className="h-6 w-6 p-0 shadow-sm border bg-background hover:bg-muted"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }}
            >
                <ChevronDown className="h-3 w-3" />
            </Button>

            {isOpen && (
                <div
                    className="w-48 rounded-md border bg-popover p-1 shadow-md"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                >
                    <button
                        type="button"
                        className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            editor.chain().focus().addColumnBefore().run();
                            setIsOpen(false);
                        }}
                    >
                        Insert column left
                    </button>
                    <button
                        type="button"
                        className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            editor.chain().focus().addColumnAfter().run();
                            setIsOpen(false);
                        }}
                    >
                        Insert column right
                    </button>
                    <button
                        type="button"
                        className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            editor.chain().focus().addRowBefore().run();
                            setIsOpen(false);
                        }}
                    >
                        Insert row above
                    </button>
                    <button
                        type="button"
                        className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            editor.chain().focus().addRowAfter().run();
                            setIsOpen(false);
                        }}
                    >
                        Insert row below
                    </button>

                    <div className="h-px my-1 bg-border" />

                    <button
                        type="button"
                        className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent text-destructive"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            editor.chain().focus().deleteColumn().run();
                            setIsOpen(false);
                        }}
                    >
                        Delete column
                    </button>
                    <button
                        type="button"
                        className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent text-destructive"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            editor.chain().focus().deleteRow().run();
                            setIsOpen(false);
                        }}
                    >
                        Delete row
                    </button>

                    <div className="h-px my-1 bg-border" />

                    <button
                        type="button"
                        className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent text-destructive"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            editor.chain().focus().deleteTable().run();
                            setIsOpen(false);
                        }}
                    >
                        Delete table
                    </button>
                </div>
            )}
        </div>,
        document.body
    );
}
