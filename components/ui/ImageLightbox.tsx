'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageLightboxProps {
    src: string;
    alt?: string;
    isOpen: boolean;
    onClose: () => void;
}

export function ImageLightbox({ src, alt, isOpen, onClose }: ImageLightboxProps) {
    const [scale, setScale] = React.useState(1);
    const [position, setPosition] = React.useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = React.useState(false);
    const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });

    // Reset state when lightbox closes
    React.useEffect(() => {
        if (!isOpen) {
            setScale(1);
            setPosition({ x: 0, y: 0 });
        }
    }, [isOpen]);

    // Don't render anything if not open - prevents empty src warning
    if (!isOpen) {
        return null;
    }

    const handleZoomIn = () => {
        setScale(prev => Math.min(prev + 0.5, 4));
    };

    const handleZoomOut = () => {
        setScale(prev => Math.max(prev - 0.5, 0.5));
    };

    const handleReset = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (scale > 1) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging && scale > 1) {
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.2 : 0.2;
        setScale(prev => Math.min(Math.max(prev + delta, 0.5), 4));
    };

    return (
        <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay
                    className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
                    onClick={onClose}
                />
                <DialogPrimitive.Content
                    className="fixed inset-0 z-50 flex items-center justify-center outline-none"
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {/* Controls */}
                    <div className="fixed top-4 right-4 z-[60] flex items-center gap-2">
                        <button
                            onClick={handleZoomOut}
                            className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                            title="Zoom out"
                        >
                            <ZoomOut className="h-5 w-5" />
                        </button>
                        <span className="text-white text-sm font-medium min-w-[60px] text-center">
                            {Math.round(scale * 100)}%
                        </span>
                        <button
                            onClick={handleZoomIn}
                            className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                            title="Zoom in"
                        >
                            <ZoomIn className="h-5 w-5" />
                        </button>
                        <button
                            onClick={handleReset}
                            className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                            title="Reset"
                        >
                            <RotateCcw className="h-5 w-5" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors ml-2"
                            title="Close"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Image container */}
                    <div
                        className={cn(
                            "relative max-w-[90vw] max-h-[85vh] overflow-hidden",
                            scale > 1 ? "cursor-grab" : "cursor-zoom-in",
                            isDragging && "cursor-grabbing"
                        )}
                        onMouseDown={handleMouseDown}
                        onWheel={handleWheel}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (scale === 1) {
                                handleZoomIn();
                            }
                        }}
                    >
                        <img
                            src={src}
                            alt={alt || 'Enlarged image'}
                            className="max-w-[90vw] max-h-[85vh] object-contain select-none transition-transform duration-200"
                            style={{
                                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                            }}
                            draggable={false}
                        />
                    </div>

                    {/* Alt text / caption */}
                    {alt && (
                        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-lg bg-black/50 text-white text-sm max-w-[80vw] truncate">
                            {alt}
                        </div>
                    )}

                    {/* Hidden title for accessibility */}
                    <DialogPrimitive.Title className="sr-only">
                        Image Preview
                    </DialogPrimitive.Title>
                    <DialogPrimitive.Description className="sr-only">
                        {alt || 'Enlarged preview of the selected image'}
                    </DialogPrimitive.Description>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
