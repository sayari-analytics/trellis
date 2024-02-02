import { Container } from 'pixi.js'
import ApplicationEvents from './ApplicationEvents'
import RendererOptions from '../RendererOptions'

export default abstract class Interaction {
  constructor(
    protected events: ApplicationEvents,
    protected options: RendererOptions,
    protected container: HTMLDivElement,
    protected root: Container
  ) {
    this.events = events
    this.options = options
    this.container = container
    this.root = root
  }

  protected set cursor(cursor: string) {
    this.container.style.cursor = cursor
  }
}
