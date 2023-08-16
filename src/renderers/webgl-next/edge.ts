import { InternalRenderer } from '.'
import * as Graph from '../..'


export  class EdgeRenderer<E extends Graph.Edge> {

  edge: E
  renderer: InternalRenderer<any, E>

  constructor(renderer: InternalRenderer<any, any>, edge: E) {
    this.edge = edge
    this.renderer = renderer

    
    // this.renderer.edgesGraphic
    //   .moveTo(this.x0, this.y0)
    //   .lineStyle(this.width, this.stroke, this.strokeOpacity)
    //   .lineTo(this.x1, this.y1)
  }
}  
