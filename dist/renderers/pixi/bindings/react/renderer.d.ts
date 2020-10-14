/// <reference types="stats" />
/// <reference types="react" />
import { RendererOptions } from '../../';
import { Node, Edge } from '../../../../';
export declare type Props<N extends Node = Node, E extends Edge = Edge> = Partial<RendererOptions<N, E>> & {
    nodes: N[];
    edges: E[];
    debug?: {
        logPerformance?: boolean;
        stats?: Stats;
    };
};
export declare const Renderer: <N extends Node<Edge<Partial<import("../..").EdgeStyle>>, Partial<import("../..").NodeStyle>> = Node<Edge<Partial<import("../..").EdgeStyle>>, Partial<import("../..").NodeStyle>>, E extends Edge<Partial<import("../..").EdgeStyle>> = Edge<Partial<import("../..").EdgeStyle>>>(props: Props<N, E>) => import("react").DetailedReactHTMLElement<import("react").HTMLAttributes<HTMLDivElement>, HTMLDivElement>;
