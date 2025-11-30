import { useState, useEffect } from 'react';
import { marked } from 'marked';

export function useDescriptionProcessor(
    descriptionHtml: string | null | undefined,
    description: string | null | undefined,
    webUrl: string | null | undefined
) {
    const [processedDescription, setProcessedDescription] = useState<string>('');

    useEffect(() => {
        // Only process on client side where DOMParser is available
        if (typeof window === 'undefined') {
            setProcessedDescription(descriptionHtml || description || '');
            return;
        }

        let rawContent = descriptionHtml || description || '';

        // If we don't have HTML but have description (e.g. mock mode), convert markdown to HTML
        if (!descriptionHtml && description) {
            try {
                rawContent = marked.parse(description) as string;
            } catch (e) {
                console.error('Failed to parse markdown:', e);
                rawContent = description;
            }
        }

        if (!rawContent) {
            setProcessedDescription('');
            return;
        }

        // Get GitLab base URL from the issue's web_url or default
        const gitlabBaseUrl = webUrl
            ? new URL(webUrl).origin
            : 'https://gitlab.com';

        // Process markdown images first (both in description and description_html)
        // Convert markdown image syntax to HTML img tags
        rawContent = rawContent.replace(
            /!\[([^\]]*)\]\(([^)]+)\)/g,
            (match: string, alt: string, url: string) => {
                let absoluteUrl = url.trim();

                // Convert relative URLs to absolute
                if (absoluteUrl.startsWith('/')) {
                    absoluteUrl = `${gitlabBaseUrl}${absoluteUrl}`;
                } else if (!absoluteUrl.startsWith('http')) {
                    absoluteUrl = `${gitlabBaseUrl}/${absoluteUrl}`;
                }

                // Use proxy for GitLab images
                const isGitLabImage = absoluteUrl.includes('gitlab.com') ||
                    absoluteUrl.includes('gitlab') ||
                    absoluteUrl.includes('/uploads/');
                const finalUrl = isGitLabImage
                    ? `/api/images/proxy?url=${encodeURIComponent(absoluteUrl)}`
                    : absoluteUrl;

                return `<img src="${finalUrl}" alt="${alt || 'Issue image'}" style="max-width: 100%; height: auto; display: block; margin: 1rem 0;" loading="lazy" />`;
            }
        );

        // Create a temporary DOM element to parse and modify the HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawContent, 'text/html');

        // Fix all image sources - handle both img tags and data-src attributes
        const images = doc.querySelectorAll('img, [data-src], [data-canonical-src]');
        images.forEach((element) => {
            const img = element as HTMLImageElement;
            // Check multiple possible src attributes (GitLab uses various formats)
            let src = img.getAttribute('src') ||
                img.getAttribute('data-src') ||
                img.getAttribute('data-canonical-src') ||
                img.getAttribute('data-original');

            if (!src) {
                // Also check for background-image in style attribute
                const style = img.getAttribute('style') || '';
                const bgMatch = style.match(/url\(['"]?([^'"]+)['"]?\)/);
                if (bgMatch) {
                    src = bgMatch[1];
                }
            }

            if (src) {
                let absoluteUrl = src;

                // Skip if already processed (has proxy URL) or is a data URL
                if (src.startsWith('/api/images/proxy') || src.startsWith('data:')) {
                    return;
                }

                // Convert relative URLs to absolute
                if (src.startsWith('/')) {
                    absoluteUrl = `${gitlabBaseUrl}${src}`;
                } else if (!src.startsWith('http')) {
                    absoluteUrl = `${gitlabBaseUrl}/${src}`;
                }

                // Use proxy for GitLab images to avoid CORS issues
                const isGitLabImage = absoluteUrl.includes('gitlab.com') ||
                    absoluteUrl.includes('gitlab') ||
                    absoluteUrl.includes('/uploads/') ||
                    absoluteUrl.includes('/-/project/');
                const finalUrl = isGitLabImage
                    ? `/api/images/proxy?url=${encodeURIComponent(absoluteUrl)}`
                    : absoluteUrl;

                // Set src attribute
                if (img.tagName === 'IMG') {
                    img.setAttribute('src', finalUrl);
                    // Remove other src attributes to avoid conflicts
                    img.removeAttribute('data-src');
                    img.removeAttribute('data-canonical-src');
                } else {
                    // For other elements with data-src, convert to img tag
                    const newImg = document.createElement('img');
                    newImg.setAttribute('src', finalUrl);
                    newImg.setAttribute('loading', 'lazy');
                    newImg.setAttribute('alt', img.getAttribute('alt') || 'Issue image');
                    newImg.style.cssText = 'max-width: 100%; height: auto; display: block; margin: 1rem 0;';
                    img.parentNode?.replaceChild(newImg, img);
                    return;
                }

                // Add loading attribute for better performance
                img.setAttribute('loading', 'lazy');

                // Add alt text if missing
                if (!img.getAttribute('alt')) {
                    img.setAttribute('alt', 'Issue image');
                }

                // Ensure images are styled properly
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                img.style.display = 'block';
                img.style.margin = '1rem 0';

                // Add error handler to log failed images
                img.onerror = () => {
                    console.warn('Failed to load image:', finalUrl);
                };
            }
        });

        // Fix all anchor links that might be relative
        const links = doc.querySelectorAll('a');
        links.forEach((link) => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('/') && !href.startsWith('//')) {
                link.setAttribute('href', `${gitlabBaseUrl}${href}`);
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
            }
        });

        setProcessedDescription(doc.body.innerHTML);
    }, [descriptionHtml, description, webUrl]);

    return processedDescription;
}
