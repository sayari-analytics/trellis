import { Node, Edge } from '../../';
export declare type Options = Partial<{
    x: number;
    y: number;
    radius: number;
    bfs: boolean;
}>;
export declare const Layout: <N extends Node<E, import("../../renderers/webgl").NodeStyle>, E extends Edge<import("../../renderers/webgl").EdgeStyle>>() => (root: string, graph: {
    nodes: N[];
    edges: E[];
    options?: Partial<{
        x: number;
        y: number;
        radius: number;
        bfs: boolean;
    }> | undefined;
}) => {
    nodes: {
        x: number;
        y: number;
        id: string;
        radius: number;
        label?: string | undefined;
        style?: import("../../renderers/webgl").NodeStyle | undefined;
        subgraph?: {
            nodes: Node<Edge<import("../../renderers/webgl").EdgeStyle>, import("../../renderers/webgl").NodeStyle>[];
            edges: Edge<import("../../renderers/webgl").EdgeStyle>[];
            options?: {} | undefined;
        } | undefined;
    }[];
    edges: Edge<import("../../renderers/webgl").EdgeStyle>[];
    options: Partial<{
        x: number;
        y: number;
        radius: number;
        bfs: boolean;
    }> | undefined;
};
