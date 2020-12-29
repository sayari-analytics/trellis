import * as Graph from '../';
import { Options as RendererOptions, ViewportDragEvent } from '../renderers/webgl';
export declare type Options = Partial<{
    className: string;
    top: number;
    left: number;
    right: number;
    bottom: number;
    onSelection: (event: ViewportDragEvent) => void;
}>;
export declare const Control: ({ container, render }: {
    container: HTMLDivElement;
    render: (graph: {
        nodes: Graph.Node[];
        edges: Graph.Edge[];
        options?: RendererOptions;
        annotations?: Graph.Annotation[];
    }) => void;
}) => <N extends Graph.Node, E extends Graph.Edge>({ controlOptions, ...graph }: {
    nodes: N[];
    edges: E[];
    options?: RendererOptions<N, E> | undefined;
    annotations?: Graph.CircleAnnotation[] | undefined;
    controlOptions?: Partial<{
        className: string;
        top: number;
        left: number;
        right: number;
        bottom: number;
        onSelection: (event: ViewportDragEvent) => void;
    }> | undefined;
}) => void;
