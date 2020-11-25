import * as PIXI from 'pixi.js-legacy';
export declare class FontIconSprite {
    cache: {
        [icon: string]: PIXI.Texture;
    };
    create(text: string, fontFamily: string, fontSize: number, fontWeight: string, fill: string): PIXI.Sprite;
    delete(): void;
}
