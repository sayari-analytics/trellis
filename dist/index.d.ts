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
