'use client';

import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import { Button } from '@/components/ui/button';
import { Bold, Italic, List, ListOrdered, Code, ScrollText } from 'lucide-react';
import tippy from 'tippy.js';
// import 'tippy.js/dist/tippy.css';
import { MentionList } from './MentionList';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TiptapEditor({ content, onChange, members, placeholder, snippets = [] }: any) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Mention.configure({
                HTMLAttributes: {
                    class: 'mention font-medium text-indigo-600 bg-indigo-50 px-1 rounded-sm',
                },
                suggestion: {
                    items: ({ query }) => {
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
        onUpdate: ({ editor }) => {
            onChange(editor.getJSON());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[150px] p-4 border rounded-md bg-white',
            },
        },
    });

    if (!editor) return null;

    const insertSnippet = (snippetContent: string) => {
        editor.chain().focus().insertContent(snippetContent).run();
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-1 border-b pb-2">
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

                <div className="ml-auto">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
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
            <EditorContent editor={editor} />
        </div>
    );
}
