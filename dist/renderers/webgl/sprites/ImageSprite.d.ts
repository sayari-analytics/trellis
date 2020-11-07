import * as PIXI from 'pixi.js';
/**
 * TODO - cacheing textures doesn't always work on initial render
 * need to use pixi loader
 */
export declare class ImageSprite {
    cache: {
        [url: string]: PIXI.Texture;
    };
    create(url: string, scale?: number, offsetX?: number, offsetY?: number): PIXI.Sprite;
    delete(): void;
}
