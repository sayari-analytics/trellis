import { Node, Edge } from '../../';
export declare type Options = Partial<{
    x: number;
    y: number;
    radius: number;
    bfs: boolean;
}>;
export declare const Layout: () => <N extends Node<E>, E extends Edge>(root: string, graph: {
    nodes: N[];
    edges: E[];
    options?: Partial<{
        x: number;
        y: number;
        radius: number;
        bfs: boolean;
    }> | undefined;
}) => {
    nodes: (N & {
        x: number;
        y: number;
    })[];
    edges: E[];
    options: Partial<{
        x: number;
        y: number;
        radius: number;
        bfs: boolean;
    }> | undefined;
};
