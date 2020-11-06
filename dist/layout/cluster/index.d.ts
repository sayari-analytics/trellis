import { Node, Edge } from '../../';
export declare const Layout: () => <N extends Node<E>, E extends Edge>(nodes: N[]) => (N & {
    x: number;
    y: number;
})[];
