import { HierarchyPointNode } from 'd3-hierarchy';
import { Node, Edge } from '../../';
export declare type Options = Partial<{
    x: number;
    y: number;
    nodeSize: [number, number];
    size: [number, number];
    separation: (a: HierarchyPointNode<Hierarchy>, b: HierarchyPointNode<Hierarchy>) => number;
    bfs: boolean;
}>;
declare type Hierarchy = {
    id: string;
    children: Hierarchy[];
};
export declare const Layout: <N extends Node<E, import("../../renderers/webgl").NodeStyle>, E extends Edge<import("../../renderers/webgl").EdgeStyle>>() => (root: string, graph: {
    nodes: N[];
    edges: E[];
    options?: Partial<{
        x: number;
        y: number;
        nodeSize: [number, number];
        size: [number, number];
        separation: (a: HierarchyPointNode<Hierarchy>, b: HierarchyPointNode<Hierarchy>) => number;
        bfs: boolean;
    }> | undefined;
}) => {
    nodes: N[];
    edges: E[];
    options?: Partial<{
        x: number;
        y: number;
        nodeSize: [number, number];
        size: [number, number];
        separation: (a: HierarchyPointNode<Hierarchy>, b: HierarchyPointNode<Hierarchy>) => number;
        bfs: boolean;
    }> | undefined;
};
export {};
