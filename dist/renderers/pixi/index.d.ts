/// <reference types="stats" />
import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { PositionedNode, Edge as PositionedEdge } from '../../types';
import { Node } from './node';
import { Edge } from './edge';
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
    onNodePointerEnter: (event: PIXI.interaction.InteractionEvent, node: PositionedNode, x: number, y: number) => void;
    onNodePointerDown: (event: PIXI.interaction.InteractionEvent, node: PositionedNode, x: number, y: number) => void;
    onNodeDrag: (event: PIXI.interaction.InteractionEvent, node: PositionedNode, x: number, y: number) => void;
    onNodePointerUp: (event: PIXI.interaction.InteractionEvent, node: PositionedNode, x: number, y: number) => void;
    onNodePointerLeave: (event: PIXI.interaction.InteractionEvent, node: PositionedNode, x: number, y: number) => void;
    onNodeDoubleClick: (event: PIXI.interaction.InteractionEvent, node: PositionedNode, x: number, y: number) => void;
    onEdgePointerEnter: (event: PIXI.interaction.InteractionEvent, edge: PositionedEdge, x: number, y: number) => void;
    onEdgePointerDown: (event: PIXI.interaction.InteractionEvent, edge: PositionedEdge, x: number, y: number) => void;
    onEdgePointerUp: (event: PIXI.interaction.InteractionEvent, edge: PositionedEdge, x: number, y: number) => void;
    onEdgePointerLeave: (event: PIXI.interaction.InteractionEvent, edge: PositionedEdge, x: number, y: number) => void;
    onContainerPointerEnter: (event: PointerEvent) => void;
    onContainerPointerDown: (event: PointerEvent) => void;
    onContainerPointerMove: (event: PointerEvent) => void;
    onContainerPointerUp: (event: PointerEvent) => void;
    onContainerPointerLeave: (event: PointerEvent) => void;
};
export declare const RENDERER_OPTIONS: RendererOptions;
export declare const NODE_STYLES: NodeStyle;
export declare const EDGE_STYLES: EdgeStyle;
export declare const nodeStyleSelector: (nodeStyles: NodeStyle) => <T extends "strokeWidth" | "fill" | "stroke" | "fillOpacity" | "strokeOpacity" | "icon">(node: {
    id: string;
    radius: number;
    x: number;
    y: number;
    label?: string | undefined;
    style?: NodeStyle | undefined;
    subGraph?: {
        nodes: any[];
        edges: any[];
        options?: unknown;
    } | undefined;
}, attribute: T) => NodeStyle[T];
export declare const edgeStyleSelector: (edgeStyles: EdgeStyle) => <T extends "stroke" | "strokeOpacity" | "width">(edge: {
    id: string;
    label?: string | undefined;
    source: string;
    target: string;
    style?: EdgeStyle | undefined;
}, attribute: T) => EdgeStyle[T];
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
    nodes: PositionedNode<NodeProps, NodeStyle>[] | undefined;
    edges: PositionedEdge<EdgeProps, EdgeStyle>[] | undefined;
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
    onNodePointerEnter: (event: PIXI.interaction.InteractionEvent, node: PositionedNode<NodeProps, NodeStyle>, x: number, y: number) => void;
    onNodePointerDown: (event: PIXI.interaction.InteractionEvent, node: PositionedNode<NodeProps, NodeStyle>, x: number, y: number) => void;
    onNodeDrag: (event: PIXI.interaction.InteractionEvent, node: PositionedNode<NodeProps, NodeStyle>, x: number, y: number) => void;
    onNodePointerUp: (event: PIXI.interaction.InteractionEvent, node: PositionedNode<NodeProps, NodeStyle>, x: number, y: number) => void;
    onNodePointerLeave: (event: PIXI.interaction.InteractionEvent, node: PositionedNode<NodeProps, NodeStyle>, x: number, y: number) => void;
    onNodeDoubleClick: (event: PIXI.interaction.InteractionEvent, node: PositionedNode<NodeProps, NodeStyle>, x: number, y: number) => void;
    onEdgePointerEnter: (event: PIXI.interaction.InteractionEvent, edge: PositionedEdge<EdgeProps, EdgeStyle>, x: number, y: number) => void;
    onEdgePointerDown: (event: PIXI.interaction.InteractionEvent, edge: PositionedEdge<EdgeProps, EdgeStyle>, x: number, y: number) => void;
    onEdgePointerUp: (event: PIXI.interaction.InteractionEvent, edge: PositionedEdge<EdgeProps, EdgeStyle>, x: number, y: number) => void;
    onEdgePointerLeave: (event: PIXI.interaction.InteractionEvent, edge: PositionedEdge<EdgeProps, EdgeStyle>, x: number, y: number) => void;
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
        nodes: PositionedNode<NodeProps, NodeStyle, unknown>[];
        edges: PositionedEdge<EdgeProps, EdgeStyle>[];
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
        nodes: PositionedNode<NodeProps, NodeStyle, unknown>[];
        edges: PositionedEdge<EdgeProps, EdgeStyle>[];
        options?: Partial<RendererOptions> | undefined;
    }): void;
    nodes(): any[] | undefined;
    edges(): any[] | undefined;
};
