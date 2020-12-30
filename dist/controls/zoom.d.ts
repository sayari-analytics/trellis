export declare type Options = Partial<{
    className: string;
    top: number;
    left: number;
    right: number;
    bottom: number;
    onZoomIn: (event: PointerEvent) => any;
    onZoomOut: (event: PointerEvent) => any;
}>;
export declare type ViewportChangeOptions = Partial<{
    padding: number;
}>;
export declare const clampZoom: (min: number, max: number, zoom: number) => number;
/**
 * TODO
 * - disable on min/max zoom
 * - tooltips
 */
export declare const Control: ({ container }: {
    container: HTMLDivElement;
}) => (options: Options) => void;
