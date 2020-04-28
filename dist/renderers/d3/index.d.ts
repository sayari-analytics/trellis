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
export declare type NodeDatum = Exclude<PositionedNode<EdgeDatum>, 'style'> & {
    style?: NodeStyle;
};
export declare type EdgeDatum = Exclude<Edge, 'style'> & {
    style?: EdgeStyle;
};
declare type PositionedNodeWithInitialPosition = NodeDatum & {
    x0?: number;
    y0?: number;
};
declare type PositionedEdgeWithInitialPosition<Props extends object = {}, Style extends object = {}> = Omit<EdgeDatum, 'source' | 'target'> & {
    source: PositionedNodeWithInitialPosition;
    target: PositionedNodeWithInitialPosition;
};
declare type RenderOptions = {
    id: string;
    nodeStyle: Partial<NodeStyle>;
    edgeStyle: Partial<EdgeStyle>;
    onNodeMouseDown: (node: NodeDatum, location: {
        x: number;
        y: number;
    }) => void;
    onNodeDrag: (node: NodeDatum, location: {
        x: number;
        y: number;
    }) => void;
    onNodeMouseUp: (node: NodeDatum, location: {
        x: number;
        y: number;
    }) => void;
};
export declare type NodeStyleSelector = <T extends keyof NodeStyle>(node: NodeDatum, attribute: T) => NodeStyle[T];
export declare const nodeStyleSelector: (nodeStyles: NodeStyle) => NodeStyleSelector;
export declare type EdgeStyleSelector = <T extends keyof EdgeStyle>(edge: PositionedEdgeWithInitialPosition<{}, Partial<EdgeStyle>>, attribute: T) => EdgeStyle[T];
export declare const edgeStyleSelector: (edgeStyles: EdgeStyle) => EdgeStyleSelector;
export declare const D3Renderer: ({ id, nodeStyle, edgeStyle, onNodeMouseDown, onNodeDrag, onNodeMouseUp, }: RenderOptions) => ({ nodes, edges, options }: {
    nodes: {
        [key: string]: NodeDatum;
    };
    edges: {
        [key: string]: PositionedEdgeWithInitialPosition<Props, Style>;
    };
    options: LayoutOptions;
}) => void;
export {};
