import { NodeStyle, EdgeStyle } from './renderers/webgl';
export declare type Node<E extends Edge = Edge> = {
    id: string;
    radius: number;
    x?: number | undefined;
    y?: number | undefined;
    label?: string | undefined;
    style?: NodeStyle;
    subgraph?: {
        nodes: Node<E>[];
        edges: E[];
        options?: {};
    } | undefined;
};
export declare type Edge = {
    id: string;
    source: string;
    target: string;
    label?: string;
    style?: EdgeStyle;
};
export declare const getBounds: (nodes: Node[], padding?: number) => [left: number, top: number, right: number, bottom: number];
/**
 * TODO
 * - getSelectionBounds Node[] => Bounds
 * - getViewportBounds { x, y, zoom } => Bounds
 * - combineBounds/expandBounds/mergeBounds (Bounds, Bounds) => Bounds
 * - fitBounds Bounds => { x, y, zoom }
 */
export declare const zoomToBounds: ([left, top, right, bottom]: [left: number, top: number, right: number, bottom: number], width: number, height: number) => {
    x: number;
    y: number;
    zoom: number;
};
