import * as PIXI from 'pixi.js';
import { PIXIRenderer as Renderer } from '.';
import { Node, Edge } from '../../';
export declare class CircleRenderer<N extends Node, E extends Edge> {
    texture: PIXI.RenderTexture;
    constructor(renderer: Renderer<N, E>);
    create(): PIXI.Sprite;
    delete(): void;
}
