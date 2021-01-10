import { NodeStyle, EdgeStyle } from './renderers/webgl';
export declare type Node = {
    id: string;
    radius: number;
    x?: number | undefined;
    y?: number | undefined;
    label?: string | undefined;
    style?: NodeStyle;
    subgraph?: {
        nodes: Node[];
        edges: Edge[];
        options?: {};
    } | undefined;
};
export declare type Edge = {
    id: string;
    source: string;
    target: string;
    label?: string;
    style?: EdgeStyle;
};
export declare type CircleAnnotation = {
    type: 'circle';
    id: string;
    x: number;
    y: number;
    radius: number;
    style: {
        color: string;
        stroke: {
            color: string;
            width: number;
        };
    };
};
export declare type RectangleAnnotation = {
    type: 'rectangle';
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    style: {
        color: string;
        stroke: {
            color: string;
            width: number;
        };
    };
};
export declare type Annotation = CircleAnnotation | RectangleAnnotation;
export declare type Bounds = {
    left: number;
    top: number;
    right: number;
    bottom: number;
};
export declare type Dimensions = {
    width: number;
    height: number;
};
export declare type Viewport = {
    x: number;
    y: number;
    zoom: number;
};
export declare const getSelectionBounds: (nodes: Node[], padding?: number) => Bounds;
export declare const mergeBounds: (a: Bounds, b: Bounds, padding?: number) => Bounds;
export declare const viewportToBounds: ({ x, y, zoom }: Viewport, { width, height }: Dimensions) => Bounds;
export declare const boundsToViewport: ({ left, top, right, bottom }: Bounds, { width, height }: Dimensions) => Viewport;
export declare const boundsToDimenions: ({ left, top, right, bottom }: Bounds, zoom: number) => Dimensions;
export declare const clamp: (min: number, max: number, value: number) => number;
