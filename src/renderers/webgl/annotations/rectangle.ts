import * as PIXI from 'pixi.js-legacy'
import { InternalRenderer } from '..'
import { RectangleAnnotation } from '../../..'
import { clientPositionFromEvent, colorToNumber, pointerKeysFromEvent } from '../utils'



const TRIANGLE_LENGTH = 15
const DEFAULT_FILL = '#FFFFFF'
const DEFAULT_STROKE = '#000000'

const MIN_WIDTH = 15
const MIN_HEIGHT = 15

export class RectangleAnnotationRenderer {

  private rectangle: RectangleAnnotation
  private renderer: InternalRenderer<any, any>
  private rectangleGraphic = new PIXI.Graphics()
  private triangleGraphic = new PIXI.Graphics()

  private annotationContainer = new PIXI.Container()
  private resizeContainer = new PIXI.Container()

  private interaction: 'drag' | 'resize' | undefined
  private resizeClicked: PIXI.Graphics | undefined

  private moveOffsetX = 0
  private moveOffsetY = 0
  private doubleClickTimeout: number | undefined
  private doubleClick = false

  constructor(renderer: InternalRenderer<any, any>, rectangle: RectangleAnnotation) {
    this.renderer = renderer
    this.rectangle = rectangle

    this.annotationContainer.interactive = true
    this.annotationContainer.buttonMode = true

    this.resizeContainer.interactive = true
    this.resizeContainer.buttonMode = true

    this.resizeContainer.addChild(this.triangleGraphic)

    this.annotationContainer.addChild(this.rectangleGraphic)

    this.renderer.annotationsBottomLayer.addChild(this.annotationContainer)
    this.renderer.annotationsBottomLayer.addChild(this.resizeContainer)

    this.resizeContainer
      .on('pointerdown', this.resizePointerDown)
      .on('pointerup', this.resizePointerUp)
      .on('pointerupoutside', this.resizePointerUp)
      .on('pointercancel', this.resizePointerUp)

    this.annotationContainer
      .on('pointerover', this.pointerEnter)
      .on('pointerout', this.pointerLeave)
      .on('pointerdown', this.pointerDown)
      .on('pointerup', this.pointerUp)
      .on('pointerupoutside', this.pointerUp)
      .on('pointercancel', this.pointerUp)

    this.update(rectangle)
  }

  update(rectangle: RectangleAnnotation) {
    this.rectangle = rectangle

    this.rectangleGraphic
      .clear()
      .beginFill(colorToNumber(this.rectangle.style.color))
      .lineStyle(this.rectangle.style.stroke.width, colorToNumber(this.rectangle.style.stroke.color))
      .drawRect(this.rectangle.x, this.rectangle.y, this.rectangle.width, this.rectangle.height)
      .endFill()


    if (this.rectangle.resize) {
      const triangleOrigin = [
        this.rectangle.x + this.rectangle.width, this.rectangle.y + this.rectangle.height
      ]

      this.triangleGraphic
        .clear()
        .beginFill(colorToNumber(this.rectangle.style.color ?? DEFAULT_FILL))
        .lineStyle(this.rectangle.style.stroke?.width ?? 1, colorToNumber(this.rectangle.style.stroke?.color ?? DEFAULT_STROKE))
        .drawPolygon([
          ...triangleOrigin, 
          triangleOrigin[0] - TRIANGLE_LENGTH, triangleOrigin[1],
          triangleOrigin[0], triangleOrigin[1] - TRIANGLE_LENGTH
        ])
        .endFill()      
    } 

    return this
  }


  private pointerEnter = (event: PIXI.InteractionEvent) => {
    if (this.renderer.hoveredAnnotation === this || this.renderer.clickedAnnotation !== undefined || this.renderer.dragging) return

    this.renderer.hoveredAnnotation = this
    this.renderer.dirty = true

    const { x, y } = this.renderer.root.toLocal(event.data.global)
    const client = clientPositionFromEvent(event.data.originalEvent)
    this.renderer.onAnnotationPointerEnter?.({ type: 'annotationPointer', x, y, clientX: client.x, clientY: client.y, target: this.rectangle, ...pointerKeysFromEvent(event.data.originalEvent) })
  }

