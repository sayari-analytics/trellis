import { FederatedPointerEvent } from 'pixi.js'
import { Container } from 'pixi.js'
import ApplicationEvents from '../ApplicationEvents'
import RendererOptions from '../../RendererOptions'
import Interaction from '../Interaction'
import HitArea from '../hitArea/HitArea'

export default abstract class EventsManager extends Interaction {
  abstract hitArea: HitArea
  protected doubleClick = false
  protected doubleClickTimeout: NodeJS.Timeout | undefined

  constructor(events: ApplicationEvents, options: RendererOptions, container: HTMLDivElement, root: Container) {
    super(events, options, container, root)
    this.onPointerDown = this.onPointerDown.bind(this)
    this.onPointerEnter = this.onPointerEnter.bind(this)
    this.onPointerLeave = this.onPointerLeave.bind(this)
    this.onPointerMove = this.onPointerMove.bind(this)
    this.onPointerUp = this.onPointerUp.bind(this)
  }

  abstract onPointerEnter(event: FederatedPointerEvent): void
  abstract onPointerDown(event: FederatedPointerEvent): void
  abstract onPointerUp(event: FederatedPointerEvent): void
  abstract onPointerLeave(event: FederatedPointerEvent): void
  abstract onPointerMove(event: FederatedPointerEvent): void

  flush() {
    clearTimeout(this.doubleClickTimeout)
    this.clearDoubleClick()

    return this
  }

  protected clearDoubleClick() {
    this.doubleClick = false
    this.doubleClickTimeout = undefined

    return this
  }
}
