import * as PIXI from 'pixi.js-legacy'
import { InternalRenderer } from '..'
import { equals, TextAnnotation } from '../../..'
import { clientPositionFromEvent, colorToNumber, pointerKeysFromEvent } from '../utils'


//TODO
// - deal with overflow
// - resizing

export class TextAnnotationRenderer {

  x: number
  y: number
  dirty = false

  private annotation: TextAnnotation
  private annotationContainer = new PIXI.Container()
  private resizeContainer = new PIXI.Container()


  private renderer: InternalRenderer<any, any>
  private rectangleGraphic = new PIXI.Graphics()
  private triangleGraphic = new PIXI.Graphics()

  private textSprite = new PIXI.Text('')

  private moveOffsetX = 0
  private moveOffsetY = 0
  private doubleClickTimeout: number | undefined
  private doubleClick = false

  constructor(renderer: InternalRenderer<any, any>, annotation: TextAnnotation) {
    this.renderer = renderer
    this.annotation = annotation

    this.annotationContainer.interactive = true
    this.annotationContainer.buttonMode = true

    this.annotationContainer.addChild(this.rectangleGraphic)
    this.annotationContainer.addChild(this.triangleGraphic)
    this.annotationContainer.addChild(this.textSprite)

    this.renderer.annotationsBottomLayer.addChild(this.annotationContainer)

    this.annotationContainer
      .on('pointerover', this.pointerEnter)
      .on('pointerout', this.pointerLeave)
      .on('pointerdown', this.pointerDown)
      .on('pointerup', this.pointerUp)
      .on('pointerupoutside', this.pointerUp)
      .on('pointercancel', this.pointerUp)

    this.x = this.annotation.x
    this.y = this.annotation.y

    this.rectangleGraphic
      .clear()
      .beginFill(colorToNumber(this.annotation.boxStyle.color))
      .lineStyle(this.annotation.boxStyle.stroke.width, colorToNumber(this.annotation.boxStyle.stroke.color))
      .drawRect(this.annotation.x, this.annotation.y, this.annotation.width, this.annotation.height)
      .endFill()

    if (this.annotation.resize) {
      const origin = [
        this.annotation.x + this.annotation.width, this.annotation.y + this.annotation.height,
      ]

      const vertices = [
        origin[0] - 10, origin[1],
        origin[0], origin[1] - 10
      ]

      this.triangleGraphic
        .clear()
        .beginFill(colorToNumber(this.annotation.boxStyle.color))
        .lineStyle(1, 0x000000)
        .drawPolygon([...origin, ...vertices])
        .endFill()      
    }


    this.textSprite.x = this.annotation.x
    this.textSprite.y = this.annotation.y

    this.textSprite.text = this.annotation.content
    this.textSprite.style.fontFamily = this.annotation.textStyle?.fontName ?? 'Arial'
    this.textSprite.style.fontSize = this.annotation.textStyle?.fontSize ?? 14
    this.textSprite.style.stroke = this.annotation.textStyle?.color ?? '#000000'
    this.textSprite.style.letterSpacing = this.annotation.textStyle?.spacing ?? 0
    this.textSprite.style.wordWrap = true
    this.textSprite.style.wordWrapWidth = this.annotation.textStyle?.maxWidth ?? this.annotation.width ?? 0
    this.textSprite.style.align = this.annotation.textStyle?.align ?? 'left'

    this.textSprite.updateText(false)
  }


  update(annotation: TextAnnotation) {

    const containerUpdated = this.annotation.width !== annotation.width ||
      this.annotation.height !== annotation.height ||
      this.annotation.x !== annotation.x ||
      this.annotation.y !== annotation.y

    const boxUpdated = !equals(this.annotation.boxStyle, annotation.boxStyle)
    const textUpdated = this.annotation.content !== annotation.content ||
      !equals(this.annotation.textStyle, annotation.textStyle)

    this.annotation = annotation

    this.x = this.annotation.x
    this.y = this.annotation.y

    if (containerUpdated || boxUpdated) {
      this.rectangleGraphic
        .clear()
        .beginFill(colorToNumber(this.annotation.boxStyle.color))
        .lineStyle(this.annotation.boxStyle.stroke.width, colorToNumber(this.annotation.boxStyle.stroke.color))
        .drawRect(this.annotation.x, this.annotation.y, this.annotation.width, this.annotation.height)
        .endFill()

        const origin = [
          this.annotation.x + this.annotation.width, this.annotation.y + this.annotation.height,
        ]
  
        const vertices = [
          origin[0] - 10, origin[1],
          origin[0], origin[1] - 10
        ]
  
        this.triangleGraphic
          .clear()
          .beginFill(colorToNumber(this.annotation.boxStyle.color))
          .lineStyle(1, 0x000000)
          .drawPolygon([...origin, ...vertices])
          .endFill()      }

    if (containerUpdated || textUpdated) {
      this.textSprite.x = this.annotation.x
      this.textSprite.y = this.annotation.y

      if (textUpdated) {
        this.textSprite.text = this.annotation.content
        this.textSprite.style.fontFamily = this.annotation.textStyle?.fontName ?? 'Arial'
        this.textSprite.style.fontSize = this.annotation.textStyle?.fontSize ?? 14
        this.textSprite.style.stroke = this.annotation.textStyle?.color ?? '#000000'
        this.textSprite.style.letterSpacing = this.annotation.textStyle?.spacing ?? 0
        this.textSprite.style.wordWrap = true
        this.textSprite.style.wordWrapWidth = this.annotation.textStyle?.maxWidth ?? this.annotation.width ?? 0
        this.textSprite.style.align = this.annotation.textStyle?.align ?? 'left'
      }

      this.textSprite.updateText(false)
    }

    return this
  }


