import { NodeStyle, EdgeStyle } from './renderers/webgl';
export declare type Node<E extends Edge = Edge, Style = NodeStyle> = {
    id: string;
    radius: number;
    x?: number | undefined;
    y?: number | undefined;
    label?: string | undefined;
    style?: Style;
    subgraph?: {
        nodes: Node<E>[];
        edges: E[];
        options?: {};
    } | undefined;
};
export declare type Edge<Style = EdgeStyle> = {
    id: string;
    source: string;
    target: string;
    label?: string;
    style?: Style;
};
