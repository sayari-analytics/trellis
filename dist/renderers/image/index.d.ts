import * as WebGL from '../webgl';
import { Node, Edge } from '../../';
export declare type TextIcon = WebGL.TextIcon;
export declare type ImageIcon = WebGL.ImageIcon;
export declare type NodeStyle = WebGL.NodeStyle;
export declare type EdgeStyle = WebGL.EdgeStyle;
export declare type Options = {
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    zoom?: number;
    resolution?: number;
    mimetype?: string;
};
export declare const Renderer: <N extends Node, E extends Edge>() => {
    (graph: {
        nodes: N[];
        edges: E[];
        options?: Options | undefined;
    }): Promise<string>;
    delete: () => void;
};
