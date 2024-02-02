import { ObjectManager } from '../objects'
import { Container } from 'pixi.js'
import ApplicationEvents from './ApplicationEvents'
import RendererOptions from '../RendererOptions'
import Decelerate from './plugins/Decelerate'
import HitArea from './hitArea/HitArea'
import Drag from './plugins/Drag'
import Zoom from './plugins/Zoom'

export default class InteractionManager {
  drag: Drag
  zoom: Zoom
  decelerate: Decelerate
  container = new Container()
  manager = new ObjectManager<HitArea>(2000)

  constructor(events: ApplicationEvents, options: RendererOptions, container: HTMLDivElement, root: Container) {
    this.drag = new Drag(events, options, container, root)
    this.zoom = new Zoom(events, options, container, root)
    this.decelerate = new Decelerate(events, options, container, root)
  }

  get isDecelerating() {
    return this.decelerate.isDecelerating
  }

  get isDragging() {
    return this.drag.isDragging
  }

  get isZooming() {
    return this.zoom.isZooming
  }
}