  private pointerDown = (event: PIXI.InteractionEvent) => {
    if (this.doubleClickTimeout === undefined) {
      this.doubleClickTimeout = setTimeout(this.clearDoubleClick, 500)
    } else {
      this.doubleClick = true
    }    

    this.renderer.clickedAnnotation = this
    ;(this.renderer.app.renderer.plugins.interaction as PIXI.InteractionManager).on('pointermove', this.pointerMove)
    this.renderer.zoomInteraction.pause()
    this.renderer.dragInteraction.pause()
    this.renderer.decelerateInteraction.pause()
    const { x, y } = this.renderer.root.toLocal(event.data.global)
    const client = clientPositionFromEvent(event.data.originalEvent)
    this.moveOffsetX = x - this.rectangle.x
    this.moveOffsetY = y - this.rectangle.y
    this.renderer.onAnnotationPointerDown?.({ type: 'annotationPointer', x, y, clientX: client.x, clientY: client.y, target: this.rectangle, ...pointerKeysFromEvent(event.data.originalEvent) })
  }

  private pointerMove = (event: PIXI.InteractionEvent) => {
    if (this.renderer.clickedAnnotation !== this  || this.resizeClicked !== undefined || this.interaction === 'resize') return

    const { x, y } = this.renderer.root.toLocal(event.data.global)
    const client = clientPositionFromEvent(event.data.originalEvent)
    const annotationX = x - this.moveOffsetX
    const annotationY = y - this.moveOffsetY

    if (!this.renderer.dragging) {
      this.renderer.dragging = true
      this.interaction = 'drag'
      this.renderer.onAnnotationDragStart?.({
        type: 'annotationDrag',
        x,
        y,
        clientX: client.x,
        clientY: client.y,
        annotationX,
        annotationY,
        target: this.rectangle,
        altKey: this.renderer.altKey,
        ctrlKey: this.renderer.ctrlKey,
        metaKey: this.renderer.metaKey,
        shiftKey: this.renderer.shiftKey,
      })
    } else {
      this.renderer.onAnnotationDrag?.({
        type: 'annotationDrag',
        x,
        y,
        clientX: client.x,
        clientY: client.y,
        annotationX,
        annotationY,
        target: this.rectangle,
        altKey: this.renderer.altKey,
        ctrlKey: this.renderer.ctrlKey,
        metaKey: this.renderer.metaKey,
        shiftKey: this.renderer.shiftKey,
      })
    }
  }

  private pointerUp = (event: PIXI.InteractionEvent) => {
    if (this.renderer.clickedAnnotation !== this || this.resizeClicked !== undefined) return

    this.renderer.clickedAnnotation = undefined
    ;(this.renderer.app.renderer.plugins.interaction as PIXI.InteractionManager).off('pointermove', this.pointerMove)
    this.renderer.zoomInteraction.resume()
    this.renderer.dragInteraction.resume()
    this.renderer.decelerateInteraction.resume()
    this.moveOffsetX = 0
    this.moveOffsetY = 0

    const { x, y } = this.renderer.root.toLocal(event.data.global)
    const client = clientPositionFromEvent(event.data.originalEvent)

    if (this.renderer.dragging) {
      this.renderer.dragging = false
      this.interaction = undefined
      this.renderer.onAnnotationDragEnd?.({
        type: 'annotationDrag',
        x,
        y,
        clientX: client.x,
        clientY: client.y,
        annotationX: this.rectangle.x ?? 0,
        annotationY: this.rectangle.y ?? 0,
        target: this.rectangle,
        altKey: this.renderer.altKey,
        ctrlKey: this.renderer.ctrlKey,
        metaKey: this.renderer.metaKey,
        shiftKey: this.renderer.shiftKey,
      })
    } else {
      this.renderer.onAnnotationPointerUp?.({ type: 'annotationPointer', x, y, clientX: client.x, clientY: client.y, target: this.rectangle, ...pointerKeysFromEvent(event.data.originalEvent) })
      this.renderer.onAnnotationClick?.({ type: 'annotationPointer', x, y, clientX: client.x, clientY: client.y, target: this.rectangle, ...pointerKeysFromEvent(event.data.originalEvent) })

      if (this.doubleClick) {
        this.doubleClick = false
        this.doubleClickTimeout = undefined
        this.renderer.onAnnotationDoubleClick?.({ type: 'annotationPointer', x, y, clientX: client.x, clientY: client.y, target: this.rectangle, ...pointerKeysFromEvent(event.data.originalEvent) })
      }
    }
  }

