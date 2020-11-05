import { Node } from '../';
export declare type Options = Partial<{
    className: string;
    top: number;
    left: number;
    right: number;
    bottom: number;
    onZoomIn: (event: PointerEvent) => any;
    onZoomOut: (event: PointerEvent) => any;
}>;
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
/**
 * TODO
 * - disable on min/max zoom
 * - tooltips
 */
export declare const Control: ({ container }: {
    container: HTMLDivElement;
}) => (options: Options) => void;
