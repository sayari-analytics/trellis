export declare type Node<Props extends object = any, NodeStyle extends object = any, SubgraphLayoutOptions = unknown> = {
    id: string;
    radius: number;
    x?: number;
    y?: number;
    label?: string;
    style?: NodeStyle;
    subGraph?: {
        nodes: Node<Props, NodeStyle>[];
        edges: Edge[];
        options?: SubgraphLayoutOptions;
    };
} & Props;
export declare type Edge<Props extends object = any, EdgeStyle extends object = any> = {
    id: string;
    label?: string;
    source: string;
    target: string;
    style?: EdgeStyle;
} & Props;
export declare type PositionedNode<Props extends object = any, NodeStyle extends object = any, SubgraphLayoutOptions = unknown> = {
    id: string;
    radius: number;
    x: number;
    y: number;
    label?: string;
    style?: NodeStyle;
    subGraph?: {
        nodes: PositionedNode<Props, NodeStyle>[];
        edges: Edge[];
        options?: SubgraphLayoutOptions;
    };
} & Props;
