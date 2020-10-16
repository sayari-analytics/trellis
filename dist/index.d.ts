import { NodeStyle, EdgeStyle } from './renderers/pixi';
export declare type Node<E extends Edge = Edge, Style = Partial<NodeStyle>> = {
    id: string;
    radius: number;
    x?: number | undefined;
    y?: number | undefined;
    label?: string | undefined;
    style?: Style;
    subGraph?: {
        nodes: Node<E>[];
        edges: E[];
        options?: {};
    } | undefined;
};
export declare type Edge<Style = Partial<EdgeStyle>> = {
    id: string;
    source: string;
    target: string;
    label?: string;
    style?: Style;
};