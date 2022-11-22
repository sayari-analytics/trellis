import * as PIXI from 'pixi.js-legacy'
import { InternalRenderer } from '..'
import { TextAnnotation } from '../../..'
import { clientPositionFromEvent, colorToNumber, pointerKeysFromEvent } from '../utils'



const TRIANGLE_LENGTH = 15
const DEFAULT_FILL = '#FFFFFF'
const DEFAULT_STROKE = '#000000'
const DEFAULT_PADDING = 4
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

  private interaction: 'drag' | 'resize' | undefined
  private resizeClicked: PIXI.Graphics | undefined

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

    this.x = this.annotation.x
    this.y = this.annotation.y

    this.rectangleGraphic
      .clear()
      .beginFill(colorToNumber(this.annotation.style.backgroundColor ?? DEFAULT_FILL))
      .lineStyle(this.annotation.style.stroke?.width ?? 1, colorToNumber(this.annotation.style.stroke?.color ?? DEFAULT_STROKE))
      .drawRect(this.annotation.x, this.annotation.y, this.annotation.width, this.annotation.height)
      .endFill()

    if (this.annotation.resize) {
      const triangleOrigin = [
        this.annotation.x + this.annotation.width, this.annotation.y + this.annotation.height
      ]

      this.triangleGraphic
        .clear()
        .beginFill(colorToNumber(this.annotation.style.backgroundColor ?? DEFAULT_FILL))
        .lineStyle(this.annotation.style.stroke?.width ?? 1, colorToNumber(this.annotation.style.stroke?.color ?? DEFAULT_STROKE))
        .drawPolygon([
          ...triangleOrigin, 
          triangleOrigin[0] - TRIANGLE_LENGTH, triangleOrigin[1],
          triangleOrigin[0], triangleOrigin[1] - TRIANGLE_LENGTH
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
      .beginFill(colorToNumber(this.annotation.style.backgroundColor ?? DEFAULT_FILL))
      .lineStyle(this.annotation.style.stroke?.width ?? 1, colorToNumber(this.annotation.style.stroke?.color ?? DEFAULT_STROKE))
      .drawRect(this.annotation.x, this.annotation.y, this.annotation.width, this.annotation.height)
      .endFill()

    const triangleOrigin = [
      this.annotation.x + this.annotation.width, this.annotation.y + this.annotation.height
    ]

    this.triangleGraphic
      .clear()
      .beginFill(colorToNumber(this.annotation.style.backgroundColor ?? DEFAULT_FILL))
      .lineStyle(this.annotation.style.stroke?.width ?? 1, colorToNumber(this.annotation.style.stroke?.color ?? DEFAULT_STROKE))
      .drawPolygon([
        ...triangleOrigin, 
        triangleOrigin[0] - TRIANGLE_LENGTH, triangleOrigin[1],
        triangleOrigin[0], triangleOrigin[1] - TRIANGLE_LENGTH
      ])
      .endFill()   

    this.styleText()

    return this
  }

  private styleText() {
    // this.textSprite.style.padding = 4 wasn't working as expected
    // so I artificially adding some padding
    let text = this.annotation.content

    const padding = this.annotation.style.padding ?? DEFAULT_PADDING

    const style = new PIXI.TextStyle({
      fontFamily: this.annotation.style.text?.fontName ?? 'Arial',
      fontSize: this.annotation.style.text?.fontSize ?? 14,
      fontWeight: this.annotation.style.text?.fontWeight ?? 'normal',
      fontStyle: this.annotation.style.text?.fontStyle ?? 'normal',
      stroke: this.annotation.style.text?.color ?? '#000000',
      letterSpacing: this.annotation.style.text?.letterSpacing ?? 0,
      leading: this.annotation.style.text?.lineSpacing ?? 0,
      wordWrap: true,
      //account for padding
      wordWrapWidth: this.annotation.style.text?.maxWidth ?? this.annotation.width - (2 * padding) ?? 0,
      breakWords: true,
      align: this.annotation.style.text?.align ?? 'left'
    })


    const metrics = PIXI.TextMetrics.measureText(this.annotation.content, style, true)

    if (metrics.height > this.annotation.height - (2 * padding)) {
      const numLines = Math.floor((this.annotation.height - (2 * padding)) / metrics.lineHeight)
      text = metrics.lines
        .slice(0, numLines)
        // not sure about if I should join with the whitespace or not
        .join(' ')
        .slice(undefined, -3)
        .concat('...')
    }

    this.textSprite.x = this.annotation.x + padding
    this.textSprite.y = this.annotation.y + padding

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
    if (this.renderer.clickedAnnotation !== this || this.resizeClicked !== undefined || this.interaction === 'resize') return

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
        target: this.annotation,
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
        target: this.annotation,
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
      this.annotation.x + this.annotation.width, this.annotation.y + this.annotation.height
    ]

    const dx = x - triangleOrigin[0]
    const dy = y - triangleOrigin[1]

    const newWidth = this.annotation.width + dx
    const newHeight = this.annotation.height + dy

    const style = new PIXI.TextStyle({
      fontFamily: this.annotation.style.text?.fontName ?? 'Arial',
      fontSize: this.annotation.style.text?.fontSize ?? 14,
      fontWeight: this.annotation.style.text?.fontWeight ?? 'normal',
      fontStyle: this.annotation.style.text?.fontStyle ?? 'normal',
      stroke: this.annotation.style.text?.color ?? '#000000',
      letterSpacing: this.annotation.style.text?.letterSpacing ?? 0,
      leading: this.annotation.style.text?.lineSpacing ?? 0,
      wordWrap: true,
      //account for padding
      wordWrapWidth: this.annotation.style.text?.maxWidth ?? this.annotation.width - (2 * (this.annotation.style.padding ?? DEFAULT_PADDING)) ?? 0,
      breakWords: true,
      align: this.annotation.style.text?.align ?? 'left'
    })


    const metrics = PIXI.TextMetrics.measureText(this.annotation.content, style, true)

    // min width determined by multiplying the fontSize by 2 to account for the ellipsis + the padding  
    const minWidth = (2 * metrics.fontProperties.fontSize) + (2 * (this.annotation.style.padding ?? DEFAULT_PADDING))
    // min height should be the lineHeight of 1 row of text + padding
    const minHeight = metrics.lineHeight + (2 * (this.annotation.style.padding ?? DEFAULT_PADDING))

    
    this.renderer.onAnnotationResize?.({ type: 'annotationResize', x, y, width: newWidth < minWidth ? this.annotation.width : newWidth, height: newHeight < minHeight ? this.annotation.height : newHeight, target: this.annotation, ...pointerKeysFromEvent(event.data.originalEvent) })

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
    this.renderer.annotationsBottomLayer.removeChild(this.annotationContainer)
    this.renderer.annotationsBottomLayer.removeChild(this.resizeContainer)

    this.annotationContainer.destroy({ children: true })
    this.triangleGraphic.destroy({ children: true })
  }
}
