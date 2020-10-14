import { PIXIRenderer } from '..';
import { Node, Edge } from '../../../';
/**
 * deceleration logic is based largely on the excellent [pixi-viewport](https://github.com/davidfig/pixi-viewport)
 * specificially, the [Wheel Plugin](https://github.com/davidfig/pixi-viewport/blob/eb00aafebca6f9d9233a6b537d7d418616bb866e/src/plugins/wheel.js)
 */
export declare class Zoom<N extends Node, E extends Edge> {
    private renderer;
    private onContainerWheel;
    private paused;
    minZoom: number;
    maxZoom: number;
    constructor(renderer: PIXIRenderer<N, E>, onContainerWheel: (e: WheelEvent, x: number, y: number, zoom: number) => void);
    wheel: (e: WheelEvent) => void;
    pause(): void;
    resume(): void;
}
