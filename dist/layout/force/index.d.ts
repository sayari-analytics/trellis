import { Node, PositionedNode, Edge } from '../../types';
export declare type LayoutOptions = {
    nodeStrength: number;
    linkDistance: number;
    linkStrength?: number;
    centerStrength: number;
    nodePadding: number;
    tick: number;
};
declare class ForceLayout {
    worker: Worker;
    dispose: () => void;
    handler: (graph: {
        nodes: PositionedNode[];
        edges: Edge[];
    }) => void;
    nodes: Node[];
    edges: Edge[];
    nodesById: {
        [id: string]: Node;
    };
    edgesById: {
        [id: string]: Edge;
    };
    positionedNodes: PositionedNode[];
    positionedNodesById: {
        [id: string]: PositionedNode;
    };
    private options;
    private run;
    constructor(handler?: (graph: {
        nodes: PositionedNode[];
        edges: Edge[];
    }) => void);
    apply: ({ nodes, edges, options }: {
        nodes: any[];
        edges: any[];
        options?: Partial<LayoutOptions> | undefined;
    }) => this;
}
export declare const Layout: (handler?: (graph: {
    nodes: any[];
    edges: any[];
}) => void) => {
    (graph: {
        nodes: any[];
        edges: any[];
        options?: Partial<LayoutOptions> | undefined;
    }): ForceLayout;
    nodes(): any[];
    edges(): any[];
};
export {};
