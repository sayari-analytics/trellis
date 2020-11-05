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
};
export declare const Renderer: <N extends Node<Edge<WebGL.EdgeStyle>, WebGL.NodeStyle>, E extends Edge<WebGL.EdgeStyle>>(options?: {
    backgroundColor?: string;
}) => {
    (graph: {
        nodes: N[];
        edges: E[];
        options?: Options | undefined;
    }): Promise<string>;
    delete: () => void;
};
