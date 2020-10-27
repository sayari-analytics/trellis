import { Node, Edge } from '../../';
export declare const Layout: () => <N extends Node<E, Partial<import("../../renderers/pixi").NodeStyle>>, E extends Edge<Partial<import("../../renderers/pixi").EdgeStyle>>>(nodes: N[]) => (N & {
    x: number;
    y: number;
})[];
