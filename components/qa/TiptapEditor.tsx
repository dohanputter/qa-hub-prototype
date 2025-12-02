'use client';

// Enhanced Tiptap Editor
import { useState } from 'react';
import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import Emoji from '@tiptap/extension-emoji';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Button } from '@/components/ui/button';
import { Bold, Italic, List, ListOrdered, Code, ScrollText, Table as TableIcon, Type, CheckSquare } from 'lucide-react';
import tippy from 'tippy.js';
import { marked } from 'marked';
import { MentionList } from './MentionList';
import { EmojiList } from './EmojiList';
import { TableBubbleMenu } from './TableBubbleMenu';
import { emojis } from './emojis';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontSize } from './extensions/FontSize';
import { ResizableImage } from './extensions/ResizableImage';
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
import type { TiptapEditorProps, EditorMember, EditorSnippet } from '@/types/editor';

export function TiptapEditor({
    content,
    onChange,
    members = [],
    placeholder,
    snippets = [],
    onImagePaste,
    className,
    readOnly = false
}: TiptapEditorProps) {
    const [gridSelection, setGridSelection] = useState({ rows: 1, cols: 1 });
    const [isTablePopoverOpen, setIsTablePopoverOpen] = useState(false);

    // Normalize content to handle both JSONContent and string types
    const normalizedContent = typeof content === 'string'
        ? (() => {
            try {
                // Try to parse as JSON first
                const parsed = JSON.parse(content);
                if (parsed && typeof parsed === 'object' && parsed.type === 'doc') {
                    return parsed;
                }
            } catch (e) {
                // Not a JSON string
            }

            // Treat as Markdown -> HTML
            try {
                return marked.parse(content);
            } catch (e) {
                // Fallback to plain text wrapped in paragraph
                return content ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: content }] }] } : null;
            }
        })()
        : content;

    const editor = useEditor({
        editable: !readOnly,
        extensions: [
            StarterKit.configure({
                // Disable the default image extension since we're using ResizableImage
            }),
            TextStyle,
            FontSize,
            ResizableImage,
            TaskList.configure({
                HTMLAttributes: {
                    class: 'not-prose pl-2',
                },
            }),
            TaskItem.configure({
                nested: true,
                HTMLAttributes: {
                    class: 'task-item',
                },
            }),
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
                    items: ({ query }: { query: string }) => {
                        return members
                            .filter((m: EditorMember) => m.name.toLowerCase().includes(query.toLowerCase()) || m.username.toLowerCase().includes(query.toLowerCase()))
                            .slice(0, 5)
                            .map((m: EditorMember) => ({ id: m.username, label: m.name, avatarUrl: m.avatar_url }));
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
        content: normalizedContent,
        immediatelyRender: false, // Fix for SSR hydration in Next.js with React 19
        onUpdate: ({ editor }) => {
            if (!readOnly && onChange) {
                onChange(editor.getJSON());
            }
        },
        editorProps: {
            attributes: {
                class: cn(
                    'prose prose-sm sm:prose max-w-none w-full min-w-full focus:outline-none min-h-[150px] p-4 bg-transparent dark:prose-invert',
                    readOnly && 'min-h-0 p-0'
                ),
            },
            handlePaste: (view, event, slice) => {
                if (readOnly) return false;

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
                                    if (result?.url) {
                                        // Store the ORIGINAL URL (not proxied) so GitLab can view it
                                        // The ResizableImage extension will handle proxying for display
                                        const originalUrl = result.url.startsWith('http')
                                            ? result.url
                                            : result.url.startsWith('/')
                                                ? `${window.location.origin}${result.url}`
                                                : result.url;

                                        // Insert image node with original URL (proxy happens in node view)
                                        if (!editor) return;
                                        editor.chain()
                                            .focus()
                                            .insertContent({
                                                type: 'resizableImage',
                                                attrs: {
                                                    src: originalUrl, // Store original for GitLab compatibility
                                                    alt: file.name || 'Uploaded image',
                                                },
                                            })
                                            .run();

                                        toast({
                                            title: "Image uploaded",
                                            description: file.name,
                                        });
                                    } else if (result?.markdown) {
                                        // Fallback to markdown if no URL
                                        const { state, dispatch } = view;
                                        const { tr } = state;
                                        tr.insertText(result.markdown, state.selection.from);
                                        dispatch(tr);

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
        <div className={cn(
            "flex flex-col border border-zinc-400 dark:border-border rounded-xl bg-card focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all duration-200 overflow-hidden",
            readOnly && "border-0 bg-transparent shadow-none focus-within:ring-0 rounded-none",
            className
        )}>
            {!readOnly && (
                <div className="flex items-center gap-1 border-b px-2 py-1 bg-muted/30 rounded-t-xl shrink-0">
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
                    <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleTaskList().run()} className={editor.isActive('taskList') ? 'bg-muted' : ''}>
                        <CheckSquare className="h-4 w-4" />
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

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className={editor.isActive('textStyle', { fontSize: '12px' }) || editor.isActive('textStyle', { fontSize: '18px' }) || editor.isActive('textStyle', { fontSize: '24px' }) || editor.isActive('textStyle', { fontSize: '30px' }) ? 'bg-muted' : ''}>
                                <Type className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-32">
                            <DropdownMenuItem onClick={() => editor.chain().focus().setFontSize('12px').run()}>
                                <span className="text-xs">Small</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => editor.chain().focus().unsetFontSize().run()}>
                                <span className="text-sm">Normal</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => editor.chain().focus().setFontSize('18px').run()}>
                                <span className="text-lg">Large</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => editor.chain().focus().setFontSize('24px').run()}>
                                <span className="text-xl">Extra Large</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => editor.chain().focus().setFontSize('30px').run()}>
                                <span className="text-2xl">Huge</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

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
                                    snippets.map((snippet: EditorSnippet) => (
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
            )}
            <div className={cn(
                "flex-1 overflow-y-auto overflow-x-auto min-h-[150px]",
                readOnly && "min-h-0 overflow-visible"
            )}>
                <EditorContent editor={editor} className="h-full" />
                {!readOnly && <TableBubbleMenu editor={editor} />}
            </div>
        </div>
    );
}
