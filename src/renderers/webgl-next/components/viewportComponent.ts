import { Rectangle } from 'pixi.js'
import { Renderer } from '..'
import { viewportToBounds } from '../../..'
import { interpolate } from '../../../utils/helpers'

export type ViewportOptions = {
  width: number
  height: number
  x?: number
  y?: number
  zoom?: number
  minZoom?: number
  maxZoom?: number
  animateViewport?: number | boolean
  animateNodePosition?: number | boolean
  animateNodeRadius?: number | boolean
  dragInertia?: number
}

export const DEFAULT_VIEWPORT_OPTIONS = {
  x: 0,
  y: 0,
  zoom: 1,
  minZoom: 0.025,
  maxZoom: 3,
  animateViewport: 800,
  animateNodePosition: 2000,
  animateNodeRadius: 800,
  dragInertia: 0.88
}

export class ViewportComponent {
  width: number
  height: number
  x: number = DEFAULT_VIEWPORT_OPTIONS.x
  y: number = DEFAULT_VIEWPORT_OPTIONS.y
  zoom: number = DEFAULT_VIEWPORT_OPTIONS.zoom
  minZoom: number = DEFAULT_VIEWPORT_OPTIONS.minZoom
  maxZoom: number = DEFAULT_VIEWPORT_OPTIONS.maxZoom
  animateViewport: number | false = DEFAULT_VIEWPORT_OPTIONS.animateViewport
  animateNodePosition: number | false = DEFAULT_VIEWPORT_OPTIONS.animateNodePosition
  animateNodeRadius: number | false = DEFAULT_VIEWPORT_OPTIONS.animateNodeRadius
  dragInertia: number = DEFAULT_VIEWPORT_OPTIONS.dragInertia

  minX!: number
  minY!: number
  maxX!: number
  maxY!: number
  bbox!: Rectangle
  viewportChanged = false
  previousViewportChanged = false

  private interpolateX?: (dt: number) => { value: number; done: boolean }
  private interpolateY?: (dt: number) => { value: number; done: boolean }
  private interpolateZoom?: (dt: number) => { value: number; done: boolean }

  constructor(
    private renderer: Renderer,
    width: number,
    height: number,
    maxZoom?: number
  ) {
    this.width = width
    this.height = height
    this.maxZoom = maxZoom ?? DEFAULT_VIEWPORT_OPTIONS.maxZoom
  }

  render(dt: number, nextViewport?: ViewportOptions) {
    this.previousViewportChanged = this.viewportChanged
    this.viewportChanged = false

    if (nextViewport !== undefined) {
      this.animateViewport =
        nextViewport.animateViewport === true || nextViewport.animateViewport === undefined
          ? DEFAULT_VIEWPORT_OPTIONS.animateViewport
          : nextViewport.animateViewport
      this.animateNodePosition =
        nextViewport.animateNodePosition === true || nextViewport.animateNodePosition === undefined
          ? DEFAULT_VIEWPORT_OPTIONS.animateNodePosition
          : nextViewport.animateNodePosition
      this.animateNodeRadius =
        nextViewport.animateNodeRadius === true || nextViewport.animateNodeRadius === undefined
          ? DEFAULT_VIEWPORT_OPTIONS.animateNodeRadius
          : nextViewport.animateNodeRadius
      this.dragInertia = nextViewport.dragInertia ?? DEFAULT_VIEWPORT_OPTIONS.dragInertia

      /**
       * update dimensions
       */
      if (nextViewport.width !== this.width || nextViewport.height !== this.height) {
        this.width = nextViewport.width
        this.height = nextViewport.height
        this.renderer.app.renderer.resize(this.width, this.height)
      }

      /**
       * update viewport
       *
       * interpolate viewport position if all of the following are true:
       * - viewport position has changed
       * - animateViewport option is enabled
       * - the viewport is not being dragged or zoomed
       * - it's not the first time nodes have been rendered
       */
      const nextX = nextViewport.x ?? DEFAULT_VIEWPORT_OPTIONS.x
      const nextY = nextViewport.y ?? DEFAULT_VIEWPORT_OPTIONS.y
      const nextZoom = Math.max(this.minZoom, Math.min(this.maxZoom, nextViewport.zoom ?? DEFAULT_VIEWPORT_OPTIONS.zoom))
      const xChanged = nextX !== this.x
      const yChanged = nextY !== this.y
      const zoomChanged = nextZoom !== this.zoom

      if (
        (xChanged || yChanged || zoomChanged) &&
        this.animateViewport &&
        !this.renderer.interactions.drag.dragging &&
        !this.renderer.interactions.decelerate.decelerating &&
        !this.renderer.interactions.zoom.zooming &&
        this.renderer.renderedNodes
      ) {
        // start viewport interpolation
        if (xChanged) this.interpolateX = interpolate(this.x, nextX, this.animateViewport)
        if (yChanged) this.interpolateY = interpolate(this.y, nextY, this.animateViewport)
        if (zoomChanged) this.interpolateZoom = interpolate(this.zoom, nextZoom, this.animateViewport)
      } else {
        // update viewport without interpolating
        const { left, top, right, bottom } = viewportToBounds(
          { x: nextX, y: nextY, zoom: nextZoom },
          { width: this.width, height: this.height }
        )
        this.minX = left
        this.maxX = right
        this.minY = top
        this.maxY = bottom
        this.bbox = new Rectangle(this.minX, this.minY, this.maxX - this.minX, this.maxY - this.minY)
        this.x = nextX
        this.y = nextY
        this.zoom = nextZoom
        this.renderer.containers.root.x = -nextX * nextZoom + this.width / 2
        this.renderer.containers.root.y = -nextY * nextZoom + this.height / 2
        this.renderer.containers.root.scale.set(nextZoom)
        this.interpolateX = undefined
        this.interpolateY = undefined
        this.interpolateZoom = undefined
        this.viewportChanged = true
      }
    } else {
      /**
       * interpolate viewport changes
       */
      let _x: number | undefined
      let _y: number | undefined
      let _zoom: number | undefined

      if (this.interpolateX) {
        const { value, done } = this.interpolateX(dt)
        _x = value

        if (done) this.interpolateX = undefined
      }

      if (this.interpolateY) {
        const { value, done } = this.interpolateY(dt)
        _y = value

        if (done) this.interpolateY = undefined
      }

      if (this.interpolateZoom) {
        const { value, done } = this.interpolateZoom(dt)
        _zoom = value

        if (done) this.interpolateZoom = undefined
      }

      if (_x !== undefined || _y !== undefined || _zoom !== undefined) {
        const x = _x ?? this.x
        const y = _y ?? this.y
        const zoom = _zoom ?? this.zoom
        const { left, top, right, bottom } = viewportToBounds({ x, y, zoom }, { width: this.width, height: this.height })
        this.minX = left
        this.maxX = right
        this.minY = top
        this.maxY = bottom
        this.bbox = new Rectangle(this.minX, this.minY, this.maxX - this.minX, this.maxY - this.minY)
        this.x = x
        this.y = y
        this.zoom = zoom
        this.renderer.containers.root.x = -x * zoom + this.width / 2
        this.renderer.containers.root.y = -y * zoom + this.height / 2
        this.renderer.containers.root.scale.set(zoom)
        this.viewportChanged = true
      }
    }

    this.renderer.debug?.updateViewportPanel?.update(this.viewportChanged ? 1 : 0, 1)
  }

  delete() {}
}
