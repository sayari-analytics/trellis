import { Node } from '../..';
export declare const subgraphRadius: (radius: number, nodes: Node[]) => number;
export declare const Layout: () => <N extends Node>(previousNodes: N[], nextNodes: N[]) => N[];
