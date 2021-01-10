import { InternalRenderer } from '..';
import { CircleAnnotation } from '../../..';
export declare class CircleAnnotationRenderer {
    private circle;
    private renderer;
    private circleGraphic;
    constructor(renderer: InternalRenderer<any, any>, circle: CircleAnnotation);
    update(circle: CircleAnnotation): this;
    delete(): void;
}
