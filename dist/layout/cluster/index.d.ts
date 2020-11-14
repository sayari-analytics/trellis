import { Node } from '../../';
export declare const Layout: () => <N extends Node>(nodes: N[]) => (N & {
    x: number;
    y: number;
})[];
