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
  private node?: Graph.Node
  
  constructor(renderer: StaticRenderer, nodeRenderer: NodeRenderer, node: Graph.Node) {
    this.renderer = renderer
    this.nodeRenderer = nodeRenderer
    this.update(node)
  }

  update(node: Graph.Node) {
    if (node.style?.stroke !== this.node?.style?.stroke) {
      // exit
      this.delete()

      if (node.style?.stroke?.length) {
        // enter
        this.strokes = Array(node.style.stroke.length)
  
        this.radius = node.radius
  
        for (let i = 0; i < node.style.stroke.length; i++) {
          this.radius += node.style.stroke[i].width
          const circle = new Sprite(this.renderer.circle.texture)
          circle.anchor.set(0.5)
          circle.scale.set(this.radius / this.renderer.circle.scaleFactor)
          circle.tint = node.style.stroke[i].color
          circle.x = node.x ?? 0
          circle.y = node.y ?? 0
          this.strokes[i] = circle
        }
      }
    } else if (this.strokes && this.node?.style?.stroke) {
      // reposition
      this.radius = node.radius

      for (let i = 0; i < this.strokes.length; i++) {
        this.radius += this.node.style.stroke[i].width
        const scale = this.radius / this.renderer.circle.scaleFactor
        if (scale !== this.strokes[i].scale.x) {
          this.strokes[i].scale.set(this.radius / this.renderer.circle.scaleFactor)
        }
        this.strokes[i].x = this.node.x ?? 0
        this.strokes[i].y = this.node.y ?? 0
      }
    }

    this.node = node

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
