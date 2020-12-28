/// <reference types="stats" />
import * as PIXI from 'pixi.js-legacy';
import * as Graph from '../..';
import { NodeRenderer } from './node';
import { EdgeRenderer } from './edge';
import { Drag } from './interaction/drag';
import { Decelerate } from './interaction/decelerate';
import { Zoom } from './interaction/zoom';
import { ArrowSprite } from './sprites/arrowSprite';
import { CircleSprite } from './sprites/circleSprite';
import { ImageSprite } from './sprites/ImageSprite';
import { FontIconSprite } from './sprites/FontIconSprite';
import { CircleAnnotationRenderer } from './annotations/circle';
export declare type TextIcon = {
    type: 'textIcon';
    family: string;
    text: string;
    color: string;
    size: number;
};
export declare type ImageIcon = {
    type: 'imageIcon';
    url: string;
    scale?: number;
    offsetX?: number;
    offsetY?: number;
};
export declare type NodeStyle = {
    color?: string;
    stroke?: {
        color?: string;
        width?: number;
    }[];
    badge?: {
        position: number;
        radius?: number;
        color?: string;
        stroke?: string;
        strokeWidth?: number;
        icon?: TextIcon | ImageIcon;
    }[];
    icon?: TextIcon | ImageIcon;
    labelFamily?: string;
    labelColor?: string;
    labelSize?: number;
    labelWordWrap?: number;
    labelBackground?: string;
};
export declare type EdgeStyle = {
    width?: number;
    stroke?: string;
    strokeOpacity?: number;
    labelFamily?: string;
    labelColor?: string;
    labelSize?: number;
    labelWordWrap?: number;
    arrow?: 'forward' | 'reverse' | 'both' | 'none';
};
export declare type NodePointerEvent = {
    type: 'nodePointer';
    x: number;
    y: number;
    clientX: number;
    clientY: number;
    target: Graph.Node;
};
export declare type NodeDragEvent = {
    type: 'nodeDrag';
    x: number;
    y: number;
    clientX: number;
    clientY: number;
    nodeX: number;
    nodeY: number;
    target: Graph.Node;
};
export declare type EdgePointerEvent = {
    type: 'edgePointer';
    x: number;
    y: number;
    clientX: number;
    clientY: number;
    target: Graph.Edge;
};
export declare type ViewportPointerEvent = {
    type: 'viewportPointer';
    x: number;
    y: number;
    clientX: number;
    clientY: number;
    target: Graph.Viewport;
};
export declare type ViewportDragEvent = {
    type: 'viewportDrag';
    x: number;
    y: number;
    clientX: number;
    clientY: number;
    viewportX: number;
    viewportY: number;
    target: Graph.Viewport;
};
export declare type ViewportDragDecelerateEvent = {
    type: 'viewportDragDecelarate';
    viewportX: number;
    viewportY: number;
    target: Graph.Viewport;
};
export declare type ViewportWheelEvent = {
    type: 'viewportWheel';
    x: number;
    y: number;
    clientX: number;
    clientY: number;
    viewportX: number;
    viewportY: number;
    viewportZoom: number;
    target: Graph.Viewport;
};
export declare type Options<N extends Graph.Node = Graph.Node, E extends Graph.Edge = Graph.Edge> = {
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    animatePosition?: number | false;
    animateRadius?: number | false;
    animateViewport?: number | false;
    nodesEqual?: (previous: N[], current: N[]) => boolean;
    edgesEqual?: (previous: E[], current: E[]) => boolean;
    nodeIsEqual?: (previous: N, current: N) => boolean;
    edgeIsEqual?: (previous: E, current: E) => boolean;
    onNodePointerEnter?: (event: NodePointerEvent) => void;
    onNodePointerDown?: (event: NodePointerEvent) => void;
    onNodeDragStart?: (event: NodeDragEvent) => void;
    onNodeDrag?: (event: NodeDragEvent) => void;
    onNodeDragEnd?: (event: NodeDragEvent) => void;
    onNodePointerUp?: (event: NodePointerEvent) => void;
    onNodePointerLeave?: (event: NodePointerEvent) => void;
    onNodeDoubleClick?: (event: NodePointerEvent) => void;
    onEdgePointerEnter?: (event: EdgePointerEvent) => void;
    onEdgePointerDown?: (event: EdgePointerEvent) => void;
    onEdgePointerUp?: (event: EdgePointerEvent) => void;
    onEdgePointerLeave?: (event: EdgePointerEvent) => void;
    onEdgeDoubleClick?: (event: EdgePointerEvent) => void;
    onViewportPointerEnter?: (event: ViewportPointerEvent) => void;
    onViewportPointerDown?: (event: ViewportPointerEvent) => void;
    onViewportPointerMove?: (event: ViewportPointerEvent) => void;
    onViewportDrag?: (event: ViewportDragEvent | ViewportDragDecelerateEvent) => void;
    onViewportPointerUp?: (event: ViewportPointerEvent) => void;
    onViewportPointerLeave?: (event: ViewportPointerEvent) => void;
    onViewportWheel?: (event: ViewportWheelEvent) => void;
};
export declare const RENDERER_OPTIONS: {
    width: number;
    height: number;
    x: number;
    y: number;
    zoom: number;
    minZoom: number;
    maxZoom: number;
    animateViewport: number;
    animatePosition: number;
    animateRadius: number;
    nodesEqual: () => boolean;
    edgesEqual: () => boolean;
    nodeIsEqual: () => boolean;
    edgeIsEqual: () => boolean;
};
export declare class InternalRenderer<N extends Graph.Node, E extends Graph.Edge> {
    width: number;
    height: number;
    minZoom: number;
    maxZoom: number;
    x: number;
    expectedViewportXPosition?: number;
    y: number;
    expectedViewportYPosition?: number;
    zoom: number;
    expectedViewportZoom?: number;
    animatePosition: number | false;
    animateRadius: number | false;
    animateViewport: number | false;
    hoveredNode?: NodeRenderer<N, E>;
    clickedNode?: NodeRenderer<N, E>;
    hoveredEdge?: EdgeRenderer<N, E>;
    clickedEdge?: EdgeRenderer<N, E>;
    dragging: boolean;
    dirty: boolean;
    viewportDirty: boolean;
    annotationsBottomLayer: PIXI.Container;
    edgesLayer: PIXI.Container;
    nodesLayer: PIXI.Container;
    labelsLayer: PIXI.Container;
    frontNodeLayer: PIXI.Container;
    frontLabelLayer: PIXI.Container;
    edgesGraphic: PIXI.Graphics;
    nodes: N[];
    edges: E[];
    annotations?: Graph.Annotation[];
    nodesById: {
        [id: string]: NodeRenderer<N, E>;
    };
    edgesById: {
        [id: string]: EdgeRenderer<N, E>;
    };
    annotationsById: {
        [id: string]: CircleAnnotationRenderer<N, E>;
    };
    edgeIndex: {
        [edgeA: string]: {
            [edgeB: string]: Set<string>;
        };
    };
    arrow: ArrowSprite<N, E>;
    circle: CircleSprite<N, E>;
    image: ImageSprite;
    fontIcon: FontIconSprite;
    app: PIXI.Application;
    root: PIXI.Container;
    zoomInteraction: Zoom<N, E>;
    dragInteraction: Drag<N, E>;
    decelerateInteraction: Decelerate<N, E>;
    fontLoader: {
        load: (family: string) => (onfulfilled: (result: string) => void) => () => void;
        loading: () => boolean;
    };
    imageLoader: {
        load: (url: string) => (onfulfilled: (result: string) => void) => () => void;
        loading: () => boolean;
    };
    private clickedContainer;
    private previousTime;
    private debug?;
    private cancelAnimationLoop;
    private interpolateX?;
    private targetX;
    private interpolateY?;
    private targetY;
    private interpolateZoom?;
    private targetZoom;
    private firstRender;
    onNodePointerEnter?: (event: NodePointerEvent) => void;
    onNodePointerDown?: (event: NodePointerEvent) => void;
    onNodeDragStart?: (event: NodeDragEvent) => void;
    onNodeDrag?: (event: NodeDragEvent) => void;
    onNodeDragEnd?: (event: NodeDragEvent) => void;
    onNodePointerUp?: (event: NodePointerEvent) => void;
    onNodePointerLeave?: (event: NodePointerEvent) => void;
    onNodeDoubleClick?: (event: NodePointerEvent) => void;
    onEdgePointerEnter?: (event: EdgePointerEvent) => void;
    onEdgePointerDown?: (event: EdgePointerEvent) => void;
    onEdgePointerUp?: (event: EdgePointerEvent) => void;
    onEdgePointerLeave?: (event: EdgePointerEvent) => void;
    onEdgeDoubleClick?: (event: EdgePointerEvent) => void;
    onViewportPointerEnter?: (event: ViewportPointerEvent) => void;
    onViewportPointerDown?: (event: ViewportPointerEvent) => void;
    onViewportPointerMove?: (event: ViewportPointerEvent) => void;
    onViewportDrag?: (event: ViewportDragEvent | ViewportDragDecelerateEvent) => void;
    onViewportPointerUp?: (event: ViewportPointerEvent) => void;
    onViewportPointerLeave?: (event: ViewportPointerEvent) => void;
    onViewportWheel?: (event: ViewportWheelEvent) => void;
    update: (graph: {
        nodes: N[];
        edges: E[];
        options?: Options<N, E>;
        annotations?: Graph.Annotation[];
    }) => void;
    constructor(options: {
        container: HTMLDivElement;
        debug?: {
            logPerformance?: boolean;
            stats?: Stats;
        };
    });
    private _update;
    private render;
    private _measurePerformance?;
    private _debugUpdate;
    private debugRender;
    delete: () => void;
    base64: (resolution?: number, mimetype?: string) => Promise<string>;
}
export declare const Renderer: (options: {
    container: HTMLDivElement;
    debug?: {
        logPerformance?: boolean;
        stats?: Stats;
    };
}) => {
    <N extends Graph.Node, E extends Graph.Edge>(graph: {
        nodes: N[];
        edges: E[];
        options?: Options<N, E> | undefined;
        annotations?: Graph.CircleAnnotation[] | undefined;
    }): void;
    delete: () => void;
};
