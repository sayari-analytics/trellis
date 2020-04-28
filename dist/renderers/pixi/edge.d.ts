import * as PIXI from 'pixi.js';
import { PIXIRenderer as Renderer, NodeDatum, EdgeDatum } from '.';
export declare class Edge<N extends NodeDatum, E extends EdgeDatum> {
    edge: E | undefined;
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
    constructor(renderer: Renderer<N, E>, edgesLayer: PIXI.Container);
    set(edge: E): this;
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
