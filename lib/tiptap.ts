import type { JSONContent } from '@tiptap/core';

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
