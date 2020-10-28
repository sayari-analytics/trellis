import * as PIXI from 'pixi.js';
export declare class ImageSprite {
    cache: {
        [url: string]: PIXI.Texture;
    };
    create(url: string): PIXI.Sprite;
    delete(): void;
}
