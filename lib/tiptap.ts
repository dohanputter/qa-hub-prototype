import type { JSONContent } from '@tiptap/core';

// ============================================
// Text & Image Extraction
// ============================================

/**
 * Recursively extracts plain text from a Tiptap JSON structure.
 *
 * @param content The Tiptap JSON content (JSONContent) or any object structure
 * @returns A plain text string representation
 */
export function extractTextFromTiptap(content: JSONContent | any): string {
    if (!content) return '';

    // If it's a string, just return it
    if (typeof content === 'string') return content;

    // If it's an array, map and join
    if (Array.isArray(content)) {
        return content.map(extractTextFromTiptap).join(' ');
    }

    // If it has text property (Leaf node)
    if (content.text) {
        return content.text;
    }

    // If it has content property (Node with children)
    if (content.content) {
        return extractTextFromTiptap(content.content);
    }

    // Fallback: empty string
    return '';
}

/**
 * Recursively extracts all image URLs from a Tiptap JSON structure.
 *
 * @param content The Tiptap JSON content
 * @returns An array of image URLs found in the content
 */
export function extractImageUrls(content: JSONContent | any): string[] {
    const urls: string[] = [];

    if (!content) return urls;

    // If it's an array, recurse
    if (Array.isArray(content)) {
        content.forEach(item => {
            urls.push(...extractImageUrls(item));
        });
        return urls;
    }

    // If it's an image node, get the src
    if (content.type === 'image' && content.attrs?.src) {
        urls.push(content.attrs.src);
    }

    // If it has content (children), recurse
    if (content.content) {
        urls.push(...extractImageUrls(content.content));
    }

    return urls;
}

/**
 * Extracts all @mentions from a Tiptap JSON structure.
 *
 * @param content The Tiptap JSON content
 * @returns An array of unique mention IDs (usernames)
 */
export function extractMentions(content: JSONContent): string[] {
    const mentions: string[] = [];

    function traverse(node: JSONContent) {
        if (node.type === 'mention' && node.attrs?.id) mentions.push(node.attrs.id);
        if (node.content) node.content.forEach(traverse);
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
