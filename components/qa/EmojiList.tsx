'use client';

import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

export const EmojiList = forwardRef((props: any, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
        const item = props.items[index];
        if (item) {
            props.command({ name: item.name });
        }
    };

    const upHandler = () => {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
    };

    const downHandler = () => {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
    };

    const enterHandler = () => {
        selectItem(selectedIndex);
    };

    useEffect(() => setSelectedIndex(0), [props.items]);

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }: { event: KeyboardEvent }) => {
            if (event.key === 'ArrowUp') {
                upHandler();
                return true;
            }
            if (event.key === 'ArrowDown') {
                downHandler();
                return true;
            }
            if (event.key === 'Enter') {
                enterHandler();
                return true;
            }
            return false;
        },
    }));

    return (
        <div className="items bg-popover rounded-md shadow-lg border p-1 min-w-[150px] overflow-hidden">
            {props.items.length ? (
                props.items.map((item: any, index: number) => (
                    <button
                        className={`flex items-center gap-2 w-full text-left px-2 py-1.5 text-sm rounded-sm ${index === selectedIndex ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'
                            }`}
                        key={index}
                        onClick={() => selectItem(index)}
                    >
                        <span className="text-lg">{item.emoji}</span>
                        <span>:{item.name}:</span>
                    </button>
                ))
            ) : (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">No result</div>
            )}
        </div>
    );
});

EmojiList.displayName = 'EmojiList';
