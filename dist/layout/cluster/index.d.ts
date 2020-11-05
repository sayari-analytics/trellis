import { Node, Edge } from '../../';
export declare const Layout: <N extends Node<E, import("../../renderers/webgl").NodeStyle>, E extends Edge<import("../../renderers/webgl").EdgeStyle>>() => (nodes: N[]) => (N & {
    x: number;
    y: number;
})[];
