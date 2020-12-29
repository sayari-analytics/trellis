import { createElement, Fragment, FunctionComponent, ReactNode, useCallback, useRef, useState } from 'react'
import { ViewportDragDecelerateEvent, ViewportDragEvent, ViewportPointerEvent } from '../..'
import { Annotation } from '../../../..'
import { SelectionChangeEvent } from '../../../../controls/selection'


export type Props = {
  onSelection?: ((event: SelectionChangeEvent) => void) | undefined;
  onViewportPointerDown?: ((event: ViewportPointerEvent) => void) | undefined;
  onViewportDrag?: ((event: ViewportDragEvent | ViewportDragDecelerateEvent) => void) | undefined;
  onViewportPointerUp?: ((event: ViewportPointerEvent) => void) | undefined;
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
  onViewportPointerUp: (event: ViewportPointerEvent) => void;
}


// TODO - memoize
export const Selection: FunctionComponent<Props> = (props) => {

  const [state, setState] = useState<{
    select: boolean, cursor?: string, circle?: { x: number, y: number, radius: number }
  }>({ select: false })
  const _state = useRef(state)
  _state.current = state

  const toggleSelect = useCallback(() => setState((state) => ({ ...state, select: !state.select })), [])

  const onViewportPointerDown = useCallback((event: ViewportPointerEvent) => {
    if (_state.current.select) {
      setState({ select: true, cursor: 'copy', circle: { x: event.x, y: event.y, radius: 0 }})
    }

    props.onViewportPointerDown?.(event)
  }, [props.onViewportPointerDown])

  const onViewportDrag = useCallback((event: ViewportDragEvent | ViewportDragDecelerateEvent) => {
    if (_state.current.select && _state.current.circle && event.type === 'viewportDrag') {
      setState({
        select: true,
        cursor: 'copy',
        circle: {
          x: _state.current.circle.x,
          y: _state.current.circle.y,
          radius: Math.hypot(event.x - _state.current.circle.x, event.y - _state.current.circle.y)
        }
      })
      // props.onSelection?.({ type: 'selectionChange' })
    } else {
      props.onViewportDrag?.(event)
    }
  }, [props.onSelection, props.onViewportPointerDown])

  const onViewportPointerUp = useCallback((event: ViewportPointerEvent) => {
    setState({ select: false })
    props.onViewportPointerUp?.(event)
  }, [props.onViewportPointerUp])


  return createElement(Fragment, {}, props.children({
    select: state.select,
    toggleSelect,
    onViewportPointerDown,
    onViewportDrag,
    onViewportPointerUp,
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
