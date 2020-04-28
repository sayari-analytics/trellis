import { Node, Edge, PositionNode } from '../../types';
export declare type LayoutOptions = {
    nodeStrength: number;
    linkDistance: number;
    linkStrength?: number;
    centerStrength: number;
    nodePadding: number;
    tick: number;
};
export declare class ForceLayout<N extends Node<E>, E extends Edge> {
    worker: Worker;
    dispose: () => void;
    handler: (graph: {
        nodes: PositionNode<N, E>[];
        edges: E[];
    }) => void;
    nodes: N[];
    edges: E[];
    nodesById: {
        [id: string]: N;
    };
    edgesById: {
        [id: string]: E;
    };
    positionedNodes: PositionNode<N, E>[];
    positionedNodesById: {
        [id: string]: PositionNode<N, E>;
    };
    private options;
    private run;
    constructor(handler?: (graph: {
        nodes: PositionNode<N, E>[];
        edges: E[];
    }) => void);
    apply: ({ nodes, edges, options }: {
        nodes: N[];
        edges: E[];
        options?: Partial<LayoutOptions> | undefined;
    }) => this;
}
export declare const Layout: <N extends Node<E>, E extends Edge>(handler?: (graph: {
    nodes: PositionNode<N, E>[];
    edges: E[];
}) => void) => {
    (graph: {
        nodes: N[];
        edges: E[];
        options?: Partial<LayoutOptions> | undefined;
    }): ForceLayout<N, E>;
    nodes(): PositionNode<N, E>[];
    edges(): E[];
};
