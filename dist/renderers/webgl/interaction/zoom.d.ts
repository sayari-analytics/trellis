import { InternalRenderer, ViewportWheelEvent } from '..';
import { Node, Edge } from '../../..';
/**
 * zoom logic is based largely on the excellent [pixi-viewport](https://github.com/davidfig/pixi-viewport)
 * specificially, the [Wheel Plugin](https://github.com/davidfig/pixi-viewport/blob/eb00aafebca6f9d9233a6b537d7d418616bb866e/src/plugins/wheel.js)
 */
export declare class Zoom<N extends Node, E extends Edge> {
    private renderer;
    private onViewportWheel;
    private paused;
    constructor(renderer: InternalRenderer<N, E>, onViewportWheel: (event: ViewportWheelEvent) => void);
    wheel: (event: WheelEvent) => void;
    pause(): void;
    resume(): void;
}
