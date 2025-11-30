import { JSONContent } from '@tiptap/react';

/**
 * Recursively extracts all image URLs from Tiptap JSON content.
 * Handles standard 'image' nodes and custom 'resizableImage' nodes.
 */
export function extractImageUrls(content: JSONContent | null): string[] {
    if (!content) return [];

    const urls: string[] = [];

    if (content.type === 'image' || content.type === 'resizableImage') {
        if (content.attrs?.src) {
            urls.push(content.attrs.src);
        }
    }

    if (content.content) {
        content.content.forEach(child => {
            urls.push(...extractImageUrls(child));
        });
    }

    return urls;
}
