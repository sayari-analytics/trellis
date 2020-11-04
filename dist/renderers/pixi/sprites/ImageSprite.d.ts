import * as PIXI from 'pixi.js';
export declare class ImageSprite {
    cache: {
        [url: string]: PIXI.Texture;
    };
    create(url: string, scale?: number, offsetX?: number, offsetY?: number): PIXI.Sprite;
    delete(): void;
}
