import { Container } from 'pixi.js'
import ApplicationEvents from '../ApplicationEvents'
import RendererOptions from 'src/webgl/RendererOptions'
import Interaction from '../Interaction'

export default abstract class InteractionPlugin extends Interaction {
  protected _paused = false

  constructor(events: ApplicationEvents, options: RendererOptions, container: HTMLDivElement, root: Container) {
    super(events, options, container, root)
  }

  pause() {
    this._paused = true
    return this
  }

  resume() {
    this._paused = false
    return this
  }

  protected get viewport() {
    // TODO -> !!
    return this.options.defaultViewport
  }
}
