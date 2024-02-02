import { AllFederatedEventMap, Container, IHitArea } from 'pixi.js'
import RenderObject from '../../RenderObject'

export default class HitArea<T extends IHitArea = IHitArea> extends RenderObject<Container> {
  shape: T
  protected object: Container = new Container()

  constructor(container: Container, shape: T) {
    super(container)
    this.shape = shape
    this.object.hitArea = shape
    this.object.eventMode = 'static'
  }

  listen<K extends keyof AllFederatedEventMap>(
    type: K,
    listener: (e: AllFederatedEventMap[K]) => unknown,
    options?: AddEventListenerOptions | boolean
  ): this {
    this.object.addEventListener(type, listener, options)
    return this
  }

  remove<K extends keyof AllFederatedEventMap>(
    type: K,
    listener: (e: AllFederatedEventMap[K]) => any,
    options?: EventListenerOptions | boolean
  ): this {
    this.object.removeEventListener(type, listener, options)
    return this
  }

  get scale() {
    return this.object.scale
  }
}
