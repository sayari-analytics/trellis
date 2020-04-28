/// <reference types="stats" />
import { Component } from 'react';
import { RendererOptions, NodeStyle, EdgeStyle } from '..';
import { PositionedNode, Edge } from '../../../types';
declare type Props<NodeProps extends object = {}, EdgeProps extends object = {}> = {
    debug?: {
        logPerformance?: boolean;
        stats?: Stats;
    };
    nodes: PositionedNode<NodeProps, NodeStyle>[];
    edges: Edge<EdgeProps, EdgeStyle>[];
    options?: Partial<RendererOptions>;
};
export declare class Renderer<NodeProps extends object = {}, EdgeProps extends object = {}> extends Component<Props<NodeProps, EdgeProps>> {
    private container;
    private renderer;
    componentDidMount(): void;
    componentDidUpdate(): void;
    render(): import("react").DetailedReactHTMLElement<import("react").HTMLAttributes<HTMLCanvasElement>, HTMLCanvasElement>;
}
export {};
