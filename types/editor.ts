/**
 * Editor-related types for TiptapEditor and related components
 */

import type { JSONContent } from '@tiptap/core';

export interface EditorMember {
    id?: number;
    name: string;
    username: string;
    avatar_url: string;
}

export interface EditorSnippet {
    id: number;
    title: string;
    content: string;
    type: 'test_case' | 'issue';
}

export interface ImageUploadResult {
    url: string;
    markdown: string;
}

export interface TiptapEditorProps {
    /** The current editor content - can be TipTap JSON, string (for backwards compat), or null */
    content: JSONContent | string | null | undefined;
    /** Callback when content changes */
    onChange?: (content: JSONContent) => void;
    /** List of members available for @mentions */
    members?: EditorMember[];
    /** Placeholder text when editor is empty */
    placeholder?: string;
    /** List of snippets available for insertion */
    snippets?: EditorSnippet[];
    /** Handler for pasted images - returns upload result with markdown */
    onImagePaste?: (file: File) => Promise<ImageUploadResult>;
    /** Additional CSS classes */
    className?: string;
    /** Whether the editor is read-only */
    readOnly?: boolean;
}

export interface ProjectLabel {
    id: number;
    name: string;
    color: string;
    text_color: string;
    description?: string;
}

