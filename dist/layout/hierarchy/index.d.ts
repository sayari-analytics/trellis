import { HierarchyPointNode } from 'd3-hierarchy';
import { Node, Edge } from '../../';
export declare type LayoutOptions = {
    x: number;
    y: number;
    nodeSize: [number, number];
    size: [number, number];
    separation: (a: HierarchyPointNode<Hierarchy>, b: HierarchyPointNode<Hierarchy>) => number;
    bfs: boolean;
};
declare type Hierarchy = {
    id: string;
    children: Hierarchy[];
};
export declare const Layout: () => <N extends Node<E, Partial<import("../../renderers/pixi").NodeStyle>>, E extends Edge<Partial<import("../../renderers/pixi").EdgeStyle>>>(root: string, graph: {
    nodes: N[];
    edges: E[];
    options?: Partial<LayoutOptions> | undefined;
}) => {
    nodes: N[];
    edges: E[];
    options?: Partial<LayoutOptions> | undefined;
};
export {};
