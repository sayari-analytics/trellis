import * as PIXI from 'pixi.js';
import { InternalRenderer } from '..';
import { Node, Edge } from '../../..';
/**
 * deceleration logic is based largely on the excellent [pixi-viewport](https://github.com/davidfig/pixi-viewport)
 * specificially, the [Drag Plugin](https://github.com/davidfig/pixi-viewport/blob/eb00aafebca6f9d9233a6b537d7d418616bb866e/src/plugins/drag.js)
 */
export declare class Drag<N extends Node, E extends Edge> {
    private renderer;
    private onContainerDrag;
    private paused;
    private last?;
    private current?;
    private moved;
    constructor(renderer: InternalRenderer<N, E>, onContainerDrag: (event: PIXI.InteractionEvent, x: number, y: number) => void);
    down: (event: PIXI.InteractionEvent) => void;
    move: (event: PIXI.InteractionEvent) => void;
    up: () => void;
    pause(): void;
    resume(): void;
}
