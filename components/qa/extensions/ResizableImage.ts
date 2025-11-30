import { Image as TiptapImage } from '@tiptap/extension-image';

// Extend Image with width/height attributes and add resize handles
export const ResizableImage = TiptapImage.extend({
    name: 'resizableImage',

    addOptions() {
        return {
            ...this.parent?.(),
            inline: false,
            allowBase64: true,
            HTMLAttributes: {},
        } as any;
    },

    addAttributes() {
        return {
            ...this.parent?.(),
            width: {
                default: null,
                parseHTML: element => element.getAttribute('width'),
                renderHTML: attributes => {
                    if (!attributes.width) {
                        return {};
                    }
                    return {
                        width: attributes.width,
                    };
                },
            },
            height: {
                default: null,
                parseHTML: element => element.getAttribute('height'),
                renderHTML: attributes => {
                    if (!attributes.height) {
                        return {};
                    }
                    return {
                        height: attributes.height,
                    };
                },
            },
            originalWidth: {
                default: null,
            },
            originalHeight: {
                default: null,
            },
        };
    },

    addCommands() {
        return {
            setImage: (options: { src: string; alt?: string; width?: number; height?: number }) => ({ commands }) => {
                return commands.insertContent({
                    type: this.name,
                    attrs: {
                        src: options.src,
                        alt: options.alt || '',
                        width: options.width || null,
                        height: options.height || null,
                    },
                });
            },
        };
    },

    addNodeView() {
        return ({ node, getPos, editor }) => {
            let currentNode = node;
            const dom = document.createElement('span');
            dom.className = 'resizable-image-wrapper';
            dom.style.cssText = 'display: inline-block; position: relative; max-width: 100%; vertical-align: middle;';

            const img = document.createElement('img');
            // Get the original URL (stored in src for GitLab compatibility)
            const originalUrl = node.attrs.src || node.attrs.url || '';
            // Check if it's a data URL (used in mock mode)
            const isDataUrl = originalUrl.startsWith('data:');
            // Use proxy ONLY for GitLab URLs to avoid CORS
            // Explicitly exclude placeholder URLs, data URLs, and other public image services
            const isPlaceholderUrl = originalUrl.includes('via.placeholder.com') ||
                originalUrl.includes('placeholder.com');
            const isGitLabUrl = !isPlaceholderUrl && !isDataUrl &&
                (originalUrl.includes('gitlab.com') || originalUrl.includes('/uploads/'));
            const displayUrl = isGitLabUrl
                ? `/api/images/proxy?url=${encodeURIComponent(originalUrl)}`
                : originalUrl;

            // Set up image element with proper sizing
            img.alt = node.attrs.alt || '';

            // Determine initial size - if no width/height set, use a reasonable default
            let imgWidth = node.attrs.width;
            let imgHeight = node.attrs.height;

            // If no dimensions set, wait for image to load and use natural size (capped at max)
            if (!imgWidth && !imgHeight) {
                img.onload = () => {
                    const naturalWidth = img.naturalWidth;
                    const naturalHeight = img.naturalHeight;
                    const maxWidth = 600; // Reasonable max width for editor

                    if (naturalWidth > maxWidth) {
                        const ratio = maxWidth / naturalWidth;
                        imgWidth = maxWidth;
                        imgHeight = Math.round(naturalHeight * ratio);
                    } else {
                        imgWidth = naturalWidth;
                        imgHeight = naturalHeight;
                    }

                    // Update the node with calculated dimensions
                    const pos = getPos();
                    if (typeof pos === 'number') {
                        editor.commands.updateAttributes('resizableImage', {
                            width: imgWidth,
                            height: imgHeight,
                            originalWidth: naturalWidth,
                            originalHeight: naturalHeight,
                        });
                    }
                };
            }

            img.style.cssText = `
                display: block;
                max-width: 100%;
                height: auto;
                image-rendering: auto;
                object-fit: contain;
                ${imgWidth ? `width: ${imgWidth}px;` : 'max-width: 600px;'}
                ${imgHeight ? `height: ${imgHeight}px;` : ''}
            `;
            img.draggable = false;

            // For data URLs and placeholder URLs, don't set crossOrigin (it can cause issues)
            // For other external URLs, allow anonymous
            if (!isPlaceholderUrl && !isDataUrl && displayUrl.startsWith('http')) {
                img.crossOrigin = 'anonymous';
            }

            // Handle image load errors and sizing
            let errorDiv: HTMLElement | null = null;
            let hasLoaded = false;

            img.onload = () => {
                hasLoaded = true;
                // Remove error message if image loads successfully
                if (errorDiv) {
                    errorDiv.remove();
                    errorDiv = null;
                }

                // Set initial dimensions if not already set
                if (!node.attrs.width && !node.attrs.height && img.naturalWidth) {
                    const naturalWidth = img.naturalWidth;
                    const naturalHeight = img.naturalHeight;
                    const maxWidth = 600; // Reasonable max width for editor

                    let finalWidth: number;
                    let finalHeight: number;

                    if (naturalWidth > maxWidth) {
                        const ratio = maxWidth / naturalWidth;
                        finalWidth = maxWidth;
                        finalHeight = Math.round(naturalHeight * ratio);
                    } else {
                        finalWidth = naturalWidth;
                        finalHeight = naturalHeight;
                    }

                    // Update image styles
                    img.style.width = `${finalWidth}px`;
                    img.style.height = `${finalHeight}px`;
                    img.style.maxWidth = '100%';

                    // Update node attributes
                    const pos = getPos();
                    if (typeof pos === 'number') {
                        editor.commands.updateAttributes('resizableImage', {
                            width: finalWidth,
                            height: finalHeight,
                            originalWidth: naturalWidth,
                            originalHeight: naturalHeight,
                        });
                    }
                }
            };

            img.onerror = (e) => {
                // Only show error if we haven't loaded successfully
                if (!hasLoaded && !errorDiv && originalUrl) {
                    // For placeholder URLs, try one more time with a fresh load
                    if (isPlaceholderUrl && displayUrl) {
                        // Create a new image element to force reload
                        const newImg = new Image();
                        newImg.onload = () => {
                            img.src = displayUrl;
                            hasLoaded = true;
                        };
                        newImg.onerror = () => {
                            // Show error after retry fails
                            errorDiv = document.createElement('div');
                            errorDiv.className = 'text-sm text-muted-foreground p-2 border border-destructive/20 rounded bg-destructive/5 my-2';
                            errorDiv.innerHTML = `
                                <div class="font-medium text-destructive mb-1">Failed to load image</div>
                                <div class="text-xs break-all text-muted-foreground">URL: ${originalUrl}</div>
                                <div class="text-xs mt-1 text-muted-foreground">Please check your internet connection or try again.</div>
                            `;
                            dom.appendChild(errorDiv);
                        };
                        newImg.src = displayUrl;
                        return;
                    }

                    // Show error for non-placeholder URLs
                    errorDiv = document.createElement('div');
                    errorDiv.className = 'text-sm text-muted-foreground p-2 border border-destructive/20 rounded bg-destructive/5 my-2';
                    errorDiv.innerHTML = `
                        <div class="font-medium text-destructive mb-1">Failed to load image</div>
                        <div class="text-xs break-all text-muted-foreground">URL: ${originalUrl}</div>
                        <div class="text-xs mt-1 text-muted-foreground">This might be due to CORS restrictions or an invalid URL.</div>
                    `;
                    dom.appendChild(errorDiv);
                }
            };

            // Set src after setting up handlers
            if (displayUrl) {
                img.src = displayUrl;
            }

            dom.appendChild(img);

            // Add resize handles when selected
            let resizeHandles: HTMLElement[] = [];
            let isResizing = false;
            let startSize = { width: 0, height: 0 };
            let startPos = { x: 0, y: 0 };
            let resizePosition = '';

            const createResizeHandle = (position: string, cursor: string) => {
                const handle = document.createElement('div');
                handle.className = `resize-handle resize-handle-${position}`;

                // Determine position styles
                let top = '';
                let bottom = '';
                let left = '';
                let right = '';
                let transform = '';

                if (position === 'se') {
                    bottom = '-6px';
                    right = '-6px';
                } else if (position === 'sw') {
                    bottom = '-6px';
                    left = '-6px';
                } else if (position === 'ne') {
                    top = '-6px';
                    right = '-6px';
                } else if (position === 'nw') {
                    top = '-6px';
                    left = '-6px';
                }

                handle.style.cssText = `
                    position: absolute;
                    width: 12px;
                    height: 12px;
                    background: hsl(var(--primary));
                    border: 2px solid hsl(var(--background));
                    border-radius: 50%;
                    cursor: ${cursor}-resize;
                    z-index: 10;
                    ${top} ${bottom} ${left} ${right}
                    transition: background-color 0.2s;
                `;

                handle.addEventListener('mouseenter', () => {
                    handle.style.backgroundColor = 'hsl(var(--primary) / 0.8)';
                });

                handle.addEventListener('mouseleave', () => {
                    handle.style.backgroundColor = 'hsl(var(--primary))';
                });

                handle.addEventListener('mousedown', (e) => {
                    if (editor.isEditable === false) return;
                    e.preventDefault();
                    e.stopPropagation();
                    isResizing = true;
                    resizePosition = position;
                    const rect = img.getBoundingClientRect();
                    startSize = {
                        width: currentNode.attrs.width || rect.width,
                        height: currentNode.attrs.height || rect.height
                    };
                    startPos = { x: e.clientX, y: e.clientY };
                    const aspectRatio = startSize.width / startSize.height;

                    const handleMouseMove = (moveEvent: MouseEvent) => {
                        if (!isResizing) return;

                        const deltaX = moveEvent.clientX - startPos.x;
                        const deltaY = moveEvent.clientY - startPos.y;

                        let newWidth = startSize.width;
                        let newHeight = startSize.height;

                        // Check if we're in a table
                        const isInTable = dom.closest('table') !== null;
                        const maxWidth = isInTable ? 400 : 1200; // Smaller max for table images
                        const maxHeight = isInTable ? 200 : 800;
                        const minSize = 50;

                        if (position === 'se' || position === 'e') {
                            newWidth = Math.max(minSize, Math.min(maxWidth, startSize.width + deltaX));
                            newHeight = Math.max(minSize, Math.min(maxHeight, newWidth / aspectRatio));
                        } else if (position === 'sw' || position === 'w') {
                            newWidth = Math.max(minSize, Math.min(maxWidth, startSize.width - deltaX));
                            newHeight = Math.max(minSize, Math.min(maxHeight, newWidth / aspectRatio));
                        } else if (position === 's') {
                            newHeight = Math.max(minSize, Math.min(maxHeight, startSize.height + deltaY));
                            newWidth = Math.max(minSize, Math.min(maxWidth, newHeight * aspectRatio));
                        } else if (position === 'n') {
                            newHeight = Math.max(minSize, Math.min(maxHeight, startSize.height - deltaY));
                            newWidth = Math.max(minSize, Math.min(maxWidth, newHeight * aspectRatio));
                        } else if (position === 'ne') {
                            newWidth = Math.max(minSize, Math.min(maxWidth, startSize.width + deltaX));
                            newHeight = Math.max(minSize, Math.min(maxHeight, newWidth / aspectRatio));
                        } else if (position === 'nw') {
                            newWidth = Math.max(minSize, Math.min(maxWidth, startSize.width - deltaX));
                            newHeight = Math.max(minSize, Math.min(maxHeight, newWidth / aspectRatio));
                        }

                        // Use editor commands to update attributes
                        const pos = getPos();
                        if (typeof pos === 'number') {
                            editor.commands.updateAttributes('resizableImage', {
                                width: Math.round(newWidth),
                                height: Math.round(newHeight),
                            });
                        }
                    };

                    const handleMouseUp = () => {
                        isResizing = false;
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                    };

                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                });

                return handle;
            };

            const updateResizeHandles = () => {
                // Remove existing handles
                resizeHandles.forEach(handle => handle.remove());
                resizeHandles = [];

                // Check if node is selected
                const { selection } = editor.state;
                const pos = getPos();

                if (typeof pos === 'number') {
                    // Check if selection includes this node
                    const nodeStart = pos;
                    const nodeEnd = pos + currentNode.nodeSize;
                    const isSelected = (selection.from <= nodeStart && selection.to >= nodeEnd) ||
                        (selection.from >= nodeStart && selection.from < nodeEnd) ||
                        (selection.to > nodeStart && selection.to <= nodeEnd);

                    if (isSelected) {
                        // Add resize handles
                        resizeHandles.push(createResizeHandle('se', 'se'));
                        resizeHandles.push(createResizeHandle('sw', 'sw'));
                        resizeHandles.push(createResizeHandle('ne', 'ne'));
                        resizeHandles.push(createResizeHandle('nw', 'nw'));
                        resizeHandles.forEach(handle => dom.appendChild(handle));

                        // Add visual selection indicator
                        dom.style.outline = '2px solid hsl(var(--primary))';
                        dom.style.outlineOffset = '2px';
                    } else {
                        dom.style.outline = '';
                        dom.style.outlineOffset = '';
                    }
                }
            };

            // Initial update
            updateResizeHandles();

            // Update handles on selection change
            editor.on('selectionUpdate', updateResizeHandles);
            editor.on('transaction', updateResizeHandles);

            // Also listen for clicks on the image to select it
            img.addEventListener('click', (e) => {
                e.stopPropagation();
                const pos = getPos();
                if (typeof pos === 'number' && editor.isEditable) {
                    editor.commands.setNodeSelection(pos);
                }
            });

            return {
                dom,
                update: (updatedNode) => {
                    if (updatedNode.type.name !== this.name) {
                        return false;
                    }
                    currentNode = updatedNode;
                    // Update image attributes
                    const newOriginalUrl = updatedNode.attrs.src || updatedNode.attrs.url || '';
                    // Use proxy ONLY for GitLab URLs (not placeholder URLs)
                    const isPlaceholderUrl = newOriginalUrl.includes('via.placeholder.com') ||
                        newOriginalUrl.includes('placeholder.com');
                    const isGitLabUrl = !isPlaceholderUrl &&
                        (newOriginalUrl.includes('gitlab.com') || newOriginalUrl.includes('/uploads/'));
                    const newDisplayUrl = isGitLabUrl
                        ? `/api/images/proxy?url=${encodeURIComponent(newOriginalUrl)}`
                        : newOriginalUrl;

                    if (img.src !== newDisplayUrl && newDisplayUrl) {
                        img.src = newDisplayUrl;
                    }
                    img.alt = updatedNode.attrs.alt || '';

                    // Update dimensions with proper constraints
                    const newWidth = updatedNode.attrs.width;
                    const newHeight = updatedNode.attrs.height;

                    if (newWidth) {
                        img.style.width = `${newWidth}px`;
                        img.style.maxWidth = '100%';
                    } else {
                        img.style.width = 'auto';
                        img.style.maxWidth = '600px';
                    }

                    if (newHeight) {
                        img.style.height = `${newHeight}px`;
                    } else {
                        img.style.height = 'auto';
                    }

                    // Update resize handles visibility
                    updateResizeHandles();

                    return true;
                },
                destroy: () => {
                    editor.off('selectionUpdate', updateResizeHandles);
                    editor.off('transaction', updateResizeHandles);
                },
            };
        };
    },
});

