/// <reference types="stats" />
import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { PositionedNode, Edge as PositionedEdge } from '../../types';
import { Node } from './node';
import { Edge } from './edge';
export declare type Event = PIXI.interaction.InteractionEvent;
export declare type NodeStyle = {
    strokeWidth: number;
    fill: string;
    stroke: string;
    fillOpacity: number;
    strokeOpacity: number;
    icon?: string;
};
export declare type EdgeStyle = {
    width: number;
    stroke: string;
    strokeOpacity: number;
};
export declare type RendererOptions = {
    width: number;
    height: number;
    onNodePointerEnter: (event: Event, node: PositionedNode, x: number, y: number) => void;
    onNodePointerDown: (event: Event, node: PositionedNode, x: number, y: number) => void;
    onNodeDrag: (event: Event, node: PositionedNode, x: number, y: number) => void;
    onNodePointerUp: (event: Event, node: PositionedNode, x: number, y: number) => void;
    onNodePointerLeave: (event: Event, node: PositionedNode, x: number, y: number) => void;
    onNodeDoubleClick: (event: Event, node: PositionedNode, x: number, y: number) => void;
    onEdgePointerEnter: (event: Event, edge: PositionedEdge, x: number, y: number) => void;
    onEdgePointerDown: (event: Event, edge: PositionedEdge, x: number, y: number) => void;
    onEdgePointerUp: (event: Event, edge: PositionedEdge, x: number, y: number) => void;
    onEdgePointerLeave: (event: Event, edge: PositionedEdge, x: number, y: number) => void;
    onContainerPointerEnter: (event: PointerEvent) => void;
    onContainerPointerDown: (event: PointerEvent) => void;
    onContainerPointerMove: (event: PointerEvent) => void;
    onContainerPointerUp: (event: PointerEvent) => void;
    onContainerPointerLeave: (event: PointerEvent) => void;
};
export declare const RENDERER_OPTIONS: RendererOptions;
export declare class PIXIRenderer<NodeProps extends object = any, EdgeProps extends object = any> {
    hoveredNode?: Node;
    clickedNode?: Node;
    dirty: boolean;
    renderTime: number;
    animationDuration: number;
    animationPercent: number;
    restartAnimation: boolean;
    edgesLayer: PIXI.Container;
    nodesLayer: PIXI.Container;
    labelsLayer: PIXI.Container;
    frontNodeLayer: PIXI.Container;
    frontLabelLayer: PIXI.Container;
    nodes: PositionedNode<NodeProps, Partial<NodeStyle>>[] | undefined;
    edges: PositionedEdge<EdgeProps, Partial<EdgeStyle>>[] | undefined;
    nodesById: {
        [id: string]: Node;
    };
    edgesById: {
        [id: string]: Edge;
    };
    forwardEdgeIndex: {
        [source: string]: {
            [target: string]: Set<string>;
        };
    };
    reverseEdgeIndex: {
        [target: string]: {
            [source: string]: Set<string>;
        };
    };
    onNodePointerEnter: (event: Event, node: PositionedNode<NodeProps, Partial<NodeStyle>>, x: number, y: number) => void;
    onNodePointerDown: (event: Event, node: PositionedNode<NodeProps, Partial<NodeStyle>>, x: number, y: number) => void;
    onNodeDrag: (event: Event, node: PositionedNode<NodeProps, Partial<NodeStyle>>, x: number, y: number) => void;
    onNodePointerUp: (event: Event, node: PositionedNode<NodeProps, Partial<NodeStyle>>, x: number, y: number) => void;
    onNodePointerLeave: (event: Event, node: PositionedNode<NodeProps, Partial<NodeStyle>>, x: number, y: number) => void;
    onNodeDoubleClick: (event: Event, node: PositionedNode<NodeProps, Partial<NodeStyle>>, x: number, y: number) => void;
    onEdgePointerEnter: (event: Event, edge: PositionedEdge<EdgeProps, Partial<EdgeStyle>>, x: number, y: number) => void;
    onEdgePointerDown: (event: Event, edge: PositionedEdge<EdgeProps, Partial<EdgeStyle>>, x: number, y: number) => void;
    onEdgePointerUp: (event: Event, edge: PositionedEdge<EdgeProps, Partial<EdgeStyle>>, x: number, y: number) => void;
    onEdgePointerLeave: (event: Event, edge: PositionedEdge<EdgeProps, Partial<EdgeStyle>>, x: number, y: number) => void;
    width: number;
    height: number;
    app: PIXI.Application;
    viewport: Viewport;
    debug: {
        logPerformance?: boolean;
        stats?: Stats;
    };
    constructor({ container, debug }: {
        container: HTMLCanvasElement;
        debug?: {
            logPerformance?: boolean;
            stats?: Stats;
        };
    });
    /**
     * TODO
     * - handle case where apply is called while previous apply is still being interpolated
     * current approach essentially cancels previous apply and runs a new one
     * maybe instead stage new one, overwriting stagged apply if new applys are called, and don't run until previous interpolation is done
     * - do a better job diffing against existing nodes/edges/options
     */
    apply: ({ nodes, edges, options: { width, height, onNodePointerEnter, onNodePointerDown, onNodeDrag, onNodePointerUp, onNodePointerLeave, onNodeDoubleClick, onEdgePointerEnter, onEdgePointerDown, onEdgePointerUp, onEdgePointerLeave, onContainerPointerEnter, onContainerPointerDown, onContainerPointerMove, onContainerPointerUp, onContainerPointerLeave, } }: {
        nodes: PositionedNode<NodeProps, Partial<NodeStyle>, unknown>[];
        edges: PositionedEdge<EdgeProps, Partial<EdgeStyle>>[];
        options?: Partial<RendererOptions> | undefined;
    }) => void;
    private render;
    private debugRender;
}
export declare const Renderer: <NodeProps extends object = {}, EdgeProps extends object = {}>(options: {
    container: HTMLCanvasElement;
    debug?: {
        logPerformance?: boolean | undefined;
        stats?: Stats | undefined;
    } | undefined;
}) => {
    (graph: {
        nodes: PositionedNode<NodeProps, Partial<NodeStyle>, unknown>[];
        edges: PositionedEdge<EdgeProps, Partial<EdgeStyle>>[];
        options?: Partial<RendererOptions> | undefined;
    }): void;
    nodes(): any[] | undefined;
    edges(): any[] | undefined;
};
