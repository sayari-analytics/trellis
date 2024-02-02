import { EventHandlers } from '../../types/api'
import { EventSystem } from 'pixi.js'

export default class ApplicationEvents {
  private _eventHandlers: EventHandlers = {}
  private _eventSystem: EventSystem

  constructor(eventSystem: EventSystem) {
    this._eventSystem = eventSystem
  }

  set(eventHandlers: EventHandlers) {
    this._eventHandlers = eventHandlers
  }

  get system() {
    return this._eventSystem
  }
  get onViewportPointerEnter() {
    return this._eventHandlers.onViewportPointerEnter
  }
  get onViewportPointerDown() {
    return this._eventHandlers.onViewportPointerDown
  }
  get onViewportPointerMove() {
    return this._eventHandlers.onViewportPointerMove
  }
  get onViewportDragStart() {
    return this._eventHandlers.onViewportDragStart
  }
  get onViewportDrag() {
    return this._eventHandlers.onViewportDrag
  }
  get onViewportDragEnd() {
    return this._eventHandlers.onViewportDragEnd
  }
  get onViewportPointerUp() {
    return this._eventHandlers.onViewportPointerUp
  }
  get onViewportClick() {
    return this._eventHandlers.onViewportClick
  }
  get onViewportDoubleClick() {
    return this._eventHandlers.onViewportDoubleClick
  }
  get onViewportPointerLeave() {
    return this._eventHandlers.onViewportPointerLeave
  }
  get onViewportWheel() {
    return this._eventHandlers.onViewportWheel
  }
  get onNodePointerEnter() {
    return this._eventHandlers.onNodePointerEnter
  }
  get onNodePointerDown() {
    return this._eventHandlers.onNodePointerDown
  }
  get onNodeDragStart() {
    return this._eventHandlers.onNodeDragStart
  }
  get onNodeDrag() {
    return this._eventHandlers.onNodeDrag
  }
  get onNodeDragEnd() {
    return this._eventHandlers.onNodeDragEnd
  }
  get onNodePointerUp() {
    return this._eventHandlers.onNodePointerUp
  }
  get onNodeClick() {
    return this._eventHandlers.onNodeClick
  }
  get onNodeDoubleClick() {
    return this._eventHandlers.onNodeDoubleClick
  }
  get onNodePointerLeave() {
    return this._eventHandlers.onNodePointerLeave
  }
  get onEdgePointerEnter() {
    return this._eventHandlers.onEdgePointerEnter
  }
  get onEdgePointerDown() {
    return this._eventHandlers.onEdgePointerDown
  }
  get onEdgePointerUp() {
    return this._eventHandlers.onEdgePointerUp
  }
  get onEdgePointerLeave() {
    return this._eventHandlers.onEdgePointerLeave
  }
  get onEdgeClick() {
    return this._eventHandlers.onEdgeClick
  }
  get onEdgeDoubleClick() {
    return this._eventHandlers.onEdgeDoubleClick
  }
}
