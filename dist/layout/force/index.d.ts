import { Node, PositionedNode, Edge } from '../../types';
export declare type LayoutOptions = {
    nodeStrength: number;
    linkDistance: number;
    linkStrength?: number;
    centerStrength: number;
    nodePadding: number;
    tick: number;
};
export declare class ForceLayout<NodeProps extends object = any, EdgeProps extends object = any, NodeStyle extends object = any, EdgeStyle extends object = any> {
    worker: Worker;
    dispose: () => void;
    handler: (graph: {
        nodes: PositionedNode<NodeProps, NodeStyle>[];
        edges: Edge[];
    }) => void;
    nodes: Node<NodeProps, NodeStyle>[];
    edges: Edge<EdgeProps, EdgeStyle>[];
    nodesById: {
        [id: string]: Node<NodeProps, NodeStyle>;
    };
    edgesById: {
        [id: string]: Edge<EdgeProps, EdgeStyle>;
    };
    positionedNodes: PositionedNode<NodeProps, NodeStyle>[];
    positionedNodesById: {
        [id: string]: PositionedNode<NodeProps, NodeStyle>;
    };
    private options;
    private run;
    constructor(handler?: (graph: {
        nodes: PositionedNode<NodeProps, NodeStyle>[];
        edges: Edge[];
    }) => void);
    apply: ({ nodes, edges, options }: {
        nodes: any[];
        edges: any[];
        options?: Partial<LayoutOptions> | undefined;
    }) => this;
}
export declare const Layout: <NodeProps extends object = any, EdgeProps extends object = any, NodeStyle extends object = any, EdgeStyle extends object = any>(handler?: (graph: {
    nodes: PositionedNode<NodeProps, NodeStyle, unknown>[];
    edges: Edge<EdgeProps, EdgeStyle>[];
}) => void) => {
    (graph: {
        nodes: any[];
        edges: any[];
        options?: Partial<LayoutOptions> | undefined;
    }): ForceLayout<NodeProps, any, NodeStyle, any>;
    nodes(): PositionedNode<NodeProps, NodeStyle, unknown>[];
    edges(): any[];
};
