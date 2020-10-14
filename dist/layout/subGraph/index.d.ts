import { Node, Edge } from '../../';
export declare type LayoutOptions = {
    nodeStrength: number;
    linkDistance: number;
    linkStrength?: number;
    centerStrength: number;
    nodePadding: number;
    tick: number;
};
export declare const LAYOUT_OPTIONS: LayoutOptions;
export declare const Layout: () => {
    <N extends Node<E, Partial<import("../../renderers/pixi").NodeStyle>>, E extends Edge<Partial<import("../../renderers/pixi").EdgeStyle>>>(graph: {
        nodes: N[];
        edges: E[];
        options?: Partial<LayoutOptions> | undefined;
    }): Promise<{
        nodes: N[];
        edges: E[];
    }>;
    delete(): void;
};
