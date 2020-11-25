import * as PIXI from 'pixi.js-legacy';
export declare type Options = Partial<{
    className: string;
    top: number;
    left: number;
    right: number;
    bottom: number;
    onSelection: (event: PIXI.InteractionEvent, x: number, y: number) => void;
    onContainerPointerDown: (event: PIXI.InteractionEvent, x: number, y: number) => void;
    onContainerDrag: (event: PIXI.InteractionEvent | undefined, x: number, y: number) => void;
    onContainerPointerUp: (event: PIXI.InteractionEvent, x: number, y: number) => void;
}>;
export declare const Control: ({ container }: {
    container: HTMLDivElement;
}) => (options: Options) => {
    onContainerPointerDown: (event: PIXI.InteractionEvent, x: number, y: number) => void;
    onContainerDrag: (event: PIXI.InteractionEvent | undefined, x: number, y: number) => void;
    onContainerPointerUp: (event: PIXI.InteractionEvent, x: number, y: number) => void;
};
