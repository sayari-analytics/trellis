import { PositionedNode } from '../../types';
import { PIXIRenderer as Renderer, NodeStyle } from '.';
export declare class Node<NodeProps extends object = any> {
    node: PositionedNode<NodeProps, NodeStyle>;
    x: number;
    y: number;
    radius: number;
    strokeWidth: number;
    stroke: number;
    strokeOpacity: number;
    fill: number;
    fillOpacity: number;
    subGraphNodes: {
        [id: string]: Node;
    };
    parent?: Node;
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
    private static nodeStyleSelector;
    constructor(renderer: Renderer<NodeProps>, node: PositionedNode<NodeProps, NodeStyle>, x: number, y: number, parent?: Node);
    set(node: PositionedNode<NodeProps, NodeStyle>): this;
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
