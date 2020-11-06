import { Node, Edge } from '../..';
export declare const subgraphRadius: <E extends Edge>(radius: number, nodes: Node<E>[]) => number;
export declare const Layout: () => <N extends Node<E>, E extends Edge>(previousNodes: N[], nextNodes: N[]) => N[];
