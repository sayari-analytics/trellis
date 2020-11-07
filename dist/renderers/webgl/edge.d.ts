import { InternalRenderer } from '.';
import { Node, Edge } from '../..';
export declare class EdgeRenderer<N extends Node, E extends Edge> {
    edge: E;
    private renderer;
    private label?;
    private labelFamily?;
    private labelColor?;
    private labelSize?;
    private labelWordWrap?;
    private width;
    private stroke;
    private strokeOpacity;
    private line;
    private arrowContainer;
    private arrow;
    private forwardArrow?;
    private reverseArrow?;
    private labelContainer;
    private labelSprite?;
    private x0;
    private y0;
    private x1;
    private y1;
    private curvePeak?;
    private curveControlPointA?;
    private curveControlPointB?;
    private curve;
    private doubleClickTimeout;
    private doubleClick;
    private labelLoader?;
    constructor(renderer: InternalRenderer<N, E>, edge: E);
    update(edge: E): this;
    /**
     * TODO - perf boost: render cheap version of things while still animating position or dragging
     */
    render(): void;
    delete(): void;
    private pointerEnter;
    private pointerLeave;
    private clearDoubleClick;
    private pointerDown;
    private pointerUp;
}
