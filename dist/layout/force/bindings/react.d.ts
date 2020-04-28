/// <reference types="stats" />
import { Component, ReactNode } from 'react';
import { Node, Edge, PositionNode } from '../../../types';
import { LayoutOptions } from '..';
export declare type Props<N extends Node<E>, E extends Edge> = {
    debug?: {
        logPerformance?: boolean;
        stats?: Stats;
    };
    nodes: N[];
    edges: E[];
    options?: Partial<LayoutOptions>;
    children: (graph: {
        nodes: PositionNode<N, E>[];
        edges: E[];
    }) => ReactNode;
};
declare type State<N extends Node<E>, E extends Edge> = {
    nodes: PositionNode<N, E>[];
    edges: E[];
};
export declare class Layout<N extends Node<E>, E extends Edge> extends Component<Props<N, E>, State<N, E>> {
    state: State<N, E>;
    private layout;
    componentDidMount(): void;
    UNSAFE_componentWillReceiveProps(nextProps: Props<N, E>): void;
    render(): ReactNode;
}
export {};
