import { InternalRenderer } from '..';
import { Node, Edge } from '../../..';
/**
 * deceleration logic is based largely on the excellent [pixi-viewport](https://github.com/davidfig/pixi-viewport)
 * specificially, the [Decelerate Plugin](https://github.com/davidfig/pixi-viewport/blob/eb00aafebca6f9d9233a6b537d7d418616bb866e/src/plugins/decelerate.js)
 */
export declare class Decelerate<N extends Node, E extends Edge> {
    private renderer;
    onContainerDecelerate: (x: number, y: number) => void;
    private paused;
    private saved;
    private x?;
    private y?;
    private friction;
    private minSpeed;
    private percentChangeX;
    private percentChangeY;
    constructor(renderer: InternalRenderer<N, E>, onContainerDecelerate: (x: number, y: number) => void);
    down: () => void;
    move: () => void;
    up: () => void;
    update: (elapsed: number) => void;
    pause(): void;
    resume(): void;
}
