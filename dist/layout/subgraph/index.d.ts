import { Node, Edge } from '../..';
export declare const subgraphRadius: <E extends Edge<import("../../renderers/webgl").EdgeStyle>>(radius: number, nodes: Node<E, import("../../renderers/webgl").NodeStyle>[]) => number;
export declare const Layout: <N extends Node<E, import("../../renderers/webgl").NodeStyle>, E extends Edge<import("../../renderers/webgl").EdgeStyle>>() => (previousNodes: N[], nextNodes: N[]) => N[];
