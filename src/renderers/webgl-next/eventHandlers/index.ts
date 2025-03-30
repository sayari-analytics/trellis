import { FederatedEvent } from 'pixi.js'

export interface EventHandler {
  contains(x: number, y: number): boolean
  pointerEnter(event: FederatedEvent): void
  pointerDown(event: FederatedEvent): void
  pointerMove(event: FederatedEvent): void
  pointerUp(event: FederatedEvent): void
  pointerLeave(event: FederatedEvent): void
}
