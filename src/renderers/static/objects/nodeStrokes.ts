import { Sprite } from 'pixi.js-legacy'
import * as Graph from '../../..'
import { StaticRenderer } from '..'
import { NodeRenderer } from '../node'


export class NodeStrokes {

  mounted = false
  radius = 0
  strokes?: Sprite[] // TODO - make private

  private renderer: StaticRenderer
  private nodeRenderer: NodeRenderer
  private style?: Graph.NodeStyle
  
  constructor(renderer: StaticRenderer, nodeRenderer: NodeRenderer) {
    this.renderer = renderer
    this.nodeRenderer = nodeRenderer
  }

  update(x: number, y: number, radius: number, style?: Graph.NodeStyle) {
    if (style?.stroke !== this.style?.stroke) {
      // exit
      this.delete()

      if (style?.stroke?.length) {
        // enter
        this.strokes = Array(style.stroke.length)
  
        this.radius = radius
  
        for (let i = 0; i < style.stroke.length; i++) {
          this.radius += style.stroke[i].width
          const circle = new Sprite(this.renderer.circle.texture)
          circle.anchor.set(0.5)
          circle.scale.set(this.radius / this.renderer.circle.scaleFactor)
          circle.tint = style.stroke[i].color
          circle.x = x
          circle.y = y
          this.strokes[i] = circle
        }
      }
    } else if (this.strokes && this.style?.stroke) {
      // reposition
      this.radius = radius

      for (let i = 0; i < this.strokes.length; i++) {
        this.radius += this.style.stroke[i].width
        const scale = this.radius / this.renderer.circle.scaleFactor
        if (scale !== this.strokes[i].scale.x) {
          this.strokes[i].scale.set(this.radius / this.renderer.circle.scaleFactor)
        }
        this.strokes[i].x = x
        this.strokes[i].y = y
      }
    }

    this.style = style

    return this
  }

  mount() {
    if (!this.mounted && this.strokes) {
      const strokeContainerIndex = this.nodeRenderer.fill.containerIndex

      for (let i = this.strokes.length - 1; i >= 0; i--) {
        this.renderer.nodesContainer.addChildAt(this.strokes[i], strokeContainerIndex)
      }
      this.mounted = true
    }

    return this
  }

  unmount() {
    if (this.mounted && this.strokes) {
      for (let i = this.strokes.length - 1; i >= 0; i--) {
        this.renderer.nodesContainer.removeChild(this.strokes[i])
      }
      this.mounted = false
    }

    return this
  }

  delete() {
    this.radius = 0
    this.unmount()

    if (this.strokes) {
      for (const stroke of this.strokes) {
        stroke.destroy()
      }
    }

    return undefined
  }
}
