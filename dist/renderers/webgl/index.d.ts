/// <reference types="stats" />
import * as PIXI from 'pixi.js';
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
export declare type Options<N extends Graph.Node = Graph.Node, E extends Graph.Edge = Graph.Edge> = {
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    animateGraph?: boolean;
    animateViewport?: boolean;
    nodesEqual?: (previous: N[], current: N[]) => boolean;
    edgesEqual?: (previous: E[], current: E[]) => boolean;
    onNodePointerEnter?: (event: PIXI.InteractionEvent, node: N, x: number, y: number) => void;
    onNodePointerDown?: (event: PIXI.InteractionEvent, node: N, x: number, y: number) => void;
    onNodeDrag?: (event: PIXI.InteractionEvent, node: N, x: number, y: number) => void;
    onNodeDragEnd?: (event: PIXI.InteractionEvent, node: N, x: number, y: number) => void;
    onNodeDragStart?: (event: PIXI.InteractionEvent, node: N, x: number, y: number) => void;
    onNodePointerUp?: (event: PIXI.InteractionEvent, node: N, x: number, y: number) => void;
    onNodePointerLeave?: (event: PIXI.InteractionEvent, node: N, x: number, y: number) => void;
    onNodeDoubleClick?: (event: PIXI.InteractionEvent, node: N, x: number, y: number) => void;
    onEdgePointerEnter?: (event: PIXI.InteractionEvent, edge: E, x: number, y: number) => void;
    onEdgePointerDown?: (event: PIXI.InteractionEvent, edge: E, x: number, y: number) => void;
    onEdgePointerUp?: (event: PIXI.InteractionEvent, edge: E, x: number, y: number) => void;
    onEdgePointerLeave?: (event: PIXI.InteractionEvent, edge: E, x: number, y: number) => void;
    onContainerPointerEnter?: (event: PIXI.InteractionEvent, x: number, y: number) => void;
    onContainerPointerDown?: (event: PIXI.InteractionEvent, x: number, y: number) => void;
    onContainerPointerMove?: (event: PIXI.InteractionEvent, x: number, y: number) => void;
    onContainerDrag?: (event: PIXI.InteractionEvent | undefined, x: number, y: number) => void;
    onContainerPointerUp?: (event: PIXI.InteractionEvent, x: number, y: number) => void;
    onContainerPointerLeave?: (event: PIXI.InteractionEvent, x: number, y: number) => void;
    onWheel?: (e: WheelEvent, x: number, y: number, scale: number) => void;
};
export declare const RENDERER_OPTIONS: {
    width: number;
    height: number;
    x: number;
    y: number;
    zoom: number;
    minZoom: number;
    maxZoom: number;
    animateGraph: boolean;
    animateViewport: boolean;
    nodesEqual: () => boolean;
    edgesEqual: () => boolean;
};
export declare class InternalRenderer<N extends Graph.Node, E extends Graph.Edge> {
    width: number;
    height: number;
    minZoom: number;
    maxZoom: number;
    zoom: number;
    targetZoom: number;
    wheelZoom?: number;
    interpolateZoom?: () => {
        value: number;
        done: boolean;
    };
    x: number;
    targetX: number;
    dragX?: number;
    interpolateX?: () => {
        value: number;
        done: boolean;
    };
    y: number;
    targetY: number;
    dragY?: number;
    interpolateY?: () => {
        value: number;
        done: boolean;
    };
    animateGraph: boolean;
    animateViewport: boolean;
    hoveredNode?: NodeRenderer<N, E>;
    clickedNode?: NodeRenderer<N, E>;
    hoveredEdge?: EdgeRenderer<N, E>;
    clickedEdge?: EdgeRenderer<N, E>;
    dragging: boolean;
    dirty: boolean;
    viewportDirty: boolean;
    animationPercent: number;
    edgesLayer: PIXI.Container;
    nodesLayer: PIXI.Container;
    labelsLayer: PIXI.Container;
    frontNodeLayer: PIXI.Container;
    frontLabelLayer: PIXI.Container;
    edgesGraphic: PIXI.Graphics;
    nodes: N[];
    edges: E[];
    nodesById: {
        [id: string]: NodeRenderer<N, E>;
    };
    edgesById: {
        [id: string]: EdgeRenderer<N, E>;
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
    private clickedContainer;
    private previousTime;
    private animationDuration;
    private debug?;
    private cancelAnimationLoop;
    onContainerPointerEnter?: (event: PIXI.InteractionEvent, x: number, y: number) => void;
    onContainerPointerDown?: (event: PIXI.InteractionEvent, x: number, y: number) => void;
    onContainerDrag?: (event: PIXI.InteractionEvent | undefined, x: number, y: number) => void;
    onContainerPointerMove?: (event: PIXI.InteractionEvent, x: number, y: number) => void;
    onContainerPointerUp?: (event: PIXI.InteractionEvent, x: number, y: number) => void;
    onContainerPointerLeave?: (event: PIXI.InteractionEvent, x: number, y: number) => void;
    onWheel?: (e: WheelEvent, x: number, y: number, scale: number) => void;
    onNodePointerEnter?: (event: PIXI.InteractionEvent, node: N, x: number, y: number) => void;
    onNodePointerDown?: (event: PIXI.InteractionEvent, node: N, x: number, y: number) => void;
    onNodeDrag?: (event: PIXI.InteractionEvent, node: N, x: number, y: number) => void;
    onNodeDragEnd?: (event: PIXI.InteractionEvent, node: N, x: number, y: number) => void;
    onNodeDragStart?: (event: PIXI.InteractionEvent, node: N, x: number, y: number) => void;
    onNodePointerUp?: (event: PIXI.InteractionEvent, node: N, x: number, y: number) => void;
    onNodePointerLeave?: (event: PIXI.InteractionEvent, node: N, x: number, y: number) => void;
    onNodeDoubleClick?: (event: PIXI.InteractionEvent, node: N, x: number, y: number) => void;
    onEdgePointerEnter?: (event: PIXI.InteractionEvent, edge: E, x: number, y: number) => void;
    onEdgePointerDown?: (event: PIXI.InteractionEvent, edge: E, x: number, y: number) => void;
    onEdgePointerUp?: (event: PIXI.InteractionEvent, edge: E, x: number, y: number) => void;
    onEdgePointerLeave?: (event: PIXI.InteractionEvent, edge: E, x: number, y: number) => void;
    onEdgeDoubleClick?: (event: PIXI.InteractionEvent, edge: E, x: number, y: number) => void;
    dataUrl?: (dataUrl: string) => void;
    dataUrlScale: number;
    update: (graph: {
        nodes: N[];
        edges: E[];
        options?: Options<N, E>;
    }) => void;
    constructor(options: {
        container: HTMLDivElement;
        debug?: {
            logPerformance?: boolean;
            stats?: Stats;
        };
    });
    private _update;
    private _debugUpdate;
    private render;
    private _debugFirstRender;
    private debugRender;
    delete: () => void;
    base64: (dataUrlScale?: number | undefined) => Promise<string>;
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
    }): void;
    delete: () => void;
};
