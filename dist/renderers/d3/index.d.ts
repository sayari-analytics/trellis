import { LayoutOptions } from '../../layout/force';
import { PositionedNode, Edge } from '../../types';
declare type NodeStyle = {
    strokeWidth: number;
    fill: string;
    stroke: string;
    fillOpacity: number;
    strokeOpacity: number;
    icon?: string;
};
declare type EdgeStyle = {
    width: number;
    stroke: string;
    strokeOpacity: number;
};
declare type PositionedNodeWithInitialPosition = PositionedNode & {
    x0?: number;
    y0?: number;
};
declare type PositionedEdgeWithInitialPosition<Props extends object = {}, Style extends object = {}> = Omit<Edge<Props, Style>, 'source' | 'target'> & {
    source: PositionedNodeWithInitialPosition;
    target: PositionedNodeWithInitialPosition;
};
declare type RenderOptions = {
    id: string;
    nodeStyle: Partial<NodeStyle>;
    edgeStyle: Partial<EdgeStyle>;
    onNodeMouseDown: (node: PositionedNode, location: {
        x: number;
        y: number;
    }) => void;
    onNodeDrag: (node: PositionedNode, location: {
        x: number;
        y: number;
    }) => void;
    onNodeMouseUp: (node: PositionedNode, location: {
        x: number;
        y: number;
    }) => void;
};
export declare type NodeStyleSelector = <T extends keyof NodeStyle>(node: PositionedNode<{}, Partial<NodeStyle>>, attribute: T) => NodeStyle[T];
export declare const nodeStyleSelector: (nodeStyles: NodeStyle) => NodeStyleSelector;
export declare type EdgeStyleSelector = <T extends keyof EdgeStyle>(edge: PositionedEdgeWithInitialPosition<{}, Partial<EdgeStyle>>, attribute: T) => EdgeStyle[T];
export declare const edgeStyleSelector: (edgeStyles: EdgeStyle) => EdgeStyleSelector;
export declare const D3Renderer: ({ id, nodeStyle, edgeStyle, onNodeMouseDown, onNodeDrag, onNodeMouseUp, }: RenderOptions) => ({ nodes, edges, options }: {
    nodes: {
        [key: string]: any;
    };
    edges: {
        [key: string]: PositionedEdgeWithInitialPosition<{}, {}>;
    };
    options: LayoutOptions;
}) => void;
export {};
