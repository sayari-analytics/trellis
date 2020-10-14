import { Node } from '../';
export declare type Options = {
    top: number;
    left: number;
    right: number;
    bottom: number;
    onZoomIn: (event: MouseEvent) => any;
    onZoomOut: (event: MouseEvent) => any;
};
export declare type ViewportChangeOptions = {
    padding: number;
};
export declare const zoomTo: (nodes: Node[], options?: Partial<ViewportChangeOptions> | undefined) => {
    zoom: number;
    position: number[];
};
export declare const fit: (zoom: number, position: [number, number], nodes: Node[], options?: Partial<ViewportChangeOptions> | undefined) => {
    zoom: number;
    position: number[];
};
export declare const clampZoom: (min: number, max: number, zoom: number) => number;
export declare const Control: (options: {
    container: HTMLDivElement;
}) => (options: Partial<Options>) => void;
