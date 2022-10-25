import * as PIXI from 'pixi.js-legacy'
import { InternalRenderer } from '..'
import { equals, TextAnnotation } from '../../..'
import { clientPositionFromEvent, colorToNumber, pointerKeysFromEvent } from '../utils'


//TODO
// - fix buggy drag/resize interaction
// - make styling look nice
// - test changing font family, size, alignment etc..

export class TextAnnotationRenderer {

  x: number
  y: number
  dirty = false

  private renderer: InternalRenderer<any, any>

  private annotation: TextAnnotation
  private annotationContainer = new PIXI.Container()
  private resizeContainer = new PIXI.Container()

  private rectangleGraphic = new PIXI.Graphics()
  private triangleGraphic = new PIXI.Graphics()
  private textSprite = new PIXI.Text('')

  // private annotationDragging = false
  // private triangleDragging = false

  private moveOffsetX = 0
  private moveOffsetY = 0
  private doubleClickTimeout: number | undefined
  private doubleClick = false

  constructor(renderer: InternalRenderer<any, any>, annotation: TextAnnotation) {
    this.renderer = renderer
    this.annotation = annotation

    this.annotationContainer.interactive = true
    this.annotationContainer.buttonMode = true

    this.resizeContainer.interactive = true
    this.resizeContainer.buttonMode = true

    this.resizeContainer.addChild(this.triangleGraphic)

    this.annotationContainer.addChild(this.rectangleGraphic)
    this.annotationContainer.addChild(this.textSprite)

    this.renderer.annotationsBottomLayer.addChild(this.annotationContainer)
    this.renderer.annotationsBottomLayer.addChild(this.resizeContainer)

    this.resizeContainer
      .on('pointerdown', this.trianglePointerDown)
      .on('pointerup', this.trianglePointerUp)
      .on('pointerupoutside', this.trianglePointerUp)
      .on('pointercancel', this.trianglePointerUp)

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
      const triangleOrigin = [
        this.annotation.x + this.annotation.width, this.annotation.y + this.annotation.height
      ]

      this.triangleGraphic
        .clear()
        .beginFill(colorToNumber(this.annotation.boxStyle.color))
        .lineStyle(1, 0x000000)
        .drawPolygon([
          ...triangleOrigin, 
          triangleOrigin[0] - 10, triangleOrigin[1],
          triangleOrigin[0], triangleOrigin[1] - 10
        ])
        .endFill()      
    }


