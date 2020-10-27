import { Node, Edge } from '../..';
export declare const subgraphRadius: <E extends Edge<Partial<import("../../renderers/pixi").EdgeStyle>>>(node: Node<E, Partial<import("../../renderers/pixi").NodeStyle>>, nodes: Node<E, Partial<import("../../renderers/pixi").NodeStyle>>[]) => number;
export declare const Layout: () => <N extends Node<E, Partial<import("../../renderers/pixi").NodeStyle>>, E extends Edge<Partial<import("../../renderers/pixi").EdgeStyle>>>(previousNodes: N[], nextNodes: N[]) => Node<E, Partial<import("../../renderers/pixi").NodeStyle>>[];