  private pointerLeave = (event: PIXI.InteractionEvent) => {
    if (this.renderer.clickedAnnotation !== undefined || this.renderer.hoveredAnnotation !== this || this.renderer.dragging) return

    this.renderer.hoveredAnnotation = undefined
    this.renderer.dirty = true

    const { x, y } = this.renderer.root.toLocal(event.data.global)
    const client = clientPositionFromEvent(event.data.originalEvent)
    this.renderer.onAnnotationPointerLeave?.({ type: 'annotationPointer', x, y, clientX: client.x, clientY: client.y, target: this.rectangle, ...pointerKeysFromEvent(event.data.originalEvent) })
  }

  private resizePointerDown = (_: PIXI.InteractionEvent) => {

    this.resizeClicked = this.triangleGraphic
    this.renderer.clickedAnnotation = this
    ;(this.renderer.app.renderer.plugins.interaction as PIXI.InteractionManager).on('pointermove', this.resizePointerMove)
    this.renderer.zoomInteraction.pause()
    this.renderer.dragInteraction.pause()
    this.renderer.decelerateInteraction.pause()

    return
  }

  private resizePointerMove = (event: PIXI.InteractionEvent) => {
    if (this.renderer.clickedAnnotation !== this || this.resizeClicked === undefined || this.interaction === 'drag') return

    const { x, y } = this.renderer.root.toLocal(event.data.global)
    
    if (!this.renderer.dragging) {
      this.renderer.dragging = true
      this.interaction = 'resize'
    }

    const triangleOrigin = [
      this.rectangle.x + this.rectangle.width, this.rectangle.y + this.rectangle.height
    ]

    const dx = x - triangleOrigin[0]
    const dy = y - triangleOrigin[1]

    const newWidth = this.rectangle.width + dx
    const newHeight = this.rectangle.height + dy

    
    this.renderer.onAnnotationResize?.({ type: 'annotationResize', x, y, width: newWidth < MIN_WIDTH ? this.rectangle.width : newWidth, height: newHeight < MIN_HEIGHT ? this.rectangle.height : newHeight, target: this.rectangle, ...pointerKeysFromEvent(event.data.originalEvent) })

    return
  }

  private resizePointerUp = (_: PIXI.InteractionEvent) => {
    if (this.renderer.clickedAnnotation !== this || this.resizeClicked === undefined) return

    this.renderer.clickedAnnotation = undefined
    this.resizeClicked = undefined

    ;(this.renderer.app.renderer.plugins.interaction as PIXI.InteractionManager).off('pointermove', this.resizePointerMove)
    this.renderer.zoomInteraction.resume()
    this.renderer.dragInteraction.resume()
    this.renderer.decelerateInteraction.resume()

    if (this.renderer.dragging) {
      this.renderer.dragging = false
      this.interaction = undefined
    }

    return
  }

  private clearDoubleClick() {
    this.doubleClickTimeout = undefined
    this.doubleClick = false
  }

  delete() {
    this.rectangleGraphic.destroy()
  }
}


// export const RectangleAnnotationRenderer: AnnotationRendererConstructor<RectangleAnnotation> = (renderer: InternalRenderer<any, any>, annotation: RectangleAnnotation) => {
//   return new RectangleAnnotationRenderer(renderer, annotation)
// }
