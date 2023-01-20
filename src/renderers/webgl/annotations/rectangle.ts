import * as PIXI from 'pixi.js-legacy'
import { InternalRenderer } from '..'
import { RectangleAnnotation, TextAnnotation } from '../../..'
import { clientPositionFromEvent, colorToNumber, pointerKeysFromEvent } from '../utils'


const DEFAULT_PADDING = 4
const MIN_WIDTH = 5
const MIN_HEIGHT = 5

const DEFAULT_FILL = '#FFFFFF'
const DEFAULT_STROKE = '#000000'

// const HIT_AREA_PADDING = 10
const RESIZE_RADIUS = 4

type ResizeControl = {
  graphic: PIXI.Graphics
  position: 'nw' | 'ne' | 'sw' | 'se'
}

const getResizeControlOrigin = (hitBox: ResizeControl, rectOrigin: { x: number, y: number }, width: number, height: number): [x: number, y: number] | undefined => {
  switch(hitBox.position) {
  case 'nw' :
    return [rectOrigin.x, rectOrigin.y]
  case 'sw':
    return [rectOrigin.x, rectOrigin.y + height]
  case 'ne':
    return [rectOrigin.x + width, rectOrigin.y]
  case 'se':
    return [rectOrigin.x + width, rectOrigin.y + height]
  }
}

// const getHitArea = (annotation: RectangleAnnotation) => {
//   const topLeft = [annotation.x - HIT_AREA_PADDING, annotation.y - HIT_AREA_PADDING]
//   const bottomLeft = [annotation.x - HIT_AREA_PADDING, annotation.y + annotation.height + HIT_AREA_PADDING]
//   const topRight = [annotation.x + annotation.width + HIT_AREA_PADDING, annotation.y - HIT_AREA_PADDING]
//   const bottomRight = [annotation.x + annotation.width + HIT_AREA_PADDING, annotation.y + annotation.height + HIT_AREA_PADDING]

//   return [
//     ...topLeft,
//     ...bottomLeft,
//     ...bottomRight,
//     ...topRight
//   ]
// }

// TODO: do we want pointerEnter/Leave events for the resize circles?
export class RectangleAnnotationRenderer {

  x: number
  y: number
  dirty = false

  private renderer: InternalRenderer<any, any>

  private annotation: TextAnnotation | RectangleAnnotation
  private annotationContainer = new PIXI.Container()
  private resizeContainer = new PIXI.Container()

  private rectangleGraphic = new PIXI.Graphics()

  private textSprite = new PIXI.Text('')
  private resizeControls: ResizeControl[] = [
    { graphic: new PIXI.Graphics(), position: 'nw' },
    { graphic: new PIXI.Graphics(), position: 'ne' },
    { graphic: new PIXI.Graphics(), position: 'sw' },
    { graphic: new PIXI.Graphics(), position: 'se' }
  ] 

  private interaction: 'drag' | 'resize' | undefined
  private resizeClicked: ResizeControl | undefined

  private moveOffsetX = 0
  private moveOffsetY = 0
  private doubleClickTimeout: number | undefined
  private doubleClick = false

  constructor(renderer: InternalRenderer<any, any>, annotation: TextAnnotation | RectangleAnnotation) {
    this.renderer = renderer
    this.annotation = annotation

    this.annotationContainer.interactive = true
    this.annotationContainer.buttonMode = true

    this.resizeContainer.interactive = true
    this.resizeContainer.buttonMode = true

    this.resizeControls.forEach((hitBox, idx) => {
      this.resizeContainer.addChild(hitBox.graphic)
      hitBox.graphic.interactive = true
      hitBox.graphic.buttonMode = true
      
      hitBox.graphic
        .on('pointerdown', this.resizePointerDown(idx))
        .on('pointerup', this.resizePointerUp(idx))
        .on('pointerupoutside', this.resizePointerUp(idx))
        .on('pointercancel', this.resizePointerUp(idx))
    })

    this.annotationContainer.addChild(this.rectangleGraphic)
    this.annotationContainer.addChild(this.textSprite)

    this.renderer.annotationsBottomLayer.addChild(this.annotationContainer)
    this.renderer.annotationsBottomLayer.addChild(this.resizeContainer)

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

    // TODO: figure out how to pad hitarea without affecting pointer events
    // this.rectangleGraphic.hitArea = new PIXI.Polygon(getHitArea(this.annotation))

    if (this.annotation.resize) this.handleHitBoxes(false)
    if (this.annotation.type == 'text') this.styleText(this.annotation)
  }

