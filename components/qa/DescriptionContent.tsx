'use client';

import * as React from 'react';
import { ImageLightbox } from '@/components/ui/ImageLightbox';
import { cn } from '@/lib/utils';

interface DescriptionContentProps {
    html: string;
    className?: string;
}

export function DescriptionContent({ html, className }: DescriptionContentProps) {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [lightboxImage, setLightboxImage] = React.useState<{ src: string; alt: string } | null>(null);

    React.useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const images = container.querySelectorAll('img');

        const handleImageClick = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            const img = e.currentTarget as HTMLImageElement;
            setLightboxImage({
                src: img.src,
                alt: img.alt || ''
            });
        };

        images.forEach((img) => {
            // Add cursor pointer and hover effect
            img.style.cursor = 'pointer';
            img.classList.add('lightbox-image');
            // Add title for accessibility and user guidance
            img.setAttribute('title', 'Click to enlarge');
            img.addEventListener('click', handleImageClick);
        });

        // Cleanup
        return () => {
            images.forEach((img) => {
                img.removeEventListener('click', handleImageClick);
            });
        };
    }, [html]);

    return (
        <>
            <div
                ref={containerRef}
                className={cn(
                    "prose prose-sm max-w-none text-foreground/90 dark:prose-invert gitlab-content min-w-full",
                    "[&_.lightbox-image]:transition-all [&_.lightbox-image]:duration-200",
                    "[&_.lightbox-image]:hover:opacity-80 [&_.lightbox-image]:hover:ring-2 [&_.lightbox-image]:hover:ring-primary/50 [&_.lightbox-image]:rounded-sm",
                    className
                )}
                dangerouslySetInnerHTML={{ __html: html }}
            />

            <ImageLightbox
                src={lightboxImage?.src || ''}
                alt={lightboxImage?.alt}
                isOpen={!!lightboxImage}
                onClose={() => setLightboxImage(null)}
            />
        </>
    );
}
