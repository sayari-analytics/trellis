import { Container, Polygon } from 'pixi.js'
import { HALF_PI, movePoint } from '../utils'
import { EdgeRenderer } from '../edge'

const MIN_LINE_HOVER_RADIUS = 2

export class EdgeHitArea {
  mounted = false

  private container: Container
  private edgeRenderer: EdgeRenderer
  private hitArea = new Container()

  constructor(container: Container, edgeRenderer: EdgeRenderer) {
    this.container = container
    this.edgeRenderer = edgeRenderer

    this.hitArea.eventMode = 'static'
    this.hitArea.addEventListener('pointerenter', this.edgeRenderer.pointerEnter)
    this.hitArea.addEventListener('pointerdown', this.edgeRenderer.pointerDown)
    this.hitArea.addEventListener('pointerup', this.edgeRenderer.pointerUp)
    this.hitArea.addEventListener('pointerupoutside', this.edgeRenderer.pointerUp)
    this.hitArea.addEventListener('pointercancel', this.edgeRenderer.pointerUp)
    this.hitArea.addEventListener('pointerleave', this.edgeRenderer.pointerLeave)
  }

  update(x0: number, y0: number, x1: number, y1: number, width: number, theta: number) {
    const perpendicular = theta + HALF_PI

    const hoverRadius = Math.max(width, MIN_LINE_HOVER_RADIUS)
    const hitAreaVertices: number[] = new Array(8)
    let point = movePoint(x0, y0, perpendicular, hoverRadius)
    hitAreaVertices[0] = point[0]
    hitAreaVertices[1] = point[1]
    point = movePoint(x0, y0, perpendicular, -hoverRadius)
    hitAreaVertices[2] = point[0]
    hitAreaVertices[3] = point[1]
    point = movePoint(x1, y1, perpendicular, -hoverRadius)
    hitAreaVertices[4] = point[0]
    hitAreaVertices[5] = point[1]
    point = movePoint(x1, y1, perpendicular, hoverRadius)
    hitAreaVertices[6] = point[0]
    hitAreaVertices[7] = point[1]
    this.hitArea.hitArea = new Polygon(hitAreaVertices)

    return this
  }

  mount() {
    if (!this.mounted) {
      this.container.addChildAt(this.hitArea, 0)
      this.mounted = true
    }

    return this
  }

  unmount() {
    if (this.mounted) {
      this.container.removeChild(this.hitArea)
      this.mounted = false
    }

    return this
  }

  delete() {
    this.container.removeChild(this.hitArea)
    this.hitArea.destroy()
    return undefined
  }
}
