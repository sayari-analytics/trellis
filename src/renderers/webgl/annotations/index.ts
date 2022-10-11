import { CircleAnnotationRenderer } from './circle'
import { RectangleAnnotationRenderer } from './rectangle'
import { TextAnnotationRenderer } from './text'


export type AnnotationRenderer = CircleAnnotationRenderer
  | RectangleAnnotationRenderer
  | TextAnnotationRenderer
