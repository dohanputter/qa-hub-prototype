import type { JSONContent } from '@tiptap/core';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function mapLabelToStatus(
    labels: string[],
    mapping: { pending: string; passed: string; failed: string }
): 'pending' | 'passed' | 'failed' | null {
    if (labels.includes(mapping.passed)) return 'passed';
    if (labels.includes(mapping.failed)) return 'failed';
    if (labels.includes(mapping.pending)) return 'pending';
    return null;
}

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
                const src = attrs?.src || '';
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
                        ? cellNode.content.map(processNode).join('').trim()
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

export function extractMentions(content: JSONContent): string[] {
    const mentions: string[] = [];

    function traverse(node: JSONContent) {
        if (node.type === 'mention' && node.attrs?.id) mentions.push(node.attrs.id);
        if (node.content) node.content.forEach(traverse);
    }

    traverse(content);
    return [...new Set(mentions)];
}
