'use client';

import { useState } from 'react';
import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import Emoji from '@tiptap/extension-emoji';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import { Button } from '@/components/ui/button';
import { Bold, Italic, List, ListOrdered, Code, ScrollText, Table as TableIcon } from 'lucide-react';
import tippy from 'tippy.js';
// import 'tippy.js/dist/tippy.css';
import { MentionList } from './MentionList';
import { EmojiList } from './EmojiList';
import { emojis } from './emojis';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";


export function TiptapEditor({ content, onChange, members, placeholder, snippets = [], onImagePaste, className }: any) {
    const [gridSelection, setGridSelection] = useState({ rows: 1, cols: 1 });
    const [isTablePopoverOpen, setIsTablePopoverOpen] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
            Emoji.configure({
                enableEmoticons: true,
                suggestion: {
                    items: ({ query }: any) => {
                        return emojis
                            .filter((e) => e.name.toLowerCase().startsWith(query.toLowerCase()) || e.shortcodes.some((s) => s.toLowerCase().startsWith(query.toLowerCase())))
                            .slice(0, 5);
                    },
                    render: () => {
                        let component: any;
                        let popup: any;

                        return {
                            onStart: (props: any) => {
                                component = new ReactRenderer(EmojiList, {
                                    props,
                                    editor: props.editor,
                                });

                                if (!props.clientRect) {
                                    return;
                                }

                                popup = tippy('body', {
                                    getReferenceClientRect: props.clientRect as any,
                                    appendTo: () => document.body,
                                    content: component.element,
                                    showOnCreate: true,
                                    interactive: true,
                                    trigger: 'manual',
                                    placement: 'bottom-start',
                                });
                            },
                            onUpdate(props: any) {
                                component.updateProps(props);

                                if (!props.clientRect) {
                                    return;
                                }

                                popup[0].setProps({
                                    getReferenceClientRect: props.clientRect,
                                });
                            },
                            onKeyDown(props: any) {
                                if (props.event.key === 'Escape') {
                                    popup[0].hide();
                                    return true;
                                }
                                return component.ref?.onKeyDown(props);
                            },
                            onExit() {
                                popup[0].destroy();
                                component.destroy();
                            },
                        };
                    },
                },
            }),
            Mention.configure({
                HTMLAttributes: {
                    class: 'mention font-medium text-primary bg-primary/10 px-1 rounded-sm',
                },
                suggestion: {
                    items: ({ query }: any) => {
                        return members
                            .filter((m: any) => m.name.toLowerCase().includes(query.toLowerCase()) || m.username.toLowerCase().includes(query.toLowerCase()))
                            .slice(0, 5)
                            .map((m: any) => ({ id: m.username, label: m.name, avatarUrl: m.avatar_url }));
                    },
                    render: () => {
                        let component: any;
                        let popup: any;

                        return {
                            onStart: (props: any) => {
                                component = new ReactRenderer(MentionList, {
                                    props,
                                    editor: props.editor,
                                });

                                if (!props.clientRect) {
                                    return;
                                }

                                popup = tippy('body', {
                                    getReferenceClientRect: props.clientRect as any,
                                    appendTo: () => document.body,
                                    content: component.element,
                                    showOnCreate: true,
                                    interactive: true,
                                    trigger: 'manual',
                                    placement: 'bottom-start',
                                });
                            },
                            onUpdate(props: any) {
                                component.updateProps(props);

                                if (!props.clientRect) {
                                    return;
                                }

                                popup[0].setProps({
                                    getReferenceClientRect: props.clientRect,
                                });
                            },
                            onKeyDown(props: any) {
                                if (props.event.key === 'Escape') {
                                    popup[0].hide();
                                    return true;
                                }
                                return component.ref?.onKeyDown(props);
                            },
                            onExit() {
                                popup[0].destroy();
                                component.destroy();
                            },
                        };
                    },
                },
            }),
        ],
        content,
        immediatelyRender: false, // Fix for SSR hydration in Next.js with React 19
        onUpdate: ({ editor }) => {
            onChange(editor.getJSON());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[150px] p-4 bg-transparent dark:prose-invert',
            },
            handlePaste: (view, event, slice) => {
                // Check if there are files in the clipboard
                const items = event.clipboardData?.items;
                if (!items) return false;

                for (let i = 0; i < items.length; i++) {
                    const item = items[i];

                    // Check if it's an image
                    if (item.type.indexOf('image') !== -1) {
                        event.preventDefault(); // Prevent default paste

                        const file = item.getAsFile();
                        if (!file) continue;

                        // Show upload toast
                        toast({
                            title: "Uploading image...",
                            description: file.name,
                        });

                        // Call the onImagePaste handler if provided
                        if (onImagePaste) {
                            onImagePaste(file)
                                .then((result: any) => {
                                    if (result?.markdown) {
                                        // Insert the markdown at cursor position using the view
                                        const { state } = view;
                                        const { tr } = state;
                                        tr.insertText(result.markdown, state.selection.from);
                                        view.dispatch(tr);

                                        toast({
                                            title: "Image uploaded",
                                            description: file.name,
                                        });
                                    }
                                })
                                .catch((error: any) => {
                                    toast({
                                        title: "Upload failed",
                                        description: error.message || "Failed to upload image",
                                        variant: "destructive",
                                    });
                                });
                        } else {
                            toast({
                                title: "Upload not configured",
                                description: "Image paste handler not available",
                                variant: "destructive",
                            });
                        }

                        return true; // Handled
                    }
                }

                return false; // Not handled, use default behavior
            },
        },
    });

    if (!editor) return null;

    const insertSnippet = (snippetContent: string) => {
        editor.chain().focus().insertContent(snippetContent).run();
    };

    const insertTable = (rows: number, cols: number) => {
        editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
        setIsTablePopoverOpen(false);
    };

    return (
        <div className={cn("flex flex-col border rounded-xl bg-card/50 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all duration-200 max-h-[600px]", className)}>
            <div className="flex items-center gap-1 border-b px-2 py-1 bg-muted/50 rounded-t-xl shrink-0">
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'bg-muted' : ''}>
                    <Bold className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'bg-muted' : ''}>
                    <Italic className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? 'bg-muted' : ''}>
                    <List className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive('orderedList') ? 'bg-muted' : ''}>
                    <ListOrdered className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={editor.isActive('codeBlock') ? 'bg-muted' : ''}>
                    <Code className="h-4 w-4" />
                </Button>

                <Popover open={isTablePopoverOpen} onOpenChange={setIsTablePopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className={editor.isActive('table') ? 'bg-muted' : ''}>
                            <TableIcon className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3" align="start">
                        <div className="flex flex-col gap-2">
                            <div
                                className="grid grid-cols-5 gap-1"
                                onMouseLeave={() => setGridSelection({ rows: 1, cols: 1 })}
                            >
                                {Array.from({ length: 25 }).map((_, i) => {
                                    const row = Math.floor(i / 5) + 1;
                                    const col = (i % 5) + 1;
                                    const isSelected = row <= gridSelection.rows && col <= gridSelection.cols;

                                    return (
                                        <button
                                            key={i}
                                            className={cn(
                                                "w-6 h-6 border rounded-sm transition-all",
                                                isSelected
                                                    ? "bg-primary/20 border-primary"
                                                    : "bg-muted/50 border-transparent hover:border-muted-foreground/30"
                                            )}
                                            onMouseEnter={() => setGridSelection({ rows: row, cols: col })}
                                            onClick={() => insertTable(row, col)}
                                            type="button"
                                            aria-label={`Select ${row} rows and ${col} columns`}
                                        />
                                    );
                                })}
                            </div>
                            <div className="text-center text-xs text-muted-foreground font-medium">
                                Insert a {gridSelection.rows}×{gridSelection.cols} table
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>

                <div className="ml-auto">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-2 text-primary hover:text-primary hover:bg-primary/10">
                                <ScrollText className="h-4 w-4" />
                                <span className="text-xs font-medium">Snippets</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            {snippets && snippets.length > 0 ? (
                                snippets.map((snippet: any) => (
                                    <DropdownMenuItem key={snippet.id} onClick={() => insertSnippet(snippet.content)}>
                                        <div className="flex flex-col gap-1">
                                            <span className="font-medium">{snippet.title}</span>
                                            <span className="text-xs text-muted-foreground line-clamp-1">{snippet.content}</span>
                                        </div>
                                    </DropdownMenuItem>
                                ))
                            ) : (
                                <div className="p-2 text-xs text-muted-foreground text-center">No snippets available</div>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-auto min-h-[150px]">
                <EditorContent editor={editor} className="h-full" />
            </div>
        </div>
    );
}
