import { Extend } from '../../types';
import { Node, Edge } from '../../';
export declare type Options = Partial<{
    nodeStrength: number;
    linkDistance: number;
    linkStrength?: number;
    centerStrength: number;
    nodePadding: number;
    tick: number;
}>;
export declare const LAYOUT_OPTIONS: {
    nodeStrength: number;
    linkDistance: number;
    linkStrength: undefined;
    centerStrength: number;
    nodePadding: number;
    tick: number;
};
export declare const Layout: () => {
    <N extends Node<E>, E extends Edge>(graph: {
        nodes: N[];
        edges: E[];
        options?: Partial<{
            nodeStrength: number;
            linkDistance: number;
            linkStrength?: number | undefined;
            centerStrength: number;
            nodePadding: number;
            tick: number;
        }> | undefined;
    }): Promise<{
        nodes: Extend<N, {
            x: number;
            y: number;
        }>[];
        edges: E[];
    }>;
    delete(): void;
};
