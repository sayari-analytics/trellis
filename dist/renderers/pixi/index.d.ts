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
export declare type NodeDatum = Exclude<PositionedNode<EdgeDatum>, 'style'> & {
    style?: Partial<NodeStyle>;
};
export declare type EdgeDatum = Exclude<PositionedEdge, 'style'> & {
    style?: Partial<EdgeStyle>;
};
export declare type RendererOptions<N extends NodeDatum = NodeDatum, E extends EdgeDatum = EdgeDatum> = {
    width: number;
    height: number;
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
    onContainerPointerUp: (event: PointerEvent) => void;
    onContainerPointerLeave: (event: PointerEvent) => void;
};
export declare const RENDERER_OPTIONS: RendererOptions<NodeDatum, EdgeDatum>;
export declare class PIXIRenderer<N extends NodeDatum, E extends EdgeDatum> {
    hoveredNode?: Node<N, E>;
    clickedNode?: Node<N, E>;
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
    nodes: N[] | undefined;
    edges: E[] | undefined;
    nodesById: {
        [id: string]: Node<N, E>;
    };
    edgesById: {
        [id: string]: Edge<N, E>;
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
        nodes: N[];
        edges: E[];
        options?: Partial<RendererOptions<N, E>> | undefined;
    }) => this;
    private render;
    private debugRender;
}
export declare const Renderer: <N extends NodeDatum, E extends EdgeDatum>(options: {
    container: HTMLCanvasElement;
    debug?: {
        logPerformance?: boolean | undefined;
        stats?: Stats | undefined;
    } | undefined;
}) => {
    (graph: {
        nodes: N[];
        edges: E[];
        options?: Partial<RendererOptions<N, E>> | undefined;
    }): PIXIRenderer<N, E>;
    nodes(): N[] | undefined;
    edges(): E[] | undefined;
};
