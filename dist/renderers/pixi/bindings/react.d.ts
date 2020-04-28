/// <reference types="stats" />
import { Component } from 'react';
import { RendererOptions, NodeDatum, EdgeDatum } from '..';
export declare type Props<N extends NodeDatum, E extends EdgeDatum> = {
    debug?: {
        logPerformance?: boolean;
        stats?: Stats;
    };
    nodes: N[];
    edges: E[];
    options?: Partial<RendererOptions<N, E>>;
};
export declare class Renderer<N extends NodeDatum, E extends EdgeDatum> extends Component<Props<N, E>> {
    private container;
    private renderer;
    componentDidMount(): void;
    componentDidUpdate(): void;
    render(): import("react").DetailedReactHTMLElement<import("react").HTMLAttributes<HTMLCanvasElement>, HTMLCanvasElement>;
}
