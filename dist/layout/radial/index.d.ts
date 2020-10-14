import { Node, Edge } from '../../';
export declare type LayoutOptions = {
    x: number;
    y: number;
    radius: number;
    bfs: boolean;
};
export declare const Layout: () => <N extends Node<E, Partial<import("../../renderers/pixi").NodeStyle>>, E extends Edge<Partial<import("../../renderers/pixi").EdgeStyle>>>(root: string, graph: {
    nodes: N[];
    edges: E[];
    options?: Partial<LayoutOptions> | undefined;
}) => {
    nodes: (N & {
        x: number;
        y: number;
    })[];
    edges: E[];
    options: Partial<LayoutOptions> | undefined;
};
