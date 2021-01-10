import { InternalRenderer } from '..';
import { RectangleAnnotation } from '../../..';
export declare class RectangleAnnotationRenderer {
    private rectangle;
    private renderer;
    private rectangleGraphic;
    constructor(renderer: InternalRenderer<any, any>, rectangle: RectangleAnnotation);
    update(rectangle: RectangleAnnotation): this;
    delete(): void;
}
