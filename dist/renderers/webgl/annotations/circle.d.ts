import { InternalRenderer } from '..';
import { CircleAnnotation, Node, Edge } from '../../..';
export declare class CircleAnnotationRenderer<N extends Node, E extends Edge> {
    private circle;
    private renderer;
    private circleGraphic;
    constructor(renderer: InternalRenderer<N, E>, circle: CircleAnnotation);
    update(circle: CircleAnnotation): this;
    delete(): void;
}
