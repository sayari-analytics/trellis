import * as PIXI from 'pixi.js';
import { PIXIRenderer as Renderer } from './';
import { Node, Edge } from '../../';
export declare class EdgeRenderer<N extends Node, E extends Edge> {
    edge: E;
    private renderer;
    private edgesLayer;
    private label?;
    private labelFamily;
    private labelColor;
    private labelSize;
    private width;
    private stroke;
    private strokeOpacity;
    private line;
    private arrowContainer;
    private arrow;
    private forwardArrow?;
    private reverseArrow?;
    private hoveredEdge;
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
    constructor(renderer: Renderer<N, E>, edge: E, edgesLayer: PIXI.Container);
    update(edge: E): this;
    /**
     * TODO - perf boost: render cheap version of things while still animating position or dragging
     */
    render(): void;
    delete(): void;
    private pointerEnter;
    private pointerLeave;
    private pointerDown;
    private pointerUp;
}
