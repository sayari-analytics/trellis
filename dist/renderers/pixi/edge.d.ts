import * as PIXI from 'pixi.js';
import { Edge as PositionedEdge } from '../../types';
import { PIXIRenderer as Renderer, EdgeStyle } from '.';
export declare class Edge<Props extends object = any> {
    edge: PositionedEdge<Props, EdgeStyle> | undefined;
    private renderer;
    private label?;
    private width;
    private stroke;
    private strokeOpacity;
    private edgeGfx;
    private arrow;
    private hoveredEdge;
    private labelContainer;
    private x0;
    private y0;
    private x1;
    private y1;
    private curvePeak?;
    private curveControlPointA?;
    private curveControlPointB?;
    private curve;
    constructor(renderer: Renderer, edgesLayer: PIXI.Container);
    set(edge: PositionedEdge<Props, EdgeStyle>): this;
    /**
     * TODO - perf boost: render cheap version of things while still animating position
     */
    render(): void;
    delete(): void;
    private pointerEnter;
    private pointerLeave;
    private pointerDown;
    private pointerUp;
}
