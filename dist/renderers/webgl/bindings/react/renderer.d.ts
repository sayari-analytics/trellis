/// <reference types="stats" />
/// <reference types="react" />
import { Options } from '../..';
import { Node, Edge } from '../../../..';
export declare type Props<N extends Node = Node, E extends Edge = Edge> = Partial<Options<N, E>> & {
    nodes: N[];
    edges: E[];
    debug?: {
        logPerformance?: boolean;
        stats?: Stats;
    };
};
export declare const Renderer: <N extends Node = Node, E extends Edge = Edge>(props: Props<N, E>) => import("react").DetailedReactHTMLElement<import("react").HTMLAttributes<HTMLDivElement>, HTMLDivElement>;
