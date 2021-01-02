import { createElement, Fragment, FunctionComponent, ReactNode, useCallback, useRef, useState } from 'react'
import { ViewportDragDecelerateEvent, ViewportDragEvent, ViewportPointerEvent } from '../..'
import { Annotation } from '../../../..'


export type SelectionChangeEvent = { type: 'selectionChange', x: number, y: number, radius: number, altKey?: boolean, ctrlKey?: boolean, metaKey?: boolean, shiftKey?: boolean }

export type Props = {
  onSelection?: ((event: SelectionChangeEvent) => void) | undefined; // TODO - add onSelectionStart, onSelectionEnd
  onViewportPointerDown?: ((event: ViewportPointerEvent) => void) | undefined;
  onViewportDrag?: ((event: ViewportDragEvent | ViewportDragDecelerateEvent) => void) | undefined;
  onViewportDragEnd?: ((event: ViewportDragEvent | ViewportDragDecelerateEvent) => void) | undefined;
  children: (childProps: ChildProps) => ReactNode
  color?: string
  strokeColor?: string
  strokeWidth?: number
}

export type ChildProps = {
  select: boolean
  annotation?: Annotation
  cursor?: string
  toggleSelect: () => void
  onViewportPointerDown: (event: ViewportPointerEvent) => void;
  onViewportDrag: (event: ViewportDragEvent | ViewportDragDecelerateEvent) => void;
  onViewportDragEnd: (event: ViewportDragEvent | ViewportDragDecelerateEvent) => void;
}


// TODO - memoize
export const Selection: FunctionComponent<Props> = (props) => {

  const [state, setState] = useState<{
    select: boolean
    cursor?: string
    circle?: { x: number, y: number, radius: number }
    altKey?: boolean
    ctrlKey?: boolean
    metaKey?: boolean
    shiftKey?: boolean
  }>({ select: false })
  const _state = useRef(state)
  _state.current = state

  const toggleSelect = useCallback(() => setState((state) => ({ ...state, select: !state.select })), [])

  const onViewportPointerDown = useCallback((event: ViewportPointerEvent) => {
    if (_state.current.select) {
      setState({
        select: true,
        cursor: 'copy',
        circle: { x: event.x, y: event.y, radius: 0 },
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
      })
    }

    props.onViewportPointerDown?.(event)
  }, [props.onViewportPointerDown])

  const onViewportDrag = useCallback((event: ViewportDragEvent | ViewportDragDecelerateEvent) => {
    if (_state.current.select && _state.current.circle && event.type === 'viewportDrag') {
      const x = _state.current.circle.x
      const y = _state.current.circle.y
      const radius = Math.hypot(event.x - x, event.y - y)
      setState({
        select: true,
        cursor: 'copy',
        circle: { x, y, radius },
        altKey: _state.current.altKey,
        ctrlKey: _state.current.ctrlKey,
        metaKey: _state.current.metaKey,
        shiftKey: _state.current.shiftKey,
      })
      props.onSelection?.({ type: 'selectionChange', x: x, y: y, radius, altKey: _state.current.altKey, ctrlKey: _state.current.ctrlKey, metaKey: _state.current.metaKey, shiftKey: _state.current.shiftKey })
    } else {
      props.onViewportDrag?.(event)
    }
  }, [props.onSelection, props.onViewportPointerDown])

  const onViewportDragEnd = useCallback((event: ViewportDragEvent | ViewportDragDecelerateEvent) => {
    setState({ select: false })
    props.onViewportDragEnd?.(event)
  }, [props.onViewportDragEnd])


  return createElement(Fragment, {}, props.children({
    select: state.select,
    toggleSelect,
    onViewportPointerDown,
    onViewportDrag,
    onViewportDragEnd,
    cursor: state.cursor,
    annotation: state.circle && state.circle.radius > 0 ? {
      type: 'circle',
      id: 'selection',
      x: state.circle.x,
      y: state.circle.y,
      radius: state.circle.radius,
      style: {
        color: props.color ?? '#eee',
        stroke: {
          color: props.strokeColor ?? '#ccc',
          width: props.strokeWidth ?? 2
        }
      }
    } : undefined
  }))
}
