import { PIXIRenderer as Renderer } from '.';
import { Node } from './node';
export declare const colorToNumber: (colorString: string) => number;
export declare const parentInFront: (renderer: Renderer<any, any>, parent: Node<any> | undefined) => boolean;
