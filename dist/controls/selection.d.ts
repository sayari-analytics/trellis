import { ViewportDragDecelerateEvent, ViewportDragEvent, ViewportPointerEvent } from '../renderers/webgl';
export declare type Options = Partial<{
    className: string;
    top: number;
    left: number;
    right: number;
    bottom: number;
    onSelection: (event: ViewportDragEvent) => void;
    onViewportPointerDown: (event: ViewportPointerEvent) => void;
    onViewportDrag: (event: ViewportDragEvent | ViewportDragDecelerateEvent) => void;
    onViewportPointerUp: (event: ViewportPointerEvent) => void;
}>;
export declare const Control: ({ container }: {
    container: HTMLDivElement;
}) => (options: Options) => {
    onViewportPointerDown: (event: ViewportPointerEvent) => void;
    onViewportDrag: (event: ViewportDragEvent | ViewportDragDecelerateEvent) => void;
    onViewportPointerUp: (event: ViewportPointerEvent) => void;
};
