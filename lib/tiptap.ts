import type { JSONContent } from '@tiptap/core';
import { z } from 'zod';

// ============================================
// Tiptap Content Type Definitions (Zod Schemas)
// ============================================

/**
 * Schema for text marks (bold, italic, code, etc.)
 */
const TiptapMarkSchema = z.object({
    type: z.string(),
    attrs: z.record(z.unknown()).optional(),
});

/**
 * Base schema for any Tiptap node.
 * Uses lazy evaluation for recursive content.
 */
export const TiptapNodeSchema: z.ZodType<TiptapNode> = z.lazy(() =>
    z.object({
        type: z.string().optional(),
        text: z.string().optional(),
        attrs: z.record(z.unknown()).optional(),
        marks: z.array(TiptapMarkSchema).optional(),
        content: z.array(TiptapNodeSchema).optional(),
    })
);

/**
 * Type inferred from the Zod schema
 */
export type TiptapNode = {
    type?: string;
    text?: string;
    attrs?: Record<string, unknown>;
    marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
    content?: TiptapNode[];
};

/**
 * Validates and parses Tiptap content.
 * Returns null if content is invalid.
 */
export function parseTiptapContent(content: unknown): TiptapNode | null {
    const result = TiptapNodeSchema.safeParse(content);
    return result.success ? result.data : null;
}

// ============================================
// Text & Image Extraction
// ============================================

/**
 * Recursively extracts plain text from a Tiptap JSON structure.
 * Accepts unknown type for safety with runtime validation.
 *
 * @param content The Tiptap JSON content or any object structure
 * @returns A plain text string representation
 */
export function extractTextFromTiptap(content: unknown): string {
    if (!content) return '';

    // If it's a string, just return it
    if (typeof content === 'string') return content;

    // If it's an array, map and join
    if (Array.isArray(content)) {
        return content.map(extractTextFromTiptap).join(' ');
    }

    // Type guard for object with potential text/content properties
    if (typeof content === 'object' && content !== null) {
        const node = content as Record<string, unknown>;

        // If it has text property (Leaf node)
        if (typeof node.text === 'string') {
            return node.text;
        }

        // If it has content property (Node with children)
        if (node.content) {
            return extractTextFromTiptap(node.content);
        }
    }

    // Fallback: empty string
    return '';
}

/**
 * Recursively extracts all image URLs from a Tiptap JSON structure.
 * Accepts unknown type for safety with runtime validation.
 *
 * @param content The Tiptap JSON content
 * @returns An array of image URLs found in the content
 */
export function extractImageUrls(content: unknown): string[] {
    const urls: string[] = [];

    if (!content) return urls;

    // If it's an array, recurse
    if (Array.isArray(content)) {
        content.forEach(item => {
            urls.push(...extractImageUrls(item));
        });
        return urls;
    }

    // Type guard for object
    if (typeof content === 'object' && content !== null) {
        const node = content as Record<string, unknown>;

        // If it's an image node, get the src
        if (
            (node.type === 'image' || node.type === 'resizableImage') &&
            typeof node.attrs === 'object' &&
            node.attrs !== null
        ) {
            const attrs = node.attrs as Record<string, unknown>;
            if (typeof attrs.src === 'string') {
                urls.push(attrs.src);
            }
        }

        // If it has content (children), recurse
        if (node.content) {
            urls.push(...extractImageUrls(node.content));
        }
    }

    return urls;
}

/**
 * Extracts all @mentions from a Tiptap JSON structure.
 *
 * @param content The Tiptap JSON content
 * @returns An array of unique mention IDs (usernames)
 */
export function extractMentions(content: JSONContent | TiptapNode | null): string[] {
    if (!content) return [];

    const mentions: string[] = [];

    function traverse(node: JSONContent | TiptapNode) {
        if (node.type === 'mention' && node.attrs) {
            const id = node.attrs.id;
            if (typeof id === 'string') {
                mentions.push(id);
            }
        }
        if (node.content) {
            node.content.forEach(traverse);
        }
    }

    traverse(content);
    return [...new Set(mentions)];
}

// ============================================
// Markdown Conversion
// ============================================

/**
 * Converts Tiptap JSON content to Markdown format.
 * Supports headings, lists, code blocks, images, tables, and mentions.
 *
 * @param content The Tiptap JSON content
 * @returns Markdown string representation
 */
export function tiptapToMarkdown(content: JSONContent): string {
    if (!content) return '';

    function processNode(node: JSONContent): string {
        const { type, content: children, attrs, marks } = node;
        let text = '';

        if (children) text = children.map(processNode).join('');
        if (node.text) text = node.text;

        if (marks) {
            marks.forEach((mark) => {
                switch (mark.type) {
                    case 'bold':
                        text = `**${text}**`;
                        break;
                    case 'italic':
                        text = `*${text}*`;
                        break;
                    case 'code':
                        text = `\`${text}\``;
                        break;
                    case 'strike':
                        text = `~~${text}~~`;
                        break;
                }
            });
        }

        switch (type) {
            case 'doc':
                return text;
            case 'paragraph':
                return text + '\n\n';
            case 'heading':
                const level = attrs?.level || 1;
                return '#'.repeat(level) + ' ' + text + '\n\n';
            case 'bulletList':
                return text + '\n';
            case 'orderedList':
                return text + '\n';
            case 'listItem':
                return `- ${text}`;
            case 'taskList':
                return text + '\n';
            case 'taskItem':
                const checked = attrs?.checked ? '[x]' : '[ ]';
                return `- ${checked} ${text}`;
            case 'codeBlock':
                const language = attrs?.language || '';
                return `\`\`\`${language}\n${text}\n\`\`\`\n\n`;
            case 'blockquote':
                return text.split('\n').map(line => '> ' + line).join('\n') + '\n\n';
            case 'hardBreak':
                return '\n';
            case 'image':
            case 'resizableImage':
                // Use src attribute (which contains the original URL for GitLab compatibility)
                const src = attrs?.src || attrs?.url || '';
                const alt = attrs?.alt || '';
                return `![${alt}](${src})\n\n`;
            case 'table':
                return processTable(node) + '\n\n';
            case 'mention':
                const mentionId = attrs?.id || '';
                return `@${mentionId}`;
            default:
                return text;
        }
    }

    function processTable(tableNode: JSONContent): string {
        if (!tableNode.content) return '';

        const rows: string[][] = [];
        tableNode.content.forEach((rowNode) => {
            if (rowNode.type === 'tableRow' && rowNode.content) {
                const cells: string[] = [];
                rowNode.content.forEach((cellNode) => {
                    const cellContent = cellNode.content
                        ? cellNode.content.map(processNode).join('').trim().replace(/\n/g, '<br>')
                        : '';
                    cells.push(cellContent);
                });
                rows.push(cells);
            }
        });

        if (rows.length === 0) return '';

        const columnCount = Math.max(...rows.map((r) => r.length));
        let markdown = '';
        markdown += '| ' + rows[0].join(' | ') + ' |\n';
        markdown += '| ' + new Array(columnCount).fill('---').join(' | ') + ' |\n';
        for (let i = 1; i < rows.length; i++) {
            markdown += '| ' + rows[i].join(' | ') + ' |\n';
        }
        return markdown;
    }

    return processNode(content).trim();
}
