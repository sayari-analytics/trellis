import * as PIXI from 'pixi.js-legacy'

export const DEFAULT_FILL = '#FFFFFF'
export const DEFAULT_STROKE = '#000000'

// export const HIT_AREA_PADDING = 10
export const RESIZE_RADIUS = 4

export type ResizeHitBox = {
  graphic: PIXI.Graphics
  position: 'nw' | 'ne' | 'sw' | 'se'
}

export const getHitBoxOrigin = (hitBox: ResizeHitBox, rectOrigin: { x: number, y: number }, width: number, height: number): [x: number, y: number] | undefined => {
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