  private pointerEnter = (event: PIXI.InteractionEvent) => {
    if (this.renderer.hoveredAnnotation === this || this.renderer.clickedAnnotation !== undefined || this.renderer.dragging) return

    this.renderer.hoveredAnnotation = this

    this.dirty = true
    this.renderer.dirty = true
    // this.renderer.nodesLayer.removeChild(this.nodeContainer)
    // this.renderer.labelsLayer.removeChild(this.labelContainer)
    // this.renderer.frontNodeLayer.addChild(this.nodeContainer)
    // this.renderer.frontLabelLayer.addChild(this.labelContainer)

    const { x, y } = this.renderer.root.toLocal(event.data.global)
    const client = clientPositionFromEvent(event.data.originalEvent)
    this.renderer.onAnnotationPointerEnter?.({ type: 'annotationPointer', x, y, clientX: client.x, clientY: client.y, target: this.annotation, ...pointerKeysFromEvent(event.data.originalEvent) })
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
    this.moveOffsetX = x - this.x
    this.moveOffsetY = y - this.y
    this.renderer.onAnnotationPointerDown?.({ type: 'annotationPointer', x, y, clientX: client.x, clientY: client.y, target: this.annotation, ...pointerKeysFromEvent(event.data.originalEvent) })
  }

  private pointerMove = (event: PIXI.InteractionEvent) => {
    if (this.renderer.clickedAnnotation === undefined) return

    const { x, y } = this.renderer.root.toLocal(event.data.global)
    const client = clientPositionFromEvent(event.data.originalEvent)
    const annotationX = x - this.moveOffsetX
    const annotationY = y - this.moveOffsetY

    if (!this.renderer.dragging) {
      this.renderer.dragging = true
      this.renderer.onAnnotationDragStart?.({
        type: 'annotationDrag',
        x,
        y,
        clientX: client.x,
        clientY: client.y,
        annotationX,
        annotationY,
        target: this.annotation,
        altKey: this.renderer.altKey,
        ctrlKey: this.renderer.ctrlKey,
        metaKey: this.renderer.metaKey,
        shiftKey: this.renderer.shiftKey,
      })
    }

    this.renderer.onAnnotationDrag?.({
      type: 'annotationDrag',
      x,
      y,
      clientX: client.x,
      clientY: client.y,
      annotationX,
      annotationY,
      target: this.annotation,
      altKey: this.renderer.altKey,
      ctrlKey: this.renderer.ctrlKey,
      metaKey: this.renderer.metaKey,
      shiftKey: this.renderer.shiftKey,
    })
  }

  private pointerUp = (event: PIXI.InteractionEvent) => {
    if (this.renderer.clickedAnnotation === undefined) return

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
      this.renderer.onAnnotationDragEnd?.({
        type: 'annotationDrag',
        x,
        y,
        clientX: client.x,
        clientY: client.y,
        annotationX: this.annotation.x ?? 0,
        annotationY: this.annotation.y ?? 0,
        target: this.annotation,
        altKey: this.renderer.altKey,
        ctrlKey: this.renderer.ctrlKey,
        metaKey: this.renderer.metaKey,
        shiftKey: this.renderer.shiftKey,
      })
    } else {
      this.renderer.onAnnotationPointerUp?.({ type: 'annotationPointer', x, y, clientX: client.x, clientY: client.y, target: this.annotation, ...pointerKeysFromEvent(event.data.originalEvent) })
      this.renderer.onAnnotationClick?.({ type: 'annotationPointer', x, y, clientX: client.x, clientY: client.y, target: this.annotation, ...pointerKeysFromEvent(event.data.originalEvent) })

      if (this.doubleClick) {
        this.doubleClick = false
        this.doubleClickTimeout = undefined
        this.renderer.onAnnotationDoubleClick?.({ type: 'annotationPointer', x, y, clientX: client.x, clientY: client.y, target: this.annotation, ...pointerKeysFromEvent(event.data.originalEvent) })
      }
    }
  }

  private pointerLeave = (event: PIXI.InteractionEvent) => {
    if (this.renderer.clickedAnnotation !== undefined || this.renderer.hoveredAnnotation !== this || this.renderer.dragging) return

    this.renderer.hoveredAnnotation = undefined

    this.dirty = true
    this.renderer.dirty = true
    // this.renderer.frontNodeLayer.removeChild(this.nodeContainer)
    // this.renderer.frontLabelLayer.removeChild(this.labelContainer)
    // this.renderer.nodesLayer.addChild(this.nodeContainer)
    // this.renderer.labelsLayer.addChild(this.labelContainer)

    const { x, y } = this.renderer.root.toLocal(event.data.global)
    const client = clientPositionFromEvent(event.data.originalEvent)
    this.renderer.onAnnotationPointerLeave?.({ type: 'annotationPointer', x, y, clientX: client.x, clientY: client.y, target: this.annotation, ...pointerKeysFromEvent(event.data.originalEvent) })
  }

  private clearDoubleClick = () => {
    this.doubleClickTimeout = undefined
    this.doubleClick = false
  }


  delete() {
    this.rectangleGraphic.destroy()
    this.textSprite.destroy()
  }
}