    this.styleText()
  }

  update(annotation: TextAnnotation) {

    this.annotation = annotation

    this.x = this.annotation.x
    this.y = this.annotation.y

    this.rectangleGraphic
      .clear()
      .beginFill(colorToNumber(this.annotation.boxStyle.color))
      .lineStyle(this.annotation.boxStyle.stroke.width, colorToNumber(this.annotation.boxStyle.stroke.color))
      .drawRect(this.annotation.x, this.annotation.y, this.annotation.width, this.annotation.height)
      .endFill()

    const triangleOrigin = [
      this.annotation.x + this.annotation.width, this.annotation.y + this.annotation.height
    ]

    this.triangleGraphic
      .clear()
      .beginFill(colorToNumber(this.annotation.boxStyle.color))
      .lineStyle(1, 0x000000)
      .drawPolygon([
        ...triangleOrigin, 
        triangleOrigin[0] - 10, triangleOrigin[1],
        triangleOrigin[0], triangleOrigin[1] - 10
      ])
      .endFill()   

    this.styleText()

    return this
  }

  private styleText() {
    // this.textSprite.style.padding = 4 wasn't working as expected
    // so I artificially adding some padding
    let text = this.annotation.content

    const style = new PIXI.TextStyle({
      fontFamily: this.annotation.textStyle?.fontName ?? 'Arial',
      fontSize: this.annotation.textStyle?.fontSize ?? 14,
      stroke: this.annotation.textStyle?.color ?? '#000000',
      letterSpacing: this.annotation.textStyle?.spacing ?? 0,
      wordWrap: true,
      //account for padding
      wordWrapWidth: this.annotation.textStyle?.maxWidth ?? this.annotation.width - 2 ?? 0,
      breakWords: true,
      align: this.annotation.textStyle?.align ?? 'left'
    })


    const metrics = PIXI.TextMetrics.measureText(this.annotation.content, style, true)

    if (metrics.height > this.annotation.height - 2) {
      const numLines = Math.floor((this.annotation.height - 2) / metrics.lineHeight)
      text = metrics.lines
        .slice(0, numLines)
        // not sure about if I should join with the whitespace or not
        .join(' ')
        .slice(undefined, -3)
        .concat('...')
    }

    this.textSprite.x = this.annotation.x + 2
    this.textSprite.y = this.annotation.y + 2

    this.textSprite.text = text
    this.textSprite.style = style

    this.textSprite.updateText(false)
  }

  private pointerEnter = (event: PIXI.InteractionEvent) => {
    if (this.renderer.hoveredAnnotation === this || this.renderer.clickedAnnotation !== undefined || this.renderer.dragging) return

    this.renderer.hoveredAnnotation = this

    this.dirty = true
    this.renderer.dirty = true

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
    ;(this.renderer.app.renderer.plugins.interaction as PIXI.InteractionManager).off('pointermove', this.trianglePointerMove)
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

    const { x, y } = this.renderer.root.toLocal(event.data.global)
    const client = clientPositionFromEvent(event.data.originalEvent)
    this.renderer.onAnnotationPointerLeave?.({ type: 'annotationPointer', x, y, clientX: client.x, clientY: client.y, target: this.annotation, ...pointerKeysFromEvent(event.data.originalEvent) })
  }

  private trianglePointerDown = (_: PIXI.InteractionEvent) => {
    if (this.doubleClickTimeout === undefined) {
      this.doubleClickTimeout = setTimeout(this.clearDoubleClick, 500)
    } else {
      this.doubleClick = true
    }

    this.renderer.clickedAnnotation = this
    ;(this.renderer.app.renderer.plugins.interaction as PIXI.InteractionManager).on('pointermove', this.trianglePointerMove)
    this.renderer.zoomInteraction.pause()
    this.renderer.dragInteraction.pause()
    this.renderer.decelerateInteraction.pause()

    return
  }

  private trianglePointerMove = (event: PIXI.InteractionEvent) => {
    if (this.renderer.clickedAnnotation === undefined) return

    const { x, y } = this.renderer.root.toLocal(event.data.global)
    
    if (!this.renderer.dragging) {
      this.renderer.dragging = true
    }

    const triangleOrigin = [
      this.annotation.x + this.annotation.width, this.annotation.y + this.annotation.height
    ]

    const dx = x - triangleOrigin[0]
    const dy = y - triangleOrigin[1]

    const newWidth = this.annotation.width + dx
    const newHeight = this.annotation.height + dy

    this.renderer.onAnnotationResize?.({ type: 'annotationResize', x, y, dx: newWidth < 15 ? 0 : dx, dy: newHeight < 15 ? 0 : dy, target: this.annotation, ...pointerKeysFromEvent(event.data.originalEvent) })

    return
  }

  private trianglePointerUp = (event: PIXI.InteractionEvent) => {
    if (this.renderer.clickedAnnotation === undefined) return

    this.renderer.clickedAnnotation = undefined
    ;(this.renderer.app.renderer.plugins.interaction as PIXI.InteractionManager).off('pointermove', this.pointerMove)
    this.renderer.zoomInteraction.resume()
    this.renderer.dragInteraction.resume()
    this.renderer.decelerateInteraction.resume()

    const { x, y } = this.renderer.root.toLocal(event.data.global)
    const client = clientPositionFromEvent(event.data.originalEvent)

    if (this.renderer.dragging) {
      this.renderer.dragging = false
    } else {
      if (this.doubleClick) {
        this.doubleClick = false
        this.doubleClickTimeout = undefined
        this.renderer.onAnnotationDoubleClick?.({ type: 'annotationPointer', x, y, clientX: client.x, clientY: client.y, target: this.annotation, ...pointerKeysFromEvent(event.data.originalEvent) })
      }
    }

    return
  }

  private clearDoubleClick() {
    this.doubleClickTimeout = undefined
    this.doubleClick = false
  }


  delete() {
    this.rectangleGraphic.destroy()
    this.textSprite.destroy()
  }
}
