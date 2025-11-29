import React, { useEffect, useRef, useState } from 'react';
import { BubbleMenuPlugin, BubbleMenuPluginProps } from '@tiptap/extension-bubble-menu';
import { useCurrentEditor } from '@tiptap/react';

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export type BubbleMenuProps = Omit<Optional<BubbleMenuPluginProps, 'pluginKey'>, 'element'> & {
    className?: string;
    children: React.ReactNode;
    tippyOptions?: any;
};

export const BubbleMenu = (props: BubbleMenuProps) => {
    const [element, setElement] = useState<HTMLDivElement | null>(null);
    const { editor: currentEditor } = useCurrentEditor();
    const editor = props.editor || currentEditor;

    useEffect(() => {
        if (!editor) {
            return;
        }

        if (!element) {
            return;
        }

        const {
            pluginKey = 'bubbleMenu',
            tippyOptions = {},
            updateDelay,
            shouldShow = null,
        } = props;

        const menu = BubbleMenuPlugin({
            pluginKey,
            editor,
            element,
            tippyOptions,
            updateDelay,
            shouldShow,
        } as any);

        editor.registerPlugin(menu);

        return () => {
            editor.unregisterPlugin(pluginKey);
        };
    }, [props.editor, element]);

    return (
        <div ref={setElement} className={props.className} style={{ visibility: 'hidden' }}>
            {props.children}
        </div>
    );
};