  update(annotation: TextAnnotation | RectangleAnnotation) {
    const toggleResize = annotation.resize !== this.annotation.resize

    this.annotation = annotation


    this.x = this.annotation.x
    this.y = this.annotation.y

    this.rectangleGraphic
      .clear()
      .beginFill(colorToNumber(this.annotation.style.backgroundColor ?? DEFAULT_FILL))
      .lineStyle(this.annotation.style.stroke?.width ?? 1, colorToNumber(this.annotation.style.stroke?.color ?? DEFAULT_STROKE))
      .drawRect(this.annotation.x, this.annotation.y, this.annotation.width, this.annotation.height)
      .endFill()


    if (toggleResize || this.annotation.resize) {
      if (this.annotation.resize) this.handleHitBoxes(false) 
      else this.handleHitBoxes(true)
    }

    if (this.annotation.type == 'text') this.styleText(this.annotation)

    return this
  }

  private styleText(annotation: TextAnnotation) {
    if (annotation.type === 'text') {
      // textSprite.style.padding = 4 wasn't working as expected
      // so I artificially adding some padding
      let text = annotation.content

      const padding = annotation.style.padding ?? DEFAULT_PADDING

      const style = new PIXI.TextStyle({
        fontFamily: annotation.style.text?.fontName ?? 'Arial',
        fontSize: annotation.style.text?.fontSize ?? 14,
        fontWeight: annotation.style.text?.fontWeight ?? 'normal',
        fontStyle: annotation.style.text?.fontStyle ?? 'normal',
        fill: annotation.style.text?.color ?? '#000000',
        letterSpacing: annotation.style.text?.letterSpacing ?? 0,
        leading: annotation.style.text?.lineSpacing ?? 0,
        wordWrap: true,
        //account for padding
        wordWrapWidth: annotation.style.text?.maxWidth ?? annotation.width - (2 * padding) ?? 0,
        breakWords: true,
        align: annotation.style.text?.align ?? 'left'
      })


      const metrics = PIXI.TextMetrics.measureText(annotation.content, style, true)

      if (metrics.height > annotation.height - (2 * padding)) {
        const numLines = Math.floor((annotation.height - (2 * padding)) / metrics.lineHeight)
        text = metrics.lines
          .slice(0, numLines)
          // not sure about if I should join with the whitespace or not
          .join(' ')
          .slice(undefined, -3)
          .concat('...')
      }
      

      this.textSprite.x = annotation.x + padding
      this.textSprite.y = annotation.y + padding

      this.textSprite.text = text
      this.textSprite.style = style

      this.textSprite.updateText(false)
    }
  }

  private handleHitBoxes(hide: boolean) {
    this.resizeControls.forEach((hitBox) => {
      const origin = getResizeControlOrigin(hitBox, { x: this.annotation.x, y: this.annotation.y }, this.annotation.width, this.annotation.height)
      if (origin === undefined) return

      if (hide) {
        hitBox.graphic.clear()
      } else {
        hitBox.graphic
          .clear()
          .beginFill(colorToNumber(this.annotation.style.backgroundColor ?? DEFAULT_FILL))
          .lineStyle(this.annotation.style.stroke?.width ?? 1, colorToNumber(this.annotation.style.stroke?.color ?? DEFAULT_STROKE))
          .drawCircle(origin[0], origin[1], RESIZE_RADIUS)
          .endFill()  
      }   
    })

    return
  }

  private pointerEnter = (event: PIXI.InteractionEvent) => {
    if (this.renderer.hoveredAnnotation === this || this.renderer.clickedAnnotation !== undefined || this.renderer.dragging) return

    this.renderer.annotationsBottomLayer.removeChild(this.annotationContainer)
    this.renderer.annotationsBottomLayer.removeChild(this.resizeContainer)
    this.renderer.annotationsLayer.addChild(this.annotationContainer)
    this.renderer.annotationsLayer.addChild(this.resizeContainer)

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

    this.renderer.annotationsLayer.removeChild(this.annotationContainer)
    this.renderer.annotationsLayer.removeChild(this.resizeContainer)
    this.renderer.annotationsBottomLayer.addChild(this.annotationContainer)
    this.renderer.annotationsBottomLayer.addChild(this.resizeContainer)

    this.renderer.hoveredAnnotation = undefined

    this.dirty = true
    this.renderer.dirty = true

    const { x, y } = this.renderer.root.toLocal(event.data.global)
    const client = clientPositionFromEvent(event.data.originalEvent)
    this.renderer.onAnnotationPointerLeave?.({ type: 'annotationPointer', x, y, clientX: client.x, clientY: client.y, target: this.annotation, ...pointerKeysFromEvent(event.data.originalEvent) })
  }

