/// <reference types="stats" />
import * as PIXI from 'pixi.js';
import { Node, Edge } from '../../';
import { NodeRenderer } from './node';
import { EdgeRenderer } from './edge';
import { ArrowRenderer } from './edgeArrow';
import { CircleRenderer } from './circle';
import { Drag } from './interaction/drag';
import { Decelerate } from './interaction/decelerate';
import { Zoom } from './interaction/zoom';
export declare type Event = PIXI.InteractionEvent;
export declare type TextIcon = {
    type: 'textIcon';
    family: string;
    text: string;
    color: string;
    size: number;
};
export declare type ImageIcon = {
    type: 'imageIcon';
    image: string;
    scale?: number;
};
export declare type NodeStyle = {
    color: string;
    stroke: Partial<{
        color: string;
        width: number;
    }>[];
    badge: {
        position: number;
        radius?: number;
        color?: string;
        stroke?: string;
        strokeWidth?: number;
        icon?: TextIcon | ImageIcon;
    }[];
    icon: TextIcon | ImageIcon;
    labelFamily: string;
    labelColor: string;
    labelSize: number;
};
export declare type EdgeStyle = {
    width: number;
    stroke: string;
    strokeOpacity: number;
    labelFamily: string;
    labelColor: string;
    labelSize: number;
    arrow: 'forward' | 'reverse' | 'both' | 'none';
};
export declare type RendererOptions<N extends Node = Node, E extends Edge = Edge> = {
    width: number;
    height: number;
    x: number;
    y: number;
    zoom: number;
    minZoom: number;
    maxZoom: number;
    nodesEqual: (previous: N[], current: N[]) => boolean;
    edgesEqual: (previous: E[], current: E[]) => boolean;
    onNodePointerEnter: (event: Event, node: N, x: number, y: number) => void;
    onNodePointerDown: (event: Event, node: N, x: number, y: number) => void;
    onNodeDrag: (event: Event, node: N, x: number, y: number) => void;
    onNodePointerUp: (event: Event, node: N, x: number, y: number) => void;
    onNodePointerLeave: (event: Event, node: N, x: number, y: number) => void;
    onNodeDoubleClick: (event: Event, node: N, x: number, y: number) => void;
    onEdgePointerEnter: (event: Event, edge: E, x: number, y: number) => void;
    onEdgePointerDown: (event: Event, edge: E, x: number, y: number) => void;
    onEdgePointerUp: (event: Event, edge: E, x: number, y: number) => void;
    onEdgePointerLeave: (event: Event, edge: E, x: number, y: number) => void;
    onContainerPointerEnter: (event: PointerEvent) => void;
    onContainerPointerDown: (event: PointerEvent) => void;
    onContainerPointerMove: (event: PointerEvent) => void;
    onContainerDrag: (event: Event | undefined, x: number, y: number) => void;
    onContainerPointerUp: (event: PointerEvent) => void;
    onContainerPointerLeave: (event: PointerEvent) => void;
    onWheel: (e: WheelEvent, x: number, y: number, scale: number) => void;
};
export declare const RENDERER_OPTIONS: RendererOptions<Node, Edge>;
export declare class PIXIRenderer<N extends Node, E extends Edge> {
    update: (graph: {
        nodes: N[];
        edges: E[];
        options?: Partial<RendererOptions<N, E>>;
    }) => void;
    hoveredNode?: NodeRenderer<N, E>;
    clickedNode?: NodeRenderer<N, E>;
    hoveredEdge?: EdgeRenderer<N, E>;
    clickedEdge?: EdgeRenderer<N, E>;
    cancelAnimationLoop: () => void;
    dirty: boolean;
    viewportDirty: boolean;
    previousTime: number;
    animationDuration: number;
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
    arrow: ArrowRenderer<N, E>;
    circle: CircleRenderer<N, E>;
    zoomInteraction: Zoom<N, E>;
    dragInteraction: Drag<N, E>;
    decelerateInteraction: Decelerate<N, E>;
    onContainerPointerEnter: (event: PointerEvent) => void;
    onContainerPointerDown: (event: PointerEvent) => void;
    onContainerDrag: (event: Event | undefined, x: number, y: number) => void;
    onContainerPointerMove: (event: PointerEvent) => void;
    onContainerPointerUp: (event: PointerEvent) => void;
    onContainerPointerLeave: (event: PointerEvent) => void;
    onNodePointerEnter: (event: Event, node: N, x: number, y: number) => void;
    onNodePointerDown: (event: Event, node: N, x: number, y: number) => void;
    onNodeDrag: (event: Event, node: N, x: number, y: number) => void;
    onNodePointerUp: (event: Event, node: N, x: number, y: number) => void;
    onNodePointerLeave: (event: Event, node: N, x: number, y: number) => void;
    onNodeDoubleClick: (event: Event, node: N, x: number, y: number) => void;
    onEdgePointerEnter: (event: Event, edge: E, x: number, y: number) => void;
    onEdgePointerDown: (event: Event, edge: E, x: number, y: number) => void;
    onEdgePointerUp: (event: Event, edge: E, x: number, y: number) => void;
    onEdgePointerLeave: (event: Event, edge: E, x: number, y: number) => void;
    onEdgeDoubleClick: (event: Event, edge: E, x: number, y: number) => void;
    onWheel: (e: WheelEvent, x: number, y: number, scale: number) => void;
    width: number;
    height: number;
    zoom: number;
    minZoom: number;
    maxZoom: number;
    x: number;
    y: number;
    app: PIXI.Application;
    root: PIXI.Container;
    debug?: {
        logPerformance?: boolean;
        stats?: Stats;
    };
    constructor({ container, debug }: {
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
}
export declare const Renderer: <N extends Node<Edge<Partial<EdgeStyle>>, Partial<NodeStyle>>, E extends Edge<Partial<EdgeStyle>>>(options: {
    container: HTMLDivElement;
    debug?: {
        logPerformance?: boolean;
        stats?: Stats;
    };
}) => {
    (graph: {
        nodes: N[];
        edges: E[];
        options?: Partial<RendererOptions<N, E>> | undefined;
    }): void;
    delete: () => void;
};
