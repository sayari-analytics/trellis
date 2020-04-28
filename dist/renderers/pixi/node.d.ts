import { PIXIRenderer as Renderer, NodeDatum, EdgeDatum } from '.';
export declare class Node<N extends NodeDatum, E extends EdgeDatum> {
    node: N;
    x: number;
    y: number;
    radius: number;
    strokeWidth: number;
    stroke: number;
    strokeOpacity: number;
    fill: number;
    fillOpacity: number;
    subGraphNodes: {
        [id: string]: Node<N, E>;
    };
    parent?: Node<N, E>;
    private renderer;
    private depth;
    private startX;
    private startY;
    private startRadius;
    private endX;
    private endY;
    private endRadius;
    private interpolateX;
    private interpolateY;
    private interpolateRadius;
    private label?;
    private icon?;
    private nodeContainer;
    private labelContainer;
    private nodeGfx;
    private labelSprite?;
    private doubleClickTimeout;
    private doubleClick;
    private nodeMoveXOffset;
    private nodeMoveYOffset;
    constructor(renderer: Renderer<N, E>, node: N, x: number, y: number, parent?: Node<N, E>);
    set(node: N): this;
    /**
     * TODO - perf boost: render cheap version of things while still animating position
     */
    render(): this;
    delete(): void;
    private nodePointerEnter;
    private nodePointerLeave;
    private nodePointerDown;
    private nodePointerUp;
    private nodeMove;
    private clearDoubleClick;
}