  private resizePointerDown = (hitBoxIdx: number) => (_: PIXI.InteractionEvent) => {

    this.resizeClicked = this.resizeControls[hitBoxIdx]
    this.renderer.clickedAnnotation = this
    ;(this.renderer.app.renderer.plugins.interaction as PIXI.InteractionManager).on('pointermove', this.resizePointerMove(hitBoxIdx))
    this.renderer.zoomInteraction.pause()
    this.renderer.dragInteraction.pause()
    this.renderer.decelerateInteraction.pause()

    return
  }

  private resizePointerMove = (hitBoxIdx: number) => (event: PIXI.InteractionEvent) => {
    if (
      this.renderer.clickedAnnotation !== this ||
      this.resizeClicked === undefined ||
      this.resizeClicked.position !== this.resizeControls[hitBoxIdx].position ||
      this.interaction === 'drag'
    ) return

    const { x, y } = this.renderer.root.toLocal(event.data.global)
    
    if (!this.renderer.dragging) {
      this.renderer.dragging = true
      this.interaction = 'resize'
    }

    const hitBox = this.resizeControls[hitBoxIdx]
    const hitBoxOrigin = getResizeControlOrigin(hitBox, { x: this.annotation.x, y: this.annotation.y }, this.annotation.width, this.annotation.height)

    if (hitBoxOrigin === undefined) return // idk we need to have a safeguard in case something wonky happens


    let newWidth = this.annotation.width
    let newHeight = this.annotation.height

    let newX = this.annotation.x
    let newY = this.annotation.y

    if (hitBox.position === 'nw') {
      const dx = hitBoxOrigin[0] - x
      const dy = hitBoxOrigin[1] - y

      newX = x
      newY = y

      newWidth = this.annotation.width + dx
      newHeight = this.annotation.height + dy
    } else if (hitBox.position === 'sw') {
      const dx = hitBoxOrigin[0] - x
      const dy = y - hitBoxOrigin[1]

      newWidth = this.annotation.width + dx
      newHeight = this.annotation.height + dy

      newX = x
      newY = y - newHeight

    } else if (hitBox.position === 'ne') {
      const dx = x - hitBoxOrigin[0]
      const dy = hitBoxOrigin[1] - y

      newWidth = this.annotation.width + dx
      newHeight = this.annotation.height + dy

      newX = x - newWidth
      newY = y

    } else if (hitBox.position === 'se') {
      const dx = x - hitBoxOrigin[0]
      const dy = y - hitBoxOrigin[1]

      newWidth = this.annotation.width + dx
      newHeight = this.annotation.height + dy
    }


    let minHeight = MIN_HEIGHT
    let minWidth = MIN_WIDTH

    if (this.annotation.type === 'text') {
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
  
      // for text annotations min width determined by multiplying the fontSize by 2 to account for the ellipsis + the padding  
      minWidth = (2 * metrics.fontProperties.fontSize) + (2 * (this.annotation.style.padding ?? DEFAULT_PADDING))
      // for text annotations min height should be the lineHeight of 1 row of text + padding
      minHeight = metrics.lineHeight + (2 * (this.annotation.style.padding ?? DEFAULT_PADDING))
    }

    this.renderer.onAnnotationResize?.({ type: 'annotationResize', position: hitBox.position, x: newWidth < minWidth ? this.annotation.x : newX, y: newHeight < minHeight ? this.annotation.y : newY, width: newWidth < minWidth ? this.annotation.width : newWidth, height: newHeight < minHeight ? this.annotation.height : newHeight, target: this.annotation, ...pointerKeysFromEvent(event.data.originalEvent) })

    return
  }

  private resizePointerUp = (hitBoxIdx: number) => (_: PIXI.InteractionEvent) => {
    if (this.renderer.clickedAnnotation !== this || this.resizeClicked === undefined) return

    this.renderer.clickedAnnotation = undefined
    this.resizeClicked = undefined

    ;(this.renderer.app.renderer.plugins.interaction as PIXI.InteractionManager).off('pointermove', this.resizePointerMove(hitBoxIdx))
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
    this.resizeContainer.destroy({ children: true })
  }
}
