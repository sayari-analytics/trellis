/// <reference types="stats" />
import { Component, ReactNode } from 'react';
import { Node, Edge, PositionedNode } from '../../../types';
import { LayoutOptions } from '..';
declare type Props<NodeProps extends object = {}, EdgeProps extends object = {}, NodeStyle extends object = {}, EdgeStyle extends object = {}> = {
    debug?: {
        logPerformance?: boolean;
        stats?: Stats;
    };
    nodes: Node<NodeProps, NodeStyle>[];
    edges: Edge<EdgeProps, EdgeStyle>[];
    options?: Partial<LayoutOptions>;
    children: (graph: {
        nodes: PositionedNode<NodeProps, NodeStyle>[];
        edges: Edge<EdgeProps, EdgeStyle>[];
    }) => ReactNode;
};
declare type State<NodeProps extends object = {}, EdgeProps extends object = {}, NodeStyle extends object = {}, EdgeStyle extends object = {}> = {
    nodes: PositionedNode<NodeProps, NodeStyle>[];
    edges: Edge<EdgeProps, EdgeStyle>[];
};
export declare class Layout<NodeProps extends object = {}, EdgeProps extends object = {}, NodeStyle extends object = {}, EdgeStyle extends object = {}> extends Component<Props<NodeProps, EdgeProps, NodeStyle, EdgeStyle>, State<NodeProps, EdgeProps, NodeStyle, EdgeStyle>> {
    state: State<NodeProps, EdgeProps, NodeStyle, EdgeStyle>;
    private layout;
    componentDidMount(): void;
    UNSAFE_componentWillReceiveProps(): void;
    render(): ReactNode;
}
export {};
