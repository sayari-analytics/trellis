import { PIXIRenderer as Renderer, EdgeDatum, NodeDatum } from '.';
import { Node } from './node';
export declare const colorToNumber: (colorString: string) => number;
export declare const parentInFront: <N extends NodeDatum, E extends EdgeDatum>(renderer: Renderer<N, E>, parent: Node<N, E> | undefined) => boolean;
