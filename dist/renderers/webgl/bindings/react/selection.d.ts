import { ReactNode } from 'react';
import { ViewportDragDecelerateEvent, ViewportDragEvent } from '../..';
import { Annotation, Node } from '../../../..';
export declare type SelectionChangeEvent = {
    type: 'selectionChange';
    selection: Set<string>;
    altKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
};
export declare type Props<N extends Node> = {
    nodes: N[];
    color?: string;
    strokeColor?: string;
    strokeWidth?: number;
    shape?: 'rectangle' | 'circle';
    enableOnShift?: boolean;
    onSelection?: ((event: SelectionChangeEvent) => void) | undefined;
    onViewportDragStart?: ((event: ViewportDragEvent) => void) | undefined;
    onViewportDrag?: ((event: ViewportDragEvent | ViewportDragDecelerateEvent) => void) | undefined;
    onViewportDragEnd?: ((event: ViewportDragEvent | ViewportDragDecelerateEvent) => void) | undefined;
    children: (childProps: ChildProps) => ReactNode;
};
export declare type ChildProps = {
    select: boolean;
    annotation?: Annotation;
    cursor?: string;
    toggleSelect: () => void;
    onViewportDragStart: (event: ViewportDragEvent) => void;
    onViewportDrag: (event: ViewportDragEvent | ViewportDragDecelerateEvent) => void;
    onViewportDragEnd: (event: ViewportDragEvent | ViewportDragDecelerateEvent) => void;
};
export declare const Selection: <N extends Node>(props: Props<N>) => JSX.Element;
